# CELLBOUND COMBAT STANDARD
## Permanent brief for every future dungeon, boss, quest fight, event and combat zone

**Status:** Mandatory  
**Combat model:** Combat Reborn  
**Runtime gateway:** `window.CellboundCombatStandard`  
**Purpose:** Every Cellbound combat encounter must feel like the same game. Encounters may change the arena, enemies, mechanics and presentation, but not the underlying combat rules or core combat interface.

---

## 1. GOLDEN RULE

Every combat zone in Cellbound uses **Combat Reborn as the single source of truth**.

The encounter UI is a playback layer. It must never calculate its own damage, healing, threat, deaths, resources, mechanics or success chance.

Allowed:
- different enemies;
- different arena artwork;
- different props and obstacles;
- different mechanics;
- different encounter pacing;
- puzzles or non-combat sections before/after combat;
- unique boss presentation.

Not allowed:
- a separate damage formula;
- bespoke attack loops;
- fake HP changes;
- cosmetic movement that disagrees with the simulation;
- hidden success rolls for positional mechanics when the arena can calculate the real position;
- a combat screen with a different information hierarchy;
- swapping HP/resource bar order;
- silently ending a fight without telling the player why.

---

## 2. ENGINE CONTRACT

### Local combat
All local combat must enter through:

`CellboundCombatStandard.simulate(...)`

This delegates to the production **Combat Reborn** engine.

Direct encounter-specific combat simulation is prohibited.

### Server-authoritative combat
Server combat such as World Bosses must explicitly return:

`combatModel: "Combat Reborn"`

The client must reject a combat payload that does not identify itself as Combat Reborn.

### Engine owns
Combat Reborn is authoritative for:
- health;
- class resources;
- damage;
- healing and overhealing;
- threat and aggro;
- abilities and equipped Skills;
- cooldowns;
- buffs and debuffs;
- interrupts;
- defensives;
- crowd control;
- movement;
- arena boundaries;
- collision;
- line of sight;
- boss mechanics;
- deaths and revives;
- encounter outcome;
- combat statistics.

The visual layer only renders engine events.

---

## 3. STANDARD COMBAT SCREEN

Every dungeon/boss combat scene must use the established **shared CB2D combat shell**.

### Header
Always contains:
- encounter/dungeon name;
- current room or boss;
- **LIVE** indicator;
- speed control;
- close button where appropriate.

### Route / encounter progress
Dungeon combat displays the current route/stage across the top.

Rules:
- completed stages clearly marked;
- current stage highlighted;
- same height, spacing and style in every dungeon.

### Main arena
The arena is the largest element.

It contains:
- environment artwork;
- player units;
- enemy units;
- telegraphs;
- projectiles/effects;
- real obstacles;
- room label;
- encounter status caption.

The environment may look completely different between encounters. The combat interface surrounding it does not.

### Right combat rail
Use the same order and structure:

1. **Enemy Cast**
2. **Damage Meter**
3. **Healing Meter**
4. **Threat Meter**
5. **Party Actions**
6. **Party Condition**
7. Encounter-specific rule/plan panel if required

### Below arena
Always include:
- Combat Reborn / tactics authority panel where relevant;
- Combat Feed;
- completion/failure panel.

---

## 4. OVERHEAD VITALS

This is mandatory on every player in the battle window.

### Player
Order is always:

**HEALTH**
then
**CLASS RESOURCE**

Health:
- green;
- top bar;
- clearly visible against every arena background.

Resource directly below:
- Mana — blue;
- Rage — red;
- Energy — yellow;
- Focus — amber;
- Runic Power — cyan;
- Fury — purple;
- Essence — emerald;
- generic Power — neutral.

### Enemy
Enemies always display a clearly visible **red HP bar**.

Boss HP must be easier to read than normal enemy HP.

### Important
The overhead bars are gameplay information, not decoration. Encounter-specific CSS must never hide, reorder or recolour the canonical vitals.

The shared `combat-vitals-ui-v1.css` file is authoritative.

---

## 5. PARTY CONDITION PANEL

The right-side Party Condition panel must update from the same engine events as the overhead bars.

It must reflect:
- current HP;
- deaths;
- revives;
- role;
- class/spec;
- relevant resource/state where the layout supports it.

The battle-window HP and Party Condition HP must never disagree.

---

## 6. STATUS EFFECT LANGUAGE

Status colour has universal meaning.

**Green = beneficial.**  
**Red = harmful.**

Enemy-applied harmful statuses must be red, including:
- increased damage taken;
- healing reduction;
- slows;
- stuns;
- roots;
- curses;
- wounds;
- vulnerability;
- damage-over-time effects.

A harmful debuff must never appear green.

---

## 7. ARENA RULES

The visual arena and combat arena must be the same thing.

If the player can see:
- a wall;
- pillar;
- rock;
- tree;
- machine;
- void;
- shrinking floor;
- blocked path;

the engine must know whether it blocks:
- movement;
- line of sight;
- both.

Characters cannot:
- run through solid scenery;
- cast through LOS blockers;
- fight outside the legal arena;
- stand on removed/shrunk floor.

Circular/elliptical arenas must use real shaped bounds, not an invisible rectangle.

---

## 8. POSITIONAL MECHANICS

Position must be real.

For circles, cones, lines, safe zones, role zones or shrinking arenas:
- telegraph appears at the engine-defined coordinates;
- units physically move;
- resolution checks their actual final coordinates;
- correct positioning succeeds;
- incorrect positioning takes the real consequence.

