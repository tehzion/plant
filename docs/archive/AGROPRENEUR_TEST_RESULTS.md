# AI Agropreneur — Test Results

**Date:** 31 October 2026  **Runner:** Vitest 4.1.2 (`npx vitest run`), Node, jsdom
**Providers:** all external services mocked. **No paid AI call, no production data, no live database was used.**

## 1. Overall

| Run | Test files | Tests | Result |
|---|---|---|---|
| Baseline (before changes) | 67 | 267 | 267 passed |
| After implementation | 75 | 340 | **340 passed, 0 failed** |
| Translation check (`node scripts/check-translations.mjs --strict`) | — | — | Keys aligned across en / ms / zh |
| Production build (`vite build`, to a scratch directory) | — | — | Succeeded; PWA precache 107 entries (3.5 MiB), none skipped |

Net: +8 test files, +73 tests. All 267 pre-existing tests still pass; four existing tests were updated because they encoded behaviour that this work intentionally changed (listed in §4).

## 2. Required regression areas

| # | Requirement | Tests | Result |
|---|---|---|---|
| 1 | AI response schema validation | `server/services/diseaseAssessment.test.js` — valid schema; malformed schema flags duplicate alternatives, missing comparisons, products eligible at low confidence | Pass |
| 2 | Similar disease comparison | same file — primary + alternatives with supporting/weakening/distinguishing evidence; no padding; duplicates, generic and unexplained entries dropped; max 3; alternative never more confident than primary; UI cards in `DiseaseResultSections.test.jsx` (structured and legacy) | Pass |
| 3 | Low-confidence handling | same file — model "high" claim capped by numeric estimate; expert review flagged; info needed and follow-up questions added (incl. Malay); treatments withheld; retake → no primary condition; uncertain species flagged | Pass |
| 4 | PlantNet failure fallback | `server/index.test.js` — PlantNet returns nothing → GPT-Vision fallback used, analysis continues, `identificationSource: 'GPT-Vision'` | Pass |
| 5 | AI API failure | `server/index.test.js` — provider 500 → 503 `AI_PROVIDER_UNAVAILABLE` (not a timeout), nothing logged; invalid output → 502 `AI_RESPONSE_INVALID`. `diseaseAssessment.test.js` — malformed reply repaired with exactly one extra call; stops at 2 attempts; usable reply not retried; provider error not retried | Pass |
| 6 | Product recommendation eligibility | `server/services/productEligibility.test.js` (10 tests: purpose, crop, restriction, label info, curated-rule exception, pest, fertiliser, partition, localised reasons); `server/index.test.js` — route splits eligible / discovery / excluded and never returns a herbicide | Pass |
| 7 | Cross-user access prevention | `server/services/neonDataService.test.js` (9 tests) against an in-memory emulation of the Neon tables with two isolated test accounts: upsert over another farmer's row refused and row unchanged; no row leaked; own upsert works; client `user_id` ignored; plain-insert collision → 409; whole bulk batch rejected before any write; profiles scoped; payload validation. `server/utils/dataCollector.test.js` — audit record of another identity not overwritten, no photo uploaded | Pass |
| 8 | Feedback attribution | `server/index.test.js` — hashed identity on audit record; valid token accepted and attributed server-side; anonymous, cross-scan replay and forged tokens rejected (403). `FeedbackWidget.test.jsx` — token sent. `dataCollector.test.js` — attribution stored | Pass |
| 9 | Offline queue persistence | `src/utils/offlineSync.test.js` — signed-in myGAP entry kept and queued offline without client owner ID; queue survives a module reload (app restart); offline checklist queued and preferred; offline reads merge pending with cached copy; non-network rejection not queued | Pass |
| 10 | Duplicate synchronisation | `offlineSync.test.js` — repeated saves collapse to one op; duplicate replay acknowledged and local copy removed; concurrent flushes send once; interrupted flush recovers without losing work or burning attempts; conflicts/failures kept and retryable. `server/services/syncService.test.js` — create uses `DO NOTHING`; replay → duplicate; foreign ID → conflict; older checklist cannot overwrite newer; myGAP fields folded into notes if migration missing | Pass |
| 11 | Expert review authorisation | `server/services/expertReviewService.test.js` — reviewers/admins allowed; farmers 403; unauthenticated 401; closed when unconfigured; review is a new attributed insert with no UPDATE/DELETE; validation; unknown case 404; farmer feedback labelled separately with submitter hash hidden. `ExpertReviewPanel.test.jsx` — correction + product verdict submitted; server refusal shown | Pass |
| 12 | Existing core workflows | All pre-existing suites: scan logic, results, history, nutrition, PDF, myGAP utilities, orders, product recommendations, localisation, admin dashboard, migrations, onboarding components | Pass |

