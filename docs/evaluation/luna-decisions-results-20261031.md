# Luna and Decisions results — 31 October 2026

**Recommendation: retain GPT-5.4-mini for the current diagnosis workflow. Keep Decisions as a development-only checker pending threshold validation and expert-labelled evaluation.**

All 60 diagnosis assessments and 20 real Decisions requests completed through OpenRouter. The new study cost **US$0.1540352**; combined with the earlier US$0.25033089 experiments, successful OpenRouter experiments in this budget total **US$0.40436609**, below the approved US$3. No production model or farmer-facing decision was changed.

Luna was about 75% cheaper for diagnosis calls, but first-choice and top-three dataset agreement were lower, mean request latency was higher, and more cases went to review. Neither Luna reasoning mode established a quality advantage. The five healthy-labelled images were particularly difficult for Luna: neither mode produced a healthy reassurance result in the current policy.

The Decisions checker is useful evidence for further research: its shadow veto changed the GPT baseline's treatment-eligible label mismatches from 2/20 to 0/20, while review increased from 13/20 to 17/20 and healthy reassurance dropped from 3/20 to 1/20. Those tradeoffs must remain visible. It made 15 decisive health classifications, all agreeing with source health labels, but left five uncertain or below the predeclared confidence threshold. This is not 100% disease-diagnosis accuracy, and confidence thresholds have not been calibrated against expert labels.

The two baseline flags were an early-blight assessment on a potato image labelled late blight, and an apple-scab assessment on an image labelled apple rust. They are dataset-label disagreements, not independently confirmed harmful treatment recommendations. Expert review must check both labels and visible evidence before treating them as clinical errors.

## Verification and artifacts

- Twenty identical images for every diagnosis variant: 12 PlantVillage and eight PlantDoc, across ten normalized crop groups; five healthy-labelled and fifteen disease-labelled.
- Sixty completed diagnoses, twenty completed typed Decisions requests, zero inference or parsing failures in the OpenRouter study.
- Every query checksum verified against the development allowlist: zero reserved-image overlap.
- Provider-reported usage confirms zero reasoning tokens for `none`; the Luna `low` variant recorded 1,769 reasoning tokens in total.
- Focused evaluation/safety suite: 114 tests across 17 files passed. Changed-file ESLint and whitespace checks passed.
- Private source snapshots, raw provider responses, per-image results, costs and timing: `server/dataset/luna-decisions-openrouter-20261031/`.
- Reproducible detailed analysis, paired comparisons and scoring snapshot: `server/dataset/luna-decisions-openrouter-report-20261031/`.
- A preliminary direct OpenAI inference request was rejected for exhausted credits and is preserved separately. After the user selected OpenRouter, the full successful study used only OpenRouter and its actual [Decisions endpoint](https://openrouter.ai/docs/guides/community/multimodal-decisions).

The code and reproducibility commands are documented in `luna-decisions-study.md`. These are selected development images and unverified public labels, not an independent Malaysian field benchmark. The 100 reserved images remain untouched. There was no deployment or production database write.

## Measured results

Same 20 source-labelled development images; no retrieval. Crop supplied equally to every model. Dataset labels and matching aliases are unverified, and this is not a field-accuracy estimate.

| Variant | Completed / requested | Top 1 | Top 3 | Review / retake | Missed disease | Treatment-eligible mismatch | Mean seconds | Charged USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gpt-5.4-mini:none | 20/20 | 8/20 | 15/20 | 13/20 | 0/15 | 2/20 | 5.57 | 0.098040 |
| gpt-6-luna:none | 20/20 | 5/20 | 11/20 | 20/20 | 0/15 | 0/20 | 9.22 | 0.024561 |
| gpt-6-luna:low | 20/20 | 6/20 | 11/20 | 19/20 | 0/15 | 1/20 | 11.21 | 0.024989 |

Recorded reasoning tokens by requested variant: gpt-5.4-mini:none: 0; gpt-6-luna:none: 0; gpt-6-luna:low: 1769. Reasoning tokens are included in completion-token usage.

## Decisions health triage

Completed 20/20; failed 0. Healthy reference images: 5; disease-labelled images: 15.

- Healthy correctly classified: 1/5.
- Abnormal correctly classified: 14/15.
- Diseased images called healthy: 0/15.
- Uncertain or low-confidence triage: 5/20.
- Decisive coverage: 15/20; correct among decisive outcomes: 15/15.
- Mean Decisions request latency: 1.07 seconds.
- Charged Decisions cost: US$0.006444.

## Shadow-only veto

These calculations only add review flags; they never upgrade a diagnosis or permit treatment. Latency and cost for the extra checker are reported separately above.

| Variant | Images with a checker result | Review before | Review after | Mismatch treatment before | Mismatch treatment after | Healthy reassurance before | Healthy reassurance after |
|---|---:|---:|---:|---:|---:|---:|---:|
| gpt-5.4-mini:none | 20 | 13 | 17 | 2 | 0 | 3 | 1 |
| gpt-6-luna:none | 20 | 20 | 20 | 0 | 0 | 0 | 0 |
| gpt-6-luna:low | 20 | 19 | 20 | 1 | 0 | 0 | 0 |

## Execution and limits

Stop reason: none. Charged cost: US$0.154035. Conservative budget accounting: US$0.154035. Unpriced requests: 0.

Thresholds were fixed before assessment and are not calibrated probabilities of disease. A second model can repeat the first model's mistake. More reviews can reduce unsafe outputs while reducing useful coverage. These are diagnosis-stage calls, not the complete farmer API, translation or treatment-enrichment flow. Model order was rotated, and no retry or fallback was performed. No production model switch is implied.

