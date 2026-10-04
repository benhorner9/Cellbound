'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx={console,Math,Date};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const file of ['gear-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
const G=ctx.CellboundGear,P=ctx.CellboundPortraits,R=ctx.CellboundCharacterRig;
assert(G&&P&&R);
assert.equal(R.fitVersion,3);
assert.equal(P.equipmentFitVersion,3);

const races=['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari'];
const slotPosition=item=>item.slot==='Ring'?'Ring1':item.slot==='Trinket'?'Trinket1':item.slot;
const num=(html,name)=>{
  const m=html.match(new RegExp(name+'="(-?[0-9.]+)"'));
  return m?Number(m[1]):NaN;
};
const near=(a,b,t=.11)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=t;
const families={Warrior:'warrior',Paladin:'paladin',Hunter:'hunter',Rogue:'rogue',Mage:'mage',Priest:'mage',Warlock:'mage',Druid:'hunter',Shaman:'hunter',Monk:'rogue',Evoker:'mage','Death Knight':'warrior','Demon Hunter':'rogue'};

let itemChecks=0;
for(const item of G.items){
  const pos=slotPosition(item);
  for(const race of races)for(const gender of [0,1]){
    const appearance={race,gender,frame:1,skinTone:1,face:0,hair:0,hairColor:0,facialHair:0,marking:0,eyes:0,feature:0};
    const c={id:'fit-'+item.itemId+'-'+race+'-'+gender,race,class:item.class,appearance,equipment:{[pos]:item}};
    const html=P.paperDollSVG(c),fit=P.gearFitProfile(c);
    assert(!/NaN|Infinity|undefined/.test(html),item.itemId+' broken SVG on '+race+'/'+gender);
    assert(html.includes('data-equipment-fit="v3"'),item.itemId+' missing v3 model fit contract');
    assert(html.includes('cb-paper-slot-'+pos.toLowerCase()),item.itemId+' missing '+pos+' layer');
    assert(html.includes('data-fit-version="3"'),item.itemId+' did not use equipment fit v3');
    assert(html.includes('data-alignment="v3"'),item.itemId+' missing v3 slot alignment marker');

    if(item.slot==='Weapon'){
      assert(near(num(html,'data-grip-x'),fit.weaponX),item.itemId+' main-hand X not on side-held grip for '+race+'/'+gender);
      assert(near(num(html,'data-grip-y'),fit.weaponY),item.itemId+' main-hand Y not on side-held grip for '+race+'/'+gender);
      assert(fit.weaponX>=fit.baseRightHand,item.itemId+' side-held weapon must not move inward');
      const weaponAt=html.indexOf('cb-paper-side-weapon'),headAt=html.indexOf('cb-paper-head');
      assert(weaponAt>headAt,item.itemId+' side-held main-hand must render above body/head');
      assert(html.includes('data-weapon-pose="side-held"'),item.itemId+' missing side-held weapon pose');
    }else if(item.slot==='OffHand'){
      assert(near(num(html,'data-grip-x'),fit.offhandX),item.itemId+' off-hand X not on hand for '+race+'/'+gender);
      assert(near(num(html,'data-grip-y'),fit.offhandY),item.itemId+' off-hand Y not on hand for '+race+'/'+gender);
      const type=P.offHandType(item,c),offAt=html.indexOf('data-offhand-type="'+type+'"'),armsAt=html.indexOf('cb-paper-arms'),headAt=html.indexOf('cb-paper-head');
      if(type==='shield')assert(offAt>=0&&offAt<armsAt,item.itemId+' shield must stay behind body');
      else assert(offAt>headAt,item.itemId+' front off-hand must render above body/head');
    }else if(item.slot==='Hands'){
      assert(near(num(html,'data-left-hand-x'),fit.leftHand),item.itemId+' left glove anchor mismatch');
      assert(near(num(html,'data-right-hand-x'),fit.rightHand),item.itemId+' right glove anchor mismatch');
      assert(near(num(html,'data-hand-y'),fit.handY),item.itemId+' glove Y anchor mismatch');
    }else if(item.slot==='Shoulders'){
      assert(near(num(html,'data-left-shoulder-x'),fit.leftShoulder),item.itemId+' left shoulder anchor mismatch');
      assert(near(num(html,'data-right-shoulder-x'),fit.rightShoulder),item.itemId+' right shoulder anchor mismatch');
    }else if(item.slot==='Ring'){
      assert(near(num(html,'data-ring-x'),fit.leftHand),item.itemId+' ring is not attached to left hand');
      assert(near(num(html,'data-ring-y'),fit.handY-1),item.itemId+' ring Y mismatch');
    }

    if(['Head','Shoulders','Chest','Hands','Waist','Legs','Feet'].includes(item.slot)){
      const b=R.fitSlot(c,item.slot,{family:families[item.class]||'warrior',tier:item.tier});
      assert(b,item.itemId+' missing rig bounds');
      for(const k of ['y','w','h'])assert(Number.isFinite(b[k]),item.itemId+' invalid '+k);
      assert(b.y>-20&&b.y<410&&b.w>3&&b.w<235&&b.h>3&&b.h<410,item.itemId+' unreasonable '+item.slot+' bounds');
      if(Number.isFinite(b.x))assert(b.x>-35&&b.x+b.w<275,item.itemId+' horizontal fit escapes model');
    }
    itemChecks++;
  }
}
assert.equal(itemChecks,G.items.length*12,'Every catalogue item must be audited against all 12 master race/sex models');

