'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),sandbox={window:{},document:{documentElement:{}},MutationObserver:class{observe(){}},console};vm.createContext(sandbox);
for(const f of ['character-rig-v1.js','src/combat/combat-animation-catalog-v1.js','src/combat/combat-animation-v1.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox);
const R=sandbox.window.CellboundCharacterRig,A=sandbox.window.CellboundCombatAnimation;
let cases=0;
for(const race of R.races)for(const gender of [0,1])for(const frame of [0,1,2])for(const kind of Object.keys(R.weaponProfiles)){
 const c={race,appearance:{gender,frame},equipment:{Weapon:{weaponType:kind,name:kind},OffHand:{name:'shield'}}},p=R.bodyProfile(c),base=R.equipmentPose(c);
 for(const clip of Object.keys(A.clips))for(let i=0;i<=16;i++){
  const pose=R.animatedEquipmentPose(base,p,A.sample(clip,i/16));
  for(const side of ['left','right']){
   const arm=pose[side];assert(Math.abs(Math.hypot(arm.elbow.x-arm.shoulder.x,arm.elbow.y-arm.shoulder.y)-arm.upper)<.001,`${race} ${kind} upper bone stretched`);
   assert(Math.abs(Math.hypot(arm.elbow.x-arm.hand.x,arm.elbow.y-arm.hand.y)-arm.lower)<.001,`${race} ${kind} lower bone stretched`);
  }
  assert(Math.hypot(pose.main.x-pose.right.hand.x,pose.main.y-pose.right.hand.y)<.001,'main socket follows wrist');
  if(pose.twoHanded){const h=R.transformPoint(pose.main,pose.main.support);assert(Math.hypot(h.x-pose.left.hand.x,h.y-pose.left.hand.y)<.001,JSON.stringify({race,gender,frame,kind,clip,i,support:h,hand:pose.left.hand,base:base.left}))}
  else assert.deepEqual(R.transformPoint(pose.off,pose.off.grip),pose.left.hand,'shield follows wrist');
  assert.equal(pose.main.scale,base.main.scale,'animation never rescales weapon');cases++;
 }
 assert.equal(JSON.stringify(base),JSON.stringify(R.equipmentPose(c)),'sampling cannot mutate equipment');
}
for(const file of ['src/combat/combat-reborn-v1.js','src/combat/combat-standard-v1.js'])assert(!fs.readFileSync(path.join(root,file),'utf8').includes('CellboundCombatAnimation'),'simulation never depends on animation');
console.log(`Combat animation rig: ${cases} poses across six races, both sexes, three frames and every weapon profile; fixed bones, shared grip, support hand, scale and no equipment mutation.`);
