(()=>{
'use strict';
window.CellboundCombatStandard?.register?.('quest-encounters',{kind:'quest-combat',execution:'local',ui:'shared-cb2d'});

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const G=window.CellboundGear;
const CP=window.CellboundPortraits;

let Game=null,selectedTab='active',selectedAdventure='ashfall',encounterToken=0,questFight=null;

const QUEST={
  id:'echoes-beneath-zeltira',
  title:'Echoes Beneath Zeltira',
  difficulty:'Intermediate',
  length:'Long',
  start:'Bram Kel · East Road Survey Camp',
  summary:'A road crew breaks open stone beneath Zeltira and finds black Cell glass warm to the touch. The shard should be dead. Instead, it reacts to your guild — and remembers somewhere no living map records.',
  rewards:['250 Gold','150 Guild Renown'],
  requirements:['Zeltira tutorial completed','An active five-character party will be needed','Access to The Ashen Vault']
};

/*
QUEST WRITING BIBLE
- Dialogue should sound spoken, not like quest instructions.
- NPCs know only what they plausibly know; let the player connect clues.
- Prefer tension, personality and implication over exposition.
- No NPC should explain a puzzle answer before the player solves it.
- Keep most dialogue beats to one strong thought.
NPC voices:
  Elara Vey — clipped, practical, protective; distrusts guesses and wasted lives.
  Bram Kel — working-man dry humour; jokes when uncomfortable, never when stakes are obvious.
  Tessa Orr — precise, fascinated, occasionally unsettling; treats dangerous Cell phenomena as irresistible problems.
  Old Jory — prickly expert, proud of obsolete knowledge, warmer than he pretends.
*/
const ASHFALL={
  id:'ashes-on-the-east-road',
  title:'Ashes on the East Road',
  difficulty:'Novice',
  length:'Medium',
  start:'Warden Elara Vey · Zeltira East Gate',
  summary:'Three supply carts vanish on the same quiet road. At the first wreck, ash from a forge abandoned for years is ground into the wheel ruts.',
  requirements:['Zeltira tutorial completed','A complete active five-character party'],
  rewards:['Tier 1 quest gear','The Ashen Vault unlocked','120 Gold','75 Guild Renown']
};
const ASHFALL_STAGES=[
  {id:'warning',label:'A Road Gone Quiet',objective:'Elara has stopped traffic on the east road. Find out why.',hint:'The first wreck was found before dawn. The horses were gone.'},
  {id:'tracks',label:'Tracks in the Cinders',objective:'Reconstruct what happened at the first wreck.',hint:'Something arrived from off-road. Something else left uphill.'},
  {id:'ambush',label:'The Cinder Cart',objective:'Follow the attackers before they realise they were tracked.',hint:'The forge has been cold for years. The ash beneath your boots is not.'},
  {id:'key',label:'A Door in the Mountain',objective:'Show Elara what the Ashbound were carrying.',hint:'Elara will recognise the seal.'}
];

const STAGES=[
  {id:'letter',label:'An Unwelcome Delivery',npc:'Bram Kel',objective:'Bram Kel has sent something he refuses to keep in his office.',hint:'The package hums faintly when a Cellbound adventurer stands near it.'},
  {id:'bearer',label:'A Living Resonance',npc:'Tessa Orr',objective:'Tessa wants the shard kept close to one adventurer.',hint:'It reacts differently to each living Cell it approaches.'},
  {id:'vault',label:'Make It Sing',npc:'Tessa Orr',objective:'Expose the fragment to a stronger Cell resonance.',hint:'The shard has begun producing marks beneath its surface.'},
  {id:'decipher',label:'Old Marks, Older Roads',npc:'Old Jory',objective:'Find the person in Zeltira who still understands the old road marks.',hint:'Someone kept these roads before modern maps existed.'},
  {id:'route',label:'The Road Under the Road',npc:'Bram Kel',objective:'Take Jory’s route into the tunnels beneath the east road.',hint:'Nobody has officially entered these tunnels in decades.'},
  {id:'seal',label:'The Door That Breathed',npc:'Tessa Orr',objective:'Work out what the Blackened Fragment was trying to lead you toward.',hint:'The door reacts before the shard even touches it.'}
];

const ITEMS={
  'blackened-fragment':{icon:'◈',name:'Blackened Fragment',desc:'Warm Cell glass found inside the stone beneath Zeltira.'},
  'resonance-map':{icon:'⌘',name:'Resonance Map',desc:'Silver lines awakened by the Vaultheart. They resemble survey marks.'},
  'surveyor-rubbing':{icon:'▧',name:'Jory’s Survey Rubbing',desc:'An old field rubbing showing how Zeltiran road crews ordered their route marks.'},
  'decoded-route':{icon:'⌁',name:'Decoded Underroad Route',desc:'A route from the east road into sealed works beneath Zeltira.'}
};

const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const portraitHTML=(c,size='sm')=>CP?.portraitHTML?.(c,{size})||'<span class="cb-portrait cb-portrait--'+size+'"><b>'+esc(c?.portrait||String(c?.name||'?').slice(0,2).toUpperCase())+'</b></span>';
function speakerPortrait(speaker){
  const key=String(speaker||'').trim().toLowerCase();
  const character=(state()?.roster||[]).find(c=>String(c?.name||'').trim().toLowerCase()===key);
  if(character)return '<div class="quest-dialogue-portrait">'+portraitHTML(character,'lg')+'</div>';
  const initials=String(speaker||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';
  return '<div class="quest-dialogue-portrait is-monogram">'+esc(initials)+'</div>';
}
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
  q.classTrials=q.classTrials&&typeof q.classTrials==='object'?q.classTrials:{};
  q.nullComplex=q.nullComplex&&typeof q.nullComplex==='object'?q.nullComplex:{started:false,stage:'signal',done:[],complete:false,history:[],components:{cable:false,cell:false,fuse:false},searchPressure:0};
  q.nullComplex.done=Array.isArray(q.nullComplex.done)?q.nullComplex.done:[];q.nullComplex.history=Array.isArray(q.nullComplex.history)?q.nullComplex.history:[];q.nullComplex.components=q.nullComplex.components||{cable:false,cell:false,fuse:false};q.nullComplex.searchPressure=Math.max(0,Number(q.nullComplex.searchPressure)||0);
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
 return root
}
const QUEST_COMIC_ART={
 ashen:['./assets/dungeons/ashen-vault.webp','./assets/bosses/ashen-vault-vaultheart.webp','./assets/comics/tutorial/dawn_briefing_on_the_ash_road.webp','./assets/comics/tutorial/dawn_departure_from_zeltira_citadel.webp'],
 hollow:['./assets/dungeons/hollow-sanctum.webp','./assets/bosses/hollow-sanctum-bound-choir.webp','./assets/comics/tutorial/moonlit_ruins_and_the_glowing_wardstone.webp','./assets/comics/tutorial/warden_s_descent_into_the_ruins.webp'],
 zeltira:['./assets/comics/tutorial/dawn_briefing_on_the_ash_road.webp','./assets/comics/tutorial/the_quartermaster_s_choice.webp','./assets/comics/tutorial/dawn_departure_from_zeltira_citadel.webp','./assets/comics/tutorial/wardens_at_the_twilight_city_gate.webp'],
 trial:['./assets/comics/tutorial/arcane_overload_a_warden_s_lesson.webp','./assets/comics/tutorial/the_warden_and_the_arcane_diadem.webp','./assets/comics/tutorial/arcane_forge_beneath_the_twilight_citadel.webp','./assets/comics/tutorial/moonlit_ruins_and_the_glowing_wardstone.webp']
};
function questComicArtSet(title,speaker){
 const key=(String(title||'')+' '+String(speaker||'')).toLowerCase();
 if(/trial|mentor/.test(key))return QUEST_COMIC_ART.trial;
 if(/vault|forge|ash|elara/.test(key))return QUEST_COMIC_ART.ashen;
 if(/seal|hollow|fragment|tessa|jory|bram|letter|bearer|pressure/.test(key))return QUEST_COMIC_ART.hollow;
 return QUEST_COMIC_ART.zeltira
}
function comicPanels(title,speaker,beats){
 const list=Array.isArray(beats)?beats:[beats],art=questComicArtSet(title,speaker);
 return list.map((text,i)=>({
  kind:i===0?'location':'dialogue',
  eyebrow:i===0?'QUEST STORY':'',
  speaker,
  title:i===0?title:'',
  text:String(text||''),
  artwork:art[i%art.length],
  wide:list.length===1
 }))
}
async function showDialogue(title,speaker,beats,onDone){
 const comic=window.CellboundComicScenes;
 if(comic?.show){
  await comic.show({
   eyebrow:'CELLBOUND · QUEST',
   title,
   subtitle:speaker,
   page:'QUEST',
   theme:'zeltira',
   panels:comicPanels(title,speaker,beats),
   progressive:true,
   storyOnly:true,
   allowSkip:true,
   skipLabel:'SKIP STORY',
   nextLabel:'NEXT PANEL →',
   continueLabel:'CONTINUE QUEST →'
  });
  if(onDone)await onDone();
  return
 }
 const root=dialogueRoot();let index=0;
 const draw=()=>{
  root.innerHTML='<section class="quest-dialogue">'+speakerPortrait(speaker)+'<div><small>'+esc(speaker)+'</small><h3>'+esc(title)+'</h3><p>'+esc(beats[index])+'</p><div class="quest-dialogue-progress">'+beats.map((_,i)=>'<i class="'+(i<=index?'active':'')+'"></i>').join('')+'</div><button data-next>'+(index===beats.length-1?'CONTINUE →':'NEXT →')+'</button></div></section>';
  root.querySelector('[data-next]').onclick=async()=>{if(index<beats.length-1){index++;draw();return}root.hidden=true;if(onDone)await onDone()}
 };
 draw();root.hidden=false
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
      '<div class="quest-gear-body"><aside><small>CHOOSE ADVENTURER</small>'+chars.map(c=>'<button data-qgr-char="'+c.id+'" class="'+(c.id===ch.id?'active':'')+'"><span>'+portraitHTML(c,'sm')+'</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></div></button>').join('')+'</aside>'+
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
    'One missing cart is theft. Three is a pattern.',
    'Patrol found the first one on its side before dawn. Grain everywhere. Harness torn clean through. No driver. No blood.',
    'There is one thing I cannot account for: black furnace ash ground into the wheel ruts.',
    'The old forge has been cold for eighteen years.',
    'Go look at the wreck. Do not bring me a theory. Bring me something I can act on.'
  ],()=>advanceAshfall('warning','tracks','Elara sent the guild to reconstruct what happened on the east road.'));
}
function openAshfallTracks(){
  if(ashfallStage()!=='tracks')return;
  const q=ensure(),a=q.ashfall,root=puzzleRoot();root.hidden=false;document.body.classList.add('quest-puzzle-open');
  a.investigationMistakes=Number(a.investigationMistakes)||0;
  const evidence=[
    {icon:'◫',title:'Axle & wheel',text:'The axle burst outward after the wheel twisted. No weapon marks. The leather harness is torn forward, hard enough to pull the brass rings open.'},
    {icon:'⌁',title:'Tracks',text:'Hound prints come out of the north-east scrub beside two sets of boots. At the wreck, the paws circle. The boots keep climbing.'},
    {icon:'✦',title:'Ash sample',text:'The ash glitters with beads of melted black glass. You have seen the same residue fused into the stone around the abandoned forge.'},
    {icon:'↯',title:'Scorching',text:'Scorching blackens the spilled grain, but boot heels cut cleanly through the burns. The cart fell first. The fire came next. Someone walked away last.'}
  ];
  const questions=[
    {title:'What most likely caused the cart to crash?',answers:['A weapon smashed the axle','The hounds panicked the horses from the north-east cut','The driver deliberately overturned it'],correct:1,success:'The wreck was the result of the horses bolting. Whatever frightened them came out of the north-east cut.'},
    {title:'Which trail should the party follow?',answers:['The horse tracks back toward Zeltira','The hound pads that stop beside the cart','The two boot patterns continuing uphill'],correct:2,success:'The hounds stayed with the wreck. Two people left it on foot, uphill.'},
    {title:'Where are the attackers most likely heading?',answers:['The abandoned forge','The river crossing','Back into Zeltira'],correct:0,success:'The ash did not drift here. Someone brought it down from the old forge.'}
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
        draw('Something in that answer does not fit the scene. Check what happened before the cart fell — and what happened after.');
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
    ambience:alertLevel>=2?'A whistle answers from above the road. You were heard. Another sentry is already moving.':'The tracks end at a second cart, burnt down to its ironwork. Nobody is visible. That is the problem.',
    phases:['Ambush','Signal Flare','Cinder Breath'],enemies,eliteIndex:1,
    combat:{kind:'boss',level:2,recommendedItemLevel:18,enemyTypes:alertLevel>=2?['trash','elite','trash','trash']:['trash','elite','trash'],enemyHealth:alertLevel>=2?600:520,scaling:alertLevel>=2?{enemyDamage:1.08}:{enemyDamage:1},mechanics:alertLevel>=2?[['Signal Flare','interrupt',1800],['Ash Whistle','interrupt',1500],['Cinder Breath','cone',1700]]:[['Signal Flare','interrupt',1800],['Cinder Breath','cone',1700]]},
    completeText:'The ambush is broken. The Ashbound Runner drops a heavy iron key stamped with the old forge seal.'
  });
  if(!won)return;
  await openGearReward({key:'ashfall-chest',title:'The Cinder Cart',slot:'Chest',tier:1,source:ASHFALL.title+' · The Cinder Cart',onClaim:()=>advanceAshfall('ambush','key','An Ashbound runner dropped a key bearing the old forge seal.')});
}
async function finishAshfall(){
  if(ashfallStage()!=='key')return;
  showDialogue('The Old Forge Key','Warden Elara Vey',[
    'Put that on the table.',
    '...I have not seen that seal since I was a recruit.',
    'The Ashen Vault keepers carried keys like this. We melted every one we recovered after the forge was shut.',
    'So either we missed one... or somebody made another.',
    'Those carts were not being robbed. They were being emptied.',
    'Keep the key. I will close the road. What you do with the door is your decision — but make it before whoever is behind it makes theirs.'
  ],()=>openGearReward({key:'ashfall-weapon',title:'A Door in the Mountain',slot:'Weapon',tier:1,source:ASHFALL.title+' · Completion',onClaim:completeAshfall}));
}
async function completeAshfall(){
  const s=state(),a=ensure().ashfall;if(a.complete)return;
  a.complete=true;a.stage='complete';a.completedAt=new Date().toISOString();if(!a.done.includes('key'))a.done.push('key');
  s.progression=s.progression||{};s.progression.ashenVaultUnlocked=true;s.gold=(Number(s.gold)||0)+120;s.renown=(Number(s.renown)||0)+75;
  ashfallHistory('The old forge key opened the route to The Ashen Vault.');s.activity.push('Quest complete: '+ASHFALL.title+'. The Ashen Vault was unlocked.');
  await commit();
  if(window.CellboundComicScenes?.show){
    await window.CellboundComicScenes.show({
      eyebrow:'QUEST COMPLETE',title:ASHFALL.title,subtitle:'The road to the old forge is open.',page:'COMPLETE',theme:'ashen',
      panels:[
        {kind:'location',eyebrow:'THE EAST ROAD',title:'A Door in the Mountain',text:'The road is closed. The old forge is awake. And your guild now holds the only key anyone knows still exists.',artwork:'./assets/dungeons/ashen-vault.webp',wide:true},
        {kind:'reveal',eyebrow:'REWARD',title:'+120 Gold · +75 Renown',text:'The Ashen Vault has been permanently unlocked.',artwork:'./assets/comics/tutorial/the_warden_and_the_arcane_diadem.webp'},
        {kind:'location',eyebrow:'DUNGEON UNLOCKED',title:'The Ashen Vault',text:'Quest gear gives you a reliable starting point. Better versions now wait inside the dungeon.',artwork:'./assets/bosses/ashen-vault-vaultheart.webp'}
      ],progressive:true,storyOnly:true,allowSkip:false,nextLabel:'NEXT PANEL →',continueLabel:'OPEN DUNGEON JOURNAL →'
    });
    Game.switchView?.('content');return
  }
  const root=document.createElement('div');root.className='quest-unlock-backdrop quest-complete-backdrop';
  root.innerHTML='<section class="quest-complete-card"><div class="quest-complete-rune">♜</div><small>QUEST COMPLETE</small><h2>'+ASHFALL.title+'</h2><p>The road is closed. The old forge is awake. And your guild now holds the only key anyone knows still exists.</p><div class="quest-complete-rewards"><article><span>GOLD</span><b>+120</b></article><article><span>RENOWN</span><b>+75</b></article><article><span>DUNGEON</span><b>UNLOCKED</b></article></div><button>OPEN DUNGEON JOURNAL →</button></section>';
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
    'Before you ask: no, I did not dig it up on purpose.',
    'Derren put a pick through the east-road bed and the stone underneath started humming. Not vibrating. Humming.',
    'We cracked the slab and found this black shard sealed inside it. Warm as skin.',
    'Derren swears it said his name. Derren also swears a goat once stole both his boots while he was wearing them, so I left that out of the report.',
    'Then Tessa saw the shard and stopped smiling.',
    'That is the part I thought you should know.'
  ],()=>showDialogue('Something That Should Be Dead','Tessa Orr',[
    'Bram makes everything sound worse than it is.',
    'This is worse than he made it sound.',
    'It is Cell glass. Or it was. There is no living lattice left inside it. By every test I have, this thing is dead.',
    'And yet when one of your adventurers comes near...',
    '...there. Again.',
    'It is not waking up. It is recognising something.'
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
    c.name+'. Good. Hold it.',
    'Do not squeeze it.',
    '...There. The surface just changed temperature.',
    'From now on, '+c.name+' keeps it close. If they hear a voice, dream of somewhere they have never been, or suddenly know a road they have never walked, I want every detail.',
    'And before you ask — no, that list was not hypothetical.',
    'We need a stronger resonance. Take it near the Vaultheart.'
  ],()=>openGearReward({key:'echoes-head',title:'A Living Resonance',slot:'Head',tier:2,source:QUEST.title+' · A Living Resonance',onClaim:()=>advance('bearer','vault',c.name+' became the Bearer of the Blackened Fragment.')}));
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
    'Put it down. Carefully.',
    (q.bearerName||'The Bearer')+' has carried it back hot enough to mark the cloth.',
    'Look beneath the black surface. Those silver lines were not there before the Vaultheart fell.',
    'No — they are too regular to be cracks.',
    'Hooks. Bars. Repeated spacing.',
    'This is not writing. It is a route.',
    'And I have absolutely no idea how to read it.'
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
    'Stop. We are not going back to the Vault.',
    'Your five are carrying more Cell pressure now than the Vaultheart produced when I first designed this test.',
    'Stand around the table. Nobody touch the shard yet.',
    'On three, let the pressure rise together.',
    'One... two—',
    'There. It moved before three.'
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
    'Tessa sent you.',
    'No, do not answer. Nobody else in Zeltira still remembers I exist until a map starts frightening them.',
    'Let me see the shard.',
    '...Hah.',
    'These are survey cuts. East-road crew marks. Older than half the buildings above us.',
    'The numbers run outward from Zeltira. Small to large. That part is easy.',
    'The rest is where young people get themselves buried.',
    'A lantern is a vent, not a road. A chain is a sealed spur. If you follow either because the symbol looks important, I will deny knowing you.',
    'Take the ledger. Work it out properly.'
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
function qClassKey(c){return 'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function qProfile(c){const r=qRole(c);if(r==='tank'||r==='healer')return r;if(['Rogue','Warrior','Paladin','Death Knight','Demon Hunter'].includes(c.class))return'melee';return'ranged'}
function encounterRoot(){
  let r=$('#questEncounterBackdrop');
  if(!r){r=document.createElement('div');r.id='questEncounterBackdrop';r.className='cb2d-backdrop quest-cb2d-backdrop';r.hidden=true;document.body.appendChild(r)}
  return r;
}
function qResourceDef(c){return window.CellboundCombatReborn?.RESOURCE_DEFS?.[c?.class]||{name:'Power',max:100,start:100}}
function qResourceClass(name){return 'resource-'+String(name||'power').toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function qCombatants(){return Array.isArray(questFight?.participants)&&questFight.participants.length?questFight.participants:party()}
function qRows(){
  return qCombatants().map(c=>{
    const hp=Math.max(0,Math.min(100,Number(questFight?.partyHp?.[c.id])||0)),def=qResourceDef(c),r=questFight?.resources?.[c.id]||def,max=Math.max(1,Number(r.max)||Number(def.max)||100),value=Math.max(0,Math.min(max,Number(r.value??def.start)||0)),name=r.name||def.name||'Power';
    return '<div class="cb2d-party-row" data-q-row="'+c.id+'"><i class="cb2d-dot '+qClassKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+'Lv. '+Math.max(1,Number(c.level)||1)+' · '+qRole(c).toUpperCase()+' · '+esc(c.spec)+'</small><em class="cb2d-side-hp"><i data-q-side-hp="'+c.id+'" style="width:'+hp+'%"></i></em><em class="q2d-side-resource '+qResourceClass(name)+'" data-q-side-resource="'+c.id+'" title="'+esc(name)+'"><i style="width:'+(value/max*100)+'%"></i></em></span><strong data-q-hp-text="'+c.id+'">'+Math.round(hp)+' HP</strong></div>'
  }).join('');
}
function qRoute(){
  return (questFight?.phases||[]).map((x,i)=>'<span class="'+(i<questFight.phase?'done':i===questFight.phase?'current':'')+'"><i>'+(i+1)+'</i>'+esc(x)+'</span>').join('');
}
function qLog(t){if(!questFight)return;questFight.log.push(t);questFight.log=questFight.log.slice(-30);const e=$('#q2dFeed');if(e)e.innerHTML=questFight.log.slice(-6).map(esc).join('<br>')}
function qStatus(t){const e=$('#q2dStatus');if(e)e.textContent=t}
function qAct(r,t){const e=$('[data-q-act="'+r+'"] em');if(e)e.textContent=t}
function qAddUnit(id,label,cls,x,y,size='',meta=''){
  const root=$('#q2dUnits');if(!root)return;
  const e=document.createElement('div');e.className='cb2d-unit '+cls+' '+size;e.dataset.qUnit=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+(meta?'<small class="cb2d-unit-meta">'+esc(meta)+'</small>':'')+'</span><em class="cb2d-unit-hp"><i style="width:100%"></i></em>';root.appendChild(e)
}
function qUnit(id){return $('[data-q-unit="'+id+'"]')}
function qMove(id,x,y,ms=520){const e=qUnit(id);if(!e)return;const ox=parseFloat(e.style.left);const oy=parseFloat(e.style.top);const fromX=Number.isFinite(ox)?ox:x,fromY=Number.isFinite(oy)?oy:y,speed=Math.max(.25,Number(questFight?.speed)||1),dur=Math.max(90,Math.round((Number(ms)||520)/speed));e.style.setProperty('--face-angle',(Math.atan2(y-fromY,x-fromX)*180/Math.PI)+'deg');e.style.transitionDuration=dur+'ms';requestAnimationFrame(()=>{if(!e.isConnected)return;e.style.left=x+'%';e.style.top=y+'%'})}
function qPoint(id){const a=$('#q2dArena'),u=qUnit(id);if(!a||!u)return null;const ar=a.getBoundingClientRect(),r=u.getBoundingClientRect();return{x:r.left-ar.left+r.width/2,y:r.top-ar.top+r.height/2,w:ar.width,h:ar.height}}
function qFace(id,targetId){const e=qUnit(id),a=qPoint(id),b=qPoint(targetId);if(!e||!a||!b)return;e.style.setProperty('--face-angle',(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI)+'deg')}
function qProjectile(from,to,kind='physical',ms=320){
 if(window.CellboundCombatFX?.living)return;
const arena=$('#q2dArena'),a=qPoint(from),b=qPoint(to);if(!arena||!a||!b)return;const speed=Math.max(.25,Number(questFight?.speed)||1),dur=Math.max(1,Math.round(ms/speed)),dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI,e=document.createElement('i');e.className='cb2d-projectile '+kind;e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.transform='rotate('+angle+'deg)';arena.appendChild(e);requestAnimationFrame(()=>{e.style.transitionDuration=dur+'ms';e.style.transform='translate('+dx+'px,'+dy+'px) rotate('+angle+'deg)'});setTimeout(()=>e.remove(),dur+130)}
function qPulseUnit(id,cls,ms=360){
  const e=qUnit(id);if(!e)return;const speed=Math.max(.25,Number(questFight?.speed)||1),dur=Math.max(90,Math.round(ms/speed));
  e.classList.remove(cls);void e.offsetWidth;e.classList.add(cls);setTimeout(()=>e?.classList?.remove(cls),dur)
}
function qFloat(id,text,kind='damage'){const arena=$('#q2dArena'),p=qPoint(id);if(!arena||!p)return;const e=document.createElement('div');e.className='cb2d-number '+kind;e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),850)}
function qSetEnemyHp(i,value){
  if(!questFight)return;const max=questFight.enemyMax[i]||1,prev=questFight.enemyHp[i]||0,next=Math.max(0,Math.min(max,Math.round(value)));questFight.enemyHp[i]=next;
  const u=qUnit('e-'+i),bar=u?.querySelector('.cb2d-unit-hp i');if(bar)bar.style.width=(next/max*100)+'%';
  if(u){if(next<=0)u.classList.add('dead');else u.classList.remove('dead')}qRefreshTargetControls()
}
function qSetPartyHp(c,value){if(!questFight)return;const next=Math.max(0,Math.min(100,Math.round(value)));questFight.partyHp[c.id]=next;const bar=$('[data-q-side-hp="'+c.id+'"]');if(bar)bar.style.width=next+'%';const txt=$('[data-q-hp-text="'+c.id+'"]');if(txt)txt.textContent=next+' HP';const overhead=qUnit('p-'+c.id)?.querySelector('.cb2d-unit-hp i');if(overhead)overhead.style.width=next+'%'}
function qRenderMeters(target=0){
  if(!questFight)return;
  const damageRoot=$('#q2dDamageMeter'),healingRoot=$('#q2dHealingMeter'),threatRoot=$('#q2dThreatMeter'),p=qCombatants(),elapsed=Math.max(1,(Number(questFight.elapsedMs)||0)/1000);
  const rows=p.map(c=>({c,value:Number(questFight.damage?.[c.id])||0})).sort((a,b)=>b.value-a.value),max=Math.max(1,...rows.map(x=>x.value)),total=rows.reduce((n,x)=>n+x.value,0);
  const totalEl=$('#q2dDamageTotal');if(totalEl)totalEl.textContent=total.toLocaleString()+' total';
  if(damageRoot)damageRoot.innerHTML=rows.map((x,i)=>'<div class="cb2d-meter-row '+qClassKey(x.c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(x.c.name)+'</b><span>'+x.value.toLocaleString()+' · '+Math.round(x.value/elapsed)+' DPS</span></div><em><i style="width:'+(x.value/max*100)+'%"></i></em></div>').join('');
  const heals=p.map(c=>({c,value:Number(questFight.healing?.[c.id])||0,over:Number(questFight.overhealing?.[c.id])||0})).sort((a,b)=>b.value-a.value),maxHeal=Math.max(1,...heals.map(x=>x.value)),healTotal=heals.reduce((n,x)=>n+x.value,0),healTotalEl=$('#q2dHealingTotal');if(healTotalEl)healTotalEl.textContent=healTotal.toLocaleString()+' total';
  if(healingRoot)healingRoot.innerHTML=heals.map((x,i)=>'<div class="cb2d-meter-row '+qClassKey(x.c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(x.c.name)+'</b><span>'+x.value.toLocaleString()+' · '+Math.round(x.value/elapsed)+' HPS</span></div><em><i style="width:'+(x.value/maxHeal*100)+'%"></i></em></div>').join('');
  const table=questFight.threat?.[target]||{},threatRows=p.map(c=>({c,value:Number(table[c.id])||0})).sort((a,b)=>b.value-a.value),maxThreat=Math.max(1,...threatRows.map(x=>x.value)),aggro=questFight.aggro?.[target]||null;
  const label=$('#q2dThreatTarget');if(label)label.textContent=questFight.enemies[target]||'No target';
  if(threatRoot)threatRoot.innerHTML=threatRows.map((x,i)=>{const pct=x.value/maxThreat*100,hasAggro=aggro===x.c.id,tank=p.find(y=>qRole(y)==='tank'),tankThreat=tank?Number(table[tank.id])||0:0,high=!hasAggro&&qRole(x.c)!=='tank'&&tankThreat>0&&x.value>=tankThreat*.85;return '<div class="cb2d-meter-row '+qClassKey(x.c)+(hasAggro?' aggro':'')+(high?' high':'')+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(x.c.name)+(hasAggro?' <strong>AGGRO</strong>':high?' <strong>HIGH</strong>':'')+'</b><span>'+Math.round(x.value).toLocaleString()+' · '+Math.round(pct)+'%</span></div><em><i style="width:'+pct+'%"></i></em></div>'}).join('')
}
function qRefreshTargetControls(){
  if(!questFight)return;
  $$('[data-q-target]').forEach(b=>{
    const i=Number(b.dataset.qTarget),max=Math.max(1,Number(questFight.enemyMax?.[i])||1),hp=Math.max(0,Number(questFight.enemyHp?.[i])||0),alive=hp>0;
    b.classList.toggle('active',alive&&i===Number(questFight.focusTarget));
    b.classList.toggle('defeated',!alive);b.disabled=!alive;
    const fill=b.querySelector('em i');if(fill)fill.style.width=(hp/max*100)+'%';
    const pct=b.querySelector('small');if(pct)pct.textContent=alive?Math.round(hp/max*100)+'%':'DOWN';
  })
}
function qSelectTarget(index){
  if(!questFight)return;
  const i=Math.max(0,Math.min(questFight.enemies.length-1,Number(index)||0));
  if((Number(questFight.enemyHp?.[i])||0)<=0)return;
  questFight.focusTarget=i;qRefreshTargetControls();qRenderMeters(i);
  qStatus('Focus target: '+questFight.enemies[i]);
  qLog('Target switched to '+questFight.enemies[i]+'.')
}
function qTargetControlsMarkup(){
  if(!questFight)return'';
  return '<div class="cb2d-controls quest-live-targets"><div class="quest-live-target-copy"><small>LIVE TARGET PRIORITY</small><b>Call the party target during combat.</b><span>Bring all three Hounds low, then finish them inside the Licked Wounds window.</span></div><div class="quest-live-target-grid">'+questFight.enemies.map((name,i)=>'<button type="button" data-q-target="'+i+'" class="'+(i===Number(questFight.focusTarget)?'active':'')+'"><span>'+esc(name)+'</span><small>100%</small><em><i style="width:100%"></i></em></button>').join('')+'</div></div>'
}

function qShowContinuation(end,{won,title,text,analysis=''}){
 if(!end)return;
 end.hidden=false;end.classList.add('quest-continuation-modal');
 end.innerHTML='<div class="quest-continuation-card"><div class="quest-continuation-mark">'+(won?'✓':'×')+'</div><small>'+(won?'QUEST FIGHT COMPLETE':'QUEST FIGHT FAILED')+'</small><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p>'+analysis+'<button class="quest-continuation-primary" data-q-continue>'+(won?'CONTINUE QUEST →':'RETURN TO QUEST →')+'</button></div>';
 requestAnimationFrame(()=>end.classList.add('show'));
 end.querySelector('[data-q-continue]')?.focus({preventScroll:true});
}
function qDraw(config,finish){
  const root=encounterRoot();root.className='cb2d-backdrop quest-cb2d-backdrop';root.hidden=false;document.body.classList.add('quest-cb2d-open');
  const visualClass=String(config.visualClass||'').replace(/[^a-z0-9-_ ]/gi,'').trim(),environmentMarkup=String(config.environmentMarkup||''),solo=config.allowSolo===true,questLabel=String(config.quest||config.title||'Quest').toUpperCase();
  const liveKind=config.presentationKind==='dungeon'?'LIVE 2D DUNGEON':'LIVE 2D QUEST',partyLabel=config.partyLabel||(solo?'SOLO ADVENTURER':'ACTIVE FIVE'),controlMarkup=config.allowTargetSwitch?qTargetControlsMarkup():'<div class="cb2d-controls cbr-plan-lock"><div class="cbr-plan-lock-copy"><small>QUEST FIGHT</small><b>'+(solo?'Your adventurer is committed.':'Your party is committed.')+'</b><span>'+(solo?'Watch the solo trial play out and see how this adventurer handles the encounter.':'Watch the fight play out and see how the party handles the encounter.')+'</span></div></div>';
  root.innerHTML='<section class="cb2d-shell quest-cb2d-shell '+esc(visualClass)+'"><header class="cb2d-head"><div><small>'+esc(questLabel)+' · LV '+Math.max(1,Number(config.combat?.level)||1)+' · '+liveKind+'</small><h2>'+esc(config.title)+'</h2></div><div class="cb2d-live"><i></i>LIVE <button data-q-speed>1×</button><button data-q-close>×</button></div></header>'+
    '<div class="cb2d-route" id="q2dRoute">'+qRoute()+'</div><div class="cb2d-layout"><main><div class="cb2d-arena quest-cb2d-arena" id="q2dArena"><div class="cb2d-floor"></div><div class="quest-cb2d-environment">'+environmentMarkup+'</div><div class="cb2d-room-tag"><b>'+esc(config.location)+'</b><small>'+esc(config.ambience)+'</small></div><div class="cb2d-ground-legend"><span class="danger">RED · MOVE / AVOID</span><span class="spawn">AMBER · SPAWN / PRIORITY</span><span class="aggro">GOLD LINK · AGGRO</span></div><div id="q2dTelegraphs"></div><div id="q2dUnits"></div><div class="cb2d-caption"><span>QUEST FIGHT</span><b id="q2dStatus">Entering encounter…</b></div></div>'+
    controlMarkup+
    '<div class="cb2d-feed"><small>COMBAT FEED</small><p id="q2dFeed"></p></div></main><aside><div class="cb2d-cast"><small>ENEMY CAST</small><div><b id="q2dCastName">—</b><strong id="q2dCastTime">—</strong></div><div class="cb2d-castbar"><i id="q2dCastFill"></i></div></div><div class="cb2d-combat-meters"><section class="cb2d-meter-panel damage"><div class="cb2d-meter-head"><small>DAMAGE METER</small><span id="q2dDamageTotal">0 total</span></div><div id="q2dDamageMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel healing"><div class="cb2d-meter-head"><small>HEALING METER</small><span id="q2dHealingTotal">0 total</span></div><div id="q2dHealingMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel threat"><div class="cb2d-meter-head"><small>THREAT METER</small><span id="q2dThreatTarget">No target</span></div><div id="q2dThreatMeter" class="cb2d-meter-list"></div></section></div><div class="cb2d-actions"><small>PARTY ACTIONS</small><div data-q-act="tank"><i class="cb2d-dot tank"></i><b>Tank</b><em>Taking point</em></div><div data-q-act="healer"><i class="cb2d-dot healer"></i><b>Healer</b><em>Holding range</em></div><div data-q-act="dps"><i class="cb2d-dot dps"></i><b>Damage</b><em>Acquiring targets</em></div></div><div class="cb2d-party"><small>'+esc(partyLabel)+'</small>'+qRows()+'</div></aside></div><div class="cb2d-end" id="q2dEnd" hidden></div></section>';
  root.querySelector('[data-q-speed]').onclick=e=>{if(!questFight)return;questFight.speed=questFight.speed===2?1:2;e.currentTarget.textContent=questFight.speed+'×'};
  root.querySelectorAll('[data-q-target]').forEach(b=>b.onclick=()=>qSelectTarget(Number(b.dataset.qTarget)));qRefreshTargetControls();
  root.querySelector('[data-q-close]').onclick=()=>{if(!questFight?.finished&&!confirm('Leave this quest fight? It will restart.'))return;encounterToken++;window.CellboundCombatStatuses?.clear?.(root);root.hidden=true;document.body.classList.remove('quest-cb2d-open');finish(false)};
}
function qEnemyMeta(index){
 const level=Math.max(1,Number(questFight?.enemyLevels?.[index])||Number(questFight?.level)||1);
 const type=String(questFight?.enemyTypes?.[index]||((questFight?.enemies?.length===1)?'boss':(index===questFight?.eliteIndex?'elite':'trash'))).toLowerCase();
 const labels={trash:'TRASH',elite:'ELITE',boss:'BOSS','world-boss':'WORLD BOSS',add:'ADD'};
 return{level,type,label:labels[type]||type.toUpperCase()}
}
function qSpawn(){
  const p=qCombatants(),melee=p.filter(c=>qProfile(c)==='melee'),ranged=p.filter(c=>qProfile(c)==='ranged');
  p.forEach((c,i)=>{qAddUnit('p-'+c.id,c.name,'party '+qRole(c)+' profile-'+qProfile(c)+' '+qClassKey(c),4,50+(i-2)*4);let x=16,y=50;if(qRole(c)==='tank'){x=30;y=50}else if(qProfile(c)==='melee'){x=23;y=43+melee.indexOf(c)*14}else if(qProfile(c)==='ranged'){x=17;y=28+ranged.indexOf(c)*44}else{x=12;y=61}setTimeout(()=>qMove('p-'+c.id,x,y,800),40)});
  questFight.enemies.forEach((n,i)=>{const y=questFight.enemies.length===1?50:27+i*(46/Math.max(1,questFight.enemies.length-1)),m=qEnemyMeta(i),big=m.type==='elite'||m.type==='boss'||m.type==='world-boss',boss=m.type==='boss'||m.type==='world-boss';qAddUnit('e-'+i,n,boss?'enemy boss':big?'enemy big':'enemy',92,y,big?'big':'','Lv. '+m.level+' · '+m.label);setTimeout(()=>qMove('e-'+i,68,y,780),70)});
  p.forEach(c=>{qSetPartyHp(c,questFight.partyHp?.[c.id]??100);const r=questFight.resources?.[c.id],def=qResourceDef(c);qResourceVisual({type:'RESOURCE_STATE',source:'p-'+c.id,payload:{resource:r?.name||def.name,max:r?.max||def.max,value:r?.value??def.start}})});
  qRenderMeters(questFight.eliteIndex>=0?questFight.eliteIndex:0)
}
function qTelegraph(type,fromId,toId,label,size=145){
  const root=$('#q2dTelegraphs'),a=qPoint(fromId),b=qPoint(toId);if(!root||!a||!b)return null;
  const e=document.createElement('div');e.className='cb2d-tg '+type+' dynamic';
  const s=document.createElement('span');s.className='cb2d-tg-label';s.textContent=label;e.appendChild(s);
  if(type==='circle'){e.style.left=b.x+'px';e.style.top=b.y+'px';e.style.width=size+'px';e.style.height=size+'px';e.style.transform='translate(-50%,-50%)'}
  else{const angle=Math.atan2(b.y-a.y,b.x-a.x),length=Math.max(190,Math.min(a.w*.62,360));e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.width=length+'px';e.style.height=(type==='line'?44:140)+'px';e.style.transform='translateY(-50%) rotate('+(angle*180/Math.PI)+'deg)'}
  root.appendChild(e);requestAnimationFrame(()=>e.classList.add('show'));return e
}
function qEventCharacter(unitId){const id=String(unitId||'');return id.startsWith('p-')?qCombatants().find(c=>String(c.id)===id.slice(2)):null}
function qEventEnemyIndex(unitId){const m=String(unitId||'').match(/^e-(\d+)$/);return m?Number(m[1]):-1}
function qAttackKind(c){return c?.class==='Mage'?'magic':c?.class==='Hunter'?'arrow':['Priest','Druid','Evoker'].includes(c?.class)?'magic':'slash'}
function qSetAddHp(id,pct){
  const u=qUnit(id),bar=u?.querySelector('.cb2d-unit-hp i');if(bar)bar.style.width=Math.max(0,Math.min(100,pct))+'%';
  if(u)u.classList.toggle('dead',pct<=0)
}
function qResourceVisual(e){
  if(!e?.source||!String(e.source).startsWith('p-'))return;
  const id=String(e.source).slice(2),c=qCombatants().find(x=>String(x.id)===id),def=c?qResourceDef(c):{name:'Power',max:100,start:100},u=qUnit(e.source);
  const name=String(e.payload?.resource||def.name||'Power'),max=Math.max(1,Number(e.payload?.max??def.max)||100),value=Math.max(0,Math.min(max,Number(e.payload?.value??def.start)||0)),key=qResourceClass(name);
  if(questFight?.resources)questFight.resources[id]={name,max,value};
  if(u){
    let bar=u.querySelector('.cbr-resource');if(!bar){bar=document.createElement('small');bar.className='cbr-resource';bar.innerHTML='<i></i>';u.appendChild(bar)}
    if(bar.dataset.resource!==name){[...bar.classList].filter(x=>x.startsWith('resource-')).forEach(x=>bar.classList.remove(x));bar.classList.add(key);bar.dataset.resource=name;bar.title=name}
    const fill=bar.querySelector('i');if(fill)fill.style.width=(value/max*100)+'%'
  }
  const side=$('[data-q-side-resource="'+id+'"]');if(side){
    [...side.classList].filter(x=>x.startsWith('resource-')).forEach(x=>side.classList.remove(x));side.classList.add(key);side.dataset.resource=name;side.title=name;
    const fill=side.querySelector('i');if(fill)fill.style.width=(value/max*100)+'%'
  }
}
function qCastStart(e){
  const n=$('#q2dCastName'),t=$('#q2dCastTime'),f=$('#q2dCastFill'),duration=Math.max(0,Number(e.payload?.duration)||0),realDuration=Math.max(1,Math.round(duration/Math.max(.25,Number(questFight?.speed)||1)));
  if(n)n.textContent=e.ability||'Enemy Cast';if(t)t.textContent=(duration/1000).toFixed(1)+'s';
  if(f){f.style.background='';f.style.transition='none';f.style.width='0%';void f.offsetWidth;requestAnimationFrame(()=>{f.style.transition='width '+realDuration+'ms linear';f.style.width='100%'})}
}
function qCastClear(label='—'){
  const n=$('#q2dCastName'),t=$('#q2dCastTime'),f=$('#q2dCastFill');if(n)n.textContent=label;if(t)t.textContent='—';if(f){f.style.transition='none';f.style.width='0%';f.style.background=''}
}
function qMechanicFromEvent(e){
  const type=e.payload?.mechanicType,source=e.source||'e-0',target=e.payload?.targetId||e.target,token=e.payload?.token||('q-'+e.timestamp);let tg=null;
  const combatants=qCombatants();
  if(type==='cone')tg=qTelegraph('cone',source,target||'p-'+combatants[0]?.id,e.ability||'FRONTAL');
  else if(type==='line')tg=qTelegraph('line',source,target||'p-'+(combatants.find(c=>qRole(c)!=='tank')||combatants[0])?.id,e.ability||'LINE');
  else if(type==='circle')tg=qTelegraph('circle',source,target||source,e.ability||'AREA',165);
  else if(type==='circles'){
    const ids=(e.payload?.targetIds||[]).filter(Boolean);const list=ids.length?ids:combatants.map(c=>'p-'+c.id),wrap=[];
    list.forEach((id,i)=>{const x=qTelegraph('circle',source,id,i===0?(e.ability||'TARGETED AREA'):'',120);if(x)wrap.push(x)});
    tg={classList:{add:k=>wrap.forEach(x=>x.classList.add(k))},remove:()=>wrap.forEach(x=>x.remove())}
  }else if(type==='interrupt'){
    tg=qTelegraph('circle',source,source,'INTERRUPT '+String(e.ability||'CAST').toUpperCase(),90)
  }else if(type==='adds'){
    const root=$('#q2dTelegraphs'),el=document.createElement('div');el.className='cb2d-tg circle dynamic';el.innerHTML='<span class="cb2d-tg-label">ADDS SPAWNING</span>';el.style.left='74%';el.style.top='50%';el.style.width='140px';el.style.height='140px';el.style.transform='translate(-50%,-50%)';root?.appendChild(el);tg=el
  }
  questFight.telegraphs[token]=tg;return tg
}
function qClearMechanic(token,impact=false){
  const tg=questFight?.telegraphs?.[token];if(!tg)return;if(impact)tg.classList?.add?.('impact');setTimeout(()=>tg.remove?.(),250);delete questFight.telegraphs[token]
}
function qSpawnAdd(e){
  if(qUnit(e.target))return;const p=e.position||{x:74,y:50};qAddUnit(e.target,e.payload?.name||'Add','enemy',p.x,p.y,'','Lv. '+(e.payload?.level||questFight?.level||1)+' · '+(e.payload?.classificationLabel||'ADD'));qSetAddHp(e.target,100)
}
function qAnalysis(result){
  const s=result?.summary||{},ints=s.interrupts||{},m=s.mechanics||{};
  return'<div class="cbr-analysis-grid quest-cbr-summary"><article><span>TIME</span><b>'+Math.round((Number(s.durationSeconds)||0)*10)/10+'s</b></article><article><span>DAMAGE</span><b>'+Math.round(Number(s.totalDamage)||0).toLocaleString()+'</b></article><article><span>HEALING</span><b>'+Math.round(Number(s.totalHealing)||0).toLocaleString()+'</b></article><article><span>DEATHS</span><b>'+Number(s.deaths||0)+'</b></article><article><span>MISTAKES</span><b>'+Number(s.mistakes?.total||0)+'</b></article><article><span>BATTLE REZ</span><b>'+Number(s.battleResurrections||0)+'</b></article><article><span>INTERRUPTS</span><b>'+Number(ints.success||0)+'/'+Number(ints.attempts||0)+'</b></article><article><span>MECHANICS</span><b>'+Number(m.avoided||0)+'✓ · '+Number(m.failed||0)+'✕</b></article></div>'
}
function qStatusTargets(id){
  const out=[],unit=qUnit(id);if(unit)out.push(unit);
  if(String(id||'').startsWith('p-')){
    const c=qEventCharacter(id),row=c?$('[data-q-row="'+c.id+'"]'):null,mirror=row?.querySelector('span');
    if(mirror)out.push({el:mirror,mirror:true})
  }
  return out
}
function qRenderRebornEvent(e){
  if(!questFight||!e)return;const eventTime=(Number(questFight.eventOffset)||0)+(Number(e.timestamp)||0);questFight.elapsedMs=Math.max(Number(questFight.elapsedMs)||0,eventTime);
  window.CellboundCombatFX?.combatEvent?.(e,{arena:document.querySelector('.quest-cb2d-arena'),resolve:qUnit,speed:()=>questFight?.speed||1});
  if(window.CellboundCombatStatuses?.handle(e,{resolve:qStatusTargets,speed:()=>questFight?.speed||1}))return;
  const srcChar=qEventCharacter(e.source),targetChar=qEventCharacter(e.target),enemyIndex=qEventEnemyIndex(e.target),sourceEnemy=qEventEnemyIndex(e.source);
  switch(e.type){
    case'COMBAT_START':{const arena=document.querySelector('.quest-cb2d-arena');window.CellboundCombatFX?.mount?.(arena);if(String(questFight?.presentationKind||'')==='dungeon')window.CellboundCombatFX?.boss?.(arena,questFight?.title||'Boss');qStatus('Combat simulation live');qLog('Combat begins.');break;}
    case'MOVEMENT_START':if(window.CellboundCombatFX?.ownsMovement)break;if(e.payload?.to)qMove(e.source,e.payload.to.x,e.payload.to.y,e.payload.duration||420);break;
    case'ABILITY_START':
      if(e.source&&e.target){
        qPulseUnit(e.source,'attacking',420);qPulseUnit(e.target,'targeted',360);
        if(srcChar){qFace(e.source,e.target);qProjectile(e.source,e.target,qAttackKind(srcChar),260);const r=qRole(srcChar);qAct(r==='tank'?'tank':r==='healer'?'healer':'dps',srcChar.name+' · '+(e.ability||'Action'))}
        else if(String(e.source).startsWith('e-')||String(e.source).startsWith('add-')){qFace(e.source,e.target);qProjectile(e.source,e.target,'enemy',280)}
      }
      break;
    case'DAMAGE_DEALT':
      if(enemyIndex>=0){qSetEnemyHp(enemyIndex,Number(e.payload?.targetHp)||0)}
      else if(String(e.target||'').startsWith('add-'))qSetAddHp(e.target,Number(e.payload?.targetHpPct)||0);
      if(targetChar){qSetPartyHp(targetChar,Number(e.payload?.targetHpPct)||0)}
      if(e.target){qFloat(e.target,'-'+Math.round(Number(e.amount)||0),targetChar?'incoming':e.result==='critical'?'crit':'damage');qPulseUnit(e.target,'hit',300);window.CellboundCombatFX?.impact?.(qUnit(e.target),{critical:e.result==='critical'})}
      if(srcChar){questFight.damage[srcChar.id]=(Number(questFight.damage[srcChar.id])||0)+Math.round(Number(e.amount)||0);qRenderMeters(enemyIndex>=0?enemyIndex:0)}
      if(e.payload?.avoidable)qLog((targetChar?.name||'A player')+' is hit by avoidable '+(e.ability||'damage')+'.');
      break;
    case'HEAL_RECEIVED':
      if(targetChar){qSetPartyHp(targetChar,Number(e.payload?.targetHpPct)||0);qFloat(e.target,'+'+Math.round(Number(e.amount)||0),'heal');qPulseUnit(e.target,'healed',340);window.CellboundCombatFX?.heal?.(qUnit(e.target))}
      if(srcChar){questFight.healing[srcChar.id]=(Number(questFight.healing?.[srcChar.id])||0)+Math.max(0,Math.round(Number(e.amount)||0));questFight.overhealing[srcChar.id]=(Number(questFight.overhealing?.[srcChar.id])||0)+Math.max(0,Math.round(Number(e.payload?.overhealing)||0));qRenderMeters(enemyIndex>=0?enemyIndex:0)}
      break;
    case'UNIQUE_EFFECT_TRIGGER':if(srcChar){qLog(srcChar.name+' triggers '+(e.ability||'a unique item effect')+'.');qFloat(e.source,e.ability||'UNIQUE','heal')}break;
    case'PLAYER_MISTAKE':if(srcChar)qLog(srcChar.name+' '+(e.payload?.detail||'makes an execution mistake')+'.');break;
    case'PLAYER_REVIVED':
      if(targetChar){qSetPartyHp(targetChar,Number(e.payload?.targetHpPct)||35);const u=qUnit(e.target);if(u)u.classList.remove('dead');qFloat(e.target,'BATTLE REZ','heal');qLog(targetChar.name+' is brought back by '+(srcChar?.name||'the healer')+'.');qResourceVisual({source:e.target,payload:{resource:e.payload?.resource,value:e.payload?.resourceValue,max:e.payload?.resourceMax}})}
      break;
    case'RESOURCE_STATE':case'RESOURCE_SPENT':case'RESOURCE_GAINED':qResourceVisual(e);break;
    case'THREAT_GENERATED':
      if(enemyIndex>=0&&srcChar){questFight.threat[enemyIndex]=questFight.threat[enemyIndex]||{};questFight.threat[enemyIndex][srcChar.id]=Number(e.payload?.total)||0;qRenderMeters(enemyIndex)}
      break;
    case'AGGRO_CHANGED':
      if(sourceEnemy>=0&&targetChar){questFight.aggro[sourceEnemy]=targetChar.id;qRenderMeters(sourceEnemy);if(qRole(targetChar)!=='tank')qLog(targetChar.name+' pulls aggro.')}break;
    case'MECHANIC_TELEGRAPH':window.CellboundCombatFX?.mechanic?.(document.querySelector('.quest-cb2d-arena'),'warning');qMechanicFromEvent(e);qStatus((e.ability||'Mechanic')+' incoming');qLog((e.ability||'Mechanic')+' is telegraphed.');break;
    case'MECHANIC_RESOLVE':qClearMechanic(e.payload?.token,true);break;
    case'CAST_START':if(String(e.source||'').startsWith('e-'))qCastStart(e);break;
    case'CAST_FINISH':if(String(e.source||'').startsWith('e-')){qCastClear('CAST COMPLETE');qLog((e.ability||'Enemy cast')+' completes.')}break;
    case'INTERRUPT':
      if(e.result==='success'){qCastClear('INTERRUPTED');qClearMechanic(e.payload?.token,false);window.CellboundCombatFX?.interrupt?.(qUnit(e.target)||document.querySelector('.quest-cb2d-arena'));qLog((srcChar?.name||'A player')+' interrupts '+(e.payload?.interruptedAbility||'the cast')+'.');qAct('dps','Interrupt successful')}
      else if(e.result==='failed')qLog((srcChar?.name||'A player')+' misses an interrupt.');
      break;
    case'ADD_SPAWNED':qSpawnAdd(e);window.CellboundCombatFX?.spawn?.(qUnit(e.target)||document.querySelector('.quest-cb2d-arena'));qLog((e.payload?.name||'An add')+' joins the fight.');break;
    case'ADD_DEFEATED':case'ENEMY_DEFEATED':{
      const u=qUnit(e.target);if(u){u.classList.add('dead');window.CellboundCombatFX?.death?.(u,{boss:e.type==='ENEMY_DEFEATED'&&String(questFight?.presentationKind||'')==='dungeon'&&enemyIndex===Math.max(0,Number(questFight?.eliteIndex)||0)});}if(enemyIndex>=0)qSetEnemyHp(enemyIndex,0);else qSetAddHp(e.target,0);break;
    }
    case'PLAYER_DEFEATED':if(targetChar){window.CellboundCombatFX?.death?.(qUnit(e.target));qPulseUnit(e.target,'dying',360);qSetPartyHp(targetChar,0);setTimeout(()=>qUnit(e.target)?.classList.add('dead'),Math.max(120,Math.round(300/Math.max(.25,Number(questFight?.speed)||1))));qLog(targetChar.name+' is defeated.')}break;
    case'PHASE_CHANGE':window.CellboundCombatFX?.phase?.(document.querySelector('.quest-cb2d-arena'));window.CellboundFX?.phase?.(e.ability||'Boss phase',e.payload?.healthPct);qStatus(e.ability||'PHASE CHANGE');qLog((e.ability||'A new phase')+' begins.');break;
    case'ENRAGE':if(e.result==='hard')window.CellboundFX?.shake?.('hard');else window.CellboundFX?.flash?.('danger');qStatus(e.result==='hard'?'HARD ENRAGE':(e.ability||'ENRAGE'));qLog((e.ability||'The enemy enrages')+'.');break;
    case'DEFENSIVE_ACTIVATED':if(srcChar)qLog(srcChar.name+' activates '+(e.ability||'a defensive')+'.');break;
    case'COMBAT_END':qCastClear();qStatus(e.result==='victory'?'ENCOUNTER CLEAR':'PARTY DEFEATED');if(e.result==='victory')window.CellboundCombatFX?.victory?.(document.querySelector('.quest-cb2d-arena'));else window.CellboundFX?.wipe?.('The quest encounter has overwhelmed the party.');break;
  }
}
async function qPlayReborn(result,tok){
  const events=(result?.events||[]).slice().sort((a,b)=>(Number(a.timestamp)||0)-(Number(b.timestamp)||0));
  if(!questFight)return false;questFight.telegraphs={};
  if(!events.length)return result?.outcome==='victory';
  return await new Promise(resolve=>{
    let index=0,simTime=0,wallAnchor=Number(questFight?.wallClockStartAt)||Date.now(),simAnchor=0,lastSpeed=null,finished=false,raf=0;
    const finish=value=>{if(finished)return;finished=true;if(raf)cancelAnimationFrame(raf);resolve(value)};
    const frame=()=>{
      if(finished)return;
      if(tok!==encounterToken||!questFight){finish(false);return}
      const speed=Math.max(.25,Number(questFight?.speed)||1);
      if(lastSpeed===null)lastSpeed=speed;
      else if(lastSpeed!==speed){simAnchor=simTime;wallAnchor=Date.now();lastSpeed=speed}
      simTime=Math.max(simTime,simAnchor+Math.max(0,Date.now()-wallAnchor)*speed);
      questFight.elapsedMs=Math.max(Number(questFight.elapsedMs)||0,simTime);
      const frameStarted=performance.now();let handled=0;
      while(index<events.length&&(Number(events[index].timestamp)||0)<=simTime+4&&handled<36&&performance.now()-frameStarted<9){
        const event=events[index++];handled++;
        try{qRenderRebornEvent(event)}
        catch(error){console.warn('Quest combat visual recovered',event?.type,event?.ability,error)}
      }
      if(index>=events.length){finish(result?.outcome==='victory');return}
      raf=requestAnimationFrame(frame)
    };
    raf=requestAnimationFrame(frame)
  })
}
function qEncounterFromConfig(config){
  const meta=config.combat||{},kind=meta.kind||(config.enemies.length===1?'boss':'trash');
  return{id:'quest-'+String(config.title||'fight').toLowerCase().replace(/[^a-z0-9]+/g,'-'),title:config.title,kind,level:Math.max(1,Number(meta.level)||1),recommendedItemLevel:Math.max(0,Number(meta.recommendedItemLevel)||0),enemyLevels:meta.enemyLevels||null,enemyTypes:meta.enemyTypes||null,enemies:[...config.enemies],enemyHealth:Number(meta.enemyHealth)|| (kind==='final'?900:kind==='boss'?700:330),mechanics:meta.mechanics||[],mechanicIntervalMs:Math.max(0,Number(meta.mechanicIntervalMs)||0),phases:meta.phases||[],environment:meta.environment||{},scaling:meta.scaling||{},resolveAtBossHealthPct:Math.max(0,Math.min(.95,Number(meta.resolveAtBossHealthPct)||0)),resolveLabel:meta.resolveLabel||null}
}
async function runQuest2DFight(config){
  const p=Array.isArray(config?.participants)&&config.participants.length?config.participants:party(),C=window.CellboundCombatStandard;if((!config?.allowSolo&&p.length!==5)||(config?.allowSolo&&p.length!==1)||!C?.simulate)return false;
  const tok=++encounterToken;
  return await new Promise(resolve=>{
    let settled=false;const finish=value=>{if(settled)return;settled=true;resolve(value)};
    const encounter=qEncounterFromConfig(config),entries=config.enemies||[],names=entries.map(x=>typeof x==='object'&&x?x.name||'Unknown Enemy':x),max=entries.map(x=>typeof x==='object'&&x&&Number(x.maxHealth||x.health)>0?Number(x.maxHealth||x.health):encounter.enemyHealth),carried=config.combatState&&typeof config.combatState==='object'?config.combatState:{};
    questFight={token:tok,title:config.title,presentationKind:config.presentationKind||'quest',participants:[...p],phases:Array.isArray(config.phases)&&config.phases.length?config.phases:['Combat'],phase:Math.max(0,Number(config.phaseIndex)||0),speed:1,elapsedMs:0,wallClockStartAt:Number(config.wallClockStartAt)||Date.now(),enemies:names,level:encounter.level,enemyLevels:encounter.enemyLevels,enemyTypes:encounter.enemyTypes,eliteIndex:Number.isInteger(config.eliteIndex)?config.eliteIndex:-1,enemyMax:max,enemyHp:[...max],partyHp:Object.fromEntries(p.map(c=>[c.id,carried[c.id]?.healthPct==null?100:Number(carried[c.id].healthPct)])),resources:Object.fromEntries(p.map(c=>{const def=qResourceDef(c),r=carried[c.id]?.resource||def;return[c.id,{name:r.name||def.name,max:Number(r.max)||Number(def.max)||100,value:r.value==null?(Number(def.start)||0):Number(r.value)}]})),damage:Object.fromEntries(p.map(c=>[c.id,0])),healing:Object.fromEntries(p.map(c=>[c.id,0])),overhealing:Object.fromEntries(p.map(c=>[c.id,0])),threat:max.map(()=>Object.fromEntries(p.map(c=>[c.id,0]))),aggro:max.map(()=>null),log:[],telegraphs:{},finished:false};
    qDraw(config,finish);qSpawn();qLog(config.ambience);
    if(encounter.kind==='boss'||encounter.kind==='final')window.CellboundFX?.boss?.(config.title,config.location||'');
    (async()=>{
      try{
        await wait(600);if(tok!==encounterToken)return;
        const result=C.simulate({
          party:p.map(c=>{const x=carried[c.id]||{};return Object.assign({},c,{
            _combatHealthPct:x.healthPct==null?100:Number(x.healthPct),
            _combatResource:x.resource||null,
            _combatCooldowns:x.cooldowns||{},
            _combatStatuses:Array.isArray(x.statuses)?x.statuses:[],
            _reviveSicknessMs:Number(x.reviveSicknessMs)||0,
            _combatUniqueUsed:x.uniqueUsed||{}
          })}),
          encounter,
          tactics:{interruptPriority:'standard',addPriority:'immediate',defensiveUsage:'standard',pullStyle:'normal',movementDiscipline:'balanced'},
          seed:config.seed||['quest',tok,config.title,Date.now()].join(':')
        },{zone:'quest-encounters'});
        questFight.result=result;
        if(Array.isArray(result?.finalState?.enemies)){const main=result.finalState.enemies.filter(e=>!e.isAdd);questFight.enemyMax=main.map(e=>e.maxHealth);questFight.enemyHp=[...questFight.enemyMax]}
        const won=await qPlayReborn(result,tok);if(tok!==encounterToken)return;
        if(typeof config.onResult==='function')await config.onResult(result);
        questFight.finished=true;
        const end=$('#q2dEnd');if(!end)return;
        if(won){
          qLog('The party secures the area.');
          if(config.autoContinueOnVictory){
            const delay=Math.max(250,Number(config.autoContinueDelayMs)||650);
            await wait(delay);if(tok!==encounterToken||settled)return;
            window.CellboundCombatStatuses?.clear?.(encounterRoot());encounterRoot().hidden=true;document.body.classList.remove('quest-cb2d-open');finish(true);return
          }
          qShowContinuation(end,{won:true,title:config.title,text:config.completeText||'The way forward is clear.',analysis:qAnalysis(result)});
          end.querySelector('[data-q-continue]').onclick=()=>{window.CellboundCombatStatuses?.clear?.(encounterRoot());encounterRoot().hidden=true;document.body.classList.remove('quest-cb2d-open');finish(true)}
        }else{
          Game.applyPartyCellShock?.(25);await Game.persistState?.();
          qShowContinuation(end,{won:false,title:config.title,text:'The party was defeated. Recover, review the result and return when ready.',analysis:qAnalysis(result)});
          end.querySelector('[data-q-continue]').onclick=()=>{window.CellboundCombatStatuses?.clear?.(encounterRoot());encounterRoot().hidden=true;document.body.classList.remove('quest-cb2d-open');finish(false)}
        }
      }catch(err){console.error('Quest Combat Reborn failed',err);encounterRoot().hidden=true;document.body.classList.remove('quest-cb2d-open');finish(false)}
    })();
  });
}
async function runInteractiveQuest2DFight(config){
  const p=party(),C=window.CellboundCombatStandard;if(p.length!==5||!C?.simulate)return false;
  const tok=++encounterToken,sliceMs=Math.max(1400,Number(config.sliceMs)||2400),reviveMs=Math.max(3000,Number(config.reviveWindowMs)||12000),revivePct=Math.max(1,Math.min(100,Number(config.revivePct)||35));
  return await new Promise(resolve=>{
    let settled=false,step=0,elapsed=0,lastResult=null;
    const finish=value=>{if(settled)return;settled=true;resolve(value)};
    const encounter=qEncounterFromConfig(config),entries=config.enemies||[],names=entries.map(x=>typeof x==='object'&&x?x.name||'Unknown Enemy':x);
    const initialMax=entries.map(x=>typeof x==='object'&&x&&Number(x.maxHealth||x.health)>0?Number(x.maxHealth||x.health):encounter.enemyHealth);
    const carry={},enemyPositions=[],downAt={},deathAt={};
    questFight={token:tok,title:config.title,presentationKind:config.presentationKind||'quest',phases:Array.isArray(config.phases)&&config.phases.length?config.phases:['Combat'],phase:0,speed:1,elapsedMs:0,eventOffset:0,enemies:names,level:encounter.level,enemyLevels:encounter.enemyLevels,enemyTypes:encounter.enemyTypes,eliteIndex:Number.isInteger(config.eliteIndex)?config.eliteIndex:-1,enemyMax:[...initialMax],enemyHp:[...initialMax],partyHp:Object.fromEntries(p.map(c=>[c.id,100])),resources:Object.fromEntries(p.map(c=>{const d=qResourceDef(c);return[c.id,{name:d.name,max:d.max,value:d.start}]})),damage:Object.fromEntries(p.map(c=>[c.id,0])),healing:Object.fromEntries(p.map(c=>[c.id,0])),overhealing:Object.fromEntries(p.map(c=>[c.id,0])),threat:initialMax.map(()=>Object.fromEntries(p.map(c=>[c.id,0]))),aggro:initialMax.map(()=>null),log:[],telegraphs:{},finished:false,focusTarget:Math.max(0,Number(config.initialTarget)||0)};
    qDraw({...config,allowTargetSwitch:true},finish);qSpawn();qLog(config.ambience);qStatus('Choose a Hound and call the target.');
    window.CellboundFX?.boss?.(config.title,config.location||'');

    const statusCarry=fp=>Object.values(fp?.statuses||{}).map(st=>({...st,remainingMs:Math.max(0,(Number(st.expiresAt)||0)-Number(lastResult?.durationMs||0))})).filter(st=>st.remainingMs>0);
    const reviveEnemy=i=>{
      const hp=Math.max(1,Math.round((questFight.enemyMax[i]||1)*revivePct/100));questFight.enemyHp[i]=hp;delete downAt[i];delete deathAt[i];
      const u=qUnit('e-'+i);u?.classList.remove('dead');qSetEnemyHp(i,hp);qFloat('e-'+i,'LICKED WOUNDS','heal');qPulseUnit('e-'+i,'healed',500);
      qLog(questFight.enemies[i]+' uses Licked Wounds and returns at '+revivePct+'%.');qStatus('LICKED WOUNDS · '+questFight.enemies[i]+' REVIVED');
      window.CellboundCombatFX?.heal?.(u||document.querySelector('.quest-cb2d-arena'));qRefreshTargetControls()
    };
    const ensureFocus=()=>{
      const current=Number(questFight.focusTarget)||0;if((Number(questFight.enemyHp[current])||0)>0)return current;
      const next=questFight.enemyHp.findIndex(x=>Number(x)>0);if(next>=0)qSelectTarget(next);return Math.max(0,next)
    };
    const showEnd=async won=>{
      if(tok!==encounterToken||settled)return;
      questFight.finished=true;qCastClear();
      const end=$('#q2dEnd');if(!end){finish(won);return}
      if(won){
        qStatus('ENCOUNTER CLEAR');window.CellboundCombatFX?.victory?.(document.querySelector('.quest-cb2d-arena'));qLog('The pack bond breaks. All three Hounds stay down.');
        if(config.autoContinueOnVictory){
          const delay=Math.max(250,Number(config.autoContinueDelayMs)||850);
          await wait(delay);if(tok!==encounterToken||settled)return;
          window.CellboundCombatStatuses?.clear?.(encounterRoot());encounterRoot().hidden=true;document.body.classList.remove('quest-cb2d-open');finish(true);return
        }
        end.hidden=false;
        const totalDamage=Object.values(questFight.damage).reduce((n,x)=>n+Number(x||0),0),totalHealing=Object.values(questFight.healing).reduce((n,x)=>n+Number(x||0),0);
        end.innerHTML='<div><small>QUEST FIGHT COMPLETE</small><h3>'+esc(config.title)+'</h3><p>'+esc(config.completeText||'The way forward is clear.')+'</p><div class="cbr-analysis-grid quest-cbr-summary"><article><span>TIME</span><b>'+Math.round(elapsed/1000)+'s</b></article><article><span>DAMAGE</span><b>'+Math.round(totalDamage).toLocaleString()+'</b></article><article><span>HEALING</span><b>'+Math.round(totalHealing).toLocaleString()+'</b></article><article><span>REVIVE RULE</span><b>BEATEN</b></article></div></div><button data-q-continue>CONTINUE QUEST →</button>';
      }else{
        end.hidden=false;
        qStatus('PARTY DEFEATED');window.CellboundFX?.wipe?.('The Three Hounds overwhelm the party.');Game.applyPartyCellShock?.(25);await Game.persistState?.();
        end.innerHTML='<div><small>QUEST FIGHT FAILED</small><h3>'+esc(config.title)+'</h3><p>Recover, then try again. Balance the pack before committing to the first kill.</p></div><button data-q-continue>RETURN TO QUEST →</button>';
      }
      end.querySelector('[data-q-continue]').onclick=()=>{window.CellboundCombatStatuses?.clear?.(encounterRoot());encounterRoot().hidden=true;document.body.classList.remove('quest-cb2d-open');finish(won)}
    };

    (async()=>{
      try{
        qRenderRebornEvent({timestamp:0,type:'COMBAT_START',result:'started'});await wait(450);
        while(tok===encounterToken&&!settled){
          const aliveNow=questFight.enemyHp.map((hp,i)=>Number(hp)>0?i:-1).filter(i=>i>=0);
          if(!aliveNow.length){
            const times=Object.values(deathAt).map(Number).filter(Number.isFinite);
            if(times.length===names.length&&Math.max(...times)-Math.min(...times)<=reviveMs){await showEnd(true);return}
            const oldest=Object.keys(deathAt).map(Number).sort((a,b)=>(deathAt[a]||0)-(deathAt[b]||0))[0];if(Number.isInteger(oldest)){reviveEnemy(oldest);continue}
            await showEnd(true);return
          }
          Object.keys(downAt).map(Number).forEach(i=>{if((Number(questFight.enemyHp[i])||0)<=0&&elapsed-(downAt[i]||0)>=reviveMs&&questFight.enemyHp.some((hp,j)=>j!==i&&Number(hp)>0))reviveEnemy(i)});
          const focus=ensureFocus(),enemyInput=entries.map((entry,i)=>({
            ...(typeof entry==='object'&&entry?entry:{name:entry}),name:names[i],absoluteHealth:true,maxHealth:questFight.enemyMax[i],currentHealth:questFight.enemyHp[i],priority:i===focus?100:1,focusSelected:i===focus,currentPosition:enemyPositions[i]||null
          }));
          const partyInput=p.map(c=>{const x=carry[c.id]||{};return Object.assign({},c,{
            _combatHealthPct:x.healthPct==null?questFight.partyHp[c.id]:x.healthPct,_combatResource:x.resource||questFight.resources[c.id],_combatCooldowns:x.cooldowns||{},
            _combatStatuses:Array.isArray(x.statuses)?x.statuses:[],_combatDefensiveMs:Number(x.defensiveMs)||0,_reviveSicknessMs:Number(x.reviveSicknessMs)||0,_combatUniqueUsed:x.uniqueUsed||{},_combatPosition:x.position||null,
            _combatTalentTimers:x.talentTimers||{},_combatTalentFlags:x.talentFlags||{},_combatTalentCounters:x.talentCounters||{},_combatDamageActions:Number(x.damageActions)||0
          })});
          const runEncounter={...encounter,enemies:enemyInput,mechanics:config.interactiveMechanics||[],focusSelectedDamageOnly:Boolean(config.focusSelectedDamageOnly)};
          lastResult=C.simulate({party:partyInput,encounter:runEncounter,tactics:{interruptPriority:'standard',addPriority:'immediate',defensiveUsage:'standard',pullStyle:'normal',movementDiscipline:'balanced',cooldownUse:'difficult'},seed:['quest-live',tok,config.title,step++].join(':'),maxDurationMs:sliceMs,elapsedOffsetMs:elapsed},{zone:'quest-encounters'});
          const sliceStart=elapsed,mainEnemies=(lastResult.finalState?.enemies||[]).filter(e=>!e.isAdd);
          lastResult.events.filter(e=>e.type==='ENEMY_DEFEATED').forEach(e=>{const i=qEventEnemyIndex(e.target);if(i>=0&&downAt[i]==null){downAt[i]=sliceStart+Number(e.timestamp||0);deathAt[i]=downAt[i]}});
          questFight.eventOffset=sliceStart;
          const visual={...lastResult,outcome:'ongoing',events:(lastResult.events||[]).filter(e=>e.type!=='COMBAT_START'&&e.type!=='COMBAT_END')};
          await qPlayReborn(visual,tok);if(tok!==encounterToken||settled)return;
          elapsed+=Number(lastResult.durationMs)||sliceMs;questFight.eventOffset=elapsed;
          mainEnemies.forEach((e,i)=>{questFight.enemyMax[i]=Number(e.maxHealth)||questFight.enemyMax[i];questFight.enemyHp[i]=Math.max(0,Number(e.health)||0);enemyPositions[i]=e.position?{x:Number(e.position.x),y:Number(e.position.y)}:enemyPositions[i];qSetEnemyHp(i,questFight.enemyHp[i])});
          (lastResult.finalState?.players||[]).forEach(fp=>{
            const id=fp.characterId||String(fp.id||'').replace(/^p-/,'');const c=p.find(x=>String(x.id)===String(id));if(!c)return;
            const healthPct=fp.maxHealth>0?fp.health/fp.maxHealth*100:0;questFight.partyHp[c.id]=healthPct;questFight.resources[c.id]=fp.resource||questFight.resources[c.id];qSetPartyHp(c,healthPct);
            const sliceDuration=Math.max(0,Number(lastResult?.durationMs)||0),talentTimers=Object.fromEntries(Object.entries(fp.talentTimers||{}).map(([k,v])=>[k,Math.max(0,(Number(v)||0)-sliceDuration)]));
            carry[c.id]={healthPct,resource:fp.resource,cooldowns:fp.cooldowns||{},statuses:statusCarry(fp),defensiveMs:fp.defensiveUntil||0,reviveSicknessMs:fp.revivePenaltyUntil||0,uniqueUsed:fp.uniqueUsed||{},position:fp.position?{x:Number(fp.position.x),y:Number(fp.position.y)}:carry[c.id]?.position,talentTimers,talentFlags:fp.talentFlags||{},talentCounters:fp.talentCounters||{},damageActions:Number(fp.damageActions)||0}
          });
          if(lastResult.outcome==='defeat'){await showEnd(false);return}
          const dead=questFight.enemyHp.map((hp,i)=>Number(hp)<=0?i:-1).filter(i=>i>=0),living=questFight.enemyHp.map((hp,i)=>Number(hp)>0?i:-1).filter(i=>i>=0);
          if(dead.length===names.length){
            const times=dead.map(i=>Number(deathAt[i]??elapsed));if(Math.max(...times)-Math.min(...times)<=reviveMs){await showEnd(true);return}
            const oldest=dead.sort((a,b)=>(deathAt[a]||0)-(deathAt[b]||0))[0];reviveEnemy(oldest)
          }else if(living.length){
            dead.forEach(i=>{if(downAt[i]!=null&&elapsed-downAt[i]>=reviveMs)reviveEnemy(i)})
          }
          qRefreshTargetControls()
        }
      }catch(err){console.error('Interactive quest combat failed',err);encounterRoot().hidden=true;document.body.classList.remove('quest-cb2d-open');finish(false)}
    })()
  })
}

async function runResonanceBacklash(){
  const q=ensure(),bearer=party().find(c=>c.id===q.bearerId)||party()[0];
  return runQuest2DFight({quest:QUEST.title,title:'Resonance Backlash',location:'Jory’s Workshop',ambience:'The Blackened Fragment rejects the false route and tears an echo out of the room.',phases:['Backlash'],enemies:['Resonance Echo'],eliteIndex:0,combat:{kind:'boss',level:4,recommendedItemLevel:20,enemyTypes:['elite'],enemyHealth:850,mechanics:[['Memory Burst','circles',1500],['Resonance Shriek','interrupt',1800]]},completeText:'The echo collapses back into the fragment. The cipher is still waiting.'});
}
async function beginInvestigation(){
  const q=ensure(),p=party();if(currentStage()!=='route')return;
  if(p.length!==5){alert('Build a complete five-character party before following the route.');Game.switchView?.('party');return}
  const bearer=p.find(c=>c.id===q.bearerId)||p[0],ranged=p.find(c=>qProfile(c)==='ranged')||p.find(c=>qRole(c)==='dps')||p[0];
  const won=await runQuest2DFight({
    quest:QUEST.title,title:'The Road Under the Road',location:'Collapsed Survey Tunnels',
    ambience:'Jory’s decoded posts lead beneath the east road. The Blackened Fragment grows warmer with every step.',
    phases:['Buried Junction','Resonance Husk','Hollow Seal'],enemies:['Hollow Scavenger','Hollow Scavenger','Resonance Husk'],eliteIndex:2,combat:{kind:'boss',level:5,recommendedItemLevel:22,enemyTypes:['trash','trash','elite'],enemyHealth:560,mechanics:[['Resonance Lash','line',1600],['Binding Hum','interrupt',1850],['Cell Pulse','circles',1500]]},
    completeText:'A final survey mark is cut into the wall behind the broken Husk. Beyond it waits the Hollow Seal.'
  });
  if(!won)return;
  setItemStatus('decoded-route','used');
  await advance('route','seal','The guild fought through the buried survey tunnels and discovered the Hollow Seal.');
}

async function inspectSeal(){
  if(currentStage()!=='seal')return;
  showDialogue('The Door That Breathed','Tessa Orr',[
    'Do you hear that?',
    'Do not say “the wind”. The wind does not inhale.',
    'The shard fits the centre socket exactly. I am not putting it in yet.',
    'Three rings. Three memories in the route.',
    'The outer ring wants the beginning. The middle wants the mark before the arch. The heart...',
    '...the heart wants the last place the old surveyors reached.',
    'Whatever built this expected someone to come back.'
  ],openSealPuzzle);
}
async function runSealGuardian(){
  return runQuest2DFight({
    quest:QUEST.title,title:'Guardian of the Seal',location:'The Hollow Seal',
    ambience:'The misaligned rings grind together. A shape peels itself out of the stone and blocks the chamber.',
    phases:['Awakening','Sealbreaker'],enemies:['Hollow Sentinel'],eliteIndex:0,combat:{kind:'boss',level:6,recommendedItemLevel:24,enemyTypes:['boss'],enemyHealth:1450,mechanics:[['Stone Choir','interrupt',1800],['Sealbreaker Line','line',1600],['Hollow Sweep','cone',1700]]},
    completeText:'The Sentinel collapses into inert glass. The seal rings remain, waiting to be aligned correctly.'
  });
}
function openSealPuzzle(){
  if(currentStage()!=='seal')return;
  const q=ensure(),root=puzzleRoot();root.hidden=false;document.body.classList.add('quest-puzzle-open');
  q.sealMistakes=Number(q.sealMistakes)||0;
  const symbols=[
    {id:'hammer',icon:'⚒',label:'Work'},
    {id:'water',icon:'≈',label:'Water'},
    {id:'arch',icon:'∩',label:'Arch'},
    {id:'eye',icon:'◉',label:'Watcher'}
  ];
  const rings=[
    {name:'OUTER',order:['water','eye','hammer','arch'],target:'hammer'},
    {name:'MIDDLE',order:['arch','hammer','eye','water'],target:'water'},
    {name:'HEART',order:['hammer','arch','water','eye'],target:'eye'}
  ];
  const pos=[0,0,0];
  const current=i=>rings[i].order[pos[i]%rings[i].order.length];
  const draw=(note='')=>{
    root.innerHTML='<section class="quest-puzzle quest-seal-puzzle"><header><div><small>QUEST PUZZLE · THE HOLLOW SEAL</small><h2>Align the breathing door</h2></div><button data-close>×</button></header>'+
      '<div class="quest-seal-layout"><aside><div class="quest-puzzle-clue"><span>TESSA’S READING</span><p>The outer ring remembers where the survey began. The middle remembers what came immediately before the arch. The heart remembers the furthest surviving post.</p></div>'+
      '<div class="quest-puzzle-clue"><span>YOUR DECODED ROUTE</span><p>⚒ Work → ≈ Culvert → ∩ Arch → ◉ Inspection</p></div>'+
      '<div class="quest-puzzle-clue"><span>WARNING</span><p>Testing a bad alignment feeds resonance back into the seal. Repeated mistakes can wake whatever was left to guard it.</p></div></aside>'+
      '<main><div class="seal-rings">'+rings.map((r,i)=>{const sym=symbols.find(x=>x.id===current(i));return '<article><small>'+r.name+' RING</small><div class="seal-ring-visual"><i>'+sym.icon+'</i></div><b>'+sym.label+'</b><button data-rotate="'+i+'">ROTATE CLOCKWISE</button></article>'}).join('')+'</div>'+
      '<div class="quest-resonance-meter seal-pressure"><span>SEAL PRESSURE</span><div><i style="width:'+Math.min(100,q.sealMistakes*50)+'%"></i></div><b>'+q.sealMistakes+'</b></div>'+
      '<p id="questPuzzleHint" class="'+(note?'wrong':'')+'">'+(note||'All three rings must be correct at the same time. Use the decoded route rather than trial and error.')+'</p>'+
      '<button class="quest-puzzle-confirm" data-test-seal>TEST ALIGNMENT</button></main></div></section>';
    root.querySelector('[data-close]').onclick=()=>{root.hidden=true;document.body.classList.remove('quest-puzzle-open')};
    root.querySelectorAll('[data-rotate]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.rotate);pos[i]=(pos[i]+1)%rings[i].order.length;draw()});
    root.querySelector('[data-test-seal]').onclick=async()=>{
      const ok=rings.every((ring,i)=>current(i)===ring.target);
      if(!ok){
        q.sealMistakes++;Game.save?.();
        if(q.sealMistakes%2===0){
          root.hidden=true;document.body.classList.remove('quest-puzzle-open');
          await runSealGuardian();
          if(currentStage()==='seal')openSealPuzzle();
          return;
        }
        draw('The fragment kicks violently in the socket. At least one ring contradicts the route you decoded.');
        return;
      }
      root.hidden=true;document.body.classList.remove('quest-puzzle-open');
      addHistory('The guild aligned the Hollow Seal using the decoded survey route.');
      showDialogue('The Seal Opens','Tessa Orr',[
        'Wait.',
        'The breathing stopped.',
        'Turn the shard.',
        'Slowly.',
        '...That is not a door opening.',
        'That is pressure equalising.',
        'Whatever is on the other side has been sealed in long enough to have its own air.'
      ],()=>showDialogue('Bram’s Professional Opinion','Bram Kel',[
        'So the good news is you found the missing road.',
        'The bad news is the missing road ends at a breathing underground ruin full of things that tried to kill you.',
        'I am going to write “subsurface structural complication” on the council report.',
        'If you go back in there, bring me something that proves I should retire.'
      ],completeQuest));
    };
  };
  draw();
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
  root.innerHTML='<section class="quest-complete-card"><div class="quest-complete-rune">⌁</div><small>QUEST COMPLETE</small><h2>'+QUEST.title+'</h2><p>A forgotten survey route has opened into something older beneath Zeltira. The Hollow Sanctum is no longer sealed.</p><div class="quest-complete-rewards"><article><span>GOLD</span><b>+250</b></article><article><span>RENOWN</span><b>+150</b></article><article><span>DISCOVERY</span><b>PERMANENT</b></article></div><div class="quest-complete-unlock"><small>PERMANENT UNLOCK</small><h3>The Hollow Sanctum</h3><p>Void Crystal can now be recovered from the depths. A unique first-clear Relic waits inside.</p></div><button>OPEN DUNGEON JOURNAL →</button></section>';
  document.body.appendChild(root);
  root.querySelector('button').onclick=()=>{root.remove();Game.switchView?.('content');window.CellboundHollowSanctum?.renderCard?.()};
}

const CLASS_TRIALS={
 Warrior:[['warrior-guardian',5,'Challenging Presence','Hold the Line','Prove you can decide where the enemy’s blade falls.','Ironbound Challenger',520],[ 'warrior-battle-focus',10,'Battle Focus','Break the Siege','Trade patience for pressure and break an enemy line alone.','Siegebreaker',780]],
 Paladin:[['paladin-blessing-resolve',5,'Blessing of Resolve','Oath Under Fire','Stand firm while sacred resolve carries you through the assault.','Oathbreaker Shade',520],['paladin-radiant-purpose',10,'Radiant Purpose','The Unbroken Oath','Balance judgment and restoration under sustained pressure.','Fallen Justicar',780]],
 Priest:[['priest-divine-inspiration',5,'Divine Inspiration','The Vigil','Endure a trial of faith and keep yourself standing.','Faithless Echo',500],['priest-inner-fire',10,'Inner Fire','Light and Shadow','Master the line between preservation and destruction.','Hollow Confessor',760]],
 Druid:[['druid-wild-communion',5,'Wild Communion','Call of the Wild','Survive the wild’s test without the shelter of your party.','Briarheart Beast',520],['druid-primal-flow',10,'Primal Flow','The Changing Path','Adapt your rhythm as the battlefield changes around you.','Primal Warden',780]],
 Hunter:[['hunter-predators-focus',5,"Predator's Focus",'The Patient Hunt','Track, position and finish dangerous prey alone.','Ashfang Alpha',500],['hunter-pack-instinct',10,'Pack Instinct','Run With the Pack','Overcome a predator that refuses to fight on your terms.','Razorpack Matriarch',760]],
 Rogue:[['rogue-killing-tempo',5,'Killing Tempo','One Clean Cut','Control the engagement and end it before the enemy can recover.','Guild Enforcer',490],['rogue-relentless',10,'Relentless','No Witnesses','Maintain pressure through a prolonged duel with nowhere to hide.','Silent Auditor',750]],
 Mage:[['mage-arcane-empowerment',5,'Arcane Empowerment','Control the Current','Control unstable magic while defeating what it has awakened.','Arcane Aberration',500],['mage-flow-state',10,'Flow State','The Unbroken Cast','Keep your spell rhythm while the arena fights back.','Spell-Eater',760]],
 Shaman:[['shaman-bloodlust',5,'Bloodlust','Beat of the Storm','Match the storm’s tempo and overwhelm its guardian.','Stormbound Elemental',520],['shaman-ancestral-current',10,'Ancestral Current','Voices of the Ancestors','Survive an ancestral trial of endurance and control.','Restless Ancestor',780]],
 Warlock:[['warlock-demonic-pact',5,'Demonic Pact','Terms of the Pact','Prove you command the bargain rather than serve it.','Lesser Pact Demon',510],['warlock-soul-hunger',10,'Soul Hunger','Feed the Darkness','Defeat a creature that grows more dangerous the longer it feeds.','Soul Devourer',790]],
 Monk:[['monk-mystic-touch',5,'Mystic Touch','The Open Hand','Win through timing and control rather than brute force.','Wayward Disciple',500],['monk-inner-tempo',10,'Inner Tempo','Stillness in Motion','Keep your rhythm through a relentless martial trial.','Temple Challenger',760]],
 'Death Knight':[['death-knight-horn',5,'Horn of Winter','Wake the Fallen','Command the dead without becoming one of them.','Risen Champion',530],['death-knight-frozen-will',10,'Frozen Will','The Cold March','Advance through punishing cold and break its master.','Frostbound Revenant',800]],
 'Demon Hunter':[['demon-hunter-momentum',5,'Demonic Momentum','Embrace the Hunt','Turn aggression and movement into a weapon.','Fel Pursuer',520],['demon-hunter-fel-instinct',10,'Fel Instinct','Master the Demon','Control the power that would rather control you.','Inner Demon',800]],
 Evoker:[['evoker-draconic-resonance',5,'Draconic Resonance','Echoes of the Flights','Awaken the resonance carried in your draconic blood.','Resonant Drake',510],['evoker-ancient-vitality',10,'Ancient Vitality','Legacy Awakened','Prove you can wield ancient power without being consumed by it.','Ancient Echo',780]]
};
function classTrialDefs(){
 const out=[];
 (state()?.roster||[]).forEach(ch=>(CLASS_TRIALS[ch.class]||[]).forEach(x=>{
  const level=Number(x[1])||1,unlocked=Boolean(ch?.classBuffProgress?.unlocked?.includes(x[0]));
  if(Number(ch?.level||1)<level&&!unlocked)return;
  out.push({character:ch,id:x[0],level,buff:x[2],title:x[3],summary:x[4],enemy:x[5],health:x[6],key:'class-trial:'+ch.id+':'+x[0]})
 }));
 return out
}
function classTrialDone(t){return Boolean(t?.character?.classBuffProgress?.unlocked?.includes(t.id))}
function classTrialAvailable(t){return Number(t?.character?.level||1)>=t.level&&!classTrialDone(t)}
function classTrialCard(t){
 const done=classTrialDone(t),locked=Number(t.character.level||1)<t.level;
 return {id:t.key,title:t.title,meta:t.character.name+' · '+t.character.class,difficulty:'Class Trial',status:done?'COMPLETE':locked?'LEVEL '+t.level:'AVAILABLE',complete:done,locked,icon:'✦'}
}
function renderClassTrialDetail(t,root,side){
 const done=classTrialDone(t),locked=Number(t.character.level||1)<t.level;
 root.innerHTML='<div class="quest-v3-hero"><div><small>SOLO CLASS TRIAL · LEVEL '+t.level+'</small><h2>'+esc(t.title)+'</h2><p>'+esc(t.character.name+' · '+t.character.class)+'</p></div><span class="quest-v3-status '+(done?'complete':'')+'">'+(done?'COMPLETE':locked?'LOCKED':'AVAILABLE')+'</span></div><div class="quest-v3-story"><p>'+esc(t.summary)+'</p></div><section class="quest-v3-clue"><small>CLASS CHALLENGE</small><h3>'+esc(t.enemy)+'</h3><p>This trial must be completed by '+esc(t.character.name)+' alone. Party members cannot enter.</p><em>Victory permanently teaches this character '+esc(t.buff)+'.</em></section><div class="quest-detail-action">'+(done?'<div class="quest-complete-stamp">BUFF LEARNED</div>':locked?'<div class="quest-action-block locked"><b>LOCKED</b><small>'+esc(t.character.name)+' must reach Level '+t.level+'. Current level: '+Number(t.character.level||1)+'.</small></div>':'<button class="quest-primary danger" data-class-trial-start="'+esc(t.key)+'">ENTER SOLO TRIAL →</button>')+'</div>';
 side.innerHTML='<section><small>PARTICIPANT</small><div class="quest-history"><p>'+esc(t.character.name+' · '+t.character.class+' · '+t.character.spec)+'</p><p>Level '+Number(t.character.level||1)+' · Solo only</p></div></section><section><small>REWARD</small><div class="quest-reward-list"><p>'+esc(t.buff)+'</p><p>Permanent class-buff unlock for '+esc(t.character.name)+'</p></div></section>';
 root.querySelector('[data-class-trial-start]')?.addEventListener('click',()=>startClassTrial(t.key))
}
async function startClassTrial(key){
 const t=classTrialDefs().find(x=>x.key===key);if(!t||!classTrialAvailable(t))return;
 showDialogue(t.title,'Class Mentor',['This trial belongs to you alone, '+t.character.name+'.','Show me that you understand what it means to fight as a '+t.character.class+'.'],async()=>{
  const won=await runQuest2DFight({quest:t.character.class+' Class Trial',title:t.title,location:'Class Trial',participants:[t.character],allowSolo:true,partyLabel:'SOLO ADVENTURER',enemies:[t.enemy],ambience:t.summary,completeText:t.character.name+' has mastered '+t.buff+'.',combat:{kind:'boss',level:t.level,recommendedItemLevel:0,enemyHealth:t.health,mechanics:[[t.title+' Test','circles',Math.max(1600,2800-t.level*60)]]}});
  if(!won)return;
  const ch=(state()?.roster||[]).find(x=>x.id===t.character.id);if(!ch)return;ch.classBuffProgress=ch.classBuffProgress&&typeof ch.classBuffProgress==='object'?ch.classBuffProgress:{unlocked:[]};ch.classBuffProgress.unlocked=Array.isArray(ch.classBuffProgress.unlocked)?ch.classBuffProgress.unlocked:[];if(!ch.classBuffProgress.unlocked.includes(t.id))ch.classBuffProgress.unlocked.push(t.id);ch.buffSkill=t.id;
  ensure().classTrials[t.key]={completedAt:new Date().toISOString(),characterId:ch.id,buffId:t.id};state().activity=state().activity||[];state().activity.push(ch.name+' completed '+t.title+' and learned '+t.buff+'.');await commit();selectedAdventure=t.key;questToast('CLASS TRIAL COMPLETE',t.buff,'Unlocked for '+ch.name+'.')
 })
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
  if(!q.started&&!echoesUnlocked())return '<div class="quest-action-block locked"><b>LOCKED</b><small>Clear The Ashen Vault once or reach average active-party Level 3. Current average: '+averagePartyLevel()+'.</small></div>';
  if(!q.started)return '<button class="quest-primary" data-start>START QUEST →</button>';
  if(stage==='letter')return '<button class="quest-primary" data-start>READ BRAM’S LETTER →</button>';
  if(stage==='bearer'){
    const activeIds=new Set(party().map(c=>c.id)),chars=(state().roster||[]).filter(c=>activeIds.has(c.id));
    return '<div class="quest-bearer-picker"><small>CHOOSE THE BEARER</small>'+chars.map(c=>'<button data-bearer="'+c.id+'"><span>'+portraitHTML(c,'sm')+'</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></div></button>').join('')+(chars.length!==5?'<p>Your active five is incomplete. Build the party first.</p>':'')+'</div>';
  }
  if(stage==='vault'){const bypass=averagePartyLevel()>=3;return '<div class="quest-action-block"><div><span>BEARER</span><b>'+esc(q.bearerName||'Not assigned')+'</b></div><button class="quest-primary" data-ashen>OPEN THE ASHEN VAULT →</button>'+(bypass?'<button class="quest-primary secondary" data-force-resonance>USE PARTY RESONANCE INSTEAD →</button>':'')+'<small>'+(bypass?'Your active five is strong enough to continue without another Ashen Vault clear.':'Clear The Ashen Vault with '+esc(q.bearerName||'the Bearer')+' in the five, or reach average party Level 3.')+'</small></div>'}
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
    '<section class="quest-v3-clue"><small>'+(a.complete?'WHERE IT LED':'CURRENT CLUE')+'</small><h3>'+esc(a.complete?'The Ashen Vault':d.label)+'</h3><p>'+esc(a.complete?'The old forge entrance is open. Repeat runs can drop stronger versions of the gear earned on this road.':d.objective)+'</p>'+(a.complete?'':'<em>'+esc(d.hint)+'</em>')+'</section>'+
    '<section class="quest-v3-known"><div class="quest-v3-section-head"><span>WHAT YOUR GUILD KNOWS</span><small>Investigation notes are recorded as you uncover them.</small></div><div>'+(facts.length?facts.map(x=>'<p>'+esc(x)+'</p>').join(''):'<p class="quest-v3-unknown">Warden Elara is waiting at Zeltira’s east gate.</p>')+'</div></section>'+
    '<div class="quest-detail-action">'+ashfallActionHtml()+'</div>';
  side.innerHTML='<section><small>REWARDS</small><div class="quest-reward-list"><p>3 × Tier 1 quest gear choices</p><p>Reliable spec-focused stats</p><p>Dungeon drops can roll stronger stats</p><p>The Ashen Vault permanently unlocked</p></div></section>'+
    '<section><small>QUEST REWARD HISTORY</small><div class="quest-history">'+(Object.values(q.rewardClaims||{}).filter(x=>String(x?.itemName||'')&&['Head','Chest','Weapon'].includes(x.slot)&&String(x.tier)==='1').map(x=>'<p>'+esc(x.characterName+' · '+x.itemName)+'</p>').join('')||'<p>No quest equipment claimed yet.</p>')+'</div></section>'+
    '<section><small>ADVENTURE JOURNAL</small><div class="quest-history">'+(a.history.slice(-6).reverse().map(h=>'<p>'+esc(h.text)+'</p>').join('')||'<p>No journal entries yet.</p>')+'</div></section>';
}


const NULL_QUEST={id:'signal-from-nowhere',title:'Signal From Nowhere',difficulty:'Intermediate',length:'Long',start:'Dr. Elara Voss · Cell Research Annex',summary:'A dead research facility has started transmitting again. Follow the impossible signal, identify what survived inside and find a way back out.',rewards:['The Null Complex permanently unlocked','Null Complex field dossier','150 Gold','100 Guild Renown']};
const NULL_STAGES=[
 {id:'signal',label:'The Signal',objective:'Meet Dr. Elara Voss and inspect the NULL//07 transmission.'},
 {id:'entry',label:'The Forgotten Facility',objective:'Follow the signal into the abandoned Null Complex.'},
 {id:'splice',label:'First Contact',objective:'Survive the specimen waiting beyond the entry chamber.'},
 {id:'recording',label:'The First Recording',objective:'Search the research chamber for the source of the old transmission.'},
 {id:'zero',label:'Containment Wing',objective:'Push through the containment wing and inspect the sealed chamber.'},
 {id:'components',label:'Repair the Teleporter',objective:'Recover the Conduit Cable, Power Cell and Reactor Fuse.'},
 {id:'overseer',label:'The Overseer',objective:'Restore the teleporter before the facility finishes waking up.'},
 {id:'prototype',label:'Prototype 07',objective:'Defeat the experiment released by the Overseer.'},
 {id:'escape',label:'Escape',objective:'Return to the teleporter and get the party out.'}
];
const nullQ=()=>ensure().nullComplex;
const nullStage=()=>nullQ().complete?'complete':nullQ().stage||'signal';
const nullDef=()=>NULL_STAGES.find(x=>x.id===nullStage())||NULL_STAGES[0];
// Null Complex bespoke comic artwork is loaded here only after the actual assets exist.
// Empty values deliberately use Comic Scenes' illustrated fallback instead of rendering broken <img> elements.
const NULL_ART={
 signal:'./assets/comics/null-complex/voss-signal.webp',entry:'./assets/comics/null-complex/facility-entry.webp',splice:'./assets/comics/null-complex/first-aberrant.webp',
 orin:'./assets/comics/null-complex/orin-recording.webp',zero:'./assets/comics/null-complex/subject-zero.webp',teleporter:'./assets/comics/null-complex/teleporter.webp',
 overseer:'./assets/comics/null-complex/overseer-awakens.webp',prototype:'./assets/comics/null-complex/prototype-07.webp',escape:'./assets/comics/null-complex/escape.webp',sting:'./assets/comics/null-complex/subject-zero-awake.webp'
};
function nullHistory(text){const n=nullQ();n.history.push({at:new Date().toISOString(),text});n.history=n.history.slice(-30)}
async function nullAdvance(done,next,note){const n=nullQ();if(done&&!n.done.includes(done))n.done.push(done);n.stage=next;if(note)nullHistory(note);await commit();selectedAdventure='null-complex-quest';render();if(next!=='complete')questToast('QUEST UPDATED',NULL_QUEST.title,nullDef().objective)}
async function nullComic(title,speaker,text,art,done){
 const comic=window.CellboundComicScenes;if(comic?.show)await comic.show({eyebrow:'CELLBOUND · QUEST',title,subtitle:speaker,page:'SIGNAL FROM NOWHERE',theme:'null',panels:(Array.isArray(text)?text:[text]).map((t,i)=>({kind:i?'dialogue':'location',speaker,eyebrow:i?'':'QUEST STORY',title:i?'':title,text:t,artwork:art,wide:true})),progressive:true,storyOnly:true,allowSkip:true,skipLabel:'SKIP STORY',nextLabel:'NEXT PANEL →',continueLabel:'CONTINUE →'});
 if(done)await done()
}
async function startNullQuest(){
 const n=nullQ();if(n.complete)return;if(!n.started){n.started=true;n.startedAt=new Date().toISOString();nullHistory('Dr. Elara Voss isolated an impossible transmission marked NULL//07.');await commit()}
 const comic=window.CellboundComicScenes;
 if(comic?.show)await comic.show({
  eyebrow:'CELLBOUND · QUEST',
  title:'The Signal',
  subtitle:'Dr. Elara Voss',
  page:'SIGNAL FROM NOWHERE',
  theme:'null',
  panels:[{kind:'location',speaker:'Dr. Elara Voss',artwork:NULL_ART.signal,wide:true}],
  reveals:[
   {panel:0,speaker:'Dr. Elara Voss',text:'This signal should not exist. The facility transmitting it was destroyed years ago.',placement:'bottom-left'},
   {panel:0,speaker:'Dr. Elara Voss',text:'NULL//07. Containment active. Personnel: zero. Subjects: forty-seven. And one final instruction: do not open the Complex.',placement:'top-right'},
   {panel:0,speaker:'Dr. Elara Voss',text:'I need a team I can trust. Follow the signal. Find out what is still alive in there.',placement:'bottom-right'}
  ],
  progressive:true,
  storyOnly:true,
  allowSkip:true,
  skipLabel:'SKIP STORY',
  nextLabel:'NEXT →',
  continueLabel:'CONTINUE →'
 });
 await nullAdvance('signal','entry','Voss traced NULL//07 to a sealed research facility omitted from every living map.')
}
async function playNullQuest(){
 const n=nullQ(),stage=nullStage(),p=party();if(p.length!==5){alert('Build a complete active five-character party before entering the Null Complex.');Game.switchView?.('party');return}
 if(stage==='signal')return startNullQuest();
 if(stage==='entry')return nullComic('The Forgotten Facility','Dr. Elara Voss',['The doors still have power. Barely. Stay together. Whatever is transmitting from inside has been doing it without personnel for years.'],NULL_ART.entry,()=>nullAdvance('entry','splice','The party entered the abandoned Null Complex.'));
 if(stage==='splice'){
  const won=await runQuest2DFight({quest:NULL_QUEST.title,title:'First Contact',location:'Null Complex · Entry Wing',ambience:'A containment door opens by itself. Something unfolds from the dark.',enemies:['Splice'],combat:{kind:'boss',level:4,recommendedItemLevel:20,enemyHealth:620,mechanics:[['Backline Pounce','line',1500],['Cell Rend','cone',1700]]},completeText:'The specimen collapses. Its Cell structure continues changing even after death.'});if(!won)return;
  return nullComic('First Contact','Dr. Elara Voss',['Its Cell structure has been rewritten dozens of times. Whatever that was, it was made. I am logging it as an Aberrant.'],NULL_ART.splice,()=>nullAdvance('splice','recording','Voss classified the altered specimen as an Aberrant.'));
 }
 if(stage==='recording')return nullComic('The First Recording','Director Cael Orin',['The Null Complex was built to answer a simple question: what happens when a Cell is deliberately altered rather than naturally developed? We are unlocking the next step in human potential.'],NULL_ART.orin,()=>nullAdvance('recording','zero','An archived recording identified Director Cael Orin and the original purpose of the Complex.'));
 if(stage==='zero'){
  const won=await runQuest2DFight({quest:NULL_QUEST.title,title:'Containment Wing',location:'Null Complex · Containment',ambience:'Two altered specimens move between the party and a chamber still drawing power.',enemies:['Bulwark Specimen','Siphon'],eliteIndex:0,combat:{kind:'boss',level:5,recommendedItemLevel:22,enemyTypes:['elite','elite'],enemyHealth:720,mechanics:[['Containment Guard','circles',1600],['Power Siphon','interrupt',1800]]},completeText:'The wing falls quiet. One containment chamber remains sealed.'});if(!won)return;
  return nullComic('Subject Zero','Dr. Elara Voss',['SUBJECT ZERO. Status: stable. That chamber is drawing more power than the rest of the wing combined. Do not touch it.'],NULL_ART.zero,()=>nullAdvance('zero','components','The party found Subject Zero alive inside a sealed containment chamber.'));
 }
 if(stage==='components')return playNullComponentSearch();
 if(stage==='overseer')return nullComic('The Overseer','THE OVERSEER',['Unauthorized personnel detected. Containment protocol resumed. Experiment cycle commencing.'],NULL_ART.overseer,()=>nullAdvance('overseer','prototype','Restoring the teleporter woke the facility Overseer.'));
 if(stage==='prototype')return playNullPrototype();
 if(stage==='escape')return finishNullQuest()
}
async function playNullComponentSearch(){
 const n=nullQ(),order=[['cable','Conduit Cable'],['cell','Power Cell'],['fuse','Reactor Fuse']],next=order.find(x=>!n.components[x[0]]);
 if(!next){await nullComic('The Teleporter','Dr. Elara Voss',['That is all three. Get them back to the teleporter. Something else just came online. Move.'],NULL_ART.teleporter,()=>nullAdvance('components','overseer','All three teleporter components were recovered.'));return}
 const root=puzzleRoot();root.hidden=false;document.body.classList.add('quest-puzzle-open');const idx=order.findIndex(x=>x[0]===next[0]),pressure=Math.max(0,Number(n.searchPressure)||0);
 const task=[
  {title:'Collapsed Cable Trench',brief:'Trace the live conduit through the damaged wall.',prompt:'Which line still carries the teleporter signal?',choices:[['COOLANT RETURN',0],['LIVE CONDUIT',1],['SECURITY BUS',0]],success:'Conduit isolated. The cable comes free without killing the corridor lights.'},
  {title:'Emergency Power Bay',brief:'The cell is locked behind a three-bank transfer. Pulling it live will arc the room.',prompt:'Choose the safe transfer order.',choices:[['ISOLATE → BYPASS → DISCHARGE',1],['DISCHARGE → OPEN → BYPASS',0],['BYPASS → OPEN → ISOLATE',0]],success:'The charge rolls into the bypass bank. Power Cell released.'},
  {title:'Reactor Service Console',brief:'Pressure is climbing while the Overseer begins polling dormant systems.',prompt:'Which system must be vented before the fuse is removed?',choices:[['AUXILIARY REACTOR LINE',1],['CONTAINMENT COOLANT',0],['PRIMARY CELL FEED',0]],success:'Pressure drops. The Reactor Fuse unlocks from its housing.'}
 ][idx];
 if(!task){root.hidden=true;document.body.classList.remove('quest-puzzle-open');questToast('QUEST ERROR','Signal From Nowhere','Unable to load the current component task.');return}
 root.innerHTML='<section class="quest-puzzle null-search-quest"><header><div><small>NULL COMPLEX · FIELD TASK '+(idx+1)+' / 3</small><h2>'+task.title+'</h2></div><span class="null-search-pressure">FACILITY ALERT '+Math.min(3,pressure)+' / 3</span></header><div class="quest-v3-story"><p>'+task.brief+'</p></div><div class="null-search-task"><small>VOSS · LIVE COMMS</small><h3>'+task.prompt+'</h3><div class="null-search-nodes">'+task.choices.map((x,i)=>'<button data-choice="'+i+'" data-correct="'+x[1]+'">'+x[0]+'</button>').join('')+'</div><p data-search-note>Read the room before committing. A bad input raises facility alert.</p></div></section>';
 root.querySelectorAll('.null-search-nodes button').forEach(btn=>btn.onclick=async()=>{
  if(btn.dataset.correct!=='1'){n.searchPressure=Math.min(3,(Number(n.searchPressure)||0)+1);Game.save?.();root.querySelector('[data-search-note]').textContent=idx===0?'Wrong line. The wall sparks and something answers deeper in the facility.':idx===1?'Unsafe transfer. The bay alarms and dumps charge back into the grid.':'Wrong system. Pressure spikes and the Overseer logs the access attempt.';root.querySelector('.null-search-pressure').textContent='FACILITY ALERT '+n.searchPressure+' / 3';btn.disabled=true;return}
  root.querySelector('[data-search-note]').textContent=task.success;root.querySelectorAll('button').forEach(x=>x.disabled=true);await wait(650);
  n.components[next[0]]=true;nullHistory('Recovered '+next[1]+'.');root.hidden=true;document.body.classList.remove('quest-puzzle-open');await commit();questToast('COMPONENT RECOVERED',next[1],(idx+1)+' / 3 teleporter components secured.');
  if(idx===0){
   const won=await runQuest2DFight({quest:NULL_QUEST.title,title:'Power Bay Interruption',location:'Null Complex · Service Corridor',ambience:'The cable removal wakes two dormant specimens between the party and the power bay.',enemies:['Null Stalker','Splice'],combat:{kind:'boss',level:5,recommendedItemLevel:22,enemyTypes:['elite','trash'],enemyHealth:650,scaling:{enemyDamage:1+(Number(n.searchPressure)||0)*.03},mechanics:[['Phase Ambush','line',1400],['Backline Pounce','line',1500]]},autoContinueOnVictory:true,completeText:'The corridor is clear. The power bay is ahead.'});if(!won)return;nullHistory('The party fought through the service corridor after recovering the cable.');await commit()
  }
  if(idx===1&&Number(n.searchPressure)>=2){
   const won=await runQuest2DFight({quest:NULL_QUEST.title,title:'Alert Response',location:'Null Complex · Power Bay',ambience:'Facility alert releases an Overseer Drone before the party can reach the reactor service console.',enemies:['Overseer Drone'],combat:{kind:'boss',level:5,recommendedItemLevel:22,enemyHealth:760,mechanics:[['Command Pulse','circles',1600],['System Lock','interrupt',1700]]},autoContinueOnVictory:true,completeText:'The drone falls. The route to reactor service is open.'});if(!won)return;nullHistory('Facility alert triggered an Overseer Drone response.');await commit()
  }
  playNullComponentSearch()
 })
}
async function playNullPrototype(){
 await nullComic('Experiment Cycle','Dr. Elara Voss',['The Overseer opened a chamber I cannot identify. Whatever comes through that door, it has multiple Cell signatures.'],NULL_ART.prototype);
 const won=await runQuest2DFight({quest:NULL_QUEST.title,title:'Prototype 07 — The Reconstituted',location:'Null Complex · Experiment Core',ambience:'Prototype 07 tears free of its restraints. Its body changes shape as different Cell patterns surface.',phases:['Splice Pattern','Siphon Pattern','Reactor Pattern'],enemies:['Prototype 07 — The Reconstituted'],combat:{kind:'final',level:6,recommendedItemLevel:24,enemyHealth:1350,mechanicIntervalMs:4200,mechanics:[['Backline Pounce','line',1500],['Power Siphon','interrupt',1750],['Reactor Instability','circles',1600]],scaling:{enemyDamage:1.08}},completeText:'Prototype 07 collapses. The facility alarms immediately change pitch.'});if(!won)return;
 await nullComic('Modifications','Dr. Elara Voss',['Those were not mutations. They were modifications. Someone deliberately combined Aberrant traits. Back to the teleporter. Now.'],NULL_ART.prototype,()=>nullAdvance('prototype','escape','Prototype 07 revealed that Aberrant traits had been deliberately combined.'))
}
async function finishNullQuest(){
 await nullComic('Escape','Dr. Elara Voss',['Install the final component. Do not wait for the system to stabilise. Activate it. Now.'],NULL_ART.escape);
 const n=nullQ(),s=state();n.complete=true;n.stage='complete';n.completedAt=new Date().toISOString();if(!n.done.includes('escape'))n.done.push('escape');s.progression=s.progression||{};s.progression.nullComplexUnlocked=true;s.gold=(Number(s.gold)||0)+150;s.renown=(Number(s.renown)||0)+100;nullHistory('The party escaped. Access to the Null Complex is now stable enough for repeat expeditions.');s.activity.push('Quest complete: Signal From Nowhere. The Null Complex was unlocked.');await commit();
 await nullComic('After the Extraction','', ['Deep inside the empty facility, a containment monitor flickers back to life.','SUBJECT ZERO — STATUS: AWAKE'],NULL_ART.sting);
 if(window.CellboundComicScenes?.show)await window.CellboundComicScenes.show({eyebrow:'QUEST COMPLETE',title:'Signal From Nowhere',subtitle:'ACTIVITY UNLOCKED',page:'COMPLETE',theme:'null',panels:[{kind:'location',eyebrow:'QUEST COMPLETE',title:'Signal From Nowhere',text:'The party escaped the facility. Whatever remains inside is far from over.',artwork:NULL_ART.signal,wide:true},{kind:'reveal',eyebrow:'ACTIVITY UNLOCKED',title:'THE NULL COMPLEX',text:'Repeatable extraction expeditions are now available: 2 attempts every 5 days.',artwork:NULL_ART.entry,wide:true}],progressive:true,storyOnly:true,allowSkip:false,continueLabel:'OPEN ACTIVITIES →'});
 Game.switchView?.('world')
}
function nullActionHtml(){
 const n=nullQ(),st=nullStage();if(n.complete)return'<button class="quest-primary" data-nullquest-open-activity>OPEN THE NULL COMPLEX →</button>';
 if(!n.started)return'<button class="quest-primary" data-nullquest-start>INVESTIGATE THE SIGNAL →</button>';
 const labels={signal:'INSPECT NULL//07 →',entry:'ENTER THE FACILITY →',splice:'OPEN THE CONTAINMENT DOOR →',recording:'SEARCH THE LAB →',zero:'ENTER CONTAINMENT WING →',components:'SEARCH FOR COMPONENTS →',overseer:'RESTORE POWER →',prototype:'FACE PROTOTYPE 07 →',escape:'RUN FOR THE TELEPORTER →'};
 return'<button class="quest-primary" data-nullquest-play>'+esc(labels[st]||'CONTINUE INVESTIGATION →')+'</button>'
}
function renderNullQuestDetail(root,side){
 const n=nullQ(),d=nullDef(),known=[];if(n.started)known.push('NULL//07 is transmitting from a facility officially destroyed years ago.');if(n.done.includes('splice'))known.push('Altered Cell specimens inside the facility have been classified as Aberrants.');if(n.done.includes('recording'))known.push('Director Cael Orin used the Complex to deliberately alter living Cells.');if(n.done.includes('zero'))known.push('Subject Zero remains alive in a powered containment chamber.');if(n.done.includes('prototype'))known.push('Prototype 07 combined multiple Aberrant traits by design.');
 root.innerHTML='<div class="quest-v3-hero"><div><small>'+NULL_QUEST.difficulty.toUpperCase()+' · '+NULL_QUEST.length.toUpperCase()+' ADVENTURE</small><h2>'+NULL_QUEST.title+'</h2><p>'+NULL_QUEST.start+'</p></div><span class="quest-v3-status '+(n.complete?'complete':'')+'">'+(n.complete?'COMPLETE':n.started?'IN PROGRESS':'AVAILABLE')+'</span></div><div class="quest-v3-story"><p>'+NULL_QUEST.summary+'</p></div><section class="quest-v3-clue"><small>'+(n.complete?'WHERE IT LED':'CURRENT OBJECTIVE')+'</small><h3>'+esc(n.complete?'The Null Complex':d.label)+'</h3><p>'+esc(n.complete?'The facility can now be entered as a repeatable extraction activity.':d.objective)+'</p></section><section class="quest-v3-known"><div class="quest-v3-section-head"><span>WHAT YOUR GUILD KNOWS</span><small>The dossier grows as you investigate.</small></div><div>'+(known.length?known.map(x=>'<p>'+esc(x)+'</p>').join(''):'<p class="quest-v3-unknown">Voss is waiting with the NULL//07 transmission.</p>')+'</div></section><div class="quest-detail-action">'+nullActionHtml()+'</div>';
 side.innerHTML='<section><small>REWARDS</small><div class="quest-reward-list">'+NULL_QUEST.rewards.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div></section><section><small>TELEPORTER COMPONENTS</small><div class="quest-reward-list">'+[['cable','Conduit Cable'],['cell','Power Cell'],['fuse','Reactor Fuse']].map(x=>'<p>'+esc(x[1])+' · '+(n.components[x[0]]?'RECOVERED':'MISSING')+'</p>').join('')+'</div></section><section><small>ADVENTURE JOURNAL</small><div class="quest-history">'+(n.history.slice(-7).reverse().map(h=>'<p>'+esc(h.text)+'</p>').join('')||'<p>No entries yet.</p>')+'</div></section>'
}

function questCards(){
 const q=ensure(),a=q.ashfall;
 return [
  {id:'null-complex-quest',title:NULL_QUEST.title,meta:NULL_QUEST.length+' adventure · Null Complex',difficulty:NULL_QUEST.difficulty,status:nullQ().complete?'COMPLETE':nullQ().started?'IN PROGRESS':'AVAILABLE',complete:nullQ().complete,locked:false,icon:'◈'},
  {id:'ashfall',title:ASHFALL.title,meta:ASHFALL.length+' adventure · Zeltira',difficulty:ASHFALL.difficulty,status:a.complete?'COMPLETE':a.started?'IN PROGRESS':'AVAILABLE',complete:a.complete,locked:false},
  {id:'echoes',title:QUEST.title,meta:QUEST.length+' adventure · Zeltira',difficulty:QUEST.difficulty,status:complete()?'COMPLETE':q.started?'IN PROGRESS':echoesUnlocked()?'AVAILABLE':'LOCKED',complete:complete(),locked:!echoesUnlocked()&&!q.started},
  window.CellboundThirteenthBell?.card?.(),
  window.CellboundFourfoldLock?.card?.(),
  window.CellboundNoWayBack?.card?.(),
  ...classTrialDefs().map(classTrialCard)
 ].filter(Boolean)
}
function cardsForSelectedTab(){
 const all=questCards();
 if(selectedTab==='completed')return all.filter(x=>x.complete);
 if(selectedTab==='active')return all.filter(x=>!x.complete);
 return all
}
function renderList(){
 const root=$('#questJournalList');if(!root)return;const cards=cardsForSelectedTab();
 if(!cards.some(x=>x.id===selectedAdventure))selectedAdventure=cards[0]?.id||null;
 if(!cards.length){root.innerHTML='<div class="quest-list-empty">'+(selectedTab==='completed'?'No completed adventures yet.':selectedTab==='active'?'No active adventures.':'No adventures available.')+'</div>';return}
 root.innerHTML=cards.map(x=>'<button class="quest-v2-list-card '+(x.id===selectedAdventure?'selected':'')+(x.locked?' locked':'')+'" data-adventure="'+x.id+'"><div class="quest-v2-icon">'+(x.icon||(x.id==='ashfall'?'♜':'⌁'))+'</div><span><small>'+x.status+' · '+x.difficulty.toUpperCase()+'</small><b>'+x.title+'</b><em>'+x.meta+'</em></span></button>').join('');
 root.querySelectorAll('[data-adventure]').forEach(b=>b.onclick=()=>{selectedAdventure=b.dataset.adventure;render()})
}
function renderDetail(){
  const root=$('#questJournalDetail'),side=$('#questJournalSide');if(!root||!side)return;
  const visible=cardsForSelectedTab();
  if(!selectedAdventure||!visible.some(x=>x.id===selectedAdventure)){
    root.innerHTML='<div class="quest-list-empty">'+(selectedTab==='completed'?'Select a completed quest to review its story and rewards.':selectedTab==='active'?'No active quest selected. Completed quests are available from the Completed tab.':'Select an adventure to view its details.')+'</div>';
    side.innerHTML='';return
  }
  if(selectedAdventure==='null-complex-quest'){renderNullQuestDetail(root,side);bindActions();return}
  if(selectedAdventure==='ashfall'){renderAshfallDetail(root,side);bindActions();return}
  if(String(selectedAdventure).startsWith('class-trial:')){const t=classTrialDefs().find(x=>x.key===selectedAdventure);if(t){renderClassTrialDetail(t,root,side);return}}
  if(selectedAdventure==='thirteenth-bell'){window.CellboundThirteenthBell?.renderDetail?.(root,side);return}
  if(selectedAdventure==='fourfold-lock'){window.CellboundFourfoldLock?.renderDetail?.(root,side);return}
  if(selectedAdventure==='no-way-back'){window.CellboundNoWayBack?.renderDetail?.(root,side);return}
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
  $('[data-nullquest-start]')?.addEventListener('click',startNullQuest);$('[data-nullquest-play]')?.addEventListener('click',playNullQuest);$('[data-nullquest-open-activity]')?.addEventListener('click',()=>Game.switchView?.('world'));
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
  const q=ensure(),a=q.ashfall,stage=currentStage();let title='',button='OPEN ADVENTURE →',jump='quests',small='CURRENT ADVENTURE',homeAdventure=selectedAdventure;
  const bellHome=window.CellboundThirteenthBell?.homeState?.(),fourfoldHome=window.CellboundFourfoldLock?.homeState?.(),noWayBackHome=window.CellboundNoWayBack?.homeState?.();
  if(noWayBackHome?.active){title=noWayBackHome.title;button='OPEN NO WAY BACK →';small=noWayBackHome.small||'RAID ATTUNEMENT';homeAdventure='no-way-back'}
  else if(bellHome?.active){title=bellHome.title;button='OPEN GREYWAKE →';small=bellHome.small||'CURRENT ADVENTURE';homeAdventure='thirteenth-bell'}
  else if(fourfoldHome?.active){title=fourfoldHome.title;button='OPEN THE FOURFOLD LOCK →';small=fourfoldHome.small||'CURRENT ADVENTURE';homeAdventure='fourfold-lock'}
  else if(!a.complete){title=a.started?ashfallDef(ashfallStage()).objective:'Warden Elara needs your guild on the east road.';homeAdventure=homeAdventure||'ashfall'}
  else if(!complete()){
    if(!echoesUnlocked()){small='NEXT ADVENTURE';title='Grow stronger in The Ashen Vault or reach average party Level 3 to continue the story.'}
    else if(q.started){title=stageDef(stage).objective;if(stage==='vault'){button='OPEN DUNGEON →';jump='content'}}
    else title='A glass-sealed letter from Bram Kel begins the road toward your next dungeon.';
  }else{small='ADVENTURE COMPLETE';title='The Hollow Sanctum is open beneath Zeltira.';button='VIEW DUNGEON →';jump='content'}
  const homeDungeon=jump==='content'?(complete()?'hollow-sanctum':'ashen-vault'):'';
  if(homeDungeon)root.dataset.dungeonArt=homeDungeon;else delete root.dataset.dungeonArt;
  root.innerHTML='<span>'+small+'</span><b>'+esc(title)+'</b><button data-quest-home>'+button+'</button>';
  root.querySelector('[data-quest-home]').onclick=()=>{
    if(jump==='quests'&&homeAdventure)selectedAdventure=homeAdventure;
    Game.switchView?.(jump);
    if(jump==='content'){
      const dungeon=complete()?'hollow-sanctum':'ashen-vault';
      setTimeout(()=>window.CellboundDungeonBrowser?.open?.(dungeon),40)
    }
  };
  if(badge){const bell=window.CellboundThirteenthBell?.card?.(),fourfold=window.CellboundFourfoldLock?.card?.(),nwb=window.CellboundNoWayBack?.card?.(),open=(!a.complete?1:0)+(!complete()&&echoesUnlocked()?1:0)+(bell&&!bell.complete&&!bell.locked?1:0)+(fourfold&&!fourfold.complete&&!fourfold.locked?1:0)+(nwb&&!nwb.complete&&!nwb.locked?1:0)+classTrialDefs().filter(classTrialAvailable).length;badge.textContent=open?String(open):'';badge.hidden=!open}
}
function render(){
  if(!Game?.ready)return;const q=ensure();if(!q)return;
  $$('.quest-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.questTab===selectedTab));
  const bellCard=window.CellboundThirteenthBell?.card?.(),fourfoldCard=window.CellboundFourfoldLock?.card?.(),nwbCard=window.CellboundNoWayBack?.card?.(),classActive=classTrialDefs().filter(classTrialAvailable).length,activeCount=(q.ashfall.complete?0:1)+(complete()?0:1)+(bellCard&&!bellCard.complete&&!bellCard.locked?1:0)+(fourfoldCard&&!fourfoldCard.complete&&!fourfoldCard.locked?1:0)+(nwbCard&&!nwbCard.complete&&!nwbCard.locked?1:0)+classActive;
  const status=$('#questCampaignStatus');if(status)status.textContent=activeCount?activeCount+' ADVENTURE'+(activeCount===1?'':'S')+' IN PROGRESS':'CURRENT STORY COMPLETE';
  renderList();renderDetail();renderHome();window.CellboundHollowSanctum?.renderCard?.();
}
function bind(){
  $$('.quest-tabs [data-quest-tab]').forEach(b=>b.addEventListener('click',()=>{selectedTab=b.dataset.questTab;render()}));
  document.querySelector('.nav-btn[data-view="quests"]')?.addEventListener('click',render);
  window.addEventListener('cellbound:dungeon-complete',e=>checkAshenProgress(e.detail||{}));
  window.addEventListener('cellbound:hollow-complete',render);
  window.addEventListener('cellbound:fourfold-update',render);
  window.addEventListener('cellbound:no-way-back-update',render);
}
async function checkHistory(){if(currentStage()==='vault'&&latestAshenClear())await checkAshenProgress(null)}
function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}
  const q=ensure();if(q.started&&!complete())selectedAdventure='echoes';else if(q.ashfall?.complete&&echoesUnlocked())selectedAdventure='echoes';bind();render();checkHistory();setInterval(checkHistory,2500);
  window.CellboundQuests={render,ensure,startAshfall,beginInvestigation,runQuest2DFight,runInteractiveQuest2DFight,selectAdventure:id=>{selectedAdventure=String(id||selectedAdventure);render()},isHollowUnlocked:()=>Boolean(ensure()?.flags?.hollowSanctumUnlocked),isNullComplexUnlocked:()=>Boolean(ensure()?.nullComplex?.complete||state()?.progression?.nullComplexUnlocked)};
}
init();
})();