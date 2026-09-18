(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,selectedTab='active',selectedQuest=null,encounterToken=0;

const CHAIN='echoes-beneath-zeltira';
const QUESTS=[
 {id:'letter-in-glass',chapter:'I',title:'The Letter in Glass',giver:'Bram Kel · Zeltira Road Survey',summary:'A road crew uncovered a black shard fused into the stone beneath Zeltira. It hums like a Cell, but no living creature is attached to it.',objective:'Read Bram Kel’s report and hear Cellwright Tessa Orr’s assessment.',why:'This is the first evidence that Cell energy is moving through places where no living Cell should exist.',reward:'Opens the investigation',unlock:'The Blackened Fragment'},
 {id:'living-resonance',chapter:'I',title:'A Living Resonance',giver:'Tessa Orr · Cellwright',summary:'The fragment stays inert in Tessa’s instruments. It reacts only when brought close to a living Cellbound adventurer.',objective:'Choose one member of your active company to carry the fragment.',why:'Your choice makes one of your real adventurers part of the story. That character must be present when the fragment is tested in dangerous places.',reward:'+40 Guild Renown',unlock:'Bearer assigned'},
 {id:'ash-makes-it-sing',chapter:'I',title:'Ash Makes It Sing',giver:'Tessa Orr · Cellwright',summary:'Tessa believes the Vaultheart emits the same broken frequency trapped inside the fragment.',objective:'Clear The Ashen Vault with the chosen Bearer in the active five.',why:'This turns an existing dungeon into part of the investigation. The fragment is not asking you to farm a boss; it needs a specific resonance only the Vaultheart can provide.',reward:'+120 Gold · +60 Renown',unlock:'Resonance Map'},
 {id:'road-under-road',chapter:'I',title:'The Road Under the Road',giver:'Bram Kel · Zeltira Road Survey',summary:'After the Vaultheart fell, thin silver lines appeared inside the fragment. They form a route beneath the old east road.',objective:'Follow the hidden route and survive what is waiting below.',why:'This is a bespoke quest encounter. The route leads somewhere that does not appear on any Zeltiran survey.',reward:'+80 Renown',unlock:'Sealed location discovered'},
 {id:'door-that-breathed',chapter:'I',title:'The Door That Breathed',giver:'Tessa Orr · Cellwright',summary:'The route ends at a sealed stone door that exhales cold air in a steady rhythm. The fragment is vibrating hard enough to crack its casing.',objective:'Decide to break the seal and open the way beneath Zeltira.',why:'This is the campaign payoff: the story permanently adds a new dungeon and a new reagent source to your guild’s world.',reward:'+250 Gold · +150 Renown',unlock:'NEW DUNGEON · The Hollow Sanctum'}
];

const qdef=id=>QUESTS.find(q=>q.id===id);
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];

function ensure(){
 const s=state();if(!s)return null;
 if(!s.questSystem||s.questSystem.version!==1){
   s.questSystem={version:1,chain:CHAIN,started:false,current:'letter-in-glass',completed:[],flags:{hollowSanctumUnlocked:false,hollowFirstClear:false},bearerId:null,bearerName:null,ashenBaseline:Number(s.dungeonCompletions)||0,history:[],startedAt:null};
   Game.save?.();
 }
 const q=s.questSystem;
 q.completed=Array.isArray(q.completed)?q.completed:[];
 q.flags=q.flags||{};
 q.history=Array.isArray(q.history)?q.history:[];
 return q;
}
function completed(id){return ensure()?.completed?.includes(id)}
function current(){const q=ensure();return q?.started?q.current:null}
function isUnlocked(id){
 const idx=QUESTS.findIndex(q=>q.id===id);if(idx===0)return true;
 return QUESTS.slice(0,idx).every(q=>completed(q.id));
}
function addHistory(text){const q=ensure();q.history.push({at:new Date().toISOString(),text});q.history=q.history.slice(-30)}
async function commit(){Game.save?.();await Game.persistState?.();Game.renderAll?.();render();window.CellboundHollowSanctum?.renderCard?.()}

