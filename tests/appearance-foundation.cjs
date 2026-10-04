'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={window:{}};vm.createContext(sandbox);
for(const file of ['item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../'+file),'utf8'),sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../character-portraits-v1.js'),'utf8'),sandbox);
const P=sandbox.window.CellboundPortraits;
assert.equal(P.version,14);
assert.equal(P.modelContract,'v14-character-forge-bases');
assert.equal(P.baseArtContract,'character-forge-v1');

const geometry=s=>s.replace(/pd[a-z0-9]+/g,'ID').replace(/data-frame="[^"]+"/g,'data-frame="FRAME"');
const hiddenFields=['frame','skinTone','face','brows','nose','mouth','hair','hairColor','facialHair','eyes','marking','feature','glow','pattern','featureColor','texture','eyeShape'];
let checked=0;
for(const race of Object.keys(P.RACES))for(const gender of [0,1]){
 const appearance=P.normalizeAppearance({gender,frame:1,hair:0,facialHair:0,face:0,feature:0,marking:0},'same-seed',race);
 const c={id:'existing',name:'Keeper',race,class:'Warrior',level:15,appearance,equipment:{},inventory:[{id:'preserved'}],talents:{a:3}};
 const before=JSON.stringify(c),base=geometry(P.paperDollSVG(c,{showGear:false}));
 assert(base.includes('data-base-art="character-forge-v1"'),race+' uses Character Forge base art');
 assert(base.includes('./assets/characters/forge-bases/'+race.toLowerCase()+'-'+(gender?'female':'male')+'.png'),race+' '+gender+' uses the correct base asset');
 assert(fs.existsSync(path.join(__dirname,'..','assets/characters/forge-bases/'+race.toLowerCase()+'-'+(gender?'female':'male')+'.png')));
 assert.equal(base,geometry(P.paperDollSVG({...c,class:'Mage'},{showGear:false})),'Class must not change the Forge base');
 assert.equal(JSON.stringify(c),before,'Rendering must not mutate character data');
 assert.equal(base,geometry(P.paperDollSVG(JSON.parse(before),{showGear:false})),'Forge base survives serialization');
 for(const field of hiddenFields){
  const count=P.COUNTS[field]||2,nextValue=(Number(appearance[field]||0)+1)%count;
  const next={...c,appearance:{...appearance,[field]:nextValue}};
  assert.equal(base,geometry(P.paperDollSVG(next,{showGear:false})),race+' '+gender+' hidden V1 field must not alter base art: '+field);
 }
 const otherGender={...c,appearance:{...appearance,gender:gender?0:1}};
 assert.notEqual(base,geometry(P.paperDollSVG(otherGender,{showGear:false})),race+' male/female must use different base assets');
 const helmet={slot:'Head',class:'Warrior',tier:2,name:'Iron Helm'};
 assert.equal(P.equipmentCoverage({...c,equipment:{Head:helmet}}).hair,true);
 for(const anchor of Object.values(P.anatomicalAnchors(c)))assert(Number.isFinite(anchor.x)&&Number.isFinite(anchor.y));
 const portrait=P.portraitHTML(c);
 assert(portrait.includes('viewBox="65 0 110 95"')||portrait.includes('viewBox="65 15 110 110"'));
 assert(portrait.includes('cb-forge-base'));
 assert(!portrait.includes('cb-paper-slot-head'),'Portraits consistently omit helmets');
 checked++;
}
const legacy={id:'old',race:'Nymari',name:'Unchanged',level:30,class:'Hunter',equipment:{Weapon:{id:'bow'}},inventory:['x'],talents:{tree:2}};
const preserved=JSON.stringify(legacy);P.applyToCharacter(legacy);const {appearance,...rest}=legacy;
assert.equal(JSON.stringify(rest),preserved);assert.equal(appearance.appearanceVersion,1);
console.log('Character Forge foundation: '+checked+' race/sex bases; class independence, hidden-field invariance, serialization, shared portraits and anchors passed.');

for(const race of Object.keys(P.RACES))for(const gender of [0,1])for(const frame of [0,1,2])for(const klass of ['Warrior','Paladin','Hunter','Rogue','Mage'])for(const tier of [1,2,3,4,5]){
 const c={id:'slot-fit',race,class:klass,appearance:{gender,frame},equipment:{}};
 for(const slot of ['Chest','Shoulders','Waist']){
  c.equipment={[slot]:{id:klass+'-'+slot+'-'+tier,slot,class:klass,tier}};
  const svg=P.paperDollSVG(c);
  assert.equal(svg.includes('cb-paper-back-layer'),false,klass+' '+slot+' must own only its intended clothing');
  assert(!/NaN|Infinity/.test(svg));
  if(slot==='Waist'&&klass==='Mage')assert(svg.includes('data-waist-design="short-sash"'));
 }
}
console.log('Armour slot ownership: 2,700 race/sex/build/class/tier/slot combinations passed.');
