'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 const page=await browser.newPage({viewport:{width:1024,height:1366}});
 const errors=await mount(page,matureState(),true);
 try{
  await page.waitForFunction(()=>window.CellboundAdmin?.role==='owner'&&window.CellboundDesignBooth&&window.CellboundDesignedContent,{},{timeout:12000});
  await page.evaluate(()=>CellboundGame.switchView('admin'));
  await page.locator('[data-admin-panel-tab="tools"]').click();
  await page.waitForSelector('#designBoothEntry:not([hidden])',{timeout:5000});
  assert.equal(await page.locator('#designBoothEntry').isVisible(),true,'Owner gets a Design Booth entry');
  for(const old of ['#roomEditorEntry','#comicSceneEditorEntry','#dungeonGeneratorEntry','#characterFitViewerEntry']){
   assert.equal(await page.locator(old).isVisible(),false,'Retired separate tool card stays hidden: '+old)
  }
  await page.locator('#openDesignBooth').click();
  await page.waitForSelector('#designBoothMount:not([hidden]) .dbo-shell',{timeout:6000});
  assert.equal(await page.locator('[data-dbo-tool]').count(),6,'Master booth has six creative tabs');
  await page.locator('#dboNewDungeon').click();
  assert(await page.locator('#dboWorkbench').innerText().then(t=>t.includes('Untitled dungeon')),'Dungeon builder opens');
  await page.locator('#dboAddType').selectOption('minigame');
  await page.locator('#dboAddStep').click();
  assert(await page.locator('[data-db-field="step.template"]').count()===1,'Minigame stage editor supports reusable templates');
  await page.locator('[data-dbo-tool="templates"]').click();
  assert(await page.locator('#dboTemplates').innerText().then(t=>t.includes('Choice Puzzle')&&t.includes('Sequence Puzzle')),'Template library exposes built-in games');
  await page.locator('[data-dbo-tool="rooms"]').click();
  assert.equal(await page.locator('#roomEditorMount .rqe-shell').count(),1,'Existing room editor is a Design Booth tab');
  await page.locator('[data-dbo-tool="comics"]').click();
  await page.waitForFunction(()=>document.querySelector('#comicSceneEditorMount .cse-shell')!=null,{},{timeout:12000});
  await page.locator('[data-dbo-tool="models"]').click();
  assert.equal(await page.locator('#characterFitViewerMount').isVisible(),true,'Character fit viewer is a Design Booth tab');
  await page.locator('#dboClose').click();
  assert.equal(await page.locator('#designBoothMount').isVisible(),false,'Design Booth closes cleanly');
  assert.deepEqual(errors,[],'No browser exceptions in owner creative suite');
  console.log(engine===webkit?'WebKit':'Chromium','Design Booth browser regression passed: one entry, six tabs, stage creation, minigames, room/comic/model editors and clean close.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
