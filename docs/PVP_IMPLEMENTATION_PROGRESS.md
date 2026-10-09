# Cellbound PvP build status
**Updated:** 9 October 2026  
**Development branch:** `staging`  
**State:** Block 1 underway. PvP remains locked.

## Current development architecture

The staging branch is ahead of `main` in combat architecture. Its canonical files are `src/combat/combat-reborn-v1.js` (v1.7.0), `src/combat/combat-standard-v1.js` (v1.1.0 contract), and `src/combat/combat-viewer-v1.js`. It already has an incremental `createLiveSession` engine API and Command Centre primitives. **Do not replace these files with the older root-level 1.5.x engine from main.**

The retired `pvp-combat-v1.js` and `pvp-viewer-v1.js` are explicitly forbidden by staging's build check, and `pvp-v1.js` remains locked. The original client-side PvP implementation cannot simply be switched back on.

## Work completed for PvP on staging

- Added `src/combat/pvp-ruleset-v1.js` as a small **non-simulating** contract for allowed attack priority, positioning and map-specific objective orders. It does **not** create an alternate combat engine.
- Added validated Arena, Capture the Flag and King of the Hill order menus, with user-facing labels.
- Added role-priority target selection that filters dead, allied, stealthed, invisible, untargetable and blocked-line-of-sight candidates.
- Added independent rating arithmetic for equal/higher/lower opponents (Elo K=32 starting at 1000), expanding matchmaking bands (±75, growing 50 every 15 seconds to max ±500), **mutual** queue compatibility and the draft Arena entry requirement (20 BG wins plus average PvP gear score 90 in the chosen 2/3/5-character squad).
- Registered the rules module in `tools/runtime-manifest.cjs` and `guild.html` (loaded before `pvp-v1.js`).
- Added `tests/pvp-ruleset.contract.cjs` and made `build.js` require it. The staging build explicitly checks that the runtime ships and the HTML loads the module.
- Verified the contract independently, including Elo examples, illegal commands, target safety, 2v2 gate and queue widening.

## Remaining work to complete Block 1

1. Adapt the **existing** staging `createLiveSession` to symmetric player-versus-player sides using Combat Reborn's class skill rules, shared physics, events and statuses. Preserve the current PvE command and combat result contracts.
2. Move CTF flag state, KOTH active hill control and Arena elimination/Cellstorm logic into gameplay rulesets owned by that unified engine; avoid reinstating `pvp-combat-v1.js`.
3. Implement a trusted match coordinator: queue identity, roster locks, command validation, tick scheduling, connection/reconnect, event streaming and one-time outcome settlement. The client-side rules helper and rating formula are not a secure ranking service.
4. Feed the canonical Combat Reborn events into the existing shared CB2D viewer with PvP-specific overlay elements, not another dedicated viewer.
5. Add two-account multiplayer tests, iPad browser tests, latency tests, reward/AFK/abuse protections and proper staging deployment validation.

## Safety and access

`pvp-v1.js` retains the regular-player lock. **No real matchmaking, Arena payout, BG payout or deployed match has been enabled by this block.** New scripts may be present in staging source without the staging FTP site automatically reflecting them: staging deployment uses an explicit GitHub Actions workflow_dispatch action.

The master gameplay design is in `PVP_REBUILD_MASTER_PLAN.md` on `main`. This staging status is the branch-specific implementation record.


## Update — symmetric Arena combat prototype (9 October 2026)

Implemented in **staging** under the *existing* canonical `src/combat/combat-reborn-v1.js` v1.7.0 — no second PvP simulator or viewer:

- **2v2, 3v3 and 5v5** character-vs-character teams using normal class skill loadouts, shared damage, health, mitigation, movement/physical collision, casts, healing, statuses and Combat Reborn events.
- `CellboundCombatStandard.createPvpSession(...)` wraps the same Combat Reborn `createLiveSession(...)`, with `profile:'pvp'` so the shared combat-event dispatch can distinguish PvP.
- `session.pvpCommand(team,category,value)` validates team, mode, target/position/objective command, cooldown, and emits `PVP_COMMAND`. Attack Healer/Tank/DPS changes actual target selection; Spread/Group Up/Fall Back/Push Forward/Regroup create canonical movement orders. Arena pressure/peel objectives can update target strategy.
- Team IDs are carried in `COMBAT_START`; death events and match-end events are canonical. Timeout results rank surviving headcount and remaining health, with a genuine draw only on a tie.
- **Security/safety:** This is a local engine **simulation prototype only**, not a trusted multiplayer coordinator. It cannot mint ratings, War Marks, Arena Seals or season currency. In PvP sessions, external PvE heal/spawn/command APIs are not exported. Player-versus-player threat tables are ignored. Friendly fire, opposing-team healing and opposing-team revives are prohibited, including delayed group heal spells.
- **Regression test:** `tests/pvp-arena.integration.cjs` checks determinism, event stream completeness, two teams, actual class ability/damage/healing, tactical movement, role/position orders, team isolation, invalid rosters, safe match APIs, PvE gateway compatibility, and all **113 Combat Reborn self-tests**. This test now runs during `npm run build`.

