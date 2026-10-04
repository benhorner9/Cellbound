# Visual direction status — classic rollback

The painted/Forge item-model rollout is temporarily superseded on staging by `classic-paper-doll-v1` and `classic-flat-v1`, matching the simpler Cellbound paper-doll references from Oct 2–3.

The underlying equipment catalogue, stats, slot rules, item IDs, sockets and progression remain unchanged. The newer Forge/atlas assets remain in the repository for future experimentation but are not the active character/item presentation during this rollback.

This pass moves equipped gear onto the same visual language as the Character Forge bases.

## Direction

Equipment no longer uses the painterly illustrated-v2 sheets as its primary worn model. Armour, weapons, off-hands and accessories are rendered as scalable vector pieces with the same core cues as the approved Forge characters:

- heavy dark outer line
- clean, readable silhouettes
- low-poly / faceted shading
- restrained highlights instead of painted texture
- class colour accents
- stronger ornamentation as item tier rises
- deterministic item variants so catalogue pieces do not all look identical

Inventory equipment icons and worn equipment now use the same `forge-vector-v1` source contract. An item therefore keeps the same silhouette, trim language and variant between loot/inventory views and the character model.

The existing illustrated-v2 WebP atlases remain in the build as a fallback for materials, consumables, recipes, keys and collection rewards. Gameplay IDs, stats, drops, sockets, profession data, equipment records and progression are unchanged.

## Character fit

The renderer continues to use `master-rig-v1` and the approved `character-forge-v1` race bases. Slot geometry is fitted independently for chest, shoulders, hands, waist, legs, feet and head. Main hand and off-hand continue to use the rig's hand anchors and weapon-type metadata.

The five beta classes receive their own family silhouette language:

- Warrior — hard plate geometry and central reinforcement
- Paladin — brighter plate, crest/crown details and ceremonial trim
- Hunter — layered leather, straps and practical ranged gear
- Rogue — dark fitted leather with crossed panels and low profile pieces
- Mage — shaped cloth, arcane trim and cleaner vertical lines

Classes outside the beta roster inherit the compatible family mapping but retain their own class accent colour. That keeps the catalogue renderable without changing beta class availability.

## Tier language

Tier 1 stays deliberately plain. Tier 2 introduces trim motifs. Tier 3 adds a stronger central detail. Tier 4 adds glow/ornamentation. Tier 5 receives the strongest trim and prestige treatment.

The item ID/class/slot also seeds a deterministic motif variant. This gives catalogue pieces a stable identity without requiring a separate bitmap for every stat roll.

## Verification

`tests/illustrated-items.cjs` verifies that:

- every equipment item resolves to `forge-vector-v1`
- equipment icons do not fall back to the old painted atlases
- inventory and worn models share the same source key
- all five beta class families render across every race and both body sexes
- the Character Forge base remains the body beneath the equipment
- rendering does not mutate item or character state
- the 301 illustrated atlas sprites still ship for non-equipment fallback items

Deploy only to staging. Production promotion requires later approval.