Do not decide positional mechanics with a disconnected random success roll.

AI execution/reaction quality can influence whether a character reaches safety in time, but the final mechanic resolves from actual position.

---

## 9. ROLES

Mechanics use the character's **current combat role**, not a hard-coded class identity.

Examples:
- Tank mechanic targets current Tank;
- Healer mechanic targets current Healer;
- Damage mechanic treats all current DPS as Damage.

Flexible characters must behave according to the role selected for that run.

Unusual compositions are valid. The engine should not create artificial benefits for missing roles.

---

## 10. SKILLS AND CLASS COMBAT

Only the Skills equipped to the character's active combat loadout may be used, apart from hidden engine safety basics such as a basic attack/resource generator.

Combat must respect:
- equipped Skills;
- specialization;
- class buff;
- cooldowns;
- resources;
- talents;
- equipment effects;
- gear sets;
- role.

The UI cannot invent attacks that Combat Reborn did not execute.

---

## 11. COMBAT FEEDBACK

A player must be able to understand what is happening without reading code or guessing.

Show:
- important casts;
- interrupts;
- mechanic warnings;
- successful mechanic responses;
- major damage;
- deaths;
- revives;
- phase changes;
- buffs/debuffs;
- boss defeat;
- party wipe.

A wipe must always provide a reason.

Examples:
- "2 characters were killed by Emergency Overload after missing their role circuit."
- "The healer was defeated and sustained damage overwhelmed the group."
- "A required interrupt was missed."

Never show only "Party Wiped" with no useful explanation.

---

## 12. METERS

All combat zones use the same definitions.

**Damage Meter**
- actual Combat Reborn damage events;
- class colours;
- total damage and DPS.

**Healing Meter**
- actual healing;
- HPS;
- overhealing where useful.

**Threat Meter**
- engine threat;
- current aggro clearly marked;
- class colours;
- threat changes update live.

Meters are visual summaries. They never drive the combat outcome.

---

## 13. SPEED AND PLAYBACK

Combat is pre-simulated/authoritative, then played through the UI timeline.

Rules:
- event timestamps remain authoritative;
- close events may overlap naturally;
- speed control changes playback speed, not results;
- speeding up cannot alter damage/mechanics/outcome;
- a visual rendering error must not stop the combat timeline.

The UI should recover from a failed visual event and continue playback.

---

## 14. MULTI-STAGE DUNGEONS

Across rooms in the same dungeon, preserve Combat Reborn state where intended:
- current HP;
- resources;
- cooldowns;
- persistent statuses;
- revive sickness;
- dungeon-long meters/statistics.

Threat resets per encounter unless a specific design says otherwise.

Out-of-combat recovery/revives must follow the dungeon rules and must not fake an alternate combat engine.

---

## 15. PUZZLES / NON-COMBAT CONTENT

Puzzles may use their own code because they are not combat.

The moment combat starts, control passes to Combat Reborn.

Puzzle consequences can modify the encounter configuration before simulation.

Examples:
- increased boss HP;
- vulnerability debuff;
- alternate mechanic;
- unlocked shortcut.

They do not replace the combat engine.

---

## 16. ENCOUNTER-SPECIFIC ART DIRECTION

A new dungeon should feel visually unique through:
- floor/environment;
- lighting;
- props;
- boss/enemy identity;
- telegraph theme;
- environmental animation;
- dungeon colour accents.

Do **not** make it unique by rebuilding the combat HUD.

Rule:

**Same combat product. Different place.**

Players should immediately recognise that they are in Cellbound combat before they read the dungeon name.

---

## 17. REQUIRED IMPLEMENTATION CHECKLIST

Before any new combat content ships:

- [ ] Registered with `CellboundCombatStandard`
- [ ] Uses Combat Reborn gateway
- [ ] Uses shared combat shell
- [ ] HP visible above every player
- [ ] Class resource visible directly below HP
- [ ] Enemy/boss HP visible
- [ ] Party Condition updates live
- [ ] Damage meter works
- [ ] Healing meter works
- [ ] Threat meter works
- [ ] Enemy Cast panel works
- [ ] Combat Feed explains important events
- [ ] Buffs green / debuffs red
- [ ] Obstacles use real movement/LOS geometry
- [ ] Units cannot leave the arena
- [ ] Positional mechanics resolve from real positions
- [ ] Current roles drive role mechanics
- [ ] Equipped Skills drive player abilities
- [ ] Playback speed cannot change outcome
- [ ] Visual errors cannot freeze combat
- [ ] Wipes include a useful diagnosis
- [ ] Victory/loot/progression state saves correctly
- [ ] iPad layout tested
- [ ] mobile layout tested

---

## 18. CURRENT COMBAT ZONES

The required combat model for all current systems is Combat Reborn:

- The Ashen Vault
- The Hollow Sanctum
- Chaos Canyon
- Blackout Station
- The Twelve Below
- Quest combat encounters
- World Boss encounters (server-authoritative Combat Reborn)

Any future:
- dungeon;
- raid;
- world boss;
- quest boss;
- training fight;
- scenario;
- seasonal encounter;
- PvE combat mode

must inherit this standard.

---

## 19. DEVELOPMENT RULE

Do not create another combat engine.

If a future mechanic cannot be expressed by Combat Reborn, extend Combat Reborn itself and then expose the new event/mechanic to every encounter.

**One engine. One combat language. One visual standard. Many different encounters.**
