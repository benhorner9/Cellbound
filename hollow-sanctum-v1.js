(()=>{
'use strict';
const BAL=window.CellboundBalance;
window.CellboundCombatStandard?.register?.('hollow-sanctum',{kind:'dungeon',execution:'local',ui:'shared-cb2d'});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,G=null,P=null,run=null,token=0,requestedRunOptions=null;
let hsTactics={strategyPreset:'balanced',pullStyle:'normal',cooldownUse:'difficult',interruptPriority:'standard',interruptAssignment:'dps-rotation',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'immediate',movementDiscipline:'balanced',bossPlan:'balanced'};
const STAGES=[
 {id:'gallery',title:'Gallery of Echoes',kind:'TRASH',combatKind:'trash',level:6,enemyTypes:['trash','trash','trash'],enemyHealth:145,enemies:['Hollowed Surveyor','Glassweb Crawler','Glass Mite'],mechanic:'Echo Burst',mechanics:[['Echo Burst','circles',1500]]},
 {id:'sentinel',title:'Glassjaw Sentinel',kind:'MINI-BOSS',combatKind:'boss',level:7,enemyTypes:['boss'],enemyHealth:750,enemies:['Glassjaw Sentinel'],mechanic:'Fracture Line',mechanics:[['Fracture Line','line',1700],['Glassjaw Sweep','cone',1450]]},
 {id:'choir',title:'The Bound Choir',kind:'FINAL BOSS',combatKind:'final',level:8,enemyTypes:['boss'],enemyHealth:1000,enemies:['The Bound Choir'],mechanic:'Resonance Collapse',mechanics:[['Resonance Collapse','circle',2100],['Shattering Hymn','interrupt',2200],['Echo Choir','adds',1200]]}
];

const HOLLOW_ROOMS={
 gallery:{
  zone:'GALLERY OF ECHOES',
  description:'A shattered processional chamber suspended over the void. The party enters from the south causeway and clears the open central floor before leaving through the north gate.',
  art:'./assets/hollow-sanctum/rooms/gallery-void-v2.webp',
  liveProfile:'hollow-gallery',
  route:{
   entry:{x:50,y:98},entryInside:{x:50,y:84},engage:{x:50,y:62},
   partyAnchors:[[50,68],[44,71],[56,71],[40,74],[60,74]],
   exitPath:[{x:50,y:59},{x:50,y:48},{x:50,y:36},{x:50,y:24},{x:50,y:13},{x:50,y:4},{x:50,y:-2}],
   spread:2.0
  },
  enemyAnchors:[[50,43],[40,49],[60,49]],
  bounds:{left:24,right:76,top:18,bottom:80},
  walkable:[[39,18],[61,18],[70,24],[76,36],[76,56],[69,69],[60,80],[40,80],[31,69],[24,56],[24,36],[30,24]],
  blockers:[]
 },
 sentinel:{
  zone:'GLASSJAW SENTINEL',
  description:'A circular relic court built around a suspended void core. Fight on the open ring, then route around the core to the north gate.',
  art:'./assets/hollow-sanctum/rooms/sentinel-void-v2.webp',
  liveProfile:'hollow-sentinel',
  route:{
   entry:{x:50,y:98},entryInside:{x:50,y:84},engage:{x:50,y:63},
   partyAnchors:[[50,70],[44,73],[56,73],[40,76],[60,76]],
   exitPath:[{x:50,y:60},{x:43,y:54},{x:39,y:46},{x:39,y:35},{x:43,y:25},{x:50,y:15},{x:50,y:5},{x:50,y:-2}],
   spread:1.9
  },
  enemyAnchors:[[50,53]],
  bounds:{left:24,right:76,top:17,bottom:81},
  walkable:[[39,17],[61,17],[70,23],[76,35],[76,57],[69,70],[60,81],[40,81],[31,70],[24,57],[24,35],[30,23]],
  arena:{shape:'ellipse',cx:50,cy:54,rx:28,ry:25},
  blockers:[{id:'sentinel-void-core',shape:'ellipse',x:50,y:36,rx:6.5,ry:8.0,blocksLos:false,blocksMovement:true}]
 },
 choir:{
  zone:'THE BOUND CHOIR',
  description:'The final fractured shrine. The Bound Choir holds the lower ritual floor while the immense crystal nexus dominates the northern dais.',
  art:'./assets/hollow-sanctum/rooms/choir-void-v2.webp',
  liveProfile:'hollow-choir',
  route:{
   entry:{x:50,y:98},entryInside:{x:50,y:84},engage:{x:50,y:64},
   partyAnchors:[[50,72],[44,75],[56,75],[40,78],[60,78]],
   exitPath:[],
   spread:2.0
  },
  enemyAnchors:[[50,56]],
  addAnchors:[{x:35,y:57},{x:65,y:57}],
  bounds:{left:24,right:76,top:22,bottom:81},
  walkable:[[37,22],[63,22],[72,30],[76,44],[75,61],[68,73],[60,81],[40,81],[32,73],[25,61],[24,44],[28,30]],
  arena:{shape:'ellipse',cx:50,cy:57,rx:27,ry:23},
  blockers:[{id:'choir-fractured-shrine',shape:'ellipse',x:50,y:31,rx:13,ry:18,blocksLos:false,blocksMovement:true}]
 }
};
const RELIC={itemId:'quest-blackglass-resonator',name:'Blackglass Resonator',class:'All',classes:'all',slot:'Relic',tier:3,rarity:'Rare',tierLabel:'Quest Relic',enabled:true,dropEnabled:false,itemLevel:30,power:10,tradeState:'soulbound',questArtMaterial:'void-crystal',lore:'Recovered from The Bound Choir beneath Zeltira.'};
const XP=1200;
const wait=ms=>new Promise(r=>setTimeout(r,Math.round(ms/((run&&run.speed)||1))));
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const role=c=>Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps';
const classKey=c=>'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ilvl=()=>Number(Game?.partyItemLevel?.())||0;
const partyLevel=()=>{const p=party();return p.length?Math.round(p.reduce((n,c)=>n+Math.max(1,Number(c.level)||1),0)/p.length):1};
function hsResourceDef(c){return window.CellboundCombatReborn?.RESOURCE_DEFS?.[c?.class]||{name:'Power',max:100,start:100}}
function hsPersistentStatuses(player,elapsedMs=0){
 const elapsed=Math.max(0,Number(elapsedMs)||0);
 return Object.values(player?.statuses||{}).filter(s=>s?.persistAcrossEncounters&&Number(s.expiresAt)>elapsed).map(s=>({...s,effect:{...(s.effect||{})},remainingMs:Math.max(0,Number(s.expiresAt)-elapsed)}))
}
function hsAdvanceCooldowns(ms){
 const amount=Math.max(0,Number(ms)||0);if(!run)return;
 Object.values(run.cooldowns||{}).forEach(map=>Object.keys(map||{}).forEach(k=>map[k]=Math.max(0,(Number(map[k])||0)-amount)));
 Object.keys(run.statuses||{}).forEach(id=>{run.statuses[id]=(run.statuses[id]||[]).map(s=>({...s,remainingMs:Math.max(0,(Number(s.remainingMs)||0)-amount)})).filter(s=>s.remainingMs>0)});
 Object.keys(run.reviveSickness||{}).forEach(id=>run.reviveSickness[id]=Math.max(0,(Number(run.reviveSickness[id])||0)-amount));
 run.expeditionTimeMs=(Number(run.expeditionTimeMs)||0)+amount
}

function qstate(){return state()?.questSystem}
function unlocked(){return Boolean(qstate()?.flags?.hollowSanctumUnlocked)}
function firstCleared(){return Boolean(qstate()?.flags?.hollowFirstClear)}
function root(){let e=$('#hs2dBackdrop');if(e)return e;e=document.createElement('div');e.id='hs2dBackdrop';e.className='hs2d-backdrop';e.hidden=true;document.body.appendChild(e);return e}
function readiness(normalOnly=false){
 const p=party();if(!unlocked())return{ok:false,reason:'The Hollow Sanctum has not been discovered. Complete Echoes Beneath Zeltira.'};
 if(p.length!==5)return{ok:false,reason:'Build a complete five-character party first.'};
 const bad=p.find(c=>Game.isUnavailable?.(c));if(bad)return{ok:false,reason:bad.name+' is still recovering from Cell Shock.'};
 const cfg=normalOnly?null:hsEndgameConfig(),req=normalOnly?24:Math.max(24,Number(cfg?.recommendedItemLevel)||24),label=normalOnly?'Normal':(cfg?.diff?.name||'Normal');
 if(ilvl()<req)return{ok:false,reason:'Party Item Level '+ilvl()+'. '+label+' requires Item Level '+req+'.'};
 return{ok:true,reason:normalOnly?'Normal difficulty is available.':'The seal is open.'}
}
function renderCard(){
 const card=$('#hollowDungeonCard'),mount=$('#hollowSanctumMount');if((!card&&!mount)||!Game?.ready)return;
 const q=qstate(),open=Boolean(q?.flags?.hollowSanctumUnlocked),done=Boolean(q?.flags?.hollowFirstClear),clears=Number(q?.hollowCompletions)||0,pi=ilvl(),gate=readiness(true);
 if(card){
  card.innerHTML='<article class="dungeon-browser-card hollow '+(open?'unlocked':'locked')+'" data-dungeon-card="hollow-sanctum">'+
   '<div class="dungeon-browser-art has-image hollow-art"><img src="./assets/hollow-sanctum/rooms/gallery-void-v2.webp" alt="" loading="lazy" decoding="async"><span>'+(open?'ZELTIRA UNDERDEEP':'UNKNOWN SIGNAL')+'</span><strong>◇</strong></div>'+
   '<div class="dungeon-browser-copy"><div class="dungeon-browser-heading"><div><small>DUNGEON</small><h3>'+(open?'The Hollow Sanctum':'Undiscovered Dungeon')+'</h3></div><b id="hollowDungeonStatus">'+(open?(done?'CLEARED':'NEWLY UNLOCKED'):'QUEST LOCKED')+'</b></div>'+
   '<p>'+(open?'An ancient crystal shrine beneath Zeltira, ending at the ritual chamber of the Bound Choir.':'Your guild has evidence of something beneath Zeltira, but the route remains sealed.')+'</p>'+
   '<div class="dungeon-browser-meta"><span>3 stages</span><span>'+(open?'iLvl 24+':'Quest discovery')+'</span><span>Party iLvl '+(pi||'—')+'</span></div>'+
   '<div class="dungeon-browser-actions"><button type="button" data-dungeon-more="hollow-sanctum">MORE INFO →</button></div></div></article>'
 }
 if(!mount)return;
 const route=[
  ['gallery','Gallery of Echoes','trash','⌁','Collapsed ceremonial entrance hall where Hollowed Surveyors guard the processional route.','ENEMY PACK'],
  ['sentinel','Glassjaw Sentinel','boss','◇','A guardian chamber built around a fractured relic core. Fracture Line and Glassjaw Sweep punish bad positioning.','ENCOUNTER'],
  ['choir','The Bound Choir','final','✦','The inner shrine. Survive Resonance Collapse, Shattering Hymn and the Echo Choir.','FINAL BOSS']
 ];
 mount.innerHTML='<div class="dungeon-detail-toolbar"><div><small>DUNGEON JOURNAL</small><b>'+(open?'The Hollow Sanctum':'Undiscovered Dungeon')+'</b></div><button type="button" data-dungeon-close>CLOSE DETAILS ×</button></div>'+
  '<div class="dungeon-journal-hero hollow-journal-hero">'+
   '<div class="dungeon-journal-art has-image hollow-journal-art '+(open?'':'locked-image')+'" data-dungeon-art="hollow-sanctum"><img src="./assets/hollow-sanctum/rooms/gallery-void-v2.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"><span class="journal-eyebrow">'+(open?'ZELTIRA UNDERDEEP · DUNGEON':'SEALED LOCATION · UNKNOWN')+'</span><h3>'+(open?'The Hollow Sanctum':'The Sealed Underroad')+'</h3><p>'+(open?'A buried ceremonial complex where Cell glass has grown through ancient stone. Voices still answer from the deeper chambers.':'The route beneath Zeltira has not yet been opened. Complete Echoes Beneath Zeltira to discover what lies beyond the Hollow Seal.')+'</p><div class="journal-badges"><span>5 adventurers</span><span>3 stages</span><span>Party iLvl '+(pi||'—')+'</span></div></div>'+
   '<div class="journal-entry-panel"><small>ENTRY REQUIREMENT</small><b>'+(open?'Quest Access · Party Item Level 24':'Echoes Beneath Zeltira')+'</b><p>'+(open?esc(gate.reason):'Follow the investigation beneath Zeltira and break the Hollow Seal.')+'</p><button '+(open?'data-hs-enter':'data-hs-quests')+' '+(open&&!gate.ok?'disabled':'')+'>'+(open?'ENTER THE HOLLOW SANCTUM':'OPEN QUEST JOURNAL →')+'</button></div>'+
  '</div>'+
  '<div class="dungeon-journal-layout">'+
   '<article class="panel dungeon-route-panel"><div class="panel-head"><div><small>DUNGEON ROUTE</small><h3>Expedition Path</h3></div><b>3 STAGES</b></div><div class="dungeon-route">'+route.map((r,i)=>'<div class="dungeon-stage '+(done?'complete':'')+'" data-kind="'+r[2]+'"><div class="dungeon-stage-rune">'+(done?'✓':r[3])+'</div><div class="dungeon-stage-copy"><b>'+(i+1)+'. '+r[1]+'</b><small>'+r[4]+'</small></div><span class="dungeon-stage-tag">'+r[5]+'</span></div>').join('')+'</div></article>'+
   '<aside class="panel dungeon-intel-panel"><div class="panel-head"><div><small>ENCOUNTER INTELLIGENCE</small><h3>What Your Guild Knows</h3></div></div><div class="dungeon-intel">'+
    '<article class="intel-card"><div class="intel-card-head"><b>Glassjaw Sentinel</b><span>'+(done?'FIELD NOTES':'DISCOVERED')+'</span></div><p>Fracture Line targets a lane through the chamber while Glassjaw Sweep pressures the tank. Position the group around the guardian rather than stacking behind the target.</p></article>'+
    '<article class="intel-card"><div class="intel-card-head"><b>The Bound Choir</b><span>'+(done?'FIELD NOTES':'DISCOVERED')+'</span></div><p>Resonance Collapse controls space, Shattering Hymn must be interrupted, and Echo Choir adds force target swaps during the ritual.</p></article>'+
    '<article class="intel-card"><div class="intel-card-head"><b>Expedition Record</b><span>'+clears+' clear'+(clears===1?'':'s')+'</span></div><p>'+(clears?'The Hollow Seal is open. The Bound Choir can be challenged again on any unlocked difficulty.':'No successful expedition has been recorded yet.')+'</p></article>'+
    '<article class="intel-card"><div class="intel-card-head"><b>Known Rewards</b><span>TIER 3</span></div><p>Class equipment and Void Crystals can be recovered here. The first clear awards the Blackglass Resonator relic, with stronger rewards available on higher difficulties.</p></article>'+
   '</div></aside>'+
  '</div>';
 mount.querySelector('[data-hs-enter]')?.addEventListener('click',openDungeon);
 mount.querySelector('[data-hs-quests]')?.addEventListener('click',()=>Game.switchView?.('quests'));
 try{window.CellboundDungeonBrowser?.refresh?.()}catch(error){console.warn('hollow-sanctum-v1 browser refresh isolated',error)}
}
function hsEndgameConfig(){
 const E=window.CellboundEndgame;
 if(E?.currentConfig)return E.currentConfig('hollow-sanctum');
 return{difficulty:'normal',tier:0,diff:{name:'Normal',label:'NORMAL',description:'Learn the Hollow Sanctum.'},affixes:[],targetTimeMs:15*60*1000,recommendedItemLevel:24,dungeon:{version:2}}
}
function hsEndgamePrepMarkup(){
 const E=window.CellboundEndgame,cfg=hsEndgameConfig(),p=E?.progressFor?.('hollow-sanctum')||{},tierMax=Math.max(1,Number(p.highest_tier)||1);
 const buttons=['normal','heroic','cellbound'].map(mode=>{const unlocked=E?.difficultyUnlocked?E.difficultyUnlocked('hollow-sanctum',mode,cfg.tier||1):mode==='normal';return'<button type="button" data-hs-mode="'+mode+'" class="'+(cfg.difficulty===mode?'active':'')+'" '+(unlocked?'':'disabled')+'>'+(mode==='cellbound'?'CELLBOUND+':mode.toUpperCase())+'</button>'}).join('');
 const tier=cfg.difficulty==='cellbound'?(E?.tierPickerMarkup?.(cfg.tier,tierMax,{attribute:'data-hs-tier'})||''):'';
 const affixes=(cfg.affixes||[]).map(id=>window.CellboundEndgameData?.AFFIXES?.[id]?.name||id).join(' · ')||'No affixes';
 return'<div class="eg-prep-block"><small>DUNGEON DIFFICULTY</small><div class="eg-prep-tabs">'+buttons+'</div><div class="eg-prep-detail"><b>'+esc(cfg.diff?.name||'Normal')+'</b> · Recommended iLvl '+cfg.recommendedItemLevel+' · Target '+Math.floor(cfg.targetTimeMs/60000)+':'+String(Math.round(cfg.targetTimeMs/1000)%60).padStart(2,'0')+'<br>'+esc(affixes)+'<br>'+esc(cfg.diff?.description||'')+'</div>'+tier+'</div>'
}
function hsBindEndgamePrep(){
 const E=window.CellboundEndgame;
 document.querySelectorAll('[data-hs-mode]').forEach(b=>b.onclick=()=>{E?.choose?.('hollow-sanctum',b.dataset.hsMode);briefing()});
 document.querySelectorAll('[data-hs-tier]').forEach(b=>b.onclick=()=>{E?.choose?.('hollow-sanctum','cellbound',Number(b.dataset.hsTier));briefing()})
}


function hsStrategyButtons(key,items){
 return '<div class="eg-prep-tabs hs-strategy-tabs" data-hs-plan="'+key+'">'+items.map(x=>'<button type="button" data-hs-pick="'+key+'|'+x[0]+'" class="'+(hsTactics[key]===x[0]?'active':'')+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>').join('')+'</div>';
}
function applyHsStrategyPreset(value){
 hsTactics.strategyPreset=value;
 if(value==='safe'){
   Object.assign(hsTactics,{pullStyle:'safe',cooldownUse:'difficult',interruptPriority:'high',interruptAssignment:'best',crowdControl:'enabled',defensiveUsage:'aggressive',addPriority:'immediate',movementDiscipline:'safe',bossPlan:'control'});
 }else if(value==='aggressive'){
   Object.assign(hsTactics,{pullStyle:'aggressive',cooldownUse:'free',interruptPriority:'standard',interruptAssignment:'best',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'boss',movementDiscipline:'damage',bossPlan:'burn'});
 }else{
   Object.assign(hsTactics,{pullStyle:'normal',cooldownUse:'difficult',interruptPriority:'standard',interruptAssignment:'dps-rotation',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'immediate',movementDiscipline:'balanced',bossPlan:'balanced'});
 }
}
function hsBindStrategy(){
 $$('[data-hs-pick]').forEach(b=>b.addEventListener('click',()=>{
  const [key,value]=b.dataset.hsPick.split('|');
  if(key==='strategyPreset')applyHsStrategyPreset(value);else hsTactics[key]=value;
  $$('[data-hs-plan="'+key+'"] button').forEach(x=>x.classList.toggle('active',x===b));
 }))
}
async function hsWaitForEndgame(){
 for(let i=0;i<20;i++){if(window.CellboundEndgame?.beginAttempt)return window.CellboundEndgame;await new Promise(r=>setTimeout(r,100))}
 return null
}
function briefing(){
 const baseGate=readiness(true),gate=readiness(),r=root();r.hidden=false;document.body.classList.add('hs2d-open');
 if(!baseGate.ok){
   r.innerHTML='<section class="cb2d-shell cb2d-brief hs2d-unified-shell"><header class="cb2d-head"><div><small>THE HOLLOW SANCTUM · ENTRY CHECK</small><h2>Dungeon entry is currently blocked.</h2></div><button data-close aria-label="Close dungeon">×</button></header><div class="cb2d-blocked"><b>NOT READY</b><p>'+esc(baseGate.reason)+'</p><button data-action>'+(unlocked()?'OPEN PARTY BUILDER':'OPEN QUEST JOURNAL')+' →</button></div></section>';
   r.querySelector('[data-close]').onclick=close;r.querySelector('[data-action]').onclick=()=>{close();Game.switchView?.(unlocked()?'party':'quests')};return
 }
 r.innerHTML='<section class="cb2d-shell cb2d-brief hs2d-unified-shell"><header class="cb2d-head"><div><small>THE HOLLOW SANCTUM · LEVELS 6–8 · ILVL 24+ · TACTICAL BRIEFING</small><h2>Set the plan once. Then watch the dungeon run.</h2></div><button data-close aria-label="Close dungeon">×</button></header><div class="cb2d-brief-grid"><main><p class="cb2d-intro">The Hollow Sanctum uses the same combat rules as every dungeon. Only its rooms, enemies and encounter mechanics change.</p>'+hsEndgamePrepMarkup()+'<h3>Expedition Style</h3><p class="cb2d-intro">Choose the pace. Your party uses it to time interrupts, defensives, crowd control and movement.</p>'+hsStrategyButtons('strategyPreset',[['safe','SAFE','Slower pulls, earlier defensives and stronger mechanic control.'],['balanced','BALANCED','Standard pace with sensible reactions to danger.'],['aggressive','AGGRESSIVE','Faster pulls, freer cooldown use and more boss pressure.']])+'<h3>Encounter Intelligence</h3><div class="hs2d-intel"><span><b>Gallery of Echoes</b><small>Moving packs and pulse damage</small></span><span><b>Glassjaw Sentinel</b><small>Line fractures across the chamber</small></span><span><b>The Bound Choir</b><small>Large resonance zones and interrupts</small></span></div></main><aside><small>ACTIVE FIVE · PARTY LV '+partyLevel()+' · ILVL '+ilvl()+'</small>'+party().map(ch=>'<div class="cb2d-brief-member"><i class="cb2d-dot '+classKey(ch)+'"></i><span><b>'+esc(ch.name)+'</b><small>Lv. '+Math.max(1,Number(ch.level)||1)+' · '+esc(ch.class)+' · '+esc(ch.spec)+'</small></span><strong>'+String(role(ch)).toUpperCase()+'</strong></div>').join('')+'<div class="cb2d-prep-summary"><small>KNOWN REWARD</small><p><b>Blackglass Resonator</b><span>'+(firstCleared()?'First-clear relic already recovered':'First-clear relic · Item Level 30')+'</span></p></div><div class="cb2d-prep-summary"><small>SELECTED DIFFICULTY</small><p><b>'+(gate.ok?'READY':'ITEM LEVEL REQUIRED')+'</b><span>'+esc(gate.reason)+'</span></p></div><button class="cb2d-start" data-start '+(gate.ok?'':'disabled')+'>BEGIN EXPEDITION →</button></aside></div></section>';
 r.querySelector('[data-close]').onclick=close;r.querySelector('[data-start]').onclick=start;
 try{hsBindEndgamePrep()}catch(error){console.warn('Hollow difficulty controls failed to bind',error)}
 hsBindStrategy()
}
function openDungeon(options){Game=window.CellboundGame;if(!Game?.ready)return;db=Game.getSupabase?.();requestedRunOptions=options||null;if(options?.difficulty)window.CellboundEndgame?.choose?.('hollow-sanctum',options.difficulty,options.tier||1);briefing()}
function close(){token++;run=null;document.body.classList.remove('hs2d-open');const r=root();r.hidden=true;Game?.switchView?.('content');renderCard()}
function hpNeed(level){return Game?.xpNeeded?.(level)||BAL?.xpNeeded?.(level)||800+Math.max(0,(Number(level)||1)-1)*250}
function awardXp(){
 const reward=Number(run?.xpReward)||XP;
 const cap=Math.max(1,Number(Game?.getLevelCap?.())||15);
 return party().map(c=>{const beforeLevel=Math.min(cap,Math.max(1,Number(c.level)||1)),beforeXp=beforeLevel>=cap?0:Math.max(0,Number(c.xp)||0),beforeNeed=hpNeed(beforeLevel);let level=beforeLevel,xp=beforeLevel>=cap?0:beforeXp+reward,levels=0;while(level<cap&&xp>=hpNeed(level)){xp-=hpNeed(level);level++;levels++}if(level>=cap){level=cap;xp=0}c.level=level;c.xp=xp;if(levels){c.talent=(Number(c.talent)||0)+levels}return{name:c.name,amount:beforeLevel>=cap?0:reward,beforeLevel,beforeXp,beforeNeed,afterLevel:level,afterXp:xp,afterNeed:hpNeed(level),levels,capped:level>=cap}})
}
async function syncXp(gains){
 if(!db)return;const user=Game.getUser?.();if(!user)return;try{await Promise.all(gains.map(x=>db.from('characters').update({level:x.afterLevel,xp:x.afterXp,last_played_at:new Date().toISOString()}).eq('user_id',user.id).eq('name',x.name)))}catch(e){console.warn('Hollow XP sync failed',e)}
}
function setStatus(text){const e=$('#hs2dStatus');if(e)e.textContent=text}
function feed(text){if(!run)return;run.log.push(text);const e=$('#hs2dFeed');if(e)e.innerHTML=run.log.slice(-7).reverse().map(x=>'<p>'+esc(x)+'</p>').join('')}
function hsDepthScale(y){
 const t=Math.max(0,Math.min(1,(Number(y)-12)/76));return .94+t*.12
}
function hsApplyDepth(e,y){
 if(!e)return;e.style.setProperty('--hs-depth-scale',hsDepthScale(y).toFixed(3));e.style.zIndex=String(20+Math.round(Number(y)||50))
}
function addUnit(id,label,cls,x,y,big=false,meta=''){
 const e=document.createElement('div'),p=hsSafePoint(id,x,y);e.className='hs2d-unit cb2d-unit '+cls+(big?' big':'');e.dataset.hs=id;e.style.left=p.x+'%';e.style.top=p.y+'%';hsApplyDepth(e,p.y);
 e.innerHTML='<i></i><span>'+esc(label)+(meta?'<small class="hs2d-unit-meta">'+esc(meta)+'</small>':'')+'</span><em><i></i></em>';$('#hs2dUnits').appendChild(e)
}
function hsSafePoint(id,x,y){
 const arena=$('#hs2dArena'),transit=arena?.classList.contains('travelling')||arena?.classList.contains('room-entering');
 return{x:Math.max(transit?2:7,Math.min(transit?98:93,Number(x)||50)),y:Math.max(transit?2:11,Math.min(transit?98:89,Number(y)||50))}
}
function move(id,x,y,ms=550){
 const e=$('[data-hs="'+id+'"]');if(!e)return;const p=hsSafePoint(id,x,y);e.style.transitionDuration=ms+'ms';e.style.left=p.x+'%';e.style.top=p.y+'%';hsApplyDepth(e,p.y)
}
function hsPoint(id){const arena=$('#hs2dArena'),e=$('[data-hs="'+id+'"]');if(!arena||!e)return null;const ar=arena.getBoundingClientRect(),r=e.getBoundingClientRect();return{x:r.left+r.width/2-ar.left,y:r.top+r.height/2-ar.top,w:ar.width,h:ar.height}}
function projectile(fromId,toId,kind='magic',ms=420){
 if(window.CellboundCombatFX?.living)return;
 const a=hsPoint(fromId),b=hsPoint(toId),fx=$('#hs2dFx');if(!a||!b||!fx)return;
 const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI,p=document.createElement('i');
 p.className='hs2d-shot '+kind;p.style.left=a.x+'px';p.style.top=a.y+'px';p.style.setProperty('--dx',dx+'px');p.style.setProperty('--dy',dy+'px');p.style.setProperty('--angle',angle+'deg');fx.appendChild(p);setTimeout(()=>p.remove(),ms+120)
}
function hsFloat(id,text,kind='damage'){const p=hsPoint(id),arena=$('#hs2dArena');if(!p||!arena)return;const e=document.createElement('b');e.className='hs2d-float '+kind;e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),800)}
function hsBar(id,pct){const bar=$('[data-hs="'+id+'"] > em i');if(bar)bar.style.width=Math.max(0,Math.min(100,pct))+'%'}
function hsTelegraph(type,label,sourceId,targetId,size=170){
 const layer=$('#hs2dTelegraphs'),a=sourceId?hsPoint(sourceId):null,b=targetId?hsPoint(targetId):null;if(!layer)return null;
 const e=document.createElement('div');e.className='hs2d-tele '+type+' dynamic';e.innerHTML='<span>'+esc(label)+'</span>';
 if(type==='circle'){
   const p=b||a;if(!p)return null;e.style.left=p.x+'px';e.style.top=p.y+'px';e.style.width=size+'px';e.style.height=size+'px';e.style.transform='translate(-50%,-50%)';
 }else{
   if(!a||!b)return null;const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI;
   e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.width=Math.max(220,Math.hypot(a.w,a.h)*.78)+'px';e.style.height='58px';e.style.transform='translateY(-50%) rotate('+angle+'deg)';
 }
 layer.appendChild(e);return e
}
function hsEnemyMeta(s,index){
 const level=Math.max(1,Number(s?.enemyLevels?.[index])||Number(s?.level)||1);
 const type=String(s?.enemyTypes?.[index]||((s?.enemies?.length===1&&(s?.combatKind==='boss'||s?.combatKind==='final'))?'boss':'trash')).toLowerCase();
 const labels={trash:'TRASH',elite:'ELITE',boss:'BOSS','world-boss':'WORLD BOSS',add:'ADD'};
 return{level,type,label:labels[type]||type.toUpperCase()}
}

function hsRouteOffset(point,from,to,slot=0,spread=2){
 const dx=(Number(to?.x)||Number(point.x))-(Number(from?.x)||Number(point.x)),dy=(Number(to?.y)||Number(point.y))-(Number(from?.y)||Number(point.y)),len=Math.hypot(dx,dy)||1;
 const offsets=[0,-1,1,-2,2],amount=(offsets[slot%offsets.length]||0)*spread;
 return{x:Number(point.x)+(-dy/len)*amount,y:Number(point.y)+(dx/len)*amount}
}
function hsPartyStagePosition(s,i){
 const room=HOLLOW_ROOMS[s?.id]||HOLLOW_ROOMS.gallery,p=room.route?.partyAnchors?.[i]||room.route?.entryInside||[35,50];
 return Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p.x),y:Number(p.y)}
}
function hsEnemyStagePosition(s,i){
 const room=HOLLOW_ROOMS[s?.id]||HOLLOW_ROOMS.gallery,p=room.enemyAnchors?.[i]||room.enemyAnchors?.[room.enemyAnchors.length-1]||[68,50];
 return Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p.x),y:Number(p.y)}
}
function hsEnsureFade(){
 const arena=$('#hs2dArena');if(!arena)return null;let fade=arena.querySelector('.hs2d-room-fade');
 if(!fade){fade=document.createElement('div');fade.className='hs2d-room-fade';fade.setAttribute('aria-hidden','true');arena.appendChild(fade)}return fade
}
function hsSetFade(black,duration=560){
 const fade=hsEnsureFade();if(!fade)return;fade.style.setProperty('--hs-fade-ms',Math.max(0,Number(duration)||0)+'ms');fade.classList.toggle('is-black',Boolean(black))
}
async function hsWaitForRoomArt(art,timeout=1400){
 if(!art)return;
 if(!(art.complete&&art.naturalWidth>0)){
  await Promise.race([
   new Promise(resolve=>{
    const done=()=>{art.removeEventListener('load',done);art.removeEventListener('error',done);resolve()};
    art.addEventListener('load',done,{once:true});art.addEventListener('error',done,{once:true})
   }),
   new Promise(resolve=>setTimeout(resolve,Math.max(250,Number(timeout)||1400)))
  ])
 }
 try{await art.decode?.()}catch(error){}
}
function stageEnvironment(s){
 const room=HOLLOW_ROOMS[s.id]||HOLLOW_ROOMS.gallery,arena=$('#hs2dArena'),environment=$('#hs2dEnvironment'),src=room.art;
 arena.className='cb2d-arena hs2d-arena hs2d-unified-arena hollow-live-room stage-'+s.id;
 arena.dataset.hollowRoom=s.id;arena.dataset.bespokeBattlefield='1';arena.dataset.directRoomArt='1';
 delete arena.dataset.liveSceneReady;
 // Hollow Sanctum now uses the supplied room artwork directly. Remove any stale
 // generated living-scene canvas so it cannot cover or replace the authored map.
 arena.querySelectorAll('.cb2d-live-scene,.hs-live-scene').forEach(node=>node.remove());
 let art=null;
 if(environment){
  environment.innerHTML='<img class="hs2d-room-art" src="'+src+'" alt="" decoding="async" fetchpriority="high" draggable="false">';
  art=environment.querySelector('.hs2d-room-art');
  art?.addEventListener('error',()=>{
   art.dataset.hsLoadError='1';
   console.error('Hollow Sanctum room artwork failed to load:',src)
  },{once:true})
 }
 const tag=$('#hs2dRoom');if(tag)tag.innerHTML='<em>'+esc(room.zone||'HOLLOW SANCTUM')+'</em><b>'+esc(s.title)+'</b><small>'+esc(room.description||'The sanctum closes around the party.')+'</small>';
 hsEnsureFade();return art
}
async function spawnStage(s){
 const art=stageEnvironment(s);$('#hs2dUnits').innerHTML='';$('#hs2dTelegraphs').innerHTML='';$('#hs2dFx').innerHTML='';
 const chars=party(),room=HOLLOW_ROOMS[s.id]||HOLLOW_ROOMS.gallery,route=room.route||{},entry=route.entry||{x:5,y:50},inside=route.entryInside||{x:20,y:50},spread=Number(route.spread)||2;
 const arena=$('#hs2dArena');arena?.classList.add('room-entering');
 chars.forEach((c,i)=>{
  const start=hsRouteOffset(entry,entry,inside,i,spread),target=hsPartyStagePosition(s,i),unitId='p-'+c.id;
  addUnit(unitId,c.name,'party '+role(c)+' '+classKey(c),start.x,start.y);
  setTimeout(()=>move(unitId,target.x,target.y,620),35+i*22)
 });
 // Hostiles belong to the room. They are waiting when the party enters.
 s.enemies.forEach((n,i)=>{
  const m=hsEnemyMeta(s,i),big=m.type==='boss'||m.type==='world-boss'||(s.id==='sentinel'&&m.type==='elite'),target=hsEnemyStagePosition(s,i);
  addUnit('e'+i,n,big?'enemy boss':'enemy',target.x,target.y,big,'Lv. '+m.level+' · '+m.label)
 });
 if(run?.roomTransitionBlack){
  const fade=hsEnsureFade();fade?.classList.add('is-black');
  await hsWaitForRoomArt(art,1600);
  requestAnimationFrame(()=>requestAnimationFrame(()=>hsSetFade(false,720)));run.roomTransitionBlack=false
 }else{
  await hsWaitForRoomArt(art,900);hsSetFade(false,0)
 }
 setTimeout(()=>arena?.classList.remove('room-entering'),760);
 requestAnimationFrame(()=>window.CellboundCombatPortraits?.refresh?.())
}

