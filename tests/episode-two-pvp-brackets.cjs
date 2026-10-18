'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const E=require('../src/episodes/episode-two-v1.js');
let state={roster:[{id:'one',name:'One',level:19,pvpEquipment:{}}],activity:[]};
const win={CellboundEpisodeTwo:E,CellboundGame:{getState:()=>state,isCharacterRosterUnlocked:()=>true},addEventListener(){}};
const context=vm.createContext({window:win,document:{querySelector:()=>null,querySelectorAll:()=>[]},setInterval:()=>0,clearInterval(){},console});
const src=fs.readFileSync(require.resolve('../pvp-v1.js'),'utf8');
vm.runInContext(src.replace('window.CellboundPvP={','window.__gearTest={buyGear,gearPiece,armouryTierMarkup};window.CellboundPvP={'),context);
const T=win.__gearTest;
assert(T);
for(const [tier,minLevel] of Object.entries(E.PVP_EQUIPMENT_LEVELS)){
  state.roster[0].pvpEquipment={};state.roster[0].level=minLevel-1;
  // First call normalizes the PvP save, and must not buy below the level bracket.
  T.buyGear(Number(tier),'Weapon');
  Object.assign(state.pvp,{warMarks:10000,arenaSeals:10000,seasonCrests:100,bgXp:1500,t1Purchases:5});
  const funds=[state.pvp.warMarks,state.pvp.arenaSeals,state.pvp.seasonCrests];
  T.buyGear(Number(tier),'Weapon');
  assert.equal(state.roster[0].pvpEquipment.Weapon,null);
  assert.deepEqual([state.pvp.warMarks,state.pvp.arenaSeals,state.pvp.seasonCrests],funds);
  assert(T.armouryTierMarkup(state.pvp,state.roster[0],Number(tier)).includes('Requires character Level '+minLevel));
  state.roster[0].level=minLevel;
  T.buyGear(Number(tier),'Weapon');
  assert.equal(state.roster[0].pvpEquipment.Weapon.requiredLevel,minLevel);
  assert.equal(state.roster[0].pvpEquipment.Weapon.tier,Number(tier));
  const paid=JSON.stringify(state.pvp);
  T.buyGear(Number(tier),'Weapon');
  assert.equal(JSON.stringify(state.pvp),paid,'Duplicate purchase does not charge again');
}
assert.equal(win.CellboundPvP.enabled,false,'Foundation does not silently change the existing PvP launch gate');
console.log('PvP gear brackets PASS: actual purchase and displayed requirements at Levels 20, 25, 30; underlevel and repeated purchases cannot spend currency. PvP launch gate unchanged.');
