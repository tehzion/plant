# Development reporting, model comparisons and image retrieval

These tools implement items 2–5 of the improvement plan. They run locally; they do not change the production model, train a classifier or add retrieval to farmer scans.

## Reports

`exportDevelopmentResults.js` reads only the explicitly configured isolated evaluation database in a read-only transaction, restricted to the frozen split's development checksums. It exports sanitized assessment responses and reports grouped by run, source, crop, reference condition and recorded model. The 31 October snapshot contains 210 attempts, 191 completed and 19 failed, across 86 distinct development images. Repeated images and changing prompts mean the pooled result is exploratory, not an independent accuracy estimate.

```sh
node --env-file=.env.evaluation.local server/evaluation/exportDevelopmentResults.js server/dataset/independent-holdout-20261031/split.json server/dataset/NEW_DEVELOPMENT_EXPORT
node server/evaluation/reportDevelopmentResults.js server/dataset/NEW_DEVELOPMENT_EXPORT/assessments.json server/dataset/NEW_REPORT
```

The report includes numerator/denominator pairs, first-choice and top-three dataset agreement, completion, end-to-end first-choice agreement including failures, review/retake rates, missed disease, treatment eligibility on mismatches, raw falsely healthy labels, timing and reported cost coverage. JSON also contains case-level error and safety lists. Uncertain named diagnoses stay in the agreement denominator; uncertainty is a separate operational measure. Failed calls stay in completion and end-to-end denominators. Missing cost and latency are not treated as zero.

Reference matching uses existing heuristic label aliases; those mappings are not independent expert labels. Crop names use explicit source naming equivalents (corn/maize, bell pepper, cherry). Safety metrics reapply the current shared decision policy to stored predictions, so they do not reconstruct what an earlier version displayed or recommended. Treatment eligibility does not mean a treatment was administered or clinically appropriate. Costs in historical exports may be unavailable.

## Paired model and retrieval experiments

The experiment planner permits only development images and development reference candidates. It rejects holdout or unassigned index entries, duplicate checksums and mismatched freeze IDs. It deterministically samples across source/crop/condition strata, then uses identical query images and farmer-stated crops for every variant. Per-image variant order is counterbalanced. A separate paired report compares only shared checksums and lists missing counterparts.

The initial comparison uses the configured baseline `openai/gpt-5.4-mini` and `google/gemini-2.5-flash`, both verified against the live OpenRouter model catalog before requests. Each has a baseline and reference-image variant. This calls the application's existing diagnosis prompt builder, diagnosis validation, result merge and shared safety policy, but bypasses the full `/api/analyze` workflow, treatment enrichment, caching, quotas and browser preprocessing. It measures the diagnosis stage, not the complete farmer journey. One request per variant/image, no retry or fallback. Raw model defaults are used for temperature; there is no repeated-sample variability estimate.

```sh
node server/evaluation/buildVisualIndex.js server/dataset/independent-holdout-20261031/split.json server/dataset/NEW_VISUAL_INDEX.json
npm run benchmark:development -- server/dataset/independent-holdout-20261031/split.json server/dataset/NEW_VISUAL_INDEX.json server/dataset/NEW_DRY_RUN
# Paid execution requires a new output directory and an explicitly approved USD limit:
# npm run benchmark:development -- SPLIT INDEX NEW_RUN --approve-usd=APPROVED_LIMIT
```

Without the approval argument the experiment writes a plan only and makes no paid calls. Credentials come from the existing server configuration and are not written into results. Catalog pricing and provider account usage are checked; a conservative US$0.15 reserve is required before each request, calls are sequential, unknown costs stop further calls, and each request has a timeout. These are software budget stops rather than a provider-enforced billing cap. Budgets are per invocation: subtract prior run spend when authorizing another invocation.

Every run uses an exclusive private directory with a frozen plan, source hashes, source snapshots, pricing, settings, request-start journals, provider responses, per-case results, charged cost and final reports. An interrupted started request must be investigated rather than automatically retried. `reportDevelopmentResults.js RUN_DIR NEW_REPORT_DIR` can rebuild a partial report from durable per-case results.

## Visual retrieval baseline

Feature extraction uses macOS `sips` to decode checksum-verified local images into 32×32 BMP thumbnails. It combines colour histograms and spatial colour averages, then ranks Euclidean distance. It requires no model call or added package. This is a deliberately simple visual baseline, not a disease-aware embedding model.

The first experiment allowed cross-crop references as a negative control. Inspection found unrelated crops among the closest colour matches. The subsequent implementation filters by the farmer-stated crop using explicit source naming equivalents before visual ranking. Neither the query's disease label nor its diagnosis prediction participates in retrieval ranking. The selected references' public labels are supplied to the model as **unverified comparison examples**, separately identified from the query.

Both versions exclude the query, identical checksums, known related groups, known withheld images and very similar average hashes. The index contains development images only. Average hashes do not prove absence of near duplicates; absent plant/farm provenance remains a limitation. The image index is not cleared for an independent benchmark or production retrieval. The existing reference-label and rights-review limitations remain recorded in the source inventory.

## Regression gate

```sh
npm run benchmark:regression -- --maxWorkers=2
npm test -- --maxWorkers=2
npm run build
```

The regression suite covers failed-request denominators, healthy labels with crop prefixes, paired-cohort mismatches, holdout leakage, query/self/related-image retrieval, wrong-crop references, corrupt features, cost-stop behavior and the diagnosis safety contract. The existing CI's `npm test` discovers these tests automatically. Nested `.claude/worktrees` checkouts are excluded from the root suite because their separate React dependencies otherwise cause invalid-hook failures.

The safety contract requires review and blocks disease products for contradictory healthy/diseased labels, explicit unknown health, weak evidence, explicit review flags, retakes, poor photos, failed schema validation, absent tomato/potato blight comparisons and subtle signs on allegedly healthy leaves. It also checks that complete supported confident and healthy cases remain usable. A detected gap was fixed in the shared policy: `needsReview` and `expertReviewRequired` now block treatment eligibility.

Keep the 100 reserved images out of all development experiments. Existing older generic batch runners do not enforce this new planner's allowlist; use this planner for these comparisons. Do not choose a production model or enable retrieval based on eight selected development images. Independent expert-reviewed evaluation remains the release evidence needed for those decisions.
