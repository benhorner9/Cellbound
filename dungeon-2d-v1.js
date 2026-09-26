(()=>{
'use strict';
window.CellboundCombatStandard?.register?.('ashen-vault',{kind:'dungeon',execution:'local',ui:'shared-cb2d'});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const STAGES=[
 {id:'broken-gate',title:'The Broken Gate',kind:'trash',level:3,enemyTypes:['trash','trash','trash'],knowledge:'ashwarden',base:86,enemies:['Ash Cultist','Cinder Hound','Cinder Hound'],mechanics:[['Searing Bolt','interrupt',1600],['Hound Rush','line',1200]]},
 {id:'hall-embers',title:'Hall of Embers',kind:'trash',level:3,enemyTypes:['elite','trash','trash'],knowledge:'ashwarden',base:82,enemies:['Ash Guardian','Ember Acolyte','Ember Acolyte'],mechanics:[['Ember Channel','interrupt',1800],['Guardian Sweep','cone',1500]]},
 {id:'kael',title:'Ash Warden Kael',kind:'boss',level:4,enemyTypes:['boss'],bossId:'ashwarden',knowledge:'ashwarden',base:78,enemies:['Ash Warden Kael'],mechanics:[['Warden Cleave','cone',2100],['Cinder Guard','adds',1400],['Execution Arc','cone',1800]]},
 {id:'furnace',title:'The Furnace Passage',kind:'event',level:4,enemyTypes:['trash','elite'],knowledge:'embermaw',base:80,enemies:['Cinder Hound','Furnace Wisp'],mechanics:[['Furnace Vents','circles',1700],['Cinder Rush','line',1200]]},
 {id:'embermaw',title:'Embermaw',kind:'boss',level:4,enemyTypes:['boss'],bossId:'embermaw',knowledge:'embermaw',base:74,enemies:['Embermaw'],mechanics:[['Ember Roar','interrupt',2400],['Flame Burst','circle',1900],['Tail Furnace','cone',1700]]},
 {id:'vault-depths',title:'The Vault Depths',kind:'trash',level:4,enemyTypes:['elite','trash','trash'],knowledge:'vaultheart',base:78,enemies:['Soul Binder','Ash Guardian','Ash Guardian'],mechanics:[['Soul Bind','interrupt',2000],['Guardian Reinforcements','adds',1400]]},
 {id:'vaultheart',title:'The Vaultheart',kind:'final',level:5,enemyTypes:['boss'],bossId:'vaultheart',knowledge:'vaultheart',base:70,enemies:['The Vaultheart'],mechanics:[['Core Pulse','circle',2100],['Fracture Spawn','adds',1500],['Rupture Beam','line',1800],['Core Collapse','circle',2600]]}
];
const ASHEN_ROOMS={
 'broken-gate':{
   room:'broken-gate',label:'Collapsed Vault Entrance',
   ambience:'Ash drifts through a shattered seal.',
   props:[
     ['gate',86,48,0,1.05],['pillar-broken',9,18,-10,.9],['pillar-broken',11,82,13,.82],
     ['rubble',18,16,0,1],['rubble',18,84,0,.85],['chain',77,15,18,.9],['brazier',79,79,0,.8]
   ],
   blockers:[
     {id:'broken-gate-door',x:86,y:48,w:11,h:38},{id:'broken-pillar-north',x:9,y:18,w:5,h:17},{id:'broken-pillar-south',x:11,y:82,w:5,h:16},
     {id:'rubble-north',x:18,y:16,w:7,h:5,blocksLos:false},{id:'rubble-south',x:18,y:84,w:7,h:5,blocksLos:false}
   ]
 },
 'hall-embers':{
   room:'hall-embers',label:'Ember Processional Hall',
   ambience:'Old braziers still breathe beneath the ash.',
   props:[
     ['pillar',8,20,0,.95],['pillar',8,80,0,.95],['pillar',88,20,0,.95],['pillar',88,80,0,.95],
     ['brazier',18,24,0,.8],['brazier',18,76,0,.8],['vault-mark',72,50,0,1.1]
   ],
   blockers:[
     {id:'hall-pillar-nw',x:8,y:20,w:5,h:21},{id:'hall-pillar-sw',x:8,y:80,w:5,h:21},
     {id:'hall-pillar-ne',x:88,y:20,w:5,h:21},{id:'hall-pillar-se',x:88,y:80,w:5,h:21},
     {id:'hall-brazier-n',x:18,y:24,w:4,h:7,blocksLos:false},{id:'hall-brazier-s',x:18,y:76,w:4,h:7,blocksLos:false}
   ]
 },
 'kael':{
   room:'warden-seal',label:'The Warden Seal',
   ambience:'Chains hold an ancient oath around the chamber.',
   props:[
     ['seal-ring',66,50,0,1.05],['chain',87,23,-18,1],['chain',87,77,18,1],
     ['statue',10,22,0,.9],['statue',10,78,0,.9],['brazier',83,50,0,.95]
   ],
   blockers:[
     {id:'warden-statue-n',x:10,y:22,w:5,h:16},{id:'warden-statue-s',x:10,y:78,w:5,h:16},
     {id:'warden-brazier',x:83,y:50,w:4,h:7,blocksLos:false}
   ]
 },
 'furnace':{
   room:'furnace-passage',label:'Furnace Passage',
   ambience:'Heat pulses through cracked iron channels.',
   props:[
     ['furnace',88,50,0,1.05],['vent',70,22,0,.9],['vent',70,78,0,.9],
     ['pipe',10,16,8,1],['pipe',10,84,-8,1],['ember-crack',49,18,14,1.1],['ember-crack',53,83,-11,.9]
   ],
   blockers:[
     {id:'furnace-main',x:88,y:50,w:10,h:25},{id:'furnace-pipe-n',x:10,y:16,w:16,h:5},{id:'furnace-pipe-s',x:10,y:84,w:16,h:5},
     {id:'vent-n',x:70,y:22,w:5,h:8,blocksLos:false},{id:'vent-s',x:70,y:78,w:5,h:8,blocksLos:false}
   ]
 },
 'embermaw':{
   room:'embermaw-forge',label:'The Ember Forge',
   ambience:'The floor itself glows beneath Embermaw.',
   props:[
     ['forge-ring',66,50,0,1.12],['furnace',88,18,0,.85],['furnace',88,82,0,.85],
     ['chain',9,28,16,.9],['chain',9,72,-16,.9],['ember-crack',43,20,20,1.05],['ember-crack',45,80,-18,1]
   ],
   blockers:[
     {id:'embermaw-furnace-n',x:88,y:18,w:9,h:21},{id:'embermaw-furnace-s',x:88,y:82,w:9,h:21}
   ]
 },
 'vault-depths':{
   room:'vault-depths',label:'Sealed Vault Depths',
   ambience:'Dead reliquaries line the path inward.',
   props:[
     ['coffer',10,20,-8,.85],['coffer',10,80,7,.85],['coffer',88,16,9,.85],['coffer',88,84,-7,.85],
     ['soul-urn',78,30,0,.75],['soul-urn',78,70,0,.75],['vault-mark',65,50,0,.9]
   ],
   blockers:[
     {id:'coffer-nw',x:10,y:20,w:8,h:6},{id:'coffer-sw',x:10,y:80,w:8,h:6},{id:'coffer-ne',x:88,y:16,w:8,h:6},{id:'coffer-se',x:88,y:84,w:8,h:6},
     {id:'urn-n',x:78,y:30,w:4,h:9},{id:'urn-s',x:78,y:70,w:4,h:9}
   ]
 },
 'vaultheart':{
   room:'vaultheart-sanctum',label:'The Vaultheart Sanctum',
   ambience:'A sealed Cell reliquary hums beneath the final chamber.',
   props:[
     ['vault-door',90,50,0,1.1],['heart-sigil',65,50,0,1.18],
     ['containment',9,22,0,.9],['containment',9,78,0,.9],['crystal',80,18,-8,.85],['crystal',80,82,8,.85],
     ['chain',86,28,-15,.9],['chain',86,72,15,.9]
   ],
   blockers:[
     {id:'vaultheart-door',x:90,y:50,w:12,h:39},{id:'containment-n',x:9,y:22,w:5,h:18},{id:'containment-s',x:9,y:78,w:5,h:18},
     {id:'crystal-n',x:80,y:18,w:4,h:10},{id:'crystal-s',x:80,y:82,w:4,h:10}
   ]
 }
};
let Game=null,G=null,P=null,run=null,token=0,rebornLoaderPromise=null,requestedRunOptions=null;
const I=window.CellboundIdentities;
let tactics={preset:'balanced',aggression:'balanced',interrupts:'important',interruptAssignment:'dps-rotation',cooldowns:'difficult',cc:'priority-elites',bossPlan:'balanced',defensives:'balanced',adds:'dangerous',movement:'balanced',consumables:'danger'};
const party=()=>Array.isArray(run?.externalParty)?run.externalParty:(Game&&Game.getPartyCharacters?Game.getPartyCharacters():[]);
const state=()=>Game&&Game.getState?Game.getState():null;
const role=c=>String(c?.role||'').toLowerCase()||(Game&&Game.classes&&Game.classes[c.class]&&Game.classes[c.class].specs[c.spec]?Game.classes[c.class].specs[c.spec].role:'dps');
const classKey=c=>'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ilvl=()=>{
 if(Array.isArray(run?.externalParty)&&run.externalParty.length)return Math.round(run.externalParty.reduce((n,c)=>n+(Number(c.itemLevel??c.gear)||0),0)/run.externalParty.length);
 return Number(Game&&Game.partyItemLevel?Game.partyItemLevel():0)||0
};
const currentStageDef=()=>run?.externalStage||STAGES[run?.stage||0];
const partyLevel=()=>{const p=party();return p.length?Math.round(p.reduce((n,c)=>n+Math.max(1,Number(c.level)||1),0)/p.length):1};
const ASHEN_VAULT_XP=420;
function xpNeeded(level){return 800+Math.max(0,(Number(level)||1)-1)*250}
function awardPartyXp(amount){
 const gains=[],cap=Math.max(1,Number(Game?.getLevelCap?.())||15);
 party().forEach(c=>{
   const beforeLevel=Math.min(cap,Math.max(1,Number(c.level)||1));
   const beforeXp=beforeLevel>=cap?0:Math.max(0,Number(c.xp)||0);
   const beforeNeed=xpNeeded(beforeLevel),reward=Math.max(0,Number(amount)||0);
   let level=beforeLevel,xp=beforeLevel>=cap?0:beforeXp+reward,levels=0;
   while(level<cap&&xp>=xpNeeded(level)){
     xp-=xpNeeded(level);
     level++;
     levels++;
   }
   if(level>=cap){level=cap;xp=0}
   c.level=level;c.xp=xp;
   if(levels>0)c.talent=(Number(c.talent)||0)+levels;
   gains.push({
     id:c.id,name:c.name,portrait:c.portrait||String(c.name||'?').slice(0,2).toUpperCase(),
     amount:beforeLevel>=cap?0:reward,beforeLevel,beforeXp,beforeNeed,
     afterLevel:level,afterXp:xp,afterNeed:xpNeeded(level),levels,capped:level>=cap
   });
 });
 return gains
}
async function syncPartyXpRecords(gains){
 const db=Game?.getSupabase?.(),user=Game?.getUser?.();
 if(!db||!user||!Array.isArray(gains)||!gains.length)return;
 const now=new Date().toISOString();
 try{
   await Promise.all(gains.map(x=>db.from('characters').update({
     level:x.afterLevel,xp:x.afterXp,last_played_at:now
   }).eq('user_id',user.id).eq('name',x.name)));
 }catch(error){console.warn('Character XP mirror sync failed',error)}
}
const delay=ms=>new Promise(r=>setTimeout(r,Math.round(ms/((run&&run.speed)||1))));
const cond=id=>run&&run.condition[id]!=null?run.condition[id]:100;
const setCond=(id,v)=>{if(run)run.condition[id]=clamp(Math.round(v),0,100)};
const hp=id=>run&&run.hp&&run.hp[id]!=null?run.hp[id]:100;
const setHp=(id,v)=>{if(run&&run.hp)run.hp[id]=clamp(Math.round(v),0,100)};
function combatProfile(c){
 const r=role(c);
 if(r==='tank')return'tank';
 if(r==='healer')return'healer';
 if(['Rogue','Warrior','Paladin','Death Knight','Demon Hunter'].includes(c.class))return'melee';
 return'ranged';
}
function root(){let r=$('#cb2dBackdrop');if(!r){r=document.createElement('div');r.id='cb2dBackdrop';r.className='cb2d-backdrop';r.hidden=true;document.body.appendChild(r)}return r}
function close(silentExternal=false){
 token++;removeRebornReplayControls();
 const callback=run?.externalOnClose,wasExternal=Boolean(run?.externalMode);
 run=null;document.body.classList.remove('cb2d-open');const r=root();r.hidden=true;r.innerHTML='';
 if(wasExternal&&!silentExternal&&typeof callback==='function'){try{callback()}catch(error){console.warn('Shared combat close callback failed',error)}}
}
function knowledge(key){const p=party();return p.length?Math.round(p.reduce((n,c)=>n+(Number(c.knowledge&&c.knowledge[key])||0),0)/p.length):0}
function readiness(){
 const p=party(),s=state();
 if(!Game||!Game.ready)return{ok:false,reason:'Guild data is still loading.'};
 if(s?.onboarding?.complete===true&&s?.progression?.ashenVaultUnlocked===false)return{ok:false,reason:'Complete Ashes on the East Road in the Quest Journal to unlock The Ashen Vault.'};
 if(p.length!==5)return{ok:false,reason:'Build a complete five-character party in Party Builder first.'};
 const locked=p.find(c=>Game.isUnavailable(c));
 if(locked)return{ok:false,reason:locked.name+' is still recovering from Cell Shock.'};
 if(ilvl()<18)return{ok:false,reason:'Party Item Level '+ilvl()+'. The Ashen Vault requires Item Level 18.'};
 return{ok:true,reason:'Ready to enter.'};
}
function ready(){return readiness().ok}
function groupButtons(key,items){return '<div class="cb2d-plan-row" data-plan="'+key+'">'+items.map(x=>'<button class="'+(tactics[key]===x[0]?'active':'')+'" data-pick="'+key+':'+x[0]+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>').join('')+'</div>'}

function applyTacticsPreset(value){
 tactics.preset=value;
 if(value==='safe'){
   Object.assign(tactics,{aggression:'safe',interrupts:'high',interruptAssignment:'best',cooldowns:'difficult',cc:'enabled',bossPlan:'control',defensives:'early',adds:'full',movement:'safety'});
 }else if(value==='aggressive'){
   Object.assign(tactics,{aggression:'aggressive',interrupts:'important',interruptAssignment:'best',cooldowns:'free',cc:'priority-elites',bossPlan:'burn',defensives:'balanced',adds:'boss',movement:'damage'});
 }else{
   Object.assign(tactics,{aggression:'balanced',interrupts:'important',interruptAssignment:'dps-rotation',cooldowns:'difficult',cc:'priority-elites',bossPlan:'balanced',defensives:'balanced',adds:'dangerous',movement:'balanced'});
 }
}
async function waitForEndgame(){
 for(let i=0;i<20;i++){if(window.CellboundEndgame?.beginAttempt)return window.CellboundEndgame;await new Promise(r=>setTimeout(r,100))}
 return null
}

function endgameConfig(){
 const E=window.CellboundEndgame;
 if(E?.currentConfig)return E.currentConfig('ashen-vault');
 return{difficulty:'normal',tier:0,diff:{name:'Normal',label:'NORMAL',description:'Learn the dungeon and its core mechanics.'},affixes:[],targetTimeMs:12*60*1000,recommendedItemLevel:18,dungeon:{version:2}}
}
function endgamePrepMarkup(){
 const E=window.CellboundEndgame,cfg=endgameConfig(),p=E?.progressFor?.('ashen-vault')||{},tierMax=Math.max(1,Number(p.highest_tier)||1);
 const buttons=['normal','heroic','cellbound'].map(mode=>{
  const unlocked=E?.difficultyUnlocked?E.difficultyUnlocked('ashen-vault',mode,cfg.tier||1):mode==='normal';
  const active=cfg.difficulty===mode,label=mode==='cellbound'?'CELLBOUND+':mode.toUpperCase();
  return'<button type="button" data-cb2d-mode="'+mode+'" class="'+(active?'active':'')+'" '+(unlocked?'':'disabled')+'>'+label+'</button>'
 }).join('');
 const tier=cfg.difficulty==='cellbound'?(E?.tierPickerMarkup?.(cfg.tier,tierMax,{attribute:'data-cb2d-tier'})||''):'';
 const affixes=(cfg.affixes||[]).map(id=>window.CellboundEndgameData?.AFFIXES?.[id]?.name||id).join(' · ')||'No affixes';
 return'<div class="eg-prep-block"><small>DUNGEON DIFFICULTY</small><div class="eg-prep-tabs">'+buttons+'</div><div class="eg-prep-detail"><b>'+esc(cfg.diff?.name||'Normal')+'</b> · Recommended iLvl '+cfg.recommendedItemLevel+' · Target '+Math.floor(cfg.targetTimeMs/60000)+':'+String(Math.round(cfg.targetTimeMs/1000)%60).padStart(2,'0')+'<br>'+esc(affixes)+'<br>'+esc(cfg.diff?.description||'')+'</div>'+tier+'</div>'
}
function bindEndgamePrep(){
 const E=window.CellboundEndgame;
 document.querySelectorAll('[data-cb2d-mode]').forEach(b=>b.onclick=()=>{E?.choose?.('ashen-vault',b.dataset.cb2dMode);briefing()});
 document.querySelectorAll('[data-cb2d-tier]').forEach(b=>b.onclick=()=>{E?.choose?.('ashen-vault','cellbound',Number(b.dataset.cb2dTier));briefing()})
}

function briefing(){
 const gate=readiness(),r=root();document.body.classList.add('cb2d-open');r.hidden=false;
 if(!gate.ok){
   r.innerHTML='<section class="cb2d-shell cb2d-brief"><header class="cb2d-head"><div><small>THE ASHEN VAULT · ENTRY CHECK</small><h2>Dungeon entry is currently blocked.</h2></div><button data-close aria-label="Close dungeon">×</button></header><div class="cb2d-blocked"><b>NOT READY</b><p>'+esc(gate.reason)+'</p><button data-party>OPEN PARTY BUILDER →</button></div></section>';
   r.querySelector('[data-close]').onclick=close;
   r.querySelector('[data-party]').onclick=()=>{close();Game.switchView('party')};
   return;
 }

 r.innerHTML='<section class="cb2d-shell cb2d-brief"><header class="cb2d-head"><div><small>THE ASHEN VAULT · LEVELS 3–5 · ILVL 18+ · TACTICAL BRIEFING</small><h2>Set the plan once. Then watch the dungeon run.</h2></div><button data-close aria-label="Close dungeon">×</button></header><div class="cb2d-brief-grid"><main><p class="cb2d-intro">These tactics stay in place for the whole run. Your party will move, react and fight automatically; your job is to choose the approach before the pull.</p>'+endgamePrepMarkup()+'<h3>Expedition Style</h3><p class="cb2d-intro">Choose the overall approach. Your party handles interrupts, crowd control, cooldowns, adds, defensives and movement automatically from this plan.</p>'+groupButtons('preset',[['safe','SAFE','Slower pulls, earlier defensives and stronger mechanic control.'],['balanced','BALANCED','Standard pace with sensible reactions to danger.'],['aggressive','AGGRESSIVE','Faster pulls, freer cooldown use and more boss pressure.']])+'</main><aside><small>ACTIVE FIVE · PARTY LV '+partyLevel()+' · ILVL '+ilvl()+'</small>'+party().map(c=>'<div class="cb2d-brief-member"><i class="cb2d-dot '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>Lv. '+Math.max(1,Number(c.level)||1)+' · '+esc(c.class)+' · '+esc(c.spec)+'</small></span><strong>'+String(role(c)).toUpperCase()+'</strong></div>').join('')+'<div class="cb2d-prep-summary"><small>ACTIVE PROFESSION PREP</small>'+party().map(c=>{const fx=P?.activeEffects?.(c)||[];return fx.length?'<p><b>'+esc(c.name)+'</b><span>'+fx.map(x=>esc(x.name)+' · '+x.remainingBosses+' bosses').join('<br>')+'</span></p>':''}).join('')+'</div><button class="cb2d-start" data-start>BEGIN EXPEDITION →</button></aside></div></section>';
 r.querySelector('[data-close]').onclick=close;
 r.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const a=b.dataset.pick.split(':');if(a[0]==='preset')applyTacticsPreset(a[1]);else tactics[a[0]]=a[1];r.querySelectorAll('[data-plan="'+a[0]+'"] button').forEach(x=>x.classList.toggle('active',x===b))});
 r.querySelector('[data-start]').onclick=start;
 try{bindEndgamePrep()}catch(error){console.warn('Dungeon difficulty controls failed to bind',error)}
}
function ashenRuntimeRun(){
 if(!run)return null;
 return{
  stage:Number(run.stage)||0,speed:Number(run.speed)||1,
  resources:JSON.parse(JSON.stringify(run.resources||{})),cooldowns:JSON.parse(JSON.stringify(run.cooldowns||{})),
  statuses:JSON.parse(JSON.stringify(run.statuses||{})),reviveSickness:{...(run.reviveSickness||{})},
  expeditionTimeMs:Number(run.expeditionTimeMs)||0,reviveReadyAt:Number(run.reviveReadyAt)||0,outOfCombatRevives:Number(run.outOfCombatRevives)||0,
  endgame:{...(run.endgame||{})},condition:{...(run.condition||{})},hp:{...(run.hp||{})},
  damageDone:{...(run.damageDone||{})},healingDone:{...(run.healingDone||{})},overhealing:{...(run.overhealing||{})},
  hitCount:{...(run.hitCount||{})},identityTimers:{...(run.identityTimers||{})},log:(run.log||[]).slice(-30),
  rewards:JSON.parse(JSON.stringify(run.rewards||[])),loot:JSON.parse(JSON.stringify(run.loot||{gear:[],materials:{},gold:0,renown:0,xp:0})),
  rebornHistory:(run.rebornHistory||[]).map(h=>({stageId:h.stageId,stageTitle:h.stageTitle,startHp:h.startHp,summary:h.summary,outcome:h.outcome})),
  resolved:false,combatActive:false,mechanicActive:false,allowKill:false,stageOutcome:true
 }
}
async function ashenSaveRuntime(phase='stage'){
 if(!run?.endgame?.attemptId)return;
 await window.CellboundEndgame?.saveRuntime?.('ashen-vault',{
  version:1,kind:'ashen-vault',phase,stage:Number(run.stage)||0,
  stageStartedAt:Number(run.runtimeStageStartedAt)||0,tactics:{...tactics},run:ashenRuntimeRun()
 })
}
function ashenRestoreRuntime(attempt){
 const snap=attempt?.runtimeState||{},saved=snap.run||{};
 Object.assign(tactics,snap.tactics||{});
 token++;
 run={...saved,token,enemyHp:[],enemyMax:[],threat:[],aggro:[],xpGrowth:[],override:0,forceInterrupt:false,shotSeq:0,rebornReplay:null,rebornResult:null,rebornTelegraphs:{},rebornCastTimer:null,runtimeStageStartedAt:Number(snap.stageStartedAt)||Date.now(),_restored:true};
 run.endgame={...(saved.endgame||{}),attemptId:attempt.attemptId,seed:attempt.seed,difficulty:attempt.difficulty,tier:Number(attempt.tier)||0,targetTimeMs:Number(attempt.targetTimeMs)||Number(saved.endgame?.targetTimeMs)||0,dungeonVersion:Number(attempt.dungeonVersion)||Number(saved.endgame?.dungeonVersion)||2};
 return run
}

async function start(){
 const startButton=root().querySelector('[data-start]');if(startButton){startButton.disabled=true;startButton.textContent='ENTERING…'}
 await Game.persistState?.();
 const service=await waitForEndgame(),eg=endgameConfig(),attempt=await service?.beginOrResumeAttempt?.('ashen-vault')||await service?.beginAttempt?.('ashen-vault');
 if(!attempt||attempt.error){if(startButton){startButton.disabled=false;startButton.textContent='BEGIN EXPEDITION →'}alert(attempt?.error?.message||'Dungeon service is still loading. Try Begin Expedition again.');return}
 const p=party();
 if(attempt.resumed&&attempt.runtimeState?.kind==='ashen-vault'){
   ashenRestoreRuntime(attempt)
 }else{
   const resources=Object.fromEntries(p.map(c=>{const def=resourceDefFor(c);return[c.id,{name:def.name,max:def.max,value:def.start}]})),cooldowns=Object.fromEntries(p.map(c=>[c.id,{}])),statuses=Object.fromEntries(p.map(c=>[c.id,[]])),reviveSickness=Object.fromEntries(p.map(c=>[c.id,0]));
   token++;
   run={token:token,stage:0,speed:1,resources,cooldowns,statuses,reviveSickness,expeditionTimeMs:0,reviveReadyAt:0,outOfCombatRevives:0,endgame:{difficulty:eg.difficulty,tier:eg.tier||0,label:eg.diff?.name||'Normal',targetTimeMs:Number(attempt.targetTimeMs)||eg.targetTimeMs,recommendedItemLevel:eg.recommendedItemLevel,dungeonVersion:eg.dungeon?.version||2,affixes:[...(eg.affixes||[])],attemptId:attempt.attemptId,seed:attempt.seed},condition:Object.fromEntries(p.map(c=>[c.id,100])),hp:Object.fromEntries(p.map(c=>[c.id,100])),enemyHp:[],enemyMax:[],threat:[],aggro:[],damageDone:Object.fromEntries(p.map(c=>[c.id,0])),healingDone:Object.fromEntries(p.map(c=>[c.id,0])),overhealing:Object.fromEntries(p.map(c=>[c.id,0])),hitCount:Object.fromEntries(p.map(c=>[c.id,0])),identityTimers:{},combatStartedAt:0,lastMeterAt:0,log:['The party enters The Ashen Vault · '+(eg.diff?.name||'Normal')+'.'],override:0,forceInterrupt:false,rewards:[],loot:{gear:[],materials:{},gold:0,renown:0,xp:0},xpGrowth:[],resolved:false,combatActive:false,mechanicActive:false,allowKill:false,stageOutcome:true,shotSeq:0,rebornHistory:[],rebornReplay:null,rebornResult:null,rebornTelegraphs:{},rebornCastTimer:null,runtimeStageStartedAt:Date.now()}
 }
 await window.CellboundExpeditionPresentation?.enter?.('ashen-vault',{difficulty:attempt.difficulty||eg.diff?.name||'Normal'});
 drawViewer();
 seamlessFrom(Math.min(STAGES.length-1,Number(run.stage)||0),token)
}
function route(){
 return STAGES.map((s,i)=>'<span class="'+(i<run.stage?'done':i===run.stage?'current':'')+'"><i>'+(i+1)+'</i>'+esc(s.title)+'</span>').join('');
}
function rows(){
 return party().map(c=>'<div class="cb2d-party-row" data-row="'+c.id+'"><i class="cb2d-dot '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+String(role(c)).toUpperCase()+' · '+esc(c.spec)+' · Condition '+cond(c.id)+'%</small><em class="cb2d-side-hp"><i data-side-hp="'+c.id+'" style="width:'+hp(c.id)+'%"></i></em></span><strong>'+hp(c.id)+' HP</strong></div>').join('');
}
function drawViewer(){
 const s=currentStageDef(),r=root();r.hidden=false;
 r.innerHTML='<section class="cb2d-shell"><header class="cb2d-head"><div><small>THE ASHEN VAULT · LIVE 2D DUNGEON</small><h2 id="cb2dTitle">'+esc(s.title)+'</h2></div><div class="cb2d-live"><i></i>LIVE <button data-speed>1×</button><button data-close aria-label="Close dungeon">×</button></div></header><div class="cb2d-route" id="cb2dRoute">'+route()+'</div><div class="cb2d-layout"><main><div class="cb2d-arena" id="cb2dArena"><div class="cb2d-floor"></div><div class="cb2d-environment" id="cb2dEnvironment"></div><div class="cb2d-room-tag" id="cb2dRoomTag"></div><div class="cb2d-ground-legend"><span class="danger">RED · MOVE / AVOID</span><span class="spawn">AMBER · SPAWN / PRIORITY</span><span class="aggro">GOLD LINK · AGGRO</span></div><div id="cb2dTelegraphs"></div><div id="cb2dUnits"></div><div class="cb2d-caption"><span id="cb2dType">'+s.kind.toUpperCase()+'</span><b id="cb2dStatus">Entering encounter…</b></div></div><div class="cb2d-controls cbr-plan-lock" data-reborn="1"><div class="cbr-plan-lock-copy"><small>TACTICS LOCKED</small><b>Your plan is set for this fight.</b><span>The party follows the tactics chosen before the expedition.</span></div></div><div class="cb2d-feed"><small>COMBAT FEED</small><p id="cb2dFeed"></p></div></main><aside><div class="cb2d-cast"><small>ENEMY CAST</small><div><b id="cb2dCastName">—</b><strong id="cb2dCastTime">—</strong></div><div class="cb2d-castbar"><i id="cb2dCastFill"></i></div></div><div class="cb2d-combat-meters"><section class="cb2d-meter-panel damage"><div class="cb2d-meter-head"><small>DAMAGE METER</small><span id="cb2dDamageTotal">0 total</span></div><div id="cb2dDamageMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel healing"><div class="cb2d-meter-head"><small>HEALING METER</small><span id="cb2dHealingTotal">0 total</span></div><div id="cb2dHealingMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel threat"><div class="cb2d-meter-head"><small>THREAT METER</small><span id="cb2dThreatTarget">No target</span></div><div id="cb2dThreatMeter" class="cb2d-meter-list"></div></section></div><div class="cb2d-actions"><small>PARTY ACTIONS</small><div data-act="tank"><i class="cb2d-dot tank"></i><b>Tank</b><em>Taking point</em></div><div data-act="healer"><i class="cb2d-dot healer"></i><b>Healer</b><em>Following formation</em></div><div data-act="dps"><i class="cb2d-dot dps"></i><b>Damage</b><em>Acquiring targets</em></div></div><div class="cb2d-party"><small>PARTY CONDITION · ILVL '+ilvl()+'</small><div id="cb2dRows">'+rows()+'</div></div><div class="cb2d-plan"><small>PERSISTENT TACTICS</small><b>'+tactics.aggression.toUpperCase()+' PULLS · '+tactics.cooldowns.toUpperCase()+' COOLDOWNS</b><span>'+tactics.interruptAssignment.toUpperCase()+' INTERRUPTS · '+tactics.cc.toUpperCase()+' CC · '+tactics.bossPlan.toUpperCase()+' BOSSES</span></div></aside></div><div class="cb2d-end" id="cb2dEnd" hidden></div></section>';
 r.querySelector('[data-close]').onclick=()=>{if(run&&!run.resolved&&!confirm('Leave the Ashen Vault?'))return;close()};
 r.querySelector('[data-speed]').onclick=e=>{run.speed=run.speed===2?1:2;e.currentTarget.textContent=run.speed+'×'};
 feed();renderCombatMeters();renderRebornHealingMeter();
}
function feed(){const e=$('#cb2dFeed');if(e&&run)e.innerHTML=run.log.slice(-6).map(esc).join('<br>')}
function log(t){if(!run)return;run.log.push(t);run.log=run.log.slice(-30);feed()}
function status(t){const e=$('#cb2dStatus');if(e)e.textContent=t}
function act(r,t){const e=$('[data-act="'+r+'"] em');if(e)e.textContent=t}
function updateRows(){
 party().forEach(c=>{
   const row=$('[data-row="'+c.id+'"]');
   const value=row?.querySelector('strong');if(value)value.textContent=hp(c.id)+' HP';
   const detail=row?.querySelector('small');if(detail)detail.textContent=String(role(c)).toUpperCase()+' · '+c.spec+' · Condition '+cond(c.id)+'%';
   const bar=$('[data-side-hp="'+c.id+'"]');if(bar)bar.style.width=hp(c.id)+'%';
   const unit=$('[data-unit="p-'+c.id+'"] .cb2d-unit-hp i');if(unit)unit.style.width=hp(c.id)+'%';
   const marker=$('[data-unit="p-'+c.id+'"]');if(marker)marker.classList.toggle('dead',hp(c.id)<=0);
 })
}
function queueCombatMeterRender(includeHealing=false){
 if(!run)return;
 if(includeHealing)run.pendingHealingMeter=true;
 if(run.meterRenderPending)return;
 const since=performance.now()-(Number(run.lastMeterAt)||0),wait=Math.max(0,110-since);
 run.meterRenderPending=true;
 setTimeout(()=>requestAnimationFrame(()=>{
   if(!run)return;
   run.meterRenderPending=false;run.lastMeterAt=performance.now();
   renderCombatMeters();
   if(run.pendingHealingMeter){run.pendingHealingMeter=false;renderRebornHealingMeter()}
 }),wait)
}
function recordDamage(c,amount){
 if(!run||!c)return;
 const dealt=Math.max(0,Math.round(Number(amount)||0));if(!dealt)return;
 run.damageDone=run.damageDone||{};run.damageDone[c.id]=(Number(run.damageDone[c.id])||0)+dealt;
 queueCombatMeterRender();
}
function meterRole(c){return classKey(c)}
function renderCombatMeters(){
 if(!run)return;
 const damageRoot=$('#cb2dDamageMeter'),threatRoot=$('#cb2dThreatMeter');if(!damageRoot&&!threatRoot)return;
 const p=party(),elapsed=Math.max(1,(Number(run.expeditionTimeMs)||0)/1000);
 const damageRows=p.map(c=>({c,value:Number(run.damageDone?.[c.id])||0})).sort((a,b)=>b.value-a.value);
 const maxDamage=Math.max(1,...damageRows.map(x=>x.value)),total=damageRows.reduce((n,x)=>n+x.value,0);
 const totalEl=$('#cb2dDamageTotal');if(totalEl)totalEl.textContent=total.toLocaleString()+' total';
 if(damageRoot)damageRoot.innerHTML=damageRows.map(({c,value},i)=>{
   const pct=value/maxDamage*100,dps=Math.round(value/elapsed);
   return '<div class="cb2d-meter-row '+meterRole(c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+'</b><span>'+value.toLocaleString()+' · '+dps+' DPS</span></div><em><i style="width:'+pct+'%"></i></em></div>';
 }).join('');
 const targetIndex=enemyIndex(),table=targetIndex>=0?run.threat?.[targetIndex]:null,targetRaw=targetIndex>=0?currentStageDef()?.enemies?.[targetIndex]:null,targetName=typeof targetRaw==='object'?targetRaw?.name:(targetRaw||'');
 const threatLabel=$('#cb2dThreatTarget');if(threatLabel)threatLabel.textContent=targetName||'No target';
 if(!threatRoot)return;
 if(!table){threatRoot.innerHTML='<div class="cb2d-meter-empty">Threat appears when combat begins.</div>';return}
 const threatRows=p.map(c=>({c,value:Number(table[c.id])||0})).sort((a,b)=>b.value-a.value),maxThreat=Math.max(1,...threatRows.map(x=>x.value)),aggro=run.aggro?.[targetIndex];
 threatRoot.innerHTML=threatRows.map(({c,value},i)=>{
   const pct=value/maxThreat*100,hasAggro=c.id===aggro,danger=hasAggro&&combatProfile(c)!=='tank';
   const tank=p.find(x=>combatProfile(x)==='tank'),tankThreat=tank?Number(table[tank.id])||0:0,high=!hasAggro&&combatProfile(c)!=='tank'&&tankThreat>0&&value>=tankThreat*.85;
   return '<div class="cb2d-meter-row '+meterRole(c)+(hasAggro?' aggro':'')+(danger?' danger':'')+(high?' high':'')+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+(hasAggro?' <strong>AGGRO</strong>':high?' <strong>HIGH</strong>':'')+'</b><span>'+Math.round(value).toLocaleString()+' · '+Math.round(pct)+'%</span></div><em><i style="width:'+pct+'%"></i></em></div>';
 }).join('');
}
function unitPixelPosition(x,y){
 const arena=$('#cb2dArena');if(!arena)return{x:0,y:0};
 return{x:(clamp(Number(x)||0,0,100)/100)*arena.clientWidth,y:(clamp(Number(y)||0,0,100)/100)*arena.clientHeight}
}
function combatSafePoint(id,x,y){
 return{x:clamp(Number(x)||50,8,92),y:clamp(Number(y)||50,12,88)}
}
function applyUnitPosition(e,x,y,instant=false){
 if(!e)return;
 const safe=combatSafePoint(e.dataset.unit,x,y),p=unitPixelPosition(safe.x,safe.y);
 e.dataset.x=String(safe.x);e.dataset.y=String(safe.y);
 if(instant)e.style.transitionDuration='0ms';
 e.style.setProperty('--unit-x',p.x+'px');e.style.setProperty('--unit-y',p.y+'px')
}
function addUnit(id,label,cls,x,y,size,meta=''){
 const e=document.createElement('div');e.className='cb2d-unit '+cls+' '+(size||'');e.dataset.unit=id;e.innerHTML='<i></i><span>'+esc(label)+(meta?'<small class="cb2d-unit-meta">'+esc(meta)+'</small>':'')+'</span><em class="cb2d-unit-hp"><i></i></em>';$('#cb2dUnits').appendChild(e);applyUnitPosition(e,x,y,true)
}
function move(id,x,y,ms){
 const e=$('[data-unit="'+id+'"]');if(!e)return;
 const ox=Number(e.dataset.x)||x,oy=Number(e.dataset.y)||y,dx=x-ox,dy=y-oy;
 if(Math.hypot(dx,dy)>.8)e.style.setProperty('--face-angle',(Math.atan2(dy,dx)*180/Math.PI)+'deg');
 e.style.transitionDuration=Math.round(ms/((run&&run.speed)||1))+'ms';
 requestAnimationFrame(()=>applyUnitPosition(e,x,y,false))
}
function syncUnitPixelPositions(){
 if(window.CellboundCombatFX?.ownsMovement)return;
 $$('[data-unit]').forEach(e=>applyUnitPosition(e,Number(e.dataset.x)||50,Number(e.dataset.y)||50,true))
}
window.addEventListener('resize',()=>{if(run)requestAnimationFrame(syncUnitPixelPositions)},{passive:true});
function faceUnit(id,targetId){
 const e=$('[data-unit="'+id+'"]'),a=pctPosition(id),b=pctPosition(targetId);if(!e||!a||!b)return;
 e.style.setProperty('--face-angle',(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI)+'deg')
}
function hitReact(id,kind='hit'){
 const e=$('[data-unit="'+id+'"]');if(!e)return;
 e.classList.remove('hit','healed');requestAnimationFrame(()=>{if(e.isConnected)e.classList.add(kind==='heal'?'healed':'hit')});
 setTimeout(()=>e.classList.remove('hit','healed'),320)
}
function deathBurst(id){
 const arena=$('#cb2dArena'),p=point(id);if(!arena||!p)return;
 const e=document.createElement('i');e.className='cb2d-death-burst';e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),620)
}
function setFocusEnemy(index){
 $$('[data-unit^="e-"]').forEach(e=>e.classList.remove('focused'));
 if(index>=0){const e=$('[data-unit="e-'+index+'"]');if(e)e.classList.add('focused')}
}
function ashParticle(type,i){
 const e=document.createElement('i');e.className='cb2d-ambient '+type;
 e.style.setProperty('--x',(6+((i*17)%88))+'%');
 e.style.setProperty('--delay',(-((i*0.73)%5))+'s');
 e.style.setProperty('--dur',(3.8+(i%5)*.55)+'s');
 e.style.setProperty('--drift',(-18+(i%7)*6)+'px');
 return e
}
function renderDungeonEnvironment(s){
 const arena=$('#cb2dArena'),root=$('#cb2dEnvironment'),tag=$('#cb2dRoomTag');if(!arena||!root)return;
 const cfg=ASHEN_ROOMS[s.id]||ASHEN_ROOMS['broken-gate'];
 arena.className='cb2d-arena theme-ashen room-'+cfg.room+(s.kind==='boss'||s.kind==='final'?' boss-room':'');
 root.innerHTML='';
 (cfg.props||[]).forEach((p,i)=>{
   const e=document.createElement('span');e.className='cb2d-prop prop-'+p[0];
   e.style.left=p[1]+'%';e.style.top=p[2]+'%';e.style.setProperty('--rot',(p[3]||0)+'deg');e.style.setProperty('--scale',String(p[4]||1));e.dataset.prop=i;root.appendChild(e)
 });
 const ambience=document.createElement('div');ambience.className='cb2d-ambience';
 for(let i=0;i<13;i++)ambience.appendChild(ashParticle(i%4===0?'ember':'ash',i));
 root.appendChild(ambience);
 if(tag)tag.innerHTML='<b>'+esc(cfg.label)+'</b><small>'+esc(cfg.ambience)+'</small>'
}

function resourceClass(name){
 return 'resource-'+String(name||'power').toLowerCase().replace(/[^a-z0-9]+/g,'-')
}
function resourceDefFor(c){
 return window.CellboundCombatReborn?.RESOURCE_DEFS?.[c?.class]||{name:'Power',max:100,start:100}
}
function updateResourceBarElement(bar,name,value,max,mode='state',reason=''){
 if(!bar)return;
 const resource=String(name||'Power'),limit=Math.max(1,Number(max)||100),current=clamp(Number(value)||0,0,limit),pctValue=current/limit*100,key=resourceClass(resource);
 if(bar.dataset.resource!==resource){
   [...bar.classList].filter(x=>x.startsWith('resource-')).forEach(x=>bar.classList.remove(x));
   bar.classList.add(key);bar.dataset.resource=resource;bar.title=resource
 }
 const fill=bar.querySelector('i');if(!fill)return;
 if(mode==='RESOURCE_SPENT'){
   fill.style.transition='none';fill.style.width=pctValue+'%';
   requestAnimationFrame(()=>requestAnimationFrame(()=>{if(fill.isConnected)fill.style.transition='width .3s linear'}))
 }else if(mode==='RESOURCE_STATE'&&reason==='regeneration'){
   fill.style.transition='width .9s linear';fill.style.width=pctValue+'%'
 }else if(mode==='RESOURCE_GAINED'){
   fill.style.transition='width .22s ease-out';fill.style.width=pctValue+'%'
 }else{
   fill.style.transition='none';fill.style.width=pctValue+'%';requestAnimationFrame(()=>{fill.style.transition='width .3s linear'})
 }
}
function mountRebornResourceBar(c){
 const unit=$('[data-unit="p-'+c.id+'"]');if(!unit)return null;
 let bar=unit.querySelector('.cbr-resource');
 if(!bar){bar=document.createElement('small');bar.className='cbr-resource';bar.innerHTML='<i></i>';unit.appendChild(bar)}
 const def=resourceDefFor(c),state=run?.resources?.[c.id]||{name:def.name,max:def.max,value:def.start};
 updateResourceBarElement(bar,state.name||def.name,state.value??def.start,state.max||def.max,'initial');return bar
}
function recoverDungeonResources(){
 if(!run?.resources)return;
 party().forEach(c=>{
   const def=resourceDefFor(c),r=run.resources[c.id]||{name:def.name,max:def.max,value:def.start};
   const max=Math.max(1,Number(r.max)||def.max||100),name=r.name||def.name;let value=clamp(Number(r.value)||0,0,max);
   if(name==='Mana')value=Math.min(max,value+(max*.14));
   else if(name==='Energy'||name==='Focus'||name==='Essence')value=max;
   else value=Math.max(Number(def.start)||0,value-(max*.18));
   run.resources[c.id]={name,max,value}
 })
}


function rebornPersistentStatuses(player,elapsedMs=0){
 const elapsed=Math.max(0,Number(elapsedMs)||0);
 return Object.values(player?.statuses||{}).filter(s=>s?.persistAcrossEncounters&&Number(s.expiresAt)>elapsed).map(s=>({...s,effect:{...(s.effect||{})},remainingMs:Math.max(0,Number(s.expiresAt)-elapsed)}))
}
function advanceDungeonCooldowns(ms){
 if(!run?.cooldowns)return;
 const amount=Math.max(0,Number(ms)||0);
 Object.values(run.cooldowns).forEach(map=>Object.keys(map||{}).forEach(k=>map[k]=Math.max(0,(Number(map[k])||0)-amount)));
 Object.keys(run.statuses||{}).forEach(id=>{run.statuses[id]=(run.statuses[id]||[]).map(s=>({...s,remainingMs:Math.max(0,(Number(s.remainingMs)||0)-amount)})).filter(s=>s.remainingMs>0)});
 Object.keys(run.reviveSickness||{}).forEach(id=>run.reviveSickness[id]=Math.max(0,(Number(run.reviveSickness[id])||0)-amount));
 run.expeditionTimeMs=(Number(run.expeditionTimeMs)||0)+amount
}
function reviveResourceState(c,pctValue=20){
 const def=resourceDefFor(c),cur=run.resources?.[c.id]||{name:def.name,max:def.max,value:def.start},max=Math.max(1,Number(cur.max)||def.max||100);
 const value=Math.max(0,Math.min(max,max*pctValue/100));run.resources[c.id]={name:cur.name||def.name,max,value};
 const bar=mountRebornResourceBar(c);if(bar)updateResourceBarElement(bar,cur.name||def.name,value,max,'PLAYER_REVIVED')
}
function restoreUnitVisual(c){
 const u=$('[data-unit="p-'+c.id+'"]');if(!u)return;
 u.classList.remove('dead','dying','wiped');u.style.opacity='';
 const hpBar=u.querySelector('.cb2d-unit-hp i');if(hpBar)hpBar.style.width=hp(c.id)+'%'
}
async function recoverFallenBetweenStages(tok){
 if(tok!==token||!run)return false;
 let fallen=party().filter(c=>hp(c.id)<=0);if(!fallen.length)return true;
 let healer=party().find(c=>role(c)==='healer'&&hp(c.id)>0);
 if(!healer){
   healer=party().find(c=>role(c)==='healer');
   if(!healer){
     status('No healer · expedition cannot continue.');log('No healer is present. Fallen adventurers cannot be revived.');
     return false
   }
   status('Healer returning from checkpoint…');log(healer.name+' releases and runs back from the last checkpoint.');
   act('healer',healer.name+' · Returning to the group');await delay(700);
   if(tok!==token||!run)return false;
   advanceDungeonCooldowns(15000);setHp(healer.id,35);reviveResourceState(healer,25);run.reviveSickness[healer.id]=15000;restoreUnitVisual(healer);updateRows();
   fallen=party().filter(c=>hp(c.id)<=0)
 }
 for(const c of fallen){
   if(c.id===healer.id)continue;
   const now=Number(run.expeditionTimeMs)||0,ready=Number(run.reviveReadyAt)||0;
   if(ready>now){
     const wait=ready-now;status('Revive recharging · party regroups');log('The party waits '+Math.ceil(wait/1000)+'s for Revive to recover.');
     act('healer',healer.name+' · Revive cooldown');await delay(600);advanceDungeonCooldowns(wait)
   }
   const targetPos=pctPosition('p-'+c.id),from=pctPosition('p-'+healer.id);
   move('p-'+healer.id,Math.max(6,targetPos.x-5),targetPos.y,520);status('Revive · 4.0s');act('healer',healer.name+' · Reviving '+c.name);log(healer.name+' begins Revive on '+c.name+'.');
   await delay(700);if(tok!==token||!run)return false;
   projectile('p-'+healer.id,'p-'+c.id,'heal',320);await delay(650);if(tok!==token||!run)return false;
   setHp(c.id,35);reviveResourceState(c,20);run.reviveSickness[c.id]=15000;restoreUnitVisual(c);updateRows();hitReact('p-'+c.id,'heal');floating('p-'+c.id,'REVIVED','heal');flash('REVIVED',false);
   log(c.name+' returns at 35% health with resurrection sickness.');run.outOfCombatRevives=(Number(run.outOfCombatRevives)||0)+1;
   advanceDungeonCooldowns(4000);run.reviveReadyAt=run.expeditionTimeMs+45000
 }
 return party().every(c=>hp(c.id)>0)
}

function stageEnemyMeta(s,index){
 const level=Math.max(1,Number(s?.enemyLevels?.[index])||Number(s?.level)||1);
 const type=String(s?.enemyTypes?.[index]||((s?.enemies?.length===1&&(s?.kind==='boss'||s?.kind==='final'))?'boss':(s?.kind==='event'?'elite':'trash'))).toLowerCase();
 const labels={trash:'TRASH',elite:'ELITE',boss:'BOSS','world-boss':'WORLD BOSS',add:'ADD'};
 return{level,type,label:labels[type]||type.toUpperCase()}
}
function enemyMetaText(s,index){const m=stageEnemyMeta(s,index);return'Lv. '+m.level+' · '+m.label}
function clearArenaEphemera(){
 const arena=$('#cb2dArena');if(!arena)return;
 arena.classList.remove('travelling','between-stages','stage-cleared');
 arena.querySelectorAll('.cb2d-projectile,.cb2d-number,.cb2d-threat-line,.cb2d-travel-banner,.cb2d-stage-clear,.cb2d-death-burst').forEach(x=>x.remove())
}
function enterResultsMode(){
 const shell=$('.cb2d-shell');if(shell){shell.classList.add('results-mode');shell.scrollTop=0}
 const end=$('#cb2dEnd');if(end){end.hidden=false;end.scrollTop=0}
}
function exitResultsMode(){
 const shell=$('.cb2d-shell');if(shell){shell.classList.remove('results-mode');shell.scrollTop=0}
}
async function stageClearTransition(s,nextStage,tok){
 if(tok!==token||!run)return;
 run.combatActive=false;run.mechanicActive=false;
 rebornCastClear();
 const arena=$('#cb2dArena');if(!arena)return;
 arena.classList.add('between-stages','stage-cleared');
 $('#cb2dTelegraphs').innerHTML='';
 arena.querySelectorAll('.cb2d-projectile,.cb2d-number,.cb2d-threat-line').forEach(x=>x.remove());
 status('Stage cleared · regrouping');
 act('tank','Regrouping');act('healer','Recovering the party');act('dps','Preparing next pull');
 const banner=document.createElement('div');banner.className='cb2d-stage-clear';banner.innerHTML='<small>STAGE CLEAR</small><b>'+esc(s.title)+'</b>'+(nextStage?'<span>Next · '+esc(nextStage.title)+'</span>':'');
 arena.appendChild(banner);
 await delay(650);
 banner.remove();arena.classList.remove('stage-cleared')
}
function spawn(s){
 clearArenaEphemera();renderDungeonEnvironment(s);$('#cb2dUnits').innerHTML='';$('#cb2dTelegraphs').innerHTML='';
 const max=s.kind==='final'?680:s.kind==='boss'?480:s.kind==='event'?220:120;
 run.enemyMax=s.enemies.map(()=>max);run.enemyHp=s.enemies.map(()=>max);
 run.threat=s.enemies.map(()=>Object.fromEntries(party().map(c=>[c.id,0])));
 run.aggro=s.enemies.map(()=>null);
 // Damage and healing are dungeon-long meters. Threat is encounter-only.
 run.combatStartedAt=0;run.lastMeterAt=0;renderCombatMeters();renderRebornHealingMeter();
 const melee=party().filter(c=>combatProfile(c)==='melee');
 const ranged=party().filter(c=>combatProfile(c)==='ranged');
 party().forEach((c,i)=>{
   addUnit('p-'+c.id,c.name,'party '+role(c)+' profile-'+combatProfile(c)+' '+classKey(c),4,50+(i-2)*4,'');mountRebornResourceBar(c);
   const unit=$('[data-unit="p-'+c.id+'"]');if(unit){unit.dataset.uiSlot=String(i);unit.style.setProperty('--label-shift-x',(i===0?-12:i===1?12:i===2?-20:i===3?20:0)+'px');unit.style.setProperty('--status-shift-x',(i===0?-10:i===1?10:i===2?-18:i===3?18:0)+'px')}
   let x=16,y=50;
   if(combatProfile(c)==='tank'){x=30;y=50}
   else if(combatProfile(c)==='melee'){x=23;y=43+(melee.indexOf(c)*14)}
   else if(combatProfile(c)==='ranged'){x=17;y=28+(ranged.indexOf(c)*44)}
   else{x=12;y=61}
   setTimeout(()=>{move('p-'+c.id,x,y,900);const bar=$('[data-unit="p-'+c.id+'"] .cb2d-unit-hp i');if(bar)bar.style.width=hp(c.id)+'%'},40)
 });
 s.enemies.forEach((n,i)=>{const meta=stageEnemyMeta(s,i),boss=meta.type==='boss'||meta.type==='world-boss';const y=s.enemies.length===1?50:30+i*(40/Math.max(1,s.enemies.length-1));addUnit('e-'+i,n,boss?'enemy boss':'enemy',92,y,boss?'big':'',enemyMetaText(s,i));setTimeout(()=>move('e-'+i,68,y,850),60)});
}

function point(id){
 const arena=$('#cb2dArena'),u=$('[data-unit="'+id+'"]');if(!arena||!u)return null;
 const a=arena.getBoundingClientRect(),r=u.getBoundingClientRect();
 return{x:r.left-a.left+r.width/2,y:r.top-a.top+r.height/2};
}
function setEnemyHp(index,value){
 if(!run)return;
 const previous=Number(run.enemyHp[index])||0;
 run.enemyHp[index]=clamp(Math.round(value),0,run.enemyMax[index]||1);
 const displayMax=Math.max(1,Number(run.enemyDisplayMax?.[index])||run.enemyMax[index]||1);
 const pct=clamp((run.enemyHp[index]/displayMax)*100,0,100);
 const bar=$('[data-unit="e-'+index+'"] .cb2d-unit-hp i');if(bar)bar.style.width=pct+'%';
 const unit=$('[data-unit="e-'+index+'"]');
 if(unit){
   unit.classList.toggle('critical',pct<30&&pct>0);
   if(previous>0&&run.enemyHp[index]<=0){
     unit.classList.add('dying');deathBurst('e-'+index);
     setTimeout(()=>{unit.classList.remove('dying');unit.classList.add('dead')},300);
   }
 }
}
function floating(id,text,kind){
 const arena=$('#cb2dArena'),p=point(id);if(!arena||!p)return;
 const e=document.createElement('div');e.className='cb2d-number '+(kind||'damage');e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),850)
}
function targetPulse(id){
 const u=$('[data-unit="'+id+'"]');if(!u)return;u.classList.add('targeted');setTimeout(()=>u.classList.remove('targeted'),420)
}
function projectile(from,to,kind='physical',ms=320){
 if(window.CellboundCombatFX?.living)return;

 const arena=$('#cb2dArena'),a=point(from),b=point(to);if(!arena||!a||!b)return;
 const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI;
 const e=document.createElement('i');e.className='cb2d-projectile '+kind;e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.transform='rotate('+angle+'deg)';arena.appendChild(e);
 requestAnimationFrame(()=>{e.style.transitionDuration=Math.round(ms/((run&&run.speed)||1))+'ms';e.style.transform='translate('+dx+'px,'+dy+'px) rotate('+angle+'deg)'});
 setTimeout(()=>e.remove(),Math.round(ms/((run&&run.speed)||1))+120)
}
function pctPosition(id){
 const el=$('[data-unit="'+id+'"]');if(!el)return{x:50,y:50};
 return{x:Number(el.dataset.x)||50,y:Number(el.dataset.y)||50};
}
function enemyPosition(index){return pctPosition('e-'+index)}
function formationPoint(c,index){
 const ep=enemyPosition(index),profile=combatProfile(c),p=party();
 if(run?.externalMode){
   const same=p.filter(x=>combatProfile(x)===profile&&hp(x.id)>0),i=Math.max(0,same.indexOf(c)),count=Math.max(1,same.length),spread=(lo,hi)=>count===1?(lo+hi)/2:lo+(hi-lo)*(i/(count-1));
   if(profile==='tank')return{x:clamp(ep.x-10,34,68),y:clamp(spread(36,64),14,86)};
   if(profile==='melee')return{x:clamp(ep.x-14-(i%2)*2,30,66),y:clamp(spread(20,80),14,86)};
   if(profile==='ranged')return{x:clamp(ep.x-31-(i%2)*3,18,46),y:clamp(spread(18,82),14,86)};
   return{x:clamp(ep.x-40,12,34),y:clamp(spread(28,72),14,86)}
 }
 if(profile==='tank')return{x:clamp(ep.x-10,34,68),y:clamp(ep.y,15,85)};
 if(profile==='melee'){
   const melees=p.filter(x=>combatProfile(x)==='melee'),i=Math.max(0,melees.indexOf(c));
   const offsets=[-10,10,-16,16];
   return{x:clamp(ep.x-14-(i%2)*2,30,66),y:clamp(ep.y+(offsets[i]||0),14,86)};
 }
 if(profile==='ranged'){
   const ranged=p.filter(x=>combatProfile(x)==='ranged'),i=Math.max(0,ranged.indexOf(c));
   const ys=[32,68,46];
   return{x:clamp(ep.x-30-(i%2)*4,20,46),y:ys[i]||50};
 }
 const living=p.filter(x=>hp(x.id)>0),avgY=living.reduce((n,x)=>n+pctPosition('p-'+x.id).y,0)/Math.max(1,living.length);
 return{x:clamp(ep.x-40,12,34),y:clamp(avgY+12,24,78)}
}
function maintainPosition(c,index,fast=false){
 if(run?.mechanicActive||index<0)return;
 const desired=formationPoint(c,index),current=pctPosition('p-'+c.id);
 const distance=Math.hypot(desired.x-current.x,desired.y-current.y);
 if(distance>2.5)move('p-'+c.id,desired.x,desired.y,fast?220:420);
}
function buildThreat(index,c,amount,source='damage'){
 if(!run?.threat?.[index]||!c)return;
 const profile=combatProfile(c),table=run.threat[index];
 let value=Math.max(0,Number(amount)||0);
 if(source==='taunt'&&profile==='tank'){
   const highest=Math.max(0,...Object.values(table).map(Number));
   const lead=I?.tauntLead?.(c)||1.15;
   const snap=Math.max(Number(table[c.id])||0,highest*lead+Math.max(70,value*.6));
   table[c.id]=snap;
   updateAggro(index);queueCombatMeterRender();return;
 }
 if(value<=0)return;
 const enemyCount=run.enemyHp.filter(v=>v>0).length;
 if(source==='heal')value*=1.5*(I?.healThreatMultiplier?.(c)||1);
 else if(source==='group')value*=1;
 else value*=I?.damageThreatMultiplier?.(c,{enemyCount})||(profile==='tank'?2.4:1);
 table[c.id]=(Number(table[c.id])||0)+value;
 updateAggro(index);queueCombatMeterRender();
}
function updateAggro(index){
 const table=run?.threat?.[index];if(!table)return null;
 const living=party().filter(c=>hp(c.id)>0);
 let target=living.sort((a,b)=>(table[b.id]||0)-(table[a.id]||0))[0]||null;
 const tank=living.find(c=>combatProfile(c)==='tank');
 if(tank&&target&&target.id!==tank.id&&(table[tank.id]||0)>=(table[target.id]||0)*.88)target=tank;
 const previous=run.aggro[index];run.aggro[index]=target?.id||null;
 if(previous!==run.aggro[index]&&target){
   showThreatLink(index,target);
   const label=combatProfile(target)==='tank'?'THREAT HELD':'AGGRO LOST';
   floating('p-'+target.id,label,combatProfile(target)==='tank'?'threat':'incoming');
 }
 return target;
}
function threatTarget(index){
 const id=run?.aggro?.[index],c=party().find(x=>x.id===id&&hp(x.id)>0);
 if(c)return c;
 return updateAggro(index)||party().find(x=>hp(x.id)>0)||null;
}
function showThreatLink(index,target){
 const arena=$('#cb2dArena'),a=point('e-'+index),b=point('p-'+target.id);if(!arena||!a||!b)return;
 let line=arena.querySelector('[data-threat-line="'+index+'"]');
 if(!line){line=document.createElement('i');line.className='cb2d-threat-line';line.dataset.threatLine=index;arena.appendChild(line)}
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
 line.style.left=a.x+'px';line.style.top=a.y+'px';line.style.width=length+'px';line.style.transform='rotate('+angle+'deg)';
 line.classList.toggle('danger',combatProfile(target)!=='tank');
 clearTimeout(line._timer);line._timer=setTimeout(()=>line.remove(),900);
}
function moveEnemyToThreat(index,s){
 if(run?.mechanicActive||run.enemyHp[index]<=0)return;
 const target=threatTarget(index);if(!target)return;
 const t=pctPosition('p-'+target.id),e=pctPosition('e-'+index);
 const boss=s.kind==='boss'||s.kind==='final';
 const desiredX=clamp(t.x+(combatProfile(target)==='tank'?8:4),boss?52:40,84);
 const packOffsets=[-10,0,10,-16,16];const desiredY=clamp(t.y+(packOffsets[index%packOffsets.length]||0),14,86);
 if(Math.hypot(desiredX-e.x,desiredY-e.y)>3)move('e-'+index,desiredX,desiredY,boss?500:360);
 showThreatLink(index,target);
}
function settleFormation(index){
 party().filter(c=>hp(c.id)>0).forEach(c=>maintainPosition(c,index,true));
}

