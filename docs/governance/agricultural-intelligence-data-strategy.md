# Agricultural Intelligence Data Strategy

**Version:** 1.0 draft · **Date:** 2 November 2026 · **Application:** KANB agricultural intelligence webapp

**Status:** Prepared for organisational review and adoption. This document proposes governance and operating requirements. It is not evidence of board approval, legal compliance, deployed controls, data rights clearance or model accuracy. Privacy contact: **privacy@infinitas.com.my**. The controller’s legal identity, responsible officers and formal approvals must be recorded before adoption.

## 1. Purpose and scope

Use agricultural data to improve practical support for Malaysian growers while protecting personal information, preserving farm-record integrity and producing defensible evidence about AI performance. Cover collection, inference, personal records, offline storage, expert review, optional improvement datasets, commerce, telemetry, exports, backups and retirement. Treat farm data as potentially personal or commercially sensitive even when it contains no farmer name.

Priorities are useful farm records, trustworthy crop assessments, transparent data choices and research that respects provenance. Collecting more data is not itself a success measure. This strategy does not authorise sale, unrelated marketing, unrestricted secondary research or publication of identifiable farm data.

## 2. Data domains and classification

| Domain | Examples | Classification and permitted purpose |
|---|---|---|
| Identity and service access | Account email, provider identity, sessions | Restricted personal data; authentication and rights verification |
| Farm operations | Plots, activity logs, operators, buyers, suppliers, harvest records | Confidential; farmer-requested records and approved advice |
| Diagnostic evidence | Plant photos, symptoms, assessment, context | Confidential and potentially personal; requested diagnosis/history |
| Improvement research | Explicitly consented photos and approved labels | Restricted research data; purpose-bound evaluation/improvement |
| Commerce and support | Orders, contact details, consultations | Restricted personal/business data; requested fulfilment/support |
| Operational evidence | Minimal errors, ratings, request and usage records | Confidential; security, reliability and approved measurement |
| Published knowledge | Approved agronomic material and aggregate reports | Public only after editorial, rights and disclosure review |

Classification follows content and linkage, not the table name. Pseudonymous identifiers and approximate farm coordinates remain protected when linkable to a person. Do not label a dataset anonymous without a documented re-identification assessment.

## 3. Collection and permitted use

Every collection must have a named purpose, responsible owner, minimum fields, recipient list and retention rule. Separate feature-required processing from optional improvement-photo sharing and optional analytics. Present understandable notice before collection; retain the notice/choice version and collection timestamp. Renew choices when purposes materially change. Never treat account creation or acceptance of terms as optional research consent.

Use approximate location where sufficient. Avoid identities in plant photos and free text; remove unnecessary image metadata and incidental personal content through a documented preparation process before research use. Do not silently upload shared-device guest records to an account. Classify any proposed new collection as necessary, optional or prohibited before implementation.

## 4. Lifecycle and architecture

Maintain one inventory of authoritative stores and derived copies: Supabase authentication/private storage, Neon records, configured inference providers, commerce, browser records/photos/drafts/queues, operational logs, research exports and provider backups. Record which services are actually enabled; optional source dependencies are not proof of an active processor.

Account-bound records, auxiliary preferences and queues must retain owner scope through reads, writes, retries, account changes and exports. Server identity and resource ownership must be authoritative. Keep research copies separate from operational records and preserve linkage sufficient for controlled withdrawal without exposing account identifiers to researchers.

