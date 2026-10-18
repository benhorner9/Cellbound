# Illustrated character appearance and fitting revision 5

This change extends the existing `classic-paper-doll-v1` renderer and shared Combat Reborn animation owner. It does not introduce a rendering engine, alter saved characters or modify combat calculations. Existing fit-v4 layer/data attributes remain compatible; new shape metadata is revision 5.

## Body and appearance

All six race silhouettes retain their established identity and have fuller rounded arms, shaped thighs/calves, broader feet, softened jaw contours, skin shading and fitted starter tunics. Racial lower-leg and foot markings are clipped to anatomy rather than floating outside it. Hair and headgear use the racial cranial-width profile; crown hair is hidden beneath equipped headgear. No tails are added.

The existing Character Forge now preserves appearance instead of replacing it on every rerender. It exposes both gender presentations, three builds, six skin tones, four markings plus None, four arcane styles, hair, hair colour, facial hair and eye choices. Race/class navigation and confirmation remain unchanged.

## Shared fit contract

`CellboundCharacterRig.armourFit(subject, {family, tier, fitVariant})` returns torso, waist, shoulder, leg, foot, head and hand geometry in the actual 240 × 410 model canvas. `fitSlot` uses that same geometry, replacing its obsolete raster-coordinate bounds. Public active landmarks also use the rendered canvas. Race/sex/frame geometry stays independent of class and tier.

Items retain one shared definition. Optional visual-only `visualFit: "compact"` narrows shoulder plates and `visualFit: "open"` selects an open head circlet; neither alters equipment compatibility or statistics. Future designs should consume these cuts and the existing articulated hand sockets rather than offsetting each race separately.

Shoulder shells and their ornaments rotate about the upper-arm socket with bounded articulation. Sleeves are drawn inside the same upper-arm transform. Gloves and weapons retain the existing two-bone solve and two-handed support grip. Cloth lower garments gain bounded sway from the existing animation channels and reset through the existing lifecycle.

## Equipment and materials

All 13 classes use coordinated material palettes at T1–T3; named T4/T5 palettes remain item-owned. Plate has directional highlights and overlapping lower plates, mail has scale stitching, leather has sewn straps and fitted pockets, and cloth has folds. Tier increases add edging, rivets, double hems and restrained prestigious accents. Shoulder silhouettes distinguish plate, holy/scale and cloth construction. Existing class motifs and varied trouser, kilt, robe and split-robe silhouettes remain integrated.

Gradient definitions are bounded and keyed by appearance plus equipment, avoiding recolouring when the same character appears with different loadouts. No filters, particle emitters, new dependencies or per-frame SVG rebuilding are introduced.

## Integration and release checks

The shared renderer serves creation, roster portraits, character/equipment views, party and the existing shared combat mounts. `build.js` bundles the existing fit-viewer stylesheet to restore staging's 50-request stylesheet budget without increasing the budget.

Tests:

- `tests/equipment-fit-matrix.cjs` and `tests/equipment-fit.browser.cjs`: 780 items × 36 body variants = 28,080 individual fits, plus 2,340 full class/tier/body loadouts.
- `tests/character-appearance-overhaul.cjs`: 2,340 full fits and 215,100 actual ability keyframes checking fixed bone lengths, attached grips, creation persistence and non-mutation.
- `tests/character-appearance-overhaul.browser.cjs`: actual creation controls, landscape/portrait/mobile layouts, 108 rendered action states with exact grip/shoulder pivot checks, and 65 class/tier screenshots with stable repaint comparisons.
- Existing every-skill, actual class encounter, shared combat-theme, weapon, item, race, onboarding and PvP window browser regressions remain part of the dedicated Chromium/WebKit acceptance workflow.

## Verification evidence — 15 October 2026

The full acceptance workflow passed in Chromium and WebKit at [run 38764069715](https://github.com/benhorner9/Cellbound/actions/runs/38764069715), commit `bb7f83d0852fc5d2cceae40e1c23beec4c221621`. This includes the production build, 63/63 core suites, all matrix checks above, 516 painted weapon/attachment cases, live equipment swaps across eight shared combat mounts, every active skill (221), actual encounters involving all 13 classes, 11 combat themes, tutorial/onboarding, PvP and responsive UI checks.

Human review of the rendered captures found a cropped mobile Forge preview despite the initial overflow check passing. The final correction constrains the complete SVG canvas to its available flex panel and adds an explicit canvas-containment assertion. It is verified by [run 38764690753](https://github.com/benhorner9/Cellbound/actions/runs/38764690753), commit `ec368f7b9b4ada0f2b4d0a7f2438e7846e21806c` (both browser jobs passed). Browser artifacts contain creation captures, all 13 tier sheets, equipment sheets and combat captures.

Desktop, tablet landscape, tablet portrait and phone viewport checks use automated Chromium/WebKit. Screenshots and geometry checks are complementary: stable repaint comparisons detect nondeterminism, not artistic quality against a previously approved golden image. Automated bounds/attachment checks and representative human image inspection do not prove every possible combination is artistically perfect.

Physical iPad performance remains unverified. Software-rendered CI encounter frame-time diagnostics are slow, particularly WebKit, and the encounter test explicitly makes no performance pass claim. Responsive UI/resource budgets pass, but neither those checks nor emulated tablet viewports certify hardware frame rate. No physical Safari device or authenticated live multiplayer session was tested.

Gameplay data, class balance, equipment statistics, persistence and save formats are unchanged. Deployment is through the existing staging-only workflow; its exact-commit HTTPS verification is reported separately from browser QA.

The final Safari control-contrast correction passed the complete suite in both engines at [run 38765653635](https://github.com/benhorner9/Cellbound/actions/runs/38765653635), commit `75f15511c0762fe6db3f2323d288e04bae55ba39`. Its WebKit mobile screenshot was visually inspected after passing. The live staging landing page is reachable, but the browser session is signed out; authenticated live roster/combat verification remains outstanding.
