# AI result audit and prompt update — 25 November 2026

## What was checked

- **Production results**: all 16 stored assessments in `diagnosis_training_logs` (1–5 Nov 2026), 2 rows in `scan_history`, 0 expert reviews and 0 farmer feedback rows. Read-only queries on the `production` Neon branch.
- **Dataset runs**: 85 completed crop-stated assessments from runs `paired2-20261031-crop`, `batch-20261031-n20-crop` and `subtle-20261031-crop` on the evaluation branch `codex-agro-poc-20261031` (read-only).
- **Prompts**: the diagnosis-stage prompt, the treatment-stage prompt and the few-shot examples in `server/services/ai/diagnosis.js`.

The production volume is too small to measure accuracy. The 16 rows are test scans of a few photos repeated across models. The dataset runs use public labels, not expert-confirmed diagnoses.

## Findings

| # | Finding | Evidence | Effect on the farmer |
|---|---|---|---|
| 1 | **Generic names instead of the disease.** The answer is "Leaf Spot" or "Leaf Blight" when a specific disease of that crop fits. | 12 of 85 dataset answers: grape black rot ×3, strawberry leaf scorch ×2, peach bacterial spot ×2, corn northern leaf blight and common rust, bell pepper leaf spot. Production: areca palm "Leaf Spot". | The farmer gets no usable name to look up, and products cannot be matched. |
| 2 | **A few-shot example teaches the generic name.** The durian example answers "Leaf Spot" (Bintik Daun). | `buildDiagnosisStageFewShotExamples` | Pushes the model toward finding 1. |
| 3 | **Early Blight is over-called on tomato and potato.** | 11 Early Blight answers for other labels: bacterial spot ×3, Septoria ×2, late blight ×4, leaf mould ×1. Two of them were **confident treatment for the wrong disease** (bacterial spot, leaf mould), plus potato late blight → Early Blight at 91. | Wrong spray advice. The look-alike rule only covered the blights and leaf mould. |
| 4 | **Missed disease called healthy.** | Target spot ×3, citrus greening ×2, spider mites ×1, cherry powdery mildew ×1 returned "No Issues" at confidence 72–90. | The farmer is told the plant is fine. |
| 5 | **Mites and powdery mildew confused both ways.** | Squash powdery mildew → spider mites; tomato mites → powdery mildew; apple scab → spider mites. | Wrong control method. |
| 6 | **No check that the disease occurs in Malaysia.** | Production: "Cedar Apple Rust" given `confident_treatment` at 88. This disease needs juniper and a cool season. | Confident advice for a disease that is very unlikely here. |
| 7 | **Hedging and two diseases inside the name.** | Production: "Likely Coconut leaf blight / fungal leaf spot", "Palm (possibly Coconut; Cocos nucifera - not confirmed)". The same coconut photo got five different names across runs. | Confusing to read. The admin "Common Issues" counts are split across names. |
| 8 | **Example values copied into results.** The treatment prompt's JSON example contained "RM 40 - 120". | That exact figure appears as `treatmentCost` in 3 of the 5 inspected production results. | A made-up cost estimate. |
| 9 | **Fertiliser and "High" return on a retake result.** When the model first says "healthy" and the result is later downgraded to *retake photo*, the healthy-plant plan stayed attached. | Production `e73dbd28…`: retake result with NPK 15-15-15 and "Baja Organik Ayam" every 2–4 weeks, ROI "High". | Fertiliser advice with no diagnosis. Chicken manure was also labelled "Chemical". |
| 10 | **Technical words in farmer text.** | English: "necrotic", "lesion", "chlorosis". Malay: "lesi", "nekrotik", "klorosis", "halo". These also appeared in the few-shot examples the model copies. | Hard to read for the target farmer. |

What works well:
- Retake requests are specific.
- Uncertain results go to review rather than treatment, and dosages never appear.
- Healthy controls are mostly correct (21 of 24 "healthy" labels).
- Malay output is in Malay.

## Changes in this update

**Diagnosis prompt** (`buildDiagnosisStagePrompt`):
- Name the crop-specific disease. A bare "Leaf Spot / Leaf Blight / Fungal Leaf Spot / Chlorosis / Rust" is not accepted when the crop is known. (findings 1, 7)
- The disease name holds one condition with no hedge words, and plantType holds the crop name only. Doubt goes in the confidence and abstain fields. (7)
- New look-alike groups, each with the feature that separates its members:
  - tomato leaf spots: Early Blight, Septoria, Bacterial Spot, Target Spot, with "do not default to Early Blight";
  - grape: Black Rot, Esca, Isariopsis;
  - corn: Northern Corn Leaf Blight, Gray Leaf Spot, Common Rust;
  - spider mites versus powdery mildew;
  - citrus greening versus zinc or manganese deficiency;
  - padi: Brown Spot versus Blast.
  
  (3, 4, 5)
- Confidence anchors: 80 or more only when the hallmark sign is visible and the look-alikes are ruled out; otherwise 60–75. (3)
- Malaysia fit: diseases of temperate regions stay below 75 and are flagged as unusual here. (6)
- Plain words in every farmer-facing field, with a list of terms to avoid in English and Malay. (10)

**Few-shot examples**: the durian example now answers Anthracnose (2). All Malay and English example text now uses everyday words (10).

**Treatment prompt** (`buildTreatmentStagePrompt`):
- Every example value is a placeholder, and the prompt says never to copy or invent figures; write Unknown instead. (8)
- Fertiliser only for a possible or confirmed nutrient problem, or routine care of a healthy plant, and never as a cure. Organic or Chemical type set correctly. (9)
- Short lists of everyday words, at most 4 items, and Malaysian conditions and agencies (DOA, MARDI, MPOB, LGM, RISDA).

**Code safeguard** (`mergeDiagnosisResult`): a result that ends as retake, needs review or unknown health has its fertiliser list removed (unless a nutrient problem is possible or confirmed). Its cost and return estimate become "Unknown". (9)

Tests: `server/services/ai/promptRules.test.js` covers the prompt rules and examples. `server/services/diagnosisMerge.test.js` covers the retake safeguard.

## Still to measure

These changes follow the observed errors, but their effect is **not yet measured**. Next step: re-run the 40 crop-stated photos of `paired2-20261031-crop` with the same runner (`EVALUATION_RERUN_OF`) on the isolated evaluation branch, and compare:
- first-choice and top-three agreement;
- generic-name rate;
- confident wrong treatment;
- healthy-on-diseased rate.

Estimated cost is under US$0.90 (the runner's default cap). The dataset images are development data: any prompt tuned on them needs a fresh holdout before claiming accuracy.
