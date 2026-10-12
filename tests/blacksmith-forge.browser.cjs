const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 try{
 const page=await browser.newPage({viewport:{width:1024,height:768}}),errors=[];
 page.on('pageerror',e=>{errors.push(String(e));console.error(String(e))});
 await page.setContent('<div id="professions" class="view active"><div id="professionCharacterList"></div><h2 id="workshopTitle"></h2><div id="professionRecipeFilters"><button data-prof-recipe-filter="all">All</button></div><div id="professionWorkshop"></div><div id="reagentGrid"></div></div>');
 await page.addStyleTag({content:fs.readFileSync(path.join(root,'dist','economy-v2.css'),'utf8')});
 await page.evaluate(()=>{
  window.mockState={roster:[{id:'hero1',name:'Smith',class:'Warrior',spec:'Protection',professions:[{name:'Blacksmithing',level:10,xp:0,craftHistory:{},masterworks:0,projectsCompleted:0}],equipment:{}}],materials:{'zeltiran-iron':5},consumables:[],recipeScrolls:[],discoveredRecipes:[],tradeInbox:[],activity:[]};
  window.mockSaveCount=0;window.mockPersistCount=0;window.mockEntitlements={isAdmin:false,adminRole:null};
  window.CellboundGear={};window.CellboundPortraits={portraitHTML:()=>'<b>Smith</b>',paperDollHTML:(c)=>'<span class="cb-paper-doll cb-paper-doll--creator" role="img" aria-label="'+c.name+' working at the forge"><svg viewBox="0 0 80 120"><path d="M8 118 L39 5 L72 118" /></svg></span>'};
  window.CellboundProfessions={MATERIALS:{'zeltiran-iron':{name:'Zeltiran Iron',source:'Dungeon',rarity:'Common'}},PROFESSIONS:{Blacksmithing:{icon:'⚒',summary:'Make armour and steel.',recipes:[{id:'test-whetstone',name:'Test Whetstone',level:1,inputs:{'zeltiran-iron':2},xp:18,output:{category:'consumable',name:'Test Whetstone',key:'test-whetstone',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon'}}}]}},skillThreshold:()=>100000};
  window.CellboundGame={ready:true,getState:()=>window.mockState,getEntitlements:()=>({professionSlots:1,...window.mockEntitlements}),getSupabase:()=>({rpc:async()=>({data:null,error:null})}),getUser:()=>({id:'test'}),isCharacterRosterUnlocked:()=>true,save:()=>{window.mockSaveCount++},persistState:async()=>{window.mockPersistCount++},renderAll:()=>{},addMaterial:(key,qty)=>{window.mockState.materials[key]=(window.mockState.materials[key]||0)+qty}};
 });
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist','blacksmith-forge-v1.js'),'utf8')});
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist','economy-v2.js'),'utf8')});
 await page.waitForSelector('[data-craft="test-whetstone"]');
 await page.click('[data-craft="test-whetstone"]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="0"]');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),3,'inputs reserved on start');
 assert.equal(await page.locator('.forge-phase').count(),3);
 assert.equal(await page.locator('[data-forge-heat]').innerText(),'100%','new work begins at full heat');
 assert.equal(await page.locator('.forge-artisan-tool').count(),1,'working character has animated smithing tool');
 assert.equal(await page.locator('[data-forge-artisan-id="hero1"] .cb-paper-doll').count(),1,'the actual selected adventurer uses the full-body paper-doll renderer');
 assert((await page.locator('.forge-artisan-identity').innerText()).includes('Smith')&&(await page.locator('.forge-artisan-identity').innerText()).includes('BLACKSMITH 10'),'real adventurer and profession skill identify the visible forge worker');
 assert.equal(await page.evaluate(()=>window.mockState.consumables.length),0,'no item before mini-game');
 await page.click('[data-forge-toggle]');
 await page.waitForSelector('.forge-workshop.manual');
 await page.click('[data-forge-strike]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="1"]');
 assert.equal(await page.locator('.forge-scene.forge-action-heat.is-reacting [data-does-not-exist]').count(),0);
 assert.equal(await page.locator('.forge-scene.forge-action-heat.is-reacting').count(),1,'heating animates the furnace on the selected character stage');
 assert.equal(await page.locator('.forge-action-popup[role="status"]').count(),1,'forge feedback is announced accessibly');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject.forge.results.length),1,'stage saved');
 assert.equal(await page.evaluate(()=>window.mockPersistCount>=2),true,'progress persistence requested');
 await page.click('[data-craft-abandon]');
 await page.waitForSelector('[data-craft="test-whetstone"]');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),5,'cancel refunds materials');
 assert.equal(await page.evaluate(()=>window.mockState.consumables.length),0,'cancel grants no item');
 await page.click('[data-craft="test-whetstone"]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="0"]');
 for(let step=0;step<3;step++){await page.click('[data-forge-strike]');await page.waitForSelector('.forge-workshop[data-forge-stage="'+(step+1)+'"]');assert.equal(await page.locator('.forge-scene.forge-action-'+['heat','strike','temper'][step]+'.is-reacting').count(),1,'stage-specific effects run for '+step)}
 assert.equal(await page.locator('.forge-complete').count(),1,'three forge actions finish workpiece');
 assert.equal(await page.evaluate(()=>window.mockState.consumables.length),0,'quality alone cannot skip timer');
 // Force two focused-time ticks even when the first focus just initialises
 // the timer baseline; don't rely on runner event-loop scheduling.
 await page.evaluate(()=>{
  const realNow=Date.now.bind(Date);
  window.__forgeQATime=30000;
  Date.now=()=>realNow()+window.__forgeQATime;
  window.dispatchEvent(new Event('focus'));
  window.__forgeQATime=60000;
  window.dispatchEvent(new Event('focus'));
 });
 await page.waitForFunction(()=>window.mockState.consumables.length===1,null,{timeout:10000});
 assert.equal(await page.evaluate(()=>window.mockState.consumables[0].quantity),1,'one work order delivers one item');
 assert.equal(await page.evaluate(()=>window.mockState.roster[0].professions[0].projectsCompleted),1,'one completed project');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject),null,'project cleared after claim');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),4,'masterwork consumes two inputs and reclaims exactly one, per existing rules');
 await page.waitForSelector('[data-forge-job-summary]');
 assert((await page.locator('.forge-summary-reward').innerText()).includes('Test Whetstone'),'result screen shows crafted item');
 assert((await page.locator('.forge-summary-stats').innerText()).includes('PROFESSION XP'),'result screen shows XP awarded');
 assert.equal(await page.locator('.forge-summary-stage').count(),3,'result screen shows all three quality actions');
 assert.equal(await page.locator('.forge-summary-empty').count(),1,'quick job explains no reheats were required');
 await page.click('[data-forge-summary-close]');
 await page.waitForSelector('[data-craft="test-whetstone"]');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftSummary),null,'dismiss clears saved summary');

 // Forging a batch of five uses the SAME skill challenge, but takes 5x time.
 await page.evaluate(()=>{window.mockState.materials['zeltiran-iron']=20});
 const input=page.locator('[data-craft-qty="test-whetstone"]');
 await input.fill('6');
 await input.press('Tab');
 await page.waitForFunction(()=>document.querySelector('[data-craft-qty="test-whetstone"]')?.value==='5');
 assert.equal(await page.locator('[data-craft-qty="test-whetstone"]').getAttribute('max'),'5','blacksmith batch cap enforced in input');
 await input.fill('5');
 await input.press('Tab');
 await page.waitForFunction(()=>document.querySelector('[data-craft-qty="test-whetstone"]')?.value==='5');
 await page.click('[data-craft="test-whetstone"]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="0"]');
 assert.deepEqual(await page.evaluate(()=>({qty:window.mockState.workshopCraftProject.quantity,total:window.mockState.workshopCraftProject.totalMs,stock:window.mockState.materials['zeltiran-iron']})),{qty:5,total:110000,stock:10},'five-item work order reserves five recipe inputs and takes exactly five times longer');
 await page.click('[data-craft-abandon]');
 await page.waitForSelector('[data-craft="test-whetstone"]');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),20,'cancelling the five-item batch refunds every reserved input');
 await page.click('[data-craft="test-whetstone"]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="0"]');
 for(let step=0;step<3;step++){await page.click('[data-forge-strike]');await page.waitForSelector('.forge-workshop[data-forge-stage="'+(step+1)+'"]')}
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject.totalMs),110000,'large batches cannot short-circuit the timer');
 assert.equal(await page.locator('[data-forge-artisan-id="hero1"] .cb-paper-doll').count(),1,'full-body character remains visible through all three batch actions');
 assert.equal(await page.evaluate(()=>window.mockState.consumables[0].quantity),1,'three successful stages alone do not grant five items');
 // Cooling must stop progress and bring back the timed heat challenge.
 const qualityBefore=await page.evaluate(()=>window.mockState.workshopCraftProject.forge.results.map(x=>x.points).join(','));
 await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+45000;window.dispatchEvent(new Event('focus'))});
 await page.waitForSelector('.forge-workshop[data-forge-reheat="true"]');
 const remainingCold=await page.evaluate(()=>window.mockState.workshopCraftProject.remainingMs);
 assert(remainingCold>69000&&remainingCold<73000,'remaining work stops when heat reaches 25%');
 assert.equal(await page.locator('[data-forge-heat]').innerText(),'25%');
 assert.equal(await page.locator('[data-forge-strike]').innerText().then(x=>x.includes('STOKE THE FURNACE')),true);
 assert.equal(await page.evaluate(()=>window.mockState.consumables[0]?.quantity),1,'cold forge cannot deliver items');
 await page.click('[data-forge-strike]');
 await page.waitForSelector('.forge-workshop[data-forge-reheat="false"]');
 const perfect=await page.evaluate(()=>({reheats:window.mockState.workshopCraftProject.forgeReheats,heat:window.mockState.workshopCraftProject.forgeHeatPct,saved:window.mockState.workshopCraftProject.forgeBonusMs}));
 assert.equal(perfect.reheats,1);
 assert.equal(perfect.saved,8000,'perfect reheat saves eight seconds');
 assert(perfect.heat>98&&perfect.heat<=100,'full heat is restored before ordinary background cooling resumes');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject.forge.results.map(x=>x.points).join(',')),qualityBefore,'reheat leaves the original three scores untouched');
 await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+45000;window.dispatchEvent(new Event('focus'))});
 await page.waitForSelector('.forge-workshop[data-forge-reheat="true"]');
 assert.equal(await page.evaluate(()=>window.mockState.consumables[0]?.quantity),1,'second heat cycle also blocks rewards');
 // Deliberately miss the second reheat: cooler furnace, no extra bonus.
 await page.locator('[data-forge-position]').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.click('[data-forge-strike]');
 await page.waitForSelector('.forge-workshop[data-forge-reheat="false"]');
 const rough=await page.evaluate(()=>({reheats:window.mockState.workshopCraftProject.forgeReheats,heat:window.mockState.workshopCraftProject.forgeHeatPct,saved:window.mockState.workshopCraftProject.forgeBonusMs}));
 assert.equal(rough.reheats,2);
 assert.equal(rough.saved,8000,'rough reheat cannot grant time bonuses');
 assert(rough.heat>=49&&rough.heat<=51,'rough reheat restores about 51%, before ordinary cooling resumes');
 await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+45000;window.dispatchEvent(new Event('focus'))});
 await page.waitForSelector('.forge-workshop[data-forge-reheat="true"]');
 assert.equal(await page.evaluate(()=>window.mockState.consumables[0]?.quantity),1,'poor reheat causes another cooling interruption');
 await page.click('[data-forge-strike]');
 await page.waitForSelector('.forge-workshop[data-forge-reheat="false"]');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject.forgeBonusMs),16000,'third perfect reheat earns another eight seconds');
 await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+45000;window.dispatchEvent(new Event('focus'))});
 await page.waitForFunction(()=>window.mockState.consumables[0]?.quantity===6,null,{timeout:6000});
 assert.equal(await page.evaluate(()=>window.mockState.roster[0].professions[0].projectsCompleted),6,'project count accounts for one plus five items');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),15,'five perfect items each reclaim at most one input');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject),null,'batch clears after one reward transaction');
 await page.waitForSelector('[data-forge-job-summary]');
 const summary=await page.evaluate(()=>window.mockState.workshopCraftSummary);
 assert.equal(summary.outputQuantity,5,'finished result records five items');
 assert.equal(summary.reheatCount,3,'finished result records all three reheat rounds');
 assert.equal(summary.bonusMs,16000,'finished result records actual time saved');
 assert.equal(summary.reheatLog[1].heatPct,51,'rough reheat score is retained');
 assert(summary.xpTotal>0,'summary records actual profession XP, not an estimate');
 assert.equal(await page.locator('.forge-summary-reheat').count(),3,'end screen displays every furnace round');
 assert((await page.locator('.forge-summary-stats').innerText()).includes('16s'),'end screen displays actual time reduction');
 await page.click('[data-forge-summary-close]');
 await page.waitForSelector('[data-craft="test-whetstone"]');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftSummary),null,'completion dismissal unlocks future work');

 // Normal players must never see or benefit from the administrator test option.
 assert.equal(await page.locator('[data-admin-craft-reagents]').count(),0,'normal players see no admin crafting switch');
 await page.evaluate(()=>{window.mockState.materials['zeltiran-iron']=0;window.mockState.adminCraftWithoutReagents=true;window.CellboundEconomy.renderProfessions()});
 assert.equal(await page.locator('[data-admin-craft-reagents]').count(),0,'tampering with a save cannot reveal admin controls');
 assert.equal(await page.locator('[data-craft="test-whetstone"]').isDisabled(),true,'non-admin cannot bypass material costs using a saved flag');

 // A verified admin turns on reagent-free testing without manufacturing stock.
 await page.evaluate(()=>{window.mockEntitlements={isAdmin:true,adminRole:'admin'};window.mockState.adminCraftWithoutReagents=false;window.CellboundEconomy.renderProfessions()});
 assert.equal(await page.locator('[data-admin-craft-reagents]').count(),1,'admin sees the toggle');
 assert.equal(await page.locator('[data-admin-craft-reagents]').getAttribute('aria-pressed'),'false','admin bypass defaults off');
 assert.equal(await page.locator('[data-craft="test-whetstone"]').isDisabled(),true,'admin off still needs actual ingredients');
 const savesBefore=await page.evaluate(()=>window.mockPersistCount);
 await page.click('[data-admin-craft-reagents]');
 await page.waitForFunction(()=>window.mockPersistCount>0&&window.mockState.adminCraftWithoutReagents===true);
 assert((await page.evaluate(()=>window.mockPersistCount))>savesBefore,'admin choice is persisted');
 assert.equal(await page.locator('[data-admin-craft-reagents]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-craft="test-whetstone"]').isEnabled(),true,'admin can craft with zero materials');
 assert((await page.locator('.admin-reagents-waived').first().innerText()).includes('WAIVED'),'recipes disclose free test materials');
 assert.equal(await page.locator('[data-craft-qty="test-whetstone"]').getAttribute('max'),'5','free material admin mode retains blacksmith batch limit');

 await page.locator('[data-craft-qty="test-whetstone"]').fill('2');
 await page.locator('[data-craft-qty="test-whetstone"]').press('Tab');
 await page.click('[data-craft="test-whetstone"]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="0"]');
 assert.deepEqual(await page.evaluate(()=>({stock:window.mockState.materials['zeltiran-iron'],reserved:window.mockState.workshopCraftProject.reservedInputs,free:window.mockState.workshopCraftProject.adminFreeReagents,qty:window.mockState.workshopCraftProject.quantity})),{stock:0,reserved:{},free:true,qty:2},'admin order reserves nothing and consumes no materials');
 assert.equal(await page.locator('[data-admin-craft-reagents]').isDisabled(),true,'toggle cannot change during a work order');
 await page.click('[data-craft-abandon]');
 await page.waitForSelector('[data-craft="test-whetstone"]');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),0,'cancelling an admin test never refunds imaginary reagents');

 // Test a whole free-material order and ensure masterwork does not generate phantom reagents.
 await page.locator('[data-craft-qty="test-whetstone"]').fill('1');
 await page.locator('[data-craft-qty="test-whetstone"]').press('Tab');
 const existing=await page.evaluate(()=>window.mockState.consumables[0].quantity);
 await page.click('[data-craft="test-whetstone"]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="0"]');
 for(let step=0;step<3;step++){await page.click('[data-forge-strike]');await page.waitForSelector('.forge-workshop[data-forge-stage="'+(step+1)+'"]')}
 await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+30000;window.dispatchEvent(new Event('focus'))});
 await page.waitForFunction(qty=>window.mockState.consumables[0]?.quantity===qty+1,existing,{timeout:6000});
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),0,'free masterwork must not reclaim any material');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftSummary.reclaimed),0,'summary correctly shows zero reagent refunds');
 await page.click('[data-forge-summary-close]');
 await page.waitForSelector('[data-craft="test-whetstone"]');
 await page.click('[data-admin-craft-reagents]');
 assert.equal(await page.locator('[data-craft="test-whetstone"]').isDisabled(),true,'turning off restores normal material checks');
 assert.equal(await page.evaluate(()=>window.mockState.adminCraftWithoutReagents),false);
 // The same setting must work for other professions, not just the forge.
 await page.evaluate(()=>{
   window.mockState.roster[0].professions[0]={name:'Alchemy',level:10,xp:0,craftHistory:{},masterworks:0,projectsCompleted:0};
   window.CellboundProfessions.PROFESSIONS.Alchemy={icon:'◌',summary:'Brew test potions.',recipes:[{id:'test-potion',name:'Test Potion',level:1,inputs:{'zeltiran-iron':3},xp:12,output:{category:'consumable',name:'Test Potion',key:'test-potion',quantity:1,payload:{effect:'flask'}}}]};
   window.CellboundEconomy.renderProfessions();
 });
 assert.equal(await page.locator('[data-craft="test-potion"]').isDisabled(),true,'other professions still respect normal reagent costs');
 await page.click('[data-admin-craft-reagents]');
 assert.equal(await page.locator('[data-craft="test-potion"]').isEnabled(),true,'admin bypass applies to Alchemy');
 assert.equal(await page.locator('[data-craft-qty="test-potion"]').getAttribute('max'),'99','other professions retain their batch cap');
 await page.click('[data-craft="test-potion"]');
 await page.waitForSelector('.timed-craft-project');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject.adminFreeReagents),true,'other profession orders also capture test mode');
 assert.deepEqual(await page.evaluate(()=>window.mockState.workshopCraftProject.reservedInputs),{},'non-blacksmith order requires no reagents');
 await page.click('[data-craft-abandon]');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),0);
 await page.evaluate(()=>{window.mockState.roster[0].professions[0].name='Blacksmithing';window.CellboundEconomy.renderProfessions()});
 await page.click('[data-admin-craft-reagents]');
 assert.deepEqual(errors,[],'no browser errors');
 console.log('Blacksmith forge economy integration passed: reserve, three saved actions, batch-scaled timer, full cancellation refund and five-item reward.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
