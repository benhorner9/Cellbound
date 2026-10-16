# Episode 2 foundation implementation — not expansion sign-off

Base: staging `3130a252cdc490ef19de9afe58dc6d430f2250b3`.
Review target: `staging`. No production or staging deployment has been made by this change.

## Actual implementation

- The shared character cap is 30. The Episode 1 XP curve/rewards are unchanged.
- Talent budgets stay at eight through Level 17, then rise to nine at 18, ten at 22, eleven at 26 and twelve at 30. Existing V2 allocations survive. Capstones remain mutually exclusive.
- Campaign and all five Episode 1 dungeon XP award paths now recalculate the legacy talent counter from the budget instead of adding one point per gained level.
- `src/episodes/episode-two-v1.js` supplies stable quest/dungeon/raid IDs, all seven ordered quest-objective/dialogue records, the exact dependency graph, three derived world-state IDs, per-account migration, a pure event reducer, first/repeat reward records, run history, and a UI-facing prerequisite/status API.
- Episode 2 state is included in the existing account snapshot during game load. Identity mismatches and unknown save versions are rejected instead of silently resetting progress.
- Unlock eligibility checks only the actual narrative completion boolean: `questSystem.nullComplex.complete === true`. Neither `progression.nullComplexUnlocked` nor repeatable floors count.
- Both raid-mode identifiers use the same progression definitions. This is **not** implementation of either playable raid mode.
- The existing PvP armoury purchase function and requirements copy now enforce equipment tiers at Levels 20, 25 and 30. Existing equipment is retained. PvP remains disabled by the pre-existing staging launch gate.
- New tests exercise progression ordering, retries, migration, runtime talents/abilities, canonical combat scaling, PvP purchases, and browser normalization.
- Repaired a timing race in the existing room-transition browser test: it stopped sampling immediately when the stage counter incremented, before room 2 mounted. It now awaits that room's rendered fade-in before evaluating the unchanged fade assertions.

## Important source findings

1. The repository's approved staging configuration shares `jvydqeikdpelmtloulnd` with production. The connected account exposes only that Cellbound project; the other project is unrelated coaching infrastructure.
2. `main` still has `PLAYER_LEVEL_CAP=15`. Its `normalizeCharacter` path clamps higher saved levels. Deploying this patch against the shared account store before resolving old-client compatibility could let an older client save a downgraded roster. Do not merge/deploy this draft until that risk is resolved through backend isolation or a tested compatibility migration.
3. Manor's database constraints and RPCs are specific to the `manor` raid ID. Naming Episode 2 raid stages does not make its cooperative infrastructure support them.
4. Current staging allows all thirteen classes and explicitly disables public PvP. This patch does not silently reverse either pre-existing decision. Five requested beta classes receive additional Level 20/25/30 probes; all thirteen remain in legacy talent/role regression coverage.
5. No remote schema, account, reward, membership or production-site state was changed during this implementation.

## XP allocation evidence

The reducer tests exercise all six legal interleavings of each investigation pair, in both raid-mode labels: 6 × 6 × 2 = 72 routes. Each route starts with five Level 15 characters at zero XP. This is mathematical/reducer evidence, **not** an actual campaign playthrough.

| Milestone | First-clear XP per active character | Level after milestone |
| --- | ---: | ---: |
| Quest 1 | 4,300 | 16 |
| Quests 2 + 3 and Dungeons 1 + 2 | 25,250 combined | 21 |
| Quest 4 | 5,800 | 22 |
| Raid 1 | 6,050 | 23 |
| Quests 5 + 6 and Dungeons 3 + 4 | 34,000 combined | 28 |
| Quest 7 | 15,350 | 30 |
| Raid 2 | 0 at cap | 30 |
| Total | **90,750** | **30 before Raid 2** |

Quests 2/3 each award 9,250; Dungeons 1/2 each award 3,375. Quests 5/6 each award 13,000; Dungeons 3/4 each award 4,000. Recommended levels are not access locks. Repeat dungeon/raid XP is defined separately. Raid reward lockouts still need to be connected to the existing server infrastructure before these rewards can be used in gameplay.

## Quest completion matrix

| ID | Quest | Objective/dialogue records | Playable stages/comics |
| --- | --- | ---: | --- |
| e2_q01 | After the Breach | 6 | Not implemented |
| e2_q02 | Ash in the Wheat | 8 | Not implemented |
| e2_q03 | Water That Moves | 6 | Not implemented |
| e2_q04 | The Harvest Code | 6 | Not implemented |
| e2_q05 | Hunted by the Prototype | 6 | Not implemented |
| e2_q06 | Voices Under the Soil | 7 | Not implemented |
| e2_q07 | No More Containment | 8 | Not implemented |

