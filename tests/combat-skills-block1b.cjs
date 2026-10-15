'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {C,D}=require('../tools/combat-animation-inventory.cjs');
const css=fs.readFileSync('src/combat/combat-physical-v4.css','utf8');let total=0;
for(const [klass,abilities] of Object.entries(D.ABILITIES)){
 const identities=new Map();
 for(const a of abilities){
  const p=C.resolve(klass,{abilityId:a.id,source:'owner',target:'target',payload:{kind:a.kind}}),clip=C.clips[p.clip];
  assert(p.authored&&p.known,klass+'/'+a.id+' must never fall back');
  assert(css.includes('.skill-'+p.motif),a.id+' missing effect paint');
  assert.equal(p.abilityId,a.id);assert(clip.frames.length>=5);assert(clip.hold<clip.contact);
  let last=-1;for(const [t,pose] of clip.frames){assert(t>last,a.id+' ordered keyframes');last=t;for(const n of Object.values(pose))assert(Number.isFinite(n));assert(Math.abs(pose.step||0)<=4,'no root teleport');assert(Math.abs(pose.lean||0)<=12,'bounded torso');}
  assert.equal(last,1);assert.equal(Object.keys(clip.frames.at(-1)[1]).length,0,'neutral recovery');
  assert(clip.frames.some(([,p])=>p.mainY||p.offY||p.leg),'articulated joints');
  const key=JSON.stringify([clip.frames,p.motif,p.rhythm,p.transport]);
  assert(!identities.has(key),a.id+' visually interchangeable with '+identities.get(key));identities.set(key,a.id);total++;
  const byPayload=C.resolve(klass,{ability:a.name,payload:{abilityId:a.id}});assert.equal(byPayload.clip,p.clip,'exact spec ID survives event metadata');
 }
}
// Compare the updated engine with the baseline engine under identical input.
// Only the new presentation ID is stripped; every outcome/event otherwise must match.
const currentCode=fs.readFileSync('src/combat/combat-reborn-v1.js','utf8');
const baseline=currentCode.replace(/\n\/\/ Presentation identity only[\s\S]*?if\(action\)payload\.abilityId=action\.id;\n}/,'');
assert.equal(require('node:crypto').createHash('sha256').update(baseline.trimEnd()).digest('hex'),'29e9a7e224d256e06e4639d216e386824e690b4b7128b834438f5732a35fc53c','engine changes are restricted to the reviewed presentation metadata block');
function engine(code){const s={window:{},console};vm.createContext(s);vm.runInContext(fs.readFileSync('src/combat/combat-data-v1.js','utf8'),s);vm.runInContext(code,s);return s.window.CellboundCombatReborn}
const old=engine(baseline),current=engine(fs.readFileSync('src/combat/combat-reborn-v1.js','utf8'));
let specs=0;for(const [klass,abilities] of Object.entries(D.ABILITIES))for(const spec of new Set(abilities.map(a=>a.spec).filter(Boolean))){
 const input={party:[{id:'qa',name:'QA',class:klass,spec,level:30,power:30},{id:'heal',name:'Healer',class:'Priest',spec:'Holy',level:30,power:20}],encounter:{id:'skill-invariance',kind:'boss',enemies:['Sentinel'],enemyHealth:4000,mechanics:[]},seed:klass+spec,maxDurationMs:12000};
 const before=old.simulate(input),after=current.simulate(input);const serialize=x=>JSON.stringify(x,(key,value)=>key==='abilityId'?undefined:value);
 assert.equal(serialize(after),serialize(before),klass+'/'+spec+' gameplay unchanged');specs++;
}
console.log(total+' intentional skill choreographies and rendered motifs; '+specs+' baseline class/spec simulations match exactly.');
