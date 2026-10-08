'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('guild.html'),master=read('admin-design-booth-v1.js'),runtime=read('design-booth-content-v1.js'),css=read('admin-design-booth-v1.css');
const manifests=read('tools/runtime-manifest.cjs'),schema=read('supabase/migrations/20261008102000_cellbound_design_booth_blueprints_v1.sql');
for(const id of ['designBoothEntry','openDesignBooth','designBoothMount','designBoothAdventures-quest','designBoothAdventures-dungeon','designBoothAdventures-raid','designAdventureOverlay'])
 assert(html.includes('id="'+id+'"'),'Unified admin/game must include '+id);
for(const old of ['admin-card admin-generator-entry','admin-card admin-character-fit-entry','admin-card admin-room-editor-entry','admin-card admin-comic-scene-entry'])
 assert(!html.includes(old),'Old separate editor card must not be visible: '+old);
for(const old of ['dungeonGeneratorMount','characterFitViewerMount','roomEditorMount','comicSceneEditorMount'])
 assert(master.includes('id="'+old+'"'),'Working legacy editor must remain an internal Design Booth tool: '+old);
for(const name of ['admin-design-booth-v1.js','admin-design-booth-v1.css','design-booth-content-v1.js'])
 assert(manifests.includes(name),'Design Booth asset must be built: '+name);
for(const needle of ['cellbound_design_blueprints','draft_blueprint','cellbound-design-art','only owner','published','enable row level security','cellbound_is_owner'])
 assert(schema.toLowerCase().includes(needle),'Secure design blueprint migration missing: '+needle);
for(const name of ['quest','dungeon','raid','panel','minigame','save','publish','step','artPath'])
 assert(master.includes(name),'Design Booth builder missing '+name);
for(const name of ['CellboundComicScenes','CellboundQuests','runQuest2DFight','registerMinigame','cellbound_design_blueprints'])
 assert(runtime.includes(name),'Playable publishing missing '+name);
assert(css.includes('@media(max-width:720px)'),'iPad/mobile layout missing');
const events={};
const store=new Map();
const db={
 from(name){assert.equal(name,'cellbound_design_blueprints');return{
  select:()=>({eq:()=>({order:async()=>({data:[{id:'test',slug:'test',title:'One test quest',content_type:'quest',version:1,blueprint:{level:1,summary:'Test',steps:[{id:'1',type:'room',title:'Open',text:'Hi',artPath:'art/test.webp'}]}}],error:null})})})
 }},
 storage:{from(bucket){assert.equal(bucket,'cellbound-design-art');return{getPublicUrl:p=>({data:{publicUrl:'https://example.test/storage/'+p}})}}}
};
const window={CellboundGame:{ready:true,getSupabase:()=>db},CellboundAdmin:{isAdmin:true,role:'owner'},addEventListener:(name,fn)=>{events[name]=fn},dispatchEvent:()=>{}};
const document={querySelector:()=>null,body:{classList:{add(){},remove(){}}}};
const localStorage={getItem:()=>null,setItem(){}};
vm.runInNewContext(runtime,{window,document,console,localStorage,setTimeout,Date,alert:()=>{},Promise,CustomEvent:class{}},{filename:'design-booth-content-v1.js'});
(async()=>{
 const core=window.CellboundDesignedContent;
 assert.deepEqual(Array.from(core.templates().map(t=>t.id)),['choice','sequence']);
 const empty=core.cleanBlueprint({level:500,steps:[{type:'fight',enemyHealth:900000,mechanic:'interrupt',panels:[]}],summary:'Long'});
 assert.equal(empty.level,75);assert.equal(empty.steps[0].enemyHealth,50000);
 assert.equal(empty.steps[0].mechanic,'interrupt');
 assert.equal(core.artUrl('hello.webp'),'https://example.test/storage/hello.webp');
 await core.refresh(true);
 const next=core.templates().length;
 core.registerMinigame({id:'sigil-grid',label:'Sigil Grid',description:'Extensible puzzle',play:async()=>true});
 assert.equal(core.templates().length,next+1,'GPT-added minigame templates are independently registrable');
 console.log('Design Booth regression passed: one master entry, old tools embedded, quest/dungeon/raid mounts, secure publishing schema, art storage, reusable minigame registry and blueprint caps.');
})().catch(e=>{console.error(e);process.exitCode=1});
