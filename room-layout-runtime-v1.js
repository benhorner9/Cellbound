(()=>{
'use strict';

const TEST_KEY='cellbound-owner-room-layout-tests-v1';
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const clamp=v=>Math.max(0,Math.min(100,Number(v)||0));
const key=(content,room)=>String(content||'').toLowerCase()+'::'+String(room||'').toLowerCase();
const published=new Map();
const defaults=new Map();
const publishedArt=new Map();
const ART_BUCKET='cellbound-room-art';
let db=null,loaded=false,loading=null;

function isOwner(){
 return Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner'
}
const testKey=()=>TEST_KEY+':'+String(window.CellboundGame?.getUser?.()?.id||'signed-out');
function readTests(){try{return JSON.parse(localStorage.getItem(testKey())||'{}')||{}}catch{return{}}}
function writeTests(value){try{localStorage.setItem(testKey(),JSON.stringify(value||{}))}catch{}}
function cleanLayout(layout){
 const markers=(Array.isArray(layout?.markers)?layout.markers:[]).slice(0,64).map(m=>({
   kind:String(m?.kind||'').toLowerCase(),
   label:String(m?.label||'Marker').slice(0,80),
   x:Math.round(clamp(m?.x)*10)/10,
   y:Math.round(clamp(m?.y)*10)/10
 })).filter(m=>['entry','exit','party','enemy','add','mechanic'].includes(m.kind));
 return{markers}
}
function normalizePoint(p){return Array.isArray(p)?{x:Number(p[0])||0,y:Number(p[1])||0}:{x:Number(p?.x)||0,y:Number(p?.y)||0}}
function sameShape(base,p){return Array.isArray(base)?[p.x,p.y]:{x:p.x,y:p.y}}
function centroid(points){
 const list=(points||[]).map(normalizePoint);if(!list.length)return{x:50,y:50};
 return list.reduce((a,p)=>({x:a.x+p.x/list.length,y:a.y+p.y/list.length}),{x:0,y:0})
}
function shiftPoint(p,dx,dy){const q=normalizePoint(p);return{x:clamp(q.x+dx),y:clamp(q.y+dy)}}
function markersFor(content,room,kind,layout=null){
 const active=layout||get(content,room),markers=Array.isArray(active?.markers)?active.markers:[];
 return markers.filter(m=>String(m.kind)===String(kind)).map(m=>({x:clamp(m.x),y:clamp(m.y),label:String(m.label||'')}))
}
function translatedPoints(content,room,kind,basePoints,layout=null){
 const base=Array.isArray(basePoints)?basePoints:[],targets=markersFor(content,room,kind,layout);
 if(!targets.length)return clone(base);
 if(!base.length)return targets.map(p=>({x:p.x,y:p.y}));
 if(targets.length===base.length)return targets.map((p,i)=>sameShape(base[i],p));
 if(targets.length===1){
   const c=centroid(base),dx=targets[0].x-c.x,dy=targets[0].y-c.y;
   return base.map(p=>sameShape(p,shiftPoint(p,dx,dy)))
 }
 return base.map((p,i)=>sameShape(p,targets[Math.min(i,targets.length-1)]||normalizePoint(p)))
}
function shiftRoutePoint(basePoint,target){
 if(!basePoint||!target)return clone(basePoint);
 const b=normalizePoint(basePoint),dx=target.x-b.x,dy=target.y-b.y;
 return sameShape(basePoint,shiftPoint(basePoint,dx,dy))
}

function artFor(content,room,fallback=''){
 const item=publishedArt.get(key(content,room)),client=db||window.CellboundGame?.getSupabase?.();
 return item?.object_path&&client?.storage?client.storage.from(ART_BUCKET).getPublicUrl(item.object_path).data.publicUrl:fallback
}
function publishedArtInfo(content,room){return clone(publishedArt.get(key(content,room))||null)}
async function refreshArt(){
 const game=window.CellboundGame;if(!game?.ready)return false;
 db=game.getSupabase?.();if(!db)return false;
 const {data,error}=await db.from('cellbound_room_art').select('content_id,room_id,object_path,updated_at');
 if(error)throw error;
 publishedArt.clear();(data||[]).forEach(x=>publishedArt.set(key(x.content_id,x.room_id),x));
 window.dispatchEvent(new CustomEvent('cellbound:room-art-changed',{detail:{mode:'refreshed'}}));
 return true
}
async function publishArt(content,room,file){
 if(!isOwner()&&!window.CellboundBoothWorkflow?.can?.('room-art','edit'))throw new Error('Artwork editing access required.');
 if(!file||!['image/webp','image/jpeg','image/png','image/avif'].includes(file.type))throw new Error('Choose a WebP, JPEG, PNG or AVIF image.');
 if(file.size>10*1024*1024)throw new Error('Artwork must be 10 MB or smaller.');
 if(!/^[a-z0-9-]{1,90}$/.test(content)||!/^[a-z0-9-]{1,90}$/.test(room))throw new Error('Invalid room.');
 await ready();
 if(!db)throw new Error('Room art service unavailable.');
 const {data:auth,error:authError}=await db.auth.getUser();
 if(authError||!auth?.user?.id)throw new Error('Owner session required.');
 const ext={'image/webp':'webp','image/jpeg':'jpg','image/png':'png','image/avif':'avif'}[file.type];
 const path=content+'/'+room+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,11)+'.'+ext;
 const stored=await db.storage.from(ART_BUCKET).upload(path,file,{contentType:file.type,cacheControl:'31536000',upsert:false});
 if(stored.error)throw stored.error;
 const row={content_id:content,room_id:room,object_path:path,updated_by:auth.user.id,updated_at:new Date().toISOString()};
 await window.CellboundBoothWorkflow.submit('room-art',content+'/'+room,row);
 return {...row,submitted:true};
}
async function restoreArt(content,room){
 if(!isOwner())throw new Error('Owner access required.');
 await ready();if(!db)throw new Error('Room art service unavailable.');
 await window.CellboundBoothWorkflow.get('room-art',content+'/'+room);
 await window.CellboundBoothWorkflow.transition('archive','room-art',content+'/'+room);
 await refreshArt();return true;
}

function applyRoomConfig(content,room,base){
 if(!base)return base;
 const layout=get(content,room),resolvedArt=artFor(content,room,base.art);
 if(!layout)return resolvedArt===base.art?base:{...base,art:resolvedArt};
 const out=clone(base),entry=markersFor(content,room,'entry',layout)[0],exit=markersFor(content,room,'exit',layout)[0];
 out.art=resolvedArt;
 out.route=out.route||{};
 if(entry){
   const oldEntry=out.route.entry?normalizePoint(out.route.entry):entry;
   const dx=entry.x-oldEntry.x,dy=entry.y-oldEntry.y;
   out.route.entry=sameShape(out.route.entry||{x:entry.x,y:entry.y},entry);
   if(out.route.entryInside)out.route.entryInside=sameShape(out.route.entryInside,shiftPoint(out.route.entryInside,dx,dy));
 }
 if(Array.isArray(out.route.partyAnchors)&&out.route.partyAnchors.length){
   out.route.partyAnchors=translatedPoints(content,room,'party',out.route.partyAnchors,layout)
 }
 if(exit&&Array.isArray(out.route.exitPath)&&out.route.exitPath.length){
   const last=normalizePoint(out.route.exitPath[out.route.exitPath.length-1]),dx=exit.x-last.x,dy=exit.y-last.y;
   out.route.exitPath=out.route.exitPath.map(p=>sameShape(p,shiftPoint(p,dx,dy)))
 }
 if(Array.isArray(out.enemyAnchors)&&out.enemyAnchors.length){
   out.enemyAnchors=translatedPoints(content,room,'enemy',out.enemyAnchors,layout)
 }
 if(Array.isArray(out.enemies)&&out.enemies.length&&out.enemies.every(p=>Array.isArray(p)||(p&&typeof p==='object'&&'x'in p&&'y'in p))){
   out.enemies=translatedPoints(content,room,'enemy',out.enemies,layout)
 }
 if(Array.isArray(out.addAnchors)&&out.addAnchors.length){
   out.addAnchors=translatedPoints(content,room,'add',out.addAnchors,layout)
 }
 return out
}
function get(content,room){
 const k=key(content,room),tests=readTests();
 if(isOwner()&&tests[k])return cleanLayout(tests[k]);
 return published.get(k)?.layout?clone(published.get(k).layout):null
}
function publishedInfo(content,room){return clone(published.get(key(content,room))||null)}
function defaultMarkers(content,room){return clone(defaults.get(key(content,room))||null)}
function registerDefaults(content,room,markers){
 if(!content||!room||!Array.isArray(markers))return;
 defaults.set(key(content,room),cleanLayout({markers}).markers)
}
function markersFromConfig(config){
 const out=[],route=config?.route||{};
 if(route.entry){const p=normalizePoint(route.entry);out.push({kind:'entry',label:'Entrance',x:p.x,y:p.y})}
 if(Array.isArray(route.exitPath)&&route.exitPath.length){const p=normalizePoint(route.exitPath[route.exitPath.length-1]);out.push({kind:'exit',label:'Exit',x:p.x,y:p.y})}
 (route.partyAnchors||[]).forEach((p,i)=>{p=normalizePoint(p);out.push({kind:'party',label:'Party '+(i+1),x:p.x,y:p.y})});
 const enemies=Array.isArray(config?.enemyAnchors)?config.enemyAnchors:(Array.isArray(config?.enemies)&&config.enemies.every(p=>Array.isArray(p)||(p&&typeof p==='object'&&'x'in p&&'y'in p))?config.enemies:[]);
 enemies.forEach((p,i)=>{p=normalizePoint(p);out.push({kind:'enemy',label:'Enemy '+(i+1),x:p.x,y:p.y})});
 (config?.addAnchors||[]).forEach((p,i)=>{p=normalizePoint(p);out.push({kind:'add',label:'Add '+(i+1),x:p.x,y:p.y})});
 return out
}
function registerRoomConfigs(content,configs){
 Object.entries(configs||{}).forEach(([room,cfg])=>registerDefaults(content,room,markersFromConfig(cfg)))
}
function setTest(content,room,layout){
 if(!isOwner())throw new Error('Owner access required');
 const tests=readTests();tests[key(content,room)]=cleanLayout(layout);writeTests(tests);
 window.dispatchEvent(new CustomEvent('cellbound:room-layout-changed',{detail:{content,room,mode:'test'}}));
 return clone(tests[key(content,room)])
}
function clearTest(content,room){
 const tests=readTests(),k=key(content,room),had=Boolean(tests[k]);delete tests[k];writeTests(tests);
 if(had)window.dispatchEvent(new CustomEvent('cellbound:room-layout-changed',{detail:{content,room,mode:'published'}}));
 return had
}
function isTesting(content,room){return Boolean(isOwner()&&readTests()[key(content,room)])}
async function refresh(){
 const Game=window.CellboundGame;if(!Game?.ready)return false;
 db=Game.getSupabase?.();if(!db)return false;
 const {data,error}=await db.from('cellbound_room_layouts').select('content_id,room_id,layout,version,published_at');
 if(error)throw error;
 published.clear();
 (data||[]).forEach(row=>published.set(key(row.content_id,row.room_id),{layout:cleanLayout(row.layout),version:Number(row.version)||1,published_at:row.published_at}));
 try{await refreshArt()}catch(error){console.warn('Published room artwork unavailable',error)}
 loaded=true;return true
}
async function ready(){
 if(loaded)return true;
 if(loading)return loading;
 loading=(async()=>{for(let i=0;i<80;i++){if(window.CellboundGame?.ready)break;await new Promise(r=>setTimeout(r,100))}
   try{return await refresh()}finally{loading=null}
 })();
 return loading
}
async function publish(content,room,layout,expectedRevision){
 if(!isOwner()&&!window.CellboundBoothWorkflow?.can?.('room-layout','edit'))throw new Error('Layout editing access required');
 await ready();if(!db)throw new Error('Room layout service unavailable');
 const clean=cleanLayout(layout);
 const result=await window.CellboundBoothWorkflow.submit('room-layout',content+'/'+room,{content_id:content,room_id:room,layout:clean},expectedRevision);
 return {submitted:true,revision:result.revision};
}
async function unpublish(content,room){
 if(!isOwner())throw new Error('Owner access required');
 await ready();if(!db)throw new Error('Room layout service unavailable');
 await window.CellboundBoothWorkflow.get('room-layout',content+'/'+room);
 await window.CellboundBoothWorkflow.transition('archive','room-layout',content+'/'+room);
 published.delete(key(content,room));clearTest(content,room);return true;
}
function namedMechanics(content,room){
 const list=markersFor(content,room,'mechanic');
 return Object.fromEntries(list.map(m=>[String(m.label||'').trim().toLowerCase(),{x:m.x,y:m.y,label:m.label}]))
}
window.CellboundRoomLayouts={
 ready,refresh,get,publishedInfo,defaultMarkers,artFor,publishedArtInfo,refreshArt,publishArt,restoreArt,registerDefaults,registerRoomConfigs,markersFromConfig,
 markersFor,pointsFor:translatedPoints,applyRoomConfig,namedMechanics,
 setTest,clearTest,isTesting,publish,unpublish,isOwner
};
ready().catch(error=>console.warn('Published room layouts unavailable',error));
})();
