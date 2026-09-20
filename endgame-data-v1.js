(()=>{
'use strict';

const VERSION=1;
const SEASON={id:'foundations-1',name:'Foundations'};

const AFFIXES={
 'volatile-cells':{
   id:'volatile-cells',name:'Volatile Cells',tier:'minor',
   description:'Elite enemies erupt shortly after death, damaging anyone who fails to move away.'
 },
 'blood-moon':{
   id:'blood-moon',name:'Blood Moon',tier:'major',
   description:'Enemies below 30% health become more dangerous and deal increased damage.'
 },
 necromantic:{
   id:'necromantic',name:'Necromantic',tier:'minor',
   description:'Certain non-boss enemies return once at reduced health unless the group finishes the pack quickly.'
 },
 relentless:{
   id:'relentless',name:'Relentless',tier:'minor',
   description:'Nearby enemies briefly become stronger when one of their allies dies.'
 },
 'unstable-ground':{
   id:'unstable-ground',name:'Unstable Ground',tier:'major',
   description:'Periodic hazardous zones appear during combat and force the party to keep repositioning.'
 },
 overflow:{
   id:'overflow',name:'Overflow',tier:'major',
   description:'Overhealing grants temporary protection but places extra pressure on healer resources.'
 }
};

const DIFFICULTIES={
 normal:{
   id:'normal',name:'Normal',label:'NORMAL',
   description:'Forgiving introduction to the dungeon. Learn the route, bosses and core mechanics.',
   enemyHealth:1,enemyDamage:1,castSpeed:1,mechanicFrequency:1,addCountBonus:0,
   lootTier:[1,2],cellShardBase:4
 },
 heroic:{
   id:'heroic',name:'Heroic',label:'HEROIC',
   description:'Faster casts, heavier damage and additional encounter mechanics.',
   enemyHealth:1.42,enemyDamage:1.34,castSpeed:.84,mechanicFrequency:.84,addCountBonus:0,
   lootTier:[2,3],cellShardBase:10
 }
};

const DUNGEONS={
 'ashen-vault':{
   id:'ashen-vault',name:'The Ashen Vault',version:2,theme:'Ashbound Forge',
   faction:'Ashbound Cult',levelRange:[3,5],normalItemLevel:18,heroicItemLevel:22,cellboundItemLevel:24,
   timerMs:12*60*1000,
   identity:'Fire, forge hazards, add control and interrupt pressure.',
   bosses:[
     {id:'ashwarden',name:'Ash Warden Kael',signature:'Frontal control and Cinder Guard adds.'},
     {id:'embermaw',name:'Embermaw',signature:'Group damage, interrupts and fiery positioning.'},
     {id:'vaultheart',name:'The Vaultheart',signature:'Multi-mechanic final encounter and add pressure.'}
   ],
   heroicAdds:{
     kael:[{name:'Cinder Mend',type:'interrupt',duration:1500},{name:'Falling Embers',type:'circle',duration:1500}],
     embermaw:[{name:'Scorching Wake',type:'circles',duration:1500}],
     vaultheart:[{name:'Heartfire Surge',type:'interrupt',duration:1500},{name:'Molten Fracture',type:'circles',duration:1500}]
   },
   lootTable:['warrior-t2-head','warrior-t2-weapon','warrior-t3-chest','frostbound-sigil','guardian-last-stand'],
   bossDrops:{ashwarden:['warrior-t2-head','frostbound-sigil'],embermaw:['warrior-t2-weapon'],vaultheart:['warrior-t3-chest','guardian-last-stand']},
   chase:['cellbound-emberwing','ancient-vault-cell']
 },
 'hollow-sanctum':{
   id:'hollow-sanctum',name:'The Hollow Sanctum',version:2,theme:'Cellglass Catacomb',
   faction:'The Hollowed',levelRange:[6,8],normalItemLevel:24,heroicItemLevel:28,cellboundItemLevel:30,
   timerMs:15*60*1000,
   identity:'Resonance hazards, line attacks, glass adds and movement discipline.',
   bosses:[
     {id:'gallery',name:'Gallery of Echoes',signature:'Pulse damage and dangerous packs.'},
     {id:'sentinel',name:'Glassjaw Sentinel',signature:'Fracture lines and frontal pressure.'},
     {id:'choir',name:'The Bound Choir',signature:'Resonance zones, interrupts and add control.'}
   ],
   heroicAdds:{
     sentinel:[{name:'Shatterstep',type:'circles',duration:1350}],
     choir:[{name:'Discordant Mend',type:'interrupt',duration:1450},{name:'Glass Rain',type:'circles',duration:1450}]
   },
   lootTable:['priest-t3-chest','hunter-t3-weapon','mage-t3-weapon','embercore-staff','heart-troll-king'],
   bossDrops:{gallery:['priest-t3-chest'],sentinel:['hunter-t3-weapon'],choir:['mage-t3-weapon','embercore-staff','heart-troll-king']},
   chase:['hollow-glassling','corrupted-choir-cell']
 }
};

const UNIQUE_ITEMS={
 'frostbound-sigil':{
   itemId:'frostbound-sigil',name:'Frostbound Sigil',slot:'Relic',classes:'all',tier:4,rarity:'Epic',
   itemLevel:32,power:8,questArtMaterial:'void-crystal',
   uniqueEffect:{id:'frostbound-sigil',name:'Frozen Response',description:'Successful interrupts grant a short defensive shield.'},
   source:'Ash Warden Kael · Heroic / Cellbound+'
 },
 'guardian-last-stand':{
   itemId:'guardian-last-stand',name:"Guardian's Last Stand",slot:'Trinket1',classes:['Warrior','Paladin','Death Knight','Demon Hunter','Druid'],tier:4,rarity:'Epic',
   itemLevel:34,power:9,questArtMaterial:'warden-iron',
   uniqueEffect:{id:'guardian-last-stand',name:'Last Stand',description:'Dropping below 20% health automatically triggers a powerful defensive once per encounter.'},
   source:'The Vaultheart · Heroic / Cellbound+'
 },
 'embercore-staff':{
   itemId:'embercore-staff',name:'Embercore Staff',slot:'Weapon',classes:['Mage'],tier:4,rarity:'Epic',
   itemLevel:36,power:12,questArtMaterial:'ashen-soul-fragment',
   uniqueEffect:{id:'embercore-staff',name:'Living Ember',description:'Fire and arcane attacks can splash additional damage into a nearby enemy.'},
   source:'The Bound Choir · Cellbound+'
 },
 'heart-troll-king':{
   itemId:'heart-troll-king',name:'Heart of the Troll King',slot:'Trinket1',classes:'all',tier:4,rarity:'Epic',
   itemLevel:35,power:10,questArtMaterial:'faded-cell-fragment',
   uniqueEffect:{id:'heart-troll-king',name:'Blood Frenzy',description:'Critical strikes can trigger a short burst of increased damage.'},
   source:'Rare endgame boss drop'
 }
};

const CHASE_REWARDS={
 'cellbound-emberwing':{id:'cellbound-emberwing',kind:'mount',name:'Cellbound Emberwing',rarity:'Legendary',baseDropRate:.004},
 'ancient-vault-cell':{id:'ancient-vault-cell',kind:'cell',name:'Ancient Vault Cell',rarity:'Legendary',baseDropRate:.007},
 'hollow-glassling':{id:'hollow-glassling',kind:'pet',name:'Hollow Glassling',rarity:'Legendary',baseDropRate:.006},
 'corrupted-choir-cell':{id:'corrupted-choir-cell',kind:'cell',name:'Corrupted Choir Cell',rarity:'Legendary',baseDropRate:.008}
};

function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function difficultyConfig(mode='normal',tier=0){
 const base=DIFFICULTIES[mode]||DIFFICULTIES.normal;
 if(mode!=='cellbound')return{...base,tier:0};
 const t=clamp(Number(tier)||1,1,20);
 return{
   id:'cellbound',name:'Cellbound+'+t,label:'CELLBOUND+'+t,tier:t,
   description:'Scalable endgame difficulty. Better execution, strategy and party preparation are required.',
   enemyHealth:1.48*(1+(t-1)*.075),
   enemyDamage:1.38*(1+(t-1)*.06),
   castSpeed:clamp(.82-(t-1)*.012,.57,.82),
   mechanicFrequency:clamp(.82-(t-1)*.012,.58,.82),
   addCountBonus:t>=15?2:t>=8?1:0,
   lootTier:t>=10?[3,4]:t>=5?[2,3]:[2,3],
   cellShardBase:12+t*2
 }
}
function affixesForTier(tier,rotation={}){
 const t=Number(tier)||0;if(t<5)return[];
 const out=[];if(rotation.minor_affix)out.push(rotation.minor_affix);
 if(t>=10&&rotation.major_affix)out.push(rotation.major_affix);
 if(t>=15)out.push('relentless');
 return [...new Set(out)].filter(x=>AFFIXES[x])
}
function scorePreview({difficulty='normal',tier=0,timeMs=0,targetTimeMs=0,deaths=0,mechanicsFailed=0,mistakes=0}={}){
 const base=difficulty==='normal'?180:difficulty==='heroic'?360:500+(Number(tier)||1)*95;
 const timeBonus=difficulty==='cellbound'
   ?clamp(Math.round(((Number(targetTimeMs)||0)-(Number(timeMs)||0))/1000)*4,-120,300)
   :Math.max(0,180-Math.round((Number(timeMs)||0)/1000));
 return Math.max(0,base+timeBonus-(Number(deaths)||0)*50-(Number(mechanicsFailed)||0)*22-(Number(mistakes)||0)*8)
}
function rewardBand(mode,tier=0){
 if(mode==='normal')return{label:'Starter progression',powerCap:28};
 if(mode==='heroic')return{label:'Improved dungeon gear',powerCap:34};
 if(tier<5)return{label:'Upgrade materials + strong gear',powerCap:36};
 if(tier<10)return{label:'High-quality dungeon gear',powerCap:40};
 return{label:'Best dungeon power + prestige rewards',powerCap:42}
}
window.CellboundEndgameData={VERSION,SEASON,AFFIXES,DIFFICULTIES,DUNGEONS,UNIQUE_ITEMS,CHASE_REWARDS,difficultyConfig,affixesForTier,scorePreview,rewardBand};
})();