(()=>{
'use strict';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const G=window.CellboundGear;

let Game=null,selectedTab='active',selectedAdventure='ashfall',encounterToken=0,questFight=null;

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
  const q=ensure(),a=q.ashfall,root=puzzleRoot();root.hidden=false;document.body.classList.add('quest-puzzle-open');
  a.investigationMistakes=Number(a.investigationMistakes)||0;
  const evidence=[
    {icon:'◫',title:'Axle & wheel',text:'The axle split outward. There are no impact scores on the cart, but the horse harness tore forward as if the animals bolted.'},
    {icon:'⌁',title:'Tracks',text:'Hound pads and two different boot patterns enter from the north-east cut. Only the two boot patterns continue uphill.'},
    {icon:'✦',title:'Ash sample',text:'The ash contains tiny beads of black furnace glass. Elara says that residue has only been found around the abandoned forge.'},
    {icon:'↯',title:'Scorching',text:'Scorch marks sit on top of the spilled grain but beneath the bootprints. The fire came after the cart overturned, before the attackers left.'}
  ];
  const questions=[
    {title:'What most likely caused the cart to crash?',answers:['A weapon smashed the axle','The hounds panicked the horses from the north-east cut','The driver deliberately overturned it'],correct:1,success:'The axle failed during the panic. The ambush began off-road, not with a direct strike on the cart.'},
    {title:'Which trail should the party follow?',answers:['The horse tracks back toward Zeltira','The hound pads that stop beside the cart','The two boot patterns continuing uphill'],correct:2,success:'The animals stayed at the wreck. The human attackers withdrew uphill.'},
    {title:'Where are the attackers most likely heading?',answers:['The abandoned forge','The river crossing','Back into Zeltira'],correct:0,success:'The furnace-glass residue ties the attackers to the old forge above the road.'}
  ];
  let step=0;
  const draw=(note='')=>{
    const question=questions[step];
    root.innerHTML='<section class="quest-puzzle quest-investigation"><header><div><small>QUEST INVESTIGATION · EAST ROAD</small><h2>Reconstruct the ambush</h2></div><button data-close>×</button></header>'+
      '<div class="quest-evidence-grid">'+evidence.map(x=>'<article><i>'+x.icon+'</i><div><b>'+x.title+'</b><p>'+x.text+'</p></div></article>').join('')+'</div>'+
      '<div class="quest-deduction"><small>DEDUCTION '+(step+1)+' / '+questions.length+'</small><h3>'+question.title+'</h3><div>'+question.answers.map((x,i)=>'<button data-deduction="'+i+'">'+x+'</button>').join('')+'</div><p id="questPuzzleHint" class="'+(note?'wrong':'')+'">'+(note||'Use all of the evidence. The obvious-looking clue is not always the useful one.')+'</p></div>'+
      '<div class="quest-alert-meter"><span>AMBUSH ALERT</span><div><i style="width:'+Math.min(100,a.investigationMistakes*34)+'%"></i></div><b>'+a.investigationMistakes+'</b><small>Mistakes make the party noisier. High alert changes the fight ahead.</small></div></section>';
    root.querySelector('[data-close]').onclick=()=>{root.hidden=true;document.body.classList.remove('quest-puzzle-open')};
    root.querySelectorAll('[data-deduction]').forEach(b=>b.onclick=async()=>{
      const answer=Number(b.dataset.deduction);
      if(answer!==question.correct){
        a.investigationMistakes++;Game.save?.();
        draw('That explanation conflicts with at least one piece of evidence. Re-read the timing of the tracks, ash and damage.');
        return;
      }
      if(step<questions.length-1){step++;draw(question.success);return}
      root.hidden=true;document.body.classList.remove('quest-puzzle-open');
      ashfallHistory('The guild reconstructed the ambush from the wreck. '+(a.investigationMistakes>=2?'Their search made enough noise to alert the forge sentries.':'They kept the investigation quiet.'));
      await openGearReward({key:'ashfall-head',title:'Tracks in the Cinders',slot:'Head',tier:1,source:ASHFALL.title+' · Tracks in the Cinders',onClaim:()=>advanceAshfall('tracks','ambush','The guild followed the attackers’ withdrawal route toward the old forge.')});
    });
  };
  draw();
}
async function beginAshfallAmbush(){
  if(ashfallStage()!=='ambush')return;
  const p=party();if(p.length!==5){alert('Build a complete five-character party before following the tracks.');Game.switchView?.('party');return}
  const a=ensure().ashfall,alertLevel=Number(a.investigationMistakes)||0;
  const enemies=['Cinder Hound','Ashbound Runner','Cinder Hound'];
  if(alertLevel>=2)enemies.push('Ashbound Scout');
  const won=await runQuest2DFight({
    quest:ASHFALL.title,title:'The Cinder Cart',location:'Old Forge Approach',
    ambience:alertLevel>=2?'Your noisy investigation has drawn an extra sentry to the ambush.':'The party reaches the burnt cart before the sentries realise they were followed.',
    phases:['Ambush','Signal Flare','Cinder Breath'],enemies,eliteIndex:1,
    script:async api=>{
      await api.phase(0,'The ambush closes from both sides.');
      await api.tankEngage();
      await api.attack(1,2);
      await api.phase(1,'The runner reaches for a flare.');
      await api.cast(1,'SIGNAL FLARE',1800,true);
      if(alertLevel>=2&&enemies.length>3){
        await api.cast(3,'ASH WHISTLE',1500,true);
        await api.attack(3,1);
      }
      await api.phase(2,'A hound inhales a cone of burning cinders.');
      await api.cone(0,'CINDER BREATH');
      await api.attack(0,2);
      await api.attack(2,2);
      await api.finishAll();
      api.log('The Ashbound Runner drops a heavy iron key stamped with the old forge seal.');
    }
  });
  if(!won)return;
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
    'Those are east-road survey marks. Crews numbered permanent posts as they travelled away from Zeltira. Lower numbers are closer to town.',
    'But do not blindly follow every symbol. Lantern marks are ventilation shafts, and the flood closed that shaft before this route was cut. Chain marks are sealed side-spurs — dead ends, not roads.',
    'Here. This rubbing has the old post ledger. Match the symbols, discard anything that cannot belong to the route, then order what remains.'
  ],async()=>{
    grantItem('surveyor-rubbing');addHistory('Old Jory supplied the post ledger and explained how old survey routes were encoded.');
    await commit();openSurveyPuzzle();
  });
}
function openSurveyPuzzle(){
  if(currentStage()!=='decipher')return;
  if(!hasItem('surveyor-rubbing')){meetJory();return}
  const q=ensure(),root=puzzleRoot();root.hidden=false;document.body.classList.add('quest-puzzle-open');
  q.surveyMistakes=Number(q.surveyMistakes)||0;
  const expected=['hammer','water','arch','eye'];
  const marks=[
    {id:'hammer',icon:'⚒',label:'Work Mark',post:2},
    {id:'water',icon:'≈',label:'Culvert',post:5},
    {id:'chain',icon:'⛓',label:'Sealed Spur',post:6},
    {id:'lantern',icon:'✧',label:'Vent Shaft',post:8},
    {id:'arch',icon:'∩',label:'Old Arch',post:9},
    {id:'eye',icon:'◉',label:'Inspection Post',post:12}
  ];
  let progress=[];
  const draw=(note='')=>{
    root.innerHTML='<section class="quest-puzzle quest-cipher"><header><div><small>QUEST PUZZLE · JORY’S SURVEY RUBBING</small><h2>Decode the underroad route</h2></div><button data-close>×</button></header>'+
      '<div class="quest-cipher-layout"><aside><div class="quest-puzzle-clue"><span>SURVEY RULES</span><p>Permanent posts are numbered outward from Zeltira. Travel from the lowest surviving route post to the highest.</p></div>'+
      '<div class="quest-puzzle-clue"><span>JORY’S WARNING</span><p>The lantern shaft was already flooded when this route was cut. A chain marks a sealed side-spur — a dead end, never part of the through-route.</p></div>'+
      '<div class="quest-post-ledger"><small>OLD POST LEDGER</small>'+marks.map(m=>'<p><b>POST '+m.post+'</b><span>'+m.icon+' '+m.label+'</span></p>').join('')+'</div></aside>'+
      '<main><small>BUILD A FOUR-MARK ROUTE</small><div class="quest-puzzle-board cipher-board">'+marks.map(x=>'<button data-mark="'+x.id+'" class="'+(progress.includes(x.id)?'chosen':'')+'"><i>'+x.icon+'</i><b>'+x.label+'</b><small>'+(progress.includes(x.id)?'POSITION '+(progress.indexOf(x.id)+1):'SELECT')+'</small></button>').join('')+'</div>'+
      '<div class="quest-puzzle-route">'+[0,1,2,3].map(i=>'<span class="'+(progress[i]?'filled':'')+'">'+(progress[i]?marks.find(x=>x.id===progress[i]).icon:(i+1))+'</span>').join('<i>→</i>')+'</div>'+
      '<div class="quest-cipher-actions"><button data-undo '+(progress.length?'':'disabled')+'>UNDO LAST</button><button data-reset '+(progress.length?'':'disabled')+'>CLEAR ROUTE</button></div>'+
      '<p id="questPuzzleHint" class="'+(note?'wrong':'')+'">'+(note||'Two ledger marks are decoys. Use the route rules to exclude them, then order the remaining posts.')+'</p>'+
      '<div class="quest-resonance-meter"><span>FRAGMENT INSTABILITY</span><div><i style="width:'+Math.min(100,q.surveyMistakes*34)+'%"></i></div><b>'+q.surveyMistakes+'</b></div>'+
      '<button class="quest-puzzle-confirm" data-confirm '+(progress.length===4?'':'disabled')+'>TRACE THE ROUTE</button></main></div></section>';
    root.querySelector('[data-close]').onclick=()=>{root.hidden=true;document.body.classList.remove('quest-puzzle-open')};
    root.querySelectorAll('[data-mark]').forEach(b=>b.onclick=()=>{const id=b.dataset.mark;if(progress.includes(id)||progress.length>=4)return;progress.push(id);draw()});
    root.querySelector('[data-undo]')?.addEventListener('click',()=>{progress.pop();draw()});
    root.querySelector('[data-reset]')?.addEventListener('click',()=>{progress=[];draw()});
    root.querySelector('[data-confirm]')?.addEventListener('click',async()=>{
      if(progress.join('|')!==expected.join('|')){
        q.surveyMistakes++;Game.save?.();progress=[];
        if(q.surveyMistakes%2===0){
          root.hidden=true;document.body.classList.remove('quest-puzzle-open');
          await runResonanceBacklash();
          if(currentStage()==='decipher')openSurveyPuzzle();
          return;
        }
        draw('The fragment rejects that route. At least one mark is a dead end, flooded shaft, or in the wrong post order.');
        return;
      }
      grantItem('decoded-route');setItemStatus('surveyor-rubbing','used');
      addHistory('The guild decoded the survey ledger into a valid underroad route.');
      await commit();
      root.innerHTML='<section class="quest-puzzle solved"><div class="quest-puzzle-solved">⌁</div><small>ROUTE DECIPHERED</small><h2>The Road Under the Road</h2><p>The surviving survey posts form a continuous route from the old work camp through the culvert and arch to the inspection post beneath Zeltira.</p><button data-continue>FOLLOW THE ROUTE →</button></section>';
      root.querySelector('[data-continue]').onclick=async()=>{root.hidden=true;document.body.classList.remove('quest-puzzle-open');await openGearReward({key:'echoes-chest',title:'Old Marks, Older Roads',slot:'Chest',tier:2,source:QUEST.title+' · Old Marks, Older Roads',onClaim:()=>advance('decipher','route','The underroad route was decoded using Old Jory’s survey ledger.')})};
    });
  };
  draw();
}

