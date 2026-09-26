(()=>{
'use strict';
/* Shared living presentation. All state comes from the authoritative event stream.
 * No combat outcomes, paths, HP, resources or target choices are calculated here. */
const FX=window.CellboundCombatFX=window.CellboundCombatFX||{};
const baseMount=FX.mount?.bind(FX), baseEvent=FX.combatEvent?.bind(FX);
const ARENA='.cb2d-arena,.quest-cb2d-arena,.wb2d-arena,.pvp2d-arena,#tbArena';
const UNIT='.cb2d-unit,.quest-cb2d-unit,.wb2d-unit,.pvp2d-unit,.tb-unit';
const scenes=new Map();
const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
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
 if(reduce()||performance.now()<(scene.emphasisUntil||0))return;
 scene.emphasisUntil=performance.now()+2500;scene.camera?.cancel();
 // A sub-percent emphasis leaves the full arena in frame and never follows a unit.
 scene.camera=scene.arena.animate([{scale:1},{scale:.996,offset:.35},{scale:1}],{duration:kind==='death'?950:650,easing:'ease-out'});
}
function hazard(scene,e){
 const id=String(e.payload?.hazardId||'');if(!id)return;
 if(e.type==='GROUND_HAZARD_EXPIRED'){const h=scene.hazards.get(id);if(h){h.node.remove();scene.hazards.delete(id)}return}
 if(e.type!=='GROUND_HAZARD_SPAWNED'||!e.position)return;
 scene.hazards.get(id)?.node.remove();
 const n=document.createElement('div');n.className='cbl-hazard';n.dataset.hazardId=id;n.dataset.phase='active';n.setAttribute('aria-label',String(e.ability||'Ground hazard')+' — active');
 const radius=Math.max(0,Number(e.payload.radius)||0);
 n.style.left=e.position.x+'%';n.style.top=e.position.y+'%';n.style.width=radius*2+'%';n.style.height=radius*2+'%';
 if(/plate|porcelain/i.test(e.ability||''))n.classList.add('porcelain');
 if(/collapse|beam|debris|floor/i.test(e.ability||''))n.classList.add('rubble');
 scene.arena.appendChild(n);scene.hazards.set(id,{node:n,end:performance.now()+(Number(e.payload.duration)||10000)/scene.speed});
}
function mechanic(scene,e){
 const token=e.payload?.token;if(token==null)return;
 if(e.type==='MECHANIC_TELEGRAPH'){
  const entry={start:performance.now(),duration:Math.max(1,Number(e.payload.duration)||1000)/scene.speed,nodes:[],source:e.source};scene.warnings.set(token,entry);
  // Existing adapters retain exact cone/line/puzzle geometry; tag their new nodes after event delivery.
  const before=new Set(scene.arena.querySelectorAll('.cb2d-tg,.quest-cb2d-telegraph,.tb-telegraph'));
  requestAnimationFrame(()=>{if(scene.warnings.get(token)!==entry)return;scene.arena.querySelectorAll('.cb2d-tg,.quest-cb2d-telegraph,.tb-telegraph').forEach(n=>{if(!before.has(n)){n.dataset.phase='incoming';entry.nodes.push(n)}})});
 }else{
  const entry=scene.warnings.get(token);if(!entry)return;
  for(const n of entry.nodes)n.dataset.phase=e.result==='interrupted'||e.result==='avoided'?'safe':'impact';
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
 return arena.querySelector('[data-unit="'+safe+'"],[data-q-unit="'+safe+'"],[data-tb-unit="'+safe+'"],[data-pvp2d-unit="'+safe+'"],[data-combat-id="'+safe+'"],[data-unit-key="'+safe+'"]')||
 (String(id).startsWith('tb-')?arena.querySelector('[data-tb-boss="'+CSS.escape(String(id).slice(3))+'"]'):null)||
 (id==='boss'?arena.querySelector('#wb2dBoss'):null)
}
function mount(target){
 const arena=typeof target==='string'?document.querySelector(target):target;
 if(!arena?.matches?.(ARENA))return null;
 baseMount?.(arena);
 if(scenes.has(arena)&&!scenes.get(arena).layer.isConnected){for(const u of scenes.get(arena).units.values()){clearCast(u);u.animation?.cancel()}scenes.get(arena).resize?.disconnect();scenes.delete(arena)}
 arena.classList.add('cbl-scene');
 if(!scenes.has(arena)){
  const layer=document.createElement('div');layer.className='cbl-effects';layer.setAttribute('aria-hidden','true');arena.appendChild(layer);
  scenes.set(arena,{arena,layer,units:new Map(),effects:new Set(),hazards:new Map(),warnings:new Map(),time:0,speed:1,live:true});
  arena.classList.add('cbl-scene');
  const scene=scenes.get(arena);scene.resize=new ResizeObserver(()=>framing(scene,true));scene.resize.observe(arena);
 }
 return arena
}
function unit(scene,el){
 if(!el)return null;
 let u=scene.units.get(el);if(u)return u;
 const p=profile(el);u={el,p,target:null,dead:false,statuses:new Map(),state:'idle',until:0,animation:null,cast:null};scene.units.set(el,u);
 if(p===ENEMY)enemyProfile(u,{classification:el.classList.contains('boss')?'boss':el.classList.contains('elite')?'elite':''});
 el.classList.add('cbl-unit');el.dataset.motion=u.p.motion;el.style.setProperty('--cbl-accent',p.accent);
 const nose=document.createElement('i');nose.className='cbl-facing';nose.setAttribute('aria-hidden','true');el.appendChild(nose);
 const ground=document.createElement('i');ground.className='cbl-ground';ground.setAttribute('aria-hidden','true');el.appendChild(ground);
 return u
}
function state(u,value,until=0){if(!u)return;u.state=value;u.until=until;u.el.dataset.combatState=value}
function controlled(u){return [...u.statuses.values()].some(s=>['stun','fear','incapacitate'].includes(s.cc))}
function canAct(u){return u&&!u.dead&&!controlled(u)}
function center(el){const r=actor(el).getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}}
function direction(a,b){const x=b.x-a.x,y=b.y-a.y,len=Math.hypot(x,y)||1;return{x:x/len,y:y/len,angle:Math.atan2(y,x)*180/Math.PI,len}}
function face(u,target){if(!u||!target||u.dead)return;u.target=target;const d=direction(center(u.el),center(target));u.el.style.setProperty('--cbl-facing',d.angle+'deg');u.el.style.setProperty('--face-angle',d.angle+'deg')}
function motion(u,frames,duration,scene){
 if(!u||reduce())return;u.animation?.cancel();
 u.animation=actor(u.el)?.animate?.(frames,{duration:Math.max(35,duration/scene.speed),easing:'ease-out'});
}
function setPosition(scene,u,p,duration=0){
 if(!u||!p||!Number.isFinite(Number(p.x))||!Number.isFinite(Number(p.y)))return;
 u.position={x:Number(p.x),y:Number(p.y)};
 if(scene.position){scene.position(u.el,p,reduce()?0:duration/scene.speed);return}
 const el=u.el,x=clamp(Number(p.x),0,100),y=clamp(Number(p.y),0,100);
 el.dataset.x=String(x);el.dataset.y=String(y);el.style.transitionDuration=(reduce()?0:duration/scene.speed)+'ms';
 if(scene.arena.id==='cb2dArena'&&el.dataset.unit){el.style.setProperty('--unit-x',x/100*scene.arena.clientWidth+'px');el.style.setProperty('--unit-y',y/100*scene.arena.clientHeight+'px')}
 else{el.style.left=x+'%';el.style.top=y+'%'}
}
function kind(e,u){
 const k=e.payload?.kind;
 if(k)return /heal|battle-rez/.test(k)?'heal':k==='damage'?((Number(e.payload.range)||Number(e.payload.attackRange)||5)>7?'ranged':'melee'):'support';
 if(e.payload?.attackRange)return e.payload.attackRange>7?'ranged':'melee';
 return /shot|bolt|ball|arrow|lightning|beam|breath|plate|nail|blast/i.test(e.ability||'')?'ranged':'melee'
}
function family(e,u){
 const a=String(e.ability||'').toLowerCase();
 for(const [re,value] of [[/frost|ice/,'frost'],[/fire|flame/,'fire'],[/lightning|chain/,'lightning'],[/shadow|drain/,'shadow'],[/plate/,'plate'],[/nail/,'steel'],[/collapse|shattered floor|falling beam/,'rubble']])if(re.test(a))return value;
 return u?.p.projectile||'hostile'
}
function effect(scene,cls,source,target,life=320){
 if(scene.effects.size>=36)return null;
 const n=document.createElement('i');n.className='cbl-fx '+cls;scene.layer.appendChild(n);
 const fx={n,source,target,ends:performance.now()+life/scene.speed};scene.effects.add(fx);return fx
}
function clearCast(u){if(!u)return;u.cast?.orb?.remove();u.cast?.beam?.remove();u.cast=null;u.el.classList.remove('cbl-casting');u.el.style.removeProperty('--cbl-charge')}
function strike(scene,u,t,e,heal=false){
 if(!u||!t)return;
 const d=direction(center(u.el),center(t.el));face(u,t.el);
 if(['miss','missed','dodge','dodged','immune'].includes(e.result)){
  if(/dodg/.test(e.result))motion(t,[{translate:(-d.y*5)+'px '+(d.x*5)+'px'},{translate:'0px 0px'}],240,scene);
  const f=effect(scene,'avoid',null,t.el,400);if(f)f.n.textContent=String(e.result).toUpperCase();return
 }
 const k=heal?'heal':kind(u.action||e,u),heavy=e.result==='critical'||Number(e.amount)>Number(e.payload?.targetMax||Infinity)*.15;
 const intensity=clamp(Number(e.payload?.visualIntensity)||(/signature|ultimate/i.test(e.ability||'')?5:e.payload?.majorAbility?4:heavy?3:Number(e.amount)<10?1:2),1,5);u.el.dataset.intensity=String(intensity);
 // Instant engine attacks have no flight interval: connect at contact, never invent a delayed hit.
 if(k!=='melee'){
  const f=effect(scene,'connection '+(heal?'heal':family(e,u)),u.el,t.el,heal?400:210);
  if(f)f.n.style.setProperty('--cbl-accent',heal?'#76efac':u.p.accent);
 }else if(d.len<110){
  const reach=Math.min(u.p.lunge,d.len*.16,12),x=d.x*reach,y=d.y*reach;
  motion(u,[{translate:x+'px '+y+'px',rotate:['flow','fluid'].includes(u.p.motion)?'8deg':u.p.motion==='brutal'?'-6deg':'0deg',scale:heavy?'1.09':'1.04'},{translate:'0px 0px',rotate:'0deg',scale:'1'}],u.p.motion==='dart'?180:310,scene);
  const stroke=/shield|bash/i.test(e.ability||'')?'shield-strike':/thrust|pierce|stab/i.test(e.ability||'')?'thrust':/spin|whirl|sweep/i.test(e.ability||'')?'sweep':/overhead|cleave|crush/i.test(e.ability||'')?'overhead':u.p.motion;
  const f=effect(scene,'slash '+stroke,u.el,t.el,260);if(f)f.n.style.setProperty('--cbl-accent',u.p.accent);
 }
 if(heal){const f=effect(scene,'heal-ring'+(Number(e.payload?.targetHpPct)<40?' emergency':'')+(/HoT/.test(e.ability||'')?' periodic':''),null,t.el,500);return}
 if(['miss','missed','dodge','dodged','immune'].includes(e.result))return;
 effect(scene,(e.result==='blocked'?'shield':'contact')+(heavy?' heavy':''),null,t.el,240);
 motion(t,[{translate:(d.x*2*intensity)+'px '+(d.y*2*intensity)+'px',scale:heavy?'.94':'.98'},{translate:'0px 0px',scale:'1'}],230,scene)
}
function statuses(u,e){
 if(!u)return;
 for(const s of e.statusEffects||[]) /REMOVED$/.test(e.type)?u.statuses.delete(s.id):u.statuses.set(s.id,s);
 const values=[...u.statuses.values()],cc=values.find(s=>s.cc)?.cc||'';
 u.el.dataset.control=cc;
 u.el.dataset.aura=values.some(s=>s.effect?.damageReduction)?'guard':values.some(s=>s.effect?.damageTaken)?'vulnerable':values.some(s=>/poison|burn|bleed/i.test(s.name))?'harm':'';
 if(controlled(u)){u.animation?.cancel();clearCast(u);state(u,'controlled')}else if(u.state==='controlled')state(u,'idle')
}
function livingEvent(e,opts={}){
 if(!e)return;
 const arena=mount(opts.arena||opts.root?.querySelector?.(ARENA));if(!arena)return;
 const scene=scenes.get(arena);scene.position=opts.position;scene.speed=Math.max(.25,Number(typeof opts.speed==='function'?opts.speed():opts.speed)||1);scene.time=Number(e.timestamp)||0;
 const u=unit(scene,resolve(e.source,opts,arena)),t=unit(scene,resolve(e.target,opts,arena));
 // Mechanics retain the existing v3 language; actions/reactions have one owner.
 if(/^(MECHANIC_|GROUND_HAZARD_|PHASE_CHANGE|ENRAGE|INTERACTION_REQUIRED)/.test(e.type))baseEvent?.(e,opts);
 try{window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{type:e.type,event:e,arena,source:u?.el,target:t?.el,audioCue:e.payload?.audioCue||e.type.toLowerCase()}}))}catch(_){}
 if(/^GROUND_HAZARD_/.test(e.type))hazard(scene,e);
 if(/^MECHANIC_/.test(e.type))mechanic(scene,e);
 switch(e.type){
 case'COMBAT_START':
  scene.live=true;room(scene,e);emphasis(scene,'entry');arena.classList.add('cbl-live');arena.querySelectorAll(UNIT).forEach(el=>unit(scene,el));
  for(const v of e.payload?.units||[]){const a=unit(scene,resolve(v.id,opts,arena));if(a){enemyProfile(a,v);const group=String(v.id).match(/^p-(?:raid|maid)-(\d+)-/);if(group)a.el.dataset.raidParty=group[1];a.dead=v.alive===false;if(!a.dead)a.el.classList.remove('dead','dying');a.target=null;a.statuses.clear();a.el.dataset.control='';state(a,a.dead?'dead':'idle');setPosition(scene,a,v.position);a.el.style.setProperty('--cbl-facing',(v.facing||0)+'deg')}}framing(scene);break;
 case'MOVEMENT_START':
  if(u&&!u.dead){u.el.dataset.intent=String(e.result||'moving');setPosition(scene,u,e.payload?.to,Number(e.payload?.duration)||420);clearCast(u);state(u,'moving',performance.now()+(Number(e.payload?.duration)||420)/scene.speed);if(e.position&&e.payload?.to){const d=direction(e.position,e.payload.to);u.el.style.setProperty('--cbl-facing',d.angle+'deg');u.target=null}}break;
 case'MOVEMENT_END':if(u&&!u.dead){setPosition(scene,u,e.position);state(u,controlled(u)?'controlled':'idle');if(t)face(u,t.el)}break;
 case'ABILITY_START':
  if(canAct(u)){enemyProfile(u,e.payload||{});u.action=e;if(t)face(u,t.el);state(u,kind(e,u)==='heal'?'healing':'attacking',performance.now()+450/scene.speed);
   if(!(e.payload?.castTime>0))motion(u,[{scale:'.97'},{scale:'1'}],210,scene)}break;
 case'CAST_START':
  if(canAct(u)){clearCast(u);u.target=t?.el||null;u.cast={event:e,destination:e.payload?.hazardPosition||null,start:performance.now(),duration:Math.max(1,Number(e.payload?.duration)||1000)/scene.speed};u.el.classList.add('cbl-casting');u.el.dataset.castStyle=u.p.cast;state(u,/channel|beam|drain/i.test(e.ability||'')?'channeling':'casting');if(t)face(u,t.el)}break;
 case'CAST_CANCELLED':case'CAST_FINISH':case'ABILITY_FINISH':clearCast(u);if(u&&!u.dead&&!controlled(u))state(u,'idle');break;
 case'DAMAGE_DEALT':if(t){if(canAct(u))strike(scene,u,t,e);else if(!['miss','missed','dodge','dodged','immune'].includes(e.result))effect(scene,'contact',null,t.el,220)}break;
 case'HEAL_RECEIVED':if(t){if(canAct(u))strike(scene,u,t,e,true);else effect(scene,'heal-ring',null,t.el,400)}break;
 case'AGGRO_CHANGED':if(u&&t){face(u,t.el);effect(scene,'aggro',null,t.el,650)}break;
 case'CROWD_CONTROL':if(t){statuses(t,{type:'DEBUFF_APPLIED',statusEffects:[{id:'visual-control',cc:e.payload?.cc||'stun'}]});t.controlUntil=performance.now()+(Number(e.payload?.duration)||900)/scene.speed}break;
 case'BUFF_APPLIED':case'DEBUFF_APPLIED':case'BUFF_REMOVED':case'DEBUFF_REMOVED':statuses(t,e);break;
 case'INTERRUPT':if(e.result==='success'&&t){mechanic(scene,{...e,result:'interrupted'});if(canAct(u))effect(scene,'connection lightning',u.el,t.el,150);clearCast(t);t.animation?.cancel();state(t,'interrupted',performance.now()+500/scene.speed);effect(scene,'interrupt',null,t.el,550)}break;
 case'DEFENSIVE_ACTIVATED':if(t||u)state(t||u,'defending',performance.now()+650/scene.speed);effect(scene,'shield',null,(t||u)?.el,650);break;
 case'PLAYER_DEFEATED':case'ENEMY_DEFEATED':case'ADD_DEFEATED':
  if(t){t.dead=true;framing(scene);if(t.el.classList.contains('boss'))emphasis(scene,'death');clearCast(t);t.animation?.cancel();state(t,'dead');effect(scene,'death',null,t.el,t.el.classList.contains('boss')?1100:650)}break;
 case'PLAYER_REVIVED':case'ENEMY_REVIVED':
  if(t){t.dead=false;t.statuses.clear();t.el.dataset.control='';t.el.classList.remove('dead','dying');state(t,'reviving',performance.now()+800/scene.speed);effect(scene,'revive',u?.el,t.el,850)}break;
 case'ADD_SPAWNED':requestAnimationFrame(()=>{const el=resolve(e.target,opts,arena);if(el){const spawned=unit(scene,el);enemyProfile(spawned,e.payload||{});setPosition(scene,spawned,e.position);framing(scene);effect(scene,'spawn',null,el,650)}});break;
 case'INTERACTION_REQUIRED':if(/screech/i.test(e.ability||''))effect(scene,'screech',null,u?.el||t?.el,800);break;
 case'ENRAGE':if(u)u.el.dataset.aura='enrage';break;
 case'PHASE_CHANGE':emphasis(scene,'phase');if(scene.room)scene.room.dataset.wear=String(Math.min(3,Number(scene.room.dataset.wear||0)+1));if(u){effect(scene,'phase',null,u.el,1000);u.el.dataset.intensity='5'}break;
 case'GROUND_HAZARD_SPAWNED':
  if(/plate|collapse|beam|debris|floor/i.test(e.ability||'')&&e.position){const f=effect(scene,'debris',null,null,650);if(f){f.n.style.left=e.position.x+'%';f.n.style.top=e.position.y+'%'}}break;
 case'COMBAT_END':for(const h of scene.hazards.values())h.node.remove();scene.hazards.clear();scene.warnings.clear();scene.live=false;arena.classList.remove('cbl-live');for(const v of scene.units.values()){clearCast(v);v.animation?.cancel();if(!v.dead)state(v,'idle')}break;
 }
 wake();
}
let raf=0,last=0;
function wake(){if(!raf)raf=requestAnimationFrame(frame)}
function frame(){
 const now=performance.now(); // Same clock as cast starts, effect expiry and state transitions.
 raf=0;if(now-last<32){wake();return}last=now;
 let active=false;
 for(const [arena,scene] of scenes){
  if(!arena.isConnected){for(const u of scene.units.values()){u.animation?.cancel();clearCast(u)}scene.resize?.disconnect();scene.camera?.cancel();scenes.delete(arena);continue}
  if(!arena.getClientRects().length){scene.live=false;for(const u of scene.units.values()){u.animation?.cancel();clearCast(u)}continue}
  for(const entry of scene.warnings.values())if(now-entry.start>=entry.duration*.7)for(const n of entry.nodes)n.dataset.phase='imminent';
  for(const h of scene.hazards.values())if(now>=h.end-900/scene.speed)h.node.dataset.phase='expiring';
  const bounds=arena.getBoundingClientRect(),positions=new Map();
  const pos=el=>{if(!positions.has(el))positions.set(el,center(el));return positions.get(el)};
  for(const [el,u] of scene.units){if(el.isConnected)pos(el);if(u.target?.isConnected)pos(u.target)}
  for(const [el,u] of scene.units){
   if(!el.isConnected){scene.units.delete(el);continue}
   el.style.zIndex=String(clamp(Math.round((pos(el).y-bounds.top)/Math.max(1,bounds.height)*14)+4,4,18));
   if(u.controlUntil&&now>=u.controlUntil){u.controlUntil=0;statuses(u,{type:'DEBUFF_REMOVED',statusEffects:[{id:'visual-control'}]})}
   if(u.until&&now>=u.until&&!u.dead){u.until=0;state(u,controlled(u)?'controlled':'idle')}
   if(u.target?.isConnected&&!u.dead&&u.state!=='moving'){
    const d=direction(pos(el),pos(u.target));el.style.setProperty('--cbl-facing',d.angle+'deg');
   }
   if(u.cast){
    const progress=clamp((now-u.cast.start)/u.cast.duration,0,1);el.style.setProperty('--cbl-charge',String(progress));
    if(u.state==='channeling'&&u.target?.isConnected){
     if(!u.cast.beam){const n=document.createElement('i');n.className='cbl-fx connection channel '+family(u.cast.event,u);n.style.setProperty('--cbl-accent',u.p.accent);scene.layer.appendChild(n);u.cast.beam=n}
     const a=pos(el),b=pos(u.target),d=direction(a,b),n=u.cast.beam;n.style.left=a.x-bounds.left+'px';n.style.top=a.y-bounds.top+'px';n.style.width=d.len+'px';n.style.setProperty('--cbl-angle',d.angle+'deg');
    }else if((u.cast.destination||u.target?.isConnected&&u.target!==el)&&progress>Math.max(0,1-u.p.travel/scene.speed/u.cast.duration)&&!reduce()){
     if(!u.cast.orb){const n=document.createElement('i');n.className='cbl-fx cast-orb '+family(u.cast.event,u);n.style.setProperty('--cbl-accent',kind(u.action||u.cast.event,u)==='heal'?'#86f3b7':u.p.accent);scene.layer.appendChild(n);u.cast.orb=n}
     const a=pos(el),b=u.cast.destination?{x:bounds.left+u.cast.destination.x/100*bounds.width,y:bounds.top+u.cast.destination.y/100*bounds.height}:pos(u.target),travelFraction=Math.min(1,u.p.travel/scene.speed/u.cast.duration),t=clamp((progress-1+travelFraction)/travelFraction,0,1),n=u.cast.orb;
     n.style.setProperty('--cbl-angle',direction(a,b).angle+'deg');
     n.style.left=(family(u.cast.event,u)==='rubble'?b.x-bounds.left:a.x+(b.x-a.x)*t-bounds.left)+'px';n.style.top=(family(u.cast.event,u)==='rubble'?b.y-bounds.top-60*(1-t):a.y+(b.y-a.y)*t-bounds.top-(family(u.cast.event,u)==='plate'?Math.sin(t*Math.PI)*24:0))+'px';
    }
   }
  }
  for(const f of scene.effects){
   if(now>=f.ends||f.target&&!f.target.isConnected){f.n.remove();scene.effects.delete(f);continue}
   if(f.target){const b=pos(f.target),a=f.source?.isConnected?pos(f.source):b,d=direction(a,b);
    const connection=f.n.classList.contains('connection');f.n.style.left=(connection?a.x:b.x)-bounds.left+'px';f.n.style.top=(connection?a.y:b.y)-bounds.top+'px';
    if(connection){f.n.style.width=d.len+'px';f.n.style.setProperty('--cbl-angle',d.angle+'deg')}
   }
  }
  active=active||scene.live||scene.effects.size>0;
 }
 if(active)wake()
}
function combatEvent(e,opts={}){try{livingEvent(e,opts)}catch(error){console.warn('Living combat visual skipped',e?.type,error)}}
FX.mount=mount;FX.combatEvent=combatEvent;FX.physicalEvent=combatEvent;
FX.encounterThemes=THEMES;FX.ownsHazards=true;FX.visualProfiles=PROFILES;FX.ownsMovement=true;FX.VERSION_PHYSICAL='4.2.0';FX.living=true;
// Legacy public entry points remain callable but no longer duplicate shared reactions.
for(const name of ['impact','heal','death','spawn','interrupt']){const old=FX[name];FX[name]=function(el,...args){if(el?.closest?.('.cbl-scene'))return;return old?.(el,...args)}}
})();
