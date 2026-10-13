'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
const {mount,coreLoopState}=require('./full-playthrough.browser.cjs');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 try{
  fs.mkdirSync('/tmp/cellbound-realtime',{recursive:true});
  const page=await browser.newPage({viewport:{width:1366,height:1024}});
  const missing=[];page.on('response',r=>{if(r.status()===404){missing.push(r.url());console.log('Missing resource',r.url())}});
  const errors=await mount(page,coreLoopState(),false,{simulateDungeonRuntime:true});
  await page.evaluate(()=>{
   window.roomSamples=[];
   window.roomTimer=setInterval(()=>{
    const run=CellboundDungeon2D.currentRun(),arena=document.querySelector('#cb2dArena');if(!run||!arena)return;
    roomSamples.push({time:performance.now(),stage:run.stage,combat:run.combatActive,travel:arena.classList.contains('travelling'),
     units:[...arena.querySelectorAll('[data-unit^="p-"]')].map(e=>({id:e.dataset.unit,left:e.style.left,top:e.style.top,spatial:e.dataset.spatialState}))});
   },80);
   CellboundDungeon2D.open();
  });
  await page.locator('[data-start]').click();
  await page.waitForFunction(()=>CellboundDungeon2D.currentRun()?.stage>=2,null,{timeout:180000});
  if(process.env.CELLBOUND_REALTIME_FULL_RUN){
   const deadline=Date.now()+240000;
   while(Date.now()<deadline&&!await page.evaluate(()=>Number(CellboundGame.getState().dungeonCompletions)>0)){
    const begin=page.locator('[data-cbd-begin]');if(await begin.isVisible())await begin.click();
    await page.waitForTimeout(500);
   }
   assert(await page.evaluate(()=>Number(CellboundGame.getState().dungeonCompletions)>0),'full run completes through the real boss briefing');
  }
  const data=await page.evaluate(()=>{clearInterval(roomTimer);return roomSamples});
  fs.writeFileSync('/tmp/cellbound-realtime/rooms.json',JSON.stringify(data));
  const transit=data.filter(x=>x.travel);
  console.log({samples:data.length,transit:transit.length,stages:[...new Set(data.map(x=>x.stage))],errors});
  assert(transit.length>5);
  for(const stage of [0,1]){
   const samples=transit.filter(x=>x.stage===stage).flatMap(x=>x.units.filter(u=>u.id==='p-tank').map(u=>u.left+u.top));
   assert(new Set(samples).size>4,'party travels through exit '+stage);
  }
  if(process.env.CELLBOUND_REALTIME_FULL_RUN)await page.locator('[data-loot-return]').click();
  else{page.once('dialog',d=>d.accept());await page.locator('#cb2dBackdrop [data-close]').first().click()}
  await page.waitForTimeout(300);await page.evaluate(()=>CellboundDungeon2D.open());
  await page.locator('[data-start]').click();await page.waitForSelector('#cb2dArena [data-animation-owned="1"]');
  assert(await page.evaluate(()=>!!CellboundDungeon2D.currentRun()?.rebornLiveSession),'reentry owns live session');
  assert.deepEqual(errors,[]);
  console.log('Ashen room transitions and close/re-entry passed'+(process.env.CELLBOUND_REALTIME_FULL_RUN?' after all seven encounters and verified mock-server completion.':'.'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
