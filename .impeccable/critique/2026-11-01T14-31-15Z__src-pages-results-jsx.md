---
target: plant-check flow (scan → result → care steps)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/user/Documents/plant/src/pages/Results.jsx"
target_fingerprint: "sha256:3871fd1e081b651a6568eae53395d09d84ce24bb893f0f24e7ef8ad6eb9df3ca"
target_path: /Users/user/Documents/plant/src/pages/Results.jsx
timestamp: 2026-11-01T14-31-15Z
slug: src-pages-results-jsx
---
Method: dual-agent (A: design review · B: detector + browser), PR #25 worktree (fix/p1-audit) at 375×812, BM and EN.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Header chip flips "Gangguan"/"Menyemak…"; two step counters disagree; step change and errors keep old scroll position |
| 2 | Match System / Real World | 2 | Padi/sawah language is good; "Penemuan dengan keyakinan lebih tinggi", "Skor model ialah anggaran…", raw "Fungal", "Magnaporthe oryzae" are not |
| 3 | User Control and Freedom | 3 | Back, Cancel, Minimise, Delete image, Retry all present |
| 4 | Consistency and Standards | 2 | "Catat penjagaan" vs "Catat tindakan rawatan"; save icon on "Lihat sejarah"; Arial buttons; "Disease Info" tab on healthy plants |
| 5 | Error Prevention | 3 | Blur gate and low-confidence treatment hiding are strong; farm scale defaults to home garden |
| 6 | Recognition Rather Than Recall | 2 | Farmer's photo is below the fold inside a tab, not beside the diagnosis; Products tab clipped |
| 7 | Flexibility and Efficiency | 2 | No remembered crop/scale; 12-tile category grid every scan |
| 8 | Aesthetic and Minimalist Design | 1 | Disease name ×3, status ×3, immediate actions ×2, "why we think this" ×2, two log CTAs; ~7 phone screens |
| 9 | Error Recovery | 2 | Failure card repeats "try later" twice, never says the photo is kept; retake result headline "Tidak diketahui" |
| 10 | Help and Documentation | 3 | Photo tips, "ask about this result", expert-review note |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

LLM: partly specific, generic scaffolding. Peribahasa on the loading screen, padi water-level steps, look-alike disease cards and native BM agronomy copy are authored for this product. The page architecture (card stack, 4 tabs, accordions, icon quick-action bar, feedback form) and visual language are category-interchangeable.

Deterministic scan: CLI `detect` on 13 markup files: 0 findings (it does not read CSS). Browser overlay found: skipped heading levels (Home.jsx:667 h1 → :694 h3; ScanDecisionSummary.jsx:49 h2 → DiseaseResultSections.jsx:66 h4), no h1 on Results, border-accent-on-rounded on .scan-decision (Results.css:482-486). Page-wide overused-font (Inter) and cream-palette are brand choices, treated as false positives.

## Priority Issues

- [P0] The disease result never answers "what do I do now?" Treatment is in the second tab inside a collapsed accordion (TreatmentRecommendations.jsx:11-15); the primary CTA "Catat penjagaan" opens a logbook. Fix: a "Buat ini sekarang" block under the diagnosis with 1-3 steps incl. treatment + dose + label-safety line when treatmentEligible; state-specific full-width primary CTA. → distill, clarify
- [P1] Results is redundant and ~7 screens long. Fix: Summary with photo → Do now → Watch for → one "Butiran lanjut" disclosure; merge log CTAs; drop or cut the 4-tab strip on mobile. → distill, layout
- [P1] Result states look the same. Retake shows "Tidak diketahui" as headline; healthy shows "Severity: Low" and "whether it is improving"; retake/low-confidence still show Nutrition/Products tabs. Fix: per-resultState headline, icon/colour, CTA. → clarify, harden
- [P2] Capture flow contradictions: "1 of 3" vs "Langkah 1 daripada 2"; "Tanaman, plot dan gejala" disclosure holds no crop/plot field; subject defaults to Daun under "Seluruh pokok"; scale defaults to home garden; no scroll-to-top on step change/error. → clarify, onboard
- [P2] Type too small outdoors and broken outline: body 14.4px, labels 12-12.8px, failure title smaller than body, no h1 on Results, skipped heading levels. → typeset, audit

## Persona Red Flags

- Jordan: "Gangguan/Down" chip reads as app broken; two step counters; optional disclosures look required.
- Casey: CTAs narrow mid-page, no sticky action; tab strip needs sideways swipe; chat FAB overlaps cards; failure doesn't say photo kept.
- Sam: no h1 on Results; skipped heading levels; 12px labels; feedback buttons 42px; flickering status chip.
- Pak Ali (55, BM only): stalls on "keyakinan lebih tinggi", "Skor model…", "Magnaporthe oryzae"; taps "Catat penjagaan" expecting advice; 12 crop tiles where one matters.

## Minor Observations

Blur toast covers header and stepper; scale cards off-balance; arbitrary category icon colours; "Kawalan Rumpai" as a plant category; red bold headline for non-critical Products error; contradictory re-check (5 days vs 3 days); i18n bug "common.common.locationNA"; healthy result has no moment of relief.

## Questions to Consider

- If a farmer reads one line of the result, what should it be? Today it is "Jenis Tumbuhan: Padi".
- Should a disease result end on a feedback form, or on a scheduled re-check with a before/after photo?
- Should crop be chosen once at onboarding so a scan is snap → answer?