function reward(gold=0,renown=0){
 const s=state();s.gold=(Number(s.gold)||0)+gold;s.renown=(Number(s.renown)||0)+renown;
}
async function finishQuest(id,next,{gold=0,renown=0,note=''}={}){
 const q=ensure();if(!q||completed(id))return;
 q.completed.push(id);if(note)addHistory(note);reward(gold,renown);
 q.current=next||null;selectedQuest=next||id;
 state().activity.push('Quest complete: '+qdef(id).title+'.');
 await commit();
 flashQuest(id,next);
}
function flashQuest(doneId,nextId){
 const root=questToast(),done=qdef(doneId),next=qdef(nextId);
 root.innerHTML='<small>QUEST COMPLETE</small><h3>'+esc(done.title)+'</h3><p>'+esc(done.reward)+'</p>'+(next?'<div><span>NEXT</span><b>'+esc(next.title)+'</b></div>':'');
 root.hidden=false;clearTimeout(root._hide);root._hide=setTimeout(()=>root.hidden=true,4200)
}
function questToast(){
 let e=$('#questToast');if(e)return e;e=document.createElement('div');e.id='questToast';e.className='quest-toast';e.hidden=true;document.body.appendChild(e);return e;
}

function showDialogue(title,speaker,beats,onDone){
 let root=$('#questDialogue');if(!root){root=document.createElement('div');root.id='questDialogue';root.className='quest-dialogue-backdrop';root.hidden=true;document.body.appendChild(root)}
 let index=0;
 const draw=()=>{
   root.innerHTML='<section class="quest-dialogue"><div class="quest-dialogue-portrait">'+esc(speaker.split(' ')[0][0]+(speaker.split(' ')[1]?.[0]||''))+'</div><div><small>'+esc(speaker)+'</small><h3>'+esc(title)+'</h3><p>'+esc(beats[index])+'</p><div class="quest-dialogue-progress">'+beats.map((_,i)=>'<i class="'+(i<=index?'active':'')+'"></i>').join('')+'</div><button data-next>'+(index===beats.length-1?'CONTINUE →':'NEXT →')+'</button></div></section>';
   root.querySelector('[data-next]').onclick=async()=>{if(index<beats.length-1){index++;draw();return}root.hidden=true;if(onDone)await onDone()};
 };
 draw();root.hidden=false;
}
async function startCampaign(){
 const q=ensure();
 if(!q.started){q.started=true;q.startedAt=new Date().toISOString();q.current='letter-in-glass';selectedQuest='letter-in-glass';addHistory('A glass-sealed letter from Bram Kel arrived at the guild.');await commit()}
 if(q.current!=='letter-in-glass'||completed('letter-in-glass'))return;
 showDialogue('The Letter in Glass','Bram Kel',[
  'We were cutting a drainage channel beneath the east road when the pick struck something black. Not ore. Not stone. It was warm.',
  'By nightfall the shard had started humming. Every Cellbound worker on the road said they could feel it through their teeth.',
  'I sent it to Tessa Orr. She asked for your guild by name. Whatever we dug up, she does not want it left beneath the road.'
 ],()=>showDialogue('A Piece That Shouldn’t Exist','Tessa Orr',[
  'It is shaped like Cell glass, but there is no biological structure inside it. It should be dead material.',
  'My instruments register nothing. Put an adventurer beside it and the signal returns immediately.',
  'I need one of your people to carry it. If it reacts again, we may finally learn what is underneath Zeltira.'
 ],()=>finishQuest('letter-in-glass','living-resonance')));
}

