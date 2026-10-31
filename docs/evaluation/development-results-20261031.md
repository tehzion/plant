# Development experiments — 31 October 2026

Items 2–5 are implemented: detailed development reports, controlled model comparisons, experimental similar-image retrieval, and automated diagnosis safety regressions. These are local engineering tools. Production model configuration and the farmer scan workflow have not been switched to retrieval.

## Existing results are now inspectable

A read-only export from the isolated evaluation branch contains **210 attempts across 86 development images: 191 complete, 19 failed**. The generated report breaks these down by crop, condition, source, run and recorded model. It preserves failures, uncertainty, missing cost coverage and case-level safety flags. The historical pool mixes prompt versions and repeated images, so its overall agreement is not an independent accuracy estimate.

Final local reports and their scoring-source snapshots are under `server/dataset/development-final-20261031/`:

- `history/report.md` and `history/report.json`
- `visual-only/report.md` and `visual-only/paired-comparisons.json`
- `crop-matched/report.md` and `crop-matched/paired-comparisons.json`

These private generated files remain git-ignored. The report now correctly recognizes healthy PlantDoc labels with crop prefixes and common crop names followed by scientific names, avoiding spurious disease or crop mismatches.

## Live comparisons

Two experiments each assessed the **same eight development images** across two models, with and without retrieved reference images: **64 completed assessments, zero failures, US$0.25033089 charged**, within the approved US$3 total. The eight images cover tomato, potato, bell pepper and corn, across both PlantVillage and PlantDoc, with six disease-labelled and two healthy-labelled images. Neither query images nor references overlap the **100 reserved holdout images**.

Both models used the same existing diagnosis-stage prompt and farmer-stated crop inputs. These experiments bypass the full API and treatment enrichment, so these are diagnosis-stage results. Public dataset labels and heuristic aliases are not expert-confirmed diagnoses.

### Crop-matched retrieval experiment

Every row uses the same eight images; a review result still counts in diagnosis agreement, and its review decision is reported separately.

| Model / variant | First-choice agreement | Top-three agreement | Review / retake | Treatment eligible despite label/crop mismatch | Charged USD |
| --- | ---: | ---: | ---: | ---: | ---: |
| GPT-5.4-mini, baseline | 3/8 | 6/8 | 7/8 | 0/8 | 0.03648 |
| GPT-5.4-mini, crop-matched references | 4/8 | 6/8 | 6/8 | 0/8 | 0.03811 |
| Gemini 2.5 Flash, baseline | 4/8 | 5/8 | 4/8 | 1/8 | 0.02294 |
| Gemini 2.5 Flash, crop-matched references | 4/8 | 5/8 | 5/8 | 0/8 | 0.02173 |

The first visual-only experiment allowed cross-crop colour matches. GPT first-choice agreement was 3/8 → 4/8; Gemini was 4/8 → 3/8. Inspection showed wrong-crop reference images among the closest matches, so the second experiment restricted candidates to the stated crop. Its references were selected using crop identity and image features, never the query's disease label. The same query is excluded from its reference pool, as are known related groups and near-identical average hashes.

**Decision:** retain the current production model and keep retrieval experimental. One extra correct first-choice answer for GPT, unchanged top-three agreement, and mixed results across models are insufficient evidence of a general improvement. Gemini was cheaper on this sample but gave one treatment-eligible mismatch in its baseline. These observations are development findings, not calibrated confidence, agronomic treatment validation or field accuracy. A larger independently reviewed set is needed before adoption.

## Safety and regression work

The new safety contract exposed and fixed a shared-policy gap: explicit `needsReview` and `expertReviewRequired` flags now block treatment eligibility and disease-product display. Tests cover contradictions, unknown health, subtle signs, weak evidence, poor photos, retakes, validation failures, missing blight comparisons, healthy controls, report denominators, crop naming, paired cohorts, retrieval isolation and budget accounting.

Verification:

- Full root application suite: **551 tests across 111 files passed**. The initial concurrent run timed out in two UI tests; the subsequent run with two workers passed.
- Final focused benchmark/safety regression run after the added scoring checks: **105 tests across 16 files passed**.
- Production build passed; existing bundle-size and mixed-import warnings remain.
- Changed-file ESLint and whitespace checks passed.
- All 64 query/reference sets were audited against the development allowlist: **zero reserved-image overlap**.

The root test configuration now excludes nested `.claude/worktrees` checkouts, which have separate dependencies and otherwise caused unrelated duplicate-React failures. No production deployment or database write was performed.

Run `npm run benchmark:regression -- --maxWorkers=2` for the focused gate. The existing CI's full `npm test` includes these tests automatically. See `development-experiments.md` for reproducible commands, artifact provenance, budget behavior and limitations.
