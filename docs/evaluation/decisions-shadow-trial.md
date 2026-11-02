# GPT-5.4-mini with a Decisions shadow checker

The `/api/analyze` route now supports an optional OpenRouter Decisions checker. The diagnosis, advice, product eligibility, API result and cached result remain the original GPT output and existing policy. Checker output is stored only in `metadata.decisionShadow` in the existing private diagnosis audit log. There is no production deployment in this change. An opt-in enforce mode, added in November 2026, lets the checker hold back treatment; see [Enforce mode](#enforce-mode).

## Controlled trial configuration

All settings are server-only. The feature is disabled by default:

```dotenv
DECISIONS_CHECK_MODE=off            # off | shadow | enforce
DECISIONS_SHADOW_ENABLED=false      # legacy switch; true means shadow
DECISIONS_SHADOW_MAX_REQUESTS=20
DECISIONS_SHADOW_MAX_COST_USD=0.05
DECISIONS_SHADOW_TIMEOUT_MS=3000
```

For a trial, set the enabled flag to `true` only on the intended server. The service also requires the existing OpenRouter provider/key, a primary `gpt-5.4-mini` or `google/gemini-3.8-flash` diagnosis, and the farmer's existing explicit `dataConsent.aiImprovement` opt-in. No new consent screen was added. Cached assessments do not trigger another checker call.

The checker runs once, with no retries, and at most two distinct photos. It asks the real `openai/gpt-6-luna-decisions` model via OpenRouter's `/api/alpha/decisions` endpoint. Requests inspect capture clarity, observable symptoms, visible health and support for the proposed diagnosis. Typed answers are validated and sanitized; invalid answers and refusals cannot create a healthy or treatment-ready decision.

In shadow mode the checker now runs after the farmer's result has been sent, so it adds no wait to the scan; its finding is written to the audit record when it finishes. On a serverless host that freezes after the response, a late check may be lost; it is then simply absent from the audit log. Its timeout, missing cost, provider errors and parsing failures are recorded as unavailable and leave the original diagnosis usable.

Request and cost reservations happen before the network call. Limits are **per server-process lifetime**, not a durable global daily budget: replicas and restarts have separate counters. A US$0.01 per-request reserve is used, and unknown costs stop further requests in that process. Actual charges can exceed a reserve on an individual request; these are conservative software stops, not provider-enforced billing limits. Keep the initial rollout small and monitor the provider account. Invalid or excessive limits disable the trial. The timeout is configurable up to five seconds; the default is three.

## Enforce mode

`DECISIONS_CHECK_MODE=enforce` makes the second check part of the decision. It runs before the result is sent and before caching, within the same bounded timeout.

- It only acts on a result the existing policy would show as treatment-ready or healthy, or one that would suggest fertiliser or supplement products.
- It switches the result to expert review only on confident contrary evidence (threshold 0.7):
  - **Treatment-ready result:** the photo is unclear, support for the diagnosis is weak, the check says the plant looks healthy, or one of the listed look-alike diseases is better supported than the diagnosis. Alternatives come from the result's own differential diagnoses (up to three).
  - **Healthy result:** the check sees an abnormality or a specific symptom.
  - **Fertiliser or supplement suggestion** (for example a nutrient deficiency): the same checks as a treatment-ready result.
- A vetoed result is marked `secondCheck.applied`. The shared section policy then shows no store products of any kind (treatment, fertiliser or supplement) on the result page, in the PDF or from `/api/products/search`, and the farmer is told to ask an expert before buying or using any product.
- When it acts, treatments and prevention products are removed, the next step becomes a scouting check, and the farmer is told why in plain words (en/ms/zh). The result records `secondCheck` and its saved decision snapshot is marked for review.
- It never clears a review flag, raises confidence or unlocks treatment. If the check is skipped, times out or fails, the original result stands.
- Enforce mode does not require `aiImprovement` consent, because the check is part of producing the farmer's own result, not research. The photo is still sent to OpenRouter for that check. Confirm this is acceptable under the privacy notice before enabling it.
- Default caps are 2000 requests and US$2 per server process (maximums 100000 and US$100).

On the 20 Decisions study photos, the enforce rule cut wrong treatment advice from 2 to 0, kept all 3 correct healthy reassurances, and raised reviews from 13 to 15. That is a small sample: watch review volume and healthy reassurance after enabling it.

## What is recorded

Checked records include the baseline and hypothetical shadow states, `wouldAddReview`, review reasons, fixed threshold version, sanitized probabilities, additional latency and provider-reported cost. Checker token/cost usage is kept separately under the shadow audit field. It is not mixed into the farmer-visible confidence. Skipped and unavailable records remain distinguishable from completed checks.

The hypothetical policy can only add caution. It never clears an existing review flag, increases confidence or unlocks treatment. In shadow mode it does not change what the farmer sees. A new consistency check also flags a treatment-ready diagnosis when the checker independently says the image is healthy.

The original 0.7 thresholds are exploratory, not clinically calibrated. More review is not automatically better; track healthy reassurance and treatment coverage alongside disagreements. Source labels and expert labels are still required to assess diagnostic correctness. This integration uses the shared protocol module rather than importing experimental study code into the application.

## Local live canary

The canary uses three already-assessed development images (two prior label-disagreement cases and a healthy result), with a separate US$0.03 cap. It does not start a production server, write farmer records or use reserved images. It verifies that the input diagnosis is byte-for-byte unchanged and writes findings into a private local audit file.

```sh
# Dry run, no paid requests:
node server/scripts/tryDecisionShadow.js SPLIT STUDY_ASSESSMENTS NEW_OUTPUT_DIR
# Only with an approved budget:
# node server/scripts/tryDecisionShadow.js SPLIT STUDY_ASSESSMENTS NEW_OUTPUT_DIR --approve-usd=0.03
```

## Review trial results

Read a private local JSONL audit file or a consent-filtered existing audit export:

```sh
node server/scripts/reportDecisionShadow.js PRIVATE_AUDIT.jsonl
```

The report preserves unavailable, skipped and unobserved records and unknown-cost coverage. It summarizes hypothetical added reviews, healthy/treatment coverage, latency and known cost. It makes no accuracy claim without independent ground truth. The normal farmer result and cache never contain the experimental findings.

Route tests verify audit-only storage, unchanged responses, cache-hit behavior and failure isolation. Service tests cover consent, provider/model gates, concurrent budget reservations, request caps, unknown-cost stops, timeouts, image handling and usage accounting.

## Verification on 31 October 2026

The integrated service completed all three live canary checks through OpenRouter for **US$0.0005562**, with mean checker latency **974 ms**. All three input diagnoses remained byte-for-byte unchanged, and no reserved image was used. Both prior treatment-eligible label disagreements were flagged, as was the healthy-labelled control (low-confidence triage). This confirms the integration works and also illustrates why the initial trial remains shadow-only; three deliberately selected cases do not establish an error rate or clinical accuracy.

The full root suite passed **587 tests across 114 files**. The new audit-metrics checks also passed separately (2 tests). The checker is disabled by default, and no production deployment or production database write was performed. Canary metadata and the source snapshot remain in the private ignored directory `server/dataset/decision-shadow-canary-20261031/`.