async function chooseBearer(id){
 const q=ensure(),c=state()?.roster?.find(x=>x.id===id);if(!q||q.current!=='living-resonance'||!c)return;
 q.bearerId=c.id;q.bearerName=c.name;q.ashenBaseline=Number(state().dungeonCompletions)||0;q.ashTestStartedAt=new Date().toISOString();
 addHistory(c.name+' accepted the Blackened Fragment.');
 await finishQuest('living-resonance','ash-makes-it-sing',{renown:40,note:c.name+' became the Bearer of the fragment.'});
}
function latestAshenClear(){
 const q=ensure(),hist=Array.isArray(state()?.dungeonHistory)?state().dungeonHistory:[];
 return hist.find(h=>h.result==='complete'&&Array.isArray(h.partyIds)&&h.partyIds.includes(q.bearerId)&&(!q.ashTestStartedAt||new Date(h.at)>=new Date(q.ashTestStartedAt)));
}
async function checkAshenProgress(detail){
 const q=ensure();if(!q||q.current!=='ash-makes-it-sing')return;
 const ids=detail?.partyIds||[];
 const validEvent=detail?.id==='ashen-vault'&&ids.includes(q.bearerId);
 const validHistory=latestAshenClear();
 if(!validEvent&&!validHistory)return;
 showDialogue('The Fragment Wakes','Tessa Orr',[
  (q.bearerName||'The Bearer')+' brought it back hot enough to scorch the wrapping.',
  'The Vaultheart did not charge it. It made it remember.',
  'These lines are not cracks. They are a map — and the route begins beneath the old east road.'
 ],()=>finishQuest('ash-makes-it-sing','road-under-road',{gold:120,renown:60,note:'The Vaultheart resonance revealed a map inside the Blackened Fragment.'}));
}
function openAshen(){
 const q=ensure();if(q.current==='ash-makes-it-sing'&&!q.ashTestStartedAt){q.ashTestStartedAt=new Date().toISOString();Game.save?.()}
 Game.switchView?.('content');
}

