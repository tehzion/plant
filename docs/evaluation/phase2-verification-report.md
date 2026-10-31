> Historical evaluation material recovered from audit-remediation-2026-10 (through 04ef240). These runs were not repeated or independently verified during this recovery. Dataset agreement is not expert-reviewed diagnostic accuracy or Malaysian field performance. No production, savings, certification or adoption claim follows from these figures.

# Phase 2 verification report

Date: 2026-10-31 (Asia/Kuala_Lumpur)

## Original release gate: FAIL — expansion is not ready

The table below records the initial Phase 2 assessment. See the follow-up section for newer verification and test results.

The complete farmer journey and the repeated ten-image evaluation have not been verified, and the full application regression suite has not passed. The 500-image import, expanded evaluation and expanded administrator/expert workflows have therefore not been started. No production deployment or production database migration was performed.

| Component | Status | Evidence and limits |
| --- | --- | --- |
| Health-status classification | NOT VERIFIED end-to-end | Exact status matching fixes the original substring defect. Contradictory healthy/disease and explicit unknown responses are sent to review; the decision policy blocks treatment and the scan hook saves review cases as unknown. Regression coverage passes; actual farmer-facing end-to-end display remains unverified. |
| Farmer-facing assessment workflow | NOT VERIFIED | Desktop/mobile/PWA browser journeys, interrupted network, all three language displays and actual image uploads remain to be tested. |
| Image preprocessing | NOT VERIFIED | Browser resize/compression and local quality checks have not been verified with the complete journey. |
| PlantNet or fallback | PARTIAL | Mocked route tests cover successful identification and unavailable-service fallback, including a single assessment and audit. Low-confidence handling has existing context unit tests. A timeout scenario and live PlantNet remain unverified; no PlantNet key is configured. |
| Recommendation eligibility | PARTIAL | Shared policy blocks disease treatment on contradictions and unknown status; existing tests exercise product purpose, crop matching, restricted products and absent label information. Actual catalogue availability, clinical/agronomic suitability and complete UI remain unverified. |
| Dataset image preflight | PARTIAL | SHA-256 duplicate detection, format identification, macOS `sips` metadata inspection, minimum dimensions, missing files and explicit manual review with audit reasons implemented. `sips` metadata inspection is not a guarantee of full image integrity. No OCR or automatic composite detection is claimed. |
| Neon record integrity | PASS | Exported all 12 original rows and compared IDs, labels, timestamps and JSON responses to the baseline: 12 matched, no duplicates introduced. SHA-256 of export: `053350ef2866175345b3a11dcc71db6c4abe5704aa1fa96038aa3b0f7551ba17`. The schema-only branch is separate from production and now has no expiration. |
| Application regression suite | FAIL | The final full run on the isolated test snapshot had 419 passed and 1 failed: the existing AssistantWidget failure-path test. The scan-hook test was corrected before this run. One additional product-safety test was added afterward and passed separately. |
| Ten original cases rerun | NOT RUN | Original baseline and its 12 attempts are unchanged. A fresh, separately recorded live run requires a cost estimate and confirmation under the project's existing paid-request approval rule. |

## Changes and tests

The shared result policy rejects treatment eligibility for contradictory or explicitly unknown status, and the assessment merge records `conflicting_health_status`. Product intent now follows the shared decision. The farmer scan hook preserves an unknown status for review cases. These are local changes, not a production release.

An isolated, network-disabled focused run after these changes passed **87/87 tests** across seven files: assessment and merge, API routes, frontend status and scan hook, product eligibility, and preflight. Mocks do not prove behavior of external providers or real browsers. The full suite was rerun after the scan-hook mock fix: 419 passed and one unrelated assistant-widget test failed. An additional product-safety test added after that full run passed in its own 39-test file run. The full suite must pass cleanly.

## Dataset preflight

Run on the existing manifests using `node server/evaluation/imagePreflight.js MANIFEST.json [REVIEWS.json] > audit.json`. Review entries require `reviewer`, `embeddedLabel`, `composite` and `unsuitable` fields; acceptance requires all three flags to be explicitly false. Excluded and pending entries remain in the audit. Inspection uses macOS `/usr/bin/sips`; other platforms need a compatible decoder implementation. Exact duplicates are compared within each invocation, not across independent manifests.

- PlantVillage: 60 manual-review-required, 0 excluded.
- PlantDoc: 28 manual-review-required, 2 excluded: one below 128 pixels in a dimension; PILOT-19 because its previously documented image is a labelled composite.
- Audits: `plantvillage-preflight.json` and `plantdoc-preflight.json`; prior visual finding: `plantdoc-known-review.json`.

Manual review must establish image suitability and absence of embedded diagnostic text and composites; the current audit cannot make those determinations automatically. The original ten-case selection must be reconciled with its existing visual inspection before rerunning.

## Data and costs

The immutable local export `poc-original-neon-export.json` preserves the 12 original attempt records. The original schema-only Neon branch `br-polished-feather-b5nbdg9e` in project `winter-morning-90094683` was retained by removing its expiration; this can incur ongoing Neon charges. The prior baseline CSV and report were not overwritten. No production agricultural rows were intentionally accessed or modified by these verification tests.

The 10-case rerun has not been performed. Provider usage and actual costs are not captured by the earlier baseline. Obtain a current, bounded cost estimate and the required paid-request approval before executing it, and save new results separately. Agricultural expert review is still pending; dataset agreement is not a measure of real-world Malaysian agricultural accuracy.

## Follow-up verification (2026-10-31)

The requested ten-image paid rerun was deferred by the user. It remains outside this verification and the overall release gate remains FAIL until all mandatory gate requirements and the rerun are completed.

A separate loopback-only Vite frontend and mock API were used with no production credentials or database. A real dataset photo was uploaded through the interface: the frontend sent a JPEG with quality metrics, category and selected language to the mock API, saved the returned scan in isolated browser storage, and navigated to its result page. A 1,600 × 1,600 test image arrived as a 1,024 × 1,024 JPEG. A deliberately black image was rejected before submission with a retake instruction. Mocked API non-plant and connection-loss responses displayed an error and retry controls; retry recovered when the mock API became available.

The flow was exercised at the default desktop viewport in Bahasa Malaysia and at a 390 × 844 mobile-sized viewport in Chinese and English. The same uncertain result was viewed in all three languages: review and no-direct-treatment guidance were localized. Mocked healthy, diseased and uncertain response displays were checked; a contradiction in the healthy heading was corrected. The mobile result had a document width of 390 pixels at a 390-pixel viewport. These are browser viewport tests, not a physical mobile device test. Provider-generated text was mocked in English, so its real translation quality was not verified. Missing translations in follow-up and product-error guidance were added.

The mocked API route test now simulates an actual 12-second PlantNet timeout with fake timers, observes the aborted signal, and verifies one AI fallback, one assessment and one audit write. No live PlantNet service was used. The full automated suite was rerun successfully: 423 tests across 94 files passed, after fixing an assistant test setup that returned a mock function as a Vitest cleanup callback. The isolated production build completed and generated a PWA service worker; installed PWA behavior and real camera permissions were not tested.

These checks improve the farmer-flow evidence but do not verify live PlantNet, real AI-generated content, actual product catalogue availability, installed PWA operation or real devices. The original 10-case live rerun and agricultural expert review remain outstanding.
