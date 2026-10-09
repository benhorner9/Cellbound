(()=>{
'use strict';
// Shared map definitions for owner staging QA and future trusted online matches.
// These are PRESENTATION/OBJECTIVE DATA, not an alternate combat engine.
const MODES=['arena','capture-the-flag','king-of-the-hill'];
const ART='cellbound-design-art',TEST_KEY='cellbound-pvp-map-owner-test-v1';
const fallbackArt={
 arena:'./assets/ashen-vault/rooms/broken-gate.webp',
 'capture-the-flag':'./assets/chaos-canyon/rooms/canyon-mouth.webp',
 'king-of-the-hill':'./assets/chaos-canyon/rooms/crossing.webp'
};
const HILL_IDS=['centre','north','east','south','west'];
const pt=(x,y)=>({x,y});
const builtins=[
 {id:'crucible-arena',mode:'arena',title:'Crucible Arena',artPath:'',layout:{
  spawns:{blue:[pt(18,30),pt(18,40),pt(18,50),pt(18,60),pt(18,70)],red:[pt(82,30),pt(82,40),pt(82,50),pt(82,60),pt(82,70)]},
  flags:{blue:pt(16,50),red:pt(84,50)},hills:[{id:'centre',...pt(50,50)},{id:'north',...pt(50,24)},{id:'east',...pt(72,50)},{id:'south',...pt(50,76)},{id:'west',...pt(28,50)}],
  storm:pt(50,50),lanes:{left:pt(50,26),mid:pt(50,50),right:pt(50,74)},blockers:[]}},
 {id:'crucible-ctf',mode:'capture-the-flag',title:'Flagrunner Crossing',artPath:'',layout:{
  spawns:{blue:[pt(12,30),pt(12,40),pt(12,50),pt(12,60),pt(12,70)],red:[pt(88,30),pt(88,40),pt(88,50),pt(88,60),pt(88,70)]},
  flags:{blue:pt(16,50),red:pt(84,50)},hills:[{id:'centre',...pt(50,50)},{id:'north',...pt(50,24)},{id:'east',...pt(72,50)},{id:'south',...pt(50,76)},{id:'west',...pt(28,50)}],
  storm:pt(50,50),lanes:{left:pt(50,26),mid:pt(50,50),right:pt(50,74)},blockers:[]}},
 {id:'crucible-hill',mode:'king-of-the-hill',title:'Five Point Hold',artPath:'',layout:{
  spawns:{blue:[pt(16,30),pt(16,40),pt(16,50),pt(16,60),pt(16,70)],red:[pt(84,30),pt(84,40),pt(84,50),pt(84,60),pt(84,70)]},
  flags:{blue:pt(16,50),red:pt(84,50)},hills:[{id:'centre',...pt(50,50)},{id:'north',...pt(50,24)},{id:'east',...pt(72,50)},{id:'south',...pt(50,76)},{id:'west',...pt(28,50)}],
  storm:pt(50,50),lanes:{left:pt(50,26),mid:pt(50,50),right:pt(50,74)},blockers:[]}}
];
const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=n=>Math.max(2,Math.min(98,Math.round((Number(n)||50)*10)/10));
const point=(v,base)=>({x:clamp(v?.x??base?.x??50),y:clamp(v?.y??base?.y??50)});
const idSafe=id=>/^[a-z0-9-]{3,64}$/.test(String(id||''));
const isOwner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner';
const db=()=>window.CellboundGame?.getSupabase?.();
const published=new Map(),drafts=new Map();
let loading=null,lastRefresh=0;
function clean(input){
 const id=String(input?.id||''),mode=String(input?.mode||'');
 if(!idSafe(id)||!MODES.includes(mode))throw new Error('Choose a valid map ID and PvP mode.');
 const title=String(input?.title||'').trim();
 if(title.length<2||title.length>100)throw new Error('PvP map title must be 2–100 characters.');
 const base=builtins.find(x=>x.id===id)?.layout||builtins.find(x=>x.mode===mode).layout;
 const raw=input?.layout||{},spawns={blue:[],red:[]};
 for(const team of ['blue','red']){
  const source=Array.isArray(raw.spawns?.[team])?raw.spawns[team]:base.spawns[team];
  if(source.length!==5)throw new Error('Every PvP map needs exactly five '+team+' spawn positions.');
  spawns[team]=source.map((p,i)=>point(p,base.spawns[team][i]));
 }
 const flags={blue:point(raw.flags?.blue,base.flags.blue),red:point(raw.flags?.red,base.flags.red)};
 const hillInput=Array.isArray(raw.hills)?raw.hills:base.hills;
 if(hillInput.length!==5||HILL_IDS.some(id=>!hillInput.some(h=>h?.id===id)))throw new Error('Keep all five named King of the Hill locations.');
 const hills=HILL_IDS.map(id=>({id,...point(hillInput.find(h=>h?.id===id),base.hills.find(h=>h.id===id))}));
 const lanes={};for(const lane of ['left','mid','right'])lanes[lane]=point(raw.lanes?.[lane],base.lanes[lane]);
 const blockers=Array.isArray(raw.blockers)?raw.blockers.slice(0,20).map(b=>({
  x:clamp(b?.x),y:clamp(b?.y),width:Math.max(2,Math.min(35,Number(b?.width)||8)),
  height:Math.max(2,Math.min(35,Number(b?.height)||8)),blocksMovement:b?.blocksMovement!==false,blocksLos:b?.blocksLos!==false
 })):[];
 const artPath=String(input?.artPath||'');
 if(artPath.length>255||artPath&&(!/^[a-z0-9/_-]+\.(webp|png|jpe?g|avif)$/i.test(artPath)||artPath.includes('..')))throw new Error('Invalid PvP artwork path.');
 return{id,mode,title,artPath,layout:{spawns,flags,hills,storm:point(raw.storm,base.storm),lanes,blockers}}
}
function validate(map){
 const m=clean(map),issues=[],p=m.layout;
 if(Math.hypot(p.spawns.blue[2].x-p.spawns.red[2].x,p.spawns.blue[2].y-p.spawns.red[2].y)<30)issues.push('Move opposing spawn groups farther apart.');
 if(Math.hypot(p.flags.blue.x-p.flags.red.x,p.flags.blue.y-p.flags.red.y)<30)issues.push('Move the blue and red flags farther apart.');
 if(m.mode==='capture-the-flag')for(const team of ['blue','red'])if(Math.hypot(p.flags[team].x-p.spawns[team][2].x,p.flags[team].y-p.spawns[team][2].y)>24)issues.push(team+' flag should be close to its home spawn.');
 if(m.mode==='king-of-the-hill'&&p.hills.some(h=>Math.abs(h.x-50)>45||Math.abs(h.y-50)>45))issues.push('Hill points should stay inside the playable battlefield.');
 return issues
}
function testStore(){try{return JSON.parse(localStorage.getItem(TEST_KEY)||'{}')||{}}catch{return{}}}
function setTest(map){if(!isOwner())throw Error('Owner only');const m=clean(map);const tests=testStore();tests[m.id]=m;localStorage.setItem(TEST_KEY,JSON.stringify(tests));return m}
function clearTest(id){if(!isOwner())return;const tests=testStore();delete tests[id];localStorage.setItem(TEST_KEY,JSON.stringify(tests))}
function isTesting(id){return isOwner()&&Boolean(testStore()[id])}
function get(id,{ownerPreview=false}={}){
 const key=String(id||'');
 if(ownerPreview&&isOwner()&&testStore()[key])return clean(testStore()[key]);
 return clone(published.get(key)||builtins.find(x=>x.id===key)||null)
}
function list(mode='',{includeDrafts=false}={}){
 const rows=new Map(builtins.map(x=>[x.id,clone(x)]));
 for(const [id,m] of published)rows.set(id,clone(m));
 if(includeDrafts&&isOwner())for(const [id,m] of drafts)if(!rows.has(id))rows.set(id,clone(m));
 if(isOwner())for(const [id,m] of Object.entries(testStore())){try{rows.set(id,clean(m))}catch{}}
 return [...rows.values()].filter(x=>!mode||x.mode===mode).sort((a,b)=>a.title.localeCompare(b.title))
}
function draft(id){return isOwner()?clone(drafts.get(id)||null):null}
function isPublished(id){return published.has(id)}
function artUrl(map){
 if(!map)return'';
 const path=String(map.artPath||'');
 if(path&&db()?.storage){const url=db().storage.from(ART).getPublicUrl(path)?.data?.publicUrl;if(/^https:\/\//.test(url||''))return url}
 return fallbackArt[map.mode]||fallbackArt.arena
}
function refresh(force=false){
 if(loading)return loading;
 if(!force&&Date.now()-lastRefresh<20000)return Promise.resolve(true);
 loading=(async()=>{
  if(!db()||!window.CellboundGame?.ready)return false;
  const {data,error}=await db().from('cellbound_pvp_maps').select('id,mode,title,layout,art_path').order('published_at',{ascending:false});
  if(error)throw error;
  published.clear();
  for(const row of data||[]){try{const m=clean({...row,artPath:row.art_path});published.set(m.id,m)}catch(e){console.warn('Skipped invalid PvP map',row.id,e.message)}}
  drafts.clear();
  if(isOwner()){
   const res=await db().from('cellbound_pvp_map_drafts').select('id,mode,title,layout,art_path');
   if(res.error)throw res.error;
   for(const row of res.data||[]){try{const m=clean({...row,artPath:row.art_path});drafts.set(m.id,m)}catch(e){console.warn('Skipped invalid PvP draft',row.id,e.message)}}
  }
  lastRefresh=Date.now();return true
 })().finally(()=>loading=null);
 return loading
}
async function currentUser(){
 if(!isOwner())throw Error('Owner role required');
 const client=db();if(!client?.auth?.getUser)throw Error('Supabase is unavailable');
 const {data,error}=await client.auth.getUser();if(error||!data?.user?.id)throw Error('Owner sign-in required');
 return data.user.id
}
async function saveDraft(map){
 const m=clean(map),uid=await currentUser();
 const payload={id:m.id,mode:m.mode,title:m.title,layout:m.layout,art_path:m.artPath||null,updated_by:uid,updated_at:new Date().toISOString()};
 const {error}=await db().from('cellbound_pvp_map_drafts').upsert(payload,{onConflict:'id'});
 if(error)throw error;drafts.set(m.id,m);return clone(m)
}
async function publish(map){
 const m=clean(map),errors=validate(m);if(errors.length)throw Error(errors[0]);
 const uid=await currentUser();
 await saveDraft(m);
 const current=published.get(m.id);
 const payload={id:m.id,mode:m.mode,title:m.title,layout:m.layout,art_path:m.artPath||null,updated_by:uid,version:Number(current?.version||0)+1,published_at:new Date().toISOString()};
 const {error}=await db().from('cellbound_pvp_maps').upsert(payload,{onConflict:'id'});
 if(error)throw error;
 published.set(m.id,m);clearTest(m.id);
 window.dispatchEvent?.(new CustomEvent('cellbound:pvp-map-changed',{detail:{id:m.id,mode:m.mode}}));
 return clone(m)
}
async function unpublish(id){
 await currentUser();
 if(!published.has(id))throw Error('This map is using its built-in default.');
 const {error}=await db().from('cellbound_pvp_maps').delete().eq('id',id);
 if(error)throw error;published.delete(id);clearTest(id);
 return true
}
async function uploadArt(map,file){
 const m=clean(map);await currentUser();
 if(!file||!['image/webp','image/png','image/jpeg','image/avif'].includes(file.type)||file.size<100||file.size>10*1024*1024)throw Error('Use WebP, PNG, JPEG or AVIF up to 10 MB.');
 const extension=({ 'image/webp':'webp','image/png':'png','image/jpeg':'jpg','image/avif':'avif'})[file.type];
 const path='pvp/'+m.id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,10)+'.'+extension;
 const {error}=await db().storage.from(ART).upload(path,file,{contentType:file.type,cacheControl:'31536000',upsert:false});
 if(error)throw error;
 m.artPath=path;return m
}
window.CellboundPvPMaps=Object.freeze({MODES,HILL_IDS,builtins:()=>clone(builtins),clean,validate,get,list,draft,isPublished,refresh,artUrl,isTesting,setTest,clearTest,saveDraft,publish,unpublish,uploadArt});
})();
