'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../character-portraits-v1.js'),'utf8'),sandbox);
const P=sandbox.window.CellboundPortraits;
// Strip definition identifiers: a control must alter geometry, not just an SVG ID.
const geometry=s=>s.replace(/pd[a-z0-9]+/g,'ID');
let checked=0;
for(const race of Object.keys(P.RACES))for(const gender of [0,1])for(const frame of [0,1,2]){
 const appearance=P.normalizeAppearance({gender,frame,hair:1,facialHair:0,face:1,feature:1,marking:0},'same-seed',race);
 const c={id:'existing',name:'Keeper',race,class:'Warrior',level:15,appearance,equipment:{},inventory:[{id:'preserved'}],talents:{a:3}};
 const before=JSON.stringify(c),base=geometry(P.paperDollSVG(c,{showGear:false}));
 assert.equal(base,geometry(P.paperDollSVG({...c,class:'Mage'},{showGear:false})), 'Class must not change anatomy');
 assert.equal(JSON.stringify(c),before,'Rendering must not mutate character data');
 assert.equal(base,geometry(P.paperDollSVG(JSON.parse(before),{showGear:false})),'Appearance survives serialization');
 for(const field of ['face','brows','nose','mouth','hair','hairColor','skinTone','eyes','marking','feature','glow']){
  const next={...c,appearance:{...appearance,[field]:(appearance[field]+1)%P.COUNTS[field]}};
  assert.notEqual(base,geometry(P.paperDollSVG(next,{showGear:false})),race+' '+gender+' control is visible: '+field);
 }
 assert(!P.paperDollSVG({...c,appearance:{...appearance,hair:0}},{showGear:false}).includes('data-appearance-part="hair"><path'),'Bald must remove hair');
 const helmet={slot:'Head',class:'Warrior',tier:2,name:'Iron Helm'};
 assert.equal(P.equipmentCoverage({...c,equipment:{Head:helmet}}).hair,true);
 assert(!P.paperDollSVG({...c,equipment:{Head:helmet}}).includes('data-appearance-part="hair"'));
 assert.equal(P.equipmentCoverage({...c,equipment:{Head:{...helmet,class:'Mage'}}}).hair,false);
 for(const anchor of Object.values(P.anatomicalAnchors(c)))assert(Number.isFinite(anchor.x)&&Number.isFinite(anchor.y));
 const portrait=P.portraitHTML(c);
 assert(portrait.includes('viewBox="65 0 110 95"')||portrait.includes('viewBox="65 15 110 110"'));
 assert(portrait.includes('cb-illustrated-base'));
 assert(!portrait.includes('cb-paper-slot-head'),'Portraits consistently omit helmets');
 checked++;
}
const legacy={id:'old',race:'Nymari',name:'Unchanged',level:30,class:'Hunter',equipment:{Weapon:{id:'bow'}},inventory:['x'],talents:{tree:2}};
const preserved=JSON.stringify(legacy);P.applyToCharacter(legacy);const {appearance,...rest}=legacy;
assert.equal(JSON.stringify(rest),preserved);assert.equal(appearance.appearanceVersion,1);
assert.equal(JSON.stringify(P.normalizeAppearance(appearance,'old','Nymari')),JSON.stringify(appearance));
console.log('Appearance foundation: '+checked+' race/sex/frame combinations; visible controls, class independence, non-destructive defaults, serialization, shared portraits and helmet coverage passed.');
