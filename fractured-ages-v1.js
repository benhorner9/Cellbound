(()=>{
'use strict';
window.CellboundCombatStandard?.register?.('fractured-ages',{kind:'dungeon',execution:'local',ui:'shared-cb2d'});
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const ENTRY_ILVL=38,XP=900;
let Game=null,G=null,db=null,run=null;
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const roleOf=c=>Game?.classes?.[c?.class]?.specs?.[c?.spec]?.role||'dps';
const ilvl=()=>Math.round(Number(Game?.partyItemLevel?.())||0);
const unlocked=()=>Boolean(state()?.progression?.fracturedAgesUnlocked);
const clearCount=()=>Number(state()?.fracturedAgesCompletions)||0;
const STAGES=[
 {
  id:'high-noon',era:'HIGH NOON',subtitle:'A western settlement trapped at twelve o’clock',boss:'Deadeye Mercer',level:14,visual:'fa-high-noon',
  intro:'Dust rolls through an empty main street. Every clock reads noon. One figure waits beside the water tower with his hand already resting on the grip.',
  blurb:'Deadeye ignores normal threat, chooses random targets and turns the street into a crossfire of marks, ricochets and a lethal High Noon cast.',
  enemies:[{name:'Deadeye Mercer',classification:'boss',targeting:'random',attackRange:30,attackName:'Deadeye Shot',damageType:'physical'}],
  combat:{kind:'boss',level:14,recommendedItemLevel:38,enemyTypes:['boss'],enemyHealth:1700,mechanicIntervalMs:3300,
   mechanics:[
    {name:'Wanted Mark',type:'circles',duration:1450,status:{id:'wanted-mark',name:'Wanted Mark',duration:5000,effect:{incomingDamageReduction:-.12}}},
    {name:'Ricochet Line',type:'line',duration:1300},
    {name:'High Noon',type:'interrupt',duration:1900,priority:'critical'}
   ],phases:[{id:'quickdraw',name:'Quickdraw',atPct:40,damageScale:1.22}]},
  environment:'<div class="fa-env-west"><i class="fa-sun"></i><span class="fa-building b1"></span><span class="fa-building b2"></span><span class="fa-water-tower"></span><span class="fa-dust d1"></span><span class="fa-dust d2"></span></div>'
 },
 {
  id:'iron-kingdom',era:'IRON KINGDOM',subtitle:'A fortress built over a place older than its crown',boss:'The Hollow Knight',level:15,visual:'fa-iron-kingdom',
  intro:'The street folds upward into black stone. Banners snap in a wind you cannot feel. An armoured giant lowers a ruined blade and the gates slam behind you.',
  blurb:'The Hollow Knight is a true tank encounter: brutal cleaves, armour phases and an Execution line that becomes faster as the armour breaks away.',
  enemies:[{name:'The Hollow Knight',classification:'boss',attackName:'Hollow Blade'}],
  combat:{kind:'boss',level:15,recommendedItemLevel:39,enemyTypes:['boss'],enemyHealth:2150,mechanicIntervalMs:3500,
   mechanics:[
    {name:'Black Iron Cleave',type:'cone',duration:1500},
    {name:'Execution',type:'line',duration:1450},
    {name:'Armour Reforge',type:'self-heal',duration:1850,healPct:.07,priority:'critical'}
   ],phases:[{id:'armour-crack',name:'Armour Cracks',atPct:65,damageScale:1.18},{id:'blade-unbound',name:'Blade Unbound',atPct:30,damageScale:1.34}]},
  environment:'<div class="fa-env-iron"><span class="fa-wall w1"></span><span class="fa-wall w2"></span><i class="fa-banner x1"></i><i class="fa-banner x2"></i><span class="fa-throne"></span></div>'
 },
 {
  id:'first-kingdom',era:'FIRST KINGDOM',subtitle:'A sun temple from before the recorded kingdoms',boss:'Amun-Rael',level:16,visual:'fa-first-kingdom',
  intro:'Stone becomes gold beneath your feet. A temple rises around four black pillars. The air smells of hot sand and incense. Something ancient opens its eyes.',
  blurb:'Amun-Rael layers solar beams, targeted sunfalls and servants across a shrinking temple. Light and Shadow forces the party into role-safe zones.',
  enemies:[{name:'Amun-Rael',classification:'boss',attackRange:22,attackName:'Solar Bolt',damageType:'magic'}],
  combat:{kind:'boss',level:16,recommendedItemLevel:40,enemyTypes:['boss'],enemyHealth:2350,mechanicIntervalMs:3100,
   mechanics:[
    {name:'Solar Beam',type:'line',duration:1350},
    {name:'Sunfall',type:'circles',duration:1500},
    {name:'Call the Sunbound',type:'adds',duration:1200,addName:'Sunbound Servant',addCount:2},
    {name:'Light and Shadow',type:'role-circles',duration:2050,zones:{tank:{x:30,y:28,radius:11,label:'SHADOW'},dps:{x:65,y:50,radius:13,label:'SUN'},healer:{x:30,y:72,radius:11,label:'SHADOW'}}}
   ],phases:[{id:'temple-falls',name:'The Temple Collapses',atPct:35,damageScale:1.22,arenaBounds:{left:20,right:80,top:16,bottom:84}}]},
  environment:'<div class="fa-env-first"><i class="fa-sun-disc"></i><span class="fa-pillar p1"></span><span class="fa-pillar p2"></span><span class="fa-pillar p3"></span><span class="fa-pillar p4"></span><span class="fa-sand"></span></div>'
 },
 {
  id:'silent-frontier',era:'SILENT FRONTIER',subtitle:'A lunar outpost beneath a dead sky',boss:'Commander Veyra',level:17,visual:'fa-silent-frontier',
  intro:'The temple flashes white. Gravity loosens. Your party lands inside a fractured lunar base while a blue planet hangs silently above the horizon.',
  blurb:'Veyra fights from range and refuses normal threat rules. Orbital barrages, target locks, mines and lunar drones build into a final bullet-hell pressure phase.',
  enemies:[{name:'Commander Veyra',classification:'boss',targeting:'random',attackRange:30,attackName:'Pulse Rifle',damageType:'magic'}],
  combat:{kind:'boss',level:17,recommendedItemLevel:41,enemyTypes:['boss'],enemyHealth:2500,mechanicIntervalMs:2800,
   mechanics:[
    {name:'Orbital Barrage',type:'circles',duration:1250},
    {name:'Target Lock',type:'line',duration:1200},
    {name:'Grav Minefield',type:'circles',duration:1350},
    {name:'Deploy Drones',type:'adds',duration:1050,addName:'Lunar Drone',addCount:3}
   ],phases:[{id:'bullet-hell',name:'No Safe Orbit',atPct:28,damageScale:1.30,arenaBounds:{left:22,right:78,top:20,bottom:80}}]},
  environment:'<div class="fa-env-moon"><i class="fa-earth"></i><span class="fa-crater c1"></span><span class="fa-crater c2"></span><span class="fa-base"></span><span class="fa-starfield"></span></div>'
 },
 {
  id:'funhouse',era:'THE FUNHOUSE',subtitle:'A place that should not exist in any age',boss:'The Old Man — Keeper of Ages',level:18,visual:'fa-funhouse',
  intro:'The moon folds like paper. You fall through clocks, doors and mirrors and land on a floor that cannot decide which way is down. He is already applauding.',
  blurb:'A proper 5v5 PvE finale. The Old Man controls time while reduced echoes of all four era bosses retain their signature identities. At 20%, the fight stops.',
  enemies:[
   {name:'The Old Man — Keeper of Ages',classification:'boss',targeting:'random',attackRange:26,attackName:'Lost Seconds',damageType:'magic',maxHealth:3100},
   {name:'Deadeye Mercer — Echo',classification:'elite',targeting:'random',attackRange:28,attackName:'Echo Shot',damageType:'physical',maxHealth:850},
   {name:'The Hollow Knight — Echo',classification:'elite',attackName:'Echo Cleave',maxHealth:1050},
   {name:'Amun-Rael — Echo',classification:'elite',targeting:'random',attackRange:22,attackName:'Echo Sunbolt',damageType:'magic',maxHealth:900},
   {name:'Commander Veyra — Echo',classification:'elite',targeting:'random',attackRange:28,attackName:'Echo Pulse',damageType:'magic',maxHealth:850}
  ],
  combat:{kind:'final',level:18,recommendedItemLevel:42,enemyTypes:['boss','elite','elite','elite','elite'],enemyLevels:[18,17,17,17,17],enemyHealth:1000,mechanicIntervalMs:2500,resolveAtBossHealthPct:.20,resolveLabel:'The Mask Falls',
   mechanics:[
    {name:'Time Stop',type:'interrupt',duration:1750,priority:'critical',status:{id:'time-stopped',name:'Time Stopped',duration:4200,effect:{outgoingDamageReduction:.35,haste:-.2}}},
    {name:'Age',type:'circles',duration:1300,status:{id:'aged',name:'Aged',duration:5200,effect:{outgoingDamageReduction:.14}}},
    {name:'Lost Seconds',type:'line',duration:1150},
    {name:'Rewind',type:'self-heal',duration:1750,healPct:.09,priority:'critical'},
    {name:'Broken Timeline',type:'role-circles',duration:1900,zones:{tank:{x:28,y:28,radius:10,label:'PAST'},dps:{x:66,y:50,radius:13,label:'NOW'},healer:{x:28,y:72,radius:10,label:'FUTURE'}}}
   ],phases:[{id:'mirrors-break',name:'Mirrors Break',atPct:55,damageScale:1.18},{id:'last-act',name:'Last Act',atPct:30,damageScale:1.30,arenaBounds:{left:19,right:81,top:17,bottom:83}}]},
  environment:'<div class="fa-env-funhouse"><span class="fa-clock k1">Ⅻ</span><span class="fa-clock k2">Ⅳ</span><span class="fa-clock k3">?</span><i class="fa-mirror m1"></i><i class="fa-mirror m2"></i><i class="fa-door"></i><span class="fa-confetti"></span></div>'
 }
];
function root(){let e=$('#fracturedAgesBackdrop');if(e)return e;e=document.createElement('div');e.id='fracturedAgesBackdrop';e.className='fa-backdrop';e.hidden=true;document.body.appendChild(e);return e}
function readiness(){
 if(!unlocked())return{ok:false,reason:'Complete The Fourfold Lock to discover this dungeon.'};
 const p=party();if(p.length!==5)return{ok:false,reason:'Build a complete five-character party first.'};
 const bad=p.find(c=>Game.isUnavailable?.(c));if(bad)return{ok:false,reason:bad.name+' is recovering from Cell Shock.'};
 if(ilvl()<ENTRY_ILVL)return{ok:false,reason:'Party Item Level '+ilvl()+'. The Fractured Ages requires Item Level '+ENTRY_ILVL+'.'};
 return{ok:true,reason:'The lockbox is open. The route through time is stable — for now.'}
}
function renderCard(){
 const card=$('#fracturedAgesCard'),mount=$('#fracturedAgesMount');if((!card&&!mount)||!Game?.ready)return;
 const open=unlocked(),clears=clearCount(),gate=readiness(),pi=ilvl();
 if(card)card.innerHTML='<article class="dungeon-browser-card fractured-ages '+(open?'unlocked':'locked')+'" data-dungeon-card="fractured-ages"><div class="dungeon-browser-art fractured-ages-art"><span>'+(open?'TIME FRACTURE':'UNKNOWN AGE')+'</span><strong>⌛</strong></div><div class="dungeon-browser-copy"><div class="dungeon-browser-heading"><div><small>DUNGEON</small><h3>'+(open?'The Fractured Ages':'Undiscovered Dungeon')+'</h3></div><b id="fracturedAgesStatus">'+(open?(clears?'FARMABLE':'NEWLY UNLOCKED'):'QUEST LOCKED')+'</b></div><p>'+(open?'Five encounters across impossible ages, ending in a 5v5 fight inside the Old Man’s Funhouse.':'Four strange keyholes point toward something outside ordinary time.')+'</p><div class="dungeon-browser-meta"><span>5 encounters</span><span>'+(open?'iLvl '+ENTRY_ILVL+'+':'Fourfold Lock')+'</span><span>Party iLvl '+(pi||'—')+'</span></div><div class="dungeon-browser-actions"><button type="button" data-dungeon-more="fractured-ages">MORE INFO →</button></div></div></article>';
 if(!mount)return;
 const route=STAGES.map((s,i)=>'<div class="dungeon-stage '+(clears?'complete':'')+'" data-kind="'+(i===4?'final':'boss')+'"><div class="dungeon-stage-rune">'+(clears?'✓':i===4?'✦':'◇')+'</div><div class="dungeon-stage-copy"><b>'+(i+1)+'. '+esc(s.era)+' · '+esc(s.boss)+'</b><small>'+esc(s.blurb)+'</small></div><span class="dungeon-stage-tag">'+(i===4?'5V5 FINAL':'BOSS')+'</span></div>').join('');
 mount.innerHTML='<div class="dungeon-detail-toolbar"><div><small>DUNGEON JOURNAL</small><b>'+ (open?'The Fractured Ages':'Undiscovered Dungeon') +'</b></div><button type="button" data-dungeon-close>CLOSE DETAILS ×</button></div>'+
  '<div class="dungeon-journal-hero fractured-ages-journal-hero"><div class="dungeon-journal-art fractured-ages-journal-art"><span class="journal-eyebrow">TIME FRACTURE · DUNGEON</span><h3>'+(open?'The Fractured Ages':'The Fourfold Lock')+'</h3><p>'+(open?'The Old Man’s map was not showing four places. It was showing one place surviving through four ages — and a fifth place hiding between them.':'Find the four keys, open the lockbox and solve the living map before this route can be entered.')+'</p><div class="journal-badges"><span>5 adventurers</span><span>5 encounters</span><span>Party iLvl '+(pi||'—')+'</span></div></div><div class="journal-entry-panel"><small>ENTRY REQUIREMENT</small><b>'+(open?'Quest Access · Party Item Level '+ENTRY_ILVL:'The Fourfold Lock')+'</b><p>'+esc(gate.reason)+'</p><button '+(open?'data-fa-enter':'data-fa-quests')+' '+(open&&!gate.ok?'disabled':'')+'>'+(open?'ENTER THE FRACTURED AGES':'OPEN QUEST JOURNAL →')+'</button></div></div>'+
  '<div class="dungeon-journal-layout"><article class="panel dungeon-route-panel"><div class="panel-head"><div><small>DUNGEON ROUTE</small><h3>A Journey Through the Ages</h3></div><b>5 ENCOUNTERS</b></div><div class="dungeon-route">'+route+'</div></article><aside class="panel dungeon-intel-panel"><div class="panel-head"><div><small>ENCOUNTER INTELLIGENCE</small><h3>What Your Guild Knows</h3></div></div><div class="dungeon-intel">'+
   '<article class="intel-card"><div class="intel-card-head"><b>Deadeye Mercer</b><span>HIGH NOON</span></div><p>Threat does not protect anyone. Mercer picks targets freely and punishes slow interrupts during High Noon.</p></article>'+
   '<article class="intel-card"><div class="intel-card-head"><b>Amun-Rael</b><span>FIRST KINGDOM</span></div><p>The temple shrinks as the fight develops. Servants, solar lines and role-safe zones compete for space.</p></article>'+
   '<article class="intel-card"><div class="intel-card-head"><b>Commander Veyra</b><span>SILENT FRONTIER</span></div><p>Random ranged pressure and orbital mechanics turn the lunar arena into controlled chaos.</p></article>'+
   '<article class="intel-card"><div class="intel-card-head"><b>The Old Man</b><span>???</span></div><p>Your guild recorded one impossible detail from the map: five figures were waiting on the other side.</p></article>'+
   '<article class="intel-card"><div class="intel-card-head"><b>Expedition Record</b><span>'+clears+' clear'+(clears===1?'':'s')+'</span></div><p>'+(clears?'The route can be reopened. The Old Man is never where you remember leaving him.':'No successful journey through the Fractured Ages has been recorded.')+'</p></article>'+
  '</div></aside></div>';
 mount.querySelector('[data-fa-enter]')?.addEventListener('click',briefing);
 mount.querySelector('[data-fa-quests]')?.addEventListener('click',()=>Game.switchView?.('quests'));
 try{window.CellboundDungeonBrowser?.refresh?.()}catch(e){}
}
function openDungeon(){Game=window.CellboundGame;if(!Game?.ready)return;db=Game.getSupabase?.();briefing()}
function close(){run=null;const r=root();r.hidden=true;document.body.classList.remove('fa-open');Game?.switchView?.('content');renderCard()}
function briefing(){
 const gate=readiness(),r=root();r.hidden=false;document.body.classList.add('fa-open');
 if(!gate.ok){r.innerHTML='<section class="fa-shell fa-brief"><header><div><small>THE FRACTURED AGES · ENTRY CHECK</small><h2>The timeline will not open.</h2></div><button data-fa-close>×</button></header><div class="fa-blocked"><b>NOT READY</b><p>'+esc(gate.reason)+'</p><button data-fa-party>OPEN PARTY BUILDER →</button></div></section>';r.querySelector('[data-fa-close]').onclick=close;r.querySelector('[data-fa-party]').onclick=()=>{close();Game.switchView?.('party')};return}
 r.innerHTML='<section class="fa-shell fa-brief"><header><div><small>THE FRACTURED AGES · LEVELS 14–18 · ILVL '+ENTRY_ILVL+'+</small><h2>A journey through five impossible encounters.</h2></div><button data-fa-close>×</button></header><div class="fa-brief-grid"><main><p>The Chronomap tears open five fractures. Every combat encounter uses the same authoritative Cellbound combat engine: real movement, threat, resources, healing, interrupts, deaths and mechanics.</p><div class="fa-era-strip">'+STAGES.map((s,i)=>'<span><i>'+(i+1)+'</i><b>'+esc(s.era)+'</b><small>'+esc(s.boss)+'</small></span>').join('')+'</div><div class="fa-warning"><b>THE FINAL FRACTURE</b><span>The Old Man does not fight alone. Your active five will face five enemies at once.</span></div></main><aside><small>ACTIVE FIVE · PARTY ILVL '+ilvl()+'</small>'+party().map(c=>'<div class="fa-party"><span>'+esc(c.portrait||c.name.slice(0,2))+'</span><div><b>'+esc(c.name)+'</b><small>Lv. '+Math.max(1,Number(c.level)||1)+' · '+esc(c.class)+' · '+esc(c.spec)+'</small></div></div>').join('')+'<button class="fa-start" data-fa-start>STEP THROUGH THE FIRST FRACTURE →</button></aside></div></section>';
 r.querySelector('[data-fa-close]').onclick=close;r.querySelector('[data-fa-start]').onclick=startRun
}
function startRun(){
 const combatState=Object.fromEntries(party().map(c=>[c.id,{healthPct:100,resource:null,cooldowns:{},statuses:[],reviveSicknessMs:0,uniqueUsed:{}}]));
 run={stage:0,startedAt:Date.now(),results:[],done:false,combatState,recoveries:0};
 transition()
}
function carryCombatState(result){
 if(!run||!result?.finalState?.players)return{ok:false,reason:'Combat state could not be recovered.'};
 const duration=Math.max(0,Number(result.durationMs)||0),downtime=5000,next={};
 for(const p of result.finalState.players){
  const id=p.characterId;if(!id)continue;
  const hp=p.maxHealth?Math.max(0,Math.min(100,p.health/p.maxHealth*100)):0;
  const statuses=Object.values(p.statuses||{}).filter(st=>st?.persistAcrossEncounters).map(st=>({
   ...st,
   remainingMs:Math.max(0,(Number(st.expiresAt)||0)-duration-downtime)
  })).filter(st=>st.remainingMs>0);
  next[id]={
   healthPct:hp>0?Math.min(100,hp+6):0,
   resource:p.resource?{name:p.resource.name,max:p.resource.max,value:p.resource.value}:null,
   cooldowns:Object.fromEntries(Object.entries(p.cooldowns||{}).map(([k,v])=>[k,Math.max(0,(Number(v)||0)-downtime)]).filter(([,v])=>v>0)),
   statuses,
   reviveSicknessMs:Math.max(0,(Number(p.revivePenaltyUntil)||0)-duration-downtime),
   uniqueUsed:{...(p.uniqueUsed||{})}
  }
 }
 party().forEach(c=>{if(!next[c.id])next[c.id]=run.combatState?.[c.id]||{healthPct:100,resource:null,cooldowns:{},statuses:[],reviveSicknessMs:0,uniqueUsed:{}}});
 const fallen=party().filter(c=>(Number(next[c.id]?.healthPct)||0)<=0);
 if(fallen.length){
  const healer=party().find(c=>roleOf(c)==='healer');
  if(!healer)return{ok:false,reason:'No healer survived the fracture chain to recover fallen adventurers.'};
  const revive=x=>{
   const st=next[x.id]||(next[x.id]={healthPct:0,resource:null,cooldowns:{},statuses:[],reviveSicknessMs:0,uniqueUsed:{}});
   st.healthPct=35;st.statuses=[];st.reviveSicknessMs=15000;
   if(st.resource?.max!=null)st.resource={...st.resource,value:Math.max(0,Number(st.resource.max)||0)*.2}
  };
  if((Number(next[healer.id]?.healthPct)||0)<=0)revive(healer);
  fallen.filter(c=>c.id!==healer.id).forEach(revive);
  run.recoveries=(Number(run.recoveries)||0)+fallen.length
 }
 run.combatState=next;
 return{ok:true}
}
function transition(){
 if(!run)return;const s=STAGES[run.stage],r=root();r.hidden=false;document.body.classList.add('fa-open');
 r.innerHTML='<section class="fa-shell fa-transition '+s.visual+'"><header><div><small>FRACTURE '+(run.stage+1)+' / '+STAGES.length+' · '+esc(s.era)+'</small><h2>'+esc(s.boss)+'</h2></div><button data-fa-close>×</button></header><div class="fa-transition-scene"><div class="fa-transition-art">'+s.environment+'</div><div class="fa-transition-copy"><small>'+esc(s.subtitle.toUpperCase())+'</small><h3>'+esc(s.era)+'</h3><p>'+esc(s.intro)+'</p><div><b>ENCOUNTER INTELLIGENCE</b><span>'+esc(s.blurb)+'</span></div><button data-fa-fight>'+(run.stage===4?'ENTER THE FUNHOUSE →':'ENTER '+esc(s.era)+' →')+'</button></div></div></section>';
 r.querySelector('[data-fa-close]').onclick=()=>{if(confirm('Abandon this Fractured Ages run?'))close()};
 r.querySelector('[data-fa-fight]').onclick=()=>fightStage(s)
}
async function fightStage(s){
 root().hidden=true;
 const Q=window.CellboundQuests;if(!Q?.runQuest2DFight){root().hidden=false;return}
 let combatResult=null;
 const won=await Q.runQuest2DFight({
  quest:'The Fractured Ages',title:s.boss,location:s.era,ambience:s.intro,
  enemies:s.enemies,eliteIndex:s.id==='funhouse'?1:0,visualClass:s.visual,environmentMarkup:s.environment,combat:s.combat,
  combatState:run?.combatState||null,onResult:result=>{combatResult=result},
  completeText:s.id==='funhouse'?'The echoes fall. At exactly twenty percent health, the Old Man lifts one finger. Everything stops.':'The fracture shudders. A new door opens where no door existed before.'
 });
 if(!run)return;
 if(!won){showFailure(s);return}
 const carry=carryCombatState(combatResult);
 if(!carry.ok){await failRecovery(s,carry.reason);return}
 run.results.push({id:s.id,boss:s.boss});
 if(s.id==='funhouse'){showMaskFall();return}
 run.stage++;transition()
}
function showFailure(s){
 const r=root();r.hidden=false;r.innerHTML='<section class="fa-shell fa-failed"><small>THE FRACTURED AGES · RUN ENDED</small><h2>The timeline rejects the party.</h2><p>Your guild was defeated by '+esc(s.boss)+'. Cell Shock has been applied by the combat engine. The Fourfold Lock remains open, so you can return when the party has recovered.</p><button data-fa-return>RETURN TO DUNGEONS →</button></section>';r.querySelector('[data-fa-return]').onclick=close
}
async function failRecovery(s,reason){
 if(!run||run.done)return;run.done=true;
 Game.applyPartyCellShock?.(25);await Game.persistState?.();
 const r=root();r.hidden=false;r.innerHTML='<section class="fa-shell fa-failed"><small>THE FRACTURED AGES · EXPEDITION FAILED</small><h2>The party cannot continue beyond '+esc(s.boss)+'.</h2><p>'+esc(reason||'Fallen adventurers could not be recovered between fractures.')+' All five adventurers gained 25% Cell Shock.</p><button data-fa-return>RETURN TO DUNGEONS →</button></section>';r.querySelector('[data-fa-return]').onclick=close
}
function showMaskFall(){
 const r=root();r.hidden=false;r.innerHTML='<section class="fa-shell fa-reveal"><div class="fa-reveal-stage"><div class="fa-mask">⌛</div><small>20% HEALTH · COMBAT HALTED</small><h2>The music stops.</h2><p>The colours drain from the room. Every clock freezes between seconds. The Old Man reaches up and removes the smiling mask.</p><div class="fa-name-shift"><span>THE OLD MAN — KEEPER OF AGES</span><i>→</i><b>???</b></div><p class="fa-quote">“Good. You can survive the story. Now see if you can survive what is true.”</p><p>He is not defeated. He steps backward through a door that was not there a moment ago. The Funhouse collapses around the party.</p><button data-fa-resolve>ESCAPE THE FUNHOUSE →</button></div></section>';
 r.querySelector('[data-fa-resolve]').onclick=completeRun
}
function hpNeed(level){return 800+Math.max(0,(Number(level)||1)-1)*250}
function awardXp(){
 return party().map(c=>{const beforeLevel=Math.max(1,Number(c.level)||1),beforeXp=Math.max(0,Number(c.xp)||0),beforeNeed=hpNeed(beforeLevel);let level=beforeLevel,xp=beforeXp+XP,levels=0;while(xp>=hpNeed(level)){xp-=hpNeed(level);level++;levels++}c.level=level;c.xp=xp;if(levels)c.talent=(Number(c.talent)||0)+levels;return{name:c.name,beforeLevel,beforeXp,beforeNeed,afterLevel:level,afterXp:xp,afterNeed:hpNeed(level),levels}})
}
async function syncXp(gains){
 if(!db)return;const user=Game.getUser?.();if(!user)return;
 try{await Promise.all(gains.map(x=>db.from('characters').update({level:x.afterLevel,xp:x.afterXp,last_played_at:new Date().toISOString()}).eq('user_id',user.id).eq('name',x.name)))}catch(e){console.warn('Fractured Ages XP sync failed',e)}
}
function rollTemporalGear(){
 const pool=(G?.items||[]).filter(x=>x.enabled&&Number(x.tier)===3);if(!pool.length)return null;
 const base=pool[Math.floor(Math.random()*pool.length)];
 return G.rollItemAffixes?.({...base,dropEnabled:true,rarity:'Rare',tierLabel:'Tier 3',itemLevel:42,power:0,source:'The Fractured Ages · Funhouse Escape'})||{...base,itemLevel:42,source:'The Fractured Ages · Funhouse Escape'}
}
function gearCard(item){
 if(!item)return'<div class="cb2d-loot-empty">No temporal equipment recovered.</div>';
 const art=G?.artHTML?G.artHTML(item,78):'◇',stats=G?.statLines?.(item)||[];
 return'<article class="cb2d-loot-item rarity-rare"><div class="cb2d-loot-art">'+art+'</div><div><small>RARE · '+esc(item.slot||'GEAR')+'</small><h4>'+esc(item.name)+'</h4><p>Item Level '+Number(item.itemLevel||0)+'</p><div class="cb2d-loot-roll">'+stats.map(s=>'<span>'+esc(s.text)+'</span>').join('')+'</div><em>Sent to Guild Bank</em></div></article>'
}
async function completeRun(){
 if(!run||run.done)return;run.done=true;
 const s=state(),gains=awardXp(),gear=rollTemporalGear(),gold=500,renown=250,shards=15;
 s.gold=(Number(s.gold)||0)+gold;s.renown=(Number(s.renown)||0)+renown;s.fracturedAgesCompletions=(Number(s.fracturedAgesCompletions)||0)+1;
 s.progression=s.progression||{};const first=!s.progression.fracturedAgesFirstClear;s.progression.fracturedAgesFirstClear=true;
 Game.addMaterial?.('cell-shards',shards);if(gear)Game.addBankItem?.(gear);s.activity=Array.isArray(s.activity)?s.activity:[];
 s.activity.push('The Fractured Ages cleared. The Old Man escaped at 20% health. Each adventurer earned '+XP+' XP.'+(gear?' '+gear.name+' was recovered from the collapsing Funhouse.':''));
 Game.save?.();await Game.persistState?.();await syncXp(gains);
 window.dispatchEvent(new CustomEvent('cellbound:dungeon-complete',{detail:{id:'fractured-ages',timeMs:Date.now()-run.startedAt,firstClear:first}}));
 const r=root();r.hidden=false;r.innerHTML='<section class="fa-shell fa-results cb2d-loot-screen"><div class="cb2d-loot-wrap"><header class="cb2d-loot-head"><div><small>THE FRACTURED AGES · CLEARED</small><h3>You survived the story.</h3><p>The Old Man survived too. Whatever he is, this was not the end of him.</p></div><div class="cb2d-loot-complete">⌛<span>DUNGEON<br>COMPLETE</span></div></header><div class="cb2d-loot-currency"><article><span>GOLD</span><b>+'+gold+'</b><small>Guild treasury</small></article><article><span>RENOWN</span><b>+'+renown+'</b><small>Guild reputation</small></article><article><span>PARTY XP</span><b>+'+XP+'</b><small>Each adventurer</small></article><article><span>CELL SHARDS</span><b>+'+shards+'</b><small>Recovered from fractures</small></article><article><span>ERAS SURVIVED</span><b>5 / 5</b><small>Including the Funhouse</small></article></div><section class="cb2d-loot-section"><div class="cb2d-loot-title"><span>TEMPORAL EQUIPMENT</span><small>Recovered as the Funhouse collapsed</small></div><div class="cb2d-loot-gear">'+gearCard(gear)+'</div></section><section class="fa-mystery-log"><small>FINAL RECORD</small><b>Enemy nameplate changed to “???” at 20% health.</b><p>No death was recorded. No portal signature was detected. The Old Man simply stopped being present.</p></section><footer class="cb2d-loot-actions"><button data-fa-bank>VIEW GUILD BANK</button><button class="primary" data-fa-return>RETURN TO DUNGEONS →</button></footer></div></section>';
 r.querySelector('[data-fa-bank]').onclick=()=>{close();Game.switchView?.('bank')};r.querySelector('[data-fa-return]').onclick=close;renderCard()
}
function init(){
 Game=window.CellboundGame;G=window.CellboundGear;if(!Game?.ready||!window.CellboundQuests){setTimeout(init,120);return}
 db=Game.getSupabase?.();renderCard();
 document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',renderCard);
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='content')renderCard()});
 window.addEventListener('cellbound:fourfold-update',renderCard);
 window.CellboundFracturedAges={open:openDungeon,renderCard}
}
init();
})();