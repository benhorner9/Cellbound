(()=>{
'use strict';
// Presentation only. No HP, damage, resources, cooldowns or simulation clocks.
const scenes=new Map(),times=new WeakMap();
// One presentation RAF: physical geometry/position work runs before rig writes.
// Callbacks re-enrol only while active; no timer competes with browser paint.
const frameJobs=new Map();let frameRequest=0,flushing=false;
function requestFrame(fn,phase=1){frameJobs.set(fn,phase);if(!frameRequest&&!flushing&&!document.hidden)frameRequest=requestAnimationFrame(flushFrame);return 1}
function flushFrame(){frameRequest=0;flushing=true;const jobs=[...frameJobs].sort((a,b)=>a[1]-b[1]);frameJobs.clear();try{for(const [fn] of jobs)safe(fn)}finally{flushing=false;if(frameJobs.size&&!document.hidden)frameRequest=requestAnimationFrame(flushFrame)}}
function cancelFrame(fn){frameJobs.delete(fn)}
window.CellboundCombatFrame={request:requestFrame,cancel:cancelFrame};
// Presentation time pauses with the existing simulation when the tab is hidden.
let hiddenAt=document.hidden?performance.now():null,hiddenElapsed=0;
const motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const now=()=> (hiddenAt??performance.now())-hiddenElapsed,reduced=()=>motionPreference?.matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ACTOR='.cb-combat-portrait,.cb-combat-boss-portrait,.cb-combat-monster-portrait,.pvp2d-token,.wb2d-unit-dot,.cbl-pet-body';
const PRIORITY={idle:0,heal:15,cast:30,attack:40,hit:50,block:55,dodge:60,interrupt:75,control:85,revive:90,death:100};
// Wrist displacement is measured in shoulder width / forearm length; the rig
// solves both arm segments and all existing equipment sockets from these goals.
const CLIPS={
 swing:{duration:660,contact:.44,frames:[[0,{}],[.27,{mainX:.12,mainY:-1.04,mainAngle:-52,offX:.13,offY:-.2,lean:-3}],[.44,{mainX:.9,mainY:-.45,mainAngle:78,offX:.18,offY:-.25,lean:5,step:3}],[.64,{mainX:.64,mainY:.03,mainAngle:104,lean:3,step:2}],[1,{}]]},
 thrust:{duration:440,contact:.43,frames:[[0,{}],[.24,{mainX:-.12,mainY:-.4,mainAngle:50,lean:-2}],[.43,{mainX:.85,mainY:-.6,mainAngle:88,lean:4,step:3}],[1,{}]]},
 bash:{duration:530,contact:.43,frames:[[0,{}],[.25,{offX:.55,offY:-.65,offAngle:-12,lean:-2}],[.43,{offX:.9,offY:-.6,offAngle:15,lean:5,step:3}],[1,{}]]},
 cast:{duration:520,contact:.64,frames:[[0,{}],[.35,{mainY:-.55,mainAngle:-18,offY:-.25,lean:-1}],[.64,{mainY:-.65,mainAngle:12,offY:-.4,lean:2}],[1,{}]]},
 hit:{duration:320,frames:[[0,{}],[.18,{lean:-5,step:-2,mainY:.06}],[1,{}]]},
 block:{duration:410,frames:[[0,{offX:.55,offY:-.7,offAngle:-12,lean:-2}],[.24,{offX:.65,offY:-.6,offAngle:8,lean:-4}],[1,{}]]},
 dodge:{duration:400,frames:[[0,{}],[.35,{lean:-8,step:-6,mainY:-.2}],[1,{}]]},
 interrupt:{duration:450,frames:[[0,{lean:-4,mainY:.15}],[1,{}]]},
 heal:{duration:550,frames:[[0,{}],[.5,{lean:-1,mainY:-.1}],[1,{}]]},
 control:{duration:1000,frames:[[0,{lean:4,mainY:.18,mainAngle:22}],[1,{lean:4,mainY:.18,mainAngle:22}]]},
 death:{duration:780,frames:[[0,{}],[.25,{lean:-8,mainY:.15,mainAngle:30}],[.72,{lean:-18,mainY:.25,mainAngle:50,fall:65,sink:7}],[1,{lean:-18,mainY:.25,mainAngle:50,fall:76,sink:9}]]},
 revive:{duration:720,frames:[[0,{lean:-18,fall:76,sink:9}],[.5,{lean:5,fall:12,sink:2}],[1,{}]]}
};
Object.assign(CLIPS,window.CellboundCombatAnimationCatalog?.clips||{});
function sample(name,t){
 const frames=CLIPS[name]?.frames||CLIPS.swing.frames;t=clamp(t,0,1);
 let i=1;while(i<frames.length-1&&frames[i][0]<t)i++;
 const [at,a]=frames[i-1],[bt,b]=frames[i],f=clamp((t-at)/(bt-at),0,1),ease=f*f*(3-2*f),out={};
 for(const k of new Set([...Object.keys(a),...Object.keys(b)]))out[k]=(a[k]||0)+((b[k]||0)-(a[k]||0))*ease;
 return out;
}
const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
function bind(el){
 const svg=el.querySelector('svg[data-rig-pose]');if(!svg)return null;
 if(el._cbAnimationRig?.svg===svg)return el._cbAnimationRig;
 let data;try{data=JSON.parse(svg.dataset.rigPose)}catch(_){return null}
 const nodes={},original=new Map();
 for(const [key,selector] of Object.entries({body:'.cb-paper-upper-body',actor:'.cb-paper-actor',main:'.cb-paper-slot-weapon',off:'.cb-paper-slot-offhand',rightUpper:'.cb-paper-upper-right',leftUpper:'.cb-paper-upper-left',rightLower:'.cb-paper-forearm-right',leftLower:'.cb-paper-forearm-left',rightGlove:'.cb-paper-glove-right',leftGlove:'.cb-paper-glove-left',rightGrip:'.cb-paper-held-grip-main',leftGrip:'.cb-paper-held-grip-off',rightRing:'.cb-paper-slot-ring2',leftRing:'.cb-paper-slot-ring1',leg:'.cb-paper-kick-R',string:'.cb-paper-bow-string',arrow:'.cb-paper-arrow'})){
  nodes[key]=svg.querySelector(selector);if(nodes[key])original.set(nodes[key],nodes[key].getAttribute('transform')||'');
 }
 return el._cbAnimationRig={svg,klass:svg.dataset.animationClass||'',base:data.pose,p:data.p,nodes,original};
}
function apply(u,c){
 if(u.blendFrom&&!reduced()){
  const mix=clamp((now()-u.blendAt)/(90/u.scene.speed),0,1),out={};
  for(const key of new Set([...Object.keys(u.blendFrom),...Object.keys(c)]))out[key]=(u.blendFrom[key]||0)*(1-mix)+(c[key]||0)*mix;
  c=out;if(mix===1)u.blendFrom=null;
 }
 u.pose=c;
 if(window.CellboundMonsterVisuals?.apply(u.el,{clip:u.clip,progress:clamp((now()-u.start)/Math.max(1,u.until-u.start),0,1),casting:!!u.casting,dead:u.dead,reduced:reduced(),contact:CLIPS[u.clip]?.contact||.44}))return;
 if(!u.rig?.svg.isConnected)u.rig=bind(u.el);
 const r=u.rig,R=window.CellboundCharacterRig;
 if(r&&R?.animatedEquipmentPose){
  const pose=R.animatedEquipmentPose(r.base,r.p,c),n=r.nodes;
  const set=(key,value)=>n[key]?.setAttribute('transform',value);
  for(const side of ['left','right']){
   const a=r.base[side],b=pose[side],upper=angle(b.shoulder,b.elbow)-angle(a.shoulder,a.elbow),lower=angle(b.elbow,b.hand)-angle(a.elbow,a.hand);
   set(side+'Upper',`rotate(${upper} ${a.shoulder.x} ${a.shoulder.y})`);
   set(side+'Lower',`translate(${b.elbow.x-a.elbow.x} ${b.elbow.y-a.elbow.y}) rotate(${lower} ${a.elbow.x} ${a.elbow.y})`);
   const key=side==='right'?'main':'off',rotation=(pose.twoHanded&&side==='left'?pose.main.angle-r.base.main.angle:(pose[key]?.angle||0)-(r.base[key]?.angle||0));
   for(const part of ['Glove','Grip','Ring']){const node=n[side+part];if(node)set(side+part,`translate(${b.hand.x-a.hand.x} ${b.hand.y-a.hand.y}) rotate(${rotation} ${a.hand.x} ${a.hand.y}) `+r.original.get(node))}
  }
  for(const key of ['main','off'])if(pose[key])set(key,R.attachmentTransform(pose[key]));
  if(n.string)n.string.setAttribute('d',pose.bowNock?`M190 113 L${pose.bowNock[0]} 213 L190 325`:'M190 113 L190 325');
  if(n.arrow){n.arrow.setAttribute('opacity',String(c.arrow||0));n.arrow.setAttribute('transform',`translate(${pose.bowNock?pose.bowNock[0]-135:0} 0)`)}
  if(c.prop&&n.leftGrip&&!r.prop){const prop=document.createElementNS('http://www.w3.org/2000/svg','g');prop.setAttribute('class','cb-paper-action-prop');const h=r.base.left.hand;prop.innerHTML=`<path d="M${h.x-2} ${h.y+7} l5 -15 h29 v6 h-24 l-2 11 Z" fill="#68777b" stroke="#1c2529" stroke-width="2"/><path d="M${h.x-2} ${h.y+7} l5 -12 6 3 -5 12 Z" fill="#695040"/>`;n.leftGrip.parentNode.appendChild(prop);r.prop=prop}
  if(r.prop){r.prop.setAttribute('opacity',String(c.prop||0));r.prop.setAttribute('transform',`translate(${pose.left.hand.x-r.base.left.hand.x} ${pose.left.hand.y-r.base.left.hand.y})`)}
  if(n.off&&r.base.off?.mode==='held')n.off.style.opacity=c.prop?'0':'';
  set('leg',`rotate(${c.leg||0} ${120+r.p.hip*.47} 250)`);
  if(n.actor)n.actor.style.opacity=String(1-(c.shade||0));
  set('body',`rotate(${c.lean||0} 120 257)`);
  // Mirror remains on the outer actor; all bones and sockets share it.
  set('actor',r.original.get(n.actor)+` translate(${c.step||0} ${c.sink||0}) rotate(${c.fall||0} 120 380)`);
 }else{
  const node=u.el.querySelector(ACTOR);if(node){node.style.rotate=((c.fall||0)+(c.lean||0))+'deg';node.style.translate=(c.step||0)+'px '+(c.sink||0)+'px'}
 }
}
function reset(u){
 window.CellboundMonsterVisuals?.reset(u.el,u.dead);
 u.casting=null;u.suspendedCast=null;u.blendFrom=null;u.pose={};
 if(u.rig){u.rig.prop?.remove();u.rig.prop=null;u.rig.nodes.off?.style.removeProperty('opacity');u.rig.nodes.actor?.style.removeProperty('opacity');u.rig.nodes.arrow?.setAttribute('opacity','0');u.rig.nodes.string?.setAttribute('d','M190 113 L190 325')}
 if(u.rig)for(const [node,value] of u.rig.original)value?node.setAttribute('transform',value):node.removeAttribute('transform');
 const node=u.el.querySelector(ACTOR);if(node){node.style.removeProperty('rotate');node.style.removeProperty('translate')}
 u.clip=null;u.priority=0;u.el.dataset.animationState=u.dead?'dead':'idle';
 if(!u.dead&&!reduced()){const ready=window.CellboundCombatAnimationCatalog?.styles[u.rig?.klass]?.ready;if(ready)apply(u,ready)}
}
function play(u,name,priority=PRIORITY[name]||40,duration){
 if(!u||u.dead&&name!=='death'||u.control.size&&priority<PRIORITY.control||priority<u.priority&&now()<u.until)return false;
 const clip=CLIPS[name];if(!clip)return false;
 u.blendFrom=u.pose||{};u.blendAt=now();
 if(u.casting&&['hit','block','dodge','heal'].includes(name))u.suspendedCast=u.casting;
 else if(!['hit','block','dodge','heal'].includes(name))u.suspendedCast=null;
 u.casting=null;u.clip=name;u.priority=priority;u.start=now();u.until=u.start+(duration||clip.duration)/u.scene.speed;
 u.el.dataset.animationState=name;u.el.dataset.animationClip=name;wake();return true;
}
function get(scene,el){
 if(!el)return null;
 let u=scene.units.get(el);if(u){if(!u.rig?.svg.isConnected)u.rig=bind(el);return u;}
 u={el,scene,rig:bind(el),priority:0,clip:null,dead:false,control:new Map(),epoch:0,lastImpact:0,action:null,sequence:0,casting:null};scene.units.set(el,u);
 reset(u);el.dataset.animationOwned='1';el.dataset.animationState='idle';el.style.setProperty('--cba-phase',-(scene.units.size*.61)+'s');return u;
}
function defer(scene,due,fn){
 if(due<=now()){if(scene.arena.isConnected)fn();return}
 scene.pending.push({due,fn,seq:scene.seq++});wake();
}
function safe(fn){try{fn()}catch(e){console.warn('Combat animation recovered',e)}}
function dispose(scene,preserveDead=false){
 for(const u of scene.units.values()){
  if(preserveDead&&u.dead){apply(u,sample('death',1));u.el.dataset.animationState='dead';continue}
  reset(u);delete u.el.dataset.animationOwned;delete u.el.dataset.animationState;delete u.el.dataset.animationClip
 }
 scene.pending.length=0;scene.units.clear();scenes.delete(scene.arena);
}
function choose(u,e){
 const monster=window.CellboundMonsterVisuals?.profile(u?.el,e);if(monster)return monster;
 const catalogue=window.CellboundCombatAnimationCatalog;
 if(catalogue)return catalogue.resolve(u?.rig?.klass||u?.el.dataset.animationClass,e,u?.rig?.base.main?.kind,u?.rig?.base.twoHanded,u?.sequence||0);
 return {clip:/shield|bash/i.test(e.ability||'')?'bash':Number(e.payload?.range)>7?'cast':'swing',kind:e.payload?.kind};
}
function attack(u,e,release=false){
 if(!u||u.dead||u.control.size)return;
 // Ordinary damage is not an interrupt: an illustrated enemy can begin its
 // genuine attack while recovering from a light hit. Control/death still win.
 if(u.el.dataset.monsterId&&u.clip==='hit')u.priority=0;
 const profile=choose(u,e),clip=profile.clip,duration=CLIPS[clip]?.duration||660;
 if(play(u,clip,PRIORITY.attack)){
  u.sequence++;const hold=release?(CLIPS[clip]?.hold||.3):0;
  const contact=Math.min(350,duration*((CLIPS[clip]?.contact||.5)-hold))/u.scene.speed;
  u.action={ability:e.ability,contact:now()+contact,expires:now()+duration/u.scene.speed,profile};
  // Scale the presentation segment so its contact and feedback share a clock.
  const fraction=(CLIPS[clip]?.contact||.5)-hold;
  const total=contact/Math.max(.01,fraction);u.start=now()-total*hold;u.until=u.start+total;
  u.el.dataset.animationAbility=profile.abilityId||e.ability||'basic';
  u.el.dataset.animationClass=profile.style||u.rig?.klass||'';
 }
}
function route(e,opts,deliver){
 const arena=opts.arena;if(!arena?.isConnected){deliver();return}
 let scene=scenes.get(arena);
 if(e.type==='COMBAT_START'&&scene){dispose(scene);scene=null}
 if(!scene){scene={arena,units:new Map(),pending:[],seq:0,speed:1,active:true,closeAt:0};scenes.set(arena,scene);arena.querySelectorAll('.cb2d-unit,.quest-cb2d-unit,.wb2d-unit,.pvp2d-unit,.tb-unit,.cbl-pet').forEach(el=>get(scene,el))}
 scene.speed=Math.max(.25,Number(typeof opts.speed==='function'?opts.speed():opts.speed)||1);
 const u=get(scene,opts.source),t=get(scene,opts.target),time=now();let due=time,valid=()=>true;
 switch(e.type){
 case'COMBAT_START':
  arena.querySelectorAll('.cb2d-unit,.quest-cb2d-unit,.wb2d-unit,.pvp2d-unit,.tb-unit,.cbl-pet').forEach(el=>get(scene,el));break;
 case'ABILITY_START':
  if(!(e.payload?.castTime>0))attack(u,e);break;
 case'CAST_START':
  if(u){const profile=choose(u,e),duration=Math.max(1,Number(e.payload?.duration)||1000)/scene.speed;
   if(play(u,profile.clip,PRIORITY.cast,duration*scene.speed)){u.casting={event:e,profile,start:time,end:time+duration};u.action={ability:e.ability,contact:time+duration,expires:time+duration+1200,profile};u.el.dataset.animationAbility=profile.abilityId||e.ability}}break;
 case'CAST_FINISH':case'ABILITY_FINISH':
  if(u?.casting||u?.suspendedCast){if(/^failed/.test(e.result||'')){u.action=null;reset(u)}else attack(u,e,true)}break;
 case'CAST_CANCELLED':case'INTERRUPT':{
  const v=e.type==='CAST_CANCELLED'?u:e.result==='success'?t:null;
  if(e.type==='INTERRUPT'&&e.result==='success'&&u)attack(u,e);
  if(v){v.action=null;play(v,'interrupt',PRIORITY.interrupt)}break;
 }
 case'DAMAGE_DEALT':case'HEAL_RECEIVED':{
  const passive=!!u?.rig?.klass&&!choose(u,e).known&&u?.action?.ability!==e.ability;
  const periodic=passive||/\(DoT\)|\(HoT\)|\(Pulse\)|Stagger|bleed|burn tick/i.test(e.ability||'');
  if(!periodic&&(u?.casting||u?.suspendedCast))attack(u,e,true);
  else if(!periodic&&u&&(!u.action||u.action.ability!==e.ability||time>u.action.expires))attack(u,e);
  due=reduced()||periodic?time:Math.max(time,u?.action?.ability===e.ability?u.action.contact:time);
  due=Math.min(time+350/scene.speed,due); // bounded release; simulation remains immediate
  const action=u?.action;
  if(!periodic&&!reduced()&&action?.profile.projectile&&u!==t&&t){
   const release=due,flight=120/scene.speed;
   // One flight per actual result target, including cleaves and chain heals.
   defer(scene,release,()=>{if(!u.dead&&!u.control.size&&u.action===action){if(u.clip)apply(u,sample(u.clip,clamp((now()-u.start)/(u.until-u.start),0,1)));window.CellboundCombatFX?.launchAction?.(e,scene.arena,u.el,t.el,action.profile,flight)}});
   due+=flight;
  }
  if(t)t.lastImpact=Math.max(t.lastImpact,due);
  defer(scene,due,()=>{
   if(!t||t.dead||t.control.size)return;
   const result=String(e.result||'');
   if(/miss|immune|resist/.test(result))return;
   const reaction=e.type==='HEAL_RECEIVED'?'heal':/block|parr/.test(result)?'block':/dodg/.test(result)?'dodge':'hit';
   if(reaction==='hit'&&t.el.dataset.monsterId&&(t.casting||t.action&&now()<t.action.expires)&&t.clip!=='hit'){if(!reduced())window.CellboundMonsterVisuals?.react(t.el)}else play(t,reaction);
  });break;
 }
 case'PLAYER_DEFEATED':case'ENEMY_DEFEATED':case'ADD_DEFEATED':
  if(t){t.dead=true;t.el.classList.add('dead');t.action=null;const epoch=++t.epoch;valid=()=>t.dead&&t.epoch===epoch;due=Math.max(time,t.lastImpact);defer(scene,due,()=>{if(t.dead&&t.epoch===epoch){t.priority=0;play(t,'death',PRIORITY.death)}})}break;
 case'PLAYER_REVIVED':case'ENEMY_REVIVED':
  if(t){t.epoch++;t.dead=false;t.action=null;t.control.clear();t.priority=0;play(t,'revive',PRIORITY.revive)}break;
 case'CROWD_CONTROL':
  if(t){const end=time+(Number(e.payload?.duration)||900)/scene.speed;t.control.set('timed',end);t.action=null;play(t,'control',PRIORITY.control);defer(scene,end,()=>{if(t.control.get('timed')===end)t.control.delete('timed');if(!t.dead&&!t.control.size&&t.el.dataset.animationState==='control')reset(t)})}break;
 case'BUFF_APPLIED':case'DEBUFF_APPLIED':case'BUFF_REMOVED':case'DEBUFF_REMOVED':
  if(t){for(const s of e.statusEffects||[])if(/REMOVED$/.test(e.type))t.control.delete(s.id);else if(['stun','fear','incapacitate'].includes(s.cc))t.control.set(s.id,Infinity);
   if(t.control.size){t.action=null;play(t,'control',PRIORITY.control)}else if(t.el.dataset.animationState==='control'){reset(t)}}break;
 case'DEFENSIVE_ACTIVATED':attack(u||t,{...e,payload:{...e.payload,kind:'defensive'}});break;
 case'PET_COMMAND':if(u&&(!u.action||u.action.ability!==e.ability||time>u.action.expires))attack(u,{...e,payload:{...e.payload,kind:'pet-command'}});break;
 case'COMBAT_END':
  scene.active=false;scene.pending=scene.pending.filter(p=>p.due<=time+500/scene.speed);scene.closeAt=Math.max(time,...scene.pending.map(p=>p.due))+800/scene.speed+100;
  for(const v of scene.units.values())if(!v.dead&&!v.clip)v.el.dataset.animationState='resting';break;
 }
 times.set(e,{scene,due,projectile:!!u?.action?.profile.projectile});defer(scene,due,()=>{if(valid())deliver()});wake();
}
// Adapter feedback joins this event's contact frame; gameplay updates stay immediate.
function present(e,fn){const entry=times.get(e);if(entry&&scenes.get(entry.scene.arena)===entry.scene)defer(entry.scene,entry.due,()=>{if(entry.scene.arena.isConnected)fn()});else fn()}
let raf=0;
function wake(){if(!raf&&!document.hidden)raf=requestFrame(tick,1)}
function tick(){
 raf=0;const time=now();let active=false;
 for(const scene of scenes.values()){
  if(!scene.arena.isConnected||scene.arena.closest('[hidden]')||scene.closeAt&&time>=scene.closeAt){dispose(scene,scene.arena.isConnected);continue}
  const due=scene.pending.filter(p=>p.due<=time).sort((a,b)=>a.due-b.due||a.seq-b.seq);scene.pending=scene.pending.filter(p=>p.due>time);
  for(const entry of due)safe(entry.fn);
  for(const [el,u] of scene.units){
   if(!el.isConnected){reset(u);scene.units.delete(el);continue}
   for(const [id,end] of u.control)if(time>=end)u.control.delete(id);
   if(u.clip==='control'&&!u.control.size)reset(u);
   if(!u.clip)continue;
   if(u.casting){
    if(time>u.casting.end+600/scene.speed){reset(u);continue}
    const progress=clamp((time-u.casting.start)/Math.max(1,u.casting.end-u.casting.start),0,1);
    const pose=sample(u.clip,Math.min(CLIPS[u.clip]?.hold||.3,progress*1.4));if(u.casting.profile.channel&&progress>.5)pose.offY=(pose.offY||0)+Math.sin(time/160)*.025;
    safe(()=>apply(u,reduced()?{}:pose));continue;
   }
   const t=clamp((time-u.start)/(u.until-u.start),0,1);
   safe(()=>apply(u,reduced()?(u.clip==='death'?{fall:76,sink:9}:{}):sample(u.clip,t)));
   if(t>=1){
    if(u.clip==='control'){u.clip=null}
    else if(u.clip==='death'){u.clip=null;u.el.dataset.animationState='dead'}else if(u.suspendedCast&&time<u.suspendedCast.end){const casting=u.suspendedCast;reset(u);u.clip=casting.profile.clip;u.casting=casting;u.priority=PRIORITY.cast;u.el.dataset.animationState=u.clip}
    else reset(u);
   }
  }
  active=active||scene.pending.length>0||scene.closeAt>0||[...scene.units.values()].some(u=>u.clip);
 }
 if(active)wake();
}
// Idle has no JS frame loop. Observe removal so closed arenas cannot retain actors.
new MutationObserver(records=>{const hiddenChanged=records.some(r=>r.type==='attributes');if(hiddenChanged||records.some(r=>r.removedNodes.length))for(const scene of scenes.values())if(!scene.arena.isConnected||hiddenChanged&&scene.arena.closest('[hidden]'))dispose(scene)}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
function socket(el,type,cached=false){
 if(el?.dataset.monsterId)return window.CellboundMonsterVisuals?.socket(el)||null;
 const r=el?._cbAnimationRig||bind(el||{querySelector:()=>null}),profile=type||'main';
 const node=profile==='off'?r?.nodes.leftGlove:profile==='head'?r?.nodes.body:r?.nodes.main,svg=node?.ownerSVGElement;
 if(!node||!svg)return null;
 r.screenMatrices=r.screenMatrices||new WeakMap();const matrix=cached?r.screenMatrices.get(node):node.getScreenCTM();if(!matrix)return null;if(!cached)r.screenMatrices.set(node,matrix);
 const point=svg.createSVGPoint();
 if(profile==='off'){point.x=Number(node.getAttribute('cx'));point.y=Number(node.getAttribute('cy'))}
 else if(profile==='head'){point.x=120;point.y=85}
 else if(profile==='bow'){point.x=240;point.y=213}
 else{point.x=Number(node.dataset.gripLocalX)||0;point.y=Number(node.dataset.gripLocalY)||0}
 const p=point.matrixTransform(matrix);return{x:p.x,y:p.y};
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frameRequest)cancelAnimationFrame(frameRequest);frameRequest=0;hiddenAt=performance.now();if(raf)cancelFrame(tick);raf=0}else{if(hiddenAt!==null)hiddenElapsed+=performance.now()-hiddenAt;hiddenAt=null;wake()}});
window.CellboundCombatAnimation={version:3,now,isProjectile:e=>!!times.get(e)?.projectile,route,present,socket,sample,clips:CLIPS,dispose:arena=>{const s=scenes.get(arena);if(s)dispose(s)},diagnostics:arena=>{const entries=arena?[scenes.get(arena)].filter(Boolean):[...scenes.values()];return{scenes:entries.length,pending:entries.reduce((n,s)=>n+s.pending.length,0),actors:entries.reduce((n,s)=>n+s.units.size,0)}}};
})();
