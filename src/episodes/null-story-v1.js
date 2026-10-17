(()=>{
'use strict';
const G=()=>window.CellboundGame,D=window.CellboundNullStoryData;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=document.createElement('dialog');root.id='verified-null-story';root.className='mf';root.setAttribute('aria-label','Signal From Nowhere');document.body.append(root);
let record=null,busy=false,fighting=false,error='',owner=null;
async function call(action,payload={}){
 const user=G().getUser();if(!user?.id||!window.CELLBOUND_EPISODE_SERVICE_URL)throw Error('Sign in to the development game.');
 if(owner&&owner!==user.id)throw Error('Account changed. Reopen the story.');owner=user.id;
 await G().waitForPendingSaves?.();
 const session=await G().getSupabase().auth.getSession();
 const r=await fetch(window.CELLBOUND_EPISODE_SERVICE_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.data.session.access_token},body:JSON.stringify({action,build:String(window.CELLBOUND_EPISODE_BUILD||window.CELLBOUND_BUILD),revision:record?.account.revision,...payload})});
 const data=await r.json();if(!r.ok||data.error)throw Error(data.error||'Could not save story progress.');
 if(G().getUser()?.id!==owner||data.account?.user_id!==owner)throw Error('Story account changed.');
 record=data;G().acceptEpisodeSnapshot(data.account);refresh();return data;
}
const button=(text,action,extra='')=>`<button type="button" data-null-story="${action}" ${extra}>${esc(text)}</button>`;
function render(){
 if(fighting)return;
 const step=D.steps[record?.run?.index||0];
 root.innerHTML=`<header class="mf-heading"><div><small>NULL//07</small><h2>Signal From Nowhere</h2></div>${button('Return to game','close')}</header><div class="mf-body">${record?.complete?`<div class="mf-reward"><h3>The agricultural relay is responding.</h3><p>Your party has escaped the Null Complex. A new transmission leads beyond Zeltira.</p>${button('Continue to After the Breach','opening')}</div>`:!record?'<p>Checking your journey…</p>':`<section class="mf-comic"><img src="${step.art}" alt="${esc(step.title)}"><div class="mf-comic-caption"><small>${record.run.index+1} / ${D.steps.length} · ${esc(step.speaker||'NULL COMPLEX')}</small><h3>${esc(step.title)}</h3><p>${esc(step.text||'Keep the party together. Something is moving in the next chamber.')}</p>${step.encounter?button('Enter encounter','fight'):step.choices?'<div class="null-story-choices">'+step.choices.map((s,i)=>button(s,'choice',`data-choice="${i}"`)).join('')+'</div>':button('Continue →','panel')}</div></section>`}${error?`<p role="alert" class="mf-error">${esc(error)}</p>${button('Reload saved story','reload')}`:''}</div>`;
 root.toggleAttribute('aria-busy',busy);root.querySelectorAll('button').forEach(b=>b.disabled=busy);
}
async function act(fn){if(busy)return;busy=true;error='';render();try{await fn();}catch(e){error=e.message;}finally{busy=false;render();}}
async function open(){record=null;owner=null;if(!root.open)root.showModal();await act(async()=>{await call('null-load');if(!record.complete)await call('null-start');});}
async function fight(){
 const step=D.steps[record.run.index];await call('null-battle-start',{step:step.id});const a=record.run.attempt,o=a.options,commands=[];
 const result=window.CellboundCombatStandard.createLiveSession(o,{zone:'null'}).snapshot();await window.CellboundMonsterVisuals.preload(o.encounter.enemies);
 fighting=true;root.close();
 try{
 const outcome=await window.CellboundDungeon2D.playSharedEncounter({party:o.party,encounter:o.encounter,result,tactics:o.tactics,zone:'null',theme:'null',title:step.title,header:'SIGNAL FROM NOWHERE',room:step.id,roomLabel:step.title,disableConsumables:true,onCommand:(type,payload,at)=>commands.push({type,at,targetId:payload.targetId||null}),environmentHtml:`<img class="mf-combat-art" src="${step.art}" alt="Null Complex">`});
 await call(outcome==='cancelled'?'null-abandon':'null-battle-finish',{step:step.id,attempt:a.id,commands});
 if(outcome!=='cancelled'&&record.run.attempt.status!=='victory')error='The party fell back. Adjust your equipment and try again.';
 }finally{window.CellboundDungeon2D.closeShared(true);fighting=false;if(!root.open)root.showModal();}
}
root.addEventListener('click',e=>{
 const b=e.target.closest('[data-null-story]');if(!b||busy)return;const action=b.dataset.nullStory;
 if(action==='close'){root.close();return;}
 if(action==='reload'){open();return;}
 if(action==='opening'){root.close();window.CellboundMorrowfields.open();return;}
 act(async()=>{const step=D.steps[record.run.index];if(action==='fight')await fight();else await call(action==='choice'?'null-choice':'null-panel',{step:step.id,choice:Number(b.dataset.choice)});});
});
root.addEventListener('cancel',e=>{if(busy||fighting)e.preventDefault();});
function refresh(){
 if(!window.CELLBOUND_SECURE_SAVES||!window.CELLBOUND_EPISODE_SERVICE_URL||!G()?.ready)return;
 const parent=document.getElementById('quests');if(!parent)return;
 let card=parent.querySelector('[data-verified-null-entry]');if(!card){card=document.createElement('section');card.className='mf-entry';card.dataset.verifiedNullEntry='';parent.prepend(card);card.addEventListener('click',e=>{if(e.target.closest('button'))open();});}
 const state=G().getState(),eligible=state.progression?.manorRaidCleared||Object.keys(state.raidRewardClaims||{}).length,complete=state.questSystem?.nullComplex?.authoritative;
 card.innerHTML=`<img src="${D.steps[0].art}" alt="The Null Complex signal"><div><small>EPISODE 1 FINALE</small><h3>Signal From Nowhere</h3><p>${complete?'The agricultural relay is responding. Continue to the Morrowfields.':eligible?'Follow the NULL//07 transmission and escape the facility to reach the Morrowfields.':'Complete The Manor to investigate the NULL//07 signal.'}</p>${button(complete?'View completed story':'Continue the investigation','open',eligible||complete?'':'disabled')}</div>`;
}
window.CellboundNullStory={open,refresh};window.addEventListener('cellbound:view-changed',refresh);
const timer=setInterval(()=>{if(G()?.ready){clearInterval(timer);refresh();}},250);
})();
