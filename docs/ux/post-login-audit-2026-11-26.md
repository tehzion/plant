# Post-login UI audit: fewer clicks

26 Nov 2026. Walked as a signed-in farmer (demo login) at phone size (375 × 812), in Bahasa Melayu.

## Principles used

1. **One job per screen.** Each screen answers one question: check a plant, see past checks, keep farm records, do myGAP.
2. **One way to do each thing.** If the tab bar already goes somewhere, the page should not repeat that link.
3. **The next step is always in reach.** The main button is on screen without scrolling.
4. **Optional things stay folded.** Show what most farmers need. Fold the rest behind one tap.
5. **Danger is never the first button.** Destructive actions sit last and ask before acting.

## What was measured

| Screen | Before | After | What changed |
|---|---|---|---|
| Home | 32 tap targets, ≈4.8 screens of scrolling | 27 tap targets, ≈3.5 screens | Removed 4 "farm tools" rows that repeat the tab bar (plant check, history, farm records, myGAP). Today's farming notice stays; the next days fold under "Next few days". |
| Plant check, step 1 (photo) | Next button ≈1.6 screens down after adding a photo | Next is pinned at the bottom of the screen | Step buttons stick to the bottom during the whole check. With three buttons, the main one gets its own full-width row. |
| Plant check, step 2 (crop) | Farm-size picker took ≈1.5 screens; Analyse ≈2.8 screens down | Farm size is one row of three; Analyse is pinned | The farm-size cards are compact. The descriptions are hidden because the names say enough. |
| History | Search plus 4 filters filled the first screen; the list started below it; "Delete all" was the first button | Search plus one "More filters" toggle; the list starts on the first screen; "Delete all" is at the end | The filters open by themselves when one is in use. Delete all still asks before deleting. |
| My farm (`/profile`) | 34 tap targets, 5 tabs that wrapped onto 2 rows (one was a shop), 8 activity-type buttons, and the next step sat ≈2.3 screens down under a per-crop list | 23 tap targets, 4 tabs on one row, ≈3.9 screens; the next step and "Log activity" are on the first screen | The shop tab is gone (Products stays on Home). One "Log activity" button opens the daily log, where the activity type is picked. The most urgent alert shows as the one next step. The recent-activity shelf is gone because History already lists it. The per-crop summary and photo privacy moved below. |

Fastest plant check, counted in taps (camera on the phone):

- **Before:** Check → Take photo → *scroll* → Next → Category → *scroll* → Analyse. That's 5 taps and 2 scrolls.
- **After:** Check → Take photo → Next → Category → Analyse. That's 5 taps and no scrolling.

## Still open (not changed in this pass)

| Priority | Screen | Issue | Suggested fix |
|---|---|---|---|
| Medium | Home | "Check plant" still appears 3 times: the welcome card (first visit only), the main panel, and the tab bar. | Keep the main panel and the tab bar. Make the welcome card's button the same action, not an extra one. |
| Low | History | The "4 / 4" count shows even with no filter on. | Show it only while a filter is active. |

## Follow-up fixes (second pass)

| Screen | Before | After |
|---|---|---|
| Header | "Refresh app" always visible | Shows only when a new version has taken over the open page |
| myGAP | 6 tabs; "Farm" overlapped My farm | 5 tabs. The myGAP farm details (land, workers, certificate, input stock) are a folded section under My farm → Plots |
| Farming notice | "Temp / Rain / RH / UV" in English everywhere | Translated (e.g. Suhu / Hujan / Kelembapan / UV) |
| Assistant button | Covered card content at the bottom-right | Hidden at the top of a page; appears once the farmer scrolls down. Pages too short to scroll show it straight away |

## Checks run

- All 160 test files, 835 tests: passed.
- ESLint on changed files: 0 errors. The 7 warnings were there before this change.
- Phone width 375 px: no sideways scrolling on Home, the plant check, History or My farm.
- My farm: "Log activity" opens the Daily log tab with the form ready.
- Not checked: a real AI result end to end. The local check used no AI server, so Analyse stayed disabled ("service unavailable").
