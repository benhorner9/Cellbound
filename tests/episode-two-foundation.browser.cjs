'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;
(async()=>{
  const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
  try{
    for(const viewport of [{width:1024,height:1366},{width:390,height:844},{width:1440,height:900}]){
      const page=await browser.newPage({viewport});
      const seed=matureState();seed.questSystem={nullComplex:{started:true,complete:true,stage:'complete',done:['escape']}};
      const errors=await mount(page,seed);
      const initial=await page.evaluate(()=>JSON.parse(JSON.stringify({
        cap:CellboundGame.getLevelCap(),episode:CellboundGame.getState().episode2,
        equipment:CellboundGame.getState().roster.map(c=>c.equipment)
      })));
      assert.equal(initial.cap,30);
      assert.deepEqual(initial.episode.unlocked,['e2_q01']);
      assert.equal(initial.episode.accountId,'playthrough-user');
      const state=await page.evaluate(async()=>{
        // Exercise actual XP award / save / rendering. Campaign completion itself
        // is not claimed here: no story or encounter is skipped into a clear flag.
        await CellboundGame.awardPartyXp(90750,{source:'Episode 2 foundation QA'});
        return JSON.parse(JSON.stringify(CellboundGame.getState()));
      });
      assert(state.roster.every(c=>c.level===30&&c.xp===0&&c.talent===12));
      assert.deepEqual(state.roster.map(c=>c.equipment),initial.equipment);
      assert.equal(state.episode2.complete,false,'XP alone never completes the campaign');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Existing shell fits '+viewport.width);
      assert.deepEqual(errors,[],'No foundation browser errors');
      await page.close();
      const returning=await browser.newPage({viewport});
      const returnErrors=await mount(returning,state);
      const loaded=await returning.evaluate(()=>JSON.parse(JSON.stringify(CellboundGame.getState())));
      assert(loaded.roster.every(c=>c.level===30&&c.talent===12),'Saved Level 30 roster survives normalization');
      assert.deepEqual(loaded.episode2,state.episode2,'Episode state survives mocked server read');
      assert.deepEqual(loaded.roster.map(c=>c.equipment),state.roster.map(c=>c.equipment));
      assert.deepEqual(returnErrors,[]);
      await returning.close();
    }
    console.log('Episode 2 foundation browser PASS: iPad-size, phone and desktop shell; real XP award and migration preserve Level 30, talent budget and Episode 1 equipment. Backend responses are mocked; no campaign, raid or live persistence sign-off.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
