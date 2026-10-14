'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:1024}});
  await mount(page,matureState(),true,{simulateDungeonRuntime:true});
  await page.waitForFunction(()=>window.CellboundAdmin?.role==='owner'&&window.CellboundPvPOwnerQA&&window.CellboundPvPPreTactics,{},{timeout:15000});
  await page.evaluate(()=>window.CellboundGame.switchView('pvp'));
  const practice=page.locator('#pvpMount > .cbpvp-qa');
  await practice.waitFor({timeout:8000});
  assert.equal(await page.locator('#pvpMount .pvp-hero').count(),0,'owner reaches the practice room directly, not the locked splash');
  assert(await practice.locator('[data-pvp-qa-mode]').isVisible(),'PvP setup can be used');
  assert(await practice.locator('[data-pvp-plan]').count()===1,'pre-match tactics are on the same screen');
  await practice.locator('[data-pvp-plan] summary').click();
  assert(await practice.locator('[data-pvp-plan-field="target"]').isVisible(),'advanced orders expand');
  await practice.locator('[data-pvp-plan-preset="assault"]').click();
  assert.equal(await practice.locator('[data-pvp-plan-field="target"]').inputValue(),'attack-healer');
  await practice.locator('[data-pvp-qa-mode]').selectOption('capture-the-flag');
  assert.equal(await practice.locator('[data-pvp-plan-field="objective"]').inputValue(),'take-flag','CTF loads independent saved plan');
  await practice.locator('[data-pvp-qa-mode]').selectOption('arena');
  await practice.locator('[data-pvp-qa-start]').click();
  const shell=practice.locator('[data-pvp-qa-viewer] .cbcombat-pvp-shell');
  await shell.waitFor({timeout:12000});
  await shell.locator('[data-pvp-unit-stage]').waitFor();
  for(const viewport of [{width:1366,height:1024},{width:1024,height:1366},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(250);
   const metrics=await shell.evaluate(el=>{
    const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right}};
    return{shell:rect(el),stage:rect(el.querySelector('[data-pvp-unit-stage]')),grid:rect(el.querySelector('.cbcombat-grid')),width:document.documentElement.scrollWidth,viewport:window.innerWidth,
      shellHeight:getComputedStyle(el).height,rows:getComputedStyle(el).gridTemplateRows}
   });
   assert(metrics.shell?.w>200&&metrics.shell.w<=viewport.width+2,'practice shell fits '+viewport.width+'px viewport: '+JSON.stringify(metrics));
   assert(metrics.stage?.w>170&&metrics.stage.h>=200,'practice battlefield remains usable at '+viewport.width+'px: '+JSON.stringify(metrics));
   assert(metrics.grid?.h>150&&metrics.shell.h>metrics.stage.h,'rosters do not collapse the embedded window');
   assert(metrics.width<=metrics.viewport+3,'no horizontal page overflow at '+viewport.width+'px');
  }
  assert(await practice.locator('[data-pvp-qa-stop]').isVisible(),'Stop practice is reachable');
  await practice.locator('[data-pvp-qa-stop]').click();
  assert.equal(await practice.locator('.cbcombat-pvp-shell').count(),0,'closing a practice match restores the setup');
  console.log('PvP practice browser window passed on landscape iPad, portrait iPad and phone: opener, presets, map changes, battlefield and exit.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
