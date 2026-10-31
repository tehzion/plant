# Supabase Auth → Clerk migration plan

**Status:** proposal, awaiting approval. Nothing has been installed or changed.
**Date:** 31 October 2026

## 1. What exists today

| Area | Current behaviour | Where |
|---|---|---|
| Sign-in methods | Email + password only. Google sign-in is disabled. Password reset by email. Optional dev-only demo login. | `src/context/AuthContext.jsx`, `src/pages/Login.jsx`, `src/pages/ResetPassword.jsx` |
| Server identity | Browser sends the Supabase access token as `Authorization: Bearer`; server calls `supabase.auth.getUser(token)` and uses `user.id` (a UUID) as the owner. | `server/utils/supabaseAuth.js`, used by `server/index.js`, `farmerReviewRoutes.js`, `expertReviewService.js` |
| Getting the token in the browser | `supabase.auth.getSession()` / `getUser()` in 6 helpers. | `cloudSync.js`, `localStorage.js`, `scanFollowUpStorage.js`, `reportSummary.js`, `adminAnalytics.js`, `productEvents.js`, `consultationLeads.js` |
| App data | Neon Postgres. Every `user_id` column is `uuid` holding the Supabase user ID. | `neon/migrations/0001_plant_app.sql` |
| Photos | Browser uploads directly to Supabase Storage bucket `scan-images` under `<supabase-user-id>/…`; access is enforced by Storage policies using `auth.uid()`. | `src/utils/localStorage.js`, `supabase/migrations/20261008151000_scan_images_bucket.sql` |
| Roles | Admins and expert reviewers are identified by email (`ADMIN_EMAILS`, `EXPERT_REVIEWER_EMAILS`). | `adminAnalyticsService.js`, `expertReviewService.js` |
| Offline queue | Records waiting to sync are keyed by the user ID. | `cloudSync.js`, `syncQueue.js` |

## 2. Key design decision: keep the existing user UUIDs

Clerk user IDs look like `user_2abc…` and are not UUIDs. Instead of rewriting every `user_id` column and every photo path, **each Clerk user carries the old Supabase UUID as its `external_id`**, and the app keeps using that UUID internally.

- Imported users: `external_id` = their existing Supabase UUID.
- New sign-ups after the switch: the server assigns a new UUID on first request and saves it to the Clerk user's `external_id`.
- Clerk's session token is customised to include `uid` (= `external_id`) and `email`, so the server gets both from the verified token with no extra API call.

Result: **no changes to Neon tables, photo paths or the offline sync queue.** Existing records, photos and pending offline entries stay attached to the same person.

## 3. Moving existing users (passwords carry over)

Supabase stores passwords as **bcrypt** hashes, which Clerk can import directly, so farmers keep their current password.

1. A one-off script (`server/scripts/migrateUsersToClerk.js`) reads `id, email, email_confirmed_at, encrypted_password, created_at` from Supabase's `auth.users` table. This needs a **direct Postgres connection string to the Supabase database**: the Supabase admin API does not return password hashes.
2. For each user it calls Clerk's Backend API `createUser` with `external_id`, `email_address`, `password_digest`, `password_hasher: "bcrypt"`.
3. The script is **idempotent**: it skips users whose `external_id` already exists. It can be re-run for anyone who signs up during the cutover window. It runs in a dry-run mode first, printing counts only (no emails or hashes in the output).
4. Users with an unconfirmed email are imported as unverified, so Clerk asks them to verify at first sign-in.

## 4. Code changes

**Frontend**
- Install `@clerk/react`. Wrap the app in `<ClerkProvider>` (`main.jsx`).
- Rewrite `AuthContext.jsx` on top of Clerk's `useAuth` / `useUser` while keeping the same `useAuth()` shape (`user.id` = the UUID, `user.email`, `signIn`, `signUp`, `signOut`, `resetPasswordForEmail`). That way the ~30 components that use `useAuth()` do not change.
- Keep the existing trilingual Login and Reset Password pages, rebuilt on Clerk's sign-in, sign-up and reset hooks, so the look and the ms/en/zh text stay the same.
- Add one `getAuthToken()` helper (Clerk `session.getToken()`) and replace the 8 `supabase.auth.getSession()/getUser()` calls with it.

**Backend**
- Install `@clerk/express`. Replace `verifyAuthenticatedUser` in `server/utils/supabaseAuth.js` (renamed `auth.js`) with Clerk token verification that returns `{ id: uid, email }`. Callers stay the same.
- For a signed-in user with no `uid` yet (a new sign-up), assign a UUID and write it to Clerk once.

**Photos**
- The browser can no longer use Supabase Storage directly, because Supabase no longer knows who is signed in. Add server endpoints to upload, sign and delete a user's own scan photos. The server uses the existing service key and restricts paths to `<uid>/…`. Same bucket, same paths, so existing photos keep working.

**Tests**
- Update the tests that mock Supabase Auth, and add tests for token verification, UUID assignment, the photo endpoints and the import script (with mocked Clerk and database).

## 5. Rollout

1. **Development:** create a Clerk development instance, set the keys in `.env.local`, configure the session-token claims, import a copy of the users into the dev instance, and test sign-in, offline sync, photos, expert review and admin.
2. **Production instance:** create the Clerk production instance and set up its DNS records for the app's domain (Clerk requires this for production).
3. **Cutover** (short maintenance window):
   - Turn off new Supabase sign-ups.
   - Run the import against the production instance.
   - Deploy the Clerk version with the Render environment variables.
   - Re-run the import to catch any last sign-ups.
4. **What farmers notice:** they are signed out once and sign in again with the **same email and password**. Their records, photos and any offline entries waiting to sync are still there.
5. **Rollback:** Supabase Auth stays intact for 30 days. Reverting the deploy restores the old login, because user IDs never changed.
6. **After 30 days:** remove `supabase.auth` code and the Supabase Auth keys. Supabase stays in use only for photo storage.

## 6. What I need from you

- A Clerk account with an application (development first, production later). You put the keys in `.env.local` yourself (`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`); don't paste them into chat.
- For the user import: a direct Postgres connection string to the Supabase database (`SUPABASE_DB_URL` in `.env.local`).
- Roughly how many users exist, and a date for the cutover window.
- Confirmation of Clerk's pricing for your user count. Clerk bills by monthly active users; check the current plan.

## 7. Risks

- **Another session is editing the same files** (`server/index.js`, `localStorage.js` and others) with uncommitted changes. This work should be done on its own branch after that session's changes are committed, to avoid overwriting each other.
- Users who reset their Supabase password during the window: re-running the import updates no one who already exists, so a user who changes their password between the import and the cutover keeps the old one. Freezing the window closes this gap.
- Email deliverability: Clerk sends the verification and reset emails, so check the sender domain setting.
- Not covered: the hosted Render environment and DNS changes, which need your access.