function hsRenderId(unitId){
 const id=String(unitId||'');
 if(id.startsWith('p-'))return party().some(x=>String(x.id)===id.slice(2))?id:null;
 if(/^e-\d+$/.test(id))return'e'+Number(id.slice(2));
 return id
}
function hsCharacter(unitId){const id=String(unitId||'');return id.startsWith('p-')?party().find(x=>String(x.id)===id.slice(2)):null}
function hsAttackKind(c){return c?.class==='Hunter'?'arrow':['Mage','Priest','Druid','Evoker'].includes(c?.class)?'magic':'slash'}
function hsRebornEncounter(s){
 const room=HOLLOW_ROOMS[s.id]||{};
 const enemies=s.enemies.map((name,i)=>({name,currentPosition:hsEnemyStagePosition(s,i)}));
 const environment={room:s.id,bounds:{...(room.bounds||{})},arena:room.arena?{...room.arena}:undefined,walkable:Array.isArray(room.walkable)?room.walkable.map(p=>[Number(p[0]),Number(p[1])]):undefined,blockers:(room.blockers||[]).map(b=>({...b,points:Array.isArray(b.points)?b.points.map(p=>[Number(p[0]),Number(p[1])]):b.points,blocksLos:b.blocksLos!==false,blocksMovement:b.blocksMovement!==false}))};
 const mechanics=(s.mechanics||[]).map(m=>{const mechanic=Array.isArray(m)?{name:m[0],type:m[1],duration:m[2]}:{...m};if(mechanic.type==='adds'&&Array.isArray(room.addAnchors)&&room.addAnchors.length)mechanic.spawnPoints=room.addAnchors.map(p=>({x:Number(p.x),y:Number(p.y)}));return mechanic});
 const base={id:s.id,title:s.title,kind:s.combatKind||'trash',level:s.level||1,recommendedItemLevel:s.level<=6?24:s.level===7?26:28,enemyLevels:s.enemyLevels||null,enemyTypes:s.enemyTypes||null,enemies,enemyHealth:s.enemyHealth,mechanics,environment};
 return window.CellboundEndgame?.stageConfig?.('hollow-sanctum',base)||base
}
function hsResultHealth(result){
 (result?.finalState?.players||[]).forEach(p=>{const c=party().find(x=>String(x.id)===String(p.characterId));if(c)run.hp[c.id]=Math.max(0,Math.min(100,p.maxHealth?Math.round(p.health/p.maxHealth*100):0))})
}
function hsMechanicFromEvent(e){
 const type=e.payload?.mechanicType,tokenId=e.payload?.token||('hs-'+e.timestamp),source=hsRenderId(e.source),target=hsRenderId(e.payload?.targetId||e.target);let tg=null;
 if(type==='line')tg=hsTelegraph('line',e.ability||'LINE ATTACK',source,target);
 else if(type==='cone')tg=hsTelegraph('line',e.ability||'FRONTAL',source,target);
 else if(type==='circle')tg=hsTelegraph('circle',e.ability||'AREA ATTACK',source,target||source,210);
 else if(type==='circles'){
   const ids=(e.payload?.targetIds||[]).map(hsRenderId).filter(Boolean),layer=$('#hs2dTelegraphs'),wrap=document.createElement('div');wrap.className='hs2d-multi-tele';
   ids.forEach((id,i)=>{const t=hsTelegraph('circle',i===0?(e.ability||'TARGETED AREA'):'',null,id,145);if(t){t.dataset.hsMulti=tokenId}})
   tg={remove:()=>$$('[data-hs-multi="'+tokenId+'"]').forEach(x=>x.remove()),classList:{add:k=>$$('[data-hs-multi="'+tokenId+'"]').forEach(x=>x.classList.add(k))}};
 }else if(type==='adds'){
   const layer=$('#hs2dTelegraphs'),room=HOLLOW_ROOMS[STAGES[run?.stage]?.id]||{},anchors=Array.isArray(room.addAnchors)&&room.addAnchors.length?room.addAnchors:[{x:68,y:50}];
   if(layer){tg=document.createElement('div');tg.className='hs2d-add-spawn-wrap';tg.style.cssText='position:absolute;inset:0;pointer-events:none';anchors.forEach((p,i)=>{const mark=document.createElement('div');mark.className='hs2d-tele circle dynamic';mark.innerHTML='<span>'+(i===0?'ADDS SPAWNING':'ADD')+'</span>';mark.style.left=Number(p.x)+'%';mark.style.top=Number(p.y)+'%';mark.style.width='112px';mark.style.height='112px';mark.style.transform='translate(-50%,-50%)';tg.appendChild(mark)});layer.appendChild(tg)}
 }else if(type==='interrupt'){
   const layer=$('#hs2dTelegraphs');if(layer){tg=document.createElement('div');tg.className='hs2d-tele circle dynamic';tg.innerHTML='<span>INTERRUPT '+esc(e.ability||'CAST')+'</span>';const p=hsPoint(source);if(p){tg.style.left=p.x+'px';tg.style.top=p.y+'px';tg.style.width='92px';tg.style.height='92px';tg.style.transform='translate(-50%,-50%)'}layer.appendChild(tg)}
 }
 run.telegraphs[tokenId]=tg;return tg
}
function hsClearMechanic(tokenId,impact=false){const tg=run?.telegraphs?.[tokenId];if(!tg)return;if(impact)tg.classList?.add?.('impact');setTimeout(()=>tg.remove?.(),260);delete run.telegraphs[tokenId]}
function hsAddSpawn(e){
 const id=e.target,p=e.position||{x:75,y:50};if($('[data-hs="'+id+'"]'))return;
 addUnit(id,e.payload?.name||'Echo Add','enemy',p.x,p.y,false,'Lv. '+(e.payload?.level||STAGES[run.stage]?.level||1)+' · '+(e.payload?.classificationLabel||'ADD'));const bar=$('[data-hs="'+id+'"] > em i');if(bar)bar.style.width='100%'
}
function hsResourceVisual(e){
 const id=hsRenderId(e.source);if(!id)return;
 const u=$('[data-hs="'+id+'"]');if(!u||!u.classList.contains('party'))return;
 let bar=u.querySelector('.cbr-resource');
 if(!bar){bar=document.createElement('small');bar.className='cbr-resource';bar.innerHTML='<i></i>';u.appendChild(bar)}
 const name=String(e.payload?.resource||'Power'),max=Math.max(1,Number(e.payload?.max)||100),value=Math.max(0,Math.min(max,Number(e.payload?.value)||0)),key='resource-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 if(bar.dataset.resource!==name){[...bar.classList].filter(x=>x.startsWith('resource-')).forEach(x=>bar.classList.remove(x));bar.classList.add(key);bar.dataset.resource=name;bar.title=name}
 const fill=bar.querySelector('i');if(fill)fill.style.width=(value/max*100)+'%'
}
function hsStatusTargets(id){
 const out=[],rid=hsRenderId(id),unit=rid?$('[data-hs="'+rid+'"]'):null;if(unit)out.push(unit);
 const ch=hsCharacter(id),row=ch?document.querySelector('[data-hs-side-row="'+CSS.escape(String(ch.id))+'"]'):null,mirror=row?.querySelector('span');
 if(mirror)out.push({el:mirror,mirror:true});
 return out
}
function hsRenderRebornEvent(e){
 window.CellboundCombatFX?.combatEvent?.(e,{arena:$('#hs2dArena'),resolve:id=>hsStatusTargets(id)?.[0],speed:()=>run?.speed||1});
 try{
  if(window.CellboundCombatStatuses?.handle(e,{resolve:hsStatusTargets,speed:()=>run?.speed||1}))return;
 }catch(error){console.warn('Hollow Sanctum status visual skipped',e?.type,error)}
 const src=hsRenderId(e.source),target=hsRenderId(e.target),srcChar=hsCharacter(e.source),targetChar=hsCharacter(e.target);
 switch(e.type){
  case'COMBAT_START':{const arena=$('#hs2dArena');window.CellboundCombatFX?.mount?.(arena);if(['boss','final'].includes(String(STAGES[run.stage]?.kind||'')))window.CellboundCombatFX?.boss?.(arena,STAGES[run.stage]?.title||'Boss');setStatus('Combat underway.');feed('Combat begins.');break;}
  case'MOVEMENT_START':if(window.CellboundCombatFX?.ownsMovement)break;if(src&&e.payload?.to)move(src,e.payload.to.x,e.payload.to.y,e.payload.duration||420);break;
  case'ABILITY_START':
   if(srcChar)hsAct(role(srcChar),srcChar.name+' · '+(e.ability||'Ability'));
   if(srcChar&&target){projectile(src,target,hsAttackKind(srcChar),260)}
   else if(src&&target&&(String(e.source||'').startsWith('e-')||String(e.source||'').startsWith('add-')))projectile(src,target,'enemy',300);
   break;
  case'DAMAGE_DEALT':
   if(target){
     const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));hsBar(target,pct);hsFloat(target,'-'+Math.round(Number(e.amount)||0),targetChar?'incoming':'damage');window.CellboundCombatFX?.impact?.($('[data-hs="'+target+'"]'),{critical:e.result==='critical'});
     if(targetChar)run.hp[targetChar.id]=pct;
   }
   if(srcChar){run.damageDone[srcChar.id]=(Number(run.damageDone?.[srcChar.id])||0)+(Number(e.amount)||0);hsRenderMeters()}
   if(targetChar)hsUpdateSidebar();
   if(e.payload?.avoidable)feed((targetChar?.name||'A player')+' is hit by avoidable '+(e.ability||'damage')+'.');
   break;
  case'HEAL_RECEIVED':
   if(target&&targetChar){const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));run.hp[targetChar.id]=pct;hsBar(target,pct);hsFloat(target,'+'+Math.round(Number(e.amount)||0),'heal');window.CellboundCombatFX?.heal?.($('[data-hs="'+target+'"]'));hsUpdateSidebar()}
   if(srcChar){run.healingDone[srcChar.id]=(Number(run.healingDone?.[srcChar.id])||0)+(Number(e.amount)||0);run.overhealing[srcChar.id]=(Number(run.overhealing?.[srcChar.id])||0)+(Number(e.payload?.overhealing)||0);hsRenderMeters()}
   break;
  case'PHASE_CHANGE':window.CellboundCombatFX?.phase?.($('#hs2dArena'));window.CellboundFX?.phase?.(e.ability||'Boss phase',e.payload?.healthPct);feed((e.ability||'The boss changes phase')+' at '+Math.round(Number(e.payload?.healthPct)||0)+'% health.');setStatus(e.ability||'Phase change');const a=$('#hs2dArena');a?.classList.add('ambient-surge');setTimeout(()=>a?.classList.remove('ambient-surge'),1200);break;
  case'ENRAGE':feed((e.ability||'The boss enrages')+'.');setStatus(e.result==='hard'?'HARD ENRAGE — finish now':(e.ability||'Enrage'));break;
  case'UNIQUE_EFFECT_TRIGGER':if(srcChar){feed(srcChar.name+' triggers '+(e.ability||'a unique item effect')+'.');hsFloat(src,e.ability||'UNIQUE','heal');setStatus((e.ability||'Unique effect')+' activated.')}break;
  case'CROWD_CONTROL':if(srcChar){feed(srcChar.name+' controls a priority enemy.');if(target)hsFloat(target,'CONTROLLED','heal')}break;

  case'AFFIX_TRIGGER':feed((e.ability||'Dungeon affix')+' · '+String(e.result||'triggered').replace(/-/g,' ')+'.');break;
  case'ENEMY_REVIVED':if(target){const el=$('[data-hs="'+target+'"]');if(el)el.classList.remove('dead');hsBar(target,Number(e.payload?.targetHpPct)||35);hsFloat(target,'RETURNS','incoming');feed('Necromantic returns an enemy to the fight.')}break;
  case'PLAYER_MISTAKE':if(srcChar)feed(srcChar.name+' '+(e.payload?.detail||'makes an execution mistake')+'.');break;
  case'PLAYER_REVIVED':
   if(target&&targetChar){const pct=Math.max(1,Math.min(100,Number(e.payload?.targetHpPct)||35)),el=$('[data-hs="'+target+'"]');if(el)el.classList.remove('dead');run.hp[targetChar.id]=pct;hsBar(target,pct);hsFloat(target,'BATTLE REZ','heal');feed(targetChar.name+' is brought back by '+(srcChar?.name||'the healer')+'.');hsResourceVisual({source:e.target,payload:{resource:e.payload?.resource,value:e.payload?.resourceValue,max:e.payload?.resourceMax}})}
   break;
  case'RESOURCE_STATE':case'RESOURCE_SPENT':case'RESOURCE_GAINED':hsResourceVisual(e);break;
  case'THREAT_GENERATED':
   if(srcChar){run.threat[srcChar.id]=Number(e.payload?.total)||0;hsRenderMeters()}break;
  case'AGGRO_CHANGED':
   run.aggro=targetChar?.id||null;if(e.payload?.threat&&typeof e.payload.threat==='object'){Object.entries(e.payload.threat).forEach(([id,v])=>{const ch=hsCharacter(id);if(ch)run.threat[ch.id]=Number(v)||0})}hsRenderMeters();
   if(targetChar&&role(targetChar)!=='tank')feed(targetChar.name+' pulls aggro from the Tank.');
   break;
  case'PARTY_COMMAND':if(e.result!=='cooldown'){feed('Party executes '+String(e.ability||'command').replace(/-/g,' ')+'.')}break;
  case'MECHANIC_TELEGRAPH':
   setStatus((e.ability||'Mechanic')+' incoming…');feed((e.ability||'A mechanic')+' is telegraphed.');hsMechanicFromEvent(e);{
    const mt=String(e.payload?.mechanicType||''),rec=['interrupt','self-heal'].includes(mt)?'interrupt':(['circle','circles','line','target-circle','persistent-circle'].includes(mt)?'spread':mt==='adds'?'focus':mt==='cone'?'defensive':null);
    document.querySelectorAll('[data-hs-override]').forEach(b=>b.classList.toggle('recommended',!!rec&&b.dataset.hsOverride===rec))
   }break;
  case'MECHANIC_RESOLVE':hsClearMechanic(e.payload?.token,true);/* Engine events own return-to-formation movement. */document.querySelectorAll('[data-hs-override]').forEach(b=>b.classList.remove('recommended'));break;
  case'CAST_START':if(String(e.result||'')==='enemy'){hsCastStart(e.ability||'Enemy Cast',e.payload?.duration)}if(e.payload?.interruptible)feed((e.ability||'Cast')+' can be interrupted.');break;
  case'CAST_FINISH':hsCastClear();break;
  case'INTERRUPT':
   if(e.result==='success'){window.CellboundCombatFX?.interrupt?.($('[data-hs="'+target+'"]')||$('#hs2dArena'));feed((srcChar?.name||'A player')+' interrupts '+(e.payload?.interruptedAbility||'the cast')+'.');setStatus('Interrupt successful.');hsCastClear();hsClearMechanic(e.payload?.token,false)}
   break;
  case'ADD_SPAWNED':hsAddSpawn(e);window.CellboundCombatFX?.spawn?.($('[data-hs="'+target+'"]')||$('#hs2dArena'));feed((e.payload?.name||'An add')+' enters the encounter.');break;
  case'ADD_DEFEATED':case'ENEMY_DEFEATED':
   if(target){const el=$('[data-hs="'+target+'"]');if(el){el.classList.add('dead');window.CellboundCombatFX?.death?.(el,{boss:e.type==='ENEMY_DEFEATED'&&['boss','final'].includes(String(STAGES[run.stage]?.kind||''))});hsBar(target,0)}}break;
  case'PLAYER_DEFEATED':
   if(target){const el=$('[data-hs="'+target+'"]');if(el){el.classList.add('dead');window.CellboundCombatFX?.death?.(el)}hsBar(target,0);if(targetChar){run.hp[targetChar.id]=0;feed(targetChar.name+' is defeated.');hsUpdateSidebar()}}
   break;
  case'DEFENSIVE_ACTIVATED':if(srcChar)feed(srcChar.name+' activates a defensive.');break;
  case'COMBAT_END':hsCastClear();setStatus(e.result==='victory'?'Path clear.':'Party defeated.');if(e.result==='victory')window.CellboundCombatFX?.victory?.($('#hs2dArena'));else window.CellboundFX?.wipe?.('The party has fallen inside The Hollow Sanctum.');break;
 }
}
async function hsPlayTimeline(result,tok){
 const session=run?.liveCombat?.session;if(!session?.advance||!session?.command)throw new Error('Real-time Combat Reborn session unavailable');
 if(!run)return false;run.telegraphs={};
 const stageMeta={stageId:result?.stageId,stageTitle:result?.stageTitle,startHp:result?.startHp};
 const renderEvents=events=>{for(const event of events||[]){try{hsRenderRebornEvent(event)}catch(error){console.warn('hollow-sanctum-v1.js live combat visual recovered',event?.type,event?.ability,error)}}};
 renderEvents(session.drainEvents?.()||[]);
 run.liveCombat.issue=(type,payload={})=>session.command(type,payload);
 return await new Promise(resolve=>{
  let finished=false,raf=0,lastWall=performance.now();
  const finish=(value,finalResult=null)=>{
   if(finished)return;finished=true;if(raf)cancelAnimationFrame(raf);
   const final=finalResult||session.snapshot?.()||result;
   if(final){final.stageId=stageMeta.stageId;final.stageTitle=stageMeta.stageTitle;final.startHp=stageMeta.startHp;try{Object.keys(result).forEach(k=>delete result[k]);Object.assign(result,final)}catch(_){}}
   if(run?.liveCombat){run.liveCombat.result=final;run.liveCombat.issue=null;run.liveCombat.session=null}
   resolve(value)
  };
  const frame=now=>{
   if(finished)return;if(tok!==token||!run){finish(false);return}
   if(document.hidden){lastWall=now;raf=requestAnimationFrame(frame);return}
   const delta=Math.max(0,Math.min(250,now-lastWall))*Math.max(.25,Number(run.speed)||1);lastWall=now;
   const step=session.advance(delta);window.CellboundDungeon2D?.refreshExternalCommandCooldowns?.(session,'[data-hs-override]:not([data-hs-override="consumable"])','hsOverride');if(step.events?.length)renderEvents(step.events);
   if(step.finished){const final=step.result||session.snapshot?.()||result;finish(final?.outcome==='victory',final);return}
   raf=requestAnimationFrame(frame)
  };
  raf=requestAnimationFrame(frame)
 })
}
function hsStageSummary(result){
 const s=result?.summary||{},ints=s.interrupts||{},m=s.mechanics||{};
 return'<div class="hs2d-combat-summary"><small>ENCOUNTER SUMMARY</small><b>'+Math.round(Number(s.totalDamage)||0).toLocaleString()+' damage · '+Math.round(Number(s.totalHealing)||0).toLocaleString()+' healing</b><span>'+Number(s.deaths||0)+' deaths · '+Number(s.mistakes?.total||0)+' mistakes · '+Number(s.battleResurrections||0)+' battle rez · '+Number(ints.success||0)+'/'+Number(ints.attempts||0)+' interrupts · '+Number(m.avoided||0)+' mechanics avoided · '+Number(m.failed||0)+' failed</span></div>'
}

