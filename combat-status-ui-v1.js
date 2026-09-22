(()=>{
'use strict';

const ACTIVE_TYPES=new Set(['BUFF_APPLIED','DEBUFF_APPLIED','BUFF_REFRESHED','DEBUFF_REFRESHED','BUFF_STACKED','DEBUFF_STACKED','BUFF_REMOVED','DEBUFF_REMOVED','BUFF_EXPIRED','DEBUFF_EXPIRED','BUFF_CLEANSED','DEBUFF_CLEANSED']);
const hosts=new Set();
let tooltip=null,ticker=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const slug=v=>String(v||'status').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const pct=v=>Math.round(Number(v||0)*100);
const ICONS={
 OFF_BLADE:0,OFF_SPEED:1,OFF_CRIT:2,OFF_IMPACT:3,OFF_POWER:4,OFF_FURY:5,OFF_BLOOD:6,OFF_TOXIN:7,OFF_ARCANE:8,OFF_CLEAVE:9,OFF_RAGE:10,OFF_ASCEND:11,OFF_ELIXIR:12,
 DEF_SHIELD:13,DEF_ARMOR:14,DEF_PARRY:15,DEF_DODGE:16,DEF_WARD:17,DEF_REDUCTION:18,DEF_THORNS:19,DEF_HEALWARD:20,DEF_REGEN:21,DEF_GUARDIAN:22,DEF_FORTRESS:23,DEF_BARRIER:24,DEF_ARCANE:25,DEF_RECOVERY:26,
 SUP_NATURE:27,SUP_GROUP_HEAL:28,SUP_HOT:29,SUP_HOLY:30,SUP_RESOURCE:31,SUP_HASTE:32,SUP_EMPOWER_HEAL:33,SUP_RADIANCE:34,SUP_SPEED:35,SUP_PARTY_GUARD:36,
 ENEMY_POISON:37,ENEMY_BLEED:38,ENEMY_BURN:39,ENEMY_CURSE:40,ENEMY_FEAR:41,ENEMY_SILENCE:42,ENEMY_DAZE:43,ENEMY_FREEZE:44,ENEMY_ROOT:45,ENEMY_VULNERABLE:46,ENEMY_ARMOR_BREAK:47,
 ENEMY_HEAL_REDUCE:48,ENEMY_SHADOW:49,ENEMY_MARK:50,ENEMY_MIND:51,ENEMY_TERROR:52,ENEMY_DISPLACE:53,ENEMY_ADDS:54,ENEMY_GROUND:55,ENEMY_DOOM:56,ENEMY_DEMONIC:57,
 PLAYER_WEAKEN:58,PLAYER_ARMOR_BREAK:59,PLAYER_BLEED:60,PLAYER_STUN:61,PLAYER_ROOT:62,PLAYER_MARK:63,PLAYER_SILENCE:64,PLAYER_BURN:65,PLAYER_FREEZE:66,PLAYER_SHOCK:67
};
const STATUS_ICON={
 'class-buff-runic-ascendance':ICONS.OFF_ARCANE,'class-buff-demonic-momentum':ICONS.OFF_SPEED,'class-buff-predators-focus':ICONS.OFF_CRIT,
 'class-buff-killing-tempo':ICONS.OFF_CLEAVE,'class-buff-battle-fury':ICONS.OFF_RAGE,'class-buff-arcane-empowerment':ICONS.OFF_ARCANE,
 'class-buff-divine-inspiration':ICONS.SUP_RADIANCE,'class-buff-wild-communion':ICONS.SUP_NATURE,'class-buff-blessing-resolve':ICONS.DEF_SHIELD,
 'class-buff-draconic-resonance':ICONS.SUP_HASTE,'battle-rhythm':ICONS.OFF_SPEED,'blood-frenzy-talent':ICONS.OFF_RAGE,
 'cut-to-the-chase':ICONS.SUP_SPEED,'arcane-surge-talent':ICONS.OFF_ASCEND,'renew-talent':ICONS.SUP_HOT,'infusion':ICONS.SUP_HASTE,
 'ironbark-talent':ICONS.DEF_THORNS,'tree-of-life':ICONS.SUP_NATURE,'arcane-power':ICONS.OFF_ARCANE,'last-stand-talent':ICONS.DEF_GUARDIAN,
 'unbroken':ICONS.DEF_GUARDIAN,'guardian-last-stand':ICONS.DEF_GUARDIAN,'vengeance-talent':ICONS.OFF_FURY,'hold-the-line':ICONS.DEF_PARRY,
 'righteous-guard':ICONS.DEF_SHIELD,'bulwark-party':ICONS.SUP_PARTY_GUARD,'divine-guardian-party':ICONS.SUP_PARTY_GUARD,
 'frostbound-sigil-shield':ICONS.DEF_ARCANE,'soft-enrage':ICONS.OFF_RAGE,'hard-enrage':ICONS.OFF_RAGE,'blood-frenzy':ICONS.OFF_RAGE,
 'shield-wall':ICONS.DEF_SHIELD,'ardent-defender':ICONS.DEF_ARMOR,'divine-protection':ICONS.DEF_SHIELD,'barkskin':ICONS.DEF_THORNS,
 'blur':ICONS.DEF_DODGE,'obsidian-scales':ICONS.DEF_ARMOR,'arcane-ward':ICONS.DEF_ARCANE,'feint':ICONS.DEF_DODGE,'icebound-fortitude':ICONS.DEF_ARCANE,
 'guardian-spirit':ICONS.DEF_GUARDIAN,'hammer-of-justice':ICONS.PLAYER_STUN,'concussive-shot':ICONS.PLAYER_STUN,'tactical-control':ICONS.PLAYER_ROOT
};
function enemyApplied(st){const s=String(st?.source||''),t=String(st?.target||'');return(st?.kind==='debuff')&&(s.startsWith('e-')||s.startsWith('add-'))&&t.startsWith('p-')}
function playerApplied(st){const s=String(st?.source||''),t=String(st?.target||'');return(st?.kind==='debuff')&&s.startsWith('p-')&&(t.startsWith('e-')||t.startsWith('add-'))}
function iconIndex(st){
 const id=String(st?.id||''),name=String(st?.name||'').toLowerCase(),e=st?.effect||{},cc=String(st?.cc||'').toLowerCase();
 if(STATUS_ICON[id]!=null)return STATUS_ICON[id];
 if(id.startsWith('tactical-control-add-'))return ICONS.PLAYER_ROOT;
 if(id.endsWith('-hot')||Number(e.healingOverTime)>0)return ICONS.SUP_HOT;
 if(st?.kind==='buff'){
  if(/renew|rejuven|lifebloom|regrowth/.test(name))return ICONS.SUP_HOT;
  if(/guardian|last stand|unbroken|spirit/.test(name))return ICONS.DEF_GUARDIAN;
  if(/shield wall|shield|resolve|bulwark/.test(name))return ICONS.DEF_SHIELD;
  if(/armor|fortress|scales|fortitude|defender/.test(name))return ICONS.DEF_ARMOR;
  if(/barrier|ward|frozen response/.test(name))return ICONS.DEF_ARCANE;
  if(/bark|thorn|ironbark/.test(name))return ICONS.DEF_THORNS;
  if(/blur|dodge|feint/.test(name))return ICONS.DEF_DODGE;
  if(Number(e.incomingDamageReduction)>0||Number(e.damageReduction)>0)return ICONS.DEF_REDUCTION;
  if(Number(e.outgoingHealing)>0||Number(e.incomingHealing)>0)return /nature|wild|tree/.test(name)?ICONS.SUP_NATURE:ICONS.SUP_RADIANCE;
  if(Number(e.resourceRegen)>0&&!Number(e.outgoingDamage))return ICONS.SUP_RESOURCE;
  if(Number(e.haste)>0&&!Number(e.outgoingDamage))return ICONS.SUP_HASTE;
  if(Number(e.critBonus)>0||/focus|precision|aim/.test(name))return ICONS.OFF_CRIT;
  if(Number(e.threatBonus)>0)return ICONS.OFF_ASCEND;
  if(/frenzy|rage|vengeance|enrage|fury/.test(name))return ICONS.OFF_RAGE;
  if(/cleave|sweep|tempo/.test(name))return ICONS.OFF_CLEAVE;
  if(/arcane|runic|surge/.test(name))return ICONS.OFF_ARCANE;
  if(Number(e.outgoingDamage)>0||Number(e.damageMultiplier)>0)return ICONS.OFF_BLADE;
  return ICONS.OFF_ASCEND
 }
 if(enemyApplied(st)){
  if(/poison|venom|toxin|disease|sickness/.test(name))return ICONS.ENEMY_POISON;
  if(/bleed|blood|wound|agony/.test(name))return ICONS.ENEMY_BLEED;
  if(/burn|fire|flame|ember|scorch/.test(name))return ICONS.ENEMY_BURN;
  if(/fear|terror|panic|scream/.test(name)||cc==='fear')return ICONS.ENEMY_FEAR;
  if(/silence|mute/.test(name)||cc==='silence')return ICONS.ENEMY_SILENCE;
  if(/stun|daze|disorient/.test(name)||cc==='stun')return ICONS.ENEMY_DAZE;
  if(/freeze|frost|ice/.test(name)||cc==='freeze')return ICONS.ENEMY_FREEZE;
  if(/root|snare|vine|thorn/.test(name)||cc==='root')return ICONS.ENEMY_ROOT;
  if(Number(e.healingReduction)>0||/mortal|healing/.test(name))return ICONS.ENEMY_HEAL_REDUCE;
  if(/armor|sunder|shatter/.test(name))return ICONS.ENEMY_ARMOR_BREAK;
  if(/vulner|frail|crack|scar|exposed/.test(name)||Number(e.damageTakenIncrease)>0||Number(e.incomingDamageIncrease)>0)return ICONS.ENEMY_VULNERABLE;
  if(/mark|gaze|eye/.test(name))return ICONS.ENEMY_MARK;
  if(/mind|charm|control/.test(name))return ICONS.ENEMY_MIND;
  if(/add|summon|reinforcement/.test(name))return ICONS.ENEMY_ADDS;
  if(/ground|pool|zone|eruption/.test(name))return ICONS.ENEMY_GROUND;
  if(/doom|warning|fatal/.test(name))return ICONS.ENEMY_DOOM;
  if(/demon|corrupt/.test(name))return ICONS.ENEMY_DEMONIC;
  if(/shadow|curse|despair|hex/.test(name))return ICONS.ENEMY_SHADOW;
  return ICONS.ENEMY_CURSE
 }
 if(playerApplied(st)){
  if(/bleed|blood|wound|garrote/.test(name))return ICONS.PLAYER_BLEED;
  if(/burn|fire|flame/.test(name))return ICONS.PLAYER_BURN;
  if(/freeze|frost|ice/.test(name))return ICONS.PLAYER_FREEZE;
  if(/shock|lightning|storm/.test(name))return ICONS.PLAYER_SHOCK;
  if(/stun|daze|hammer/.test(name)||cc==='stun')return ICONS.PLAYER_STUN;
  if(/root|chain|snare|control/.test(name)||cc==='root')return ICONS.PLAYER_ROOT;
  if(/silence|interrupt|lock/.test(name)||cc==='silence')return ICONS.PLAYER_SILENCE;
  if(/armor|sunder|shatter/.test(name))return ICONS.PLAYER_ARMOR_BREAK;
  if(/mark|death|target/.test(name))return ICONS.PLAYER_MARK;
  return ICONS.PLAYER_WEAKEN
 }
 if(/poison|venom|toxin/.test(name))return ICONS.ENEMY_POISON;
 if(/bleed|blood|wound|agony/.test(name))return ICONS.ENEMY_BLEED;
 if(/burn|fire|flame|ember/.test(name))return ICONS.ENEMY_BURN;
 if(/freeze|frost|ice/.test(name))return ICONS.ENEMY_FREEZE;
 if(/root|snare/.test(name)||cc==='root')return ICONS.ENEMY_ROOT;
 if(/stun|daze/.test(name)||cc==='stun')return ICONS.ENEMY_DAZE;
 if(/silence/.test(name)||cc==='silence')return ICONS.ENEMY_SILENCE;
 return ICONS.ENEMY_CURSE
}
function iconStyle(st){
 const idx=iconIndex(st),x=idx%8,y=Math.floor(idx/8);
 return'--cbs-bg-x:'+(x/7*100).toFixed(4)+'%;--cbs-bg-y:'+(y/8*100).toFixed(4)+'%'
}
function effectText(st){
 const e=st?.effect||{},bits=[];
 const damageReduction=Number(e.damageReduction)||0,incomingReduction=Number(e.incomingDamageReduction)||0;
 if(damageReduction>0)bits.push('Damage taken −'+pct(damageReduction)+'%');
 if(damageReduction<0)bits.push('Damage taken +'+pct(Math.abs(damageReduction))+'%');
 if(Number(e.damageTakenIncrease)>0)bits.push('Damage taken +'+pct(e.damageTakenIncrease)+'%');
 if(Number(e.incomingDamageIncrease)>0)bits.push('Damage taken +'+pct(e.incomingDamageIncrease)+'%');
 if(Number(e.damageReceivedIncrease)>0)bits.push('Damage taken +'+pct(e.damageReceivedIncrease)+'%');
 if(Number(e.incomingDamageMultiplier)>1)bits.push('Damage taken +'+pct(Number(e.incomingDamageMultiplier)-1)+'%');
 if(Number(e.damageMultiplier))bits.push('Damage +'+pct(e.damageMultiplier)+'%');
 if(Number(e.outgoingDamage))bits.push('Damage +'+pct(e.outgoingDamage)+'%');
 if(incomingReduction>0)bits.push('Damage taken −'+pct(incomingReduction)+'%');
 if(incomingReduction<0)bits.push('Damage taken +'+pct(Math.abs(incomingReduction))+'%');
 if(Number(e.critBonus))bits.push('Critical chance +'+pct(e.critBonus)+'%');
 if(Number(e.haste))bits.push('Haste +'+pct(e.haste)+'%');
 if(Number(e.resourceRegen))bits.push('Resource regeneration +'+pct(e.resourceRegen)+'%');
 if(Number(e.outgoingHealing))bits.push('Healing done +'+pct(e.outgoingHealing)+'%');
 if(Number(e.incomingHealing))bits.push('Healing received +'+pct(e.incomingHealing)+'%');
 if(Number(e.healingMultiplier))bits.push('Healing +'+pct(e.healingMultiplier)+'%');
 if(Number(e.healingReduction)>0)bits.push('Healing received −'+pct(e.healingReduction)+'%');
 if(Number(e.outgoingDamageReduction)>0)bits.push('Damage dealt −'+pct(e.outgoingDamageReduction)+'%');
 if(Number(e.outgoingHealingReduction)>0)bits.push('Healing done −'+pct(e.outgoingHealingReduction)+'%');
 if(Number(e.hasteReduction)>0)bits.push('Haste −'+pct(e.hasteReduction)+'%');
 if(Number(e.threatBonus))bits.push('Threat +'+pct(e.threatBonus)+'%');
 if(Number(e.threatMultiplier))bits.push('Threat +'+pct(e.threatMultiplier)+'%');
 if(Number(e.healingOverTime))bits.push('Restores '+Number(e.healingOverTime)+' health periodically');
 if(st?.cc)bits.push(String(st.cc).replace(/-/g,' '));
 if(st?.breakOnDamage)bits.push('Breaks on damage');
 return bits.length?bits.join(' · '):(st?.kind==='debuff'?'Harmful combat effect':'Beneficial combat effect')
}
function sourceName(source,opts){
 if(!source)return'Unknown';
 try{
  const label=opts?.sourceName?.(source);
  if(label)return label
 }catch{}
 const el=opts?.resolve?.(source);
 const node=Array.isArray(el)?el[0]:el;
 const txt=node?.querySelector?.('span,small,b')?.textContent?.trim();
 return txt||String(source).replace(/^p-|^e-/,'')
}
function ensureTooltip(){
 if(tooltip&&tooltip.isConnected)return tooltip;
 tooltip=document.createElement('div');tooltip.className='cbs-tooltip';tooltip.hidden=true;document.body.appendChild(tooltip);
 document.addEventListener('pointerdown',e=>{if(!tooltip.hidden&&!e.target.closest?.('.cbs-icon')&&!e.target.closest?.('.cbs-tooltip'))tooltip.hidden=true},{passive:true});
 return tooltip
}
function showTooltip(button,st){
 const tip=ensureTooltip(),remaining=Math.max(0,Number(button.dataset.remaining)||0);
 tip.innerHTML='<div class="cbs-tooltip-head"><i class="cbs-tooltip-art '+st.kind+'" style="'+iconStyle(st)+'"></i><span><small>'+esc(st.kind.toUpperCase())+'</small><b>'+esc(st.name)+'</b></span></div><p>'+esc(effectText(st))+'</p><div><span>Source <b>'+esc(st.sourceLabel||'Unknown')+'</b></span><span>Stacks <b>'+Math.max(1,Number(st.stacks)||1)+'</b></span><span>Remaining <b>'+((remaining/1000).toFixed(1))+'s</b></span></div>';
 const r=button.getBoundingClientRect();tip.hidden=false;
 requestAnimationFrame(()=>{
  const w=tip.offsetWidth||250,h=tip.offsetHeight||120;
  tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';
  tip.style.top=Math.max(8,r.top-h-8)+'px'
 })
}
function stripFor(host,mirror=false){
 if(!host)return null;
 host.classList.add('cbs-host');hosts.add(host);
 let strip=host.querySelector(':scope > .cbs-strip');
 if(!strip){strip=document.createElement('div');strip.className='cbs-strip'+(mirror?' mirror':'');strip.innerHTML='<span class="cbs-group buffs"></span><span class="cbs-group debuffs"></span>';host.appendChild(strip)}
 if(mirror)strip.classList.add('mirror');
 return strip
}
function statusMap(host){
 if(!host.__cellboundStatuses)host.__cellboundStatuses=new Map();
 return host.__cellboundStatuses
}
function harmfulStatus(raw,e){
 const effect=raw?.effect||{},name=String(raw?.name||e?.ability||'').toLowerCase(),source=String(raw?.source||e?.source||''),target=String(e?.target||'');
 if(raw?.kind==='debuff'||e?.type?.startsWith?.('DEBUFF'))return true;
 if((source.startsWith('e-')||source.startsWith('add-'))&&target.startsWith('p-')&&raw?.kind!=='buff')return true;
 if(raw?.cc)return true;
 if(/chaos scar|curse|vulner|poison|venom|bleed|burn|wound|agony|despair|sickness|disease|weak|frail|slow|stun|root|silence|snare/.test(name))return true;
 if((Number(effect.damageReduction)||0)<0||(Number(effect.incomingDamageReduction)||0)<0)return true;
 if(Number(effect.damageTakenIncrease)>0||Number(effect.incomingDamageIncrease)>0||Number(effect.damageReceivedIncrease)>0)return true;
 if(Number(effect.incomingDamageMultiplier)>1||Number(effect.healingReduction)>0)return true;
 if(Number(effect.outgoingDamageReduction)>0||Number(effect.outgoingHealingReduction)>0||Number(effect.hasteReduction)>0)return true;
 return false
}
function normaliseStatus(e){
 const raw=Array.isArray(e.statusEffects)&&e.statusEffects[0]?e.statusEffects[0]:{};
 const kind=harmfulStatus(raw,e)?'debuff':(raw.kind==='buff'||e.type.startsWith('BUFF')?'buff':'debuff');
 return{
  id:raw.id||slug(e.ability||'status'),name:raw.name||e.ability||'Status',kind,target:e.target||null,
  stacks:Math.max(1,Number(raw.stacks)||1),duration:Math.max(0,Number(raw.duration)||0),
  expiresAt:Number(raw.expiresAt)||0,source:raw.source||e.source||null,effect:raw.effect||{},
  cc:raw.cc||null,breakOnDamage:!!raw.breakOnDamage
 }
}
function renderHost(host,opts={}){
 const map=statusMap(host),strip=stripFor(host,!!opts.mirror),now=performance.now();
 const all=[...map.values()].filter(x=>!x.endReal||x.endReal>now);
 map.forEach((v,k)=>{if(v.endReal&&v.endReal<=now)map.delete(k)});
 const draw=(kind,root)=>{
  const list=all.filter(x=>x.kind===kind).sort((a,b)=>(a.endReal||Infinity)-(b.endReal||Infinity)),shown=list.slice(0,4);
  const rendered=shown.map(st=>{
   const remain=st.endReal?Math.max(0,st.endReal-now):0,sec=st.endReal?Math.max(1,Math.ceil(remain/1000)):'∞';
   return{st,remain,sec}
  });
  const signature=rendered.map(x=>x.st.id+':'+x.st.stacks+':'+x.sec).join('|')+'|more:'+(list.length>4?list.length-4:0);
  if(root.dataset.cbsSignature===signature)return;
  root.dataset.cbsSignature=signature;
  root.innerHTML=rendered.map(({st,remain,sec})=>{
   return '<button type="button" class="cbs-icon '+kind+'" data-cbs-id="'+esc(st.id)+'" data-remaining="'+remain+'" aria-label="'+esc(st.name)+'"><i class="cbs-art" style="'+iconStyle(st)+'"></i><small>'+sec+'</small>'+(st.stacks>1?'<b>'+st.stacks+'</b>':'')+'</button>'
  }).join('')+(list.length>4?'<span class="cbs-more '+kind+'">+'+(list.length-4)+'</span>':'');
  root.querySelectorAll('.cbs-icon').forEach(b=>b.addEventListener('click',ev=>{ev.stopPropagation();const st=map.get(b.dataset.cbsId);if(st)showTooltip(b,st)}))
 };
 draw('buff',strip.querySelector('.buffs'));draw('debuff',strip.querySelector('.debuffs'));
 strip.hidden=!all.length;
}
function targetsFor(id,opts={}){
 let arr=[];
 try{const v=opts.resolve?.(id);arr=Array.isArray(v)?v:[v]}catch{}
 arr=arr.filter(Boolean).map(x=>({el:x.el||x,mirror:!!x.mirror})).filter(x=>x.el);
 return arr
}
function handle(e,opts={}){
 if(!e)return false;
 const speed=Math.max(.25,Number(opts.speed?.()??opts.speed)||1);
 if(e.type==='TALENT_TRIGGER'){
  const target=e.target||e.source;
  targetsFor(target,opts).forEach(({el})=>{
   if(!el)return;
   let proc=el.querySelector(':scope > .cbs-talent-proc');
   if(!proc){proc=document.createElement('span');proc.className='cbs-talent-proc';el.appendChild(proc)}
   proc.textContent=e.ability||e.payload?.talent||'Talent';
   proc.classList.remove('show');requestAnimationFrame(()=>proc.classList.add('show'));
   clearTimeout(proc.__hideTimer);proc.__hideTimer=setTimeout(()=>proc?.classList.remove('show'),Math.max(450,1100/speed))
  });
  return true
 }
 if(!ACTIVE_TYPES.has(e.type))return false;
 const st=normaliseStatus(e),remove=/(?:_REMOVED|_EXPIRED|_CLEANSED)$/.test(e.type);
 targetsFor(e.target,opts).forEach(({el,mirror})=>{
  const map=statusMap(el);
  if(remove)map.delete(st.id);
  else{
   const remaining=st.expiresAt?Math.max(0,st.expiresAt-Number(e.timestamp||0)):st.duration;
   map.set(st.id,{...st,sourceLabel:sourceName(st.source,opts),endReal:remaining>0?performance.now()+remaining/speed:0})
  }
  renderHost(el,{...opts,mirror})
 });
 startTicker();
 return true
}
function clear(root=document){
 root.querySelectorAll?.('.cbs-host').forEach(el=>{el.__cellboundStatuses?.clear?.();const strip=el.querySelector(':scope > .cbs-strip');if(strip)strip.remove();hosts.delete(el)});
 if(tooltip)tooltip.hidden=true
}
function startTicker(){
 if(ticker)return;
 ticker=setInterval(()=>{
  if(!hosts.size){clearInterval(ticker);ticker=null;return}
  [...hosts].forEach(host=>{
   if(!host?.isConnected){hosts.delete(host);return}
   renderHost(host,{mirror:host.querySelector(':scope > .cbs-strip')?.classList.contains('mirror')})
  })
 },1000)
}

window.CellboundCombatStatuses={handle,clear,renderHost,iconIndex,iconStyle,version:'2.0.0'};
})();