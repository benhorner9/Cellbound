'use strict';
// Registration and authentication browser journeys against a deterministic
// Supabase fake. Never creates an account or sends an email on the real backend.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..','dist');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;

const sdk=String.raw`
(()=>{
  const state=window.__authMock={calls:[],signupMode:'verify',loginMode:'ok',
    resetMode:'ok',profileError:false,updateError:false};
  const user={id:'registration-test-user',email:'beta@example.test'};
  const fail=message=>({message});
  window.supabase={createClient:(_url,_key,options)=>{
    state.storage=options.auth.storage;
    const auth={
      async getSession(){state.calls.push(['getSession']);return{data:{session:null},error:null}},
      onAuthStateChange(handler){state.emit=(event,session)=>handler(event,session);return{data:{subscription:{unsubscribe(){}}}}},
      async signUp(input){
        state.calls.push(['signUp',input]);
        if(state.signupMode==='duplicate')return{data:{user:null,session:null},error:fail('User already registered')};
        if(state.signupMode==='error')return{data:{user:null,session:null},error:fail('Signup unavailable')};
        if(state.signupMode==='session'){
          const session={user};
          options.auth.storage.setItem('sb-test-auth-token',JSON.stringify(session));
          return{data:{user,session},error:null};
        }
        return{data:{user,session:null},error:null};
      },
      async signInWithPassword(input){
        state.calls.push(['signIn',input]);
        if(state.loginMode==='invalid')return{data:{user:null,session:null},error:fail('Invalid login credentials')};
        if(state.loginMode==='unconfirmed')return{data:{user:null,session:null},error:fail('Email not confirmed')};
        const session={user};
        options.auth.storage.setItem('sb-test-auth-token',JSON.stringify(session));
        return{data:{user,session},error:null};
      },
      async resetPasswordForEmail(email,options){
        state.calls.push(['reset',email,options]);
        return{error:state.resetMode==='error'?fail('Reset unavailable'):null};
      },
      async updateUser(value){
        state.calls.push(['updateUser',value]);
        return{error:state.updateError?fail('Password update failed'):null};
      }
    };
    return{auth,from(table){assert(table==='profiles');
      return{async upsert(value){state.calls.push(['profile',value]);
        return{error:state.profileError?fail('Profile insert blocked'):null};}};
    }};
  }};
})();
`;

