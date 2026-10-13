# Full class combat animation expansion

## Audit and approach

Baseline: staging 0479b50 (including the mobile battlefield fix), extending the
2894be3 joint-driven animation foundation. No engine, ability statistics, class
access flags, rewards, cooldowns or simulation pacing were changed.

The catalogue contains 13 classes and 221 active ability entries across 21 named
specs, 14 class-buff definitions, seven role fallbacks and 249 passive talent
rules. The previous controller primarily dispatched generic swings/casts from
damage/heal events. Buffs, taunts, totems, summons, pet commands and source
interrupt actions were incomplete; bow strings and kicking legs were static.
Some legacy adapters displayed numbers before the shared contact callback.

The extension keeps SVG cutout joints, equipmentPose/animatedEquipmentPose and
the authoritative event pipeline. A presentation-only catalogue resolves class
and ability identity into movement clips. Preparation holds until the real cast
resolves; release, projectile flight, reactions and floating feedback share one
bounded visual timeline. No result is calculated in the renderer.

## Implementation

- Class profiles select readiness, melee, casting, healing and defence motions.
  Named abilities override these with appropriate heavy, ranged, area, channel,
  summon, interrupt or evasive actions. Rogue basic strikes alternate hands.
- Bow drawing uses a deformable existing string and a small vector arrow. The
  support hand and nock use the same reach solver as the weapon hand. Full draw
  remains held during aiming; release starts from that held pose.
- Monk kicking legs reuse clipped existing leg, boot and racial-detail artwork.
  Pistol abilities temporarily display a vector firearm on the actual off-hand
  socket, restoring the owned off-hand after the gesture. No gameplay items exist
  for these temporary visual props.
- Existing torso, armour, arm, glove, hand and weapon artwork is reused. All
  thirteen classes use body-part motion, not just portrait translation.
- Source gestures cover every activation kind and successful interrupts. Passive
  and periodic effects retain subtle target cues rather than restarting attacks.
- Dungeon2D, legacy dungeon adapters, quests and tutorial feedback delegate to the
  same presentation timing. PvP red-team mirroring is part of appearance identity.
- Physical FX batches SVG socket reads before style writes to avoid repeated
  synchronous layout within a frame. Projectiles reuse the bounded FX lifecycle.
  Existing reduced-motion, death/control priority, teardown and recovery remain.

## Class inventory and implemented movements

| Class | Active entries | Basic | Signature/heavy | Casting / support | Defensive |
| --- | ---: | --- | --- | --- | --- |
| Death Knight | 27 | reap | execute | raise / drain | runeward |
| Demon Hunter | 18 | glaive | dance | fel / drain | metamorph |
| Druid | 16 | wrath | bloom | bloom / bloom | root |
| Evoker | 16 | breath | surge | surge / embrace | scales |
| Hunter | 14 | draw | aimed | command / command | evade |
| Mage | 14 | arcane | eruption | arcane / benediction | ward |
| Warrior | 12 | swing | cleave | warcry / salute | brace |
| Paladin | 13 | crusader | consecrate | sanctify / benediction | aegis |
| Priest | 17 | smite | prayer | prayer / prayer | ward |
| Rogue | 15 | jab | crosscut | throw / salute | evade |
| Shaman | 19 | storm | quake | totem / tide | root |
| Warlock | 18 | hex | ritual | ritual / drain | pact |
| Monk | 22 | palm | kick | chi / chi | brew |

The JSON inventory beside this report includes actual weapon names, every ability
ID/name/spec/kind/cast duration and resolved clip, class buffs, fallback actions
and all passive talent-rule names. The five beta-priority classes are not the
entire inventory; access restrictions are unchanged.

## Verification and scope

- Mapping checks cover all 221 active entries and class profiles/buffs/fallbacks.
- Seeded before/after presentation resolution preserves byte-identical results
  across all 21 named class/spec combinations.
- The geometry matrix samples all clips over six races, two sexes, three physiques
  and 14 weapon categories, verifying fixed bones, wrist/grip/support continuity,
  stable weapon scale and immutable equipment.
- Browser ability fixtures use actual production artwork, CSS, controller and
  definition-derived events for every entry; verify preparation, recovery,
  painted grip alignment, buffs, equipment replacement and death/revival per class.
  These controlled captures are explicitly fixtures, not a claim that the AI
  rotation chooses every ability in a short encounter. The fixture clock uses 4x
  presentation speed solely to shorten exhaustive testing; game pacing is unchanged.
