/* Run after npm run build. Requires Playwright and its Chromium browser. */
const {chromium,webkit}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 const page=await browser.newPage({viewport:{width:1024,height:768}}),errors=[];await page.bringToFront();
 page.on('pageerror',e=>{errors.push(String(e));console.error(e.stack||String(e))});
 await page.emulateMedia({reducedMotion:'no-preference'});
 page.on('console',msg=>{if(/visual skipped|visual recovered/.test(msg.text()))errors.push(msg.text())});
 await page.setContent('<body style="background:#10171d"><div class="cb2d-arena" id="cb2dArena" style="width:900px;height:560px;position:relative"></div></body>');
 for(const f of ['dungeon-2d-v1.css','combat-portraits-v1.css','combat-polish-v2.css','combat-polish-v3.css','combat-physical-v4.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,'dist',f),'utf8')});
 await page.evaluate(()=>{
  const arena=document.querySelector('#cb2dArena');
  const entries=[['p-t','Tank','warrior',48,50],['p-h','Healer','priest',20,58],['p-m','Mage','mage',25,30],['p-r','Rogue','rogue',58,56],['p-a','Hunter','hunter',24,74],['e-0','Boss','enemy',54,50]];
  for(const [id,name,c,x,y]of entries){const el=document.createElement('div');el.className='cb2d-unit '+(id[0]==='p'?'party class-'+c+' cb-combat-has-portrait':'enemy boss cb-combat-has-boss-portrait');el.dataset.unit=id;el.style.setProperty('--unit-x',x*9+'px');el.style.setProperty('--unit-y',y*5.6+'px');el.innerHTML='<i></i><div class="'+(id[0]==='p'?'cb-combat-portrait':'cb-combat-boss-portrait')+'" style="background:radial-gradient(circle at 40% 30%,#b5a086,#243642);display:grid;place-items:center;color:white">'+name[0]+'</div><span>'+name+'</span><em class="cb2d-unit-hp"><i style="width:100%"></i></em>';arena.appendChild(el)}
  window.send=(type,source='p-t',target='e-0',payload={},extra={})=>window.CellboundCombatFX.combatEvent({type,source,target,timestamp:1000,payload,...extra},{arena});
 });
 for(const f of ['combat-polish-v2.js','combat-polish-v3.js','combat-physical-v4.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist',f),'utf8')});
 await page.evaluate(()=>send('COMBAT_START'));
 assert.equal(await page.locator('.cbl-facing').count(),6);
 await page.evaluate(()=>{send('ABILITY_START','p-t','e-0',{kind:'damage',range:5});send('DAMAGE_DEALT','p-t','e-0',{targetMax:1000},{amount:35,result:'hit'})});
 const portraitAnimated=await page.evaluate(()=>document.querySelector('[data-unit="p-t"] .cb-combat-portrait').getAnimations().length>0);
 assert(portraitAnimated,'animate the visible portrait');
 assert.equal(await page.locator('.cbl-fx.contact').count(),1,'one impact owner');
 await page.waitForFunction(()=>document.querySelectorAll('.cbl-fx.contact').length===0,{},{timeout:5000});
 await page.evaluate(()=>send('DAMAGE_DEALT','p-t','e-0',{}, {amount:0,result:'miss'}));
 assert.equal(await page.locator('.cbl-fx.contact').count(),0,'miss cannot hit');
 await page.evaluate(()=>send('DEBUFF_APPLIED','e-0','p-t',{}, {statusEffects:[{id:'stun',cc:'stun'}]}));
 await page.evaluate(()=>send('ABILITY_START','p-t','e-0',{kind:'damage',range:5}));
 assert.equal(await page.locator('[data-unit="p-t"]').getAttribute('data-combat-state'),'controlled');
 await page.evaluate(()=>send('DEBUFF_REMOVED','e-0','p-t',{}, {statusEffects:[{id:'stun'}]}));
 await page.evaluate(()=>{send('CAST_START','p-m','e-0',{duration:700},{ability:'Fireball'});send('CAST_START','p-h','p-t',{duration:900},{ability:'Flash Heal'})});
 assert.equal(await page.locator('.cbl-casting').count(),2,'independent casts overlap');
 await page.waitForFunction(()=>document.querySelector('.cast-orb'),{},{timeout:5000});
 assert(await page.locator('.cast-orb').count()>0,'cast travel before resolution');
 await page.evaluate(()=>send('INTERRUPT','e-0','p-m',{}, {result:'success'}));
 assert.equal(await page.locator('[data-unit="p-m"].cbl-casting').count(),0);
 await page.evaluate(()=>send('PLAYER_DEFEATED','e-0','p-r'));
 await page.evaluate(()=>send('ABILITY_START','p-r','e-0',{kind:'damage',range:5}));
 assert.equal(await page.locator('[data-unit="p-r"]').getAttribute('data-combat-state'),'dead');
 await page.evaluate(()=>send('PLAYER_REVIVED','p-h','p-r'));
 assert.equal(await page.locator('[data-unit="p-r"]').getAttribute('data-combat-state'),'reviving');
 await page.evaluate(()=>send('MOVEMENT_START','p-a',null,{to:{x:38,y:70},duration:180}));
 await page.waitForTimeout(210);
 await page.evaluate(()=>send('MOVEMENT_END','p-a',null,{}, {position:{x:38,y:70}}));
 assert.equal(await page.locator('[data-unit="p-a"]').getAttribute('data-x'),'38');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{send('CAST_START','p-m','e-0',{duration:700});send('INTERRUPT','p-t','e-0',{}, {result:'success'})});
 assert(await page.locator('.cbl-fx.interrupt').count()>0,'reduced motion preserves mechanic feedback');
 await page.screenshot({path:'/tmp/cellbound-living-combat.png'});
 await page.evaluate(()=>{send('COMBAT_END');document.querySelector('#cb2dArena').remove()});
 await page.waitForTimeout(100);
 assert.deepEqual(errors,[]);
 // Exercise the production shared viewer with real Combat Reborn events and portraits.
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setContent('<base href="https://cellbound.test/"><body style="background:#081115;color:white"></body>');
 await page.route('https://cellbound.test/**',async route=>{
  const relative=new URL(route.request().url()).pathname.slice(1),file=path.resolve(root,'dist',relative);
  if(!file.startsWith(path.resolve(root,'dist')+path.sep)||!fs.existsSync(file)){await route.fulfill({status:404,body:''});return}
  await route.fulfill({path:file})
 });
 for(const f of ['dungeon-2d-v1.css','character-portraits-v1.css','combat-portraits-v1.css','combat-vitals-ui-v1.css','combat-polish-v2.css','combat-polish-v3.css','combat-physical-v4.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,'dist',f),'utf8')});
 await page.evaluate(()=>{
  window.testParty=Array.from({length:10},(_,i)=>({id:'raid-'+Math.floor(i/5)+'-'+i,name:['Aegis','Mercy','Ember','Fletch','Shade'][i%5]+(i<5?' A':' B'),class:['Warrior','Priest','Mage','Hunter','Rogue'][i%5],spec:['Protection','Holy','Arcane','Marksman','Assassination'][i%5],role:i%5===0?'tank':i%5===1?'healer':'dps',level:15,power:12,itemLevel:30}));
  window.CellboundGame={ready:true,getState:()=>({roster:window.testParty}),getPartyCharacters:()=>window.testParty,characterItemLevel:()=>30,isUnavailable:()=>false};
 });
 for(const f of ['character-portraits-v1.js','combat-portraits-v1.js','combat-reborn-v1.js','dungeon-2d-v1.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist',f),'utf8')});
 await page.evaluate(()=>{
  const encounter={id:'manor-butler',title:'The Butler',kind:'boss',level:15,enemies:[{name:'The Butler',classification:'boss'}],enemyHealth:10000,mechanics:[]};
  const result=CellboundCombatReborn.simulate({party:window.testParty,encounter,seed:'browser-raid',maxDurationMs:12000});
  window.testPlayback=CellboundDungeon2D.playSharedEncounter({party:window.testParty,encounter,result,theme:'manor'});
 });
 await page.waitForTimeout(2400);
 await page.screenshot({path:'/tmp/cellbound-living-combat.png'});
 assert.deepEqual(errors,[]);
 assert.equal(await page.locator('#cb2dArena .cbl-unit').count(),11,'production raid uses shared controller');
 assert.equal(await page.locator('#cb2dArena .cb-combat-portrait').count(),10,'all raid portraits are visible');
 assert.equal(await page.locator('#cb2dArena .cb-combat-boss-portrait img').getAttribute('src'),'./assets/manor/manor-butler.webp');
 assert.equal(await page.locator('.cbl-room[data-room="manor"] .cbl-prop').count(),6,'one bounded room decoration layer');
 await page.evaluate(()=>{
  const arena=document.querySelector('#cb2dArena');
  const send=(type,payload={},extra={})=>CellboundCombatFX.combatEvent({type,source:'e-0',ability:'Porcelain Shards',timestamp:3000,payload,...extra},{arena});
  window.sceneSend=send;
  send('GROUND_HAZARD_SPAWNED',{hazardId:'review-shards',radius:11,duration:300},{position:{x:30,y:65}});
 });
 assert.equal(await page.locator('.cbl-hazard.porcelain').count(),1);
 await page.waitForFunction(()=>document.querySelector('.cbl-hazard')?.dataset.phase==='expiring',{},{timeout:5000});
 assert.equal(await page.locator('.cbl-hazard').count(),1,'expiry anticipation cannot remove an authoritative hazard');
 await page.evaluate(()=>sceneSend('GROUND_HAZARD_EXPIRED',{hazardId:'review-shards'}));
 assert.equal(await page.locator('.cbl-hazard').count(),0);
 await page.evaluate(()=>{
  const arena=document.querySelector('#cb2dArena');
  for(const [i,name] of ['Crypt Spider','Undead Knight','Fel Demon','Canyon Wolf','Nail Turret','Cult Healer','Vault Guard','Brute'].entries()){
   const el=document.createElement('div');el.className='cb2d-unit enemy';el.dataset.unit='art-'+i;el.innerHTML='<i></i><span>'+name+'</span>';arena.appendChild(el);
  }
  CellboundCombatPortraits.refresh();
 });
 assert.equal(await page.locator('.cb-combat-monster-portrait').count(),8,'all fallback monster families mount');
 assert.equal(await page.locator('[data-monster="spider"]').count(),1);
 await page.evaluate(()=>CellboundCombatPortraits.refresh());
 assert.equal(await page.locator('.cb-combat-monster-portrait').count(),8,'portrait refresh is idempotent');
 await page.evaluate(()=>document.querySelectorAll('[data-unit^="art-"]').forEach(n=>n.remove()));
 // Exercise resized iPad/phone viewports without changing engine coordinates.
 await page.setViewportSize({width:768,height:1024});
 await page.waitForFunction(()=>{const a=document.querySelector('#cb2dArena'),u=a.querySelector('[data-unit^="p-"]');return Math.abs(parseFloat(u.style.getPropertyValue('--unit-x'))-Number(u.dataset.x)/100*a.clientWidth)<1},{},{timeout:5000});
 const resizePosition=await page.evaluate(()=>{
  const arena=document.querySelector('#cb2dArena'),unit=arena.querySelector('[data-unit^="p-"]');
  return {x:Number(unit.dataset.x),px:parseFloat(unit.style.getPropertyValue('--unit-x')),width:arena.clientWidth};
 });
 assert(Math.abs(resizePosition.px-resizePosition.x/100*resizePosition.width)<1,'resize preserves normalized positions');
 await page.setViewportSize({width:1024,height:768});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>sceneSend('PHASE_CHANGE',{}, {ability:'Room Collapse'}));
 assert.equal(await page.locator('#cb2dArena').evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length),0,'reduced motion suppresses camera emphasis');
 await page.evaluate(()=>{
  const arena=document.querySelector('#cb2dArena');
  const target=arena.querySelector('[data-unit^="p-"]').dataset.unit;
  for(let i=0;i<200;i++)CellboundCombatFX.combatEvent({type:'DAMAGE_DEALT',source:'e-0',target,amount:1,result:'hit',payload:{}},{arena});
 });
 assert(await page.locator('.cbl-effects>.cbl-fx:not(.cast-orb):not(.channel)').count()<=36,'transient FX remain bounded under an event burst');
 await page.waitForFunction(()=>document.querySelectorAll('.cbl-effects>.cbl-fx').length===0,{},{timeout:5000});
 await page.emulateMedia({reducedMotion:'no-preference'});


 await page.screenshot({path:'/tmp/cellbound-living-combat.png'});
 await page.evaluate(()=>CellboundDungeon2D.closeShared(true));
 assert.deepEqual(errors,[]);
 await browser.close();console.log('Living combat browser checks passed: visible portraits, one impact, misses, CC, concurrent casts, travel, interrupts, deaths, revival, movement, reduced motion, cleanup.');
})().catch(e=>{console.error(e);process.exit(1)});
