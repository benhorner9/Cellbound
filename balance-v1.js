(()=>{
'use strict';

const VERSION=1;
const PLAYER_LEVEL_CAP=15;
const PVE_WIPE_CELL_SHOCK=25;
const RECOVERY_MINUTES=Object.freeze({standard:60,member:30});
const SHIPWRIGHT_KIT_COST=1000;

const CAMPAIGN_XP=Object.freeze({
  ashesEastRoad:1850,
  ashenVaultFirstClear:2850,
  echoesBeneathZeltira:1800,
  hollowSanctumFirstClear:4350,
  thirteenthBell:2550,
  chaosCanyonFirstClear:5850,
  blackoutStationFirstClear:6850,
  fourfoldLock:3800,
  fracturedAgesFirstClear:4050
});

const DUNGEON_REPEAT_XP=Object.freeze({
  'ashen-vault':Object.freeze({normal:900,heroic:1050,cellbound:1200}),
  'hollow-sanctum':Object.freeze({normal:1200,heroic:1450,cellbound:1650}),
  'chaos-canyon':Object.freeze({normal:1600,heroic:1900,cellbound:2200}),
  'blackout-station':Object.freeze({normal:2000,heroic:2350,cellbound:2700}),
  'fractured-ages':Object.freeze({normal:2500,heroic:2900,cellbound:3300})
});

const FIRST_CLEAR_XP=Object.freeze({
  'ashen-vault':CAMPAIGN_XP.ashenVaultFirstClear,
  'hollow-sanctum':CAMPAIGN_XP.hollowSanctumFirstClear,
  'chaos-canyon':CAMPAIGN_XP.chaosCanyonFirstClear,
  'blackout-station':CAMPAIGN_XP.blackoutStationFirstClear,
  'fractured-ages':CAMPAIGN_XP.fracturedAgesFirstClear
});

function xpNeeded(level){
  return 800+Math.max(0,(Number(level)||1)-1)*250
}
function xpToReachLevel(targetLevel,startLevel=1){
  const from=Math.max(1,Math.floor(Number(startLevel)||1)),to=Math.max(from,Math.min(PLAYER_LEVEL_CAP,Math.floor(Number(targetLevel)||PLAYER_LEVEL_CAP)));
  let total=0;for(let level=from;level<to;level++)total+=xpNeeded(level);
  return total
}
function dungeonXp(id,{difficulty='normal',firstClear=false}={}){
  const mode=String(difficulty||'normal').toLowerCase();
  if(firstClear&&mode==='normal'&&FIRST_CLEAR_XP[id])return FIRST_CLEAR_XP[id];
  return DUNGEON_REPEAT_XP[id]?.[mode]||DUNGEON_REPEAT_XP[id]?.normal||0
}
function fourfoldKeyChance(attempt){
  const n=Math.max(1,Math.floor(Number(attempt)||1));
  if(n>=4)return 1;
  return [0,.35,.60,.85][n]||.35
}

window.CellboundBalance={
  VERSION,PLAYER_LEVEL_CAP,PVE_WIPE_CELL_SHOCK,RECOVERY_MINUTES,SHIPWRIGHT_KIT_COST,
  CAMPAIGN_XP,DUNGEON_REPEAT_XP,FIRST_CLEAR_XP,
  xpNeeded,xpToReachLevel,dungeonXp,fourfoldKeyChance
};
})();