'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900},hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent('<section id="professions" class="view active"><div id="professionWorkshop"><section class="craft-project timed-craft-project"><header><h3>Braced Armour Kit</h3></header><button id="qaForgeStrike" disabled>STRIKE</button></section></div></section>');
  await page.addStyleTag({content:fs.readFileSync(path.join(root,'ui-polish-block8.css'),'utf8')});
  await page.evaluate(()=>{
    window.demoState={workshopCraftProject:{charId:'hero1',recipeId:'kit',profession:'Blacksmithing',quantity:2,remainingMs:44000,totalMs:44000,startedAt:'qa-craft'},workshopCraftSummary:null,roster:[{id:'hero1',name:'Orik Stone'}]};
    window.CellboundGame={getState:()=>window.demoState};
    window.CellboundEconomy={renderProfessions:()=>{
      window.qaRenders=(window.qaRenders||0)+1;
      const work=document.querySelector('#professionWorkshop');
      work.innerHTML='<section class="craft-project timed-craft-project"><header><h3>Braced Armour Kit</h3></header><button id="qaForgeStrike">STRIKE</button></section>';
      work.querySelector('#qaForgeStrike').addEventListener('click',()=>{window.qaStrikes=(window.qaStrikes||0)+1});
    }};
    window.qaFocusCalls=0;window.qaBlurCalls=0;
    window.addEventListener('focus',()=>window.qaFocusCalls++);
    window.addEventListener('blur',()=>window.qaBlurCalls++);
    document.querySelector('#qaForgeStrike').addEventListener('click',()=>{window.qaStrikes=(window.qaStrikes||0)+1});
  });
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'ui-polish-block8.js'),'utf8')});
  await page.locator('#cbCraftModal:not([hidden])').waitFor();
  assert.equal(await page.locator('#cbCraftModal [role="dialog"]').count(),0,'dialog is the overlay, no nested dialog required');
  assert.equal(await page.locator('#cbCraftModal').getAttribute('aria-modal'),'true');
  assert.equal(await page.evaluate(()=>window.CellboundCraftOverlay.isReady()),false,'work does not start while player reads instructions');
  assert.equal(await page.locator('#professionWorkshop [data-craft-modal-reopen]').count(),1,'reopen stays in original Workshop');
  assert.equal(await page.locator('#cbCraftModal .timed-craft-project').count(),1,'one native project moves into overlay');
  await page.locator('#cbCraftModalBegin').click();
  assert.equal(await page.evaluate(()=>window.CellboundCraftOverlay.isReady()),true,'Begin enables focused crafting');
  assert((await page.evaluate(()=>window.qaFocusCalls))>=1,'begin delegates timing to the original focus handler');
  await page.locator('#cbCraftModal #qaForgeStrike:not([disabled])').waitFor();
  assert.equal(await page.evaluate(()=>window.qaRenders),1,'Begin re-renders native forge controls enabled');
  await page.locator('#qaForgeStrike').click();
  assert.equal(await page.evaluate(()=>window.qaStrikes),1,'native craft handlers survive DOM move');
  // Existing engine fully rewrites workshop after strike/reheat; the same
  // focused window must keep the newly bound live controls.
  await page.evaluate(()=>{
    const work=document.querySelector('#professionWorkshop');
    work.innerHTML='<section class="craft-project timed-craft-project"><header><h3>Braced Armour Kit</h3></header><button id="qaReheat">STOKE THE FURNACE</button></section>';
    work.querySelector('#qaReheat').addEventListener('click',()=>{window.qaReheats=(window.qaReheats||0)+1});
  });
  await page.locator('#cbCraftModal #qaReheat').waitFor();
  await page.locator('#qaReheat').click();
  assert.equal(await page.evaluate(()=>window.qaReheats),1);
  assert.equal(await page.evaluate(()=>window.CellboundCraftOverlay.isReady()),true,'stage re-render cannot reset running craft');
  await page.locator('[data-craft-modal-close]').click();
  assert.equal(await page.evaluate(()=>window.CellboundCraftOverlay.isReady()),false);
  assert.equal(await page.locator('#cbCraftModal').isHidden(),true);
  assert((await page.evaluate(()=>window.qaBlurCalls))>=1,'Pause and Close delegates pause to native engine');
  await page.locator('#professionWorkshop [data-craft-modal-reopen]').click();
  assert.equal(await page.evaluate(()=>window.CellboundCraftOverlay.isReady()),false,'reopening always waits for deliberate Resume');
  await page.locator('#cbCraftModalBegin').click();
  assert.equal(await page.evaluate(()=>window.CellboundCraftOverlay.isReady()),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#cbCraftModal').isHidden(),true,'Escape pauses and closes');
  await page.evaluate(()=>{
    window.demoState.workshopCraftProject=null;
    window.demoState.workshopCraftSummary={characterId:'hero1',characterName:'Orik Stone',recipeName:'Braced Armour Kit',profession:'Blacksmithing'};
    document.querySelector('#professionWorkshop').innerHTML=
      '<section data-forge-job-summary><h3 data-forge-summary-title tabindex="-1">JOB COMPLETE</h3><button data-forge-summary-close>RETURN</button></section>';
  });
  await page.locator('#cbCraftModal:not([hidden]) [data-forge-job-summary]').waitFor();
  assert.equal(await page.locator('#cbCraftModalPrep').isHidden(),true,'completed work result is not blocked by setup overlay');
  assert.equal(await page.evaluate(()=>window.CellboundCraftOverlay.isReady()),false,'completed forge no longer runs timer');
  await page.locator('[data-forge-summary-close]').click();
  await page.evaluate(()=>{
    window.demoState.workshopCraftSummary=null;
    document.querySelector('#professionWorkshop').innerHTML='<p>Ready to craft another order.</p>';
  });
  await page.waitForFunction(()=>document.querySelector('#cbCraftModal')?.hidden===true);
  assert.deepEqual(errors,[],'Block 8 work window emitted no browser errors');
  console.log('Block 8 craft overlay browser acceptance: start gating, live controls, reheat re-render, pause, resume, Escape, final result, tablet viewport.');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
