# History, farm and recovery improvements

Validated 2 November 2026 (Asia/Kuala_Lumpur), on the existing PR #26 branch. This pass does not assign a new design score; the earlier 40/40 assessment applies to its recorded plant-check scope.

## Delivered

- History retains its crop/date/status/search filters. Paginated accounts now explain that filters apply to loaded records. Empty searches offer local guidance and a working reset action. Each result offers a new-photo check; this opens capture and does not silently reuse a historic photo or submit analysis. Titles wrap, metadata is readable, failed images fall back to a leaf, and delete controls have 44px targets.
- First scans, empty timelines, empty plots and empty daily logs explain what to record and provide a direct next action. No sample records are shown as the user's records.
- Analysis shows preparing photos, waiting for analysis, and saving the result. These phases follow real hook transitions, not a timer or invented percentage. Each has a distinct explanation. Long waits offer waiting/cancellation/retry guidance without promising improved diagnosis quality or server cancellation. Existing browse/cancel/error recovery controls remain available.
- My Farm surfaces overdue checks before findings needing review, avoids duplicating due findings in the review list, includes crop/plot context, and links to the original result and its next steps. Additional items use a disclosure. Counts and findings remain saved-scan summaries, not evidence of disease spread.
- Accessibility: History uses named pressed buttons for its two view switches instead of incomplete tab semantics, and consistent H1/H2/H3 headings. My Farm has one H1, named profile/sign-out/close/delete controls, visible focus and larger icon targets. Profile dialog has an accessible name, associated form labels, focus containment, Escape dismissal and restoration to its opener. Mobile tool cards no longer overflow.

All new copy is available in EN/BM/ZH. Existing agricultural green, warm neutral surfaces and typography are preserved.

## Evidence

- Full Vitest: 129 files / 649 tests passed with two workers. New coverage checks priority ordering/deduplication, first-check recovery, failed thumbnails, empty-search reset, and profile-dialog keyboard behavior. Existing NotFound test now covers links and history-aware Back.
- Production build, strict translation-key alignment and diff whitespace checks passed. Targeted ESLint: zero errors; existing hook/unused warnings remain.
- Impeccable source detector: one scan of nine JSX targets, exit 0, stdout `[]`.
- Native Chrome zoom control explicitly displayed 200%; History and populated My Farm reflowed at CSS width 720 with scrollWidth 720 (devicePixelRatio 4). Zoom restored to 100% afterward.
- At 375px, History and final My Farm have scrollWidth 375. History reset restored filtered records, and six rendered delete buttons measured 44px high. A pre-existing Encyclopedia card overflow was found and fixed using bounded grid columns and wrapping.
- Native keyboard: profile dialog opened with Close focused, Shift+Tab wrapped inside it, Escape closed it, and focus returned to Edit Profile. Accessible names and heading structure were inspected in browser/native accessibility trees.
- The actual extracted progress component was rendered with each reported stage in a disposable preview; its live status and aria-current agreed with the selected phase. This is component/UI evidence, not live AI inference evidence.

## Limits and cleanup

Full spoken screen-reader output remains unverified; accessibility-tree and keyboard checks are not a substitute. This is a focused pass over these workflows, not a site-wide WCAG certification. A real 200% zoom check is now completed for History and My Farm; other routes need their own checks.

Temporary UI fixtures used synthetic records. Only the two records created for this pass were deleted; existing demo/user records were preserved. Language/session settings and native zoom were restored, temporary viewport overrides reset, preview tabs closed and server stopped. No external messages or live AI requests were sent. Unrelated files in the original checkout were preserved.
