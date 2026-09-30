const {chromium,webkit}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;

(async()=>{
  const browser=await engine.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({
    status:200,
    contentType:'application/javascript',
    body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>({data:{user:null},error:null}),signUp:async()=>({data:{session:null,user:null},error:null}),resetPasswordForEmail:async()=>({error:null}),updateUser:async()=>({error:null})},from:()=>({upsert:async()=>({error:null})})})};"
  }));
  await page.route('https://cellbound.test/**',async route=>{
    const u=new URL(route.request().url()),relative=u.pathname.replace(/^\/+/,'')||'index.html';
    const file=path.resolve(root,'dist',relative);
    if(!file.startsWith(path.resolve(root,'dist')+path.sep)||!fs.existsSync(file)){
      await route.fulfill({status:404,body:''});return;
    }
    await route.fulfill({path:file});
  });

  await page.goto('https://cellbound.test/index.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.brand-lockup b').textContent(),'CELLBOUND');
  assert.equal(await page.locator('.gate-panel h2').textContent(),'Return to your guild');
  assert.equal(await page.locator('#enter-button span').textContent(),'ENTER ZELTIRA');
  assert(await page.locator('.login-world img').evaluate(img=>img.complete&&img.naturalWidth>0),'login world artwork loads');
  assert(await page.locator('#email').isVisible(),'email field is visible');
  assert(await page.locator('#password').isVisible(),'password field is visible');
  assert(await page.locator('#create-account').isVisible(),'create account action is visible');

  const panel=await page.locator('.gate-panel').boundingBox();
  assert(panel&&panel.x>=0&&panel.x+panel.width<=1024,'desktop login panel stays in viewport');

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(100);
  const mobilePanel=await page.locator('.gate-panel').boundingBox();
  assert(mobilePanel&&mobilePanel.x>=0&&mobilePanel.x+mobilePanel.width<=390,'mobile login panel stays in viewport');
  assert(await page.locator('.world-intro h1').isVisible(),'mobile world title remains visible');

  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/cellbound-login-screen.png',fullPage:true});
  await browser.close();
  console.log('Cellbound login screen regression passed: artwork, auth controls, desktop and mobile layout.');
})().catch(e=>{console.error(e);process.exit(1)});