'use strict';
const assert=require('node:assert/strict');
const {createHandler}=require('../server/episodes/opening-http.cjs');
const {createStore,seed,PLAYER,OTHER}=require('../tools/morrowfields-test-store.cjs');
(async()=>{
 const {db,proof,rpc}=await createStore();await proof(PLAYER);let authCalls=0;
 const fetcher=async(url,options)=>{
  if(url.endsWith('/auth/v1/user')){authCalls++;return options.headers.Authorization==='Bearer valid-token'?{ok:true,json:async()=>({id:PLAYER})}:{ok:false,json:async()=>({error:'invalid'})};}
  const data=JSON.parse(options.body),name=url.split('/').pop();
  try{return{ok:true,json:async()=>await rpc(name,Object.values(data))}}catch(e){return{ok:false,json:async()=>({message:e.message})}}
 };
 const handler=createHandler({backend:'https://isolated-test.supabase.co',key:'test-private-credential',origin:'https://cellbound.test',fetcher});
 async function request(body,authorization='Bearer valid-token',origin='https://cellbound.test'){
  const req={method:'POST',url:'/opening',headers:{origin,authorization},async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(body))}};
  let status,out;const headers={};const res={setHeader:(k,v)=>headers[k]=v,writeHead:s=>status=s,end:v=>out=v};
  await handler(req,res);return{status,out:out?JSON.parse(out):null,headers};
 }
 try{
  assert.equal((await request({action:'start',build:'local-dev',revision:0,userId:OTHER})).status,200);
  const own=(await rpc('cellbound_opening_load',[PLAYER])).account.state;
  const other=(await rpc('cellbound_opening_load',[OTHER])).account.state;
  assert(own.episode2.quests.e2_q01);assert.equal(other.episode2,undefined,'Body cannot choose another account');
  assert.equal((await request({action:'load',build:'local-dev'},'Bearer forged-token')).status,409);
  assert.equal((await request({},'','https://cellbound.test')).status,409);
  assert.equal((await request({},'Bearer valid-token','https://untrusted.test')).status,403);
  const r=await request({action:'load',build:'local-dev'});assert.equal(r.status,200);assert.equal(r.headers['Cache-Control'],'no-store');assert.equal(r.headers['Access-Control-Allow-Origin'],'https://cellbound.test');
  assert.equal((await request({payload:'x'.repeat(17000)})).status,409);assert(authCalls>=4);
  console.log('Morrowfields HTTP PASS: authenticated identity overrides forged body account; invalid/missing credentials, foreign origin and oversized payload denied; responses not cached. Local Auth fixture, not hosted JWT acceptance.');
 }finally{await db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
