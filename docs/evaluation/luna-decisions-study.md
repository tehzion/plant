# Luna and Decisions study

This local research harness compares GPT-5.4-mini with GPT-6-luna at explicit `none` and `low` reasoning, and evaluates Luna Decisions as a shadow checker. It does not change production model configuration or the farmer scan path.

## Provider and protocol

All successful study inference uses the existing OpenRouter configuration and key. A preliminary direct OpenAI request was rejected with `credit_balance_exhausted`; it is retained separately and is not part of the scored comparison.

Diagnosis variants call OpenRouter Chat Completions with the explicit model ID, `reasoning_effort`, JSON output and a 6,000 completion-token ceiling. They omit temperature and make no retries or model fallbacks. Every variant uses the same existing application diagnosis prompt, crop context, source image, validation and result merge; model order rotates per image. Treatment enrichment and the complete farmer API are outside this comparison.

The checker uses the actual [OpenRouter alpha Decisions endpoint](https://openrouter.ai/docs/guides/community/multimodal-decisions), `POST /api/alpha/decisions`, with `openai/gpt-6-luna-decisions`. It uses top-level image parts in `state` and a map of named questions. Predicate questions use OpenRouter's `noul` type, and choice questions include an explicit unclear option. The adapter normalizes these typed answers for analysis; it does not simulate Decisions with a chat prompt.

The questions inspect capture clarity, abnormal tissue, six subtle symptom types, overall visible health and visual support for each model's proposed diagnosis. The proposed diagnoses are supplied only to their named support questions, not as reference truth. No dataset disease label is sent. Question probabilities remain model estimates, not calibrated plant-disease confidence.

## Selection and limits

The planner selects 20 deterministic development images across source/crop/condition strata, matching the earlier eight-image cohort within the expanded sample. It validates the frozen split ID and rejects duplicate, reserved and unassigned index entries. The study has 12 PlantVillage images and eight PlantDoc images, across ten normalized crop groups: five healthy-labelled and fifteen disease-labelled images.

Reference labels and their heuristic matching aliases are unverified. Plant/farm grouping and unseen-data performance are not established by development-set results. The 100 reserved images stay outside the study.

## Reproduce

```sh
# Plan only: no paid calls.
npm run benchmark:luna -- server/dataset/independent-holdout-20261031/split.json server/dataset/development-visual-index-20261031.json server/dataset/NEW_LUNA_PLAN

# Live execution: only with an approved budget and a new output directory.
# npm run benchmark:luna -- SPLIT INDEX NEW_RUN --approve-usd=APPROVED_LIMIT

# Rescore the completed run, preserving original outputs.
node server/evaluation/summarizeLunaStudy.js RUN_DIR NEW_REPORT_DIR

npm run benchmark:regression -- --maxWorkers=2
```

Output directories and individual artifacts are created exclusively with restrictive permissions. Every paid request has a durable start record, a provider response, timing and a provider-reported cost. Missing answers, invalid JSON and refusals are not silently scored healthy. Interrupted started requests require investigation before any retry; the runner does not automatically resume or repeat them.

Before the paid run, the harness verifies the live provider catalog and image support for all three model IDs, and records pricing and parameter support. It checks account usage before each sequential request, reserves US$0.15 for the next request, and stops on unknown cost or a rejected request. The OpenRouter run cap is US$2.59, leaving room under the session's original US$3 total for the earlier US$0.25033089 experiments and a conservative reserve for the rejected direct request. Software checks do not constitute a provider-enforced billing limit. The cap must not be reused as new authorization for future runs.

Plans, source snapshots, source hashes, settings, usage, charged costs and per-case outputs remain in private git-ignored run directories. Scoring emits a separate source snapshot so later scoring changes are distinguishable from original model outputs.

## Interpreting the checker

The checker is evaluated separately as health triage, with its own completion, decisive coverage, healthy/abnormal agreement, diseased-called-healthy counts, latency and cost. It does not return a free-form disease diagnosis, so its health classification is not compared directly with diagnosis top-one accuracy.

A shadow-only veto can add review flags for poor capture, unsupported diagnoses, uncertain triage or disputed healthy reassurance. It cannot remove an existing review flag, increase diagnosis confidence or permit treatment. The initial 0.7 thresholds were fixed before the assessments and are exploratory. More review is not automatically better: report its effect on healthy reassurance and treatment coverage alongside any reduced mismatch rate. The checker can share a diagnosis model's errors and is not a substitute for expert labels.

Measured outcomes and the adoption decision are in `luna-decisions-results-20261031.md`.
