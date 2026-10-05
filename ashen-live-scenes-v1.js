(()=>{
'use strict';

const VERSION='1.3.1';
const states=new WeakMap();
const PROFILES={
  'ash-gate':{intensity:.52,heat:.44,pulse:.00,center:[.50,.50],radius:.18,warm:1,cool:0,core:[1,.46,.12]},
  'ember-hall':{intensity:.72,heat:.52,pulse:.00,center:[.50,.50],radius:.18,warm:1,cool:0,core:[1,.46,.12]},
  'warden-seal':{intensity:.76,heat:.58,pulse:.16,center:[.50,.47],radius:.22,warm:1,cool:0,core:[1,.46,.12]},
  'furnace':{intensity:.96,heat:1.00,pulse:.00,center:[.56,.54],radius:.20,warm:1,cool:0,core:[1,.46,.12]},
  'embermaw':{intensity:1.05,heat:.92,pulse:.18,center:[.50,.50],radius:.26,warm:1,cool:0,core:[1,.46,.12]},
  'vault-depths':{intensity:.34,heat:.18,pulse:.08,center:[.50,.51],radius:.24,warm:1,cool:0,core:[1,.46,.12]},
  'vaultheart':{intensity:.88,heat:.64,pulse:.27,center:[.50,.43],radius:.25,warm:1,cool:0,core:[1,.46,.12]},
  'hollow-gallery':{intensity:.68,heat:.34,pulse:.06,center:[.50,.42],radius:.24,warm:.34,cool:1.0,core:[.12,.96,.88]},
  'hollow-sentinel':{intensity:.82,heat:.48,pulse:.10,center:[.56,.48],radius:.28,warm:.28,cool:1.08,core:[.10,1.0,.90]},
  'hollow-choir':{intensity:.96,heat:.52,pulse:.30,center:[.50,.39],radius:.27,warm:.30,cool:1.14,core:[.10,1.0,.90]},
  'canyon-mouth':{intensity:.48,heat:.20,pulse:.03,center:[.50,.43],radius:.22,warm:.08,cool:.18,green:.62,core:[.18,1.0,.38]},
  'canyon-thorn':{intensity:.62,heat:.24,pulse:.04,center:[.50,.43],radius:.24,warm:.06,cool:.20,green:.78,core:[.16,1.0,.36]},
  'canyon-sentinel':{intensity:.72,heat:.30,pulse:.12,center:[.50,.50],radius:.28,warm:.05,cool:.25,green:.92,core:[.14,1.0,.34]},
  'canyon-crossing':{intensity:.68,heat:.34,pulse:.06,center:[.50,.46],radius:.25,warm:.04,cool:.36,green:.76,core:[.14,.98,.38]},
  'canyon-warden':{intensity:.76,heat:.28,pulse:.10,center:[.54,.49],radius:.27,warm:.05,cool:.22,green:.92,core:[.13,1.0,.32]},
  'canyon-wildheart':{intensity:.88,heat:.36,pulse:.13,center:[.50,.44],radius:.30,warm:.04,cool:.28,green:1.04,core:[.12,1.0,.30]},
  'canyon-vorran':{intensity:1.00,heat:.42,pulse:.32,center:[.50,.47],radius:.31,warm:.04,cool:.24,green:1.16,core:[.10,1.0,.28]},
  'blackout-reactor':{intensity:.88,heat:.48,pulse:.22,center:[.50,.20],radius:.29,warm:.52,cool:1.20,green:.02,core:[.18,.78,1.0]},
  'ashen':{intensity:.62,heat:.48,pulse:.00,center:[.50,.50],radius:.20,warm:1,cool:0,core:[1,.46,.12]}
};

const VS='attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=(a_pos+1.0)*0.5;gl_Position=vec4(a_pos,0.0,1.0);}';
const FS=[
'precision mediump float;',
'varying vec2 v_uv;',
'uniform sampler2D u_tex;',
'uniform float u_time;',
'uniform float u_intensity;',
'uniform float u_heat;',
'uniform float u_pulse;',
'uniform float u_surge;',
'uniform float u_warm;',
'uniform float u_cool;',
'uniform float u_green;',
'uniform float u_viewAspect;',
'uniform float u_texAspect;',
'uniform vec3 u_coreColor;',
'uniform vec2 u_center;',
'uniform float u_radius;',
'float warmMask(vec3 c){',
'  float mx=max(c.r,max(c.g,c.b));',
'  float mn=min(c.r,min(c.g,c.b));',
'  float sat=(mx-mn)/(mx+.015);',
'  float lum=dot(c,vec3(.2126,.7152,.0722));',
'  float warm=smoothstep(.055,.34,c.r-c.b)*smoothstep(.008,.24,c.g-c.b);',
'  return warm*smoothstep(.24,.63,sat)*smoothstep(.15,.68,lum);',
'}',
'float coolMask(vec3 c){',
'  float mx=max(c.r,max(c.g,c.b));',
'  float mn=min(c.r,min(c.g,c.b));',
'  float sat=(mx-mn)/(mx+.015);',
'  float lum=dot(c,vec3(.2126,.7152,.0722));',
'  float teal=smoothstep(.025,.30,c.g-c.r)*smoothstep(-.035,.22,c.b-c.r);',
'  return teal*smoothstep(.18,.60,sat)*smoothstep(.12,.72,lum);',
'}',
'float greenMask(vec3 c){',
'  float mx=max(c.r,max(c.g,c.b));',
'  float mn=min(c.r,min(c.g,c.b));',
'  float sat=(mx-mn)/(mx+.015);',
'  float lum=dot(c,vec3(.2126,.7152,.0722));',
'  float green=smoothstep(.08,.34,c.g-c.r)*smoothstep(.02,.25,c.g-c.b);',
'  return green*smoothstep(.22,.62,sat)*smoothstep(.20,.68,lum);',
'}',
'float activeMask(vec3 c){return max(max(warmMask(c)*u_warm,coolMask(c)*u_cool),greenMask(c)*u_green);}',
'void main(){',
'  vec2 uv=v_uv;',
'  if(u_viewAspect>u_texAspect){uv.y=(uv.y-.5)*(u_texAspect/u_viewAspect)+.5;}else{uv.x=(uv.x-.5)*(u_viewAspect/u_texAspect)+.5;}'
'  vec3 original=texture2D(u_tex,uv).rgb;',
'  float active0=activeMask(original);',
'  float below1=activeMask(texture2D(u_tex,clamp(uv+vec2(0.0,.026),0.0,1.0)).rgb);',
'  float below2=activeMask(texture2D(u_tex,clamp(uv+vec2(0.0,.052),0.0,1.0)).rgb);',
'  float haze=clamp((below1*.74+below2*.38)*(1.0-active0*.42),0.0,1.0);',
'  float wave=sin(uv.y*137.0+u_time*2.35)+.52*sin(uv.y*61.0-u_time*1.52);',
'  float selfWave=sin(uv.y*238.0+u_time*4.25+uv.x*27.0);',
'  float selfLift=cos(uv.x*173.0-u_time*3.55);',
'  vec2 offset=vec2(wave*.00078*u_heat*haze,0.0);',
'  offset+=vec2(selfWave*.00072,selfLift*.00024)*active0*u_intensity;',
'  vec3 c=texture2D(u_tex,clamp(uv+offset,0.0,1.0)).rgb;',
'  float warm=warmMask(c)*u_warm;',
'  float cool=coolMask(c)*u_cool;',
'  float green=greenMask(c)*u_green;',
'  float flow=.5+.5*sin((uv.x*57.0+uv.y*29.0)-u_time*2.15+sin(uv.y*19.0+u_time*.61));',
'  float flick=.5+.5*sin(u_time*7.1+uv.x*91.0+uv.y*53.0+sin(uv.x*17.0-u_time*1.9));',
'  float liveMix=mix(flick,flow,.56);',
'  float warmEnergy=warm*(.026+.095*liveMix)*u_intensity*(1.0+u_surge*.48);',
'  float coolEnergy=cool*(.022+.090*liveMix)*u_intensity*(1.0+u_surge*.52);',
'  float greenEnergy=green*(.020+.080*liveMix)*u_intensity*(1.0+u_surge*.56);',
'  c+=vec3(warmEnergy*1.12,warmEnergy*.47,-warmEnergy*.075);',
'  c+=vec3(coolEnergy*.10,coolEnergy*.84,coolEnergy*.76);',
'  c+=vec3(greenEnergy*.12,greenEnergy*.88,greenEnergy*.30);',
'  float d=distance(uv,u_center);',
'  float core=(1.0-smoothstep(u_radius*.28,u_radius,d))*u_pulse;',
'  float beat=.52+.48*sin(u_time*2.65);',
'  float pulse=core*beat*(.040+.055*max(warm,max(cool,green)))*(1.0+u_surge*.75);',
'  c+=u_coreColor*pulse;',
'  gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);',
'}'
].join('');

function shader(gl,type,source){
  const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'shader compile failed');
  return sh
}
function program(gl){
  const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VS));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'shader link failed');
  return p
}
function profile(name){return PROFILES[name]||PROFILES.ashen}
function visible(arena){
  if(document.hidden||!arena?.isConnected)return false;
  const r=arena.getBoundingClientRect();return r.width>8&&r.height>8&&r.bottom>0&&r.top<innerHeight
}
function create(arena){
  const canvas=document.createElement('canvas');canvas.className='cb2d-live-scene';canvas.setAttribute('aria-hidden','true');
  const first=arena.firstElementChild;first?arena.insertBefore(canvas,first):arena.appendChild(canvas);
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:'high-performance'})||
           canvas.getContext('experimental-webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false});
  if(!gl){canvas.remove();return null}
  const p=program(gl);gl.useProgram(p);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const apos=gl.getAttribLocation(p,'a_pos');gl.enableVertexAttribArray(apos);gl.vertexAttribPointer(apos,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(p,'u_tex'),0);
  const loc={
    time:gl.getUniformLocation(p,'u_time'),intensity:gl.getUniformLocation(p,'u_intensity'),heat:gl.getUniformLocation(p,'u_heat'),
    pulse:gl.getUniformLocation(p,'u_pulse'),surge:gl.getUniformLocation(p,'u_surge'),warm:gl.getUniformLocation(p,'u_warm'),
    cool:gl.getUniformLocation(p,'u_cool'),green:gl.getUniformLocation(p,'u_green'),coreColor:gl.getUniformLocation(p,'u_coreColor'),center:gl.getUniformLocation(p,'u_center'),
    radius:gl.getUniformLocation(p,'u_radius'),viewAspect:gl.getUniformLocation(p,'u_viewAspect'),texAspect:gl.getUniformLocation(p,'u_texAspect')
  };
  const state={arena,canvas,gl,p,tex,loc,src:'',profile:'ashen',loaded:false,raf:0,start:performance.now(),token:0,dpr:1,texAspect:16/9,ro:null,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
  const resize=()=>{
    const r=arena.getBoundingClientRect(),cap=innerWidth<800?1.25:1.6,dpr=Math.min(cap,devicePixelRatio||1);
    const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
  };
  state.resize=resize;state.ro=new ResizeObserver(resize);state.ro.observe(arena);resize();
  states.set(arena,state);return state
}
function frame(state,now){
  state.raf=0;
  const {arena,gl}=state;
  if(!arena.isConnected){unmount(arena);return}
  if(!state.loaded)return;
  if(!visible(arena)){state.raf=requestAnimationFrame(t=>frame(state,t));return}
  state.resize();
  const p=profile(state.profile),live=arena.classList.contains('cbl-live')?1.07:1, surge=arena.classList.contains('ambient-surge')?1:0;
  gl.useProgram(state.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,state.tex);
  const t=(now-state.start)/1000;
  gl.uniform1f(state.loc.time,state.reduced?0:t);
  gl.uniform1f(state.loc.intensity,p.intensity*live);
  gl.uniform1f(state.loc.heat,state.reduced?0:p.heat);
  gl.uniform1f(state.loc.pulse,state.reduced?0:p.pulse);
  gl.uniform1f(state.loc.surge,state.reduced?0:surge);
  gl.uniform1f(state.loc.warm,Number(p.warm??1));
  gl.uniform1f(state.loc.cool,Number(p.cool??0));
  gl.uniform1f(state.loc.green,Number(p.green??0));
  gl.uniform3f(state.loc.coreColor,Number(p.core?.[0]??1),Number(p.core?.[1]??.46),Number(p.core?.[2]??.12));
  gl.uniform2f(state.loc.center,p.center[0],1-p.center[1]);
  gl.uniform1f(state.loc.radius,p.radius);
  gl.uniform1f(state.loc.viewAspect,Math.max(.01,state.canvas.width/state.canvas.height));
  gl.uniform1f(state.loc.texAspect,Math.max(.01,state.texAspect||16/9));
  gl.drawArrays(gl.TRIANGLES,0,6);
  if(!state.reduced)state.raf=requestAnimationFrame(t2=>frame(state,t2))
}
function load(state,src){
  const token=++state.token;state.loaded=false;state.arena.removeAttribute('data-live-scene-ready');
  const img=new Image();img.decoding='async';
  img.onload=()=>{
    if(token!==state.token||!state.arena.isConnected)return;
    const gl=state.gl;gl.bindTexture(gl.TEXTURE_2D,state.tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);state.texAspect=Math.max(.01,(img.naturalWidth||img.width||16)/(img.naturalHeight||img.height||9));state.loaded=true;state.start=performance.now();
    state.arena.dataset.liveSceneReady='1';
    if(state.raf)cancelAnimationFrame(state.raf);
    state.raf=requestAnimationFrame(t=>frame(state,t))
  };
  img.onerror=()=>{if(token===state.token)state.arena.removeAttribute('data-live-scene-ready')};
  img.src=src
}
function mount(arena,opts={}){
  if(!arena||!opts.src)return false;
  let state=states.get(arena)||create(arena);if(!state)return false;
  state.profile=String(opts.profile||'ashen');
  if(state.src!==opts.src){state.src=opts.src;load(state,opts.src)}
  else if(state.loaded&&!state.raf)state.raf=requestAnimationFrame(t=>frame(state,t));
  return true
}
function unmount(arena){
  const state=states.get(arena);if(!state)return;
  if(state.raf)cancelAnimationFrame(state.raf);state.ro?.disconnect();state.token++;
  arena.removeAttribute('data-live-scene-ready');state.canvas?.remove();states.delete(arena)
}
window.addEventListener('pagehide',()=>{document.querySelectorAll('.cb2d-arena').forEach(a=>unmount(a))},{once:true});
window.CellboundAshenLiveScenes={VERSION,mount,unmount};window.CellboundLivingScenes=window.CellboundAshenLiveScenes;
})();