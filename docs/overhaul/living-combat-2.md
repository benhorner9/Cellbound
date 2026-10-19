# Living World & Combat 2 — first working control block

Status: incremental implementation, **not the completed overhaul**. Implementation branch: `overhaul/living-combat-2`. Base and recoverable checkpoint: `09a4be6d556ed3e35852e42308ec3a0e44d4dd55`, branch `checkpoint/pre-living-combat-2`. Engine version: `1.8.0-control-preview`; control transcript version: `1`.

## Architecture audit and preservation

The repository is a flat-deployed JavaScript application with domain sources remapped by `tools/runtime-manifest.cjs`. `build.js` validates contracts, flattens those sources and combines late UI CSS. Extending this application does not require restarting it.

| Component | Responsibility and decision |
| --- | --- |
| `src/combat/combat-reborn-v1.js` | Canonical 100 ms deterministic simulation: resources, talents, threat, damage/healing, movement/collision, pets, mechanics, live sessions and replay. Extended in place. |
| `src/combat/combat-data-v1.js`, `class-build-v1.js`, `combat-identities-v1.js` | Existing class catalogue, loadout validation, level/talent restrictions, identity and balance. Preserved; direct abilities come only from the normalized equipped loadout. |
| `src/combat/combat-standard-v1.js` | Shared simulation/live-session gateway and event dispatch. Reused. |
| `combat-viewer-v1.js`, `combat-hud-standard-v1.js`, portraits, animation catalogue, animation and physical/spatial modules | Shared presentation. Reused. Control mode bypasses cosmetic formation repositioning: displayed positions follow the actual simulation, including pets. Legacy presentation is unchanged. |
| `src/dungeons/dungeon-2d-v1.js` | Ashen stage/room data, live session integration, shared encounter shell, lifecycle and reward integration. Owner trial uses the existing shared **external encounter** path with a deep-cloned party and no rewards/consumables/save callbacks. |
| `src/dungeons/dungeon-generator-v1.js` | Procedural content/room authoring; retained. It does not need to become a combat engine. |
| Other dungeon modules, quests, Manor, Null, Morrowfields | Existing adapters use the shared simulation/viewer but retain distinct progression and lifecycle adapters. No automatic conversion or release. |
| `guild-v4.js`, gear, professions, social, guild and membership modules | Account normalization, ownership, loadouts, equipment and persistence. Preserved; no save schema, item, roster or economy migration. |
| `server/episodes/*`, generated episode worker, release RPCs/migrations | Newer story content uses trusted attempts and deterministic replay. Legacy Episode 1 still has client-driven progression paths. The new replay validator is not yet wired to reward settlement; reward-bearing control must stay disabled. |
| `server/pvp/*`, PvP rules/objectives | Preserved. Direct control rejects PvP sessions. No ratings, queues or PvP release changes. |

This is an architecture/dependency audit, not certification that every existing ability, administrative feature or progression path is defect-free. Existing regressions remain the preservation gate.

### Environment findings

- `staging` targets `https://cb.athleticsmanagergame.com/`; `main` is the manual production release line.
- The committed development configuration selects a separate backend (`zrvehixcthljiktcctne`), and `verify-booth-staging.cjs` rejects the former shared production backend.
- The actual staging deploy workflow runs build/core/balance/appearance checks. Browser QA runs separately, despite older `DEPLOYMENT.md` wording suggesting a single all-tests gate. This change does not relax deployment checks.
- Production builds do **not** receive `CELLBOUND_CONTROL_PREVIEW`. The entry requires that build flag and the existing owner role. These are UI exposure restrictions, not a new server authorization boundary: the test has no reward/write authority.
- No database, auth, episode activation, account reset or production deployment is included.

## Implemented behaviour

