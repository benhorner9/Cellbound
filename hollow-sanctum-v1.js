(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,G=null,P=null,run=null,token=0,requestedRunOptions=null;
let hsTactics={strategyPreset:'balanced',pullStyle:'normal',cooldownUse:'difficult',interruptPriority:'standard',interruptAssignment:'dps-rotation',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'immediate',movementDiscipline:'balanced',bossPlan:'balanced'};
const STAGES=[
 {id:'gallery',title:'Gallery of Echoes',kind:'TRASH',combatKind:'trash',level:6,enemyTypes:['trash','trash','trash'],enemyHealth:145,enemies:['Hollowed Surveyor','Hollowed Surveyor','Glass Mite'],mechanic:'Echo Burst',mechanics:[['Echo Burst','circles',1500]]},
 {id:'sentinel',title:'Glassjaw Sentinel',kind:'MINI-BOSS',combatKind:'boss',level:7,enemyTypes:['boss'],enemyHealth:750,enemies:['Glassjaw Sentinel'],mechanic:'Fracture Line',mechanics:[['Fracture Line','line',1700],['Glassjaw Sweep','cone',1450]]},
 {id:'choir',title:'The Bound Choir',kind:'FINAL BOSS',combatKind:'final',level:8,enemyTypes:['boss'],enemyHealth:1000,enemies:['The Bound Choir'],mechanic:'Resonance Collapse',mechanics:[['Resonance Collapse','circle',2100],['Shattering Hymn','interrupt',2200],['Echo Choir','adds',1200]]}
];

const HOLLOW_ROOMS={
 gallery:{
  zone:'ENTRANCE HALL',
  description:'Collapsed entrance hall lined with crystal-veined stone.',
  environment:
   '<div class="hsenv hsenv-gallery">'+
    '<div class="hsenv-depth-wall"></div>'+
    '<div class="hsenv-walkway"></div>'+
    '<div class="hsenv-arch hsenv-arch-entry"></div><div class="hsenv-arch hsenv-arch-exit"></div>'+
    '<i class="hsenv-pillar p1"></i><i class="hsenv-pillar p2"></i><i class="hsenv-pillar p3"></i><i class="hsenv-pillar p4"></i><i class="hsenv-pillar p5"></i><i class="hsenv-pillar p6"></i>'+
    '<i class="hsenv-plinth pl1"></i><i class="hsenv-plinth pl2"></i>'+
    '<span class="hsenv-crystal c1"></span><span class="hsenv-crystal c2"></span><span class="hsenv-crystal c3"></span><span class="hsenv-crystal c4"></span>'+
    '<div class="hsenv-mirror m1"></div><div class="hsenv-mirror m2"></div>'+
   '</div>',
  party:[[30,35],[30,50],[30,65],[21,42],[21,58]],
  enemies:[[66,34],[72,50],[66,66]]
 },
 sentinel:{
  zone:'GUARDIAN CHAMBER',
  description:'A broken guardian chamber built around a fractured relic core.',
  environment:
   '<div class="hsenv hsenv-sentinel">'+
    '<div class="hsenv-octagon"></div>'+
    '<div class="hsenv-ring ring1"></div><div class="hsenv-ring ring2"></div>'+
    '<div class="hsenv-pedestal"><i></i><b></b></div>'+
    '<div class="hsenv-alcove a1"></div><div class="hsenv-alcove a2"></div><div class="hsenv-alcove a3"></div><div class="hsenv-alcove a4"></div>'+
    '<div class="hsenv-statue s1"></div><div class="hsenv-statue s2"></div>'+
    '<span class="hsenv-crystal c1"></span><span class="hsenv-crystal c2"></span><span class="hsenv-crystal c3"></span>'+
   '</div>',
  party:[[42,50],[31,34],[31,66],[25,43],[25,57]],
  enemies:[[67,50]]
 },
 choir:{
  zone:'INNER SHRINE',
  description:'A shrine hall where the sanctum’s voices were chained into crystal.',
  environment:
   '<div class="hsenv hsenv-choir">'+
    '<div class="hsenv-apse"></div>'+
    '<div class="hsenv-processional"></div>'+
    '<div class="hsenv-steps step1"></div><div class="hsenv-steps step2"></div><div class="hsenv-steps step3"></div>'+
    '<div class="hsenv-dais"></div>'+
    '<div class="hsenv-ritual-ring outer"></div><div class="hsenv-ritual-ring inner"></div>'+
    '<div class="hsenv-choir-bank left"></div><div class="hsenv-choir-bank right"></div>'+
    '<div class="hsenv-reliquary"><i></i><i></i><i></i></div>'+
    '<span class="hsenv-hanging h1"></span><span class="hsenv-hanging h2"></span><span class="hsenv-hanging h3"></span><span class="hsenv-hanging h4"></span>'+
    '<span class="hsenv-crystal c1"></span><span class="hsenv-crystal c2"></span><span class="hsenv-crystal c3"></span><span class="hsenv-crystal c4"></span>'+
   '</div>',
  party:[[45,50],[31,32],[31,68],[25,42],[25,58]],
  enemies:[[71,50]]
 }
};
const RELIC={itemId:'quest-blackglass-resonator',name:'Blackglass Resonator',class:'All',classes:'all',slot:'Relic',tier:3,rarity:'Rare',tierLabel:'Quest Relic',enabled:true,dropEnabled:false,itemLevel:30,power:10,tradeState:'soulbound',questArtMaterial:'void-crystal',lore:'Recovered from The Bound Choir beneath Zeltira.'};
const XP=500;
function rollHollowGear(){
 const G=window.CellboundGear,pool=(G?.items||[]).filter(x=>x.tier===3&&x.enabled);
 if(!pool.length)return null;
 const base=pool[Math.floor(Math.random()*pool.length)];
 return G.rollItemAffixes?.({...base,source:'The Hollow Sanctum · The Bound Choir'})||{...base,source:'The Hollow Sanctum · The Bound Choir'};
}
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
function readiness(){
 const p=party();if(!unlocked())return{ok:false,reason:'The Hollow Sanctum has not been discovered. Complete Echoes Beneath Zeltira.'};
 if(p.length!==5)return{ok:false,reason:'Build a complete five-character party first.'};
 const bad=p.find(c=>Game.isUnavailable?.(c));if(bad)return{ok:false,reason:bad.name+' is still recovering from Cell Shock.'};
 if(ilvl()<24)return{ok:false,reason:'Party Item Level '+ilvl()+'. The Hollow Sanctum requires Item Level 24.'};
 return{ok:true,reason:'The seal is open.'}
}
function renderCard(){
 const card=$('#hollowDungeonCard'),mount=$('#hollowSanctumMount');if((!card&&!mount)||!Game?.ready)return;
 const q=qstate(),open=Boolean(q?.flags?.hollowSanctumUnlocked),done=Boolean(q?.flags?.hollowFirstClear),clears=Number(q?.hollowCompletions)||0,pi=ilvl(),gate=readiness();
 if(card){
  card.innerHTML='<article class="dungeon-browser-card hollow '+(open?'unlocked':'locked')+'" data-dungeon-card="hollow-sanctum">'+
   '<div class="dungeon-browser-art hollow-art"><span>'+(open?'ZELTIRA UNDERDEEP':'UNKNOWN SIGNAL')+'</span><strong>◇</strong></div>'+
   '<div class="dungeon-browser-copy"><div class="dungeon-browser-heading"><div><small>DUNGEON</small><h3>'+(open?'The Hollow Sanctum':'Undiscovered Dungeon')+'</h3></div><b id="hollowDungeonStatus">'+(open?(done?'FARMABLE':'NEWLY UNLOCKED'):'QUEST LOCKED')+'</b></div>'+
   '<p>'+(open?'An ancient crystal shrine beneath Zeltira, ending at the ritual chamber of the Bound Choir.':'Your guild has evidence of something beneath Zeltira, but the route remains sealed.')+'</p>'+
   '<div class="dungeon-browser-meta"><span>3 stages</span><span>'+(open?'iLvl 24+':'Quest discovery')+'</span><span>Party iLvl '+(pi||'—')+'</span></div>'+
   '<div class="dungeon-browser-actions"><button type="button" data-dungeon-more="hollow-sanctum">MORE INFO →</button></div></div></article>'
 }
 if(!mount)return;
 const route=[
  ['gallery','Gallery of Echoes','trash','⌁','Collapsed ceremonial entrance hall where Hollowed Surveyors guard the processional route.','ENEMY PACK'],
  ['sentinel','Glassjaw Sentinel','boss','◇','A guardian chamber built around a fractured relic core. Fracture Line and Glassjaw Sweep punish poor positioning.','ENCOUNTER'],
  ['choir','The Bound Choir','final','✦','The inner shrine. Resonance Collapse, Shattering Hymn and Echo Choir define the final fight.','FINAL BOSS']
 ];
 mount.innerHTML='<div class="dungeon-detail-toolbar"><div><small>DUNGEON JOURNAL</small><b>'+(open?'The Hollow Sanctum':'Undiscovered Dungeon')+'</b></div><button type="button" data-dungeon-close>CLOSE DETAILS ×</button></div>'+
  '<div class="dungeon-journal-hero hollow-journal-hero">'+
   '<div class="dungeon-journal-art hollow-journal-art"><span class="journal-eyebrow">'+(open?'ZELTIRA UNDERDEEP · DUNGEON':'SEALED LOCATION · UNKNOWN')+'</span><h3>'+(open?'The Hollow Sanctum':'The Sealed Underroad')+'</h3><p>'+(open?'A buried ceremonial complex where Cell glass has grown through ancient stone. The deeper chambers still answer to voices that should have died centuries ago.':'The route beneath Zeltira has not yet been opened. Complete Echoes Beneath Zeltira to discover what lies beyond the Hollow Seal.')+'</p><div class="journal-badges"><span>5 adventurers</span><span>3 stages</span><span>Party iLvl '+(pi||'—')+'</span></div></div>'+
   '<div class="journal-entry-panel"><small>ENTRY REQUIREMENT</small><b>'+(open?'Quest Access · Party Item Level 24':'Echoes Beneath Zeltira')+'</b><p>'+(open?esc(gate.reason):'Follow the investigation beneath Zeltira and break the Hollow Seal.')+'</p><button '+(open?'data-hs-enter':'data-hs-quests')+' '+(open&&!gate.ok?'disabled':'')+'>'+(open?'ENTER THE HOLLOW SANCTUM':'OPEN QUEST JOURNAL →')+'</button></div>'+
  '</div>'+
  '<div class="dungeon-journal-layout">'+
   '<article class="panel dungeon-route-panel"><div class="panel-head"><div><small>DUNGEON ROUTE</small><h3>Expedition Path</h3></div><b>3 STAGES</b></div><div class="dungeon-route">'+route.map((r,i)=>'<div class="dungeon-stage '+(done?'complete':'')+'" data-kind="'+r[2]+'"><div class="dungeon-stage-rune">'+(done?'✓':r[3])+'</div><div class="dungeon-stage-copy"><b>'+(i+1)+'. '+r[1]+'</b><small>'+r[4]+'</small></div><span class="dungeon-stage-tag">'+r[5]+'</span></div>').join('')+'</div></article>'+
   '<aside class="panel dungeon-intel-panel"><div class="panel-head"><div><small>ENCOUNTER INTELLIGENCE</small><h3>What Your Guild Knows</h3></div></div><div class="dungeon-intel">'+
    '<article class="intel-card"><div class="intel-card-head"><b>Glassjaw Sentinel</b><span>'+(done?'FIELD NOTES':'DISCOVERED')+'</span></div><p>Fracture Line targets a lane through the chamber while Glassjaw Sweep pressures the tank. Position the group around the guardian rather than stacking behind the target.</p></article>'+
    '<article class="intel-card"><div class="intel-card-head"><b>The Bound Choir</b><span>'+(done?'FIELD NOTES':'DISCOVERED')+'</span></div><p>Resonance Collapse controls space, Shattering Hymn must be interrupted, and Echo Choir adds force target swaps during the ritual.</p></article>'+
    '<article class="intel-card"><div class="intel-card-head"><b>Expedition Record</b><span>'+clears+' clear'+(clears===1?'':'s')+'</span></div><p>'+(clears?'The Hollow Seal has been breached repeatedly. The Bound Choir remains farmable across unlocked difficulties.':'No successful expedition has been recorded yet.')+'</p></article>'+
    '<article class="intel-card"><div class="intel-card-head"><b>Known Rewards</b><span>TIER 3</span></div><p>Class equipment and Void Crystals can be recovered here. The first clear awards the Blackglass Resonator relic, with endgame rewards expanding on higher difficulties.</p></article>'+
   '</div></aside>'+
  '</div>';
 mount.querySelector('[data-hs-enter]')?.addEventListener('click',openDungeon);
 mount.querySelector('[data-hs-quests]')?.addEventListener('click',()=>Game.switchView?.('quests'));
 window.CellboundDungeonBrowser?.refresh?.()
}
function hsEndgameConfig(){
 const E=window.CellboundEndgame;
 if(E?.currentConfig)return E.currentConfig('hollow-sanctum');
 return{difficulty:'normal',tier:0,diff:{name:'Normal',label:'NORMAL',description:'Learn the Hollow Sanctum.'},affixes:[],targetTimeMs:15*60*1000,recommendedItemLevel:24,dungeon:{version:2}}
}
function hsEndgamePrepMarkup(){
 const E=window.CellboundEndgame,cfg=hsEndgameConfig(),p=E?.progressFor?.('hollow-sanctum')||{},tierMax=Math.max(1,Number(p.highest_tier)||1);
 const buttons=['normal','heroic','cellbound'].map(mode=>{const unlocked=E?.difficultyUnlocked?E.difficultyUnlocked('hollow-sanctum',mode,cfg.tier||1):mode==='normal';return'<button type="button" data-hs-mode="'+mode+'" class="'+(cfg.difficulty===mode?'active':'')+'" '+(unlocked?'':'disabled')+'>'+(mode==='cellbound'?'CELLBOUND+':mode.toUpperCase())+'</button>'}).join('');
 const tier=cfg.difficulty==='cellbound'?'<label>Tier <select data-hs-tier>'+Array.from({length:tierMax},(_,i)=>i+1).map(t=>'<option value="'+t+'" '+(t===cfg.tier?'selected':'')+'>+'+t+'</option>').join('')+'</select></label>':'';
 const affixes=(cfg.affixes||[]).map(id=>window.CellboundEndgameData?.AFFIXES?.[id]?.name||id).join(' · ')||'No affixes';
 return'<div class="eg-prep-block"><small>DUNGEON DIFFICULTY</small><div class="eg-prep-tabs">'+buttons+'</div><div class="eg-prep-detail"><b>'+esc(cfg.diff?.name||'Normal')+'</b> · Recommended iLvl '+cfg.recommendedItemLevel+' · Target '+Math.floor(cfg.targetTimeMs/60000)+':'+String(Math.round(cfg.targetTimeMs/1000)%60).padStart(2,'0')+'<br>'+esc(affixes)+'<br>'+esc(cfg.diff?.description||'')+'</div>'+tier+'</div>'
}
function hsBindEndgamePrep(){
 const E=window.CellboundEndgame;
 document.querySelectorAll('[data-hs-mode]').forEach(b=>b.onclick=()=>{E?.choose?.('hollow-sanctum',b.dataset.hsMode);briefing()});
 $('[data-hs-tier]')?.addEventListener('change',e=>{E?.choose?.('hollow-sanctum','cellbound',Number(e.target.value));briefing()})
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
function hsStrategyMarkup(){
 return '<div class="eg-prep-block"><small>EXPEDITION STYLE</small>'+
 '<div class="eg-prep-detail">Choose one overall plan. Interrupts, crowd control, cooldowns, adds, defensives and movement are handled automatically.</div>'+
 hsStrategyButtons('strategyPreset',[['safe','SAFE','Control'],['balanced','BALANCED','Standard'],['aggressive','AGGRESSIVE','Fast']])+
 '</div>';
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
 const gate=readiness(),r=root();r.hidden=false;document.body.classList.add('hs2d-open');
 if(!gate.ok){
   r.innerHTML='<section class="cb2d-shell cb2d-brief hs2d-unified-shell"><header class="cb2d-head"><div><small>THE HOLLOW SANCTUM · ENTRY CHECK</small><h2>Dungeon entry is currently blocked.</h2></div><button data-close>×</button></header><div class="cb2d-blocked"><b>NOT READY</b><p>'+esc(gate.reason)+'</p><button data-action>'+(unlocked()?'OPEN PARTY BUILDER':'OPEN QUEST JOURNAL')+' →</button></div></section>';
   r.querySelector('[data-close]').onclick=close;r.querySelector('[data-action]').onclick=()=>{close();Game.switchView?.(unlocked()?'party':'quests')};return
 }
 r.innerHTML='<section class="cb2d-shell cb2d-brief hs2d-unified-shell"><header class="cb2d-head"><div><small>THE HOLLOW SANCTUM · LEVELS 6–8 · ILVL 24+ · TACTICAL BRIEFING</small><h2>Set the plan once. Then watch the dungeon run.</h2></div><button data-close>×</button></header><div class="cb2d-brief-grid"><main><p class="cb2d-intro">The Hollow Sanctum uses the same combat rules as every dungeon. Only its rooms, enemies and encounter mechanics change.</p>'+hsEndgamePrepMarkup()+'<h3>Expedition Style</h3><p class="cb2d-intro">Choose the overall approach. Your party handles interrupts, crowd control, cooldowns, adds, defensives and movement automatically from this plan.</p>'+hsStrategyButtons('strategyPreset',[['safe','SAFE','Slower pulls, earlier defensives and stronger mechanic control.'],['balanced','BALANCED','Standard pace with sensible reactions to danger.'],['aggressive','AGGRESSIVE','Faster pulls, freer cooldown use and more boss pressure.']])+'<h3>Encounter Intelligence</h3><div class="hs2d-intel"><span><b>Gallery of Echoes</b><small>Moving packs and pulse damage</small></span><span><b>Glassjaw Sentinel</b><small>Line fractures across the chamber</small></span><span><b>The Bound Choir</b><small>Large resonance zones and interrupts</small></span></div></main><aside><small>ACTIVE FIVE · PARTY LV '+partyLevel()+' · ILVL '+ilvl()+'</small>'+party().map(ch=>'<div class="cb2d-brief-member"><i class="cb2d-dot '+classKey(ch)+'"></i><span><b>'+esc(ch.name)+'</b><small>Lv. '+Math.max(1,Number(ch.level)||1)+' · '+esc(ch.class)+' · '+esc(ch.spec)+'</small></span><strong>'+String(role(ch)).toUpperCase()+'</strong></div>').join('')+'<div class="cb2d-prep-summary"><small>KNOWN REWARD</small><p><b>Blackglass Resonator</b><span>'+(firstCleared()?'First-clear relic already recovered':'First-clear relic · Item Level 30')+'</span></p></div><button class="cb2d-start" data-start>BEGIN EXPEDITION →</button></aside></div></section>';
 r.querySelector('[data-close]').onclick=close;r.querySelector('[data-start]').onclick=start;
 try{hsBindEndgamePrep()}catch(error){console.warn('Hollow difficulty controls failed to bind',error)}
 hsBindStrategy()
}
function openDungeon(options){Game=window.CellboundGame;if(!Game?.ready)return;db=Game.getSupabase?.();requestedRunOptions=options||null;if(options?.difficulty)window.CellboundEndgame?.choose?.('hollow-sanctum',options.difficulty,options.tier||1);briefing()}
function close(){token++;run=null;document.body.classList.remove('hs2d-open');const r=root();r.hidden=true;Game?.switchView?.('content');renderCard()}
function hpNeed(level){return 800+Math.max(0,(Number(level)||1)-1)*250}
function awardXp(){
 return party().map(c=>{const beforeLevel=Math.max(1,Number(c.level)||1),beforeXp=Math.max(0,Number(c.xp)||0),beforeNeed=hpNeed(beforeLevel);let level=beforeLevel,xp=beforeXp+XP,levels=0;while(xp>=hpNeed(level)){xp-=hpNeed(level);level++;levels++}c.level=level;c.xp=xp;if(levels){c.talent=(Number(c.talent)||0)+levels}return{name:c.name,beforeLevel,beforeXp,beforeNeed,afterLevel:level,afterXp:xp,afterNeed:hpNeed(level),levels}})
}
async function syncXp(gains){
 if(!db)return;const user=Game.getUser?.();if(!user)return;try{await Promise.all(gains.map(x=>db.from('characters').update({level:x.afterLevel,xp:x.afterXp,last_played_at:new Date().toISOString()}).eq('user_id',user.id).eq('name',x.name)))}catch(e){console.warn('Hollow XP sync failed',e)}
}
function setStatus(text){const e=$('#hs2dStatus');if(e)e.textContent=text}
function feed(text){if(!run)return;run.log.push(text);const e=$('#hs2dFeed');if(e)e.innerHTML=run.log.slice(-7).reverse().map(x=>'<p>'+esc(x)+'</p>').join('')}
function addUnit(id,label,cls,x,y,big=false,meta=''){const e=document.createElement('div');e.className='hs2d-unit cb2d-unit '+cls+(big?' big':'');e.dataset.hs=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+(meta?'<small class="hs2d-unit-meta">'+esc(meta)+'</small>':'')+'</span><em><i></i></em>';$('#hs2dUnits').appendChild(e)}
function move(id,x,y,ms=550){const e=$('[data-hs="'+id+'"]');if(!e)return;e.style.transitionDuration=ms+'ms';e.style.left=x+'%';e.style.top=y+'%'}
function hsPoint(id){const arena=$('#hs2dArena'),e=$('[data-hs="'+id+'"]');if(!arena||!e)return null;const ar=arena.getBoundingClientRect(),r=e.getBoundingClientRect();return{x:r.left+r.width/2-ar.left,y:r.top+r.height/2-ar.top,w:ar.width,h:ar.height}}
function projectile(fromId,toId,kind='magic',ms=420){
 const a=hsPoint(fromId),b=hsPoint(toId),fx=$('#hs2dFx');if(!a||!b||!fx)return;
 const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI,p=document.createElement('i');
 p.className='hs2d-shot '+kind;p.style.left=a.x+'px';p.style.top=a.y+'px';p.style.setProperty('--dx',dx+'px');p.style.setProperty('--dy',dy+'px');p.style.setProperty('--angle',angle+'deg');fx.appendChild(p);setTimeout(()=>p.remove(),ms+120)
}
function hsFloat(id,text,kind='damage'){const p=hsPoint(id),arena=$('#hs2dArena');if(!p||!arena)return;const e=document.createElement('b');e.className='hs2d-float '+kind;e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),800)}
function hsBar(id,pct){const bar=$('[data-hs="'+id+'"] > em i');if(bar)bar.style.width=Math.max(0,Math.min(100,pct))+'%'}
function livingEnemyIds(){return $$('[data-hs^="e"]').filter(e=>!e.classList.contains('dead')).map(e=>e.dataset.hs)}
function primaryEnemy(){return livingEnemyIds()[0]||null}
function partyIndexes(){return party().map((c,i)=>({c,i,role:role(c)}))}
function tankEntry(){return partyIndexes().find(x=>x.role==='tank')||partyIndexes()[0]}
function healerEntry(){return partyIndexes().find(x=>x.role==='healer')||null}
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
async function hsMechanic(s,index){
 const tank=tankEntry(),healer=healerEntry(),players=partyIndexes(),bossId='e0';
 if(index===1){
   const targets=players.filter(x=>x.role!=='tank'),target=targets[Math.floor(Math.random()*Math.max(1,targets.length))]||players[0];
   const tg=hsTelegraph('line',s.mechanic,bossId,'p'+target.i);
   feed(s.enemies[0]+' lines up '+target.c.name+' with '+s.mechanic+'.');
   const y=parseFloat($('[data-hs="p'+target.i+'"]')?.style.top)||50;move('p'+target.i,28,y>50?25:78,430);
   await wait(850);tg?.classList.add('impact');await wait(280);tg?.remove();return;
 }
 if(index===2){
   const tg=hsTelegraph('circle',s.mechanic,bossId,bossId,210);feed(s.enemies[0]+' begins '+s.mechanic+' around itself.');
   players.forEach((x,i)=>{if(x.role==='tank')move('p'+x.i,43,50,430);else move('p'+x.i,20+(i%2)*10,20+(i%3)*28,430)});
   await wait(900);tg?.classList.add('impact');await wait(300);tg?.remove();return;
 }
 const target=players.filter(x=>x.role!=='tank')[0]||players[0],tg=hsTelegraph('circle',s.mechanic,bossId,'p'+target.i,145);
 feed('An echo locks onto '+target.c.name+'.');const y=parseFloat($('[data-hs="p'+target.i+'"]')?.style.top)||50;move('p'+target.i,24,y>50?22:78,420);
 await wait(820);tg?.classList.add('impact');await wait(260);tg?.remove();
}
function hsEnemyMeta(s,index){
 const level=Math.max(1,Number(s?.enemyLevels?.[index])||Number(s?.level)||1);
 const type=String(s?.enemyTypes?.[index]||((s?.enemies?.length===1&&(s?.combatKind==='boss'||s?.combatKind==='final'))?'boss':'trash')).toLowerCase();
 const labels={trash:'TRASH',elite:'ELITE',boss:'BOSS','world-boss':'WORLD BOSS',add:'ADD'};
 return{level,type,label:labels[type]||type.toUpperCase()}
}
function stageEnvironment(s){
 const room=HOLLOW_ROOMS[s.id]||HOLLOW_ROOMS.gallery,arena=$('#hs2dArena'),environment=$('#hs2dEnvironment');
 arena.className='cb2d-arena hs2d-arena hs2d-unified-arena stage-'+s.id;
 if(environment)environment.innerHTML=room.environment||'';
 const tag=$('#hs2dRoom');if(tag)tag.innerHTML='<em>'+esc(room.zone||'HOLLOW SANCTUM')+'</em><b>'+esc(s.title)+'</b><small>'+esc(room.description||'The sanctum closes around the party.')+'</small>'
}
function hsRoomPoint(room,index,fallback){
 const p=room?.[index];return Array.isArray(p)&&p.length>=2?p:fallback
}
function spawnStage(s){
 stageEnvironment(s);$('#hs2dUnits').innerHTML='';$('#hs2dTelegraphs').innerHTML='';$('#hs2dFx').innerHTML='';
 const p=party(),room=HOLLOW_ROOMS[s.id]||HOLLOW_ROOMS.gallery;
 p.forEach((c,i)=>{
  const r=role(c),entryY=30+i*10,target=hsRoomPoint(room.party,i,[r==='tank'?40:r==='healer'?25:31,31+i*9]);
  addUnit('p'+i,c.name,'party '+r+' '+classKey(c),7,entryY);
  setTimeout(()=>move('p'+i,target[0],target[1],780),40+i*20)
 });
 s.enemies.forEach((n,i)=>{
  const m=hsEnemyMeta(s,i),big=m.type==='boss'||m.type==='world-boss'||(s.id==='sentinel'&&m.type==='elite'),target=hsRoomPoint(room.enemies,i,[68,big?50:33+i*17]);
  addUnit('e'+i,n,big?'enemy boss':'enemy',94,target[1],big,'Lv. '+m.level+' · '+m.label);
  setTimeout(()=>move('e'+i,target[0],target[1],820),90+i*30)
 })
}
function hsRenderId(unitId){
 const id=String(unitId||'');
 if(id.startsWith('p-')){const charId=id.slice(2),i=party().findIndex(x=>String(x.id)===charId);return i>=0?'p'+i:null}
 if(/^e-\d+$/.test(id))return'e'+Number(id.slice(2));
 return id
}
function hsCharacter(unitId){const id=String(unitId||'');return id.startsWith('p-')?party().find(x=>String(x.id)===id.slice(2)):null}
function hsAttackKind(c){return c?.class==='Hunter'?'arrow':['Mage','Priest','Druid','Evoker'].includes(c?.class)?'magic':'slash'}
function hsRebornEncounter(s){const base={id:s.id,title:s.title,kind:s.combatKind||'trash',level:s.level||1,recommendedItemLevel:s.level<=6?24:s.level===7?26:28,enemyLevels:s.enemyLevels||null,enemyTypes:s.enemyTypes||null,enemies:[...s.enemies],enemyHealth:s.enemyHealth,mechanics:(s.mechanics||[]).map(m=>Array.isArray(m)?{name:m[0],type:m[1],duration:m[2]}:{...m})};return window.CellboundEndgame?.stageConfig?.('hollow-sanctum',base)||base}
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
   const layer=$('#hs2dTelegraphs');if(layer){tg=document.createElement('div');tg.className='hs2d-tele circle dynamic';tg.innerHTML='<span>ADDS SPAWNING</span>';tg.style.left='74%';tg.style.top='50%';tg.style.width='150px';tg.style.height='150px';tg.style.transform='translate(-50%,-50%)';layer.appendChild(tg)}
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
 try{
  if(window.CellboundCombatStatuses?.handle(e,{resolve:hsStatusTargets,speed:()=>run?.speed||1}))return;
 }catch(error){console.warn('Hollow Sanctum status visual skipped',e?.type,error)}
 const src=hsRenderId(e.source),target=hsRenderId(e.target),srcChar=hsCharacter(e.source),targetChar=hsCharacter(e.target);
 switch(e.type){
  case'COMBAT_START':setStatus('Combat simulation live.');feed('Combat begins.');break;
  case'MOVEMENT_START':if(src&&e.payload?.to)move(src,e.payload.to.x,e.payload.to.y,e.payload.duration||420);break;
  case'ABILITY_START':
   if(srcChar)hsAct(role(srcChar),srcChar.name+' · '+(e.ability||'Ability'));
   if(srcChar&&target){projectile(src,target,hsAttackKind(srcChar),260)}
   else if(src&&target&&(String(e.source||'').startsWith('e-')||String(e.source||'').startsWith('add-')))projectile(src,target,'enemy',300);
   break;
  case'DAMAGE_DEALT':
   if(target){
     const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));hsBar(target,pct);hsFloat(target,'-'+Math.round(Number(e.amount)||0),targetChar?'incoming':'damage');
     if(targetChar)run.hp[targetChar.id]=pct;
   }
   if(srcChar){run.damageDone[srcChar.id]=(Number(run.damageDone?.[srcChar.id])||0)+(Number(e.amount)||0);hsRenderMeters()}
   if(targetChar)hsUpdateSidebar();
   if(e.payload?.avoidable)feed((targetChar?.name||'A player')+' is hit by avoidable '+(e.ability||'damage')+'.');
   break;
  case'HEAL_RECEIVED':
   if(target&&targetChar){const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));run.hp[targetChar.id]=pct;hsBar(target,pct);hsFloat(target,'+'+Math.round(Number(e.amount)||0),'heal');hsUpdateSidebar()}
   if(srcChar){run.healingDone[srcChar.id]=(Number(run.healingDone?.[srcChar.id])||0)+(Number(e.amount)||0);run.overhealing[srcChar.id]=(Number(run.overhealing?.[srcChar.id])||0)+(Number(e.payload?.overhealing)||0);hsRenderMeters()}
   break;
  case'PHASE_CHANGE':feed((e.ability||'The boss changes phase')+' at '+Math.round(Number(e.payload?.healthPct)||0)+'% health.');setStatus(e.ability||'Phase change');break;
  case'ENRAGE':feed((e.ability||'The boss enrages')+'.');setStatus(e.result==='hard'?'HARD ENRAGE — finish now':(e.ability||'Enrage'));break;
  case'UNIQUE_EFFECT_TRIGGER':if(srcChar){feed(srcChar.name+' triggers '+(e.ability||'a unique item effect')+'.');hsFloat(src,e.ability||'UNIQUE','heal');setStatus((e.ability||'Unique effect')+' activated.')}break;
  case'CROWD_CONTROL':if(srcChar){feed(srcChar.name+' controls a priority enemy.');if(target)hsFloat(target,'CONTROLLED','heal')}break;
  case'PHASE_CHANGE':setStatus((e.ability||'Boss phase')+' begins.');feed((e.ability||'A new phase')+' begins.');break;
  case'ENRAGE':setStatus(e.result==='hard'?'HARD ENRAGE':'Boss enraged');feed((e.ability||'Enrage')+' activates.');break;
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
  case'MECHANIC_TELEGRAPH':
   setStatus((e.ability||'Mechanic')+' incoming…');feed((e.ability||'A mechanic')+' is telegraphed.');hsMechanicFromEvent(e);break;
  case'MECHANIC_RESOLVE':hsClearMechanic(e.payload?.token,true);break;
  case'CAST_START':if(String(e.result||'')==='enemy'){hsCastStart(e.ability||'Enemy Cast',e.payload?.duration)}if(e.payload?.interruptible)feed((e.ability||'Cast')+' can be interrupted.');break;
  case'CAST_FINISH':hsCastClear();break;
  case'INTERRUPT':
   if(e.result==='success'){feed((srcChar?.name||'A player')+' interrupts '+(e.payload?.interruptedAbility||'the cast')+'.');setStatus('Interrupt successful.');hsCastClear();hsClearMechanic(e.payload?.token,false)}
   break;
  case'ADD_SPAWNED':hsAddSpawn(e);feed((e.payload?.name||'An add')+' enters the encounter.');break;
  case'ADD_DEFEATED':case'ENEMY_DEFEATED':
   if(target){const el=$('[data-hs="'+target+'"]');if(el){el.classList.add('dead');hsBar(target,0)}}break;
  case'PLAYER_DEFEATED':
   if(target){const el=$('[data-hs="'+target+'"]');if(el)el.classList.add('dead');hsBar(target,0);if(targetChar){run.hp[targetChar.id]=0;feed(targetChar.name+' is defeated.');hsUpdateSidebar()}}
   break;
  case'DEFENSIVE_ACTIVATED':if(srcChar)feed(srcChar.name+' activates a defensive.');break;
  case'COMBAT_END':hsCastClear();setStatus(e.result==='victory'?'Path clear.':'Party defeated.');break;
 }
}
async function hsPlayTimeline(result,tok){
 const events=(result?.events||[]).slice().sort((a,b)=>(Number(a.timestamp)||0)-(Number(b.timestamp)||0));
 if(!run)return false;run.telegraphs={};
 if(!events.length)return result?.outcome==='victory';
 return await new Promise(resolve=>{
  let index=0,simTime=0,lastFrame=performance.now(),finished=false;
  const finish=value=>{if(finished)return;finished=true;resolve(value)};
  const frame=now=>{
   if(finished)return;
   if(tok!==token||!run){finish(false);return}
   const delta=Math.min(Math.max(0,now-lastFrame),100);lastFrame=now;
   simTime+=delta*Math.max(.25,Number(run.speed)||1);
   while(index<events.length&&(Number(events[index].timestamp)||0)<=simTime+4){
    const event=events[index++];
    try{hsRenderRebornEvent(event)}
    catch(error){console.error('Hollow Sanctum combat visual recovered',event?.type,event?.ability,error)}
   }
   if(index>=events.length){finish(result?.outcome==='victory');return}
   requestAnimationFrame(frame)
  };
  requestAnimationFrame(frame)
 })
}
function hsStageSummary(result){
 const s=result?.summary||{},ints=s.interrupts||{},m=s.mechanics||{};
 return'<div class="hs2d-combat-summary"><small>COMBAT REBORN</small><b>'+Math.round(Number(s.totalDamage)||0).toLocaleString()+' damage · '+Math.round(Number(s.totalHealing)||0).toLocaleString()+' healing</b><span>'+Number(s.deaths||0)+' deaths · '+Number(s.mistakes?.total||0)+' mistakes · '+Number(s.battleResurrections||0)+' battle rez · '+Number(ints.success||0)+'/'+Number(ints.attempts||0)+' interrupts · '+Number(m.avoided||0)+' mechanics avoided · '+Number(m.failed||0)+' failed</span></div>'
}

