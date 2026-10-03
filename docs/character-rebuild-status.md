# Character rebuild — draft implementation

Not complete and not approved for staging/live deployment. User requested completion before staging, so this branch remains isolated until remaining assets and QA are resolved.

## Implemented

- Unified Creation Centre used by both founding-party onboarding and later recruitment. Large race previews; race/appearance/class/name-confirm flow; race/sex switching; explicit submit; existing role/class restrictions retained.
- Appearance schema 1 with additive defaults. Shared portrait/body/world/combat renderer; model contract v10; class-independent anatomy.
- Modular face, brows, nose, mouth, eye shape/colour, hair, beard, skin, marking, feature, body pattern, surface detail, feature colour and glow controls.
- Eight painted body assets: male/female Veyren, Stoneborn, Emberkin, Nymari. Tintable grayscale layers with preserved alpha, 480 × 820 WebP, about 52–76 KB each. Aelari and Thornkin still use the vector fallback; these are NOT finished race models.
- Common anatomical equipment mapping for painted assets, adjusted leg/hand anchors, material shading, visible main-hand grip, helmet coverage and catalogue SVG gradient ID isolation.
- Shared full character models in existing combat player mounts; PvP viewer retains appearance/equipment in its character snapshots. Existing raid snapshots already preserve those fields.
- Shared local Living World leader. Remote world peers currently represent guild presence, not a supplied character appearance; that integration remains outside verified coverage.
- Bounded 64-entry render cache; shared image cache through stable asset URLs; reduced-motion rules.

## Validation and limits

- `npm run build`: existing release gates, 2,340 class/tier/body combinations, 780-item artwork coverage, 113 Combat Reborn engine checks, 10-character raid and tutorial smoke checks pass.
- `node tests/appearance-foundation.cjs`: 36 race/sex/frame combinations, actual control changes, class-independent anatomy, serialized appearance and non-destructive defaults.
- `node tests/appearance-catalogue.cjs`: render all 780 catalogue items on twelve race/sex bases, validate slot markers and linked assets. This checks render structure, not visual clipping acceptance.
- Static painted-body/equipment renders inspected and hand/leg attachment positions adjusted. Full visual matrix still required.
- No browser/iPad/authenticated creation/logout/login checks claimed. Playwright browser unavailable; its download returned an invalid archive. OS browser install was unavailable in this environment.
- Browser playthrough selectors updated for the shared creator, but the suite has not run here.
- No database/player data, staging branch or production branch changed.

## Blockers before completing/deploying

1. Image-generation service rejected one request in the final race batch with an output safety block. Aelari and Thornkin remain unfinished. Do not retry the blocked request without a revised user request; request fully covering neutral base garments or user-supplied finished base art.
2. Complete visual fitting review for all race/sex builds, including hair, headgear, two-handed poses, shoulder bounds and boots; refine painted-body overlays where needed.
3. Browser/iPad end-to-end verification, authenticated persistence, remote inspection payload coverage, five/ten-character actual frame-time measurement.
4. Only then merge/deploy staging and verify the deployment; production still requires user approval.

## Asset provenance

Built-in image-generation tool, not the fallback API. Prompt family: two adult male/female front-facing reusable grayscale race bases in a consistent illustrated fantasy style, bald with no equipment, neutral base garments, transparent background; race-specific anatomy from the supplied brief. Packaging trims empty alpha margins and resizes to a standard runtime canvas without altering artwork. The generated source sheets are preserved separately; runtime assets reside in `assets/characters/race-bases/`.
