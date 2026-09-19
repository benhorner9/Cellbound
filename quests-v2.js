(()=>{
'use strict';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));

let Game=null,selectedTab='active',encounterToken=0;

const QUEST={
  id:'echoes-beneath-zeltira',
  title:'Echoes Beneath Zeltira',
  difficulty:'Intermediate',
  length:'Long',
  start:'Bram Kel · East Road Survey Camp',
  summary:'A road crew has found a piece of black Cell glass beneath Zeltira. It should be inert. Instead, it reacts to Cellbound adventurers — and appears to remember a road that no longer exists.',
  rewards:['250 Gold','150 Guild Renown'],
  requirements:['Zeltira tutorial completed','An active five-character party will be needed','Access to The Ashen Vault']
};

const STAGES=[
  {id:'letter',label:'An Unwelcome Delivery',npc:'Bram Kel',objective:'Read the glass-sealed letter and take the fragment to Tessa Orr.',hint:'Bram’s road crew found something warm inside solid stone.'},
  {id:'bearer',label:'A Living Resonance',npc:'Tessa Orr',objective:'Choose one of your active five to carry the Blackened Fragment.',hint:'The fragment only responds when it is near a living Cellbound adventurer.'},
  {id:'vault',label:'Make It Sing',npc:'Tessa Orr',objective:'Clear The Ashen Vault with the Bearer in your active five.',hint:'Tessa believes the Vaultheart will force the fragment to reveal what it remembers.'},
  {id:'decipher',label:'Old Marks, Older Roads',npc:'Old Jory',objective:'Find someone who can read the survey marks hidden inside the fragment.',hint:'Tessa can read Cells. She cannot read fifty-year-old road-surveyor shorthand.'},
  {id:'route',label:'The Road Under the Road',npc:'Bram Kel',objective:'Follow the decoded route beneath the east road.',hint:'The route points into sealed survey tunnels that do not appear on modern maps.'},
  {id:'seal',label:'The Door That Breathed',npc:'Tessa Orr',objective:'Investigate the Hollow Seal and decide whether to open it.',hint:'The Blackened Fragment fits the centre of the door exactly.'}
];

const ITEMS={
  'blackened-fragment':{icon:'◈',name:'Blackened Fragment',desc:'Warm Cell glass found inside the stone beneath Zeltira.'},
  'resonance-map':{icon:'⌘',name:'Resonance Map',desc:'Silver lines awakened by the Vaultheart. They resemble survey marks.'},
  'surveyor-rubbing':{icon:'▧',name:'Jory’s Survey Rubbing',desc:'An old field rubbing showing how Zeltiran road crews ordered their route marks.'},
  'decoded-route':{icon:'⌁',name:'Decoded Underroad Route',desc:'A route from the east road into sealed works beneath Zeltira.'}
};

const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const stageDef=id=>STAGES.find(x=>x.id===id)||STAGES[0];
const complete=()=>Boolean(ensure()?.flags?.hollowSanctumUnlocked);
const currentStage=()=>complete()?'complete':ensure()?.currentStage||'letter';

function migrate(q,s){
  if(Number(q.version)>=2){
    q.stageDone=Array.isArray(q.stageDone)?q.stageDone:[];
    q.items=q.items&&typeof q.items==='object'?q.items:{};
    return;
  }
  const oldDone=new Set(Array.isArray(q.completed)?q.completed:[]);
  const mapped=[];
  if(oldDone.has('letter-in-glass'))mapped.push('letter');
  if(oldDone.has('living-resonance'))mapped.push('bearer');
  if(oldDone.has('ash-makes-it-sing'))mapped.push('vault');
  if(oldDone.has('road-under-road'))mapped.push('decipher','route');
  if(oldDone.has('door-that-breathed'))mapped.push('seal');

  let stage='letter';
  if(q.flags?.hollowSanctumUnlocked)stage='complete';
  else if(q.current==='door-that-breathed')stage='seal';
  else if(q.current==='road-under-road')stage='decipher';
  else if(q.current==='ash-makes-it-sing')stage='vault';
  else if(q.current==='living-resonance')stage='bearer';
  else if(q.current==='letter-in-glass')stage='letter';

  q.version=2;
  q.currentStage=stage;
  q.stageDone=[...new Set(mapped)];
  q.items=q.items&&typeof q.items==='object'?q.items:{};
  q.started=Boolean(q.started||mapped.length||q.bearerId||q.flags?.hollowSanctumUnlocked);
  q.history=Array.isArray(q.history)?q.history:[];
  q.flags=q.flags||{};

  if(q.started||mapped.length)grantItemRaw(q,'blackened-fragment');
  if(mapped.includes('vault'))grantItemRaw(q,'resonance-map');
  if(mapped.includes('decipher'))grantItemRaw(q,'surveyor-rubbing');
  if(mapped.includes('route'))grantItemRaw(q,'decoded-route');

}

