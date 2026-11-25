# Background-rendering sweep — 2 November 2026

## Changes

- Standardised History, login/recovery, guide, legal/privacy and admin reading canvases on the app's opaque warm-neutral background. The shared page base now explicitly sets its canvas/text colours; Encyclopedia already uses this approach.
- Removed backdrop blur throughout the current stylesheet set, including checkout, camera controls, modal overlays and dashboard badges. Modal dimming remains intentional; foreground cards stay readable.
- Removed gradient masks from horizontal tabs and partner logos. Native scrolling remains. The avatar ring now uses an ordinary border; decorative dashboard gradient blobs are hidden.
- Fixed five references to undefined background tokens: selected crop and farm-scale controls, compact avatar, myGAP guide cards and report hover state.
- Checkout and dashboard badges use opaque card surfaces. Green remains on intentional primary actions, avatars and status accents.

## Verification and limits

Browser checks covered18public/guest routes or states at390px and1280px (36observations): Home, History, myGAP, Nutrition, Encyclopedia, login, guide, privacy notice, privacy controls, terms, onboarding,404, admin access gate, guest My farm, password recovery, missing scan, missing nutrition result and initial capture flow. Canvases were neutral or inherited neutral, with no active mask/backdrop effects or horizontal page overflow. A mobile disease-details modal also retained its opaque white surface and intentional dimmed overlay.

A temporary synthetic fixture loaded the actual dashboard, checkout, partner, selector and myGAP styles to check account-related surfaces without using real private records or invoking AI. Its foreground cards were opaque; the avatar mask was absent. The temporary fixture is removed from the worktree before committing.

Source inspection found no remaining CSS mask/backdrop-filter declarations and no unresolved, fallback-free background-colour token references in the stylesheet set. These are source/layout checks, not proof against every rendering issue on every device.

The704-test suite passed. Production build passed. This change touches styles, not application data, authentication or AI behavior. Actual private-account record states, camera permission flows and physical iPhone/WebKit versions were not exercised. No production deployment is asserted. If the phone retains an older app build, the corresponding deployed asset update must be loaded before assessing the fix.
