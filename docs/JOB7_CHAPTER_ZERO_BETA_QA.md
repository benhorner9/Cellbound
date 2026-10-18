# Cellbound Job 7 — Chapter 0 beta onboarding pass

## Intent
Keep the current character creation centre and canonical Combat Reborn tutorial encounters while restoring the **whole learning path** before the first live quest.

## Current progression
1. Create a party of five: Tank, Healer and three Damage.
2. Meet Warden Elara in Zeltira; study three clues at the west wall.
3. Choose suitable starter gear; learn item-level vs rolled stats.
4. Command three tutorial Combat Reborn encounters in the **same shared dungeon viewer** used elsewhere in the game: Rootling Nest (threat), Collapsed Gallery (interrupt), Hollow Warden (telegraphs).
5. Review/equip the first dungeon drop from the Guild Bank. If its entry is lost during save/reload, continue to the learning path without granting duplicate loot or suppressing the lesson.
6. Learn the Cell Shock recovery rules using a simulation that does not affect player characters.
7. Assign **one profession to one character**, craft a level-one item using the earned Hollows reagents, and learn how to equip/use/pack it.
8. Only once the training is complete, accept *Ashes on the East Road* and unlock the first real quest path toward Ashen Vault.

## Fixes in this pull request
- The first tutorial loot was incorrectly jumping straight to the quest, skipping recovery/profession/crafting. Both equipped and absent-drop branches now take the player to the recovery lesson.
- Completion now occurs after the crafted item's first-use/pack lesson, rather than on early loot receipt.
- Old **unfinished** saves which were already on the quest/departure screen but lack complete training are routed back to the appropriate missing lessons; players with completed onboarding are not reset.
- If a crafted training consumable is missing on reload, a clear recovery step appears, instead of silently abandoning the remaining tutorial.
- Three-frame illustrated tutorial story sequences reveal their first caption immediately. Quest dialogue also uses exactly three visual frames while preserving all spoken lines.
- Progressive dialogue replaces its prior caption instead of covering the same artwork with overlapping text. Missing images degrade to an intact scene without broken image icons.
- The owner comic preview now includes **Shock** and **Craft** as well as the existing seven scenes. Current approved newer art assets remain the first choice; this is not a rollback to an older asset set.
- Combat Reborn and current character creator are left unchanged.
- Browser and structural regression tests are automatically enrolled by the shared QA gate.

## Beta acceptance checklist
- [ ] Create a fresh five-character party on actual iPad Safari and resume during character creation.
- [ ] Play each tutorial combat room, including one deliberate defeat, retry and completed progression; confirm shared Combat Reborn and its room artwork.
- [ ] Verify full lesson sequence on iPad portrait/landscape and no focus/truncation blockers.
- [ ] Confirm starter loot is not duped after refresh and loss/recovery path is understandable.
- [ ] Pick each level-one profession on a new QA save, craft its entry recipe and verify the first item can be applied/packed.
- [ ] Reach *Ashes on the East Road* and verify the quest starts at the correct story beat.
- [ ] Visual-review all 9 Chapter 0 comics (3 frames each) in the in-game owner preview. **27 distinctive bespoke illustrations are still a separate art-production requirement**; existing curated art is a temporary/approved reference, not a claim that all bespoke images have been made.
- [ ] Do not deploy to live production from this PR.

## Automated confidence and limits
`tests/onboarding-beta-contract.cjs` verifies mandatory stage ordering, Combat Reborn integration, recoverable saves, and quest dialogue preservation. `tests/onboarding-beta.browser.cjs` runs the recovery-through-contract flow on tablet-sized Chromium and WebKit. Other existing tests cover character creation, saving and general beta gameplay.

Browser tests use mocked guild services. They do not replace a real fresh-user account run on a physical iPad, cloud save / device switching, or final visual art approval.
