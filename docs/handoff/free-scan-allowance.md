# Free daily plant checks

The free allowance is 10 plant-analysis requests per identity per Malaysia calendar day (Asia/Kuala_Lumpur, midnight reset). The current application has no paid-tier entitlement model, so this applies to both verified guest sessions and authenticated users. Requests without a session fall back to IP identity.

`FREE_SCAN_DAILY_LIMIT=10` is the deployment configuration and default. Plant checks use their own counter, separate from chat, translation and other AI-feature spending. Existing per-IP, total-server, concurrency and short-window abuse limits remain in force.

The allowance counts analysis requests after the provider configuration and required-image checks, including requests that later fail or return a cached result; it does not promise ten successful diagnoses. An exhausted allowance returns HTTP 429, code FREE_SCAN_DAILY_LIMIT, the configured limit and Malaysia reset timezone, with EN/BM/ZH recovery copy.

Neon shares counters across production instances. The existing in-memory fallback is for environments without a configured database and cannot guarantee cross-instance enforcement. Production deployment and runtime environment overrides must match the committed configuration.

Regression checks cover the first ten allowed/eleventh blocked for guest and user identities, Malaysia midnight rollover, separation from other AI usage, and the route rejecting an exhausted identity before provider work.

Validation: 131 files / 657 tests passed; production build and diff whitespace check passed. Targeted ESLint: zero errors, four existing unused-argument warnings in server/index.js. Runtime production overrides were not inspected or changed during this implementation.
