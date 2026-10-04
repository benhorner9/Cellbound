(()=>{
'use strict';
const MATERIALS={
  'faded-cell-fragment':{name:'Faded Cell Fragment',rarity:'Common',source:'The Zeltiran Hollows',icon:'◇',artIndex:0},
  'zeltiran-iron':{name:'Zeltiran Iron',rarity:'Common',source:'The Zeltiran Hollows',icon:'⬡',artIndex:1},
  'ashen-soul-fragment':{name:'Ashen Soul Fragment',rarity:'Common',source:'Any Ashen Vault boss',icon:'✦',artIndex:2},
  'warden-iron':{name:'Warden Iron',rarity:'Common',source:'Ash Warden Kael',icon:'⬡',artIndex:3},
  'ember-core':{name:'Ember Core',rarity:'Uncommon',source:'Embermaw',icon:'◉',artIndex:4},
  'vaultheart-crystal':{name:'Vaultheart Crystal',rarity:'Rare',source:'The Vaultheart',icon:'◇',artIndex:5},
  'ancient-soul':{name:'Ancient Soul',rarity:'Epic',source:'Future end-game content',icon:'✧',artIndex:6,endgame:true},
  'void-crystal':{name:'Void Crystal',rarity:'Epic',source:'The Hollow Sanctum',icon:'◆',artIndex:7,endgame:true},
  'cell-shards':{name:'Cell Shards',rarity:'Uncommon',source:'Dungeons, Cellbound+ and dismantling equipment',icon:'✧',artIndex:2,endgame:true},
  'hollowroot':{name:'Hollowroot',rarity:'Common',source:'Dungeon enemies and reward caches',icon:'❧'},
  'emberleaf':{name:'Emberleaf',rarity:'Uncommon',source:'Ashen Vault and fire-aligned enemies',icon:'♨'},
  'spiritcap':{name:'Spiritcap',rarity:'Rare',source:'Dungeon caves, ruins and rare reward caches',icon:'♧'},
  'cavebeast-meat':{name:'Cavebeast Meat',rarity:'Common',source:'Beast enemies and dungeon provision caches',icon:'◒'},
  'rune-dust':{name:'Rune Dust',rarity:'Common',source:'Arcane enemies, magical salvage and dungeon caches',icon:'✦'},
  'zeltiran-hide':{name:'Zeltiran Hide',rarity:'Common',source:'Beast enemies and early dungeon caches',icon:'▱'},
  'hollow-fibre':{name:'Hollow Fibre',rarity:'Common',source:'Humanoid enemies and dungeon caches',icon:'⌁'},
  'razorhide':{name:'Razorhide',rarity:'Uncommon',source:'Elite beasts and bosses',icon:'◩'},
  'ashen-silk':{name:'Ashen Silk',rarity:'Uncommon',source:'Glassweb Crawlers, caster enemies and dungeon caches',icon:'≈'},
  'rough-gemstone':{name:'Rough Gemstone',rarity:'Common',source:'Dungeon enemies and reward caches',icon:'◆'},
  'prismatic-shard':{name:'Prismatic Shard',rarity:'Rare',source:'Elite enemies, bosses and rare caches',icon:'◇'},
  'salvaged-parts':{name:'Salvaged Parts',rarity:'Common',source:'Constructs, machines and dungeon caches',icon:'⚙'},
  'conductive-coil':{name:'Conductive Coil',rarity:'Uncommon',source:'Mechanical enemies and powered dungeon machinery',icon:'⌁'},
  'tempering-flux':{name:'Tempering Flux',rarity:'Common',source:'Dungeon caches and metal salvage',icon:'◉'},
  'arcane-ink':{name:'Arcane Ink',rarity:'Uncommon',source:'Caster enemies, archives and dungeon caches',icon:'✒'},
  'etched-vellum':{name:'Etched Vellum',rarity:'Common',source:'Cultists, archives and dungeon caches',icon:'▤'}
};
function materialRarityClass(rarity='Common'){return 'material-rarity-'+String(rarity||'Common').toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function materialArtHTML(key,size=64,extra=''){
  if(window.CellboundItemArt)return window.CellboundItemArt.materialHTML(key,size,extra);
  const m=MATERIALS[key]||{name:key,rarity:'Common'},V=window.CellboundItemVisuals;
  return V?'<span class="material-art cb-item-art" style="width:'+size+'px;height:'+size+'px">'+V.icon({...m,key,category:'material'})+'</span>':'';
}
const PROFESSIONS={
  Alchemy:{icon:'⚗',summary:'Brew potions and flasks that are consumed for temporary combat power.',recipes:[
    {id:'alc-field-potion',name:'Field Recovery Potion',level:1,xp:18,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'field-recovery-potion',name:'Field Recovery Potion',quantity:1,payload:{effect:'combat-potion',healHp:28,condition:12,description:'Used during combat. Restores 28 HP and 12 Condition to the party member in the most danger.'}}},
    {id:'alc-zeltiran-restorative',name:'Zeltiran Restorative Potion',level:10,xp:22,inputs:{'faded-cell-fragment':2,'zeltiran-iron':1},output:{category:'consumable',key:'zeltiran-restorative-potion',name:'Zeltiran Restorative Potion',quantity:1,payload:{effect:'combat-potion',healHp:40,condition:18,description:'Used during combat. Restores 40 HP and 18 Condition to the party member in the most danger.'}}},
    {id:'alc-quickmind-flask',name:'Quickmind Flask',level:20,xp:28,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'consumable',key:'quickmind-flask',name:'Quickmind Flask',quantity:1,payload:{effect:'character-flask',bonuses:{haste:3},charges:3,description:'Drink before combat. +3% Haste for the next 3 boss encounters. Only one Flask can be active.'}}},
    {id:'alc-emberheart-flask',name:'Emberheart Flask',level:30,xp:34,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'consumable',key:'emberheart-flask',name:'Emberheart Flask',quantity:1,payload:{effect:'character-flask',bonuses:{damagePct:3},charges:3,description:'Drink before combat. +3% Damage for the next 3 boss encounters. Only one Flask can be active.'}}},
    {id:'alc-private-reserve',name:"Alchemist's Private Reserve",level:35,xp:38,inputs:{'ashen-soul-fragment':2,'ember-core':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'alchemists-private-reserve',name:"Alchemist's Private Reserve",quantity:1,payload:{effect:'character-flask',bonuses:{damagePct:2,haste:2,stamina:3},charges:3,description:'Crafter only. Drink before combat. +2% Damage, +2% Haste and +3 Stamina for the next 3 boss encounters.'}}},
    {id:'alc-keeneye-flask',name:'Keeneye Flask',level:40,xp:40,inputs:{'ashen-soul-fragment':2,'warden-iron':1},output:{category:'consumable',key:'keeneye-flask',name:'Keeneye Flask',quantity:1,payload:{effect:'character-flask',bonuses:{crit:4},charges:3,description:'Drink before combat. +4% Critical Strike for the next 3 boss encounters. Only one Flask can be active.'}}},
    {id:'alc-ironblood-flask',name:'Ironblood Flask',level:50,xp:42,inputs:{'ashen-soul-fragment':2,'vaultheart-crystal':1},output:{category:'consumable',key:'ironblood-flask',name:'Ironblood Flask',quantity:1,payload:{effect:'character-flask',bonuses:{stamina:7},charges:3,description:'Drink before combat. +7 Stamina for the next 3 boss encounters. Only one Flask can be active.'}}},
    {id:'alc-soulmender-flask',name:'Soulmender Flask',level:60,xp:50,inputs:{'ashen-soul-fragment':2,'cell-shards':1,'ember-core':1},output:{category:'consumable',key:'soulmender-flask',name:'Soulmender Flask',quantity:1,payload:{effect:'character-flask',bonuses:{healing:6},charges:3,description:'Drink before combat. +6% Healing Power for the next 3 boss encounters. Only one Flask can be active.'}}},
    {id:'alc-vaultblood-flask',name:'Vaultblood Flask',level:70,xp:58,inputs:{'ashen-soul-fragment':2,'cell-shards':2,'vaultheart-crystal':1},output:{category:'consumable',key:'vaultblood-flask',name:'Vaultblood Flask',quantity:1,payload:{effect:'character-flask',bonuses:{crit:3,haste:3},charges:3,description:'Drink before combat. +3% Critical Strike and +3% Haste for the next 3 boss encounters. Only one Flask can be active.'}}},
    {id:'alc-grand-elixir',name:"Grand Alchemist's Elixir",level:75,xp:62,inputs:{'ashen-soul-fragment':2,'cell-shards':3,'vaultheart-crystal':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'grand-alchemists-elixir',name:"Grand Alchemist's Elixir",quantity:1,payload:{effect:'character-flask',bonuses:{crit:4,haste:4,stamina:4},charges:3,description:'Crafter only. Drink before combat. +4% Critical Strike, +4% Haste and +4 Stamina for the next 3 boss encounters.'}}},
    {id:'alc-voidguard-flask',name:'Voidguard Flask',level:85,xp:68,inputs:{'cell-shards':6,'void-crystal':1},output:{category:'consumable',key:'voidguard-flask',name:'Voidguard Flask',quantity:1,payload:{effect:'character-flask',bonuses:{magicWardPct:8},charges:3,description:'Drink before combat. Take 8% less magic damage for the next 3 boss encounters. Only one Flask can be active.'}},endgame:true},
    {id:'alc-cell-shock',name:'Cell Shock Draught',level:100,xp:0,inputs:{'ancient-soul':3,'void-crystal':1},output:{category:'consumable',key:'cell-shock-draught',name:'Cell Shock Draught',quantity:1,payload:{effect:'clear-cell-shock',description:'Immediately clears one character’s Cell Shock.'}},endgame:true}
  ]},
  Enchanting:{icon:'✥',summary:'Create runes and glyphs that add specialist stats to equipped items.',recipes:[
    {id:'enc-binding-rune',name:'Binding Rune',level:1,xp:18,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'binding-rune',name:'Binding Rune',quantity:1,payload:{effect:'gear-enhancement',slot:'Head',bonuses:{crit:2},charges:3,description:'Apply to an equipped Head item. +2% Critical Strike for the next 3 boss encounters.'}}},
    {id:'enc-steadfast-rune',name:'Steadfast Rune',level:10,xp:22,inputs:{'faded-cell-fragment':2,'zeltiran-iron':1},output:{category:'consumable',key:'steadfast-rune',name:'Steadfast Rune',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{stamina:3},charges:3,description:'Apply to an equipped Chest item. +3 Stamina for the next 3 boss encounters.'}}},
    {id:'enc-swiftstep-rune',name:'Swiftstep Rune',level:20,xp:28,inputs:{'ashen-soul-fragment':2},output:{category:'consumable',key:'swiftstep-rune',name:'Swiftstep Rune',quantity:1,payload:{effect:'gear-enhancement',slot:'Feet',bonuses:{haste:3},charges:3,description:'Apply to equipped Feet. +3% Haste for the next 3 boss encounters.'}}},
    {id:'enc-warden-rune',name:"Warden's Ward Rune",level:25,xp:30,inputs:{'ashen-soul-fragment':2,'warden-iron':1},output:{category:'consumable',key:'warden-ward-rune',name:"Warden's Ward Rune",quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{block:3,stamina:3},charges:3,description:'Apply to an equipped Chest item. +3% Block and +3 Stamina for the next 3 boss encounters.'}}},
    {id:'enc-runesmith-crest',name:"Runesmith's Crest",level:30,xp:36,inputs:{'ashen-soul-fragment':2,'warden-iron':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'runesmiths-crest',name:"Runesmith's Crest",quantity:1,payload:{effect:'gear-enhancement',slot:'Head',bonuses:{crit:3,haste:3},description:'Crafter only. Attach to your own Head item. +3% Critical Strike and +3% Haste.'}}},
    {id:'enc-ember-sigil',name:'Ember Sigil',level:40,xp:40,inputs:{'ashen-soul-fragment':3,'ember-core':1},output:{category:'consumable',key:'ember-sigil',name:'Ember Sigil',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{damagePct:4},charges:3,description:'Apply to an equipped Weapon. +4% Damage for the next 3 boss encounters.'}}},
    {id:'enc-menders-sigil',name:"Mender's Sigil",level:50,xp:46,inputs:{'ashen-soul-fragment':2,'vaultheart-crystal':1},output:{category:'consumable',key:'menders-sigil',name:"Mender's Sigil",quantity:1,payload:{effect:'gear-enhancement',slot:'Relic',bonuses:{healing:5},charges:3,description:'Apply to an equipped Relic. +5% Healing Power for the next 3 boss encounters.'}}},
    {id:'enc-focus-glyph',name:'Focus Glyph',level:60,xp:52,inputs:{'ashen-soul-fragment':2,'cell-shards':1,'ember-core':1},output:{category:'consumable',key:'focus-glyph',name:'Focus Glyph',quantity:1,payload:{effect:'gear-enhancement',slot:'Head',bonuses:{intellect:6},charges:3,description:'Apply to an equipped Head item. +6 Intellect for the next 3 boss encounters.'}}},
    {id:'enc-vault-glyph',name:'Vaultheart Glyph',level:70,xp:55,inputs:{'ashen-soul-fragment':2,'cell-shards':2,'vaultheart-crystal':1},output:{category:'consumable',key:'vaultheart-glyph',name:'Vaultheart Glyph',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{haste:5},charges:3,description:'Apply to an equipped Weapon. +5% Haste for the next 3 boss encounters.'}},requiresDiscovery:true},
    {id:'enc-enchanters-dominion',name:"Enchanter's Dominion",level:75,xp:62,inputs:{'ashen-soul-fragment':2,'cell-shards':3,'vaultheart-crystal':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'enchanters-dominion',name:"Enchanter's Dominion",quantity:1,payload:{effect:'gear-enhancement',slot:'Relic',bonuses:{damagePct:4,healing:4},description:'Crafter only. Attach to your own Relic. +4% Damage and +4% Healing Power.'}}},
    {id:'enc-voidward-glyph',name:'Voidward Glyph',level:85,xp:68,inputs:{'cell-shards':6,'void-crystal':1},output:{category:'consumable',key:'voidward-glyph',name:'Voidward Glyph',quantity:1,payload:{effect:'gear-enhancement',slot:'OffHand',bonuses:{magicWardPct:7},charges:3,description:'Apply to an equipped OffHand item. Take 7% less magic damage for the next 3 boss encounters.'}},endgame:true},
    {id:'enc-soulbound-glyph',name:'Soulbound Glyph',level:100,xp:0,inputs:{'ancient-soul':2,'void-crystal':2,'cell-shards':8},output:{category:'consumable',key:'soulbound-glyph',name:'Soulbound Glyph',quantity:1,payload:{effect:'gear-enhancement',slot:'Relic',bonuses:{damagePct:4,healing:4,stamina:4},charges:3,description:'Apply to an equipped Relic. +4% Damage, +4% Healing Power and +4 Stamina for the next 3 boss encounters.'}},endgame:true}
  ]},
  Blacksmithing:{icon:'⚒',summary:'Forge whetstones and armour kits that permanently modify equipped gear until replaced.',recipes:[
    {id:'bs-tempered-whetstone',name:'Tempered Whetstone',level:1,xp:20,inputs:{'zeltiran-iron':2,'faded-cell-fragment':1},output:{category:'consumable',key:'tempered-whetstone',name:'Tempered Whetstone',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{damagePct:3},charges:3,description:'Apply to an equipped Weapon. +3% Damage for the next 3 boss encounters.'}}},
    {id:'bs-braced-buckle',name:'Braced Armour Kit',level:10,xp:24,inputs:{'zeltiran-iron':3,'faded-cell-fragment':1},output:{category:'consumable',key:'braced-armour-kit',name:'Braced Armour Kit',quantity:1,payload:{effect:'gear-enhancement',slot:'Waist',bonuses:{stamina:3},charges:3,description:'Apply to an equipped Waist item. +3 Stamina for the next 3 boss encounters.'}}},
    {id:'bs-ironclad-plate',name:'Ironclad Plate Kit',level:20,xp:30,inputs:{'zeltiran-iron':3,'ashen-soul-fragment':1},output:{category:'consumable',key:'ironclad-plate-kit',name:'Ironclad Plate Kit',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{armour:12},charges:3,description:'Apply to an equipped Chest item. +12 Armour for the next 3 boss encounters.'}}},
    {id:'bs-warden-plate',name:'Warden Plate Kit',level:25,xp:34,inputs:{'warden-iron':1,'ashen-soul-fragment':2},output:{category:'consumable',key:'warden-plate-kit',name:'Warden Plate Kit',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{armour:18},charges:3,description:'Apply to an equipped Chest item. +18 Armour for the next 3 boss encounters.'}}},
    {id:'bs-smiths-temper',name:"Smith's Temper",level:30,xp:36,inputs:{'zeltiran-iron':3,'ashen-soul-fragment':2},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'smiths-temper',name:"Smith's Temper",quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{damagePct:4,stamina:2},description:'Crafter only. Attach to your own Weapon. +4% Damage and +2 Stamina.'}}},
    {id:'bs-serrated-whetstone',name:'Serrated Whetstone',level:35,xp:40,inputs:{'zeltiran-iron':4,'ashen-soul-fragment':2},output:{category:'consumable',key:'serrated-whetstone',name:'Serrated Whetstone',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{damagePct:2,crit:3},charges:3,description:'Apply to an equipped Weapon. +2% Damage and +3% Critical Strike for the next 3 boss encounters.'}}},
    {id:'bs-ember-temper',name:'Ember Temper Stone',level:45,xp:46,inputs:{'warden-iron':1,'ember-core':1},output:{category:'consumable',key:'ember-temper-stone',name:'Ember Temper Stone',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{damagePct:5},charges:3,description:'Apply to an equipped Weapon. +5% Damage for the next 3 boss encounters.'}}},
    {id:'bs-guardian-plate',name:'Guardian Plate Kit',level:55,xp:52,inputs:{'warden-iron':1,'ashen-soul-fragment':2,'cell-shards':1,'ember-core':1},output:{category:'consumable',key:'guardian-plate-kit',name:'Guardian Plate Kit',quantity:1,payload:{effect:'gear-enhancement',slot:'Shoulders',bonuses:{armour:20,stamina:4},charges:3,description:'Apply to equipped Shoulders. +20 Armour and +4 Stamina for the next 3 boss encounters.'}}},
    {id:'bs-bulwark-reinforcement',name:'Bulwark Reinforcement Kit',level:65,xp:58,inputs:{'warden-iron':1,'cell-shards':2,'vaultheart-crystal':1,'ashen-soul-fragment':2},output:{category:'consumable',key:'bulwark-reinforcement-kit',name:'Bulwark Reinforcement Kit',quantity:1,payload:{effect:'gear-enhancement',slot:'OffHand',bonuses:{block:5,stamina:4},charges:3,description:'Apply to an equipped OffHand item. +5% Block and +4 Stamina for the next 3 boss encounters.'}}},
    {id:'bs-forgeheart-plate',name:'Forgeheart Plate',level:75,xp:62,inputs:{'warden-iron':2,'cell-shards':3,'vaultheart-crystal':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'forgeheart-plate',name:'Forgeheart Plate',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{armour:24,stamina:6},description:'Crafter only. Attach to your own Chest item. +24 Armour and +6 Stamina.'}}},
    {id:'bs-vaultforged-whetstone',name:'Vaultforged Whetstone',level:80,xp:66,inputs:{'cell-shards':6,'vaultheart-crystal':1,'warden-iron':1},output:{category:'consumable',key:'vaultforged-whetstone',name:'Vaultforged Whetstone',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{damagePct:6,crit:3},charges:3,description:'Apply to an equipped Weapon. +6% Damage and +3% Critical Strike for the next 3 boss encounters.'}},endgame:true},
    {id:'bs-soulforged-armour',name:'Soulforged Armour Kit',level:100,xp:0,inputs:{'ancient-soul':2,'void-crystal':1,'cell-shards':10},output:{category:'consumable',key:'soulforged-armour-kit',name:'Soulforged Armour Kit',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{armour:30,stamina:8},charges:3,description:'Apply to an equipped Chest item. +30 Armour and +8 Stamina for the next 3 boss encounters.'}},endgame:true}
  ]},
  Leatherworking:{icon:'⌁',summary:'Craft grips, harnesses and wraps that modify gear with speed and precision bonuses.',recipes:[
    {id:'lw-balanced-grip',name:'Balanced Grip',level:1,xp:20,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'balanced-grip',name:'Balanced Grip',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{haste:2},charges:3,description:'Apply to an equipped Weapon. +2% Haste for the next 3 boss encounters.'}}},
    {id:'lw-pathfinder-wrap',name:'Pathfinder Wrap',level:10,xp:24,inputs:{'faded-cell-fragment':2,'zeltiran-iron':1},output:{category:'consumable',key:'pathfinder-wrap',name:'Pathfinder Wrap',quantity:1,payload:{effect:'gear-enhancement',slot:'Feet',bonuses:{haste:2,stamina:2},charges:3,description:'Apply to equipped Feet. +2% Haste and +2 Stamina for the next 3 boss encounters.'}}},
    {id:'lw-padded-harness',name:'Padded Harness',level:20,xp:30,inputs:{'ashen-soul-fragment':2},output:{category:'consumable',key:'padded-harness',name:'Padded Harness',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{stamina:4},charges:3,description:'Apply to an equipped Chest item. +4 Stamina for the next 3 boss encounters.'}}},
    {id:'lw-reinforced-harness',name:'Reinforced Harness',level:25,xp:34,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'consumable',key:'reinforced-harness',name:'Reinforced Harness',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{stamina:5},charges:3,description:'Apply to an equipped Chest item. +5 Stamina for the next 3 boss encounters.'}}},
    {id:'lw-tanners-stride',name:"Tanner's Stride",level:30,xp:36,inputs:{'ashen-soul-fragment':2,'ember-core':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'tanners-stride',name:"Tanner's Stride",quantity:1,payload:{effect:'gear-enhancement',slot:'Feet',bonuses:{haste:3,crit:2,stamina:3},description:'Crafter only. Attach to your own Feet. +3% Haste, +2% Critical Strike and +3 Stamina.'}}},
    {id:'lw-razorhide-grip',name:'Razorhide Grip',level:35,xp:40,inputs:{'ashen-soul-fragment':2,'warden-iron':1},output:{category:'consumable',key:'razorhide-grip',name:'Razorhide Grip',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{crit:3,haste:2},charges:3,description:'Apply to an equipped Weapon. +3% Critical Strike and +2% Haste for the next 3 boss encounters.'}}},
    {id:'lw-predator-wrap',name:'Predator Wrap',level:45,xp:46,inputs:{'ashen-soul-fragment':2,'vaultheart-crystal':1},output:{category:'consumable',key:'predator-wrap',name:'Predator Wrap',quantity:1,payload:{effect:'gear-enhancement',slot:'Head',bonuses:{crit:4},charges:3,description:'Apply to an equipped Head item. +4% Critical Strike for the next 3 boss encounters.'}}},
    {id:'lw-windrunner-wrap',name:'Windrunner Wrap',level:55,xp:52,inputs:{'ashen-soul-fragment':2,'cell-shards':1,'ember-core':1},output:{category:'consumable',key:'windrunner-wrap',name:'Windrunner Wrap',quantity:1,payload:{effect:'gear-enhancement',slot:'Legs',bonuses:{haste:4,stamina:3},charges:3,description:'Apply to equipped Legs. +4% Haste and +3 Stamina for the next 3 boss encounters.'}}},
    {id:'lw-shadowstep-harness',name:'Shadowstep Harness',level:65,xp:58,inputs:{'ashen-soul-fragment':2,'cell-shards':2,'vaultheart-crystal':1},output:{category:'consumable',key:'shadowstep-harness',name:'Shadowstep Harness',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{crit:4,haste:3},charges:3,description:'Apply to an equipped Chest item. +4% Critical Strike and +3% Haste for the next 3 boss encounters.'}}},
    {id:'lw-master-hunters-harness',name:"Master Hunter's Harness",level:75,xp:62,inputs:{'ashen-soul-fragment':2,'cell-shards':3,'vaultheart-crystal':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'master-hunters-harness',name:"Master Hunter's Harness",quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{crit:5,haste:4,stamina:4},description:'Crafter only. Attach to your own Chest item. +5% Critical Strike, +4% Haste and +4 Stamina.'}}},
    {id:'lw-vaultstalker-grip',name:'Vaultstalker Grip',level:80,xp:66,inputs:{'cell-shards':6,'vaultheart-crystal':1,'ember-core':1},output:{category:'consumable',key:'vaultstalker-grip',name:'Vaultstalker Grip',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon',bonuses:{haste:5,crit:4},charges:3,description:'Apply to an equipped Weapon. +5% Haste and +4% Critical Strike for the next 3 boss encounters.'}},endgame:true},
    {id:'lw-voidbound-harness',name:'Voidbound Harness',level:100,xp:0,inputs:{'ancient-soul':2,'void-crystal':1,'cell-shards':10},output:{category:'consumable',key:'voidbound-harness',name:'Voidbound Harness',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{haste:6,crit:5,stamina:6},charges:3,description:'Apply to an equipped Chest item. +6% Haste, +5% Critical Strike and +6 Stamina for the next 3 boss encounters.'}},endgame:true}
  ]},
  Tailoring:{icon:'✂',summary:'Weave spellthreads and linings that improve healing, casting and magical defence.',recipes:[
    {id:'tail-focus-thread',name:'Focus Thread',level:1,xp:20,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'focus-thread',name:'Focus Thread',quantity:1,payload:{effect:'gear-enhancement',slot:'Head',bonuses:{intellect:3},charges:3,description:'Apply to an equipped Head item. +3 Intellect for the next 3 boss encounters.'}}},
    {id:'tail-quickweave-thread',name:'Quickweave Thread',level:10,xp:24,inputs:{'faded-cell-fragment':2,'zeltiran-iron':1},output:{category:'consumable',key:'quickweave-thread',name:'Quickweave Thread',quantity:1,payload:{effect:'gear-enhancement',slot:'Hands',bonuses:{haste:2,intellect:2},charges:3,description:'Apply to equipped Hands. +2% Haste and +2 Intellect for the next 3 boss encounters.'}}},
    {id:'tail-acolyte-lining',name:'Acolyte Lining',level:20,xp:30,inputs:{'ashen-soul-fragment':2},output:{category:'consumable',key:'acolyte-lining',name:'Acolyte Lining',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{healing:3},charges:3,description:'Apply to an equipped Chest item. +3% Healing Power for the next 3 boss encounters.'}}},
    {id:'tail-mender-lining',name:"Mender's Lining",level:25,xp:34,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'consumable',key:'mender-lining',name:"Mender's Lining",quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{healing:4},charges:3,description:'Apply to an equipped Chest item. +4% Healing Power for the next 3 boss encounters.'}}},
    {id:'tail-weavers-focus',name:"Weaver's Focus",level:30,xp:36,inputs:{'ashen-soul-fragment':2,'ember-core':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'weavers-focus',name:"Weaver's Focus",quantity:1,payload:{effect:'gear-enhancement',slot:'Hands',bonuses:{haste:3,intellect:4},description:'Crafter only. Attach to your own Hands. +3% Haste and +4 Intellect.'}}},
    {id:'tail-emberthread-lining',name:'Emberthread Lining',level:35,xp:40,inputs:{'ashen-soul-fragment':3,'ember-core':1},output:{category:'consumable',key:'emberthread-lining',name:'Emberthread Lining',quantity:1,payload:{effect:'gear-enhancement',slot:'Shoulders',bonuses:{intellect:4,magicWardPct:3},charges:3,description:'Apply to equipped Shoulders. +4 Intellect and take 3% less magic damage for the next 3 boss encounters.'}}},
    {id:'tail-soulweave',name:'Soulweave Lining',level:45,xp:46,inputs:{'ashen-soul-fragment':2,'vaultheart-crystal':1},output:{category:'consumable',key:'soulweave-lining',name:'Soulweave Lining',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{magicWardPct:5},charges:3,description:'Apply to an equipped Chest item. 5% less magic damage taken for the next 3 boss encounters.'}}},
    {id:'tail-sage-thread',name:"Sage's Thread",level:55,xp:52,inputs:{'ashen-soul-fragment':2,'cell-shards':1,'ember-core':1},output:{category:'consumable',key:'sages-thread',name:"Sage's Thread",quantity:1,payload:{effect:'gear-enhancement',slot:'Head',bonuses:{intellect:6,crit:3},charges:3,description:'Apply to an equipped Head item. +6 Intellect and +3% Critical Strike for the next 3 boss encounters.'}}},
    {id:'tail-lifebinder-lining',name:'Lifebinder Lining',level:65,xp:58,inputs:{'ashen-soul-fragment':2,'cell-shards':2,'vaultheart-crystal':1},output:{category:'consumable',key:'lifebinder-lining',name:'Lifebinder Lining',quantity:1,payload:{effect:'gear-enhancement',slot:'Relic',bonuses:{healing:7,intellect:4},charges:3,description:'Apply to an equipped Relic. +7% Healing Power and +4 Intellect for the next 3 boss encounters.'}}},
    {id:'tail-grandweave-lining',name:'Grandweave Lining',level:75,xp:62,inputs:{'ashen-soul-fragment':2,'cell-shards':3,'vaultheart-crystal':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'grandweave-lining',name:'Grandweave Lining',quantity:1,payload:{effect:'gear-enhancement',slot:'Relic',bonuses:{healing:6,intellect:6,crit:3},description:'Crafter only. Attach to your own Relic. +6% Healing Power, +6 Intellect and +3% Critical Strike.'}}},
    {id:'tail-vaultsilk-thread',name:'Vaultsilk Thread',level:80,xp:66,inputs:{'cell-shards':6,'vaultheart-crystal':1,'ember-core':1},output:{category:'consumable',key:'vaultsilk-thread',name:'Vaultsilk Thread',quantity:1,payload:{effect:'gear-enhancement',slot:'Hands',bonuses:{haste:5,intellect:6},charges:3,description:'Apply to equipped Hands. +5% Haste and +6 Intellect for the next 3 boss encounters.'}},endgame:true},
    {id:'tail-voidweave-lining',name:'Voidweave Lining',level:100,xp:0,inputs:{'ancient-soul':2,'void-crystal':2,'cell-shards':8},output:{category:'consumable',key:'voidweave-lining',name:'Voidweave Lining',quantity:1,payload:{effect:'gear-enhancement',slot:'Chest',bonuses:{intellect:9,magicWardPct:8,healing:5},charges:3,description:'Apply to an equipped Chest item. +9 Intellect, 8% less magic damage taken and +5% Healing Power for the next 3 boss encounters.'}},endgame:true}
  ]},
  Jewelcrafting:{icon:'◆',summary:'Cut socket gems for permanent item customisation. Gems are tradeable now; applying them unlocks when equipment sockets arrive.',recipes:[
    {id:'jc-faded-quartz',name:'Faded Quartz',level:1,xp:18,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'faded-quartz',name:'Faded Quartz',quantity:1,payload:{effect:'socket-gem',bonuses:{crit:2},socketReady:true,description:'Socket gem. +2% Critical Strike when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}}},
    {id:'jc-swift-amber',name:'Swift Amber',level:10,xp:22,inputs:{'faded-cell-fragment':2,'zeltiran-iron':1},output:{category:'consumable',key:'swift-amber',name:'Swift Amber',quantity:1,payload:{effect:'socket-gem',bonuses:{haste:2},socketReady:true,description:'Socket gem. +2% Haste when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}}},
    {id:'jc-ironheart-garnet',name:'Ironheart Garnet',level:20,xp:28,inputs:{'ashen-soul-fragment':2},output:{category:'consumable',key:'ironheart-garnet',name:'Ironheart Garnet',quantity:1,payload:{effect:'socket-gem',bonuses:{stamina:4},socketReady:true,description:'Socket gem. +4 Stamina when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}}},
    {id:'jc-artisans-prism',name:"Artisan's Prism",level:30,xp:34,inputs:{'ashen-soul-fragment':2,'ember-core':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'artisans-prism',name:"Artisan's Prism",quantity:1,payload:{effect:'socket-gem',bonuses:{crit:2,haste:2},socketReady:true,description:'Crafter only. Socket gem granting +2% Critical Strike and +2% Haste. Replacing an installed gem permanently destroys the previous gem.'}}},
    {id:'jc-ember-ruby',name:'Ember Ruby',level:35,xp:38,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'consumable',key:'ember-ruby',name:'Ember Ruby',quantity:1,payload:{effect:'socket-gem',bonuses:{damagePct:3},socketReady:true,description:'Socket gem. +3% Damage when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}}},
    {id:'jc-menders-sapphire',name:"Mender's Sapphire",level:45,xp:46,inputs:{'ashen-soul-fragment':2,'vaultheart-crystal':1},output:{category:'consumable',key:'menders-sapphire',name:"Mender's Sapphire",quantity:1,payload:{effect:'socket-gem',bonuses:{healing:4},socketReady:true,description:'Socket gem. +4% Healing Power when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}}},
    {id:'jc-wardstone',name:'Wardstone',level:55,xp:52,inputs:{'ashen-soul-fragment':2,'cell-shards':1,'warden-iron':1},output:{category:'consumable',key:'wardstone-gem',name:'Wardstone',quantity:1,payload:{effect:'socket-gem',bonuses:{magicWardPct:5},socketReady:true,description:'Socket gem. Take 5% less magic damage when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}}},
    {id:'jc-vaultheart-prism',name:'Vaultheart Prism',level:65,xp:58,inputs:{'ashen-soul-fragment':2,'cell-shards':2,'vaultheart-crystal':1},output:{category:'consumable',key:'vaultheart-prism',name:'Vaultheart Prism',quantity:1,payload:{effect:'socket-gem',bonuses:{crit:3,haste:3},socketReady:true,description:'Socket gem. +3% Critical Strike and +3% Haste when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}}},
    {id:'jc-master-cutters-cell',name:"Master Cutter's Cell",level:75,xp:62,inputs:{'cell-shards':4,'vaultheart-crystal':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'master-cutters-cell',name:"Master Cutter's Cell",quantity:1,payload:{effect:'socket-gem',bonuses:{damagePct:4,crit:4},socketReady:true,description:'Crafter only. Socket gem granting +4% Damage and +4% Critical Strike. Replacing an installed gem permanently destroys the previous gem.'}}},
    {id:'jc-void-opal',name:'Void Opal',level:80,xp:66,inputs:{'cell-shards':5,'void-crystal':1},output:{category:'consumable',key:'void-opal',name:'Void Opal',quantity:1,payload:{effect:'socket-gem',bonuses:{magicWardPct:6,stamina:4},socketReady:true,description:'Socket gem. 6% less magic damage taken and +4 Stamina when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}},endgame:true},
    {id:'jc-ancient-prism',name:'Ancient Prism',level:90,xp:72,inputs:{'ancient-soul':1,'cell-shards':7,'vaultheart-crystal':1},output:{category:'consumable',key:'ancient-prism',name:'Ancient Prism',quantity:1,payload:{effect:'socket-gem',bonuses:{damagePct:4,haste:4,stamina:4},socketReady:true,description:'Socket gem. +4% Damage, +4% Haste and +4 Stamina when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}},endgame:true},
    {id:'jc-cellheart-diamond',name:'Cellheart Diamond',level:100,xp:0,inputs:{'ancient-soul':2,'void-crystal':2,'cell-shards':10},output:{category:'consumable',key:'cellheart-diamond',name:'Cellheart Diamond',quantity:1,payload:{effect:'socket-gem',bonuses:{damagePct:5,crit:5,haste:5},socketReady:true,description:'Masterwork socket gem. +5% Damage, +5% Critical Strike and +5% Haste when inserted into compatible equipment. Replacing an installed gem permanently destroys the previous gem.'}},endgame:true}
  ]},
  Engineering:{icon:'⚙',summary:'Build one-encounter gadgets and dungeon utility devices for emergency preparation and tactical advantages.',recipes:[
    {id:'eng-field-rig',name:'Field Stabiliser',level:1,xp:18,inputs:{'zeltiran-iron':2},output:{category:'consumable',key:'field-stabiliser',name:'Field Stabiliser',quantity:1,payload:{effect:'character-gadget',bonuses:{stamina:3},charges:1,description:'Deploy before combat. +3 Stamina for the next boss encounter. Only one Gadget can be active.'}}},
    {id:'eng-static-coil',name:'Static Coil',level:10,xp:22,inputs:{'zeltiran-iron':2,'faded-cell-fragment':1},output:{category:'consumable',key:'static-coil',name:'Static Coil',quantity:1,payload:{effect:'character-gadget',bonuses:{damagePct:2},charges:1,description:'Deploy before combat. +2% Damage for the next boss encounter. Only one Gadget can be active.'}}},
    {id:'eng-threat-beacon',name:'Threat Beacon',level:20,xp:28,inputs:{'zeltiran-iron':2,'ashen-soul-fragment':1},output:{category:'consumable',key:'threat-beacon',name:'Threat Beacon',quantity:1,payload:{effect:'character-gadget',bonuses:{threat:6,stamina:2},charges:1,description:'Deploy before combat. +6% Threat and +2 Stamina for the next boss encounter.'}}},
    {id:'eng-emergency-rig',name:"Engineer's Emergency Rig",level:30,xp:34,inputs:{'warden-iron':1,'ashen-soul-fragment':2},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'engineers-emergency-rig',name:"Engineer's Emergency Rig",quantity:1,payload:{effect:'character-gadget',bonuses:{armour:12,stamina:5},charges:1,description:'Crafter only. +12 Armour and +5 Stamina for the next boss encounter.'}}},
    {id:'eng-overclock-capacitor',name:'Overclock Capacitor',level:35,xp:38,inputs:{'zeltiran-iron':2,'ember-core':1},output:{category:'consumable',key:'overclock-capacitor',name:'Overclock Capacitor',quantity:1,payload:{effect:'character-gadget',bonuses:{haste:4},charges:1,description:'Deploy before combat. +4% Haste for the next boss encounter.'}}},
    {id:'eng-barrier-projector',name:'Barrier Projector',level:45,xp:46,inputs:{'warden-iron':1,'vaultheart-crystal':1},output:{category:'consumable',key:'barrier-projector',name:'Barrier Projector',quantity:1,payload:{effect:'character-gadget',bonuses:{magicWardPct:6,stamina:3},charges:1,description:'Deploy before combat. 6% less magic damage taken and +3 Stamina for the next boss encounter.'}}},
    {id:'eng-targeting-array',name:'Targeting Array',level:55,xp:52,inputs:{'ashen-soul-fragment':2,'cell-shards':1,'ember-core':1},output:{category:'consumable',key:'targeting-array',name:'Targeting Array',quantity:1,payload:{effect:'character-gadget',bonuses:{crit:4,damagePct:2},charges:1,description:'Deploy before combat. +4% Critical Strike and +2% Damage for the next boss encounter.'}}},
    {id:'eng-recovery-drone',name:'Recovery Drone',level:65,xp:58,inputs:{'cell-shards':2,'vaultheart-crystal':1,'ember-core':1},output:{category:'consumable',key:'recovery-drone',name:'Recovery Drone',quantity:1,payload:{effect:'character-gadget',bonuses:{healing:6,stamina:3},charges:1,description:'Deploy before combat. +6% Healing Power and +3 Stamina for the next boss encounter.'}}},
    {id:'eng-master-rig',name:"Master Engineer's Rig",level:75,xp:62,inputs:{'cell-shards':4,'vaultheart-crystal':1,'warden-iron':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'master-engineers-rig',name:"Master Engineer's Rig",quantity:1,payload:{effect:'character-gadget',bonuses:{damagePct:3,haste:3,magicWardPct:4},charges:1,description:'Crafter only. +3% Damage, +3% Haste and 4% less magic damage taken for the next boss encounter.'}}},
    {id:'eng-void-capacitor',name:'Void Capacitor',level:80,xp:66,inputs:{'cell-shards':5,'void-crystal':1},output:{category:'consumable',key:'void-capacitor',name:'Void Capacitor',quantity:1,payload:{effect:'character-gadget',bonuses:{damagePct:4,magicWardPct:5},charges:1,description:'Deploy before combat. +4% Damage and 5% less magic damage taken for the next boss encounter.'}},endgame:true},
    {id:'eng-grid-override-charge',name:'Grid Override Charge',level:90,xp:72,inputs:{'ancient-soul':1,'cell-shards':6,'ember-core':1},output:{category:'consumable',key:'grid-override-charge',name:'Grid Override Charge',quantity:1,payload:{effect:'character-gadget',bonuses:{haste:5,crit:4},charges:1,description:'Deploy for +5% Haste and +4% Critical Strike for the next boss encounter, or consume this charge to restore the Blackout Station grid after your first manual clear.'}},endgame:true},
    {id:'eng-singularity-device',name:'Singularity Device',level:100,xp:0,inputs:{'ancient-soul':2,'void-crystal':2,'cell-shards':10},output:{category:'consumable',key:'singularity-device',name:'Singularity Device',quantity:1,payload:{effect:'character-gadget',bonuses:{damagePct:6,crit:5,haste:4},charges:1,description:'Master engineering device. +6% Damage, +5% Critical Strike and +4% Haste for the next boss encounter.'}},endgame:true}
  ]},
  Cooking:{icon:'♨',summary:'Prepare meals and party feasts that provide sustained combat preparation without replacing Alchemy flasks.',recipes:[
    {id:'cook-field-rations',name:'Field Rations',level:1,xp:18,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'field-rations',name:'Field Rations',quantity:1,payload:{effect:'character-food',bonuses:{stamina:2},charges:3,description:'Eat before combat. +2 Stamina for the next 3 boss encounters. Only one Food effect can be active.'}}},
    {id:'cook-quickbite',name:'Quickbite Skewers',level:10,xp:22,inputs:{'faded-cell-fragment':2,'zeltiran-iron':1},output:{category:'consumable',key:'quickbite-skewers',name:'Quickbite Skewers',quantity:1,payload:{effect:'character-food',bonuses:{haste:2},charges:3,description:'Eat before combat. +2% Haste for the next 3 boss encounters.'}}},
    {id:'cook-ember-stew',name:'Ember Stew',level:20,xp:28,inputs:{'ashen-soul-fragment':2},output:{category:'consumable',key:'ember-stew',name:'Ember Stew',quantity:1,payload:{effect:'character-food',bonuses:{damagePct:2,stamina:2},charges:3,description:'Eat before combat. +2% Damage and +2 Stamina for the next 3 boss encounters.'}}},
    {id:'cook-chefs-special',name:"Chef's Special",level:30,xp:34,inputs:{'ashen-soul-fragment':2,'ember-core':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'chefs-special',name:"Chef's Special",quantity:1,payload:{effect:'character-food',bonuses:{crit:3,haste:2,stamina:3},charges:3,description:'Crafter only. +3% Critical Strike, +2% Haste and +3 Stamina for the next 3 boss encounters.'}}},
    {id:'cook-keeneye-broth',name:'Keeneye Broth',level:35,xp:38,inputs:{'ashen-soul-fragment':2,'warden-iron':1},output:{category:'consumable',key:'keeneye-broth',name:'Keeneye Broth',quantity:1,payload:{effect:'character-food',bonuses:{crit:3},charges:3,description:'Eat before combat. +3% Critical Strike for the next 3 boss encounters.'}}},
    {id:'cook-soul-broth',name:'Soul Broth',level:45,xp:46,inputs:{'ashen-soul-fragment':2,'vaultheart-crystal':1},output:{category:'consumable',key:'soul-broth',name:'Soul Broth',quantity:1,payload:{effect:'character-food',bonuses:{healing:4,stamina:2},charges:3,description:'Eat before combat. +4% Healing Power and +2 Stamina for the next 3 boss encounters.'}}},
    {id:'cook-warden-platter',name:'Warden Platter',level:55,xp:52,inputs:{'warden-iron':1,'cell-shards':1,'ashen-soul-fragment':2},output:{category:'consumable',key:'warden-platter',name:'Warden Platter',quantity:1,payload:{effect:'character-food',bonuses:{armour:12,stamina:4},charges:3,description:'Eat before combat. +12 Armour and +4 Stamina for the next 3 boss encounters.'}}},
    {id:'cook-vault-feast',name:'Vault Feast',level:65,xp:58,inputs:{'ashen-soul-fragment':3,'cell-shards':3,'vaultheart-crystal':1},output:{category:'consumable',key:'vault-feast',name:'Vault Feast',quantity:1,payload:{effect:'party-food',bonuses:{stamina:3,haste:2},charges:3,description:'Serve to the active five. Every party member gains +3 Stamina and +2% Haste for the next 3 boss encounters.'}}},
    {id:'cook-grandmasters-banquet',name:"Grandmaster's Banquet",level:75,xp:62,inputs:{'cell-shards':4,'vaultheart-crystal':1,'ember-core':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'grandmasters-banquet',name:"Grandmaster's Banquet",quantity:1,payload:{effect:'character-food',bonuses:{damagePct:3,crit:3,stamina:5},charges:3,description:'Crafter only. +3% Damage, +3% Critical Strike and +5 Stamina for the next 3 boss encounters.'}}},
    {id:'cook-void-banquet',name:'Void Banquet',level:80,xp:66,inputs:{'cell-shards':5,'void-crystal':1},output:{category:'consumable',key:'void-banquet',name:'Void Banquet',quantity:1,payload:{effect:'party-food',bonuses:{magicWardPct:4,stamina:3},charges:3,description:'Serve to the active five. Every party member takes 4% less magic damage and gains +3 Stamina for the next 3 boss encounters.'}},endgame:true},
    {id:'cook-ancient-table',name:'Ancient Table',level:90,xp:72,inputs:{'ancient-soul':1,'cell-shards':6,'vaultheart-crystal':1},output:{category:'consumable',key:'ancient-table',name:'Ancient Table',quantity:1,payload:{effect:'party-food',bonuses:{crit:3,haste:3,stamina:3},charges:3,description:'Serve to the active five. +3% Critical Strike, +3% Haste and +3 Stamina for the next 3 boss encounters.'}},endgame:true},
    {id:'cook-cellbound-feast',name:'Cellbound Feast',level:100,xp:0,inputs:{'ancient-soul':2,'void-crystal':2,'cell-shards':10},output:{category:'consumable',key:'cellbound-feast',name:'Cellbound Feast',quantity:1,payload:{effect:'party-food',bonuses:{damagePct:3,healing:3,stamina:5},charges:3,description:'Master feast for the active five. +3% Damage, +3% Healing Power and +5 Stamina for the next 3 boss encounters.'}},endgame:true}
  ]},
  Reliccrafting:{icon:'◈',summary:'Build Relic Cores that permanently alter an equipped Relic until another core or Relic attachment replaces them.',recipes:[
    {id:'rc-echo-core',name:'Echo Core',level:1,xp:18,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'echo-core',name:'Echo Core',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{crit:2},description:'Relic Core. Attach to an equipped Relic for +2% Critical Strike.'}}},
    {id:'rc-pulse-core',name:'Pulse Core',level:10,xp:22,inputs:{'faded-cell-fragment':2,'zeltiran-iron':1},output:{category:'consumable',key:'pulse-core',name:'Pulse Core',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{haste:2},description:'Relic Core. Attach to an equipped Relic for +2% Haste.'}}},
    {id:'rc-guardian-core',name:'Guardian Core',level:20,xp:28,inputs:{'ashen-soul-fragment':2},output:{category:'consumable',key:'guardian-core',name:'Guardian Core',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{stamina:4},description:'Relic Core. Attach to an equipped Relic for +4 Stamina.'}}},
    {id:'rc-corewrights-heart',name:"Corewright's Heart",level:30,xp:34,inputs:{'ashen-soul-fragment':2,'ember-core':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'corewrights-heart',name:"Corewright's Heart",quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{damagePct:2,healing:2,stamina:3},description:'Crafter only. Relic Core granting +2% Damage, +2% Healing Power and +3 Stamina.'}}},
    {id:'rc-ember-core-matrix',name:'Ember Core Matrix',level:35,xp:38,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'consumable',key:'ember-core-matrix',name:'Ember Core Matrix',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{damagePct:3},description:'Relic Core. Attach for +3% Damage.'}}},
    {id:'rc-mender-core',name:'Mender Core',level:45,xp:46,inputs:{'ashen-soul-fragment':2,'vaultheart-crystal':1},output:{category:'consumable',key:'mender-core',name:'Mender Core',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{healing:5},description:'Relic Core. Attach for +5% Healing Power.'}}},
    {id:'rc-bulwark-core',name:'Bulwark Core',level:55,xp:52,inputs:{'warden-iron':1,'cell-shards':1,'ashen-soul-fragment':2},output:{category:'consumable',key:'bulwark-core',name:'Bulwark Core',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{armour:14,stamina:4},description:'Relic Core. Attach for +14 Armour and +4 Stamina.'}}},
    {id:'rc-vault-core',name:'Vault Core',level:65,xp:58,inputs:{'cell-shards':2,'vaultheart-crystal':1,'ashen-soul-fragment':2},output:{category:'consumable',key:'vault-core',name:'Vault Core',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{crit:3,haste:3},description:'Relic Core. Attach for +3% Critical Strike and +3% Haste.'}}},
    {id:'rc-soulwright-core',name:"Soulwright's Core",level:75,xp:62,inputs:{'cell-shards':4,'vaultheart-crystal':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'soulwrights-core',name:"Soulwright's Core",quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{damagePct:4,healing:4,stamina:4},description:'Crafter only. Relic Core granting +4% Damage, +4% Healing Power and +4 Stamina.'}}},
    {id:'rc-void-core',name:'Void Core',level:80,xp:66,inputs:{'cell-shards':5,'void-crystal':1},output:{category:'consumable',key:'void-core',name:'Void Core',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{magicWardPct:6,damagePct:3},description:'Relic Core. Attach for +3% Damage and 6% less magic damage taken.'}},endgame:true},
    {id:'rc-ancient-core',name:'Ancient Core',level:90,xp:72,inputs:{'ancient-soul':1,'cell-shards':7,'vaultheart-crystal':1},output:{category:'consumable',key:'ancient-core',name:'Ancient Core',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{crit:4,haste:4,stamina:4},description:'Relic Core. Attach for +4% Critical Strike, +4% Haste and +4 Stamina.'}},endgame:true},
    {id:'rc-cellheart-core',name:'Cellheart Core',level:100,xp:0,inputs:{'ancient-soul':2,'void-crystal':2,'cell-shards':10},output:{category:'consumable',key:'cellheart-core',name:'Cellheart Core',quantity:1,payload:{effect:'gear-enhancement',attachmentFamily:'relic-core',slot:'Relic',bonuses:{damagePct:5,healing:5,stamina:6},description:'Master Relic Core. Attach for +5% Damage, +5% Healing Power and +6 Stamina.'}},endgame:true}
  ]},
  Scribing:{icon:'✒',summary:'Create tactical scrolls and party manuscripts for short, encounter-specific preparation.',recipes:[
    {id:'scr-minor-ward',name:'Minor Ward Scroll',level:1,xp:18,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'minor-ward-scroll',name:'Minor Ward Scroll',quantity:1,payload:{effect:'character-scroll',bonuses:{magicWardPct:2},charges:1,description:'Read before combat. Take 2% less magic damage for the next boss encounter. Only one Scroll can be active.'}}},
    {id:'scr-precision',name:'Scroll of Precision',level:10,xp:22,inputs:{'faded-cell-fragment':2,'zeltiran-iron':1},output:{category:'consumable',key:'scroll-of-precision',name:'Scroll of Precision',quantity:1,payload:{effect:'character-scroll',bonuses:{crit:3},charges:1,description:'Read before combat. +3% Critical Strike for the next boss encounter.'}}},
    {id:'scr-fortitude',name:'Scroll of Fortitude',level:20,xp:28,inputs:{'ashen-soul-fragment':2},output:{category:'consumable',key:'scroll-of-fortitude',name:'Scroll of Fortitude',quantity:1,payload:{effect:'character-scroll',bonuses:{stamina:5},charges:1,description:'Read before combat. +5 Stamina for the next boss encounter.'}}},
    {id:'scr-scribes-seal',name:"Scribe's Seal",level:30,xp:34,inputs:{'ashen-soul-fragment':2,'ember-core':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'scribes-seal',name:"Scribe's Seal",quantity:1,payload:{effect:'character-scroll',bonuses:{damagePct:2,crit:2,magicWardPct:2},charges:1,description:'Crafter only. +2% Damage, +2% Critical Strike and 2% less magic damage taken for the next boss encounter.'}}},
    {id:'scr-quickening',name:'Scroll of Quickening',level:35,xp:38,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'consumable',key:'scroll-of-quickening',name:'Scroll of Quickening',quantity:1,payload:{effect:'character-scroll',bonuses:{haste:4},charges:1,description:'Read before combat. +4% Haste for the next boss encounter.'}}},
    {id:'scr-mending',name:'Scroll of Mending',level:45,xp:46,inputs:{'ashen-soul-fragment':2,'vaultheart-crystal':1},output:{category:'consumable',key:'scroll-of-mending',name:'Scroll of Mending',quantity:1,payload:{effect:'character-scroll',bonuses:{healing:6},charges:1,description:'Read before combat. +6% Healing Power for the next boss encounter.'}}},
    {id:'scr-ashen-hunters-notes',name:"Ashen Hunter's Notes",level:55,xp:52,inputs:{'ashen-soul-fragment':3,'cell-shards':1,'ember-core':1},output:{category:'consumable',key:'ashen-hunters-notes',name:"Ashen Hunter's Notes",quantity:1,payload:{effect:'character-scroll',bonuses:{damagePct:2},affinityZone:'ashen-vault',affinityBonuses:{damagePct:3},charges:1,description:'Encounter manuscript. +2% Damage for the next boss encounter; an additional +3% Damage inside Ashen Vault (5% total).'}}},
    {id:'scr-vault-manuscript',name:'Vaultward Manuscript',level:65,xp:58,inputs:{'ashen-soul-fragment':2,'cell-shards':2,'vaultheart-crystal':1},output:{category:'consumable',key:'vaultward-manuscript',name:'Vaultward Manuscript',quantity:1,payload:{effect:'party-scroll',bonuses:{magicWardPct:3,stamina:2},affinityZone:'ashen-vault',affinityBonuses:{magicWardPct:2},charges:1,description:'Read to the active five. All gain +2 Stamina and take 3% less magic damage; an additional 2% less magic damage inside Ashen Vault for the next boss encounter.'}}},
    {id:'scr-archivists-command',name:"Archivist's Command",level:75,xp:62,inputs:{'cell-shards':4,'vaultheart-crystal':1},crafterOnly:true,trainingScale:.45,output:{category:'consumable',key:'archivists-command',name:"Archivist's Command",quantity:1,payload:{effect:'character-scroll',bonuses:{damagePct:3,haste:3,crit:3},charges:1,description:'Crafter only. +3% Damage, +3% Haste and +3% Critical Strike for the next boss encounter.'}}},
    {id:'scr-voidward-manuscript',name:'Voidward Manuscript',level:80,xp:66,inputs:{'cell-shards':5,'void-crystal':1},output:{category:'consumable',key:'voidward-manuscript',name:'Voidward Manuscript',quantity:1,payload:{effect:'party-scroll',bonuses:{magicWardPct:5},charges:1,description:'Read to the active five. Every party member takes 5% less magic damage for the next boss encounter.'}},endgame:true},
    {id:'scr-ancient-battleplan',name:'Ancient Battleplan',level:90,xp:72,inputs:{'ancient-soul':1,'cell-shards':7,'ember-core':1},output:{category:'consumable',key:'ancient-battleplan',name:'Ancient Battleplan',quantity:1,payload:{effect:'party-scroll',bonuses:{crit:3,haste:3},charges:1,description:'Read to the active five. +3% Critical Strike and +3% Haste for the next boss encounter.'}},endgame:true},
    {id:'scr-cellbound-codex',name:'Cellbound Codex',level:100,xp:0,inputs:{'ancient-soul':2,'void-crystal':2,'cell-shards':10},output:{category:'consumable',key:'cellbound-codex',name:'Cellbound Codex',quantity:1,payload:{effect:'party-scroll',bonuses:{damagePct:3,healing:3,magicWardPct:3},charges:1,description:'Master tactical manuscript for the active five. +3% Damage, +3% Healing Power and 3% less magic damage taken for the next boss encounter.'}},endgame:true}
  ]}
};
const PROFESSION_REAGENT_TIERS={
  Alchemy:[
    [1,{'hollowroot':2}],[10,{'hollowroot':3}],[20,{'hollowroot':2,'emberleaf':1}],[30,{'hollowroot':2,'emberleaf':2}],
    [35,{'hollowroot':2,'spiritcap':1,'emberleaf':1}],[40,{'hollowroot':2,'spiritcap':1}],[50,{'hollowroot':2,'spiritcap':2,'vaultheart-crystal':1}],
    [60,{'hollowroot':2,'emberleaf':2,'ashen-soul-fragment':1}],[70,{'hollowroot':2,'spiritcap':2,'vaultheart-crystal':1,'cell-shards':1}],
    [75,{'hollowroot':2,'emberleaf':2,'spiritcap':2,'vaultheart-crystal':1}],[85,{'spiritcap':3,'void-crystal':1,'cell-shards':2}],
    [100,{'spiritcap':4,'ancient-soul':2,'void-crystal':1}]
  ],
  Enchanting:[
    [1,{'rune-dust':2}],[10,{'rune-dust':3}],[20,{'rune-dust':3,'ashen-soul-fragment':1}],[25,{'rune-dust':3,'warden-iron':1}],
    [30,{'rune-dust':4,'ashen-soul-fragment':1}],[40,{'rune-dust':4,'ember-core':1}],[50,{'rune-dust':4,'vaultheart-crystal':1}],
    [60,{'rune-dust':4,'arcane-ink':1,'ashen-soul-fragment':1}],[70,{'rune-dust':4,'cell-shards':2,'vaultheart-crystal':1}],
    [75,{'rune-dust':5,'arcane-ink':2,'vaultheart-crystal':1}],[85,{'rune-dust':5,'void-crystal':1,'cell-shards':2}],
    [100,{'rune-dust':6,'ancient-soul':1,'void-crystal':1,'cell-shards':4}]
  ],
  Blacksmithing:[
    [1,{'zeltiran-iron':2,'tempering-flux':1}],[10,{'zeltiran-iron':3,'tempering-flux':1}],[20,{'zeltiran-iron':3,'tempering-flux':2}],
    [25,{'warden-iron':1,'tempering-flux':2}],[30,{'zeltiran-iron':3,'tempering-flux':2,'ashen-soul-fragment':1}],
    [35,{'zeltiran-iron':4,'tempering-flux':2}],[45,{'warden-iron':1,'tempering-flux':2,'ember-core':1}],
    [55,{'warden-iron':2,'tempering-flux':2,'cell-shards':1}],[65,{'warden-iron':2,'tempering-flux':3,'vaultheart-crystal':1}],
    [75,{'warden-iron':3,'tempering-flux':3,'cell-shards':2}],[80,{'warden-iron':3,'tempering-flux':4,'vaultheart-crystal':1,'cell-shards':2}],
    [100,{'warden-iron':4,'tempering-flux':5,'ancient-soul':1,'void-crystal':1,'cell-shards':4}]
  ],
  Leatherworking:[
    [1,{'zeltiran-hide':2}],[10,{'zeltiran-hide':2,'hollow-fibre':1}],[20,{'zeltiran-hide':3,'hollow-fibre':1}],
    [25,{'zeltiran-hide':2,'razorhide':1}],[30,{'zeltiran-hide':2,'razorhide':1,'hollow-fibre':1}],[35,{'razorhide':2,'hollow-fibre':1}],
    [45,{'razorhide':2,'hollow-fibre':2,'ashen-soul-fragment':1}],[55,{'razorhide':2,'hollow-fibre':2,'cell-shards':1}],
    [65,{'razorhide':3,'hollow-fibre':2,'vaultheart-crystal':1}],[75,{'razorhide':3,'hollow-fibre':2,'cell-shards':2}],
    [80,{'razorhide':4,'hollow-fibre':2,'vaultheart-crystal':1}],[100,{'razorhide':5,'hollow-fibre':3,'void-crystal':1,'ancient-soul':1}]
  ],
  Tailoring:[
    [1,{'hollow-fibre':2}],[10,{'hollow-fibre':3}],[20,{'hollow-fibre':3,'rune-dust':1}],[25,{'hollow-fibre':3,'ashen-silk':1}],
    [30,{'hollow-fibre':3,'ashen-silk':2}],[35,{'hollow-fibre':2,'ashen-silk':2,'ember-core':1}],[45,{'hollow-fibre':2,'ashen-silk':3,'ashen-soul-fragment':1}],
    [55,{'hollow-fibre':3,'ashen-silk':3,'rune-dust':1}],[65,{'hollow-fibre':3,'ashen-silk':4,'vaultheart-crystal':1}],
    [75,{'hollow-fibre':4,'ashen-silk':4,'cell-shards':1}],[80,{'hollow-fibre':4,'ashen-silk':5,'vaultheart-crystal':1}],
    [100,{'hollow-fibre':5,'ashen-silk':6,'void-crystal':1,'ancient-soul':1}]
  ],
  Jewelcrafting:[
    [1,{'rough-gemstone':2}],[10,{'rough-gemstone':3}],[20,{'rough-gemstone':3,'prismatic-shard':1}],
    [30,{'rough-gemstone':2,'prismatic-shard':2,'ember-core':1}],[35,{'rough-gemstone':2,'prismatic-shard':2,'ember-core':1}],
    [45,{'prismatic-shard':3,'vaultheart-crystal':1}],[55,{'prismatic-shard':3,'warden-iron':1}],
    [65,{'prismatic-shard':4,'vaultheart-crystal':1}],[75,{'prismatic-shard':4,'cell-shards':2,'vaultheart-crystal':1}],
    [80,{'prismatic-shard':4,'void-crystal':1}],[90,{'prismatic-shard':5,'ancient-soul':1,'vaultheart-crystal':1}],
    [100,{'prismatic-shard':6,'ancient-soul':1,'void-crystal':2}]
  ],
  Engineering:[
    [1,{'salvaged-parts':2,'tempering-flux':1}],[10,{'salvaged-parts':2,'conductive-coil':1}],[20,{'salvaged-parts':3,'conductive-coil':1}],
    [30,{'salvaged-parts':3,'conductive-coil':1,'warden-iron':1}],[35,{'salvaged-parts':3,'conductive-coil':2,'ember-core':1}],
    [45,{'salvaged-parts':3,'conductive-coil':2,'vaultheart-crystal':1}],[55,{'salvaged-parts':4,'conductive-coil':2,'cell-shards':1,'ember-core':1}],
    [65,{'salvaged-parts':4,'conductive-coil':3,'cell-shards':2,'vaultheart-crystal':1}],[75,{'salvaged-parts':5,'conductive-coil':3,'warden-iron':1,'cell-shards':2}],
    [80,{'salvaged-parts':5,'conductive-coil':4,'void-crystal':1}],[90,{'salvaged-parts':6,'conductive-coil':4,'ancient-soul':1,'ember-core':1}],
    [100,{'salvaged-parts':7,'conductive-coil':5,'ancient-soul':1,'void-crystal':1,'cell-shards':3}]
  ],
  Cooking:[
    [1,{'cavebeast-meat':2,'hollowroot':1}],[10,{'cavebeast-meat':2,'hollowroot':2}],[20,{'cavebeast-meat':2,'emberleaf':1}],
    [30,{'cavebeast-meat':3,'emberleaf':1}],[35,{'cavebeast-meat':2,'spiritcap':1}],[45,{'cavebeast-meat':3,'spiritcap':1,'hollowroot':1}],
    [55,{'cavebeast-meat':3,'hollowroot':2,'emberleaf':1}],[65,{'cavebeast-meat':5,'hollowroot':3,'emberleaf':1}],
    [75,{'cavebeast-meat':5,'spiritcap':2,'emberleaf':2}],[80,{'cavebeast-meat':5,'spiritcap':3,'void-crystal':1}],
    [90,{'cavebeast-meat':6,'spiritcap':3,'ancient-soul':1}],[100,{'cavebeast-meat':8,'hollowroot':4,'emberleaf':3,'ancient-soul':1}]
  ],
  Reliccrafting:[
    [1,{'rune-dust':1,'rough-gemstone':1}],[10,{'rune-dust':2,'rough-gemstone':1}],[20,{'rune-dust':2,'prismatic-shard':1,'ashen-soul-fragment':1}],
    [30,{'rune-dust':2,'prismatic-shard':2,'ember-core':1}],[35,{'rune-dust':2,'prismatic-shard':2,'ember-core':1}],
    [45,{'rune-dust':2,'prismatic-shard':3,'vaultheart-crystal':1}],[55,{'rune-dust':3,'prismatic-shard':2,'cell-shards':1,'warden-iron':1}],
    [65,{'rune-dust':3,'prismatic-shard':3,'vaultheart-crystal':1,'cell-shards':1}],[75,{'rune-dust':4,'prismatic-shard':3,'cell-shards':2}],
    [80,{'rune-dust':4,'prismatic-shard':4,'void-crystal':1}],[90,{'rune-dust':5,'prismatic-shard':4,'ancient-soul':1}],
    [100,{'rune-dust':6,'prismatic-shard':5,'ancient-soul':1,'void-crystal':1,'cell-shards':2}]
  ],
  Scribing:[
    [1,{'etched-vellum':2,'arcane-ink':1}],[10,{'etched-vellum':2,'arcane-ink':1,'rune-dust':1}],[20,{'etched-vellum':3,'arcane-ink':1,'ashen-soul-fragment':1}],
    [30,{'etched-vellum':3,'arcane-ink':2,'ember-core':1}],[35,{'etched-vellum':3,'arcane-ink':2,'rune-dust':1}],
    [45,{'etched-vellum':3,'arcane-ink':2,'vaultheart-crystal':1}],[55,{'etched-vellum':4,'arcane-ink':2,'ashen-soul-fragment':1}],
    [65,{'etched-vellum':5,'arcane-ink':3,'vaultheart-crystal':1}],[75,{'etched-vellum':4,'arcane-ink':4,'cell-shards':1}],
    [80,{'etched-vellum':5,'arcane-ink':4,'void-crystal':1}],[90,{'etched-vellum':6,'arcane-ink':4,'ancient-soul':1}],
    [100,{'etched-vellum':7,'arcane-ink':5,'ancient-soul':1,'void-crystal':1,'cell-shards':2}]
  ]
};
function professionReagentInputs(profession,level=1){
  const tiers=PROFESSION_REAGENT_TIERS[profession]||[];
  let selected=tiers[0]?.[1]||{};
  for(const [required,inputs] of tiers){if(Number(level)>=required)selected=inputs;else break}
  return {...selected};
}
Object.entries(PROFESSIONS).forEach(([profession,def])=>(def.recipes||[]).forEach(recipe=>{
  recipe.inputs=professionReagentInputs(profession,recipe.level);
}));
function bonusText(bonuses={}){
  const labels={strength:'Strength',agility:'Agility',intellect:'Intellect',stamina:'Stamina',armour:'Armour',block:'Block',threat:'Threat',healing:'Healing Power',crit:'Critical Strike',haste:'Haste',damagePct:'Damage',magicWardPct:'Magic Damage Taken'};
  const percent=new Set(['block','threat','healing','crit','haste','damagePct','magicWardPct']);
  return Object.entries(bonuses).map(([k,v])=>k==='magicWardPct'?'-'+v+'% '+(labels[k]||k):'+'+v+(percent.has(k)?'% ':' ')+(labels[k]||k)).join(' · ');
}
function craftedRarity(level=1,endgame=false){
  if(endgame||Number(level)>=85)return'Epic';
  if(Number(level)>=50)return'Rare';
  return'Uncommon';
}
function attachmentTier(level=1){
  const n=Math.max(1,Number(level)||1);
  return n>=100?5:n>=75?4:n>=50?3:n>=25?2:1;
}
function recipeMetaForOutputKey(key){
  for(const [profession,def] of Object.entries(PROFESSIONS))for(const recipe of(def.recipes||[]))if(recipe?.output?.key===key)return{profession,recipe};
  return null
}
const SPECIAL_PREPARATIONS={
  'echo-core':{openingBurstPct:4},
  'pulse-core':{openingBurstPct:6},
  'guardian-core':{lowHealthWardPct:3},
  'corewrights-heart':{lowHealthWardPct:4,triageHealPct:3},
  'ember-core-matrix':{executeDamagePct:5},
  'mender-core':{triageHealPct:6},
  'bulwark-core':{lowHealthWardPct:5},
  'vault-core':{openingBurstPct:8},
  'soulwrights-core':{executeDamagePct:6,triageHealPct:6},
  'void-core':{lowHealthWardPct:7},
  'ancient-core':{openingBurstPct:10},
  'cellheart-core':{openingBurstPct:10,executeDamagePct:8,triageHealPct:8},
  'field-stabiliser':{lowHealthWardPct:3},
  'engineers-emergency-rig':{lowHealthWardPct:5},
  'barrier-projector':{lowHealthWardPct:6},
  'targeting-array':{openingBurstPct:6},
  'recovery-drone':{triageHealPct:8},
  'master-engineers-rig':{lowHealthWardPct:6,openingBurstPct:5},
  'grid-override-charge':{openingBurstPct:7},
  'singularity-device':{openingBurstPct:10}
};
function specialText(proc={}){
  return [
    proc.openingBurstPct?'First attack each encounter: +'+proc.openingBurstPct+'% damage.':null,
    proc.executeDamagePct?'Targets below 35% HP: +'+proc.executeDamagePct+'% damage.':null,
    proc.lowHealthWardPct?'Below 40% HP: '+proc.lowHealthWardPct+'% less damage taken.':null,
    proc.triageHealPct?'Healing allies below 40% HP: +'+proc.triageHealPct+'% healing.':null
  ].filter(Boolean).join(' ');
}
Object.entries(PROFESSIONS).forEach(([profession,def])=>(def.recipes||[]).forEach(recipe=>{
  const output=recipe.output||{},payload=output.payload||{};
  if(recipe.crafterOnly){payload.crafterOnly=true;payload.requiredProfession=profession;output.tradeState='soulbound'}
  if(SPECIAL_PREPARATIONS[output.key]){payload.proc={...SPECIAL_PREPARATIONS[output.key]};payload.procText=specialText(payload.proc);if(payload.effect==='character-gadget')payload.description=(payload.description||'Deploy before combat.')+' '+payload.procText}
  output.rarity=output.rarity||craftedRarity(recipe.level,recipe.endgame);
  if(payload.effect==='socket-gem'){
    payload.socketReady=true;
    payload.description=(recipe.crafterOnly?'Crafter only. ':'')+'Insert into an open equipment socket. '+bonusText(payload.bonuses||{})+'. Replacing this gem later permanently destroys it.';
  }
  if(payload.effect==='gear-enhancement'){
    payload.persistentAttachment=true;
    payload.attachmentTier=attachmentTier(recipe.level);
    delete payload.charges;
    payload.description='Attach to an equipped '+payload.slot+' item. '+bonusText(payload.bonuses||{})+'. '+(payload.procText?payload.procText+' ':'')+'Remains on that item until replaced.';
    output.category='consumable';
  }
}));
function itemSignature(item){return item?.rollId||item?.itemId||item?.name||null}
function activeProcs(c){
  const totals={};
  const add=src=>Object.entries(src||{}).forEach(([k,v])=>totals[k]=(Number(totals[k])||0)+(Number(v)||0));
  Object.values(c?.equipment||{}).forEach(item=>{
    const a=item?.attachment;
    if(a?.attachmentFamily==='relic-core'&&(!a.crafterOnly||a.boundCharacterId===c?.id))add(a.proc)
  });
  (Array.isArray(c?.activeProfessionBuffs)?c.activeProfessionBuffs:[]).forEach(e=>{
    if(e.kind==='gadget'&&(Number(e.remainingBosses)||0)>0)add(e.proc)
  });
  return totals;
}
function activeBonuses(c,zone=null){
  const totals={};
  const add=src=>Object.entries(src||{}).forEach(([k,v])=>totals[k]=(Number(totals[k])||0)+(Number(v)||0));
  Object.values(c?.equipment||{}).forEach(item=>{
    const a=item?.attachment;if(a?.bonuses&&(!a.crafterOnly||a.boundCharacterId===c?.id))add(a.bonuses);
    (Array.isArray(item?.sockets)?item.sockets:[]).forEach(gem=>{if(gem?.bonuses&&(!gem.crafterOnly||gem.boundCharacterId===c?.id))add(gem.bonuses)})
  });
  Object.values(c?.activeEnhancements||{}).forEach(e=>{
    const item=c?.equipment?.[e.slot];
    if((Number(e.remainingBosses)||0)>0&&itemSignature(item)===e.targetSignature)add(e.bonuses);
  });
  (Array.isArray(c?.activeProfessionBuffs)?c.activeProfessionBuffs:[]).forEach(e=>{if((Number(e.remainingBosses)||0)>0){add(e.bonuses);if(zone&&e.affinityZone===zone)add(e.affinityBonuses)}});
  return totals;
}
function activeEffects(c){
  const out=[];
  Object.entries(c?.equipment||{}).forEach(([slot,item])=>{
    const a=item?.attachment;if(a?.bonuses&&(!a.crafterOnly||a.boundCharacterId===c?.id))out.push({kind:'attachment',name:a.name||a.key||'Attachment',slot,permanent:true,bonuses:a.bonuses,tier:a.tier||a.attachmentTier||null,crafterOnly:Boolean(a.crafterOnly)});
    (Array.isArray(item?.sockets)?item.sockets:[]).forEach((gem,index)=>{if(gem?.bonuses&&(!gem.crafterOnly||gem.boundCharacterId===c?.id))out.push({kind:'socket-gem',name:gem.name||gem.key||'Socket Gem',slot,socketIndex:index,permanent:true,bonuses:gem.bonuses,crafterOnly:Boolean(gem.crafterOnly)})})
  });
  Object.values(c?.activeEnhancements||{}).forEach(e=>{
    const item=c?.equipment?.[e.slot],active=(Number(e.remainingBosses)||0)>0&&itemSignature(item)===e.targetSignature;
    if(active)out.push({kind:'enhancement',name:e.name,slot:e.slot,remainingBosses:e.remainingBosses,bonuses:e.bonuses});
  });
  (Array.isArray(c?.activeProfessionBuffs)?c.activeProfessionBuffs:[]).forEach(e=>{if((Number(e.remainingBosses)||0)>0)out.push({kind:e.kind||'flask',name:e.name,remainingBosses:e.remainingBosses,bonuses:e.bonuses})});
  return out;
}
function consumeBossCharges(chars=[]){
  const expired=[];
  (chars||[]).forEach(c=>{
    c.activeEnhancements=c.activeEnhancements&&typeof c.activeEnhancements==='object'?c.activeEnhancements:{};
    Object.keys(c.activeEnhancements).forEach(slot=>{
      const e=c.activeEnhancements[slot],item=c?.equipment?.[slot];
      if((Number(e.remainingBosses)||0)>0&&itemSignature(item)===e.targetSignature){
        e.remainingBosses--;if(e.remainingBosses<=0){expired.push(c.name+' · '+e.name);delete c.activeEnhancements[slot]}
      }
    });
    c.activeProfessionBuffs=(Array.isArray(c.activeProfessionBuffs)?c.activeProfessionBuffs:[]).filter(e=>{
      if((Number(e.remainingBosses)||0)<=0)return false;
      e.remainingBosses--;if(e.remainingBosses<=0){expired.push(c.name+' · '+e.name);return false}return true
    });
  });
  return expired;
}
function consumeBossChargesOnce(chars=[],encounterKey='',state=null){
  const key=String(encounterKey||'').trim();
  if(!key||!state)return[];
  state.professionBossChargeClaims=Array.isArray(state.professionBossChargeClaims)?state.professionBossChargeClaims:[];
  if(state.professionBossChargeClaims.includes(key))return[];
  state.professionBossChargeClaims.push(key);
  state.professionBossChargeClaims=state.professionBossChargeClaims.slice(-250);
  return consumeBossCharges(chars);
}
const BOSS_REAGENTS={
  ashwarden:[{key:'ashen-soul-fragment',min:2,max:4},{key:'warden-iron',min:1,max:2}],
  embermaw:[{key:'ashen-soul-fragment',min:2,max:4},{key:'ember-core',min:1,max:2}],
  vaultheart:[{key:'ashen-soul-fragment',min:3,max:5},{key:'vaultheart-crystal',min:1,max:2}]
};
const GENERAL_REAGENT_POOL=[
  {key:'hollowroot',min:2,max:4},{key:'cavebeast-meat',min:2,max:4},{key:'rune-dust',min:2,max:4},
  {key:'zeltiran-hide',min:2,max:4},{key:'hollow-fibre',min:2,max:4},{key:'rough-gemstone',min:2,max:4},
  {key:'salvaged-parts',min:2,max:4},{key:'tempering-flux',min:1,max:3},{key:'arcane-ink',min:1,max:3},{key:'etched-vellum',min:2,max:4}
];
const BOSS_RESOURCE_POOLS={
  ashwarden:[
    {key:'hollowroot',min:1,max:3},{key:'tempering-flux',min:1,max:3},{key:'rune-dust',min:1,max:3},
    {key:'zeltiran-iron',min:1,max:3},{key:'hollow-fibre',min:1,max:2}
  ],
  embermaw:[
    {key:'cavebeast-meat',min:2,max:4},{key:'zeltiran-hide',min:1,max:3},{key:'emberleaf',min:1,max:3},
    {key:'hollowroot',min:1,max:3},{key:'razorhide',min:1,max:2}
  ],
  vaultheart:[
    {key:'rough-gemstone',min:2,max:4},{key:'prismatic-shard',min:1,max:2},{key:'rune-dust',min:2,max:4},
    {key:'arcane-ink',min:1,max:3},{key:'etched-vellum',min:2,max:4},{key:'spiritcap',min:1,max:2}
  ]
};
const CONTENT_RESOURCE_PROFILES={
  'hollow-sanctum':[
    {key:'rune-dust',min:2,max:4},{key:'rough-gemstone',min:2,max:4},{key:'prismatic-shard',min:1,max:2},
    {key:'arcane-ink',min:1,max:3},{key:'etched-vellum',min:2,max:4},{key:'ashen-silk',min:1,max:3}
  ],
  'chaos-canyon':[
    {key:'cavebeast-meat',min:2,max:5},{key:'zeltiran-hide',min:2,max:4},{key:'razorhide',min:1,max:2},
    {key:'hollowroot',min:2,max:4},{key:'emberleaf',min:1,max:3},{key:'spiritcap',min:1,max:2}
  ],
  'blackout-station':[
    {key:'salvaged-parts',min:2,max:5},{key:'conductive-coil',min:1,max:3},{key:'tempering-flux',min:1,max:3},
    {key:'zeltiran-iron',min:1,max:3},{key:'rune-dust',min:1,max:3}
  ],
  'fractured-ages':[
    {key:'zeltiran-iron',min:1,max:3},{key:'tempering-flux',min:1,max:3},{key:'etched-vellum',min:2,max:4},
    {key:'arcane-ink',min:1,max:3},{key:'salvaged-parts',min:2,max:4},{key:'conductive-coil',min:1,max:2},
    {key:'prismatic-shard',min:1,max:2},{key:'rune-dust',min:2,max:4}
  ],
  manor:[
    {key:'hollow-fibre',min:2,max:5},{key:'ashen-silk',min:1,max:3},{key:'etched-vellum',min:2,max:4},
    {key:'arcane-ink',min:1,max:3},{key:'salvaged-parts',min:2,max:4},{key:'conductive-coil',min:1,max:2},
    {key:'tempering-flux',min:1,max:3}
  ],
  'null-complex':[
    {key:'salvaged-parts',min:2,max:4},{key:'conductive-coil',min:1,max:2},{key:'rune-dust',min:1,max:3},
    {key:'arcane-ink',min:1,max:2},{key:'rough-gemstone',min:1,max:3},{key:'hollow-fibre',min:1,max:3}
  ]
};
const recipeById=id=>Object.values(PROFESSIONS).flatMap(p=>p.recipes).find(r=>r.id===id)||null;
const skillThreshold=level=>160+Math.max(1,level)*7;
function rollMaterial(entry){return{key:entry.key,quantity:entry.min+Math.floor(Math.random()*(entry.max-entry.min+1))}}
function randomReagentPicks(pool,count=1){
  const choices=[...(pool||[])],picked=[];
  while(choices.length&&picked.length<count){const i=Math.floor(Math.random()*choices.length);picked.push(rollMaterial(choices.splice(i,1)[0]))}
  return picked;
}
function mergeReagentDrops(drops=[]){
  const totals=new Map();
  for(const d of drops||[])totals.set(d.key,(totals.get(d.key)||0)+Math.max(0,Number(d.quantity)||0));
  return [...totals].map(([key,quantity])=>({key,quantity}));
}
function rollReagents(bossId){
  const fixed=(BOSS_REAGENTS[bossId]||[]).map(rollMaterial);
  const themed=randomReagentPicks(BOSS_RESOURCE_POOLS[bossId]||GENERAL_REAGENT_POOL,3);
  return mergeReagentDrops([...fixed,...themed]);
}
function rollContentReagents(contentId,options={}){
  const pool=CONTENT_RESOURCE_PROFILES[contentId]||GENERAL_REAGENT_POOL;
  const difficulty=String(options.difficulty||'normal').toLowerCase(),tier=Math.max(0,Number(options.tier)||0);
  const defaultCount=difficulty==='cellbound'?4:difficulty==='raid'?5:3;
  const count=Math.max(1,Number(options.count)||defaultCount);
  const bonus=difficulty==='cellbound'?Math.floor(Math.max(0,tier-1)/7):0;
  return randomReagentPicks(pool,count).map(d=>({key:d.key,quantity:Math.max(1,d.quantity+bonus)}));
}
function formatReagentDrops(drops=[]){
  return (drops||[]).map(d=>(MATERIALS[d.key]?.name||d.key)+' ×'+d.quantity).join(', ');
}
window.CellboundProfessions={MATERIALS,PROFESSIONS,PROFESSION_REAGENT_TIERS,BOSS_REAGENTS,GENERAL_REAGENT_POOL,BOSS_RESOURCE_POOLS,CONTENT_RESOURCE_PROFILES,recipeById,recipeMetaForOutputKey,craftedRarity,attachmentTier,skillThreshold,rollReagents,rollContentReagents,formatReagentDrops,materialRarityClass,materialArtHTML,bonusText,itemSignature,activeBonuses,activeProcs,specialText,activeEffects,consumeBossCharges,consumeBossChargesOnce};
})();