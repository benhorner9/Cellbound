(()=>{
'use strict';
const CLASS_ORDER=['Warrior','Paladin','Priest','Druid','Hunter','Rogue','Mage','Shaman','Warlock','Monk','Death Knight','Demon Hunter','Evoker'];
const CORE_SLOT_ORDER=['Head','Chest','Weapon'];
const SLOT_ORDER=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic'];
const EQUIPMENT_POSITION_ORDER=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring1','Ring2','Trinket1','Trinket2','Relic'];
const TIER_META={
  1:{rarity:'Common',label:'Tier 1',dropEnabled:true,color:'#e7e7df',statCount:1,chapter:1},
  2:{rarity:'Uncommon',label:'Tier 2',dropEnabled:true,color:'#55d56a',statCount:2,chapter:1},
  3:{rarity:'Rare',label:'Tier 3',dropEnabled:false,color:'#4b9fff',statCount:3,chapter:1},
  4:{rarity:'Epic',label:'Tier 4',dropEnabled:false,color:'#b06cff',statCount:3,setBonus:true,chapter:1,endgame:true},
  5:{rarity:'Epic',label:'Tier 5',dropEnabled:false,color:'#f08a24',statCount:4,setBonus:true,chapter:1,raidExclusive:true}
};
const ITEM_LEVELS={
  Head:[18,24,32,40,46],
  Shoulders:[18,24,32,40,46],
  Chest:[20,26,34,42,48],
  Hands:[18,24,32,40,46],
  Waist:[18,24,32,40,46],
  Legs:[20,26,34,42,48],
  Feet:[18,24,32,40,46],
  Weapon:[22,28,36,44,50],
  OffHand:[21,27,35,43,49],
  Ring:[19,25,33,41,47],
  Trinket:[20,26,34,42,48],
  Relic:[21,27,35,43,49]
};
const CHAPTER_GEAR={chapter:1,levelCap:15,dungeonTierCeiling:4,raidExclusiveTier:5};
const STAT_DEFS={
  strength:{label:'Strength',unit:'flat'},agility:{label:'Agility',unit:'flat'},intellect:{label:'Intellect',unit:'flat'},
  stamina:{label:'Stamina',unit:'flat'},armour:{label:'Armour',unit:'flat'},block:{label:'Block',unit:'percent'},
  threat:{label:'Threat',unit:'percent'},healing:{label:'Healing Power',unit:'percent'},crit:{label:'Critical Strike',unit:'percent'},haste:{label:'Haste',unit:'percent'}
};
// Full Gear Combat Rebalance: a 14-position loadout must add breadth without multiplying combat ratings fourfold.
// Big armour/weapon slots carry more of the stat budget; jewellery and utility slots carry less.
const SLOT_STAT_BUDGET={Head:.72,Shoulders:.48,Chest:.95,Hands:.42,Waist:.40,Legs:.85,Feet:.42,Weapon:1,OffHand:.55,Ring:.28,Trinket:.38,Relic:.42};
const STAT_TYPE_BUDGET={flat:1,percent:.85,armour:.90};
const CLASS_STAT_POOLS={
  Warrior:['strength','stamina','armour','block','threat','crit','haste'],
  Paladin:['strength','intellect','stamina','armour','block','threat','healing','crit','haste'],
  Priest:['intellect','stamina','healing','crit','haste'],
  Druid:['intellect','stamina','healing','crit','haste'],
  Hunter:['agility','stamina','crit','haste'],
  Rogue:['agility','stamina','crit','haste'],
  Mage:['intellect','stamina','crit','haste'],
  Shaman:['intellect','stamina','healing','crit','haste'],
  Warlock:['intellect','stamina','crit','haste'],
  Monk:['agility','intellect','stamina','armour','threat','healing','crit','haste'],
  'Death Knight':['strength','stamina','armour','threat','crit','haste'],
  'Demon Hunter':['agility','stamina','armour','threat','crit','haste'],
  Evoker:['intellect','stamina','healing','crit','haste']
};
const SPEC_IDEALS={
  'Warrior|Protection':['block','threat','stamina','armour'],'Warrior|Arms':['strength','crit','haste'],
  'Paladin|Protection':['block','threat','stamina','armour'],'Paladin|Holy':['healing','intellect','haste','crit'],
  'Priest|Holy':['healing','intellect','haste','crit'],'Druid|Restoration':['healing','haste','intellect','crit'],
  'Hunter|Marksman':['agility','crit','haste'],'Rogue|Assassination':['agility','crit','haste'],'Mage|Arcane':['intellect','crit','haste'],
  'Shaman|Restoration':['healing','intellect','haste','crit'],
  'Warlock|Demonology':['intellect','haste','crit','stamina'],
  'Monk|Brewmaster':['stamina','armour','agility','haste','threat'],
  'Monk|Mistweaver':['healing','intellect','haste','crit'],
  'Monk|Windwalker':['agility','haste','crit','stamina'],
  'Death Knight|Blood':['stamina','armour','strength','threat','haste'],
  'Death Knight|Frost':['strength','crit','haste','stamina'],
  'Death Knight|Unholy':['strength','haste','crit','stamina'],
  'Demon Hunter|Havoc':['agility','haste','crit','stamina'],
  'Demon Hunter|Vengeance':['stamina','armour','agility','threat','haste'],
  'Evoker|Preservation':['healing','intellect','haste','crit','stamina'],
  'Evoker|Devastation':['intellect','crit','haste','stamina'],
  'Priest|Shadow':['intellect','haste','crit','stamina'],
  'Druid|Balance':['intellect','crit','haste','stamina'],
  'Hunter|Beast Mastery':['agility','haste','crit','stamina'],
  'Rogue|Outlaw':['agility','haste','crit','stamina'],
  'Mage|Frost':['intellect','crit','haste','stamina'],
  'Shaman|Elemental':['intellect','crit','haste','stamina'],
  'Warlock|Destruction':['intellect','crit','haste','stamina']
};
const SET_META={
  Warrior:{name:'Warlord Set',raidName:'Housebreaker Plate'},Paladin:{name:'Sunward Set',raidName:'Gilded Vigil'},Priest:{name:'Saintglass Set',raidName:'Veil of the Attic'},Druid:{name:'Moonbark Set',raidName:'Nightbloom Regalia'},
  Hunter:{name:'Hawkeye Set',raidName:'Blackwood Hunt'},Rogue:{name:'Shadecoil Set',raidName:'Silent Service'},Mage:{name:'Starweave Set',raidName:'Housebound Arcanum'},Shaman:{name:'Tempestcaller Set',raidName:'Stormcell Regalia'},Warlock:{name:'Dreadweave Set',raidName:'Netherlord Regalia'},Monk:{name:'Celestial Way Set',raidName:'Grandmaster Regalia'},'Death Knight':{name:'Ebon Oath Set',raidName:'Grave Sovereign Plate'},'Demon Hunter':{name:'Felstalker Set',raidName:'Abyssal Hunt Regalia'},Evoker:{name:'Chronoscale Set',raidName:'Aspectbound Regalia'}
};
const SET_BONUS_RULES={
  pieces2:{threshold:2,name:'Specialisation Pair'},
  pieces4:{threshold:4,name:'Talent Ensemble'}
};
const BUILD=window.CellboundBuildRules;
const SPEC_SET_BONUSES={
  'Priest|Holy':{
    4:{
      pieces2:{threshold:2,name:'Saintglass Benediction',short:'+5% Holy healing',description:'Holy healing is increased while Holy is active.',effects:{healingScale:1.05}},
      pieces4:{threshold:4,name:'Seraphic Insight',short:'+8% Mana recovery · +3% haste',description:'Mana recovery and casting speed improve, and talent-unlocked Holy skills recover 10% faster.',effects:{resourceRegen:1.08,haste:.03,talentSkillCooldownScale:.90}}
    },
    5:{
      pieces2:{threshold:2,name:'Attic Veil Benediction',short:'+7% Holy healing',description:'Raid vestments deepen Holy healing while Holy is active.',effects:{healingScale:1.07}},
      pieces4:{threshold:4,name:'Veilborne Insight',short:'+12% Mana recovery · +4% haste',description:'Mana recovery and casting speed improve, and talent-unlocked Holy skills recover 15% faster.',effects:{resourceRegen:1.12,haste:.04,talentSkillCooldownScale:.85}}
    }
  },
  'Priest|Shadow':{
    4:{
      pieces2:{threshold:2,name:'Saintglass Whispers',short:'+8% lingering Shadow damage',description:'Damage-over-time effects from Shadow Priest skills deal 8% more damage.',effects:{periodicDamageScale:1.08}},
      pieces4:{threshold:4,name:'Voidbound Insight',short:'+12% Insanity generation · 10% faster talent skills',description:'Insanity generation improves and talent-unlocked Shadow skills recover 10% faster.',effects:{resourceGainScale:1.12,talentSkillCooldownScale:.90,critBonus:.03}}
    },
    5:{
      pieces2:{threshold:2,name:'Attic Veil Whispers',short:'+12% lingering Shadow damage',description:'Raid vestments increase Shadow damage-over-time effects by 12%.',effects:{periodicDamageScale:1.12}},
      pieces4:{threshold:4,name:'Voidborne Ascendance',short:'+16% Insanity generation · 15% faster talent skills',description:'Insanity generation improves and talent-unlocked Shadow skills recover 15% faster during endgame combat.',effects:{resourceGainScale:1.16,talentSkillCooldownScale:.85,critBonus:.04}}
    }
  },
  'Shaman|Restoration':{
    4:{
      pieces2:{threshold:2,name:'Tempestcaller Tides',short:'+5% Restoration healing',description:'Restoration healing is increased while Restoration is active.',effects:{healingScale:1.05}},
      pieces4:{threshold:4,name:'Totemic Harmony',short:'+8% Mana recovery · +3% haste',description:'Mana recovery and casting speed improve, and talent-unlocked Restoration skills recover 10% faster.',effects:{resourceRegen:1.08,haste:.03,talentSkillCooldownScale:.90}}
    },
    5:{
      pieces2:{threshold:2,name:'Stormcell Tides',short:'+7% Restoration healing',description:'Raid mail deepens Restoration healing while Restoration is active.',effects:{healingScale:1.07}},
      pieces4:{threshold:4,name:'Ancestral Harmony',short:'+12% Mana recovery · +4% haste',description:'Mana recovery and casting speed improve, and talent-unlocked Restoration skills recover 15% faster.',effects:{resourceRegen:1.12,haste:.04,talentSkillCooldownScale:.85}}
    }
  },
  'Shaman|Elemental':{
    4:{
      pieces2:{threshold:2,name:'Tempestcaller Conduction',short:'+6% Elemental damage',description:'Lightning, lava and earth spells deal 6% more damage while Elemental is active.',effects:{damageScale:1.06}},
      pieces4:{threshold:4,name:'Stormcharged Insight',short:'+12% Maelstrom generation · +3% crit',description:'Maelstrom generation improves and talent-unlocked Elemental skills recover 10% faster.',effects:{resourceGainScale:1.12,talentSkillCooldownScale:.90,critBonus:.03}}
    },
    5:{
      pieces2:{threshold:2,name:'Stormcell Conduction',short:'+8% Elemental damage',description:'Raid mail increases Elemental spell damage by 8%.',effects:{damageScale:1.08}},
      pieces4:{threshold:4,name:'Primal Ascendance',short:'+16% Maelstrom generation · +4% crit',description:'Maelstrom generation improves and talent-unlocked Elemental skills recover 15% faster.',effects:{resourceGainScale:1.16,talentSkillCooldownScale:.85,critBonus:.04}}
    }
  },
  'Druid|Restoration':{
    4:{
      pieces2:{threshold:2,name:'Moonbark Renewal',short:'+5% Restoration healing',description:'Restoration healing is increased while Restoration is active.',effects:{healingScale:1.05}},
      pieces4:{threshold:4,name:'Verdant Continuance',short:'+8% Mana recovery · +3% haste',description:'Mana recovery and casting speed improve, and talent-unlocked Restoration skills recover 10% faster.',effects:{resourceRegen:1.08,haste:.03,talentSkillCooldownScale:.90}}
    },
    5:{
      pieces2:{threshold:2,name:'Nightbloom Renewal',short:'+7% Restoration healing',description:'Raid regalia deepens Restoration healing while Restoration is active.',effects:{healingScale:1.07}},
      pieces4:{threshold:4,name:'Ancient Continuance',short:'+12% Mana recovery · +4% haste',description:'Mana recovery and casting speed improve, and talent-unlocked Restoration skills recover 15% faster.',effects:{resourceRegen:1.12,haste:.04,talentSkillCooldownScale:.85}}
    }
  },
  'Druid|Balance':{
    4:{
      pieces2:{threshold:2,name:'Moonbark Eclipse',short:'+8% Eclipse spell damage',description:'Spells matching the active Solar or Lunar Eclipse deal 8% more damage.',effects:{eclipseDamageScale:1.08}},
      pieces4:{threshold:4,name:'Astral Convergence',short:'+12% Astral Power generation · +3% crit',description:'Astral Power generation improves and talent-unlocked Balance skills recover 10% faster.',effects:{resourceGainScale:1.12,talentSkillCooldownScale:.90,critBonus:.03}}
    },
    5:{
      pieces2:{threshold:2,name:'Nightbloom Eclipse',short:'+12% Eclipse spell damage',description:'Raid regalia increases damage from spells matching the active Eclipse by 12%.',effects:{eclipseDamageScale:1.12}},
      pieces4:{threshold:4,name:'Celestial Convergence',short:'+16% Astral Power generation · +4% crit',description:'Astral Power generation improves and talent-unlocked Balance skills recover 15% faster.',effects:{resourceGainScale:1.16,talentSkillCooldownScale:.85,critBonus:.04}}
    }
  },
  'Hunter|Marksman':{
    4:{
      pieces2:{threshold:2,name:'Storm Hawkeye Precision',short:'+6% Marksman damage',description:'Marksman ranged damage is increased while Marksman is active.',effects:{damageScale:1.06}},
      pieces4:{threshold:4,name:'Deadeye Rhythm',short:'+8% Focus recovery · +3% crit',description:'Focus recovery and critical chance improve, and talent-unlocked Marksman skills recover 10% faster.',effects:{resourceRegen:1.08,critBonus:.03,talentSkillCooldownScale:.90}}
    },
    5:{
      pieces2:{threshold:2,name:'Blackwood Precision',short:'+8% Marksman damage',description:'Raid hunt gear increases Marksman damage by 8%.',effects:{damageScale:1.08}},
      pieces4:{threshold:4,name:'Perfect Volley',short:'+12% Focus recovery · +4% crit',description:'Focus recovery and critical chance improve, and talent-unlocked Marksman skills recover 15% faster.',effects:{resourceRegen:1.12,critBonus:.04,talentSkillCooldownScale:.85}}
    }
  },
  'Hunter|Beast Mastery':{
    4:{
      pieces2:{threshold:2,name:'Storm Hawkeye Packbond',short:'+10% beast damage',description:'Your permanent beast and temporary beasts deal 10% more damage.',effects:{petDamageScale:1.10}},
      pieces4:{threshold:4,name:'Pack Hunt Rhythm',short:'+10% Focus recovery · +3% haste',description:'Focus recovery and attack speed improve, and talent-unlocked Beast Mastery skills recover 10% faster.',effects:{resourceRegen:1.10,haste:.03,talentSkillCooldownScale:.90}}
    },
    5:{
      pieces2:{threshold:2,name:'Blackwood Packbond',short:'+15% beast damage',description:'Raid hunt gear increases damage dealt by your permanent beast and temporary beasts by 15%.',effects:{petDamageScale:1.15}},
      pieces4:{threshold:4,name:'Alpha Hunt',short:'+14% Focus recovery · +4% haste',description:'Focus recovery and attack speed improve, and talent-unlocked Beast Mastery skills recover 15% faster.',effects:{resourceRegen:1.14,haste:.04,talentSkillCooldownScale:.85}}
    }
  },
  'Rogue|Assassination':{
    4:{
      pieces2:{threshold:2,name:'Master Shadecoil Venom',short:'+8% bleed and poison damage',description:'Assassination periodic bleed and poison effects deal 8% more damage.',effects:{periodicDamageScale:1.08}},
      pieces4:{threshold:4,name:'Silent Precision',short:'+10% Energy recovery · +3% crit',description:'Energy recovery and critical chance improve, and talent-unlocked Assassination skills recover 10% faster.',effects:{resourceRegen:1.10,critBonus:.03,talentSkillCooldownScale:.90}}
    },
    5:{
      pieces2:{threshold:2,name:'Silent Service Venom',short:'+12% bleed and poison damage',description:'Raid leathers increase Assassination periodic damage by 12%.',effects:{periodicDamageScale:1.12}},
      pieces4:{threshold:4,name:'Perfect Execution',short:'+14% Energy recovery · +4% crit',description:'Energy recovery and critical chance improve, and talent-unlocked Assassination skills recover 15% faster.',effects:{resourceRegen:1.14,critBonus:.04,talentSkillCooldownScale:.85}}
    }
  },
  'Rogue|Outlaw':{
    4:{
      pieces2:{threshold:2,name:'Master Shadecoil Broadside',short:'+10% Outlaw finisher damage',description:'Dispatch and Between the Eyes deal 10% more damage when spent as Outlaw finishers.',effects:{outlawFinisherScale:1.10}},
      pieces4:{threshold:4,name:'Loaded Arsenal',short:'+10% Energy recovery · +3% haste',description:'Energy recovery and attack speed improve, and talent-unlocked Outlaw skills recover 10% faster.',effects:{resourceRegen:1.10,haste:.03,talentSkillCooldownScale:.90}}
    },
    5:{
      pieces2:{threshold:2,name:'Silent Service Broadside',short:'+15% Outlaw finisher damage',description:'Raid leathers increase Dispatch and Between the Eyes damage by 15%.',effects:{outlawFinisherScale:1.15}},
      pieces4:{threshold:4,name:'Black Flag Arsenal',short:'+14% Energy recovery · +4% haste',description:'Energy recovery and attack speed improve, and talent-unlocked Outlaw skills recover 15% faster.',effects:{resourceRegen:1.14,haste:.04,talentSkillCooldownScale:.85}}
    }
  },
  'Mage|Arcane':{
    4:{
      pieces2:{threshold:2,name:'Starweave Overcharge',short:'+6% Arcane damage',description:'Arcane Mage damage is increased while Arcane is active.',effects:{damageScale:1.06}},
      pieces4:{threshold:4,name:'Arcane Resonance',short:'+8% Mana recovery · +3% crit',description:'Mana recovery and critical chance improve, and talent-unlocked Arcane skills recover 10% faster.',effects:{resourceRegen:1.08,critBonus:.03,talentSkillCooldownScale:.90}}
    },
    5:{
      pieces2:{threshold:2,name:'Housebound Overcharge',short:'+8% Arcane damage',description:'Raid robes increase Arcane damage by 8%.',effects:{damageScale:1.08}},
      pieces4:{threshold:4,name:'Nether Resonance',short:'+12% Mana recovery · +4% crit',description:'Mana recovery and critical chance improve, and talent-unlocked Arcane skills recover 15% faster.',effects:{resourceRegen:1.12,critBonus:.04,talentSkillCooldownScale:.85}}
    }
  },
  'Mage|Frost':{
    4:{
      pieces2:{threshold:2,name:'Starweave Shatter',short:'+10% proc-combo damage',description:'Ice Lance, Flurry and Glacial Spike deal 10% more damage while exploiting Frost procs.',effects:{frostProcDamageScale:1.10}},
      pieces4:{threshold:4,name:'Winter Resonance',short:'Faster Frost procs · +3% crit',description:'Fingers of Frost and Brain Freeze build faster, and talent-unlocked Frost skills recover 10% faster.',effects:{frostProcRate:1,talentSkillCooldownScale:.90,critBonus:.03}}
    },
    5:{
      pieces2:{threshold:2,name:'Housebound Shatter',short:'+15% proc-combo damage',description:'Raid robes increase Frost proc-combo damage by 15%.',effects:{frostProcDamageScale:1.15}},
      pieces4:{threshold:4,name:'Absolute Winter',short:'Much faster Frost procs · +4% crit',description:'Fingers of Frost and Brain Freeze build substantially faster, and talent-unlocked Frost skills recover 15% faster.',effects:{frostProcRate:2,talentSkillCooldownScale:.85,critBonus:.04}}
    }
  },
  'Warlock|Demonology':{
    4:{
      pieces2:{threshold:2,name:'Dreadweave Command',short:'+8% demon damage',description:'Felguard and temporary demon damage is increased while Demonology is active.',effects:{petDamageScale:1.08}},
      pieces4:{threshold:4,name:'Legion Resonance',short:'+8% Mana recovery · 10% faster talent summons',description:'Mana recovery improves and talent-unlocked Demonology skills recover 10% faster.',effects:{resourceRegen:1.08,talentSkillCooldownScale:.90,critBonus:.03}}
    },
    5:{
      pieces2:{threshold:2,name:'Netherlord Command',short:'+12% demon damage',description:'Raid regalia increases Demonology pet damage by 12%.',effects:{petDamageScale:1.12}},
      pieces4:{threshold:4,name:'Tyrant Resonance',short:'+12% Mana recovery · 15% faster talent summons',description:'Mana recovery improves and talent-unlocked Demonology skills recover 15% faster.',effects:{resourceRegen:1.12,talentSkillCooldownScale:.85,critBonus:.04}}
    }
  },
  'Warlock|Destruction':{
    4:{
      pieces2:{threshold:2,name:'Dreadweave Ruin',short:'+10% Chaos Bolt damage',description:'Chaos Bolt and Rain of Fire deal 10% more damage while Destruction is active.',effects:{destructionSpenderScale:1.10}},
      pieces4:{threshold:4,name:'Ember Resonance',short:'Faster Soul Shards · +3% crit',description:'Soul Shard generation improves and talent-unlocked Destruction skills recover 10% faster.',effects:{resourceGainScale:1.12,talentSkillCooldownScale:.90,critBonus:.03}}
    },
    5:{
      pieces2:{threshold:2,name:'Netherlord Ruin',short:'+15% Chaos Bolt damage',description:'Raid regalia increases Chaos Bolt and Rain of Fire damage by 15%.',effects:{destructionSpenderScale:1.15}},
      pieces4:{threshold:4,name:'Cataclysmic Resonance',short:'Much faster Soul Shards · +4% crit',description:'Soul Shard generation improves substantially and talent-unlocked Destruction skills recover 15% faster.',effects:{resourceGainScale:1.16,talentSkillCooldownScale:.85,critBonus:.04}}
    }
  }
};
function setTier(item){
  const tier=Math.max(1,Number(item?.tier)||0);
  if(tier>=5)return 5;
  return tier>=4?4:0
}
function setBonusRulesFor(characterOrClass,specArg=null,item=null){
  const character=typeof characterOrClass==='object'&&characterOrClass?characterOrClass:null;
  const klass=character?.class||String(characterOrClass||item?.class||'');
  const spec=character?.spec||specArg||'';
  const role=BUILD?.roleFor?.(klass,spec)||'dps';
  const tier=setTier(item)||4;
  const raid=tier>=5;
  const twoAmount=raid?.06:.04,fourRegen=raid?1.10:1.06,talentCd=raid?.85:.90,haste=raid?.04:.03,crit=raid?.04:.03,mitigation=raid?.05:.035;
  const prefix=spec||klass||'Specialisation';
  let pieces2;
  if(role==='healer')pieces2={threshold:2,name:prefix+' Resonance',short:'+'+Math.round(twoAmount*100)+'% healing',description:'Healing is increased while this specialisation is active.',effects:{healingScale:1+twoAmount}};
  else if(role==='tank')pieces2={threshold:2,name:prefix+' Guard',short:'-'+Math.round(mitigation*100)+'% damage taken',description:'Incoming damage is reduced while this tank specialisation is active.',effects:{incomingDamageReduction:mitigation}};
  else pieces2={threshold:2,name:prefix+' Resonance',short:'+'+Math.round(twoAmount*100)+'% damage',description:'Damage is increased while this specialisation is active.',effects:{damageScale:1+twoAmount}};
  const roleExtra=role==='healer'?{haste}:{critBonus:crit};
  const roleShort=role==='healer'?'+'+Math.round((fourRegen-1)*100)+'% recovery · +'+Math.round(haste*100)+'% haste':'+'+Math.round((fourRegen-1)*100)+'% recovery · '+Math.round((1-talentCd)*100)+'% faster talent skills';
  const pieces4={threshold:4,name:prefix+' Mastery',short:roleShort,description:'Resource recovery improves and talent-unlocked skills recover faster, rewarding a committed specialisation build.',effects:{resourceRegen:fourRegen,talentSkillCooldownScale:talentCd,...roleExtra}};
  const bespoke=SPEC_SET_BONUSES[klass+'|'+spec]?.[tier];
  return{...(bespoke||{pieces2,pieces4}),role,tier,spec,klass}
}
function setPieceCount(c,setId){
  if(!c||!setId)return 0;
  return Object.values(c.equipment||{}).filter(item=>item?.setId===setId).length
}
function setBonusState(c,setId){
  const sample=Object.values(c?.equipment||{}).find(item=>item?.setId===setId)||null;
  const rules=setBonusRulesFor(c,c?.spec,sample),pieces=setPieceCount(c,setId),r2=rules.pieces2,r4=rules.pieces4;
  return {setId,pieces,pieces2:pieces>=r2.threshold,pieces4:pieces>=r4.threshold,next:pieces<r2.threshold?r2.threshold:pieces<r4.threshold?r4.threshold:null,rules}
}
function setBonusLines(item,character=null){
  if(!item?.setId||!item?.setName)return[];
  if(!character)return[
    {threshold:2,name:'Adaptive Specialisation',short:'2pc changes with active spec',description:'The two-piece effect adapts to the wearer’s active specialisation.'},
    {threshold:4,name:'Talent Ensemble',short:'4pc empowers talent skills',description:'The four-piece effect improves resource recovery and reduces recovery time on talent-unlocked skills; its secondary bonus adapts by role.'}
  ];
  const rules=setBonusRulesFor(character,character?.spec||null,item);
  return [rules.pieces2,rules.pieces4].map(rule=>({threshold:rule.threshold,name:rule.name,short:rule.short,description:rule.description}))
}
const NAMES={
  Warrior:[['Militia Helm','Worn Breastplate','Training Sword'],['Ashguard Helm','Ashguard Plate','Embercleaver'],['Vaultforged Greathelm','Vaultforged Cuirass','Runic Greatblade'],['Warlord Greathelm','Warlord Warplate','Warlord Greatblade'],['Housebreaker Greathelm','Housebreaker Warplate','Housebreaker Greatblade']],
  Paladin:[['Novice Crown','Oathbound Mail','Blessed Mace'],['Sunwarden Helm','Sunwarden Plate','Sunwarden Hammer'],['Radiant Aegis Crown','Radiant Aegis Plate','Dawnkeeper Hammer'],['Sunward Crown','Sunward Warplate','Sunward Maul'],['Gilded Vigil Crown','Gilded Vigil Warplate','Gilded Vigil Maul']],
  Priest:[['Acolyte Hood','Prayer Vestments','Cedar Staff'],['Chapelweave Cowl','Chapelweave Robe','Lightwell Rod'],['Saintglass Halo','Saintglass Vestments','Seraphic Staff'],['Ascendant Halo','Ascendant Vestments','Ascendant Staff'],['Attic Veil Halo','Attic Veil Vestments','Attic Veil Staff']],
  Druid:[['Rootwoven Hood','Barkhide Garb','Living Branch'],['Wildbloom Hood','Wildbloom Raiment','Thornstaff'],['Moonbark Crown','Moonbark Regalia','Starroot Scepter'],['Moonbark Antlers','Moonbark Vestments','Moonbark Scepter'],['Nightbloom Antlers','Nightbloom Regalia','Nightbloom Scepter']],
  Hunter:[['Tracker Hood','Leather Jerkin','Ashwood Bow'],['Longshot Hood','Longshot Harness','Emberstring Bow'],['Hawkeye Visor','Hawkeye Brigandine','Stormflight Longbow'],['Hawkeye Warhood','Hawkeye Harness','Hawkeye Greatbow'],['Blackwood Warhood','Blackwood Harness','Blackwood Greatbow']],
  Rogue:[['Shadowcap','Duskleather Tunic','Twin Knives'],['Nightfang Hood','Nightfang Jerkin','Venomshivs'],['Shadecoil Mask','Shadecoil Vest','Ghostfang Daggers'],['Shadecoil Cowl','Shadecoil Leathers','Shadecoil Blades'],['Silent Service Cowl','Silent Service Leathers','Silent Service Blades']],
  Mage:[['Novice Circlet','Blueweave Robe','Crystal Wand'],['Spellforge Circlet','Spellforge Mantle','Arcglass Rod'],['Starweave Crown','Starweave Vestment','Celestine Staff'],['Starweave Diadem','Starweave Robe','Starweave Focus'],['Housebound Diadem','Housebound Robe','Housebound Focus']],
  Shaman:[['Tidecaller Hood','Tidecaller Mail','Riverstone Mace'],['Stormspeaker Helm','Stormspeaker Hauberk','Tempest Mace'],['Deepcurrent Crown','Deepcurrent Mail','Tidemender Scepter'],['Tempestcaller Headdress','Tempestcaller Hauberk','Tempestcaller Hammer'],['Stormcell Headdress','Stormcell Hauberk','Stormcell Hammer']],
  Warlock:[['Initiate Hood','Felwoven Robe','Ashen Staff'],['Dreadcaller Cowl','Dreadcaller Vestments','Demonspine Staff'],['Soulbinder Crown','Soulbinder Robe','Nether Rod'],['Dreadweave Horns','Dreadweave Vestments','Felheart Staff'],['Netherlord Crown','Netherlord Regalia','Tyrant Staff']],
  Monk:[['Wayfarer Headband','Wayfarer Gi','Training Staff'],['Jadefist Headguard','Jadefist Vest','Jadewood Staff'],['Cloudstep Crown','Cloudstep Raiment','Cloudpiercer Staff'],['Celestial Way Crown','Celestial Way Vest','Celestial Staff'],['Grandmaster Crown','Grandmaster Regalia','Grandmaster Staff']],
  'Death Knight':[['Graveguard Helm','Graveguard Plate','Runed Greatsword'],['Rimebound Greathelm','Rimebound Warplate','Frostgrave Greatblade'],['Deathforged Crown','Deathforged Cuirass','Ebon Runeblade'],['Ebon Oath Greathelm','Ebon Oath Warplate','Ebon Oath Runeblade'],['Grave Sovereign Crown','Grave Sovereign Plate','Sovereign Runeblade']],
  'Demon Hunter':[['Initiate Blindfold','Felhide Vest','Training Warglaive'],['Riftstalker Blindfold','Riftstalker Harness','Riftcarver Warglaive'],['Netherbound Visor','Netherbound Chestguard','Soulrend Warglaive'],['Felstalker Visor','Felstalker Harness','Felstalker Warglaive'],['Abyssal Hunt Visor','Abyssal Hunt Harness','Abyssal Warglaive']],
  Evoker:[['Whelpling Crown','Whelpling Mail','Novice Dragonstaff'],['Emberwing Crown','Emberwing Mail','Emberglass Staff'],['Timewarden Crown','Timewarden Mail','Chronoflame Staff'],['Chronoscale Crown','Chronoscale Mail','Chronoscale Staff'],['Aspectbound Crown','Aspectbound Regalia','Aspectbound Staff']]
};
const TIER_PREFIX={
  Warrior:['Militia','Ashguard','Vaultforged','Warlord','Housebreaker'],
  Paladin:['Oathbound','Sunwarden','Radiant Aegis','Sunward','Gilded Vigil'],
  Priest:['Acolyte','Chapelweave','Saintglass','Ascendant','Attic Veil'],
  Druid:['Rootwoven','Wildbloom','Moonbark','Elder Moonbark','Nightbloom'],
  Hunter:['Tracker','Longshot','Hawkeye','Storm Hawkeye','Blackwood'],
  Rogue:['Shadow','Nightfang','Shadecoil','Master Shadecoil','Silent Service'],
  Mage:['Novice','Spellforge','Starweave','Ascendant Starweave','Housebound'],
  Shaman:['Tidecaller','Stormspeaker','Deepcurrent','Tempestcaller','Stormcell'],
  Warlock:['Initiate','Dreadcaller','Soulbinder','Dreadweave','Netherlord'],
  Monk:['Wayfarer','Jadefist','Cloudstep','Celestial Way','Grandmaster'],
  'Death Knight':['Graveguard','Rimebound','Deathforged','Ebon Oath','Grave Sovereign'],
  'Demon Hunter':['Initiate','Riftstalker','Netherbound','Felstalker','Abyssal Hunt'],
  Evoker:['Whelpling','Emberwing','Timewarden','Chronoscale','Aspectbound']
};
const ARMOUR_NOUNS={
  plate:{Shoulders:'Shoulderguards',Hands:'Gauntlets',Waist:'Warbelt',Legs:'Legplates',Feet:'Greaves'},
  leather:{Shoulders:'Spaulders',Hands:'Grips',Waist:'Belt',Legs:'Legguards',Feet:'Boots'},
  cloth:{Shoulders:'Mantle',Hands:'Gloves',Waist:'Sash',Legs:'Leggings',Feet:'Slippers'},
  mail:{Shoulders:'Spaulders',Hands:'Grips',Waist:'Belt',Legs:'Legguards',Feet:'Boots'}
};
const OFFHAND_NOUN={Warrior:'Shield',Paladin:'Bulwark',Priest:'Scripture',Druid:'Idol',Hunter:'Quiver',Rogue:'Parrying Blade',Mage:'Grimoire',Shaman:'Totem',Warlock:'Grimoire',Monk:'Prayer Beads','Death Knight':'Runic Sigil','Demon Hunter':'Off-hand Warglaive',Evoker:'Dragon Focus'};
const RELIC_NOUN={Warrior:'Crest',Paladin:'Libram',Priest:'Icon',Druid:'Totem',Hunter:'Trophy',Rogue:'Token',Mage:'Focus',Shaman:'Spirit Charm',Warlock:'Soulstone',Monk:'Jade Idol','Death Knight':'Runeforge','Demon Hunter':'Fel Sigil',Evoker:'Dragonshard'};
const SLOT_GLYPHS={Head:'⛑',Shoulders:'⌃',Chest:'▣',Hands:'✋',Waist:'═',Legs:'║',Feet:'♟',Weapon:'⚔',OffHand:'🛡',Ring:'◉',Trinket:'◆',Relic:'◇'};
function inferWeaponType(klass,name=''){
  const n=String(name).toLowerCase();
  if(/(warglaive|glaive)/.test(n))return'sword';
  if(/(spear|pike|lance|halberd|polearm)/.test(n))return'spear';
  if(/(crossbow)/.test(n))return'crossbow';
  if(/(bow|longbow|shortbow)/.test(n))return'bow';
  if(/(axe|cleaver|hatchet)/.test(n))return'axe';
  if(/(maul|hammer)/.test(n))return'hammer';
  if(/(mace|morningstar)/.test(n))return'mace';
  if(/(dagger|knife|shiv|shivs|knives|stiletto)/.test(n))return'dagger';
  if(/(wand)/.test(n))return'wand';
  if(/(focus|orb|crystal)/.test(n))return'focus';
  if(/(scepter|sceptre)/.test(n))return'scepter';
  if(/(staff|stave|branch)/.test(n))return'staff';
  if(/(rod)/.test(n))return'rod';
  if(/(greatblade|greatsword|claymore)/.test(n))return'greatsword';
  if(/(sword|blade|blades|sabre|saber)/.test(n))return'sword';
  return({Warrior:'sword',Paladin:'hammer',Priest:'staff',Druid:'staff',Hunter:'bow',Rogue:'dagger',Mage:'staff',Shaman:'mace',Warlock:'staff',Monk:'staff','Death Knight':'greatsword','Demon Hunter':'sword',Evoker:'staff'})[klass]||'sword'
}
function equipmentPositions(item){
  if(!item||typeof item!=='object')return[];
  if(item.slot==='Trinket')return ['Trinket1','Trinket2'];
  if(item.slot==='Ring')return ['Ring1','Ring2'];
  // Main-hand weapons are intentionally NOT valid OffHand items.
  if(item.slot==='Weapon')return ['Weapon'];
  if(item.slot==='OffHand')return ['OffHand'];
  return item.slot?[item.slot]:[];
}
function canEquipInSlot(item,slot){
  return equipmentPositions(item).includes(slot);
}
function inferOffHandType(klass,name=''){
  const n=String(name).toLowerCase();
  if(/\b(shield|bulwark|buckler|aegis)\b/.test(n))return'shield';
  if(/\b(quiver)\b/.test(n))return'quiver';
  if(/\b(scripture|tome|book|grimoire)\b/.test(n))return'tome';
  if(/\b(idol|totem)\b/.test(n))return'idol';
  if(/(focus|orb|crystal)/.test(n))return'focus';
  if(/\b(warglaive|glaive|blade|dagger|knife|shiv)\b/.test(n))return'dagger';
  return({Warrior:'shield',Paladin:'shield',Priest:'tome',Druid:'idol',Hunter:'quiver',Rogue:'dagger',Mage:'focus',Shaman:'idol',Warlock:'tome',Monk:'focus','Death Knight':'focus','Demon Hunter':'dagger',Evoker:'focus'})[klass]||'focus'
}
function armourFamily(klass){return ['Warrior','Paladin','Death Knight'].includes(klass)?'plate':['Priest','Mage','Warlock'].includes(klass)?'cloth':['Shaman','Evoker'].includes(klass)?'mail':'leather'}
function nameFor(klass,tier,slot){
  const core=CORE_SLOT_ORDER.indexOf(slot);if(core>=0)return NAMES[klass][tier-1][core];
  const prefix=TIER_PREFIX[klass]?.[tier-1]||klass;
  if(slot==='OffHand')return prefix+' '+(OFFHAND_NOUN[klass]||'Off-Hand');
  if(slot==='Ring')return prefix+' Band';
  if(slot==='Trinket')return prefix+' Charm';
  if(slot==='Relic')return prefix+' '+(RELIC_NOUN[klass]||'Relic');
  return prefix+' '+(ARMOUR_NOUNS[armourFamily(klass)]?.[slot]||slot)
}
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const items=[];
CLASS_ORDER.forEach((klass,classIndex)=>{[1,2,3,4,5].forEach(tier=>{SLOT_ORDER.forEach((slot,slotIndex)=>{
  const meta=TIER_META[tier],itemLevel=ITEM_LEVELS[slot]?.[tier-1]||18+(tier-1)*8;
  const itemId=slug(klass)+'-t'+tier+'-'+slug(slot),name=nameFor(klass,tier,slot);
  items.push({itemId,name,appearanceId:itemId,class:klass,classes:[klass],slot,tier,rarity:meta.rarity,tierLabel:meta.label,enabled:true,dropEnabled:meta.dropEnabled,raidExclusive:Boolean(meta.raidExclusive),itemLevel,power:0,classIndex,slotIndex,rowIndex:tier-1,...(slot==='Weapon'?{weaponType:inferWeaponType(klass,name)}:{}),...(slot==='OffHand'?{offHandType:inferOffHandType(klass,name)}:{})});
})})});
const byId=id=>items.find(x=>x.itemId===id)||null;
const byName=name=>items.find(x=>x.name===name)||null;
const starterSet=klass=>CORE_SLOT_ORDER.map(slot=>items.find(x=>x.class===klass&&x.tier===1&&x.slot===slot));
const poolForTier=tier=>items.filter(x=>x.tier===tier&&x.enabled&&x.dropEnabled);
const rand=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
function statRange(key,tier){
  const t=Math.max(1,Math.min(5,Number(tier)||1));
  if(key==='armour')return [[10,16],[16,25],[25,38],[36,52],[48,68]][t-1];
  if(STAT_DEFS[key]?.unit==='percent')return [[2,4],[3,6],[5,8],[7,11],[9,14]][t-1];
  return [[3,6],[5,9],[8,13],[12,18],[16,23]][t-1];
}
function rollValue(key,tier,slot){
  const [min,max]=statRange(key,tier),mult=slot==='Weapon'?1.12:['Chest','Legs','Trinket'].includes(slot)?1.06:['OffHand','Relic'].includes(slot)?1.04:1;
  return Math.max(1,Math.round(rand(min,max)*mult));
}
function rollId(){return globalThis.crypto?.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
function rollItemAffixes(raw,context=null){
  if(!raw)return raw;
  const item={...raw},tier=Math.max(1,Math.min(5,Number(item.tier)||1)),count=TIER_META[tier]?.statCount||1;
  const spec=typeof context==='string'?context:(context?.spec||item.specBias||null),ideal=SPEC_IDEALS[item.class+'|'+String(spec||'')]||[];
  const base=[...(CLASS_STAT_POOLS[item.class]||['stamina','crit','haste'])],weighted=[...ideal.filter(x=>base.includes(x)),...ideal.filter(x=>base.includes(x)),...base],pool=[...new Set(weighted)],stats=[];
  while(stats.length<count&&pool.length){const weights=pool.map(key=>ideal.includes(key)?3:1),total=weights.reduce((a,b)=>a+b,0);let pick=Math.random()*total,i=0;for(;i<pool.length-1;i++){pick-=weights[i];if(pick<0)break}const key=pool.splice(i,1)[0];stats.push({key,value:rollValue(key,tier,item.slot)})}
  if(spec)item.specBias=spec;
  item.bonusStats=stats;item.rollId=rollId();item.affixVersion=1;
  item.appearanceId=item.appearanceId||item.baseItemId||item.itemId||slug(item.name||item.slot||'gear');
  if(tier===4){item.setId=slug(item.class)+'-t4';item.setName=SET_META[item.class]?.name||item.class+' Tier 4 Set'}
  if(tier===5){item.setId=slug(item.class)+'-t5';item.setName=SET_META[item.class]?.raidName||((SET_META[item.class]?.name||item.class)+' Raid Set');item.raidExclusive=true}
  return item;
}
function rollDungeonLoot(source='Dungeon',tier2Chance=.25){
  const tier=Math.random()<tier2Chance?2:1,pool=poolForTier(tier),base=pool[Math.floor(Math.random()*pool.length)];
  return rollItemAffixes({...base,source});
}
function effectiveStatBudget(item,key){
  const explicit=Number(item?.statBudgetMultiplier),slot=Number(SLOT_STAT_BUDGET[item?.slot]);
  const slotBudget=Number.isFinite(explicit)&&explicit>0?explicit:(Number.isFinite(slot)?slot:1);
  const d=STAT_DEFS[key]||{unit:'flat'},type=d.unit==='percent'?'percent':key==='armour'?'armour':'flat';
  return slotBudget*(Number(STAT_TYPE_BUDGET[type])||1)
}
function statLines(item){
  return (Array.isArray(item?.bonusStats)?item.bonusStats:[]).map(s=>{
    const d=STAT_DEFS[s.key]||{label:s.key,unit:'flat'},raw=Math.max(0,Number(s.value)||0),budget=effectiveStatBudget(item,s.key),value=raw>0?Math.max(1,Math.round(raw*budget)):0;
    return {key:s.key,label:d.label,value,rawValue:raw,budget,unit:d.unit,text:`+${value}${d.unit==='percent'?'%':''} ${d.label}`};
  });
}
function aggregateStats(c){
  const out={};Object.values(c?.equipment||{}).forEach(item=>statLines(item).forEach(s=>out[s.key]=(Number(out[s.key])||0)+s.value));return out;
}
function rollSignature(item){
  const stats=statLines(item).sort((a,b)=>a.key.localeCompare(b.key)).map(s=>s.key+':'+s.value).join('|');
  return stats+(item?.setId?'|set:'+item.setId:'');
}
function idealStats(c){return SPEC_IDEALS[`${c?.class||''}|${c?.spec||''}`]||[]}
function rollFit(c,item){
  const lines=statLines(item),ideal=new Set(idealStats(c)),matches=lines.filter(s=>ideal.has(s.key)).length,total=lines.length;
  if(!total)return{matches:0,total:0,label:'LEGACY ITEM',tone:'legacy'};
  if(matches===total)return{matches,total,label:'IDEAL ROLL',tone:'ideal'};
  if(matches>0)return{matches,total,label:'MIXED ROLL',tone:'mixed'};
  return{matches,total,label:'OFF-ROLL',tone:'off'};
}
function itemScoreFor(c,item){
  const ilvl=Math.max(0,Number(item?.itemLevel)||0),ideal=new Set(idealStats(c));
  const roll=statLines(item).reduce((n,s)=>n+s.value*(ideal.has(s.key)?4:.5),0);
  return ilvl*100+roll;
}
function questProfileStats(c,profile='specialist',tier=1){
  const count=TIER_META[Math.max(1,Math.min(4,Number(tier)||1))]?.statCount||1;
  const ideal=idealStats(c),primary=c?.class==='Warrior'?'strength':['Hunter','Rogue'].includes(c?.class)?'agility':'intellect';
  const defensive=['stamina',...(['Warrior','Paladin'].includes(c?.class)?['armour','block']:['haste','crit'])];
  const swift=['haste','crit',primary];
  const specialist=[...ideal,primary,'stamina'];
  const source=profile==='sturdy'?defensive:profile==='swift'?swift:specialist;
  return [...new Set(source)].slice(0,count);
}
function questStatValue(key,tier=1,slot='Head'){
  const t=Math.max(1,Math.min(4,Number(tier)||1)),weapon=slot==='Weapon'?1:0;
  if(key==='armour')return [8,13,21,30][t-1]+weapon*2;
  if(STAT_DEFS[key]?.unit==='percent')return [1,2,4,6][t-1]+weapon;
  return [2,4,7,10][t-1]+weapon;
}
function createQuestGear(c,slot,tier=1,profile='specialist',source='Quest Reward'){
  if(!c)return null;
  const base=items.find(x=>x.class===c.class&&x.tier===Math.max(1,Math.min(3,Number(tier)||1))&&x.slot===slot)||starterSet(c.class).find(x=>x.slot===slot);
  if(!base)return null;
  const keys=questProfileStats(c,profile,tier),profileName=profile==='sturdy'?'Stalwart':profile==='swift'?'Swift':'Specialist';
  return {
    ...base,
    itemId:'quest-'+base.itemId+'-'+profile,
    baseItemId:base.itemId,
    appearanceId:'quest-'+base.itemId+'-'+profile,
    name:profileName+' '+base.name,
    tierLabel:'Quest Gear · Tier '+tier,
    rarity:base.rarity,
    dropEnabled:false,
    bonusStats:keys.map(key=>({key,value:questStatValue(key,tier,slot)})),
    rollId:'quest-'+slug(c.id||c.name||c.class)+'-'+slug(slot)+'-'+profile+'-'+Date.now().toString(36),
    affixVersion:1,
    questGear:true,
    specBias:c.spec||null,
    tradeState:'soulbound',
    source
  };
}
const ART_FIT={
  Head:{default:.91,Priest:.88,Druid:.89,Mage:.88},
  Chest:{default:.86,Priest:.82,Druid:.83,Mage:.82,Hunter:.87,Rogue:.88},
  Weapon:{default:.76,Warrior:.80,Paladin:.78,Priest:.70,Druid:.72,Hunter:.68,Rogue:.82,Mage:.70}
};
function artFit(item){
  const canonical=byName(item?.name)||byId(item?.itemId)||item||{};
  const slot=canonical.slot||'Head',klass=canonical.class||'',tier=Math.max(1,Math.min(4,Number(canonical.tier)||1));
  const base=Number(ART_FIT[slot]?.[klass]??ART_FIT[slot]?.default??.86);
  const tierAdjust=tier>=3?.95:tier===2?.98:1;
  return Math.max(.64,Math.min(1,base*tierAdjust));
}
function artCoordinates(item,size=64){
  if(!item)return null;
  const canonical=byName(item.name)||byId(item.itemId)||item;
  const classIndex=Number.isInteger(canonical.classIndex)?canonical.classIndex:CLASS_ORDER.indexOf(canonical.class);
  const slotIndex=CORE_SLOT_ORDER.indexOf(canonical.slot);
  const rawRow=Number.isInteger(canonical.rowIndex)?canonical.rowIndex:Math.max(0,(canonical.tier||1)-1),rowIndex=Math.min(2,rawRow);
  if(classIndex<0||slotIndex<0||rawRow<0)return null;
  // The current atlas contains seven class columns (21 cells). Newer classes use
  // the deterministic fallback artwork until their dedicated atlas cells exist.
  if(classIndex*3+slotIndex>=21)return null;
  return {canonical,col:classIndex*3+slotIndex,row:rowIndex,size};
}
function artStyle(item,size=64){
  const pos=artCoordinates(item,size);
  return pos?`display:inline-block;position:relative;overflow:hidden;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;background:#070b0e;`:''
}
function artHTML(item,size=64,extra=''){
  if(item?.questArtMaterial&&window.CellboundProfessions?.materialArtHTML)return window.CellboundProfessions.materialArtHTML(item.questArtMaterial,size,'gear-art quest-gear-art '+extra);
  const pos=artCoordinates(item,size),canonical=pos?.canonical||byName(item?.name)||byId(item?.itemId)||item;
  if(!canonical)return`<span class="gear-art gear-art-empty ${extra}" style="display:inline-grid;width:${size}px;height:${size}px;place-items:center">◇</span>`;
  if(!pos){const glyph=SLOT_GLYPHS[canonical.slot]||'◇';return`<span class="gear-art gear-art-fallback gear-slot-${slug(canonical.slot||'item')} ${extra}" style="display:inline-grid;width:${size}px;height:${size}px;place-items:center;font-size:${Math.max(18,Math.round(size*.42))}px" aria-label="${canonical.name||canonical.slot}" title="${canonical.name||canonical.slot}">${glyph}</span>`}
  const glyph=SLOT_GLYPHS[canonical.slot]||'◇',fit=artFit(canonical),cell=Math.max(1,Math.round(size*fit)),inset=Math.round((size-cell)/2);
  const slotClass='gear-slot-'+slug(canonical.slot||'item'),classClass='gear-class-'+slug(canonical.class||'all');
  return `<span class="gear-art tier-${canonical.tier||1} ${slotClass} ${classClass} ${extra}" data-gear-fit="${fit.toFixed(3)}" style="${artStyle(canonical,size)}" aria-label="${canonical.name}" title="${canonical.name}"><span class="gear-art-fallback" aria-hidden="true">${glyph}</span><span class="gear-art-cell" aria-hidden="true" style="position:absolute;overflow:hidden;width:${cell}px;height:${cell}px;left:${inset}px;top:${inset}px"><img class="gear-art-sprite" src="./assets/gear/cellbound-gear-atlas.webp?v=4" alt="" draggable="false" onerror="this.style.display='none'" style="position:absolute;max-width:none;width:${21*cell}px;height:${3*cell}px;left:-${pos.col*cell}px;top:-${pos.row*cell}px"></span></span>`;
}
window.CellboundGear={CLASS_ORDER,CORE_SLOT_ORDER,SLOT_ORDER,EQUIPMENT_POSITION_ORDER,SLOT_GLYPHS,TIER_META,ITEM_LEVELS,CHAPTER_GEAR,STAT_DEFS,SLOT_STAT_BUDGET,STAT_TYPE_BUDGET,CLASS_STAT_POOLS,SPEC_IDEALS,SET_META,SET_BONUS_RULES,SPEC_SET_BONUSES,setBonusRulesFor,setPieceCount,setBonusState,setBonusLines,NAMES,items,byId,byName,starterSet,poolForTier,rollItemAffixes,rollDungeonLoot,effectiveStatBudget,statLines,aggregateStats,rollSignature,idealStats,rollFit,itemScoreFor,questProfileStats,createQuestGear,inferWeaponType,inferOffHandType,equipmentPositions,canEquipInSlot,artFit,artStyle,artHTML};
})();