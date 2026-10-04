(()=>{
'use strict';

/*
 * Cellbound Master Character Rig V1
 * ---------------------------------
 * One authoritative anatomical contract for the 12 race/sex base bodies.
 * Class, equipment tier and item art never alter the master body itself.
 * Lean/Balanced/Strong remain appearance choices, but are lightweight
 * deformations of a canonical race/sex rig rather than extra body masters.
 */
const VERSION=2;
const FIT_VERSION=2;
const CONTRACT='master-rig-v1';
const CANVAS=Object.freeze({width:240,height:410,viewBox:'0 0 240 410',centerX:120});
const RACES=Object.freeze(['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari']);
const SEXES=Object.freeze(['male','female']);
const REQUIRED_ANCHORS=Object.freeze([
  'head','crown','hairline','face','neck',
  'leftShoulder','rightShoulder','chest','waist','leftHip','rightHip',
  'leftHand','rightHand','mainHand','offHand','back',
  'leftKnee','rightKnee','leftAnkle','rightAnkle','leftFoot','rightFoot'
]);
const LAYER_ORDER=Object.freeze([
  'base','markings','hair-back','shield-back','armour','hair-front','front-offhand','mainhand-front','effects'
]);

const RACE_GEOMETRY=Object.freeze({
  // Race Identity V2 deliberately pushes the underlying anatomy apart. These
  // values are also the source of truth for equipment fitting, so stronger
  // silhouettes do not reintroduce the old "one body, many skins" problem.
  Stoneborn:{shoulder:64,waist:40,hip:44,leg:21,arm:19.5,neck:23,headScale:1.10,hand:1.25},
  Aelari:{shoulder:37,waist:21,hip:27,leg:10.5,arm:8.8,neck:9.5,headScale:.94,hand:.86},
  Thornkin:{shoulder:53,waist:30,hip:35,leg:16.5,arm:14.8,neck:15.5,headScale:1.03,hand:1.04},
  Emberkin:{shoulder:55,waist:29,hip:32,leg:15.2,arm:14.7,neck:15.5,headScale:1.04,hand:1.06},
  Nymari:{shoulder:43,waist:27,hip:34,leg:14,arm:11.5,neck:12.5,headScale:1.01,hand:.96},
  Veyren:{shoulder:45,waist:25.5,hip:30,leg:12.8,arm:11.1,neck:12.5,headScale:.98,hand:.95}
});
const SEX_SCALE=Object.freeze({
  male:{shoulder:1,waist:1,hip:1,leg:1,arm:1,neck:1,headScale:1,hand:1},
  female:{shoulder:.95,waist:.94,hip:1.04,leg:1,arm:.94,neck:.94,headScale:1,hand:.96}
});
const FRAME_DEFORM=Object.freeze([
  Object.freeze({id:'lean',label:'Lean',shoulder:.93,waist:.92,hip:.96,leg:.94,arm:.88,neck:.95,headScale:1.01,hand:.96,x:.94}),
  Object.freeze({id:'balanced',label:'Balanced',shoulder:1,waist:1,hip:1,leg:1,arm:1,neck:1,headScale:1,hand:1,x:1}),
  Object.freeze({id:'strong',label:'Strong',shoulder:1.10,waist:1.06,hip:1.04,leg:1.08,arm:1.16,neck:1.07,headScale:.99,hand:1.07,x:1.06})
]);

// Measurements taken from the approved painted base images in the final 240 x 410 canvas.
const CALIBRATION=Object.freeze({
  // V13 master-vector bodies are authored from the same anatomy formula used by the
  // rig. Hand/helmet anchors therefore follow the actual illustrated silhouette
  // rather than the retired raster mannequin measurements.
  Veyren:{
    male:{hand:[69.7,170.3,238],head:[120,20,41]},female:{hand:[78.6,161.4,238],head:[120,20,37]}
  },
  Stoneborn:{
    male:{hand:[55.8,184.2,238],head:[120,18.4,43.5]},female:{hand:[67.2,172.8,238],head:[120,18.4,39.2]}
  },
  Aelari:{
    male:{hand:[72.9,167.1,238],head:[120,20,41]},female:{hand:[81.3,158.7,238],head:[120,20,37]}
  },
  Thornkin:{
    male:{hand:[66.5,173.5,238],head:[120,20,41]},female:{hand:[76,164,238],head:[120,20,37]}
  },
  Emberkin:{
    male:{hand:[63.3,176.7,238],head:[120,20,41]},female:{hand:[73.4,166.6,238],head:[120,20,37]}
  },
  Nymari:{
    male:{hand:[70.8,169.2,238],head:[120,20,41]},female:{hand:[79.5,160.5,238],head:[120,20,37]}
  }
});

const RACE_FIT=Object.freeze({
  Veyren:{width:.97,chestY:0,shoulderY:0},
  Stoneborn:{width:1.08,chestY:1,shoulderY:2},
  Aelari:{width:.92,chestY:-1,shoulderY:-1},
  Thornkin:{width:1.03,chestY:1,shoulderY:1},
  Emberkin:{width:1.04,chestY:0,shoulderY:0},
  Nymari:{width:.98,chestY:0,shoulderY:0}
});
const FAMILY_FIT=Object.freeze({
  warrior:{chest:.90,shoulder:1},
  paladin:{chest:.92,shoulder:1.04},
  hunter:{chest:.84,shoulder:.91},
  rogue:{chest:.80,shoulder:.82},
  mage:{chest:.85,shoulder:.88}
});

function clamp(n,min,max){return Math.max(min,Math.min(max,Number(n)||0))}
function raceOf(subject,override){const race=override?.race||(typeof subject==='string'?subject:subject?.race||subject?.appearance?.race)||'Veyren';return RACES.includes(race)?race:'Veyren'}
function genderIndex(subject,override){
  const raw=override?.gender??subject?.appearance?.gender??subject?.gender??0;
  return Number(raw)===1?1:0;
}
function sexName(subject,override){return genderIndex(subject,override)?'female':'male'}
function frameIndex(subject,override){return clamp(Math.round(Number(override?.frame??subject?.appearance?.frame??subject?.frame??1)),0,2)}
function rigY(y){
  const n=Number(y)||0;
  return n<=110?n*.8-16:n<=247?72+(n-110)*107/137:n<=283?179+(n-247)*59/36:238+(n-283)*172/127;
}
function unrigY(y){
  const n=Number(y)||0;
  return n<=72?(n+16)/.8:n<=179?110+(n-72)*137/107:n<=238?247+(n-179)*36/59:283+(n-238)*127/172;
}
function scaleMeasurements(race,sex,frame){
  const base=RACE_GEOMETRY[race]||RACE_GEOMETRY.Veyren;
  const gs=SEX_SCALE[sex]||SEX_SCALE.male;
  const fs=FRAME_DEFORM[frame]||FRAME_DEFORM[1];
  const out={gender:sex==='female'?1:0,frame};
  for(const key of ['shoulder','waist','hip','leg','arm','neck','headScale','hand'])out[key]=base[key]*gs[key]*fs[key];
  return out;
}
function canonicalMeasurements(race,sex){return scaleMeasurements(race,sex,1)}
function masterKey(race,sex){return String(race).toLowerCase()+':'+sex}

function canonicalAnchors(race,sex){
  const p=canonicalMeasurements(race,sex),cal=CALIBRATION[race][sex],female=sex==='female';
  const shoulderY=rigY(race==='Stoneborn'?130:female?133:131);
  const chestTop=rigY(female?121:119),chestBottom=rigY(252),waistY=rigY(247);
  const leftShoulder=120-p.shoulder,rightShoulder=120+p.shoulder;
  const leftHip=120-p.hip*.47,rightHip=120+p.hip*.47;
  const handReach=Math.max(5.5,p.arm*.50);
  const leftHand=leftShoulder-handReach,rightHand=rightShoulder+handReach;
  return {
    head:{x:cal.head[0],y:cal.head[1]+20},
    crown:{x:cal.head[0],y:cal.head[1]},
    hairline:{x:cal.head[0],y:cal.head[1]+24},
    face:{x:cal.head[0],y:76},
    neck:{x:120,y:rigY(112)},
    leftShoulder:{x:leftShoulder,y:shoulderY},rightShoulder:{x:rightShoulder,y:shoulderY},
    chest:{x:120,y:(chestTop+chestBottom)/2},
    waist:{x:120,y:waistY},
    leftHip:{x:leftHip,y:rigY(257)},rightHip:{x:rightHip,y:rigY(257)},
    leftHand:{x:leftHand,y:rigY(283)},rightHand:{x:rightHand,y:rigY(283)},
    mainHand:{x:rightHand,y:rigY(283)},offHand:{x:leftHand,y:rigY(283)},
    back:{x:120,y:rigY(150)},
    leftKnee:{x:leftHip,y:rigY(322)},rightKnee:{x:rightHip,y:rigY(322)},
    leftAnkle:{x:leftHip,y:rigY(365)},rightAnkle:{x:rightHip,y:rigY(365)},
    leftFoot:{x:leftHip,y:rigY(380)},rightFoot:{x:rightHip,y:rigY(380)}
  };
}
function masterBounds(race,sex){
  const p=canonicalMeasurements(race,sex),a=canonicalAnchors(race,sex),fit=RACE_FIT[race]||RACE_FIT.Veyren;
  return {
    head:{x:a.crown.x-calibration(race,sex).head[2]*.72,y:Math.max(0,a.crown.y-7),w:calibration(race,sex).head[2]*1.44,h:62},
    chest:{x:120-p.shoulder*.92*fit.width,y:rigY(sex==='female'?121:119)+fit.chestY,w:p.shoulder*1.84*fit.width,h:112},
    waist:{x:120-Math.max(p.waist*1.15,p.hip*.78)*fit.width,y:rigY(247)-4,w:Math.max(p.waist*2.3,p.hip*1.56)*fit.width,h:22},
    hands:{left:{x:a.leftHand.x-p.hand*9.5,y:a.leftHand.y-32,w:p.hand*19,h:43},right:{x:a.rightHand.x-p.hand*9.5,y:a.rightHand.y-32,w:p.hand*19,h:43}},
    feet:{left:{x:a.leftFoot.x-p.leg*.74,y:rigY(348),w:p.leg*1.48,h:399-rigY(348)},right:{x:a.rightFoot.x-p.leg*.74,y:rigY(348),w:p.leg*1.48,h:399-rigY(348)}}
  };
}
function calibration(race,sex){return CALIBRATION[race]?.[sex]||CALIBRATION.Veyren.male}
function buildMaster(race,sex){
  const a=canonicalAnchors(race,sex),p=canonicalMeasurements(race,sex);
  return Object.freeze({
    id:masterKey(race,sex),race,sex,
    canvas:CANVAS,
    baseAsset:'./assets/characters/forge-bases/'+race.toLowerCase()+'-'+sex+'.png',
    measurements:Object.freeze({...p}),
    calibration:Object.freeze({
      hand:Object.freeze([...calibration(race,sex).hand]),
      head:Object.freeze([...calibration(race,sex).head])
    }),
    anchors:Object.freeze(Object.fromEntries(Object.entries(a).map(([k,v])=>[k,Object.freeze({...v})]))),
    bounds:Object.freeze(masterBounds(race,sex))
  });
}
const MASTER_RIGS=Object.freeze(Object.fromEntries(RACES.flatMap(r=>SEXES.map(s=>[masterKey(r,s),buildMaster(r,s)]))));

function masterRig(subject,override){
  const race=raceOf(subject,override),sex=sexName(subject,override);
  return MASTER_RIGS[masterKey(race,sex)];
}
function bodyProfile(subject,appearanceOverride){
  return scaleMeasurements(raceOf(subject,appearanceOverride),sexName(subject,appearanceOverride),frameIndex(subject,appearanceOverride));
}

// Compatibility fit profile used by the renderer. X is anatomical; legacy Y values
// remain available to older slot code while final-canvas anchors come from anchors().
function gearFitProfile(subject){
  const race=raceOf(subject),p=bodyProfile(subject),sex=sexName(subject),gender=p.gender,frame=p.frame;
  const shoulderY=race==='Stoneborn'?130:gender===1?133:131;
  const leftShoulder=120-p.shoulder,rightShoulder=120+p.shoulder;
  const handReach=Math.max(5.5,p.arm*.50);
  const leftHand=leftShoulder-handReach,rightHand=rightShoulder+handReach;
  const handY=283;
  const hipHalf=p.hip,waistHalf=Math.max(p.waist,p.hip*.70);
  return {
    race,gender,frame,p,centerX:120,shoulderY,
    leftShoulder,rightShoulder,leftHand,rightHand,handY,
    waistY:247,waistHalf,hipHalf,
    leftLeg:120-p.hip*.47,rightLeg:120+p.hip*.47,
    legHalf:Math.max(10.5,p.leg*.82),calfHalf:Math.max(8.2,p.leg*.62),footHalf:Math.max(10,p.leg*.72),
    chestTop:gender===1?121:119,chestBottom:252,
    weaponX:rightHand,offhandX:leftHand,
    headGearScaleX:(gender===1?.94:1)*([.94,1,1.05,.98][subject?.appearance?.face]||1)
  };
}
function anchors(subject){
  const race=raceOf(subject),sex=sexName(subject),frame=frameIndex(subject),m=masterRig(subject),p=bodyProfile(subject),d=FRAME_DEFORM[frame],f=gearFitProfile(subject);
  const x=x=>120+(x-120)*d.x;
  const a=Object.fromEntries(Object.entries(m.anchors).map(([k,v])=>[k,{x:x(v.x),y:v.y}]));
  const shoulderY=rigY(race==='Stoneborn'?130:sex==='female'?133:131);
  a.leftShoulder={x:f.leftShoulder,y:shoulderY};a.rightShoulder={x:f.rightShoulder,y:shoulderY};
  a.leftHand={x:f.leftHand,y:rigY(f.handY)};a.rightHand={x:f.rightHand,y:rigY(f.handY)};
  a.mainHand={...a.rightHand};a.offHand={...a.leftHand};
  a.leftHip={x:120-p.hip*.47,y:rigY(257)};a.rightHip={x:120+p.hip*.47,y:rigY(257)};
  a.leftKnee={x:a.leftHip.x,y:rigY(322)};a.rightKnee={x:a.rightHip.x,y:rigY(322)};
  a.leftAnkle={x:a.leftHip.x,y:rigY(365)};a.rightAnkle={x:a.rightHip.x,y:rigY(365)};
  a.leftFoot={x:a.leftHip.x,y:rigY(380)};a.rightFoot={x:a.rightHip.x,y:rigY(380)};
  return a;
}
function anchor(subject,name){return anchors(subject)[name]||null}
function headRig(subject){
  const race=raceOf(subject),sex=sexName(subject),cal=calibration(race,sex);
  return {centerX:cal.head[0],crownY:cal.head[1],width:cal.head[2]};
}
function hairFit(appearance,raceOverride){
  const race=RACES.includes(raceOverride)?raceOverride:raceOf(appearance),sex=Number(appearance?.gender)===1?'female':'male';
  const h=calibration(race,sex).head,face=[.94,1,1.05,.98][appearance?.face]||1;
  return 'translate('+(120+(h[0]-120)*face)+' '+((h[1]-2+16)/.8)+') scale('+(h[2]/50*face)+' .8) translate(-120 -36)';
}

function fitSlot(subject,slot,options){
  const f=gearFitProfile(subject),p=f.p,race=f.race,frame=f.frame;
  const opts=options||{},family=String(opts.family||'warrior').toLowerCase(),tier=clamp(Math.round(opts.tier||1),1,5);
  const rf=RACE_FIT[race]||RACE_FIT.Veyren,ff=FAMILY_FIT[family]||FAMILY_FIT.warrior;
  const topBase=rigY(f.chestTop),waistBase=rigY(f.waistY),chestBottom=Math.min(rigY(f.chestBottom),waistBase+12);
  if(slot==='Chest'){
    const width=p.shoulder*2*ff.chest*rf.width,top=topBase+rf.chestY,bottom=chestBottom+(family==='mage'?3:family==='paladin'?2:0);
    return{x:120-width/2,y:top,w:width,h:Math.max(98,bottom-top),top,bottom};
  }
  if(slot==='Waist'){
    const width=Math.max(p.waist*2.25,p.hip*1.55)*rf.width,y=waistBase-4;
    return{x:120-width/2,y,w:width,h:family==='mage'?22:18};
  }
  if(slot==='Shoulders'){
    const width=p.arm*2.35*ff.shoulder*(race==='Stoneborn'?1.08:1),h=(32+(tier-1)*1.4)*(family==='paladin'?1.06:1);
    const inset=family==='rogue'?4:family==='mage'?5:family==='hunter'?4:6;
    const leftCenter=f.leftShoulder+inset,rightCenter=f.rightShoulder-inset,y=rigY(f.shoulderY)-h*.32+rf.shoulderY;
    return{leftX:leftCenter-width/2,rightX:rightCenter-width/2,y,w:width,h,leftCenter,rightCenter};
  }
  if(slot==='Legs'){
    const width=p.hip*2.12*(race==='Stoneborn'?1.03:1),y=waistBase-1,bottom=rigY(356);
    return{x:120-width/2,y,w:width,h:Math.max(150,bottom-y)+(family==='mage'?28:0)};
  }
  if(slot==='Feet'){
    const width=f.footHalf*2.05,y=rigY(348),bottom=399;
    return{leftX:f.leftLeg-width/2,rightX:f.rightLeg-width/2,y,w:width,h:bottom-y};
  }
  if(slot==='Hands'){
    const width=p.hand*19,y=rigY(f.handY)-32;
    return{leftX:f.leftHand-width/2,rightX:f.rightHand-width/2,y,w:width,h:43};
  }
  if(slot==='Head'){
    const h=headRig(subject),face=[.94,1,1.05,.98][subject?.appearance?.face]||1,w=h.width*1.28*face;
    return{x:120+(h.centerX-120)*face-w/2,y:h.crownY-7,w,h:55};
  }
  if(slot==='Back'){
    const a=anchors(subject),w=p.shoulder*2.05,h=Math.max(120,rigY(330)-a.back.y);
    return{x:120-w/2,y:a.back.y-8,w,h};
  }
  return null;
}
function equipmentCoverage(subject){
  const head=subject?.equipment?.Head;
  return {hair:Boolean(head),growth:Boolean(head)};
}
function resolve(subject){
  return {contract:CONTRACT,master:masterRig(subject),frame:FRAME_DEFORM[frameIndex(subject)],profile:bodyProfile(subject),anchors:anchors(subject)};
}
function validateAll(){
  const errors=[];
  const rigs=Object.values(MASTER_RIGS);
  if(rigs.length!==12)errors.push('Expected 12 master rigs, found '+rigs.length);
  for(const rig of rigs){
    for(const name of REQUIRED_ANCHORS){
      const a=rig.anchors[name];
      if(!a||!Number.isFinite(a.x)||!Number.isFinite(a.y))errors.push(rig.id+': missing/invalid anchor '+name);
      else if(a.x<0||a.x>CANVAS.width||a.y<0||a.y>CANVAS.height)errors.push(rig.id+': anchor out of bounds '+name);
    }
    if(!(rig.anchors.leftShoulder.x<rig.anchors.rightShoulder.x))errors.push(rig.id+': shoulder order invalid');
    if(!(rig.anchors.leftHand.x<rig.anchors.rightHand.x))errors.push(rig.id+': hand order invalid');
    if(!(rig.anchors.leftFoot.x<rig.anchors.rightFoot.x))errors.push(rig.id+': foot order invalid');
    for(const frame of [0,1,2]){
      const subject={race:rig.race,appearance:{gender:rig.sex==='female'?1:0,frame}};
      for(const slot of ['Head','Shoulders','Chest','Hands','Waist','Legs','Feet']){
        const b=fitSlot(subject,slot,{family:'warrior',tier:1});
        if(!b)errors.push(rig.id+': no fit for '+slot);
        else for(const key of ['y','w','h'])if(!Number.isFinite(b[key]))errors.push(rig.id+': invalid '+slot+' '+key);
      }
    }
  }
  return {ok:errors.length===0,count:rigs.length,contract:CONTRACT,errors};
}

window.CellboundCharacterRig=Object.freeze({
  version:VERSION,fitVersion:FIT_VERSION,contract:CONTRACT,canvas:CANVAS,races:RACES,sexes:SEXES,
  requiredAnchors:REQUIRED_ANCHORS,layerOrder:LAYER_ORDER,frameDeform:FRAME_DEFORM,
  masterRigCount:12,masterRigs:MASTER_RIGS,
  masterKey,masterRig,resolve,bodyProfile,gearFitProfile,anchors,anchor,
  rigY,unrigY,headRig,hairFit,fitSlot,equipmentCoverage,validateAll
});
})();
