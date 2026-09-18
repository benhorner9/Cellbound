(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,user=null,channel='world',chatRows=[],groups=[],groupMembers=[],worldBosses=[],rewards=[],timer=null,lastChatNewest=0;
const combatNotes={};
const state=()=>Game?.getState?.();
const partyIlvl=()=>Math.round((Number(Game?.partyItemLevel?.())||0)*10)/10;
const partyChars=()=>Game?.getPartyCharacters?.()||[];
const partyReady=()=>partyChars().length===5&&!partyChars().some(c=>Game.isUnavailable(c));

function timeLabel(v){const d=new Date(v),ms=Date.now()-d.getTime();if(ms<60000)return'now';if(ms<3600000)return Math.max(1,Math.floor(ms/60000))+'m';if(ms<86400000)return Math.floor(ms/3600000)+'h';return d.toLocaleDateString();}
function guildLabel(){const x=state()?.socialDisplayName?.trim();return x||('Guild '+String(user?.id||'????').slice(0,4).toUpperCase());}
async function saveState(){Game.save();await Game.persistState();}

async function loadChat(markSeen=false){
  if(!db||!user)return;
  const {data,error}=await db.from('chat_messages').select('id,user_id,guild_label,channel,body,created_at').eq('channel',channel).order('created_at',{ascending:false}).limit(80);
  if(error){console.warn(error);return;}
  chatRows=(data||[]).reverse();renderChat();
  const newest=chatRows.length?new Date(chatRows[chatRows.length-1].created_at).getTime():0;
  const active=document.querySelector('#chat.view.active');
  if(markSeen||active){lastChatNewest=Math.max(lastChatNewest,newest);$('#chatUnread').textContent='';}
  else if(newest>lastChatNewest)$('#chatUnread').textContent='NEW';
}
function renderChat(){
  const root=$('#chatMessages');if(!root)return;
  root.innerHTML=chatRows.length?chatRows.map(m=>`<div class="chat-message"><div class="chat-meta"><b>${esc(m.guild_label)}</b><span>${timeLabel(m.created_at)}</span></div><p>${esc(m.body)}</p></div>`).join(''):'<div class="social-empty">No messages in this channel yet.</div>';
  root.scrollTop=root.scrollHeight;
}
async function sendChat(e){
  e.preventDefault();const input=$('#chatInput'),body=input?.value?.trim();if(!body)return;
  const {error}=await db.rpc('post_chat_message',{p_channel:channel,p_body:body});
  if(error){input.setCustomValidity(error.message||'Message could not be sent');input.reportValidity();setTimeout(()=>input.setCustomValidity(''),1200);return;}
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
  input.value=name;await Promise.all([loadChat(true),loadGroups(),loadWorld()]);
}
function renderTargetOptions(){
  const sel=$('#partyFinderTarget');if(!sel)return;const options=[{type:'dungeon',id:'ashen-vault',label:'The Ashen Vault'}];
  worldBosses.forEach(b=>options.push({type:'world_boss',id:b.id,label:b.name}));
  const before=sel.value;
  sel.innerHTML=options.map(o=>`<option value="${o.type}|${o.id}|${esc(o.label)}">${o.type==='world_boss'?'World Boss · ':'Dungeon · '}${esc(o.label)}</option>`).join('');
  if([...sel.options].some(o=>o.value===before))sel.value=before;
}
async function loadGroups(){
  if(!db||!user)return;
  const now=new Date().toISOString();
  const {data,error}=await db.from('party_finder_listings').select('*').in('status',['open','full']).gt('expires_at',now).order('created_at',{ascending:false}).limit(40);
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
    return `<article class="pf-card"><div class="pf-card-head"><div><h4>${esc(g.target_label)}</h4><small>${g.content_type==='world_boss'?'WORLD BOSS':'DUNGEON'} · Leader ${esc(g.guild_label)} · Party iLvl ${Number(g.party_ilvl).toFixed(1)}</small></div><b class="pf-count">${members.length}/${g.player_cap}</b></div><p>${esc(g.note||'Looking for other commanders.')}</p><div class="pf-members">${members.map(m=>`<span>${esc(m.guild_label)} · iLvl ${Number(m.party_ilvl).toFixed(1)}</span>`).join('')}</div><div class="pf-actions">${leader?`<button class="secondary" data-pf-leave="${g.id}">CLOSE GROUP</button>`:joined?`<button class="secondary" data-pf-leave="${g.id}">LEAVE</button>`:`<button data-pf-join="${g.id}" ${full?'disabled':''}>${full?'FULL':'JOIN GROUP'}</button>`}</div></article>`;
  }).join('');
  root.querySelectorAll('[data-pf-join]').forEach(b=>b.onclick=()=>joinGroup(b.dataset.pfJoin));
  root.querySelectorAll('[data-pf-leave]').forEach(b=>b.onclick=()=>leaveGroup(b.dataset.pfLeave));
}
async function createGroup(e){
  e.preventDefault();if(!partyReady()){alert('Build a complete available five-character party first.');return;}
  const [type,id,label]=($('#partyFinderTarget')?.value||'dungeon|ashen-vault|The Ashen Vault').split('|'),cap=Math.max(2,Math.min(8,Number($('#partyFinderCap')?.value)||4)),note=($('#partyFinderNote')?.value||'').trim();
  const {error}=await db.rpc('create_party_finder_listing',{p_content_type:type,p_target_id:id,p_target_label:label,p_note:note,p_party_ilvl:partyIlvl(),p_player_cap:cap});
  if(error){alert(error.message||'Could not create group');return;}
  $('#partyFinderNote').value='';channel='party';setChannel('party');await loadGroups();
}
async function joinGroup(id){
  if(!partyReady()){alert('Build a complete available five-character party first.');return;}
  const {error}=await db.rpc('join_party_finder_listing',{p_listing_id:id,p_party_ilvl:partyIlvl()});
  if(error){alert(error.message||'Could not join group');return;}await loadGroups();
}
async function leaveGroup(id){const {error}=await db.rpc('leave_party_finder_listing',{p_listing_id:id});if(error){alert(error.message);return;}await loadGroups();}

