# Cellbound Language Guide

Cellbound should read like one game written by one team.

## Voice

Write for the player, not for the design team. Keep copy concise, concrete and confident. Tell the player what is happening, what they can do and what the consequence is.

Prefer:
- “Clear the previous difficulty first.”
- “The Trading Post takes a 5% fee from each sale.”
- “Once used, you need to craft or buy another.”
- “Your party is below the recommended Item Level.”

Avoid:
- “progression step”
- “player economy”
- “content”
- “system”
- “gameplay loop”
- “simulation”
- “combat model”
- “marketplace demand”
- copy that explains why a mechanic exists from a developer perspective

Internal code identifiers may still use words such as `economy`, `content`, `progression` or `questSystem`. This guide applies to player-facing text.

## Navigation

Main navigation:
- Overview
- Guild
- Adventure
- Supplies

Guild:
- Roster
- Party
- Social
- Reports

Adventure:
- Quests
- Dungeons
- Endgame
- World Bosses

Supplies:
- Bank
- Professions
- Trading Post

“Supplies” is the player-facing name for the workspace internally keyed as `economy`.

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

- Buttons should describe the action: ENTER DUNGEON, CRAFT, BUY, SELL, VIEW DUNGEON.
- Empty states should say what is missing and, when useful, what the player can do next.
- Tooltips should explain the rule, not sell the feature.
- Tutorial dialogue may have character voice, but mechanical explanations should remain plain.
- Do not call dungeons, quests or bosses “content” in player-facing text.
- Do not expose implementation names such as “Combat Reborn simulation” unless the name becomes an intentional in-world feature.
- Preserve established lore names and named mechanics exactly unless a deliberate naming change is made.

## Tone Check

Before shipping new copy, ask:
1. Would an MMO player understand this on first read?
2. Does it sound like the game is speaking, rather than a developer explaining the game?
3. Is there a shorter, more concrete way to say it?
4. Are we using the same term everywhere for the same thing?
