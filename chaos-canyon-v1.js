(()=>{
'use strict';
const BAL=window.CellboundBalance;
window.CellboundCombatStandard?.register?.('chaos-canyon',{kind:'dungeon',execution:'local',ui:'shared-cb2d'});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,G=null,P=null,run=null,token=0,requestedRunOptions=null;
let ccTactics={strategyPreset:'balanced',pullStyle:'normal',cooldownUse:'difficult',interruptPriority:'standard',interruptAssignment:'dps-rotation',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'immediate',movementDiscipline:'balanced',bossPlan:'balanced'};
const STAGES=[
 {id:'canyon-mouth',title:'Canyon Mouth',kind:'TRASH',combatKind:'trash',level:9,enemyTypes:['elite','trash','trash'],enemyHealth:185,enemies:['Canyon Mauler','Chaos Thorncaster','Stoneback Beast'],mechanics:[['Thorn Volley','circles',1500],['Mauler Rush','line',1350]]},
 {id:'thorn-trail',title:'Thorn Trail',kind:'TRASH',combatKind:'trash',level:9,enemyTypes:['trash','elite','trash'],enemyHealth:205,enemies:['Rootbound Prowler','Chaos Thorncaster','Stoneback Beast'],mechanics:[['Entangling Roots','circles',1450],['Stoneback Charge','line',1400]]},
 {id:'sentinel',title:'The Canyon Sentinel',kind:'MINI-BOSS',combatKind:'boss',level:10,enemyTypes:['boss'],enemyHealth:920,enemies:['The Canyon Sentinel'],mechanics:[['Stonebreaker Slam','cone',1850],['Fracture','circles',1650],['Root Bind','line',1500]]},
 {id:'warden',title:'The Chaos Warden',kind:'BOSS',combatKind:'boss',level:10,enemyTypes:['boss'],enemyHealth:1180,enemies:['The Chaos Warden'],mechanics:[['Canyon Crush','cone',1750],['Wild Barrage','circles',1450],['Savage Leap','circle',1500],['Chaos Pulse','circles',1350]]},
 {id:'wildheart',title:'Wildheart Passage',kind:'TRASH',combatKind:'trash',level:10,enemyTypes:['elite','trash','trash'],enemyHealth:225,enemies:['Chaos Shapeshifter','Canyon Keeper','Living Boulder'],mechanics:[['Wild Mend','interrupt',1900],['Boulder Rush','line',1350],['Thorn Eruption','circles',1450]]},
 {id:'vorran',title:'Archdruid Vorran',kind:'FINAL BOSS',combatKind:'final',level:11,enemyTypes:['boss'],enemyHealth:1900,enemies:['Archdruid Vorran'],mechanics:[{name:'Rejuvenation',type:'self-heal',duration:1900,healPct:.09}],phases:[
  {id:'vorran-close-one',name:'The Canyon Closes',atPct:75,damageScale:1.04,arenaBounds:{left:20,right:80,top:15,bottom:85},arena:{shape:'ellipse',cx:50,cy:50,rx:30,ry:35}},
  {id:'vorran-close-two',name:'Roots Close In',atPct:50,damageScale:1.08,arenaBounds:{left:28,right:72,top:22,bottom:78},arena:{shape:'ellipse',cx:50,cy:50,rx:22,ry:28}},
  {id:'vorran-unbound',name:'True Chaos',atPct:25,damageScale:1.18,allAttacksAoe:true,arenaBounds:{left:36,right:64,top:31,bottom:69},arena:{shape:'ellipse',cx:50,cy:50,rx:14,ry:19},addMechanics:[{name:'Wild Wrath: Unbound',type:'circles',duration:1200}]}
 ]}
];
const ROUTE=[
 {id:'canyon-mouth',title:'Canyon Mouth'},{id:'thorn-trail',title:'Thorn Trail'},{id:'sentinel',title:'Canyon Sentinel'},
 {id:'crossing',title:'Chaos Crossing',puzzle:true},{id:'warden',title:'Chaos Warden'},{id:'wildheart',title:'Wildheart Passage'},{id:'vorran',title:'Archdruid Vorran'}
];
const CANYON_ROOMS={
 'canyon-mouth':{
  zone:'CANYON ENTRANCE',description:'Sunlight cuts through the woodland canyon as corrupted wildlife blocks the old druid road.',
  art:'./assets/chaos-canyon/rooms/canyon-mouth.webp?v=1',liveProfile:'canyon-mouth',
  route:{entry:{x:50,y:98},entryInside:{x:50,y:84},partyAnchors:[[50,67],[44,71],[56,71],[41,77],[59,77]],exitPath:[{x:50,y:53},{x:50,y:34},{x:50,y:17},{x:50,y:3}],spread:2.1},
  enemies:[[50,36],[41,44],[59,44]],
  bounds:{left:10,right:90,top:10,bottom:90},walkable:[[25,12],[75,12],[89,28],[91,70],[76,88],[24,88],[9,70],[11,28]],
  blockers:[{id:'mouth-left-stone',x:15,y:37,w:8,h:26},{id:'mouth-right-stone',x:85,y:37,w:8,h:26}]
 },
 'thorn-trail':{
  zone:'THORN TRAIL',description:'Ancient roots and thorn-vines squeeze the canyon road into a living kill lane.',
  art:'./assets/chaos-canyon/rooms/thorn-trail.webp?v=1',liveProfile:'canyon-thorn',
  route:{entry:{x:50,y:98},entryInside:{x:50,y:84},partyAnchors:[[50,67],[45,71],[55,71],[42,77],[58,77]],exitPath:[{x:50,y:53},{x:50,y:34},{x:50,y:17},{x:50,y:3}],spread:1.9},
  enemies:[[50,36],[42,44],[58,44]],
  bounds:{left:15,right:85,top:9,bottom:91},walkable:[[35,10],[65,10],[78,26],[82,69],[69,89],[31,89],[18,69],[22,26]],
  blockers:[{id:'trail-thorns-left',x:20,y:43,w:8,h:38,blocksLos:false},{id:'trail-thorns-right',x:80,y:43,w:8,h:38,blocksLos:false}]
 },
 sentinel:{
  zone:'SENTINEL BASIN',description:'A druidic guardian waits on an old runestone court suspended above waterfalls and mist.',
  art:'./assets/chaos-canyon/rooms/sentinel.webp?v=1',liveProfile:'canyon-sentinel',
  route:{entry:{x:50,y:98},entryInside:{x:50,y:83},partyAnchors:[[50,68],[44,72],[56,72],[41,78],[59,78]],exitPath:[{x:50,y:54},{x:50,y:35},{x:50,y:18},{x:50,y:3}],spread:2.0},
  enemies:[[50,40]],
  bounds:{left:10,right:90,top:9,bottom:91},arena:{shape:'ellipse',cx:50,cy:52,rx:39,ry:37},
  blockers:[{id:'sentinel-left-pillar',x:15,y:34,w:7,h:24},{id:'sentinel-right-pillar',x:85,y:34,w:7,h:24}]
 },
 warden:{
  zone:"WARDEN'S SHELF",description:'The crossing ends on a broad woodland shelf where the Chaos Warden controls the canyon path.',
  art:'./assets/chaos-canyon/rooms/warden.webp?v=1',liveProfile:'canyon-warden',
  route:{entry:{x:50,y:98},entryInside:{x:50,y:83},partyAnchors:[[50,67],[44,71],[56,71],[41,77],[59,77]],exitPath:[{x:42,y:52},{x:31,y:35},{x:20,y:19},{x:9,y:4}],spread:2.0},
  enemies:[[58,42]],
  bounds:{left:8,right:92,top:8,bottom:91},walkable:[[18,9],[82,9],[92,27],[91,70],[75,89],[25,89],[8,70],[9,27]],
  blockers:[{id:'warden-left-root',x:10,y:48,w:9,h:42,blocksLos:false},{id:'warden-right-edge',x:90,y:52,w:7,h:36,blocksLos:false}]
 },
 wildheart:{
  zone:'WILDHEART PASSAGE',description:'Floating stone and glowing roots mark the canyon where Vorran has bent the woodland to his will.',
  art:'./assets/chaos-canyon/rooms/wildheart.webp?v=1',liveProfile:'canyon-wildheart',
  route:{entry:{x:50,y:98},entryInside:{x:50,y:84},partyAnchors:[[50,68],[44,72],[56,72],[41,78],[59,78]],exitPath:[{x:50,y:54},{x:50,y:35},{x:50,y:18},{x:50,y:3}],spread:2.0},
  enemies:[[50,38],[41,46],[59,46]],
  bounds:{left:9,right:91,top:8,bottom:91},walkable:[[24,10],[76,10],[91,27],[91,71],[76,89],[24,89],[9,71],[9,27]],
  blockers:[{id:'wildheart-left-root',x:11,y:46,w:8,h:42,blocksLos:false},{id:'wildheart-right-root',x:89,y:46,w:8,h:42,blocksLos:false}]
 },
 vorran:{
  zone:'HEART OF CHAOS',description:'Vorran stands inside the Rootheart. The ritual floor will not survive the fight.',
  art:'./assets/chaos-canyon/rooms/vorran.webp?v=1',liveProfile:'canyon-vorran',
  route:{entry:{x:50,y:98},entryInside:{x:50,y:84},partyAnchors:[[50,70],[44,74],[56,74],[41,80],[59,80]],exitPath:[],spread:2.0},
  enemies:[[50,38]],
  bounds:{left:11,right:89,top:13,bottom:90},arena:{shape:'ellipse',cx:50,cy:54,rx:38,ry:34},blockers:[]
 }
};
const CANYON_CROSSING={
 zone:'THE CHASM',description:'Seven unstable stepping stones wind across a mist-filled canyon gulf.',
 art:'./assets/chaos-canyon/rooms/crossing.webp?v=1',liveProfile:'canyon-crossing'
};
const CROSSING_ENV='<div class="ccenv ccenv-crossing"><div class="ccenv-chasm"></div><div class="ccenv-cliff left"></div><div class="ccenv-cliff right"></div><div class="ccenv-far-ledge"></div><i class="ccenv-root root1"></i><i class="ccenv-root root2"></i><span class="ccenv-cell c1"></span><span class="ccenv-cell c2"></span></div>';
const XP=1600;
const wait=ms=>new Promise(r=>setTimeout(r,Math.round(ms/((run&&run.speed)||1))));
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const role=c=>Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps';
const classKey=c=>'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ilvl=()=>Number(Game?.partyItemLevel?.())||0;
const partyLevel=()=>{const p=party();return p.length?Math.round(p.reduce((n,c)=>n+Math.max(1,Number(c.level)||1),0)/p.length):1};
function ccResourceDef(c){return window.CellboundCombatReborn?.RESOURCE_DEFS?.[c?.class]||{name:'Power',max:100,start:100}}
function ccPersistentStatuses(player,elapsedMs=0){
 const elapsed=Math.max(0,Number(elapsedMs)||0);
 return Object.values(player?.statuses||{}).filter(s=>s?.persistAcrossEncounters&&Number(s.expiresAt)>elapsed).map(s=>({...s,effect:{...(s.effect||{})},remainingMs:Math.max(0,Number(s.expiresAt)-elapsed)}))
}
function ccAdvanceCooldowns(ms){
 const amount=Math.max(0,Number(ms)||0);if(!run)return;
 Object.values(run.cooldowns||{}).forEach(map=>Object.keys(map||{}).forEach(k=>map[k]=Math.max(0,(Number(map[k])||0)-amount)));
 Object.keys(run.statuses||{}).forEach(id=>{run.statuses[id]=(run.statuses[id]||[]).map(s=>({...s,remainingMs:Math.max(0,(Number(s.remainingMs)||0)-amount)})).filter(s=>s.remainingMs>0)});
 Object.keys(run.reviveSickness||{}).forEach(id=>run.reviveSickness[id]=Math.max(0,(Number(run.reviveSickness[id])||0)-amount));
 run.expeditionTimeMs=(Number(run.expeditionTimeMs)||0)+amount
}

function root(){let e=$('#cc2dBackdrop');if(e)return e;e=document.createElement('div');e.id='cc2dBackdrop';e.className='cc2d-backdrop';e.hidden=true;document.body.appendChild(e);return e}
function readiness(normalOnly=false){const p=party();if(p.length!==5)return{ok:false,reason:'Build a complete five-character party first.'};const bad=p.find(c=>Game.isUnavailable?.(c));if(bad)return{ok:false,reason:bad.name+' is still recovering from Cell Shock.'};const cfg=normalOnly?null:ccEndgameConfig(),req=normalOnly?30:Math.max(30,Number(cfg?.recommendedItemLevel)||30),label=normalOnly?'Normal':(cfg?.diff?.name||'Normal');if(ilvl()<req)return{ok:false,reason:'Party Item Level '+ilvl()+'. '+label+' requires Item Level '+req+'.'};return{ok:true,reason:normalOnly?'Normal difficulty is available.':'Your party is ready to enter the canyon.'}}
function renderCard(){
 const card=$('#chaosCanyonCard'),mount=$('#chaosCanyonMount');if((!card&&!mount)||!Game?.ready)return;const s=state(),clears=Number(s?.chaosCanyonCompletions)||0,pi=ilvl(),gate=readiness(true);
 if(card)card.innerHTML='<article class="dungeon-browser-card chaos-canyon unlocked" data-dungeon-card="chaos-canyon"><div class="dungeon-browser-art has-image chaos-canyon-art"><img src="./assets/dungeons/chaos-canyon.webp" alt="" loading="lazy" decoding="async"><span>CANYON WILDS</span><strong>⌁</strong></div><div class="dungeon-browser-copy"><div class="dungeon-browser-heading"><div><small>DUNGEON</small><h3>Chaos Canyon</h3></div><b id="chaosCanyonStatus">'+(clears?'CLEARED':'AVAILABLE')+'</b></div><p>A living canyon of corrupted beasts, a dangerous stepping-stone crossing and the Druid who built it all.</p><div class="dungeon-browser-meta"><span>7 stages</span><span>iLvl 30+</span><span>Party iLvl '+(pi||'—')+'</span></div><div class="dungeon-browser-actions"><button type="button" data-dungeon-more="chaos-canyon">MORE INFO →</button></div></div></article>';
 if(!mount)return;
 const route=[['Canyon Mouth','trash','⌁','The first corrupted pack guards the narrow canyon entrance.','ENEMY PACK'],['Thorn Trail','trash','⌁','A second pack introduces roots, charges and tighter positioning.','ENEMY PACK'],['The Canyon Sentinel','boss','◇','Stonebreaker Slam, Fracture and Root Bind guard the route forward.','MINI-BOSS'],['Chaos Crossing','puzzle','◆','Cross seven steps. A wrong stone collapses and adds Chaos Scar.','PUZZLE'],['The Chaos Warden','boss','◇','Chaos Scar increases all incoming damage here. The debuff ends when the Warden dies.','BOSS'],['Wildheart Passage','trash','⌁','Vorran’s keepers defend the final approach.','ENEMY PACK'],['Archdruid Vorran','final','✦','A self-healing Druid who closes the arena around the party.','FINAL BOSS']];
 mount.innerHTML='<div class="dungeon-detail-toolbar"><div><small>DUNGEON JOURNAL</small><b>Chaos Canyon</b></div><button type="button" data-dungeon-close>CLOSE DETAILS ×</button></div><div class="dungeon-journal-hero chaos-canyon-journal-hero"><div class="dungeon-journal-art has-image chaos-canyon-journal-art" data-dungeon-art="chaos-canyon"><img src="./assets/dungeons/chaos-canyon.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"><span class="journal-eyebrow">CANYON WILDS · DUNGEON</span><h3>Chaos Canyon</h3><p>A once-natural ravine reshaped into a proving ground by Archdruid Vorran. The deeper you travel, the less the canyon obeys the rules of nature.</p><div class="journal-badges"><span>5 adventurers</span><span>7 stages</span><span>Party iLvl '+(pi||'—')+'</span></div></div><div class="journal-entry-panel"><small>ENTRY REQUIREMENT</small><b>Party Item Level 30</b><p>'+esc(gate.reason)+'</p><button data-cc-enter '+(!gate.ok?'disabled':'')+'>ENTER CHAOS CANYON</button></div></div><div class="dungeon-journal-layout"><article class="panel dungeon-route-panel"><div class="panel-head"><div><small>DUNGEON ROUTE</small><h3>Expedition Path</h3></div><b>7 STAGES</b></div><div class="dungeon-route">'+route.map((r,i)=>'<div class="dungeon-stage '+(clears?'complete':'')+'" data-kind="'+r[1]+'"><div class="dungeon-stage-rune">'+(clears?'✓':r[2])+'</div><div class="dungeon-stage-copy"><b>'+(i+1)+'. '+r[0]+'</b><small>'+r[3]+'</small></div><span class="dungeon-stage-tag">'+r[4]+'</span></div>').join('')+'</div></article><aside class="panel dungeon-intel-panel"><div class="panel-head"><div><small>ENCOUNTER INTELLIGENCE</small><h3>What Your Guild Knows</h3></div></div><div class="dungeon-intel"><article class="intel-card"><div class="intel-card-head"><b>Chaos Crossing</b><span>INTERACTIVE</span></div><p>Seven decisions stand between the Sentinel and the Warden. A wrong stone disappears and adds 5% damage taken for the Warden fight, up to 40%.</p></article><article class="intel-card"><div class="intel-card-head"><b>The Chaos Warden</b><span>PUNISHMENT BOSS</span></div><p>The encounter does not gain extra mechanics from the puzzle. Your mistakes simply make every hit more dangerous.</p></article><article class="intel-card"><div class="intel-card-head"><b>Archdruid Vorran</b><span>FINAL BOSS</span></div><p>Interrupt Rejuvenation. The arena steadily contracts; once the party is forced into the centre, Vorran’s pressure becomes group-wide.</p></article><article class="intel-card"><div class="intel-card-head"><b>Expedition Record</b><span>'+clears+' clear'+(clears===1?'':'s')+'</span></div><p>'+(clears?'Vorran has fallen here before. Higher difficulties remain unlocked.':'No successful expedition has been recorded yet.')+'</p></article></div></aside></div>';
 mount.querySelector('[data-cc-enter]')?.addEventListener('click',openDungeon);try{window.CellboundDungeonBrowser?.refresh?.()}catch(error){console.warn('chaos-canyon-v1 browser refresh isolated',error)}
}
function ccEndgameConfig(){
 const E=window.CellboundEndgame;
 if(E?.currentConfig)return E.currentConfig('chaos-canyon');
 return{difficulty:'normal',tier:0,diff:{name:'Normal',label:'NORMAL',description:'Learn Chaos Canyon and survive the crossing.'},affixes:[],targetTimeMs:18*60*1000,recommendedItemLevel:30,dungeon:{version:2}}
}
function ccEndgamePrepMarkup(){
 const E=window.CellboundEndgame,cfg=ccEndgameConfig(),p=E?.progressFor?.('chaos-canyon')||{},tierMax=Math.max(1,Number(p.highest_tier)||1);
 const buttons=['normal','heroic','cellbound'].map(mode=>{const unlocked=E?.difficultyUnlocked?E.difficultyUnlocked('chaos-canyon',mode,cfg.tier||1):mode==='normal';return'<button type="button" data-cc-mode="'+mode+'" class="'+(cfg.difficulty===mode?'active':'')+'" '+(unlocked?'':'disabled')+'>'+(mode==='cellbound'?'CELLBOUND+':mode.toUpperCase())+'</button>'}).join('');
 const tier=cfg.difficulty==='cellbound'?(E?.tierPickerMarkup?.(cfg.tier,tierMax,{attribute:'data-cc-tier'})||''):'';
 const affixes=(cfg.affixes||[]).map(id=>window.CellboundEndgameData?.AFFIXES?.[id]?.name||id).join(' · ')||'No affixes';
 return'<div class="eg-prep-block"><small>DUNGEON DIFFICULTY</small><div class="eg-prep-tabs">'+buttons+'</div><div class="eg-prep-detail"><b>'+esc(cfg.diff?.name||'Normal')+'</b> · Recommended iLvl '+cfg.recommendedItemLevel+' · Target '+Math.floor(cfg.targetTimeMs/60000)+':'+String(Math.round(cfg.targetTimeMs/1000)%60).padStart(2,'0')+'<br>'+esc(affixes)+'<br>'+esc(cfg.diff?.description||'')+'</div>'+tier+'</div>'
}
function ccBindEndgamePrep(){
 const E=window.CellboundEndgame;
 document.querySelectorAll('[data-cc-mode]').forEach(b=>b.onclick=()=>{E?.choose?.('chaos-canyon',b.dataset.ccMode);briefing()});
 document.querySelectorAll('[data-cc-tier]').forEach(b=>b.onclick=()=>{E?.choose?.('chaos-canyon','cellbound',Number(b.dataset.ccTier));briefing()})
}


function ccStrategyButtons(key,items){
 return '<div class="eg-prep-tabs hs-strategy-tabs" data-cc-plan="'+key+'">'+items.map(x=>'<button type="button" data-cc-pick="'+key+'|'+x[0]+'" class="'+(ccTactics[key]===x[0]?'active':'')+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>').join('')+'</div>';
}
function applyHsStrategyPreset(value){
 ccTactics.strategyPreset=value;
 if(value==='safe'){
   Object.assign(ccTactics,{pullStyle:'safe',cooldownUse:'difficult',interruptPriority:'high',interruptAssignment:'best',crowdControl:'enabled',defensiveUsage:'aggressive',addPriority:'immediate',movementDiscipline:'safe',bossPlan:'control'});
 }else if(value==='aggressive'){
   Object.assign(ccTactics,{pullStyle:'aggressive',cooldownUse:'free',interruptPriority:'standard',interruptAssignment:'best',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'boss',movementDiscipline:'damage',bossPlan:'burn'});
 }else{
   Object.assign(ccTactics,{pullStyle:'normal',cooldownUse:'difficult',interruptPriority:'standard',interruptAssignment:'dps-rotation',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'immediate',movementDiscipline:'balanced',bossPlan:'balanced'});
 }
}
function ccBindStrategy(){
 $$('[data-cc-pick]').forEach(b=>b.addEventListener('click',()=>{
  const [key,value]=b.dataset.ccPick.split('|');
  if(key==='strategyPreset')applyHsStrategyPreset(value);else ccTactics[key]=value;
  $$('[data-cc-plan="'+key+'"] button').forEach(x=>x.classList.toggle('active',x===b));
 }))
}
async function ccWaitForEndgame(){
 for(let i=0;i<20;i++){if(window.CellboundEndgame?.beginAttempt)return window.CellboundEndgame;await new Promise(r=>setTimeout(r,100))}
 return null
}

function briefing(){
 const baseGate=readiness(true),gate=readiness(),r=root();r.hidden=false;document.body.classList.add('cc2d-open');
 if(!baseGate.ok){r.innerHTML='<section class="cb2d-shell cb2d-brief cc2d-unified-shell"><header class="cb2d-head"><div><small>CHAOS CANYON · ENTRY CHECK</small><h2>Dungeon entry is currently blocked.</h2></div><button data-close aria-label="Close dungeon">×</button></header><div class="cb2d-blocked"><b>NOT READY</b><p>'+esc(baseGate.reason)+'</p><button data-action>OPEN PARTY BUILDER →</button></div></section>';r.querySelector('[data-close]').onclick=close;r.querySelector('[data-action]').onclick=()=>{close();Game.switchView?.('party')};return}
 r.innerHTML='<section class="cb2d-shell cb2d-brief cc2d-unified-shell"><header class="cb2d-head"><div><small>CHAOS CANYON · LEVELS 9–11 · ILVL 30+ · TACTICAL BRIEFING</small><h2>The canyon fights back.</h2></div><button data-close aria-label="Close dungeon">×</button></header><div class="cb2d-brief-grid"><main><p class="cb2d-intro">Fight through corrupted canyon paths, cross the unstable stones and survive Vorran’s collapsing arena.</p>'+ccEndgamePrepMarkup()+'<h3>Expedition Style</h3><p class="cb2d-intro">Choose the overall approach before entering combat.</p>'+ccStrategyButtons('strategyPreset',[['safe','SAFE','Slower pulls, earlier defensives and stronger mechanic control.'],['balanced','BALANCED','Standard pace with sensible reactions to danger.'],['aggressive','AGGRESSIVE','Faster pulls, freer cooldown use and more boss pressure.']])+'<h3>Encounter Intelligence</h3><div class="cc2d-intel"><span><b>Chaos Crossing</b><small>You make all seven stepping-stone decisions</small></span><span><b>Chaos Warden</b><small>Every failed stone adds 5% incoming damage</small></span><span><b>Archdruid Vorran</b><small>Interrupt his healing before the arena closes in</small></span></div></main><aside><small>ACTIVE FIVE · PARTY LV '+partyLevel()+' · ILVL '+ilvl()+'</small>'+party().map(ch=>'<div class="cb2d-brief-member"><i class="cb2d-dot '+classKey(ch)+'"></i><span><b>'+esc(ch.name)+'</b><small>Lv. '+Math.max(1,Number(ch.level)||1)+' · '+esc(ch.class)+' · '+esc(ch.spec)+'</small></span><strong>'+String(role(ch)).toUpperCase()+'</strong></div>').join('')+'<div class="cb2d-prep-summary"><small>SIGNATURE RULE</small><p><b>Chaos Scar</b><span>Wrong stone = +5% damage taken for the Chaos Warden · capped at +40%</span></p></div><div class="cb2d-prep-summary"><small>SELECTED DIFFICULTY</small><p><b>'+(gate.ok?'READY':'ITEM LEVEL REQUIRED')+'</b><span>'+esc(gate.reason)+'</span></p></div><button class="cb2d-start" data-start '+(gate.ok?'':'disabled')+'>BEGIN EXPEDITION →</button></aside></div></section>';
 r.querySelector('[data-close]').onclick=close;r.querySelector('[data-start]').onclick=start;try{ccBindEndgamePrep()}catch(error){console.warn('Chaos Canyon difficulty controls failed to bind',error)}ccBindStrategy()
}
function openDungeon(options){Game=window.CellboundGame;if(!Game?.ready)return;db=Game.getSupabase?.();requestedRunOptions=options||null;if(options?.difficulty)window.CellboundEndgame?.choose?.('chaos-canyon',options.difficulty,options.tier||1);briefing()}
function close(){token++;run=null;document.body.classList.remove('cc2d-open');const r=root();r.hidden=true;Game?.switchView?.('content');renderCard()}
function hpNeed(level){return 800+Math.max(0,(Number(level)||1)-1)*250}
function awardXp(){
 const reward=Number(run?.xpReward)||XP;
 const cap=Math.max(1,Number(Game?.getLevelCap?.())||15);
 return party().map(c=>{const beforeLevel=Math.min(cap,Math.max(1,Number(c.level)||1)),beforeXp=beforeLevel>=cap?0:Math.max(0,Number(c.xp)||0),beforeNeed=hpNeed(beforeLevel);let level=beforeLevel,xp=beforeLevel>=cap?0:beforeXp+reward,levels=0;while(level<cap&&xp>=hpNeed(level)){xp-=hpNeed(level);level++;levels++}if(level>=cap){level=cap;xp=0}c.level=level;c.xp=xp;if(levels){c.talent=(Number(c.talent)||0)+levels}return{name:c.name,amount:beforeLevel>=cap?0:reward,beforeLevel,beforeXp,beforeNeed,afterLevel:level,afterXp:xp,afterNeed:hpNeed(level),levels,capped:level>=cap}})
}
async function syncXp(gains){
 if(!db)return;const user=Game.getUser?.();if(!user)return;try{await Promise.all(gains.map(x=>db.from('characters').update({level:x.afterLevel,xp:x.afterXp,last_played_at:new Date().toISOString()}).eq('user_id',user.id).eq('name',x.name)))}catch(e){console.warn('Chaos Canyon XP sync failed',e)}
}
function setStatus(text){const e=$('#cc2dStatus');if(e)e.textContent=text}
function feed(text){if(!run)return;run.log.push(text);const e=$('#cc2dFeed');if(e)e.innerHTML=run.log.slice(-7).reverse().map(x=>'<p>'+esc(x)+'</p>').join('')}
function ccArenaScale(){return STAGES[run?.stage]?.id==='vorran'?[1,.78,.55,.30][Math.max(0,Math.min(3,Number(run?.vorranShrink)||0))]:1}
function ccArenaPoint(x,y){const scale=ccArenaScale();return{x:50+(Number(x)-50)*scale,y:50+(Number(y)-50)*scale}}
function addUnit(id,label,cls,x,y,big=false,meta='',characterId=null){const e=document.createElement('div'),safe=ccSafePoint(id,x,y);e.className='cc2d-unit cb2d-unit '+cls+(big?' big':'');e.dataset.cc=id;if(characterId)e.dataset.unit='p-'+characterId;e.dataset.rawX=safe.x;e.dataset.rawY=safe.y;const p=ccArenaPoint(safe.x,safe.y);e.style.left=p.x+'%';e.style.top=p.y+'%';e.innerHTML='<i></i><span>'+esc(label)+(meta?'<small class="cc2d-unit-meta">'+esc(meta)+'</small>':'')+'</span><em><i></i></em>';$('#cc2dUnits').appendChild(e)}
function ccSafePoint(id,x,y){const arena=$('#cc2dArena'),transit=arena?.classList.contains('travelling')||arena?.classList.contains('room-entering');return{x:Math.max(transit?2:7,Math.min(transit?98:93,Number(x)||50)),y:Math.max(transit?2:11,Math.min(transit?98:89,Number(y)||50))}}
function move(id,x,y,ms=550){const e=$('[data-cc="'+id+'"]');if(!e)return;const safe=ccSafePoint(id,x,y);e.dataset.rawX=safe.x;e.dataset.rawY=safe.y;const p=ccArenaPoint(safe.x,safe.y);e.style.transitionDuration=ms+'ms';e.style.left=p.x+'%';e.style.top=p.y+'%'}
function ccReflowArena(ms=760){document.querySelectorAll('[data-cc]').forEach(e=>{const x=Number(e.dataset.rawX),y=Number(e.dataset.rawY);if(Number.isFinite(x)&&Number.isFinite(y))move(e.dataset.cc,x,y,ms)})}
function ccPoint(id){const arena=$('#cc2dArena'),e=$('[data-cc="'+id+'"]');if(!arena||!e)return null;const ar=arena.getBoundingClientRect(),r=e.getBoundingClientRect();return{x:r.left+r.width/2-ar.left,y:r.top+r.height/2-ar.top,w:ar.width,h:ar.height}}
function projectile(fromId,toId,kind='magic',ms=420){
 if(window.CellboundCombatFX?.living)return;
 const a=ccPoint(fromId),b=ccPoint(toId),fx=$('#cc2dFx');if(!a||!b||!fx)return;
 const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI,p=document.createElement('i');
 p.className='cc2d-shot '+kind;p.style.left=a.x+'px';p.style.top=a.y+'px';p.style.setProperty('--dx',dx+'px');p.style.setProperty('--dy',dy+'px');p.style.setProperty('--angle',angle+'deg');fx.appendChild(p);setTimeout(()=>p.remove(),ms+120)
}
function ccFloat(id,text,kind='damage'){const p=ccPoint(id),arena=$('#cc2dArena');if(!p||!arena)return;const e=document.createElement('b');e.className='cc2d-float '+kind;e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),800)}
function ccBar(id,pct){const bar=$('[data-cc="'+id+'"] > em i');if(bar)bar.style.width=Math.max(0,Math.min(100,pct))+'%'}
function ccTelegraph(type,label,sourceId,targetId,size=170){
 const layer=$('#cc2dTelegraphs'),a=sourceId?ccPoint(sourceId):null,b=targetId?ccPoint(targetId):null;if(!layer)return null;
 const e=document.createElement('div');e.className='cc2d-tele '+type+' dynamic';e.innerHTML='<span>'+esc(label)+'</span>';
 if(type==='circle'){
   const p=b||a;if(!p)return null;e.style.left=p.x+'px';e.style.top=p.y+'px';e.style.width=size+'px';e.style.height=size+'px';e.style.transform='translate(-50%,-50%)';
 }else{
   if(!a||!b)return null;const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI;
   e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.width=Math.max(220,Math.hypot(a.w,a.h)*.78)+'px';e.style.height='58px';e.style.transform='translateY(-50%) rotate('+angle+'deg)';
 }
 layer.appendChild(e);return e
}
function ccEnemyMeta(s,index){
 const level=Math.max(1,Number(s?.enemyLevels?.[index])||Number(s?.level)||1);
 const type=String(s?.enemyTypes?.[index]||((s?.enemies?.length===1&&(s?.combatKind==='boss'||s?.combatKind==='final'))?'boss':'trash')).toLowerCase();
 const labels={trash:'TRASH',elite:'ELITE',boss:'BOSS','world-boss':'WORLD BOSS',add:'ADD'};
 return{level,type,label:labels[type]||type.toUpperCase()}
}
function ccRouteOffset(point,from,to,slot=0,spread=2){
 const dx=(Number(to?.x)||Number(point.x))-(Number(from?.x)||Number(point.x)),dy=(Number(to?.y)||Number(point.y))-(Number(from?.y)||Number(point.y)),len=Math.hypot(dx,dy)||1;
 const offsets=[0,-1,1,-2,2],amount=(offsets[slot%offsets.length]||0)*spread;
 return{x:Number(point.x)+(-dy/len)*amount,y:Number(point.y)+(dx/len)*amount}
}
function ccPartyPosition(s,i){
 const room=CANYON_ROOMS[s?.id]||CANYON_ROOMS['canyon-mouth'],p=room.route?.partyAnchors?.[i]||room.route?.entryInside||{x:35,y:50};
 return Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p.x),y:Number(p.y)}
}
function ccEnemyPosition(s,i){
 const room=CANYON_ROOMS[s?.id]||CANYON_ROOMS['canyon-mouth'],p=room.enemies?.[i]||room.enemies?.[room.enemies.length-1]||[68,50];
 return Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p.x),y:Number(p.y)}
}
function ccEnsureFade(){
 const arena=$('#cc2dArena');if(!arena)return null;let fade=arena.querySelector('.cc2d-room-fade');
 if(!fade){fade=document.createElement('div');fade.className='cc2d-room-fade';fade.setAttribute('aria-hidden','true');arena.appendChild(fade)}return fade
}
function ccSetFade(black,duration=560){
 const fade=ccEnsureFade();if(!fade)return;fade.style.setProperty('--cc-fade-ms',Math.max(0,Number(duration)||0)+'ms');fade.classList.toggle('is-black',Boolean(black))
}
function ccNatureLayer(arena,roomId){
 arena?.querySelector('.cc2d-nature-life')?.remove();if(!arena)return;
 const layer=document.createElement('div');layer.className='cc2d-nature-life room-'+String(roomId||'canyon');
 for(let i=0;i<9;i++){const leaf=document.createElement('i');leaf.className='leaf';leaf.style.setProperty('--x',(8+((i*17)%84))+'%');leaf.style.setProperty('--y',(5+((i*23)%76))+'%');leaf.style.setProperty('--d',(-i*.61)+'s');leaf.style.setProperty('--dur',(5.5+(i%4)*1.15)+'s');leaf.style.setProperty('--drift',(-26+(i%6)*11)+'px');layer.appendChild(leaf)}
 for(let i=0;i<3;i++){const mist=document.createElement('b');mist.className='mist';mist.style.setProperty('--my',(18+i*25)+'%');mist.style.setProperty('--md',(-i*2.1)+'s');layer.appendChild(mist)}
 arena.appendChild(layer)
}
function ccVorranCollapseLayer(arena){
 arena?.querySelector('.cc-vorran-collapse')?.remove();if(!arena)return;
 const layer=document.createElement('div');layer.className='cc-vorran-collapse';layer.setAttribute('aria-hidden','true');
 const pieces=[
  [1,1,30,43,-70,-28,-18],[1,1,70,43,70,-28,18],[1,1,34,66,-58,42,-14],[1,1,66,66,58,42,14],
  [2,2,39,39,-50,-30,-18],[2,2,61,39,50,-30,18],[2,2,38,61,-46,34,-12],[2,2,62,61,46,34,12],
  [3,3,44,43,-34,-24,-15],[3,3,56,43,34,-24,15],[3,3,44,58,-30,28,-10],[3,3,56,58,30,28,10]
 ];
 layer.innerHTML='<span class="cc-vorran-void"></span><span class="cc-vorran-cracks"></span>'+pieces.map(p=>'<i class="cc-vorran-chunk phase-'+p[0]+'" style="--x:'+p[2]+'%;--y:'+p[3]+'%;--dx:'+p[4]+'px;--dy:'+p[5]+'px;--rot:'+p[6]+'deg"></i>').join('');
 arena.appendChild(layer)
}
function stageEnvironment(s){
 const room=CANYON_ROOMS[s.id]||CANYON_ROOMS['canyon-mouth'],arena=$('#cc2dArena'),environment=$('#cc2dEnvironment'),src=room.art;
 arena.className='cb2d-arena cc2d-arena cc2d-unified-arena canyon-live-room stage-'+s.id;
 arena.dataset.chaosRoom=s.id;arena.dataset.bespokeBattlefield='1';
 if(s.id!=='vorran')run.vorranShrink=0;else run.vorranShrink=Math.max(0,Number(run.vorranShrink)||0);
 if(environment)environment.innerHTML='<img class="cc2d-room-art" src="'+src+'" alt="" decoding="async" draggable="false">';
 (window.CellboundLivingScenes||window.CellboundAshenLiveScenes)?.mount?.(arena,{src,profile:room.liveProfile||'canyon-mouth'});
 ccNatureLayer(arena,s.id);if(s.id==='vorran')ccVorranCollapseLayer(arena);
 if(s.id==='vorran'&&run.vorranShrink){for(let n=1;n<=run.vorranShrink;n++)arena.classList.add('vorran-shrink-'+n)}
 const tag=$('#cc2dRoom');if(tag)tag.innerHTML='<em>'+esc(room.zone||'CHAOS CANYON')+'</em><b>'+esc(s.title)+'</b><small>'+esc(room.description||'The woodland canyon closes around the party.')+'</small>';
 ccEnsureFade()
}
function ccRoomPoint(room,index,fallback){
 const p=room?.[index];return Array.isArray(p)&&p.length>=2?p:fallback
}
function spawnStage(s){
 stageEnvironment(s);$('#cc2dUnits').innerHTML='';$('#cc2dTelegraphs').innerHTML='';$('#cc2dFx').innerHTML='';
 const chars=party(),room=CANYON_ROOMS[s.id]||CANYON_ROOMS['canyon-mouth'],route=room.route||{},entry=route.entry||{x:4,y:50},inside=route.entryInside||{x:18,y:50},spread=Number(route.spread)||2;
 const arena=$('#cc2dArena');arena?.classList.add('room-entering');
 chars.forEach((c,i)=>{
  const start=ccRouteOffset(entry,entry,inside,i,spread),target=ccPartyPosition(s,i);
  addUnit('p'+i,c.name,'party '+role(c)+' '+classKey(c),start.x,start.y,false,'',c.id);
  setTimeout(()=>move('p'+i,target.x,target.y,650),35+i*22)
 });
 requestAnimationFrame(()=>window.CellboundCombatPortraits?.refresh?.());
 // Hostiles belong to the room and are already waiting for the party.
 s.enemies.forEach((n,i)=>{
  const m=ccEnemyMeta(s,i),big=m.type==='boss'||m.type==='world-boss'||(s.id==='sentinel'&&m.type==='elite'),target=ccEnemyPosition(s,i);
  addUnit('e'+i,n,big?'enemy boss':'enemy',target.x,target.y,big,'Lv. '+m.level+' · '+m.label)
 });
 if(run?.roomTransitionBlack){const fade=ccEnsureFade();fade?.classList.add('is-black');requestAnimationFrame(()=>requestAnimationFrame(()=>ccSetFade(false,720)));run.roomTransitionBlack=false}else ccSetFade(false,0);
 setTimeout(()=>arena?.classList.remove('room-entering'),760)
}
function ccRegroup(ms=380){
 const s=STAGES[run?.stage],room=CANYON_ROOMS[s?.id]||CANYON_ROOMS['canyon-mouth'];
 party().forEach((ch,i)=>{if((Number(run?.hp?.[ch.id])||0)<=0)return;const r=role(ch),p=ccRoomPoint(room.party,i,[r==='tank'?40:r==='healer'?25:31,31+i*9]);move('p'+i,p[0],p[1],ms)})
}
function ccRenderId(unitId){
 const id=String(unitId||'');
 if(id.startsWith('p-')){const charId=id.slice(2),i=party().findIndex(x=>String(x.id)===charId);return i>=0?'p'+i:null}
 if(/^e-\d+$/.test(id))return'e'+Number(id.slice(2));
 return id
}
function ccCharacter(unitId){const id=String(unitId||'');return id.startsWith('p-')?party().find(x=>String(x.id)===id.slice(2)):null}
function ccAttackKind(c){return c?.class==='Hunter'?'arrow':['Mage','Priest','Druid','Evoker'].includes(c?.class)?'magic':'slash'}
function ccRebornEncounter(s){
 const room=CANYON_ROOMS[s.id]||{},enemies=s.enemies.map((name,i)=>({name,currentPosition:ccEnemyPosition(s,i)}));
 const base={id:s.id,title:s.title,kind:s.combatKind||'trash',level:s.level||1,recommendedItemLevel:s.level<=9?30:s.level===10?32:34,enemyLevels:s.enemyLevels||null,enemyTypes:s.enemyTypes||null,enemies,enemyHealth:s.enemyHealth,mechanics:(s.mechanics||[]).map(m=>Array.isArray(m)?{name:m[0],type:m[1],duration:m[2]}:{...m}),phases:(s.phases||[]).map(p=>({...p,arenaBounds:p.arenaBounds?{...p.arenaBounds}:null,arena:p.arena?{...p.arena}:null,addMechanics:(p.addMechanics||[]).map(m=>({...m}))})),environment:{room:s.id,bounds:{...(room.bounds||{})},arena:room.arena?{...room.arena}:null,walkable:Array.isArray(room.walkable)?room.walkable.map(p=>[Number(p[0]),Number(p[1])]):undefined,blockers:(room.blockers||[]).map(b=>({...b,blocksLos:b.blocksLos!==false,blocksMovement:b.blocksMovement!==false}))}};
 let cfg=window.CellboundEndgame?.stageConfig?.('chaos-canyon',base)||base;
 cfg={...cfg,scaling:{...(cfg.scaling||{})},environment:{...base.environment,...(cfg.environment||{}),bounds:{...base.environment.bounds,...(cfg.environment?.bounds||{})},arena:cfg.environment?.arena||base.environment.arena,walkable:cfg.environment?.walkable||base.environment.walkable,blockers:Array.isArray(cfg.environment?.blockers)?cfg.environment.blockers:base.environment.blockers}};
 if(s.id==='warden'&&run?.chaosScar){const scar=Math.min(40,Math.max(0,Number(run.chaosScar)||0)*5);cfg.scaling.enemyDamage=(Number(cfg.scaling.enemyDamage)||1)*(1+scar/100);cfg.chaosScarPct=scar}
 return cfg
}
function ccResultHealth(result){
 (result?.finalState?.players||[]).forEach(p=>{const c=party().find(x=>String(x.id)===String(p.characterId));if(c)run.hp[c.id]=Math.max(0,Math.min(100,p.maxHealth?Math.round(p.health/p.maxHealth*100):0))})
}
function ccMechanicFromEvent(e){
 const type=e.payload?.mechanicType,tokenId=e.payload?.token||('hs-'+e.timestamp),source=ccRenderId(e.source),target=ccRenderId(e.payload?.targetId||e.target);let tg=null;
 if(type==='line')tg=ccTelegraph('line',e.ability||'LINE ATTACK',source,target);
 else if(type==='cone')tg=ccTelegraph('line',e.ability||'FRONTAL',source,target);
 else if(type==='circle')tg=ccTelegraph('circle',e.ability||'AREA ATTACK',source,target||source,210);
 else if(type==='circles'){
   const ids=(e.payload?.targetIds||[]).map(ccRenderId).filter(Boolean),layer=$('#cc2dTelegraphs'),wrap=document.createElement('div');wrap.className='cc2d-multi-tele';
   ids.forEach((id,i)=>{const t=ccTelegraph('circle',i===0?(e.ability||'TARGETED AREA'):'',null,id,145);if(t){t.dataset.ccMulti=tokenId}})
   tg={remove:()=>$$('[data-cc-multi="'+tokenId+'"]').forEach(x=>x.remove()),classList:{add:k=>$$('[data-cc-multi="'+tokenId+'"]').forEach(x=>x.classList.add(k))}};
 }else if(type==='adds'){
   const layer=$('#cc2dTelegraphs');if(layer){tg=document.createElement('div');tg.className='cc2d-tele circle dynamic';tg.innerHTML='<span>ADDS SPAWNING</span>';tg.style.left='74%';tg.style.top='50%';tg.style.width='150px';tg.style.height='150px';tg.style.transform='translate(-50%,-50%)';layer.appendChild(tg)}
 }else if(type==='interrupt'||type==='self-heal'){
   const layer=$('#cc2dTelegraphs');if(layer){tg=document.createElement('div');tg.className='cc2d-tele circle dynamic';tg.innerHTML='<span>INTERRUPT '+esc(e.ability||'CAST')+'</span>';const p=ccPoint(source);if(p){tg.style.left=p.x+'px';tg.style.top=p.y+'px';tg.style.width='92px';tg.style.height='92px';tg.style.transform='translate(-50%,-50%)'}layer.appendChild(tg)}
 }
 run.telegraphs[tokenId]=tg;return tg
}
function ccClearMechanic(tokenId,impact=false){const tg=run?.telegraphs?.[tokenId];if(!tg)return;if(impact)tg.classList?.add?.('impact');setTimeout(()=>tg.remove?.(),260);delete run.telegraphs[tokenId]}
function ccAddSpawn(e){
 const id=e.target,p=e.position||{x:75,y:50};if($('[data-cc="'+id+'"]'))return;
 addUnit(id,e.payload?.name||'Echo Add','enemy',p.x,p.y,false,'Lv. '+(e.payload?.level||STAGES[run.stage]?.level||1)+' · '+(e.payload?.classificationLabel||'ADD'));const bar=$('[data-cc="'+id+'"] > em i');if(bar)bar.style.width='100%'
}
function ccResourceVisual(e){
 const id=ccRenderId(e.source);if(!id)return;
 const u=$('[data-cc="'+id+'"]');if(!u||!u.classList.contains('party'))return;
 let bar=u.querySelector('.cbr-resource');
 if(!bar){bar=document.createElement('small');bar.className='cbr-resource';bar.innerHTML='<i></i>';u.appendChild(bar)}
 const name=String(e.payload?.resource||'Power'),max=Math.max(1,Number(e.payload?.max)||100),value=Math.max(0,Math.min(max,Number(e.payload?.value)||0)),key='resource-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 if(bar.dataset.resource!==name){[...bar.classList].filter(x=>x.startsWith('resource-')).forEach(x=>bar.classList.remove(x));bar.classList.add(key);bar.dataset.resource=name;bar.title=name}
 const fill=bar.querySelector('i');if(fill)fill.style.width=(value/max*100)+'%'
}
function ccStatusTargets(id){
 const out=[],rid=ccRenderId(id),unit=rid?$('[data-cc="'+rid+'"]'):null;if(unit)out.push(unit);
 const ch=ccCharacter(id),row=ch?document.querySelector('[data-cc-side-row="'+CSS.escape(String(ch.id))+'"]'):null,mirror=row?.querySelector('span');
 if(mirror)out.push({el:mirror,mirror:true});
 return out
}
function ccRenderRebornEvent(e){
 window.CellboundCombatFX?.combatEvent?.(e,{arena:$('#cc2dArena'),resolve:id=>ccStatusTargets(id)?.[0],speed:()=>run?.speed||1,position:(el,p,ms)=>move(el.dataset.cc,p.x,p.y,ms)});
 if(window.CellboundCombatStatuses?.handle(e,{resolve:ccStatusTargets,speed:()=>run?.speed||1}))return;
 const src=ccRenderId(e.source),target=ccRenderId(e.target),srcChar=ccCharacter(e.source),targetChar=ccCharacter(e.target);
 switch(e.type){
  case'COMBAT_START':{const arena=$('#cc2dArena');window.CellboundCombatFX?.mount?.(arena);if(['boss','final'].includes(String(STAGES[run.stage]?.kind||'')))window.CellboundCombatFX?.boss?.(arena,STAGES[run.stage]?.title||'Boss');setStatus('Combat simulation live.');feed('Combat begins.');break;}
  case'MOVEMENT_START':if(window.CellboundCombatFX?.ownsMovement)break;if(src&&e.payload?.to)move(src,e.payload.to.x,e.payload.to.y,e.payload.duration||420);break;
  case'ABILITY_START':
   if(srcChar)ccAct(role(srcChar),srcChar.name+' · '+(e.ability||'Ability'));
   if(srcChar&&target){projectile(src,target,ccAttackKind(srcChar),260)}
   else if(src&&target&&(String(e.source||'').startsWith('e-')||String(e.source||'').startsWith('add-')))projectile(src,target,'enemy',300);
   break;
  case'DAMAGE_DEALT':
   if(target){
     const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));ccBar(target,pct);ccFloat(target,'-'+Math.round(Number(e.amount)||0),targetChar?'incoming':'damage');window.CellboundCombatFX?.impact?.($('[data-cc="'+target+'"]'),{critical:e.result==='critical'});
     if(targetChar)run.hp[targetChar.id]=pct;
   }
   if(srcChar){run.damageDone[srcChar.id]=(Number(run.damageDone?.[srcChar.id])||0)+(Number(e.amount)||0);ccRenderMeters()}
   if(targetChar)ccUpdateSidebar();
   if(e.payload?.avoidable)feed((targetChar?.name||'A player')+' is hit by avoidable '+(e.ability||'damage')+'.');
   break;
  case'HEAL_RECEIVED':
   if(target&&!targetChar&&e.payload?.enemyHeal){const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));ccBar(target,pct);ccFloat(target,'+'+Math.round(Number(e.amount)||0),'heal');feed((e.ability||'The enemy')+' restores health.');}
   if(target&&targetChar){const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));run.hp[targetChar.id]=pct;ccBar(target,pct);ccFloat(target,'+'+Math.round(Number(e.amount)||0),'heal');window.CellboundCombatFX?.heal?.($('[data-cc="'+target+'"]'));ccUpdateSidebar()}
   if(srcChar){run.healingDone[srcChar.id]=(Number(run.healingDone?.[srcChar.id])||0)+(Number(e.amount)||0);run.overhealing[srcChar.id]=(Number(run.overhealing?.[srcChar.id])||0)+(Number(e.payload?.overhealing)||0);ccRenderMeters()}
   break;
  case'PHASE_CHANGE':{const arena=$('#cc2dArena');window.CellboundCombatFX?.phase?.(arena);window.CellboundFX?.phase?.(e.ability||'Boss phase',e.payload?.healthPct);feed((e.ability||'The boss changes phase')+' at '+Math.round(Number(e.payload?.healthPct)||0)+'% health.');setStatus(e.ability||'Phase change');arena?.classList.add('ambient-surge');setTimeout(()=>arena?.classList.remove('ambient-surge'),1350);if(STAGES[run.stage]?.id==='vorran'){run.vorranShrink=Math.min(3,(Number(run.vorranShrink)||0)+1);if(arena){arena.classList.add('vorran-shrink-'+run.vorranShrink,'vorran-collapse-pulse');setTimeout(()=>arena?.classList.remove('vorran-collapse-pulse'),980)}ccReflowArena(820);window.CellboundFX?.phase?.('The Rootheart floor collapses',e.payload?.healthPct);feed(run.vorranShrink>=3?'The final floor ring breaks away. Only the Rootheart core remains.':'The outer ritual floor cracks and falls into the canyon.');}break;}
  case'ENRAGE':feed((e.ability||'The boss enrages')+'.');setStatus(e.result==='hard'?'HARD ENRAGE — finish now':(e.ability||'Enrage'));break;
  case'UNIQUE_EFFECT_TRIGGER':if(srcChar){feed(srcChar.name+' triggers '+(e.ability||'a unique item effect')+'.');ccFloat(src,e.ability||'UNIQUE','heal');setStatus((e.ability||'Unique effect')+' activated.')}break;
  case'CROWD_CONTROL':if(srcChar){feed(srcChar.name+' controls a priority enemy.');if(target)ccFloat(target,'CONTROLLED','heal')}break;

  case'AFFIX_TRIGGER':feed((e.ability||'Dungeon affix')+' · '+String(e.result||'triggered').replace(/-/g,' ')+'.');break;
  case'ENEMY_REVIVED':if(target){const el=$('[data-cc="'+target+'"]');if(el)el.classList.remove('dead');ccBar(target,Number(e.payload?.targetHpPct)||35);ccFloat(target,'RETURNS','incoming');feed('Necromantic returns an enemy to the fight.')}break;
  case'PLAYER_MISTAKE':if(srcChar)feed(srcChar.name+' '+(e.payload?.detail||'makes an execution mistake')+'.');break;
  case'PLAYER_REVIVED':
   if(target&&targetChar){const pct=Math.max(1,Math.min(100,Number(e.payload?.targetHpPct)||35)),el=$('[data-cc="'+target+'"]');if(el)el.classList.remove('dead');run.hp[targetChar.id]=pct;ccBar(target,pct);ccFloat(target,'BATTLE REZ','heal');feed(targetChar.name+' is brought back by '+(srcChar?.name||'the healer')+'.');ccResourceVisual({source:e.target,payload:{resource:e.payload?.resource,value:e.payload?.resourceValue,max:e.payload?.resourceMax}})}
   break;
  case'RESOURCE_STATE':case'RESOURCE_SPENT':case'RESOURCE_GAINED':ccResourceVisual(e);break;
  case'THREAT_GENERATED':
   if(srcChar){run.threat[srcChar.id]=Number(e.payload?.total)||0;ccRenderMeters()}break;
  case'AGGRO_CHANGED':
   run.aggro=targetChar?.id||null;if(e.payload?.threat&&typeof e.payload.threat==='object'){Object.entries(e.payload.threat).forEach(([id,v])=>{const ch=ccCharacter(id);if(ch)run.threat[ch.id]=Number(v)||0})}ccRenderMeters();
   if(targetChar&&role(targetChar)!=='tank')feed(targetChar.name+' pulls aggro from the Tank.');
   break;
  case'MECHANIC_TELEGRAPH':
   setStatus((e.ability||'Mechanic')+' incoming…');feed((e.ability||'A mechanic')+' is telegraphed.');ccMechanicFromEvent(e);break;
  case'MECHANIC_RESOLVE':ccClearMechanic(e.payload?.token,true);/* Engine events own return-to-formation movement. */break;
  case'CAST_START':if(String(e.result||'')==='enemy'){ccCastStart(e.ability||'Enemy Cast',e.payload?.duration)}if(e.payload?.interruptible)feed((e.ability||'Cast')+' can be interrupted.');break;
  case'CAST_FINISH':ccCastClear();break;
  case'INTERRUPT':
   if(e.result==='success'){window.CellboundCombatFX?.interrupt?.($('[data-cc="'+target+'"]')||$('#cc2dArena'));feed((srcChar?.name||'A player')+' interrupts '+(e.payload?.interruptedAbility||'the cast')+'.');setStatus('Interrupt successful.');ccCastClear();ccClearMechanic(e.payload?.token,false)}
   break;
  case'ADD_SPAWNED':ccAddSpawn(e);window.CellboundCombatFX?.spawn?.($('[data-cc="'+target+'"]')||$('#cc2dArena'));feed((e.payload?.name||'An add')+' enters the encounter.');break;
  case'ADD_DEFEATED':case'ENEMY_DEFEATED':
   if(target){const el=$('[data-cc="'+target+'"]');if(el){el.classList.add('dead');window.CellboundCombatFX?.death?.(el,{boss:e.type==='ENEMY_DEFEATED'&&['boss','final'].includes(String(STAGES[run.stage]?.kind||''))});ccBar(target,0)}}break;
  case'PLAYER_DEFEATED':
   if(target){const el=$('[data-cc="'+target+'"]');if(el){el.classList.add('dead');window.CellboundCombatFX?.death?.(el)}ccBar(target,0);if(targetChar){run.hp[targetChar.id]=0;feed(targetChar.name+' is defeated.');ccUpdateSidebar()}}
   break;
  case'DEFENSIVE_ACTIVATED':if(srcChar)feed(srcChar.name+' activates a defensive.');break;
  case'COMBAT_END':ccCastClear();setStatus(e.result==='victory'?'Path clear.':'Party defeated.');if(e.result==='victory')window.CellboundCombatFX?.victory?.($('#cc2dArena'));else window.CellboundFX?.wipe?.('The party has fallen inside Chaos Canyon.');break;
 }
}
async function ccPlayTimeline(result,tok){
 const events=(result?.events||[]).slice().sort((a,b)=>(Number(a.timestamp)||0)-(Number(b.timestamp)||0));
 if(!run)return false;run.telegraphs={};
 if(!events.length)return result?.outcome==='victory';
 return await new Promise(resolve=>{
   let index=0,simTime=0,wallAnchor=Number(run?.runtimeStageStartedAt)||Date.now(),simAnchor=0,lastSpeed=null,finished=false,raf=0;
   const finish=value=>{if(finished)return;finished=true;if(raf)cancelAnimationFrame(raf);resolve(value)};
   const frame=()=>{
     if(finished)return;
     if(tok!==token||!run){finish(false);return}
     const speed=Math.max(.25,Number(run.speed)||1);
     if(lastSpeed===null)lastSpeed=speed;
     else if(lastSpeed!==speed){simAnchor=simTime;wallAnchor=Date.now();lastSpeed=speed}
     simTime=Math.max(simTime,simAnchor+Math.max(0,Date.now()-wallAnchor)*speed);
     const frameStarted=performance.now();let handled=0;
     while(index<events.length&&(Number(events[index].timestamp)||0)<=simTime+4&&handled<36&&performance.now()-frameStarted<9){
       const event=events[index++];handled++;
       try{ccRenderRebornEvent(event)}
       catch(error){console.error('Chaos Canyon combat visual recovered',event?.type||'UNKNOWN_EVENT',event?.ability||'',error)}
     }
     if(index>=events.length){finish(result?.outcome==='victory');return}
     raf=requestAnimationFrame(frame)
   };
   raf=requestAnimationFrame(frame)
 })
}
function ccStageSummary(result){
 const s=result?.summary||{},ints=s.interrupts||{},m=s.mechanics||{};
 return'<div class="cc2d-combat-summary"><small>ENCOUNTER SUMMARY</small><b>'+Math.round(Number(s.totalDamage)||0).toLocaleString()+' damage · '+Math.round(Number(s.totalHealing)||0).toLocaleString()+' healing</b><span>'+Number(s.deaths||0)+' deaths · '+Number(s.mistakes?.total||0)+' mistakes · '+Number(s.battleResurrections||0)+' battle rez · '+Number(ints.success||0)+'/'+Number(ints.attempts||0)+' interrupts · '+Number(m.avoided||0)+' mechanics avoided · '+Number(m.failed||0)+' failed</span></div>'
}

