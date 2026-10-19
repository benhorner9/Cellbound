'use strict';
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),evidence=process.env.CELLBOUND_CONTROL_EVIDENCE||'/tmp/cellbound-control-evidence';fs.mkdirSync(evidence,{recursive:true});
(async()=>{
 const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;
 const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 try{
 const errors=[],missing=[];const page=await browser.newPage({viewport:{width:1366,height:1024},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(/visual recovered|visual skipped/.test(m.text()))errors.push(m.text())});
 await page.route('https://cellbound.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1),file=path.resolve(root,'dist',name);if(file.startsWith(path.join(root,'dist')+path.sep)&&fs.existsSync(file))await route.fulfill({path:file});else{missing.push(name);await route.fulfill({status:404,body:''})}});
 await page.setContent('<base href="https://cellbound.test/"><body style="margin:0;background:#101719"></body>');
 const html=fs.readFileSync(path.join(root,'dist/guild.html'),'utf8');
 for(const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\.\/([^"?]+)/g))await page.addStyleTag({content:fs.readFileSync(path.join(root,'dist',m[1]),'utf8')});
 await page.evaluate(()=>{
  window.testParty=[['Warrior','Protection','tank'],['Paladin','Holy','healer'],['Hunter','Beast Mastery','dps'],['Rogue','Assassination','dps'],['Mage','Frost','dps']].map(([klass,spec,role],i)=>({id:'test-'+i,name:['Aegis','Mercy','Fletch','Shade','Ember'][i],class:klass,spec,role,level:15,power:20,gear:40,_combatItemLevel:40}));
  window.saved=JSON.stringify(testParty);window.CELLBOUND_CONTROL_PREVIEW=true;window.CellboundAdmin={role:'owner'};
  window.CellboundGame={ready:true,getState:()=>({roster:testParty,progression:{ashenVaultUnlocked:true}}),getPartyCharacters:()=>testParty,characterItemLevel:()=>40,isUnavailable:()=>false,save(){throw Error('Control trial tried to save account')}};
 });
 for(const f of ['class-build-v1.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js','combat-portraits-v1.js','monster-visuals-v1.js','combat-data-v1.js','combat-reborn-v1.js','combat-standard-v1.js','combat-viewer-v1.js','combat-hud-standard-v1.js','combat-polish-v2.js','combat-polish-v3.js','combat-animation-catalog-v1.js','combat-animation-v1.js','combat-spatial-v1.js','combat-physical-v4.js','living-control-v2.js','dungeon-2d-v1.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist',f),'utf8')});
 await page.evaluate(()=>{
  const party=testParty.map((c,i)=>({...c,_combatPosition:{x:30+i*7,y:60}}));
  const encounter={id:'control-browser',title:'Ashen Vault control test',kind:'boss',level:3,enemyHealth:100000,enemies:[{name:'Ash Warden Kael',classification:'boss',passive:true,currentPosition:{x:50,y:45}}],mechanics:[['Searing Bolt','interrupt',2400]],environment:{bounds:{left:8,right:92,top:10,bottom:90}}};
  window.testRun=CellboundDungeon2D.playSharedEncounter({party,encounter,result:{seed:'touch-control',events:[],finalState:{players:[],enemies:[]}},controlTrial:true,disableConsumables:true,theme:'ashen',environmentHtml:'<img class="cb2d-stage-image" src="./assets/ashen-vault/rooms/broken-gate.webp" alt="">'});
 });
 await page.waitForSelector('.lc-hud');
 assert.equal(await page.locator('.lc-heroes .cb-portrait').count(),5,'all five existing character portraits render');
 assert.equal(await page.locator('.lc-heroes [data-lc-resource]').count(),5,'all five resources have visible bars');
 const state=()=>page.evaluate(()=>CellboundDungeon2D.currentRun().rebornLiveSession.controlState());
 for(let i=0;i<5;i++){await page.locator('[data-lc-hero="p-test-'+i+'"]').tap();assert.equal((await state()).heroId,'p-test-'+i)}
 await page.locator('[data-unit="e-0"]').tap();assert.equal((await state()).heroes[4].targetId,'e-0');
 assert.equal(await page.evaluate(()=>CellboundDungeon2D.currentRun().rebornLiveSession.snapshot().control.actions.filter(a=>a.type==='command'&&a.command==='focus').length),0,'target selection does not order the party');
 const arena=page.locator('#cb2dArena'),box=await arena.boundingBox();assert(box.width>600&&box.height>400,'iPad battlefield dominates the viewport');
 await page.touchscreen.tap(box.x+box.width*.76,box.y+box.height*.76);
 await page.waitForFunction(()=>CellboundDungeon2D.currentRun().rebornLiveSession.snapshot().events.some(e=>e.type==='MOVEMENT_START'&&e.source==='p-test-4'&&e.result==='direct move'));
 await page.locator('[data-lc-orders]').tap();await page.locator('[data-lc-command="hold"]').tap();
 assert(await page.evaluate(()=>CellboundDungeon2D.currentRun().rebornLiveSession.snapshot().events.some(e=>e.type==='PARTY_COMMAND'&&e.ability==='hold'&&e.result==='reposition')));
 await page.locator('[data-lc-orders]').tap();
 // Switch without pausing and use a defensive ability through the actual touch bar.
 await page.locator('[data-lc-hero="p-test-0"]').tap();
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-lc-ability]')].some(b=>!b.disabled),null,{timeout:15000});
 const usable=page.locator('[data-lc-ability]:not([disabled])').first(),abilityId=await usable.getAttribute('data-lc-ability');await usable.tap();
 assert(await page.evaluate(id=>CellboundDungeon2D.currentRun().rebornLiveSession.snapshot().control.actions.some(a=>a.type==='ability'&&a.abilityId===id),abilityId));
 for(const [label,width,height]of [['ipad',1366,1024],['phone',390,844],['desktop',1440,900]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  const dimensions=await page.evaluate(()=>{const arena=document.querySelector('#cb2dArena').getBoundingClientRect(),hud=document.querySelector('.lc-hud').getBoundingClientRect();return{arena:{x:arena.x,y:arena.y,w:arena.width,h:arena.height,bottom:arena.bottom},hud:{y:hud.y,bottom:hud.bottom},w:innerWidth,h:innerHeight}});
  await page.screenshot({path:path.join(evidence,label+'-'+engine.name()+'.png')});console.log(label,JSON.stringify(dimensions));
  assert(dimensions.arena.h>200,label+' battlefield remains visible');assert(dimensions.hud.bottom<=height+2,label+' controls fit viewport');assert(dimensions.arena.bottom<=dimensions.hud.y+2,label+' controls do not cover battlefield');
  for(const b of await page.locator('[data-lc-hero]').all()){const r=await b.boundingBox();assert(r.x>=-1&&r.x+r.width<=width+1&&r.y+r.height<=height+1,label+' all heroes reachable')}
  await page.screenshot({path:path.join(evidence,label+'-'+engine.name()+'.png')});
 }
 assert(await page.evaluate(()=>{const session=CellboundDungeon2D.currentRun().rebornLiveSession;return session.controlState().positions.every(p=>{const el=[...document.querySelectorAll('#cb2dArena [data-unit]')].find(n=>n.dataset.unit===p.id);return !el||Math.hypot(parseFloat(el.style.left)-p.position.x,parseFloat(el.style.top)-p.position.y)<3})}),'visible unit coordinates follow authoritative simulation');
 await page.evaluate(()=>CellboundDungeon2D.closeShared(true));await page.waitForSelector('.lc-hud',{state:'detached'});
 // Actual existing Ashen Vault content, seven chambers, a five-hero AI party, carried combat state.
 await page.setViewportSize({width:1366,height:1024});
 await page.evaluate(()=>{window.trialPromise=CellboundDungeon2D.startControlTrial()});
 const chambers=[];
 for(let i=0;i<7;i++){
  await page.waitForFunction(()=>CellboundDungeon2D.currentRun()?.resolved===true,null,{timeout:180000});
  const result=await page.evaluate(()=>{const r=CellboundDungeon2D.currentRun();return{id:r.externalStage.id,outcome:r.rebornResult.outcome,time:r.rebornResult.durationMs,players:r.rebornResult.finalState.players.length,events:r.rebornResult.events.length}});
  chambers.push(result);assert.equal(result.outcome,'victory','Ashen chamber '+result.id);assert.equal(result.players,5);assert(result.events>10);
  if(i<6)await page.locator('[data-trial-next]').tap();
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(testParty)===saved),true,'saved account unchanged after full trial');
 await page.locator('[data-trial-leave]').tap();
 await page.evaluate(()=>{window.CELLBOUND_CONTROL_PREVIEW=false});
 assert(await page.evaluate(async()=>{try{await CellboundDungeon2D.startControlTrial();return false}catch{return true}}),'official build cannot enter owner trial');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 const report={engine:engine.name(),chambers,errors,missing,savedAccountUnchanged:true};fs.writeFileSync(path.join(evidence,'journey-'+engine.name()+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
