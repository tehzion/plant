# Activity logging refinement

2 November 2026 (Asia/Kuala_Lumpur). Applied Impeccable's Operate/polish guidance, preserving the existing field-green and warm-neutral theme. No numeric design score assigned.

Scout now leads with the required observed disease/pest name. Activity-specific details and notes stay visible; native disclosures contain optional field conditions, costs and photos. Two-column desktop field rows stack on mobile. Disclosure state preserves values, and an invalid hidden field opens its section before receiving focus. Every text/number/select control has an associated label, activity/timing buttons expose pressed state, and photo upload remains keyboard accessible.

The save action now says Save activity / Saving your activity, disables the editable fields during a request, and exposes inline errors. Rejected requests release the saving state in finally and retain the form for retry. Activity-specific required fields are enforced: Scout observation, applied product for spray/fertilizer, positive harvest yield, or notes for other activities. This resolves the old silent rejection of Scout observations and harvest quantities entered without a separate note. Existing persisted field names and normalization are retained. Success continues to add the saved entry, reset the form and show confirmation.

Validation:
- Full suite: 130 files / 653 tests passed. New tests cover optional-value preservation, invalid hidden-field recovery, labels and requiredness, busy state, and rejected Scout save followed by successful retry.
- Production build, strict EN/BM/ZH translation checks and git diff whitespace checks passed. Targeted lint: zero errors, five existing dashboard warnings.
- One Impeccable source detector scan of ActivityForm, NotesTab and UserDashboardPanel returned `[]`.
- Native browser EN/BM checks at 375px and desktop 1280px: scrollWidth matches viewport, visible form fields use 16px text, required Scout observation appears first, and optional sections expand/collapse.
- Actual demo UI save of a disposable Scout entry with an empty free-text note succeeded. Cost 25 survived collapse/reopen and appeared in the saved record. An invalid cost of -1 in a collapsed section reopened Costs and focused its input with native validation; that entry was not saved.

Only the disposable QA activity was removed; existing records were retained. Language and demo flags restored, viewport reset, preview tab closed, fixture removed and server stopped. Live real-account cloud writes, photo upload and full spoken screen-reader testing were not performed. Browser validation used demo/local persistence; failure/retry used a rejected persistence mock in regression tests.
