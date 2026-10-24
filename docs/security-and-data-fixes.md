# Security and data fixes

## Deployment setup

1. Apply `neon/migrations/0001_plant_app.sql` to the Neon production branch using `DATABASE_URL_UNPOOLED`. It creates the application tables, server-only audit tables, indexes, plot ownership triggers, and seeded recommendation rules.
2. Configure `DATABASE_URL` (pooled) for application traffic and keep `DATABASE_URL_UNPOOLED` for migrations or administration. Configure the server-only Supabase service role key and URL for Auth verification and private Storage. Diagnosis metadata writes to Neon; private training images remain in Supabase Storage.
3. Configure `ORDER_ACCESS_SECRET` with at least 32 random characters. The Render blueprint generates a value for a newly provisioned service. Existing services need the variable added. Keep this value stable across deployments; rotating it invalidates guest order access.
4. Set `TRUST_PROXY_HOPS` to the deployment's known proxy count. The Render blueprint sets one hop. Leave it at zero when running directly.
5. Adjust `AI_GUEST_DAILY_LIMIT`, `AI_SERVER_DAILY_LIMIT`, and `AI_MAX_CONCURRENT_REQUESTS` for the expected load. The guest allowance is per IP, while identity quotas are persisted in Neon `ai_usage_counters`. The in-memory path is only a local-development fallback.

Apply the Neon migration before deploying the backend. Verify the application tables exist; Neon credentials must never be exposed to the browser:

```sql
select tablename
where schemaname = 'public'
and tablename in ('profiles', 'scan_history', 'mygap_logs', 'daily_notes', 'plots', 'diagnosis_training_logs', 'diagnosis_feedback');
```

The query should return the listed tables. Browser data access is blocked by design because all Neon queries run through the authenticated backend API.

## Guest orders

The app requests a server-issued guest session and sends its bearer token for order access. Order creation derives ownership from the verified session. Order reads filter by that owner and return summaries without billing, shipping, payment keys, or internal metadata.

Guest sessions last 30 days and renew when used near expiry. Old app installations have only unsigned guest IDs/order IDs; these do not prove ownership and cannot claim an existing order. A store operator must verify historical purchases before migrating that history. Expired sessions and signing-key rotation also require verified recovery. Checkout integrations should use `getOrderSession()` and include `Authorization: Bearer <accessToken>`.

## Evidence and reporting

Guest storage no longer drops old records or purges unrelated collections to make space. Failed writes remain visible as errors. Records still use localStorage, so users must export or delete records when their device quota is exhausted.

Cloud queries paginate all user records, including when the server's page cap is below the requested size. Dashboard/report failures show a retry state instead of incomplete totals. Guest scan migration uploads both photos before inserting the database row, retains originals on failure, and preserves local writes made during migration.

AI farm requests send bounded recent-record summaries and omit photos and embedded diagnosis records. This keeps advisory requests within their smaller payload limit while report calculations continue to use the complete records.

One scan UUID now links the diagnosis response, stored scan, training record, and feedback. Diagnosis cache keys include both photos, category, location, language, quality metadata, and model/prompt version. Cache hits receive the current request's scan ID.

## Diagnosis audit maintenance

Run `npm run audit:export` with server credentials to export cloud records and private images for the existing holdout tools. Exports are placed in the ignored `server/dataset` directory, or `DIAGNOSIS_DATA_DIR` if configured. Protect any exported files as private data.

Schedule `npm run audit:prune` as a maintenance job to enforce `DIAGNOSIS_RETENTION_DAYS` (default 90). The Render blueprint schedules this job daily at `0 20 * * *` (03:00 Asia/Jakarta). The job removes expired cloud audit records, their training images, and expired feedback. User scan-history photos are outside the training prefix and are not selected by this cleanup. Alert when a run fails or no successful run is recorded within 48 hours.

For local development, collection uses local files. An explicitly configured production local backend requires `DIAGNOSIS_DATA_DIR` on a persistent volume; the default ephemeral folder is rejected.

## Validation

Run `npm test`, `npm run check:translations:strict`, and `npm run build`. CI performs these checks using Node 22 and `npm ci`.
