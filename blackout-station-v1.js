(()=>{
'use strict';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const XP=700,ENTRY_ILVL=34,BOSS_LEVEL=13;
const ROLE_ZONES={
 tank:{x:27,y:27,radius:9,color:'red',label:'TANK'},
 dps:{x:48,y:74,radius:14,color:'yellow',label:'DAMAGE'},
 healer:{x:73,y:27,radius:9,color:'blue',label:'HEALER'}
};
const CABLES=['h','h','h','sw','v','h','h','nw','ne','h','h','sw','v','h','h'];

let Game=null,G=null,db=null,run=null,token=0;

const wait=ms=>new Promise(r=>setTimeout(r,Math.max(0,Math.round(ms/((run&&run.speed)||1)))));
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const role=c=>Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps';
const classKey=c=>'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ilvl=()=>Number(Game?.partyItemLevel?.())||0;

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
function puzzleSolved(){return run?.board?.every((v,i)=>v===(i===15?null:i))}
function cableMarkup(type){return '<i class="bs-cable '+type+'"><u></u><u></u></i>'}
function renderPuzzle(){
 if(!run)return;const r=root(),blank=run.board.indexOf(null);
 r.innerHTML='<section class="bs-puzzle-shell '+(run.powered?'powered':'')+'"><header><div><small>BLACKOUT STATION · GRID CONTROL</small><h2>Main Distribution Board</h2><p>Slide a cable section into the empty slot. Restore the circuit to bring the station back online.</p></div><button data-bs-close>×</button></header><div class="bs-puzzle-layout"><main><div class="bs-grid-frame"><div class="bs-grid-source"><span>GRID<br>INPUT</span></div><div class="bs-grid-board">'+run.board.map((tile,pos)=>tile==null?'<div class="bs-grid-empty" data-pos="'+pos+'"><span>EMPTY</span></div>':'<button class="bs-grid-tile" data-tile-pos="'+pos+'" data-cable="'+CABLES[tile]+'" aria-label="Cable tile">'+cableMarkup(CABLES[tile])+'</button>').join('')+'</div><div class="bs-grid-breaker"><span>MAIN<br>BREAKER</span></div></div><div class="bs-puzzle-readout"><span>MOVES <b>'+run.moves+'</b></span><span>GRID STATUS <b>'+ (run.powered?'ONLINE':'NO POWER') +'</b></span><button data-bs-reset>RESHUFFLE</button></div></main><aside><small>POWER RESTORATION</small><div class="bs-station-schematic"><i></i><i></i><i></i><i></i><strong>0%</strong></div><h3>The station is dark.</h3><p>Only tiles beside the empty slot can move. When the original cable layout is restored, the main breaker will close automatically.</p><div class="bs-puzzle-log">'+run.log.slice(-4).reverse().map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></aside></div></section>';
 r.querySelector('[data-bs-close]').onclick=close;
 r.querySelector('[data-bs-reset]').onclick=()=>{run.board=shuffledBoard();run.moves=0;run.log.push('The board was reshuffled.');renderPuzzle()};
 r.querySelectorAll('[data-tile-pos]').forEach(b=>b.onclick=()=>slideTile(Number(b.dataset.tilePos),blank))
}
async function slideTile(pos,blank){
 if(!run||!neighbours(blank).includes(pos))return;
 run.board[blank]=run.board[pos];run.board[pos]=null;run.moves++;renderPuzzle();
 if(puzzleSolved())await powerOn()
}
async function powerOn(){
 if(!run||run.powered)return;run.powered=true;run.log.push('Circuit complete. Main breaker closing.');
 const board=$('.bs-grid-frame');board?.classList.add('solved');const schematic=$('.bs-station-schematic');if(schematic)schematic.classList.add('online');
 const label=$('.bs-station-schematic strong');if(label)label.textContent='100%';
 await wait(500);
 root().classList.add('bs-power-flash');await wait(650);root().classList.remove('bs-power-flash');
 run.log.push('Power restored. Movement detected in the generator hall.');
 await wait(550);startBoss()
}

function bossEncounter(){
 const overload={name:'Emergency Overload',type:'role-circles',duration:5000,danger:'fatal',zones:ROLE_ZONES};
 return{
  id:'vex-calder',title:'Dr. Vex Calder',kind:'final',level:BOSS_LEVEL,recommendedItemLevel:ENTRY_ILVL,
  enemies:['Dr. Vex Calder'],enemyTypes:['boss'],enemyHealth:2450,mechanics:[],
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
 const e=document.createElement('div');e.className='bs-unit cb2d-unit '+cls+(big?' big':'');e.dataset.bs=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span><em><i></i></em>';$('#bsUnits')?.appendChild(e)
}
function move(id,x,y,ms=420){const e=$('[data-bs="'+id+'"]');if(!e)return;e.style.transitionDuration=ms+'ms';e.style.left=x+'%';e.style.top=y+'%'}
function bar(id,pct){const e=$('[data-bs="'+id+'"] > em i');if(e)e.style.width=Math.max(0,Math.min(100,pct))+'%'}
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
 const c=charFor(id),row=c?$('[data-bs-side="'+CSS.escape(String(c.id))+'"]'):null;if(row)out.push({el:row,mirror:true});
 return out
}
function renderPartyRows(){
 const e=$('#bsParty');if(!e)return;
 e.innerHTML=party().map((c,i)=>'<div class="bs-party-row '+classKey(c)+'" data-bs-party="'+esc(c.id)+'"><i></i><span data-bs-side="'+esc(c.id)+'"><b>'+esc(c.name)+'</b><small>'+role(c).toUpperCase()+' · '+esc(c.class)+'</small></span><strong id="bsHp'+i+'">100%</strong></div>').join('')
}
function renderMeters(){
 if(!run)return;const chars=party(),elapsed=Math.max(1,Number(run.combatElapsed||1)/1000);
 const damage=chars.map(c=>({c,v:Number(run.damage?.[c.id])||0})).sort((a,b)=>b.v-a.v),dm=Math.max(1,...damage.map(x=>x.v));
 const heal=chars.map(c=>({c,v:Number(run.healing?.[c.id])||0})).sort((a,b)=>b.v-a.v),hm=Math.max(1,...heal.map(x=>x.v));
 const threat=chars.map(c=>({c,v:Number(run.threat?.[c.id])||0})).sort((a,b)=>b.v-a.v),tm=Math.max(1,...threat.map(x=>x.v));
 const d=$('#bsDamage');if(d)d.innerHTML=damage.map(({c,v},i)=>'<div class="cb2d-meter-row '+classKey(c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+'</b><span>'+Math.round(v)+' · '+Math.round(v/elapsed)+' DPS</span></div><em><i style="width:'+(v/dm*100)+'%"></i></em></div>').join('');
 const h=$('#bsHealing');if(h)h.innerHTML=heal.map(({c,v},i)=>'<div class="cb2d-meter-row '+classKey(c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+'</b><span>'+Math.round(v)+' · '+Math.round(v/elapsed)+' HPS</span></div><em><i style="width:'+(v/hm*100)+'%"></i></em></div>').join('');
 const t=$('#bsThreat');if(t)t.innerHTML=threat.map(({c,v},i)=>'<div class="cb2d-meter-row '+classKey(c)+(String(c.id)===String(run.aggro)?' aggro':'')+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+(String(c.id)===String(run.aggro)?' <strong>AGGRO</strong>':'')+'</b><span>'+Math.round(v)+' · '+Math.round(v/tm*100)+'%</span></div><em><i style="width:'+(v/tm*100)+'%"></i></em></div>').join('')
}
function castStart(name,duration){
 const p=$('#bsCast');if(p)p.hidden=false;const n=$('#bsCastName'),time=$('#bsCastTime'),fill=$('#bsCastFill');if(n)n.textContent=name;if(time)time.textContent=(duration/1000).toFixed(1)+'s';if(fill){fill.style.transition='none';fill.style.width='0%';void fill.offsetWidth;fill.style.transition='width '+Math.max(.1,duration/1000)+'s linear';fill.style.width='100%'}
}
function castClear(){const n=$('#bsCastName'),time=$('#bsCastTime'),fill=$('#bsCastFill');if(n)n.textContent='—';if(time)time.textContent='—';if(fill){fill.style.transition='none';fill.style.width='0%'}}
function showRoleZones(zones){
 const layer=$('#bsRoleZones');if(!layer)return;layer.innerHTML='';
 Object.entries(zones||ROLE_ZONES).forEach(([r,z])=>{const e=document.createElement('div');e.className='bs-role-zone '+(z.color||r);e.style.left=z.x+'%';e.style.top=z.y+'%';e.style.width=(z.radius*2)+'%';e.style.aspectRatio='1';e.innerHTML='<b>'+esc(z.label||r.toUpperCase())+'</b>';layer.appendChild(e)});
 $('#bsArena')?.classList.add('blackout')
}
function hideRoleZones(){const l=$('#bsRoleZones');if(l)l.innerHTML='';$('#bsArena')?.classList.remove('blackout')}
function eventRender(e){
 if(window.CellboundCombatStatuses?.handle(e,{resolve:statusTargets,speed:1}))return;
 const src=renderId(e.source),target=renderId(e.target),srcChar=charFor(e.source),targetChar=charFor(e.target);
 switch(e.type){
  case'COMBAT_START':setStatus('Generator hall combat live.');feed('Dr. Vex Calder steps into the restored light.');break;
  case'MOVEMENT_START':if(src&&e.payload?.to)move(src,e.payload.to.x,e.payload.to.y,e.payload.duration||420);break;
  case'ABILITY_START':
   if(src&&target)projectile(src,target,String(e.source||'').startsWith('e-'));
   break;
  case'DAMAGE_DEALT':
   if(target){const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));bar(target,pct);floatText(target,'-'+Math.round(Number(e.amount)||0),targetChar?'incoming':'damage');if(targetChar){run.hp[targetChar.id]=pct;const idx=party().findIndex(c=>c.id===targetChar.id),x=$('#bsHp'+idx);if(x)x.textContent=Math.round(pct)+'%'}}
   if(srcChar){run.damage[srcChar.id]=(Number(run.damage[srcChar.id])||0)+(Number(e.amount)||0);renderMeters()}
   break;
  case'HEAL_RECEIVED':
   if(target&&targetChar){const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));bar(target,pct);run.hp[targetChar.id]=pct;floatText(target,'+'+Math.round(Number(e.amount)||0),'heal');const idx=party().findIndex(c=>c.id===targetChar.id),x=$('#bsHp'+idx);if(x)x.textContent=Math.round(pct)+'%'}
   if(srcChar){run.healing[srcChar.id]=(Number(run.healing[srcChar.id])||0)+(Number(e.amount)||0);renderMeters()}
   break;
  case'THREAT_GENERATED':if(srcChar){run.threat[srcChar.id]=Number(e.payload?.total)||0;renderMeters()}break;
  case'AGGRO_CHANGED':
   run.aggro=targetChar?.id||null;
   if(e.payload?.threat)Object.entries(e.payload.threat).forEach(([id,v])=>{const ch=charFor(id);if(ch)run.threat[ch.id]=Number(v)||0});
   renderMeters();break;
  case'PHASE_CHANGE':setStatus(e.ability||'Power instability');feed((e.ability||'Calder changes phase')+'. The station lights begin to fail.');break;
  case'MECHANIC_TELEGRAPH':
   if(e.payload?.mechanicType==='role-circles'){showRoleZones(e.payload.zones);setStatus('ROLE CIRCUITS — RED TANK · YELLOW DAMAGE · BLUE HEALER');feed('Calder pulls the power. Get every character into the correct coloured circuit.')}
   break;
  case'CAST_START':castStart(e.ability||'Enemy cast',Number(e.payload?.duration)||0);break;
  case'CAST_FINISH':case'INTERRUPT':castClear();break;
  case'MECHANIC_SAFE':if(target){floatText(target,'PROTECTED','heal')}break;
  case'ROLE_SHOCKWAVE':
   $('#bsArena')?.classList.add('shockwave');setStatus(e.result==='casualties'?'SHOCKWAVE — CASUALTIES':'SHOCKWAVE SURVIVED');feed(e.result==='casualties'?'The shockwave catches someone outside their correct circuit.':'The party is grounded inside the correct role circuits.');setTimeout(()=>{$('#bsArena')?.classList.remove('shockwave');hideRoleZones()},650);break;
  case'PLAYER_DEFEATED':if(target){$('[data-bs="'+target+'"]')?.classList.add('dead');bar(target,0);floatText(target,'DEFEATED','incoming')}break;
  case'PLAYER_REVIVED':if(target){$('[data-bs="'+target+'"]')?.classList.remove('dead');bar(target,Number(e.payload?.targetHpPct)||35);floatText(target,'REVIVED','heal')}break;
  case'ENEMY_DEFEATED':if(target){$('[data-bs="'+target+'"]')?.classList.add('dead');bar(target,0);feed('Dr. Vex Calder collapses beside the overloaded generator.')}break;
  case'PLAYER_MISTAKE':if(srcChar)feed(srcChar.name+' '+(e.payload?.detail||'hesitates')+'.');break;
  case'COMBAT_END':castClear();hideRoleZones();break
 }
}
async function playTimeline(result,tok){
 let last=0;for(const e of result.events||[]){if(tok!==token||!run)return false;const stamp=Math.max(last,Number(e.timestamp)||last),gap=stamp-last;if(gap)await wait(gap);eventRender(e);last=stamp;run.combatElapsed=stamp}
 return result.outcome==='victory'
}
function drawCombat(){
 const r=root();r.innerHTML='<section class="cb2d-shell bs2d-shell"><header class="cb2d-head"><div><small>BLACKOUT STATION · GENERATOR HALL</small><h2 id="bsTitle">Dr. Vex Calder</h2></div><div><span id="bsStatus">Power restored.</span><button data-bs-close>×</button></div></header><div class="bs-combat-grid"><main><div id="bsArena" class="bs-arena"><div class="bs-station-env"><div class="bs-generator g1"></div><div class="bs-generator g2"></div><div class="bs-transformer t1"></div><div class="bs-transformer t2"></div><div class="bs-cable-floor"></div></div><div id="bsRoleZones" class="bs-role-zones"></div><div id="bsTelegraphs"></div><div id="bsUnits"></div><div id="bsFx"></div></div><div id="bsCast" class="cb2d-cast"><small>ENEMY CAST</small><b id="bsCastName">—</b><span id="bsCastTime">—</span><em><i id="bsCastFill"></i></em></div><div class="cb2d-feed"><small>COMBAT FEED</small><div id="bsFeed"></div></div></main><aside><div class="cb2d-party"><small>ACTIVE FIVE</small><div id="bsParty"></div></div><div class="cb2d-meter"><div class="cb2d-meter-head"><b>Damage</b></div><div id="bsDamage"></div></div><div class="cb2d-meter"><div class="cb2d-meter-head"><b>Healing</b></div><div id="bsHealing"></div></div><div class="cb2d-meter"><div class="cb2d-meter-head"><b>Threat</b></div><div id="bsThreat"></div></div></aside></div><div id="bsEnd" class="cb2d-end" hidden></div></section>';
 r.querySelector('[data-bs-close]').onclick=close;
 renderPartyRows();
 const p=party();p.forEach((c,i)=>addUnit('p'+i,c.name,'party '+role(c)+' '+classKey(c),role(c)==='tank'?38:role(c)==='healer'?18:26,24+i*13));
 addUnit('e0','Dr. Vex Calder','enemy boss',68,50,true);renderMeters()
}
async function startBoss(){
 if(!run)return;drawCombat();const tok=token,C=window.CellboundCombatReborn;if(!C?.simulate){alert('Combat Reborn engine unavailable.');return}
 const combatParty=party().map(c=>Object.assign({},c,{_combatHealthPct:100,_combatItemLevel:Number(Game?.characterItemLevel?.(c))||Number(c.gear)||0}));
 const result=C.simulate({party:combatParty,encounter:bossEncounter(),tactics:{pullStyle:'normal',cooldownUse:'difficult',interruptPriority:'standard',interruptAssignment:'dps-rotation',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'immediate',movementDiscipline:'balanced'},seed:'blackout-station:'+run.seed});
 run.result=result;const won=await playTimeline(result,tok);if(tok!==token||!run)return;
 if(won)await complete();else fail()
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
async function complete(){
 const s=state(),result=run.result,summary=result?.summary||{},gains=awardXp(),gear=rollGear(),gold=320,renown=140,shards=10;
 s.gold=(Number(s.gold)||0)+gold;s.renown=(Number(s.renown)||0)+renown;s.blackoutStationCompletions=(Number(s.blackoutStationCompletions)||0)+1;s.activity=Array.isArray(s.activity)?s.activity:[];
 Game.addMaterial?.('cell-shards',shards);if(gear)Game.addBankItem?.(gear);
 s.activity.push('Blackout Station cleared. Dr. Vex Calder defeated after the grid restoration. Each adventurer earned '+XP+' XP.'+(gear?' '+gear.name+' was sent to the Guild Bank.':''));
 Game.save?.();await Game.persistState?.();await syncXp(gains);
 const deaths=Number(summary.deaths)||0,failed=Number(summary.mechanics?.failed)||0,timeMs=Number(result.durationMs)||0,score=Math.max(0,760-Math.round(timeMs/1000)*2-deaths*60-failed*35);
 const e=$('#bsEnd');if(!e)return;e.hidden=false;e.className='cb2d-end cb2d-loot-screen';e.innerHTML='<div class="cb2d-loot-wrap"><header class="cb2d-loot-head"><div><small>BLACKOUT STATION · CLEARED</small><h3>Grid Secured</h3><p>The generator hall falls silent. The station is powered, Calder is down, and the recovered equipment has been secured.</p></div><div class="cb2d-loot-complete">✓<span>DUNGEON<br>COMPLETE</span></div></header><div class="cb2d-loot-currency"><article><span>GOLD</span><b>+'+gold+'</b><small>Added to Guild treasury</small></article><article><span>RENOWN</span><b>+'+renown+'</b><small>Guild reputation earned</small></article><article><span>PARTY XP</span><b>+'+XP+'</b><small>Each adventurer</small></article><article><span>CELL SHARDS</span><b>+'+shards+'</b><small>Recovered from the grid</small></article><article><span>RUN SCORE</span><b>'+score+'</b><small>'+Math.round(timeMs/1000)+'s boss combat</small></article></div><section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>GEAR ACQUIRED</span><small>Stored automatically in the Guild Bank</small></div><div class="cb2d-loot-gear">'+(gear?'<article class="cb2d-loot-gear-card"><div>'+G.artHTML(gear,74)+'</div><span><small>'+esc(String(gear.rarity||'GEAR').toUpperCase())+' · ILVL '+Number(gear.itemLevel||0)+'</small><b>'+esc(gear.name)+'</b><em>'+esc(gear.slot||'Equipment')+'</em></span></article>':'<div class="cb2d-loot-empty">No equipment recovered.</div>')+'</div></section><section class="bs-run-summary"><article><b>'+run.moves+'</b><span>Puzzle moves</span></article><article><b>'+deaths+'</b><span>Deaths</span></article><article><b>'+failed+'</b><span>Failed mechanics</span></article></section><footer class="cb2d-loot-actions"><button data-bs-bank>VIEW GUILD BANK</button><button class="primary" data-bs-return>RETURN TO DUNGEONS →</button></footer></div>';
 e.querySelector('[data-bs-bank]').onclick=()=>{close();Game.switchView?.('bank')};e.querySelector('[data-bs-return]').onclick=()=>{close();Game.switchView?.('content')};
 renderCard()
}
function fail(){
 Game.applyPartyCellShock?.(25);const e=$('#bsEnd');if(!e)return;e.hidden=false;e.className='cb2d-end';e.innerHTML='<div><small>BLACKOUT STATION · EXPEDITION FAILED</small><h3>The generator hall claims the party.</h3><p>Calder\'s shockwave or sustained electrical damage overwhelmed the active five. Each adventurer gained 25% Cell Shock.</p></div><button data-bs-return>RETURN TO DUNGEONS →</button>';e.querySelector('[data-bs-return]').onclick=()=>{close();Game.switchView?.('content')}
}
function startRun(){
 const gate=readiness();if(!gate.ok)return;token++;run={speed:1,seed:Date.now().toString(36),board:shuffledBoard(),moves:0,powered:false,log:['The party enters the powerless station.'],damage:Object.fromEntries(party().map(c=>[c.id,0])),healing:Object.fromEntries(party().map(c=>[c.id,0])),threat:Object.fromEntries(party().map(c=>[c.id,0])),hp:Object.fromEntries(party().map(c=>[c.id,100])),aggro:null,combatElapsed:0,result:null};renderPuzzle()
}
function init(){
 Game=window.CellboundGame;G=window.CellboundGear;if(!Game?.ready){setTimeout(init,100);return}db=Game.getSupabase?.();renderCard();
 document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',renderCard);
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='content')renderCard()});
 window.CellboundBlackoutStation={open:openDungeon,renderCard}
}
init();
})();
