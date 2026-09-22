(()=>{
'use strict';

const ROLE_MAP={
  Warrior:{Protection:'tank',Arms:'dps'},
  Paladin:{Protection:'tank',Holy:'healer'},
  Priest:{Holy:'healer'},
  Druid:{Restoration:'healer'},
  Hunter:{Marksman:'dps'},
  Rogue:{Assassination:'dps'},
  Mage:{Arcane:'dps'}
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
      singleThreat:2.95,packThreat:2.28,groupThreat:.08,physicalTaken:.88,magicTaken:1.04,damage:.96,tauntLead:1.25
    },
    Arms:{
      title:'Execution Fighter',
      strength:'Heavy single-target pressure, execute damage and useful cleave.',
      tradeoff:'High personal threat and loses output when forced away from melee.',
      damage:1.08,threat:1.08,physicalTaken:.95,cleave:.30,execute:.22,cooldown:.98
    }
  },
  Paladin:{
    Protection:{
      title:'Pack Guardian',
      strength:'Excellent multi-target threat, add control and magical defence.',
      tradeoff:'Lower sustained single-target threat than a Protection Warrior.',
      singleThreat:2.18,packThreat:2.32,groupThreat:.56,physicalTaken:.94,magicTaken:.87,damage:.92,tauntLead:1.16
    },
    Holy:{
      title:'Tank Keeper',
      strength:'Powerful direct healing and exceptional tank stabilisation.',
      tradeoff:'Less efficient when the whole party needs sustained recovery.',
      damage:.82,threat:.90,healing:1.16,healThreat:.88,magicTaken:.94
    }
  },
  Priest:{
    Holy:{
      title:'Crisis Healer',
      strength:'Best burst recovery when several allies are in danger.',
      tradeoff:'Large recovery windows generate noticeably more healing threat.',
      damage:.78,threat:1,healing:1.04,healThreat:1.12,groupHeal:.20,physicalTaken:1.04
    }
  },
  Druid:{
    Restoration:{
      title:'Sustained Restorer',
      strength:'Healing-over-time, movement and efficient sustained recovery.',
      tradeoff:'Direct emergency healing lands more slowly than Paladin or Priest healing.',
      damage:.76,threat:.92,healing:.90,healThreat:.92,hot:.36,physicalTaken:.98,magicTaken:.98
    }
  },
  Hunter:{
    Marksman:{
      title:'Priority Marksman',
      strength:'Reliable ranged pressure, fast target switching and strong priority damage.',
      tradeoff:'Lower peak boss burst than Rogue, Mage or Arms Warrior.',
      damage:.99,threat:.94,cooldown:.94,priorityDamage:1.13
    }
  },
  Rogue:{
    Assassination:{
      title:'Boss Assassin',
      strength:'Exceptional single-target damage with strong personal threat control.',
      tradeoff:'Very little pack damage and vulnerable when mechanics force movement.',
      damage:1.12,threat:.72,cooldown:.84,execute:.18,opening:.26,physicalTaken:1.03
    }
  },
  Mage:{
    Arcane:{
      title:'Arcane Artillery',
      strength:'Highest burst spell pressure with strong splash damage.',
      tradeoff:'Fragile and capable of pulling threat during burst windows.',
      damage:1.14,threat:1.18,cooldown:1.06,cleave:.28,physicalTaken:1.10,magicTaken:.92,burstEvery:4,burst:1.30
    }
  }
};

const role=c=>ROLE_MAP[c?.class]?.[c?.spec]||'dps';
const gearStats=c=>{const base={...(window.CellboundGear?.aggregateStats?.(c)||{})},extra=window.CellboundProfessions?.activeBonuses?.(c)||{};Object.entries(extra).forEach(([k,v])=>base[k]=(Number(base[k])||0)+(Number(v)||0));return base};
const primaryKey=c=>c?.class==='Warrior'?'strength':['Hunter','Rogue'].includes(c?.class)?'agility':'intellect';
const getRace=id=>RACES[id]||RACES.Veyren;
const getSpec=(klass,spec)=>SPECS[klass]?.[spec]||{title:'Adventurer',strength:'Flexible combatant.',tradeoff:'No defined specialisation.',damage:1,threat:1};
const specFor=c=>getSpec(c?.class,c?.spec);
function rank(c,name){
  const tree=c?.talents?.[c?.spec]||{};
  return Math.max(0,Number(tree[name])||0);
}
function raceMod(c,key,fallback=1){const v=getRace(c?.race)?.modifiers?.[key];return v==null?fallback:Number(v)}
function damageMultiplier(c,ctx={}){
  const p=specFor(c),gear=gearStats(c);let m=Number(p.damage)||1;
  m*=raceMod(c,'damage',1);
  m*=1+(Number(gear[primaryKey(c)])||0)*.0025;
  m*=1+(Number(gear.damagePct)||0)/100;
  if((Number(gear.crit)||0)>0&&Math.random()*100<Number(gear.crit))m*=1.5;
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
  return m;
}
function cooldownMultiplier(c){
  const p=specFor(c),gear=gearStats(c);let m=(Number(p.cooldown)||1)*raceMod(c,'cooldown',1);m/=1+(Number(gear.haste)||0)/100;
  if(c?.class==='Hunter')m*=Math.max(.78,1-rank(c,'Rapid Fire')*.035);
  if(c?.class==='Rogue')m*=Math.max(.78,1-rank(c,'Quick Recovery')*.03);
  if(c?.class==='Mage')m*=Math.max(.82,1-rank(c,'Arcane Flows')*.03);
  return m;
}
function defenceProfile(c){
  const p=specFor(c),gear=gearStats(c),stamina=Math.max(0,Number(gear.stamina)||0),armour=Math.max(0,Number(gear.armour)||0),ward=Math.max(0,Number(gear.magicWardPct)||0);
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
  m*=1+(Number(gear.healing)||0)/100+(Number(gear.intellect)||0)*.002;
  if((Number(gear.crit)||0)>0&&Math.random()*100<Number(gear.crit))m*=1.5;
  if(healer?.class==='Paladin'&&healer?.spec==='Holy'){
    m*=1+rank(healer,'Divine Light')*.04;
    if(role(target)==='tank')m*=1.16;
  }
  if(healer?.class==='Priest'){
    m*=1+rank(healer,'Serenity')*.03;
    if(Number(ctx.targetHp)<40)m*=1.14;
  }
  if(healer?.class==='Druid')m*=1+rank(healer,'Rejuvenation')*.03;
  return m;
}
function healThreatMultiplier(c){const gear=gearStats(c);return (Number(specFor(c).healThreat)||1)*(1+(Number(gear.threat)||0)/100)}
function damageThreatMultiplier(c,ctx={}){
  const p=specFor(c);
  const gear=gearStats(c),gearThreat=1+(Number(gear.threat)||0)/100;
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
  cleaveRatio,groupHealRatio,groupHealTargets,hotRatio,beaconRatio,passiveRegen,knowledgeMultiplier
};
})();

/* Combat Reborn is loaded from combat-reborn-v1.js. Keep combat identities and simulation engine separate. */