function attackKind(c){
 if(c.class==='Mage')return'magic';
 if(c.class==='Hunter')return'arrow';
 if(role(c)==='healer')return'heal';
 return'melee';
}
function ability(c){
 if(c.class==='Mage')return'Arcane Bolt';
 if(c.class==='Hunter')return'Quick Shot';
 if(c.class==='Rogue')return'Eviscerate';
 if(c.class==='Priest')return'Smite';
 if(c.class==='Paladin')return'Judgement';
 return role(c)==='tank'?'Shield Strike':'Heavy Slash';
}
function enemyTarget(index){return threatTarget(index)}
function enemyIndex(){
 if(!run)return-1;
 const floor=run.allowKill?0:.16;
 let idx=run.enemyHp.findIndex((v,i)=>v>(run.enemyMax[i]||1)*floor+1);
 if(idx<0)idx=run.enemyHp.findIndex(v=>v>0);
 return idx;
}

function attackCooldown(c){
 const profile=combatProfile(c);
 let base=1000;
 if(profile==='tank')base=1050;
 else if(c.class==='Rogue')base=700;
 else if(c.class==='Hunter')base=1050;
 else if(c.class==='Mage')base=1250;
 else if(c.class==='Warrior')base=900;
 else if(c.class==='Paladin')base=1050;
 return Math.round(base*(I?.cooldownMultiplier?.(c)||1));
}
function enemyCooldown(s,index){
 const base=s.kind==='final'?900:s.kind==='boss'?1000:s.kind==='event'?1150:1250;
 return base+(index*90)+Math.floor(Math.random()*180);
}
function scheduleImpact(fn,ms,tok){
 setTimeout(()=>{
   if(tok!==token||!run||!run.combatActive)return;
   fn();
 },Math.max(20,Math.round(ms/(run?.speed||1))));
}
function firePartyAttack(c,index,tok){
 if(tok!==token||!run?.combatActive||index<0||hp(c.id)<=0||run.enemyHp[index]<=0)return;
 const kind=attackKind(c),profile=combatProfile(c),name=ability(c),beforePct=(run.enemyHp[index]/Math.max(1,run.enemyMax[index]))*100;
 const hit=Number(run.hitCount?.[c.id])||0,base=(profile==='tank'?12:18)+Math.floor(Math.random()*10)+(tactics.aggression==='aggressive'?4:0);
 const amount=Math.max(1,Math.round(base*(I?.damageMultiplier?.(c,{enemyCount:run.enemyHp.filter(v=>v>0).length,enemyPct:beforePct,healthPct:hp(c.id),opening:hit===0,hit})||1)));
 run.hitCount[c.id]=hit+1;

 maintainPosition(c,index,true);
 setFocusEnemy(index);faceUnit('p-'+c.id,'e-'+index);
 const attacker=$('[data-unit="p-'+c.id+'"]');
 if(attacker){attacker.classList.add('attacking');setTimeout(()=>attacker.classList.remove('attacking'),360)}
 act(profile==='tank'?'tank':'dps',c.name+' · '+name);

 if(kind==='melee'){
   const desired=formationPoint(c,index);
   move('p-'+c.id,desired.x,desired.y,150);
   scheduleImpact(()=>projectile('p-'+c.id,'e-'+index,'slash',150),90,tok);
 }else projectile('p-'+c.id,'e-'+index,kind,kind==='arrow'?260:330);

 const travel=kind==='melee'?180:(kind==='arrow'?280:350);
 scheduleImpact(()=>{
   if(run.enemyHp[index]<=0)return;
   const before=run.enemyHp[index];let next=before-amount;
   if(!run.allowKill)next=Math.max(next,(run.enemyMax[index]||1)*.16);
   setEnemyHp(index,next);
   const dealt=Math.max(0,before-run.enemyHp[index]);recordDamage(c,dealt);
   hitReact('e-'+index,'hit');floating('e-'+index,'-'+Math.round(dealt),'damage');
   buildThreat(index,c,dealt,'damage');

   const cleave=I?.cleaveRatio?.(c)||0;
   if(cleave>0){
     const others=run.enemyHp.map((v,i)=>({v,i})).filter(x=>x.i!==index&&x.v>0).slice(0,c.class==='Mage'?2:1);
     others.forEach(x=>{
       const b=run.enemyHp[x.i],secondary=Math.max(1,Math.round(dealt*cleave));let n=b-secondary;
       if(!run.allowKill)n=Math.max(n,(run.enemyMax[x.i]||1)*.16);
       setEnemyHp(x.i,n);const actual=Math.max(0,b-run.enemyHp[x.i]);if(actual<=0)return;
       recordDamage(c,actual);projectile('p-'+c.id,'e-'+x.i,kind==='magic'?'magic':'slash',220);
       floating('e-'+x.i,'-'+Math.round(actual),'damage');buildThreat(x.i,c,actual,'damage');
     });
   }

   const groupRatio=I?.groupThreatRatio?.(c)||0,now=performance.now();
   if(groupRatio>0&&run.enemyHp.filter(v=>v>0).length>1&&now>Number(run.identityTimers[c.id]||0)){
     run.enemyHp.forEach((v,i)=>{if(v>0&&i!==index)buildThreat(i,c,dealt*groupRatio,'group')});
     run.identityTimers[c.id]=now+3000;
     floating('p-'+c.id,c.class==='Paladin'?'CONSECRATION':'PACK THREAT','threat');
     if(c.class==='Paladin')act('tank',c.name+' · Consecration holding the pack');
   }
 },travel,tok);
}
function fireEnemyAttack(index,tok,s){
 if(tok!==token||!run?.combatActive||index<0||run.enemyHp[index]<=0)return;
 const target=enemyTarget(index);if(!target||hp(target.id)<=0)return;

 moveEnemyToThreat(index,s);
 faceUnit('e-'+index,'p-'+target.id);
 const attacker=$('[data-unit="e-'+index+'"]');
 if(attacker){attacker.classList.add('attacking');setTimeout(()=>attacker.classList.remove('attacking'),360)}
 projectile('e-'+index,'p-'+target.id,s.kind==='boss'||s.kind==='final'?'enemy-heavy':'enemy',280);

 const raw=(s.kind==='boss'||s.kind==='final'?6:3)+Math.floor(Math.random()*(s.kind==='boss'||s.kind==='final'?7:5));
 const amount=Math.max(1,Math.round(raw*(I?.incomingMultiplier?.(target,'physical')||1)));
 scheduleImpact(()=>{
   if(hp(target.id)<=0)return;
   setHp(target.id,hp(target.id)-amount);
   hitReact('p-'+target.id,'hit');
   setCond(target.id,cond(target.id)-Math.max(1,Math.round(amount/3)));
   floating('p-'+target.id,'-'+amount,'incoming');
   updateRows();
   if(hp(target.id)<35)act('healer','Emergency healing '+target.name);
 },280,tok);
}
function healerNeedsTarget(){
 return party().filter(c=>hp(c.id)>0&&hp(c.id)<94).sort((a,b)=>hp(a.id)-hp(b.id))[0]||null;
}
function scaledHeal(healer,target,base,kind='direct'){
 return Math.max(1,Math.round(base*(I?.healingMultiplier?.(healer,target,{kind,targetHp:hp(target.id)})||1)));
}
function applyHeal(healer,target,amount){
 if(!target||hp(target.id)<=0)return 0;
 const before=hp(target.id);setHp(target.id,before+amount);const effective=Math.max(0,hp(target.id)-before);
 if(effective>0){
   hitReact('p-'+target.id,'heal');floating('p-'+target.id,'+'+effective,'heal');
   run?.enemyHp?.forEach((v,i)=>{if(v>0)buildThreat(i,healer,effective,'heal')});
 }
 return effective;
}
function fireHeal(healer,target,tok){
 if(tok!==token||!run?.combatActive||!healer||!target||hp(healer.id)<=0||hp(target.id)<=0)return;
 const base=8+Math.floor(Math.random()*9),amount=scaledHeal(healer,target,base,'direct');
 const activeEnemy=enemyIndex();
 if(activeEnemy>=0)maintainPosition(healer,activeEnemy,false);
 act('healer',healer.name+' · Healing '+target.name);
 faceUnit('p-'+healer.id,'p-'+target.id);projectile('p-'+healer.id,'p-'+target.id,'heal',320);
 scheduleImpact(()=>{
   const effective=applyHeal(healer,target,amount);if(!effective)return;
   const tank=party().find(c=>combatProfile(c)==='tank'&&hp(c.id)>0);
   const beacon=I?.beaconRatio?.(healer)||0;
   if(beacon>0&&tank&&tank.id!==target.id){
     const copied=scaledHeal(healer,tank,base*beacon,'beacon');applyHeal(healer,tank,copied);
     act('healer',healer.name+' · Beacon copies healing to '+tank.name);
   }
   const splash=I?.groupHealRatio?.(healer)||0;
   if(splash>0){
     const count=I?.groupHealTargets?.(healer)||2;
     party().filter(c=>c.id!==target.id&&hp(c.id)>0&&hp(c.id)<98).sort((a,b)=>hp(a.id)-hp(b.id)).slice(0,count).forEach(c=>{
       const extra=scaledHeal(healer,c,base*splash,'group');applyHeal(healer,c,extra);
     });
     act('healer',healer.name+' · Party recovery');
   }
   const hot=I?.hotRatio?.(healer)||0;
   if(hot>0){
     [620,1240].forEach((ms,n)=>scheduleImpact(()=>{
       if(hp(target.id)<=0)return;const tick=scaledHeal(healer,target,base*hot,'hot');const got=applyHeal(healer,target,tick);
       if(got>0&&n===0)act('healer',healer.name+' · Rejuvenation ticking');
       updateRows();
     },ms,tok));
   }
   updateRows();
 },320,tok);
}
function fireHealerDamage(healer,index,tok){
 if(index<0||run.enemyHp[index]<=0)return;
 const base=7+Math.floor(Math.random()*5),amount=Math.max(1,Math.round(base*(I?.damageMultiplier?.(healer,{enemyCount:run.enemyHp.filter(v=>v>0).length,enemyPct:(run.enemyHp[index]/Math.max(1,run.enemyMax[index]))*100,healthPct:hp(healer.id),hit:Number(run.hitCount?.[healer.id])||0})||1)));
 maintainPosition(healer,index,false);
 act('healer',healer.name+' · Supporting damage');
 faceUnit('p-'+healer.id,'e-'+index);projectile('p-'+healer.id,'e-'+index,'magic',340);
 scheduleImpact(()=>{
   if(run.enemyHp[index]<=0)return;
   const before=run.enemyHp[index];let next=before-amount;
   if(!run.allowKill)next=Math.max(next,(run.enemyMax[index]||1)*.16);
   setEnemyHp(index,next);
   const dealt=Math.max(0,before-run.enemyHp[index]);recordDamage(healer,dealt);
   floating('e-'+index,'-'+Math.round(dealt),'damage');
   buildThreat(index,healer,dealt,'damage');
 },340,tok);
}
function microPosition(c,index){
 if(run?.mechanicActive||index<0)return;
 const profile=combatProfile(c),desired=formationPoint(c,index);
 let x=desired.x,y=desired.y;
 if(profile==='ranged'){
   x+=Math.random()*4-2;y+=Math.random()*6-3;
 }else if(profile==='healer'){
   x+=Math.random()*2-1;y+=Math.random()*5-2.5;
 }else if(profile==='melee'){
   y+=Math.random()*4-2;
 }
 move('p-'+c.id,clamp(x,10,82),clamp(y,10,90),320);
}
function combatLoop(s,tok){
 run.combatActive=true;
 const now=performance.now();run.combatStartedAt=now;run.lastMeterAt=0;renderCombatMeters();
 run.rtParty=Object.fromEntries(party().map((c,i)=>[c.id,{
   nextAttack:now+180+i*120,
   nextMove:now+80+i*55,
   nextHeal:now+260,
   nextSupport:now+900+i*100
 }]));
 run.rtEnemies=run.enemyHp.map((_,i)=>({
   nextAttack:now+650+i*180+Math.random()*250,
   nextMove:now+120+i*70
 }));

 const tank=party().find(c=>combatProfile(c)==='tank');
 if(tank){
   run.enemyHp.forEach((v,i)=>{if(v>0)buildThreat(i,tank,120,'taunt')});
   settleFormation(enemyIndex());
   act('tank',tank.name+' · Pulling the pack');
 }

 return new Promise(resolve=>{
   const tick=()=>{
     if(tok!==token||!run||!run.combatActive){resolve();return}

     const now=performance.now();
     if(!run.lastMeterAt||now-run.lastMeterAt>250){run.lastMeterAt=now;renderCombatMeters()}
     const targetIndex=enemyIndex();setFocusEnemy(targetIndex);
     if(targetIndex<0){run.combatActive=false;resolve();return}

     party().forEach(c=>{
       if(hp(c.id)<=0)return;
       const rt=run.rtParty[c.id]||(run.rtParty[c.id]={nextAttack:now,nextMove:now,nextHeal:now,nextSupport:now});
       const profile=combatProfile(c);
       const regen=I?.passiveRegen?.(c)||0;
       if(regen>0&&now>=rt.nextRacePulse){
         const before=hp(c.id);setHp(c.id,before+regen);const gained=Math.max(0,hp(c.id)-before);
         if(gained>0)floating('p-'+c.id,'+'+gained,'heal');
         rt.nextRacePulse=now+2400/(run.speed||1);updateRows();
       }

       if(now>=rt.nextMove){
         microPosition(c,targetIndex);
         rt.nextMove=now+(profile==='melee'?260:profile==='tank'?300:420)/(run.speed||1);
       }

       if(profile==='healer'){
         const low=healerNeedsTarget();
         if(low&&now>=rt.nextHeal){
           fireHeal(c,low,tok);
           rt.nextHeal=now+(820+Math.random()*220)/(run.speed||1);
           rt.nextSupport=now+1250/(run.speed||1);
         }else if(!low&&now>=rt.nextSupport){
           act('healer',c.name+' · Holding safe healing range');
           fireHealerDamage(c,targetIndex,tok);
           rt.nextSupport=now+(1700+Math.random()*450)/(run.speed||1);
         }
         return;
       }

       if(now>=rt.nextAttack){
         firePartyAttack(c,targetIndex,tok);
         rt.nextAttack=now+(attackCooldown(c)+(Math.random()*180-90))/(run.speed||1);
       }
     });

     run.enemyHp.forEach((v,i)=>{
       if(v<=0)return;
       const rt=run.rtEnemies[i]||(run.rtEnemies[i]={nextAttack:now,nextMove:now});
       if(now>=rt.nextMove){
         moveEnemyToThreat(i,s);
         rt.nextMove=now+(220+Math.random()*120)/(run.speed||1);
       }
       if(now>=rt.nextAttack){
         fireEnemyAttack(i,tok,s);
         rt.nextAttack=now+enemyCooldown(s,i)/(run.speed||1);
       }
     });

     setTimeout(tick,70);
   };
   tick();
 });
}
async function finishCombat(s,tok){
 run.allowKill=run.stageOutcome||!(s.kind==='boss'||s.kind==='final');

 if(run.allowKill){
   const deadline=performance.now()+8000;
   while(tok===token&&run?.combatActive&&enemyIndex()>=0&&performance.now()<deadline){
     await delay(120);
   }
   if(run?.combatActive&&enemyIndex()>=0){
     run.enemyHp.forEach((v,i)=>{if(v>0){setEnemyHp(i,0);floating('e-'+i,'FINISH','damage')}});
   }
 }else{
   await delay(650);
 }

 if(run)run.combatActive=false;
}

