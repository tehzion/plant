# PDPA data handling and chatbot controls

Date: 2 November 2026. Baseline: `3205091`, PR26 branch `fix/plant-check-critique`.

## Status

These are application improvements, not certification of Malaysian PDPA compliance. The separate security re-audit is read-only and baseline-specific. It has four independently reviewed needs-validation leads, no runtime-confirmed vulnerabilities and four explicitly deferred coverage units. Its private artifacts are outside Git in the Codex visualization directory. Do not publish that report or present this implementation's ordinary development tests as reproduction of the baseline security leads.

Privacy contact approved by the user: **privacy@infinitas.com.my**. General farming/order help retains the existing KANB support/WhatsApp contact; it is not redirected to the privacy mailbox. No emails or messages were sent by this task.

## Application changes

- `/privacy-controls`, available through the footer and login notice, offers current-actor choices, app-record download, clear-device controls and written-request email drafts. Drafts are not submitted by opening the link. Account deletion, complete access and direct-controller portability are reviewed requests, not falsely advertised instant actions.
- AI-improvement photo consent is explicitly versioned and account/guest scoped. Unidentified legacy opt-ins are not inherited. Blocked-storage choices are scoped to the current actor in memory. Core inference, personal history and optional improvement retention are explained separately. The secondary model trial now requires the current consent version too.
- Product-click analytics is off by default, has a separate choice and is checked both before client disclosure and before server insertion. It still includes identifiers/diagnosis context when expressly enabled; it is not described as anonymous. The submission uses a checked session snapshot to avoid attributing one actor's opt-in to the next account.
- Chat, field answers, personal log defaults, harvest reminders and weather caches use owner-specific storage. Session-bound children remount on account changes; assistant context is cleared. Unknown legacy auxiliary stores are removed, without deleting the legacy main farm-record stores.
- Signing in no longer silently migrates guest data into an account. Authenticated offline queues still flush for their own account. The existing migration utility remains available internally but is no longer called automatically; users can request help confirming and importing their own device records.
- Export includes all pages of the six main account collections, current-actor local records/photos/drafts/queued operations, local cache snapshots and preferences. It checks account transitions and refuses oversized exports rather than silently truncating them. Authentication, commerce, review/audit/feedback/analytics and provider backup records are explicitly excluded and covered by the full-access request process. An app-record download is not fulfilment of section43A direct-controller portability.
- Device clearing deletes only the selected actor's IndexedDB copies and preferences, including pending operations and capture drafts. The UI requires acknowledgment that unsynced work will be lost. It does not delete cloud records, close the account, revoke the login or erase another account's records. Signing in/reading cloud records can create new local copies after clearing.
- Assistant feedback sends/retains ratings and short technical context, not question/answer text. Existing older feedback falls under scheduled cleanup. Chat messages still go to the inference provider when a relevant request needs inference; the UI says so.
- Precise geolocation is no longer requested automatically at dashboard load. An explicit location choice explains the weather/geocoding recipients, uses lower-accuracy acquisition and rounds coordinates to2decimal places before storage/requests. Server weather requests also use rounded coordinates and the model receives area weather without raw coordinates.
- Raw question, parse-log and scan-location console excerpts are removed. Audit metadata no longer separately copies location; a diagnosis result or free-text record may still contain personal data. Farm harvest AI summaries no longer include buyer identity. Necessary free text remains personal data and must be covered in processor arrangements.
- Error telemetry drops request/user data, breadcrumbs, extra/context/tag fields and exception messages/local variables; sanitized stack positions remain. Server tracing is disabled. This reduces application-origin data; provider logs and third-party SDK settings must still be verified.
- Existing daily audit cleanup now includes assistant feedback. Diagnosis audit and feedback cleanup still defaults to90days. Financial/farm account records, consultation leads, analytics, operational logs, exports and backups are not automatically assigned invented legal retention periods by this change.
- Privacy notice is available in Bahasa Malaysia and English, names the actual source-configured processor categories, separates mandatory/optional fields and consequences, explains data sources, rights, withdrawals, transfers, copies and retention limits. It uses a privacy-team contact rather than claiming a DPO appointment. Terms no longer treat app use as optional training consent. Collection notices appear at account creation, photo-consent choice and chat input.

## Chatbot boundary and abuse controls