- Opt-in control in one existing live session. Select any living hero or return all heroes to AI. Health, resources, cooldowns, casts, positions, enemy threat and encounter time survive switching.
- Tap ground to move through the engine's arena/walkable/obstacle/body collision rules. Direct movement is speed bounded at 22 arena units/second. Changing destination cannot fast-forward the simulation.
- Tap enemy or ally to select that hero's target; it does not silently issue a party focus order.
- Manual equipped abilities use existing resolution, costs, talent discounts, range, line of sight, combo points, healing, taunts, defensive and pet rules. Interrupts require a real interruptible cast and a valid equipped ability. Ordinary basic attacks continue while standing in range; the other four heroes keep their existing AI rotations.
- Control-mode cast cancellation invalidates queued spell completion. The legacy behaviour is retained outside the opt-in mode until its balance effects can be migrated deliberately.
- Eight orders: Focus Target, Defend Healer, Regroup, Spread Out, Hold Position, Full Attack, Retreat, Interrupt. Orders retain command power/shared/per-order cooldowns. Movement orders exclude the controlled hero. Full Attack changes cooldown policy; Defend Healer prioritizes enemies threatening the healer; Retreat is a temporary AI movement/disengagement order, **not expedition abandonment or reward settlement**. Hunter pets follow retreating owners.
- Regroup, spread and retreat retain their destination across navigation waypoints; the wall-routing regression verifies retreat reaches the safe side instead of stopping at the first path leg.
- Common Ashen circle, multi-circle, line and cone telegraphs share simulation geometry with their rendered shapes. Damage checks actual positions rather than granting a successful dodge from a cosmetic movement or random response flag.
- A compact HUD has five existing character portraits with health/resource bars, active ability buttons, target information, command drawer and optional existing meters/chat. The battlefield and HUD occupy separate layout regions.
- Existing Ashen room art, seven encounter definitions, enemy mechanics and shared animation/portrait assets are reused. An owner can clear each chamber, continue to the next with HP/resources/cooldowns carried, retry, or leave. This is encounter testing, **not seamless exploration**.
- `server/combat/control-replay.cjs` validates a bounded, ordered, tick-aligned action transcript against trusted encounter options using this same engine. It rejects unknown fields, foreign heroes, impossible actions and invalid timing. It has no network/reward/store API. A future endpoint must authenticate, load the trusted roster/seed, enforce wall time/episode access and atomically settle attempts once.

### How to test after an approved development deployment

Sign in as owner on the development client, prepare a valid five-hero Ashen party, open the Ashen Vault briefing, and choose **TEST HERO CONTROL · NO REWARDS**. Tap a hero; tap the ground to move or a unit to target; use the ability row or Party orders. **All AI** restores automatic control. Closing the test leaves the saved party unchanged.

Normal dungeon entry continues to use the previous reward-bearing experience. The test is intentionally explicit about its lack of rewards.

## Validation evidence

The source tests live in `tests/living-control-v2.cjs` and `tests/living-control-v2.browser.cjs` and are automatically included in the repository QA inventory. Browser captures and journey JSON are written to `/tmp/cellbound-control-evidence/`.

- New behavioural scenarios cover switching/continuity, manual damage/healing, cooldown rejection, AI handover, cast cancellation, obstacle routing/speed, party orders, pet spawn/lifecycle, deterministic replay/tampering, manual interrupts, positional dodging and stop/default-mode guards.
- Browser test drives real touch clicks and the production shared viewer/engine with local fixture accounts. It checks iPad 1366×1024, phone 390×844 and desktop 1440×900, then plays all seven existing Ashen chambers and verifies the source roster did not change. It does not authenticate to a hosted backend or touch live player data.
- Initial Chromium seven-chamber run: all victories, 5 heroes each, 5.4–9.4 simulated seconds per room with an intentionally overlevelled Level 15 fixture. This is regression evidence, **not a campaign duration or balance measurement**.
- Existing role balance suite: 13 classes, 28 specs, 386 seeded simulations, 30 tank/healer combinations and Arena checks. This verifies preservation of the default AI mode, **not a completed balance pass for direct control**.
- Local WebKit could be downloaded but cannot launch because system libraries are missing. The dependency installer fails in this environment. Real iPad Safari/hardware validation remains required unless CI subsequently supplies WebKit evidence.
- The engine size budget increases from 350 KB to a bounded 370 KB to accommodate the control/geometry/replay integration. CSS joins the existing bundle, retaining the 50-request stylesheet limit.

### Publication and release status

