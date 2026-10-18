(()=>{
'use strict';
const D=window.CellboundMorrowfieldsData,E=window.CellboundEpisodeTwo,G=()=>window.CellboundGame;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let record=null,busy=false,screen='loading',dialog=null,lastClue='',error='',fighting=false,returnFocus=null,accountId=null;
const q=()=>record?.account?.state?.episode2?.quests?.e2_q01;
const progress=()=>q()?.opening;
const current=()=>E.CONTENT.e2_q01.objectives[q()?.objectives.length||0];
const root=document.createElement('dialog');root.id='morrowfields';root.className='mf';root.setAttribute('aria-label','The Morrowfields');document.body.append(root);
const button=(label,action,attrs='')=>`<button type="button" data-mf="${action}" ${attrs}>${esc(label)}</button>`;
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
 // A journal click begins the quest. Visiting an already-discovered world
 // location simply resumes the server-saved stage; it never resets progress.
 if(busy)return;
 returnFocus=document.activeElement;
 if(!root.open)root.showModal();
 screen='loading';dialog=null;error='';render();
 await action(async()=>{
  await call('load');
  if(!q())await call('start');
  screen=route();
  // One continuous opening comic, no interstitial chapter launcher.
  if(screen==='intro'){
   await playComicSequence(false);
   screen=route();
  }
 });
}

function route(){
 // The next view is determined ONLY by the verified quest stage, never
 // by an old region-map or open-world location choice saved on the account.
 if(q()?.complete)return 'complete';
 const step=current()?.id;
 if(step==='transmission')return 'intro';
 if(step==='briefing')return 'briefing';
 if(step==='fenstead')return 'fenstead';
 if(step==='component'&&progress()?.recovered)return 'tessa';
 if(['wagon','creatures','component'].includes(step))return 'wagon';
 return 'fenstead';
}
function close(){if(fighting)return;root.close();returnFocus?.focus?.();}
function heading(title,kicker='THE MORROWFIELDS'){return `<header class="mf-heading"><div><small>${esc(kicker)}</small><h2 tabindex="-1">${esc(title)}</h2></div>${button('Return to game','close','aria-label="Return to game"')}</header>`;}

function scene(art,alt){
 // Environment artwork is a storytelling illustration, not a clickable map.
 return '<figure class="mf-illustration"><img src="'+esc(D.asset(art))+'" alt="'+esc(alt)+'" draggable="false"></figure>';
}
function npc(id,text,actions){const n=D.npc[id];return `<div class="mf-dialogue"><img src="${n.portrait}" alt="${esc(n.name)}"><div><small>${esc(n.role)}</small><h3>${esc(n.name)}</h3><p>${esc(text)}</p><div class="mf-actions">${actions}</div></div></div>`;}

function objective(){
 const completed=q()?.objectives.length||0,step=current();
 const label=q()?.complete?'QUEST COMPLETE':'OBJECTIVE '+Math.min(6,completed+1)+' OF 6';
 return '<section class="mf-progress" aria-label="Current quest objective"><div><small>EPISODE II · AFTER THE BREACH</small><span>'+label+'</span></div>'+
 '<strong>'+esc(q()?.complete?'Two investigations await in your Quest Journal.':step?.text||'Continue the investigation.')+'</strong>'+
 '<div class="mf-progress-track"><span style="width:'+Math.min(100,completed/6*100)+'%"></span></div></section>';
}
function storyIntro(outro=false){
 const panels=outro?D.closing:D.opening;
 const idx=Math.min(panels.length-1,outro?progress()?.outro||0:progress()?.intro||0);
 return '<div class="mf-story-intro"><img src="'+esc(panels[idx].art)+'" alt="'+esc(panels[idx].title)+'">'+
 '<div><small>ILLUSTRATED STORY · '+(idx+1)+' OF 3</small><h3>'+esc(panels[idx].title)+'</h3><p>'+esc(panels[idx].text)+'</p>'+
 button('CONTINUE THE STORY →',outro?'closing':'story')+'</div></div>';
}
async function playComicSequence(outro){
 const all=outro?D.closing:D.opening,offset=Number(outro?progress()?.outro:progress()?.intro)||0;
 if(offset>=all.length)return;
 if(!window.CellboundComicScenes?.show)throw Error('Story viewer unavailable. No quest progress has changed.');
 const reopen=root.open;
 if(reopen)root.close();
 try{
  const result=await window.CellboundComicScenes.show({
   eyebrow:'EPISODE II · INVASION ON THE FARM',
   title:outro?'Two Trails':'After the Breach',
   page:'THE MORROWFIELDS',theme:'zeltira',
   storyOnly:true,allowSkip:false,progressive:true,cinematicSequence:true,
   nextLabel:'NEXT PANEL →',continueLabel:'CONTINUE ADVENTURE →',
   panels:all.slice(offset).map(p=>({kind:'location',title:p.title,text:p.text,artwork:p.art}))
  });
  if(result?.skipped)throw Error('Story interrupted. Continue from the last saved panel.');
  // Commit each viewed panel through the original server-authoritative gate,
  // preserving revision checks and allowing resumption after failed requests.
  for(let i=offset;i<all.length;i++)await call(outro?'outro-panel':'intro-panel',{panel:i});
 }finally{if(reopen&&!root.open)root.showModal();}
}
function branches(){return `<div class="mf-branches">${['e2_q02','e2_q03'].map(id=>{const d=E.CONTENT[id];return `<article><small>INVESTIGATION DISCOVERED</small><h3>${esc(d.name)}</h3><p>${esc(d.objectives[0].text)}</p><span>Further exploration is coming soon.</span></article>`}).join('')}</div>`;}


function farm(){
 const p=progress(),arrived=p?.location==='fenstead',step=current()?.id;
 const introduction=arrived?
  npc('mara','If you have come for the harvest, you are late. If you have come for my workers, follow me. Henley never misses supper. His coat is still hanging by the door. They found the supply wagon beyond the east field; nobody found him.',
   button('WE WILL FIND THEM →','meet-mara','class="mf-primary"')):
  '<section class="mf-next"><small>THE NEXT CHAPTER</small><h3>Fenstead Farm</h3><p>Voss sends you along the east road. The farm that answered the transmission is waiting.</p>'+
  button('CONTINUE TO FENSTEAD FARM →','to-fenstead','class="mf-primary"')+'</section>';
 return scene('fenstead','The Fenstead farmhouse and wheat fields')+introduction;
}
function wagon(){
 const p=progress(),step=current()?.id,atWagon=p?.location==='wagon';
 if(!atWagon)return scene('east-fields','Fields of golden wheat leading towards the abandoned wagon')+
  '<section class="mf-next"><small>THE NEXT OBJECTIVE</small><h3>The Abandoned Wagon</h3><p>Mara leads the party into the wheat where a supply wagon disappeared. Stay together and investigate what happened.</p>'+
  button('INVESTIGATE THE WAGON →','go-wagon','class="mf-primary"')+'</section>';
 const illustration=scene('wagon','An abandoned supply wagon in the East Fields');
 if(step==='wagon'){
  const choices=D.clues.map(clue=>{
   const found=p.clues.includes(clue.id);
   return '<button type="button" data-mf="clue" data-clue="'+esc(clue.id)+'" class="mf-evidence-choice'+(found?' found':'')+'"'+(found?' disabled aria-disabled="true"':'')+'>'+
    '<span>'+(found?'✓':'◇')+'</span><strong>'+esc(clue.name)+'</strong><small>'+(found?'Recorded in your journal':'Investigate clue →')+'</small></button>';
  }).join('');
  return illustration+'<section class="mf-evidence" aria-live="polite"><div><small>INVESTIGATE THE WAGON</small><strong>'+p.clues.length+' / 4</strong></div>'+
    '<p>'+esc(lastClue||'Select each piece of evidence to uncover what happened to the missing workers.')+'</p>'+
    '<div class="mf-evidence-choices">'+choices+'</div></section>';
 }
 if(step==='creatures')return illustration+
  '<section class="mf-next mf-danger"><small>AMBUSH IN THE WHEAT</small><h3>Defend the farm</h3><p>The creatures emerge from the soil around the wagon. Your party must defeat them to continue.</p>'+
  button(record.attempt?.status==='active'?'RESUME ENCOUNTER →':'DEFEND THE FARM →','fight','class="mf-primary"')+'</section>';
 if(step==='component'&&!p.recovered)return illustration+
  '<section class="mf-next"><small>AFTER THE BATTLE</small><h3>The Null Complex insignia</h3><p>Below the axle is a strange mechanical component, entangled in living roots. Bring it to Tessa for examination.</p>'+
  button('TAKE THE COMPONENT TO TESSA →','recover','class="mf-primary"')+'</section>';
 return illustration;
}
function tessa(){
 return '<div class="mf-conclusion">'+
 scene('fenstead','Tessa Orr examines the recovered component at Fenstead Farm','')+
 npc('tessa','Put it on the bench. Carefully. That mark is from the Complex… and this thing is still listening.',
  button('DISCOVER WHERE THE SIGNAL LEADS →','closing','class="mf-primary"'))+'</div>';
}
function complete(){
 return '<div class="mf-complete"><img src="'+esc(D.closing[2].art)+'" alt="Two investigations emerge from the Morrowfields">'+
 '<div><small>EPISODE II · QUEST COMPLETE</small><h3>After the Breach</h3><p>4,300 XP for each eligible member of the party and 180 gold have been awarded and saved. Two investigation paths have opened.</p>'+
 branches()+button('VIEW YOUR NEXT QUESTS →','quest-journal','class="mf-primary"')+'</div></div>';
}


function render(){
 if(fighting)return;
 // Every quest action is sequential. No regional map, hotspots, travel
 // selector, or free-roam UI is mounted at any point in this adventure.
 const title=screen==='complete'?'Quest Complete':screen==='tessa'?'The Recovered Component':
  screen==='fenstead'?'Fenstead Farm':screen==='wagon'?'The Abandoned Wagon':'After the Breach';
 root.dataset.worldState=record?.account?.state?.episode2?.worldState||'uneasy-fields';
 let body='';
 if(!record||screen==='loading')body='<div class="mf-loading"><h3>'+(error?'The road is closed for now':'Receiving the transmission…')+'</h3><p>'+
  esc(error||'Checking your journey.')+'</p>'+(error?button('Try again','reload'):'')+'</div>';
 else if(screen==='intro')body=storyIntro();
 else if(screen==='briefing')body='<div class="mf-briefing">'+
  npc('voss','An agricultural relay outside Zeltira has activated. Nobody has serviced it in years. The signal is repeating, but it is not asking for help. I need you to find what answered it.','')+
  npc('vey','Missing workers first. Whatever Voss thinks is under that farm can wait until we know who is still alive. Mara Fen sent word: even the livestock are turning on their keepers. Take the east road. Bring people home.','')+
  button('CONTINUE TO FENSTEAD FARM →','briefing','class="mf-primary"')+'</div>';
 else if(screen==='fenstead')body=farm();
 else if(screen==='wagon')body=wagon();
 else if(screen==='tessa')body=tessa();
 else if(screen==='complete')body=complete();
 root.innerHTML=heading(title,'EPISODE II · INVASION ON THE FARM')+
  '<div class="mf-body">'+(record?objective():'')+body+
  (dialog?'<section class="mf-notice" role="status"><p>'+esc(dialog)+'</p>'+button('Return to quest','dismiss')+'</section>':'')+
  (error&&record?'<p class="mf-error" role="alert">'+esc(error)+' '+button('Reload saved progress','reload')+'</p>':'')+'</div>';
 if(busy)root.querySelectorAll('button').forEach(b=>b.disabled=true);
}
async function visit(location){await call('visit',{location});screen=route();dialog=null;}
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
 }finally{window.CellboundDungeon2D.closeShared(true);fighting=false;screen=route();if(!root.open)root.showModal();}
}