function arenaPoint(id){
 const arena=$('#cb2dArena'),u=$('[data-unit="'+id+'"]');if(!arena||!u)return null;
 const a=arena.getBoundingClientRect(),r=u.getBoundingClientRect();
 return{x:r.left-a.left+r.width/2,y:r.top-a.top+r.height/2,w:a.width,h:a.height};
}
function telegraphBase(type,label){
 const root=$('#cb2dTelegraphs');if(!root)return null;
 const e=document.createElement('div');e.className='cb2d-tg '+type;
 if(label){const s=document.createElement('span');s.className='cb2d-tg-label';s.textContent=label;e.appendChild(s)}
 root.appendChild(e);requestAnimationFrame(()=>e.classList.add('show'));return e
}
function coneTelegraph(fromId,toId,label='FRONTAL · MOVE OUT'){
 const a=arenaPoint(fromId),b=arenaPoint(toId);if(!a||!b)return telegraphBase('cone',label);
 const e=telegraphBase('cone dynamic',label),dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx);
 const length=Math.max(170,Math.min(Math.hypot(a.w,a.h)*.62,360)),height=Math.max(110,Math.min(170,length*.46));
 e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.width=length+'px';e.style.height=height+'px';e.style.transform='translateY(-50%) rotate('+(angle*180/Math.PI)+'deg)';
 e._hitShape={type:'cone',x:a.x,y:a.y,angle,length,halfAngle:Math.atan2(height/2,length)};
 return e
}
function lineTelegraph(fromId,toId,label='CHARGE PATH · MOVE'){
 const a=arenaPoint(fromId),b=arenaPoint(toId);if(!a||!b)return telegraphBase('line',label);
 const angle=Math.atan2(b.y-a.y,b.x-a.x),e=telegraphBase('line dynamic',label);
 const length=Math.hypot(a.w,a.h)*1.15,halfWidth=21;
 e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.width=length+'px';e.style.height=(halfWidth*2)+'px';e.style.transform='translateY(-50%) rotate('+(angle*180/Math.PI)+'deg)';
 e._hitShape={type:'line',x:a.x,y:a.y,angle,length,halfWidth};
 return e
}
function circleTelegraph(targetId,size=150,label='AREA ATTACK · MOVE OUT'){
 const p=arenaPoint(targetId);if(!p)return telegraphBase('circle',label);
 const e=telegraphBase('circle dynamic',label);
 e.style.left=p.x+'px';e.style.top=p.y+'px';e.style.width=size+'px';e.style.height=size+'px';e.style.transform='translate(-50%,-50%)';
 e._hitShape={type:'circle',x:p.x,y:p.y,radius:size/2};
 return e
}
function multiCircleTelegraph(targetIds,size=105,label='TARGETED AREA · MOVE'){
 const root=$('#cb2dTelegraphs');if(!root)return null;
 const wrap=document.createElement('div');wrap.className='cb2d-tg circles dynamic';const circles=[];
 targetIds.forEach((id,i)=>{
   const p=arenaPoint(id);if(!p)return;
   circles.push({x:p.x,y:p.y,radius:size/2});
   const mark=document.createElement('i');mark.style.left=p.x+'px';mark.style.top=p.y+'px';mark.style.width=size+'px';mark.style.height=size+'px';mark.style.transform='translate(-50%,-50%)';
   if(i===0&&label){const s=document.createElement('span');s.className='cb2d-tg-label';s.textContent=label;mark.appendChild(s)}
   wrap.appendChild(mark)
 });
 wrap._hitShape={type:'circles',circles};
 root.appendChild(wrap);requestAnimationFrame(()=>wrap.classList.add('show'));return wrap
}
function castTelegraph(casterId,label='INTERRUPTIBLE CAST'){
 const p=arenaPoint(casterId);if(!p)return telegraphBase('cast',label);
 const e=telegraphBase('cast dynamic',label);e.style.left=p.x+'px';e.style.top=p.y+'px';e.style.width='72px';e.style.height='72px';e.style.transform='translate(-50%,-50%)';return e
}
function addTelegraph(points,label='ADDS SPAWNING'){
 const root=$('#cb2dTelegraphs');if(!root)return null;
 const wrap=document.createElement('div');wrap.className='cb2d-tg adds dynamic';
 points.forEach((p,i)=>{const mark=document.createElement('i');mark.style.left=p.x+'%';mark.style.top=p.y+'%';if(i===0){const s=document.createElement('span');s.className='cb2d-tg-label';s.textContent=label;mark.appendChild(s)}wrap.appendChild(mark)});
 root.appendChild(wrap);requestAnimationFrame(()=>wrap.classList.add('show'));return wrap
}
function pointInTelegraph(p,shape){
 if(!p||!shape)return false;
 if(shape.type==='circle')return Math.hypot(p.x-shape.x,p.y-shape.y)<=shape.radius;
 if(shape.type==='circles')return shape.circles.some(x=>Math.hypot(p.x-x.x,p.y-x.y)<=x.radius);
 const dx=p.x-shape.x,dy=p.y-shape.y;
 const along=dx*Math.cos(shape.angle)+dy*Math.sin(shape.angle);
 const across=-dx*Math.sin(shape.angle)+dy*Math.cos(shape.angle);
 if(shape.type==='line')return along>=0&&along<=shape.length&&Math.abs(across)<=shape.halfWidth;
 if(shape.type==='cone'){
   if(along<0||along>shape.length)return false;
   const angle=Math.abs(Math.atan2(across,along));
   return angle<=shape.halfAngle;
 }
 return false
}
function telegraphVictims(e){
 const shape=e?._hitShape;if(!shape)return[];
 return party().filter(c=>hp(c.id)>0&&pointInTelegraph(arenaPoint('p-'+c.id),shape))
}
function applyMechanicDamage(victims,amount,conditionLoss,label){
 if(!victims.length)return[];
 victims.forEach(c=>{
   setHp(c.id,hp(c.id)-amount);
   setCond(c.id,cond(c.id)-conditionLoss);
   hitReact('p-'+c.id,'hit');
   floating('p-'+c.id,'-'+amount,'incoming')
 });
 updateRows();
 const names=victims.map(c=>c.name);
 log(label+' hits '+names.join(', ')+'.');
 return names
}
function resolveFloorMechanic(e,{damage=14,condition=5,label='Mechanic',allowTankSoak=false,damageType='magic'}={}){
 const victims=telegraphVictims(e);
 if(!victims.length){
   flash('AVOIDED',false);log(label+' is avoided by the party.');clearTelegraph(e,'safe');
   return{victims:[],avoidableHits:[]}
 }
 const avoidableHits=allowTankSoak?victims.filter(c=>combatProfile(c)!=='tank'):victims;
 applyMechanicDamage(victims,damage,condition,label,damageType);
 if(avoidableHits.length){
   flash(avoidableHits.length+' HIT',true);
   clearTelegraph(e,'impact')
 }else{
   flash('TANK SOAK',false);
   clearTelegraph(e,'impact')
 }
 return{victims,avoidableHits}
}

