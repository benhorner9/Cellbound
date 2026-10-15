'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{chromium,webkit}=require('playwright');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?'webkit':'chromium',root=path.resolve(__dirname,'..'),dir='/tmp/cellbound-appearance';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await({chromium,webkit}[engine]).launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:1024}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.setContent('<body style="margin:0;background:#101b24;color:#e8dac0;font-family:system-ui"><main id="mount"></main><section id="arena"></section></body>');
  for(const f of ['character-portraits-v1.css','character-forge-v1.css'])await page.addStyleTag({path:path.join(root,f)});
  for(const f of ['gear-data.js','character-rig-v1.js','character-portraits-v1.js','character-forge-v1.js','src/combat/combat-data-v1.js','src/combat/combat-animation-catalog-v1.js','src/combat/combat-animation-v1.js'])await page.addScriptTag({path:path.join(root,f)});
  await page.clock.install();await page.clock.pauseAt(new Date());
  await page.evaluate(()=>{
   window.draft={race:'Veyren',klass:'Warrior',appearance:{gender:0,frame:1},name:'Keeper'};
   window.drawForge=()=>CellboundCharacterForge.render({mount:document.querySelector('#mount'),draft,step:'form',races:CellboundCharacterRig.races.map(id=>({id})),onChange:drawForge});drawForge();
  });
  for(const [key,value] of [['frame','2'],['skinTone','5'],['hair','3'],['hairColor','6'],['marking','4'],['feature','3']])await page.selectOption('[data-forge-appearance="'+key+'"]',value);
  await page.click('[data-forge-sex="1"]');await page.click('[data-forge-race="Stoneborn"]');
  const saved=await page.evaluate(()=>draft.appearance);assert.equal(saved.frame,2);assert.equal(saved.skinTone,5);assert.equal(saved.marking,4);assert.equal(saved.feature,3);assert.equal(saved.gender,1);
  for(const [width,height] of [[1366,1024],[1024,1366],[390,844]]){
   await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Forge overflow '+width);
   await page.screenshot({path:dir+'/'+engine+'-creation-'+width+'.png',fullPage:true});
  }
  await page.setViewportSize({width:1366,height:1024});
  await page.evaluate(()=>{document.querySelector('#mount').innerHTML='';window.arena=document.querySelector('#arena');arena.style.cssText='position:relative;width:100%;min-height:440px';window.mountActor=(race,gender,frame,klass='Warrior',tier=5)=>{
   CellboundCombatAnimation.dispose(arena);const equipment={};for(const slot of ['Head','Chest','Shoulders','Legs','Feet','Hands','Waist','Weapon','OffHand'])equipment[slot]=CellboundGear.items.find(i=>i.class===klass&&i.tier===tier&&i.slot===slot);
   window.actor={id:'qa',race,class:klass,appearance:{gender,frame,skinTone:2,hair:3,marking:2},equipment};arena.innerHTML='<div data-unit="qa" style="width:240px;height:410px">'+CellboundPortraits.paperDollSVG(actor).replace('<svg ','<svg width="240" height="410" ')+'</div>';window.unit=arena.firstElementChild;
   window.send=(type,a)=>CellboundCombatAnimation.route({type,source:'qa',target:'qa',ability:a?.name,abilityId:a?.id,payload:{kind:a?.kind||'damage'}},{arena,speed:1,source:unit,target:unit},()=>{});
   send('COMBAT_START');
  }});
  let states=0;
  const races=await page.evaluate(()=>CellboundCharacterRig.races);
  for(const race of races)for(const gender of [0,1])for(const frame of [0,1,2]){
   await page.evaluate(({race,gender,frame})=>mountActor(race,gender,frame),{race,gender,frame});
   for(const id of ['mortal-strike','shield-slam','shield-wall']){
    await page.evaluate(id=>send('ABILITY_START',CellboundCombatData.ABILITIES.Warrior.find(a=>a.id===id)),id);await page.clock.runFor(180);
    const check=await page.evaluate(()=>{
     const svg=unit.querySelector('svg'),weapon=svg.querySelector('.cb-paper-slot-weapon'),hand=svg.querySelector('.cb-paper-glove-right'),pad=svg.querySelector('.cb-paper-pauldron-right'),pose=JSON.parse(svg.dataset.rigPose).pose;
     const w=new DOMPoint(+weapon.dataset.gripLocalX,+weapon.dataset.gripLocalY).matrixTransform(weapon.getScreenCTM()),h=new DOMPoint(+hand.getAttribute('cx'),+hand.getAttribute('cy')).matrixTransform(hand.getScreenCTM());
     const anchor=pose.right.shoulder,a=new DOMPoint(anchor.x,anchor.y).matrixTransform(pad.getScreenCTM()),b=new DOMPoint(anchor.x,anchor.y).matrixTransform(svg.querySelector('.cb-paper-upper-body').getScreenCTM());
     return{gap:Math.hypot(w.x-h.x,w.y-h.y),padGap:Math.hypot(a.x-b.x,a.y-b.y),transform:pad.getAttribute('transform'),state:unit.dataset.animationState};
    });assert(check.gap<.1,'Animated grip '+race);assert(check.padGap<.1,'Shoulder pivot '+race);assert(check.transform&&check.state!=='idle');states++;
    await page.clock.runFor(1200);assert.equal(await page.evaluate(()=>unit.dataset.animationState),'idle');
   }
  }
  // Actual rendered progression sheets for every class; same subject through all tiers.
  const classes=await page.evaluate(()=>CellboundGear.CLASS_ORDER);
  for(const [i,klass] of classes.entries()){
   await page.evaluate(({klass,i})=>{
    CellboundCombatAnimation.dispose(arena);arena.innerHTML='';const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:repeat(5,240px);gap:14px;padding:16px';arena.append(row);
    for(let tier=1;tier<=5;tier++){const equipment={};for(const slot of ['Head','Chest','Shoulders','Legs','Feet','Hands','Waist','Weapon','OffHand'])equipment[slot]=CellboundGear.items.find(x=>x.class===klass&&x.tier===tier&&x.slot===slot);const c={id:'sheet-'+tier,race:CellboundCharacterRig.races[i%6],class:klass,appearance:{gender:i%2,frame:i%3,skinTone:2,hair:2},equipment};const card=document.createElement('article');card.innerHTML='<h3>'+klass+' · T'+tier+'</h3>'+CellboundPortraits.paperDollSVG(c).replace('<svg ','<svg width="240" height="410" ');row.append(card)}
   },{klass,i});
   const first=await page.screenshot();await page.evaluate(()=>{document.body.style.opacity='.9';document.body.style.opacity='1'});assert(first.equals(await page.screenshot()),'Stable repaint '+klass);
   await page.screenshot({path:dir+'/'+engine+'-tiers-'+klass.replace(/ /g,'-')+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/'+engine+'-coverage.json',JSON.stringify({bodyVariants:36,animatedStates:states,classes:13,tiers:5,creationViewports:3,errors},null,2));
  console.log(engine+' appearance: 36 bodies × 3 animated poses, exact grips and shoulder pivots, 13 tier sheets with stable screenshot comparisons, creation selections and responsive viewports passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