- Separate real Ashen Vault sessions exercise all 13 classes in mixed five-person
  parties using the test backend and actual engine. No live player/reward writes.
- Existing full-playthrough, living-combat, equipment, appearance and engine/PvP
  regressions are run alongside these checks. Global renderer mounts include
  Dungeon2D/raid, quest, tutorial, legacy dungeons and PvP. Encounter tests are not
  an assertion that every raid boss and every live PvP match has been played.

## Remaining technical limits

The retired standalone World Boss client is explicitly disabled by existing build
contracts. It has not been re-enabled; current world-boss encounters in The Twelve
Below use its shared event adapter.

The art remains front-facing 2D cutouts. This adds articulated class movements,
not new 3D turns, full locomotion, bespoke beast skeletons or demon/animal
transformation artwork. Summons/pets retain compatible existing creature motions
and are commanded by the owner's new gestures. Boss-specific choreography is
outside this class expansion. Existing particle families are reused sparingly.

Desktop, iPad-size landscape/portrait and narrow mobile viewports can be emulated;
physical iPad/Mobile Safari hardware is unavailable. Linux WebKit CI is a browser
compatibility check, not device-performance certification. Frame diagnostics must
be reported with environment and baseline, not as a hardware FPS guarantee.
The baseline full suite has unrelated item-visual version/desktop-chat assertions
and a Chromium forge-timing failure; these are recorded rather than hidden.

## Ability checklist


### Death Knight

| Ability ID | Kind | Motion |
| --- | --- | --- |
| heart-strike | damage | reap |
| death-strike | damage | reap |
| dark-command | taunt | warcry |
| mind-freeze | interrupt | dispel |
| marrowrend | damage | execute |
| blood-boil | damage | runeblast |
| death-and-decay-blood | damage | runeblast |
| rune-tap | defensive | runeward |
| dancing-rune-weapon | defensive | raise |
| vampiric-blood | defensive | runeward |
| obliterate | damage | execute |
| frost-strike | damage | reap |
| howling-blast | damage | frost |
| remorseless-winter | damage | runeblast |
| frostscythe | damage | reap |
| frostwyrms-fury | damage | runeblast |
| breath-of-sindragosa | damage | breath |
| icebound-fortitude | defensive | runeward |
| festering-strike | damage | reap |
| scourge-strike | damage | reap |
| death-coil | damage | hex |
| outbreak | damage | hex |
| death-and-decay-unholy | damage | runeblast |
| dark-transformation | pet-command | commandDark |
| army-of-the-dead | summon | raise |
| apocalypse | summon | raise |
| anti-magic-shell | defensive | runeward |

### Demon Hunter

| Ability ID | Kind | Motion |
| --- | --- | --- |
| demons-bite | damage | glaive |
| chaos-strike | damage | fel |
| blade-dance | damage | dance |
| throw-glaive | damage | throwGlaive |
| eye-beam | damage | fel |
| fel-barrage | damage | dance |
| havoc-metamorphosis | damage | leap |
| blur | defensive | evade |
| disrupt | interrupt | dispel |
| shear | damage | glaive |
| soul-cleave | damage | fel |
| infernal-strike | damage | leap |
| torment | taunt | warcry |
| sigil-of-flame | damage | fel |
| demon-spikes | defensive | metamorph |
| fiery-brand | defensive | metamorph |
| spirit-bomb | damage | fel |
| vengeance-metamorphosis | defensive | metamorph |

### Druid

| Ability ID | Kind | Motion |
| --- | --- | --- |
| rejuvenation | heal | bloom |
| regrowth | heal | bloom |
| wild-growth | group-heal | bloom |
| skull-bash | interrupt | jab |
| restoration-wrath | damage | wrath |
| barkskin | defensive | root |
| tranquility | group-heal | bloom |
| wrath | damage | wrath |
| starfire | damage | wrath |
| starsurge | damage | wrath |
| moonfire | damage | wrath |
| sunfire | damage | wrath |
| starfall | damage | bloom |
| fury-of-elune | damage | bloom |
| celestial-alignment | damage | bloom |
| solar-beam | interrupt | dispel |

### Evoker

