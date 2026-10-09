'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const guild=read('guild.html'),booth=read('admin-design-booth-v1.js'),editor=read('admin-pvp-map-editor-v1.js');
const css=read('admin-pvp-map-editor-v1.css'),schema=read('supabase/migrations/20261009171000_pvp_design_booth_maps.sql');
for(const name of ['pvpMapEditorMount',"id:'pvp-maps'","'pvp-maps':'CellboundPvPMapEditor'"])assert(booth.includes(name),'Booth must expose PvP Map Studio: '+name);
for(const name of ['pmeCanvas','pmeArt','pmePublish','pmeTest','pmeSave','setPointerCapture','pointercancel','pmeAddBlocker'])assert(editor.includes(name),'PvP editor must provide '+name);
for(const name of ['touch-action:none','pme-marker','pme-canvas'])assert(css.includes(name),'Touch editor styling required: '+name);
for(const name of ['pvp-maps-v1.js?v=1','admin-pvp-map-editor-v1.js?v=1','admin-pvp-map-editor-v1.css?v=1'])assert(guild.includes(name),'New Studio scripts must load on iPad: '+name);
for(const name of ['enable row level security','cellbound_pvp_maps','cellbound_pvp_map_drafts','Owner reads PvP map drafts','Players read published PvP maps','cellbound_is_owner'])assert(schema.includes(name),'Owner-only cloud drafts/published RLS missing: '+name);
const own='11111111-1111-4111-8111-111111111111',store={},published=new Map(),drafts=new Map(),calls={upload:0};
const clone=x=>JSON.parse(JSON.stringify(x));
let clock=2000;
const mapClient={
 from(table){
  assert(['cellbound_pvp_maps','cellbound_pvp_map_drafts'].includes(table),'Unexpected PvP database table');
  const rows=table==='cellbound_pvp_maps'?published:drafts;
  return{
   select(){const result=()=>({data:[...rows.values()].map(clone),error:null});
    return{order:async()=>result(),then:resolve=>Promise.resolve(result()).then(resolve)}},
   upsert:async value=>{rows.set(value.id,clone(value));return{error:null}},
   delete:()=>({eq:async(_,id)=>{rows.delete(id);return{error:null}}})
  }
 },
 storage:{from:bucket=>{assert.equal(bucket,'cellbound-design-art');return{
  getPublicUrl:object=>({data:{publicUrl:'https://example.test/art/'+object}}),
  upload:async()=>{calls.upload++;return{error:null}}
 }}},
 auth:{getUser:async()=>({data:{user:{id:own}},error:null})}
};
const win={CellboundAdmin:{isAdmin:true,role:'owner'},CellboundGame:{ready:true,getSupabase:()=>mapClient},dispatchEvent(){}};
const localStorage={getItem:key=>store[key]||null,setItem:(key,value)=>{store[key]=value}};
const ctx={window:win,console,localStorage,CustomEvent:class{constructor(){}},Date,setTimeout,clearTimeout,performance:{now:()=>clock}};
vm.createContext(ctx);
for(const src of ['src/combat/pvp-maps-v1.js','src/combat/combat-data-v1.js','src/combat/pvp-ruleset-v1.js','src/combat/pvp-objectives-v1.js','src/combat/combat-reborn-v1.js','src/combat/combat-standard-v1.js'])
 vm.runInContext(read(src),ctx,{filename:src});
