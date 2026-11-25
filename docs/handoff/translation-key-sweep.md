# Translation-key sweep — 2 November 2026

The two reported raw-key messages exposed a gap in the existing validation: dictionaries could agree with each other while all three omitted a key used by the app.

This sweep adds46missing keys in English, Bahasa Melayu and Simplified Chinese. They cover dashboard/quick-action labels, scan/history categories, saved-state notifications, account/follow-up messages, report guidance, consultation/PDF labels and three error messages. Existing safe English fallbacks are now translated too.

`npm run check:translations:strict` now parses application source with the already-locked Babel parser, explicitly declared as a development dependency. It checks direct literal translation calls, safe-label calls, static template literals and configuration strings in recognised namespaces. A reference missing from every language is now a CI failure, as are empty/self-referential labels. Comments and test/translation files are excluded. New namespaces in direct translation calls are checked as well.

Computed runtime keys cannot all be proven by this static check and still need UI/behaviour coverage. The runtime translator intentionally returns a missing key for diagnostics; use `label(key, fallback)` or an equivalent key-aware helper for optional copy, rather than `t(key) || fallback`.

Validation:1690static source references resolve in all languages; translation placeholder sets match across English/Malay/Chinese;704tests across140files pass, including six checker regression tests. Production build and strict translation validation pass. ESLint has0errors and76pre-existing warnings. No model, authentication or data-handling behaviour was changed.
