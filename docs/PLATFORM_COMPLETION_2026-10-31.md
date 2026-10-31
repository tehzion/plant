# Platform follow-up: implementation and release evidence

All implementation work is based on master `34e036d` (including myGAP Phase 2). The shared audit-remediation checkout and other sessions' files were not modified. No paid AI call, production migration, production data/env change, PR merge or manual deployment was performed.

## Implemented versus demonstrated

| Capability | Implemented | Evidence still required |
|---|---|---|
| Crop context and diagnosis safety | Specific crop, crop-aware cache, look-alike treatment gate and subtle-sign healthy-result gate recovered; cache version bumped | Fresh representative, independently labelled field cases; model scores are not accuracy |
| Expert evidence | Review queue and farmer badge retained; `npm run audit:reviews -- 30` reports latest-review agreement, sample counts, coverage and confidence intervals; rates withheld below 20 cases | Reviewer qualifications and real reviews; agreement is not independent accuracy |
| Account photo consent | Default opt-out account preference; scan-time account check prevents a stale device opting the account back in | Approval to apply migration 0005 and deploy; legal wording/retention review |
| Photo withdrawal | Confirmed per-scan withdrawal in Results; original history remains; stored audit owner checked before deletion | Installed-device and real-account acceptance checks after approved deployment |
| Offline corrections | Cached-record edits/deletes queue with last-seen snapshots; atomic local record/queue writes; transactional owner checks; myGAP reasons/revisions; explicit conflict choices | Physical-device PWA/service-worker testing; mocked browsers do not establish device reliability |
| Product registration | Reviewed crop/target/expiry/label lookup gates chemical products; unknown entries become discovery | Catalogue owner must supply checked records; registry is deliberately empty; no government API integration is claimed |
| Telemetry/privacy | Guest attribution derives from signed session; question excerpts, locations and IPs removed from API logs | Owner review of host logging and retention settings |
| Farmer/reviewer UI | Desktop History widened; reviewer controls support ms/en/zh; original assessments and professional notes stay verbatim | Farmer/reviewer field usability sessions in all three languages |
| myGAP | Phase 1 and Phase 2 preserved | Mapping against the current official DOA forms by an auditor; no certification claim |

## Read-only deployment observations

Render `/api/neon/health` returned HTTP 200 with `configured: true, connected: true`. This does not reveal the database host or establish which Neon project Render uses. `/api/expert/cases` returned HTTP 401. Under the current handler's check order this indicates a nonempty reviewer/admin allow-list; the deployed revision was not independently verified, and no cases were accessed. Render environment and secret values were not read or changed.

The earlier exact counts on Neon project `winter-morning-90094683`, production branch, were zero for farmer records, scans, feedback and reviews. Their absence cannot prove either correct wiring or adoption. Historical dataset runs recovered under `docs/evaluation` were not repeated or independently verified here.

## Required release actions (not performed)

1. Review the combined PR and the migration `neon/migrations/0005_account_photo_consent.sql`. Test the migration on an isolated database before requesting production approval. Existing accounts stay opted out; until the column is available, account privacy changes return an actionable unavailable response and scan-time consent fails closed.
2. Confirm Render's actual `DATABASE_URL` hostname/project and stable signing configuration in the owner's dashboard. Never paste credentials into chat or logs.
3. Obtain qualified review of consent, photo withdrawal, retention and privacy wording. Choose a policy for any legacy retained photos. An account preference change applies to future scans; existing retained photos are withdrawn separately.
4. Have the partner populate reviewed registration entries following `REGISTRATION_REVIEW.md`. Until then the chemical recommendation list is empty and candidates are labelled discovery.
5. Run the device matrix below, then gather independent expert labels and consented farmer sessions. Run read-only `audit:metrics` and `audit:reviews` on the confirmed app database. Report unavailable figures as unavailable, never zero latency/cost or measured savings.
6. Obtain explicit approval for production migration/deployment and PR merges. No such approval was inferred from "proceed all".

## Installed-PWA/device acceptance matrix

Use disposable test accounts and clearly identified test records in an approved non-production environment. Test on Android Chrome and iPhone Safari/home-screen installation, in ms/en/zh.

- Capture a photo, choose a specific crop, inspect a mocked assessment and verify the alternative/retake gates. Real AI calls require separate cost approval.
- Sign in as A, opt in, sign out, and verify B starts opted out on the same device. Change A's preference on another device; stale A must not retain new photos.
- Confirm withdrawal, simulate storage failure, and confirm retry/error messaging without deleting personal history. Try a scan capability belonging to a different audit owner; no photos may be removed.
- Load cloud records, go offline, correct a myGAP record with a reason, delete a scan/plot, reload, and verify the local changes persist. Reconnect and check one replay, audit history and private-image cleanup.
- Change the same record on two devices; neither offline change may silently overwrite the newer server version. Compare both versions and exercise each explicit conflict choice.
- Interrupt sync after the server acknowledges but before local cleanup; replay must not duplicate records or audit revisions. Verify sign-out never exposes another account's cached records.
- Check large text, keyboard focus, 375px and 1440px, and actual virtual-keyboard/safe-area behaviour. A local viewport check is not an installed-device test.

## Working myGAP evidence map — needs DOA/auditor verification

| Record area | Code evidence | Verification needed |
|---|---|---|
| Pesticide use and PHI | `shared/mygapCompliance.js`, `src/components/mygap/MyGapLogForm.jsx` | Current official pesticide-record fields, label/registration sources and PHI policy |
| Pest monitoring and follow-up | Scan monitoring and myGAP report tables | Official monitoring form and required observation frequency |
| Purchases/stock, harvest lots and training | Phase 2 log fields, lot labels and report export | Current purchase, stock, harvest, traceability and training forms |
| Checklist and farm profile | Eight implemented preparation checks and profile fields | Full official element-by-element scope, excluded requirements and annual/internal-audit evidence |

This map records software coverage only. It is not a finding that a farm or the software complies with, or is certified under, myGAP.

## Verification recorded for this change

- Directory-scoped server and frontend suites passed; shared policy/compliance tests also passed. The final new malformed-summary regression passed separately after the full suites.
- Strict translations, reviewer phrase coverage, ESLint (zero errors; 86 existing warnings) and the production/PWA build passed.
- A browser harness using dummy accounts and fully intercepted API/external requests passed at 375px in Malay and 1440px in English: page rendering, account opt-in/out, confirmed withdrawal, conflict choice and transaction rollback after a local save failure. No horizontal overflow or page errors were observed; desktop History measured 1200px.
- These checks used mocks and disposable browser storage. They do not demonstrate real AI accuracy, production consent/storage behaviour, physical-device offline reliability, or real farmer adoption.