function ccFailureDiagnosis(result){
 const s=result?.summary||{},ints=s.interrupts||{},m=s.mechanics||{},players=s.players||[],causes=[],changes=[];
 const missed=Number(ints.missedCritical)||0,threat=players.reduce((n,p)=>n+(Number(p.threatLost)||0),0),avoidable=players.reduce((n,p)=>n+(Number(p.avoidableDamage)||0),0);
 if(missed){causes.push(missed+' critical interrupt'+(missed===1?' was':'s were')+' missed');changes.push('Use a stricter interrupt plan or DPS rotation.')}
 if(Number(m.failed)){causes.push(Number(m.failed)+' mechanics failed');changes.push('Use safer positioning and control the dangerous mechanics first.')}
 if(threat){causes.push(threat+' threat losses broke formation');changes.push('Use Safe pull style or a Control boss plan.')}
 if(avoidable){causes.push(Math.round(avoidable).toLocaleString()+' avoidable damage was taken')}
 const dead=[...players].filter(p=>Number(p.deaths)>0).sort((a,b)=>Number(b.deaths)-Number(a.deaths))[0];if(dead)causes.push(dead.name+' died '+dead.deaths+' time'+(dead.deaths===1?'':'s'));
 if(!causes.length){causes.push('The party failed the raw damage / healing check');changes.push('Upgrade gear or use major cooldowns earlier.')}
 return'<div class="cc2d-failure-causes"><small>PRIMARY CAUSES</small>'+causes.slice(0,3).map((x,i)=>'<p><b>'+(i+1)+'</b>'+esc(x)+'</p>').join('')+'<strong>NEXT ATTEMPT</strong>'+[...new Set(changes)].slice(0,2).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'
}
function ccProgressEarned(){
 const record=run?.endgameRecord||{},unlocks=record.newUnlocks||[],achievements=record.newAchievements||[],score=Number(record.score||run?.endgameMetrics?.scorePreview||0);
 const comparison=record.isNewBest
   ?'<span><i>★</i><b>NEW BEST · '+score.toLocaleString()+' score</b></span>'
   :record.previousBestScore?'<span><i>↔</i><b>Previous best '+Number(record.previousBestScore).toLocaleString()+' · this run '+score.toLocaleString()+'</b></span>':'';
 if(!unlocks.length&&!achievements.length&&!comparison)return'';
 return'<section class="cbr-progress-earned"><small>RUN PROGRESSION</small><h4>What changed after this clear.</h4><div>'+comparison+unlocks.map(x=>'<span><i>↗</i><b>'+esc(x)+'</b></span>').join('')+achievements.map(id=>'<span><i>◆</i><b>Achievement: '+esc(window.CellboundEndgame?.achievementName?.(id)||id)+'</b></span>').join('')+'</div></section>'
}