The owner explicitly approved publishing the source to the public repository and deploying to development only. Branch `overhaul/living-combat-2` is published; PR #236 targets `staging`. The rollback branch `checkpoint/pre-living-combat-2` retains the baseline. No production deployment or database migration is included.

The first PR run passed build, 79 core suites, Episode continuity and all 36 Chromium browser suites. The new control journey also passed WebKit: seven victories, five heroes per chamber, iPad/phone/desktop layouts, no runtime errors or missing resources, and unchanged fixture account. The complete WebKit gate failed: fixed-delay animation/spatial checks failed, a room browser closed, and the job exhausted its 20-minute budget. The log also exposed a real timeline cleanup ReferenceError from an undefined listener; that is corrected in the follow-up commit.

The follow-up retains every browser suite and the final required gate, dividing each browser's sorted inventory into three disjoint groups. Timing checks wait for the same movement/attack conditions instead of assuming a fixed number of seconds is sufficient. The realtime animation probe counts changing poses across both arms of all heroes instead of only the first tank's weapon arm. Asynchronous encounter teardown errors are now observed before the test closes. Deployment must wait for all six groups and the final gate to succeed.

The second CI run completed all groups: Chromium 36/36; WebKit 34/36. Remaining failures were a native WebKit renderer crash during Ashen transitions and a warm-cache image-fallback fixture. The follow-up preserves painted entry centres before the animation/spatial handover, preventing an observed 391 px entry jump. Image failure is tested in a fresh browser context with an asserted aborted network request. Playwright is pinned to 1.64.1 for the main PR, staging-browser and Episode continuity workflows. The old WebKit crashed with JIT enabled; its diagnostic JIT-disabled run passed, and the newer WebKit passed the unchanged room/pet/departure assertions with default JIT enabled. CI does not disable JIT or skip tests. The full final validation remains mandatory before deployment.

The configured development target is `https://cb.athleticsmanagergame.com/`. Before merge it still serves baseline `09a4be6d556ed3e35852e42308ec3a0e44d4dd55`. Deployment success must be confirmed by its HTTPS `build-meta.json` and served assets, not inferred from local metadata or PR publication.

## Remaining work, in requested order

| Block | Status / next work |
| --- | --- |
| 1 — Architecture/preservation | Baseline, dependency map, isolated branch and compatibility strategy implemented. No migration needed for this block. |
| 2 — Direct hero control | Working opt-in engine/HUD block; wider class-specific live play and Safari/hardware checks still needed. |
| 3 — Party AI/commands | Orders implemented; existing tank/healer/DPS AI and navigation reused. Full role-by-role decision audit, long-run stuck-unit recovery and all pet transition cases remain. |
| 4 — Seamless Ashen exploration | Not implemented. The trial still uses chamber boundaries and shared encounter lifecycle. Build continuous navigable rooms, visible pre-engagement enemies, doors and a persistent camera next. |
| 5 — Expeditions | Not implemented. Branching routes, supplies, temporary injuries/fatigue, persistent condition/recovery, optional events and exploit-safe retreat settlement remain. |
| 6 — Presentation | Touch control HUD, existing portraits and authoritative position presentation implemented. Full animation/feedback pass, device performance budgets and optional joystick evaluation remain. |
| 7 — Content conversion | Seven Ashen encounters accessible in the trial only. No reward-bearing activity, Manor, PvP or Episode 2 conversion/activation. |
| 8 — Validation/release | Incremental automated/browser evidence only. Complete campaign/progression journeys, hosted action verification, atomic reward settlement and full cross-device sign-off are outstanding. |

### Next implementation boundary

Before enabling this for ordinary play: create authenticated server-owned attempt state for Episode 1, pin engine/transcript versions, load roster/equipment from trusted storage, validate transcript and elapsed time, enforce episode/access gates and grant rewards once in an atomic transaction. Test duplicate/replayed completion, changed equipment, logout/reconnect, expired sessions and old save compatibility. Then convert Ashen exploration in one persistent scene. Do not ship control as a rewarded client-reported victory path.

### Recovery

The checkpoint branch retains the original source; git history is the recovery mechanism, not a second running combat engine. Revert this scoped change or rebuild staging without the control-preview flag to remove entry. Since the trial writes no account state and introduces no migrations, there is no save-data rollback to perform.
