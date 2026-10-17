(()=>{
'use strict';
const dev='https://zrvehixcthljiktcctne.supabase.co',key='sb_publishable_eOHVHE2YrFhRDSWHrPjmXw_1snF8OiR';
const container=document.getElementById('login-form');if(!container)return;
const button=document.createElement('button');button.type='button';button.className='secondary';button.style.cssText='width:100%;margin-top:16px;padding:14px';button.textContent='Use my official account · separate dev copy';container.append(button);
const note=document.createElement('p');note.style.cssText='font-size:13px;line-height:1.5';note.textContent='Copies your current party once. Progress made here stays on dev. Enter your official email and password above, then choose this option.';container.append(note);
button.addEventListener('click',async()=>{
 const email=document.getElementById('email').value.trim(),password=document.getElementById('password').value,message=document.getElementById('login-message');
 const show=t=>{message.hidden=false;message.textContent=t;};button.disabled=true;
 try{
 const official=window.supabase.createClient('https://jvydqeikdpelmtloulnd.supabase.co','sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data,error}=await official.auth.signInWithPassword({email,password});if(error)throw error;
 show('Preparing your separate development account…');
 const r=await fetch(dev+'/functions/v1/development-account',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'}});
 const payload=await r.json();if(!r.ok)throw Error(payload.error||'Development sign-in failed');
 const client=window.supabase.createClient(dev,key,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storage:authStorage}});
 const result=await client.auth.setSession(payload.session);if(result.error)throw result.error;
 location.replace('./guild.html');
 }catch(e){show(e.message);button.disabled=false;}
});
})();
