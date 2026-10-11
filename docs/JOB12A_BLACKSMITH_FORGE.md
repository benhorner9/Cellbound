# Job 12A — Blacksmithing: The Zeltiran Forge

## Playable mini-game
The Professions screen now opens a forge for Blacksmithing work orders only, with the approved Ashen Vault furnace art as the backdrop. Three timed steps: heat the billet, strike the anvil, then temper the blade. Each has a different marker speed and target. Timing and a modest skill bonus determine Standard, Fine or Masterwork quality.

A precision slider mode is available for touch/accessibility; reduced-motion settings prefer manual controls.

## Economy and save guarantees
- Reuses existing reserved materials, profession XP, quality tier grading, recipe outputs and analytics. No new recipe data, item strength, currencies, DB schema or combat changes.
- Blacksmithing supports batches of up to **five** if sufficient reagents are available. The other professions retain their existing batch limits. Three successful skill actions establish a shared quality for that batch; larger batches require proportionately more focused crafting time.
- New forge orders cannot output items until all three steps AND **22 seconds of focused workshop time per item** complete (for example, five items take 110 seconds).
- Changing screens/backgrounding pauses workshop time; each successful action saves to the existing workshopCraftProject state.
- Cancelling returns the complete reserved input cost; unfinished orders yield no reward.
- Old in-progress timed work orders and all other professions continue unchanged.
- Failure or poor timing still produces the standard item.

## How to test on the iPad
Open https://cb.athleticsmanagergame.com, Guild > Professions, select a Blacksmith, and start any unlocked recipe with sufficient materials (for example Tempered Whetstone). Watch the marker and tap Set the Heat, Strike the Anvil, then Quench the Steel. Optionally use the precision slider. For a batch of five, set Amount to five; the estimated time should display 1:50. Once all stages and focused workshop time finish, confirm five crafted items and corresponding profession XP. Cancel a second order to check materials return. Rotate the iPad and try Reduce Motion.

## Technical tests
New Node and Chromium/WebKit browser regression tests cover the stage algorithm, quality, material reserve/refund, batch-scaled reward, successful crafting, save requests and accessibility mode. Physical iPad testing still requires owner review.

## Job 12B — character presence and effects (visual-only)
The actual selected roster adventurer now appears next to the forge using `CellboundPortraits.paperDollHTML`, so their race, appearance and equipped gear match the character players created. The name, race, class and Blacksmithing skill level appear in an in-scene identifier. This changes with the active work order on reload rather than using a generic blacksmith.

The three real mini-game inputs drive distinct sub-second effects: **heat** brightens the furnace, **strike** animates an overlaid hammer, character recoil and a burst of sparks, and **temper** adds a cooling steam plume. Stronger timing results brighten the impacts. Effects are capped to one short-lived sequence per input, do not block touch targets, and have reduced-motion fallbacks. Both timer and reward determination are unchanged.

On iPad: start any forge order; confirm the full-body model resembles the selected adventurer and changes with their equipped gear. Tap all three phases; inspect heat, hammer and steam effects. Complete a five-item batch and ensure the timer still reads 1:50. Verify portrait and landscape, reduced motion, and cancellation.
## Job 12C — reheating loop and more visible smithing
The furnace now displays a live heat percentage. Focused crafting drains heat at 1.9 percentage points/second; at 25% production pauses, even if the initial three mini-game stages have already been completed. Players then repeat the original precision *Set the Heat* challenge, now labelled **Stoke the Furnace**, to restore 100% heat and continue the same order. Existing batch quality and reserved inputs are unchanged. Reheating does not grant XP or items. A five-item batch (1:50 of actual production) needs two reheats under normal timing, rather than leaving the player watching the countdown.

Each action visibly moves the selected character and an attached smithing tool, with an idle work loop during production. The heating, striking and quenching actions use longer, distinct motion and effect cues. Reduced-motion settings keep static, readable feedback instead.

QA: check a two-to-five item batch, confirm heat stalls at 25%, pressing Stoke restores 100%, original quality stays the same, work order is saved/refundable, and no items are awarded until timer + original steps finish.


## Job 12D — scored reheats and completion report

Reheating is no longer a flat reset to 100%. The *Set the Heat / Stoke the Furnace* precision challenge is scored with the existing 35–100% timing/skill calculation. Restored furnace heat is calculated from the score: 35% accuracy restores 51% heat, ~80% restores 85%, and 100% restores 100%. Below or equal to 80% accuracy there is no speed bonus. Above 80%, saved production time scales linearly up to **8 seconds at 100%**, capped by the current remaining timer. Scores affect neither the first three forge quality stages nor material costs, output quantity, or XP. A poor reheat still allows work to continue, but it cools more quickly and requires another heating challenge sooner.

The work order now records actual heat restored, precision scores and actual time saved for every reheat in the existing saved workshop project, including across reloads. New and restored projects both support the updated rules.

Completing a Blacksmithing work order opens a dedicated results screen within the Professions workshop showing the resulting item art, item name and quantity, earned XP, overall quality/masterwork grade, the original three action scores, all reheat results, count, total time saved, skill-level changes and reclaimed reagents (when relevant). Actual rewards are still granted through the existing work-order completion transaction. The summary itself is stored in the normal saved guild state, appears after reload, and is cleared when the player taps **Return to Workshop**. Other professions continue their existing completion flow.

QA: test a one-item order with no reheat; test five items with one perfect reheat and one poor reheat, confirm different restored temperatures, capped 8-second precision bonuses, unchanged quality, no early payout, correct XP and quantity on the result screen, and normal re-entry to the workshop. Test in Chromium and WebKit with reduced motion and landscape/portrait iPad layouts.


## Job 12E — admin reagent-free testing

Verified **admin/owner** accounts can toggle **Craft without reagents** in the Guild > Professions workshop. This is an explicit per-account saved choice, **OFF** by default, and has no effect for ordinary accounts even if their saved state contains the preference.

When enabled, recipe availability and batch limits ignore ingredient stock; normal caps remain (Blacksmithing maximum five, other professions maximum 99). The game does not reserve, subtract or refund any inputs for these test orders. The order stores `adminFreeReagents` so cancellation and completion remain consistent even after a refresh, and privilege is checked again before a free-material order can grant rewards. Free masterworks do not create phantom recovered reagents. All actual skills, challenges, timers, recipe skill/discovery locks, XP and output rules remain unchanged. Toggling is disabled while an order or completion summary is active, avoiding mid-order cost changes.

Regression tests cover non-admin account gating, a forged saved preference, admin toggle persistence, Blacksmithing without reagents, normal limits, cancellation/refund prevention, masterwork material-reclaim protection and Alchemy using the same bypass.

Test: go to Guild > Professions on an admin account, find the ADMIN TESTING switch above the selected character's trade, enable it, and start a recipe with zero ingredients. Turn it off to return to ordinary crafting.