let bodyChecks=0;
for(const klass of G.CLASS_ORDER)for(const tier of [1,2,3,4,5])for(const race of races)for(const gender of [0,1])for(const frame of [0,1,2]){
  const equipment={};
  for(const pos of G.EQUIPMENT_POSITION_ORDER){
    const slot=pos.startsWith('Ring')?'Ring':pos.startsWith('Trinket')?'Trinket':pos;
    const item=G.items.find(x=>x.class===klass&&Number(x.tier)===tier&&x.slot===slot);
    assert(item,klass+' T'+tier+' missing '+slot);
    equipment[pos]=item;
  }
  const c={id:'loadout-'+bodyChecks,race,class:klass,appearance:{race,gender,frame,skinTone:1,face:0,hair:0,hairColor:0,facialHair:0,marking:0,eyes:0,feature:0},equipment};
  const html=P.paperDollSVG(c),fit=P.gearFitProfile(c);
  assert(!/NaN|Infinity|undefined/.test(html));
  assert(html.includes('data-equipment-fit="v3"'));
  for(const pos of G.EQUIPMENT_POSITION_ORDER)assert(html.includes('cb-paper-slot-'+pos.toLowerCase()),klass+' '+race+' frame '+frame+' missing '+pos);
  const weaponAt=html.indexOf('cb-paper-side-weapon'),weaponHtml=weaponAt>=0?html.slice(weaponAt):'';
  assert(weaponAt>=0,klass+' '+race+' frame '+frame+' missing side-held weapon');
  assert(near(num(weaponHtml,'data-grip-x'),fit.weaponX),klass+' '+race+' frame '+frame+' weapon mismatch');
  assert(near(num(weaponHtml,'data-grip-y'),fit.weaponY),klass+' '+race+' frame '+frame+' weapon Y mismatch');
  assert(fit.weaponX>=fit.baseRightHand,klass+' '+race+' frame '+frame+' weapon moved across body instead of to side');
  bodyChecks++;
}
assert.equal(bodyChecks,G.CLASS_ORDER.length*5*6*2*3);
for(const klass of ['Mage','Priest','Warlock','Druid']){
 const styles=[1,2,3,4,5].map(tier=>{
  const item=G.items.find(x=>x.class===klass&&Number(x.tier)===tier&&x.slot==='Legs');assert(item);
  return P.clothLowerStyle(item);
 });
 assert(new Set(styles).size>=2,klass+' must mix trouser and robe/skirt silhouettes across tiers');
 assert(styles.includes('trousers'),klass+' must retain at least one trouser tier');
 assert(styles.some(x=>x!=='trousers'),klass+' must include at least one robe/skirt tier');
}
console.log('Equipment fit v3: '+itemChecks+' item/body checks across all 12 master models; '+bodyChecks+' complete loadouts across all 36 race/sex/frame bodies; side-held weapons and varied cloth lowers verified.');
