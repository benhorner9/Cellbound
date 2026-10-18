# Combat animation foundation

## Audit (before implementation)

The authoritative Combat Reborn simulation emits ABILITY_START, cast, damage,
healing, control, defeat and revive events. Instant abilities emit their result
in the same simulation tick. Dungeon2D processes gameplay/HUD updates and visual
feedback together. Its HP helper also starts death visuals, before the explicit
defeat event. Combat physical v4 is the shared presentation owner for dungeons,
raids, quests, PvP, world bosses and pets, but its attacks animate entire portrait
containers. Portrait CSS and dungeon legacy classes can animate them again.

Characters are layered inline SVGs. The existing equipmentPose solver provides
both arm joints and weapon/shield grip transforms for every race, sex and frame.
Upper arms are not individually addressable yet. Forearms, gloves, fingers and
held equipment already have separate nodes. Boss art is flattened raster and
monster archetypes are small SVG silhouettes. Neither has a limb rig.

Chosen approach: lightweight SVG cutout animation using the existing joint and
attachment solver, plus compatible container animation for unrigged creatures.
No canvas, new renderer, animation dependency or combat-engine changes.
A bounded presentation timeline bridges instant results to visible contact;
gameplay state remains immediate. One controller owns pose priority and cleanup.
The first polished content is sword/shield Warrior combat in Ashen Vault.

Risks: legacy CSS ownership; death before impact; rapidly replaced portraits;
overlapping events; two-hand support reach; mirrored SVG coordinates; hidden-tab
timers; arena removal during callbacks; lower-powered Safari. Tests must cover
these separately from engine invariance. Raster enemies can recoil/collapse but
need separated art layers for future limb-specific attacks. A bow draw requires
additional string/draw-hand content and is not claimed by this first delivery.

## Implemented

`CellboundCombatAnimation` is a shared presentation controller, loaded before
physical v4. It consumes the same authoritative events through that adapter.
One frame scheduler samples active clips at at most ~30 Hz, with an 80 ms
watchdog; idle breathing uses CSS and requires no controller frame loop. DOM
nodes and their original transforms are cached. A replaced equipment portrait
is rebound on the next event/frame. Removed or hidden arenas release state.

The renderer exposes individual upper arms, existing forearms/gloves/fingers,
and an upper-body group above planted legs. `animatedEquipmentPose` extends
`equipmentPose` with body-relative wrist goals. Every held item uses the existing
`attachmentTransform`; two-hand support grips constrain the shared weapon into
both arms' reachable space. This also corrects the widest Stoneborn spear rest
pose. Mirroring stays on the outer actor and therefore applies to all bones and
held equipment together. Ash Guardian uses the same existing SVG armour/body
art as a mirrored enemy cutout; no new raster assets or gameplay items exist.

One-handed sword motion has preparation, a contact frame, follow-through and
recovery, with separate torso/upper-arm/forearm/wrist motion. Shield bash/block,
recoil, dodge, interrupt, heal, control, collapse and revival clips use the same
interface. Generic thrust/casting gestures are fallback content, not a claim of
fully authored animations for every class. Unrigged monsters/bosses/pets retain
compatible whole-art reactions and casts.

Instant result events receive a short presentation delay to contact (bounded
by 350 ms divided by the existing playback rate). Dungeon damage/heal numbers
join the exact same queue. HP, resources, cooldowns, commands, targeting, meters,
progression and rewards still run immediately in the existing code. The engine
and its 0.7x normal playback policy are unchanged. A miss has no hit reaction;
dodge and block use distinct results. Death locks actions immediately, then
collapses after the killing impact. Revival invalidates a pending old defeat.
Death/control/interrupt/recovery priorities prevent a lower-priority swing from
reviving or unstunning an actor. Combat end drains only bounded visual work.

Visual QA additionally found `.cb-paper-slot` centered transform origins and
180 ms transform interpolation overriding rig transforms. Held equipment now
uses canvas origin and active bones do not interpolate independently in CSS.
Legacy portrait animations are suppressed only for controller-owned actors.

