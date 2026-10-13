'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('src/combat/combat-physical-v4.js','utf8'),css=fs.readFileSync('src/combat/combat-physical-v4.css','utf8');
const c={window:{CellboundCombatFX:{},addEventListener(){},matchMedia:()=>({matches:false})},document:{documentElement:{},addEventListener(){}},MutationObserver:class{observe(){}},performance:{now:()=>0},console};
vm.runInNewContext(code,c,{filename:'combat-physical-v4.js'});
const s=c.window.CellboundCombatFX.visualSignature;
assert.equal(typeof s,'function');
for(const [name,school,shape,kind] of [["Fireball","fire","pulse"],["Frostbolt","frost","pulse"],["Chain Lightning","storm","chain"],["Holy Light","holy","blossom","heal"],["Rejuvenation","nature","blossom","heal"],["Shadow Bolt","shadow","pulse"],["Chaos Bolt","fel","pulse"],["Arcane Nova","arcane","nova"],["Envenom","poison","pulse"],["Mortal Strike","steel","fracture"],["Aimed Shot","steel","pierce"],["Shield Wall","guard","guard","defense"],["Fan of Knives","steel","nova"],["Consecration","holy","nova"],["Death and Decay","shadow","nova"],["Earthquake","earth","nova"]]){
 const o=s({ability:name},kind||'damage');assert.equal(o.school,school,name);assert.equal(o.shape,shape,name);
 assert(css.includes('school-'+school));if(shape!=='pulse')assert(css.includes('shape-'+shape));
}
assert(s({ability:'Execute',result:'critical'}).major);
assert(s({ability:'Anything',payload:{majorAbility:true}}).major);
assert(code.includes("abilityImpact(scene,e,u,t,e.result==='blocked'?'defense':'damage')"));
assert(css.includes('@media(prefers-reduced-motion:reduce)'));
console.log('Combat VFX: 16 named ability styles, integration and accessibility passed.');
