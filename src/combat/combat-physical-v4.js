(()=>{
'use strict';
/* Shared living presentation. All state comes from the authoritative event stream.
 * No combat outcomes, paths, HP, resources or target choices are calculated here. */
const FX=window.CellboundCombatFX=window.CellboundCombatFX||{};
const baseMount=FX.mount?.bind(FX), baseEvent=FX.combatEvent?.bind(FX);
const ARENA='.cb2d-arena,.quest-cb2d-arena,.wb2d-arena,.pvp2d-arena,#tbArena';
const UNIT='.cb2d-unit,.quest-cb2d-unit,.wb2d-unit,.pvp2d-unit,.tb-unit,.cbl-pet';
const scenes=new Map();
const now=()=>window.CellboundCombatAnimation?.now?.()??performance.now();
const motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)'),reduce=()=>motionPreference?.matches;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PROFILES={
 'class-warrior':{name:'Warrior',accent:'#C69B6D',motion:'heavy',projectile:'steel',cast:'brace',lunge:12,recoil:1.18,travel:245},
 'class-paladin':{name:'Paladin',accent:'#F48CBA',motion:'radiant',projectile:'holy',cast:'radiant',lunge:9,recoil:1.08,travel:280},
 'class-priest':{name:'Priest',accent:'#FFFFFF',motion:'support',projectile:'holy',cast:'holy',lunge:3,recoil:.92,travel:310},
 'class-druid':{name:'Druid',accent:'#FF7C0A',motion:'fluid',projectile:'nature',cast:'nature',lunge:5,recoil:.96,travel:300},
 'class-hunter':{name:'Hunter',accent:'#AAD372',motion:'marksman',projectile:'arrow',cast:'aim',lunge:2,recoil:.96,travel:225},
 'class-rogue':{name:'Rogue',accent:'#FFF468',motion:'dart',projectile:'blade',cast:'quick',lunge:15,recoil:.82,travel:210},
 'class-mage':{name:'Mage',accent:'#3FC7EB',motion:'caster',projectile:'arcane',cast:'arcane',lunge:2,recoil:.90,travel:300},
 'class-death-knight':{name:'Death Knight',accent:'#C41E3A',motion:'brutal',projectile:'death',cast:'death',lunge:11,recoil:1.22,travel:280},
 'class-demon-hunter':{name:'Demon Hunter',accent:'#A330C9',motion:'rush',projectile:'fel',cast:'fel',lunge:17,recoil:.78,travel:215},
 'class-evoker':{name:'Evoker',accent:'#33937F',motion:'breath',projectile:'emerald',cast:'essence',lunge:4,recoil:.94,travel:285},
 'class-monk':{name:'Monk',accent:'#00FF98',motion:'flow',projectile:'chi',cast:'chi',lunge:12,recoil:.84,travel:240},
 'class-shaman':{name:'Shaman',accent:'#0070DD',motion:'storm',projectile:'lightning',cast:'storm',lunge:4,recoil:.96,travel:235},
 'class-warlock':{name:'Warlock',accent:'#8788EE',motion:'occult',projectile:'shadow',cast:'shadow',lunge:2,recoil:.94,travel:315}
};
const ENEMY={name:'Enemy',accent:'#EF5C50',motion:'enemy',projectile:'hostile',cast:'hostile',lunge:10,recoil:1.08,travel:275};


