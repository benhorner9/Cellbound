'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  if(process.env.CELLBOUND_UI_SCREENSHOTS){fs.mkdirSync(process.env.CELLBOUND_UI_SCREENSHOTS,{recursive:true});process.on('unhandledRejection',e=>console.error(e))}
  const errors=await mount(page,matureState(),true,{simulateDungeonRuntime:true});
  await page.evaluate(()=>{const s=CellboundGame.getState();s.progression.fracturedAgesUnlocked=true;s.roster.forEach(c=>{c.power=12;if(c.class==='Hunter')c.spec='Beast Mastery';for(const slot of ['Head','Chest','Weapon','OffHand','Shoulders','Hands','Legs','Feet','Waist'])c.equipment[slot]={...CellboundGear.items.find(x=>x.class===c.class&&x.tier===3&&x.slot===slot),class:c.class,slot,itemLevel:50,baseItemLevel:50}});CellboundGame.renderAll();CellboundFracturedAges.open()});
  await page.locator('[data-fa-start]').click();
  await page.waitForSelector('#q2dArena [data-animation-owned="1"]',{timeout:45000});
  const shell=page.locator('.cbcombat-shell:visible');
  for(const size of [{width:1280,height:720},{width:1366,height:1024},{width:1024,height:1366},{width:390,height:844},{width:375,height:667},{width:844,height:390}]){
   await page.setViewportSize(size);await page.waitForTimeout(350);
   const metrics=await shell.evaluate(s=>{
    const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    return{shell:rect(s),arena:rect(s.querySelector('.cbcombat-arena')),commands:[...s.querySelectorAll('.cbr-command-column button')].map(rect),panel:rect(s.querySelector('.cbcombat-command-panel')),wrap:rect(s.querySelector('.cbcombat-arena-wrap')),grid:rect(s.querySelector('.cbcombat-grid')),children:[...s.children].map(e=>({cls:e.className,hidden:e.hidden,height:getComputedStyle(e).height,display:getComputedStyle(e).display})),scroll:s.scrollHeight,client:s.clientHeight};
   });
   console.log(size,JSON.stringify(metrics));
   if(process.env.CELLBOUND_UI_SCREENSHOTS)await page.screenshot({path:process.env.CELLBOUND_UI_SCREENSHOTS+'/'+size.width+'x'+size.height+'.png'});
   assert(metrics.arena.width>size.width*.85,'battlefield uses screen width');
   assert(metrics.arena.height>180,'battlefield keeps usable vertical space');
   assert(metrics.scroll<=metrics.client+1,'combat shell never needs page scrolling');
   for(const b of metrics.commands){assert(b.width>=40&&b.height>=40,'touch target');assert(b.y>=0&&b.bottom<=size.height+1&&b.right<=size.width+1,'command within viewport')}
   await shell.locator('[data-combat-drawer="chat"]').click();
   assert(await shell.locator('.cbcombat-chat').isVisible());
   const chat=await shell.locator('.cbcombat-chat').boundingBox();assert(chat.y>=0&&chat.y+chat.height<=size.height,'chat fits');
   await page.keyboard.press('Escape');assert(await shell.locator('.cbcombat-chat').isHidden());
   await shell.locator('[data-combat-drawer="meters"]').click();assert(await shell.locator('.cbcombat-meters-panel').isVisible());
   await shell.locator('[data-combat-drawer="meters"]').click();
   if(process.env.CELLBOUND_UI_SCREENSHOTS){fs.mkdirSync(process.env.CELLBOUND_UI_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.CELLBOUND_UI_SCREENSHOTS+'/'+size.width+'x'+size.height+'.png'})}
  }
  await page.setViewportSize({width:1024,height:1366});
  const spread=shell.locator('[data-q-command="spread"]');if(await spread.isEnabled()){await spread.click();assert(await spread.isDisabled(),'native command handler still runs')}
  await shell.evaluate(s=>CellboundCombatViewer.setResults(s,true));assert(await shell.locator('.cbcombat-grid').isHidden());
  await shell.evaluate(s=>CellboundCombatViewer.setResults(s,false));assert(await shell.locator('.cbcombat-grid').isVisible());
  page.once('dialog',d=>d.accept());await page.locator('[data-q-close]').click();
  await page.locator('[data-fa-return]').click();
  assert.equal(await page.locator('.fa-failed:visible').count(),0,'departure result is dismissed before opening raid');
  await page.evaluate(()=>{CellboundGame.getState().roster.forEach(c=>{c.cellShock=0;c.cellShockLockedUntil=null});CellboundGame.renderAll()});
  await page.waitForFunction(()=>window.CellboundAdmin?.role==='owner');
  await page.evaluate(()=>CellboundManorRaid.startOwnerSoloQa());
  await page.locator('#manorRaidOverlay [data-raid-ready]').waitFor();
  await page.locator('#manorRaidOverlay [data-raid-ready]').evaluate(b=>b.click());
  await page.waitForSelector('#cb2dBackdrop:not([hidden]) .mr-room-scene.room-butler',{timeout:30000});
  for(const size of [{width:1366,height:1024},{width:390,height:844}]){
   await page.setViewportSize(size);await page.waitForTimeout(1000);
   const raid=page.locator('#cb2dBackdrop .cbcombat-shell');
   await raid.locator('[data-combat-compare]').click();assert.equal(await raid.getAttribute('data-combat-layout'),'classic');
   await raid.locator('[data-combat-compare]').click();assert.equal(await raid.getAttribute('data-combat-layout'),'immersive');
   const cards=await raid.locator('#cb2dRows > .cb2d-party-row:visible').count();
   assert.equal(cards,10,'both raid parties stay visible');
   const visible=await raid.locator('#cb2dRows > .cb2d-party-row').evaluateAll(rows=>rows.every(row=>{const r=row.getBoundingClientRect(),panel=row.closest('.cbcombat-party-panel').getBoundingClientRect();return r.width>=50&&r.x>=panel.x&&r.right<=panel.right+1&&r.y>=panel.y&&r.bottom<=panel.bottom+1}));assert(visible,'all raid cards fit inside party panel');
   if(process.env.CELLBOUND_UI_SCREENSHOTS)await page.screenshot({path:process.env.CELLBOUND_UI_SCREENSHOTS+'/butler-'+size.width+'.png'});
   const actions=await raid.locator('.cbr-command-column button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{w:r.width,h:r.height,y:r.y,bottom:r.bottom}}));assert.equal(actions.length,8);for(const b of actions)assert(b.w>=40&&b.h>=40&&b.y>=0&&b.bottom<=size.height,'raid commands fit: '+JSON.stringify({size,actions}));
   const arena=await raid.locator('[data-combat-arena]').boundingBox();assert(arena.height>180&&arena.y+arena.height<size.height,'raid arena fits');
   if(process.env.CELLBOUND_UI_SCREENSHOTS)await page.screenshot({path:process.env.CELLBOUND_UI_SCREENSHOTS+'/butler-'+size.width+'.png'});
  }
  await page.evaluate(()=>CellboundManorRaid.endOwnerSoloQa());
  assert.deepEqual(errors,[]);console.log('Immersive combat: responsive HUD, chat, meters, command, results and exit passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
