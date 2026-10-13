# Combat performance and monster artwork — verified batch

Scope: staging only. Baseline `bbc0298edfa63ad328a390531ae15153d5b861c0`.

This is the first integrated artwork batch, **not completion of the entire monster rebuild or the 60 FPS target**. The inventory contains 103 named entries / 99 visual identities. Seventeen new atlases cover 21 entries (four timeline echoes reuse their original identity); 82 entries remain on their existing renderer. See `monster-inventory.json` / `.csv` for names, source locations, encounter references, original rendering, artwork status and animation requirements. Published design templates and blueprints were empty in the read-only database audit; three world-boss definitions were included. No database data was changed.

## Root causes and implementation

- The recruitment roster observer appended already correctly ordered cards on every callback. Those DOM moves triggered the observer again indefinitely, including while the roster was hidden behind combat. It now moves cards only when their order actually differs.
- The physical renderer read every character's SVG socket matrix every frame, although most frames had no effects requiring those sockets. CPU sampling measured approximately 2,411 ms in `getScreenCTM` over a 20-second baseline versus 238–244 ms after the change. Live connections still read current sockets; projectiles latch the current release socket. No weapon positioning system was added.
- Nested SVG idle transforms and cosmetic drop-shadow filters caused avoidable raster work. Subtle breathing now uses the outer portrait; combat-only stacked equipment filters are removed, retaining the art, ground shadows and equipment rig. Facing remains part of the breathing scale, including mirrored units.
- Shared media-query objects, cached arena geometry and unchanged facing/depth write guards reduce repeated work. Hazard polygons are shared between units within a frame. Spatial reservations, authoritative positions, commands, simulation cadence and the 0.7× presentation pace remain unchanged.
- Enemy presentation previously mixed eight procedural icon families, a special paper-doll guardian, and cropped boss scene illustrations. A central exact-name/ID registry now selects the shipped full-body atlas, including echo aliases. Unknown or unconverted enemies retain their existing visuals; failed/slow image loading keeps a visible fallback.
- Ordinary repeated hit reactions could suppress an illustrated boss's attack pose. Light damage now adds a brief recoil while an attack/cast continues; actual interrupts, control and death retain priority. This changes presentation only.

## Artwork and animation

Each asset is a transparent 768×512 WebP atlas containing six 256×256 poses: ready, preparation, contact, cast/guard, hit and defeat. One scale is used across all six poses of a creature. The packing tool separates alpha islands, preserves soft edges, normalises padding and ground contact, and checks the texture budget. The 17 atlases total 1,728,806 bytes. Original PNG provenance, prompts, hashes and packing coordinates are recorded in `monster-art-production.json`.

Ashen Vault: Ash Cultist, Cinder Hound, Furnace Wisp, Ash Guardian, Ember Acolyte, Soul Binder, Ash Warden Kael, Embermaw, The Vaultheart. Shared add: Cave Spawn.

Fractured Ages: Deadeye Mercer, The Hollow Knight, Amun-Rael, Commander Veyra, The Old Man — Keeper of Ages, Sunbound Servant, Lunar Drone. The four existing timeline echoes share their corresponding atlas.

Humanoids, beasts, ranged enemies, casters, elementals and machines select compatible clips from the existing controller. Atlas contact poses and projectiles use that controller's actual action/contact clock. Cast preparation, hit, defeat and recovery follow its genuine events and state priorities. Floating enemies have restrained hover motion; beasts and humanoids have different motion cadence. Existing spatial footprints are refreshed when illustrated assets replace fallbacks, using rendered dimensions rather than enlarging an icon without reserving space.

The prefetch cache is limited to 12 requested images and prioritises the current/next encounter. It does not load the full catalogue. Active CSS textures remain owned by visible actors; unmounted actors are weakly held. No animation library was introduced. `sharp` and `acorn` are development-only packing/audit dependencies.

## Genuine limits

- Six authored key poses are not a full skeletal rig or a smooth multi-frame walking/attack cycle. Additional in-between and walk-cycle artwork is needed for richer motion; no claim of complete boss-specific animation coverage is made.
- Boss spell preparation uses the illustrated cast pose and existing warnings/effects. Unique phase-transition art is not included in this batch.
- Original generated sources are flattened RGBA PNGs, not editable layered paintings.
- Locked/unconverted content is inventoried, not visually certified as rebuilt. No classes or content were unlocked.
- Physical iPad Safari is unavailable here. Browser viewport tests cannot certify real-device 60 FPS, GPU memory or thermal behaviour.
- Existing compact/mobile layout limits are retained; this job does not redesign the combat interface.

## Reproduction

Run `npm ci`, `npm run build`, `npm run test:core`, `npm run test:appearance`. With Playwright installed, run `tests/monster-art.browser.cjs`, `tests/combat-animation.browser.cjs`, `tests/combat-spatial.browser.cjs` and `tests/combat-realtime.browser.cjs`.

The realtime fixture uses the production Fractured Ages entry flow, five party members, a Hunter pet and Deadeye Mercer at normal 0.7× pace. It records frame intervals, long tasks, simulation advances, actual arm poses, Wanted Mark resolution, command response, visibility suspension/resumption and teardown. `CELLBOUND_REALTIME_RECORD=1` captures video separately; video-enabled measurements must not be compared directly with unrecorded measurements. `CELLBOUND_REALTIME_PORTRAIT=1`, `CELLBOUND_REALTIME_MOBILE=1`, `CELLBOUND_REALTIME_DURATION=60000` and `CELLBOUND_REALTIME_NAVIGATION=1` select additional scenarios. `CELLBOUND_REALTIME_BASELINE=/path/to/built/worktree` replays the same fixture on the baseline.

