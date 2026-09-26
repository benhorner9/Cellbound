const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 const page=await browser.newPage({viewport:{width:1024,height:768}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('https://cellbound.test/**',async route=>{const file=path.resolve(root,'dist',new URL(route.request().url()).pathname.slice(1));if(!file.startsWith(path.resolve(root,'dist')+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});await route.fulfill({path:file})});
 let html=fs.readFileSync(path.join(root,'dist/guild.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 await page.setContent(html.replace('<head>','<head><base href="https://cellbound.test/">'));
 await page.evaluate(()=>{
  const roster=Array.from({length:7},(_,i)=>({id:'hero-'+i,name:['Aegis','Mercy','Ember','Fletch','Shade','Rowan','Kestrel'][i],class:['Warrior','Priest','Mage','Hunter','Rogue','Druid','Paladin'][i],role:i===0?'tank':i===1?'healer':'dps',level:15}));
  window.CellboundGame={ready:true,getState:()=>({roster}),getPartyCharacters:()=>roster.slice(0,5)};
  window.selectView=id=>{document.querySelectorAll('.view').forEach(n=>n.classList.toggle('active',n.id===id));dispatchEvent(new CustomEvent('cellbound:view-changed',{detail:{view:id}}))};
  window.selectedHero=null;document.addEventListener('click',e=>{const b=e.target.closest('[data-char]');if(b)window.selectedHero=b.dataset.char});
 });
 for(const f of ['character-portraits-v1.js','living-world-v1.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist',f),'utf8')});
 await page.evaluate(()=>selectView('roster'));
 await page.waitForSelector('#roster .lw-scene');
 assert.equal(await page.locator('#roster .lw-hero').count(),7);assert.equal(await page.locator('#roster .lw-hero.reserve').count(),2);
 await page.locator('#roster .lw-hero').first().click();assert.equal(await page.evaluate(()=>selectedHero),'hero-0');
 await page.locator('#rosterSearch').fill('Mage');assert.equal(await page.locator('#rosterSearch').inputValue(),'Mage');
 await page.evaluate(()=>{for(let i=0;i<5;i++)CellboundLivingWorld.refresh()});assert.equal(await page.locator('#roster > .lw-scene').count(),1);
 await page.screenshot({path:'/tmp/cellbound-world-inn.png'});
 for(const id of ['trading','bank','professions','quests','content','party']){await page.evaluate(id=>selectView(id),id);await page.waitForSelector('#'+id+' > .lw-scene');}
 await page.evaluate(()=>{const host=document.createElement('div');host.id='cb2dBackdrop';host.innerHTML='<section class="cb2d-brief"><header><button data-close>Close</button></header><button data-start>START</button><select id="existingDifficulty"><option>Normal</option><option>Heroic</option></select></section>';document.body.appendChild(host)});
 await page.waitForSelector('#cb2dBackdrop .lw-scene');assert.equal(await page.locator('#cb2dBackdrop .lw-hero').count(),5);assert.equal(await page.locator('#cb2dBackdrop [data-start]').textContent(),'Enter the Vault');
 await page.locator('#existingDifficulty').selectOption({label:'Heroic'});assert.equal(await page.locator('#existingDifficulty').inputValue(),'Heroic');
 await page.evaluate(()=>document.querySelector('#cb2dBackdrop').remove());
 await page.evaluate(()=>{selectView('raids');const rows=[0,1].map(i=>({guild_label:'Guild '+i,party_snapshot:CellboundGame.getPartyCharacters().map(c=>({...c,id:i+'-'+c.id}))}));CellboundLivingWorld.harbour(document.querySelector('#raids'),rows)});
 assert.equal(await page.locator('#raids .lw-hero').count(),10);assert.equal(await page.locator('#raids [data-world-party="1"]').count(),5);
 await page.screenshot({path:'/tmp/cellbound-world-harbour.png'});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>CellboundLivingWorld.harbour(document.querySelector('#raids'),[],true));assert.equal(await page.locator('.lw-departing').count(),0);
 for(const width of [768,390]){await page.setViewportSize({width,height:844});await page.evaluate(()=>selectView('roster'));await page.waitForSelector('#roster .lw-scene');const bounds=await page.locator('#roster .lw-scene').boundingBox();assert(bounds.x>=-1&&bounds.x+bounds.width<=width+1,'scene remains inside viewport');const hero=await page.locator('#roster .lw-hero').first().boundingBox();assert(hero.width>=44&&hero.height>=44,'touch target');}
 await page.evaluate(()=>{selectView('professions');CellboundLivingWorld.workstation(CellboundGame.getPartyCharacters()[2],{name:'Alchemy'})});
 await page.waitForFunction(()=>document.querySelector('#professions .lw-scene h2')?.textContent==='Alchemy Workshop');
 await page.evaluate(()=>dispatchEvent(new CustomEvent('cellbound:crafted',{detail:{name:'Healing Flask'}})));assert.equal(await page.locator('.lw-craft-result').textContent(),'Healing Flask completed');
 assert.deepEqual(errors,[]);await browser.close();console.log('Living world checks passed: existing controls, real portraits, idempotent scenes, two-party harbour, staging, crafting, phone/tablet widths and reduced motion.');
})().catch(e=>{console.error(e);process.exit(1)});