const ENEMY_PROFILES={
 boss:{...ENEMY,motion:'brutal',lunge:9,recoil:1.3},
 elite:{...ENEMY,motion:'heavy',lunge:10,recoil:1.15},
 ranged:{...ENEMY,motion:'marksman',lunge:2,projectile:'steel'},
 caster:{...ENEMY,motion:'occult',lunge:2,projectile:'shadow'},
 add:{...ENEMY,motion:'dart',lunge:7,recoil:.8},
 fast:{...ENEMY,motion:'rush',lunge:15,recoil:.75},
 bruiser:{...ENEMY,motion:'heavy',lunge:12,recoil:1.2},
 healer:{...ENEMY,motion:'support',projectile:'holy',lunge:2}
};
function enemyProfile(u,data){
 if(!u||u.p.name!=='Enemy'||(!data.visualArchetype&&!data.classification&&data.attackRange==null))return;
 const key=data.visualArchetype|| (Number(data.attackRange)>7?(data.damageType==='magic'?'caster':'ranged'):data.classification==='world-boss'?'boss':data.classification);
 u.p=ENEMY_PROFILES[key]||ENEMY;u.el.dataset.motion=u.p.motion;
}
// Cosmetic room dressing and mechanic presentation share the same lifecycle as units.
const THEMES={
 manor:{props:['window','candle','table','candle','window','table'],accent:'#d9ba82'},
 ashen:{props:['furnace','grate','crack','furnace','grate','crack'],accent:'#e9924e'},
 hollow:{props:['pillar','rune','tomb','pillar','rune','tomb'],accent:'#91b8d0'},
 chaos:{props:['rock','root','rock','root','rock','root'],accent:'#a1bd81'},
 blackout:{props:['machine','cable','grate','machine','cable','grate'],accent:'#85c6dd'},
 fractured:{props:['pillar','rune','rock','pillar','rune','rock'],accent:'#b3a3d6'},
 world:{props:['rock','root','rock','root','rock','root'],accent:'#a7b79c'}
};
const PROP_PATHS={
 window:'M8 55V20Q30 -8 52 20V55ZM30 6V55M8 29H52',candle:'M12 48H48M20 48V22H25V48M35 48V16H40V48M22 16Q16 8 22 3Q28 9 22 16M37 10Q31 4 37 0Q43 5 37 10',
 table:'M4 15H56V43H4ZM10 43V57M50 43V57M18 25H31V34H18',furnace:'M5 58V10H55V58ZM14 48V30Q30 8 46 30V48ZM23 46V33M36 46V29',
 grate:'M4 8H56V52H4ZM14 8V52M24 8V52M36 8V52M46 8V52M4 30H56',crack:'M5 5L29 20L22 31L47 44L55 59M22 31L7 40M47 44L47 22',
 pillar:'M12 3H48V12H12ZM18 12H42V49H18ZM10 49H50V58H10',rune:'M30 3L55 17V43L30 57L5 43V17ZM30 13L45 40H15ZM30 13V50',
 tomb:'M10 55V13Q30 -2 50 13V55ZM30 16V40M20 25H40',rock:'M4 44L9 18L31 3L53 20L57 48L32 58ZM9 18L35 25L31 3M35 25L32 58',
 root:'M30 58L29 34L13 17L3 15M29 34L46 17L55 17M29 34L34 8L45 2M13 17L15 3',machine:'M7 8H53V53H7ZM15 16H45V31H15ZM17 42H22M32 42H45M17 53V60M45 53V60',
 cable:'M0 5H18V25H42V48H60M0 13H10V33H34V56H60'
};
function room(scene,e){
 if(scene?.arena?.dataset?.bespokeBattlefield==='1'){
   scene.room?.remove?.();scene.room=null;delete scene.arena.dataset.room;return
 }
 const name=String(e?.payload?.encounter||'').toLowerCase();
 const theme=scene.arena.classList.contains('theme-manor')||/manor|butler|maid|engineer/.test(name)?'manor':scene.arena.dataset.cbvfxTheme||'world';
 const key=THEMES[theme]?theme:theme.startsWith('fractured')?'fractured':'world';
 if(scene.room?.isConnected&&scene.room.dataset.room===key)return;
 scene.room?.remove();const n=document.createElement('div');n.className='cbl-room';n.dataset.room=key;n.setAttribute('aria-hidden','true');
 n.style.setProperty('--room-accent',THEMES[key].accent);
 THEMES[key].props.forEach((prop,i)=>{const el=document.createElement('div');el.className='cbl-prop '+prop;el.style.left=(i<3?3:94)+'%';el.style.top=(16+(i%3)*33)+'%';el.innerHTML='<svg viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="2"><path d="'+PROP_PATHS[prop]+'"/></svg>';n.appendChild(el)});
 scene.arena.prepend(n);scene.room=n;scene.arena.dataset.room=key;
}
function emphasis(scene,kind){
 if(reduce()){scene.camera?.cancel();scene.camera=null;return}
 if(now()<(scene.emphasisUntil||0))return;
 scene.emphasisUntil=now()+2500;scene.camera?.cancel();
 // A sub-percent emphasis leaves the full arena in frame and never follows a unit.
 scene.camera=scene.arena.animate([{scale:1},{scale:.996,offset:.35},{scale:1}],{duration:kind==='death'?950:650,easing:'ease-out'});
}
function hazard(scene,e){
 const id=String(e.payload?.hazardId||'');if(!id)return;
 if(e.type==='GROUND_HAZARD_EXPIRED'){const h=scene.hazards.get(id);if(h){h.node.remove();scene.hazards.delete(id);scene.spatialDirty=true}return}
 if(e.type!=='GROUND_HAZARD_SPAWNED'||!e.position)return;
 scene.hazards.get(id)?.node.remove();
 const n=document.createElement('div');n.className='cbl-hazard';n.dataset.hazardId=id;n.dataset.phase='active';n.setAttribute('aria-label',String(e.ability||'Ground hazard')+' — active');
 const radius=Math.max(0,Number(e.payload.radius)||0);
 n.style.left=e.position.x+'%';n.style.top=e.position.y+'%';n.style.width=radius*2+'%';n.style.height=radius*2+'%';
 if(/plate|porcelain/i.test(e.ability||''))n.classList.add('porcelain');
 if(/collapse|beam|debris|floor/i.test(e.ability||''))n.classList.add('rubble');
 scene.arena.appendChild(n);scene.spatialDirty=true;scene.hazards.set(id,{node:n,position:{...e.position},radius,end:now()+(Number(e.payload.duration)||10000)/scene.speed});
}
function totem(scene,e){
 const id=String(e.payload?.totemId||'');if(!id)return;
 if(e.type==='TOTEM_EXPIRED'){const old=scene.totems.get(id);if(old){old.remove();scene.totems.delete(id)}return}
 if(e.type!=='TOTEM_PLACED'||!e.position)return;
 scene.totems.get(id)?.remove();
 const type=String(e.payload?.totemType||'totem').replace(/[^a-z0-9-]/gi,'-').toLowerCase();
 const n=document.createElement('div');n.className='cbl-totem '+type;n.dataset.totemId=id;n.dataset.totemType=type;n.setAttribute('aria-label',String(e.ability||'Shaman totem'));
 n.style.left=clamp(Number(e.position.x),0,100)+'%';n.style.top=clamp(Number(e.position.y),0,100)+'%';
 const core=document.createElement('i'),rune=document.createElement('b'),label=document.createElement('span');
 label.textContent=String(e.ability||'Totem').replace(/ Totem$/,'');n.append(core,rune,label);scene.arena.appendChild(n);scene.totems.set(id,n)
}
// One invisible, artwork-aligned fighting floor for every shared combat view.
// Room editors can override it with presentation.bounds or data-fighting-area.
function fightingGeometry(scene,width,height,count=scene.units.size){
 const S=window.CellboundCombatSpatial;if(!S)return null;
 const arena=scene.arena,context=(String(arena.className?.baseVal||arena.className||'')+' '+String(arena.closest?.('.cbcombat-shell')?.className||'')+' '+String(arena.dataset.cinematicTheme||arena.dataset.cbvfxTheme||'')).toLowerCase();
 let theme=arena.dataset.cinematicTheme||arena.dataset.cbvfxTheme||'shared';
 if(arena.matches?.('#tbArena,.tb-arena'))theme='twelve';
 else if(arena.matches?.('.cbpvp-stage,.pvp2d-arena,[data-pvp-unit-stage]'))theme='pvp';
 else if(arena.matches?.('.cc2d-arena'))theme='chaos';
 else if(arena.matches?.('.hs2d-arena'))theme='hollow';
 else if(arena.matches?.('.bs-arena,#bsArena'))theme='blackout';
 else if(arena.matches?.('.wb2d-arena'))theme='world';
 else if(/fractured|high-noon|iron-kingdom|first-kingdom|silent-frontier|funhouse|fa-(?:high|iron|first|silent)/.test(context))theme='fractured';
 else if(/manor|butler|maid|engineer|attic/.test(context))theme='manor';
 else if(/null-complex|theme-null|room-null/.test(context))theme='null';
 else if(arena.matches?.('.quest-cb2d-arena,#q2dArena'))theme='quest';
 else for(const name of ['ashen','hollow','chaos','blackout','twelve','world'])if(context.includes(name)){theme=name;break}
 const env=scene.spatialEnvironment||{},presentation=env.presentation||{},authored=env.bounds||{};
 // Authored walkable polygons already describe actual ground; do not substitute
 // a generic floor that might cut through a room designer's valid path.
 const floor=env.walkable?.length>=3?{left:4,right:96,top:12,bottom:91}:S.fightingArea(theme,count);
 const finite=(v,fallback)=>v==null||!Number.isFinite(Number(v))?fallback:Number(v);
 let bounds={left:Math.max(floor.left,finite(authored.left,4)),right:Math.min(floor.right,finite(authored.right,96)),
  top:Math.max(floor.top,finite(authored.top,12)),bottom:Math.min(floor.bottom,finite(authored.bottom,95))};
 if(bounds.right-bounds.left<12||bounds.bottom-bounds.top<16)bounds={left:finite(authored.left,4),right:finite(authored.right,96),top:finite(authored.top,12),bottom:finite(authored.bottom,95)};
 const manual=String(arena.dataset.fightingArea||'').split(',').map(Number);
 if(manual.length===4&&manual.every(Number.isFinite)&&manual[1]-manual[0]>=12&&manual[3]-manual[2]>=16&&manual.every(v=>v>=0&&v<=100))
  bounds={left:manual[0],right:manual[1],top:manual[2],bottom:manual[3]};
 if(presentation.bounds)bounds={...bounds,...presentation.bounds};
 return S.geometry(width,height,{...env,...presentation,bounds});
}
function petObject(scene,e){
 const id=String(e.payload?.petId||e.target||'');if(!id)return;
 if(e.type==='PET_DISMISSED'){
  const old=scene.pets.get(id);if(old){const u=scene.units.get(old);u?.animation?.cancel();clearCast(u);scene.units.delete(old);old.remove();scene.pets.delete(id);scene.spatialDirty=true}
  return
 }
 if(e.type!=='PET_SUMMONED'||!e.position)return;
 const existing=scene.pets.get(id);if(existing){scene.units.delete(existing);existing.remove()}
 const type=String(e.payload?.petType||'demon').replace(/[^a-z0-9-]/gi,'-').toLowerCase(),ownerClass=String(e.payload?.ownerClass||'Warlock'),ownerKey=ownerClass.toLowerCase().replace(/[^a-z0-9]+/g,'-'),n=document.createElement('div');
 n.className='cbl-pet class-'+ownerKey+' '+type;n.dataset.unit=id;n.dataset.petType=type;n.dataset.owner=String(e.payload?.ownerId||e.source||'');
 n.setAttribute('aria-label',String(e.payload?.name||e.ability||(ownerClass==='Death Knight'?'Undead minion':'Warlock demon')));
 const body=document.createElement('i');body.className='cbl-pet-body';body.appendChild(document.createElement('b'));
 const label=document.createElement('span');label.className='cbl-pet-name';label.textContent=String(e.payload?.name||e.ability||'Demon');
 n.append(body,label);scene.arena.appendChild(n);scene.pets.set(id,n);
 const owner=scene.units.get(resolve(e.payload?.ownerId||e.source,{},scene.arena));
 const S=window.CellboundCombatSpatial,width=scene.arena.clientWidth,height=scene.arena.clientHeight;
 // A freshly inserted .cbl-pet has CSS left:0/top:0. Seed it beside its
 // Hunter/summoner *inside the floor* before the first animation frame so
 // it never materialises from the top-left or slides in from off-screen.
 if(S&&width>0&&height>0){
  const p=owner?.spatial?.visual&&scene.spatialWidth&&scene.spatialHeight?
   {x:owner.spatial.visual.x/scene.spatialWidth*100,y:owner.spatial.visual.y/scene.spatialHeight*100}:
   owner?.position||e.position;
  const beside=Math.max(4,Math.min(9,32/width*100))*(Number(p.x)>50?-1:1);
  const candidate={x:clamp(Number(p.x)+beside,0,100)*width/100,y:clamp(Number(p.y)+4,0,100)*height/100};
  const floor=fightingGeometry(scene,width,height,scene.units.size+1);
  const point=S.safePoint(candidate,{rx:20,ry:20,head:36,foot:14},floor);
  n.style.setProperty('left',(point.x/width*100).toFixed(3)+'%','important');
  n.style.setProperty('top',(point.y/height*100).toFixed(3)+'%','important');
  n.style.setProperty('transform','translate(-50%,-50%)','important');
 }
 const u=unit(scene,n);u.spatialMeta={id,role:'pet',team:owner?.spatialMeta?.team||owner?.spatial?.team||'party'};u.engagementTarget=e.payload?.targetId;setPosition(scene,u,e.position);state(u,'idle');framing(scene)
}
function mechanic(scene,e,opts={}){
 const token=e.payload?.token;if(token==null)return;scene.spatialDirty=true;
 if(e.type==='MECHANIC_TELEGRAPH'){
  const old=scene.warnings.get(token);if(old){old.callout?.remove();for(const n of old.markers)n.remove()}
  const type=String(e.payload?.mechanicType||'mechanic').replace(/[^a-z0-9-]/gi,'-').toLowerCase();
  const entry={start:now(),duration:Math.max(1,Number(e.payload.duration)||1000)/scene.speed,nodes:[],markers:[],source:e.source,type,callout:null};scene.warnings.set(token,entry);
  const callout=document.createElement('div');callout.className='cbl-mechanic-callout';callout.dataset.phase='incoming';callout.dataset.mechanicType=type;callout.style.setProperty('--warning-left','1');
  const title=document.createElement('strong');title.textContent=String(e.ability||'Boss mechanic');const kind=document.createElement('span');kind.textContent=type.replace(/-/g,' ').toUpperCase();
  callout.append(title,kind);scene.arena.appendChild(callout);entry.callout=callout;
  const ids=[...new Set([e.target,...(Array.isArray(e.payload?.targetIds)?e.payload.targetIds:[])].filter(Boolean))];
  if(ids.length<=5)for(const id of ids){
   const el=resolve(id,opts,scene.arena);if(!el)continue;
   const marker=document.createElement('i');marker.className='cbl-mechanic-marker '+type;marker.dataset.phase='incoming';marker.setAttribute('aria-hidden','true');
   el.appendChild(marker);el.dataset.mechanicTarget=type;entry.markers.push(marker)
  }
  // Existing adapters retain exact cone/line/puzzle geometry; tag their new nodes after event delivery.
  const before=new Set(scene.arena.querySelectorAll('.cb2d-tg,.quest-cb2d-telegraph,.tb-telegraph'));
  requestAnimationFrame(()=>{if(scene.warnings.get(token)!==entry)return;scene.arena.querySelectorAll('.cb2d-tg,.quest-cb2d-telegraph,.tb-telegraph').forEach(n=>{if(!before.has(n)){n.dataset.phase='incoming';entry.nodes.push(n)}})});
 }else{
  const entry=scene.warnings.get(token);if(!entry)return;
  const phase=e.result==='interrupted'||e.result==='avoided'?'safe':'impact';
  for(const n of entry.nodes)n.dataset.phase=phase;
  for(const n of entry.markers){n.dataset.phase=phase;const owner=n.parentElement;if(owner?.dataset?.mechanicTarget===entry.type)delete owner.dataset.mechanicTarget;setTimeout(()=>n.remove(),phase==='safe'?260:420)}
  if(entry.callout){entry.callout.dataset.phase=phase;setTimeout(()=>entry.callout?.remove(),phase==='safe'?260:520)}
  scene.warnings.delete(token);
 }
}
function framing(scene,reposition=false){
 const count=[...scene.units.values()].filter(u=>!u.dead).length;
 scene.arena.dataset.density=count>20?'crowded':count>10?'raid':'party';
 // Preserve normalized authoritative positions through rotation and split-screen resizing.
 if(reposition)for(const u of scene.units.values())if(u.position)setPosition(scene,u,u.position);
}
function actor(el){return el?.querySelector('.cb-combat-portrait,.cb-combat-boss-portrait,.cb-combat-monster-portrait,.pvp2d-token,.wb2d-unit-dot')||el?.querySelector(':scope > i:first-child')||el}
function profile(el){return Object.entries(PROFILES).find(([key])=>el.classList.contains(key))?.[1]||ENEMY}
function resolve(id,opts,arena){
 if(!id)return null;
 const custom=opts.resolve?.(id);if(custom)return (Array.isArray(custom)?custom[0]:custom)?.el||(Array.isArray(custom)?custom[0]:custom);
 const safe=CSS.escape(String(id));
 return arena.querySelector('[data-cbl-combat-id="'+safe+'"],[data-unit="'+safe+'"],[data-q-unit="'+safe+'"],[data-tb-unit="'+safe+'"],[data-pvp2d-unit="'+safe+'"],[data-combat-id="'+safe+'"],[data-unit-key="'+safe+'"]')||
 (String(id).startsWith('tb-')?arena.querySelector('[data-tb-boss="'+CSS.escape(String(id).slice(3))+'"]'):null)||
 (id==='boss'?arena.querySelector('#wb2dBoss'):null)
}

/* Stable battle focus and a short, event-driven explanation of the action.
 * Does not change targeting, damage, simulation or animation playback. */
