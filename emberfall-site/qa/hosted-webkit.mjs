import {webkit} from 'playwright';
const site='https://playcellbound.com/emberfall/';
const errors=[];
const browser=await webkit.launch({headless:true});
const context=await browser.newContext({viewport:{width:1180,height:820},isMobile:true,hasTouch:true,deviceScaleFactor:2});
let staleDependencyRequests=0;
const tap=async(page,selector)=>{
 const box=await page.locator(selector).boundingBox();
 if(!box||box.width<1||box.height<1)throw Error('Tap target hidden: '+selector);
 await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
};
try{
 await context.route(/\/src\/progression\.js(?:\?.*)?$/,async route=>{
  const url=new URL(route.request().url());
  if(url.searchParams.get('v')!=='3.2.1'){
   staleDependencyRequests++;
   // Simulate what the returning iPad used to have cached: no new named exports.
   await route.fulfill({status:200,contentType:'application/javascript',body:'export const oldProgression = true;'});
  }else await route.continue();
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(site+'?safari-cache-recovery=3.2.1',{waitUntil:'networkidle',timeout:45000});
 if((await page.locator('html').getAttribute('data-emberfall-ready'))!=='3.2.1')throw Error('Live Safari engine never initialized the game');
 if(!(await page.locator('#startBtn').isVisible()))throw Error('Live boss Fight button is unresponsive or missing');
 if(staleDependencyRequests!==0)throw Error('Live module loader requested '+staleDependencyRequests+' stale/unversioned progression files');
 await tap(page,'[data-boss="cindermaw"]');
 if((await page.locator('#selectedBossName').innerText())!=='Cindermaw')throw Error('Cindermaw selection not responsive');
 await tap(page,'#startBtn');
 if((await page.locator('#bossLabel').innerText())!=='CINDERMAW')throw Error('Selected Cindermaw did not start');
 await tap(page,'#bossSelectTopBtn');
 if(!(await page.locator('#encounterList').isVisible()))throw Error('Live Safari header Choose Boss is unresponsive');
 await tap(page,'[data-boss="tempest"]');
 await tap(page,'#startBtn');
 if((await page.locator('#bossLabel').innerText())!=='TEMPEST SERAPH')throw Error('Live Safari switched to wrong boss');
 await tap(page,'#bossSelectTopBtn');
 await tap(page,'#manageFromPickerBtn');
 if(!(await page.locator('#workshop').isVisible()))throw Error('Live Safari workshop cannot open');
 await tap(page,'#workshopClose');
 await page.reload({waitUntil:'networkidle',timeout:45000});
 if((await page.locator('html').getAttribute('data-emberfall-ready'))!=='3.2.1')throw Error('Live Safari warm-cache reload failed');
 if((await page.locator('#selectedBossName').innerText())!=='Tempest Seraph')throw Error('Selected boss lost after warm-cache reload');
 await tap(page,'#startBtn');
 if((await page.locator('#bossLabel').innerText())!=='TEMPEST SERAPH')throw Error('Saved boss fails after reload');
 if(errors.length)throw Error('Live Safari console errors:\n'+errors.join('\n'));
 console.log('PASS: hosted WebKit Safari-engine cold/warm-cache startup, no stale imports, actual two boss fights, iPad taps and workshop.');
}catch(e){
 console.error('LIVE SAFARI ENGINE FAILED: '+(e.stack||e));
 if(errors.length)console.error('Browser errors:\n'+errors.join('\n'));
 process.exitCode=1;
}finally{
 await browser.close();
}
