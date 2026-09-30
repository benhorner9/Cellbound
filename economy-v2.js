(()=>{
'use strict';
const G=window.CellboundGear,P=window.CellboundProfessions,CP=window.CellboundPortraits;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let Game=null,db=null,user=null,selectedChar=null,selectedSlot=0,tradeFilter='all',market=[],lastCraftMessage='',craftProject=null,recipeFilter='all',craftQtyDraft={},craftTicker=null,craftLastTick=0,craftSaveAt=0,craftCompleting=false;

const state=()=>Game?.getState?.();
const ent=()=>Game?.getEntitlements?.()||{professionSlots:1};
const usableRoster=()=>state()?.roster?.filter(c=>Game?.isCharacterRosterUnlocked?.(c.id)!==false)||[];
const characterUsable=id=>Game?.isCharacterRosterUnlocked?.(id)!==false;
const materialName=k=>P?.MATERIALS?.[k]?.name||k;
const professionDef=n=>P?.PROFESSIONS?.[n]||null;

function normalise(){
  const s=state();if(!s)return;
  s.materials=s.materials&&typeof s.materials==='object'?s.materials:{};
  s.consumables=(Array.isArray(s.consumables)?s.consumables:[]).map(stack=>{
    const meta=P?.recipeMetaForOutputKey?.(stack?.key),latest=meta?.recipe?.output||{},latestPayload=latest.payload||{},refreshable=['gear-enhancement','socket-gem'].includes(latestPayload.effect);
    return refreshable?{...stack,payload:{...(stack.payload||{}),...latestPayload,bonuses:{...(latestPayload.bonuses||stack.payload?.bonuses||{})}},rarity:stack.rarity||latest.rarity||P?.craftedRarity?.(meta?.recipe?.level,meta?.recipe?.endgame)||'Uncommon'}:stack
  });
  s.recipeScrolls=Array.isArray(s.recipeScrolls)?s.recipeScrolls:[];
  s.discoveredRecipes=Array.isArray(s.discoveredRecipes)?s.discoveredRecipes:[];
  s.tradeInbox=Array.isArray(s.tradeInbox)?s.tradeInbox:[];
  if(!craftProject&&s.workshopCraftProject&&typeof s.workshopCraftProject==='object'){
    craftProject=s.workshopCraftProject;
    craftProject.quantity=Math.max(1,Number(craftProject.quantity)||1);
    craftProject.totalMs=Math.max(1000,Number(craftProject.totalMs)||1000);
    craftProject.remainingMs=Math.max(0,Number(craftProject.remainingMs)||0);
    craftProject.reservedInputs=craftProject.reservedInputs&&typeof craftProject.reservedInputs==='object'?craftProject.reservedInputs:{};
    craftProject.paused=true;
  }else if(craftProject&&s.workshopCraftProject!==craftProject)s.workshopCraftProject=craftProject;
  s.roster.forEach(c=>{
    c.professions=Array.isArray(c.professions)?c.professions.slice(0,1):[null];while(c.professions.length<1)c.professions.push(null);
    c.professions=c.professions.map(p=>p?{...p,name:p.name,level:Math.max(1,Math.min(100,Number(p.level)||1)),xp:Math.max(0,Number(p.xp)||0),craftHistory:p.craftHistory&&typeof p.craftHistory==='object'?p.craftHistory:{},masterworks:Math.max(0,Number(p.masterworks)||0),projectsCompleted:Math.max(0,Number(p.projectsCompleted)||0)}:null);
    c.activeEnhancements=c.activeEnhancements&&typeof c.activeEnhancements==='object'?c.activeEnhancements:{};
    Object.entries(c.activeEnhancements).forEach(([slot,e])=>{
      const item=c.equipment?.[slot],matches=item&&P?.itemSignature?.(item)===e?.targetSignature;if(!matches)return;
      const meta=P?.recipeMetaForOutputKey?.(e.key),recipe=meta?.recipe;
      item.attachment=item.attachment||{key:e.key,name:e.name,bonuses:{...(e.bonuses||{})},profession:meta?.profession||null,skill:Number(recipe?.level)||null,tier:P?.attachmentTier?.(recipe?.level)||null,rarity:recipe?.output?.rarity||'Uncommon',attachedAt:e.appliedAt||new Date().toISOString()};
      delete c.activeEnhancements[slot]
    });
    c.activeProfessionBuffs=Array.isArray(c.activeProfessionBuffs)?c.activeProfessionBuffs:[];
  });
}
function addConsumable(item,qty=1,boundCrafter=null){
  const s=state(),key=item.key||item.itemKey,name=item.name||item.itemName||key,meta=P?.recipeMetaForOutputKey?.(key),payload={...(item.payload||{})},rarity=item.rarity||meta?.recipe?.output?.rarity||P?.craftedRarity?.(meta?.recipe?.level,meta?.recipe?.endgame)||'Uncommon';
  if(payload.crafterOnly&&boundCrafter){payload.boundCharacterId=boundCrafter.id;payload.boundCharacterName=boundCrafter.name;payload.requiredProfession=payload.requiredProfession||meta?.profession||null}
  const boundId=payload.boundCharacterId||null,found=s.consumables.find(x=>x.key===key&&(x.payload?.boundCharacterId||null)===boundId);
  if(found){found.quantity=(found.quantity||1)+qty;found.payload={...(found.payload||{}),...payload};found.rarity=rarity||found.rarity;found.tradeState=payload.crafterOnly?'soulbound':(found.tradeState||item.tradeState||'tradeable')}
  else s.consumables.push({key,name,payload,rarity,tradeState:payload.crafterOnly?'soulbound':(item.tradeState||'tradeable'),quantity:qty});
}
async function commit(render=true){
  Game.save();await Game.persistState();if(render){Game.renderAll();renderProfessions();renderSellOptions();}
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
  ],
  Jewelcrafting:[
    {key:'precision',icon:'◆',label:'Cut Facet',text:'Correct the angle before the cut is committed.'},
    {key:'tempo',icon:'✧',label:'Polish Edge',text:'Work the surface while the crystal remains responsive.'},
    {key:'stability',icon:'◇',label:'Set Fracture',text:'Stabilise the gem before internal stress spreads.'}
  ],
  Engineering:[
    {key:'precision',icon:'⚙',label:'Calibrate',text:'Tune the mechanism to exact tolerances.'},
    {key:'tempo',icon:'↯',label:'Power Circuit',text:'Drive current through the open circuit now.'},
    {key:'stability',icon:'⬡',label:'Brace Assembly',text:'Lock the device before the housing shifts.'}
  ],
  Cooking:[
    {key:'precision',icon:'♨',label:'Season',text:'Correct the balance before the flavour is fixed.'},
    {key:'tempo',icon:'↯',label:'Work Heat',text:'Use the heat while the timing window is open.'},
    {key:'stability',icon:'◇',label:'Set Dish',text:'Bring the preparation together before it breaks.'}
  ],
  Reliccrafting:[
    {key:'precision',icon:'◈',label:'Align Core',text:'Seat the core geometry with exact placement.'},
    {key:'tempo',icon:'↯',label:'Pulse Charge',text:'Push power through the core while it will accept it.'},
    {key:'stability',icon:'⬡',label:'Bind Matrix',text:'Anchor the relic matrix before it destabilises.'}
  ],
  Scribing:[
    {key:'precision',icon:'✒',label:'Inscribe',text:'Correct the line before the sigil is sealed.'},
    {key:'tempo',icon:'↯',label:'Set Intent',text:'Commit the wording while the pattern is active.'},
    {key:'stability',icon:'◇',label:'Seal Script',text:'Bind the manuscript before the ink loses charge.'}
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
  if(score>=90)return{key:'masterwork',label:'MASTERWORK',xp:1.25};
  if(score>=65)return{key:'fine',label:'FINE',xp:1.08};
  return{key:'standard',label:'STANDARD',xp:.92};
}
function recipeHistory(prof,recipeId){
  prof.craftHistory=prof.craftHistory&&typeof prof.craftHistory==='object'?prof.craftHistory:{};
  return prof.craftHistory[recipeId]||{count:0,best:0,masterwork:false};
}
function craftXp(recipe,prof,tier,exactCount){
  const history=recipeHistory(prof,recipe.id),gap=Math.max(0,(Number(prof.level)||1)-(Number(recipe.level)||1)),trainingScale=Math.max(.1,Number(recipe.trainingScale)||1);
  let relevance=1;
  if(gap>50)relevance=.04;else if(gap>35)relevance=.12;else if(gap>20)relevance=.35;else if(gap>10)relevance=.7;
  const freshness=history.count===0?1.45:history.count<3?1.10:1;
  let xp=Math.round(((Number(recipe.xp)||18)*5.5+35)*relevance*freshness*tier.xp*trainingScale);
  if(tier.key==='masterwork'&&!history.masterwork)xp+=Math.round((90+Math.round((Number(recipe.level)||1)*2))*trainingScale);
  if(exactCount===3)xp+=Math.round(15*trainingScale);
  return Math.max(2,xp);
}
function craftXpLabel(recipe,prof){
  const h=recipeHistory(prof,recipe.id),gap=Math.max(0,prof.level-recipe.level);
  if(recipe.crafterOnly)return'PERSONAL PERK · REDUCED TRAINING XP';
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
function maxCraftable(recipe,prof){
  if(!prof||prof.level<recipe.level)return 0;
  if(recipe.requiresDiscovery&&!state().discoveredRecipes.includes(recipe.id))return 0;
  const caps=Object.entries(recipe.inputs).map(([k,q])=>Math.floor((Number(state().materials[k])||0)/Math.max(1,Number(q)||1)));
  return Math.max(0,Math.min(99,caps.length?Math.min(...caps):99));
}
function craftSecondsPerUnit(recipe){
  const band=Math.floor(Math.max(0,(Number(recipe.level)||1)-1)/20);
  return 6+band*2+(recipe.endgame?6:0);
}
function craftBatchDurationMs(recipe,quantity){return Math.max(1000,craftSecondsPerUnit(recipe)*1000*Math.max(1,Number(quantity)||1))}
function craftTime(ms){
  const sec=Math.max(0,Math.ceil((Number(ms)||0)/1000)),m=Math.floor(sec/60),s=sec%60;
  return m?m+':'+String(s).padStart(2,'0'):s+'s';
}
function craftFocusActive(){
  return document.visibilityState==='visible'&&Boolean(document.querySelector('#professions.view.active'));
}
function craftQuantity(recipeId,max){
  const raw=Math.max(1,Math.floor(Number(craftQtyDraft[recipeId])||1));
  return Math.max(1,Math.min(Math.max(1,max||1),raw));
}
function setCraftQuantity(recipeId,value,max){
  craftQtyDraft[recipeId]=Math.max(1,Math.min(Math.max(1,max||1),Math.floor(Number(value)||1)));
}
function setCraftProject(project){
  craftProject=project||null;
  const s=state();if(s)s.workshopCraftProject=craftProject;
}
function reserveCraftInputs(recipe,quantity){
  const s=state(),reserved={};
  Object.entries(recipe.inputs).forEach(([k,q])=>{
    const amount=Math.max(0,(Number(q)||0)*quantity);reserved[k]=amount;s.materials[k]=Math.max(0,(Number(s.materials[k])||0)-amount)
  });
  return reserved
}
function returnReservedInputs(project){
  const s=state();Object.entries(project?.reservedInputs||{}).forEach(([k,q])=>s.materials[k]=(Number(s.materials[k])||0)+Math.max(0,Number(q)||0))
}
function timedCraftQuality(recipe,prof){
  const gap=Math.max(0,(Number(prof?.level)||1)-(Number(recipe.level)||1));
  return Math.max(35,Math.min(100,Math.round(55+Math.min(18,gap*.35)+Math.random()*40)));
}
async function beginCraft(recipeId){
  if(craftProject)return;
  const s=state(),c=s.roster.find(x=>x.id===selectedChar),prof=c?.professions?.[selectedSlot],def=professionDef(prof?.name),recipe=def?.recipes.find(r=>r.id===recipeId);
  if(!c||!characterUsable(c.id)||!recipe)return;
  const max=maxCraftable(recipe,prof),quantity=craftQuantity(recipe.id,max);if(max<1||quantity>max)return;
  const totalMs=craftBatchDurationMs(recipe,quantity),reservedInputs=reserveCraftInputs(recipe,quantity);
  setCraftProject({version:2,charId:c.id,slot:selectedSlot,profession:prof.name,recipeId:recipe.id,quantity,totalMs,remainingMs:totalMs,reservedInputs,startedAt:new Date().toISOString(),paused:!craftFocusActive()});
  craftLastTick=0;craftSaveAt=0;lastCraftMessage='';
  s.activity.push(c.name+' started a '+recipe.name+' work order ×'+quantity+'.');
  Game.save();await Game.persistState();renderProfessions();ensureCraftTicker()
}
async function abandonCraft(){
  const project=craftProject;if(!project)return;
  const s=state(),c=s.roster.find(x=>x.id===project.charId),def=professionDef(project.profession),recipe=def?.recipes.find(r=>r.id===project.recipeId);
  returnReservedInputs(project);setCraftProject(null);craftLastTick=0;craftCompleting=false;
  lastCraftMessage='Work order cancelled. Reserved reagents were returned.';
  if(c&&recipe)s.activity.push(c.name+' cancelled '+recipe.name+' ×'+project.quantity+'.');
  Game.save();await Game.persistState();renderProfessions()
}
async function finishTimedCraft(){
  if(craftCompleting||!craftProject)return;craftCompleting=true;
  const project=craftProject,s=state(),c=s.roster.find(x=>x.id===project.charId),prof=c?.professions?.[project.slot],def=professionDef(project.profession),recipe=def?.recipes.find(r=>r.id===project.recipeId);
  if(!c||!prof||!recipe){
    returnReservedInputs(project);setCraftProject(null);craftLastTick=0;craftCompleting=false;lastCraftMessage='The work order could not be completed. Reserved reagents were returned.';await commit();return
  }
  const quantity=Math.max(1,Number(project.quantity)||1),history=recipeHistory(prof,recipe.id),firstInput=Object.keys(recipe.inputs)[0];
  let xpTotal=0,masterworks=0,best=0,reclaimed=0;
  for(let i=0;i<quantity;i++){
    const quality=timedCraftQuality(recipe,prof),tier=qualityTier(quality),xp=craftXp(recipe,prof,tier,0);
    xpTotal+=xp;best=Math.max(best,quality);
    if(tier.key==='masterwork'){masterworks++;if(firstInput){s.materials[firstInput]=(Number(s.materials[firstInput])||0)+1;reclaimed++}}
    history.count=(Number(history.count)||0)+1;
    history.best=Math.max(Number(history.best)||0,quality);
    if(tier.key==='masterwork'&&!history.masterwork){history.masterwork=true;prof.masterworks=(Number(prof.masterworks)||0)+1}
  }
  const out=recipe.output,outputQuantity=(Number(out.quantity)||1)*quantity;
  if(out.category==='consumable')addConsumable(out,outputQuantity,recipe.crafterOnly?c:null);
  else if(out.category==='material')Game.addMaterial(out.key,outputQuantity);
  professionLevelUp(prof,xpTotal);prof.craftHistory[recipe.id]=history;prof.projectsCompleted=(Number(prof.projectsCompleted)||0)+quantity;
  s.activity.push(c.name+' completed '+recipe.name+' ×'+quantity+' after '+craftTime(project.totalMs)+' of focused workshop time.');
  lastCraftMessage=out.name+' ×'+outputQuantity+' completed'+(recipe.crafterOnly?' · BOUND TO '+c.name.toUpperCase():'')+' · +'+xpTotal+' profession XP'+(masterworks?' · '+masterworks+' masterwork'+(masterworks===1?'':'s'):'')+(reclaimed?' · '+reclaimed+' reagent'+(reclaimed===1?'':'s')+' reclaimed':'');
  setCraftProject(null);craftLastTick=0;craftCompleting=false;await commit()
}
function updateCraftTimerUI(){
  if(!craftProject)return;
  const remaining=$('[data-craft-remaining]'),fill=$('[data-craft-progress]'),status=$('[data-craft-status]'),pct=Math.max(0,Math.min(100,(1-(craftProject.remainingMs/Math.max(1,craftProject.totalMs)))*100));
  if(remaining)remaining.textContent=craftTime(craftProject.remainingMs);
  if(fill)fill.style.width=pct.toFixed(2)+'%';
  if(status)status.textContent=craftFocusActive()?'WORKSHOP ACTIVE':'PAUSED · RETURN TO PROFESSIONS';
}
function pauseCraftTimer(){
  if(!craftProject)return;
  const changed=Boolean(craftLastTick)||craftProject.paused!==true;craftLastTick=0;craftProject.paused=true;
  if(changed)Game?.save?.();updateCraftTimerUI();
  if(craftTicker){clearInterval(craftTicker);craftTicker=null}
}
function tickCraft(){
  if(!craftProject){craftLastTick=0;if(craftTicker){clearInterval(craftTicker);craftTicker=null}return}
  if(!craftFocusActive()){pauseCraftTimer();return}
  const now=Date.now();
  if(!craftLastTick){craftLastTick=now;craftProject.paused=false;updateCraftTimerUI();return}
  const delta=Math.max(0,now-craftLastTick);craftLastTick=now;craftProject.paused=false;craftProject.remainingMs=Math.max(0,(Number(craftProject.remainingMs)||0)-delta);
  if(now-craftSaveAt>900){craftSaveAt=now;Game?.save?.()}
  updateCraftTimerUI();
  if(craftProject.remainingMs<=0)finishTimedCraft()
}
function ensureCraftTicker(){
  if(craftTicker||!craftProject)return;
  craftTicker=setInterval(tickCraft,250);tickCraft()
}
function craftProjectMarkup(c,prof,recipe){
  if(!craftProject||craftProject.charId!==c.id||craftProject.slot!==selectedSlot||craftProject.recipeId!==recipe.id)return'';
  const quantity=Math.max(1,Number(craftProject.quantity)||1),outQty=(Number(recipe.output.quantity)||1)*quantity,pct=Math.max(0,Math.min(100,(1-(craftProject.remainingMs/Math.max(1,craftProject.totalMs)))*100));
  return '<section class="craft-project timed-craft-project">'+
    '<header><div><small>ACTIVE WORK ORDER · BATCH ×'+quantity+'</small><h3>'+recipe.name+'</h3><p>Focused crafting only. The timer advances while Professions is open and the app is active; leaving the workshop pauses it.</p></div><button type="button" class="craft-abandon" data-craft-abandon>CANCEL ORDER</button></header>'+
    '<div class="craft-timer-head"><span><b data-craft-status>'+(craftFocusActive()?'WORKSHOP ACTIVE':'PAUSED · RETURN TO PROFESSIONS')+'</b><small>OUTPUT ×'+outQty+' · '+craftSecondsPerUnit(recipe)+'s PER CRAFT</small></span><strong data-craft-remaining>'+craftTime(craftProject.remainingMs)+'</strong></div>'+
    '<div class="craft-timer-track"><i data-craft-progress style="width:'+pct.toFixed(2)+'%"></i></div>'+
    '<div class="craft-batch-rules"><span><b>FOCUS REQUIRED</b><small>Switching to another game screen pauses progress.</small></span><span><b>REAGENTS RESERVED</b><small>Materials are held for the whole batch and returned if cancelled.</small></span><span><b>NO OFFLINE PROGRESS</b><small>Closing or backgrounding the app pauses the timer.</small></span></div>'+
  '</section>';
}
async function learnProfession(charId,slot,name){
  const s=state(),c=s.roster.find(x=>x.id===charId),slots=ent().professionSlots;
  if(!c||!characterUsable(c.id)||slot>=slots||!P.PROFESSIONS[name]||c.professions.some(p=>p?.name===name))return;
  c.professions[slot]={name,level:1,xp:0};selectedChar=charId;selectedSlot=slot;s.activity.push(`${c.name} learned ${name}.`);await commit();
}
function recipeAvailability(recipe,prof,s){
  const discovered=!recipe.requiresDiscovery||s.discoveredRecipes.includes(recipe.id);
  const levelOk=prof.level>=recipe.level;
  const materialsOk=Object.entries(recipe.inputs).every(([key,qty])=>(Number(s.materials[key])||0)>=qty);
  const ready=discovered&&levelOk&&materialsOk;
  const lock=!discovered?'Recipe not discovered':!levelOk?`Requires skill ${recipe.level}`:!materialsOk?'Missing reagents':'';
  return{discovered,levelOk,materialsOk,ready,lock};
}
function recipeMatchesFilter(recipe,prof,s){
  const {ready}=recipeAvailability(recipe,prof,s);
  if(recipeFilter==='ready')return ready;
  if(recipeFilter==='locked')return !ready;
  if(recipeFilter==='rare')return Boolean(recipe.requiresDiscovery||recipe.endgame);
  return true;
}
function recipeCardMarkup(recipe,prof,s){
  const availability=recipeAvailability(recipe,prof,s),busy=Boolean(craftProject),history=recipeHistory(prof,recipe.id),max=maxCraftable(recipe,prof),ready=availability.ready&&max>0,lock=availability.lock||(!max&&availability.ready?'Missing reagents':'');
  const outputArt=recipe.output.category==='consumable'&&P?.consumableArtHTML
    ?P.consumableArtHTML(recipe.output.key,60,'recipe-output-art')
    :'';
  const stateClass=ready?'ready':'locked',projectClass=craftProject?.recipeId===recipe.id?' project-active':'',qty=craftQuantity(recipe.id,max),duration=craftTime(craftBatchDurationMs(recipe,qty)),yieldQty=(Number(recipe.output.quantity)||1)*qty;
  const controls=busy
    ?'<div class="recipe-batch-order busy"><small>'+(craftProject?.recipeId===recipe.id?'THIS BATCH IS RUNNING':'WORKSHOP BUSY')+'</small><button disabled>'+(craftProject?.recipeId===recipe.id?'IN PROGRESS':'WAIT FOR ACTIVE ORDER')+'</button></div>'
    :'<div class="recipe-batch-order"><small>AMOUNT · MAX '+max+'</small><div><button type="button" data-craft-qty-minus="'+recipe.id+'" '+(qty<=1?'disabled':'')+'>−</button><input type="number" inputmode="numeric" min="1" max="'+Math.max(1,max)+'" value="'+qty+'" data-craft-qty="'+recipe.id+'" '+(ready?'':'disabled')+'><button type="button" data-craft-qty-plus="'+recipe.id+'" '+(qty>=max?'disabled':'')+'>+</button></div><em>Yields ×'+yieldQty+' · '+duration+'</em><button data-craft="'+recipe.id+'" '+(ready?'':'disabled')+'>START WORK ORDER</button></div>';
  return `<article class="recipe-card profession-recipe-card ${stateClass}${projectClass}" ${outputArt?'data-item-art-done="1"':''}>
    ${outputArt}
    <div class="recipe-main">
      <div class="recipe-kicker"><span>${recipe.endgame?'END-GAME · ':''}${recipe.crafterOnly?'CRAFTER ONLY · ':''}SKILL ${recipe.level}</span><em>${craftXpLabel(recipe,prof)}</em></div>
      <h4>${recipe.name}</h4>
      <p>${recipeInputs(recipe)} <i>→</i> <b>${recipe.output.name}</b></p>
      <div class="recipe-history"><span>${history.count||0} completed</span><span>Best ${Math.round(history.best||0)}%</span><span>${history.masterwork?'✓ Masterwork achieved':'Masterwork bonus available'}</span></div>
      ${lock?`<p class="recipe-lock-reason">${lock}</p>`:''}
    </div>
    ${controls}
  </article>`;
}
function renderProfessions(){
  if(!Game?.ready)return;normalise();const s=state(),list=$('#professionCharacterList'),work=$('#professionWorkshop'),grid=$('#reagentGrid');if(!list||!work||!grid)return;
  const usable=usableRoster();if(craftProject){selectedChar=craftProject.charId;selectedSlot=Number(craftProject.slot)||0}else if(!selectedChar||!usable.some(c=>c.id===selectedChar))selectedChar=usable[0]?.id||null;
  const selected=s.roster.find(x=>x.id===selectedChar),selectedProf=selected?.professions?.[selectedSlot],selectedDef=professionDef(selectedProf?.name);
  const relevantMaterials=new Set(selectedDef?.recipes?.flatMap(r=>Object.keys(r.inputs))||[]);
  grid.innerHTML=Object.entries(P.MATERIALS).map(([k,m])=>{const rarity=String(m.rarity||'Common'),slug=materialRaritySlug(k),art=P?.materialArtHTML?P.materialArtHTML(k,48,'reagent-material-art'):`<span class="reagent-symbol">${m.icon||'◇'}</span>`;return `<div class="reagent-card rarity-${slug} ${relevantMaterials.has(k)?'relevant':''}" data-rarity="${rarity}" data-endgame="${m.endgame?'1':'0'}"><div class="reagent-icon">${art}</div><div class="reagent-copy"><em class="reagent-rarity rarity-${slug}">${rarity}</em><b>${m.name}</b><small>${m.source}</small></div><strong>${Number(s.materials[k])||0}</strong></div>`}).join('');
  list.innerHTML=usable.map(c=>{const ps=c.professions.filter(Boolean),portrait=CP?.portraitHTML?CP.portraitHTML(c,{size:'fill',className:'profession-roster-portrait',label:c.name+' portrait'}):c.portrait;return `<button class="profession-char ${c.id===selectedChar?'active':''}" data-prof-char="${c.id}"><span class="avatar">${portrait}</span><span><b>${c.name}</b><small>${c.class} · ${c.spec}</small></span><em>${ps.length?ps.map(p=>`${p.name} ${p.level}`).join(' / '):'Untrained'}</em></button>`;}).join('');
  list.querySelectorAll('[data-prof-char]').forEach(b=>b.onclick=()=>{if(craftProject)return;selectedChar=b.dataset.profChar;selectedSlot=0;lastCraftMessage='';renderProfessions();});
  const c=s.roster.find(x=>x.id===selectedChar);if(!c){work.innerHTML='<div class="profession-empty">No adventurer selected.</div>';return;}
  const slots=ent().professionSlots;$('#workshopTitle').textContent=`${c.name}'s Workshop`;
  const slotHtml=[0].map(i=>{const p=c.professions[i];return `<button class="profession-slot-card ${selectedSlot===i?'active':''}" data-prof-slot="${i}"><small>PROFESSION</small><b>${p?.name||'Unlearned'}</b><p>${p?`Skill ${p.level}/100 · ${p.projectsCompleted||0} projects`:'Choose a trade skill for this adventurer.'}</p></button>`;}).join('');
  const prof=c.professions[selectedSlot];
  let body='';
  if(!prof){
    const choices=Object.entries(P.PROFESSIONS).filter(([n])=>!c.professions.some(p=>p?.name===n));
    body=`<div class="profession-choice-intro"><small>CHOOSE A CRAFT</small><h3>Give ${c.name} a workshop identity.</h3><p>Each profession now levels through completed projects, quality finishes and increasingly difficult recipes.</p></div><div class="profession-choices">${choices.map(([n,d])=>`<button class="profession-choice" data-learn-prof="${n}"><i>${d.icon}</i><span><b>${n}</b><small>${d.summary}</small></span><em>LEARN →</em></button>`).join('')}</div>`;
  }else{
    const def=professionDef(prof.name),need=prof.level>=100?1:P.skillThreshold(prof.level),pct=prof.level>=100?100:Math.min(100,Math.round((prof.xp/need)*100));
    const nextRecipe=def.recipes.find(r=>r.level>prof.level),masterworks=Number(prof.masterworks)||0,completed=Number(prof.projectsCompleted)||0;
    const profile=`<section class="profession-command-hero"><div class="profession-command-mark">${def.icon}</div><div class="profession-command-copy"><small>ACTIVE TRADE</small><h3>${prof.name}</h3><p>${def.summary}</p><div class="profession-skill-track"><span><b>SKILL ${prof.level}</b><em>${prof.level>=100?'MAXIMUM SKILL':prof.xp+' / '+need+' XP'}</em></span><i><b style="width:${pct}%"></b></i></div></div><div class="profession-command-stats"><span><small>PROJECTS</small><b>${completed}</b></span><span><small>MASTERWORKS</small><b>${masterworks}</b></span><span><small>NEXT RECIPE</small><b>${nextRecipe?'Skill '+nextRecipe.level:'All learned'}</b></span></div></section>`;
    const visible=def.recipes.filter(r=>recipeMatchesFilter(r,prof,s));
    const recipes=visible.map(r=>recipeCardMarkup(r,prof,s)).join('');
    const activeRecipe=craftProject&&craftProject.charId===c.id&&craftProject.slot===selectedSlot?def.recipes.find(r=>r.id===craftProject.recipeId):null;
    body=profile+(lastCraftMessage?`<p class="craft-message profession-result-message">${lastCraftMessage}</p>`:'')+(activeRecipe?craftProjectMarkup(c,prof,activeRecipe):'')+`<div class="profession-recipe-heading"><div><small>WORK ORDERS</small><h3>Choose what to make and how many.</h3></div><p>Batch crafting uses focused workshop time. Leave Professions or background the app and the timer pauses until you return.</p></div><div class="recipe-list">${recipes||'<div class="profession-empty">No recipes match this filter.</div>'}</div>`;
  }
  work.innerHTML=`<div class="profession-slot-grid">${slotHtml}</div>${body}`;
  work.querySelectorAll('[data-prof-slot]').forEach(b=>b.onclick=()=>{if(craftProject)return;selectedSlot=Number(b.dataset.profSlot);lastCraftMessage='';renderProfessions();});
  work.querySelectorAll('[data-learn-prof]').forEach(b=>b.onclick=()=>learnProfession(c.id,selectedSlot,b.dataset.learnProf));
  work.querySelectorAll('[data-craft-qty]').forEach(input=>input.onchange=()=>{const recipe=prof?professionDef(prof.name)?.recipes.find(r=>r.id===input.dataset.craftQty):null,max=recipe?maxCraftable(recipe,prof):1;setCraftQuantity(input.dataset.craftQty,input.value,max);renderProfessions()});
  work.querySelectorAll('[data-craft-qty-minus]').forEach(b=>b.onclick=()=>{const id=b.dataset.craftQtyMinus,recipe=professionDef(prof?.name)?.recipes.find(r=>r.id===id),max=recipe?maxCraftable(recipe,prof):1;setCraftQuantity(id,craftQuantity(id,max)-1,max);renderProfessions()});
  work.querySelectorAll('[data-craft-qty-plus]').forEach(b=>b.onclick=()=>{const id=b.dataset.craftQtyPlus,recipe=professionDef(prof?.name)?.recipes.find(r=>r.id===id),max=recipe?maxCraftable(recipe,prof):1;setCraftQuantity(id,craftQuantity(id,max)+1,max);renderProfessions()});
  work.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>beginCraft(b.dataset.craft));
  work.querySelector('[data-craft-abandon]')?.addEventListener('click',abandonCraft);
  document.querySelectorAll('#professionRecipeFilters [data-prof-recipe-filter]').forEach(b=>b.classList.toggle('active',b.dataset.profRecipeFilter===recipeFilter));
  if(craftProject)ensureCraftTicker();
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
    if(e.detail?.view==='professions'){renderProfessions();ensureCraftTicker()}
    else pauseCraftTimer();
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){ensureCraftTicker();tickCraft()}else pauseCraftTimer()});
  window.addEventListener('blur',pauseCraftTimer);
  window.addEventListener('focus',()=>{ensureCraftTicker();tickCraft()});
}
async function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,80);return;}P&&normalise();db=Game.getSupabase();user=Game.getUser();if(!db||!user)return;
  bind();renderProfessions();if(craftProject)ensureCraftTicker();
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