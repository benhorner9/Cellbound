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
  await page.waitForFunction(()=>twelveArtFrames.includes('5'),null,{timeout:60000});
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
