# Character equipment attachment rebuild — 12 October 2026

## Investigation

Inspected staging at `802ea77` before changing code. Integrated newer upstream staging commits through `56c121e` before delivery. The active model is the classic inline SVG paper doll in `character-portraits-v1.js`, not the retired painted base images. Bodies, armour and held equipment are vector paths in a 240 × 410 viewBox. Inventory WebP atlases are not used for held weapons; transparent image padding is therefore not the active fault.

The old implementation had nominal anchors, but no consistent attachment contract:

- `character-rig-v1.js` remapped published hand Y coordinates through `rigY`, a retired body-coordinate conversion. The classic renderer drew the unconverted coordinates. Owner fit-point overlays therefore did not describe the rendered hands.
- Weapon type, pose, scale and pivots were independently inferred in the rig and renderer (including conflicting fallback profiles). Crossbow name inference could resolve as bow, and legacy Rogue blades differed between paths.
- Every off-hand used `(49,244)` despite different silhouettes. The off-hand dagger had no actual handle. Quivers were treated as hand-held objects.
- Only the right arm posed, with old straight-arm gloves and race decorations still drawn independently. Fingers did not rotate with the handle. There was no second-hand constraint.
- Shields were always behind the body. Two-handed weapons ignored off-hand occupancy.
- Missing appearance fields could be seeded for the body but defaulted differently for the rig.
- Old tests enforced the previous offsets/angles and compared metadata, without checking that a grip point touched painted handle geometry.

## Implementation

`CellboundCharacterRig.equipmentPose()` now owns equipment categories, asset grip points, scale, angle, carry mode and both arms. Each arm uses a two-bone solve with lengths derived from the body's proportions. Shared weapon-family rules replace separate renderer fallback poses. Both hands, gloves, forearms and grips consume that pose in the active canvas coordinates.

The attachment transform is `translate(hand) rotate(angle) scale(size) translate(-assetGrip)`. A two-hand weapon's secondary grip is transformed by the same matrix to constrain the supporting hand. Artwork is reused, with a complete handle for off-hand daggers and shorter one-handed sword/dagger handles. Existing race arm details are clipped to the posed upper arms.

- Swords, axes, hammers and maces: one-hand guard; explicit `twoHanded` or `hands: 2` also selects two-hand support.
- Greatswords and spears: two-hand support.
- Bows: resting hold at the bow's riser; quiver on the back.
- Crossbows: two-hand support at stock and fore-end.
- Daggers: independent left/right handles and grips.
- Staves, rods, wands, scepters and focuses: one-hand caster hold, allowing the catalogue's off-hand.
- Shields: forearm attachment, shield face above the arm.
- Tomes, idols and focuses: asset-specific lower-edge/handle grip.
- Any equipped off-hand accompanying a two-handed weapon is visually stowed. Shields/quivers have a shoulder strap; other stowed off-hands have a belt attachment. Equipment ownership, slots, stats and combat calculations do not change.

Whole-character mirroring is available through `paperDollSVG(c, {mirrored:true})`. It reflects the actor group, preserving attachment and depth order. Existing combat animations transform the complete actor; no new combat timing or damage logic is introduced.

Appearance normalisation is shared by body rendering and public fit/anchor APIs. The owner fit viewer now uses the same anchors and accepts held/stowed layers and two-handed constraints. Cache versions were incremented.

## Display audit

Creation Centre (`character-forge-v1.js`) intentionally shows an unequipped base through `paperDollSVG`. Character sheet/equipment/inspection (`character-sheet.js`), previews, roster models and local Living World use the shared portrait/paper-doll API. `src/combat/combat-portraits-v1.js` mounts the same renderer for existing dungeon/quest/raid selectors and PvP snapshots; no encounter-specific weapon renderer needed modification. Face-only portraits remain face-only.

## Validation

- `npm run build`: pass, including existing build-time gameplay/render gates.
- `npm run test:appearance`: pass.
- `npm run test:core`: 48/48 pass.
- `tests/equipment-fit-matrix.cjs`: 9,360 individual item/body checks, 2,340 complete loadouts (13 classes × 5 tiers × 6 races × 2 sexes × 3 physiques); fixed bone lengths, secondary grip, stowage and non-mutation checks.
- Chromium `tests/equipment-fit.browser.cjs`: 9,360 individual item/body checks and 2,340 full-loadout checks using browser SVG bounds/transforms.
- Chromium `tests/weapon-attachments.browser.cjs`: 516 painted-geometry cases, including all six required loadouts over all 36 bodies, both mirrored directions, and all 14 weapon categories. It checks SVG fill/stroke contact at grips, palms, forearm continuity, layers, canvas clipping, public anchors, and non-mutating render calls. Desktop 1440px and tablet 1366 × 1024 / 1024 × 1366 viewports; eight actual combat mounts, live equipment/appearance swaps, and sampled real attack animation.
- Chromium `tests/race-identity.browser.cjs`: all 12 race/sex bases pass.
- Full bundle playthrough: initial creation/persistence checks passed, followed by a crafting assertion also reproduced on untouched `802ea77`. Upstream subsequently changed that test in `56c121e`; those changes were integrated. The focused core gameplay loop passes on both the latest upstream baseline and the rebuilt renderer. After rebuilding the combined source, the full Chromium playthrough passes, including crafting, equipment progression, dungeon entry, save/reload and creator layouts.
- Before/after Chromium captures and six race/sex/physique sheets were visually inspected. CI captures the new weapon sheets as artifacts.

## Limits

This retains Cellbound's existing flat vector art. It adds articulated holding poses, not new painted characters or weapon-specific attack/draw animations. Bows keep a resting hold during the current whole-actor combat animation. Staves plus off-hands use a one-hand stance, matching existing game equipment rules.

A physical iPad is not available. Local WebKit could not launch because system libraries are unavailable; the existing staging workflow runs WebKit separately. Live authenticated account play must be distinguished from the isolated, real-bundle browser fixtures. Deployment status is reported separately at handover.

## Changed files

- `character-rig-v1.js`: shared category/socket/pose solver, canonical attachment transforms and active hand anchors.
- `character-portraits-v1.js`: joint-driven arms, rotated grips, asset-specific equipment layers, stowed attachments and whole-actor mirroring.
- `character-fit-viewer-v1.js`: current anchors and pose/layer audit rules.
- `guild.html`: cache versions.
- `build.js`: renderer version and viewer contract checks.
- `tests/appearance-foundation.cjs`: renderer version assertion.
- `tests/equipment-fit-matrix.cjs`: shared-pose invariants replacing obsolete offset assertions.
- `tests/equipment-fit.browser.cjs`: browser attachment transforms replacing old position constraints.
- `tests/weapon-attachments.browser.cjs`: new geometry, mirror, viewport, refresh and animation coverage.
- `.github/workflows/staging-browser-qa.yml`: retain weapon QA screenshots.
- `docs/weapon-attachment-rebuild.md`: investigation, implementation, validation and limits.
