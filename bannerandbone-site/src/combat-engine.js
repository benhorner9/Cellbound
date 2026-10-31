// Banner & Bone — Block 02 standalone deterministic tactical battle rules.
// Local PvE practice only. No PvP, rewards, injury or permanent roster mutation.
export const ICONS = Object.freeze({
  Vanguard: '🛡️', Cutthroat: '🗡️', Ranger: '🏹', Arcanist: '✨', Warden: '✚'
});
export const CLASS_STATS = Object.freeze({
  Vanguard: { hp: 126, speed: 5, armor: 5, basic: 14, reach: 'melee' },
  Cutthroat: { hp: 92, speed: 11, armor: 1, basic: 15, reach: 'melee' },
  Ranger: { hp: 96, speed: 9, armor: 2, basic: 14, reach: 'ranged' },
  Arcanist: { hp: 84, speed: 7, armor: 1, basic: 15, reach: 'ranged' },
  Warden: { hp: 104, speed: 6, armor: 3, basic: 10, reach: 'ranged' }
});
const UNIVERSAL = [
  { id: 'basic', name: 'Basic Attack', cost: 0, cooldown: 0, kind: 'damage', target: 'enemy', power: 0, description: 'Reliable weapon attack. Melee attacks respect lanes and front-rank cover.' },
  { id: 'defend', name: 'Defend', cost: 0, cooldown: 0, kind: 'defend', target: 'self', description: 'Gain 14 shield and reduce incoming damage this round.' },
  { id: 'move', name: 'Reposition', cost: 0, cooldown: 0, kind: 'move', target: 'slot', description: 'Move to an empty position on your side (rooted heroes cannot move).' },
  { id: 'aid', name: 'Field Aid', cost: 2, cooldown: 2, kind: 'revive', target: 'downed', power: 20, description: 'Rescue one downed ally for 20 HP. Each hero can be rescued only once per battle.' }
];
const UNIQUE = Object.freeze({
  Vanguard: [
    { id: 'bash', name: 'Shield Bash', cost: 2, cooldown: 2, kind: 'damage', target: 'enemy', reach: 'melee', power: 17, stun: 1, description: 'Melee hit. Stuns a target that has not acted yet this round.' },
    { id: 'hold', name: 'Hold the Line', cost: 2, cooldown: 2, kind: 'defend', target: 'self', shield: 26, description: 'Gain 26 shield. Protect the allied rear-rank hero in the same lane with 10 shield and Cover.' },
    { id: 'challenge', name: 'Challenge', cost: 1, cooldown: 2, kind: 'taunt', target: 'self', description: 'Draw enemy AI attacks for the next round, if you remain a legal target.' },
    { id: 'crush', name: 'Crushing Strike', cost: 3, cooldown: 2, kind: 'damage', target: 'enemy', reach: 'melee', power: 30, description: 'Heavy melee strike. Most effective against exposed targets.' }
  ],
  Cutthroat: [
    { id: 'backstab', name: 'Backstab', cost: 2, cooldown: 1, kind: 'damage', target: 'enemy', reach: 'melee', bypass: true, power: 23, description: 'Ignores front-rank protection; deals extra damage to rear-rank enemies.' },
    { id: 'poison', name: 'Poison Blade', cost: 2, cooldown: 2, kind: 'damage', target: 'enemy', reach: 'melee', power: 13, poison: 2, description: 'Apply poison damage over two rounds.' },
    { id: 'shadow', name: 'Shadowstep', cost: 1, cooldown: 2, kind: 'shadow', target: 'self', description: 'Gain 12 shield and empower your next attack.' },
    { id: 'execute', name: 'Execute', cost: 3, cooldown: 2, kind: 'damage', target: 'enemy', reach: 'melee', power: 17, execute: true, description: 'Deals massive bonus damage to enemies below 40% HP.' }
  ],
  Ranger: [
    { id: 'aimed', name: 'Aimed Shot', cost: 2, cooldown: 1, kind: 'damage', target: 'enemy', reach: 'ranged', power: 24, description: 'Accurate single-target ranged attack.' },
    { id: 'volley', name: 'Volley', cost: 3, cooldown: 3, kind: 'area', target: 'allEnemies', power: 12, description: 'Hit every standing enemy. Damage is reduced by armour.' },
    { id: 'pin', name: 'Pinning Arrow', cost: 2, cooldown: 2, kind: 'damage', target: 'enemy', reach: 'ranged', power: 15, root: 2, description: 'Pin an enemy in place for two rounds.' },
    { id: 'mark', name: "Hunter's Mark", cost: 1, cooldown: 2, kind: 'mark', target: 'enemy', description: 'Mark a target; subsequent allied attacks deal bonus damage.' }
  ],
  Arcanist: [
    { id: 'ember', name: 'Ember Bolt', cost: 2, cooldown: 1, kind: 'damage', target: 'enemy', reach: 'ranged', power: 18, burn: 2, description: 'Magic strike that burns for two rounds.' },
    { id: 'frost', name: 'Frostbind', cost: 2, cooldown: 2, kind: 'damage', target: 'enemy', reach: 'ranged', power: 11, root: 2, description: 'Magic damage and a two-round root.' },
    { id: 'barrier', name: 'Arcane Barrier', cost: 2, cooldown: 2, kind: 'shield', target: 'ally', power: 25, description: 'Grant 25 shield to a living ally.' },
    { id: 'chain', name: 'Chain Lightning', cost: 4, cooldown: 3, kind: 'area', target: 'allEnemies', power: 16, description: 'Magic damage to all standing enemies.' }
  ],
  Warden: [
    { id: 'mend', name: 'Mend Wounds', cost: 2, cooldown: 1, kind: 'heal', target: 'ally', power: 30, description: 'Restore 30 HP to a standing ally.' },
    { id: 'purify', name: 'Purify', cost: 2, cooldown: 2, kind: 'cleanse', target: 'ally', power: 14, description: 'Heal 14 and remove poison, burn and root.' },
    { id: 'rally', name: 'Rally', cost: 3, cooldown: 3, kind: 'rally', target: 'allAllies', power: 11, description: 'Heal standing allies and grant each 9 shield.' },
    { id: 'emergency', name: 'Emergency Aid', cost: 3, cooldown: 2, kind: 'revive', target: 'downed', power: 42, description: 'Rescue a downed ally for 42 HP; each hero can be rescued only once.' }
  ]
});
export const CLASS_ABILITIES = UNIQUE;