function clearTelegraph(e,result='safe'){
 if(!e)return;e.classList.add(result);setTimeout(()=>e.remove(),260)
}
function tg(type){
 if(type==='cast')return castTelegraph('e-0');
 if(type==='cone'){const tank=party().find(c=>combatProfile(c)==='tank');return coneTelegraph('e-0',tank?'p-'+tank.id:'p-'+party()[0]?.id)}
 if(type==='line'){const targets=party().filter(c=>combatProfile(c)!=='tank'&&hp(c.id)>0),target=targets[Math.floor(Math.random()*Math.max(1,targets.length))]||party()[0];return lineTelegraph('e-0','p-'+target.id)}
 if(type==='circle')return circleTelegraph('e-0',160,'BOSS AOE · MOVE OUT');
 if(type==='circles'){const targets=party().filter(c=>combatProfile(c)!=='tank').slice(0,3);return multiCircleTelegraph(targets.map(c=>'p-'+c.id),105,'TARGETED AOE · SPREAD')}
 if(type==='adds')return addTelegraph([{x:72,y:35},{x:72,y:65}]);
 return telegraphBase(type)
}
function flash(t,danger){const a=$('#cb2dArena'),e=document.createElement('div');e.className='cb2d-flash '+(danger?'bad':'good');e.textContent=t;a.appendChild(e);setTimeout(()=>e.remove(),900)}
async function cast(name,ms,tok){
 const n=$('#cb2dCastName'),tm=$('#cb2dCastTime'),f=$('#cb2dCastFill');if(n)n.textContent=name;if(f)f.style.width='0%';
 const total=Math.round(ms/(run.speed||1)),start=Date.now();
 return new Promise((res,rej)=>{const q=setInterval(()=>{if(tok!==token){clearInterval(q);rej(new Error('cancelled'));return}const p=clamp((Date.now()-start)/total,0,1);if(f)f.style.width=(p*100)+'%';if(tm)tm.textContent=Math.max(0,(total-(Date.now()-start))/1000).toFixed(1)+'s';if(p>=1){clearInterval(q);res()}},45)})
}
function interruptSpecialist(){return party().find(c=>hp(c.id)>0&&(c.class==='Rogue'||c.class==='Hunter'||(c.class==='Warrior'&&c.spec==='Arms')))||party().find(c=>hp(c.id)>0&&combatProfile(c)!=='healer')}
function interruptOK(s){if(run.forceInterrupt){run.forceInterrupt=false;return true}const specialist=Boolean(interruptSpecialist());if(tactics.interrupts==='high')return true;if(tactics.interrupts==='important')return s.kind==='boss'||s.kind==='final'||specialist;return s.kind==='final'}
function regroup(){
 const index=enemyIndex();
 if(index>=0){settleFormation(index);return}
 const p=party();
 if(run?.externalMode){p.forEach((c,i)=>{const pos=sharedFormationPosition(c,i,p.length);move('p-'+c.id,pos.x,pos.y,500)});return}
 const melee=p.filter(c=>combatProfile(c)==='melee'),ranged=p.filter(c=>combatProfile(c)==='ranged');
 p.forEach(c=>{
   let x=22,y=50;
   if(combatProfile(c)==='tank'){x=32;y=50}
   else if(combatProfile(c)==='melee'){x=25;y=43+melee.indexOf(c)*14}
   else if(combatProfile(c)==='ranged'){x=18;y=32+ranged.indexOf(c)*36}
   else{x=13;y=61}
   move('p-'+c.id,x,y,500)
 })
}
async function mechanic(s,m,tok){
 const name=m[0],type=m[1],ms=m[2];run.mechanicActive=true;status(name+' incoming');log(name+' begins.');
 if(type==='interrupt'){
   const v=castTelegraph('e-0','INTERRUPT '+name.toUpperCase());act('dps','Watching interrupt window');
   if(interruptOK(s)){await cast(name,Math.round(ms*.56),tok);flash('INTERRUPTED',false);log('A damage dealer interrupts '+name+'.');act('dps','Interrupt successful');clearTelegraph(v,'safe');run.mechanicActive=false;return}
   await cast(name,ms,tok);flash('CAST COMPLETES',true);log(name+' lands. The healer recovers the group.');party().forEach(c=>{setCond(c.id,cond(c.id)-5);setHp(c.id,hp(c.id)-8);hitReact('p-'+c.id,'hit');floating('p-'+c.id,'-8','incoming')});updateRows();clearTelegraph(v,'impact');run.mechanicActive=false;return
 }
 if(type==='cone'){
   const tank=party().find(c=>role(c)==='tank');if(tank)move('p-'+tank.id,51,50,420);move('e-0',59,50,420);await delay(180);const v=coneTelegraph('e-0',tank?'p-'+tank.id:'p-'+party()[0]?.id,'FRONTAL CLEAVE · ONLY TANK IN FRONT');act('tank','Turning the frontal away');log('Tank rotates the enemy away from the party.');
   await cast(name,ms,tok);const result=resolveFloorMechanic(v,{damage:12,condition:4,label:name,allowTankSoak:true,damageType:'physical'});if(result.avoidableHits.length)act('healer','Recovering frontal damage');else act('tank','Frontal contained');regroup();run.mechanicActive=false;return
 }
 if(type==='circle'||type==='circles'){
   const p=party(),targets=type==='circles'?p.filter(c=>combatProfile(c)!=='tank').slice(0,3):[],v=type==='circles'?multiCircleTelegraph(targets.map(c=>'p-'+c.id),108,'VENTS TARGET PLAYERS · SPREAD'):circleTelegraph('e-0',170,'BOSS AOE · GET OUT'),a=[[25,20],[20,78],[38,22],[36,51],[38,80]];p.forEach((c,i)=>move('p-'+c.id,a[i][0],a[i][1],450));act('healer','Moving while maintaining heals');act('dps','Spreading from danger');
   await cast(name,ms,tok);const result=resolveFloorMechanic(v,{damage:type==='circles'?15:18,condition:type==='circles'?5:6,label:name});if(result.victims.length)act('healer','Recovering '+result.victims.length+' mechanic hit'+(result.victims.length>1?'s':''));regroup();run.mechanicActive=false;return
 }
 if(type==='line'){
   const candidates=party().filter(c=>combatProfile(c)!=='tank'&&hp(c.id)>0),target=candidates[Math.floor(Math.random()*Math.max(1,candidates.length))]||party()[0],v=lineTelegraph('e-0','p-'+target.id,'CHARGE LINE · SIDESTEP');party().filter(c=>c.id!==target.id&&combatProfile(c)!=='tank').forEach((c,i)=>move('p-'+c.id,27,24+i*27,420));if(target)move('p-'+target.id,25,82,420);act('dps','Sidestepping line attack');
   await cast(name,ms,tok);const result=resolveFloorMechanic(v,{damage:20,condition:7,label:name,damageType:'physical'});if(result.victims.length)act('healer','Recovering line damage');regroup();run.mechanicActive=false;return
 }
 if(type==='adds'){
   const v=addTelegraph([{x:72,y:35},{x:72,y:65}],'ADDS SPAWNING · TANK PREPARES');for(let i=0;i<2;i++){addUnit('add-'+i,'Add','enemy small',84,35+i*30,'small');setTimeout(()=>move('add-'+i,56,35+i*30,450),20)}const tank=party().find(c=>combatProfile(c)==='tank');if(tank)act('tank',tank.name+' · Taunting spawned adds');act('dps',tactics.adds==='boss'?'Maintaining boss pressure':'Swapping to adds');log('Adds spawn. The tank gathers them.');
   await cast(name,ms,tok);clearTelegraph(v,'impact');await delay(550);$$('[data-unit^="add-"]').forEach(e=>e.remove());run.mechanicActive=false;return
 }
}
async function travelDeeper(nextStage,tok){
 if(tok!==token||!run)return;
 const arena=$('#cb2dArena');arena?.classList.add('travelling');
 run.mechanicActive=false;setFocusEnemy(-1);$('#cb2dTelegraphs').innerHTML='';
 status('Path clear · moving deeper into the Vault');
 act('tank','Leading the route');act('healer','Following the group');act('dps','Moving to the next pull');
 log('The party regroups and advances toward '+nextStage.title+'.');
 const chars=party();
 const travelY=[50,60,35,47,73];
 chars.forEach((c,i)=>move('p-'+c.id,46+(combatProfile(c)==='tank'?6:0),travelY[i]||50,500));
 await delay(520);
 chars.forEach((c,i)=>move('p-'+c.id,88,travelY[i]||50,720));
 const banner=document.createElement('div');banner.className='cb2d-travel-banner';banner.innerHTML='<small>MOVING DEEPER</small><b>'+esc(nextStage.title)+'</b>';$('#cb2dArena')?.appendChild(banner);
 await delay(760);banner.remove();arena?.classList.remove('travelling')
}

