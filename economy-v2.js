(()=>{
'use strict';
const G=window.CellboundGear,P=window.CellboundProfessions,CP=window.CellboundPortraits;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let Game=null,db=null,user=null,selectedChar=null,selectedSlot=0,tradeFilter='all',market=[],lastCraftMessage='',craftProject=null,recipeFilter='all';

const clone=x=>JSON.parse(JSON.stringify(x));
const state=()=>Game?.getState?.();
const ent=()=>Game?.getEntitlements?.()||{professionSlots:1};
const usableRoster=()=>state()?.roster?.filter(c=>Game?.isCharacterRosterUnlocked?.(c.id)!==false)||[];
const characterUsable=id=>Game?.isCharacterRosterUnlocked?.(id)!==false;
const materialName=k=>P?.MATERIALS?.[k]?.name||k;
const professionDef=n=>P?.PROFESSIONS?.[n]||null;

function normalise(){
  const s=state();if(!s)return;
  s.materials=s.materials&&typeof s.materials==='object'?s.materials:{};
  s.consumables=Array.isArray(s.consumables)?s.consumables:[];
  s.recipeScrolls=Array.isArray(s.recipeScrolls)?s.recipeScrolls:[];
  s.discoveredRecipes=Array.isArray(s.discoveredRecipes)?s.discoveredRecipes:[];
  s.tradeInbox=Array.isArray(s.tradeInbox)?s.tradeInbox:[];
  s.roster.forEach(c=>{c.professions=Array.isArray(c.professions)?c.professions.slice(0,2):[null,null];while(c.professions.length<2)c.professions.push(null);c.professions=c.professions.map(p=>p?{...p,name:p.name,level:Math.max(1,Math.min(100,Number(p.level)||1)),xp:Math.max(0,Number(p.xp)||0),craftHistory:p.craftHistory&&typeof p.craftHistory==='object'?p.craftHistory:{},masterworks:Math.max(0,Number(p.masterworks)||0),projectsCompleted:Math.max(0,Number(p.projectsCompleted)||0)}:null);c.activeEnhancements=c.activeEnhancements&&typeof c.activeEnhancements==='object'?c.activeEnhancements:{};c.activeProfessionBuffs=Array.isArray(c.activeProfessionBuffs)?c.activeProfessionBuffs:[];});
}
function addConsumable(item,qty=1){
  const s=state(),key=item.key||item.itemKey,name=item.name||item.itemName||key,payload=item.payload||{};
  const found=s.consumables.find(x=>x.key===key);
  if(found)found.quantity=(found.quantity||1)+qty;
  else s.consumables.push({key,name,payload,quantity:qty});
}
async function commit(render=true){
  Game.save();await Game.persistState();if(render){Game.renderAll();renderProfessions();renderCrafted();renderSellOptions();}
}
async function processInbox(){
  const s=state();if(!s.tradeInbox.length)return false;
  for(const d of s.tradeInbox){
    const qty=Math.max(1,Number(d.quantity)||1);
    if(d.category==='material')Game.addMaterial(d.itemKey,qty);
    else if(d.category==='consumable')addConsumable({key:d.itemKey,name:d.itemName,payload:d.payload},qty);
    else if(d.category==='gear'){const base=G.byId(d.itemKey)||G.byName(d.itemName)||{},gear={...base,...(d.payload||{})},source=d.payload?.source||'Trading Post',worldBoss=['Gloamhide Behemoth','The Hollow Wyrm','Veyr, the Cell-Torn'].includes(source);for(let i=0;i<qty;i++){const delivered=worldBoss&&!gear.bonusStats?G.rollItemAffixes({...gear,source}):{...gear,source};Game.addBankItem(delivered);}}
    else if(d.category==='recipe'){const rid=d.payload?.recipeId||d.itemKey;if(rid){const x=s.recipeScrolls.find(v=>v.recipeId===rid);if(x)x.quantity=(x.quantity||1)+qty;else s.recipeScrolls.push({recipeId:rid,name:d.itemName||`Recipe: ${P.recipeById(rid)?.name||rid}`,quantity:qty});}}
    s.activity.push(`${d.payload?.source||'Trading Post'} delivery received: ${(G.byId(d.itemKey)?.name)||d.itemName} ×${qty}.`);
  }
  s.tradeInbox=[];await commit(false);return true;
}
async function claimProceeds(){
  const {data,error}=await db.rpc('claim_trading_proceeds');
  if(error){console.warn('Trade proceeds claim failed',error);return 0;}
  return Number(data?.claimedGold)||0;
}
function professionLevelUp(p,xp){
  if(!p)return; p.xp=(Number(p.xp)||0)+Math.max(0,xp);
  while(p.level<100){const need=P.skillThreshold(p.level);if(p.xp<need)break;p.xp-=need;p.level++;}
  if(p.level>=100){p.level=100;p.xp=0;}
}
function canCraft(recipe,prof){
  if(!prof||prof.level<recipe.level)return false;
  if(recipe.requiresDiscovery&&!state().discoveredRecipes.includes(recipe.id))return false;
  return Object.entries(recipe.inputs).every(([k,q])=>(Number(state().materials[k])||0)>=q);
}
function materialRaritySlug(k){return String(P?.MATERIALS?.[k]?.rarity||'Common').toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function recipeInputs(recipe){return Object.entries(recipe.inputs).map(([k,q])=>`<span class="recipe-reagent rarity-${materialRaritySlug(k)}"><b>${materialName(k)}</b><em>×${q}</em></span>`).join(' ');}
const WORKSHOP_ACTIONS={
  Alchemy:[
    {key:'precision',icon:'◌',label:'Measure',text:'Adjust the mixture with exact ratios.'},
    {key:'tempo',icon:'↯',label:'Drive Reaction',text:'Push the reaction while the window is open.'},
    {key:'stability',icon:'◇',label:'Stabilise',text:'Settle volatility before it ruins the batch.'}
  ],
  Enchanting:[
    {key:'precision',icon:'✧',label:'Trace Rune',text:'Correct the line work and rune geometry.'},
    {key:'tempo',icon:'↯',label:'Channel',text:'Feed power through the pattern immediately.'},
    {key:'stability',icon:'⬡',label:'Anchor',text:'Bind the pattern before it unravels.'}
  ],
  Blacksmithing:[
    {key:'precision',icon:'⚒',label:'Set Strike',text:'Place the next hammer blow exactly.'},
    {key:'tempo',icon:'↯',label:'Work Fast',text:'Use the heat before the metal cools.'},
    {key:'stability',icon:'◈',label:'Control Heat',text:'Bring the forge back under control.'}
  ],
  Leatherworking:[
    {key:'precision',icon:'⌁',label:'Cut True',text:'Correct the cut before the edge is committed.'},
    {key:'tempo',icon:'↯',label:'Pull Tension',text:'Work the material while it is responsive.'},
    {key:'stability',icon:'◇',label:'Set Stitch',text:'Lock the structure before it shifts.'}
  ],
  Tailoring:[
    {key:'precision',icon:'✂',label:'Align Thread',text:'Realign the weave with exact placement.'},
    {key:'tempo',icon:'↯',label:'Weave Pace',text:'Carry momentum through the open pattern.'},
    {key:'stability',icon:'◇',label:'Lock Seam',text:'Secure the weave before it loosens.'}
  ]
};
const WORKSHOP_PROMPTS={
  precision:[
    'The next step has almost no tolerance for error.',
    'The pattern has drifted slightly off line.',
    'One inaccurate move here will lower the finish.'
  ],
  tempo:[
    'The working window is closing quickly.',
    'Momentum is fading and the craft needs a decisive step.',
    'The material is ready now — hesitation will cost quality.'
  ],
  stability:[
    'The project is becoming unstable.',
    'Stress is building through the work.',
    'The craft needs to be secured before continuing.'
  ]
};
function shuffleNeeds(){
  const a=['precision','tempo','stability'];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
function qualityTier(score){
  if(score>=90)return{key:'masterwork',label:'MASTERWORK',xp:1.3};
  if(score>=65)return{key:'fine',label:'FINE',xp:1.1};
  return{key:'standard',label:'STANDARD',xp:.9};
}
function recipeHistory(prof,recipeId){
  prof.craftHistory=prof.craftHistory&&typeof prof.craftHistory==='object'?prof.craftHistory:{};
  return prof.craftHistory[recipeId]||{count:0,best:0,masterwork:false};
}
function craftXp(recipe,prof,tier,exactCount){
  const history=recipeHistory(prof,recipe.id),gap=Math.max(0,(Number(prof.level)||1)-(Number(recipe.level)||1));
  let relevance=1;
  if(gap>50)relevance=.04;else if(gap>35)relevance=.12;else if(gap>20)relevance=.35;else if(gap>10)relevance=.7;
  const freshness=history.count===0?1.7:history.count<3?1.15:1;
  let xp=Math.round(((Number(recipe.xp)||18)*7+50)*relevance*freshness*tier.xp);
  if(tier.key==='masterwork'&&!history.masterwork)xp+=120+Math.round((Number(recipe.level)||1)*3);
  if(exactCount===3)xp+=20;
  return Math.max(2,xp);
}
function craftXpLabel(recipe,prof){
  const h=recipeHistory(prof,recipe.id),gap=Math.max(0,prof.level-recipe.level);
  if(gap>50)return'TRIVIAL XP';
  if(gap>35)return'LOW XP';
  if(h.count===0)return'FIRST CRAFT BONUS';
  if(!h.masterwork)return'MASTERWORK BONUS AVAILABLE';
  return'ACTIVE SKILL XP';
}
function projectPrompt(need){
  const pool=WORKSHOP_PROMPTS[need]||WORKSHOP_PROMPTS.precision;
  return pool[Math.floor(Math.random()*pool.length)];
}
function beginCraft(recipeId){
  const s=state(),c=s.roster.find(x=>x.id===selectedChar),prof=c?.professions?.[selectedSlot],def=professionDef(prof?.name),recipe=def?.recipes.find(r=>r.id===recipeId);
  if(!c||!characterUsable(c.id)||!recipe||!canCraft(recipe,prof))return;
  craftProject={charId:c.id,slot:selectedSlot,profession:prof.name,recipeId:recipe.id,phase:0,quality:12,exact:0,needs:shuffleNeeds(),log:[]};
  lastCraftMessage='';
  renderProfessions();
}
function abandonCraft(){craftProject=null;lastCraftMessage='Project set aside. No materials were used.';renderProfessions()}
async function resolveCraftStep(actionKey){
  const project=craftProject;if(!project)return;
  const s=state(),c=s.roster.find(x=>x.id===project.charId),prof=c?.professions?.[project.slot],def=professionDef(project.profession),recipe=def?.recipes.find(r=>r.id===project.recipeId);
  if(!c||!prof||!recipe){craftProject=null;renderProfessions();return}
  const need=project.needs[project.phase],exact=actionKey===need;
  project.quality=Math.min(100,project.quality+(exact?28:7));
  if(exact)project.exact++;
  const action=(WORKSHOP_ACTIONS[prof.name]||[]).find(x=>x.key===actionKey);
  project.log.push((action?.label||'Action')+' · '+(exact?'clean execution':'workable, but not ideal'));
  project.phase++;
  if(project.phase<3){renderProfessions();return}
  await finishCraftProject(c,prof,recipe,project);
}
async function finishCraftProject(c,prof,recipe,project){
  if(!canCraft(recipe,prof)){craftProject=null;lastCraftMessage='The project stopped because the required materials are no longer available.';renderProfessions();return}
  const s=state(),tier=qualityTier(project.quality),history=recipeHistory(prof,recipe.id),xp=craftXp(recipe,prof,tier,project.exact);
  Object.entries(recipe.inputs).forEach(([k,q])=>s.materials[k]=Math.max(0,(Number(s.materials[k])||0)-q));
  let reclaimed=null;
  if(tier.key==='masterwork'){
    const firstInput=Object.keys(recipe.inputs)[0];
    if(firstInput){s.materials[firstInput]=(Number(s.materials[firstInput])||0)+1;reclaimed=materialName(firstInput)}
  }
  const out=recipe.output,qty=out.quantity||1;
  if(out.category==='consumable')addConsumable(out,qty);
  else if(out.category==='material')Game.addMaterial(out.key,qty);
  professionLevelUp(prof,xp);
  history.count=(Number(history.count)||0)+1;
  history.best=Math.max(Number(history.best)||0,project.quality);
  if(tier.key==='masterwork'&&!history.masterwork){history.masterwork=true;prof.masterworks=(Number(prof.masterworks)||0)+1}
  prof.craftHistory[recipe.id]=history;
  prof.projectsCompleted=(Number(prof.projectsCompleted)||0)+1;
  s.activity.push(c.name+' completed '+recipe.name+' as a '+tier.label.toLowerCase()+' '+prof.name+' project.');
  lastCraftMessage=tier.label+' · '+out.name+' completed · +'+xp+' profession XP'+(reclaimed?' · recovered 1 '+reclaimed:'');
  craftProject=null;
  await commit();
}
function craftProjectMarkup(c,prof,recipe){
  if(!craftProject||craftProject.charId!==c.id||craftProject.slot!==selectedSlot||craftProject.recipeId!==recipe.id)return'';
  const phase=Math.min(2,craftProject.phase),need=craftProject.needs[phase],prompt=projectPrompt(need),actions=WORKSHOP_ACTIONS[prof.name]||WORKSHOP_ACTIONS.Blacksmithing,tier=qualityTier(craftProject.quality);
  return '<section class="craft-project">'+
    '<header><div><small>ACTIVE WORK ORDER · STEP '+(phase+1)+' / 3</small><h3>'+recipe.name+'</h3><p>'+prompt+'</p></div><button type="button" class="craft-abandon" data-craft-abandon>SET ASIDE</button></header>'+
    '<div class="craft-quality"><span><b>CRAFT QUALITY</b><em>'+tier.label+' · '+craftProject.quality+'%</em></span><i><b style="width:'+craftProject.quality+'%"></b></i></div>'+
    '<div class="craft-action-grid">'+actions.map(a=>'<button type="button" data-craft-action="'+a.key+'"><i>'+a.icon+'</i><span><b>'+a.label+'</b><small>'+a.text+'</small></span></button>').join('')+'</div>'+
    (craftProject.log.length?'<div class="craft-project-log">'+craftProject.log.map(x=>'<span>'+x+'</span>').join('')+'</div>':'')+
  '</section>';
}
async function learnProfession(charId,slot,name){
  const s=state(),c=s.roster.find(x=>x.id===charId),slots=ent().professionSlots;
  if(!c||!characterUsable(c.id)||slot>=slots||!P.PROFESSIONS[name]||c.professions.some(p=>p?.name===name))return;
  c.professions[slot]={name,level:1,xp:0};selectedChar=charId;selectedSlot=slot;s.activity.push(`${c.name} learned ${name}.`);await commit();
}
function renderProfessions(){
  if(!Game?.ready)return;normalise();const s=state(),list=$('#professionCharacterList'),work=$('#professionWorkshop'),grid=$('#reagentGrid');if(!list||!work||!grid)return;
  const usable=usableRoster();if(!selectedChar||!usable.some(c=>c.id===selectedChar))selectedChar=usable[0]?.id||null;
  const selected=s.roster.find(x=>x.id===selectedChar),selectedProf=selected?.professions?.[selectedSlot],selectedDef=professionDef(selectedProf?.name);
  const relevantMaterials=new Set(selectedDef?.recipes?.flatMap(r=>Object.keys(r.inputs))||[]);
  grid.innerHTML=Object.entries(P.MATERIALS).map(([k,m])=>{const rarity=String(m.rarity||'Common'),slug=materialRaritySlug(k),art=P?.materialArtHTML?P.materialArtHTML(k,48,'reagent-material-art'):`<span class="reagent-symbol">${m.icon||'◇'}</span>`;return `<div class="reagent-card rarity-${slug} ${relevantMaterials.has(k)?'relevant':''}" data-rarity="${rarity}" data-endgame="${m.endgame?'1':'0'}"><div class="reagent-icon">${art}</div><div class="reagent-copy"><em class="reagent-rarity rarity-${slug}">${rarity}</em><b>${m.name}</b><small>${m.source}</small></div><strong>${Number(s.materials[k])||0}</strong></div>`}).join('');
  list.innerHTML=usable.map(c=>{const ps=c.professions.filter(Boolean),portrait=CP?.portraitHTML?CP.portraitHTML(c,{size:'fill',className:'profession-roster-portrait',label:c.name+' portrait'}):c.portrait;return `<button class="profession-char ${c.id===selectedChar?'active':''}" data-prof-char="${c.id}"><span class="avatar">${portrait}</span><span><b>${c.name}</b><small>${c.class} · ${c.spec}</small></span><em>${ps.length?ps.map(p=>`${p.name} ${p.level}`).join(' / '):'Untrained'}</em></button>`;}).join('');
  list.querySelectorAll('[data-prof-char]').forEach(b=>b.onclick=()=>{selectedChar=b.dataset.profChar;selectedSlot=0;craftProject=null;lastCraftMessage='';renderProfessions();});
  const c=s.roster.find(x=>x.id===selectedChar);if(!c){work.innerHTML='<div class="profession-empty">No adventurer selected.</div>';return;}
  const slots=ent().professionSlots;$('#workshopTitle').textContent=`${c.name}'s Workshop`;
  const slotHtml=[0,1].map(i=>{const p=c.professions[i],locked=i>=slots;return `<button class="profession-slot-card ${locked?'locked':''} ${selectedSlot===i&&!locked?'active':''}" data-prof-slot="${i}" ${locked?'disabled':''}><small>PROFESSION ${i+1}</small><b>${locked?'Membership Slot':p?.name||'Unlearned'}</b><p>${locked?'Unlocks with membership':p?`Skill ${p.level}/100 · ${p.projectsCompleted||0} projects`:'Choose a trade skill for this adventurer.'}</p></button>`;}).join('');
  const prof=c.professions[selectedSlot];
  let body='';
  if(selectedSlot>=slots)body='<div class="profession-empty">This profession slot is available with membership.</div>';
  else if(!prof){
    const choices=Object.entries(P.PROFESSIONS).filter(([n])=>!c.professions.some(p=>p?.name===n));
    body=`<div class="profession-choice-intro"><small>CHOOSE A CRAFT</small><h3>Give ${c.name} a workshop identity.</h3><p>Each profession now levels through completed projects, quality finishes and increasingly difficult recipes.</p></div><div class="profession-choices">${choices.map(([n,d])=>`<button class="profession-choice" data-learn-prof="${n}"><i>${d.icon}</i><span><b>${n}</b><small>${d.summary}</small></span><em>LEARN →</em></button>`).join('')}</div>`;
  }else{
    const def=professionDef(prof.name),need=prof.level>=100?1:P.skillThreshold(prof.level),pct=prof.level>=100?100:Math.min(100,Math.round((prof.xp/need)*100));
    const nextRecipe=def.recipes.find(r=>r.level>prof.level),masterworks=Number(prof.masterworks)||0,completed=Number(prof.projectsCompleted)||0;
    const profile=`<section class="profession-command-hero"><div class="profession-command-mark">${def.icon}</div><div class="profession-command-copy"><small>ACTIVE TRADE</small><h3>${prof.name}</h3><p>${def.summary}</p><div class="profession-skill-track"><span><b>SKILL ${prof.level}</b><em>${prof.level>=100?'MAXIMUM SKILL':prof.xp+' / '+need+' XP'}</em></span><i><b style="width:${pct}%"></b></i></div></div><div class="profession-command-stats"><span><small>PROJECTS</small><b>${completed}</b></span><span><small>MASTERWORKS</small><b>${masterworks}</b></span><span><small>NEXT RECIPE</small><b>${nextRecipe?'Skill '+nextRecipe.level:'All learned'}</b></span></div></section>`;
    const visible=def.recipes.filter(r=>{const discovered=!r.requiresDiscovery||s.discoveredRecipes.includes(r.id),levelOk=prof.level>=r.level,materialsOk=Object.entries(r.inputs).every(([k,q])=>(Number(s.materials[k])||0)>=q),ok=discovered&&levelOk&&materialsOk;if(recipeFilter==='ready')return ok;if(recipeFilter==='locked')return !ok;if(recipeFilter==='rare')return r.requiresDiscovery||r.endgame;return true});
    const recipes=visible.map(r=>{const discovered=!r.requiresDiscovery||s.discoveredRecipes.includes(r.id),levelOk=prof.level>=r.level,materialsOk=Object.entries(r.inputs).every(([k,q])=>(Number(s.materials[k])||0)>=q),ok=discovered&&levelOk&&materialsOk,busy=Boolean(craftProject),lock=!discovered?'Recipe not discovered':!levelOk?`Requires skill ${r.level}`:!materialsOk?'Missing reagents':'',history=recipeHistory(prof,r.id),outputArt=r.output.category==='consumable'&&P?.consumableArtHTML?P.consumableArtHTML(r.output.key,60,'recipe-output-art'):'';return `<article class="recipe-card profession-recipe-card ${ok?'ready':'locked'} ${craftProject?.recipeId===r.id?'project-active':''}" ${outputArt?'data-item-art-done="1"':''}>${outputArt}<div class="recipe-main"><div class="recipe-kicker"><span>${r.endgame?'END-GAME · ':''}SKILL ${r.level}</span><em>${craftXpLabel(r,prof)}</em></div><h4>${r.name}</h4><p>${recipeInputs(r)} <i>→</i> <b>${r.output.name}</b></p><div class="recipe-history"><span>${history.count||0} completed</span><span>Best ${Math.round(history.best||0)}%</span><span>${history.masterwork?'✓ Masterwork achieved':'Masterwork bonus available'}</span></div>${lock?`<p class="recipe-lock-reason">${lock}</p>`:''}</div><button data-craft="${r.id}" ${ok&&!busy?'':'disabled'}>${busy?(craftProject?.recipeId===r.id?'IN PROGRESS':'WORKSHOP BUSY'):'START PROJECT'}</button></article>`;}).join('');
    const activeRecipe=craftProject&&craftProject.charId===c.id&&craftProject.slot===selectedSlot?def.recipes.find(r=>r.id===craftProject.recipeId):null;
    body=profile+(lastCraftMessage?`<p class="craft-message profession-result-message">${lastCraftMessage}</p>`:'')+(activeRecipe?craftProjectMarkup(c,prof,activeRecipe):'')+`<div class="profession-recipe-heading"><div><small>WORK ORDERS</small><h3>Choose what to make.</h3></div><p>Harder and first-time projects award the most skill XP. Out-levelled recipes remain useful, but become poor training.</p></div><div class="recipe-list">${recipes||'<div class="profession-empty">No recipes match this filter.</div>'}</div>`;
  }
  work.innerHTML=`<div class="profession-slot-grid">${slotHtml}</div>${body}`;
  work.querySelectorAll('[data-prof-slot]').forEach(b=>b.onclick=()=>{selectedSlot=Number(b.dataset.profSlot);craftProject=null;lastCraftMessage='';renderProfessions();});
  work.querySelectorAll('[data-learn-prof]').forEach(b=>b.onclick=()=>learnProfession(c.id,selectedSlot,b.dataset.learnProf));
  work.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>beginCraft(b.dataset.craft));
  work.querySelector('[data-craft-abandon]')?.addEventListener('click',abandonCraft);
  work.querySelectorAll('[data-craft-action]').forEach(b=>b.onclick=()=>resolveCraftStep(b.dataset.craftAction));
  $$('#professionRecipeFilters [data-prof-recipe-filter]').forEach(b=>b.classList.toggle('active',b.dataset.profRecipeFilter===recipeFilter));
  renderCrafted();
}
function consumeStack(key){
  const s=state(),stack=s.consumables.find(x=>x.key===key);if(!stack)return null;
  stack.quantity=(Number(stack.quantity)||1)-1;if(stack.quantity<=0)s.consumables=s.consumables.filter(x=>x!==stack);return stack
}
function equippedTargetKey(c,slot){return P?.itemSignature?.(c?.equipment?.[slot])||null}
async function applyGearEnhancement(key,charId){
  const s=state(),stack=s.consumables.find(x=>x.key===key),payload=stack?.payload||{},c=s.roster.find(x=>x.id===charId),slot=payload.slot;
  if(!stack||payload.effect!=='gear-enhancement'||!c||!characterUsable(c.id)||!slot)return;
  const item=c.equipment?.[slot],signature=equippedTargetKey(c,slot);if(!item?.name||!signature){lastCraftMessage=c.name+' has no equipped '+slot+' item.';renderCrafted();return}
  c.activeEnhancements=c.activeEnhancements&&typeof c.activeEnhancements==='object'?c.activeEnhancements:{};
  c.activeEnhancements[slot]={key:stack.key,name:stack.name,slot,bonuses:{...(payload.bonuses||{})},remainingBosses:Math.max(1,Number(payload.charges)||3),targetSignature:signature,appliedAt:new Date().toISOString()};
  consumeStack(key);s.activity.push(stack.name+' applied to '+c.name+'’s '+slot+'.');lastCraftMessage=stack.name+' applied to '+c.name+' for '+(payload.charges||3)+' boss encounters.';await commit();
}
async function drinkFlask(key,charId){
  const s=state(),stack=s.consumables.find(x=>x.key===key),payload=stack?.payload||{},c=s.roster.find(x=>x.id===charId);
  if(!stack||payload.effect!=='character-flask'||!c||!characterUsable(c.id))return;
  c.activeProfessionBuffs=Array.isArray(c.activeProfessionBuffs)?c.activeProfessionBuffs.filter(x=>x.kind!=='flask'):[];
  c.activeProfessionBuffs.push({kind:'flask',key:stack.key,name:stack.name,bonuses:{...(payload.bonuses||{})},remainingBosses:Math.max(1,Number(payload.charges)||3),appliedAt:new Date().toISOString()});
  consumeStack(key);s.activity.push(c.name+' drank '+stack.name+'.');lastCraftMessage=c.name+' gained '+stack.name+' for '+(payload.charges||3)+' boss encounters.';await commit();
}
async function useCellShockDraught(key,charId){
  const s=state(),stack=s.consumables.find(x=>x.key===key),c=s.roster.find(x=>x.id===charId);if(!stack||!c||!characterUsable(c.id))return;
  c.cellShock=0;c.cellShockLockedUntil=null;consumeStack(key);s.activity.push(c.name+'’s Cell Shock was cleared with '+stack.name+'.');lastCraftMessage=c.name+' is fully recovered.';await commit();
}
function activeEffectText(c){
  const effects=P?.activeEffects?.(c)||[];
  return effects.map(x=>x.name+' · '+(P?.bonusText?.(x.bonuses)||'')+' · '+x.remainingBosses+' boss'+(x.remainingBosses===1?'':'es')).join('<br>');
}
function renderCrafted(){
  const root=$('#craftedInventory');if(!root||!state())return;const s=state();
  const active=s.roster.map(c=>{const txt=activeEffectText(c);return txt?'<article class="crafted-active"><b>'+c.name+'</b><small>'+txt+'</small></article>':''}).filter(Boolean).join('');
  if(!s.consumables.length&&!s.recipeScrolls.length&&!active){root.innerHTML='<div class="profession-empty">Nothing crafted yet.</div>';return;}
  const consumables=s.consumables.map(x=>{
    const p=x.payload||{},desc=p.description||P?.bonusText?.(p.bonuses)||'Tradeable crafted item';
    let action='';
    if(p.effect==='gear-enhancement'){
      action='<select data-craft-target="'+x.key+'">'+usableRoster().map(c=>'<option value="'+c.id+'">'+c.name+' · '+(c.equipment?.[p.slot]?.name||'No '+p.slot)+'</option>').join('')+'</select><button data-apply-enhancement="'+x.key+'">APPLY TO '+String(p.slot||'ITEM').toUpperCase()+'</button>';
    }else if(p.effect==='character-flask'){
      action='<select data-craft-target="'+x.key+'">'+usableRoster().map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select><button data-drink-flask="'+x.key+'">DRINK FLASK</button>';
    }else if(p.effect==='clear-cell-shock'){
      action='<select data-craft-target="'+x.key+'">'+usableRoster().map(c=>'<option value="'+c.id+'">'+c.name+' · Shock '+(c.cellShock||0)+'%</option>').join('')+'</select><button data-clear-shock="'+x.key+'">USE</button>';
    }else if(p.effect==='combat-potion'){
      action='<em>Use during a dungeon with the USE CONSUMABLE combat command.</em>';
    }
    const art=P?.consumableArtHTML?P.consumableArtHTML(x.key,48,'crafted-item-art'):'';return '<div class="crafted-card">'+art+'<strong>×'+(x.quantity||1)+'</strong><b>'+x.name+'</b><small>'+desc+'</small>'+action+'</div>';
  }).join('');
  const scrolls=s.recipeScrolls.map(x=>{const art=window.CellboundItemArt?.artHTML?.({id:'recipe-'+x.recipeId,name:x.name,category:'recipe',rarity:'Rare'},48,'crafted-item-art')||'▤';return '<div class="crafted-card">'+art+'<strong>×'+(x.quantity||1)+'</strong><b>'+x.name+'</b><small>Rare tradeable recipe scroll</small><button data-learn-scroll="'+x.recipeId+'">LEARN</button></div>'}).join('');
  root.innerHTML=(lastCraftMessage?'<p class="craft-message">'+lastCraftMessage+'</p>':'')+(active?'<div class="crafted-active-grid"><small>ACTIVE PROFESSION EFFECTS</small>'+active+'</div>':'')+consumables+scrolls;
  root.querySelectorAll('[data-learn-scroll]').forEach(b=>b.onclick=async()=>{const x=s.recipeScrolls.find(v=>v.recipeId===b.dataset.learnScroll);if(!x)return;if(!s.discoveredRecipes.includes(x.recipeId))s.discoveredRecipes.push(x.recipeId);x.quantity--;if(x.quantity<=0)s.recipeScrolls=s.recipeScrolls.filter(v=>v!==x);s.activity.push(x.name+' learned.');await commit();});
  root.querySelectorAll('[data-apply-enhancement]').forEach(b=>b.onclick=()=>{const sel=root.querySelector('[data-craft-target="'+b.dataset.applyEnhancement+'"]');applyGearEnhancement(b.dataset.applyEnhancement,sel?.value)});
  root.querySelectorAll('[data-drink-flask]').forEach(b=>b.onclick=()=>{const sel=root.querySelector('[data-craft-target="'+b.dataset.drinkFlask+'"]');drinkFlask(b.dataset.drinkFlask,sel?.value)});
  root.querySelectorAll('[data-clear-shock]').forEach(b=>b.onclick=()=>{const sel=root.querySelector('[data-craft-target="'+b.dataset.clearShock+'"]');useCellShockDraught(b.dataset.clearShock,sel?.value)});
}
function renderSellOptions(){return window.CellboundTradingPostV3?.refresh?.(false)}
async function loadMarket(){return window.CellboundTradingPostV3?.refresh?.()}
function bind(){
  document.querySelectorAll('.nav-btn[data-view="professions"]').forEach(b=>b.addEventListener('click',renderProfessions));
  document.querySelectorAll('#professionRecipeFilters [data-prof-recipe-filter]').forEach(b=>b.addEventListener('click',()=>{recipeFilter=b.dataset.profRecipeFilter||'all';renderProfessions()}));
  window.addEventListener('cellbound:view-changed',e=>{
    if(e.detail?.view==='professions')renderProfessions();
  });
}
async function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,80);return;}P&&normalise();db=Game.getSupabase();user=Game.getUser();if(!db||!user)return;
  bind();renderProfessions();renderCrafted();
  window.CellboundEconomy={
    renderProfessions,
    loadMarket,
    renderTrading:()=>window.CellboundTradingPostV3?.refresh?.(),
    processInbox,
    claimProceeds,
    renderCrafted
  };
}
init();
})();