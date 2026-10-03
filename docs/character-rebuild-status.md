# Character rebuild — staging candidate

The user authorized completion and dev/staging implementation. Production is excluded. PR #107 targets staging.

## Implemented

- One Creation Centre for founding-party onboarding and recruitment, with race, appearance, class and explicit name/confirmation steps.
- Twelve painted male/female race bases, with modular face, hair, skin, markings, growth, colour and glow controls. Aelari and Thornkin use fully covering neutral base garments following the revised art request.
- Versioned appearance data, additive legacy defaults, one shared renderer for portraits, equipped characters, local Living World and existing combat mounts. PvP snapshots retain appearance and equipment; raid snapshots already do.
- Anatomical attachment mapping, lower-body coverage masks, alpha-clipped surface details, helmet hair coverage, front weapon grips, material shading and unique item gradient IDs.
- Bounded 64-entry model cache and twelve 480 × 820 WebP base assets.
- Old fixed-height wizard CSS overridden within the new centre; mobile controls retain 44px targets.

## Verification

- Local build passes existing release gates, including 2,340 class/tier/body checks, 780-item artwork coverage, 113 Combat Reborn checks and raid/tutorial smoke checks.
- Appearance tests cover 36 race/sex/frame combinations, visible controls, class-independent anatomy, non-mutating rendering, serialization, portraits and helmet coverage.
- Catalogue audit renders all 780 items across twelve race/sex bases (9,360 checks).
- Static twelve-base and equipped-class matrices inspected. Lower-body clipping, headgear height and hair scale corrected.
- Chromium/WebKit CI now exercises all twelve race selections, creation, appearance refresh persistence and iPad/iPhone viewport sizes alongside existing full-game browser regression. Latest run must pass before merge.

## Acceptance limits

Staging is the environment for further visual/device acceptance. Automated structural tests do not prove every gear combination is clipping-free. Physical iPad/iPhone performance and real account logout/login remain unverified. The remote Living World presence protocol represents guilds rather than selected characters, so remote peer appearance remains outside the implemented local-player integration. Two-handed combat poses and the full catalogue's artistic quality need further visual review before production approval. No database migration rewrites progression or inventory.

## Asset provenance

Built-in image generation from the user's race brief and supplied visual direction. Runtime packaging trims transparent margins and resizes the source art. Runtime assets reside in assets/characters/race-bases/; source sheets are preserved separately.
