'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const {mount,coreLoopState}=require('./full-playthrough.browser.cjs');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:1024}}),state=coreLoopState();
  for(const [i,c] of state.roster.entries()){
   c.race=['Veyren','Stoneborn','Aelari','Thornkin','Emberkin'][i];c.appearance={gender:i%2,frame:i%3};
   c.equipment.OffHand={name:i===0?'Iron Shield':i===4?'Iron Dagger':'Focus',class:c.class,slot:'OffHand',tier:1,itemLevel:30};
   if(i===0)c.talents={Protection:{'Shield Mastery':3}};
  }
  const errors=await mount(page,state,false,{simulateDungeonRuntime:true});
  await page.evaluate(()=>CellboundDungeon2D.open());
  await page.locator('.cb2d-start[data-start]').click();
  await page.waitForSelector('#cb2dArena [data-animation-owned="1"]',{timeout:45000});
  const results=await page.evaluate(()=>new Promise(resolve=>{
   const frames=[],states=new Set(),start=performance.now();let last=start,maxActors=0;
   function frame(t){maxActors=Math.max(maxActors,document.querySelectorAll('#cb2dArena [data-animation-owned]').length);frames.push(t-last);last=t;document.querySelectorAll('#cb2dArena [data-animation-state]').forEach(n=>states.add(n.dataset.animationState));if(t-start<8000)requestAnimationFrame(frame);else{frames.sort((a,b)=>a-b);resolve({p95:frames[Math.floor(frames.length*.95)],frames:frames.length,states:[...states],actors:maxActors})}}
   requestAnimationFrame(frame);
  }));
  require('node:fs').mkdirSync('/tmp/cellbound-animation',{recursive:true});
  await page.screenshot({path:'/tmp/cellbound-animation/ashen-five-party-ipad.png'});
  assert(results.actors>=5,JSON.stringify(results));assert(results.states.some(x=>['swing','cast','thrust','bash'].includes(x)),'real dungeon events animate party');
  assert(await page.locator('#cb2dArena .cb2d-stage-image').count()>0,'actual Ashen room artwork');
  await page.setViewportSize({width:1024,height:1366});await page.screenshot({path:'/tmp/cellbound-animation/ashen-five-party-portrait.png'});
  assert(await page.locator('[data-speed]').isVisible());
  console.log('Dungeon rendering sample',JSON.stringify(results));
  await page.evaluate(()=>window.closedArena=document.querySelector('#cb2dArena'));
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('.cb2d-backdrop [data-close],.cbcombat-backdrop [data-close]').first().click();
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(()=>CellboundCombatAnimation.diagnostics(closedArena).pending),0,'closing combat drains visual callbacks');
  assert.deepEqual(errors,[]);
  console.log('Actual Ashen Vault, five party members and multiple enemies:',JSON.stringify(results));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
