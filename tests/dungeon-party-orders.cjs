'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const sandbox={window:{},console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/combat/combat-data-v1.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync('src/combat/combat-reborn-v1.js','utf8'),sandbox);
const E=sandbox.window.CellboundCombatReborn;
const party=[
 {id:'tank',name:'Tank',class:'Warrior',spec:'Protection',level:15,power:30},
 {id:'heal',name:'Healer',class:'Priest',spec:'Holy',level:15,power:30},
 {id:'dps1',name:'DPS One',class:'Mage',spec:'Frost',level:15,power:30},
 {id:'dps2',name:'DPS Two',class:'Hunter',spec:'Marksmanship',level:15,power:30},
 {id:'dps3',name:'DPS Three',class:'Rogue',spec:'Assassination',level:15,power:30}
];
const encounter={kind:'boss',level:14,enemies:[
 {name:'Main Boss',classification:'boss'},
 {name:'Support Caster',classification:'add',combatBehaviour:'support'},
 {name:'Minor Add',classification:'add'}
],enemyHealth:10000,mechanics:[{name:'Dark Cast',type:'interrupt',duration:2200,priority:'critical'}],mechanicIntervalMs:2400};
const options={party,encounter,seed:'orders-contract',maxDurationMs:16000};
const defaultRun=E.simulate({...options,tactics:{addPriority:'immediate'}});
const orders={tank:'boss-lock',heal:'group',dps1:'boss-burn',dps2:'interrupt',dps3:'adds'};
const orderedRun=E.simulate({...options,tactics:{addPriority:'immediate',unitOrders:orders}});
const hits=run=>run.events.filter(e=>e.type==='DAMAGE_DEALT'&&e.source==='p-dps1');
assert(hits(defaultRun).length&&hits(orderedRun).length,'damage actions recorded');
assert.equal(hits(defaultRun)[0].target,'e-1','default DPS focuses the add');
assert.equal(hits(orderedRun)[0].target,'e-0','Boss Burn DPS focuses boss despite global add policy');
assert.notEqual(orderedRun.summary.totalDamage,defaultRun.summary.totalDamage,'orders change combat outputs');
const start=orderedRun.events.find(e=>e.type==='COMBAT_START');
assert.equal(start.payload.tactics.unitOrders.dps1,'boss-burn','orders survive into authoritative combat event');
const invalid=E.simulate({...options,tactics:{unitOrders:{dps1:'cheat',tank:'god-mode'}}});
assert.equal(invalid.events.find(e=>e.type==='COMBAT_START').payload.tactics.unitOrders.dps1,'','unknown values rejected');
for(const file of [
 'src/dungeons/dungeon-2d-v1.js','src/dungeons/hollow-sanctum-v1.js',
 'src/dungeons/chaos-canyon-v1.js','src/dungeons/blackout-station-v1.js',
 'src/dungeons/fractured-ages-v1.js'
]){
 const content=fs.readFileSync(file,'utf8');
 assert(content.includes('CellboundPartyTactics?.markup?.(party())'),file+' exposes role orders');
 assert(content.includes('CellboundPartyTactics?.current?.(party())'),file+' passes selected orders into combat');
}
assert(fs.readFileSync('quests-v2.js','utf8').includes('config.tactics.unitOrders'),'shared dungeon quest engine forwards run orders');
assert(fs.readFileSync('top-navigation-v1.js','utf8').includes('CellboundDungeonQuickEntry.open(dungeonId)'),'featured dungeons skip journal');
console.log('Dungeon quick-entry and per-character orders affect real combat across all five dungeons.');
