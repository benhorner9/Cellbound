'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={window:{CellboundCombatFX:{},addEventListener(){},matchMedia:()=>({matches:false})},document:{documentElement:{},addEventListener(){}},MutationObserver:class{observe(){}},performance:{now:()=>0},console};
for(const f of ['combat-data-v1','combat-physical-v4'])vm.runInNewContext(fs.readFileSync('src/combat/'+f+'.js','utf8'),c);
const data=c.window.CellboundCombatData,signature=c.window.CellboundCombatFX.visualSignature;
const before=JSON.stringify(data);let total=0;
for(const [klass,abilities] of Object.entries(data.ABILITIES))for(const a of abilities){
 const s=signature({ability:a.name,abilityId:a.id,payload:{kind:a.kind}},a.kind==='heal'?'heal':a.kind==='defensive'?'defense':'damage',klass);
 assert(s.known,klass+' '+a.id);assert.equal(s.kind,a.kind);assert(s.school&&s.shape);total++;
}
assert.equal(JSON.stringify(data),before,'presentation does not mutate combat catalogue');
for(const [klass,name,school] of [['Warrior','Mortal Strike','steel'],['Paladin','Avenger’s Shield','holy'],['Hunter','Arcane Shot','arcane'],['Rogue','Envenom','poison'],['Mage','Fireball','fire'],['Mage','Frostbolt','frost'],['Mage','Arcane Missiles','arcane']])assert.equal(signature({ability:name},'damage',klass).school,school);
assert(signature({ability:'Light of Dawn'},'heal','Paladin').area);
assert(signature({ability:'Poison (DoT)'},'damage','Rogue').periodic);
const css=fs.readFileSync('src/combat/combat-physical-v4.css','utf8');
assert(css.includes('weapon-trail'));assert(css.includes('data-fx-detail="low"'));assert(css.includes('ability-impact.still'));
// Every mode keeps the existing shared FX hook; no new mode-specific renderer.
for(const file of ['src/dungeons/dungeon-2d-v1.js','quests-v2.js','worldboss-v1.js','src/combat/combat-viewer-v1.js']){
 if(fs.existsSync(file))assert(fs.readFileSync(file,'utf8').includes('combatEvent'),file);
}
console.log('VFX Block 1: '+total+' active ability definitions covered; class schools, group healing, periodic feedback and immutable catalogue passed.');
