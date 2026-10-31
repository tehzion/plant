> Historical draft recovered from commit 9f442c7. Not a statement of current deployment or demonstrated outcomes. Verify every claim and complete all placeholders before submission.

# AI Agropreneur — feature inventory

Evidence convention: paths are repository-relative and line numbers refer to commit `d6fa0099539de3c826752942999215c3f8ecfaae` (worktree clean at inspection). **Implemented** means source present, not verified live. “Unable to verify” covers configuration, deployment, user data and real-world performance. No production queries, paid API calls, migrations, builds or tests were run. This is a static, bounded review; it is not an exhaustive independently verified security audit. No prior security audit ledger was available.

Status key: **IT** = implemented in source, runtime not verified; **P** = partial; **U** = unable to verify. Common limitations for all rows: configuration, deployed schema, permissions, live service behavior and usability have not been tested. Table names below refer to the Neon schema.

| Feature / user / workflow | Implementation, AI, data and integrations | Status and limitations / recommendation |
|---|---|---|
| Onboarding, new user: read three screens and finish | `src/pages/Onboarding.jsx:13-39`; informational UI; no AI | IT; not a mandatory registration/farm setup wizard; test completion and simplify transition |
| Account, farmer: register, sign in, password reset, Google | Supabase auth `src/context/AuthContext.jsx:125-181,208`; profile table | IT; provider setup and delivery unverified; test recovery and account lifecycle |
| Farm profile and plots, farmer: enter crop, area, soil values | `src/utils/localStorage.js:743-781`; profiles/plots, Neon API | IT; no proof data is representative or validated; improve field validation |
| Image scan, farmer: camera/gallery, submit and view result | `src/components/CameraUpload.jsx:243-307`, `src/hooks/useScanLogic.js:100-170`; PlantNet/OpenAI; scan_history and private images | IT; network, model and keys required; independently benchmark and test poor images |
| Health, disease, nutrient and severity | `server/services/aiService.js:2236-2488`; structured model response, policy `shared/scanResultPolicy.js:106-140` | IT; inference and confidence are unvalidated; expert review and field labels needed |
| Result, treatment and localisation | `src/pages/Results.jsx`, `src/components/TabbedResults.jsx`, `server/index.js:643-659`; AI-generated guidance | IT; advice is not verified chemical label guidance; preserve uncertainty and validate recommendations |
| History and follow-up | `src/pages/History.jsx`, `server/services/followUpService.js`, `scan_history`, `scan_followup_events` | IT; cross-device and offline behavior unverified; test version and conflict handling |
| Feedback | `src/components/FeedbackWidget.jsx`, `server/index.js:445-479`, `diagnosis_feedback` | IT; feedback is not expert ground truth and no automatic model learning established |
| Expert labels and benchmark | `diagnosis_expert_labels` schema; `server/services/expertBenchmarkService.js:17-104` and benchmark script | P; no in-app label-writing/review-and-correction path found; establish controlled review workflow |
| Admin review analytics and order recovery | `src/pages/AdminReviewDashboard.jsx`, `server/services/adminAnalyticsService.js:131-175`, `server/index.js:916-973` | IT; admin allowlist, analytics rather than demonstrated expert diagnosis approval; verify access and review practice |
| Product recommendations, farmer: view matching products or consult | WooCommerce taxonomy/product search `server/index.js:661-806`; rules, product_events, consultation_leads | IT; heuristic relevance is not regulatory suitability; validate labels and ranking with experts |
| Shop/order and recovery | `server/index.js:831-973`, `src/components/OrderHistory.jsx`, WooCommerce; order_refs and recovery requests | IT; checkout, fulfillment, pricing and authorization in deployed environment unverified |
| myGAP guide, checklist, logbook, PHI calculator and PDF | `src/pages/MyGap.jsx:20-108,107-318,522-550`; mygap_logs/checklist; local data and cloud | P; self-assessment and free text, not official certification; improve structured records and validate against current official requirements |
| Farm activity: chemical, harvest, scouting, costs and other notes | `neon/migrations/0001_plant_app.sql:50-78`; dashboard components, daily_notes/plots | IT; completeness and traceability depend on entry; test required fields and report integrity |
| Reports, charts and PDF | `server/services/reportService.js:68-110`, `src/utils/pdfGenerator.js`, `src/pages/MyGap.jsx:107-318`; scans and notes | IT; totals use entered values and bounded fetch; check truncation and reconcile to source |
| AI farm advisor, insights, SOP, natural-language log and prediction | `src/utils/aiFarmService.js:18,54,84,116,151`, `server/index.js:975-1062`; OpenAI | IT; recommendations and predictions not field validated; communicate uncertainty |
| Encyclopedia and nutrition pages | `src/pages/Encyclopedia.jsx`, `src/data/encyclopediaData.js`, `src/pages/Nutrition.jsx` | IT; content coverage, freshness and agronomic review unverified; assign content owner |
| Weather and location | browser geolocation `src/hooks/useLocation.js:14-21`; Open-Meteo with six-hour local cache `src/hooks/useWeather.js:4-5,111-181` | IT; permission/network dependent, cached data can age; show timestamp |
| PWA, local data, sync | manifest, `vite.config.js:72-118`, `src/utils/syncQueue.js`, `src/utils/indexedDbStorage.js` | P; prior cache and storage availability matter; authenticated direct writes can fail offline and guest queue is separate |
| Languages, navigation, guide and legal pages | `src/i18n/i18n.jsx:26-42`, `src/components/LanguageSelector.jsx:30-33`, `src/AppRoot.jsx:38-54` | IT; English, Malay and Chinese options, fallback English; translations and accessibility not independently tested |
| Partner branding and links | `src/components/AppHeader.jsx:85-88`, `src/components/BottomNav.jsx:60`, partner assets | IT; branding is not proof of a contract or partner operations |
