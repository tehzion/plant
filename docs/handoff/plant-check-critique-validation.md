# Plant-check critique fixes: validation

Implemented on `fix/plant-check-critique`, based on PR #25 (`fix/p1-audit`, 24fee257). PR #25 was open when work began. Keep this PR stacked until #25 merges; do not merge without the user's instruction.

## Delivered

- Results reads diagnosis + photo → up to three immediate steps → state-specific primary action → watch/recheck → one more-details disclosure. Confident treatment includes its original treatment/dose text and a local product-label reminder. The treatment button starts an in-place persistent checklist; healthy opens a 14-day recheck; other rechecks use three days.
- Distinct retake, healthy, uncertain and disease headlines/icons/tints. No severity on the healthy summary/form. Products/nutrition stay hidden for review/retake. Treatment eligibility and shared decision policy are unchanged; look-alikes and expert-review notes remain.
- One log-care action, secondary photo retained in details, translated pathogen type, secondary Latin name, no ambiguous score estimate in the main result, and no clipped tabs. A shared quiet notice replaces duplicate catalog failures.
- Capture keeps one counter, defaults subject to whole plant, remembers crop and scale (acre as first-use default), shows four common crop categories and an Other disclosure, excludes weed control as a crop, and scrolls to the top after transitions/errors. Blur feedback is inline. Retake reason survives the recovery route. Failure copy says the photo is retained.
- Mobile body text is 16px, Results H1 26px, buttons inherit fonts, primary targets are at least 48px and the history back link is 44px. History uses the history icon. Health status no longer flickers through checking between failures. Literal place names no longer become missing translation keys.

## Verification

- `npx vitest run`: 121 files, 612 tests passed.
- `npm run build`: passed. Existing Vite chunk-size and mixed static/dynamic import warnings remain.
- `npm run check:translations:strict`: passed; EN/BM/ZH keys aligned.
- Targeted ESLint: zero errors; existing unused-variable/hook-dependency warnings remain.
- Impeccable detector: one scan of 21 changed JSX files, zero findings. Read-only browser evaluation prevented the optional overlay injection.
- Independent two-agent critique: 28/40 (Good), up from handoff's 22/40; below the aspirational 30+ target. See `.impeccable/critique/` for the complete report and remaining limitations.
- Native browser: all four result states in BM/EN at mobile sizes, with 360/375px geometry checks. Rice result at 375×812 measured 1,340px document height, scrollWidth 375px, primary action at y=673–721. Photo/diagnosis/steps/action were visible without opening a tab or accordion. Final BM uncertain result measured scrollWidth 360px and a 48px primary action.
- Verified treatment checklist focus and persisted checks, healthy prefilled recheck/focus, retake-to-capture navigation, capture steps 1/2, and unavailable-backend failure with the photo retained. Unit coverage verifies blur rejection with parent-handled feedback and no covering toast, crop disclosure, preference persistence, state headlines/actions and treatment gating.
- Seeded disposable demo scans with a synthetic image; no real disease diagnosis or chemical efficacy was inferred from it. Did not send WhatsApp messages or feedback. Network translation and live AI inference were unavailable locally.

## Cleanup and limits

Used direct Vite with `VITE_ENABLE_DEMO_AUTH=true` on 127.0.0.1:5175 because preview_start is not exposed here; did not modify the user's launch configuration. Temporary seed page/image were removed, demo session/records and test preferences cleared, and the dev server stopped. The original checkout and its existing uncommitted launch/worktree files were preserved.

Original-language saved analysis still requires the translation service; local UI copy remains translated and clearly identifies source-language advice. Full screen-reader/contrast measurements and live AI success were not verified. No backend, decision policy, shadow-checker or Stageshow changes.
