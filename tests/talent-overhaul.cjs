'use strict';
/**
 * All-class talent V2 contract.
 * Run: node tests/talent-overhaul.cjs
 * Tests live engine self-tests as well as each of the 196 new talent effects.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const win={},context=vm.createContext({window:win,console});
vm.runInContext(source('class-build-v1.js'),context,{filename:'class-build-v1.js'});
const B=win.CellboundBuildRules;
assert.ok(B,'Shared talent build rules load');
context.B=B;
const characterSource=source('character-sheet.js');
const from=characterSource.indexOf('const trees='),to=characterSource.indexOf('const leftSlots=',from);
assert.ok(from>=0&&to>from,'Tree catalogue has recognisable boundaries');
vm.runInContext(characterSource.slice(from,to)+';window.__talentTrees=trees;',context,{filename:'talent-tree-catalogue.js'});
const trees=win.__talentTrees;
vm.runInContext(source('src/combat/combat-data-v1.js'),context,{filename:'combat-data-v1.js'});
vm.runInContext(source('src/combat/combat-reborn-v1.js'),context,{filename:'combat-reborn-v1.js'});
const engine=win.CellboundCombatReborn,combatSource=source('src/combat/combat-reborn-v1.js');
assert.ok(engine?.simulate&&engine?.tests?.run,'Combat engine loads');
assert.deepEqual([B.CURRENT_LEVEL_CAP,B.CURRENT_SPEC_POINT_CAP],[15,8]);
assert.deepEqual(Array.from({length:15},(_,i)=>B.talentBudgetForLevel(i+1)),[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8]);
assert.deepEqual(Array.from({length:5},(_,i)=>B.tierRequirement(i)),[0,1,3,5,6]);
assert.equal(Object.keys(trees).length,13);

const requirementNames=new Set(Object.values(engine.talents.skillRequirements));
const runtimeTalentNames=new Set();
const references=/(?:talentRank|characterTalentRank)\s*\(\s*[^,\n]+,\s*(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)")\s*\)/g;
for(const match of combatSource.matchAll(references))runtimeTalentNames.add(match[1]||match[2]);
let specCount=0,baseCount=0,bonusCount=0,capCount=0;

function fresh(klass,spec,level=15){
 return {id:'talent-test',class:klass,spec,level,talents:{[spec]:{}},talentSystemVersion:B.TALENT_SYSTEM_VERSION}
}
function learn(c,node){
 c.talents[c.spec][node.id]=(c.talents[c.spec][node.id]||0)+1
}
function capstoneIsReachable(klass,spec,nodes,target){
 const c=fresh(klass,spec),map=new Map(nodes.map(n=>[n.id,n])),path=[];
 for(let node=target;node;node=node.req?map.get(node.req):null){
  assert.ok(!path.includes(node.id),'Talent prerequisite cycle: '+klass+' '+spec);
  path.unshift(node.id)
 }
 let learned=false;
 for(let turn=0;turn<8;turn++){
  if(B.nodeState(c,spec,target,nodes).canInvest){
   learn(c,target);learned=true;break
  }
  const planned=path.slice(0,-1).map(id=>map.get(id)).find(n=>!c.talents[spec][n.id]&&B.nodeState(c,spec,n,nodes).canInvest);
  const filler=nodes.find(n=>n.tier<4&&!path.includes(n.id)&&B.nodeState(c,spec,n,nodes).canInvest)||
   nodes.find(n=>n.tier<4&&B.nodeState(c,spec,n,nodes).canInvest);
  const next=planned||filler;
  assert.ok(next,'Cannot reach capstone '+klass+'/'+spec+'/'+target.id);
  learn(c,next);
 }
 assert.ok(learned,'Capstone not reachable within 8 points: '+klass+'/'+spec+'/'+target.id);
 return c
}
for(const [klass,specs] of Object.entries(trees)){
 for(const [spec,nodes] of Object.entries(specs)){
  specCount++;
  assert.equal(B.roleFor(klass,spec)==='dps'||B.roleFor(klass,spec)==='tank'||B.roleFor(klass,spec)==='healer',true);
  assert.equal(nodes.length,16,'16 meaningful nodes: '+klass+'/'+spec);
  assert.equal(new Set(nodes.map(n=>n.id)).size,nodes.length,'Unique IDs: '+klass+'/'+spec);
  const capstones=nodes.filter(n=>n.tier===4&&n.exclusive==='capstone');
  assert.equal(capstones.length,2,'Alternative capstones: '+klass+'/'+spec);
  capCount+=capstones.length;
  for(const node of nodes){
   assert.ok(node.id&&node.desc&&node.max>0,'Described and ranked talent: '+klass+'/'+spec);
   if(node.req)assert.ok(nodes.some(x=>x.id===node.req),'Valid prerequisite: '+klass+'/'+spec+'/'+node.id);
   if(!node.bonusEffect){
    baseCount++;
    assert.ok(engine.talents.rules[node.id],'Combat tooltip rule missing: '+klass+'/'+spec+'/'+node.id);
    assert.ok(runtimeTalentNames.has(node.id)||requirementNames.has(node.id),
      'Legacy talent has no explicit combat implementation or gated ability: '+klass+'/'+spec+'/'+node.id);
   }
  }
  const c=fresh(klass,spec);
  for(const def of B.bonusTalentDefinitions(klass,spec)){
   bonusCount++;
   const sample=fresh(klass,spec);
   learn(sample,{id:def.id});
   const bonus=B.talentBonuses(sample);
   assert.ok(Math.abs(bonus[def.effect]-def.amount)<1e-9,
    'Rank 1 has measurable effect: '+klass+'/'+spec+'/'+def.id);
   if(def.max>1){
    learn(sample,{id:def.id});
    assert.ok(Math.abs(B.talentBonuses(sample)[def.effect]-2*def.amount)<1e-9,
      'Rank 2 scales: '+klass+'/'+spec+'/'+def.id);
   }
  }
  assert.ok(nodes.some(n=>B.nodeState(c,spec,n,nodes).canInvest),'Level 15 can invest');
  for(const target of capstones){
   const trained=capstoneIsReachable(klass,spec,nodes,target);
   const opposite=capstones.find(n=>n!==target);
   assert.equal(B.nodeState(trained,spec,opposite,nodes).canInvest,false,'Mutually exclusive capstones');
  }
 }
}
assert.equal(specCount,28);
assert.equal(baseCount,252);
assert.equal(bonusCount,196);
assert.equal(capCount,56);
const legacy={class:'Mage',spec:'Arcane',level:15,talents:{Arcane:{'Arcane Focus':3},Frost:{'Piercing Cold':3}}};
assert.equal(B.migrateTalentBuilds(legacy,['Arcane','Frost']),true);
assert.equal(Object.keys(legacy.talents.Arcane).length,0);
assert.equal(Object.keys(legacy.talents.Frost).length,0);
assert.equal(legacy.talentRebuildNotice,true);
legacy.talents.Arcane['Arcane Precision Edge']=1;
assert.equal(B.migrateTalentBuilds(legacy,['Arcane','Frost']),false,'Migration is idempotent');
assert.equal(legacy.talents.Arcane['Arcane Precision Edge'],1,'V2 saves are preserved');
assert.equal(B.respec(legacy,'Arcane',false,1000000),true);
legacy.talents.Arcane['Arcane Precision Edge']=1;
assert.equal(B.respec(legacy,'Arcane',false,1000001),false,'Standard daily respec limit');
assert.equal(B.respec(legacy,'Arcane',true,1000001),true,'Member gets extra respec');
legacy.talents.Arcane['Arcane Precision Edge']=1;
assert.equal(B.respec(legacy,'Arcane',true,1000002),true);
legacy.talents.Arcane['Arcane Precision Edge']=1;
assert.equal(B.respec(legacy,'Arcane',true,1000003),false,'Member maximum three respecs');
assert.equal(B.respec(legacy,'Arcane',false,1000002+86400001),true,'Expired respec window frees allowance');
const combatTest=engine.tests.run();
assert.equal(combatTest.passed,combatTest.total,'Combat engine regressions');
console.log('Talent V2 PASS: '+Object.keys(trees).length+' classes, '+specCount+' specialisations, '+
 baseCount+' legacy talents, '+bonusCount+' new talents, '+capCount+' capstones, '+combatTest.passed+' combat tests.');
