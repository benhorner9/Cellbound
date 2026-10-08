'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 const page=await browser.newPage({viewport:{width:1024,height:1366}});
 page.on('dialog',dialog=>dialog.accept());
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
  assert.equal(await page.locator('[data-dbo-tool]').count(),7,'Master booth has a dedicated Drop Tables tab');
  await page.locator('#dboNewDungeon').click();
  assert(await page.locator('#dboWorkbench').innerText().then(t=>t.includes('Untitled dungeon')),'Dungeon builder opens');
  await page.locator('[data-db-step="1"]').click();
  assert.equal(await page.locator('#dboWorkbench [data-db-drop]').count(),0,'Loot is no longer embedded in the fight editor');
  await page.locator('#dboGoToDrops').click();
  await page.waitForSelector('#dboDrops:not([hidden]) #dboBossPicker',{timeout:5000});
  assert((await page.locator('#dboBossPicker option').count())>=19,'Central boss dropdown includes built-in game bosses and a new custom boss');
  const customBoss=await page.locator('#dboBossPicker').inputValue();
  assert(customBoss.startsWith('local:'),'Opened current custom encounter in central loot editor');
  await page.locator('[data-db-add-drop]').click();
  assert.equal(await page.locator('[data-db-drop-row]').count(),1,'A boss can have its own drop table');
  assert(await page.locator('[data-db-drop="0.key"] option').count()>0,'Boss gear picker uses approved catalogue items');
  await page.locator('[data-db-drop="0.kind"]').selectOption('material');
  await page.locator('[data-db-drop="0.key"]').selectOption('hollowroot');
  await page.locator('[data-db-drop="0.chance"]').fill('42');
  await page.locator('[data-db-drop="0.quantity"]').fill('3');
  await page.locator('[data-dbo-tool="build"]').click();
  await page.locator('[data-db-step="0"]').click();
  await page.locator('[data-dbo-tool="drops"]').click();
  await page.locator('#dboBossPicker').selectOption(customBoss);
  assert.equal(await page.locator('[data-db-drop="0.kind"]').inputValue(),'material','Boss drop type survives stage switching');
  assert.equal(await page.locator('[data-db-drop="0.key"]').inputValue(),'hollowroot','Specific reagent selection survives');
  assert.equal(await page.locator('[data-db-drop="0.chance"]').inputValue(),'42','Loot chance survives stage switching');
  assert.equal(await page.locator('[data-db-drop="0.quantity"]').inputValue(),'3','Boss drop quantity survives stage switching');
  await page.locator('#dboBossPicker').selectOption('native:ashen-vault:ashwarden');
  assert(await page.locator('#dboDrops').innerText().then(t=>t.includes('Ash Warden Kael')&&t.includes('additional boss drops')),'Existing dungeon boss is available, with clear default-drop policy');
  await page.locator('[data-db-add-drop]').click();
  assert.equal(await page.locator('[data-db-drop-row]').count(),1,'Existing boss supports optional owner drop rows');
  await page.locator('[data-db-remove-drop]').click();
  assert.equal(await page.locator('[data-db-drop-row]').count(),0,'Existing boss row can be removed');
  await page.locator('[data-dbo-tool="build"]').click();
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
  await page.evaluate(()=>{
    void CellboundDesignedContent.play('qa-preview',{
      content_type:'quest',title:'Design Booth QA',blueprint:{level:1,summary:'Room and puzzle regression',steps:[
        {id:'qa-room',type:'room',title:'Gatehouse',text:'The party enters the chamber.'},
        {id:'qa-minigame',type:'minigame',template:'choice',title:'Rune Door',prompt:'Pick the safe lever',choices:['Left','Right'],answer:1}
      ]}
    });
  });
  await page.waitForSelector('#designAdventureOverlay:not([hidden]) .dbo-player-panel');
  await page.locator('[data-db-advance]').click();
  await page.waitForSelector('#designAdventureOverlay:not([hidden]) [data-db-pick="1"]');
  await page.locator('[data-db-pick="1"]').click();
  await page.locator('[data-db-done]').click();
  await page.waitForFunction(()=>document.querySelector('#designAdventureOverlay .dbo-player-panel')?.textContent?.includes('Adventure complete'),{},{timeout:5000});
  await page.locator('[data-db-finish]').click();
  assert.equal(await page.locator('#designAdventureOverlay').isVisible(),false,'Designed room/minigame run exits cleanly');
  assert.deepEqual(errors,[],'No browser exceptions in owner creative suite');
  console.log(engine===webkit?'WebKit':'Chromium','Design Booth browser regression passed: one entry, seven tabs, centralized custom/native boss drop tables, minigames, room/comic/model editors and clean close.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
