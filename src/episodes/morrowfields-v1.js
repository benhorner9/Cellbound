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
 if(q()?.complete)return'complete';
 const step=current()?.id,p=progress();
 if(step==='transmission')return'intro';
 if(step==='briefing')return'briefing';
 if(step==='fenstead')return p?.location==='fenstead'?'fenstead':'approach';
 if(step==='component'&&p?.recovered)return'tessa';
 if(['wagon','creatures','component'].includes(step)){
  if(p?.location==='wagon')return'wagon';
  if(p?.location==='east-fields')return'east-fields';
  return'fenstead';
 }
 return'fenstead';
}
function close(){if(fighting)return;root.close();returnFocus?.focus?.();}
function heading(title,kicker='THE MORROWFIELDS'){return `<header class="mf-heading"><div><small>${esc(kicker)}</small><h2 tabindex="-1">${esc(title)}</h2></div>${button('Return to game','close','aria-label="Return to game"')}</header>`;}
function scene(art,alt,hotspots,kind=''){return `<div class="mf-scene ${kind}" style="--mf-art:url('${D.asset(art)}')"><img src="${D.asset(art)}" alt="${esc(alt)}" draggable="false"><div class="mf-hotspots">${hotspots}</div></div>`;}
function spot(name,action,x,y,extra='',locked=false){return button(name,action,`class="mf-spot ${locked?'is-locked':''}" style="--x:${x}%;--y:${y}%" ${extra}`);}
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

function map(){
 return '<div class="mf-map-header"><p>The regional map is optional. Your current quest objective remains available at any time.</p>'+
 button('RETURN TO QUEST →','objective','class="mf-primary"')+'</div>'+
 scene('map','The Morrowfields: farms, orchard, canals and distant harvest facilities',
  D.locations.map(l=>spot(l.name,'location',l.x,l.y,'data-location="'+l.id+'"',!l.ready)).join(''),'mf-map')+
 '<p class="mf-map-note">Other regions open as you progress through the expansion.</p>';
}
function farm(){
 const step=current()?.id,p=progress();
 const story=step==='fenstead'?npc('mara','If you have come for the harvest, you are late. If you have come for my workers, follow me. Henley never misses supper. His coat is still hanging by the door. They found the supply wagon beyond the east field; nobody found him.',button('WE WILL FIND THEM →','meet-mara','class="mf-primary"')):
 ['wagon','creatures','component'].includes(step)?'<div class="mf-next"><small>FOLLOW THE INVESTIGATION</small><h3>The wagon beyond the East Fields</h3><p>Mara knows where the missing workers were last seen.</p>'+button('FOLLOW MARA TO THE WAGON →','follow-wagon','class="mf-primary"')+'</div>':'';
 return scene('fenstead','Fenstead Farm courtyard, farmhouse, barn and supply storage',[
  spot('Mara · Farmhouse','mara',23,34),
  spot('Tessa · Barn','tessa',70,29),
  spot('Supplies','supplies',83,64),
  spot('East Fields →','follow-wagon',65,12)
 ].join(''))+story+'<div class="mf-secondary-actions">'+button('Explore regional map','map')+button('Party and equipment','equipment')+'</div>';
}
function wagon(){
 const p=progress(),step=current()?.id;
 const investigating=step==='wagon';
 const clues=investigating?scene('wagon','Broken wagon with wheel tracks, torn supply container, disturbed soil and a mechanical fragment',
  D.clues.map(clue=>spot((p.clues.includes(clue.id)?'✓ ':'')+clue.name,'clue',clue.x,clue.y,
   'data-clue="'+clue.id+'" '+(p.clues.includes(clue.id)?'disabled aria-label="Clue already recorded: '+esc(clue.name)+'"':''))).join('')):'';
 const progressNote=investigating?'<section class="mf-evidence" aria-live="polite"><div><small>EVIDENCE COLLECTED</small><strong>'+p.clues.length+' / 4</strong></div>'+
 '<p>'+esc(lastClue||'Inspect the four clues at the wagon. Your discoveries are saved as you go.')+'</p>'+
 '<div class="mf-evidence-list">'+D.clues.map(clue=>'<span class="'+(p.clues.includes(clue.id)?'found':'')+'">'+
 (p.clues.includes(clue.id)?'✓ ':'◇ ')+esc(clue.name)+'</span>').join('')+'</div></section>':'';
 const confrontation=step==='creatures'?'<section class="mf-next mf-danger"><small>THE WHEAT IS MOVING</small><h3>Protect the farm</h3><p>Mara steps back. Something is crawling out from beneath the wagon.</p>'+
 button(record.attempt?.status==='active'?'RESUME ENCOUNTER →':'DEFEND THE FARM →','fight','class="mf-primary"')+'</section>':'';
 const recovery=step==='component'&&!p.recovered?'<section class="mf-next"><small>AFTER THE ENCOUNTER</small><h3>A familiar insignia</h3><p>The creatures fall still. Under the axle is a component bearing the Null Complex mark.</p>'+
 button('TAKE THE COMPONENT TO TESSA →','recover','class="mf-primary"')+'</section>':'';
 return (clues||scene('wagon','The farm wagon where the creatures emerged',''))+
 progressNote+confrontation+recovery+
 '<div class="mf-secondary-actions">'+button('Return to Fenstead','visit','data-location="fenstead"')+
 button('Regional map','map')+'</div>';
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
 branches()+button('VIEW YOUR NEXT QUESTS →','quest-journal','class="mf-primary"')+
 '<div class="mf-secondary-actions">'+button('Explore Fenstead Farm','explore')+'</div></div></div>';
}

