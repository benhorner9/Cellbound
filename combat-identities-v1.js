(()=>{
'use strict';

const ROLE_MAP={
  Warrior:{Protection:'tank',Arms:'dps'},
  Paladin:{Protection:'tank',Holy:'healer'},
  Priest:{Holy:'healer',Shadow:'dps'},
  Druid:{Restoration:'healer',Balance:'dps'},
  Hunter:{Marksman:'dps','Beast Mastery':'dps'},
  Rogue:{Assassination:'dps',Outlaw:'dps'},
  Mage:{Arcane:'dps',Frost:'dps'},
  Shaman:{Restoration:'healer',Elemental:'dps'},
  Warlock:{Demonology:'dps',Destruction:'dps'},
  Monk:{Brewmaster:'tank',Mistweaver:'healer',Windwalker:'dps'},
  'Death Knight':{Blood:'tank',Frost:'dps',Unholy:'dps'},
  'Demon Hunter':{Havoc:'dps',Vengeance:'tank'},
  Evoker:{Preservation:'healer',Devastation:'dps'}
};

const RACES={
  Veyren:{
    trait:'Adaptable',
    strength:'Reliable in any role and learns encounters faster than other races.',
    tradeoff:'No extreme combat speciality.',
    modifiers:{damage:1.02,healing:1.02,knowledge:1.20}
  },
  Stoneborn:{
    trait:'Unyielding',
    strength:'Exceptional physical resilience and slightly improved healing received.',
    tradeoff:'Slower attack and casting cadence.',
    modifiers:{physicalTaken:.90,magicTaken:1.04,cooldown:1.06,healingReceived:1.03}
  },
  Aelari:{
    trait:'Soul Attuned',
    strength:'Stronger magic, stronger healing and excellent magical resistance.',
    tradeoff:'More vulnerable to physical pressure.',
    modifiers:{magicDamage:1.08,healing:1.06,magicTaken:.90,physicalTaken:1.06}
  },
  Thornkin:{
    trait:'Living Guard',
    strength:'Natural regeneration and excellent response to incoming healing.',
    tradeoff:'Slightly slower offensive cadence.',
    modifiers:{healing:1.02,healingReceived:1.10,physicalTaken:.98,magicTaken:.98,cooldown:1.03,regen:1.4}
  },
  Emberkin:{
    trait:'Fierce Blood',
    strength:'Higher damage, with an extra surge when wounded.',
    tradeoff:'Receives slightly less healing.',
    modifiers:{damage:1.06,healingReceived:.94,lowHealthDamage:1.12,magicTaken:1.02}
  },
  Nymari:{
    trait:'Quickmind',
    strength:'Faster attacks, casts and reactions.',
    tradeoff:'More fragile when caught by damage.',
    modifiers:{damage:1.02,healing:1.03,cooldown:.92,physicalTaken:1.06,magicTaken:1.06}
  }
};

const SPECS={
  Warrior:{
    Protection:{
      title:'Boss Anchor',
      strength:'Best single-target threat and physical boss control.',
      tradeoff:'Weaker at instantly controlling several enemies and less comfortable into magic.',
      singleThreat:2.95,packThreat:2.28,groupThreat:.08,physicalTaken:.88,magicTaken:.96,damage:.96,tauntLead:1.25
    },
    Arms:{
      title:'Execution Fighter',
      strength:'Heavy single-target pressure, execute damage and useful cleave.',
      tradeoff:'High personal threat and loses output when forced away from melee.',
      damage:1.12,threat:1.08,physicalTaken:.95,cleave:.30,execute:.22,cooldown:.98
    }
  },
  Paladin:{
    Protection:{
      title:'Pack Guardian',
      strength:'Excellent multi-target threat, add control and magical defence.',
      tradeoff:'Lower sustained single-target threat than a Protection Warrior.',
      singleThreat:2.18,packThreat:2.32,groupThreat:.56,physicalTaken:.90,magicTaken:.87,damage:.92,tauntLead:1.16
    },
    Holy:{
      title:'Tank Keeper',
      strength:'Strong direct healing and reliable tank stabilisation.',
      tradeoff:'Less efficient when the whole party needs sustained recovery.',
      damage:.82,threat:.90,healing:1.16,healThreat:.88,magicTaken:.94
    }
  },
  Priest:{
    Holy:{
      title:'Crisis Healer',
      strength:'Best burst recovery when several allies are in danger.',
      tradeoff:'Large recovery windows generate noticeably more healing threat.',
      damage:.78,threat:1,healing:1.12,healThreat:1.12,groupHeal:.20,physicalTaken:1.04
    },
    Shadow:{
      title:'Void Prophet',
      strength:'Builds Insanity through ranged shadow pressure, then converts it into heavy damage-over-time and Void burst windows.',
      tradeoff:'Damage ramps through resource generation and lingering effects, so frequent target deaths or poor spender timing reduce output.',
      damage:1.07,threat:.94,cooldown:.98,physicalTaken:1.05,magicTaken:.90,cleave:.18,execute:.12
    }
  },
  Druid:{
    Restoration:{
      title:'Sustained Restorer',
      strength:'Healing-over-time, movement and efficient sustained recovery.',
      tradeoff:'Direct emergency healing lands more slowly than Paladin or Priest healing.',
      damage:.76,threat:.92,healing:.90,healThreat:.92,hot:.36,physicalTaken:.98,magicTaken:.98
    },
    Balance:{
      title:'Astral Shaper',
      strength:'Cycles between Solar and Lunar Eclipse to amplify nature and arcane pressure, with strong sustained ranged cleave.',
      tradeoff:'Its best damage depends on entering the correct Eclipse and converting Astral Power efficiently; broken cycles lower burst sharply.',
      damage:1.06,threat:.96,cooldown:.98,physicalTaken:1.00,magicTaken:.94,cleave:.27
    }
  },
  Hunter:{
    Marksman:{
      title:'Priority Marksman',
      strength:'Reliable ranged pressure, fast target switching and strong priority damage.',
      tradeoff:'Lower peak boss burst than Rogue, Mage or Arms Warrior.',
      damage:.99,threat:.94,cooldown:.94,priorityDamage:1.13
    },
    'Beast Mastery':{
      title:'Pack Commander',
      strength:'Fights through a permanent beast companion, chaining pet commands and short beast summons while remaining highly mobile.',
      tradeoff:'A large share of its damage comes from keeping the pet active and spending Focus on the right commands; poor pet uptime sharply reduces pressure.',
      damage:.96,threat:.90,cooldown:.96,physicalTaken:1.01,magicTaken:.98,petDamage:1.10,cleave:.20
    }
  },
  Rogue:{
    Assassination:{
      title:'Boss Assassin',
      strength:'Exceptional single-target damage with strong personal threat control.',
      tradeoff:'Very little pack damage and vulnerable when mechanics force movement.',
      damage:1.22,threat:.72,cooldown:.84,execute:.18,opening:.26,physicalTaken:1.03
    },
    Outlaw:{
      title:'Freeblade Duelist',
      strength:'Builds Combo Points rapidly, converts them into finishers, and can pivot between priority damage and strong close-range cleave.',
      tradeoff:'Its strongest pressure depends on maintaining Energy, reacting to Opportunity procs and spending Combo Points efficiently rather than sitting on them.',
      damage:1.03,threat:.82,cooldown:.92,cleave:.30,physicalTaken:1.01,magicTaken:1.00
    }
  },
  Mage:{
    Arcane:{
      title:'Arcane Artillery',
      strength:'Highest burst spell pressure with strong splash damage.',
      tradeoff:'Fragile and capable of pulling threat during burst windows.',
      damage:1.14,threat:1.18,cooldown:1.06,cleave:.28,physicalTaken:1.10,magicTaken:.92,burstEvery:4,burst:1.30
    },
    Frost:{
      title:'Winter Savant',
      strength:'Turns Frostbolt procs into rapid Shatter chains, with strong control-flavoured burst and reliable ranged cleave.',
      tradeoff:'Peak damage depends on converting Fingers of Frost and Brain Freeze correctly; poor proc usage leaves the rotation noticeably flatter.',
      damage:1.04,threat:.95,cooldown:.96,cleave:.24,physicalTaken:1.02,magicTaken:.91
    }
  },
  Shaman:{
    Restoration:{
      title:'Totemic Mender',
      strength:'Chain healing and persistent totems excel when damage is spread across the party.',
      tradeoff:'Less focused emergency tank healing than a Holy Paladin and strongest while its totems remain active.',
      damage:.79,threat:.94,healing:1.08,healThreat:.96,magicTaken:.96
    },
    Elemental:{
      title:'Stormcaller',
      strength:'Builds Maelstrom through lightning and lava, then converts it into heavy ranged burst and pack damage.',
      tradeoff:'Its strongest finishers depend on Maelstrom generation and proc timing, so disrupted casts create noticeable damage gaps.',
      damage:1.07,threat:1.00,cooldown:.97,physicalTaken:1.02,magicTaken:.91,cleave:.28
    }
  },
  Warlock:{
    Demonology:{
      title:'Demon Commander',
      strength:'Sustained ranged pressure backed by a permanent Felguard and temporary burst summons.',
      tradeoff:'Much of its damage comes from demons, so pet commands and summons compete with direct spell slots.',
      damage:1.02,threat:.92,cooldown:1.00,magicTaken:.95,physicalTaken:1.06,petDamage:1.00
    },
    Destruction:{
      title:'Ruin Caster',
      strength:'Builds Soul Shards through burning pressure, then converts them into huge Chaos Bolt hits or heavy area fire.',
      tradeoff:'Its hardest hits require shard setup and cast commitment, so wasted shards or interrupted Chaos Bolts sharply reduce burst.',
      damage:1.08,threat:1.02,cooldown:.98,magicTaken:.94,physicalTaken:1.05,cleave:.26,burstEvery:5,burst:1.18
    }
  },
  Monk:{
    Brewmaster:{
      title:'Staggering Brewmaster',
      strength:'Smooths dangerous physical spikes through Stagger while controlling packs with mobile melee pressure.',
      tradeoff:'Some damage is delayed rather than erased, so poor Purifying Brew timing can let the Stagger pool become dangerous.',
      singleThreat:2.34,packThreat:2.52,groupThreat:.34,physicalTaken:.92,magicTaken:.96,damage:.91,tauntLead:1.18
    },
    Mistweaver:{
      title:'Martial Mender',
      strength:'Mobile direct healing with the option to turn melee pressure into smart healing through fistweaving.',
      tradeoff:'Less raw crisis healing than Holy Priest and requires skill-slot investment to mix damage and healing.',
      damage:.86,threat:.90,healing:1.00,healThreat:.94,physicalTaken:.98,magicTaken:.96
    },
    Windwalker:{
      title:'Combo Fighter',
      strength:'Fast melee pressure that rewards rotating different techniques and brings strong cleave.',
      tradeoff:'Repeating the same attack loses efficiency and movement away from melee quickly cuts output.',
      damage:1.06,threat:.98,cooldown:.95,physicalTaken:.97,magicTaken:.99,cleave:.24
    }
  },
  'Death Knight':{
    Blood:{
      title:'Blood Warden',
      strength:'Turns recent incoming damage into heavy Death Strike healing while maintaining single-target threat.',
      tradeoff:'Survival is reactive; wasting Runic Power before a heavy hit leaves fewer resources for recovery.',
      singleThreat:2.70,packThreat:2.20,groupThreat:.20,physicalTaken:.93,magicTaken:.95,damage:.90,tauntLead:1.22
    },
    Frost:{
      title:'Rime Reaper',
      strength:'Heavy melee burst, frost cleave and a strong generator-spender rhythm.',
      tradeoff:'Peak damage depends on maintaining Runic Power flow and staying in melee range.',
      damage:1.08,threat:1.02,cooldown:.96,physicalTaken:.94,magicTaken:.94,cleave:.28
    },
    Unholy:{
      title:'Plague Commander',
      strength:'Sustained disease pressure backed by a permanent Ghoul and explosive wound/summon windows.',
      tradeoff:'Damage ramps through wounds, diseases and undead rather than arriving instantly.',
      damage:1.04,threat:.96,cooldown:1.00,physicalTaken:.95,magicTaken:.93,petDamage:1.00
    }
  },
  'Demon Hunter':{
    Havoc:{
      title:'Fel Vanguard',
      strength:'Extremely mobile melee damage with fast Fury cycling, magical burst and strong cleave.',
      tradeoff:'Must stay aggressive and in melee range to keep Fury flowing; defensive tools compete with damage skills.',
      damage:1.01,threat:.98,cooldown:.93,physicalTaken:.96,magicTaken:.92,cleave:.30
    },
    Vengeance:{
      title:'Soul Warden',
      strength:'Mobile tank that converts enemy souls into self-healing while controlling packs with fel damage.',
      tradeoff:'Survival depends on generating and spending Soul Fragments well rather than relying on passive block.',
      singleThreat:2.48,packThreat:2.58,groupThreat:.30,physicalTaken:.95,magicTaken:.93,damage:.93,tauntLead:1.22
    }
  },
  Evoker:{
    Preservation:{
      title:'Temporal Lifebinder',
      strength:'Proactive ranged healing that layers time magic, echoes and large group recovery around Essence windows.',
      tradeoff:'Shorter range than other healers and poor Essence timing can leave the party exposed during consecutive damage spikes.',
      damage:.82,threat:.90,healing:1.04,healThreat:.92,physicalTaken:1.01,magicTaken:.91,cooldown:.96
    },
    Devastation:{
      title:'Dragonfire Artillery',
      strength:'High ranged magical burst with strong cleave and a flexible red/blue spell rotation.',
      tradeoff:'Its strongest attacks consume scarce Essence, so wasteful spending creates noticeable low-output windows.',
      damage:1.00,threat:1.03,cooldown:.96,physicalTaken:1.04,magicTaken:.90,cleave:.30
    }
  }
};

const role=c=>ROLE_MAP[c?.class]?.[c?.spec]||'dps';
const gearStats=c=>{const base={...(window.CellboundGear?.aggregateStats?.(c)||{})},extra=window.CellboundProfessions?.activeBonuses?.(c)||{};Object.entries(extra).forEach(([k,v])=>base[k]=(Number(base[k])||0)+(Number(v)||0));return base};
const primaryKey=c=>['Warrior','Death Knight'].includes(c?.class)?'strength':c?.class==='Monk'?(c?.spec==='Mistweaver'?'intellect':'agility'):['Hunter','Rogue','Demon Hunter'].includes(c?.class)?'agility':'intellect';
const getRace=id=>RACES[id]||RACES.Veyren;
const getSpec=(klass,spec)=>SPECS[klass]?.[spec]||{title:'Adventurer',strength:'Flexible combatant.',tradeoff:'No defined specialisation.',damage:1,threat:1};
const specFor=c=>getSpec(c?.class,c?.spec);
function rank(c,name){
  const tree=c?.talents?.[c?.spec]||{};
  return Math.max(0,Number(tree[name])||0);
}
function raceMod(c,key,fallback=1){const v=getRace(c?.race)?.modifiers?.[key];return v==null?fallback:Number(v)}
// Full Gear Combat Rebalance: secondary ratings use diminishing returns once a full 14-slot loadout is assembled.
function ratingCurve(value,softCap=20,postCapRate=.35,hardCap=45){
  const v=Math.max(0,Number(value)||0);if(v<=softCap)return v;
  return Math.min(hardCap,softCap+(v-softCap)*postCapRate)
}
function primaryCurve(value){const v=Math.max(0,Number(value)||0);return v<=45?v:45+(v-45)*.5}
function damageMultiplier(c,ctx={}){
  const p=specFor(c),gear=gearStats(c);let m=Number(p.damage)||1;
  m*=raceMod(c,'damage',1);
  m*=1+primaryCurve(gear[primaryKey(c)])*.0022;
  m*=1+ratingCurve(gear.damagePct,18,.40,42)/100;
  const crit=ratingCurve(gear.crit,20,.35,45);if(crit>0&&Math.random()*100<crit)m*=1.5;
  if(c?.class==='Mage')m*=raceMod(c,'magicDamage',1);
  if(c?.race==='Emberkin'&&Number(ctx.healthPct)<45)m*=raceMod(c,'lowHealthDamage',1);

  if(c?.class==='Warrior'&&c?.spec==='Arms'){
    m*=1+rank(c,'Weapon Mastery')*.03;
    if(Number(ctx.enemyPct)<35)m*=1+(Number(p.execute)||0)+rank(c,'Executioner')*.06;
  }
  if(c?.class==='Hunter'){
    m*=1+rank(c,'True Aim')*.03;
    if(ctx.priority)m*=Number(p.priorityDamage)||1;
  }
  if(c?.class==='Rogue'){
    m*=1+rank(c,'Venom')*.02;
    if(ctx.opening)m*=1+(Number(p.opening)||0)+rank(c,'Ambush')*.08;
    if(Number(ctx.enemyPct)<30)m*=1+(Number(p.execute)||0)+(rank(c,'Eviscerate')?0.12:0);
  }
  if(c?.class==='Mage'){
    m*=1+rank(c,'Arcane Focus')*.03+rank(c,'Surge')*.025;
    if(p.burstEvery&&Number(ctx.hit)>0&&Number(ctx.hit)%p.burstEvery===0)m*=Number(p.burst)||1;
  }
  if(c?.class==='Demon Hunter'&&c?.spec==='Havoc'){
    m*=1+rank(c,'Demon Blades')*.025;
    if(ctx.opening)m*=1+rank(c,'Initiative')*.05;
  }
  return m;
}
function cooldownMultiplier(c){
  const p=specFor(c),gear=gearStats(c);let m=(Number(p.cooldown)||1)*raceMod(c,'cooldown',1);m/=1+ratingCurve(gear.haste,20,.30,40)/100;
  if(c?.class==='Hunter')m*=Math.max(.78,1-rank(c,'Rapid Fire')*.035);
  if(c?.class==='Rogue')m*=Math.max(.78,1-rank(c,'Quick Recovery')*.03);
  if(c?.class==='Mage')m*=Math.max(.82,1-rank(c,'Arcane Flows')*.03);
  return m;
}
function defenceProfile(c){
  const p=specFor(c),gear=gearStats(c),stamina=primaryCurve(gear.stamina),armour=primaryCurve(gear.armour),ward=ratingCurve(gear.magicWardPct,20,.40,45);
  let physical=Number(p.physicalTaken)||1,magic=Number(p.magicTaken)||1;
  physical*=raceMod(c,'physicalTaken',1);magic*=raceMod(c,'magicTaken',1);
  const staminaReduction=Math.max(.86,1-stamina*.0025);
  physical*=staminaReduction;magic*=staminaReduction;
  physical*=Math.max(.80,1-armour*.00125);
  magic*=Math.max(.72,1-ward/100);
  if(c?.class==='Warrior'&&c?.spec==='Protection')physical*=Math.max(.80,1-rank(c,'Shield Mastery')*.025);
  if(c?.class==='Paladin'&&c?.spec==='Protection'&&c?.class==='Paladin'){
    physical*=Math.max(.84,1-rank(c,'Sacred Shield')*.02);
    magic*=Math.max(.80,1-rank(c,'Divine Ward')*.03);
  }
  if(c?.class==='Monk'&&c?.spec==='Brewmaster'){
    physical*=Math.max(.86,1-rank(c,'High Tolerance')*.018);
    magic*=Math.max(.90,1-rank(c,'Elusive Brawler')*.012);
  }
  if(c?.class==='Demon Hunter'&&c?.spec==='Vengeance'){
    physical*=Math.max(.82,1-rank(c,'Thick Skin')*.025);
    magic*=Math.max(.84,1-rank(c,'Thick Skin')*.018);
  }
  return{
    physicalTaken:Math.max(.56,physical),
    magicTaken:Math.max(.56,magic),
    blockChance:role(c)==='tank'?Math.max(0,Math.min(45,Number(gear.block)||0)):0,
    blockMultiplier:.72,
    healthMultiplier:1+Math.min(.22,stamina*.003),
    stamina,armour,magicWardPct:ward
  };
}
function incomingMultiplier(c,type='physical'){
  const d=defenceProfile(c);
  return type==='magic'?d.magicTaken:d.physicalTaken;
}
function healingMultiplier(healer,target,ctx={}){
  const p=specFor(healer),gear=gearStats(healer);let m=(Number(p.healing)||1)*raceMod(healer,'healing',1)*raceMod(target,'healingReceived',1);
  m*=1+ratingCurve(gear.healing,24,.40,55)/100+primaryCurve(gear.intellect)*.0018;
  const crit=ratingCurve(gear.crit,20,.35,45);if(crit>0&&Math.random()*100<crit)m*=1.5;
  if(healer?.class==='Paladin'&&healer?.spec==='Holy'){
    m*=1+rank(healer,'Divine Light')*.04;
    if(role(target)==='tank')m*=1.16;
  }
  if(healer?.class==='Priest'){
    m*=1+rank(healer,'Serenity')*.03;
    if(Number(ctx.targetHp)<40)m*=1.14;
  }
  if(healer?.class==='Druid')m*=1+rank(healer,'Rejuvenation')*.03;
  if(healer?.class==='Shaman'&&healer?.spec==='Restoration')m*=1+rank(healer,'Tidal Focus')*.03;
  if(healer?.class==='Monk'&&healer?.spec==='Mistweaver')m*=1+rank(healer,'Mist Wrap')*.03;
  return m;
}
function healThreatMultiplier(c){const gear=gearStats(c);return (Number(specFor(c).healThreat)||1)*(1+ratingCurve(gear.threat,24,.45,60)/100)}
function damageThreatMultiplier(c,ctx={}){
  const p=specFor(c);
  const gear=gearStats(c),gearThreat=1+ratingCurve(gear.threat,24,.45,60)/100;
  if(role(c)==='tank'){
    let m=Number(ctx.enemyCount)>1?(Number(p.packThreat)||2.4):(Number(p.singleThreat)||2.4);
    if(c?.class==='Paladin')m*=1+rank(c,'Guardian Oath')*.04;
    return m*gearThreat;
  }
  return (Number(p.threat)||1)*gearThreat;
}
function groupThreatRatio(c){
  const p=specFor(c);let v=Number(p.groupThreat)||0;
  if(c?.class==='Paladin'&&c?.spec==='Protection')v+=rank(c,'Consecration')*.12;
  return v;
}
function tauntLead(c){
  const p=specFor(c);let v=Number(p.tauntLead)||1.15;
  if(c?.class==='Warrior'&&c?.spec==='Protection')v+=rank(c,'Taunt Mastery')*.04;
  return v;
}
function cleaveRatio(c){
  const p=specFor(c);let v=Number(p.cleave)||0;
  if(c?.class==='Warrior'&&c?.spec==='Arms')v+=rank(c,'Sweeping Blows')*.12;
  if(c?.class==='Mage')v+=rank(c,'Barrage')*.08;
  return v;
}
function groupHealRatio(c){
  if(c?.class!=='Priest'||c?.spec!=='Holy')return 0;
  return Math.min(.58,(Number(specFor(c).groupHeal)||0)+rank(c,'Circle of Healing')*.12+rank(c,'Prayer of Mending')*.04);
}
function groupHealTargets(c){return rank(c,'Circle of Healing')>0?3:2}
function hotRatio(c){
  if(c?.class!=='Druid'||c?.spec!=='Restoration')return 0;
  return Math.min(.62,(Number(specFor(c).hot)||0)+rank(c,'Rejuvenation')*.05+rank(c,'Lifebloom')*.04);
}
function beaconRatio(c){
  if(c?.class!=='Paladin'||c?.spec!=='Holy'||rank(c,'Beacon')<=0)return 0;
  return .40;
}
function passiveRegen(c){return Math.max(0,raceMod(c,'regen',0))}
function knowledgeMultiplier(c){return raceMod(c,'knowledge',1)}
function summary(c){
  const r=getRace(c?.race),s=specFor(c);
  return {
    race:{name:c?.race||'Veyren',trait:r.trait,strength:r.strength,tradeoff:r.tradeoff},
    spec:{title:s.title,strength:s.strength,tradeoff:s.tradeoff}
  };
}

window.CellboundIdentities={
  RACES,SPECS,ROLE_MAP,role,getRace,getSpec,specFor,rank,summary,
  damageMultiplier,cooldownMultiplier,incomingMultiplier,defenceProfile,healingMultiplier,
  healThreatMultiplier,damageThreatMultiplier,groupThreatRatio,tauntLead,
  cleaveRatio,groupHealRatio,groupHealTargets,hotRatio,beaconRatio,passiveRegen,knowledgeMultiplier,
  balance:{ratingCurve,primaryCurve}
};
})();

/* Combat Reborn is loaded from combat-reborn-v1.js. Keep combat identities and simulation engine separate. */