function clarityLabel(u){
 if(!u?.el)return'';
 const label=u.el.querySelector(':scope > span:not(.cb-combat-portrait):not(.cb-combat-boss-portrait):not(.cb-combat-monster-portrait)');
 return String(label?.childNodes?.[0]?.textContent||label?.textContent||u.spatialMeta?.name||u.p?.name||'').trim().replace(/\s+/g,' ').slice(0,45);
}
function clarityDescriptor(e,u,t){
 if(!e)return null;
 const actor=clarityLabel(u)||'Enemy',ability=String(e.ability||'').trim().slice(0,50);
 if(e.type==='CAST_START'&&u?.el?.classList.contains('enemy'))return{kind:'danger',text:actor+' casting '+(ability||'an ability')};
 if(e.type==='INTERRUPT'&&e.result==='success')return{kind:'success',text:(clarityLabel(t)||'Enemy')+' interrupted'};
 if(e.type==='DEFENSIVE_ACTIVATED')return{kind:'defense',text:(ability||'Defensive ability')+' activated'};
 if(e.type==='PLAYER_DEFEATED')return{kind:'danger',text:(clarityLabel(t)||'Ally')+' down'};
 if(e.type==='ENEMY_DEFEATED'||e.type==='ADD_DEFEATED')return{kind:'success',text:(clarityLabel(t)||'Enemy')+' defeated'};
 if(e.type==='ABILITY_START'&&u?.el?.classList.contains('party')&&ability)return{kind:'action',text:actor+' · '+ability};
 return null;
}
function resetClarity(scene){
 const c=scene.clarity;if(!c)return;
 for(const u of scene.units.values())u.el.classList.remove('cbl-primary-target','cbl-danger-cast');
 c.focus=null;c.focusAt=0;c.caster=null;c.lastActionAt=0;
 if(c.target)c.target.textContent='No target';
 if(c.action)c.action.textContent='Choose a target and issue commands';
 if(c.node)delete c.node.dataset.priority;
}
function initClarity(scene){
 if(scene.arena.dataset.pvpMode)return;
 scene.arena.dataset.combatClarity='1';
 const shell=scene.arena.closest('.cbcombat-shell'),topbar=shell?.querySelector('.cbcombat-battle-topbar');
 scene.arena.dataset.clarityHud=topbar?'1':'0';
 if(!scene.clarity)scene.clarity={node:null,target:null,action:null,focus:null,focusAt:0,caster:null,lastActionAt:0};
 const c=scene.clarity;
 if(topbar&&!c.node?.isConnected){
  const node=document.createElement('div');node.className='cbl-combat-readout';node.setAttribute('role','group');node.setAttribute('aria-label','Current battle focus');
  const target=document.createElement('strong');target.className='cbl-readout-target';
  const action=document.createElement('span');action.className='cbl-readout-action';
  node.append(target,action);topbar.appendChild(node);c.node=node;c.target=target;c.action=action;
 }
 resetClarity(scene);
}
function updateClarity(scene,e,u,t){
 const c=scene.clarity;if(!c||scene.arena.dataset.pvpMode)return;
 const ts=now(),hostile=el=>el?.classList.contains('enemy')||el?.classList.contains('boss');
 const friendly=el=>el?.classList.contains('party')||el?.classList.contains('own');
 if(['TARGET_CHANGED','ABILITY_START','DAMAGE_DEALT'].includes(e.type)&&friendly(u?.el)&&hostile(t?.el)&&!t.dead){
  if(e.type==='TARGET_CHANGED'||!c.focus||!c.focus.isConnected||ts-c.focusAt>1700){
   if(c.focus!==t.el){
    c.focus?.classList.remove('cbl-primary-target');c.focus=t.el;c.focus.classList.add('cbl-primary-target');
    if(c.target)c.target.textContent='Target: '+(clarityLabel(t)||'Enemy');
   }c.focusAt=ts;
  }
 }
 if(e.type==='CAST_START'&&hostile(u?.el)){
  c.caster?.classList.remove('cbl-danger-cast');c.caster=u.el;u.el.classList.add('cbl-danger-cast');
 }else if((['CAST_CANCELLED','CAST_FINISH','ABILITY_FINISH'].includes(e.type)&&c.caster===u?.el)||(e.type==='INTERRUPT'&&c.caster===t?.el)){
  c.caster?.classList.remove('cbl-danger-cast');c.caster=null;
  if(e.type!=='INTERRUPT'&&c.action){c.action.textContent='Enemy cast ended';delete c.node.dataset.priority}
 }
 if(['PLAYER_DEFEATED','ENEMY_DEFEATED','ADD_DEFEATED'].includes(e.type)){
  if(c.focus===t?.el){c.focus.classList.remove('cbl-primary-target');c.focus=null;if(c.target)c.target.textContent='No target'}
  if(c.caster===t?.el){c.caster.classList.remove('cbl-danger-cast');c.caster=null}
 }
 if(e.type==='COMBAT_END'){resetClarity(scene);if(c.action)c.action.textContent='Encounter complete';return}
 const msg=clarityDescriptor(e,u,t);
 if(!msg||!c.action)return;
 const urgent=msg.kind!=='action';
 if(!urgent&&(c.caster||ts-c.lastActionAt<1250))return;
 c.action.textContent=msg.text;c.node.dataset.priority=msg.kind;
 if(!urgent)c.lastActionAt=ts;
}

