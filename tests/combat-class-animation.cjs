'use strict';
const assert=require('node:assert/strict'),{inventory,D,C}=require('../tools/combat-animation-inventory.cjs');
assert.equal(inventory.length,13);let active=0;
for(const row of inventory){assert(C.styles[row.class]);for(const a of row.abilities){active++;assert(['swing','bash'].includes(a.clip)||C.clips[a.clip],`${row.class} / ${a.id}: missing clip`);assert(!['cast','swing'].includes(a.clip)||row.class==='Warrior','classes cannot silently share generic casting');const action=C.resolve(row.class,{ability:a.name,payload:{kind:a.kind}},row.class==='Hunter'?'bow':'');assert(action.known,a.name)}}
assert.equal(active,221);
assert.notEqual(C.resolve('Mage',{ability:'Fireball'}).clip,C.resolve('Mage',{ability:'Frostbolt'}).clip);
assert.equal(C.resolve('Rogue',{ability:'Sinister Strike'},'dagger',false,1).clip,'offjab');
assert.equal(C.resolve('Warrior',{ability:'Guard Strike'},'greatsword',true).clip,'cleave');
for(const [klass,style] of Object.entries(C.styles))for(const key of ['basic','heavy','cast','heal','defense'])assert(style[key]==='swing'||C.clips[style[key]],klass+' '+key);
for(const a of Object.values(D.ROLE_FALLBACKS).flat())assert(C.resolve('Warrior',{ability:a.name}).clip);
console.log(`All ${inventory.length} classes / ${active} active catalogue abilities, class buffs and role fallbacks have valid class-aware animation mappings; ${Object.keys(D.TALENT_RULES).length} passive talent rules inventoried.`);
// The catalogue consumes copies of authoritative events; querying presentation
// must not alter seeded outcomes, resources, threat, commands or cooldowns.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),sandbox={window:{},console};vm.createContext(sandbox);
for(const f of ['combat-data-v1.js','combat-reborn-v1.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/combat',f),'utf8'),sandbox);
let specs=0;
for(const row of inventory)for(const spec of new Set(row.abilities.map(a=>a.spec).filter(x=>x!=='All'))){
 const options={party:[{id:'qa',name:'QA',class:row.class,spec,level:30,power:30},{id:'heal',name:'Healer',class:'Priest',spec:'Holy',level:30,power:20}],encounter:{id:'animation-invariance',kind:'boss',enemies:['Sentinel'],enemyHealth:4000,mechanics:[]},seed:row.class+spec,maxDurationMs:12000};
 const a=sandbox.window.CellboundCombatReborn.simulate(options),serialized=JSON.stringify(a);
 for(const e of a.events)C.resolve(row.class,e,row.class==='Hunter'?'bow':'');
 assert.equal(JSON.stringify(a),serialized,'presentation cannot mutate engine events');assert.equal(JSON.stringify(sandbox.window.CellboundCombatReborn.simulate(options)),serialized,row.class+' '+spec+' deterministic outcomes');specs++;
}
console.log(`${specs} seeded class/spec simulations remain byte-identical after presentation resolution.`);