function hsFailureDiagnosis(result){
 const s=result?.summary||{},ints=s.interrupts||{},m=s.mechanics||{},players=s.players||[],causes=[],changes=[];
 const missed=Number(ints.missedCritical)||0,threat=players.reduce((n,p)=>n+(Number(p.threatLost)||0),0),avoidable=players.reduce((n,p)=>n+(Number(p.avoidableDamage)||0),0);
 if(missed){causes.push(missed+' critical interrupt'+(missed===1?' was':'s were')+' missed');changes.push('Use a stricter interrupt plan or damage rotation.')}
 if(Number(m.failed)){causes.push(Number(m.failed)+' mechanics failed');changes.push('Use safer positioning and control the dangerous mechanics first.')}
 if(threat){causes.push(threat+' threat losses broke formation');changes.push('Use Safe pull style or a Control boss plan.')}
 if(avoidable){causes.push(Math.round(avoidable).toLocaleString()+' avoidable damage was taken')}
 const dead=[...players].filter(p=>Number(p.deaths)>0).sort((a,b)=>Number(b.deaths)-Number(a.deaths))[0];if(dead)causes.push(dead.name+' died '+dead.deaths+' time'+(dead.deaths===1?'':'s'));
 if(!causes.length){causes.push('The party failed the raw damage / healing check');changes.push('Upgrade gear or use major cooldowns earlier.')}
 return'<div class="hs2d-failure-causes"><small>PRIMARY CAUSES</small>'+causes.slice(0,3).map((x,i)=>'<p><b>'+(i+1)+'</b>'+esc(x)+'</p>').join('')+'<strong>NEXT ATTEMPT</strong>'+[...new Set(changes)].slice(0,2).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'
}
function hsProgressEarned(){
 const record=run?.endgameRecord||{},unlocks=record.newUnlocks||[],achievements=record.newAchievements||[],score=Number(record.score||run?.endgameMetrics?.scorePreview||0);
 const comparison=record.isNewBest
   ?'<span><i>★</i><b>NEW BEST · '+score.toLocaleString()+' score</b></span>'
   :record.previousBestScore?'<span><i>↔</i><b>Previous best '+Number(record.previousBestScore).toLocaleString()+' · this run '+score.toLocaleString()+'</b></span>':'';
 if(!unlocks.length&&!achievements.length&&!comparison)return'';
 return'<section class="cbr-progress-earned"><small>CLEAR RESULTS</small><h4>Rewards and unlocks from this clear.</h4><div>'+comparison+unlocks.map(x=>'<span><i>↗</i><b>'+esc(x)+'</b></span>').join('')+achievements.map(id=>'<span><i>◆</i><b>Achievement: '+esc(window.CellboundEndgame?.achievementName?.(id)||id)+'</b></span>').join('')+'</div></section>'
}