| Ability ID | Kind | Motion |
| --- | --- | --- |
| reversion | heal | embrace |
| verdant-embrace | heal | embrace |
| emerald-blossom | group-heal | embrace |
| dream-breath | group-heal | breath |
| temporal-anomaly | group-heal | embrace |
| emerald-communion | group-heal | breath |
| preservation-living-flame | damage | surge |
| quell | interrupt | dispel |
| obsidian-scales | defensive | scales |
| living-flame | damage | surge |
| azure-strike | damage | surge |
| disintegrate | damage | breath |
| fire-breath | damage | breath |
| pyre | damage | surge |
| eternity-surge | damage | surge |
| dragonrage | damage | surge |

### Hunter

| Ability ID | Kind | Motion |
| --- | --- | --- |
| aimed-shot | damage | aimed |
| arcane-shot | damage | draw |
| steady-shot | damage | draw |
| multi-shot | damage | volley |
| kill-shot | damage | aimed |
| cobra-shot | damage | draw |
| barbed-shot | damage | draw |
| kill-command | pet-command | command |
| beast-multi-shot | damage | volley |
| dire-beast | summon | command |
| stampede | summon | command |
| bestial-wrath | pet-command | command |
| counter-shot | interrupt | draw |
| survival-instincts | defensive | evade |

### Mage

| Ability ID | Kind | Motion |
| --- | --- | --- |
| pyroblast | damage | fire |
| fireball | damage | fire |
| fire-blast | damage | fire |
| arcane-barrage | damage | arcane |
| arcane-ward | defensive | ward |
| arcane-nova | damage | eruption |
| frostbolt | damage | frost |
| ice-lance | damage | frost |
| flurry | damage | frost |
| blizzard | damage | eruption |
| frozen-orb | damage | eruption |
| glacial-spike | damage | frost |
| counterspell | interrupt | dispel |
| ice-barrier | defensive | ward |

### Warrior

| Ability ID | Kind | Motion |
| --- | --- | --- |
| shield-slam | damage | bash |
| revenge | damage | cleave |
| taunt | taunt | warcry |
| mortal-strike | damage | cleave |
| slam | damage | cleave |
| execute | damage | execute |
| pummel | interrupt | jab |
| shield-wall | defensive | brace |
| sweeping-strike | damage | cleave |
| thunder-clap | damage | quake |
| rallying-guard | defensive | warcry |
| overpower | damage | cleave |

### Paladin

| Ability ID | Kind | Motion |
| --- | --- | --- |
| avengers-shield | damage | shieldCast |
| judgement | damage | crusader |
| hand-reckoning | taunt | warcry |
| word-of-glory | defensive | benediction |
| holy-light | heal | benediction |
| holy-shock | heal | benediction |
| light-of-dawn | group-heal | benediction |
| rebuke | interrupt | jab |
| ardent-defender | defensive | aegis |
| flash-of-light | heal | benediction |
| divine-protection | defensive | aegis |
| consecration | damage | consecrate |
| radiant-wave | group-heal | benediction |

### Priest

| Ability ID | Kind | Motion |
| --- | --- | --- |
| heal | heal | prayer |
| flash-heal | heal | prayer |
| prayer-healing | group-heal | prayer |
| smite | damage | smite |
| soul-recall | battle-rez | prayer |
| guardian-spirit | defensive | ward |
| divine-hymn | group-heal | prayer |
| mind-flay | damage | hex |
| mind-blast | damage | hex |
| devouring-plague | damage | hex |
| shadow-word-pain | damage | hex |
| vampiric-touch | damage | hex |
| shadow-crash | damage | eruption |
| void-torrent | damage | hex |
| void-eruption | damage | eruption |
| dispersion | defensive | ward |
| silence | interrupt | dispel |

### Rogue

| Ability ID | Kind | Motion |
| --- | --- | --- |
| mutilate | damage | crosscut |
| eviscerate | damage | crosscut |
| garrote | damage | backstab |
| envenom | damage | crosscut |
| fan-of-knives | damage | throw |
| sinister-strike | damage | jab |
| pistol-shot | damage | firearm |
| dispatch | damage | crosscut |
| roll-the-bones | damage | salute |
| blade-flurry | damage | flurry |
| between-the-eyes | damage | firearm |
| adrenaline-rush | damage | salute |
| killing-spree | damage | flurry |
| kick | interrupt | jab |
| feint | defensive | evade |

### Shaman

