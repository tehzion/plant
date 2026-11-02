# AI Agropreneur — Preliminary AI Evaluation Report

**Status: preparation only — no assessments have been run.** Date: 31 October 2026. This is not a Malaysian agricultural field trial.

## Objective and system

Test agreement with public image labels, uncertainty and suggested actions using the existing `/api/analyze` route. It runs PlantNet species identification with OpenAI vision fallback, followed by multimodal OpenAI diagnosis and, conditionally, a treatment stage (`server/index.js`, `server/services/aiService.js`). The code default is `gpt-5.4-mini` with `gpt-5-mini` fallback; the configured runtime model has not been verified. Source revision: `9f442c7eccbdc866c7397ff86752ad5480b29467`; the worktree contains uncommitted changes, so the commit alone does not identify the full workflow. Record an immutable snapshot before execution. Existing local runner skips browser resizing and image-quality preflight; results would be API-pipeline evaluation, not full frontend equivalence.

## Dataset and methodology

Twenty candidate images were selected from previously downloaded local samples: five healthy PlantVillage, ten diseased PlantVillage and five disease-labelled PlantDoc. Seed 20261031 ranks each eligible image using SHA-256 of seed, source, original path and image hash, then greedily favours distinct crops and crop/condition combinations. This is a convenience sample, not a random representative field sample. The manifest preserves source, original labels, revisions, image paths, SHA-256, and category. File hashes were recalculated for all 20 and are distinct. Image decode was checked during original import. Near-duplicates and biological leaf overlap are not ruled out.

PlantVillage’s author-hosted dataset card states CC BY-SA 3.0: https://huggingface.co/datasets/mohanty/PlantVillage . PlantDoc’s repository declares CC BY 4.0: https://github.com/pratikkayal/PlantDoc-Dataset/blob/master/LICENSE.txt ; its authors describe internet-scraped images, so individual rights remain unresolved. **Rights and independent label mapping remain pending for all candidates. They are not cleared for API upload.** No dataset label is treated as an expert review.

## Results — all 20 candidates

| ID | Dataset | Crop as listed | Original label | Status |
|---|---|---|---|---|
| PILOT-01 | PlantVillage | Corn (maize) | healthy | Not run |
| PILOT-02 | PlantVillage | Soybean | healthy | Not run |
| PILOT-03 | PlantVillage | Grape | healthy | Not run |
| PILOT-04 | PlantVillage | Blueberry | healthy | Not run |
| PILOT-05 | PlantVillage | Cherry (including sour) | healthy | Not run |
| PILOT-06 | PlantVillage | Tomato | Bacterial_spot | Not run |
| PILOT-07 | PlantVillage | Potato | Late_blight | Not run |
| PILOT-08 | PlantVillage | Grape | Esca_(Black_Measles) | Not run |
| PILOT-09 | PlantVillage | Corn (maize) | Northern_Leaf_Blight | Not run |
| PILOT-10 | PlantVillage | Peach | Bacterial_spot | Not run |
| PILOT-11 | PlantVillage | Cherry (including sour) | Powdery_mildew | Not run |
| PILOT-12 | PlantVillage | Orange | Haunglongbing_(Citrus_greening) | Not run |
| PILOT-13 | PlantVillage | Pepper, bell | Bacterial_spot | Not run |
| PILOT-14 | PlantVillage | Squash | Powdery_mildew | Not run |
| PILOT-15 | PlantVillage | Tomato | Target_Spot | Not run |
| PILOT-16 | PlantDoc | Apple | Apple rust leaf | Not run |
| PILOT-17 | PlantDoc | Bell pepper | Bell_pepper leaf spot | Not run |
| PILOT-18 | PlantDoc | grape | grape leaf black rot | Not run |
| PILOT-19 | PlantDoc | Tomato | Tomato leaf mosaic virus | Not run |
| PILOT-20 | PlantDoc | Corn | Corn rust leaf | Not run |

## Agreement and technical metrics

Not calculable: **0 completed / 0 attempted**. Diagnostic agreement, crop agreement, healthy false alarms, latency, uncertainty and spend have no measured numerator or denominator. Correct or incorrect examples, safety findings and crop-level performance cannot be established without results and independent expert assessment. All rows in `evaluation_results.csv` are explicitly marked not run.

## Cost estimate and approval

Illustrative OpenAI-only scenario: for each of 20 images assume 30,000 total input tokens including image tokens and 15,000 output tokens across all stages and retries on the code-default model. At standard GPT-5.4-mini rates of $0.75 per million input tokens and $4.50 per million output tokens, this is 20 × (30,000 × $0.75/1,000,000 + 15,000 × $4.50/1,000,000) = **USD $1.80**. This is an assumption, not a quotation or a hard cap; actual token counts, model configuration, retry counts, regional pricing, taxes and PlantNet costs/quotas are unknown. Provider usage is not reliably exposed by the existing endpoint. No local PlantNet key was detected in the checked configuration, so the existing workflow would use its OpenAI species-identification fallback unless PlantNet is separately configured. The local configuration also contains a database connection, so the ordinary local server must not be used for this test; run a separately isolated process with no production database or cloud audit credentials. [OpenAI pricing](https://developers.openai.com/api/docs/pricing). Confirm a spending limit and an isolated test configuration before execution.

## Engineering priorities and next actions

1. Verify per-image rights and approve crop/condition mappings; record exclusions rather than changing labels to match predictions.
2. Configure an isolated backend with no production database, storage or audit target, verify credentials and obtain explicit paid-call approval. Preserve current model and workflow; capture the exact source/configuration version.
3. Run the 20 cases, retain failures and uncertain cases, and report numerators, denominators, processing times and separately sourced costs.
4. Obtain an agricultural expert’s independent safety and label review. No treatment is established safe by dataset agreement.
5. Only after observing actual pilot outcomes decide whether to expand to 100 images, adjust prompts or policy, strengthen product safeguards, or invest in a dashboard. No baseline-driven recommendation can yet be made.

## Limitations

The candidate data is not representative of Malaysian farms. Labels are dataset annotations, not independent agricultural diagnoses; images have not been reviewed for similar appearance, sample leakage or chemical recommendation suitability. Some crops and conditions may be unsupported. No real accuracy, business impact or safety conclusion can be drawn.
