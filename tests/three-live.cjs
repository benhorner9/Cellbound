'use strict';
/* Tests the real-event reducer without requiring a GPU or fake combat outcomes. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('src/combat/three-live-v1.js'),style=read('src/combat/three-live-v1.css');
assert.doesNotThrow(()=>new Function(js));
const events={};
const window={addEventListener(name,fn){events[name]=fn;},CellboundCombatUILayoutEditor:{isOwner:()=>true}};
const document={readyState:'loading',addEventListener(){}};
class MutationObserver{observe(){} disconnect(){}}
vm.runInNewContext(js,{window,document,MutationObserver,console},{filename:'three-live-v1.js'});
const bridge=window.CellboundThreeCombat;
assert(bridge&&bridge.isOwner());
window.CellboundCombatUILayoutEditor={isOwner:()=>false};
window.CellboundAdmin={isAdmin:true,role:'admin'};
assert(bridge.isOwner(),'registered admin must see the 3D alpha toggle');
window.CellboundAdmin={isAdmin:false,role:null};
assert.equal(bridge.isOwner(),false,'public player must not see the admin toggle');
window.CellboundAdmin={isAdmin:true,role:'owner'};
const s=bridge.createSnapshot();
const emit=e=>bridge.reduce(s,e);
emit({type:'COMBAT_START',payload:{units:[
 {id:'p-hero',role:'tank',position:{x:20,y:65},alive:true},
 {id:'e-boss',role:'enemy',position:{x:70,y:40},alive:true,classification:'boss'}],
 enemies:[{id:'e-boss',name:'Embermaw',classification:'boss'}]}});
assert.equal(s.units.size,2);
assert.equal(s.units.get('e-boss').name,'Embermaw');
emit({type:'MOVEMENT_START',source:'p-hero',position:{x:20,y:65},payload:{to:{x:51,y:55},duration:650}});
assert.equal(s.units.get('p-hero').destination.x,51);
emit({type:'MOVEMENT_END',source:'p-hero',position:{x:51,y:55}});
assert.equal(s.units.get('p-hero').position.x,51);
assert.equal(s.units.get('p-hero').destination,null);
emit({type:'DAMAGE_DEALT',source:'p-hero',target:'e-boss',payload:{targetHpPct:34}});
assert.equal(s.units.get('e-boss').healthPct,34);
emit({type:'MECHANIC_TELEGRAPH',source:'e-boss',target:'p-hero',payload:{token:'fire-1',mechanicType:'cone',duration:1200}});
assert.equal(s.telegraphs.get('fire-1').type,'cone');
emit({type:'MECHANIC_RESOLVE',payload:{token:'fire-1'}});
assert.equal(s.telegraphs.size,0);
emit({type:'GROUND_HAZARD_SPAWNED',position:{x:50,y:50},payload:{hazardId:'lava-1',radius:16}});
assert.equal(s.hazards.size,1);
emit({type:'GROUND_HAZARD_EXPIRED',payload:{hazardId:'lava-1'}});
assert.equal(s.hazards.size,0);
emit({type:'ENEMY_DEFEATED',source:'p-hero',target:'e-boss'});
assert.equal(s.units.get('e-boss').alive,false);
emit({type:'PLAYER_DEFEATED',source:'e-boss',target:'p-hero'});
assert.equal(s.units.get('p-hero').alive,false);
emit({type:'PLAYER_REVIVED',target:'p-hero'});
assert.equal(s.units.get('p-hero').alive,true);
emit({type:'PET_SUMMONED',source:'p-hero',target:'e-boss',position:{x:30,y:55},payload:{petId:'pet-hunter-1',name:'Companion'}});
assert.equal(s.units.get('pet-hunter-1').role,'pet');
assert.equal(s.units.get('e-boss').role,'enemy','summons cannot turn their target into a pet');
emit({type:'PET_DISMISSED',payload:{petId:'pet-hunter-1'}});
assert.equal(s.units.has('pet-hunter-1'),false);
emit({type:'COMBAT_END'});
assert.equal(s.ended,true);
assert.equal(s.telegraphs.size,0);
emit({type:'COMBAT_START',payload:{units:[{id:'p-new',position:{x:44,y:66},alive:true}]}});
assert.equal(s.units.size,1,'new encounter must replace old party');
assert(!s.units.has('e-boss'),'old boss cannot leak into a new fight');
for(const feature of ['OrthographicCamera','DAMAGE_DEALT','HEAL_RECEIVED','MECHANIC_TELEGRAPH','GROUND_HAZARD_SPAWNED','MOVEMENT_START','MOVEMENT_END','CAST_START','ABILITY_START','COMBAT_END','renderer.dispose','bridge.load()'])assert(js.includes(feature),'missing 3D feature '+feature);
assert(style.includes('.cb3d-stage')&&style.includes('.cb3d-toggle'));
assert(js.includes('wrap.appendChild(button)'),'toggle must mount in visible battlefield rather than hidden header');
assert(style.includes('.cbcombat-arena-wrap > .cb3d-toggle'),'battlefield toggle requires visible anchored styles');
assert(js.includes('states.set(arena,s)'),'enable-before-COMBAT_START must share one event snapshot');
const guild=read('guild.html'),manifest=require('../tools/runtime-manifest.cjs');
for(const name of ['three-live-v1.js','three-live-v1.css'])assert(manifest.files.includes(name),'3D asset not packaged: '+name);
assert(guild.includes('./three-live-v1.js?v=1'));
assert(guild.includes('./three-live-v1.css?v=1'));
assert(guild.indexOf('three-live-v1.js')>guild.indexOf('admin-combat-ui-editor-v1.js'),'owner gate must exist before bridge script runs');
// DOM smoke: an authorised admin sees the control even when no header is shown.
function testBattleToggle(admin){
 const actions={};
 const wrap={children:[],appendChild(node){this.children.push(node);}};
 const arena={isConnected:true,closest(selector){return selector==='.cbcombat-arena-wrap'?wrap:null}};
 const shell={isConnected:true,dataset:{},querySelector(selector){
  return selector.includes('.cbcombat-arena-wrap >')?arena:null;
 }};
 const document={
  readyState:'loading',documentElement:{},
  addEventListener(name,cb){actions[name]=cb;},
  querySelectorAll(selector){return selector==='.cbcombat-shell'?[shell]:[];},
  createElement(tag){return{tagName:tag,setAttribute(){},addEventListener(){}};}
 };
 const window={
  CellboundAdmin:{isAdmin:admin,role:admin?'admin':null},
  CellboundCombatUILayoutEditor:{isOwner:()=>false},
  addEventListener(name,cb){actions['window:'+name]=cb;}
 };
 vm.runInNewContext(js,{window,document,MutationObserver:class{observe(){}},console});
 actions.DOMContentLoaded();
 return wrap.children.filter(x=>x.className==='cb3d-toggle');
}
assert.equal(testBattleToggle(true).length,1,'admin should see an in-battle toggle without a header');
assert.equal(testBattleToggle(false).length,0,'public player should not see the alpha toggle');

console.log('Three.js live-event reducer, admin battlefield switch, resource packaging: PASS.');