function ensure(){
  const s=state();if(!s)return null;
  if(!s.questSystem){
    s.questSystem={
      version:2,chain:QUEST.id,started:false,currentStage:'letter',stageDone:[],
      flags:{hollowSanctumUnlocked:false,hollowFirstClear:false},
      bearerId:null,bearerName:null,items:{},history:[],startedAt:null
    };
  }
  const q=s.questSystem;
  q.flags=q.flags||{};
  migrate(q,s);
  return q;
}

function grantItemRaw(q,id){
  if(!ITEMS[id])return;
  q.items[id]=q.items[id]||{status:'active',obtainedAt:new Date().toISOString()};
}
function grantItem(id){const q=ensure();grantItemRaw(q,id)}
function setItemStatus(id,status){const q=ensure();if(q.items[id])q.items[id].status=status}
function hasItem(id){return Boolean(ensure()?.items?.[id])}
function addHistory(text){const q=ensure();q.history.push({at:new Date().toISOString(),text});q.history=q.history.slice(-40)}
async function commit(){
  Game.save?.();
  await Game.persistState?.();
  Game.renderAll?.();
  render();
  window.CellboundHollowSanctum?.renderCard?.();
}

function questToast(label,title,text){
  let root=$('#questToast');
  if(!root){root=document.createElement('div');root.id='questToast';root.className='quest-toast';root.hidden=true;document.body.appendChild(root)}
  root.innerHTML='<small>'+esc(label)+'</small><h3>'+esc(title)+'</h3><p>'+esc(text||'')+'</p>';
  root.hidden=false;clearTimeout(root._hide);root._hide=setTimeout(()=>root.hidden=true,3600);
}

async function advance(done,next,note){
  const q=ensure();
  if(done&&!q.stageDone.includes(done))q.stageDone.push(done);
  q.currentStage=next;
  if(note)addHistory(note);
  await commit();
  if(next&&next!=='complete'){
    const d=stageDef(next);
    questToast('QUEST UPDATED',QUEST.title,d.objective);
  }
}

function dialogueRoot(){
  let root=$('#questDialogue');
  if(!root){root=document.createElement('div');root.id='questDialogue';root.className='quest-dialogue-backdrop';root.hidden=true;document.body.appendChild(root)}
  return root;
}
function showDialogue(title,speaker,beats,onDone){
  const root=dialogueRoot();let index=0;
  const draw=()=>{
    const initials=speaker.split(/\s+/).slice(0,2).map(x=>x[0]).join('');
    root.innerHTML='<section class="quest-dialogue"><div class="quest-dialogue-portrait">'+esc(initials)+'</div><div><small>'+esc(speaker)+'</small><h3>'+esc(title)+'</h3><p>'+esc(beats[index])+'</p><div class="quest-dialogue-progress">'+beats.map((_,i)=>'<i class="'+(i<=index?'active':'')+'"></i>').join('')+'</div><button data-next>'+(index===beats.length-1?'CONTINUE →':'NEXT →')+'</button></div></section>';
    root.querySelector('[data-next]').onclick=async()=>{
      if(index<beats.length-1){index++;draw();return}
      root.hidden=true;
      if(onDone)await onDone();
    };
  };
  draw();root.hidden=false;
}