function disposeScene(scene){
 for(const u of scene.units.values()){u.animation?.cancel();clearCast(u)}
 scene.clarity?.node?.remove();resetClarity(scene);
 for(const f of scene.effects){clearTimeout(f.timer);f.n.remove()}
 for(const group of [scene.hazards,scene.warnings,scene.totems,scene.pets])for(const entry of group.values()){entry.node?.remove();entry.callout?.remove();entry.remove?.();for(const n of entry.markers||[])n.remove()}
 scene.effects.clear();scene.units.clear();scene.resize?.disconnect();scene.camera?.cancel();scene.layer.remove();scene.room?.remove();scenes.delete(scene.arena);
}
new MutationObserver(()=>{for(const scene of scenes.values())if(!scene.arena.isConnected||scene.arena.closest('[hidden]'))disposeScene(scene)}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
function mount(target){
 const arena=typeof target==='string'?document.querySelector(target):target;
 if(!arena?.matches?.(ARENA))return null;
 baseMount?.(arena);
 if(scenes.has(arena)&&!scenes.get(arena).layer.isConnected){for(const u of scenes.get(arena).units.values()){clearCast(u);u.animation?.cancel()}scenes.get(arena).resize?.disconnect();scenes.delete(arena)}
 arena.classList.add('cbl-scene');
 if(!scenes.has(arena)){
  const layer=document.createElement('div');layer.className='cbl-effects';layer.setAttribute('aria-hidden','true');arena.appendChild(layer);
  scenes.set(arena,{arena,layer,units:new Map(),effects:new Set(),hazards:new Map(),warnings:new Map(),totems:new Map(),pets:new Map(),time:0,speed:1,live:true});
  arena.classList.add('cbl-scene');
  const scene=scenes.get(arena);scene.resize=new ResizeObserver(()=>{scene.bounds=null;framing(scene,true)});scene.resize.observe(arena);
 }
 return arena
}
function unit(scene,el){
 if(!el)return null;
 let u=scene.units.get(el);if(u)return u;
 const p=profile(el);u={el,p,target:null,dead:false,statuses:new Map(),state:'idle',until:0,animation:null,cast:null};scene.units.set(el,u);
 if(p===ENEMY)enemyProfile(u,{classification:el.classList.contains('boss')?'boss':el.classList.contains('elite')?'elite':''});
 el.classList.add('cbl-unit');el.dataset.motion=u.p.motion;el.style.setProperty('--cbl-accent',p.accent);
 // Desynchronise idle/stance loops so the party never looks like one repeated slide.
 const phase=(scene.units.size*.37)%3.2;el.style.setProperty('--cbl-idle-delay',(-phase).toFixed(2)+'s');
 const nose=document.createElement('i');nose.className='cbl-facing';nose.setAttribute('aria-hidden','true');el.appendChild(nose);
 const ground=document.createElement('i');ground.className='cbl-ground';ground.setAttribute('aria-hidden','true');el.appendChild(ground);
 return u
}
function state(u,value,until=0){if(!u)return;u.state=value;u.until=until;u.el.dataset.combatState=value}
function controlled(u){return [...u.statuses.values()].some(s=>['stun','fear','incapacitate'].includes(s.cc))}
function canAct(u){return u&&!u.dead&&!controlled(u)}
function center(el){const scene=scenes.get(el?.closest?.(ARENA)),u=scene?.units.get(el);if(u?.spatial?.visual&&scene.bounds)return anchorPoint(scene,el,scene.bounds);const r=actor(el).getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}}
function direction(a,b){const x=b.x-a.x,y=b.y-a.y,len=Math.hypot(x,y)||1;return{x:x/len,y:y/len,angle:Math.atan2(y,x)*180/Math.PI,len}}
function face(u,target){if(!u||!target||u.dead)return;u.target=target;u.facingTarget=target.dataset.cblCombatId||target.dataset.unit||target.dataset.qUnit||target.dataset.tbUnit||target.dataset.pvp2dUnit;const d=direction(center(u.el),center(target));if(u.drawnAngle!==d.angle){u.el.style.setProperty('--cbl-facing',d.angle+'deg');u.drawnAngle=d.angle}u.el.style.setProperty('--face-angle',d.angle+'deg')}
function motion(u,frames,duration,scene){
 if(!u||reduce()||u.el.dataset.animationOwned==='1')return;u.animation?.cancel();
 const easing=u.p.motion==='dart'||u.p.motion==='rush'?'cubic-bezier(.18,.82,.22,1)':u.p.motion==='heavy'||u.p.motion==='brutal'?'cubic-bezier(.22,.66,.28,1)':'cubic-bezier(.2,.72,.24,1)';
 u.animation=actor(u.el)?.animate?.(frames,{duration:Math.max(70,duration/scene.speed),easing,fill:'none'});
}
function spatialUpdate(scene,u,p,duration=0){
 const S=window.CellboundCombatSpatial;if(!S)return false;
 const changed=!u.position||Math.hypot(u.position.x-p.x,u.position.y-p.y)>.05;
 u.position={x:Number(p.x),y:Number(p.y)};u.el.dataset.x=String(p.x);u.el.dataset.y=String(p.y);
 if(changed||!u.spatial){scene.spatialDirty=true;u.spatialDuration=Math.max(180,Number(duration)||420)/scene.speed}
 return true;
}
function spatialLabels(scene,units,g){
 const boxes=[];
 for(const u of [...units].sort((a,b)=>Number(b.boss)-Number(a.boss)||a.id.localeCompare(b.id))){
  const el=u.el,label=el.querySelector(':scope > span:not(.cb-combat-portrait):not(.cb-combat-boss-portrait):not(.cb-combat-monster-portrait)');if(!label)continue;
  const namedInHeader=u.boss&&scene.arena.closest('.cbcombat-shell')?.querySelector('.cbcombat-title')?.textContent?.includes(label.childNodes[0]?.textContent||'');
  const hidden=namedInHeader&&g.width<600&&scene.warnings.size>0;label.style.visibility=hidden?'hidden':'';if(hidden){const link=el.querySelector(':scope > .cbs-label-link');if(link)link.hidden=true;continue}
  const w=u.boss?140:Math.min(100,g.width/4),h=u.boss?30:18,anchor=u.reserved||u.visual;label.style.setProperty('top','calc(50% + 30px)','important');label.style.setProperty('left','50%','important');label.style.setProperty('width',w+'px','important');label.style.setProperty('min-width','0','important');label.style.setProperty('transform','translateX(-50%)','important');let best={x:0,y:0},score=Infinity;
  for(const dy of [0,18,36])for(const dx of [0,-35,35,-65,65,-95,95]){const b={x:anchor.x-w/2+dx,y:anchor.y+30+dy,w,h};if(b.x<4||b.x+w>g.width-4||b.y+h>g.height-2)continue;
   const bodies=units.filter(a=>a!==u&&!a.dead).map(a=>{const p=a.reserved||a.visual;return{x:p.x-a.rx,y:p.y-a.artTop,w:a.rx*2,h:a.artTop+a.artBottom}});
   const collisions=[...boxes,...bodies].filter(a=>a.x<b.x+w&&a.x+a.w>b.x&&a.y<b.y+h&&a.y+a.h>b.y).length;
   const s=collisions*10000+Math.abs(dx)+dy*1.5;if(s<score){score=s;best={x:dx,y:dy}}}
  el.style.setProperty('--cbs-label-x',best.x+'px');el.style.setProperty('--cbs-label-y',best.y+'px');
  let link=el.querySelector(':scope > .cbs-label-link');if(!link){link=document.createElement('b');link.className='cbs-label-link';link.setAttribute('aria-hidden','true');el.appendChild(link)}link.hidden=Math.abs(best.x)<20&&best.y===0;link.style.width=Math.hypot(best.x,best.y+12)+'px';link.style.rotate=Math.atan2(best.y+12,best.x)*180/Math.PI+'deg';boxes.push({x:anchor.x-w/2+best.x,y:anchor.y+30+best.y,w,h});
 }
}
function spatialFrame(scene,bounds,time){
 const S=window.CellboundCombatSpatial;if(!S||scene.departing&&!scene.traversing)return;
 const width=bounds.width,height=bounds.height;if(width<1||height<1)return;
 if(scene.arena.dataset.spatialArena!=='1'){scene.arena.dataset.spatialArena='1';scene.arena.closest('.cbcombat-arena-wrap')?.classList.add('cbs-spatial-wrap');scene.arena.closest('.cbcombat-battle-panel')?.classList.add('cbs-spatial-panel')}
 const oldWidth=scene.spatialWidth,oldHeight=scene.spatialHeight;
 const resized=oldWidth!==width||oldHeight!==height;
 if(resized){scene.spatialWidth=width;scene.spatialHeight=height;scene.spatialDirty=true}
 const env=scene.spatialEnvironment||{},population=scene.units.size,theme=scene.arena.dataset.cinematicTheme||'';const geometryChanged=resized||scene.geometryEnvironment!==env||scene.geometryPopulation!==population||scene.geometryTheme!==theme||!scene.spatialGeometry;if(geometryChanged){scene.spatialGeometry=fightingGeometry(scene,width,height,population);scene.geometryEnvironment=env;scene.geometryPopulation=population;scene.geometryTheme=theme;scene.spatialDirty=true}const g=scene.spatialGeometry;
 if(scene.traversing){let moving=false;for(const [el,u] of scene.units){const t=u.transit;if(!el.isConnected||!t)continue;const f=reduce()?1:clamp((time-t.start)/t.duration,0,1),k=f*f*(3-2*f),p={x:t.from.x+(t.to.x-t.from.x)*k,y:t.from.y+(t.to.y-t.from.y)*k};u.spatial.visual={x:p.x*width/100,y:p.y*height/100};u.position=p;el.dataset.x=String(p.x);el.dataset.y=String(p.y);el.style.setProperty('left',p.x+'%','important');el.style.setProperty('top',p.y+'%','important');el.dataset.spatialState=f<1?'moving':'holding';if(f<1)moving=true;else u.transit=null}scene.traversing=moving;return}
 const list=[],zones=[...scene.hazards.values(),...(scene.spatialZones||[])].filter(h=>h.position&&h.radius>0).map(h=>Array.from({length:24},(_,i)=>({x:(h.position.x+Math.cos(i*Math.PI/12)*h.radius)*width/100,y:(h.position.y+Math.sin(i*Math.PI/12)*h.radius)*height/100})));
 for(const [el,u] of scene.units){
  if(!el.isConnected){scene.units.delete(el);scene.spatialDirty=true;continue}if(!u.position)continue;
  const id=u.spatialMeta?.id||el.dataset.unit||el.dataset.qUnit||el.dataset.tbUnit||el.dataset.pvp2dUnit||el.dataset.unitKey||el.dataset.hs||el.dataset.cc||el.dataset.bs||el.id||'unit-'+list.length;if(el.dataset.cblCombatId!==id)el.dataset.cblCombatId=id;
  const meta=u.spatialMeta||{},pet=el.classList.contains('cbl-pet'),boss=el.classList.contains('boss')||/boss/.test(meta.classification||'');
  const style=meta.rangeStyle||(el.classList.contains('tank')?'tank':el.classList.contains('healer')?'healer':el.classList.contains('profile-melee')||['Warrior','Rogue','Death Knight','Demon Hunter','Monk'].includes(u.p.name)?'melee':u.p.name==='Enemy'&&!['marksman','occult','support'].includes(u.p.motion)?'melee':'ranged');
  let s=u.spatial;
  // Read the already-painted entry pose before the movement owner changes
  // root positioning. Combat destinations must be reached by walking.
  let entryVisual=null;
  if(!s){
   const painted=el.getBoundingClientRect(),x=painted.left+painted.width/2-bounds.left,y=painted.top+painted.height/2-bounds.top;
   if(painted.width>0&&painted.height>0&&Number.isFinite(x)&&Number.isFinite(y)&&
      x>-width*.25&&x<width*1.25&&y>-height*.25&&y<height*1.25)entryVisual={x,y};
  }
  if(s&&u.footprintDirty){const css=getComputedStyle(actor(el)),w=parseFloat(css.width)||48,h=parseFloat(css.height)||82;Object.assign(s,{rx:Math.max(pet?14:22,w*.42)+(boss?8:4),ry:Math.max(pet?15:22,h*.25)+(boss?8:3),head:h*.75,artTop:h*.75,artBottom:h*.25});u.footprintDirty=false;scene.spatialDirty=true;el.style.setProperty('--cbs-head',s.head+'px');el.querySelector(':scope > .cb2d-unit-hp')?.style.setProperty('top','calc(50% - '+s.head+'px)','important')}if(!s){const a=actor(el),css=getComputedStyle(a),w=parseFloat(css.width)||48,h=parseFloat(css.height)||82;s=u.spatial={id,el,rx:Math.max(pet?14:22,w*.52)+(boss?12:5),ry:Math.max(pet?15:22,h*.42)+(boss?12:3),head:h*.8+10,artTop:pet?h/2:boss?h/2:h*.75,artBottom:pet?h/2:boss?h/2:h*.25,foot:pet?14:46,visual:null,entryVisual};if(el.dataset.monsterId){Object.assign(s,{rx:Math.max(22,w*.42)+(boss?8:4),ry:Math.max(22,h*.25)+(boss?8:3),head:h*.75,artTop:h*.75,artBottom:h*.25})}scene.spatialDirty=true;el.dataset.spatialOwned='1';el.style.setProperty('margin','0','important');el.style.setProperty('transition','none','important');el.style.setProperty('transform','translate(-50%,-50%)','important');el.style.setProperty('--cbs-head',s.head+'px');el.querySelector(':scope > .cb2d-unit-hp')?.style.setProperty('top','calc(50% - '+s.head+'px)','important')}
  const locked=controlled(u)||!!u.cast,command=time<(u.spatialCommandUntil||0)?u.spatialCommand:null;
  if(s.dead!==u.dead||s.locked!==locked||s.command!==command){scene.spatialDirty=true;s.dead=u.dead}
  Object.assign(s,{homeSide:s.homeSide||(meta.team==='red'||el.classList.contains('enemy')?1:-1),style,boss,role:pet?'pet':meta.role||((el.classList.contains('enemy')||boss)?'enemy':style==='tank'?'tank':style==='healer'?'healer':'dps'),team:meta.team||el.dataset.team,logical:{x:u.position.x*width/100,y:u.position.y*height/100},target:u.engagementTarget,locked,command});
  s.zones=zones;
  if(resized){
   // Re-scale positions on orientation change; never teleport to reservations.
   if(s.visual&&oldWidth>0&&oldHeight>0){
    s.visual={x:s.visual.x*width/oldWidth,y:s.visual.y*height/oldHeight};
    s.drawn=null;
   }
   s.reserved=null;s.waypoint=null;s.route=null;
  }
  if(!s.visual&&s.entryVisual){
   // A painted formation can start outside the art's walkable floor. Enter
   // from its nearest legal edge instead of showing an off-screen actor.
   s.visual=S.legal(s.entryVisual,s,g)?s.entryVisual:S.safePoint(s.entryVisual,s,g);
   s.entryRecovery=false;s.entryVisual=null;
  }
  if(geometryChanged&&s.visual&&!S.legal(s.visual,s,g)){
   s.visual=S.safePoint(s.visual,s,g);s.drawn=null;
  }
  list.push(s);
 }
 if(scene.spatialDirty&&time-(scene.spatialPlannedAt||0)>(list.length>20?220:100)){
  const result=S.plan(list,g,scene.arena.dataset.pvpMode?'pvp':'pve');scene.spatialChecks=result.checks;scene.spatialUnresolved=result.unresolved;scene.spatialDirty=false;scene.spatialPlannedAt=time;
  for(const s of list){const p=result.positions.get(s.id);if(!p)continue;const changed=!s.reserved||S.distance(p,s.reserved)>1;s.reserved=p;
   if(!s.visual){s.visual={...p};s.waypoint=null}else if(changed){s.route=null;s.waypoint=S.waypoint(s.visual,p,s,g);const owner=scene.units.get(s.el);s.speed=clamp(S.distance(s.visual,p)/Math.max(.22,(owner.spatialDuration||600)/1000),65,220*scene.speed)}
  }
  spatialLabels(scene,list,g);
 }
 const dt=(time-(scene.spatialFrameAt||time))/1000;scene.spatialFrameAt=time;
 if(reduce()){for(const s of list)if(s.reserved)s.visual={...s.reserved}}else S.advance(list,g,dt);
 for(const s of list){if(!s.visual)continue;const p=s.visual,u=scene.units.get(s.el),el=s.el;
  const moving=!s.dead&&!s.locked&&!reduce()&&s.reserved&&S.distance(p,s.reserved)>2;
  const spatialState=s.dead?'dead':s.locked?'controlled':moving?'moving':'holding';if(el.dataset.spatialState!==spatialState)el.dataset.spatialState=spatialState;
  if(!s.drawn||S.distance(p,s.drawn)>.1){el.style.setProperty('left',(p.x/width*100).toFixed(3)+'%','important');el.style.setProperty('top',(p.y/height*100).toFixed(3)+'%','important');s.drawn={...p}}
  const vx=(p.x/width*100).toFixed(3),vy=(p.y/height*100).toFixed(3);if(el.dataset.visualX!==vx)el.dataset.visualX=vx;if(el.dataset.visualY!==vy)el.dataset.visualY=vy;
  const target=list.find(t=>t.id===u.facingTarget);if(target?.visual&&Math.abs(target.visual.x-p.x)>18){
   const baseMirrored=el.dataset.team==='red'||el.dataset.monsterFacing==='left',left=target.visual.x<p.x;const face=left!==baseMirrored?'-1':'1';if(s.drawnFace!==face){el.style.setProperty('--cbs-face',face);s.drawnFace=face}
  }
 }
 scene.spatialUnits=list;
}

