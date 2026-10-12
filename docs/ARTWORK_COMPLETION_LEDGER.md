# Cellbound Artwork Completion Ledger

Last audit: 12 October 2026. Branch: `staging`. This is a working checklist, not a claim that the whole game's art is finished.

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

Four strips have **19 panels assigned to 8 distinct composite assets**. Each panel is illustrated, but many illustrations repeat. Prioritise individual illustrations for the sailor's harbour story, the damaged boat, the failed voyage and the Manor homecoming.

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
