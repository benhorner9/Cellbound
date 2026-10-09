'use strict';
const assert=require('node:assert/strict');
require('./item-catalog.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

const html=read('guild.html'),master=read('admin-design-booth-v1.js'),runtime=read('design-booth-content-v1.js'),css=read('admin-design-booth-v1.css');
const manifests=read('tools/runtime-manifest.cjs'),schema=read('supabase/migrations/20261008102000_cellbound_design_booth_blueprints_v1.sql');
// Future-content studio: reusable cloud templates and safe base-item variants.
const creator=read('admin-design-library-v1.js');
const migration=read('supabase/migrations/20261008200000_cellbound_design_templates.sql');
assert(html.includes('admin-design-library-v1.js?v=1')&&master.includes("id:'library'"),'One unified booth must load the reusable Content Creator');
assert(creator.includes('CellboundDesignLibrary')&&creator.includes('insertIntoAdventure')&&creator.includes('data-lib-upload'),'Room, boss, comic and minigame content must support upload and adventure reuse');
assert(creator.includes('baseItemId')&&runtime.includes('function installDesignedItems'),'Equipment is cloned from known balanced items and loaded into the canonical gear registry');
assert(migration.includes('enable row level security')&&migration.includes('cellbound_is_owner()')&&migration.includes("status='published'"),'New content must enforce owner RLS and player-visible published state');


const builtins=read('boss-drop-tables-v1.js'),dropSchema=read('supabase/migrations/20261008141500_cellbound_boss_drop_tables_v1.sql');
for(const id of ['designBoothEntry','openDesignBooth','designBoothMount','designBoothAdventures-quest','designBoothAdventures-dungeon','designBoothAdventures-raid','designAdventureOverlay'])
 assert(html.includes('id="'+id+'"'),'Unified admin/game must include '+id);
for(const old of ['admin-card admin-generator-entry','admin-card admin-character-fit-entry','admin-card admin-room-editor-entry','admin-card admin-comic-scene-entry'])
 assert(!html.includes(old),'Old separate editor card must not be visible: '+old);
for(const old of ['dungeonGeneratorMount','characterFitViewerMount','roomEditorMount','comicSceneEditorMount'])
 assert(master.includes('id="'+old+'"'),'Working legacy editor must remain an internal Design Booth tool: '+old);
for(const name of ['admin-design-library-v1.js','admin-design-booth-v1.js','admin-design-booth-v1.css','design-booth-content-v1.js','boss-drop-tables-v1.js','admin-item-catalog-v1.js'])
 assert(manifests.includes(name),'Design Booth asset must be built: '+name);
for(const needle of ['cellbound_design_blueprints','draft_blueprint','cellbound-design-art','only owner','published','enable row level security','cellbound_is_owner'])
 assert(schema.toLowerCase().includes(needle),'Secure design blueprint migration missing: '+needle);
for(const needle of ['cellbound_boss_drop_tables','cellbound_is_owner','enable row level security','for select','for insert','for update','for delete'])
 assert(dropSchema.toLowerCase().includes(needle),'Shared boss drop-table schema must be owner-protected: '+needle);
assert(html.includes('boss-drop-tables-v1.js'),'Shared native boss loot runtime must be loaded');
assert(html.includes('admin-item-catalog-v1.js')&&master.includes("id:'items'")&&master.includes('id="dboCatalog"'),'Owner admin must include the full item index panel');
assert(master.includes("id:'drops'")&&master.includes('dboBossPicker')&&master.includes('function renderDrops'),'A standalone seventh Drop Tables tab must expose one selector for all bosses');
assert(!master.includes("+'</div>'+imageControl(s)+lootEditor(s);"),'Embedded boss drop editor must be retired');
assert(builtins.includes('function award(')&&builtins.includes('bossBonusDropClaims'),'Existing game boss loot hooks must avoid replay dupes');
for(const path of ['src/dungeons/dungeon-2d-v1.js','src/dungeons/hollow-sanctum-v1.js','src/dungeons/chaos-canyon-v1.js','src/dungeons/fractured-ages-v1.js','src/dungeons/blackout-station-v1.js'])
 assert(read(path).includes('CellboundBossDropTables?.award?.'),'Every supported legacy dungeon must award configured boss loot on victory: '+path);
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
const nativeEvents={};
const nativeState={bank:[],materials:{},activity:[],bossBonusDropClaims:{}};
const nativeDB={
 from(table){assert.equal(table,'cellbound_boss_drop_tables');return {
  select:()=>({order:async()=>({data:[{boss_key:'ashen-vault:ashwarden',drops:[{kind:'material',key:'hollowroot',chance:100,quantity:2}]}],error:null})}),
  upsert:async()=>({error:null})
 }},
 auth:{getUser:async()=>({data:{user:{id:'owner-test'}},error:null})}
};
const nativeWindow={CellboundGame:{
 ready:true,getSupabase:()=>nativeDB,getState:()=>nativeState,
 addMaterial:(key,qty)=>{nativeState.materials[key]=(nativeState.materials[key]||0)+qty},
 addBankItem:it=>nativeState.bank.push(it),save(){},persistState:async()=>true
},CellboundAdmin:{isAdmin:true,role:'owner'},CellboundDesignedContent:null,CellboundGear:{byId:()=>null},CellboundProfessions:{MATERIALS:{hollowroot:{name:'Hollowroot'}}}};
vm.runInNewContext(builtins,{window:nativeWindow,console,Date,Math,Error,Set,Map,Object,Number,String,Array,Promise},{filename:'boss-drop-tables-v1.js'});
const nativeAPI=nativeWindow.CellboundBossDropTables;
assert(nativeAPI.bosses().length>=18,'Game bosses must appear in central selector');
(async()=>{
 const core=window.CellboundDesignedContent;
 assert.deepEqual(Array.from(core.templates().map(t=>t.id)),['choice','sequence']);
 const empty=core.cleanBlueprint({level:500,steps:[{type:'fight',enemyHealth:900000,mechanic:'interrupt',panels:[]}],summary:'Long'});
 assert.equal(empty.level,75);assert.equal(empty.steps[0].enemyHealth,50000);
 assert.equal(empty.steps[0].mechanic,'interrupt');
 assert.equal(core.artUrl('hello.webp'),'https://example.test/storage/hello.webp');
 // Individual boss loot is resolved from the shipped catalogue, not arbitrary draft item JSON.
 const gear={itemId:'test-sword-t1',name:'Test Sword',tier:1,enabled:true,dropEnabled:true,raidExclusive:false,slot:'Weapon',class:'Warrior'};
 const t5={itemId:'test-t5',name:'Forbidden Raid Item',tier:5,enabled:true,dropEnabled:false,raidExclusive:true};
 window.CellboundGear={items:[gear,t5],byId:id=>id==='test-sword-t1'?gear:null,rollItemAffixes:base=>({...base,rollId:'affix-1'})};
 window.CellboundProfessions={MATERIALS:{hollowroot:{name:'Hollowroot',rarity:'Common'},'ancient-soul':{name:'Ancient Soul',rarity:'Epic',endgame:true}}};
 const catalog=core.lootCatalog();
 assert.equal(catalog.gear.length,1,'No T5 or raid-exclusive gear can be authored as a boss drop');
 assert.equal(catalog.materials.length,1,'Endgame crafting materials cannot be configured');
 const good=core.cleanBlueprint({level:5,steps:[{id:'butler',type:'fight',title:'The Butler',drops:[
  {kind:'gear',key:'test-sword-t1',chance:30,quantity:999},
  {kind:'material',key:'hollowroot',chance:100,quantity:3},
  {kind:'gear',key:'test-t5',chance:100,quantity:1},
  {kind:'material',key:'ancient-soul',chance:100,quantity:1}
 ]}]});
 assert.equal(good.steps[0].drops.length,2,'Existing approved items survive publish sanitisation; forbidden ones are dropped');
 assert.equal(good.steps[0].drops[0].quantity,1,'Gear quantity is exactly one');
 const rolls=core.rollBossLoot(good.steps[0],{random:()=>0});
 assert.equal(rolls.length,2,'Boss defeat independently rolls item and material rewards');
 assert.equal(core.rollBossLoot(good.steps[0],{random:()=>0.5}).length,1,'Individual percentage chances are respected');
 assert.equal(core.rollBossLoot({drops:[{kind:'gear',key:'test-sword-t1',chance:100},{kind:'gear',key:'test-sword-t1',chance:100}]},{random:()=>0}).length,0,'A boss cannot grant an excessive combined gear drop chance');
 assert(runtime.includes('Game.addBankItem(item)')&&runtime.includes('Game.addMaterial(drop.key,drop.quantity)')&&runtime.includes('await Game.persistState?.()'),'Victory awards must enter canonical Bank and cloud save paths');
 assert(runtime.includes('preview:Boolean(override),raid:row.content_type'), 'Owner previews and prototype raids must never award loot');
 assert(master.includes('id="dboLootSearch"')&&master.includes('id="dboLootTierFilter"')&&master.includes('id="dboLootSort"'),'Boss drop overview must support item name search, tier filtering and sorting');
 assert(master.includes('ITEM NAME')&&master.includes('DROP CHANCE')&&master.includes('function describeDrop'),'Boss drop table must show each tier, full item name and percentage');
 assert(master.includes('id="dboAddLoot"')&&master.includes('data-db-edit-row')&&master.includes('data-db-remove-drop'),'Boss drop table must expose add/edit/remove without opening each item first');
 assert(master.includes("it.label:it.label")&&!master.includes("it.name:it.name"),'Item selectors must use canonical loot catalogue display names');
 assert(css.includes('.dbo-loot-table-row')&&css.includes('.dbo-loot-prob')&&css.includes('@media(max-width:600px)'),'Loot overview must support readable iPad and phone layouts');
 assert(html.includes('admin-design-booth-v1.js?v=7')&&html.includes('admin-design-booth-v1.css?v=6')&&html.includes('admin-combat-ui-editor-v1.js?v=1'),'Safari must request updated Design Booth assets');

 nativeWindow.CellboundDesignedContent=core;
 await nativeAPI.refresh(true);
 const awards=await nativeAPI.award('ashen-vault:ashwarden','attempt-1','Ash Warden Kael');
 assert.equal(awards.length,1,'First successful boss kill awards configured loot');
 assert.equal(nativeState.materials.hollowroot,2,'Configured materials land immediately in Guild inventory');
 assert.equal((await nativeAPI.award('ashen-vault:ashwarden','attempt-1','Ash Warden Kael')).length,0,'A resumed attempt cannot claim the same boss twice');
 assert.equal(nativeState.materials.hollowroot,2,'Resumed boss cannot duplicate materials');
 assert.equal((await nativeAPI.award('manor:butler','qa','The Butler')).length,0,'Prototype raid bosses do not award item rewards');
  await core.refresh(true);
 const next=core.templates().length;
 core.registerMinigame({id:'sigil-grid',label:'Sigil Grid',description:'Extensible puzzle',play:async()=>true});
 assert.equal(core.templates().length,next+1,'GPT-added minigame templates are independently registrable');
 console.log('Design Booth regression passed: one master entry, old tools embedded, quest/dungeon/raid mounts, secure publishing schema, art storage, reusable minigame registry, a central eight-tab boss loot editor and item catalogue, legacy boss registry/RLS, restricted drops and blueprint caps.');
})().catch(e=>{console.error(e);process.exitCode=1});
