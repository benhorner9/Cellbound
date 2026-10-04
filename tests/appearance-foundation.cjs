'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={window:{}};sandbox.window=sandbox;vm.createContext(sandbox);
for(const file of ['item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../'+file),'utf8'),sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../character-portraits-v1.js'),'utf8'),sandbox);
const P=sandbox.CellboundPortraits;
assert.equal(P.version,15);
assert.equal(P.modelContract,'classic-paper-doll-v1');
assert.equal(P.baseArtContract,'classic-paper-doll-v1');
assert.equal(P.rigContract,'master-rig-v1');
assert.equal(P.masterRigCount,12);

let checked=0;
for(const race of Object.keys(P.RACES))for(const gender of [0,1]){
 const appearance=P.normalizeAppearance({gender,frame:1,hair:0,facialHair:0,face:0,feature:0,marking:0},'same-seed',race);
 const c={id:'existing',name:'Keeper',race,class:'Warrior',level:15,appearance,equipment:{},inventory:[{id:'preserved'}],talents:{a:3}};
 const before=JSON.stringify(c),base=P.paperDollSVG(c,{showGear:false});
 assert(base.includes('data-character-style="classic-paper-doll"'));
 assert(base.includes('data-base-art="classic-paper-doll-v1"'));
 assert(base.includes('data-model-mode="base"'));
 assert(!base.includes('assets/characters/forge-bases/'));
 assert(!base.includes('cb-forge-base'));
 assert.equal(JSON.stringify(c),before,'Rendering must not mutate character data');
 const mageBase=P.paperDollSVG({...c,class:'Mage'},{showGear:false});
 assert(mageBase.includes('data-model-mode="base"')&&mageBase.includes('data-character-style="classic-paper-doll"'),'Class accent may change the stage glow but must keep the same classic base renderer');
 const helmet={slot:'Head',class:'Warrior',tier:2,name:'Iron Helm'};
 assert.equal(P.equipmentCoverage({...c,equipment:{Head:helmet}}).hair,true);
 const anchors=P.anatomicalAnchors(c);for(const a of Object.values(anchors))assert(Number.isFinite(a.x)&&Number.isFinite(a.y));
 const portrait=P.portraitHTML(c);assert(portrait.includes('<svg'));
 checked++;
}
console.log('Classic paper-doll foundation: '+checked+' race/sex states; clean base, class independence, serialization and anchors passed.');

for(const race of Object.keys(P.RACES))for(const gender of [0,1])for(const frame of [0,1,2])for(const klass of ['Warrior','Paladin','Hunter','Rogue','Mage'])for(const tier of [1,2,3,4,5]){
 const c={id:'slot-fit',race,class:klass,appearance:{gender,frame},equipment:{}};
 for(const slot of ['Chest','Shoulders','Waist']){
  c.equipment={[slot]:{id:klass+'-'+slot+'-'+tier,itemId:klass+'-'+slot+'-'+tier,slot,class:klass,tier}};
  const svg=P.paperDollSVG(c);
  assert(svg.includes('data-character-style="classic-paper-doll"'));
  assert(svg.includes('cb-paper-slot-'+slot.toLowerCase()),'Missing classic slot '+slot);
  assert(!/NaN|Infinity|undefined/.test(svg));
 }
}
console.log('Classic armour slot coverage: 2,700 race/sex/build/class/tier/slot combinations passed.');
