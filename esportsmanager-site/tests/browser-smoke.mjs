import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const oldSave=JSON.parse(readFileSync(new URL('./fixtures/starter-v1-founder-week3.json',import.meta.url),'utf8'));
import assert from 'node:assert/strict';
const target=process.env.ESPORTS_URL||'https://playcellbound.com/esportsmanager/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto(target,{waitUntil:'networkidle',timeout:40000});
 await page.getByRole('button',{name:/Create Organisation/i}).click();
 await page.getByRole('heading',{name:/Headquarters/i}).waitFor();
 for(const [name,heading] of [['Esports','Esports Operations'],['Creators','Creator Studio'],['Content','Content Production'],['Merch','Merchandise Studio'],['Sponsors','Commercial Office'],['Operations','Business Operations']]){
  await page.getByRole('navigation',{name:'Game navigation'}).getByRole('button',{name,exact:true}).click();
  await page.getByRole('heading',{name:heading}).waitFor();
 }
 await page.getByRole('navigation',{name:'Game navigation'}).getByRole('button',{name:'HQ',exact:true}).click();
 await page.getByRole('button',{name:/Advance to Next Week/i}).click();
 await page.getByRole('dialog',{name:/Week 1 — Executive Report/i}).waitFor();
 await page.getByRole('button',{name:'Close'}).last().click();
 await page.reload({waitUntil:'networkidle'});
 await page.getByText('Week 2').first().waitFor();
 // A real v1 founder save must still open, simulate, and persist in the hosted UI.
 const legacy=await browser.newPage({viewport:{width:1180,height:820}});
 legacy.on('pageerror',e=>errors.push('Legacy save: '+String(e)));
 await legacy.goto(target,{waitUntil:'networkidle',timeout:40000});
 await legacy.evaluate(save=>localStorage.setItem('esports-empire-save-v1',JSON.stringify(save)),oldSave);
 await legacy.reload({waitUntil:'networkidle'});
 await legacy.getByRole('heading',{name:/Headquarters/i}).waitFor();
 assert.match(await legacy.locator('.top-week').innerText(),/Week 3/);
 assert.match(await legacy.locator('body').innerText(),/Baseline United/);
 await legacy.getByRole('button',{name:/Advance to Next Week/i}).click();
 await legacy.getByRole('dialog',{name:/Week 3 — Executive Report/i}).waitFor();
 await legacy.getByRole('button',{name:'Close'}).last().click();
 const continued=await legacy.evaluate(()=>JSON.parse(localStorage.getItem('esports-empire-save-v1')));
 assert.equal(continued.week,4);
 assert.equal(continued.org,'Baseline United');
 assert.equal(continued.weeklyRecords.length,3);
 // Corrupted JSON with a known version must never crash the management screens.
 await legacy.evaluate(()=>localStorage.setItem('esports-empire-save-v1',JSON.stringify({version:1,cash:123,players:[],creators:[],weeklyRecords:[]})));
 await legacy.reload({waitUntil:'networkidle'});
 await legacy.getByRole('heading',{name:/Founder Journey/i}).waitFor();
 await legacy.close();
 assert.deepEqual(errors,[]);
 console.log('PASS hosted navigation, 7 screens, week processing, browser persistence:',target);
}catch(err){console.error('Browser page errors:',errors);console.error('Current page content:',(await page.locator('body').innerText()).slice(0,1400));throw err;}finally{await browser.close();}