function bonus(s){let b=run.override||0;if(tactics.aggression==='aggressive')b+=4;if(tactics.aggression==='safe'&&s.kind==='trash')b+=4;if(tactics.defensives==='early')b+=3;if(tactics.defensives==='save'&&s.kind==='final')b+=5;if(tactics.adds==='full'&&s.mechanics.some(m=>m[1]==='adds'))b+=4;return b}
function professionPrepBonus(){
 if(!P?.activeBonuses)return 0;
 const score=party().reduce((n,c)=>{const b=P.activeBonuses(c)||{};return n+
   (Number(b.damagePct)||0)*.55+(Number(b.crit)||0)*.18+(Number(b.haste)||0)*.16+
   (Number(b.block)||0)*.16+(Number(b.healing)||0)*.16+(Number(b.stamina)||0)*.08+
   (Number(b.armour)||0)*.015+(Number(b.magicWardPct)||0)*.2},0);
 return clamp(score,0,8)
}
function chance(s){const avg=party().reduce((n,c)=>n+cond(c.id),0)/5,avgLevel=party().reduce((n,c)=>n+Math.max(1,Number(c.level)||1),0)/Math.max(1,party().length);return clamp(Math.round(s.base+(ilvl()-18)*2+(avgLevel-(s.level||1))*2.5+(avg-75)*.1+bonus(s)+professionPrepBonus()),35,97)}
function learn(s,ok){const a=ok?(s.kind==='trash'||s.kind==='event'?3:7):5;party().forEach(c=>{c.knowledge=c.knowledge||{};const gain=Math.max(1,Math.round(a*(I?.knowledgeMultiplier?.(c)||1)));c.knowledge[s.knowledge]=clamp((Number(c.knowledge[s.knowledge])||0)+gain,0,100)});return a}
function recordMaterialDrop(drop,bossName){
 if(!run?.loot||!drop)return;
 const meta=P?.MATERIALS?.[drop.key],current=run.loot.materials[drop.key]||{key:drop.key,name:meta?.name||drop.key,quantity:0,source:bossName,icon:meta?.icon||'◇',rarity:meta?.rarity||'Common'};
 current.quantity+=Number(drop.quantity)||0;current.source=bossName;run.loot.materials[drop.key]=current
}
function loot(s){
 if(!s.bossId)return null;
 const boss=Game.bosses.find(b=>b.id===s.bossId);
 if(P&&P.rollReagents){
   const drops=P.rollReagents(s.bossId)||[];
   drops.forEach(d=>{Game.addMaterial(d.key,d.quantity);recordMaterialDrop(d,boss?.name||s.title)})
 }
 const mode=run?.endgame?.difficulty||'normal',rates=mode==='normal'?{ashwarden:.20,embermaw:.25,vaultheart:.50}:mode==='heroic'?{ashwarden:.25,embermaw:.35,vaultheart:.60}:{ashwarden:.30,embermaw:.40,vaultheart:.70},dropChance=Number(rates[s.bossId])||.20;
 const pityFinal=s.kind==='final'&&run.loot.gear.length===0&&window.CellboundEndgame?.clearLootGuaranteed?.('ashen-vault');
 if(pityFinal||Math.random()<dropChance){
   const rolled=window.CellboundEndgame?.rollPersonalLoot?.('ashen-vault',s.bossId||s.id);
   if(rolled){
     const item=Object.assign({},rolled,{source:'The Ashen Vault · '+boss.name+' · '+(run?.endgame?.label||'Normal')});
     Game.addBankItem(item);run.loot.gear.push(item);return item
   }
 }
 return null
}
async function playWipeVisual(s){
 if(!run)return;
 run.combatActive=false;run.mechanicActive=false;
 status((s.kind==='final'?'Final mechanic failed':'The formation breaks')+' · party wipe');
 log(s.title+' overwhelms the party.');
 act('tank','Down');act('healer','Down');act('dps','Down');
 const chars=party();
 for(let i=0;i<chars.length;i++){
   const c=chars[i],remaining=Math.max(1,hp(c.id)),enemy='e-'+Math.min(i,Math.max(0,(run.enemyHp?.length||1)-1));
   targetPulse('p-'+c.id);
   projectile(enemy,'p-'+c.id,'enemy-heavy',260);
   await delay(120);
   setHp(c.id,0);setCond(c.id,0);hitReact('p-'+c.id,'hit');
   floating('p-'+c.id,'-'+remaining,'incoming');
   updateRows();
 }
 flash('PARTY WIPE',true);
 await delay(650);
}

async function resolveStage(s){
 const ok=run.stageOutcome;
 if(!run.rebornResult){
   const dmg=ok?(s.kind==='boss'||s.kind==='final'?5:3):(s.kind==='boss'||s.kind==='final'?22:10);
   party().forEach(c=>{const hit=Math.max(1,dmg-Math.floor(Math.random()*4));setCond(c.id,cond(c.id)-hit);if(!ok)setHp(c.id,hp(c.id)-Math.ceil(hit/2))});
 }
 updateRows();
 if(ok){
   const k=learn(s,true),item=loot(s);if(s.bossId){
     state().bossKills[s.bossId]=true;
     const expired=P?.consumeBossCharges?.(party())||[];
     if(expired.length){expired.forEach(x=>log(x+' expired.'));flash('PROFESSION EFFECT EXPIRED',false)}
   }
   if(s.id==='kael'){state().gold+=35;run.loot.gold+=35}
   if(s.id==='embermaw'){state().gold+=55;run.loot.gold+=55}
   state().activity.push(s.title+' cleared during The Ashen Vault.');log(s.title+' cleared. Mastery +'+k+'%.');if(item){run.rewards.push(item.name);flash('LOOT ACQUIRED',false);log(item.name+' sent to the Guild Bank.')}
   Game.save();await Game.persistState();return true
 }
 learn(s,false);const wipe=s.kind==='boss'||s.kind==='final'||party().some(c=>hp(c.id)<=0||cond(c.id)<=0);
 if(!wipe){log(s.title+' hurts the group, but the party keeps moving.');Game.save();await Game.persistState();return true}
 if(!run.rebornResult)await playWipeVisual(s);
 Game.applyPartyCellShock(25);const st=state();st.dungeonHistory=Array.isArray(st.dungeonHistory)?st.dungeonHistory:[];st.dungeonHistory.unshift({at:new Date().toISOString(),result:'wipe',stage:s.id,partyIlvl:ilvl()});st.dungeonHistory=st.dungeonHistory.slice(0,20);st.activity.push('The guild wiped at '+s.title+'. All five gained 25% Cell Shock.');await Game.persistState();finish(false,s);return false
}


function combatRebornReady(){
 return !!(window.CellboundCombatReborn&&typeof window.CellboundCombatReborn.simulate==='function')
}
function ensureCombatRebornEngine(){
 if(combatRebornReady())return Promise.resolve(window.CellboundCombatReborn);
 if(rebornLoaderPromise)return rebornLoaderPromise;
 status('Loading combat…');
 log('Combat is not ready yet. Reloading the encounter.');
 rebornLoaderPromise=new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(ok,error)=>{
     if(settled)return;settled=true;clearTimeout(timeout);
     if(ok&&combatRebornReady())resolve(window.CellboundCombatReborn);
     else reject(error||new Error('Combat Reborn engine failed to initialise'))
   };
   const script=document.createElement('script');
   script.src='./combat-reborn-v1.js?v=1&recover=1';
   script.async=true;
   script.dataset.combatRebornRecovery='1';
   script.onload=()=>finish(true);
   script.onerror=()=>finish(false,new Error('Combat core asset could not be loaded'));
   document.head.appendChild(script);
   const timeout=setTimeout(()=>finish(false,new Error('Combat Reborn runtime timed out while loading')),8000);
 }).finally(()=>{rebornLoaderPromise=null});
 return rebornLoaderPromise
}
function showRebornStartupFailure(error,s,tok){
 if(tok!==token||!run)return;
 console.error('Ashen Vault Combat Reborn startup',error);
 run.combatActive=false;
 const message=String(error?.message||error||'Unknown combat engine error');
 status('Combat engine failed to start');
 log('Combat could not start: '+message);
 act('tank','Waiting');act('healer','Waiting');act('dps','Waiting');
 const arena=$('#cb2dArena');if(!arena)return;
 let panel=$('#cbrStartupError');
 if(!panel){
   panel=document.createElement('div');panel.id='cbrStartupError';panel.className='cbr-startup-error';
   panel.innerHTML='<small>COMBAT CORE</small><b>Combat failed to start.</b><span data-cbr-error></span><button type="button" data-cbr-retry>RETRY COMBAT</button>';
   arena.appendChild(panel)
 }
 const copy=panel.querySelector('[data-cbr-error]');if(copy)copy.textContent='The encounter has not started. '+message;
 const button=panel.querySelector('[data-cbr-retry]');
 if(button)button.onclick=async()=>{
   button.disabled=true;button.textContent='RETRYING…';panel.remove();
   try{
     await ensureCombatRebornEngine();
     if(tok!==token||!run)return;
     await seamlessFrom(run.stage,tok)
   }catch(err){showRebornStartupFailure(err,s,tok)}
 }
}

