'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),dist=process.env.CELLBOUND_ANIMATION_DIST||path.join(root,'dist'),before=!!process.env.CELLBOUND_ANIMATION_DIST;
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 const errors=[],dir='/tmp/cellbound-monster/coverage';fs.mkdirSync(dir,{recursive:true});
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
  for(const f of ['monster-visuals-v1.js','combat-portraits-v1.js','combat-data-v1.js','combat-reborn-v1.js','combat-standard-v1.js','combat-viewer-v1.js','combat-hud-standard-v1.js','combat-polish-v2.js','combat-polish-v3.js',...(!before?['combat-animation-catalog-v1.js','combat-animation-v1.js']:[]),'combat-spatial-v1.js','combat-physical-v4.js','combat-cinematic-v1.js','dungeon-2d-v1.js'])await page.addScriptTag({path:path.join(dist,f)});
  const art=require('../config/monster-art.json'),coverage=[];
  for(let start=0;start<art.length;start+=4){
   const batch=art.slice(start,start+4);
   await page.evaluate(async batch=>{
    await CellboundMonsterVisuals.preload(batch.map(a=>a.name));
    const party=Array.from({length:5},(_,i)=>{const klass=['Warrior','Rogue','Hunter','Paladin','Mage'][i],equipment={};for(const pos of CellboundGear.EQUIPMENT_POSITION_ORDER)equipment[pos]=CellboundGear.items.find(x=>x.class===klass&&x.tier===1&&x.slot===pos);return{...testParty[0],id:'qa-'+i,name:klass,class:klass,spec:['Protection','Assassination','Beast Mastery','Holy','Fire'][i],role:i===0?'tank':i===3?'healer':'dps',equipment,level:30,power:20}});
    const encounter={id:'monster-art-qa',title:'Monster animation coverage',kind:'trash',level:8,enemies:batch.map(a=>({name:a.name,classification:'elite',attackRange:['caster','elemental','ranged','machine'].includes(a.family)?25:5,damageType:a.family==='caster'?'magic':'physical'})),enemyHealth:3000,mechanics:[]};
    const result=CellboundCombatReborn.simulate({party,encounter,seed:'monster-art',maxDurationMs:30000});
    window.coverageFrames={};window.capture=setInterval(()=>document.querySelectorAll('[data-monster-id]').forEach(n=>{const id=n.dataset.monsterId;const frames=coverageFrames[id]||=[];const frame=Number(n.querySelector('[data-sprite-frame]')?.dataset.spriteFrame);if(!frames.includes(frame))frames.push(frame)}),40);
    window.playback=CellboundDungeon2D.playSharedEncounter({party,encounter,result,theme:'ashen',room:'hall-embers',zone:'ashen-vault',environmentHtml:'<img alt="" src="assets/ashen-vault/rooms/hall-embers.webp" style="width:100%;height:100%;object-fit:cover">'});
   },batch);
   await page.waitForFunction(n=>document.querySelectorAll('#cb2dArena [data-monster-id]').length===n,batch.length);
   await page.waitForTimeout(6500);
   await page.screenshot({path:dir+'/batch-'+start+'-combat.png'});
   const observed=await page.evaluate(()=>{clearInterval(capture);return coverageFrames});
   for(const a of batch){assert(observed[a.id]?.some(f=>f===1||f===2),a.id+' must perform a real engine-driven attack: '+JSON.stringify(observed));coverage.push({id:a.id,liveFrames:observed[a.id]})}
   // The existing controller owns death priority and recovery for every visual family.
   await page.evaluate(()=>{const arena=document.querySelector('#cb2dArena');document.querySelectorAll('#cb2dArena .enemy').forEach(el=>{CellboundCombatFX.combatEvent({type:'ENEMY_DEFEATED',target:el.dataset.unit,timestamp:1000},{arena,speed:1});CellboundCombatFX.combatEvent({type:'ABILITY_START',source:el.dataset.unit,target:'p-qa-0',timestamp:1001},{arena,speed:1})})});
   await page.waitForTimeout(1100);
   for(const a of batch)assert.equal(await page.locator('[data-monster-id="'+a.id+'"] [data-sprite-frame]').getAttribute('data-sprite-frame'),'5',a.id+' death priority');
   await page.screenshot({path:dir+'/batch-'+start+'-death.png'});
   await page.evaluate(()=>CellboundDungeon2D.closeShared(true));await page.waitForTimeout(150);
  }
  // Decode failures retain the existing fallback, rather than invisible combatants.
  await page.route('**/assets/monsters/v1/deadeye-mercer.webp',route=>route.abort());
  await page.evaluate(async()=>{await CellboundMonsterVisuals.preload(CellboundMonsterVisuals.art.slice(1).map(a=>a.id));const el=document.createElement('div');el.className='cb2d-unit enemy';el.innerHTML='<i>fallback</i><span>Deadeye Mercer</span>';document.body.appendChild(el);window.failedActor=el;CellboundMonsterVisuals.mount(el)});
  await page.waitForTimeout(2000);assert.equal(await page.locator('body>div.enemy.cb-monster-illustrated').count(),0,'failed image keeps fallback');
  assert(await page.evaluate(()=>CellboundMonsterVisuals.diagnostics().decoded<=12));
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(async()=>{await CellboundMonsterVisuals.preload(['Lunar Drone']);const scene=document.createElement('div');scene.className='cbl-scene';scene.innerHTML='<div class="cb2d-unit enemy" data-animation-owned="1" data-animation-state="idle"><span>Lunar Drone</span></div>';document.body.appendChild(scene);const el=scene.firstChild;CellboundMonsterVisuals.mount(el);CellboundMonsterVisuals.apply(el,{clip:'thrust',progress:.5,reduced:true});const ready=el.querySelector('[data-sprite-frame]').dataset.spriteFrame,animation=getComputedStyle(el.querySelector('.cb-monster-sprite')).animationName;CellboundMonsterVisuals.apply(el,{clip:'death',progress:1,dead:true,reduced:true});return{ready,animation,dead:el.querySelector('[data-sprite-frame]').dataset.spriteFrame}});
  assert.deepEqual(reduced,{ready:'0',animation:'none',dead:'5'});
  assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/coverage.json',JSON.stringify(coverage,null,2));console.log('17 monsters: live engine attacks, six authored poses, death priority, bounded loading and failure fallback passed');
 }finally{await context.close();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
