'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sourceFile=name=>fs.readFileSync(path.join(root,name),'utf8');
const editor=sourceFile('admin-room-editor-v1.js'),runtime=sourceFile('room-layout-runtime-v1.js');
for(const text of ['rqeArtFile','rqeArtPublish','rqeArtRestore','artPreview','publishArtwork','restoreArtwork'])
 assert(editor.includes(text),'Room Editor must offer artwork upload and restore: '+text);
for(const text of ['cellbound_room_art','cellbound-room-art','function artFor(','async function publishArt(','async function restoreArt('])
 assert(runtime.includes(text),'Room runtime missing publishing integration: '+text);
const integration={
 'src/dungeons/dungeon-2d-v1.js':'applyRoomConfig',
 'src/dungeons/hollow-sanctum-v1.js':'applyRoomConfig',
 'src/dungeons/chaos-canyon-v1.js':"artFor?.('chaos-canyon','crossing'",
 'src/dungeons/blackout-station-v1.js':'blackoutRoomArt',
 'src/dungeons/fractured-ages-v1.js':"artFor?.('fractured-ages'",
 'manor-raid-v1.js':"artFor?.('the-manor'"
};
for(const [filename,needle] of Object.entries(integration))
 assert(sourceFile(filename).includes(needle),'Encounter must load published background: '+filename);
const map=new Map([
 ['ashen-vault::kael',{content_id:'ashen-vault',room_id:'kael',object_path:'ashen-vault/kael/replacement.webp'}]
]);
let uploads=0;
const client={
 from(table){
  if(table==='cellbound_room_layouts')return{select:async()=>({data:[],error:null})};
  assert.equal(table,'cellbound_room_art');
  return{
   select:async()=>({data:[...map.values()],error:null}),
   upsert:async row=>{map.set(row.content_id+'::'+row.room_id,row);return{error:null}},
   delete:()=>({eq:()=>({eq:async()=>{map.delete('ashen-vault::kael');return{error:null}}})})
  }
 },
 storage:{from:bucket=>{assert.equal(bucket,'cellbound-room-art');return{
  getPublicUrl:objectPath=>({data:{publicUrl:'https://example.test/'+bucket+'/'+objectPath}}),
  upload:async()=>{uploads++;return{error:null}}
 }}},
 auth:{getUser:async()=>({data:{user:{id:'owner-test-uuid'}},error:null})}
};
const window={
 CellboundBoothWorkflow:{get:async()=>({}),transition:async(action,kind)=>{assert.equal(action,'archive');assert.equal(kind,'room-art');map.delete('ashen-vault::kael');return{revision:2}},submit:async(kind,key,payload)=>{assert.equal(kind,'room-art');assert.equal(key,'ashen-vault/kael');assert(payload.object_path);return{revision:1,state:'review'}}},
 CellboundAdmin:{isAdmin:true,role:'owner'},
 CellboundGame:{ready:true,getSupabase:()=>client},
 dispatchEvent(){}
};
const sandbox={
 window,localStorage:{getItem:()=>null,setItem(){}},
 CustomEvent:class{constructor(type,value){this.type=type;this.detail=value?.detail}},
 setTimeout,console
};
vm.runInNewContext(runtime,sandbox,{filename:'room-layout-runtime-v1.js'});
(async()=>{
 const R=window.CellboundRoomLayouts;await R.ready();
 const config={art:'./assets/ashen-vault/rooms/kael.webp',route:{entry:{x:5,y:5}}};
 const updated=R.applyRoomConfig('ashen-vault','kael',config);
 assert(updated.art.includes('replacement.webp'),'Shared runtime must apply replacement with NO marker layout');
 assert.equal(config.art,'./assets/ashen-vault/rooms/kael.webp','Original defaults must remain unchanged');
 await R.publishArt('ashen-vault','kael',{type:'image/webp',size:1000,name:'new.webp'});
 assert.equal(uploads,1);
 assert(R.artFor('ashen-vault','kael','default').includes('cellbound-room-art'));
 assert(R.artFor('ashen-vault','kael','default').includes('replacement.webp'),'Submitting art leaves the published image unchanged');
 await R.restoreArt('ashen-vault','kael');
 assert.equal(R.artFor('ashen-vault','kael','default'),'default','Restore archives the override through the versioned workflow');
 window.CellboundAdmin.role='moderator';
 await assert.rejects(R.publishArt('ashen-vault','kael',{type:'image/webp',size:1000}),/Owner/);
 console.log('Room art upload regression passed: owner auth, upload, runtime replacement, restore and six content integrations.');
})().catch(error=>{console.error(error);process.exitCode=1});
