const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 const page=await browser.newPage({viewport:{width:1180,height:820}}),errors=[],root=path.resolve(__dirname,'../dist');
 page.on('pageerror',e=>errors.push(String(e)));
 const html=fs.readFileSync(path.join(root,'guild.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 await page.route('https://cellbound.test/**',route=>{const f=path.resolve(root,new URL(route.request().url()).pathname.slice(1));return route.fulfill(f.startsWith(root+path.sep)&&fs.existsSync(f)?{path:f}:{status:404,body:''})});
 await page.goto('https://cellbound.test/guild.html');
 await page.evaluate(()=>{
   window.__signOut=0;
   document.querySelector('#signOut').addEventListener('click',()=>window.__signOut++);
   const labels={overview:'Town',roster:'Roster',quests:'Quests',content:'Dungeons',trading:'Trading Post',professions:'Professions',bank:'Bank',pvp:'PvP',raids:'Raids',world:'Activities',chat:'Social',admin:'Admin'};
   window.CellboundGame={switchView:id=>{document.querySelectorAll('.view').forEach(n=>n.classList.toggle('active',n.id===id));document.querySelector('#pageTitle').textContent=labels[id]||id;dispatchEvent(new CustomEvent('cellbound:view-changed',{detail:{view:id}}))}};
 });
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'town-world-v1.js'),'utf8')});
 assert.equal(await page.locator('.town-hotspot[data-town-target]').count(),9,'Town exposes nine world destinations');
 assert.equal(await page.locator('.sidebar').evaluate(n=>getComputedStyle(n).display),'none','legacy sidebar is no longer player navigation');
 assert.equal(await page.locator('.town-world').isVisible(),true);
 await page.screenshot({path:'/tmp/cellbound-town-01-desktop.png'});
 await page.locator('.town-inn').click();assert.equal(await page.locator('#roster').evaluate(n=>n.classList.contains('active')),true);
 assert.equal(await page.locator('#roster [data-town-return]').count(),0,'Inn owns its own physical exit instead of a generic return button');
 await page.locator('[data-world-utility="town"]').click();assert.equal(await page.locator('#overview').evaluate(n=>n.classList.contains('active')),true);
 await page.locator('.town-quests').click();assert.equal(await page.locator('#quests').evaluate(n=>n.classList.contains('active')),true);
 assert.equal(await page.locator('#quests [data-town-return]').count(),1);await page.locator('#quests [data-town-return]').click();
 await page.locator('.town-expeditions').click();assert.equal(await page.locator('#content').evaluate(n=>n.classList.contains('active')),true);await page.locator('#content [data-town-return]').click();
 await page.locator('.town-market').click();assert.equal(await page.locator('#trading').evaluate(n=>n.classList.contains('active')),true);await page.locator('[data-world-utility="town"]').click();
 await page.locator('[data-world-utility="social"]').click();assert.equal(await page.locator('#chat').evaluate(n=>n.classList.contains('active')),true);await page.locator('[data-world-utility="town"]').click();
 await page.locator('#worldSignOut').click();assert.equal(await page.evaluate(()=>window.__signOut),1);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/cellbound-town-02-phone.png'});
 assert.equal(await page.locator('.sidebar').evaluate(n=>getComputedStyle(n).display),'none');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Town has no page-level horizontal overflow');
 for(const node of await page.locator('.town-hotspot').all()){const box=await node.boundingBox();assert(box.width>=44&&box.height>=44,'Town hotspot touch target')}
 assert.deepEqual(errors,[]);await browser.close();console.log('Town world navigation: sidebar removal, world hotspots, utilities, return-to-town and responsive layout passed.');
})().catch(e=>{console.error(e);process.exit(1)});