Allowed: crop/plant care, agriculture, myGAP records, using the KANB app and KANB services. General entertainment, programming, homework, politics, financial speculation and unrelated requests are refused. Private order/account/payment/partnership queries receive a fixed contact response without inference. Known instruction-override patterns are refused even when combined with a farming keyword. A short follow-up needs relevant user/scan context.

Relevant requests still require the model to declare `in_scope`, `uncertain`, `contact` or `out_of_scope`. Missing/invalid JSON, missing disposition, empty/oversized answers and uncertain responses fail closed to fixed uncertainty/contact guidance, without products. Existing inconclusive-scan/product and dosage controls remain. Role/content fields are untrusted; the assistant has no private-account tools or authority to promise order status.

The route permits5requests/minute per source IP, in addition to existing identity/IP/server daily quotas, input limits, token cap, timeout, cancellation and concurrency limits. The free plant-scan allowance remains10per Malaysia calendar day. Topic heuristics are deliberately conservative and may reject some legitimate phrasing; they are not a proof that every possible jailbreak or abuse pattern is impossible. Monitor aggregate refusal/helpfulness rates without storing raw conversations; expand multilingual cases with dummy prompts before changing policy.

## Operator requirements before claiming readiness

1. Confirm the controller's full legal name/registration/contact address, authority to publish this notice and mailbox ownership. Assign trained staff with cover for leave and escalation. Do not claim a registered DPO unless appointment/registration is evidenced.
2. Assess controller registration and DPO applicability under current JPDP guidance. The DPO criteria include personal data exceeding20000subjects, sensitive/financial data exceeding10000subjects, or regular/systematic monitoring. Low headcount alone is not an exemption from the monitoring criterion.
3. Complete a processor/transfer register for the actual deployment, not every optional source dependency. Record contracts, security duties, purpose limitations, model training/data-retention settings, subprocessors, countries, transfer basis under section129 and evidence/review dates. No provider settings/contracts were changed or verified here.
4. Approve category-specific retention and legal holds. Verify the Render cron is actually attached/running,90day policy is appropriate, deletion failures alert an owner and object/row cleanup completes. The cloud cleanup script is not a local-JSONL/export/backup cleanup engine. Inventory local operator exports and evaluation datasets; give them named owners, expiry and access controls. Document and test backup expiry and post-restore reapplication of withdrawals/deletions.
5. Resolve the baseline security validation leads before making a security/compliance claim. In particular, do not advertise automatic photo withdrawal through the existing capability endpoint as a verified rights-fulfilment mechanism. This UI uses a written request instead. The separate PDPA owner-scoping changes address the shared-device hypothesis but do not retroactively change the audit verdict or validate the new implementation in production.
6. Confirm notice/choice is presented before every relevant new collection or different purpose, including consultations, external store checkout and use of other people's operator/buyer details. Reassess when adding a new provider or purpose; don't silently broaden an old opt-in.
7. Perform a complete local fixture and deployment-configuration acceptance check with synthetic users: account transitions, offline queue clearing, full-copy access response, prior-photo withdrawal across active/exported/backup copies and response deadlines. Production privacy requests need actual staff action, not just a page.

## Request-handling procedure — owner must operate it

- Record receipt time, case ID, request category/scope, subject locator, assigned officer, identity-verification method, due date and every action. Restrict the case register; do not put passwords, bearer tokens or unnecessary MyKad scans in email or logs. Confirm receipt and explain a secure, proportionate verification path.
- Treat access/correction clocks according to sections31/35: normally21days, and explain any permitted extension before that period ends while supplying what can already be supplied; a permitted further14days is not an automatic blanket extension. Record refusal grounds/reasons and escalation. Do not silently restart clocks.
- Complete access searches across verified account data, Supabase Auth/storage, Neon farm records, follow-ups/revisions/reviews, consent/audit/feedback, product analytics/consultation leads, WooCommerce/order recovery references, logs, current-actor device copies where available, exports and processors. Mask other people's data appropriately. Never send a service-role database dump to a subject. The convenience export deliberately does not cover all of this.
- Correction must propagate to relevant downstream copies/recipients where required, while retaining necessary attributable record history rather than silently rewriting regulated records.
- Written withdrawal: stop future consent-based processing promptly, identify active photos/records by verified ownership, remove them from active improvement/export selection and notify dataset custodians/processors. Record deletion/withdrawal evidence and any limited lawful exception. Already trained models, anonymous aggregate statistics and backups require an explicit, evidence-based response; do not promise to “untrain” a model or relabel identifiable data anonymous.
- Account closure/deletion: identify any lawful retention/record-integrity duties, explain what will be retained, restrict further use and execute approved deletion across providers/storage/queues/caches/exports. Close/revoke authentication only in a controlled sequence. Merely deleting an account row does not remove all data.
- Portability: verify the subject and chosen receiving controller/channel, technical feasibility/format compatibility and permitted scope; securely transmit directly where applicable. Do not confuse a browser JSON download with this process.