async function startQuest(){
  const q=ensure();
  if(!q.started){
    q.started=true;q.startedAt=new Date().toISOString();q.currentStage='letter';
    addHistory('A glass-sealed letter from Bram Kel arrived at the guild.');
    await commit();
  }
  if(currentStage()!=='letter')return;
  showDialogue('The Letter in Glass','Bram Kel',[
    'I’ll save you the official version. We were digging a drain, Derren swung a pick where I told him not to, and the road started humming.',
    'We found a black shard inside solid stone. Warm to the touch. Derren says it whispered his name. Derren also once blamed a goat for stealing his boots, so make of that what you will.',
    'I sent the thing to Tessa Orr. She looked at it for six seconds, stopped making jokes, and asked for your guild.'
  ],()=>showDialogue('Something That Should Be Dead','Tessa Orr',[
    'Bram is dramatic. Unfortunately, this time he has earned it.',
    'This resembles Cell glass, but there is no living structure inside it. My instruments see a dead stone.',
    'Bring a Cellbound adventurer close and it begins producing a signal. I need one of your people to carry it. Someone you trust.'
  ],async()=>{
    grantItem('blackened-fragment');
    await advance('letter','bearer','Tessa Orr placed the Blackened Fragment in the guild’s care.');
  }));
}

async function chooseBearer(id){
  const q=ensure(),c=state()?.roster?.find(x=>x.id===id);
  if(!q||currentStage()!=='bearer'||!c)return;
  q.bearerId=c.id;q.bearerName=c.name;q.ashTestStartedAt=new Date().toISOString();
  addHistory(c.name+' became the Bearer of the Blackened Fragment.');
  showDialogue('The Bearer','Tessa Orr',[
    c.name+' will do. Keep the fragment wrapped when you are not studying it.',
    'If they hear anything, feel anything, dream anything strange — write it down. Yes, even if it sounds ridiculous.',
    'There is one place I want to test next. The Vaultheart in The Ashen Vault gives off a violent Cell resonance. Take the fragment there.'
  ],()=>advance('bearer','vault',c.name+' accepted the Blackened Fragment.'));
}

function latestAshenClear(){
  const q=ensure(),hist=Array.isArray(state()?.dungeonHistory)?state().dungeonHistory:[];
  return hist.find(h=>h.result==='complete'&&Array.isArray(h.partyIds)&&h.partyIds.includes(q.bearerId)&&(!q.ashTestStartedAt||new Date(h.at)>=new Date(q.ashTestStartedAt)));
}
async function checkAshenProgress(detail){
  const q=ensure();if(!q||currentStage()!=='vault')return;
  const ids=detail?.partyIds||[];
  const validEvent=detail?.id==='ashen-vault'&&ids.includes(q.bearerId);
  if(!validEvent&&!latestAshenClear())return;
  if(q._processingVault)return;q._processingVault=true;
  grantItem('resonance-map');
  showDialogue('The Fragment Remembers','Tessa Orr',[
    (q.bearerName||'The Bearer')+' brought it back hot enough to scorch my bench. That is useful. Expensive, but useful.',
    'These silver lines appeared when the Vaultheart died. They are not fractures — look at the repeated hooks and bars.',
    'They are survey marks. Old ones. I can read Cells; I cannot read the scribbles of dead road workers. Find someone who can.'
  ],async()=>{
    q._processingVault=false;
    await advance('vault','decipher','The Vaultheart awakened a hidden survey map inside the Blackened Fragment.');
  });
}
function openAshen(){
  const q=ensure();if(currentStage()==='vault'&&!q.ashTestStartedAt){q.ashTestStartedAt=new Date().toISOString();Game.save?.()}
  Game.switchView?.('content');
}

