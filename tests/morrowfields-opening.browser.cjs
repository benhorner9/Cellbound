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
  const errors=await mount(page,initial,false,{userId:PLAYER,episodeBridge:true,useBuiltGuild:true,transformGuild:html=>html.replace('window.CELLBOUND_SECURE_SAVES=false','window.CELLBOUND_SECURE_SAVES=true').replace('</head>','<script>window.CELLBOUND_SECURE_SAVES=true;window.CELLBOUND_EPISODE_BUILD="local-dev";window.CELLBOUND_EPISODE_SERVICE_URL="https://opening.test/opening";</script></head>')});
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
  await page.locator('#questJournalDetail [data-episode-quest-open]').click();
  await page.waitForSelector('#cellboundComicScene:not([hidden])');
  assert.equal(await page.locator('#cellboundComicScene .cbcomic-panel').count(),3,'The whole opening plays inside one shared comic sequence');
  await shot('opening');
  for(let panel=0;panel<3;panel++)await page.locator('#cellboundComicScene [data-comic-continue]').click();
  await page.waitForSelector('#morrowfields[open] [data-mf="briefing"]');
  await shot('briefing');
  await click('#morrowfields [data-mf="briefing"]');
  // Older saves can still contain a 'map' location. Resuming must show a
  // normal Continue Quest action instead of opening the old regional map.
  assert.equal(await page.locator('#morrowfields [data-mf="to-fenstead"]').count(),1,
   'Finishing the briefing presents the next story action, not a map');
  assert.equal(await page.locator('#morrowfields .mf-map, #morrowfields .mf-hotspots, #morrowfields [data-mf="map"], #morrowfields [data-mf="location"]').count(),0,
   'The linear quest never mounts interactive navigation maps');
  await shot('farm-arrival');
  await click('#morrowfields [data-mf="to-fenstead"]');
  await shot('farm');
  assert.equal(await page.locator('#morrowfields .mf-dialogue').count(),1,'Mara appears in one story dialogue');
  await click('#morrowfields [data-mf="meet-mara"]');
  assert.equal(await page.locator('#morrowfields [data-mf="go-wagon"]').count(),1,'One next-objective action replaces map travel');
  await click('#morrowfields [data-mf="go-wagon"]');
  await page.waitForSelector('#morrowfields [data-clue="tracks"]');
  assert.equal((await store.load(PLAYER)).account.state.episode2.quests.e2_q01.objectives.length,3,
   'Linear quest continues to use exact server-authorised progression');
  assert.equal(await page.locator('#morrowfields .mf-illustration').count(),1,
   'Wagon artwork is a noninteractive illustration');
  assert.equal(await page.locator('#world [data-morrowfields-entry]').count(),0,
   'There is no separate open-world entry in the World panel');
  for(const clue of ['tracks','container'])await click('#morrowfields [data-clue="'+clue+'"]');
  await shot('investigation');
  // Reload the actual shell mid-investigation. State comes back from PostgreSQL.
  await page.reload();await page.waitForFunction(()=>CellboundGame?.ready);await page.evaluate(()=>CellboundGame.switchView('quests'));
  await click('#questJournalList [data-adventure="e2_q01"]');
  await click('#questJournalDetail [data-episode-quest-open]');
  await page.waitForSelector('#morrowfields [data-clue="soil"]');
  assert.equal(await page.locator('#morrowfields .mf-progress').count(),1,'Resume uses the same stage progress strip');
  assert.equal(await page.locator('#morrowfields [data-mf="map"], #morrowfields .mf-hotspots').count(),0,'Legacy map state never returns after reloading');
  assert((await page.locator('#morrowfields .mf-evidence > div:first-child > strong').textContent()).includes('2 / 4'),'Evidence UI restores two previously recorded clues');
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
  await click('#morrowfields [data-mf="recover"]');
  await page.waitForSelector('#morrowfields [data-mf="closing"]');
  await shot('tessa');
  await page.locator('#morrowfields [data-mf="closing"]').click();
  await page.waitForSelector('#cellboundComicScene:not([hidden])');
  assert.equal(await page.locator('#cellboundComicScene .cbcomic-panel').count(),3,'Conclusion comics play as one story');
  await shot('closing');
  for(let panel=0;panel<3;panel++)await page.locator('#cellboundComicScene [data-comic-continue]').click();
  await page.waitForSelector('#morrowfields[open] [data-mf="quest-journal"]');
  await shot('rewards');
  const final=(await store.load(PLAYER)).account.state;
  assert.equal(final.gold,5180);assert(final.roster.every(c=>c.level===16&&c.xp===0));
  assert.deepEqual(final.episode2.unlocked,['e2_q01','e2_q02','e2_q03']);
  assert.equal(await page.locator('#questJournalList [data-adventure="e2_q02"]').count(),1,'First investigation appears in the normal journal');
  assert.equal(await page.locator('#questJournalList [data-adventure="e2_q03"]').count(),1,'Second investigation appears in the normal journal');
  assert.equal(await page.locator('#quests [data-morrowfields-entry]').count(),0,'No duplicate chapter launcher above the journal');
  assert.equal(await page.locator('.mf-branches button').count(),0,'Unbuilt branches have no start actions');
  assert.equal(await page.locator('#morrowfields [data-mf="quest-journal"]').count(),1,'Quest conclusion returns to the original journal');
  assert.equal(await page.locator('#morrowfields [data-mf="explore"], #morrowfields [data-mf="map"]').count(),0,'Quest ending has no free-roam links');
  assert(await page.evaluate(()=>{const d=document.querySelector('#morrowfields');return d.scrollWidth<=d.clientWidth+2&&document.documentElement.scrollWidth<=innerWidth+2}));
  assert.deepEqual(errors,[]);
  results.push({viewport,objectives:final.episode2.quests.e2_q01.objectives,enemyFrames:observed.frames,gold:final.gold,roster:final.roster.map(c=>({id:c.id,level:c.level,xp:c.xp}))});
  await page.close();await db.close();
 }}finally{await browser.close()}
 fs.writeFileSync('docs/qa/morrowfields/browser-results.json',JSON.stringify({engine:process.env.CELLBOUND_TEST_ENGINE||'chromium',auth:'mocked shell; explicit trusted finale fixture; real local PostgreSQL and canonical worker',results},null,2)+'\n');
 console.log('After the Breach linear quest PASS: continuous comics, one-click stage transitions, no maps or free roam, illustrated dialogue, clue choices, reload, canonical combat, rewards, two branches and three viewports. Mocked auth, real local PostgreSQL; no physical iPad claim.');
})().catch(e=>{console.error(e);process.exitCode=1});
