# Plant-check refinement: final validation

Updated 2 November 2026 (Asia/Kuala_Lumpur) on `fix/plant-check-critique`, stacked on PR #25 (`fix/p1-audit`, 24fee257). PR #26 remains unmerged; merge only on the user's instruction.

## Result

Independent Impeccable Assessment A: **36/40 — Excellent**, exceeding the requested 35/40. Historical checkpoints: initial handoff 22/40 → first PR refinement 28/40 → final independent review 36/40. Full scored report and independent technical evidence are archived in `.impeccable/critique/`.

## Delivered

- Diagnosis and photo → up to three immediate steps → result-specific action → watch/recheck → grouped optional details. No clipped tabs or repeated diagnosis/status. The treatment/dose remains source advice, with a local label reminder. Starting treatment opens a persistent, reversible checklist with progress and a three-day recheck; healthy uses 14 days.
- Checklist completion and field answers use source keys, retaining progress across translated labels. Storage failures explicitly say checks are temporary.
- Saved translations are bounded, scoped per account and source content, and exclude images, tokens and location. First-time unavailable translation shows local checks and expert recovery rather than unreadable treatment. The immutable source determines decision/treatment policy; translated text cannot change eligibility, confidence or expert-review flags.
- Retake asks for both photo views, opens both controls, removes optional wording for the requested closeup and requires both before Next. Mixed-language retake uses one local instruction and puts Retake before optional source advice. No care-log/followup controls clutter this state.
- Capture has one set of photo tips, remembered crop/scale, four common categories, whole-plant defaults, consistent steps and deliberate focus. Service state is shared across header and capture, explains what is available during outage, offers retry and prevents a known-failing analysis request. Header says “Checks paused,” with no checking flicker.
- Explicit local capture drafts store both photo blobs plus crop/scale/context/step in owner-scoped IndexedDB. Save confirms an actual time; Resume is explicit, restores preparation after reload, and never restarts a network analysis. Saved drafts clear after successful analysis; discarding prompts confirmation. Save failures preserve the current photos. Cancel explains that unsaved work is lost while saved drafts remain.
- Photo failure fallback, contextual expert help, directly accessible care logging, lazy product details, two sharing/export actions and separately disclosed feedback. Large controls, 16px field/result body text, coherent headings and visible keyboard focus preserve the brand.

## Checks

- `npx vitest run`: **127 files / 630 tests passed**.
- `npm run build`: passed; existing chunk-size and mixed import warnings remain.
- `npm run check:translations:strict`: passed, EN/BM/ZH keys aligned.
- Targeted ESLint: zero errors, eight existing unused/hook warnings.
- Impeccable detector: **0 findings** across 17 changed/new JSX targets; one scan, no read-only overlay bypass.
- Native browser: BM four-state results at 375px, EN four-state results at 360px, unique H1, no horizontal overflow, paragraph/list/label text 16px and effective targets ≥44px. Checkbox labels supply the touch target around native 24px inputs.
- Computed contrast: 30 visible cached EN rice text elements, minimum **6.381:1**, none below 4.5:1. Final capture description polish measured visible body text only at 16px, scrollWidth=375.
- Independent native verification of language-stable checklist progress, retake context, missing-photo fallback, translation failure, service retry, actual draft Save → reload → Resume with both images and updated times, without analysis starting.
- Regression coverage includes source-policy preservation, cache/owner isolation, malformed cache and failed writes, stable action keys, true first-checkbox focus, recovery-form retry/date checks, shared service subscriptions, draft photo/context restoration and explicit save/resume feedback.

## Limits and cleanup

Synthetic images/results are interface fixtures, not proof of diagnosis quality. Browser cached translation was simulated valid API output. Live AI success and first-time live translation were unavailable locally. No WhatsApp or feedback message was sent. Full screen-reader and 200% zoom audits remain unverified; computed contrast was not pixel sampled. Live disk-quota and cross-account failures were not induced; those paths use tests.

Used demo Vite on 127.0.0.1:5175 without editing the user's launch configuration. Disposable QA records, drafts, cache entries, files and session flag were cleaned, temporary viewport overrides reset and server stopped. Original checkout changes were preserved. No backend decision, shadow-checker or Stageshow changes.