function setPosition(scene,u,p,duration=0){
 if(!u||!p||!Number.isFinite(Number(p.x))||!Number.isFinite(Number(p.y)))return;
 if(spatialUpdate(scene,u,p,duration))return;
 u.position={x:Number(p.x),y:Number(p.y)};
 if(scene.position){scene.position(u.el,p,reduce()?0:duration/scene.speed);return}
 const el=u.el,x=clamp(Number(p.x),0,100),y=clamp(Number(p.y),0,100),moveMs=reduce()?0:Math.max(0,Number(duration)||0)/scene.speed;
 el.dataset.x=String(x);el.dataset.y=String(y);
 el.style.transitionProperty='left, top, transform, opacity';
 el.style.transitionDuration=moveMs+'ms';
 el.style.transitionTimingFunction='cubic-bezier(.22,.72,.22,1)';
 el.style.setProperty('--cbl-move-ms',moveMs+'ms');
 if(scene.arena.id==='cb2dArena'&&el.dataset.unit){
   el.style.setProperty('--unit-left',x+'%');el.style.setProperty('--unit-top',y+'%');
   el.style.setProperty('--unit-x',x/100*scene.arena.clientWidth+'px');el.style.setProperty('--unit-y',y/100*scene.arena.clientHeight+'px');
   if(scene.arena.dataset.bespokeBattlefield==='1'){
     const min=Number(scene.arena.dataset.depthMin)||.94,max=Number(scene.arena.dataset.depthMax)||1.06,t=clamp((y-10)/80,0,1);
     el.style.setProperty('--cb2d-depth-scale',(min+(max-min)*t).toFixed(3));el.style.zIndex=String(20+Math.round(y))
   }else{
     el.style.removeProperty('--cb2d-depth-scale');el.style.removeProperty('z-index')
   }
 }else{el.style.left=x+'%';el.style.top=y+'%'}
}
function kind(e,u){
 const k=e.payload?.kind;
 if(k)return /heal|battle-rez/.test(k)?'heal':k==='damage'?((Number(e.payload.range)||Number(e.payload.attackRange)||5)>7?'ranged':'melee'):'support';
 if(e.payload?.attackRange)return e.payload.attackRange>7?'ranged':'melee';
 return /shot|bolt|ball|arrow|lightning|beam|breath|plate|nail|blast/i.test(e.ability||'')?'ranged':'melee'
}
function family(e,u){
 const a=String(e.ability||'').toLowerCase();
 for(const [re,value] of [[/frost|ice|blizzard/,'frost'],[/fire|flame|pyre|phoenix/,'fire'],[/lightning|chain|storm|thunder/,'lightning'],[/arcane|astral|star|moon/,'arcane'],[/holy|radiant|smite|divine/,'holy'],[/nature|wrath|verdant|emerald|rejuven|regrowth/,'nature'],[/poison|venom|toxic/,'poison'],[/fel|demon|shadow|drain|void|death|necrot/,'shadow'],[/plate/,'plate'],[/nail/,'steel'],[/collapse|shattered floor|falling beam/,'rubble']])if(re.test(a))return value;
 return u?.p.projectile||'hostile'
}
function anchorPoint(scene,el,bounds=scene.arena.getBoundingClientRect()){
 if(!el?.isConnected)return null;
 const tracked=scene.units.get(el),v=tracked?.spatial?.visual,p=tracked?.position;
 if(v)return{x:bounds.left+v.x,y:bounds.top+v.y};
 if(Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y))){
  return{x:bounds.left+clamp(Number(p.x),0,100)/100*bounds.width,y:bounds.top+clamp(Number(p.y),0,100)/100*bounds.height}
 }
 const a=actor(el),r=a?.getBoundingClientRect?.();
 if(!r||(!r.width&&!r.height))return null;
 const x=r.left+r.width/2,y=r.top+r.height/2;
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 return{x,y}
}

/* Visual-only ability signatures: never alter simulation or attack timing. */
let abilityIndex=null;
// Exact catalogue IDs take precedence over name heuristics (Starfire is lunar,
// Devouring Plague is shadow, and a healing breath is not a fire attack).
// These are cosmetic signatures only; area targets still come from combat events.
const CLASS_SIGNATURES={
 'Death Knight':[
  ['blood','fracture','heart-strike death-strike marrowrend blood-boil'],
  ['blood','rune','rune-tap dancing-rune-weapon vampiric-blood'],
  ['frost','fracture','obliterate frost-strike howling-blast frostscythe'],
  ['frost','nova','remorseless-winter frostwyrms-fury'],
  ['frost','breath','breath-of-sindragosa'],['frost','guard','icebound-fortitude mind-freeze'],
  ['shadow','rune','dark-command death-and-decay-blood death-and-decay-unholy dark-transformation army-of-the-dead apocalypse anti-magic-shell'],
  ['shadow','fracture','festering-strike scourge-strike'],['shadow','pulse','death-coil outbreak']
 ],
 'Demon Hunter':[
  ['fel','glaive','demons-bite chaos-strike blade-dance throw-glaive shear soul-cleave'],
  ['fel','breath','eye-beam'],['fel','nova','fel-barrage havoc-metamorphosis spirit-bomb'],
  ['fel','sigil','torment disrupt blur demon-spikes vengeance-metamorphosis'],
  ['fire','sigil','infernal-strike sigil-of-flame fiery-brand']
 ],
 'Druid':[
  ['nature','blossom','rejuvenation regrowth wild-growth tranquility'],
  ['nature','pulse','restoration-wrath wrath skull-bash'],['nature','guard','barkskin'],
  ['lunar','star','starfire starsurge moonfire starfall fury-of-elune celestial-alignment'],
  ['solar','star','sunfire solar-beam']
 ],
 'Evoker':[
  ['bronze','rune','reversion temporal-anomaly'],
  ['emerald','blossom','verdant-embrace emerald-blossom emerald-communion'],
  ['emerald','breath','dream-breath'],['fire','pulse','preservation-living-flame living-flame pyre dragonrage'],
  ['fire','breath','fire-breath'],['azure','breath','disintegrate'],
  ['azure','star','azure-strike eternity-surge quell'],['earth','guard','obsidian-scales']
 ],
 'Priest':[
  ['holy','blossom','heal flash-heal prayer-healing soul-recall divine-hymn'],
  ['holy','pulse','smite'],['holy','guard','guardian-spirit'],
  ['shadow','pulse','mind-flay mind-blast devouring-plague shadow-word-pain vampiric-touch void-torrent silence'],
  ['shadow','nova','shadow-crash void-eruption'],['shadow','guard','dispersion']
 ],
 'Shaman':[
  ['water','blossom','healing-wave riptide healing-rain'],['water','chain','chain-heal'],
  ['water','sigil','healing-stream-totem spirit-link-totem'],
  ['storm','sigil','windfury-totem'],['earth','sigil','stoneskin-totem'],
  ['storm','pulse','restoration-lightning-bolt lightning-bolt stormkeeper ascendance wind-shear'],
  ['storm','chain','chain-lightning'],['fire','pulse','lava-burst flame-shock'],
  ['earth','fracture','earth-shock'],['earth','nova','earthquake'],['arcane','guard','astral-shift']
 ],
 'Warlock':[
  ['shadow','pulse','shadow-bolt soul-strike shadowfury'],['shadow','guard','dark-pact'],
  ['fel','pulse','demonbolt chaos-bolt axe-toss'],
  ['fel','sigil','hand-of-guldan call-dreadstalkers summon-demonic-tyrant summon-infernal'],
  ['fel','nova','felstorm implosion'],['fire','pulse','incinerate conflagrate immolate channel-demonfire'],
  ['fire','nova','rain-of-fire']
 ],
 'Monk':[
  ['brew','fracture','keg-smash'],['brew','guard','purifying-brew celestial-brew fortifying-brew'],
  ['fire','breath','breath-of-fire'],['mist','blossom','soothing-mist vivify renewing-mist essence-font revival'],
  ['chi','fist','brewmaster-blackout-kick mist-rising-sun-kick mist-tiger-palm tiger-palm windwalker-blackout-kick windwalker-rising-sun-kick fists-of-fury touch-of-death spear-hand-strike'],
  ['chi','nova','spinning-crane-kick'],['chi','guard','touch-of-karma'],['chi','pulse','provoke']
 ]
};
const signatureIndex=new Map();
for(const [klass,groups] of Object.entries(CLASS_SIGNATURES))for(const [school,shape,ids] of groups)for(const id of ids.split(' '))signatureIndex.set(klass+':'+id,{school,shape});
const CLASS_SCHOOLS={'Warrior':'steel','Paladin':'holy','Hunter':'steel','Rogue':'shadow','Mage':'arcane','Death Knight':'blood','Demon Hunter':'fel','Druid':'nature','Evoker':'emerald','Priest':'holy','Shaman':'storm','Warlock':'shadow','Monk':'chi'};
function abilityDefinition(e,klass){
 if(!abilityIndex&&window.CellboundCombatData){abilityIndex=new Map();for(const [owner,list] of Object.entries(window.CellboundCombatData.ABILITIES))for(const a of list){abilityIndex.set(owner+':'+a.id,a);abilityIndex.set(owner+':'+a.name.toLowerCase(),a)}}
 const key=String(e?.abilityId||e?.payload?.abilityId||e?.ability||'').replace(/ \((DoT|HoT|Pulse)\)$/i,'').toLowerCase();
 return abilityIndex?.get(klass+':'+key)||null;
}
function visualSignature(e,kind='damage',klass=''){
 const definition=abilityDefinition(e,klass),actionKind=definition?.kind||e?.payload?.kind||kind;
 const name=String(definition?.name||e?.ability||e?.abilityId||e?.payload?.abilityId||'').toLowerCase().replace(/[-_]+/g,' ');
 const authored=signatureIndex.get(klass+':'+definition?.id);
 const schools=[['poison',/poison|venom|envenom|plague/],['fel',/fel|chaos bolt|demon|infernal/],['frost',/frost|ice|glacial|blizzard|winter/],['storm',/lightning|thunder|storm|electr/],['fire',/fire|flame|pyro|lava|burn|immolate/],['holy',/holy|divine|radiant|judgement|consecrat|benedict/],['shadow',/shadow|void|death|necrot|blood|curse|soul/],['arcane',/arcane|astral|star|celestial|azure|temporal/],['nature',/nature|thorn|root|regrowth|rejuven|wild growth|verdant|emerald|riptide/],['earth',/earth|quake|rock|stone/]];
 const school=authored?.school||schools.find(([,re])=>re.test(name))?.[0]||CLASS_SCHOOLS[klass]||(kind==='heal'?'heal':kind==='defense'?'guard':'steel');
 const shape=kind==='defense'||actionKind==='defensive'?'guard':authored?.shape||(kind==='heal'||/heal/.test(actionKind)?'blossom':/shield|barrier|ward|guard|protection|block/.test(name)?'guard':/chain lightning|chain heal/.test(name)?'chain':/blizzard|whirl|volley|multi shot|starfall|nova|consecrat|earthquake|blade dance|fan of knives|death and decay/.test(name)?'nova':/aimed|shot|arrow|pierc|stab|dagger/.test(name)?'pierce':/slam|execute|crush|mortal strike|cleave|obliterat/.test(name)?'fracture':'pulse');
 const major=!!(e?.payload?.majorAbility||e?.result==='critical'||Number(e?.payload?.visualIntensity)>=4||/apocalypse|metamorphosis|pyroblast|chaos bolt|glacial spike|frostwyrm|execute/.test(name));
 const area=actionKind==='group-heal'||Number(definition?.cleave)>1||Number(definition?.targets)>1||/nova|consecrat|blizzard|volley|multi.shot|light of dawn|radiant wave|whirlwind|thunder clap/.test(name);
 const choreography=window.CellboundCombatAnimationCatalog?.resolve(klass,e);
 return{school,shape,major,area,kind:actionKind,known:!!definition,authored:!!authored,periodic:/\((DoT|HoT|Pulse)\)/i.test(e?.ability||''),skill:choreography?.authored?choreography:null};
}
function skillClasses(v){return v.skill?' skill-'+v.skill.motif+' rhythm-'+v.skill.rhythm:''}
function ownEffect(f,e,u,t){if(f){f.n.dataset.abilityId=e.abilityId||e.payload?.abilityId||e.ability||'';f.n.dataset.source=e.source||u?.el?.dataset.unit||'';f.n.dataset.target=t?.el?.dataset.unit||e.target||''}return f}
function abilityCharge(scene,e,u){
 if(!u?.el||reduce()||scene.effects.size>=25)return;
 const v=visualSignature(e,'damage',u.p.name);
 ownEffect(effect(scene,'ability-charge school-'+v.school+skillClasses(v)+(v.major?' major':''),null,u.el,v.major?520:400),e,u,u);
}
function abilityImpact(scene,e,u,t,kind='damage'){
 if(!t?.el)return false;
 const v=visualSignature(e,kind,u?.p.name);
 const f=ownEffect(effect(scene,'ability-impact school-'+v.school+' shape-'+v.shape+skillClasses(v)+(v.major?' major':'')+(v.area?' area':'')+(v.periodic?' periodic':'')+(reduce()?' still':''),null,t.el,reduce()?200:v.major?540:380),e,u,t);
 if(!f)return false;
 if(u?.el?.isConnected)f.n.style.setProperty('--hit-angle',direction(center(u.el),center(t.el)).angle+'deg');
 // Connections exist only for real successful result targets. They are cosmetic
 // contact sequences, never a forecast of an area or an extra damage tick.
 if(!reduce()&&!v.periodic&&u?.el&&u!==t&&['beam','ray','breath'].includes(v.skill?.transport)){
  ownEffect(effect(scene,'connection skill-link school-'+v.school+' transport-'+v.skill.transport+skillClasses(v),u.el,t.el,320),e,u,t);
 }
 return true;
}

