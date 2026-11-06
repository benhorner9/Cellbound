import { chromium } from 'playwright';
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
 assert.deepEqual(errors,[]);
 console.log('PASS hosted navigation, 7 screens, week processing, browser persistence:',target);
}finally{await browser.close();}
