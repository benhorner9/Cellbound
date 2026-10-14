(()=>{
'use strict';
// Screen-space occupancy for the existing movement owner. Never writes engine units.
// Coordinates in this module are pixels; authored environment coordinates remain 0–100.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
// Visual fighting floors are deliberately inset from the painted scenery.
// These percentages affect presentation only; combat range and pathfinding
// continue to use the authoritative encounter's own environment geometry.
const FIGHTING_FLOORS={
 shared:[9,91,25,90],ashen:[11,89,30,89],hollow:[12,88,29,89],
 chaos:[14,86,32,88],blackout:[12,88,31,88],fractured:[10,90,28,89],
 manor:[11,89,30,89],twelve:[13,87,30,88],null:[11,89,29,89],
 world:[10,90,27,90],quest:[10,90,27,90],pvp:[7,93,20,92]
};
function fightingArea(theme='shared',count=5){
 const [left,right,top,bottom]=FIGHTING_FLOORS[theme]||FIGHTING_FLOORS.shared;
 // Large PvP/raid encounters need more ground to avoid unresolvable overlaps.
 const expand=count>20?5:count>10?3:0;
 return{left:Math.max(4,left-expand),right:Math.min(96,right+expand),
  top:Math.max(12,top-expand),bottom:Math.min(95,bottom+expand)};
}

class Grid{
 constructor(size=80){this.size=size;this.cells=new Map();this.checks=0}
 keys(p,rx,ry){const k=[];for(let x=Math.floor((p.x-rx)/this.size);x<=Math.floor((p.x+rx)/this.size);x++)for(let y=Math.floor((p.y-ry)/this.size);y<=Math.floor((p.y+ry)/this.size);y++)k.push(x+','+y);return k}
 add(u,p){for(const k of this.keys(p,u.rx,u.ry)){if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push({u,p})}}
 near(u,p){const found=new Map();for(const k of this.keys(p,u.rx+20,u.ry+20))for(const a of this.cells.get(k)||[])found.set(a.u.id,a);this.checks+=found.size;return [...found.values()]}
}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes}return yes}
function geometry(width,height,environment={}){
 const b=environment.bounds||{},scale=p=>({x:Number(p.x??p[0])*width/100,y:Number(p.y??p[1])*height/100});
 return{width,height,bounds:{left:(b.left??4)*width/100,right:(b.right??96)*width/100,top:(b.top??12)*height/100,bottom:(b.bottom??91)*height/100},
 polygon:Array.isArray(environment.walkable)&&environment.walkable.length>=3?environment.walkable.map(scale):null,
 ellipse:environment.arena?.shape==='ellipse'?{x:environment.arena.cx*width/100,y:environment.arena.cy*height/100,rx:environment.arena.rx*width/100,ry:environment.arena.ry*height/100}:null,
 blockers:(environment.blockers||[]).filter(b=>b.blocksMovement!==false).map(b=>({...b,...scale(b),points:b.points?.map(scale),w:Number(b.w??b.width??0)*width/100,h:Number(b.h??b.height??0)*height/100,rx:Number(b.rx||b.r||b.radius||0)*width/100,ry:Number(b.ry||b.r||b.radius||0)*height/100}))};
}
function blocked(p,g,pad=0){
 return g.blockers.some(b=>b.shape==='polygon'?inside(p,b.points||[]):['circle','ellipse'].includes(b.shape)?((p.x-b.x)/(b.rx+pad))**2+((p.y-b.y)/(b.ry+pad))**2<1:Math.abs(p.x-b.x)<b.w/2+pad&&Math.abs(p.y-b.y)<b.h/2+pad);
}
function legal(p,u,g){const b=g.bounds,e=g.ellipse;return p.x>=b.left+u.rx&&p.x<=b.right-u.rx&&p.y>=Math.max(b.top,u.head||u.ry)&&p.y<=b.bottom-(u.foot||12)&&(!g.polygon||inside(p,g.polygon))&&(!e||((p.x-e.x)/(e.rx-u.rx*.5))**2+((p.y-e.y)/(e.ry-u.ry*.5))**2<=1)&&!blocked(p,g,Math.min(u.rx,u.ry)*.45)}
function bounded(p,u,g){const b=g.bounds;return{x:clamp(p.x,b.left+u.rx,Math.max(b.left+u.rx,b.right-u.rx)),y:clamp(p.y,Math.max(b.top,u.head||u.ry),Math.max(b.top,u.head||u.ry,b.bottom-(u.foot||12)))}}
// Find the nearest valid visible foot position for an entering actor or summon.
// Called on spawn / resize, not every animation frame.
function safePoint(point,u,g){
 const original={x:Number.isFinite(Number(point?.x))?Number(point.x):g.width/2,y:Number.isFinite(Number(point?.y))?Number(point.y):g.height/2};
 const first=bounded(original,u,g);
 if(legal(first,u,g))return first;
 let best=null,d=Infinity;
 const mid={x:(g.bounds.left+g.bounds.right)/2,y:(g.bounds.top+g.bounds.bottom)/2};
 for(let radius=0;radius<=Math.max(g.width,g.height);radius+=12){
  for(let i=0;i<24;i++){
   const a=i*Math.PI/12,p=bounded({x:first.x+Math.cos(a)*radius,y:first.y+Math.sin(a)*radius},u,g);
   if(!legal(p,u,g))continue;
   const score=distance(p,original);
   if(score<d){best=p;d=score}
  }
  if(best&&radius>d+12)break;
 }
 return best||bounded(mid,u,g);
}
function clearSegment(a,b,u,g){const n=Math.max(2,Math.ceil(distance(a,b)/12));for(let i=1;i<=n;i++){const t=i/n;if(!legal({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},u,g))return false}return true}
function overlap(a,p,b,q,gap=4){const rx=a.rx+b.rx+gap,ry=a.ry+b.ry+gap;return Math.max(0,1-((p.x-q.x)/rx)**2-((p.y-q.y)/ry)**2)}
function groundOverlap(a,p,b,q){return Math.max(0,1-((p.x-q.x)/((a.rx+b.rx)*.5+2))**2-((p.y-q.y)/((a.ry+b.ry)*.28+2))**2)}
function team(u){return u.team||((u.role==='enemy'||u.boss)?'enemy':'party')}
function melee(u){return u.style==='tank'||u.style==='melee'||u.role==='pet'||(u.role==='enemy'&&u.style!=='ranged')}
// Engaged opponents may overlap in upper-body artwork during a strike, but
// their feet must remain distinct. Other encounters keep full-sprite spacing.
function contactPair(a,b){return team(a)!==team(b)&&((melee(a)&&a.contactTarget===b.id)||(melee(b)&&b.contactTarget===a.id))}
function spacingOverlap(a,p,b,q,gap=4){
 if(contactPair(a,b))return groundOverlap(a,p,b,q);
 // Teammates on the same target may overlap a little in perspective without
 // occupying the same stance; normal separation still applies to the backline.
 if(team(a)===team(b)&&a.contactTarget&&a.contactTarget===b.contactTarget&&melee(a)&&melee(b)){
  const rx=(a.rx+b.rx)*.74+gap,ry=(a.ry+b.ry)*.57+gap;
  return Math.max(0,1-((p.x-q.x)/rx)**2-((p.y-q.y)/ry)**2);
 }
 return overlap(a,p,b,q,gap);
}
function rank(u){return u.boss?0:u.style==='tank'?1:u.role==='enemy'?2:u.style==='melee'?3:u.style==='healer'?4:u.role==='pet'?6:5}
function preferred(u,list,placed,g,mode){
 const p=bounded(u.logical,u,g);u.contactTarget=null;
 // Attacks never cause a cosmetic stance reset. Only movement or a new
 // engagement should trigger a new flanking position.
 if(u.locked||mode==='pvp'||u.command||u.boss){u.stance=null;return p}
 const foes=list.filter(v=>!v.dead&&team(v)!==team(u)&&v.role!=='pet');
 const target=foes.find(v=>v.id===u.target)||foes.sort((a,b)=>distance(u.logical,a.logical)-distance(u.logical,b.logical)||a.id.localeCompare(b.id))[0];
 if(!target)return p;
 const t=placed.get(target.id)||target.reserved||target.logical;
 const allies=list.filter(v=>team(v)===team(u)&&v.role!=='pet');
 const home=allies.reduce((a,v)=>({x:a.x+v.logical.x/allies.length,y:a.y+v.logical.y/allies.length}),{x:0,y:0});
 const side=u.homeSide||(home.x<=target.logical.x?-1:1),base=side<0?Math.PI:0;
 if(u.style==='tank'||u.style==='melee'||u.role==='pet'||u.role==='enemy'&&u.style!=='ranged'){
  // Only engage a target the simulation has actually approached. No cosmetic chase across a room.
  if(distance(u.logical,target.logical)>Math.max(g.width*.16,125)){u.stance=null;return p}
  u.contactTarget=target.id;
  const drift=Math.max(7,g.width*.012);
  if(u.stance?.target===target.id&&u.reserved&&
     distance(u.logical,u.stance.source)<drift&&
     distance(target.logical,u.stance.targetPos)<drift&&
     legal(u.reserved,u,g))return {...u.reserved};
  u.stance={target:target.id,source:{...u.logical},targetPos:{...target.logical}};
  const peers=list.filter(v=>team(v)===team(u)&&v.target===u.target&&v.style===u.style).sort((a,b)=>a.id.localeCompare(b.id)),slot=Math.max(0,peers.indexOf(u));
  const offsets=u.style==='tank'?[0,-.42,.42]:u.role==='pet'?[1.08,-1.08,.7]:[.72,-.72,1.15,-1.15,.32,-.32];
  const angle=base+offsets[slot%offsets.length]+((hash(u.id)%7)-3)*.018;
  // Full render footprints include weapons and tall artwork. Stopping at their
  // outer edges made real melee hits look disconnected despite correct range.
  const rx=target.rx*.72+u.rx*.62+5,ry=target.ry*.54+u.ry*.50+5;
  return bounded({x:t.x+Math.cos(angle)*rx,y:t.y+Math.sin(angle)*ry},u,g);
 }
 u.stance=null;
 if(u.role!=='enemy'){
  // Backline preference supplements the actual ranged formation; heal targets never pull a healer forward.
  const away=Math.max(u.style==='healer'?g.width*.24:g.width*.19,target.rx+u.rx+35);
  const x=side<0?Math.min(p.x,t.x-away):Math.max(p.x,t.x+away);
  return bounded({x,y:Math.max(p.y,t.y+u.ry+(u.style==='healer'?target.ry+20:15))},u,g);
 }
 return p;
}
function plan(units,g,mode='pve'){
 const grid=new Grid(),placed=new Map(),ordered=units.filter(u=>!u.dead).sort((a,b)=>Number(!!b.locked)-Number(!!a.locked)||rank(a)-rank(b)||a.id.localeCompare(b.id));let unresolved=0;
 for(const u of ordered){
  if(u.locked&&u.visual){const hold=legal(u.visual,u,g)?u.visual:safePoint(u.visual,u,g);u.conflict=grid.near(u,hold).reduce((n,a)=>n+spacingOverlap(u,hold,a.u,a.p,0),0);if(u.conflict>.01)unresolved++;placed.set(u.id,{...hold});grid.add(u,hold);continue}
  const ideal=preferred(u,ordered,placed,g,mode),gap=u.command==='spread'?16:u.command==='stack'?0:5;
  if(u.reserved&&distance(u.reserved,ideal)<12&&!u.zones?.some(z=>inside(u.reserved,z)!==inside(u.logical,z))&&legal(u.reserved,u,g)&&grid.near(u,u.reserved).every(a=>spacingOverlap(u,u.reserved,a.u,a.p,gap)===0)){u.conflict=0;placed.set(u.id,{...u.reserved});grid.add(u,u.reserved);continue}
  const candidates=[ideal];
  if(u.reserved&&distance(u.reserved,ideal)<Math.max(22,u.rx*.7))candidates.unshift(u.reserved);
  // Stable reservations, then a bounded search. No per-frame random motion or mutual pushing.
  for(let r=1;r<=(units.length>20?15:10);r++)for(let a=0;a<16;a++){const angle=(a/16)*Math.PI*2+(hash(u.id)%13)*.018;candidates.push(bounded({x:ideal.x+Math.cos(angle)*r*18,y:ideal.y+Math.sin(angle)*r*15},u,g))}
  // Include a coarse whole-room fallback for narrow views where a backline edge is full.
  for(let y=g.bounds.top;y<=g.bounds.bottom;y+=24)for(let x=g.bounds.left;x<=g.bounds.right;x+=24)candidates.push({x,y,fallback:true});
  let best=null,score=Infinity,penetration=0;
  for(const p of candidates){
   if(p.fallback&&best&&penetration===0)break;
   if(!legal(p,u,g))continue;
   // Fixed environmental mechanics keep their logical inside/outside relationship.
   if(u.zones?.some(z=>inside(p,z)!==inside(u.logical,z)))continue;
   const baseScore=distance(p,ideal)**2+(u.reserved?distance(p,u.reserved)**2*.38:0)+distance(p,u.logical)**2*.06;
   if(baseScore>=score)continue;
   const overlaps=grid.near(u,p).reduce((n,a)=>n+spacingOverlap(u,p,a.u,a.p,gap),0);
   const s=overlaps*1e6+baseScore;
   if(s<score){score=s;best=p;penetration=overlaps}if(s<.01)break;
  }
  const p=best||safePoint(u.logical,u,g);u.conflict=penetration;if(penetration>.01||!best)unresolved++;
  placed.set(u.id,{...p});grid.add(u,p);
 }
 return{positions:placed,checks:grid.checks,unresolved};
}
// Static obstacle detours are selected once per reservation, not on every animation frame.
function waypoint(from,to,u,g){
 // An authored room entrance can start beyond the safe footprint inset.
 // Let the actor walk into bounds instead of producing a dead waypoint.
 if(!legal(from,u,g))return to;
 if(clearSegment(from,to,u,g))return to;
 const candidates=[];for(const b of g.blockers){const dx=(b.w/2||b.rx)+u.rx+8,dy=(b.h/2||b.ry)+u.ry+8;for(const sx of [-1,1])for(const sy of [-1,1])candidates.push({x:b.x+sx*dx,y:b.y+sy*dy})}
 if(g.polygon)for(const p of g.polygon)candidates.push({x:p.x+(g.width/2-p.x)*.06,y:p.y+(g.height/2-p.y)*.06});
 return candidates.filter(p=>legal(p,u,g)&&clearSegment(from,p,u,g)&&clearSegment(p,to,u,g)).sort((a,b)=>(distance(from,a)+distance(a,to))-(distance(from,b)+distance(b,to)))[0]||from;
}
function advance(units,g,dt){
 const grid=new Grid();for(const u of units)if(!u.dead&&u.visual)grid.add(u,u.visual);
 let moving=false,routeBudget=2;
 for(const u of units){if(u.dead||u.locked||!u.visual||!u.reserved)continue;
  // Only room-entry actors may recover continuously from an unsafe initial pose.
  const recovering=!!u.entryRecovery&&!legal(u.visual,u,g);
  if(u.entryRecovery&&!recovering)u.entryRecovery=false;
  if(u.route?.length&&distance(u.visual,u.route[0])<3)u.route.shift();
  const target=u.route?.[0]||u.waypoint||u.reserved,dist=distance(u.visual,target);if(dist<1){if(u.waypoint&&distance(u.waypoint,u.reserved)>1&&routeBudget-->0){u.route=route(u,units,g);u.waypoint=u.route?u.reserved:waypoint(u.visual,u.reserved,u,g)}continue}
  const step=Math.min(dist,Math.max(35,u.speed||150)*Math.min(dt,.07)),dx=(target.x-u.visual.x)/dist,dy=(target.y-u.visual.y)/dist;
  let best=u.visual,bestScore=Infinity;const neighbours=grid.near(u,u.visual);
  // Prefer forward travel, try two short sidesteps, otherwise yield. Never displace another actor.
  for(const angle of [0,.65,-.65,1.12,-1.12]){const x=dx*Math.cos(angle)-dy*Math.sin(angle),y=dx*Math.sin(angle)+dy*Math.cos(angle),p={x:u.visual.x+x*step,y:u.visual.y+y*step};
   if(!legal(p,u,g)){
    if(!recovering||distance(p,u.reserved)>=distance(u.visual,u.reserved)-.1)continue;
    const pad=Math.min(u.rx,u.ry)*.45;
    // Leaving an illegal entrance is allowed; entering new scenery is not.
    if(blocked(p,g,pad)&&!blocked(u.visual,g,pad))continue;
    if(g.polygon&&inside(u.visual,g.polygon)&&!inside(p,g.polygon))continue;
    const e=g.ellipse;
    if(e){
     const level=v=>((v.x-e.x)/(e.rx-u.rx*.5))**2+((v.y-e.y)/(e.ry-u.ry*.5))**2;
     if(level(u.visual)<=1&&level(p)>1)continue;
    }
   }
   let cost=distance(p,target);for(const a of neighbours)if(a.u!==u){const old=groundOverlap(u,u.visual,a.u,a.p),next=groundOverlap(u,p,a.u,a.p);if(next>old+.015)cost+=next*10000}
   if(cost<bestScore){bestScore=cost;best=p}
  }
  if(bestScore<distance(u.visual,target)+8){u.visual=best;moving=true}
  const progress=dist-distance(u.visual,target);u.stalled=progress<step*.18?(u.stalled||0)+dt:0;
  if(u.stalled>.35&&routeBudget-->0){u.route=route(u,units,g);if(u.route)u.waypoint=u.reserved;u.stalled=-.65}
 }
 return moving;
}
// A bounded, coarse route search is only used when local steering cannot progress.
// Route around occupied ground, rather than moving the actor that is in the way.
function route(u,units,g){
 const step=18,cols=Math.ceil(g.width/step),rows=Math.ceil(g.height/step),key=p=>Math.round(p.y/step)*cols+Math.round(p.x/step);
 const start={...u.visual,key:key(u.visual),cost:0,parent:null},open=[start],costs=new Map([[start.key,0]]),grid=new Grid();
 for(const a of units)if(a!==u&&!a.dead&&a.visual)grid.add(a,a.visual);
 const free=p=>legal(p,u,g)&&grid.near(u,p).every(a=>groundOverlap(u,p,a.u,a.p)<Math.max(.02,groundOverlap(u,u.visual,a.u,a.p)-.005));
 let end=null,visited=0;
 while(open.length&&visited++<Math.min(1800,cols*rows)){
  open.sort((a,b)=>b.cost+distance(b,u.reserved)-a.cost-distance(a,u.reserved));const cur=open.pop();
  if(distance(cur,u.reserved)<step*1.4&&clearSegment(cur,u.reserved,u,g)){end=cur;break}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const p={x:cur.x+dx*step,y:cur.y+dy*step},k=key(p),cost=cur.cost+Math.hypot(dx,dy)*step;
   if(cost>=(costs.get(k)??Infinity)||!free(p)||!free({x:(cur.x+p.x)/2,y:(cur.y+p.y)/2}))continue;
   costs.set(k,cost);open.push({...p,key:k,cost,parent:cur});
  }
 }
 if(!end)return null;const path=[u.reserved];while(end.parent){path.unshift({x:end.x,y:end.y});end=end.parent}return path;
}
window.CellboundCombatSpatial={version:2,Grid,geometry,legal,safePoint,fightingArea,overlap,plan,advance,waypoint,route,team,distance,spacingOverlap};
})();
