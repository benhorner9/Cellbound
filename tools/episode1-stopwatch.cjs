'use strict';
/* Genuine fresh-save Chrome stopwatch. Never seeds levels, gear, XP or unlocks.
 * This is an automated UI journey, not a claim of natural human reading pace.
 * Reports where the first continuous playthrough stops.
 */
const {chromium}=require('playwright'),{mount}=require('../tests/full-playthrough.browser.cjs');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const started=Date.now(),results=[],errors=[],page=await browser.newPage({viewport:{width:1024,height:768}});
 let lastStage='begin',last=started,actions=0,reason='';
 const step=(name)=>{const now=Date.now();if(name!==lastStage){results.push({stage:lastStage,elapsedSeconds:Math.round((now-last)/1000)});lastStage=name;last=now;console.log('STOPWATCH_STAGE',name,Math.round((now-started)/1000)+'s');}};
 const click=async(sel)=>{const node=page.locator(sel).first();if(await node.count()&&await node.isVisible()&&await node.isEnabled()){await node.click({timeout:7500});actions++;return true}return false};
 try{
  const browserErrors=await mount(page,null,false,{useBuiltGuild:true});
  step('guild-introduction');
  await page.locator('#startGuildCharter').click();actions++;
  const created=await page.evaluate(()=>({state:CellboundGame.getState().onboarding?.stage,roster:CellboundGame.getState().roster?.length||0}));
  if(created.state!=='party-builder')throw Error('Character creator did not open: '+JSON.stringify(created));
  step('party-builder');
  await click('[data-forge-step="confirm"]');
  if(!await click('[data-forge-confirm]'))throw Error('Fresh character creation cannot confirm');
  await page.waitForFunction(()=>CellboundGame.getState().roster.length===5,{},{timeout:13000});
  step('zeltira-arrival');
  let previous='',stall=0,combatMs=0;
  while(Date.now()-started<13*60*1000){
   const info=await page.evaluate(()=>({stage:CellboundGame.getState().onboarding?.stage,complete:CellboundGame.getState().onboarding?.complete,
      current:CellboundGame.getState().onboarding?.tutorialEncounterIndex||0,
      reports:CellboundGame.getState().onboarding?.tutorialCombatReports||{},
      level:CellboundGame.getState().roster.map(c=>c.level),
      xp:CellboundGame.getState().roster.map(c=>c.xp)}));
   if(info.complete){step('tutorial-complete');break;}
   if(info.stage!==previous){previous=info.stage;stall=0;step(info.stage)}
   let did=false;
   const comic=page.locator('#cellboundComicScene:not([hidden])');
   if(await comic.count()&&await comic.isVisible()){
    const choice=page.locator('#cellboundComicScene [data-comic-choice]:not([disabled])').first();
    if(await choice.count()&&await choice.isVisible()){await choice.click();did=true}
    else did=await click('#cellboundComicScene [data-comic-continue]');
   }else{
    switch(info.stage){
     case 'zeltira-arrival':did=await click('#answerResonance');break;
     case 'first-expedition':
      if(await click('[data-resonance-clue]:not(.seen)'))did=true;
      if(await page.locator('[data-resonance-answer="correct"]').count()){did=await click('[data-resonance-answer="correct"]')||did}break;
     case 'gear':did=await click('[data-training-gear="good"]');break;
     case 'dungeon-briefing':did=await click('#enterTutorialDungeon');break;
     case 'dungeon-running':
      if(await click('#tutorialCombatContinue')){did=true;break}
      if(await click('#tutorialCombatRetry')){did=true;break}
      if(await page.locator('#launchTutorialReborn').count()){
       if(!await page.locator('#launchTutorialReborn').isEnabled()){
        did=await click('[data-tutorial-command]');break
       }
       const t=Date.now();
       if(await click('#launchTutorialReborn')){
        try{await page.waitForFunction(()=>Boolean(document.querySelector('#tutorialCombatContinue, #tutorialCombatRetry')),{},{timeout:160000});}
        catch(e){throw Error('First Expedition combat not finishing: '+e.message)}
        combatMs+=Date.now()-t;did=true;
       }
      }
      break;
     case 'loot-review':did=await click('[data-tutorial-loot-char]');break;
     case 'recovery-lesson':
      if(await click('#runShockSimulation')){did=true;break}
      did=await click('#clearShockSimulation');break;
     case 'profession-choice':
      if(await page.locator('#confirmProfession').isEnabled())did=await click('#confirmProfession');
      else {
       await click('[data-prof-char]');
       did=await click('[data-prof="Alchemy"]');
      }break;
     case 'craft':did=await click('#craftTutorialItem');break;
     case 'profession-use':did=await click('#useTutorialCraft')||await click('#recoverTutorialCraft');break;
     case 'quest-lesson':did=await click('#acceptFirstContract');break;
     case 'departure':did=await click('#beginAdventure');break;
    }
   }
   if(did)stall=0;else if(++stall>65){reason='No player action available in '+info.stage;break;}
   await page.waitForTimeout(did?140:260);
  }
  // After the complete, real fresh-account tutorial, continue the actual
  // Episode I opening quest. Never seed quest completion or experience.
  if(await page.evaluate(()=>CellboundGame.getState().onboarding?.complete)){
   step('ashes-on-the-east-road');
   const questStart=Date.now();let quiet=0,selected=false;
   while(Date.now()-questStart<5*60*1000){
    const current=await page.evaluate(()=>{const s=CellboundGame.getState();return {stage:s.questSystem?.ashfall?.stage,complete:s.questSystem?.ashfall?.complete,level:s.roster[0]?.level||1,xp:s.roster[0]?.xp||0}});
    if(current.complete){step('ashes-complete');console.log('ASHES_DONE',Math.round((Date.now()-questStart)/1000)+'s',JSON.stringify(current));break;}
    let progressed=false;
    const comic=page.locator('#cellboundComicScene:not([hidden])');
    if(await comic.count()&&await comic.isVisible()){
      if(await page.locator('#cellboundComicScene [data-comic-continue]').isEnabled())progressed=await click('#cellboundComicScene [data-comic-continue]');
    }else if(await page.locator('#questGearReward:not([hidden]) [data-qgr-claim]').count()){
     progressed=await click('#questGearReward [data-qgr-claim]');
    }else if(await page.locator('#questPuzzle:not([hidden]) [data-deduction]').count()){
     const index=await page.locator('.quest-deduction small').first().innerText().catch(()=>'DEDUCTION 1 / 3');
     const which=Math.max(0,(Number((index.match(/(\d+)\s*\//)||[])[1])||1)-1);
     const answer=[1,2,0][which]||0;
     progressed=await click('#questPuzzle:not([hidden]) [data-deduction="'+answer+'"]');
    }else if(await page.locator('[data-q-continue]').count()&&await page.locator('[data-q-continue]').first().isVisible()){
     progressed=await click('[data-q-continue]');
    }else{
     if(!selected){await page.evaluate(()=>{CellboundGame.switchView('quests');CellboundQuests.selectAdventure('ashfall')});selected=true;progressed=true;}
     else{
       const actionSelector={
        warning:'[data-ashfall-start]',tracks:'[data-ashfall-tracks]',
        ambush:'[data-ashfall-ambush]',key:'[data-ashfall-finish]'
       }[current.stage];
       if(actionSelector){
        const btn=page.locator('#questJournalDetail '+actionSelector);
        if(await btn.count()&&await btn.isVisible())progressed=await click('#questJournalDetail '+actionSelector);
       }
     }
    }
    if(progressed)quiet=0;else if(++quiet>80){reason='Opening Episode I quest stalled at '+current.stage;break;}
    await page.waitForTimeout(progressed?180:220);
   }
   console.log('ASHES_TIMING',JSON.stringify({elapsedSeconds:Math.round((Date.now()-questStart)/1000),reason}));
  }
  const final=await page.evaluate(()=>{const s=CellboundGame.getState();return{onboarding:s.onboarding?.stage,onboardingComplete:s.onboarding?.complete,levels:s.roster.map(c=>c.level),xp:s.roster.map(c=>c.xp),ashenVaultUnlocked:s.progression?.ashenVaultUnlocked,quest:s.questSystem?.ashfall?.stage,roster:s.roster.length}});
  const report={startedAt:new Date(started).toISOString(),elapsedSeconds:Math.round((Date.now()-started)/1000),combatSeconds:Math.round(combatMs/1000),actions,chapters:results,final,reason,errors:[...browserErrors,...errors]};
  console.log('CELLBOUND_TIMED_FRESH_PLAYTHROUGH',JSON.stringify(report));
  fs.mkdirSync('docs/qa/episode-one-timing',{recursive:true});
  fs.writeFileSync('docs/qa/episode-one-timing/stopwatch.json',JSON.stringify(report,null,2));
  await page.screenshot({path:'docs/qa/episode-one-timing/final.png',fullPage:false});
  if(!final.onboardingComplete)process.exitCode=1;
 }catch(error){console.error('PLAYTHROUGH_STOPPED',error?.stack||String(error));process.exitCode=1}
 finally{step('end');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});