function hsCombatTotals(){
 const history=run?.history||[],map={};let duration=0,deaths=0,damage=0,healing=0,damageTaken=0,avoidableDamage=0,attempts=0,interrupts=0,missedInterrupts=0,failed=0,avoided=0,mistakes=0,battleResurrections=0,threatLosses=0;
 history.forEach(h=>{
  const s=h?.summary||{};duration+=Number(s.durationSeconds)||((Number(h?.durationMs)||0)/1000);deaths+=Number(s.deaths)||0;damage+=Number(s.totalDamage)||0;healing+=Number(s.totalHealing)||0;
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
function hsCombatAnalysisHTML(){
 const t=hsCombatTotals();if(!run?.history?.length)return'';
 const mins=Math.floor(t.duration/60),secs=Math.round(t.duration%60),time=(mins?mins+'m ':'')+secs+'s';
 const mistakeLabels={movement:'movement',interrupt:'interrupt',threat:'threat',tank:'tank',triage:'triage',defensive:'defensive'};
 const rows=t.players.sort((a,b)=>b.damage-a.damage).map(p=>{
  const mistakeTop=Object.entries(p.mistakesByType||{}).sort((a,b)=>b[1]-a[1])[0],mistakeCopy=p.mistakes?(p.mistakes+' mistake'+(p.mistakes===1?'':'s')+(mistakeTop?' · '+(mistakeLabels[mistakeTop[0]]||mistakeTop[0])+' '+mistakeTop[1]:'')):'Clean execution';
  return'<div class="cbr-analysis-row"><i class="cb2d-dot '+('class-'+String(p.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-'))+'"></i><span><b>'+esc(p.name)+'</b><small>'+esc(p.class)+' · '+mistakeCopy+' · Avoidable '+Math.round(p.avoidableDamage)+' · Interrupts '+p.interrupts+'/'+p.interruptAttempts+(p.battleResurrections?' · Battle rez '+p.battleResurrections:'')+'</small></span><strong>'+Math.round(p.damage).toLocaleString()+' dmg</strong></div>'
 }).join('');
 return'<section class="cbr-analysis"><div class="cbr-analysis-head"><div><small>RUN ANALYSIS</small><h4>Review damage, healing, mistakes and mechanics.</h4></div><button type="button" data-hs-replay>REPLAY FINAL FIGHT</button></div><div class="cbr-analysis-grid"><article><span>TIME</span><b>'+time+'</b></article><article><span>DAMAGE</span><b>'+Math.round(t.damage).toLocaleString()+'</b></article><article><span>HEALING</span><b>'+Math.round(t.healing).toLocaleString()+'</b></article><article><span>AVOIDABLE</span><b>'+Math.round(t.avoidableDamage).toLocaleString()+'</b></article><article><span>MISTAKES</span><b>'+t.mistakes+'</b></article><article><span>DEATHS</span><b>'+t.deaths+'</b></article><article><span>COMBAT REZ</span><b>'+t.battleResurrections+'</b></article><article><span>OOC REVIVES</span><b>'+t.outOfCombatRevives+'</b></article><article><span>INTERRUPTS</span><b>'+t.interrupts+'/'+t.attempts+'</b></article><article><span>MECHANICS</span><b>'+t.avoided+'✓ · '+t.failed+'✕</b></article></div><div class="cbr-analysis-list">'+rows+'</div></section>'
}
async function hsReplayFinalFight(){
 const h=(run?.history||[]).slice(-1)[0];if(!h?.events?.length)return;
 const s=STAGES.find(x=>x.id===h.stageId)||STAGES[STAGES.length-1],end=$('#hs2dEnd'),savedHp={...run.hp};
 if(end)end.hidden=true;
 Object.entries(h.startHp||{}).forEach(([id,v])=>run.hp[id]=Number(v)||0);
 await spawnStage(s);hsUpdateSidebar();setStatus('Replay · final fight');feed('Replay uses the original fight.');
 await hsPlayTimeline(h,token);
 run.hp=savedHp;hsUpdateSidebar();if(end)end.hidden=false
}

async function hsFail(s,result){
 run.done=true;Game.applyPartyCellShock?.(25);const st=state();st.activity.push('The guild wiped in The Hollow Sanctum at '+s.title+'. All five gained 25% Cell Shock.');Game.save?.();await Game.persistState?.();
 const end=$('#hs2dEnd');end.hidden=false;end.className='cb2d-end cb2d-results-screen';window.CellboundCombatViewer?.setResults?.(root(),true);end.innerHTML='<div><small>EXPEDITION FAILED</small><h3>Wipe at '+esc(s.title)+'.</h3><p>All five adventurers gained 25% Cell Shock. Mastery records and the cause of the wipe are retained.</p></div>'+hsFailureDiagnosis(result)+hsStageSummary(result)+'<button data-return>RETURN TO DUNGEON JOURNAL →</button>';end.querySelector('[data-return]').onclick=close
}
async function hsFailNoHealer(s,result){
 run.done=true;Game.applyPartyCellShock?.(25);const st=state();st.activity.push('The Hollow Sanctum expedition ended after '+s.title+' because the party had no healer to revive fallen adventurers. All five gained 25% Cell Shock.');Game.save?.();await Game.persistState?.();
 const end=$('#hs2dEnd');end.hidden=false;end.className='cb2d-end cb2d-results-screen';window.CellboundCombatViewer?.setResults?.(root(),true);end.innerHTML='<div><small>EXPEDITION FAILED</small><h3>No healer available after '+esc(s.title)+'.</h3><p>A fallen adventurer cannot be recovered without a healer. The expedition ends here and all five gain 25% Cell Shock.</p></div>'+hsFailureDiagnosis(result)+hsStageSummary(result)+'<button data-return>RETURN TO DUNGEON JOURNAL →</button>';end.querySelector('[data-return]').onclick=close
}
async function hsRecoverFallen(tok){
 let fallen=party().filter(c=>(Number(run.hp[c.id])||0)<=0);if(!fallen.length)return true;
 let healer=party().find(c=>role(c)==='healer'&&(Number(run.hp[c.id])||0)>0);
 if(!healer){
   healer=party().find(c=>role(c)==='healer');
   if(!healer){
     feed('No healer is present. Fallen adventurers cannot be revived.');setStatus('No healer · expedition cannot continue.');return false
   }
   feed(healer.name+' releases and returns from the previous checkpoint.');setStatus('Healer returning to the group…');await wait(550);if(tok!==token)return false;
   hsAdvanceCooldowns(15000);run.hp[healer.id]=35;run.reviveSickness[healer.id]=15000;const hid=hsRenderId('p-'+healer.id),hel=$('[data-hs="'+hid+'"]');hel?.classList.remove('dead');hsBar(hid,35);
   fallen=party().filter(c=>(Number(run.hp[c.id])||0)<=0);hsUpdateSidebar()
 }
 for(const member of fallen){
   if(member.id===healer.id)continue;
   const now=Number(run.expeditionTimeMs)||0,ready=Number(run.reviveReadyAt)||0;
   if(ready>now){feed('The party regroups while Revive recharges.');await wait(450);hsAdvanceCooldowns(ready-now)}
   setStatus(healer.name+' is reviving '+member.name+'…');feed(healer.name+' begins Revive on '+member.name+'.');await wait(700);if(tok!==token)return false;
   run.hp[member.id]=35;run.reviveSickness[member.id]=15000;const id=hsRenderId('p-'+member.id),el=$('[data-hs="'+id+'"]');el?.classList.remove('dead');hsBar(id,35);hsFloat(id,'REVIVED','heal');
   run.outOfCombatRevives=(Number(run.outOfCombatRevives)||0)+1;hsAdvanceCooldowns(4000);run.reviveReadyAt=run.expeditionTimeMs+45000;hsUpdateSidebar();feed(member.name+' is back on their feet.')
 }
 return true
}
async function fightStage(s,tok,index){
 // Threat belongs to the current encounter; damage/healing belong to the whole dungeon.
 run.threat=Object.fromEntries(party().map(ch=>[ch.id,0]));run.aggro=null;hsRenderMeters();
 await spawnStage(s);setStatus('Entering '+s.title+'…');feed('The party enters '+s.title+'.');await wait(650);if(tok!==token)return false;
 const C=window.CellboundCombatStandard;if(!C?.createLiveSession)throw new Error('Real-time Combat Reborn standard gateway unavailable');
 const combatParty=party().map((c,i)=>Object.assign({},c,{_combatHealthPct:run.hp[c.id],_combatResource:run.resources?.[c.id]||null,_combatItemLevel:Number(Game?.characterItemLevel?.(c))||Number(c.gear)||0,_combatCooldowns:run.cooldowns?.[c.id]||{},_combatStatuses:run.statuses?.[c.id]||[],_reviveSicknessMs:run.reviveSickness?.[c.id]||0,_combatPosition:hsPartyStagePosition(s,i)}));
 const tactics={...hsTactics,interruptPriority:hsTactics.bossPlan==='control'?'high':hsTactics.interruptPriority,addPriority:hsTactics.bossPlan==='burn'?'boss':hsTactics.addPriority,defensiveUsage:hsTactics.bossPlan==='control'?'aggressive':hsTactics.defensiveUsage,cooldownUse:hsTactics.bossPlan==='burn'?'free':hsTactics.cooldownUse},simOptions={party:combatParty,encounter:hsRebornEncounter(s),tactics,seed:[run.endgame?.seed||'hollow-sanctum',s.id,index].join(':')},simMeta={zone:'hollow-sanctum'};const session=C.createLiveSession(simOptions,simMeta),result=session.snapshot();
 run.liveCombat={session,issue:null,commands:[],seq:0,cooldownUntil:0,result};
 result.stageId=s.id;result.stageTitle=s.title;result.startHp={...run.hp};run.history.push(result);
 const won=await hsPlayTimeline(result,tok);hsResultHealth(result);
 (result?.finalState?.players||[]).forEach(p=>{
  const ch=party().find(x=>String(x.id)===String(p.characterId));if(!ch)return;
  if(p.resource)run.resources[ch.id]={name:p.resource.name,max:p.resource.max,value:p.resource.value};
  run.cooldowns[ch.id]=Object.fromEntries(Object.entries(p.cooldowns||{}).filter(([,v])=>Number(v)>0));
  run.statuses[ch.id]=hsPersistentStatuses(p,result.durationMs);
  run.reviveSickness[ch.id]=Math.max(0,(Number(p.revivePenaltyUntil)||0)-Number(result.durationMs||0))
 });
 run.expeditionTimeMs=(Number(run.expeditionTimeMs)||0)+Number(result.durationMs||0);
 if(!won){await hsFail(s,result);return false}
 if(!await hsRecoverFallen(tok)){if(tok===token&&run)await hsFailNoHealer(s,result);return false}
 party().forEach(c=>{if((run.hp[c.id]||0)>0)run.hp[c.id]=Math.min(100,(run.hp[c.id]||0)+6)});
 hsAdvanceCooldowns(5000);
 feed(s.title+' is clear.');setStatus('Path clear.');await wait(600);return true
}

function hsPartyRows(){
 return party().map(c=>'<div class="cb2d-party-row" data-hs-side-row="'+esc(c.id)+'"><i class="cb2d-dot '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+String(role(c)).toUpperCase()+' · '+esc(c.spec)+'</small><em class="cb2d-side-hp"><i data-hs-side-hp="'+esc(c.id)+'" style="width:'+(run?.hp?.[c.id]!=null?Number(run.hp[c.id]):100)+'%"></i></em></span><strong>'+(run?.hp?.[c.id]!=null?Number(run.hp[c.id]):100)+' HP</strong></div>').join('')
}
function hsUpdateSidebar(){
 party().forEach(c=>{
  const row=document.querySelector('[data-hs-side-row="'+CSS.escape(String(c.id))+'"]');if(!row)return;
  const hpv=Math.max(0,Math.min(100,Number(run?.hp?.[c.id])||0)),strong=row.querySelector('strong'),bar=row.querySelector('[data-hs-side-hp]');
  if(strong)strong.textContent=Math.round(hpv)+' HP';if(bar)bar.style.width=hpv+'%'
 })
}
function hsAct(r,text){const e=document.querySelector('[data-hs-act="'+r+'"] em');if(e)e.textContent=text}
function hsRenderMeters(){
 if(!run)return;
 const damageRoot=$('#hs2dDamageMeter'),healingRoot=$('#hs2dHealingMeter'),threatRoot=$('#hs2dThreatMeter'),chars=party();
 const elapsed=Math.max(1,(run.history||[]).reduce((n,h)=>n+(Number(h.durationMs)||0),0)/1000);

 const damageRows=chars.map(ch=>({ch,value:Number(run.damageDone?.[ch.id])||0})).sort((a,b)=>b.value-a.value);
 const maxDamage=Math.max(1,...damageRows.map(x=>x.value)),damageTotal=damageRows.reduce((n,x)=>n+x.value,0);
 const damageTotalEl=$('#hs2dDamageTotal');if(damageTotalEl)damageTotalEl.textContent=damageTotal.toLocaleString()+' total';
 if(damageRoot)damageRoot.innerHTML=damageRows.map(({ch,value},i)=>'<div class="cb2d-meter-row '+classKey(ch)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(ch.name)+'</b><span>'+Math.round(value).toLocaleString()+' · '+Math.round(value/elapsed)+' DPS</span></div><em><i style="width:'+(value/maxDamage*100)+'%"></i></em></div>').join('');

 const healingRows=chars.map(ch=>({ch,value:Number(run.healingDone?.[ch.id])||0,over:Number(run.overhealing?.[ch.id])||0})).sort((a,b)=>b.value-a.value);
 const maxHealing=Math.max(1,...healingRows.map(x=>x.value)),healingTotal=healingRows.reduce((n,x)=>n+x.value,0);
 const healingTotalEl=$('#hs2dHealingTotal');if(healingTotalEl)healingTotalEl.textContent=healingTotal.toLocaleString()+' total';
 if(healingRoot)healingRoot.innerHTML=healingRows.map(({ch,value,over},i)=>'<div class="cb2d-meter-row '+classKey(ch)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(ch.name)+'</b><span>'+Math.round(value).toLocaleString()+' · '+Math.round(value/elapsed)+' HPS · '+Math.round(over).toLocaleString()+' overheal</span></div><em><i style="width:'+(value/maxHealing*100)+'%"></i></em></div>').join('');

 const threatMap=run.threat||{},threatRows=chars.map(ch=>({ch,value:Number(threatMap[ch.id])||0})).sort((a,b)=>b.value-a.value),maxThreat=Math.max(1,...threatRows.map(x=>x.value));
 const target=$('#hs2dThreatTarget');if(target)target.textContent=run.aggro?(chars.find(ch=>String(ch.id)===String(run.aggro))?.name||'Party target'):'No target';
 if(threatRoot)threatRoot.innerHTML=threatRows.some(x=>x.value>0)?threatRows.map(({ch,value},i)=>'<div class="cb2d-meter-row '+classKey(ch)+(String(ch.id)===String(run.aggro)?' aggro':'')+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(ch.name)+(String(ch.id)===String(run.aggro)?' <strong>AGGRO</strong>':'')+'</b><span>'+Math.round(value).toLocaleString()+' · '+Math.round(value/maxThreat*100)+'%</span></div><em><i style="width:'+(value/maxThreat*100)+'%"></i></em></div>').join(''):'<div class="cb2d-meter-empty">Threat appears when combat begins.</div>'
}
function hsCastStart(name,duration){
 const panel=$('#hs2dCastPanel'),label=$('#hs2dCastName'),time=$('#hs2dCastTime'),fill=$('#hs2dCastFill');if(panel)panel.hidden=false;if(label)label.textContent=name||'Enemy cast';if(time)time.textContent=((Number(duration)||0)/1000).toFixed(1)+'s';if(fill){fill.style.transition='none';fill.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!fill.isConnected)return;fill.style.transition='width '+Math.max(.1,(Number(duration)||500)/1000/(run?.speed||1))+'s linear';fill.style.width='100%'}))}
}
function hsCastClear(){const panel=$('#hs2dCastPanel'),label=$('#hs2dCastName'),time=$('#hs2dCastTime'),fill=$('#hs2dCastFill');if(panel)panel.hidden=false;if(label)label.textContent='—';if(time)time.textContent='—';if(fill){fill.style.transition='none';fill.style.width='0%'}}
function hsCommandMessage(kind){
 return kind==='focus'?'Focus priority target':kind==='interrupt'?'Interrupt now':kind==='defensive'?'Defensive stance':kind==='spread'?'Spread out':kind==='burn'?'Burn boss':'Party command'
}
function hsOverride(kind,button){
 if(!run)return;if(button){button.classList.add('active');setTimeout(()=>button.classList.remove('active'),450)}
 if(kind==='consumable'){
   const helper=window.CellboundDungeon2D,used=helper?.useCombatPotion?.({state:state(),members:party(),getHp:c=>Number(run.hp[c.id])||0,setHp:(c,v)=>{run.hp[c.id]=v}});
   if(!used?.ok){feed(used?.reason==='full'?'The party is already at full health.':'No combat potions remain. Craft or buy one before the next run.');helper?.refreshCombatPotionButton?.(button,state());return}
   const liveHeal=run.liveCombat?.session?.heal?.(used.target.id,used.healApplied,{ability:used.item.name,source:'commander'});if(liveHeal?.ok&&Number.isFinite(Number(liveHeal.targetHpPct)))run.hp[used.target.id]=Math.round(Number(liveHeal.targetHpPct));hsUpdateSidebar();helper?.refreshCombatPotionButton?.(button,state());feed(used.item.name+' restores '+used.target.name+' for '+used.healApplied+' HP.');return
 }
 const response=run.liveCombat?.issue?.(kind,{});
 if(!response?.ok){
   feed(response?.reason==='cooldown'?'Commander call recovering — choose your next moment.':'That command is not available right now.');
   return
 }
 window.CellboundDungeon2D?.refreshExternalCommandCooldowns?.(run.liveCombat?.session,'[data-hs-override]:not([data-hs-override="consumable"])','hsOverride');
 if(kind==='focus')hsAct('dps','Focusing priority target');
 if(kind==='interrupt')hsAct('dps','Interrupt command issued');
 if(kind==='defensive')hsAct('tank','Party defensives committed');
 if(kind==='spread')hsAct('dps','Party spreading from danger');
 if(kind==='burn')hsAct('dps','Damage cooldowns committed');
 feed('Commander: '+hsCommandMessage(kind)+'.')
}
function hsLootRarityClass(item){return 'rarity-'+String(item?.rarity||'common').toLowerCase().replace(/[^a-z0-9-]/g,'')}
function hsLootGearCard(item,label='DUNGEON DROP'){
 const art=G?.artHTML?G.artHTML(item,72):(item?.icon||'◇'),stats=G?.statLines?.(item)||[],set=item?.setName?'<div class="cb2d-loot-set"><b>'+esc(item.setName)+'</b>'+(G?.setBonusLines?.(item)||[]).map(x=>'<span>'+x.threshold+'pc · '+esc(x.short)+'</span>').join('')+'</div>':'',effect=item?.uniqueEffect?'<strong class="cb2d-loot-unique">'+esc(item.uniqueEffect.name)+' · '+esc(item.uniqueEffect.description)+'</strong>':'';
 return '<article class="cb2d-loot-item '+hsLootRarityClass(item)+'"><div class="cb2d-loot-art">'+art+'</div><div><small>'+esc(String(item?.rarity||label).toUpperCase())+' · '+esc(item?.slot||'ITEM')+'</small><h4>'+esc(item?.name||'Unknown Item')+'</h4><p>Item Level '+(Number(item?.itemLevel)||0)+(item?.power?' · +'+Number(item.power)+' Power':'')+'</p><div class="cb2d-loot-roll">'+stats.map(s=>'<span>'+esc(s.text)+'</span>').join('')+'</div>'+set+effect+'<em>Sent to Guild Bank</em></div></article>'
}
function hsLootMaterialCard(m){
 const art=P?.materialArtHTML?P.materialArtHTML(m.key,44,'cb2d-material-art'):'◇';
 return '<article class="cb2d-loot-material"><strong class="cb2d-loot-material-art">'+art+'</strong><div><small>'+esc(String(m.rarity||'MATERIAL').toUpperCase())+'</small><h4>'+esc(m.name)+'</h4><p>'+esc(m.source||'The Hollow Sanctum')+'</p></div><b>×'+Number(m.quantity||0)+'</b></article>'
}
function hsXpCard(x){
 const ch=party().find(c=>c.name===x.name),portrait=ch?.portrait||String(x.name||'?').slice(0,2).toUpperCase(),start=Math.max(0,Math.min(100,x.beforeXp/Math.max(1,x.beforeNeed)*100)),end=Math.max(0,Math.min(100,x.afterXp/Math.max(1,x.afterNeed)*100));
 return '<article class="cb2d-xp-card" data-hs-xp data-start="'+start.toFixed(2)+'" data-end="'+end.toFixed(2)+'" data-levels="'+Number(x.levels||0)+'"><div class="cb2d-xp-avatar">'+esc(portrait)+'</div><div class="cb2d-xp-copy"><div><span><b>'+esc(x.name)+'</b><small>Level '+x.beforeLevel+(x.afterLevel!==x.beforeLevel?' → '+x.afterLevel:'')+'</small></span>'+(x.capped?'<em class="cb2d-level-up">MAX LEVEL</em>':x.levels?'<em class="cb2d-level-up">LEVEL UP</em>':'<em>+'+(run?.xpReward||XP)+' XP</em>')+'</div><div class="cb2d-xp-bar"><i style="width:'+start.toFixed(2)+'%"></i></div><p><span>'+x.beforeXp+' / '+x.beforeNeed+' XP</span><strong>+'+(run?.xpReward||XP)+' XP</strong><span>'+x.afterXp+' / '+x.afterNeed+' XP</span></p></div></article>'
}
function hsAnimateXp(rootEl){
 [...(rootEl?.querySelectorAll('[data-hs-xp]')||[])].forEach((row,index)=>{const bar=row.querySelector('.cb2d-xp-bar i'),end=Number(row.dataset.end)||0,levels=Number(row.dataset.levels)||0;if(!bar)return;setTimeout(()=>{if(!levels){bar.style.width=end+'%';return}bar.style.width='100%';setTimeout(()=>{row.classList.add('levelled');bar.style.transition='none';bar.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!bar.isConnected)return;bar.style.transition='width .8s cubic-bezier(.2,.75,.25,1)';bar.style.width=end+'%'}))},760)},220+index*90)})
}

