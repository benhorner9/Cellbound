(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,run=null,token=0;
const STAGES=[
 {id:'gallery',title:'Gallery of Echoes',kind:'TRASH',enemies:['Hollowed Surveyor','Hollowed Surveyor','Glass Mite'],mechanic:'Echo Burst'},
 {id:'sentinel',title:'Glassjaw Sentinel',kind:'MINI-BOSS',enemies:['Glassjaw Sentinel'],mechanic:'Fracture Line'},
 {id:'choir',title:'The Bound Choir',kind:'FINAL BOSS',enemies:['The Bound Choir'],mechanic:'Resonance Collapse'}
];
const RELIC={itemId:'quest-blackglass-resonator',name:'Blackglass Resonator',class:'All',classes:'all',slot:'Relic',tier:3,rarity:'Rare',tierLabel:'Quest Relic',enabled:true,dropEnabled:false,itemLevel:30,power:10,tradeState:'soulbound',questArtMaterial:'void-crystal',lore:'Recovered from The Bound Choir beneath Zeltira.'};
const XP=500;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const role=c=>Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps';
const ilvl=()=>Number(Game?.partyItemLevel?.())||0;
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
 mount.innerHTML='<article class="hs-journal '+(open?'unlocked':'locked')+'"><div class="hs-journal-art"><span>HOLLOW DEEP · DUNGEON</span><h3>The Hollow Sanctum</h3><p>A sealed complex beneath Zeltira where Cell glass has grown through the stone like roots.</p><div><b>5 Adventurers</b><b>3 Stages</b><b>iLvl 24+</b></div></div><div class="hs-journal-entry"><small>'+(open?(done?'DISCOVERED · FARMABLE':'NEWLY DISCOVERED'):'UNDISCOVERED')+'</small><h4>'+(open?'The Hollow Seal is broken.':'Something lies beneath the east road.')+'</h4><p>'+(open?'Void Crystal can be recovered here. The first clear awards the Blackglass Resonator Relic.':'Complete the campaign quest Echoes Beneath Zeltira to reveal this location.')+'</p><button '+(open?'data-hs-enter':'data-hs-quests')+'>'+(open?'ENTER THE HOLLOW SANCTUM':'FOLLOW THE QUEST CHAIN →')+'</button></div></article>';
 mount.querySelector('[data-hs-enter]')?.addEventListener('click',openDungeon);
 mount.querySelector('[data-hs-quests]')?.addEventListener('click',()=>Game.switchView?.('quests'));
}
function briefing(){
 const gate=readiness(),r=root();r.hidden=false;document.body.classList.add('hs2d-open');
 if(!gate.ok){
   r.innerHTML='<section class="hs2d-shell hs2d-brief"><header><div><small>THE HOLLOW SANCTUM · ENTRY CHECK</small><h2>The seal is open, but the party is not ready.</h2></div><button data-close>×</button></header><div class="hs2d-blocked"><b>ENTRY BLOCKED</b><p>'+esc(gate.reason)+'</p><button data-action>'+(unlocked()?'OPEN PARTY BUILDER':'OPEN QUEST JOURNAL')+' →</button></div></section>';
   r.querySelector('[data-close]').onclick=close;r.querySelector('[data-action]').onclick=()=>{close();Game.switchView?.(unlocked()?'party':'quests')};return;
 }
 r.innerHTML='<section class="hs2d-shell hs2d-brief"><header><div><small>THE HOLLOW SANCTUM · EXPEDITION BRIEFING</small><h2>The door beneath Zeltira is breathing.</h2></div><button data-close>×</button></header><div class="hs2d-brief-grid"><main><div class="hs2d-relic-preview"><div>◆</div><span><small>FIRST-CLEAR RELIC</small><b>Blackglass Resonator</b><p>Rare · Relic · Item Level 30 · +10 Power</p></span></div><h3>What the guild knows</h3><p>Cell glass has spread through the buried masonry. The things inside react to movement and sound, then answer with violent resonance.</p><div class="hs2d-intel"><span><b>Gallery of Echoes</b><small>Moving packs and pulse damage</small></span><span><b>Glassjaw Sentinel</b><small>Line fractures across the chamber</small></span><span><b>The Bound Choir</b><small>Large resonance zones</small></span></div></main><aside><small>ACTIVE FIVE · PARTY ILVL '+ilvl()+'</small>'+party().map(c=>'<div><i class="'+role(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span></div>').join('')+'<button data-start>BEGIN DESCENT →</button></aside></div></section>';
 r.querySelector('[data-close]').onclick=close;r.querySelector('[data-start]').onclick=start;
}
function openDungeon(){Game=window.CellboundGame;if(!Game?.ready)return;db=Game.getSupabase?.();briefing()}
function close(){token++;run=null;document.body.classList.remove('hs2d-open');const r=root();r.hidden=true;Game?.switchView?.('content');renderCard()}
function hpNeed(level){return 800+Math.max(0,(Number(level)||1)-1)*250}
function awardXp(){
 return party().map(c=>{const beforeLevel=Math.max(1,Number(c.level)||1),beforeXp=Math.max(0,Number(c.xp)||0),beforeNeed=hpNeed(beforeLevel);let level=beforeLevel,xp=beforeXp+XP,levels=0;while(xp>=hpNeed(level)){xp-=hpNeed(level);level++;levels++}c.level=level;c.xp=xp;if(levels){c.talent=(Number(c.talent)||0)+levels;c.power=(Number(c.power)||1)+levels*2}return{name:c.name,beforeLevel,beforeXp,beforeNeed,afterLevel:level,afterXp:xp,afterNeed:hpNeed(level),levels}})
}
async function syncXp(gains){
 if(!db)return;const user=Game.getUser?.();if(!user)return;try{await Promise.all(gains.map(x=>db.from('characters').update({level:x.afterLevel,xp:x.afterXp,last_played_at:new Date().toISOString()}).eq('user_id',user.id).eq('name',x.name)))}catch(e){console.warn('Hollow XP sync failed',e)}
}
function setStatus(text){const e=$('#hs2dStatus');if(e)e.textContent=text}
function feed(text){if(!run)return;run.log.push(text);const e=$('#hs2dFeed');if(e)e.innerHTML=run.log.slice(-7).reverse().map(x=>'<p>'+esc(x)+'</p>').join('')}
function addUnit(id,label,cls,x,y,big=false){const e=document.createElement('div');e.className='hs2d-unit '+cls+(big?' big':'');e.dataset.hs=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span><em><i></i></em>';$('#hs2dUnits').appendChild(e)}
function move(id,x,y,ms=550){const e=$('[data-hs="'+id+'"]');if(!e)return;e.style.transitionDuration=ms+'ms';e.style.left=x+'%';e.style.top=y+'%'}
function projectile(id,target='enemy'){const a=$('[data-hs="'+id+'"]'),arena=$('#hs2dArena'),fx=$('#hs2dFx');if(!a||!arena||!fx)return;const ar=arena.getBoundingClientRect(),r=a.getBoundingClientRect(),t=target==='enemy'?$('#hs2dUnits .enemy:not(.dead)'):null;if(!t)return;const tr=t.getBoundingClientRect(),p=document.createElement('i');p.className='hs2d-shot';p.style.left=(r.left+r.width/2-ar.left)+'px';p.style.top=(r.top+r.height/2-ar.top)+'px';p.style.setProperty('--dx',(tr.left+tr.width/2-r.left-r.width/2)+'px');p.style.setProperty('--dy',(tr.top+tr.height/2-r.top-r.height/2)+'px');fx.appendChild(p);setTimeout(()=>p.remove(),520)}
function telegraph(type,label){const layer=$('#hs2dTelegraphs');if(!layer)return;const e=document.createElement('div');e.className='hs2d-tele '+type;e.innerHTML='<span>'+esc(label)+'</span>';layer.appendChild(e);setTimeout(()=>e.classList.add('impact'),900);setTimeout(()=>e.remove(),1450)}
function stageEnvironment(s){const arena=$('#hs2dArena');arena.className='hs2d-arena stage-'+s.id;$('#hs2dRoom').innerHTML='<b>'+esc(s.title)+'</b><small>'+(s.id==='gallery'?'Cell glass whispers through the walls.':s.id==='sentinel'?'A guardian made of glass and bone blocks the descent.':'Several voices are speaking from one body.')+'</small>'}
function spawnStage(s){
 stageEnvironment(s);$('#hs2dUnits').innerHTML='';$('#hs2dTelegraphs').innerHTML='';$('#hs2dFx').innerHTML='';
 const p=party(),melee=p.filter(c=>role(c)!=='healer'&&!['Hunter','Mage','Priest'].includes(c.class));
 p.forEach((c,i)=>{const r=role(c);addUnit('p'+i,c.name,'party '+r,7,30+i*10);let x=r==='tank'?34:r==='healer'?19:(['Hunter','Mage','Priest'].includes(c.class)?22:29),y=31+i*9;setTimeout(()=>move('p'+i,x,y,750),40)});
 s.enemies.forEach((n,i)=>{const big=s.enemies.length===1;addUnit('e'+i,n,'enemy',93,big?50:33+i*17,big);setTimeout(()=>move('e'+i,68,big?50:33+i*17,750),80)})
}
async function fightStage(s,tok,index){
 spawnStage(s);setStatus('Entering '+s.title+'…');feed('The party enters '+s.title+'.');await wait(1000);if(tok!==token)return false;
 setStatus('Establishing formation…');party().forEach((c,i)=>{if(role(c)==='tank')move('p'+i,48,50,550)});await wait(700);
 for(let wave=0;wave<3;wave++){
   if(tok!==token)return false;
   setStatus(wave===1?s.mechanic:'The party is attacking.');
   party().forEach((c,i)=>{const el=$('[data-hs="p'+i+'"]');if(el){el.classList.add('attack');setTimeout(()=>el.classList.remove('attack'),300)}if(['Hunter','Mage','Priest'].includes(c.class)||role(c)==='healer')projectile('p'+i)});
   if(wave===1){telegraph(index===1?'line':'circle',s.mechanic);feed(s.enemies[0]+' begins '+s.mechanic+'.');$$('#hs2dUnits .party').forEach((e,i)=>{if(i%2)move(e.dataset.hs,parseFloat(e.style.left)+(index===1?-7:5),parseFloat(e.style.top)+(i%3-1)*9,450)});}
   await wait(1250);
   const live=$$('#hs2dUnits .enemy:not(.dead)');if(live.length){const victim=live[0];victim.querySelector('em i').style.width=(66-wave*33)+'%';}
 }
 const live=$$('#hs2dUnits .enemy:not(.dead)');live.forEach((e,i)=>setTimeout(()=>e.classList.add('dead'),i*120));feed(s.title+' is clear.');setStatus('Path clear.');await wait(850);return true;
}
function draw(){
 const s=STAGES[run.stage],r=root();r.hidden=false;
 r.innerHTML='<section class="hs2d-shell"><header><div><small>THE HOLLOW SANCTUM · LIVE 2D DUNGEON</small><h2 id="hs2dTitle">'+esc(s.title)+'</h2></div><div class="hs2d-live"><i></i>LIVE <button data-close>×</button></div></header><div class="hs2d-route">'+STAGES.map((x,i)=>'<span class="'+(i<run.stage?'done':i===run.stage?'current':'')+'"><i>'+(i+1)+'</i>'+esc(x.title)+'</span>').join('')+'</div><div class="hs2d-layout"><main><div class="hs2d-arena" id="hs2dArena"><div class="hs2d-floor"></div><div class="hs2d-crystals"><i></i><i></i><i></i><i></i><i></i></div><div id="hs2dTelegraphs"></div><div id="hs2dUnits"></div><div id="hs2dFx"></div><div class="hs2d-room" id="hs2dRoom"></div><div class="hs2d-caption"><span>EXPEDITION</span><b id="hs2dStatus">Descending…</b></div></div><div class="hs2d-feed" id="hs2dFeed"></div></main><aside><small>ACTIVE FIVE · PARTY ILVL '+ilvl()+'</small>'+party().map(c=>'<div class="hs2d-member"><i class="'+role(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span></div>').join('')+'<div class="hs2d-loot-intel"><small>KNOWN REWARDS</small><b>Void Crystal</b><span>'+(!firstCleared()?'Blackglass Resonator · first clear':'Unique Relic already recovered')+'</span></div></aside></div><div id="hs2dEnd" class="hs2d-end" hidden></div></section>';
 r.querySelector('[data-close]').onclick=()=>{if(run&&!run.done&&!confirm('Leave The Hollow Sanctum?'))return;close()}
}
async function start(){
 token++;const tok=token;run={stage:0,done:false,log:[]};draw();
 for(let i=0;i<STAGES.length;i++){if(tok!==token)return;run.stage=i;const s=STAGES[i];$('#hs2dTitle').textContent=s.title;$('.hs2d-route').innerHTML=STAGES.map((x,j)=>'<span class="'+(j<i?'done':j===i?'current':'')+'"><i>'+(j+1)+'</i>'+esc(x.title)+'</span>').join('');if(!await fightStage(s,tok,i))return}
 if(tok!==token)return;await complete();
}
async function complete(){
 const s=state(),q=qstate(),first=!q.flags.hollowFirstClear,gains=awardXp();s.gold=(Number(s.gold)||0)+220;s.renown=(Number(s.renown)||0)+100;Game.addMaterial?.('void-crystal',first?2:1);q.flags.hollowFirstClear=true;q.hollowCompletions=(Number(q.hollowCompletions)||0)+1;
 if(first)Game.addBankItem?.({...RELIC,source:'The Bound Choir · First Clear'});
 s.activity.push('The Hollow Sanctum cleared. Each adventurer earned '+XP+' XP.'+(first?' Blackglass Resonator added to the Guild Bank.':''));
 Game.save?.();await Game.persistState?.();await syncXp(gains);run.done=true;window.dispatchEvent(new CustomEvent('cellbound:hollow-complete',{detail:{firstClear:first}}));
 const end=$('#hs2dEnd');end.hidden=false;end.innerHTML='<section class="hs2d-rewards"><small>DUNGEON COMPLETE</small><h2>The Hollow Sanctum</h2><p>The voices beneath Zeltira have fallen silent — for now.</p><div class="hs2d-reward-grid"><article><span>GOLD</span><b>+220</b></article><article><span>RENOWN</span><b>+100</b></article><article><span>PARTY XP</span><b>+'+XP+'</b></article><article><span>VOID CRYSTAL</span><b>+'+(first?2:1)+'</b></article></div>'+(first?'<div class="hs2d-first-relic"><div>'+window.CellboundGear.artHTML(RELIC,76)+'</div><span><small>FIRST-CLEAR RELIC</small><h3>Blackglass Resonator</h3><p>Rare · Relic · Item Level 30 · +10 Power</p><em>Sent to the Guild Bank</em></span></div>':'')+'<div class="hs2d-xp-list">'+gains.map(x=>'<div><span><b>'+esc(x.name)+'</b><small>Level '+x.beforeLevel+(x.afterLevel!==x.beforeLevel?' → '+x.afterLevel:'')+'</small></span><strong>+'+XP+' XP</strong></div>').join('')+'</div><button data-return>RETURN TO DUNGEON JOURNAL →</button></section>';
 end.querySelector('[data-return]').onclick=()=>{close();Game.renderAll?.();renderCard()}
}
function init(){Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}db=Game.getSupabase?.();renderCard();document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',renderCard);window.CellboundHollowSanctum={open:openDungeon,renderCard,relic:RELIC}}
init();
})();