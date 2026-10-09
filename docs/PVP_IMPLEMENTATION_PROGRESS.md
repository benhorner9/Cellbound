# Cellbound PvP build status
**Updated:** 9 October 2026  
**Development branch:** `staging`  
**State:** Unified combat and owner QA deployed; server-only two-account contract underway. Public PvP remains locked.

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

`pvp-v1.js` retains the regular-player lock. **No real matchmaking, Arena payout, BG payout or deployed match has been enabled by this block.** New scripts may be present in staging source without the staging FTP site automatically reflecting them: staging deployment is automated by GitHub Actions on pushes to staging, after all QA gates succeed.

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

**Test evidence:** three PvP test suites passed in the connected source-level test harness, and a mock canonical-viewer render successfully displayed KOTH mode/score. The complete GitHub Actions build and an iPad/WebKit UI playthrough have **not** been run in this turn. Staging pushes trigger the GitHub Actions QA/deploy workflow automatically. Public PvP remains locked independently of staging deployment.

### Still open before PvP can become public

1. Real server-owned matches, authentication, queue pairing and bot-free opponent rosters.
2. Multi-commander battlegrounds (10v10 and 20v20 characters), owner-to-squad permissions and reconnection.
3. Production art/animation refinement and iPad-only QA of map overlays, touch command usability and flag routes.
4. Server-side security checks, authoritative result settlement, Elo, BG/Arena currencies, anti-farming and 56-day seasonal resets.
5. Full staged automated deployment validation and end-to-end browser regression across other game screens.

The **owner practice room is only a development tool**, not real PvP. Do not activate the old client-side reward code to make it playable.


## Update — unified illustrated CB2D PvP visual and server contract (9 October 2026)

**Visual integration shipped to staging:** The owner-only Crucible Practice Room now mounts the same PvE canonical combat shell, uses the same `.cb2d-unit` character factory as dungeon/raid combat, upgrades those units with the existing Combat Portraits renderer (including appearance/equipment) and routes actual Combat Reborn event deltas to the existing `CellboundCombatFX` living presentation layer. CTF, KOTH and Arena keep their mode-specific score and objective overlays. Temporary PvP maps reuse existing illustrated Cellbound room artwork; **dedicated battleground artwork is still to be created**. Regression checks now exercise this on Chromium and WebKit. The full staging browser QA and deploy succeeded for this block.

**Initial server-only match contract:** `server/pvp/match-authority.cjs` is intentionally NOT a browser runtime asset. It composes the existing `CellboundCombatStandard.createPvpSession()` engine and models the two-account lifecycle: assigned server-sealed squads; blue/red authorization; both players ready; per-account command ownership; monotonically numbered and rate-limited commands; server-only ticks; disconnected participant grace/reconnect; ready/connection timeout; immutable completed/abandoned state. `tests/pvp-online-match.contract.cjs` is included in the build. There is no generated opponent in this match contract, no ranked service, no client-side reward minting, and no duplicate simulator.

**Critical distinction:** This is a standalone server **logic foundation**, not an online service. It does not yet persist matches, run a worker, provide authenticated HTTP/Realtime endpoints, match actual online accounts, settle results, or produce PvP rewards. The coordinator must authenticate player identity on each operation, fetch sealed rosters from trusted records, atomically persist state, run the simulation in a trusted environment, deliver event snapshots to both players, and withstand worker restarts before any online PvP mode is opened.

**Next required tasks in priority order:**
1. Database schema, transactional pairing/roster locking, RLS and per-account visibility.
2. Authenticated match-service/worker hosting Combat Reborn, durable deterministic state, command sequence validation and secure snapshot stream.
3. Two real player accounts end-to-end on iPad; reconnect and latency testing.
4. One-time authoritative BG result settlement and War Marks, then ranked Elo/season service.
5. Dedicated PvP map art and richer objective/targeting polish, followed by 10v10/20v20 multi-commander scaling.

