(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const STAGES=[
 {id:'broken-gate',title:'The Broken Gate',kind:'trash',knowledge:'ashwarden',base:86,enemies:['Ash Cultist','Cinder Hound','Cinder Hound'],mechanics:[['Searing Bolt','interrupt',1600],['Hound Rush','line',1200]]},
 {id:'hall-embers',title:'Hall of Embers',kind:'trash',knowledge:'ashwarden',base:82,enemies:['Ash Guardian','Ember Acolyte','Ember Acolyte'],mechanics:[['Ember Channel','interrupt',1800],['Guardian Sweep','cone',1500]]},
 {id:'kael',title:'Ash Warden Kael',kind:'boss',bossId:'ashwarden',knowledge:'ashwarden',base:78,enemies:['Ash Warden Kael'],mechanics:[['Warden Cleave','cone',2100],['Cinder Guard','adds',1400],['Execution Arc','cone',1800]]},
 {id:'furnace',title:'The Furnace Passage',kind:'event',knowledge:'embermaw',base:80,enemies:['Cinder Hound','Furnace Wisp'],mechanics:[['Furnace Vents','circles',1700],['Cinder Rush','line',1200]]},
 {id:'embermaw',title:'Embermaw',kind:'boss',bossId:'embermaw',knowledge:'embermaw',base:74,enemies:['Embermaw'],mechanics:[['Ember Roar','interrupt',2400],['Flame Burst','circle',1900],['Tail Furnace','cone',1700]]},
 {id:'vault-depths',title:'The Vault Depths',kind:'trash',knowledge:'vaultheart',base:78,enemies:['Soul Binder','Ash Guardian','Ash Guardian'],mechanics:[['Soul Bind','interrupt',2000],['Guardian Reinforcements','adds',1400]]},
 {id:'vaultheart',title:'The Vaultheart',kind:'final',bossId:'vaultheart',knowledge:'vaultheart',base:70,enemies:['The Vaultheart'],mechanics:[['Core Pulse','circle',2100],['Fracture Spawn','adds',1500],['Rupture Beam','line',1800],['Core Collapse','circle',2600]]}
];
const ASHEN_ROOMS={
 'broken-gate':{
   room:'broken-gate',label:'Collapsed Vault Entrance',
   ambience:'Ash drifts through a shattered seal.',
   props:[
     ['gate',86,48,0,1.05],['pillar-broken',9,18,-10,.9],['pillar-broken',11,82,13,.82],
     ['rubble',18,16,0,1],['rubble',18,84,0,.85],['chain',77,15,18,.9],['brazier',79,79,0,.8]
   ]
 },
 'hall-embers':{
   room:'hall-embers',label:'Ember Processional Hall',
   ambience:'Old braziers still breathe beneath the ash.',
   props:[
     ['pillar',8,20,0,.95],['pillar',8,80,0,.95],['pillar',88,20,0,.95],['pillar',88,80,0,.95],
     ['brazier',18,24,0,.8],['brazier',18,76,0,.8],['vault-mark',72,50,0,1.1]
   ]
 },
 'kael':{
   room:'warden-seal',label:'The Warden Seal',
   ambience:'Chains hold an ancient oath around the chamber.',
   props:[
     ['seal-ring',66,50,0,1.05],['chain',87,23,-18,1],['chain',87,77,18,1],
     ['statue',10,22,0,.9],['statue',10,78,0,.9],['brazier',83,50,0,.95]
   ]
 },
 'furnace':{
   room:'furnace-passage',label:'Furnace Passage',
   ambience:'Heat pulses through cracked iron channels.',
   props:[
     ['furnace',88,50,0,1.05],['vent',70,22,0,.9],['vent',70,78,0,.9],
     ['pipe',10,16,8,1],['pipe',10,84,-8,1],['ember-crack',49,18,14,1.1],['ember-crack',53,83,-11,.9]
   ]
 },
 'embermaw':{
   room:'embermaw-forge',label:'The Ember Forge',
   ambience:'The floor itself glows beneath Embermaw.',
   props:[
     ['forge-ring',66,50,0,1.12],['furnace',88,18,0,.85],['furnace',88,82,0,.85],
     ['chain',9,28,16,.9],['chain',9,72,-16,.9],['ember-crack',43,20,20,1.05],['ember-crack',45,80,-18,1]
   ]
 },
 'vault-depths':{
   room:'vault-depths',label:'Sealed Vault Depths',
   ambience:'Dead reliquaries line the path inward.',
   props:[
     ['coffer',10,20,-8,.85],['coffer',10,80,7,.85],['coffer',88,16,9,.85],['coffer',88,84,-7,.85],
     ['soul-urn',78,30,0,.75],['soul-urn',78,70,0,.75],['vault-mark',65,50,0,.9]
   ]
 },
 'vaultheart':{
   room:'vaultheart-sanctum',label:'The Vaultheart Sanctum',
   ambience:'A sealed Cell reliquary hums beneath the final chamber.',
   props:[
     ['vault-door',90,50,0,1.1],['heart-sigil',65,50,0,1.18],
     ['containment',9,22,0,.9],['containment',9,78,0,.9],['crystal',80,18,-8,.85],['crystal',80,82,8,.85],
     ['chain',86,28,-15,.9],['chain',86,72,15,.9]
   ]
 }
};
let Game=null,G=null,P=null,run=null,token=0;
let tactics={aggression:'balanced',interrupts:'important',defensives:'balanced',adds:'dangerous',consumables:'danger'};
const party=()=>Game&&Game.getPartyCharacters?Game.getPartyCharacters():[];
const state=()=>Game&&Game.getState?Game.getState():null;
const role=c=>Game&&Game.classes&&Game.classes[c.class]&&Game.classes[c.class].specs[c.spec]?Game.classes[c.class].specs[c.spec].role:'dps';
const ilvl=()=>Number(Game&&Game.partyItemLevel?Game.partyItemLevel():0)||0;
const delay=ms=>new Promise(r=>setTimeout(r,Math.round(ms/((run&&run.speed)||1))));
const cond=id=>run&&run.condition[id]!=null?run.condition[id]:100;
const setCond=(id,v)=>{if(run)run.condition[id]=clamp(Math.round(v),0,100)};
const hp=id=>run&&run.hp&&run.hp[id]!=null?run.hp[id]:100;
const setHp=(id,v)=>{if(run&&run.hp)run.hp[id]=clamp(Math.round(v),0,100)};
function combatProfile(c){
 const r=role(c);
 if(r==='tank')return'tank';
 if(r==='healer')return'healer';
 if(['Rogue','Warrior','Paladin'].includes(c.class))return'melee';
 return'ranged';
}
function root(){let r=$('#cb2dBackdrop');if(!r){r=document.createElement('div');r.id='cb2dBackdrop';r.className='cb2d-backdrop';r.hidden=true;document.body.appendChild(r)}return r}
function close(){token++;run=null;const r=root();r.hidden=true;r.innerHTML=''}
function knowledge(key){const p=party();return p.length?Math.round(p.reduce((n,c)=>n+(Number(c.knowledge&&c.knowledge[key])||0),0)/p.length):0}
function readiness(){
 const p=party();
 if(!Game||!Game.ready)return{ok:false,reason:'Guild data is still loading.'};
 if(p.length!==5)return{ok:false,reason:'Build a complete five-character party in Party Builder first.'};
 const locked=p.find(c=>Game.isUnavailable(c));
 if(locked)return{ok:false,reason:locked.name+' is still recovering from Cell Shock.'};
 if(ilvl()<18)return{ok:false,reason:'Party Item Level '+ilvl()+'. The Ashen Vault requires Item Level 18.'};
 return{ok:true,reason:'Ready to enter.'};
}
function ready(){return readiness().ok}
function groupButtons(key,items){return '<div class="cb2d-plan-row" data-plan="'+key+'">'+items.map(x=>'<button class="'+(tactics[key]===x[0]?'active':'')+'" data-pick="'+key+':'+x[0]+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>').join('')+'</div>'}
function briefing(){
 const gate=readiness(),r=root();r.hidden=false;
 if(!gate.ok){
   r.innerHTML='<section class="cb2d-shell cb2d-brief"><header class="cb2d-head"><div><small>THE ASHEN VAULT · ENTRY CHECK</small><h2>Dungeon entry is currently blocked.</h2></div><button data-close>×</button></header><div class="cb2d-blocked"><b>NOT READY</b><p>'+esc(gate.reason)+'</p><button data-party>OPEN PARTY BUILDER →</button></div></section>';
   r.querySelector('[data-close]').onclick=close;
   r.querySelector('[data-party]').onclick=()=>{close();Game.switchView('party')};
   return;
 }

 r.innerHTML='<section class="cb2d-shell cb2d-brief"><header class="cb2d-head"><div><small>THE ASHEN VAULT · TACTICAL BRIEFING</small><h2>Set the plan once. Then watch the dungeon run.</h2></div><button data-close>×</button></header><div class="cb2d-brief-grid"><main><p class="cb2d-intro">These tactics persist through the whole expedition. The party will move, react and fight automatically. Live overrides remain available without stopping combat.</p><h3>Aggression</h3>'+groupButtons('aggression',[['safe','SAFE','Prioritise stability.'],['balanced','BALANCED','Standard dungeon pace.'],['aggressive','AGGRESSIVE','Push damage windows.']])+'<h3>Interrupts</h3>'+groupButtons('interrupts',[['important','IMPORTANT','Stop dangerous casts.'],['high','HIGH','Interrupt aggressively.'],['conservative','CONSERVATIVE','Save for critical casts.']])+'<h3>Defensives</h3>'+groupButtons('defensives',[['early','EARLY','Use cooldowns sooner.'],['balanced','BALANCED','React to pressure.'],['save','SAVE','Hold for late bosses.']])+'<h3>Add Priority</h3>'+groupButtons('adds',[['dangerous','DANGEROUS','Swap to threatening adds.'],['full','FULL','Clear every add wave.'],['boss','BOSS','Stay on primary target.']])+'</main><aside><small>ACTIVE FIVE · PARTY ILVL '+ilvl()+'</small>'+party().map(c=>'<div class="cb2d-brief-member"><i class="cb2d-dot '+role(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span><strong>'+String(role(c)).toUpperCase()+'</strong></div>').join('')+'<button class="cb2d-start" data-start>BEGIN EXPEDITION →</button></aside></div></section>';
 r.querySelector('[data-close]').onclick=close;
 r.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const a=b.dataset.pick.split(':');tactics[a[0]]=a[1];r.querySelectorAll('[data-plan="'+a[0]+'"] button').forEach(x=>x.classList.toggle('active',x===b))});
 r.querySelector('[data-start]').onclick=start;
}
function start(){
 const p=party();token++;run={token:token,stage:0,speed:1,condition:Object.fromEntries(p.map(c=>[c.id,100])),hp:Object.fromEntries(p.map(c=>[c.id,100])),enemyHp:[],enemyMax:[],threat:[],aggro:[],log:['The party enters The Ashen Vault.'],override:0,forceInterrupt:false,rewards:[],resolved:false,combatActive:false,mechanicActive:false,allowKill:false,stageOutcome:true,shotSeq:0};
 drawViewer();seamless(token);
}
function route(){
 return STAGES.map((s,i)=>'<span class="'+(i<run.stage?'done':i===run.stage?'current':'')+'"><i>'+(i+1)+'</i>'+esc(s.title)+'</span>').join('');
}
function rows(){
 return party().map(c=>'<div class="cb2d-party-row" data-row="'+c.id+'"><i class="cb2d-dot '+role(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+String(role(c)).toUpperCase()+' · '+esc(c.spec)+' · Condition '+cond(c.id)+'%</small><em class="cb2d-side-hp"><i data-side-hp="'+c.id+'" style="width:'+hp(c.id)+'%"></i></em></span><strong>'+hp(c.id)+' HP</strong></div>').join('');
}
function drawViewer(){
 const s=STAGES[run.stage],r=root();r.hidden=false;
 r.innerHTML='<section class="cb2d-shell"><header class="cb2d-head"><div><small>THE ASHEN VAULT · LIVE 2D DUNGEON</small><h2 id="cb2dTitle">'+esc(s.title)+'</h2></div><div class="cb2d-live"><i></i>LIVE <button data-speed>1×</button><button data-close>×</button></div></header><div class="cb2d-route" id="cb2dRoute">'+route()+'</div><div class="cb2d-layout"><main><div class="cb2d-arena" id="cb2dArena"><div class="cb2d-floor"></div><div class="cb2d-environment" id="cb2dEnvironment"></div><div class="cb2d-room-tag" id="cb2dRoomTag"></div><div class="cb2d-ground-legend"><span class="danger">RED · MOVE / AVOID</span><span class="spawn">AMBER · SPAWN / PRIORITY</span><span class="aggro">GOLD LINK · AGGRO</span></div><div id="cb2dTelegraphs"></div><div id="cb2dUnits"></div><div class="cb2d-caption"><span id="cb2dType">'+s.kind.toUpperCase()+'</span><b id="cb2dStatus">Entering encounter…</b></div></div><div class="cb2d-controls"><button data-override="focus"><b>FOCUS TARGET</b><small>Force priority damage.</small></button><button data-override="interrupt"><b>INTERRUPT NOW</b><small>Force the next interrupt.</small></button><button data-override="defensive"><b>DEFENSIVE</b><small>Stabilise the group.</small></button><button data-override="burn"><b>BURN BOSS</b><small>Commit damage cooldowns.</small></button><button data-override="consumable"><b>USE CONSUMABLE</b><small>Use available stock.</small></button></div><div class="cb2d-feed"><small>COMBAT FEED</small><p id="cb2dFeed"></p></div></main><aside><div class="cb2d-cast"><small>ENEMY CAST</small><div><b id="cb2dCastName">—</b><strong id="cb2dCastTime">—</strong></div><div class="cb2d-castbar"><i id="cb2dCastFill"></i></div></div><div class="cb2d-actions"><small>PARTY ACTIONS</small><div data-act="tank"><i class="cb2d-dot tank"></i><b>Tank</b><em>Taking point</em></div><div data-act="healer"><i class="cb2d-dot healer"></i><b>Healer</b><em>Following formation</em></div><div data-act="dps"><i class="cb2d-dot dps"></i><b>Damage</b><em>Acquiring targets</em></div></div><div class="cb2d-party"><small>PARTY CONDITION · ILVL '+ilvl()+'</small><div id="cb2dRows">'+rows()+'</div></div><div class="cb2d-plan"><small>PERSISTENT TACTICS</small><b>'+tactics.aggression.toUpperCase()+' · '+tactics.interrupts.toUpperCase()+' INTERRUPTS</b><span>'+tactics.defensives.toUpperCase()+' DEFENSIVES · '+tactics.adds.toUpperCase()+' ADDS</span></div></aside></div><div class="cb2d-end" id="cb2dEnd" hidden></div></section>';
 r.querySelector('[data-close]').onclick=()=>{if(run&&!run.resolved&&!confirm('Leave the Ashen Vault?'))return;close()};
 r.querySelector('[data-speed]').onclick=e=>{run.speed=run.speed===2?1:2;e.currentTarget.textContent=run.speed+'×'};
 r.querySelectorAll('[data-override]').forEach(b=>b.onclick=()=>override(b.dataset.override,b));
 feed();
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
function addUnit(id,label,cls,x,y,size){
 const e=document.createElement('div');e.className='cb2d-unit '+cls+' '+(size||'');e.dataset.unit=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span><em class="cb2d-unit-hp"><i></i></em>';$('#cb2dUnits').appendChild(e)
}
function move(id,x,y,ms){
 const e=$('[data-unit="'+id+'"]');if(!e)return;
 const ox=parseFloat(e.style.left)||x,oy=parseFloat(e.style.top)||y,dx=x-ox,dy=y-oy;
 if(Math.hypot(dx,dy)>.8)e.style.setProperty('--face-angle',(Math.atan2(dy,dx)*180/Math.PI)+'deg');
 e.style.transitionDuration=Math.round(ms/((run&&run.speed)||1))+'ms';
 requestAnimationFrame(()=>{e.style.left=x+'%';e.style.top=y+'%'})
}
function faceUnit(id,targetId){
 const e=$('[data-unit="'+id+'"]'),a=pctPosition(id),b=pctPosition(targetId);if(!e||!a||!b)return;
 e.style.setProperty('--face-angle',(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI)+'deg')
}
function hitReact(id,kind='hit'){
 const e=$('[data-unit="'+id+'"]');if(!e)return;
 e.classList.remove('hit','healed');void e.offsetWidth;e.classList.add(kind==='heal'?'healed':'hit');
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

function spawn(s){
 renderDungeonEnvironment(s);$('#cb2dUnits').innerHTML='';$('#cb2dTelegraphs').innerHTML='';
 const max=s.kind==='final'?680:s.kind==='boss'?480:s.kind==='event'?220:120;
 run.enemyMax=s.enemies.map(()=>max);run.enemyHp=s.enemies.map(()=>max);
 run.threat=s.enemies.map(()=>Object.fromEntries(party().map(c=>[c.id,0])));
 run.aggro=s.enemies.map(()=>null);
 const melee=party().filter(c=>combatProfile(c)==='melee');
 const ranged=party().filter(c=>combatProfile(c)==='ranged');
 party().forEach((c,i)=>{
   addUnit('p-'+c.id,c.name,'party '+role(c)+' profile-'+combatProfile(c),4,50+(i-2)*4,'');
   let x=16,y=50;
   if(combatProfile(c)==='tank'){x=30;y=50}
   else if(combatProfile(c)==='melee'){x=23;y=43+(melee.indexOf(c)*14)}
   else if(combatProfile(c)==='ranged'){x=17;y=28+(ranged.indexOf(c)*44)}
   else{x=12;y=61}
   setTimeout(()=>{move('p-'+c.id,x,y,900);const bar=$('[data-unit="p-'+c.id+'"] .cb2d-unit-hp i');if(bar)bar.style.width=hp(c.id)+'%'},40)
 });
 s.enemies.forEach((n,i)=>{const boss=s.enemies.length===1&&(s.kind==='boss'||s.kind==='final');const y=s.enemies.length===1?50:30+i*(40/Math.max(1,s.enemies.length-1));addUnit('e-'+i,n,boss?'enemy boss':'enemy',92,y,boss?'big':'');setTimeout(()=>move('e-'+i,68,y,850),60)});
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
 const pct=(run.enemyHp[index]/Math.max(1,run.enemyMax[index]))*100;
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
 const arena=$('#cb2dArena'),a=point(from),b=point(to);if(!arena||!a||!b)return;
 const e=document.createElement('i');e.className='cb2d-projectile '+kind;e.style.left=a.x+'px';e.style.top=a.y+'px';arena.appendChild(e);
 requestAnimationFrame(()=>{e.style.transitionDuration=Math.round(ms/((run&&run.speed)||1))+'ms';e.style.transform='translate('+(b.x-a.x)+'px,'+(b.y-a.y)+'px)'});
 setTimeout(()=>e.remove(),Math.round(ms/((run&&run.speed)||1))+120)
}
function pctPosition(id){
 const el=$('[data-unit="'+id+'"]');if(!el)return{x:50,y:50};
 return{x:parseFloat(el.style.left)||50,y:parseFloat(el.style.top)||50};
}
function enemyPosition(index){return pctPosition('e-'+index)}
function formationPoint(c,index){
 const ep=enemyPosition(index),profile=combatProfile(c),p=party();
 if(profile==='tank')return{x:clamp(ep.x-8,40,61),y:clamp(ep.y,15,85)};
 if(profile==='melee'){
   const melees=p.filter(x=>combatProfile(x)==='melee'),i=Math.max(0,melees.indexOf(c));
   const offsets=[-9,9,-14,14];
   return{x:clamp(ep.x+6,50,78),y:clamp(ep.y+(offsets[i]||0),12,88)};
 }
 if(profile==='ranged'){
   const ranged=p.filter(x=>combatProfile(x)==='ranged'),i=Math.max(0,ranged.indexOf(c));
   const ys=[32,68,46];
   return{x:clamp(ep.x-30-(i%2)*4,20,46),y:ys[i]||50};
 }
 const living=p.filter(x=>hp(x.id)>0),avgY=living.reduce((n,x)=>n+pctPosition('p-'+x.id).y,0)/Math.max(1,living.length);
 return{x:clamp(ep.x-40,12,34),y:clamp(avgY+12,24,78)};
}
function maintainPosition(c,index,fast=false){
 if(run?.mechanicActive||index<0)return;
 const desired=formationPoint(c,index),current=pctPosition('p-'+c.id);
 const distance=Math.hypot(desired.x-current.x,desired.y-current.y);
 if(distance>2.5)move('p-'+c.id,desired.x,desired.y,fast?220:420);
}
function buildThreat(index,c,amount,source='damage'){
 if(!run?.threat?.[index]||!c)return;
 const profile=combatProfile(c);
 let value=Math.max(1,Number(amount)||1);
 if(profile==='tank')value*=source==='taunt'?16:6.5;
 else if(profile==='healer')value*=.55;
 else value*=1;
 run.threat[index][c.id]=(run.threat[index][c.id]||0)+value;
 updateAggro(index);
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
 if(profile==='tank')return 1050;
 if(c.class==='Rogue')return 700;
 if(c.class==='Hunter')return 1050;
 if(c.class==='Mage')return 1250;
 if(c.class==='Warrior')return 900;
 if(c.class==='Paladin')return 1050;
 return 1000;
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
 const kind=attackKind(c),profile=combatProfile(c),name=ability(c);
 const amount=(profile==='tank'?12:18)+Math.floor(Math.random()*10)+(tactics.aggression==='aggressive'?4:0);

 maintainPosition(c,index,true);
 setFocusEnemy(index);faceUnit('p-'+c.id,'e-'+index);
 const attacker=$('[data-unit="p-'+c.id+'"]');
 if(attacker){attacker.classList.add('attacking');setTimeout(()=>attacker.classList.remove('attacking'),360)}
 act(profile==='tank'?'tank':'dps',c.name+' · '+name);

 if(kind==='melee'){
   const desired=formationPoint(c,index);
   move('p-'+c.id,desired.x,desired.y,150);
   scheduleImpact(()=>projectile('p-'+c.id,'e-'+index,'slash',150),90,tok);
 }else{
   projectile('p-'+c.id,'e-'+index,kind,kind==='arrow'?260:330);
 }

 const travel=kind==='melee'?180:(kind==='arrow'?280:350);
 scheduleImpact(()=>{
   if(run.enemyHp[index]<=0)return;
   let next=run.enemyHp[index]-amount;
   if(!run.allowKill)next=Math.max(next,(run.enemyMax[index]||1)*.16);
   setEnemyHp(index,next);
   hitReact('e-'+index,'hit');floating('e-'+index,'-'+amount,'damage');
   buildThreat(index,c,amount,'damage');
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

 const amount=(s.kind==='boss'||s.kind==='final'?6:3)+Math.floor(Math.random()*(s.kind==='boss'||s.kind==='final'?7:5));
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
function fireHeal(healer,target,tok){
 if(tok!==token||!run?.combatActive||!healer||!target||hp(healer.id)<=0||hp(target.id)<=0)return;
 const amount=8+Math.floor(Math.random()*9);
 const activeEnemy=enemyIndex();
 if(activeEnemy>=0)maintainPosition(healer,activeEnemy,false);
 act('healer',healer.name+' · Healing '+target.name);
 faceUnit('p-'+healer.id,'p-'+target.id);projectile('p-'+healer.id,'p-'+target.id,'heal',320);
 scheduleImpact(()=>{
   if(hp(target.id)<=0)return;
   setHp(target.id,hp(target.id)+amount);
   hitReact('p-'+target.id,'heal');floating('p-'+target.id,'+'+amount,'heal');
   updateRows();
   run?.enemyHp?.forEach((v,i)=>{if(v>0)buildThreat(i,healer,amount*.35,'heal')});
 },320,tok);
}
function fireHealerDamage(healer,index,tok){
 if(index<0||run.enemyHp[index]<=0)return;
 const amount=7+Math.floor(Math.random()*5);
 maintainPosition(healer,index,false);
 act('healer',healer.name+' · Supporting damage');
 faceUnit('p-'+healer.id,'e-'+index);projectile('p-'+healer.id,'e-'+index,'magic',340);
 scheduleImpact(()=>{
   if(run.enemyHp[index]<=0)return;
   let next=run.enemyHp[index]-amount;
   if(!run.allowKill)next=Math.max(next,(run.enemyMax[index]||1)*.16);
   setEnemyHp(index,next);
   floating('e-'+index,'-'+amount,'damage');
   buildThreat(index,healer,amount,'damage');
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
 const now=performance.now();
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
     const targetIndex=enemyIndex();setFocusEnemy(targetIndex);
     if(targetIndex<0){run.combatActive=false;resolve();return}

     party().forEach(c=>{
       if(hp(c.id)<=0)return;
       const rt=run.rtParty[c.id]||(run.rtParty[c.id]={nextAttack:now,nextMove:now,nextHeal:now,nextSupport:now});
       const profile=combatProfile(c);

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
function resolveFloorMechanic(e,{damage=14,condition=5,label='Mechanic',allowTankSoak=false}={}){
 const victims=telegraphVictims(e);
 if(!victims.length){
   flash('AVOIDED',false);log(label+' is avoided by the party.');clearTelegraph(e,'safe');
   return{victims:[],avoidableHits:[]}
 }
 const avoidableHits=allowTankSoak?victims.filter(c=>combatProfile(c)!=='tank'):victims;
 applyMechanicDamage(victims,damage,condition,label);
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
function interruptOK(s){if(run.forceInterrupt){run.forceInterrupt=false;return true}if(tactics.interrupts==='high')return true;if(tactics.interrupts==='important')return s.kind==='boss'||s.kind==='final'||knowledge(s.knowledge)>=25;return s.kind==='final'||knowledge(s.knowledge)>=70}
function regroup(){
 const index=enemyIndex();
 if(index>=0){settleFormation(index);return}
 const p=party(),melee=p.filter(c=>combatProfile(c)==='melee'),ranged=p.filter(c=>combatProfile(c)==='ranged');
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
   await cast(name,ms,tok);const result=resolveFloorMechanic(v,{damage:12,condition:4,label:name,allowTankSoak:true});if(result.avoidableHits.length)act('healer','Recovering frontal damage');else act('tank','Frontal contained');regroup();run.mechanicActive=false;return
 }
 if(type==='circle'||type==='circles'){
   const p=party(),targets=type==='circles'?p.filter(c=>combatProfile(c)!=='tank').slice(0,3):[],v=type==='circles'?multiCircleTelegraph(targets.map(c=>'p-'+c.id),108,'VENTS TARGET PLAYERS · SPREAD'):circleTelegraph('e-0',170,'BOSS AOE · GET OUT'),a=[[25,20],[20,78],[38,22],[36,51],[38,80]];p.forEach((c,i)=>move('p-'+c.id,a[i][0],a[i][1],450));act('healer','Moving while maintaining heals');act('dps','Spreading from danger');
   await cast(name,ms,tok);const result=resolveFloorMechanic(v,{damage:type==='circles'?15:18,condition:type==='circles'?5:6,label:name});if(result.victims.length)act('healer','Recovering '+result.victims.length+' mechanic hit'+(result.victims.length>1?'s':''));regroup();run.mechanicActive=false;return
 }
 if(type==='line'){
   const candidates=party().filter(c=>combatProfile(c)!=='tank'&&hp(c.id)>0),target=candidates[Math.floor(Math.random()*Math.max(1,candidates.length))]||party()[0],v=lineTelegraph('e-0','p-'+target.id,'CHARGE LINE · SIDESTEP');party().filter(c=>c.id!==target.id&&combatProfile(c)!=='tank').forEach((c,i)=>move('p-'+c.id,27,24+i*27,420));if(target)move('p-'+target.id,25,82,420);act('dps','Sidestepping line attack');
   await cast(name,ms,tok);const result=resolveFloorMechanic(v,{damage:20,condition:7,label:name});if(result.victims.length)act('healer','Recovering line damage');regroup();run.mechanicActive=false;return
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
function chance(s){const avg=party().reduce((n,c)=>n+cond(c.id),0)/5;return clamp(Math.round(s.base+(ilvl()-18)*2+knowledge(s.knowledge)*.12+(avg-75)*.1+bonus(s)),35,97)}
function learn(s,ok){const a=ok?(s.kind==='trash'||s.kind==='event'?3:7):5;party().forEach(c=>{c.knowledge=c.knowledge||{};c.knowledge[s.knowledge]=clamp((Number(c.knowledge[s.knowledge])||0)+a,0,100)});return a}
function loot(s){
 if(!s.bossId)return null;const boss=Game.bosses.find(b=>b.id===s.bossId);if(P&&P.rollReagents)(P.rollReagents(s.bossId)||[]).forEach(d=>Game.addMaterial(d.key,d.quantity));
 if((s.kind==='final'||Math.random()<.45)&&G&&G.rollDungeonLoot&&boss){const x=G.rollDungeonLoot(boss.name,boss.tier2Chance);Game.addBankItem(Object.assign({},x,{source:'The Ashen Vault · '+boss.name}));return x}return null
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
 const ok=run.stageOutcome,dmg=ok?(s.kind==='boss'||s.kind==='final'?5:3):(s.kind==='boss'||s.kind==='final'?22:10);
 party().forEach(c=>{const hit=Math.max(1,dmg-Math.floor(Math.random()*4));setCond(c.id,cond(c.id)-hit);if(!ok)setHp(c.id,hp(c.id)-Math.ceil(hit/2))});updateRows();
 if(ok){
   const k=learn(s,true),item=loot(s);if(s.bossId)state().bossKills[s.bossId]=true;if(s.id==='kael')state().gold+=35;if(s.id==='embermaw')state().gold+=55;
   state().activity.push(s.title+' cleared during The Ashen Vault.');log(s.title+' cleared. Knowledge +'+k+'%.');if(item){run.rewards.push(item.name);flash('LOOT ACQUIRED',false);log(item.name+' sent to the Guild Bank.')}
   Game.save();await Game.persistState();return true
 }
 learn(s,false);const wipe=s.kind==='boss'||s.kind==='final'||party().some(c=>hp(c.id)<=0||cond(c.id)<=0);
 if(!wipe){log(s.title+' hurts the group, but the party keeps moving.');Game.save();await Game.persistState();return true}
 await playWipeVisual(s);
 Game.applyPartyCellShock(25);const st=state();st.dungeonHistory=Array.isArray(st.dungeonHistory)?st.dungeonHistory:[];st.dungeonHistory.unshift({at:new Date().toISOString(),result:'wipe',stage:s.id,partyIlvl:ilvl()});st.dungeonHistory=st.dungeonHistory.slice(0,20);st.activity.push('The guild wiped at '+s.title+'. All five gained 25% Cell Shock.');await Game.persistState();finish(false,s);return false
}
async function seamless(tok){
 try{
  for(let i=0;i<STAGES.length;i++){
   if(tok!==token)return;run.stage=i;run.override=0;const s=STAGES[i];
   $('#cb2dTitle').textContent=s.title;$('#cb2dRoute').innerHTML=route();$('#cb2dType').textContent=s.kind==='final'?'FINAL BOSS':s.kind==='boss'?'BOSS':s.kind==='event'?'EVENT':'HOSTILE PACK';
   spawn(s);run.stageOutcome=Math.random()*100<chance(s);run.allowKill=false;run.mechanicActive=false;status('Party moving into position…');log('Entering '+s.title+'.');act('tank','Taking point');act('healer','Following formation');act('dps','Acquiring targets');await delay(1050);
   act('tank','Establishing threat');act('healer','Holding healing range');act('dps','Moving into role positions');settleFormation(0);await delay(350);
   const combat=combatLoop(s,tok);await delay(420);
   for(const m of s.mechanics){await mechanic(s,m,tok);await delay(220)}
   run.mechanicActive=false;status('Finishing encounter…');await finishCombat(s,tok);await combat;
   if(!await resolveStage(s)||tok!==token)return;
   if(i<STAGES.length-1){party().forEach(c=>setHp(c.id,hp(c.id)+6));updateRows();flash('PATH CLEAR',false);await delay(420);await travelDeeper(STAGES[i+1],tok)}
  }
  const st=state();st.dungeonHistory=Array.isArray(st.dungeonHistory)?st.dungeonHistory:[];st.dungeonCompletions=Number(st.dungeonCompletions)||0;st.gold+=120;st.renown+=60;st.dungeonCompletions++;st.dungeonHistory.unshift({at:new Date().toISOString(),result:'complete',partyIlvl:ilvl()});st.dungeonHistory=st.dungeonHistory.slice(0,20);st.activity.push('The Ashen Vault cleared. The Vaultheart has fallen.');await Game.persistState();finish(true,STAGES[6])
 }catch(e){if(e&&e.message!=='cancelled')console.error('Ashen Vault 2D runtime',e)}
}
function finish(ok,s){if(!run)return;run.resolved=true;const e=$('#cb2dEnd');e.hidden=false;e.innerHTML='<div><small>'+(ok?'DUNGEON COMPLETE':'EXPEDITION FAILED')+'</small><h3>'+(ok?'The Vaultheart has fallen.':'Wipe at '+esc(s.title)+'.')+'</h3><p>'+(ok?('The full Ashen Vault run completed seamlessly.'+(run.rewards.length?' Loot: '+run.rewards.map(esc).join(', ')+'.':'')):'All five adventurers gained 25% Cell Shock. Knowledge earned during the run is retained.')+'</p></div><button>RETURN TO GUILD →</button>';e.querySelector('button').onclick=()=>{close();Game.switchView('content')}}
async function override(t,b){
 if(!run||run.resolved)return;b.classList.add('active');setTimeout(()=>b.classList.remove('active'),450);
 if(t==='focus'){run.override=Math.max(run.override,4);act('dps','Focusing priority target');log('Override: focus target.')}
 if(t==='interrupt'){run.forceInterrupt=true;log('Override: force next interrupt.')}
 if(t==='defensive'){run.override=Math.max(run.override,5);party().forEach(c=>setCond(c.id,cond(c.id)+5));updateRows();act('tank','Using defensive cooldowns');log('Override: defensive cooldowns.')}
 if(t==='burn'){run.override=Math.max(run.override,6);act('dps','Committing damage cooldowns');log('Override: burn boss.')}
 if(t==='consumable'){const st=state(),x=(st.consumables||[]).find(y=>(y.quantity||0)>0);if(!x){log('No usable consumables remain.');return}party().forEach(c=>setCond(c.id,cond(c.id)+12));x.quantity--;if(x.quantity<=0)st.consumables=st.consumables.filter(y=>y!==x);updateRows();log(x.name+' used.');Game.save()}
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
}
init();
})();