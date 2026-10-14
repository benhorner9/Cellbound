'use strict';
// Production Twelve Below flow against the existing isolated offline fixture.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:1024}});
  const errors=await mount(page,matureState(),true,{simulateDungeonRuntime:true});
  await page.evaluate(async()=>{
   const s=CellboundGame.getState();s.roster.forEach(c=>{c.power=200;c.level=100;Object.values(c.equipment).forEach(item=>{if(item){item.itemLevel=200;item.baseItemLevel=200}})});
   CellboundGame.renderAll();
   await CellboundMonsterVisuals.preload([CellboundTwelveBelow.bosses[0].name]);
   window.twelveArtFrames=[];
   window.twelveArtObserver=new MutationObserver(()=>document.querySelectorAll('#tbArena [data-monster-id]').forEach(el=>{
    const frame=el.querySelector('[data-sprite-frame]')?.dataset.spriteFrame;
    if(frame&&!twelveArtFrames.includes(frame))twelveArtFrames.push(frame);
   }));twelveArtObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-sprite-frame']});
   CellboundTwelveBelow.open();
  });
  await page.locator('[data-tb-start]').click();
  await page.waitForSelector('.cbcombat-shell[data-combat-theme="twelve"]');
  const inspectHud=()=>page.evaluate(()=>{
   const shell=document.querySelector('.cbcombat-shell[data-combat-theme="twelve"]'),box=el=>{
    if(!el)return null;const r=el.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
   };
   const route=shell.querySelector('.cbcombat-route'),score=shell.querySelector('.tb-scorebar'),tombs=shell.querySelector('.tb-tomb-track'),
    panel=shell.querySelector('.cbcombat-command-panel'),buttons=[...panel.querySelectorAll('[data-tb-command],[data-tb-potion]')];
   return{view:{w:innerWidth,h:innerHeight},route:box(route),score:box(score),tombs:box(tombs),panel:box(panel),
    buttons:buttons.map(box),power:box(panel.querySelector('.cbr-inline-power')),tombCount:tombs.children.length};
  });
  const assertLayout=(layout,label)=>{
   assert.equal(layout.tombCount,12,label+' shows all twelve tomb statuses');
   assert(layout.score.height>=30&&layout.score.top>=0&&layout.score.bottom<=layout.tombs.top+2,label+' scoreboard not clipped');
   assert(layout.tombs.height>=30&&layout.tombs.bottom<=layout.route.bottom+2,label+' tomb track fully in route');
   assert(layout.route.bottom<=layout.panel.top-100,label+' battlefield present between HUD elements');
   assert(layout.panel.top>=0&&layout.panel.bottom<=layout.view.h+2,label+' command dock inside viewport');
   assert.equal(layout.buttons.length,8,label+' all seven commands plus potion');
   for(const b of layout.buttons)assert(b.width>=60&&b.height>=43&&b.left>=-1&&b.right<=layout.view.w+2&&b.top>=layout.panel.top-1&&b.bottom<=layout.panel.bottom+2,label+' command visible and tappable: '+JSON.stringify(b));
  };
  await page.waitForTimeout(300);
  const landscape=await inspectHud();assertLayout(landscape,'iPad 1366x1024');
  assert(landscape.power?.top>=landscape.panel.top&&landscape.power?.bottom<=landscape.buttons[0].top+2,'command power stays above buttons');
  await page.setViewportSize({width:1024,height:768});
  await page.waitForTimeout(140);
  assertLayout(await inspectHud(),'landscape 1024x768');
  await page.setViewportSize({width:1366,height:1024});
  await page.waitForFunction(()=>twelveArtFrames.includes('5'),null,{timeout:60000});
  const markers=await page.evaluate(()=>[...document.querySelectorAll('#tbArena .tb-unit')]
   .filter(n=>n.querySelector('.cb-combat-portrait,.cb-combat-boss-portrait,.cb-combat-monster-portrait')).map(n=>({
    id:n.dataset.tbBoss||n.dataset.tbUnit,hidden:!!n.querySelector(':scope > .tb-unit-placeholder')&&getComputedStyle(n.querySelector(':scope > .tb-unit-placeholder')).display==='none'
   })));
  assert(markers.length>0,'Twelve Below renders illustrated units');
  assert(markers.every(x=>x.hidden),'old coloured discs hidden beneath illustrated units: '+JSON.stringify(markers));
  assert(await page.locator('#tbArena [data-monster-id]').count(),'corpse remains visible through the final authored pose');
  fs.mkdirSync('/tmp/cellbound-monster',{recursive:true});
  await page.screenshot({path:'/tmp/cellbound-monster/twelve-death.png'});
  const frames=await page.evaluate(()=>{twelveArtObserver.disconnect();return twelveArtFrames});
  assert(frames.includes('0')&&frames.includes('4')&&frames.includes('5'));
  page.once('dialog',d=>d.accept());await page.locator('[data-tb-close]').click();
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>CellboundCombatAnimation.diagnostics().pending),0);
  assert.deepEqual(errors,[]);console.log('Twelve Below: actual entry, illustrated boss, impact/death completion and close cleanup passed',frames);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