/* Short bespoke story encounter */
function encounterRoot(){
 let r=$('#questEncounterBackdrop');if(r)return r;r=document.createElement('div');r.id='questEncounterBackdrop';r.className='qe-backdrop';r.hidden=true;document.body.appendChild(r);return r;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function qeUnit(root,id,label,cls,x,y){
 const e=document.createElement('div');e.className='qe-unit '+cls;e.dataset.qe=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span><em><i></i></em>';root.appendChild(e);return e
}
function qeMove(id,x,y,ms=650){const e=$('[data-qe="'+id+'"]');if(!e)return;e.style.transitionDuration=ms+'ms';e.style.left=x+'%';e.style.top=y+'%'}
function qeFeed(text){const e=$('#qeFeed');if(e){const p=document.createElement('p');p.textContent=text;e.prepend(p);while(e.children.length>7)e.lastElementChild.remove()}}
function qeTele(type,label){
 const layer=$('#qeTelegraphs');if(!layer)return;
 const e=document.createElement('div');e.className='qe-tele '+type;e.innerHTML='<span>'+esc(label)+'</span>';layer.appendChild(e);setTimeout(()=>e.classList.add('impact'),900);setTimeout(()=>e.remove(),1450)
}
async function beginInvestigation(){
 const q=ensure(),p=party();if(q.current!=='road-under-road')return;
 if(p.length!==5){alert('Build a complete five-character party before following the route.');Game.switchView?.('party');return}
 const token=++encounterToken,root=encounterRoot();root.hidden=false;document.body.classList.add('qe-open');
 root.innerHTML='<section class="qe-shell"><header><div><small>QUEST ENCOUNTER · ECHOES BENEATH ZELTIRA</small><h2>The Road Under the Road</h2></div><button data-qe-close>×</button></header><div class="qe-body"><main><div class="qe-arena"><div class="qe-floor"></div><div class="qe-props"><i></i><i></i><i></i><i></i></div><div id="qeTelegraphs"></div><div id="qeUnits"></div><div class="qe-location"><b>Collapsed Survey Tunnels</b><small>The fragment is pulling the party east.</small></div></div><div class="qe-feed" id="qeFeed"></div></main><aside><small>INVESTIGATION PARTY</small><div class="qe-party">'+p.map(c=>'<div><i class="'+(Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps')+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span></div>').join('')+'</div><div class="qe-objective"><small>CURRENT OBJECTIVE</small><b id="qeObjective">Follow the resonance.</b><p>The fragment grows warmer as you descend.</p></div></aside></div></section>';
 root.querySelector('[data-qe-close]').onclick=()=>{if(confirm('Leave the investigation? Progress in this encounter will be lost.')){encounterToken++;root.hidden=true;document.body.classList.remove('qe-open')}};
 const layer=$('#qeUnits'),roles=p.map(c=>Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps');
 p.forEach((c,i)=>qeUnit(layer,'p'+i,c.name,'party '+roles[i],8,30+i*10));
 qeFeed('The party enters the collapsed works beneath the east road.');
 await wait(700);if(token!==encounterToken)return;
 p.forEach((c,i)=>qeMove('p'+i,28,30+i*10,900));$('#qeObjective').textContent='Reach the buried junction.';await wait(1300);
 ['Hollow Scavenger','Hollow Scavenger','Resonance Husk'].forEach((n,i)=>qeUnit(layer,'e'+i,n,'enemy '+(i===2?'elite':''),92,35+i*15));
 qeFeed('Movement ahead. Three shapes pull themselves out of the old masonry.');
 p.forEach((c,i)=>qeMove('p'+i,42,30+i*10,700));['e0','e1','e2'].forEach((id,i)=>qeMove(id,68,35+i*15,700));$('#qeObjective').textContent='Survive the buried things.';await wait(1200);
 qeTele('line','RESONANCE LASH');qeFeed('The Husk draws a bright line through the tunnel. The party breaks formation.');
 p.forEach((c,i)=>{if(i%2)qeMove('p'+i,46,18+i*12,500)});await wait(1500);
 qeFeed((q.bearerName||'The Bearer')+' raises the fragment. The Husk turns toward it.');
 qeTele('circle','CELL PULSE');await wait(1400);
 ['e0','e1'].forEach(id=>{const e=$('[data-qe="'+id+'"]');if(e)e.classList.add('dead')});qeFeed('The smaller creatures collapse. The Resonance Husk remains.');await wait(700);
 p.forEach((c,i)=>qeMove('p'+i,56,30+i*10,500));qeMove('e2',64,50,400);await wait(900);
 const elite=$('[data-qe="e2"]');if(elite)elite.classList.add('dead');qeFeed('The Husk fractures. The shard inside it points deeper beneath the road.');await wait(900);
 $('#qeObjective').textContent='The sealed door has been found.';
 const door=document.createElement('div');door.className='qe-door';door.innerHTML='<b>THE HOLLOW SEAL</b><small>Something on the other side is breathing.</small>';$('.qe-arena').appendChild(door);await wait(1200);
 root.hidden=true;document.body.classList.remove('qe-open');
 await finishQuest('road-under-road','door-that-breathed',{renown:80,note:'The guild discovered the Hollow Seal beneath Zeltira.'});
}
async function openSeal(){
 const q=ensure();if(q.current!=='door-that-breathed')return;
 showDialogue('The Door That Breathed','Tessa Orr',[
  'This is older than the road. Older than Zeltira’s first wall, if the stonework is telling the truth.',
  'The fragment fits the hollow at the centre of the seal exactly. I do not think the road crew found the fragment by accident.',
  'If you turn it, the door opens. After that, whatever is below becomes part of our world.'
 ],()=>showUnlock());
}
async function showUnlock(){
 const q=ensure();q.flags.hollowSanctumUnlocked=true;
 await finishQuest('door-that-breathed',null,{gold:250,renown:150,note:'The Hollow Sanctum was unsealed beneath Zeltira.'});
 const root=document.createElement('div');root.className='quest-unlock-backdrop';root.innerHTML='<section class="quest-unlock"><div class="quest-unlock-rune">◆</div><small>NEW DUNGEON DISCOVERED</small><h2>The Hollow Sanctum</h2><p>The sealed chambers beneath the east road are open. Void Crystal can now be recovered from the depths, and a unique Relic waits on the first clear.</p><div><span>5 Adventurers</span><span>iLvl 24+</span><span>3 Stages</span></div><button>OPEN DUNGEON JOURNAL →</button></section>';document.body.appendChild(root);
 root.querySelector('button').onclick=()=>{root.remove();Game.switchView?.('content');window.CellboundHollowSanctum?.renderCard?.()}
}

function actionHtml(q,id){
 const qs=ensure(),cur=qs.current;
 if(!qs.started&&id==='letter-in-glass')return '<button class="quest-primary" data-start-campaign>BEGIN ECHOES BENEATH ZELTIRA →</button>';
 if(cur!==id)return completed(id)?'<div class="quest-complete-stamp">COMPLETE</div>':'<button disabled>LOCKED</button>';
 if(id==='letter-in-glass')return '<button class="quest-primary" data-start-campaign>READ THE LETTER →</button>';
 if(id==='living-resonance'){
   const active=new Set(party().map(c=>c.id)),chars=state().roster.filter(c=>active.has(c.id));
   return '<div class="quest-bearer-picker"><small>CHOOSE THE BEARER</small>'+chars.map(c=>'<button data-bearer="'+c.id+'"><span>'+esc(c.portrait)+'</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></div></button>').join('')+(chars.length!==5?'<p>Your active five is incomplete. Build the party first.</p>':'')+'</div>';
 }
 if(id==='ash-makes-it-sing')return '<div class="quest-action-block"><div><span>BEARER</span><b>'+esc(qs.bearerName||'Not assigned')+'</b></div><button class="quest-primary" data-open-ashen>OPEN THE ASHEN VAULT →</button><small>The clear only counts if '+esc(qs.bearerName||'the Bearer')+' is in the five.</small></div>';
 if(id==='road-under-road')return '<button class="quest-primary" data-investigate>BEGIN THE INVESTIGATION →</button>';
 if(id==='door-that-breathed')return '<button class="quest-primary danger" data-open-seal>BREAK THE HOLLOW SEAL →</button>';
 return '';
}
function questStatus(id){
 if(completed(id))return'COMPLETE';
 if(current()===id)return'ACTIVE';
 if(isUnlocked(id))return'AVAILABLE';
 return'LOCKED';
}
function renderList(){
 const root=$('#questJournalList');if(!root)return;const q=ensure();
 let list=QUESTS;
 if(selectedTab==='active')list=q.started&&q.current?[qdef(q.current)]:[QUESTS[0]];
 if(selectedTab==='completed')list=QUESTS.filter(x=>completed(x.id));
 if(selectedTab==='campaign')list=QUESTS;
 if(!list.length){root.innerHTML='<div class="quest-list-empty">No completed quests yet.</div>';return}
 root.innerHTML='<div class="quest-chain-card"><small>CAMPAIGN · CHAPTER I</small><b>Echoes Beneath Zeltira</b><span>'+q.completed.length+' / '+QUESTS.length+' quests complete</span><div><i style="width:'+(q.completed.length/QUESTS.length*100)+'%"></i></div></div>'+list.map(x=>'<button class="quest-list-item '+(selectedQuest===x.id?'selected':'')+' '+questStatus(x.id).toLowerCase()+'" data-quest-select="'+x.id+'"><i>'+x.chapter+'</i><span><small>'+questStatus(x.id)+'</small><b>'+esc(x.title)+'</b><em>'+esc(x.giver)+'</em></span></button>').join('');
 root.querySelectorAll('[data-quest-select]').forEach(b=>b.onclick=()=>{selectedQuest=b.dataset.questSelect;renderDetail()});
}
function renderDetail(){
 const root=$('#questJournalDetail'),side=$('#questJournalSide');if(!root||!side)return;
 const q=ensure();let id=selectedQuest||(q.started?q.current:'letter-in-glass');if(!qdef(id))id='letter-in-glass';selectedQuest=id;const d=qdef(id),status=questStatus(id);
 root.innerHTML='<div class="quest-detail-hero"><div><small>CHAPTER '+d.chapter+' · '+status+'</small><h2>'+esc(d.title)+'</h2><p>'+esc(d.giver)+'</p></div><span>'+d.chapter+'</span></div><div class="quest-detail-story"><p>'+esc(d.summary)+'</p></div><div class="quest-objective-card"><small>CURRENT OBJECTIVE</small><b>'+esc(d.objective)+'</b></div><div class="quest-reward-row"><div><span>REWARD</span><b>'+esc(d.reward)+'</b></div><div><span>UNLOCK / CONSEQUENCE</span><b>'+esc(d.unlock)+'</b></div></div><div class="quest-detail-action">'+actionHtml(d,id)+'</div>';
 side.innerHTML='<section><small>WHY IT MATTERS</small><p>'+esc(d.why)+'</p></section><section><small>CAMPAIGN CONSEQUENCES</small><div class="quest-consequence '+(q.bearerId?'done':'')+'"><i>1</i><span><b>Choose the Bearer</b><small>'+esc(q.bearerName||'Not decided')+'</small></span></div><div class="quest-consequence '+(completed('ash-makes-it-sing')?'done':'')+'"><i>2</i><span><b>Wake the Fragment</b><small>Vaultheart resonance</small></span></div><div class="quest-consequence '+(completed('road-under-road')?'done':'')+'"><i>3</i><span><b>Find the Hollow Seal</b><small>Hidden beneath Zeltira</small></span></div><div class="quest-consequence '+(q.flags.hollowSanctumUnlocked?'done':'')+'"><i>4</i><span><b>Open the Sanctum</b><small>Permanent dungeon unlock</small></span></div></section><section><small>RECENT QUEST HISTORY</small><div class="quest-history">'+(q.history.slice(-4).reverse().map(h=>'<p>'+esc(h.text)+'</p>').join('')||'<p>No campaign history yet.</p>')+'</div></section>';
 bindDetail();
}
function bindDetail(){
 $('[data-start-campaign]')?.addEventListener('click',startCampaign);
 $$('[data-bearer]').forEach(b=>b.addEventListener('click',()=>chooseBearer(b.dataset.bearer)));
 $('[data-open-ashen]')?.addEventListener('click',openAshen);
 $('[data-investigate]')?.addEventListener('click',beginInvestigation);
 $('[data-open-seal]')?.addEventListener('click',openSeal);
}
function renderHome(){
 const root=$('#questHomeObjective'),badge=$('#questNavBadge');if(!root)return;const q=ensure();
 let title='A new campaign is waiting.',button='OPEN QUEST JOURNAL →',jump='quests',small='CURRENT OBJECTIVE';
 if(!q.started){title='A glass-sealed letter has arrived from beneath Zeltira.'}
 else if(q.current==='living-resonance')title='Choose an adventurer to carry the Blackened Fragment.';
 else if(q.current==='ash-makes-it-sing'){title='Clear The Ashen Vault with '+(q.bearerName||'the Bearer')+'.';button='OPEN DUNGEON →';jump='content'}
 else if(q.current==='road-under-road')title='Follow the route hidden inside the Blackened Fragment.';
 else if(q.current==='door-that-breathed')title='Decide whether to break the Hollow Seal.';
 else if(q.flags.hollowSanctumUnlocked){small='CAMPAIGN COMPLETE';title='The Hollow Sanctum is open beneath Zeltira.';button='VIEW NEW DUNGEON →';jump='content'}
 root.innerHTML='<span>'+small+'</span><b>'+esc(title)+'</b><button data-quest-home>'+button+'</button>';
 root.querySelector('[data-quest-home]').onclick=()=>Game.switchView?.(jump);
 if(badge){badge.textContent=!q.started?'NEW':q.current?'1':'';badge.hidden=Boolean(q.flags.hollowSanctumUnlocked&&!q.current)}
}
function render(){
 if(!Game?.ready)return;const q=ensure();if(!q)return;
 if(!selectedQuest)selectedQuest=q.started?q.current:'letter-in-glass';
 $$('.quest-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.questTab===selectedTab));
 const status=$('#questCampaignStatus');if(status)status.textContent=q.flags.hollowSanctumUnlocked?'CHAPTER I COMPLETE':q.started?'CHAPTER I IN PROGRESS':'CAMPAIGN AVAILABLE';
 renderList();renderDetail();renderHome();window.CellboundHollowSanctum?.renderCard?.();
}
function bind(){
 $$('.quest-tabs [data-quest-tab]').forEach(b=>b.addEventListener('click',()=>{selectedTab=b.dataset.questTab;render()}));
 document.querySelector('.nav-btn[data-view="quests"]')?.addEventListener('click',render);
 window.addEventListener('cellbound:dungeon-complete',e=>checkAshenProgress(e.detail||{}));
 window.addEventListener('cellbound:hollow-complete',()=>{render()});
}
async function checkHistory(){
 const q=ensure();if(q?.current==='ash-makes-it-sing'&&latestAshenClear())await checkAshenProgress(null);
}
function init(){
 Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}
 ensure();bind();render();checkHistory();setInterval(checkHistory,2500);
 window.CellboundQuests={render,ensure,beginInvestigation,isHollowUnlocked:()=>Boolean(ensure()?.flags?.hollowSanctumUnlocked)};
}
init();
})();