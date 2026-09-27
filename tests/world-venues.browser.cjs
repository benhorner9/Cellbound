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
   const roster=[
    {id:'a',name:'Mara',class:'Warrior'},
    {id:'b',name:'Oren',class:'Priest'},
    {id:'c',name:'Ilyra',class:'Mage'},
    {id:'d',name:'Soren',class:'Rogue'},
    {id:'e',name:'Tamsin',class:'Hunter'}
   ];
   window.CellboundGame={
    ready:true,
    getState:()=>({roster}),
    getPartyCharacters:()=>roster,
    switchView:id=>{
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
      dispatchEvent(new CustomEvent('cellbound:view-changed',{detail:{view:id}}));
    }
   };
   window.__pvpTab='';
   window.CellboundPvP={render:()=>{
     const mount=document.querySelector('#pvpMount');
     mount.innerHTML='<nav>'+
       ['battlegrounds','arena','armoury','leaderboard'].map(x=>'<button data-pvp-tab="'+x+'">'+x+'</button>').join('')+
       '</nav><div data-pvp-test>working pvp system</div>';
     mount.querySelectorAll('[data-pvp-tab]').forEach(b=>b.addEventListener('click',()=>window.__pvpTab=b.dataset.pvpTab));
   }};
   window.__tradeTab='';
   document.querySelectorAll('#trading [data-tp-tab]').forEach(b=>b.addEventListener('click',()=>window.__tradeTab=b.dataset.tpTab));
 });
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'world-venues-v1.js'),'utf8')});

 assert.equal(await page.locator('.cb-venue-stage').count(),7,'seven major systems receive venue staging');
 for(const id of ['pvp','trading','professions','bank','content','raids','world']){
   assert.equal(await page.locator('#'+id+' .cb-venue-stage').count(),1,id+' has one arrival scene');
   assert.equal(await page.locator('#'+id+' [data-venue-town]').count()>=1,true,id+' has a route back to Town');
 }

 await page.evaluate(()=>window.CellboundGame.switchView('pvp'));
 assert.equal(await page.locator('#pvp').getAttribute('data-venue-state'),'arrival');
 assert.equal(await page.locator('#pvp [data-venue-actor]').count(),4,'Crucible exposes officials and quartermaster');
 assert.equal(await page.locator('#pvpMount').evaluate(n=>getComputedStyle(n).display),'none','web system is hidden on arrival');

 const actor=async id=>page.locator('#pvp [data-venue-actor="'+id+'"]').click();
 await actor('marshal');
 assert.equal(await page.locator('#pvp [data-venue-name]').textContent(),'Gate Marshal');
 assert.equal(await page.locator('#pvp').getAttribute('data-venue-state'),'arrival','first interaction only talks/selects');
 await actor('marshal');await page.waitForTimeout(80);
 assert.equal(await page.locator('#pvp').getAttribute('data-venue-state'),'system','second interaction opens the working system');
 assert.equal(await page.evaluate(()=>window.__pvpTab),'battlegrounds','Gate Marshal routes to Battlegrounds');
 assert.notEqual(await page.locator('#pvpMount').evaluate(n=>getComputedStyle(n).display),'none');
 await page.screenshot({path:'/tmp/cellbound-venue-01-crucible-queue.png'});

 await page.locator('#pvp [data-venue-back]').click();
 assert.equal(await page.locator('#pvp').getAttribute('data-venue-state'),'arrival');
 await actor('quartermaster');await actor('quartermaster');await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>window.__pvpTab),'armoury','Quartermaster routes to PvP gear shop');
 await page.screenshot({path:'/tmp/cellbound-venue-02-crucible-shop.png'});
 await page.locator('#pvp [data-venue-town]').last().click();
 assert.equal(await page.locator('#overview').evaluate(n=>n.classList.contains('active')),true,'Crucible returns directly to Town');

 await page.evaluate(()=>window.CellboundGame.switchView('trading'));
 const broker=page.locator('#trading [data-venue-actor="broker"]');
 await broker.click();await broker.click();await page.waitForTimeout(50);
 assert.equal(await page.locator('#trading').getAttribute('data-venue-state'),'system');
 assert.equal(await page.evaluate(()=>window.__tradeTab),'browse','Market Broker routes into live Trading Post browse');
 await page.locator('#trading [data-venue-back]').click();
 assert.equal(await page.locator('#trading').getAttribute('data-venue-state'),'arrival');

 for(const [view,actorId] of [
  ['professions','artisan'],['bank','keeper'],['content','pathfinder'],['raids','dockmaster'],['world','herald']
 ]){
   await page.evaluate(v=>window.CellboundGame.switchView(v),view);
   const a=page.locator('#'+view+' [data-venue-actor="'+actorId+'"]');
   await a.click();await a.click();await page.waitForTimeout(30);
   assert.equal(await page.locator('#'+view).getAttribute('data-venue-state'),'system',view+' interaction opens its real system');
   await page.locator('#'+view+' [data-venue-back]').click();
   assert.equal(await page.locator('#'+view).getAttribute('data-venue-state'),'arrival',view+' can return to its venue');
   await page.locator('#'+view+' [data-venue-town]').first().click();
   assert.equal(await page.locator('#overview').evaluate(n=>n.classList.contains('active')),true,view+' can return to Town');
 }

 await page.evaluate(()=>window.CellboundGame.switchView('pvp'));
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/cellbound-venue-03-phone.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'venue template does not introduce phone horizontal overflow');
 for(const node of await page.locator('#pvp [data-venue-actor]').all()){
   const box=await node.boundingBox();assert(box&&box.width>=44&&box.height>=44,'Crucible NPC is a usable touch target');
 }

 assert.deepEqual(errors,[]);
 await browser.close();
 console.log('World venues: arrival scenes, NPC/station routing, PvP guard/shop, back-to-venue and Return-to-Town loops passed.');
})().catch(e=>{console.error(e);process.exit(1)});