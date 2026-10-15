/* Cellbound owner-only 3D combat alpha.
 * 3D is a projection of Combat Reborn's actual event stream, NEVER a simulation.
 * HTML party HUD, ability choices, server state and authoritative 2D game stay intact.
 */
(()=>{
'use strict';
const VERSION='1.0.0';
const ARENA='.cb2d-arena,.quest-cb2d-arena,.wb2d-arena,.pvp2d-arena,#tbArena';
const states=new WeakMap();
const live=new Map();
const MAX_UNITS=32;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const validPosition=p=>p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y));
const point=p=>validPosition(p)?{x:clamp(p.x,0,100),y:clamp(p.y,0,100)}:null;
const toWorld=p=>({x:(clamp(p?.x??50,0,100)-50)*.154,z:(clamp(p?.y??50,0,100)-50)*.091});
const safeId=v=>String(v??'').slice(0,120);
const normalizeRole=u=>{
 const r=String(u.role||u.rangeStyle||'').toLowerCase();
 return r==='tank'?'tank':r==='healer'?'healer':r==='pet'?'pet':r==='enemy'?'enemy':r==='melee'?'melee':'ranged';
};
function createSnapshot(){return{units:new Map(),telegraphs:new Map(),hazards:new Map(),started:false,ended:false,theme:'ashen',lastEvent:0};}
function upsert(s,id,changes={}){
 id=safeId(id);if(!id)return null;
 const u=s.units.get(id)||{id,position:{x:id.startsWith('p-')?29:74,y:50},alive:true};
 Object.assign(u,changes);s.units.set(id,u);return u;
}
function reduce(s,e){
 if(!s||!e||!e.type)return s;
 const type=String(e.type);
 if(type==='COMBAT_START'){
  s.units.clear();s.telegraphs.clear();s.hazards.clear();
  s.started=true;s.ended=false;
  for(const value of e.payload?.units||[]){
   if(!value?.id)continue;
   upsert(s,value.id,{...value,position:point(value.position)||undefined,alive:value.alive!==false});
  }
  for(const value of e.payload?.enemies||[]){
   const u=s.units.get(safeId(value.id));if(u)Object.assign(u,{name:value.name||u.name,classification:value.classification||u.classification});
  }
 }
 if(!s.started)return s;
 const u=e.source?upsert(s,e.source):null,t=e.target?upsert(s,e.target):null;
 if(type==='MOVEMENT_START'&&u){
  const destination=point(e.payload?.to);
  if(point(e.position))u.position=point(e.position);
  if(destination)u.destination=destination;
 }
 if(type==='MOVEMENT_END'&&u){
  u.position=point(e.position)||u.destination||u.position;
  u.destination=null;
 }
 if(type==='ADD_SPAWNED'&&t){
  Object.assign(t,{...e.payload,position:point(e.position)||t.position,alive:true,role:'enemy'});
 }
 if(type==='PET_SUMMONED'){
  const petId=safeId(e.payload?.petId||e.target);
  if(petId){const pet=upsert(s,petId);Object.assign(pet,{...e.payload,position:point(e.position)||pet.position,alive:true,role:'pet'});}
 }
 if(type==='PET_DISMISSED')s.units.delete(safeId(e.payload?.petId||e.target));
 if(type==='PLAYER_DEFEATED'||type==='ENEMY_DEFEATED'||type==='ADD_DEFEATED'){if(t)t.alive=false;}
 if(type==='PLAYER_REVIVED'||type==='ENEMY_REVIVED'){if(t)t.alive=true;}
 if(type==='DAMAGE_DEALT'||type==='HEAL_RECEIVED'){
  if(t&&Number.isFinite(Number(e.payload?.targetHpPct)))t.healthPct=clamp(e.payload.targetHpPct,0,100);
 }
 if(type==='MECHANIC_TELEGRAPH'){
  const token=safeId(e.payload?.token||e.ability||'mechanic');
  s.telegraphs.set(token,{token,type:String(e.payload?.mechanicType||'circle'),position:point(e.position)||t?.position||u?.position||{x:50,y:50},targetId:t?.id,sourceId:u?.id,radius:Number(e.payload?.radius)||10,duration:Number(e.payload?.duration)||1200});
 }
 if(type==='MECHANIC_RESOLVE'||type==='MECHANIC_CANCELLED'||type==='MECHANIC_INTERRUPTED'){
  const token=safeId(e.payload?.token||e.ability||'mechanic');s.telegraphs.delete(token);
 }
 if(type==='GROUND_HAZARD_SPAWNED'){
  const id=safeId(e.payload?.hazardId||e.ability||'hazard');
  s.hazards.set(id,{id,position:point(e.position)||{x:50,y:50},radius:Number(e.payload?.radius)||8});
 }
 if(type==='GROUND_HAZARD_EXPIRED')s.hazards.delete(safeId(e.payload?.hazardId||e.ability||'hazard'));
 if(type==='COMBAT_END'){s.ended=true;s.telegraphs.clear();s.hazards.clear();}
 s.lastEvent++;
 return s;
}
const themeFor=arena=>{
 const text=[arena.className,arena.closest('.cbcombat-shell')?.dataset.combatTheme,arena.closest('.cbcombat-arena-wrap')?.dataset.combatTheme].join(' ').toLowerCase();
 for(const name of ['hollow','chaos','blackout','fractured','manor','twelve','null','ashen','pvp'])if(text.includes(name))return name;
 return 'ashen';
};
const palette={
 ashen:{floor:0x292e37,accent:0xe67842,light:0xe77735},
 hollow:{floor:0x202b34,accent:0x78bfd4,light:0x5f9abc},
 chaos:{floor:0x303a2b,accent:0xb5c878,light:0x8ca05d},
 blackout:{floor:0x26353c,accent:0x83d4df,light:0x62bad5},
 fractured:{floor:0x302c3e,accent:0xc0a6ed,light:0x9776c2},
 manor:{floor:0x302c2e,accent:0xe5bc8e,light:0xb48b6c},
 twelve:{floor:0x232e3b,accent:0x91bbd0,light:0x739ac0},
 null:{floor:0x27283b,accent:0x9c9bea,light:0x777bd4},
 pvp:{floor:0x302c34,accent:0xd39f88,light:0xc27879}
};
function actorClass(arena,id){
 const nodes=arena.querySelectorAll('[data-unit],[data-q-unit],[data-pvp-unit-id],[data-cbl-combat-id],[data-tb-unit]');
 for(const node of nodes){
  if([node.dataset.unit,node.dataset.qUnit,node.dataset.pvpUnitId,node.dataset.cblCombatId,node.dataset.tbUnit].includes(id)){
   const cls=[...node.classList].find(x=>x.startsWith('class-')&&!x.startsWith('class-projectile'));
   return {klass:cls?.slice(6)||'',
    name:node.querySelector(':scope > span')?.textContent?.trim()?.slice(0,30)||'',
    boss:node.classList.contains('boss')};
  }
 }
 return{klass:'',name:'',boss:false};
}
const identity=(u,arena)=>{
 const found=actorClass(arena,u.id),klass=String(u.class||u.klass||found.klass||'').toLowerCase();
 const enemy=u.role==='enemy'||u.team==='red'||u.classification==='boss'||u.id.startsWith('e-')||u.id.startsWith('add-');
 const boss=found.boss||u.classification==='boss'||u.classification==='world-boss';
 const role=enemy?'enemy':normalizeRole(u);
 return {klass,role,boss,name:String(u.name||found.name||u.id).slice(0,32)};
};
async function mountLive(arena,snapshot){
 const bridge=window.CellboundThree;
 if(!bridge?.load)throw new Error('Three.js foundation is not available.');
 if(!bridge.supportsWebGL2())throw new Error('WebGL 2 is not supported on this device.');
 const THREE=await bridge.load();
 if(!arena.isConnected||arena.closest('[hidden]'))throw new Error('Combat arena was closed.');
 const colors=palette[themeFor(arena)]||palette.ashen;
 const stage=document.createElement('div');stage.className='cb3d-stage';stage.setAttribute('aria-label','Live 3D combat presentation');
 const labels=document.createElement('div');labels.className='cb3d-labels';stage.appendChild(labels);
 const tag=document.createElement('div');tag.className='cb3d-stage-tag';tag.textContent='3D ALPHA · LIVE COMBAT EVENTS';stage.appendChild(tag);
 const notice=document.createElement('div');notice.className='cb3d-notice';notice.setAttribute('role','status');notice.textContent='Real combat events • placeholder 3D models';stage.appendChild(notice);
 arena.appendChild(stage);
 const scene=new THREE.Scene();scene.background=new THREE.Color(colors.floor);scene.fog=new THREE.Fog(colors.floor,22,47);
 const camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,100);camera.position.set(10,16,21);camera.lookAt(0,0,-.15);
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setClearColor(colors.floor);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 }catch(error){stage.remove();throw error;}
 stage.prepend(renderer.domElement);renderer.domElement.className='cb3d-canvas';
 const mat=(hex,opt={})=>new THREE.MeshStandardMaterial({color:hex,roughness:.73,metalness:.18,...opt});
 const floor=mat(colors.floor,{roughness:1}),wall=mat(0x454750),edge=mat(colors.accent,{metalness:.42});
 const bright=mat(colors.light,{emissive:colors.light,emissiveIntensity:.65});
 function mesh(parent,geometry,m,x=0,y=0,z=0){
  const part=new THREE.Mesh(geometry,m);part.position.set(x,y,z);part.castShadow=true;part.receiveShadow=true;parent.add(part);return part;
 }
 mesh(scene,new THREE.BoxGeometry(16,.42,10),floor,0,-.31,0);
 mesh(scene,new THREE.BoxGeometry(16,1.8,.35),wall,0,.65,-4.9);
 mesh(scene,new THREE.BoxGeometry(.35,1.8,10),wall,-7.9,.65,0);
 mesh(scene,new THREE.BoxGeometry(.35,1.8,10),wall,7.9,.65,0);
 for(const x of [-6.8,6.8])for(const z of [-3.8,3.8]){
  mesh(scene,new THREE.BoxGeometry(.85,2.7,.85),wall,x,1.25,z);
  mesh(scene,new THREE.BoxGeometry(1,.22,1),edge,x,2.65,z);
 }
 for(const x of [-3.3,0,3.3]){
  mesh(scene,new THREE.BoxGeometry(.18,.018,2.9),bright,x,-.084,-2.65);
 }
 const grid=new THREE.GridHelper(16,16,0x86796b,0x51555f);
 grid.position.y=-.08;grid.material.transparent=true;grid.material.opacity=.16;scene.add(grid);
 scene.add(new THREE.AmbientLight(0xc6d2e4,1.15));
 const sun=new THREE.DirectionalLight(0xffe6c9,2.6);sun.position.set(-4,11,8);sun.castShadow=true;
 sun.shadow.camera.left=-11;sun.shadow.camera.right=11;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;
 sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 const accent=new THREE.PointLight(colors.accent,36,14,2);accent.position.set(1,3,-2);scene.add(accent);
 const actors=new Map(),hazards=new Map(),flashes=[],shots=[];
 let raf=0,disposed=false,lastFrame=performance.now(),time=0;
 function makeActor(data){
  const id=data.id,info=identity(data,arena);
  const role=info.role;
  const hex=role==='tank'?0x929faa:role==='healer'?0x9bbf9f:role==='enemy'?0x87515a:role==='pet'?0x9f84b7:
   info.klass.includes('mage')?0x638fc0:info.klass.includes('rogue')?0x789b72:info.klass.includes('hunter')?0x9f956e:0x988ab4;
  const armor=mat(hex,{metalness:.35}),skin=mat(0xc7a68e),steel=mat(0xc9d0d9,{metalness:.72,roughness:.32});
  const group=new THREE.Group(),body=new THREE.Group(),right=new THREE.Group(),left=new THREE.Group();
  mesh(body,new THREE.CylinderGeometry(.3,.38,.9,8),armor,0,.98,0);
  mesh(body,new THREE.SphereGeometry(.24,10,8),skin,0,1.69,0);
  mesh(body,new THREE.ConeGeometry(.3,.38,7),armor,0,2.01,0);
  for(const k of [-1,1])mesh(body,new THREE.BoxGeometry(.23,.65,.3),armor,k*.16,.29,0);
  right.position.set(.37,1.34,0);left.position.set(-.37,1.34,0);
  mesh(right,new THREE.BoxGeometry(.21,.77,.25),armor,.1,-.32,0);
  mesh(left,new THREE.BoxGeometry(.21,.77,.25),armor,-.1,-.32,0);
  body.add(right,left);
  if(role==='tank'){
   mesh(left,new THREE.BoxGeometry(.62,.82,.12),edge,-.28,-.36,.27);
   mesh(right,new THREE.BoxGeometry(.11,.98,.15),steel,.16,-.5,.1);
  }else if(role==='healer'||/mage|priest|warlock|druid|shaman|evoker/.test(info.klass)){
   mesh(right,new THREE.CylinderGeometry(.07,.07,1.5,8),steel,.18,-.13,.12);
   mesh(right,new THREE.IcosahedronGeometry(.15),role==='healer'?mat(0x82dfb7,{emissive:0x3a9c81}):bright,.18,.63,.12);
  }else if(/hunter/.test(info.klass)){
   mesh(right,new THREE.TorusGeometry(.46,.045,6,18,Math.PI),edge,.2,-.24,.17);
  }else mesh(right,new THREE.BoxGeometry(.12,1.02,.15),steel,.14,-.38,.23);
  group.add(body);
  const marker=new THREE.Mesh(new THREE.RingGeometry(info.boss?.84:.44,info.boss?.94:.51,28),new THREE.MeshBasicMaterial({color:role==='enemy'?0xf07761:0x72a9b3,transparent:true,opacity:.5,side:THREE.DoubleSide}));
  marker.rotation.x=-Math.PI/2;marker.position.y=-.055;group.add(marker);
  if(info.boss)group.scale.setScalar(1.65);
  const label=document.createElement('span');label.className='cb3d-name';label.textContent=info.name;labels.appendChild(label);
  const p=toWorld(data.position);group.position.set(p.x,0,p.z);scene.add(group);
  const actor={id,data,group,body,right,left,label,position:{...p},destination:null,from:null,travelStart:0,travelEnd:0,castUntil:0,hitUntil:0,attackUntil:0,healUntil:0,dead:!data.alive,boss:info.boss,team:role,active:true};
  if(actor.dead)group.scale.y=info.boss?.5:.3;
  actors.set(id,actor);return actor;
 }
 function actorFor(data){
  if(!data?.id)return null;
  const found=actors.get(data.id);
  if(found){found.data=data;return found;}
  if(actors.size>=MAX_UNITS)return null;
  return makeActor(data);
 }
 function syncSnapshot(){
  for(const data of snapshot.units.values()){
   const actor=actorFor(data);if(!actor)continue;
   const p=toWorld(data.destination||data.position);
   actor.position={...p};actor.group.position.set(p.x,0,p.z);
   actor.dead=data.alive===false;
  }
  refreshHazards();
 }
 function visualRing(id,entry,persistent=false){
  const p=toWorld(entry.position);
  const radius=clamp(entry.radius||10,3,35)*.075;
  const group=new THREE.Group();
  let shape;
  const kind=String(entry.type||'circle');
  if(/cone|frontal|cleave/.test(kind)){
   shape=new THREE.RingGeometry(.05,Math.max(.65,radius),32,1,-Math.PI*.25,Math.PI*.5);
  }else if(/line|beam/.test(kind))shape=new THREE.PlaneGeometry(Math.max(.7,radius*.68),Math.max(1,radius*2));
  else shape=new THREE.CircleGeometry(Math.max(.65,radius),32);
  const color=persistent?0xda6438:0xffb75b;
  const mesh2=new THREE.Mesh(shape,new THREE.MeshBasicMaterial({color,transparent:true,opacity:persistent?.23:.31,side:THREE.DoubleSide,depthWrite:false}));
  mesh2.rotation.x=-Math.PI/2;mesh2.position.set(p.x,-.042,p.z);group.add(mesh2);
  const outline=new THREE.Mesh(new THREE.RingGeometry(Math.max(.45,radius)*.95,Math.max(.5,radius),32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,side:THREE.DoubleSide}));
  outline.rotation.x=-Math.PI/2;outline.position.set(p.x,-.037,p.z);group.add(outline);
  scene.add(group);return group;
 }
 function releaseObject(object,skipShared=false){
  object.traverse(o=>{
   o.geometry?.dispose?.();
   const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
   for(const m of ms)if(!skipShared||(m!==bright&&m!==edge))m.dispose?.();
  });
  object.parent?.remove(object);
 }
 function refreshHazards(){
  const wanted=new Map([...snapshot.telegraphs,...snapshot.hazards]);
  for(const [id,obj] of hazards){if(!wanted.has(id)){releaseObject(obj);hazards.delete(id);}}
  for(const [id,h] of wanted)if(!hazards.has(id))hazards.set(id,visualRing(id,h,snapshot.hazards.has(id)));
 }
 function flash(at,color=0xffcb7a,scale=.18,life=.3){
  if(!at)return;
  const p=new THREE.Mesh(new THREE.IcosahedronGeometry(scale,0),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.87,depthWrite:false}));
  p.position.copy(at.group.position);p.position.y=at.boss?2.6:1.28;scene.add(p);
  flashes.push({object:p,end:time+life,start:time,life});
  if(flashes.length>30){const old=flashes.shift();old.object.parent?.remove(old.object);old.object.geometry.dispose();old.object.material.dispose();}
 }
 function shoot(source,target,e){
  if(!source||!target||shots.length>=24)return;
  const skill=String(e?.ability||'').toLowerCase();
  const color=/heal|renew|mend|restor/.test(skill)?0x7cdbb1:/fire|flame|burn|ember/.test(skill)?0xf9a254:/frost|ice/.test(skill)?0x99d5fb:0x9eaddd;
  const obj=new THREE.Mesh(new THREE.SphereGeometry(.13,9,7),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95}));
  const from=new THREE.Vector3(source.group.position.x,1.55,source.group.position.z);
  const to=new THREE.Vector3(target.group.position.x,target.boss?2.2:1.25,target.group.position.z);
  obj.position.copy(from);scene.add(obj);
  shots.push({object:obj,from,to,start:time,duration:.32});
 }
 function onEvent(e){
  if(disposed)return;
  if(e.type==='COMBAT_START'){
   for(const a of actors.values()){releaseObject(a.group,true);a.label.remove();}
   actors.clear();for(const shot of shots)releaseObject(shot.object);shots.length=0;syncSnapshot();
  }
  const u=actorFor(snapshot.units.get(safeId(e.source))),t=actorFor(snapshot.units.get(safeId(e.target)));
  if(e.type==='MOVEMENT_START'&&u&&point(e.payload?.to)){
   u.from={...u.group.position};u.destination=toWorld(e.payload.to);
   u.travelStart=time;u.travelEnd=time+clamp(Number(e.payload.duration)||440,140,1500)/1000;
  }
  if(e.type==='MOVEMENT_END'&&u&&point(e.position)){
   const p=toWorld(e.position);u.group.position.set(p.x,0,p.z);u.position=p;u.destination=null;
  }
  if((e.type==='ABILITY_START'||e.type==='CAST_START')&&u){
   u.attackUntil=time+.55;u.castUntil=e.type==='CAST_START'?time+clamp(Number(e.payload?.duration)||750,200,3000)/1000:0;
   if(t){const dx=t.group.position.x-u.group.position.x,dz=t.group.position.z-u.group.position.z;u.group.rotation.y=Math.atan2(dx,dz);}
   if(/heal|bless|light|holy|renew/i.test(String(e.ability||'')))flash(u,0x78dcb6,.21,.42);
   else if(e.type==='CAST_START')flash(u,0x829bf4,.24,.5);
   if(e.type==='ABILITY_START'&&t&&!/tank|melee/.test(normalizeRole(u.data)))shoot(u,t,e);
  }
  if(e.type==='PET_SUMMONED')actorFor(snapshot.units.get(safeId(e.payload?.petId||e.target)));
  if(e.type==='PET_DISMISSED'){
   const petId=safeId(e.payload?.petId||e.target),pet=actors.get(petId);
   if(pet){releaseObject(pet.group,true);pet.label.remove();actors.delete(petId);}
  }
  if(e.type==='DAMAGE_DEALT'&&t){t.hitUntil=time+.24;flash(t,e.result==='critical'?0xffe7a0:0xf18166,e.result==='critical'?.36:.21);}
  if(e.type==='HEAL_RECEIVED'&&t){t.healUntil=time+.42;flash(t,0x7fe6a6,.29,.45);}
  if(e.type==='INTERRUPT'&&e.result==='success'&&t){t.castUntil=0;flash(t,0x8cd8ed,.36,.42);}
  if((e.type==='CAST_FINISH'||e.type==='CAST_CANCELLED'||e.type==='ABILITY_FINISH')&&u)u.castUntil=0;
  if(e.type==='DEFENSIVE_ACTIVATED'){flash(t||u,0xe5d09a,.46,.65);}
  if(['PLAYER_DEFEATED','ENEMY_DEFEATED','ADD_DEFEATED'].includes(e.type)&&t){t.dead=true;flash(t,0xf5ab6b,.46,.55);}
  if(['PLAYER_REVIVED','ENEMY_REVIVED'].includes(e.type)&&t){t.dead=false;flash(t,0x7fe6a6,.36,.6);}
  if(e.type==='COMBAT_END'){notice.textContent='Battle finished • 3D view mirrors the completed encounter';}
  if(actors.size>=MAX_UNITS)notice.textContent='3D alpha supports up to '+MAX_UNITS+' visible units; return to 2D for larger battles.';
  if(/^(MECHANIC_|GROUND_HAZARD_)/.test(e.type)||e.type==='COMBAT_START'||e.type==='COMBAT_END')refreshHazards();
 }
 function resize(){
  const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight),aspect=w/h;
  const viewHeight=Math.max(12,20/Math.max(.45,aspect));
  camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
 }
 const watcher=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;watcher?.observe(stage);
 if(!watcher)window.addEventListener('resize',resize);
 resize();
 const dummy=new THREE.Vector3();
 function draw(now){
  raf=0;if(disposed||document.hidden)return;
  if(!arena.isConnected||arena.closest('[hidden]')){dispose();return;}
  const dt=clamp((now-lastFrame)/1000,0,.05);lastFrame=now;time+=dt;
  for(const actor of actors.values()){
   const dest=actor.destination;
   if(dest){
    const span=Math.max(.06,actor.travelEnd-actor.travelStart),t=clamp((time-actor.travelStart)/span,0,1),ease=t*t*(3-2*t);
    actor.group.position.x=actor.from.x+(dest.x-actor.from.x)*ease;
    actor.group.position.z=actor.from.z+(dest.z-actor.from.z)*ease;
    const dx=dest.x-actor.from.x,dz=dest.z-actor.from.z;
    if(Math.hypot(dx,dz)>.05)actor.group.rotation.y=Math.atan2(dx,dz);
    if(t>=1){actor.position={...dest};actor.destination=null;}
   }
   const running=Boolean(dest),attacking=time<actor.attackUntil,casting=time<actor.castUntil;
   const swinging=running?Math.sin(time*11):attacking?Math.sin(time*17):Math.sin(time*2)*.08;
   actor.right.rotation.x=running?swinging*.53:attacking?-Math.abs(swinging)*1.12:casting?-.86:0;
   actor.left.rotation.x=running?-swinging*.45:attacking?Math.abs(swinging)*.34:casting?-.65:0;
   actor.body.rotation.x=time<actor.hitUntil?-.14:0;
   const originalSize=actor.boss?1.65:1;
   const settle=actor.dead?.25:1,desiredY=originalSize*settle;
   actor.group.scale.y+=(desiredY-actor.group.scale.y)*Math.min(1,dt*10);
   actor.group.position.y=actor.dead?-.17:running?Math.abs(Math.sin(time*11))*.055:Math.sin(time*2+actor.id.length)*.016;
   if(actor.label.isConnected){
    dummy.set(actor.group.position.x,actor.boss?3.55:2.45,actor.group.position.z).project(camera);
    actor.label.style.transform='translate(-50%,-50%) translate('+((dummy.x*.5+.5)*stage.clientWidth).toFixed(1)+'px,'+((-dummy.y*.5+.5)*stage.clientHeight).toFixed(1)+'px)';
    actor.label.hidden=actor.dead||dummy.z>1||dummy.z< -1;
   }
  }
  for(let i=shots.length-1;i>=0;i--){
   const shot=shots[i],t=(time-shot.start)/shot.duration;
   if(t>=1){releaseObject(shot.object);shots.splice(i,1);}
   else{shot.object.position.lerpVectors(shot.from,shot.to,t);shot.object.position.y+=Math.sin(t*Math.PI)*.009;}
  }
  for(let i=flashes.length-1;i>=0;i--){
   const f=flashes[i],t=(time-f.start)/f.life;
   if(t>=1){scene.remove(f.object);f.object.geometry.dispose();f.object.material.dispose();flashes.splice(i,1);}
   else{f.object.scale.setScalar(1+t*2.7);f.object.material.opacity=(1-t)*.85;}
  }
  renderer.render(scene,camera);
  raf=requestAnimationFrame(draw);
 }
 function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(!disposed&&!raf){lastFrame=performance.now();raf=requestAnimationFrame(draw);}}
 document.addEventListener('visibilitychange',visibility);
 syncSnapshot();raf=requestAnimationFrame(draw);
 function dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);
  document.removeEventListener('visibilitychange',visibility);
  watcher?.disconnect();if(!watcher)window.removeEventListener('resize',resize);
  for(const a of actors.values())a.label.remove();
  scene.traverse(o=>{o.geometry?.dispose?.();const mats=o.material?Array.isArray(o.material)?o.material:[o.material]:[];for(const m of mats)m.dispose?.();});
  renderer.dispose();renderer.forceContextLoss();stage.remove();
  live.delete(arena);
 }
 return{dispose,onEvent,syncSnapshot,stage};
}
function isOwner(){
 return Boolean(window.CellboundCombatUILayoutEditor?.isOwner?.());
}
function attach(shell){
 if(!isOwner()||!shell?.isConnected||shell.dataset.cb3dReady)return;
 const arena=shell.querySelector('.cbcombat-arena-wrap > .cb2d-arena,.cbcombat-arena-wrap > [data-combat-arena]');
 const toolbar=shell.querySelector('.cbcombat-header-actions');
 if(!arena||!toolbar)return;
 shell.dataset.cb3dReady='1';
 const button=document.createElement('button');button.type='button';button.className='cb3d-toggle';
 button.textContent='3D Alpha';button.title='Owner test: display real combat events in the 3D renderer';
 button.setAttribute('aria-pressed','false');
 toolbar.prepend(button);
 button.addEventListener('click',async()=>{
  if(live.has(arena)){
   live.get(arena).dispose();button.textContent='3D Alpha';button.setAttribute('aria-pressed','false');
   return;
  }
  if(!isOwner())return;
  button.disabled=true;button.textContent='Loading 3D…';
  const s=states.get(arena)||createSnapshot();
  states.set(arena,s);
  if(s.units.size>MAX_UNITS){button.textContent='3D limit';button.title='3D alpha currently supports 32 combatants';button.disabled=false;return;}
  try{
   const controller=await mountLive(arena,s);
   if(!arena.isConnected||!shell.isConnected||!isOwner()){controller.dispose();return;}
   live.set(arena,controller);
   button.textContent='Return to 2D';button.setAttribute('aria-pressed','true');
  }catch(error){
   console.warn('Cellbound 3D mode unavailable',error);
   button.textContent='3D unavailable';
   button.title=String(error?.message||error);
   button.setAttribute('aria-pressed','false');
  }finally{button.disabled=false;}
 });
}
function scan(root=document){
 if(!isOwner())return;
 if(root.matches?.('.cbcombat-shell'))attach(root);
 for(const shell of root.querySelectorAll?.('.cbcombat-shell')||[])attach(shell);
}
let scheduled=false;
const observer=new MutationObserver(records=>{
 let relevant=false;
 for(const record of records)for(const node of record.addedNodes){
  if(node.nodeType!==1)continue;
  if(node.matches?.('.cbcombat-shell,.cbcombat-header-actions,[data-combat-arena]')||node.querySelector?.('.cbcombat-shell')){relevant=true;break;}
 }
 if(relevant&&!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan();});}
});
function init(){
 scan();
 observer.observe(document.documentElement,{childList:true,subtree:true});
}
window.addEventListener('cellbound:admin-status',()=>scan());
window.addEventListener('cellbound:view-changed',()=>scan());
window.addEventListener('cellbound:combat-visual',event=>{
 const detail=event?.detail||{},arena=detail.arena,e=detail.event;
 if(!arena||!e)return;
 let s=states.get(arena);
 if(!s){s=createSnapshot();states.set(arena,s);}
 reduce(s,e);
 const controller=live.get(arena);
 if(controller){if(isOwner())controller.onEvent(e);else controller.dispose();}
 if(isOwner()&&!arena.closest('.cbcombat-shell')?.dataset.cb3dReady)scan(arena.closest('.cbcombat-shell')||document);
},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CellboundThreeCombat=Object.freeze({version:VERSION,createSnapshot,reduce,toWorld,isOwner});
})();