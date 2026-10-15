'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const c={console};c.window=c;vm.createContext(c);
for(const f of ['gear-data.js','character-rig-v1.js','character-portraits-v1.js','character-forge-v1.js','src/combat/combat-data-v1.js','src/combat/combat-animation-catalog-v1.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
const R=c.CellboundCharacterRig,P=c.CellboundPortraits,F=c.CellboundCharacterForge,G=c.CellboundGear;
let bodies=0,poses=0;
for(const race of R.races)for(const gender of [0,1])for(const frame of [0,1,2]){
 const subject={id:'contract',race,class:'Warrior',appearance:{gender,frame,skinTone:5,marking:4,feature:3,hair:5},equipment:{}};
 const original=JSON.stringify(subject),saved=F.appearance(race,gender,subject.appearance);
 for(const key of ['frame','skinTone','marking','feature','hair'])assert.equal(saved[key],subject.appearance[key],'Forge must preserve '+key);
 for(const klass of G.CLASS_ORDER)for(let tier=1;tier<=5;tier++){
  const equipment={};for(const slot of ['Head','Chest','Shoulders','Legs','Feet','Hands','Waist','Weapon','OffHand'])equipment[slot]=G.items.find(i=>i.class===klass&&i.tier===tier&&i.slot===slot);
  const actor={...subject,class:klass,equipment},fit=R.armourFit(actor,{family:klass,tier}),base=R.equipmentPose(actor);
  for(const arm of [base.left,base.right]){const radius=Math.max(6.5,fit.profile.p.arm*.5);assert(arm.elbow.x>=radius&&arm.elbow.x+radius<=240,'Resting arm must fit the model canvas')}
  assert.equal(fit.space,'model');assert.equal(fit.revision,5);
  assert(fit.chest.top<150&&fit.chest.bottom===244,'Chest aligns with visible torso');
  assert(fit.foot.top<fit.leg.bottom,'Boots overlap trouser hems');
  assert(fit.chest.bottom>fit.waist.top,'Belt overlaps chest hem');
  const rendered=P.paperDollSVG(actor);assert(!/NaN|Infinity|undefined/.test(rendered));assert(rendered.includes('data-appearance-revision="5"'));
  assert(rendered.includes('cb-paper-pauldron-left')&&rendered.includes('cb-paper-pauldron-right'));
  for(const ability of c.CellboundCombatData.ABILITIES[klass]){
   const profile=c.CellboundCombatAnimationCatalog.resolve(klass,{abilityId:ability.id}),clip=c.CellboundCombatAnimationCatalog.clips[profile.clip];
   for(const [,channels] of clip.frames){
    const pose=R.animatedEquipmentPose(base,fit.profile.p,channels);
    for(const side of ['left','right']){const arm=pose[side];assert(Math.abs(Math.hypot(arm.elbow.x-arm.shoulder.x,arm.elbow.y-arm.shoulder.y)-arm.upper)<.05);assert(Math.abs(Math.hypot(arm.hand.x-arm.elbow.x,arm.hand.y-arm.elbow.y)-arm.lower)<.05)}
    if(pose.main)assert(Math.hypot(pose.main.x-pose.right.hand.x,pose.main.y-pose.right.hand.y)<.05,'Main grip must remain attached');
    poses++;
   }
  }
  bodies++;
 }
 assert.equal(JSON.stringify(subject),original,'No saved data mutation');
}
assert.equal(bodies,2340);
console.log('Appearance overhaul: '+bodies+' full body/class/tier fits; '+poses+' actual skill keyframe grip and bone-length checks; creation appearance preserved.');