function effectAnchor(scene,el,bounds){return scene.sockets?.get(el)||anchorPoint(scene,el,bounds)}
function effect(scene,cls,source,target,life=320,allowUnanchored=false){
 // Anchored FX must receive geometry before they enter the DOM. Previously the
 // browser could paint one frame at 0,0 before the animation loop positioned it.
 if(!allowUnanchored&&!source&&!target)return null;
 const priority=/class-projectile|interrupt|shield|avoid|shape-guard/.test(cls)?2:/ability-impact|heal-ring/.test(cls)?1:0;
 const limit=scene.lowDetail?18:36;
 if(scene.effects.size>=limit){const disposable=[...scene.effects].find(f=>f.priority<priority);if(!disposable)return null;clearTimeout(disposable.timer);disposable.n.remove();scene.effects.delete(disposable)}
 const bounds=scene.bounds||scene.arena.getBoundingClientRect(),tp=target?effectAnchor(scene,target,bounds):null,sp=source?effectAnchor(scene,source,bounds):null;
 if(!allowUnanchored&&!tp&&!sp)return null;
 const n=document.createElement('i');n.className='cbl-fx '+cls;
 const connection=n.classList.contains('connection'),a=sp||tp,b=tp||sp;
 if(a&&b){
  const d=direction(a,b);
  n.style.left=(connection?a.x:b.x)-bounds.left+'px';n.style.top=(connection?a.y:b.y)-bounds.top+'px';
  if(connection){n.style.width=d.len+'px';n.style.setProperty('--cbl-angle',d.angle+'deg')}
 }
 if(a&&b)n.dataset.cblPositioned='1';
 const ttl=Math.max(60,life/scene.speed),fx={n,source,target,priority,ends:now()+ttl,timer:0};n.style.setProperty('--fx-life',ttl+'ms');scene.layer.appendChild(n);scene.effects.add(fx);return fx
}
function clearCast(u){
 if(!u)return;
 u.cast?.orb?.remove();u.cast?.beam?.remove();u.cast?.glyph?.remove();u.cast?.label?.remove();u.cast=null;
 u.el.classList.remove('cbl-casting');u.el.style.removeProperty('--cbl-charge');delete u.el.dataset.castStyle;delete u.el.dataset.castMechanic;delete u.el.dataset.bossCast;delete u.el.dataset.vfxSchool
}
function mountCastVisual(u,e){
 if(!u?.cast||!u.el)return;
 const glyph=document.createElement('i');glyph.className='cbl-cast-glyph '+family(e,u);glyph.setAttribute('aria-hidden','true');
 const label=document.createElement('b');label.className='cbl-cast-name';label.textContent=String(e.ability||'Casting');
 u.el.append(glyph,label);u.cast.glyph=glyph;u.cast.label=label;
 if(e.payload?.mechanicType)u.el.dataset.castMechanic=String(e.payload.mechanicType);
 if(u.el.classList.contains('boss'))u.el.dataset.bossCast=e.payload?.mechanicType?'mechanic':'cast'
}
function strike(scene,u,t,e,heal=false){
 if(!u||!t)return;
 const d=direction(center(u.el),center(t.el));face(u,t.el);
 if(['miss','missed','dodge','dodged','parry','parried','immune','resist','resisted'].includes(e.result)){
  if(/dodg/.test(e.result))motion(t,[{translate:(-d.y*5)+'px '+(d.x*5)+'px'},{translate:'0px 0px'}],240,scene);
  const f=effect(scene,'avoid',null,t.el,400);if(f)f.n.textContent=String(e.result).toUpperCase();return
 }
 const k=heal?'heal':kind(u.action||e,u),heavy=e.result==='critical'||Number(e.amount)>Number(e.payload?.targetMax||Infinity)*.15;
 const intensity=clamp(Number(e.payload?.visualIntensity)||(/signature|ultimate/i.test(e.ability||'')?5:e.payload?.majorAbility?4:heavy?3:Number(e.amount)<10?1:2),1,5);u.el.dataset.intensity=String(intensity);
 // Instant engine attacks have no flight interval: connect at contact, never invent a delayed hit.
 if(k!=='melee'&&!window.CellboundCombatAnimation?.isProjectile(e)&&!['beam','ray','breath'].includes(visualSignature(e,heal?'heal':'damage',u.p.name).skill?.transport)){
  const f=effect(scene,'connection '+(heal?'heal':family(e,u)),u.el,t.el,heal?400:210);
  if(f)f.n.style.setProperty('--cbl-accent',heal?'#76efac':u.p.accent);
 }else if(k==='melee'&&d.len<110){
  const reach=Math.min(u.p.lunge,d.len*.16,12),x=d.x*reach,y=d.y*reach;
  motion(u,[{translate:x+'px '+y+'px',rotate:['flow','fluid'].includes(u.p.motion)?'8deg':u.p.motion==='brutal'?'-6deg':'0deg',scale:heavy?'1.09':'1.04'},{translate:'0px 0px',rotate:'0deg',scale:'1'}],u.p.motion==='dart'?240:380,scene);
  const stroke=/shield|bash/i.test(e.ability||'')?'shield-strike':/thrust|pierce|stab/i.test(e.ability||'')?'thrust':/spin|whirl|sweep/i.test(e.ability||'')?'sweep':/overhead|cleave|crush/i.test(e.ability||'')?'overhead':u.p.motion;
  if(!reduce()&&!visualSignature(e).periodic){const sig=visualSignature(e,'damage',u.p.name),f=effect(scene,'weapon-trail '+stroke+' school-'+sig.school+(u.p.name==='Rogue'?' quick':'')+(heavy?' heavy':''),u.el,t.el,u.p.name==='Rogue'?190:290);if(f){f.n.style.setProperty('--hit-angle',d.angle+'deg');f.n.dataset.ability=String(e.ability||'Attack')}}
 }
 if(heal){abilityImpact(scene,e,u,t,'heal');const f=effect(scene,'heal-ring'+(Number(e.payload?.targetHpPct)<40?' emergency':'')+(/HoT/.test(e.ability||'')?' periodic':''),null,t.el,500);return}
 if(['miss','missed','dodge','dodged','immune','resist','resisted'].includes(e.result))return;
 if(!abilityImpact(scene,e,u,t,e.result==='blocked'?'defense':'damage'))effect(scene,(e.result==='blocked'?'shield':'contact')+(heavy?' heavy':''),null,t.el,240);
 motion(t,[{translate:(d.x*2*intensity)+'px '+(d.y*2*intensity)+'px',scale:heavy?'.94':'.98'},{translate:'0px 0px',scale:'1'}],280,scene)
}
function statuses(u,e){
 if(!u)return;
 for(const s of e.statusEffects||[]) /REMOVED$/.test(e.type)?u.statuses.delete(s.id):u.statuses.set(s.id,s);
 const values=[...u.statuses.values()],cc=values.find(s=>s.cc)?.cc||'';
 u.el.dataset.control=cc;
 u.el.dataset.aura=values.some(s=>s.effect?.damageReduction||s.effect?.incomingDamageReduction||s.effect?.absorb)?'guard':values.some(s=>s.effect?.damageTaken)?'vulnerable':values.some(s=>/poison|burn|bleed/i.test(s.name))?'harm':'';
 if(controlled(u)){u.animation?.cancel();clearCast(u);state(u,'controlled')}else if(u.state==='controlled')state(u,'idle')
}
function livingEvent(e,opts={}){
 if(!e)return;
 const arena=mount(opts.arena||opts.root?.querySelector?.(ARENA));if(!arena)return;
 const scene=scenes.get(arena);scene.position=opts.position;scene.speed=Math.max(.25,Number(typeof opts.speed==='function'?opts.speed():opts.speed)||1);scene.time=Number(e.timestamp)||0;
 if(/^PET_/.test(e.type))petObject(scene,e);
 const u=unit(scene,resolve(e.source,opts,arena)),t=unit(scene,resolve(e.target,opts,arena));
 if(u&&t&&['ABILITY_START','CAST_START','TARGET_CHANGED','PET_COMMAND'].includes(e.type)){const S=window.CellboundCombatSpatial;if(!S||S.team(u.spatialMeta||{role:u.el.classList.contains('enemy')?'enemy':'party'})!==S.team(t.spatialMeta||{role:t.el.classList.contains('enemy')?'enemy':'party'})){if(u.engagementTarget!==e.target){u.engagementTarget=e.target;scene.spatialDirty=true}}}
 if(e.type==='PHASE_CHANGE'&&e.payload?.arenaBounds){scene.spatialEnvironment={...scene.spatialEnvironment,bounds:e.payload.arenaBounds};scene.spatialDirty=true}
 // Mechanics retain the existing v3 language; actions/reactions have one owner.
 if(/^(MECHANIC_|GROUND_HAZARD_|PHASE_CHANGE|ENRAGE|INTERACTION_REQUIRED)/.test(e.type))baseEvent?.(e,opts);
 try{window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{type:e.type,event:e,arena,source:u?.el,target:t?.el,audioCue:e.payload?.audioCue||e.type.toLowerCase()}}))}catch(_){}
 if(/^GROUND_HAZARD_/.test(e.type))hazard(scene,e);
 if(/^MECHANIC_/.test(e.type))mechanic(scene,e,opts);
 if(/^TOTEM_/.test(e.type))totem(scene,e);
 switch(e.type){
 case'COMBAT_START':
  for(const f of scene.effects){clearTimeout(f.timer);f.n.remove()}scene.effects.clear();
  for(const n of scene.totems.values())n.remove();scene.totems.clear();for(const n of scene.pets.values())n.remove();scene.pets.clear();
  scene.live=true;scene.traversing=false;scene.departing=false;initClarity(scene);scene.spatialFrameAt=now();scene.spatialEnvironment=e.payload?.environment||{};scene.spatialDirty=true;room(scene,e);emphasis(scene,'entry');arena.classList.add('cbl-live');arena.querySelectorAll(UNIT).forEach(el=>unit(scene,el));
  for(const v of e.payload?.units||[]){const a=unit(scene,resolve(v.id,opts,arena));if(a){a.spatialMeta=v;enemyProfile(a,v);const group=String(v.id).match(/^p-(?:raid|maid)-(\d+)-/);if(group)a.el.dataset.raidParty=group[1];a.dead=v.alive===false;if(!a.dead)a.el.classList.remove('dead','dying');a.target=null;a.statuses.clear();a.el.dataset.control='';state(a,a.dead?'dead':'idle');setPosition(scene,a,v.position);a.el.style.setProperty('--cbl-facing',(v.facing||0)+'deg')}}framing(scene);break;
 case'PARTY_COMMAND':{const command=e.payload?.type;if(['spread','stack','regroup','fall-back'].includes(command)){for(const v of scene.units.values())if(v.spatialMeta?.role!=='enemy'){v.spatialCommand=command;v.spatialCommandUntil=now()+(Number(e.payload?.durationMs)||3000)/scene.speed}scene.spatialDirty=true}break;}
 case'MOVEMENT_START':
  if(u&&!u.dead){
   const duration=Number(e.payload?.duration)||420;
   if(/commander|pvp|fall.back|regroup/.test(e.result||'')){u.spatialCommand=/spread/.test(e.result)?'spread':/stack|group.up/.test(e.result)?'stack':'regroup';u.spatialCommandUntil=now()+3500/scene.speed;scene.spatialDirty=true}
   u.el.dataset.intent=String(e.result||'moving');
   if(e.position&&e.payload?.to){
    const d=direction(e.position,e.payload.to),strength=clamp(d.len/22,.35,1);
    if(u.drawnAngle!==d.angle){u.el.style.setProperty('--cbl-facing',d.angle+'deg');u.drawnAngle=d.angle}u.el.style.setProperty('--cbl-move-angle',d.angle+'deg');u.el.style.setProperty('--cbl-move-strength',String(strength));u.target=null
   }
   setPosition(scene,u,e.payload?.to,duration);clearCast(u);state(u,['knockback','pull'].includes(e.result)?'displaced':'moving',now()+duration/scene.speed);
   if(['knockback','pull'].includes(e.result))effect(scene,'force '+e.result,null,u.el,420)
  }break;
 case'MOVEMENT_END':if(u&&!u.dead){setPosition(scene,u,e.position,80);state(u,controlled(u)?'controlled':'idle');delete u.el.dataset.intent;if(t)face(u,t.el);if(arena.dataset.bespokeBattlefield==='1'&&arena.classList.contains('theme-ashen')&&!reduce())effect(scene,'ground-kick',null,u.el,360)}break;
 case'ABILITY_START':
  if(canAct(u)){enemyProfile(u,e.payload||{});u.action=e;if(t)face(u,t.el);state(u,kind(e,u)==='heal'?'healing':'attacking',now()+560/scene.speed);
   if(!(e.payload?.castTime>0)){const sig=visualSignature(e,'damage',u.p.name);if(sig.skill||sig.major||sig.shape==='nova'||sig.shape==='fracture')abilityCharge(scene,e,u);else if(!['damage','heal'].includes(e.payload?.kind))abilityCharge(scene,e,u);}
    if(!(e.payload?.castTime>0))motion(u,[{scale:'.965',translate:'0 1px',offset:0},{scale:'1.035',translate:'0 -1px',offset:.46},{scale:'1',translate:'0 0',offset:1}],300,scene)}break;
 case'CAST_START':
  if(canAct(u)){clearCast(u);u.target=t?.el||null;u.cast={event:e,destination:e.payload?.hazardPosition||null,start:now(),duration:Math.max(1,Number(e.payload?.duration)||1000)/scene.speed};u.el.classList.add('cbl-casting');u.el.dataset.castStyle=u.p.cast;state(u,/channel|beam|drain|torrent|disintegrate/i.test(e.ability||'')?'channeling':'casting');if(t)face(u,t.el);mountCastVisual(u,e);u.el.dataset.vfxSchool=visualSignature(e,'damage',u.p.name).school;abilityCharge(scene,e,u)}break;
 case'CAST_CANCELLED':case'CAST_FINISH':case'ABILITY_FINISH':
  clearCast(u);if(u&&!u.dead&&!controlled(u)){
   state(u,'idle');
   if(e.type==='ABILITY_FINISH'&&!/^failed/.test(e.result||'')){const sig=visualSignature(e,'damage',u.p.name);if(sig.skill?.kind==='taunt'&&t)abilityImpact(scene,e,u,t);else if(sig.skill?.kind==='summon')abilityImpact(scene,e,u,u)}
  }break;
 case'DAMAGE_DEALT':if(t){if(canAct(u))strike(scene,u,t,e);else if(!['miss','missed','dodge','dodged','immune','resist','resisted'].includes(e.result)&&!abilityImpact(scene,e,u,t))effect(scene,'contact',null,t.el,220);if(arena.dataset.bespokeBattlefield==='1'&&(e.result==='critical'||visualSignature(e).major||visualSignature(e).shape==='nova')&&!['miss','missed','dodge','dodged','immune','resist','resisted'].includes(e.result)){const floor=effect(scene,'floor-light '+family(e,u),null,t.el,e.result==='critical'?390:250);if(floor)floor.n.style.setProperty('--cbl-accent',u?.p?.accent||'#ff9a55')}}break;
 case'HEAL_RECEIVED':if(t){
  const visualSource=e.payload?.visualSource?unit(scene,resolve(e.payload.visualSource,opts,arena)):u;
  if(Number(e.payload?.chainBounce)>0&&visualSource){
   const f=effect(scene,'connection heal chain',visualSource.el,t.el,430);if(f)f.n.style.setProperty('--cbl-accent','#76efac');
   abilityImpact(scene,e,visualSource,t,'heal');effect(scene,'heal-ring chain',null,t.el,460)
  }else if(canAct(u))strike(scene,u,t,e,true);else{abilityImpact(scene,e,u,t,'heal');effect(scene,'heal-ring',null,t.el,400)}
  if(arena.dataset.bespokeBattlefield==='1'){const floor=effect(scene,'floor-light heal',null,t.el,320);if(floor)floor.n.style.setProperty('--cbl-accent','#76efac')}
 }break;
 case'AGGRO_CHANGED':if(u&&t){face(u,t.el);effect(scene,'aggro',null,t.el,650);if(visualSignature(e,'damage',u.p.name).skill)abilityImpact(scene,e,u,t)}break;
 case'CROWD_CONTROL':if(t){statuses(t,{type:'DEBUFF_APPLIED',statusEffects:[{id:'visual-control',cc:e.payload?.cc||'stun'}]});t.controlUntil=now()+(Number(e.payload?.duration)||900)/scene.speed}break;
 case'BUFF_APPLIED':case'DEBUFF_APPLIED':case'BUFF_REMOVED':case'DEBUFF_REMOVED':
  statuses(t,e);
  if(t&&/APPLIED$/.test(e.type)&&e.result!=='carried'){
   const guard=(e.statusEffects||[]).some(s=>s.effect?.damageReduction||s.effect?.incomingDamageReduction||s.effect?.absorb);
   const sig=visualSignature(e,guard?'defense':'damage',u?.p.name);
   const f=effect(scene,'status-pulse school-'+sig.school+(guard?' protection':e.type==='DEBUFF_APPLIED'?' harmful':' blessing'),null,t.el,460);
   if(f)f.n.dataset.ability=String(e.ability||'Status');
   if(sig.skill)abilityImpact(scene,e,u,t,guard?'defense':'damage');
  }break;
 case'INTERRUPT':if(e.result==='success'&&t){mechanic(scene,{...e,result:'interrupted'},opts);if(canAct(u)){effect(scene,'connection lightning',u.el,t.el,150);abilityImpact(scene,e,u,t)}clearCast(t);t.animation?.cancel();state(t,'interrupted',now()+500/scene.speed);effect(scene,'interrupt',null,t.el,550)}break;
 case'DEFENSIVE_ACTIVATED':if(t||u){state(t||u,'defending',now()+650/scene.speed);abilityImpact(scene,e,u,t||u,'defense')}effect(scene,'shield',null,(t||u)?.el,650);break;
 case'PLAYER_DEFEATED':case'ENEMY_DEFEATED':case'ADD_DEFEATED':
  if(t){t.dead=true;framing(scene);if(t.el.classList.contains('boss'))emphasis(scene,'death');clearCast(t);t.animation?.cancel();state(t,'dead');effect(scene,'death',null,t.el,t.el.classList.contains('boss')?1100:650)}break;
 case'PLAYER_REVIVED':case'ENEMY_REVIVED':
  if(t){t.dead=false;t.statuses.clear();t.el.dataset.control='';t.el.classList.remove('dead','dying');state(t,'reviving',now()+800/scene.speed);effect(scene,'revive',u?.el,t.el,850);abilityImpact(scene,e,u,t,'heal')}break;
 case'ADD_SPAWNED':requestAnimationFrame(()=>{const el=resolve(e.target,opts,arena);if(el){const spawned=unit(scene,el);spawned.spatialMeta={id:e.target,role:'enemy',...(e.payload||{})};enemyProfile(spawned,e.payload||{});setPosition(scene,spawned,e.position);framing(scene);effect(scene,'spawn',null,el,650)}});break;
 case'PET_SUMMONED':if(t){effect(scene,'spawn pet-spawn',null,t.el,650);abilityImpact(scene,e,u,t);state(t,'idle')}break;
 case'TOTEM_PLACED':if(u)abilityImpact(scene,e,u,u);break;
 case'PET_COMMAND':if(t||u){effect(scene,'command',null,(t||u).el,420);abilityImpact(scene,e,u,t||u)}break;
 case'INTERACTION_REQUIRED':if(/screech/i.test(e.ability||''))effect(scene,'screech',null,u?.el||t?.el,800);break;
 case'ENRAGE':if(u)u.el.dataset.aura='enrage';break;
 case'PHASE_CHANGE':emphasis(scene,'phase');if(scene.room)scene.room.dataset.wear=String(Math.min(3,Number(scene.room.dataset.wear||0)+1));if(u){effect(scene,'phase',null,u.el,1000);u.el.dataset.intensity='5'}break;
 case'GROUND_HAZARD_SPAWNED':
  if(/plate|collapse|beam|debris|floor/i.test(e.ability||'')&&e.position){const f=effect(scene,'debris',null,null,650,true);if(f){f.n.style.left=e.position.x+'%';f.n.style.top=e.position.y+'%';f.n.dataset.cblPositioned='1'}}break;
 case'COMBAT_END':for(const h of scene.hazards.values())h.node.remove();scene.hazards.clear();for(const n of scene.totems.values())n.remove();scene.totems.clear();for(const n of scene.pets.values())n.remove();scene.pets.clear();for(const w of scene.warnings.values()){w.callout?.remove();for(const n of w.markers||[])n.remove()}scene.warnings.clear();arena.querySelectorAll('.cbl-mechanic-callout,.cbl-mechanic-marker').forEach(n=>n.remove());scene.live=false;arena.classList.remove('cbl-live');for(const v of scene.units.values()){clearCast(v);v.animation?.cancel();if(!v.dead)state(v,'idle')}break;
 }
 updateClarity(scene,e,u,t);
 wake();
}
let raf=0;
function wake(){if(!raf&&!document.hidden)raf=window.CellboundCombatFrame?.request(frame,0)||requestAnimationFrame(frame)}
function frame(){
 const time=now();raf=0;
 let active=false;
 for(const [arena,scene] of scenes){
  if(!arena.isConnected){disposeScene(scene);continue}
  if(arena.closest('[hidden]')){disposeScene(scene);continue}
  // Cosmetic quality only; simulation and danger geometry never depend on FPS.
  const gap=time-(scene.fxFrameAt||time);scene.fxFrameAt=time;
  if(gap>0&&gap<5000){scene.fxFrameAverage=(scene.fxFrameAverage||16)*.94+Math.min(gap,250)*.06;scene.lowDetail=scene.fxFrameAverage>38||scene.units.size>20;arena.dataset.fxDetail=scene.lowDetail?'low':'full'}
  for(const entry of scene.warnings.values()){
   const progress=clamp((time-entry.start)/entry.duration,0,1),step=Math.round(progress*30);
   if(step!==entry.drawnProgress){entry.callout?.style.setProperty('--warning-left',String(1-progress));entry.drawnProgress=step}
   if(progress>=.7){for(const n of entry.nodes)n.dataset.phase='imminent';for(const n of entry.markers||[])n.dataset.phase='imminent';if(entry.callout)entry.callout.dataset.phase='imminent'}
  }
  for(const h of scene.hazards.values())if(time>=h.end-900/scene.speed)h.node.dataset.phase='expiring';
  const bounds=scene.bounds||arena.getBoundingClientRect(),positions=new Map();scene.bounds=bounds;
  const pos=el=>{if(!positions.has(el))positions.set(el,anchorPoint(scene,el,bounds)||center(el));return positions.get(el)};
  const sockets=new Map();
  const fxpos=el=>sockets.get(el)||pos(el);
  // Read geometry before any style writes: WebKit otherwise flushes the whole
  // SVG scene once for every beam/effect, repeatedly within a single frame.
  const readSocket=el=>{if(el?.isConnected&&!sockets.has(el))sockets.set(el,window.CellboundCombatAnimation?.socket(el)||pos(el))};
  // Only live connections need a moving grip. Flights latch their exact socket
  // once at release; impacts follow target ground coordinates without SVG reads.
  for(const u of scene.units.values())if(u.cast&&(u.state==='channeling'||!u.el.dataset.animationOwned)){readSocket(u.el);readSocket(u.target)}
  for(const f of scene.effects)if(!f.flight&&f.n.classList.contains('connection')){readSocket(f.source);readSocket(f.target)}
  scene.sockets=sockets;spatialFrame(scene,bounds,time);
  for(const [el,u] of scene.units){if(el.isConnected)pos(el);if(u.target?.isConnected)pos(u.target)}
  for(const [el,u] of scene.units){
   if(!el.isConnected){scene.units.delete(el);continue}
   const z=String(clamp(Math.round((pos(el).y-bounds.top)/Math.max(1,bounds.height)*14)+4,4,18));if(u.drawnDepth!==z){el.style.zIndex=z;u.drawnDepth=z}
   if(u.controlUntil&&time>=u.controlUntil){u.controlUntil=0;statuses(u,{type:'DEBUFF_REMOVED',statusEffects:[{id:'visual-control'}]})}
   if(u.until&&time>=u.until&&!u.dead){u.until=0;state(u,controlled(u)?'controlled':'idle')}
   if(u.target?.isConnected&&!u.dead&&u.state!=='moving'){
    const d=direction(pos(el),pos(u.target));if(u.drawnAngle!==d.angle){el.style.setProperty('--cbl-facing',d.angle+'deg');u.drawnAngle=d.angle}
   }
   if(u.cast){
    const progress=clamp((time-u.cast.start)/u.cast.duration,0,1);el.style.setProperty('--cbl-charge',String(progress));u.cast.glyph?.style.setProperty('--cast-progress',String(progress));
    if(u.state==='channeling'&&u.target?.isConnected){
     if(!u.cast.beam){const n=document.createElement('i');n.className='cbl-fx connection channel '+family(u.cast.event,u);n.style.setProperty('--cbl-accent',u.p.accent);scene.layer.appendChild(n);u.cast.beam=n}
     const a=fxpos(el),b=fxpos(u.target),d=direction(a,b),n=u.cast.beam;n.style.left=a.x-bounds.left+'px';n.style.top=a.y-bounds.top+'px';n.style.width=d.len+'px';n.style.setProperty('--cbl-angle',d.angle+'deg');n.dataset.cblPositioned='1';
    }else if(!el.dataset.animationOwned&&(u.cast.destination||u.target?.isConnected&&u.target!==el)&&progress>Math.max(0,1-u.p.travel/scene.speed/u.cast.duration)){
     if(!u.cast.orb){const n=document.createElement('i');n.className='cbl-fx cast-orb '+family(u.cast.event,u);n.style.setProperty('--cbl-accent',kind(u.action||u.cast.event,u)==='heal'?'#86f3b7':u.p.accent);scene.layer.appendChild(n);u.cast.orb=n}
     const a=fxpos(el),b=u.cast.destination?{x:bounds.left+u.cast.destination.x/100*bounds.width,y:bounds.top+u.cast.destination.y/100*bounds.height}:fxpos(u.target),travelFraction=Math.min(1,u.p.travel/scene.speed/u.cast.duration),t=reduce()?1:clamp((progress-1+travelFraction)/travelFraction,0,1),n=u.cast.orb;
     n.style.setProperty('--cbl-angle',direction(a,b).angle+'deg');
     n.style.left=(family(u.cast.event,u)==='rubble'?b.x-bounds.left:a.x+(b.x-a.x)*t-bounds.left)+'px';n.style.top=(family(u.cast.event,u)==='rubble'?b.y-bounds.top-60*(1-t):a.y+(b.y-a.y)*t-bounds.top-(family(u.cast.event,u)==='plate'?Math.sin(t*Math.PI)*24:0))+'px';n.dataset.cblPositioned='1';
    }
   }
  }
  for(const f of scene.effects){
   if(time>=f.ends||f.target&&!f.target.isConnected){clearTimeout(f.timer);f.n.remove();scene.effects.delete(f);continue}
   if(f.flight){
    const end=pos(f.target),fraction=clamp((time-f.started)/f.flight,0,1),n=f.n;
    const origin={x:bounds.left+f.origin.x*bounds.width,y:bounds.top+f.origin.y*bounds.height};
    n.style.left=(origin.x+(end.x-origin.x)*fraction-bounds.left)+'px';n.style.top=(origin.y+(end.y-origin.y)*fraction-bounds.top)+'px';
    n.style.setProperty('--cbl-angle',direction(origin,end).angle+'deg');continue;
   }
   if(f.target){const b=fxpos(f.target),a=f.source?.isConnected?fxpos(f.source):b,d=direction(a,b);
    const connection=f.n.classList.contains('connection');f.n.style.left=(connection?a.x:b.x)-bounds.left+'px';f.n.style.top=(connection?a.y:b.y)-bounds.top+'px';f.n.dataset.cblPositioned='1';
    if(connection){f.n.style.width=d.len+'px';f.n.style.setProperty('--cbl-angle',d.angle+'deg')}
   }
  }
  active=active||scene.live||scene.traversing||scene.effects.size>0;
 }
 if(active)wake()
}
FX.refreshFootprint=el=>{const s=scenes.get(el?.closest?.(ARENA)),u=s?.units.get(el);if(u){u.footprintDirty=true;s.spatialDirty=true;wake()}};
FX.visualPoint=el=>{const scene=scenes.get(el?.closest?.(ARENA)),p=scene?.units.get(el)?.spatial?.visual;return p&&scene.bounds?{x:p.x,y:p.y,w:scene.bounds.width,h:scene.bounds.height}:null};
FX.movePresentation=(el,p,duration=600)=>{
 const scene=scenes.get(el?.closest?.(ARENA)),u=scene?.units.get(el);if(!u?.spatial?.visual||scene.live&&!scene.arena.classList.contains('between-stages'))return false;
 const w=scene.spatialWidth,h=scene.spatialHeight;if(!w||!h)return false;
 scene.departing=true;scene.traversing=true;u.transit={from:{x:u.spatial.visual.x/w*100,y:u.spatial.visual.y/h*100},to:{x:clamp(Number(p.x),0,100),y:clamp(Number(p.y),0,100)},start:now(),duration:Math.max(1,duration)};wake();return true;
};
window.addEventListener('scroll',()=>{for(const scene of scenes.values())scene.bounds=null},{passive:true,capture:true});
window.addEventListener('resize',()=>{for(const scene of scenes.values())scene.bounds=null},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf){if(window.CellboundCombatFrame)CellboundCombatFrame.cancel(frame);else cancelAnimationFrame(raf)}raf=0}else{for(const scene of scenes.values())scene.spatialFrameAt=now();wake()}});
function combatEvent(e,opts={}){try{
 const animation=window.CellboundCombatAnimation,arena=mount(opts.arena||opts.root?.querySelector?.(ARENA));
 if(animation&&arena)animation.route(e,{...opts,arena,source:resolve(e.source,opts,arena),target:resolve(e.target,opts,arena)},()=>livingEvent(e,{...opts,arena}));
 else livingEvent(e,opts);
}catch(error){console.warn('Living combat visual skipped',e?.type,error)}}
// Flights are presentation-only and owned by the existing bounded FX lifecycle.
FX.launchAction=(e,arena,source,target,profile,flight)=>{
 const scene=scenes.get(arena);if(!scene||!source?.isConnected||!target?.isConnected||reduce())return;
 const u=scene.units.get(source),sig=visualSignature(e,profile.kind==='heal'?'heal':'damage',u?.p.name),f=effect(scene,'class-projectile school-'+sig.school+' shape-'+sig.shape+skillClasses(sig)+(profile.socket==='bow'?' arrow':'')+(sig.major?' major':''),source,target,flight*scene.speed);
 if(!f)return;
 // A release can precede ResizeObserver after an iPad rotation. Read this
 // launch's geometry together; never normalise fresh sockets with old bounds.
 const bounds=arena.getBoundingClientRect(),body=actor(source).getBoundingClientRect();scene.bounds=bounds;
 f.flight=flight;f.started=now();const origin=window.CellboundCombatAnimation?.socket(source,profile.socket)||{x:body.left+body.width/2,y:body.top+body.height/2};
 f.origin={x:(origin.x-bounds.left)/Math.max(1,bounds.width),y:(origin.y-bounds.top)/Math.max(1,bounds.height)};f.n.style.left=origin.x-bounds.left+'px';f.n.style.top=origin.y-bounds.top+'px';
 f.n.dataset.source=String(e.source||'');f.n.dataset.target=String(e.target||'');f.n.dataset.ability=String(e.ability||'');
 f.n.style.setProperty('--cbl-accent',/heal/.test(profile.kind)?'#76efac':u?.p.accent||'#ddd');wake();
};
FX.presentImpact=(e,fn)=>window.CellboundCombatAnimation?window.CellboundCombatAnimation.present(e,fn):fn();
FX.syncPositions=(arena,units,objectives={})=>{mount(arena);const scene=scenes.get(arena);if(!scene)return;const zones=[];if(objectives.storm)zones.push({position:objectives.storm.centre||{x:50,y:50},radius:objectives.storm.radius});if(objectives.hill?.radius)zones.push({position:objectives.hill,radius:objectives.hill.radius});const signature=JSON.stringify(zones);if(signature!==scene.spatialZoneSignature){scene.spatialZoneSignature=signature;scene.spatialZones=zones;scene.spatialDirty=true}for(const data of units){const u=unit(scene,resolve(data.id,{},arena));if(u){u.spatialMeta={...u.spatialMeta,...data};u.dead=data.alive===false;setPosition(scene,u,data.position,200)}}wake()};
if(window.CellboundCombatSpatial)window.CellboundCombatSpatial.inspect=arena=>{const s=scenes.get(arena);return s?{checks:s.spatialChecks,unresolved:s.spatialUnresolved,units:(s.spatialUnits||[]).map(u=>({id:u.id,role:u.role,style:u.style,logical:u.logical,visual:u.visual,reserved:u.reserved,rx:u.rx,ry:u.ry,conflict:u.conflict,state:u.el.dataset.spatialState}))}:null};
FX.mount=mount;FX.combatEvent=combatEvent;FX.physicalEvent=combatEvent;
FX.diagnostics=()=>({scenes:scenes.size,effects:[...scenes.values()].reduce((n,s)=>n+s.effects.size,0),warnings:[...scenes.values()].reduce((n,s)=>n+s.warnings.size,0),lowDetail:[...scenes.values()].some(s=>s.lowDetail)});
FX.encounterThemes=THEMES;FX.ownsHazards=true;FX.visualProfiles=PROFILES;FX.visualSignature=visualSignature;FX.clarityDescriptor=clarityDescriptor;FX.ownsMovement=true;FX.VERSION_PHYSICAL='4.8.0';FX.living=true;
// Legacy public entry points remain callable but no longer duplicate shared reactions.
for(const name of ['impact','heal','death','spawn','interrupt']){const old=FX[name];FX[name]=function(el,...args){if(el?.closest?.('.cbl-scene'))return;return old?.(el,...args)}}
})();