## Verification

- `npm run build`, `npm run test:appearance`, `npm run test:core` (49 suites).
- `tests/combat-animation.cjs`: 102,816 sampled poses covering six races, both
  sexes, three frames, all 14 weapon profiles and every clip; fixed bone lengths,
  grip/support continuity, stable scale and immutable equipment.
- `tests/weapon-attachments.browser.cjs`: 516 painted-geometry cases, now with
  the real character stylesheet; three viewports, eight combat mounts, swaps.
- `tests/combat-animation.browser.cjs`: the production shared viewer plays a
  deterministic engine-generated Warrior versus Ash Guardian victory, including
  a genuine block. Tests contact timing, actual painted joint/grip transforms,
  death/revival/stun/interrupt/miss/dodge/block, rapid target changes, equipment
  replacement, resurrection before queued defeat, reduced motion, responsive
  layout and teardown. Simulations with/without the presentation subscriber
  produce byte-identical results.
- `tests/combat-animation-dungeon.browser.cjs`: actual Ashen Vault entry and room
  artwork using the complete production bundle; five party members/eight actors,
  live events, landscape 1366x1024 and portrait 1024x1366, close/cleanup.
- Existing `tests/living-combat.browser.cjs` and
  `tests/full-playthrough.browser.cjs` pass. The full playthrough covers creation,
  persistence, party/equipment progression, dungeon/raid/PvP surfaces and rewards
  infrastructure with the test backend. No live player account or reward writes.
- Before/after recordings use the same deterministic encounter and baseline
  c6ba7f3. Magnified pose sheets use production artwork/controller and engine
  attack events, with separate synthetic edge-case fixtures clearly in tests.

## Scope and remaining limitations

This is the first polished Warrior/Ash Guardian integration, not a complete
animation catalogue. Hunters currently use a ready/casting fallback, not a
fully rigged bow-string draw. Class-specific spell gestures, dual-wield
choreography, walking legs, unique boss wind-ups/phases/deaths and individually
articulated beasts/pets need further content. Other adapters receive shared
body motion, but floating-number synchronization was specifically integrated
and verified in Dungeon2D's shared viewer (including its raid consumers).

Chromium desktop and iPad-sized viewport tests ran locally. Native iPad Safari
was unavailable; local WebKit lacked required system libraries. CI includes
Chromium and WebKit. Viewport emulation does not certify device performance.
The full production scene on this software-rendered shared host sampled about
15 frames/s both before and after (8-second diagnostics: baseline 119 frames,
100 ms p95; rebuilt 117 frames, 83.4 ms p95). These are environment diagnostics,
not a controlled hardware benchmark or a 60 fps claim. A physical iPad pass is
still needed, particularly for the pre-existing full-scene rendering cost.

## Exact files changed

- `character-rig-v1.js`: shared animated pose/reach constraints.
- `character-portraits-v1.js`: addressable arm/torso layers and rig metadata.
- `character-portraits-v1.css`: held equipment transform-origin correction.
- `src/combat/combat-animation-v1.js`: controller, timelines, priorities, cleanup.
- `src/combat/combat-physical-v4.js`: event routing and weapon socket FX origin.
- `src/combat/combat-physical-v4.css`: motion ownership, idle, corpse and enemy art.
- `src/combat/combat-portraits-v1.js`: Ash Guardian cutout profile.
- `src/dungeons/dungeon-2d-v1.js`: impact-number timing and single death owner.
- `guild.html`: runtime registration and cache versions.
- `tools/runtime-manifest.cjs`: build asset registration.
- `tests/combat-animation.cjs`: mathematical pose matrix.
- `tests/combat-animation.browser.cjs`: encounter, timing and lifecycle browser QA.
- `tests/combat-animation-dungeon.browser.cjs`: full Ashen Vault integration QA.
- `tests/weapon-attachments.browser.cjs`: real stylesheet geometry regression.
- `.github/workflows/staging-browser-qa.yml`: retain animation visual evidence.
- `docs/combat-animation-foundation.md`: audit, implementation, validation, limits.
