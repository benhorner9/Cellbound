# Job 11A — Ashen Vault cinematic encounter showcase

## Scope
A presentation-only cinematic layer for the actual Ashen Vault stage, mounted from `renderDungeonEnvironment`. Existing approved seven WebP backgrounds, 16:9 layout, Combat Reborn engine, physical-v4 effects, cinematic character portraits, HUD commands, chat, telegraphs and rewards are retained.

## Changes
- Per-room painting colour treatment, subtle light shafts, drifting haze, capped ember particles and edge falloff anchored to the same illustrated 16:9 scene.
- Taller party portrait silhouettes and larger boss framing without modifying engine spawn coordinates, targeting or collider geometry.
- Refined Ashen encounter header, sidebar surfaces and art frame while leaving all real interactive HUD and chat elements intact.
- Extra background-only bursts from the real `cellbound:combat-visual` event stream (phase, mechanical telegraphs, successful interrupt, critical strike, boss defeat); existing high-priority warning overlays stay on top.
- Honour `prefers-reduced-motion` and data-saver preferences; no new textures, network calls, backend migration, rewards or continuous JS render loops.
- One maximum atmosphere layer per stage; no cross-dungeon or PvP scope.

## Validation
Core contract and browser regression test (Chromium / WebKit via CI) cover safe mounting, idempotency, actual event-driven effects, 68+ telegraph / 72+ actor layering, preserved controls, reduced-motion, iPad-size viewports and isolation from other themes. The existing full game release gate must also pass before staging merge.

## Testing on the 13-inch iPad
1. Open the dev game and enter Ashen Vault with your existing party.
2. Look for warmer depth, light shafts and cinders in the arena; check the party portraits and boss size/lighting.
3. Trigger a boss phase or mechanic; the cinematic reaction should happen *behind* the original warnings, which must remain easy to read.
4. Try target selection, commands, potions, cast interrupts, global chat, exit and re-entry; no action should be blocked by effects.
5. Rotate between portrait and landscape, and test Safari with Reduce Motion on: combat remains usable with less animation.
6. Compare to the previous deployed staging commit if desired; the artwork itself is unchanged, while the atmosphere and portrait framing are the showcase.

## Boundaries
This is a real runtime styling / event pass, **not new bespoke painted assets, animated full-body actors or a complete art-direction migration**. The current room paintings remain the source. Physical iPad sign-off is separate from automated WebKit viewport coverage. Future cinematic content should be reviewed visually before extending this design to other dungeons.
