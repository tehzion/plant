> Historical draft recovered from commit 9f442c7. Not a statement of current deployment or demonstrated outcomes. Verify every claim and complete all placeholders before submission.

# AI Agropreneur — executive summary

Evidence convention: paths are repository-relative and line numbers refer to commit `d6fa0099539de3c826752942999215c3f8ecfaae` (worktree clean at inspection). **Implemented** means source present, not verified live. “Unable to verify” covers configuration, deployment, user data and real-world performance. No production queries, paid API calls, migrations, builds or tests were run. This is a static, bounded review; it is not an exhaustive independently verified security audit. No prior security audit ledger was available.

The repository contains a substantial agricultural decision-support application: a photo-based plant assessment pipeline, farm records, product matching, account management, multilingual interfaces and PWA infrastructure. Source code demonstrates implementation, not a verified production service or proven agronomic accuracy. The combination is a credible award story if supported by a real pilot, documented expert participation and measured outcomes.

A potentially serious data-isolation problem exists in the database upsert code: a known record ID may permit a signed-in user to change and receive another user's record. Verify this promptly in a controlled test and remediate before wider use. AI recommendations and product matches are also not evidence of registered, crop-compatible chemical use; expert and label verification are essential. Offline support is partial: a previously cached app and some guest local records may be available, but AI needs connectivity, authenticated saves can fail offline, and complete automatic reconciliation has not been established.

The owner reports KANB collaboration and agricultural expert participation. The code includes KANB branding and expert benchmarking infrastructure, but it does not establish contractual terms, actual reviews, savings, farmer adoption or automatic model learning. The myGAP tools support self-assessment and recordkeeping; they do not establish official certification.

For the award, prioritise isolation and safety fixes, a documented independent evaluation, credible adoption and outcome metrics, and letters or records confirming partner and expert involvement. At present the submission is **technically promising but evidence-incomplete**.
