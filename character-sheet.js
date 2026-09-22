(()=>{
'use strict';

const STORAGE='cellbound-management-reboot-v3';
const G=window.CellboundGear;
const I=window.CellboundIdentities;
const modal=document.getElementById('characterModal');
const detail=document.getElementById('characterDetail');
if(!modal||!detail)return;

let dirty=false;
let currentId=null;
let currentTab='overview';
let activeSlot=null;
let selectedTalentId=null;
let selectedTalentSpec=null;
let selectedTreeSpec=null;
let activeSkillSlot=0;

const classMeta={
  Warrior:{icon:'⚔',accent:'#b86b55',primary:'Strength'},
  Paladin:{icon:'✥',accent:'#d8b65d',primary:'Strength'},
  Priest:{icon:'✚',accent:'#e2d9c5',primary:'Intellect'},
  Druid:{icon:'❈',accent:'#7fc47a',primary:'Intellect'},
  Hunter:{icon:'➶',accent:'#9abe68',primary:'Agility'},
  Rogue:{icon:'◆',accent:'#d9c86c',primary:'Agility'},
  Mage:{icon:'✦',accent:'#6da7df',primary:'Intellect'}
};

const specs={
  Warrior:{Protection:'tank',Arms:'dps'},
  Paladin:{Protection:'tank',Holy:'healer'},
  Priest:{Holy:'healer'},
  Druid:{Restoration:'healer'},
  Hunter:{Marksman:'dps'},
  Rogue:{Assassination:'dps'},
  Mage:{Arcane:'dps'}
};

const trees={
  Warrior:{
    Protection:[
      {id:'Shield Mastery',icon:'🛡',tier:0,col:1,max:3,desc:'Increase block and reduce incoming physical damage.'},
      {id:'Last Stand',icon:'♥',tier:0,col:3,max:1,desc:'Gain a powerful emergency health increase.'},
      {id:'Iron Discipline',icon:'⛓',tier:1,col:0,max:3,req:'Shield Mastery',desc:'Improve armour while a shield is equipped.'},
      {id:'Taunt Mastery',icon:'!',tier:1,col:2,max:2,desc:'Improve threat generation and taunt reliability.'},
      {id:'Hold the Line',icon:'▰',tier:2,col:1,max:2,req:'Iron Discipline',desc:'Blocking grants a short defensive buff.'},
      {id:'Vengeance',icon:'⚡',tier:2,col:3,max:3,req:'Taunt Mastery',desc:'Taking damage increases your counter-attack power.'},
      {id:'Bulwark',icon:'⬢',tier:3,col:1,max:1,req:'Hold the Line',desc:'Create a major defensive wall for the party.'},
      {id:'Fortress',icon:'♜',tier:3,col:3,max:2,req:'Vengeance',desc:'Increase mitigation during sustained boss pressure.'},
      {id:'Unbroken',icon:'✦',tier:4,col:2,max:1,req:'Bulwark',desc:'Capstone: survive a lethal blow once per encounter.'}
    ],
    Arms:[
      {id:'Weapon Mastery',icon:'⚔',tier:0,col:1,max:3,desc:'Increase weapon damage.'},
      {id:'Deep Wounds',icon:'🩸',tier:0,col:3,max:3,desc:'Critical strikes cause bleeding.'},
      {id:'Battle Rhythm',icon:'◈',tier:1,col:0,max:2,req:'Weapon Mastery',desc:'Repeated attacks build momentum.'},
      {id:'Overpower',icon:'↯',tier:1,col:2,max:2,desc:'Punish enemy mistakes with a heavy strike.'},
      {id:'Sweeping Blows',icon:'⌁',tier:2,col:1,max:1,req:'Battle Rhythm',desc:'Damage can cleave to an additional target.'},
      {id:'Executioner',icon:'☠',tier:2,col:3,max:3,req:'Deep Wounds',desc:'Deal more damage to weakened bosses.'},
      {id:'Mortal Strike',icon:'✕',tier:3,col:1,max:1,req:'Sweeping Blows',desc:'Unlock the signature Arms attack.'},
      {id:'Blood Frenzy',icon:'🔥',tier:3,col:3,max:2,req:'Executioner',desc:'Bleeding targets increase attack speed.'},
      {id:'Bladestorm',icon:'✹',tier:4,col:2,max:1,req:'Mortal Strike',desc:'Capstone: unleash a devastating weapon storm.'}
    ]
  },
  Paladin:{
    Protection:[
      {id:'Sacred Shield',icon:'🛡',tier:0,col:1,max:3,desc:'Strengthen block with holy power.'},
      {id:'Guardian Oath',icon:'✥',tier:0,col:3,max:1,desc:'Swear an oath that increases threat and defence.'},
      {id:'Righteous Guard',icon:'☀',tier:1,col:0,max:3,req:'Sacred Shield',desc:'Reduce damage after blocking.'},
      {id:'Hammer of Justice',icon:'🔨',tier:1,col:2,max:2,desc:'Improve control and interruption.'},
      {id:'Consecration',icon:'◎',tier:2,col:1,max:1,req:'Righteous Guard',desc:'Consecrate the ground beneath the party.'},
      {id:'Divine Ward',icon:'◇',tier:2,col:3,max:2,req:'Guardian Oath',desc:'Reduce incoming magical damage.'},
      {id:'Ardent Defender',icon:'🔥',tier:3,col:1,max:1,req:'Consecration',desc:'Powerful defensive cooldown.'},
      {id:'Holy Bastion',icon:'▣',tier:3,col:3,max:2,req:'Divine Ward',desc:'Increase block while under sustained pressure.'},
      {id:'Divine Guardian',icon:'✦',tier:4,col:2,max:1,req:'Ardent Defender',desc:'Capstone: protect the entire party from heavy damage.'}
    ],
    Holy:[
      {id:'Divine Light',icon:'✦',tier:0,col:1,max:3,desc:'Increase direct healing.'},
      {id:'Grace',icon:'♡',tier:0,col:3,max:3,desc:'Reduce healing resource cost.'},
      {id:'Holy Shock',icon:'☀',tier:1,col:0,max:1,req:'Divine Light',desc:'Instant heal with offensive utility.'},
      {id:'Infusion',icon:'✧',tier:1,col:2,max:2,desc:'Critical heals improve your next cast.'},
      {id:'Beacon',icon:'◉',tier:2,col:1,max:1,req:'Holy Shock',desc:'Link healing to a chosen ally.'},
      {id:'Sacred Hands',icon:'✋',tier:2,col:3,max:3,req:'Grace',desc:'Increase healing on low-health allies.'},
      {id:'Aura Mastery',icon:'✺',tier:3,col:1,max:1,req:'Beacon',desc:'Empower your active aura.'},
      {id:'Radiance',icon:'☼',tier:3,col:3,max:2,req:'Sacred Hands',desc:'Spread healing to nearby party members.'},
      {id:'Divine Hymn',icon:'♫',tier:4,col:2,max:1,req:'Aura Mastery',desc:'Capstone: unleash a raid-saving wave of holy healing.'}
    ]
  },
  Priest:{Holy:[
    {id:'Renew',icon:'✚',tier:0,col:1,max:3,desc:'Improve healing over time.'},{id:'Serenity',icon:'◌',tier:0,col:3,max:2,desc:'Increase efficient direct healing.'},{id:'Prayer of Mending',icon:'✧',tier:1,col:0,max:2,req:'Renew',desc:'Healing jumps between allies.'},{id:'Focused Will',icon:'◇',tier:1,col:2,max:2,desc:'Increase healing under pressure.'},{id:'Circle of Healing',icon:'◎',tier:2,col:1,max:1,req:'Prayer of Mending',desc:'Heal several party members at once.'},{id:'Spirit of Redemption',icon:'♰',tier:2,col:3,max:1,req:'Serenity',desc:'Continue healing briefly after defeat.'},{id:'Guardian Spirit',icon:'翼',tier:3,col:1,max:1,req:'Circle of Healing',desc:'Protect an ally from lethal damage.'},{id:'Divine Insight',icon:'✦',tier:3,col:3,max:2,req:'Spirit of Redemption',desc:'Gain powerful healing procs.'},{id:'Divine Hymn',icon:'♫',tier:4,col:2,max:1,req:'Guardian Spirit',desc:'Capstone group healing channel.'}
  ]},
  Druid:{Restoration:[
    {id:'Rejuvenation',icon:'❈',tier:0,col:1,max:3,desc:'Improve your core heal-over-time spell.'},{id:'Lifebloom',icon:'🌿',tier:0,col:3,max:3,desc:'Stack healing on a focused ally.'},{id:'Wild Growth',icon:'☘',tier:1,col:0,max:2,req:'Rejuvenation',desc:'Spread healing across the party.'},{id:'Natural Swiftness',icon:'➤',tier:1,col:2,max:1,desc:'Make an important heal instant.'},{id:'Living Seed',icon:'◉',tier:2,col:1,max:2,req:'Wild Growth',desc:'Critical heals plant a delayed heal.'},{id:'Ironbark',icon:'♣',tier:2,col:3,max:1,req:'Lifebloom',desc:'Reduce damage on an ally.'},{id:'Tree of Life',icon:'♠',tier:3,col:1,max:1,req:'Living Seed',desc:'Temporarily empower restoration magic.'},{id:'Flourish',icon:'✿',tier:3,col:3,max:1,req:'Ironbark',desc:'Extend active healing effects.'},{id:'Tranquility',icon:'✦',tier:4,col:2,max:1,req:'Tree of Life',desc:'Capstone: channel massive party-wide healing.'}
  ]},
  Hunter:{Marksman:[
    {id:'True Aim',icon:'◎',tier:0,col:1,max:3,desc:'Increase accuracy and ranged damage.'},{id:'Rapid Fire',icon:'➶',tier:0,col:3,max:2,desc:'Fire several shots in quick succession.'},{id:'Steady Focus',icon:'◈',tier:1,col:0,max:2,req:'True Aim',desc:'Maintain damage while stationary.'},{id:'Concussive Shot',icon:'◉',tier:1,col:2,max:1,desc:'Add useful control.'},{id:'Piercing Shots',icon:'⇢',tier:2,col:1,max:3,req:'Steady Focus',desc:'Critical shots cause bleeding.'},{id:'Trueshot Aura',icon:'✦',tier:2,col:3,max:1,req:'Rapid Fire',desc:'Improve party ranged output.'},{id:'Careful Aim',icon:'⊙',tier:3,col:1,max:2,req:'Piercing Shots',desc:'Deal extra damage to healthy targets.'},{id:'Killer Instinct',icon:'☠',tier:3,col:3,max:2,req:'Trueshot Aura',desc:'Improve finishing damage.'},{id:'Kill Shot',icon:'✹',tier:4,col:2,max:1,req:'Careful Aim',desc:'Capstone execute ability.'}
  ]},
  Rogue:{Assassination:[
    {id:'Ambush',icon:'◆',tier:0,col:1,max:3,desc:'Increase opening burst.'},{id:'Venom',icon:'☣',tier:0,col:3,max:3,desc:'Improve poisons.'},{id:'Garrote',icon:'⌁',tier:1,col:0,max:2,req:'Ambush',desc:'Apply a powerful bleed from stealth.'},{id:'Quick Recovery',icon:'↺',tier:1,col:2,max:2,desc:'Recover resources faster.'},{id:'Mutilate',icon:'✕',tier:2,col:1,max:1,req:'Garrote',desc:'Unlock a brutal dual-weapon attack.'},{id:'Envenom',icon:'☠',tier:2,col:3,max:2,req:'Venom',desc:'Consume poison stacks for burst damage.'},{id:'Master Poisoner',icon:'♨',tier:3,col:1,max:2,req:'Mutilate',desc:'Enhance poison effectiveness.'},{id:'Cut to the Chase',icon:'➤',tier:3,col:3,max:2,req:'Envenom',desc:'Maintain damage buffs automatically.'},{id:'Eviscerate',icon:'✦',tier:4,col:2,max:1,req:'Master Poisoner',desc:'Capstone finishing strike.'}
  ]},
  Mage:{Arcane:[
    {id:'Arcane Focus',icon:'✦',tier:0,col:1,max:3,desc:'Increase spell accuracy and power.'},{id:'Surge',icon:'⚡',tier:0,col:3,max:2,desc:'Burst arcane power for a short time.'},{id:'Clearcasting',icon:'◇',tier:1,col:0,max:2,req:'Arcane Focus',desc:'Chance to make spells cost no mana.'},{id:'Spell Impact',icon:'✷',tier:1,col:2,max:2,desc:'Increase critical spell damage.'},{id:'Presence of Mind',icon:'◉',tier:2,col:1,max:1,req:'Clearcasting',desc:'Make a cast instant.'},{id:'Arcane Flows',icon:'≈',tier:2,col:3,max:2,req:'Surge',desc:'Reduce cooldowns.'},{id:'Arcane Power',icon:'☄',tier:3,col:1,max:1,req:'Presence of Mind',desc:'Major spell-damage cooldown.'},{id:'Nether Precision',icon:'✧',tier:3,col:3,max:2,req:'Arcane Flows',desc:'Improve critical spell efficiency.'},{id:'Barrage',icon:'✹',tier:4,col:2,max:1,req:'Arcane Power',desc:'Capstone instant arcane barrage.'}
  ]}
};

const leftSlots=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet'];
const rightSlots=['Weapon','OffHand','Ring1','Ring2','Trinket1','Trinket2','Relic'];
const slotIcons={Head:'⛑',Shoulders:'⌃',Chest:'▣',Hands:'✋',Waist:'═',Legs:'║',Feet:'♟',Weapon:'⚔',OffHand:'🛡',Ring1:'◉',Ring2:'◉',Trinket1:'◆',Trinket2:'◆',Relic:'◇'};

function readState(){try{return JSON.parse(localStorage.getItem(STORAGE))}catch{return null}}
function writeState(state){localStorage.setItem(STORAGE,JSON.stringify(state));dirty=true}
function getCharacter(state,id){return state?.roster?.find(c=>c.id===id)}
function characterEditable(){const game=window.CellboundGame;return !game?.isCharacterRosterUnlocked||game.isCharacterRosterUnlocked(currentId)}
function roleOf(c){return specs[c.class]?.[c.spec]||'dps'}
function roleLabel(role){return role==='dps'?'Damage':role[0].toUpperCase()+role.slice(1)}
function combatEngine(){return window.CellboundCombatReborn||null}
function skillPoolFor(c,spec=c?.spec){
  const engine=combatEngine(),role=specs[c?.class]?.[spec]||'dps',copyChar={...c,spec};
  if(engine?.skills?.classSkillPool)return engine.skills.classSkillPool(copyChar,role);
  return (engine?.ABILITIES?.[c?.class]||[]).filter(a=>!a.role||a.role===role)
}
function skillTalentMet(c,skill,spec=c?.spec){return !skill?.talentReq||Math.max(0,Number(c?.talents?.[spec]?.[skill.talentReq])||0)>0}
function skillAvailable(c,skill,spec=c?.spec){return (Number(skill?.unlockLevel)||1)<=Math.max(1,Number(c?.level)||1)&&skillTalentMet(c,skill,spec)}
function defaultSkillIds(c,spec=c?.spec){
  const engine=combatEngine(),role=specs[c?.class]?.[spec]||'dps',copyChar={...c,spec};
  const ids=engine?.skills?.defaultSkillLoadout?.(copyChar,role)||skillPoolFor(copyChar,spec).filter(a=>(Number(a.unlockLevel)||1)<=Math.max(1,Number(c?.level)||1)).slice(0,4).map(a=>a.id);
  return ids.slice(0,4)
}
function equippedSkillIds(c,spec=c?.spec){
  const pool=skillPoolFor(c,spec),byId=new Map(pool.map(s=>[s.id,s]));
  const explicit=Array.isArray(c?.skillLoadouts?.[spec])?c.skillLoadouts[spec]:defaultSkillIds(c,spec),out=explicit.slice(0,4).map(id=>{const skill=byId.get(id);return skill&&skillAvailable(c,skill,spec)?id:null});
  while(out.length<4)out.push(null);
  return out
}
function skillKindLabel(kind){
  return ({damage:'Damage',heal:'Healing','group-heal':'Group Heal',interrupt:'Interrupt',taunt:'Taunt',defensive:'Defensive','battle-rez':'Battle Rez'})[kind]||'Utility'
}
function skillIcon(kind){
  return ({damage:'⚔',heal:'✚','group-heal':'✥',interrupt:'!',taunt:'◎',defensive:'◆','battle-rez':'♰'})[kind]||'◇'
}
function skillCooldownText(skill){
  const ms=Math.max(0,Number(skill?.cd)||0);if(!ms)return'No cooldown';
  if(ms>=60000)return(ms/60000).toFixed(ms%60000?1:0)+'m cooldown';
  return(Math.round(ms/100)/10)+'s cooldown'
}
function ensureCharacter(c){
  c.equipment=c.equipment||{};
  if(c.equipment.Trinket&&!c.equipment.Trinket1){c.equipment.Trinket1=c.equipment.Trinket;delete c.equipment.Trinket}
  [...leftSlots,...rightSlots].forEach(slot=>{if(!(slot in c.equipment))c.equipment[slot]=null});
  c.talents=c.talents||{};
  Object.keys(specs[c.class]||{}).forEach(spec=>{c.talents[spec]=c.talents[spec]||{}});
  c.skillLoadouts=c.skillLoadouts&&typeof c.skillLoadouts==='object'?c.skillLoadouts:{};
  const buff=combatEngine()?.CLASS_BUFFS?.[c.class];if(buff&&!c.buffSkill)c.buffSkill=buff.id;
  return c;
}
function rarityClass(item){return `cb-rarity-${String(item?.rarity||'starter').toLowerCase()}`}
function combinedBonusStats(c){
  const out={...(G?.aggregateStats?.(c)||{})},prep=window.CellboundProfessions?.activeBonuses?.(c)||{};
  Object.entries(prep).forEach(([k,v])=>out[k]=(Number(out[k])||0)+(Number(v)||0));return out
}
function statBlock(c){
  const meta=classMeta[c.class]||{primary:'Strength'},bonus=combinedBonusStats(c);
  const level=c.level||1,gear=c.gear||0,role=roleOf(c);
  const strength=Math.round(level*7+gear*(meta.primary==='Strength'?.62:.2)+(bonus.strength||0));
  const agility=Math.round(level*6+gear*(meta.primary==='Agility'?.62:.18)+(bonus.agility||0));
  const intellect=Math.round(level*7+gear*(meta.primary==='Intellect'?.64:.16)+(bonus.intellect||0));
  const stamina=Math.round(level*9+gear*.52+(role==='tank'?18:0)+(bonus.stamina||0));
  const armour=Math.round(gear*14+level*20+(role==='tank'?180:role==='healer'?35:60)+(bonus.armour||0));
  const crit=Math.max(3,Math.round(5+gear*.11+(bonus.crit||0)));
  const haste=Math.max(2,Math.round(3+level*.7+(bonus.haste||0)));
  const block=role==='tank'?Math.round(8+gear*.18+(bonus.block||0)):Number(bonus.block||0);
  return {Strength:strength,Agility:agility,Intellect:intellect,Stamina:stamina,Armour:armour,Crit:`${crit}%`,Haste:`${haste}%`,Block:block?`${block}%`:'—',Threat:bonus.threat?`+${bonus.threat}%`:'—',Healing:bonus.healing?`+${bonus.healing}%`:'—'};
}
function sheetMaxHealth(c){
  const ilvl=window.CellboundGame?.characterItemLevel?.(c)||0;
  const role=roleOf(c);
  const bonus=combinedBonusStats(c);return Math.round(100+(Number(c.level)||1)*28+ilvl*5+(role==='tank'?90:role==='healer'?30:50)+(Number(bonus.stamina)||0)*4);
}
function bestBankUpgrade(state,c,slot){
  const current=Math.max(0,Number(c.equipment?.[slot]?.itemLevel)||0);
  const candidates=(state?.bank||[]).filter(item=>canUse(c,item)&&possibleSlots(item).includes(slot));
  const best=candidates.sort((x,y)=>(Number(y.itemLevel)||0)-(Number(x.itemLevel)||0))[0];
  const gain=(Number(best?.itemLevel)||0)-current;
  return gain>0?{item:best,gain}:null;
}
function equipmentSlot(c,slot,state){
  const item=c.equipment?.[slot],upgrade=bestBankUpgrade(state,c,slot),prep=(window.CellboundProfessions?.activeEffects?.(c)||[]).find(x=>x.kind==='enhancement'&&x.slot===slot);
  const art=item?(G?.artHTML?.(item,48,'cb-slot-art')||item.icon||slotIcons[slot]||'◇'):(slotIcons[slot]||'◇');
  return `<button class="cb-equip-slot ${item?rarityClass(item):'cb-empty'} ${upgrade?'has-upgrade':''}" data-slot="${slot}">
    <span class="cb-slot-icon">${art}</span>
    <span class="cb-slot-copy"><small>${slot.replace(/(\d)/,' $1')}</small><b>${item?.name||'Empty'}</b>${item?.power?`<em>+${item.power} power</em>`:''}${item?`<span class="cb-slot-ilvl">Item Level ${item.itemLevel||0}</span><span class="cb-slot-roll">${(G?.statLines?.(item)||[]).map(s=>s.text).join(' · ')||'Legacy roll'}</span>${prep?`<span class="cb-slot-roll cb-slot-prep">✥ ${prep.name} · ${window.CellboundProfessions?.bonusText?.(prep.bonuses)||''} · ${prep.remainingBosses} bosses</span>`:''}`:'<span class="cb-slot-ilvl">Empty equipment slot</span>'}</span>
    ${upgrade?`<span class="cb-slot-upgrade">+${upgrade.gain} ILVL</span>`:''}
  </button>`;
}
function armouryFocus(c,slot,state,position){
  const item=c.equipment?.[slot],upgrade=bestBankUpgrade(state,c,slot);
  const art=item?(G?.artHTML?.(item,74,'cb-armoury-art')||item.icon||slotIcons[slot]):slotIcons[slot];
  return `<button class="cb-armoury-focus cb-focus-${position} ${item?rarityClass(item):'cb-empty'} ${upgrade?'has-upgrade':''}" data-slot="${slot}" title="${slot}">
    <span class="cb-armoury-focus-art">${art}</span>
    <span class="cb-armoury-focus-label"><small>${slot}</small><b>${item?.name||'Empty'}</b></span>
    ${upgrade?'<i>UPGRADE</i>':''}
  </button>`;
}
function paperDoll(c,state){
  const meta=classMeta[c.class]||{icon:'◇',accent:'#58d7cf'};
  const role=roleOf(c),stats=statBlock(c);
  const itemLevel=window.CellboundGame?.characterItemLevel?.(c)||c.gear||0;
  const equipped=[...leftSlots,...rightSlots].filter(slot=>c.equipment?.[slot]).length;
  const upgradeCount=[...leftSlots,...rightSlots].filter(slot=>bestBankUpgrade(state,c,slot)).length;
  const ent=window.CellboundGame?.getEntitlements?.()||{professionSlots:1,member:false};
  const health=sheetMaxHealth(c),shock=Math.round(Number(c.cellShock)||0);
  const coreStats=['Strength','Agility','Intellect','Stamina'];
  const combatStats=['Armour','Crit','Haste','Block','Threat','Healing'];
  return `<div class="cb-paperdoll cb-armoury-screen cb-armoury-stats-screen" style="--cb-accent:${meta.accent}">
    <div class="cb-gear-column cb-gear-left">${leftSlots.map(s=>equipmentSlot(c,s,state)).join('')}</div>
    <section class="cb-armoury-stage cb-stat-command">
      <div class="cb-armoury-heading"><div><small>CHARACTER STATS</small><h3>${c.name}</h3><p>${c.race||'Veyren'} · ${c.class} · ${c.spec}</p></div><span class="cb-role-pill cb-role-${role}">${roleLabel(role)}</span></div>

      <div class="cb-stat-hero">
        <div class="cb-stat-crest"><span>${meta.icon}</span><b>${c.portrait||String(c.name||'?').slice(0,2).toUpperCase()}</b><small>LEVEL ${c.level||1}</small></div>
        <div class="cb-stat-vitals">
          <article><span>HEALTH</span><b>${health.toLocaleString()}</b><small>Maximum health</small></article>
          <article><span>ITEM LEVEL</span><b>${itemLevel}</b><small>Average equipped gear</small></article>
          <article><span>POWER</span><b>${c.power||0}</b><small>Character power</small></article>
          <article class="${shock>=75?'danger':''}"><span>CELL SHOCK</span><b>${shock}%</b><small>${shock>=100?'Unavailable':shock?'Recovering':'Ready for duty'}</small></article>
        </div>
      </div>

      <div class="cb-stat-section">
        <div class="cb-stat-section-head"><span>CORE ATTRIBUTES</span><small>Base combat profile</small></div>
        <div class="cb-stat-grid">${coreStats.map(k=>`<article><span>${k.toUpperCase()}</span><b>${stats[k]}</b></article>`).join('')}</div>
      </div>

      <div class="cb-stat-section">
        <div class="cb-stat-section-head"><span>COMBAT RATINGS</span><small>Derived from level and equipment</small></div>
        <div class="cb-stat-grid">${combatStats.map(k=>`<article><span>${k.toUpperCase()}</span><b>${stats[k]}</b></article>`).join('')}</div>
      </div>

      <div class="cb-armoury-summary cb-stat-loadout-summary">
        <div><span>SLOTS FILLED</span><b>${equipped}/14</b></div>
        <div class="${upgradeCount?'has-upgrades':''}"><span>BANK UPGRADES</span><b>${upgradeCount}</b></div>
        <div><span>PROFESSION SLOTS</span><b>${ent.professionSlots||1}</b></div>
        <div><span>ACCOUNT RULE</span><b>${ent.member?'MEMBER':'STANDARD'}</b></div>
      </div>
      <div class="cb-armoury-hint">${upgradeCount?`<strong>${upgradeCount} upgrade${upgradeCount===1?'':'s'} available</strong><span>Gold-marked equipment slots have a stronger compatible item waiting in the Guild Bank.</span>`:'<strong>Loadout current</strong><span>No higher Item Level upgrades are currently waiting in the Guild Bank.</span>'}</div>
    </section>
    <div class="cb-gear-column cb-gear-right">${rightSlots.map(s=>equipmentSlot(c,s,state)).join('')}</div>
  </div>`;
}
function possibleSlots(item){
  if(item.slot==='Trinket')return ['Trinket1','Trinket2'];
  if(item.slot==='Ring')return ['Ring1','Ring2'];
  if(item.slot==='Weapon')return ['Weapon','OffHand'];
  return [item.slot];
}
function canUse(c,item){
  const classOk=item.classes==='all'||!item.classes||item.classes.includes(c.class);
  const roleOk=!item.relicRole||roleOf(c)===item.relicRole;
  return classOk&&roleOk
}
function equippedUpgradeMax(item){
  const tier=Math.max(1,Number(item?.tier)||1),steps=({1:2,2:3,3:3,4:4})[tier]||2;
  const base=Number(item?.baseItemLevel)||Number(item?.itemLevel)||0;
  return Math.max(Number(item?.itemLevel)||0,Math.min(42,base+steps*2));
}
function equippedUpgradeCost(item){
  const tier=Math.max(1,Number(item?.tier)||1),level=Math.max(0,Number(item?.upgradeLevel)||0);
  return 4+tier*3+level*4;
}
function equippedCanUpgrade(item){return Boolean(item)&&(Number(item?.itemLevel)||0)<equippedUpgradeMax(item)}
function slotPicker(state,c,slot){
  const candidates=(state.bank||[]).filter(item=>canUse(c,item)&&possibleSlots(item).includes(slot));
  const current=c.equipment?.[slot];
  const currentIlvl=Number(current?.itemLevel)||0;
  const shards=Number(state?.materials?.['cell-shards'])||0;
  const upgradeCost=current?equippedUpgradeCost(current):0;
  const upgradeMax=current?equippedUpgradeMax(current):0;
  const nextIlvl=current?Math.min(upgradeMax,currentIlvl+2):0;
  const currentActions=current?`<div class="cb-current-actions">
    <button type="button" class="cb-unequip-btn" data-unequip-slot="${slot}">UNEQUIP TO BANK</button>
    <button type="button" class="cb-upgrade-equipped-btn" data-upgrade-equipped="${slot}" ${equippedCanUpgrade(current)&&shards>=upgradeCost?'':'disabled'}>${equippedCanUpgrade(current)?`UPGRADE TO ILVL ${nextIlvl}`:'UPGRADE CAP REACHED'}</button>
    <small>${equippedCanUpgrade(current)?`${upgradeCost} Cell Shards required · ${shards} available`:`Maximum Item Level ${upgradeMax}`}</small>
  </div>`:'';
  return `<button class="cb-slot-drawer-backdrop" data-close-slot aria-label="Close equipment drawer"></button><div class="cb-slot-drawer">
    <div class="cb-slot-drawer-head"><div><small>${slot}</small><h3>${current?.name||'Empty slot'}</h3></div><button data-close-slot>×</button></div>
    ${current?`<div class="cb-current-item ${rarityClass(current)}"><span>${G?.artHTML?.(current,56)||current.icon||slotIcons[slot]}</span><div><b>${current.name}</b><small>${current.rarity||'Starter'} · iLvl ${currentIlvl}${current.power?` · +${current.power} power`:''}${Number(current.upgradeLevel)>0?` · Upgrade ${Number(current.upgradeLevel)}`:''}</small><em class="cb-current-roll">${(G?.statLines?.(current)||[]).map(s=>s.text).join(' · ')||'Legacy roll'}</em></div></div>`:''}
    ${currentActions}
    <p>Compatible Guild Bank items</p>
    <div class="cb-slot-options">${candidates.length?candidates.sort((a,b)=>(b.itemLevel||0)-(a.itemLevel||0)).map(item=>{const delta=(Number(item.itemLevel)||0)-currentIlvl,fit=G?.rollFit?.(c,item),stats=(G?.statLines?.(item)||[]).map(s=>s.text).join(' · ')||'Legacy roll';return `<button data-equip-bank="${item.id}" data-equip-slot="${slot}" class="${rarityClass(item)}"><span>${G?.artHTML?.(item,48)||item.icon||'◇'}</span><div><b>${item.name}</b><small>${item.rarity} · iLvl ${item.itemLevel||0} · ×${item.quantity||1}</small><strong class="cb-option-roll">${stats}</strong><em class="${delta>0?'upgrade':delta<0?'downgrade':''}">${fit?.label||''}${delta===0?' · Same Item Level':delta>0?` · +${delta} Item Level`:` · ${delta} Item Level`}</em></div></button>`}).join(''):'<div class="cb-no-items">No compatible items are currently stored in the Bank.</div>'}</div>
  </div>`;
}
function totalSpent(c,spec){return Object.values(c.talents?.[spec]||{}).reduce((a,b)=>a+(Number(b)||0),0)}
function treeNodeState(c,spec,node){
  const ranks=c.talents?.[spec]||{},rank=ranks[node.id]||0,spent=totalSpent(c,spec);
  const prereq=!node.req||(ranks[node.req]||0)>0;
  const tierOk=spent>=node.tier*2;
  return {rank,available:prereq&&tierOk,complete:rank>=node.max};
}
function talentLockReason(c,spec,node,s){
  if(s.complete)return'Maximum rank reached.';
  if(node.req&&!(c.talents?.[spec]?.[node.req]>0))return'Requires '+node.req+'.';
  const spent=totalSpent(c,spec),need=node.tier*2;
  if(spent<need)return'Requires '+need+' points spent in this tree.';
  if(!(c.talent>0))return'No talent points available.';
  return'Ready to invest.';
}
function talentInspector(c,spec,node){
  if(!node)return `<aside class="cb-talent-inspector empty"><span>SELECT A TALENT</span><h3>Inspect before you spend.</h3><p>Choose any talent in the tree — including locked talents — to see its effect and requirements.</p></aside>`;
  const s=treeNodeState(c,spec,node),reason=talentLockReason(c,spec,node,s);
  const canInvest=s.available&&!s.complete&&(c.talent>0);
  const nextCopy=s.complete?'This talent is fully ranked.':node.max===1?'Spending one point unlocks this talent effect.':`Spending one point advances this talent to Rank ${s.rank+1} of ${node.max}.`;
  const combatRule=window.CellboundCombatReborn?.talents?.rules?.[node.id]||node.desc;
  return `<aside class="cb-talent-inspector ${canInvest?'investable':''}">
    <div class="cb-talent-inspector-head"><span class="cb-inspector-icon">${node.icon}</span><div><small>TIER ${node.tier+1} · ${spec.toUpperCase()}</small><h3>${node.id}</h3><p>Rank ${s.rank} / ${node.max}</p></div></div>
    <section><small>COMBAT EFFECT</small><p>${combatRule}</p></section>
    <section><small>NEXT INVESTMENT</small><p>${nextCopy} Each point also grants <b>+1 Power</b>.</p></section>
    <div class="cb-talent-requirements">
      <div><span>Tree requirement</span><b>${node.tier?node.tier*2+' points spent':'Available from Tier 1'}</b></div>
      <div><span>Prerequisite</span><b>${node.req||'None'}</b></div>
      <div><span>Status</span><b class="${canInvest?'ready':''}">${reason}</b></div>
    </div>
    <button class="cb-invest-talent" data-invest-talent="${node.id}" data-tree-spec="${spec}" ${canInvest?'':'disabled'}>${s.complete?'MAXIMUM RANK':canInvest?'SPEND 1 TALENT POINT':'UNAVAILABLE'}</button>
  </aside>`;
}
function talentTree(c,spec){
  const nodes=trees[c.class]?.[spec]||[];
  const spent=totalSpent(c,spec);
  let selected=nodes.find(n=>n.id===selectedTalentId&&selectedTalentSpec===spec);
  if(!selected)selected=nodes[0]||null;
  if(selected){selectedTalentId=selected.id;selectedTalentSpec=spec}
  return `<div class="cb-tree-shell">
    <div class="cb-tree-head"><div><small>${c.class}</small><h3>${spec}</h3><p>${roleLabel(specs[c.class]?.[spec]||'dps')} specialisation · Select a talent to inspect it before investing.</p></div><div class="cb-tree-head-actions">${spec!==c.spec?`<button data-activate-spec="${spec}">SET ${spec.toUpperCase()} ACTIVE<small>Removes this character from the active party</small></button>`:''}<div class="cb-tree-points"><b>${c.talent||0}</b><span>points available</span><small>${spent} spent in tree</small></div></div></div>
    <div class="cb-tree-layout">
      <div class="cb-tree-grid">${[0,1,2,3,4].map(tier=>`<div class="cb-tier-line" style="--tier:${tier}"><span>Tier ${tier+1}</span></div>`).join('')}${nodes.map(node=>{const s=treeNodeState(c,spec,node),isSelected=selected?.id===node.id;return `<button class="cb-talent-node ${s.available?'available':'locked'} ${s.complete?'complete':''} ${isSelected?'selected':''}" style="--tier:${node.tier};--col:${node.col}" data-talent-node="${node.id}" data-tree-spec="${spec}" aria-pressed="${isSelected?'true':'false'}"><span class="cb-node-icon">${node.icon}</span><b>${node.id}</b><em>${s.rank}/${node.max}</em></button>`}).join('')}</div>
      ${talentInspector(c,spec,selected)}
    </div>
  </div>`;
}
function knowledgePanel(c){return `<div class="cb-mastery-intro"><small>ENCOUNTER MASTERY</small><h3>Experience, not hidden power.</h3><p>Mastery records how much this adventurer has experienced an encounter. It can support journals, achievements and future cosmetic rewards, but it does not alter damage, healing, survivability, interrupts or mechanic success.</p></div><div class="cb-knowledge-grid">${Object.entries(c.knowledge||{}).map(([id,val])=>`<article><div><span>${id.replace(/([a-z])([A-Z])/g,'$1 $2')}</span><b>${val}%</b></div><div class="cb-knowledge-bar"><i style="width:${val}%"></i></div></article>`).join('')}</div>`}
function specTabs(c){const browsing=selectedTreeSpec&&specs[c.class]?.[selectedTreeSpec]?selectedTreeSpec:c.spec;return Object.keys(specs[c.class]||{}).map(spec=>`<button class="cb-spec-tab ${browsing===spec?'active':''}" data-spec-tab="${spec}">${spec}<small>${roleLabel(specs[c.class][spec])}${c.spec===spec?' · ACTIVE':''}</small></button>`).join('')}
function combatIdentityPanel(c){
  const info=I?.summary?.(c),race=info?.race,spec=info?.spec;
  if(!race||!spec)return'';
  return '<section class="cb-profile-panel cb-identity-panel"><h3>Combat Identity</h3><div class="cb-identity-grid"><article><small>RACE · '+escHtml(race.name)+'</small><b>'+escHtml(race.trait)+'</b><p>'+escHtml(race.strength)+'</p><em>Trade-off: '+escHtml(race.tradeoff)+'</em></article><article><small>'+escHtml(c.class)+' · '+escHtml(c.spec)+'</small><b>'+escHtml(spec.title)+'</b><p>'+escHtml(spec.strength)+'</p><em>Trade-off: '+escHtml(spec.tradeoff)+'</em></article></div></section>';
}
function escHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function overviewPanel(c,state){
  const meta=classMeta[c.class]||{primary:'Strength'},stats=statBlock(c),role=roleLabel(roleOf(c));
  const ilvl=window.CellboundGame?.characterItemLevel?.(c)||c.gear||0;
  const active=[state?.party?.tank,state?.party?.healer,...(state?.party?.dps||[])].includes(c.id);
  const avg=Object.values(c.knowledge||{});const knowledge=avg.length?Math.round(avg.reduce((a,b)=>a+(Number(b)||0),0)/avg.length):0;
  return `<div class="cb-profile-overview"><section class="cb-profile-panel"><h3>Adventurer Overview</h3><div class="cb-profile-stats"><div><span>Role</span><b>${role}</b></div><div><span>Item Level</span><b>${ilvl}</b></div><div><span>Cell Shock</span><b>${Math.round(c.cellShock||0)}%</b></div><div><span>Mastery</span><b>${knowledge}%</b></div><div><span>${meta.primary}</span><b>${stats[meta.primary]}</b></div><div><span>Stamina</span><b>${stats.Stamina}</b></div><div><span>Armour</span><b>${stats.Armour}</b></div><div><span>Status</span><b>${active?'Active Five':'Reserve'}</b></div></div><p>${c.name} is a Level ${c.level} ${c.race||'Veyren'} ${c.class} specialising in ${c.spec}. Level, gear, class, talents and equipped skills determine combat performance. Mastery is a record of experience and does not grant combat power.</p></section><section class="cb-profile-panel"><h3>Current Loadout</h3>${['Head','Chest','Weapon'].map(slot=>{const item=c.equipment?.[slot];return `<div class="cb-history-entry"><b>${slot}</b><br>${item?.name||'Empty'} · iLvl ${item?.itemLevel||0}</div>`}).join('')}</section>${combatIdentityPanel(c)}</div>`;
}
function skillsPanel(c){
  const engine=combatEngine(),spec=c.spec,role=roleOf(c),pool=skillPoolFor(c,spec),level=Math.max(1,Number(c.level)||1),equipped=equippedSkillIds(c,spec),selected=Math.max(0,Math.min(3,Number(activeSkillSlot)||0));
  const byId=new Map(pool.map(s=>[s.id,s])),buff=engine?.CLASS_BUFFS?.[c.class]||null;
  const unlockedCount=pool.filter(s=>skillAvailable(c,s,spec)).length,nextUnlock=pool.filter(s=>(Number(s.unlockLevel)||1)>level).sort((a,b)=>(a.unlockLevel||1)-(b.unlockLevel||1))[0];
  const slotCards=equipped.map((id,i)=>{
    const skill=byId.get(id);
    return '<button type="button" class="cb-skill-slot '+(i===selected?'active ':'')+(skill?'filled':'empty')+'" data-skill-slot="'+i+'"><small>SLOT '+(i+1)+'</small><i>'+skillIcon(skill?.kind)+'</i><span><b>'+escHtml(skill?.name||'Empty Skill Slot')+'</b><em>'+(skill?skillKindLabel(skill.kind)+' · '+skillCooldownText(skill):'Tap this slot, then choose a skill')+'</em></span></button>'
  }).join('');
  const library=pool.slice().sort((a,b)=>{
    const al=skillAvailable(c,a,spec)?0:1,bl=skillAvailable(c,b,spec)?0:1;
    return al-bl||(Number(a.unlockLevel)||1)-(Number(b.unlockLevel)||1)||String(a.name).localeCompare(String(b.name))
  }).map(skill=>{
    const unlock=Math.max(1,Number(skill.unlockLevel)||1),levelLocked=unlock>level,talentLocked=!skillTalentMet(c,skill,spec),locked=levelLocked||talentLocked,slot=equipped.indexOf(skill.id),isEquipped=slot>=0;
    const cost=Number(skill.cost)||0,range=Number(skill.range)||0,lockTitle=talentLocked?'REQUIRES '+String(skill.talentReq||'TALENT').toUpperCase():'LEVEL '+unlock,lockCopy=talentLocked?'Learn the '+skill.talentReq+' talent to use this skill.':'Unlocks as this character levels up.';
    return '<article class="cb-skill-card kind-'+escHtml(skill.kind)+' '+(locked?'locked ':'')+(isEquipped?'equipped':'')+'">'+
      '<div class="cb-skill-card-icon">'+skillIcon(skill.kind)+'</div><div class="cb-skill-card-copy"><div><small>'+skillKindLabel(skill.kind)+'</small><h4>'+escHtml(skill.name)+'</h4></div><p>'+escHtml(skill.desc||'Combat skill.')+'</p>'+
      '<div class="cb-skill-meta"><span>'+skillCooldownText(skill)+'</span>'+(cost?'<span>Cost '+cost+'</span>':'')+(range?'<span>Range '+range+'</span>':'')+'</div></div>'+
      (locked?'<div class="cb-skill-lock"><b>'+escHtml(lockTitle)+'</b><span>'+escHtml(lockCopy)+'</span></div>':'<button type="button" class="cb-skill-equip '+(isEquipped?'equipped':'')+'" data-equip-skill="'+escHtml(skill.id)+'">'+(isEquipped?'MOVE TO SLOT '+(selected+1):'EQUIP TO SLOT '+(selected+1))+'</button>')+
    '</article>'
  }).join('');
  const buffEffect=buff?Object.entries(buff.effect||{}).map(([key,value])=>{
    const labels={outgoingDamage:'Damage',incomingDamageReduction:'Damage taken reduction',resourceRegen:'Resource regeneration',haste:'Haste',critBonus:'Critical chance',threatBonus:'Threat',outgoingHealing:'Healing done',incomingHealing:'Healing received'};
    return (labels[key]||key)+' '+(key==='incomingDamageReduction'?'−':'+')+Math.round(Number(value)*100)+'%'
  }).join(' · '):'No class buff configured.';
  return '<div class="cb-skills-screen">'+
   '<section class="cb-skills-hero"><div><small>COMBAT LOADOUT · '+escHtml(spec.toUpperCase())+'</small><h3>4 Skills + 1 Class Buff</h3><p>Only these four skills enter Combat Reborn. Removing an interrupt, taunt, heal or defensive really removes it from the character’s dungeon toolkit.</p></div><div class="cb-skill-progress"><span>UNLOCKED</span><b>'+unlockedCount+' / '+pool.length+'</b><small>'+(nextUnlock?'Next: '+escHtml(nextUnlock.name)+' at Level '+nextUnlock.unlockLevel:'All current skills unlocked')+'</small></div></section>'+
   '<section class="cb-loadout-panel"><div class="cb-loadout-head"><div><small>ACTIVE SKILLS</small><h4>Select a slot, then choose a skill.</h4></div><button type="button" data-reset-skills>RESET DEFAULTS</button></div><div class="cb-skill-slots">'+slotCards+'</div><div class="cb-slot-actions"><span>Editing Slot '+(selected+1)+'</span>'+(equipped[selected]?'<button type="button" data-clear-skill="'+selected+'">CLEAR SLOT '+(selected+1)+'</button>':'<em>Slot '+(selected+1)+' is empty</em>')+'</div></section>'+
   '<section class="cb-buff-slot-panel"><div class="cb-buff-slot-icon">▲</div><div><small>DEDICATED BUFF SLOT</small><h4>'+escHtml(buff?.name||'No Class Buff')+'</h4><p>'+escHtml(buffEffect)+'</p></div><strong>'+(buff?Math.round((buff.duration||60000)/1000)+'s ACTIVE · '+Math.round((buff.cooldown||180000)/60000)+'m CD':'UNAVAILABLE')+'</strong></section>'+
   '<section class="cb-skill-library"><div class="cb-skill-library-head"><div><small>AVAILABLE SKILLS</small><h4>'+escHtml(c.class)+' · '+escHtml(spec)+'</h4></div><span>Level '+level+'</span></div><div class="cb-skill-grid">'+library+'</div></section>'+
  '</div>'
}
function professionsPanel(c){
  const ent=window.CellboundGame?.getEntitlements?.()||{professionSlots:1,member:false};
  return `<div class="cb-profession-profile">${[0,1].map(i=>{const p=c.professions?.[i],locked=i>=ent.professionSlots;return `<article><small>PROFESSION ${i+1}</small><b>${locked?'Membership Slot':p?.name||'Unlearned'}</b><span>${locked?'Unlocks with membership':p?`Skill ${p.level}/100`:'Visit Professions to learn a trade.'}</span></article>`}).join('')}</div>`;
}
function historyPanel(c,state){
  const entries=(state?.activity||[]).filter(x=>String(x).includes(c.name)).slice(-14).reverse();
  const reports=(state?.reports||[]).filter(r=>(r.knowledgeGain||[]).some(k=>k.name===c.name)).slice(0,6);
  return `<div class="cb-character-history">${entries.map(x=>`<div class="cb-history-entry"><b>Guild Record</b><br>${x}</div>`).join('')}${reports.map(r=>`<div class="cb-history-entry"><b>${r.success?'Victory':'Wipe'} · ${new Date(r.at).toLocaleDateString()}</b><br>Party iLvl ${Math.round(r.partyItemLevel||0)} · Mastery gained ${r.knowledgeGain.find(k=>k.name===c.name)?.gain||0}%.</div>`).join('')||(!entries.length?'<div class="cb-no-items">No notable history recorded yet.</div>':'')}</div>`;
}
function sheetBody(state,c){
  if(currentTab==='overview')return overviewPanel(c,state);
  if(currentTab==='equipment')return `${paperDoll(c,state)}${activeSlot?slotPicker(state,c,activeSlot):''}`;
  if(currentTab==='talents'){const treeSpec=selectedTreeSpec&&specs[c.class]?.[selectedTreeSpec]?selectedTreeSpec:c.spec;return `<div class="cb-spec-tabs">${specTabs(c)}</div>${talentTree(c,treeSpec)}`}
  if(currentTab==='skills')return skillsPanel(c);
  if(currentTab==='professions')return professionsPanel(c);
  if(currentTab==='history')return historyPanel(c,state);
  return knowledgePanel(c);
}
function renderSheet(){
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));
  if(!state||!c)return;
  const editable=characterEditable(),meta=classMeta[c.class]||{icon:'◇',accent:'#58d7cf'};
  const roles=[...new Set(Object.values(specs[c.class]||{}).map(roleLabel))].join(' / ');
  detail.innerHTML=`<div class="cb-sheet ${editable?'':'member-slot-locked'}" style="--cb-accent:${meta.accent}">
    <header class="cb-sheet-header"><div class="cb-header-crest">${meta.icon}</div><div><small>LEVEL ${c.level} · ${roles}</small><h2>${c.name}</h2><p>${c.race||'Veyren'} · ${c.class} · ${c.spec} · Power ${c.power} · Gear ${c.gear}</p></div><div class="cb-header-points"><b>${c.talent||0}</b><span>Talent points</span></div></header>
    ${editable?'':'<div class="cb-membership-lock-banner"><b>MEMBERSHIP SLOT LOCKED</b><span>This adventurer is safely stored. You can inspect everything, but equipment, talents, skills, specialisation and progression are read-only until membership returns.</span></div>'}
    <nav class="cb-character-tabs"><button data-sheet-tab="overview" class="${currentTab==='overview'?'active':''}">Overview</button><button data-sheet-tab="equipment" class="${currentTab==='equipment'?'active':''}">Equipment</button><button data-sheet-tab="talents" class="${currentTab==='talents'?'active':''}">Talents</button><button data-sheet-tab="skills" class="${currentTab==='skills'?'active':''}">Skills</button><button data-sheet-tab="professions" class="${currentTab==='professions'?'active':''}">Professions</button><button data-sheet-tab="knowledge" class="${currentTab==='knowledge'?'active':''}">Mastery</button><button data-sheet-tab="history" class="${currentTab==='history'?'active':''}">History</button></nav>
    <main class="cb-sheet-body">${sheetBody(state,c)}</main>
  </div>`;
  modal.hidden=false;
}
function removeFromParty(state,id){
  if(!state.party)return;
  if(state.party.tank===id)state.party.tank=null;
  if(state.party.healer===id)state.party.healer=null;
  if(Array.isArray(state.party.dps))state.party.dps=state.party.dps.map(x=>x===id?null:x);
}
function equipItem(bankId,slot){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId)),item=state?.bank?.find(x=>x.id===bankId);
  if(!state||!c||!item||!canUse(c,item))return;
  const old=c.equipment[slot];
  if(old){
    c.gear=Math.max(0,(c.gear||0)-(old.power||0));
    c.power=Math.max(1,(c.power||1)-(old.power||0));
    if(old.name&&old.name!=='Empty')state.bank.push({...old,id:`bank-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,quantity:1,source:`Unequipped from ${c.name}`,classes:old.classes||[c.class],slot:old.slot==='Trinket1'||old.slot==='Trinket2'?'Trinket':old.slot});
  }
  const canonical=window.CellboundGame?.canonicalItem?.(item)||item;
  c.equipment[slot]={...canonical,slot:canonical.slot||slot,source:'Equipped'};
  c.gear=(c.gear||0)+(canonical.power||0);
  c.power=(c.power||0)+(item.power||0);
  item.quantity=(item.quantity||1)-1;
  if(item.quantity<=0)state.bank=state.bank.filter(x=>x.id!==bankId);
  state.activity=state.activity||[];
  state.activity.push(`${c.name} equipped ${item.name} from the Guild Bank.`);
  writeState(state);activeSlot=null;renderSheet();window.CellboundFX?.micro?.(item.name+' equipped','gold');window.CellboundFX?.pulse?.('.cb-current-item');
}
function unequipItem(slot){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId)),item=c?.equipment?.[slot];
  if(!state||!c||!item)return;
  state.bank=Array.isArray(state.bank)?state.bank:[];
  const returned={...item,id:`bank-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,quantity:1,source:`Unequipped from ${c.name}`,slot:item.slot==='Trinket1'||item.slot==='Trinket2'?'Trinket':item.slot==='Ring1'||item.slot==='Ring2'?'Ring':item.slot};
  state.bank.push(returned);
  c.equipment[slot]=null;
  c.power=Math.max(1,(Number(c.power)||1)-(Number(item.power)||0));
  c.gearItems=[...leftSlots,...rightSlots].map(s=>c.equipment?.[s]?.name||'Empty');
  c.gear=window.CellboundGame?.characterItemLevel?.(c)||0;
  state.activity=state.activity||[];
  state.activity.push(`${c.name} unequipped ${item.name} to the Guild Bank.`);
  writeState(state);activeSlot=null;renderSheet();window.CellboundFX?.micro?.(item.name+' returned to the Guild Bank','cell');
}
function upgradeEquippedItem(slot){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId)),item=c?.equipment?.[slot];
  if(!state||!c||!item||!equippedCanUpgrade(item))return;
  state.materials=state.materials&&typeof state.materials==='object'?state.materials:{};
  const available=Number(state.materials['cell-shards'])||0,cost=equippedUpgradeCost(item),beforeIlvl=Number(item.itemLevel)||0,next=Math.min(equippedUpgradeMax(item),beforeIlvl+2);
  if(available<cost){alert(`You need ${cost} Cell Shards. You currently have ${available}.`);return}
  if(!confirm(`Upgrade ${item.name} from Item Level ${beforeIlvl} to ${next} for ${cost} Cell Shards?`))return;
  const oldPower=Number(item.power)||0;
  item.baseItemLevel=Number(item.baseItemLevel)||beforeIlvl;
  item.itemLevel=next;
  item.upgradeLevel=(Number(item.upgradeLevel)||0)+1;
  if(item.upgradeLevel%2===0)item.power=oldPower+1;
  c.power=Math.max(1,(Number(c.power)||1)+(Number(item.power)||0)-oldPower);
  c.gear=window.CellboundGame?.characterItemLevel?.(c)||0;
  c.gearItems=[...leftSlots,...rightSlots].map(s=>c.equipment?.[s]?.name||'Empty');
  state.materials['cell-shards']=available-cost;
  state.activity=state.activity||[];
  state.activity.push(`Upgraded ${c.name}'s equipped ${item.name} to Item Level ${item.itemLevel} for ${cost} Cell Shards.`);
  writeState(state);renderSheet();window.CellboundFX?.callout?.({eyebrow:'ITEM UPGRADED',title:item.name+' · Item Level '+item.itemLevel,tone:'gold'});window.CellboundFX?.flash?.('gold');
}
function investTalent(spec,nodeId){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));
  if(!state||!c||!(c.talent>0))return;
  const node=(trees[c.class]?.[spec]||[]).find(n=>n.id===nodeId);if(!node)return;
  const s=treeNodeState(c,spec,node);if(!s.available||s.complete)return;
  c.talents[spec][node.id]=(c.talents[spec][node.id]||0)+1;
  c.talent--;c.power=(c.power||0)+1;
  state.activity=state.activity||[];state.activity.push(`${c.name} invested a point in ${spec}: ${node.id}.`);
  writeState(state);renderSheet();window.CellboundFX?.callout?.({eyebrow:'TALENT LEARNED',title:node.id,tone:'arcane'});window.CellboundFX?.flash?.('arcane');
}
function changeSpec(spec){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));
  if(!state||!c||!specs[c.class]?.[spec]||c.spec===spec)return;
  c.spec=spec;selectedTreeSpec=spec;selectedTalentId=null;selectedTalentSpec=spec;activeSkillSlot=0;
  state.activity=state.activity||[];state.activity.push(`${c.name} changed specialisation to ${spec} (${roleLabel(roleOf(c))}). Active-party role updated automatically.`);
  writeState(state);renderSheet();window.CellboundFX?.quest?.({eyebrow:'SPECIALISATION CHANGED',title:spec,copy:roleLabel(roleOf(c))+' role is now active for this character.',tone:'story',duration:1250});
}
function saveSkillLoadout(mutator,activity){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));if(!state||!c)return;
  const spec=c.spec,loadout=equippedSkillIds(c,spec);mutator(loadout,c);
  c.skillLoadouts[spec]=loadout.slice(0,4);while(c.skillLoadouts[spec].length<4)c.skillLoadouts[spec].push(null);
  if(activity){state.activity=state.activity||[];state.activity.push(activity(c))}
  writeState(state);renderSheet()
}
function equipSkill(skillId){
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));if(!state||!c)return;
  const pool=skillPoolFor(c,c.spec),skill=pool.find(s=>s.id===skillId);if(!skill||!skillAvailable(c,skill,c.spec))return;
  const slot=Math.max(0,Math.min(3,Number(activeSkillSlot)||0));
  activeSkillSlot=(slot+1)%4;
  saveSkillLoadout((loadout,ch)=>{
    const existing=loadout.indexOf(skillId),previous=loadout[slot]||null;
    if(existing>=0&&existing!==slot)loadout[existing]=previous;
    loadout[slot]=skillId
  },ch=>ch.name+' equipped '+skill.name+' in combat skill slot '+(slot+1)+'.')
}
function clearSkillSlot(slotIndex){
  const slot=Math.max(0,Math.min(3,Number(slotIndex)||0));
  saveSkillLoadout(loadout=>{loadout[slot]=null},c=>c.name+' cleared combat skill slot '+(slot+1)+'.');
  activeSkillSlot=slot
}
function resetSkills(){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));if(!state||!c)return;
  const ids=defaultSkillIds(c,c.spec);while(ids.length<4)ids.push(null);c.skillLoadouts[c.spec]=ids.slice(0,4);
  state.activity=state.activity||[];state.activity.push(c.name+' reset '+c.spec+' combat skills to the recommended defaults.');
  activeSkillSlot=0;writeState(state);renderSheet()
}
function openCharacter(id){document.body.classList.add('character-sheet-open');currentId=id;currentTab='overview';activeSlot=null;activeSkillSlot=0;selectedTalentId=null;selectedTalentSpec=null;selectedTreeSpec=null;renderSheet()}
function closeCharacter(){
  modal.hidden=true;document.body.classList.remove('character-sheet-open');activeSlot=null;
  const game=window.CellboundGame,next=dirty?readState():null;
  if(dirty&&next&&game?.replaceState){game.replaceState(next);dirty=false}
  else if(dirty){game?.renderAll?.();dirty=false}
  if(game?.switchView)game.switchView('roster');
  else document.querySelector('[data-view="roster"]')?.click()
}

