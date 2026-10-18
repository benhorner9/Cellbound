(()=>{
'use strict';
const D=window.CellboundMorrowfieldsData,E=window.CellboundEpisodeTwo,G=()=>window.CellboundGame;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let record=null,busy=false,screen='map',dialog=null,lastClue='',error='',fighting=false,returnFocus=null,accountId=null;
const q=()=>record?.account?.state?.episode2?.quests?.e2_q01;
const progress=()=>q()?.opening;
const current=()=>E.CONTENT.e2_q01.objectives[q()?.objectives.length||0];
const root=document.createElement('dialog');root.id='morrowfields';root.className='mf';root.setAttribute('aria-label','The Morrowfields');document.body.append(root);
const button=(label,action,attrs='')=>`<button type="button" data-mf="${action}" ${attrs}>${esc(label)}</button>`;
const travel=(name,id,attrs='')=>button(name,'visit',`data-location="${id}" ${attrs}`);
async function call(action,payload={}){
 if(window.CELLBOUND_SECURE_SAVES!==true)throw Error('The Morrowfields is not available on this server yet. Your progress is unchanged.');
 const endpoint=window.CELLBOUND_EPISODE_SERVICE_URL;
 if(!endpoint)throw Error('The Morrowfields is not available on this server yet.');
 const user=G().getUser();if(!user?.id)throw Error('Sign in to continue.');
 if(accountId&&accountId!==user.id){record=null;throw Error('Account changed. Reopen the chapter.');}accountId=user.id;
 await G().waitForPendingSaves?.();
 const session=await G().getSupabase().auth.getSession();
 const result=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.data.session.access_token},body:JSON.stringify({action,build:String(window.CELLBOUND_EPISODE_BUILD||window.CELLBOUND_BUILD||'development'),revision:record?.account.revision,...payload})});
 const data=await result.json();if(!result.ok||data.error)throw Error(data.error||'Could not save chapter progress. Please retry.');
 if(G().getUser()?.id!==user.id)throw Error('Account changed. Reopen the chapter.');
 if(!data.account?.state?.episode2||data.account.user_id!==user.id)throw Error('Chapter account verification failed.');
 record=data;G().acceptEpisodeSnapshot(data.account);syncEntries();return data;
}
async function action(fn){
 if(busy)return;busy=true;error='';root.setAttribute('aria-busy','true');root.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{await fn();}catch(e){error=e.message;/* Reload on the next open/retry; never grant local rewards. */}
 finally{busy=false;root.removeAttribute('aria-busy');if(!fighting)render();}
}
async function open(){
 returnFocus=document.activeElement;if(!root.open)root.showModal();screen='loading';render();
 await action(async()=>{await call('load');if(!q())await call('start');screen=route();});
}
function route(){if(q()?.complete)return'fenstead';const id=current()?.id;return id==='transmission'?'intro':id==='briefing'?'briefing':progress()?.location==='zeltira'?'map':progress()?.location||'map';}
function close(){if(fighting)return;root.close();returnFocus?.focus?.();}
function heading(title,kicker='THE MORROWFIELDS'){return `<header class="mf-heading"><div><small>${esc(kicker)}</small><h2 tabindex="-1">${esc(title)}</h2></div>${button('Return to game','close','aria-label="Return to game"')}</header>`;}
function scene(art,alt,hotspots,kind=''){return `<div class="mf-scene ${kind}" style="--mf-art:url('${D.asset(art)}')"><img src="${D.asset(art)}" alt="${esc(alt)}" draggable="false"><div class="mf-hotspots">${hotspots}</div></div>`;}
function spot(name,action,x,y,extra='',locked=false){return button(name,action,`class="mf-spot ${locked?'is-locked':''}" style="--x:${x}%;--y:${y}%" ${extra}`);}
function npc(id,text,actions){const n=D.npc[id];return `<div class="mf-dialogue"><img src="${n.portrait}" alt="${esc(n.name)}"><div><small>${esc(n.role)}</small><h3>${esc(n.name)}</h3><p>${esc(text)}</p><div class="mf-actions">${actions}</div></div></div>`;}
function objective(){return `<div class="mf-objective"><span>${q()?.complete?'CHAPTER COMPLETE':`AFTER THE BREACH · ${(q()?.objectives.length||0)+1} / 6`}</span><strong>${esc(q()?.complete?'Two investigations await.':current()?.text||'Receive the transmission.')}</strong>${!q()?.complete?button('Go to objective','objective'):''}</div>`;}
function comic(outro=false){
 const index=outro?progress().outro:progress().intro,panels=outro?D.closing:D.opening,p=panels[Math.min(index,2)];
 return '<section class="quest-v3-story"><small>EPISODE II · STORY PANEL '+(index+1)+' / 3</small><h3>'+esc(p.title)+'</h3><p>'+esc(p.text)+'</p><div class="quest-detail-action">'+button('VIEW STORY PANEL →',outro?'outro-panel':'intro-panel','data-panel="'+index+'"')+'</div></section>';
}
async function playComicPanel(outro,index){
 const p=(outro?D.closing:D.opening)[index];
 if(!p||!window.CellboundComicScenes?.show)throw Error('Story presentation unavailable. Progress was not advanced.');
 const reopen=root.open;if(reopen)root.close();
 try{
  const result=await window.CellboundComicScenes.show({eyebrow:'EPISODE II · INVASION ON THE FARM',title:outro?'Two Trails':'After the Breach',page:(index+1)+' / 3',theme:'zeltira',storyOnly:true,allowSkip:false,panels:[{kind:'location',title:p.title,text:p.text,artwork:p.art}]});
  if(result?.skipped)throw Error('Comic was interrupted. Try again.');
 }finally{if(reopen&&!root.open)root.showModal();}
}
function branches(){return `<div class="mf-branches">${['e2_q02','e2_q03'].map(id=>{const d=E.CONTENT[id];return `<article><small>INVESTIGATION DISCOVERED</small><h3>${esc(d.name)}</h3><p>${esc(d.objectives[0].text)}</p><span>Further exploration is coming soon.</span></article>`}).join('')}</div>`;}
function map(){return scene('map','The Morrowfields: farms, orchard, canals and distant harvest facilities',D.locations.map(l=>spot(l.name,'location',l.x,l.y,`data-location="${l.id}"`,!l.ready)).join(''),'mf-map')+`<p class="mf-map-note">Choose a landmark. Unexplored routes show what opens them.</p>`;}
function farm(){
 const p=progress();
 return scene('fenstead','Fenstead Farm courtyard, farmhouse, barn and supply storage',[
 spot('Mara · Farmhouse','mara',23,34),spot('Tessa · Barn','tessa',70,29),spot('Supplies','supplies',83,64),spot('Notice board','journal',27,60),spot('East Fields →','visit',65,12,'data-location="east-fields"'),spot('← Zeltira','zeltira',16,86)
 ].join(''))+`<div class="mf-actions">${travel('Regional map','map')}${button('Party & equipment','equipment')}</div>`+
 (current()?.id==='fenstead'?npc('mara','If you have come for the harvest, you are late. If you have come for my workers, follow me. Henley never misses supper. His coat is still hanging by the door. They found the supply wagon beyond the east field; nobody found him.',button('We will look for them','meet-mara')):'')+
 (current()?.id==='component'&&p.recovered?npc('tessa','Put it on the bench. Carefully. That mark is from the Complex… and this thing is still listening.',button('Examine the component','closing')):'')+
 (q()?.complete?`<div class="mf-reward"><small>REWARDS RECEIVED</small><h3>After the Breach</h3><p>4,300 XP for each of your five adventurers · 180 gold</p><p>Mara leaves a lamp burning. There are still people to bring home.</p></div>${branches()}`:'');
}
function wagon(){
 const p=progress(),stage=current()?.id;
 return scene('wagon','Broken wagon with wheel tracks, torn supply container, disturbed soil and a mechanical fragment',D.clues.map(c=>spot((p.clues.includes(c.id)?'✓ ':'')+c.name,'clue',c.x,c.y,`data-clue="${c.id}"`)).join(''))+
 `<div class="mf-clue"><small>EVIDENCE · ${p.clues.length} / 4</small><p>${esc(lastClue||'Tap the clues around the wagon. Something pulled it down from underneath.')}</p></div>`+
 (stage==='creatures'?npc('mara','That axle was sound yesterday. Look at the split. Something pulled it down. Wait—behind you. The wheat is moving.',button(record.attempt?.status==='active'?'Resume encounter':'Stand your ground','fight')):'')+
 (stage==='component'&&!p.recovered?`<div class="mf-clue"><h3>A familiar mark</h3><p>The creatures fall still. Beneath the broken axle, the component bears the Null Complex insignia.</p>${button('Recover component · return to Tessa','recover')}</div>`:'')+
 `<div class="mf-actions">${travel('Back to the fields','east-fields')}${travel('Return to Fenstead','fenstead')}</div>`;
}
function render(){
 if(fighting)return;
 const title=screen==='map'?'The Morrowfields':screen==='fenstead'?'Fenstead Farm':screen==='wagon'?'The Broken Wagon':screen==='east-fields'?'East Fields':'After the Breach';
 root.dataset.worldState=record?.account.state.episode2.worldState||'uneasy-fields';
 let body='';
 if(!record||screen==='loading')body=`<div class="mf-loading"><h3>${error?'The road is closed for now':'Receiving the transmission…'}</h3><p>${esc(error||'Checking your journey.')}</p>${error?button('Try again','reload'):''}</div>`;
 else if(screen==='intro'||screen==='outro')body=comic(screen==='outro');
 else if(screen==='briefing')body=npc('voss','An agricultural relay outside Zeltira has activated. Nobody has serviced it in years. The signal is repeating, but it is not asking for help. I need you to find what answered it.','')+npc('vey','Missing workers first. Whatever Voss thinks is under that farm can wait until we know who is still alive. Mara Fen sent word: even the livestock are turning on their keepers. Take the east road. Bring people home.',button('Take the road to the Morrowfields','briefing'));
 else if(screen==='map')body=map();
 else if(screen==='fenstead')body=farm();
 else if(screen==='east-fields')body=scene('east-fields','Golden wheat, quiet road and abandoned wagon',spot('Abandoned wagon','visit',83,27,'data-location="wagon"'))+npc('mara','I used to know this field by the sound of it. Wind, birds, the cattle at the far fence. Listen now.',travel('Investigate the wagon','wagon'))+travel('Return to Fenstead','fenstead');
 else if(screen==='wagon')body=wagon();
 root.innerHTML=heading(title)+`<div class="mf-body">${record?objective():''}${body}${dialog?`<section class="mf-notice" role="status"><p>${esc(dialog)}</p>${button('Back to exploring','dismiss')}</section>`:''}${error&&record?`<p class="mf-error" role="alert">${esc(error)} ${button('Reload saved progress','reload')}</p>`:''}</div>`;
 if(busy)root.querySelectorAll('button').forEach(b=>b.disabled=true);
}
async function visit(location){await call('visit',{location});screen=location==='zeltira'?'map':location;dialog=null;}
async function fight(){
 await call('battle-start',{orders:window.CellboundPartyTactics?.current?.(G().getPartyCharacters())||{}});
 const attempt=record.attempt,options=attempt.options,commands=[];
 const result=window.CellboundCombatStandard.createLiveSession(options,{zone:'morrowfields'}).snapshot();
 await window.CellboundMonsterVisuals.preload(options.encounter.enemies);
 fighting=true;root.close();
 let outcome;
 try{
  outcome=await window.CellboundDungeon2D.playSharedEncounter({party:options.party,encounter:options.encounter,result,tactics:options.tactics,zone:'morrowfields',theme:'morrowfields',title:'Something in the Wheat',header:'AFTER THE BREACH · EAST FIELDS',room:'east-fields',roomLabel:'The wheat is moving',ambience:'Interrupt Root Regrowth. Keep the creatures away from the farm.',disableConsumables:true,
   onCommand:(type,payload,at)=>commands.push({type,at,targetId:payload.targetId||null}),
   environmentHtml:`<img class="mf-combat-art" src="${D.asset('east-fields')}" alt="East Fields"><div class="mf-combat-entry"></div>`});
  if(outcome==='cancelled')await call('abandon');else await call('battle-finish',{attempt:attempt.id,commands});
  if(outcome!=='cancelled'&&record.attempt.status!=='victory')dialog='The party has fallen back to the wagon. Adjust your party orders and try again.';
 }finally{window.CellboundDungeon2D.closeShared(true);fighting=false;screen='wagon';if(!root.open)root.showModal();}
}
root.addEventListener('click',event=>{
 const b=event.target.closest('[data-mf]');if(!b||busy)return;const key=b.dataset.mf;
 if(key==='close'){close();return}if(key==='reload'){record=null;open();return}
 action(async()=>{
  if(key==='intro-panel'||key==='outro-panel'){const outro=key==='outro-panel',panel=Number(b.dataset.panel);await playComicPanel(outro,panel);await call(key,{panel});screen=outro&&!q().complete?'outro':route();}
  else if(key==='briefing'||key==='meet-mara'||key==='recover'){await call(key);screen=route();}
  else if(key==='visit')await visit(b.dataset.location);
  else if(key==='location'){
   const l=D.locations.find(x=>x.id===b.dataset.location);
   if(l.ready)await visit(l.id);else dialog=`${l.name} — ${l.description} ${E.CONTENT[l.requires]?'Requires '+E.CONTENT[l.requires].name+'. ':''}This route is not open for exploration yet.`;
  }else if(key==='clue'){
   const c=D.clues.find(x=>x.id===b.dataset.clue);lastClue=c.text;
   if(!progress().clues.includes(c.id))await call('clue',{clue:c.id});
  }else if(key==='fight')await fight();
  else if(key==='closing')screen='outro';
  else if(key==='objective'){
   const id=current()?.id;
   if(id==='transmission')screen='intro';else if(id==='briefing')screen='briefing';
   else if(id==='fenstead')await visit('fenstead');else if(id==='component'&&progress().recovered)await visit('fenstead');else await visit('wagon');
  }else if(key==='mara')dialog=q().complete?'“Keep that lamp lit,” Mara says. “I want Henley to see the house when he comes back.”':'“I told everyone to stay inside the fence. I should have told them sooner.” Mara folds a worker’s coat over her arm.';
  else if(key==='tessa'){if(progress()?.recovered&&!q().complete)screen='outro';else dialog='Tessa is setting up a resonance meter in the barn. Bring her anything that does not belong in the fields.';}
  else if(key==='supplies')dialog='Feed sacks, clean water and blankets for the missing workers. Your equipment and supplies remain in your existing inventory.';
  else if(key==='journal')dialog=q().complete?'Two investigations: Ash in the Wheat and Water That Moves. Both trails are recorded in your journal.':current()?.text;
  else if(key==='zeltira'){await visit('zeltira');close();G().switchView('overview');}
  else if(key==='equipment'){close();G().switchView('roster');}
  else if(key==='dismiss')dialog=null;
 });
});
root.addEventListener('cancel',e=>{if(busy||fighting)e.preventDefault();});
function renderEpisodeDungeons(){
 const host=document.getElementById('episodeTwoDungeonSlots'),s=G()?.getState?.();
 if(!host||!s)return;
 const summary=host.closest('[data-dungeon-episode="2"]')?.querySelector('summary span b');
 const available=window.CELLBOUND_SECURE_SAVES===true&&Boolean(window.CELLBOUND_EPISODE_SERVICE_URL);
 if(!available||!E.finaleCompleted(s)){
  if(summary)summary.textContent='LOCKED';
  host.innerHTML='<div class="dungeon-episode-empty"><div><b>Episode II locked.</b><span>Complete Signal From Nowhere and await episode release.</span></div></div>';
  return;
 }
 if(summary)summary.textContent='NEW DUNGEONS';
 host.innerHTML=Object.values(E.CONTENT).filter(d=>d.kind==='dungeon').map(d=>{
  const st=E.status(s,d.id),required=st.missing.map(x=>x.name).join(' + ');
  return '<article class="dungeon-browser-card" data-episode-dungeon="'+esc(d.id)+'"><div class="dungeon-browser-copy"><div class="dungeon-browser-heading"><div><small>EPISODE II · DUNGEON</small><h3>'+esc(d.name)+'</h3></div><b>'+esc(st.unlocked?'IN DEVELOPMENT':'LOCKED')+'</b></div>'+
   '<p>'+esc(st.unlocked?'This dungeon has been discovered. Its playable encounters are still in development.':required||'Complete the preceding quest to discover this dungeon.')+'</p>'+
   '<div class="dungeon-browser-meta"><span>Levels '+esc(d.levels.join('–'))+'</span><span>'+d.rooms.length+' planned rooms</span></div></div></article>';
 }).join('');
}
function syncEntries(){
 const s=G()?.getState?.(),parent=document.getElementById('world');
 if(!s)return;
 // Refresh the existing Quest Journal after the authoritative episode snapshot
 // and once this quest's shared adapter has registered on initial page load.
 window.CellboundQuests?.render?.();
 const available=window.CELLBOUND_SECURE_SAVES===true&&Boolean(window.CELLBOUND_EPISODE_SERVICE_URL);
 const eligible=E.finaleCompleted(s),started=Boolean(s.episode2?.quests?.e2_q01?.startedAt);
 const old=parent?.querySelector('[data-morrowfields-entry]');
 // Quest start happens in the journal, not by opening the map or the chapter.
 if(!parent||!available||!eligible||!started){old?.remove();renderEpisodeDungeons();return;}
 let card=old;
 if(!card){card=document.createElement('section');card.className='mf-entry';card.dataset.morrowfieldsEntry='';parent.prepend(card);}
 const status=E.status(s,'e2_q01');
 card.innerHTML='<img src="'+D.asset('map')+'" alt="The Morrowfields"><div><small>DISCOVERED LOCATION · EPISODE II</small><h3>The Morrowfields</h3><p>'+
  esc(status.complete?'Return to Fenstead Farm. The next investigations are recorded in your Quest Journal.':status.nextObjective?.text||'Continue the investigation.')+
  '</p>'+button('TRAVEL TO THE MORROWFIELDS','open')+'</div>';
 card.querySelector('[data-mf="open"]')?.addEventListener('click',open);
 renderEpisodeDungeons();
}
window.CellboundMorrowfields={open,close,refresh:syncEntries,renderDungeons:renderEpisodeDungeons};
window.CellboundEpisodeAdapters=window.CellboundEpisodeAdapters||{};
window.CellboundEpisodeAdapters.e2_q01={start:open,authoritativeStart:true};
window.addEventListener('cellbound:view-changed',syncEntries);
const timer=setInterval(()=>{if(G()?.ready){clearInterval(timer);syncEntries();}},250);
})();