function ccCombatTotals(){
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
function ccCombatAnalysisHTML(){
 const t=ccCombatTotals();if(!run?.history?.length)return'';
 const mins=Math.floor(t.duration/60),secs=Math.round(t.duration%60),time=(mins?mins+'m ':'')+secs+'s';
 const mistakeLabels={movement:'movement',interrupt:'interrupt',threat:'threat',tank:'tank',triage:'triage',defensive:'defensive'};
 const rows=t.players.sort((a,b)=>b.damage-a.damage).map(p=>{
  const mistakeTop=Object.entries(p.mistakesByType||{}).sort((a,b)=>b[1]-a[1])[0],mistakeCopy=p.mistakes?(p.mistakes+' mistake'+(p.mistakes===1?'':'s')+(mistakeTop?' · '+(mistakeLabels[mistakeTop[0]]||mistakeTop[0])+' '+mistakeTop[1]:'')):'Clean execution';
  return'<div class="cbr-analysis-row"><i class="cb2d-dot '+('class-'+String(p.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-'))+'"></i><span><b>'+esc(p.name)+'</b><small>'+esc(p.class)+' · '+mistakeCopy+' · Avoidable '+Math.round(p.avoidableDamage)+' · Interrupts '+p.interrupts+'/'+p.interruptAttempts+(p.battleResurrections?' · Battle rez '+p.battleResurrections:'')+'</small></span><strong>'+Math.round(p.damage).toLocaleString()+' dmg</strong></div>'
 }).join('');
 return'<section class="cbr-analysis"><div class="cbr-analysis-head"><div><small>RUN ANALYSIS</small><h4>Review damage, healing, mistakes and mechanics.</h4></div><button type="button" data-cc-replay>REPLAY FINAL FIGHT</button></div><div class="cbr-analysis-grid"><article><span>TIME</span><b>'+time+'</b></article><article><span>DAMAGE</span><b>'+Math.round(t.damage).toLocaleString()+'</b></article><article><span>HEALING</span><b>'+Math.round(t.healing).toLocaleString()+'</b></article><article><span>AVOIDABLE</span><b>'+Math.round(t.avoidableDamage).toLocaleString()+'</b></article><article><span>MISTAKES</span><b>'+t.mistakes+'</b></article><article><span>DEATHS</span><b>'+t.deaths+'</b></article><article><span>COMBAT REZ</span><b>'+t.battleResurrections+'</b></article><article><span>OOC REVIVES</span><b>'+t.outOfCombatRevives+'</b></article><article><span>INTERRUPTS</span><b>'+t.interrupts+'/'+t.attempts+'</b></article><article><span>MECHANICS</span><b>'+t.avoided+'✓ · '+t.failed+'✕</b></article></div><div class="cbr-analysis-list">'+rows+'</div></section>'
}
async function ccReplayFinalFight(){
 const h=(run?.history||[]).slice(-1)[0];if(!h?.events?.length)return;
 const s=STAGES.find(x=>x.id===h.stageId)||STAGES[STAGES.length-1],end=$('#cc2dEnd'),savedHp={...run.hp};
 if(end)end.hidden=true;
 Object.entries(h.startHp||{}).forEach(([id,v])=>run.hp[id]=Number(v)||0);
 spawnStage(s);ccUpdateSidebar();setStatus('Replay · final fight');feed('Replay uses the original fight.');
 await ccPlayTimeline(h,token);
 run.hp=savedHp;ccUpdateSidebar();if(end)end.hidden=false
}

async function ccFail(s,result){
 run.done=true;Game.applyPartyCellShock?.(25);const st=state();st.activity.push('The guild wiped in Chaos Canyon at '+s.title+'. All five gained 25% Cell Shock.');Game.save?.();await Game.persistState?.();
 const end=$('#cc2dEnd');end.hidden=false;end.className='cb2d-end cb2d-results-screen';$('.cc2d-shell')?.classList.add('results-mode');end.innerHTML='<div><small>EXPEDITION FAILED</small><h3>Wipe at '+esc(s.title)+'.</h3><p>All five adventurers gained 25% Cell Shock. Mastery records and the cause of the wipe are retained.</p></div>'+ccFailureDiagnosis(result)+ccStageSummary(result)+'<button data-return>RETURN TO DUNGEON JOURNAL →</button>';end.querySelector('[data-return]').onclick=close
}
async function ccFailNoHealer(s,result){
 run.done=true;Game.applyPartyCellShock?.(25);const st=state();st.activity.push('The Chaos Canyon expedition ended after '+s.title+' because no healer was available to revive fallen adventurers. All five gained 25% Cell Shock.');Game.save?.();await Game.persistState?.();
 const end=$('#cc2dEnd');if(!end)return;end.hidden=false;end.className='cb2d-end cb2d-results-screen';$('.cc2d-shell')?.classList.add('results-mode');end.innerHTML='<div><small>EXPEDITION FAILED</small><h3>No healer available after '+esc(s.title)+'.</h3><p>The encounter was won, but fallen adventurers could not be revived between fights. All five gained 25% Cell Shock.</p></div>'+ccFailureDiagnosis(result)+ccStageSummary(result)+'<button data-return>RETURN TO DUNGEON JOURNAL →</button>';end.querySelector('[data-return]').onclick=close
}

async function ccRecoverFallen(tok){
 let fallen=party().filter(c=>(Number(run.hp[c.id])||0)<=0);if(!fallen.length)return true;
 let healer=party().find(c=>role(c)==='healer'&&(Number(run.hp[c.id])||0)>0);
 if(!healer){
   healer=party().find(c=>role(c)==='healer');if(!healer)return false;
   feed(healer.name+' releases and returns from the previous checkpoint.');setStatus('Healer returning to the group…');await wait(550);if(tok!==token)return false;
   ccAdvanceCooldowns(15000);run.hp[healer.id]=35;run.reviveSickness[healer.id]=15000;const hid=ccRenderId('p-'+healer.id),hel=$('[data-cc="'+hid+'"]');hel?.classList.remove('dead');ccBar(hid,35);
   fallen=party().filter(c=>(Number(run.hp[c.id])||0)<=0);ccUpdateSidebar()
 }
 for(const member of fallen){
   if(member.id===healer.id)continue;
   const now=Number(run.expeditionTimeMs)||0,ready=Number(run.reviveReadyAt)||0;
   if(ready>now){feed('The party regroups while Revive recharges.');await wait(450);ccAdvanceCooldowns(ready-now)}
   setStatus(healer.name+' is reviving '+member.name+'…');feed(healer.name+' begins Revive on '+member.name+'.');await wait(700);if(tok!==token)return false;
   run.hp[member.id]=35;run.reviveSickness[member.id]=15000;const id=ccRenderId('p-'+member.id),el=$('[data-cc="'+id+'"]');el?.classList.remove('dead');ccBar(id,35);ccFloat(id,'REVIVED','heal');
   run.outOfCombatRevives=(Number(run.outOfCombatRevives)||0)+1;ccAdvanceCooldowns(4000);run.reviveReadyAt=run.expeditionTimeMs+45000;ccUpdateSidebar();feed(member.name+' is back on their feet.')
 }
 return true
}

function ccRouteMarkup(current,puzzle=false){return ROUTE.map((x,i)=>{const currentIndex=puzzle?3:ROUTE.findIndex(r=>r.id===current);return'<span class="'+(i<currentIndex?'done':i===currentIndex?'current':'')+'"><i>'+(i+1)+'</i>'+esc(x.title)+'</span>'}).join('')}
function ccScarPct(){return Math.min(40,Math.max(0,Number(run?.chaosScar)||0)*5)}
function ccUpdateScar(){const e=$('#cc2dScar');if(!e)return;const pct=ccScarPct();e.hidden=!pct;e.innerHTML=pct?'<small>CHAOS SCAR · DEBUFF</small><b>+'+pct+'% DAMAGE TAKEN</b><span>Ends when the Chaos Warden falls</span>':''}
function ccApplyScarStatus(){
 const scar=ccScarPct();if(!run||!scar)return;
 party().forEach(ch=>{
  const current=Array.isArray(run.statuses?.[ch.id])?run.statuses[ch.id].filter(s=>s?.id!=='chaos-scar'):[];
  current.push({id:'chaos-scar',name:'Chaos Scar',kind:'debuff',source:null,duration:600000,remainingMs:600000,effect:{incomingDamageIncrease:scar/100},persistAcrossEncounters:false});
  run.statuses[ch.id]=current
 })
}
function ccHash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function ccCorrectStone(step){return ccHash(String(run?.endgame?.seed||'chaos-canyon')+':crossing:'+step)%3}
function ccPuzzleMarkup(step,remaining){const progress=Array.from({length:7},(_,i)=>'<i class="'+(i<step?'done':i===step?'current':'')+'">'+(i+1)+'</i>').join(''),names=['LEFT','CENTRE','RIGHT'];return'<div class="cc2d-puzzle"><div class="cc2d-puzzle-head"><small>CHAOS CROSSING · STEP '+(step+1)+' / 7</small><h3>Choose the next stone</h3><p>Wrong choices collapse. Every fall adds <b>+5% damage taken</b> for the next boss.</p><div class="cc2d-puzzle-progress">'+progress+'</div></div><div class="cc2d-stone-row">'+remaining.map(i=>'<button type="button" data-cc-stone="'+i+'"><span></span><b>'+names[i]+'</b><small>STEP ON STONE</small></button>').join('')+'</div><div class="cc2d-puzzle-risk"><span>CHAOS SCAR</span><b>+'+ccScarPct()+'%</b><small>Maximum +40%</small></div></div>'}
async function runChaosCrossing(tok){
 if(tok!==token||!run)return false;const arena=$('#cc2dArena'),environment=$('#cc2dEnvironment'),units=$('#cc2dUnits'),tele=$('#cc2dTelegraphs'),fx=$('#cc2dFx'),room=$('#cc2dRoom');if(!arena)return false;
 run.puzzleActive=true;$('#cc2dTitle').textContent='Chaos Crossing';$('.cc2d-route').innerHTML=ccRouteMarkup('crossing',true);const type=$('.cc2d-caption span');if(type)type.textContent='PUZZLE';
 arena.className='cb2d-arena cc2d-arena cc2d-unified-arena canyon-live-room stage-crossing puzzle-active';arena.dataset.chaosRoom='crossing';arena.dataset.bespokeBattlefield='1';const src=CANYON_CROSSING.art;if(environment)environment.innerHTML='<img class="cc2d-room-art" src="'+src+'" alt="" decoding="async" draggable="false">';(window.CellboundLivingScenes||window.CellboundAshenLiveScenes)?.mount?.(arena,{src,profile:CANYON_CROSSING.liveProfile});ccNatureLayer(arena,'crossing');ccEnsureFade();if(run?.roomTransitionBlack){const fade=ccEnsureFade();fade?.classList.add('is-black');requestAnimationFrame(()=>requestAnimationFrame(()=>ccSetFade(false,720)));run.roomTransitionBlack=false}else ccSetFade(false,0);if(units)units.innerHTML='';if(tele)tele.innerHTML='';if(fx)fx.innerHTML='';if(room)room.innerHTML='<em>THE CHASM</em><b>Chaos Crossing</b><small>Seven unstable steps above the mist. One route holds.</small>';
 setStatus('Choose a stone to cross the chasm.');feed('The party reaches Chaos Crossing. The route ahead has no safe markings.');let overlay=document.createElement('div');overlay.id='cc2dPuzzleOverlay';arena.appendChild(overlay);
 for(let step=0;step<7;step++){if(tok!==token||!run)return false;let remaining=[0,1,2],correct=ccCorrectStone(step),crossed=false;while(!crossed){overlay.innerHTML=ccPuzzleMarkup(step,remaining);ccUpdateScar();const choice=await new Promise(resolve=>overlay.querySelectorAll('[data-cc-stone]').forEach(b=>b.onclick=()=>resolve(Number(b.dataset.ccStone))));if(tok!==token||!run)return false;const button=overlay.querySelector('[data-cc-stone="'+choice+'"]');overlay.querySelectorAll('button').forEach(b=>b.disabled=true);if(choice===correct){button?.classList.add('safe');setStatus('Stable stone — move forward.');feed('Step '+(step+1)+': the stone holds.');await wait(430);crossed=true}else{run.chaosScar=Math.min(8,(Number(run.chaosScar)||0)+1);remaining=remaining.filter(x=>x!==choice);button?.classList.add('broken');arena.classList.add('puzzle-fall');setStatus('The stone collapses — Chaos Scar increases.');feed('The party falls from step '+(step+1)+'. Chaos Scar is now +'+ccScarPct()+'% damage taken.');ccUpdateScar();await wait(650);arena.classList.remove('puzzle-fall')}}}
 overlay.innerHTML='<div class="cc2d-puzzle cc2d-puzzle-complete"><small>CHAOS CROSSING</small><h3>Other side reached</h3><p>The party carries <b>+'+ccScarPct()+'% damage taken</b> into the Chaos Warden encounter.</p></div>';setStatus('Crossing complete. The Chaos Warden waits ahead.');await wait(650);ccSetFade(true,560);await wait(600);run.roomTransitionBlack=true;overlay.remove();run.puzzleActive=false;ccUpdateScar();return true
}

async function fightStage(s,tok,index){
 // Threat belongs to the current encounter; damage/healing belong to the whole dungeon.
 run.threat=Object.fromEntries(party().map(ch=>[ch.id,0]));run.aggro=null;ccRenderMeters();
 spawnStage(s);setStatus('Entering '+s.title+'…');feed('The party enters '+s.title+'.');await wait(650);if(tok!==token)return false;
 const C=window.CellboundCombatStandard;if(!C?.simulate)throw new Error('Combat Reborn standard gateway unavailable');
 if(s.id==='warden'&&run?.chaosScar)ccApplyScarStatus();
 const combatParty=party().map((c,i)=>Object.assign({},c,{_combatHealthPct:run.hp[c.id],_combatResource:run.resources?.[c.id]||null,_combatItemLevel:Number(Game?.characterItemLevel?.(c))||Number(c.gear)||0,_combatCooldowns:run.cooldowns?.[c.id]||{},_combatStatuses:run.statuses?.[c.id]||[],_reviveSicknessMs:run.reviveSickness?.[c.id]||0,_combatPosition:ccPartyPosition(s,i)}));
 const tactics={...ccTactics,interruptPriority:ccTactics.bossPlan==='control'?'high':ccTactics.interruptPriority,addPriority:ccTactics.bossPlan==='burn'?'boss':ccTactics.addPriority,defensiveUsage:ccTactics.bossPlan==='control'?'aggressive':ccTactics.defensiveUsage,cooldownUse:ccTactics.bossPlan==='burn'?'free':ccTactics.cooldownUse};const result=C.simulate({party:combatParty,encounter:ccRebornEncounter(s),tactics,seed:[run.endgame?.seed||'chaos-canyon',s.id,index].join(':')},{zone:'chaos-canyon'});
 result.stageId=s.id;result.stageTitle=s.title;result.startHp={...run.hp};run.history.push(result);
 const won=await ccPlayTimeline(result,tok);ccResultHealth(result);
 (result?.finalState?.players||[]).forEach(p=>{
  const ch=party().find(x=>String(x.id)===String(p.characterId));if(!ch)return;
  if(p.resource)run.resources[ch.id]={name:p.resource.name,max:p.resource.max,value:p.resource.value};
  run.cooldowns[ch.id]=Object.fromEntries(Object.entries(p.cooldowns||{}).filter(([,v])=>Number(v)>0));
  run.statuses[ch.id]=ccPersistentStatuses(p,result.durationMs);
  run.reviveSickness[ch.id]=Math.max(0,(Number(p.revivePenaltyUntil)||0)-Number(result.durationMs||0))
 });
 run.expeditionTimeMs=(Number(run.expeditionTimeMs)||0)+Number(result.durationMs||0);
 if(!won){await ccFail(s,result);return false}
 if(!await ccRecoverFallen(tok)){if(tok===token&&run)await ccFailNoHealer(s,result);return false}
 party().forEach(c=>{if((run.hp[c.id]||0)>0)run.hp[c.id]=Math.min(100,(run.hp[c.id]||0)+6)});
 ccAdvanceCooldowns(5000);
 if(s.id==='warden'&&run.chaosScar){const scar=ccScarPct();feed('The Chaos Warden falls. Chaos Scar +'+scar+'% is removed.');run.chaosScar=0;ccUpdateScar()}feed(s.title+' is clear.');setStatus('Path clear.');await wait(600);return true
}

function ccPartyRows(){
 return party().map(c=>'<div class="cb2d-party-row" data-cc-side-row="'+esc(c.id)+'"><i class="cb2d-dot '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+String(role(c)).toUpperCase()+' · '+esc(c.spec)+'</small><em class="cb2d-side-hp"><i data-cc-side-hp="'+esc(c.id)+'" style="width:'+(run?.hp?.[c.id]!=null?Number(run.hp[c.id]):100)+'%"></i></em></span><strong>'+(run?.hp?.[c.id]!=null?Number(run.hp[c.id]):100)+' HP</strong></div>').join('')
}
function ccUpdateSidebar(){
 party().forEach(c=>{
  const row=document.querySelector('[data-cc-side-row="'+CSS.escape(String(c.id))+'"]');if(!row)return;
  const hpv=Math.max(0,Math.min(100,Number(run?.hp?.[c.id])||0)),strong=row.querySelector('strong'),bar=row.querySelector('[data-cc-side-hp]');
  if(strong)strong.textContent=Math.round(hpv)+' HP';if(bar)bar.style.width=hpv+'%'
 })
}
function ccAct(r,text){const e=document.querySelector('[data-cc-act="'+r+'"] em');if(e)e.textContent=text}
function ccRenderMeters(){
 if(!run)return;
 const damageRoot=$('#cc2dDamageMeter'),healingRoot=$('#cc2dHealingMeter'),threatRoot=$('#cc2dThreatMeter'),chars=party();
 const elapsed=Math.max(1,(run.history||[]).reduce((n,h)=>n+(Number(h.durationMs)||0),0)/1000);

 const damageRows=chars.map(ch=>({ch,value:Number(run.damageDone?.[ch.id])||0})).sort((a,b)=>b.value-a.value);
 const maxDamage=Math.max(1,...damageRows.map(x=>x.value)),damageTotal=damageRows.reduce((n,x)=>n+x.value,0);
 const damageTotalEl=$('#cc2dDamageTotal');if(damageTotalEl)damageTotalEl.textContent=damageTotal.toLocaleString()+' total';
 if(damageRoot)damageRoot.innerHTML=damageRows.map(({ch,value},i)=>'<div class="cb2d-meter-row '+classKey(ch)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(ch.name)+'</b><span>'+Math.round(value).toLocaleString()+' · '+Math.round(value/elapsed)+' DPS</span></div><em><i style="width:'+(value/maxDamage*100)+'%"></i></em></div>').join('');

 const healingRows=chars.map(ch=>({ch,value:Number(run.healingDone?.[ch.id])||0,over:Number(run.overhealing?.[ch.id])||0})).sort((a,b)=>b.value-a.value);
 const maxHealing=Math.max(1,...healingRows.map(x=>x.value)),healingTotal=healingRows.reduce((n,x)=>n+x.value,0);
 const healingTotalEl=$('#cc2dHealingTotal');if(healingTotalEl)healingTotalEl.textContent=healingTotal.toLocaleString()+' total';
 if(healingRoot)healingRoot.innerHTML=healingRows.map(({ch,value,over},i)=>'<div class="cb2d-meter-row '+classKey(ch)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(ch.name)+'</b><span>'+Math.round(value).toLocaleString()+' · '+Math.round(value/elapsed)+' HPS · '+Math.round(over).toLocaleString()+' overheal</span></div><em><i style="width:'+(value/maxHealing*100)+'%"></i></em></div>').join('');

 const threatMap=run.threat||{},threatRows=chars.map(ch=>({ch,value:Number(threatMap[ch.id])||0})).sort((a,b)=>b.value-a.value),maxThreat=Math.max(1,...threatRows.map(x=>x.value));
 const target=$('#cc2dThreatTarget');if(target)target.textContent=run.aggro?(chars.find(ch=>String(ch.id)===String(run.aggro))?.name||'Party target'):'No target';
 if(threatRoot)threatRoot.innerHTML=threatRows.some(x=>x.value>0)?threatRows.map(({ch,value},i)=>'<div class="cb2d-meter-row '+classKey(ch)+(String(ch.id)===String(run.aggro)?' aggro':'')+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(ch.name)+(String(ch.id)===String(run.aggro)?' <strong>AGGRO</strong>':'')+'</b><span>'+Math.round(value).toLocaleString()+' · '+Math.round(value/maxThreat*100)+'%</span></div><em><i style="width:'+(value/maxThreat*100)+'%"></i></em></div>').join(''):'<div class="cb2d-meter-empty">Threat appears when combat begins.</div>'
}
function ccCastStart(name,duration){
 const panel=$('#cc2dCastPanel'),label=$('#cc2dCastName'),time=$('#cc2dCastTime'),fill=$('#cc2dCastFill');if(panel)panel.hidden=false;if(label)label.textContent=name||'Enemy cast';if(time)time.textContent=((Number(duration)||0)/1000).toFixed(1)+'s';if(fill){fill.style.transition='none';fill.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!fill.isConnected)return;fill.style.transition='width '+Math.max(.1,(Number(duration)||500)/1000/(run?.speed||1))+'s linear';fill.style.width='100%'}))}
}
function ccCastClear(){const panel=$('#cc2dCastPanel'),label=$('#cc2dCastName'),time=$('#cc2dCastTime'),fill=$('#cc2dCastFill');if(panel)panel.hidden=false;if(label)label.textContent='—';if(time)time.textContent='—';if(fill){fill.style.transition='none';fill.style.width='0%'}}
function ccOverride(kind,button){
 if(!run)return;if(button){button.classList.add('active');setTimeout(()=>button.classList.remove('active'),450)}
 if(kind==='focus'){ccTactics.bossPlan='burn';ccAct('dps','Focusing priority target');feed('Override: focus priority target.')}
 if(kind==='interrupt'){ccTactics.interruptPriority='high';ccAct('dps','Interrupt priority raised');feed('Override: interrupt priority raised.')}
 if(kind==='defensive'){party().forEach(ch=>run.hp[ch.id]=Math.min(100,(Number(run.hp[ch.id])||0)+5));ccUpdateSidebar();ccAct('tank','Defensives committed');feed('Override: defensive cooldowns committed.')}
 if(kind==='burn'){ccTactics.bossPlan='burn';ccAct('dps','Damage cooldowns committed');feed('Override: burn boss.')}
 if(kind==='consumable'){
   const helper=window.CellboundDungeon2D,used=helper?.useCombatPotion?.({state:state(),members:party(),getHp:c=>Number(run.hp[c.id])||0,setHp:(c,v)=>{run.hp[c.id]=v}});
   if(!used?.ok){feed(used?.reason==='full'?'The party is already at full health.':'No combat potions remain. Craft or buy one before the next run.');helper?.refreshCombatPotionButton?.(button,state());return}
   ccUpdateSidebar();helper?.refreshCombatPotionButton?.(button,state());feed(used.item.name+' restores '+used.target.name+' for '+used.healApplied+' HP.')
 }
}
function ccLootRarityClass(item){return 'rarity-'+String(item?.rarity||'common').toLowerCase().replace(/[^a-z0-9-]/g,'')}
function ccLootGearCard(item,label='DUNGEON DROP'){
 const art=G?.artHTML?G.artHTML(item,72):(item?.icon||'◇'),stats=G?.statLines?.(item)||[],set=item?.setName?'<div class="cb2d-loot-set"><b>'+esc(item.setName)+'</b>'+(G?.setBonusLines?.(item)||[]).map(x=>'<span>'+x.threshold+'pc · '+esc(x.short)+'</span>').join('')+'</div>':'',effect=item?.uniqueEffect?'<strong class="cb2d-loot-unique">'+esc(item.uniqueEffect.name)+' · '+esc(item.uniqueEffect.description)+'</strong>':'';
 return '<article class="cb2d-loot-item '+ccLootRarityClass(item)+'"><div class="cb2d-loot-art">'+art+'</div><div><small>'+esc(String(item?.rarity||label).toUpperCase())+' · '+esc(item?.slot||'ITEM')+'</small><h4>'+esc(item?.name||'Unknown Item')+'</h4><p>Item Level '+(Number(item?.itemLevel)||0)+(item?.power?' · +'+Number(item.power)+' Power':'')+'</p><div class="cb2d-loot-roll">'+stats.map(s=>'<span>'+esc(s.text)+'</span>').join('')+'</div>'+set+effect+'<em>Sent to Guild Bank</em></div></article>'
}
function ccLootMaterialCard(m){
 const art=P?.materialArtHTML?P.materialArtHTML(m.key,44,'cb2d-material-art'):'◇';
 return '<article class="cb2d-loot-material"><strong class="cb2d-loot-material-art">'+art+'</strong><div><small>'+esc(String(m.rarity||'MATERIAL').toUpperCase())+'</small><h4>'+esc(m.name)+'</h4><p>'+esc(m.source||'Chaos Canyon')+'</p></div><b>×'+Number(m.quantity||0)+'</b></article>'
}
function ccXpCard(x){
 const ch=party().find(c=>c.name===x.name),portrait=ch?.portrait||String(x.name||'?').slice(0,2).toUpperCase(),start=Math.max(0,Math.min(100,x.beforeXp/Math.max(1,x.beforeNeed)*100)),end=Math.max(0,Math.min(100,x.afterXp/Math.max(1,x.afterNeed)*100));
 return '<article class="cb2d-xp-card" data-cc-xp data-start="'+start.toFixed(2)+'" data-end="'+end.toFixed(2)+'" data-levels="'+Number(x.levels||0)+'"><div class="cb2d-xp-avatar">'+esc(portrait)+'</div><div class="cb2d-xp-copy"><div><span><b>'+esc(x.name)+'</b><small>Level '+x.beforeLevel+(x.afterLevel!==x.beforeLevel?' → '+x.afterLevel:'')+'</small></span>'+(x.capped?'<em class="cb2d-level-up">MAX LEVEL</em>':x.levels?'<em class="cb2d-level-up">LEVEL UP</em>':'<em>+'+(run?.xpReward||XP)+' XP</em>')+'</div><div class="cb2d-xp-bar"><i style="width:'+start.toFixed(2)+'%"></i></div><p><span>'+x.beforeXp+' / '+x.beforeNeed+' XP</span><strong>+'+(run?.xpReward||XP)+' XP</strong><span>'+x.afterXp+' / '+x.afterNeed+' XP</span></p></div></article>'
}
function ccAnimateXp(rootEl){
 [...(rootEl?.querySelectorAll('[data-cc-xp]')||[])].forEach((row,index)=>{const bar=row.querySelector('.cb2d-xp-bar i'),end=Number(row.dataset.end)||0,levels=Number(row.dataset.levels)||0;if(!bar)return;setTimeout(()=>{if(!levels){bar.style.width=end+'%';return}bar.style.width='100%';setTimeout(()=>{row.classList.add('levelled');bar.style.transition='none';bar.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!bar.isConnected)return;bar.style.transition='width .8s cubic-bezier(.2,.75,.25,1)';bar.style.width=end+'%'}))},760)},220+index*90)})
}

