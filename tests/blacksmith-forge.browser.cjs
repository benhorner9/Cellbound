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
  window.mockSaveCount=0;window.mockPersistCount=0;
  window.CellboundGear={};window.CellboundPortraits={portraitHTML:()=>'<b>Smith</b>'};
  window.CellboundProfessions={MATERIALS:{'zeltiran-iron':{name:'Zeltiran Iron',source:'Dungeon',rarity:'Common'}},PROFESSIONS:{Blacksmithing:{icon:'⚒',summary:'Make armour and steel.',recipes:[{id:'test-whetstone',name:'Test Whetstone',level:1,inputs:{'zeltiran-iron':2},xp:18,output:{category:'consumable',name:'Test Whetstone',key:'test-whetstone',quantity:1,payload:{effect:'gear-enhancement',slot:'Weapon'}}}]}},skillThreshold:()=>100000};
  window.CellboundGame={ready:true,getState:()=>window.mockState,getEntitlements:()=>({professionSlots:1}),getSupabase:()=>({rpc:async()=>({data:null,error:null})}),getUser:()=>({id:'test'}),isCharacterRosterUnlocked:()=>true,save:()=>{window.mockSaveCount++},persistState:async()=>{window.mockPersistCount++},renderAll:()=>{},addMaterial:(key,qty)=>{window.mockState.materials[key]=(window.mockState.materials[key]||0)+qty}};
 });
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist','blacksmith-forge-v1.js'),'utf8')});
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist','economy-v2.js'),'utf8')});
 await page.waitForSelector('[data-craft="test-whetstone"]');
 await page.click('[data-craft="test-whetstone"]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="0"]');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),3,'inputs reserved on start');
 assert.equal(await page.locator('.forge-phase').count(),3);
 assert.equal(await page.evaluate(()=>window.mockState.consumables.length),0,'no item before mini-game');
 await page.click('[data-forge-toggle]');
 await page.waitForSelector('.forge-workshop.manual');
 await page.click('[data-forge-strike]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="1"]');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject.forge.results.length),1,'stage saved');
 assert.equal(await page.evaluate(()=>window.mockPersistCount>=2),true,'progress persistence requested');
 await page.click('[data-craft-abandon]');
 await page.waitForSelector('[data-craft="test-whetstone"]');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),5,'cancel refunds materials');
 assert.equal(await page.evaluate(()=>window.mockState.consumables.length),0,'cancel grants no item');
 await page.click('[data-craft="test-whetstone"]');
 await page.waitForSelector('.forge-workshop[data-forge-stage="0"]');
 for(let step=0;step<3;step++){await page.click('[data-forge-strike]');await page.waitForSelector('.forge-workshop[data-forge-stage="'+(step+1)+'"]')}
 assert.equal(await page.locator('.forge-complete').count(),1,'three forge actions finish workpiece');
 assert.equal(await page.evaluate(()=>window.mockState.consumables.length),0,'quality alone cannot skip timer');
 await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+30000});
 await page.waitForFunction(()=>window.mockState.consumables.length===1,null,{timeout:5000});
 assert.equal(await page.evaluate(()=>window.mockState.consumables[0].quantity),1,'one work order delivers one item');
 assert.equal(await page.evaluate(()=>window.mockState.roster[0].professions[0].projectsCompleted),1,'one completed project');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject),null,'project cleared after claim');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),4,'masterwork consumes two inputs and reclaims exactly one, per existing rules');

 // Forging a batch of five uses the SAME skill challenge, but takes 5x time.
 await page.evaluate(()=>{window.mockState.materials['zeltiran-iron']=20});
 const input=page.locator('[data-craft-qty="test-whetstone"]');
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
 assert.equal(await page.evaluate(()=>window.mockState.consumables[0].quantity),1,'three successful stages alone do not grant five items');
 await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+160000});
 await page.waitForFunction(()=>window.mockState.consumables[0]?.quantity===6,null,{timeout:6000});
 assert.equal(await page.evaluate(()=>window.mockState.roster[0].professions[0].projectsCompleted),6,'project count accounts for one plus five items');
 assert.equal(await page.evaluate(()=>window.mockState.materials['zeltiran-iron']),15,'five perfect items each reclaim at most one input');
 assert.equal(await page.evaluate(()=>window.mockState.workshopCraftProject),null,'batch clears after one reward transaction');
 assert.deepEqual(errors,[],'no browser errors');
 console.log('Blacksmith forge economy integration passed: reserve, three saved actions, batch-scaled timer, full cancellation refund and five-item reward.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
