'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sb={window:{},console};vm.createContext(sb);
const root=path.join(__dirname,'..');
for(const name of ['src/combat/combat-data-v1.js','src/combat/pvp-ruleset-v1.js','src/combat/pvp-objectives-v1.js','src/combat/combat-reborn-v1.js','src/combat/combat-standard-v1.js','src/combat/combat-viewer-v1.js'])
 vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sb,{filename:name});
const O=sb.window.CellboundPvPObjectives,E=sb.window.CellboundCombatReborn,S=sb.window.CellboundCombatStandard,V=sb.window.CellboundCombatViewer;
assert.equal(V.profiles.pvp,'canonical-v1');assert.equal(typeof V.renderPvpFrame,'function');
const makeFrame=(now,units,events,extra={})=>({now,units,orders:{blue:{objective:'take-flag'},red:{objective:'take-flag'}},emit:(type,payload)=>events.push({type,...payload}),move:()=>{},damage:()=>{},respawn:()=>{},...extra});
{
 const a=O.create('arena',{stormStartMs:1000,stormStepMs:1000,stormDamageIntervalMs:1000,stormDamagePct:10}),ev=[],hits=[];
 const units=[{id:'outer',team:'blue',alive:true,position:{x:1,y:1}},{id:'inner',team:'red',alive:true,position:{x:50,y:50}}];
 for(let t=0;t<=4000;t+=100)O.tick(a,makeFrame(t,units,ev,{damage:u=>hits.push(u.id)}));
 assert(ev.some(e=>e.type==='PVP_STORM_SHRINK'));assert(hits.length>0&&hits.every(id=>id==='outer'));
 assert(O.snapshot(a).storm.radius<42)
}
{
 const f=O.create('capture-the-flag',{flagCaptureTarget:1,flagReturnMs:3000}),ev=[];
 const blue={id:'b',team:'blue',alive:true,role:'dps',position:{x:84,y:50}},red={id:'r',team:'red',alive:true,role:'dps',position:{x:74,y:50}};
 O.tick(f,makeFrame(0,[blue,red],ev));assert.equal(f.flags.red.holder,'b');
 blue.position={x:16,y:50};O.tick(f,makeFrame(100,[blue,red],ev));assert.equal(f.winner,'blue');assert.equal(f.score.blue,1);
 assert(ev.some(e=>e.type==='PVP_FLAG_CAPTURED'));
 const d=O.create('capture-the-flag',{flagReturnMs:3000}),log=[],runner={id:'runner',team:'blue',role:'dps',alive:true,position:{x:84,y:50}};
 O.tick(d,makeFrame(0,[runner],log));runner.alive=false;O.tick(d,makeFrame(100,[runner],log));
 assert.equal(d.flags.red.droppedAt,100);
 O.tick(d,makeFrame(3200,[runner],log));assert.equal(d.flags.red.droppedAt,null);
 assert(log.some(e=>e.type==='PVP_FLAG_DROPPED')&&log.some(e=>e.type==='PVP_FLAG_RETURNED'))
}
{
 const h=O.create('king-of-the-hill',{hillRotationMs:3000,hillScoreTarget:5}),ev=[];
 const blue={id:'b',team:'blue',alive:true,position:{x:50,y:50}},red={id:'r',team:'red',alive:true,position:{x:88,y:88}};
 for(let t=0;t<=2100;t+=100)O.tick(h,makeFrame(t,[blue,red],ev));
 assert.equal(h.score.blue,2);
 red.position={x:50,y:50};O.tick(h,makeFrame(3200,[blue,red],ev));
 assert.equal(h.hill.index,1);assert(ev.some(e=>e.type==='PVP_HILL_ROTATED'))
}
const roster=(side,n)=>[['Warrior','Protection'],['Priest','Holy'],['Mage','Arcane'],['Rogue','Assassination'],['Hunter','Marksman']].slice(0,n).map(([cl,sp],i)=>({id:side+i,name:side+cl,class:cl,spec:sp,level:12,power:16}));
for(const mode of ['arena','capture-the-flag','king-of-the-hill']){
 const n=mode==='arena'?2:5;
 const options={pvp:{mode,size:n,blue:roster('blue',n),red:roster('red',n),objectiveConfig:{stormStartMs:1000,stormStepMs:1000,hillRotationMs:4000,respawnMs:2000,hillScoreTarget:6,flagCaptureTarget:1}},seed:'objective-'+mode,maxDurationMs:26000};
 function run(){
  const match=S.createPvpSession(options,{zone:'objective-test'});let all=[],last;
  for(let i=0;i<290&&!match.finished;i++){last=match.advance(100);all.push(...last.events)}
  const final=last?.result;assert(final,'match must terminate');
  assert.equal(final.pvp.objectives.mode,mode);assert.equal(final.finalState.players.length,n*2);
  assert.equal(final.finalState.enemies.length,0);assert.equal(JSON.stringify(all),JSON.stringify(final.events));
  const index=Object.fromEntries(final.finalState.players.map(u=>[u.id,u]));
  for(const e of all.filter(e=>e.type==='DAMAGE_DEALT'&&index[e.source]&&index[e.target]))assert.notEqual(index[e.source].team,index[e.target].team,'friendly fire');
  for(const e of all.filter(e=>e.type==='HEAL_RECEIVED'&&index[e.source]&&index[e.target]))assert.equal(index[e.source].team,index[e.target].team,'enemy heal');
  return{final:JSON.stringify(final),events:all}
 }
 const a=run(),b=run();assert.equal(a.final,b.final,'same orders/seed must replay '+mode);
 if(mode==='arena'){assert(a.events.some(e=>e.type==='PVP_STORM_SHRINK'));assert(a.events.some(e=>e.type==='PVP_STORM_HIT'))}
 if(mode==='capture-the-flag'){assert(a.events.some(e=>e.type==='PVP_FLAG_PICKED_UP'));assert(a.events.some(e=>e.type==='PVP_RESPAWN'))}
 if(mode==='king-of-the-hill'){assert(a.events.some(e=>e.type==='PVP_HILL_ROTATED'));assert(a.events.some(e=>e.type==='PVP_RESPAWN'))}
}
assert.throws(()=>S.createPvpSession({pvp:{mode:'capture-the-flag',size:10,blue:roster('blue',5),red:roster('red',5)}}),/full 5-character squads/);
const self=E.tests.run();assert.equal(self.passed,self.total);
console.log('PvP objective integration passed: Arena Cellstorm, CTF pickup/capture/drop/return, KOTH uncontested score/rotation, BG respawn, deterministic shared-engine simulations, team safety, and '+self.total+' PvE self-tests.');
