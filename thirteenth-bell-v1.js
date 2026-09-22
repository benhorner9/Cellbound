(()=>{
'use strict';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const TITLE='The Thirteenth Bell';
const LOCATION_META={
  watchmaker:{name:"The Watchmaker",icon:"◴",copy:"A dismantled clock keeps stopping at 12:13.",cost:2},
  chapel:{name:"Chapel of Glass",icon:"◇",copy:"Moonlight is trapped inside rotating stained glass.",cost:2},
  well:{name:"The Old Well",icon:"○",copy:"Something below answers when the bells are touched.",cost:2},
  inn:{name:"The Crooked Bell Inn",icon:"⌂",copy:"Five echoes argue about a tower nobody could enter.",cost:2},
  blacksmith:{name:"The Blacksmith",icon:"⚒",copy:"Fragments of the original bell are scattered across the forge.",cost:2},
  house:{name:"The Locked House",icon:"▣",copy:"A house the village insists was never there.",cost:2}
};
const SOLVE_ORDER=['watchmaker','chapel','well','inn','blacksmith','house'];
const FINAL_SEQUENCE=['key','formula','fragment','lens','well','tower'];
const FINAL_STEPS={
  key:{time:'11:47',label:'Collect the replacement tower key',place:'Watchmaker'},
  formula:{time:'11:49',label:'Give the apothecary the stabilising formula',place:'Apothecary'},
  fragment:{time:'11:51',label:'Recover the missing bell fragment',place:'Blacksmith'},
  lens:{time:'11:54',label:"Use the Watchmaker's Lens in the chapel",place:'Chapel'},
  well:{time:'11:56',label:'Open the chamber beneath the well',place:'Old Well'},
  tower:{time:'11:59',label:'Reach Edrin before the first toll',place:'Clocktower'}
};

let Game=null,root=null;

const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
function qroot(){return window.CellboundQuests?.ensure?.()}
function ensure(){
  const q=qroot();if(!q)return null;
  q.thirteenthBell=q.thirteenthBell&&typeof q.thirteenthBell==='object'?q.thirteenthBell:{
    started:false,complete:false,stage:'letter',loop:1,minute:0,solved:{},facts:[],history:[],finalSequence:[],finalMistakes:0,bossWon:false,ending:null
  };
  const b=q.thirteenthBell;
  b.solved=b.solved&&typeof b.solved==='object'?b.solved:{};
  b.facts=Array.isArray(b.facts)?b.facts:[];
  b.history=Array.isArray(b.history)?b.history:[];
  b.finalSequence=Array.isArray(b.finalSequence)?b.finalSequence:[];
  b.loop=Math.max(1,Number(b.loop)||1);b.minute=Math.max(0,Number(b.minute)||0);
  return b
}
function unlocked(){
  const q=qroot(),s=state();
  return Boolean(q?.flags?.hollowSanctumUnlocked||Number(s?.dungeonCompletions)>0||Number(s?.hollowSanctumCompletions)>0||Number(s?.chaosCanyonCompletions)>0||Number(s?.blackoutStationCompletions)>0)
}
function solvedCount(){const b=ensure();return SOLVE_ORDER.filter(x=>b?.solved?.[x]).length}
function addFact(id,text){
  const b=ensure();if(!b||b.facts.some(x=>x.id===id))return;
  b.facts.push({id,text,at:new Date().toISOString()})
}
function history(text){const b=ensure();if(!b)return;b.history.push({at:new Date().toISOString(),text});b.history=b.history.slice(-40)}
async function save(refresh=true){
  Game?.save?.();await Game?.persistState?.();
  if(refresh)window.CellboundQuests?.render?.()
}
function card(){
  const b=ensure(),lock=!unlocked()&&!b?.started;
  return{
    id:'thirteenth-bell',icon:'XIII',title:TITLE,meta:'Flagship mystery · Greywake',difficulty:'Masterwork',
    status:b?.complete?'COMPLETE':b?.started?'IN PROGRESS':lock?'LOCKED':'AVAILABLE',
    complete:!!b?.complete,locked:lock
  }
}
function stageText(){
  const b=ensure();if(!b)return'';
  if(b.complete)return'Greywake has returned to the world. The thirteenth hour is silent.';
  if(!b.started)return'A letter names a village that does not exist on any current map.';
  if(b.stage==='letter')return'Travel to Greywake and find out why the clock stopped at 11:47 PM.';
  if(b.stage==='loops')return solvedCount()<5?'Investigate Greywake. What your guild learns survives every reset.':'Find the house that only exists after midnight.';
  if(b.stage==='final-run')return'Execute everything you learned during the final thirteen minutes.';
  if(b.stage==='boss')return'Stop Edrin Vale from ringing the Thirteenth Bell again.';
  if(b.stage==='choice')return'Decide what Greywake becomes when the loop ends.';
  return'Follow the evidence.'
}
function homeState(){
  const b=ensure();return b?.started&&!b.complete?{active:true,small:'THE THIRTEENTH BELL',title:stageText()}:null
}
function renderDetail(main,side){
  const b=ensure(),c=card(),facts=b?.facts||[],count=solvedCount();
  main.innerHTML='<div class="quest-v3-hero bell-journal-hero"><div><small>MASTERWORK · INTERACTIVE ADVENTURE</small><h2>'+TITLE+'</h2><p>Greywake · A village erased from every living map</p></div><span class="quest-v3-status '+(b.complete?'complete':'')+'">'+c.status+'</span></div>'+
    '<div class="quest-v3-story bell-story"><p>A letter reaches the guild with seven words: <strong>“When the thirteenth bell rings, forget us.”</strong> The village named on the seal no longer exists. An older map says it once did.</p></div>'+
    '<section class="quest-v3-clue"><small>'+(!b.started?'UNOPENED LETTER':b.complete?'AFTERMATH':'CURRENT THREAD')+'</small><h3>'+esc(!b.started?'A Village Missing From The Map':b.complete?'Greywake Returned':stageText())+'</h3><p>'+esc(!b.started?'Take the letter to the old road and look for the village of Greywake.':b.complete?'The loop has ended. What remains depends on the choice your guild made beneath the clocktower.':'Loop '+b.loop+' · '+formatClock(b.minute)+' · '+count+'/6 major discoveries secured.')+'</p></section>'+
    '<section class="bell-evidence-board"><div class="quest-v3-section-head"><span>GREYWAKE INVESTIGATION</span><small>Knowledge survives the bell.</small></div><div class="bell-clue-grid">'+(facts.length?facts.slice(-8).map((f,i)=>'<article><i>'+(i+1)+'</i><p>'+esc(f.text)+'</p></article>').join(''):'<p class="quest-v3-unknown">No evidence yet. The clock in Greywake is waiting at 11:47 PM.</p>')+'</div></section>'+
    '<div class="quest-detail-action">'+actionHtml(b,c)+'</div>';
  side.innerHTML='<section><small>QUEST STRUCTURE</small><div class="quest-reward-list"><p>Persistent time-loop investigation</p><p>5 interactive puzzle types</p><p>Evidence-board deductions</p><p>Final 13-minute execution sequence</p><p>Combat Reborn final boss</p></div></section>'+
    '<section><small>DISCOVERIES</small><div class="bell-side-progress">'+SOLVE_ORDER.map(id=>'<p class="'+(b.solved[id]?'done':'')+'"><i>'+(b.solved[id]?'✓':'·')+'</i><span>'+esc(LOCATION_META[id].name)+'</span></p>').join('')+'</div></section>'+
    '<section><small>REWARDS</small><div class="quest-reward-list"><p>500 Gold</p><p>300 Guild Renown</p><p>The Thirteenth Chime relic</p><p>Greywake world location</p><p>Future Bellfoundry access hook</p></div></section>'+
    '<section><small>LOOP RECORD</small><div class="quest-history">'+(b.history.slice(-6).reverse().map(h=>'<p>'+esc(h.text)+'</p>').join('')||'<p>No loop has been entered yet.</p>')+'</div></section>';
  main.querySelector('[data-bell-action]')?.addEventListener('click',()=>{
    if(c.locked){alert('Continue the main adventure until your guild has opened the deeper roads beneath Zeltira.');return}
    open()
  })
}
function actionHtml(b,c){
  if(b.complete)return'<button class="quest-primary" data-bell-action>REVISIT GREYWAKE →</button>';
  if(!b.started)return'<button class="quest-primary bell-primary" data-bell-action>OPEN THE LETTER →</button>';
  return'<button class="quest-primary bell-primary" data-bell-action>'+((b.stage==='choice')?'RETURN TO THE CLOCKTOWER':'ENTER GREYWAKE')+' →</button>'
}
function ensureRoot(){
  if(root&&root.isConnected)return root;
  root=document.createElement('div');root.id='thirteenthBellRoot';root.className='bell-backdrop';root.hidden=true;document.body.appendChild(root);return root
}
function close(){if(root)root.hidden=true;document.body.classList.remove('bell-open');window.CellboundQuests?.render?.()}
function open(){
  const b=ensure();if(!b)return;
  const r=ensureRoot();r.hidden=false;document.body.classList.add('bell-open');
  if(b.complete){renderAftermath();return}
  if(!b.started||b.stage==='letter'){renderLetter();return}
  if(b.stage==='loops')renderTown();
  else if(b.stage==='final-run')renderFinalRun();
  else if(b.stage==='boss')renderBossPrelude();
  else if(b.stage==='choice')renderChoice();
  else renderTown()
}
function chrome(label,title,body,extra=''){
  return'<section class="bell-shell"><header class="bell-head"><div><small>'+esc(label)+'</small><h2>'+esc(title)+'</h2></div><button data-bell-close aria-label="Close">×</button></header>'+body+extra+'</section>'
}
function bindClose(){root.querySelector('[data-bell-close]')?.addEventListener('click',close)}
function formatClock(minute){
  const total=23*60+47+Math.max(0,Number(minute)||0),h=Math.floor(total/60)%24,m=total%60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')
}
function renderLetter(){
  root.innerHTML=chrome('QUEST · SEALED LETTER',TITLE,
    '<div class="bell-letter-scene"><div class="bell-letter"><small>TO THE GUILDMASTER</small><p>When the thirteenth bell rings,</p><strong>forget us.</strong><em>— Greywake</em></div><div class="bell-letter-copy"><span>NO CURRENT MAP RECORD</span><h3>Greywake</h3><p>An old survey map shows a road ending at a village removed from every modern chart. The seal on the letter is still warm.</p><button data-bell-start>FOLLOW THE OLD ROAD →</button></div></div>'
  );bindClose();
  root.querySelector('[data-bell-start]').onclick=async()=>{
    const b=ensure();b.started=true;b.stage='loops';b.startedAt=new Date().toISOString();b.loop=1;b.minute=0;
    addFact('letter','The letter asks the guild to forget Greywake when a thirteenth bell rings.');
    history('The guild followed an obsolete road and found Greywake exactly where the old map said it should be.');
    await save(false);renderArrival()
  }
}
function renderArrival(){
  root.innerHTML=chrome('GREYWAKE · LOOP 1','11:47 PM',
    '<div class="bell-arrival"><div class="bell-town-silhouette"><i></i><i></i><i></i><i></i><div class="bell-tower"><span>11:47</span></div></div><div class="bell-arrival-copy"><small>NO PEOPLE · FIRES STILL BURNING</small><h3>The village is empty.</h3><p>A meal sits warm on an inn table. A forge still glows. Every door is open except one. Above all of it, the clocktower is ticking.</p><button data-bell-enter>STEP INTO GREYWAKE →</button></div></div>'
  );bindClose();
  root.querySelector('[data-bell-enter]').onclick=()=>renderTown()
}
function renderTown(note=''){
  const b=ensure(),count=solvedCount(),houseOpen=['watchmaker','chapel','well','inn','blacksmith'].every(id=>b.solved[id]);
  root.innerHTML=chrome('GREYWAKE · LOOP '+b.loop,formatClock(b.minute),
    '<div class="bell-loop-bar"><div><span>TIME UNTIL MIDNIGHT</span><b>'+Math.max(0,13-b.minute)+' MIN</b></div><div class="bell-loop-track"><i style="width:'+Math.min(100,b.minute/13*100)+'%"></i></div><p>'+esc(note||'The village resets at midnight. Your guild keeps what it learns.')+'</p></div>'+
    '<div class="bell-town-grid">'+Object.entries(LOCATION_META).map(([id,m])=>{
      const solved=!!b.solved[id],locked=(id==='chapel'&&!b.solved.watchmaker)||(id==='well'&&!b.solved.chapel)||(id==='house'&&!houseOpen);
      const reason=id==='chapel'&&!b.solved.watchmaker?"Needs the Watchmaker's Lens":id==='well'&&!b.solved.chapel?'The chapel hides the melody':id==='house'&&!houseOpen?'The house is not here yet':'';
      return'<button class="bell-location '+(solved?'solved ':'')+(locked?'locked':'')+'" data-bell-location="'+id+'" '+(locked?'disabled':'')+'><i>'+m.icon+'</i><span><small>'+(solved?'DISCOVERY SECURED':locked?'UNREACHABLE':'INVESTIGATE · '+m.cost+' MIN')+'</small><b>'+esc(m.name)+'</b><em>'+esc(locked?reason:m.copy)+'</em></span></button>'
    }).join('')+
    '<button class="bell-location tower '+(b.solved.house?'ready':'locked')+'" data-bell-break '+(!b.solved.house?'disabled':'')+'><i>XIII</i><span><small>'+(b.solved.house?'THE LOOP CAN BE BROKEN':'CLOCKTOWER SEALED')+'</small><b>The Clocktower</b><em>'+(b.solved.house?'You finally know what happened. Make one perfect run through the final thirteen minutes.':'Something in Greywake is keeping you away from the tower.')+'</em></span></button></div>'+
    '<div class="bell-loop-footer"><div><small>MEMORY RETAINED</small><b>'+count+' / 6 MAJOR DISCOVERIES</b></div><button data-bell-wait>WAIT FOR MIDNIGHT</button></div>'
  );bindClose();
  root.querySelectorAll('[data-bell-location]').forEach(btn=>btn.onclick=()=>visit(btn.dataset.bellLocation));
  root.querySelector('[data-bell-break]')?.addEventListener('click',beginFinalRun);
  root.querySelector('[data-bell-wait]').onclick=()=>triggerReset('The guild waits beneath the clocktower.')
}
function spend(minutes,after){
  const b=ensure();b.minute+=Math.max(0,Number(minutes)||0);
  if(b.minute>=13){save(false).then(()=>triggerReset(after||'Midnight catches the guild.'));return true}
  save(false);return false
}
function visit(id){
  const b=ensure(),m=LOCATION_META[id];if(!b||!m)return;
  if(b.solved[id]){
    spend(1,m.name+' has already given up its secret.');
    if(b.minute<13)renderTown(m.name+' is unchanged. The knowledge from the earlier loop remains.');
    return
  }
  if(id==='watchmaker')watchmaker();
  if(id==='chapel')chapel();
  if(id==='well')well();
  if(id==='inn')inn();
  if(id==='blacksmith')blacksmith();
  if(id==='house')lockedHouse()
}
async function solve(id,fact,note){
  const b=ensure();b.solved[id]=true;addFact(id,fact);history(note);const reset=spend(LOCATION_META[id]?.cost||2,note);await save(false);
  if(!reset)renderTown('Discovery secured: '+LOCATION_META[id].name+'.')
}
function puzzleFrame(label,title,aside,main){
  root.innerHTML=chrome(label,title,'<div class="bell-puzzle-layout"><aside>'+aside+'</aside><main>'+main+'</main></div>');bindClose()
}
function watchmaker(){
  const target=[3,1,2,0],pos=[0,0,0,0];
  const draw=(msg='')=>{
    puzzleFrame('MINI-GAME · WATCHMAKER',TheQuoted('Make the clock run backwards'),
      '<div class="bell-puzzle-note"><small>NOTE IN THE DRAWER</small><p>“Three hands. Twelve teeth. One missing hour.”</p><p>The mechanism refuses to advance beyond <strong>12:13</strong>.</p></div><div class="bell-puzzle-note"><small>OBSERVATION</small><p>Each gear has a brass notch. Align every notch with its scratched witness mark, then reverse the escapement.</p></div>',
      '<div class="bell-gears">'+pos.map((p,i)=>'<button data-gear="'+i+'" class="'+(p===target[i]?'aligned':'')+'" style="--turn:'+(p*90)+'deg"><i>'+Array.from({length:12},(_,n)=>'<u style="--n:'+n+'"></u>').join('')+'</i><b>GEAR '+(i+1)+'</b><span>WITNESS '+['WEST','SOUTH','EAST','NORTH'][target[i]]+' · TURN</span></button>').join('')+'</div><p class="bell-puzzle-feedback">'+esc(msg||'Tap each gear to rotate it 90°. Match its brass notch to the named witness mark, then reverse the escapement.')+'</p><button class="bell-confirm" data-test-gears>REVERSE THE ESCAPEMENT</button>'
    );
    root.querySelectorAll('[data-gear]').forEach(x=>x.onclick=()=>{pos[Number(x.dataset.gear)]=(pos[Number(x.dataset.gear)]+1)%4;draw()});
    root.querySelector('[data-test-gears]').onclick=()=>{
      if(target.every((v,i)=>v===pos[i]))solve('watchmaker',"The Watchmaker's mechanism opens only when run backwards. A hidden drawer held a lens marked 12:13.",'The Watchmaker’s Lens was recovered from a clock that only opened while running backwards.');
      else draw('The clock lurches forward and jams at 12:13. Something is still aligned to the wrong hour.')
    }
  };draw()
}
function TheQuoted(s){return s}
function chapel(){
  const target=[1,0,1,1,0],rot=[0,0,0,0,0];
  const draw=(msg='')=>{
    const lit=rot.reduce((n,v,i)=>n+(v===target[i]?1:0),0);
    puzzleFrame('MINI-GAME · CHAPEL OF GLASS','Route the moonlight',
      '<div class="bell-lens-card"><i>◈</i><div><small>WATCHMAKER’S LENS</small><p>Through the lens, a seventh carving appears beneath the altar.</p></div></div><div class="bell-puzzle-note"><small>RULE</small><p>Rotate the five glass vanes. A correct vane carries the beam forward; a wrong one scatters it.</p></div>',
      '<div class="bell-light-path"><div class="bell-moon">MOON</div>'+rot.map((v,i)=>'<button data-mirror="'+i+'" class="'+(v===target[i]?'aligned':'')+'"><i style="transform:rotate('+(v?45:-45)+'deg)"></i><span>'+(i+1)+'</span></button>').join('')+'<div class="bell-carving '+(lit===5?'lit':'')+'">VII</div></div><div class="bell-beam-meter"><span>BEAM COHERENCE</span><div><i style="width:'+(lit/5*100)+'%"></i></div><b>'+lit+' / 5</b></div><p class="bell-puzzle-feedback">'+esc(msg||'The beam should reach the hidden seventh carving without scattering.')+'</p><button class="bell-confirm" data-test-light>FOCUS THE LENS</button>'
    );
    root.querySelectorAll('[data-mirror]').forEach(x=>x.onclick=()=>{const i=Number(x.dataset.mirror);rot[i]=rot[i]?0:1;draw()});
    root.querySelector('[data-test-light]').onclick=()=>{
      if(target.every((v,i)=>v===rot[i]))solve('chapel','The hidden seventh carving shows every villager beneath the clocktower while one man rings a bell above them.','Moonlight through the Watchmaker’s Lens revealed the chapel’s hidden seventh carving.');
      else draw('The light fractures across the pews. The seventh carving remains incomplete.')
    }
  };draw()
}
function well(){
  const target=[1,5,3,8,13],input=[];
  const draw=(msg='')=>{
    puzzleFrame('MINI-GAME · OLD WELL','Play the buried bells',
      '<div class="bell-puzzle-note"><small>CHAPEL NOTATION</small><p>I · V · III · VIII · XIII</p></div><div class="bell-puzzle-note"><small>BELOW</small><p>The lantern reveals thirteen bell carvings cut into the chamber wall. Each gives a different tone.</p></div>',
      '<div class="bell-bells">'+Array.from({length:13},(_,i)=>'<button data-bell-note="'+(i+1)+'" class="'+(input.includes(i+1)?'played':'')+'"><i>'+roman(i+1)+'</i><span>'+(i+1)+'</span></button>').join('')+'</div><div class="bell-sequence">'+target.map((_,i)=>'<span class="'+(input[i]===target[i]?'correct':input[i]!=null?'wrong':'')+'">'+(input[i]?roman(input[i]):'·')+'</span>').join('')+'</div><p class="bell-puzzle-feedback">'+esc(msg||'Play the notation exactly as the chapel revealed it.')+'</p><button class="bell-secondary" data-reset-bells>RESET MELODY</button>'
    );
    root.querySelectorAll('[data-bell-note]').forEach(x=>x.onclick=()=>{
      input.push(Number(x.dataset.bellNote));
      if(input.length===target.length){
        if(target.every((v,i)=>v===input[i])){solve('well','A hidden chamber beneath the well contains thirteen bell carvings and a journal: “There were never twelve bells.”','The guild played the buried melody and opened the chamber below Greywake.');return}
        input.splice(0,input.length);draw('The final tone dies against the stone. The chamber stays shut.')
      }else draw()
    });
    root.querySelector('[data-reset-bells]').onclick=()=>{input.splice(0,input.length);draw()}
  };draw()
}
function roman(n){return['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'][n-1]||String(n)}
function inn(){
  const selected=new Set();
  const evidence=[
    {id:'locked',who:'Innkeeper',text:'“The tower was locked all evening. Nobody went inside.”'},
    {id:'blacksmith',who:'Blacksmith',text:'“I saw Edrin crossing the square before eleven.”'},
    {id:'key',who:'Watchmaker receipt',text:'Replacement tower key — delivered 10:30 PM.'},
    {id:'priest',who:'Priest',text:'“The original tower key disappeared after sunset.”'}
  ];
  const draw=(msg='')=>{
    puzzleFrame('DEDUCTION · CROOKED BELL INN','Find the contradiction',
      '<div class="bell-puzzle-note"><small>ECHOES OF 11:47</small><p>Five villagers remember the same evening differently. Connect two statements that cannot both be true.</p></div>',
      '<div class="bell-evidence-pick">'+evidence.map(e=>'<button data-evidence="'+e.id+'" class="'+(selected.has(e.id)?'selected':'')+'"><small>'+esc(e.who)+'</small><p>'+esc(e.text)+'</p></button>').join('')+'</div><p class="bell-puzzle-feedback">'+esc(msg||'Select exactly two pieces of evidence, then test the connection.')+'</p><button class="bell-confirm" data-test-evidence>CONNECT EVIDENCE</button>'
    );
    root.querySelectorAll('[data-evidence]').forEach(x=>x.onclick=()=>{const id=x.dataset.evidence;if(selected.has(id))selected.delete(id);else{if(selected.size>=2)selected.clear();selected.add(id)}draw()});
    root.querySelector('[data-test-evidence]').onclick=()=>{
      const ok=selected.size===2&&selected.has('locked')&&selected.has('key');
      if(ok)solve('inn','The tower could not have remained sealed: a replacement key was delivered before the villagers claim nobody entered.','The guild proved the tower story was false by connecting the innkeeper’s claim to the replacement-key receipt.');
      else{selected.clear();draw('Those facts can coexist. The contradiction is sharper than that.')}
    }
  };draw()
}
function blacksmith(){
  const pieces=[
    {id:'a',size:6,rune:'WHAT'},{id:'b',size:5,rune:'IS'},{id:'c',size:4,rune:'TAKEN'},{id:'d',size:3,rune:'BY'},{id:'e',size:2,rune:'THE BELL'},{id:'f',size:1,rune:'RETURNS'}
  ];
  let pool=[...pieces].sort(()=>Math.random()-.5),built=[];
  const draw=(msg='')=>{
    puzzleFrame('MINI-GAME · BLACKSMITH','Rebuild the bell inscription',
      '<div class="bell-puzzle-note"><small>FRACTURE PATTERN</small><p>The inscription crossed the bell from the broadest surviving fracture toward the narrowest.</p></div>',
      '<div class="bell-shard-board"><div class="bell-shard-slots">'+Array.from({length:6},(_,i)=>'<div>'+ (built[i]?'<b>'+built[i].rune+'</b>':'<span>'+(i+1)+'</span>') +'</div>').join('')+'</div><div class="bell-shard-pool">'+pool.map(p=>'<button data-shard="'+p.id+'" style="--w:'+(48+p.size*7)+'%"><i></i><b>'+p.rune+'</b><small>FRACTURE '+p.size+'</small></button>').join('')+'</div></div><p class="bell-puzzle-feedback">'+esc(msg||'Tap the fragments in the order the original inscription crossed the bell.')+'</p><button class="bell-secondary" data-reset-shards>RESET FRAGMENTS</button>'
    );
    root.querySelectorAll('[data-shard]').forEach(x=>x.onclick=()=>{
      const p=pool.find(v=>v.id===x.dataset.shard);if(!p)return;built.push(p);pool=pool.filter(v=>v.id!==p.id);
      if(built.length===6){
        const ok=pieces.every((p,i)=>built[i].id===p.id);
        if(ok){solve('blacksmith','The rebuilt bell inscription reads: “WHAT IS TAKEN BY THE BELL MAY BE RETURNED BY THE BELL.”','The original bell inscription was reconstructed from six forge fragments.');return}
        pool=[...pieces].sort(()=>Math.random()-.5);built=[];draw('The fractures do not marry. Read the damage pattern, not the words.')
      }else draw()
    });
    root.querySelector('[data-reset-shards]').onclick=()=>{pool=[...pieces].sort(()=>Math.random()-.5);built=[];draw()}
  };draw()
}
function lockedHouse(){
  const b=ensure();if(b.solved.house){renderTown('The child’s drawings remain burned into the guild’s memory.');return}
  root.innerHTML=chrome('GREYWAKE · 12:01 AM','The house that was not there',
    '<div class="bell-house-scene"><div class="bell-drawings"><article><i>⌂</i><span>HOME</span></article><article><i>♟</i><span>FATHER</span></article><article><i>◇</i><span>CELL GLASS</span></article><article class="final"><i>XIII</i><span>THE BELL</span></article></div><div><small>CHILD’S BEDROOM</small><h3>Edrin was not trying to destroy Greywake.</h3><p>The drawings show his daughter beside the black Cell corruption beneath the village. The final picture shows Edrin carrying her toward the clocktower.</p><p>He built the thirteenth bell to keep rewinding the last thirteen minutes until he could find a way to save her.</p><button data-house-understand>I UNDERSTAND WHAT THE LOOP IS →</button></div></div>'
  );bindClose();
  root.querySelector('[data-house-understand]').onclick=()=>solve('house','Edrin Vale built the Thirteenth Bell to rewind the final thirteen minutes and save his Cell-touched daughter. Every reset damaged Greywake further.','At 12:01 AM, a house appeared that did not exist inside the loop. The child’s drawings revealed why Edrin built the bell.')
}
async function triggerReset(reason){
  const b=ensure();b.loop++;b.minute=0;history('Loop '+(b.loop-1)+' ended at midnight. The guild remembered.');await save(false);
  window.CellboundFX?.shake?.('hard');window.CellboundFX?.callout?.({eyebrow:'MIDNIGHT · LOOP '+(b.loop-1),title:'THE THIRTEENTH BELL RINGS',tone:'story',duration:1600});
  let count=0;
  const draw=()=>{
    root.innerHTML=chrome('MIDNIGHT · LOOP '+(b.loop-1),'The bell rings',
      '<div class="bell-reset"><div class="bell-reset-mark">XIII</div><div class="bell-tolls">'+Array.from({length:13},(_,i)=>'<i class="'+(i<count?'hit':'')+'"></i>').join('')+'</div><h3>'+(count<13?'BONG':'11:47 PM')+'</h3><p>'+esc(count<13?reason:'Everything is exactly where it was. Your guild remembers everything.')+'</p>'+(count>=13?'<button data-wake>WAKE AGAIN →</button>':'')+'</div>'
    );bindClose();
    if(count>=13){root.querySelector('[data-wake]').onclick=()=>renderTown('Loop '+b.loop+'. The village has forgotten. You have not.');return}
    count++;setTimeout(draw,70)
  };draw()
}
function beginFinalRun(){
  const b=ensure();if(!b.solved.house)return;b.stage='final-run';b.finalSequence=[];history('The guild finally understood the loop and prepared to execute the final thirteen minutes.');save(false).then(()=>{renderFinalRun();window.CellboundFX?.story?.('The Final Loop','Thirteen minutes. Six actions. No room for a wrong move.',{eyebrow:'GREYWAKE · 11:47 PM',tone:'story',duration:1550})})
}
function renderFinalRun(msg=''){
  const b=ensure(),used=new Set(b.finalSequence),nextIndex=b.finalSequence.length;
  root.innerHTML=chrome('GREYWAKE · THE FINAL LOOP',FINAL_SEQUENCE[nextIndex]?FINAL_STEPS[FINAL_SEQUENCE[nextIndex]].time:'12:00',
    '<div class="bell-final-intro"><small>THE VILLAGE IS ALIVE</small><h3>For the first time, Greywake has people in it.</h3><p>The streets you learned as ruins are full of voices, carts, arguments and music. You have thirteen minutes. There is no time left to investigate.</p></div>'+
    '<div class="bell-final-board"><div class="bell-final-sequence">'+FINAL_SEQUENCE.map((id,i)=>'<div class="'+(b.finalSequence[i]===id?'done':i===nextIndex?'current':'')+'"><span>'+FINAL_STEPS[id].time+'</span><b>'+esc(FINAL_STEPS[id].label)+'</b></div>').join('')+'</div><div class="bell-final-actions">'+Object.entries(FINAL_STEPS).filter(([id])=>!used.has(id)).map(([id,x])=>'<button data-final-step="'+id+'"><small>'+x.place+'</small><b>'+esc(x.label)+'</b></button>').join('')+'</div></div><p class="bell-final-message">'+esc(msg||'Choose the next action. The order matters.')+'</p>'
  );bindClose();
  root.querySelectorAll('[data-final-step]').forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.finalStep,expected=FINAL_SEQUENCE[b.finalSequence.length];
    if(id!==expected){
      b.finalMistakes++;b.finalSequence=[];b.stage='loops';b.minute=0;
      history('The final sequence broke at '+FINAL_STEPS[id].place+'. The bell took the village again.');
      await save(false);triggerReset('One wrong move was enough. The final loop collapses.');return
    }
    b.finalSequence.push(id);await save(false);
    if(b.finalSequence.length===FINAL_SEQUENCE.length){revealAliveVillage();return}
    renderFinalRun('Correct. Keep moving.')
  })
}
function revealAliveVillage(){
  const b=ensure();b.stage='boss';save(false);
  window.CellboundFX?.flash?.('gold',true);
  root.innerHTML=chrome('GREYWAKE · 11:59 PM','The final thirteen minutes',
    '<div class="bell-alive-reveal"><div class="bell-alive-town"><span>THE INN</span><span>THE FORGE</span><span>THE CHAPEL</span><span>THE WELL</span><strong>THE CLOCKTOWER</strong></div><div><small>GREYWAKE · ALIVE</small><h3>Everything you explored as a ruin is suddenly full of people.</h3><p>The inn is roaring. The blacksmith is shouting over his forge. Children cross the square you have walked through empty again and again.</p><p>Above them, Edrin Vale is climbing the clocktower with his daughter in his arms.</p><button data-climb-tower>CLIMB THE CLOCKTOWER →</button></div></div>'
  );bindClose();window.CellboundFX?.callout?.({eyebrow:'GREYWAKE · ALIVE',title:'The village was never empty.',tone:'gold',duration:1700});root.querySelector('[data-climb-tower]').onclick=renderBossPrelude
}
function renderBossPrelude(){
  const b=ensure();b.stage='boss';save(false);
  root.innerHTML=chrome('CLOCKTOWER · 11:59 PM','Edrin Vale',
    '<div class="bell-boss-prelude"><div class="bell-bell-visual"><i>XIII</i></div><div><small>KEEPER OF THE THIRTEENTH HOUR</small><h3>“I only need one more try.”</h3><p>Edrin stands beneath a bell made from black Cell glass and old bronze. His daughter lies beside the mechanism.</p><p>Your discoveries have weakened the loop: the chapel’s light, the buried melody and the restored inscription are all working against him.</p><button data-fight-edrin>STOP THE THIRTEENTH TOLL →</button></div></div>'
  );bindClose();root.querySelector('[data-fight-edrin]').onclick=fightEdrin
}
async function fightEdrin(){
  const b=ensure(),runner=window.CellboundQuests?.runQuest2DFight;if(typeof runner!=='function'){alert('Quest combat runtime is unavailable.');return}
  root.hidden=true;document.body.classList.remove('bell-open');
  const avg=Math.max(6,Math.round(party().reduce((n,c)=>n+(Number(c.level)||1),0)/Math.max(1,party().length)));
  const won=await runner({
    quest:TITLE,title:'Edrin, Keeper of the Thirteenth Hour',location:'Greywake Clocktower',
    ambience:'The clock moves for the first time. Edrin reaches for the rope beneath the black-glass bell.',
    phases:['First Toll','Broken Minute','Thirteenth Hour'],enemies:['Edrin Vale'],eliteIndex:0,
    combat:{
      kind:'final',level:avg+1,enemyTypes:['boss'],enemyHealth:2850,
      mechanics:[
        {name:'Clock Hand Sweep',type:'line',duration:1850},
        {name:'Bell Toll',type:'circles',duration:1700},
        {name:'Fractured Hour',type:'interrupt',duration:2000}
      ],
      phases:[
        {id:'edrin-rewind-one',name:'The Hour Rewinds',atPct:70,damageScale:1.05,addMechanics:[{name:'Second Hand',type:'line',duration:1600}]},
        {id:'edrin-rewind-two',name:'The Bell Remembers',atPct:40,damageScale:1.10,addMechanics:[{name:'Memory Ring',type:'circles',duration:1500}]},
        {id:'edrin-last-toll',name:'The Thirteenth Toll',atPct:15,damageScale:1.18,allAttacksAoe:true}
      ],
      environment:{bounds:{left:10,right:90,top:8,bottom:92},arena:{shape:'ellipse',cx:50,cy:50,rx:40,ry:42},blockers:[{id:'bell-support-n',x:50,y:13,w:20,h:8},{id:'bell-support-s',x:50,y:87,w:20,h:8}]}
    },
    completeText:'Edrin falls away from the bell rope. For the first time, midnight is allowed to continue.'
  });
  root.hidden=false;document.body.classList.add('bell-open');
  if(!won){renderBossPrelude();return}
  b.bossWon=true;b.stage='choice';history('Edrin Vale was defeated beneath the Thirteenth Bell. Midnight continued.');await save(false);renderChoice();window.CellboundFX?.callout?.({eyebrow:'12:01 AM',title:'Midnight continued.',tone:'gold',duration:1600})
}
function renderChoice(){
  const b=ensure();
  root.innerHTML=chrome('CLOCKTOWER · 12:01 AM','The bell is yours',
    '<div class="bell-choice-intro"><small>THE LOOP HAS STOPPED</small><h3>Greywake waits for a future.</h3><p>The mechanism is silent. The village below has no idea how many times it has lived these thirteen minutes.</p></div><div class="bell-choice-grid">'+
    endingCard('break','BREAK THE BELL','Destroy the time mechanism. Greywake returns cleanly to the present, but the Bell can never be used again.')+
    endingCard('complete','COMPLETE THE BELL','Stabilise the mechanism. Greywake returns permanently touched by small temporal anomalies.')+
    endingCard('silence','SILENCE THE THIRTEENTH HOUR','Use every discovery to remove the missing hour from the mechanism itself. Some villagers will remember every loop.')+
    '</div>'
  );bindClose();root.querySelectorAll('[data-ending]').forEach(btn=>btn.onclick=()=>finish(btn.dataset.ending))
}
function endingCard(id,title,copy){return'<button class="bell-ending" data-ending="'+id+'"><small>'+({break:'END THE MAGIC',complete:'KEEP THE MAGIC',silence:'MASTERWORK SOLUTION'}[id])+'</small><b>'+title+'</b><span>'+copy+'</span></button>'}
async function finish(ending){
  const b=ensure(),s=state();if(b.complete)return;
  b.complete=true;b.stage='complete';b.ending=ending;b.completedAt=new Date().toISOString();
  s.gold=(Number(s.gold)||0)+500;s.renown=(Number(s.renown)||0)+300;
  s.worldUnlocks=s.worldUnlocks&&typeof s.worldUnlocks==='object'?s.worldUnlocks:{};s.worldUnlocks.greywake=true;
  s.relics=s.relics&&typeof s.relics==='object'?s.relics:{};s.relics.thirteenthChime={name:'The Thirteenth Chime',unlockedAt:new Date().toISOString(),effect:'Once per dungeon, fatal damage may rewind the bearer to a survivable moment. Combat integration reserved for the relic system.'};
  s.activity=Array.isArray(s.activity)?s.activity:[];s.activity.push('Quest complete: '+TITLE+'. Greywake returned to the world.');
  history('The guild chose to '+({break:'break the Bell and return Greywake cleanly',complete:'complete the Bell and stabilise Greywake',silence:'silence the Thirteenth Hour itself'}[ending])+'.');
  await save(false);renderCompletion();window.CellboundFX?.victory?.({eyebrow:'QUEST COMPLETE',title:TITLE,copy:'Greywake has returned to the world.'})
}
function renderCompletion(){
  const b=ensure(),ending={break:'The Bell was broken.',complete:'The Bell was completed.',silence:'The Thirteenth Hour was silenced.'}[b.ending]||'The loop ended.';
  root.innerHTML=chrome('QUEST COMPLETE',TITLE,
    '<div class="bell-complete"><div class="bell-complete-mark">XIII</div><small>GREYWAKE HAS RETURNED</small><h3>'+ending+'</h3><p>The village now exists on the world map again. Your guild keeps every memory of the loops that led here.</p><div><article><span>GOLD</span><b>+500</b></article><article><span>RENOWN</span><b>+300</b></article><article><span>RELIC</span><b>THE THIRTEENTH CHIME</b></article><article><span>LOCATION</span><b>GREYWAKE</b></article></div><button data-bell-finish>RETURN TO QUEST JOURNAL →</button></div>'
  );bindClose();root.querySelector('[data-bell-finish]').onclick=()=>{close();window.CellboundQuests?.render?.()}
}
function renderAftermath(){
  const b=ensure();
  root.innerHTML=chrome('GREYWAKE · AFTERMATH',TITLE,
    '<div class="bell-aftermath"><small>PERMANENT WORLD LOCATION</small><h3>Greywake</h3><p>'+esc({break:'The clocktower is silent and the Bell is gone. Life has begun again without the loop.',complete:'The clocktower runs normally, though villagers occasionally remember things that have not happened yet.',silence:'Some villagers remember every single loop. Nobody in Greywake will ever hear a thirteenth toll again.'}[b.ending]||'The village exists again.')+'</p><div class="bell-memory-wall">'+b.facts.slice(-8).map(f=>'<span>'+esc(f.text)+'</span>').join('')+'</div><button data-bell-close2>CLOSE</button></div>'
  );bindClose();root.querySelector('[data-bell-close2]').onclick=close
}
function init(){
  Game=window.CellboundGame;
  if(!Game?.ready||!window.CellboundQuests){setTimeout(init,120);return}
  ensure();
  window.CellboundThirteenthBell={card,renderDetail,homeState,open,ensure};
  window.CellboundQuests.render?.()
}
init();
})();