The artwork browser fixture feeds genuine engine encounters through the shared viewer for every shipped atlas, then checks death priority and asset-failure/reduced-motion edge cases. It is labelled as coverage QA rather than an authored dungeon roster.

## Measured results

| Run | Average FPS | p95 frame time | Worst frame | Frames >33.4 ms |
|---|---:|---:|---:|---:|
| monster-baseline | 27.4 | 66.7 ms | 99.9 ms | 225/549 |
| final-landscape | 30.1 | 66.7 ms | 116.8 ms | 170/602 |
| final-portrait | 43.8 | 50.0 ms | 150.0 ms | 71/876 |
| final-mobile | 42.2 | 50.0 ms | 100.0 ms | 91/844 |
| final-extended | 38.0 | 50.0 ms | 166.7 ms | 423/2280 |

Baseline and final landscape use 1366×1024; portrait uses 1024×1366; mobile uses 390×844. The extended landscape run lasts 60 seconds. Measurements are serial, unrecorded Chromium runs in this Linux environment. The final landscape change is approximately +9.5% average FPS; p95 is unchanged. Intermediate runs ranged from 27.5 to 36.2 FPS, so this is not evidence of a stable 60 FPS result. Portrait/mobile render less battlefield area and are not direct baseline comparisons. Detailed frame intervals and engine-event traces accompany the evidence package.

## Validation results

- Production build: pass. Core QA: 53/53 pass. Appearance suite: pass.
- Atlas QA: all 17 assets have six distinct nonempty transparent poses, stable ground alignment, correct aliases and bounded dimensions/bytes; inventory explicitly marks 82 pending entries (74 procedural, eight legacy illustrations).
- Browser atlas coverage: all 17 perform actual engine-driven attacks; defeat priority, reduced motion, failed loading and cache limits pass.
- Existing combat animation QA: live Ash Guardian battle, block, hit/contact timing, articulated player grips, death/revive/control/interrupt/miss/dodge, equipment changes, reduced motion and deterministic simulation invariance pass.
- Spatial QA: Mercer plus five party members and pet, destination separation, settling, boundaries, unchanged grips and genuine Spread command pass.
- Navigation QA: Ashen room 0→1, transit, departure/re-entry; Fractured Mercer victory→Iron Kingdom, departure and cancelled asynchronous entry pass.
- Realtime QA: Wanted Mark resolves, simulation continues, player poses advance, effects stay bounded, Spread responds synchronously, hidden-tab pause/resume and disposal pass across measured viewports.
- UI regression suite: roster mutation-loop check and preceding viewport checks pass, but the existing 1280×720 PvE chat-in-frame assertion fails. Reproduced the exact same failure on baseline `bbc0298`; it is not repaired by this batch. Narrow mobile tactical controls also require scrolling in the existing layout.
- No physical iPad/Safari certification. No claim that all raids, world bosses, PvP modes or 82 unconverted enemies received new art or visual certification. Their shared gameplay contract tests pass; real-device GPU/heap behaviour and richer animation cycles remain work.

## Files changed

- `assets/monsters/v1/amun-rael.webp`
- `assets/monsters/v1/ash-cultist.webp`
- `assets/monsters/v1/ash-guardian.webp`
- `assets/monsters/v1/ash-warden-kael.webp`
- `assets/monsters/v1/cave-spawn.webp`
- `assets/monsters/v1/cinder-hound.webp`
- `assets/monsters/v1/commander-veyra.webp`
- `assets/monsters/v1/deadeye-mercer.webp`
- `assets/monsters/v1/ember-acolyte.webp`
- `assets/monsters/v1/embermaw.webp`
- `assets/monsters/v1/furnace-wisp.webp`
- `assets/monsters/v1/lunar-drone.webp`
- `assets/monsters/v1/soul-binder.webp`
- `assets/monsters/v1/sunbound-servant.webp`
- `assets/monsters/v1/the-hollow-knight.webp`
- `assets/monsters/v1/the-old-man-keeper-of-ages.webp`
- `assets/monsters/v1/the-vaultheart.webp`
- `build.js`
- `config/monster-art.json`
- `docs/qa/monster-art-production.json`
- `docs/qa/monster-inventory.csv`
- `docs/qa/monster-inventory.json`
- `docs/qa/monster-performance-2026-10-13.md`
- `docs/qa/monster-performance-results.json`
- `evolution-v1.js`
- `guild.html`
- `package-lock.json`
- `package.json`
- `src/combat/combat-animation-v1.js`
- `src/combat/combat-physical-v4.css`
- `src/combat/combat-physical-v4.js`
- `src/combat/combat-portraits-v1.js`
- `src/combat/monster-visuals-v1.css`
- `src/combat/monster-visuals-v1.js`
- `src/dungeons/dungeon-2d-v1.js`
- `src/dungeons/fractured-ages-v1.js`
- `tests/combat-animation.browser.cjs`
- `tests/monster-art.browser.cjs`
- `tests/monster-art.cjs`
- `tests/ui-performance.browser.cjs`
- `tools/monster-inventory.cjs`
- `tools/pack-monster-art.cjs`
- `tools/runtime-manifest.cjs`
