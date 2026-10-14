'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const store=new Map(),sandbox={window:{CellboundGame:{getUser:()=>({id:'qa-test-account'})}},console,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))}};
vm.createContext(sandbox);
for(const f of ['src/combat/combat-data-v1.js','src/combat/pvp-ruleset-v1.js','src/combat/pvp-objectives-v1.js','src/combat/combat-reborn-v1.js','src/combat/combat-standard-v1.js','src/combat/pvp-pre-tactics-v1.js'])
 vm.runInContext(fs.readFileSync(f,'utf8'),sandbox,{filename:f});
const P=sandbox.window.CellboundPvPPreTactics,E=sandbox.window.CellboundCombatStandard;
const roster=side=>[
 {id:side+'-tank',name:'Warrior',class:'Warrior',spec:'Protection',level:15,power:18},
 {id:side+'-healer',name:'Priest',class:'Priest',spec:'Holy',level:15,power:18},
 {id:side+'-dps',name:'Mage',class:'Mage',spec:'Arcane',level:15,power:18},
 {id:side+'-rogue',name:'Rogue',class:'Rogue',spec:'Assassination',level:15,power:18},
 {id:side+'-hunter',name:'Hunter',class:'Hunter',spec:'Marksman',level:15,power:18}
];
const blue=roster('blue'),red=roster('red');
for(const mode of ['arena','capture-the-flag','king-of-the-hill']){
 const n=mode==='arena'?2:5,squad=blue.slice(0,n);
 const preset=P.preset(mode,'assault',squad);
 const saved=P.save(mode,n,preset,squad);
 assert.equal(saved.target,'attack-healer');
 assert.equal(P.load(mode,n,squad).objective,mode==='arena'?'pressure-healer':mode==='capture-the-flag'?'take-flag':'capture-hill');
 assert(P.markup(mode,n,squad).includes('PRE-MATCH TACTICS'));
 assert(P.markup(mode,n,squad).includes('INDIVIDUAL TARGET PRIORITIES'));
 const team={target:'attack-tank',position:'spread',objective:mode==='arena'?'kite':mode==='capture-the-flag'?'defend-base':'rotate-early',
  individual:{[squad[0].id]:'attack-healer',[squad[1].id]:'focus-low-health'}};
 const session=E.createPvpSession({pvp:{mode,size:n,blue:blue.slice(0,n),red:red.slice(0,n),preTactics:{blue:team}},
  encounter:{id:'preplan-'+mode},seed:'prematch-'+mode,maxDurationMs:10000});
 const start=session.snapshot(),orders=start.pvp.orders;
 assert.equal(orders.blue.target,'attack-tank','team target loaded');
 assert.equal(orders.blue.position,'spread','opening formation loaded');
 assert.equal(orders.blue.objective,team.objective,'mode-specific objective loaded');
 assert.equal(orders.blue.individual[squad[0].id],'attack-healer','unit assignment loaded');
 assert.equal(orders.red.target,'balanced','opponents keep their own defaults');
 assert(start.events.some(e=>e.type==='PVP_PREMATCH_TACTICS'&&e.payload.team==='blue'),'prematch event emitted');
 assert(start.events.some(e=>e.type==='MOVEMENT_START'&&e.result==='pvp spread'),'opening formation affects movement');
 assert.equal(session.pvpCommand('blue','target','attack-dps').ok,true,'live orders accepted');
 assert.equal(session.snapshot().pvp.orders.blue.target,'attack-dps');
 assert.equal(session.snapshot().pvp.orders.blue.individual,undefined,'live target order overrides personal priority rules');
 session.advance(500);
}
const invalid=E.createPvpSession({pvp:{mode:'arena',size:2,blue:blue.slice(0,2),red:red.slice(0,2),
 preTactics:{blue:{target:'win-every-time',position:'teleport',objective:'steal-flag',individual:{'blue-tank':'godmode','other-account':'attack-healer'}}}},
 encounter:{id:'unsafe-plan'},seed:'unsafe-prematch-seed'});
const order=invalid.snapshot().pvp.orders.blue;
assert.equal(order.target,'balanced');assert.equal(order.position,'balanced');assert.equal(order.objective,'push');assert.deepEqual(Object.keys(order.individual),[]);
assert.equal(P.clean({target:'cheat',position:'fly',objective:'win',individual:{'blue-tank':'invalid'}},'arena',blue.slice(0,2)).target,'balanced');
const owner=fs.readFileSync('src/combat/pvp-owner-qa-v1.js','utf8'),server=fs.readFileSync('server/pvp/match-authority.cjs','utf8');
assert(owner.includes('CellboundPvPPreTactics?.markup?.'),'Owner QA has the real pre-match form');
assert(owner.includes('preTactics:{blue:plan}'),'Owner QA passes plan to shared PvP engine');
assert(server.includes('sealedPreTactics'),'Trusted PvP authority supports sealed player plans');
assert(fs.readFileSync('guild.html','utf8').includes('pvp-pre-tactics-v1.js'),'PvP planner loads before owner UI');
assert(fs.readFileSync('pvp-v1.js','utf8').includes('const PVP_ENABLED=false'),'public PvP remains locked');
console.log('PvP pre-match tactics passed: per-mode presets, personal targets, opening movement, live override, validation and safe practice wiring.');