function draw(){
 const stage=STAGES[run.stage],r=root(),Viewer=window.CellboundCombatViewer;if(!Viewer?.mount)throw new Error('Canonical combat viewer unavailable');
 const routeMarkup=STAGES.map((x,i)=>'<span class="'+(i<run.stage?'done':i===run.stage?'current':'')+'"><i>'+(i+1)+'</i>'+esc(x.title)+'</span>').join('');
 const arenaMarkup='<div class="cb2d-arena hs2d-arena hs2d-unified-arena" id="hs2dArena"><div class="cb2d-floor hs2d-floor"></div><div class="hs2d-environment" id="hs2dEnvironment"></div><div id="hs2dTelegraphs"></div><div id="hs2dUnits"></div><div id="hs2dFx"></div><div class="cb2d-caption hs2d-caption"><span id="hs2dType">'+esc(stage.kind)+'</span><b id="hs2dStatus">Descending…</b></div></div>';
 const topbar='<div class="cbcombat-battle-topbar"><div class="hs2d-room cb2d-room-tag" id="hs2dRoom"></div><div class="cb2d-ground-legend"><span class="danger">RED · MOVE / AVOID</span><span class="spawn">AMBER · SPAWN / PRIORITY</span><span class="aggro">GOLD LINK · AGGRO</span></div></div>';
 const cast='<div class="cb2d-cast" id="hs2dCastPanel"><small>ENEMY CAST</small><div><b id="hs2dCastName">—</b><strong id="hs2dCastTime">—</strong></div><div class="cb2d-castbar"><i id="hs2dCastFill"></i></div></div>';
 const meters='<div class="cb2d-combat-meters"><section class="cb2d-meter-panel damage"><div class="cb2d-meter-head"><small>DAMAGE METER</small><span id="hs2dDamageTotal">0 total</span></div><div id="hs2dDamageMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel healing"><div class="cb2d-meter-head"><small>HEALING METER</small><span id="hs2dHealingTotal">0 total</span></div><div id="hs2dHealingMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel threat"><div class="cb2d-meter-head"><small>THREAT METER</small><span id="hs2dThreatTarget">No target</span></div><div id="hs2dThreatMeter" class="cb2d-meter-list"></div></section></div>';
 const commands='<button data-hs-override="focus"><b>FOCUS TARGET</b><small>Force priority damage.</small></button><button data-hs-override="interrupt"><b>INTERRUPT NOW</b><small>Stop the current cast.</small></button><button data-hs-override="spread"><b>SPREAD OUT</b><small>Move clear of danger.</small></button><button data-hs-override="stack"><b>STACK</b><small>Collapse around the tank.</small></button><button data-hs-override="regroup"><b>REGROUP</b><small>Reset combat formation.</small></button><button data-hs-override="defensive"><b>DEFENSIVE</b><small>Stabilise the group.</small></button><button data-hs-override="burn"><b>BURN BOSS</b><small>Commit damage cooldowns.</small></button><button data-hs-override="consumable"><b>USE CONSUMABLE</b><small>Use available stock.</small></button>';
 Viewer.mount(r,{
  header:'THE HOLLOW SANCTUM · LIVE DUNGEON',title:stage.title,routeMarkup,
  partyLabel:'PARTY CONDITION · ILVL '+ilvl(),partyMarkup:hsPartyRows(),partyRowsId:'hs2dRows',
  battleTopbarMarkup:topbar,arenaMarkup,castMarkup:cast,metersMarkup:meters,commandsMarkup:commands,
  theme:'hollow',battleClass:'hs2d-unified-shell',partySize:party().length,speedAttribute:'data-speed',closeAttribute:'data-close',
  titleId:'hs2dTitle',routeId:'hs2dRoute',endId:'hs2dEnd'
 });
 r.querySelector('[data-close]').onclick=()=>{if(run&&!run.done&&!confirm('Leave The Hollow Sanctum?'))return;close()};
 r.querySelector('[data-speed]').onclick=e=>{run.speed=run.speed===2?1:2;e.currentTarget.textContent=run.speed+'×'};
 r.querySelectorAll('[data-hs-override]').forEach(b=>b.onclick=()=>hsOverride(b.dataset.hsOverride,b));
 window.CellboundDungeon2D?.refreshCombatPotionButton?.(r.querySelector('[data-hs-override="consumable"]'),state());
 stageEnvironment(stage);hsRenderMeters();hsUpdateSidebar();feed('The party enters The Hollow Sanctum.')
}
function hsRunMetrics(){
 const totals=run.history.reduce((o,r)=>{const s=r.summary||{};o.combat+=Number(r.durationMs)||0;o.deaths+=Number(s.deaths)||0;o.failed+=Number(s.mechanics?.failed)||0;o.mistakes+=Number(s.mistakes?.total)||0;o.missedInterrupts+=Number(s.interrupts?.missedCritical)||0;o.battleResurrections+=Number(s.battleResurrections)||0;(s.players||[]).forEach(p=>{o.threatLosses+=Number(p.threatLost)||0;o.avoidableDamage+=Number(p.avoidableDamage)||0});return o},{combat:0,deaths:0,failed:0,mistakes:0,missedInterrupts:0,threatLosses:0,avoidableDamage:0,battleResurrections:0});
 const pace=hsTactics.pullStyle==='aggressive'?.82:hsTactics.pullStyle==='safe'?1.20:1,timeMs=Math.max(35000,totals.combat*4+Math.round(STAGES.length*60000*pace));
 return{timeMs,deaths:totals.deaths,mechanicsFailed:totals.failed,mistakes:totals.mistakes,missedInterrupts:totals.missedInterrupts,threatLosses:totals.threatLosses,avoidableDamage:totals.avoidableDamage,battleResurrections:totals.battleResurrections,scorePreview:window.CellboundEndgameData?.scorePreview?.({difficulty:run.endgame?.difficulty||'normal',tier:run.endgame?.tier||0,timeMs,targetTimeMs:run.endgame?.targetTimeMs||0,deaths:totals.deaths,mechanicsFailed:totals.failed,mistakes:totals.mistakes})||0}
}
function hsFormatTime(ms){const t=Math.max(0,Math.round((Number(ms)||0)/1000)),m=Math.floor(t/60),s=t%60;return m+':'+String(s).padStart(2,'0')}
function hsRuntimeRun(){
 if(!run)return null;
 return{
  stage:Number(run.stage)||0,done:Boolean(run.done),speed:Number(run.speed)||1,log:(run.log||[]).slice(-30),
  damageDone:{...(run.damageDone||{})},healingDone:{...(run.healingDone||{})},overhealing:{...(run.overhealing||{})},
  threat:{...(run.threat||{})},aggro:run.aggro||null,endgame:{...(run.endgame||{})},hp:{...(run.hp||{})},
  resources:JSON.parse(JSON.stringify(run.resources||{})),cooldowns:JSON.parse(JSON.stringify(run.cooldowns||{})),
  statuses:JSON.parse(JSON.stringify(run.statuses||{})),reviveSickness:{...(run.reviveSickness||{})},
  expeditionTimeMs:Number(run.expeditionTimeMs)||0,reviveReadyAt:Number(run.reviveReadyAt)||0,
  outOfCombatRevives:Number(run.outOfCombatRevives)||0,
  history:(run.history||[]).map(h=>({stageId:h.stageId,stageTitle:h.stageTitle,startHp:h.startHp,durationMs:h.durationMs,summary:h.summary,outcome:h.outcome}))
 }
}
async function hsSaveRuntime(phase='stage'){
 if(!run?.endgame?.attemptId)return;
 await window.CellboundEndgame?.saveRuntime?.('hollow-sanctum',{
  version:1,kind:'hollow-sanctum',phase,stage:Number(run.stage)||0,
  stageStartedAt:Number(run.runtimeStageStartedAt)||0,tactics:{...hsTactics},run:hsRuntimeRun()
 })
}
function hsRestoreRuntime(attempt){
 const snap=attempt?.runtimeState||{},saved=snap.run||{};
 Object.assign(hsTactics,snap.tactics||{});
 run={...saved,telegraphs:{},runtimeStageStartedAt:Number(snap.stageStartedAt)||Date.now(),_restored:true};
 run.endgame={...(saved.endgame||{}),attemptId:attempt.attemptId,seed:attempt.seed,difficulty:attempt.difficulty,tier:Number(attempt.tier)||0,targetTimeMs:Number(attempt.targetTimeMs)||Number(saved.endgame?.targetTimeMs)||0,dungeonVersion:Number(attempt.dungeonVersion)||Number(saved.endgame?.dungeonVersion)||2};
 return run
}
async function hsTravelDeeper(currentStage,nextStage,tok){
 if(tok!==token||!run)return;
 const arena=$('#hs2dArena'),room=HOLLOW_ROOMS[currentStage?.id]||HOLLOW_ROOMS.gallery,route=room.route||{},path=Array.isArray(route.exitPath)?route.exitPath:[],chars=party(),spread=Number(route.spread)||2;
 if(!path.length)return;
 arena?.classList.add('travelling');setStatus('Path clear · moving deeper into the Sanctum');
 feed('The party advances toward '+nextStage.title+'.');
 const positions=Object.fromEntries(chars.map(c=>{const e=$('[data-hs="p-'+c.id+'"]');return[c.id,{x:Number.parseFloat(e?.style.left)||50,y:Number.parseFloat(e?.style.top)||50}]}));
 const centroid=chars.reduce((a,c)=>{a.x+=positions[c.id].x;a.y+=positions[c.id].y;return a},{x:0,y:0});centroid.x/=Math.max(1,chars.length);centroid.y/=Math.max(1,chars.length);
 let startIndex=0,best=Infinity;path.forEach((p,i)=>{const d=Math.hypot(Number(p.x)-centroid.x,Number(p.y)-centroid.y);if(d<best){best=d;startIndex=i}});if(startIndex>0&&best>18)startIndex=0;
 const active=path.slice(startIndex);
 for(let step=0;step<active.length;step++){
  const point=active[step],from=step===0?centroid:active[step-1],to=active[Math.min(step+1,active.length-1)]||point,finalStep=step===active.length-1,duration=finalStep?560:390;
  if(finalStep)hsSetFade(true,duration+100);
  chars.forEach((ch,i)=>{if((Number(run.hp[ch.id])||0)<=0)return;const p=hsRouteOffset(point,from,to,i,spread);move('p-'+ch.id,p.x,p.y,duration)});
  await wait(duration+35);if(tok!==token||!run)return
 }
 run.roomTransitionBlack=true;arena?.classList.remove('travelling')
}
async function hsRunFrom(startIndex,tok){
 for(let i=Math.max(0,Number(startIndex)||0);i<STAGES.length;i++){
  if(tok!==token||!run)return;
  const resuming=Boolean(run._restored)&&i===Math.max(0,Number(startIndex)||0);
  run.stage=i;
  if(!resuming||!run.runtimeStageStartedAt)run.runtimeStageStartedAt=Date.now();
  run._restored=false;
  await hsSaveRuntime('stage');
  const s=STAGES[i];
  if(s.combatKind==='final')await window.CellboundBossDossier?.show?.('bound-choir');
  if(/boss/i.test(String(s.kind||s.combatKind||'')))window.CellboundFX?.boss?.(s.title);
  $('#hs2dTitle').textContent=s.title;const type=$('#hs2dType');if(type)type.textContent=s.kind;
  $('#hs2dRoute').innerHTML=STAGES.map((x,j)=>'<span class="'+(j<i?'done':j===i?'current':'')+'"><i>'+(j+1)+'</i>'+esc(x.title)+'</span>').join('');
  if(!await fightStage(s,tok,i)){await hsSaveRuntime('failed');return}
  if(['boss','final'].includes(s.combatKind)){
    const expired=window.CellboundProfessions?.consumeBossChargesOnce?.(party(),'hollow-sanctum:'+run.endgame?.attemptId+':'+s.id,state())||[];
    expired.forEach(x=>feed(x+' expired.'));Game.save?.();await Game.persistState?.()
  }
  if(i<STAGES.length-1)await hsTravelDeeper(s,STAGES[i+1],tok);
  run.stage=i+1;run.runtimeStageStartedAt=0;await hsSaveRuntime('between')
 }
 if(tok!==token||!run)return;
 await complete()
}

