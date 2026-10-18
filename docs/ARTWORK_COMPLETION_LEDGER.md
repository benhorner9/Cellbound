# Cellbound Artwork Completion Ledger

Last audit: 12 October 2026. Branch: `staging`. This is a working checklist, not a claim that the whole game's art is finished.

## Audit status — comic art NOT finished

The prior labels “finished and integrated” below mean paths were packaged, not that every illustration is original, visually correct, or checked in the actual comic reader. Main campaign: 69 assigned beats / 48 distinct paths. No Way Back: 19 beats / 13 paths. Both contain reused source paintings or composites; neither is approved as fully illustrated. Tutorial, Fourfold Lock, Thirteenth Bell and any other comic sequences also require a beat-by-beat visual audit. Do not mark a strip complete until each scene has a finished scene-accurate illustration, no unintended repeats or baked text, and staging reader/browser verification. Comic work takes priority over Manor boss portraits.

## Finished and integrated

- Tutorial scenes: nine illustrated strips, three panels per strip. Existing artwork block 1 checks filenames and content.
- Main quest artwork blocks 2–5: story-specific illustrations wired to the comic player with production asset checks.
- No Way Back art block 6: illustrated comic story assets are integrated and verified.
- Thirteenth Bell: eight scene illustrations exist and are wired to the eight live comic scenes. The Greywake arrival source had a printed storyboard label; `greywake_arrival-restored.svg` crops that label and loads instead.
- Hollow Sanctum: its dungeon card and Guild home image must use `assets/hollow-sanctum/rooms/gallery-void-v2.webp`, not nonexistent `assets/dungeons/hollow-sanctum.webp`.
- New `tests/art-style-asset-paths.cjs` checks static image references in game JS and CSS; `tests/comic-art-coverage-block7.cjs` checks the repaired Greywake art.

## Not yet visually complete

### Main campaign comic art

`QUEST_COMIC_STORY_ART` in `quests-v2.js`: **69 panel image assignments from 48 distinct asset paths** across 11 dialogue strips. This is not 69 individual paintings.

Campaign story asset assignments: one unique path per beat. New SVG compositions reuse existing painted sources; further original paintings and visual review remain outstanding:

1. **Bram's Professional Opinion**: four panels, four distinct painted-source compositions now assigned.
2. **A Different Kind of Pressure**: six panels, six distinct assets now assigned.
3. **The Old Surveyor**: nine panels, nine distinct assets now assigned.
4. **The Door That Breathed**: seven panels, seven distinct assets now assigned.
5. **Something That Should Be Dead**: six panels, six distinct assets.
6. **The Bearer**: six panels, six distinct assets.
7. **The Fragment Remembers**: seven panels, seven distinct assets.
8. **The Seal Opens**: seven panels, seven distinct assets.

A Road Gone Quiet, The Old Forge Key and The Letter in Glass have no within-strip repeats, though some artwork is shared across different quests. Keep scene accuracy and continuity more important than an arbitrary unique-image count.

### No Way Back

Four strips have **19 panels assigned to 13 distinct composite assets**. No image path repeats within an individual strip. Five new 16:9 painted-source composites now cover the sailor's crew, Black Buoy, hull inspection, lost chart and Silas closing the gate. Further original paintings and visual review remain outstanding.

### The Thirteenth Bell

Eight scene illustrations, one per scene, already integrated. The interactive comic reveals multiple captions over a single scene illustration *by design*. Review image quality and continuity before adding extra panels. The missing Greywake arrival numbered-caption issue is fixed at code level.

### Other areas

Inspect visual quality, aspect ratios, layering and old art overrides for Manor raid rooms, Hollow Sanctum, Chaos Canyon, Blackout Station, Fractured Ages, PvP maps, onboarding, equipment, boss portraits and city navigation. An image **existing** does not prove it has the right art style or renders in its final game view.

## Completion workflow for each unattended batch

1. Inspect current staging SHA and this ledger; avoid resetting or rebuilding working gameplay.
2. Identify a precise scene and its active game artwork mapping.
3. Create a *new, clean* illustration (no baked captions, UI buttons, watermarks or layout labels) with the game's hand-painted dark-fantasy style and 16:9 composition.
4. Add the binary asset under the relevant `assets/` directory, add to `build.js` production package, wire it into the actual scene source, and only then mark it integrated.
5. Update or add an artwork validation test. Preserve editor/cloud published-art override precedence.
6. Push to `staging`, verify build, gameplay regressions, FTP deployment, and inspect the actual view. Do not publish production.
7. Move on to the next unmatched panel without asking for permission. Report verified completion and outstanding work, not optimistic totals.

Important: mockup boards and generated pictures that have not been committed and displayed in their intended scenes are **not** finished game artwork.

## PvP arena composition batch — 12 October 2026

Three distinct 1600×900 illustrated ruined-arena compositions were added for Arena, Capture the Flag and King of the Hill, replacing built-in fallback dungeon backgrounds. Each includes two existing painted sources, a playable stone floor, ruined arena architecture and mode-specific landmarks. They are **composites of existing paintings**, not three newly painted source illustrations. Files: `assets/pvp/maps/arena-shattered-crucible.svg`, `capture-the-flag-ruined-causeway.svg`, `king-of-the-hill-fivefold-ruins.svg`. The map runtime retains published owner-uploaded artwork priority. The appearance test suite now includes `tests/pvp-art-coverage.cjs`.

**Deployment status:** Subsequently deployed in staging commit `0060d590523aedf87394048d1602149cea352b4e`; FTP and deployed-SHA verification passed in Actions run `38205860260`. iPad visual approval outstanding.

## Manor raid room fallback batch — 12 October 2026

Six 1600×900 room-specific SVG compositions are committed for the **Entrance Hall (Butler), Dining Room (Maid A), Kitchen (Maid B), Workshop (Engineer), Bedroom, and Attic (Master)**. Each includes a custom architectural and room-prop composition over two softly blended existing painted Manor image sources, without captions or interface elements. These are **painted-source compositions**, not six newly commissioned original paintings. They replace the previous single, tiny `manor-raid-hero.webp` local fallback for all six combat environments. The runtime still uses the approved owner-published room image first through `CellboundRoomLayouts.artFor`; the bundled room art is fallback only. A dedicated `tests/manor-art-coverage.cjs` check validates asset dimensions, painted layers, build packaging, and override precedence.

**Deployment status:** Subsequently deployed in staging commit `0060d590523aedf87394048d1602149cea352b4e`; FTP and deployed-SHA verification passed in Actions run `38205860260`. Visual iPad QA remains outstanding. Real iPad visual approval and original scene paintings remain outstanding.

## Blackout Station grid control art

Prepared `assets/blackout-station/rooms/grid-distribution-board.svg`: 1600x900 dark industrial control-room composite, using two existing WebP paintings with newly arranged switchgear, cables, perspective steel floor and emergency lighting. No text or UI baked in. The owner cloud-art override takes precedence; the Calder reactor art is unchanged. `tests/blackout-art-coverage.cjs` validates packaging and runtime wiring. The grid scene now includes an absolutely positioned, touch-safe decorative image layer (`src/dungeons/blackout-station-v1.css`) with the controls above the art. This corrects an image that otherwise occupied normal page flow and could displace the puzzle. Static checks were added for CSS layering and object-fit. Campaign coverage blocks 3 and 4 and the comic scene editor test now accept the valid SVG composites. **Deployed to staging** in `0060d590` (Actions `38205860260`); browser/iPad visual approval remains outstanding.
