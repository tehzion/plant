# Scan quality and result consistency

## Implemented

- A shared decision policy is used by the backend, result page, products, PDF, sharing, nutrition, and follow-up drafts.
- Explicit confident states cannot override missing evidence, retake flags, or uncertainty. Fresh results with missing quality/confidence fields remain under review.
- Diagnosis-stage fields are checked before use. The merge considers main and close-up photo quality and preserves retake flags.
- Crop-specific hypotheses retain uncertainty. Model estimates are not presented as measured accuracy.
- Photo quality no longer uses green coverage to reject yellow/brown leaves, fruit, or stems.
- Capture supports leaf, fruit, stem, and whole-plant context, symptom duration, affected area, and recent inputs. Reported information is labelled as context rather than visual evidence.
- The result page leads with observations, uncertainty, and next action. Tabs support keyboard navigation.
- Follow-up drafts are localized in English, Malay, and Chinese and do not preselect pesticide spraying.
- Follow-up records can link a plot, schedule a check, and record severity, outcomes, notes, and photos. The original diagnosis remains intact. Cloud writes use the existing owner policies and detect concurrent changes.

## Expert benchmark workflow

Public feedback is a review suggestion, never an expert label. Keep expert labels in a separate controlled file at `DIAGNOSIS_DATA_DIR/holdout/expert_labels.json` (or `server/dataset/holdout/expert_labels.json` in development).

Example label structure (replace every example value with an actual reviewed case):

```json
{
  "scanId": "the-real-scan-id",
  "reviewStatus": "expert_verified",
  "reviewedBy": "the-expert-reviewer-id",
  "reviewedAt": "2026-10-05T10:00:00Z",
  "correctCrop": "Durian",
  "correctDisease": "expert-confirmed-condition-name",
  "correctHealthy": false,
  "correctCauseCategory": "fungal",
  "diseaseAliases": ["equivalent-name-in-another-language"]
}
```

The file is an array. Allowed cause categories are `healthy`, `fungal`, `bacterial`, `viral`, `pest`, `nutrient`, `environmental`, and `unknown`. An expert must explicitly label healthy/unhealthy; it is not inferred from a helpfulness vote or disease name.

After exporting diagnosis audit records, run:

```sh
node server/scripts/buildDiseaseHoldout.js
node server/scripts/evaluateScanQuality.js
```

The evaluator is read-only. Below 20 expert-reviewed cases it reports that evaluation is pending. Its results describe only the reviewed sample. It reports top-1 and top-3 disease matching, healthy/unhealthy accuracy, confidently wrong cases, retake/review rates, crop breakdowns, and confidence buckets. Aliases must be expert-approved; exact display names alone are not reliable across languages.

## Remaining evidence work

Build a 300–500 case pilot with healthy cases, common diseases, pests, nutrient/environmental stress, poor photos, and multiple crop/organ types. Separate plants and farms between prompt examples and holdout cases. Generate fresh predictions with a recorded model/policy version before comparing releases; historical predictions do not measure a changed pipeline. Tune thresholds from that evaluation rather than claiming the current scores are calibrated probabilities.

Apply `supabase/migrations/20261005201000_scan_followup_revision.sql` to an existing project before using cloud follow-up saves. The source schema also includes the revision column. Cloud writes compare and increment that revision to detect concurrent changes.

Cloud follow-up reads/writes and private photo uploads should also be checked against the deployed Supabase project with an authenticated test account. Unit tests exercise owner scoping, failed writes, and concurrent-update handling; they do not validate deployed RLS configuration.
