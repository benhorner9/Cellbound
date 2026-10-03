const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

function load(file){
  const sandbox={window:{},console,Math,Date};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
  return sandbox.window;
}

const balance=load('balance-v1.js').CellboundBalance;
assert(balance,'balance contract loads');
assert.equal(balance.PLAYER_LEVEL_CAP,15);
assert.equal(balance.xpToReachLevel(15),33950,'Level 1 to 15 XP budget is stable');
assert.deepEqual(
  [1,2,3,4].map(balance.fourfoldKeyChance),
  [.35,.60,.85,1],
  'Fourfold keys are guaranteed by the fourth eligible clear'
);
assert.equal(balance.SHIPWRIGHT_KIT_COST,1000,'No Way Back repair cost stays recoverable');
assert.equal(balance.PVE_WIPE_CELL_SHOCK,25,'four full wipes trigger recovery lock');
assert.equal(balance.RECOVERY_MINUTES.standard,60);
assert.equal(balance.RECOVERY_MINUTES.member,30);

const campaign=[
  ['ashesEastRoad',3],
  ['ashenVaultFirstClear',5],
  ['echoesBeneathZeltira',6],
  ['hollowSanctumFirstClear',8],
  ['thirteenthBell',9],
  ['chaosCanyonFirstClear',11],
  ['blackoutStationFirstClear',13],
  ['fourfoldLock',14],
  ['fracturedAgesFirstClear',15]
];
let level=1,xp=0,total=0;
for(const [key,target] of campaign){
  const reward=balance.CAMPAIGN_XP[key];assert(reward>0,'campaign XP missing '+key);total+=reward;xp+=reward;
  while(level<balance.PLAYER_LEVEL_CAP&&xp>=balance.xpNeeded(level)){xp-=balance.xpNeeded(level);level++}
  assert.equal(level,target,key+' lands on intended level');
  assert.equal(xp,0,key+' has no hidden XP debt');
}
assert.equal(total,balance.xpToReachLevel(15),'one campaign/first-clear path reaches the beta cap exactly');

for(const id of Object.keys(balance.DUNGEON_REPEAT_XP)){
  const first=balance.dungeonXp(id,{difficulty:'normal',firstClear:true});
  const repeat=balance.dungeonXp(id,{difficulty:'normal',firstClear:false});
  assert(first>=repeat,'first clear should never pay less XP than repeat: '+id);
}

const endgame=load('endgame-data-v1.js').CellboundEndgameData;
const ids=['ashen-vault','hollow-sanctum','chaos-canyon','blackout-station','fractured-ages'];
assert.deepEqual(ids.map(id=>endgame.DUNGEONS[id].normalItemLevel),[18,24,30,34,38],'normal iLvl ladder remains smooth');
for(let i=0;i<ids.length-1;i++){
  const profile=endgame.lootProfileFor(ids[i],'normal',0),cap=Math.max(...Object.values(profile.itemLevel).map(Number));
  assert(cap>=endgame.DUNGEONS[ids[i+1]].normalItemLevel,ids[i]+' normal loot can reach the next dungeon gate');
}

const fourfold=fs.readFileSync(path.join(root,'fourfold-lock-v1.js'),'utf8');
assert(fourfold.includes('fourfoldKeyChance'),'Fourfold quest uses the balance contract');
assert(fourfold.includes('fourth eligible clear is guaranteed'),'Fourfold UI explains bad-luck protection');
const boat=fs.readFileSync(path.join(root,'no-way-back-v1.js'),'utf8');
assert(boat.includes('SHIPWRIGHT_KIT_COST'),'No Way Back uses the balance contract');
const manor=fs.readFileSync(path.join(root,'manor-raid-v1.js'),'utf8');
assert(manor.includes('Every active adventurer must reach Level 15'),'Manor enforces its displayed level requirement');

console.log('Beta balance regression passed: campaign XP, dungeon gear ladder, Fourfold pity, boat economy, Cell Shock and Manor level gate.');
