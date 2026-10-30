# AI Agropreneur — Implementation Report

**Date:** 31 October 2026  **Basis:** October 2026 platform audit  **Scope:** implementation, not re-audit
**Status:** Implemented and tested locally with mocked providers. **Not deployed. Migration 0002 not applied. Nothing committed.**

The existing React/Vite + Express + Neon + Supabase Auth/Storage + OpenAI + PlantNet + WooCommerce architecture is preserved. No new runtime dependencies were added, no model was trained, and no paid AI API was called.

---

## 1. Summary of changes

| Phase | Outcome |
|---|---|
| 1. Data protection | Confirmed and fixed the P0 cross-user upsert. Bound AI assessment records and farmer feedback to a verified identity. |
| 2. AI disease assessment | Structured assessment schema with a primary condition, up to three compared alternatives, descriptive confidence, follow-up evidence, schema validation, bounded retry and classified provider errors. |
| 3. Product recommendations | Eligibility checks (purpose, crop, restrictions, label info) on top of keyword/curated matching; unverified items moved to a separate catalogue-discovery section; dosages redacted. |
| 4. Offline reliability | Signed-in farm/myGAP records are kept on-device and queued when the network fails; idempotent, deduplicated, conflict-aware sync; visible sync status. |
| 5. Expert review, UX, myGAP | Authorised expert review workflow with separate attributed correction records; farmer-facing comparison UI; structured myGAP fields; full ms/en/zh coverage. |

---

## 2. Security improvements (Phase 1)

### 2.1 Cross-user upsert (audit P0) — confirmed and fixed
**Finding confirmed in source:** `insertUserRow` issued `INSERT … ON CONFLICT (id) DO UPDATE` with no owner predicate and returned the row (`server/services/neonDataService.js`). A signed-in user who knew another farmer's record ID could overwrite that row and receive it in the response. Bulk upsert (`operation: 'bulk-upsert'`) looped over the same path.

**Fix** — [server/services/neonDataService.js](server/services/neonDataService.js):
- Upsert now has `WHERE <table>.user_id = excluded.user_id`. A cross-user collision returns no row and raises a generic `409 RECORD_ID_CONFLICT` (no data echoed, no hint whether the ID exists).
- The owner column is always the verified session user; any `user_id` in the body is discarded.
- A plain-insert primary-key collision (`23505`) is mapped to the same generic 409.
- Bulk writes pre-check every ID with one query and reject the **whole batch** before writing if any ID belongs to someone else (no half-imported accounts).
- Payloads and IDs are type/length validated (objects only, IDs ≤ 200 chars, text/number only).

The `/api/sync` create path already had an owner predicate; it now also refuses to overwrite (see §5).

### 2.2 Assessment record integrity
**Finding:** `/api/analyze` accepted a client-chosen `scanId` and wrote `diagnosis_training_logs` with `ON CONFLICT DO UPDATE` and storage `upsert: true`, so anyone could overwrite another farmer's stored assessment and photos by reusing their scan ID.

**Fix** — [server/utils/dataCollector.js](server/utils/dataCollector.js), [server/index.js](server/index.js):
- Each analysis is bound to a **one-way hash** of the caller identity (`user:` / `guest:` / `ip:` from the existing AI identity resolver). Raw IPs and account IDs are not stored in the audit row.
- Before writing, an existing record owned by a different hash is refused; the upsert also carries an owner predicate to cover races.
- Audit images are written under a per-owner prefix (`training/<owner-prefix>/<scanId>_tree.jpg`), so a reused scan ID cannot replace another farmer's photo. Existing export/prune scripts read stored paths, so they remain compatible.

### 2.3 Feedback attribution
**Finding:** `/api/feedback` was unauthenticated; any caller could attach feedback to any scan ID.

**Fix** — new [server/utils/scanCapability.js](server/utils/scanCapability.js):
- `/api/analyze` now returns a `feedbackToken` — an HMAC over the scan ID and owner hash (secret: `SCAN_CAPABILITY_SECRET`, falling back to the existing `ORDER_ACCESS_SECRET`). It is stored with the scan, so guests keep working without an account.
- `/api/feedback` accepts feedback only with (a) a valid token for **that** scan ID, or (b) a signed-in account that owns the saved scan. Otherwise `403 FEEDBACK_NOT_AUTHORISED`.
- The server writes an `attribution` block (`source: 'farmer'`, `verifiedBy`, hashed submitter) so farmer feedback is always distinguishable from expert reviews. The token itself is not stored.
- [src/components/FeedbackWidget.jsx](src/components/FeedbackWidget.jsx) sends the token and, if signed in, the session bearer.