/* Quest combat uses the same 2D language as dungeon combat. */
function qRole(c){return Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps'}
function qProfile(c){const r=qRole(c);if(r==='tank'||r==='healer')return r;if(['Rogue','Warrior','Paladin'].includes(c.class))return'melee';return'ranged'}
function encounterRoot(){
  let r=$('#questEncounterBackdrop');
  if(!r){r=document.createElement('div');r.id='questEncounterBackdrop';r.className='cb2d-backdrop quest-cb2d-backdrop';r.hidden=true;document.body.appendChild(r)}
  return r;
}
function qRows(){
  return party().map(c=>'<div class="cb2d-party-row"><i class="cb2d-dot '+qRole(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+qRole(c).toUpperCase()+' · '+esc(c.spec)+'</small><em class="cb2d-side-hp"><i data-q-side-hp="'+c.id+'" style="width:100%"></i></em></span><strong data-q-hp-text="'+c.id+'">100 HP</strong></div>').join('');
}
function qRoute(){
  return (questFight?.phases||[]).map((x,i)=>'<span class="'+(i<questFight.phase?'done':i===questFight.phase?'current':'')+'"><i>'+(i+1)+'</i>'+esc(x)+'</span>').join('');
}
function qLog(t){if(!questFight)return;questFight.log.push(t);questFight.log=questFight.log.slice(-30);const e=$('#q2dFeed');if(e)e.innerHTML=questFight.log.slice(-6).map(esc).join('<br>')}
function qStatus(t){const e=$('#q2dStatus');if(e)e.textContent=t}
function qAct(r,t){const e=$('[data-q-act="'+r+'"] em');if(e)e.textContent=t}
function qAddUnit(id,label,cls,x,y,size=''){
  const root=$('#q2dUnits');if(!root)return;
  const e=document.createElement('div');e.className='cb2d-unit '+cls+' '+size;e.dataset.qUnit=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span><em class="cb2d-unit-hp"><i style="width:100%"></i></em>';root.appendChild(e)
}
function qUnit(id){return $('[data-q-unit="'+id+'"]')}
function qMove(id,x,y,ms=520){const e=qUnit(id);if(!e)return;const ox=parseFloat(e.style.left)||x,oy=parseFloat(e.style.top)||y;e.style.setProperty('--face-angle',(Math.atan2(y-oy,x-ox)*180/Math.PI)+'deg');e.style.transitionDuration=ms+'ms';requestAnimationFrame(()=>{e.style.left=x+'%';e.style.top=y+'%'})}
function qPoint(id){const a=$('#q2dArena'),u=qUnit(id);if(!a||!u)return null;const ar=a.getBoundingClientRect(),r=u.getBoundingClientRect();return{x:r.left-ar.left+r.width/2,y:r.top-ar.top+r.height/2,w:ar.width,h:ar.height}}
function qProjectile(from,to,kind='physical',ms=320){const arena=$('#q2dArena'),a=qPoint(from),b=qPoint(to);if(!arena||!a||!b)return;const e=document.createElement('i');e.className='cb2d-projectile '+kind;e.style.left=a.x+'px';e.style.top=a.y+'px';arena.appendChild(e);requestAnimationFrame(()=>{e.style.transitionDuration=ms+'ms';e.style.transform='translate('+(b.x-a.x)+'px,'+(b.y-a.y)+'px)'});setTimeout(()=>e.remove(),ms+130)}
function qFloat(id,text,kind='damage'){const arena=$('#q2dArena'),p=qPoint(id);if(!arena||!p)return;const e=document.createElement('div');e.className='cb2d-number '+kind;e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),850)}
function qSetEnemyHp(i,value){
  if(!questFight)return;const max=questFight.enemyMax[i]||1,prev=questFight.enemyHp[i]||0,next=Math.max(0,Math.min(max,Math.round(value)));questFight.enemyHp[i]=next;
  const u=qUnit('e-'+i),bar=u?.querySelector('.cb2d-unit-hp i');if(bar)bar.style.width=(next/max*100)+'%';
  if(u&&prev>0&&next<=0)u.classList.add('dead')
}
function qSetPartyHp(c,value){if(!questFight)return;const next=Math.max(0,Math.min(100,Math.round(value)));questFight.partyHp[c.id]=next;const bar=$('[data-q-side-hp="'+c.id+'"]');if(bar)bar.style.width=next+'%';const txt=$('[data-q-hp-text="'+c.id+'"]');if(txt)txt.textContent=next+' HP'}
function qRenderMeters(target=0){
  if(!questFight)return;
  const damageRoot=$('#q2dDamageMeter'),threatRoot=$('#q2dThreatMeter'),p=party();
  const rows=p.map(c=>({c,value:Number(questFight.damage[c.id])||0})).sort((a,b)=>b.value-a.value),max=Math.max(1,...rows.map(x=>x.value)),total=rows.reduce((n,x)=>n+x.value,0);
  const totalEl=$('#q2dDamageTotal');if(totalEl)totalEl.textContent=total+' total';
  if(damageRoot)damageRoot.innerHTML=rows.map((x,i)=>'<div class="cb2d-meter-row '+qRole(x.c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(x.c.name)+'</b><span>'+x.value+' damage</span></div><em><i style="width:'+(x.value/max*100)+'%"></i></em></div>').join('');
  const tank=p.find(c=>qRole(c)==='tank'),threatRows=p.map(c=>({c,value:qRole(c)==='tank'?100:Math.min(92,22+(questFight.damage[c.id]||0)/8)})).sort((a,b)=>b.value-a.value);
  const label=$('#q2dThreatTarget');if(label)label.textContent=questFight.enemies[target]||'No target';
  if(threatRoot)threatRoot.innerHTML=threatRows.map((x,i)=>'<div class="cb2d-meter-row '+qRole(x.c)+(tank&&x.c.id===tank.id?' aggro':'')+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(x.c.name)+(tank&&x.c.id===tank.id?' <strong>AGGRO</strong>':'')+'</b><span>'+Math.round(x.value)+'%</span></div><em><i style="width:'+x.value+'%"></i></em></div>').join('')
}
function qDraw(config,finish){
  const root=encounterRoot();root.className='cb2d-backdrop quest-cb2d-backdrop';root.hidden=false;document.body.classList.add('quest-cb2d-open');
  root.innerHTML='<section class="cb2d-shell quest-cb2d-shell"><header class="cb2d-head"><div><small>'+esc(config.quest.toUpperCase())+' · LIVE 2D QUEST</small><h2>'+esc(config.title)+'</h2></div><div class="cb2d-live"><i></i>LIVE <button data-q-close>×</button></div></header>'+
    '<div class="cb2d-route" id="q2dRoute">'+qRoute()+'</div><div class="cb2d-layout"><main><div class="cb2d-arena quest-cb2d-arena" id="q2dArena"><div class="cb2d-floor"></div><div class="quest-cb2d-environment"></div><div class="cb2d-room-tag"><b>'+esc(config.location)+'</b><small>'+esc(config.ambience)+'</small></div><div class="cb2d-ground-legend"><span class="danger">RED · MOVE / AVOID</span><span class="spawn">AMBER · SPAWN / PRIORITY</span><span class="aggro">GOLD LINK · AGGRO</span></div><div id="q2dTelegraphs"></div><div id="q2dUnits"></div><div class="cb2d-caption"><span>QUEST FIGHT</span><b id="q2dStatus">Entering encounter…</b></div></div>'+
    '<div class="cb2d-controls"><button data-q-control="focus"><b>FOCUS TARGET</b><small>Push priority damage.</small></button><button data-q-control="interrupt"><b>INTERRUPT NOW</b><small>Force the current cast stop.</small></button><button data-q-control="defensive"><b>DEFENSIVE</b><small>Reduce incoming pressure.</small></button><button data-q-control="burn"><b>BURN</b><small>Commit damage cooldowns.</small></button></div>'+
    '<div class="cb2d-feed"><small>COMBAT FEED</small><p id="q2dFeed"></p></div></main><aside><div class="cb2d-cast"><small>ENEMY CAST</small><div><b id="q2dCastName">—</b><strong id="q2dCastTime">—</strong></div><div class="cb2d-castbar"><i id="q2dCastFill"></i></div></div><div class="cb2d-combat-meters"><section class="cb2d-meter-panel damage"><div class="cb2d-meter-head"><small>DAMAGE METER</small><span id="q2dDamageTotal">0 total</span></div><div id="q2dDamageMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel threat"><div class="cb2d-meter-head"><small>THREAT METER</small><span id="q2dThreatTarget">No target</span></div><div id="q2dThreatMeter" class="cb2d-meter-list"></div></section></div><div class="cb2d-actions"><small>PARTY ACTIONS</small><div data-q-act="tank"><i class="cb2d-dot tank"></i><b>Tank</b><em>Taking point</em></div><div data-q-act="healer"><i class="cb2d-dot healer"></i><b>Healer</b><em>Holding range</em></div><div data-q-act="dps"><i class="cb2d-dot dps"></i><b>Damage</b><em>Acquiring targets</em></div></div><div class="cb2d-party"><small>ACTIVE FIVE</small>'+qRows()+'</div></aside></div><div class="cb2d-end" id="q2dEnd" hidden></div></section>';
  root.querySelector('[data-q-close]').onclick=()=>{if(!questFight?.finished&&!confirm('Leave this quest fight? It will restart.'))return;encounterToken++;root.hidden=true;document.body.classList.remove('quest-cb2d-open');finish(false)};
  root.querySelectorAll('[data-q-control]').forEach(b=>b.onclick=()=>{const key=b.dataset.qControl;questFight[key]=true;b.classList.add('active');if(key==='interrupt')qLog('You order an immediate interrupt.');if(key==='defensive')qLog('The party braces for incoming damage.');if(key==='focus')qLog('Damage switches to the priority target.');if(key==='burn')qLog('The party commits offensive cooldowns.')});
}
function qSpawn(){
  const p=party(),melee=p.filter(c=>qProfile(c)==='melee'),ranged=p.filter(c=>qProfile(c)==='ranged');
  p.forEach((c,i)=>{qAddUnit('p-'+c.id,c.name,'party '+qRole(c)+' profile-'+qProfile(c),4,50+(i-2)*4);let x=16,y=50;if(qRole(c)==='tank'){x=30;y=50}else if(qProfile(c)==='melee'){x=23;y=43+melee.indexOf(c)*14}else if(qProfile(c)==='ranged'){x=17;y=28+ranged.indexOf(c)*44}else{x=12;y=61}setTimeout(()=>qMove('p-'+c.id,x,y,800),40)});
  questFight.enemies.forEach((n,i)=>{const y=questFight.enemies.length===1?50:27+i*(46/Math.max(1,questFight.enemies.length-1)),big=i===questFight.eliteIndex||questFight.enemies.length===1;qAddUnit('e-'+i,n,big?'enemy big':'enemy',92,y,big?'big':'');setTimeout(()=>qMove('e-'+i,68,y,780),70)});
  qRenderMeters(questFight.eliteIndex>=0?questFight.eliteIndex:0)
}
async function qPhase(i,text){if(!questFight)return;questFight.phase=i;const r=$('#q2dRoute');if(r)r.innerHTML=qRoute();qStatus(text);qLog(text);await wait(500)}
async function qTankEngage(){
  const tank=party().find(c=>qRole(c)==='tank');if(!tank)return;
  qAct('tank',tank.name+' establishes threat');qMove('p-'+tank.id,52,50,480);
  questFight.enemies.forEach((_,i)=>qMove('e-'+i,61,32+i*(36/Math.max(1,questFight.enemies.length-1)),450));
  qLog(tank.name+' takes control of the pack.');await wait(650)
}
async function qAttack(index,rounds=1){
  if(!questFight||questFight.enemyHp[index]<=0)return;
  const p=party(),target='e-'+index;
  for(let r=0;r<rounds;r++){
    for(const c of p){
      if(qRole(c)==='healer')continue;
      if(questFight.enemyHp[index]<=0)break;
      const kind=c.class==='Mage'?'magic':c.class==='Hunter'?'arrow':'slash',base=qRole(c)==='tank'?18:25,boost=(questFight.burn?8:0)+(questFight.focus?4:0),dmg=base+boost+Math.floor(Math.random()*8);
      qProjectile('p-'+c.id,target,kind);questFight.damage[c.id]+=dmg;qSetEnemyHp(index,questFight.enemyHp[index]-dmg);qFloat(target,'-'+dmg,'damage');
      qAct(qRole(c)==='tank'?'tank':'dps',c.name+' attacks '+questFight.enemies[index]);qRenderMeters(index);await wait(90)
    }
    await wait(300)
  }
}
async function qEnemyHit(index,amount=14){
  const tank=party().find(c=>qRole(c)==='tank'),healer=party().find(c=>qRole(c)==='healer');if(!tank||questFight.enemyHp[index]<=0)return;
  qProjectile('e-'+index,'p-'+tank.id,'enemy');const hit=Math.max(4,amount-(questFight.defensive?7:0));qSetPartyHp(tank,questFight.partyHp[tank.id]-hit);qFloat('p-'+tank.id,'-'+hit,'incoming');qAct('tank',tank.name+' absorbs the hit');await wait(280);
  if(healer){qProjectile('p-'+healer.id,'p-'+tank.id,'heal');const heal=Math.min(12,100-questFight.partyHp[tank.id]);qSetPartyHp(tank,questFight.partyHp[tank.id]+heal);qFloat('p-'+tank.id,'+'+heal,'heal');qAct('healer',healer.name+' restores '+tank.name);await wait(260)}
}
function qTelegraph(type,fromId,toId,label,size=145){
  const root=$('#q2dTelegraphs'),a=qPoint(fromId),b=qPoint(toId);if(!root||!a||!b)return null;
  const e=document.createElement('div');e.className='cb2d-tg '+type+' dynamic';
  const s=document.createElement('span');s.className='cb2d-tg-label';s.textContent=label;e.appendChild(s);
  if(type==='circle'){e.style.left=b.x+'px';e.style.top=b.y+'px';e.style.width=size+'px';e.style.height=size+'px';e.style.transform='translate(-50%,-50%)'}
  else{const angle=Math.atan2(b.y-a.y,b.x-a.x),length=Math.max(190,Math.min(a.w*.62,360));e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.width=length+'px';e.style.height=(type==='line'?44:140)+'px';e.style.transform='translateY(-50%) rotate('+(angle*180/Math.PI)+'deg)'}
  root.appendChild(e);requestAnimationFrame(()=>e.classList.add('show'));return e
}
async function qCone(index,label){
  const tank=party().find(c=>qRole(c)==='tank');if(!tank)return;const e=qTelegraph('cone','e-'+index,'p-'+tank.id,label);qStatus(label+' · MOVE / FACE AWAY');qLog(questFight.enemies[index]+' begins '+label+'.');qAct('tank',tank.name+' turns the attack away from the group');
  party().filter(c=>c.id!==tank.id).forEach((c,i)=>qMove('p-'+c.id,35,22+i*15,430));await wait(900);e?.classList.add('impact');await qEnemyHit(index,18);setTimeout(()=>e?.remove(),180);await wait(320)
}
async function qLine(index,target,label){
  const e=qTelegraph('line','e-'+index,'p-'+target.id,label);qStatus(label+' · LINE ATTACK');qLog(questFight.enemies[index]+' draws a line through '+target.name+'.');
  qMove('p-'+target.id,38,target===party()[0]?25:75,420);await wait(900);e?.classList.add('impact');setTimeout(()=>e?.remove(),180);await wait(300)
}
async function qCircle(target,label){
  const e=qTelegraph('circle','e-'+(questFight.eliteIndex>=0?questFight.eliteIndex:0),'p-'+target.id,label,155);qStatus(label+' · SPREAD');qLog(target.name+' is marked by '+label+'.');
  party().filter(c=>c.id!==target.id).forEach((c,i)=>qMove('p-'+c.id,26+i*6,20+i*14,430));await wait(900);e?.classList.add('impact');qFloat('p-'+target.id,'-6','incoming');qSetPartyHp(target,questFight.partyHp[target.id]-(questFight.defensive?2:6));setTimeout(()=>e?.remove(),180);await wait(300)
}
async function qCast(index,name,duration=1700,interruptible=true){
  const n=$('#q2dCastName'),t=$('#q2dCastTime'),f=$('#q2dCastFill');if(n)n.textContent=name;if(t)t.textContent=(duration/1000).toFixed(1)+'s';if(f){f.style.transition='none';f.style.width='0';requestAnimationFrame(()=>{f.style.transition='width '+duration+'ms linear';f.style.width='100%'})}
  qStatus(name+(interruptible?' · INTERRUPTIBLE':''));
  qLog(questFight.enemies[index]+' begins '+name+'.');
  const dps=party().find(c=>qRole(c)==='dps');const early=Math.round(duration*.55);await wait(early);
  if(interruptible&&(questFight.interrupt||dps)){
    if(dps)qProjectile('p-'+dps.id,'e-'+index,dps.class==='Hunter'?'arrow':'magic',260);
    questFight.interrupt=false;qAct('dps',(dps?.name||'Damage')+' interrupts '+name);qLog(name+' is interrupted.');if(f){f.style.transition='none';f.style.width='58%';f.style.background='#69bd87'}if(n)n.textContent='INTERRUPTED';if(t)t.textContent='STOPPED';await wait(450);if(f)f.style.background='';return true
  }
  await wait(duration-early);qLog(name+' completes.');await qEnemyHit(index,20);return false
}
async function qFinishAll(){
  for(let i=0;i<questFight.enemies.length;i++){
    while(questFight.enemyHp[i]>0)await qAttack(i,1);
  }
}
async function runQuest2DFight(config){
  const p=party();if(p.length!==5)return false;
  const tok=++encounterToken;
  return await new Promise(resolve=>{
    let settled=false;const finish=value=>{if(settled)return;settled=true;resolve(value)};
    const max=config.enemies.map((_,i)=>i===config.eliteIndex?520:config.enemies.length===1?440:270);
    questFight={token:tok,title:config.title,phases:config.phases||['Encounter'],phase:0,enemies:config.enemies,eliteIndex:Number.isInteger(config.eliteIndex)?config.eliteIndex:-1,enemyMax:max,enemyHp:[...max],partyHp:Object.fromEntries(p.map(c=>[c.id,100])),damage:Object.fromEntries(p.map(c=>[c.id,0])),log:[],focus:false,interrupt:false,defensive:false,burn:false,finished:false};
    qDraw(config,finish);qSpawn();qLog(config.ambience);
    (async()=>{
      try{
        await wait(700);if(tok!==encounterToken)return;
        const api={phase:qPhase,tankEngage:qTankEngage,attack:qAttack,enemyHit:qEnemyHit,cone:qCone,line:qLine,circle:qCircle,cast:qCast,finishAll:qFinishAll,log:qLog,status:qStatus};
        await config.script(api);if(tok!==encounterToken)return;
        questFight.finished=true;qStatus('ENCOUNTER CLEAR');qLog('The party secures the area.');
        const end=$('#q2dEnd');if(end){end.hidden=false;end.innerHTML='<div><small>QUEST FIGHT COMPLETE</small><h3>'+esc(config.title)+'</h3><p>'+esc(config.completeText||'The way forward is clear.')+'</p></div><button data-q-continue>CONTINUE QUEST →</button>';end.querySelector('[data-q-continue]').onclick=()=>{encounterRoot().hidden=true;document.body.classList.remove('quest-cb2d-open');finish(true)}}
      }catch(err){console.error('Quest combat failed',err);encounterRoot().hidden=true;document.body.classList.remove('quest-cb2d-open');finish(false)}
    })();
  });
}
async function runResonanceBacklash(){
  const q=ensure(),bearer=party().find(c=>c.id===q.bearerId)||party()[0];
  return runQuest2DFight({quest:QUEST.title,title:'Resonance Backlash',location:'Jory’s Workshop',ambience:'The Blackened Fragment rejects the false route and tears an echo out of the room.',phases:['Backlash'],enemies:['Resonance Echo'],eliteIndex:0,completeText:'The echo collapses back into the fragment. The cipher is still waiting.',script:async api=>{await api.phase(0,'The fragment manifests a hostile echo.');await api.tankEngage();await api.circle(bearer,'MEMORY BURST');await api.cast(0,'RESONANCE SHRIEK',1600,true);await api.attack(0,3);await api.finishAll()}});
}
async function beginInvestigation(){
  const q=ensure(),p=party();if(currentStage()!=='route')return;
  if(p.length!==5){alert('Build a complete five-character party before following the route.');Game.switchView?.('party');return}
  const bearer=p.find(c=>c.id===q.bearerId)||p[0],ranged=p.find(c=>qProfile(c)==='ranged')||p.find(c=>qRole(c)==='dps')||p[0];
  const won=await runQuest2DFight({
    quest:QUEST.title,title:'The Road Under the Road',location:'Collapsed Survey Tunnels',
    ambience:'Jory’s decoded posts lead beneath the east road. The Blackened Fragment grows warmer with every step.',
    phases:['Buried Junction','Resonance Husk','Hollow Seal'],enemies:['Hollow Scavenger','Hollow Scavenger','Resonance Husk'],eliteIndex:2,
    completeText:'A final survey mark is cut into the wall behind the broken Husk. Beyond it waits the Hollow Seal.',
    script:async api=>{
      await api.phase(0,'Three shapes pull themselves out of the old masonry.');
      await api.tankEngage();await api.attack(0,2);await api.attack(1,2);
      await api.phase(1,'The Resonance Husk locks onto the Blackened Fragment.');
      await api.line(2,ranged,'RESONANCE LASH');
      await api.cast(2,'BINDING HUM',1850,true);
      await api.circle(bearer,'CELL PULSE');
      await api.attack(2,3);await api.finishAll();
      await api.phase(2,'The tunnel falls silent. A sealed stone door breathes beyond the final post.');
      api.log('The decoded route ends at the Hollow Seal.');
    }
  });
  if(!won)return;
  setItemStatus('decoded-route','used');
  await advance('route','seal','The guild fought through the buried survey tunnels and discovered the Hollow Seal.');
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
  $$('.quest-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.questTab===selectedTab));
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