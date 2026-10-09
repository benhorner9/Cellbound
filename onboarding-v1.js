(()=>{
'use strict';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clone=x=>JSON.parse(JSON.stringify(x));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const RACES=[
  {id:'Veyren',icon:'◇',roles:['tank','healer','dps'],trait:'Adaptable',lore:'Born around the old trade roads, Veyren can answer almost any calling.'},
  {id:'Stoneborn',icon:'⬡',roles:['tank','healer','dps'],trait:'Unyielding',lore:'Broad-framed descendants of the mountain holds, renowned for endurance and force.'},
  {id:'Aelari',icon:'✧',roles:['tank','healer','dps'],trait:'Soul Attuned',lore:'Aelari sense the movement of Cells more clearly than most and favour precise magic.'},
  {id:'Thornkin',icon:'❈',roles:['tank','healer','dps'],trait:'Living Guard',lore:'Root-bound clans whose natural resilience makes them steadfast protectors and restorers.'},
  {id:'Emberkin',icon:'◆',roles:['tank','healer','dps'],trait:'Fierce Blood',lore:'Heat-marked wanderers who favour direct pressure, steel and destructive spellcraft.'},
  {id:'Nymari',icon:'✦',roles:['tank','healer','dps'],trait:'Quickmind',lore:'Restless scholars and scouts with a talent for support, ranged combat and arcane study.'}
];
const NAMES={
  Veyren:['Aren Vale','Tessa Renn','Corin Hale','Mira Venn','Joren Pell','Sera Noll','Kalen Voss','Lysa Arden','Theron Vale','Nessa Rell'],
  Stoneborn:['Bram Korr','Dara Flint','Hald Brenn','Kessa Dorn','Torren Crag','Mara Keld','Orik Stone','Vela Marr','Dain Rusk','Brynn Forge'],
  Aelari:['Aeris Lume','Selene Var','Ilyra Sen','Cael Eryn','Nyra Vale','Elion Sor','Tarin Lys','Veya Sol','Areni Pell','Sorin Rae'],
  Thornkin:['Briar Fen','Rowan Moss','Ashen Reed','Willow Tarn','Thorne Vale','Iris Root','Merrin Grove','Sable Fern','Alder Wren','Linden Marsh'],
  Emberkin:['Kael Pyre','Rhea Ash','Doran Cinder','Vessa Flare','Korin Brand','Tala Ember','Renn Scorch','Mira Coal','Varik Red','Sera Fenn'],
  Nymari:['Ori Quill','Nima Voss','Tali Renn','Perrin Vox','Lumi Pell','Caro Venn','Sena Vale','Rian Noll','Meri Quill','Tovin Rae']
};
const SLOTS=[
  {key:'tank',role:'tank',label:'Tank',number:''},
  {key:'healer',role:'healer',label:'Healer',number:''},
  {key:'dps1',role:'dps',label:'Damage',number:'1'},
  {key:'dps2',role:'dps',label:'Damage',number:'2'},
  {key:'dps3',role:'dps',label:'Damage',number:'3'}
];
const ROLE_LABEL={tank:'Tank',healer:'Healer',dps:'Damage'};
let Game=null,G=null,P=null,CP=null,db=null,user=null;
let draft=[],activeSlot=0,builderStep='race',tutorialComicBusy=false;

const state=()=>Game?.getState?.();
const onboarding=()=>state()?.onboarding||{};
const raceById=id=>RACES.find(r=>r.id===id)||RACES[0];
const portraitHTML=(c,size='md')=>CP?.portraitHTML?.(c,{size})||'<span class="cb-portrait cb-portrait--'+size+'"><b>'+esc(c?.portrait||initials(c?.name))+'</b></span>';

function roleOptions(role){
  const out=[];
  Object.entries(Game?.classes||{}).forEach(([klass,data])=>{
    if(Game?.isBetaClassPlayable&&!Game.isBetaClassPlayable(klass))return;
    const match=Object.entries(data.specs||{}).find(([,specData])=>specData.role===role);
    if(!match)return;
    const [spec]=match;
    out.push({klass,spec,icon:data.icon,glow:data.glow});
  });
  return out;
}
function randomName(race,exclude=[]){
  const pool=NAMES[race]||NAMES.Veyren,used=new Set(exclude.map(x=>String(x).toLowerCase()));
  const free=pool.filter(n=>!used.has(n.toLowerCase()));
  return (free.length?free:pool)[Math.floor(Math.random()*(free.length?free.length:pool.length))];
}
function initials(name){
  return String(name||'??').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'??';
}
function defaultDraft(){
  const rows=[];
  SLOTS.forEach((slot,i)=>{
    const race=RACES.find(r=>r.roles.includes(slot.role))||RACES[0];
    const option=roleOptions(slot.role)[0];
        const name=randomName(race.id,rows.map(x=>x.name));
    rows.push({slot:slot.key,role:slot.role,race:race.id,klass:option?.klass||'Warrior',spec:option?.spec||'Arms',name,appearance:CP?.randomAppearance?.(race.id)||{race:race.id}});
  });
  return rows;
}
function restoreDraft(){
  const saved=onboarding().draft;
  if(Array.isArray(saved)&&saved.length===5){
    draft=saved.map((d,i)=>{
      const slot=SLOTS[i],race=RACES.some(r=>r.id===d.race&&r.roles.includes(slot.role))?d.race:(RACES.find(r=>r.roles.includes(slot.role))?.id||'Veyren');
      const opts=roleOptions(slot.role),valid=opts.find(o=>o.klass===d.klass)||opts[0];
      const name=String(d.name||randomName(race)).slice(0,24);return{slot:slot.key,role:slot.role,race,klass:valid?.klass||'Warrior',spec:valid?.spec||'Arms',name,appearance:CP?.normalizeAppearance?.(d.appearance,name,race)||d.appearance||{race}};
    });
  }else draft=defaultDraft();
}
function saveDraft(){
  const s=state();if(!s)return;
  s.onboarding=s.onboarding||{version:3,complete:false,stage:'party-builder',zone:'zeltira'};
  s.onboarding.draft=clone(draft);Game.save();
}
function ensureRoot(){
  let root=$('#cellboundOnboarding');
  if(root)return root;
  root=document.createElement('div');root.id='cellboundOnboarding';root.className='onboard-root';root.hidden=true;document.body.appendChild(root);return root;
}
function stageTitle(stage){
  const labels={
    'party-builder':'Build Your Party',
    'zeltira-arrival':'The Gate at Dusk',
    'first-expedition':'The First Resonance',
    'gear':'Arm the Five',
    'dungeon-briefing':'Below Zeltira',
    'dungeon-running':'The Zeltiran Hollows',
    'loot-review':'What the Warden Kept',
    'recovery-lesson':'The Cost of Failure',
    'profession-choice':'Use What You Found',
    'craft':'Your First Craft',
    'profession-use':'Prepare the Party',
    'quest-lesson':'The East Road',
    'departure':'Your First Contract'
  };
  return labels[stage]||'Zeltira';
}
function chrome(body,stage){
  const steps=[
    ['party-builder','Charter'],
    ['first-expedition','Mystery'],
    ['gear','Loadout'],
    ['dungeon-briefing','Descent'],
    ['loot-review','Spoils'],
    ['quest-lesson','Contract']
  ];
  const order={'party-builder':0,'zeltira-arrival':1,'first-expedition':1,'gear':2,'dungeon-briefing':3,'dungeon-running':3,'loot-review':4,'recovery-lesson':4,'profession-choice':4,'craft':4,'profession-use':4,'quest-lesson':5,'departure':5};
  const objectives={
    'party-builder':['FORM THE FIVE','Build a Tank, Healer and three Damage adventurers.'],
    'zeltira-arrival':['WRONG NIGHT TO ARRIVE','Meet Warden Elara at Zeltira’s gate.'],
    'first-expedition':['READ THE RESONANCE','Inspect the west wall and make a field deduction.'],
    'gear':['MAKE THE LOADOUT CALL','Choose gear for the job, not just the number.'],
    'dungeon-briefing':['YOUR FIRST DESCENT','Give one order for each room; learn from the shared combat replay.'],
    'dungeon-running':['LEAD THE FIVE','Choose an order, watch the fight and read your results.'],
    'loot-review':['DECIDE WHAT THE DROP MEANS','Read, compare and assign the reward.'],
    'recovery-lesson':['FAILURE HAS A COST','Learn how Cell Shock changes the next decision.'],
    'profession-choice':['TURN LOOT INTO PREPARATION','Give one adventurer a profession.'],
    'craft':['MAKE SOMETHING USEFUL','Spend recovered reagents on your first craft.'],
    'profession-use':['PREPARE THE NEXT RUN','Use the thing you just made.'],
    'quest-lesson':['THE TRAINING WARD COMES OFF','Read your first contract and leave training behind.'],
    'departure':['CHAPTER 0 COMPLETE','Leave Zeltira with a guild that is actually yours.']
  };
  const at=order[stage]??0,obj=objectives[stage]||['FIRST EXPEDITION','Follow the trail beneath Zeltira.'];
  return '<section class="onboard-shell onboard-v4"><header class="onboard-head"><div><small>CHAPTER 0 · THE FIRST RESONANCE</small><h1>'+esc(stageTitle(stage))+'</h1></div><div class="onboard-progress">'+steps.map((x,i)=>'<span class="'+(i<at?'done':i===at?'active':'')+'"><i>'+(i+1)+'</i>'+x[1]+'</span>').join('')+'</div></header><div class="onboard-objective"><span>'+esc(obj[0])+'</span><b>'+esc(obj[1])+'</b><em>PATHFINDER WARD · TRAINING SAFETY ACTIVE</em></div>'+body+'</section>';
}
function show(){
  const root=ensureRoot();root.hidden=false;document.documentElement.dataset.onboarding='1';
}
function hide(){
  const root=ensureRoot();root.hidden=true;delete document.documentElement.dataset.onboarding;
}

function renderPartyBuilder(){
  show();restoreDraft();
  const d=draft[activeSlot],slot=SLOTS[activeSlot],availableRaces=RACES;
  const classes=roleOptions(slot.role);
  const steps=['race','class','appearance','confirm'];
  if(!steps.includes(builderStep))builderStep='race';
  const stepIndex=steps.indexOf(builderStep);
  const allValid=draft.every(x=>x.name.trim().length>=2)&&new Set(draft.map(x=>x.name.trim().toLowerCase())).size===5;
  d.appearance=CP?.normalizeAppearance?.(d.appearance,d.name||d.race,d.race)||d.appearance||{race:d.race};

  const stepNav=steps.map((step,i)=>{
    const labels={race:'Race',class:'Class',appearance:'Appearance',confirm:'Confirm'};
    const unlocked=i<=stepIndex||(step==='class'&&d.race)||(step==='appearance'&&d.klass)||(step==='confirm'&&d.appearance);
    return '<button class="creator-step '+(step===builderStep?'active':'')+' '+(i<stepIndex?'done':'')+'" data-builder-step="'+step+'" '+(unlocked?'':'disabled')+'><i>'+(i+1)+'</i><span>'+labels[step]+'</span></button>';
  }).join('');

  const portrait=portraitHTML({name:d.name,race:d.race,class:d.klass,appearance:d.appearance},'lg');
  const hero='<aside class="creator-hero">'+portrait+'<small>'+ROLE_LABEL[d.role]+' '+(slot.number||'')+'</small><h2>'+esc(d.name||'Unnamed')+'</h2><p>'+raceById(d.race).icon+' '+esc(d.race)+' · '+esc(d.klass)+'</p><div class="creator-party-dots">'+draft.map((x,i)=>'<button data-slot="'+i+'" class="'+(i===activeSlot?'active':'')+'" title="'+esc(x.name)+'">'+portraitHTML({name:x.name,race:x.race,class:x.klass,appearance:x.appearance},'sm')+'<span>'+ROLE_LABEL[x.role]+'</span></button>').join('')+'</div></aside>';

  let panel='';
  if(builderStep==='race'){
    panel='<section class="creator-panel"><header><small>STEP 1 OF 4</small><h2>Choose a race</h2><p>Choose the ancestry and passive that fits this adventurer.</p></header><div class="race-grid creator-choice-grid">'+availableRaces.map(r=>{const identity=window.CellboundIdentities?.getRace?.(r.id);return '<button class="race-card '+(d.race===r.id?'active':'')+'" data-race="'+r.id+'"><strong>'+r.icon+'</strong><div><b>'+r.id+'</b><small>'+r.trait+'</small><p>'+esc(identity?.strength||r.lore)+'</p></div></button>'}).join('')+'</div><footer><span></span><button class="on-primary" data-next-step="class">CONTINUE TO CLASS →</button></footer></section>';
  }else if(builderStep==='class'){
    panel='<section class="creator-panel"><header><small>STEP 2 OF 4</small><h2>Choose a class</h2><p>Choose the class for this '+ROLE_LABEL[slot.role].toLowerCase()+'. Talent paths are chosen later in the game.</p></header><div class="class-grid creator-choice-grid">'+classes.map(o=>{const ci=window.CellboundIdentities?.getSpec?.(o.klass,o.spec);return '<button class="class-choice '+(d.klass===o.klass?'active':'')+'" data-class="'+o.klass+'" data-spec="'+o.spec+'" style="--class-glow:'+o.glow+'"><strong>'+o.icon+'</strong><div><b>'+o.klass+'</b><small>'+esc(ROLE_LABEL[slot.role])+' · TALENTS CHOSEN IN GAME</small><p>'+esc(ci?.strength||'Reliable in this role.')+'</p></div></button>'}).join('')+'</div><footer><button class="creator-back" data-prev-step="race"><span class="creator-back-arrow">←</span><span>BACK TO RACE</span></button><button class="on-primary" data-next-step="appearance">CONTINUE TO APPEARANCE →</button></footer></section>';
  }else if(builderStep==='appearance'){
    const appearanceEditor=CP?.editorHTML?.(d.appearance,{characterClass:d.klass,name:d.name,race:d.race})||'';
    panel='<section class="creator-panel creator-appearance"><header><small>STEP 3 OF 4</small><h2>Appearance</h2><p>Shape the face you will recognise throughout Cellbound.</p></header><div class="creator-editor">'+appearanceEditor+'</div><footer><button class="creator-back" data-prev-step="class"><span class="creator-back-arrow">←</span><span>BACK TO CLASS</span></button><button class="on-primary" data-next-step="confirm">CONTINUE TO CONFIRM →</button></footer></section>';
  }else{
    const formation=draft.map((x,i)=>'<button class="creator-confirm-member '+(i===activeSlot?'active':'')+'" data-slot="'+i+'">'+portraitHTML({name:x.name,race:x.race,class:x.klass,appearance:x.appearance},'sm')+'<span><small>'+ROLE_LABEL[x.role]+' '+(SLOTS[i].number||'')+'</small><b>'+esc(x.name||'Unnamed')+'</b><em>'+esc(x.race)+' · '+esc(x.klass)+'</em></span></button>').join('');
    panel='<section class="creator-panel creator-confirm"><header><small>STEP 4 OF 4</small><h2>Confirm your party</h2><p>Name this adventurer, then check all five before entering Zeltira.</p></header><div class="name-builder creator-name"><input id="onboardName" maxlength="24" value="'+esc(d.name)+'" autocomplete="off" placeholder="Adventurer name"><button id="randomiseName">RANDOMISE</button></div><div class="creator-confirm-grid">'+formation+'</div><footer><button class="creator-back" data-prev-step="appearance"><span class="creator-back-arrow">←</span><span>BACK TO APPEARANCE</span></button><button id="confirmParty" class="on-primary" '+(allValid?'':'disabled')+'>CONFIRM PARTY & ENTER ZELTIRA →</button></footer><p class="builder-hint">'+(allValid?'Your charter is ready.':'All five characters need unique names of at least 2 characters.')+'</p></section>';
  }

  const body='<div class="character-creator"><nav class="creator-steps">'+stepNav+'</nav><div class="creator-stage">'+hero+'<main>'+panel+'</main></div></div>';
  const root=ensureRoot();root.innerHTML=chrome(body,'party-builder');

  root.querySelectorAll('[data-builder-step]').forEach(btn=>btn.onclick=()=>{if(!btn.disabled){builderStep=btn.dataset.builderStep;renderPartyBuilder()}});
  root.querySelectorAll('[data-next-step]').forEach(btn=>btn.onclick=()=>{builderStep=btn.dataset.nextStep;renderPartyBuilder()});
  root.querySelectorAll('[data-prev-step]').forEach(btn=>btn.onclick=()=>{builderStep=btn.dataset.prevStep;renderPartyBuilder()});
  root.querySelectorAll('[data-slot]').forEach(btn=>btn.onclick=()=>{activeSlot=Number(btn.dataset.slot);builderStep='race';renderPartyBuilder()});
  root.querySelectorAll('[data-race]').forEach(btn=>btn.onclick=()=>{d.race=btn.dataset.race;d.name=randomName(d.race,draft.filter((_,i)=>i!==activeSlot).map(x=>x.name));d.appearance=CP?.randomAppearance?.(d.race)||{race:d.race};saveDraft();renderPartyBuilder()});
  root.querySelectorAll('[data-class]').forEach(btn=>btn.onclick=()=>{d.klass=btn.dataset.class;d.spec=btn.dataset.spec;saveDraft();renderPartyBuilder()});
  const input=$('#onboardName');
  if(input)input.oninput=e=>{d.name=e.target.value;saveDraft();const btn=$('#confirmParty');if(btn)btn.disabled=!(draft.every(x=>x.name.trim().length>=2)&&new Set(draft.map(x=>x.name.trim().toLowerCase())).size===5)};
  $('#randomiseName')?.addEventListener('click',()=>{d.name=randomName(d.race,draft.filter((_,i)=>i!==activeSlot).map(x=>x.name));saveDraft();renderPartyBuilder()});
  if(builderStep==='appearance')CP?.bindEditor?.(root,d.appearance,()=>{saveDraft();renderPartyBuilder()},{characterClass:d.klass,name:d.name,race:d.race});
  $('#confirmParty')?.addEventListener('click',createParty);
}
function emptyEquipment(){
  return{Head:null,Chest:null,Weapon:null,Shoulders:null,Hands:null,Waist:null,Legs:null,Feet:null,OffHand:null,Ring1:null,Ring2:null,Trinket1:null,Trinket2:null,Relic:null};
}
function uid(){
  if(globalThis.crypto?.randomUUID)return'party-'+crypto.randomUUID();
  return'party-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
}
function combatStyle(klass){
  if(['Mage','Priest','Druid'].includes(klass))return'magic';
  if(klass==='Hunter')return'ranged';
  return'melee';
}
async function syncPartyCharacters(roster){
  if(!db||!user)return;
  const del=await db.from('characters').delete().eq('user_id',user.id);
  if(del.error){console.warn('Could not clear onboarding character records',del.error);return}
  const rows=roster.map((c,i)=>({
    user_id:user.id,name:c.name,combat_style:combatStyle(c.class),tutorial_complete:false,creation_complete:true,
    appearance:{...(c.appearance||{}),race:c.race,class:c.class,spec:c.spec,role:c.role,party_slot:i},
    level:1,xp:0,current_hp:100,max_hp:100,current_location:'zeltira',tutorial_stage:'arrived_zeltira',tutorial_reward_claimed:false,last_played_at:new Date().toISOString()
  }));
  const ins=await db.from('characters').insert(rows);
  if(ins.error)console.warn('Could not sync onboarding character records',ins.error);
}
async function createParty(){
  const names=draft.map(x=>x.name.trim());
  if(names.some(x=>x.length<2)||new Set(names.map(x=>x.toLowerCase())).size!==5)return;
  const safeDraft=draft.map((d,i)=>{
    const slot=SLOTS[i],options=roleOptions(slot.role),valid=options.find(o=>o.klass===d.klass&&o.spec===d.spec)||options.find(o=>o.klass===d.klass)||options[0];
    if(!valid)throw new Error('No beta-playable class is available for '+slot.role);
    return{...d,klass:valid.klass,spec:valid.spec,role:slot.role};
  });
  draft=safeDraft;saveDraft();
  const ids=safeDraft.map(()=>uid());
  const roster=safeDraft.map((d,i)=>({
    id:ids[i],name:d.name.trim(),race:d.race,raceTrait:raceById(d.race).trait,class:d.klass,spec:d.spec,role:d.role,
    level:1,xp:0,power:d.role==='tank'?30:d.role==='healer'?27:29,talent:1,portrait:initials(d.name),appearance:CP?.normalizeAppearance?.(d.appearance,d.name,d.race)||d.appearance,
    knowledge:{ashwarden:0,embermaw:0,vaultheart:0},equipment:emptyEquipment(),gearItems:['Empty','Empty','Empty'],
    cellShock:0,cellShockLockedUntil:null,professions:[null],tutorialNew:true,onboardingGearIssued:false
  }));
  const s=state();
  s.roster=roster;s.party={tank:ids[0],healer:ids[1],dps:ids.slice(2,5)};
  s.renown=0;s.gold=250;s.bank=[];s.materials={};s.consumables=[];s.recipeScrolls=[];s.discoveredRecipes=[];s.tradeInbox=[];s.collectionHistory=[];s.reports=[];s.bossKills={ashwarden:false,embermaw:false,vaultheart:false};s.progression={ashenVaultUnlocked:false};s.questSystem=null;
  s.activity=['Your first party has been formed.','The road to Zeltira is open.'];
  s.onboarding={version:3,complete:false,stage:'zeltira-arrival',zone:'zeltira',startedAt:s.onboarding?.startedAt||new Date().toISOString(),partyCreatedAt:new Date().toISOString(),firstExpeditionClues:[]};
  Game.replaceState(clone(s));await Game.persistState();await syncPartyCharacters(roster);render();
  window.CellboundFX?.story?.('The Gate at Dusk','Five names are on the charter. Zeltira is waiting.',{eyebrow:'WELCOME TO CELLBOUND',tone:'story',duration:1600,particles:true});
}

function partySummary(){
  return state().roster.map(c=>'<div class="z-party-member">'+portraitHTML(c,'sm')+'<span><b>'+esc(c.name)+'</b><small>'+raceById(c.race).icon+' '+esc(c.race)+' · '+esc(c.class)+' '+esc(c.spec)+'</small></span></div>').join('');
}
const TUTORIAL_COMIC_ART={
  arrival:['wardens_at_the_twilight_city_gate.webp','dawn_briefing_on_the_ash_road.webp','moonlit_ruins_and_the_glowing_wardstone.webp'],
  'west-wall':['moonlit_ruins_and_the_glowing_wardstone.webp','warden_s_descent_into_the_ruins.webp','arcane_overload_a_warden_s_lesson.webp'],
  gear:['the_quartermaster_s_choice.webp','the_warden_and_the_arcane_diadem.webp','arcane_forge_beneath_the_twilight_citadel.webp'],
  hollows:['warden_s_descent_into_the_ruins.webp','moonlit_ruins_and_the_glowing_wardstone.webp','arcane_overload_a_warden_s_lesson.webp'],
  loot:['the_warden_and_the_arcane_diadem.webp','the_quartermaster_s_choice.webp','arcane_forge_beneath_the_twilight_citadel.webp'],
  shock:['arcane_overload_a_warden_s_lesson.webp','moonlit_ruins_and_the_glowing_wardstone.webp','the_warden_and_the_arcane_diadem.webp'],
  craft:['arcane_forge_beneath_the_twilight_citadel.webp','the_quartermaster_s_choice.webp','the_warden_and_the_arcane_diadem.webp'],
  contract:['dawn_briefing_on_the_ash_road.webp','wardens_at_the_twilight_city_gate.webp','dawn_departure_from_zeltira_citadel.webp'],
  departure:['dawn_departure_from_zeltira_citadel.webp','dawn_briefing_on_the_ash_road.webp','wardens_at_the_twilight_city_gate.webp']
};
// Three readable story beats per scene. Art paths are assigned separately so
// writers and illustrators can revise one frame without altering progression.
const TUTORIAL_STORY_COPY={
 arrival:{
  line:'Five on a new charter? Then your timing is terrible. Come and see what woke up.',
  frames:[
   ['No quiet night in Zeltira','The outer gate stays open as wardens hurry people away from the western streets.'],
   ['Elara has a job for you','The Cell Well flashed twice. No one has been able to explain the second pulse.'],
   ['Something answered','A stone buried beneath the west wall glows for the first time in generations.']
  ]
 },
 'west-wall':{
  line:'Look carefully. I need a reason to send people below my city, not a rumour.',
  frames:[
   ['The street is empty','A drained patrol lantern lies beside the old wall. Its oil has not burned.'],
   ['Roots flee the crack','Pale roots have pushed through fresh stone, bending away from whatever lies below.'],
   ['The ward points down','A carved line flickers toward the sealed steps into the Zeltiran Hollows.']
  ]
 },
 gear:{
  line:'Same Item Level. Different rolls. Which one keeps your front line standing?',
  frames:[
   ['The Quartermaster’s counter','Two weapons are waiting, close enough in quality to fool a hurried buyer.'],
   ['Power is not the whole story','The bonus stats tell a different story. Read them before choosing.'],
   ['Five people. Five jobs.','The right item depends on who carries it, not just the number engraved on it.']
  ]
 },
 hollows:{
  line:'You lead. They fight. Watch what your orders do when the room fights back.',
  frames:[
   ['The descent opens','Elara holds the Pathfinder ward as your five head into the root-covered stone.'],
   ['First comes control','The Rootlings will test your opening order. Your Tank needs room to take threat.'],
   ['Then comes judgement','The Gallery will test interrupts. The Warden below will test movement and survival.']
  ]
 },
 loot:{
  line:'Bring the relic home. Then decide who should actually wear it.',
  frames:[
   ['The Warden falls silent','A relic lies tangled in the roots, still carrying a trace of Cell light.'],
   ['Look past the name','Two copies of the same item may carry different stats. Read the roll.'],
   ['The Bank belongs to the guild','Nothing has equipped itself. Choose the adventurer who gains most from the drop.']
  ]
 },
 shock:{
  line:'The training ward caught this defeat. Outside these walls, recovery costs time.',
  frames:[
   ['The ward pulls the five clear','A failed run ends before permanent harm, but not every consequence disappears.'],
   ['The Cell mark bears the strain','Each wipe adds shock. At one hundred per cent, that adventurer must recover.'],
   ['A guild learns to regroup','Wait out the recovery, prepare better, or rotate an available character into the party.']
  ]
 },
 craft:{
  line:'See these scraps? They are the start of your next advantage.',
  frames:[
   ['Nothing from the Hollows is wasted','Recovered Cell fragments and iron reach the Craft Row workbench.'],
   ['Every adventurer learns one trade','The Craftmaster shows how profession recipes turn materials into useful preparations.'],
   ['Make something worth carrying','An enhancement, flask or potion can change the next fight, but it will not last forever.']
  ]
 },
 contract:{
  line:'Three carts gone missing. Same road. Same night. The ash is what worries me.',
  frames:[
   ['An east-gate report at dawn','Elara unrolls three missing-cart reports before the city is fully awake.'],
   ['Ash where it should not be','Furnace dust lies in the ruts. The nearest forge has been cold for eighteen years.'],
   ['A real contract','Follow the road, find the missing cargo and discover why the old forge has stirred.']
  ]
 },
 departure:{
  line:'The ward stays here. The charter and the choices are yours now.',
  frames:[
   ['The eastern gates open','Morning light falls over a city that has already given your new guild a story.'],
   ['The five fall into formation','Each adventurer has a job, equipment and a reason to trust the others.'],
   ['Beyond the training road','The trail leads toward missing carts, a sealed forge and whatever waits past it.']
  ]
 }
};
function tutorialComicConfig(id){
  const roster=state()?.roster||[],lead=roster[0],leadName=lead?.name||'your charter';
  const scenes={
    arrival:{
      theme:'zeltira',eyebrow:'CELLBOUND · FIRST EXPEDITION',title:'The Gate at Dusk',subtitle:'Zeltira · Outer Gate',page:'I · ARRIVAL',
      speaker:'Warden Elara Vey',speakerRole:'ZELTIRA PATHFINDER',speakerMark:'EV',
      line:'Five names, fresh ink. I was going to give you a quiet first night.',
      panels:[
        {kind:'location',artwork:'./assets/comics/tutorial/wardens_at_the_twilight_city_gate.webp',eyebrow:'ZELTIRA · DUSK',title:'A city that should be settling down.',text:'Instead, wardens are clearing the western streets and the Cell Well has gone strangely quiet.',icon:'◇'},
        {kind:'npc',speaker:'ELARA VEY',eyebrow:'PATHFINDER',title:'A warning at the gate',text:'The Cell Well flashed twice before sunset. Something beneath the west wall answered it.'},
        {kind:'gate',eyebrow:'WEST WALL',title:'A dead wardstone is awake.',text:'It has not answered the Cell Well in living memory.',icon:'⌁'}
      ],
      choices:[
        {id:'what-happened',icon:'?',label:'What happened at the west wall?',reply:'A wardstone woke. Patrol lanterns died. I need eyes on the scene before I send soldiers underground.'},
        {id:'why-us',icon:'◇',label:'Why send a new charter?',reply:'Because five unknowns attract less attention than twenty wardens. And because I want to know how you think before I trust you below my city.'},
        {id:'lead-on',icon:'→',label:'Show us the way.',reply:'Good. Keep your weapons sheathed until the evidence tells you otherwise.'}
      ]
    },
    'west-wall':{
      theme:'zeltira',eyebrow:'THE FIRST RESONANCE',title:'Read the Scene',subtitle:'Zeltira · West Wall',page:'II · EVIDENCE',
      speaker:'Warden Elara Vey',speakerRole:'FIELD COMMAND',speakerMark:'EV',
      line:'Do not tell me what you think is down there. Tell me what the stone is doing.',
      panels:[
        {kind:'location',artwork:'./assets/comics/tutorial/moonlit_ruins_and_the_glowing_wardstone.webp',eyebrow:'AFTER SUNSET',title:'The street is empty.',text:'Three details do not belong here. None means much alone.',icon:'☾'},
        {kind:'clue',eyebrow:'EVIDENCE',title:'Fresh fracture',text:'Pale roots grow out of a new crack — away from something below.',icon:'⌁'},
        {kind:'clue',eyebrow:'EVIDENCE',title:'Dead lantern & warm wardstone',text:'One has been drained white. The other pulses toward the Hollows.',icon:'◇'}
      ],
      choices:[
        {id:'fracture',icon:'⌁',label:'Start with the fresh fracture.',reply:'Then ask why the roots are growing away from the crack. The direction matters.'},
        {id:'lantern',icon:'◌',label:'Check the dead patrol lantern.',reply:'Good. Oil remains, but the Cell filament is empty. Something drew the energy out.'},
        {id:'ward',icon:'◇',label:'Inspect the old wardstone first.',reply:'Watch the carved line when it brightens. It is pointing somewhere.'}
      ]
    },
    gear:{
      theme:'zeltira',eyebrow:'EMERGENCY ISSUE',title:'Arm the Five',subtitle:'Zeltira · Quartermaster',page:'III · GEAR',
      speaker:'Zeltira Quartermaster',speakerRole:'GUILD SUPPLY',speakerMark:'QM',
      line:'Same Item Level does not mean same value. Read the roll before you hand steel to '+leadName+'.',
      panels:[
        {kind:'loot',artwork:'./assets/comics/tutorial/the_quartermaster_s_choice.webp',eyebrow:'QUARTERMASTER',title:'Two weapons. One decision.',text:'Both are equally advanced. Their bonus stats are not equally useful.',icon:'⚔'},
        {kind:'npc',eyebrow:'THE LESSON',title:'Item Level tells you power.',text:'The stat roll tells you who actually wants the item.'},
        {kind:'clue',eyebrow:'YOUR FRONT LINE',title:leadName,text:'Choose the roll that supports what your Tank is trying to do.',icon:'◆'}
      ],
      choices:[
        {id:'explain-rolls',icon:'?',label:'Explain the difference in rolls.',reply:'Threat, Block, Stamina and Armour help a Tank do the job. A different spec may chase entirely different stats.'},
        {id:'show-tank',icon:'◆',label:'Show me what our Tank needs.',reply:'Read the role first, then the stat line. That habit will matter when the same dungeon item drops with a different roll.'},
        {id:'we-choose',icon:'⚔',label:'Put them on the counter. We will choose.',reply:'That is the point. I issue equipment. Your guild decides what is worth wearing.'}
      ]
    },
    hollows:{
      theme:'zeltira',eyebrow:'FIRST EXPEDITION',title:'Below Zeltira',subtitle:'The Zeltiran Hollows',page:'IV · DESCENT',
      speaker:'Warden Elara Vey',speakerRole:'LAST WORD',speakerMark:'EV',
      line:'The Pathfinder ward can pull you out if all five fall. It cannot make good decisions for you.',
      panels:[
        {kind:'gate',artwork:'./assets/comics/tutorial/warden_s_descent_into_the_ruins.webp',eyebrow:'SEALED DESCENT',title:'The resonance ends underground.',text:'Roots press through masonry older than modern Zeltira.',icon:'▽'},
        {kind:'npc',eyebrow:'ELARA',title:'Watch the party, not just the boss.',text:'Threat, healing, interrupts and movement tell you why a fight succeeds.'},
        {kind:'location',eyebrow:'THREE ENCOUNTERS',title:'Nest · Gallery · Warden',text:'The tutorial uses the same combat language as the rest of Cellbound.',icon:'⚔'}
      ],
      choices:[
        {id:'wipe',icon:'◇',label:'What happens if all five fall?',reply:'The ward extracts you this once. Outside training, failure leaves Cell Shock on everyone who went in.'},
        {id:'watch',icon:'◎',label:'What should I watch first?',reply:'Threat. If the wrong person owns the enemy, healing problems usually follow.'},
        {id:'open',icon:'▽',label:'Open the descent.',reply:'Then learn by watching. The party will show you more than another lecture will.'}
      ]
    },
    loot:{
      theme:'zeltira',eyebrow:'AFTER THE HOLLOW WARDEN',title:'What the Warden Kept',subtitle:'Zeltira · Guild Bank',page:'V · SPOILS',
      speaker:'Warden Elara Vey',speakerRole:'POST-EXPEDITION',speakerMark:'EV',
      line:'A drop is not progress until you decide what to do with it.',
      panels:[
        {kind:'loot',artwork:'./assets/comics/tutorial/the_warden_and_the_arcane_diadem.webp',eyebrow:'BOSS DROP',title:'A new item reaches the Guild Bank.',text:'Nothing equips itself. The guild owns the decision.',icon:'✦'},
        {kind:'clue',eyebrow:'RANDOM ROLLS',title:'The name can repeat. The stats can change.',text:'A future copy at the same Item Level may still be an upgrade.'},
        {kind:'location',eyebrow:'GUILD BANK',title:'Read · compare · assign',text:'Class restrictions and spec fit matter before the item leaves storage.',icon:'▦'}
      ],
      choices:[
        {id:'why-bank',icon:'▦',label:'Why does loot go to the Bank first?',reply:'Because your guild manages the roster. Drops should create decisions, not silently replace equipment.'},
        {id:'same-item',icon:'?',label:'Can the same item roll better later?',reply:'Exactly. Item Level sets the tier of power; the bonus roll gives you something worth chasing.'},
        {id:'assign',icon:'→',label:'Let us assign the drop.',reply:'Read who can equip it, then decide who benefits most.'}
      ]
    },
    shock:{
      theme:'shock',eyebrow:'THE COST OF FAILURE',title:'Cell Shock',subtitle:'Pathfinder Ward · Training Record',page:'VI · CONSEQUENCE',
      speaker:'Warden Elara Vey',speakerRole:'RECOVERY LESSON',speakerMark:'EV',
      line:'The ward spared your roster the penalty. It did not erase what failure normally costs.',
      panels:[
        {kind:'shock',artwork:'./assets/comics/tutorial/arcane_overload_a_warden_s_lesson.webp',eyebrow:'ONE WIPE',title:'25% Cell Shock',text:'Failure creates pressure instead of deleting your progress.',icon:'◇'},
        {kind:'shock',eyebrow:'PRESSURE BUILDS',title:'25 · 50 · 75 · 100',text:'At the cap, that adventurer cannot immediately go back in.'},
        {kind:'npc',eyebrow:'THE POINT',title:'Your next decision changes.',text:'Use another character, recover, or prepare better for the next attempt.'}
      ],
      choices:[
        {id:'delete',icon:'?',label:'Does a wipe delete our progress?',reply:'No. Your items and completed objectives remain. Cell Shock changes availability, not ownership.'},
        {id:'recover',icon:'◇',label:'Can Cell Shock be recovered?',reply:'Yes. Time clears it, membership shortens recovery, and rare crafted preparation can remove it.'},
        {id:'show',icon:'→',label:'Show us what reaching 100% looks like.',reply:'Watch the ward record. Your real roster will not be changed by this demonstration.'}
      ]
    },
    craft:{
      theme:'craft',eyebrow:'CRAFT ROW',title:'Use What You Found',subtitle:'Zeltira · Profession District',page:'VII · PREPARATION',
      speaker:'Zeltira Craftmaster',speakerRole:'PROFESSION TRAINING',speakerMark:'CR',
      line:'Dungeon reagents are not vendor rubbish. They become preparation for the next fight.',
      panels:[
        {kind:'craft',artwork:'./assets/comics/tutorial/arcane_forge_beneath_the_twilight_citadel.webp',eyebrow:'REAGENTS',title:'The Hollows left materials behind.',text:'Faded Cell Fragments and Zeltiran Iron are useful because professions consume them.',icon:'⚒'},
        {kind:'npc',eyebrow:'PROFESSIONS',title:'Power with an expiry date',text:'Enhancements, flasks, runes and potions complement dungeon gear rather than replacing it.'},
        {kind:'loot',eyebrow:'FIRST CRAFT',title:'Choose who learns.',text:'Profession ownership belongs to a character and persists beyond the tutorial.',icon:'⚗'}
      ],
      choices:[
        {id:'replace',icon:'?',label:'Does crafting replace dungeon gear?',reply:'No. The strongest foundation still comes from quests and dungeons. Professions prepare that gear and the people wearing it.'},
        {id:'trade',icon:'⇄',label:'Can crafted items be traded?',reply:'Many can. A useful profession can become part of the player economy as well as your own preparation.'},
        {id:'choose',icon:'⚒',label:'Let us choose a profession.',reply:'Pick the adventurer first. Then decide what job you want that character to bring to the guild.'}
      ]
    },
    contract:{
      theme:'road',eyebrow:'THE WORLD OPENS',title:'Ashes on the East Road',subtitle:'Zeltira · East Gate · Dawn',page:'VIII · CONTRACT',
      speaker:'Warden Elara Vey',speakerRole:'ZELTIRA PATHFINDER',speakerMark:'EV',
      line:'No more training contract. Three supply carts are missing, and the ash in their wheel ruts came from a forge that has been cold for eighteen years.',
      panels:[
        {kind:'location',artwork:'./assets/comics/tutorial/dawn_briefing_on_the_ash_road.webp',eyebrow:'EAST ROAD',title:'Three carts never arrived.',text:'Patrols found wreckage beyond the city as the sun came up.',icon:'♜'},
        {kind:'clue',eyebrow:'THE ODD DETAIL',title:'Furnace ash in the ruts',text:'The nearest matching forge should have been dead for eighteen years.',icon:'✦'},
        {kind:'gate',eyebrow:'YOUR FIRST REAL QUEST',title:'Ashes on the East Road',text:'Story, investigation, combat and the road toward The Ashen Vault.',icon:'→'}
      ],
      choices:[
        {id:'what-happened',icon:'?',label:'What happened to the carts?',reply:'That is what I am paying you to discover. Start with the first wreck and do not assume the obvious answer is the right one.'},
        {id:'why-ash',icon:'✦',label:'Why does the ash matter?',reply:'Because cold furnaces do not leave fresh ash. Someone is using a place the city believes abandoned.'},
        {id:'accept',icon:'⚔',label:'We will take the contract.',reply:'Then the ward comes off here. From now on, good calls and bad calls both belong to your guild.'}
      ]
    },
    departure:{
      theme:'road',eyebrow:'FIRST EXPEDITION COMPLETE',title:'Beyond Zeltira',subtitle:'Eastern Road',page:'IX · DEPARTURE',
      speaker:'Warden Elara Vey',speakerRole:'FAREWELL',speakerMark:'EV',
      line:'You have five people, a little gear and enough experience to know what can go wrong. That is more than most charters get.',
      panels:[
        {kind:'location',artwork:'./assets/comics/tutorial/dawn_departure_from_zeltira_citadel.webp',eyebrow:'DAWN',title:'The eastern gate opens.',text:'For the first time, the route ahead belongs entirely to your guild.',icon:'☼'},
        {kind:'npc',eyebrow:'ELARA',title:'No more training ward',text:'The systems you learned remain. The safety net does not.'},
        {kind:'location',eyebrow:'THE ROAD',title:'Quest · Dungeon · Raid',text:'Your first real adventure starts here.',icon:'→'}
      ],
      choices:[
        {id:'advice',icon:'?',label:'Any final advice?',reply:'Read the fight. Read the item. Read the room. Most bad outcomes tell you what you missed.'},
        {id:'failure',icon:'◇',label:'And if we fail out there?',reply:'Recover, change the plan and go again. A guild is built from what it does after the wipe.'},
        {id:'ready',icon:'→',label:'We are ready.',reply:'Then stop standing in my gate.'}
      ]
    }
  };
  const scene=scenes[id];if(!scene)return null;
  const art=TUTORIAL_COMIC_ART[id]||[],script=TUTORIAL_STORY_COPY[id];
  if(script?.line)scene.line=script.line;
  scene.panels=scene.panels.map((panel,i)=>({
    ...panel,artwork:'./assets/comics/tutorial/'+(art[i]||art[0]),
    title:script?.frames?.[i]?.[0]||panel.title,
    text:script?.frames?.[i]?.[1]||panel.text
  }));
  scene.storyOnly=true;scene.progressive=true;scene.nextLabel='NEXT PANEL →';scene.continueLabel='CONTINUE →';
  return scene;
}
function comicSeen(id){
  const s=state();return Boolean(s?.onboarding?.comicSeen?.[id])
}
function maybeTutorialComic(id){
  const config=tutorialComicConfig(id),C=window.CellboundComicScenes;
  if(!config||!C?.show||comicSeen(id)||tutorialComicBusy)return false;
  tutorialComicBusy=true;
  C.show(config).then(async result=>{
    const cur=state();if(!cur?.onboarding){tutorialComicBusy=false;return}
    cur.onboarding.comicSeen=cur.onboarding.comicSeen&&typeof cur.onboarding.comicSeen==='object'?cur.onboarding.comicSeen:{};
    cur.onboarding.dialogueChoices=cur.onboarding.dialogueChoices&&typeof cur.onboarding.dialogueChoices==='object'?cur.onboarding.dialogueChoices:{};
    cur.onboarding.comicSeen[id]=true;
    if(result?.choiceId)cur.onboarding.dialogueChoices[id]=result.choiceId;
    Game.save();await Game.persistState?.();tutorialComicBusy=false;render()
  }).catch(error=>{console.warn('Tutorial comic scene failed',id,error);tutorialComicBusy=false;const cur=state();if(cur?.onboarding){cur.onboarding.comicSeen=cur.onboarding.comicSeen||{};cur.onboarding.comicSeen[id]=true;Game.save()}render()});
  return true
}
async function previewTutorialComics(){
  const C=window.CellboundComicScenes;if(!C?.show)return false;
  const ids=['arrival','west-wall','gear','hollows','loot','shock','craft','contract','departure'];
  for(const id of ids){const cfg=tutorialComicConfig(id);if(cfg)await C.show({...cfg,eyebrow:'DEV PREVIEW · '+cfg.eyebrow})}
  return true
}
function zeltiraMap(active){
  const spots=[
    ['gate','Arrival Gate','Your charter enters Zeltira.'],
    ['resonance','West Wall','Something beneath the city answers the Cell Well.'],
    ['quartermaster','Quartermaster','Arm the five before going below.'],
    ['hollows','Zeltiran Hollows','Follow the resonance underground.'],
    ['workshop','Craft Row','Turn recovered reagents into preparation.'],
    ['road','East Road','Take the first real contract.']
  ];
  const order=['gate','resonance','quartermaster','hollows','workshop','road'],at=Math.max(0,order.indexOf(active));
  return '<div class="z-map"><img class="z-map-art" src="./assets/comics/tutorial/wardens_at_the_twilight_city_gate.webp" alt="Zeltira at dusk"><div class="z-map-shade"></div><div class="z-map-road"></div>'+spots.map((s,i)=>'<div class="z-map-node '+(i<at?'done':i===at?'active':'')+'" data-node="'+s[0]+'"><i>'+(i<at?'✓':i+1)+'</i><b>'+s[1]+'</b><small>'+s[2]+'</small></div>').join('')+'<div class="z-well">◇<span>THE CELL WELL</span></div></div>';
}
async function setStage(next,extra){
  const s=state();s.onboarding=s.onboarding||{};
  Object.assign(s.onboarding,extra||{}, {stage:next,zone:'zeltira'});
  Game.save();await Game.persistState();render();
  const moments={
    'first-expedition':['FIELD CONTRACT','The First Resonance','Read the scene. Follow what the Cell is telling you.','story'],
    'dungeon-briefing':['EXPEDITION READY','Below Zeltira','Your first real descent is waiting.','danger'],
    'loot-review':['FIRST SPOILS','What the Warden Kept','Power is only useful if you understand what dropped.','gold'],
    'recovery-lesson':['CONSEQUENCE','The Cost of Failure','Cell Shock turns a wipe into a decision that follows your party home.','danger'],
    'profession-choice':['PROFESSIONS','Craft Row','Turn recovered materials into preparation for the next fight.','cell'],
    'quest-lesson':['THE WORLD OPENS','The East Road','Dungeons are not the whole story. Follow contracts, clues and people.','story'],
    'departure':['FIRST CONTRACT','Beyond Zeltira','Your guild is ready to choose its own path.','gold']
  },m=moments[next];
  if(m)window.CellboundFX?.story?.(m[1],m[2],{eyebrow:m[0],tone:m[3],duration:1350});
}
function renderArrival(){
  if(maybeTutorialComic('arrival'))return;
  const body='<div class="zeltira-layout"><main>'+zeltiraMap('gate')+'</main><aside class="z-guide"><small>ZELTIRA · OUTER GATE</small><h2>Your charter arrives at the wrong moment.</h2><p class="guide-quote">“Five names, fresh ink. I was going to give you a quiet first night.”</p><div class="guide-name"><b>Warden Elara Vey</b><span>Zeltira Pathfinder</span></div><p>The Cell Well flashed twice before sunset. A wardstone beneath the west wall answered it. That stone has been dead longer than anyone here has been alive.</p><div class="first-expedition-hook"><span>NEW CONTRACT</span><b>The First Resonance</b><small>Inspect the west wall before whatever is below it reaches the city proper.</small></div><div class="z-party-list">'+partySummary()+'</div><button id="answerResonance" class="on-primary">GO TO THE WEST WALL →</button></aside></div>';
  ensureRoot().innerHTML=chrome(body,'zeltira-arrival');
  $('#answerResonance')?.addEventListener('click',()=>setStage('first-expedition'));
}
function renderFirstExpedition(){
  if(maybeTutorialComic('west-wall'))return;
  const s=state();s.onboarding=s.onboarding||{};
  const seen=new Set(Array.isArray(s.onboarding.firstExpeditionClues)?s.onboarding.firstExpeditionClues:[]);
  const clues=[
    {id:'fracture',icon:'⌁',title:'Fresh fracture',text:'A crack runs beneath the wall. Pale roots are growing out of it, away from something deeper underground.'},
    {id:'lantern',icon:'◌',title:'Dead patrol lantern',text:'The lantern still has oil. Its Cell filament has been drained completely white rather than burned out.'},
    {id:'ward',icon:'◇',title:'Old wardstone',text:'The stone is warm. Every few seconds its carved line brightens in the direction of the Zeltiran Hollows.'}
  ];
  const cards=clues.map(x=>'<button class="resonance-clue '+(seen.has(x.id)?'seen':'')+'" data-resonance-clue="'+x.id+'"><i>'+x.icon+'</i><span><small>'+(seen.has(x.id)?'INSPECTED':'UNKNOWN')+'</small><b>'+x.title+'</b><p>'+(seen.has(x.id)?x.text:'Inspect this part of the scene.')+'</p></span></button>').join('');
  const ready=seen.size===clues.length;
  const deduction=ready?'<section class="resonance-deduction"><small>FIELD DEDUCTION</small><h3>What connects the three signs?</h3><button data-resonance-answer="wrong">The west wall is simply failing from age.</button><button data-resonance-answer="correct">Something below Zeltira is drawing Cell energy and the wardstone is pointing toward the Hollows.</button><button data-resonance-answer="wrong">The patrol deliberately disabled the wardstone.</button><p id="resonanceHint">Elara asked for evidence, not a guess.</p></section>':'<section class="resonance-deduction locked"><small>FIELD DEDUCTION</small><h3>Inspect all three signs first.</h3><p>Nothing here is dramatic on its own. The pattern matters.</p></section>';
  const body='<div class="first-expedition-layout"><main><div class="resonance-scene"><div class="resonance-scene-head"><small>WEST WALL · AFTER SUNSET</small><h2>The First Resonance</h2><p>The street has been cleared. The Cell Well is quiet now, but the old stone beneath your feet is not.</p></div><div class="resonance-clue-grid">'+cards+'</div>'+deduction+'</div></main><aside class="z-guide"><small>WARDEN ELARA VEY</small><h2>Read the scene before you move.</h2><p class="guide-quote">“Do not tell me what you think is down there. Tell me what the stone is doing.”</p><div class="resonance-progress"><span>Evidence found</span><b>'+seen.size+' / '+clues.length+'</b><div><i style="width:'+(seen.size/clues.length*100)+'%"></i></div></div><p>Read the clues first. Your decisions guide the party in combat and on the road.</p></aside></div>';
  ensureRoot().innerHTML=chrome(body,'first-expedition');
  $$('[data-resonance-clue]').forEach(b=>b.onclick=()=>{
    const set=new Set(Array.isArray(s.onboarding.firstExpeditionClues)?s.onboarding.firstExpeditionClues:[]);
    set.add(b.dataset.resonanceClue);s.onboarding.firstExpeditionClues=[...set];Game.save();renderFirstExpedition();
  });
  $$('[data-resonance-answer]').forEach(b=>b.onclick=async()=>{
    const h=$('#resonanceHint');
    if(b.dataset.resonanceAnswer!=='correct'){if(h){h.textContent='That does not explain the drained Cell filament and the direction of the ward pulse. Try again.';h.classList.add('lesson-wrong')}return}
    if(h){h.textContent='That is enough for Elara to act on.';h.classList.remove('lesson-wrong');h.classList.add('lesson-correct')}
    $$('[data-resonance-answer]').forEach(x=>x.disabled=true);
    s.onboarding.firstResonanceSolved=true;s.activity.push('The guild traced an unexplained Cell resonance from Zeltira’s west wall toward the Hollows.');Game.save();await Game.persistState();await sleep(650);await setStage('gear');
  });
}
function renderGear(){
  if(maybeTutorialComic('gear'))return;
  const tank=state().roster.find(c=>Game.classes?.[c.class]?.specs?.[c.spec]?.role==='tank')||state().roster[0];
  const good=G.createQuestGear?.(tank,'Weapon',1,'specialist','Zeltira Training')||G.starterSet(tank.class).find(x=>x.slot==='Weapon');
  const off=G.createQuestGear?.(tank,'Weapon',1,'swift','Zeltira Training')||good;
  const stats=item=>(G.statLines?.(item)||[]).map(s=>s.text).join(' · ')||'No bonus stat';
  const body='<div class="gear-school"><main><small>ZELTIRA · QUARTERMASTER · EMERGENCY ISSUE</small><h2>Elara will not send an unarmed charter below the city.</h2><p>The Quartermaster puts two weapons on the counter. They are the <b>same Item Level</b>, but only one roll properly supports '+esc(tank.name)+' as a '+esc(tank.spec)+' '+esc(tank.class)+'. Pick what you would trust at the front of the formation.</p><div class="gear-lesson-compare"><button data-training-gear="good">'+G.artHTML(good,82)+'<span><small>ITEM LEVEL '+(good.itemLevel||22)+'</small><b>'+esc(good.name)+'</b><em>'+esc(stats(good))+'</em></span></button><button data-training-gear="off">'+G.artHTML(off,82)+'<span><small>ITEM LEVEL '+(off.itemLevel||22)+'</small><b>'+esc(off.name)+'</b><em>'+esc(stats(off))+'</em></span></button></div><div class="gear-school-rule"><b>Remember</b><span>Higher Item Level usually means more power, but two items at the same level can be very different because their bonus stats roll differently.</span></div><p id="gearLessonHint">Look for a stat that matches what your Tank is trying to do.</p></main><aside class="z-guide"><small>YOUR TANK</small><div class="gear-student"><span>'+esc(tank.portrait)+'</span><div><h3>'+esc(tank.name)+'</h3><p>'+esc(tank.race)+' · '+esc(tank.class)+' · '+esc(tank.spec)+'</p></div></div><div class="role-lessons"><div><i class="on-role tank"></i><b>Tank wants</b><span>Threat, Block, Stamina and Armour are strong tank rolls.</span></div></div><p>Item Level tells you how advanced the piece is. The roll tells you who actually wants it. You will use that distinction constantly once dungeon drops start arriving.</p></aside></div>';
  ensureRoot().innerHTML=chrome(body,'gear');
  $$('[data-training-gear]').forEach(b=>b.onclick=()=>{
    if(b.dataset.trainingGear!=='good'){
      const h=$('#gearLessonHint');if(h){h.textContent='That roll is usable, but it does not help this Tank control or survive the fight as directly. Try the other weapon.';h.classList.add('lesson-wrong')}return
    }
    issueStarterGear(good);
  });
}
async function issueStarterGear(trainingWeapon){
  const s=state(),tank=s.roster.find(c=>Game.classes?.[c.class]?.specs?.[c.spec]?.role==='tank')||s.roster[0];
  s.roster.forEach(c=>{
    const set=Game.starterEquipment(c.class);
    c.equipment={...emptyEquipment(),...clone(set)};
    if(c.id===tank.id&&trainingWeapon)c.equipment.Weapon={...clone(trainingWeapon),source:'Equipped in Zeltira'};
    c.tutorialNew=false;c.onboardingGearIssued=true;
    c.gearItems=['Head','Chest','Weapon'].map(slot=>c.equipment[slot]?.name||'Empty');
  });
  s.onboarding.equippedFirstItem=true;s.onboarding.stage='dungeon-briefing';
  s.activity.push('The Zeltira Quartermaster issued Tier 1 equipment to your party.');
  Game.replaceState(clone(s));await Game.persistState();
  if(db&&user)await db.from('characters').update({tutorial_stage:'ready_for_dungeon',last_played_at:new Date().toISOString()}).eq('user_id',user.id);
  render();
}
function renderDungeonBriefing(){
  if(maybeTutorialComic('hollows'))return;
  const roster=state().roster||[],tank=roster.find(c=>tdRole(c)==='tank'),healer=roster.find(c=>tdRole(c)==='healer');
  const body='<div class="tutorial-descent-brief">'+
    '<main class="tutorial-descent-hero"><div class="tutorial-descent-art"><img src="./assets/comics/tutorial/warden_s_descent_into_the_ruins.webp" alt=""><div></div><span>THE ZELTIRAN HOLLOWS</span><h2>The wardstone is pointing down.</h2><p>This is your first real fight in Cellbound. Set one team order per room, then watch the same combat view used by dungeons and quests.</p></div>'+
    '<div class="tutorial-route-v4"><article><i>01</i><span><small>THREAT</small><b>Rootling Nest</b><p>Call the opening pull and watch who owns the enemies.</p></span></article><article><i>02</i><span><small>INTERRUPTS</small><b>Collapsed Gallery</b><p>A dangerous cast forces you to decide what deserves attention.</p></span></article><article><i>03</i><span><small>MOVEMENT</small><b>Hollow Warden</b><p>Read real telegraphs while the party fights the boss.</p></span></article></div></main>'+
    '<aside class="tutorial-command-brief"><small>WARDEN ELARA · FIELD BRIEF</small><h2>You lead the party. The fight shows what your order changed.</h2><p class="guide-quote">“A guild master does not swing five weapons. You make the call that decides where those weapons are when it matters.”</p>'+
    '<div class="tutorial-party-check"><div><span>TANK</span><b>'+esc(tank?.name||'Your Tank')+'</b></div><div><span>HEALER</span><b>'+esc(healer?.name||'Your Healer')+'</b></div><div><span>DAMAGE</span><b>'+Math.max(0,roster.filter(c=>tdRole(c)==='dps').length)+' ready</b></div></div>'+
    '<div class="tutorial-live-contract"><strong>LIVE COMBAT</strong><span>Real positions · threat · class resources · casts · interrupts · healing · telegraphs · damage meters</span></div>'+
    '<button id="enterTutorialDungeon" class="on-primary">OPEN THE DESCENT →</button></aside></div>';
  ensureRoot().innerHTML=chrome(body,'dungeon-briefing');
  $('#enterTutorialDungeon')?.addEventListener('click',async()=>{await setStage('dungeon-running',{tutorialEncounterIndex:0,tutorialCombatReports:{},tutorialCommandChoices:{}});});
}
function tdRole(c){return Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps'}
function tutorialRebornEncounters(){
  return[
    {
      id:'rootling-nest',name:'Rootling Nest',lesson:'THREAT & FORMATION',room:'rootling-nest',kind:'trash',level:1,
      enemies:[{name:'Rootling',classification:'trash'},{name:'Rootling',classification:'trash'}],enemyHealth:118,
      ambience:'Pale roots twitch through the old masonry. Two shapes move ahead.',
      brief:'Two Rootlings are waiting in a narrow chamber. Decide how the party opens.',
      watch:'Watch the gold aggro link and the Threat Meter. The Tank should own both enemies before Damage settles in.',
      mechanics:[],
      orders:[
        {id:'tank-first',icon:'◆',title:'Tank sets the pull',copy:'Let the Tank establish threat before the rest of the party commits.',recommended:true,tactics:{pullStyle:'safe',interruptPriority:'standard',defensiveUsage:'standard',movementDiscipline:'safety'}},
        {id:'full-send',icon:'⚔',title:'Everyone opens together',copy:'Faster opening damage, but the Tank gets less time to establish control.',tactics:{pullStyle:'aggressive',interruptPriority:'standard',defensiveUsage:'standard',movementDiscipline:'balanced'}},
        {id:'healer-forward',icon:'✚',title:'Healer takes point',copy:'Keep the Tank back and let the Healer cross the room first.',tactics:{pullStyle:'normal',interruptPriority:'low',defensiveUsage:'conservative',movementDiscipline:'balanced'}}
      ]
    },
    {
      id:'collapsed-gallery',name:'Collapsed Gallery',lesson:'INTERRUPTS & TRIAGE',room:'collapsed-gallery',kind:'boss',level:1,
      enemies:[{name:'Cell-Sick Marauder',classification:'elite'}],enemyHealth:455,
      ambience:'A lone marauder is breathing Cell-light into a cracked stone mask.',
      brief:'The Marauder has a long cast called Hollow Scream. Decide what the party prioritises.',
      watch:'Keep an eye on ENEMY CAST and the interrupt events. Prevented damage is easier to manage than repaired damage.',
      mechanics:[{name:'Hollow Scream',type:'interrupt',duration:2200,priority:'critical',danger:'high'}],
      orders:[
        {id:'kick-scream',icon:'!',title:'Interrupt Hollow Scream',copy:'Damage holds an interrupt for the dangerous cast instead of tunnelling the target.',recommended:true,tactics:{pullStyle:'safe',interruptPriority:'high',interruptAssignment:'dps-rotation',defensiveUsage:'standard',movementDiscipline:'safety'}},
        {id:'heal-through',icon:'✚',title:'Heal through the scream',copy:'Leave interrupts at low priority and ask the Healer to repair the result.',tactics:{pullStyle:'normal',interruptPriority:'low',defensiveUsage:'aggressive',movementDiscipline:'balanced'}},
        {id:'burn-first',icon:'⚔',title:'Race the cast',copy:'Push maximum pressure and hope the Marauder dies before the scream matters.',tactics:{pullStyle:'aggressive',interruptPriority:'danger-only',defensiveUsage:'conservative',movementDiscipline:'balanced'}}
      ]
    },
    {
      id:'hollow-warden',name:'Hollow Warden',lesson:'BOSS TELEGRAPHS',room:'warden-chamber',kind:'boss',level:1,
      enemies:[{name:'The Hollow Warden',classification:'boss'}],enemyHealth:610,mechanicIntervalMs:3100,
      ambience:'The dead wardstone has roots wrapped around something that is still moving.',
      brief:'The Warden cleaves the front of the arena and erupts spores under the party. Set the movement rule.',
      watch:'This is the real dungeon language: visible telegraphs, facing, movement, healing pressure and class resources all at once.',
      mechanics:[
        {name:'Rootbound Cleave',type:'cone',duration:1850,danger:'high'},
        {name:'Spore Bloom',type:'circles',duration:1700,danger:'high'}
      ],
      orders:[
        {id:'safety-first',icon:'◎',title:'Tank turns it. Everyone moves.',copy:'Keep the boss facing away from the group and favour safe movement over greed.',recommended:true,tactics:{pullStyle:'safe',interruptPriority:'high',defensiveUsage:'aggressive',movementDiscipline:'safety'}},
        {id:'stack-front',icon:'▲',title:'Stack on the Tank',copy:'Keep the party tight at the front of the boss and minimise travel.',tactics:{pullStyle:'normal',interruptPriority:'standard',defensiveUsage:'standard',movementDiscipline:'balanced'}},
        {id:'greed-damage',icon:'⚔',title:'Ignore movement for damage',copy:'Commit to pressure and accept more mechanic risk.',tactics:{pullStyle:'aggressive',interruptPriority:'standard',defensiveUsage:'conservative',movementDiscipline:'balanced'}}
      ]
    }
  ]
}
function tutorialRebornRoute(){
  return tutorialRebornEncounters().map(e=>({id:e.id,title:e.name}))
}
function tutorialCommandChoice(encounter){
  const id=state()?.onboarding?.tutorialCommandChoices?.[encounter.id];
  return encounter.orders.find(x=>x.id===id)||null
}
function tutorialCombatParty(){
  return (state()?.roster||[]).map(c=>Object.assign({},c,{
    power:Math.max(Number(c.power)||1,30),
    itemLevel:Math.max(Number(Game?.characterItemLevel?.(c))||0,18),
    _combatItemLevel:Math.max(Number(Game?.characterItemLevel?.(c))||0,18),
    _combatHealthPct:100
  }))
}
function tutorialCombatReport(result,encounter,order){
  const sum=result?.summary||{},players=Array.isArray(sum.players)?sum.players:[],top=[...players].sort((a,b)=>(Number(b.damage)||0)-(Number(a.damage)||0))[0];
  const ints=sum.interrupts||{},mechs=sum.mechanics||{},mistakes=sum.mistakes||{};
  return{
    outcome:result?.outcome||'defeat',
    commandId:order?.id||null,commandHit:Boolean(order?.recommended),
    duration:Number(sum.durationSeconds)||0,deaths:Number(sum.deaths)||0,
    damage:Number(sum.totalDamage)||0,healing:Number(sum.totalHealing)||0,
    interrupts:Number(ints.success)||0,interruptAttempts:Number(ints.attempts)||0,missedInterrupts:Number(ints.missedCritical)||0,
    mechanicsAvoided:Number(mechs.avoided)||0,mechanicsFailed:Number(mechs.failed)||0,mistakes:Number(mistakes.total)||0,
    topDamage:top?.name||'—',topDamageValue:Number(top?.damage)||0,
    engine:result?.combatModel||'Combat Reborn',engineVersion:result?.engineVersion||null,
    encounterId:encounter.id
  }
}
function tutorialReportGrade(report){
  if(report.outcome!=='victory')return{tone:'danger',title:'WARD EXTRACTION',copy:'The Pathfinder ward pulled the party clear. Change the order and try the room again.'};
  if(report.deaths===0&&report.mechanicsFailed===0&&report.missedInterrupts===0)return{tone:'clean',title:'CLEAN CLEAR',copy:'The plan held. Now look at the numbers that explain why.'};
  return{tone:'scrappy',title:'SCRAPPY CLEAR',copy:'The party got through, but the report shows where the run became expensive.'}
}
async function launchTutorialRebornEncounter(index){
  const s=state(),list=tutorialRebornEncounters(),encounter=list[index],order=encounter&&tutorialCommandChoice(encounter);
  if(!s?.onboarding||!encounter||!order)return;
  const Standard=window.CellboundCombatStandard,Viewer=window.CellboundDungeon2D;
  const hint=$('#tutorialCombatHint');
  if(!Standard?.simulate||!Viewer?.playSharedEncounter){
    if(hint)hint.textContent='The live combat viewer is still loading. Try again in a moment.';
    return
  }
  const launch=$('#launchTutorialReborn');if(launch){launch.disabled=true;launch.textContent='OPENING COMBAT…'}
  const party=tutorialCombatParty(),combatEncounter={
    id:encounter.id,title:encounter.name,kind:encounter.kind,level:encounter.level,
    enemies:encounter.enemies,enemyHealth:encounter.enemyHealth,mechanics:encounter.mechanics||[],
    mechanicIntervalMs:encounter.mechanicIntervalMs||null,
    environment:{bounds:{left:7,right:93,top:9,bottom:91}}
  };
  let result;
  try{
    result=Standard.simulate({
      party,encounter:combatEncounter,tactics:{
        addPriority:'immediate',cooldownUse:'difficult',crowdControl:'disabled',
        ...order.tactics
      },seed:['zeltira-tutorial-v4',encounter.id,order.id].join(':')
    },{zone:'zeltira-first-expedition'});
  }catch(error){
    console.error('Tutorial Combat Reborn simulation failed',error);
    if(hint)hint.textContent='The fight could not start. Refresh and try this room again.';
    if(launch){launch.disabled=false;launch.textContent='ENTER LIVE COMBAT →'}
    return
  }
  if(result?.combatModel!=='Combat Reborn'){
    console.error('Tutorial combat did not return Combat Reborn',result);
    if(hint)hint.textContent='The shared combat engine did not initialise correctly.';
    if(launch){launch.disabled=false;launch.textContent='ENTER LIVE COMBAT →'}
    return
  }
  hide();
  let outcome='cancelled';
  try{
    outcome=await Viewer.playSharedEncounter({
      party,encounter:combatEncounter,result,
      header:'CHAPTER 0 · FIRST EXPEDITION',title:encounter.name,
      subtitle:'LIVE LESSON · '+encounter.lesson,
      planTitle:order.title,planCopy:encounter.watch,
      theme:'hollow',room:encounter.room,roomLabel:encounter.name,ambience:encounter.ambience,
      route:tutorialRebornRoute(),currentId:encounter.id,
      shellClass:'tutorial-reborn-shell',arenaClass:'tutorial-reborn-arena'
    });
  }catch(error){
    console.error('Tutorial shared Combat Reborn viewer failed',error);
    outcome='cancelled'
  }
  await sleep(650);
  try{Viewer.closeShared?.(true)}catch{}
  show();
  if(outcome==='cancelled'){renderDungeonRunning();return}
  const report=tutorialCombatReport(result,encounter,order);
  report.outcome=outcome==='victory'?'victory':'defeat';
  s.onboarding.tutorialCombatReports=s.onboarding.tutorialCombatReports&&typeof s.onboarding.tutorialCombatReports==='object'?s.onboarding.tutorialCombatReports:{};
  s.onboarding.tutorialCombatReports[encounter.id]=report;
  Game.save();await Game.persistState?.();renderDungeonRunning()
}
async function finishTutorialDungeonV4(){
  const s=state();if(!s?.onboarding)return;
  if(s.onboarding.tutorialDungeonComplete){s.onboarding.stage='loot-review';Game.save();await Game.persistState?.();render();return}
  s.materials['faded-cell-fragment']=(Number(s.materials['faded-cell-fragment'])||0)+4;
  s.materials['zeltiran-iron']=(Number(s.materials['zeltiran-iron'])||0)+2;
  const target=s.roster.find(x=>tdRole(x)==='dps')||s.roster[0];
  const base=(G.items||[]).find(x=>x.class===target.class&&x.tier===1&&x.slot==='Head');
  let loot=base?G.rollItemAffixes({...base,source:'Zeltiran Hollows · Hollow Warden'}):null;
  for(let tries=0;loot&&G.rollFit?.(target,loot)?.matches===0&&tries<12;tries++)loot=G.rollItemAffixes({...base,source:'Zeltiran Hollows · Hollow Warden'});
  if(loot){
    Game.addBankItem(loot);
    const bank=[...(s.bank||[])].reverse().find(x=>x.itemId===loot.itemId&&x.source==='Zeltiran Hollows · Hollow Warden');
    s.onboarding.tutorialLootBankId=bank?.id||null;s.onboarding.tutorialLootCharacterId=target.id;
  }
  s.onboarding.tutorialDungeonComplete=true;s.onboarding.stage='loot-review';
  const reports=s.onboarding.tutorialCombatReports||{},stars=tutorialRebornEncounters().filter(e=>reports[e.id]?.commandHit&&reports[e.id]?.outcome==='victory').length;
  s.onboarding.tutorialCommandStars=stars;
  s.activity.push('The First Resonance ended with the Hollow Warden’s defeat. The guild earned '+stars+'/3 command reads, a gear drop and profession reagents.');
  Game.save();await Game.persistState?.();
  if(db&&user)await db.from('characters').update({tutorial_stage:'review_loot',last_played_at:new Date().toISOString()}).eq('user_id',user.id);
  window.CellboundFX?.story?.('The Hollows are silent','First Expedition Clear',{eyebrow:'CHAPTER 0 · '+stars+'/3 COMMAND READS',tone:'gold',duration:1500});
  render()
}
function renderDungeonRunning(){
  const s=state();s.onboarding=s.onboarding||{};
  if(s.onboarding.tutorialDungeonComplete){s.onboarding.stage='loot-review';Game.save();render();return}
  const encounters=tutorialRebornEncounters();
  const index=Math.max(0,Math.min(encounters.length-1,Number(s.onboarding.tutorialEncounterIndex)||0));
  s.onboarding.tutorialEncounterIndex=index;
  s.onboarding.tutorialCombatReports=s.onboarding.tutorialCombatReports&&typeof s.onboarding.tutorialCombatReports==='object'?s.onboarding.tutorialCombatReports:{};
  s.onboarding.tutorialCommandChoices=s.onboarding.tutorialCommandChoices&&typeof s.onboarding.tutorialCommandChoices==='object'?s.onboarding.tutorialCommandChoices:{};
  const encounter=encounters[index],report=s.onboarding.tutorialCombatReports[encounter.id],selected=tutorialCommandChoice(encounter);
  const cleared=encounters.filter(e=>s.onboarding.tutorialCombatReports[e.id]?.outcome==='victory').length;
  const stars=encounters.filter(e=>s.onboarding.tutorialCombatReports[e.id]?.outcome==='victory'&&s.onboarding.tutorialCombatReports[e.id]?.commandHit).length;
  const route='<div class="tutorial-reborn-route">'+encounters.map((e,i)=>{const r=s.onboarding.tutorialCombatReports[e.id],cls=i===index?'active':r?.outcome==='victory'?'done':'';return'<div class="'+cls+'"><i>'+(r?.outcome==='victory'?'✓':i+1)+'</i><span><small>'+esc(e.lesson)+'</small><b>'+esc(e.name)+'</b></span></div>'}).join('')+'</div>';
  let content='';
  if(report){
    const grade=tutorialReportGrade(report),order=encounter.orders.find(x=>x.id===report.commandId);
    const metrics=[
      ['TIME',Math.round(report.duration)+'s'],
      ['DEATHS',String(report.deaths)],
      ['INTERRUPTS',report.interrupts+'/'+report.interruptAttempts],
      ['MECHANICS',report.mechanicsAvoided+'✓ · '+report.mechanicsFailed+'✕'],
      ['DAMAGE',Math.round(report.damage).toLocaleString()],
      ['HEALING',Math.round(report.healing).toLocaleString()]
    ];
    const lesson=report.outcome!=='victory'
      ?'The ward brought everyone out safely. Choose a different order and try again — no equipment is lost during training.'
      :report.commandHit
        ?'Good call. Compare the fight with the meters to see how your team kept control.'
        :'You won, but the safer order would have reduced the risk. Keep that in mind in tougher encounters.';
    content='<section class="tutorial-after-action '+grade.tone+'"><div class="tutorial-report-head"><div><small>AFTER ACTION</small><h2>'+esc(grade.title)+'</h2><p>'+esc(grade.copy)+'</p></div><strong class="'+(report.commandHit?'hit':'miss')+'">'+(report.commandHit?'★ COMMAND READ':'◇ RISKY CALL')+'</strong></div>'+
      '<div class="tutorial-report-command"><span>YOUR ORDER</span><b>'+esc(order?.title||'Unknown order')+'</b><p>'+esc(lesson)+'</p></div>'+
      '<div class="tutorial-report-metrics">'+metrics.map(x=>'<article><span>'+x[0]+'</span><b>'+x[1]+'</b></article>').join('')+'</div>'+
      '<div class="tutorial-report-detail"><div><span>TOP DAMAGE</span><b>'+esc(report.topDamage)+'</b><small>'+Math.round(report.topDamageValue).toLocaleString()+' damage</small></div><div><span>MISTAKES</span><b>'+report.mistakes+'</b><small>'+report.missedInterrupts+' critical interrupts missed</small></div></div>'+
      (report.outcome==='victory'
        ?'<button id="tutorialCombatContinue" class="on-primary">'+(index===encounters.length-1?'CLAIM THE WARDEN’S SPOILS →':'MOVE DEEPER →')+'</button>'
        :'<div class="tutorial-report-actions"><button id="tutorialCombatRetry" class="on-primary">CHANGE ORDER & RETRY →</button></div>')+
      '</section>';
  }else{
    content='<section class="tutorial-command-board"><div class="tutorial-command-head"><div><small>ROOM '+(index+1)+' OF '+encounters.length+' · '+esc(encounter.lesson)+'</small><h2>'+esc(encounter.name)+'</h2><p>'+esc(encounter.brief)+'</p></div><div class="tutorial-command-score"><span>ROOMS CLEARED</span><b>'+cleared+' / '+encounters.length+'</b><em>'+stars+' ★ command reads</em></div></div>'+
      '<div class="tutorial-command-watch"><i>◎</i><span><small>WATCH THIS IN THE LIVE VIEWER</small><b>'+esc(encounter.watch)+'</b></span></div>'+
      '<div class="tutorial-command-grid">'+encounter.orders.map(o=>'<button class="'+(selected?.id===o.id?'active':'')+'" data-tutorial-command="'+esc(o.id)+'"><i>'+o.icon+'</i><span><b>'+esc(o.title)+'</b><small>'+esc(o.copy)+'</small></span><em>'+(selected?.id===o.id?'ORDER SET':'SET ORDER')+'</em></button>').join('')+'</div>'+
      '<div class="tutorial-command-footer"><div><span>ENGINE</span><b>COMBAT REBORN · SHARED DUNGEON VIEWER</b><small>The shared combat engine resolves your order. Watch positioning, casts, health and movement in the same viewer used for other adventures.</small></div><button id="launchTutorialReborn" class="on-primary" '+(selected?'':'disabled')+'>ENTER LIVE COMBAT →</button></div><p id="tutorialCombatHint">'+(selected?'Order locked. Enter when ready.':'Choose an order before entering the room.')+'</p></section>';
  }
  const body='<div class="tutorial-reborn-hub">'+route+'<div class="tutorial-reborn-stage">'+content+'</div></div>';
  ensureRoot().innerHTML=chrome(body,'dungeon-running');
  $$('[data-tutorial-command]').forEach(b=>b.onclick=()=>{
    s.onboarding.tutorialCommandChoices[encounter.id]=b.dataset.tutorialCommand;Game.save();renderDungeonRunning()
  });
  $('#launchTutorialReborn')?.addEventListener('click',()=>launchTutorialRebornEncounter(index));
  $('#tutorialCombatRetry')?.addEventListener('click',()=>{
    delete s.onboarding.tutorialCombatReports[encounter.id];delete s.onboarding.tutorialCommandChoices[encounter.id];Game.save();renderDungeonRunning()
  });
  $('#tutorialCombatContinue')?.addEventListener('click',async()=>{
    if(index>=encounters.length-1){await finishTutorialDungeonV4();return}
    s.onboarding.tutorialEncounterIndex=index+1;Game.save();await Game.persistState?.();renderDungeonRunning()
  });
}
function tutorialLootItem(){
  const s=state(),id=s?.onboarding?.tutorialLootBankId;
  return (s?.bank||[]).find(x=>x.id===id)||null;
}
function renderLootReview(){
  if(maybeTutorialComic('loot'))return;
  const s=state(),item=tutorialLootItem();
  if(!item){s.onboarding.stage='recovery-lesson';s.onboarding.coreTrainingComplete=true;Game.save();render();return}
  const eligible=s.roster.filter(ch=>item.class===ch.class||item.classes==='all'||item.classes?.includes?.(ch.class));
  const stats=(G.statLines?.(item)||[]).map(x=>x.text).join(' · ')||'No bonus stats';
  const body='<div class="loot-school"><main><small>ZELTIRA · GUILD BANK</small><h2>The boss dropped an item. It does not equip itself.</h2><p>Drops are secured in the Guild Bank first. Read the roll, choose who benefits, then assign the item.</p><article class="tutorial-loot-card">'+G.artHTML(item,104)+'<div><small>'+esc(item.rarity||'GEAR')+' · '+esc(item.slot)+' · ITEM LEVEL '+(item.itemLevel||0)+'</small><h3>'+esc(item.name)+'</h3><div class="tutorial-loot-stats">'+(G.statLines?.(item)||[]).map(x=>'<span>'+esc(x.text)+'</span>').join('')+'</div><p>Dropped by the Hollow Warden · currently stored in the Guild Bank</p></div></article><div class="gear-school-rule"><b>Dungeon rolls are not fixed</b><span>If this same item drops again, its bonus stat can be different. A bad roll can be replaced later even when the Item Level is unchanged.</span></div></main><aside class="z-guide"><small>ASSIGN THE DROP</small><h2>Who should wear it?</h2><p>This item is restricted by class. The labels below compare its rolled stat against each compatible character’s current spec.</p><div class="tutorial-loot-characters">'+eligible.map(ch=>{const fit=G.rollFit?.(ch,item);return '<button data-tutorial-loot-char="'+ch.id+'"><span>'+esc(ch.portrait)+'</span><div><b>'+esc(ch.name)+'</b><small>'+esc(ch.class)+' · '+esc(ch.spec)+'</small><em class="'+esc(fit?.tone||'')+'">'+esc(fit?.label||'COMPATIBLE')+'</em></div></button>'}).join('')+'</div><p class="tutorial-roll-summary">'+esc(stats)+'</p></aside></div>';
  ensureRoot().innerHTML=chrome(body,'loot-review');
  $$('[data-tutorial-loot-char]').forEach(b=>b.onclick=()=>equipTutorialLoot(b.dataset.tutorialLootChar));
}
async function equipTutorialLoot(charId){
  const s=state(),item=tutorialLootItem(),ch=s.roster.find(x=>x.id===charId);if(!item||!ch)return;
  const old=ch.equipment?.[item.slot];
  if(old?.name)Game.addBankItem({...old,source:'Unequipped during Zeltira training'},false);
  const incoming=Game.canonicalItem?.(item)||item,{id,quantity,...equipped}=incoming;
  ch.equipment=ch.equipment||emptyEquipment();ch.equipment[item.slot]={...equipped,source:'Equipped'};
  ch.gearItems=['Head','Chest','Weapon'].map(slot=>ch.equipment[slot]?.name||'Empty');
  item.quantity=(Number(item.quantity)||1)-1;if(item.quantity<=0)s.bank=s.bank.filter(x=>x.id!==item.id);
  s.onboarding.tutorialLootEquippedTo=ch.id;s.onboarding.stage='quest-lesson';s.onboarding.coreTrainingComplete=true;
  s.activity.push(ch.name+' equipped '+item.name+' from the Zeltiran Hollows.');
  Game.save();await Game.persistState();render();
}
function renderRecoveryLesson(){
  if(maybeTutorialComic('shock'))return;
  const mins=Game.getEntitlements?.().recoveryMinutes||60,lead=state().roster.find(c=>tdRole(c)==='tank')||state().roster[0];
  const body='<div class="growth-school shock-story"><main><small>ZELTIRA · PATHFINDER WARD</small><h2>The ward saved the party from the penalty. Elara wants you to see what it absorbed.</h2><p>A failed run adds Cell Shock to every participating character. This training record does not change your roster.</p><div class="shock-simulation" id="shockSimulation"><div class="shock-sim-character"><span>'+esc(lead?.portrait||'??')+'</span><div><b>'+esc(lead?.name||'Your Tank')+'</b><small>TRAINING PROJECTION · NOT REAL SHOCK</small></div></div><div class="shock-sim-meter"><div><i id="shockSimFill" style="width:0%"></i></div><strong id="shockSimValue">0%</strong></div><p id="shockSimCopy">Run the ward record to see how repeated wipes create recovery pressure.</p><button id="runShockSimulation" class="on-primary">PLAY FAILURE RECORD →</button><button id="clearShockSimulation" class="on-primary" hidden>DISCHARGE THE WARD & CONTINUE →</button></div></main><aside class="z-guide"><small>CELL SHOCK</small><h2>Failure changes roster decisions.</h2><div class="growth-cards compact"><article><strong>25% PER WIPE</strong><b>Pressure accumulates</b><p>A failed run adds shock instead of deleting progress.</p></article><article><strong>100%</strong><b>Character unavailable</b><p>At the cap, that adventurer must recover before entering again.</p></article><article><strong>'+mins+' MIN</strong><b>Your current recovery</b><p>Recovery time depends on your account.</p></article></div><p>Failure changes your next decision without erasing progress.</p></aside></div>';
  ensureRoot().innerHTML=chrome(body,'recovery-lesson');
  $('#runShockSimulation')?.addEventListener('click',async e=>{
    e.currentTarget.disabled=true;
    const fill=$('#shockSimFill'),value=$('#shockSimValue'),copy=$('#shockSimCopy');
    const messages={25:'One wipe. The character can still enter.',50:'Two wipes. Pressure is building.',75:'Three wipes. One more failure reaches the cap.',100:'100% Cell Shock. This character would now be unavailable.'};
    for(const pct of [25,50,75,100]){
      if(fill)fill.style.width=pct+'%';if(value)value.textContent=pct+'%';if(copy)copy.textContent=messages[pct];await sleep(520)
    }
    const clear=$('#clearShockSimulation');if(clear)clear.hidden=false;
  });
  $('#clearShockSimulation')?.addEventListener('click',async()=>{
    const fill=$('#shockSimFill'),value=$('#shockSimValue'),copy=$('#shockSimCopy');if(fill)fill.style.width='0%';if(value)value.textContent='0%';if(copy)copy.textContent='Training ward discharged. Your real roster remains at its actual Cell Shock values.';
    await sleep(500);await setStage('profession-choice',{shockLessonComplete:true});
  });
}

function renderProfessionChoice(){
  if(maybeTutorialComic('craft'))return;
  const s=state(),selectedChar=s.onboarding.professionCharacterId||s.roster[0]?.id,selectedProf=s.onboarding.professionName||null;
  const chars=s.roster.map(c=>'<button class="prof-char-choice '+(c.id===selectedChar?'active':'')+'" data-prof-char="'+c.id+'"><span>'+c.portrait+'</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.race)+' · '+esc(c.class)+'</small></div></button>').join('');
  const profs=Object.entries(P.PROFESSIONS).map(([name,p])=>'<button class="prof-choice '+(name===selectedProf?'active':'')+'" data-prof="'+name+'"><strong>'+p.icon+'</strong><div><b>'+name+'</b><p>'+p.summary+'</p><small>FIRST RECIPE · '+esc(p.recipes[0].name)+'</small></div></button>').join('');
  const mats='<div class="loot-material"><i>'+(P?.materialArtHTML?P.materialArtHTML('faded-cell-fragment',34,'tutorial-material-art'):'◇')+'</i><span><b>Faded Cell Fragment ×'+(s.materials['faded-cell-fragment']||0)+'</b><small>Recovered from the Hollows</small></span></div><div class="loot-material"><i>'+(P?.materialArtHTML?P.materialArtHTML('zeltiran-iron',34,'tutorial-material-art'):'⬡')+'</i><span><b>Zeltiran Iron ×'+(s.materials['zeltiran-iron']||0)+'</b><small>Recovered from the Hollows</small></span></div>';
  const body='<div class="profession-tutorial"><aside><small>DUNGEON LOOT</small><h2>These are reagents.</h2><p>Reagents are used by professions. Professions do not replace dungeon gear — they turn dungeon drops into temporary enhancements, flasks, runes and potions that are consumed through play.</p>'+mats+'</aside><main><div class="builder-section-head"><div><small>01</small><h3>Who learns the profession?</h3></div><p>Every adventurer can learn one profession. Choose carefully — that trade becomes part of the character.</p></div><div class="prof-char-grid">'+chars+'</div><div class="builder-section-head"><div><small>02</small><h3>Choose their first profession</h3></div><p>This choice becomes part of the character and persists after the tutorial.</p></div><div class="prof-grid">'+profs+'</div><button id="confirmProfession" class="on-primary" '+(selectedChar&&selectedProf?'':'disabled')+'>LEARN '+esc(selectedProf||'A PROFESSION')+' →</button></main></div>';
  ensureRoot().innerHTML=chrome(body,'profession-choice');
  $$('[data-prof-char]').forEach(b=>b.onclick=()=>{s.onboarding.professionCharacterId=b.dataset.profChar;Game.save();renderProfessionChoice()});
  $$('[data-prof]').forEach(b=>b.onclick=()=>{s.onboarding.professionName=b.dataset.prof;Game.save();renderProfessionChoice()});
  $('#confirmProfession')?.addEventListener('click',learnTutorialProfession);
}
async function learnTutorialProfession(){
  const s=state(),c=s.roster.find(x=>x.id===s.onboarding.professionCharacterId),name=s.onboarding.professionName;
  if(!c||!P.PROFESSIONS[name])return;
  c.professions=Array.isArray(c.professions)?c.professions.slice(0,1):[null];c.professions[0]={name,level:1,xp:0};
  const recipe=P.PROFESSIONS[name].recipes?.[0];
  if(recipe&&!s.onboarding.trainingReagentsGranted){
    for(const [key,quantity] of Object.entries(recipe.inputs||{})){
      s.materials[key]=Math.max(Number(s.materials[key])||0,Number(quantity)||0);
    }
    s.onboarding.trainingReagentsGranted=true;
  }
  s.onboarding.stage='craft';s.activity.push(c.name+' learned '+name+' in Zeltira.');
  Game.save();await Game.persistState();render();
}
function recipeInputs(recipe){
  return Object.entries(recipe.inputs).map(([key,q])=>{
    const have=Number(state().materials[key])||0,m=P.MATERIALS[key];
    const art=P?.materialArtHTML?P.materialArtHTML(key,30,'tutorial-material-art'):esc(m?.icon||'◇');return '<div class="craft-input '+(have>=q?'ready':'missing')+'"><i>'+art+'</i><span><b>'+esc(m?.name||key)+'</b><small>'+have+' / '+q+' available</small></span></div>';
  }).join('');
}
function renderCraft(){
  const s=state(),c=s.roster.find(x=>x.id===s.onboarding.professionCharacterId),prof=c?.professions?.[0],def=P.PROFESSIONS[prof?.name],recipe=def?.recipes?.[0];
  if(!c||!recipe){s.onboarding.stage='profession-choice';Game.save();render();return}
  const can=Object.entries(recipe.inputs).every(([k,q])=>(Number(s.materials[k])||0)>=q);
  const body='<div class="craft-tutorial"><aside class="craft-character"><small>APPRENTICE</small><span class="craft-avatar">'+esc(c.portrait)+'</span><h2>'+esc(c.name)+'</h2><p>'+def.icon+' '+esc(prof.name)+' · Skill 1</p><div class="skill-preview"><i style="width:0%"></i></div><small>CRAFTING EARNS PROFESSION XP</small></aside><main><small>ZELTIRA · CRAFT ROW</small><h2>Craft your first preparation item.</h2><p>The craftmaster has topped up your recovered reagents for your first level 1 recipe. The result is tradeable and useful, but it will not last forever.</p><article class="tutorial-recipe"><div class="recipe-title"><strong>'+def.icon+'</strong><div><small>SKILL 1 RECIPE</small><h3>'+esc(recipe.name)+'</h3><p>'+esc(prof.name)+'</p></div></div><div class="recipe-inputs">'+recipeInputs(recipe)+'</div><div class="craft-output">'+(recipe.output.category==='consumable'&&P?.consumableArtHTML?P.consumableArtHTML(recipe.output.key,52,'tutorial-output-art'):'')+'<span>CREATES</span><b>'+esc(recipe.output.name)+' ×'+(recipe.output.quantity||1)+'</b></div><button id="craftTutorialItem" class="on-primary" '+(can?'':'disabled')+'>CRAFT '+esc(recipe.output.name).toUpperCase()+' →</button></article></main></div>';
  ensureRoot().innerHTML=chrome(body,'craft');
  $('#craftTutorialItem')?.addEventListener('click',craftTutorialItem);
}
function addTutorialConsumable(out,qty){
  const s=state(),found=s.consumables.find(x=>x.key===out.key);
  if(found)found.quantity=(found.quantity||1)+qty;
  else s.consumables.push({key:out.key,name:out.name,payload:out.payload||{},quantity:qty});
}
async function craftTutorialItem(){
  const s=state(),c=s.roster.find(x=>x.id===s.onboarding.professionCharacterId),prof=c?.professions?.[0],def=P.PROFESSIONS[prof?.name],recipe=def?.recipes?.[0];
  if(!recipe)return;
  if(!Object.entries(recipe.inputs).every(([k,q])=>(Number(s.materials[k])||0)>=q))return;
  Object.entries(recipe.inputs).forEach(([k,q])=>s.materials[k]=Math.max(0,(Number(s.materials[k])||0)-q));
  const out=recipe.output,qty=out.quantity||1;
  if(out.category==='gear'){
    const gear=G.byId(out.key)||G.byName(out.name);if(gear)for(let i=0;i<qty;i++)Game.addBankItem({...G.rollItemAffixes({...gear,source:'Crafted in Zeltira'}),source:'Crafted in Zeltira'});
  }else if(out.category==='consumable')addTutorialConsumable(out,qty);
  else if(out.category==='material')Game.addMaterial(out.key,qty);
  prof.xp=(Number(prof.xp)||0)+(recipe.xp||0);
  s.onboarding.craftedItem=out.name;s.onboarding.craftedKey=out.key;s.onboarding.stage='profession-use';s.onboarding.professionComplete=true;
  s.activity.push(c.name+' crafted '+out.name+' — a profession preparation item is ready to use.');
  Game.save();await Game.persistState();
  if(db&&user)await db.from('characters').update({tutorial_stage:'tutorial_complete',last_played_at:new Date().toISOString()}).eq('user_id',user.id);
  render();
}
function renderProfessionUse(){
  const s=state(),c=s.roster.find(x=>x.id===s.onboarding.professionCharacterId),key=s.onboarding.craftedKey,stack=s.consumables.find(x=>x.key===key),p=stack?.payload||{};
  if(!c||!stack){s.onboarding.stage='quest-lesson';Game.save();render();return}
  const bonus=P?.bonusText?.(p.bonuses)||'',charges=Number(p.charges)||3;
  let actionTitle='Pack it for the next dungeon',actionCopy=p.description||'This crafted item will be consumed through play.',button='PACK FOR ADVENTURE →';
  if(p.effect==='gear-enhancement'){actionTitle='Apply it to real equipment';actionCopy=(p.description||'')+' Another '+p.slot+' enhancement replaces the current one.';button='APPLY TO '+String(p.slot||'ITEM').toUpperCase()+' →'}
  if(p.effect==='character-flask'){actionTitle='Drink the flask';actionCopy=(p.description||'')+' Only one Flask can be active at a time.';button='DRINK FLASK →'}
  if(p.effect==='combat-potion'){actionTitle='Carry it into combat';actionCopy='Carry it into a dungeon and use it when the party is under pressure.'}
  const body='<div class="growth-school"><main><small>ZELTIRA · PROFESSION PREPARATION</small><h2>Crafting improves the gear you earn.</h2><p>Your first craft is ready to use.</p><article class="first-quest-preview"><div class="quest-preview-rune">'+(P?.consumableArtHTML?P.consumableArtHTML(stack.key,58,'tutorial-use-art'):(p.effect==='gear-enhancement'?'✥':'⚗'))+'</div><div><small>'+esc((p.effect||'CRAFTED').replaceAll('-',' ').toUpperCase())+'</small><h3>'+esc(stack.name)+'</h3><p>'+esc(actionCopy)+'</p>'+(bonus?'<b>'+esc(bonus)+'</b>':'')+'</div></article><div class="progression-teach"><div><b>1 · EARN GEAR</b><span>Quest and dungeon gear stays with you.</span></div><i>→</i><div><b>2 · PREPARE IT</b><span>Professions add temporary power for harder fights.</span></div><i>→</i><div><b>3 · CONSUME & REPLACE</b><span>Once used, you need to craft or buy another.</span></div></div></main><aside class="z-guide"><small>USE YOUR FIRST CRAFT</small><h2>'+esc(actionTitle)+'</h2><p>'+esc(p.description||'Tradeable profession preparation item.')+'</p><button id="useTutorialCraft" class="on-primary">'+button+'</button><p id="tutorialCraftUseHint">'+(p.charges?'Duration: '+charges+' boss encounters.':'Single-use combat item.')+'</p></aside></div>';
  ensureRoot().innerHTML=chrome(body,'profession-use');
  $('#useTutorialCraft')?.addEventListener('click',async()=>{
    if(p.effect==='gear-enhancement'){
      const slot=p.slot,item=c.equipment?.[slot],signature=P?.itemSignature?.(item);
      if(!item?.name||!signature){$('#tutorialCraftUseHint').textContent='This character needs an equipped '+slot+' item first.';return}
      c.activeEnhancements=c.activeEnhancements&&typeof c.activeEnhancements==='object'?c.activeEnhancements:{};
      c.activeEnhancements[slot]={key:stack.key,name:stack.name,slot,bonuses:{...(p.bonuses||{})},remainingBosses:charges,targetSignature:signature,appliedAt:new Date().toISOString()};
      stack.quantity--;if(stack.quantity<=0)s.consumables=s.consumables.filter(x=>x!==stack);
      s.activity.push(stack.name+' applied to '+c.name+'’s '+slot+' during training.');
    }else if(p.effect==='character-flask'){
      c.activeProfessionBuffs=(Array.isArray(c.activeProfessionBuffs)?c.activeProfessionBuffs:[]).filter(x=>x.kind!=='flask');
      c.activeProfessionBuffs.push({kind:'flask',key:stack.key,name:stack.name,bonuses:{...(p.bonuses||{})},remainingBosses:charges,appliedAt:new Date().toISOString()});
      stack.quantity--;if(stack.quantity<=0)s.consumables=s.consumables.filter(x=>x!==stack);
      s.activity.push(c.name+' drank '+stack.name+' during training.');
    }
    s.onboarding.stage='quest-lesson';Game.save();await Game.persistState();render();
  });
}

function renderQuestLesson(){
  if(maybeTutorialComic('contract'))return;
  const body='<div class="quest-school first-contract"><main><small>ZELTIRA · EAST GATE · DAWN</small><h2>Before the city fully wakes, Elara sends for your charter again.</h2><p>The disturbance below the west wall is over. Three supply carts on the east road are now missing. Patrols found furnace ash in the wheel ruts from a forge that has been cold for eighteen years.</p><article class="first-quest-preview"><div class="quest-preview-rune">♜</div><div><small>NOVICE · STORY ADVENTURE</small><h3>Ashes on the East Road</h3><p>Inspect the first wreck, reconstruct the ambush and discover why someone is moving through the abandoned forge above Zeltira.</p><b>Rewards · Tier 1 quest gear · 120 Gold · 75 Renown · The Ashen Vault access</b></div></article><div class="progression-teach"><div><b>QUEST</b><span>Story, puzzles and reliable gear.</span></div><i>→</i><div><b>DUNGEON</b><span>Randomised drops, better rolls and harder combat.</span></div><i>→</i><div><b>ENDGAME</b><span>Heroic, Cellbound+ and long-term progression.</span></div></div></main><aside class="z-guide"><small>WARDEN ELARA VEY</small><h2>No more training contract.</h2><p class="guide-quote">“The ward comes off here. If you make a bad call on the road, it belongs to you. If you make a good one, so does that.”</p><p>Accept the contract to open Guild Command and begin the investigation.</p><button id="acceptFirstContract" class="on-primary">ACCEPT ASHES ON THE EAST ROAD →</button></aside></div>';
  ensureRoot().innerHTML=chrome(body,'quest-lesson');
  $('#acceptFirstContract')?.addEventListener('click',()=>setStage('departure',{firstContractReady:true}));
}
function renderDeparture(){
  if(maybeTutorialComic('departure'))return;
  const body='<div class="zeltira-layout departure"><main>'+zeltiraMap('road')+'</main><aside class="z-guide"><small>CHAPTER 0 · COMPLETE</small><h2>Your guild is ready. The world is not waiting.</h2><p class="guide-quote">“You know enough to make your own mistakes now. That is the useful kind of ready.”</p><div class="tutorial-complete-list"><div><i>✓</i><span><b>You built the active five</b><small>Tank · Healer · three Damage roles</small></span></div><div><i>✓</i><span><b>You read a live fight</b><small>Threat · healing · interrupts · telegraphs</small></span></div><div><i>✓</i><span><b>You made a gear decision</b><small>Item Level matters, but the roll and the character matter too</small></span></div><div><i>✓</i><span><b>You assigned your first drop</b><small>Loot belongs to the guild until you decide who wears it</small></span></div></div><div class="first-expedition-hook"><span>NEXT</span><b>Ashes on the East Road</b><small>Your first real quest begins the moment you leave this screen.</small></div><button id="beginAdventure" class="on-primary">BEGIN CELLBOUND →</button></aside></div>';
  ensureRoot().innerHTML=chrome(body,'departure');
  $('#beginAdventure')?.addEventListener('click',completeOnboarding);
}
async function completeOnboarding(){
  const s=state();s.onboarding.complete=true;s.onboarding.stage='complete';s.onboarding.completedAt=new Date().toISOString();s.renown=Math.max(10,Number(s.renown)||0);s.activity.push('The First Expedition is complete. The guild accepted Ashes on the East Road.');
  Game.save();await Game.persistState();
  if(db&&user)await db.from('characters').update({tutorial_complete:true,tutorial_stage:'complete',tutorial_reward_claimed:true,last_played_at:new Date().toISOString()}).eq('user_id',user.id);
  hide();Game.renderAll();Game.switchView('quests');
  setTimeout(()=>window.CellboundQuests?.startAshfall?.(),120);
}
function render(){
  const s=state();if(!s)return;
  if(s.onboarding?.complete===true){hide();return}
  show();
  const stage=s.onboarding?.stage||'party-builder';
  if(stage==='party-builder')renderPartyBuilder();
  else if(stage==='zeltira-arrival')renderArrival();
  else if(stage==='first-expedition')renderFirstExpedition();
  else if(stage==='gear')renderGear();
  else if(stage==='dungeon-briefing')renderDungeonBriefing();
  else if(stage==='dungeon-running')renderDungeonRunning();
  else if(stage==='loot-review')renderLootReview();
  else if(stage==='recovery-lesson')renderRecoveryLesson();
  else if(stage==='profession-choice')renderProfessionChoice();
  else if(stage==='craft')renderCraft();
  else if(stage==='profession-use')renderProfessionUse();
  else if(stage==='quest-lesson')renderQuestLesson();
  else if(stage==='departure')renderDeparture();
  else{s.onboarding.stage='party-builder';Game.save();renderPartyBuilder()}
}
async function init(){
  Game=window.CellboundGame;
  if(!Game?.ready){setTimeout(init,100);return}
  G=window.CellboundGear;P=window.CellboundProfessions;CP=window.CellboundPortraits;db=Game.getSupabase?.();user=Game.getUser?.();
  if(!G||!P)return;
  window.CellboundCombatStandard?.register?.('zeltira-first-expedition',{kind:'onboarding-dungeon',execution:'local',ui:'shared-cb2d'});
  render();
  window.CellboundOnboarding={render,RACES,previewTutorialComics,tutorialComicConfig};
}
init();
})();