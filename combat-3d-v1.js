(function(){
'use strict';
const VERSION='0.2.1';
const CLASS_COLOURS={
 warrior:[.78,.61,.43,1],paladin:[.96,.55,.73,1],hunter:[.67,.83,.45,1],rogue:[1,.96,.41,1],priest:[1,1,1,1],
 'death-knight':[.77,.12,.23,1],shaman:[0,.44,.87,1],mage:[.25,.78,.92,1],warlock:[.53,.53,.93,1],
 monk:[0,1,.6,1],druid:[1,.49,.04,1],'demon-hunter':[.64,.19,.79,1],evoker:[.2,.58,.5,1]
};
const S={active:false,arena:null,layer:null,canvas:null,gl:null,program:null,loc:null,buffers:{},labels:null,units:new Map(),moves:new Map(),effects:[],telegraphs:new Map(),hazards:new Map(),frame:0,last:0,resize:null,viewProj:null};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function pct(n,fallback=50){n=Number(n);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):fallback}
function arena(){return document.getElementById('cb2dArena')}
function button(){return document.querySelector('[data-cb3d-toggle]')}
function worldPos(x,y){return{x:(pct(x)-50)*.14,y:0,z:(pct(y)-50)*.09}}
function classKey(el){const c=[...(el?.classList||[])].find(x=>x.startsWith('class-'));return c?c.slice(6):''}
function firstText(el){
 const s=el?.querySelector('span');if(!s)return el?.dataset?.unit||'Unit';
 const node=[...s.childNodes].find(n=>n.nodeType===3&&String(n.textContent||'').trim());
 return String(node?.textContent||s.textContent||el.dataset.unit||'Unit').trim().split(/\n/)[0]
}
function unitColour(el,isEnemy){
 if(isEnemy)return[.64,.24,.22,1];
 const key=classKey(el);if(CLASS_COLOURS[key])return CLASS_COLOURS[key];
 if(el?.classList?.contains('tank'))return[.76,.59,.34,1];
 if(el?.classList?.contains('healer'))return[.42,.68,.55,1];
 return[.42,.58,.7,1]
}
function hexColour(arr){return arr}

function mat4Mul(a,b){
 const o=new Float32Array(16);
 for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
 return o
}
function perspective(fovy,aspect,near,far){
 const f=1/Math.tan(fovy/2),nf=1/(near-far),o=new Float32Array(16);
 o[0]=f/aspect;o[5]=f;o[10]=(far+near)*nf;o[11]=-1;o[14]=2*far*near*nf;return o
}
function normalize(v){const l=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/l,v[1]/l,v[2]/l]}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function lookAt(eye,target,up){
 const z=normalize([eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]]),x=normalize(cross(up,z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])
}
function model(tx,ty,tz,sx,sy,sz,ry=0){
 const c=Math.cos(ry),s=Math.sin(ry);
 return new Float32Array([c*sx,0,-s*sx,0,0,sy,0,0,s*sz,0,c*sz,0,tx,ty,tz,1])
}
function projectPoint(p){
 if(!S.viewProj||!S.canvas)return null;const m=S.viewProj,x=p.x,y=p.y,z=p.z,w=m[3]*x+m[7]*y+m[11]*z+m[15];
 if(!w)return null;const nx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,ny=(m[1]*x+m[5]*y+m[9]*z+m[13])/w,nz=(m[2]*x+m[6]*y+m[10]*z+m[14])/w;
 return{x:(nx*.5+.5)*S.canvas.clientWidth,y:(-ny*.5+.5)*S.canvas.clientHeight,visible:nz>-1&&nz<1}
}
function shader(gl,type,source){
 const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'3D shader compilation failed');
 return sh
}
function makeProgram(gl){
 const vs=shader(gl,gl.VERTEX_SHADER,'attribute vec3 aPosition;uniform mat4 uMVP;varying float vHeight;void main(){vHeight=aPosition.y;gl_Position=uMVP*vec4(aPosition,1.0);}');
 const fs=shader(gl,gl.FRAGMENT_SHADER,'precision mediump float;uniform vec4 uColor;varying float vHeight;void main(){float shade=.82+clamp(vHeight+.5,0.0,1.0)*.18;gl_FragColor=vec4(uColor.rgb*shade,uColor.a);}');
 const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'3D shader linking failed');
 gl.deleteShader(vs);gl.deleteShader(fs);return p
}
function buffer(gl,data){
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return{buffer:b,count:data.length/3}
}
function makeGeometry(gl){
 const cube=[
 -.5,-.5,.5,.5,-.5,.5,.5,.5,.5,-.5,-.5,.5,.5,.5,.5,-.5,.5,.5,
 .5,-.5,-.5,-.5,-.5,-.5,-.5,.5,-.5,.5,-.5,-.5,-.5,.5,-.5,.5,.5,-.5,
 -.5,-.5,-.5,-.5,-.5,.5,-.5,.5,.5,-.5,-.5,-.5,-.5,.5,.5,-.5,.5,-.5,
 .5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5,-.5,.5,.5,.5,-.5,.5,.5,.5,
 -.5,.5,.5,.5,.5,.5,.5,.5,-.5,-.5,.5,.5,.5,.5,-.5,-.5,.5,-.5,
 -.5,-.5,-.5,.5,-.5,-.5,.5,-.5,.5,-.5,-.5,-.5,.5,-.5,.5,-.5,-.5,.5
 ];
 const quad=[-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,-.5,.5,0,.5,-.5,0,.5];
 const lines=[];for(let i=-8;i<=8;i++){lines.push(i,0,-5,i,0,5)}for(let z=-5;z<=5;z++){lines.push(-8,0,z,8,0,z)}
 const disc=[0,0,0];const seg=40;for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2;disc.push(Math.cos(a),0,Math.sin(a))}
 return{cube:buffer(gl,cube),quad:buffer(gl,quad),grid:buffer(gl,lines),disc:buffer(gl,disc)}
}
function drawGeom(geom,m,color,mode){
 const gl=S.gl;if(!gl||!geom)return;
 gl.bindBuffer(gl.ARRAY_BUFFER,geom.buffer);gl.vertexAttribPointer(S.loc.pos,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(S.loc.pos);
 gl.uniformMatrix4fv(S.loc.mvp,false,mat4Mul(S.viewProj,m));gl.uniform4fv(S.loc.color,color);
 gl.drawArrays(mode||gl.TRIANGLES,0,geom.count)
}
function drawCube(x,y,z,sx,sy,sz,color,ry=0){drawGeom(S.buffers.cube,model(x,y,z,sx,sy,sz,ry),color)}
function drawDisc(x,z,r,color){drawGeom(S.buffers.disc,model(x,.012,z,r,1,r),color,S.gl.TRIANGLE_FAN)}
function makeLabel(id,name,isEnemy){
 const el=document.createElement('div');el.className='cb3d-label'+(isEnemy?' enemy':'');el.dataset.cb3dLabel=id;el.innerHTML='<b>'+esc(name)+'</b><em><i></i></em>';S.labels.appendChild(el);return el
}
function infoFromDom(el){
 const id=String(el?.dataset?.unit||'');if(!id)return null;
 const isEnemy=id.startsWith('e-')||id.startsWith('add-')||el.classList.contains('enemy'),boss=el.classList.contains('boss')||el.classList.contains('big');
 return{id,name:firstText(el),isEnemy,boss,colour:unitColour(el,isEnemy),x:pct(el.dataset.x),y:pct(el.dataset.y)}
}
function makeUnit(info){
 const p=worldPos(info.x,info.y),u={...info,pos:p,hp:100,dead:false,label:makeLabel(info.id,info.name,info.isEnemy)};S.units.set(info.id,u);return u
}
function ensureDomUnit(el){
 const info=infoFromDom(el);if(!info)return null;let u=S.units.get(info.id);if(!u)u=makeUnit(info);
 if(!S.moves.has(info.id)){const p=worldPos(info.x,info.y);u.pos.x=p.x;u.pos.z=p.z}
 const fill=el.querySelector('.cb2d-unit-hp i'),w=parseFloat(fill?.style?.width||'');if(Number.isFinite(w))setHp(info.id,w);
 if(el.classList.contains('dead'))setDead(info.id,true);return u
}
function ensureEventUnit(id,e){
 id=String(id||'');if(!id)return null;let u=S.units.get(id);if(u)return u;
 const dom=[...document.querySelectorAll('#cb2dUnits [data-unit]')].find(x=>x.dataset.unit===id);if(dom)return ensureDomUnit(dom);
 const isEnemy=id.startsWith('e-')||id.startsWith('add-'),p=e?.position||e?.payload?.position||{x:isEnemy?72:28,y:50};
 return makeUnit({id,name:e?.payload?.name||id,isEnemy,boss:false,colour:isEnemy?[.64,.24,.22,1]:[.42,.64,.76,1],x:p.x,y:p.y})
}
function setHp(id,value){
 const u=S.units.get(String(id));if(!u)return;u.hp=Math.max(0,Math.min(100,Number(value)||0));
 const fill=u.label?.querySelector('em i');if(fill)fill.style.width=u.hp+'%'
}
function setDead(id,dead){const u=S.units.get(String(id));if(!u)return;u.dead=Boolean(dead);u.label?.classList.toggle('dead',u.dead)}
function rebuild(){
 if(!S.active)return;const seen=new Set();
 document.querySelectorAll('#cb2dUnits [data-unit]').forEach(el=>{const u=ensureDomUnit(el);if(u)seen.add(u.id)});
 for(const [id,u]of S.units){if(!seen.has(id)){u.label?.remove();S.units.delete(id);S.moves.delete(id)}}
}
function resize(){
 if(!S.gl||!S.canvas||!S.arena)return;const r=S.arena.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.5),w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));
 if(S.canvas.width!==w||S.canvas.height!==h){S.canvas.width=w;S.canvas.height=h}
 S.gl.viewport(0,0,w,h)
}
function buildRenderer(){
 const canvas=document.createElement('canvas');const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});
 if(!gl)throw new Error('WebGL is not available on this device');
 const program=makeProgram(gl);gl.useProgram(program);
 S.canvas=canvas;S.gl=gl;S.program=program;S.loc={pos:gl.getAttribLocation(program,'aPosition'),mvp:gl.getUniformLocation(program,'uMVP'),color:gl.getUniformLocation(program,'uColor')};
 S.buffers=makeGeometry(gl);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(.025,.035,.04,1)
}
function mount(a){
 destroyScene();S.arena=a;const layer=document.createElement('div');layer.className='cb3d-layer';layer.hidden=false;
 layer.innerHTML='<div class="cb3d-badge">3D COMBAT PROTOTYPE<span>Native WebGL · Combat Reborn simulation</span></div><div class="cb3d-labels"></div>';
 a.appendChild(layer);S.layer=layer;S.labels=layer.querySelector('.cb3d-labels');buildRenderer();layer.insertBefore(S.canvas,S.labels);resize();
 if(window.ResizeObserver){S.resize=new ResizeObserver(resize);S.resize.observe(a)}else window.addEventListener('resize',resize,{passive:true})
}
function destroyScene(){
 if(S.frame)cancelAnimationFrame(S.frame);S.frame=0;S.resize?.disconnect?.();S.resize=null;
 if(!window.ResizeObserver)window.removeEventListener('resize',resize);for(const u of S.units.values())u.label?.remove();S.units.clear();S.moves.clear();S.effects.length=0;S.telegraphs.clear();S.hazards.clear();
 if(S.gl){Object.values(S.buffers).forEach(x=>x?.buffer&&S.gl.deleteBuffer(x.buffer));if(S.program)S.gl.deleteProgram(S.program)}
 S.layer?.remove();S.arena=S.layer=S.canvas=S.gl=S.program=S.labels=S.viewProj=null;S.buffers={};S.loc=null
}
function animateTo(id,x,y,duration=360,speed=1){
 const u=ensureEventUnit(id,{position:{x,y}});if(!u)return;const p=worldPos(x,y),now=performance.now();
 S.moves.set(String(id),{from:{x:u.pos.x,z:u.pos.z},to:p,start:now,duration:Math.max(80,Number(duration||360)/Math.max(.25,Number(speed)||1))})
}
function snapTo(id,x,y){const u=ensureEventUnit(id,{position:{x,y}});if(!u)return;const p=worldPos(x,y);u.pos.x=p.x;u.pos.z=p.z;S.moves.delete(String(id))}
function pulseUnit(id,color=[1,.4,.3,.8]){const u=S.units.get(String(id));if(u)S.effects.push({kind:'ring',x:u.pos.x,z:u.pos.z,color,start:performance.now(),duration:340,max:1.6})}
function projectile(source,target,color=[.5,.8,1,1],duration=260){
 const a=S.units.get(String(source)),b=S.units.get(String(target));if(!a||!b)return;S.effects.push({kind:'projectile',from:a,to:b,color,start:performance.now(),duration})
}
function telegraph(e){
 const type=String(e?.payload?.mechanicType||''),token=String(e?.payload?.token||('tg-'+e.timestamp)),source=e.source||'e-0',target=e.payload?.targetId||e.target,items=[];
 const a=S.units.get(String(source))?.pos||{x:0,z:0},b=S.units.get(String(target))?.pos||a,red=[.8,.18,.15,.3],amber=[.85,.55,.18,.3];
 if(type==='circle'||type==='persistent-circle'||type==='target-circle')items.push({kind:'disc',x:b.x,z:b.z,r:type==='persistent-circle'?1.5:1.2,color:red});
 else if(type==='circles'){const ids=(e.payload?.targetIds||[]);(ids.length?ids:[target]).filter(Boolean).forEach(id=>{const p=S.units.get(String(id))?.pos;if(p)items.push({kind:'disc',x:p.x,z:p.z,r:1,color:red})})}
 else if(type==='line'||type==='healer-swipe'){const dx=b.x-a.x,dz=b.z-a.z,len=Math.max(.8,Math.hypot(dx,dz));items.push({kind:'box',x:(a.x+b.x)/2,z:(a.z+b.z)/2,sx:len,sz:.65,ry:-Math.atan2(dz,dx),color:red})}
 else if(type==='cone'){items.push({kind:'disc',x:a.x,z:a.z,r:2.6,color:red})}
 else if(type==='adds'){items.push({kind:'disc',x:3.2,z:-1.7,r:.75,color:amber},{kind:'disc',x:3.2,z:1.7,r:.75,color:amber})}
 else items.push({kind:'disc',x:a.x,z:a.z,r:.75,color:type==='interrupt'?amber:red});
 S.telegraphs.set(token,items)
}
function clearTelegraph(token){S.telegraphs.delete(String(token||''))}
function spawnHazard(e){if(!e?.position)return;const p=worldPos(e.position.x,e.position.y),r=Math.max(.45,Math.min(3.2,(Number(e.payload?.radius)||10)*.14));S.hazards.set(String(e.payload?.hazardId||('hazard-'+e.timestamp)),{x:p.x,z:p.z,r,color:[.66,.16,.13,.28]})}
function clearHazard(id){S.hazards.delete(String(id||''))}
function drawWorld(now){
 const gl=S.gl;if(!gl)return;resize();gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(S.program);
 const aspect=Math.max(.4,S.canvas.width/Math.max(1,S.canvas.height)),proj=perspective(Math.PI/4.1,aspect,.1,60),view=lookAt([8.6,9.5,10.7],[0,.35,0],[0,1,0]);S.viewProj=mat4Mul(proj,view);
 drawGeom(S.buffers.quad,model(0,-.03,0,16,1,10),[.055,.085,.085,1]);
 drawGeom(S.buffers.grid,model(0,.005,0,1,1,1),[.16,.24,.22,.34],gl.LINES);
 const wall=[.08,.11,.12,1];drawCube(0,.7,-5.05,16.2,1.4,.2,wall);drawCube(0,.7,5.05,16.2,1.4,.2,wall);drawCube(-8.05,.7,0,.2,1.4,10.2,wall);drawCube(8.05,.7,0,.2,1.4,10.2,wall);
 for(const t of S.telegraphs.values())for(const v of t){if(v.kind==='disc')drawDisc(v.x,v.z,v.r,v.color);else drawCube(v.x,.025,v.z,v.sx,.025,v.sz,v.color,v.ry)}
 for(const h of S.hazards.values())drawDisc(h.x,h.z,h.r,h.color);
 for(const u of S.units.values()){
  const k=u.boss?1.5:(u.isEnemy?1.12:1),y=u.dead?.18:.55*k;
  if(u.dead){drawCube(u.pos.x,.16,u.pos.z,.95*k,.22,.55*k,[.25,.18,.17,.72],.65);continue}
  const base=u.colour||[.5,.6,.7,1],dark=[base[0]*.38,base[1]*.38,base[2]*.38,1];
  drawCube(u.pos.x,.25*k,u.pos.z,.52*k,.5*k,.52*k,dark);
  drawCube(u.pos.x,.78*k,u.pos.z,.64*k,.78*k,.52*k,base);
  drawCube(u.pos.x,1.28*k,u.pos.z,.42*k,.42*k,.42*k,u.isEnemy?[.52,.22,.2,1]:[.72,.63,.55,1]);
 }
 for(let i=S.effects.length-1;i>=0;i--){
  const fx=S.effects[i],t=Math.min(1,(now-fx.start)/Math.max(1,fx.duration));
  if(fx.kind==='ring'){drawDisc(fx.x,fx.z,.25+t*fx.max,[...fx.color.slice(0,3),Math.max(0,.7*(1-t))])}
  else if(fx.kind==='projectile'){const x=fx.from.pos.x+(fx.to.pos.x-fx.from.pos.x)*t,z=fx.from.pos.z+(fx.to.pos.z-fx.from.pos.z)*t,y=.75+Math.sin(Math.PI*t)*.7;drawCube(x,y,z,.16,.16,.16,fx.color)}
  if(t>=1)S.effects.splice(i,1)
 }
}
function updateLabels(){
 if(!S.viewProj)return;for(const u of S.units.values()){const q=projectPoint({x:u.pos.x,y:u.dead?.35:(u.boss?2.55:1.95),z:u.pos.z});if(!q||!q.visible){u.label.style.display='none';continue}u.label.style.display='block';u.label.style.left=q.x+'px';u.label.style.top=q.y+'px'}
}
function tick(now){
 if(!S.active||!S.gl){S.frame=0;return}for(const[id,m]of S.moves){const u=S.units.get(id);if(!u){S.moves.delete(id);continue}const t=Math.min(1,(now-m.start)/m.duration),q=1-Math.pow(1-t,3);u.pos.x=m.from.x+(m.to.x-m.from.x)*q;u.pos.z=m.from.z+(m.to.z-m.from.z)*q;if(t>=1)S.moves.delete(id)}
 drawWorld(now);updateLabels();S.frame=requestAnimationFrame(tick)
}
function startLoop(){if(!S.frame){S.last=performance.now();S.frame=requestAnimationFrame(tick)}}
function showError(message){
 const a=arena();if(!a)return;let el=a.querySelector('.cb3d-error');if(!el){el=document.createElement('div');el.className='cb3d-error';a.appendChild(el)}el.textContent=message;setTimeout(()=>el.remove(),4200)
}
function activate(){
 if(S.active)return;const btn=button();
 try{
  const a=arena();if(!a)throw new Error('Combat arena is not open');mount(a);S.active=true;a.classList.add('cb3d-active');rebuild();startLoop();
  if(btn){btn.disabled=false;btn.classList.add('active');btn.textContent='2D VIEW'}
 }catch(error){
  console.warn('Cellbound 3D prototype unavailable',error);S.active=false;destroyScene();showError('3D could not start on this device. Combat has stayed in 2D.');
  if(btn){btn.disabled=false;btn.classList.remove('active');btn.textContent='3D TEST'}
 }
}
function deactivate(){
 if(!S.active)return;S.active=false;if(S.frame)cancelAnimationFrame(S.frame);S.frame=0;S.arena?.classList.remove('cb3d-active');if(S.layer)S.layer.hidden=true;
 const btn=button();if(btn){btn.classList.remove('active');btn.disabled=false;btn.textContent='3D TEST'}
}
function toggle(){S.active?deactivate():activate()}
function webglSupported(){try{const c=document.createElement('canvas');return Boolean(c.getContext('webgl'))}catch(_){return false}}
function ensureButton(){
 const shell=document.querySelector('.cb2d-shell'),live=shell?.querySelector('.cb2d-live');if(!live)return;
 let btn=live.querySelector('[data-cb3d-toggle]');
 if(!btn){
  btn=document.createElement('button');btn.type='button';btn.dataset.cb3dToggle='1';btn.addEventListener('click',toggle);
  const speed=live.querySelector('[data-speed]');live.insertBefore(btn,speed||live.lastElementChild)
 }
 const ok=webglSupported(),label=!ok?'3D N/A':S.active?'2D VIEW':'3D TEST',title=!ok?'WebGL is unavailable; 2D combat remains active':'Experimental native 3D combat renderer';
 if(btn.disabled===ok)btn.disabled=!ok;
 if(btn.textContent!==label)btn.textContent=label;
 if(btn.title!==title)btn.title=title;
 if(btn.classList.contains('active')!==S.active)btn.classList.toggle('active',S.active)
}
function event(e,result,ctx={}){
 if(!S.active||!e)return;if(S.arena!==arena()){const a=arena();if(a){mount(a);a.classList.add('cb3d-active');rebuild();startLoop()}}
 const speed=Math.max(.25,Number(ctx.speed)||1);
 switch(e.type){
  case'COMBAT_START':rebuild();(e.payload?.units||[]).forEach(x=>{ensureEventUnit(x.id,{position:x.position});if(x.position)snapTo(x.id,x.position.x,x.position.y)});break;
  case'MOVEMENT_START':if(e.payload?.to)animateTo(e.source,e.payload.to.x,e.payload.to.y,e.payload.duration||360,speed);break;
  case'MOVEMENT_END':if(e.position)snapTo(e.source,e.position.x,e.position.y);break;
  case'ABILITY_START':ensureEventUnit(e.source,e);ensureEventUnit(e.target,e);if(e.target)projectile(e.source,e.target,String(e.source||'').startsWith('p-')?[.38,.72,.9,1]:[.85,.33,.28,1],260/speed);break;
  case'HEAL_RECEIVED':ensureEventUnit(e.target,e);projectile(e.source,e.target,[.35,.86,.62,1],240/speed);pulseUnit(e.target,[.35,.86,.62,.8]);if(e.payload?.targetHpPct!=null)setHp(e.target,e.payload.targetHpPct);break;
  case'DAMAGE_DEALT':ensureEventUnit(e.target,e);pulseUnit(e.target,[.9,.28,.23,.8]);if(e.payload?.targetHpPct!=null)setHp(e.target,e.payload.targetHpPct);break;
  case'PLAYER_REVIVED':ensureEventUnit(e.target,e);setDead(e.target,false);if(e.payload?.targetHpPct!=null)setHp(e.target,e.payload.targetHpPct);pulseUnit(e.target,[.35,.86,.62,.8]);break;
  case'MECHANIC_TELEGRAPH':telegraph(e);break;
  case'MECHANIC_RESOLVE':clearTelegraph(e.payload?.token);break;
  case'GROUND_HAZARD_SPAWNED':spawnHazard(e);break;
  case'GROUND_HAZARD_EXPIRED':clearHazard(e.payload?.hazardId);break;
  case'GROUND_HAZARD_TICK':{const h=S.hazards.get(String(e.payload?.hazardId||''));if(h)S.effects.push({kind:'ring',x:h.x,z:h.z,color:[.9,.25,.2,.8],start:performance.now(),duration:180,max:.6});break}
  case'ADD_SPAWNED':ensureEventUnit(e.target,e);if(e.position)snapTo(e.target,e.position.x,e.position.y);pulseUnit(e.target,[.83,.55,.25,.8]);break;
  case'ADD_DEFEATED':case'ENEMY_DEFEATED':case'PLAYER_DEFEATED':setDead(e.target,true);pulseUnit(e.target,[.8,.2,.18,.8]);break;
  case'ENEMY_REVIVED':setDead(e.target,false);pulseUnit(e.target,[.55,.4,.8,.8]);break;
  case'PHASE_CHANGE':case'ENRAGE':for(const u of S.units.values())if(u.isEnemy)pulseUnit(u.id,e.type==='ENRAGE'?[.95,.2,.16,.8]:[.85,.65,.28,.8]);break;
  case'INTERRUPT':if(e.result==='success'){pulseUnit(e.target,[.9,.76,.35,.8]);clearTelegraph(e.payload?.token)}break;
 }
}
let observerQueued=false;
function observe(){
 ensureButton();
 const ob=new MutationObserver(()=>{
  if(observerQueued)return;observerQueued=true;
  requestAnimationFrame(()=>{
   observerQueued=false;
   if(!button())ensureButton();
   if(S.active&&!arena()){S.active=false;destroyScene()}
  })
 });
 ob.observe(document.documentElement,{childList:true,subtree:true})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
window.CellboundCombat3D={version:VERSION,event,toggle,activate,deactivate,isActive:()=>S.active,rebuild};
})();