Document processor contracts, regions, subprocessors, training/retention settings, permitted onward uses and transfer safeguards. A provider label or a public privacy policy is not proof that the deployed configuration meets the organisation’s obligations. Assess international transfers against applicable section129 requirements before use. [JPDP transfer guidance](https://www.pdp.gov.my/en/akta/personal-data-protection-guidelines-on-cross-border-transfer-of-personal-data-cbpdt/)

## 5. Quality, interoperability and provenance

Assign stable record/image identifiers, timestamps, original labels, crop/condition taxonomy, capture context and source lineage. Preserve original observations separately from model outputs and expert corrections. Record units explicitly: area, yield, quantity, currency and application timing must not rely on ambiguous free text.

For research, record source release, image checksum, permission/licence evidence, relevant consent, preprocessing, label author/reviewer and known limitations. Check exact and perceptual duplicates, connected plants/farms/capture sessions and prior model-development exposure before selecting independent evaluation data. Quarantine unresolved rights, ownership or label disputes. A dataset licence does not establish every image’s provenance; an asserted expert role does not establish qualification.

Use versioned schemas and approved crop/disease mappings. Exports should state included/excluded domains and preserve correction history; they must not become unrestricted database dumps. Prefer structured, documented formats and separate original-language text from approved translations.

## 6. Retention, rights and controlled reuse

Approve a category-specific schedule with purpose, retention trigger, duration, legal holds, disposal method and evidence. The application’s diagnosis/feedback cleanup defaults to90days; this is an implementation setting, not a universal statutory period or proof the job ran. Account records, commerce, research exports, analytics and backups need separately approved rules.

Maintain a monitored request register for access, correction, withdrawal, processing restrictions, account closure/deletion review and portability. Verify identity proportionately; search all relevant copies and processors. Track statutory deadlines and permitted extensions, explain refusals/retention and secure the response channel. The app-record download is a convenience export, not a complete access response or direct-controller portability transfer.

Withdrawals must prevent further optional use and reach active datasets, exports and processor copies. Record exceptions and backup handling; reapply restrictions after restoration. Do not promise model “untraining” or complete deletion without technical evidence. Do not destroy necessary audit history while correcting an operational record.

## 7. Accountability and measures

| Accountable role to appoint | Required decision/evidence |
|---|---|
| Executive sponsor | Adopt strategy, fund controls and accept documented residual risks |
| Privacy lead; DPO where applicable | Legal applicability, notices, rights, transfers, incidents and retention |
| Data steward | Inventory, schemas, quality, provenance and dataset permissions |
| Engineering/security owner | Owner isolation, recovery, access, monitoring and deletion evidence |
| Agricultural domain lead | Label standards, expert qualification and local-context suitability |
| Research/evaluation owner | Independent splits, reproducible runs and honest performance reporting |

A developer must not self-approve every role. Evaluate DPO and controller-registration requirements against current facts and guidance; do not assume appointment or exemption. [JPDP legislation and guidance](https://www.pdp.gov.my/en/akta/pdp-act-2010-en/)

Proposed measures: percentage of inventoried copies with owners/retention; research records with verified rights and traceable choice; unresolved data-quality exceptions; overdue rights requests; deletion failures; recovery drills; and evaluation coverage by crop, language and field condition. Define baselines before setting improvement targets. Never replace safety outcomes with scan volume or product-click growth.

## 8. Adoption plan and acceptance

**First30days, proposed:** appoint owners, approve legal identity/contact, complete the inventory/processor register, assess transfers and prioritise unresolved security validation leads.

**Days31–60, proposed:** approve retention, exercise access/withdrawal/restore using synthetic subjects, verify deployed isolation and establish a controlled research intake and expert-label process.

**Days61–90, proposed:** freeze an independent evaluation protocol, report evidence and gaps, conduct an incident exercise and review readiness with the responsible owners.

Adoption requires named approvers, an approved inventory/schedule, exercised rights and recovery procedures, documented processor/transfer decisions and a funded review cadence. Record approval date, next review and exceptions. These activities are proposed, not completed by writing this document.

## Related operational documents

- [Responsible Agricultural AI & Safety Framework](responsible-agricultural-ai-and-safety-framework.md)
- [PDPA implementation and operational handoff](../handoff/pdpa-data-handling-and-chatbot.md)
- [Independent benchmark and expert-review workflow](../evaluation/independent-benchmark.md)