function draw(){
 const s=STAGES[run.stage],r=root();r.hidden=false;
 r.innerHTML='<section class="cb2d-shell cc2d-unified-shell"><header class="cb2d-head"><div><small>CHAOS CANYON · LIVE 2D DUNGEON</small><h2 id="cc2dTitle">'+esc(s.title)+'</h2></div><div class="cb2d-live"><i></i>LIVE <button data-speed>1×</button><button data-close aria-label="Close dungeon">×</button></div></header>'+
 '<div class="cb2d-route cc2d-route">'+ccRouteMarkup(s.id,false)+'</div>'+
 '<div class="cb2d-layout"><main><div class="cb2d-arena cc2d-arena cc2d-unified-arena" id="cc2dArena"><div class="cb2d-floor cc2d-floor"></div><div class="cc2d-environment" id="cc2dEnvironment"></div><div class="cb2d-ground-legend"><span class="danger">RED · MOVE / AVOID</span><span class="spawn">AMBER · SPAWN / PRIORITY</span><span class="aggro">GOLD LINK · AGGRO</span></div><div id="cc2dTelegraphs"></div><div id="cc2dUnits"></div><div id="cc2dFx"></div><div class="cc2d-room cb2d-room-tag" id="cc2dRoom"></div><div class="cc2d-scar" id="cc2dScar" hidden></div><div class="cb2d-caption cc2d-caption"><span>'+esc(s.kind)+'</span><b id="cc2dStatus">Descending…</b></div></div>'+
 '<div class="cb2d-controls"><button data-cc-override="focus"><b>FOCUS TARGET</b><small>Force priority damage.</small></button><button data-cc-override="interrupt"><b>INTERRUPT NOW</b><small>Raise interrupt priority.</small></button><button data-cc-override="defensive"><b>DEFENSIVE</b><small>Stabilise the group.</small></button><button data-cc-override="burn"><b>BURN BOSS</b><small>Commit damage cooldowns.</small></button><button data-cc-override="consumable"><b>USE CONSUMABLE</b><small>Use available stock.</small></button></div>'+
 '<div class="cb2d-feed cc2d-unified-feed"><small>COMBAT FEED</small><div id="cc2dFeed"></div></div></main>'+
 '<aside><div class="cb2d-cast" id="cc2dCastPanel"><small>ENEMY CAST</small><div><b id="cc2dCastName">—</b><strong id="cc2dCastTime">—</strong></div><div class="cb2d-castbar"><i id="cc2dCastFill"></i></div></div>'+
 '<div class="cb2d-combat-meters"><section class="cb2d-meter-panel damage"><div class="cb2d-meter-head"><small>DAMAGE METER</small><span id="cc2dDamageTotal">0 total</span></div><div id="cc2dDamageMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel healing"><div class="cb2d-meter-head"><small>HEALING METER</small><span id="cc2dHealingTotal">0 total</span></div><div id="cc2dHealingMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel threat"><div class="cb2d-meter-head"><small>THREAT METER</small><span id="cc2dThreatTarget">No target</span></div><div id="cc2dThreatMeter" class="cb2d-meter-list"></div></section></div>'+
 '<div class="cb2d-actions"><small>PARTY ACTIONS</small><div data-cc-act="tank"><i class="cb2d-dot tank"></i><b>Tank</b><em>Taking point</em></div><div data-cc-act="healer"><i class="cb2d-dot healer"></i><b>Healer</b><em>Following formation</em></div><div data-cc-act="dps"><i class="cb2d-dot dps"></i><b>Damage</b><em>Acquiring targets</em></div></div>'+
 '<div class="cb2d-party"><small>PARTY CONDITION · ILVL '+ilvl()+'</small><div id="cc2dRows">'+ccPartyRows()+'</div></div>'+
 '<div class="cb2d-plan"><small>EXPEDITION STYLE</small><b>'+esc(String(ccTactics.strategyPreset||'balanced').toUpperCase())+'</b><span>Same combat rules · Chaos Canyon encounter mechanics</span></div></aside></div>'+
 '<div id="cc2dEnd" class="cb2d-end" hidden></div></section>';
 r.querySelector('[data-close]').onclick=()=>{if(run&&!run.done&&!confirm('Leave Chaos Canyon?'))return;close()};
 r.querySelector('[data-speed]').onclick=e=>{run.speed=run.speed===2?1:2;e.currentTarget.textContent=run.speed+'×'};
 r.querySelectorAll('[data-cc-override]').forEach(b=>b.onclick=()=>ccOverride(b.dataset.ccOverride,b));
 window.CellboundDungeon2D?.refreshCombatPotionButton?.(r.querySelector('[data-cc-override="consumable"]'),state());
 stageEnvironment(s);ccRenderMeters();ccUpdateSidebar();feed('The party enters Chaos Canyon.')
}
function ccRunMetrics(){
 const totals=run.history.reduce((o,r)=>{const s=r.summary||{};o.combat+=Number(r.durationMs)||0;o.deaths+=Number(s.deaths)||0;o.failed+=Number(s.mechanics?.failed)||0;o.mistakes+=Number(s.mistakes?.total)||0;o.missedInterrupts+=Number(s.interrupts?.missedCritical)||0;o.battleResurrections+=Number(s.battleResurrections)||0;(s.players||[]).forEach(p=>{o.threatLosses+=Number(p.threatLost)||0;o.avoidableDamage+=Number(p.avoidableDamage)||0});return o},{combat:0,deaths:0,failed:0,mistakes:0,missedInterrupts:0,threatLosses:0,avoidableDamage:0,battleResurrections:0});
 const pace=ccTactics.pullStyle==='aggressive'?.82:ccTactics.pullStyle==='safe'?1.20:1,timeMs=Math.max(35000,totals.combat*4+Math.round(STAGES.length*60000*pace));
 return{timeMs,deaths:totals.deaths,mechanicsFailed:totals.failed,mistakes:totals.mistakes,missedInterrupts:totals.missedInterrupts,threatLosses:totals.threatLosses,avoidableDamage:totals.avoidableDamage,battleResurrections:totals.battleResurrections,scorePreview:window.CellboundEndgameData?.scorePreview?.({difficulty:run.endgame?.difficulty||'normal',tier:run.endgame?.tier||0,timeMs,targetTimeMs:run.endgame?.targetTimeMs||0,deaths:totals.deaths,mechanicsFailed:totals.failed,mistakes:totals.mistakes})||0}
}
function ccFormatTime(ms){const t=Math.max(0,Math.round((Number(ms)||0)/1000)),m=Math.floor(t/60),s=t%60;return m+':'+String(s).padStart(2,'0')}
function ccRuntimeRun(){
 if(!run)return null;
 return{
  stage:Number(run.stage)||0,done:Boolean(run.done),speed:Number(run.speed)||1,log:(run.log||[]).slice(-30),
  damageDone:{...(run.damageDone||{})},healingDone:{...(run.healingDone||{})},overhealing:{...(run.overhealing||{})},
  threat:{...(run.threat||{})},aggro:run.aggro||null,endgame:{...(run.endgame||{})},hp:{...(run.hp||{})},
  resources:JSON.parse(JSON.stringify(run.resources||{})),cooldowns:JSON.parse(JSON.stringify(run.cooldowns||{})),
  statuses:JSON.parse(JSON.stringify(run.statuses||{})),reviveSickness:{...(run.reviveSickness||{})},
  expeditionTimeMs:Number(run.expeditionTimeMs)||0,reviveReadyAt:Number(run.reviveReadyAt)||0,
  outOfCombatRevives:Number(run.outOfCombatRevives)||0,chaosScar:Number(run.chaosScar)||0,vorranShrink:Number(run.vorranShrink)||0,
  history:(run.history||[]).map(h=>({stageId:h.stageId,stageTitle:h.stageTitle,startHp:h.startHp,durationMs:h.durationMs,summary:h.summary,outcome:h.outcome}))
 }
}
async function ccSaveRuntime(phase='stage'){
 if(!run?.endgame?.attemptId)return;
 await window.CellboundEndgame?.saveRuntime?.('chaos-canyon',{
  version:1,kind:'chaos-canyon',phase,stage:Number(run.stage)||0,
  stageStartedAt:Number(run.runtimeStageStartedAt)||0,tactics:{...ccTactics},run:ccRuntimeRun()
 })
}
function ccRestoreRuntime(attempt){
 const snap=attempt?.runtimeState||{},saved=snap.run||{};
 Object.assign(ccTactics,snap.tactics||{});
 run={...saved,telegraphs:{},runtimeStageStartedAt:Number(snap.stageStartedAt)||Date.now(),_restored:true};
 run.endgame={...(saved.endgame||{}),attemptId:attempt.attemptId,seed:attempt.seed,difficulty:attempt.difficulty,tier:Number(attempt.tier)||0,targetTimeMs:Number(attempt.targetTimeMs)||Number(saved.endgame?.targetTimeMs)||0,dungeonVersion:Number(attempt.dungeonVersion)||Number(saved.endgame?.dungeonVersion)||2};
 return run
}
async function ccTravelDeeper(currentStage,tok){
 if(tok!==token||!run)return;
 const arena=$('#cc2dArena'),room=CANYON_ROOMS[currentStage?.id]||CANYON_ROOMS['canyon-mouth'],route=room.route||{},path=Array.isArray(route.exitPath)?route.exitPath:[],chars=party(),spread=Number(route.spread)||2;
 if(!path.length)return;
 arena?.classList.add('travelling');setStatus('Path clear · moving deeper into Chaos Canyon');
 const pos=Object.fromEntries(chars.map((c,i)=>{const e=$('[data-cc="p'+i+'"]');return[c.id,{x:Number.parseFloat(e?.style.left)||50,y:Number.parseFloat(e?.style.top)||50}]}));
 const centroid=chars.reduce((a,c)=>{a.x+=pos[c.id].x;a.y+=pos[c.id].y;return a},{x:0,y:0});centroid.x/=Math.max(1,chars.length);centroid.y/=Math.max(1,chars.length);
 let start=0,best=Infinity;path.forEach((p,i)=>{const d=Math.hypot(Number(p.x)-centroid.x,Number(p.y)-centroid.y);if(d<best){best=d;start=i}});if(start>0&&best>18)start=0;
 const active=path.slice(start);
 for(let step=0;step<active.length;step++){
  const point=active[step],from=step===0?centroid:active[step-1],to=active[Math.min(step+1,active.length-1)]||point,finalStep=step===active.length-1,duration=finalStep?560:390;
  if(finalStep)ccSetFade(true,duration+100);
  chars.forEach((ch,i)=>{if((Number(run.hp[ch.id])||0)<=0)return;const p=ccRouteOffset(point,from,to,i,spread);move('p'+i,p.x,p.y,duration)});
  await wait(duration+35);if(tok!==token||!run)return
 }
 run.roomTransitionBlack=true;arena?.classList.remove('travelling')
}
async function ccRunFrom(startIndex,tok){
 for(let i=Math.max(0,Number(startIndex)||0);i<STAGES.length;i++){
  if(tok!==token||!run)return;
  const resuming=Boolean(run._restored)&&i===Math.max(0,Number(startIndex)||0);
  run.stage=i;
  if(!resuming||!run.runtimeStageStartedAt)run.runtimeStageStartedAt=Date.now();
  run._restored=false;
  await ccSaveRuntime('stage');
  const s=STAGES[i];
  if(s.combatKind==='final')await window.CellboundBossDossier?.show?.('vorran');
  if(/boss/i.test(String(s.kind||s.combatKind||'')))window.CellboundFX?.boss?.(s.title);
  $('#cc2dTitle').textContent=s.title;$('.cc2d-route').innerHTML=ccRouteMarkup(s.id,false);
  if(!await fightStage(s,tok,i)){await ccSaveRuntime('failed');return}
  if(['boss','final'].includes(s.combatKind)){
    const expired=window.CellboundProfessions?.consumeBossChargesOnce?.(party(),'chaos-canyon:'+run.endgame?.attemptId+':'+s.id,state())||[];
    expired.forEach(x=>feed(x+' expired.'));Game.save?.();await Game.persistState?.()
  }
  if(i<STAGES.length-1)await ccTravelDeeper(s,tok);
  if(i===2){if(!await runChaosCrossing(tok)){await ccSaveRuntime('failed');return}}
  run.stage=i+1;run.runtimeStageStartedAt=0;await ccSaveRuntime('between')
 }
 if(tok!==token||!run)return;
 await complete()
}

