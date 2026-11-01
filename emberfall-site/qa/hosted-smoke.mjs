import {chromium} from 'playwright';
const base='https://playcellbound.com/emberfall/';
const errors=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,deviceScaleFactor:2});
page.on('pageerror',e=>errors.push('Page error '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('Console '+m.text());});
page.on('response',r=>{
 if(/\/emberfall\/src\/.*\.js(\?|$)/.test(r.url())){
  if(!/javascript|ecmascript/i.test(r.headers()['content-type']||''))errors.push('Invalid JS MIME '+r.url());
  if(!r.ok())errors.push('JS HTTP '+r.status()+' '+r.url());
 }
});
try{
 await page.goto(base+'?sha='+process.env.GITHUB_SHA,{waitUntil:'networkidle',timeout:35000});
 // Verify this is a playable, persistent progression release, not a cosmetic mock-up.
 await page.locator('#manageFromPickerBtn').click();
 if(!(await page.locator('.party-formation').isVisible())||(await page.locator('.party-position').count())!==4)throw Error('Live dedicated 4-slot Party screen missing');
 await page.locator('#workshopTabs [data-tab="talents"]').click();
 if((await page.locator('.talent-node').count())!==4)throw Error('Live connected talent-tree choices missing');
 await page.locator('[data-action="talent-node"][data-id="ironwall"]').click();
 if(!(await page.locator('.talent-inspector-status').innerText()).includes('Locked until level 2'))throw Error('Live locked talent does not inspect correctly');
 await page.locator('#workshopTabs [data-tab="shop"]').click();
 await page.locator('[data-action="buy"][data-id="field-vest"]').click();
 await page.locator('#workshopTabs [data-tab="pack"]').click();
 if(!(await page.locator('#inventoryScroll').isVisible())||!(await page.locator('#itemInspector').isVisible()))throw Error('Hosted split-panel bag missing');
 const bagCols=await page.locator('#inventoryGrid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(/\s+/).length);
 if(bagCols!==4)throw Error('Hosted bag does not have four columns');
 if(!(await page.locator('#workshopBody').innerText()).includes('Fieldkeeper Vest'))throw Error('Cannot see purchased equipment');
 if(await page.locator('#equipHero').count())throw Error('Recipient dropdown still appears');
 if((await page.locator('.inventory-recipient').count())!==4||!(await page.locator('.inventory-party-selector').isVisible()))throw Error('Unrestricted vest must show a visible four-hero picker');
 if((await page.locator('.inventory-recipient:not(:disabled)').count())!==4)throw Error('Shared vest must allow all heroes');
 await page.locator('[data-action="equip"][data-id="i1"]').click();
 if(await page.locator('#inventoryGrid [data-id="i1"]').count())throw Error('Equipped vest remains in bag');
 if((await page.locator('#bagCount').innerText())!=='0')throw Error('Bag count includes equipped vest');
 await page.locator('#workshopClose').click();
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#manageFromPickerBtn').click();
 await page.locator('#workshopTabs [data-tab="pack"]').click();
 if(await page.locator('#inventoryGrid [data-id="i1"]').count())throw Error('Equipped item returned to bag after reload');
 await page.locator('#workshopTabs [data-tab="heroes"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('Fieldkeeper Vest'))throw Error('Equipped vest not in hero slot after reload');
 if(!(await page.locator('.equipment-paperdoll').isVisible()))throw Error('Hosted hero equipment silhouette absent');
 if((await page.locator('.equipment-paperdoll .paperdoll-slot').count())!==9)throw Error('Hosted body must show all nine worn-item slots');
 for(const slot of ['helm','charm','armour','legs','gloves','boots','ring','weapon','offhand'])
  if(!(await page.locator('.paperdoll-slot-'+slot).isVisible()))throw Error('Hosted missing worn slot '+slot);
 const charm=await page.locator('.paperdoll-slot-charm').boundingBox(),armour=await page.locator('.paperdoll-slot-armour').boundingBox(),weapon=await page.locator('.paperdoll-slot-weapon').boundingBox();
 if(!charm||!armour||!weapon||!(charm.y<armour.y&&Math.abs(armour.y-weapon.y)<30&&weapon.x>armour.x))throw Error('Hosted body positions wrong');
 const helm=await page.locator('.paperdoll-slot-helm').boundingBox();
 const legs=await page.locator('.paperdoll-slot-legs').boundingBox();
 const boots=await page.locator('.paperdoll-slot-boots').boundingBox();
 if(!helm||!legs||!boots||!(helm.y<charm.y&&legs.y>armour.y&&boots.y>weapon.y))throw Error('Hosted nine worn slots arranged incorrectly');
 if(!(await page.locator('.paperdoll-slot-armour .paperdoll-unequip').isVisible()))throw Error('Hosted equipped armour cannot be unequipped from body slot');
 if(!(await page.locator('.equipment-character-svg').isVisible()))throw Error('Reference-style centre hero illustration missing');
 if(!(await page.locator('.armory-titlebar').innerText()).includes('Aldric'))throw Error('Reference-style hero header not showing selected hero');
 if(!(await page.locator('.armory-inspection-copy').innerText()).includes('Fieldkeeper Vest'))throw Error('Initial equipped item details missing');
 await page.locator('[data-action="inspect-gear-slot"][data-slot="charm"]').click();
 if(!(await page.locator('.armory-inspection-copy').innerText()).includes('No item equipped'))throw Error('Empty charm inspection failed');
 await page.locator('[data-action="inspect-gear-slot"][data-slot="armour"]').click();
 if((await page.locator('[data-action="inspect-gear-slot"][data-slot="armour"]').getAttribute('aria-pressed'))!=='true')throw Error('Selected armour slot frame not highlighted');
 if(!(await page.locator('.armory-inspection-copy').innerText()).includes('Fieldkeeper Vest'))throw Error('Item inspection did not update on tap');
 await page.locator('#workshopClose').click();
 if(!(await page.locator('[data-hero="knight"] .hero-stats').innerText()).includes('178 / 178'))throw Error('Equipment did not change real combat HP');
 const box=await page.locator('#overlayContent').boundingBox();
 if(!box||box.y<-2||box.y+box.height>823)throw Error('Live boss picker clipped on iPad view');
 await page.locator('#startBtn').click();
 await page.waitForFunction(()=>document.getElementById('phaseLabel').textContent.includes('LIVE'),null,{timeout:10000});
 const dock=await page.locator('#combatActionDock').boundingBox();
 const stage=await page.locator('#battleFrame').boundingBox();
 const hero4=await page.locator('#partyList [data-hero="cleric"]').boundingBox();
 const partyRail=await page.locator('.combat-party-rail').boundingBox();
  if(!dock||!stage||!partyRail||dock.y<stage.y+stage.height-3||dock.y+dock.height>partyRail.y+3)throw Error('Live skills must sit between full-width arena and four-hero party rail');
  if(stage.width<950)throw Error('Live iPad arena did not expand to full width');
 if(!hero4||hero4.y+hero4.height>820)throw Error('Live fourth hero selector still needs page scrolling');
 if((await page.locator('#abilities .skill').count())!==2)throw Error('Live tactical action dock missing real ability buttons');
 for(const button of await page.locator('#abilities .skill').all()){
  const box=await button.boundingBox();
  if(!box||box.y<0||box.y+box.height>820||box.height<44)throw Error('Live ability requires scrolling or has undersized tap target');
 }
 await page.locator('[data-hero="mage"]').click();
 if(!(await page.locator('#abilityHero').innerText()).includes('Lyra'))throw Error('Mage select failed');
 const rect=await page.locator('#arena').boundingBox();
 const point=(x,y)=>({x:rect.x+x/1200*rect.width,y:rect.y+y/640*rect.height});
 const pos=point(947,285);
 await page.touchscreen.tap(pos.x,pos.y);
 await page.locator('[data-slot="0"]').click();
 await page.waitForTimeout(200);
 const hp=Number((await page.locator('#bossHpText').innerText()).split('/')[0].trim());
 if(!(hp<720))throw Error('Hosted boss did not take spell damage ('+hp+')');
 await page.locator('[data-hero="cleric"]').click();
 await page.locator('[data-slot="1"]').click();
 if(!(await page.locator('[data-hero="cleric"] .hero-stats').innerText()).includes('barrier'))throw Error('Sanctuary failed');
 await page.locator('#pauseBtn').click();
 if(!(await page.locator('#phaseLabel').innerText()).includes('PAUSED'))throw Error('Pause failed');
 await page.locator('#pauseBtn').click();
 await page.locator('#companyMenuBtn').click();await page.locator('#restartBtn').click();
 await page.locator('#battleTime').waitFor();
 if((await page.locator('#battleTime').innerText())!=='00:00')throw Error('Restart not reset');
 // Actual regression: new level-one players must be able to switch the fight,
 // not merely preview bosses that are locked behind later levels.
 await page.locator('#bossSelectTopBtn').click();
 if((await page.locator('#selectedBossName').innerText())!=='Thornwarden')throw Error('Wrong initial boss');
 for(const entry of [
  {id:'cindermaw',name:'Cindermaw',hp:865,unique:'The Cinderheart',warning:'FURNACE BREATH'},
  {id:'tempest',name:'Tempest Seraph',hp:1010,unique:'Eye of the Tempest',warning:'LIGHTNING LANE'}
 ]){
  await page.locator('[data-boss="'+entry.id+'"]').click();
  if((await page.locator('#selectedBossName').innerText())!==entry.name)throw Error('Boss picker failed to select '+entry.name);
  if(await page.locator('#startBtn').isDisabled())throw Error('Boss '+entry.name+' wrongly locked at level one');
  if(!(await page.locator('#startBtn').innerText()).includes(entry.name))throw Error('Fight button does not match selected boss');
  await page.locator('#manageFromPickerBtn').click();
  await page.locator('#workshopTabs [data-tab="loot"]').click();
  await page.locator('#dropBoss').selectOption(entry.id);
  if(!(await page.locator('#workshopBody').innerText()).includes(entry.unique))throw Error('Exclusive item missing');
  await page.locator('#workshopClose').click();
  await page.locator('#startBtn').click();
  if((await page.locator('#bossLabel').innerText())!==entry.name.toUpperCase())throw Error('Wrong actual boss after selection');
  const hp=Number((await page.locator('#bossHpText').innerText()).split('/')[1].trim());
  if(hp!==entry.hp)throw Error('Wrong battle stats for '+entry.name+': '+hp);
  await page.waitForFunction(pattern=>document.getElementById('announcement').textContent.includes(pattern),entry.warning,{timeout:15000});
  await page.locator('#companyMenuBtn').click();await page.locator('#bossSelectBtn').click();
  if(!(await page.locator('#encounterList').isVisible()))throw Error('Cannot retreat to boss chooser');
  if((await page.locator('#profileRecord').innerText())!=='0 boss victories')throw Error('Boss switching granted unearned loot');
 }
 await page.reload({waitUntil:'networkidle'});
 if((await page.locator('#selectedBossName').innerText())!=='Tempest Seraph')throw Error('Selected boss did not persist after reload');
 await page.locator('#startBtn').click();
 if((await page.locator('#bossLabel').innerText())!=='TEMPEST SERAPH')throw Error('Reloaded boss selection switched back to Thornwarden');
 await page.locator('#bossSelectTopBtn').click();
 if(!(await page.locator('#encounterList').isVisible()))throw Error('Top choose boss failed after reload');
 // Live Block 04: simulate a legitimate local inventory from published boss item
 // definitions and verify the actual website's compare -> save -> swap -> restore loop.
 await page.evaluate(async()=>{
  const {readProfile,addItem,equip,writeProfile}=await import('./src/progression.js?v=4.8.3');
  const p=readProfile(localStorage),sword=addItem(p,'ironroot-edge'),armour=addItem(p,'brambleguard');
  addItem(p,'forgeguard');equip(p,'knight',sword.id);equip(p,'knight',armour.id);
  if(!writeProfile(localStorage,p))throw Error('Could not stage legitimate local gear set');
 });
 await page.reload({waitUntil:'networkidle'});
 if((await page.locator('html').getAttribute('data-emberfall-ready'))!=='4.8.3')throw Error('Live Block04 module tree did not initialize');
 await page.locator('#manageFromPickerBtn').click();
 await page.locator('#workshopTabs [data-tab="heroes"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('Verdant Covenant'))throw Error('Live set bonuses missing');
 if(!(await page.locator('#workshopBody').innerText()).includes('2/4 equipped'))throw Error('Live 2-piece set not active');
 await page.locator('[data-build-name="0"]').fill('Hosted Tank');
 await page.locator('[data-action="save-build"][data-index="0"]').click();
 await page.locator('#workshopTabs [data-tab="pack"]').click();
 if(await page.locator('#inventoryGrid [data-id="i2"]').count()||await page.locator('#inventoryGrid [data-id="i3"]').count())throw Error('Equipped collection gear still present in bag');
 await page.locator('[data-action="inspect"][data-id="i4"]').click();
 if(!(await page.locator('#itemInspector').innerText()).includes('−8 HP'))throw Error('Live gear compare omitted lost set bonus');
 await page.locator('[data-action="equip"][data-id="i4"]').click();
 if(await page.locator('#inventoryGrid [data-id="i4"]').count())throw Error('Equipped Forgeguard still in bag');
 if(!(await page.locator('#inventoryGrid [data-id="i3"]').isVisible()))throw Error('Displaced armour not returned to bag');
 await page.locator('#workshopTabs [data-tab="heroes"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('1/4 equipped'))throw Error('Live set did not deactivate after gear switch');
 await page.locator('[data-action="apply-build"][data-index="0"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('2/4 equipped'))throw Error('Live saved build did not restore gear');
 await page.locator('#workshopTabs [data-tab="backup"]').click();
 const data=await page.locator('#backupExport').inputValue();
 if(JSON.parse(data).builds.heroes.knight[0].name!=='Hosted Tank')throw Error('Live backup omitted presets');
 await page.locator('#backupImport').fill(data);
 await page.locator('[data-action="check-backup"]').click();
 if(!(await page.locator('.backup-preview').isVisible()))throw Error('Live backup validation did not finish');
 await page.locator('[data-action="restore-backup"]').click();
 await page.locator('[data-action="restore-backup"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('Backup restored'))throw Error('Live double confirmed import failed');
 await page.locator('#workshopClose').click();
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#manageFromPickerBtn').click();
 await page.locator('#workshopTabs [data-tab="heroes"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('Hosted Tank'))throw Error('Live saved build disappeared after reload');
 await page.locator('#workshopClose').click();
 await page.locator('#startBtn').click();
 if(!(await page.locator('[data-hero="knight"] .hero-stats').innerText()).includes('224 / 224'))throw Error('Live new combat stats did not include 2-piece set');
 // Hosted mage-only equipment must not offer an incompatible character.
 await page.evaluate(async()=>{
  const {readProfile,addItem,writeProfile}=await import('./src/progression.js?v=4.8.3');
  const p=readProfile(localStorage);
  addItem(p,'emberglass-staff');
  if(!writeProfile(localStorage,p))throw Error('Cannot stage class-specific gear');
 });
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#bagFromPickerBtn').click();
 const mageItem=page.locator('#inventoryGrid [data-id="i5"]');
 if(!(await mageItem.isVisible()))throw Error('Class-restricted gear missing from bag');
 await mageItem.click();
 if((await page.locator('.inventory-recipient:not(:disabled)').count())!==1)throw Error('Mage-only gear incorrectly allows incompatible heroes');
 if(!(await page.locator('[data-action="target-hero"][data-id="mage"]').isVisible()))throw Error('Mage selector not visible');
 if((await page.locator('[data-action="equip"][data-id="i5"]').getAttribute('data-hero'))!=='mage')throw Error('Mage-only equipment targeted wrong character');
 await page.locator('[data-action="equip"][data-id="i5"]').click();
 if(await page.locator('#inventoryGrid [data-id="i5"]').count())throw Error('Hosted equipped Mage gear still in bag');
 await page.locator('#workshopTabs [data-tab="heroes"]').click();
 await page.locator('[data-action="hero"][data-id="mage"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('Emberglass Staff'))throw Error('Hosted Mage gear absent from character equipment');
 await page.locator('.paperdoll-slot-weapon .paperdoll-unequip').click();
 await page.locator('#workshopTabs [data-tab="pack"]').click();
 if(!(await page.locator('#inventoryGrid [data-id="i5"]').isVisible()))throw Error('Hosted unequipped gear did not return to bag');
 // Explicitly select a different hero for unrestricted gear and check actual saved owner.
 await page.evaluate(async()=>{
  const {readProfile,addItem,writeProfile}=await import('./src/progression.js?v=4.8.3');
  const p=readProfile(localStorage);addItem(p,'field-vest');
  if(!writeProfile(localStorage,p))throw Error('Cannot stage shared vest');
 });
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#bagFromPickerBtn').click();
 await page.locator('[data-action="inspect"][data-id="i6"]').click();
 const rangerChoice=page.locator('[data-action="target-hero"][data-id="ranger"]');
 if(!(await rangerChoice.isVisible()))throw Error('Ranger selection not visible');
 await rangerChoice.click();
 if((await rangerChoice.getAttribute('aria-pressed'))!=='true')throw Error('Ranger selection not highlighted');
 if((await page.locator('[data-action="equip"][data-id="i6"]').getAttribute('data-hero'))!=='ranger')throw Error('Equip recipient did not change to ranger');
 await page.locator('[data-action="equip"][data-id="i6"]').click();
 if(await page.locator('#inventoryGrid [data-id="i6"]').count())throw Error('Ranger vest still visible in bag');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('emberfall-company-v1')));
 if(saved.heroes.ranger.gear.armour!=='i6'||saved.heroes.knight.gear.armour==='i6')throw Error('Briar did not receive the selected vest');
 await page.locator('#workshopTabs [data-tab="party"]').click();
 await page.locator('[data-action="party-position"][data-index="0"]').click();
 await page.locator('[data-action="party-pick"][data-id="ranger"]').click();
 const positioned=await page.evaluate(()=>JSON.parse(localStorage.getItem('emberfall-company-v1')));
 if(positioned.partyOrder[0]!=='ranger')throw Error('Live Party swap failed to persist');
 await page.locator('#workshopClose').click();
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#startBtn').click();
 if((await page.locator('#partyList .hero-card').first().getAttribute('data-hero'))!=='ranger')throw Error('Live swapped Party did not apply to next battle');
 const canvas=await page.locator('#arena').boundingBox();
 if(!canvas)throw Error('Live combat canvas missing');
 await page.touchscreen.tap(canvas.x+canvas.width*.39,canvas.y+canvas.height*.60);
 await page.waitForFunction(()=>!document.getElementById('combatTempo').classList.contains('hidden'),null,{timeout:6000});
 if(!(await page.locator('#combatTempo').innerText()).includes('70% SPEED'))throw Error('Live PvE movement slowdown missing from HUD');
 await page.locator('#companyMenuBtn').click();await page.locator('#restartBtn').click();
 await page.waitForFunction(()=>document.getElementById('combatTempo').classList.contains('hidden'),null,{timeout:6000});
 // Isolated live source must also support real craft XP, generated gear and potion effects.
 await page.evaluate(async()=>{
  const {readProfile,writeProfile}=await import('./src/progression.js?v=4.8.3');
  const p=readProfile(localStorage);
  for(const id of ['verdant-ore','verdant-seal','verdant-essence'])p.materials[id]=30;
  if(!writeProfile(localStorage,p))throw Error('Live crafting fixture could not be saved');
 });
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#manageFromPickerBtn').click();
 await page.locator('#workshopTabs [data-tab="craft"]').click();
 if(!(await page.locator('.craft-studio').isVisible())||(await page.locator('.craft-skill-tab').count())!==2)throw Error('Live Smithing and Alchemy guild missing');
 await page.locator('[data-action="craft-select"][data-id="forge-verdant-helm"]').click();
 await page.locator('[data-action="craft-heat"]').click();
 await page.waitForTimeout(550);
 await page.locator('[data-action="craft-strike"]').evaluate(el=>el.click());
 const gear=await page.evaluate(()=>JSON.parse(localStorage.getItem('emberfall-company-v1')));
 if(!gear.items.some(item=>item.defId==='verdant-helm')||gear.skills.smithing.level<2)throw Error('Live Smithing item or XP not awarded');
 await page.locator('[data-action="craft-skill"][data-skill="alchemy"]').click();
 await page.locator('[data-action="craft-select"][data-id="brew-verdant-draught"]').click();
 await page.locator('[data-action="craft-add"][data-id="verdant-essence"]').click();
 await page.locator('[data-action="craft-add"][data-id="verdant-ore"]').click();
 await page.locator('[data-action="prepare-elixir"][data-id="verdant-draught"]').click();
 const ready=await page.evaluate(()=>JSON.parse(localStorage.getItem('emberfall-company-v1')));
 if(ready.preparedElixir!=='verdant-draught'||ready.skills.alchemy.level<2)throw Error('Live potion mixing and preparation failed');
 await page.locator('#workshopClose').click();
 await page.locator('#startBtn').click();
 const afterUse=await page.evaluate(()=>JSON.parse(localStorage.getItem('emberfall-company-v1')));
 if(afterUse.preparedElixir!==null)throw Error('Live potion was not consumed at fight start');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: hosted Emberfall all bosses, actual set-aware comparison, saved unique-item builds, validated JSON backup/restore, persisted equipment and 2-piece combat HP.');
}catch(e){console.error('LIVE BROWSER FAILED:',e.stack||e);if(errors.length)console.error(errors.join('\n'));process.exitCode=1;}
finally{await browser.close();}
