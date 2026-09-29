(function(){
'use strict';
const VERSION='0.1.0';
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js';
const CLASS_COLOURS={
 warrior:0xC69B6D,paladin:0xF48CBA,hunter:0xAAD372,rogue:0xFFF468,priest:0xFFFFFF,
 'death-knight':0xC41E3A,shaman:0x0070DD,mage:0x3FC7EB,warlock:0x8788EE,
 monk:0x00FF98,druid:0xFF7C0A,'demon-hunter':0xA330C9,evoker:0x33937F
};
let loadPromise=null;
const S={active:false,loading:false,arena:null,layer:null,scene:null,camera:null,renderer:null,world:null,labels:null,badge:null,units:new Map(),moves:new Map(),effects:[],telegraphs:new Map(),hazards:new Map(),frame:0,last:0,resize:null};

function loadThree(){
 if(window.THREE)return Promise.resolve(window.THREE);
 if(loadPromise)return loadPromise;
 loadPromise=new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-cellbound-three]');
  if(existing){existing.addEventListener('load',()=>window.THREE?resolve(window.THREE):reject(new Error('Three.js unavailable')),{once:true});existing.addEventListener('error',()=>reject(new Error('Three.js failed to load')),{once:true});return}
  const script=document.createElement('script');script.src=THREE_URL;script.async=true;script.dataset.cellboundThree='1';
  script.onload=()=>window.THREE?resolve(window.THREE):reject(new Error('Three.js unavailable after load'));
  script.onerror=()=>reject(new Error('Three.js failed to load'));
  document.head.appendChild(script)
 });
 return loadPromise
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function pct(n,fallback=50){n=Number(n);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):fallback}
function worldPos(x,y){return{x:(pct(x)-50)*.14,z:(pct(y)-50)*.09}}
function disposeMaterial(m){if(Array.isArray(m))m.forEach(disposeMaterial);else if(m&&m.dispose)m.dispose()}
function disposeObject(o){if(!o)return;o.traverse?.(x=>{x.geometry?.dispose?.();disposeMaterial(x.material)});o.parent?.remove(o)}
function arena(){return document.getElementById('cb2dArena')}
function button(){return document.querySelector('[data-cb3d-toggle]')}
function firstText(el){
 const s=el?.querySelector('span');if(!s)return el?.dataset?.unit||'Unit';
 const node=[...s.childNodes].find(n=>n.nodeType===3&&String(n.textContent||'').trim());
 return String(node?.textContent||s.textContent||el.dataset.unit||'Unit').trim().split(/\n/)[0]
}
function classKey(el){
 const c=[...(el?.classList||[])].find(x=>x.startsWith('class-'));
 return c?c.slice(6):''
}
function unitColour(el,isEnemy){
 if(isEnemy)return 0x9f463e;
 const key=classKey(el);if(CLASS_COLOURS[key]!=null)return CLASS_COLOURS[key];
 if(el?.classList?.contains('tank'))return 0xc39a5c;
 if(el?.classList?.contains('healer'))return 0x6ca78a;
 return 0x6f91a8
}
function makeTextLabel(id,name,isEnemy){
 const root=S.labels;if(!root)return null;
 const el=document.createElement('div');el.className='cb3d-label'+(isEnemy?' enemy':'');el.dataset.cb3dLabel=id;
 el.innerHTML='<b>'+esc(name)+'</b><em><i></i></em>';root.appendChild(el);return el
}
function makeUnit(id,name,isEnemy,boss,colour,pos){
 const T=window.THREE,g=new T.Group(),scale=boss?1.45:(isEnemy?1.12:1);
 const bodyMat=new T.MeshStandardMaterial({color:colour,roughness:.72,metalness:.08});
 const darkMat=new T.MeshStandardMaterial({color:isEnemy?0x211214:0x111719,roughness:.9});
 const body=new T.Mesh(new T.CylinderGeometry(.28*scale,.34*scale,.92*scale,10),bodyMat);body.position.y=.55*scale;g.add(body);
 const head=new T.Mesh(new T.SphereGeometry(.24*scale,12,10),new T.MeshStandardMaterial({color:isEnemy?0x6e3431:0xc9b5a1,roughness:.85}));head.position.y=1.16*scale;g.add(head);
 const legs=new T.Mesh(new T.CylinderGeometry(.22*scale,.27*scale,.46*scale,8),darkMat);legs.position.y=.08*scale;g.add(legs);
 const ring=new T.Mesh(new T.TorusGeometry(.43*scale,.035,6,30),new T.MeshBasicMaterial({color:colour,transparent:true,opacity:.85}));ring.rotation.x=Math.PI/2;ring.position.y=.025;g.add(ring);
 if(isEnemy){
  const shoulder=new T.Mesh(new T.BoxGeometry(.92*scale,.16*scale,.28*scale),new T.MeshStandardMaterial({color:0x35191b,roughness:.8}));shoulder.position.y=.86*scale;g.add(shoulder)
 }
 g.position.set(pos.x,0,pos.z);g.userData={id,isEnemy,boss,baseScale:scale};S.world.add(g);
 const label=makeTextLabel(id,name,isEnemy);
 const unit={id,name,isEnemy,boss,group:g,label,hp:100,dead:false};
 S.units.set(id,unit);return unit
}
function infoFromDom(el){
 const id=String(el?.dataset?.unit||'');if(!id)return null;
 const isEnemy=id.startsWith('e-')||id.startsWith('add-')||el.classList.contains('enemy');
 const boss=el.classList.contains('boss')||el.classList.contains('big');
 return{id,name:firstText(el),isEnemy,boss,colour:unitColour(el,isEnemy),x:pct(el.dataset.x),y:pct(el.dataset.y)}
}
function ensureDomUnit(el){
 const info=infoFromDom(el);if(!info)return null;
 let u=S.units.get(info.id);if(!u)u=makeUnit(info.id,info.name,info.isEnemy,info.boss,info.colour,worldPos(info.x,info.y));
 else if(!S.moves.has(info.id)){const p=worldPos(info.x,info.y);u.group.position.x=p.x;u.group.position.z=p.z}
 const fill=el.querySelector('.cb2d-unit-hp i');if(fill){const w=parseFloat(fill.style.width);if(Number.isFinite(w))setHp(info.id,w)}
 if(el.classList.contains('dead'))setDead(info.id,true);
 return u
}
function rebuild(){
 if(!S.active||!S.world)return;
 const seen=new Set();
 document.querySelectorAll('#cb2dUnits [data-unit]').forEach(el=>{const u=ensureDomUnit(el);if(u)seen.add(u.id)});
 for(const [id,u] of S.units){if(!seen.has(id)){disposeObject(u.group);u.label?.remove();S.units.delete(id);S.moves.delete(id)}}
}
function setHp(id,value){
 const u=S.units.get(String(id));if(!u)return;u.hp=Math.max(0,Math.min(100,Number(value)||0));
 const fill=u.label?.querySelector('em i');if(fill)fill.style.width=u.hp+'%'
}
function setDead(id,dead){
 const u=S.units.get(String(id));if(!u)return;u.dead=Boolean(dead);u.label?.classList.toggle('dead',u.dead);
 if(u.dead){u.group.rotation.z=-Math.PI*.42;u.group.position.y=-.08}else{u.group.rotation.z=0;u.group.position.y=0}
}
function ensureEventUnit(id,e){
 id=String(id||'');if(!id)return null;let u=S.units.get(id);if(u)return u;
 const dom=document.querySelector('[data-unit="'+CSS.escape(id)+'"]');if(dom)return ensureDomUnit(dom);
 const isEnemy=id.startsWith('e-')||id.startsWith('add-'),p=e?.position||e?.payload?.position||{x:isEnemy?72:28,y:50};
 return makeUnit(id,e?.payload?.name||id,isEnemy,false,isEnemy?0x9f463e:0x7aa4ba,worldPos(p.x,p.y))
}
function resize(){
 if(!S.renderer||!S.camera||!S.arena)return;const r=S.arena.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
 S.renderer.setSize(w,h,false);S.camera.aspect=w/h;S.camera.updateProjectionMatrix()
}
function buildEnvironment(){
 const T=window.THREE;
 S.scene=new T.Scene();S.scene.background=new T.Color(0x06090b);S.scene.fog=new T.Fog(0x06090b,14,27);
 S.camera=new T.PerspectiveCamera(44,1,.1,80);S.camera.position.set(8.7,9.6,10.8);S.camera.lookAt(0,.3,0);
 S.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 S.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 if('outputColorSpace'in S.renderer&&T.SRGBColorSpace)S.renderer.outputColorSpace=T.SRGBColorSpace;
 S.world=new T.Group();S.scene.add(S.world);
 S.scene.add(new T.HemisphereLight(0x8faeba,0x17110d,1.35));
 const key=new T.DirectionalLight(0xd6b87b,1.45);key.position.set(-4,10,6);S.scene.add(key);
 const cold=new T.PointLight(0x398fb0,18,16);cold.position.set(4,4,-3);S.scene.add(cold);
 const floor=new T.Mesh(new T.PlaneGeometry(16,10),new T.MeshStandardMaterial({color:0x11191a,roughness:.94,metalness:.06}));floor.rotation.x=-Math.PI/2;floor.position.y=-.04;S.scene.add(floor);
 const grid=new T.GridHelper(16,16,0x3f514d,0x23312f);grid.scale.z=.625;grid.position.y=0;S.scene.add(grid);
 const wallMat=new T.MeshStandardMaterial({color:0x151b1d,roughness:.88,metalness:.18});
 const wallGeoH=new T.BoxGeometry(16.4,1.5,.28),wallGeoV=new T.BoxGeometry(.28,1.5,10.3);
 [[wallGeoH,0,.72,-5.08],[wallGeoH,0,.72,5.08],[wallGeoV,-8.08,.72,0],[wallGeoV,8.08,.72,0]].forEach(([geo,x,y,z])=>{const m=new T.Mesh(geo,wallMat);m.position.set(x,y,z);S.scene.add(m)});
 for(const [x,z] of [[-5,-3.1],[-5,3.1],[5,-3.1],[5,3.1]]){const p=new T.Mesh(new T.CylinderGeometry(.28,.34,1.7,8),wallMat);p.position.set(x,.82,z);S.scene.add(p)}
}
function mount(a){
 if(S.arena===a&&S.layer&&S.renderer)return;
 destroyScene();S.arena=a;
 const layer=document.createElement('div');layer.className='cb3d-layer';layer.hidden=false;
 layer.innerHTML='<div class="cb3d-badge">3D COMBAT PROTOTYPE<span>Combat Reborn simulation · experimental renderer</span></div><div class="cb3d-labels"></div>';
 a.appendChild(layer);S.layer=layer;S.labels=layer.querySelector('.cb3d-labels');S.badge=layer.querySelector('.cb3d-badge');
 buildEnvironment();layer.insertBefore(S.renderer.domElement,S.labels);resize();
 S.resize=new ResizeObserver(resize);S.resize.observe(a)
}
function destroyScene(){
 if(S.frame)cancelAnimationFrame(S.frame);S.frame=0;S.resize?.disconnect?.();S.resize=null;
 S.moves.clear();S.effects.length=0;
 for(const u of S.units.values()){disposeObject(u.group);u.label?.remove()}S.units.clear();
 for(const x of S.telegraphs.values())removeVisual(x);S.telegraphs.clear();
 for(const x of S.hazards.values())removeVisual(x);S.hazards.clear();
 S.renderer?.dispose?.();S.layer?.remove();
 S.arena=S.layer=S.scene=S.camera=S.renderer=S.world=S.labels=S.badge=null
}
function removeVisual(v){
 const list=Array.isArray(v)?v:[v];list.filter(Boolean).forEach(x=>{disposeObject(x.mesh||x);if(x.label)x.label.remove()})
}
function animateTo(id,x,y,duration=360,speed=1){
 const u=ensureEventUnit(id,{position:{x,y}});if(!u)return;const p=worldPos(x,y),now=performance.now();
 S.moves.set(id,{from:{x:u.group.position.x,z:u.group.position.z},to:p,start:now,duration:Math.max(80,Number(duration||360)/Math.max(.25,Number(speed)||1))})
}
function snapTo(id,x,y){const u=ensureEventUnit(id,{position:{x,y}});if(!u)return;const p=worldPos(x,y);u.group.position.x=p.x;u.group.position.z=p.z;S.moves.delete(id)}
function effectRing(pos,colour=0xffffff,duration=340,maxScale=2){
 const T=window.THREE,mat=new T.MeshBasicMaterial({color:colour,transparent:true,opacity:.8,depthWrite:false}),mesh=new T.Mesh(new T.RingGeometry(.22,.3,28),mat);
 mesh.rotation.x=-Math.PI/2;mesh.position.set(pos.x,.035,pos.z);S.world.add(mesh);S.effects.push({mesh,mat,start:performance.now(),duration,maxScale});return mesh
}
function pulseUnit(id,colour){const u=S.units.get(String(id));if(u)effectRing(u.group.position,colour,320,2.6)}
function projectile(source,target,colour=0xffffff,duration=260){
 const a=S.units.get(String(source)),b=S.units.get(String(target));if(!a||!b)return;
 const T=window.THREE,mat=new T.MeshBasicMaterial({color:colour}),mesh=new T.Mesh(new T.SphereGeometry(.095,8,6),mat);
 mesh.position.copy(a.group.position);mesh.position.y=.8;S.world.add(mesh);
 S.effects.push({mesh,mat,start:performance.now(),duration,from:a.group,to:b.group,projectile:true})
}
function unitPosition(id,fallback){const u=S.units.get(String(id));if(u)return{x:u.group.position.x,z:u.group.position.z};return fallback||{x:0,z:0}}
function planeDisc(x,z,r,colour,opacity=.28){
 const T=window.THREE,mat=new T.MeshBasicMaterial({color:colour,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}),mesh=new T.Mesh(new T.CircleGeometry(Math.max(.25,r),40),mat);
 mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.018,z);S.world.add(mesh);return mesh
}
function telegraph(e){
 const type=String(e?.payload?.mechanicType||''),token=String(e?.payload?.token||('tg-'+e.timestamp)),source=e.source||'e-0',target=e.payload?.targetId||e.target;
 const red=0xb84f46,amber=0xc58b45,visuals=[];
 const sourcePos=unitPosition(source),targetPos=unitPosition(target,sourcePos);
 if(type==='circle'||type==='persistent-circle'||type==='target-circle')visuals.push(planeDisc(targetPos.x,targetPos.z,type==='persistent-circle'?1.5:1.25,red,.3));
 else if(type==='circles'){
  const ids=(e.payload?.targetIds||[]);(ids.length?ids:[target]).filter(Boolean).forEach(id=>{const p=unitPosition(id);visuals.push(planeDisc(p.x,p.z,1.0,red,.28))})
 }else if(type==='line'||type==='healer-swipe'){
  const T=window.THREE,dx=targetPos.x-sourcePos.x,dz=targetPos.z-sourcePos.z,len=Math.max(.6,Math.hypot(dx,dz)),mat=new T.MeshBasicMaterial({color:red,transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide}),mesh=new T.Mesh(new T.PlaneGeometry(len,.7),mat);
  mesh.rotation.x=-Math.PI/2;mesh.rotation.z=-Math.atan2(dz,dx);mesh.position.set((sourcePos.x+targetPos.x)/2,.025,(sourcePos.z+targetPos.z)/2);S.world.add(mesh);visuals.push(mesh)
 }else if(type==='cone'){
  const T=window.THREE,mat=new T.MeshBasicMaterial({color:red,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide}),mesh=new T.Mesh(new T.CircleGeometry(3.25,36,-Math.PI/4,Math.PI/2),mat);
  mesh.rotation.x=-Math.PI/2;mesh.rotation.z=-Math.atan2(targetPos.z-sourcePos.z,targetPos.x-sourcePos.x);mesh.position.set(sourcePos.x,.028,sourcePos.z);S.world.add(mesh);visuals.push(mesh)
 }else if(type==='adds'){visuals.push(planeDisc(3.2,-1.7,.75,amber,.35),planeDisc(3.2,1.7,.75,amber,.35))}
 else visuals.push(planeDisc(sourcePos.x,sourcePos.z,.8,type==='interrupt'?amber:red,.28));
 if(visuals.length)S.telegraphs.set(token,visuals)
}
function clearTelegraph(token){const key=String(token||'');const v=S.telegraphs.get(key);if(v){removeVisual(v);S.telegraphs.delete(key)}}
function spawnHazard(e){
 if(!e?.position)return;const id=String(e.payload?.hazardId||('hazard-'+e.timestamp)),p=worldPos(e.position.x,e.position.y),r=Math.max(.45,Math.min(3.4,(Number(e.payload?.radius)||10)*.14));
 const mesh=planeDisc(p.x,p.z,r,0x9e3f3b,.26);S.hazards.set(id,mesh)
}
function clearHazard(id){id=String(id||'');const v=S.hazards.get(id);if(v){removeVisual(v);S.hazards.delete(id)}}
function updateLabels(){
 if(!S.camera||!S.renderer)return;const T=window.THREE,w=S.renderer.domElement.clientWidth,h=S.renderer.domElement.clientHeight;
 for(const u of S.units.values()){
  if(!u.label)continue;const p=u.group.position.clone();p.y+=(u.boss?2.2:u.isEnemy?1.8:1.65);p.project(S.camera);
  const visible=p.z<1&&p.z>-1;u.label.style.display=visible?'block':'none';if(!visible)continue;
  u.label.style.left=((p.x*.5+.5)*w)+'px';u.label.style.top=((-p.y*.5+.5)*h)+'px'
 }
}
function tick(now){
 if(!S.active||!S.renderer||!S.scene){S.frame=0;return}
 const dt=Math.min(.05,Math.max(0,(now-(S.last||now))/1000));S.last=now;
 for(const [id,m] of S.moves){
  const u=S.units.get(id);if(!u){S.moves.delete(id);continue}const t=Math.min(1,(now-m.start)/m.duration),q=1-Math.pow(1-t,3);
  u.group.position.x=m.from.x+(m.to.x-m.from.x)*q;u.group.position.z=m.from.z+(m.to.z-m.from.z)*q;
  if(t>=1)S.moves.delete(id)
 }
 for(let i=S.effects.length-1;i>=0;i--){
  const fx=S.effects[i],t=Math.min(1,(now-fx.start)/Math.max(1,fx.duration));
  if(fx.projectile&&fx.from&&fx.to){fx.mesh.position.lerpVectors(fx.from.position,fx.to.position,t);fx.mesh.position.y=.75+Math.sin(Math.PI*t)*.65}
  else{const sc=1+t*(fx.maxScale-1);fx.mesh.scale.set(sc,sc,sc);if(fx.mat)fx.mat.opacity=.8*(1-t)}
  if(t>=1){disposeObject(fx.mesh);S.effects.splice(i,1)}
 }
 for(const u of S.units.values()){if(!u.dead)u.group.rotation.y+=dt*(u.isEnemy?.08:.04)}
 updateLabels();S.renderer.render(S.scene,S.camera);S.frame=requestAnimationFrame(tick)
}
function startLoop(){if(!S.frame){S.last=performance.now();S.frame=requestAnimationFrame(tick)}}
async function activate(){
 if(S.loading||S.active)return;const btn=button();S.loading=true;if(btn){btn.disabled=true;btn.textContent='LOADING 3D…'}
 try{
  await loadThree();const a=arena();if(!a)throw new Error('Combat arena is not open');
  mount(a);S.active=true;a.classList.add('cb3d-active');if(S.layer)S.layer.hidden=false;rebuild();startLoop();
  if(btn){btn.disabled=false;btn.classList.add('active');btn.textContent='2D VIEW'}
 }catch(error){
  console.warn('Cellbound 3D prototype unavailable',error);const a=arena();if(a){let msg=a.querySelector('.cb3d-error');if(!msg){msg=document.createElement('div');msg.className='cb3d-error';msg.textContent='3D prototype could not start. The normal 2D combat viewer is still available.';a.appendChild(msg);setTimeout(()=>msg.remove(),3500)}}
  if(btn){btn.disabled=false;btn.textContent='3D TEST'}
 }finally{S.loading=false}
}
function deactivate(){
 if(!S.active)return;S.active=false;if(S.frame)cancelAnimationFrame(S.frame);S.frame=0;
 S.arena?.classList.remove('cb3d-active');if(S.layer)S.layer.hidden=true;
 const btn=button();if(btn){btn.classList.remove('active');btn.textContent='3D TEST'}
}
function toggle(){S.active?deactivate():activate()}
function ensureButton(){
 const shell=document.querySelector('.cb2d-shell'),live=shell?.querySelector('.cb2d-live');if(!live)return;
 let btn=live.querySelector('[data-cb3d-toggle]');if(!btn){btn=document.createElement('button');btn.type='button';btn.dataset.cb3dToggle='1';btn.textContent='3D TEST';btn.title='Experimental 3D renderer — combat simulation is unchanged';btn.addEventListener('click',toggle);const speed=live.querySelector('[data-speed]');live.insertBefore(btn,speed||live.lastElementChild)}
 if(S.active){btn.classList.add('active');btn.textContent='2D VIEW'}
}
function event(e,result,ctx={}){
 if(!S.active||!e)return;
 if(S.arena!==arena()){const a=arena();if(a){mount(a);a.classList.add('cb3d-active');rebuild();startLoop()}}
 const speed=Math.max(.25,Number(ctx.speed)||1);
 switch(e.type){
  case'COMBAT_START':
   rebuild();
   (e.payload?.units||[]).forEach(x=>{const u=ensureEventUnit(x.id,{position:x.position});if(u&&x.position)snapTo(x.id,x.position.x,x.position.y)});
   break;
  case'MOVEMENT_START':
   if(e.payload?.to)animateTo(e.source,e.payload.to.x,e.payload.to.y,e.payload.duration||360,speed);break;
  case'MOVEMENT_END':
   if(e.position)snapTo(e.source,e.position.x,e.position.y);break;
  case'ABILITY_START':
   ensureEventUnit(e.source,e);ensureEventUnit(e.target,e);
   if(e.target)projectile(e.source,e.target,String(e.source||'').startsWith('p-')?0x7bc4df:0xc65d53,260/speed);break;
  case'HEAL_RECEIVED':
   ensureEventUnit(e.target,e);projectile(e.source,e.target,0x69d6a4,240/speed);pulseUnit(e.target,0x69d6a4);
   if(e.payload?.targetHpPct!=null)setHp(e.target,e.payload.targetHpPct);break;
  case'DAMAGE_DEALT':
   ensureEventUnit(e.target,e);pulseUnit(e.target,0xd85d54);
   if(e.payload?.targetHpPct!=null)setHp(e.target,e.payload.targetHpPct);break;
  case'PLAYER_REVIVED':
   ensureEventUnit(e.target,e);setDead(e.target,false);if(e.payload?.targetHpPct!=null)setHp(e.target,e.payload.targetHpPct);pulseUnit(e.target,0x69d6a4);break;
  case'MECHANIC_TELEGRAPH':telegraph(e);break;
  case'MECHANIC_RESOLVE':clearTelegraph(e.payload?.token);break;
  case'GROUND_HAZARD_SPAWNED':spawnHazard(e);break;
  case'GROUND_HAZARD_EXPIRED':clearHazard(e.payload?.hazardId);break;
  case'GROUND_HAZARD_TICK':{const h=S.hazards.get(String(e.payload?.hazardId||''));if(h)effectRing(h.position,0xd85d54,180,1.3);break}
  case'ADD_SPAWNED':ensureEventUnit(e.target,e);if(e.position)snapTo(e.target,e.position.x,e.position.y);pulseUnit(e.target,0xc08a47);break;
  case'ADD_DEFEATED':case'ENEMY_DEFEATED':case'PLAYER_DEFEATED':setDead(e.target,true);pulseUnit(e.target,0xc34e49);break;
  case'ENEMY_REVIVED':setDead(e.target,false);pulseUnit(e.target,0x8e6ac6);break;
  case'PHASE_CHANGE':case'ENRAGE':
   for(const u of S.units.values())if(u.isEnemy)pulseUnit(u.id,e.type==='ENRAGE'?0xe44c43:0xd2a254);break;
  case'INTERRUPT':if(e.result==='success'){pulseUnit(e.target,0xe0c36f);clearTelegraph(e.payload?.token)}break;
 }
}
function closeIfGone(){ensureButton();if(S.active&&!arena()){deactivate();destroyScene()}}
const observer=new MutationObserver(closeIfGone);observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureButton,{once:true});else ensureButton();
window.CellboundCombat3D={version:VERSION,event,toggle,activate,deactivate,isActive:()=>S.active,rebuild};
})();