function hsFailureDiagnosis(result){
 const s=result?.summary||{},ints=s.interrupts||{},m=s.mechanics||{},players=s.players||[],causes=[],changes=[];
 const missed=Number(ints.missedCritical)||0,threat=players.reduce((n,p)=>n+(Number(p.threatLost)||0),0),avoidable=players.reduce((n,p)=>n+(Number(p.avoidableDamage)||0),0);
 if(missed){causes.push(missed+' critical interrupt'+(missed===1?' was':'s were')+' missed');changes.push('Use a stricter interrupt plan or DPS rotation.')}
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
 return'<section class="cbr-progress-earned"><small>RUN PROGRESSION</small><h4>What changed after this clear.</h4><div>'+comparison+unlocks.map(x=>'<span><i>↗</i><b>'+esc(x)+'</b></span>').join('')+achievements.map(id=>'<span><i>◆</i><b>Achievement: '+esc(window.CellboundEndgame?.achievementName?.(id)||id)+'</b></span>').join('')+'</div></section>'
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
 return'<section class="cbr-analysis"><div class="cbr-analysis-head"><div><small>COMBAT REBORN · RUN ANALYSIS</small><h4>Execution, mistakes and recovery shaped this run.</h4></div><button type="button" data-hs-replay>REPLAY FINAL FIGHT</button></div><div class="cbr-analysis-grid"><article><span>TIME</span><b>'+time+'</b></article><article><span>DAMAGE</span><b>'+Math.round(t.damage).toLocaleString()+'</b></article><article><span>HEALING</span><b>'+Math.round(t.healing).toLocaleString()+'</b></article><article><span>AVOIDABLE</span><b>'+Math.round(t.avoidableDamage).toLocaleString()+'</b></article><article><span>MISTAKES</span><b>'+t.mistakes+'</b></article><article><span>DEATHS</span><b>'+t.deaths+'</b></article><article><span>COMBAT REZ</span><b>'+t.battleResurrections+'</b></article><article><span>OOC REVIVES</span><b>'+t.outOfCombatRevives+'</b></article><article><span>INTERRUPTS</span><b>'+t.interrupts+'/'+t.attempts+'</b></article><article><span>MECHANICS</span><b>'+t.avoided+'✓ · '+t.failed+'✕</b></article></div><div class="cbr-analysis-list">'+rows+'</div></section>'
}
async function hsReplayFinalFight(){
 const h=(run?.history||[]).slice(-1)[0];if(!h?.events?.length)return;
 const s=STAGES.find(x=>x.id===h.stageId)||STAGES[STAGES.length-1],end=$('#hs2dEnd'),savedHp={...run.hp};
 if(end)end.hidden=true;
 Object.entries(h.startHp||{}).forEach(([id,v])=>run.hp[id]=Number(v)||0);
 spawnStage(s);hsUpdateSidebar();setStatus('Replay · stored combat timeline');feed('Replay uses the original combat events. No RNG is rerun.');
 await hsPlayTimeline(h,token);
 run.hp=savedHp;hsUpdateSidebar();if(end)end.hidden=false
}