| Ability ID | Kind | Motion |
| --- | --- | --- |
| healing-wave | heal | tide |
| riptide | heal | tide |
| chain-heal | group-heal | tide |
| windfury-totem | totem | totem |
| stoneskin-totem | totem | totem |
| healing-stream-totem | totem | totem |
| spirit-link-totem | totem | totem |
| restoration-lightning-bolt | damage | storm |
| healing-rain | group-heal | tide |
| lightning-bolt | damage | storm |
| lava-burst | damage | fire |
| earth-shock | damage | storm |
| chain-lightning | damage | storm |
| flame-shock | damage | fire |
| earthquake | damage | quake |
| stormkeeper | damage | storm |
| ascendance | damage | storm |
| wind-shear | interrupt | dispel |
| astral-shift | defensive | root |

### Warlock

| Ability ID | Kind | Motion |
| --- | --- | --- |
| shadow-bolt | damage | hex |
| demonbolt | damage | hex |
| hand-of-guldan | damage | eruption |
| axe-toss | interrupt | dispel |
| call-dreadstalkers | summon | ritual |
| soul-strike | pet-command | commandDark |
| felstorm | pet-command | commandDark |
| implosion | pet-command | commandDark |
| summon-demonic-tyrant | summon | ritual |
| incinerate | damage | fire |
| conflagrate | damage | fire |
| chaos-bolt | damage | hex |
| immolate | damage | fire |
| rain-of-fire | damage | eruption |
| channel-demonfire | damage | hex |
| summon-infernal | summon | ritual |
| shadowfury | interrupt | dispel |
| dark-pact | defensive | pact |

### Monk

| Ability ID | Kind | Motion |
| --- | --- | --- |
| keg-smash | damage | staffSweep |
| brewmaster-blackout-kick | damage | kick |
| provoke | taunt | warcry |
| purifying-brew | defensive | brew |
| celestial-brew | defensive | brew |
| breath-of-fire | damage | breath |
| fortifying-brew | defensive | brew |
| soothing-mist | heal | chi |
| vivify | heal | chi |
| renewing-mist | heal | chi |
| essence-font | group-heal | chi |
| mist-rising-sun-kick | damage | kick |
| mist-tiger-palm | damage | palm |
| revival | group-heal | chi |
| tiger-palm | damage | palm |
| windwalker-blackout-kick | damage | kick |
| windwalker-rising-sun-kick | damage | kick |
| spinning-crane-kick | damage | spin |
| fists-of-fury | damage | fists |
| touch-of-death | damage | palm |
| touch-of-karma | defensive | parry |
| spear-hand-strike | interrupt | jab |

## Exact files changed

- `.github/workflows/staging-browser-qa.yml`
- `character-portraits-v1.js`
- `character-rig-v1.js`
- `guild.html`
- `onboarding-v1.js`
- `quests-v2.js`
- `src/combat/combat-animation-v1.js`
- `src/combat/combat-physical-v4.css`
- `src/combat/combat-physical-v4.js`
- `src/combat/combat-portraits-v1.js`
- `src/dungeons/blackout-station-v1.js`
- `src/dungeons/chaos-canyon-v1.js`
- `src/dungeons/dungeon-2d-v1.js`
- `src/dungeons/hollow-sanctum-v1.js`
- `tests/combat-animation.browser.cjs`
- `tests/combat-animation.cjs`
- `tools/runtime-manifest.cjs`
- `twelve-below-v1.js`
- `docs/combat-class-animation-expansion.md`
- `docs/combat-class-animation-inventory.json`
- `src/combat/combat-animation-catalog-v1.js`
- `tests/combat-class-animation.browser.cjs`
- `tests/combat-class-animation.cjs`
- `tests/combat-class-encounters.browser.cjs`
- `tools/combat-animation-inventory.cjs`

## Local acceptance results

- Production build and all appearance suites pass; core runner: 50/50 suites.
- Geometry: 668,304 sampled poses; shared attachment browser matrix: 516 cases.
- Chromium exhaustive fixtures: 221/221 active entries, all 13 classes, 26
  primary/signature preparation captures plus action frames; buffs and equipment
  swaps covered. Recoil/resumed casting, stale cast finish, and final projectile
  impact at combat completion pass targeted event-order regressions.
- Three actual Ashen Vault party runs cover all 13 classes with engine events.
- Existing Warrior integration, living combat, full playthrough and gameplay
  browser regressions pass. Desktop and 390x844, 844x390, 1366x1024 and 1024x1366
  viewports are included in the browser fixtures.
- Shared-host Chromium full-scene samples: 113 frames/8 seconds, p95 83.4 ms in
  the standard dungeon fixture; mixed-party samples vary with scene/viewport.
  This is not a claim of acceptable hardware FPS or a physical Safari test.
- Linux WebKit and full browser CI results are reported with the staging delivery.
