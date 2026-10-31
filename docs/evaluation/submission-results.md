# KANB AI Agropreneur: submission answers

All figures were measured on 31 October 2026 on an isolated Neon database branch, not production.

## (ii) Briefly describe the AI or automation

KANB AI Agropreneur is a mobile web app for Malaysian farmers. A farmer photographs an affected plant. A multimodal AI model identifies the crop, names the most likely problem with up to three look-alike alternatives, and gives safe next steps in English, Bahasa Malaysia or Chinese. A built-in safety policy sends uncertain cases to expert review instead of recommending chemical treatment.

We also built an automated evaluation pipeline around it. Public reference images (PlantVillage and PlantDoc) are imported into checksummed object storage and Neon PostgreSQL. Each image is run through the same assessment API that farmers use, and the AI's answer is compared with the dataset label. The results appear in an admin dashboard.

## (iii) What problem or process did the AI address, and how was it applied?

Smallholders often cannot get an agronomist quickly when a crop shows symptoms. The app gives a first assessment within seconds, and the review policy holds back treatment advice when the evidence is weak.

To check the AI objectively, we:
- imported 500 labelled reference images covering 14 crops and 36 disease/healthy labels
- assessed them through the farmer API without ever sending the label
- stored every prediction separately from the reference data

The evaluation showed that the AI misidentified the crop in 6 of 20 test images (for example, tomato read as bean or cabbage). That happened because farmers could only choose a broad group such as "Vegetables". We added an optional "Which crop?" choice in all three languages, which the AI treats as the farmer's stated crop.

## (iv) What measurable outcomes or improvements resulted?

| Measure (same 20 images, 10 PlantVillage + 10 PlantDoc) | Before | After |
|---|---:|---:|
| Crop identified correctly | 14 (70%) | 20 (100%) |
| Correct disease as top answer | 4 (20%) | 6 (30%) |
| Correct disease in top three | 7 (35%) | 10 (50%) |
| Sent to expert review (no treatment advice) | 14 | 13 |
| Confident treatment for the wrong disease | 2 | 2 |
| Average response time | 11.8 s | 12.3 s |

Other results:
- **Dataset:** 500 reference images stored and retrievable (472 PlantVillage, 28 PlantDoc; 150 healthy, 350 diseased).
- **Assessments:** 60 real AI assessments stored, all completed with 0 failures.
- **Health-status defect fixed:** in the original pilot, all 8 diseased cases named a disease but were marked "healthy". In the latest two runs, no result named a disease while marked healthy. Of 38 diseased-label results, 35 were marked "unhealthy", 1 was "unknown" (sent to review), and 2 were the AI judging a Target Spot leaf as having "No Issues" (a misdiagnosis, not a status contradiction).
- **Cost:** about US$0.012 per assessment (US$0.46 for the 40 batch assessments).

**Limits to state honestly:**
- 20 images is a small sample.
- Dataset labels are not field-validated Malaysian diagnoses.
- In the "after" run the crop was stated, as a farmer would state it, so the crop figure reflects the new input rather than better image recognition.
- Two confident-but-wrong treatment cases remain open for the next iteration.

## (v) Why is this AI / automation implementation unique or innovative?

- **Measured against reference data:** we test the production diagnosis path itself against public reference datasets, kept separate from its predictions, rather than relying on demo cases.
- **Safety-first:** a shared policy decides when the AI may recommend treatment. Uncertain cases go to expert review, and model confidence is shown as an estimate, not a guarantee.
- **Evidence-driven improvement:** the crop-selection change came directly from measured failures and was re-tested on the same images.
- **Built for Malaysian farmers:** three languages, local crops (cili, sawi, kangkung, betik and others), and integration with the KANB product catalogue and expert contacts.

## (vi) How is this AI or automation solution expandable in the future?

- Assess all 500 imported images, and add more PlantDoc and Malaysian field photos (durian, oil palm, paddy, chilli) to the same Neon schema.
- Add a plant-identification service (PlantNet) to confirm crops automatically when the farmer is unsure.
- Use the stored results to tune the review threshold and reduce confident-but-wrong treatments, with agronomist reviews recorded in the existing review tables.
- Repeat the before/after evaluation on every model or prompt change as a quality gate before release.

## Supporting evidence

- `docs/evaluation/demo-walkthrough.mp4`: 52-second captioned walkthrough built from real screenshots of this run (captions also in `demo-walkthrough.srt`).
- `docs/evaluation/demo-slides.html`: open with `?slide=1` to `?slide=4` for the evidence slides.
- Neon evaluation branch `codex-agro-poc-20261031`: tables `agricultural_reference_images` (500 rows) and `agricultural_dataset_assessments` (60 rows; runs `batch-20261031-n20` and `batch-20261031-n20-crop`).
- Automated test suite: 439 tests passing (99 files).
