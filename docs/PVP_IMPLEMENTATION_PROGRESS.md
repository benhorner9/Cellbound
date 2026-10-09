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