function rebornTactics(){
 return{
   interruptPriority:tactics.bossPlan==='control'?'high':tactics.interrupts==='high'?'high':tactics.interrupts==='conservative'?'danger-only':'standard',
   interruptAssignment:tactics.interruptAssignment,
   addPriority:tactics.bossPlan==='control'?'immediate':tactics.bossPlan==='burn'?'boss':tactics.adds==='full'?'immediate':tactics.adds==='boss'?'boss':'balanced',
   defensiveUsage:tactics.bossPlan==='control'?'aggressive':tactics.defensives==='early'?'aggressive':tactics.defensives==='save'?'conservative':'standard',
   pullStyle:tactics.aggression==='aggressive'?'aggressive':tactics.aggression==='safe'?'safe':'normal',
   movementDiscipline:tactics.movement==='safety'?'safety':tactics.movement==='damage'?'damage':'balanced',
   cooldownUse:tactics.bossPlan==='burn'?'free':tactics.cooldowns,
   crowdControl:tactics.bossPlan==='control'?'priority-elites':tactics.cc
 }
}
function rebornEncounter(s){
 const room=ASHEN_ROOMS[s.id]||{};
 const recommendedItemLevel=s.level<=3?18:s.level===4?20:22;
 const base={id:s.id,title:s.title,kind:s.kind,level:s.level||1,recommendedItemLevel,knowledgeKey:s.knowledge||s.id,enemyLevels:s.enemyLevels||null,enemyTypes:s.enemyTypes||null,enemies:[...s.enemies],enemyHealth:s.kind==='final'?680:s.kind==='boss'?480:s.kind==='event'?220:120,mechanics:s.mechanics.map(m=>Array.isArray(m)?{name:m[0],type:m[1],duration:m[2]}:{...m}),environment:{room:room.room||s.id,blockers:(room.blockers||[]).map(b=>({...b,blocksLos:b.blocksLos!==false,blocksMovement:b.blocksMovement!==false}))}};
 return window.CellboundEndgame?.stageConfig?.('ashen-vault',base)||base
}
function copyObject(v){return JSON.parse(JSON.stringify(v||{}))}
function rebornPlayerByUnit(id){return party().find(c=>'p-'+c.id===id)||null}
function rebornEnemyIndex(id){const m=String(id||'').match(/^e-(\d+)$/);return m?Number(m[1]):-1}
function ensureRebornHealingMeter(){
 const stack=$('.cb2d-combat-meters');if(!stack||$('#cb2dHealingMeter'))return;
 const sec=document.createElement('section');sec.className='cb2d-meter-panel healing';sec.innerHTML='<div class="cb2d-meter-head"><small>HEALING METER</small><span id="cb2dHealingTotal">0 total</span></div><div id="cb2dHealingMeter" class="cb2d-meter-list"></div>';stack.appendChild(sec)
}
function renderRebornHealingMeter(){
 ensureRebornHealingMeter();const root=$('#cb2dHealingMeter');if(!root||!run)return;
 const p=party(),elapsed=Math.max(1,(Number(run.expeditionTimeMs)||0)/1000);
 const rows=p.map(c=>({c,value:Number(run.healingDone?.[c.id])||0,over:Number(run.overhealing?.[c.id])||0})).sort((a,b)=>b.value-a.value);
 const max=Math.max(1,...rows.map(x=>x.value)),total=rows.reduce((n,x)=>n+x.value,0),totalEl=$('#cb2dHealingTotal');if(totalEl)totalEl.textContent=total.toLocaleString()+' total';
 root.innerHTML=rows.map(({c,value,over},i)=>'<div class="cb2d-meter-row '+meterRole(c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+'</b><span>'+value.toLocaleString()+' · '+Math.round(value/elapsed)+' HPS · '+over.toLocaleString()+' overheal</span></div><em><i style="width:'+(value/max*100)+'%"></i></em></div>').join('')
}
function recordRebornHealing(c,amount,over=0){
 if(!run||!c)return;run.healingDone=run.healingDone||{};run.overhealing=run.overhealing||{};
 run.healingDone[c.id]=(Number(run.healingDone[c.id])||0)+Math.max(0,Math.round(Number(amount)||0));
 run.overhealing[c.id]=(Number(run.overhealing[c.id])||0)+Math.max(0,Math.round(Number(over)||0));queueCombatMeterRender(true)
}
function rebornResourceVisual(e){
 if(!e?.source||!String(e.source).startsWith('p-'))return;
 const c=rebornPlayerByUnit(e.source),unit=$('[data-unit="'+e.source+'"]');if(!unit)return;
 let bar=unit.querySelector('.cbr-resource');if(!bar&&c)bar=mountRebornResourceBar(c);
 if(!bar)return;
 const fallback=c?resourceDefFor(c):{name:'Power',max:100,start:100},name=e.payload?.resource||fallback.name,max=e.payload?.max??fallback.max,value=e.payload?.value??fallback.start;
 if(c&&run?.resources)run.resources[c.id]={name,max,value};
 updateResourceBarElement(bar,name,value,max,e.type,e.result||'')
}
function rebornCastStart(e){
 const n=$('#cb2dCastName'),tm=$('#cb2dCastTime'),f=$('#cb2dCastFill'),duration=Math.max(0,Number(e.payload?.duration)||0);
 if(n)n.textContent=e.ability||'Enemy Cast';if(tm)tm.textContent=(duration/1000).toFixed(1)+'s';
 if(f){f.style.transition='none';f.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!f.isConnected)return;f.style.transition='width '+Math.max(1,Math.round(duration/(run?.speed||1)))+'ms linear';f.style.width='100%'}))}
 clearTimeout(run.rebornCastTimer);run.rebornCastTimer=setTimeout(()=>{if(tm)tm.textContent='—'},Math.max(1,Math.round(duration/(run?.speed||1))));
}
function rebornCastClear(label='—'){
 const n=$('#cb2dCastName'),tm=$('#cb2dCastTime'),f=$('#cb2dCastFill');clearTimeout(run?.rebornCastTimer);
 if(n)n.textContent=label;if(tm)tm.textContent='—';if(f){f.style.transition='none';f.style.width='0%'}
}
function rebornTelegraph(e){
 const type=e.payload?.mechanicType,tokenId=e.payload?.token||('tg-'+e.timestamp),source=e.source||'e-0',target=e.payload?.targetId||e.target;let v=null;
 if(type==='cone')v=coneTelegraph(source,target||'p-'+party()[0]?.id,'FRONTAL · TANK FACE AWAY');
 else if(type==='line')v=lineTelegraph(source,target||'p-'+party().find(c=>role(c)!=='tank')?.id,'LINE ATTACK · SIDESTEP');
 else if(type==='circle')v=circleTelegraph(target||source,170,'GROUND AOE · MOVE OUT');
 else if(type==='circles'){const ids=(e.payload?.targetIds||[]).filter(Boolean);v=multiCircleTelegraph(ids.length?ids:party().filter(c=>role(c)!=='tank').map(c=>'p-'+c.id),108,'TARGETED AOE · SPREAD')}
 else if(type==='persistent-circle')v=circleTelegraph(target||source,145,'PERSISTENT GROUND · MOVE');
 else if(type==='target-circle')v=circleTelegraph(target||source,135,'TARGETED AOE · SPREAD');
 else if(type==='healer-swipe')v=coneTelegraph(source,target||'p-'+party().find(c=>role(c)==='healer')?.id,'HEALER SWIPE · CLEAR THE PATH');
 else if(type==='tank-mark')v=castTelegraph(source,'TANK MARK · PREPARE SWAP');
 else if(type==='interaction')v=castTelegraph(source,String(e.ability||'INTERACTION').toUpperCase()+' · RESPOND');
 else if(type==='adds')v=addTelegraph([{x:72,y:35},{x:72,y:65}],'ADDS INCOMING · PREPARE');
 else if(type==='interrupt')v=castTelegraph(source,'INTERRUPT '+String(e.ability||'CAST').toUpperCase());
 if(v){run.rebornTelegraphs=run.rebornTelegraphs||{};run.rebornTelegraphs[tokenId]=v}
 return v
}
function clearRebornTelegraph(tokenId,result='safe'){
 const v=run?.rebornTelegraphs?.[tokenId];if(v){clearTelegraph(v,result);delete run.rebornTelegraphs[tokenId]}
}
function spawnGroundHazardVisual(e){
 const root=$('#cb2dTelegraphs');if(!root||!e?.position)return null;
 const id=String(e.payload?.hazardId||('hazard-'+e.timestamp)),radius=Math.max(4,Number(e.payload?.radius)||10),el=document.createElement('div');
 el.className='cb2d-tg circle dynamic persistent show';el.dataset.groundHazard=id;
 el.style.left=clamp(Number(e.position.x)||50,0,100)+'%';el.style.top=clamp(Number(e.position.y)||50,0,100)+'%';
 el.style.width=Math.min(46,radius*2)+'%';el.style.height=Math.min(46,radius*2)+'%';el.style.transform='translate(-50%,-50%)';
 const label=document.createElement('span');label.className='cb2d-tg-label';label.textContent=String(e.ability||'DANGER').toUpperCase();el.appendChild(label);
 root.appendChild(el);run.groundHazards=run.groundHazards||{};run.groundHazards[id]=el;return el
}
function clearGroundHazardVisual(id){
 const key=String(id||''),el=run?.groundHazards?.[key]||document.querySelector('[data-ground-hazard="'+key+'"]');
 if(el){el.classList.add('safe');setTimeout(()=>el.remove(),260)}
 if(run?.groundHazards)delete run.groundHazards[key]
}
function rebornDebugEvent(e,result){
 let debug=/[?&]combatDebug=1\b/.test(location.search);
 try{debug=debug||localStorage.getItem('cellboundCombatDebug')==='1'}catch(_){}
 if(!debug)return;
 let panel=$('#cbrDebugPanel');if(!panel){panel=document.createElement('pre');panel.id='cbrDebugPanel';panel.className='cbr-debug';$('#cb2dArena')?.appendChild(panel)}
 const snap=window.CellboundCombatReborn?.debugSnapshot?.(result)||{};
 panel.textContent=['COMBAT REBORN '+(snap.version||''),'t '+(e?.timestamp||0)+'ms · '+(e?.type||'event'),(e?.source||'—')+' → '+(e?.target||'—'),e?.ability||e?.result||'', 'Events '+(snap.events||0)].join('\n');
}
function cbrStatusTargets(id){
 const out=[],unit=$('[data-unit="'+id+'"]');if(unit)out.push(unit);
 if(String(id||'').startsWith('p-')){
  const ch=rebornPlayerByUnit(id),row=ch?$('[data-row="'+ch.id+'"]'):null,mirror=row?.querySelector('span');
  if(mirror)out.push({el:mirror,mirror:true})
 }
 return out
}
function renderRebornEvent(e,result,replayMode=false){
 if(!run||!e)return;
 rebornDebugEvent(e,result);
 window.CellboundCombatFX?.combatEvent?.(e,{arena:$('#cb2dArena'),speed:()=>replayMode?(run?.replaySpeed||1):(run?.speed||1)});
 if(window.CellboundCombatStatuses?.handle(e,{resolve:cbrStatusTargets,speed:()=>run?.speed||1}))return;
 const srcChar=rebornPlayerByUnit(e.source),targetChar=rebornPlayerByUnit(e.target),enemyIdx=rebornEnemyIndex(e.target),sourceEnemyIdx=rebornEnemyIndex(e.source);
 switch(e.type){
  case'COMBAT_START':{
   const arena=$('#cb2dArena');window.CellboundCombatFX?.mount?.(arena);
   if(!replayMode&&['boss','final'].includes(String(currentStageDef()?.kind||'')))window.CellboundCombatFX?.boss?.(arena,currentStageDef()?.title||'Boss');
   status(replayMode?'Replay started':'Combat live');log((replayMode?'Replay: ':'')+'Combat begins.');break;
  }
  case'MOVEMENT_END':{if(window.CellboundCombatFX?.ownsMovement)break;const u=$('[data-unit="'+e.source+'"]');if(u&&e.position)applyUnitPosition(u,e.position.x,e.position.y,true);break;}
  case'MOVEMENT_START':
   if(window.CellboundCombatFX?.ownsMovement)break;
   if(e.payload?.to)move(e.source,e.payload.to.x,e.payload.to.y,e.payload.duration||360);
   if(srcChar&&e.result==='line of sight'){const rr=role(srcChar);act(rr==='tank'?'tank':rr==='healer'?'healer':'dps',srcChar.name+' · Repositioning for line of sight')}
   break;
  case'ABILITY_START':{
   const actor=$('[data-unit="'+e.source+'"]');if(actor){actor.classList.remove('attacking');requestAnimationFrame(()=>{if(actor.isConnected)actor.classList.add('attacking')});setTimeout(()=>actor.classList.remove('attacking'),360)}
   if(srcChar){
     const r=role(srcChar);act(r==='tank'?'tank':r==='healer'?'healer':'dps',srcChar.name+' · '+(e.ability||'Action'));
     if(e.payload?.kind==='battle-rez'){status(srcChar.name+' is attempting a combat resurrection');log(srcChar.name+' commits to '+(e.ability||'a combat resurrection')+'.')}
     if(e.target)faceUnit(e.source,e.target);
     if(!(e.payload?.castTime>0)&&e.payload?.kind==='damage'&&e.target)projectile(e.source,e.target,attackKind(srcChar),260);
   }else if(String(e.source||'').startsWith('e-')||String(e.source||'').startsWith('add-')){
     if(e.target){faceUnit(e.source,e.target);projectile(e.source,e.target,'enemy',260)}
   }
   break;
  }
  case'CAST_START':
   if(String(e.source||'').startsWith('e-')){rebornCastStart(e);log((e.ability||'Enemy cast')+' begins.')}
   else if(srcChar&&e.ability==='Soul Recall'){status('Soul Recall · 5.0s');act('healer',srcChar.name+' · Soul Recall')}
   break;
  case'CAST_CANCELLED':
   if(String(e.source||'').startsWith('e-'))rebornCastClear('INTERRUPTED');break;
  case'ABILITY_FINISH':
   if(srcChar&&e.target&&String(e.target).startsWith('e-')&&e.result==='resolved'&&Number(e.payload?.castTime)>0)projectile(e.source,e.target,attackKind(srcChar),220);
   break;
  case'DAMAGE_DEALT':{
   if(enemyIdx>=0&&run.enemyHp?.[enemyIdx]!=null)setEnemyHp(enemyIdx,Number(e.payload?.targetHp)||0);
   else if(String(e.target||'').startsWith('add-')){
     const u=$('[data-unit="'+e.target+'"]'),bar=u?.querySelector('.cb2d-unit-hp i');if(bar)bar.style.width=clamp(Number(e.payload?.targetHpPct)||0,0,100)+'%';
   }
   if(targetChar){setHp(targetChar.id,Number(e.payload?.targetHpPct)||0);setCond(targetChar.id,cond(targetChar.id)-Math.max(1,Math.round((Number(e.amount)||0)/8)));updateRows()}
   if(srcChar)recordDamage(srcChar,Number(e.amount)||0);
   if(e.target){hitReact(e.target,'hit');floating(e.target,'-'+Math.round(Number(e.amount)||0),e.result==='critical'?'crit':targetChar?'incoming':'damage');window.CellboundCombatFX?.impact?.($('[data-unit="'+e.target+'"]'),{critical:e.result==='critical'})}
   if(e.payload?.avoidable){log((targetChar?.name||'A player')+' is hit by avoidable '+(e.ability||'damage')+'.')}
   break;
  }
  case'HEAL_RECEIVED':
   if(srcChar&&e.target)projectile(e.source,e.target,'heal',240);
   if(targetChar){setHp(targetChar.id,Number(e.payload?.targetHpPct)||hp(targetChar.id));updateRows();hitReact(e.target,'heal');floating(e.target,'+'+Math.round(Number(e.amount)||0),'heal');window.CellboundCombatFX?.heal?.($('[data-unit="'+e.target+'"]'))}
   if(srcChar)recordRebornHealing(srcChar,Number(e.amount)||0,Number(e.payload?.overhealing)||0);
   break;
  case'PLAYER_REVIVED':
   if(targetChar){
    setHp(targetChar.id,Number(e.payload?.targetHpPct)||35);updateRows();restoreUnitVisual(targetChar);
    const state={type:'RESOURCE_STATE',source:e.target,result:'revived',payload:{resource:e.payload?.resource,value:e.payload?.resourceValue,max:e.payload?.resourceMax}};
    rebornResourceVisual(state);hitReact(e.target,'heal');floating(e.target,'BATTLE REZ','heal');flash('BATTLE REZ',false);
    log(targetChar.name+' is brought back by '+(srcChar?.name||'the healer')+'.');status('Combat resurrection successful')
   }
   break;
  case'RESOURCE_SPENT':case'RESOURCE_GAINED':case'RESOURCE_STATE':rebornResourceVisual(e);break;
  case'PHASE_CHANGE':
   flash(String(e.ability||'PHASE CHANGE').toUpperCase(),true);window.CellboundCombatFX?.phase?.($('#cb2dArena'));window.CellboundFX?.phase?.(e.ability||'Boss phase changed',e.payload?.healthPct);status(e.ability||'Boss phase changed');log((e.ability||'The boss changes phase')+' at '+Math.round(Number(e.payload?.healthPct)||0)+'% health.');break;
  case'ENRAGE':
   flash(e.result==='hard'?'HARD ENRAGE':'ENRAGE',true);status(e.result==='hard'?'Hard enrage — finish the boss now':(e.ability||'Boss enraged'));log((e.ability||'The boss enrages')+'.');break;
  case'UNIQUE_EFFECT_TRIGGER':
   if(srcChar){flash(String(e.ability||'UNIQUE EFFECT').toUpperCase(),false);floating(e.source,e.ability||'UNIQUE','heal');log(srcChar.name+' triggers '+(e.ability||'a unique item effect')+'.');const rr=role(srcChar);act(rr==='tank'?'tank':rr==='healer'?'healer':'dps',srcChar.name+' · '+(e.ability||'Unique Effect'))}break;
  case'CROWD_CONTROL':if(srcChar){log(srcChar.name+' controls a priority enemy.');floating(e.target,'CONTROLLED','heal')}break;

  case'AFFIX_TRIGGER':
   log((e.ability||'Dungeon affix')+' · '+String(e.result||'triggered').replace(/-/g,' ')+'.');
   if(e.payload?.affix==='volatile-cells'&&e.result==='armed')flash('VOLATILE CELLS',true);
   if(e.payload?.affix==='blood-moon')status('Blood Moon pressure');
   break;
  case'ENEMY_REVIVED':{
   const u=$('[data-unit="'+e.target+'"]');if(u){u.classList.remove('dead','dying');const bar=u.querySelector('.cb2d-unit-hp i');if(bar)bar.style.width=(Number(e.payload?.targetHpPct)||35)+'%';hitReact(e.target,'heal');floating(e.target,'RETURNS','incoming')}
   log('Necromantic returns '+(u?.querySelector('span')?.childNodes?.[0]?.textContent||'an enemy')+' to the fight.');break;
  }
  case'PLAYER_MISTAKE':{
   if(srcChar){
    const type=String(e.payload?.type||e.result||'mistake'),detail=e.payload?.detail||'made an execution mistake';
    const rr=role(srcChar),label=type==='movement'?'LATE MOVE':type==='interrupt'?'INTERRUPT ERROR':type==='threat'?'THREAT ERROR':type==='tank'?'TANK ERROR':type==='triage'?'HEALING ERROR':type==='defensive'?'DEFENSIVE ERROR':'MISTAKE';
    floating(e.source,label,'incoming');log(srcChar.name+' '+detail+'.');
    act(rr==='tank'?'tank':rr==='healer'?'healer':'dps',srcChar.name+' · '+label);
   }
   break;
  }
  case'THREAT_GENERATED':
   if(enemyIdx>=0&&srcChar&&run.threat?.[enemyIdx]){run.threat[enemyIdx][srcChar.id]=Number(e.payload?.total)||0;queueCombatMeterRender()}break;
  case'AGGRO_CHANGED':
   if(sourceEnemyIdx>=0&&targetChar){run.aggro[sourceEnemyIdx]=targetChar.id;showThreatLink(sourceEnemyIdx,targetChar);queueCombatMeterRender();if(role(targetChar)!=='tank')log(targetChar.name+' pulls aggro.')}
   break;
  case'MECHANIC_TELEGRAPH':
   rebornTelegraph(e);status((e.ability||'Mechanic')+' incoming');break;
  case'MECHANIC_RESOLVE':
   clearRebornTelegraph(e.payload?.token,'impact');break; // Engine movement events own regrouping.
  case'GROUND_HAZARD_SPAWNED':
   if(!window.CellboundCombatFX?.ownsHazards)spawnGroundHazardVisual(e);status((e.ability||'Ground hazard')+' active');log((e.ability||'A ground hazard')+' remains active.');break;
  case'GROUND_HAZARD_TICK':{
   const hz=run?.groundHazards?.[String(e.payload?.hazardId||'')];if(hz){hz.classList.remove('tick');requestAnimationFrame(()=>hz.classList.add('tick'));setTimeout(()=>hz?.classList?.remove('tick'),180)}
   break;
  }
  case'GROUND_HAZARD_EXPIRED':
   clearGroundHazardVisual(e.payload?.hazardId);break;
  case'TANK_MARK':
   if(targetChar){floating(e.target,'MARK ×'+Math.max(1,Number(e.payload?.stacks)||1),'incoming');status('Tank mark · '+targetChar.name+' ×'+Math.max(1,Number(e.payload?.stacks)||1));act('tank',targetChar.name+' · Mark '+Math.max(1,Number(e.payload?.stacks)||1))}break;
  case'TANK_SWAP':
   flash('TANK SWAP',false);if(srcChar)act('tank',srcChar.name+' takes threat');log('Tank swap completed.');break;
  case'ADD_OVERCLOCKED':
   flash('OVERCLOCK',true);status(e.ability||'Turrets overclocked');log((e.ability||'Adds')+' empowers active adds.');break;
  case'INTERACTION_REQUIRED':
   flash(String(e.ability||'INTERACTION').toUpperCase(),true);status((e.ability||'Interaction')+' · response required');log((e.ability||'An encounter interaction')+' requires a response.');break;
  case'INTERRUPT':
   if(e.result==='success'){rebornCastClear('INTERRUPTED');clearRebornTelegraph(e.payload?.token,'safe');flash('INTERRUPTED',false);window.CellboundCombatFX?.interrupt?.($('[data-unit="'+e.target+'"]')||$('#cb2dArena'));log((srcChar?.name||'A player')+' interrupts '+(e.payload?.interruptedAbility||'the cast')+'.');act('dps','Interrupt successful')}
   else if(e.result==='failed')log((srcChar?.name||'A player')+' misses an interrupt.');
   else if(e.result==='duplicate')log((srcChar?.name||'A player')+' overlaps an interrupt that was already covered.');
   break;
  case'DEFENSIVE_ACTIVATED':
   flash('DEFENSIVE',false);log((srcChar?.name||'Tank')+' activates '+(e.ability||'a defensive')+'.');act('tank',(srcChar?.name||'Tank')+' · Defensive active');break;
  case'ADD_SPAWNED':
   if(!$('[data-unit="'+e.target+'"]')){const p=e.position||{x:76,y:50};addUnit(e.target,e.payload?.name||'Add','enemy small',p.x,p.y,'small','Lv. '+(e.payload?.level||currentStageDef()?.level||1)+' · '+(e.payload?.classificationLabel||'ADD'));const bar=$('[data-unit="'+e.target+'"] .cb2d-unit-hp i');if(bar)bar.style.width='100%'}
   flash('ADDS SPAWN',true);window.CellboundCombatFX?.spawn?.($('[data-unit="'+e.target+'"]')||$('#cb2dArena'));log((e.payload?.name||'Adds')+' enter the fight.');break;
  case'ADD_DEFEATED':case'ENEMY_DEFEATED':{
   const u=$('[data-unit="'+e.target+'"]');if(u){u.classList.add('dying');deathBurst(e.target);window.CellboundCombatFX?.death?.(u,{boss:e.type==='ENEMY_DEFEATED'&&['boss','final'].includes(String(currentStageDef()?.kind||''))});setTimeout(()=>u.classList.add('dead'),240)}
   if(e.type==='ADD_DEFEATED')log('An add is defeated.');break;
  }
  case'PLAYER_DEFEATED':
   if(targetChar){setHp(targetChar.id,0);updateRows();const u=$('[data-unit="'+e.target+'"]');if(u){u.classList.add('dying');window.CellboundCombatFX?.death?.(u);setTimeout(()=>u.classList.add('dead'),220)}deathBurst(e.target);log(targetChar.name+' is defeated.')}break;
  case'CAST_FINISH':
   rebornCastClear('CAST COMPLETE');if(String(e.source||'').startsWith('e-'))log((e.ability||'Enemy cast')+' completes.');break;
  case'COMBAT_END':
   rebornCastClear();status(e.result==='victory'?'Encounter cleared':'Party defeated');run.stageOutcome=e.result==='victory';if(e.result==='victory')window.CellboundCombatFX?.victory?.($('#cb2dArena'));else window.CellboundFX?.wipe?.('The expedition has collapsed inside The Ashen Vault.');regroup();break;
 }
}
function configureRebornViewer(){
 const controls=$('.cb2d-controls');if(!controls||controls.dataset.reborn==='1')return;
 controls.dataset.reborn='1';controls.classList.add('cbr-plan-lock');
 controls.innerHTML='<div class="cbr-plan-lock-copy"><small>TACTICS LOCKED</small><b>Replay uses the original fight.</b><span>Tactics and outcomes cannot be changed during replay.</span></div>'
}
function removeRebornReplayControls(){const x=$('#cbrReplayControls');if(x)x.remove()}
function mountRebornReplayControls(){
 removeRebornReplayControls();const arena=$('#cb2dArena');if(!arena)return;
 run.replayPaused=false;run.replaySpeed=1;run.replayRestartRequested=false;
 const el=document.createElement('div');el.id='cbrReplayControls';el.className='cbr-replay-controls';
 el.innerHTML='<button type="button" data-cbr-pause>PAUSE</button><button type="button" data-cbr-speed>1×</button><button type="button" data-cbr-restart>RESTART</button>';
 arena.appendChild(el);
 el.querySelector('[data-cbr-pause]').onclick=e=>{run.replayPaused=!run.replayPaused;e.currentTarget.textContent=run.replayPaused?'PLAY':'PAUSE'};
 el.querySelector('[data-cbr-speed]').onclick=e=>{const speeds=[.5,1,2],i=speeds.indexOf(run.replaySpeed),next=speeds[(i+1)%speeds.length];run.replaySpeed=next;e.currentTarget.textContent=next+'×'};
 el.querySelector('[data-cbr-restart]').onclick=()=>{run.replayRestartRequested=true;run.replayPaused=false;const p=el.querySelector('[data-cbr-pause]');if(p)p.textContent='PAUSE'}
}
async function rebornReplayWait(ms,tok){
 let remaining=Math.max(0,Number(ms)||0);
 while(remaining>0){
  if(tok!==token||!run)return'cancelled';
  if(run.replayRestartRequested)return'restart';
  if(run.replayPaused){await new Promise(r=>setTimeout(r,70));continue}
  const step=Math.min(70,remaining),speed=Math.max(.25,Number(run.replaySpeed)||1);
  await new Promise(r=>setTimeout(r,Math.max(8,Math.round(step/speed))));remaining-=step
 }
 return run.replayRestartRequested?'restart':'ok'
}
async function playRebornTimeline(result,tok,{replayMode=false}={}){
 const events=(result?.events||[]).slice().sort((a,b)=>(Number(a.timestamp)||0)-(Number(b.timestamp)||0));
 run.combatActive=true;run.rebornTelegraphs={};ensureRebornHealingMeter();renderRebornHealingMeter();configureRebornViewer();
 if(replayMode)mountRebornReplayControls();
 if(!events.length){run.combatActive=false;return replayMode?'done':(result?.outcome==='victory'?'victory':'defeat')}

 return await new Promise(resolve=>{
   let index=0,simTime=0,wallAnchor=replayMode?Date.now():(Number(run?.runtimeStageStartedAt)||Date.now()),simAnchor=0,lastSpeed=null,finished=false,raf=0;
   const speedNow=()=>replayMode?Math.max(.25,Number(run?.replaySpeed)||1):Math.max(.25,Number(run?.speed)||1);
   const readClock=()=>{
     if(replayMode&&run?.replayPaused){wallAnchor=Date.now();simAnchor=simTime;return simTime}
     const speed=speedNow();
     if(lastSpeed===null)lastSpeed=speed;
     else if(speed!==lastSpeed){simAnchor=simTime;wallAnchor=Date.now();lastSpeed=speed}
     simTime=Math.max(simTime,simAnchor+Math.max(0,Date.now()-wallAnchor)*speed);
     return simTime
   };
   const finishPlayback=value=>{
     if(finished)return;finished=true;if(raf)cancelAnimationFrame(raf);
     if(run)run.combatActive=false;
     resolve(value)
   };
   const frame=()=>{
     if(finished)return;
     if(tok!==token||!run){finishPlayback('cancelled');return}
     if(replayMode&&run.replayRestartRequested){finishPlayback('restart');return}
     const current=readClock(),frameStarted=performance.now();let handled=0;
     // Wall time remains authoritative even when the browser suspends animation frames.
     while(index<events.length&&(Number(events[index].timestamp)||0)<=current+4&&handled<48&&performance.now()-frameStarted<10){
       const event=events[index];
       // External encounter interactions (for example Manor Screech) must not depend
       // on the visual renderer succeeding. Forward the authoritative event first.
       if(!replayMode&&run?.externalMode&&typeof run.externalOnEvent==='function'){
         try{run.externalOnEvent(event,result)}catch(error){console.warn('Shared combat event callback failed',error)}
       }
       try{renderRebornEvent(event,result,replayMode)}
       catch(error){
         console.warn('Shared combat visual recovered',event?.type,event?.ability,error);
         if(event?.type==='INTERACTION_REQUIRED')status((event.ability||'Interaction')+' · response required')
       }
       index++;handled++
     }
     if(index>=events.length){
       finishPlayback(replayMode?'done':(result?.outcome==='victory'?'victory':'defeat'));
       return
     }
     raf=requestAnimationFrame(frame)
   };
   raf=requestAnimationFrame(frame)
 })
}
function runRebornStage(s){
 const C=window.CellboundCombatStandard;if(!C?.simulate)throw new Error('Combat Reborn standard gateway is unavailable');
 const startHp=Object.fromEntries(party().map(c=>[c.id,hp(c.id)]));
 const combatParty=party().map(c=>Object.assign({},c,{_combatHealthPct:hp(c.id),_combatResource:run.resources?.[c.id]||null,_combatItemLevel:Number(Game?.characterItemLevel?.(c))||Number(c.gear)||0,_combatCooldowns:run.cooldowns?.[c.id]||{},_combatStatuses:run.statuses?.[c.id]||[],_reviveSicknessMs:run.reviveSickness?.[c.id]||0}));
 const result=C.simulate({party:combatParty,encounter:rebornEncounter(s),tactics:rebornTactics(),seed:[run.endgame?.seed||'ashen-vault',s.id,run.stage].join(':')},{zone:'ashen-vault'});
 result.stageId=s.id;result.stageTitle=s.title;result.startHp=startHp;return result
}
function captureRebornResult(result){
 run.rebornResult=result;run.rebornReplay=result?.replay||null;run.rebornHistory=run.rebornHistory||[];
 if(Array.isArray(result?.finalState?.enemies)){run.enemyMax=result.finalState.enemies.filter(e=>!e.isAdd).map(e=>e.maxHealth);run.enemyHp=[...run.enemyMax]}
 (result?.finalState?.players||[]).forEach(p=>{
  const c=rebornPlayerByUnit(p.id);if(!c)return;
  if(p.resource)run.resources[c.id]={name:p.resource.name,max:p.resource.max,value:p.resource.value};
  run.cooldowns[c.id]=Object.fromEntries(Object.entries(copyObject(p.cooldowns||{})).filter(([,v])=>Number(v)>0));
  run.statuses[c.id]=rebornPersistentStatuses(p,result.durationMs);
  run.reviveSickness[c.id]=Math.max(0,(Number(p.revivePenaltyUntil)||0)-Number(result.durationMs||0));
 });
 run.expeditionTimeMs=(Number(run.expeditionTimeMs)||0)+Number(result.durationMs||0);
 run.rebornHistory.push({stageId:result.stageId,stageTitle:result.stageTitle,startHp:result.startHp,replay:result.replay,summary:result.summary,outcome:result.outcome});
}
function rebornTotals(){
 const history=run?.rebornHistory||[],map={};let duration=0,deaths=0,damage=0,healing=0,damageTaken=0,avoidableDamage=0,attempts=0,interrupts=0,missedInterrupts=0,failed=0,avoided=0,mistakes=0,battleResurrections=0,threatLosses=0;
 history.forEach(h=>{
  const s=h.summary||{};duration+=Number(s.durationSeconds)||0;deaths+=Number(s.deaths)||0;damage+=Number(s.totalDamage)||0;healing+=Number(s.totalHealing)||0;
  attempts+=Number(s.interrupts?.attempts)||0;interrupts+=Number(s.interrupts?.success)||0;missedInterrupts+=Number(s.interrupts?.missedCritical)||0;failed+=Number(s.mechanics?.failed)||0;avoided+=Number(s.mechanics?.avoided)||0;
  mistakes+=Number(s.mistakes?.total)||0;battleResurrections+=Number(s.battleResurrections)||0;
  (s.players||[]).forEach(p=>{
   const x=map[p.id]||(map[p.id]={id:p.id,name:p.name,class:p.class,damage:0,healing:0,damageTaken:0,avoidableDamage:0,deaths:0,mistakes:0,mistakesByType:{},battleResurrections:0,interrupts:0,interruptAttempts:0,abilityDamage:{}});
   x.damage+=Number(p.damage)||0;x.healing+=Number(p.healing)||0;x.damageTaken+=Number(p.damageTaken)||0;x.avoidableDamage+=Number(p.avoidableDamage)||0;x.deaths+=Number(p.deaths)||0;x.mistakes+=Number(p.mistakes)||0;x.battleResurrections+=Number(p.battleResurrections)||0;
   x.interrupts+=Number(p.interrupts)||0;x.interruptAttempts+=Number(p.interruptAttempts)||0;threatLosses+=Number(p.threatLost)||0;
   Object.entries(p.mistakesByType||{}).forEach(([k,v])=>x.mistakesByType[k]=(x.mistakesByType[k]||0)+(Number(v)||0));
   Object.entries(p.abilityDamage||{}).forEach(([k,v])=>x.abilityDamage[k]=(x.abilityDamage[k]||0)+(Number(v)||0));
   damageTaken+=Number(p.damageTaken)||0;avoidableDamage+=Number(p.avoidableDamage)||0
  })
 });
 return{duration,deaths,damage,healing,damageTaken,avoidableDamage,attempts,interrupts,missedInterrupts,threatLosses,failed,avoided,mistakes,battleResurrections,outOfCombatRevives:Number(run?.outOfCombatRevives)||0,players:Object.values(map)}
}

