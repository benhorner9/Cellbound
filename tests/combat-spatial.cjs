'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('src/combat/combat-spatial-v1.js','utf8'),sandbox);const S=sandbox.window.CellboundCombatSpatial;
const unit=(id,style,x,y,extra={})=>({id,style,team:'party',role:style==='tank'?'tank':style==='healer'?'healer':'dps',rx:30,ry:37,head:75,foot:46,logical:{x,y},homeSide:-1,...extra});
const boss=()=>unit('boss','ranged',480,220,{boss:true,role:'enemy',team:'enemy',rx:44,ry:38,homeSide:1});
const party=()=>[boss(),unit('tank','tank',440,220,{target:'boss'}),unit('melee-a','melee',442,222,{target:'boss'}),unit('melee-b','melee',444,218,{target:'boss'}),unit('ranged','ranged',350,220,{target:'boss'}),unit('healer','healer',320,220,{target:'tank'}),unit('pet','melee',449,219,{role:'pet',rx:20,ry:18,target:'boss'})];
function apply(list,g,mode){const r=S.plan(list,g,mode);for(const u of list){u.reserved=r.positions.get(u.id);if(!u.visual&&u.reserved)u.visual={...u.reserved};u.speed=160;u.waypoint=null;u.route=null}return r}
function clear(list,g){for(const u of list.filter(u=>!u.dead)){assert(S.legal(u.reserved,u,g),u.id+' legal');for(const v of list.filter(v=>!v.dead&&v.id>u.id))assert(S.spacingOverlap(u,u.reserved,v,v.reserved,0)<.001,u.id+' reserved separately from '+v.id)}}
const g=S.geometry(744,418),list=party(),original=JSON.stringify(list.map(u=>u.logical));assert.equal(apply(list,g).unresolved,0);clear(list,g);

// Every combat presentation shares a real, screen-safe fighting floor.
// Check stage themes at desktop, portrait iPad and narrow mobile dimensions.
for(const theme of ['shared','ashen','hollow','chaos','blackout','fractured','manor','twelve','null','world','quest','pvp']){
 for(const [width,height] of [[1366,768],[1024,1366],[390,640],[300,340]]){
  const bounds=S.fightingArea(theme,5),floor=S.geometry(width,height,{bounds});
  const actor={rx:18,ry:15,head:Math.min(68,height*.22),foot:14};
  for(const entry of [{x:-100,y:0},{x:width+100,y:height+100},{x:width*.5,y:height*.5}]){
   const safe=S.safePoint(entry,actor,floor);
   assert(S.legal(safe,actor,floor),theme+' '+width+'x'+height+' has a legal visible spawn');
   assert(safe.x>=actor.rx&&safe.x<=width-actor.rx&&safe.y>0&&safe.y<height,theme+' does not draw units off the stage');
  }
 }
}
const ownerFloor=S.geometry(390,640,{bounds:S.fightingArea('ashen')});
const hunter={x:8,y:54},petStart=S.safePoint({x:(hunter.x+4)*3.9,y:(hunter.y+4)*6.4},{rx:20,ry:20,head:36,foot:14},ownerFloor);
assert(S.legal(petStart,{rx:20,ry:20,head:36,foot:14},ownerFloor),'Hunter companion materialises inside fighting floor even by the map edge');
assert(petStart.x>30,'Hunter companion never emerges from CSS left:0');

// Target-contact clearance differs from full artwork clearance: melee feet stay
// distinct while torso/weapon silhouettes may overlap for believable contact.
const mercer=list[0],tank=list.find(u=>u.id==='tank'),melees=list.filter(u=>u.style==='melee'&&u.role!=='pet');
assert(S.distance(mercer.reserved,tank.reserved)<65,'tank engages within visible weapon reach');
assert(melees.every(u=>S.distance(mercer.reserved,u.reserved)<80),'melee flanks remain close to boss');
assert(S.overlap(mercer,mercer.reserved,tank,tank.reserved,0)>0,'full portrait envelopes overlap at striking range');
assert.equal(S.spacingOverlap(mercer,mercer.reserved,tank,tank.reserved,0),0,'ground footprints remain separate');
const first=JSON.stringify(list.map(u=>u.reserved));apply(list,g);assert.equal(JSON.stringify(list.map(u=>u.reserved)),first,'stationary reservations stable');assert.equal(JSON.stringify(list.map(u=>u.logical)),original,'never change logical positions');
const beforeIdleAttack=list.filter(u=>['tank','melee'].includes(u.style)).map(u=>({id:u.id,position:{...u.reserved}}));
list[0].logical.x+=1.5;list[0].logical.y+=.8;apply(list,g);
for(const before of beforeIdleAttack){
 const after=list.find(u=>u.id===before.id);
 assert(S.distance(before.position,after.reserved)<2.5,'minor target drift must not reset '+before.id+' between attacks');
}
list[0].logical.x-=1.5;list[0].logical.y-=.8;apply(list,g);