Additional: offline scan guard (`useScanLogic.test.js`), sync banner states (`SyncStatusBanner.test.jsx`), dosage/interval redaction in English and Malay, stored-result localisation rebuilds the structured comparison.

## 3. Failed tests

None in the final run.

During development, new tests caught two real UI defects which were fixed before the final run:
- The confidence chip showed the raw value (`low`) when no translation was loaded → English fallback labels added.
- The expert panel cleared its "Review saved" confirmation when reloading the case → fixed.

## 4. Existing tests changed (intentional behaviour changes)

| Test | Why |
|---|---|
| `server/utils/dataCollector.test.js` | Audit images now use an owner prefix and the write carries an owner predicate. |
| `server/index.test.js` (product grouping) | A bare `{ name: 'Fungicide' }` fixture no longer qualifies as a verified treatment; fixtures now include label text, and the test asserts the discovery split. |
| `src/components/FeedbackWidget.test.jsx` | Asserts the feedback token is sent. |
| `src/pages/AdminReviewDashboard.test.jsx`, `src/test/setup.js` | Mock the new expert-review API and two new icons. |

## 5. Tests not executed

| Area | Reason / proposed test |
|---|---|
| Real OpenAI / PlantNet calls | Not authorised to incur cost. **Proposed (needs approval):** 20–30 consented, expert-labelled photos across 4–5 crops, run once through a staging server, comparing structured output and alternative quality; estimated cost ≈ 2–4 multimodal calls per image. |
| Live Neon / Postgres | Ownership SQL was exercised against an in-memory emulation and SQL-text assertions, not a real Postgres. **Proposed:** apply 0001 + 0002 to a Neon branch and repeat the two-account tests over HTTP. |
| Migration 0002 | Written and reviewed, **not applied** to any database. |
| Real WooCommerce catalogue | Eligibility rules tested with fixtures only; real listings may lack crop/label text, which will push more items into discovery. |
| Real devices, real offline/PWA | No browser/device test of service-worker caching, airplane-mode saving, or reconnection. IndexedDB was mocked in unit tests (no fake-IndexedDB package installed). |
| Supabase Auth / Storage | Mocked; signed image URLs for reviewers not exercised against a real bucket. |
| Usability with farmers, accessibility audit, load/performance | Out of scope for automated tests. |

## 6. Known limitations of the test evidence

- Passing tests show the code behaves as designed under mocked inputs. They do **not** demonstrate diagnostic accuracy, real-world alternative quality, or farmer comprehension.
- Coverage was not measured.

---

## 7. Addendum — data consent change (31 October 2026)

| Run | Test files | Tests | Result |
|---|---|---|---|
| After consent change | 76 | 346 | **346 passed, 0 failed** |
| Translation check (`--strict`) | — | — | Keys aligned across en / ms / zh |
| `vite build` | — | — | Succeeded; 107 precache entries |
| Manual browser check (local dev server, 375 px mobile viewport) | — | — | Checkbox shows on the plant-details step in Malay, starts unticked, fits the layout, and ticking it stores the opt-in |

New tests:
- Photos are not uploaded without consent, but the assessment record is still written with the consent answer (`dataCollector.test.js`).
- Missing, malformed or outdated consent counts as no consent (`dataCollector.test.js`).
- The analyse route passes the consent answer and `durationMs` to the audit log (`index.test.js`).
- Request validation accepts a correct consent object and rejects anything else (`requestValidation.test.js`).
- The checkbox is unticked by default, saves opt-in and opt-out, and asks again after a wording change (`DataConsentToggle.test.jsx`).

Two existing `dataCollector` tests now pass `dataConsent` explicitly, because storing photos now requires consent.

**Not executed:** ESLint. The repository has no `eslint.config.js` for the installed ESLint version, so lint does not run (pre-existing).
