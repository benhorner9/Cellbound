import {
  ICONS, CLASS_STATS, AI_OPPONENTS, makeBattle, getAbilities, getAbility,
  heroesFor, possibleTargets, possibleSlots, isLegalAction, resolveRound
} from './combat-engine.mjs';

const STORE='banner-bone-foundation-v1';
const PRACTICE_KEY='banner-bone-practice-v1';
const requested=new URLSearchParams(window.location.search).get('opponent');
const opponent=Object.hasOwn(AI_OPPONENTS,requested)?requested:'balanced';
function readRecord(){
  try {
    const saved=JSON.parse(localStorage.getItem(PRACTICE_KEY)||'null');
    if(saved&&['wins','losses','draws'].every(k=>Number.isSafeInteger(saved[k])&&saved[k]>=0))return saved;
  }catch{}
  return {wins:0,losses:0,draws:0};
}
function recordFinish(winner){
  const record=readRecord();
  record[winner==='player'?'wins':winner==='enemy'?'losses':'draws']++;
  try{localStorage.setItem(PRACTICE_KEY,JSON.stringify(record));}catch{}
}
const $=id=>document.getElementById(id);
const htmlSafe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults=[
  {id:1,name:'Garrick',job:'Vanguard'},
  {id:2,name:'Sable',job:'Cutthroat'},
  {id:3,name:'Ilyra',job:'Arcanist'},
  {id:4,name:'Maren',job:'Warden'}
];
let party=null, battle=null, focused=null, targeting=null, plans=new Map(), lastEvents=[];
function loadParty() {
  let data;
  try {
    const raw=localStorage.getItem(STORE);
    if(raw)data=JSON.parse(raw);
  } catch { /* Demo is still playable when localStorage is unavailable. */ }
  if(!data)return defaults;
  if(!Array.isArray(data.heroes)||!Array.isArray(data.party))return null;
  const selected=data.party.map(id=>data.heroes.find(h=>h.id===id));
  if(selected.length!==4||selected.some(h=>!h)||new Set(selected.map(h=>h.id)).size!==4)return null;
  return selected.map(h=>({id:h.id,name:String(h.name).slice(0,48),job:CLASS_STATS[h.job]?h.job:'Vanguard'}));
}
function message(text) { $('impact').textContent=text; $('instructions').textContent=text; }
function begin() {
  party=loadParty();
  if(!party){
    $('error').classList.remove('hidden');
    $('battleArea').classList.add('hidden');
    $('errorText').textContent='A training encounter requires exactly four distinct recruited heroes in your Barracks. Return to the town, select four mercenaries and try again.';
    return;
  }
  $('error').classList.add('hidden');$('battleArea').classList.remove('hidden');
  battle=makeBattle(party,(Date.now()>>>0)||1,opponent);
  $('enemyName').textContent=battle.opponentName.toUpperCase()+' · AI';
  $('battleTitle').textContent='Sparring vs '+battle.opponentName;
  lastEvents=[];
  focused='p0';targeting=null;plans=new Map();
  message('Select a hero, choose an ability and a legal target. Opponent AI plans independently. Training has no time limit.');
  render();
}
function isDone() {return battle.phase==='finished';}
function alivePlayers(){return heroesFor(battle,'player').filter(h=>h.hp>0);}
function activeHero(){return battle.heroes.find(h=>h.id===focused&&h.hp>0);}
function focusNext(){
  const missing=alivePlayers().find(h=>!plans.has(h.id));
  if(missing)focused=missing.id;
  targeting=null;
}
function queue(action){
  if(isDone())return;
  if(!isLegalAction(battle,action)){message('That action is unavailable. Check range, shields, cooldowns and stamina.');return;}
  plans.set(action.actorId,action);
  const actor=battle.heroes.find(h=>h.id===action.actorId),ability=getAbility(actor,action.abilityId);
  const target=battle.heroes.find(h=>h.id===action.targetId);
  const result=actor.name+' plans '+ability.name+(target?' on '+target.name:'')+'.';
  focusNext();
  if(plans.size>=alivePlayers().length)message('All standing heroes are assigned. Lock the round, or select a hero to revise their action.');
  else message(result+' Select the next hero.');
  render();
}
function selectAbility(abilityId){
  if(isDone())return;
  const actor=activeHero();
  if(!actor)return;
  const ability=getAbility(actor,abilityId);
  if(!ability||actor.stamina<ability.cost||(actor.cooldowns[ability.id]||0)>0)return;
  targeting=abilityId;
  $('abilityInfo').textContent=ability.description;
  if(['self','allEnemies','allAllies'].includes(ability.target)){
    queue({actorId:actor.id,abilityId});
    return;
  }
  if(ability.target==='slot'){
    const slots=possibleSlots(battle,actor.id);
    if(!slots.length){message('No empty legal spaces available for this hero.');targeting=null;return;}
    message('Choose an empty position on your side. Rooted heroes cannot move.');
  }else{
    const targets=possibleTargets(battle,actor.id,abilityId);
    if(!targets.length){message('No legal targets for '+ability.name+'.');targeting=null;return;}
    message('Select a highlighted '+(ability.target==='enemy'?'enemy':'ally')+' for '+ability.name+'.');
  }
  render();
}
function selectCell(side,row,lane,id){
  if(isDone())return;
  const actor=activeHero(),ability=actor&&targeting&&getAbility(actor,targeting);
  if(ability && ability.target==='slot'&&side==='player'&&!id){
    queue({actorId:actor.id,abilityId:ability.id,row,lane});
    return;
  }
  if(id&&ability&&possibleTargets(battle,actor.id,ability.id).includes(id)){
    queue({actorId:actor.id,abilityId:ability.id,targetId:id});
    return;
  }
  const hero=battle.heroes.find(h=>h.id===id);
  if(side==='player'&&hero&&hero.hp>0){
    focused=hero.id;targeting=null;
    message(hero.name+' selected. Choose an ability, then an eligible target.');
    render();
  }else if(ability)message('That is not a legal target for '+ability.name+'.');
}
function autoPlanHero(h){
  const legal=abilityId=>{
    const a=getAbility(h,abilityId);
    return a&&h.stamina>=a.cost&&!(h.cooldowns[abilityId]>0);
  };
  const downs=heroesFor(battle,'player').find(t=>t.hp===0&&t.downedRounds>0&&!t.rescueUsed);
  if(downs && legal(h.className==='Warden'?'emergency':'aid'))
    return {actorId:h.id,abilityId:h.className==='Warden'?'emergency':'aid',targetId:downs.id};
  const wounded=heroesFor(battle,'player').filter(t=>t.hp>0&&t.hp/t.maxHp<.72).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(h.className==='Warden'&&wounded&&legal('mend'))return {actorId:h.id,abilityId:'mend',targetId:wounded.id};
  if(h.className==='Ranger'&&legal('volley'))return {actorId:h.id,abilityId:'volley'};
  if(h.className==='Arcanist'&&legal('ember'))return targetAction(h,'ember')||targetAction(h,'basic');
  if(h.className==='Cutthroat'&&legal('backstab'))return targetAction(h,'backstab')||targetAction(h,'basic');
  if(h.className==='Vanguard'&&legal('bash'))return targetAction(h,'bash')||targetAction(h,'basic');
  return targetAction(h,'basic')||{actorId:h.id,abilityId:'defend'};
}
function targetAction(h,id){
  const targets=possibleTargets(battle,h.id,id).map(t=>battle.heroes.find(hero=>hero.id===t));
  targets.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp || a.id.localeCompare(b.id));
  return targets[0]?{actorId:h.id,abilityId:id,targetId:targets[0].id}:null;
}
function fillUnassigned(){
  if(isDone())return;
  for(const h of alivePlayers())if(!plans.has(h.id)){
    const act=autoPlanHero(h);
    plans.set(h.id,isLegalAction(battle,act)?act:{actorId:h.id,abilityId:'defend'});
  }
  targeting=null;
  message('Unassigned heroes have been given suggested actions. You can still revise any of them.');
  render();
}
function lockRound(){
  if(isDone())return;
  fillUnassigned();
  try {
    const result=resolveRound(battle,[...plans.values()]);
    battle=result.battle;plans.clear();targeting=null;
    lastEvents=result.events;
    if(battle.winner)recordFinish(battle.winner);
    focused=alivePlayers()[0]?.id||null;
    const highlight=result.events.filter(e=>e.type!=='round').slice(-2).map(e=>e.text).join(' ');
    message(highlight||'Round resolved.');
    render();
    const struck=result.events.filter(e=>['hit','heal','revive','down','guard'].includes(e.type));
    const highlighted=new Set(struck.slice(-5).map(e=>e.targetId||e.actorId).filter(Boolean));
    for(const id of highlighted){const node=document.querySelector('[data-hero-id="'+id+'"]');if(node){node.classList.add('round-flash');setTimeout(()=>node.classList.remove('round-flash'),700);}}
  } catch(err){message('Combat could not resolve this round: '+String(err.message));}
}
function statusText(h){
  if(h.hp===0)return h.downedRounds>0?'DOWNED · '+h.downedRounds+' ticks':'FALLEN';
  const tokens=[];
  if(h.shield)tokens.push('🛡 '+h.shield);
  for(const [k,v] of Object.entries(h.statuses))if(v>0)tokens.push(k+' '+v);
  return tokens.join(' · ')||'Ready';
}
function tile(h,side,row,lane){
  const clickable=!!h||side==='player';
  const node=document.createElement(clickable?'button':'div');
  if(clickable)node.type='button';
  if(!h){
    node.className='empty';
    node.textContent='+';
    const eligible=side==='player'&&targeting==='move'&&activeHero()&&possibleSlots(battle,focused).some(s=>s.row===row&&s.lane===lane);
    if(eligible)node.classList.add('eligible');
    if(clickable)node.disabled=!eligible;
    if(clickable)node.setAttribute('aria-label','Empty '+row+' position, lane '+(lane+1));
  }else{
    node.className='fighter '+(side==='enemy'?'enemy-unit':'')+(h.id===focused?' chosen':'')+(h.hp===0?' '+(h.downedRounds>0?'downed':'dead'):'');
    node.dataset.heroId=h.id;
    const pct=Math.round(h.hp/h.maxHp*100);
    node.innerHTML='<span class="portrait" aria-hidden="true">'+(ICONS[h.className]||'⚔️')+'</span>'
      +'<span class="name">'+htmlSafe(h.name)+'</span>'
      +'<span class="hp-track"><span class="hp-fill" style="width:'+pct+'%;display:block"></span></span>'
      +'<span class="stats">'+h.hp+'/'+h.maxHp+' HP · '+h.stamina+' SP</span>'
      +'<span class="statuses">'+htmlSafe(statusText(h))+'</span>';
    node.setAttribute('aria-label',h.name+', '+h.className+', '+h.hp+' of '+h.maxHp+' health, '+statusText(h));
    const actor=activeHero(),ability=actor&&targeting&&getAbility(actor,targeting);
    if(ability&&possibleTargets(battle,actor.id,ability.id).includes(h.id))node.classList.add('eligible');
    if(h.hp===0 && h.downedRounds===0)node.disabled=true;
  }
  if(clickable)node.addEventListener('click',()=>selectCell(side,row,lane,h?.id||null));
  return node;
}
function rank(team,row,elementId){
  const element=$(elementId);element.replaceChildren();
  for(let lane=0;lane<3;lane++){
    const hero=heroesFor(battle,team).find(h=>h.row===row&&h.lane===lane&&(h.hp>0||h.downedRounds>0));
    element.appendChild(tile(hero,team,row,lane));
  }
}
function renderAbilities(){
  const container=$('abilities');container.replaceChildren();
  const actor=activeHero();
  $('selectedName').textContent=actor?actor.name+' · '+actor.className:'No standing mercenary';
  $('selectedStats').textContent=actor?actor.hp+'/'+actor.maxHp+' HP · '+actor.stamina+'/'+actor.maxStamina+' stamina · '+actor.speed+' initiative':'';
  if(!actor)return;
  for(const ability of getAbilities(actor)){
    const cd=actor.cooldowns[ability.id]||0;
    const button=document.createElement('button');
    button.type='button';
    button.className='ability'+(targeting===ability.id?' active':'');
    button.title=ability.description;
    button.disabled=isDone()||cd>0||actor.stamina<ability.cost||(ability.target==='slot'&&!possibleSlots(battle,actor.id).length)
      ||(['enemy','ally','downed'].includes(ability.target)&&!possibleTargets(battle,actor.id,ability.id).length);
    const detail=cd>0?'Cooldown '+cd:'Cost '+ability.cost+' stamina';
    button.innerHTML=htmlSafe(ability.name)+'<small>'+htmlSafe(detail)+'</small>';
    button.addEventListener('click',()=>selectAbility(ability.id));
    container.appendChild(button);
  }
}
function renderQueue(){
  const container=$('queue');container.replaceChildren();
  for(const hero of heroesFor(battle,'player')){
    const a=plans.get(hero.id),ability=a&&getAbility(hero,a.abilityId);
    const target=a&&battle.heroes.find(h=>h.id===a.targetId);
    const label=hero.hp>0?(ability?ability.name+(target?' → '+target.name:''):'Not assigned · defaults to Defend'):(hero.downedRounds>0?'DOWNED':'FALLEN');
    const node=document.createElement('div');node.className='queue-row';
    node.innerHTML='<b>'+htmlSafe(hero.name)+'</b><br><span>'+htmlSafe(label)+'</span>';
    container.appendChild(node);
  }
}
function render(){
  $('round').textContent=String(battle.round);
  $('phase').textContent=isDone()?'Training finished':'Untimed AI practice';
  $('planningCount').textContent=plans.size+'/'+alivePlayers().length+' planned';
  $('allyStanding').textContent=alivePlayers().length+' standing';
  $('enemyStanding').textContent=heroesFor(battle,'enemy').filter(h=>h.hp>0).length+' standing';
  rank('player','rear','allyRear');rank('player','front','allyFront');
  rank('enemy','front','enemyFront');rank('enemy','rear','enemyRear');
  renderAbilities();renderQueue();
  const description=activeHero()&&targeting?getAbility(activeHero(),targeting)?.description:null;
  if(!description)$('abilityInfo').textContent='Choose an ability to read its effect. You can select a different hero to revise their action before locking the round.';
  $('roundRecap').replaceChildren();
  if(!lastEvents.length)$('roundRecap').textContent='The first round has not been played.';
  else for(const event of lastEvents.filter(e=>e.type!=='round').slice(-8)){
    const item=document.createElement('div');item.className='recap-event recap-'+event.type;item.textContent=event.text;
    $('roundRecap').appendChild(item);
  }
  const rec=readRecord();
  $('matchRecord').textContent='Local practice record: '+rec.wins+' W · '+rec.losses+' L · '+rec.draws+' D';
  $('fill').disabled=isDone();$('commit').disabled=isDone();
  $('log').replaceChildren();
  for(const entry of battle.log.slice(0,50)){
    const item=document.createElement('div');item.className='log-item';item.textContent=entry;$('log').appendChild(item);
  }
  $('result').classList.toggle('hidden',!isDone());
  if(isDone())$('result').textContent=battle.winner==='player'?'VICTORY — Your company defeated the '+battle.opponentName+'. All heroes return safely.':battle.winner==='enemy'?'DEFEAT — The '+battle.opponentName+' win this sparring match. Your heroes return safely.':'DRAW — Both companies fought to a standstill. No lasting losses.';
}
$('fill').addEventListener('click',fillUnassigned);
$('commit').addEventListener('click',lockRound);
$('restart').addEventListener('click',begin);
begin();
