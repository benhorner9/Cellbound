# Combat Reborn spatial audit — 13 October 2026

Baseline: staging `1714113731e645e7b4c239baae6b2799da0201c3`.
Primary reproduction: Fractured Ages / Deadeye Mercer, Protection tank, two Arms melee, Holy healer and Beast Mastery Hunter with pet. Mock accounts and deterministic sessions only; no player inventories or production state modified.

## Root causes

* Engine `physicalPosition`, `openPhysicalPosition`, `collisionWaypoint`, `moveTo` and formation helpers already provide authoritative range, line of sight, collisions and tactical movement. They operate in normalized arena coordinates. A player radius of 1.3, a friendly soft-collision factor of .82 and a boss radius of 2.8–3.1 are substantially smaller than the rendered 48×82 portraits, extended weapons and 66×66 touch targets.
* `moveIntoRange` returns early for non-tanks already within legal range. It does not reserve distinct, readable engagement destinations. Several melee actors can therefore legally attack from a small cluster. Altering that engine condition would also change attack timing and balance.
* The shared `combat-physical-v4` movement owner directly rendered logical positions. Collision handled point-like ground occupancy, with no separate screen-space reservations. Initial spawn offsets cannot fix converging targets later in a fight.
* Canonical HUD touch targets use negative half-size margins. Applying an additional centering transform displaced visible models from their tracked coordinates. This also affected visual effect origins.
* PvP snapshot rendering independently wrote left/top every 200 ms. It must delegate to the shared movement owner after spatial ownership is established.
* Nameplates were not independently laid out; long boss labels and health bars obscured adjacent portraits. The mobile arena also becomes too shallow for unscaled character art; this is a layout constraint, not an engine collision failure.

## Architecture decision

Extend the current single movement owner with a pure screen-space occupancy planner. Logical positions remain engine-owned and immutable. A participant has its original logical position, measured visual footprint, stable reserved destination, interpolated visual position, role and target, and movement/control/death state. Weapon pivots and articulated upper-body animation remain under the existing animation controller.

The planner uses a spatial grid, deterministic candidate scoring and reservation hysteresis. Tanks prefer front-facing engagement, melee fighters take independent flanks, pets use secondary space, and ranged/healers preserve a backline. Bosses receive larger footprints. Commands temporarily prefer their authoritative destinations, with different spacing for Stack and Spread. No positional damage bonuses or new combat outcomes are introduced.

Local steering yields to occupied ground; a bounded route search recovers from blocked crossings. A second engine, physics library and new per-screen movement logic are unnecessary. Animation moves artwork inside a positioned unit, so lunges cannot reset its reservation. Non-robed existing paper-doll legs reuse the established leg cutout groups for a walking cycle; robe and creature art retain their existing animation capabilities.

## Boundaries and risks

Existing environment bounds, walkable polygons, rectangular/elliptical/polygonal blockers and elliptical arenas feed the visual planner. Deadeye Mercer's street has a presentation-only walkable polygon. Unauthored scenes use a padded arena rectangle; painted scenery cannot be inferred reliably. Other room-specific polygons should be authored as art changes. Fixed ground hazards constrain reserved positions to the same inside/outside relationship as logical positions.

Presentation displacement does not change engine ranges, target selection, timing, damage or objective capture. PvP retains its logical destination preference rather than PvE role-driven engagement. Ground hazard and objective readability require special care because their coordinates are authoritative. Crowded spaces have finite capacity: an unresolved count is exposed for QA rather than hiding crowding by shrinking models.

Visual QA must inspect actual interpolated positions, not just clear reservations. A deterministic frozen simulation is used only after a genuine encounter has reached its specified checkpoint; it is not a player-facing mode. Browser viewport tests are not a claim of physical iPad Safari performance.

## Validation results

* New pure spatial regression: stationary reservations, moving boss/crossing recovery, independent tank/melee/backline/pet placement, control/casting priority, death/revival, Spread/Stack/Regroup, authored obstacle detours and 40-participant stress fixture. The 40-actor initial crowded plan takes approximately 60–80 ms in this container; subsequent plans are throttled, spatially indexed and retain stable reservations. This is not a 60 fps or physical-device claim.
* Deterministic engine comparisons against `1714113`: single boss, multiple enemies and a live Spread/Stack/Regroup command sequence retain identical gameplay/event output after removing new presentation metadata. Baseline hashes are stored in the test for shallow CI checkouts.
* Production build passed; core regression runner 51/51 passed. Full appearance suite passed, including 2,700 armour combinations and 9,360 catalogue renders.
* Actual Ashen Vault first-room fight: eight rendered actors, genuine attacks, hits, blocks and deaths; tablet portrait resize and scene cleanup passed. Actual all-class Ashen fixtures exercised all 13 classes without page errors.
* Actual Fractured Ages first-stage runtime in the mock account: desktop 1366×1024, tablet portrait 1024×1366, mobile 390×844. Same engine checkpoint used for before/after evidence. All seven actors (five players, Mercer and Hunter pet) have finite, contained and settled destinations. Art and weapon scales are unchanged. Mobile receives enough battlefield height for the original-size portraits; max-content grid tracks prevent existing command-panel overlap.
* Actual shared PvP viewer and authoritative live sessions: 5v5 Arena, Capture the Flag and King of the Hill, including tactical Spread. No unresolved reservations at captured checkpoints. The engine currently rejects 10-player battleground squads despite a larger format catalogue; no gameplay restriction was changed. Larger sizes are pure spatial stress fixtures only.
* Engine-published environment/range-style and hill-radius metadata are additive. Storm/hill and fixed hazard membership constrain spatial reservations; they do not award avoidance, captures or other gameplay outcomes.

## Remaining verification and asset limitations

Local Chromium is software-rendered and full combat is substantially below device refresh rate in this environment; concurrent QA is not a meaningful performance benchmark. No physical iPad or iPhone was available. WebKit 18.4 downloaded, but launch dependencies (GTK/GStreamer and related shared libraries) could not be installed because the container cannot perform the package manager's required identity changes. Staging CI includes the WebKit suite; its result must be reported separately.

Hollow Sanctum, Chaos Canyon, Manor raids, world bosses and tutorial adapters were inspected for shared movement ownership, but were not each played end-to-end in this job. They inherit the same renderer; authored scenery boundaries remain incomplete outside scenes with metadata. Dense objective zones can have insufficient space for every full-size silhouette; the planner reports unresolved capacity rather than changing objective rules or shrinking models. Non-rigged enemy tokens and pets retain their existing limited motion. Robes retain their existing lower-body art. No new bitmap art is introduced.
