# Cellbound Job 6 — Dungeon and Manor release audit

**Scope:** Staging code at commit `929f97aaebad0e682cc06d61451a7a46b0f9032c` (10 October 2026), five standalone dungeons and The Manor raid. This is a repository and automated-regression audit, **not** a claim of live two-account multiplayer or physical iPad playtesting.

## Findings ranked by impact

| Priority | Area | Finding | Response |
| --- | --- | --- | --- |
| P0 | All five dungeons | Completion paths awarded XP, guild currency, loot and/or first-clear unlocks after `recordRun` returned `null`, an RPC error, or `valid:false`. This could present a rejected run as successful, with locally persisted rewards. | **Fixed in this PR:** require a non-error server response before final-clear rewards and events. Alert and close without final-clear rewards if not confirmed. Ashen Vault also moves its final gold, renown, shards and chase roll after verification. Earlier per-boss rewards remain governed by the boss-drop system. |
| P0 | Manor owner-only room QA | The five-second server hub refresh can reset the synthetic owner solo-QA session mid-inspection, leaving its toolbar without an active raid state. | **Fixed in this PR:** skip hub refresh while owner solo QA is running; browser regression forcibly refreshes and then advances to the Maids. |
| P0 | Manor raid loot claims | The local clear flag was set before the protected claim RPC returned; a null/empty/malformed claim could be saved as zero rewards, preventing the normal retry path. | **Fixed in this PR:** check the RPC returns exactly two T5 definitions with class and slot before mutating local raid progression or inventory. |
| P1 | Raid/WebKit ready flow | An intermittent owner-QA ready-button test failed in earlier WebKit CI; PR #208 stabilised the integration-test click and restored green CI. | Real touch interaction needs direct Safari iPad confirmation; synthetic click checks do not guarantee an actual touch sequence. |
| P1 | Server-to-client reward authority | Boss-specific bonus loot is awarded by the browser at boss stages and uses local claim bookkeeping. Full database-enforced economy validation has not been established by these tests. | Follow-on server-authority review before wider multiplayer beta. Do not remove intermediate boss drops without a design decision. |
| P1 | Dungeon mechanics | Existing browser regression opens all five dungeons and tests Blackout puzzle/owner skip and Manor first room, but doesn't prove all multi-boss mechanics, puzzle paths, wipes and reward claims via real backend. | Add dedicated controlled playthroughs per dungeon and a 2-account Manor raid test. |
| P1 | Story/onboarding integration | The Chapter 0 rewrite remains in unmerged PR #190; its implementation and art aren't verified on staging. | Finish separate onboarding audit after dungeon playability pass. |
| P2 | Art mapping | Existing `dungeon-presentation-integrity` and `manor-raid-integrity` check approved asset paths, runtime integration and retirement of legacy overlays. This is not visual approval of every boss and room, including cloud-published overrides. | Use Design Booth room viewer to inspect every room and caption on a physical iPad. |
| P2 | Tablet compatibility | WebKit, iPad-sized viewports and UI performance tests exist. This is not physical iPad Safari with touch, performance and device memory. | Owner performs short portrait/landscape QA checklist on actual iPad. |

## Coverage observed

- **Ashen Vault:** Shared Combat Reborn contract, progression/loot and multi-room pathway; per-boss drops intentionally occur before the final clear.
- **Hollow Sanctum:** Dungeon gating, room art, quest first clear, Blackglass Resonator first-clear reward and shared combat path.
- **Chaos Canyon:** Item-level readiness, stepping-stone puzzle, boss transitions, progression and rewards.
- **Blackout Station:** Grid Alignment, admin bypass, Dr Vex art and circuits, loot, reset/re-entry and shared combat.
- **Fractured Ages:** Quest unlock, five time periods, combat, final room, first-clear flag, reward claims.
- **The Manor:** 10-character raid setup, solo owner QA, Butler/Maids/Engineer/Bedroom/Attic room mapping, ready gate, Screech, wipe/charge and server-protected T5 claims.

## Acceptance and follow-up

This PR must pass build, static regression and Chromium/WebKit browser checks before staging merge. In particular, the new `tests/dungeon-clear-authority.cjs` tests the actual shared verification predicate and that **each final reward mutation follows confirmation**.

After staging release, manually test:
1. Normal dungeon clear produces exactly one set of rewards and an event; the rejected/failed verification route does not issue *final-clear* rewards.
2. Reload and re-enter after disconnect/error; record and reconcile possible backend-accepted clears that failed client refresh.
3. The Manor owner QA first room, room advance, Screech and return-to-hub on real iPad Safari.
4. Two different authenticated players complete a real Manor raid and each claim exactly two T5 items once.
5. In the Design Booth inspect each room art override, with default backdrop and markers, in portrait and landscape.

**Not part of this patch:** actual server-generated economy rewards; existing per-boss bonus drops; production release; rebuild of content/visuals. Their correctness needs a separately scoped investigation.
