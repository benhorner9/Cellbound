/* Cellbound Three.js foundation v1.
 * Lazy rendering preview only — no combat outcomes or player state are modified.
 * Keep 2D combat as the active game renderer until a separate integration gate.
 */
(()=>{
'use strict';
const VERSION='1.0.0';
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
let loading=null;
function load(){
  if(!loading)loading=import(THREE_URL).catch(error=>{loading=null;throw error;});
  return loading;
}
function supportsWebGL2(){
  try{
    const canvas=document.createElement('canvas');
    const context=canvas.getContext('webgl2',{failIfMajorPerformanceCaveat:true});
    const ok=!!context;
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  }catch(_){return false;}
}
function material(THREE,color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:.77,metalness:.18,...opts});}
async function mountPreview(host){
  if(!host||!host.isConnected)throw new Error('Preview host is not available.');
  if(!supportsWebGL2())throw new Error('WebGL 2 is unavailable on this device or browser. The normal 2D game is unaffected.');
  const THREE=await load();
  if(!host.isConnected)throw new Error('Preview was closed before the renderer loaded.');
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x101822);
  scene.fog=new THREE.Fog(0x101822,21,42);
  const camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,100);
  camera.position.set(10,14,19);
  camera.lookAt(0,0.45,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label','Fixed angle 3D prototype of the Ashen Vault with five placeholder heroes and one boss');
  renderer.domElement.style.cssText='display:block;width:100%;height:100%';
  host.replaceChildren(renderer.domElement);
  const baseMat=material(THREE,0x293039,{roughness:1});
  const stoneMat=material(THREE,0x3c414c,{roughness:1});
  const goldMat=material(THREE,0xa07947,{metalness:.45});
  const lavaMat=new THREE.MeshStandardMaterial({color:0xda572e,emissive:0xb53911,emissiveIntensity:1.3});
  const crystalMat=new THREE.MeshStandardMaterial({color:0x80c7d2,emissive:0x328eaa,emissiveIntensity:.95,metalness:.25});
  const ground=new THREE.Mesh(new THREE.BoxGeometry(16,.55,10),baseMat);
  ground.position.y=-.39;ground.receiveShadow=true;scene.add(ground);
  const board=new THREE.GridHelper(16,16,0x665443,0x414954);board.position.y=-.10;board.material.opacity=.24;board.material.transparent=true;scene.add(board);
  function block(x,z,sx,sy,sz,mat=stoneMat,y=sy/2){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  }
  block(0,-5,16,2,.35);block(-8,0,.35,1.6,10);block(8,0,.35,1.6,10);
  for(const x of [-6.7,6.7])for(const z of [-3.9,3.9]){
    block(x,z,.72,2.6,.72,stoneMat,1.3);
    block(x,z,.99,.26,.99,goldMat,2.65);
  }
  for(const x of [-4.4,0,4.4]){
    const crack=block(x,-2.95,.22,.015,3,lavaMat,-.095);crack.rotation.y=Math.PI/7;
  }
  const glow=new THREE.PointLight(0xef7d3f,75,13,2);glow.position.set(0,2,-3);scene.add(glow);
  scene.add(new THREE.AmbientLight(0x8ca1bb,1.15));
  const key=new THREE.DirectionalLight(0xffdcb2,3.5);key.position.set(-5,12,7);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-11;key.shadow.camera.right=11;
  key.shadow.camera.top=10;key.shadow.camera.bottom=-10;scene.add(key);
  const rim=new THREE.DirectionalLight(0x6199ce,1.5);rim.position.set(4,7,-6);scene.add(rim);
  const players=[];
  function mesh(group,geometry,mat,x,y,z){
    const obj=new THREE.Mesh(geometry,mat);obj.position.set(x,y,z);obj.castShadow=true;group.add(obj);return obj;
  }
  function adventurer(kind,color,x,z){
    const unit=new THREE.Group(), armour=material(THREE,color,{metalness:.38}),face=material(THREE,0xdabf9f);
    const steel=material(THREE,0xc1cbd7,{metalness:.74,roughness:.32});
    const leather=material(THREE,0x382c31);
    mesh(unit,new THREE.CylinderGeometry(.29,.38,.88,8),armour,0,1.01,0);
    mesh(unit,new THREE.SphereGeometry(.24,10,8),face,0,1.72,0);
    mesh(unit,new THREE.ConeGeometry(.29,.37,8),armour,0,1.99,0);
    for(const side of [-1,1]){
      mesh(unit,new THREE.BoxGeometry(.21,.7,.24),armour,side*.44,1.04,0);
      mesh(unit,new THREE.BoxGeometry(.24,.55,.3),leather,side*.17,.3,0);
    }
    if(kind==='tank'){
      mesh(unit,new THREE.BoxGeometry(.72,.87,.16),goldMat,-.70,.94,.23);
      mesh(unit,new THREE.BoxGeometry(.14,1.06,.16),steel,.62,.9,.08);
    }else if(kind==='caster'||kind==='healer'){
      mesh(unit,new THREE.CylinderGeometry(.055,.055,2,8),steel,.63,1.15,.02);
      mesh(unit,new THREE.IcosahedronGeometry(.19,0),kind==='healer'?crystalMat:lavaMat,.63,2.2,.02);
    }else if(kind==='hunter'){
      mesh(unit,new THREE.TorusGeometry(.55,.05,5,16,Math.PI),goldMat,.62,1.23,0).rotation.z=Math.PI/2;
    }else{
      mesh(unit,new THREE.BoxGeometry(.12,.78,.13),steel,.55,1.02,.16);
    }
    unit.position.set(x,0,z);unit.rotation.y=-Math.PI/2.3;
    scene.add(unit);players.push({unit,x,z});
    return unit;
  }
  adventurer('tank',0x9da6af,-2.2,.95);
  adventurer('rogue',0x6b8c7a,-3.7,2.6);
  adventurer('hunter',0x92825f,-5.4,.25);
  adventurer('caster',0x6e79b2,-5.2,2.75);
  adventurer('healer',0xab8eaa,-6.75,1.5);
  const boss=new THREE.Group();
  const dark=material(THREE,0x45343a,{metalness:.4,roughness:.55});
  mesh(boss,new THREE.DodecahedronGeometry(1.1,1),dark,0,1.65,0);
  mesh(boss,new THREE.IcosahedronGeometry(.74,1),lavaMat,0,2.05,.42);
  mesh(boss,new THREE.ConeGeometry(.45,.95,5),dark,-.64,3.1,0);
  mesh(boss,new THREE.ConeGeometry(.45,.95,5),dark,.64,3.1,0);
  for(const side of [-1,1]){
    mesh(boss,new THREE.CylinderGeometry(.22,.34,1.2,6),dark,side*1.2,1.45,0).rotation.z=side*.42;
    mesh(boss,new THREE.CylinderGeometry(.32,.37,.7,6),dark,side*.43,.45,0);
  }
  boss.position.set(3.1,0,-.65);boss.rotation.y=-.6;scene.add(boss);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.85,.055,8,48),lavaMat);
  ring.rotation.x=-Math.PI/2;ring.position.set(3.1,-.07,-.65);scene.add(ring);
  const target=new THREE.Mesh(new THREE.CircleGeometry(1.85,48),new THREE.MeshBasicMaterial({color:0xbd3f24,transparent:true,opacity:.12,depthWrite:false}));
  target.rotation.x=-Math.PI/2;target.position.copy(ring.position);target.position.y=-.086;scene.add(target);
  const resize=()=>{
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),aspect=w/h;
    const viewHeight=aspect<1.2?13:10;
    camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;
    camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
  };
  resize();
  const watcher=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
  watcher?.observe(host);
  if(!watcher)window.addEventListener('resize',resize);
  let disposed=false,raf=0;
  const begin=performance.now();
  // Track one animation frame at a time, including after visibility changes.
  function renderLoop(t){raf=0;if(disposed||document.hidden)return;const sec=(t-begin)/1000;
    players.forEach((entry,i)=>{entry.unit.position.y=Math.sin(sec*2+i*.9)*.035;});
    boss.position.y=Math.sin(sec*1.4)*.11;glow.intensity=70+Math.sin(sec*2)*8;
    lavaMat.emissiveIntensity=1.2+.16*Math.sin(sec*2.5);
    renderer.render(scene,camera);raf=requestAnimationFrame(renderLoop);
  }
  function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(!disposed&&!raf)raf=requestAnimationFrame(renderLoop);}
  document.addEventListener('visibilitychange',visibility);
  raf=requestAnimationFrame(renderLoop);
  function dispose(){
    if(disposed)return;
    disposed=true;cancelAnimationFrame(raf);raf=0;
    document.removeEventListener('visibilitychange',visibility);
    watcher?.disconnect();if(!watcher)window.removeEventListener('resize',resize);
    const geometries=new Set(),materials=new Set();
    scene.traverse(o=>{
      if(o.geometry)geometries.add(o.geometry);
      if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));
    });
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }
  return Object.freeze({camera,scene,dispose,renderer,version:VERSION});
}
window.CellboundThree=Object.freeze({version:VERSION,threeVersion:'0.186.1',load,supportsWebGL2,mountPreview});
})();