# AI Agropreneur — Remaining Gaps

**Date:** 31 October 2026. Priorities: **P0** blocks safe release · **P1** next increment · **P2** later.

## P0 — before deploying this release

| Gap | Why it matters | Recommended next action |
|---|---|---|
| ~~Migration 0002 not applied~~ Done | Verified 31 Oct 2026: `diagnosis_expert_reviews` and the new `mygap_logs` columns exist on the production Neon project. | — |
| ~~Ownership fix not verified on real Postgres~~ Done | Verified 31 Oct 2026 on Neon branch `ownership-check-2026-10-31` using the exact SQL `neonDataService` generates: another user's upsert returned no row (→ 409), plain insert hit `plots_pkey` (→ 409), the bulk pre-check found the foreign ID (whole batch rejected), update and delete affected 0 rows, the owner's row stayed unchanged, and the owner could still update it. | — |
| Reviewer configuration | Workflow is closed until configured. | Set `EXPERT_REVIEWER_EMAILS`; confirm `ORDER_ACCESS_SECRET` (or `SCAN_CAPABILITY_SECRET`) is ≥ 32 chars in production. |
| Release approval | No deployment was performed. | Review the diff, then commit and deploy with explicit approval. |

## P1 — accuracy, safety and evidence

| Gap | Recommended next action |
|---|---|
| **No measured diagnostic accuracy.** Confidence levels are descriptive, not calibrated. | Feed expert reviews into the existing `expertBenchmarkService` (it currently reads a file); report top-1/top-3 and "confidently wrong" rates per crop with confidence intervals. |
| Alternative-condition quality is unmeasured. | Have reviewers mark whether the correct diagnosis appeared among the alternatives; track that rate. |
| Product eligibility is text-based, not a registration lookup. | Add a curated per-product table (registration number, registered crops, target pests/diseases, label URL) maintained by the partner; prefer it over listing text. |
| Real catalogue listings may lack crop/label details, sending most items to "discovery". | Audit the live WooCommerce listings and improve descriptions/tags; measure the eligible/discovery split. |
| ~~Recommended products are not stored per scan~~ Fixed: the product list shown is saved on the scan's audit record (owner-verified) and seeds the expert review form. | Store the recommendation set server-side, bound to the scan capability, so experts review exactly what was shown. |
| Expert corrections are not shown to the farmer. | Add an optional "Reviewed by an expert" note on the farmer's result when a review exists (needs a privacy/consent decision). |
| No reviewer assignment. | If volume grows, add an `assigned_reviewer` column; current design is a shared queue. |
| Legacy guest scans have no feedback token. | Accept as a one-time limitation, or offer feedback through a support channel for older scans. |
| Telemetry `guest_id` on product events/leads is still client-supplied. | Bind to the verified guest session token, as done for orders. |
| Third (symptom) photo not supported. | Evaluate cost/benefit after accuracy measurement; current flow supports plant + leaf close-up. |

## P1 — offline

| Gap | Recommended next action |
|---|---|
| Not tested on real devices or with a real service worker. | Manual test plan: install PWA, load pages, go offline, add myGAP/farm entries, reload, reconnect, confirm sync and no duplicates. |
| Offline **edits/deletes** of signed-in records are not queued (only creates and the checklist). | Extend queue to updates/deletes with revision checks (scans already support revisions). |
| No conflict-resolution UI. | Conflicts are kept and counted; add a simple "keep mine / keep server" screen. |
| Guest offline queue is only consumed by account migration. | Document this; guests remain local-only until they sign in. |
| Cached cloud records live in IndexedDB on shared devices. | Cache is cleared on sign-out; consider an inactivity expiry. |
| Background Sync API not used. | Sync runs on reconnect / app focus; add Workbox Background Sync if needed. |

## P2 — product and compliance

| Gap | Recommended next action |
|---|---|
| Admin and expert screens are English only. | Translate if non-English reviewers are expected. |
| myGAP coverage vs official requirements not verified; no certification or government integration. | Map fields to the official myGAP checklist with DOA/an auditor; keep "preparation aid" wording. |
| PDPA assessment for images, location and feedback not done. | Qualified legal review; document retention for audit images and reviews. |
| Performance, cost per assessment and latency not measured. | `npm run audit:metrics -- 30` now reports time, AI tokens and OpenRouter cost per scan plus the consent opt-in rate (read-only). Run it after a few days of real traffic. |
| Farmer usability not observed. | Short field sessions with farmers in ms/en/zh, focusing on the comparison cards and offline banner. |
| Workbox runtime caching of API GETs not configured. | Not needed now — reads fall back to the IndexedDB cache. |

