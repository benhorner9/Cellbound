import {webkit} from 'playwright';
const site='https://playcellbound.com/emberfall/';
const errors=[];
const failures=[];
const browser=await webkit.launch({headless:true});
const context=await browser.newContext({viewport:{width:1180,height:820},isMobile:true,hasTouch:true,deviceScaleFactor:2});
let staleDependencyRequests=0;
const tap=async(page,selector)=>{
 await page.locator(selector).scrollIntoViewIfNeeded();
 const box=await page.locator(selector).boundingBox();
 if(!box||box.width<1||box.height<1)throw Error('Tap target hidden: '+selector);
 await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
};
try{
 await context.route(/\/src\/progression\.js(?:\?.*)?$/,async route=>{
  const url=new URL(route.request().url());
  if(url.searchParams.get('v')!=='4.8.1'){
   staleDependencyRequests++;
   // Simulate what the returning iPad used to have cached: no new named exports.
   await route.fulfill({status:200,contentType:'application/javascript',body:'export const oldProgression = true;'});
  }else await route.continue();
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 page.on('requestfailed',r=>failures.push('Request failed: '+r.url()+' '+r.failure()?.errorText));
 page.on('response',r=>{if(r.status()>=400)failures.push('HTTP '+r.status()+' '+r.url());});
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(site+'?safari-cache-recovery=4.8.1',{waitUntil:'networkidle',timeout:45000});
 // WebKit can report networkidle while document.readyState is still "interactive".
 // Wait for the game's own post-listener startup marker instead of racing ES-module execution.
 let started=false;
 try{await page.waitForFunction(()=>document.documentElement.dataset.emberfallReady==='4.8.1',null,{timeout:20000});started=true;}catch{}
 if(!started){
  const snapshot=await page.evaluate(()=>({
   title:document.title,url:location.href,readyState:document.readyState,
   marker:document.documentElement.dataset.emberfallReady||null,
   body:(document.body?.innerText||'').slice(0,900),
   scripts:[...document.scripts].map(s=>({type:s.type,src:s.src})),
   overlays:[...document.querySelectorAll('#overlay,#overlayContent,#startBtn,#reloadGame')].map(e=>({id:e.id,tag:e.tagName,classes:e.className,text:(e.innerText||'').slice(0,180)}))
  }));
  console.error('WEBKIT BOOT DIAGNOSTIC: '+JSON.stringify({snapshot,errors,failures,staleDependencyRequests}));
  throw Error('Live Safari engine never initialized the game');
 }
 if(!(await page.locator('#startBtn').isVisible()))throw Error('Live boss Fight button is unresponsive or missing');
 if(staleDependencyRequests!==0)throw Error('Live module loader requested '+staleDependencyRequests+' stale/unversioned progression files');
 await tap(page,'[data-boss="cindermaw"]');
 if((await page.locator('#selectedBossName').innerText())!=='Cindermaw')throw Error('Cindermaw selection not responsive');
 await tap(page,'#startBtn');
 if((await page.locator('#bossLabel').innerText())!=='CINDERMAW')throw Error('Selected Cindermaw did not start');
 const dock=await page.locator('#combatActionDock').boundingBox();
 const stage=await page.locator('#battleFrame').boundingBox();
 if(!dock||!stage||dock.y<stage.y||dock.y+dock.height>stage.y+stage.height+2)throw Error('Live Safari skills are outside the combat arena');
 if((await page.locator('#abilities .skill').count())!==2)throw Error('Live Safari abilities missing');
 for(const button of await page.locator('#abilities .skill').all()){
  const b=await button.boundingBox();
  if(!b||b.y<0||b.y+b.height>820||b.height<44)throw Error('Safari requires scrolling to use abilities');
 }
 const fourth=await page.locator('#partyList [data-hero="cleric"]').boundingBox();
 if(!fourth||fourth.y+fourth.height>820)throw Error('Live Safari fourth hero still needs scrolling');
 await tap(page,'#partyList [data-hero="mage"]');
 if(!(await page.locator('#abilityHero').innerText()).includes('Lyra'))throw Error('Live Safari touch hero selection did not change the skill dock');
 const arena=await page.locator('#arena').boundingBox();
 if(!arena)throw Error('Live Safari combat arena missing');
 await page.touchscreen.tap(arena.x+arena.width*.38,arena.y+arena.height*.60);
 await page.waitForFunction(()=>!document.getElementById('combatTempo').classList.contains('hidden'),null,{timeout:6000});
 if(!(await page.locator('#combatTempo').innerText()).includes('70% SPEED'))throw Error('Live Safari PvE reposition slowdown missing');
 await tap(page,'#bossSelectTopBtn');
 if(await page.locator('#combatTempo').isVisible())throw Error('Live Safari movement slowdown did not clear after boss switch');
 if(!(await page.locator('#encounterList').isVisible()))throw Error('Live Safari header Choose Boss is unresponsive');
 await tap(page,'[data-boss="tempest"]');
 await tap(page,'#startBtn');
 if((await page.locator('#bossLabel').innerText())!=='TEMPEST SERAPH')throw Error('Live Safari switched to wrong boss');
 await tap(page,'#bossSelectTopBtn');
 await tap(page,'#manageFromPickerBtn');
 if(!(await page.locator('#workshop').isVisible()))throw Error('Live Safari workshop cannot open');
 if(!(await page.locator('.party-formation').isVisible())||(await page.locator('.party-position').count())!==4)throw Error('Live Safari party management missing');
 await tap(page,'[data-action="party-position"][data-index="0"]');
 await tap(page,'[data-action="party-pick"][data-id="ranger"]');
 const formation=await page.evaluate(()=>JSON.parse(localStorage.getItem('emberfall-company-v1')).partyOrder);
 if(formation[0]!=='ranger')throw Error('Live Safari could not swap party slots');
 await tap(page,'#workshopTabs [data-tab="talents"]');
 if(!(await page.locator('.talent-tree').isVisible()))throw Error('Live Safari talent tree missing');
 await tap(page,'[data-action="talent-node"][data-id="keen_sight"]');
 if(!(await page.locator('.talent-inspector-status').innerText()).includes('Locked until level 2'))throw Error('Live Safari locked talent inspection failed');
 await tap(page,'#workshopTabs [data-tab="heroes"]');
 if(!(await page.locator('#workshopBody').innerText()).includes('Saved Equipment Builds'))throw Error('Live Safari build UI did not render');
 await tap(page,'[data-action="save-build"][data-index="0"]');
 await tap(page,'#workshopTabs [data-tab="backup"]');
 if(!(await page.locator('#backupExport').inputValue()).includes('emberfall-local-backup'))throw Error('Live Safari backup UI not responsive');
 await tap(page,'#workshopClose');
 await page.reload({waitUntil:'networkidle',timeout:45000});
 await page.waitForFunction(()=>document.documentElement.dataset.emberfallReady==='4.8.1',null,{timeout:20000})
   .catch(()=>{throw Error('Live Safari warm-cache reload failed to initialise in 20s');});
 if((await page.locator('#selectedBossName').innerText())!=='Tempest Seraph')throw Error('Selected boss lost after warm-cache reload');
 await tap(page,'#startBtn');
 if((await page.locator('#bossLabel').innerText())!=='TEMPEST SERAPH')throw Error('Saved boss fails after reload');
 await page.evaluate(async()=>{
  const {readProfile,addItem,writeProfile}=await import('./src/progression.js?v=4.8.1');
  const p=readProfile(localStorage);addItem(p,'emberglass-staff');addItem(p,'field-vest');
  if(!writeProfile(localStorage,p))throw Error('WebKit gear setup failed');
 });
 await page.reload({waitUntil:'networkidle',timeout:45000});
 await tap(page,'#bagFromPickerBtn');
 // Both a Mage-only staff and unrestricted vest are in the bag; select the staff explicitly.
 // The default selection is the most recently acquired item, which is the unrestricted vest.
 await tap(page,'#inventoryGrid [data-id="i1"]');
 if(await page.locator('#equipHero').count())throw Error('Safari equipment recipient dropdown remains');
 if(!(await page.locator('.inventory-party-selector').isVisible()))throw Error('Safari cannot see hero portrait selector');
 if((await page.locator('.inventory-recipient:not(:disabled)').count())!==1)throw Error('Mage-only item allows wrong heroes');
 if((await page.locator('[data-action="equip"][data-id="i1"]').getAttribute('data-hero'))!=='mage')throw Error('Safari mage equipment targeted incompatible hero');
 await tap(page,'[data-action="equip"][data-id="i1"]');
 if(await page.locator('#inventoryGrid [data-id="i1"]').count())throw Error('Safari still shows equipped gear in bag');
 await tap(page,'#workshopTabs [data-tab="heroes"]');
 await tap(page,'[data-action="hero"][data-id="mage"]');
 if(!(await page.locator('#workshopBody').innerText()).includes('Emberglass Staff'))throw Error('Safari mage equipment not visible');
 if(!(await page.locator('.equipment-paperdoll').isVisible()))throw Error('Safari on-body equipment screen missing');
 if((await page.locator('.equipment-paperdoll .paperdoll-slot').count())!==9)throw Error('Safari equipment body missing nine worn item slots');
 await tap(page,'[data-action="inspect-gear-slot"][data-slot="offhand"]');
 if(!(await page.locator('.armory-inspection-copy').innerText()).includes('Off Hand'))throw Error('Safari off-hand slot inspection missing');
 if(!(await page.locator('.paperdoll-slot-weapon .paperdoll-unequip').isVisible()))throw Error('Safari cannot unequip weapon from its body position');
 if(!(await page.locator('.equipment-character-svg').isVisible()))throw Error('Safari central hero illustration missing');
 await tap(page,'[data-action="inspect-gear-slot"][data-slot="weapon"]');
 if(!(await page.locator('.armory-inspection-copy').innerText()).includes('Emberglass Staff'))throw Error('Safari slot tap did not show actual equipped item details');
 await tap(page,'.paperdoll-slot-weapon .paperdoll-unequip');
 await tap(page,'#workshopTabs [data-tab="pack"]');
 if(!(await page.locator('#inventoryGrid [data-id="i1"]').isVisible()))throw Error('Safari unequipped item not returned to bag');
 await tap(page,'[data-action="inspect"][data-id="i2"]');
 if((await page.locator('.inventory-recipient:not(:disabled)').count())!==4)throw Error('Safari shared gear does not allow all heroes');
 await tap(page,'[data-action="target-hero"][data-id="ranger"]');
 if((await page.locator('[data-action="equip"][data-id="i2"]').getAttribute('data-hero'))!=='ranger')throw Error('Safari could not change equipment recipient');
 await tap(page,'[data-action="equip"][data-id="i2"]');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('emberfall-company-v1')));
 if(saved.heroes.ranger.gear.armour!=='i2')throw Error('Safari selected Ranger was not equipped');
 await tap(page,'#workshopClose');
 await page.evaluate(async()=>{
  const {readProfile,writeProfile}=await import('./src/progression.js?v=4.8.1');
  const p=readProfile(localStorage);
  for(const id of ['verdant-ore','verdant-seal','verdant-essence'])p.materials[id]=12;
  if(!writeProfile(localStorage,p))throw Error('Safari reagent fixture could not be saved');
 });
 await page.reload({waitUntil:'networkidle',timeout:45000});
 await tap(page,'#manageFromPickerBtn');
 await tap(page,'#workshopTabs [data-tab="craft"]');
 if(!(await page.locator('.craft-workbench').isVisible()))throw Error('Live Safari crafting workshop missing');
 await tap(page,'[data-action="craft-skill"][data-skill="alchemy"]');
 await tap(page,'[data-action="craft-select"][data-id="brew-verdant-draught"]');
 await tap(page,'[data-action="craft-add"][data-id="verdant-essence"]');
 await tap(page,'[data-action="craft-add"][data-id="verdant-ore"]');
 if(!(await page.locator('.craft-potion').first().innerText()).includes('In stock: 1'))throw Error('Live Safari ingredient minigame did not grant potion');
 await tap(page,'[data-action="prepare-elixir"][data-id="verdant-draught"]');
 const prepared=await page.evaluate(()=>JSON.parse(localStorage.getItem('emberfall-company-v1')));
 if(prepared.preparedElixir!=='verdant-draught')throw Error('Live Safari could not prepare a potion');
 await tap(page,'#workshopClose');
 if(errors.length)throw Error('Live Safari console errors:\n'+errors.join('\n'));
 console.log('PASS: hosted WebKit Safari-engine cold/warm-cache startup, no stale imports, actual two boss fights, iPad taps and workshop.');
}catch(e){
 console.error('LIVE SAFARI ENGINE FAILED: '+(e.stack||e));
 if(errors.length)console.error('Browser errors:\n'+errors.join('\n'));
 process.exitCode=1;
}finally{
 await browser.close();
}
