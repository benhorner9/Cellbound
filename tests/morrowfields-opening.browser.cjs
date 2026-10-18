'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {mount}=require('./full-playthrough.browser.cjs');
const {createStore,seed,PLAYER}=require('../tools/morrowfields-test-store.cjs');
const {createOpeningAuthority}=require('../server/episodes/opening-authority.cjs');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});const results=[];
 fs.mkdirSync('docs/qa/morrowfields',{recursive:true});
 try{for(const viewport of [{width:1366,height:1024},{width:390,height:844},{width:1440,height:900}]){
  const initial=seed();initial.questSystem.nullComplex.authoritative=true;
  const fixture=await createStore(initial),{db,store,proof}=fixture;await proof(PLAYER);
  const authority=createOpeningAuthority({store});
  const page=await browser.newPage({viewport});
  await page.exposeFunction('episodeDatabaseRpc',async(action,payload)=>{
   try{
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[PLAYER]);
    return{data:(await db.query('select public.cellbound_episodes($1,$2::jsonb) result',[action,JSON.stringify(payload||{})])).rows[0].result,error:null};
   }catch(e){return{data:null,error:{message:e.message}}}
  });
  await page.route('https://opening.test/opening',async route=>{
   if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'https://cellbound.test','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'POST,OPTIONS'}});return;}
   try{const r=await authority.act(PLAYER,route.request().postDataJSON());await route.fulfill({headers:{'access-control-allow-origin':'https://cellbound.test'},json:r});}
   catch(e){await route.fulfill({status:409,headers:{'access-control-allow-origin':'https://cellbound.test'},json:{error:e.message}});}
  });
  const errors=await mount(page,initial,false,{userId:PLAYER,episodeBridge:true,useBuiltGuild:true,transformGuild:html=>html.replace('window.CELLBOUND_SECURE_SAVES=false','window.CELLBOUND_SECURE_SAVES=true').replace('</head>','<script>window.CELLBOUND_SECURE_SAVES=true;window.CELLBOUND_EPISODE_SERVICE_URL="https://opening.test/opening";</script></head>')});
  const click=async selector=>{await page.locator(selector).click();await page.waitForFunction(()=>!document.getElementById('morrowfields').hasAttribute('aria-busy'));};
  const shot=async name=>{
   await page.evaluate(async()=>{
    const scene=document.querySelector('#morrowfields[open]');
    if(scene){
     await Promise.all(Array.from(scene.querySelectorAll('img')).map(img=>img.decode().catch(()=>{})));
     await Promise.all(scene.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));
    }
   });
   return page.screenshot({path:`docs/qa/morrowfields/${viewport.width}-${name}.png`,fullPage:false});
  };
  await page.evaluate(()=>CellboundGame.switchView('quests'));
  await page.evaluate(()=>{window.CELLBOUND_SECURE_SAVES=false;CellboundMorrowfields.refresh();CellboundQuests.render()});
  assert.equal(await page.locator('#questJournalList [data-adventure="e2_q01"]').count(),0,'Unreleased Episode II must not appear without the episode service');
  await page.evaluate(()=>{window.CELLBOUND_SECURE_SAVES=true;CellboundMorrowfields.refresh();CellboundQuests.render()});
  await click('#questJournalList [data-adventure="e2_q01"]');
  await click('#questJournalDetail [data-episode-quest-open]');
  await page.waitForSelector('#morrowfields [data-mf="intro-panel"]',{timeout:8000}).catch(async error=>{
    console.error('EPISODE JOURNAL START DIAGNOSTICS',await page.evaluate(()=>({
      dialog:document.querySelector('#morrowfields')?.innerText?.slice(0,2000),
      dialogOpen:document.querySelector('#morrowfields')?.open,
      rootBusy:document.querySelector('#morrowfields')?.getAttribute('aria-busy'),
      journalDetail:document.querySelector('#questJournalDetail')?.innerText?.slice(0,1400),
      state:CellboundGame?.getState?.()?.episode2?.quests?.e2_q01||null,
      finaleVerified:CellboundGame?.getState?.()?.questSystem?.nullComplex?.authoritative||false
    })));throw error;
  });
  await shot('opening');
  for(let panel=0;panel<3;panel++){
   await page.locator('#morrowfields [data-mf="intro-panel"]').click();
   await page.locator('#cellboundComicScene [data-comic-continue]').click();
   await page.waitForFunction(()=>!document.getElementById('morrowfields').hasAttribute('aria-busy'));
  }
  await click('#morrowfields [data-mf="briefing"]');await shot('map');
  assert.equal(await page.locator('#morrowfields [data-mf="location"]').count(),8);
  await click('#morrowfields [data-location="heart"]');assert((await page.locator('.mf-notice').textContent()).includes('not open'));
  await click('#morrowfields [data-mf="dismiss"]');
  await click('#morrowfields [data-location="fenstead"]');await shot('farm');
  await click('#morrowfields [data-mf="meet-mara"]');
  await click('#morrowfields [data-location="east-fields"]');
  await click('#morrowfields [data-location="wagon"].mf-spot');
  for(const clue of ['tracks','container'])await click('#morrowfields [data-clue="'+clue+'"]');
  // Reload the actual shell mid-investigation. State comes back from PostgreSQL.
  await page.reload();await page.waitForFunction(()=>CellboundGame?.ready);await page.evaluate(()=>CellboundGame.switchView('quests'));
  await click('#questJournalList [data-adventure="e2_q01"]');
  await click('#questJournalDetail [data-episode-quest-open]');
  await page.waitForSelector('#morrowfields [data-clue="soil"]');
  assert((await page.locator('.mf-clue small').textContent()).includes('2 / 4'));
  for(const clue of ['soil','device'])await click('#morrowfields [data-clue="'+clue+'"]');
  await shot('wagon');
  // Observe real rendered animation frames, commands and pet placement.
  await page.evaluate(()=>{
   window.__mfFrames={};window.__mfCombatEvents=[];
   window.addEventListener('cellbound:combat-event',e=>{if(e.detail.zone==='morrowfields')window.__mfCombatEvents.push(e.detail.event)});
   window.__mfObserver=new MutationObserver(()=>{document.querySelectorAll('[data-monster-id] [data-sprite-frame]').forEach(n=>{const id=n.closest('[data-monster-id]').dataset.monsterId;const set=window.__mfFrames[id]||(window.__mfFrames[id]=[]);if(!set.includes(n.dataset.spriteFrame))set.push(n.dataset.spriteFrame)})});
   window.__mfObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-sprite-frame']});
  });
  await page.locator('#morrowfields [data-mf="fight"]').click();
  await page.waitForSelector('#cb2dArena');await page.waitForFunction(()=>CellboundDungeon2D.currentRun()?.combatActive,{},{timeout:15000});
  await page.waitForFunction(()=>document.querySelectorAll('.cb-monster-sprite').length===3);
  await shot('combat');
  assert.equal(await page.locator('#cb2dArena').count(),1);
  const command=page.locator('[data-combat-command="focus"]');if(await command.isEnabled())await command.click();
  await page.waitForSelector('#morrowfields[open] [data-mf="recover"]',{timeout:150000}).catch(async e=>{await shot('failure');console.log('PLAYTHROUGH BLOCK',await page.locator('body').innerText(),errors,(await store.load(PLAYER)).attempt?.status);throw e});
  const observed=await page.evaluate(()=>({frames:__mfFrames,events:__mfCombatEvents.map(e=>e.type)}));
  assert.equal(Object.keys(observed.frames).length,3);
  assert(Object.values(observed.frames).every(f=>f.length>=2),'Every enemy animates through authored frames');
  assert(observed.events.includes('DAMAGE_DEALT'));assert(observed.events.includes('HEAL_RECEIVED'));
  await click('#morrowfields [data-mf="recover"]');await click('#morrowfields [data-mf="closing"]');await shot('closing');
  for(let panel=0;panel<3;panel++){
   await page.locator('#morrowfields [data-mf="outro-panel"]').click();
   await page.locator('#cellboundComicScene [data-comic-continue]').click();
   await page.waitForFunction(()=>!document.getElementById('morrowfields').hasAttribute('aria-busy'));
  }
  await shot('rewards');
  const final=(await store.load(PLAYER)).account.state;
  assert.equal(final.gold,5180);assert(final.roster.every(c=>c.level===16&&c.xp===0));
  assert.deepEqual(final.episode2.unlocked,['e2_q01','e2_q02','e2_q03']);
  assert.equal(await page.locator('#questJournalList [data-adventure="e2_q02"]').count(),1,'First investigation appears in the normal journal');
  assert.equal(await page.locator('#questJournalList [data-adventure="e2_q03"]').count(),1,'Second investigation appears in the normal journal');
  assert.equal(await page.locator('#quests [data-morrowfields-entry]').count(),0,'No duplicate chapter launcher above the journal');
  assert.equal(await page.locator('.mf-branches button').count(),0,'Unbuilt branches have no start actions');
  assert(await page.evaluate(()=>{const d=document.querySelector('#morrowfields');return d.scrollWidth<=d.clientWidth+2&&document.documentElement.scrollWidth<=innerWidth+2}));
  assert.deepEqual(errors,[]);
  results.push({viewport,objectives:final.episode2.quests.e2_q01.objectives,enemyFrames:observed.frames,gold:final.gold,roster:final.roster.map(c=>({id:c.id,level:c.level,xp:c.xp}))});
  await page.close();await db.close();
 }}finally{await browser.close()}
 fs.writeFileSync('docs/qa/morrowfields/browser-results.json',JSON.stringify({engine:process.env.CELLBOUND_TEST_ENGINE||'chromium',auth:'mocked shell; explicit trusted finale fixture; real local PostgreSQL and canonical worker',results},null,2)+'\n');
 console.log('Morrowfields actual UI playthrough PASS: three viewports, six objectives, investigation reload, shared live combat, rendered enemy frames, server replay, rewards and both branch records. Local auth/finale fixtures; no live hosting or physical iPad claim.');
})().catch(e=>{console.error(e);process.exitCode=1});
