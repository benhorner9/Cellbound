const dev=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const official='https://jvydqeikdpelmtloulnd.supabase.co',publicKey='sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl',origin='https://cb.athleticsmanagergame.com';
if(dev!=='https://zrvehixcthljiktcctne.supabase.co')throw Error('Development project required');
Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 if(req.headers.get('origin')!==origin)return new Response(null,{status:403,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return new Response(null,{status:405,headers});
 try{
  const authorization=req.headers.get('authorization')||'';
  const checked=await fetch(official+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:authorization}});
  if(!checked.ok)return new Response(JSON.stringify({error:'Sign in to your official account first, then use the development copy option.'}),{status:401,headers});
  const user=await checked.json();if(!user.email||!user.email_confirmed_at)throw Error('Confirm your official email before creating a development copy.');
  // RLS reads only this player's own snapshot. No official writes or credentials are copied.
  const saved=await fetch(official+'/rest/v1/guild_accounts?user_id=eq.'+encodeURIComponent(user.id)+'&select=game_state,guild_name',{headers:{apikey:publicKey,Authorization:authorization}});
  if(!saved.ok)throw Error('Could not read your official save.');const rows=await saved.json();
  const linked=await fetch(dev+'/auth/v1/admin/generate_link',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({type:'magiclink',email:user.email})});
  const link=await linked.json();if(!linked.ok)throw Error('Could not create your separate development sign-in.');
  const imported=await fetch(dev+'/rest/v1/rpc/cellbound_development_import',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_user:link.id,p_source:user.id,p_state:rows[0]?.game_state||{},p_name:rows[0]?.guild_name||null})});
  if(!imported.ok)throw Error('Could not prepare the development save.');
  // Verify the generated one-use token on the server; no email is sent.
  const signed=await fetch(dev+'/auth/v1/verify',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({type:'magiclink',token_hash:link.hashed_token})});
  const session=await signed.json();if(!signed.ok)throw Error('Could not open your development session.');
  return new Response(JSON.stringify({session,import:await imported.json()}),{headers});
 }catch(e){return new Response(JSON.stringify({error:e.message}),{status:409,headers});}
});
