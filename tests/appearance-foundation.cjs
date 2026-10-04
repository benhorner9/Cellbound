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
assert.equal(P.equipmentFitVersion,3);
assert.equal(sandbox.CellboundCharacterRig.fitVersion,3);
assert.equal(P.masterRigCount,12);
assert.equal(P.raceIdentityVersion,2);

let checked=0;
for(const race of Object.keys(P.RACES))for(const gender of [0,1]){
 const appearance=P.normalizeAppearance({gender,frame:1,hair:0,facialHair:0,face:0,feature:0,marking:0},'same-seed',race);
 const c={id:'existing',name:'Keeper',race,class:'Warrior',level:15,appearance,equipment:{},inventory:[{id:'preserved'}],talents:{a:3}};
 const before=JSON.stringify(c),base=P.paperDollSVG(c,{showGear:false});
 assert(base.includes('data-character-style="classic-paper-doll"'));
 assert(base.includes('data-race-identity="v2"'));
 assert(base.includes('data-equipment-fit="v3"'));
 assert(base.includes('cb-paper-race-'+race.toLowerCase()),race+' must expose a race-specific body detail layer');
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
const identityBases=Object.keys(P.RACES).map(race=>P.paperDollSVG({id:'identity-'+race,race,class:'Warrior',appearance:{race,gender:0,frame:1,hair:0,feature:0,marking:0},equipment:{}},{showGear:false}).replace(/pd[a-z0-9]+/g,'ID').replace(/#[0-9a-f]{6}/gi,'#HEX'));
assert.equal(new Set(identityBases).size,Object.keys(P.RACES).length,'Every race must have a distinct base silhouette/detail signature');
for(const race of Object.keys(P.RACES)){
 const male=P.paperDollSVG({id:'sex-'+race,race,class:'Warrior',appearance:{race,gender:0,frame:1,hair:0,feature:0},equipment:{}},{showGear:false});
 const female=P.paperDollSVG({id:'sex-'+race,race,class:'Warrior',appearance:{race,gender:1,frame:1,hair:0,feature:0},equipment:{}},{showGear:false});
 assert.notEqual(male,female,race+' male/female bodies must remain visually distinct');
}
const profiles=Object.fromEntries(Object.keys(P.RACES).map(race=>[race,P.bodyProfile({race,appearance:{race,gender:0,frame:1}})]));
assert(profiles.Stoneborn.shoulder>profiles.Emberkin.shoulder&&profiles.Emberkin.shoulder>profiles.Thornkin.shoulder&&profiles.Thornkin.shoulder>profiles.Veyren.shoulder&&profiles.Veyren.shoulder>profiles.Nymari.shoulder&&profiles.Nymari.shoulder>profiles.Aelari.shoulder,'Race V2 shoulder silhouettes must remain deliberately separated');
assert(profiles.Stoneborn.waist-profiles.Aelari.waist>=18,'Stoneborn and Aelari torso mass must remain visually distinct');
assert(profiles.Nymari.hip>profiles.Veyren.hip&&profiles.Nymari.hip>profiles.Aelari.hip,'Nymari lower-body silhouette must remain fluid/wider through the hips');
assert(profiles.Stoneborn.hand>1.2&&profiles.Aelari.hand<.9,'Extremity scale must preserve Stoneborn mass and Aelari delicacy');
console.log('Race Identity V2 foundation: '+checked+' race/sex states; six unique race signatures, sex variants, serialization and anchors passed.');

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