root.addEventListener('click',event=>{
 const b=event.target.closest('[data-mf]');if(!b||busy)return;
 const key=b.dataset.mf;
 if(key==='close'){close();return;}
 if(key==='reload'){record=null;open();return;}
 if(key==='quest-journal'){
  close();G().switchView('quests');
  window.CellboundQuests?.selectAdventure?.(q()?.complete?'e2_q02':'e2_q01');
  return;
 }
 action(async()=>{
  if(key==='story'){await playComicSequence(false);}
  else if(key==='closing'){await playComicSequence(true);}
  else if(key==='briefing'){await call('briefing');}
  else if(key==='to-fenstead'){await visit('fenstead');}
  else if(key==='meet-mara'){await call('meet-mara');}
  else if(key==='go-wagon'){
   // Old saved chapter locations (including 'map' and 'east-fields') are
   // honoured. The sequential transition remains verified by the server.
   if(progress()?.location!=='east-fields'&&progress()?.location!=='wagon')await visit('east-fields');
   if(progress()?.location!=='wagon')await visit('wagon');
  }else if(key==='recover'){await call('recover');}
  else if(key==='fight'){await fight();}
  else if(key==='clue'){
   const clue=D.clues.find(x=>x.id===b.dataset.clue);
   if(!clue)return;
   lastClue=clue.text;
   if(!progress().clues.includes(clue.id))await call('clue',{clue:clue.id});
  }else if(key==='dismiss')dialog=null;
  screen=route();
 });
});
root.addEventListener('cancel',e=>{if(busy||fighting)e.preventDefault();});
function renderEpisodeDungeons(){
 const host=document.getElementById('episodeTwoDungeonSlots'),s=G()?.getState?.();
 if(!host||!s)return;
 const summary=host.closest('[data-dungeon-episode="2"]')?.querySelector('summary span b');
 const available=window.CELLBOUND_SECURE_SAVES===true&&Boolean(window.CELLBOUND_EPISODE_SERVICE_URL);
 if(!available||!E.finaleCompleted(s)||s.questSystem?.nullComplex?.authoritative!==true){
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
 const account=G()?.getState?.();
 // Episode II is opened from the same Quest Journal as Episode I. Removing
 // the legacy world card prevents a second adventure or open-world entry.
 document.querySelector('#quests [data-morrowfields-entry]')?.remove();
 document.querySelector('#world [data-morrowfields-entry]')?.remove();
 if(!account)return;
 window.CellboundQuests?.render?.();
 renderEpisodeDungeons();
}
window.CellboundMorrowfields={open,close,refresh:syncEntries,renderDungeons:renderEpisodeDungeons};
window.CellboundEpisodeAdapters=window.CellboundEpisodeAdapters||{};
window.CellboundEpisodeAdapters.e2_q01={start:open,authoritativeStart:true};
window.addEventListener('cellbound:view-changed',syncEntries);
const timer=setInterval(()=>{if(G()?.ready){clearInterval(timer);syncEntries();}},250);
})();
