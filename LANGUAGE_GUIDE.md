# Cellbound Language Guide

Cellbound should read like one game written by one team.

## Voice

Write for the player, not the design team. Keep copy short, concrete and confident. Lead with the state, action or consequence.

Prefer:
- “Clear Normal first.”
- “Your party needs Item Level 26.”
- “The Trading Post takes a 5% fee.”
- “Replacing this attachment destroys the old one.”
- “Calder is down. Loot has been sent to your Bank.”

Avoid filler such as:
- “powerful”, “meaningful”, “immersive”, “dynamic”, “seamless” or “robust” when the copy can state the real effect;
- “journey”, “experience” or “adventure” as generic marketing language;
- repeated dramatic claims such as “ultimate”, “devastating” or “unleash” unless they describe a named ability or deliberate character voice;
- developer language such as “content”, “system”, “gameplay loop”, “simulation”, “combat model”, “player economy”, “progression step”, “implementation”, “runtime” or “viewer”.

Internal code identifiers may still use those words. This guide applies to player-facing text.

## Navigation

Current main navigation:
- Home

Guild:
- Roster
- Active Party
- Bank
- Professions

Adventure:
- Quests
- Dungeons
- Activities
- Raids

Market:
- Trading Post

Combat:
- PvP

Social:
- Social

Admin is private and may use technical language when it helps testing.

## Canonical Game Terms

Use these consistently:
- Adventurer
- Guild
- Guildmaster
- Active Party / active five
- Tank
- Healer
- Damage
- Class
- Specialisation
- Talent / Talent Point
- Item Level / iLvl
- Power
- Cell Shock
- Encounter Knowledge
- Threat
- Dungeon
- Raid
- Activity
- World Boss
- Quest
- Reagent
- Profession
- Bank
- Trading Post
- Gold
- Renown

Use “Damage” for the role label in normal UI. “DPS” is acceptable where space is tight or where the number/rate itself is being discussed.

## UI Rules

- Buttons start with the action: ENTER DUNGEON, CRAFT, BUY, SELL, EQUIP, CLAIM.
- Headings describe the thing, not the implementation.
- Empty states say what is missing and what the player can do next.
- Locked states say exactly what unlocks them.
- Error messages say what failed and the next useful action.
- Tooltips explain the rule instead of selling the feature.
- Mechanical text should use one sentence when one sentence is enough.
- Results screens say what changed: reward, unlock, loss, cooldown or recovery.
- Do not explain design intent to the player.
- Do not call quests, dungeons, raids or activities “content”.
- Do not expose names such as “Combat Reborn simulation” in normal player UI.
- Preserve established lore names and named mechanics unless a deliberate naming change is made.

## Dialogue

Quest dialogue can have personality. Keep mechanical instructions outside dialogue plain and direct. Characters may speak dramatically; menus, tooltips and result screens should not.

## Tone Check

Before shipping copy, ask:
1. Can the player understand it on the first read?
2. Does it tell them what happened or what to do next?
3. Can any adjective be replaced by the actual effect?
4. Is there a shorter version with the same meaning?
5. Are we using the same term everywhere for the same thing?
