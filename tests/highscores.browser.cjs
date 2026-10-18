'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
(async()=>{
 const b=await (process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 try{
  const page=await b.newPage({viewport:{width:820,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent('<div id="highscores"></div>');
  await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'../dist/highscores-v1.css'),'utf8')});
  await page.evaluate(()=>{
   window.requests=[];
   window.supabase={createClient:()=>({from:table=>{
    window.requests.push({table,filters:[],orders:[]});
    const request=window.requests.at(-1);
    const api={
     select(keys){request.columns=keys;return api},
     eq(key,value){request.filters.push({key,value});request.category=value;return api},
     order(key,options){request.orders.push({key,options});return api},
     limit(n){request.limit=n;return Promise.resolve({data:request.category==='Alchemy'?[
      {guild_name:'Apothecaries',character_name:'Amber',profession:'Alchemy',level:30,xp:190},
     ]:[
      {guild_name:'B Guild',character_name:'Hephaestus',profession:'Blacksmithing',level:19,xp:90},
      {guild_name:'A Guild',character_name:'<img src=x onerror=alert(1)>',profession:'Blacksmithing',level:20,xp:2},
      {guild_name:'Z Guild',character_name:'Bronzebeard',profession:'Blacksmithing',level:20,xp:45}
     ],error:null})}
    };return api;
   }})};
  });
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../dist/highscores-v1.js'),'utf8')});
  await page.evaluate(()=>window.CellboundHighScores.mount('#highscores'));
  await page.waitForSelector('.hs-table tbody tr');
  assert.equal(await page.locator('.hs-table tbody tr').count(),3);
  assert((await page.locator('.hs-table tbody tr').first().innerText()).includes('Bronzebeard'),'level ties sort by higher XP');
  assert.equal(await page.locator('.hs-table img').count(),0,'unsafe account-provided names escaped');
  assert((await page.locator('.hs-table tbody tr').nth(1).innerText()).includes('<img src=x onerror=alert(1)>'),'escaped name stays visible as text');
  const request=await page.evaluate(()=>window.requests[0]);
  assert.equal(request.table,'cellbound_profession_highscores');
  assert.deepEqual(request.orders.map(x=>x.key),['level','xp','guild_name','character_name']);
  assert.equal(request.limit,100);
  assert.equal(request.columns,'guild_name,character_name,profession,level,xp,updated_at','no account IDs or private saves fetched');
  await page.selectOption('[data-hs-category]','Alchemy');
  await page.waitForFunction(()=>document.querySelector('.hs-table tbody tr')?.innerText?.includes('Amber'));
  assert.equal(await page.locator('.hs-table tbody tr').count(),1);
  await page.click('[data-hs-refresh]');
  await page.waitForFunction(()=>window.requests.length>=3);
  const publicPage=fs.readFileSync(path.join(__dirname,'../dist/highscores.html'),'utf8');
  assert(publicPage.includes('window.CellboundHighScores?.mount(\'#publicHighScores\')'));
  assert.deepEqual(errors,[]);
  console.log('High Scores UI passed in browser: safe names, level/XP ordering, filtering, refresh and public page.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
