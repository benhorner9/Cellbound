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
 await page.locator('#workshopTabs [data-tab="shop"]').click();
 await page.locator('[data-action="buy"][data-id="field-vest"]').click();
 await page.locator('#workshopTabs [data-tab="pack"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('Fieldkeeper Vest'))throw Error('Cannot see purchased equipment');
 await page.locator('[data-action="equip"][data-id="i1"]').click();
 await page.locator('#workshopClose').click();
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#manageFromPickerBtn').click();
 await page.locator('#workshopTabs [data-tab="pack"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('Equipped by Aldric'))throw Error('Equipped item did not persist');
 await page.locator('#workshopClose').click();
 if(!(await page.locator('[data-hero="knight"] .hero-stats').innerText()).includes('178 / 178'))throw Error('Equipment did not change real combat HP');
 const box=await page.locator('#overlayContent').boundingBox();
 if(!box||box.y<-2||box.y+box.height>823)throw Error('Live boss picker clipped on iPad view');
 await page.locator('#startBtn').click();
 await page.waitForFunction(()=>document.getElementById('phaseLabel').textContent.includes('LIVE'),null,{timeout:10000});
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
 await page.locator('#restartBtn').click();
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
  await page.locator('#bossSelectBtn').click();
  if(!(await page.locator('#encounterList').isVisible()))throw Error('Cannot retreat to boss chooser');
  if((await page.locator('#profileRecord').innerText())!=='0 boss victories')throw Error('Boss switching granted unearned loot');
 }
 await page.reload({waitUntil:'networkidle'});
 if((await page.locator('#selectedBossName').innerText())!=='Tempest Seraph')throw Error('Selected boss did not persist after reload');
 await page.locator('#startBtn').click();
 if((await page.locator('#bossLabel').innerText())!=='TEMPEST SERAPH')throw Error('Reloaded boss selection switched back to Thornwarden');
 await page.locator('#bossSelectTopBtn').click();
 if(!(await page.locator('#encounterList').isVisible()))throw Error('Top choose boss failed after reload');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: live Emberfall retains saved gear and starts actual Cindermaw and Tempest battles for level-one party, with correct mechanics/HP/loot, persisted selection, and no retreat payout.');
}catch(e){console.error('LIVE BROWSER FAILED:',e.stack||e);if(errors.length)console.error(errors.join('\n'));process.exitCode=1;}
finally{await browser.close();}