---

## Addendum — data consent (31 October 2026)

| Priority | Gap | Recommended next action |
|---|---|---|
| P0 | The consent wording and privacy policy changes have not been reviewed by a lawyer under the PDPA. | Have qualified counsel review the checkbox text, the privacy policy and the retention period before release. |
| ~~P0~~ Fixed | The privacy policy said scan history was "stored locally on your device using encryption". | Reworded in en/ms/zh: records are kept on the device and, when signed in, in the cloud database, sent over encrypted connections; kept photos are deleted after the retention period (daily `audit:prune` cron in `render.yaml`). Still needs the legal review above. |
| ~~P1~~ Fixed | `server/scripts/exportDiagnosisAudit.js` exported every record regardless of consent. | Now exports only consented scans and their feedback; records with no answer (including older ones) count as not consented. |
| P1 | Records created before this change have no `dataConsent` and their photos were kept under the earlier policy. | Treat them as not consented for AI development. Decide whether to delete their photos early or let the existing 90-day pruning remove them. |
| P1 | Experts reviewing non-consented scans see only the text assessment, without photos. | Accept this, or ask for a separate, explicit consent to expert review. Measure how many cases lack photos. |
| P2 | Consent is saved per device, not per account. | Store the answer on the profile for signed-in users, and add a setting to change it later. |
| P2 (partly fixed) | No way to withdraw consent for photos already stored. | Added `POST /api/scans/:scanId/withdraw-photos` (same proof of ownership as feedback): deletes the photos and marks the record not consented. The privacy policy tells farmers to contact support. **Still missing:** an in-app button on Results/History. |

---

## Addendum — repo audit (31 October 2026)

| Priority | Gap | Status / next action |
|---|---|---|
| P0 | One production host for the API. `vercel.json`, two Vercel projects and `render.yaml` all exist, and a workflow keeps a Render instance warm. | **Open — owner decision.** Pick Render or Vercel for the API, delete the other config, and keep env vars in one place. |
| ~~P0~~ Fixed | OpenRouter support. | `server/utils/aiProvider.js` (PR #4): set `AI_PROVIDER=openrouter` and `OPENROUTER_API_KEY`; model ids get the `openai/` prefix. |
| ~~P0~~ Fixed | Daily per-IP and whole-server AI caps were in-memory, so each serverless instance counted separately. | Both now use the Neon `ai_usage_counters` table, like the per-identity quota. The 60/min burst limiter is still per instance; fine on Render, approximate on Vercel. |
| ~~P0~~ Fixed | High-severity advisories (zod, undici) via `openai@4`. | Upgraded to `openai@7` with npm overrides; no high advisories remain. Moderate ones are in build-time tooling (`vite-plugin-pwa`, `javascript-obfuscator`). |
| ~~P1~~ Fixed | AI abort signals were sent as a JSON body field (`"signal": {}`), so timed-out requests kept running and billing tokens. | Signal is now passed as a request option. |
| ~~P1~~ Fixed | No end-to-end check that each disease maps to the right product class. | `server/services/productRecommendationMatrix.test.js` covers every curated rule plus healthy, retake and nutrient cases. |
| ~~P1~~ Fixed | ~170 lines of unused AI product matcher (`recommendProductTags`). | Removed; product matching is rule-based only. |
| ~~P1~~ Fixed | No error tracking and no AI cost per scan. | Opt-in Sentry (server + browser, scrubbed) via `SENTRY_DSN` / `VITE_SENTRY_DSN`; token usage and OpenRouter cost are stored per scan and reported by `npm run audit:metrics`. |
| P1 | `aiService.js` is ~3,900 lines. | Split into diagnosis, ask, farm-insights and products modules. |
| P1 (partly fixed) | No linter in CI. | `npm run lint` added (it found a myGAP PDF crash and duplicate keys, now fixed). The `ci.yml` step must be added by a maintainer: the Claude GitHub App lacks `workflows` permission. 88 warnings (mostly unused variables) remain. |
| P2 | `.env.production` is tracked although `.gitignore` excludes it (public keys only). | Untrack once the `VITE_*` values are set in the host's build environment. |
