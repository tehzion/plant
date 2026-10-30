# AI Agropreneur — Remaining Gaps

**Date:** 31 October 2026. Priorities: **P0** blocks safe release · **P1** next increment · **P2** later.

## P0 — before deploying this release

| Gap | Why it matters | Recommended next action |
|---|---|---|
| Migration 0002 not applied | Expert review endpoints return errors without the table; myGAP structured fields fall back into notes. | Apply to a Neon branch, run the app against it, then apply to production during a planned release. |
| Ownership fix not verified on real Postgres | Tests used an in-memory emulation. | On a Neon branch with two test accounts, attempt single and bulk upserts on each other's IDs over HTTP; expect 409 and unchanged rows. |
| Reviewer configuration | Workflow is closed until configured. | Set `EXPERT_REVIEWER_EMAILS`; confirm `ORDER_ACCESS_SECRET` (or `SCAN_CAPABILITY_SECRET`) is ≥ 32 chars in production. |
| Release approval | No deployment was performed. | Review the diff, then commit and deploy with explicit approval. |

## P1 — accuracy, safety and evidence

| Gap | Recommended next action |
|---|---|
| **No measured diagnostic accuracy.** Confidence levels are descriptive, not calibrated. | Feed expert reviews into the existing `expertBenchmarkService` (it currently reads a file); report top-1/top-3 and "confidently wrong" rates per crop with confidence intervals. |
| Alternative-condition quality is unmeasured. | Have reviewers mark whether the correct diagnosis appeared among the alternatives; track that rate. |
| Product eligibility is text-based, not a registration lookup. | Add a curated per-product table (registration number, registered crops, target pests/diseases, label URL) maintained by the partner; prefer it over listing text. |
| Real catalogue listings may lack crop/label details, sending most items to "discovery". | Audit the live WooCommerce listings and improve descriptions/tags; measure the eligible/discovery split. |
| Recommended products are not stored per scan, so reviewers see only products the farmer clicked plus ones they add manually. | Store the recommendation set server-side, bound to the scan capability, so experts review exactly what was shown. |
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
| Performance, cost per assessment and latency not measured. | Instrument p50/p95 latency and AI calls per scan (`diagnosisAttempts` is now recorded). |
| Farmer usability not observed. | Short field sessions with farmers in ms/en/zh, focusing on the comparison cards and offline banner. |
| Workbox runtime caching of API GETs not configured. | Not needed now — reads fall back to the IndexedDB cache. |

---

## Addendum — data consent (31 October 2026)

| Priority | Gap | Recommended next action |
|---|---|---|
| P0 | The consent wording and privacy policy changes have not been reviewed by a lawyer under the PDPA. | Have qualified counsel review the checkbox text, the privacy policy and the retention period before release. |
| P0 | The privacy policy still says scan history is "stored locally on your device using encryption". This was not verified and is probably inaccurate (history also syncs to Neon). | Correct the wording, together with the legal review. |
| P1 | `server/scripts/exportDiagnosisAudit.js` exports every assessment record regardless of consent. | Filter on `metadata->'dataConsent'->>'aiImprovement' = 'true'` in any export used for AI evaluation or development. |
| P1 | Records created before this change have no `dataConsent` and their photos were kept under the earlier policy. | Treat them as not consented for AI development. Decide whether to delete their photos early or let the existing 90-day pruning remove them. |
| P1 | Experts reviewing non-consented scans see only the text assessment, without photos. | Accept this, or ask for a separate, explicit consent to expert review. Measure how many cases lack photos. |
| P2 | Consent is saved per device, not per account. | Store the answer on the profile for signed-in users, and add a setting to change it later. |
| P2 | No way to withdraw consent for photos already stored. | Add a request path, such as a support contact or an in-app action, that deletes stored photos for a scan ID. |
