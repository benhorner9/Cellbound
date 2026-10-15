# Cellbound Talent V2 — PvE role and clear-rate calibration

**15 October 2026 — staging.** Uses the canonical CellboundCombatReborn engine. All values here are simulations, not observed production statistics.

## Goal and change
- Increase PvE enemy relative health and damage by **3%** in the shared engine. The initial 4% change overshot the requested 3–5 percentage-point clear-rate reduction in the sample.
- Preserve designer Normal/Heroic/Cellbound+ modifiers and fixed absolute boss HP.
- The global PvE difficulty multiplier does not apply to PvP; class-specific Evoker and Paladin ability adjustments can still affect PvP performance and must remain covered by Arena regression checks. Do not change crafting, minigame, loot, XP or other non-combat success rates.
- Address role outliers separately: stronger/faster Preservation Evoker Reversion and slightly less Protection Paladin endgame incoming damage.

## Paired-seed calibration
Four five-character compositions; five PvE encounter profiles; eight common seeds per combination = 160 simulations per tuning level. Encounters model normal/heroic/Cellbound+ late-story boss, a mid-game boss, and a multi-enemy pull. They are not full dungeon playthroughs.

| Enemy relative HP + damage | Clears / 160 | Clear rate | Drop from baseline |
|---|---:|---:|---:|
| Baseline | 94 | 58.75% | — |
| +2% | 92 | 57.50% | 1.25 points |
| +2.5% | 90 | 56.25% | 2.50 points |
| **+3%** | **89** | **55.63%** | **3.13 points** |
| +4% | 84 | 52.50% | 6.25 points |

Many encounters are guaranteed wins/wipes at this gear level; the effect concentrates near the threshold. These figures are sample estimates, not a promised win-rate change for each boss/difficulty.

## Role compatibility
- 13 classes/28 specialisations in the repeatable role-balance tests.
- 5 tanks × 6 healers × 4 seeded endgame attempts: 119 wins from 120 simulations in the sampled roster, no role pairing systematically failing.
- Dedicated 12-seed Preservation Evoker + Protection Paladin stress check.
- Existing Combat Reborn 113 self-tests and PvP 2v2/3v3/5v5 checks pass in the simulated runtime.
- These do not replace real browser, multiplayer, or full progression testing.

## Release measurement
Capture actual clears per encounter and difficulty, segmented by party composition, level, gear and tactics. Rebalance outlier fights/classes after meaningful samples. Do not inject random forced losses to meet a headline percentage. Maintain Normal accessibility and meaningful Heroic/Cellbound+ difficulty.

Run: npm run test:talents; npm run test:role-balance; npm run test:core.