function bossStatus(b){
  if(b.status==='in_combat')return{label:'IN COMBAT',cls:'combat'};
  if(b.status==='active')return{label:'ACTIVE',cls:'active'};
  const recent=b.last_killed_at&&(Date.now()-new Date(b.last_killed_at).getTime()<300000);
  return{label:recent?'DEFEATED':'DORMANT',cls:''};
}
function bossRune(tier){return tier===1?'♜':tier===2?'♨':'✦';}
function bossGlow(tier){return tier===1?'rgba(150,92,50,.28)':tier===2?'rgba(174,67,38,.3)':'rgba(112,71,168,.3)';}
async function loadWorld(){
  if(!db||!user)return;
  const [{data,error},{data:r,error:re}]=await Promise.all([db.rpc('get_world_bosses'),db.rpc('get_world_boss_rewards')]);
  if(!error)worldBosses=data||[];else console.warn(error);
  if(!re)rewards=r||[];else console.warn(re);
  renderTargetOptions();renderWorld();renderWorldRewards();updateWorldAlert();
}
function updateWorldAlert(){
  const active=worldBosses.filter(b=>b.status==='active'||b.status==='in_combat'),bar=$('#worldAlertBar'),badge=$('#worldActiveBadge');
  if(badge)badge.textContent=active.length?String(active.length):'';
  if(!bar)return;
  if(!active.length){bar.hidden=true;return;}
  bar.hidden=false;bar.innerHTML=`<b>A powerful presence has emerged.</b> ${active.map(b=>esc(b.name)).join(' · ')}`;
}
function renderWorld(){
  const root=$('#worldBossGrid');if(!root)return;
  if(!worldBosses.length){root.innerHTML='<div class="social-empty">The world is quiet.</div>';return;}
  const pi=partyIlvl(),ready=partyReady();
  root.innerHTML=worldBosses.map(b=>{
    const s=bossStatus(b),hp=b.max_hp?Math.max(0,Math.round((b.current_hp/b.max_hp)*100)):0,active=b.status==='active'||b.status==='in_combat',full=Number(b.participant_count)>=b.player_cap,canJoin=active&&!b.joined&&!full&&ready&&pi>=b.required_party_ilvl,note=combatNotes[b.id]||'';
    return `<article class="world-boss-card" style="--boss-glow:${bossGlow(b.tier)}"><div class="world-boss-top"><span class="world-tier">TIER ${b.tier} WORLD BOSS</span><span class="world-status ${s.cls}">${s.label}</span><h3>${esc(b.name)}</h3><span class="boss-sub">Required Party iLvl ${b.required_party_ilvl} · ${b.player_cap}-player cap</span></div><div class="world-boss-body"><div class="world-boss-rune">${bossRune(b.tier)}</div>${active?`<div class="world-hp-line"><span>Boss Health</span><b>${Number(b.current_hp).toLocaleString()} / ${Number(b.max_hp).toLocaleString()}</b></div><div class="world-hp"><i style="width:${hp}%"></i></div><div class="world-cap-line"><span>Commanders Engaged</span><b>${b.participant_count} / ${b.player_cap}</b></div><p class="world-boss-copy">${b.joined?'Your five-character party is committed to this encounter.':!ready?'Complete your active party before joining.':pi<b.required_party_ilvl?`Your Party iLvl is ${pi}; ${b.required_party_ilvl} is required.`:'Join while space remains. The boss stays in the world until players kill it.'}</p><div class="world-actions"><button ${b.joined?`data-world-leave="${b.id}"`:`data-world-join="${b.id}"`} ${b.joined||canJoin?'': 'disabled'}>${b.joined?'LEAVE BOSS':full?'FULL':'JOIN BOSS'}</button><button class="attack" data-world-fight="${b.id}" ${b.joined&&b.status==='in_combat'&&ready?'':'disabled'}>ENTER FIGHT</button></div><div class="world-combat-log">${esc(note||'Shared encounter state is live. Coordinate with other commanders in World or Party Finder chat.')}</div>`:`<div class="world-dormant">No active signal. Its next appearance is unknown.<br>The hidden respawn can occur at any point between 10 minutes and 8 hours after a kill.</div>`}</div></article>`;
  }).join('');
  root.querySelectorAll('[data-world-join]').forEach(b=>b.onclick=()=>joinBoss(b.dataset.worldJoin));
  root.querySelectorAll('[data-world-leave]').forEach(b=>b.onclick=()=>leaveBoss(b.dataset.worldLeave));
  root.querySelectorAll('[data-world-fight]').forEach(b=>b.onclick=()=>window.CellboundWorldBoss2D?.open?.(b.dataset.worldFight));
}
async function joinBoss(id){
  if(!partyReady()){alert('Build a complete available five-character party first.');return;}
  const {error}=await db.rpc('join_world_boss',{p_boss_id:id,p_party_ilvl:partyIlvl()});if(error){alert(error.message||'Could not join world boss');return;}
  combatNotes[id]=`${guildLabel()} entered the encounter with five adventurers.`;await loadWorld();
}
async function leaveBoss(id){const {error}=await db.rpc('leave_world_boss',{p_boss_id:id});if(error){alert(error.message||'Could not leave world boss');return;}combatNotes[id]='Your party withdrew from the encounter.';await loadWorld();}
async function attackBoss(id,button){
  button.disabled=true;
  const {data,error}=await db.rpc('attack_world_boss',{p_boss_id:id});
  if(error){combatNotes[id]=error.message||'Your party could not attack.';renderWorld();setTimeout(()=>loadWorld(),1000);return;}
  if(data?.wiped){
    Game.applyPartyCellShock(25);await Game.persistState();
    combatNotes[id]='Your party was overwhelmed. All five adventurers gained 25% Cell Shock.';
  }else combatNotes[id]=`Your party dealt ${Number(data?.damage||0).toLocaleString()} damage.`;
  if(data?.killed)combatNotes[id]+=' The world boss has fallen. Every participating commander earned one personal item.';
  await loadWorld();
  setTimeout(()=>loadWorld(),5200);
}
function renderWorldRewards(){
  const root=$('#worldBossRewards');if(!root)return;
  if(!rewards.length){root.innerHTML='';return;}
  root.innerHTML=rewards.map(r=>{const item=window.CellboundGear?.byId(r.item_key);return `<div class="world-reward-banner"><div>${item?window.CellboundGear.artHTML(item,50):'◆'}</div><div><h4>Personal World Boss Reward</h4><small>${esc(r.boss_name)} · Tier ${r.item_tier} · ${esc(item?.name||r.item_key)}</small></div><button data-claim-world="${r.id}">CLAIM ITEM</button></div>`;}).join('');
  root.querySelectorAll('[data-claim-world]').forEach(b=>b.onclick=()=>claimReward(b.dataset.claimWorld));
}
async function claimReward(id){
  const {data,error}=await db.rpc('claim_world_boss_reward',{p_reward_id:id});if(error){alert(error.message||'Reward could not be claimed');return;}
  location.reload();
}
async function refreshAll(markSeen=false){await Promise.all([loadChat(markSeen),loadGroups(),loadWorld()]);}
function bind(){
  $$('[data-chat-channel]').forEach(b=>b.addEventListener('click',()=>setChannel(b.dataset.chatChannel)));
  $('#chatForm')?.addEventListener('submit',sendChat);
  $('#guildNameForm')?.addEventListener('submit',saveGuildName);
  $('#partyFinderForm')?.addEventListener('submit',createGroup);
  $('#refreshSocial')?.addEventListener('click',()=>refreshAll(true));
  $('#refreshWorld')?.addEventListener('click',loadWorld);
  document.querySelector('.nav-btn[data-view="chat"]')?.addEventListener('click',()=>{loadChat(true);loadGroups();});
  document.querySelector('.nav-btn[data-view="world"]')?.addEventListener('click',loadWorld);
}
async function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,80);return;}
  db=Game.getSupabase();user=Game.getUser();if(!db||!user)return;
  if($('#guildNameInput'))$('#guildNameInput').value=state().socialDisplayName||'';
  bind();await refreshAll(false);
  timer=setInterval(()=>refreshAll(false),5000);
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  window.CellboundSocial={refreshAll,loadWorld,loadGroups,loadChat,getWorldBosses:()=>worldBosses.slice()};
}
init();
})();