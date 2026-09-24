(()=>{
'use strict';
const VERSION='1.3.1';
const BOSSES={
  'vaultheart':{
    dungeon:'The Ashen Vault',name:'The Vaultheart',title:'The Living Core Beneath the Vault',theme:'ashen',artwork:'./assets/bosses/ashen-vault-vaultheart.webp',
    description:'Buried beneath the Ashen Vault is something the old forge was built to contain. The Vaultheart floods the chamber with unstable Cell energy while fractures tear open around the party.',
    abilities:[
      {icon:'area',name:'Core Pulse',text:'A powerful area blast forces the party away from unstable ground.'},
      {icon:'adds',name:'Fracture Spawn',text:'Temporal fractures open and release additional enemies into the chamber.'},
      {icon:'line',name:'Rupture Beam',text:'A dangerous line attack cuts directly through the arena.'},
      {icon:'phase',name:'Core Collapse',text:'The chamber destabilises as the Vaultheart reaches its final stage.'}
    ],
    intel:[['MOVEMENT','Watch the arena'],['ADDS','Control Fracture Spawns'],['SURVIVAL','Heavy final-phase pressure']]
  },
  'bound-choir':{
    dungeon:'The Hollow Sanctum',name:'The Bound Choir',title:'Voices Chained Beneath Zeltira',theme:'hollow',artwork:'./assets/bosses/hollow-sanctum-bound-choir.webp',
    description:'The deepest shrine contains no single creature. Souls have been bound into blackglass and forced to sing as one. Their resonance turns the chamber itself into a weapon.',
    abilities:[
      {icon:'area',name:'Resonance Collapse',text:'A growing blast punishes anyone caught within the marked area.'},
      {icon:'interrupt',name:'Shattering Hymn',text:'A dangerous cast that should be interrupted before the hymn completes.'},
      {icon:'adds',name:'Echo Choir',text:'Additional voices manifest and add pressure to the encounter.'},
      {icon:'phase',name:'Resonant Pressure',text:'The Choir becomes more dangerous as the chamber fills with energy.'}
    ],
    intel:[['INTERRUPT','Shattering Hymn'],['ADDS','Control Echo Choir'],['POSITIONING','Avoid resonance zones']]
  },
  'vorran':{
    dungeon:'Chaos Canyon',name:'Archdruid Vorran',title:'Master of the Living Canyon',theme:'chaos',artwork:'./assets/bosses/chaos-canyon-vorran.webp',
    description:'The architect of Chaos Canyon waits inside its living heart. Vorran commands the canyon itself, steadily crushing the battlefield inward while restoring his own strength whenever the party gives him the opportunity.',
    abilities:[
      {icon:'heal',name:'Rejuvenation',text:'Vorran heals himself. Interrupt it quickly or lose valuable progress.'},
      {icon:'phase',name:'The Canyon Closes',text:'The usable arena begins shrinking as Vorran loses health.'},
      {icon:'area',name:'Roots Close In',text:'The battlefield contracts again, forcing the party closer together.'},
      {icon:'danger',name:'True Chaos',text:'At low health, attacks become more dangerous with very little safe ground.'}
    ],
    intel:[['INTERRUPT','Rejuvenation'],['POSITIONING','Arena continually shrinks'],['COOLDOWNS','Save power for True Chaos']]
  },
  'vex-calder':{
    dungeon:'Blackout Station',name:'Dr. Vex Calder',title:'Architect of the Blackout',theme:'blackout',artwork:'./assets/bosses/blackout-station-calder.webp',
    description:'With the station powered again, Calder finally reveals himself inside the generator hall. He turns the restored grid against the party, forcing every role to survive the very system they repaired.',
    abilities:[
      {icon:'roles',name:'Role Circuits',text:'Tank, healer and damage roles must move into the correct coloured circuit.'},
      {icon:'phase',name:'Power Instability',text:'The station begins failing as Calder pushes the grid beyond its limits.'},
      {icon:'area',name:'Shockwave',text:'A devastating electrical surge tears across the generator hall.'},
      {icon:'danger',name:'Overcharge',text:'Earlier decisions within the station can increase Calder\'s combat power.'}
    ],
    intel:[['POSITIONING','Respect Role Circuits'],['MOVEMENT','React to Shockwaves'],['SURVIVAL','Grid pressure increases']]
  },
  'old-man':{
    dungeon:'The Fractured Ages',name:'The Old Man',title:'Keeper of Ages',theme:'fractured',artwork:'./assets/bosses/fractured-ages-old-man.webp',
    description:'Every fracture has led here. The Old Man waits inside a place that belongs to no age, surrounded by five figures who should never have existed together.',
    abilities:[
      {icon:'control',name:"Keeper's Gambit",text:'The Old Man manipulates the fight rather than following ordinary combat rules.'},
      {icon:'adds',name:'Five Against Five',text:'The party must face an entire enemy group rather than a single boss.'},
      {icon:'phase',name:'Fractured Reality',text:'The Funhouse shifts around the combatants as the encounter progresses.'},
      {icon:'unknown',name:'???',text:'No information available.'}
    ],
    intel:[['TARGETS','Five hostile combatants'],['CONTROL','Expect multiple threats'],['UNKNOWN','Final phase unrecorded']]
  },
  'three-hounds':{
    dungeon:'No Way Back',name:'The Three Hounds',title:'Guardians of the Manor Grounds',theme:'manor',artwork:'./assets/bosses/no-way-back-three-hounds.webp?v=2',
    encounterLabel:'BOSS ENCOUNTER',artLabel:'FIRST BOSS',beginLabel:'ENGAGE THE THREE HOUNDS →',
    description:'Silas whistles once. Grim, Fang and Wail emerge from the Manor grounds as a single hunting pack. Killing one too early only gives the others time to bring it back.',
    abilities:[
      {icon:'heal',name:'Licked Wounds',text:'A fallen Hound is revived at 35% health if another remains alive for 12 seconds.'},
      {icon:'control',name:'Pack Bond',text:'Treat the three health pools as one problem. Balance damage before committing to the first kill.'},
      {icon:'danger',name:'Bonebreaker · Pounce · Howl',text:'Each Hound pressures the party differently while you manage the shared kill window.'},
      {icon:'targets',name:'Live Target Switching',text:'Call Grim, Fang or Wail as the party focus during the fight to control their health precisely.'}
    ],
    intel:[['TARGETS','Balance all three health pools'],['KILL WINDOW','12 seconds after first death'],['REVIVE','Returns at 35% health']]
  },
  'silas-vane':{
    dungeon:'No Way Back',name:'Silas Vane',title:'Master of the Manor',theme:'manor',artwork:'./assets/bosses/no-way-back-silas-vane.webp?v=2',
    encounterLabel:'FINAL BOSS',artLabel:'FINAL ENCOUNTER',beginLabel:'FACE SILAS VANE →',
    description:'The old sailor is gone. Beneath the open coat is the crest of House Vane, and in his hands is an anchor heavy enough to turn the entire courtyard into a weapon.',
    abilities:[
      {icon:'area',name:'The Great Anchor',text:'A huge sweeping attack covers a wide section of the courtyard. Move before the swing lands.'},
      {icon:'line',name:'Anchor Chain',text:'Silas hurls his anchor chain toward a distant target and drags the fight out of position.'},
      {icon:'danger',name:'Keelhaul',text:'A brutal tank-focused strike creates sustained pressure that the healer must stabilise.'},
      {icon:'phase',name:'No One Leaves',text:'Silas becomes increasingly aggressive as the fight closes in on its final phase.'}
    ],
    intel:[['MOVEMENT','Respect The Great Anchor'],['POSITIONING','Recover after Anchor Chain'],['SURVIVAL','Pressure rises near defeat']]
  }
};
const ICONS={area:'◎',adds:'◇',line:'↗',phase:'◈',interrupt:'!',heal:'+',danger:'▲',roles:'◆',control:'⌁',targets:'◎',unknown:'?'};
let active=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function prefs(){
  const game=window.CellboundGame,state=game?.getState?.();if(!state)return null;
  const p=state.bossDossiers&&typeof state.bossDossiers==='object'?state.bossDossiers:(state.bossDossiers={});
  p.seen=p.seen&&typeof p.seen==='object'?p.seen:{};
  p.skip=p.skip&&typeof p.skip==='object'?p.skip:{};
  return p
}
function mark(id,skip){
  const p=prefs();if(!p)return;
  p.seen[id]=true;p.skip[id]=Boolean(skip);
  window.CellboundGame?.save?.()
}
function remove(){
  if(active?.isConnected)active.remove();active=null;
  document.body.classList.remove('cbd-open')
}
function art(cfg){
  const img=cfg.artwork?'<img class="cbd-art-image" src="'+esc(cfg.artwork)+'" alt="'+esc(cfg.name)+'" onerror="this.hidden=true;this.nextElementSibling.hidden=false">':'';
  return '<div class="cbd-art" data-cbd-boss="'+esc(Object.keys(BOSSES).find(k=>BOSSES[k]===cfg)||'boss')+'">'+img+
   '<div class="cbd-art-fallback" '+(cfg.artwork?'hidden':'')+' aria-hidden="true"><div class="cbd-art-depth"></div><div class="cbd-art-sigil"></div><div class="cbd-art-figure"><i></i><i></i><i></i></div><div class="cbd-art-fx"><i></i><i></i><i></i><i></i></div></div>'+
   '<div class="cbd-art-label"><small>'+esc(cfg.artLabel||'FINAL ENCOUNTER')+'</small><b>'+esc(cfg.name)+'</b></div></div>'
}
function full(id,cfg,options={}){
  return new Promise(resolve=>{
    remove();
    const root=document.createElement('div');root.className='cbd-backdrop theme-'+cfg.theme;root.dataset.boss=id;
    const abilities=cfg.abilities.map(a=>'<article class="cbd-ability"><i>'+esc(ICONS[a.icon]||'•')+'</i><div><b>'+esc(a.name)+'</b><span>'+esc(a.text)+'</span></div></article>').join('');
    const intel=cfg.intel.map(x=>'<span><small>'+esc(x[0])+'</small><b>'+esc(x[1])+'</b></span>').join('');
    root.innerHTML='<section class="cbd-shell">'+
      '<div class="cbd-visual">'+art(cfg)+'</div>'+
      '<div class="cbd-copy"><header><small>'+esc(cfg.dungeon.toUpperCase())+' · '+esc(cfg.encounterLabel||'FINAL BOSS')+'</small><h1>'+esc(cfg.name)+'</h1><em>'+esc(cfg.title)+'</em><p>'+esc(cfg.description)+'</p></header>'+
      '<section class="cbd-skills"><small>SIGNATURE ABILITIES</small><div>'+abilities+'</div></section>'+
      '<section class="cbd-intel"><small>PARTY INTEL</small><div>'+intel+'</div></section>'+
      '<footer><label class="cbd-skip-pref"><input type="checkbox" data-cbd-future checked><span>Skip the full briefing on future runs</span></label><div class="cbd-actions"><button type="button" data-cbd-skip>SKIP</button><button type="button" class="primary" data-cbd-begin>'+esc(cfg.beginLabel||'BEGIN ENCOUNTER →')+'</button></div></footer></div>'+
      '</section>';
    document.body.appendChild(root);active=root;document.body.classList.add('cbd-open');
    const complete=async()=>{
      const skipFuture=Boolean(root.querySelector('[data-cbd-future]')?.checked);mark(id,skipFuture);
      root.classList.add('leaving');await wait(reduce()?20:220);remove();resolve(true)
    };
    root.querySelector('[data-cbd-begin]').addEventListener('click',complete,{once:true});
    root.querySelector('[data-cbd-skip]').addEventListener('click',complete,{once:true});
    requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('ready')))
  })
}
async function stinger(id,cfg){
  remove();
  const root=document.createElement('div');root.className='cbd-stinger theme-'+cfg.theme;root.dataset.boss=id;
  root.innerHTML='<div><small>'+esc(cfg.encounterLabel||'FINAL BOSS')+'</small><h2>'+esc(cfg.name)+'</h2><span>ENTERING ENCOUNTER</span></div>';
  document.body.appendChild(root);active=root;document.body.classList.add('cbd-open');
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('ready')));
  await wait(reduce()?180:1050);root.classList.add('leaving');await wait(reduce()?20:180);remove();return true
}
async function show(id,options={}){
  const cfg=BOSSES[id];if(!cfg)return true;
  const p=prefs(),seen=Boolean(p?.seen?.[id]),skip=p?.skip?.[id]===true;
  if(!options.forceFull&&seen&&skip)return stinger(id,cfg);
  return full(id,cfg,options)
}
function reset(id){
  const p=prefs();if(!p)return false;
  if(id){delete p.seen[id];delete p.skip[id]}else{p.seen={};p.skip={}}
  window.CellboundGame?.save?.();return true
}
window.CellboundBossDossier={VERSION,show,reset,bosses:BOSSES};
})();