**The public Crucible is still locked.** Owner practice changes nothing persistent.


## Update — Design Booth PvP Map Studio (9 October 2026)

The owner **Design Booth → PvP Maps** tab is wired into staging source:
- Choose an existing Arena / Capture the Flag / King of the Hill map, or create a new named map for one of those modes.
- Upload or replace an illustrated overhead background (WebP/PNG/JPEG/AVIF up to 10 MB), using the existing secure Design Booth art bucket.
- Drag, tap or numerically edit **five blue and five red spawn positions**, CTF flags, CTF lane waypoints, five rotating KOTH hills, Arena Cellstorm centre and rectangular collision/LOS cover.
- Save **owner-only cloud drafts** separately from published records. Test a draft without changing shared records. Publish to staging only after map validation, or unpublish/restore built-in locations.
- Built-in map defaults remain fallbacks. Published map geometry is applied to both PvP team spawns in Combat Reborn and the canonical CTF/KOTH/Cellstorm objective rules; uploaded artwork is shown in the canonical CB2D owner practice viewer.
- Database schema: `public.cellbound_pvp_map_drafts` (owner read/write RLS) and `public.cellbound_pvp_maps` (authenticated read, owner write). The additive migration was executed on the connected Cellbound Supabase project and is idempotent if run again from the repo.
- Build contracts: `tests/pvp-map-studio.contract.cjs` verifies real engine/objective positions and private draft lifecycle. `tests/design-booth.browser.cjs` exercises the editor in Chromium and WebKit.

**Safety boundary:** This is owner staging practice and design authoring only. PvP public queue remains locked; no ranking, PvP currency, account rewards or online multiplayer settlement is enabled by maps. The server coordinator must load trusted published map data rather than accepting an arbitrary map from a player.

**Next map-editor refinements after owner playtesting:** dedicated PvP paintings, obstacle/hazard visual polish, per-bracket Arena spawn preview and later multi-commander 10v10/20v20 extensions.

## Block 3 update — real-account matchmaking persistence (9 October 2026)

**Server/database foundation:**
- Added seven persistent tables: queue entries, matches, participants, sealed rosters, commands, events and combat snapshots. RLS is enabled on every table.
- Authenticated players may insert only their own queue identity, mode and squad size, read/cancel their own waiting entry and inspect only their own matches/events/snapshots. Neither public clients nor opponents can read private sealed roster data or write results and rewards.
- The atomic queue-pairing function uses row locks with SKIP LOCKED, requires two distinct real user accounts, and excludes anyone already assigned to an active/forming match. Execution is restricted to service_role; anonymous and authenticated clients have no pairing privilege.
- The trusted worker contract at server/pvp/matchmaking-coordinator.cjs requires server-verified rosters for both accounts and a trusted map before it prepares a lobby; an invalid roster/map cancels the lobby before combat begins.
- The database migration has been applied in the connected Cellbound Supabase project. A hardening migration restricts queue INSERT columns and allows built-in map slugs without requiring an owner-published override row.
- The new CI contract tests/pvp-persistent-matchmaking.contract.cjs guards queue permissions, real-user pairing, roster safety and fail-closed preparation.

**Database verification:** All seven new PvP multiplayer tables have RLS enabled. The pairing RPC is callable by service_role, not authenticated or anon. The real queue was empty on verification; the matching RPC returned null instead of inventing an opponent. Only user_id, mode and squad_size are client-insertable.

**Still required to play real online PvP:** The matchmaking HTTP API and beta tester access gate; a trusted, durable Combat Reborn match tick worker; ready/command endpoints; Realtime participant snapshots and reconnect; iPad two-account end-to-end tests; one-time rewards. The present owner Practice Room remains local only.

**Next priority:** Finish Block 3 with a protected real-account queue and live match service, initially one 5v5 CTF with two separate authenticated player accounts. Public PvP stays locked and no account rewards or ratings are affected.
