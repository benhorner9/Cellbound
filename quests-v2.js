(()=>{
'use strict';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const G=window.CellboundGear;

let Game=null,selectedTab='active',selectedAdventure='ashfall',encounterToken=0;

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

const ASHFALL={
  id:'ashes-on-the-east-road',
  title:'Ashes on the East Road',
  difficulty:'Novice',
  length:'Medium',
  start:'Warden Elara Vey · Zeltira East Gate',
  summary:'Supply carts have vanished on the road beneath the old forge. The tracks lead toward a sealed entrance that should have remained dead.',
  requirements:['Zeltira tutorial completed','A complete active five-character party'],
  rewards:['Tier 1 quest gear','The Ashen Vault unlocked','120 Gold','75 Guild Renown']
};
const ASHFALL_STAGES=[
  {id:'warning',label:'A Road Gone Quiet',objective:'Speak with Warden Elara about the missing supply carts.',hint:'Three carts entered the east road. None returned.'},
  {id:'tracks',label:'Tracks in the Cinders',objective:'Inspect the abandoned cart and identify where the attackers came from.',hint:'Not every mark in the ash belongs to the attackers.'},
  {id:'ambush',label:'The Cinder Cart',objective:'Follow the true tracks and survive the Ashbound ambush.',hint:'The trail climbs toward the old forge entrance.'},
  {id:'key',label:'A Door in the Mountain',objective:'Return the recovered forge key to Elara.',hint:'The key bears the same mark carved above The Ashen Vault.'}
];

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
  q.rewardClaims=q.rewardClaims&&typeof q.rewardClaims==='object'?q.rewardClaims:{};
  q.ashfall=q.ashfall&&typeof q.ashfall==='object'?q.ashfall:{started:false,stage:'warning',done:[],complete:false,history:[]};
  q.ashfall.done=Array.isArray(q.ashfall.done)?q.ashfall.done:[];
  q.ashfall.history=Array.isArray(q.ashfall.history)?q.ashfall.history:[];
  s.progression=s.progression&&typeof s.progression==='object'?s.progression:{};
  if(typeof s.progression.ashenVaultUnlocked!=='boolean')s.progression.ashenVaultUnlocked=Boolean(Number(s.dungeonCompletions)>0||Object.values(s.bossKills||{}).some(Boolean)||q.ashfall.complete);
  if(q.ashfall.complete)s.progression.ashenVaultUnlocked=true;
  return q;
}

const averagePartyLevel=()=>{const p=party();return p.length?Math.round(p.reduce((n,c)=>n+(Number(c.level)||1),0)/p.length):1};
const ashenUnlocked=()=>Boolean(state()?.progression?.ashenVaultUnlocked);
const echoesUnlocked=()=>Boolean(ensure()?.started||complete()||(ashenUnlocked()&&((Number(state()?.dungeonCompletions)||0)>0||averagePartyLevel()>=3)));
const ashfallStage=()=>ensure()?.ashfall?.complete?'complete':ensure()?.ashfall?.stage||'warning';
const ashfallDef=id=>ASHFALL_STAGES.find(x=>x.id===id)||ASHFALL_STAGES[0];
function ashfallHistory(text){const a=ensure().ashfall;a.history.push({at:new Date().toISOString(),text});a.history=a.history.slice(-30)}

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


function rewardRoot(){
  let r=$('#questGearReward');
  if(!r){r=document.createElement('div');r.id='questGearReward';r.className='quest-gear-backdrop';r.hidden=true;document.body.appendChild(r)}
  return r;
}
function rewardProfileText(c,profile,tier,slot){
  const item=G?.createQuestGear?.(c,slot,tier,profile,'Quest preview');
  return (G?.statLines?.(item)||[]).map(s=>s.text).join(' · ');
}
async function openGearReward({key,title,slot,tier,source,onClaim}){
  const q=ensure();if(q.rewardClaims?.[key]){if(onClaim)await onClaim(q.rewardClaims[key]);return}
  const chars=party();if(chars.length!==5){alert('Build a complete active five before claiming this quest reward.');Game.switchView?.('party');return}
  const root=rewardRoot();root.hidden=false;document.body.classList.add('quest-gear-open');
  let selected=chars[0]?.id,profile='specialist';
  const profiles=[
    ['specialist','SPECIALIST','Stats aimed at this character’s current spec.'],
    ['sturdy','STALWART','Survivability-focused quest roll.'],
    ['swift','SWIFT','Haste and critical-strike focused quest roll.']
  ];
  const draw=()=>{
    const ch=chars.find(x=>x.id===selected)||chars[0];
    root.innerHTML='<section class="quest-gear-card"><header><div><small>QUEST EQUIPMENT REWARD</small><h2>'+esc(title)+'</h2><p>Quest gear is reliable and useful, but its stat values are deliberately below dungeon-roll potential.</p></div><button data-qgr-close>×</button></header>'+
      '<div class="quest-gear-body"><aside><small>CHOOSE ADVENTURER</small>'+chars.map(c=>'<button data-qgr-char="'+c.id+'" class="'+(c.id===ch.id?'active':'')+'"><span>'+esc(c.portrait||c.name.slice(0,2))+'</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></div></button>').join('')+'</aside>'+
      '<main><small>'+esc(ch.name.toUpperCase())+' · '+esc(slot.toUpperCase())+'</small><h3>Choose the roll you want to take</h3><div class="quest-gear-options">'+profiles.map(p=>'<button data-qgr-profile="'+p[0]+'" class="'+(profile===p[0]?'active':'')+'"><b>'+p[1]+'</b><span>'+esc(rewardProfileText(ch,p[0],tier,slot))+'</span><em>'+p[2]+'</em></button>').join('')+'</div><div class="quest-gear-note"><b>Why dungeon gear is still better</b><span>Dungeon drops use the same tier but roll higher stat values. This reward gets you ready; farming gives you the ceiling.</span></div><button class="quest-gear-claim" data-qgr-claim>CLAIM '+esc(slot.toUpperCase())+' →</button></main></div></section>';
    root.querySelector('[data-qgr-close]').onclick=()=>{root.hidden=true;document.body.classList.remove('quest-gear-open')};
    root.querySelectorAll('[data-qgr-char]').forEach(b=>b.onclick=()=>{selected=b.dataset.qgrChar;draw()});
    root.querySelectorAll('[data-qgr-profile]').forEach(b=>b.onclick=()=>{profile=b.dataset.qgrProfile;draw()});
    root.querySelector('[data-qgr-claim]').onclick=async()=>{
      const target=chars.find(x=>x.id===selected);if(!target)return;
      const item=G?.createQuestGear?.(target,slot,tier,profile,source);if(!item)return;
      Game.addBankItem?.(item);
      q.rewardClaims[key]={characterId:target.id,characterName:target.name,profile,slot,tier,itemName:item.name,at:new Date().toISOString()};
      state().activity.push('Quest reward: '+target.name+' received '+item.name+'.');
      root.hidden=true;document.body.classList.remove('quest-gear-open');
      await commit();questToast('QUEST REWARD',item.name,(G.statLines?.(item)||[]).map(s=>s.text).join(' · '));
      if(onClaim)await onClaim(q.rewardClaims[key]);
    };
  };
  draw();
}
async function advanceAshfall(done,next,note){
  const a=ensure().ashfall;if(done&&!a.done.includes(done))a.done.push(done);a.stage=next;if(note)ashfallHistory(note);
  await commit();
  if(next!=='complete'){const d=ashfallDef(next);questToast('QUEST UPDATED',ASHFALL.title,d.objective)}
}
async function startAshfall(){
  const a=ensure().ashfall;if(a.complete)return;
  if(!a.started){a.started=true;a.stage='warning';a.startedAt=new Date().toISOString();ashfallHistory('Warden Elara called the guild to Zeltira’s east gate.');await commit()}
  showDialogue('A Road Gone Quiet','Warden Elara Vey',[
    'Three supply carts left Zeltira for the east farms yesterday. None came back. The road patrol found the first cart before dawn.',
    'There was ash inside the wheel ruts even though it has not rained cinders here for years. Someone carried that ash down from the old forge.',
    'Find the cart, work out which trail is real, and do not follow anything into the mountain unless your five are ready.'
  ],()=>advanceAshfall('warning','tracks','Elara sent the guild to inspect an abandoned supply cart on the east road.'));
}
function openAshfallTracks(){
  if(ashfallStage()!=='tracks')return;
  const root=puzzleRoot();root.hidden=false;document.body.classList.add('quest-puzzle-open');
  root.innerHTML='<section class="quest-puzzle"><header><div><small>QUEST INVESTIGATION · EAST ROAD</small><h2>Which sign belongs to the attackers?</h2></div><button data-close>×</button></header><div class="quest-puzzle-clue"><span>ABANDONED CART</span><p>The horse fled west. One wheel broke downhill. Three sets of bootprints are scorched around the edges and point uphill toward the forge.</p></div><div class="quest-puzzle-board ashfall-clues"><button data-ash-clue="wheel"><i>◯</i><b>Broken wheel</b><small>Fresh splintering</small></button><button data-ash-clue="hoof"><i>⌁</i><b>Horse tracks</b><small>Running toward Zeltira</small></button><button data-ash-clue="boots"><i>♟</i><b>Scorched boots</b><small>Heading toward the mountain</small></button></div><p id="questPuzzleHint">Choose the clue that identifies where the attackers went.</p></section>';
  root.querySelector('[data-close]').onclick=()=>{root.hidden=true;document.body.classList.remove('quest-puzzle-open')};
  root.querySelectorAll('[data-ash-clue]').forEach(b=>b.onclick=async()=>{
    if(b.dataset.ashClue!=='boots'){const h=$('#questPuzzleHint');h.textContent='That explains the cart, not the attackers. Look for something moving toward the forge.';h.classList.add('wrong');return}
    root.hidden=true;document.body.classList.remove('quest-puzzle-open');ashfallHistory('Scorched bootprints revealed the attackers travelled uphill toward the old forge.');
    await openGearReward({key:'ashfall-head',title:'Tracks in the Cinders',slot:'Head',tier:1,source:ASHFALL.title+' · Tracks in the Cinders',onClaim:()=>advanceAshfall('tracks','ambush','The guild followed the scorched tracks toward the mountain.')});
  });
}
async function beginAshfallAmbush(){
  if(ashfallStage()!=='ambush')return;
  const p=party();if(p.length!==5){alert('Build a complete five-character party before following the tracks.');Game.switchView?.('party');return}
  const tok=++encounterToken,root=encounterRoot();root.hidden=false;document.body.classList.add('qe-open');
  root.innerHTML='<section class="qe-shell"><header><div><small>QUEST ENCOUNTER · ASHES ON THE EAST ROAD</small><h2>The Cinder Cart</h2></div><button data-qe-close>×</button></header><div class="qe-body"><main><div class="qe-arena"><div class="qe-floor"></div><div id="qeTelegraphs"></div><div id="qeUnits"></div><div class="qe-location"><b>Old Forge Approach</b><small>A burnt cart blocks the road ahead.</small></div></div><div class="qe-feed" id="qeFeed"></div></main><aside><small>ACTIVE FIVE</small><div class="qe-party">'+p.map(c=>'<div><i class="'+(Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps')+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span></div>').join('')+'</div><div class="qe-objective"><small>CURRENT OBJECTIVE</small><b id="qeObjective">Reach the burnt cart.</b><p>The tracks disappear beneath fresh cinders.</p></div></aside></div></section>';
  root.querySelector('[data-qe-close]').onclick=()=>{encounterToken++;root.hidden=true;document.body.classList.remove('qe-open')};
  const layer=$('#qeUnits');p.forEach((c,i)=>qeUnit(layer,'ap'+i,c.name,'party '+(Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps'),8,30+i*10));
  p.forEach((c,i)=>qeMove('ap'+i,33,30+i*10,700));qeFeed('The party follows the scorched tracks into a narrow cut below the forge.');await wait(900);if(tok!==encounterToken)return;
  ['Cinder Hound','Ashbound Runner','Cinder Hound'].forEach((n,i)=>qeUnit(layer,'ae'+i,n,'enemy '+(i===1?'elite':''),92,35+i*15));
  ['ae0','ae1','ae2'].forEach((id,i)=>qeMove(id,66,35+i*15,520));$('#qeObjective').textContent='Break the ambush.';qeFeed('Ashbound attackers spring from behind the cart.');await wait(850);
  qeTele('cone','CINDER BREATH');p.forEach((c,i)=>{if(i>1)qeMove('ap'+i,38,18+i*12,420)});await wait(1100);
  qeFeed('Your tank catches the hounds while the damage line collapses onto the runner.');await wait(700);
  ['ae0','ae1','ae2'].forEach((id,i)=>setTimeout(()=>{const e=$('[data-qe="'+id+'"]');if(e)e.classList.add('dead')},i*130));await wait(800);
  qeFeed('The runner drops a heavy iron key stamped with the old forge seal.');$('#qeObjective').textContent='Recover the forge key.';await wait(650);
  root.hidden=true;document.body.classList.remove('qe-open');
  await openGearReward({key:'ashfall-chest',title:'The Cinder Cart',slot:'Chest',tier:1,source:ASHFALL.title+' · The Cinder Cart',onClaim:()=>advanceAshfall('ambush','key','An Ashbound runner dropped a key bearing the old forge seal.')});
}
async function finishAshfall(){
  if(ashfallStage()!=='key')return;
  showDialogue('The Old Forge Key','Warden Elara Vey',[
    'That mark belonged to the keepers of the Ashen Vault. I thought every key was destroyed when the forge was sealed.',
    'The Ashbound were not stealing supplies. They were feeding something behind that door.',
    'Keep the key. If your guild is going in, you should decide when — not whatever is waking up below.'
  ],()=>openGearReward({key:'ashfall-weapon',title:'A Door in the Mountain',slot:'Weapon',tier:1,source:ASHFALL.title+' · Completion',onClaim:completeAshfall}));
}
async function completeAshfall(){
  const s=state(),a=ensure().ashfall;if(a.complete)return;
  a.complete=true;a.stage='complete';a.completedAt=new Date().toISOString();if(!a.done.includes('key'))a.done.push('key');
  s.progression=s.progression||{};s.progression.ashenVaultUnlocked=true;s.gold=(Number(s.gold)||0)+120;s.renown=(Number(s.renown)||0)+75;
  ashfallHistory('The old forge key opened the route to The Ashen Vault.');s.activity.push('Quest complete: '+ASHFALL.title+'. The Ashen Vault was unlocked.');
  await commit();
  const root=document.createElement('div');root.className='quest-unlock-backdrop quest-complete-backdrop';
  root.innerHTML='<section class="quest-complete-card"><div class="quest-complete-rune">♜</div><small>QUEST COMPLETE</small><h2>'+ASHFALL.title+'</h2><p>The road investigation has uncovered the old forge entrance and given your guild the equipment needed to begin the hunt.</p><div class="quest-complete-rewards"><article><span>GOLD</span><b>+120</b></article><article><span>RENOWN</span><b>+75</b></article><article><span>DUNGEON</span><b>UNLOCKED</b></article></div><div class="quest-complete-unlock"><small>PERMANENT UNLOCK</small><h3>The Ashen Vault</h3><p>Quest gear gives you a reliable starting point. Better versions now wait inside the dungeon.</p></div><button>OPEN DUNGEON JOURNAL →</button></section>';
  document.body.appendChild(root);root.querySelector('button').onclick=()=>{root.remove();Game.switchView?.('content')};
}

async function startQuest(){
  const q=ensure();
  if(!echoesUnlocked()){questToast('ADVENTURE LOCKED',QUEST.title,'Clear The Ashen Vault once or raise your active five to average Level 3.');return}
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
  ],()=>openGearReward({key:'echoes-head',title:'A Living Resonance',slot:'Head',tier:2,source:QUEST.title+' · A Living Resonance',onClaim:()=>advance('bearer','vault',c.name+' accepted the Blackened Fragment.')}));
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
async function forceEchoesResonance(){
  if(currentStage()!=='vault'||averagePartyLevel()<3)return;
  const q=ensure();if(q._processingVault)return;q._processingVault=true;
  showDialogue('A Different Kind of Pressure','Tessa Orr',[
    'You have outgrown the lesson I wanted the Vaultheart to teach. I can see it in the way your five hold Cells now.',
    'We do not need another Vaultheart kill just to make this fragment speak. Your guild can generate enough resonance here.',
    'Hold it steady. If this works, the glass will remember without sending you back to an old dungeon for permission.'
  ],async()=>{
    grantItem('resonance-map');q._processingVault=false;
    await advance('vault','decipher','The active five forced the Blackened Fragment to reveal its survey markings through raw Cell resonance.');
  });
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
      root.querySelector('[data-continue]').onclick=async()=>{root.hidden=true;document.body.classList.remove('quest-puzzle-open');await openGearReward({key:'echoes-chest',title:'Old Marks, Older Roads',slot:'Chest',tier:2,source:QUEST.title+' · Old Marks, Older Roads',onClaim:()=>advance('decipher','route','The underroad route was decoded using Old Jory’s survey rubbing.')})};
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
  if(complete())return;
  await openGearReward({key:'echoes-weapon',title:'The Door That Breathed',slot:'Weapon',tier:2,source:QUEST.title+' · Completion',onClaim:finalizeEchoes});
}
async function finalizeEchoes(){
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
  if(complete())return ['250 Gold','150 Guild Renown','3 × Tier 2 quest gear choices','The Hollow Sanctum unlocked'];
  return ['Tier 2 quest gear at major milestones','250 Gold','150 Guild Renown','The Hollow Sanctum discovery'];
}
function actionHtml(){
  const q=ensure(),stage=currentStage();
  if(complete())return '<div class="quest-complete-stamp">QUEST COMPLETE</div>';
  if(!q.started&&!echoesUnlocked())return '<div class="quest-action-block locked"><b>PROGRESSION REQUIRED</b><small>Clear The Ashen Vault once or reach average active-party Level 3. Current average: '+averagePartyLevel()+'.</small></div>';
  if(!q.started)return '<button class="quest-primary" data-start>START QUEST →</button>';
  if(stage==='letter')return '<button class="quest-primary" data-start>READ BRAM’S LETTER →</button>';
  if(stage==='bearer'){
    const activeIds=new Set(party().map(c=>c.id)),chars=(state().roster||[]).filter(c=>activeIds.has(c.id));
    return '<div class="quest-bearer-picker"><small>CHOOSE THE BEARER</small>'+chars.map(c=>'<button data-bearer="'+c.id+'"><span>'+esc(c.portrait||c.name.slice(0,2))+'</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></div></button>').join('')+(chars.length!==5?'<p>Your active five is incomplete. Build the party first.</p>':'')+'</div>';
  }
  if(stage==='vault'){const bypass=averagePartyLevel()>=3;return '<div class="quest-action-block"><div><span>BEARER</span><b>'+esc(q.bearerName||'Not assigned')+'</b></div><button class="quest-primary" data-ashen>OPEN THE ASHEN VAULT →</button>'+(bypass?'<button class="quest-primary secondary" data-force-resonance>USE PARTY RESONANCE INSTEAD →</button>':'')+'<small>'+(bypass?'Your active five has out-levelled this progression check. You can continue without another Ashen Vault clear.':'Clear The Ashen Vault with '+esc(q.bearerName||'the Bearer')+' in the five, or reach average party Level 3.')+'</small></div>'}
  if(stage==='decipher')return hasItem('surveyor-rubbing')?'<button class="quest-primary" data-puzzle>EXAMINE JORY’S RUBBING →</button>':'<button class="quest-primary" data-jory>ASK AROUND ZELTIRA →</button>';
  if(stage==='route')return '<button class="quest-primary" data-route>FOLLOW THE UNDERROAD →</button>';
  if(stage==='seal')return '<button class="quest-primary danger" data-seal>INSPECT THE HOLLOW SEAL →</button>';
  return '';
}
function ashfallActionHtml(){
  const a=ensure().ashfall,stage=ashfallStage();
  if(a.complete)return '<div class="quest-complete-stamp">QUEST COMPLETE</div>';
  if(!a.started||stage==='warning')return '<button class="quest-primary" data-ashfall-start>'+(a.started?'CONTINUE INVESTIGATION':'START QUEST')+' →</button>';
  if(stage==='tracks')return '<button class="quest-primary" data-ashfall-tracks>INSPECT THE ABANDONED CART →</button>';
  if(stage==='ambush')return '<button class="quest-primary danger" data-ashfall-ambush>FOLLOW THE SCORCHED TRACKS →</button>';
  if(stage==='key')return '<button class="quest-primary" data-ashfall-finish>RETURN THE FORGE KEY →</button>';
  return '';
}
function ashfallFacts(a){
  const facts=[];
  if(a.started)facts.push('Three supply carts vanished from the east road beyond Zeltira.');
  if(a.done.includes('warning')||['tracks','ambush','key','complete'].includes(ashfallStage()))facts.push('Ash at the first cart came from the old forge above the road.');
  if(a.done.includes('tracks')||['ambush','key','complete'].includes(ashfallStage()))facts.push('Scorched bootprints led uphill rather than back toward Zeltira.');
  if(a.done.includes('ambush')||['key','complete'].includes(ashfallStage()))facts.push('An Ashbound runner carried an iron key stamped with the old forge seal.');
  if(a.complete)facts.push('The forge key opened the route into The Ashen Vault.');
  return facts;
}
function renderAshfallDetail(root,side){
  const q=ensure(),a=q.ashfall,stage=ashfallStage(),d=stage==='complete'?ASHFALL_STAGES[ASHFALL_STAGES.length-1]:ashfallDef(stage),facts=ashfallFacts(a);
  root.innerHTML='<div class="quest-v3-hero"><div><small>'+ASHFALL.difficulty.toUpperCase()+' · '+ASHFALL.length.toUpperCase()+' ADVENTURE</small><h2>'+ASHFALL.title+'</h2><p>'+ASHFALL.start+'</p></div><span class="quest-v3-status '+(a.complete?'complete':'')+'">'+(a.complete?'COMPLETE':a.started?'IN PROGRESS':'AVAILABLE')+'</span></div>'+
    '<div class="quest-v3-story"><p>'+ASHFALL.summary+'</p></div>'+
    '<section class="quest-v3-clue"><small>'+(a.complete?'WHERE IT LED':'CURRENT CLUE')+'</small><h3>'+esc(a.complete?'The Ashen Vault':d.label)+'</h3><p>'+esc(a.complete?'The old forge entrance is open. The Ashen Vault can now be farmed for stronger randomized versions of the equipment earned on this road.':d.objective)+'</p>'+(a.complete?'':'<em>'+esc(d.hint)+'</em>')+'</section>'+
    '<section class="quest-v3-known"><div class="quest-v3-section-head"><span>WHAT YOUR GUILD KNOWS</span><small>Investigation notes are recorded as you uncover them.</small></div><div>'+(facts.length?facts.map(x=>'<p>'+esc(x)+'</p>').join(''):'<p class="quest-v3-unknown">Warden Elara is waiting at Zeltira’s east gate.</p>')+'</div></section>'+
    '<div class="quest-detail-action">'+ashfallActionHtml()+'</div>';
  side.innerHTML='<section><small>PROGRESSION REWARD</small><div class="quest-reward-list"><p>3 × Tier 1 quest gear choices</p><p>Reliable spec-focused stats</p><p>Dungeons roll stronger values</p><p>The Ashen Vault permanently unlocked</p></div></section>'+
    '<section><small>QUEST REWARD HISTORY</small><div class="quest-history">'+(Object.values(q.rewardClaims||{}).filter(x=>String(x?.itemName||'')&&['Head','Chest','Weapon'].includes(x.slot)&&String(x.tier)==='1').map(x=>'<p>'+esc(x.characterName+' · '+x.itemName)+'</p>').join('')||'<p>No quest equipment claimed yet.</p>')+'</div></section>'+
    '<section><small>ADVENTURE JOURNAL</small><div class="quest-history">'+(a.history.slice(-6).reverse().map(h=>'<p>'+esc(h.text)+'</p>').join('')||'<p>No journal entries yet.</p>')+'</div></section>';
}

function renderList(){
  const root=$('#questJournalList');if(!root)return;const q=ensure(),a=q.ashfall;
  const cards=[
    {id:'ashfall',title:ASHFALL.title,meta:ASHFALL.length+' adventure · Zeltira',difficulty:ASHFALL.difficulty,status:a.complete?'COMPLETE':a.started?'IN PROGRESS':'AVAILABLE',complete:a.complete,locked:false},
    {id:'echoes',title:QUEST.title,meta:QUEST.length+' adventure · Zeltira',difficulty:QUEST.difficulty,status:complete()?'COMPLETE':q.started?'IN PROGRESS':echoesUnlocked()?'AVAILABLE':'LOCKED',complete:complete(),locked:!echoesUnlocked()&&!q.started}
  ].filter(x=>selectedTab==='campaign'||(selectedTab==='active'&&!x.complete)||(selectedTab==='completed'&&x.complete));
  if(!cards.length){root.innerHTML='<div class="quest-list-empty">'+(selectedTab==='completed'?'No completed adventures yet.':'No active adventures.')+'</div>';return}
  if(!cards.some(x=>x.id===selectedAdventure))selectedAdventure=cards[0].id;
  root.innerHTML=cards.map(x=>'<button class="quest-v2-list-card '+(x.id===selectedAdventure?'selected':'')+(x.locked?' locked':'')+'" data-adventure="'+x.id+'"><div class="quest-v2-icon">'+(x.id==='ashfall'?'♜':'⌁')+'</div><span><small>'+x.status+' · '+x.difficulty.toUpperCase()+'</small><b>'+x.title+'</b><em>'+x.meta+'</em></span></button>').join('');
  root.querySelectorAll('[data-adventure]').forEach(b=>b.onclick=()=>{selectedAdventure=b.dataset.adventure;render()});
}
function renderDetail(){
  const root=$('#questJournalDetail'),side=$('#questJournalSide');if(!root||!side)return;
  if(selectedAdventure==='ashfall'){renderAshfallDetail(root,side);bindActions();return}
  const q=ensure(),stage=currentStage(),d=stage==='complete'?STAGES[STAGES.length-1]:stageDef(stage),facts=knownFacts(q),rewards=visibleRewards();
  root.innerHTML='<div class="quest-v3-hero"><div><small>'+QUEST.difficulty.toUpperCase()+' · '+QUEST.length.toUpperCase()+' ADVENTURE</small><h2>'+QUEST.title+'</h2><p>'+esc(QUEST.start)+'</p></div><span class="quest-v3-status '+(complete()?'complete':'')+'">'+(complete()?'COMPLETE':q.started?'IN PROGRESS':echoesUnlocked()?'AVAILABLE':'LOCKED')+'</span></div>'+
    '<div class="quest-v3-story"><p>'+QUEST.summary+'</p></div>'+
    '<section class="quest-v3-clue"><small>'+(complete()?'WHERE IT LED':'CURRENT CLUE')+'</small><h3>'+esc(complete()?'The Hollow Sanctum':d.label)+'</h3><p>'+esc(complete()?'The seal beneath Zeltira has been opened. What was once a rumour beneath the road is now a real place your guild can enter.':d.objective)+'</p>'+(complete()?'':'<em>'+esc(d.hint)+'</em>')+'</section>'+
    '<section class="quest-v3-known"><div class="quest-v3-section-head"><span>WHAT YOUR GUILD KNOWS</span><small>Only discoveries made so far are recorded here.</small></div><div>'+(facts.length?facts.map(x=>'<p>'+esc(x)+'</p>').join(''):'<p class="quest-v3-unknown">Nothing yet. Start with Bram Kel’s letter.</p>')+'</div></section>'+
    '<div class="quest-detail-action">'+actionHtml()+'</div>';

  side.innerHTML=
    (!q.started?'<section><small>BEFORE YOU BEGIN</small><div class="quest-requirements">'+requirementsHtml()+'</div></section>':'')+
    '<section><small>QUEST ITEMS</small><div class="quest-items">'+itemsHtml(q)+'</div></section>'+
    '<section><small>'+(complete()?'REWARDS':'POSSIBLE REWARDS')+'</small><div class="quest-reward-list">'+rewards.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div></section>'+
    '<section><small>QUEST GEAR CLAIMED</small><div class="quest-history">'+(Object.values(q.rewardClaims||{}).filter(x=>String(x?.tier)==='2').map(x=>'<p>'+esc(x.characterName+' · '+x.itemName)+'</p>').join('')||'<p>No Tier 2 quest gear claimed yet.</p>')+'</div></section>'+
    '<section><small>ADVENTURE JOURNAL</small><div class="quest-history">'+(q.history.slice(-6).reverse().map(h=>'<p>'+esc(h.text)+'</p>').join('')||'<p>No journal entries yet.</p>')+'</div></section>';
  bindActions();
}
function bindActions(){
  $('[data-ashfall-start]')?.addEventListener('click',startAshfall);
  $('[data-ashfall-tracks]')?.addEventListener('click',openAshfallTracks);
  $('[data-ashfall-ambush]')?.addEventListener('click',beginAshfallAmbush);
  $('[data-ashfall-finish]')?.addEventListener('click',finishAshfall);
  $('[data-start]')?.addEventListener('click',startQuest);
  $$('[data-bearer]').forEach(b=>b.addEventListener('click',()=>chooseBearer(b.dataset.bearer)));
  $('[data-ashen]')?.addEventListener('click',openAshen);
  $('[data-force-resonance]')?.addEventListener('click',forceEchoesResonance);
  $('[data-jory]')?.addEventListener('click',meetJory);
  $('[data-puzzle]')?.addEventListener('click',openSurveyPuzzle);
  $('[data-route]')?.addEventListener('click',beginInvestigation);
  $('[data-seal]')?.addEventListener('click',inspectSeal);
}
function renderHome(){
  const root=$('#questHomeObjective'),badge=$('#questNavBadge');if(!root)return;
  const q=ensure(),a=q.ashfall,stage=currentStage();let title='',button='OPEN ADVENTURE →',jump='quests',small='CURRENT ADVENTURE';
  if(!a.complete){title=a.started?ashfallDef(ashfallStage()).objective:'Warden Elara needs your guild on the east road.';selectedAdventure=selectedAdventure||'ashfall'}
  else if(!complete()){
    if(!echoesUnlocked()){small='NEXT ADVENTURE';title='Grow stronger in The Ashen Vault or reach average party Level 3 to continue the story.'}
    else if(q.started){title=stageDef(stage).objective;if(stage==='vault'){button='OPEN DUNGEON →';jump='content'}}
    else title='A glass-sealed letter from Bram Kel begins the road toward your next dungeon.';
  }else{small='ADVENTURE COMPLETE';title='The Hollow Sanctum is open beneath Zeltira.';button='VIEW DUNGEON →';jump='content'}
  root.innerHTML='<span>'+small+'</span><b>'+esc(title)+'</b><button data-quest-home>'+button+'</button>';
  root.querySelector('[data-quest-home]').onclick=()=>Game.switchView?.(jump);
  if(badge){const open=(!a.complete?1:0)+(!complete()&&echoesUnlocked()?1:0);badge.textContent=open?String(open):'';badge.hidden=!open}
}
function render(){
  if(!Game?.ready)return;const q=ensure();if(!q)return;
  $('.quest-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.questTab===selectedTab));
  const activeCount=(q.ashfall.complete?0:1)+(complete()?0:1);
  const status=$('#questCampaignStatus');if(status)status.textContent=activeCount?activeCount+' ADVENTURE'+(activeCount===1?'':'S')+' IN PROGRESSION':'CURRENT STORY COMPLETE';
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
  const q=ensure();if(q.started&&!complete())selectedAdventure='echoes';else if(q.ashfall?.complete&&echoesUnlocked())selectedAdventure='echoes';bind();render();checkHistory();setInterval(checkHistory,2500);
  window.CellboundQuests={render,ensure,beginInvestigation,isHollowUnlocked:()=>Boolean(ensure()?.flags?.hollowSanctumUnlocked)};
}
init();
})();