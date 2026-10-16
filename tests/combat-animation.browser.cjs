'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),dist=process.env.CELLBOUND_ANIMATION_DIST||path.join(root,'dist'),before=!!process.env.CELLBOUND_ANIMATION_DIST;
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 const errors=[],dir='/tmp/cellbound-animation';fs.mkdirSync(dir,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:1024},recordVideo:process.env.CELLBOUND_RECORD?{dir,size:{width:1366,height:1024}}:undefined});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(/visual skipped|animation recovered/.test(m.text()))errors.push(m.text())});
 try{
  await page.setContent('<base href="https://cellbound.test/"><body style="margin:0;background:#081115;color:#d6d1c4;font-family:system-ui"></body>');
  await page.route('https://cellbound.test/**',route=>{const f=path.resolve(dist,new URL(route.request().url()).pathname.slice(1));return f.startsWith(dist+path.sep)&&fs.existsSync(f)?route.fulfill({path:f}):route.fulfill({status:404,body:''})});
  const styles=[...fs.readFileSync(path.join(dist,'guild.html'),'utf8').matchAll(/href="\.\/([^"?]+\.css)[^"]*"/g)].map(m=>m[1]);
  for(const f of styles)if(fs.existsSync(path.join(dist,f)))await page.addStyleTag({path:path.join(dist,f)});
  for(const f of ['gear-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js'])await page.addScriptTag({path:path.join(dist,f)});
  await page.evaluate(()=>{
   const equipment={};for(const pos of CellboundGear.EQUIPMENT_POSITION_ORDER)equipment[pos]=CellboundGear.items.find(x=>x.class==='Warrior'&&x.tier===1&&x.slot===(pos.startsWith('Ring')?'Ring':pos.startsWith('Trinket')?'Trinket':pos));
   window.testParty=[{id:'warrior',name:'Aldren',class:'Warrior',spec:'Protection',role:'tank',race:'Veyren',level:5,power:12,appearance:{gender:0,frame:1,skinTone:1,hair:2,hairColor:2},talents:{Protection:{'Shield Mastery':3}},equipment}];
   window.CellboundGame={ready:true,getState:()=>({roster:testParty}),getPartyCharacters:()=>testParty,characterItemLevel:()=>10,isUnavailable:()=>false};
  });
  for(const f of [...(!before?['monster-visuals-v1.js']:[]),'combat-portraits-v1.js','combat-data-v1.js','combat-reborn-v1.js','combat-standard-v1.js','combat-viewer-v1.js','combat-hud-standard-v1.js','combat-polish-v2.js','combat-polish-v3.js',...(!before?['combat-animation-catalog-v1.js','combat-animation-v1.js']:[]),'combat-physical-v4.js','combat-cinematic-v1.js','dungeon-2d-v1.js'])await page.addScriptTag({path:path.join(dist,f)});
  const simulation=await page.evaluate(()=>{
   const encounter={id:'hall-embers',title:'Hall of Embers · Ashen Vault',kind:'trash',level:3,enemies:[{name:'Ash Guardian',classification:'elite'}],enemyHealth:120,mechanics:[]};
   // Choose a deterministic genuine engine encounter containing a block and victory.
   let result,seed;for(let i=0;i<50;i++){seed='animation-'+i;result=CellboundCombatReborn.simulate({party:testParty,encounter,seed,maxDurationMs:40000});if(result.outcome==='victory'&&result.events.some(e=>e.result==='blocked'))break}
   const evidence={seed,duration:result.durationMs,blocks:result.events.filter(e=>e.result==='blocked').length};
   window.testOptions={party:testParty,encounter,seed,maxDurationMs:40000};window.reference=JSON.stringify(result);
   window.playback=CellboundDungeon2D.playSharedEncounter({party:testParty,encounter,result,theme:'ashen',room:'hall-embers',zone:'ashen-vault'});
   return evidence;
  });
  assert(simulation.blocks>0,'fixture must contain a genuine block');
  await page.waitForTimeout(1500);
  await page.screenshot({path:dir+'/'+(before?'before':'after')+'-ipad.png'});
  if(!before){
   // Named abilities now use authored, class-specific choreography rather than the old generic cleave clip.
   await page.waitForFunction(()=>{
    const unit=document.querySelector('[data-unit="p-warrior"]');
    return unit?.dataset.animationState?.startsWith('skill:Warrior:')&&unit.dataset.animationClip===unit.dataset.animationState;
   },null,{timeout:12000});
   await page.waitForTimeout(180);
   await page.screenshot({path:dir+'/after-swing.png'});
  }
  await page.evaluate(()=>window.playback);
  await page.waitForTimeout(1100);
  await page.screenshot({path:dir+'/'+(before?'before':'after')+'-victory.png'});
  console.log('Real Ashen Guardian encounter',simulation);
  if(before)return;
  // Use the same production viewer/actors for deterministic event edge cases.
  await page.evaluate(()=>{
   window.arena=document.querySelector('#cb2dArena');
   window.send=(type,source='p-warrior',target='e-0',extra={})=>{const e={type,source,target,timestamp:1000,ability:'QA strike',payload:{kind:'damage',range:5},...extra};CellboundCombatFX.combatEvent(e,{arena,speed:1});return e};
   send('COMBAT_START',null,null);
   send('PLAYER_REVIVED','p-warrior','p-warrior');send('ENEMY_REVIVED','p-warrior','e-0');
  });
  await page.waitForFunction(()=>document.querySelector('[data-unit="p-warrior"]')?.dataset.animationState==='idle',null,{timeout:3000});
  const timing=await page.evaluate(()=>{
   send('ABILITY_START');const e=send('DAMAGE_DEALT','p-warrior','e-0',{amount:19,result:'hit'});window.visualAt=0;const start=performance.now();CellboundCombatFX.presentImpact(e,()=>{window.visualAt=performance.now()-start});
   return {immediate:window.visualAt,pose:document.querySelector('[data-unit="p-warrior"]').dataset.animationState};
  });
  assert.equal(timing.immediate,0,'damage number waits for contact');assert.equal(timing.pose,'swing');
  await page.waitForTimeout(200);
  const joints=await page.evaluate(()=>{
   const unit=document.querySelector('[data-unit="p-warrior"]'),svg=unit.querySelector('svg[data-rig-pose]'),w=svg.querySelector('.cb-paper-slot-weapon'),h=svg.querySelector('.cb-paper-glove-right'),f=svg.querySelector('.cb-paper-forearm-right'),u=svg.querySelector('.cb-paper-upper-right');
   const a=new DOMPoint(+w.dataset.gripLocalX,+w.dataset.gripLocalY).matrixTransform(w.getScreenCTM()),b=new DOMPoint(+h.getAttribute('cx'),+h.getAttribute('cy')).matrixTransform(h.getScreenCTM());
   const base=JSON.parse(svg.dataset.rigPose).pose,elbow=new DOMPoint(base.right.elbow.x,base.right.elbow.y),p=elbow.matrixTransform(f.getScreenCTM()),q=elbow.matrixTransform(u.getScreenCTM());
   return{grip:Math.hypot(a.x-b.x,a.y-b.y),elbow:Math.hypot(p.x-q.x,p.y-q.y),upper:u.getAttribute('transform'),lower:f.getAttribute('transform')};
  });
  assert(joints.grip<.1&&joints.elbow<.1,JSON.stringify(joints));assert(!joints.upper.startsWith('rotate(0 '),'upper arm actually articulates');
  await page.waitForTimeout(160);assert(await page.evaluate(()=>visualAt>=250&&visualAt<750),'feedback appears on contact frame');
  await page.evaluate(()=>{send('ENEMY_DEFEATED');send('ABILITY_START','e-0','p-warrior')});
  await page.waitForFunction(()=>document.querySelector('[data-unit="e-0"]')?.dataset.animationState==='dead',null,{timeout:2000});
  await page.evaluate(()=>send('ENEMY_REVIVED'));await page.waitForFunction(()=>document.querySelector('[data-unit="e-0"]')?.dataset.animationState==='idle',null,{timeout:3000});assert.equal(await page.locator('[data-unit="e-0"]').getAttribute('data-animation-state'),'idle');
  await page.evaluate(()=>{send('DEBUFF_APPLIED','e-0','p-warrior',{statusEffects:[{id:'stun',cc:'stun'}]});send('ABILITY_START')});
  assert.equal(await page.locator('[data-unit="p-warrior"]').getAttribute('data-animation-state'),'control');
  await page.evaluate(()=>{send('DEBUFF_REMOVED','e-0','p-warrior',{statusEffects:[{id:'stun'}]});send('CAST_START','p-warrior','e-0',{payload:{duration:1000}});send('INTERRUPT','e-0','p-warrior',{result:'success'})});
  assert.equal(await page.locator('[data-unit="p-warrior"]').getAttribute('data-animation-state'),'interrupt');
  await page.waitForTimeout(500);
  await page.evaluate(()=>{send('DAMAGE_DEALT','e-0','p-warrior',{result:'miss',amount:0});send('DAMAGE_DEALT','e-0','p-warrior',{result:'dodged',amount:0})});
  await page.waitForFunction(()=>document.querySelector('[data-unit="p-warrior"]')?.dataset.animationState==='dodge',null,{timeout:1500});
  await page.waitForTimeout(500);
  await page.evaluate(()=>send('DAMAGE_DEALT','e-0','p-warrior',{result:'blocked',amount:8}));await page.waitForFunction(()=>document.querySelector('[data-unit="p-warrior"]')?.dataset.animationState==='block',null,{timeout:1500});
  await page.screenshot({path:dir+'/after-block.png'});
  await page.waitForTimeout(500);
  await page.evaluate(()=>{
   const other=document.querySelector('[data-unit="e-0"]').cloneNode(true);other.dataset.unit='e-1';arena.appendChild(other);
   for(let i=0;i<6;i++){send('ABILITY_START','p-warrior',i%2?'e-1':'e-0');send('DAMAGE_DEALT','p-warrior',i%2?'e-1':'e-0',{result:'hit',amount:3})}
   testParty[0].equipment.Weapon={...testParty[0].equipment.Weapon,name:'Greatsword',weaponType:'greatsword'};
   CellboundCombatPortraits.refresh();send('ABILITY_START');
  });
  await page.waitForTimeout(200);
  const swap=await page.evaluate(()=>{
   const el=document.querySelector('[data-unit="p-warrior"]'),w=el.querySelector('.cb-paper-slot-weapon'),h=el.querySelector('.cb-paper-glove-right'),a=new DOMPoint(+w.dataset.gripLocalX,+w.dataset.gripLocalY).matrixTransform(w.getScreenCTM()),b=new DOMPoint(+h.getAttribute('cx'),+h.getAttribute('cy')).matrixTransform(h.getScreenCTM());
   return{kind:w.dataset.weaponType,error:Math.hypot(a.x-b.x,a.y-b.y)};
  });assert.equal(swap.kind,'greatsword');assert(swap.error<.1,'live equipment replacement rebinds the rig');
  await page.waitForTimeout(600);
  await page.evaluate(()=>{send('ABILITY_START','e-0','p-warrior');send('DAMAGE_DEALT','e-0','p-warrior',{amount:999,result:'hit'});send('PLAYER_DEFEATED','e-0','p-warrior');send('PLAYER_REVIVED','p-warrior','p-warrior')});
  await page.waitForTimeout(400);assert.notEqual(await page.locator('[data-unit="p-warrior"]').getAttribute('data-combat-state'),'dead','an old queued defeat cannot overwrite resurrection');
  await page.evaluate(()=>{testParty[0].equipment.Weapon={...testParty[0].equipment.Weapon,name:'Iron Sword',weaponType:'sword'};CellboundCombatPortraits.refresh()});
  await page.emulateMedia({reducedMotion:'reduce'});
  const immediate=await page.evaluate(()=>{const e=send('DAMAGE_DEALT','p-warrior','e-0',{amount:7,result:'hit'});let done=false;CellboundCombatFX.presentImpact(e,()=>done=true);return done});assert(immediate);
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const viewport of [{width:1024,height:1366},{width:1440,height:900}]){await page.setViewportSize(viewport);await page.screenshot({path:dir+'/after-'+viewport.width+'.png'});assert(await page.locator('[data-speed]').isVisible(),'speed control remains visible')}
  // Same engine options with presentation subscribed must yield byte-identical results.
  const invariant=await page.evaluate(()=>{
   const a=CellboundCombatReborn.simulate(testOptions),b=CellboundCombatReborn.simulate({...testOptions,onEvent:e=>CellboundCombatFX.combatEvent(e,{arena,speed:1})});return JSON.stringify(a)===JSON.stringify(b);
  });assert(invariant,'presentation cannot change deterministic gameplay');
  // Magnified contact sheet uses the same production renderer and engine events.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{
   CellboundCombatAnimation.dispose(arena);CellboundDungeon2D.closeShared(true);
   document.body.innerHTML='<div id="poseReview" class="cb2d-arena" style="position:relative;width:1100px;height:560px;margin:30px;background:#111c20"><div class="cb2d-unit party class-warrior" data-unit="p-warrior" style="position:absolute;left:36%;top:70%"></div><div class="cb2d-unit enemy" data-unit="e-0" style="position:absolute;left:52%;top:70%"><span>Ash Guardian</span></div></div>';
   const style=document.createElement('style');style.textContent='#poseReview .cb-combat-portrait,#poseReview .cb-combat-rigged-enemy{width:192px!important;height:328px!important}#poseReview .cb-paper-doll--combat{width:192px!important;height:328px!important}#poseReview .cb2d-unit>span{display:none}';document.head.appendChild(style);
   CellboundCombatPortraits.refresh();window.arena=document.querySelector('#poseReview');
   send('COMBAT_START',null,null);
   const events=CellboundCombatReborn.simulate(testOptions).events;
   window.realAttack=events.find(e=>e.type==='ABILITY_START'&&e.source==='p-warrior'&&e.payload?.kind==='damage'&&!/shield/i.test(e.ability));
   window.realHit=events.find(e=>e.type==='DAMAGE_DEALT'&&e.source===realAttack.source&&e.ability===realAttack.ability);
  });
  await page.evaluate(()=>CellboundCombatAnimation.dispose(arena));
  const reviewTime=new Date('2026-01-01T00:00:00Z');
  await page.clock.install({time:reviewTime});
  await page.clock.pauseAt(new Date(reviewTime.getTime()+1000));
  await page.addScriptTag({path:path.join(dist,'combat-animation-v1.js')});
  await page.evaluate(()=>send('COMBAT_START',null,null));
  await page.locator('#poseReview').screenshot({path:dir+'/pose-0-ready.png',animations:'allow'});
  await page.evaluate(()=>{CellboundCombatFX.combatEvent(realAttack,{arena,speed:1});CellboundCombatFX.combatEvent(realHit,{arena,speed:1})});
  for(const [ms,name] of [[190,'1-windup'],[115,'2-contact'],[130,'3-follow-through'],[270,'4-recovery']]){await page.clock.runFor(ms);await page.locator('#poseReview').screenshot({path:dir+'/pose-'+name+'.png',animations:'allow'})}
  await page.evaluate(()=>{send('DAMAGE_DEALT','e-0','p-warrior',{result:'blocked',amount:8})});await page.clock.runFor(330);
  await page.locator('#poseReview').screenshot({path:dir+'/pose-5-block.png',animations:'allow'});
  await page.clock.resume();
  await page.evaluate(()=>{send('ABILITY_START');send('DAMAGE_DEALT');send('COMBAT_END');arena.remove()});
  await page.waitForTimeout(160);assert.deepEqual(await page.evaluate(()=>CellboundCombatAnimation.diagnostics()),{scenes:0,pending:0,actors:0});
  assert.deepEqual(errors,[]);
  console.log('Combat animation browser QA passed: real encounter, contact timing, articulated joints, death/revive/control/interrupt/miss/dodge/block, reduced motion, viewport changes, engine invariance, cleanup.');
 }finally{const video=page.video();await context.close();if(video)await video.saveAs(dir+'/'+(before?'before':'after')+'.webm');await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
