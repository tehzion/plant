# Logged-in theme consistency

Reviewed and refined with Impeccable polish on 2 November 2026 (Asia/Kuala_Lumpur). No new numeric design score assigned.

The authenticated branch of Login reused the mint sign-in canvas and a 680px wrapper. That visually isolated My Farm from the newer warm-neutral page system. The compact avatar referenced an undefined gradient token, and the dashboard retained its earlier icon shelf, small form text and multicolor activity palette.

Changes: separate authenticated workspace using the shared canvas and a 1200px desktop shell; compact labelled navigation with pressed state and responsive wrapping; green avatar; green/earth activity colors; readable form and body text; coherent Reports, Daily Log and Shop headings; missing EN/BM/ZH dashboard labels and shorter Malay navigation wording. Authentication and farming data behavior remain unchanged.

Verification: 649 tests across 129 files passed. Final focused Login/dashboard/Overview/Reports checks: 13 tests passed. Production build and strict translation checks passed. Targeted ESLint zero errors (25 existing warnings); one Impeccable source scan of five JSX targets returned `[]`. Diff whitespace check passed.

Native browser used the app's demo-auth path at 1280px desktop and 375px mobile, including Overview, Reports, Plots, Daily Log/Scout and Shop. Reports, Plots, Scout form and Shop host measured scrollWidth equal to 375px; Scout input fonts measured 16px, report selector 16px and 48px high. Final Malay navigation had no horizontal overflow and all navigation buttons at least 48px tall. Switching tabs, opening Scout and cancelling worked without saving a record.

Shop's product catalogue is an iframe served by the separate KANB store. Its internal theme belongs to that website and cannot inherit this app's CSS across origins. Only its app-owned container/headings were refined. No external store settings were changed, purchases made or live diagnosis requests sent. Real-account sign-in and full spoken screen-reader testing were not performed in this pass.

Preview fixture removed, original language/demo flags restored, viewport override reset, test tab closed and preview server stopped. Existing records and unrelated original-checkout files were preserved.
