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
const VERSION=3;
const FIT_VERSION=4;
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
  'equipment-back','base','markings','hair-back','armour','forearms','hair-front','shield-front','front-offhand','mainhand-side','fingers','effects'
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

// Legacy head/armour calibration retained for compatibility; active hand sockets
// come only from equipmentPose in the renderer canvas below.
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
  warrior:{chest:.91,shoulder:1.00},
  paladin:{chest:.93,shoulder:1.04},
  priest:{chest:.83,shoulder:.85},
  druid:{chest:.86,shoulder:.90},
  hunter:{chest:.85,shoulder:.91},
  rogue:{chest:.80,shoulder:.82},
  mage:{chest:.82,shoulder:.84},
  shaman:{chest:.88,shoulder:.94},
  warlock:{chest:.83,shoulder:.86},
  monk:{chest:.82,shoulder:.84},
  'death-knight':{chest:.94,shoulder:1.06},
  'demon-hunter':{chest:.82,shoulder:.85},
  evoker:{chest:.87,shoulder:.92}
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
// All equipment sockets use the active SVG's 240 x 410 coordinates. The old
// rigY/unrigY mapping remains only for legacy armour bounds, never attachments.
const WEAPON_PROFILES=Object.freeze({
  sword:{grip:[199.82,279],scale:.78,angle:12},
  greatsword:{grip:[199.82,279],support:[201.18,299],scale:.88,angle:28,twoHanded:true},
  axe:{grip:[204.69,279],scale:.82,angle:-10},
  hammer:{grip:[204.87,279],scale:.82,angle:-8},
  mace:{grip:[204.63,279],scale:.82,angle:-10},
  dagger:{grip:[202.42,279],scale:.9,angle:-18},
  staff:{grip:[198.63,220],support:[200.18,250],scale:.98,angle:0},
  spear:{grip:[199.02,220],support:[200.14,250],scale:.96,angle:22,twoHanded:true},
  bow:{grip:[213,213],scale:.9,angle:0},
  crossbow:{grip:[201.04,251],support:[199,220],scale:.88,angle:65,twoHanded:true},
  wand:{grip:[202.62,279],scale:.64,angle:-10},
  focus:{grip:[201.27,279],scale:.72,angle:-8},
  scepter:{grip:[202.21,279],scale:.78,angle:-8},
  rod:{grip:[202.92,279],scale:.78,angle:-8}
});
const OFFHAND_PROFILES=Object.freeze({
  shield:{grip:[48,216],scale:1.08,angle:0},
  quiver:{grip:[49,200],scale:.88,angle:20},
  tome:{grip:[46,242],scale:.82,angle:-8},
  idol:{grip:[48,252],scale:.78,angle:0},
  focus:{grip:[49,235],scale:.78,angle:0},
  dagger:{...WEAPON_PROFILES.dagger,angle:18}
});
function weaponKind(subject,item=subject?.equipment?.Weapon){
  if(!item)return '';
  // Migration compatibility for legacy Rogue blades tagged as swords.
  if((item.class||subject?.class)==='Rogue'&&/\b(blades?|sword)\b/i.test(item.name||'')&&!/great/i.test(item.name||''))return'dagger';
  const declared=String(item.weaponType||'').toLowerCase();
  if(WEAPON_PROFILES[declared])return declared;
  const raw=[item.weaponType,item.type,item.subtype,item.name,item.itemId].join(' ').toLowerCase();
  for(const [pattern,kind] of [
    [/crossbow/,'crossbow'],[/bow/,'bow'],[/warglaive/,'sword'],
    [/spear|pike|lance|halberd|polearm/,'spear'],[/staff|stave|branch/,'staff'],
    [/greatblade|greatsword|claymore|2h/,'greatsword'],[/dagger|kniv|knife|shiv|stiletto/,'dagger'],
    [/axe|cleaver|hatchet/,'axe'],[/maul|hammer/,'hammer'],[/mace|morningstar/,'mace'],
    [/wand/,'wand'],[/focus|orb|crystal/,'focus'],[/scept[er][er]/,'scepter'],[/rod/,'rod']
  ])if(pattern.test(raw))return kind;
  return 'sword';
}
function offHandKind(item){
  if(!item)return '';
  const declared=String(item.offHandType||'').toLowerCase();
  if(OFFHAND_PROFILES[declared])return declared;
  const raw=[item.name,item.itemId].join(' ').toLowerCase();
  for(const [pattern,kind] of [[/shield|bulwark|buckler|aegis/,'shield'],[/quiver/,'quiver'],[/scripture|tome|book|grimoire/,'tome'],[/idol|totem/,'idol'],[/blade|dagger|knife|shiv|glaive/,'dagger']])if(pattern.test(raw))return kind;
  return 'focus';
}
function transformPoint(attachment,point){
  const r=attachment.angle*Math.PI/180,dx=(point[0]-attachment.grip[0])*attachment.scale,dy=(point[1]-attachment.grip[1])*attachment.scale;
  return {x:attachment.x+dx*Math.cos(r)-dy*Math.sin(r),y:attachment.y+dx*Math.sin(r)+dy*Math.cos(r)};
}
function attachmentTransform(a){return 'translate('+a.x+' '+a.y+') rotate('+a.angle+') scale('+a.scale+') translate('+(-a.grip[0])+' '+(-a.grip[1])+')'}
function armLengths(p){return {upper:53+p.shoulder*.1,lower:49+p.shoulder*.18}}
function armJoints(shoulder,hand,p,side){
  // Two-bone solve: choose the outside elbow, keeping bone lengths fixed for
  // a given body. Art, gloves and equipment consume these same joints.
  const {upper,lower}=armLengths(p),dx=hand.x-shoulder.x,dy=hand.y-shoulder.y,d=Math.hypot(dx,dy),safe=Math.max(.001,d);
  const along=(upper*upper-lower*lower+d*d)/(2*safe),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  return {shoulder,hand,elbow:{x:shoulder.x+dx/safe*along+side*dy/safe*height,y:shoulder.y+dy/safe*along-side*dx/safe*height},upper,lower};
}
function constrainTwoHanded(attachment,p,leftShoulder,rightShoulder){
  const a={...attachment},{upper,lower}=armLengths(p),limit=upper+lower-.5;
  // Project the shared handle into both arms' reachable discs. Translation of
  // the weapon moves both grips together; fingers never detach to fake reach.
  for(let i=0;i<16;i++)for(const [s,h] of [[rightShoulder,{x:a.x,y:a.y}],[leftShoulder,transformPoint(a,a.support)]]){
    const dx=h.x-s.x,dy=h.y-s.y,d=Math.hypot(dx,dy);
    if(d>limit){a.x-=dx*(1-limit/d);a.y-=dy*(1-limit/d)}
  }
  return a;
}
function equipmentPose(subject){
  const p=bodyProfile(subject),ls=120-p.shoulder,rs=120+p.shoulder;
  const kind=weaponKind(subject),offItem=subject?.equipment?.OffHand;
  const offKind=offItem&&(!offItem.slot||offItem.slot==='OffHand')?offHandKind(offItem):'';
  const profile=WEAPON_PROFILES[kind],explicit=subject?.equipment?.Weapon;
  const twoHanded=Boolean(profile&&(profile.twoHanded||explicit?.twoHanded===true||Number(explicit?.hands)===2));
  const lengths=armLengths(p),restY=148+lengths.upper+lengths.lower-2;
  let right={x:rs+5,y:restY},left={x:ls-5,y:restY};
  let main=null,off=null;
  if(profile){
    right={x:twoHanded?120+p.shoulder*.28:rs-p.shoulder*.28,y:twoHanded?214:kind==='staff'?217:234};
    main={...profile,x:right.x,y:right.y,kind,layer:'mainhand-side',mode:twoHanded?'two-handed':kind==='bow'?'bow-rest':'one-handed'};
    if(twoHanded){
      main.support=profile.support||[profile.grip[0]+1.5,profile.grip[1]+22];
      main=constrainTwoHanded(main,p,{x:ls,y:148},{x:rs,y:148});right={x:main.x,y:main.y};
      left=transformPoint(main,main.support);
    }
  }
  if(offKind){
    const op=OFFHAND_PROFILES[offKind];
    if(offKind==='quiver'||twoHanded){
      // A two-hand stance frees neither hand. Display the owned off-hand
      // stowed (no equipment/stat mutation); quivers always mount to the back.
      off={...op,kind:offKind,x:offKind==='shield'?ls+7:ls+10,y:offKind==='quiver'?180:offKind==='shield'?207:256,layer:'equipment-back',mode:'stowed',scale:offKind==='shield'?.86:op.scale};
    }else{
      left={x:ls+p.shoulder*.20,y:offKind==='shield'?226:offKind==='dagger'?239:249};
      off={...op,kind:offKind,x:left.x,y:left.y,layer:offKind==='shield'?'shield-front':'front-offhand',mode:'held'};
    }
  }
  return {main,off,twoHanded,right:armJoints({x:rs,y:148},right,p,1),left:armJoints({x:ls,y:148},left,p,-1)};
}
function weaponPose(subject){const a=equipmentPose(subject).main;return a?{...a,active:true,side:'right',sideMin:120,stance:a.mode}:{active:false,kind:'none',...equipmentPose(subject).right.hand,angle:0,side:'right',sideMin:120}}
// Animation channels are body-relative wrist goals, not another equipment fit.
// The same sockets, support grip and two-bone solve remain authoritative.
function animatedEquipmentPose(base,p,channels={}){
  const out={...base},reach=armLengths(p),limit=reach.upper+reach.lower-.5;
  const solve=(side,goal)=>{
    const shoulder=base[side].shoulder,dx=goal.x-shoulder.x,dy=goal.y-shoulder.y,d=Math.hypot(dx,dy)||1;
    const length=Math.max(Math.abs(reach.upper-reach.lower)+.5,Math.min(limit,d));
    return armJoints(shoulder,{x:shoulder.x+dx*length/d,y:shoulder.y+dy*length/d},p,side==='right'?1:-1);
  };
  for(const [side,key] of [['right','main'],['left','off']]){
    const h=base[side].hand;
    out[side]=solve(side,{x:h.x+(channels[key+'X']||0)*p.shoulder,y:h.y+(channels[key+'Y']||0)*reach.lower});
    const a=base[key];
    if(a)out[key]=a.mode==='stowed'?a:{...a,...out[side].hand,angle:a.angle+(channels[key+'Angle']||0)};
  }
  if(out.twoHanded&&out.main){
    out.main=constrainTwoHanded(out.main,p,base.left.shoulder,base.right.shoulder);
    out.right=solve('right',out.main);out.left=solve('left',transformPoint(out.main,out.main.support));
  }
  if(out.main?.kind==='bow'&&channels.bowDraw!=null){
    const nock=[190-55*Math.max(0,Math.min(1,channels.bowDraw)),213];
    out.main=constrainTwoHanded({...out.main,support:nock},p,base.left.shoulder,base.right.shoulder);
    out.right=solve('right',out.main);out.left=solve('left',transformPoint(out.main,nock));
    out.bowNock=nock;
    if(out.off?.mode==='held')out.off={...out.off,...out.left.hand};
  }
  return out;
}
function gearFitProfile(subject){
  const race=raceOf(subject),p=bodyProfile(subject),sex=sexName(subject),gender=p.gender,frame=p.frame;
  const shoulderY=race==='Stoneborn'?130:gender===1?133:131;
  const leftShoulder=120-p.shoulder,rightShoulder=120+p.shoulder;
  const handReach=Math.max(5.2,p.arm*.46);
  const leftHand=leftShoulder-handReach,baseRightHand=rightShoulder+handReach;
  const attachments=equipmentPose(subject),pose=attachments.main?{...attachments.main,active:true,sideMin:120}:{...attachments.right.hand,angle:0,kind:'none',active:false};
  const rightHand=attachments.right.hand.x,handY=attachments.left.hand.y,rightHandY=attachments.right.hand.y;
  const hipHalf=p.hip,waistHalf=Math.max(p.waist*1.02,p.hip*.64);
  const legOffset=p.hip*.38,legHalf=Math.max(8.5,p.leg*.62);
  return {
    race,gender,frame,p,centerX:120,shoulderY,
    leftShoulder,rightShoulder,leftHand:attachments.left.hand.x,rightHand,baseRightHand,handY,rightHandY,attachments,
    leftPad:120-p.shoulder*.82,rightPad:120+p.shoulder*.82,
    waistY:247,waistHalf,hipHalf,
    leftLeg:120-legOffset,rightLeg:120+legOffset,
    legHalf,calfHalf:Math.max(7.4,p.leg*.52),footHalf:Math.max(8.6,p.leg*.66),
    chestTop:gender===1?140:138,chestBottom:244,
    weaponX:pose.x,weaponY:pose.y,weaponAngle:pose.angle,weaponPose:pose.active?'side-held':'rest',weaponKind:pose.kind,weaponSideMin:pose.sideMin??rightShoulder,
    offhandX:attachments.off?.x??attachments.left.hand.x,offhandY:attachments.off?.y??handY,
    headGearScaleX:(gender===1?.94:1)*([.94,1,1.05,.98][subject?.appearance?.face]||1)
  };
}
function anchors(subject){
  const f=gearFitProfile(subject),m=masterRig(subject),a={...m.anchors};
  for(const [key,value] of Object.entries(a))a[key]={x:value.x,y:unrigY(value.y)};
  a.leftShoulder=f.attachments.left.shoulder;a.rightShoulder=f.attachments.right.shoulder;
  a.leftElbow=f.attachments.left.elbow;a.rightElbow=f.attachments.right.elbow;
  a.leftHand=f.attachments.left.hand;a.rightHand=f.attachments.right.hand;
  a.mainHand=a.rightHand;a.offHand=a.leftHand;
  a.leftHip={x:f.leftLeg,y:257};a.rightHip={x:f.rightLeg,y:257};
  a.leftFoot={x:f.leftLeg,y:380};a.rightFoot={x:f.rightLeg,y:380};
  a.waist={x:120,y:247};a.back={x:120,y:150};
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
  const opts=options||{},family=String(opts.family||'warrior').toLowerCase().replace(/\s+/g,'-'),tier=clamp(Math.round(opts.tier||1),1,5);
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
    const width=Math.max(18,p.arm*1.35*ff.shoulder)+(tier>=4?4:0),h=(27+(tier-1)*.8)*(family==='paladin'?1.03:1);
    const inset=['rogue','demon-hunter','mage','priest','warlock','monk'].includes(family)?5:['hunter','druid'].includes(family)?4:6;
    const leftCenter=f.leftPad,rightCenter=f.rightPad,y=rigY(f.shoulderY)-h*.28+rf.shoulderY;
    return{leftX:leftCenter-width/2,rightX:rightCenter-width/2,y,w:width,h,leftCenter,rightCenter};
  }
  if(slot==='Legs'){
    const width=p.hip*2.12*(race==='Stoneborn'?1.03:1),y=waistBase-1,bottom=rigY(356),cloth=['mage','priest','warlock'].includes(family);
    return{x:120-width/2,y,w:width,h:Math.max(150,bottom-y)+(cloth?28:0)};
  }
  if(slot==='Feet'){
    const width=f.footHalf*2,y=rigY(349),bottom=393;
    return{leftX:f.leftLeg-width/2,rightX:f.rightLeg-width/2,y,w:width,h:bottom-y};
  }
  if(slot==='Hands'){
    const width=p.hand*12.4+2,h=p.hand*14+2,leftY=f.handY-h/2,rightY=f.rightHandY-h/2;
    return{leftX:f.leftHand-width/2,rightX:f.rightHand-width/2,y:Math.min(leftY,rightY),leftY,rightY,w:width,h,leftCenter:f.leftHand,rightCenter:f.rightHand};
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
  masterKey,masterRig,resolve,bodyProfile,gearFitProfile,weaponPose,weaponKind,offHandKind,anchors,anchor,
  equipmentPose,animatedEquipmentPose,weaponProfiles:WEAPON_PROFILES,offhandProfiles:OFFHAND_PROFILES,transformPoint,attachmentTransform,
  rigY,unrigY,headRig,hairFit,fitSlot,equipmentCoverage,validateAll
});
})();