function rebornFailureDiagnosisHTML(){
 const t=rebornTotals(),causes=[],changes=[];
 if(t.missedInterrupts>0){causes.push(t.missedInterrupts+' critical interrupt'+(t.missedInterrupts===1?' was':'s were')+' missed');changes.push('Raise Interrupt Priority or use DPS Rotation.')}
 if(t.failed>0){causes.push(t.failed+' boss mechanic'+(t.failed===1?' was':'s were')+' failed');changes.push('Use Safety First movement if positioning is breaking down.')}
 if(t.threatLosses>0){causes.push(t.threatLosses+' threat loss'+(t.threatLosses===1?'':'es')+' destabilised the pull');changes.push('Use Safe pulls or Tank Priority interrupts to reduce opening pressure.')}
 if(t.avoidableDamage>0){causes.push(Math.round(t.avoidableDamage).toLocaleString()+' avoidable damage was taken')}
 const dead=[...t.players].filter(p=>p.deaths>0).sort((a,b)=>b.deaths-a.deaths)[0];
 if(dead)causes.push(dead.name+' died '+dead.deaths+' time'+(dead.deaths===1?'':'s'));
 if(!causes.length){causes.push('The party was overwhelmed by the raw damage / healing check');changes.push('Improve gear, upgrade key items or use earlier defensives.')}
 const unique=[...new Set(changes)].slice(0,2);
 return'<section class="cbr-failure-diagnosis"><small>WHY THE RUN FAILED</small><h4>Change the plan, not just the numbers.</h4><div>'+causes.slice(0,3).map((x,i)=>'<p><b>'+(i+1)+'</b>'+esc(x)+'</p>').join('')+'</div>'+(unique.length?'<strong>NEXT ATTEMPT</strong><ul>'+unique.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+'</section>'
}
function endgameProgressHTML(){
 const record=run?.endgameRecord||{},unlocks=record.newUnlocks||[],achievements=record.newAchievements||[],score=Number(record.score||run?.endgameMetrics?.scorePreview||0);
 const comparison=record.isNewBest
   ?'<span><i>★</i><b>NEW BEST · '+score.toLocaleString()+' score</b></span>'
   :record.previousBestScore?'<span><i>↔</i><b>Previous best '+Number(record.previousBestScore).toLocaleString()+' · this run '+score.toLocaleString()+'</b></span>':'';
 if(!unlocks.length&&!achievements.length&&!comparison)return'';
 return'<section class="cbr-progress-earned"><small>AFTER THE CLEAR</small><h4>What you earned and unlocked.</h4><div>'+comparison+unlocks.map(x=>'<span><i>↗</i><b>'+esc(x)+'</b></span>').join('')+achievements.map(id=>'<span><i>◆</i><b>Achievement: '+esc(window.CellboundEndgame?.achievementName?.(id)||id)+'</b></span>').join('')+'</div></section>'
}

function rebornAnalysisHTML(){
 const t=rebornTotals();if(!run?.rebornHistory?.length)return'';
 const mins=Math.floor(t.duration/60),secs=Math.round(t.duration%60),time=(mins?mins+'m ':'')+secs+'s';
 const mistakeLabels={movement:'movement',interrupt:'interrupt',threat:'threat',tank:'tank',triage:'triage',defensive:'defensive'};
 const rows=t.players.sort((a,b)=>b.damage-a.damage).map(p=>{
  const top=Object.entries(p.abilityDamage||{}).sort((a,b)=>b[1]-a[1])[0],share=top&&p.damage?Math.round(top[1]/p.damage*100):0;
  const mistakeTop=Object.entries(p.mistakesByType||{}).sort((a,b)=>b[1]-a[1])[0],mistakeCopy=p.mistakes?(p.mistakes+' mistake'+(p.mistakes===1?'':'s')+(mistakeTop?' · '+(mistakeLabels[mistakeTop[0]]||mistakeTop[0])+' '+mistakeTop[1]:'')):'Clean execution';
  return'<div class="cbr-analysis-row"><i class="cb2d-dot '+('class-'+String(p.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-'))+'"></i><span><b>'+esc(p.name)+'</b><small>'+esc(p.class)+' · '+mistakeCopy+' · Avoidable '+Math.round(p.avoidableDamage)+' · Interrupts '+p.interrupts+'/'+p.interruptAttempts+(p.battleResurrections?' · Battle rez '+p.battleResurrections:'')+'</small></span><strong>'+Math.round(p.damage).toLocaleString()+' dmg</strong></div>'
 }).join('');
 return'<section class="cbr-analysis"><div class="cbr-analysis-head"><div><small>RUN ANALYSIS</small><h4>Review damage, healing, mistakes and mechanics.</h4></div><button type="button" data-cbr-replay>REPLAY FINAL FIGHT</button></div><div class="cbr-analysis-grid"><article><span>TIME</span><b>'+time+'</b></article><article><span>DAMAGE</span><b>'+Math.round(t.damage).toLocaleString()+'</b></article><article><span>HEALING</span><b>'+Math.round(t.healing).toLocaleString()+'</b></article><article><span>AVOIDABLE</span><b>'+Math.round(t.avoidableDamage).toLocaleString()+'</b></article><article><span>MISTAKES</span><b>'+t.mistakes+'</b></article><article><span>DEATHS</span><b>'+t.deaths+'</b></article><article><span>COMBAT REZ</span><b>'+t.battleResurrections+'</b></article><article><span>OOC REVIVES</span><b>'+t.outOfCombatRevives+'</b></article><article><span>INTERRUPTS</span><b>'+t.interrupts+'/'+t.attempts+'</b></article><article><span>MECHANICS</span><b>'+t.avoided+'✓ · '+t.failed+'✕</b></article></div><div class="cbr-analysis-list">'+rows+'</div></section>'
}
function appendRebornAnalysis(rootEl){
 if(!rootEl||rootEl.querySelector('.cbr-analysis')||!run?.rebornHistory?.length)return;
 const wrap=document.createElement('div');wrap.innerHTML=rebornAnalysisHTML();const node=wrap.firstElementChild;if(!node)return;
 const failureTarget=rootEl.querySelector('.cb2d-failure-analysis'),actions=rootEl.querySelector('.cb2d-loot-actions');
 if(failureTarget)failureTarget.appendChild(node);
 else if(actions)rootEl.querySelector('.cb2d-loot-wrap')?.insertBefore(node,actions);
 else rootEl.appendChild(node);
 node.querySelector('[data-cbr-replay]')?.addEventListener('click',()=>replayFinalReborn())
}
async function replayFinalReborn(){
 const h=(run?.rebornHistory||[]).slice(-1)[0];if(!h?.replay)return;
 const s=STAGES.find(x=>x.id===h.stageId)||currentStageDef(),end=$('#cb2dEnd');if(end)end.hidden=true;exitResultsMode();
 const replayResult={events:h.replay.events,outcome:h.replay.summary?.outcome||h.outcome,summary:h.replay.summary,version:h.replay.version};
 let state='restart';
 while(state==='restart'&&run){
   Object.entries(h.startHp||{}).forEach(([id,v])=>setHp(id,v));updateRows();spawn(s);status('Replay · final fight');log('Replay uses the original fight.');
   state=await playRebornTimeline(replayResult,token,{replayMode:true});
 }
 removeRebornReplayControls();if(end)end.hidden=false;enterResultsMode()
}

function endgameRunMetrics(){
 const t=rebornTotals(),combatMs=Math.round((Number(t.duration)||0)*1000);
 // Playback speed never affects this. Route time is simulated separately from presentation time.
 const pace=tactics.aggression==='aggressive'?.82:tactics.aggression==='safe'?1.20:1,routeMs=Math.round(STAGES.length*45000*pace),timeMs=Math.max(25000,combatMs*4+routeMs);
 return{timeMs,deaths:t.deaths,mechanicsFailed:t.failed,mistakes:t.mistakes||0,missedInterrupts:t.missedInterrupts||0,threatLosses:t.threatLosses||0,avoidableDamage:t.avoidableDamage||0,battleResurrections:t.battleResurrections||0,scorePreview:window.CellboundEndgameData?.scorePreview?.({difficulty:run?.endgame?.difficulty||'normal',tier:run?.endgame?.tier||0,timeMs,targetTimeMs:run?.endgame?.targetTimeMs||0,deaths:t.deaths,mechanicsFailed:t.failed,mistakes:t.mistakes||0})||0}
}

async function seamlessFrom(startIndex,tok){
 try{
  for(let i=startIndex;i<STAGES.length;i++){
   if(tok!==token||!run)return;
   const resuming=Boolean(run._restored)&&i===startIndex;
   run.stage=i;run.override=0;run.rebornResult=null;
   if(!resuming||!run.runtimeStageStartedAt)run.runtimeStageStartedAt=Date.now();
   run._restored=false;
   await ashenSaveRuntime('stage');
   const s=STAGES[i];if(s.kind==='final')await window.CellboundBossDossier?.show?.('vaultheart');else if(i>startIndex)await window.CellboundExpeditionPresentation?.room?.('ashen-vault',{title:s.title,index:i,total:STAGES.length,kind:s.kind});
   if(s.kind==='boss'||s.kind==='final')window.CellboundFX?.boss?.(s.title);
   $('#cb2dTitle').textContent=s.title;$('#cb2dRoute').innerHTML=route();$('#cb2dType').textContent=s.kind==='final'?'FINAL BOSS':s.kind==='boss'?'BOSS':s.kind==='event'?'EVENT':'HOSTILE PACK';
   spawn(s);status('Preparing encounter…');log('Entering '+s.title+'.');act('tank','Taking point');act('healer','Following formation');act('dps','Acquiring targets');await delay(650);
   await ensureCombatRebornEngine();
   if(tok!==token||!run)return;
   status('Encounter ready');
   const result=runRebornStage(s);
   captureRebornResult(result);run.stageOutcome=result.outcome==='victory';run.allowKill=true;
   await playRebornTimeline(result,tok);
   if(!await resolveStage(s)||tok!==token){await ashenSaveRuntime('failed');return}
   const recovered=await recoverFallenBetweenStages(tok);
   if(!recovered||tok!==token){
     if(tok===token&&run){
       Game.applyPartyCellShock(25);const st=state();st.dungeonHistory=Array.isArray(st.dungeonHistory)?st.dungeonHistory:[];st.dungeonHistory.unshift({at:new Date().toISOString(),result:'no-healer',stage:s.id,partyIlvl:ilvl()});st.dungeonHistory=st.dungeonHistory.slice(0,20);st.activity.push('The expedition ended after '+s.title+' because no healer was available to revive fallen adventurers. All five gained 25% Cell Shock.');await Game.persistState();
       const e=$('#cb2dEnd');e.className='cb2d-end cb2d-results-screen';e.innerHTML='<div class="cb2d-failure-wrap"><section class="cb2d-failure-main"><div><small>EXPEDITION FAILED</small><h3>No healer available after '+esc(s.title)+'.</h3><p>A fallen adventurer cannot be recovered without a healer. The expedition ends here and all five gain 25% Cell Shock.</p></div>'+rebornFailureDiagnosisHTML()+'<button data-failure-return>RETURN TO GUILD →</button></section><aside class="cb2d-failure-analysis"></aside></div>';appendRebornAnalysis(e);enterResultsMode();e.querySelector('[data-failure-return]').onclick=()=>{close();Game.switchView('content')}
     }
     await ashenSaveRuntime('failed');
     return
   }
   if(i<STAGES.length-1){party().forEach(c=>{if(hp(c.id)>0)setHp(c.id,Math.min(100,hp(c.id)+6))});recoverDungeonResources();advanceDungeonCooldowns(5000);updateRows();await stageClearTransition(s,STAGES[i+1],tok);await travelDeeper(STAGES[i+1],tok)}
   run.stage=i+1;run.runtimeStageStartedAt=0;await ashenSaveRuntime('between')
  }
  const st=state();st.dungeonHistory=Array.isArray(st.dungeonHistory)?st.dungeonHistory:[];st.dungeonCompletions=Number(st.dungeonCompletions)||0;
  const mode=run.endgame?.difficulty||'normal',tier=Number(run.endgame?.tier)||0,gold=mode==='normal'?120:mode==='heroic'?190:220+tier*10,renown=mode==='normal'?60:mode==='heroic'?90:100+tier*4,xp=mode==='normal'?ASHEN_VAULT_XP:mode==='heroic'?480:500;
  st.gold+=gold;st.renown+=renown;run.loot.gold+=gold;run.loot.renown+=renown;run.loot.xp=xp;
  const shards=window.CellboundEndgame?.shardReward?.('ashen-vault')||0;if(shards){Game.addMaterial('cell-shards',shards);recordMaterialDrop({key:'cell-shards',quantity:shards},'Endgame Reward')}
  const chase=window.CellboundEndgame?.rollChase?.('ashen-vault');if(chase){st.activity.push('Very rare collection reward: '+chase.name+'.');flash('LEGENDARY DROP',false)}
  const metrics=endgameRunMetrics();run.endgameMetrics=metrics;
  const record=await window.CellboundEndgame?.recordRun?.('ashen-vault',metrics);run.endgameRecord=record&&!record.error?record:null;
  window.CellboundEndgame?.recordClearLootOutcome?.('ashen-vault',(run.loot?.gear||[]).length>0);
  run.xpGrowth=awardPartyXp(xp);st.dungeonCompletions++;const completedPartyIds=party().map(c=>c.id);st.dungeonHistory.unshift({at:new Date().toISOString(),result:'complete',difficulty:mode,tier,score:run.endgameRecord?.score||metrics.scorePreview,timeMs:metrics.timeMs,partyIlvl:ilvl(),xpPerCharacter:xp,partyIds:completedPartyIds,combatVersion:window.CellboundCombatReborn?.VERSION||'legacy',dungeonVersion:run.endgame?.dungeonVersion||2});st.dungeonHistory=st.dungeonHistory.slice(0,20);st.activity.push('The Ashen Vault · '+(run.endgame?.label||'Normal')+' cleared. Score '+Number(run.endgameRecord?.score||metrics.scorePreview).toLocaleString()+'. Each adventurer earned '+xp+' XP.');run.xpGrowth.filter(x=>x.levels>0).forEach(x=>st.activity.push(x.name+' reached Level '+x.afterLevel+'.'));await Game.persistState();await syncPartyXpRecords(run.xpGrowth);window.dispatchEvent(new CustomEvent('cellbound:dungeon-complete',{detail:{id:'ashen-vault',difficulty:mode,tier,score:run.endgameRecord?.score||metrics.scorePreview,timeMs:metrics.timeMs,partyIds:completedPartyIds}}));finish(true,STAGES[6]);appendRebornAnalysis($('#cb2dEnd'))
 }catch(e){
   if(e&&e.message==='cancelled')return;
   const s=STAGES[run?.stage||0],message=String(e?.message||e||'');
   if(run?.rebornResult){
     console.error('Ashen Vault encounter runtime',e);
     status('Encounter UI interrupted');
     log('Encounter runtime issue: '+message);
     const panel=$('#cbrStartupError');if(panel)panel.remove();
     const end=$('#cb2dEnd');if(end&&!end.hidden)return;
   }
   showRebornStartupFailure(e,s,tok)
 }
}
async function seamless(tok){return seamlessFrom(0,tok)}

function lootRarityClass(item){return 'rarity-'+String(item?.rarity||'common').toLowerCase().replace(/[^a-z0-9-]/g,'')}
function lootGearCard(item){
 const art=G?.artHTML?G.artHTML(item,72):(item.icon||'◇');
 const stats=G?.statLines?.(item)||[],set=item?.setName?'<div class="cb2d-loot-set"><b>'+esc(item.setName)+'</b>'+(G?.setBonusLines?.(item)||[]).map(x=>'<span>'+x.threshold+'pc · '+esc(x.short)+'</span>').join('')+'</div>':'',effect=item.uniqueEffect?'<strong class="cb2d-loot-unique">'+esc(item.uniqueEffect.name)+' · '+esc(item.uniqueEffect.description)+'</strong>':'';return '<article class="cb2d-loot-item '+lootRarityClass(item)+'"><div class="cb2d-loot-art">'+art+'</div><div><small>'+esc(String(item.rarity||'GEAR').toUpperCase())+' · '+esc(item.slot||'ITEM')+'</small><h4>'+esc(item.name||'Unknown Item')+'</h4><p>Item Level '+(Number(item.itemLevel)||0)+(item.power?' · +'+Number(item.power)+' Power':'')+'</p><div class="cb2d-loot-roll">'+stats.map(s=>'<span>'+esc(s.text)+'</span>').join('')+'</div>'+set+effect+'<em>Sent to Guild Bank</em></div></article>'
}
function lootMaterialCard(m){
 const art=P?.materialArtHTML?P.materialArtHTML(m.key,44,'cb2d-material-art'):esc(m.icon||'◇');
 return '<article class="cb2d-loot-material"><strong class="cb2d-loot-material-art">'+art+'</strong><div><small>'+esc(String(m.rarity||'MATERIAL').toUpperCase())+'</small><h4>'+esc(m.name)+'</h4><p>'+esc(m.source||'The Ashen Vault')+'</p></div><b>×'+Number(m.quantity||0)+'</b></article>'
}
function xpGrowthCard(x){
 const startPct=Math.max(0,Math.min(100,(x.beforeXp/Math.max(1,x.beforeNeed))*100));
 const endPct=Math.max(0,Math.min(100,(x.afterXp/Math.max(1,x.afterNeed))*100));
 const levelCopy=x.capped?'<em class="cb2d-level-up">MAX LEVEL</em>':x.levels>0?'<em class="cb2d-level-up">LEVEL UP'+(x.levels>1?' ×'+x.levels:'')+'</em>':'<em>+'+x.amount+' XP</em>';
 return '<article class="cb2d-xp-card" data-xp-row data-start="'+startPct.toFixed(2)+'" data-end="'+endPct.toFixed(2)+'" data-levels="'+x.levels+'">'+
   '<div class="cb2d-xp-avatar">'+esc(x.portrait)+'</div>'+
   '<div class="cb2d-xp-copy"><div><span><b>'+esc(x.name)+'</b><small>Level '+x.beforeLevel+(x.afterLevel!==x.beforeLevel?' → '+x.afterLevel:'')+'</small></span>'+levelCopy+'</div>'+
   '<div class="cb2d-xp-bar"><i style="width:'+startPct.toFixed(2)+'%"></i></div>'+
   '<p><span>'+x.beforeXp+' / '+x.beforeNeed+' XP</span><strong>+'+x.amount+' XP</strong><span>'+x.afterXp+' / '+x.afterNeed+' XP</span></p></div>'+
   '</article>'
}
function animateXpGrowth(root){
 const rows=[...(root?.querySelectorAll('[data-xp-row]')||[])];
 rows.forEach((row,index)=>{
   const bar=row.querySelector('.cb2d-xp-bar i'),start=Number(row.dataset.start)||0,end=Number(row.dataset.end)||0,levels=Number(row.dataset.levels)||0;
   if(!bar)return;
   setTimeout(()=>{
     if(levels<=0){bar.style.width=end+'%';return}
     bar.style.width='100%';
     setTimeout(()=>{
       row.classList.add('levelled');
       bar.style.transition='none';bar.style.width='0%';
       requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!bar.isConnected)return;bar.style.transition='width .8s cubic-bezier(.2,.75,.25,1)';bar.style.width=end+'%'}));
     },760);
   },220+index*90);
 })
}
function formatRunTime(ms){const t=Math.max(0,Math.round((Number(ms)||0)/1000)),m=Math.floor(t/60),s=t%60;return m+':'+String(s).padStart(2,'0')}
function finish(ok,s){
 if(!run)return;run.resolved=true;const e=$('#cb2dEnd');e.hidden=false;
 if(!ok){
   e.className='cb2d-end cb2d-results-screen';e.innerHTML='<div class="cb2d-failure-wrap"><section class="cb2d-failure-main"><div><small>EXPEDITION FAILED</small><h3>Wipe at '+esc(s.title)+'.</h3><p>All five adventurers gained 25% Cell Shock. Mastery earned during the run is retained.</p></div>'+rebornFailureDiagnosisHTML()+'<button data-failure-return>RETURN TO GUILD →</button></section><aside class="cb2d-failure-analysis"></aside></div>';
   appendRebornAnalysis(e);enterResultsMode();e.querySelector('[data-failure-return]').onclick=()=>{close();Game.switchView('content')};return
 }
 const gear=run.loot?.gear||[],materials=Object.values(run.loot?.materials||{}),xpGrowth=run.xpGrowth||[];
 e.className='cb2d-end cb2d-loot-screen';enterResultsMode();
 e.innerHTML='<div class="cb2d-loot-wrap">'+
   '<header class="cb2d-loot-head"><div><small>THE ASHEN VAULT · '+esc(run?.endgame?.label||'NORMAL').toUpperCase()+' · CLEARED</small><h3>Expedition Rewards</h3><p>The Vaultheart has fallen. Everything below has already been secured to your guild.</p></div><div class="cb2d-loot-complete">✓<span>DUNGEON<br>COMPLETE</span></div></header>'+
   '<div class="cb2d-loot-currency"><article><span>GOLD</span><b>+'+Number(run.loot?.gold||0)+'</b><small>Added to Guild treasury</small></article><article><span>RENOWN</span><b>+'+Number(run.loot?.renown||0)+'</b><small>Guild reputation earned</small></article><article><span>PARTY XP</span><b>+'+Number(run.loot?.xp||0)+'</b><small>Earned by each adventurer</small></article><article><span>BOSS CHESTS</span><b>'+gear.length+'</b><small>Gear drops secured</small></article><article><span>RUN SCORE</span><b>'+Number(run.endgameRecord?.score||run.endgameMetrics?.scorePreview||0).toLocaleString()+'</b><small>'+formatRunTime(run.endgameMetrics?.timeMs||0)+' run time</small></article></div>'+
   endgameProgressHTML()+'<section class="cb2d-loot-section cb2d-xp-section"><div class="cb2d-loot-title"><span>PARTY EXPERIENCE</span><small>Active party XP</small></div><div class="cb2d-xp-grid">'+(xpGrowth.length?xpGrowth.map(xpGrowthCard).join(''):'<div class="cb2d-loot-empty">No character XP was awarded.</div>')+'</div></section>'+
   '<section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>GEAR ACQUIRED</span><small>Sent to Guild Bank</small></div><div class="cb2d-loot-gear">'+(gear.length?gear.map(lootGearCard).join(''):'<div class="cb2d-loot-empty">No bonus gear dropped before the guaranteed Vaultheart reward.</div>')+'</div></section>'+
   '<section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>PROFESSION REAGENTS</span><small>Available immediately for crafting</small></div><div class="cb2d-loot-materials">'+(materials.length?materials.map(lootMaterialCard).join(''):'<div class="cb2d-loot-empty">No profession reagents recovered.</div>')+'</div></section>'+
   '<footer class="cb2d-loot-actions"><button data-loot-bank>VIEW GUILD BANK</button><button class="primary" data-loot-return>RETURN HOME →</button></footer>'+
   '</div>';
 animateXpGrowth(e);appendRebornAnalysis(e);e.querySelector('[data-loot-bank]').onclick=()=>{close();Game.switchView('bank')};
 e.querySelector('[data-loot-return]').onclick=()=>{close();Game.switchView('overview')}
}
async function override(t,b){
 if(!run||run.resolved)return;b.classList.add('active');setTimeout(()=>b.classList.remove('active'),450);
 if(t==='focus'){run.override=Math.max(run.override,4);act('dps','Focusing priority target');log('Override: focus target.')}
 if(t==='interrupt'){run.forceInterrupt=true;log('Override: force next interrupt.')}
 if(t==='defensive'){run.override=Math.max(run.override,5);party().forEach(c=>setCond(c.id,cond(c.id)+5));updateRows();act('tank','Using defensive cooldowns');log('Override: defensive cooldowns.')}
 if(t==='burn'){run.override=Math.max(run.override,6);act('dps','Committing damage cooldowns');log('Override: burn boss.')}
 if(t==='consumable'){
   const st=state(),list=(st.consumables||[]).filter(y=>(y.quantity||0)>0),x=list.find(y=>y.payload?.effect==='combat-potion')||list.find(y=>!y.payload?.effect);
   if(!x){log('No combat potions remain. Craft or buy one before the next run.');return}
   const target=[...party()].sort((a,b)=>hp(a.id)-hp(b.id))[0],heal=Math.max(0,Number(x.payload?.healHp)||18),condition=Math.max(0,Number(x.payload?.condition)||10);
   if(target){setHp(target.id,hp(target.id)+heal);setCond(target.id,cond(target.id)+condition);floating('p-'+target.id,'+'+heal,'heal');act('healer',target.name+' uses '+x.name)}
   x.quantity--;if(x.quantity<=0)st.consumables=st.consumables.filter(y=>y!==x);updateRows();log(x.name+' restores '+(target?.name||'the party')+'.');Game.save()
 }
}
function sharedRouteMarkup(route,currentId){
 const rows=Array.isArray(route)&&route.length?route:[{id:currentId||'combat',title:currentStageDef()?.title||'Combat'}];
 return rows.map((s,i)=>'<span class="'+(s.id===currentId?'current':'')+'"><i>'+(i+1)+'</i>'+esc(s.title||s.label||s.id||('Stage '+(i+1)))+'</span>').join('')
}
function sharedRows(){
 return party().map(c=>'<div class="cb2d-party-row" data-row="'+esc(c.id)+'"><i class="cb2d-dot '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+String(role(c)).toUpperCase()+' · '+esc(c.spec||'')+' · Condition '+cond(c.id)+'%</small><em class="cb2d-side-hp"><i data-side-hp="'+esc(c.id)+'" style="width:'+hp(c.id)+'%"></i></em></span><strong>'+hp(c.id)+' HP</strong></div>').join('')
}
function sharedViewerShell(options={}){
 const s=currentStageDef(),r=root();r.hidden=false;document.body.classList.add('cb2d-open');
 const header=options.header||'CELLBOUND · LIVE 2D COMBAT',route=sharedRouteMarkup(options.route,options.currentId||s?.id),subtitle=options.subtitle||'TACTICS LOCKED';
 r.innerHTML='<section class="cb2d-shell cb2d-shared-shell '+esc(options.shellClass||'')+'"><header class="cb2d-head"><div><small>'+esc(header)+'</small><h2 id="cb2dTitle">'+esc(options.title||s?.title||'Combat')+'</h2></div><div class="cb2d-live"><i></i>LIVE <button data-speed>1×</button><button data-close aria-label="Close combat">×</button></div></header><div class="cb2d-route" id="cb2dRoute">'+route+'</div><div class="cb2d-layout"><main><div class="cb2d-arena '+esc(options.arenaClass||'')+'" id="cb2dArena"><div class="cb2d-floor"></div><div class="cb2d-environment" id="cb2dEnvironment"></div><div class="cb2d-room-tag" id="cb2dRoomTag"></div><div class="cb2d-ground-legend"><span class="danger">RED · MOVE / AVOID</span><span class="spawn">AMBER · SPAWN / PRIORITY</span><span class="aggro">GOLD LINK · AGGRO</span></div><div id="cb2dTelegraphs"></div><div id="cb2dUnits"></div><div class="cb2d-caption"><span id="cb2dType">'+esc(String(s?.kind||'combat').toUpperCase())+'</span><b id="cb2dStatus">Entering encounter…</b></div></div><div class="cb2d-controls cbr-plan-lock" data-reborn="1"><div class="cbr-plan-lock-copy"><small>'+esc(subtitle)+'</small><b>'+esc(options.planTitle||'Your party follows the shared Combat Reborn engine.')+'</b><span>'+esc(options.planCopy||'Movement, targeting, threat, casts, interrupts, healing and mechanics are driven by the same event stream as dungeons.')+'</span></div></div><div class="cb2d-feed"><small>COMBAT FEED</small><p id="cb2dFeed"></p></div></main><aside><div class="cb2d-cast"><small>ENEMY CAST</small><div><b id="cb2dCastName">—</b><strong id="cb2dCastTime">—</strong></div><div class="cb2d-castbar"><i id="cb2dCastFill"></i></div></div><div class="cb2d-combat-meters"><section class="cb2d-meter-panel damage"><div class="cb2d-meter-head"><small>DAMAGE METER</small><span id="cb2dDamageTotal">0 total</span></div><div id="cb2dDamageMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel healing"><div class="cb2d-meter-head"><small>HEALING METER</small><span id="cb2dHealingTotal">0 total</span></div><div id="cb2dHealingMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel threat"><div class="cb2d-meter-head"><small>THREAT METER</small><span id="cb2dThreatTarget">No target</span></div><div id="cb2dThreatMeter" class="cb2d-meter-list"></div></section></div><div class="cb2d-actions"><small>PARTY ACTIONS</small><div data-act="tank"><i class="cb2d-dot tank"></i><b>Tank</b><em>Taking point</em></div><div data-act="healer"><i class="cb2d-dot healer"></i><b>Healer</b><em>Following formation</em></div><div data-act="dps"><i class="cb2d-dot dps"></i><b>Damage</b><em>Acquiring targets</em></div></div><div class="cb2d-party"><small>PARTY CONDITION · '+party().length+' CHARACTERS · ILVL '+ilvl()+'</small><div id="cb2dRows">'+sharedRows()+'</div></div><div class="cb2d-plan"><small>COMBAT MODEL</small><b>COMBAT REBORN · SHARED CB2D VIEWER</b><span>REAL POSITIONS · THREAT · RESOURCES · BUFFS / DEBUFFS</span></div></aside></div><div class="cb2d-end" id="cb2dEnd" hidden></div></section>';
 r.querySelector('[data-close]').onclick=close;
 r.querySelector('[data-speed]').onclick=e=>{if(!run)return;run.speed=run.speed===2?1:2;e.currentTarget.textContent=run.speed+'×'};
 feed();renderCombatMeters();renderRebornHealingMeter()
}
function sharedFormationPosition(c,index,total){
 const profile=combatProfile(c),same=party().filter(x=>combatProfile(x)===profile),slot=Math.max(0,same.indexOf(c)),count=Math.max(1,same.length);
 const spread=(lo,hi)=>count===1?(lo+hi)/2:lo+(hi-lo)*(slot/(count-1));
 if(profile==='tank')return{x:32,y:spread(38,62)};
 if(profile==='melee')return{x:25,y:spread(22,78)};
 if(profile==='ranged')return{x:17,y:spread(18,82)};
 return{x:12,y:spread(28,72)}
}
function spawnSharedEncounter(s,result,options={}){
 clearArenaEphemera();$('#cb2dUnits').innerHTML='';$('#cb2dTelegraphs').innerHTML='';
 const initialUnits=new Map((result.events?.find(e=>e.type==='COMBAT_START')?.payload?.units||[]).map(u=>[u.id,u]));
 const arena=$('#cb2dArena'),env=$('#cb2dEnvironment'),tag=$('#cb2dRoomTag');
 if(arena)arena.className='cb2d-arena theme-'+esc(options.theme||'manor')+' room-'+esc(options.room||s?.id||'shared')+(['boss','final'].includes(String(s?.kind||''))?' boss-room':'');
 if(env)env.innerHTML='<div class="cb2d-ambience">'+Array.from({length:10},(_,i)=>'<i class="cb2d-ambient ash" style="--x:'+(8+(i*9)%84)+'%;--delay:-'+(i*.41)+'s;--dur:'+(4+(i%4)*.5)+'s;--drift:'+(-12+(i%5)*6)+'px"></i>').join('')+'</div>';
 if(tag)tag.innerHTML='<b>'+esc(options.roomLabel||s?.title||'Combat')+'</b><small>'+esc(options.ambience||'Combat Reborn is controlling every unit in the arena.')+'</small>';
 const baseEnemies=(result?.finalState?.enemies||[]).filter(e=>!e.isAdd&&/^e-\d+$/.test(String(e.id||'')));
 run.enemyMax=baseEnemies.map(e=>Math.max(1,Number(e.maxHealth)||1));run.enemyHp=[...run.enemyMax];
 const requestedDisplayMax=Array.isArray(options.enemyDisplayMax)?options.enemyDisplayMax:[];
 run.enemyDisplayMax=run.enemyMax.map((max,i)=>Math.max(1,Number(requestedDisplayMax[i])||max));
 run.threat=run.enemyMax.map(()=>Object.fromEntries(party().map(c=>[c.id,0])));run.aggro=run.enemyMax.map(()=>null);
 run.combatStartedAt=0;run.lastMeterAt=0;renderCombatMeters();renderRebornHealingMeter();
 party().forEach((c,i)=>{
   const pos=initialUnits.get('p-'+c.id)?.position||sharedFormationPosition(c,i,party().length);
   addUnit('p-'+c.id,c.name,'party '+role(c)+' profile-'+combatProfile(c)+' '+classKey(c),pos.x,pos.y,'');
   mountRebornResourceBar(c);
   const unit=$('[data-unit="p-'+c.id+'"]');if(unit){unit.dataset.uiSlot=String(i);unit.style.setProperty('--label-shift-x',((i%2?1:-1)*(6+(i%3)*6))+'px');unit.style.setProperty('--status-shift-x',((i%2?1:-1)*(5+(i%3)*5))+'px')}
   const startHp=Math.max(0,Math.min(100,Number(c?._combatHealthPct??100)));
   const bar=$('[data-unit="p-'+c.id+'"] .cb2d-unit-hp i');if(bar)bar.style.width=startHp+'%';
 });
 const sourceEnemies=Array.isArray(s?.enemies)?s.enemies:[];
 sourceEnemies.forEach((raw,i)=>{
   const data=typeof raw==='object'&&raw?raw:{name:raw},name=data.name||('Enemy '+(i+1)),meta=baseEnemies[i],boss=['boss','final'].includes(String(s?.kind||''))||String(data.classification||'').includes('boss'),y=sourceEnemies.length===1?50:18+i*(64/Math.max(1,sourceEnemies.length-1));
   const pos=initialUnits.get('e-'+i)?.position||{x:68,y};
   addUnit('e-'+i,name,boss?'enemy boss':'enemy',pos.x,pos.y,boss?'big':'',meta?('Lv. '+(meta.level||s?.level||1)+' · '+String(meta.classificationLabel||data.classification||'ENEMY').toUpperCase()):'');
 });
 window.CellboundCombatPortraits?.refresh?.()
}
async function playSharedEncounter(options={}){
 const extParty=Array.isArray(options.party)?options.party.filter(Boolean):[],encounter=options.encounter,result=options.result;
 if(!extParty.length||!encounter||!result)throw new Error('Shared combat viewer requires party, encounter and result.');
 token++;const tok=token;
 const resources=Object.fromEntries(extParty.map(c=>{const d=resourceDefFor(c);return[c.id,{name:d.name,max:d.max,value:d.start}]}));
 run={token:tok,stage:0,speed:1,externalMode:true,externalParty:extParty,externalStage:{...encounter,enemies:(encounter.enemies||[]).map(x=>typeof x==='object'?{...x}:x)},externalOnClose:options.onClose||null,externalOnEvent:typeof options.onEvent==='function'?options.onEvent:null,
   resources,cooldowns:Object.fromEntries(extParty.map(c=>[c.id,{}])),statuses:Object.fromEntries(extParty.map(c=>[c.id,[]])),reviveSickness:Object.fromEntries(extParty.map(c=>[c.id,0])),
   expeditionTimeMs:0,condition:Object.fromEntries(extParty.map(c=>[c.id,100])),hp:Object.fromEntries(extParty.map(c=>[c.id,Math.max(0,Math.min(100,Number(c?._combatHealthPct??100))) ])),enemyHp:[],enemyMax:[],threat:[],aggro:[],
   damageDone:Object.fromEntries(extParty.map(c=>[c.id,0])),healingDone:Object.fromEntries(extParty.map(c=>[c.id,0])),overhealing:Object.fromEntries(extParty.map(c=>[c.id,0])),
   hitCount:Object.fromEntries(extParty.map(c=>[c.id,0])),identityTimers:{},combatStartedAt:0,lastMeterAt:0,log:[(options.title||encounter.title||'Encounter')+' begins.'],
   override:0,forceInterrupt:false,rewards:[],loot:{gear:[],materials:{},gold:0,renown:0,xp:0},resolved:false,combatActive:false,mechanicActive:false,allowKill:true,stageOutcome:true,shotSeq:0,
   rebornHistory:[],rebornReplay:null,rebornResult:result,rebornTelegraphs:{},groundHazards:{},rebornCastTimer:null,
   runtimeStageStartedAt:Number(options.startAt)||0};
 sharedViewerShell(options);spawnSharedEncounter(run.externalStage,result,options);
 const outcome=await playRebornTimeline(result,tok);
 if(tok!==token||!run)return'cancelled';
 run.resolved=true;status(outcome==='victory'?'Encounter cleared':'Party defeated');
 if(typeof options.onComplete==='function'){try{options.onComplete(outcome,result)}catch(error){console.warn('Shared combat completion callback failed',error)}}
 return outcome
}
function externalCharacters(){return Array.isArray(run?.externalParty)?run.externalParty:[]}

function openDungeon(options){
 requestedRunOptions=options||null;
 if(options?.difficulty)window.CellboundEndgame?.choose?.('ashen-vault',options.difficulty,options.tier||1);
 briefing()
}

function syncEntryButton(){
 const b=$('#enterDungeonBtn');if(!b||!Game?.ready)return;
 const gate=readiness();
 b.disabled=false;
 b.setAttribute('aria-disabled',gate.ok?'false':'true');
 b.title=gate.reason;
 b.dataset.cb2dReady=gate.ok?'1':'0';
}
document.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('#enterDungeonBtn');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();briefing();
},true);
function init(){
 Game=window.CellboundGame;G=window.CellboundGear;P=window.CellboundProfessions;
 if(!Game||!Game.ready){setTimeout(init,120);return}
 document.documentElement.dataset.cb2d='ready';
 syncEntryButton();
 setInterval(syncEntryButton,400);
 window.CellboundDungeon2D={open:openDungeon,briefing,currentRun:()=>run,playSharedEncounter,externalCharacters,closeShared:(silent=false)=>{if(run?.externalMode)close(Boolean(silent))}};
}
init();
})();