async function hsFail(s,result){
 run.done=true;Game.applyPartyCellShock?.(25);const st=state();st.activity.push('The guild wiped in The Hollow Sanctum at '+s.title+'. All five gained 25% Cell Shock.');Game.save?.();await Game.persistState?.();
 const end=$('#hs2dEnd');end.hidden=false;end.className='cb2d-end';end.innerHTML='<div><small>EXPEDITION FAILED</small><h3>Wipe at '+esc(s.title)+'.</h3><p>All five adventurers gained 25% Cell Shock. Combat knowledge and the cause of the wipe are retained.</p></div>'+hsFailureDiagnosis(result)+hsStageSummary(result)+'<button data-return>RETURN TO DUNGEON JOURNAL →</button>';end.querySelector('[data-return]').onclick=close
}
async function hsFailNoHealer(s,result){
 run.done=true;Game.applyPartyCellShock?.(25);const st=state();st.activity.push('The Hollow Sanctum expedition ended after '+s.title+' because the party had no healer to revive fallen adventurers. All five gained 25% Cell Shock.');Game.save?.();await Game.persistState?.();
 const end=$('#hs2dEnd');end.hidden=false;end.className='cb2d-end';end.innerHTML='<div><small>EXPEDITION FAILED</small><h3>No healer available after '+esc(s.title)+'.</h3><p>A fallen adventurer cannot be recovered without a healer. The expedition ends here and all five gain 25% Cell Shock.</p></div>'+hsFailureDiagnosis(result)+hsStageSummary(result)+'<button data-return>RETURN TO DUNGEON JOURNAL →</button>';end.querySelector('[data-return]').onclick=close
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
 spawnStage(s);setStatus('Entering '+s.title+'…');feed('The party enters '+s.title+'.');await wait(650);if(tok!==token)return false;
 const C=window.CellboundCombatReborn;if(!C?.simulate)throw new Error('Combat Reborn engine unavailable');
 const combatParty=party().map(c=>Object.assign({},c,{_combatHealthPct:run.hp[c.id],_combatResource:run.resources?.[c.id]||null,_combatItemLevel:Number(Game?.characterItemLevel?.(c))||Number(c.gear)||0,_combatCooldowns:run.cooldowns?.[c.id]||{},_combatStatuses:run.statuses?.[c.id]||[],_reviveSicknessMs:run.reviveSickness?.[c.id]||0}));
 const tactics={...hsTactics,interruptPriority:hsTactics.bossPlan==='control'?'high':hsTactics.interruptPriority,addPriority:hsTactics.bossPlan==='burn'?'boss':hsTactics.addPriority,defensiveUsage:hsTactics.bossPlan==='control'?'aggressive':hsTactics.defensiveUsage,cooldownUse:hsTactics.bossPlan==='burn'?'free':hsTactics.cooldownUse};const result=C.simulate({party:combatParty,encounter:hsRebornEncounter(s),tactics,seed:[run.endgame?.seed||'hollow-sanctum',s.id,index].join(':')});
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
 const panel=$('#hs2dCastPanel'),label=$('#hs2dCastName'),time=$('#hs2dCastTime'),fill=$('#hs2dCastFill');if(panel)panel.hidden=false;if(label)label.textContent=name||'Enemy cast';if(time)time.textContent=((Number(duration)||0)/1000).toFixed(1)+'s';if(fill){fill.style.transition='none';fill.style.width='0%';void fill.offsetWidth;fill.style.transition='width '+Math.max(.1,(Number(duration)||500)/1000/(run?.speed||1))+'s linear';fill.style.width='100%'}
}
function hsCastClear(){const panel=$('#hs2dCastPanel'),label=$('#hs2dCastName'),time=$('#hs2dCastTime'),fill=$('#hs2dCastFill');if(panel)panel.hidden=false;if(label)label.textContent='—';if(time)time.textContent='—';if(fill){fill.style.transition='none';fill.style.width='0%'}}
function hsOverride(kind,button){
 if(!run)return;if(button){button.classList.add('active');setTimeout(()=>button.classList.remove('active'),450)}
 if(kind==='focus'){hsTactics.bossPlan='burn';hsAct('dps','Focusing priority target');feed('Override: focus priority target.')}
 if(kind==='interrupt'){hsTactics.interruptPriority='high';hsAct('dps','Interrupt priority raised');feed('Override: interrupt priority raised.')}
 if(kind==='defensive'){party().forEach(ch=>run.hp[ch.id]=Math.min(100,(Number(run.hp[ch.id])||0)+5));hsUpdateSidebar();hsAct('tank','Defensives committed');feed('Override: defensive cooldowns committed.')}
 if(kind==='burn'){hsTactics.bossPlan='burn';hsAct('dps','Damage cooldowns committed');feed('Override: burn boss.')}
 if(kind==='consumable'){
   const st=state(),list=(st?.consumables||[]).filter(x=>(x.quantity||0)>0),item=list.find(x=>x.payload?.effect==='combat-potion')||list[0];
   if(!item){feed('No combat consumables remain.');return}
   const target=[...party()].sort((a,b)=>(Number(run.hp[a.id])||0)-(Number(run.hp[b.id])||0))[0],heal=Math.max(0,Number(item.payload?.healHp)||18);
   if(target)run.hp[target.id]=Math.min(100,(Number(run.hp[target.id])||0)+heal);
   item.quantity--;if(item.quantity<=0)st.consumables=st.consumables.filter(x=>x!==item);Game.save?.();hsUpdateSidebar();feed(item.name+' used on '+(target?.name||'the party')+'.')
 }
}
function hsLootRarityClass(item){return 'rarity-'+String(item?.rarity||'common').toLowerCase().replace(/[^a-z0-9-]/g,'')}
function hsLootGearCard(item,label='DUNGEON DROP'){
 const art=G?.artHTML?G.artHTML(item,78):(item?.icon||'◇'),stats=G?.statLines?.(item)||[],effect=item?.uniqueEffect?'<strong class="cb2d-loot-unique">'+esc(item.uniqueEffect.name)+' · '+esc(item.uniqueEffect.description)+'</strong>':'';
 return '<article class="cb2d-loot-item '+hsLootRarityClass(item)+'"><div class="cb2d-loot-art">'+art+'</div><div><small>'+esc(String(item?.rarity||label).toUpperCase())+' · '+esc(item?.slot||'ITEM')+'</small><h4>'+esc(item?.name||'Unknown Item')+'</h4><p>Item Level '+(Number(item?.itemLevel)||0)+(item?.power?' · +'+Number(item.power)+' Power':'')+'</p><div class="cb2d-loot-roll">'+stats.map(s=>'<span>'+esc(s.text)+'</span>').join('')+'</div>'+effect+'<em>Sent to Guild Bank</em></div></article>'
}
function hsLootMaterialCard(m){
 const art=P?.materialArtHTML?P.materialArtHTML(m.key,44,'cb2d-material-art'):'◇';
 return '<article class="cb2d-loot-material"><strong class="cb2d-loot-material-art">'+art+'</strong><div><small>'+esc(String(m.rarity||'MATERIAL').toUpperCase())+'</small><h4>'+esc(m.name)+'</h4><p>'+esc(m.source||'The Hollow Sanctum')+'</p></div><b>×'+Number(m.quantity||0)+'</b></article>'
}
function hsXpCard(x){
 const ch=party().find(c=>c.name===x.name),portrait=ch?.portrait||String(x.name||'?').slice(0,2).toUpperCase(),start=Math.max(0,Math.min(100,x.beforeXp/Math.max(1,x.beforeNeed)*100)),end=Math.max(0,Math.min(100,x.afterXp/Math.max(1,x.afterNeed)*100));
 return '<article class="cb2d-xp-card" data-hs-xp data-start="'+start.toFixed(2)+'" data-end="'+end.toFixed(2)+'" data-levels="'+Number(x.levels||0)+'"><div class="cb2d-xp-avatar">'+esc(portrait)+'</div><div class="cb2d-xp-copy"><div><span><b>'+esc(x.name)+'</b><small>Level '+x.beforeLevel+(x.afterLevel!==x.beforeLevel?' → '+x.afterLevel:'')+'</small></span>'+(x.levels?'<em class="cb2d-level-up">LEVEL UP</em>':'<em>+'+XP+' XP</em>')+'</div><div class="cb2d-xp-bar"><i style="width:'+start.toFixed(2)+'%"></i></div><p><span>'+x.beforeXp+' / '+x.beforeNeed+' XP</span><strong>+'+XP+' XP</strong><span>'+x.afterXp+' / '+x.afterNeed+' XP</span></p></div></article>'
}
function hsAnimateXp(rootEl){
 [...(rootEl?.querySelectorAll('[data-hs-xp]')||[])].forEach((row,index)=>{const bar=row.querySelector('.cb2d-xp-bar i'),end=Number(row.dataset.end)||0,levels=Number(row.dataset.levels)||0;if(!bar)return;setTimeout(()=>{if(!levels){bar.style.width=end+'%';return}bar.style.width='100%';setTimeout(()=>{row.classList.add('levelled');bar.style.transition='none';bar.style.width='0%';void bar.offsetWidth;bar.style.transition='width .8s cubic-bezier(.2,.75,.25,1)';bar.style.width=end+'%'},760)},220+index*90)})
}