async function start(){
 const gate=readiness();if(!gate.ok){briefing();return}
 const startButton=root().querySelector('[data-start]');if(startButton){startButton.disabled=true;startButton.textContent='ENTERING…'}
 await Game.persistState?.();
 const service=await ccWaitForEndgame(),eg=ccEndgameConfig(),attempt=await service?.beginOrResumeAttempt?.('chaos-canyon')||await service?.beginAttempt?.('chaos-canyon');
 if(!attempt||attempt.error){if(startButton){startButton.disabled=false;startButton.textContent='BEGIN EXPEDITION →'}alert(attempt?.error?.message||'Dungeon service is still loading. Try Begin Descent again.');return}
 token++;const tok=token,p=party();
 if(attempt.resumed&&attempt.runtimeState?.kind==='chaos-canyon'){
  ccRestoreRuntime(attempt)
 }else{
  run={stage:0,done:false,speed:1,log:[],damageDone:Object.fromEntries(p.map(ch=>[ch.id,0])),healingDone:Object.fromEntries(p.map(ch=>[ch.id,0])),overhealing:Object.fromEntries(p.map(ch=>[ch.id,0])),threat:Object.fromEntries(p.map(ch=>[ch.id,0])),aggro:null,endgame:{difficulty:eg.difficulty,tier:eg.tier||0,label:eg.diff?.name||'Normal',targetTimeMs:Number(attempt.targetTimeMs)||eg.targetTimeMs,recommendedItemLevel:eg.recommendedItemLevel,dungeonVersion:eg.dungeon?.version||2,affixes:[...(eg.affixes||[])],attemptId:attempt.attemptId,seed:attempt.seed},hp:Object.fromEntries(p.map(c=>[c.id,100])),resources:Object.fromEntries(p.map(c=>{const d=ccResourceDef(c);return[c.id,{name:d.name,max:d.max,value:d.start}]})),cooldowns:Object.fromEntries(p.map(c=>[c.id,{}])),statuses:Object.fromEntries(p.map(c=>[c.id,[]])),reviveSickness:Object.fromEntries(p.map(c=>[c.id,0])),expeditionTimeMs:0,reviveReadyAt:0,outOfCombatRevives:0,history:[],telegraphs:{},chaosScar:0,vorranShrink:0,runtimeStageStartedAt:Date.now()}
 }
 await window.CellboundExpeditionPresentation?.enter?.('chaos-canyon',{difficulty:attempt.difficulty||eg.diff?.name||'Normal'});
 draw();
 await ccRunFrom(Math.min(STAGES.length-1,Number(run.stage)||0),tok)
}
async function complete(){
 const s=state(),metrics=ccRunMetrics();run.endgameMetrics=metrics;const record=await window.CellboundEndgame?.recordRun?.('chaos-canyon',metrics);run.endgameRecord=record&&!record.error?record:null;const mode=run.endgame?.difficulty||'normal',first=Number(s.chaosCanyonCompletions||0)===0;run.xpReward=BAL?.dungeonXp?.('chaos-canyon',{difficulty:mode,firstClear:first})||(first&&mode==='normal'?5850:XP);const gains=awardXp(),tier=Number(run.endgame?.tier)||0,gearDrops=window.CellboundEndgame?.rollClearLootBundle?.('chaos-canyon','vorran')||[window.CellboundEndgame?.rollClearLoot?.('chaos-canyon','vorran',1)].filter(Boolean);
 const gold=mode==='normal'?280:mode==='heroic'?370:420+tier*14,renown=mode==='normal'?120:mode==='heroic'?160:180+tier*6;s.gold=(Number(s.gold)||0)+gold;s.renown=(Number(s.renown)||0)+renown;s.chaosCanyonCompletions=(Number(s.chaosCanyonCompletions)||0)+1;const shards=window.CellboundEndgame?.shardReward?.('chaos-canyon')||0;if(shards)Game.addMaterial?.('cell-shards',shards);const professionDrops=window.CellboundProfessions?.rollContentReagents?.('chaos-canyon',{difficulty:mode,tier})||[];professionDrops.forEach(d=>Game.addMaterial?.(d.key,d.quantity));gearDrops.forEach(item=>Game.addBankItem?.(item));
 s.activity=Array.isArray(s.activity)?s.activity:[];s.activity.push('Chaos Canyon · '+(run.endgame?.label||'Normal')+' cleared. Archdruid Vorran defeated. Score '+Number(run.endgameRecord?.score||metrics.scorePreview).toLocaleString()+'. Each adventurer earned '+(run?.xpReward||XP)+' XP.'+(gearDrops.length?' '+gearDrops.length+' equipment drops were sent to the Guild Bank.':'')+(professionDrops.length?' Profession materials: '+window.CellboundProfessions?.formatReagentDrops?.(professionDrops)+'.':''));
 Game.save?.();await Game.persistState?.();await syncXp(gains);run.done=true;window.dispatchEvent(new CustomEvent('cellbound:chaos-canyon-complete',{detail:{difficulty:mode,tier,score:run.endgameRecord?.score||metrics.scorePreview,timeMs:metrics.timeMs}}));window.dispatchEvent(new CustomEvent('cellbound:dungeon-complete',{detail:{id:'chaos-canyon',difficulty:mode,tier,score:run.endgameRecord?.score||metrics.scorePreview,timeMs:metrics.timeMs}}));
 const end=$('#cc2dEnd');end.hidden=false;end.className='cb2d-end cb2d-loot-screen cb2d-results-screen';$('.cc2d-shell')?.classList.add('results-mode');const lootGear=[...gearDrops],materials=[...(shards?[{key:'cell-shards',name:'Cell Shards',quantity:shards,source:'Endgame Reward',rarity:'Rare'}]:[]),...professionDrops.map(d=>({key:d.key,name:window.CellboundProfessions?.MATERIALS?.[d.key]?.name||d.key,quantity:d.quantity,source:'Chaos Canyon harvest',rarity:window.CellboundProfessions?.MATERIALS?.[d.key]?.rarity||'Common'}))];
 end.innerHTML='<div class="cb2d-loot-wrap"><header class="cb2d-loot-head"><div><small>CHAOS CANYON · '+esc(run.endgame?.label||'NORMAL').toUpperCase()+' · CLEARED</small><h3>Expedition Rewards</h3><p>Vorran has fallen and the canyon is quiet. Everything below has already been secured to your guild.</p></div><div class="cb2d-loot-complete">✓<span>DUNGEON<br>COMPLETE</span></div></header><div class="cb2d-loot-currency"><article><span>GOLD</span><b>+'+gold+'</b><small>Added to Guild treasury</small></article><article><span>RENOWN</span><b>+'+renown+'</b><small>Guild reputation earned</small></article><article><span>PARTY XP</span><b>+'+(run?.xpReward||XP)+'</b><small>Earned by each adventurer</small></article><article><span>GEAR DROPS</span><b>'+lootGear.length+'</b><small>Stored in Guild Bank</small></article><article><span>RUN SCORE</span><b>'+Number(run.endgameRecord?.score||metrics.scorePreview).toLocaleString()+'</b><small>'+ccFormatTime(metrics.timeMs)+' run time</small></article></div>'+ccProgressEarned()+'<section class="cb2d-loot-section cb2d-xp-section"><div class="cb2d-loot-title"><span>PARTY EXPERIENCE</span><small>Active party XP</small></div><div class="cb2d-xp-grid">'+gains.map(ccXpCard).join('')+'</div></section><section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>GEAR ACQUIRED</span><small>Sent to Guild Bank</small></div><div class="cb2d-loot-gear">'+(lootGear.length?lootGear.map(item=>ccLootGearCard(item,'DUNGEON DROP')).join(''):'<div class="cb2d-loot-empty">No gear dropped.</div>')+'</div></section>'+(materials.length?'<section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>ENDGAME MATERIALS</span><small>Available immediately</small></div><div class="cb2d-loot-materials">'+materials.map(ccLootMaterialCard).join('')+'</div></section>':'')+ccCombatAnalysisHTML()+'<footer class="cb2d-loot-actions"><button data-loot-bank>VIEW GUILD BANK</button><button class="primary" data-loot-return>RETURN HOME →</button></footer></div>';
 window.CellboundDungeonResults?.compact?.(end);ccAnimateXp(end);end.querySelector('[data-cc-replay]')?.addEventListener('click',ccReplayFinalFight);end.querySelector('[data-loot-bank]').onclick=()=>{close();Game.switchView?.('bank')};end.querySelector('[data-loot-return]').onclick=()=>{close();Game.switchView?.('overview')}
}
function init(){Game=window.CellboundGame;G=window.CellboundGear;P=window.CellboundProfessions;if(!Game?.ready){setTimeout(init,100);return}db=Game.getSupabase?.();renderCard();document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',renderCard);window.CellboundChaosCanyon={open:openDungeon,renderCard}}
init();
})();