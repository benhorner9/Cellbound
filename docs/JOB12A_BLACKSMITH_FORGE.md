# Job 12A — Blacksmithing: The Zeltiran Forge

## Playable mini-game
The Professions screen now opens a forge for Blacksmithing work orders only, with the approved Ashen Vault furnace art as the backdrop. Three timed steps: heat the billet, strike the anvil, then temper the blade. Each has a different marker speed and target. Timing and a modest skill bonus determine Standard, Fine or Masterwork quality.

A precision slider mode is available for touch/accessibility; reduced-motion settings prefer manual controls.

## Economy and save guarantees
- Reuses existing reserved materials, profession XP, quality tier grading, recipe outputs and analytics. No new recipe data, item strength, currencies, DB schema or combat changes.
- One Blacksmithing item per work order; a single perfect attempt cannot upgrade a batch of 99.
- New forge orders cannot output an item until all three steps AND 22 seconds of focused workshop time complete.
- Changing screens/backgrounding pauses workshop time; each successful action saves to the existing workshopCraftProject state.
- Cancelling returns the complete reserved input cost; unfinished orders yield no reward.
- Old in-progress timed work orders and all other professions continue unchanged.
- Failure or poor timing still produces the standard item.

## How to test on the iPad
Open https://cb.athleticsmanagergame.com, Guild > Professions, select a Blacksmith, and start any unlocked recipe with sufficient materials (for example Tempered Whetstone). Watch the marker and tap Set the Heat, Strike the Anvil, then Quench the Steel. Optionally use the precision slider. Once all stages and focused workshop time finish, confirm one crafted item and its profession XP. Cancel a second order to check materials return. Rotate the iPad and try Reduce Motion.

## Technical tests
New Node and Chromium/WebKit browser regression tests cover the stage algorithm, quality, material reserve/refund, one-item reward, successful crafting, save requests and accessibility mode. Physical iPad testing still requires owner review.
