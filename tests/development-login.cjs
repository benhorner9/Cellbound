'use strict';
const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('supabase/functions/development-account/index.ts','utf8').replace(/Deno\.env\.get\(('([^']+)')\)!/g,'Deno.env.get($1)');
(async()=>{
 let handler,requests=[],confirmed=true;
 vm.runInNewContext(source,{Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://zrvehixcthljiktcctne.supabase.co':'private-test-key'},serve:f=>handler=f},Response,JSON,Error,encodeURIComponent,fetch:async(url,options={})=>{
 requests.push({url,options});const token=options.headers.Authorization;
 if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:'official-user',email:'player@example.com',email_confirmed_at:confirmed?'2026-01-01':null}),{status:token==='Bearer valid-official'?200:401});
 if(url.includes('guild_accounts?'))return Response.json([{game_state:{gold:50},guild_name:'Test Guild'}]);
 if(url.endsWith('generate_link'))return Response.json({id:'dev-user',hashed_token:'one-use-token',email:'player@example.com'});
 if(url.includes('/rpc/')){const body=JSON.parse(options.body);assert.equal(body.p_user,'dev-user');assert.equal(body.p_source,'official-user');assert.deepEqual(body.p_state,{gold:50});return Response.json({copied:true});}
 if(url.endsWith('/verify')){assert.equal(JSON.parse(options.body).token_hash,'one-use-token');return Response.json({access_token:'dev-token',refresh_token:'dev-refresh'});}
 throw Error('Unexpected network request');
 }});
 const req=(token,origin='https://cb.athleticsmanagergame.com')=>new Request('https://dev/functions/v1/development-account',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token},body:JSON.stringify({email:'victim@example.com',user_id:'victim'})});
 assert.equal((await handler(req('valid-official','https://evil.test'))).status,403);assert.equal(requests.length,0);
 assert.equal((await handler(req('dev-token'))).status,401);
 confirmed=false;assert.equal((await handler(req('valid-official'))).status,409);confirmed=true;
 const result=await handler(req('valid-official'));assert.equal(result.status,200);assert.equal((await result.json()).session.access_token,'dev-token');
 assert(requests.filter(r=>r.url.startsWith('https://jvydqeik')).every(r=>!r.options.method||r.options.method==='GET'));
 assert(requests.filter(r=>r.url.endsWith('generate_link')).every(r=>JSON.parse(r.options.body).email==='player@example.com'));
 console.log('PASS: dev copy validates official identity, rejects dev/invalid sessions and unconfirmed emails, uses raw Auth link response correctly, ignores caller identity claims, makes no official writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