async function start(){
 const gate=readiness();if(!gate.ok){briefing();return}
 const startButton=root().querySelector('[data-start]');if(startButton){startButton.disabled=true;startButton.textContent='ENTERING…'}
 await Game.persistState?.();
 const service=await hsWaitForEndgame(),eg=hsEndgameConfig(),attempt=await service?.beginOrResumeAttempt?.('hollow-sanctum')||await service?.beginAttempt?.('hollow-sanctum');
 if(!attempt||attempt.error){if(startButton){startButton.disabled=false;startButton.textContent='BEGIN EXPEDITION →'}alert(attempt?.error?.message||'Dungeon service is still loading. Try Begin Descent again.');return}
 token++;const tok=token,p=party();
 if(attempt.resumed&&attempt.runtimeState?.kind==='hollow-sanctum'){
  hsRestoreRuntime(attempt)
 }else{
  run={stage:0,done:false,speed:1,log:[],damageDone:Object.fromEntries(p.map(ch=>[ch.id,0])),healingDone:Object.fromEntries(p.map(ch=>[ch.id,0])),overhealing:Object.fromEntries(p.map(ch=>[ch.id,0])),threat:Object.fromEntries(p.map(ch=>[ch.id,0])),aggro:null,endgame:{difficulty:eg.difficulty,tier:eg.tier||0,label:eg.diff?.name||'Normal',targetTimeMs:Number(attempt.targetTimeMs)||eg.targetTimeMs,recommendedItemLevel:eg.recommendedItemLevel,dungeonVersion:eg.dungeon?.version||2,affixes:[...(eg.affixes||[])],attemptId:attempt.attemptId,seed:attempt.seed},hp:Object.fromEntries(p.map(c=>[c.id,100])),resources:Object.fromEntries(p.map(c=>{const d=hsResourceDef(c);return[c.id,{name:d.name,max:d.max,value:d.start}]})),cooldowns:Object.fromEntries(p.map(c=>[c.id,{}])),statuses:Object.fromEntries(p.map(c=>[c.id,[]])),reviveSickness:Object.fromEntries(p.map(c=>[c.id,0])),expeditionTimeMs:0,reviveReadyAt:0,outOfCombatRevives:0,history:[],telegraphs:{},runtimeStageStartedAt:Date.now()}
 }
 try{
  window.CellboundExpeditionPresentation?.leave?.();
  document.querySelectorAll('.cbx-transition').forEach(node=>node.remove());
  document.body.classList.remove('cbx-transition-open')
 }catch(error){console.warn('Hollow entry transition cleanup skipped',error)}
 draw();
 try{
  await hsRunFrom(Math.min(STAGES.length-1,Number(run.stage)||0),tok)
 }catch(error){
  console.error('Hollow Sanctum combat start failed',error);
  setStatus('Combat failed to start · '+(error?.message||'unknown error'));
  feed('Combat could not initialise. '+(error?.message||'Unknown combat error.'));
  throw error
 }
}
async function complete(){
 const s=state(),q=qstate(),first=!q.flags.hollowFirstClear,metrics=hsRunMetrics();run.endgameMetrics=metrics;const record=await window.CellboundEndgame?.recordRun?.('hollow-sanctum',metrics);run.endgameRecord=record&&!record.error?record:null;const mode=run.endgame?.difficulty||'normal';run.xpReward=BAL?.dungeonXp?.('hollow-sanctum',{difficulty:mode,firstClear:first})||(first&&mode==='normal'?4350:XP);const gains=awardXp(),tier=Number(run.endgame?.tier)||0,gearDrops=window.CellboundEndgame?.rollClearLootBundle?.('hollow-sanctum','choir')||[window.CellboundEndgame?.rollClearLoot?.('hollow-sanctum','choir',1)].filter(Boolean),gold=mode==='normal'?220:mode==='heroic'?300:340+tier*12,renown=mode==='normal'?100:mode==='heroic'?135:150+tier*5;s.gold=(Number(s.gold)||0)+gold;s.renown=(Number(s.renown)||0)+renown;const shards=window.CellboundEndgame?.shardReward?.('hollow-sanctum')||0;if(shards)Game.addMaterial?.('cell-shards',shards);const chase=window.CellboundEndgame?.rollChase?.('hollow-sanctum');if(chase)s.activity.push('Very rare collection reward: '+chase.name+'.');Game.addMaterial?.('void-crystal',first?2:1);const professionDrops=window.CellboundProfessions?.rollContentReagents?.('hollow-sanctum',{difficulty:mode,tier})||[];professionDrops.forEach(d=>Game.addMaterial?.(d.key,d.quantity));q.flags.hollowFirstClear=true;q.hollowCompletions=(Number(q.hollowCompletions)||0)+1;
 gearDrops.forEach(item=>Game.addBankItem?.(item));
 if(first)Game.addBankItem?.({...RELIC,source:'The Bound Choir · First Clear'});
 s.activity.push('The Hollow Sanctum · '+(run.endgame?.label||'Normal')+' cleared. Score '+Number(run.endgameRecord?.score||metrics.scorePreview).toLocaleString()+'. Each adventurer earned '+(run?.xpReward||XP)+' XP.'+(gearDrops.length?' '+gearDrops.length+' equipment drops were sent to the Guild Bank.':'')+(first?' Blackglass Resonator added to the Guild Bank.':'')+(professionDrops.length?' Profession materials: '+window.CellboundProfessions?.formatReagentDrops?.(professionDrops)+'.':''));
 Game.save?.();await Game.persistState?.();await syncXp(gains);run.done=true;window.dispatchEvent(new CustomEvent('cellbound:hollow-complete',{detail:{firstClear:first,difficulty:mode,tier,score:run.endgameRecord?.score||metrics.scorePreview,timeMs:metrics.timeMs}}));window.dispatchEvent(new CustomEvent('cellbound:dungeon-complete',{detail:{id:'hollow-sanctum',difficulty:mode,tier,score:run.endgameRecord?.score||metrics.scorePreview,timeMs:metrics.timeMs}}));
 const end=$('#hs2dEnd');end.hidden=false;end.className='cb2d-end cb2d-loot-screen cb2d-results-screen';window.CellboundCombatViewer?.setResults?.(root(),true);
 const lootGear=[...gearDrops,...(first?[RELIC]:[])].filter(Boolean),materials=[
   {key:'void-crystal',name:'Void Crystal',quantity:first?2:1,source:'The Hollow Sanctum',rarity:'Rare'},
   ...(shards?[{key:'cell-shards',name:'Cell Shards',quantity:shards,source:'Dungeon Clear',rarity:'Rare'}]:[]),
   ...professionDrops.map(d=>({key:d.key,name:window.CellboundProfessions?.MATERIALS?.[d.key]?.name||d.key,quantity:d.quantity,source:'Hollow Sanctum salvage',rarity:window.CellboundProfessions?.MATERIALS?.[d.key]?.rarity||'Common'}))
 ];
 end.innerHTML='<div class="cb2d-loot-wrap">'+
 '<header class="cb2d-loot-head"><div><small>THE HOLLOW SANCTUM · '+esc(run.endgame?.label||'NORMAL').toUpperCase()+' · CLEARED</small><h3>Expedition Rewards</h3><p>The Bound Choir has fallen. Everything below has already been secured to your guild.</p></div><div class="cb2d-loot-complete">✓<span>DUNGEON<br>COMPLETE</span></div></header>'+
 '<div class="cb2d-loot-currency"><article><span>GOLD</span><b>+'+gold+'</b><small>Added to Guild treasury</small></article><article><span>RENOWN</span><b>+'+renown+'</b><small>Guild reputation earned</small></article><article><span>PARTY XP</span><b>+'+(run?.xpReward||XP)+'</b><small>Earned by each adventurer</small></article><article><span>BOSS CHESTS</span><b>'+lootGear.length+'</b><small>Gear drops secured</small></article><article><span>RUN SCORE</span><b>'+Number(run.endgameRecord?.score||metrics.scorePreview).toLocaleString()+'</b><small>'+hsFormatTime(metrics.timeMs)+' run time</small></article></div>'+
 hsProgressEarned()+
 '<section class="cb2d-loot-section cb2d-xp-section"><div class="cb2d-loot-title"><span>PARTY EXPERIENCE</span><small>Active party XP</small></div><div class="cb2d-xp-grid">'+gains.map(hsXpCard).join('')+'</div></section>'+
 '<section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>GEAR ACQUIRED</span><small>Sent to Guild Bank</small></div><div class="cb2d-loot-gear">'+(lootGear.length?lootGear.map((item,i)=>hsLootGearCard(item,i===1?'FIRST-CLEAR RELIC':'DUNGEON DROP')).join(''):'<div class="cb2d-loot-empty">No gear dropped.</div>')+'</div></section>'+
 '<section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>PROFESSION REAGENTS</span><small>Available immediately for crafting</small></div><div class="cb2d-loot-materials">'+materials.map(hsLootMaterialCard).join('')+'</div></section>'+
 hsCombatAnalysisHTML()+
 '<footer class="cb2d-loot-actions"><button data-loot-bank>VIEW GUILD BANK</button><button class="primary" data-loot-return>RETURN HOME →</button></footer></div>';
 window.CellboundDungeonResults?.compact?.(end);hsAnimateXp(end);
 end.querySelector('[data-hs-replay]')?.addEventListener('click',hsReplayFinalFight);
 end.querySelector('[data-loot-bank]').onclick=()=>{close();Game.switchView?.('bank')};
 end.querySelector('[data-loot-return]').onclick=()=>{close();Game.switchView?.('overview')}
}
function init(){Game=window.CellboundGame;G=window.CellboundGear;P=window.CellboundProfessions;if(!Game?.ready){setTimeout(init,100);return}db=Game.getSupabase?.();renderCard();document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',renderCard);window.CellboundHollowSanctum={open:openDungeon,renderCard,relic:RELIC}}
init();
})();