# Chapter 0 — The First Resonance: comic and onboarding production bible (v2)

**Status:** story-flow/code refresh in development; bespoke illustration work still pending. Current `onboarding-v1.js` uses three existing fallback illustrations per scene. Do not mark the visual pass as complete until all 27 bespoke files below exist and are reviewed on iPad and desktop.

## Design rules
- New Cellbound style: illustrated fantasy adventure with clean silhouettes, expressive faces, confident ink-like edges and textured painterly colour. Not photorealistic and not a flat SVG placeholder.
- Comics are eye-level or cinematic, separate from the **top-down** combat arena. Maintain the same designs and proportions for Warden Elara Vey, the Quartermaster, the Craftmaster and the player's five adventurers. Use silhouettes when the player's party identity cannot be guaranteed.
- Exactly **three distinct illustrations per story scene**, widescreen 16:9, recommended 1536×864 WebP. No baked-in text, numbers, captions, speech bubbles or UI; all writing belongs in the game overlay.
- Avoid hidden clues in captions. Props, the direction of the wardstone, enemy cast telegraphs and gear choices must be visually readable.
- Every image should be searchable and swappable from the Design Booth / art library with an explicit story key and panel index, e.g. `chapter0.arrival.01`.
- Place approved exports in `assets/comics/tutorial/v2/<scene>-0<frame>.webp`; keep the old assets until all replacements are connected and verified. Test every file with the live comic renderer, not just a gallery.
- Comic skip advances dialogue only; never skip creation, equipment, combat, loot assignment or persistable gameplay choices.

## Three-image storyboards (27 illustration slots)

| Scene ID | Frame 01 — establish | Frame 02 — discovery | Frame 03 — dramatic hand-off |
| --- | --- | --- | --- |
| `arrival` | Twilight at Zeltira's outer gate, two wardens clear the road | Elara on the parapet, tense lantern-bearing patrol behind her | In the distance, a dead wardstone under the west wall emits a faint blue pulse |
| `west-wall` | Empty lamplit street and ancient cracked wall | Detail of pale roots bending *away* from the stone fracture; drained lantern beside them | Close focus on glowing groove in the wardstone pointing toward the old Hollows staircase |
| `gear` | Quartermaster lays two equally fine weapons across rough cloth | Comparison close-up: one defensive and one offensive stat rune, visibly different but neither labelled | The player's Tank faces the decision, shield raised under warm forge light |
| `hollows` | Party at a mossy stair, Elara holding open the training ward | Rootlings stir in a narrow chamber while Tank leads the formation | Broken gallery leads to the silhouette of the immense Hollow Warden beneath glowing roots |
| `loot` | Hollow Warden's fallen relic emerges from root-tangled rubble | Magical diadem displayed on the Quartermaster's inspection bench | Bank clerk opens a guild strongbox while an adventurer studies whether to equip the item |
| `shock` | Pathfinder extraction ward shields five fallen adventurers | One adventurer's Cell mark flares red as a recovery seal engages | The surviving guild regroups at dawn, the ward fading as the city watches |
| `craft` | Reagents gathered on the workbench: Cell fragments, iron and other finds | Craftmaster guides a novice's hand through the forge's glowing Cell lattice | Completed potion/enhancement beside a prepared weapon, ready for the next dungeon |
| `contract` | Elara pins a report of three missing supply carts to an east-gate notice board | Fresh coal-black ash pressed into cart tracks on a misty road | In the wooded distance, cold forge chimneys smoke faintly above a sealed mountain door |
| `departure` | Early sun washes Zeltira's eastern walls | Five adventurers in a readable Tank–Healer–DPS formation leave the checkpoint | Wide road beyond Zeltira, forests and distant unknown ruins, no training barrier remaining |

## Dialogue direction

Elara: practical, clipped, protective of her city; never a tutorial narrator. Quartermaster: precise about item value, terse and wry. Craftmaster: hands-on and patient, not a merchant pitch. Let the player connect evidence; do not give away deductions in an image caption. The Chapter 0 beats are:
1. Five people arrive on an uneasy evening.
2. The wardstone is alive, and three clues point underground.
3. The Quartermaster makes the guild read an item roll.
4. The party enters the Hollows, gives orders and witnesses three Combat Reborn encounters in the **same shared viewer** used by the rest of the game.
5. After-action feedback teaches threat, interrupts and movement; a victory never requires picking the recommended order.
6. The guild assigns its actual drop in the Bank, then sees a **safe** demonstration of Cell Shock. No penalty is applied during training.
7. The chosen adventurer learns **one profession**, crafts a level-one item and prepares it.
8. Elara offers **Ashes on the East Road**; accepting opens the real quest after a final farewell.

## Quest comic migration

Apply the same 3-frame story planning to each **named quest scene**, not one generic environment image reused across unrelated dialogue:
- Ashes on the East Road: vanished carts, tracks, The Cinder Cart, old forge key, mountain door, Ashen Vault unlock.
- Echoes Beneath Zeltira: Bram's letter, Blackened Fragment, Tessa's experiments, Jory's markings, underroad route, breathing seal.
- Signal from Nowhere / Null Complex: transmission, abandoned facility, Aberrant specimen, Orin recording, Subject Zero, Overseer, Prototype 07, extraction and end sting.
- Class trials and all one-off story comics should use the same asset key/panel structure.

For each quest scene, store **scene ID, speaker, narrative beat 1/2/3, required visuals, proposed lines, art paths, implementation status, QA status** in the Design Booth. Treat art, words and implementation as one publishable unit. Never quietly show an unrelated illustration just to satisfy a missing artwork requirement.

## Release QA
- Fresh first-time account; reload at every stage; named progress, decisions and characters survive refresh.
- Tablet/iPad portrait and landscape + desktop: no clipped story text, broken images or unreachable buttons.
- Every tutorial encounter uses `CellboundCombatStandard.simulate` and `CellboundDungeon2D.playSharedEncounter`; no parallel legacy renderer.
- Losing any room allows replay without granting rewards; closing the viewer does not mark victory.
- Rewards and reagents grant **once**, profession is limited to one character slot, and all selectable starter professions can complete their first recipe.
- All 27 approved tutorial art files are present, distinct, correctly attached to frames 1–3, and checked against approved character/room visual direction.
- Completion opens Ashes on the East Road without resetting completed progression.
