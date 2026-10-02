(()=>{
'use strict';

const STORAGE_KEY='cellbound-owner-dungeon-generator-v1';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const slug=v=>String(v||'dungeon').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'dungeon';
const splitList=v=>String(v||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean);
let draft=null;
let activeOutput='brief';
let opened=false;

function makeAbility(n=1){
  return {name:'Ability '+n,target:'',telegraph:'',effect:'',response:'',fx:''};
}
function makeScene(type='combat',index=1){
  return {
    id:'scene-'+Date.now().toString(36)+'-'+index,
    name:'',
    type,
    purpose:type==='boss'?'Boss encounter':'Combat encounter',
    environment:'',
    arenaShape:'wide',
    entry:'left',
    exit:'right',
    floor:'',
    background:'',
    foreground:'',
    props:'',
    blocked:'',
    enemies:'',
    animations:'',
    tank:'',
    dps:'',
    healer:'',
    interrupt:'',
    movement:'',
    special:'',
    bossName:'',
    bossFantasy:'',
    bossSize:'large',
    phaseTransition:'',
    heroic:'',
    cellboundPlus:'',
    abilities:type==='boss'?[makeAbility(1),makeAbility(2),makeAbility(3)]:[]
  };
}
function freshDraft(){
  return {
    version:1,
    basics:{name:'',episode:'Episode 1',number:'',level:'15',normalIlvl:'',heroicIlvl:'',cellboundIlvl:'',unlock:''},
    identity:{concept:'',theme:'',location:'',time:'',mood:'',architecture:'',lighting:'',palette:'',recurring:'',avoid:''},
    story:{reason:'',conflict:'',antagonist:'',result:''},
    loot:{normal:'',heroic:'',cellboundPlus:'',rareName:'',rareSource:'',rareChance:'',rarePurpose:'',completionMessage:'',nextUnlock:''},
    scenes:[makeScene('combat',1),makeScene('boss',2)],
    generated:null,
    updatedAt:new Date().toISOString()
  };
}
function loadDraft(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return freshDraft();
    const parsed=JSON.parse(raw);
    if(!parsed||parsed.version!==1||!Array.isArray(parsed.scenes))return freshDraft();
    parsed.scenes.forEach((s,i)=>{
      s.abilities=Array.isArray(s.abilities)?s.abilities:[];
      if(s.type==='boss'&&!s.abilities.length)s.abilities=[makeAbility(1)];
      if(!s.id)s.id='scene-'+Date.now().toString(36)+'-'+i;
    });
    return parsed;
  }catch{return freshDraft()}
}
function saveDraft(show=true){
  draft.updatedAt=new Date().toISOString();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(draft));
  if(show)setMessage('Draft saved on this device.','ok');
}
function isOwner(){
  return Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner';
}
function syncAccess(){
  const entry=$('#dungeonGeneratorEntry'),mount=$('#dungeonGeneratorMount');
  const owner=isOwner();
  if(entry)entry.hidden=!owner;
  if(!owner&&mount){mount.hidden=true;opened=false}
}
function field(label,path,value,opts={}){
  const type=opts.type||'text';
  const note=opts.note?'<small>'+esc(opts.note)+'</small>':'';
  const required=opts.required?' <em>REQUIRED</em>':'';
  if(type==='textarea'){
    return '<label class="dg-field dg-span-'+(opts.span||1)+'"><span>'+esc(label)+required+'</span><textarea data-dg-path="'+esc(path)+'" rows="'+(opts.rows||3)+'" placeholder="'+esc(opts.placeholder||'')+'">'+esc(value)+'</textarea>'+note+'</label>';
  }
  if(type==='select'){
    const options=(opts.options||[]).map(x=>{
      const val=typeof x==='string'?x:x.value,txt=typeof x==='string'?x:x.label;
      return '<option value="'+esc(val)+'" '+(String(value)===String(val)?'selected':'')+'>'+esc(txt)+'</option>';
    }).join('');
    return '<label class="dg-field dg-span-'+(opts.span||1)+'"><span>'+esc(label)+required+'</span><select data-dg-path="'+esc(path)+'">'+options+'</select>'+note+'</label>';
  }
  return '<label class="dg-field dg-span-'+(opts.span||1)+'"><span>'+esc(label)+required+'</span><input data-dg-path="'+esc(path)+'" type="'+esc(type)+'" value="'+esc(value)+'" placeholder="'+esc(opts.placeholder||'')+'"'+(opts.min!==undefined?' min="'+opts.min+'"':'')+'>'+note+'</label>';
}
function scenePath(i,key){return 'scenes.'+i+'.'+key}
function abilityPath(i,a,key){return 'scenes.'+i+'.abilities.'+a+'.'+key}
function sceneCard(scene,i){
  const typeOptions=[
    {value:'combat',label:'Combat'},
    {value:'elite',label:'Elite'},
    {value:'boss',label:'Boss'},
    {value:'event',label:'Event / Puzzle'}
  ];
  let abilities='';
  if(scene.type==='boss'){
    abilities='<section class="dg-boss-block"><div class="dg-subhead"><div><small>BOSS BUILDER</small><h4>'+esc(scene.bossName||'Unnamed Boss')+'</h4></div><button type="button" data-dg-add-ability="'+i+'">+ ADD ABILITY</button></div>'+
      '<div class="dg-grid">'+
      field('Boss name',scenePath(i,'bossName'),scene.bossName,{required:true})+
      field('Boss fantasy / role',scenePath(i,'bossFantasy'),scene.bossFantasy,{placeholder:'Siege captain, void beast, corrupted king…'})+
      field('Boss size',scenePath(i,'bossSize'),scene.bossSize,{type:'select',options:['normal','large','huge']})+
      field('Phase transition',scenePath(i,'phaseTransition'),scene.phaseTransition,{span:2,placeholder:'At 50% HP the arena changes…'})+
      '</div><div class="dg-ability-list">'+
      scene.abilities.map((ab,a)=>'<article class="dg-ability"><div class="dg-ability-head"><b>ABILITY '+(a+1)+'</b><button type="button" data-dg-remove-ability="'+i+':'+a+'" aria-label="Remove ability '+(a+1)+'">×</button></div><div class="dg-grid">'+
        field('Name',abilityPath(i,a,'name'),ab.name,{required:true})+
        field('Target',abilityPath(i,a,'target'),ab.target,{placeholder:'Tank / random / party / area'})+
        field('Telegraph',abilityPath(i,a,'telegraph'),ab.telegraph,{placeholder:'Red cone, expanding ring…'})+
        field('Effect',abilityPath(i,a,'effect'),ab.effect,{placeholder:'Damage, knockback, add spawn…'})+
        field('Response',abilityPath(i,a,'response'),ab.response,{placeholder:'Move, interrupt, stack, spread…'})+
        field('Visual FX',abilityPath(i,a,'fx'),ab.fx,{placeholder:'Lightning strike, falling masonry…'})+
      '</div></article>').join('')+
      '</div><div class="dg-grid">'+
      field('Heroic change',scenePath(i,'heroic'),scene.heroic,{type:'textarea',span:2,rows:2,placeholder:'What changes on Heroic?'})+
      field('Cellbound+ change',scenePath(i,'cellboundPlus'),scene.cellboundPlus,{type:'textarea',span:2,rows:2,placeholder:'What overlaps or becomes advanced?'})+
      '</div></section>';
  }
  return '<article class="dg-scene" data-dg-scene="'+i+'">'+
    '<div class="dg-scene-head"><div><small>SCENE '+(i+1)+'</small><h3>'+esc(scene.name||'Unnamed scene')+'</h3><span data-dg-scene-status="'+i+'"></span></div><div class="dg-scene-actions">'+
    '<button type="button" data-dg-move="'+i+':-1" '+(i===0?'disabled':'')+' aria-label="Move scene up">↑</button>'+
    '<button type="button" data-dg-move="'+i+':1" '+(i===draft.scenes.length-1?'disabled':'')+' aria-label="Move scene down">↓</button>'+
    '<button type="button" data-dg-duplicate="'+i+'">DUPLICATE</button>'+
    '<button type="button" data-dg-remove-scene="'+i+'" '+(draft.scenes.length<=1?'disabled':'')+'>REMOVE</button>'+
    '</div></div>'+
    '<div class="dg-grid">'+
      field('Scene name',scenePath(i,'name'),scene.name,{required:true})+
      field('Encounter type',scenePath(i,'type'),scene.type,{type:'select',options:typeOptions,required:true})+
      field('Purpose',scenePath(i,'purpose'),scene.purpose,{span:2,placeholder:'What should this encounter accomplish?'})+
    '</div>'+
    '<div class="dg-scene-layout">'+
      '<div class="dg-scene-fields"><div class="dg-section-label">ART & ARENA</div><div class="dg-grid">'+
        field('Environment',scenePath(i,'environment'),scene.environment,{type:'textarea',span:2,rows:3,required:true,placeholder:'Where exactly does this fight happen?'})+
        field('Arena shape',scenePath(i,'arenaShape'),scene.arenaShape,{type:'select',options:['wide','circular','corridor','narrow','split','irregular'],required:true})+
        field('Floor / combat space',scenePath(i,'floor'),scene.floor,{placeholder:'Dusty road, stone floor, metal gantry…'})+
        field('Party entry',scenePath(i,'entry'),scene.entry,{type:'select',options:['left','right','top','bottom'],required:true})+
        field('Party exit',scenePath(i,'exit'),scene.exit,{type:'select',options:['left','right','top','bottom'],required:true})+
        field('Background',scenePath(i,'background'),scene.background,{type:'textarea',span:2,rows:2,placeholder:'What sits behind the combat floor?'})+
        field('Foreground',scenePath(i,'foreground'),scene.foreground,{type:'textarea',span:2,rows:2,placeholder:'Optional foreground depth elements'})+
        field('Major props',scenePath(i,'props'),scene.props,{type:'textarea',span:2,rows:2,placeholder:'Barrels, pillars, machinery, carts…'})+
        field('Blocked areas',scenePath(i,'blocked'),scene.blocked,{type:'textarea',span:2,rows:2,placeholder:'Walls, props and areas characters cannot enter'})+
        field('Environmental animation',scenePath(i,'animations'),scene.animations,{type:'textarea',span:2,rows:2,placeholder:'Dust, flames, sparks, moving signs…'})+
      '</div></div>'+
      '<aside class="dg-arena-preview"><small>SCENE MAP</small><div class="dg-map dg-entry-'+esc(scene.entry)+' dg-exit-'+esc(scene.exit)+'"><span class="dg-map-back">BACKGROUND</span><span class="dg-map-entry">ENTRY</span><span class="dg-map-floor">COMBAT AREA<br><em>'+esc(scene.arenaShape||'arena')+'</em></span><span class="dg-map-exit">EXIT</span><span class="dg-map-front">FOREGROUND</span></div><p>Art prompt and collision rules are generated from these scene fields.</p></aside>'+
    '</div>'+
    '<div class="dg-section-label">COMBAT DIRECTION</div><div class="dg-grid">'+
      field('Enemies',scenePath(i,'enemies'),scene.enemies,{type:'textarea',span:2,rows:2,placeholder:'2 Gunslingers, 1 Enforcer…'})+
      field('Tank mechanic',scenePath(i,'tank'),scene.tank,{placeholder:'Heavy hit, positioning, add pickup…'})+
      field('DPS mechanic',scenePath(i,'dps'),scene.dps,{placeholder:'Interrupt, priority add, burst window…'})+
      field('Healer mechanic',scenePath(i,'healer'),scene.healer,{placeholder:'Party damage, dispel, healing reduction…'})+
      field('Interrupt',scenePath(i,'interrupt'),scene.interrupt,{placeholder:'Ability or none'})+
      field('Movement mechanic',scenePath(i,'movement'),scene.movement,{placeholder:'Spread, charge, safe zone…'})+
      field('Special mechanic',scenePath(i,'special'),scene.special,{span:2,placeholder:'Anything unique to this scene'})+
    '</div>'+abilities+
  '</article>';
}
function setPath(path,value){
  const parts=path.split('.');
  let obj=draft;
  for(let i=0;i<parts.length-1;i++){
    const key=/^\d+$/.test(parts[i])?Number(parts[i]):parts[i];
    obj=obj[key];
    if(obj==null)return;
  }
  const last=/^\d+$/.test(parts[parts.length-1])?Number(parts[parts.length-1]):parts[parts.length-1];
  obj[last]=value;
  draft.generated=null;
}
function getPath(path){
  return path.split('.').reduce((obj,key)=>obj?.[/^\d+$/.test(key)?Number(key):key],draft);
}
function validate(){
  const errors=[];
  const req=[
    ['basics.name','Dungeon name'],
    ['basics.episode','Episode'],
    ['identity.concept','One-sentence concept'],
    ['identity.theme','Theme'],
    ['identity.location','Location']
  ];
  req.forEach(([path,label])=>{if(!String(getPath(path)||'').trim())errors.push(label+' is missing.')});
  if(!draft.scenes.length)errors.push('Add at least one scene.');
  if(!draft.scenes.some(s=>s.type==='boss'))errors.push('Add at least one boss scene.');
  draft.scenes.forEach((s,i)=>{
    const p='Scene '+(i+1);
    if(!String(s.name||'').trim())errors.push(p+' needs a name.');
    if(!String(s.environment||'').trim())errors.push(p+' needs an environment.');
    if(!String(s.entry||'').trim()||!String(s.exit||'').trim())errors.push(p+' needs entry and exit directions.');
    if(s.type==='boss'){
      if(!String(s.bossName||'').trim())errors.push(p+' needs a boss name.');
      if(!s.abilities.some(a=>String(a.name||'').trim()))errors.push(p+' needs at least one boss ability.');
    }
  });
  return errors;
}
function sceneReady(s){
  return Boolean(String(s.name||'').trim()&&String(s.environment||'').trim()&&String(s.entry||'').trim()&&String(s.exit||'').trim()&&(s.type!=='boss'||String(s.bossName||'').trim()));
}
function updateStatus(){
  const errors=validate();
  const status=$('#dgStatus'),generate=$('#dgGenerate'),missing=$('#dgMissing');
  if(status){
    const ready=draft.scenes.filter(sceneReady).length;
    status.innerHTML='<b>'+ready+' / '+draft.scenes.length+' scenes ready</b><span>'+(errors.length?errors.length+' required item'+(errors.length===1?'':'s')+' missing':'Ready to generate')+'</span>';
    status.dataset.tone=errors.length?'warn':'ok';
  }
  if(generate)generate.disabled=Boolean(errors.length);
  if(missing){
    missing.hidden=!errors.length;
    missing.innerHTML=errors.length?'<b>FINISH BEFORE GENERATING</b><ul>'+errors.slice(0,8).map(x=>'<li>'+esc(x)+'</li>').join('')+(errors.length>8?'<li>+'+(errors.length-8)+' more</li>':'')+'</ul>':'';
  }
  draft.scenes.forEach((s,i)=>{
    const el=document.querySelector('[data-dg-scene-status="'+i+'"]');
    if(el){el.textContent=sceneReady(s)?'READY':'INCOMPLETE';el.dataset.ready=sceneReady(s)?'1':'0'}
  });
}
function artPrompt(scene){
  const id=draft.identity;
  const parts=[
    'Cellbound fantasy cartoon battle environment.',
    id.theme&&('Theme: '+id.theme+'.'),
    id.location&&('Location: '+id.location+'.'),
    id.time&&('Time: '+id.time+'.'),
    id.mood&&('Mood: '+id.mood+'.'),
    id.architecture&&('Architecture and materials: '+id.architecture+'.'),
    id.lighting&&('Lighting: '+id.lighting+'.'),
    id.palette&&('Colour direction: '+id.palette+'.'),
    scene.environment&&('Scene: '+scene.environment+'.'),
    scene.floor&&('Combat floor: '+scene.floor+'.'),
    scene.background&&('Background: '+scene.background+'.'),
    scene.foreground&&('Foreground depth: '+scene.foreground+'.'),
    scene.props&&('Edge props: '+scene.props+'.'),
    id.recurring&&('Recurring dungeon details: '+id.recurring+'.'),
    'Use the standard Combat Reborn slightly elevated 2.5D battle perspective.',
    'Keep a clearly readable '+(scene.arenaShape||'open')+' combat arena with the party entering from the '+scene.entry+' and leaving through the '+scene.exit+'.',
    scene.blocked&&('Keep these elements outside the walkable combat space: '+scene.blocked+'.'),
    'No characters, enemies, UI, text, nameplates or combat telegraphs baked into the artwork.',
    'Strong foreground, midground and background separation. 16:9.',
    id.avoid&&('Do not resemble: '+id.avoid+'.')
  ].filter(Boolean);
  return parts.join(' ');
}
function classifyAnimation(text){
  const lower=text.toLowerCase();
  if(/dust|smoke|fog|sparks|steam|rain|snow|lightning|fire|flame|embers|particles|cloud/.test(lower))return'engine-fx';
  return'separate-animated-prop';
}
function artAssets(scene){
  const assets=[{type:'battle-background',required:true,prompt:artPrompt(scene)}];
  if(String(scene.foreground||'').trim())assets.push({type:'foreground-overlay',required:false,description:scene.foreground});
  splitList(scene.animations).forEach(a=>assets.push({type:classifyAnimation(a),required:false,description:a}));
  return assets;
}
const COMBAT_STANDARD={
  engine:'Combat Reborn',
  version:'shared-v1',
  formation:'Tank front; melee close and naturally spread; ranged and healer remain behind.',
  collision:'Use shared character collision and scene blocked zones. Never allow characters through major scenery or outside arena bounds.',
  movement:'Use shared target pursuit, facing and repositioning. No dungeon-specific movement engine.',
  sceneEntry:'Camera establishes room, party enters from defined entry, forms up, enemies engage.',
  sceneExit:'Combat ends, timers clean up, party regroups and moves toward the defined exit.',
  camera:'Keep active combat readable and camera inside scene artwork; no black edges.',
  telegraphs:'Avoidable mechanics use warning, reaction window, impact and visible result.',
  ui:'Use shared Combat Reborn HP, casts, buffs, debuffs, meters and results.',
  responsive:'Must remain usable on iPhone, iPad and desktop.',
  reducedMotion:'Environmental motion and optional camera effects respect Reduced Motion.',
  cleanup:'Destroy encounter timers, listeners, particles and scene-only effects on exit or wipe.'
};
function configObject(){
  const dungeonId=slug(draft.basics.name);
  return {
    schema:'cellbound-dungeon-generator-v1',
    generatedAt:new Date().toISOString(),
    dungeon:{
      id:dungeonId,
      name:draft.basics.name,
      episode:draft.basics.episode,
      number:draft.basics.number,
      level:Number(draft.basics.level)||15,
      requirements:{
        normalItemLevel:Number(draft.basics.normalIlvl)||0,
        heroicItemLevel:Number(draft.basics.heroicIlvl)||0,
        cellboundPlusItemLevel:Number(draft.basics.cellboundIlvl)||0,
        unlock:draft.basics.unlock
      },
      identity:{...draft.identity},
      story:{...draft.story},
      loot:{...draft.loot}
    },
    combatStandard:{...COMBAT_STANDARD},
    scenes:draft.scenes.map((s,i)=>({
      id:slug(s.name||('scene-'+(i+1))),
      order:i+1,
      name:s.name,
      type:s.type,
      purpose:s.purpose,
      arena:{
        shape:s.arenaShape,
        entry:s.entry,
        exit:s.exit,
        floor:s.floor,
        blocked:splitList(s.blocked)
      },
      art:{
        environment:s.environment,
        background:s.background,
        foreground:s.foreground,
        props:splitList(s.props),
        animations:splitList(s.animations),
        prompt:artPrompt(s),
        assets:artAssets(s)
      },
      combat:{
        enemies:splitList(s.enemies),
        roleMechanics:{tank:s.tank,dps:s.dps,healer:s.healer},
        interrupt:s.interrupt,
        movement:s.movement,
        special:s.special
      },
      boss:s.type==='boss'?{
        name:s.bossName,
        fantasy:s.bossFantasy,
        size:s.bossSize,
        phaseTransition:s.phaseTransition,
        heroic:s.heroic,
        cellboundPlus:s.cellboundPlus,
        abilities:s.abilities.map(a=>({...a}))
      }:null
    }))
  };
}
function buildBrief(){
  const lines=[];
  lines.push('# '+draft.basics.name.toUpperCase());
  lines.push('');
  lines.push('## DUNGEON CONFIGURATION');
  lines.push('Episode: '+draft.basics.episode);
  lines.push('Dungeon number: '+(draft.basics.number||'—'));
  lines.push('Recommended level: '+(draft.basics.level||'—'));
  lines.push('Item level: Normal '+(draft.basics.normalIlvl||'—')+' / Heroic '+(draft.basics.heroicIlvl||'—')+' / Cellbound+ '+(draft.basics.cellboundIlvl||'—'));
  lines.push('Unlock: '+(draft.basics.unlock||'None specified'));
  lines.push('');
  lines.push('Concept: '+draft.identity.concept);
  lines.push('Theme: '+draft.identity.theme);
  lines.push('Location: '+draft.identity.location);
  lines.push('Mood: '+(draft.identity.mood||'—'));
  lines.push('Visual direction: '+[draft.identity.architecture,draft.identity.lighting,draft.identity.palette].filter(Boolean).join(' | '));
  lines.push('');
  lines.push('## STORY');
  lines.push('Why the party enters: '+(draft.story.reason||'—'));
  lines.push('Conflict: '+(draft.story.conflict||'—'));
  lines.push('Antagonist: '+(draft.story.antagonist||'—'));
  lines.push('Result: '+(draft.story.result||'—'));
  lines.push('');
  lines.push('## ROUTE');
  lines.push(draft.scenes.map((s,i)=>(i+1)+'. '+s.name+' ['+s.type.toUpperCase()+']').join('\n'));
  draft.scenes.forEach((s,i)=>{
    lines.push('');
    lines.push('## SCENE '+(i+1)+' — '+s.name);
    lines.push('Type: '+s.type);
    lines.push('Purpose: '+(s.purpose||'—'));
    lines.push('Environment: '+s.environment);
    lines.push('Arena: '+s.arenaShape+' | Entry '+s.entry+' | Exit '+s.exit);
    lines.push('Floor: '+(s.floor||'—'));
    lines.push('Background: '+(s.background||'—'));
    lines.push('Foreground: '+(s.foreground||'—'));
    lines.push('Props: '+(s.props||'—'));
    lines.push('Blocked areas: '+(s.blocked||'—'));
    lines.push('Environmental animation: '+(s.animations||'—'));
    lines.push('Enemies: '+(s.enemies||'—'));
    lines.push('Tank: '+(s.tank||'—'));
    lines.push('DPS: '+(s.dps||'—'));
    lines.push('Healer: '+(s.healer||'—'));
    lines.push('Interrupt: '+(s.interrupt||'—'));
    lines.push('Movement: '+(s.movement||'—'));
    lines.push('Special: '+(s.special||'—'));
    if(s.type==='boss'){
      lines.push('');
      lines.push('### BOSS — '+s.bossName);
      lines.push('Fantasy: '+(s.bossFantasy||'—')+' | Size: '+s.bossSize);
      s.abilities.forEach((a,n)=>{
        lines.push('Ability '+(n+1)+': '+a.name+' | Target: '+(a.target||'—')+' | Telegraph: '+(a.telegraph||'—')+' | Effect: '+(a.effect||'—')+' | Response: '+(a.response||'—')+' | FX: '+(a.fx||'—'));
      });
      lines.push('Phase transition: '+(s.phaseTransition||'—'));
      lines.push('Heroic: '+(s.heroic||'—'));
      lines.push('Cellbound+: '+(s.cellboundPlus||'—'));
    }
    lines.push('');
    lines.push('### ART PROMPT');
    lines.push(artPrompt(s));
  });
  lines.push('');
  lines.push('## LOOT & COMPLETION');
  lines.push('Normal: '+(draft.loot.normal||'—'));
  lines.push('Heroic: '+(draft.loot.heroic||'—'));
  lines.push('Cellbound+: '+(draft.loot.cellboundPlus||'—'));
  lines.push('Rare: '+([draft.loot.rareName,draft.loot.rareSource,draft.loot.rareChance,draft.loot.rarePurpose].filter(Boolean).join(' | ')||'—'));
  lines.push('Completion: '+(draft.loot.completionMessage||'—'));
  lines.push('Next unlock: '+(draft.loot.nextUnlock||'—'));
  lines.push('');
  lines.push('## COMBAT REBORN STANDARD — AUTOMATIC');
  Object.entries(COMBAT_STANDARD).forEach(([k,v])=>lines.push('- '+k+': '+v));
  return lines.join('\n');
}
function buildArtManifest(){
  const lines=['# '+draft.basics.name+' — ART MANIFEST',''];
  draft.scenes.forEach((s,i)=>{
    lines.push('## '+(i+1)+'. '+s.name);
    lines.push('BACKGROUND PROMPT');
    lines.push(artPrompt(s));
    lines.push('');
    lines.push('ASSETS');
    artAssets(s).forEach(a=>lines.push('- '+a.type+(a.description?' — '+a.description:'')));
    lines.push('');
    lines.push('COMBAT LAYOUT');
    lines.push('- Arena: '+s.arenaShape);
    lines.push('- Entry: '+s.entry);
    lines.push('- Exit: '+s.exit);
    lines.push('- Blocked: '+(s.blocked||'None specified'));
    lines.push('');
  });
  return lines.join('\n');
}
function generate(){
  const errors=validate();
  if(errors.length){updateStatus();setMessage('Finish the required fields first.','error');return}
  draft.generated={
    brief:buildBrief(),
    config:JSON.stringify(configObject(),null,2),
    art:buildArtManifest()
  };
  saveDraft(false);
  renderOutput();
  setMessage('Dungeon package generated. Review the brief, game config and art manifest.','ok');
  $('#dgOutput')?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function renderOutput(){
  const root=$('#dgOutput');if(!root)return;
  if(!draft.generated){
    root.innerHTML='<div class="dg-output-empty"><b>Nothing generated yet.</b><span>Complete the required fields, then generate the dungeon package.</span></div>';
    return;
  }
  const value=draft.generated[activeOutput]||'';
  root.innerHTML='<div class="dg-output-tabs" role="tablist">'+
    '<button type="button" data-dg-output="brief" class="'+(activeOutput==='brief'?'active':'')+'">BUILD BRIEF</button>'+
    '<button type="button" data-dg-output="config" class="'+(activeOutput==='config'?'active':'')+'">GAME CONFIG</button>'+
    '<button type="button" data-dg-output="art" class="'+(activeOutput==='art'?'active':'')+'">ART MANIFEST</button>'+
    '</div><div class="dg-output-actions"><button type="button" data-dg-copy>COPY</button><button type="button" data-dg-download>DOWNLOAD</button></div>'+
    '<textarea id="dgOutputText" readonly aria-label="Generated dungeon output">'+esc(value)+'</textarea>';
  bindOutput();
}
function bindOutput(){
  const root=$('#dgOutput');if(!root)return;
}
function setMessage(text,tone='ok'){
  const el=$('#dgMessage');if(!el)return;
  el.hidden=false;el.textContent=text;el.dataset.tone=tone;
}
async function copyOutput(){
  const text=draft.generated?.[activeOutput]||'';
  if(!text)return;
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
    else throw new Error('clipboard unavailable');
    setMessage('Copied.','ok');
  }catch{
    const area=$('#dgOutputText');if(area){area.focus();area.select();document.execCommand?.('copy')}
    setMessage('Output selected for copying.','ok');
  }
}
function downloadOutput(){
  const text=draft.generated?.[activeOutput]||'';if(!text)return;
  const ext=activeOutput==='config'?'json':'md';
  const blob=new Blob([text],{type:activeOutput==='config'?'application/json':'text/markdown'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=slug(draft.basics.name)+'-'+activeOutput+'.'+ext;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function render(){
  const root=$('#dungeonGeneratorMount');if(!root||!isOwner())return;
  root.innerHTML=
  '<div class="dg-shell">'+
    '<header class="dg-header"><div><small>OWNER TOOL · COMBAT REBORN</small><h2>Dungeon Generator</h2><p>Fill in the dungeon-specific boxes. Shared Combat Reborn, scene, camera, collision, responsive and cleanup rules are attached automatically.</p></div><div id="dgStatus" class="dg-status"></div></header>'+
    '<div class="dg-toolbar"><button type="button" id="dgSave">SAVE DRAFT</button><button type="button" id="dgReset">NEW DUNGEON</button><button type="button" id="dgClose">CLOSE GENERATOR</button></div>'+
    '<section class="dg-panel"><div class="dg-panel-head"><div><small>1 · DUNGEON SETUP</small><h3>Identity & Requirements</h3></div><span>Fill once · inherited by every scene</span></div><div class="dg-grid">'+
      field('Dungeon name','basics.name',draft.basics.name,{required:true,placeholder:'The Iron Kingdom'})+
      field('Episode','basics.episode',draft.basics.episode,{required:true})+
      field('Dungeon number','basics.number',draft.basics.number,{type:'number',min:1})+
      field('Recommended level','basics.level',draft.basics.level,{type:'number',min:1})+
      field('Normal item level','basics.normalIlvl',draft.basics.normalIlvl,{type:'number',min:0})+
      field('Heroic item level','basics.heroicIlvl',draft.basics.heroicIlvl,{type:'number',min:0})+
      field('Cellbound+ item level','basics.cellboundIlvl',draft.basics.cellboundIlvl,{type:'number',min:0})+
      field('Unlock requirement','basics.unlock',draft.basics.unlock,{placeholder:'Quest, level or story flag'})+
    '</div></section>'+
    '<section class="dg-panel"><div class="dg-panel-head"><div><small>2 · ART DIRECTION</small><h3>Dungeon Visual Identity</h3></div><span>Used to generate every scene art prompt</span></div><div class="dg-grid">'+
      field('One-sentence concept','identity.concept',draft.identity.concept,{type:'textarea',span:2,rows:2,required:true,placeholder:'A besieged medieval kingdom collapsing under Cell corruption.'})+
      field('Theme','identity.theme',draft.identity.theme,{required:true,placeholder:'Medieval castle'})+
      field('Location','identity.location',draft.identity.location,{required:true,placeholder:'Fortified mountain kingdom'})+
      field('Time / weather','identity.time',draft.identity.time,{placeholder:'Stormy dusk'})+
      field('Mood','identity.mood',draft.identity.mood,{placeholder:'Besieged, tense, heroic'})+
      field('Architecture / materials','identity.architecture',draft.identity.architecture,{type:'textarea',span:2,rows:2,placeholder:'Heavy stone keeps, iron gates, banners, siege damage…'})+
      field('Lighting','identity.lighting',draft.identity.lighting,{placeholder:'Cold dusk with warm firelight'})+
      field('Colour direction','identity.palette',draft.identity.palette,{placeholder:'Stone grey, iron, muted red banners'})+
      field('Recurring details','identity.recurring',draft.identity.recurring,{type:'textarea',span:2,rows:2,placeholder:'Cell-powered siege devices, royal crest, cracked masonry…'})+
      field('Must not resemble','identity.avoid',draft.identity.avoid,{span:2,placeholder:'Other dungeons or visual themes to avoid'})+
    '</div></section>'+
    '<section class="dg-panel"><div class="dg-panel-head"><div><small>3 · STORY</small><h3>Why This Dungeon Exists</h3></div></div><div class="dg-grid">'+
      field('Why the party enters','story.reason',draft.story.reason,{type:'textarea',span:2,rows:2})+
      field('Main conflict','story.conflict',draft.story.conflict,{type:'textarea',span:2,rows:2})+
      field('Who / what is responsible','story.antagonist',draft.story.antagonist,{type:'textarea',span:2,rows:2})+
      field('What changes after victory','story.result',draft.story.result,{type:'textarea',span:2,rows:2})+
    '</div></section>'+
    '<section class="dg-panel dg-scenes-panel"><div class="dg-panel-head"><div><small>4 · ROUTE & COMBAT</small><h3>Combat Scenes</h3></div><div class="dg-add-scene"><button type="button" data-dg-add-scene="combat">+ COMBAT</button><button type="button" data-dg-add-scene="boss">+ BOSS</button><button type="button" data-dg-add-scene="event">+ EVENT</button></div></div><div id="dgScenes">'+draft.scenes.map(sceneCard).join('')+'</div></section>'+
    '<section class="dg-panel"><div class="dg-panel-head"><div><small>5 · REWARDS</small><h3>Loot & Completion</h3></div></div><div class="dg-grid">'+
      field('Normal loot','loot.normal',draft.loot.normal,{type:'textarea',span:2,rows:2})+
      field('Heroic loot','loot.heroic',draft.loot.heroic,{type:'textarea',span:2,rows:2})+
      field('Cellbound+ loot','loot.cellboundPlus',draft.loot.cellboundPlus,{type:'textarea',span:2,rows:2})+
      field('Rare drop name','loot.rareName',draft.loot.rareName)+
      field('Rare source','loot.rareSource',draft.loot.rareSource)+
      field('Rare drop chance','loot.rareChance',draft.loot.rareChance,{placeholder:'10%'})+
      field('Rare purpose','loot.rarePurpose',draft.loot.rarePurpose)+
      field('Completion message','loot.completionMessage',draft.loot.completionMessage,{type:'textarea',span:2,rows:2})+
      field('Next content unlocked','loot.nextUnlock',draft.loot.nextUnlock,{span:2})+
    '</div></section>'+
    '<section class="dg-generate-panel"><div><small>6 · GENERATE</small><h3>Build the Dungeon Package</h3><p>The output contains the editable brief, structured game config and a scene-by-scene art manifest.</p></div><button id="dgGenerate" type="button">GENERATE DUNGEON</button></section>'+
    '<div id="dgMissing" class="dg-missing" hidden></div>'+
    '<p id="dgMessage" class="dg-message" hidden aria-live="polite"></p>'+
    '<section class="dg-panel"><div class="dg-panel-head"><div><small>OUTPUT</small><h3>Generated Package</h3></div><span>Nothing is added to live dungeons automatically</span></div><div id="dgOutput"></div></section>'+
  '</div>';
  bindRoot();
  renderOutput();
  updateStatus();
}
function bindRoot(){
  const root=$('#dungeonGeneratorMount');if(!root)return;
  root.querySelectorAll('[data-dg-path]').forEach(el=>{
    el.addEventListener('input',()=>{
      setPath(el.dataset.dgPath,el.value);
      if(el.dataset.dgPath.endsWith('.name')){
        const m=el.dataset.dgPath.match(/^scenes\.(\d+)\.name$/);if(m){const h=root.querySelector('[data-dg-scene="'+m[1]+'"] h3');if(h)h.textContent=el.value||'Unnamed scene'}
      }
      updateStatus();
    });
    el.addEventListener('change',()=>{
      const m=el.dataset.dgPath.match(/^scenes\.(\d+)\.type$/);
      if(m){
        const i=Number(m[1]),s=draft.scenes[i];
        if(s.type==='boss'&&!s.abilities.length)s.abilities=[makeAbility(1)];
        render();
      }
      updateStatus();
    });
  });
  root.querySelectorAll('[data-dg-add-scene]').forEach(btn=>btn.addEventListener('click',()=>{
    draft.scenes.push(makeScene(btn.dataset.dgAddScene,draft.scenes.length+1));draft.generated=null;render();
  }));
  root.querySelectorAll('[data-dg-remove-scene]').forEach(btn=>btn.addEventListener('click',()=>{
    const i=Number(btn.dataset.dgRemoveScene);if(draft.scenes.length<=1)return;
    draft.scenes.splice(i,1);draft.generated=null;render();
  }));
  root.querySelectorAll('[data-dg-duplicate]').forEach(btn=>btn.addEventListener('click',()=>{
    const i=Number(btn.dataset.dgDuplicate),copy=JSON.parse(JSON.stringify(draft.scenes[i]));
    copy.id='scene-'+Date.now().toString(36)+'-'+i;copy.name=copy.name?copy.name+' Copy':'';
    draft.scenes.splice(i+1,0,copy);draft.generated=null;render();
  }));
  root.querySelectorAll('[data-dg-move]').forEach(btn=>btn.addEventListener('click',()=>{
    const [a,b]=btn.dataset.dgMove.split(':').map(Number),to=a+b;
    if(to<0||to>=draft.scenes.length)return;
    const [scene]=draft.scenes.splice(a,1);draft.scenes.splice(to,0,scene);draft.generated=null;render();
  }));
  root.querySelectorAll('[data-dg-add-ability]').forEach(btn=>btn.addEventListener('click',()=>{
    const i=Number(btn.dataset.dgAddAbility);draft.scenes[i].abilities.push(makeAbility(draft.scenes[i].abilities.length+1));draft.generated=null;render();
  }));
  root.querySelectorAll('[data-dg-remove-ability]').forEach(btn=>btn.addEventListener('click',()=>{
    const [i,a]=btn.dataset.dgRemoveAbility.split(':').map(Number);
    if(draft.scenes[i].abilities.length<=1)return;
    draft.scenes[i].abilities.splice(a,1);draft.generated=null;render();
  }));
  root.querySelectorAll('[data-dg-output]').forEach(btn=>btn.addEventListener('click',()=>{activeOutput=btn.dataset.dgOutput;renderOutput()}));
  root.querySelector('[data-dg-copy]')?.addEventListener('click',copyOutput);
  root.querySelector('[data-dg-download]')?.addEventListener('click',downloadOutput);
  $('#dgSave')?.addEventListener('click',()=>saveDraft(true));
  $('#dgReset')?.addEventListener('click',()=>{
    if(!confirm('Start a new dungeon? The current local draft will be replaced.'))return;
    draft=freshDraft();saveDraft(false);render();setMessage('New dungeon draft created.','ok');
  });
  $('#dgClose')?.addEventListener('click',close);
  $('#dgGenerate')?.addEventListener('click',generate);
}
function open(){
  if(!isOwner())return;
  const mount=$('#dungeonGeneratorMount');if(!mount)return;
  opened=true;mount.hidden=false;render();mount.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function close(){
  const mount=$('#dungeonGeneratorMount');if(mount)mount.hidden=true;
  opened=false;
}
function bindEntry(){
  $('#openDungeonGenerator')?.addEventListener('click',open);
}
function init(){
  draft=loadDraft();
  bindEntry();
  syncAccess();
  window.addEventListener('cellbound:admin-status',()=>{syncAccess();if(opened&&isOwner())render()});
  window.addEventListener('cellbound:view-changed',e=>{
    if(e.detail?.view==='admin'){syncAccess();if(opened&&isOwner())render()}
  });
}
window.CellboundDungeonGenerator={
  open,
  close,
  isOwner,
  getDraft:()=>isOwner()?JSON.parse(JSON.stringify(draft||freshDraft())):null,
  validate:()=>isOwner()?validate():['Owner access required.'],
  generateConfig:()=>isOwner()?configObject():null,
  artPrompt:scene=>isOwner()?artPrompt(scene):''
};
init();
})();