function render(){
 if(fighting)return;
 const title=screen==='complete'?'Quest Complete':screen==='tessa'?'The Recovered Component':
  screen==='fenstead'?'Fenstead Farm':screen==='wagon'?'The Broken Wagon':
  screen==='east-fields'?'East Fields':screen==='map'?'The Morrowfields':'After the Breach';
 root.dataset.worldState=record?.account?.state?.episode2?.worldState||'uneasy-fields';
 let body='';
 if(!record||screen==='loading')body='<div class="mf-loading"><h3>'+(error?'The road is closed for now':'Receiving the transmission…')+'</h3><p>'+esc(error||'Checking your journey.')+'</p>'+(error?button('Try again','reload'):'')+'</div>';
 else if(screen==='intro')body=storyIntro();
 else if(screen==='approach')body='<div class="mf-next"><h3>The road to Fenstead</h3><p>Follow the transmission beyond Zeltira and meet the farmer who sent for help.</p>'+
  button('TRAVEL TO FENSTEAD FARM →','to-fenstead','class="mf-primary"')+'</div>';
 else if(screen==='briefing')body='<div class="mf-briefing">'+
  npc('voss','An agricultural relay outside Zeltira has activated. Nobody has serviced it in years. The signal is repeating, but it is not asking for help. I need you to find what answered it.','')+
  npc('vey','Missing workers first. Whatever Voss thinks is under that farm can wait until we know who is still alive. Mara Fen sent word: even the livestock are turning on their keepers. Take the east road. Bring people home.','')+
  button('TRAVEL TO FENSTEAD FARM →','briefing','class="mf-primary"')+'</div>';
 else if(screen==='map')body=map();
 else if(screen==='fenstead')body=farm();
 else if(screen==='east-fields')body=scene('east-fields','The wheat fields beyond Fenstead and the abandoned wagon',
  spot('Investigate the wagon →','visit',83,27,'data-location="wagon"'))+
  '<div class="mf-next">'+button('INVESTIGATE THE ABANDONED WAGON →','visit','class="mf-primary" data-location="wagon"')+'</div>';
 else if(screen==='wagon')body=wagon();
 else if(screen==='tessa')body=tessa();
 else if(screen==='outro')body=storyIntro(true);
 else if(screen==='complete')body=complete();
 root.innerHTML=heading(title,'EPISODE II · INVASION ON THE FARM')+
 '<div class="mf-body">'+(record?objective():'')+body+
 (dialog?'<section class="mf-notice" role="status"><p>'+esc(dialog)+'</p>'+button('Back to exploring','dismiss')+'</section>':'')+
 (error&&record?'<p class="mf-error" role="alert">'+esc(error)+' '+button('Reload saved progress','reload')+'</p>':'')+'</div>';
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
 if(key==='equipment'){close();G().switchView('roster');return;}
 action(async()=>{
  if(key==='story'){
   await playComicSequence(false);screen=route();
  }else if(key==='closing'){
   await playComicSequence(true);screen=route();
  }else if(key==='briefing'){
   await call('briefing');await call('visit',{location:'fenstead'});screen=route();
  }else if(key==='to-fenstead'){
   await visit('fenstead');screen=route();
  }else if(key==='meet-mara'){
   await call('meet-mara');screen=route();
  }else if(key==='follow-wagon'){
   // Preserve the two server-authorised travel transitions but make them
   // one purposeful player action instead of three separate navigation pages.
   await visit('east-fields');await visit('wagon');screen=route();
  }else if(key==='recover'){
   await call('recover');screen=route();
  }else if(key==='fight'){
   await fight();screen=route();
  }else if(key==='visit'){
   await visit(b.dataset.location);screen=route();
  }else if(key==='map'){
   screen='map';dialog=null;
  }else if(key==='objective'){
   screen=route();dialog=null;
  }else if(key==='explore'){
   screen='fenstead';dialog=null;
  }else if(key==='location'){
   const l=D.locations.find(x=>x.id===b.dataset.location);
   if(!l)return;
   if(!l.ready){dialog=l.name+' — '+l.description+' '+(E.CONTENT[l.requires]?'Requires '+E.CONTENT[l.requires].name+'. ':'')+'This route is not open for exploration yet.';}
   else if(l.id==='fenstead'){await visit('fenstead');screen='fenstead';dialog=null;}
   else if(l.id==='east-fields'){
    if(current()?.id==='fenstead')dialog='Speak to Mara Fen first.';
    else{await visit('east-fields');screen='east-fields';dialog=null;}
   }
  }else if(key==='clue'){
   const clue=D.clues.find(x=>x.id===b.dataset.clue);
   if(!clue)return;
   lastClue=clue.text;
   if(!progress().clues.includes(clue.id))await call('clue',{clue:clue.id});
   screen=route();
  }else if(key==='mara'){
   dialog=q().complete?'“Keep that lamp lit,” Mara says. “I want Henley to see the house when he comes back.”':
    '“I should have told everyone to stay inside the fence,” Mara says.';
  }else if(key==='tessa'){
   dialog='Tessa is preparing a resonance meter in the barn. Bring her anything that does not belong in the fields.';
  }else if(key==='supplies'){
   dialog='Feed sacks, clean water and blankets for the missing workers. Your supplies remain in your existing inventory.';
  }else if(key==='dismiss'){
   dialog=null;
  }
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
 const s=G()?.getState?.(),parent=document.getElementById('world');
 if(!s)return;
 // Refresh the existing Quest Journal after the authoritative episode snapshot
 // and once this quest's shared adapter has registered on initial page load.
 window.CellboundQuests?.render?.();
 const available=window.CELLBOUND_SECURE_SAVES===true&&Boolean(window.CELLBOUND_EPISODE_SERVICE_URL);
 const eligible=E.finaleCompleted(s)&&s.questSystem?.nullComplex?.authoritative===true,started=Boolean(s.episode2?.quests?.e2_q01?.startedAt);
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
