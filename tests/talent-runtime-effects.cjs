'use strict';
/**
 * Talent V2 functional combat matrix.
 * Runs the real combat calculations for every new talent in every specialisation,
 * comparing no-rank against one-rank results under identical deterministic states.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const win={},ctxVM=vm.createContext({window:win,console});
vm.runInContext(read('class-build-v1.js'),ctxVM);
vm.runInContext(read('src/combat/combat-data-v1.js'),ctxVM);
const combat=read('src/combat/combat-reborn-v1.js');
const expose='window.__talentProbe={talentDamageScale,talentHealingScale,talentCooldownScale,talentCritBonus,talentResourceRegenScale,talentCost,mitigation,normalisePlayer,addThreat};\nwindow.CellboundCombatReborn={';
assert.ok(combat.includes('window.CellboundCombatReborn={'),'Expected canonical combat engine export');
vm.runInContext(combat.replace('window.CellboundCombatReborn={',expose),ctxVM);
const B=win.CellboundBuildRules,P=win.__talentProbe;
assert.ok(B&&P,'Shared build rules and combat internals load');
const cs=read('character-sheet.js'),start=cs.indexOf('const trees='),end=cs.indexOf('const leftSlots=',start);
assert.ok(start>=0&&end>start,'Character tree catalogue exists');
ctxVM.B=B;
vm.runInContext(cs.slice(start,end)+';window.__allTalentTrees=trees;',ctxVM);
const trees=win.__allTalentTrees;
let checked=0;
const byEffect={},failures=[];
for(const testLevel of [15,20,25,30])for(const [klass,bySpec] of Object.entries(trees)){
 for(const spec of Object.keys(bySpec)){
  for(const def of B.bonusTalentDefinitions(klass,spec)){
   const v={
    class:klass,spec,role:B.roleFor(klass,spec),id:'p1',characterId:'1',
    name:'Hero',level:testLevel,alive:true,position:{x:25,y:50},
    statuses:{},resource:{value:100},talentTree:{},talents:{[spec]:{}},
    defence:{blockChance:0},power:20,maxHealth:100,health:100
   };
   const target={...v,id:'e1',role:'enemy',classification:'boss',name:'Enemy',maxHealth:100,health:70};
   const context={players:[v],enemies:[target],pets:[],events:[],rng:()=>.99,time:1000,encounter:{kind:'boss'},stats:{players:{}}};
   const effect=def.effect;
   const calculate=()=>{
    if(effect==='damage')return P.talentDamageScale(context,v,{id:'basic',kind:'damage',cleave:1},target);
    if(effect==='cleave')return P.talentDamageScale(context,v,{id:'basic',kind:'damage',cleave:3},target);
    if(effect==='bossDamage')return P.talentDamageScale(context,v,{id:'basic',kind:'damage',cleave:1},target);
    if(effect==='executeDamage'){target.health=20;return P.talentDamageScale(context,v,{id:'basic',kind:'damage'},target)}
    if(effect==='heal')return P.talentHealingScale(context,v,{id:'heal',kind:'heal'},target);
    if(effect==='groupHeal')return P.talentHealingScale(context,v,{id:'group-heal',kind:'group-heal'},target);
    if(effect==='lowHeal'){target.health=30;return P.talentHealingScale(context,v,{id:'heal',kind:'heal'},target)}
    if(effect==='cooldown')return P.talentCooldownScale(v,{id:'basic',kind:'damage'});
    if(effect==='crit')return P.talentCritBonus(v);
    if(effect==='regen')return P.talentResourceRegenScale(v);
    if(effect==='cost')return P.talentCost(context,v,{id:'spell',kind:'damage'},40);
    if(effect==='health')return P.normalisePlayer({...v,id:'c1'},0).maxHealth;
    if(effect==='mitigation')return P.mitigation(context,v,'magic',{aggroHit:false});
    if(effect==='partyGuard'){v.role='tank';return P.mitigation(context,v,'magic',{aggroHit:false})}
    if(effect==='threat'){
     const e={...target,threat:{}};
     context.events=[];context.stats={players:{[v.id]:{}}};
     P.addThreat(context,e,v,100,'test');
     return e.threat[v.id]
    }
    throw new Error('Unrecognised bonus effect '+effect);
   };
   try{
    const before=calculate();
    v.talentTree[def.id]=1;v.talents[spec][def.id]=1;
    const after=calculate(),direction=['cooldown','cost','mitigation','partyGuard'].includes(effect)?-1:1;
    assert.ok(Number.isFinite(before)&&Number.isFinite(after)&&((after-before)*direction)>0,
     'Talent had no measurable expected effect: '+klass+'/'+spec+'/'+def.id+' ('+before+' -> '+after+')');
    checked++;byEffect[effect]=(byEffect[effect]||0)+1;
   }catch(error){failures.push({klass,spec,talent:def.id,effect,message:error.message})}
  }
 }
}
assert.equal(checked,196*4,'Every new talent needs a passing functional combat check');
assert.deepEqual(failures,[],'Talent combat effect failures');

// Every talent-gated ability must be absent without its talent and unlocked with rank 1.
let gatedAbilities=0;
for(const testLevel of [15,20,25,30])for(const [klass,bySpec] of Object.entries(trees)){
 for(const [spec,nodes] of Object.entries(bySpec)){
  const names=new Set(nodes.map(node=>node.id));
  const role=B.roleFor(klass,spec),character={class:klass,spec,level:testLevel,talents:{[spec]:{}}};
  const pool=win.CellboundCombatReborn.skills.classSkillPool(character,role);
  for(const ability of pool.filter(a=>a.talentReq&&names.has(a.talentReq))){
   assert.equal(win.CellboundCombatReborn.skills.unlockedSkillPool(character,role).some(a=>a.id===ability.id),false,
    'Talent-gated skill available before purchase: '+klass+'/'+spec+'/'+ability.id);
   character.talents[spec][ability.talentReq]=1;
   assert.equal(win.CellboundCombatReborn.skills.unlockedSkillPool(character,role).some(a=>a.id===ability.id),true,
    'Talent-gated skill fails to unlock: '+klass+'/'+spec+'/'+ability.id);
   delete character.talents[spec][ability.talentReq];
   gatedAbilities++;
  }
 }
}
assert.equal(gatedAbilities,63*4,'All currently defined gated class abilities were checked');
console.log('Talent-gated abilities PASS: '+gatedAbilities+' ability checks.');

console.log('Talent V2 runtime PASS: '+checked+' talent effects across 13 classes and 28 specialisations at Levels 15, 20, 25 and 30.');
console.log('Effect categories: '+JSON.stringify(byEffect));
