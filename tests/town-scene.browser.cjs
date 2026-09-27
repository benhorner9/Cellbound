const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');

(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 const page=await browser.newPage({viewport:{width:1180,height:820}});
 const root=path.resolve(__dirname,'../dist'),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));

 const guildHtml=fs.readFileSync(path.join(root,'guild.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 await page.route('https://cellbound.test/**',route=>{
   const url=new URL(route.request().url()),rel=url.pathname.slice(1)||'guild.html';
   if(rel==='guild.html')return route.fulfill({status:200,contentType:'text/html',body:guildHtml});
   const file=path.resolve(root,rel);
   return route.fulfill(file.startsWith(root+path.sep)&&fs.existsSync(file)?{path:file}:{status:404,body:''});
 });
 await page.goto('https://cellbound.test/guild.html');

 await page.evaluate(()=>{
   const state={roster:[
     {id:'a',name:'Mara',class:'Warrior',spec:'Protection'},
     {id:'b',name:'Oren',class:'Priest',spec:'Holy'},
     {id:'c',name:'Ilyra',class:'Mage',spec:'Arcane'},
     {id:'d',name:'Soren',class:'Rogue',spec:'Assassination'},
     {id:'e',name:'Tamsin',class:'Hunter',spec:'Marksman'},
     {id:'f',name:'Vale',class:'Paladin',spec:'Protection'}
   ]};
   window.CellboundGame={
     ready:true,
     getState:()=>state,
     getPartyCharacters:()=>state.roster.slice(0,5),
     switchView:id=>{
       document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
       dispatchEvent(new CustomEvent('cellbound:view-changed',{detail:{view:id}}));
     }
   };
   window.CellboundQuests={render:()=>{}};
   document.querySelector('#homeDungeonStatus').textContent='The Ashen Vault';
   document.querySelector('#questNavBadge').textContent='2';
 });
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'town-scene-v1.js'),'utf8')});

 assert.equal(await page.locator('[data-town-object]').count(),15,'Town exposes physical destinations and district roads across four sectors');
 assert.equal(await page.locator('[data-town-scene]').getAttribute('data-town-sector'),'square','Town opens in Central Square');
 assert.equal(await page.locator('.town-painted-image').count(),1,'Central Square uses the painted town artwork');
 assert((await page.locator('.town-painted-image').getAttribute('src')||'').includes('assets/world/town/central-square-v1.webp'),'painted Central Square asset is wired into the scene');
 assert.equal(await page.locator('[data-town-sector="square"] [data-town-object]').count(),5,'painted Central Square exposes exactly five environmental destinations');
 assert.equal(await page.locator('[data-town-selection]').isVisible(),false,'No location labels/panel shown by default');

 const press=async id=>page.locator('[data-town-object="'+id+'"]').evaluate(n=>n.dispatchEvent(new MouseEvent('click',{bubbles:true})));

 await press('inn');
 assert.equal(await page.locator('#overview').evaluate(n=>n.classList.contains('active')),true,'first click selects without navigating');
 assert.equal(await page.locator('[data-town-selection]').isVisible(),true);
 assert.equal(await page.locator('[data-town-selection-title]').textContent(),'The Lantern Inn');
 assert.equal(await page.locator('[data-town-selection-action]').textContent(),'Enter the Inn →');
 assert.equal(await page.locator('[data-town-object="inn"]').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:'/tmp/cellbound-town-scene-01-selected.png'});

 await press('inn');await page.waitForTimeout(260);
 assert.equal(await page.locator('#roster').evaluate(n=>n.classList.contains('active')),true,'second Inn click enters');
 windowTown=await page.evaluate(()=>Boolean(window.CellboundTownScene));assert.equal(windowTown,true);

 await page.evaluate(()=>window.CellboundGame.switchView('overview'));
 await press('board');
 assert.equal(await page.locator('[data-town-selection-title]').textContent(),'Town Notice Board');
 await press('board');
 assert.equal(await page.locator('[data-town-board-focus]').isVisible(),true,'second Board click opens close-up');
 assert(await page.locator('[data-town-board-mount] #questJournalList').count(),'live quest journal is mounted on the physical board');
 assert.equal(await page.locator('#quests').evaluate(n=>n.children.length),0,'quest children moved into close-up rather than opening a page');
 await page.screenshot({path:'/tmp/cellbound-town-scene-02-board.png'});
 await page.locator('[data-town-board-close]').click();
 assert.equal(await page.locator('[data-town-board-focus]').isVisible(),false);
 assert(await page.locator('#quests #questJournalList').count(),'closing board restores the original quest view');

 await press('expeditionRoad');
 assert.equal(await page.locator('[data-town-selection-title]').textContent(),'Expedition Ward');
 assert.equal(await page.locator('[data-town-scene]').getAttribute('data-town-sector'),'square','first road tap only selects the district');
 await press('expeditionRoad');await page.waitForTimeout(560);
 assert.equal(await page.locator('[data-town-scene]').getAttribute('data-town-sector'),'expedition','second road tap pans into Expedition Ward');
 assert.equal(await page.locator('#overview').evaluate(n=>n.classList.contains('active')),true,'district travel stays inside Town');
 await page.screenshot({path:'/tmp/cellbound-town-scene-03-expedition.png'});

 await press('cart');
 assert.equal(await page.locator('[data-town-selection-title]').textContent(),'Expedition Cart');
 await press('cart');await page.waitForTimeout(260);
 assert.equal(await page.locator('#content').evaluate(n=>n.classList.contains('active')),true,'cart enters existing dungeon system');

 await page.evaluate(()=>window.CellboundGame.switchView('overview'));
 await press('merchantRoad');await press('merchantRoad');await page.waitForTimeout(560);
 assert.equal(await page.locator('[data-town-scene]').getAttribute('data-town-sector'),'merchant');
 await page.screenshot({path:'/tmp/cellbound-town-scene-04-merchant.png'});
 for(const [id,title,view] of [
   ['market','The Marketplace','trading'],
   ['forge','Crafting Quarter','professions'],
   ['vault','The Guild Vault','bank']
 ]){
   await page.evaluate(()=>window.CellboundTownScene.setSector('merchant',{instant:true,focus:false}));
   await press(id);
   assert.equal(await page.locator('[data-town-selection-title]').textContent(),title,id+' selects its building before entry');
   assert.equal(await page.locator('#overview').evaluate(n=>n.classList.contains('active')),true,id+' first tap stays in district');
   await press(id);await page.waitForTimeout(260);
   assert.equal(await page.locator('#'+view).evaluate(n=>n.classList.contains('active')),true,id+' second tap enters '+view);
   await page.evaluate(()=>window.CellboundGame.switchView('overview'));
 }

 await page.evaluate(()=>window.CellboundTownScene.setSector('expedition',{instant:true,focus:false}));
 for(const [id,title,view] of [
   ['arena','The Crucible','pvp'],
   ['grounds','Festival Grounds','world']
 ]){
   await press(id);
   assert.equal(await page.locator('[data-town-selection-title]').textContent(),title);
   await press(id);await page.waitForTimeout(260);
   assert.equal(await page.locator('#'+view).evaluate(n=>n.classList.contains('active')),true,id+' enters '+view);
   await page.evaluate(()=>window.CellboundGame.switchView('overview'));
   await page.evaluate(()=>window.CellboundTownScene.setSector('expedition',{instant:true,focus:false}));
 }

 await page.evaluate(()=>window.CellboundGame.switchView('overview'));
 await press('harbourRoad');await press('harbourRoad');await page.waitForTimeout(560);
 assert.equal(await page.locator('[data-town-scene]').getAttribute('data-town-sector'),'harbour');
 await page.screenshot({path:'/tmp/cellbound-town-scene-05-harbour.png'});
 await press('harbour');
 assert.equal(await page.locator('[data-town-selection-title]').textContent(),'Greywake Raid Pier');
 await press('harbour');await page.waitForTimeout(260);
 assert.equal(await page.locator('#raids').evaluate(n=>n.classList.contains('active')),true,'raid boat enters Greywake raid staging');

 await page.evaluate(()=>window.CellboundGame.switchView('overview'));
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/cellbound-town-scene-06-phone.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no phone horizontal overflow');
 for(const id of ['inn','board','merchantRoad','expeditionRoad','harbourRoad','market','forge','vault','cart','arena','grounds','harbour']){
   const box=await page.locator('[data-town-object="'+id+'"]').boundingBox();
   assert(box&&box.width>=44&&box.height>=44,id+' remains a usable touch target');
 }
 await page.locator('[data-town-object="board"]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('[data-town-object="board"]').getAttribute('aria-pressed'),'true','keyboard first press selects');
 await page.keyboard.press('Enter');
 assert.equal(await page.locator('[data-town-board-focus]').isVisible(),true,'keyboard second press opens board');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('[data-town-board-focus]').isVisible(),false,'Escape returns to Town');

 assert.deepEqual(errors,[]);
 await browser.close();
 console.log('Town scene: four readable sectors, physical district roads, select-then-enter destinations, Notice Board close-up and responsive controls passed.');
})().catch(e=>{console.error(e);process.exit(1)});