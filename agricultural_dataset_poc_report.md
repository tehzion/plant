# Agricultural dataset POC report

**Decision: CONDITIONAL PASS — do not proceed to full integration yet.** Ten valid image cases completed through the existing assessment endpoint and were stored and retrieved from an isolated Neon branch. A critical health-status defect was discovered in the original outputs and fixed locally; regression tests and one separate live post-fix assessment pass. The complete farmer-facing flow has not yet been verified. One excluded failed attempt and the post-fix reassessment are retained in the CSV.

## Existing architecture and scope

The React/Vite frontend normally resizes images and runs browser-side quality checks before calling the Express `/api/analyze` route. The route attempts PlantNet species identification, uses OpenAI vision fallback when unavailable, and then performs the existing multimodal diagnosis and conditional treatment enrichment. The configured provider for this test was OpenRouter with `openai/gpt-5.4-mini`; PlantNet was **not configured**, so the existing fallback path was used. These results therefore do not verify PlantNet. The POC sent original image bytes through the API with a broad crop category; it did not reproduce browser resizing or preflight. Dataset disease labels were not included in the request body. The isolated server had no production database or cloud-storage credentials and wrote audit data to a temporary local directory.

Neon PostgreSQL normally stores application records; Supabase handles authentication and private images. This POC kept dataset photos locally and created only `public.agricultural_dataset_poc` in the schema-only branch `codex-agro-poc-20261031` (`br-polished-feather-b5nbdg9e`), project `plant-ai-agrropeuner`. The branch expires 8 November 2026 at 00:00 Malaysia time. No full reference schema, production data, or dashboard was modified.

## Data and methodology

Five PlantVillage and five PlantDoc valid images were selected from the previously prepared seed-20261031 sample. Two PlantVillage cases are healthy and eight cases are disease-labelled. All local file SHA-256 checks matched and the selected images had no exact byte duplicates. The original labels and image references are preserved in the accompanying CSV. PlantVillage is distributed under a CC BY-SA 3.0 dataset card; PlantDoc's repository declares CC BY 4.0 but its images are described as web-scraped. The project owner stated that dataset usage approval had been obtained; individual PlantDoc image provenance was not independently verified. Dataset labels are references, not expert-confirmed diagnoses.

One original PlantDoc case (PILOT-19) was a multi-image composite containing printed disease names. It returned `NOT_A_PLANT`; although no label was supplied as text in the request, the image itself exposed labels to the model. It is included in the results as a failed, non-blind attempt and excluded from the valid ten. A different image from the same reference class without visible label text was assessed as POC-19R. This replacement is not hidden; a separate post-fix retest brings the total to 12 attempts. All ten final images were visually checked for printed diagnosis labels after the first attempt; automated text-leak checks are still needed.

## Individual assessment results

| ID | Dataset | Reference crop / original label | Predicted crop / condition | Comparison | Time |
|---|---|---|---|---|---:|
| PILOT-01 | PlantVillage | Corn (maize) / healthy | Corn (Zea mays) / Image Too Unclear For Diagnosis | uncertain_or_review | 8.52s |
| PILOT-03 | PlantVillage | Grape / healthy | Grape (Vitis vinifera) / No Issues | match | 11.52s |
| PILOT-06 | PlantVillage | Tomato / Bacterial_spot | Potato (Solanum tuberosum) / Leaf Scorch | uncertain_or_review | 9.91s |
| PILOT-07 | PlantVillage | Potato / Late_blight | Potato (Solanum tuberosum) / Early Blight | uncertain_or_review | 11.02s |
| PILOT-09 | PlantVillage | Corn (maize) / Northern_Leaf_Blight | Corn (Zea mays) / Leaf Spot | uncertain_or_review | 15.09s |
| PILOT-16 | PlantDoc | Apple / Apple rust leaf | Apple (Malus domestica) / Apple Scab | different_or_unclear | 12.58s |
| PILOT-17 | PlantDoc | Bell pepper / Bell_pepper leaf spot | Capsicum annuum (pepper/chili) / Bacterial Leaf Spot | uncertain_or_review | 14.05s |
| PILOT-18 | PlantDoc | grape / grape leaf black rot | Grape (Vitis vinifera) / Leaf Spot | uncertain_or_review | 15.32s |
| PILOT-19 | PlantDoc | Tomato / Tomato leaf mosaic virus | — / — | Failed: NOT_A_PLANT | 4.40s |
| POC-19R | PlantDoc | Tomato / Tomato leaf mosaic virus | Tomato (Solanum lycopersicum) / Mosaic Virus | uncertain_or_review | 33.21s |
| PILOT-20 | PlantDoc | Corn / Corn rust leaf | Corn (Zea mays) / Common Rust | match | 13.89s |
| POC-20F | PlantDoc | Corn / Corn rust leaf | Corn (Zea mays) / Cercospora Leaf Spot | uncertain_or_review | 17.58s |

## Results and denominators