function draw(){
 const s=STAGES[run.stage],r=root();r.hidden=false;
 r.innerHTML='<section class="cb2d-shell hs2d-unified-shell"><header class="cb2d-head"><div><small>THE HOLLOW SANCTUM · LIVE 2D DUNGEON</small><h2 id="hs2dTitle">'+esc(s.title)+'</h2></div><div class="cb2d-live"><i></i>LIVE <button data-speed>1×</button><button data-close>×</button></div></header>'+
 '<div class="cb2d-route hs2d-route">'+STAGES.map((x,i)=>'<span class="'+(i<run.stage?'done':i===run.stage?'current':'')+'"><i>'+(i+1)+'</i>'+esc(x.title)+'</span>').join('')+'</div>'+
 '<div class="cb2d-layout"><main><div class="cb2d-arena hs2d-arena hs2d-unified-arena" id="hs2dArena"><div class="cb2d-floor hs2d-floor"></div><div class="hs2d-environment" id="hs2dEnvironment"></div><div class="cb2d-ground-legend"><span class="danger">RED · MOVE / AVOID</span><span class="spawn">AMBER · SPAWN / PRIORITY</span><span class="aggro">GOLD LINK · AGGRO</span></div><div id="hs2dTelegraphs"></div><div id="hs2dUnits"></div><div id="hs2dFx"></div><div class="hs2d-room cb2d-room-tag" id="hs2dRoom"></div><div class="cb2d-caption hs2d-caption"><span id="hs2dType">'+esc(s.kind)+'</span><b id="hs2dStatus">Descending…</b></div></div>'+
 '<div class="cb2d-controls"><button data-hs-override="focus"><b>FOCUS TARGET</b><small>Force priority damage.</small></button><button data-hs-override="interrupt"><b>INTERRUPT NOW</b><small>Raise interrupt priority.</small></button><button data-hs-override="defensive"><b>DEFENSIVE</b><small>Stabilise the group.</small></button><button data-hs-override="burn"><b>BURN BOSS</b><small>Commit damage cooldowns.</small></button><button data-hs-override="consumable"><b>USE CONSUMABLE</b><small>Use available stock.</small></button></div>'+
 '<div class="cb2d-feed hs2d-unified-feed"><small>COMBAT FEED</small><div id="hs2dFeed"></div></div></main>'+
 '<aside><div class="cb2d-cast" id="hs2dCastPanel"><small>ENEMY CAST</small><div><b id="hs2dCastName">—</b><strong id="hs2dCastTime">—</strong></div><div class="cb2d-castbar"><i id="hs2dCastFill"></i></div></div>'+
 '<div class="cb2d-combat-meters"><section class="cb2d-meter-panel damage"><div class="cb2d-meter-head"><small>DAMAGE METER</small><span id="hs2dDamageTotal">0 total</span></div><div id="hs2dDamageMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel healing"><div class="cb2d-meter-head"><small>HEALING METER</small><span id="hs2dHealingTotal">0 total</span></div><div id="hs2dHealingMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel threat"><div class="cb2d-meter-head"><small>THREAT METER</small><span id="hs2dThreatTarget">No target</span></div><div id="hs2dThreatMeter" class="cb2d-meter-list"></div></section></div>'+
 '<div class="cb2d-actions"><small>PARTY ACTIONS</small><div data-hs-act="tank"><i class="cb2d-dot tank"></i><b>Tank</b><em>Taking point</em></div><div data-hs-act="healer"><i class="cb2d-dot healer"></i><b>Healer</b><em>Following formation</em></div><div data-hs-act="dps"><i class="cb2d-dot dps"></i><b>Damage</b><em>Acquiring targets</em></div></div>'+
 '<div class="cb2d-party"><small>PARTY CONDITION · ILVL '+ilvl()+'</small><div id="hs2dRows">'+hsPartyRows()+'</div></div>'+
 '<div class="cb2d-plan"><small>EXPEDITION STYLE</small><b>'+esc(String(hsTactics.strategyPreset||'balanced').toUpperCase())+'</b><span>Same combat rules · Hollow Sanctum encounter mechanics</span></div></aside></div>'+
 '<div id="hs2dEnd" class="cb2d-end" hidden></div></section>';
 r.querySelector('[data-close]').onclick=()=>{if(run&&!run.done&&!confirm('Leave The Hollow Sanctum?'))return;close()};
 r.querySelector('[data-speed]').onclick=e=>{run.speed=run.speed===2?1:2;e.currentTarget.textContent=run.speed+'×'};
 r.querySelectorAll('[data-hs-override]').forEach(b=>b.onclick=()=>hsOverride(b.dataset.hsOverride,b));
 stageEnvironment(s);hsRenderMeters();hsUpdateSidebar();feed('The party enters The Hollow Sanctum.')
}
function hsRunMetrics(){
 const totals=run.history.reduce((o,r)=>{const s=r.summary||{};o.combat+=Number(r.durationMs)||0;o.deaths+=Number(s.deaths)||0;o.failed+=Number(s.mechanics?.failed)||0;o.mistakes+=Number(s.mistakes?.total)||0;o.missedInterrupts+=Number(s.interrupts?.missedCritical)||0;o.battleResurrections+=Number(s.battleResurrections)||0;(s.players||[]).forEach(p=>{o.threatLosses+=Number(p.threatLost)||0;o.avoidableDamage+=Number(p.avoidableDamage)||0});return o},{combat:0,deaths:0,failed:0,mistakes:0,missedInterrupts:0,threatLosses:0,avoidableDamage:0,battleResurrections:0});
 const pace=hsTactics.pullStyle==='aggressive'?.82:hsTactics.pullStyle==='safe'?1.20:1,timeMs=Math.max(35000,totals.combat*4+Math.round(STAGES.length*60000*pace));
 return{timeMs,deaths:totals.deaths,mechanicsFailed:totals.failed,mistakes:totals.mistakes,missedInterrupts:totals.missedInterrupts,threatLosses:totals.threatLosses,avoidableDamage:totals.avoidableDamage,battleResurrections:totals.battleResurrections,scorePreview:window.CellboundEndgameData?.scorePreview?.({difficulty:run.endgame?.difficulty||'normal',tier:run.endgame?.tier||0,timeMs,targetTimeMs:run.endgame?.targetTimeMs||0,deaths:totals.deaths,mechanicsFailed:totals.failed,mistakes:totals.mistakes})||0}
}
function hsFormatTime(ms){const t=Math.max(0,Math.round((Number(ms)||0)/1000)),m=Math.floor(t/60),s=t%60;return m+':'+String(s).padStart(2,'0')}

