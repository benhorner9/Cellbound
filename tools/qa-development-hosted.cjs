'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const origin='https://cb.athleticsmanagergame.com',session=JSON.parse(fs.readFileSync(process.env.CELLBOUND_QA_SESSION||'/tmp/cellbound-dev-session.json','utf8'));
(async()=>{const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1366,height:1024}});const errors=[];
await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.min.js',r=>r.fulfill({path:'/tmp/cb-supabase.min.js',contentType:'application/javascript'}));
await page.route('https://zrvehixcthljiktcctne.supabase.co/**',async route=>{const request=route.request();try{if(request.url().includes('/functions/'))console.log('WORKER START',JSON.parse(request.postData()||'{}').action);const response=await fetch(request.url(),{method:request.method(),headers:request.headers(),body:request.postDataBuffer()||undefined});const body=Buffer.from(await response.arrayBuffer());if(request.url().includes('/functions/'))console.log('WORKER DONE',response.status);if(response.status>=400)console.log('HTTP',response.status,request.url().split('?')[0],body.toString().slice(0,500));await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body});}catch(e){console.log('NETWORK',e.message);await route.abort();}});

page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.stack)});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200))});
if(!process.env.CELLBOUND_QA_DEPLOYED)await page.route(origin+'/**',async route=>{const p=new URL(route.request().url()).pathname.replace(/^\//,'')||'index.html';const file=path.resolve('dist',p);if(!file.startsWith(path.resolve('dist')+'/')||!fs.existsSync(file))return route.abort();await route.fulfill({path:file});});
await page.addInitScript(s=>{localStorage.setItem('cellbound-remember-device','1');localStorage.setItem('sb-zrvehixcthljiktcctne-auth-token',JSON.stringify(s));},session);
try{
await page.goto(origin+'/guild.html',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.CellboundGame?.ready,{timeout:60000});
console.log('Game ready');await page.evaluate(()=>CellboundGame.switchView('quests'));
await Promise.race([page.evaluate(()=>CellboundNullStory.open()),new Promise((_,reject)=>setTimeout(()=>reject(Error('Story open timed out')),20000))]);
const click=async(sel)=>{await page.locator(sel).first().click();await page.waitForFunction(()=>!document.querySelector('#verified-null-story[aria-busy],#morrowfields[aria-busy]'),{timeout:240000});};
await page.waitForSelector('#verified-null-story:not([aria-busy])');
for(let i=0;i<24;i++){
 const dialog=page.locator('#verified-null-story');
 const error=await dialog.locator('[role="alert"]').count()?await dialog.locator('[role="alert"]').textContent():null;if(error)throw Error(error);
 if(await dialog.locator('[data-null-story="opening"]').count())break;
 if(await dialog.locator('[data-null-story="fight"]').count()){
 console.log('Fight',await dialog.locator('h3').textContent());await page.locator('[data-null-story="fight"]').click();
 await page.waitForSelector('#verified-null-story[open]:not([aria-busy])',{timeout:240000});
 }else if(await dialog.locator('[data-null-story="choice"]').count()){
 const title=await dialog.locator('h3').textContent();await click('[data-null-story="choice"][data-choice="'+(title.includes('Cable')?1:0)+'"]');
 }else await click('[data-null-story="panel"]');
}
console.log('Trusted finale complete');await click('[data-null-story="opening"]');await page.waitForSelector('#morrowfields[open]:not([aria-busy])');
while(await page.locator('[data-mf="intro-panel"]').count())await click('[data-mf="intro-panel"]');if(await page.locator('[data-mf="briefing"]').count())await click('[data-mf="briefing"]');
fs.mkdirSync('docs/qa/development',{recursive:true});await page.screenshot({path:'docs/qa/development/hosted-map.jpg',quality:80});
if(await page.locator('[data-mf="location"][data-location="fenstead"]').count())await click('[data-mf="location"][data-location="fenstead"]');if(await page.locator('[data-mf="meet-mara"]').count())await click('[data-mf="meet-mara"]');if(await page.locator('[data-mf="visit"][data-location="east-fields"]').count())await click('[data-mf="visit"][data-location="east-fields"]');if(await page.locator('[data-mf="visit"][data-location="wagon"]').count())await click('[data-mf="visit"][data-location="wagon"]');
for(const clue of ['tracks','container','soil','device'])await click('[data-mf="clue"][data-clue="'+clue+'"]');
await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>CellboundGame?.ready);await page.evaluate(()=>CellboundMorrowfields.open());await page.waitForSelector('[data-mf="fight"]');console.log('Reload persisted clues');
await page.locator('[data-mf="fight"]').click();await page.waitForSelector('#morrowfields[open]:not([aria-busy])',{timeout:240000});
const err=await page.locator('#morrowfields [role="alert"]').count()?await page.locator('#morrowfields [role="alert"]').textContent():null;if(err)throw Error(err);
await click('[data-mf="recover"]');await click('[data-mf="closing"]');for(let i=0;i<3;i++)await click('[data-mf="outro-panel"]');
await page.screenshot({path:'docs/qa/development/hosted-complete.jpg',quality:80});
const state=await page.evaluate(()=>CellboundGame.getState());assert(state.episode2.quests.e2_q01.complete);assert(state.roster.every(c=>c.level===16));assert.equal(state.gold,5330);assert(state.questSystem.nullComplex.authoritative);
await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>CellboundGame?.ready);assert(await page.evaluate(()=>CellboundGame.getState().episode2.quests.e2_q01.complete));assert.equal(errors.length,0);
console.log('HOSTED PASS: real Auth, database, canonical combat verifier, full finale and chapter, reload, level 16, 150+180 gold.');
}catch(e){await page.screenshot({path:'/tmp/cb-hosted-failure.png'});console.error(e);process.exitCode=1;}finally{await browser.close();}
})();
