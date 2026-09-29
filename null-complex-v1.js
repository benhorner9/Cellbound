(()=>{
'use strict';
const VERSION='1.0.0',SIZE=10,MAX_FLOOR=10,ATTEMPTS=2,WINDOW_MS=5*24*60*60*1000;
const Game=()=>window.CellboundGame,C=()=>window.CellboundCombatReborn;
const PARTS=[['cable','Conduit Cable','⌁'],['cell','Power Cell','◈'],['fuse','Reactor Fuse','⌬']];
const MATERIALS=[
 {key:'faded-cell-fragment',name:'Faded Cell Fragment',min:1},
 {key:'zeltiran-iron',name:'Zeltiran Iron',min:1},
 {key:'warden-iron',name:'Warden Iron',min:3},
 {key:'ancient-soul',name:'Ancient Soul',min:5},
 {key:'void-crystal',name:'Void Crystal',min:7}
];
const ENEMIES=[
 {name:'Splice',classification:'trash',note:'Fast failed specimen.'},
 {name:'Reactor Husk',classification:'trash',note:'Unstable experimental host.'},
 {name:'Siphon',classification:'elite',note:'Drains power from the party.'},
 {name:'Bulwark Specimen',classification:'elite',note:'Armoured containment subject.'},
 {name:'Null Stalker',classification:'elite',note:'Predatory phase experiment.'},
 {name:'Overseer Drone',classification:'elite',note:'Facility control construct.'}
];
let run=null,mount=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let x=hash(seed)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function state(){
 const st=Game()?.getState?.();if(!st)return null;
 st.nullComplex=st.nullComplex&&typeof st.nullComplex==='object'?st.nullComplex:{windowStart:null,attemptsUsed:0,bestFloor:0,runs:[],activeRun:null};
 const n=st.nullComplex,now=Date.now(),start=Date.parse(n.windowStart||'');
 if(!Number.isFinite(start)||now-start>=WINDOW_MS){n.windowStart=new Date(now).toISOString();n.attemptsUsed=0;n.activeRun=null}
 n.attemptsUsed=Math.max(0,Number(n.attemptsUsed)||0);n.bestFloor=Math.max(0,Number(n.bestFloor)||0);n.runs=Array.isArray(n.runs)?n.runs:[];
 return n
}
function attemptsLeft(){const n=state();return n?Math.max(0,ATTEMPTS-n.attemptsUsed):0}
function persist(){const n=state();if(n)n.activeRun=run?JSON.parse(JSON.stringify(run)):null;Game()?.save?.();Game()?.persistState?.()}
function key(x,y){return x+','+y}
function generateFloor(floor,seed){
 const r=rng(seed+':'+floor),start={x:4,y:4},cells={};
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)cells[key(x,y)]={x,y,type:'empty',searched:false,cleared:false};
 cells[key(start.x,start.y)].type='entrance';
 const available=Object.values(cells).filter(c=>c.type==='empty');
 const take=()=>available.splice(Math.floor(r()*available.length),1)[0];
 const tele=take();tele.type='teleporter';
 PARTS.forEach((p,i)=>{const c=take();c.type='search';c.part=p[0]});
 for(let i=0;i<18;i++){const c=take();if(c)c.type='search'}
 for(let i=0;i<22;i++){const c=take();if(c)c.type='combat'}
 for(let i=0;i<3;i++){const c=take();if(c)c.type='breach'}
 return{cells,start,teleporter:{x:tele.x,y:tele.y}}
}
function newFloor(floor){
 const generated=generateFloor(floor,run.seed);
 run.floor=floor;run.map=generated.cells;run.pos={...generated.start};run.teleporter=generated.teleporter;run.parts={cable:false,cell:false,fuse:false};run.visited={[key(run.pos.x,run.pos.y)]:true};run.message='Floor '+floor+' entered. Locate the three teleporter components.';run.lastCombat=null
}
function start(){
 const G=Game(),n=state(),party=G?.getPartyCharacters?.()||[];
 if(party.length!==5)return notice('A complete active party of five is required.');
 if(party.some(c=>G.isUnavailable?.(c)))return notice('A party member is recovering from Cell Shock.');
 if(attemptsLeft()<=0)return notice('No Null Complex attempts remain in this five-day cycle.');
 n.attemptsUsed++;run={id:'null-'+Date.now(),seed:'null-'+Date.now()+'-'+Math.random().toString(36).slice(2),startedAt:new Date().toISOString(),floor:1,pending:{},rooms:0};newFloor(1);persist();render()
}
function roomAt(x,y){return run?.map?.[key(x,y)]}
function canMove(dx,dy){const x=run.pos.x+dx,y=run.pos.y+dy;return x>=0&&y>=0&&x<SIZE&&y<SIZE}
function move(dx,dy){
 if(!run||!canMove(dx,dy))return;
 run.pos={x:run.pos.x+dx,y:run.pos.y+dy};run.visited[key(run.pos.x,run.pos.y)]=true;run.rooms++;
 const room=roomAt(run.pos.x,run.pos.y);
 if((room.type==='combat'||room.type==='breach')&&!room.cleared){fight(room);return}
 if(room.type==='search'&&!room.searched)run.message='Searchable equipment and storage detected.';
 else if(room.type==='teleporter')run.message=allParts()?'Teleporter ready. Install the recovered components.':'Teleporter located. Components are still missing.';
 else run.message='Room secured. Choose the next route.';
 persist();render()
}
function encounter(room){
 const floor=run.floor,r=rng(run.seed+':fight:'+floor+':'+run.pos.x+':'+run.pos.y);
 const count=room.type==='breach'?Math.min(4,2+Math.floor(floor/3)):Math.min(4,1+Math.floor(floor/4)+(r()>.6?1:0));
 const pool=ENEMIES.slice(0,Math.min(ENEMIES.length,2+Math.ceil(floor/2)));
 const enemies=Array.from({length:count},()=>{const e=pool[Math.floor(r()*pool.length)];return{name:e.name,classification:e.classification}});
 const ilvl=Game()?.partyItemLevel?.()||18;
 return{id:'null-'+floor+'-'+run.pos.x+'-'+run.pos.y,kind:room.type==='breach'?'event':'trash',level:Math.min(15,3+floor),recommendedItemLevel:Math.max(10,ilvl-2+floor),enemies,enemyHealth:Math.round((260+floor*95)*(room.type==='breach'?1.45:1)),scaling:{enemyDamage:1+floor*.075,enemyHealth:1+floor*.06},mechanics:floor>=3?[['Containment Pulse','circles',1600]]:[],affixes:floor>=7?['volatile-cells']:[]}
}
async function fight(room){
 const engine=C(),viewer=window.CellboundDungeon2D;
 if(!engine?.simulate||!viewer?.playSharedEncounter){notice('Combat viewer is still loading. Try the room again.');return}
 const party=(Game()?.getPartyCharacters?.()||[]).map(c=>({...c,_combatItemLevel:Game()?.characterItemLevel?.(c)||0}));
 const enc=encounter(room),result=engine.simulate({party,encounter:enc,seed:run.seed+':'+enc.id},{zone:'null-complex'});
 run.lastCombat={outcome:result.outcome,enemies:enc.enemies.map(e=>e.name),damage:result.summary?.totalDamage||0,healing:result.summary?.totalHealing||0};persist();
 const roomVisual=room.type==='breach'?'breach':(['lab','containment','reactor','storage'][(run.pos.x+run.pos.y+run.floor)%4]);
 const outcome=await viewer.playSharedEncounter({
   party,encounter:enc,result,
   header:'THE NULL COMPLEX · FLOOR '+run.floor,
   title:room.type==='breach'?'Containment Breach':'Experiment Chamber',
   subtitle:'NULL COMPLEX EXPEDITION',
   planTitle:'The room has sealed. Eliminate the Aberrants.',
   planCopy:'The same Combat Reborn movement, threat, healing, skills, talents and mechanics used by Cellbound dungeons are active here.',
   theme:'null',room:'null-'+roomVisual,roomLabel:(room.type==='breach'?'CONTAINMENT BREACH':roomVisual.toUpperCase()+' CHAMBER'),
   ambience:roomVisual==='containment'?'Cracked specimen tanks pulse behind the combat floor.':roomVisual==='reactor'?'Unstable reactor conduits arc around the chamber.':roomVisual==='storage'?'Broken supply racks and research crates line the room.':'Abandoned experiment benches and machinery surround the arena.',
   shellClass:'null-combat-shell',arenaClass:'null-combat-arena',
   route:[{id:'floor',title:'Floor '+run.floor},{id:enc.id,title:'Room '+(run.pos.x+1)+','+(run.pos.y+1)}],currentId:enc.id
 });
 if(!run)return;
 viewer.closeShared?.(true);
 if(outcome!=='victory'||result.outcome!=='victory'){wipe('The Aberrants overwhelmed the expedition.');return}
 room.cleared=true;run.message=(room.type==='breach'?'Containment breach purged. Bonus materials recovered.':'Aberrants eliminated.')+' The route is secure.';
 if(room.type==='breach')awardPending(2+Math.floor(run.floor/3),true);
 persist();render()
}
function search(){
 const room=roomAt(run.pos.x,run.pos.y);if(!room||room.type!=='search'||room.searched)return;
 room.searched=true;
 if(room.part&&!run.parts[room.part]){run.parts[room.part]=true;const p=PARTS.find(x=>x[0]===room.part);run.message=p[1]+' recovered.'}
 else{const qty=1+Math.floor(run.floor/3);awardPending(qty,false);run.message='Profession materials recovered. They remain at risk until extraction.'}
 persist();render()
}
function awardPending(quantity,bonus){
 const eligible=MATERIALS.filter(m=>run.floor>=m.min),r=rng(run.seed+':loot:'+run.floor+':'+run.rooms+':'+Object.keys(run.pending).length),pick=eligible[Math.floor(r()*eligible.length)];
 const q=Math.max(1,quantity+(bonus?1:0));run.pending[pick.key]=(run.pending[pick.key]||0)+q
}
function allParts(){return PARTS.every(p=>run.parts[p[0]])}
function atTele(){return run&&run.pos.x===run.teleporter.x&&run.pos.y===run.teleporter.y}
function descend(){
 if(!atTele()||!allParts()||run.floor>=MAX_FLOOR)return;
 awardPending(1+Math.floor(run.floor/2),true);newFloor(run.floor+1);persist();render()
}
function extract(){
 if(!atTele()||!allParts())return;
 awardPending(1+Math.floor(run.floor/2),true);
 const n=state(),floor=run.floor,pending={...run.pending};
 Object.entries(pending).forEach(([k,q])=>Game()?.addMaterial?.(k,q));
 n.bestFloor=Math.max(n.bestFloor,floor);n.runs.unshift({at:new Date().toISOString(),result:'extracted',floor,materials:pending});n.runs=n.runs.slice(0,20);n.activeRun=null;
 Game()?.getState?.()?.activity?.push('The Null Complex · extracted from Floor '+floor+' with '+Object.values(pending).reduce((a,b)=>a+b,0)+' profession materials.');
 run=null;Game()?.save?.();Game()?.persistState?.();Game()?.renderAll?.();render()
}
function wipe(reason){
 const n=state(),floor=run?.floor||1;n.runs.unshift({at:new Date().toISOString(),result:'lost',floor,materials:{}});n.runs=n.runs.slice(0,20);n.activeRun=null;
 Game()?.applyPartyCellShock?.(10+Math.min(15,floor));run=null;Game()?.save?.();Game()?.persistState?.();notice(reason+' All materials from this run were lost.');render()
}
function notice(msg){if(mount){const n=mount.querySelector('[data-null-notice]');if(n){n.textContent=msg;n.hidden=false}}}
function mapMarkup(){
 let out='';for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const k=key(x,y),seen=run.visited[k],here=run.pos.x===x&&run.pos.y===y,c=run.map[k];let mark='';
 if(here)mark='●';else if(seen&&c.type==='entrance')mark='E';else if(seen&&c.type==='teleporter')mark='T';else if(seen&&c.type==='search')mark=c.searched?'✓':'?';else if(seen&&(c.type==='combat'||c.type==='breach'))mark=c.cleared?'✓':'!';else if(seen)mark='·';
 out+='<i class="'+(seen?'seen ':'')+(here?'here ':'')+(c.type==='teleporter'&&seen?'tele ':'')+'" title="'+(seen?esc(c.type):'Unknown')+'">'+mark+'</i>'}return out
}
function lootMarkup(){
 const entries=Object.entries(run?.pending||{});if(!entries.length)return'<span>No materials recovered yet.</span>';
 return entries.map(([k,q])=>'<span><b>'+esc(MATERIALS.find(m=>m.key===k)?.name||k)+'</b> ×'+q+'</span>').join('')
}
function render(){
 mount=document.getElementById('nullComplexMount');if(!mount)return;
 const n=state();if(!n)return;
 if(!run&&n.activeRun){run=n.activeRun}
 if(!run){
  mount.innerHTML='<section class="null-card null-landing"><div class="null-hero"><small>ROGUELIKE EXTRACTION EVENT</small><h3>The Null Complex</h3><p>An abandoned experimental facility rearranges itself every expedition. Recover the teleporter components, then extract your profession materials or descend deeper and risk everything.</p><div class="null-stats"><span><b>'+attemptsLeft()+'</b> / '+ATTEMPTS+' attempts</span><span>Resets every <b>5 days</b></span><span>Best extraction <b>Floor '+(n.bestFloor||'—')+'</b></span></div><button data-null-start '+(attemptsLeft()<=0?'disabled':'')+'>ENTER THE NULL COMPLEX</button><p data-null-notice hidden></p></div><div class="null-rules"><b>EXPEDITION RULES</b><span>10 × 10 shifting floor</span><span>Find Cable · Power Cell · Reactor Fuse</span><span>Extract safely or descend to Floor 10</span><span>Death loses every unbanked material</span></div></section>';
  mount.querySelector('[data-null-start]')?.addEventListener('click',start);return
 }
 const room=roomAt(run.pos.x,run.pos.y),ready=atTele()&&allParts();
 mount.innerHTML='<section class="null-card null-run"><header><div><small>THE NULL COMPLEX · ACTIVE EXPEDITION</small><h3>Floor '+run.floor+' <em>/ '+MAX_FLOOR+'</em></h3></div><div class="null-risk"><span>UNBANKED</span><b>'+Object.values(run.pending).reduce((a,b)=>a+b,0)+' materials</b></div></header><div class="null-layout"><div><div class="null-map">'+mapMarkup()+'</div><div class="null-legend"><span>● Party</span><span>T Teleporter</span><span>? Search</span><span>! Threat</span></div></div><aside><small>CURRENT ROOM</small><h4>'+esc(room.type==='entrance'?'Entry Chamber':room.type==='teleporter'?'Teleport Chamber':room.type==='breach'?'Containment Breach':room.type==='search'?'Search Area':room.type==='combat'?'Experiment Chamber':'Facility Room')+'</h4><p>'+esc(run.message||'Choose a route.')+'</p><div class="null-parts">'+PARTS.map(p=>'<span class="'+(run.parts[p[0]]?'found':'')+'">'+p[2]+' '+p[1]+' <b>'+(run.parts[p[0]]?'FOUND':'MISSING')+'</b></span>').join('')+'</div><div class="null-loot"><small>AT RISK</small>'+lootMarkup()+'</div></aside></div><div class="null-actions">'+
 (room.type==='search'&&!room.searched?'<button data-null-search>SEARCH ROOM</button>':'')+
 '<div class="null-directions"><button data-move="0,-1" '+(!canMove(0,-1)?'disabled':'')+'>N</button><button data-move="-1,0" '+(!canMove(-1,0)?'disabled':'')+'>W</button><button data-move="1,0" '+(!canMove(1,0)?'disabled':'')+'>E</button><button data-move="0,1" '+(!canMove(0,1)?'disabled':'')+'>S</button></div>'+
 (ready?'<div class="null-extract"><button data-null-extract>EXTRACT · KEEP LOOT</button>'+(run.floor<MAX_FLOOR?'<button data-null-descend>DESCEND TO FLOOR '+(run.floor+1)+'</button>':'<b>FINAL FLOOR CLEARED · EXTRACT</b>')+'</div>':'')+
 '</div><p class="null-warning">If the party wipes, every material shown as At Risk is lost.</p><p data-null-notice hidden></p></section>';
 mount.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>{const [x,y]=b.dataset.move.split(',').map(Number);move(x,y)}));
 mount.querySelector('[data-null-search]')?.addEventListener('click',search);mount.querySelector('[data-null-extract]')?.addEventListener('click',extract);mount.querySelector('[data-null-descend]')?.addEventListener('click',descend)
}
function init(){if(!Game()?.ready){setTimeout(init,120);return}render();window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='world')render()})}
window.CellboundNullComplex={VERSION,render,start,getRun:()=>run};init();
})();