assert(list.find(u=>u.style==='healer').reserved.x<list.find(u=>u.style==='tank').reserved.x,'healer stays behind tank');
// Room entrances often paint party members outside the combat footprint inset.
// They must travel to their reserved positions continuously, without freezing.
const entryGrid=S.geometry(744,418),entering=unit('room-entry-tank','tank',270,210,{visual:{x:14,y:75},reserved:{x:270,y:210},speed:180,entryRecovery:true});
assert(!S.legal(entering.visual,entering,entryGrid),'room-entry model starts outside combat-safe bounds');
assert.equal(S.waypoint(entering.visual,entering.reserved,entering,entryGrid),entering.reserved,'off-grid entrance aims at a valid reservation');
const beforeEntering={...entering.visual};
S.advance([entering],entryGrid,1/60);
assert(S.distance(entering.visual,beforeEntering)>1,'off-grid entry moves on its first visible frame');
assert(S.distance(entering.visual,entering.reserved)>200,'off-grid entry must not teleport to the destination');
for(let i=0;i<600;i++)S.advance([entering],entryGrid,1/60);
assert(S.distance(entering.visual,entering.reserved)<3,'off-grid entry reaches the fight');
assert.equal(entering.entryRecovery,false,'standard arena collision rules resume after recovery');

// Crowded movement and target change: travel from old stance to reserved stance, never teleport.
list[0].logical.x=350;apply(list,g);for(let i=0;i<600;i++)S.advance(list,g,1/60);
for(const u of list)assert(S.distance(u.visual,u.reserved)<3,u.id+' finishes moving: '+S.distance(u.visual,u.reserved));clear(list,g);
list[2].dead=true;apply(list,g);assert(!list[2].reserved,'death releases reservation');list[2].dead=false;apply(list,g);clear(list,g);
for(const command of ['spread','stack','regroup']){for(const u of list)u.command=command;assert.equal(apply(list,g).unresolved,0);clear(list,g)}
list[2].locked=true;list[2].visual={x:300,y:220};apply(list,g);assert.equal(list[2].reserved.x,300,'control/casting holds actual position');clear(list,g);list[2].locked=false;apply(list,g);
const arena=S.geometry(900,600,{bounds:{left:3,right:97,top:10,bottom:96},arena:{shape:'ellipse',cx:50,cy:55,rx:45,ry:40},blockers:[{shape:'ellipse',x:50,y:50,rx:5,ry:12},{shape:'polygon',points:[[60,60],[70,60],[70,70],[60,70]]}]});assert(!S.legal({x:450,y:300},list[1],arena));assert(!S.legal({x:590,y:390},list[1],arena));assert(!S.legal({x:80,y:100},list[1],arena));
const obstacle=S.geometry(744,418,{blockers:[{shape:'rect',x:50,y:50,w:10,h:20}]});const walker=unit('walker','melee',250,220,{visual:{x:250,y:220},reserved:{x:500,y:220},speed:160});walker.waypoint=S.waypoint(walker.visual,walker.reserved,walker,obstacle);for(let i=0;i<600;i++)S.advance([walker],obstacle,1/60);assert(S.distance(walker.visual,walker.reserved)<3,'routes around authored scenery');
const crowd=Array.from({length:40},(_,i)=>unit('pvp-'+String(i).padStart(2,'0'),'melee',i<20?400:800,400,{team:i<20?'blue':'red',homeSide:i<20?-1:1,rx:26,ry:30}));const large=S.geometry(1400,850),start=performance.now();const largeResult=apply(crowd,large,'pvp');clear(crowd,large);assert.equal(largeResult.unresolved,0);console.log('40-participant planning: '+Math.round(performance.now()-start)+'ms, '+largeResult.checks+' local checks');
// Compare old and new authoritative simulation, stripping only new start-event metadata.
function engine(source){const c={window:{},console};vm.createContext(c);vm.runInContext(fs.readFileSync('src/combat/combat-data-v1.js','utf8'),c);vm.runInContext(source,c);return c.window.CellboundCombatReborn}
const now=engine(fs.readFileSync('src/combat/combat-reborn-v1.js','utf8'));
// Captured from unmodified staging 1714113; no git history required in shallow CI.
const baseline={'mercer':'560586b5d86e32042f516eb0ff6d7d18ca7d98a6692ff97070747c594d5dc0f4','multi-enemy':'076c1ea826ab77a4b0752be206a4abea499f3700a3945b472e044383c36897bd','commands':'673ab7936e5df10aec36e2d783c05ee2a487e9388873fed0bc237a8905cf5c0b'};
const normal=r=>JSON.stringify(r,(key,value)=>key==='abilityId'||key==='environment'||key==='rangeStyle'||key==='unitOrders'||key==='advanced'?undefined:value);
function play(e,opts,seed){if(seed!=='commands')return e.simulate(opts);const s=e.createLiveSession(opts);for(let i=0;i<150;i++){if(i===10)s.command('spread');if(i===60)s.command('stack');if(i===100)s.command('regroup');s.advance(100)}return s.snapshot()}
for(const seed of ['mercer','multi-enemy','commands']){const opts={party:[{id:'tank',class:'Warrior',spec:'Protection',level:20,power:20},{id:'rogue',class:'Rogue',spec:'Assassination',level:20,power:20},{id:'hunt',class:'Hunter',spec:'Beast Mastery',level:20,power:20},{id:'mage',class:'Mage',spec:'Frost',level:20,power:20},{id:'heal',class:'Priest',spec:'Holy',level:20,power:20}],encounter:{kind:'boss',enemies:seed==='multi-enemy'?['A','B','C']:['Deadeye Mercer'],enemyHealth:6000,mechanics:[]},seed,maxDurationMs:15000};assert.equal(crypto.createHash('sha256').update(normal(play(now,opts,seed))).digest('hex'),baseline[seed],seed+' unchanged outcomes, events, resources and threat')}
console.log('Spatial reservations, roles, movement recovery, death/revival, commands, obstacles, large PvP and before/after engine invariance passed.');
