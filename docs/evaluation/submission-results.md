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

The evaluation showed two weaknesses, and we fixed both:
- **Wrong crop.** Without a stated crop, the AI misidentified it in 25 of 70 images (for example, tomato read as bean or cabbage), because farmers could only choose a broad group such as "Vegetables". We added an optional "Which crop?" choice in all three languages, which the AI treats as the farmer's stated crop.
- **Confident treatment for the wrong disease.** The AI gave confident "Early Blight" treatment advice on late-blight and leaf-mould leaves without ever considering those look-alikes. A new safety rule means that on tomato and potato, treatment advice is only given once the look-alike blights have been compared; otherwise the farmer is told an expert should confirm first.

## (iv) What measurable outcomes or improvements resulted?

| Measure (same 70 images, assessed with and without the crop stated) | Without crop | With crop |
|---|---:|---:|
| Crop identified correctly | 45 (64%) | 69 (99%) |
| Correct disease as top answer | 21 (30%) | 23 (33%) |
| Correct disease in top three | 29 (41%) | 38 (54%) |
| Average response time | 12.5 s | 12.2 s |

The 70 images are 52 PlantVillage and 18 PlantDoc images covering 13 crops; 11 are healthy.

| Confident treatment for the wrong disease | Rate |
|---|---:|
| Before the look-alike rule (40 assessments) | 4 (10%) |
| With the rule (108 assessments) | 2 (1.9%) |

Other results:
- **Dataset:** 500 reference images stored and retrievable (472 PlantVillage, 28 PlantDoc; 150 healthy, 350 diseased).
- **Assessments:** 168 completed real AI assessments of 86 distinct images, stored separately from the reference labels. The 12 original pilot records are unchanged.
- **Health-status defect fixed:** in the original pilot, all 8 diseased cases named a disease but were marked "healthy". That contradiction no longer occurs.
- **Cost:** about US$0.012 per assessment; about US$1.97 for all evaluation runs.

**Limits to state honestly:**
- 70 images is still a modest sample, and dataset labels are not field-validated Malaysian diagnoses.
- In the "with crop" runs the crop was stated, as a farmer would state it, so the crop figure reflects the new input rather than better image recognition.
- The AI still called 7 of 59 diseased leaves "no issues" (for example, citrus greening, spider mites and powdery mildew), and 1 of 11 healthy leaves was flagged as unhealthy. This is the next safety item to address.
- One of the two remaining wrong confident treatments is a PlantDoc image labelled "late blight" whose visible symptoms look like early blight; its label needs expert checking.

## (v) Why is this AI / automation implementation unique or innovative?

- **Measured against reference data:** we test the production diagnosis path itself against public reference datasets, kept separate from its predictions, rather than relying on demo cases.
- **Safety-first:** a shared policy decides when the AI may recommend treatment. Uncertain cases go to expert review, and model confidence is shown as an estimate, not a guarantee.
- **Evidence-driven improvement:** the crop-selection change and the look-alike safety rule both came directly from measured failures and were re-tested on the same images.
- **Built for Malaysian farmers:** three languages, local crops (cili, sawi, kangkung, betik and others), and integration with the KANB product catalogue and expert contacts.

## (vi) How is this AI or automation solution expandable in the future?

- Assess all 500 imported images, and add more PlantDoc and Malaysian field photos (durian, oil palm, paddy, chilli) to the same Neon schema.
- Add a plant-identification service (PlantNet) to confirm crops automatically when the farmer is unsure.
- Use the stored results to reduce missed diseases (“no issues” on a diseased leaf) and extend the look-alike rule to other crops, with agronomist reviews recorded in the existing review tables.
- Repeat the before/after evaluation on every model or prompt change as a quality gate before release.

## Supporting evidence

- `docs/evaluation/demo-walkthrough.mp4`: 56-second captioned walkthrough built from real screenshots of this run (captions also in `demo-walkthrough.srt`).
- `docs/evaluation/demo-slides.html`: open with `?slide=1` to `?slide=5` for the evidence slides.
- Neon evaluation branch `codex-agro-poc-20261031`: tables `agricultural_reference_images` (500 rows) and `agricultural_dataset_assessments` (168 completed rows; the 70-image comparison uses runs `batch-20261031-n20`, `batch-20261031-n20-crop`, `paired2-20261031-nocrop` and `paired2-20261031-crop`).
- Automated test suite: 445 tests passing (99 files).