## Incident response — owner must exercise it

Assign an incident lead and privacy/legal escalation. Record awareness time, facts, scope, affected subjects/records, likely harm, containment, evidence and processor notifications. Revoke compromised access and preserve minimum necessary evidence. Assess section12B notification without delay using the current JPDP Data Breach Notification guideline and official form, including the regulator's72hour requirement where applicable; retain submission acknowledgment and a documented explanation of any delay. Check affected-person notification requirements and the current prescribed timing directly against the guideline. Do not postpone escalation while waiting for perfect forensics. No actual incident or breach was established by the source audit.

## Processor/data register to complete

| Source-configured service | Data/purpose | Evidence still needed |
|---|---|---|
| Supabase | Auth sessions/accounts; private user/improvement photos | Active project/region, policies, access logs, deletion/backups, processor terms |
| Neon | App/farm/audit/feedback/analytics/review records | Active branch/region, role privileges, retention/backups, processor terms |
| OpenAI or OpenRouter + selected model providers | Invoked image/text inference; opt-in secondary checks | Active route/provider/model, retention/training settings, onward processors, country/transfer basis |
| Optional PlantNet | Identification image | Whether enabled, request scope, retention and terms |
| WooCommerce/KANB store | Catalogue, billing/shipping/orders/recovery | Controller roles, payment processors, statutory retention, recipients and deletion process |
| Render or Vercel | Hosting, request logs, scheduled cleanup | Actual host/region/branch, access, log retention, cron execution, terms |
| Optional Sentry | Minimized error diagnostics | Whether enabled, sampled dummy event, region, retention, subprocessors/terms |
| Open-Meteo and Nominatim/OpenStreetMap | Rounded weather/locality coordinates after choice | Whether enabled, coordinate precision, logs/terms/transfer assessment |
| User-selected email/WhatsApp | Explicit support/privacy conversations | Mailbox access, response register, retention and secure verification procedures |

## Validation

Implementation tests use mocks/dummy data and do not alter the baseline audit verdict. Validation passed:697tests across139files,44targeted privacy/chat tests, production build, ESLint (0errors,76existing warnings) and strict translation checks. Three pre-existing duplicate translation keys were removed while preserving each language's effective last value, allowing ESLint to complete without errors. Existing lint/build warnings remain. No production migration, deployment, email, legal registration or vendor-setting change was performed.

## Primary references checked

- [JPDP notice guidance](https://www.pdp.gov.my/en/akta/guidance-on-the-preparation-of-personal-data-protection-notices/)
- [Act709 text](https://www.pdp.gov.my/wp-content/uploads/2024/07/UNDANG-UNDANG-MALAYSIA_AKTA_PERLINDUNGAN_DATA_PERIBADI_2010_709_MALAY_AND-ENG_V2022.pdf)
- [Amendment ActA1727: processor security, DPO, breach, portability and transfer provisions](https://www.pdp.gov.my/wp-content/uploads/2024/11/Act-A1727.pdf)
- [JPDP current FAQ/DPO criteria](https://www.pdp.gov.my/en/faq/)
- [JPDP cross-border transfer guidance](https://www.pdp.gov.my/en/akta/personal-data-protection-guidelines-on-cross-border-transfer-of-personal-data-cbpdt/)
- [JPDP breach guidance](https://www.pdp.gov.my/en/akta/personal-data-protection-guidelines-on-data-breach-notification-dbn/)

Legal/operations owner must verify current applicability and the actual deployment evidence. No live account, provider contract, production migration or registration was inspected or changed.
