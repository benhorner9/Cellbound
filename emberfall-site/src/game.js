import {WORLD, ABILITIES, createEncounter, startEncounter, updateEncounter, commandMove, commandTarget, castAbility, getHero, getUnit, drainEvents} from './engine.js?v=4.0.0';
import {readProfile,writeProfile,grantVictory,recordDefeat,ITEM_DEFS,xpNeeded,BOSSES,bossInfo,canChallenge,atRecommendedLevel} from './progression.js?v=4.0.0';
import {mountWorkshop} from './workshop.js?v=4.0.0';

const $=id=>document.getElementById(id);
const canvas=$('arena'),ctx=canvas.getContext('2d',{alpha:false});
const bg=document.createElement('canvas');bg.width=WORLD.width;bg.height=WORLD.height;
const bgc=bg.getContext('2d');
const TAU=Math.PI*2;
let storage=null;try{storage=window.localStorage;}catch{}
const company=readProfile(storage);
const SELECTED_BOSS_KEY='emberfall-selected-boss-v1';
let fightSerial=0,bossSelection='thornwarden';
try{
 const stored=storage?.getItem(SELECTED_BOSS_KEY);
 if(stored&&Object.hasOwn(BOSSES,stored))bossSelection=stored;
}catch{}
function newBattle(id=bossSelection){
 const serial=++fightSerial;
 const fight=createEncounter(((Date.now()>>>0)+serial)||1337,company,id);
 fight.receiptId='fight-'+Date.now().toString(36)+'-'+serial+'-'+Math.random().toString(36).slice(2,9);
 return fight;
}
let state=newBattle(),selected='knight',paused=false,sound=false,last=0,uiLast=0;
let rewardCommitted=false,workshopWasPaused=false;
let floaters=[],bursts=[],projectiles=[],markers=[],noticeUntil=0,noticeText='',startPoint=null;
let audioCtx=null;
const heroColors={knight:'#8cb6c0',ranger:'#94bd79',mage:'#c2a4e9',cleric:'#f4d28c'};
const safe=(x,a,b)=>Math.min(b,Math.max(a,x));
function randomDecor(){let seed=81911;return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
const decorRand=randomDecor();
function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();}
function strokeEllipse(c,x,y,rx,ry,color,width=2){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function line(c,coords,color,width=2){c.beginPath();c.moveTo(coords[0],coords[1]);for(let i=2;i<coords.length;i+=2)c.lineTo(coords[i],coords[i+1]);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function poly(c,coords,color,stroke='#24372f',width=2){c.beginPath();c.moveTo(coords[0],coords[1]);for(let i=2;i<coords.length;i+=2)c.lineTo(coords[i],coords[i+1]);c.closePath();c.fillStyle=color;c.fill();if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();}}
function makeBackground(){
 const c=bgc,w=WORLD.width,h=WORLD.height;
 const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#7eae85');g.addColorStop(.5,'#9cba83');g.addColorStop(1,'#608f75');c.fillStyle=g;c.fillRect(0,0,w,h);
 // Soft banks, a worn stone ring and warm woodland clearings.
 for(let i=0;i<35;i++){const x=decorRand()*w,y=decorRand()*h;ellipse(c,x,y,28+decorRand()*125,17+decorRand()*55,'#a8be86'+(i%2?'35':'22'));}
 c.save();c.translate(626,325);c.rotate(-.045);
 ellipse(c,0,9,475,255,'#284d4490');ellipse(c,0,0,471,246,'#7f9b77');
 strokeEllipse(c,0,0,465,242,'#cad0a1',8);strokeEllipse(c,0,0,447,224,'#536f5d',5);
 ellipse(c,0,0,412,209,'#9bb593');strokeEllipse(c,0,0,402,199,'#75967e',2);
 // Irregular cobbles across the clearing.
 for(let i=0;i<105;i++){const t=decorRand()*TAU,r=Math.sqrt(decorRand());const x=Math.cos(t)*r*392,y=Math.sin(t)*r*193;const q=decorRand()*TAU; c.save();c.translate(x,y);c.rotate(q);c.fillStyle=i%3===0?'#d5d0ae55':i%3===1?'#4f75604c':'#efe4b42b';c.beginPath();c.ellipse(0,0,4+decorRand()*12,3+decorRand()*7,0,0,TAU);c.fill();c.restore();}
 c.restore();
 // Moss, flowers and low grasses at arena edges.
 for(let i=0;i<425;i++){const x=decorRand()*w,y=decorRand()*h;
  if(((x-615)/445)**2+((y-315)/225)**2<.92)continue;
  const s=1+decorRand()*3;
  line(c,[x,y+3,x-3*s,y-4*s],'#497b57a4',1.5);
  line(c,[x,y+3,x+3*s,y-3*s],'#3d7455a1',1.5);
  if(i%7===0){ellipse(c,x,y,2.5,2.5,i%2?'#eedc91':'#fff0bd');}
 }
 const rocks=[[57,76,1.5],[348,53,1.0],[1065,80,1.3],[1131,497,1.4],[302,584,1],[792,577,1.2],[100,523,.8]];
 for(const [x,y,k] of rocks)drawRock(c,x,y,k);
 const trees=[[-3,18,1.45],[155,17,1.1],[1095,1,1.2],[1202,115,1.5],[-21,388,1.2],[1190,600,1.35],[455,629,.9]];
 for(const [x,y,k] of trees)drawTree(c,x,y,k);
 // Deep forest ambience and a vignette, without relying on external artwork.
 const dark=c.createRadialGradient(610,300,210,610,300,770);dark.addColorStop(0,'#19362800');dark.addColorStop(1,'#10292362');c.fillStyle=dark;c.fillRect(0,0,w,h);
}
function drawRock(c,x,y,k){c.save();c.translate(x,y);c.scale(k,k);
 ellipse(c,0,7,42,16,'#29473866');poly(c,[-43,6,-27,-24,5,-34,39,-13,43,7,11,19,-30,18],'#738877','#385d50',3);
 poly(c,[-27,-24,5,-34,23,-12,-8,-7],'#bdbea1',null);poly(c,[23,-12,39,-13,43,7,11,19,-8,-7],'#6a7b70',null);
 c.restore();}
function drawTree(c,x,y,k){c.save();c.translate(x,y);c.scale(k,k);
 ellipse(c,0,6,72,20,'#1d4a3677');poly(c,[-13,12,-18,-60,15,-63,14,11],'#70593f','#3c4e38',4);
 ellipse(c,-24,-57,55,44,'#315e49');ellipse(c,20,-85,59,49,'#376e4d');ellipse(c,-12,-100,61,49,'#427e55');
 ellipse(c,-29,-102,28,19,'#76a67475');ellipse(c,22,-112,26,17,'#87af7c6b');
 c.restore();}
function resize(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
 const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 ctx.setTransform(w/WORLD.width,0,0,h/WORLD.height,0,0);
}
function screenPoint(e){
 const r=canvas.getBoundingClientRect();
 return {x:safe((e.clientX-r.left)/r.width*WORLD.width,0,WORLD.width),y:safe((e.clientY-r.top)/r.height*WORLD.height,0,WORLD.height)};
}
function actorAt(p){
 const all=[...state.heroes,...state.enemies].filter(u=>u.hp>0);
 let best=null,d=Infinity;
 for(const u of all){const radius=u.id==='boss'?73:44,dd=Math.hypot(u.x-p.x,(u.y-31)-p.y);
  if(dd<radius&&dd<d){d=dd;best=u;}
 }return best;
}
function selectHero(id){const h=getHero(state,id);if(!h||h.hp<=0)return;selected=id;state.selected=id;syncUI(true);}
function issueFromPoint(p,origin){
 if(state.phase!=='playing'||paused)return;
 const hit=actorAt(p);
 if(origin){selectHero(origin.id);if(hit?.faction==='enemy'){commandTarget(state,origin.id,hit.id);marker(hit.x,hit.y,'target');}
 else if(hit?.faction!=='ally'){commandMove(state,origin.id,p.x,p.y);marker(p.x,p.y,'move');}
 syncUI(true);
 return;}
 if(hit?.faction==='ally')selectHero(hit.id);
 else if(hit?.faction==='enemy'){commandTarget(state,selected,hit.id);marker(hit.x,hit.y,'target');}
 else{commandMove(state,selected,p.x,p.y);marker(p.x,p.y,'move');}
}
canvas.addEventListener('pointerdown',e=>{
 if(state.phase!=='playing'||paused)return;
 const p=screenPoint(e);const hit=actorAt(p);
 startPoint={p,hit:hit?.faction==='ally'?hit:null,pointerId:e.pointerId};
 canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointerup',e=>{
 if(!startPoint)return;
 const start=startPoint;startPoint=null;
 if(start.pointerId!==e.pointerId)return;
 const p=screenPoint(e),drag=Math.hypot(p.x-start.p.x,p.y-start.p.y)>22;
 if(drag&&start.hit)issueFromPoint(p,start.hit);
 else issueFromPoint(p,null);
});
canvas.addEventListener('pointercancel',()=>{startPoint=null;});
for(const card of document.querySelectorAll('[data-hero]'))card.addEventListener('click',()=>selectHero(card.dataset.hero));
function useSlot(slot){
 if(paused||state.phase!=='playing')return;
 if(castAbility(state,selected,slot)){syncUI(true);playSound(540+slot*190,.09);return;}
 const hero=getHero(state,selected);
 if(hero?.cooldowns[slot]>0)announce('Ability recharging: '+Math.ceil(hero.cooldowns[slot])+'s',1.3);
 else announce('Move into range or choose a target first',1.3);
}
for(const btn of document.querySelectorAll('#abilities [data-slot]'))btn.addEventListener('click',()=>useSlot(Number(btn.dataset.slot)));
// The overlay is rebuilt between expeditions, so delegate all its buttons.
$('overlayContent').addEventListener('click',e=>{
 const choice=e.target.closest('[data-boss]');
 if(choice){
  const id=choice.dataset.boss;
  if(canChallenge(company,id))selectBoss(id);
  return;
 }
 if(e.target.closest('#startBtn'))start();
 if(e.target.closest('#againBtn'))restart();
 if(e.target.closest('#inspectBtn'))workshop.open(state.phase==='victory'?'pack':'heroes',selected);
 if(e.target.closest('#chooseBossBtn'))returnToCamp();
 if(e.target.closest('#manageFromPickerBtn'))workshop.open('heroes',selected);
 if(e.target.closest('#bagFromPickerBtn'))workshop.open('pack',selected);
});
$('restartBtn').addEventListener('click',()=>restart());
$('pauseBtn').addEventListener('click',()=>{if(state.phase!=='playing')return;paused=!paused;syncUI(true);announce(paused?'Encounter paused':'Back to battle!',1.2);});
$('muteBtn').addEventListener('click',()=>{
 sound=!sound;$('muteBtn').textContent=sound?'♫':'♪̸';
 $('muteBtn').setAttribute('aria-label',sound?'Mute sounds':'Enable sounds');
 if(sound)playSound(600,.12);
});
window.addEventListener('keydown',e=>{
 if(e.target?.tagName==='INPUT'||e.target?.tagName==='TEXTAREA')return;
 if(e.key==='1'||e.key==='2'){useSlot(Number(e.key)-1);e.preventDefault();}
 if(e.code==='Space'){if(state.phase==='playing'){$('pauseBtn').click();e.preventDefault();}}
 if('qwer'.includes(e.key.toLowerCase())&&e.key.length===1){const i='qwer'.indexOf(e.key.toLowerCase());selectHero(state.heroes[i].id);}
});
window.addEventListener('resize',resize,{passive:true});
function selectBoss(id){
 if(!canChallenge(company,id))return false;
 bossSelection=id;
 try{storage?.setItem(SELECTED_BOSS_KEY,id);}catch{}
 state=newBattle(id);
 // Update the actual combat HUD, not only the menu card, so the chosen encounter
 // and the fight started from it always agree.
 renderEncounterChoices();
 syncUI(true);
 return true;
}
function renderEncounterChoices(){
 const boss=bossInfo(bossSelection),recommended=atRecommendedLevel(company,bossSelection);
 const options=Object.values(BOSSES).map(b=>{
  const active=b.id===bossSelection,ready=atRecommendedLevel(company,b.id);
  return '<button type="button" class="encounter-choice '+(active?'current ':'')+'" data-boss="'+b.id+'" aria-pressed="'+active+'"><span class="encounter-icon">'+b.icon+'</span><span class="encounter-main"><b>'+b.name+'</b><small>'+b.place+'</small><small class="encounter-unlock">'+(ready?'✓ Party ready · recommended Lv '+b.unlock:'⚠ Recommended party level '+b.unlock+' · You can still fight')+'</small></span><span class="encounter-check">'+(active?'✓':'›')+'</span></button>';
 }).join('');
 $('overlay').classList.add('choose-mode');
 $('overlay').classList.remove('result-mode');
 $('overlay').setAttribute('role','dialog');
 $('overlay').setAttribute('aria-label','Choose your boss expedition');
 $('overlayContent').innerHTML='<div class="overlay-emblem">✦</div><span class="eyebrow">BLOCK 03 · THREE BOSSES TO MASTER</span><h1>Choose Your Expedition</h1><p>Tap any boss to change your next battle. Every boss is playable now, even below its recommended level.</p><div class="encounter-choices" id="encounterList">'+options+'</div><p class="encounter-warning"><b>'+boss.name+':</b> '+boss.mechanics+'</p>'+(recommended?'':'<p class="unlock-message" role="status">⚠ '+boss.name+' is recommended for a level '+boss.unlock+' party. Your heroes can attempt it now, but the battle may be challenging.</p>')+'<button id="startBtn" class="primary-btn large" type="button">Fight '+boss.name+' →</button><p class="encounter-controls">Selected battle: <b id="selectedBossName">'+boss.name+'</b>. Tap Fight to enter that exact boss encounter. Boss selection is remembered on this device.</p><div class="picker-actions"><button class="quiet-btn" id="manageFromPickerBtn" type="button">✦ Heroes &amp; Talents</button><button class="quiet-btn" id="bagFromPickerBtn" type="button">🎒 Equipment Bag</button></div>';
}
function returnToCamp(){
 paused=false;rewardCommitted=false;selected='knight';state=newBattle();
 floaters=[];bursts=[];projectiles=[];markers=[];
 $('overlay').classList.remove('hidden');$('pauseBtn').disabled=true;
 renderEncounterChoices();syncUI(true);
 $('overlayContent').focus();
}
function start(){
 if(state.phase==='ready'&&canChallenge(company,bossSelection)){
  // Recreate for newly equipped items, but explicitly pin to the selected boss.
  state=newBattle(bossSelection);rewardCommitted=false;startEncounter(state);
  $('overlay').classList.remove('choose-mode','result-mode');
  $('overlay').classList.add('hidden');$('pauseBtn').disabled=false;syncUI(true);
 }
}
function restart(){
 state=newBattle(bossSelection);rewardCommitted=false;selected='knight';paused=false;
 floaters=[];bursts=[];projectiles=[];markers=[];noticeUntil=0;startEncounter(state);
 $('overlay').classList.remove('choose-mode','result-mode');
 $('overlay').classList.add('hidden');$('pauseBtn').disabled=false;syncUI(true);
}
function announce(text,seconds=2.1){
 noticeText=text;noticeUntil=performance.now()+seconds*1000;$('announcement').textContent=text;$('announcement').classList.add('show');
}
function marker(x,y,type){markers.push({x,y,type,age:0,ttl:.7});}
function onEvent(e){
 if(e.type==='damage'){
  floaters.push({x:e.x+(Math.random()-.5)*22,y:e.y,age:0,ttl:.86,text:e.value?'-'+e.value:e.shielded?'BLOCK':'0',color:e.value?'#ffedd0':'#b9deef'});
  bursts.push({x:e.x,y:e.y+32,age:0,ttl:.24,radius:30,color:e.kind==='fire'?'#ffae67':e.kind==='frost'?'#b8eaff':'#fff2ca'});
  if(e.value>15)playSound(165+Math.random()*60,.035);
 }else if(e.type==='heal'){floaters.push({x:e.x,y:e.y,age:0,ttl:1.05,text:'+'+e.value,color:'#9effb7'});playSound(490,.05);}
 else if(e.type==='projectile')projectiles.push({...e,age:0,ttl:e.kind==='arrow'?.26:.38});
 else if(e.type==='burst')bursts.push({...e,age:0,ttl:.65});
 else if(e.type==='shield')bursts.push({x:e.x,y:e.y-23,radius:65,color:'#cae1ae',age:0,ttl:.65});
 else if(e.type==='focus'||e.type==='move'){} 
 else if(e.type==='notice')announce(e.text,e.text.includes('SLAM')?2.5:2.2);
 else if(e.type==='ability')floaters.push({x:e.x,y:e.y-70,age:0,ttl:1.1,text:e.name.toUpperCase(),color:'#ffe6a8',small:true});
 else if(e.type==='death'&&e.id==='boss')playSound(145,.4);
}
function playSound(freq,duration){
 if(!sound)return;
 try{
  audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
  osc.type='triangle';osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.7),now+duration);
  gain.gain.setValueAtTime(.032,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+duration);
 }catch{}
}
function tickFx(dt){
 for(const set of [floaters,bursts,projectiles,markers]){
  for(let i=set.length-1;i>=0;i--){set[i].age+=dt;if(set[i].age>set[i].ttl)set.splice(i,1);}
 }
}
function label(c,text,x,y,size=11,color='#f7e8c9'){
 c.fillStyle=color;c.font='700 '+size+'px Trebuchet MS, sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#172c26';c.strokeText(text,x,y);c.fillText(text,x,y);
}
function renderGround(){
 ctx.drawImage(bg,0,0);
 if(state.bossId!=='thornwarden'){
  ctx.fillStyle=state.bossId==='cindermaw'?'#a44f2155':'#263c8362';
  ctx.fillRect(0,0,WORLD.width,WORLD.height);
 }
 // Animated fireflies and light mist keep the flat illustrated arena alive.
 for(let i=0;i<18;i++){
  const a=i*42.5,x=((i*173+state.time*8)%1220)-10,y=30+(i*79%570);
  const alpha=.16+.13*Math.sin(state.time*1.5+i);
  ellipse(ctx,x,y,2.4,2.4,'rgba(255,242,166,'+alpha+')');
 }
 // soft stage glows
 const glow=ctx.createRadialGradient(670,270,10,670,270,290);
 glow.addColorStop(0,'#fff3bc19');glow.addColorStop(1,'#fff3bc00');ctx.fillStyle=glow;ctx.fillRect(320,0,700,620);
}
function drawHealth(u,x,y,w){
 const pct=safe(u.hp/u.maxHp,0,1);
 ctx.fillStyle='#122926db';ctx.fillRect(x-w/2,y,w,8);
 ctx.fillStyle=u.faction==='enemy'?'#bc6153':'#80c97b';ctx.fillRect(x-w/2+1,y+1,(w-2)*pct,6);
 if(u.shield>0){ctx.fillStyle='#9bcde2';ctx.fillRect(x-w/2,y-2,w*Math.min(1,u.shield/u.maxHp),2);}
 ctx.strokeStyle='#223f32';ctx.lineWidth=1.3;ctx.strokeRect(x-w/2,y,w,8);
}
function drawHuman(c,u){
 c.save();c.translate(u.x,u.y);
 const bob=Math.sin(state.time*4+u.x*.013)*(u.hp>0?1.8:0);
 const color=heroColors[u.id];const isDown=u.hp<=0;
 if(isDown){c.globalAlpha=.46;c.translate(0,7);}
 ellipse(c,0,-3,26,11,'#1b3d316e');
 c.translate(0,bob-10);c.scale(u.face,1);
 // soft cape that animates slightly with movement
 const wave=Math.sin(state.time*5+u.y*.015)*3;
 poly(c,[-17,-30,14,-30,22+wave,1,0,9,-22-wave,0],
  u.id==='knight'?'#416d91':u.id==='ranger'?'#4f6b3c':u.id==='mage'?'#7459a7':'#c3a665','#274235',3);
 // little boots and trouser legs
 poly(c,[-14,-5,-4,-5,-3,5,-18,6],'#3d3e3b','#253630',2);
 poly(c,[4,-5,14,-5,16,6,2,5],'#3d3e3b','#253630',2);
 // tunic/armor
 poly(c,[-17,-37,17,-37,16,-7,-17,-7],
  u.id==='knight'?'#849ca6':u.id==='ranger'?'#608a62':u.id==='mage'?'#846ab3':'#e8d18d','#283d3e',3);
 poly(c,[-12,-35,0,-31,13,-35,10,-25,-10,-25],u.id==='knight'?'#d8e5d8':u.id==='ranger'?'#c5ca80':u.id==='mage'?'#d3b6e9':'#fff0c2',null);
 // right arm + unique weapon
 line(c,[14,-31,21,-24,25,-16],u.id==='knight'?'#afbbc1':'#d5ae7e',8);
 if(u.id==='knight'){
  // shield and sword
  poly(c,[-27,-30,-9,-33,-7,-9,-18,-1,-29,-11],'#6c9bb1','#273e46',3);
  poly(c,[-20,-29,-16,-27,-16,-12,-20,-8,-24,-12,-24,-27],'#f2d896',null);
  line(c,[27,-22,35,-48],'#e1d6c8',5);line(c,[21,-25,34,-27],'#c69a5f',5);
 }else if(u.id==='ranger'){
  c.beginPath();c.arc(30,-28,18,-1.2,1.2);c.strokeStyle='#d9a96d';c.lineWidth=4;c.stroke();
  line(c,[36,-47,36,-9],'#e8ddbd',2);
  line(c,[14,-24,40,-30],'#b7d49a',3);
 }else if(u.id==='mage'){
  line(c,[27,-22,31,-61],'#71553e',5);ellipse(c,31,-63,10,11,'#e1b7fd');
  ellipse(c,31,-63,4,5,'#fff0c3');
 }else{
  line(c,[26,-20,32,-56],'#a77d52',5);ellipse(c,32,-59,10,10,'#f3df9b');
  line(c,[26,-59,38,-59],'#fff5cb',3);line(c,[32,-65,32,-53],'#fff5cb',3);
 }
 // face, ears, hair, hats (all original vector work)
 ellipse(c,0,-49,15,17,'#e9bd91');
 ellipse(c,-13,-47,4,6,'#d7a680');ellipse(c,13,-47,4,6,'#d7a680');
 if(u.id==='knight'){
  poly(c,[-20,-53,-15,-67,0,-74,16,-67,20,-53,17,-48,-17,-48],'#a4bdc4','#344b58',3);
  poly(c,[-15,-55,0,-67,15,-55,14,-50,-14,-50],'#d2e1de',null);
 }else if(u.id==='ranger'){
  poly(c,[-21,-49,-17,-71,0,-79,18,-66,20,-50,13,-56,-14,-56],'#496d48','#29473d',3);
  line(c,[-19,-56,19,-56],'#b8d38c',3);
 }else if(u.id==='mage'){
  poly(c,[-22,-53,-15,-74,3,-94,12,-71,19,-56],'#62498e','#372957',3);
  poly(c,[-19,-57,19,-57,23,-51,-22,-51],'#956fb7','#3c3259',2);
  ellipse(c,4,-76,3,3,'#e7d0a4');
 }else{
  poly(c,[-19,-53,-15,-67,0,-76,17,-65,18,-52],'#e1cf93','#9b7846',2);
  poly(c,[-15,-62,0,-74,14,-61],'#f4e3ad',null);
 }
 ellipse(c,-5,-48,2,2.8,'#243337');ellipse(c,6,-48,2,2.8,'#243337');
 line(c,[-4,-40,5,-40],'#9f684c',1.4);
 if(u.attackFlash>0){ellipse(c,28,-32,15+u.attackFlash*36,12+u.attackFlash*28,'#fff4ba77');}
 if(u.shield>0)strokeEllipse(c,0,-33,27,43,'#a9dce1b6',3);
 if(u.hit>0){c.globalAlpha=.5*u.hit/.24;ellipse(c,0,-38,24,36,'#fff6e9');}
 c.restore();
 if(u.hp>0){
  if(selected===u.id){strokeEllipse(c,u.x,u.y-4,37,17,'#ffe49b',3.5);strokeEllipse(c,u.x,u.y-4,31,14,'#ffffff88',1.5);}
  drawHealth(u,u.x,u.y-102,60);label(c,u.name+' · Lv'+(u.level||1),u.x,u.y-110,12,'#fff7d7');
 }else label(c,'DOWN',u.x,u.y-85,12,'#ecb0a2');
}
function drawBramble(c,u){
 c.save();c.translate(u.x,u.y);ellipse(c,0,1,27,10,'#1b3d3070');
 if(u.hp===0)c.globalAlpha=.28;
 const wobble=Math.sin(state.time*5+u.x*.01)*2;
 if(u.role!=='Bramble'){c.translate(0,Math.sin(state.time*5+u.x)*3);c.shadowColor=u.role==='Imp'?'#f79244':'#91ceff';c.shadowBlur=24;}
 poly(c,[-17,-8,-24,-38,-6,-47,16,-40,21,-7],'#6b7e3c','#324b34',3);
 poly(c,[-23,-33,-27,-60,-6,-45,3,-69,10,-42,23,-60,18,-29],'#9cb56d','#394c36',3);
 ellipse(c,0,-30+wobble,17,23,'#8da46b');ellipse(c,-6,-34,4,5,'#cbe0a0');ellipse(c,9,-34,4,5,'#cbe0a0');
 line(c,[-12,-9,-21,0],'#4d573a',5);line(c,[13,-8,22,0],'#4d573a',5);
 if(u.role!=='Bramble')ellipse(c,0,-29,12,12,u.role==='Imp'?'#ef8d42':'#9bd8ff');
 c.restore();
 if(u.hp>0){drawHealth(u,u.x,u.y-77,52);label(c,u.name.toUpperCase(),u.x,u.y-83,10,'#f5dfbe');}
}
function drawVariantBoss(c,u){
 const fire=state.bossId==='cindermaw';
 c.save();c.translate(u.x,u.y);
 const wobble=Math.sin(state.time*3)*3;
 ellipse(c,0,-2,90,24,'#192d36aa');
 if(u.hp<=0)c.globalAlpha=.33;
 c.translate(0,wobble);
 // Two truly different, original 2D silhouettes: a horned furnace and a winged lightning construct.
 const base=fire?'#4b4140':'#4b6182',mid=fire?'#bd5e37':'#7894ca',light=fire?'#ffbc62':'#d2e9ff';
 if(fire){
  poly(c,[-47,-25,-71,-6,-66,17,-38,8,-23,-26,29,-26,53,8,76,16,71,-6,42,-25],base,'#241f22',6);
  poly(c,[-50,-31,-64,-110,-34,-132,-9,-114,29,-128,60,-102,48,-30,26,-13,-29,-13],mid,'#302b2e',6);
  poly(c,[-43,-114,-67,-170,-44,-156,-21,-133],light,'#422d29',4);
  poly(c,[38,-117,68,-170,57,-143,25,-131],light,'#422d29',4);
  poly(c,[-30,-100,1,-120,32,-94,25,-54,0,-38,-26,-55],base,'#2c262b',3);
  ellipse(c,0,-75,19,27,'#e67439');ellipse(c,0,-75,10+Math.sin(state.time*7)*2,18,'#ffd27c');
  ellipse(c,-19,-114,9,6,'#ffe49b');ellipse(c,19,-114,9,6,'#ffe49b');
  line(c,[-57,-85,-79,-47,-89,-11],'#584541',16);line(c,[56,-86,78,-51,92,-12],'#584541',16);
  ellipse(c,92,-12,21,15,'#d97543');ellipse(c,-89,-11,21,15,'#d97543');
 }else{
  for(const sign of [-1,1]){
   poly(c,[sign*22,-88,sign*58,-149,sign*102,-175,sign*82,-110,sign*121,-106,sign*49,-50],mid,'#283a67',4);
   poly(c,[sign*58,-149,sign*102,-175,sign*82,-110,sign*49,-50],light,null);
  }
  poly(c,[-38,-21,-50,-82,-19,-124,17,-133,50,-84,41,-20,0,-5],base,'#263a68',5);
  poly(c,[-26,-95,0,-113,25,-96,22,-51,0,-28,-24,-51],mid,'#263a68',3);
  ellipse(c,0,-70,18,24,'#6fbbfc');ellipse(c,0,-70,9,15,light);
  poly(c,[-31,-119,-22,-161,0,-145,19,-159,30,-115],light,'#37578c',4);
  ellipse(c,-15,-114,7,5,'#e4f7ff');ellipse(c,16,-114,7,5,'#e4f7ff');
  line(c,[-40,-85,-59,-55,-51,-23],mid,11);line(c,[40,-85,59,-55,51,-23],mid,11);
  strokeEllipse(c,0,-65,49,65,'#d0f1ff55',3);
 }
 if(u.attackFlash>0)ellipse(c,0,-85,77,94,fire?'#ffd59750':'#def4ff56');
 if(u.hit>0){c.globalAlpha=.40*u.hit/.24;ellipse(c,0,-85,73,92,'#fff6db');}
 c.restore();
 if(u.hp>0){drawHealth(u,u.x,u.y-186,124);label(c,u.name.toUpperCase(),u.x,u.y-195,13,fire?'#ffe3a9':'#e0f1ff');}
}
function drawBoss(c,u){
 if(state.bossId!=='thornwarden'){drawVariantBoss(c,u);return;}
 c.save();c.translate(u.x,u.y);ellipse(c,0,-3,85,27,'#18382a99');
 if(u.hp===0)c.globalAlpha=.34;
 const w=Math.sin(state.time*2.6)*3;c.translate(0,w);
 // root legs and huge bramble-carapace silhouette
 poly(c,[-39,-14,-60,3,-55,15,-10,-6,8,-6,52,15,60,2,37,-14],
 '#4e4934','#273a2c',5);
 poly(c,[-57,-15,-65,-86,-43,-119,-18,-111,11,-120,42,-102,58,-66,53,-15,28,-2,-28,-2],
 '#6f7250','#354332',6);
 poly(c,[-55,-77,-87,-107,-79,-122,-46,-105,-39,-90],'#7e8b58','#3b4b35',3);
 poly(c,[52,-80,85,-110,81,-125,45,-101,37,-87],'#80905a','#3b4b35',3);
 // thorn antlers
 poly(c,[-27,-107,-66,-157,-58,-145,-76,-157,-63,-132,-47,-141,-34,-123],
 '#a9aa78','#344938',4);
 poly(c,[28,-113,65,-158,58,-140,82,-158,66,-125,47,-137,32,-119],
 '#acb481','#344938',4);
 poly(c,[-38,-84,0,-107,42,-82,28,-32,-6,-19,-35,-33],
 '#526945','#2b3e2b',4);
 // plated heart and glowing runes
 poly(c,[-23,-78,0,-91,22,-77,25,-44,0,-30,-24,-44],
 '#7c865b','#343f35',4);
 ellipse(c,0,-59,12,17,'#d59e58');ellipse(c,0,-59,6,10,'#ffd89c');
 // skull face and glowing eyes
 ellipse(c,0,-108,31,26,'#8e9c72');ellipse(c,-10,-111,8,5,'#f8a967');ellipse(c,11,-111,8,5,'#f8a967');
 ellipse(c,-9,-110,4,2,'#f4e5a2');ellipse(c,11,-110,4,2,'#f4e5a2');
 poly(c,[-11,-94,0,-100,12,-94,4,-87,-5,-87],'#354434',null);
 // swinging root arms
 line(c,[-45,-72,-64,-48,-66,-14],'#5d613f',14);line(c,[46,-73,66,-48,71,-15],'#5d613f',14);
 if(u.attackFlash>0)ellipse(c,62,-58,23,25,'#e9a46476');
 if(u.hit>0){c.globalAlpha=.45*u.hit/.24;ellipse(c,0,-83,68,88,'#fff0c6');}
 c.restore();
 if(u.hp>0){drawHealth(u,u.x,u.y-167,111);label(c,'THORNWARDEN',u.x,u.y-175,13,'#ffe2af');}
}
function renderTelegraph(){
 const t=state.telegraph;if(!t)return;
 const p=1-t.remaining/t.max;
 ctx.save();
 if(t.kind==='cone'){
  ctx.beginPath();ctx.moveTo(t.originX,t.originY);
  ctx.arc(t.originX,t.originY,t.range,t.angle-t.halfAngle,t.angle+t.halfAngle);
  ctx.closePath();ctx.fillStyle='rgba(244,93,47,'+(.15+Math.sin(state.time*12)*.08)+')';ctx.fill();
  ctx.strokeStyle='#ffd38b';ctx.lineWidth=5;ctx.setLineDash([16,10]);ctx.stroke();ctx.setLineDash([]);
  label(ctx,'FURNACE BREATH · DODGE',t.x,t.y-55,16,'#ffe0a8');
 }else if(t.kind==='lane'){
  const ux=Math.cos(t.angle),uy=Math.sin(t.angle),px=-uy*t.width*.5,py=ux*t.width*.5;
  ctx.beginPath();ctx.moveTo(t.originX+px,t.originY+py);ctx.lineTo(t.originX+ux*t.range+px,t.originY+uy*t.range+py);
  ctx.lineTo(t.originX+ux*t.range-px,t.originY+uy*t.range-py);ctx.lineTo(t.originX-px,t.originY-py);ctx.closePath();
  ctx.fillStyle='rgba(112,174,255,'+(.18+Math.sin(state.time*15)*.08)+')';ctx.fill();
  ctx.lineWidth=4;ctx.strokeStyle='#d1edff';ctx.setLineDash([15,10]);ctx.stroke();ctx.setLineDash([]);
  label(ctx,'LIGHTNING LANE · MOVE',t.x,t.y-55,16,'#e1f4ff');
 }else{
  ctx.beginPath();ctx.arc(t.x,t.y,t.radius,0,TAU);
  ctx.fillStyle='rgba(192,55,46,'+(.16+Math.sin(state.time*14)*.07)+')';ctx.fill();
  ctx.lineWidth=5;ctx.strokeStyle='#f4b78e';ctx.setLineDash([13,10]);ctx.stroke();ctx.setLineDash([]);
  label(ctx,'THORN SLAM · MOVE',t.x,t.y,17,'#fff6df');
 }
 // A progress bar communicates how long remains before the strike resolves.
 ctx.fillStyle='#152a2ad9';ctx.fillRect(t.x-64,t.y+43,128,12);
 ctx.fillStyle=t.kind==='lane'?'#b8e4ff':t.kind==='cone'?'#ffc07b':'#fbe3a8';
 ctx.fillRect(t.x-61,t.y+46,122*(1-p),6);
 ctx.restore();
}
function renderMarkers(){
 for(const m of markers){const p=m.age/m.ttl;const radius=9+Math.sin(p*Math.PI)*24;
  strokeEllipse(ctx,m.x,m.y,20+radius,8+radius*.2,m.type==='target'?'#ffbf8f':'#f8e6a8',3*(1-p)+.5);
 }
 for(const hero of state.heroes){
  if(hero.hp<=0)continue;
  if(hero.moveTo){strokeEllipse(ctx,hero.moveTo.x,hero.moveTo.y,15,7,'#ffefbb',2);line(ctx,[hero.moveTo.x-7,hero.moveTo.y,hero.moveTo.x+7,hero.moveTo.y],'#ffefbb',2);}
  else if(hero.focus){const target=getUnit(state,hero.focus);if(target?.hp>0&&hero.id===selected)strokeEllipse(ctx,target.x,target.y,47,21,'#f7d88b',2.5);}
 }
}
function renderFx(){
 for(const p of projectiles){
  const t=p.age/p.ttl,x=p.fromX+(p.toX-p.fromX)*t,y=p.fromY+(p.toY-p.fromY)*t;
  ctx.globalAlpha=1-t*.28;ellipse(ctx,x,y,p.kind==='magic'?8:5,p.kind==='magic'?8:5,p.kind==='magic'?'#d9b2fe':'#ffdb95');
  if(p.kind==='arrow')line(ctx,[x-8,y+4,x+9,y-4],'#f8edc5',3);ctx.globalAlpha=1;
 }
 for(const b of bursts){const p=b.age/b.ttl,r=(b.radius||40)*p;
  ctx.globalAlpha=(1-p)*.72;strokeEllipse(ctx,b.x,b.y,r,r*.5,b.color||'#f6d69f',Math.max(1,6*(1-p)));
  ellipse(ctx,b.x,b.y,Math.max(1,r*.21),Math.max(1,r*.09),b.color||'#ffdf9f');ctx.globalAlpha=1;
 }
 for(const f of floaters){
  const p=f.age/f.ttl;ctx.globalAlpha=Math.min(1,(1-p)*1.7);
  label(ctx,f.text,f.x,f.y-37*p,f.small?13:18,f.color);ctx.globalAlpha=1;
 }
}
function render(){
 resize();renderGround();
 renderMarkers();renderTelegraph();
 const sorted=[...state.heroes,...state.enemies].sort((a,b)=>a.y-b.y);
 for(const unit of sorted)unit.id==='boss'?drawBoss(ctx,unit):unit.faction==='enemy'?drawBramble(ctx,unit):drawHuman(ctx,unit);
 renderFx();
 if(paused){ctx.fillStyle='#112e2a97';ctx.fillRect(0,0,WORLD.width,WORLD.height);label(ctx,'PAUSED',600,320,58,'#fff0c6');}
}
function syncUI(force=false){
 const hero=getHero(state,selected),bossConfig=bossInfo(state.bossId);
 $('chapterName').textContent=bossConfig.chapter;
 $('locationName').textContent=bossConfig.place;
 $('bossLabel').textContent=bossConfig.name.toUpperCase();
 $('bossHint').textContent=bossConfig.mechanics;
 for(const el of document.querySelectorAll('.hero-card')){
  const h=getHero(state,el.dataset.hero);
  el.classList.toggle('selected',selected===h.id);el.classList.toggle('dead',h.hp<=0);
  el.querySelector('.hero-meter i').style.width=(100*h.hp/h.maxHp).toFixed(1)+'%';
  el.querySelector('.hero-stats').textContent=Math.ceil(h.hp)+' / '+h.maxHp+' HP'+(h.shield>0?' · +'+Math.ceil(h.shield)+' barrier':'');
  el.setAttribute('aria-pressed',String(selected===h.id));
 }
 $('abilityHero').textContent=hero.name+' · '+hero.role;
 const persistent=company.heroes[selected],need=xpNeeded(persistent.level);
 $('progressHint').textContent='Level '+persistent.level+' · '+(need?persistent.xp+'/'+need+' XP':'Max level')+' · Talent builds apply next fight';
 $('goldTotal').textContent=company.gold+' gold';
 $('bagCount').textContent=String(company.items.length);
 $('profileRecord').textContent=company.wins+' boss '+(company.wins===1?'victory':'victories');
 for(const el of document.querySelectorAll('#abilities [data-slot]')){
  const index=Number(el.dataset.slot),ability=ABILITIES[selected][index],cd=hero.cooldowns[index];
  el.querySelector('.skill-icon').textContent=ability.icon;
  el.querySelector('.skill-text b').textContent=ability.name;
  el.querySelector('.skill-text small').textContent=ability.description;
  el.classList.toggle('cooling',cd>.02);el.classList.toggle('ready',cd<=.02);
  el.disabled=hero.hp<=0||cd>.02||state.phase!=='playing'||paused;
  el.querySelector('.skill-key').textContent=cd>.05?Math.ceil(cd)+'s':String(index+1);
  el.title=ability.description;
 }
 const boss=getUnit(state,'boss');
 $('bossHpText').textContent=Math.ceil(boss.hp)+' / '+boss.maxHp;
 $('bossFill').style.width=(100*boss.hp/boss.maxHp)+'%';
 $('battleTime').textContent=String(Math.floor(state.time/60)).padStart(2,'0')+':'+String(Math.floor(state.time%60)).padStart(2,'0');
 $('phaseLabel').textContent=paused?'PAUSED':state.phase==='playing'?'LIVE · PVE':state.phase.toUpperCase();
 $('pauseBtn').textContent=paused?'▶':'Ⅱ';$('pauseBtn').setAttribute('aria-label',paused?'Resume game':'Pause game');
 $('commandTitle').textContent=hero.hp>0?hero.name+' is awaiting orders':hero.name+' has fallen';
 const focus=hero.focus&&getUnit(state,hero.focus);
 $('commandInfo').textContent=paused?'Game paused. Press the play button to resume.':hero.hp<=0?'Select a surviving hero to command.':hero.moveTo?'Moving to your commanded position.':focus?.hp>0?'Focusing '+focus.name+'. Choose abilities as their cooldowns finish.':'Tap or drag '+hero.name+' to a position or enemy. Heroes attack automatically when in range.';
 if(force)$('partyList').scrollTop=0;
}
function showEnd(){
 if(state.phase!=='victory'&&state.phase!=='defeat')return;
 $('pauseBtn').disabled=true;
 const win=state.phase==='victory',defeated=bossInfo(state.bossId);
 const title=win?defeated.name+' Defeated':'The Company Has Fallen';
 const desc=win?'Your heroes defeated '+defeated.name+'. Strengthen them with talents and gear, then hunt for more exclusive loot.':'Your company fell to '+defeated.name+'. Protect your healer and move out of the marked boss attacks.';
 let rewardHTML='';
 if(!rewardCommitted){
  rewardCommitted=true;
  if(win){
   const reward=grantVictory(company,state.receiptId,state.seed,state.bossId);
   if(reward){
    const saved=writeProfile(storage,company);
    const def=ITEM_DEFS[reward.item.defId];
    const leveled=reward.levels.map(l=>company.heroes[l.id]&&l.id[0].toUpperCase()+l.id.slice(1)+' Lv'+l.to).join(' · ');
    rewardHTML='<div class="victory-rewards"><h3>✦ Victory Rewards</h3><p>+ '+reward.gold+' gold &nbsp;·&nbsp; + '+reward.xp+' XP per hero</p><p class="rare-drop">'+def.icon+' '+def.name+' · '+def.rarity+'</p><p>'+(leveled?'Level up! '+leveled:'Boss defeated — keep farming for rarer items!')+'</p><small class="notice-local">'+(saved?'Progress saved in this browser.':'Storage unavailable — reward is held only until this page closes.')+'</small></div>';
   }
  }else{recordDefeat(company);writeProfile(storage,company);}
 }
 $('overlayContent').innerHTML='<div class="overlay-emblem">'+(win?'✦':'⚔')+'</div><span class="eyebrow">'+(win?'VICTORY · '+defeated.name.toUpperCase()+' DEFEATED':'DEFEAT · '+defeated.name.toUpperCase())+'</span><h1>'+title+'</h1><p>'+desc+'</p>'+rewardHTML+'<div class="overlay-hints"><span>Damage dealt: '+Math.round(state.stats.damage)+'</span><span>Healing: '+Math.round(state.stats.healing)+'</span><span>Battle time: '+Math.ceil(state.time)+'s</span></div><div class="victory-actions"><button class="primary-btn large" type="button" id="againBtn">Fight Again →</button><button class="quiet-btn" type="button" id="inspectBtn">'+(win?'View Your Loot & Talents':'Prepare Your Heroes')+'</button><button class="quiet-btn" type="button" id="chooseBossBtn">Choose Another Boss</button></div>';
 $('overlay').classList.add('result-mode');
 $('overlay').setAttribute('role','dialog');
 $('overlay').setAttribute('aria-label','Boss fight result');
 $('overlay').classList.remove('choose-mode','hidden');
 syncUI(true);
}
function frame(now){
 if(!last)last=now;const dt=Math.min((now-last)/1000,.05);last=now;
 if(!paused&&state.phase==='playing')updateEncounter(state,dt);
 for(const event of drainEvents(state))onEvent(event);
 tickFx(dt);
 if(now>noticeUntil)$('announcement').classList.remove('show');
 render();
 if(now-uiLast>125){syncUI();uiLast=now;}
 if((state.phase==='victory'||state.phase==='defeat')&&$('overlay').classList.contains('hidden'))showEnd();
 requestAnimationFrame(frame);
}
const workshop=mountWorkshop({
 profile:company,storage,
 onOpen:()=>{workshopWasPaused=paused;paused=true;syncUI(true);},
 onClose:()=>{paused=workshopWasPaused;syncUI(true);},
 onChange:()=>syncUI(true)
});
$('companyBtn').addEventListener('click',()=>workshop.open('heroes',selected));
$('bagBtn').addEventListener('click',()=>workshop.open('pack',selected));
for(const id of ['bossSelectBtn','bossSelectTopBtn'])$(id).addEventListener('click',returnToCamp);
makeBackground();
resize();
renderEncounterChoices();
syncUI(true);
// Boot marker: the HTML recovery guard only treats gameplay as ready after
// controls, workshop, rendering and the initial boss picker have initialised.
document.documentElement.dataset.emberfallReady='4.0.0';
requestAnimationFrame(frame);