### 2.4 Other controls
- Private photos: confirmed existing Supabase Storage RLS restricts reads to the owner's folder; audit images sit outside any user folder and are only served to reviewers via short-lived server-signed URLs.
- Logging: new log lines contain event codes and request IDs only — no request bodies, tokens, images or raw identities. `dataCollector` no longer logs full error objects.
- Request validation extended for `feedbackToken`; existing Helmet/CORS/rate limits/quotas untouched.

---

## 3. AI disease assessment enhancements (Phase 2)

The existing two-stage pipeline (PlantNet → multimodal diagnosis → treatment enrichment → policy gate) is kept.

### 3.1 Workflow as implemented
1. **Image upload & quality** — unchanged and already present: primary photo plus optional leaf close-up, client-side darkness/blur/leaf-coverage checks block unusable photos before upload; the model's own capture assessment can still force a retake. A third symptom photo was **not** added (would change payload limits and cost per scan).
2. **Plant identification** — PlantNet first, existing GPT-Vision fallback if PlantNet fails (now covered by a test). Species context remains crop context only, never disease evidence. The structured result reports `identification_status`: `confirmed` / `likely` / `uncertain` / `unknown`.
3. **Disease assessment** — prompt extended ([server/services/aiService.js](server/services/aiService.js) `buildDiagnosisStagePrompt`): standard disease names, optional scientific name only when supported, descriptive `confidenceLevel`, observable-evidence explanations only (no step-by-step reasoning), and an explicit instruction not to suggest chemicals when confidence is low.
4. **Similar-condition comparison** — the model is asked for 0–3 *other* plausible conditions, each with `supportingEvidence`, `weakeningEvidence` and `distinguishingFeatures`. [shared/diseaseAssessment.js](shared/diseaseAssessment.js) then enforces: max 3, no padding, no repeat of the primary, no generic placeholders ("Unknown", "Other"), and every alternative must carry at least one comparison point. An alternative can never be rated more confident than the primary.
5. **Structured response** — every result now carries `structuredAssessment` (schema v1) matching the brief's shape (`plant`, `assessment.primary_condition`, `assessment.alternative_conditions`, `needs_expert_review`, `additional_information_needed`, `follow_up_questions`, `recommendations.product_matching_eligible`, `chemical_treatment_withheld`). **All legacy fields are preserved**, so existing history, PDF and older saved scans still render.
6. **Confidence & uncertainty** — model percentages are shown only as "estimate"; the primary display is a level (High / Medium / Low / Not enough evidence). A model-reported level cannot exceed what its numeric estimate supports, review cases cap at Medium, retakes are always "Not enough evidence". Low confidence automatically adds evidence requests (close-up, leaf age, spread) and field questions, and sets `needs_expert_review`.
7. **Consistency & failure handling**
   - **Bounded retry:** the diagnosis call is retried **once** only when the reply is malformed JSON or missing the diagnosis/capture blocks, with a repair instruction (`runDiagnosisStageWithRetry`, `MAX_DIAGNOSIS_ATTEMPTS = 2`). Usable replies and provider errors are not retried here. Worst case per scan is 2 diagnosis attempts × the existing primary→fallback model switch.
   - **Classified provider errors** ([server/utils/analysisErrors.js](server/utils/analysisErrors.js)): previously *every* analysis failure was reported as a 504 timeout. Now: `AI_TIMEOUT` (504), `AI_RESPONSE_INVALID` (502), `AI_PROVIDER_BUSY` / `AI_PROVIDER_UNAVAILABLE` / `AI_PROVIDER_CONFIG` (503), each with a localised farmer message and nothing logged as a training record.
   - `analysisMetadata.policyVersion` bumped to 4 and records `diagnosisAttempts`.
   - Re-localising a stored result now rebuilds the structured comparison in the new language.
8. **Offline** — the scan flow fails fast with a clear message when offline (no request, no save): "AI disease checks need an internet connection…".

### 3.2 Farmer-facing result UI
- [src/components/ScanDecisionSummary.jsx](src/components/ScanDecisionSummary.jsx): confidence chip, "Plant type not certain" flag, "What would help confirm this", "Questions to check in the field", and an expert-review note before buying or spraying.
- [src/components/disease-result/DiseaseResultSections.jsx](src/components/disease-result/DiseaseResultSections.jsx): "Other conditions that look similar" cards with Signs that fit / Signs against / How to tell apart. Legacy scans fall back to name + reason.

---

## 4. Product recommendation improvements (Phase 3)

New [server/services/productEligibility.js](server/services/productEligibility.js), applied in `/api/products/search` after the existing keyword + curated-rule matching:

| Check | Rule |
|---|---|
| Intended purpose | Fungal → fungicide, bacterial → bactericide, pest → insecticide/miticide, nutrient → fertiliser. Herbicides, mismatched pesticides, and any chemical for viral/environmental problems are **not suitable**. A shared keyword alone is never enough. |
| Crop compatibility | If the listing names crops and the scanned crop isn't among them → not suitable. "All crops"-type wording → compatible. Not stated → unverified. |
| Known restrictions | "Restricted", "turf/ornamental/non-crop use only", "not for food crops", "professional use only" → not suitable. |
| Label information | Requires a usable description or a matched active ingredient. |

- **Eligible** (purpose ✓, label ✓, and crop compatible — or crop unstated but matched by an existing **expert-curated rule**) → shown under Disease Control with a localised "Why suggested" reason.
- **Needs verification** → returned as `catalogueDiscovery` and shown in a separate section headed "Other catalogue products to ask about" with an explicit "not confirmed" note; these are never pre-selected for checkout.
- **Not suitable** → dropped; counts are returned in `eligibilitySummary`.
- Price, image, category, availability, link and KANB/partner presentation are unchanged. No discount or "cheaper" claims were added.
- Model-generated dosages and spray intervals in treatment text are replaced with "at the rate on the registered product label" (en/ms/zh), and the treatment prompt now forbids rates, intervals and PHIs.
- The AI's scientific name is now an extra matching term; client product cache key bumped so stale lists refresh.

---

## 5. Offline reliability (Phase 4)

| Requirement | Implementation |
|---|---|
| Durable local queue | Signed-in `saveLogEntry`, `saveDailyNote`, `savePlot`, `saveChecklistState` now store the record in IndexedDB and queue it for `/api/sync` on a connectivity failure (network error, offline, 408/429/5xx) instead of returning `null`. Validation/ownership errors still fail visibly and are **not** queued. |
| Viewing records | Cloud reads cache the last successful copy on-device and fall back to it offline; pending local records are merged in and marked "Saved on device". The cache (not pending records) is cleared on sign-out. |
| Duplicate prevention | Repeated offline saves of the same record collapse into one queued operation; only one flush runs at a time per tab. |
| Idempotent sync | `/api/sync` create now uses `ON CONFLICT DO NOTHING`; a replay of an already-applied create returns `{ ok, duplicate: true }` and **never overwrites** a newer server copy. |
| Interrupted sync | Operations are removed only after the server confirms; replay is safe. Losing connectivity mid-flush leaves remaining work pending without burning retry attempts. |
| Retry & failure | Existing backoff kept; terminal failures stay in the queue as `failed` with the message; a "Retry sync" button re-queues them. |
| Conflicts | Ownership collisions and stale checklist updates (older `updated_at`) are recorded as conflicts, not applied. |
| Status | New [SyncStatusBanner](src/components/SyncStatusBanner.jsx): hidden when online and clear; otherwise shows offline state, pending count, failures and retry. |
| PWA | Existing Workbox precache verified by a production build: 107 entries (3.5 MiB), none skipped. |

---

## 6. Expert review workflow (Phase 5)

AI assessment → expert review → correction record, without an approval hierarchy.

- **Storage:** new table `diagnosis_expert_reviews` (migration 0002): insert-only, one row per review, with reviewer user ID + email, verdict (`confirmed` / `corrected` / `uncertain`), corrected crop/diagnosis, notes, uncertainty flag, per-product verdicts (`suitable` / `unsuitable` / `needs_more_information`) and a snapshot of the AI result reviewed. The original `diagnosis_training_logs` row is never updated. Farmer feedback stays in `diagnosis_feedback`.
- **Authorisation:** [server/services/expertReviewService.js](server/services/expertReviewService.js) — only signed-in accounts listed in `EXPERT_REVIEWER_EMAILS` or `ADMIN_EMAILS`; closed (503) when neither is configured.
- **API:** `GET /api/expert/cases`, `GET /api/expert/cases/:scanId`, `POST /api/expert/cases/:scanId/reviews`.
- **UI:** an "Expert review" panel on the existing admin dashboard ([src/components/ExpertReviewPanel.jsx](src/components/ExpertReviewPanel.jsx)): queue (needs review / reviewed / all), photos via 15-minute signed URLs, read-only AI assessment with alternatives, labelled farmer feedback, prior reviews, and the review form including product verdicts.
- No automatic retraining or automatic change to farmer-facing advice.

---

## 7. myGAP

Preserved: guide, checklist, logbook, PHI calculator, PDF report.
Added to the logbook (optional fields, simple form): activity date, farm/plot, crop, product used and quantity (pesticide/fertiliser only), operator. Quantity is free text "as recorded by the farmer" with a reminder to follow the label — the app never calculates a dosage. The fields appear on log cards and in the PDF. No certification or government-integration claim was added.

If the server is deployed before migration 0002 is applied, these values are folded into the entry's notes instead of failing the save ([server/utils/optionalColumns.js](server/utils/optionalColumns.js)).

