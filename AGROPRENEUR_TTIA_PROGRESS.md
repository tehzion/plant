# AI Agropreneur — TTIA Category 5 Progress

**Date:** 31 October 2026

This note separates three things judges will look for:
- **Implemented** — exists in the code.
- **Verified** — automated tests show it behaves as designed (with mocks).
- **Demonstrated effectiveness** — shown to help farmers in the field. **Nothing in this release has reached this level yet.**

## 1. Improvements that strengthen the submission

| Improvement | Why it matters for Category 5 | Implemented | Verified (tests) | Effectiveness demonstrated |
|---|---|---|---|---|
| Closed the cross-user data flaw (P0) and bound assessments/feedback to identity | Removes the audit's top blocker; makes collected evidence trustworthy | Yes | Yes — isolated two-account emulation | n/a (security control) |
| Comparison of visually similar diseases with evidence for/against | Clearest "practical AI" story: helps farmers tell look-alike problems apart instead of trusting one label | Yes | Yes — schema, no padding, ranking rules | **No** — quality of alternatives not yet measured |
| Honest uncertainty: confidence levels, evidence requests, expert-review prompts, no chemicals at low confidence | Responsible-AI evidence; reduces harmful advice | Yes | Yes | **No** |
| Product suitability checks and separate catalogue discovery; dosage redaction | Links diagnosis to KANB/partner products without overclaiming | Yes | Yes — fixture catalogue | **No** — not measured on the live catalogue |
| Expert review with attributed correction records | Turns owner-reported expert involvement into **recordable evidence** (who reviewed what, when, verdict) | Yes | Yes — authorisation and attribution | **No** — no reviews recorded yet (migration not applied) |
| Offline-durable farm and myGAP records with visible sync status | Supports rural connectivity claims | Yes | Yes — mocked IndexedDB | **No** — not tested on devices |
| Richer myGAP records (date, plot, crop, product, quantity, operator) | Better traceability for GAP preparation | Yes | Partly (sync/fallback tested; form covered by build only) | **No** |
| Trilingual coverage (ms/en/zh) for all new farmer-facing text | Inclusivity | Yes | Yes — strict key check | **No** — comprehension not tested |

## 2. What can be claimed now

Supportable wording:
- "Uses established AI services (PlantNet and a multimodal model) to suggest a **likely** condition and compare up to three look-alike conditions using visible symptoms."
- "Shows how sure the system is, asks for more evidence when unsure, and withholds chemical advice when confidence is low."
- "Agricultural experts can review assessments and record corrections; reviews are kept separately from the original AI output."
- "Farm and myGAP records can be saved without internet and synchronise later."

Do **not** claim yet:
- Any accuracy, precision or "X% correct" figure.
- That products are verified as registered or safe for a given crop.
- Yield, income, cost-saving or adoption outcomes.
- myGAP certification, compliance or government integration.
- Proprietary disease-detection AI (the models are third-party; the orchestration and safeguards are the contribution).

## 3. Evidence to collect next (turns "implemented" into "demonstrated")

1. **Expert-reviewed sample:** apply migration 0002, ask the existing expert panel to review ≥ 100 real assessments across the main crops. Report top-1 and top-3 agreement (top-3 = correct answer among primary + alternatives) with confidence intervals using the existing benchmark service.
2. **Safety gate check:** from the same sample, count cases where chemical products were offered but the expert verdict was "uncertain" or "corrected" (target: zero).
3. **Product suitability audit:** experts mark recommended products suitable/unsuitable; report the rate.
4. **Offline field test:** a short documented trial in a low-connectivity area (entries made offline, synced count, duplicates found).
5. **Farmer feedback:** attributed farmer feedback rate and agreement with expert verdicts.
6. **Partner evidence:** letters/agreements for KANB and expert involvement (outside the codebase).

## 4. Status

Award readiness is improved on the technical-integrity and responsible-AI dimensions. Outcome claims still depend on items 1–6 above. This release is not yet deployed.

---

## 5. Addendum — data consent (31 October 2026)

| Improvement | Why it matters for Category 5 | Implemented | Verified (tests) | Effectiveness demonstrated |
|---|---|---|---|---|
| Opt-in consent before scan photos are kept for AI improvement; each record stores the consent answer | The submission's claim that data is "appropriately consented" can now be backed by code and records | Yes | Yes (unit tests, plus a manual browser check) | n/a (governance control); the opt-in rate is not yet measured |
| Analysis time recorded per scan (`durationMs`) | Gives Q4 a real response-time measure (median and 95th percentile) from existing records | Yes | Yes | **No** — no live data yet |

Supportable wording once deployed: *"Farmers choose whether their photos are kept to help improve the AI. Photos are kept only with opt-in consent, and each record stores the farmer's answer."* Don't say it complies with the PDPA until a lawyer has reviewed it.

New measures for the next evaluation: the opt-in rate (consented scans ÷ all scans), and median and 95th-percentile `durationMs` over a stated period.
