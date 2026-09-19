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
const ROLE_DESC={
  tank:'Controls enemies, takes the first hit and protects the formation.',
  healer:'Keeps the party standing and stabilises dangerous moments.',
  dps:'Deals damage, handles priority targets and helps stop dangerous casts.'
};

let Game=null,G=null,P=null,db=null,user=null;
let draft=[],activeSlot=0,tutorialToken=0;

const state=()=>Game?.getState?.();
const onboarding=()=>state()?.onboarding||{};
const raceById=id=>RACES.find(r=>r.id===id)||RACES[0];

function roleOptions(role){
  const out=[];
  Object.entries(Game?.classes||{}).forEach(([klass,data])=>{
    Object.entries(data.specs||{}).forEach(([spec,s])=>{
      if(s.role===role)out.push({klass,spec,icon:data.icon,glow:data.glow});
    });
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
    rows.push({slot:slot.key,role:slot.role,race:race.id,klass:option?.klass||'Warrior',spec:option?.spec||'Arms',name:randomName(race.id,rows.map(x=>x.name))});
  });
  return rows;
}
function restoreDraft(){
  const saved=onboarding().draft;
  if(Array.isArray(saved)&&saved.length===5){
    draft=saved.map((d,i)=>{
      const slot=SLOTS[i],race=RACES.some(r=>r.id===d.race&&r.roles.includes(slot.role))?d.race:(RACES.find(r=>r.roles.includes(slot.role))?.id||'Veyren');
      const opts=roleOptions(slot.role),valid=opts.find(o=>o.klass===d.klass&&o.spec===d.spec)||opts[0];
      return{slot:slot.key,role:slot.role,race,klass:valid?.klass||'Warrior',spec:valid?.spec||'Arms',name:String(d.name||randomName(race)).slice(0,24)};
    });
  }else draft=defaultDraft();
}
function saveDraft(){
  const s=state();if(!s)return;
  s.onboarding=s.onboarding||{version:1,complete:false,stage:'party-builder',zone:'zeltira'};
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
    'zeltira-arrival':'Arrival in Zeltira',
    'gear':'Reading Equipment',
    'dungeon-briefing':'Combat School',
    'dungeon-running':'The Zeltiran Hollows',
    'loot-review':'Your First Drop',
    'recovery-lesson':'After the Fight',
    'profession-choice':'Choose a Profession',
    'craft':'Craft Your First Item',
    'quest-lesson':'Your First Adventure',
    'departure':'The Road Opens'
  };
  return labels[stage]||'Zeltira';
}
function chrome(body,stage){
  const steps=[
    ['party-builder','Party'],
    ['gear','Gear'],
    ['dungeon-briefing','Combat'],
    ['loot-review','Loot'],
    ['recovery-lesson','Growth'],
    ['profession-choice','Craft'],
    ['quest-lesson','Quests'],
    ['departure','Adventure']
  ];
  const order={'party-builder':0,'zeltira-arrival':0,'gear':1,'dungeon-briefing':2,'dungeon-running':2,'loot-review':3,'recovery-lesson':4,'profession-choice':5,'craft':5,'quest-lesson':6,'departure':7};
  const at=order[stage]??0;
  return '<section class="onboard-shell"><header class="onboard-head"><div><small>CELLBOUND · FIRST CHARTER</small><h1>'+esc(stageTitle(stage))+'</h1></div><div class="onboard-progress">'+steps.map((x,i)=>'<span class="'+(i<at?'done':i===at?'active':'')+'"><i>'+(i+1)+'</i>'+x[1]+'</span>').join('')+'</div></header>'+body+'</section>';
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
  const allValid=draft.every(x=>x.name.trim().length>=2)&&new Set(draft.map(x=>x.name.trim().toLowerCase())).size===5;
  const preview=draft.map((x,i)=>{
    const race=raceById(x.race);
    return '<button class="party-draft-card '+(i===activeSlot?'active':'')+'" data-slot="'+i+'"><i class="on-role '+x.role+'"></i><div><small>'+ROLE_LABEL[x.role]+' '+(SLOTS[i].number||'')+'</small><b>'+esc(x.name||'Unnamed')+'</b><span>'+race.icon+' '+esc(x.race)+' · '+esc(x.klass)+' · '+esc(x.spec)+'</span></div><em>'+(i===activeSlot?'EDIT':'CHANGE')+'</em></button>';
  }).join('');
  const raceCards=availableRaces.map(r=>{
    const identity=window.CellboundIdentities?.getRace?.(r.id);
    return '<button class="race-card '+(d.race===r.id?'active':'')+'" data-race="'+r.id+'"><strong>'+r.icon+'</strong><div><b>'+r.id+'</b><small>'+r.trait+'</small><p>'+esc(identity?.strength||r.lore)+'</p><span>Any role · '+esc(identity?.tradeoff||'Flexible')+'</span></div></button>';
  }).join('');
  const classCards=classes.map(o=>{const ci=window.CellboundIdentities?.getSpec?.(o.klass,o.spec);return '<button class="class-choice '+(d.klass===o.klass&&d.spec===o.spec?'active':'')+'" data-class="'+o.klass+'" data-spec="'+o.spec+'" style="--class-glow:'+o.glow+'" title="'+esc((ci?.strength||'')+' Trade-off: '+(ci?.tradeoff||''))+'"><strong>'+o.icon+'</strong><div><b>'+o.klass+'</b><small>'+o.spec+' · '+ROLE_LABEL[slot.role]+' · '+esc(ci?.title||'Specialist')+'</small></div></button>'}).join('');
  const formation=draft.map(x=>'<div class="formation-unit '+x.role+'"><i>'+raceById(x.race).icon+'</i><b>'+esc(x.name||'Unnamed')+'</b><small>'+ROLE_LABEL[x.role]+'</small></div>').join('');

  const body='<div class="party-build-layout"><aside class="party-draft-list"><div class="onboard-copy"><small>YOUR FIVE</small><h2>One party. Five lives.</h2><p>You need one Tank, one Healer and three Damage adventurers. Class defines the combat job; race changes how that character performs it.</p></div>'+preview+'</aside><main class="party-builder-main"><div class="builder-focus"><div><small>SELECTING</small><h2>'+ROLE_LABEL[slot.role]+' '+(slot.number||'')+'</h2><p>'+ROLE_DESC[slot.role]+'</p></div><span class="role-pill '+slot.role+'">'+ROLE_LABEL[slot.role]+'</span></div><section class="builder-section"><div class="builder-section-head"><div><small>01</small><h3>Choose a race</h3></div><p>Every race can fill every role. Choose the passive strengths and trade-offs you want to build around.</p></div><div class="race-grid">'+raceCards+'</div></section><section class="builder-section"><div class="builder-section-head"><div><small>02</small><h3>Choose a class</h3></div><p>Only classes capable of filling this party role are shown.</p></div><div class="class-grid">'+classCards+'</div></section><section class="builder-section"><div class="builder-section-head"><div><small>03</small><h3>Name your adventurer</h3></div><p>You can change it now or roll a name that fits their race.</p></div><div class="name-builder"><input id="onboardName" maxlength="24" value="'+esc(d.name)+'" autocomplete="off"><button id="randomiseName">RANDOMISE</button></div></section></main><aside class="formation-preview"><small>FORMATION PREVIEW</small><div class="formation-board">'+formation+'</div><div class="formation-key"><span><i class="on-role tank"></i>Tank</span><span><i class="on-role healer"></i>Healer</span><span><i class="on-role dps"></i>Damage</span></div><button id="confirmParty" class="on-primary" '+(allValid?'':'disabled')+'>CONFIRM PARTY & ENTER ZELTIRA →</button><p class="builder-hint">'+(allValid?'Your charter is ready.':'All five characters need unique names of at least 2 characters.')+'</p></aside></div>';

  const root=ensureRoot();root.innerHTML=chrome(body,'party-builder');
  root.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{activeSlot=Number(b.dataset.slot);renderPartyBuilder()});
  root.querySelectorAll('[data-race]').forEach(b=>b.onclick=()=>{d.race=b.dataset.race;d.name=randomName(d.race,draft.filter((_,i)=>i!==activeSlot).map(x=>x.name));saveDraft();renderPartyBuilder()});
  root.querySelectorAll('[data-class]').forEach(b=>b.onclick=()=>{d.klass=b.dataset.class;d.spec=b.dataset.spec;saveDraft();renderPartyBuilder()});
  const input=$('#onboardName');
  if(input)input.oninput=e=>{d.name=e.target.value;saveDraft();const btn=$('#confirmParty');if(btn)btn.disabled=!(draft.every(x=>x.name.trim().length>=2)&&new Set(draft.map(x=>x.name.trim().toLowerCase())).size===5)};
  $('#randomiseName')?.addEventListener('click',()=>{d.name=randomName(d.race,draft.filter((_,i)=>i!==activeSlot).map(x=>x.name));saveDraft();renderPartyBuilder()});
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
    appearance:{race:c.race,class:c.class,spec:c.spec,role:c.role,party_slot:i},
    level:1,xp:0,current_hp:100,max_hp:100,current_location:'zeltira',tutorial_stage:'arrived_zeltira',tutorial_reward_claimed:false,last_played_at:new Date().toISOString()
  }));
  const ins=await db.from('characters').insert(rows);
  if(ins.error)console.warn('Could not sync onboarding character records',ins.error);
}
async function createParty(){
  const names=draft.map(x=>x.name.trim());
  if(names.some(x=>x.length<2)||new Set(names.map(x=>x.toLowerCase())).size!==5)return;
  const ids=draft.map(()=>uid());
  const roster=draft.map((d,i)=>({
    id:ids[i],name:d.name.trim(),race:d.race,raceTrait:raceById(d.race).trait,class:d.klass,spec:d.spec,role:d.role,
    level:1,xp:0,power:d.role==='tank'?30:d.role==='healer'?27:29,talent:1,portrait:initials(d.name),
    knowledge:{ashwarden:0,embermaw:0,vaultheart:0},equipment:emptyEquipment(),gearItems:['Empty','Empty','Empty'],
    cellShock:0,cellShockLockedUntil:null,professions:[null,null],tutorialNew:true,onboardingGearIssued:false
  }));
  const s=state();
  s.roster=roster;s.party={tank:ids[0],healer:ids[1],dps:ids.slice(2,5)};
  s.renown=0;s.gold=250;s.bank=[];s.materials={};s.consumables=[];s.recipeScrolls=[];s.discoveredRecipes=[];s.tradeInbox=[];s.collectionHistory=[];s.reports=[];s.bossKills={ashwarden:false,embermaw:false,vaultheart:false};s.progression={ashenVaultUnlocked:false};s.questSystem=null;
  s.activity=['Your first party has been formed.','The road to Zeltira is open.'];
  s.onboarding={version:1,complete:false,stage:'zeltira-arrival',zone:'zeltira',startedAt:s.onboarding?.startedAt||new Date().toISOString(),partyCreatedAt:new Date().toISOString()};
  Game.replaceState(clone(s));await Game.persistState();await syncPartyCharacters(roster);render();
}