---

## 8. Bugs fixed

1. Cross-user overwrite/read via generic upsert and bulk upsert (P0).
2. Assessment records and audit photos overwritable via a reused scan ID.
3. Unauthenticated feedback could be attached to any scan.
4. All AI failures (provider outage, rate limit, bad key, malformed JSON) were reported as "timed out".
5. Signed-in farm, myGAP and checklist entries were lost when saved without connectivity.
6. Sync replays could overwrite a record edited elsewhere.
7. Concurrent `online`/`visibilitychange` events could flush the same queue twice.
8. Stored results re-localised into another language kept part of the explanation in the original language (new structured block).

---

## 9. Files

**New:** `shared/diseaseAssessment.js`, `server/services/productEligibility.js`, `server/services/expertReviewService.js`, `server/utils/scanCapability.js`, `server/utils/analysisErrors.js`, `server/utils/optionalColumns.js`, `neon/migrations/0002_expert_review_and_mygap_details.sql`, `src/components/ExpertReviewPanel.jsx`, `src/components/SyncStatusBanner.jsx` (+ `.css`), `src/utils/expertReview.js`, `src/i18n/translations/assessment.js`, and 8 new test files.

**Modified:** `server/index.js`, `server/services/aiService.js`, `server/services/neonDataService.js`, `server/services/syncService.js`, `server/utils/dataCollector.js`, `server/utils/requestValidation.js`, `src/components/{FeedbackWidget,Layout,ProductRecommendations,ScanDecisionSummary}.jsx`, `src/components/disease-result/DiseaseResultSections.jsx`, `src/context/AuthContext.jsx`, `src/hooks/useScanLogic.js`, `src/i18n/translations.js`, `src/pages/{AdminReviewDashboard,MyGap}.jsx` (+ CSS), `src/pages/Results.css`, `src/utils/{cloudSync,diseaseResultUtils,indexedDbStorage,liveProductRecommendations,localStorage,syncQueue}.js`, `src/test/setup.js`, and 6 existing test files.

---

## 10. Deployment prerequisites (not performed)

1. Review and apply `neon/migrations/0002_expert_review_and_mygap_details.sql` (additive only) to a branch, then production.
2. Set `EXPERT_REVIEWER_EMAILS` (comma-separated) for reviewers. Optionally set `SCAN_CAPABILITY_SECRET` (≥ 32 chars); otherwise `ORDER_ACCESS_SECRET` is used.
3. Note the behaviour change: guest scans saved **before** this release have no feedback token, so guests cannot send feedback on those older scans (signed-in owners still can).

## 11. Remaining limitations

See [AGROPRENEUR_REMAINING_GAPS.md](AGROPRENEUR_REMAINING_GAPS.md). In short: no measured diagnostic accuracy; eligibility is text-heuristic, not a pesticide-registration lookup; tests use mocks and an in-memory database emulation, not a live Neon branch, real devices or real AI responses.

---

## 12. Addendum — farmer data consent (31 October 2026, uncommitted at time of writing)

Added because the TTIA submission says farmer data is "appropriately consented", while the app had no consent capture; consent was only mentioned in the privacy policy.

**Behaviour**
- On the plant-details step, before **Analyse**, there is an optional checkbox: *"Help improve plant diagnosis (optional)"*. It is **unticked by default**, with a link to the privacy policy. Scanning works the same whether or not it is ticked.
- The answer is saved per device and sent with every scan as `dataConsent: { aiImprovement, version }`.
- On the server, `logTrainingData` keeps scan photos (tree/leaf) **only when** `aiImprovement === true` for the current consent version. Without consent, the assessment text is still kept for the existing audit window (for expert review and error investigation), without photos.
- Every assessment record now stores `metadata.dataConsent`, so datasets can be filtered on `metadata->'dataConsent'->>'aiImprovement' = 'true'`.
- A missing, malformed or outdated answer counts as **no consent**. Changing `DATA_CONSENT_VERSION` asks farmers again.
- **Added at the same time:** `metadata.durationMs` (server-side analysis time per scan), so response times needed for TTIA Q4 can be measured from existing records.
- The privacy policy section on images now describes this behaviour (en/ms/zh).

**Files**
- New: `shared/dataConsent.js`, `src/utils/dataConsent.js`, `src/components/DataConsentToggle.jsx` (+ `.css`, `.test.jsx`).
- Modified: `server/index.js`, `server/utils/dataCollector.js` (+ test), `server/utils/requestValidation.js` (+ test), `server/index.test.js`, `src/pages/Home.jsx`, `src/utils/diseaseDetection.js`, `src/i18n/translations/home.js`, `src/i18n/translations/privacy.js`.

No database migration is needed; consent is stored in the existing `metadata` JSONB column.
