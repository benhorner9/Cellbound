import {createOpeningAuthority} from './authority.js';
import {createNullAuthority} from './null-authority.js';
const backend=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origin='https://cb.athleticsmanagergame.com';
// This worker is deliberately pinned to the isolated project. Never accept an official token.
if(backend!=='https://zrvehixcthljiktcctne.supabase.co')throw Error('Isolated development backend required');
async function rpc(name:string,args:unknown){
 const r=await fetch(backend+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args)});
 const data=await r.json();if(!r.ok)throw Error(data.message||'Account transaction failed');return data;
}
const store={load:(user:string)=>rpc('cellbound_opening_load',{p_user:user}),commit:(user:string,revision:number,build:string,state:unknown,attempt:unknown)=>rpc('cellbound_opening_commit',{p_user:user,p_revision:revision,p_build:build,p_state:state,p_attempt:attempt}),commitNull:(user:string,revision:number,build:string,state:unknown,run:unknown)=>rpc('cellbound_null_commit',{p_user:user,p_revision:revision,p_build:build,p_state:state,p_run:run})};
const opening=createOpeningAuthority({store});
const story=createNullAuthority({store,runtime:opening.runtime,replay:opening.replay});
Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type,apikey,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 if(req.headers.get('origin')!==origin)return new Response(JSON.stringify({error:'Game origin required'}),{status:403,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return new Response(null,{status:405,headers});
 try{
  const authorization=req.headers.get('authorization')||'';
  if(!/^Bearer [^ ]+$/.test(authorization))return new Response(JSON.stringify({error:'Sign in to the development game'}),{status:401,headers});
  const auth=await fetch(backend+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}});
  if(!auth.ok)return new Response(JSON.stringify({error:'Development session expired; sign in again'}),{status:401,headers});
  const user=await auth.json();
  if(Number(req.headers.get('content-length'))>16000)throw Error('Request too large');
  const reader=req.body?.getReader();let body='',bytes=0;const decoder=new TextDecoder();
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>16000){await reader.cancel();throw Error('Request too large');}body+=decoder.decode(value,{stream:true});}
  body+=decoder.decode();const request=JSON.parse(body);
  if(typeof request.action!=='string')throw Error('Action required');
  const result=await(request.action.startsWith('null-')?story:opening).act(user.id,request);
  return new Response(JSON.stringify(result),{headers});
 }catch(e){return new Response(JSON.stringify({error:e.message||'Chapter request failed'}),{status:409,headers});}
});
