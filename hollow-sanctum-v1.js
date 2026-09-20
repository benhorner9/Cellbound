(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,run=null,token=0;
const STAGES=[
 {id:'gallery',title:'Gallery of Echoes',kind:'TRASH',combatKind:'trash',level:6,enemyTypes:['trash','trash','trash'],enemyHealth:145,enemies:['Hollowed Surveyor','Hollowed Surveyor','Glass Mite'],mechanic:'Echo Burst',mechanics:[['Echo Burst','circles',1500]]},
 {id:'sentinel',title:'Glassjaw Sentinel',kind:'MINI-BOSS',combatKind:'boss',level:7,enemyTypes:['elite'],enemyHealth:750,enemies:['Glassjaw Sentinel'],mechanic:'Fracture Line',mechanics:[['Fracture Line','line',1700],['Glassjaw Sweep','cone',1450]]},
 {id:'choir',title:'The Bound Choir',kind:'FINAL BOSS',combatKind:'final',level:8,enemyTypes:['boss'],enemyHealth:1000,enemies:['The Bound Choir'],mechanic:'Resonance Collapse',mechanics:[['Resonance Collapse','circle',2100],['Shattering Hymn','interrupt',2200],['Echo Choir','adds',1200]]}
];
const RELIC={itemId:'quest-blackglass-resonator',name:'Blackglass Resonator',class:'All',classes:'all',slot:'Relic',tier:3,rarity:'Rare',tierLabel:'Quest Relic',enabled:true,dropEnabled:false,itemLevel:30,power:10,tradeState:'soulbound',questArtMaterial:'void-crystal',lore:'Recovered from The Bound Choir beneath Zeltira.'};
const XP=500;
function rollHollowGear(){
 const G=window.CellboundGear,pool=(G?.items||[]).filter(x=>x.tier===3&&x.enabled);
 if(!pool.length)return null;
 const base=pool[Math.floor(Math.random()*pool.length)];
 return G.rollItemAffixes?.({...base,source:'The Hollow Sanctum · The Bound Choir'})||{...base,source:'The Hollow Sanctum · The Bound Choir'};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const role=c=>Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps';
const classKey=c=>'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ilvl=()=>Number(Game?.partyItemLevel?.())||0;
const partyLevel=()=>{const p=party();return p.length?Math.round(p.reduce((n,c)=>n+Math.max(1,Number(c.level)||1),0)/p.length):1};
function hsResourceDef(c){return window.CellboundCombatReborn?.RESOURCE_DEFS?.[c?.class]||{name:'Power',max:100,start:100}}
function hsAdvanceCooldowns(ms){
 const amount=Math.max(0,Number(ms)||0);if(!run)return;
 Object.values(run.cooldowns||{}).forEach(map=>Object.keys(map||{}).forEach(k=>map[k]=Math.max(0,(Number(map[k])||0)-amount)));
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
 const mount=$('#hollowSanctumMount');if(!mount||!Game?.ready)return;
 const q=qstate(),open=Boolean(q?.flags?.hollowSanctumUnlocked),done=Boolean(q?.flags?.hollowFirstClear);
 mount.innerHTML='<article class="hs-journal '+(open?'unlocked':'locked')+'"><div class="hs-journal-art"><span>'+(open?'HOLLOW DEEP · DUNGEON':'SEALED SIGNAL · LOCATION UNKNOWN')+'</span><h3>'+(open?'The Hollow Sanctum':'Undiscovered Location')+'</h3><p>'+(open?'A sealed complex beneath Zeltira where Cell glass has grown through the stone like roots.':'Your guild has detected something beneath the old east road, but no route to it has been confirmed.')+'</p><div>'+(open?'<b>5 Adventurers</b><b>Levels 6–8</b><b>iLvl 24+</b>':'<b>Quest Discovery Required</b>')+'</div></div><div class="hs-journal-entry"><small>'+(open?(done?'DISCOVERED · FARMABLE':'NEWLY DISCOVERED'):'UNDISCOVERED')+'</small><h4>'+(open?'The Hollow Seal is broken.':'The map ends at sealed stone.')+'</h4><p>'+(open?'Void Crystal can be recovered here. The first clear awards the Blackglass Resonator Relic.':'Continue Echoes Beneath Zeltira to learn what is hidden here.')+'</p><button '+(open?'data-hs-enter':'data-hs-quests')+'>'+(open?'ENTER THE HOLLOW SANCTUM':'FOLLOW THE QUEST CHAIN →')+'</button></div></article>';
 mount.querySelector('[data-hs-enter]')?.addEventListener('click',openDungeon);
 mount.querySelector('[data-hs-quests]')?.addEventListener('click',()=>Game.switchView?.('quests'));
}
function briefing(){
 const gate=readiness(),r=root();r.hidden=false;document.body.classList.add('hs2d-open');
 if(!gate.ok){
   r.innerHTML='<section class="hs2d-shell hs2d-brief"><header><div><small>THE HOLLOW SANCTUM · ENTRY CHECK</small><h2>The seal is open, but the party is not ready.</h2></div><button data-close>×</button></header><div class="hs2d-blocked"><b>ENTRY BLOCKED</b><p>'+esc(gate.reason)+'</p><button data-action>'+(unlocked()?'OPEN PARTY BUILDER':'OPEN QUEST JOURNAL')+' →</button></div></section>';
   r.querySelector('[data-close]').onclick=close;r.querySelector('[data-action]').onclick=()=>{close();Game.switchView?.(unlocked()?'party':'quests')};return;
 }
 r.innerHTML='<section class="hs2d-shell hs2d-brief"><header><div><small>THE HOLLOW SANCTUM · EXPEDITION BRIEFING</small><h2>The door beneath Zeltira is breathing.</h2></div><button data-close>×</button></header><div class="hs2d-brief-grid"><main><div class="hs2d-relic-preview"><div>◆</div><span><small>FIRST-CLEAR RELIC</small><b>Blackglass Resonator</b><p>Rare · Relic · Item Level 30 · +10 Power</p></span></div><h3>What the guild knows</h3><p>Cell glass has spread through the buried masonry. The things inside react to movement and sound, then answer with violent resonance.</p><div class="hs2d-intel"><span><b>Gallery of Echoes</b><small>Moving packs and pulse damage</small></span><span><b>Glassjaw Sentinel</b><small>Line fractures across the chamber</small></span><span><b>The Bound Choir</b><small>Large resonance zones</small></span></div></main><aside><small>ACTIVE FIVE · PARTY LV '+partyLevel()+' · ILVL '+ilvl()+'</small>'+party().map(c=>'<div><i class="'+role(c)+' '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>Lv. '+Math.max(1,Number(c.level)||1)+' · '+esc(c.class)+' · '+esc(c.spec)+'</small></span></div>').join('')+'<button data-start>BEGIN DESCENT →</button></aside></div></section>';
 r.querySelector('[data-close]').onclick=close;r.querySelector('[data-start]').onclick=start;
}
function openDungeon(){Game=window.CellboundGame;if(!Game?.ready)return;db=Game.getSupabase?.();briefing()}
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
function addUnit(id,label,cls,x,y,big=false,meta=''){const e=document.createElement('div');e.className='hs2d-unit '+cls+(big?' big':'');e.dataset.hs=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+(meta?'<small class="hs2d-unit-meta">'+esc(meta)+'</small>':'')+'</span><em><i></i></em>';$('#hs2dUnits').appendChild(e)}
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
function stageEnvironment(s){const arena=$('#hs2dArena');arena.className='hs2d-arena stage-'+s.id;$('#hs2dRoom').innerHTML='<b>'+esc(s.title)+'</b><small>'+(s.id==='gallery'?'Cell glass whispers through the walls.':s.id==='sentinel'?'A guardian made of glass and bone blocks the descent.':'Several voices are speaking from one body.')+'</small>'}
function spawnStage(s){
 stageEnvironment(s);$('#hs2dUnits').innerHTML='';$('#hs2dTelegraphs').innerHTML='';$('#hs2dFx').innerHTML='';
 const p=party(),melee=p.filter(c=>role(c)!=='healer'&&!['Hunter','Mage','Priest'].includes(c.class));
 p.forEach((c,i)=>{const r=role(c);addUnit('p'+i,c.name,'party '+r+' '+classKey(c),7,30+i*10);let x=r==='tank'?34:r==='healer'?19:(['Hunter','Mage','Priest'].includes(c.class)?22:29),y=31+i*9;setTimeout(()=>move('p'+i,x,y,750),40)});
 s.enemies.forEach((n,i)=>{const m=hsEnemyMeta(s,i),big=m.type==='boss'||m.type==='world-boss';addUnit('e'+i,n,big?'enemy boss':'enemy',93,big?50:33+i*17,big,'Lv. '+m.level+' · '+m.label);setTimeout(()=>move('e'+i,68,big?50:33+i*17,750),80)})
}
function hsRenderId(unitId){
 const id=String(unitId||'');
 if(id.startsWith('p-')){const charId=id.slice(2),i=party().findIndex(x=>String(x.id)===charId);return i>=0?'p'+i:null}
 if(/^e-\d+$/.test(id))return'e'+Number(id.slice(2));
 return id
}
function hsCharacter(unitId){const id=String(unitId||'');return id.startsWith('p-')?party().find(x=>String(x.id)===id.slice(2)):null}
function hsAttackKind(c){return c?.class==='Hunter'?'arrow':['Mage','Priest','Druid','Evoker'].includes(c?.class)?'magic':'slash'}
function hsRebornEncounter(s){return{id:s.id,title:s.title,kind:s.combatKind||'trash',level:s.level||1,recommendedItemLevel:s.level<=6?24:s.level===7?26:28,enemyLevels:s.enemyLevels||null,enemyTypes:s.enemyTypes||null,enemies:[...s.enemies],enemyHealth:s.enemyHealth,mechanics:s.mechanics||[]}}
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
function hsRenderRebornEvent(e){
 const src=hsRenderId(e.source),target=hsRenderId(e.target),srcChar=hsCharacter(e.source),targetChar=hsCharacter(e.target);
 switch(e.type){
  case'COMBAT_START':setStatus('Combat simulation live.');feed('Combat begins.');break;
  case'MOVEMENT_START':if(src&&e.payload?.to)move(src,e.payload.to.x,e.payload.to.y,e.payload.duration||420);break;
  case'ABILITY_START':
   if(srcChar&&target){projectile(src,target,hsAttackKind(srcChar),260)}
   else if(src&&target&&(String(e.source||'').startsWith('e-')||String(e.source||'').startsWith('add-')))projectile(src,target,'enemy',300);
   break;
  case'DAMAGE_DEALT':
   if(target){
     const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));hsBar(target,pct);hsFloat(target,'-'+Math.round(Number(e.amount)||0),targetChar?'incoming':'damage');
     if(targetChar)run.hp[targetChar.id]=pct;
   }
   if(e.payload?.avoidable)feed((targetChar?.name||'A player')+' is hit by avoidable '+(e.ability||'damage')+'.');
   break;
  case'HEAL_RECEIVED':
   if(target&&targetChar){const pct=Math.max(0,Math.min(100,Number(e.payload?.targetHpPct)||0));run.hp[targetChar.id]=pct;hsBar(target,pct);hsFloat(target,'+'+Math.round(Number(e.amount)||0),'heal')}
   break;
  case'PLAYER_MISTAKE':if(srcChar)feed(srcChar.name+' '+(e.payload?.detail||'makes an execution mistake')+'.');break;
  case'PLAYER_REVIVED':
   if(target&&targetChar){const pct=Math.max(1,Math.min(100,Number(e.payload?.targetHpPct)||35)),el=$('[data-hs="'+target+'"]');if(el)el.classList.remove('dead');run.hp[targetChar.id]=pct;hsBar(target,pct);hsFloat(target,'BATTLE REZ','heal');feed(targetChar.name+' is brought back by '+(srcChar?.name||'the healer')+'.');hsResourceVisual({source:e.target,payload:{resource:e.payload?.resource,value:e.payload?.resourceValue,max:e.payload?.resourceMax}})}
   break;
  case'RESOURCE_STATE':case'RESOURCE_SPENT':case'RESOURCE_GAINED':hsResourceVisual(e);break;
  case'AGGRO_CHANGED':
   if(targetChar&&role(targetChar)!=='tank')feed(targetChar.name+' pulls aggro from the Tank.');
   break;
  case'MECHANIC_TELEGRAPH':
   setStatus((e.ability||'Mechanic')+' incoming…');feed((e.ability||'A mechanic')+' is telegraphed.');hsMechanicFromEvent(e);break;
  case'MECHANIC_RESOLVE':hsClearMechanic(e.payload?.token,true);break;
  case'CAST_START':if(e.payload?.interruptible)feed((e.ability||'Cast')+' can be interrupted.');break;
  case'INTERRUPT':
   if(e.result==='success'){feed((srcChar?.name||'A player')+' interrupts '+(e.payload?.interruptedAbility||'the cast')+'.');setStatus('Interrupt successful.');hsClearMechanic(e.payload?.token,false)}
   break;
  case'ADD_SPAWNED':hsAddSpawn(e);feed((e.payload?.name||'An add')+' enters the encounter.');break;
  case'ADD_DEFEATED':case'ENEMY_DEFEATED':
   if(target){const el=$('[data-hs="'+target+'"]');if(el){el.classList.add('dead');hsBar(target,0)}}break;
  case'PLAYER_DEFEATED':
   if(target){const el=$('[data-hs="'+target+'"]');if(el)el.classList.add('dead');hsBar(target,0);if(targetChar){run.hp[targetChar.id]=0;feed(targetChar.name+' is defeated.')}}
   break;
  case'DEFENSIVE_ACTIVATED':if(srcChar)feed(srcChar.name+' activates a defensive.');break;
  case'COMBAT_END':setStatus(e.result==='victory'?'Path clear.':'Party defeated.');break;
 }
}
async function hsPlayTimeline(result,tok){
 let last=0;run.telegraphs={};
 for(const e of result.events||[]){
   if(tok!==token||!run)return false;
   const gap=Math.max(0,(Number(e.timestamp)||0)-last);if(gap)await wait(gap);
   hsRenderRebornEvent(e);last=Number(e.timestamp)||last
 }
 return result.outcome==='victory'
}
function hsStageSummary(result){
 const s=result?.summary||{},ints=s.interrupts||{},m=s.mechanics||{};
 return'<div class="hs2d-combat-summary"><small>COMBAT REBORN</small><b>'+Math.round(Number(s.totalDamage)||0).toLocaleString()+' damage · '+Math.round(Number(s.totalHealing)||0).toLocaleString()+' healing</b><span>'+Number(s.deaths||0)+' deaths · '+Number(s.mistakes?.total||0)+' mistakes · '+Number(s.battleResurrections||0)+' battle rez · '+Number(ints.success||0)+'/'+Number(ints.attempts||0)+' interrupts · '+Number(m.avoided||0)+' mechanics avoided · '+Number(m.failed||0)+' failed</span></div>'
}
async function hsFail(s,result){
 run.done=true;Game.applyPartyCellShock?.(25);const st=state();st.activity.push('The guild wiped in The Hollow Sanctum at '+s.title+'. All five gained 25% Cell Shock.');Game.save?.();await Game.persistState?.();
 const end=$('#hs2dEnd');end.hidden=false;end.innerHTML='<section class="hs2d-rewards"><small>EXPEDITION FAILED</small><h2>'+esc(s.title)+'</h2><p>The simulation ended when the party could no longer continue. Combat knowledge and the cause of the wipe remain visible below.</p>'+hsStageSummary(result)+'<button data-return>RETURN TO DUNGEON JOURNAL →</button></section>';end.querySelector('[data-return]').onclick=close
}
async function hsRecoverFallen(tok){
 let fallen=party().filter(c=>(Number(run.hp[c.id])||0)<=0);if(!fallen.length)return true;
 let healer=party().find(c=>role(c)==='healer'&&(Number(run.hp[c.id])||0)>0);
 if(!healer){
   healer=party().find(c=>role(c)==='healer');if(!healer)return false;
   feed(healer.name+' releases and returns from the previous checkpoint.');setStatus('Healer returning to the group…');await wait(550);if(tok!==token)return false;
   hsAdvanceCooldowns(15000);run.hp[healer.id]=35;run.reviveSickness[healer.id]=15000;const hid=hsRenderId('p-'+healer.id),hel=$('[data-hs="'+hid+'"]');hel?.classList.remove('dead');hsBar(hid,35);
   fallen=party().filter(c=>(Number(run.hp[c.id])||0)<=0)
 }
 for(const member of fallen){
   if(member.id===healer.id)continue;
   const now=Number(run.expeditionTimeMs)||0,ready=Number(run.reviveReadyAt)||0;
   if(ready>now){feed('The party regroups while Revive recharges.');await wait(450);hsAdvanceCooldowns(ready-now)}
   setStatus(healer.name+' is reviving '+member.name+'…');feed(healer.name+' begins Revive on '+member.name+'.');await wait(700);if(tok!==token)return false;
   run.hp[member.id]=35;run.reviveSickness[member.id]=15000;const id=hsRenderId('p-'+member.id),el=$('[data-hs="'+id+'"]');el?.classList.remove('dead');hsBar(id,35);hsFloat(id,'REVIVED','heal');
   run.outOfCombatRevives=(Number(run.outOfCombatRevives)||0)+1;hsAdvanceCooldowns(4000);run.reviveReadyAt=run.expeditionTimeMs+45000;feed(member.name+' is back on their feet.')
 }
 return true
}
async function fightStage(s,tok,index){
 spawnStage(s);setStatus('Entering '+s.title+'…');feed('The party enters '+s.title+'.');await wait(650);if(tok!==token)return false;
 const C=window.CellboundCombatReborn;if(!C?.simulate)throw new Error('Combat Reborn engine unavailable');
 const combatParty=party().map(c=>Object.assign({},c,{_combatHealthPct:run.hp[c.id],_combatResource:run.resources?.[c.id]||null,_combatItemLevel:Number(Game?.characterItemLevel?.(c))||Number(c.gear)||0,_combatCooldowns:run.cooldowns?.[c.id]||{},_reviveSicknessMs:run.reviveSickness?.[c.id]||0}));
 const result=C.simulate({party:combatParty,encounter:hsRebornEncounter(s),tactics:{interruptPriority:'standard',addPriority:'immediate',defensiveUsage:'standard',pullStyle:'normal',movementDiscipline:'balanced'},seed:['hollow-sanctum',tok,index,Date.now()].join(':')});
 result.stageId=s.id;result.stageTitle=s.title;result.startHp={...run.hp};run.history.push(result);
 const won=await hsPlayTimeline(result,tok);hsResultHealth(result);
 (result?.finalState?.players||[]).forEach(p=>{
  const ch=party().find(x=>String(x.id)===String(p.characterId));if(!ch)return;
  if(p.resource)run.resources[ch.id]={name:p.resource.name,max:p.resource.max,value:p.resource.value};
  run.cooldowns[ch.id]=Object.fromEntries(Object.entries(p.cooldowns||{}).filter(([,v])=>Number(v)>0));
  run.reviveSickness[ch.id]=Math.max(0,(Number(p.revivePenaltyUntil)||0)-Number(result.durationMs||0))
 });
 run.expeditionTimeMs=(Number(run.expeditionTimeMs)||0)+Number(result.durationMs||0);
 if(!won){await hsFail(s,result);return false}
 if(!await hsRecoverFallen(tok))return false;
 party().forEach(c=>{if((run.hp[c.id]||0)>0)run.hp[c.id]=Math.min(100,(run.hp[c.id]||0)+6)});
 hsAdvanceCooldowns(5000);
 feed(s.title+' is clear.');setStatus('Path clear.');await wait(600);return true
}
function draw(){
 const s=STAGES[run.stage],r=root();r.hidden=false;
 r.innerHTML='<section class="hs2d-shell"><header><div><small>THE HOLLOW SANCTUM · LEVELS 6–8 · LIVE 2D DUNGEON</small><h2 id="hs2dTitle">'+esc(s.title)+'</h2></div><div class="hs2d-live"><i></i>LIVE <button data-close>×</button></div></header><div class="hs2d-route">'+STAGES.map((x,i)=>'<span class="'+(i<run.stage?'done':i===run.stage?'current':'')+'"><i>'+(i+1)+'</i>'+esc(x.title)+'</span>').join('')+'</div><div class="hs2d-layout"><main><div class="hs2d-arena" id="hs2dArena"><div class="hs2d-floor"></div><div class="hs2d-crystals"><i></i><i></i><i></i><i></i><i></i></div><div id="hs2dTelegraphs"></div><div id="hs2dUnits"></div><div id="hs2dFx"></div><div class="hs2d-room" id="hs2dRoom"></div><div class="hs2d-caption"><span>EXPEDITION</span><b id="hs2dStatus">Descending…</b></div></div><div class="hs2d-feed" id="hs2dFeed"></div></main><aside><small>ACTIVE FIVE · PARTY ILVL '+ilvl()+'</small>'+party().map(c=>'<div class="hs2d-member"><i class="'+role(c)+' '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span></div>').join('')+'<div class="hs2d-loot-intel"><small>KNOWN REWARDS</small><b>Tier 3 randomized equipment</b><span>Void Crystal · '+(!firstCleared()?'Blackglass Resonator first clear':'unique Relic already recovered')+'</span></div></aside></div><div id="hs2dEnd" class="hs2d-end" hidden></div></section>';
 r.querySelector('[data-close]').onclick=()=>{if(run&&!run.done&&!confirm('Leave The Hollow Sanctum?'))return;close()}
}
async function start(){
 token++;const tok=token,p=party();run={stage:0,done:false,log:[],hp:Object.fromEntries(p.map(c=>[c.id,100])),resources:Object.fromEntries(p.map(c=>{const d=hsResourceDef(c);return[c.id,{name:d.name,max:d.max,value:d.start}]})),cooldowns:Object.fromEntries(p.map(c=>[c.id,{}])),reviveSickness:Object.fromEntries(p.map(c=>[c.id,0])),expeditionTimeMs:0,reviveReadyAt:0,outOfCombatRevives:0,history:[],telegraphs:{}};draw();
 for(let i=0;i<STAGES.length;i++){if(tok!==token)return;run.stage=i;const s=STAGES[i];$('#hs2dTitle').textContent=s.title;$('.hs2d-route').innerHTML=STAGES.map((x,j)=>'<span class="'+(j<i?'done':j===i?'current':'')+'"><i>'+(j+1)+'</i>'+esc(x.title)+'</span>').join('');if(!await fightStage(s,tok,i))return}
 if(tok!==token)return;await complete();
}
async function complete(){
 const s=state(),q=qstate(),first=!q.flags.hollowFirstClear,gains=awardXp(),gear=rollHollowGear();s.gold=(Number(s.gold)||0)+220;s.renown=(Number(s.renown)||0)+100;Game.addMaterial?.('void-crystal',first?2:1);q.flags.hollowFirstClear=true;q.hollowCompletions=(Number(q.hollowCompletions)||0)+1;
 if(gear)Game.addBankItem?.(gear);
 if(first)Game.addBankItem?.({...RELIC,source:'The Bound Choir · First Clear'});
 s.activity.push('The Hollow Sanctum cleared. Each adventurer earned '+XP+' XP.'+(gear?' '+gear.name+' was sent to the Guild Bank.':'')+(first?' Blackglass Resonator added to the Guild Bank.':''));
 Game.save?.();await Game.persistState?.();await syncXp(gains);run.done=true;window.dispatchEvent(new CustomEvent('cellbound:hollow-complete',{detail:{firstClear:first}}));
 const end=$('#hs2dEnd');end.hidden=false;end.innerHTML='<section class="hs2d-rewards"><small>DUNGEON COMPLETE</small><h2>The Hollow Sanctum</h2><p>The voices beneath Zeltira have fallen silent — for now.</p><div class="hs2d-reward-grid"><article><span>GOLD</span><b>+220</b></article><article><span>RENOWN</span><b>+100</b></article><article><span>PARTY XP</span><b>+'+XP+'</b></article><article><span>VOID CRYSTAL</span><b>+'+(first?2:1)+'</b></article></div>'+(gear?'<div class="hs2d-first-relic"><div>'+window.CellboundGear.artHTML(gear,76)+'</div><span><small>TIER 3 DUNGEON DROP</small><h3>'+esc(gear.name)+'</h3><p>'+(window.CellboundGear.statLines?.(gear)||[]).map(x=>esc(x.text)).join(' · ')+'</p><em>Sent to the Guild Bank</em></span></div>':'')+(first?'<div class="hs2d-first-relic"><div>'+window.CellboundGear.artHTML(RELIC,76)+'</div><span><small>FIRST-CLEAR RELIC</small><h3>Blackglass Resonator</h3><p>Rare · Relic · Item Level 30 · +10 Power</p><em>Sent to the Guild Bank</em></span></div>':'')+'<div class="hs2d-xp-list">'+gains.map(x=>'<div><span><b>'+esc(x.name)+'</b><small>Level '+x.beforeLevel+(x.afterLevel!==x.beforeLevel?' → '+x.afterLevel:'')+'</small></span><strong>+'+XP+' XP</strong></div>').join('')+'</div><button data-return>RETURN TO DUNGEON JOURNAL →</button></section>';
 end.querySelector('[data-return]').onclick=()=>{close();Game.renderAll?.();renderCard()}
}
function init(){Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}db=Game.getSupabase?.();renderCard();document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',renderCard);window.CellboundHollowSanctum={open:openDungeon,renderCard,relic:RELIC}}
init();
})();