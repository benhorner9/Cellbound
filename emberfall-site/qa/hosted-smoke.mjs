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
 await page.locator('#companyBtn').click();
 await page.locator('#workshopTabs [data-tab="shop"]').click();
 await page.locator('[data-action="buy"][data-id="field-vest"]').click();
 await page.locator('#workshopTabs [data-tab="pack"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('Fieldkeeper Vest'))throw Error('Cannot see purchased equipment');
 await page.locator('[data-action="equip"][data-id="i1"]').click();
 await page.locator('#workshopClose').click();
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#companyBtn').click();
 await page.locator('#workshopTabs [data-tab="pack"]').click();
 if(!(await page.locator('#workshopBody').innerText()).includes('Equipped by Aldric'))throw Error('Equipped item did not persist');
 await page.locator('#workshopClose').click();
 if(!(await page.locator('[data-hero="knight"] .hero-stats').innerText()).includes('178 / 178'))throw Error('Equipment did not change real combat HP');
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
 // After the familiar first boss works, confirm both new bosses are playable,
 // their loot tables are real and retreating does not generate a reward.
 await page.locator('#bossSelectBtn').click();
 if(!(await page.locator('[data-boss="cindermaw"]').isDisabled()))throw Error('New boss should be locked at level 1');
 await page.evaluate(async()=>{
  const {readProfile,writeProfile}=await import('./src/progression.js');
  const p=readProfile(localStorage);
  for(const hero of Object.values(p.heroes))hero.level=4;
  if(!writeProfile(localStorage,p))throw Error('Could not save levelled test company');
 });
 await page.reload({waitUntil:'networkidle'});
 for(const entry of [{id:'cindermaw',name:'CINDERMAW',unique:'The Cinderheart',warning:'FURNACE BREATH'},
                     {id:'tempest',name:'TEMPEST SERAPH',unique:'Eye of the Tempest',warning:'LIGHTNING LANE'}]){
  await page.locator('[data-boss="'+entry.id+'"]').click();
  await page.locator('#companyBtn').click();
  await page.locator('#workshopTabs [data-tab="loot"]').click();
  await page.locator('#dropBoss').selectOption(entry.id);
  if(!(await page.locator('#workshopBody').innerText()).includes(entry.unique))throw Error('Missing unique loot: '+entry.unique);
  await page.locator('#workshopClose').click();
  await page.locator('#startBtn').click();
  if(!(await page.locator('#bossLabel').innerText()).includes(entry.name))throw Error('Wrong live boss: '+entry.id);
  await page.waitForFunction(pattern=>document.getElementById('announcement').textContent.includes(pattern),entry.warning,{timeout:15000});
  await page.locator('#bossSelectBtn').click();
  if(!(await page.locator('#encounterList').isVisible()))throw Error('Cannot retreat to camp');
 }
 if(!((await page.locator('#profileRecord').innerText()).includes('0 boss victories')))throw Error('Abandoning bosses awarded free wins');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: live Emberfall retains gear, fights Thornwarden, unlocks two new bosses, exposes exclusive loot, renders distinct boss telegraphs and retreats without reward.');
}catch(e){console.error('LIVE BROWSER FAILED:',e.stack||e);if(errors.length)console.error(errors.join('\n'));process.exitCode=1;}
finally{await browser.close();}
