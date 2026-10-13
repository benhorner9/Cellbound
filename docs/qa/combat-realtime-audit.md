# Combat Reborn continuous presentation and room lifecycle audit

Baseline: staging `a4802225e9113c41eda9a2dacc9b174508dfc677` (13 October 2026).

## Confirmed causes

1. **Layout work, not a turn-based simulation.** The live engine already advances its authoritative fixed ticks from elapsed RAF time. At the existing 0.7× normal playback rate, a 20-second live Mercer sample advances about 14 seconds of simulation. Engine scheduling does not wait for the animations. No simulation rules or timing constants were changed.
2. **Two competing presentation loops.** Physical presentation and the rig each scheduled RAF plus an 80 ms timeout which could cancel the queued RAF. The rig also discarded frames less than 30 ms apart. Ordered, coalesced RAF callbacks now run physical geometry work before rig writes. Each subsystem re-enrols only while active.
3. **Forced layout on every frame and event.** `getClientRects` visibility tests in both loops and a document-wide mutation observer flushed the SVG scene. Event facing, projectiles and floating numbers repeatedly read geometry after writes. The baseline CPU capture spent approximately 4.1 seconds of a 20-second sample in `getClientRects`, 1.3 seconds in `getBoundingClientRect`, and 0.6 seconds in `getScreenCTM`. Visibility is now checked through actual hidden ancestors; arena geometry is invalidated on resize/scroll, spatial points are reused, and grip matrices are sampled before rig writes. Projectiles still use the shared equipment sockets, including the bow socket.
4. **Unchanged HUD rebuilt continuously.** Both dungeon command adapters reconstructed command-power HTML every simulation frame. Unchanged text replacements triggered the shared HUD observer, which rescanned the whole combat shell even for damage numbers and particles. Command rendering is now keyed by actual availability, power and displayed cooldown precision. Meter writes are coalesced per frame, while state accounting remains immediate. HUD structural upgrades ignore ordinary effect/number changes.
5. **Redundant raster work.** Every articulated combat SVG had a 22 px blurred silhouette shadow, despite an existing ground shadow. Authored rooms also had two extra animated full-arena blur/atmosphere layers. Combat models retain ground shadows; authored room art, its own atmosphere, attacks and mechanic warnings remain. Fixed-size model layout is contained without clipping weapon swings.
6. **Room traversal lost coordinate ownership.** Ashen's traversal updated `--unit-left/top`; spatial presentation retained inline `left/top !important`. Exits could complete their timers and fade while the party stayed pinned. The shared spatial owner now exposes `movePresentation`, interpolating from the actual visible position along the room's authored exit route. The encounter planner is suspended during departure; new combat resets traversal state. Route planning uses visible positions rather than stale logical destinations.
7. **Async entry and playback races.** A cancelled entry could finish its pending persistence/service request and reopen combat. A finishing old playback could clear a newer session. Entry generation guards, playback-local references, explicit session stop on departure, disconnected spawn guards and hidden-scene disposal address those races. Entry errors restore the button instead of leaving ENTERING permanently disabled.
8. **Suspension mismatch.** Simulation paused while hidden, but rig/cast wall-clock deadlines expired. Presentation time now excludes hidden duration, and live dungeon/quest loops reset their wall anchor on visibility changes. Resume does not fast-forward effects or consume hidden wall time.

## Architecture and boundaries

- Existing vanilla DOM/SVG renderer, rig, equipment pivots and spatial planner are retained; no React or replacement rendering engine was introduced.
- Damage, cooldowns, resources, threat, tactical-command rules, encounter restrictions, rewards and progression logic are unchanged.
- Next-room image decoding is bounded, limited to two cached promises, and cannot block navigation indefinitely. Ashen preloads during the prior fight and retains its exit fade while awaiting the next image; Fractured preloads the next authored room during combat.
- Shared changes apply to standard PvE/PvP renderers. Ashen has authored multi-waypoint exits; Fractured uses quest combat with per-era shells and automatic continuation. Hollow, Chaos and Blackout have their own navigation adapters; they were inspected, not replaced by Ashen's route system. Manor and world-boss adapters retain their own progression rules.
- No guarantee is made about unplayed custom navigation routes or physical-device performance.

## Reproduction and evidence

Use Playwright 1.51.1 with installed Chromium. `npm run build` prepares assets.