**Not yet complete:** Canonical CTF/KOTH objectives and real flag/hill rules; 2D PvP overlays on the shared viewer; real player queues/server tick authority; match persistence/reconnect/AFK/anti-cheat; ranked points, rewards and seasons. The current `pvp-v1.js` remains locked. No new FTP staging deployment was triggered here.

**Next recommended engineering step:** Port Arena storm/dampening and the battleground objective modules onto the shared Combat Reborn session; then connect canonical events to the existing `combat-viewer-v1.js` with mode-specific overlays and build a safe owner QA room.


## Update — Cellstorm, CTF/KOTH and owner QA (9 October 2026)

Completed in the staging source on top of **the same Combat Reborn live engine and canonical viewer**:

- **Arena Cellstorm:** starts at the configured combat time, shrinks in repeatable phases toward the arena centre, emits `PVP_STORM_SHRINK` and `PVP_STORM_HIT`, and applies environmental damage through Combat Reborn's real damage/death pipeline.
- **Capture the Flag — 5v5 character squads:** two actual flags with pickup, carrier, death drop, return by friend or timeout, return-to-base captures and first-to-target win. A default runner travels to the objective via Combat Reborn movement. Orders include attack the flag carrier, recover flag, defend base, lane routes and escort carrier. Actual full captures are independently tested in the objective state-machine test.
- **King of the Hill — 5v5 character squads:** five rotating physical hills, one point per second for uncontested occupation, contested points do not score, early-rotation orders, point-target wins and battle respawns. Physical movement and fight outcomes still use Combat Reborn.
- **Battleground elimination:** BG fighters respawn instead of ending matches when all characters of one team have died. Score decides BG winner at the time limit; a tied score is a draw.
- **Arena additional orders:** kite, push and regroup use canonical movement; the previous pressure/peel target orders remain.
- **Shared viewer:** `src/combat/combat-viewer-v1.js` now has a single `renderPvpFrame` presentation adapter for unit health/positions, teams, score, flag locations, the active hill and shrinking storm. Styling is in `src/combat/pvp-objectives-v1.css`; no additional combat simulation or separate viewer has been created.
- **Owner practice room:** when `CellboundAdmin.role === 'owner'`, the locked Crucible screen displays a **development-only** practice launcher for Arena 2v2/3v3/5v5 or 5v5 CTF/KOTH with an inline viewer and blue-squad tactical buttons. It uses fixed local practice opponents. **No results, ranks, shock, saved character progression, rewards or currencies are changed.** The public PvP lock remains `pvpEnabled=()=>false`.
- **Build/test:** `tests/pvp-objectives.integration.cjs` checks storm damage, a complete flag capture, drop/return, uncontested KOTH scoring, rotation, BG respawns, 5v5 combat, deterministic results, no friendly fire/cross-team healing and 113 PvE engine self-tests. The staging build now requires this test alongside the Arena and PvP ruleset regression suites. Cache URLs were bumped for the modified core viewer and PvP screen.

**Test evidence:** three PvP test suites passed in the connected source-level test harness, and a mock canonical-viewer render successfully displayed KOTH mode/score. The complete GitHub Actions build and an iPad/WebKit UI playthrough have **not** been run in this turn. The staging FTP deploy workflow remains `workflow_dispatch` only; pushes to `staging` do not automatically make the practice room visible on `cb.athleticsmanagergame.com`.

### Still open before PvP can become public

1. Real server-owned matches, authentication, queue pairing and bot-free opponent rosters.
2. Multi-commander battlegrounds (10v10 and 20v20 characters), owner-to-squad permissions and reconnection.
3. Production art/animation refinement and iPad-only QA of map overlays, touch command usability and flag routes.
4. Server-side security checks, authoritative result settlement, Elo, BG/Arena currencies, anti-farming and 56-day seasonal resets.
5. Full staged automated deployment validation and end-to-end browser regression across other game screens.

The **owner practice room is only a development tool**, not real PvP. Do not activate the old client-side reward code to make it playable.
