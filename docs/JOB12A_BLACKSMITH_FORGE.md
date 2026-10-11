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