async function main(){
  const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
  const errors=[];
  async function open(){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.on('pageerror',error=>errors.push(String(error)));
    await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({
      status:200,contentType:'application/javascript',body:sdk
    }));
    await page.route('https://cellbound.test/**',async route=>{
      const u=new URL(route.request().url());
      const relative=u.pathname.replace(/^\/+/,'')||'index.html';
      if(relative==='guild.html'){
        return route.fulfill({status:200,contentType:'text/html',body:'<h1 id="guild-ready">Guild ready</h1>'});
      }
      const target=path.resolve(root,relative);
      if(!target.startsWith(root+path.sep)||!fs.existsSync(target)){
        return route.fulfill({status:404,body:''});
      }
      return route.fulfill({path:target});
    });
    await page.goto('https://cellbound.test/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__authMock);
    return page;
  }
  const fill=async page=>{
    await page.locator('#email').fill('beta@example.test');
    await page.locator('#password').fill('StrongPassword123!');
  };
  const called=(page,name)=>page.evaluate(name=>window.__authMock.calls.filter(x=>x[0]===name),name);
  const message=page=>page.locator('#login-message').textContent();
  try{
    // Form validation rejects invalid inputs before any backend request.
    {
      const page=await open();
      await page.locator('#create-account').click();
      assert.match(await message(page),/valid email/i);
      await page.locator('#email').fill('beta@example.test');
      await page.locator('#password').fill('short');
      await page.locator('#create-account').click();
      assert.match(await message(page),/at least 12 characters/i);
      assert.equal((await called(page,'signUp')).length,0);
      await page.close();
    }
    // New unconfirmed accounts wait for verification and use this host.
    {
      const page=await open();
      await fill(page);
      await page.locator('#create-account').click();
      await page.waitForFunction(()=>window.__authMock.calls.some(x=>x[0]==='signUp'));
      const calls=await called(page,'signUp');
      assert.equal(calls[0][1].email,'beta@example.test');
      assert.equal(calls[0][1].options.emailRedirectTo,'https://cellbound.test/index.html');
      assert.match(await message(page),/Confirm the email/i);
      assert.equal((await called(page,'profile')).length,0,'unconfirmed user must not create profile from unauthenticated client');
      await page.evaluate(()=>window.__authMock.signupMode='duplicate');
      await page.locator('#create-account').click();
      assert.match(await message(page),/already has a Cellbound account/i);
      await page.close();
    }
    // Confirmed signup with a session must establish the profile before entry.
    {
      const page=await open();
      await fill(page);
      await page.evaluate(()=>window.__authMock.signupMode='session');
      await page.locator('#create-account').click();
      await page.waitForURL('https://cellbound.test/guild.html');
      assert.equal((await called(page,'profile')).length,1);
      const stored=await page.evaluate(()=>({
        local:localStorage.getItem('sb-test-auth-token'),
        session:sessionStorage.getItem('sb-test-auth-token')
      }));
      assert.equal(stored.local,null,'unchecked remember option must not persist auth into localStorage');
      assert(stored.session,'session storage must hold the sign-in token');
      await page.close();
    }
    // Password login communicates errors and saves a persistent session only if requested.
    {
      const page=await open();
      await fill(page);
      await page.evaluate(()=>window.__authMock.loginMode='invalid');
      await page.locator('#enter-button').click();
      assert.match(await message(page),/Email or password is incorrect/i);
      await page.evaluate(()=>window.__authMock.loginMode='unconfirmed');
      await page.locator('#enter-button').click();
      assert.match(await message(page),/Confirm your email/i);
      await page.evaluate(()=>window.__authMock.loginMode='ok');
      await page.locator('#remember-device').check();
      await page.locator('#enter-button').click();
      await page.waitForURL('https://cellbound.test/guild.html');
      assert.equal((await called(page,'profile')).length,1);
      const stored=await page.evaluate(()=>({
        local:localStorage.getItem('sb-test-auth-token'),
        session:sessionStorage.getItem('sb-test-auth-token')
      }));
      assert(stored.local,'remember device must persist the session in localStorage');
      assert.equal(stored.session,null);
      await page.close();
    }
    // Backend profile failures must be displayed instead of silently entering the game.
    {
      const page=await open();
      await fill(page);
      await page.evaluate(()=>window.__authMock.profileError=true);
      await page.locator('#enter-button').click();
      await page.waitForFunction(()=>document.querySelector('#login-message').textContent.includes('profile could not be prepared'));
      assert.equal(new URL(page.url()).pathname,'/index.html');
      await page.evaluate(()=>window.__authMock.profileError=false);
      await page.locator('#enter-button').click();
      await page.waitForURL('https://cellbound.test/guild.html');
      assert.equal((await called(page,'profile')).length,2);
      await page.close();
    }
    // Verification callback must enter the game without a redundant password request.
    {
      const page=await open();
      await page.evaluate(()=>window.__authMock.emit('SIGNED_IN',{user:{id:'registration-test-user',email:'beta@example.test'}}));
      await page.waitForURL('https://cellbound.test/guild.html');
      assert.equal((await called(page,'profile')).length,1);
      await page.close();
    }
    // Password reset email and actual recovery update are distinct operations.
    {
      const page=await open();
      await page.locator('#email').fill('beta@example.test');
      await page.locator('#forgot-password').click();
      const resets=await called(page,'reset');
      assert.equal(resets.length,1);
      assert.equal(resets[0][2].redirectTo,'https://cellbound.test/index.html');
      assert.match(await message(page),/Password reset email sent/i);
      await page.evaluate(()=>window.__authMock.emit('PASSWORD_RECOVERY',{user:{id:'registration-test-user'}}));
      await page.locator('#password').fill('short');
      await page.locator('#enter-button').click();
      assert.match(await message(page),/at least 12 characters/i);
      assert.equal((await called(page,'updateUser')).length,0);
      await page.locator('#password').fill('ChangedPassword123!');
      await page.locator('#enter-button').click();
      assert.equal((await called(page,'updateUser')).length,1);
      assert.match(await message(page),/Password updated/i);
      assert.equal(await page.locator('#password').inputValue(),'','new password must be cleared from the form');
      assert.equal((await page.locator('#enter-button span').textContent()).trim(),'ENTER ZELTIRA');
      await page.close();
    }
    assert.deepEqual(errors,[],'authentication journeys must not generate browser exceptions');
    console.log('Registration/browser flows passed in '+(engine===webkit?'WebKit':'Chromium')+
      ': validation, confirmation, immediate signup, login errors, persistent vs session auth, profile recovery, verification callback, and password reset.');
  }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
