'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={window:{CellboundCombatFX:{},addEventListener(){},matchMedia:()=>({matches:false})},document:{documentElement:{},addEventListener(){}},MutationObserver:class{observe(){}},performance:{now:()=>0},console};
for(const f of ['combat-data-v1','combat-physical-v4'])vm.runInNewContext(fs.readFileSync('src/combat/'+f+'.js','utf8'),c);
const data=c.window.CellboundCombatData,signature=c.window.CellboundCombatFX.visualSignature;
const before=JSON.stringify(data);let total=0;
const extended=['Death Knight','Demon Hunter','Druid','Evoker','Priest','Shaman','Warlock','Monk'];
const css=fs.readFileSync('src/combat/combat-physical-v4.css','utf8');
for(const [klass,abilities] of Object.entries(data.ABILITIES))for(const a of abilities){
 const s=signature({ability:a.name,abilityId:a.id,payload:{kind:a.kind}},a.kind==='heal'?'heal':a.kind==='defensive'?'defense':'damage',klass);
 assert(s.known,klass+' '+a.id);assert.equal(s.kind,a.kind);assert(s.school&&s.shape);total++;
 if(extended.includes(klass))assert(s.authored,klass+' '+a.id+' needs an authored class signature');
 assert(css.includes('school-'+s.school),klass+' '+a.id+' has a rendered palette');
 if(s.shape!=='pulse')assert(css.includes('shape-'+s.shape),a.id+' has a rendered shape');
 if(a.kind==='group-heal')assert(s.area,a.id+' group healing is visually distinct');
 const byId=signature({abilityId:a.id},'damage',klass),byName=signature({ability:a.name},'damage',klass);
 assert.equal(byId.school,byName.school,klass+' '+a.id+' name/ID parity');
 const periodic=signature({ability:a.name+' (DoT)'},'damage',klass);
 assert.equal(periodic.school,s.school,a.id+' periodic pulse retains school');
}
assert.equal(JSON.stringify(data),before,'presentation does not mutate combat catalogue');
for(const [klass,name,school] of [['Warrior','Mortal Strike','steel'],['Paladin','Avenger’s Shield','holy'],['Hunter','Arcane Shot','arcane'],['Rogue','Envenom','poison'],['Mage','Fireball','fire'],['Mage','Frostbolt','frost'],['Mage','Arcane Missiles','arcane']])assert.equal(signature({ability:name},'damage',klass).school,school);
assert(signature({ability:'Light of Dawn'},'heal','Paladin').area);
assert(signature({ability:'Poison (DoT)'},'damage','Rogue').periodic);
for(const [klass,id,school,shape] of [
 ['Death Knight','blood-boil','blood','fracture'],['Death Knight','breath-of-sindragosa','frost','breath'],
 ['Demon Hunter','throw-glaive','fel','glaive'],['Demon Hunter','sigil-of-flame','fire','sigil'],
 ['Druid','starfire','lunar','star'],['Druid','sunfire','solar','star'],
 ['Evoker','dream-breath','emerald','breath'],['Evoker','reversion','bronze','rune'],
 ['Priest','devouring-plague','shadow','pulse'],['Priest','smite','holy','pulse'],
 ['Shaman','chain-heal','water','chain'],['Shaman','stoneskin-totem','earth','sigil'],
 ['Warlock','incinerate','fire','pulse'],['Warlock','call-dreadstalkers','fel','sigil'],
 ['Monk','fists-of-fury','chi','fist'],['Monk','soothing-mist','mist','blossom']
]){const s=signature({abilityId:id},'damage',klass);assert.equal(s.school,school,id);assert.equal(s.shape,shape,id)}
assert(css.includes('weapon-trail'));assert(css.includes('data-fx-detail="low"'));assert(css.includes('.cbl-scene .cbl-fx.ability-impact{display:block!important;animation:none!important'));
// Every mode keeps the existing shared FX hook; no new mode-specific renderer.
for(const file of ['src/dungeons/dungeon-2d-v1.js','quests-v2.js','onboarding-v1.js','twelve-below-v1.js','src/combat/combat-viewer-v1.js'])assert(fs.readFileSync(file,'utf8').includes('combatEvent'),file);
assert(fs.readFileSync('manor-raid-v1.js','utf8').includes('playSharedEncounter'),'raid retains the shared viewer');
console.log('VFX Block 1: '+total+' active ability definitions covered; class schools, group healing, periodic feedback and immutable catalogue passed.');