/* RuneScape-style clue/puzzle beat */
function puzzleRoot(){
  let r=$('#questPuzzle');
  if(!r){r=document.createElement('div');r.id='questPuzzle';r.className='quest-puzzle-backdrop';r.hidden=true;document.body.appendChild(r)}
  return r;
}
async function meetJory(){
  if(currentStage()!=='decipher')return;
  showDialogue('The Old Surveyor','Old Jory',[
    'Tessa sent you? Tell her my maps are not “decorative”. They are extremely practical and only slightly beautiful.',
    'Let me see that glass. Hah. East-road marks. Before the flood, before the new bridge, before Bram learned which end of a shovel goes down.',
    'We read a route from its work mark: hammer first, then water, then the old arch, then the watchful eye. Never north to south. That mistake buried three inspectors.',
    'Here. Take this rubbing. Put it beside your silver lines and read them the way a road crew would.'
  ],async()=>{
    grantItem('surveyor-rubbing');addHistory('Old Jory explained the forgotten survey notation.');
    await commit();openSurveyPuzzle();
  });
}
function openSurveyPuzzle(){
  if(currentStage()!=='decipher')return;
  if(!hasItem('surveyor-rubbing')){meetJory();return}
  const root=puzzleRoot();root.hidden=false;document.body.classList.add('quest-puzzle-open');
  const expected=['hammer','water','arch','eye'],shown=[
    {id:'eye',icon:'◉',label:'Watchful Eye'},
    {id:'hammer',icon:'⚒',label:'Work Mark'},
    {id:'arch',icon:'∩',label:'Old Arch'},
    {id:'water',icon:'≈',label:'Water Mark'}
  ];
  let progress=[];
  const draw=()=>{
    root.innerHTML='<section class="quest-puzzle"><header><div><small>QUEST PUZZLE · JORY’S SURVEY RUBBING</small><h2>Read the route marks in survey order</h2></div><button data-close>×</button></header><div class="quest-puzzle-clue"><span>JORY’S NOTE</span><p>“A road starts where the work begins. Follow water. Pass beneath the old arch. End where the watcher keeps count.”</p></div><div class="quest-puzzle-board">'+shown.map(x=>'<button data-mark="'+x.id+'" class="'+(progress.includes(x.id)?'chosen':'')+'"><i>'+x.icon+'</i><b>'+x.label+'</b><small>'+(progress.includes(x.id)?'PLACED '+(progress.indexOf(x.id)+1):'SELECT')+'</small></button>').join('')+'</div><div class="quest-puzzle-route">'+expected.map((_,i)=>'<span class="'+(progress[i]?'filled':'')+'">'+(progress[i]?shown.find(x=>x.id===progress[i]).icon:(i+1))+'</span>').join('<i>→</i>')+'</div><p id="questPuzzleHint">Use Jory’s clue to place all four marks.</p><button class="quest-puzzle-confirm" data-confirm '+(progress.length===4?'':'disabled')+'>TRACE THE ROUTE</button></section>';
    root.querySelector('[data-close]').onclick=()=>{root.hidden=true;document.body.classList.remove('quest-puzzle-open')};
    root.querySelectorAll('[data-mark]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.mark;if(progress.includes(id))return;
      progress.push(id);draw();
    });
    root.querySelector('[data-confirm]')?.addEventListener('click',async()=>{
      const ok=progress.join('|')===expected.join('|');
      if(!ok){
        progress=[];draw();
        const hint=$('#questPuzzleHint');if(hint){hint.textContent='The marks do not form a valid survey route. Jory said the work mark comes first.';hint.classList.add('wrong')}
        return;
      }
      grantItem('decoded-route');setItemStatus('surveyor-rubbing','used');
      addHistory('The survey marks resolved into a route beneath the old east road.');
      await commit();
      root.innerHTML='<section class="quest-puzzle solved"><div class="quest-puzzle-solved">⌁</div><small>ROUTE DECIPHERED</small><h2>The Road Under the Road</h2><p>The silver lines match a buried survey route leading from the old drainage works to a sealed chamber beneath Zeltira.</p><button data-continue>FOLLOW THE ROUTE →</button></section>';
      root.querySelector('[data-continue]').onclick=async()=>{root.hidden=true;document.body.classList.remove('quest-puzzle-open');await advance('decipher','route','The underroad route was decoded using Old Jory’s survey rubbing.')};
    });
  };
  draw();
}

