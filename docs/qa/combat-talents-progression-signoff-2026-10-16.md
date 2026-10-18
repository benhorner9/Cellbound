# Cellbound — Combat, Talents, Equipment & Progression: Release Sign-off

**Date:** 16 October 2026  
**Scope:** staging / Chapter 0–Episode 1, all 13 classes and 28 specialisations (beta unlock restrictions remain separate).  
**Decision:** **NOT APPROVED FOR PRODUCTION — browser release gates outstanding**. This is a current QA record, not a claim that every device or progression path has been manually tested.

## Baseline evidence (completed run)
- Commit: `8595a36247b8d3f4a7e80f7ee4f04136c4c45771`
- [GitHub Actions browser QA run 38860124329](https://github.com/benhorner9/Cellbound/actions/runs/38860124329)
- Chromium: **30 / 32** browser tests passed. Failures: `blacksmith-forge.browser.cjs` (clock initialization in test), `gameplay-regression.browser.cjs` (obsolete embedded-PvP selectors).
- WebKit: **26 / 32** passed. Failures: `combat-animation.browser.cjs` (late contact feedback), `combat-realtime.browser.cjs` (few authoritative steps while rendering slow), `combat-room-transitions.browser.cjs` (party travel not visibly moving), `combat-spatial.browser.cjs` (actors not reaching reservations), `gameplay-regression.browser.cjs` (obsolete embedded-PvP selectors), and `monster-art.browser.cjs` (attack frames not observed for each monster).
- Completed Chromium and WebKit full-playthrough browser checks passed; this **does not** cover an actual device or live user persistence end to end.

## Subsequent corrections awaiting completed CI verification
- `ad873999`: gameplay regression now follows the full-screen PvP overlay and PvP arena artwork; it still asserts models, teams, effects and clean exit.
- `37766299`: forge regression primes the focus clock before time-jumping; it still checks cold forge, reheats, input reservation, material refunds and batch rewards.
- `2f6b6773`, `2c96e5cc`, `afecd670`: collision-checked elapsed-time movement integration, viewer hookup and low-frame-rate/long-suspension regression.
- Earlier staging fixes: Twelve Below command deck, authored animation and impact test expectations, and preservation of painted combat-entry positions.

## Functional gates to preserve
1. `npm run build` and `npm run test:core` pass on the exact release SHA (includes Combat Reborn self-tests and talent runtime effects).
2. `npm run test:talents`, `npm run test:role-balance`, `node tests/talent-runtime-effects.cjs`, `node tests/beta-balance.cjs` pass. No dead points, orphaned talent-gated abilities, impossible capstones, invalid respec windows or unintended XP/reward changes.
3. `node tests/combat-class-animation.cjs`, `node tests/combat-vfx-block1.cjs` and the browser animation checks pass, including skill-specific cast/contact/impact, death/revive, interruptions, equipment sockets, mobile layout, reduced motion and all encounter entry points.
4. `node tests/equipment-fit-matrix.cjs` and the Chromium/WebKit fitting and character appearance suites pass for compatible gear and race/sex/body variants.
5. **All 32 / 32 browser regressions in both Chromium and WebKit** on one and the same staging SHA; no test disabled, downgraded, skipped or declared passing based on a green staging deployment.
6. Visual movement must be smooth on a real 13-inch iPad in portrait and landscape (not just WebKit headless): no room-entry teleport, frozen actor movement, missing ability effects, overlaps, off-screen commands or disappearing enemies.
7. Owner/manual playthrough: new account → character creation → early progression → level 15 → appropriate gear → heroic content → Manor/Null Complex, with save/reload, talent allocation/respec, combat exit/reentry, loot/rewards and account isolation checked. Test at least tank/healer/DPS and one ranged and one melee class.
8. Confirm production deployment is a separate, explicit action after QA sign-off; **do not** promote staging automatically as a workaround.

## Acceptance decision record
- Talent build logic and measurable runtime effects: prior automated coverage **passed**; reconfirm on release SHA.
- PvE balance and level/gear ladder: prior simulation and contract checks **passed**; live-player calibration remains ongoing.
- Equipment fit: broad automated structural and browser checks **passed**; physical iPad visual acceptance pending.
- Combat and ability animations: **blocked** by WebKit timing and monster-art coverage.
- Real-time movement and room transitions: **blocked** by WebKit rendering/trajectory checks.
- Full release: **HOLD** until all gates above have verified evidence.

**Owner approval:** not recorded. **Production approval:** not recorded.