export function getAbilities(hero) {
  const basic = { ...UNIVERSAL[0], reach: CLASS_STATS[hero.className].reach, power: CLASS_STATS[hero.className].basic };
  return [basic, ...UNIVERSAL.slice(1), ...UNIQUE[hero.className]];
}
export function getAbility(hero, id) { return getAbilities(hero).find(a => a.id === id) || null; }
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const living = h => !!h && h.hp > 0;
const random = battle => {
  battle.seed = ((battle.seed >>> 0) * 1664525 + 1013904223) >>> 0;
  return battle.seed / 4294967296;
};
function createHero(person, team, i) {
  const className = CLASS_STATS[person.job] ? person.job : 'Vanguard';
  const stats = CLASS_STATS[className];
  const spots = [['front',0],['front',2],['rear',0],['rear',2]];
  return {
    id: team === 'player' ? 'p'+i : 'e'+i,
    rosterId: team === 'player' ? person.id : null,
    name: String(person.name).slice(0,48), className, team,
    row: spots[i][0], lane: spots[i][1],
    maxHp: stats.hp, hp: stats.hp, speed: stats.speed, armor: stats.armor,
    shield: 0, stamina: 5, maxStamina: 6,
    cooldowns: {}, statuses: {}, downedRounds: 0, rescueUsed: false
  };
}
export const AI_OPPONENTS = Object.freeze({
  balanced: Object.freeze({
    name:'Ashen Raiders', style:'balanced',
    fighters:[
      {name:'Grimward',job:'Vanguard'}, {name:'Rook',job:'Cutthroat'},
      {name:'Ash-Eye',job:'Ranger'}, {name:'The Pale Sister',job:'Warden'}
    ]
  }),
  assault: Object.freeze({
    name:'Crimson Blades',style:'aggressive',
    fighters:[
      {name:'Raze',job:'Vanguard'}, {name:'Fang',job:'Cutthroat'},
      {name:'Cinder',job:'Arcanist'}, {name:'Red-Eye',job:'Ranger'}
    ]
  }),
  bulwark: Object.freeze({
    name:'Iron Covenant',style:'defensive',
    fighters:[
      {name:'Bastion',job:'Vanguard'}, {name:'Bulwark',job:'Vanguard'},
      {name:'Sister Hale',job:'Warden'}, {name:'Watchman',job:'Ranger'}
    ]
  })
});
export function makeBattle(party, seed = 1937, opponent = 'balanced') {
  if (!Array.isArray(party) || party.length !== 4) throw new Error('Practice battles require four recruited heroes.');
  const profile=Object.prototype.hasOwnProperty.call(AI_OPPONENTS,opponent)?opponent:'balanced';
  const enemies=AI_OPPONENTS[profile].fighters;
  return {
    version: 3, round: 1, phase: 'planning', winner: null, seed: seed >>> 0,
    opponent:profile, opponentName:AI_OPPONENTS[profile].name,
    heroes: [...party.map((p,i)=>createHero(p,'player',i)), ...enemies.map((e,i)=>createHero(e,'enemy',i))],
    log: ['AI sparring with '+AI_OPPONENTS[profile].name+': no heroes, items, XP or gold can be lost.'],
    roundsResolved: 0
  };
}
export function heroesFor(battle,team) { return battle.heroes.filter(h => h.team === team); }
export function occupied(battle,team,row,lane,skipId=null) {
  return battle.heroes.some(h => h.team===team && h.row===row && h.lane===lane && h.id!==skipId && (h.hp>0 || h.downedRounds>0));
}
export function validPosition(pos) { return !!pos && (pos.row==='front'||pos.row==='rear') && Number.isInteger(pos.lane) && pos.lane>=0 && pos.lane<=2; }
function protectedRear(battle, target) {
  return target.row === 'rear' && battle.heroes.some(h => living(h) && h.team === target.team && h.row === 'front' && h.lane === target.lane);
}
function targetAllowed(battle, actor, ability, target) {
  if (!target || !actor || !living(actor)) return false;
  if (ability.target === 'downed') return target.team===actor.team && target.hp===0 && target.downedRounds>0 && !target.rescueUsed;
  if (ability.target === 'ally') return target.team===actor.team && living(target);
  if (ability.target !== 'enemy') return false;
  if (target.team===actor.team || !living(target)) return false;
  const reach = ability.reach || CLASS_STATS[actor.className].reach;
  if (reach === 'melee' && Math.abs(actor.lane-target.lane)>1) return false;
  if (reach === 'melee' && protectedRear(battle,target) && !ability.bypass && !actor.statuses.shadow) return false;
  return true;
}
export function possibleTargets(battle, actorId, abilityId) {
  const actor = battle.heroes.find(h=>h.id===actorId), ability = actor && getAbility(actor,abilityId);
  if (!actor || !ability || !living(actor)) return [];
  if (['self','allEnemies','allAllies','slot'].includes(ability.target)) return [];
  return battle.heroes.filter(h=>targetAllowed(battle,actor,ability,h)).map(h=>h.id);
}
export function possibleSlots(battle,actorId) {
  const actor=battle.heroes.find(h=>h.id===actorId);
  if (!actor || !living(actor) || actor.statuses.root) return [];
  const cells=[];
  for(const row of ['front','rear'])for(let lane=0;lane<3;lane++){
    if(!(actor.row===row&&actor.lane===lane)&&!occupied(battle,actor.team,row,lane))cells.push({row,lane});
  }
  return cells;
}
export function isLegalAction(battle, action) {
  if (battle.phase!=='planning'||!action||typeof action!=='object') return false;
  const actor=battle.heroes.find(h=>h.id===action.actorId);
  if(!actor||!living(actor))return false;
  const ability=getAbility(actor,action.abilityId);
  if(!ability||actor.stamina<ability.cost||(actor.cooldowns[ability.id]||0)>0)return false;
  if(ability.target==='slot')return possibleSlots(battle,actor.id).some(p=>p.row===action.row&&p.lane===action.lane);
  if(ability.target==='self'||ability.target==='allEnemies'||ability.target==='allAllies')return true;
  return possibleTargets(battle,actor.id,ability.id).includes(action.targetId);
}
export function suggestedEnemyActions(battle) {
  const enemies=heroesFor(battle,'enemy').filter(living);
  const allies=heroesFor(battle,'enemy');
  const player=heroesFor(battle,'player').filter(living);
  return enemies.map(actor=>{
    const affordable=getAbilities(actor).filter(a=>actor.stamina>=a.cost && !(actor.cooldowns[a.id]>0));
    const down=allies.find(h=>h.hp===0 && h.downedRounds>0 && !h.rescueUsed);
    if(down && actor.className==='Warden' && affordable.some(a=>a.id==='emergency'))return {actorId:actor.id,abilityId:'emergency',targetId:down.id};
    const wounded=allies.filter(living).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if(wounded && wounded.hp/wounded.maxHp<.72 && actor.className==='Warden' && affordable.some(a=>a.id==='mend'))return {actorId:actor.id,abilityId:'mend',targetId:wounded.id};
    const taunter=player.find(h=>h.statuses.taunt>0);
    const selectTarget=ability=> {
      const choices=possibleTargets(battle,actor.id,ability).map(id=>battle.heroes.find(h=>h.id===id));
      choices.sort((a,b)=>(a.hp/a.maxHp-b.hp/b.maxHp)||a.id.localeCompare(b.id));
      return (taunter && choices.find(h=>h.id===taunter.id)) || choices[0] || null;
    };
    let pick;
    const style=AI_OPPONENTS[battle.opponent]?.style||'balanced';
    if(style==='defensive' && actor.className==='Vanguard' && affordable.some(a=>a.id==='hold') && actor.shield<10)pick='hold';
    else if(style==='defensive' && actor.className==='Ranger' && affordable.some(a=>a.id==='mark') && !player.some(h=>h.statuses.mark>0))pick='mark';
    else if(style==='aggressive' && actor.className==='Vanguard' && affordable.some(a=>a.id==='crush'))pick='crush';
    else if(style==='aggressive' && actor.className==='Cutthroat' && affordable.some(a=>a.id==='backstab'))pick='backstab';
    else if(style==='aggressive' && actor.className==='Arcanist' && affordable.some(a=>a.id==='chain') && player.length>=3)pick='chain';
    else if(actor.className==='Ranger' && affordable.some(a=>a.id==='volley') && player.length>=2)pick='volley';
    else if(actor.className==='Vanguard' && affordable.some(a=>a.id==='bash'))pick='bash';
    else if(actor.className==='Cutthroat' && affordable.some(a=>a.id==='poison'))pick='poison';
    else if(actor.className==='Arcanist' && affordable.some(a=>a.id==='ember'))pick='ember';
    else pick='basic';
    let ability=affordable.find(a=>a.id===pick);
    let target=ability&&(['enemy'].includes(ability.target)?selectTarget(pick):null);
    if(ability && ['self','allEnemies','allAllies'].includes(ability.target))return {actorId:actor.id,abilityId:ability.id};
    if(target)return {actorId:actor.id,abilityId:ability.id,targetId:target.id};
    ability=affordable.find(a=>a.id==='basic');
    target=ability && selectTarget(ability.id);
    if(target)return {actorId:actor.id,abilityId:'basic',targetId:target.id};
    return {actorId:actor.id,abilityId:'defend'};
  });
}
function applyDamage(battle,events,actor,target,raw,ability) {
  if (!living(target)) return;
  const variance=Math.floor(random(battle)*5)-2;
  const crit=random(battle)<.07;
  let amount=Math.max(1, Math.round((raw+variance+(crit?5:0)+(target.statuses.mark?5:0)+(target.statuses.exposed?5:0))*(actor?.row==='rear' && (ability.reach||CLASS_STATS[actor.className].reach)==='melee' ? 0.85 : 1)));
  // Ranged attacks against a rear unit covered by its front guard lose some damage.
  if((ability.reach||CLASS_STATS[actor.className].reach)==='ranged' && protectedRear(battle,target))amount=Math.max(1,Math.round(amount*.86));
  amount=Math.max(1, amount-target.armor);
  if(target.statuses.guard>0)amount=Math.max(1,Math.round(amount*.6));
  if(target.statuses.cover>0)amount=Math.max(1,Math.round(amount*.72));
  const shieldBlocked=Math.min(target.shield,amount);
  target.shield-=shieldBlocked;
  const dealt=Math.max(0,amount-shieldBlocked);
  target.hp=Math.max(0,target.hp-dealt);
  events.push({type:'hit',actorId:actor.id,targetId:target.id,text:actor.name+' hits '+target.name+' for '+dealt+' damage'+(shieldBlocked?' ('+shieldBlocked+' blocked)':'')+(crit?' — critical!':'')+'.'});
  if(target.hp===0){target.downedRounds=3;target.statuses={};target.shield=0;events.push({type:'down',targetId:target.id,text:target.name+' is DOWNED. Allies have two further rounds to rescue them.'});}
}
function heal(events,actor,target,amount) {
  if(!living(target))return;
  const restored=Math.min(target.maxHp-target.hp,amount);
  target.hp+=restored;
  events.push({type:'heal',actorId:actor.id,targetId:target.id,text:actor.name+' restores '+restored+' HP to '+target.name+'.'});
}
function resolveAction(battle,events,act,alreadyActed) {
  const actor=battle.heroes.find(h=>h.id===act.actorId);
  if(!living(actor))return;
  if(actor.statuses.stun>0){events.push({type:'skip',actorId:actor.id,text:actor.name+' is stunned and misses their action.'});return;}
  let ability=getAbility(actor,act.abilityId);
  // Always defend when an intended action becomes invalid before its resolution.
  if(!ability||actor.stamina<ability.cost||(actor.cooldowns[ability.id]||0)>0)ability=getAbility(actor,'defend');
  let target=battle.heroes.find(h=>h.id===act.targetId);
  if(ability.target==='slot'){
    if(!validPosition(act)||actor.statuses.root||occupied(battle,actor.team,act.row,act.lane)){
      events.push({type:'skip',actorId:actor.id,text:actor.name+' cannot reposition; their action is lost.'});return;
    }
  } else if(['enemy','ally','downed'].includes(ability.target)&&!targetAllowed(battle,actor,ability,target)){
    events.push({type:'skip',actorId:actor.id,text:actor.name+' has no valid target for '+ability.name+'.'});return;
  }
  actor.stamina-=ability.cost;
  if(ability.cooldown>0)actor.cooldowns[ability.id]=ability.cooldown+1;
  if(ability.kind==='move'){
    actor.row=act.row;actor.lane=act.lane;
    events.push({type:'move',actorId:actor.id,text:actor.name+' moves to '+act.row+' rank, lane '+(act.lane+1)+'.'});
  } else if(ability.kind==='defend'){
    actor.shield+=ability.shield||14;actor.statuses.guard=1;
    events.push({type:'guard',actorId:actor.id,text:actor.name+' takes a defensive stance (shield '+actor.shield+').'});
    if(ability.id==='hold'){
      const covered=battle.heroes.find(h=>h.id!==actor.id&&h.team===actor.team&&h.row==='rear'&&h.lane===actor.lane&&living(h));
      if(covered){covered.shield+=10;covered.statuses.cover=2;
        events.push({type:'guard',actorId:actor.id,targetId:covered.id,text:actor.name+' protects '+covered.name+' with 10 shield and Cover.'});}
    }
  } else if(ability.kind==='taunt'){
    actor.statuses.taunt=2;actor.shield+=8;
    events.push({type:'guard',actorId:actor.id,text:actor.name+' challenges the enemy and raises their guard.'});
  } else if(ability.kind==='shadow'){
    actor.statuses.shadow=2;actor.shield+=12;
    events.push({type:'guard',actorId:actor.id,text:actor.name+' enters the shadows, preparing a flanking strike.'});
  } else if(ability.kind==='shield'){
    target.shield+=ability.power;
    events.push({type:'guard',actorId:actor.id,targetId:target.id,text:actor.name+' grants '+target.name+' '+ability.power+' shield.'});
  } else if(ability.kind==='mark'){
    target.statuses.mark=3;
    events.push({type:'status',actorId:actor.id,targetId:target.id,text:actor.name+' marks '+target.name+' for allied attacks.'});
  } else if(ability.kind==='heal'||ability.kind==='cleanse'){
    heal(events,actor,target,ability.power);
    if(ability.kind==='cleanse')for(const k of ['poison','burn','root'])delete target.statuses[k];
  } else if(ability.kind==='revive'){
    target.hp=Math.min(target.maxHp,ability.power);target.downedRounds=0;target.rescueUsed=true;target.statuses={};target.shield=0;
    events.push({type:'revive',actorId:actor.id,targetId:target.id,text:actor.name+' rescues '+target.name+' ('+target.hp+' HP).'});
  } else if(ability.kind==='rally'){
    heroesFor(battle,actor.team).filter(living).forEach(h=>{heal(events,actor,h,ability.power);h.shield+=9;});
    events.push({type:'guard',actorId:actor.id,text:actor.name+' rallies the company.'});
  } else {
    const victims=ability.kind==='area'?heroesFor(battle,actor.team==='player'?'enemy':'player').filter(living):[target];
    for(const victim of victims) {
      const power=ability.power+(ability.execute&&victim.hp/victim.maxHp<.4?20:0)+(ability.id==='backstab'&&victim.row==='rear'?8:0)+(actor.statuses.shadow?7:0);
      applyDamage(battle,events,actor,victim,power,{...ability,reach:ability.reach||CLASS_STATS[actor.className].reach});
      if(living(victim)){
        if(ability.stun)victim.statuses.stun=alreadyActed.has(victim.id)?2:1;
        if(ability.poison)victim.statuses.poison=ability.poison;
        if(ability.burn)victim.statuses.burn=ability.burn;
        if(ability.root)victim.statuses.root=ability.root;
      }
    }
    if(actor.statuses.shadow)delete actor.statuses.shadow;
  }
}
function endOfRound(battle,events){
  for(const h of battle.heroes){
    if(h.hp===0&&h.downedRounds>0){
      h.downedRounds--;
      if(h.downedRounds===0)events.push({type:'dead',targetId:h.id,text:h.name+' bleeds out (practice death only).'});
      continue;
    }
    if(!living(h))continue;
    for(const effect of ['poison','burn']){
      if(h.statuses[effect]>0){
        const damage=Math.min(h.hp,effect==='poison'?6:5);
        h.hp=Math.max(0,h.hp-damage);
        events.push({type:'damage-over-time',targetId:h.id,text:h.name+' takes '+damage+' '+effect+' damage.'});
        if(h.hp===0){h.downedRounds=3;h.statuses={};h.shield=0;events.push({type:'down',targetId:h.id,text:h.name+' collapses from '+effect+'.'});break;}
      }
    }
    if(!living(h))continue;
    for(const k of Object.keys(h.statuses)){h.statuses[k]--;if(h.statuses[k]<=0)delete h.statuses[k];}
    for(const k of Object.keys(h.cooldowns)){h.cooldowns[k]--;if(h.cooldowns[k]<=0)delete h.cooldowns[k];}
    h.stamina=clamp(h.stamina+2,0,h.maxStamina);
    // Shields wear off in part so battles cannot stall indefinitely.
    h.shield=Math.max(0,h.shield-5);
  }
}
function determineWinner(battle) {
  const aliveA=heroesFor(battle,'player').filter(living);
  const aliveB=heroesFor(battle,'enemy').filter(living);
  if(!aliveA.length&&!aliveB.length)return 'draw';
  if(!aliveB.length)return 'player';
  if(!aliveA.length)return 'enemy';
  if(battle.roundsResolved>=12){
    const score=team=>heroesFor(battle,team).reduce((sum,h)=>sum+(h.hp/h.maxHp),0);
    const a=score('player'),b=score('enemy');
    return Math.abs(a-b)<.01?'draw':a>b?'player':'enemy';
  }
  return null;
}
export function resolveRound(original, submittedActions, enemyActions=null) {
  if(original.phase!=='planning'||original.winner)throw new Error('This battle cannot resolve another round.');
  const battle=structuredClone(original),events=[];
  // Both teams plan against the same original game state. Enemies never see the player's choices.
  const aiActions=enemyActions || suggestedEnemyActions(original);
  const actions=[...submittedActions.filter(a=>a&&a.actorId?.startsWith('p')),...aiActions.filter(a=>a&&a.actorId?.startsWith('e'))];
  const planned=new Map();
  for(const a of actions){
    if(!planned.has(a.actorId)&&isLegalAction(original,a))planned.set(a.actorId,{...a});
  }
  for(const h of battle.heroes.filter(living))if(!planned.has(h.id))planned.set(h.id,{actorId:h.id,abilityId:'defend'});
  const ordered=[...planned.values()].sort((a,b)=>{
    const ha=battle.heroes.find(h=>h.id===a.actorId),hb=battle.heroes.find(h=>h.id===b.actorId);
    const speed=hb.speed-ha.speed;
    if(speed)return speed;
    const aa=ha.team==='player'?1:0,bb=hb.team==='player'?1:0;
    if(aa!==bb)return battle.round%2?aa-bb:bb-aa;
    return a.actorId.localeCompare(b.actorId);
  });
  events.push({type:'round',text:'Round '+battle.round+' begins.'});
  const alreadyActed=new Set();
  for(const action of ordered){resolveAction(battle,events,action,alreadyActed);alreadyActed.add(action.actorId);}
  endOfRound(battle,events);
  battle.roundsResolved++;
  battle.winner=determineWinner(battle);
  if(battle.winner){
    battle.phase='finished';
    events.push({type:'result',text:battle.winner==='draw'?'The training match ends in a draw.':battle.winner==='player'?'Victory! Your mercenaries win the training match.':'Defeat. Your company loses the training match.'});
  }else battle.round++;
  battle.log=[...events.map(e=>e.text),...battle.log].slice(0,110);
  return {battle,events};
}
