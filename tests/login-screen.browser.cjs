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
    body:"window.__authCalls=[];window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async args=>{window.__authCalls.push(['signIn',args]);return{data:{user:null},error:null}},signUp:async args=>{window.__authCalls.push(['signUp',args]);return{data:{session:null,user:null},error:null}},resetPasswordForEmail:async(email,options)=>{window.__authCalls.push(['reset',email,options]);return{error:null}},updateUser:async()=>({error:null})},from:()=>({upsert:async()=>({error:null})})})};"
  }));
  await page.route('https://cellbound.test/**',async route=>{
    const u=new URL(route.request().url()),relative=u.pathname.replace(/^\/+/,'')||'index.html';
    if(relative==='auth-test.html'){
      await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body><p id="login-intro">Sign in to continue your guild.</p><form id="login-form"><input id="email" type="email"><input id="password" type="password"><label><input id="remember-device" type="checkbox"></label><button id="enter-button" type="submit"><span>ENTER ZELTIRA</span></button></form><button id="create-account" type="button">CREATE</button><button id="forgot-password" type="button">FORGOT</button><button id="toggle-password" type="button">Show</button><p id="login-message" hidden></p><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="./auth.js"></script></body></html>'});return;
    }
    const file=path.resolve(root,'dist',relative);
    if(!file.startsWith(path.resolve(root,'dist')+path.sep)||!fs.existsSync(file)){
      await route.fulfill({status:404,body:''});return;
    }
    await route.fulfill({path:file});
  });

  await page.goto('https://cellbound.test/index.html',{waitUntil:'networkidle'});
  assert.equal((await page.locator('.coming-soon-kicker').textContent()).trim(),'CELLBOUND');
  assert.equal((await page.locator('.coming-soon-card h1').textContent()).trim(),'Coming Soon');
  assert((await page.locator('.coming-soon-card').innerText()).includes('The gates of Zeltira are being prepared.'),'public gate explains the current release state');
  assert.equal((await page.locator('.coming-soon-note').textContent()).trim(),'Founding Season');
  assert(await page.locator('.coming-soon-world img').evaluate(img=>img.complete&&img.naturalWidth>0),'Coming Soon world artwork loads');

  const panel=await page.locator('.coming-soon-card').boundingBox();
  assert(panel&&panel.x>=0&&panel.x+panel.width<=1024,'desktop Coming Soon card stays in viewport');

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(100);
  const mobilePanel=await page.locator('.coming-soon-card').boundingBox();
  assert(mobilePanel&&mobilePanel.x>=0&&mobilePanel.x+mobilePanel.width<=390,'mobile Coming Soon card stays in viewport');
  assert(await page.locator('.coming-soon-card h1').isVisible(),'mobile Coming Soon title remains visible');

  const authPage=await browser.newPage({viewport:{width:390,height:844}});
  const authErrors=[];authPage.on('pageerror',e=>authErrors.push(String(e)));
  await authPage.goto('https://cellbound.test/auth-test.html',{waitUntil:'networkidle'});
  await authPage.locator('#email').fill('beta@example.test');
  await authPage.locator('#password').fill('StrongPassword123!');
  await authPage.locator('#create-account').click();
  await authPage.waitForFunction(()=>window.__authCalls?.some(x=>x[0]==='signUp'));
  const signUpCall=await authPage.evaluate(()=>window.__authCalls.find(x=>x[0]==='signUp'));
  assert.equal(signUpCall[1].options.emailRedirectTo,'https://cellbound.test/index.html','verification email returns to the current Cellbound host');
  await authPage.locator('#forgot-password').click();
  await authPage.waitForFunction(()=>window.__authCalls?.some(x=>x[0]==='reset'));
  const resetCall=await authPage.evaluate(()=>window.__authCalls.find(x=>x[0]==='reset'));
  assert.equal(resetCall[2].redirectTo,'https://cellbound.test/index.html','password reset email returns to the current Cellbound host');
  assert.deepEqual(authErrors,[],'auth email redirect harness emitted no browser errors');
  await authPage.close();

  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/cellbound-login-screen.png',fullPage:true});
  await browser.close();
  console.log('Cellbound public/auth regression passed: holding-page layout plus verification and password-reset return URLs.');
})().catch(e=>{console.error(e);process.exit(1)});