(()=>{
'use strict';
window.CellboundCombatStandard?.register?.('blackout-station',{kind:'dungeon',execution:'local',ui:'shared-cb2d'});

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const XP=700,ENTRY_ILVL=34,BOSS_LEVEL=13;
const GRID_OVERRIDE_ID='grid-override-module',GRID_OVERRIDE_DROP_CHANCE=.10,GRID_OVERRIDE_MAX_CHARGES=5;
const ROLE_ZONES={
 tank:{x:27,y:27,radius:9,color:'red',label:'TANK'},
 dps:{x:48,y:74,radius:14,color:'yellow',label:'DAMAGE'},
 healer:{x:73,y:27,radius:9,color:'blue',label:'HEALER'}
};
const CABLES=['se','sw','se','sw','nw','v','v','v','se','nw','v','ne','ne','h','nw'];
const CABLE_LINKS={h:['w','e'],v:['n','s'],ne:['n','e'],nw:['n','w'],se:['s','e'],sw:['s','w']};
const GRID_INPUT_INDEX=4,GRID_BREAKER_INDEX=11;
const CLUE_GROUPS=[
 [GRID_INPUT_INDEX,GRID_BREAKER_INDEX],
 [0,1,5,9],
 [2,3,6,10],
 [7,8,12,13,14],
 [...Array(15).keys()]
];
const CLUE_HP_PCT=8;

let Game=null,G=null,db=null,run=null,token=0,meterRenderPending=false,lastMeterRenderAt=0;

const wait=ms=>new Promise(r=>setTimeout(r,Math.max(0,Math.round(ms/((run&&run.speed)||1)))));
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const role=c=>Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps';
const classKey=c=>'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ilvl=()=>Number(Game?.partyItemLevel?.())||0;

function createGridOverrideModule(){
 return{
  itemId:GRID_OVERRIDE_ID,name:'Grid Override Module',category:'utility',utilityType:'blackout-grid-override',
  rarity:'Rare',tier:3,itemLevel:0,power:0,class:'All',classes:'all',slot:'Utility',
  tradeState:'tradeable',nonStackable:true,charges:GRID_OVERRIDE_MAX_CHARGES,maxCharges:GRID_OVERRIDE_MAX_CHARGES,
  icon:'⚡',description:'A recovered Calder control module. Consumes one charge to automatically restore the Blackout Station grid after your first manual clear.',
  source:'Blackout Station · Dr. Vex Calder'
 }
}
function gridOverrideModules(){return(state()?.bank||[]).filter(x=>x?.itemId===GRID_OVERRIDE_ID&&Number(x.charges)>0)}
function activeGridOverride(){return gridOverrideModules().sort((a,b)=>(Number(a.charges)||0)-(Number(b.charges)||0))[0]||null}
function gridOverrideCharges(){return gridOverrideModules().reduce((n,x)=>n+Math.max(0,Number(x.charges)||0),0)}
function gridOverrideArt(size=72){return'<span class="bs-override-art" style="width:'+size+'px;height:'+size+'px" aria-label="Grid Override Module"><i>⚡</i></span>'}
function root(){
 let e=$('#bs2dBackdrop');
 if(e)return e;
 e=document.createElement('div');e.id='bs2dBackdrop';e.className='bs2d-backdrop';e.hidden=true;document.body.appendChild(e);return e
}
function readiness(){
 const p=party();
 if(p.length!==5)return{ok:false,reason:'Build a complete five-character party first.'};
 const bad=p.find(c=>Game?.isUnavailable?.(c));if(bad)return{ok:false,reason:bad.name+' is still recovering from Cell Shock.'};
 if(ilvl()<ENTRY_ILVL)return{ok:false,reason:'Party Item Level '+ilvl()+'. Blackout Station requires Item Level '+ENTRY_ILVL+'.'};
 return{ok:true,reason:'The station is ready to investigate.'}
}
function renderCard(){
 const card=$('#blackoutStationCard'),mount=$('#blackoutStationMount');if((!card&&!mount)||!Game?.ready)return;
 const s=state(),clears=Number(s?.blackoutStationCompletions)||0,gate=readiness(),pi=ilvl();
 if(card)card.innerHTML='<article class="dungeon-browser-card blackout-station unlocked" data-dungeon-card="blackout-station"><div class="dungeon-browser-art blackout-station-art"><span>ABANDONED GRID</span><strong>⚡</strong></div><div class="dungeon-browser-copy"><div class="dungeon-browser-heading"><div><small>DUNGEON</small><h3>Blackout Station</h3></div><b id="blackoutStationStatus">'+(clears?'FARMABLE':'AVAILABLE')+'</b></div><p>Restore a dead power station, then survive Dr. Vex Calder\'s lethal role circuits.</p><div class="dungeon-browser-meta"><span>2 stages</span><span>iLvl '+ENTRY_ILVL+'+</span><span>Party iLvl '+(pi||'—')+'</span></div><div class="dungeon-browser-actions"><button type="button" data-dungeon-more="blackout-station">MORE INFO →</button></div></div></article>';
 if(!mount)return;
 mount.innerHTML='<div class="dungeon-detail-toolbar"><div><small>DUNGEON JOURNAL</small><b>Blackout Station</b></div><button type="button" data-dungeon-close>CLOSE DETAILS ×</button></div>'+
 '<div class="dungeon-journal-hero blackout-journal-hero"><div class="dungeon-journal-art blackout-journal-art"><span class="journal-eyebrow">ABANDONED POWER STATION · DUNGEON</span><h3>Blackout Station</h3><p>The grid has been dead for years. Something inside is still drawing power. Restore the cable board and the station will reveal what has been waiting in the dark.</p><div class="journal-badges"><span>5 adventurers</span><span>Puzzle + 1 boss</span><span>Party iLvl '+(pi||'—')+'</span></div></div><div class="journal-entry-panel"><small>ENTRY REQUIREMENT</small><b>Party Item Level '+ENTRY_ILVL+'</b><p>'+esc(gate.reason)+'</p><button data-bs-enter '+(!gate.ok?'disabled':'')+'>ENTER BLACKOUT STATION</button></div></div>'+
 '<div class="dungeon-journal-layout"><article class="panel dungeon-route-panel"><div class="panel-head"><div><small>DUNGEON ROUTE</small><h3>Power Restoration</h3></div><b>2 STAGES</b></div><div class="dungeon-route">'+
 '<div class="dungeon-stage '+(clears?'complete':'')+'" data-kind="puzzle"><div class="dungeon-stage-rune">'+(clears?'✓':'◆')+'</div><div class="dungeon-stage-copy"><b>1. Grid Alignment</b><small>Slide the cable tiles into place until the station circuit is complete and the main breaker can energise.</small></div><span class="dungeon-stage-tag">PUZZLE</span></div>'+
 '<div class="dungeon-stage '+(clears?'complete':'')+'" data-kind="final"><div class="dungeon-stage-rune">'+(clears?'✓':'✦')+'</div><div class="dungeon-stage-copy"><b>2. Dr. Vex Calder</b><small>At 75%, 50% and 25% health the power fails. Tank to red, damage to yellow, healer to blue. The shockwave kills anyone outside their correct circuit.</small></div><span class="dungeon-stage-tag">FINAL BOSS</span></div>'+
 '</div></article><aside class="panel dungeon-intel-panel"><div class="panel-head"><div><small>ENCOUNTER INTELLIGENCE</small><h3>What Your Guild Knows</h3></div></div><div class="dungeon-intel">'+
 '<article class="intel-card"><div class="intel-card-head"><b>Grid Alignment</b><span>INTERACTIVE</span></div><p>A 4 × 4 sliding cable board controls the station. One slot is empty. Slide adjacent sections until the circuit returns to its original layout.</p></article>'+
 '<article class="intel-card"><div class="intel-card-head"><b>Emergency Overload</b><span>LETHAL</span></div><p>Calder cuts the lights and exposes three coloured role circuits. Red protects Tanks, yellow protects Damage, and blue protects Healers. Wrong circle or no circle means instant death.</p></article>'+
 '<article class="intel-card"><div class="intel-card-head"><b>Combat Rule</b><span>POSITIONAL</span></div><p>The circles use actual Combat Reborn positions. The party must physically reach the correct zone before the shockwave resolves.</p></article>'+
 '<article class="intel-card"><div class="intel-card-head"><b>Expedition Record</b><span>'+clears+' clear'+(clears===1?'':'s')+'</span></div><p>'+(clears?'Your guild has restored and shut down the station before. Calder remains available to challenge again.':'No successful restoration has been recorded yet.')+'</p></article>'+
 '</div></aside></div>';
 mount.querySelector('[data-bs-enter]')?.addEventListener('click',openDungeon)
}
function briefing(){
 const gate=readiness(),r=root();r.hidden=false;document.body.classList.add('bs2d-open');
 r.innerHTML='<section class="cb2d-shell cb2d-brief bs2d-shell"><header class="cb2d-head"><div><small>BLACKOUT STATION · DUNGEON 4 · ILVL '+ENTRY_ILVL+'+</small><h2>Restore the grid. Survive the overload.</h2></div><button data-bs-close>×</button></header><div class="cb2d-brief-grid"><main><p class="cb2d-intro">There are no trash packs here. The expedition begins at a dead control board. Solve the sliding cable puzzle and the station powers up, revealing Dr. Vex Calder in the generator hall.</p><div class="bs-brief-rules"><article><span>1</span><div><b>ALIGN THE GRID</b><p>Slide adjacent cable tiles into the empty space until every section returns to the correct circuit layout.</p></div></article><article><span>2</span><div><b>WATCH THE LIGHTS</b><p>At 75%, 50% and 25% boss health, Calder pulls the power and the room goes dark.</p></div></article><article><span>3</span><div><b>GET TO YOUR ROLE CIRCUIT</b><p><strong class="bs-red">RED = TANK</strong> · <strong class="bs-yellow">YELLOW = DAMAGE</strong> · <strong class="bs-blue">BLUE = HEALER</strong>. The shockwave is lethal outside the correct colour.</p></div></article></div></main><aside><small>ACTIVE FIVE · PARTY ILVL '+(ilvl()||'—')+'</small>'+party().map(ch=>'<div class="cb2d-brief-member"><i class="cb2d-dot '+classKey(ch)+'"></i><span><b>'+esc(ch.name)+'</b><small>'+esc(ch.class)+' · '+esc(ch.spec)+' · '+role(ch).toUpperCase()+'</small></span></div>').join('')+'<button data-bs-start '+(!gate.ok?'disabled':'')+'>BEGIN RESTORATION →</button><p>'+esc(gate.reason)+'</p></aside></div></section>';
 r.querySelector('[data-bs-close]').onclick=close;
 r.querySelector('[data-bs-start]')?.addEventListener('click',startRun)
}
function openDungeon(){Game=window.CellboundGame;if(!Game?.ready)return;db=Game.getSupabase?.();briefing()}
function close(){
 token++;run=null;document.body.classList.remove('bs2d-open');const r=root();r.hidden=true;Game?.switchView?.('content');renderCard()
}

function solvedBoard(){return [...Array(15).keys(),null]}
function neighbours(blank){
 const row=Math.floor(blank/4),col=blank%4,out=[];
 if(row>0)out.push(blank-4);if(row<3)out.push(blank+4);if(col>0)out.push(blank-1);if(col<3)out.push(blank+1);
 return out
}
function shuffledBoard(){
 const board=solvedBoard();let blank=15,last=-1;
 for(let i=0;i<110;i++){
  const opts=neighbours(blank).filter(x=>x!==last),pick=opts[Math.floor(Math.random()*opts.length)],tmp=board[pick];
  board[blank]=tmp;board[pick]=null;last=blank;blank=pick
 }
 if(board.every((v,i)=>v===(i===15?null:i)))return shuffledBoard();
 return board
}
function cableType(board,pos){const tile=board?.[pos];return tile==null?null:CABLES[tile]||null}
function circuitState(board){
 const connected=new Set(),startType=cableType(board,GRID_INPUT_INDEX),quick=!!run?.quickReconnect;
 if(!startType||!CABLE_LINKS[startType]?.includes('w'))return{connected,progress:0,complete:false,breakerLive:false,quick};
 const queue=[GRID_INPUT_INDEX],opposite={n:'s',s:'n',e:'w',w:'e'},delta={n:-4,s:4,e:1,w:-1};
 connected.add(GRID_INPUT_INDEX);
 while(queue.length){
  const pos=queue.shift(),type=cableType(board,pos),links=CABLE_LINKS[type]||[],row=Math.floor(pos/4),col=pos%4;
  links.forEach(dir=>{
   if((dir==='n'&&row===0)||(dir==='s'&&row===3)||(dir==='w'&&col===0)||(dir==='e'&&col===3))return;
   const next=pos+delta[dir],nextType=cableType(board,next);
   if(!nextType||!CABLE_LINKS[nextType]?.includes(opposite[dir])||connected.has(next))return;
   connected.add(next);queue.push(next)
  })
 }
 const breakerType=cableType(board,GRID_BREAKER_INDEX),breakerLive=connected.has(GRID_BREAKER_INDEX)&&CABLE_LINKS[breakerType]?.includes('e');
 const complete=breakerLive&&(quick||connected.size===15);
 const progress=complete?100:Math.round((connected.size/15)*100);
 return{connected,progress,complete,breakerLive,quick}
}
function puzzleSolved(){return !!run&&circuitState(run.board).complete}
function cableMarkup(type){return '<i class="bs-cable '+type+'"><u></u><u></u></i>'}
function cluePositions(level=run?.cluesUsed||0){
 const shown=new Set();
 for(let i=0;i<Math.min(5,Number(level)||0);i++)CLUE_GROUPS[i].forEach(pos=>shown.add(pos));
 return shown
}
function clueGhost(pos,currentType){
 const shown=cluePositions();if(!shown.has(pos))return'';
 const target=CABLES[pos],correct=currentType===target;
 return '<span class="bs-clue-ghost '+(correct?'correct':'')+'"><small>'+(correct?'MATCH':'TARGET')+'</small>'+cableMarkup(target)+'</span>'
}
function useClue(){
 if(!run||run.powered||run.cluesUsed>=5)return;
 run.cluesUsed++;run.cluesRemaining=Math.max(0,5-run.cluesUsed);
 const overcharge=run.cluesUsed*CLUE_HP_PCT;
 const messages=[
  'Diagnostic 1 reveals the required cable at the GRID INPUT and MAIN BREAKER.',
  'Diagnostic 2 maps the first section of the restored circuit.',
  'Diagnostic 3 maps the centre section of the restored circuit.',
  'Diagnostic 4 maps the lower section of the restored circuit.',
  'Diagnostic 5 exposes the complete target cable layout.'
 ];
 run.log.push(messages[run.cluesUsed-1]+' Calder Overcharge rises to +'+overcharge+'% max health.');
 renderPuzzle()
}
function renderPuzzle(){
 if(!run)return;const r=root(),blank=run.board.indexOf(null),circuit=circuitState(run.board),progress=circuit.progress,overcharge=(Number(run.cluesUsed)||0)*CLUE_HP_PCT,quick=!!run.quickReconnect;
 const gridState=run.powered?'ONLINE':progress>0?'RESTORING '+progress+'%':'NO POWER';
 const modeLabel=quick?'QUICK RECONNECT':'FULL RESTORATION';
 const headerCopy=quick?'You have already secured this station once. Create any continuous powered route from GRID INPUT to MAIN BREAKER — unused tiles can remain disconnected.':'First clear protocol: restore the entire 15-tile circuit so every cable section is powered before the main breaker will close.';
 const stationTitle=run.powered?'Station online.':circuit.breakerLive&&quick?'Breaker path found.':progress>0?'Current is flowing.':'The station is dark.';
 const stationCopy=run.powered?'The main breaker is closed and the generator hall is live.':quick?(progress>0?'Only the live path matters on repeat runs. Reach the main breaker and the station will start.':'Repeat-run rule: one valid path from GRID INPUT to MAIN BREAKER is enough. You do not need to use all 15 tiles.'):(progress>0?'Connected cable sections glow as power travels from the grid input. Every tile must be part of the powered circuit on your first clear.':'First-clear rule: all 15 cable tiles must form one continuous powered circuit from GRID INPUT to MAIN BREAKER.');
 const override=activeGridOverride(),overrideCharges=gridOverrideCharges(),overrideReady=quick&&override&&!run.powered&&!run.overrideInProgress;
 const overridePanel='<div class="bs-override-panel '+(overrideReady?'ready':'')+'"><div><span>GRID OVERRIDE MODULE</span><b>'+(override?Math.max(0,Number(override.charges)||0)+' / '+Math.max(1,Number(override.maxCharges)||GRID_OVERRIDE_MAX_CHARGES)+' USES':'NOT OWNED')+'</b></div><p>'+(!quick?'Complete the grid manually once before Override Modules can be used.':override?'Consumes one charge and restores the grid automatically. No diagnostic penalty.': 'Rare 10% drop from Dr. Vex Calder. Tradeable on the Trading Post.')+'</p><button data-bs-override '+(overrideReady?'':'disabled')+'>'+(run.overrideInProgress?'OVERRIDING GRID…':overrideReady?'USE GRID OVERRIDE · '+Math.max(0,Number(override.charges)||0)+' CHARGES':!quick?'LOCKED UNTIL FIRST CLEAR':'NO MODULE AVAILABLE')+'</button>'+(overrideCharges>0?'<small>'+overrideCharges+' total charge'+(overrideCharges===1?'':'s')+' across your Bank</small>':'')+'</div>';
 const cells=run.board.map((tile,pos)=>{
  const type=tile==null?null:CABLES[tile],ghost=clueGhost(pos,type);
  return tile==null
   ?'<div class="bs-grid-empty '+(cluePositions().has(pos)?'clue':'')+'" data-pos="'+pos+'"><span>EMPTY</span>'+ghost+'</div>'
   :'<button class="bs-grid-tile '+(circuit.connected.has(pos)?'live ':'')+(cluePositions().has(pos)?'clue ':'')+(cluePositions().has(pos)&&type===CABLES[pos]?'clue-correct':'')+'" data-tile-pos="'+pos+'" data-cable="'+type+'" aria-label="Cable tile">'+cableMarkup(type)+ghost+'</button>'
 }).join('');
 r.innerHTML='<section class="bs-puzzle-shell '+(run.powered?'powered':'')+'"><header><div><small>BLACKOUT STATION · GRID CONTROL · '+modeLabel+'</small><h2>Main Distribution Board</h2><p>'+headerCopy+'</p></div><button data-bs-close>×</button></header><div class="bs-puzzle-layout"><main><div class="bs-grid-frame '+(circuit.complete?'solved':'')+'"><div class="bs-grid-source '+(progress>0?'live':'')+'"><span>GRID<br>INPUT</span></div><div class="bs-grid-board">'+cells+'</div><div class="bs-grid-breaker '+(circuit.complete?'live':'')+'"><span>MAIN<br>BREAKER</span></div></div><div class="bs-puzzle-readout"><span>MOVES <b>'+run.moves+'</b></span><span>GRID STATUS <b>'+gridState+'</b></span><span>RULE <b>'+modeLabel+'</b></span><span>CALDER OVERCHARGE <b>+'+overcharge+'%</b></span><button data-bs-reset '+(run.overrideInProgress?'disabled':'')+'>RESHUFFLE</button></div></main><aside><small>POWER RESTORATION</small><div class="bs-station-schematic '+(circuit.complete?'online':'')+'"><i></i><i></i><i></i><i></i><strong>'+progress+'%</strong></div><h3>'+stationTitle+'</h3><p>'+stationCopy+'</p><div class="bs-diagnostics"><div><span>EMERGENCY DIAGNOSTICS</span><b>'+run.cluesRemaining+' / 5</b></div><p>Each diagnostic reveals more of the original full-grid layout, but increases Dr. Vex Calder\'s maximum health by <strong>8%</strong>.</p><button data-bs-clue '+(run.cluesRemaining<=0||run.powered||run.overrideInProgress?'disabled':'')+'>USE DIAGNOSTIC · +8% BOSS HP</button></div>'+overridePanel+'<div class="bs-puzzle-log">'+run.log.slice(-5).reverse().map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></aside></div></section>';
 r.querySelector('[data-bs-close]').onclick=close;
 r.querySelector('[data-bs-reset]').onclick=()=>{run.board=shuffledBoard();run.moves=0;run.log.push('The board was reshuffled. Diagnostics already used remain active.');renderPuzzle()};
 r.querySelector('[data-bs-clue]')?.addEventListener('click',useClue);
 r.querySelector('[data-bs-override]')?.addEventListener('click',useGridOverride);
 r.querySelectorAll('[data-tile-pos]').forEach(b=>{if(run.overrideInProgress)b.disabled=true;else b.onclick=()=>slideTile(Number(b.dataset.tilePos),blank)})
}
async function useGridOverride(){
 if(!run||run.powered||run.overrideInProgress)return;
 if(!run.quickReconnect){alert('Complete Blackout Station manually once before using a Grid Override Module.');return}
 const module=activeGridOverride();if(!module){alert('No Grid Override Module with charges remaining is in your Guild Bank.');renderPuzzle();return}
 if(!confirm('Use one Grid Override charge?\n\nThe grid will auto-complete with no Calder Overcharge penalty.'))return;
 const tok=token;run.overrideInProgress=true;run.overrideUsed=true;
 module.charges=Math.max(0,(Number(module.charges)||0)-1);
 const usedFrom=Math.max(0,Number(module.charges)||0);
 if(module.charges<=0)state().bank=state().bank.filter(x=>x.id!==module.id);
 state().activity=Array.isArray(state().activity)?state().activity:[];
 state().activity.push('Grid Override Module used in Blackout Station. '+usedFrom+' charge'+(usedFrom===1?'':'s')+' remain on that module.');
 Game.save?.();await Game.persistState?.();
 if(tok!==token||!run)return;
 run.log.push('Grid Override accepted. Calder control code is forcing the distribution board online.');
 run.board=solvedBoard();renderPuzzle();
 const shell=$('.bs-puzzle-shell'),tiles=[...document.querySelectorAll('.bs-grid-tile')];shell?.classList.add('override-active');
 for(let i=0;i<tiles.length;i++){if(tok!==token||!run)return;tiles[i].classList.add('override-lit');await wait(45)}
 await wait(260);if(tok!==token||!run)return;run.overrideInProgress=false;
 await powerOn(true)
}
async function slideTile(pos,blank){
 if(!run||!neighbours(blank).includes(pos))return;
 run.board[blank]=run.board[pos];run.board[pos]=null;run.moves++;const solved=puzzleSolved();renderPuzzle();
 if(solved)await powerOn()
}
async function powerOn(overridden=false){
 if(!run||run.powered)return;run.powered=true;run.log.push(overridden?'Grid Override completed. Main breaker closing automatically.':run.quickReconnect?'Valid bridge established. Main breaker closing.':'Full circuit complete. Main breaker closing.');
 const board=$('.bs-grid-frame');board?.classList.add('solved');const schematic=$('.bs-station-schematic');if(schematic)schematic.classList.add('online');
 const label=$('.bs-station-schematic strong');if(label)label.textContent='100%';
 await wait(500);
 root().classList.add('bs-power-flash');await wait(650);root().classList.remove('bs-power-flash');
 run.log.push('Power restored. Movement detected in the generator hall.');
 await wait(550);startBoss()
}

function bossEncounter(){
 const overload={name:'Emergency Overload',type:'role-circles',duration:5000,danger:'fatal',strict:true,zones:ROLE_ZONES};
 const overcharge=(Number(run?.cluesUsed)||0)*CLUE_HP_PCT,bossHealth=Math.round(2450*(1+overcharge/100));
 return{
  id:'vex-calder',title:'Dr. Vex Calder',kind:'final',level:BOSS_LEVEL,recommendedItemLevel:ENTRY_ILVL,
  enemies:['Dr. Vex Calder'],enemyTypes:['boss'],enemyHealth:bossHealth,calderOvercharge:overcharge,mechanicIntervalMs:4600,mechanics:[{name:'Turbine Cleave',type:'cone',duration:1700},{name:'Core Siphon',type:'interrupt',duration:1950,priority:'critical'},{name:'Static Cascade',type:'circles',duration:1500}],
  phases:[
   {id:'calder-overload-75',name:'Calder Cuts the Power',atPct:75,triggerMechanic:overload},
   {id:'calder-overload-50',name:'Emergency Grid Failure',atPct:50,damageScale:1.05,triggerMechanic:overload},
   {id:'calder-overload-25',name:'Final Overload',atPct:25,damageScale:1.10,triggerMechanic:overload}
  ],
  environment:{
   room:'generator-hall',bounds:{left:8,right:92,top:8,bottom:92},
   blockers:[
    {id:'transformer-n',x:50,y:12,w:18,h:8,blocksLos:true,blocksMovement:true},
    {id:'transformer-s',x:50,y:88,w:18,h:8,blocksLos:true,blocksMovement:true}
   ]
  }
 }
}
function renderId(id){
 const s=String(id||'');
 if(s.startsWith('p-')){const cid=s.slice(2),i=party().findIndex(c=>String(c.id)===cid);return i>=0?'p'+i:null}
 if(/^e-\d+$/.test(s))return'e'+Number(s.slice(2));
 return s
}
function charFor(id){const s=String(id||'');return s.startsWith('p-')?party().find(c=>String(c.id)===s.slice(2)):null}
function addUnit(id,label,cls,x,y,big=false){
 const e=document.createElement('div');e.className='bs-unit cb2d-unit '+cls+(big?' big':'');e.dataset.bs=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span><em class="cb2d-unit-hp"><i></i></em>';$('#bsUnits')?.appendChild(e)
}
function bsSafePoint(x,y){return{x:Math.max(7,Math.min(93,Number(x)||50)),y:Math.max(11,Math.min(89,Number(y)||50))}}
function move(id,x,y,ms=420){const e=$('[data-bs="'+id+'"]');if(!e)return;const p=bsSafePoint(x,y);e.style.transitionDuration=Math.round(ms/Math.max(.25,Number(run?.speed)||1))+'ms';e.style.left=p.x+'%';e.style.top=p.y+'%'}
function bsUnitPosition(id){
 const e=$('[data-bs="'+id+'"]');return e?{x:Number.parseFloat(e.style.left)||50,y:Number.parseFloat(e.style.top)||50}:{x:50,y:50}
}
function bsCombatProfile(c){
 const r=role(c);if(r==='tank')return'tank';if(r==='healer')return'healer';
 const cls=String(c?.class||'').toLowerCase(),spec=String(c?.spec||'').toLowerCase();
 if(/hunter|mage|warlock|evoker/.test(cls))return'ranged';
 if(cls==='priest')return'ranged';
 if(cls==='shaman'&&!/enhance/.test(spec))return'ranged';
 if(cls==='druid'&&/balance/.test(spec))return'ranged';
 return'melee'
}
function bsFormationPoint(ch,i){
 const boss=bsUnitPosition('e0'),profile=bsCombatProfile(ch),members=party(),same=members.filter(x=>bsCombatProfile(x)===profile),slot=Math.max(0,same.indexOf(ch));
 if(profile==='tank')return bsSafePoint(boss.x-11,boss.y);
 if(profile==='melee'){const ys=[-11,11,-18,18];return bsSafePoint(boss.x-15-(slot%2)*2,boss.y+(ys[slot]||0))}
 if(profile==='ranged'){const ys=[-18,18,0];return bsSafePoint(boss.x-32-(slot%2)*3,boss.y+(ys[slot]||0))}
 return bsSafePoint(boss.x-39,boss.y+14)
}
function bsRegroup(ms=360,epochs=null){
 party().forEach((ch,i)=>{
   if((Number(run?.hp?.[ch.id])||0)<=0)return;
   const id='p'+i;
   if(epochs&&Number(run?.movementEpoch?.[id]||0)!==Number(epochs[id]||0))return;
   const p=bsFormationPoint(ch,i);move(id,p.x,p.y,ms)
 })
}
function bar(id,pct){const e=$('[data-bs="'+id+'"] .cb2d-unit-hp i');if(e)e.style.width=Math.max(0,Math.min(100,pct))+'%'}
function resourceDef(c){return window.CellboundCombatReborn?.RESOURCE_DEFS?.[c?.class]||{name:'Power',max:100,start:100}}
function resourceClass(name){return'resource-'+String(name||'power').toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function updateResource(c,name,value,max,mode='state'){
 if(!c)return;const i=party().findIndex(x=>String(x.id)===String(c.id)),u=$('[data-bs="p'+i+'"]');if(!u)return;
 let el=u.querySelector('.cbr-resource');if(!el){el=document.createElement('small');el.className='cbr-resource';el.innerHTML='<i></i>';u.appendChild(el)}
 const def=resourceDef(c),resource=String(name||def.name||'Power'),limit=Math.max(1,Number(max)||def.max||100),val=Math.max(0,Math.min(limit,Number(value)||0)),key=resourceClass(resource);
 [...el.classList].filter(x=>x.startsWith('resource-')).forEach(x=>el.classList.remove(x));el.classList.add(key);el.dataset.resource=resource;el.title=resource;
 const fill=el.querySelector('i');if(fill){fill.style.transition=mode==='RESOURCE_STATE'?'width .7s linear':'width .25s ease-out';fill.style.width=(val/limit*100)+'%'}
 run.resources=run.resources||{};run.resources[c.id]={name:resource,max:limit,value:val}
}
function mountResource(c){const d=run?.resources?.[c.id]||resourceDef(c);updateResource(c,d.name,d.value??d.start,d.max,'initial')}
function point(id){const arena=$('#bsArena'),e=$('[data-bs="'+id+'"]');if(!arena||!e)return null;const a=arena.getBoundingClientRect(),r=e.getBoundingClientRect();return{x:r.left+r.width/2-a.left,y:r.top+r.height/2-a.top}}
function floatText(id,text,kind='damage'){
 const p=point(id),arena=$('#bsArena');if(!p||!arena)return;const e=document.createElement('b');e.className='bs-float '+kind;e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),850)
}
function projectile(from,to,enemy=false){
 const a=point(from),b=point(to),fx=$('#bsFx');if(!a||!b||!fx)return;const e=document.createElement('i');e.className='bs-shot '+(enemy?'enemy':'player');e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.setProperty('--dx',(b.x-a.x)+'px');e.style.setProperty('--dy',(b.y-a.y)+'px');fx.appendChild(e);setTimeout(()=>e.remove(),430)
}
function setStatus(t){const e=$('#bsStatus');if(e)e.textContent=t}
function feed(t){if(!run)return;run.log.push(t);const e=$('#bsFeed');if(e)e.innerHTML=run.log.slice(-8).reverse().map(x=>'<p>'+esc(x)+'</p>').join('')}
function statusTargets(id){
 const out=[],rid=renderId(id),unit=rid?$('[data-bs="'+rid+'"]'):null;if(unit)out.push(unit);
 const c=charFor(id),row=c?Array.from(document.querySelectorAll('[data-bs-side]')).find(x=>x.dataset.bsSide===String(c.id)):null;if(row)out.push({el:row,mirror:true});
 return out
}
function renderPartyRows(){
 const e=$('#bsRows');if(!e)return;
 e.innerHTML=party().map(c=>'<div class="cb2d-party-row" data-bs-side-row="'+esc(c.id)+'"><i class="cb2d-dot '+classKey(c)+'"></i><span data-bs-side="'+esc(c.id)+'"><b>'+esc(c.name)+'</b><small>'+role(c).toUpperCase()+' · '+esc(c.spec)+'</small><em class="cb2d-side-hp"><i data-bs-side-hp="'+esc(c.id)+'" style="width:'+(run?.hp?.[c.id]!=null?Number(run.hp[c.id]):100)+'%"></i></em></span><strong data-bs-side-text="'+esc(c.id)+'">'+Math.round(run?.hp?.[c.id]!=null?Number(run.hp[c.id]):100)+' HP</strong></div>').join('')
}
function updateSideHp(c,pct){
 if(!c)return;const id=String(c.id),row=Array.from(document.querySelectorAll('[data-bs-side-row]')).find(x=>x.dataset.bsSideRow===id);if(!row)return;
 const strong=Array.from(document.querySelectorAll('[data-bs-side-text]')).find(x=>x.dataset.bsSideText===id),hp=Array.from(document.querySelectorAll('[data-bs-side-hp]')).find(x=>x.dataset.bsSideHp===id);
 if(strong)strong.textContent=Math.round(pct)+' HP';if(hp)hp.style.width=pct+'%'
}
function bsAct(r,text){const e=document.querySelector('[data-bs-act="'+r+'"] em');if(e)e.textContent=text}
function renderMeters(){
 if(!run)return;const chars=party(),elapsed=Math.max(1,Number(run.combatElapsed||1)/1000);
 const damage=chars.map(c=>({c,v:Number(run.damage?.[c.id])||0})).sort((a,b)=>b.v-a.v),dm=Math.max(1,...damage.map(x=>x.v));
 const heal=chars.map(c=>({c,v:Number(run.healing?.[c.id])||0})).sort((a,b)=>b.v-a.v),hm=Math.max(1,...heal.map(x=>x.v));
 const threat=chars.map(c=>({c,v:Number(run.threat?.[c.id])||0})).sort((a,b)=>b.v-a.v),tm=Math.max(1,...threat.map(x=>x.v));
 const d=$('#bsDamage');if(d)d.innerHTML=damage.map(({c,v},i)=>'<div class="cb2d-meter-row '+classKey(c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+'</b><span>'+Math.round(v)+' · '+Math.round(v/elapsed)+' DPS</span></div><em><i style="width:'+(v/dm*100)+'%"></i></em></div>').join('');
 const h=$('#bsHealing');if(h)h.innerHTML=heal.map(({c,v},i)=>'<div class="cb2d-meter-row '+classKey(c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+'</b><span>'+Math.round(v)+' · '+Math.round(v/elapsed)+' HPS</span></div><em><i style="width:'+(v/hm*100)+'%"></i></em></div>').join('');
 const t=$('#bsThreat');if(t)t.innerHTML=threat.map(({c,v},i)=>'<div class="cb2d-meter-row '+classKey(c)+(String(c.id)===String(run.aggro)?' aggro':'')+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+(String(c.id)===String(run.aggro)?' <strong>AGGRO</strong>':'')+'</b><span>'+Math.round(v)+' · '+Math.round(v/tm*100)+'%</span></div><em><i style="width:'+(v/tm*100)+'%"></i></em></div>').join('')
}
function queueMeterRender(){
 if(!run||meterRenderPending)return;
 const wait=Math.max(0,120-(performance.now()-lastMeterRenderAt));
 meterRenderPending=true;
 setTimeout(()=>requestAnimationFrame(()=>{
  meterRenderPending=false;
  if(!run)return;
  lastMeterRenderAt=performance.now();
  renderMeters()
 }),wait)
}
function castStart(name,duration){
 const p=$('#bsCast');if(p)p.hidden=false;const n=$('#bsCastName'),time=$('#bsCastTime'),fill=$('#bsCastFill');if(n)n.textContent=name;if(time)time.textContent=(duration/1000).toFixed(1)+'s';if(fill){fill.style.transition='none';fill.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!fill.isConnected)return;fill.style.transition='width '+Math.max(.1,duration/1000)+'s linear';fill.style.width='100%'}))}
}
function castClear(){const n=$('#bsCastName'),time=$('#bsCastTime'),fill=$('#bsCastFill');if(n)n.textContent='—';if(time)time.textContent='—';if(fill){fill.style.transition='none';fill.style.width='0%'}}
function showRoleZones(zones){
 const layer=$('#bsRoleZones');if(!layer)return'';
 const epoch=String((Number(layer.dataset.zoneEpoch)||0)+1);
 layer.dataset.zoneEpoch=epoch;layer.classList.remove('resolving');layer.innerHTML='';
 Object.entries(zones||ROLE_ZONES).forEach(([r,z])=>{const e=document.createElement('div');e.className='bs-role-zone '+(z.color||r);e.style.left=z.x+'%';e.style.top=z.y+'%';e.style.width=(z.radius*2)+'%';e.style.aspectRatio='1';e.innerHTML='<b>'+esc(z.label||r.toUpperCase())+'</b>';layer.appendChild(e)});
 $('#bsArena')?.classList.add('blackout');
 return epoch
}
function hideRoleZones(immediate=false){
 const layer=$('#bsRoleZones'),arena=$('#bsArena');if(arena)arena.classList.remove('blackout');if(!layer)return;
 const epoch=layer.dataset.zoneEpoch||'0';
 if(immediate||!layer.childElementCount){layer.classList.remove('resolving');layer.innerHTML='';return}
 layer.classList.add('resolving');
 const speed=Math.max(.25,Number(run?.speed)||1),delay=Math.max(70,120/speed);
 setTimeout(()=>{if(!layer.isConnected||layer.dataset.zoneEpoch!==epoch)return;layer.innerHTML='';layer.classList.remove('resolving')},delay)
}
function eventRender(e){
 try{if(window.CellboundCombatStatuses?.handle(e,{resolve:statusTargets,speed:()=>run?.speed||1}))return}catch(error){console.warn('Blackout Station status UI skipped',e?.type,error)}

 const src=renderId(e.source),target=renderId(e.target),srcChar=charFor(e.source),targetChar=charFor(e.target);
 switch(e.type){
  case'COMBAT_START':{hideRoleZones(true);$('#bsArena')?.classList.remove('shockwave');const oc=(Number(run?.cluesUsed)||0)*CLUE_HP_PCT;setStatus('Generator hall combat live'+(oc?' · CALDER OVERCHARGE +'+oc+'%':'')+'.');feed('Dr. Vex Calder steps into the restored light.'+(oc?' Diagnostics have increased his maximum health by '+oc+'%.':''));break}
  case'MOVEMENT_START':
   if(src&&e.payload?.to){run.movementEpoch=run.movementEpoch||{};run.movementEpoch[src]=(Number(run.movementEpoch[src])||0)+1;move(src,e.payload.to.x,e.payload.to.y,e.payload.duration||420)}
   break;
  case'ABILITY_START':
   if(src&&target)projectile(src,target,String(e.source||'').startsWith('e-'));
   if(srcChar)bsAct(srcChar.role,(e.ability||'Acting')+'…');
   break;
  case'DAMAGE_DEALT':
   if(target){const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));bar(target,pct);floatText(target,'-'+Math.round(Number(e.amount)||0),targetChar?'incoming':'damage');if(targetChar){run.hp[targetChar.id]=pct;updateSideHp(targetChar,pct);if(Number(e.amount)>0&&pct<=35)feed(targetChar.name+' drops to '+Math.round(pct)+'% HP from '+(e.ability||'incoming damage')+'.')}}
   if(srcChar){run.damage[srcChar.id]=(Number(run.damage[srcChar.id])||0)+(Number(e.amount)||0);queueMeterRender()}
   break;
  case'HEAL_RECEIVED':
   if(target&&targetChar){const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));bar(target,pct);run.hp[targetChar.id]=pct;floatText(target,'+'+Math.round(Number(e.amount)||0),'heal');updateSideHp(targetChar,pct)}
   if(srcChar){run.healing[srcChar.id]=(Number(run.healing[srcChar.id])||0)+(Number(e.amount)||0);queueMeterRender()}
   break;
  case'RESOURCE_STATE':case'RESOURCE_SPENT':case'RESOURCE_GAINED':
   if(srcChar)updateResource(srcChar,e.payload?.resource,e.payload?.value,e.payload?.max,e.type);
   break;
  case'THREAT_GENERATED':if(srcChar){run.threat[srcChar.id]=Number(e.payload?.total)||0;queueMeterRender()}break;
  case'AGGRO_CHANGED':
   run.aggro=targetChar?.id||null;
   if(e.payload?.threat)Object.entries(e.payload.threat).forEach(([id,v])=>{const ch=charFor(id);if(ch)run.threat[ch.id]=Number(v)||0});
   queueMeterRender();break;
  case'PHASE_CHANGE':hideRoleZones(true);setStatus(e.ability||'Power instability');feed((e.ability||'Calder changes phase')+'. The station lights begin to fail.');break;
  case'MECHANIC_TELEGRAPH':
   if(e.payload?.mechanicType==='role-circles'){showRoleZones(e.payload.zones);setStatus('ROLE CIRCUITS — RED TANK · YELLOW DAMAGE · BLUE HEALER');feed('Calder pulls the power. Get every character into the correct coloured circuit.')}
   else if($('#bsRoleZones')?.childElementCount)hideRoleZones(true);
   break;
  case'CAST_START':castStart(e.ability||'Enemy cast',Number(e.payload?.duration)||0);break;
  case'CAST_FINISH':case'INTERRUPT':castClear();break;
  case'MECHANIC_SAFE':if(target){floatText(target,'PROTECTED','heal')}break;
  case'ROLE_SHOCKWAVE':{
   const arena=$('#bsArena');hideRoleZones(false);
   let shockEpoch=0;if(arena){shockEpoch=(Number(arena.dataset.shockEpoch)||0)+1;arena.dataset.shockEpoch=String(shockEpoch);arena.classList.remove('shockwave');void arena.offsetWidth;arena.classList.add('shockwave')}
   setStatus(e.result==='casualties'?'SHOCKWAVE — WRONG ROLE CIRCUIT':'SHOCKWAVE SURVIVED');feed(e.result==='casualties'?'Emergency Overload resolves: anyone outside their correct role circle is killed instantly.':'Emergency Overload resolves safely. Every living character reached the correct role circuit.');
   const epochs={};party().forEach((ch,i)=>{epochs['p'+i]=Number(run?.movementEpoch?.['p'+i]||0)});
   const speed=Math.max(.25,Number(run?.speed)||1),delay=Math.max(120,320/speed);
   setTimeout(()=>{if(!run)return;if(arena&&Number(arena.dataset.shockEpoch)===shockEpoch)arena.classList.remove('shockwave');bsRegroup(360,epochs)},delay);
   break;
  }
  case'PLAYER_DEFEATED':if(target){$('[data-bs="'+target+'"]')?.classList.add('dead');bar(target,0);floatText(target,'DEFEATED','incoming');if(targetChar){run.hp[targetChar.id]=0;updateSideHp(targetChar,0);feed(targetChar.name+' is defeated by '+(e.ability||'Dr. Vex Calder')+'.')}}break;
  case'PLAYER_REVIVED':if(target){const pct=Number(e.payload?.targetHpPct)||35;$('[data-bs="'+target+'"]')?.classList.remove('dead');bar(target,pct);floatText(target,'REVIVED','heal');if(targetChar){run.hp[targetChar.id]=pct;updateSideHp(targetChar,pct);updateResource(targetChar,e.payload?.resource,e.payload?.resourceValue,e.payload?.resourceMax,'PLAYER_REVIVED')}}break;
  case'ENEMY_DEFEATED':if(target){$('[data-bs="'+target+'"]')?.classList.add('dead');bar(target,0);feed('Dr. Vex Calder collapses beside the overloaded generator.')}break;
  case'PLAYER_MISTAKE':if(srcChar)feed(srcChar.name+' '+(e.payload?.detail||'hesitates')+'.');break;
  case'COMBAT_END':castClear();hideRoleZones(true);$('#bsArena')?.classList.remove('shockwave');setStatus(e.result==='victory'?'Dr. Vex Calder defeated.':'PARTY WIPED');feed(e.result==='victory'?'Combat complete. Calder is down.':'Combat ends in a party wipe. Review the failure report below.');break
 }
}
async function playTimeline(result,tok){
 const events=(result?.events||[]).slice().sort((a,b)=>(Number(a.timestamp)||0)-(Number(b.timestamp)||0));
 if(!run)return false;if(!events.length)return result?.outcome==='victory';
 return await new Promise(resolve=>{
  let index=0,simTime=0,lastFrame=performance.now(),finished=false,visualErrors=0;
  const finish=value=>{if(finished)return;finished=true;resolve(value)};
  const frame=now=>{
   if(finished)return;
   if(tok!==token||!run){finish(false);return}
   const delta=Math.min(Math.max(0,now-lastFrame),100);lastFrame=now;
   simTime+=delta*Math.max(.25,Number(run.speed)||1);run.combatElapsed=simTime;
   const frameStarted=performance.now();let handled=0;
   while(index<events.length&&(Number(events[index].timestamp)||0)<=simTime+4&&handled<12&&performance.now()-frameStarted<7){
    const e=events[index++];handled++;
    try{eventRender(e)}catch(error){visualErrors++;console.warn('Blackout Station combat visual recovered',e?.type,e?.ability,error);if(visualErrors===1)feed('A display event was recovered without interrupting combat.')}
   }
   if(index>=events.length){finish(result?.outcome==='victory');return}
   requestAnimationFrame(frame)
  };
  requestAnimationFrame(frame)
 })
}
function drawCombat(){
 const r=root(),oc=(Number(run?.cluesUsed)||0)*CLUE_HP_PCT;r.hidden=false;
 r.innerHTML='<section class="cb2d-shell bs2d-shell">'+
 '<header class="cb2d-head"><div><small>BLACKOUT STATION · LIVE 2D DUNGEON</small><h2 id="bsTitle">Dr. Vex Calder</h2></div><div class="cb2d-live"><i></i>LIVE <button data-bs-speed>'+run.speed+'×</button><button data-bs-close>×</button></div></header>'+
 '<div class="cb2d-route bs2d-route"><span class="done"><i>1</i>Grid Alignment</span><span class="current"><i>2</i>Dr. Vex Calder</span></div>'+
 '<div class="cb2d-layout"><main>'+
 '<div id="bsArena" class="cb2d-arena bs-arena"><div class="cb2d-floor bs-station-env"><div class="bs-generator g1"></div><div class="bs-generator g2"></div><div class="bs-transformer t1"></div><div class="bs-transformer t2"></div><div class="bs-cable-floor"></div></div><div class="cb2d-ground-legend"><span class="danger">RED · TANK</span><span class="spawn">YELLOW · DAMAGE</span><span class="aggro">BLUE · HEALER</span></div><div id="bsRoleZones" class="bs-role-zones"></div><div id="bsTelegraphs"></div><div id="bsUnits"></div><div id="bsFx"></div><div class="cb2d-room-tag"><small>GENERATOR HALL</small><b>Main turbine chamber</b></div><div class="cb2d-caption"><span>FINAL BOSS</span><b id="bsStatus">Power restored. Calder engages.</b></div></div>'+
 '<div class="cb2d-controls bs-authority"><div><b>COMBAT REBORN</b><small>Pre-dungeon tactics are authoritative. Calder\'s role circuits use live arena positions.</small></div><div><b>CALDER OVERCHARGE</b><small>+'+oc+'% maximum health from diagnostics used.</small></div></div>'+
 '<div class="cb2d-feed"><small>COMBAT FEED</small><div id="bsFeed"></div></div></main>'+
 '<aside><div class="cb2d-cast" id="bsCast"><small>ENEMY CAST</small><div><b id="bsCastName">—</b><strong id="bsCastTime">—</strong></div><div class="cb2d-castbar"><i id="bsCastFill"></i></div></div>'+
 '<div class="cb2d-combat-meters"><section class="cb2d-meter-panel damage"><div class="cb2d-meter-head"><small>DAMAGE METER</small><span>LIVE</span></div><div id="bsDamage" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel healing"><div class="cb2d-meter-head"><small>HEALING METER</small><span>LIVE</span></div><div id="bsHealing" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel threat"><div class="cb2d-meter-head"><small>THREAT METER</small><span>Calder</span></div><div id="bsThreat" class="cb2d-meter-list"></div></section></div>'+
 '<div class="cb2d-actions"><small>PARTY ACTIONS</small><div data-bs-act="tank"><i class="cb2d-dot tank"></i><b>Tank</b><em>Taking point</em></div><div data-bs-act="healer"><i class="cb2d-dot healer"></i><b>Healer</b><em>Following formation</em></div><div data-bs-act="dps"><i class="cb2d-dot dps"></i><b>Damage</b><em>Acquiring target</em></div></div>'+
 '<div class="cb2d-party"><small>PARTY CONDITION · ILVL '+ilvl()+'</small><div id="bsRows"></div></div>'+
 '<div class="cb2d-plan"><small>ENCOUNTER RULE</small><b>ROLE CIRCUITS</b><span>Red Tank · Yellow Damage · Blue Healer · wrong zone is lethal</span></div></aside></div>'+
 '<div id="bsEnd" class="cb2d-end" hidden></div></section>';
 r.querySelector('[data-bs-close]').onclick=close;
 r.querySelector('[data-bs-speed]').onclick=e=>{run.speed=run.speed===2?1:2;e.currentTarget.textContent=run.speed+'×'};
 renderPartyRows();
 const p=party();p.forEach((c,i)=>addUnit('p'+i,c.name,'party '+role(c)+' '+classKey(c),role(c)==='tank'?38:role(c)==='healer'?18:26,24+i*13));
 p.forEach(c=>mountResource(c));
 addUnit('e0','Dr. Vex Calder','enemy boss',68,50,true);renderMeters();
 feed('Power restored. Dr. Vex Calder enters the generator hall.')
}
async function startBoss(){
 if(!run)return;drawCombat();const tok=token,C=window.CellboundCombatStandard;if(!C?.simulate){setStatus('Combat Reborn unavailable');feed('Combat standard gateway unavailable.');return}
 try{
  const combatParty=party().map(c=>Object.assign({},c,{_combatHealthPct:100,_combatResource:run.resources?.[c.id]||null,_combatItemLevel:Number(Game?.characterItemLevel?.(c))||Number(c.gear)||0}));
  let result=C.simulate({party:combatParty,encounter:bossEncounter(),tactics:{pullStyle:'normal',cooldownUse:'difficult',interruptPriority:'standard',interruptAssignment:'dps-rotation',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'immediate',movementDiscipline:'balanced'},seed:'blackout-station:'+run.seed},{zone:'blackout-station'});
  const hasCombat=(result.events||[]).some(e=>e.type==='DAMAGE_DEALT'||e.type==='HEAL_RECEIVED'||e.type==='ABILITY_START');
  if(!hasCombat)throw new Error('Combat Reborn produced no actionable events.');
  run.result=result;
  const won=await playTimeline(result,tok);if(tok!==token||!run)return;
  if(won)await complete();else fail()
 }catch(error){
  console.error('Blackout Station boss runtime',error);setStatus('Encounter runtime interrupted');feed('Boss runtime error: '+String(error?.message||error))
 }
}
function hpNeed(level){return 800+Math.max(0,(Number(level)||1)-1)*250}
function awardXp(){
 return party().map(c=>{let level=Math.max(1,Number(c.level)||1),xp=Math.max(0,Number(c.xp)||0)+XP,levels=0;while(xp>=hpNeed(level)){xp-=hpNeed(level);level++;levels++}c.level=level;c.xp=xp;if(levels)c.talent=(Number(c.talent)||0)+levels;return{name:c.name,level,xp,levels}})
}
async function syncXp(gains){
 if(!db)return;const user=Game.getUser?.();if(!user)return;try{await Promise.all(gains.map(x=>db.from('characters').update({level:x.level,xp:x.xp,last_played_at:new Date().toISOString()}).eq('user_id',user.id).eq('name',x.name)))}catch(e){console.warn('Blackout Station XP sync failed',e)}
}
function rollGear(){
 const pool=(G?.items||[]).filter(x=>x.enabled&&Number(x.tier)>=3);if(!pool.length)return null;const base=pool[Math.floor(Math.random()*pool.length)];return G.rollItemAffixes?.({...base,source:'Blackout Station · Dr. Vex Calder'})||{...base,source:'Blackout Station · Dr. Vex Calder'}
}
function bsLootRarityClass(item){return'rarity-'+String(item?.rarity||'common').toLowerCase().replace(/[^a-z0-9-]/g,'')}
function bsLootGearCard(item){
 const art=G?.artHTML?G.artHTML(item,72):(item?.icon||'◇'),stats=G?.statLines?.(item)||[];
 const effect=item?.uniqueEffect?'<strong class="cb2d-loot-unique">'+esc(item.uniqueEffect.name)+' · '+esc(item.uniqueEffect.description)+'</strong>':'';
 return '<article class="cb2d-loot-item '+bsLootRarityClass(item)+'"><div class="cb2d-loot-art">'+art+'</div><div><small>'+esc(String(item?.rarity||'GEAR').toUpperCase())+' · '+esc(String(item?.slot||'EQUIPMENT').toUpperCase())+'</small><h4>'+esc(item?.name||'Unknown Item')+'</h4><p>Item Level '+Number(item?.itemLevel||0)+(item?.power?' · +'+Number(item.power)+' Power':'')+'</p><div class="cb2d-loot-roll">'+stats.map(s=>'<span>'+esc(s.text)+'</span>').join('')+'</div>'+effect+'<em>Sent to Guild Bank</em></div></article>'
}
async function complete(){
 const s=state(),result=run.result,summary=result?.summary||{},gains=awardXp(),gear=rollGear(),overrideDrop=Math.random()<GRID_OVERRIDE_DROP_CHANCE?createGridOverrideModule():null,gold=320,renown=140,shards=10;
 s.gold=(Number(s.gold)||0)+gold;s.renown=(Number(s.renown)||0)+renown;s.blackoutStationCompletions=(Number(s.blackoutStationCompletions)||0)+1;s.activity=Array.isArray(s.activity)?s.activity:[];
 Game.addMaterial?.('cell-shards',shards);if(gear)Game.addBankItem?.(gear);if(overrideDrop)Game.addBankItem?.(overrideDrop);
 s.activity.push('Blackout Station cleared. Dr. Vex Calder defeated after the grid restoration. Each adventurer earned '+XP+' XP.'+(gear?' '+gear.name+' was sent to the Guild Bank.':'')+(overrideDrop?' Rare drop: Grid Override Module (5 uses).':''));
 Game.save?.();await Game.persistState?.();await syncXp(gains);
 const deaths=Number(summary.deaths)||0,failed=Number(summary.mechanics?.failed)||0,timeMs=Number(result.durationMs)||0,score=Math.max(0,760-Math.round(timeMs/1000)*2-deaths*60-failed*35);
 const e=$('#bsEnd');if(!e)return;e.hidden=false;e.className='cb2d-end cb2d-loot-screen cb2d-results-screen';$('.bs2d-shell')?.classList.add('results-mode');e.innerHTML='<div class="cb2d-loot-wrap"><header class="cb2d-loot-head"><div><small>BLACKOUT STATION · CLEARED</small><h3>Grid Secured</h3><p>The generator hall falls silent. The station is powered, Calder is down, and the recovered equipment has been secured.</p></div><div class="cb2d-loot-complete">✓<span>DUNGEON<br>COMPLETE</span></div></header><div class="cb2d-loot-currency"><article><span>GOLD</span><b>+'+gold+'</b><small>Added to Guild treasury</small></article><article><span>RENOWN</span><b>+'+renown+'</b><small>Guild reputation earned</small></article><article><span>PARTY XP</span><b>+'+XP+'</b><small>Each adventurer</small></article><article><span>CELL SHARDS</span><b>+'+shards+'</b><small>Recovered from the grid</small></article><article><span>RUN SCORE</span><b>'+score+'</b><small>'+Math.round(timeMs/1000)+'s boss combat</small></article></div><section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>GEAR ACQUIRED</span><small>Stored automatically in the Guild Bank</small></div><div class="cb2d-loot-gear">'+(gear?bsLootGearCard(gear):'<div class="cb2d-loot-empty">No equipment recovered.</div>')+'</div></section>'+(overrideDrop?'<section class="cb2d-loot-section bs-override-drop-section"><div class="cb2d-loot-title"><span>RARE UTILITY DROP</span><small>10% chance · separate from equipment loot</small></div><article class="bs-override-drop-card">'+gridOverrideArt(72)+'<div><small>RARE · UTILITY</small><h4>Grid Override Module</h4><p>5 / 5 uses · Automatically restores the Blackout Station grid after your first manual clear.</p><em>TRADEABLE · SENT TO GUILD BANK</em></div></article></section>':'')+'<section class="bs-run-summary"><article><b>'+run.moves+'</b><span>Puzzle moves</span></article><article><b>'+deaths+'</b><span>Deaths</span></article><article><b>'+failed+'</b><span>Failed mechanics</span></article></section><footer class="cb2d-loot-actions"><button data-bs-bank>VIEW GUILD BANK</button><button class="primary" data-bs-return>RETURN TO DUNGEONS →</button></footer></div>';
 e.querySelector('[data-bs-bank]').onclick=()=>{close();Game.switchView?.('bank')};e.querySelector('[data-bs-return]').onclick=()=>{close();Game.switchView?.('content')};
 renderCard()
}
function failureDiagnosis(){
 const events=run?.result?.events||[],summary=run?.result?.summary||{},shockDeaths=events.filter(e=>e.type==='PLAYER_DEFEATED'&&/overload/i.test(String(e.ability||''))),deaths=events.filter(e=>e.type==='PLAYER_DEFEATED'),failed=Number(summary.mechanics?.failed)||0;
 if(shockDeaths.length)return shockDeaths.length+' character'+(shockDeaths.length===1?' was':'s were')+' killed by Emergency Overload after missing the correct role circuit.';
 if(failed)return failed+' encounter mechanic'+(failed===1?' was':'s were')+' failed before the party collapsed.';
 if(deaths.length)return 'The party was overwhelmed by Calder\'s sustained damage before the boss could be finished.';
 return 'The party failed the encounter damage / healing check.'
}
function fail(){
 Game.applyPartyCellShock?.(25);const e=$('#bsEnd');if(!e)return;e.hidden=false;e.className='cb2d-end bs-wipe-report cb2d-results-screen';$('.bs2d-shell')?.classList.add('results-mode');e.innerHTML='<div><small>BLACKOUT STATION · EXPEDITION FAILED</small><h3>Party Wiped</h3><p>'+esc(failureDiagnosis())+'</p><strong>Every adventurer gained 25% Cell Shock.</strong></div><button data-bs-return>RETURN TO DUNGEONS →</button>';e.querySelector('[data-bs-return]').onclick=()=>{close();Game.switchView?.('content')}
}
function startRun(){
 const gate=readiness();if(!gate.ok)return;const quickReconnect=(Number(state()?.blackoutStationCompletions)||0)>0;token++;
 run={speed:1,seed:Date.now().toString(36),board:shuffledBoard(),moves:0,powered:false,quickReconnect,overrideInProgress:false,overrideUsed:false,cluesUsed:0,cluesRemaining:5,log:[quickReconnect?'Previous clear recognised. Quick reconnect authorised: only one continuous path to the breaker is required.':'First-clear protocol active. Restore all 15 cable tiles before the breaker will close.'],damage:Object.fromEntries(party().map(c=>[c.id,0])),healing:Object.fromEntries(party().map(c=>[c.id,0])),threat:Object.fromEntries(party().map(c=>[c.id,0])),hp:Object.fromEntries(party().map(c=>[c.id,100])),resources:Object.fromEntries(party().map(c=>{const d=resourceDef(c);return[c.id,{name:d.name,max:d.max,value:d.start}]})),aggro:null,combatElapsed:0,movementEpoch:{},result:null};renderPuzzle()
}
function init(){
 Game=window.CellboundGame;G=window.CellboundGear;if(!Game?.ready){setTimeout(init,100);return}db=Game.getSupabase?.();renderCard();
 document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',renderCard);
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='content')renderCard()});
 window.CellboundBlackoutStation={open:openDungeon,renderCard}
}
init();
})();
