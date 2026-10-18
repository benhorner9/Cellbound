'use strict';
/* Hosted Node entry point. No credentials or server code enter the static bundle.
 * The candidate database and upstream finale verifier must be provisioned first. */
const http=require('node:http');
const {createOpeningAuthority}=require('./opening-authority.cjs');
function createHandler({backend,key,origin,fetcher=fetch}={}){
 if(!/^https:\/\/[^/]+\.supabase\.co$/.test(backend||'')||!key||!/^https:\/\//.test(origin||''))throw Error('Explicit backend, private credential and allowed game origin required');
 async function rpc(name,args){
  const r=await fetcher(backend+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args)});
  const value=await r.json();if(!r.ok)throw Error(value.message||'Account transaction failed');return value;
 }
 const authority=createOpeningAuthority({store:{load:user=>rpc('cellbound_opening_load',{p_user:user}),commit:(user,revision,build,state,attempt)=>rpc('cellbound_opening_commit',{p_user:user,p_revision:revision,p_build:build,p_state:state,p_attempt:attempt})}});
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Origin');
  if(req.headers.origin!==origin){res.writeHead(403);res.end();return}
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
  if(req.method!=='POST'||req.url!=='/opening'){res.writeHead(404);res.end();return}
  try{
   const authorization=req.headers.authorization||'';if(!/^Bearer [^ ]+$/.test(authorization))throw Error('Sign in to continue');
   // Validate against the SAME project's Auth; never decode an unverified JWT.
   const auth=await fetcher(backend+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}});
   if(!auth.ok)throw Error('Session expired; sign in again');const user=await auth.json();
   let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>16000)throw Error('Request too large');body+=chunk;}
   const value=await authority.act(user.id,JSON.parse(body));
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(value));
  }catch(error){res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
 };
}
if(require.main===module){
 const handler=createHandler({backend:process.env.CELLBOUND_EPISODE_BACKEND,key:process.env.CELLBOUND_EPISODE_PRIVATE_KEY,origin:process.env.CELLBOUND_GAME_ORIGIN});
 http.createServer(handler).listen(Number(process.env.PORT)||8787,'127.0.0.1');
}
module.exports={createHandler};