- **Valid-case completion:** 10/10 (100%). Across all attempts, including the excluded failed composite and the separate post-fix retest: 11/12 completed.
- **Crop agreement:** 9/10 (90%) using predeclared simple crop-name aliases, on the ten valid completed cases. The reported crop is not independent of the broad crop category supplied to the app.
- **Conservative condition agreement:** 2/3 non-uncertain cases matched the dataset label; 1 differed or was unclear. The other 7/10 valid cases were under the app's review/retake policy and excluded from that denominator. The two matches are 2/10 of all valid cases. Labels and matching have not been checked by an agricultural expert.
- **Uncertainty/review:** 7/10 required review or a retake under the shared policy. This is a policy measure, not proof that every warning was appropriate.
- **Latency:** 14.51 seconds mean over 10 completed valid cases, measured from local API request to response. The excluded failed attempt took 4.40 seconds.
- **Cost:** unavailable. The endpoint did not return per-call provider usage or costs; no actual cost or savings figure can be calculated from these records.

Primary comparison uses lowercase exact/predeclared condition phrases and treats a healthy status as matching a healthy reference; uncertain/review cases are separated, not silently counted as wrong or correct. Crop comparison uses simple aliases for maize/corn and capsicum/pepper, otherwise the reference crop name in the returned crop text. Dataset splits, crop classes and photographic conditions differ, and the small nonrandom selection cannot establish real-world accuracy. Model confidence fields are model-generated estimates, not calibrated probabilities.

## Neon integration

The test created the minimal POC table, inserted and retrieved all **12** attempt records, and filtered them by source: five PlantVillage and seven PlantDoc including the retained failed attempt and the post-fix retest. Original labels, predicted conditions, agreement statuses and full JSON responses were checked against the local files using order-independent JSON comparison: **12/12 matched**. The CSV exports every attempt, including the excluded original, replacement and separate post-fix retest. No production table or record was modified. The schema-only branch avoids copying production rows.

## Technical and safety findings

1. **Critical health-state inconsistency in baseline:** 8/8 completed valid disease-labelled cases had `healthStatus: healthy` even while the result named a disease. `ensureCarePlan` used a substring match where `unhealthy` contains `healthy`. This can mislead downstream displays or recommendations. The original AI responses in the CSV and Neon are unchanged. The source fix now uses whole-status matching and preserves `unknown`; 72 isolated tests passed, including regression, assessment and product eligibility tests. A separate live post-fix assessment of the same corn image returned “Cercospora Leaf Spot”, `healthStatus: unhealthy`, and an expert-review decision. This checks the status path for one new response; the diagnosis changed between runs and it does not prove diagnostic accuracy or validate every farmer-facing path. It is excluded from baseline metrics. No production deployment was performed.
2. **Blindness and image quality:** the first mosaic-virus image contained printed labels and was misclassified as not a plant by the vision fallback. Replacement and full accounting are recorded. Add image review/OCR and a documented preflight before future batches.
3. **Diagnostic mismatch with high reported confidence:** the Apple rust reference was labelled “Apple Scab” with a high model score; the system also produced generic fungicide guidance. This is a disagreement with the dataset label, not proof of the correct diagnosis. A qualified expert should assess the image and advice before any conclusion or product use.
4. **Uncertainty needs interpretation:** the system flagged many cases for review, including one where the reference was healthy and the image was unclear. In other cases it offered likely disease names while requesting more evidence. Validate the presentation and treatment gating with experts.
5. **Reproducibility gaps:** actual provider usage and dollar cost were not captured; PlantNet and frontend photo processing were not exercised; this branch expires; and the crop/category mapping is preliminary. The reference disease was not sent in the JSON request, but the contaminated first image shows why visual inspection must occur beforehand.

## Recommended next steps

1. Test an end-to-end farmer result and recommendation flow with the health-status fix without production writes. Obtain independent review of safety and corrected status.
2. Retain the composite failure, add text/leak and image-quality preflight, and validate reference-to-prediction aliases with experts.
3. Test PlantNet and frontend preprocessing under a documented, isolated configuration; instrument provider usage and costs.
4. Re-run the POC with a fixed source snapshot and compare raw response, UI status and product gating. Proceed to larger integration only when all acceptance criteria pass and the data controls are verified.

## Conclusion

The public-data → existing API → result → isolated Neon → CSV pipeline is functional in this limited test. The original baseline revealed a critical integrity defect and a non-blind image, so this is a **conditional pass**, not authorization to proceed with the 500-image import, full reference schema or administrative expansion. This is preliminary technical evaluation, not Malaysian field-validated diagnostic accuracy or proof of treatment safety.

Sources: [PlantVillage](https://huggingface.co/datasets/mohanty/PlantVillage); [PlantDoc](https://github.com/pratikkayal/PlantDoc-Dataset).

Baseline workflow fingerprint: `pilot-api-5d24f1e45c756ccd`. Post-fix fingerprint: `pilot-api-17ac36e0f147ad51`. These identify the named source files, not the entire dependency or runtime environment.
