'use strict';
// End-to-end recovery / profession / crafting / first quest acceptance on
// tablet-sized Chromium and WebKit. Mocks persistence, never changes accounts.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 const page=await browser.newPage({viewport:{width:1024,height:1366}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('dialog',dialog=>dialog.accept());
 try{
  const seed=matureState();
  seed.onboarding={
   version:3,complete:false,stage:'loot-review',zone:'zeltira',
   tutorialDungeonComplete:true,tutorialLootBankId:'lost-after-reload',
   comicSeen:{loot:true,shock:true,craft:true,contract:true,departure:true}
  };
  seed.materials={'faded-cell-fragment':4,'zeltiran-iron':2};
  seed.bank=[];seed.consumables=[];
  await mount(page,seed,true);
  // The missing gear drop is recoverable; it must not skip straight to quests.
  await page.waitForSelector('#runShockSimulation',{timeout:10000});
  assert.equal(await page.locator('#acceptFirstContract').count(),0);
  assert.equal(await page.evaluate(()=>CellboundGame.getState().onboarding.coreTrainingComplete||false),false);
  await page.locator('#runShockSimulation').click();
  await page.locator('#clearShockSimulation:not([hidden])').waitFor({timeout:7000});
  await page.locator('#clearShockSimulation').click();
  await page.locator('[data-prof-char]').first().waitFor({timeout:7000});
  await page.locator('[data-prof-char]').first().click();
  await page.locator('[data-prof="Alchemy"]').click();
  await page.locator('#confirmProfession').click();
  await page.locator('#craftTutorialItem').waitFor({timeout:7000});
  assert.equal(await page.locator('#craftTutorialItem').isEnabled(),true,'Dungeon reagents enable a level-1 craft');
  await page.locator('#craftTutorialItem').click();
  await page.locator('#useTutorialCraft').waitFor({timeout:7000});
  await page.locator('#useTutorialCraft').click();
  await page.locator('#acceptFirstContract').waitFor({timeout:7000});
  const before=await page.evaluate(()=>{
   const s=CellboundGame.getState();
   const c=s.roster.find(x=>x.id===s.onboarding.professionCharacterId);
   return{shock:s.onboarding.shockLessonComplete,craft:s.onboarding.professionComplete,used:s.onboarding.professionUseComplete,
    core:s.onboarding.coreTrainingComplete,profession:c?.professions?.[0]?.name,slotCount:c?.professions?.length,
    potion:s.consumables?.find(x=>x.key==='field-recovery-potion')?.quantity||0}
  });
  assert.equal(before.shock,true);
  assert.equal(before.craft,true);
  assert.equal(before.used,true);
  assert.equal(before.core,true);
  assert.equal(before.profession,'Alchemy');
  assert.equal(before.slotCount,1,'One profession slot per character');
  assert.equal(before.potion,1,'First combat potion remains packed for a real encounter');
  await page.locator('#acceptFirstContract').click();
  await page.locator('#beginAdventure').waitFor({timeout:7000});
  await page.locator('#beginAdventure').click();
  await page.waitForFunction(()=>CellboundGame.getState().onboarding.complete===true,{},{timeout:10000});
  assert.deepEqual(errors,[],'Onboarding journey emitted no page errors');
  console.log('Chapter 0 tablet browser acceptance passed: no loot skip, Cell Shock, profession, crafting, first use, contract and hand-off into quests.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