function partySummary(){
  return state().roster.map(c=>'<div class="z-party-member"><i class="on-role '+(Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps')+'"></i><span><b>'+esc(c.name)+'</b><small>'+raceById(c.race).icon+' '+esc(c.race)+' · '+esc(c.class)+' '+esc(c.spec)+'</small></span></div>').join('');
}
function zeltiraMap(active){
  const spots=[
    ['gate','Arrival Gate','Your party enters Zeltira.'],
    ['quartermaster','Quartermaster','Learn equipment and gear.'],
    ['hollows','Zeltiran Hollows','Your first dungeon.'],
    ['workshop','Craft Row','Choose a profession and craft.'],
    ['road','Open Road','Leave the tutorial and adventure.']
  ];
  const order=['gate','quartermaster','hollows','workshop','road'],at=Math.max(0,order.indexOf(active));
  return '<div class="z-map"><div class="z-map-road"></div>'+spots.map((s,i)=>'<div class="z-map-node '+(i<at?'done':i===at?'active':'')+'" data-node="'+s[0]+'"><i>'+(i<at?'✓':i+1)+'</i><b>'+s[1]+'</b><small>'+s[2]+'</small></div>').join('')+'<div class="z-well">◇<span>THE CELL WELL</span></div></div>';
}
async function setStage(next,extra){
  const s=state();s.onboarding=s.onboarding||{};
  Object.assign(s.onboarding,extra||{}, {stage:next,zone:'zeltira'});
  Game.save();await Game.persistState();render();
}
function renderArrival(){
  const body='<div class="zeltira-layout"><main>'+zeltiraMap('gate')+'</main><aside class="z-guide"><small>ZELTIRA · OUTER GATE</small><h2>Welcome to Zeltira.</h2><p class="guide-quote">“Five names on a fresh charter. Good. You are not one adventurer — you are the commander responsible for all five.”</p><div class="guide-name"><b>Warden Elara Vey</b><span>Zeltira Pathfinder</span></div><p>Before the road opens, you will actually use the systems your guild depends on.</p><div class="tutorial-learning-list"><span><i>1</i><b>Read equipment</b><small>Item Level, rolled stats and who should wear what.</small></span><span><i>2</i><b>Command a dungeon</b><small>Pulls, threat, healing, interrupts and boss telegraphs.</small></span><span><i>3</i><b>Manage what drops</b><small>Bank gear, character upgrades and reagents.</small></span><span><i>4</i><b>Grow the guild</b><small>Cell Shock, knowledge, professions and quests.</small></span></div><div class="z-party-list">'+partySummary()+'</div><button id="toQuartermaster" class="on-primary">START TRAINING →</button></aside></div>';
  ensureRoot().innerHTML=chrome(body,'zeltira-arrival');
  $('#toQuartermaster')?.addEventListener('click',()=>setStage('gear'));
}
function renderGear(){
  const tank=state().roster.find(c=>Game.classes?.[c.class]?.specs?.[c.spec]?.role==='tank')||state().roster[0];
  const good=G.createQuestGear?.(tank,'Weapon',1,'specialist','Zeltira Training')||G.starterSet(tank.class).find(x=>x.slot==='Weapon');
  const off=G.createQuestGear?.(tank,'Weapon',1,'swift','Zeltira Training')||good;
  const stats=item=>(G.statLines?.(item)||[]).map(s=>s.text).join(' · ')||'No bonus stat';
  const body='<div class="gear-school"><main><small>ZELTIRA · QUARTERMASTER</small><h2>Item Level tells you how advanced an item is. The roll tells you who actually wants it.</h2><p>These two weapons are the <b>same Item Level</b>. One better suits '+esc(tank.name)+' as a '+esc(tank.spec)+' '+esc(tank.class)+'. Choose the one you would equip.</p><div class="gear-lesson-compare"><button data-training-gear="good">'+G.artHTML(good,82)+'<span><small>ITEM LEVEL '+(good.itemLevel||22)+'</small><b>'+esc(good.name)+'</b><em>'+esc(stats(good))+'</em></span></button><button data-training-gear="off">'+G.artHTML(off,82)+'<span><small>ITEM LEVEL '+(off.itemLevel||22)+'</small><b>'+esc(off.name)+'</b><em>'+esc(stats(off))+'</em></span></button></div><div class="gear-school-rule"><b>Remember</b><span>Higher Item Level usually means more power, but two items at the same level can be very different because their bonus stats roll differently.</span></div><p id="gearLessonHint">Look for a stat that matches what your Tank is trying to do.</p></main><aside class="z-guide"><small>YOUR TANK</small><div class="gear-student"><span>'+esc(tank.portrait)+'</span><div><h3>'+esc(tank.name)+'</h3><p>'+esc(tank.race)+' · '+esc(tank.class)+' · '+esc(tank.spec)+'</p></div></div><div class="role-lessons"><div><i class="on-role tank"></i><b>Tank wants</b><span>Threat, Block, Stamina and Armour are strong tank rolls.</span></div></div><p>The dungeon version of an item can roll stronger values than reliable quest gear. That is why you may keep farming the same boss later.</p></aside></div>';
  ensureRoot().innerHTML=chrome(body,'gear');
  $('[data-training-gear]').forEach(b=>b.onclick=()=>{
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
  const body='<div class="dungeon-brief-layout"><main><div class="tutorial-dungeon-art"><span>THE ZELTIRAN HOLLOWS</span><h2>Your first dungeon is a lesson, not a cutscene.</h2><p>You will be asked to make the important calls yourself. Get one wrong and Warden Elara will explain why before you try again.</p><div class="tutorial-route"><div><i>1</i><b>Rootling Nest</b><small>Pull & threat</small></div><div><i>2</i><b>Collapsed Gallery</b><small>Healing & interrupt</small></div><div><i>3</i><b>Hollow Warden</b><small>Boss telegraph</small></div></div></div></main><aside class="z-guide"><small>ZELTIRA · DUNGEON TRAINING</small><h2>What you are learning.</h2><div class="role-lessons"><div><i class="on-role tank"></i><b>Tank</b><span>Pulls first, builds threat and aims dangerous attacks away.</span></div><div><i class="on-role healer"></i><b>Healer</b><span>Stabilises damage without standing in danger.</span></div><div><i class="on-role dps"></i><b>Damage</b><span>Prioritises dangerous enemies and interrupts key casts.</span></div></div><p>Real dungeons can wipe. This training run cannot, so use it to understand what the 2D combat is showing you.</p><button id="enterTutorialDungeon" class="on-primary">START COMBAT TRAINING →</button></aside></div>';
  ensureRoot().innerHTML=chrome(body,'dungeon-briefing');
  $('#enterTutorialDungeon')?.addEventListener('click',async()=>{await setStage('dungeon-running');});
}
function tdRole(c){return Game.classes?.[c.class]?.specs?.[c.spec]?.role||'dps'}
function tdProfile(c){
  const r=tdRole(c);
  if(r==='tank')return'tank';
  if(r==='healer')return'healer';
  if(['Rogue','Warrior','Paladin'].includes(c.class))return'melee';
  return'ranged';
}
const ZELTIRA_ROOMS=[
  {
    id:'rootling-nest',room:'rootling-nest',label:'Rootling Nest',
    ambience:'Wet roots twist through a shallow cave floor.',
    props:[
      ['root',8,24,-8,1.05],['root',10,76,7,.95],['mushroom',18,19,0,.9],['mushroom',20,82,0,.75],
      ['fallen-log',83,20,-12,.9],['stone',86,78,8,.8],['nest',73,50,0,1]
    ]
  },
  {
    id:'collapsed-gallery',room:'collapsed-gallery',label:'Collapsed Gallery',
    ambience:'Old Zeltiran stonework has been swallowed by the hollow.',
    props:[
      ['ruin-pillar',9,20,-7,.9],['ruin-pillar',10,80,8,.82],['root',18,13,16,.85],['root',20,88,-14,.8],
      ['broken-wall',86,50,0,1],['mushroom',76,18,0,.7],['mushroom',78,82,0,.8],['puddle',60,78,0,.9]
    ]
  },
  {
    id:'hollow-warden',room:'warden-chamber',label:'Warden Chamber',
    ambience:'A root-bound shrine waits beneath the oldest stone.',
    props:[
      ['shrine-ring',66,50,0,1.1],['shrine-stone',87,50,0,1],['root',10,22,-12,1],['root',10,78,12,1],
      ['glow-fungus',80,18,0,.8],['glow-fungus',80,82,0,.8],['standing-stone',16,16,-8,.8],['standing-stone',16,84,8,.8]
    ]
  }
];
function unitMarkup(c,i){
  const r=tdRole(c),profile=tdProfile(c);
  const melee=state().roster.filter(x=>tdProfile(x)==='melee'),ranged=state().roster.filter(x=>tdProfile(x)==='ranged');
  let pos=[20,50];
  if(profile==='tank')pos=[34,50];
  else if(profile==='melee')pos=[27,42+melee.indexOf(c)*16];
  else if(profile==='ranged')pos=[21,30+ranged.indexOf(c)*40];
  else pos=[15,64];
  return '<div class="td-unit party '+r+' profile-'+profile+'" data-td-party="'+c.id+'" style="left:'+pos[0]+'%;top:'+pos[1]+'%"><i></i><span>'+esc(c.name)+'</span><em><b style="width:100%"></b></em></div>';
}
function renderDungeonRunning(){
  const body='<div class="td-wrap"><div class="td-top"><div><small>ZELTIRA TRAINING DUNGEON</small><h2 id="tdEncounter">Entering the Hollows…</h2></div><b class="td-safe">TRAINING RUN · GUARANTEED CLEAR</b></div><div class="td-route"><span class="active" data-td-route="0">1 · Rootling Nest</span><span data-td-route="1">2 · Collapsed Gallery</span><span data-td-route="2">3 · Hollow Warden</span></div><div class="td-arena theme-hollows room-rootling-nest" id="tdArena"><div class="td-floor"></div><div class="td-environment" id="tdEnvironment"></div><div class="td-room-tag" id="tdRoomTag"></div><div id="tdEnemies"></div><div id="tdParty">'+state().roster.map(unitMarkup).join('')+'</div><div class="td-callout" id="tdCallout">Your party advances together.</div><div id="tdLesson" class="td-lesson" hidden></div></div><div class="td-bottom"><div class="td-actions"><div><i class="on-role tank"></i><b>Tank</b><span id="tdTankAction">Taking point</span></div><div><i class="on-role healer"></i><b>Healer</b><span id="tdHealAction">Following</span></div><div><i class="on-role dps"></i><b>Damage</b><span id="tdDpsAction">Acquiring targets</span></div></div><div class="td-feed" id="tdFeed">Zeltira gate closes behind the party.</div></div></div>';
  ensureRoot().innerHTML=chrome(body,'dungeon-running');
  const my=++tutorialToken;setTimeout(()=>runTutorialDungeon(my),350);
}
function tdLesson(title,text,options,correct,success){
  return new Promise(resolve=>{
    const root=$('#tdLesson');if(!root){resolve();return}
    root.hidden=false;
    const draw=(note='')=>{
      root.innerHTML='<section><small>COMMAND DECISION</small><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p><div>'+options.map((o,i)=>'<button data-td-answer="'+i+'">'+esc(o)+'</button>').join('')+'</div><em class="'+(note?'show':'')+'">'+esc(note||'Choose the response you would give your party.')+'</em></section>';
      root.querySelectorAll('[data-td-answer]').forEach(b=>b.onclick=()=>{
        const i=Number(b.dataset.tdAnswer);
        if(i!==correct){draw('Not quite. Think about each role’s job in this moment.');return}
        root.innerHTML='<section class="correct"><small>GOOD CALL</small><h3>'+esc(title)+'</h3><p>'+esc(success)+'</p></section>';
        setTimeout(()=>{root.hidden=true;resolve()},700);
      });
    };
    draw();
  });
}
function tdBossFrontal(){
  const arena=$('#tdArena'),enemy=$('[data-td-enemy="0"]');if(!arena||!enemy)return;
  const p=tdPoint('[data-td-enemy="0"]');if(!p)return;
  const cone=document.createElement('div');cone.className='td-training-cone';cone.style.left=p.x+'px';cone.style.top=p.y+'px';cone.innerHTML='<span>FRONTAL CLEAVE</span>';arena.appendChild(cone);
  tdFeed('The Hollow Warden telegraphs a frontal attack. The Tank turns it away from the party.');
  setTimeout(()=>cone.classList.add('impact'),550);setTimeout(()=>cone.remove(),1150);
}
function tdInterruptMoment(my){
  const enemy=$('[data-td-enemy="0"]');if(!enemy)return;
  const bar=document.createElement('strong');bar.className='td-training-cast';bar.innerHTML='<span>HOLLOW SCREAM</span><i></i>';enemy.appendChild(bar);
  tdFeed('The Cell-Sick Marauder begins Hollow Scream.');
  const dps=state().roster.find(c=>tdRole(c)==='dps');
  if(dps)setTimeout(()=>{if(my!==tutorialToken)return;tdProjectile('[data-td-party="'+dps.id+'"]','[data-td-enemy="0"]','magic');tdAction('dps',dps.name+' interrupts Hollow Scream');bar.classList.add('interrupted');bar.querySelector('span').textContent='INTERRUPTED';},650);
  setTimeout(()=>bar.remove(),1200);
}

function tdPoint(selector){
  const arena=$('#tdArena'),el=$(selector);if(!arena||!el)return null;
  const a=arena.getBoundingClientRect(),r=el.getBoundingClientRect();return{x:r.left-a.left+r.width/2,y:r.top-a.top+r.height/2};
}
function tdFloat(selector,text,kind){
  const arena=$('#tdArena'),p=tdPoint(selector);if(!arena||!p)return;
  const e=document.createElement('span');e.className='td-number '+(kind||'damage');e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),750);
}
function tdProjectile(from,to,kind){
  const arena=$('#tdArena'),a=tdPoint(from),b=tdPoint(to);if(!arena||!a||!b)return;
  const e=document.createElement('i');e.className='td-shot '+(kind||'');e.style.left=a.x+'px';e.style.top=a.y+'px';arena.appendChild(e);requestAnimationFrame(()=>e.style.transform='translate('+(b.x-a.x)+'px,'+(b.y-a.y)+'px)');setTimeout(()=>e.remove(),430);
}
function tdFeed(text){
  const e=$('#tdFeed');if(e)e.innerHTML=esc(text)+'<br>'+e.innerHTML.split('<br>').slice(0,3).join('<br>');
}
function tdAction(role,text){
  const id=role==='tank'?'tdTankAction':role==='healer'?'tdHealAction':'tdDpsAction';const e=$('#'+id);if(e)e.textContent=text;
}
function tdMove(selector,x,y,ms=360){
  const e=$(selector);if(!e)return;e.style.transitionDuration=ms+'ms';requestAnimationFrame(()=>{e.style.left=x+'%';e.style.top=y+'%'});
}
function tdPct(selector){
  const e=$(selector);return e?{x:parseFloat(e.style.left)||50,y:parseFloat(e.style.top)||50}:{x:50,y:50};
}
function tdEnemyPct(index){return tdPct('[data-td-enemy="'+index+'"]')}
function tdFormationPoint(c,index){
  const ep=tdEnemyPct(index),profile=tdProfile(c);
  if(profile==='tank')return{x:ep.x-9,y:ep.y};
  if(profile==='melee'){
    const m=state().roster.filter(x=>tdProfile(x)==='melee'),i=Math.max(0,m.indexOf(c)),offset=[-10,10,-15][i]||0;
    return{x:ep.x+6,y:ep.y+offset};
  }
  if(profile==='ranged'){
    const r=state().roster.filter(x=>tdProfile(x)==='ranged'),i=Math.max(0,r.indexOf(c));
    return{x:ep.x-31-i*3,y:[31,69,48][i]||50};
  }
  return{x:ep.x-42,y:66};
}
function tdMovePartyIntoPositions(index){
  state().roster.forEach(c=>{
    const p=tdFormationPoint(c,index);tdMove('[data-td-party="'+c.id+'"]',p.x,p.y,520)
  });
}
function tdRegroup(){
  const melee=state().roster.filter(x=>tdProfile(x)==='melee'),ranged=state().roster.filter(x=>tdProfile(x)==='ranged');
  state().roster.forEach(c=>{
    const p=tdProfile(c);let x=28,y=50;
    if(p==='tank'){x=39;y=50}
    else if(p==='melee'){x=31;y=42+melee.indexOf(c)*16}
    else if(p==='ranged'){x=24;y=31+ranged.indexOf(c)*38}
    else{x=18;y=64}
    tdMove('[data-td-party="'+c.id+'"]',x,y,520)
  })
}
function tdThreatLine(enemyIndex,tank){
  const arena=$('#tdArena'),a=tdPoint('[data-td-enemy="'+enemyIndex+'"]'),b=tdPoint('[data-td-party="'+tank.id+'"]');if(!arena||!a||!b)return;
  const old=arena.querySelector('[data-td-threat="'+enemyIndex+'"]');if(old)old.remove();
  const line=document.createElement('i'),dx=b.x-a.x,dy=b.y-a.y;
  line.className='td-threat-line';line.dataset.tdThreat=enemyIndex;line.style.left=a.x+'px';line.style.top=a.y+'px';line.style.width=Math.hypot(dx,dy)+'px';line.style.transform='rotate('+(Math.atan2(dy,dx)*180/Math.PI)+'deg)';arena.appendChild(line);setTimeout(()=>line.remove(),900)
}

function renderTdEnvironment(index){
  const arena=$('#tdArena'),root=$('#tdEnvironment'),tag=$('#tdRoomTag'),cfg=ZELTIRA_ROOMS[index]||ZELTIRA_ROOMS[0];
  if(!arena||!root)return;
  arena.className='td-arena theme-hollows room-'+cfg.room+(index===2?' boss-room':'');
  root.innerHTML='';
  cfg.props.forEach((p,i)=>{
    const e=document.createElement('span');e.className='td-prop prop-'+p[0];e.style.left=p[1]+'%';e.style.top=p[2]+'%';
    e.style.setProperty('--rot',(p[3]||0)+'deg');e.style.setProperty('--scale',String(p[4]||1));e.dataset.prop=i;root.appendChild(e)
  });
  const ambience=document.createElement('div');ambience.className='td-ambience';
  for(let i=0;i<11;i++){
    const e=document.createElement('i');e.className='td-mote '+(i%4===0?'spore':'dust');e.style.setProperty('--x',(8+((i*19)%84))+'%');
    e.style.setProperty('--delay',(-((i*.61)%5))+'s');e.style.setProperty('--dur',(4.4+(i%4)*.7)+'s');e.style.setProperty('--drift',(-14+(i%6)*6)+'px');ambience.appendChild(e)
  }
  root.appendChild(ambience);
  if(tag)tag.innerHTML='<b>'+esc(cfg.label)+'</b><small>'+esc(cfg.ambience)+'</small>'
}

function spawnTdEnemies(names,boss){
  const root=$('#tdEnemies');if(!root)return;
  root.innerHTML=names.map((n,i)=>{
    const y=names.length===1?50:36+i*(28/Math.max(1,names.length-1));
    return '<div class="td-unit enemy '+(boss?'boss':'')+'" data-td-enemy="'+i+'" data-hp="'+(boss?260:95)+'" data-max="'+(boss?260:95)+'" style="left:72%;top:'+y+'%"><i></i><span>'+esc(n)+'</span><em><b style="width:100%"></b></em></div>';
  }).join('');
}
function setTdHp(index,hp){
  const e=$('[data-td-enemy="'+index+'"]');if(!e)return;
  const max=Number(e.dataset.max)||100,next=Math.max(0,hp);e.dataset.hp=next;
  const bar=e.querySelector('em b');if(bar)bar.style.width=(next/max*100)+'%';
  if(next<=0)e.classList.add('dead');
}

function tdAttackCooldown(c){
  const p=tdProfile(c);
  if(p==='tank')return 980;
  if(c.class==='Rogue')return 650;
  if(c.class==='Hunter')return 980;
  if(c.class==='Mage')return 1120;
  if(c.class==='Warrior')return 820;
  return 900;
}
function tdLivingEnemy(){
  return $$('[data-td-enemy]').find(e=>Number(e.dataset.hp)>0)||null;
}
function tdFirePartyAttack(c,my){
  if(my!==tutorialToken)return;
  const living=tdLivingEnemy();if(!living)return;
  const idx=Number(living.dataset.tdEnemy),profile=tdProfile(c),r=tdRole(c);
  const desired=tdFormationPoint(c,idx);
  tdMove('[data-td-party="'+c.id+'"]',desired.x,desired.y,profile==='melee'?170:340);
  tdAction(r==='tank'?'tank':'dps',c.name+(profile==='melee'?' attacks from close range':' attacks from range'));
  const shot=c.class==='Mage'?'magic':c.class==='Hunter'?'arrow':'slash';
  setTimeout(()=>{if(my===tutorialToken)tdProjectile('[data-td-party="'+c.id+'"]','[data-td-enemy="'+idx+'"]',shot)},profile==='melee'?80:0);
  const hit=(r==='tank'?18:26)+Math.floor(Math.random()*8);
  setTimeout(()=>{
    if(my!==tutorialToken)return;
    const enemy=$('[data-td-enemy="'+idx+'"]');if(!enemy||Number(enemy.dataset.hp)<=0)return;
    setTdHp(idx,Number(enemy.dataset.hp)-hit);tdFloat('[data-td-enemy="'+idx+'"]','-'+hit,'damage');
  },profile==='melee'?170:300);
}
function tdFireEnemyAttack(idx,tank,healer,my){
  if(my!==tutorialToken||!tank)return;
  const enemy=$('[data-td-enemy="'+idx+'"]');if(!enemy||Number(enemy.dataset.hp)<=0)return;
  const tp=tdPct('[data-td-party="'+tank.id+'"]');
  tdMove('[data-td-enemy="'+idx+'"]',tp.x+8,tp.y+([-8,0,8][idx%3]||0),300);
  tdThreatLine(idx,tank);
  tdAction('tank',tank.name+' holds threat');
  tdProjectile('[data-td-enemy="'+idx+'"]','[data-td-party="'+tank.id+'"]','enemy');
  setTimeout(()=>{if(my===tutorialToken)tdFloat('[data-td-party="'+tank.id+'"]','-8','incoming')},260);
  if(healer){
    const hp=tdPct('[data-td-party="'+tank.id+'"]');
    tdMove('[data-td-party="'+healer.id+'"]',Math.max(13,hp.x-39),Math.min(80,hp.y+14),330);
  }
}
function tdFireHeal(healer,tank,my){
  if(my!==tutorialToken||!healer||!tank)return;
  tdAction('healer',healer.name+' heals '+tank.name+' from the backline');
  tdProjectile('[data-td-party="'+healer.id+'"]','[data-td-party="'+tank.id+'"]','heal');
  setTimeout(()=>{if(my===tutorialToken)tdFloat('[data-td-party="'+tank.id+'"]','+8','heal')},290);
}
async function fightTdPack(names,boss,my){
  spawnTdEnemies(names,boss);await sleep(350);
  const roster=state().roster,tank=roster.find(c=>tdProfile(c)==='tank'),healer=roster.find(c=>tdProfile(c)==='healer');

  if(tank){
    tdAction('tank',tank.name+' runs in first and pulls the pack');
    tdMove('[data-td-party="'+tank.id+'"]',55,50,430);
    await sleep(220);
    $$('[data-td-enemy]').forEach((e,i)=>{
      const y=names.length===1?50:40+i*(20/Math.max(1,names.length-1));
      tdMove('[data-td-enemy="'+i+'"]',64,y,380);
      setTimeout(()=>tdThreatLine(i,tank),180);
    });
    tdFeed(tank.name+' establishes threat on the pack.');
    await sleep(360);
  }

  tdMovePartyIntoPositions(0);
  if(healer)tdAction('healer',healer.name+' stays deep but keeps the party in range');
  tdAction('dps','Melee closes in · ranged holds distance');
  await sleep(380);

  if(names[0]==='Cell-Sick Marauder'){tdInterruptMoment(my);await sleep(1050)}
  if(boss){tdBossFrontal();if(tank)tdAction('tank',tank.name+' turns the boss away from the group');await sleep(1050)}

  const now=performance.now();
  const actors=Object.fromEntries(roster.map((c,i)=>[c.id,{
    nextAttack:now+120+i*100,
    nextMove:now+70+i*50,
    nextHeal:now+760
  }]));
  const enemies=names.map((_,i)=>({nextAttack:now+620+i*180,nextMove:now+100+i*60}));

  await new Promise(resolve=>{
    const tick=()=>{
      if(my!==tutorialToken){resolve();return}
      const living=tdLivingEnemy();
      if(!living){resolve();return}

      const now=performance.now(),targetIdx=Number(living.dataset.tdEnemy);

      roster.forEach(c=>{
        const rt=actors[c.id],profile=tdProfile(c);
        if(now>=rt.nextMove){
          const p=tdFormationPoint(c,targetIdx);
          const drift=profile==='ranged'||profile==='healer'?Math.random()*4-2:Math.random()*2-1;
          tdMove('[data-td-party="'+c.id+'"]',p.x,p.y+drift,profile==='melee'?220:360);
          rt.nextMove=now+(profile==='melee'?260:420);
        }

        if(profile==='healer'){
          if(now>=rt.nextHeal){
            tdFireHeal(c,tank,my);
            rt.nextHeal=now+1050+Math.random()*250;
          }
          return;
        }

        if(now>=rt.nextAttack){
          tdFirePartyAttack(c,my);
          rt.nextAttack=now+tdAttackCooldown(c)+(Math.random()*140-70);
        }
      });

      $$('[data-td-enemy]').forEach((enemy,i)=>{
        if(Number(enemy.dataset.hp)<=0)return;
        const rt=enemies[i];
        if(now>=rt.nextMove&&tank){
          const tp=tdPct('[data-td-party="'+tank.id+'"]');
          tdMove('[data-td-enemy="'+i+'"]',tp.x+8,tp.y+([-9,0,9][i%3]||0),300);
          rt.nextMove=now+260+Math.random()*100;
        }
        if(now>=rt.nextAttack){
          tdFireEnemyAttack(i,tank,healer,my);
          rt.nextAttack=now+(boss?900:1150)+Math.random()*220;
        }
      });

      setTimeout(tick,70);
    };
    tick();
  });

  tdFeed((boss?'Boss defeated: ':'Pack cleared: ')+names.join(', '));
  tdRegroup();tdAction('tank','Leading the party onward');tdAction('healer','Following at safe range');tdAction('dps','Returning to travel formation');
  await sleep(650);
}

async function runTutorialDungeon(my){
  if(my!==tutorialToken||onboarding().stage!=='dungeon-running')return;
  const encounters=[
    {name:'Rootling Nest',mobs:['Rootling','Rootling'],boss:false},
    {name:'Collapsed Gallery',mobs:['Cell-Sick Marauder'],boss:false},
    {name:'Hollow Warden',mobs:['The Hollow Warden'],boss:true}
  ];
  for(let i=0;i<encounters.length;i++){
    if(my!==tutorialToken)return;
    $('[data-td-route]').forEach((x,j)=>x.classList.toggle('active',j===i));
    const e=encounters[i];renderTdEnvironment(i);$('#tdEncounter').textContent=e.name;
    if(i===0){
      $('#tdCallout').textContent='Decide who starts the pull.';
      await tdLesson('Who should enter first?','Two enemies are waiting ahead and neither has chosen a target yet.',['Send the Tank in first','Send the Healer in first','Let Damage race for the first hit'],0,'Exactly. The Tank establishes threat before everyone else commits.');
    }else if(i===1){
      $('#tdCallout').textContent='The Tank is taking damage.';
      await tdLesson('Who stabilises the Tank?','The Tank is doing their job and absorbing repeated hits.',['The Healer restores them from a safe position','The Tank abandons the enemies','Damage stops attacking and waits'],0,'Correct. Healing keeps the pull stable while the Tank continues holding threat.');
      await tdLesson('A dangerous cast begins','The Cell-Sick Marauder starts a long cast called Hollow Scream.',['Ignore it and heal through everything','Damage switches attention and interrupts it','The Healer runs into melee range'],1,'Correct. Interrupting dangerous casts prevents damage instead of forcing the Healer to repair it afterwards.');
    }else{
      $('#tdCallout').textContent='Read the boss telegraph.';
      await tdLesson('The boss raises a frontal cleave','A wide attack is aimed through the Tank toward the group.',['Tank turns the boss away while the party stays behind it','Everyone stacks directly in front','Healer takes the attack instead'],0,'Correct. Positioning is part of tanking: control where the boss faces so avoidable damage never reaches the group.');
    }
    tdFeed('Entering '+e.name+'.');await fightTdPack(e.mobs,e.boss,my);
  }
  if(my!==tutorialToken)return;
  $('#tdEncounter').textContent='Dungeon Clear';$('#tdCallout').textContent='The Zeltiran Hollows are secure.';
  tdFeed('The Hollow Warden drops gear and profession reagents.');await sleep(900);
  const s=state();
  if(s.onboarding.stage==='dungeon-running'&&!s.onboarding.tutorialDungeonComplete){
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
    s.activity.push('The Zeltiran Hollows were cleared. A gear drop and profession reagents were recovered.');
    Game.save();await Game.persistState();
    if(db&&user)await db.from('characters').update({tutorial_stage:'review_loot',last_played_at:new Date().toISOString()}).eq('user_id',user.id);
  }
  render();
}
function tutorialLootItem(){
  const s=state(),id=s?.onboarding?.tutorialLootBankId;
  return (s?.bank||[]).find(x=>x.id===id)||null;
}
function renderLootReview(){
  const s=state(),item=tutorialLootItem();
  if(!item){s.onboarding.stage='recovery-lesson';Game.save();render();return}
  const eligible=s.roster.filter(ch=>item.class===ch.class||item.classes==='all'||item.classes?.includes?.(ch.class));
  const stats=(G.statLines?.(item)||[]).map(x=>x.text).join(' · ')||'No bonus stats';
  const body='<div class="loot-school"><main><small>ZELTIRA · GUILD BANK</small><h2>The boss dropped an item. It does not equip itself.</h2><p>Drops are secured in the Guild Bank first. Read the roll, choose who benefits, then assign the item.</p><article class="tutorial-loot-card">'+G.artHTML(item,104)+'<div><small>'+esc(item.rarity||'GEAR')+' · '+esc(item.slot)+' · ITEM LEVEL '+(item.itemLevel||0)+'</small><h3>'+esc(item.name)+'</h3><div class="tutorial-loot-stats">'+(G.statLines?.(item)||[]).map(x=>'<span>'+esc(x.text)+'</span>').join('')+'</div><p>Dropped by the Hollow Warden · currently stored in the Guild Bank</p></div></article><div class="gear-school-rule"><b>Dungeon rolls are not fixed</b><span>If this same item drops again, its bonus stat can be different. A bad roll can be replaced later even when the Item Level is unchanged.</span></div></main><aside class="z-guide"><small>ASSIGN THE DROP</small><h2>Who should wear it?</h2><p>This item is restricted by class. The labels below compare its rolled stat against each compatible character’s current spec.</p><div class="tutorial-loot-characters">'+eligible.map(ch=>{const fit=G.rollFit?.(ch,item);return '<button data-tutorial-loot-char="'+ch.id+'"><span>'+esc(ch.portrait)+'</span><div><b>'+esc(ch.name)+'</b><small>'+esc(ch.class)+' · '+esc(ch.spec)+'</small><em class="'+esc(fit?.tone||'')+'">'+esc(fit?.label||'COMPATIBLE')+'</em></div></button>'}).join('')+'</div><p class="tutorial-roll-summary">'+esc(stats)+'</p></aside></div>';
  ensureRoot().innerHTML=chrome(body,'loot-review');
  $('[data-tutorial-loot-char]').forEach(b=>b.onclick=()=>equipTutorialLoot(b.dataset.tutorialLootChar));
}
async function equipTutorialLoot(charId){
  const s=state(),item=tutorialLootItem(),ch=s.roster.find(x=>x.id===charId);if(!item||!ch)return;
  const old=ch.equipment?.[item.slot];
  if(old?.name)Game.addBankItem({...old,source:'Unequipped during Zeltira training'},false);
  const incoming=Game.canonicalItem?.(item)||item,{id,quantity,...equipped}=incoming;
  ch.equipment=ch.equipment||emptyEquipment();ch.equipment[item.slot]={...equipped,source:'Equipped'};
  ch.gearItems=['Head','Chest','Weapon'].map(slot=>ch.equipment[slot]?.name||'Empty');
  item.quantity=(Number(item.quantity)||1)-1;if(item.quantity<=0)s.bank=s.bank.filter(x=>x.id!==item.id);
  s.onboarding.tutorialLootEquippedTo=ch.id;s.onboarding.stage='recovery-lesson';
  s.activity.push(ch.name+' equipped '+item.name+' from the Zeltiran Hollows.');
  Game.save();await Game.persistState();render();
}
function renderRecoveryLesson(){
  const mins=Game.getEntitlements?.().recoveryMinutes||60;
  const body='<div class="growth-school"><main><small>ZELTIRA · AFTER-ACTION LESSON</small><h2>A dungeon teaches your guild even when it hurts.</h2><p>These three systems explain what happens between attempts.</p><div class="growth-cards"><article><strong>KNOWLEDGE</strong><b>Learn the encounter</b><p>Fighting bosses builds encounter knowledge. Even a wipe can teach your guild enough to improve the next attempt.</p></article><article><strong>CELL SHOCK</strong><b>Failure has pressure</b><p>Failed PvE attempts add Cell Shock. At 100%, that character becomes unavailable until recovery or another solution clears it.</p></article><article><strong>TALENT POINTS</strong><b>Levels change builds</b><p>Characters earn talent points as they level. Spend them from the character sheet to specialise how that adventurer performs.</p></article></div><div class="shock-example"><span>CELL SHOCK EXAMPLE</span><div><i style="width:75%"></i></div><b>75%</b><small>One more 25% wipe would reach 100%.</small></div></main><aside class="z-guide"><small>CHECK YOUR UNDERSTANDING</small><h2>Your Tank reaches 100% Cell Shock. What now?</h2><div class="tutorial-question" id="shockQuestion"><button data-shock-answer="wrong">Keep entering dungeons with them anyway</button><button data-shock-answer="correct">Rotate them out while they recover</button><button data-shock-answer="wrong">Destroy their equipment to clear it</button></div><p id="shockLessonHint">Standard recovery on this account is about '+mins+' minutes once a character reaches 100%.</p></aside></div>';
  ensureRoot().innerHTML=chrome(body,'recovery-lesson');
  $('[data-shock-answer]').forEach(b=>b.onclick=async()=>{
    const h=$('#shockLessonHint');
    if(b.dataset.shockAnswer!=='correct'){if(h){h.textContent='Not quite. Cell Shock affects character availability, not equipment. Try again.';h.classList.add('lesson-wrong')}return}
    if(h){h.textContent='Correct. Your roster matters because a shocked character may need to be rotated out.';h.classList.remove('lesson-wrong');h.classList.add('lesson-correct')}
    $('[data-shock-answer]').forEach(x=>x.disabled=true);await sleep(650);await setStage('profession-choice');
  });
}

function renderProfessionChoice(){
  const s=state(),selectedChar=s.onboarding.professionCharacterId||s.roster[0]?.id,selectedProf=s.onboarding.professionName||null;
  const chars=s.roster.map(c=>'<button class="prof-char-choice '+(c.id===selectedChar?'active':'')+'" data-prof-char="'+c.id+'"><span>'+c.portrait+'</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.race)+' · '+esc(c.class)+'</small></div></button>').join('');
  const profs=Object.entries(P.PROFESSIONS).map(([name,p])=>'<button class="prof-choice '+(name===selectedProf?'active':'')+'" data-prof="'+name+'"><strong>'+p.icon+'</strong><div><b>'+name+'</b><p>'+p.summary+'</p><small>FIRST RECIPE · '+esc(p.recipes[0].name)+'</small></div></button>').join('');
  const mats='<div class="loot-material"><i>'+(P?.materialArtHTML?P.materialArtHTML('faded-cell-fragment',34,'tutorial-material-art'):'◇')+'</i><span><b>Faded Cell Fragment ×'+(s.materials['faded-cell-fragment']||0)+'</b><small>Recovered from the Hollows</small></span></div><div class="loot-material"><i>'+(P?.materialArtHTML?P.materialArtHTML('zeltiran-iron',34,'tutorial-material-art'):'⬡')+'</i><span><b>Zeltiran Iron ×'+(s.materials['zeltiran-iron']||0)+'</b><small>Recovered from the Hollows</small></span></div>';
  const body='<div class="profession-tutorial"><aside><small>DUNGEON LOOT</small><h2>These are reagents.</h2><p>Reagents are used by professions. Different professions turn the same dungeon drops into equipment, enhancements or consumables.</p>'+mats+'</aside><main><div class="builder-section-head"><div><small>01</small><h3>Who learns the profession?</h3></div><p>Every adventurer can learn a profession. Standard accounts begin with one profession slot per character.</p></div><div class="prof-char-grid">'+chars+'</div><div class="builder-section-head"><div><small>02</small><h3>Choose their first profession</h3></div><p>This choice becomes part of the character and persists after the tutorial.</p></div><div class="prof-grid">'+profs+'</div><button id="confirmProfession" class="on-primary" '+(selectedChar&&selectedProf?'':'disabled')+'>LEARN '+esc(selectedProf||'A PROFESSION')+' →</button></main></div>';
  ensureRoot().innerHTML=chrome(body,'profession-choice');
  $$('[data-prof-char]').forEach(b=>b.onclick=()=>{s.onboarding.professionCharacterId=b.dataset.profChar;Game.save();renderProfessionChoice()});
  $$('[data-prof]').forEach(b=>b.onclick=()=>{s.onboarding.professionName=b.dataset.prof;Game.save();renderProfessionChoice()});
  $('#confirmProfession')?.addEventListener('click',learnTutorialProfession);
}
async function learnTutorialProfession(){
  const s=state(),c=s.roster.find(x=>x.id===s.onboarding.professionCharacterId),name=s.onboarding.professionName;
  if(!c||!P.PROFESSIONS[name])return;
  c.professions=Array.isArray(c.professions)?c.professions:[null,null];c.professions[0]={name,level:1,xp:0};
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
  const body='<div class="craft-tutorial"><aside class="craft-character"><small>APPRENTICE</small><span class="craft-avatar">'+esc(c.portrait)+'</span><h2>'+esc(c.name)+'</h2><p>'+def.icon+' '+esc(prof.name)+' · Skill 1</p><div class="skill-preview"><i style="width:0%"></i></div><small>CRAFTING EARNS PROFESSION XP</small></aside><main><small>ZELTIRA · CRAFT ROW</small><h2>Craft your first item.</h2><p>The reagents from your dungeon are enough to complete a level 1 recipe. Crafting consumes the materials permanently and creates a real tradeable item.</p><article class="tutorial-recipe"><div class="recipe-title"><strong>'+def.icon+'</strong><div><small>SKILL 1 RECIPE</small><h3>'+esc(recipe.name)+'</h3><p>'+esc(prof.name)+'</p></div></div><div class="recipe-inputs">'+recipeInputs(recipe)+'</div><div class="craft-output"><span>CREATES</span><b>'+esc(recipe.output.name)+' ×'+(recipe.output.quantity||1)+'</b></div><button id="craftTutorialItem" class="on-primary" '+(can?'':'disabled')+'>CRAFT '+esc(recipe.output.name).toUpperCase()+' →</button></article></main></div>';
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
  s.onboarding.craftedItem=out.name;s.onboarding.stage='quest-lesson';s.onboarding.professionComplete=true;
  s.activity.push(c.name+' crafted '+out.name+' — the guild is ready for its first real quest.');
  Game.save();await Game.persistState();
  if(db&&user)await db.from('characters').update({tutorial_stage:'tutorial_complete',last_played_at:new Date().toISOString()}).eq('user_id',user.id);
  render();
}
function renderQuestLesson(){
  const body='<div class="quest-school"><main><small>ZELTIRA · NOTICE BOARD</small><h2>This is how Cellbound moves forward.</h2><p>Your first real adventure is waiting outside the tutorial. Quests are not side chores: they discover locations, tell the story and provide reliable gear that prepares you for the next dungeon.</p><article class="first-quest-preview"><div class="quest-preview-rune">♜</div><div><small>NOVICE · MEDIUM ADVENTURE</small><h3>Ashes on the East Road</h3><p>Supply carts have vanished below the old forge. Investigate the road, earn reliable Tier 1 quest gear and uncover the entrance to The Ashen Vault.</p></div></article><div class="progression-teach"><div><b>1 · QUEST</b><span>Reliable equipment and dungeon access.</span></div><i>→</i><div><b>2 · DUNGEON</b><span>Stronger randomized gear and better rolls.</span></div><i>→</i><div><b>3 · NEXT QUEST</b><span>Catch-up gear moves the story forward even if drops were unlucky.</span></div></div><div class="gear-school-rule"><b>You are never meant to be trapped farming one dungeon</b><span>If your party out-levels old content, later progression checks can also be bypassed through character level.</span></div></main><aside class="z-guide"><small>ONE LAST CHECK</small><h2>Why would you still farm a dungeon after its quest gear?</h2><div class="tutorial-question" id="questLessonQuestion"><button data-quest-answer="wrong">Because quest gear is unusable</button><button data-quest-answer="correct">Because dungeon gear can roll stronger stats</button><button data-quest-answer="wrong">Because the next quest is permanently locked</button></div><p id="questLessonHint">Quest gear gives you the floor. Dungeon drops give you the ceiling.</p></aside></div>';
  ensureRoot().innerHTML=chrome(body,'quest-lesson');
  $('[data-quest-answer]').forEach(b=>b.onclick=async()=>{
    const h=$('#questLessonHint');
    if(b.dataset.questAnswer!=='correct'){if(h){h.textContent='Not quite. Quest gear is intentionally useful — it is just not the maximum possible roll.';h.classList.add('lesson-wrong')}return}
    if(h){h.textContent='Exactly. Story progression gets you ready; dungeon farming is where you chase stronger rolls.';h.classList.remove('lesson-wrong');h.classList.add('lesson-correct')}
    $('[data-quest-answer]').forEach(x=>x.disabled=true);await sleep(700);await setStage('departure');
  });
}
function renderDeparture(){
  const s=state(),c=s.roster.find(x=>x.id===s.onboarding.professionCharacterId),prof=s.onboarding.professionName;
  const body='<div class="zeltira-layout departure"><main>'+zeltiraMap('road')+'</main><aside class="z-guide"><small>ZELTIRA · EASTERN ROAD</small><h2>The charter is yours now.</h2><p class="guide-quote">“Now you know what the colours, bars, rolls and warnings actually mean. The next decisions are yours.”</p><div class="tutorial-complete-list"><div><i>✓</i><span><b>Party roles understood</b><small>Tank · Healer · Damage and class/race identity</small></span></div><div><i>✓</i><span><b>Gear read correctly</b><small>Item Level, random stats, Bank assignment</small></span></div><div><i>✓</i><span><b>Combat commanded</b><small>Threat, healing, interrupts and telegraphs</small></span></div><div><i>✓</i><span><b>Growth systems learned</b><small>Knowledge, Cell Shock and talent points</small></span></div><div><i>✓</i><span><b>Profession started</b><small>'+esc(c?.name||'Adventurer')+' · '+esc(prof||'Profession')+' · Crafted '+esc(s.onboarding.craftedItem||'first item')+'</small></span></div><div><i>✓</i><span><b>Quest progression understood</b><small>Quest gear prepares you; dungeons improve it</small></span></div></div><button id="beginAdventure" class="on-primary">OPEN QUEST JOURNAL & BEGIN →</button></aside></div>';
  ensureRoot().innerHTML=chrome(body,'departure');
  $('#beginAdventure')?.addEventListener('click',completeOnboarding);
}
async function completeOnboarding(){
  const s=state();s.onboarding.complete=true;s.onboarding.stage='complete';s.onboarding.completedAt=new Date().toISOString();s.renown=Math.max(10,Number(s.renown)||0);s.activity.push('Zeltira training complete. The wider world is now open.');
  Game.save();await Game.persistState();
  if(db&&user)await db.from('characters').update({tutorial_complete:true,tutorial_stage:'complete',tutorial_reward_claimed:true,last_played_at:new Date().toISOString()}).eq('user_id',user.id);
  hide();Game.renderAll();Game.switchView('quests');
}
function render(){
  const s=state();if(!s)return;
  if(s.onboarding?.complete===true){hide();return}
  show();
  const stage=s.onboarding?.stage||'party-builder';
  if(stage==='party-builder')renderPartyBuilder();
  else if(stage==='zeltira-arrival')renderArrival();
  else if(stage==='gear')renderGear();
  else if(stage==='dungeon-briefing')renderDungeonBriefing();
  else if(stage==='dungeon-running')renderDungeonRunning();
  else if(stage==='loot-review')renderLootReview();
  else if(stage==='recovery-lesson')renderRecoveryLesson();
  else if(stage==='profession-choice')renderProfessionChoice();
  else if(stage==='craft')renderCraft();
  else if(stage==='quest-lesson')renderQuestLesson();
  else if(stage==='departure')renderDeparture();
  else{s.onboarding.stage='party-builder';Game.save();renderPartyBuilder()}
}
async function init(){
  Game=window.CellboundGame;
  if(!Game?.ready){setTimeout(init,100);return}
  G=window.CellboundGear;P=window.CellboundProfessions;db=Game.getSupabase?.();user=Game.getUser?.();
  if(!G||!P)return;
  render();
  window.CellboundOnboarding={render,RACES};
}
init();
})();