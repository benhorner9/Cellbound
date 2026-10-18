'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),win={},ctx=vm.createContext({window:win,console});
for(const file of ['class-build-v1.js','src/combat/combat-data-v1.js','src/combat/combat-reborn-v1.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
ctx.B=win.CellboundBuildRules;
const source=fs.readFileSync(path.join(root,'character-sheet.js'),'utf8');
vm.runInContext(source.slice(source.indexOf('const trees='),source.indexOf('const leftSlots='))+';window.__trees=trees;',ctx);
const B=win.CellboundBuildRules,C=win.CellboundCombatReborn,trees=win.__trees;
const classes=['Warrior','Paladin','Hunter','Rogue','Mage'];
function hero(klass,spec,id,level,gear,reverse=false){
  const c={id,name:klass+' '+spec,class:klass,spec,level,power:Math.round(gear*.65),_combatItemLevel:gear,talents:{[spec]:{}},knowledge:{}};
  const nodes=reverse?[...trees[klass][spec]].reverse():trees[klass][spec];
  while(B.talentRemaining(c,spec)>0){
    const n=nodes.find(n=>B.nodeState(c,spec,n,nodes).canInvest);
    assert(n,'Legal build can spend its budget');c.talents[spec][n.id]=(c.talents[spec][n.id]||0)+1;
  }
  assert.equal(nodes.filter(n=>n.exclusive&&c.talents[spec][n.id]).length<=1,true);
  return c;
}
let simulations=0;
for(const [level,gear] of [[20,54],[25,68],[30,82]])for(const klass of classes)for(const spec of Object.keys(trees[klass]))for(const reverse of [false,true]){
  const test=hero(klass,spec,'trial',level,gear,reverse),role=B.roleFor(klass,spec);
  const party=[hero('Warrior','Protection','tank',level,gear),hero('Paladin','Holy','healer',level,gear),hero('Hunter','Marksman','hunter',level,gear),hero('Rogue','Assassination','rogue',level,gear),hero('Mage','Arcane','mage',level,gear)];
  party[role==='tank'?0:role==='healer'?1:4]=test;
  const result=C.simulate({party,seed:'e2-scaling-'+klass+'-'+spec,maxDurationMs:15000,encounter:{id:'level-scaling-probe',kind:'boss',level,recommendedItemLevel:gear,enemies:[{name:'Scaling probe',classification:'boss'}],enemyHealth:8000,mechanics:[{name:'Interrupt probe',type:'interrupt',duration:2200}],mechanicIntervalMs:4000}});
  assert(result.events.length>0);
  for(const p of result.finalState.players){
    assert.equal(p.level,level,'Engine must not clamp above Level 15');
    assert(Number.isFinite(p.maxHealth)&&p.maxHealth>0);
    assert(Number.isFinite(p.health)&&p.health>=0&&p.health<=p.maxHealth);
    assert(Number.isFinite(p.resource.value)&&p.resource.value>=0&&p.resource.value<=p.resource.max);
  }
  const metrics=result.summary.players.find(p=>p.name===test.name);
  assert(metrics);
  assert(role==='healer'?metrics.healing>0:metrics.damage>0,'Build performs its combat role: '+klass+'/'+spec+' L'+level);
  simulations++;
}
console.log('Episode 2 scaling PASS: '+simulations+' canonical combat probes, five beta classes, ten specialisations, two legal builds at Levels 20/25/30. Synthetic probes do not establish campaign encounter balance.');