/* Bespoke quest encounter */
function encounterRoot(){
  let r=$('#questEncounterBackdrop');
  if(!r){r=document.createElement('div');r.id='questEncounterBackdrop';r.className='qe-backdrop';r.hidden=true;document.body.appendChild(r)}
  return r;
}
function qeUnit(root,id,label,cls,x,y){
  const e=document.createElement('div');e.className='qe-unit '+cls;e.dataset.qe=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span><em><i></i></em>';root.appendChild(e);return e;
}
function qeMove(id,x,y,ms=650){const e=$('[data-qe="'+id+'"]');if(!e)return;e.style.transitionDuration=ms+'ms';e.style.left=x+'%';e.style.top=y+'%'}
function qeFeed(text){const e=$('#qeFeed');if(e){const p=document.createElement('p');p.textContent=text;e.prepend(p);while(e.children.length>7)e.lastElementChild.remove()}}
function qeTele(type,label){
  const layer=$('#qeTelegraphs');if(!layer)return;
  const e=document.createElement('div');e.className='qe-tele '+type;e.innerHTML='<span>'+esc(label)+'</span>';layer.appendChild(e);
  setTimeout(()=>e.classList.add('impact'),900);setTimeout(()=>e.remove(),1450);
}
async function beginInvestigation(){
  const q=ensure(),p=party();if(currentStage()!=='route')return;
  if(p.length!==5){alert('Build a complete five-character party before following the route.');Game.switchView?.('party');return}
  const tok=++encounterToken,root=encounterRoot();root.hidden=false;document.body.classList.add('qe-open');
  root.innerHTML='<section class="qe-shell"><header><div><small>QUEST ENCOUNTER · ECHOES BENEATH ZELTIRA</small><h2>The Road Under the Road</h2></div><button data-qe-close>×</button></header><div class="qe-body"><main><div class="qe-arena"><div class="qe-floor"></div><div class="qe-props"><i></i><i></i><i></i><i></i></div><div id="qeTelegraphs"></div><div id="qeUnits"></div><div class="qe-location"><b>Collapsed Survey Tunnels</b><small>Jory’s route continues beyond the fallen supports.</small></div></div><div class="qe-feed" id="qeFeed"></div></main><aside><small>INVESTIGATION PARTY</small><div class="qe-party">'+p.map(c=>'<div><i class="'+(Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps')+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span></div>').join('')+'</div><div class="qe-objective"><small>CURRENT OBJECTIVE</small><b id="qeObjective">Follow the survey marks.</b><p>The Blackened Fragment grows warmer as the tunnel descends.</p></div></aside></div></section>';
  root.querySelector('[data-qe-close]').onclick=()=>{if(confirm('Leave the investigation? This encounter will restart.')){encounterToken++;root.hidden=true;document.body.classList.remove('qe-open')}};

  const layer=$('#qeUnits'),roles=p.map(c=>Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps');
  p.forEach((c,i)=>qeUnit(layer,'p'+i,c.name,'party '+roles[i],8,30+i*10));
  qeFeed('Old Jory’s first mark is still visible beneath decades of dust.');
  await wait(650);if(tok!==encounterToken)return;
  p.forEach((c,i)=>qeMove('p'+i,27,30+i*10,850));$('#qeObjective').textContent='Reach the buried junction.';await wait(1200);

  ['Hollow Scavenger','Hollow Scavenger','Resonance Husk'].forEach((n,i)=>qeUnit(layer,'e'+i,n,'enemy '+(i===2?'elite':''),92,35+i*15));
  qeFeed('Three shapes pull themselves out of the old masonry.');
  ['e0','e1','e2'].forEach((id,i)=>qeMove(id,68,35+i*15,650));p.forEach((c,i)=>qeMove('p'+i,42,30+i*10,650));
  $('#qeObjective').textContent='Survive the buried things.';await wait(1100);
  qeTele('line','RESONANCE LASH');qeFeed('The Husk tears a bright line through the tunnel. The party breaks formation.');
  p.forEach((c,i)=>{if(i%2)qeMove('p'+i,46,18+i*12,480)});await wait(1450);
  qeFeed((q.bearerName||'The Bearer')+' raises the fragment. The Husk turns toward it.');
  qeTele('circle','CELL PULSE');await wait(1350);
  ['e0','e1'].forEach(id=>{const e=$('[data-qe="'+id+'"]');if(e)e.classList.add('dead')});await wait(600);
  p.forEach((c,i)=>qeMove('p'+i,56,30+i*10,480));qeMove('e2',64,50,380);await wait(850);
  const elite=$('[data-qe="e2"]');if(elite)elite.classList.add('dead');
  qeFeed('The Resonance Husk fractures. A final survey mark is cut into the wall behind it.');await wait(850);

  $('#qeObjective').textContent='The route ends here.';
  const door=document.createElement('div');door.className='qe-door';door.innerHTML='<b>THE HOLLOW SEAL</b><small>Something on the other side is breathing.</small>';$('.qe-arena').appendChild(door);
  await wait(1200);if(tok!==encounterToken)return;
  root.hidden=true;document.body.classList.remove('qe-open');
  setItemStatus('decoded-route','used');
  await advance('route','seal','The guild followed the old survey route and discovered the Hollow Seal.');
}

async function inspectSeal(){
  if(currentStage()!=='seal')return;
  const q=ensure();
  showDialogue('The Door That Breathed','Tessa Orr',[
    'I dislike doors that breathe. I especially dislike doors that breathe in rhythm with a dead piece of Cell glass.',
    'This stone predates Zeltira’s first wall. The fragment fits that hollow in the centre so precisely that I am done calling any of this coincidence.',
    'Turn the fragment and the seal opens. I cannot tell you what is below. I can tell you the door was built to stay closed.'
  ],()=>showDialogue('One Last Opinion','Bram Kel',[
    'For the record, my professional recommendation is “do not open the ancient breathing door under my road.”',
    'My unofficial recommendation is that if you are opening it anyway, do it before the council notices and forms a committee.'
  ],completeQuest));
}

async function completeQuest(){
  const s=state(),q=ensure();if(complete())return;
  q.flags.hollowSanctumUnlocked=true;q.currentStage='complete';q.completedAt=new Date().toISOString();
  if(!q.stageDone.includes('seal'))q.stageDone.push('seal');
  s.gold=(Number(s.gold)||0)+250;s.renown=(Number(s.renown)||0)+150;
  setItemStatus('blackened-fragment','used');setItemStatus('resonance-map','archived');
  addHistory('The Hollow Seal was opened. The Hollow Sanctum was discovered beneath Zeltira.');
  s.activity.push('Quest complete: '+QUEST.title+'. The Hollow Sanctum was discovered.');
  await commit();

  const root=document.createElement('div');root.className='quest-unlock-backdrop quest-complete-backdrop';
  root.innerHTML='<section class="quest-complete-card"><div class="quest-complete-rune">⌁</div><small>QUEST COMPLETE</small><h2>'+QUEST.title+'</h2><p>The underroad mystery has led your guild to a sealed dungeon beneath Zeltira.</p><div class="quest-complete-rewards"><article><span>GOLD</span><b>+250</b></article><article><span>RENOWN</span><b>+150</b></article><article><span>DISCOVERY</span><b>PERMANENT</b></article></div><div class="quest-complete-unlock"><small>PERMANENT UNLOCK</small><h3>The Hollow Sanctum</h3><p>Void Crystal can now be recovered from the depths. A unique first-clear Relic waits inside.</p></div><button>OPEN DUNGEON JOURNAL →</button></section>';
  document.body.appendChild(root);
  root.querySelector('button').onclick=()=>{root.remove();Game.switchView?.('content');window.CellboundHollowSanctum?.renderCard?.()};
}

function requirementsHtml(){
  return QUEST.requirements.map((r,i)=>'<div class="quest-requirement '+(i===0?'met':'')+'"><i>'+(i===0?'✓':'•')+'</i><span>'+esc(r)+'</span></div>').join('');
}
function itemsHtml(q){
  const ids=Object.keys(q.items||{});
  if(!ids.length)return '<p class="quest-items-empty">Nothing unusual is in the quest pouch yet.</p>';
  return ids.map(id=>{const d=ITEMS[id],x=q.items[id];if(!d)return'';return '<article class="quest-item '+esc(x.status||'active')+'"><i>'+d.icon+'</i><span><b>'+esc(d.name)+'</b><small>'+esc(d.desc)+'</small><em>'+esc((x.status||'active').toUpperCase())+'</em></span></article>'}).join('');
}
function knownFacts(q){
  const facts=[];
  if(q.started||q.stageDone.includes('letter'))facts.push('The black glass was found inside solid stone beneath Zeltira. It was warm when uncovered.');
  if(q.stageDone.includes('letter')||currentStage()==='bearer')facts.push('The fragment appears dead to instruments but reacts when a Cellbound adventurer is nearby.');
  if(q.bearerName)facts.push(q.bearerName+' is carrying the fragment as the guild’s Bearer.');
  if(q.stageDone.includes('vault')||['decipher','route','seal','complete'].includes(currentStage()))facts.push('The Vaultheart awakened silver markings inside the fragment. They are old road-surveyor notation.');
  if(q.stageDone.includes('decipher')||['route','seal','complete'].includes(currentStage()))facts.push('Old Jory identified the marks as a route from the east road into abandoned survey works.');
  if(q.stageDone.includes('route')||['seal','complete'].includes(currentStage()))facts.push('The decoded route ends at a sealed stone door beneath Zeltira. The fragment fits its centre.');
  if(complete())facts.push('The seal has been opened. The Hollow Sanctum now lies accessible beneath Zeltira.');
  return facts;
}
function visibleRewards(){
  if(complete())return ['250 Gold','150 Guild Renown','The Hollow Sanctum unlocked','Void Crystal source discovered'];
  return ['250 Gold','150 Guild Renown','A permanent discovery','Further rewards unknown'];
}
function actionHtml(){
  const q=ensure(),stage=currentStage();
  if(complete())return '<div class="quest-complete-stamp">QUEST COMPLETE</div>';
  if(!q.started)return '<button class="quest-primary" data-start>START QUEST →</button>';
  if(stage==='letter')return '<button class="quest-primary" data-start>READ BRAM’S LETTER →</button>';
  if(stage==='bearer'){
    const activeIds=new Set(party().map(c=>c.id)),chars=(state().roster||[]).filter(c=>activeIds.has(c.id));
    return '<div class="quest-bearer-picker"><small>CHOOSE THE BEARER</small>'+chars.map(c=>'<button data-bearer="'+c.id+'"><span>'+esc(c.portrait||c.name.slice(0,2))+'</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></div></button>').join('')+(chars.length!==5?'<p>Your active five is incomplete. Build the party first.</p>':'')+'</div>';
  }
  if(stage==='vault')return '<div class="quest-action-block"><div><span>BEARER</span><b>'+esc(q.bearerName||'Not assigned')+'</b></div><button class="quest-primary" data-ashen>OPEN THE ASHEN VAULT →</button><small>The clear only counts if '+esc(q.bearerName||'the Bearer')+' is in the five.</small></div>';
  if(stage==='decipher')return hasItem('surveyor-rubbing')?'<button class="quest-primary" data-puzzle>EXAMINE JORY’S RUBBING →</button>':'<button class="quest-primary" data-jory>ASK AROUND ZELTIRA →</button>';
  if(stage==='route')return '<button class="quest-primary" data-route>FOLLOW THE UNDERROAD →</button>';
  if(stage==='seal')return '<button class="quest-primary danger" data-seal>INSPECT THE HOLLOW SEAL →</button>';
  return '';
}
function renderList(){
  const root=$('#questJournalList');if(!root)return;const q=ensure();
  const status=complete()?'COMPLETE':q.started?'IN PROGRESS':'AVAILABLE';
  const shouldShow=selectedTab==='campaign'||(selectedTab==='active'&&!complete())||(selectedTab==='completed'&&complete());
  if(!shouldShow){root.innerHTML='<div class="quest-list-empty">'+(selectedTab==='completed'?'No completed adventures yet.':'No active adventures.')+'</div>';return}
  root.innerHTML='<button class="quest-v2-list-card selected"><div class="quest-v2-icon">⌁</div><span><small>'+status+' · '+QUEST.difficulty.toUpperCase()+'</small><b>'+QUEST.title+'</b><em>'+QUEST.length+' adventure · Zeltira</em></span></button>';
}
function renderDetail(){
  const root=$('#questJournalDetail'),side=$('#questJournalSide');if(!root||!side)return;
  const q=ensure(),stage=currentStage(),d=stage==='complete'?STAGES[STAGES.length-1]:stageDef(stage),facts=knownFacts(q),rewards=visibleRewards();
  root.innerHTML='<div class="quest-v3-hero"><div><small>'+QUEST.difficulty.toUpperCase()+' · '+QUEST.length.toUpperCase()+' ADVENTURE</small><h2>'+QUEST.title+'</h2><p>'+esc(QUEST.start)+'</p></div><span class="quest-v3-status '+(complete()?'complete':'')+'">'+(complete()?'COMPLETE':q.started?'IN PROGRESS':'AVAILABLE')+'</span></div>'+
    '<div class="quest-v3-story"><p>'+QUEST.summary+'</p></div>'+
    '<section class="quest-v3-clue"><small>'+(complete()?'WHERE IT LED':'CURRENT CLUE')+'</small><h3>'+esc(complete()?'The Hollow Sanctum':d.label)+'</h3><p>'+esc(complete()?'The seal beneath Zeltira has been opened. What was once a rumour beneath the road is now a real place your guild can enter.':d.objective)+'</p>'+(complete()?'':'<em>'+esc(d.hint)+'</em>')+'</section>'+
    '<section class="quest-v3-known"><div class="quest-v3-section-head"><span>WHAT YOUR GUILD KNOWS</span><small>Only discoveries made so far are recorded here.</small></div><div>'+(facts.length?facts.map(x=>'<p>'+esc(x)+'</p>').join(''):'<p class="quest-v3-unknown">Nothing yet. Start with Bram Kel’s letter.</p>')+'</div></section>'+
    '<div class="quest-detail-action">'+actionHtml()+'</div>';

  side.innerHTML=
    (!q.started?'<section><small>BEFORE YOU BEGIN</small><div class="quest-requirements">'+requirementsHtml()+'</div></section>':'')+
    '<section><small>QUEST ITEMS</small><div class="quest-items">'+itemsHtml(q)+'</div></section>'+
    '<section><small>'+(complete()?'REWARDS':'POSSIBLE REWARDS')+'</small><div class="quest-reward-list">'+rewards.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div></section>'+
    '<section><small>ADVENTURE JOURNAL</small><div class="quest-history">'+(q.history.slice(-6).reverse().map(h=>'<p>'+esc(h.text)+'</p>').join('')||'<p>No journal entries yet.</p>')+'</div></section>';
  bindActions();
}
function bindActions(){
  $('[data-start]')?.addEventListener('click',startQuest);
  $$('[data-bearer]').forEach(b=>b.addEventListener('click',()=>chooseBearer(b.dataset.bearer)));
  $('[data-ashen]')?.addEventListener('click',openAshen);
  $('[data-jory]')?.addEventListener('click',meetJory);
  $('[data-puzzle]')?.addEventListener('click',openSurveyPuzzle);
  $('[data-route]')?.addEventListener('click',beginInvestigation);
  $('[data-seal]')?.addEventListener('click',inspectSeal);
}
function renderHome(){
  const root=$('#questHomeObjective'),badge=$('#questNavBadge');if(!root)return;
  const q=ensure(),stage=currentStage();let title='A glass-sealed letter has arrived from beneath Zeltira.',button='OPEN ADVENTURE →',jump='quests',small='CURRENT ADVENTURE';
  if(q.started&&!complete()){const d=stageDef(stage);title=d.objective}
  if(stage==='vault'){button='OPEN DUNGEON →';jump='content'}
  if(complete()){small='ADVENTURE COMPLETE';title='The Hollow Sanctum is open beneath Zeltira.';button='VIEW DUNGEON →';jump='content'}
  root.innerHTML='<span>'+small+'</span><b>'+esc(title)+'</b><button data-quest-home>'+button+'</button>';
  root.querySelector('[data-quest-home]').onclick=()=>Game.switchView?.(jump);
  if(badge){badge.textContent=!q.started?'NEW':(!complete()?'1':'');badge.hidden=complete()}
}
function render(){
  if(!Game?.ready)return;const q=ensure();if(!q)return;
  if(complete()&&selectedTab==='active')selectedTab='completed';
  if(!complete()&&selectedTab==='completed')selectedTab='active';
  $('.quest-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.questTab===selectedTab));
  const status=$('#questCampaignStatus');if(status)status.textContent=complete()?'ADVENTURE COMPLETE':q.started?'ADVENTURE IN PROGRESS':'ADVENTURE AVAILABLE';
  renderList();renderDetail();renderHome();window.CellboundHollowSanctum?.renderCard?.();
}
function bind(){
  $$('.quest-tabs [data-quest-tab]').forEach(b=>b.addEventListener('click',()=>{selectedTab=b.dataset.questTab;render()}));
  document.querySelector('.nav-btn[data-view="quests"]')?.addEventListener('click',render);
  window.addEventListener('cellbound:dungeon-complete',e=>checkAshenProgress(e.detail||{}));
  window.addEventListener('cellbound:hollow-complete',render);
}
async function checkHistory(){if(currentStage()==='vault'&&latestAshenClear())await checkAshenProgress(null)}
function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}
  ensure();bind();render();checkHistory();setInterval(checkHistory,2500);
  window.CellboundQuests={render,ensure,beginInvestigation,isHollowUnlocked:()=>Boolean(ensure()?.flags?.hollowSanctumUnlocked)};
}
init();
})();