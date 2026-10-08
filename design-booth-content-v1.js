(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const templates=new Map(),published=new Map();
let loading=null,playing=false,lastRefresh=0,activeSession=0;
const db=()=>window.CellboundGame?.getSupabase?.();
const isOwner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&window.CellboundAdmin?.role==='owner';
const artUrl=path=>path&&db()?.storage?.from('cellbound-design-art').getPublicUrl(path)?.data?.publicUrl||'';
const safeUrl=url=>/^https:\/\//i.test(String(url||''))?String(url):'';
function registerMinigame(template){
 if(!template||!/^[a-z0-9-]{3,64}$/.test(template.id)||typeof template.play!=='function')throw new Error('A minigame needs an ID and a playable handler.');
 if(templates.has(template.id))throw new Error('Duplicate minigame template '+template.id);
 templates.set(template.id,template);return template.id
}
const choicesFor=step=>(Array.isArray(step.choices)&&step.choices.length>=2?step.choices:['Left','Centre','Right']).slice(0,5).map(x=>String(x||'Option').slice(0,90));
function modal(step,body,actions=''){
 const overlay=$('#designAdventureOverlay');
 if(!overlay)return null;
 const art=safeUrl(artUrl(step.artPath));
 overlay.hidden=false;
 overlay.innerHTML='<section class="dbo-player-panel"><header><small>CELLBOUND · '+esc(step.type||'stage')+'</small><b>'+esc(step.title||'Encounter')+'</b><button type="button" data-db-quit>EXIT ×</button></header>'+
 (art?'<img src="'+esc(art)+'" alt="" draggable="false">':'')+
 '<div class="dbo-player-body">'+(step.text?'<p>'+esc(step.text)+'</p>':'')+body+'</div>'+
 '<footer>'+actions+'</footer></section>';
 overlay.querySelector('[data-db-quit]')?.addEventListener('click',()=>stop());
 return overlay
}
function stop(){
 activeSession++;playing=false;const overlay=$('#designAdventureOverlay');if(overlay){overlay.hidden=true;overlay.innerHTML=''}
 document.body.classList.remove('dbo-adventure-open');
 window.CellboundComicScenes?.close?.();
}
async function choiceMinigame(step){
 return await new Promise(resolve=>{
  const picks=choicesFor(step),answer=Math.max(0,Math.min(picks.length-1,Number(step.answer)||0));
  let attempts=0,done=false;
  const view=msg=>{
   const overlay=modal(step,'<h3>'+esc(step.prompt||'Choose the correct answer')+'</h3><div class="dbo-picks">'+picks.map((c,i)=>'<button type="button" data-db-pick="'+i+'">'+esc(c)+'</button>').join('')+'</div><p role="status" class="dbo-feedback">'+esc(msg||'')+'</p>');
   if(!overlay){resolve(false);return}
   overlay.querySelectorAll('[data-db-pick]').forEach(btn=>btn.addEventListener('click',()=>{
    if(done)return;
    attempts++;
    if(Number(btn.dataset.dbPick)===answer){done=true;overlay.querySelector('.dbo-feedback').textContent='Correct. The path is open.';overlay.querySelectorAll('[data-db-pick]').forEach(x=>x.disabled=true);const footer=overlay.querySelector('footer');footer.innerHTML='<button type="button" class="primary" data-db-done>CONTINUE →</button>';footer.querySelector('button').onclick=()=>resolve(true)}
    else{overlay.querySelector('.dbo-feedback').textContent='Not quite. Try another choice. ('+attempts+' attempts)'}
   }))
  };
  view()
 })
}
async function sequenceMinigame(step){
 return await new Promise(resolve=>{
  const picks=choicesFor(step),target=(Array.isArray(step.sequence)&&step.sequence.length?step.sequence:[0,1,2]).map(Number).filter(i=>i>=0&&i<picks.length).slice(0,8);
  if(!target.length)return resolve(false);
  let progress=0;
  const view=()=>{
   const overlay=modal(step,'<h3>'+esc(step.prompt||'Activate the symbols in the correct sequence')+'</h3><p class="dbo-progress">Symbols activated: '+progress+' / '+target.length+'</p><div class="dbo-picks">'+picks.map((c,i)=>'<button type="button" data-db-pick="'+i+'">'+esc(c)+'</button>').join('')+'</div><p role="status" class="dbo-feedback"></p>');
   if(!overlay){resolve(false);return}
   overlay.querySelectorAll('[data-db-pick]').forEach(btn=>btn.addEventListener('click',()=>{
    if(Number(btn.dataset.dbPick)===target[progress]){progress++;if(progress===target.length){
      overlay.querySelectorAll('[data-db-pick]').forEach(x=>x.disabled=true);overlay.querySelector('.dbo-feedback').textContent='Sequence complete.';overlay.querySelector('footer').innerHTML='<button class="primary" type="button" data-db-done>CONTINUE →</button>';overlay.querySelector('[data-db-done]').onclick=()=>resolve(true)
     }else view()
    }else{progress=0;view();overlay.querySelector('.dbo-feedback').textContent='The sequence resets. Try again.'}
   }))
  };view()
 })
}
registerMinigame({id:'choice',label:'Choice Puzzle',description:'Find the correct symbol, lever or route.',play:choiceMinigame});
registerMinigame({id:'sequence',label:'Sequence Puzzle',description:'Press symbols in the correct order.',play:sequenceMinigame});
function cleanBlueprint(x){
 const b=x&&typeof x==='object'?x:{};
 return{version:1,summary:String(b.summary||'').slice(0,500),level:Math.max(1,Math.min(75,Number(b.level)||1)),
  steps:(Array.isArray(b.steps)?b.steps:[]).slice(0,30).map(s=>({
   id:String(s.id||'step').slice(0,70),type:['comic','room','fight','minigame'].includes(s.type)?s.type:'room',
   title:String(s.title||'Untitled stage').slice(0,100),text:String(s.text||'').slice(0,1500),artPath:String(s.artPath||'').slice(0,255),
   panels:(Array.isArray(s.panels)?s.panels:[]).slice(0,6).map(p=>({title:String(p.title||'').slice(0,100),text:String(p.text||'').slice(0,550),artPath:String(p.artPath||'').slice(0,255)})),
   enemies:String(s.enemies||'Enemy').slice(0,280),enemyHealth:Math.max(30,Math.min(50000,Number(s.enemyHealth)||750)),
   mechanic:['none','circle','line','interrupt','adds'].includes(s.mechanic)?s.mechanic:'none',template:String(s.template||'choice').slice(0,64),
   prompt:String(s.prompt||'').slice(0,300),choices:choicesFor(s),answer:Math.max(0,Number(s.answer)||0),
   sequence:(Array.isArray(s.sequence)?s.sequence:[0,1,2]).slice(0,8).map(n=>Math.max(0,Number(n)||0))
  }))}
}
async function refresh(force=false){
 if(loading)return loading;
 if(!db()||!window.CellboundGame?.ready)return false;
 if(!force&&Date.now()-lastRefresh<20000)return true;
 loading=(async()=>{
  const {data,error}=await db().from('cellbound_design_blueprints').select('id,slug,title,content_type,blueprint,version,published_at').eq('status','published').order('updated_at',{ascending:false});
  if(error)throw error;
  published.clear();(data||[]).forEach(row=>published.set(row.id,row));lastRefresh=Date.now();return true
 })().finally(()=>{loading=null});
 try{return await loading}catch(error){console.warn('Published Design Booth adventures unavailable:',error);return false}
}
function mountCards(type){
 const host=$('#designBoothAdventures-'+type);if(!host)return;
 const rows=[...published.values()].filter(x=>x.content_type===type);
 host.hidden=!rows.length;
 if(!rows.length){host.innerHTML='';return}
 host.innerHTML='<div class="dbo-public-head"><small>DESIGN BOOTH ADVENTURES</small><h3>New '+(type==='quest'?'Quests':type==='dungeon'?'Dungeons':'Raids')+'</h3><p>Created with the Cellbound Design Booth. No gear, currency or quest progression rewards are granted by custom content yet.</p></div><div class="dbo-public-grid">'+rows.map(r=>'<article><small>'+esc(type.toUpperCase())+' · '+cleanBlueprint(r.blueprint).steps.length+' STAGES</small><h4>'+esc(r.title)+'</h4><p>'+esc(cleanBlueprint(r.blueprint).summary)+'</p><button type="button" data-db-play="'+esc(r.id)+'">PLAY ADVENTURE →</button></article>').join('')+'</div>';
 host.querySelectorAll('[data-db-play]').forEach(btn=>btn.onclick=()=>play(btn.dataset.dbPlay))
}
function renderCards(){mountCards('quest');mountCards('dungeon');mountCards('raid')}
async function play(id,override=null){
 if(playing)return;
 const row=override||published.get(id);if(!row)return;
 const b=cleanBlueprint(row.blueprint||row.draft_blueprint);
 if(!b.steps.length){alert('This adventure has no playable stages.');return}
 const party=window.CellboundGame?.getPartyCharacters?.()||[];
 if(party.length!==5){alert('Build a five-character party before entering.');return}
 if(party.some(c=>Number(c.level||1)<b.level)){alert('Every character must be at least level '+b.level+'.');return}
 const token=++activeSession;let completed=true;playing=true;document.body.classList.add('dbo-adventure-open');
 try{
  for(let i=0;i<b.steps.length;i++){
   if(token!==activeSession)return;
   const step=b.steps[i],roomImg=safeUrl(artUrl(step.artPath));
   if(step.type==='comic'){
    const panels=(step.panels?.length?step.panels:[{title:step.title,text:step.text,artPath:step.artPath}]).map(p=>({kind:'location',title:p.title||step.title,text:p.text||step.text,artwork:safeUrl(artUrl(p.artPath||step.artPath))}));
    const result=await window.CellboundComicScenes?.show?.({eyebrow:String(row.content_type).toUpperCase()+' · '+(i+1)+' / '+b.steps.length,title:step.title,subtitle:row.title,page:'STORY',theme:'zeltira',panels,storyOnly:true,allowSkip:true});
    if(token!==activeSession)return
   }else if(step.type==='fight'){
    const enemies=step.enemies.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean).slice(0,5);
    const encounter={kind:enemies.length===1?'boss':'trash',level:b.level,enemyHealth:step.enemyHealth,mechanics:step.mechanic==='none'?[]:[{name:({'circle':'Ground Burst','line':'Sweeping Attack','interrupt':'Dangerous Cast','adds':'Reinforcements'})[step.mechanic]||'Mechanic',type:step.mechanic==='adds'?'adds':step.mechanic,duration:1600}],mechanicIntervalMs:step.mechanic==='none'?0:3600};
    const markup=roomImg?'<div class="dbo-combat-art"><img src="'+esc(roomImg)+'" alt="" draggable="false"></div>':'';
    const won=await window.CellboundQuests?.runQuest2DFight?.({quest:row.title,title:step.title,location:row.title,ambience:step.text,presentationKind:row.content_type==='quest'?'quest':'dungeon',enemies:enemies.length?enemies:['Enemy'],environmentMarkup:markup,combat,noLossPenalty:true,autoContinueOnVictory:true,autoContinueDelayMs:650,completeText:'The way ahead is clear.'});
    if(token!==activeSession)return;
    if(won!==true){completed=false;break}
   }else if(step.type==='minigame'){
    const puzzle=templates.get(step.template)||templates.get('choice');
    const cleared=await puzzle.play(step);
    if(token!==activeSession||!cleared)return
   }else{
    const done=await new Promise(resolve=>{
     const root=modal(step,'<span class="dbo-stage-count">STAGE '+(i+1)+' OF '+b.steps.length+'</span>','<button class="primary" type="button" data-db-advance>CONTINUE →</button>');
     if(!root)return resolve(false);
     root.querySelector('[data-db-advance]').onclick=()=>resolve(true);
    });
    if(token!==activeSession||!done)return
   }
  }
  if(token===activeSession)await new Promise(resolve=>{
   const end=modal({title:completed?'Adventure complete':'Adventure ended',type:row.content_type,text:completed?'You reached the end of '+row.title+'. This design-booth adventure is currently reward-free.':'Your party did not clear the encounter. Return when you are ready.'},'<h3>'+(completed?'RUN COMPLETE':'RUN FAILED')+'</h3>','<button type="button" class="primary" data-db-finish>RETURN TO GAME →</button>');
   if(!end)return resolve();
   end.querySelector('[data-db-finish]').onclick=resolve
  })
 }catch(e){console.error('Designed adventure failed',e);alert('Adventure could not continue: '+(e?.message||e))}
 finally{if(token===activeSession)stop()}
}
function bind(){
 window.addEventListener('cellbound:view-changed',()=>{if(Date.now()-lastRefresh>20000)refresh().then(renderCards);else renderCards()});
 window.addEventListener('cellbound:design-published',()=>refresh(true).then(renderCards));
 const boot=async()=>{for(let i=0;i<80&&!window.CellboundGame?.ready;i++)await new Promise(r=>setTimeout(r,150));await refresh();renderCards()};
 boot()
}
window.CellboundDesignedContent={refresh,renderCards,play,stop,cleanBlueprint,artUrl,registerMinigame,templates:()=>[...templates.values()].map(({id,label,description})=>({id,label,description}))};
bind()
})();