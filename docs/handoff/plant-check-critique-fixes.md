# Handoff: plant-check flow fixes (impeccable critique, 2026-11-01)

Fix every finding from the impeccable critique of the plant-check flow: take a photo, get the result, follow the care steps. The flow scored **22/40 (Acceptable)**. The full critique is in `.impeccable/critique/2026-11-01T14-31-15Z__src-pages-results-jsx.md`. Read it first.

## Before you start

- **Base branch.** The critique was run on **PR #25 (`fix/p1-audit`)**, which has not merged yet. It holds the earlier UI audit fixes: tokens, Figtree headings and colours.
  - If #25 has merged, branch from `master`.
  - If not, branch from `origin/fix/p1-audit`. Do not branch from `decision-shadow-trial` or from master before #25.
- **Suggested branch:** `fix/plant-check-critique`. Open one PR. Merge only when the user says so.
- **How PRs merge here:**
  - Use `gh pr merge N --merge --match-head-commit <sha>`. Auto-merge is not allowed.
  - Render deploys `master` automatically.
- **Design rules.** Run `/impeccable` and use its sub-commands (`distill`, `clarify`, `harden`, `layout`, `onboard`, `typeset`, `audit`, then `polish`). Read `reference/craft-floor.md` before you edit any UI.
  - This is a **refinement**. Keep the current look: Inter for body text, Figtree for headings, the field green, and the warm neutral background.
  - The detector's "overused font" and "cream palette" findings are brand choices. Ignore them.
- **Copy.** Every user-facing string goes through `src/i18n/translations/*`, in **both BM and EN**. Write BM for a 55-year-old paddy farmer: plain words, no model or statistics jargon.
- **Do not change the safety rules.**
  - Treatment is shown only when the result is confident (see `treatments` in `scanResultModel.js`).
  - A low-confidence result switches to "Next checks".
  - Keep the look-alike disease cards and the expert-review note.
  - Change how results are *presented*, not *when* treatment is shown.

## Fixes, in order

### 1. [P0] Tell the farmer what to do now (Results)
- **Problem:**
  - Treatment sits in the second tab, inside an accordion that starts closed (`src/components/TreatmentRecommendations.jsx:11-15`, `treatments: false`).
  - The main button "Catat penjagaan" (`src/pages/Results.jsx:565-588`) opens a logbook, not advice.
- **Do:**
  - Directly under the diagnosis, add one "Buat ini sekarang / Do this now" block with 1–3 steps.
  - When treatment is allowed, include the treatment line with the dose and a line telling the farmer to follow the product label.
  - Make the main button full-width and match it to the result:

    | Result | Main button |
    |---|---|
    | Retake | Ambil semula foto |
    | Low confidence | Tanya pakar |
    | Confident disease | Mula pelan rawatan |
    | Healthy | Tetapkan semakan semula |

- **Done when:** on a phone (375 wide), the rice-blast result shows the diagnosis, the photo, the steps and the main button without the farmer opening any tab or accordion.

### 2. [P1] Remove the repeats and shorten Results
- **Problem:**
  - The disease name and the status each appear 3 times: the `ScanDecisionSummary` h2 and status, the `DiseaseResult` chip, and the Status box.
  - Immediate actions appear twice: the Today plan and "Tindakan Segera".
  - "Why we think this" appears twice.
  - There are two log buttons with different labels (`Results.jsx:576-579` and `:731-734`).
  - The 4-tab strip clips the Products tab.
  - The page is about 7 phone screens long.
- **Do:**
  - Rebuild the page in this order:
    1. summary, with the farmer's photo beside the diagnosis
    2. do this now
    3. what to watch for
    4. one "Butiran lanjut" (more details) section holding the rest: evidence, look-alikes, nutrition, products
  - Merge the two log buttons into one.
  - On phones, drop the tabs or cut them to 2.
  - Fix the re-check advice, which says 5 days in one place and 3 days in another.
- **Done when:**
  - The page is about 3 screens or less on a phone.
  - Each fact appears once.
  - Nothing scrolls sideways.

### 3. [P1] Give each result type its own look
- **Problem:**
  - Confident, low-confidence, retake and healthy results all share the same layout and type.
  - The retake headline is "Tidak diketahui", and it isn't translated in EN.
  - A healthy result shows "Severity: Low" and "check whether it is improving".
  - Retake and low-confidence results still show the Nutrition and Products tabs.
  - `pathogenType` is shown raw, so "Fungal" appears in BM.
- **Do:** give each `resultState` its own headline, icon or colour, and main button.
  - **Retake:** headline "Kami perlukan foto yang lebih jelas", with `retakeReason` shown inline.
  - **Healthy:** a moment of relief, no severity, and the re-check wording changed from "improving" to "still healthy".
  - **Low confidence and retake:** hide Products and Nutrition.
  - Translate `pathogenType`. Show the Latin name only as small secondary text, or drop it.
- **Done when:** a screenshot of each of the 4 types tells you which type it is without reading the text.

