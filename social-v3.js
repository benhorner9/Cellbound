(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,user=null,channel='world',chatRows=[],groups=[],groupMembers=[],timer=null,lastChatNewest=0;
const state=()=>Game?.getState?.();
const partyIlvl=()=>Math.round((Number(Game?.partyItemLevel?.())||0)*10)/10;
const partyChars=()=>Game?.getPartyCharacters?.()||[];
const partyReady=()=>partyChars().length===5&&!partyChars().some(c=>Game.isUnavailable(c));

function timeLabel(v){const d=new Date(v),ms=Date.now()-d.getTime();if(ms<60000)return'now';if(ms<3600000)return Math.max(1,Math.floor(ms/60000))+'m';if(ms<86400000)return Math.floor(ms/3600000)+'h';return d.toLocaleDateString();}
function guildLabel(){const x=state()?.socialDisplayName?.trim();return x||('Guild '+String(user?.id||'????').slice(0,4).toUpperCase());}
async function saveState(){Game.save();await Game.persistState();}

async function loadChat(markSeen=false){
  if(!db||!user)return;
  const {data,error}=await db.from('chat_messages').select('id,user_id,guild_label,channel,body,sender_badge,created_at').eq('channel',channel).order('created_at',{ascending:false}).limit(80);
  if(error){console.warn(error);return;}
  chatRows=(data||[]).reverse();renderChat();
  const newest=chatRows.length?new Date(chatRows[chatRows.length-1].created_at).getTime():0;
  const active=document.querySelector('#chat.view.active');
  if(markSeen||active){lastChatNewest=Math.max(lastChatNewest,newest);$('#chatUnread').textContent='';}
  else if(newest>lastChatNewest)$('#chatUnread').textContent='NEW';
}
function chatRankBadge(role){
  if(role==='mod')return'<span class="chat-rank mod" title="Cellbound Moderator"><i>◆</i> MOD</span>';
  if(role==='player_mod')return'<span class="chat-rank player-mod" title="Cellbound Player Moderator"><i>◇</i> PLAYER MOD</span>';
  return'';
}
function renderChat(){
  const root=$('#chatMessages');if(!root)return;
  root.innerHTML=chatRows.length?chatRows.map(m=>`<div class="chat-message ${m.sender_badge==='mod'?'from-mod':m.sender_badge==='player_mod'?'from-player-mod':''}"><div class="chat-meta"><div class="chat-speaker"><b>${esc(m.guild_label)}</b>${chatRankBadge(m.sender_badge)}</div><span>${timeLabel(m.created_at)}</span></div><p>${esc(m.body)}</p></div>`).join(''):'<div class="social-empty">No messages in this channel yet.</div>';
  root.scrollTop=root.scrollHeight;
}
async function sendChat(e){
  e.preventDefault();const input=$('#chatInput'),body=input?.value?.trim();if(!body)return;
  const {error}=await db.rpc('post_chat_message',{p_channel:channel,p_body:body});
  if(error){
    const blocked=String(error.message||'').toLowerCase().includes('chat filter');
    input.setCustomValidity(blocked?'That message contains language blocked by the Cellbound chat filter. Please reword it.':(error.message||'Message could not be sent'));
    input.reportValidity();setTimeout(()=>input.setCustomValidity(''),2400);return;
  }
  input.value='';await loadChat(true);
}
function setChannel(next){
  channel=next;$$('[data-chat-channel]').forEach(b=>b.classList.toggle('active',b.dataset.chatChannel===channel));
  if($('#chatInput'))$('#chatInput').placeholder='Message '+(channel==='party'?'Party Finder':channel[0].toUpperCase()+channel.slice(1))+'…';
  loadChat(true);
}
async function saveGuildName(e){
  e.preventDefault();const input=$('#guildNameInput'),name=(input?.value||'').trim().replace(/\s+/g,' ');
  if(name.length<3||name.length>24){input.setCustomValidity('Use 3–24 characters');input.reportValidity();setTimeout(()=>input.setCustomValidity(''),1200);return;}
  state().socialDisplayName=name;state().activity.push(`Your guild is now known as ${name}.`);await saveState();
  input.value=name;await Promise.all([loadChat(true),loadGroups()]);
}
function renderTargetOptions(){
  const sel=$('#partyFinderTarget');if(!sel)return;
  const s=state()||{},options=[];
  if(s?.progression?.ashenVaultUnlocked!==false)options.push({type:'dungeon',id:'ashen-vault',label:'The Ashen Vault'});
  if(s?.questSystem?.flags?.hollowSanctumUnlocked)options.push({type:'dungeon',id:'hollow-sanctum',label:'The Hollow Sanctum'});
  options.push({type:'dungeon',id:'chaos-canyon',label:'Chaos Canyon'});
  options.push({type:'dungeon',id:'blackout-station',label:'Blackout Station'});
  if(s?.progression?.fracturedAgesUnlocked)options.push({type:'dungeon',id:'fractured-ages',label:'The Fractured Ages'});
  if(s?.progression?.manorRaidUnlocked)options.push({type:'raid',id:'manor',label:'The Manor'});
  const before=sel.value;
  sel.innerHTML=options.map(o=>`<option value="${o.type}|${o.id}|${esc(o.label)}">${o.type==='raid'?'Raid':'Dungeon'} · ${esc(o.label)}</option>`).join('');
  if([...sel.options].some(o=>o.value===before))sel.value=before;
}
async function loadGroups(){
  if(!db||!user)return;
  const now=new Date().toISOString();
  const {data,error}=await db.from('party_finder_listings').select('*').in('content_type',['dungeon','raid']).in('status',['open','full']).gt('expires_at',now).order('created_at',{ascending:false}).limit(40);
  if(error){console.warn(error);groups=[];groupMembers=[];renderGroups();return;}
  groups=data||[];
  if(groups.length){
    const ids=groups.map(x=>x.id);
    const {data:m,error:me}=await db.from('party_finder_members').select('*').in('listing_id',ids).order('joined_at',{ascending:true});
    if(!me)groupMembers=m||[];
  }else groupMembers=[];
  renderGroups();
}
function renderGroups(){
  const root=$('#partyFinderListings'),count=$('#partyFinderCount');if(!root)return;
  if(count)count.textContent=`${groups.length} GROUP${groups.length===1?'':'S'}`;
  if(!groups.length){root.innerHTML='<div class="social-empty">No groups looking for players.</div>';return;}
  root.innerHTML=groups.map(g=>{
    const members=groupMembers.filter(m=>m.listing_id===g.id),joined=members.some(m=>m.user_id===user.id),leader=g.leader_id===user.id,full=members.length>=g.player_cap;
    return `<article class="pf-card"><div class="pf-card-head"><div><h4>${esc(g.target_label)}</h4><small>${g.content_type==='raid'?'RAID':'DUNGEON'} · Leader ${esc(g.guild_label)} · Party iLvl ${Number(g.party_ilvl).toFixed(1)}</small></div><b class="pf-count">${members.length}/${g.player_cap}</b></div><p>${esc(g.note||'Looking for other commanders.')}</p><div class="pf-members">${members.map(m=>`<span>${esc(m.guild_label)} · iLvl ${Number(m.party_ilvl).toFixed(1)}</span>`).join('')}</div><div class="pf-actions">${leader?`<button class="secondary" data-pf-leave="${g.id}">CLOSE GROUP</button>`:joined?`<button class="secondary" data-pf-leave="${g.id}">LEAVE</button>`:`<button data-pf-join="${g.id}" ${full?'disabled':''}>${full?'FULL':'JOIN GROUP'}</button>`}</div></article>`;
  }).join('');
  root.querySelectorAll('[data-pf-join]').forEach(b=>b.onclick=()=>joinGroup(b.dataset.pfJoin));
  root.querySelectorAll('[data-pf-leave]').forEach(b=>b.onclick=()=>leaveGroup(b.dataset.pfLeave));
}
async function createGroup(e){
  e.preventDefault();if(!partyReady()){alert('Build a complete available five-character party first.');return;}
  const [type,id,label]=($('#partyFinderTarget')?.value||'dungeon|ashen-vault|The Ashen Vault').split('|'),cap=type==='raid'?2:Math.max(2,Math.min(8,Number($('#partyFinderCap')?.value)||4)),note=($('#partyFinderNote')?.value||'').trim();
  const {data,error}=await db.rpc('create_party_finder_listing',{p_content_type:type,p_target_id:id,p_target_label:label,p_note:note,p_party_ilvl:partyIlvl(),p_player_cap:cap});
  if(error){alert(error.message||'Could not create group');return;}
  if(type==='raid'&&data)await window.CellboundManorRaid?.syncPartyToListing?.(data);
  $('#partyFinderNote').value='';channel='party';setChannel('party');await loadGroups();
}
async function joinGroup(id){
  if(!partyReady()){alert('Build a complete available five-character party first.');return;}
  const target=groups.find(x=>x.id===id);
  const {error}=await db.rpc('join_party_finder_listing',{p_listing_id:id,p_party_ilvl:partyIlvl()});
  if(error){alert(error.message||'Could not join group');return;}
  if(target?.content_type==='raid')await window.CellboundManorRaid?.syncPartyToListing?.(id);
  await loadGroups();
}
async function leaveGroup(id){const {error}=await db.rpc('leave_party_finder_listing',{p_listing_id:id});if(error){alert(error.message);return;}await loadGroups();}

async function refreshAll(markSeen=false){await Promise.all([loadChat(markSeen),loadGroups()]);renderTargetOptions();}
function bind(){
  $$('[data-chat-channel]').forEach(b=>b.addEventListener('click',()=>setChannel(b.dataset.chatChannel)));
  $('#chatForm')?.addEventListener('submit',sendChat);
  $('#guildNameForm')?.addEventListener('submit',saveGuildName);
  $('#partyFinderForm')?.addEventListener('submit',createGroup);
  $('#refreshSocial')?.addEventListener('click',()=>refreshAll(true));
  window.addEventListener('cellbound:view-changed',e=>{
    if(e.detail?.view==='chat'){loadChat(true);loadGroups();}
  });
}
async function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,80);return;}
  db=Game.getSupabase();user=Game.getUser();if(!db||!user)return;
  if($('#guildNameInput'))$('#guildNameInput').value=state().socialDisplayName||'';
  bind();await refreshAll(false);
  timer=setInterval(()=>refreshAll(false),5000);
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  window.CellboundSocial={refreshAll,loadGroups,loadChat};
}
init();
})();