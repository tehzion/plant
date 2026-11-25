# Responsible Agricultural AI & Safety Framework

**Version:** 1.0 draft · **Date:** 2 November 2026 · **Application:** KANB agricultural intelligence webapp

**Status:** Prepared for review and adoption. This framework sets proposed operating and release requirements; it does not certify safety, diagnostic accuracy, regulatory approval or PDPA compliance. It distinguishes source-visible safeguards from evidence still needed in the deployed service.

## 1. Intended use and limits

Provide agricultural decision support: photo-based crop assessments, cautious plant-care guidance, farm/myGAP record assistance and navigation to KANB services. Support growers’ judgement rather than replace field inspection, qualified agronomic advice, laboratory confirmation or product labels.

Do not use the app as the sole basis for pesticide application, quarantine decisions, certification, insurance/credit eligibility or other consequential decisions. Do not claim a plant is certainly healthy or a disease is laboratory-confirmed from a photograph. No autonomous purchasing, spraying or modification of compliance records is authorised by model output.

## 2. Malaysian governance alignment

Use the seven principles described in Malaysia’s AIGE as the governance reference: fairness; reliability, safety and control; privacy and security; inclusiveness; transparency; accountability; and pursuit of human benefit and happiness. AIGE is guidance; adoption of this framework does not substitute for applicable laws or sector rules. [National AI Office governance guidance](https://www.ai.gov.my/faq/ai-governance-policy/), [Malaysia government AIGE overview](https://www.malaysia.gov.my/en/my-initiative/whole-government-digital-services/tadbir-urus/national-guidelines-on-artificial-intelligence-governance-and-ethics-aige)

Translate those principles into operational evidence: local crop/language coverage, documented abstention, accessible guidance, controlled data reuse, accountable reviewers, clear product-commercial interests and a reversible release process.

## 3. Risk tiers and required responses

| Scenario | Main potential harm | Required response |
|---|---|---|
| App navigation and general husbandry | Confusion or ineffective guidance | Short, supported answers and a clear next step |
| Unclear photo, unfamiliar crop or conflicting evidence | False diagnosis or missed disease | Retake/review state; explain uncertainty; withhold treatment products |
| Treatment advice, severe/spreading symptoms or chemical concerns | Crop injury, residue, environmental or financial harm | Qualified review, label guidance and escalation; no invented dosage/mixing instructions |
| Product recommendation | Inappropriate purchase or biased advice | Verify catalogue/eligibility, show purpose, separate discovery from treatment justification |
| Private account/order/payment requests | Disclosure or false service promises | Staff contact; no invented access or order status |
| Unrelated, adversarial or repeated requests | Misuse, unsafe output or operator cost | Refusal, bounded requests, throttling and monitored abuse handling |

Treat risk classification as a maintained decision record, not a permanent label attached to a feature. Reassess when capabilities, providers, crops, data sources or business incentives change.

## 4. Model-output safety contract

Use explicit output states: assessable/diagnosed with appropriate caution, healthy without certainty, review/uncertain and retake. Output must state limitations and safe next actions. Do not convert a model confidence number into a calibrated probability or a clinical/agronomic assurance.

Uncertainty must reduce authority. Ask for missing evidence or provide safe general checks; when not sure, say so and offer team contact. Retake and review states must suppress treatment-product recommendations. Chemical instructions must defer to current registered labels and qualified advice; do not invent rates, spray intervals or off-label uses.

Generated material is untrusted data. Validate the schema, bounded fields, permissible identifiers and final action eligibility on the server. Keep model output separate from verified farm facts and expert decisions. Preserve enough versioned evidence to reconstruct a material recommendation without retaining unnecessary personal data.

## 5. Chatbot relevance, uncertainty and abuse

Restrict assistance to plant care, farming, myGAP, this application and KANB services. Refuse unrelated entertainment, programming, political/financial speculation and requests to bypass instructions. Private service questions go to staff. Conversation/scan text must not override policy or acquire access to private records.

The current implementation uses pre-inference topic checks, structured response dispositions, fixed uncertainty/contact responses and refusal of known override patterns. It limits the route to5requests/minute per source IP, alongside existing daily quotas, input/token bounds, timeout and cancellation controls. Invalid or unclassified output falls back to uncertainty; inconclusive results do not produce treatment products. Ratings do not upload chat text.

These controls reduce misuse; heuristics and model classification do not prove every jailbreak impossible. Test multilingual, obfuscated, mixed-topic and conversation-pivot cases. Do not silently expand scope to improve answer rates. Review aggregate refusal and escalation outcomes with privacy-preserving evidence. Any exception must be explicitly approved and tested.

## 6. Validation protocol before consequential release

1. Define the supported crops, conditions, languages, capture settings and intended users. Keep unsupported cases visible.
2. Approve data provenance, permissions, label taxonomy and reviewer qualifications. Independently review labels; resolve disagreement without exposing model predictions to initial label reviewers.
3. Group related images by plant/farm/capture session and check exact/perceptual overlap. Separate development from a frozen independent holdout, including prior prompt examples and manual exposure. Tuning on a holdout makes it development data.
4. Freeze source, model/provider, prompt, policy, preprocessing and farmer-input mode. Preserve manifests/checksums and run settings. Record cache use, retries, provider failures and missing outputs.
5. Evaluate the real feature path with documented differences between the runner and browser preprocessing. Use isolated data, dummy identities and approved provider budgets; do not benchmark against production by default.
6. Report numerators/denominators, uncertainty intervals, unsupported/failed/abstained cases and crop/language/field-condition breakdowns. Include confident errors, missed disease, unnecessary treatment and inappropriate product recommendation rates—not only top-choice agreement.
7. Obtain independent domain and technical sign-off against predeclared release thresholds. Thresholds must be approved before the holdout run and justified by harm/coverage trade-offs; this document invents no universal “safe accuracy” percentage.

Public-image agreement is not Malaysian field-validated accuracy. Small samples and shared backgrounds can inflate results. The existing benchmark documentation contains limitations; do not copy obsolete readiness claims without reconciling current evidence. [Repository benchmark protocol](../evaluation/independent-benchmark.md)

## 7. Human oversight and commercial boundaries

The agricultural domain lead approves scope, label standards, escalation rules and treatment boundaries. Privileged reviewers require verified authority and relevant competence; an administrator role alone is insufficient evidence of agronomic expertise. Keep farmer feedback distinct from expert verification.

Explain why a product is shown and whether it is a treatment option or general discovery. Confirm live catalogue and regulatory suitability through an approved process; catalogue availability alone does not prove appropriateness or Malaysian registration. Offer a non-commercial next step. Never suppress uncertainty to increase sales.

## 8. Release gates and rollback

A release owner maintains one evidence pack containing:

- Intended-use and risk assessment, data/model cards and provider settings.
- Approved provenance/consent, split manifests, independent labels and reproducible evaluation results.
- Safety/abuse tests, uncertainty and product-suppression checks, privacy/owner-isolation checks and accessibility/language review.
- Named technical, domain and privacy approvers; unresolved issues and justified exclusions.
- Staged rollout plan, monitoring limits, incident contacts and tested feature-disable/rollback procedure.

Do not release a high-consequence feature while required evidence, isolation, rights handling or rollback is unresolved. If a threshold is missing, an approval is absent or a critical safeguard fails, mark the feature not ready. A deployment succeeding or a unit-test suite passing does not establish real-world safety.

Roll out in a controlled sequence: offline validation, restricted supervised pilot, bounded deployment and broader availability only after review. A model/provider/prompt/policy change requires a documented impact assessment and proportionate regression evaluation before promotion.

## 9. Monitoring, incidents and retirement

Monitor aggregate failure/abstention, harmful/confident-error reports, crop/language coverage, escalation usefulness, abuse, costs, latency and safeguard failures. Set reviewer-approved alert thresholds and ownership before launch; do not collect unrestricted conversations simply to obtain metrics.

On suspected harm: limit or disable the affected feature, preserve minimum evidence, route urgent agricultural concerns to qualified support and record the affected version/scope. Assess any personal-data breach separately under the PDPA procedure. Investigate root cause, correct data/policy/model issues, independently retest and obtain approval before re-enabling. Do not erase inconvenient failures from the evaluation record.

For retirement, stop new processing, revoke unnecessary provider access, notify affected users where appropriate, retain only justified evidence and dispose of data/copies under the approved schedule.

## 10. Accountability and review

The executive sponsor accepts organisational risk; the release owner coordinates evidence; engineering/security maintains technical controls; the privacy lead oversees data use; qualified domain reviewers assess agronomic safety; the evaluation owner protects independence. Name actual people and deputies before adoption.

Review this framework at least quarterly as an internal proposal and after material changes or incidents. Record decisions, unresolved gaps and the next review date. Source-level privacy/chat improvements are implemented separately; formal organisational adoption, deployed verification, contracts, local field validation and legal review remain evidence to obtain.

## Companion documents

- [Agricultural Intelligence Data Strategy](agricultural-intelligence-data-strategy.md)
- [PDPA data-handling implementation and operating procedures](../handoff/pdpa-data-handling-and-chatbot.md)
