---
name: ai-result-audit
description: Audit the plant-check AI's real results and measure a prompt or policy change before and after on the same dataset photos. Use when asked to check, audit or improve AI diagnosis quality, change the diagnosis or treatment prompts in server/services/ai/diagnosis.js, or compare models or prompt versions.
---

# AI result audit and prompt comparison

This skill covers three jobs:
1. Read what the AI actually produced.
2. Change the prompt or policy for the errors found.
3. Measure before and after on the same photos.

The audit of 25 Nov 2026 (`docs/evaluation/ai-prompt-audit-20261125.md`) is a worked example.

## Rules that always apply

- **Production is read-only.** Only `select` on the production branch. Never write to it and never run assessments against it.
- **Assessments run only on the isolated evaluation branch** `codex-agro-poc-20261031` (`br-polished-feather-b5nbdg9e`), through a loopback evaluation server.
- **Paid AI calls need the user's spending approval in chat for this run**, with a US$ figure. Earlier approvals do not carry over. Ask once, with the photo count and the cap.
- **Never print keys or connection strings.** Env files are git-ignored: `.env.local` (AI keys) and `.env.evaluation.local` (evaluation branch, image store).
- Public dataset labels are not expert-checked, and photos used to find errors are development data. Report results as development evidence, never as field accuracy.

## 1. Read the real results

Neon project `winter-morning-90094683`. Production branch `br-falling-shape-b5u5qvk5`.

| Table | Holds |
|---|---|
| `diagnosis_training_logs.raw_result` | Full stored AI result: `disease`, `plantType`, `resultState`, `diagnosisConfidence`, `differentialDiagnoses`, `treatments`, `fertilizerRecommendations`, `economicImpact`, `analysisMetadata.model`, `analysisMetadata.policyVersion` |
| `scan_history.result_json` | Results saved by signed-in farmers |
| `diagnosis_feedback.feedback` | Farmer answers: `wasCorrect`, `issueType`, `correctDisease`, `note` |
| `assistant_feedback` | Thumbs up/down on assistant replies (`rating` up/down) |
| `diagnosis_expert_reviews` | Expert corrections |

On the evaluation branch:
- `agricultural_dataset_assessments` holds one row per photo per run: `run_id`, `response` (full API result), `completed`.
- Join it to `agricultural_reference_images` on `checksum` for `crop` and `original_label`.

Check every result for:
- generic names ("Leaf Spot", "Leaf Blight") when the crop is known;
- hedge words or two conditions in `disease` or `plantType`;
- confident treatment (`treatmentEligible`) for the wrong disease;
- a diseased leaf called healthy, or a healthy leaf called diseased;
- diseases that do not fit Malaysia;
- figures copied from prompt examples;
- fertiliser or cost estimates on retake or review results;
- technical words in farmer text (English: necrotic, lesion, chlorosis, halo; Malay: nekrotik, lesi, klorosis).

Also read the few-shot examples in `buildDiagnosisStageFewShotExamples`: the model copies their names and wording.

## 2. Change the prompt or policy

- **Prompts.** `buildDiagnosisStagePrompt` (stage 1, diagnosis) and `buildTreatmentStagePrompt` (stage 2, advice) in `server/services/ai/diagnosis.js`.
- **Code safeguards after the model.**
  - `mergeDiagnosisResult` in the same file.
  - Look-alike rules and `assessScanDecision` in `shared/scanResultPolicy.js`.
  - Before adding a look-alike rule, re-score the stored responses with it. Count how many correct treatments it blocks against wrong ones. Drop it if it blocks more correct ones; the corn rule was dropped for blocking 5 correct and 0 wrong.
- **Tests.** Add a test for each rule in `server/services/ai/promptRules.test.js` and for code safeguards in `server/services/diagnosisMerge.test.js`.
- **Before measuring.** Run `npx vitest run server` and `npm run benchmark:regression`.

## 3. Measure before and after (paid)

Compare on the **same photos, same day, same model**. Old runs were made with older prompts, so they are not a fair baseline.

1. **Find the last prompt change:**

   ```bash
   git log --format='%h %ad %s' --date=short origin/master -- server/services/ai/diagnosis.js shared/scanResultPolicy.js
   ```

2. **Make a master checkout for the baseline** in the scratchpad. Link `node_modules`, `.env.local` and `.env.evaluation.local` into it and into the working tree. These are symlinks to the main checkout's files, never copies.

   ```bash
   git worktree add --detach <scratch>/baseline origin/master
   ```

3. **Start two evaluation servers** with the daily farmer scan limit raised. The default 10 checks a day stops a dataset run.

   ```bash
   EVALUATION_PORT=13010 FREE_SCAN_DAILY_LIMIT=500 AI_IDENTITY_DAILY_LIMIT=500 AI_GUEST_DAILY_LIMIT=500 node server/evaluation/startEvaluationServer.js   # in the baseline checkout
   EVALUATION_PORT=13011 FREE_SCAN_DAILY_LIMIT=500 AI_IDENTITY_DAILY_LIMIT=500 AI_GUEST_DAILY_LIMIT=500 node server/evaluation/startEvaluationServer.js   # in the changed tree
   ```

4. **Preview the photos** with `EVALUATION_DRY_RUN=true` (no cost). `EVALUATION_RERUN_OF=<earlier run>` reuses that run's photos. `EVALUATION_ONLY=<checksum prefixes>` resumes a partial run.

5. **Run both, in parallel**:

   ```bash
   EVALUATION_SAMPLE=40 EVALUATION_RERUN_OF=paired2-20261031-crop EVALUATION_SEND_CROP=true \
   EVALUATION_COST_APPROVED=true EVALUATION_USAGE_CAP_USD=<approved> EVALUATION_RUN_ID=<id> \
   EVALUATION_API_URL=http://127.0.0.1:<port> \
   node --env-file=.env.local --env-file=.env.evaluation.local server/evaluation/runDatasetLive.js
   ```

   - The cap counts the key's spend since the run started, and both runs share one key. When they run in parallel, each stops once their combined spend reaches the cap, so it limits the total.
   - Each photo pair costs about US$0.025 with `gpt-5.4-mini` and the treatment stage.
   - Run it in the background; it takes about 1 minute per photo.

6. **Compare:**

   ```bash
   node --env-file=.env.evaluation.local server/evaluation/comparePromptRuns.js BASE_RUN[,BASE_RUN_B] NEW_RUN[,NEW_RUN_B]
   ```

   It reports: correct main answer, top three, generic names, hedged names, treatment given, confident wrong treatment, diseased called healthy, healthy called diseased, review/retake and technical words. It also prints a per-photo table.

7. **Clean up:**
   - stop both servers;
   - `git worktree remove --force` the baseline;
   - delete the env symlinks from the working tree.

## 4. Report

- Add the results to an audit doc in `docs/evaluation/`. Include:
  - photo count, model, run IDs and actual spend;
  - the comparison table;
  - each regression with the model's own stated reason;
  - limits: sample size, number of healthy controls, labels not expert-checked.
- Any **new confident wrong treatment** must be named in the PR description. Ask whether the label needs an expert, and do not hide it in the totals.
- Never merge the PR without the user's explicit yes.
