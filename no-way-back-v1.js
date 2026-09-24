(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const TITLE='No Way Back';
const QUEST={
  id:'no-way-back',
  title:TITLE,
  difficulty:'Attunement',
  length:'Epic',
  start:'Silas Vane · Zeltira Harbour',
  summary:'An old sailor wants to reach an abandoned manor on a forgotten island. First he needs a crew. Then he needs a boat that can survive the crossing.',
  rewards:['The Manor Key','The Manor raid attunement']
};
let Game=null,root=null;
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const qroot=()=>window.CellboundQuests?.ensure?.();
const portraitHTML=(c,size='sm')=>window.CellboundPortraits?.portraitHTML?.(c,{size})||'<span class="cb-portrait cb-portrait--'+size+'"><b>'+esc(c?.portrait||String(c?.name||'?').slice(0,2).toUpperCase())+'</b></span>';

function ensure(){
  const q=qroot();if(!q)return null;
  q.noWayBack=q.noWayBack&&typeof q.noWayBack==='object'?q.noWayBack:{
    version:1,started:false,complete:false,stage:'sailor',ropeSolved:false,repairKit:false,sailRepaired:false,mapSolved:false,
    voyageAttempts:0,wrecks:0,arrived:false,houndsDefeated:false,gatePicked:false,silasDefeated:false,manorKey:false,
    history:[],startedAt:null,completedAt:null,devUnlocked:false
  };
  const n=q.noWayBack;
  n.history=Array.isArray(n.history)?n.history:[];
  n.stage=n.complete?'complete':n.stage||'sailor';
  const s=state();s.progression=s.progression&&typeof s.progression==='object'?s.progression:{};
  if(n.complete||n.manorKey)s.progression.manorRaidUnlocked=true;
  return n
}
function prereqs(){
  const q=qroot()||{};
  return[
    ['Ashes on the East Road',!!q.ashfall?.complete],
    ['Echoes Beneath Zeltira',!!q.flags?.hollowSanctumUnlocked],
    ['The Thirteenth Bell',!!q.thirteenthBell?.complete],
    ['The Fourfold Lock',!!q.fourfold?.complete]
  ]
}
function available(){
  const n=ensure();return Boolean(n?.started||n?.devUnlocked||prereqs().every(x=>x[1]))
}
function history(text){
  const n=ensure();if(!n)return;n.history.push({at:new Date().toISOString(),text});n.history=n.history.slice(-50)
}
async function save(note){
  if(note)history(note);
  Game?.save?.();await Game?.persistState?.();Game?.renderAll?.();
  renderTrading();window.CellboundQuests?.render?.();
  window.dispatchEvent(new CustomEvent('cellbound:no-way-back-update'))
}
function notify(label,title,text){
  let e=$('#nwbToast');if(!e){e=document.createElement('div');e.id='nwbToast';e.className='nwb-toast';document.body.appendChild(e)}
  e.innerHTML='<small>'+esc(label)+'</small><b>'+esc(title)+'</b><span>'+esc(text||'')+'</span>';e.classList.add('show');
  clearTimeout(e._timer);e._timer=setTimeout(()=>e.classList.remove('show'),4200)
}
function setStage(stage,note){
  const n=ensure();n.stage=stage;return save(note)
}
function stageText(n=ensure()){
  if(!n)return'';
  if(n.complete)return'The Manor Key is yours. The island is open to your guild.';
  if(!n.started)return'Meet the sailor at Zeltira Harbour.';
  if(n.stage==='rope')return'Untangle the mooring lines and free Silas’s boat.';
  if(n.stage==='repairs')return'Repair the hull, mend the sail and recover a route to Manor Island.';
  if(n.stage==='sailing')return'Sail the repaired boat to Manor Island.';
  if(n.stage==='arrival')return'Follow Silas beyond the island jetty.';
  if(n.stage==='hounds')return'Defeat The Three Hounds. Their pack bond lets them revive each other.';
  if(n.stage==='gate')return'Pick the iron gate and continue the pursuit.';
  if(n.stage==='silas')return'Defeat Silas Vane, Master of the Manor.';
  if(n.stage==='ending')return'Take the key from Silas and discover what he returned home to awaken.';
  return'Follow the trail to Manor Island.'
}
function card(){
  const n=ensure(),locked=!available()&&!n?.started;
  return{id:'no-way-back',icon:'⚓',title:TITLE,meta:'Raid attunement · Manor Island',difficulty:'Attunement',status:n?.complete?'COMPLETE':n?.started?'IN PROGRESS':locked?'LOCKED':'AVAILABLE',complete:!!n?.complete,locked}
}
function homeState(){
  const n=ensure();if(!n||n.complete||(!n.started&&!available()))return{active:false};
  return{active:true,small:'RAID ATTUNEMENT',title:n.started?stageText(n):'A sailor at Zeltira Harbour is asking for a crew.',label:'No Way Back'}
}
function ensureRoot(){
  if(root&&root.isConnected)return root;
  root=document.createElement('div');root.id='noWayBackRoot';root.className='nwb-backdrop';root.hidden=true;document.body.appendChild(root);return root
}
function cleanup(){
  if(!root)return;if(typeof root._cleanup==='function'){try{root._cleanup()}catch(e){}root._cleanup=null}
}
function close(){cleanup();if(root)root.hidden=true;document.body.classList.remove('nwb-open');window.CellboundQuests?.render?.()}
function chrome(label,title,body,cls=''){
  return'<section class="nwb-shell '+cls+'"><header class="nwb-head"><div><small>'+esc(label)+'</small><h2>'+esc(title)+'</h2></div><button data-nwb-close aria-label="Close">×</button></header>'+body+'</section>'
}
function bindClose(){root?.querySelector('[data-nwb-close]')?.addEventListener('click',close)}
function story(label,title,speaker,lines,onDone,button='CONTINUE →'){
  const r=ensureRoot();let i=0;
  const draw=()=>{
    const last=i===lines.length-1;
    r.innerHTML=chrome(label,title,'<div class="nwb-story"><div class="nwb-speaker">'+esc(String(speaker).split(/\s+/).map(x=>x[0]).slice(0,2).join(''))+'</div><div><small>'+esc(speaker)+'</small><p>'+esc(lines[i])+'</p><div class="nwb-story-dots">'+lines.map((_,x)=>'<i class="'+(x<=i?'on':'')+'"></i>').join('')+'</div><button data-nwb-story>'+(last?esc(button):'NEXT →')+'</button></div></div>');
    bindClose();
    r.querySelector('[data-nwb-story]').onclick=async()=>{if(!last){i++;draw();return}if(onDone)await onDone()}
  };
  r.hidden=false;document.body.classList.add('nwb-open');draw()
}
async function start(){
  const n=ensure();if(!available()&&!n.started)return;
  if(n.started){open();return}
  if(party().length!==5){alert('Silas needs a full five-character crew before the crossing can begin. Build your active party first.');Game.switchView?.('party');return}
  story('ZELTIRA HARBOUR','A Sailor With A Story','Silas Vane',[
    'You ever hear of the house on the little island beyond the Black Buoy?',
    'Big place. Old place. Been empty longer than most folk around here have been alive.',
    'I have wanted to see it for years. Trouble is, I have a boat and no crew worth trusting.',
    'Five of you, though? That changes things.',
    'Come down to the berth. If she still floats, perhaps we finally find out what is waiting over there.'
  ],async()=>{
    n.started=true;n.stage='rope';n.startedAt=new Date().toISOString();
    await save('Silas Vane asked the guild to crew his boat to an abandoned manor on a small offshore island.');
    renderRope()
  },'FOLLOW SILAS TO THE BOAT →')
}
function open(){
  const n=ensure();if(!n)return;
  const r=ensureRoot();cleanup();r.hidden=false;document.body.classList.add('nwb-open');
  if(!n.started){start();return}
  if(n.complete){renderComplete();return}
  if(n.stage==='rope')renderRope();
  else if(n.stage==='repairs')renderRepairs();
  else if(n.stage==='sailing')renderSailingReady();
  else if(n.stage==='arrival')renderArrival();
  else if(n.stage==='hounds')renderHoundsPrelude();
  else if(n.stage==='gate')renderGate();
  else if(n.stage==='silas')renderSilasPrelude();
  else if(n.stage==='ending')renderEnding();
  else renderRepairs()
}
function renderRope(note=''){
  const n=ensure(),order=['c','a','d','b'];let cleared=[];
  root.innerHTML=chrome('BOAT REPAIR · MINI GAME','Tangled Lines',
    '<div class="nwb-rope-layout"><div class="nwb-rope-scene"><div class="nwb-post p1"></div><div class="nwb-post p2"></div>'+
    ['a','b','c','d'].map((id,i)=>'<button class="nwb-rope r'+id+(cleared.includes(id)?' loose':'')+'" data-rope="'+id+'" aria-label="Rope '+(i+1)+'"><span></span></button>').join('')+
    '<div class="nwb-boat-mini">⚓</div></div><aside><small>MOORING LINES</small><h3>Free the boat</h3><p>The ropes have tightened around each other after years against the tide. Pulling the wrong line first cinches the knot tighter.</p><div class="nwb-rope-order"><b>'+cleared.length+' / 4 lines loosened</b><span>'+(note?esc(note):'Work out which line is sitting on top of the others.')+'</span></div><button data-rope-reset>RESET KNOT</button></aside></div>','nwb-rope-shell');
  bindClose();
  const update=()=>{
    root.querySelectorAll('[data-rope]').forEach(x=>x.classList.toggle('loose',cleared.includes(x.dataset.rope)));
    const b=root.querySelector('.nwb-rope-order b');if(b)b.textContent=cleared.length+' / 4 lines loosened'
  };
  root.querySelectorAll('[data-rope]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.rope;if(cleared.includes(id))return;
    if(id!==order[cleared.length]){
      cleared=[];update();
      const span=root.querySelector('.nwb-rope-order span');if(span)span.textContent='The knot bites tighter. Trace which rope crosses over the next one.';
      window.CellboundFX?.shake?.('soft');return
    }
    cleared.push(id);update();window.CellboundFX?.pulse?.(b);
    if(cleared.length===4){
      n.ropeSolved=true;n.stage='repairs';await save('The guild untangled the mooring lines and freed Silas’s boat from the berth.');
      notify('MINI GAME COMPLETE','Mooring lines cleared','The boat is free — but it is nowhere near seaworthy.');
      setTimeout(()=>renderBoatReveal(),450)
    }
  });
  root.querySelector('[data-rope-reset]').onclick=()=>{cleared=[];update()}
}
function renderBoatReveal(){
  story('THE BOAT','More Than A Crew','Silas Vane',[
    'Right. About this.',
    'The hull took more water than I remembered. That sail used to be one piece as well.',
    'And the chart...',
    '...I definitely had a chart.',
    'If we fix the hull, stitch the sail and recover the route, she will make the crossing.'
  ],async()=>{await setStage('repairs','Silas revealed the boat needs a hull repair, a stitched sail and a replacement route chart.');renderRepairs()},'INSPECT THE DAMAGE →')
}
function repairStatus(){
  const n=ensure();return Number(n.repairKit)+Number(n.sailRepaired)+Number(n.mapSolved)
}
function renderRepairs(){
  const n=ensure(),ready=repairStatus()===3;
  root.innerHTML=chrome('SILAS’S BOAT · HARBOUR','Make Her Seaworthy',
    '<div class="nwb-boat-hero"><div class="nwb-boat-art"><div class="nwb-sail '+(n.sailRepaired?'fixed':'torn')+'"></div><div class="nwb-hull '+(n.repairKit?'fixed':'holed')+'"></div><span class="nwb-mast"></span><span class="nwb-water"></span></div><div><small>REPAIRS '+repairStatus()+' / 3</small><h3>The island is still out of reach.</h3><p>Everything needed for the crossing can be solved from here. The route chart, once recovered, will remain known even if the boat is later lost at sea.</p></div></div>'+
    '<div class="nwb-repair-grid">'+
      repairCard('hull','HULL','Timber & Nails',n.repairKit,'The hull is taking water. A Shipwright’s Repair Kit is permanently stocked at the Trading Post for 5,000 gold.',n.repairKit?'HULL REPAIRED':'BUY AT TRADING POST')+
      repairCard('sail','SAIL','Torn Canvas',n.sailRepaired,'Rebuild the torn sail before the wind tears it apart completely.',n.sailRepaired?'SAIL REPAIRED':'STITCH THE SAIL')+
      repairCard('map','CHART','Missing Map',n.mapSolved,'Reconstruct Silas’s remembered route from harbour landmarks.',n.mapSolved?'ROUTE RECORDED':'PLOT THE ROUTE')+
    '</div><div class="nwb-ready-bar '+(ready?'ready':'')+'"><div><small>'+ (ready?'BOAT READY':'CROSSING LOCKED') +'</small><b>'+ (ready?'The tide is turning. Manor Island is reachable.':'Complete all three repairs before leaving the harbour.') +'</b></div><button data-nwb-depart '+(ready?'':'disabled')+'>CAST OFF →</button></div>');
  bindClose();
  root.querySelector('[data-repair="hull"]')?.addEventListener('click',()=>{Game.switchView?.('trading');close();setTimeout(renderTrading,80)});
  root.querySelector('[data-repair="sail"]')?.addEventListener('click',()=>{if(!n.sailRepaired)openSailPuzzle()});
  root.querySelector('[data-repair="map"]')?.addEventListener('click',()=>{if(!n.mapSolved)openMapPuzzle()});
  root.querySelector('[data-nwb-depart]')?.addEventListener('click',async()=>{if(repairStatus()!==3)return;n.stage='sailing';await save('The repaired boat left Zeltira Harbour for Manor Island.');renderSailingReady()})
}
function repairCard(kind,eyebrow,title,done,copy,action){
  return'<article class="nwb-repair-card '+(done?'done':'')+'"><span class="nwb-repair-icon">'+(kind==='hull'?'▰':kind==='sail'?'◩':'⌖')+'</span><small>'+eyebrow+'</small><h3>'+title+'</h3><p>'+copy+'</p><button data-repair="'+kind+'" '+(done?'disabled':'')+'>'+(done?'✓ '+action:action+' →')+'</button></article>'
}
function openSailPuzzle(){
  const n=ensure(),r=ensureRoot(),pieces=[0,1,2,3,4,5,6,7,8,9,10,11].sort(()=>Math.random()-.5),placed={},selected={id:null},started=Date.now(),limit=120000;
  let note='Match the stains, seams and repair marks across the loose pieces.',misses=0;
  const secured=()=>Object.keys(placed).length;
  const pieceVisual=(id,ghost=false)=>'<i class="'+(ghost?'nwb-sail-ghost':'nwb-sail-piece')+' p'+id+'" data-piece-visual="'+id+'"></i>';
  function pieceButton(id){
    return'<button class="nwb-loose-piece '+(selected.id===id?'selected':'')+'" data-sail-piece="'+id+'" aria-label="Loose sail piece">'+pieceVisual(id)+'</button>'
  }
  const draw=()=>{
    const remaining=Math.max(0,Math.ceil((limit-(Date.now()-started))/1000));
    r.innerHTML=chrome('TIMED MINI GAME · 120 SECONDS','Stitch The Sail',
      '<div class="nwb-jigsaw"><aside><small>TORN CANVAS</small><h3>Rebuild the sail</h3><p>Each piece carries part of the sail’s original markings. Select a loose piece, then work out where its stains, seams and patches continue across the finished sail.</p>'+
      '<div class="nwb-sail-progress"><span>STITCHED</span><b>'+secured()+' / 12</b></div>'+
      '<div class="nwb-timer"><span>TIME</span><b data-sail-time>'+remaining+'s</b></div>'+
      '<div class="nwb-piece-tray">'+pieces.filter(id=>placed[id]==null).map(id=>pieceButton(id)).join('')+'</div>'+
      '<p class="nwb-sail-help">Correct pieces snap into place. A wrong panel will flash red without costing the piece.</p></aside>'+
      '<main><div class="nwb-sail-guide"><div class="nwb-sail-grid '+(selected.id!=null?'is-placing':'')+'">'+
      [0,1,2,3,4,5,6,7,8,9,10,11].map(slot=>'<button class="'+(placed[slot]!=null?'locked':'available')+'" data-sail-slot="'+slot+'" aria-label="Sail panel '+(slot+1)+'">'+(placed[slot]!=null?pieceVisual(placed[slot]):'<span class="nwb-empty-sail-slot"></span>')+'</button>').join('')+
      '</div></div><p data-sail-note>'+esc(note)+'</p><button class="nwb-secondary" data-sail-reset>RESHUFFLE LOOSE PIECES</button></main></div>');
    bindClose();bindPieces()
  };
  function bindPieces(){
    r.querySelectorAll('[data-sail-piece]').forEach(b=>b.onclick=()=>{
      selected.id=Number(b.dataset.sailPiece);
      note='Piece selected. Match its markings to the faded guide.';
      r.querySelectorAll('[data-sail-piece]').forEach(x=>x.classList.toggle('selected',Number(x.dataset.sailPiece)===selected.id));
      r.querySelector('.nwb-sail-grid')?.classList.add('is-placing');
      const msg=r.querySelector('[data-sail-note]');if(msg)msg.textContent=note
    });
    r.querySelectorAll('[data-sail-slot]').forEach(b=>b.onclick=async()=>{
      if(selected.id==null){const msg=r.querySelector('[data-sail-note]');if(msg)msg.textContent='Select a loose sail piece first.';return}
      const slot=Number(b.dataset.sailSlot);
      if(placed[slot]!=null)return;
      if(slot!==selected.id){
        misses++;
        b.classList.remove('wrong');void b.offsetWidth;b.classList.add('wrong');
        note='Those seams do not line up. Try another panel.';
        if(misses>=3){
          const hint=r.querySelector('[data-sail-slot="'+selected.id+'"]');
          if(hint){hint.classList.add('hint');setTimeout(()=>hint.classList.remove('hint'),1500)}
          note='The torn edge seems to match the highlighted panel.';
          misses=0
        }
        const msg=r.querySelector('[data-sail-note]');if(msg)msg.textContent=note;
        setTimeout(()=>b.classList.remove('wrong'),420);
        window.CellboundFX?.shake?.('soft');return
      }
      placed[slot]=selected.id;selected.id=null;misses=0;
      const count=secured();
      if(count===12){
        cleanup();n.sailRepaired=true;n.stage='repairs';await save('The guild stitched the torn sail back into one seaworthy piece.');
        notify('MINI GAME COMPLETE','Sail repaired','The canvas holds against the harbour wind.');renderRepairs();return
      }
      note='Piece secured — '+count+' of 12 panels stitched.';
      draw()
    });
    r.querySelector('[data-sail-reset]').onclick=()=>{
      pieces.sort(()=>Math.random()-.5);selected.id=null;misses=0;
      note='Loose pieces reshuffled. Correctly stitched panels stay in place.';
      draw()
    }
  }
  const timer=setInterval(()=>{
    const t=r.querySelector('[data-sail-time]');if(t)t.textContent=Math.max(0,Math.ceil((limit-(Date.now()-started))/1000))+'s';
    if(Date.now()-started>=limit){
      clearInterval(timer);root._cleanup=null;
      notify('TIME EXPIRED','The sail comes apart','The loose canvas got away from you. Your next attempt starts fresh.');
      openSailPuzzle()
    }
  },250);
  r._cleanup=()=>clearInterval(timer);r.hidden=false;document.body.classList.add('nwb-open');draw()
}
function openMapPuzzle(){
  const n=ensure(),correct=['harbour','split','cliff','buoy','island'],route=[];
  const nodes=[
    ['harbour','Zeltira Harbour','⚓','12','77'],['split','Split Rock','⋔','31','45'],['shoal','White Shoal','≈','45','74'],
    ['cliff','Cliff Passage','▰','55','35'],['buoy','Black Buoy','●','72','58'],['reef','North Reef','✕','75','21'],['island','Manor Island','⌂','91','39']
  ];
  const draw=(note='Plot the route from Silas’s clues. Select each landmark in sailing order.')=>{
    root.innerHTML=chrome('NAVIGATION MINI GAME','The Missing Map',
      '<div class="nwb-map-layout"><aside><small>SILAS REMEMBERS</small><h3>Four fragments of the route</h3><blockquote>“Split Rock sits north-east of the harbour.”</blockquote><blockquote>“When the old lighthouse cliffs swallow the harbour behind you, turn east.”</blockquote><blockquote>“Stay south of the Black Buoy. North of it is reef.”</blockquote><blockquote>“From the buoy, the island is the only land ahead.”</blockquote><div class="nwb-route-readout"><small>PLOTTED COURSE</small><b>'+(route.length?route.map(id=>nodes.find(x=>x[0]===id)?.[1]).join(' → '):'No course plotted')+'</b></div><p class="nwb-map-note">'+esc(note)+'</p><button data-map-reset>ERASE COURSE</button></aside><main><div class="nwb-chart">'+nodes.map(x=>'<button data-map-node="'+x[0]+'" style="left:'+x[3]+'%;top:'+x[4]+'%" class="'+(route.includes(x[0])?'selected':'')+'"><i>'+x[2]+'</i><span>'+x[1]+'</span></button>').join('')+'<div class="nwb-chart-route">'+route.map((id,i)=>'<span>'+ (i+1) +'</span>').join('')+'</div></div></main></div>');
    bindClose();
    root.querySelectorAll('[data-map-node]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.mapNode;if(route.includes(id))return;
      const expected=correct[route.length];
      if(id!==expected){route.length=0;draw('That course contradicts one of Silas’s landmarks. The line has been erased.');window.CellboundFX?.shake?.('soft');return}
      route.push(id);
      if(route.length===correct.length){
        n.mapSolved=true;n.stage='repairs';await save('Silas’s remembered landmarks were turned into a permanent route chart to Manor Island.');
        notify('ROUTE RECORDED','Manor Island Chart','This route is now permanent, even if a future crossing fails.');renderRepairs();return
      }
      draw()
    });
    root.querySelector('[data-map-reset]').onclick=()=>{route.length=0;draw()}
  };
  draw()
}
function renderSailingReady(){
  const n=ensure();
  if(!n.repairKit||!n.sailRepaired||!n.mapSolved){n.stage='repairs';renderRepairs();return}
  root.innerHTML=chrome('MANOR ISLAND · CROSSING','The Open Water',
    '<div class="nwb-voyage-ready"><div class="nwb-sea-window"><div class="nwb-distant-manor">⌂</div><div class="nwb-sea-boat">⚓</div></div><div><small>VOYAGE '+(Number(n.voyageAttempts)+1)+'</small><h3>Reach the island without losing the boat.</h3><p>Steer around rocks and wreckage. Squalls tear the sail; impacts damage the hull. The chart will survive a failed crossing, but the hull repair and sail will need to be replaced.</p><div class="nwb-voyage-warning"><b>FAILURE COST</b><span>New 5,000 gold hull kit + repair the sail again</span></div><button data-voyage-start>TAKE THE HELM →</button></div></div>');
  bindClose();root.querySelector('[data-voyage-start]').onclick=startVoyage
}
async function startVoyage(){
  const n=ensure();
  n.voyageAttempts=(Number(n.voyageAttempts)||0)+1;
  await save('The guild began crossing open water toward Manor Island.');

  const laneX=[22,50,78],duration=38000;
  let lane=1,progress=0,hull=100,sail=100,lastSpawn=0,ended=false,hazards=[],lastHitAt=0,milestone=0;
  const started=performance.now();

  root.innerHTML=chrome('MANOR ISLAND · OPEN WATER','Crossing The Black Tide',
    '<div class="nwb-sailing-v2">'+
      '<div class="nwb-voyage-hud">'+
        '<div class="nwb-vital-card hull"><small>HULL INTEGRITY</small><div><b data-hull>100%</b><span><i data-hullbar></i></span></div></div>'+
        '<div class="nwb-route-card"><small>DISTANCE TO MANOR ISLAND</small><b data-distance>2.4 NM</b><span><i data-routebar></i></span></div>'+
        '<div class="nwb-vital-card sail"><small>SAIL INTEGRITY</small><div><b data-sail>100%</b><span><i data-sailbar></i></span></div></div>'+
      '</div>'+
      '<div class="nwb-sea-stage" data-ocean>'+
        '<div class="nwb-night-sky"><i class="nwb-voyage-moon"></i><i class="nwb-cloud c1"></i><i class="nwb-cloud c2"></i></div>'+
        '<div class="nwb-manor-island" data-manor><div class="nwb-manor-cliff"></div><div class="nwb-manor-castle"><i></i><i></i><i></i><span></span></div><small>MANOR ISLAND</small></div>'+
        '<div class="nwb-horizon-mist"></div>'+
        '<div class="nwb-sea-surface"><i></i><i></i><i></i><i></i></div>'+
        '<div class="nwb-lane-marker l0"></div><div class="nwb-lane-marker l1"></div><div class="nwb-lane-marker l2"></div>'+
        '<button class="nwb-lane-touch l0" data-lane-touch="0" aria-label="Steer to port lane"></button>'+
        '<button class="nwb-lane-touch l1" data-lane-touch="1" aria-label="Steer to middle lane"></button>'+
        '<button class="nwb-lane-touch l2" data-lane-touch="2" aria-label="Steer to starboard lane"></button>'+
        '<div class="nwb-voyage-callout" data-voyage-callout><small>BLACK TIDE</small><b>Keep the boat clear of the hazards ahead.</b></div>'+
        '<div class="nwb-boat-v2 lane-1" data-boat><div class="wake"></div><div class="boat-hull"></div><div class="mast"></div><div class="boat-sail"></div><div class="lantern"></div></div>'+
        '<div class="nwb-impact-flash" data-impact></div>'+
      '</div>'+
      '<div class="nwb-helm">'+
        '<button data-lane="0"><span>◀</span><small>PORT</small><b>LEFT LANE</b></button>'+
        '<button class="active" data-lane="1"><span>◆</span><small>HOLD COURSE</small><b>MIDDLE</b></button>'+
        '<button data-lane="2"><span>▶</span><small>STARBOARD</small><b>RIGHT LANE</b></button>'+
      '</div>'+
      '<div class="nwb-voyage-legend"><span><i class="rock"></i>Rocks damage hull</span><span><i class="wreck"></i>Wreckage damages hull</span><span><i class="squall"></i>Squalls tear sail</span></div>'+
    '</div>'
  );
  bindClose();

  const ocean=root.querySelector('[data-ocean]'),boat=root.querySelector('[data-boat]'),manor=root.querySelector('[data-manor]');
  const callout=root.querySelector('[data-voyage-callout]');

  function say(kicker,message){
    if(!callout)return;
    callout.innerHTML='<small>'+esc(kicker)+'</small><b>'+esc(message)+'</b>';
    callout.classList.remove('pulse');void callout.offsetWidth;callout.classList.add('pulse')
  }

  function setLane(next){
    if(ended)return;
    lane=Math.max(0,Math.min(2,Number(next)||0));
    if(boat){
      boat.classList.remove('lane-0','lane-1','lane-2');
      boat.classList.add('lane-'+lane);
      boat.style.left=laneX[lane]+'%'
    }
    root.querySelectorAll('[data-lane]').forEach(b=>b.classList.toggle('active',Number(b.dataset.lane)===lane))
  }
  root.querySelectorAll('[data-lane],[data-lane-touch]').forEach(b=>b.addEventListener('click',()=>setLane(b.dataset.lane??b.dataset.laneTouch)));
  const key=e=>{
    if(e.type!=='keydown')return;
    if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')setLane(lane-1);
    if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')setLane(lane+1);
    if(e.key==='ArrowDown'||e.key==='s'||e.key==='S')setLane(1)
  };
  window.addEventListener('keydown',key);

  function hazardMarkup(type){
    if(type==='rock')return'<div class="hazard-rock"><i></i><i></i><i></i></div><small>ROCKS</small>';
    if(type==='wreck')return'<div class="hazard-wreck"><i></i><i></i><span></span></div><small>WRECKAGE</small>';
    return'<div class="hazard-squall"><i></i><i></i><i></i></div><small>SQUALL</small>'
  }

  function addHazard(type,hLane,now,offset=0){
    const el=document.createElement('div');
    el.className='nwb-sea-hazard '+type+' lane-'+hLane;
    el.style.left=laneX[hLane]+'%';
    el.style.top=(-14-offset)+'%';
    el.innerHTML='<span class="danger-ring"></span>'+hazardMarkup(type);
    ocean.appendChild(el);
    hazards.push({type,lane:hLane,y:-14-offset,el,hit:false});
    lastSpawn=now
  }

  function spawnWave(now){
    const difficulty=progress/100;
    const safe=Math.floor(Math.random()*3);
    const doubleWave=progress>24&&Math.random()<(0.24+difficulty*.18);
    const occupied=[];
    if(doubleWave){
      [0,1,2].filter(x=>x!==safe).forEach((hLane,i)=>{
        const roll=Math.random(),type=roll<.45?'rock':roll<.72?'wreck':'squall';
        addHazard(type,hLane,now,i*7);occupied.push(hLane)
      })
    }else{
      let hLane=Math.floor(Math.random()*3);
      const roll=Math.random(),type=roll<.48?'rock':roll<.76?'wreck':'squall';
      addHazard(type,hLane,now,0);occupied.push(hLane)
    }
    if(progress>62&&Math.random()<.18&&occupied.length===1){
      const options=[0,1,2].filter(x=>!occupied.includes(x));
      const second=options[Math.floor(Math.random()*options.length)];
      addHazard(Math.random()<.55?'wreck':'squall',second,now,8)
    }
  }

  function updateVitals(){
    const h=root.querySelector('[data-hull]'),s=root.querySelector('[data-sail]');
    const hb=root.querySelector('[data-hullbar]'),sb=root.querySelector('[data-sailbar]'),rb=root.querySelector('[data-routebar]');
    if(h)h.textContent=Math.ceil(hull)+'%';if(s)s.textContent=Math.ceil(sail)+'%';
    if(hb){hb.style.width=hull+'%';hb.parentElement?.classList.toggle('danger',hull<=35)}
    if(sb){sb.style.width=sail+'%';sb.parentElement?.classList.toggle('danger',sail<=35)}
    if(rb)rb.style.width=progress+'%';
    const d=root.querySelector('[data-distance]');if(d)d.textContent=Math.max(0,(2.4*(1-progress/100))).toFixed(1)+' NM'
  }

  function hit(hazard,now){
    if(hazard.hit||now-lastHitAt<500)return;
    hazard.hit=true;lastHitAt=now;hazard.el.classList.add('hit');
    const impact=root.querySelector('[data-impact]');
    if(impact){impact.classList.remove('show');void impact.offsetWidth;impact.classList.add('show')}
    boat?.classList.add('impact');setTimeout(()=>boat?.classList.remove('impact'),460);
    if(hazard.type==='squall'){
      sail=Math.max(0,sail-24);say('SAIL STRIKE','The squall catches the canvas — change lanes earlier.')
    }else if(hazard.type==='rock'){
      hull=Math.max(0,hull-30);say('HULL STRIKE','Rock along the keel. Hull integrity falling.')
    }else{
      hull=Math.max(0,hull-18);say('WRECKAGE','Timber clips the hull. Keep the bow clear.')
    }
    updateVitals();window.CellboundFX?.shake?.(hazard.type==='rock'?'hard':'soft')
  }

  async function fail(){
    if(ended)return;ended=true;cleanup();
    n.wrecks=(Number(n.wrecks)||0)+1;n.repairKit=false;n.sailRepaired=false;n.stage='repairs';
    await save('The crossing failed. The route chart survived, but the hull repair and sail were lost.');
    story('VOYAGE FAILED','Washed Back To Harbour','Silas Vane',[
      'Well. We found the rocks.',
      'The chart is dry enough. That part is not lost.',
      'The hull is another matter. And the sail is finished.',
      'Repair her again and we try again.'
    ],()=>renderRepairs(),'RETURN TO THE BOAT →')
  }

  async function succeed(){
    if(ended)return;ended=true;cleanup();
    n.arrived=true;n.stage='arrival';
    await save('The boat survived the crossing and reached the jetty beneath Manor Island.');
    renderArrival()
  }

  let last=performance.now();
  function frame(now){
    if(ended)return;
    const dt=Math.min(50,now-last);last=now;
    progress=Math.min(100,((now-started)/duration)*100);

    const interval=Math.max(1050,1650-progress*5.2);
    if(now-lastSpawn>interval)spawnWave(now);

    const speed=.024+progress*.000035;
    hazards.forEach(h=>{
      h.y+=dt*speed;
      h.el.style.top=h.y+'%';
      if(!h.hit&&h.y>69&&h.y<88&&h.lane===lane)hit(h,now)
    });
    hazards=hazards.filter(h=>{
      if(h.y>112){h.el.remove();return false}
      return true
    });

    if(manor){
      const scale=.62+(progress/100)*.64;
      manor.style.transform='translateX(-50%) scale('+scale.toFixed(3)+')';
      manor.style.opacity=String(.46+(progress/100)*.54)
    }

    const nextMilestone=progress>=82?4:progress>=58?3:progress>=34?2:progress>=14?1:0;
    if(nextMilestone>milestone){
      milestone=nextMilestone;
      if(milestone===1)say('SPLIT ROCK','Landmark confirmed. Keep the boat in open water.');
      if(milestone===2)say('CLIFF PASSAGE','The island cliffs are visible through the mist.');
      if(milestone===3)say('BLACK BUOY','Final marker. Manor Island is directly ahead.');
      if(milestone===4)say('MANOR ISLAND','Jetty in sight. Hold the boat together.')
    }

    updateVitals();
    if(hull<=0||sail<=0){fail();return}
    if(progress>=100){succeed();return}
    requestAnimationFrame(frame)
  }

  root._cleanup=()=>{
    ended=true;
    window.removeEventListener('keydown',key);
    hazards.forEach(h=>h.el.remove())
  };
  updateVitals();requestAnimationFrame(frame)
}
function renderArrival(){
  story('MANOR ISLAND','Homecoming','Silas Vane',[
    'I wondered if I would ever see these gates again.',
    'You really should be more careful who you agree to help.',
    'You thought you were bringing an old sailor to an abandoned house.',
    'You brought its master home.',
    'Unfortunately, I cannot have you leaving.'
  ],async()=>{const n=ensure();n.stage='hounds';await save('Silas revealed himself as the owner of the Manor and trapped the guild on the island.');renderHoundsPrelude()},'TURN TOWARD THE GROWLING →')
}
async function renderHoundsPrelude(){
  close();
  const dossier=window.CellboundBossDossier;
  if(dossier?.show)await dossier.show('three-hounds');
  await startHoundsCombat()
}
async function startHoundsCombat(){
  const n=ensure(),p=party(),run=window.CellboundQuests?.runInteractiveQuest2DFight;
  if(p.length!==5){alert('Build a complete active five-character party before facing The Three Hounds.');Game.switchView?.('party');close();return}
  if(typeof run!=='function'){alert('Live quest combat is still loading. Try again.');return}
  close();
  const won=await run({
    quest:TITLE,title:'The Three Hounds',location:'Manor Island · Outer Grounds',
    ambience:'Silas whistles once. Grim, Fang and Wail spread across the path while the party forms up in front of the Manor gates.',
    presentationKind:'quest',phases:['Pack Bond'],initialTarget:0,sliceMs:1800,reviveWindowMs:12000,revivePct:35,focusSelectedDamageOnly:true,
    autoContinueOnVictory:true,autoContinueDelayMs:850,
    enemies:[
      {name:'Grim',maxHealth:3600,absoluteHealth:true,classification:'elite',attackName:'Bonebreaker Bite',damageScale:1.12},
      {name:'Fang',maxHealth:3300,absoluteHealth:true,classification:'elite',attackName:'Pounce',targeting:'random',damageScale:1.04},
      {name:'Wail',maxHealth:3450,absoluteHealth:true,classification:'elite',attackName:'Rending Howl',damageScale:1.02}
    ],
    combat:{kind:'boss',level:18,enemyTypes:['elite','elite','elite'],enemyHealth:3600,mechanics:[]},
    completeText:'The pack bond breaks. Grim, Fang and Wail stay down together.'
  });
  const r=ensureRoot();r.hidden=false;document.body.classList.add('nwb-open');
  if(!won){renderHoundsPrelude();return}
  n.houndsDefeated=true;n.stage='gate';await save('The Three Hounds were defeated in live combat before Licked Wounds could restore the pack.');
  notify('BOSS DEFEATED','The Three Hounds','Silas is already running for the Manor gates.');
  renderGateStory()
}
function startHounds(){
  const n=ensure(),p=party();if(p.length!==5){alert('Build a complete active five-character party before facing The Three Hounds.');Game.switchView?.('party');close();return}
  const hs=[{id:'grim',name:'Grim',hp:100,deadAt:0,skill:'Bonebreaker'},{id:'fang',name:'Fang',hp:100,deadAt:0,skill:'Pounce'},{id:'wail',name:'Wail',hp:100,deadAt:0,skill:'Pack Howl'}];
  let focus='grim',partyHp=100,seconds=0,revives=0,done=false,log=['The pack circles the party.'],special=0;
  root.innerHTML=chrome('BOSS FIGHT · MANOR GROUNDS','The Three Hounds',
    '<div class="nwb-hounds-fight"><aside><small>ACTIVE FIVE</small><div class="nwb-hound-party">'+p.map(c=>'<article>'+portraitHTML(c,'sm')+'<span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span></article>').join('')+'</div><div class="nwb-party-vital"><span>PARTY CONDITION</span><div><i data-party-hp></i></div><b data-party-hp-text>100%</b></div><div class="nwb-combat-log" data-hound-log></div></aside><main><div class="nwb-pack-banner"><small>PACK BOND</small><b>Fallen hounds revive after 12 seconds.</b><span>Switch targets before the first body is licked back to life.</span></div><div class="nwb-hound-grid">'+hs.map(h=>'<article class="nwb-hound" data-hound="'+h.id+'"><div class="nwb-hound-portrait">◆</div><small>'+h.skill.toUpperCase()+'</small><h3>'+h.name+'</h3><div class="nwb-hound-hp"><i data-hound-bar="'+h.id+'"></i></div><b data-hound-hp="'+h.id+'">100%</b><em data-hound-revive="'+h.id+'"></em><button data-focus="'+h.id+'">FOCUS '+h.name.toUpperCase()+'</button></article>').join('')+'</div><div class="nwb-tactics"><button data-focus="spread">SPREAD DAMAGE</button><span data-focus-label>Current order: FOCUS GRIM</span></div></main></div>');
  bindClose();
  function addLog(t){log.push(t);log=log.slice(-6);const e=root.querySelector('[data-hound-log]');if(e)e.innerHTML=log.slice().reverse().map(x=>'<p>'+esc(x)+'</p>').join('')}
  root.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>{focus=b.dataset.focus;root.querySelectorAll('[data-focus]').forEach(x=>x.classList.toggle('active',x.dataset.focus===focus));const l=root.querySelector('[data-focus-label]');if(l)l.textContent='Current order: '+(focus==='spread'?'SPREAD DAMAGE':'FOCUS '+focus.toUpperCase());addLog(focus==='spread'?'The party spreads damage across the pack.':'The party focuses '+hs.find(x=>x.id===focus)?.name+'.')});
  root.querySelector('[data-focus="grim"]').classList.add('active');addLog(log[0]);
  function update(){
    root.querySelector('[data-party-hp]').style.width=partyHp+'%';root.querySelector('[data-party-hp-text]').textContent=Math.ceil(partyHp)+'%';
    hs.forEach(h=>{
      const card=root.querySelector('[data-hound="'+h.id+'"]'),bar=root.querySelector('[data-hound-bar="'+h.id+'"]'),txt=root.querySelector('[data-hound-hp="'+h.id+'"]'),rev=root.querySelector('[data-hound-revive="'+h.id+'"]');
      if(bar)bar.style.width=Math.max(0,h.hp)+'%';if(txt)txt.textContent=Math.max(0,Math.ceil(h.hp))+'%';card?.classList.toggle('dead',h.hp<=0);
      if(rev)rev.textContent=h.hp<=0&&h.deadAt?('LICKED WOUNDS IN '+Math.max(0,Math.ceil(12-(Date.now()-h.deadAt)/1000))+'s'):''
    })
  }
  async function win(){
    if(done)return;done=true;clearInterval(tick);n.houndsDefeated=true;n.stage='gate';await save('The Three Hounds were brought down before their pack bond could restore them.');
    window.CellboundFX?.victory?.(root.querySelector('.nwb-hound-grid'));notify('BOSS DEFEATED','The Three Hounds','Silas is already running for the Manor gates.');
    setTimeout(()=>renderGateStory(),650)
  }
  async function lose(){
    if(done)return;done=true;clearInterval(tick);Game.applyPartyCellShock?.(25);await Game.persistState?.();
    story('PARTY DEFEATED','The Pack Holds','',[
      'The hounds break the party formation before the final kill can be coordinated.',
      'When the guild recovers, all three animals are back on their feet.',
      'Bring their health down together. Once the first falls, the clock is running.'
    ],()=>renderHoundsPrelude(),'TRY AGAIN →')
  }
  const tick=setInterval(()=>{
    if(done)return;seconds+=.5;const living=hs.filter(h=>h.hp>0);
    if(!living.length){win();return}
    const total=2.5;
    if(focus==='spread'){const each=total/living.length;living.forEach(h=>h.hp=Math.max(0,h.hp-each))}
    else{
      const target=hs.find(h=>h.id===focus&&h.hp>0);
      if(target){target.hp=Math.max(0,target.hp-total*.68);const rest=living.filter(h=>h!==target);rest.forEach(h=>h.hp=Math.max(0,h.hp-(total*.32/Math.max(1,rest.length))))}
      else living.forEach(h=>h.hp=Math.max(0,h.hp-total/living.length))
    }
    hs.forEach(h=>{if(h.hp<=0&&!h.deadAt){h.deadAt=Date.now();addLog(h.name+' falls. Pack Bond begins — 12 seconds.');window.CellboundFX?.death?.(root.querySelector('[data-hound="'+h.id+'"]'))}});
    if(hs.every(h=>h.hp<=0)){update();win();return}
    hs.forEach(h=>{if(h.hp<=0&&h.deadAt&&Date.now()-h.deadAt>=12000&&hs.some(x=>x.hp>0)){h.hp=35;h.deadAt=0;revives++;addLog('Licked Wounds! '+h.name+' returns at 35% health.');window.CellboundFX?.heal?.(root.querySelector('[data-hound="'+h.id+'"]'),35);notify('LICKED WOUNDS',h.name+' revived','The surviving pack restored a fallen hound.')}});
    partyHp=Math.max(0,partyHp-living.length*.07);
    special+=.5;if(special>=5){special=0;const attacker=living[Math.floor(Math.random()*living.length)];if(attacker){const hit=attacker.id==='grim'?4.5:attacker.id==='fang'?3.2:2.2;partyHp=Math.max(0,partyHp-hit);addLog(attacker.name+' uses '+attacker.skill+'.');if(attacker.id==='wail')hs.filter(h=>h.hp>0).forEach(h=>h.hp=Math.min(100,h.hp+1.5))}}
    if(revives>=4)partyHp=Math.max(0,partyHp-.8);
    update();if(partyHp<=0)lose()
  },500);
  root._cleanup=()=>{done=true;clearInterval(tick)};update()
}
function renderGateStory(){
  story('THE CHASE','Behind The Iron Gate','Silas Vane',[
    'The last hound hits the ground and Silas runs.',
    'He crosses the courtyard, slips through an iron gate and throws the lock behind him.',
    'Through the bars, he looks back only once.',
    '“You should have taken the warning.”'
  ],async()=>{await setStage('gate','Silas locked himself beyond the Manor courtyard gate.');renderGate()},'EXAMINE THE LOCK →')
}
function renderGate(){
  root.innerHTML=chrome('LOCKPICK MINI GAME','The Manor Gate',
    '<div class="nwb-lockpick"><aside><small>IRON WARD LOCK</small><h3>Hold the tension. Set five pins.</h3><p>The tension needle sweeps continuously. Tap <strong>SET PIN</strong> while the needle is inside the highlighted window. A bad set drops the previous pin.</p><div class="nwb-pins">'+[0,1,2,3,4].map(i=>'<i data-pin="'+i+'"></i>').join('')+'</div><button data-set-pin>SET PIN</button></aside><main><div class="nwb-tension"><div class="nwb-tension-track">'+[18,34,57,72,86].map((x,i)=>'<span class="zone z'+i+'" style="left:'+(x-4)+'%"></span>').join('')+'<i data-tension-needle></i></div><div><small>CURRENT PIN</small><b data-pin-label>PIN 1 / 5</b></div></div><div class="nwb-lock-face"><span>⌾</span><i></i><i></i><i></i></div><p data-lock-note>Set each pin in sequence.</p></main></div>');
  bindClose();let pos=0,dir=1,pin=0,last=performance.now(),active=true;const targets=[18,34,57,72,86];
  function frame(now){if(!active)return;const dt=Math.min(60,now-last);last=now;pos+=dir*dt*.075;if(pos>=100){pos=100;dir=-1}else if(pos<=0){pos=0;dir=1}const needle=root.querySelector('[data-tension-needle]');if(needle)needle.style.left=pos+'%';requestAnimationFrame(frame)}
  root.querySelector('[data-set-pin]').onclick=async()=>{
    const target=targets[pin],ok=Math.abs(pos-target)<=5;
    if(!ok){pin=Math.max(0,pin-1);root.querySelectorAll('[data-pin]').forEach((e,i)=>e.classList.toggle('set',i<pin));root.querySelector('[data-lock-note]').textContent='The pin slips. The previous pin drops with it.';window.CellboundFX?.shake?.('soft');return}
    root.querySelector('[data-pin="'+pin+'"]').classList.add('set');pin++;
    if(pin>=5){active=false;const n=ensure();n.gatePicked=true;n.stage='silas';await save('The guild picked the Manor gate lock and entered the courtyard.');notify('LOCK OPEN','The Manor Gate','The final pin clicks. The gate swings inward.');setTimeout(()=>renderSilasPrelude(),500);return}
    root.querySelector('[data-pin-label]').textContent='PIN '+(pin+1)+' / 5';root.querySelector('[data-lock-note]').textContent='Pin '+pin+' set. Keep the tension steady.'
  };
  root._cleanup=()=>{active=false};requestAnimationFrame(frame)
}
function renderSilasPrelude(){
  story('MANOR COURTYARD','Master Of The Manor','Silas Vane',[
    'Torches along the Manor walls ignite one by one.',
    'Silas waits in the centre of the courtyard with an enormous anchor dragging behind him.',
    'The sailor’s coat hangs open now. Beneath it is the crest carved into every gate and window around you.',
    '“You made it further than the last crew.”',
    'He lifts the anchor.',
    '“No one leaves my home twice.”'
  ],async()=>{const n=ensure();n.stage='silas';await save();await showSilasDossier()},'FACE SILAS VANE →')
}
async function showSilasDossier(){
  close();
  const dossier=window.CellboundBossDossier;
  if(dossier?.show)await dossier.show('silas-vane');
  await startSilas()
}
async function startSilas(){
  const p=party();if(p.length!==5){alert('Build a complete active five-character party before facing Silas Vane.');Game.switchView?.('party');close();return}
  close();
  const won=await window.CellboundQuests?.runQuest2DFight?.({
    quest:TITLE,title:'Silas Vane',location:'The Manor Courtyard',
    ambience:'The iron gate locks behind the party. Silas drags the anchor into a wide stance as the Manor windows begin to glow.',
    presentationKind:'quest',phases:['Master of the Manor','No One Leaves','Home At Last'],
    enemies:[{name:'Silas Vane',maxHealth:3900}],eliteIndex:0,
    combat:{kind:'final',level:18,enemyTypes:['boss'],enemyHealth:3900,mechanicIntervalMs:4600,mechanics:[
      ['The Great Anchor','cone',2100],['Anchor Chain','line',1700],['Keelhaul','circles',1650],['The Great Anchor','cone',1850],['No One Leaves','circles',1550]
    ]},
    completeText:'Silas drops the anchor. The Manor doors answer with a sound from somewhere deep inside.'
  });
  if(!won){const r=ensureRoot();r.hidden=false;document.body.classList.add('nwb-open');renderSilasRetry();return}
  const n=ensure();n.silasDefeated=true;n.stage='ending';await save('Silas Vane was defeated in the Manor courtyard. A black iron key fell from his coat.');
  const r=ensureRoot();r.hidden=false;document.body.classList.add('nwb-open');renderEnding()
}
function renderSilasRetry(){
  root.innerHTML=chrome('BOSS FIGHT FAILED','Silas Still Stands',
    '<div class="nwb-retry"><span>⚓</span><div><small>THE GREAT ANCHOR</small><h3>The courtyard remains sealed.</h3><p>Silas’s wide anchor swings punish anyone caught inside the telegraph. Recover, review the fight and return when the party is ready.</p><button data-silas-retry>CHALLENGE SILAS AGAIN →</button></div></div>');
  bindClose();root.querySelector('[data-silas-retry]').onclick=startSilas
}
function renderEnding(){
  story('AFTER THE FIGHT','You Still Do Not Understand','Silas Vane',[
    'Silas falls to one knee. His eyes never leave the Manor.',
    '“You still do not understand.”',
    '“I did not need to survive.”',
    'He smiles.',
    '“I only needed to come home.”'
  ],async()=>{await completeQuest()},'TAKE THE KEY →')
}
async function completeQuest(){
  const n=ensure(),s=state();if(n.complete){renderComplete();return}
  n.manorKey=true;n.complete=true;n.stage='complete';n.completedAt=new Date().toISOString();
  s.progression=s.progression&&typeof s.progression==='object'?s.progression:{};
  s.progression.manorRaidUnlocked=true;s.progression.manorKey=true;
  s.activity=Array.isArray(s.activity)?s.activity:[];s.activity.push('Quest complete: No Way Back. The Manor raid attunement was unlocked.');
  await save('The Manor Key was recovered from Silas Vane. The Manor is now permanently attuned to this guild.');
  renderComplete()
}
function renderComplete(){
  root.innerHTML='<section class="nwb-complete"><div class="nwb-key">⚿</div><small>QUEST COMPLETE</small><h2>No Way Back</h2><p>The windows of the Manor ignite all at once. Its front doors open into darkness. Whatever Silas needed to wake is now awake.</p><div class="nwb-complete-rewards"><article><span>QUEST ITEM</span><b>THE MANOR KEY</b></article><article><span>ATTUNEMENT</span><b>PERMANENT</b></article></div><section><small>RAID UNLOCKED</small><h3>The Manor</h3><p>The black iron key is bound to your guild. Beyond the opened doors, the Manor is waiting.</p></section><button data-nwb-complete-close>RETURN TO QUEST JOURNAL →</button></section>';
  root.hidden=false;document.body.classList.add('nwb-open');root.querySelector('[data-nwb-complete-close]').onclick=()=>{close();Game.switchView?.('quests')}
}
function renderDetail(main,side){
  const n=ensure(),c=card(),req=prereqs();
  main.innerHTML='<div class="quest-v3-hero nwb-journal-hero"><div><small>RAID ATTUNEMENT · EPIC ADVENTURE</small><h2>No Way Back</h2><p>Silas Vane · Zeltira Harbour</p></div><span class="quest-v3-status '+(n.complete?'complete':'')+'">'+c.status+'</span></div>'+
    '<div class="quest-v3-story"><p>'+QUEST.summary+'</p></div>'+
    '<section class="quest-v3-clue"><small>'+(n.complete?'WHERE IT LED':'CURRENT OBJECTIVE')+'</small><h3>'+esc(n.complete?'The Manor':stageText(n))+'</h3><p>'+esc(n.complete?'Silas is dead, the Manor is awake, and the black iron key has permanently attuned your guild to the island raid.':'This quest remembers every permanent discovery. Failed voyages erase the hull and sail repairs, but never the route chart.')+'</p></section>'+
    (n.started?'<section class="nwb-journal-progress"><div class="'+(n.ropeSolved?'done':'')+'"><i>1</i><span><b>Mooring Lines</b><small>'+(n.ropeSolved?'Untangled':'Not complete')+'</small></span></div><div class="'+(repairStatus()===3||n.arrived?'done':'')+'"><i>2</i><span><b>Seaworthy</b><small>'+repairStatus()+' / 3 preparations</small></span></div><div class="'+(n.arrived?'done':'')+'"><i>3</i><span><b>The Crossing</b><small>'+(n.arrived?'Island reached':(n.wrecks?String(n.wrecks)+' failed crossing'+(n.wrecks===1?'':'s'):'Not attempted'))+'</small></span></div><div class="'+(n.houndsDefeated?'done':'')+'"><i>4</i><span><b>The Three Hounds</b><small>'+(n.houndsDefeated?'Defeated':'Waiting')+'</small></span></div><div class="'+(n.gatePicked?'done':'')+'"><i>5</i><span><b>The Manor Gate</b><small>'+(n.gatePicked?'Unlocked':'Locked')+'</small></span></div><div class="'+(n.silasDefeated?'done':'')+'"><i>6</i><span><b>Silas Vane</b><small>'+(n.silasDefeated?'Defeated':'Unknown')+'</small></span></div></section>':'')+
    '<div class="quest-detail-action">'+actionHtml(n,c)+'</div>';
  side.innerHTML='<section><small>ATTUNEMENT REQUIREMENT</small><div class="quest-requirements">'+req.map(x=>'<div class="quest-requirement '+(x[1]?'met':'')+'"><i>'+(x[1]?'✓':'•')+'</i><span>'+esc(x[0])+'</span></div>').join('')+'</div></section>'+
    '<section><small>QUEST ITEMS</small><div class="quest-reward-list"><p class="'+(n.mapSolved?'nwb-owned':'')+'">Manor Island Chart '+(n.mapSolved?'· RECORDED':'· NOT FOUND')+'</p><p class="'+(n.manorKey?'nwb-owned':'')+'">The Manor Key '+(n.manorKey?'· OWNED':'· UNKNOWN')+'</p></div></section>'+
    '<section><small>FAILURE RULE</small><div class="quest-reward-list"><p>The route chart survives a wreck.</p><p>Hull repair is lost after a failed crossing.</p><p>The torn sail must be repaired again.</p></div></section>'+
    '<section><small>REWARDS</small><div class="quest-reward-list">'+QUEST.rewards.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div></section>'+
    '<section><small>ADVENTURE JOURNAL</small><div class="quest-history">'+(n.history.slice(-7).reverse().map(h=>'<p>'+esc(h.text)+'</p>').join('')||'<p>The harbour is quiet.</p>')+'</div></section>'+
    devControls(n);
  bindDetail(main,side)
}
function actionHtml(n,c){
  if(n.complete)return'<div class="quest-complete-stamp">RAID ATTUNEMENT COMPLETE</div>';
  if(c.locked)return'<div class="quest-action-block locked"><b>LOCKED</b><small>Complete every current quest before Silas appears at the harbour.</small></div>';
  if(!n.started)return'<button class="quest-primary nwb-primary" data-nwb-start>MEET THE SAILOR →</button>';
  return'<button class="quest-primary nwb-primary" data-nwb-open>CONTINUE NO WAY BACK →</button>'
}
function devControls(n){
  if(!document.querySelector('#adminNav:not([hidden])'))return'';
  return'<section class="nwb-dev"><small>DEV TESTING</small><button data-nwb-dev-unlock>UNLOCK ATTUNEMENT QUEST</button><button data-nwb-dev-gold>GRANT 5,000 GOLD</button><button data-nwb-dev-boat>PREPARE BOAT</button></section>'
}
function bindDetail(main,side){
  main.querySelector('[data-nwb-start]')?.addEventListener('click',start);
  main.querySelector('[data-nwb-open]')?.addEventListener('click',open);
  side.querySelector('[data-nwb-dev-unlock]')?.addEventListener('click',async()=>{const n=ensure();n.devUnlocked=true;await save('Developer testing override enabled for No Way Back.');window.CellboundQuests?.render?.()});
  side.querySelector('[data-nwb-dev-gold]')?.addEventListener('click',async()=>{state().gold=(Number(state().gold)||0)+5000;await save('Developer testing: 5,000 gold granted.');notify('DEV TEST','5,000 gold granted','Use the Trading Post listing normally.')});
  side.querySelector('[data-nwb-dev-boat]')?.addEventListener('click',async()=>{const n=ensure();n.started=true;n.ropeSolved=true;n.repairKit=true;n.sailRepaired=true;n.mapSolved=true;n.stage='sailing';await save('Developer testing: the boat was prepared.');open()})
}
function renderTrading(){
  const host=$('#trading');if(!host||!Game?.ready)return;
  let mount=$('#nwbTradingListing');if(!mount){mount=document.createElement('div');mount.id='nwbTradingListing';mount.className='nwb-trading-mount';host.querySelector('.section-intro')?.insertAdjacentElement('afterend',mount)}
  const n=ensure();if(!n?.started||n.complete||n.repairKit||!['repairs','sailing'].includes(n.stage)){mount.innerHTML='';return}
  const gold=Number(state()?.gold)||0;
  mount.innerHTML='<article class="nwb-trade-listing"><div class="nwb-trade-art">▰<i>⚒</i></div><div><small>QUEST STOCK · ALWAYS AVAILABLE</small><h3>Shipwright’s Repair Kit</h3><p>Seasoned timber, pitch and iron nails. Enough to make Silas’s hull seaworthy for one crossing attempt.</p><span>Required for <b>No Way Back</b></span></div><div class="nwb-trade-price"><small>FIXED PRICE</small><b>5,000 GOLD</b><em>You have '+gold.toLocaleString()+'</em><button data-buy-repair '+(gold<5000?'disabled':'')+'>'+(gold<5000?'INSUFFICIENT GOLD':'BUY KIT →')+'</button></div></article>';
  mount.querySelector('[data-buy-repair]')?.addEventListener('click',async()=>{
    const s=state(),n=ensure();if(n.repairKit)return;if((Number(s.gold)||0)<5000){notify('TRADING POST','Not enough gold','The Shipwright’s Repair Kit costs 5,000 gold.');return}
    s.gold=Number(s.gold)-5000;n.repairKit=true;
    await save('A Shipwright’s Repair Kit was bought from the Trading Post for 5,000 gold and used to patch the hull.');
    notify('QUEST ITEM PURCHASED','Hull repaired','5,000 gold spent. Return to No Way Back.');
    renderTrading()
  })
}
function bind(){
  window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='trading')renderTrading()});
  document.querySelector('.nav-btn[data-view="trading"]')?.addEventListener('click',()=>setTimeout(renderTrading,30))
}
function init(){
  Game=window.CellboundGame;if(!Game?.ready||!window.CellboundQuests){setTimeout(init,120);return}
  ensure();bind();renderTrading();
  window.CellboundNoWayBack={card,renderDetail,homeState,open,ensure,start,renderTrading,available};
  window.CellboundQuests.render?.()
}
init();
})();