document.addEventListener('click',event=>{
  const charBtn=event.target.closest('[data-char]');
  if(charBtn){event.preventDefault();event.stopImmediatePropagation();openCharacter(charBtn.dataset.char);return}
  if(!modal.hidden){
    const tab=event.target.closest('[data-sheet-tab]');if(tab){currentTab=tab.dataset.sheetTab;activeSlot=null;renderSheet();return}
    const skillSlot=event.target.closest('[data-skill-slot]');if(skillSlot){activeSkillSlot=Math.max(0,Math.min(3,Number(skillSlot.dataset.skillSlot)||0));renderSheet();return}
    const equipSkillBtn=event.target.closest('[data-equip-skill]');if(equipSkillBtn){equipSkill(equipSkillBtn.dataset.equipSkill);return}
    const clearSkill=event.target.closest('[data-clear-skill]');if(clearSkill){clearSkillSlot(clearSkill.dataset.clearSkill);return}
    const resetSkill=event.target.closest('[data-reset-skills]');if(resetSkill){resetSkills();return}
    const slot=event.target.closest('[data-slot]');if(slot){activeSlot=slot.dataset.slot;renderSheet();return}
    const closeSlot=event.target.closest('[data-close-slot]');if(closeSlot){activeSlot=null;renderSheet();return}
    const unequip=event.target.closest('[data-unequip-slot]');if(unequip){unequipItem(unequip.dataset.unequipSlot);return}
    const upgradeEquipped=event.target.closest('[data-upgrade-equipped]');if(upgradeEquipped){upgradeEquippedItem(upgradeEquipped.dataset.upgradeEquipped);return}
    const equip=event.target.closest('[data-equip-bank]');if(equip){equipItem(equip.dataset.equipBank,equip.dataset.equipSlot);return}
    const node=event.target.closest('[data-talent-node]');if(node){selectedTalentId=node.dataset.talentNode;selectedTalentSpec=node.dataset.treeSpec;renderSheet();return}
    const invest=event.target.closest('[data-invest-talent]');if(invest){investTalent(invest.dataset.treeSpec,invest.dataset.investTalent);return}
    const spec=event.target.closest('[data-spec-tab]');if(spec){selectedTreeSpec=spec.dataset.specTab;selectedTalentId=null;selectedTalentSpec=selectedTreeSpec;renderSheet();return}
    const activateSpec=event.target.closest('[data-activate-spec]');if(activateSpec){changeSpec(activateSpec.dataset.activateSpec);return}
    const close=event.target.closest('[data-close]');if(close){event.preventDefault();event.stopImmediatePropagation();closeCharacter();return}
  }
},true);
modal.addEventListener('click',event=>{if(event.target===modal){event.preventDefault();event.stopImmediatePropagation();closeCharacter()}},true);
})();