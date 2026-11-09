/* B06 creation/identity browser regression: local branch and verified live shared host.
   Emulated WebKit and viewport tests do not substitute for physical Safari sign-off in B16. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium,webkit}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const ARTIFACTS=path.join(process.cwd(),'qa-artifacts-b06');
fs.mkdirSync(ARTIFACTS,{recursive:true});
const views=[
  {name:'desktop',viewport:{width:1440,height:900},isMobile:false,hasTouch:false,deviceScaleFactor:1},
  {name:'ipad-landscape',viewport:{width:1366,height:1024},isMobile:true,hasTouch:true,deviceScaleFactor:2},
  {name:'iphone-portrait',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}
];
const MIME={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json'};

function createServer(){
  const server=http.createServer((req,res)=>{
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch(e){res.writeHead(400);res.end();return;}
    const file=path.join(ROOT,pathname==='/'?'index.html':pathname);
    if(!file.startsWith(ROOT+path.sep)||!['index.html','game.js','match-engine.js','styles.css','save-transfer.html'].includes(path.relative(ROOT,file))){
      res.writeHead(404);res.end('Not Found');return;
    }
    fs.readFile(file,(err,data)=>{
      if(err){res.writeHead(404);res.end('Not Found');return;}
      res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'text/plain','Cache-Control':'no-store'});
      res.end(data);
    });
  });
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>resolve({server,url:'http://127.0.0.1:'+server.address().port+'/'}));
  });
}

async function assertScreen(page,label){
  const metrics=await page.evaluate(()=>({
    viewport:window.innerWidth,
    scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
    heading:document.querySelector('h1')?.textContent?.trim(),
    clubMark:document.querySelectorAll('.club-crest-own').length
  }));
  assert.ok(metrics.scrollWidth<=metrics.viewport+3,label+' document overflow: '+JSON.stringify(metrics));
  assert.ok(metrics.heading,label+' missing heading');
  return metrics;
}
async function click(page,action,value){
  const attr=value?'[data-value="'+value+'"]':'';
  await page.locator('button[data-action="'+action+'"]'+attr).first().click();
}
async function browserCase(engine,view,base){
  const browser=await engine.launch({headless:true});
  const ctx=await browser.newContext({viewport:view.viewport,isMobile:view.isMobile,hasTouch:view.hasTouch,
    deviceScaleFactor:view.deviceScaleFactor,locale:'en-GB',timezoneId:'Europe/London'});
  const page=await ctx.newPage(),name=engine.name()+'-'+view.name,errors=[];
  page.setDefaultTimeout(12000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{Math.random=()=>0.53;});
  try{
    const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(response?.status(),200,'B06 game page unavailable');
    await page.locator('#club-create-name').waitFor();
    await page.locator('#club-create-name').fill('Tactic Lane FC');
    await click(page,'creator-next');await click(page,'creator-next');await click(page,'create-club');
    await page.locator('.fm-header-club').waitFor();
    await page.locator('[data-tab="tactics"]').first().click();
    await page.locator('.tactical-pitch').waitFor();
    assert.equal(await page.locator('.tactical-pitch-position').count(),5);
    assert.match(await page.locator('.tactical-formation').innerText(),/1-2-1/);
    assert.match(await page.locator('.tactical-role-board').innerText(),/Individual roles/);
    assert.match(await page.locator('.tactical-approach').innerText(),/ATTACK CHANCE/);
    assert.match(await page.locator('.tactical-absence').innerText(),/If losing from minute 10/);
    assert.match(await page.locator('.tactical-absence').innerText(),/If winning from minute 14/);
    assert.ok(await page.locator('#role-assign-GK').isDisabled());
    await assertScreen(page,name+' initial tactics');
    await page.screenshot({path:path.join(ARTIFACTS,name+'-tactical-pitch-121.png'),fullPage:true});

    await click(page,'formation','2-1-1');
    assert.equal(await page.locator('.tactical-pitch-position').count(),5);
    assert.match(await page.locator('.tactical-formation').innerText(),/Left defender/);
    assert.ok(await page.locator('#role-assign-BACK_L').isVisible());
    await assertScreen(page,name+' defensive formation');
    await page.screenshot({path:path.join(ARTIFACTS,name+'-formation-211.png'),fullPage:true});
    await click(page,'formation','1-1-2');
    assert.equal(await page.locator('.tactical-pitch-position').count(),5);
    assert.ok(await page.locator('#role-assign-FRONT_R').isVisible());
    assert.match(await page.locator('.tactical-formation').innerText(),/Left attacker/);
    await assertScreen(page,name+' attacking formation');
    await page.screenshot({path:path.join(ARTIFACTS,name+'-formation-112.png'),fullPage:true});
    await click(page,'formation','1-2-1');

    const left=await page.locator('#role-assign-MID_L').inputValue();
    const right=await page.locator('#role-assign-MID_R').inputValue();
    assert.notEqual(left,right);
    await page.locator('#role-assign-MID_L').selectOption(right);
    assert.equal(await page.locator('#role-assign-MID_L').inputValue(),right);
    assert.equal(await page.locator('#role-assign-MID_R').inputValue(),left);
    const roleSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('five-aside-manager-alpha-v1')));
    assert.equal(roleSave.roleAssignments['1-2-1'].MID_L,Number(right));
    assert.equal(new Set(Object.values(roleSave.roleAssignments['1-2-1'])).size,5);

    const beforeForecast=await page.locator('.tactical-forecast').innerText();
    await click(page,'style','press');
    const pressedForecast=await page.locator('.tactical-forecast').innerText();
    assert.notEqual(beforeForecast,pressedForecast);
    await click(page,'style','counter');
    const counterForecast=await page.locator('.tactical-forecast').innerText();
    assert.notEqual(pressedForecast,counterForecast);
    await click(page,'style','balanced');
    await click(page,'plan','balanced');
    await click(page,'planBehind','counter');
    await click(page,'planAhead','press');
    await click(page,'autoSubPolicy','rotate');
    assert.match(await page.locator('.tactical-absence').innerText(),/Unattended substitutions/);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('five-aside-manager-alpha-v1')));
    assert.equal(saved.planBehind,'counter');
    assert.equal(saved.planAhead,'press');
    assert.equal(saved.autoSubPolicy,'rotate');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.tactical-role-board').waitFor();
    assert.equal(await page.locator('#role-assign-MID_L').inputValue(),right);
    assert.equal(await page.locator('#role-assign-MID_R').inputValue(),left);
    assert.match(await page.locator('.tactical-absence').innerText(),/Automatic match plan/);
    await assertScreen(page,name+' persisted tactics');

    await click(page,'go-training');
    await page.locator('.training-b06-room').waitFor();
    assert.match(await page.locator('.training-b06-impact').innerText(),/Training impact preview/);
    assert.equal(await page.locator('.training-impact-row').count(),9);
    const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('five-aside-manager-alpha-v1')));
    await click(page,'training-preview','finishing');
    assert.match(await page.locator('.training-b06-impact').innerText(),/FINISHING/);
    const preview=await page.evaluate(()=>JSON.parse(localStorage.getItem('five-aside-manager-alpha-v1')));
    assert.equal(preview.money,before.money);
    assert.equal(preview.roster[3].attributes.finishing,before.roster[3].attributes.finishing);
    await assertScreen(page,name+' training preview');
    await page.screenshot({path:path.join(ARTIFACTS,name+'-training-preview.png'),fullPage:true});

    await click(page,'train','finishing');
    const trained=await page.evaluate(()=>JSON.parse(localStorage.getItem('five-aside-manager-alpha-v1')));
    assert.equal(trained.money,before.money-12);
    assert.equal(trained.training['1:0'],'finishing');
    assert.equal(trained.trainingReports['1:0'].players.length,9);
    assert.ok(trained.developmentHistory['4']?.some(entry=>entry.source==='Training: finishing'));
    assert.match(await page.locator('.training-b06-report').innerText(),/Completed session report/);
    assert.match(await page.locator('.training-b06-report').innerText(),/XP/);
    await assertScreen(page,name+' completed training');
    await page.screenshot({path:path.join(ARTIFACTS,name+'-training-actual-report.png'),fullPage:true});
    assert.ok(await page.locator('button[data-action="train"][data-value="fitness"]').isDisabled());

    await page.locator('[data-tab="fixtures"]').first().click();
    await page.evaluate(()=>{Math.random=()=>0.01;});
    await click(page,'start-auto');
    await page.locator('.tactical-match-summary').waitFor();
    assert.match(await page.locator('.tactical-match-summary').innerText(),/CURRENT APPROACH/);
    assert.match(await page.locator('.tactical-match-summary').innerText(),/High press/);
    assert.match(await page.locator('.log').innerText(),/Saved plan: High press activated/);
    await assertScreen(page,name+' offline conditional plan');
    await page.screenshot({path:path.join(ARTIFACTS,name+'-offline-saved-plan.png'),fullPage:true});
    // Force only scoring while testing the conditional plan; restore normal
    // injury odds before the end-of-match settlement and next fixture.
    await page.evaluate(()=>{Math.random=()=>0.53;});
    await click(page,'finish');
    const ended=await page.evaluate(()=>JSON.parse(localStorage.getItem('five-aside-manager-alpha-v1')));
    assert.equal(ended.round,1);
    assert.equal(ended.tacticalReports['1:0'].startingPlan,'balanced');
    assert.equal(ended.tacticalReports['1:0'].rotationPolicy,'rotate');
    assert.ok(ended.tacticalReports['1:0'].phases.some(p=>p.approach==='press'&&p.minute>=14));
    assert.equal(ended.tacticalReports['1:0'].initialRoles.MID_L,Number(right));
    assert.equal(ended.trainingReports['1:0'].players.length,9);

    await page.locator('[data-tab="tactics"]').first().click();
    assert.match(await page.locator('.tactical-recap').innerText(),/Previous match tactical report/);
    assert.match(await page.locator('.tactical-recap').innerText(),/High press/);
    await assertScreen(page,name+' persisted tactical report');
    await page.screenshot({path:path.join(ARTIFACTS,name+'-tactical-recap.png'),fullPage:true});

    await page.locator('[data-tab="fixtures"]').first().click();
    await click(page,'start-live');
    await page.locator('.match-bench').waitFor();
    assert.match(await page.locator('.tactical-match-summary').innerText(),/CURRENT APPROACH/);
    await click(page,'push');
    assert.match(await page.locator('.tactical-match-summary').innerText(),/Push forward/);
    await page.locator('.match-sub-person[data-action="sub-off"][data-player="4"]').click();
    await page.locator('.match-sub-person[data-action="sub-on"][data-player="6"]').click();
    assert.match(await page.locator('.log').innerText(),/Substitution:/);
    await assertScreen(page,name+' live tactics and bench');

    // The existing alpha intentionally does not restore uncompleted live matches after reload.
    await page.evaluate(()=>{
      const key='five-aside-manager-alpha-v1',data=JSON.parse(localStorage.getItem(key));
      data.tab='training';localStorage.setItem(key,JSON.stringify(data));
    });
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.training-b06-room').waitFor();
    const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('five-aside-manager-alpha-v1')));
    assert.equal(persisted.club,'Tactic Lane FC');
    assert.equal(persisted.roleAssignments['1-2-1'].MID_L,Number(right));
    assert.deepEqual(persisted.trainingReports['1:0'],ended.trainingReports['1:0']);
    assert.deepEqual(persisted.tacticalReports['1:0'],ended.tacticalReports['1:0']);
    assert.deepEqual(errors,[],name+' page JavaScript errors');
    console.log('PASS',name,'three formations, manual roles, tactics risks, offline conditions, training finances/XP, stats, save reload, no overflow');
  }catch(err){
    await page.screenshot({path:path.join(ARTIFACTS,name+'-ERROR.png'),fullPage:true}).catch(()=>{});
    console.error('FAIL',name,err.stack||err,JSON.stringify(errors));
    throw err;
  }finally{await ctx.close();await browser.close();}
}
(async()=>{
  const local=process.env.B06_BASE_URL?null:await createServer();
  const base=process.env.B06_BASE_URL||local.url;
  const results=[];
  try{
    for(const engine of [chromium,webkit]){
      for(const view of views){
        try{await browserCase(engine,view,base);results.push({engine:engine.name(),viewport:view.name,pass:true});}
        catch(e){results.push({engine:engine.name(),viewport:view.name,pass:false,reason:e.message});}
      }
    }
  }finally{if(local)await new Promise(resolve=>local.server.close(resolve));}
  const passed=results.filter(r=>r.pass).length;
  console.log('B06 QA SUMMARY',JSON.stringify({base,passed,total:results.length,results}));
  if(passed!==results.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
