import {chromium} from 'playwright';

const BASE='https://playcellbound.com/bannerandbone';
const errors=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:2});
page.on('pageerror',e=>errors.push('Page error: '+e.message));
page.on('console',m=>{
  if(m.type()==='error' && /module|script|mime|import|Failed to load|SyntaxError/i.test(m.text()))errors.push('Console error: '+m.text());
});
page.on('response',r=>{
  const u=r.url();
  if(/\/bannerandbone\/src\/.*\.js(\?|$)/.test(u)){
    const type=r.headers()['content-type']||'';
    if(!/javascript|ecmascript/i.test(type))errors.push('Module MIME '+type+' for '+u);
    if(!r.ok())errors.push('Module HTTP '+r.status()+' for '+u);
  }
});
try{
  await page.goto(BASE+'/?check='+process.env.GITHUB_SHA,{waitUntil:'networkidle',timeout:35000});
  await page.locator('#enterArena').click();
  await page.waitForURL(/\/bannerandbone\/arena\.html/,{timeout:20000});
  const record=page.locator('#partyStatus');
  await record.waitFor({timeout:20000});
  if(!/Four heroes ready/.test(await record.innerText()))throw Error('Arena module failed to load four-hero party');
  const link=page.locator('[data-profile="balanced"] a');
  if(!(await link.getAttribute('href'))?.includes('opponent=balanced'))throw Error('AI sparring link missing');
  await link.click();
  await page.waitForURL(/\/bannerandbone\/combat\.html\?opponent=balanced/,{timeout:20000});
  await page.locator('.fighter').first().waitFor({state:'visible',timeout:20000});
  if(await page.locator('.fighter').count()!==8)throw Error('Fight scene did not render eight fighters');
  await page.locator('.fighter[data-hero-id="p0"]').click();
  await page.getByRole('button',{name:/Shield Bash/}).click();
  await page.locator('.fighter[data-hero-id="e0"]').click();
  if(!(await page.locator('#queue').innerText()).includes('Shield Bash'))throw Error('Combat action was not queued');
  await page.getByRole('button',{name:'Lock in round'}).click();
  if(await page.locator('#round').innerText()!=='2')throw Error('Turn resolution did not advance to round 2');
  if(!(await page.locator('#roundRecap').innerText()).includes('hits'))throw Error('Tactical recap not shown');
  await page.getByRole('button',{name:'Rematch AI'}).click();
  if(await page.locator('#round').innerText()!=='1')throw Error('Rematch did not restart battle');
  await page.locator('#backArena').click();
  await page.waitForURL(/\/bannerandbone\/arena\.html/);
  await page.locator('#partyStatus').waitFor();
  if(errors.length)throw Error(errors.join('\n'));
  console.log('PASS: real hosted iPad-size touch-browser flow — town -> Arena -> combat -> target -> round -> rematch -> Arena');
}catch(e){
  console.error('FAILED LIVE ARENA BROWSER CHECK:',e.stack||e);
  if(errors.length)console.error(errors.join('\n'));
  process.exitCode=1;
}finally{await browser.close();}