### 4. [P2] Fix the contradictions in the capture flow
- **Problem:**
  - The stepper says "1 of 3", but step 1 says "Langkah 1 daripada 2: Seluruh pokok".
  - The "Tanaman, plot dan gejala (pilihan)" section holds photo subject, duration, how much is affected and recent treatment, but no crop or plot field.
  - The photo subject defaults to "Daun" (`src/components/ScanCaptureContext.jsx:10`) right under "Seluruh pokok".
  - Step 2 says "Pilih Kategori Tumbuhan" twice.
  - Farm scale defaults to "Taman Peribadi/Rumah" (home garden).
  - The category grid shows 12 tiles (`src/components/PlantCategorySelector.jsx:5-18`). "Kawalan Rumpai" (weed control) is listed as a plant category, and the icon colours are arbitrary.
  - The page doesn't scroll to the top on a step change or an error.
  - The blur warning covers the header and the stepper.
- **Do:**
  - Keep one step counter.
  - Rename or restructure the optional section so it matches what's inside.
  - Make the photo subject default match "whole plant".
  - Remove the repeated title.
  - Remember the last crop and farm scale in localStorage, and default scale to the farmer's own scale rather than home garden.
  - Show the 3–4 most common crops first, with "Lain-lain" opening the rest.
  - Scroll to the top on a step change or an error.
  - Move the blur warning so it doesn't cover the stepper.
  - On the analysis failure card (`Home.jsx`): use one message instead of two, say that the photo is kept, and make the title at least as large as the body.

### 5. [P2] Text size and heading structure
- **Problem:**
  - Body text is 14.4px, and symptom, label and score text is 12–12.8px.
  - Results has no `<h1>`.
  - Heading levels are skipped:
    - `Home.jsx:667` h1 is followed by `:694` h3.
    - The `ScanDecisionSummary.jsx:49` h2 is followed by an h4 in `src/components/disease-result/DiseaseResultSections.jsx:66` and `:97`.
    - `HealthyCarePlan.jsx:77` also uses h4.
  - The feedback buttons are 42px tall.
  - Some feedback and product buttons render in Arial because they don't inherit the font.
- **Do:**
  - Set body text to 16px or more, and raise the 12px text.
  - Make the diagnosis the page `<h1>` at 26–28px.
  - Fix the heading order.
  - Make all tap targets at least 44px.
  - Add `font: inherit` on buttons.

### Minor items (fix along the way)
- "Lihat sejarah" uses a save (floppy-disk) icon. Use a history icon.
- "Catat penjagaan" and "Catat tindakan rawatan" do the same thing. Use one label.
- The header status chip flips between "Gangguan" and "Menyemak…" every few seconds (`src/lib/nav.js:66` area). Hide it unless the service is really down, and make the wording plain.
- The non-critical Products error uses a bold red headline. Make it quieter.
- `.scan-decision` uses a 4px top border on a rounded card (`src/pages/Results.css:482-493`). Show the status another way, for example a status icon or a tinted header.
- i18n bug: the key `common.common.locationNA` has a doubled prefix. The keys "common.Bentong, Pahang" and "common.Kuala Selangor, Selangor" are also missing.
- The 88% score is labelled "anggaran" (estimate) without explaining why. Explain it in farmer terms or remove the label.

## How to test it

1. **Start a dev server** with demo auth. Add this entry to `.claude/launch.json`, then `preview_start`:

   ```json
   { "name": "web-demo-fix", "runtimeExecutable": "npx", "runtimeArgs": ["vite", "--port", "5175", "--strictPort"], "port": 5175, "env": { "VITE_ENABLE_DEMO_AUTH": "true" } }
   ```

   Remove the entry afterwards. The file may hold the user's own entries, so edit it; don't reset it with git.
2. **Seed results.** The AI backend is usually down locally, so seed result records instead.
   - In the page, set `localStorage.plant_demo_session = 'true'`.
   - Reload, then import `saveScan` from `/src/utils/localStorage.js` and save records. They land in the `demo::` namespace.
   - Seed one record per type:

     | Type | Crop and disease | Confidence |
     |---|---|---|
     | Confident disease | rice blast ("Penyakit Karah Padi", *Magnaporthe oryzae*), moderate, with treatments | 86–88 |
     | Healthy | chilli | 93 |
     | Low confidence | durian | 52 |
     | Retake | padi, with a `retakeReason` | — |

   - Open `/results/<id>` for each.
3. **Check** at 375×812 and 360 wide, in **BM and EN**, for all 4 result types. Also check the capture steps at `/?scan=true`: blur rejection, step 2, and the failure card.
4. **Run the tests:**

   ```bash
   npx vitest run
   ```

   Update the existing tests (`Results.test.jsx`, `ScanDecisionSummary.test.jsx`, `DiseaseCard.test.jsx`, `PlantCategorySelector.test.jsx`, `CameraUpload.test.jsx`, `ScanPhotoGuidance.test.jsx`) where the copy or structure changed. Add tests for the per-type headlines and the main button.
5. **Run the detector** on the changed markup:

   ```bash
   ~/.claude/skills/impeccable/scripts/impeccable detect --json <files>
   ```

6. **Re-run the critique and polish:** `/impeccable critique` on the flow (target `src/pages/Results.jsx`; aim for 30+/40), then `/impeccable polish`.
7. **Clean up:** clear the demo records and the `plant_demo_session` flag, and stop the dev server.

## Out of scope
- The Stageshow launch clip in `docs/launch/stageshow/`. It's on hold and is separate work.
- Backend or AI decision logic, and the Decisions shadow checker on `decision-shadow-trial`.
- Desktop layout redesign. Keep it working, but phones come first.
