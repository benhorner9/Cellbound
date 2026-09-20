(()=>{
'use strict';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SPAWN_MS=30000,DAILY_ATTEMPTS=3;

let Game=null,run=null,playToken=0,playSpeed=1,clockTimer=null,playStartedAt=0,playBaseMs=0;

const BOSSES=[
 {id:'wrath',name:'Wrath, the Blood King',rune:'✦',vice:'WRATH',health:800,mechanics:[{name:'Bloodrage Cleave',type:'cone',duration:1500}]},
 {id:'greed',name:'Greed, the Gilded Miser',rune:'◆',vice:'GREED',health:850,mechanics:[{name:'Claim the Living',type:'interrupt',duration:2100,priority:'critical'}]},
 {id:'pride',name:'Pride, the Fallen Champion',rune:'♜',vice:'PRIDE',health:910,mechanics:[{name:'Royal Fixation',type:'line',duration:1600}]},
 {id:'envy',name:'Envy, the Mirror Queen',rune:'◇',vice:'ENVY',health:980,mechanics:[{name:'Borrowed Reflection',type:'circles',duration:1500}]},
 {id:'gluttony',name:'Gluttony, the Devourer',rune:'●',vice:'GLUTTONY',health:1060,mechanics:[{name:'Feast of the Dead',type:'adds',duration:1200}]},
 {id:'lust',name:'Lust, the Grave Siren',rune:'☾',vice:'LUST',health:1150,mechanics:[{name:'Funeral Fascination',type:'line',duration:1500}]},
 {id:'sloth',name:'Sloth, the Ancient Sleeper',rune:'◌',vice:'SLOTH',health:1200,mechanics:[{name:'Weight of Ages',type:'circle',duration:1650}]},
 {id:'deceit',name:'Deceit, the Masked Priest',rune:'◈',vice:'DECEIT',health:1180,mechanics:[{name:'False Procession',type:'circles',duration:1450}]},
 {id:'cowardice',name:'Cowardice, the Buried Prince',rune:'♟',vice:'COWARDICE',health:1220,mechanics:[{name:'Call the Tombguard',type:'adds',duration:1200}]},
 {id:'cruelty',name:'Cruelty, the Bone Torturer',rune:'†',vice:'CRUELTY',health:1260,mechanics:[{name:'Agony Brand',type:'line',duration:1350}]},
 {id:'vanity',name:'Vanity, the Glass Empress',rune:'✧',vice:'VANITY',health:1320,mechanics:[{name:'Perfect Reflection',type:'cone',duration:1350}]},
 {id:'despair',name:'Despair, the Last Mourner',rune:'☍',vice:'DESPAIR',health:1400,mechanics:[{name:'No Hope Remains',type:'interrupt',duration:1850,priority:'critical'},{name:'Grief Without End',type:'circles',duration:1300}]}
];

const RELICS=[
 {itemId:'relic-oathstone-dominion',name:'Oathstone of Dominion',slot:'Relic',classes:'all',relicRole:'tank',tier:4,tierLabel:'Ancient Relic',rarity:'Epic',itemLevel:36,power:8,icon:'⬟',bonusStats:[{key:'threat',value:18},{key:'block',value:5}],uniqueEffect:{id:'oathstone-dominion',name:'Dominion',description:'Pushes a tank toward threat control: +18% threat generation and +5% block.'}},
 {itemId:'relic-heart-unbroken',name:'Heart of the Unbroken',slot:'Relic',classes:'all',relicRole:'tank',tier:4,tierLabel:'Ancient Relic',rarity:'Epic',itemLevel:36,power:8,icon:'◆',bonusStats:[{key:'stamina',value:12},{key:'armour',value:28}],uniqueEffect:{id:'heart-unbroken',name:'Unbroken',description:'Pushes a tank toward survival with additional stamina and armour.'}},
 {itemId:'relic-chalice-mercy',name:'Chalice of Mercy',slot:'Relic',classes:'all',relicRole:'healer',tier:4,tierLabel:'Ancient Relic',rarity:'Epic',itemLevel:36,power:8,icon:'♢',bonusStats:[{key:'healing',value:14},{key:'crit',value:5}],uniqueEffect:{id:'chalice-mercy',name:'Mercy',description:'Pushes a healer toward emergency throughput with stronger healing and critical recovery.'}},
 {itemId:'relic-bell-renewal',name:'Bell of Renewal',slot:'Relic',classes:'all',relicRole:'healer',tier:4,tierLabel:'Ancient Relic',rarity:'Epic',itemLevel:36,power:8,icon:'◉',bonusStats:[{key:'healing',value:10},{key:'haste',value:7}],uniqueEffect:{id:'bell-renewal',name:'Renewal',description:'Pushes a healer toward sustained throughput through healing and haste.'}},
 {itemId:'relic-fang-wrath',name:'Fang of Wrath',slot:'Relic',classes:'all',relicRole:'dps',tier:4,tierLabel:'Ancient Relic',rarity:'Epic',itemLevel:36,power:8,icon:'⟁',bonusStats:[{key:'damagePct',value:10},{key:'crit',value:5}],uniqueEffect:{id:'fang-wrath',name:'Bloodrush',description:'Pushes a damage build toward burst with increased damage and critical strike.'}},
 {itemId:'relic-mirror-envy',name:'Mirror of Envy',slot:'Relic',classes:'all',relicRole:'dps',tier:4,tierLabel:'Ancient Relic',rarity:'Epic',itemLevel:36,power:8,icon:'◇',bonusStats:[{key:'damagePct',value:7},{key:'haste',value:8}],uniqueEffect:{id:'mirror-envy',name:'Imitation',description:'Pushes a damage build toward tempo with increased damage and haste.'}}
];

function state(){return Game?.getState?.()}
function party(){return Game?.getPartyCharacters?.()||[]}
function roleOf(c){return Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps'}
function classKey(c){return 'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function todayKey(){return new Date().toISOString().slice(0,10)}
function eventState(){
 const s=state();if(!s)return null;
 const today=todayKey();
 s.twelveBelow=s.twelveBelow&&typeof s.twelveBelow==='object'?s.twelveBelow:{};
 if(s.twelveBelow.date!==today){s.twelveBelow.date=today;s.twelveBelow.attemptsUsed=0}
 s.twelveBelow.attemptsUsed=Math.max(0,Number(s.twelveBelow.attemptsUsed)||0);
 s.twelveBelow.bestKills=Math.max(0,Number(s.twelveBelow.bestKills)||0);
 s.twelveBelow.fullClears=Math.max(0,Number(s.twelveBelow.fullClears)||0);
 s.twelveBelow.history=Array.isArray(s.twelveBelow.history)?s.twelveBelow.history:[];
 return s.twelveBelow
}
function attemptsLeft(){const e=eventState();return e?Math.max(0,DAILY_ATTEMPTS-e.attemptsUsed):0}
function persistQuietly(){
 try{
  const task=Game.persistState?.();
  if(task&&typeof task.catch==='function')task.catch(error=>console.warn('Twelve Below background save failed',error))
 }catch(error){console.warn('Twelve Below background save failed',error)}
}
function partyReady(){
 const chars=party();if(chars.length!==5)return{ok:false,reason:'Build a complete active party first.'};
 if(chars.some(c=>Game.isUnavailable?.(c)))return{ok:false,reason:'A party member is recovering from Cell Shock.'};
 const roles=chars.map(roleOf);
 if(roles.filter(x=>x==='tank').length!==1||roles.filter(x=>x==='healer').length!==1||roles.filter(x=>x==='dps').length!==3)return{ok:false,reason:'The Twelve Below requires 1 Tank, 1 Healer and 3 Damage.'};
 return{ok:true,reason:'Your active five are ready.'}
}
function rewardBand(kills){
 if(kills<=0)return{label:'BURIAL SCRAPS',tone:'scrap'};
 if(kills<=3)return{label:'LESSER SEPULCHRE CACHE',tone:'lesser'};
 if(kills<=6)return{label:'SEPULCHRE CACHE',tone:'cache'};
 if(kills<=9)return{label:'GREATER SEPULCHRE CACHE',tone:'greater'};
 if(kills<=11)return{label:'EXALTED SEPULCHRE CACHE',tone:'exalted'};
 return{label:'TWELVEFOLD RELIQUARY',tone:'reliquary'}
}
function relicChance(kills){if(kills>=12)return 1;if(kills>=10)return .35;if(kills>=7)return .18;if(kills>=4)return .08;if(kills>=1)return .03;return 0}
function formatTime(ms){const sec=Math.max(0,Math.floor(ms/1000)),m=Math.floor(sec/60),s=sec%60;return m+':'+String(s).padStart(2,'0')}

function renderCard(){
 const root=$('#twelveBelowMount');if(!root||!Game?.ready)return;
 const e=eventState(),gate=partyReady(),left=attemptsLeft(),best=e.bestKills||0;
 root.innerHTML='<article class="tb-world-card">'+
  '<div class="tb-world-art"><div class="tb-world-ring">'+BOSSES.map((b,i)=>'<i style="--i:'+i+'">'+esc(b.rune)+'</i>').join('')+'</div><span>ANCIENT BURIAL GROUND</span><b>THE TWELVE BELOW</b></div>'+
  '<div class="tb-world-copy"><div class="tb-world-kicker"><span>PRIVATE WORLD EVENT</span><em>5-CHARACTER GUILD PARTY</em></div><h3>The Twelve Below</h3><p>One tomb opens immediately. Every 30 seconds another vice rises. Kill quickly or the battlefield fills with bosses.</p>'+
  '<div class="tb-world-stats"><span><small>ATTEMPTS TODAY</small><b>'+left+' / '+DAILY_ATTEMPTS+'</b></span><span><small>PERSONAL BEST</small><b>'+best+' / 12</b></span><span><small>CHASE REWARD</small><b>RELICS</b></span></div>'+
  '<div class="tb-world-actions"><button data-tb-open '+(!gate.ok||left<=0?'disabled':'')+'>ENTER THE SEPULCHRE →</button><small>'+(left<=0?'Daily attempts exhausted.':esc(gate.reason))+'</small></div></div></article>';
 root.querySelector('[data-tb-open]')?.addEventListener('click',openBriefing)
}

function ensureBackdrop(){
 let root=$('#twelveBelowBackdrop');if(root)return root;
 root=document.createElement('div');root.id='twelveBelowBackdrop';root.className='tb-backdrop';root.hidden=true;
 document.body.appendChild(root);return root
}
function close(){
 stopClock();playToken++;run=null;
 const root=$('#twelveBelowBackdrop');if(root)root.hidden=true;
 document.body.classList.remove('tb-open');renderCard()
}
function openBriefing(){
 const gate=partyReady(),left=attemptsLeft(),root=ensureBackdrop(),chars=party();
 root.hidden=false;document.body.classList.add('tb-open');
 root.innerHTML='<section class="cb2d-shell cb2d-brief tb-brief"><header class="cb2d-head"><div><small>THE SEPULCHRE OF TWELVE · PRIVATE WORLD EVENT</small><h2>The Twelve Below</h2></div><button data-tb-close>×</button></header>'+
 '<div class="tb-brief-grid"><main><p class="cb2d-intro">Your guild enters alone. One tomb opens now; another opens every 30 seconds. Any boss still alive remains in the arena when the next one rises.</p>'+
 '<div class="tb-tomb-preview">'+BOSSES.map((b,i)=>'<span><i>'+esc(b.rune)+'</i><b>'+(i+1)+'. '+esc(b.vice)+'</b><small>'+esc(b.name)+'</small></span>').join('')+'</div>'+
 '<div class="tb-relic-intro"><small>CHASE SYSTEM · RELICS</small><h3>Specialise beyond Item Level.</h3><p>Relics occupy the existing Relic slot and push a character deeper into a role: threat, survival, healing throughput, burst or tempo.</p></div></main>'+
 '<aside><div class="tb-attempt-box"><small>DAILY ATTEMPTS</small><b>'+left+' / '+DAILY_ATTEMPTS+'</b><span>Consumed when the burial ground is entered.</span></div>'+
 chars.map(c=>'<div class="cb2d-brief-member"><i class="cb2d-dot '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>Lv. '+c.level+' · '+esc(c.class)+' · '+esc(c.spec)+' · iLvl '+Game.characterItemLevel(c)+'</small></span><strong>'+String(roleOf(c)).toUpperCase()+'</strong></div>').join('')+
 '<button class="cb2d-start" data-tb-start '+(!gate.ok||left<=0?'disabled':'')+'>BEGIN SURVIVAL →</button><p class="tb-gate-copy">'+(left<=0?'No attempts remain today.':esc(gate.reason))+'</p></aside></div></section>';
 root.querySelector('[data-tb-close]').onclick=close;
 root.querySelector('[data-tb-start]')?.addEventListener('click',startRun)
}

function carryParty(base,finalPlayers,downtimeSec=0,elapsedMs=0){
 return base.map(c=>{
  const p=finalPlayers.find(x=>x.characterId===c.id),next={...c,_combatItemLevel:Game.characterItemLevel(c)};
  if(!p)return next;
  const pct=p.maxHealth?clamp(p.health/p.maxHealth*100,0,100):0;
  next._combatHealthPct=clamp(pct+downtimeSec*.75,0,100);
  next._combatResource={value:p.resource?.value};
  next._combatCooldowns=Object.fromEntries(Object.entries(p.cooldowns||{}).map(([k,v])=>[k,Math.max(0,(Number(v)||0)-elapsedMs)]));
  next._combatUniqueUsed={...(p.uniqueUsed||{})};
  return next
 })
}
function enemyInput(boss){
 return{name:boss.name,classification:'boss',absoluteHealth:true,maxHealth:boss.maxHealth||boss.health,currentHealth:boss.currentHealth==null?(boss.maxHealth||boss.health):boss.currentHealth,level:boss.level||1}
}
function remapEvents(events,aliveBosses,offset){
 const map=Object.fromEntries(aliveBosses.map((b,i)=>['e-'+i,'tb-'+b.id]));
 return (events||[]).map(e=>{
  const x=JSON.parse(JSON.stringify(e));x.timestamp=(Number(x.timestamp)||0)+offset;
  if(map[x.source])x.source=map[x.source];if(map[x.target])x.target=map[x.target];
  return x
 })
}
function simulateRun(){
 const Combat=window.CellboundCombatReborn;if(!Combat?.simulate)throw new Error('Combat engine unavailable');
 const original=party(),avgLevel=Math.round(original.reduce((n,c)=>n+(Number(c.level)||1),0)/5),pi=Game.partyItemLevel();
 let carried=original.map(c=>({...c,_combatItemLevel:Game.characterItemLevel(c)})),aliveBosses=[],defeated=new Set(),timeline=[],segments=[],endMs=0,outcome='overrun';
 const spawned=new Set();
 let lastPlayers=[];

 const playSlice=(offset,maxDuration,cleanup=0)=>{
   const mechanics=aliveBosses.flatMap(b=>b.mechanics||[]),level=avgLevel+1+Math.floor((spawned.size-1)/3);
   const encounter={id:'twelve-below-'+spawned.size+'-'+cleanup,kind:'world-boss',level,recommendedItemLevel:Math.max(24,26+Math.floor((spawned.size-1)/3)*2),enemies:aliveBosses.map(enemyInput),mechanics,mechanicIntervalMs:Math.max(2400,4300-aliveBosses.length*180),scaling:{enemyHealth:1,enemyDamage:(.46+Math.min(.17,(spawned.size-1)*.013))*(1+cleanup*.07)}};
   const result=Combat.simulate({party:carried,encounter,tactics:{interruptPriority:'high',addPriority:'priority',defensiveUsage:'standard',pullStyle:'normal',movementDiscipline:'balanced',cooldownUse:'difficult'},seed:'twelve:'+todayKey()+':'+eventState().attemptsUsed+':'+offset,maxDurationMs:maxDuration,elapsedOffsetMs:offset});
   timeline.push(...remapEvents(result.events,aliveBosses,offset));
   segments.push(result);lastPlayers=result.finalState.players||[];
   const next=[];
   aliveBosses.forEach((b,i)=>{
     const e=result.finalState.enemies?.[i],hp=Math.max(0,Number(e?.health)||0);
     if(hp<=0){if(!defeated.has(b.id))defeated.add(b.id)}
     else next.push({...b,currentHealth:hp,maxHealth:Number(e?.maxHealth)||b.maxHealth||b.health})
   });
   aliveBosses=next;
   const downtime=result.outcome==='victory'?Math.max(0,(maxDuration-result.durationMs)/1000):0;
   carried=carryParty(carried,result.finalState.players||[],downtime,result.durationMs);
   endMs=offset+Math.min(maxDuration,result.durationMs);
   return result
 };

 for(let i=0;i<BOSSES.length;i++){
   const boss={...BOSSES[i],maxHealth:BOSSES[i].health,level:avgLevel+1+Math.floor(i/3)};
   spawned.add(boss.id);aliveBosses.push(boss);
   const offset=i*SPAWN_MS;
   timeline.push({timestamp:offset,type:'TOMB_OPEN',source:'tb-'+boss.id,target:'tb-'+boss.id,ability:boss.name,payload:{bossId:boss.id,name:boss.name,index:i,vice:boss.vice,rune:boss.rune}});
   const result=playSlice(offset,SPAWN_MS,0);
   if(result.outcome==='defeat'){outcome='defeat';break}
   if(i===BOSSES.length-1&&aliveBosses.length===0){outcome='victory';break}
 }
 if(outcome!=='defeat'&&defeated.size<12){
   const base=BOSSES.length*SPAWN_MS;
   for(let cleanup=0;cleanup<4&&aliveBosses.length;cleanup++){
     const result=playSlice(base+cleanup*SPAWN_MS,SPAWN_MS,cleanup+1);
     if(result.outcome==='defeat'){outcome='defeat';break}
     if(!aliveBosses.length){outcome='victory';break}
   }
 }
 if(defeated.size===12)outcome='victory';
 const totals={damage:0,healing:0,avoidable:0,mistakes:0,deaths:0,interrupts:0,interruptAttempts:0,players:{}};
 segments.forEach(s=>{
   totals.damage+=Number(s.summary?.totalDamage)||0;totals.healing+=Number(s.summary?.totalHealing)||0;totals.deaths+=Number(s.summary?.deaths)||0;totals.avoidable+=(s.summary?.players||[]).reduce((n,p)=>n+(Number(p.avoidableDamage)||0),0);totals.mistakes+=Number(s.summary?.mistakes?.total)||0;totals.interrupts+=Number(s.summary?.interrupts?.success)||0;totals.interruptAttempts+=Number(s.summary?.interrupts?.attempts)||0;
   (s.summary?.players||[]).forEach(p=>{const x=totals.players[p.id]||(totals.players[p.id]={id:p.id,name:p.name,class:p.class,role:p.role,damage:0,healing:0,damageTaken:0,deaths:0});x.damage+=Number(p.damage)||0;x.healing+=Number(p.healing)||0;x.damageTaken+=Number(p.damageTaken)||0;x.deaths+=Number(p.deaths)||0})
 });
 timeline.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
 return{outcome,kills:defeated.size,defeated:[...defeated],aliveBosses,timeline,segments,endMs:Math.max(endMs,timeline.at(-1)?.timestamp||0),totals,party:original,partyIlvl:pi,finalPlayers:lastPlayers}
}

function chooseRelic(){
 const roles=new Set(party().map(roleOf)),pool=RELICS.filter(r=>roles.has(r.relicRole));
 return pool[Math.floor(Math.random()*Math.max(1,pool.length))]||RELICS[0]
}
function applyRewards(result){
 const e=eventState(),kills=result.kills,band=rewardBand(kills),gold=kills*42+(kills>=6?80:0)+(kills>=10?120:0),renown=kills*11+(kills===12?60:0),shards=kills*2+Math.floor(kills/3)*3;
 state().gold=(Number(state().gold)||0)+gold;state().renown=(Number(state().renown)||0)+renown;if(shards)Game.addMaterial?.('cell-shards',shards);
 let relic=null;const firstFull=kills===12&&!e.firstFullClear;
 if(firstFull||Math.random()<relicChance(kills)){relic={...chooseRelic(),source:'The Twelve Below',tradeState:'soulbound'};Game.addBankItem?.(relic)}
 e.bestKills=Math.max(e.bestKills||0,kills);if(kills===12){e.fullClears=(e.fullClears||0)+1;e.firstFullClear=true}
 e.lastRun={at:new Date().toISOString(),kills,outcome:result.outcome,band:band.label,gold,renown,shards,relic:relic?.name||null,durationMs:result.endMs};
 e.history.unshift(e.lastRun);e.history=e.history.slice(0,20);
 state().activity.push('The Twelve Below: '+kills+'/12 defeated · '+band.label+(relic?' · '+relic.name+' recovered.':'.'));
 if(result.outcome==='defeat')Game.applyPartyCellShock?.(25);
 Game.save?.();persistQuietly();
 return{band,gold,renown,shards,relic}
}

function startRun(){
 const gate=partyReady();if(!gate.ok||attemptsLeft()<=0)return;
 const root=ensureBackdrop(),btn=root.querySelector('[data-tb-start]');if(btn){btn.disabled=true;btn.textContent='OPENING THE FIRST TOMB…'}
 const e=eventState();e.attemptsUsed++;Game.save?.();persistQuietly();
 let result;
 try{result=simulateRun()}catch(error){
  console.error(error);e.attemptsUsed=Math.max(0,e.attemptsUsed-1);Game.save?.();persistQuietly();
  if(btn){btn.disabled=false;btn.textContent='BEGIN SURVIVAL →'}
  alert(error.message||'The burial ground could not be entered.');openBriefing();return
 }
 run={result,rewards:null,rewardsApplied:false,damage:{},healing:{},threat:{},activeBosses:new Set(),defeated:new Set(),elapsed:0};
 renderLive();
 requestAnimationFrame(()=>playTimeline(result.timeline))
}

function tombMarkup(){
 return BOSSES.map((b,i)=>'<div class="tb-tomb" data-tb-tomb="'+b.id+'" style="--i:'+i+'"><i>'+esc(b.rune)+'</i><span>'+esc(b.vice)+'</span></div>').join('')
}
function tbPartyFormation(c,i){
 const r=roleOf(c);
 if(r==='tank')return{x:39,y:50};
 if(r==='healer')return{x:20,y:50};
 const dps=[[28,32],[28,50],[28,68]];
 return dps[Math.max(0,party().filter(x=>roleOf(x)==='dps').findIndex(x=>x.id===c.id))]||{x:28,y:32+i*9}
}
function tbSetPos(el,x,y,ms=500){
 if(!el)return;el.dataset.x=String(x);el.dataset.y=String(y);el.style.transitionDuration=Math.max(80,ms/playSpeed)+'ms';el.style.left=x+'%';el.style.top=y+'%'
}
function tbUnitPos(id){
 const el=$('[data-tb-unit="'+id+'"],[data-tb-boss="'+id+'"]');return el?{x:Number(el.dataset.x)||50,y:Number(el.dataset.y)||50}:null
}
function tbPartyIdFromCombat(id){return String(id||'').startsWith('p-')?String(id):null}
function partyUnitMarkup(){
 return party().map((c,i)=>{const p=tbPartyFormation(c,i),r=roleOf(c);return'<div class="cb2d-unit tb-unit party '+r+' '+classKey(c)+'" data-tb-unit="p-'+esc(c.id)+'" data-x="'+p.x+'" data-y="'+p.y+'" style="left:'+p.x+'%;top:'+p.y+'%"><i></i><span>'+esc(c.name)+'<small class="cb2d-unit-meta">'+String(r).toUpperCase()+'</small></span><em class="cb2d-unit-hp"><i></i></em></div>'}).join('')
}
function tbBossSlots(count){
 const layouts={
  1:[[69,50]],2:[[69,38],[69,62]],3:[[68,30],[72,50],[68,70]],4:[[67,27],[74,41],[74,59],[67,73]]
 };
 if(layouts[count])return layouts[count];
 return Array.from({length:count},(_,i)=>[68+(i%2)*7,22+(i/(Math.max(1,count-1)))*56])
}
function layoutBosses(ms=520){
 const ids=[...run.activeBosses],slots=tbBossSlots(ids.length);
 ids.forEach((id,i)=>{const el=$('[data-tb-boss="'+id+'"]'),p=slots[i]||[70,50];tbSetPos(el,p[0],p[1],ms)})
}
function tbLunge(source,target){
 const src=String(source||''),el=src.startsWith('tb-')?$('[data-tb-boss="'+src.slice(3)+'"]'):$('[data-tb-unit="'+src+'"]'),tp=src.startsWith('tb-')?tbUnitPos(target):tbUnitPos(String(target||'').startsWith('tb-')?String(target).slice(3):target);
 if(!el||!tp)return;
 const ox=Number(el.dataset.x)||50,oy=Number(el.dataset.y)||50,dx=tp.x-ox,dy=tp.y-oy,len=Math.max(1,Math.hypot(dx,dy)),step=src.startsWith('tb-')?5:3.5;
 tbSetPos(el,ox+dx/len*step,oy+dy/len*step,150);
 setTimeout(()=>tbSetPos(el,ox,oy,220),Math.max(130,180/playSpeed))
}
function tbFloat(target,text,kind='damage'){
 const arena=$('#tbArena'),id=String(target||''),el=id.startsWith('tb-')?$('[data-tb-boss="'+id.slice(3)+'"]'):$('[data-tb-unit="'+id+'"]');if(!arena||!el)return;
 const p=tbUnitPos(id.startsWith('tb-')?id.slice(3):id);if(!p)return;
 const n=document.createElement('i');n.className='cb2d-number '+kind;n.textContent=text;n.style.left=p.x+'%';n.style.top=p.y+'%';arena.appendChild(n);setTimeout(()=>n.remove(),900/playSpeed)
}
function renderLive(){
 const root=ensureBackdrop();root.hidden=false;
 root.innerHTML='<section class="cb2d-shell tb-shell"><header class="cb2d-head"><div><small>THE SEPULCHRE OF TWELVE · PRIVATE WORLD EVENT</small><h2>The Twelve Below</h2></div><div class="cb2d-live"><i></i>LIVE <button data-tb-speed>1×</button></div></header>'+
 '<div class="tb-scorebar"><span><small>DEFEATED</small><b id="tbKilled">0 / 12</b></span><span><small>NEXT TOMB</small><b id="tbCountdown">00:30</b></span><span><small>ATTEMPTS LEFT</small><b>'+attemptsLeft()+' / '+DAILY_ATTEMPTS+'</b></span><span><small>PERSONAL BEST</small><b>'+eventState().bestKills+' / 12</b></span></div>'+
 '<div class="tb-tomb-track">'+tombMarkup()+'</div>'+
 '<div class="cb2d-layout tb-layout"><main><div class="cb2d-arena tb-arena" id="tbArena"><div class="cb2d-floor tb-ground"></div><div class="tb-burial-architecture"><i></i><i></i><i></i><i></i></div><div id="tbTelegraphs"></div><div id="tbBossUnits"></div><div id="tbPartyUnits">'+partyUnitMarkup()+'</div><div id="tbFx"></div><div class="cb2d-room-tag tb-room-tag"><b>Sepulchre Courtyard</b><small>Twelve sealed tombs surround the ancient fighting ground.</small></div><div class="cb2d-caption"><span>PRIVATE SURVIVAL EVENT</span><b id="tbStatus">The first seal breaks…</b></div></div>'+
 '<div class="cb2d-controls tb-controls"><button><b>FOCUS TARGET</b><small>Party burns the active priority.</small></button><button><b>INTERRUPTS</b><small>Critical casts are covered.</small></button><button><b>DEFENSIVES</b><small>Tank stabilises incoming pressure.</small></button><button><b>BOSS CONTROL</b><small>Tank holds active vices together.</small></button><button><b>SURVIVE</b><small>Keep the five alive until the next tomb.</small></button></div>'+
 '<div class="cb2d-feed"><small>COMBAT FEED</small><div id="tbFeed"></div></div></main><aside>'+
 '<div class="cb2d-cast" id="tbCast"><small>ENEMY CAST</small><div><b id="tbCastName">—</b><strong id="tbCastTime">—</strong></div><div class="cb2d-castbar"><i id="tbCastFill"></i></div></div>'+
 '<div class="cb2d-combat-meters"><section class="cb2d-meter-panel damage"><div class="cb2d-meter-head"><small>DAMAGE METER</small><span id="tbDamageTotal">0 total</span></div><div id="tbDamageMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel healing"><div class="cb2d-meter-head"><small>HEALING METER</small><span id="tbHealingTotal">0 total</span></div><div id="tbHealingMeter" class="cb2d-meter-list"></div></section><section class="cb2d-meter-panel threat"><div class="cb2d-meter-head"><small>THREAT · PRIMARY BOSS</small><span id="tbThreatTarget">—</span></div><div id="tbThreatMeter" class="cb2d-meter-list"></div></section></div>'+
 '<div class="cb2d-actions"><small>PARTY ACTIONS</small><div><i class="cb2d-dot tank"></i><b>Tank</b><em>Controlling active bosses</em></div><div><i class="cb2d-dot healer"></i><b>Healer</b><em>Maintaining the five</em></div><div><i class="cb2d-dot dps"></i><b>Damage</b><em>Burning the priority vice</em></div></div>'+
 '<div class="cb2d-party"><small>ACTIVE FIVE · PRIVATE INSTANCE</small><div id="tbPartyRows">'+party().map(c=>'<div class="cb2d-party-row"><i class="cb2d-dot '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+String(roleOf(c)).toUpperCase()+' · '+esc(c.spec)+'</small><em class="cb2d-side-hp"><i data-tb-side-hp="p-'+esc(c.id)+'" style="width:100%"></i></em></span><strong data-tb-side-text="p-'+esc(c.id)+'">100 HP</strong></div>').join('')+'</div></div>'+
 '<div class="tb-live-rule"><small>ESCALATION RULE</small><b>Another tomb opens every 30 seconds.</b><span>Surviving bosses remain active.</span></div></aside></div></section>';
 root.querySelector('[data-tb-speed]').onclick=e=>{playSpeed=playSpeed===1?2:playSpeed===2?4:1;e.currentTarget.textContent=playSpeed+'×';resetClockAnchor()}
 requestAnimationFrame(()=>{party().forEach((ch,i)=>{const p=tbPartyFormation(ch,i),el=$('[data-tb-unit="p-'+ch.id+'"]');tbSetPos(el,p.x,p.y,0)});renderMeters()})
}
function feed(text,kind=''){
 const root=$('#tbFeed');if(!root)return;const p=document.createElement('p');p.className=kind;p.textContent=text;root.prepend(p);while(root.children.length>14)root.lastElementChild.remove()
}
function bossDef(id){return BOSSES.find(b=>b.id===id)}
function spawnBoss(id){
 const b=bossDef(id),root=$('#tbBossUnits');if(!b||!root||root.querySelector('[data-tb-boss="'+id+'"]'))return;
 const idx=BOSSES.findIndex(x=>x.id===id),entryY=24+(idx%5)*13;
 root.insertAdjacentHTML('beforeend','<div class="cb2d-unit tb-unit enemy boss" data-tb-boss="'+id+'" data-x="96" data-y="'+entryY+'" style="left:96%;top:'+entryY+'%"><i></i><span>'+esc(b.vice)+'<small class="cb2d-unit-meta">'+esc(b.name)+'</small></span><em class="cb2d-unit-hp"><i style="width:100%"></i></em></div>');
 run.activeBosses.add(id);layoutBosses(760);
 const tomb=$('[data-tb-tomb="'+id+'"]');tomb?.classList.add('open');feed(b.name+' rises from the tomb.','spawn');$('#tbStatus').textContent=b.name+' has entered the burial ground.'
}
function defeatBoss(id){
 run.activeBosses.delete(id);run.defeated.add(id);const dead=$('[data-tb-boss="'+id+'"]');if(dead){dead.classList.add('dead');setTimeout(()=>{dead.remove();layoutBosses(420)},420/playSpeed)}const tomb=$('[data-tb-tomb="'+id+'"]');tomb?.classList.remove('open');tomb?.classList.add('defeated');$('#tbKilled').textContent=run.defeated.size+' / 12';feed((bossDef(id)?.name||id)+' has fallen.','kill')
}
function setPartyHp(id,pct){
 const value=clamp(Number(pct)||0,0,100),u=$('[data-tb-unit="'+id+'"]');if(u){u.querySelector('em i').style.width=value+'%';u.classList.toggle('dead',value<=0)}const bar=$('[data-tb-side-hp="'+id+'"]'),txt=$('[data-tb-side-text="'+id+'"]');if(bar)bar.style.width=value+'%';if(txt)txt.textContent=Math.round(value)+' HP'
}
function setBossHp(id,pct){
 const u=$('[data-tb-boss="'+id+'"]');if(u){const bar=u.querySelector('em i');if(bar)bar.style.width=clamp(Number(pct)||0,0,100)+'%'}
}
function currentThreatBoss(){
 const ids=[...run.activeBosses];return ids[0]||null
}
function renderMeters(){
 if(!run)return;const chars=party(),elapsed=Math.max(1,(run.elapsed||0)/1000);
 const rows=(map,rootId,totalId,label)=>{const data=chars.map(c=>({c,value:Number(map['p-'+c.id])||0})).sort((a,b)=>b.value-a.value),max=Math.max(1,...data.map(x=>x.value)),total=data.reduce((n,x)=>n+x.value,0),root=$(rootId),totalEl=$(totalId);if(totalEl)totalEl.textContent=Math.round(total).toLocaleString()+' total';if(root)root.innerHTML=data.map(({c,value},i)=>'<div class="cb2d-meter-row '+classKey(c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+'</b><span>'+Math.round(value).toLocaleString()+' · '+Math.round(value/elapsed)+' '+label+'</span></div><em><i style="width:'+(value/max*100)+'%"></i></em></div>').join('')};
 rows(run.damage,'#tbDamageMeter','#tbDamageTotal','DPS');rows(run.healing,'#tbHealingMeter','#tbHealingTotal','HPS');
 const bid=currentThreatBoss(),map=bid?(run.threat[bid]||{}):{},data=chars.map(c=>({c,value:Number(map['p-'+c.id])||0})).sort((a,b)=>b.value-a.value),max=Math.max(1,...data.map(x=>x.value)),root=$('#tbThreatMeter'),label=$('#tbThreatTarget');if(label)label.textContent=bid?(bossDef(bid)?.vice||bid):'—';if(root)root.innerHTML=data.some(x=>x.value>0)?data.map(({c,value},i)=>'<div class="cb2d-meter-row '+classKey(c)+'"><div class="cb2d-meter-label"><b>'+(i+1)+'. '+esc(c.name)+'</b><span>'+Math.round(value).toLocaleString()+'</span></div><em><i style="width:'+(value/max*100)+'%"></i></em></div>').join(''):'<div class="cb2d-meter-empty">Threat appears when the next vice engages.</div>'
}
function mechanicFlash(e){
 const root=$('#tbTelegraphs');if(!root)return;const x=document.createElement('i'),type=e.payload?.mechanicType||'circle';x.className='tb-telegraph '+type;root.appendChild(x);setTimeout(()=>x.remove(),Math.max(500,Number(e.payload?.duration)||1200)/playSpeed)
}
function castStart(e){
 const p=$('#tbCast'),name=$('#tbCastName'),time=$('#tbCastTime'),fill=$('#tbCastFill'),duration=Number(e.payload?.duration)||1200;if(p)p.hidden=false;if(name)name.textContent=e.ability||'Enemy Cast';if(time)time.textContent=(duration/1000).toFixed(1)+'s';if(fill){fill.style.transition='none';fill.style.width='0%';void fill.offsetWidth;fill.style.transition='width '+Math.max(.1,duration/1000/playSpeed)+'s linear';fill.style.width='100%'}
}
function castClear(){const name=$('#tbCastName'),time=$('#tbCastTime'),fill=$('#tbCastFill');if(name)name.textContent='—';if(time)time.textContent='—';if(fill){fill.style.transition='none';fill.style.width='0%'}}
function handleEvent(e){
 run.elapsed=Math.max(run.elapsed,Number(e.timestamp)||0);
 if(e.type==='TOMB_OPEN'){spawnBoss(e.payload?.bossId);return}
 if(e.type==='MOVEMENT_START'&&e.payload?.to){const el=String(e.source||'').startsWith('tb-')?$('[data-tb-boss="'+String(e.source).slice(3)+'"]'):$('[data-tb-unit="'+e.source+'"]');tbSetPos(el,e.payload.to.x,e.payload.to.y,e.payload.duration||420);return}
 if(e.type==='ABILITY_START'){tbLunge(e.source,e.target);return}
 if(e.type==='VICE_DEFEATED'){defeatBoss(e.payload?.bossId);return}
 if(e.type==='ENEMY_DEFEATED'&&String(e.target||'').startsWith('tb-')){defeatBoss(String(e.target).slice(3));return}
 if(e.type==='DAMAGE_DEALT'){
   if(String(e.source||'').startsWith('p-'))run.damage[e.source]=(Number(run.damage[e.source])||0)+(Number(e.amount)||0);
   if(String(e.target||'').startsWith('p-'))setPartyHp(e.target,e.payload?.targetHpPct);
   if(String(e.target||'').startsWith('tb-'))setBossHp(String(e.target).slice(3),e.payload?.targetHpPct);
   tbFloat(e.target,'-'+Math.round(Number(e.amount)||0),String(e.target||'').startsWith('p-')?'incoming':'damage');
   renderMeters();return
 }
 if(e.type==='HEAL_RECEIVED'){if(String(e.source||'').startsWith('p-'))run.healing[e.source]=(Number(run.healing[e.source])||0)+(Number(e.amount)||0);if(String(e.target||'').startsWith('p-'))setPartyHp(e.target,e.payload?.targetHpPct);tbFloat(e.target,'+'+Math.round(Number(e.amount)||0),'heal');renderMeters();return}
 if(e.type==='THREAT_GENERATED'&&String(e.target||'').startsWith('tb-')){const bid=String(e.target).slice(3);run.threat[bid]=run.threat[bid]||{};run.threat[bid][e.source]=(Number(run.threat[bid][e.source])||0)+(Number(e.amount)||0);renderMeters();return}
 if(e.type==='PLAYER_DEFEATED'){setPartyHp(e.target,0);feed((party().find(c=>'p-'+c.id===e.target)?.name||'An adventurer')+' has fallen.','danger');return}
 if(e.type==='MECHANIC_TELEGRAPH'){mechanicFlash(e);return}
 if(e.type==='CAST_START'&&e.result==='enemy'){castStart(e);return}
 if(e.type==='CAST_FINISH'||e.type==='INTERRUPT'){castClear();if(e.type==='INTERRUPT'&&e.result==='success')feed('Interrupt successful: '+(e.payload?.interruptedAbility||e.ability||'cast')+'.','good');return}
 if(e.type==='PLAYER_MISTAKE'){feed((party().find(c=>'p-'+c.id===e.source)?.name||'A party member')+' made a '+(e.result||'combat')+' mistake.','danger');return}
 if(e.type==='AGGRO_CHANGED'){layoutBosses(360);const ch=party().find(c=>'p-'+c.id===e.target);if(ch&&roleOf(ch)!=='tank')feed(ch.name+' has boss aggro.','danger')}
}
function resetClockAnchor(){playBaseMs=run?.elapsed||0;playStartedAt=performance.now()}
function startClock(){
 stopClock();resetClockAnchor();clockTimer=setInterval(()=>{
  if(!run)return;const sim=playBaseMs+(performance.now()-playStartedAt)*playSpeed;run.elapsed=Math.max(run.elapsed,sim);
  const nextIndex=Math.floor(sim/SPAWN_MS)+1,nextAt=nextIndex*SPAWN_MS,left=Math.max(0,nextAt-sim),el=$('#tbCountdown');if(el)el.textContent=nextIndex>=12?'ALL TOMBS OPEN':formatTime(left);
 },100)
}
function stopClock(){if(clockTimer){clearInterval(clockTimer);clockTimer=null}}
async function playTimeline(events){
 const token=++playToken;startClock();let last=0;
 for(const e of events){
  if(token!==playToken)return;
  const wait=Math.max(0,(Number(e.timestamp||0)-last)/playSpeed);if(wait)await new Promise(r=>setTimeout(r,wait));
  if(token!==playToken)return;run.elapsed=Number(e.timestamp)||0;resetClockAnchor();handleEvent(e);last=Number(e.timestamp)||0
 }
 stopClock();
 if(run&&!run.rewardsApplied){run.rewards=applyRewards(run.result);run.rewardsApplied=true}
 showResults()
}
function resultPlayerRows(){
 const map=run.result.totals.players;return party().map(c=>{const p=map['p-'+c.id]||{damage:0,healing:0,damageTaken:0,deaths:0};return'<div class="cbr-analysis-row"><i class="cb2d-dot '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+' · '+Math.round(p.damageTaken).toLocaleString()+' damage taken · '+p.deaths+' deaths</small></span><strong>'+Math.round(p.damage).toLocaleString()+' dmg</strong></div>'}).join('')
}
function showResults(){
 const root=ensureBackdrop(),r=run.result,w=run.rewards;
 root.innerHTML='<section class="cb2d-shell cb2d-loot-screen tb-results"><header class="cb2d-head"><div><small>THE TWELVE BELOW · ATTEMPT COMPLETE</small><h2>'+r.kills+' of 12 defeated</h2></div><button data-tb-close>×</button></header>'+
 '<div class="tb-result-hero '+w.band.tone+'"><div><small>'+w.band.label+'</small><h3>'+(r.kills===12?'No vice remains buried.':r.outcome==='defeat'?'The burial ground claimed the party.':'The guild withdrew from the Sepulchre.')+'</h3><p>Every additional vice defeated improved the reward cache.</p></div><strong>'+r.kills+' / 12</strong></div>'+
 '<div class="cb2d-loot-currency"><article><span>GOLD</span><b>+'+w.gold+'</b><small>Guild treasury</small></article><article><span>RENOWN</span><b>+'+w.renown+'</b><small>Guild reputation</small></article><article><span>CELL SHARDS</span><b>+'+w.shards+'</b><small>Relic progression material</small></article><article><span>BEST</span><b>'+eventState().bestKills+' / 12</b><small>Personal record</small></article></div>'+
 (w.relic?'<section class="tb-relic-drop"><div class="tb-relic-icon">'+esc(w.relic.icon||'◇')+'</div><div><small>ANCIENT RELIC · '+String(w.relic.relicRole).toUpperCase()+'</small><h3>'+esc(w.relic.name)+'</h3><p>'+esc(w.relic.uniqueEffect.description)+'</p><span>Sent to Guild Bank</span></div></section>':'<section class="tb-no-relic"><small>RELIC ROLL</small><h3>No relic recovered this attempt.</h3><p>Higher boss counts dramatically improve the relic chance. A 12/12 clear guarantees one.</p></section>')+
 '<section class="cbr-analysis"><div class="cbr-analysis-head"><div><small>COMBAT REBORN · RUN ANALYSIS</small><h4>How long your five held the burial ground.</h4></div></div><div class="cbr-analysis-grid"><article><span>TIME</span><b>'+formatTime(r.endMs)+'</b></article><article><span>DAMAGE</span><b>'+Math.round(r.totals.damage).toLocaleString()+'</b></article><article><span>HEALING</span><b>'+Math.round(r.totals.healing).toLocaleString()+'</b></article><article><span>AVOIDABLE</span><b>'+Math.round(r.totals.avoidable).toLocaleString()+'</b></article><article><span>MISTAKES</span><b>'+r.totals.mistakes+'</b></article><article><span>DEATHS</span><b>'+r.totals.deaths+'</b></article><article><span>INTERRUPTS</span><b>'+r.totals.interrupts+'/'+r.totals.interruptAttempts+'</b></article><article><span>TOMBS OPENED</span><b>'+Math.min(12,Math.floor(r.endMs/SPAWN_MS)+1)+'</b></article></div><div class="cbr-analysis-list">'+resultPlayerRows()+'</div></section>'+
 '<footer class="cb2d-loot-actions"><button data-tb-close>RETURN TO WORLD BOSSES →</button></footer></section>';
 root.querySelectorAll('[data-tb-close]').forEach(b=>b.onclick=close);renderCard()
}

function init(){
 Game=window.CellboundGame;
 if(!Game?.ready){setTimeout(init,100);return}
 eventState();renderCard();
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='world')renderCard()});
 window.CellboundTwelveBelow={render:renderCard,open:openBriefing,debugSimulate:simulateRun,relics:RELICS,bosses:BOSSES}
}
init();
})();