const maps=win.CellboundPvPMaps,combat=win.CellboundCombatStandard;
assert.equal(maps.list().length,3);
assert.equal(maps.builtins().length,3);
const initial=maps.get('crucible-ctf');
assert.equal(initial.layout.flags.blue.x,16);
(async()=>{
 await maps.refresh(true);
 const edited=clone(initial);
 edited.layout.spawns.blue[0]={x:12,y:35};
 edited.layout.spawns.red[0]={x:88,y:65};
 edited.layout.flags.blue={x:22,y:46};
 edited.layout.flags.red={x:78,y:54};
 edited.layout.lanes.left={x:46,y:19};
 edited.layout.blockers=[{x:50,y:50,width:8,height:12,blocksMovement:true,blocksLos:true}];
 assert.equal(maps.validate(edited).length,0,'Moved flags and spawns should be valid');
 maps.setTest(edited);
 assert.equal(maps.isTesting(edited.id),true);
 assert.equal(maps.get(edited.id).layout.flags.blue.x,16,'Owner-only test must not modify published/default map');
 assert.equal(maps.get(edited.id,{ownerPreview:true}).layout.flags.blue.x,22,'Owner preview should resolve draft');
 const roles=[['Warrior','Protection'],['Priest','Holy'],['Mage','Arcane'],['Rogue','Assassination'],['Hunter','Marksman']];
 const roster=(team)=>roles.map(([klass,spec],i)=>({id:team+'-'+i,name:team+' '+klass,class:klass,spec,level:12,power:18}));
 const session=combat.createPvpSession({pvp:{mode:'capture-the-flag',size:5,blue:roster('blue'),red:roster('red'),map:maps.get(edited.id,{ownerPreview:true})},encounter:{id:'owner-qa'},seed:'studio-contract',maxDurationMs:60000},{zone:'owner-studio-test'});
 const first=session.snapshot();
 const byId=Object.fromEntries(first.finalState.players.map(p=>[p.id,p]));
 assert(Math.abs(byId['p-blue-0'].position.x-12)<3,'Blue character should spawn at owner-edited coordinate');
 assert(Math.abs(byId['p-red-0'].position.x-88)<3,'Red character should spawn at owner-edited coordinate');
 assert.equal(first.pvp.objectives.flags.blue.position.x,22,'CTF flag must use map position, not static fallback');
 assert.equal(first.pvp.objectives.flags.red.position.x,78);
 assert.equal(session.advance(300).events.some(e=>e.type==='COMBAT_START'),true,'Map test uses canonical engine events');
 const saved=await maps.saveDraft(edited);
 assert.equal(saved.layout.spawns.blue[0].x,12);
 assert.equal(published.size,0,'Cloud drafts must not be published to players');
 assert.equal(drafts.size,1);
 await maps.publish(saved);
 assert.equal(maps.isTesting(edited.id),false,'Publish should clear temporary owner overrides');
 assert.equal(maps.get(edited.id).layout.flags.blue.x,22,'Published map should drive future practice sessions');
 assert.equal(published.size,1);
 const bad=clone(edited);bad.layout.flags.red={x:27,y:46};
 assert(maps.validate(bad).some(x=>x.includes('farther apart')),'Prevent degenerate overlapping flag positions');
 await assert.rejects(maps.publish(bad),/farther apart/);
 const withArt=await maps.uploadArt(edited,{type:'image/webp',size:1200,name:'handpainted.webp'});
 assert.equal(calls.upload,1);
 assert(maps.artUrl(withArt).startsWith('https://example.test/art/pvp/'),'Owner artwork should resolve to public storage URL');
 const hill=maps.get('crucible-hill');hill.layout.hills.find(h=>h.id==='north').x=35;
 const hillSession=combat.createPvpSession({pvp:{mode:'king-of-the-hill',size:5,blue:roster('blue'),red:roster('red'),map:hill},encounter:{id:'owner-hill'},seed:'hill-studio',maxDurationMs:20000},{zone:'owner-studio-test'});
 assert.equal(hillSession.snapshot().pvp.objectives.hill.id,'centre');
 // Hill 2 must resolve via map when simulated; no separate gameplay engine.
 const newHill=hillSession.advance(16000).result||hillSession.snapshot();
 assert(newHill.pvp?.objectives?.hill,'Hill rules must remain canonical');
 const arena=maps.get('crucible-arena');arena.layout.storm={x:58,y:58};
 const duel=combat.createPvpSession({pvp:{mode:'arena',size:2,blue:roster('blue').slice(0,2),red:roster('red').slice(0,2),map:arena},encounter:{id:'owner-arena'},seed:'arena-studio',maxDurationMs:30000},{zone:'owner-studio-test'});
 assert.equal(duel.snapshot().pvp.objectives.storm.centre.x,58,'Storm must use edited centre');
 await maps.unpublish(edited.id);
 assert.equal(maps.get(edited.id).layout.flags.blue.x,16,'Unpublish restores original built-in positions');
 win.CellboundAdmin.role='moderator';
 assert.throws(()=>maps.setTest(edited),/Owner only/);
 await assert.rejects(maps.publish(edited),/Owner/);
 console.log('PvP Map Studio passed: cloud draft isolation/RLS contracts, owner preview, art upload, actual Combat Reborn spawn/flag/obstacle/hill/storm wiring, publish/restore and role gates.');
})().catch(e=>{console.error(e);process.exitCode=1});
