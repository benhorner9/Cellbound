'use strict';
/**
 * Talent System V2 cross-role gameplay sweep.
 * Real canonical combat engine; fixed seeds; Chapter 1 progression, boss,
 * trash, 10-character raid and symmetrical Arena sanity checks.
 * npm run test:role-balance
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..'),sandbox={window:{},console};
vm.createContext(sandbox);
for(const filename of [
 'class-build-v1.js','src/combat/combat-data-v1.js',
 'src/combat/pvp-ruleset-v1.js','src/combat/pvp-objectives-v1.js',
 'src/combat/combat-reborn-v1.js'
])vm.runInContext(fs.readFileSync(path.join(root,filename),'utf8'),sandbox,{filename});
const B=sandbox.window.CellboundBuildRules,C=sandbox.window.CellboundCombatReborn;
assert(B&&C?.simulate,'Shared talent + combat runtimes loaded');
const groups=Object.entries(B.SPEC_ROLES).map(([key,role])=>{
 const [klass,spec]=key.split('|');return {klass,spec,role}
});
assert.equal(groups.length,28,'All specialisations are included');
const order={
 tank:['Tempered Guard','Veteran Vitality','Frontline Pressure','Iron Resolve','Relentless Challenge'],
 healer:['Lifeweaver','Deep Reserves','Efficient Casting','Emergency Grace','Swift Intervention'],
 dps:['Precision Edge','Flowing Power','Keen Instinct','Boss Hunter','Relentless Rhythm']
};
function build(klass,spec,level=15){
 const ranks={},defs=B.bonusTalentDefinitions(klass,spec),role=B.roleFor(klass,spec);
 let left=B.talentBudgetForLevel(level);
 for(const title of order[role]){
  const node=defs.find(x=>x.title===title);
  assert(node,klass+'/'+spec+' lacks '+title);
  const spent=Math.min(left,node.max);
  if(spent)ranks[node.id]=spent;
  left-=spent;
 }
 assert.equal(left,0,klass+'/'+spec+' sample spends precisely its budget');
 return ranks
}
function hero(klass,spec,id,level=15,gear=36,built=false){
 return{
  id,name:klass+' '+spec,class:klass,spec,level,
  power:Math.max(7,Math.round(gear*.65)),_combatItemLevel:gear,
  talents:{[spec]:built?build(klass,spec,level):{}},
  knowledge:{balance:100}
 }
}
function partyFor(g,built,level=15,gear=36){
 if(g.role==='tank')return [
  hero(g.klass,g.spec,'trial',level,gear,built),hero('Priest','Holy','h',level,gear),
  hero('Mage','Arcane','d1',level,gear),hero('Hunter','Marksman','d2',level,gear),hero('Rogue','Assassination','d3',level,gear)
 ];
 if(g.role==='healer')return [
  hero('Warrior','Protection','t',level,gear),hero(g.klass,g.spec,'trial',level,gear,built),
  hero('Mage','Arcane','d1',level,gear),hero('Hunter','Marksman','d2',level,gear),hero('Rogue','Assassination','d3',level,gear)
 ];
 return [
  hero('Warrior','Protection','t',level,gear),hero('Priest','Holy','h',level,gear),
  hero(g.klass,g.spec,'trial',level,gear,built),hero('Hunter','Marksman','d2',level,gear),hero('Rogue','Assassination','d3',level,gear)
 ]
}
const finite=(x,label)=>assert(Number.isFinite(Number(x)),label+' is finite');
function checkResult(res,label){
 assert(['ongoing','victory','defeat','draw'].includes(res.outcome),label+' has legal outcome');
 assert(Array.isArray(res.events)&&res.events.length>0,label+' emits gameplay events');
 finite(res.durationMs,label+' time');
 for(const p of res.finalState.players){
  finite(p.maxHealth,label+' max HP');
  finite(p.health,label+' HP');
  assert(p.maxHealth>0&&p.health>=0&&p.health<=p.maxHealth,label+' HP bounds');
  finite(p.resource.value,label+' resource');
  assert(p.resource.value>=-0.001&&p.resource.value<=p.resource.max+0.001,label+' resource bounds');
 }
 for(const p of res.summary.players){
  finite(p.damage,label+' damage');
  finite(p.healing,label+' healing');
  finite(p.damageTaken,label+' taken');
  assert(p.damage>=0&&p.healing>=0&&p.damageTaken>=0,label+' non-negative combat stats');
 }
}
let encounters=0;
const byRole={tank:[],healer:[],dps:[]};
for(const g of groups){
 for(const c of [
  {name:'boss',kind:'boss',enemies:['Boss'],hp:16000,ms:27000},
  {name:'pack',kind:'trash',enemies:['A','B','C'],hp:5500,ms:18000}
 ]){
  for(let seed=0;seed<3;seed++){
   const scores={};
   for(const built of [false,true]){
    const label=g.klass+'/'+g.spec+'/'+c.name+'/'+seed+'/'+built;
    const result=C.simulate({
     party:partyFor(g,built),
     encounter:{id:'talent-role-balance',kind:c.kind,level:15,enemies:c.enemies,enemyHealth:c.hp,recommendedItemLevel:35,mechanics:[]},
     seed:'role:'+g.klass+':'+g.spec+':'+c.name+':'+seed,
     maxDurationMs:c.ms,tactics:{cooldownUse:'free'}
    });
    encounters++;
    checkResult(result,label);
    const summary=result.summary.players.find(x=>x.id==='p-trial'),trial=result.finalState.players.find(x=>x.id==='p-trial');
    assert(summary&&trial,label+' tested character appears');
    assert.equal(trial.role,g.role,label+' role identity');
    const score=g.role==='tank'?summary.damageTaken:g.role==='healer'?summary.healing:summary.damage;
    assert(score>0,label+' performs its combat role');
    if(g.role==='tank')assert(summary.threatLost<=1,label+' tank holds threat');
    scores[built?'built':'base']=score;
   }
   byRole[g.role].push({className:g.klass,spec:g.spec,context:c.name,base:scores.base,built:scores.built});
  }
 }
}
// New passives are restrained: the averaged role gains must not be runaway
// and all available classes must be compared against their own identical seed.
for(const [role,rows] of Object.entries(byRole)){
 const bySpec=new Map();
 rows.forEach(r=>{const id=r.className+'|'+r.spec+'|'+r.context;if(!bySpec.has(id))bySpec.set(id,[]);bySpec.get(id).push(r)});
 for(const [name,samples] of bySpec){
  const baseline=samples.reduce((sum,x)=>sum+x.base,0),built=samples.reduce((sum,x)=>sum+x.built,0);
  const pct=baseline?built/baseline:1;
  if(role==='dps')assert(pct>=.75&&pct<=1.50,name+' DPS change out of safe range: '+pct.toFixed(2));
  if(role==='tank')assert(pct>=.60&&pct<=1.35,name+' tank incoming damage change out of safe range: '+pct.toFixed(2));
  // Effective healing can legitimately fall when tank damage falls or the
  // same healer uses spells with different overhealing/proc patterns.
  if(role==='healer')assert(pct>=.50&&pct<=1.70,name+' healer output change out of safe range: '+pct.toFixed(2));
 }
}

const campaign=[
 {name:'Ashen Vault',level:5,gear:22,hp:680,kind:'boss',ms:55000},
 {name:'Hollow Sanctum',level:8,gear:28,hp:1000,kind:'final',ms:55000},
 {name:'Chaos Canyon',level:11,gear:34,hp:1900,kind:'final',ms:65000},
 {name:'Blackout Station',level:13,gear:37,hp:2450,kind:'final',ms:70000},
 {name:'Fractured Ages',level:15,gear:42,hp:2500,kind:'boss',ms:65000},
 {name:'Manor Maid (single party)',level:15,gear:48,hp:5650,kind:'boss',damageScale:.52,ms:130000}
];
for(const stage of campaign)for(let seed=0;seed<2;seed++){
 const results=[];
 for(const built of [false,true]){
  const roster=[
   hero('Warrior','Protection','t',stage.level,stage.gear,built),
   hero('Priest','Holy','h',stage.level,stage.gear,built),
   hero('Mage','Arcane','d1',stage.level,stage.gear,built),
   hero('Hunter','Marksman','d2',stage.level,stage.gear,built),
   hero('Rogue','Assassination','d3',stage.level,stage.gear,built)
  ];
  const result=C.simulate({party:roster,encounter:{
   id:stage.name,kind:stage.kind,level:stage.level,recommendedItemLevel:stage.gear,
   enemyHealth:stage.hp,enemies:['Boss'],mechanics:[],
   scaling:{enemyDamage:stage.damageScale||1}
  },seed:'campaign:'+stage.name+':'+seed,maxDurationMs:stage.ms,tactics:{cooldownUse:'free'}});
  encounters++;checkResult(result,stage.name);results.push(result);
 }
 assert.equal(results[1].outcome,'victory',stage.name+' should be clearable with a normal geared talented party');
 assert(results[1].durationMs<=results[0].durationMs*1.30,stage.name+' cannot become dramatically slower with talents');
 assert(results[1].summary.deaths<=results[0].summary.deaths,stage.name+' cannot gain deaths after investing in talents');
}
const raidRoles=[
 ['Warrior','Protection'],['Paladin','Protection'],['Priest','Holy'],['Shaman','Restoration'],
 ['Mage','Arcane'],['Hunter','Beast Mastery'],['Rogue','Assassination'],['Warlock','Destruction'],
 ['Demon Hunter','Havoc'],['Death Knight','Unholy']
];
const raidParty=built=>raidRoles.map(([klass,spec],i)=>hero(klass,spec,'r'+i,15,40,built));
const raid=[
 {name:'Engineer',hp:6500,scale:.70,kind:'boss',mechanics:[{name:'Nail Storm',type:'line',duration:1900},{name:'Rebuild Nail Guns',type:'adds',duration:900,addCount:2,addName:'Nail Gun Turret',maxActive:2,healthScale:.13,damageScale:.30,targeting:'random',attackRange:35}],interval:4200},
 {name:'Master',hp:11500,scale:.64,kind:'final',mechanics:[{name:'Shattered Floor',type:'persistent-circle',duration:1500,persistMs:7000,tickMs:1200,tickDamage:4,radius:9},{name:'Nail Gun',type:'adds',duration:900,addCount:1,addName:'Nail Gun Turret',maxActive:1,healthScale:.10,damageScale:.22,targeting:'random',attackRange:35}],interval:5200}
];
for(const stage of raid)for(let seed=0;seed<2;seed++){
 const results=[];
 for(const built of [false,true]){
  const result=C.simulate({party:raidParty(built),encounter:{
   id:'manor-'+stage.name,kind:stage.kind,level:15,recommendedItemLevel:38,
   enemies:[{name:stage.name,classification:'boss'}],enemyHealth:stage.hp,
   mechanics:stage.mechanics,mechanicIntervalMs:stage.interval,scaling:{enemyDamage:stage.scale},hardEnrageMs:178000
  },seed:'manor:'+stage.name+':'+seed,maxDurationMs:170000,tactics:{cooldownUse:'free'}});
  encounters++;checkResult(result,'Manor '+stage.name);results.push(result);
 }
 assert.equal(results[1].outcome,'victory','Talented full raid clears Manor '+stage.name);
 assert(results[1].durationMs<=results[0].durationMs*1.30,'Talents do not harm 10-player raid clear time');
}
let arena=0;
for(const size of [2,3,5]){
 const positions=[['Warrior','Protection'],['Priest','Holy'],['Mage','Arcane'],['Rogue','Assassination'],['Hunter','Marksman']];
 const roster=(side,built)=>positions.slice(0,size).map(([klass,spec],i)=>hero(klass,spec,side+i,15,38,built));
 for(const built of [false,true]){
  const session=C.createLiveSession({pvp:{mode:'arena',size,blue:roster('blue',built),red:roster('red',built)},
   encounter:{id:'balance-arena-'+size,environment:{blockers:[]}},seed:'balance-arena-'+size,maxDurationMs:30000});
  let frame;for(let i=0;i<340&&!session.finished;i++)frame=session.advance(100);
  assert(session.finished&&frame?.result,'Arena live combat concludes');
  const result=frame.result;
  encounters++;arena++;checkResult(result,'Arena '+size);
  assert(['blue','red','draw'].includes(result.pvp?.winner),'Arena produces a legal winner');
  const units=Object.fromEntries(result.finalState.players.map(x=>[x.id,x]));
  for(const e of result.events){
   if(e.type==='DAMAGE_DEALT'&&units[e.source]&&units[e.target])
    assert.notEqual(units[e.source].team,units[e.target].team,'No friendly fire in Arena');
   if(e.type==='HEAL_RECEIVED'&&units[e.source]&&units[e.target])
    assert.equal(units[e.source].team,units[e.target].team,'No cross-team healing in Arena');
  }
 }
}
console.log('Role balance PASS: 13 classes, 28 specs, '+encounters+' seeded combat simulations, 6 campaign/raid stages, 10-player Manor, '+arena+' Arena simulations (2v2/3v3/5v5).');