```sh
node tests/combat-realtime.browser.cjs
CELLBOUND_REALTIME_RECORD=1 CELLBOUND_REALTIME_LABEL=after node tests/combat-realtime.browser.cjs
CELLBOUND_REALTIME_BASELINE=/path/to/built/a480222-worktree CELLBOUND_REALTIME_RECORD=1 CELLBOUND_REALTIME_LABEL=before node tests/combat-realtime.browser.cjs
CELLBOUND_REALTIME_MOBILE=1 CELLBOUND_REALTIME_LABEL=mobile node tests/combat-realtime.browser.cjs
CELLBOUND_REALTIME_PORTRAIT=1 CELLBOUND_REALTIME_LABEL=portrait node tests/combat-realtime.browser.cjs
CELLBOUND_REALTIME_NAVIGATION=1 node tests/combat-realtime.browser.cjs
CELLBOUND_REALTIME_FULL_RUN=1 node tests/combat-room-transitions.browser.cjs
```

The Mercer fixture uses the real Fractured Ages entry, production DOM/art, real live session, real events, five equipped characters and a Hunter pet. Backend persistence is an isolated test fixture, not a real player account. The simulation never freezes for screenshots and is not accelerated. Navigation coverage uses a stronger test party to finish rooms. Recordings are continuous; static pose captures in the existing animation regression are separate from the live benchmark.

Metrics are RAF intervals, not proof of GPU presentation or input-to-photon latency. Run benchmarks serially: concurrent browser tests materially reduce performance in this container. Compare unrecorded measurements separately from profiler/video captures. Physical iPad/Safari is unavailable; local WebKit cannot launch because required GTK/GStreamer and other libraries are missing.

## Validation results

- Production build, appearance suite and all 52 core suites passed. Core coverage includes deterministic combat invariance, spatial reservations, equipment/rig matrices and the new shared-clock suspension test.
- Real Ashen Guardian browser regression passed: articulated joints, impact timing, block/miss/dodge, interrupt/control, death/recovery, reduced motion, resize, engine invariance and cleanup.
- All 13 existing classes passed the actual-encounter animation regression. This verifies existing integration; it is not a claim of newly authored animation content or visual approval of every ability.
- Arena, Capture the Flag and King of the Hill passed ten-participant spatial/event/Spread/resize/teardown regressions, with no unresolved reservations in those fixtures.
- Fractured Ages passed live Mercer combat, Wanted Mark resolution, immediate Spread feedback, hidden-tab pause/resume and departure cleanup. Navigation passed Mercer victory, entry to Iron Kingdom, departure and cancellation while asynchronous entry persistence was pending.
- Ashen passed all seven encounters, authored room traversal, boss briefing, completion and close/re-entry with no browser errors. Completion uses the isolated mock-server contract; live reward persistence was not exercised against a player account. The full run recorded 913 position samples, including 171 traversal samples.

### Performance

Serial Chromium measurements at 1366 × 1024 in the container:

| Capture | Before | After |
| --- | ---: | ---: |
| Unrecorded average RAF rate | 18.15 FPS | 26.84 FPS |
| Unrecorded p95 frame interval | 100.1 ms | 66.7 ms |
| Unrecorded maximum interval | 183.3 ms | 99.9 ms |
| Matching live video average RAF rate | 15.88 FPS | 22.53 FPS |
| Matching live video p95 interval | 116.7 ms | 83.3 ms |
| Matching live video long tasks | 83 | 39 |

The recorded after fixture sampled 29 distinct weapon-arm poses during 20 seconds, compared with 23 before. Spread updated its disabled state synchronously in a measured 3.1 ms handler; this is not input-to-photon latency. Video recording has measurable overhead. Metrics are single-run diagnostics, not a statistical device certification.

### Remaining limitations

- The container does not meet the requested consistent 30–60 FPS target. Physical iPad/Mobile Safari remains unverified; local WebKit is blocked by missing operating-system libraries.
- Full Fractured completion/re-entry after completion, Hollow Sanctum, Chaos Canyon, Blackout Station, Manor, world-boss and tutorial navigation were not all played end to end in this job. Their shared contracts and unchanged adapters do not substitute for interactive coverage.
- The full Ashen run tests sustained multi-room activity and teardown, but is not a long-duration memory-leak certification.
- Existing narrow-screen layout and occasional boss/nameplate congestion remain. This job does not redesign combat UI or replace the spatial system.
- Staging release revision, final viewport checks and evidence links belong in the delivery report. Production is not a target.