## Dungeon and raid matrix

| ID | Location | Defined room/stage IDs | Real encounters, loot and multiplayer |
| --- | --- | ---: | --- |
| e2_d01 | Rotroot Cellars | 6 | Not implemented |
| e2_d02 | Floodgate Nine | 6 | Not implemented |
| e2_d03 | The Glasshouse | 6 | Not implemented |
| e2_d04 | The Buried Silo | 6 | Not implemented |
| e2_r01 | The Harvest Array | 4 | Neither raid mode implemented |
| e2_r02 | The Harvest Heart | 5 | Neither raid mode implemented |

The final raid's domain rule refuses to clear the Subject Zero stage without an explicit survival result. The actual rescue encounter, its authenticated outcome and its visual presentation remain outstanding.

## Executed checks

| Check | Result and scope |
| --- | --- |
| Baseline `npm run build` | Pass, exit 0. Existing caught Design Booth fixture warnings also occur before this patch. |
| Baseline `npm run test:core` | 67/67 pass. |
| Modified `npm run build` | Pass, exit 0; new runtime included in flat production package. |
| Modified `npm run test:core` | 70/70 pass after adding three domain/engine/PvP suites. |
| `npm run test:talents` | Pass: 13 classes, 28 specs, 252 existing talents, 196 bonus talents, 56 capstones, 113 engine self-tests. |
| `node tests/talent-runtime-effects.cjs` | Pass: 784 bonus-effect checks and 252 gated-ability checks at Levels 15/20/25/30. |
| `npm run test:role-balance` | Pass: existing 386 seeded simulations, six campaign/raid stages, Manor and Arena probes. These are Episode 1 regressions, not Episode 2 encounter balancing. |
| `npm run test:appearance` | Pass for the existing artwork/equipment catalogue. No Episode 2 art exists yet. |
| `node tests/episode-two-progression.cjs` | Pass: 72 routes; first/repeat claims; duplicate events; stale revisions; wipe/abandon/resume; legacy gear/flags; identity separation; Zero survival rule. |
| `node tests/episode-two-combat-scaling.cjs` | Pass: 60 synthetic canonical-engine probes, five beta classes, ten specs, two legal builds at Levels 20/25/30. |
| `node tests/episode-two-pvp-brackets.cjs` | Pass: actual purchase handler accepts 20/25/30, rejects underlevel/repeated spending, displays requirements. |
| `node tests/episode-two-foundation.browser.cjs` | Chromium pass at 1024×1366, 390×844 and 1440×900. Real game XP/normalization/render paths; mocked backend. |
| Full `npm run test:browser` | See accompanying test-results JSON for final status. Initial runtime-browser attempt failed to launch all 33 tests; pinned Playwright 1.51.1 installed successfully and the suite was rerun. |
| WebKit foundation test | Blocked: required host libraries missing. `install-deps webkit` failed with environment `setgroups`/`seteuid` restrictions. No WebKit pass claimed. |
| Actual iPad Safari, two humans, remote persistence | Not executed. |

## Remaining release work

**No expansion block is signed off as complete in the actual game.** No placeholder campaign UI was exposed.

- Build and connect all quest interactions, combat, hub/world maps and journal/menu actions.
- Implement every dungeon and raid encounter in the established engines; retain Manor group readiness, synchronization, reconnection and lockouts.
- Add authenticated event validation, atomic server reward settlement and cross-device conflict handling. Reducer revisions and local claim records alone are not server idempotency or anti-cheat.
- Build the actual gear families, named drops, profession recipes/materials, achievements and editor/owner QA interfaces. Equipment-band metadata alone is not a reward catalogue.
- Produce and integrate all 28 comic scenes/84 panels, hub/world states, rooms, sprites, equipment appearances and effects. **Artwork delivered by this patch: 0 scenes / 0 panels.**
- Validate every real encounter and progression path, both raid modes, all save/account scenarios, and iPad/Safari/phone/desktop layouts.
- Resolve shared-backend old-client compatibility before any Level 30 staging deployment.
- Deploy an exact, tested staging SHA and collect the requested visual/playthrough evidence. The existing staging URL is not evidence that this branch was deployed.

No new Morrowfields screenshots, dungeon/raid captures, live-save evidence, complete campaign timings or multiplayer pass claims are available from this foundation patch.