async function start(){
 const startButton=root().querySelector('[data-start]');if(startButton){startButton.disabled=true;startButton.textContent='ENTERING…'}
 await Game.persistState?.();
 const service=await hsWaitForEndgame(),eg=hsEndgameConfig(),attempt=await service?.beginAttempt?.('hollow-sanctum');if(!attempt||attempt.error){if(startButton){startButton.disabled=false;startButton.textContent='BEGIN EXPEDITION →'}alert(attempt?.error?.message||'Dungeon service is still loading. Try Begin Descent again.');return}token++;const tok=token,p=party();run={stage:0,done:false,speed:1,log:[],damageDone:Object.fromEntries(p.map(ch=>[ch.id,0])),healingDone:Object.fromEntries(p.map(ch=>[ch.id,0])),overhealing:Object.fromEntries(p.map(ch=>[ch.id,0])),threat:Object.fromEntries(p.map(ch=>[ch.id,0])),aggro:null,endgame:{difficulty:eg.difficulty,tier:eg.tier||0,label:eg.diff?.name||'Normal',targetTimeMs:Number(attempt.targetTimeMs)||eg.targetTimeMs,recommendedItemLevel:eg.recommendedItemLevel,dungeonVersion:eg.dungeon?.version||2,affixes:[...(eg.affixes||[])],attemptId:attempt.attemptId,seed:attempt.seed},hp:Object.fromEntries(p.map(c=>[c.id,100])),resources:Object.fromEntries(p.map(c=>{const d=hsResourceDef(c);return[c.id,{name:d.name,max:d.max,value:d.start}]})),cooldowns:Object.fromEntries(p.map(c=>[c.id,{}])),statuses:Object.fromEntries(p.map(c=>[c.id,[]])),reviveSickness:Object.fromEntries(p.map(c=>[c.id,0])),expeditionTimeMs:0,reviveReadyAt:0,outOfCombatRevives:0,history:[],telegraphs:{}};draw();
 for(let i=0;i<STAGES.length;i++){if(tok!==token)return;run.stage=i;const s=STAGES[i];$('#hs2dTitle').textContent=s.title;const type=$('#hs2dType');if(type)type.textContent=s.kind;$('.hs2d-route').innerHTML=STAGES.map((x,j)=>'<span class="'+(j<i?'done':j===i?'current':'')+'"><i>'+(j+1)+'</i>'+esc(x.title)+'</span>').join('');if(!await fightStage(s,tok,i))return}
 if(tok!==token)return;await complete();
}
async function complete(){
 const s=state(),q=qstate(),first=!q.flags.hollowFirstClear,metrics=hsRunMetrics();run.endgameMetrics=metrics;const record=await window.CellboundEndgame?.recordRun?.('hollow-sanctum',metrics);run.endgameRecord=record&&!record.error?record:null;const gains=awardXp(),gear=window.CellboundEndgame?.rollPersonalLoot?.('hollow-sanctum','choir')||rollHollowGear(),mode=run.endgame?.difficulty||'normal',tier=Number(run.endgame?.tier)||0,gold=mode==='normal'?220:mode==='heroic'?300:340+tier*12,renown=mode==='normal'?100:mode==='heroic'?135:150+tier*5;s.gold=(Number(s.gold)||0)+gold;s.renown=(Number(s.renown)||0)+renown;const shards=window.CellboundEndgame?.shardReward?.('hollow-sanctum')||0;if(shards)Game.addMaterial?.('cell-shards',shards);const chase=window.CellboundEndgame?.rollChase?.('hollow-sanctum');if(chase)s.activity.push('Very rare collection reward: '+chase.name+'.');Game.addMaterial?.('void-crystal',first?2:1);q.flags.hollowFirstClear=true;q.hollowCompletions=(Number(q.hollowCompletions)||0)+1;
 if(gear)Game.addBankItem?.(gear);
 if(first)Game.addBankItem?.({...RELIC,source:'The Bound Choir · First Clear'});
 s.activity.push('The Hollow Sanctum · '+(run.endgame?.label||'Normal')+' cleared. Score '+Number(run.endgameRecord?.score||metrics.scorePreview).toLocaleString()+'. Each adventurer earned '+XP+' XP.'+(gear?' '+gear.name+' was sent to the Guild Bank.':'')+(first?' Blackglass Resonator added to the Guild Bank.':''));
 Game.save?.();await Game.persistState?.();await syncXp(gains);run.done=true;window.dispatchEvent(new CustomEvent('cellbound:hollow-complete',{detail:{firstClear:first,difficulty:mode,tier,score:run.endgameRecord?.score||metrics.scorePreview,timeMs:metrics.timeMs}}));window.dispatchEvent(new CustomEvent('cellbound:dungeon-complete',{detail:{id:'hollow-sanctum',difficulty:mode,tier,score:run.endgameRecord?.score||metrics.scorePreview,timeMs:metrics.timeMs}}));
 const end=$('#hs2dEnd');end.hidden=false;end.className='cb2d-end cb2d-loot-screen';
 const lootGear=[gear,...(first?[RELIC]:[])].filter(Boolean),materials=[
   {key:'void-crystal',name:'Void Crystal',quantity:first?2:1,source:'The Hollow Sanctum',rarity:'Rare'},
   ...(shards?[{key:'cell-shards',name:'Cell Shards',quantity:shards,source:'Endgame Reward',rarity:'Rare'}]:[])
 ];
 end.innerHTML='<div class="cb2d-loot-wrap">'+
 '<header class="cb2d-loot-head"><div><small>THE HOLLOW SANCTUM · '+esc(run.endgame?.label||'NORMAL').toUpperCase()+' · CLEARED</small><h3>Expedition Rewards</h3><p>The Bound Choir has fallen. Everything below has already been secured to your guild.</p></div><div class="cb2d-loot-complete">✓<span>DUNGEON<br>COMPLETE</span></div></header>'+
 '<div class="cb2d-loot-currency"><article><span>GOLD</span><b>+'+gold+'</b><small>Added to Guild treasury</small></article><article><span>RENOWN</span><b>+'+renown+'</b><small>Guild reputation earned</small></article><article><span>PARTY XP</span><b>+'+XP+'</b><small>Earned by each adventurer</small></article><article><span>BOSS CHESTS</span><b>'+lootGear.length+'</b><small>Gear drops secured</small></article><article><span>RUN SCORE</span><b>'+Number(run.endgameRecord?.score||metrics.scorePreview).toLocaleString()+'</b><small>'+hsFormatTime(metrics.timeMs)+' simulated time</small></article></div>'+
 hsProgressEarned()+
 '<section class="cb2d-loot-section cb2d-xp-section"><div class="cb2d-loot-title"><span>PARTY EXPERIENCE</span><small>Every member of the active five gains experience from the clear</small></div><div class="cb2d-xp-grid">'+gains.map(hsXpCard).join('')+'</div></section>'+
 '<section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>GEAR ACQUIRED</span><small>Stored automatically in the Guild Bank</small></div><div class="cb2d-loot-gear">'+(lootGear.length?lootGear.map((item,i)=>hsLootGearCard(item,i===1?'FIRST-CLEAR RELIC':'DUNGEON DROP')).join(''):'<div class="cb2d-loot-empty">No gear dropped.</div>')+'</div></section>'+
 '<section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>PROFESSION REAGENTS</span><small>Available immediately for crafting</small></div><div class="cb2d-loot-materials">'+materials.map(hsLootMaterialCard).join('')+'</div></section>'+
 hsCombatAnalysisHTML()+
 '<footer class="cb2d-loot-actions"><button data-loot-bank>VIEW GUILD BANK</button><button class="primary" data-loot-return>RETURN TO GUILD →</button></footer></div>';
 hsAnimateXp(end);
 end.querySelector('[data-hs-replay]')?.addEventListener('click',hsReplayFinalFight);
 end.querySelector('[data-loot-bank]').onclick=()=>{close();Game.switchView?.('bank')};
 end.querySelector('[data-loot-return]').onclick=()=>{close();Game.switchView?.('content')}
}
function init(){Game=window.CellboundGame;G=window.CellboundGear;P=window.CellboundProfessions;if(!Game?.ready){setTimeout(init,100);return}db=Game.getSupabase?.();renderCard();document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',renderCard);window.CellboundHollowSanctum={open:openDungeon,renderCard,relic:RELIC}}
init();
})();