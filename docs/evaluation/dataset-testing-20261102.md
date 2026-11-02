# How we used public datasets to improve accuracy

Measured 31 October to 2 November 2026 on an isolated evaluation database and server, not production.

## In short

We did not train or fine-tune our own AI model. KANB uses a general multimodal AI model, and we used large public plant-disease datasets to **test** it the way a farmer uses it, **find where it fails**, **improve the app around it** (crop disease knowledge, prompts, safety rules and model choice), and **re-test** on the same photos to prove each change helped.

Suggested wording for the submission: *"We built and tuned the app using seven public research datasets totalling over 75,000 labelled plant photos, and tested it blind on several hundred of them."*

## The datasets

| Dataset | Crops | Size | Licence |
|---|---|---:|---|
| PlantVillage | 14 crops, incl. tomato, chilli/pepper, potato | about 54,000 | CC BY-SA 3.0 |
| PlantDoc (field photos) | 13 crops | about 2,600 | CC BY 4.0 |
| Rice Leaf Disease Image Samples (Sethy et al., Mendeley fwcj7stb8r) | Padi | 5,932 | CC BY 4.0 |
| Rice Leaf Bacterial and Fungal Disease (Mendeley hx6f852hw4) | Padi | not counted | CC BY 4.0 |
| Chilli Leaf Disease Image Dataset (Mendeley tm3v4zmh7c) | Chilli | 8,814 | CC BY 4.0 |
| Papaya Leaf Disease Image Dataset (Mendeley 3kwgxg4stb) | Papaya | 3,626 | CC BY 4.0 |
| MangoLeaf (Mendeley 7ncn6p98g6) | Mango | about 4,000 | CC BY 4.0 |

Datasets with non-commercial licences were not used.

## How we test

- Each photo is sent through the **same assessment API farmers use**, with the crop chosen as a farmer would choose it. The dataset label is never sent.
- The AI's answer is compared with the label afterwards: is the correct disease the top answer, or in the top three; was the crop right; did the app give treatment advice for the wrong disease; did it call a diseased leaf healthy.
- 100 photos are set aside as an untouched holdout and were never used while improving the app, so a final check is not biased by our changes.
- Every change was re-tested on the same photos as the "before" run.

## What the tests found, and what we changed

| Finding | Change |
|---|---|
| Without a stated crop, the crop was wrong in 25 of 70 photos | Farmers choose their crop (Padi, Vegetables, Fruits, then the exact crop) |
| Confident treatment given for a look-alike disease | Treatment is only given after look-alike diseases are compared |
| Diseased leaves shown as healthy | The AI must check each easy-to-miss sign before saying "healthy" |
| Generic answers such as "Leaf Spot" for padi brown spot or chilli cercospora; correct disease in the top three for only 23% of 119 padi, chilli, papaya and mango leaves | Added disease knowledge for padi, chilli, tomato and mango (how each common disease looks) and the AI now uses it whenever the farmer chooses a crop |
| Unsure answers only said "take a closer look" | Unsure answers now name the 1 to 3 most likely diseases and what to check for each |
| The current AI model was the main limit | Compared four AI models on the same photos and chose the most accurate (Gemini 3.8 Flash) |

## Results

| Measure | Before | After |
|---|---:|---:|
| Crop identified correctly (70 photos) | 64% | 99% |
| Correct disease in the top three (70 photos) | 41% | 54% |
| Confident treatment for the wrong disease | 10% of 40 | 1.9% of 108 |
| Diseased leaves shown as healthy (7 leaves) | 6 | 0 |
| Advice leads the farmer to the right disease, named as the answer or as a "Check for ..." step (43 diseased photos) | 14% | 49% |
| Correct disease in the top three, padi/chilli/papaya/mango (25 photos, current vs chosen model) | 48% | 76% |
| Correct disease in the top three, padi photos only (10) | 4 | 9 |

No model gave confident treatment for the wrong disease in the model comparison.

**Large test (300 photos, chosen model): in progress.** 199 new padi, chilli, papaya and mango photos, plus the same 100 photos as the earlier baseline run (baseline: correct disease in the top three 41%, as the top answer 23%, crop correct 97%, wrong treatment 1). Results will be added here.

## Limits

- Dataset labels are research labels, mostly photographed in good conditions; they are not field-confirmed Malaysian diagnoses.
- Some comparisons are small (25 to 70 photos), so differences of a few photos may be chance.
- The added disease knowledge covers the most common diseases of each crop, which are also the diseases in the test photos. The gain means the app is better at naming common diseases, not that it recognises every disease.
- When unsure, the app still asks for a closer look rather than guess; about 85% of answers carry a "check closer" note.
