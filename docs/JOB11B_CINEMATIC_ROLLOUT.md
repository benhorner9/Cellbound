# Job 11B — Cinematic Combat Reborn across the whole game

## Release scope
Extends the owner-approved Job 11A illustrated-combat atmosphere to every battlefield using the existing shared Combat Reborn visual engine. No new combat engines, content revisions, modified rewards or database migrations.

### Per-venue colour treatment
- Ashen Vault retains its existing bespoke showcase, no double mount.
- Hollow Sanctum uses cold blue-arcane haze.
- Chaos Canyon uses earthy/green motes and light.
- Blackout Station uses industrial/cyan electric atmosphere.
- Fractured Ages uses purple time-warped ambient light.
- Manor uses warm/gothic accents.
- PvP arenas, CTF and King of the Hill use neutral crimson team-compatible framing.
- Quest encounters, The Twelve Below, world bosses, Null Complex and shared dungeon rooms each use an appropriate subdued palette.

The shared layer is driven by real **\`cellbound:combat-visual\`** events; mechanics and result state remain wholly owned by Combat Reborn. Phase changes, telegraphs, successful interrupts, critical hits, healing and boss defeats can add low-cost, non-interactive light effects behind the existing mechanics.

Existing scene-specific art and layout remain untouched. No artwork is replaced or regenerated. All current character/boss portraits receive consistent cinematic framing where supported. The active Combat UI Editor can continue to place/resize HUD components.

### Runtime and performance guarantees
- Automatically mounts when Combat Reborn mounts the battlefield **or** dispatches events, including engines with a private mount closure.
- Theme is re-evaluated when a reused arena changes class or encounter; no accumulating duplicate overlays.
- At most ten ambient particles and six event bursts per battlefield; CSS animations only; no extra RAF loop, fetching, sound or simulation.
- All cinematic layers are \`pointer-events:none\`, below active mechanic warnings and units.
- Reduced motion and device data-saver suppress effects; WebKit browser/iPad viewport regression added.
- A failed cinematic component cannot edit or change encounters, rewards or published content.

### Tests
\`tests/combat-cinematic-global.browser.cjs\` covers 11 representative venue configurations, duplicate mount prevention, phase/interrupt/critical event response, scene reuse, telegraph depth, controls and reduced motion in Chromium and WebKit. Existing core tests and full real combat regression suites remain release gates.

### iPad acceptance
On the dev game, play a sample fight in Ashen Vault, Hollow Sanctum, Chaos Canyon, Blackout Station, Fractured Ages, The Twelve Below, Manor, a quest fight, world boss, and PvP owner practice. Confirm atmosphere is coherent with each painting and all party commands, dodge warnings, target selection, meters, exit and chat remain usable in both orientations.

**Note:** This rollout extends the **cinematic presentation treatment**, not full-body actor sprite replacement or new individual illustrated room assets. Those are future art-production stages and should not be represented as delivered.
