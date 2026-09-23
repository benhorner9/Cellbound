(()=>{
'use strict';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ARENA_UNLOCK_RANK=5;
const ARENA_UNLOCK_T1_PIECES=5;
const SEASON_LENGTH_DAYS=56;
const PVP_GEAR_SLOTS=['Head','Shoulders','Chest','Hands','Legs','Weapon','Trinket','Relic'];
const MODE_DEFS={
  'capture-the-flag':{name:'Capture the Flag',short:'CTF',icon:'⚑',description:'Steal the enemy Cell Standard, escort it home and protect your own.'},
  'king-of-the-hill':{name:'King of the Hill',short:'KOTH',icon:'◇',description:'Rotate between five control zones. Hold the active node to score.'}
};
const BG_SIZES={5:{commanders:1,winMarks:60,lossMarks:20,winXp:120,lossXp:50},10:{commanders:2,winMarks:85,lossMarks:30,winXp:145,lossXp:60},20:{commanders:4,winMarks:120,lossMarks:40,winXp:175,lossXp:75}};
const ARENA_FORMATS={2:{win:35,loss:8},3:{win:45,loss:10},5:{win:60,loss:14}};
const TIER_META={
  1:{name:'Frontier',currency:'warMarks',currencyName:'War Marks',className:'tier-one',power:8,defence:6,control:4},
  2:{name:'Arenaforged',currency:'arenaSeals',currencyName:'Arena Seals',className:'tier-two',power:15,defence:11,control:7},
  3:{name:'Seasonbound',currency:'seasonCrests',currencyName:'Season Crests',className:'tier-three',power:23,defence:17,control:11}
};
const SLOT_META={
  Head:{icon:'◉',cost:[120,90,2],mult:1},Shoulders:{icon:'⌃',cost:[110,85,2],mult:.9},Chest:{icon:'▣',cost:[180,130,3],mult:1.25},Hands:{icon:'✥',cost:[100,80,2],mult:.85},
  Legs:{icon:'║',cost:[160,120,3],mult:1.15},Weapon:{icon:'⚔',cost:[240,180,4],mult:1.45},Trinket:{icon:'◆',cost:[150,115,3],mult:1.05},Relic:{icon:'◇',cost:[190,145,4],mult:1.2}
};
const RIVALS=[
  ['Ironwake',2140,72,28],['Hollow Crown',2015,64,31],['Nightglass',1940,58,34],['Cinder Pact',1875,54,36],['Violet March',1790,49,38],['Grim Lantern',1715,45,40],
  ['Ash Wolves',1630,39,38],['Northstar',1545,34,35],['Riftborn',1460,31,36],['Black Orchard',1375,27,35],['Stone Choir',1260,22,33],['Last Ember',1140,18,31]
];
function chooseRivalGuild(rating=null){
  if(Number.isFinite(Number(rating))){
    const target=Number(rating);return RIVALS.slice().sort((a,b)=>Math.abs(Number(a[1])-target)-Math.abs(Number(b[1])-target))[0]?.[0]||'Rival Guild'
  }
  return RIVALS[Math.floor(Math.random()*RIVALS.length)]?.[0]||'Rival Guild'
}

let activeTab='battlegrounds';
let battlegroundMode='capture-the-flag';
let battlegroundSize=5;
let arenaSize=2;
let arenaSelection=[];
let armouryCharacterId=null;
let matchRunning=false;
let lastMatch=null;

function game(){return window.CellboundGame}
function state(){return game()?.getState?.()}
function unlockedRoster(){
  const s=state(),g=game();
  return (s?.roster||[]).filter(c=>g?.isCharacterRosterUnlocked?.(c.id)!==false)
}
function availableRoster(){return unlockedRoster().filter(c=>!game()?.isUnavailable?.(c))}
function activeParty(){return game()?.getPartyCharacters?.()||[]}
function nowIso(){return new Date().toISOString()}
function addDays(iso,days){const d=new Date(iso);d.setDate(d.getDate()+days);return d.toISOString()}
function seasonIdFrom(iso){const d=new Date(iso);return `S${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}
function newPvpState(){
  const started=nowIso();
  return {
    version:1,warMarks:0,arenaSeals:0,seasonCrests:0,bgXp:0,bgWins:0,bgLosses:0,bgObjectives:0,t1Purchases:0,
    arenaRating:1000,arenaWins:0,arenaLosses:0,arenaUnlockedAt:null,
    season:{id:seasonIdFrom(started),startedAt:started,endsAt:addDays(started,SEASON_LENGTH_DAYS),wins:0,losses:0,bestRating:1000,rewarded:false},
    seasonHistory:[],matchHistory:[],purchaseHistory:[]
  }
}
function ensureState(){
  const s=state();if(!s)return null;
  s.pvp=s.pvp&&typeof s.pvp==='object'?s.pvp:newPvpState();
  const p=s.pvp,defaults=newPvpState();
  ['warMarks','arenaSeals','seasonCrests','bgXp','bgWins','bgLosses','bgObjectives','t1Purchases','arenaRating','arenaWins','arenaLosses'].forEach(k=>p[k]=Number.isFinite(Number(p[k]))?Number(p[k]):defaults[k]);
  p.matchHistory=Array.isArray(p.matchHistory)?p.matchHistory:[];p.purchaseHistory=Array.isArray(p.purchaseHistory)?p.purchaseHistory:[];p.seasonHistory=Array.isArray(p.seasonHistory)?p.seasonHistory:[];
  p.season=p.season&&typeof p.season==='object'?p.season:defaults.season;
  p.season.wins=Number(p.season.wins)||0;p.season.losses=Number(p.season.losses)||0;p.season.bestRating=Math.max(1000,Number(p.season.bestRating)||1000);
  p.season.startedAt=p.season.startedAt||defaults.season.startedAt;p.season.endsAt=p.season.endsAt||addDays(p.season.startedAt,SEASON_LENGTH_DAYS);p.season.id=p.season.id||seasonIdFrom(p.season.startedAt);
  (s.roster||[]).forEach(c=>{c.pvpEquipment=c.pvpEquipment&&typeof c.pvpEquipment==='object'?c.pvpEquipment:{};PVP_GEAR_SLOTS.forEach(slot=>{if(!(slot in c.pvpEquipment))c.pvpEquipment[slot]=null})});
  if(!armouryCharacterId||!s.roster.some(c=>c.id===armouryCharacterId))armouryCharacterId=unlockedRoster()[0]?.id||null;
  if(!arenaSelection.length)arenaSelection=availableRoster().slice(0,arenaSize).map(c=>c.id);
  return p
}
function bgRank(p=ensureState()){return clamp(1+Math.floor((Number(p?.bgXp)||0)/300),1,50)}
function bgRankProgress(p=ensureState()){const xp=Number(p?.bgXp)||0;return {rank:bgRank(p),inRank:xp%300,pct:(xp%300)/3}}
function arenaUnlocked(p=ensureState()){return bgRank(p)>=ARENA_UNLOCK_RANK&&(Number(p?.t1Purchases)||0)>=ARENA_UNLOCK_T1_PIECES}
function gearPiece(tier,slot){
  const t=TIER_META[tier],s=SLOT_META[slot],m=s.mult;
  return {id:`pvp-t${tier}-${String(slot).toLowerCase()}`,name:`${t.name} ${slot}`,tier,slot,pvpOnly:true,rarity:tier===3?'Epic':tier===2?'Rare':'Uncommon',pvpPower:Math.round(t.power*m),pvpDefence:Math.round(t.defence*m),controlResistance:Math.round(t.control*m),acquiredAt:nowIso()}
}
function pvpGearArt(item,tier,slot,size=46){
  const piece=item||gearPiece(tier,slot);
  return window.CellboundItemArt?.artHTML?.(piece,size,'pvp-item-art')||SLOT_META[slot]?.icon||'◇'
}
function pvpGearScore(c){
  const pieces=Object.values(c?.pvpEquipment||{}).filter(Boolean);
  const stats=pieces.reduce((a,x)=>{a.power+=Number(x.pvpPower)||0;a.defence+=Number(x.pvpDefence)||0;a.control+=Number(x.controlResistance)||0;return a},{power:0,defence:0,control:0});
  const tiers=pieces.reduce((a,x)=>{a[x.tier]=(a[x.tier]||0)+1;return a},{});
  return {pieces:pieces.length,...stats,tiers,total:stats.power+stats.defence*.8+stats.control*.55}
}
function classRole(c){
  const d=game()?.classes?.[c?.class]?.specs?.[c?.spec];return d?.role||'dps'
}
function characterPvpPower(c){
  const g=pvpGearScore(c),level=Math.max(1,Number(c?.level)||1),role=classRole(c);
  const roleBase=role==='tank'?106:role==='healer'?103:110;
  return roleBase+level*2.2+g.total
}
function teamPower(chars,mode='arena'){
  if(!chars.length)return 0;
  const base=chars.reduce((n,c)=>n+characterPvpPower(c),0);
  const roles=chars.reduce((a,c)=>(a[classRole(c)]=(a[classRole(c)]||0)+1,a),{tank:0,healer:0,dps:0});
  let synergy=1;
  if(roles.healer)synergy+=mode==='arena'?.07:.05;
  if(roles.tank)synergy+=mode==='king-of-the-hill'?.08:.035;
  if(mode==='capture-the-flag'&&roles.dps>=Math.max(1,Math.ceil(chars.length*.5)))synergy+=.035;
  return base*synergy
}
function activeName(){return state()?.socialDisplayName?.trim()||'Your Guild'}
function formatDate(iso){try{return new Date(iso).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}catch{return '—'}}
function relativeSeasonTime(iso){
  const ms=new Date(iso).getTime()-Date.now();if(ms<=0)return 'ENDING NOW';
  const days=Math.ceil(ms/86400000);return `${days} day${days===1?'':'s'} remaining`
}
function ladderRows(p=ensureState()){
  const rows=RIVALS.map(([name,rating,wins,losses])=>({name,rating,wins,losses,self:false}));
  rows.push({name:activeName(),rating:Math.round(p.arenaRating),wins:p.season.wins,losses:p.season.losses,self:true});
  rows.sort((a,b)=>b.rating-a.rating||b.wins-a.wins||a.losses-b.losses);return rows.map((x,i)=>({...x,position:i+1}))
}
function currentPosition(p=ensureState()){return ladderRows(p).find(x=>x.self)?.position||ladderRows(p).length}
function crestRewardForPosition(pos){if(pos<=1)return 8;if(pos<=3)return 6;if(pos<=5)return 5;if(pos<=10)return 4;if(pos<=20)return 3;return 1}
function maybeSettleSeason(p=ensureState()){
  if(!p?.season||new Date(p.season.endsAt).getTime()>Date.now()||p.season.rewarded)return false;
  const place=currentPosition(p),reward=crestRewardForPosition(place);
  p.seasonCrests+=reward;p.season.rewarded=true;
  p.seasonHistory.unshift({id:p.season.id,position:place,reward,rating:Math.round(p.arenaRating),wins:p.season.wins,losses:p.season.losses,endedAt:nowIso()});
  p.seasonHistory=p.seasonHistory.slice(0,8);
  const started=nowIso();p.season={id:seasonIdFrom(started),startedAt:started,endsAt:addDays(started,SEASON_LENGTH_DAYS),wins:0,losses:0,bestRating:1000,rewarded:false};p.arenaRating=1000;
  state().activity?.push?.(`PvP season settled: #${place} · +${reward} Season Crests.`);game()?.save?.();return true
}
function arenaRequirementMarkup(p){
  const rank=bgRank(p),pieces=Number(p.t1Purchases)||0,rankOk=rank>=ARENA_UNLOCK_RANK,piecesOk=pieces>=ARENA_UNLOCK_T1_PIECES;
  return `<div class="pvp-unlock-grid"><div class="${rankOk?'complete':''}"><span>${rankOk?'✓':'○'}</span><b>PvP Rank ${ARENA_UNLOCK_RANK}</b><small>${rank} / ${ARENA_UNLOCK_RANK}</small></div><div class="${piecesOk?'complete':''}"><span>${piecesOk?'✓':'○'}</span><b>Tier 1 equipment</b><small>${Math.min(pieces,ARENA_UNLOCK_T1_PIECES)} / ${ARENA_UNLOCK_T1_PIECES} pieces purchased</small></div></div>`
}
function currencyStrip(p){return `<div class="pvp-currency-strip"><div><span>War Marks</span><b>${Math.floor(p.warMarks)}</b><small>Battleground currency</small></div><div><span>Arena Seals</span><b>${Math.floor(p.arenaSeals)}</b><small>Rated Arena currency</small></div><div><span>Season Crests</span><b>${Math.floor(p.seasonCrests)}</b><small>End-of-season currency</small></div><div><span>Arena Rating</span><b>${Math.round(p.arenaRating)}</b><small>${p.arenaWins}W · ${p.arenaLosses}L</small></div></div>`}
function pvpHeader(p){
  const progress=bgRankProgress(p);
  return `<div class="pvp-hero"><div><small>PLAYER VERSUS PLAYER</small><h2>The Crucible</h2><p>Build a PvP loadout, fight objective battlegrounds and earn your way into rated Arena. PvP equipment is isolated from PvE and never raises dungeon Item Level.</p></div><div class="pvp-rank-card"><span>PVP RANK</span><b>${progress.rank}</b><div><i style="width:${progress.pct}%"></i></div><small>${progress.inRank} / 300 XP to next rank</small></div></div>${currencyStrip(p)}<nav class="pvp-tabs"><button data-pvp-tab="battlegrounds" class="${activeTab==='battlegrounds'?'active':''}">BATTLEGROUNDS</button><button data-pvp-tab="arena" class="${activeTab==='arena'?'active':''}">ARENA</button><button data-pvp-tab="armoury" class="${activeTab==='armoury'?'active':''}">PVP ARMOURY</button><button data-pvp-tab="leaderboard" class="${activeTab==='leaderboard'?'active':''}">SEASON LADDER</button></nav>`
}
function squadStatus(chars){
  if(chars.length!==5)return {ok:false,text:`Active party ${chars.length}/5`};
  const unavailable=chars.filter(c=>game()?.isUnavailable?.(c));if(unavailable.length)return{ok:false,text:`${unavailable.length} party member${unavailable.length===1?' is':'s are'} recovering`};
  return{ok:true,text:'Active five ready'}
}
function teamMini(chars){
  return `<div class="pvp-party-mini">${chars.map(c=>{const g=pvpGearScore(c);return `<div><span class="pvp-avatar">${esc(c.portrait||c.name?.slice(0,2)||'?')}</span><span><b>${esc(c.name)}</b><small>${esc(c.class)} · ${esc(c.spec)} · PvP ${Math.round(characterPvpPower(c))}</small></span><em>${g.pieces}/8 PvP pieces</em></div>`}).join('')||'<p>No active party selected.</p>'}</div>`
}
function battlegroundMarkup(p){
  const party=activeParty(),ready=squadStatus(party),m=MODE_DEFS[battlegroundMode],size=BG_SIZES[battlegroundSize];
  return `<section class="pvp-grid pvp-bg-grid"><div class="pvp-main-stack"><article class="pvp-panel"><header><div><small>UNRANKED OBJECTIVE PVP</small><h3>Choose a Battleground</h3></div><b>${ready.text.toUpperCase()}</b></header><div class="pvp-mode-grid">${Object.entries(MODE_DEFS).map(([id,d])=>`<button data-bg-mode="${id}" class="${id===battlegroundMode?'active':''}"><span>${d.icon}</span><b>${d.name}</b><small>${d.description}</small></button>`).join('')}</div></article><article class="pvp-panel"><header><div><small>TEAM SCALE</small><h3>${m.name}</h3></div><b>${battlegroundSize}v${battlegroundSize}</b></header><div class="pvp-size-grid">${Object.entries(BG_SIZES).map(([n,d])=>`<button data-bg-size="${n}" class="${Number(n)===battlegroundSize?'active':''}"><b>${n}v${n}</b><span>${d.commanders}v${d.commanders} guildmaster${d.commanders===1?'':'s'}</span><small>${d.commanders*5} characters per side</small></button>`).join('')}</div><div class="pvp-queue-summary"><div><span>Mode</span><b>${m.name}</b></div><div><span>Commanders</span><b>${size.commanders}v${size.commanders}</b></div><div><span>Win reward</span><b>${size.winMarks}+ War Marks</b></div><div><span>Loss reward</span><b>${size.lossMarks}+ War Marks</b></div></div><button class="pvp-primary" data-start-bg ${ready.ok&&!matchRunning?'':'disabled'}>${matchRunning?'MATCH IN PROGRESS…':`FIND ${battlegroundSize}v${battlegroundSize} BATTLEGROUND →`}</button></article><div id="pvpMatchStage">${lastMatch?.kind==='battleground'?matchResultMarkup(lastMatch):''}</div></div><aside class="pvp-side-stack"><article class="pvp-panel"><header><div><small>YOUR UNIT</small><h3>Active Five</h3></div></header>${teamMini(party)}</article><article class="pvp-panel pvp-rule-card"><header><div><small>PVP RULESET</small><h3>Separate Power</h3></div></header><p>PvE Item Level does not affect PvP. Level, role and PvP gear do.</p><ul><li>Win: small Cell Shock reduction</li><li>Loss: small Cell Shock increase</li><li>Objectives increase War Marks and Rank XP</li></ul></article></aside></section>`
}
function arenaSelectionMarkup(){
  const roster=availableRoster();
  arenaSelection=arenaSelection.filter(id=>roster.some(c=>c.id===id)).slice(0,arenaSize);
  return `<div class="arena-roster">${roster.map(c=>{const chosen=arenaSelection.includes(c.id),g=pvpGearScore(c);return `<button data-arena-char="${c.id}" class="${chosen?'selected':''}" ${!chosen&&arenaSelection.length>=arenaSize?'disabled':''}><span class="pvp-avatar">${esc(c.portrait||'?')}</span><span><b>${esc(c.name)}</b><small>${esc(c.class)} · ${esc(c.spec)} · ${g.pieces}/8 pieces</small></span><em>${chosen?'SELECTED':'ADD'}</em></button>`}).join('')||'<p>No available characters.</p>'}</div>`
}
function arenaMarkup(p){
  const unlocked=arenaUnlocked(p),chars=arenaSelection.map(id=>state()?.roster?.find(c=>c.id===id)).filter(Boolean),ready=unlocked&&chars.length===arenaSize;
  return `<section class="pvp-grid"><div class="pvp-main-stack"><article class="pvp-panel arena-gate ${unlocked?'unlocked':'locked'}"><header><div><small>RATED PVP</small><h3>${unlocked?'Arena Unlocked':'Earn Your Arena Licence'}</h3></div><b>${unlocked?'OPEN':'LOCKED'}</b></header>${arenaRequirementMarkup(p)}<p>${unlocked?'Rated Arena is open. Wins and losses change your seasonal rating.':'Reach PvP Rank 5 and own five Tier 1 pieces to unlock Arena.'}</p></article>${unlocked?`<article class="pvp-panel"><header><div><small>ARENA FORMAT</small><h3>Build Your Squad</h3></div><b>${arenaSize}v${arenaSize}</b></header><div class="pvp-size-grid arena-sizes">${Object.keys(ARENA_FORMATS).map(n=>`<button data-arena-size="${n}" class="${Number(n)===arenaSize?'active':''}"><b>${n}v${n}</b><span>${n} characters</span><small>Elimination · shrinking Cellstorm</small></button>`).join('')}</div>${arenaSelectionMarkup()}<div class="pvp-queue-summary"><div><span>Your rating</span><b>${Math.round(p.arenaRating)}</b></div><div><span>Season record</span><b>${p.season.wins}W · ${p.season.losses}L</b></div><div><span>Win reward</span><b>${ARENA_FORMATS[arenaSize].win} Arena Seals</b></div><div><span>Selected</span><b>${chars.length}/${arenaSize}</b></div></div><button class="pvp-primary arena" data-start-arena ${ready&&!matchRunning?'':'disabled'}>${matchRunning?'MATCH IN PROGRESS…':`FIND ${arenaSize}v${arenaSize} ARENA MATCH →`}</button></article><div id="pvpMatchStage">${lastMatch?.kind==='arena'?matchResultMarkup(lastMatch):''}</div>`:''}</div><aside class="pvp-side-stack"><article class="pvp-panel"><header><div><small>RATED SEASON</small><h3>${esc(p.season.id)}</h3></div></header><div class="pvp-season-summary"><div><span>Best rating</span><b>${Math.round(p.season.bestRating)}</b></div><div><span>Ladder place</span><b>#${currentPosition(p)}</b></div><div><span>Projected reward</span><b>${crestRewardForPosition(currentPosition(p))} Crests</b></div><div><span>Record</span><b>${p.season.wins}W · ${p.season.losses}L</b></div></div><small class="pvp-season-time">${relativeSeasonTime(p.season.endsAt)} · ends ${formatDate(p.season.endsAt)}</small></article><article class="pvp-panel pvp-rule-card"><header><div><small>ARENA REWARDS</small><h3>Tier 2 Progression</h3></div></header><p>Arena Seals buy Tier 2 gear. Your season finish awards Crests for Tier 3 gear.</p></article></aside></section>`
}
function armouryMarkup(p){
  const roster=unlockedRoster(),c=roster.find(x=>x.id===armouryCharacterId)||roster[0],score=pvpGearScore(c||{});
  if(c)armouryCharacterId=c.id;
  return `<section class="pvp-grid armoury-layout"><aside class="pvp-panel"><header><div><small>PVP LOADOUT</small><h3>Choose Adventurer</h3></div></header><div class="pvp-armoury-roster">${roster.map(x=>`<button data-armoury-char="${x.id}" class="${x.id===armouryCharacterId?'active':''}"><span class="pvp-avatar">${esc(x.portrait||'?')}</span><span><b>${esc(x.name)}</b><small>${esc(x.class)} · ${pvpGearScore(x).pieces}/8 equipped</small></span></button>`).join('')}</div></aside><div class="pvp-main-stack"><article class="pvp-panel"><header><div><small>DEDICATED PVP EQUIPMENT</small><h3>${esc(c?.name||'No Adventurer')}</h3></div><b>PVP POWER ${Math.round(characterPvpPower(c||{}))}</b></header><div class="pvp-stat-strip"><div><span>PvP Power</span><b>${score.power}</b></div><div><span>PvP Defence</span><b>${score.defence}</b></div><div><span>Control Resist</span><b>${score.control}</b></div><div><span>Pieces</span><b>${score.pieces}/8</b></div></div><div class="pvp-equipped-grid">${PVP_GEAR_SLOTS.map(slot=>{const item=c?.pvpEquipment?.[slot];return `<div class="${item?'filled':''}"><span>${item?pvpGearArt(item,item.tier,slot,42):SLOT_META[slot].icon}</span><small>${slot}</small><b>${item?esc(item.name):'Empty'}</b><em>${item?`T${item.tier} · +${item.pvpPower} power`:'PvP only'}</em></div>`}).join('')}</div></article>${[1,2,3].map(tier=>armouryTierMarkup(p,c,tier)).join('')}</div></section>`
}
function armouryTierMarkup(p,c,tier){
  const t=TIER_META[tier],locked=tier===2&&!arenaUnlocked(p),seasonLocked=tier===3&&p.seasonCrests<=0;
  const lockCopy=tier===2?'Unlock Arena to buy Tier 2 equipment.':tier===3?'Season Crests are awarded when a rated season ends.':'';
  return `<article class="pvp-panel pvp-shop-tier ${t.className}"><header><div><small>TIER ${tier} · ${esc(t.currencyName.toUpperCase())}</small><h3>${esc(t.name)} Equipment</h3></div><b>${Math.floor(p[t.currency])} AVAILABLE</b></header>${locked||seasonLocked?`<div class="pvp-tier-lock">◇ ${esc(lockCopy)}</div>`:''}<div class="pvp-shop-grid">${PVP_GEAR_SLOTS.map(slot=>{const cost=SLOT_META[slot].cost[tier-1],owned=c?.pvpEquipment?.[slot],better=owned&&Number(owned.tier)>=tier;return `<button data-buy-pvp="${tier}:${slot}" ${!c||locked||seasonLocked||p[t.currency]<cost||better?'disabled':''}><span>${pvpGearArt(null,tier,slot,46)}</span><b>${esc(t.name)} ${slot}</b><small>+${Math.round(t.power*SLOT_META[slot].mult)} Power · +${Math.round(t.defence*SLOT_META[slot].mult)} Defence · +${Math.round(t.control*SLOT_META[slot].mult)} Control</small><em>${better?`EQUIPPED T${owned.tier}`:`${cost} ${esc(t.currencyName)}`}</em></button>`}).join('')}</div></article>`
}
function leaderboardMarkup(p){
  const rows=ladderRows(p),place=currentPosition(p),reward=crestRewardForPosition(place);
  return `<section class="pvp-grid leaderboard-layout"><div class="pvp-main-stack"><article class="pvp-panel"><header><div><small>${esc(p.season.id)} · RATED ARENA</small><h3>Season Ladder</h3></div><b>${relativeSeasonTime(p.season.endsAt).toUpperCase()}</b></header><div class="pvp-leader-head"><span>#</span><span>Guild</span><span>Rating</span><span>Record</span></div><div class="pvp-leader-list">${rows.map(r=>`<div class="${r.self?'self':''}"><b>${r.position}</b><span>${r.self?'◆ ':''}${esc(r.name)}</span><strong>${r.rating}</strong><em>${r.wins}W · ${r.losses}L</em></div>`).join('')}</div></article></div><aside class="pvp-side-stack"><article class="pvp-panel pvp-reward-card"><header><div><small>CURRENT POSITION</small><h3>#${place}</h3></div><b>${Math.round(p.arenaRating)} RATING</b></header><div class="pvp-reward-crest">◇<b>${reward}</b><span>Season Crests if the season ended here</span></div><p>Season Crests purchase Tier 3 PvP equipment. The ladder resets after rewards are issued.</p></article><article class="pvp-panel"><header><div><small>REWARD BRACKETS</small><h3>Season Payout</h3></div></header><div class="pvp-brackets"><div><b>#1</b><span>8 Crests</span></div><div><b>Top 3</b><span>6 Crests</span></div><div><b>Top 5</b><span>5 Crests</span></div><div><b>Top 10</b><span>4 Crests</span></div><div><b>Participation</b><span>1+ Crest</span></div></div></article></aside></section>`
}
function matchStageMarkup(match){
  const blue=match.playerUnits||[],red=match.enemyUnits||[];
  return `<div class="pvp-live"><div class="pvp-live-head"><span>${match.kind==='arena'?`${match.size}v${match.size} ARENA`:`${match.size}v${match.size} · ${MODE_DEFS[match.mode]?.name||'Battleground'}`}</span><b>COMBAT RESOLVING</b></div><div class="pvp-battlefield"><div class="pvp-objective-mark">${match.kind==='arena'?'⚔':MODE_DEFS[match.mode]?.icon||'◇'}</div><div class="pvp-team blue">${blue.map((u,i)=>`<span style="--i:${i}"><i>${esc(u.portrait||'◆')}</i><small>${esc(u.name)}</small></span>`).join('')}</div><div class="pvp-team red">${red.map((u,i)=>`<span style="--i:${i}"><i>◆</i><small>${esc(u.name)}</small></span>`).join('')}</div></div><div class="pvp-live-bars"><div><span>Your team</span><div><i id="pvpBlueBar" style="width:100%"></i></div></div><div><span>Opposition</span><div><i id="pvpRedBar" style="width:100%"></i></div></div></div><div id="pvpLiveLog" class="pvp-live-log">The gates open…</div></div>`
}
function matchResultMarkup(m){
  const win=m.win,colour=win?'victory':'defeat';
  return `<article class="pvp-panel pvp-result ${colour}"><header><div><small>${m.kind==='arena'?'RATED ARENA':'BATTLEGROUND COMPLETE'}</small><h3>${win?'VICTORY':'DEFEAT'}</h3></div><b>${m.kind==='arena'?`${m.ratingBefore} → ${m.ratingAfter}`:`+${m.rankXp} RANK XP`}</b></header><div class="pvp-result-grid"><div><span>Score</span><b>${esc(m.scoreText)}</b></div><div><span>${m.kind==='arena'?'Arena Seals':'War Marks'}</span><b>+${m.currency}</b></div><div><span>Cell Shock</span><b>${m.shockDelta>0?'+':''}${m.shockDelta}%</b></div><div><span>${m.kind==='arena'?'Rating':'Objectives'}</span><b>${m.kind==='arena'?(m.ratingDelta>0?'+':'')+m.ratingDelta:m.objectives}</b></div></div><p>${esc(m.summary)}</p></article>`
}
function render(){
  const mount=$('#pvpMount');if(!mount||!game()?.ready)return;
  const p=ensureState();if(!p)return;maybeSettleSeason(p);
  mount.innerHTML=`${pvpHeader(p)}<div class="pvp-body">${activeTab==='battlegrounds'?battlegroundMarkup(p):activeTab==='arena'?arenaMarkup(p):activeTab==='armoury'?armouryMarkup(p):leaderboardMarkup(p)}</div>`;
  bind();
}
function bind(){
  $$('[data-pvp-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.pvpTab;lastMatch=null;render()});
  $$('[data-bg-mode]').forEach(b=>b.onclick=()=>{battlegroundMode=b.dataset.bgMode;render()});
  $$('[data-bg-size]').forEach(b=>b.onclick=()=>{battlegroundSize=Number(b.dataset.bgSize)||5;render()});
  $('[data-start-bg]')?.addEventListener('click',runBattleground);
  $$('[data-arena-size]').forEach(b=>b.onclick=()=>{arenaSize=Number(b.dataset.arenaSize)||2;arenaSelection=availableRoster().slice(0,arenaSize).map(c=>c.id);render()});
  $$('[data-arena-char]').forEach(b=>b.onclick=()=>toggleArenaChar(b.dataset.arenaChar));
  $('[data-start-arena]')?.addEventListener('click',runArena);
  $$('[data-armoury-char]').forEach(b=>b.onclick=()=>{armouryCharacterId=b.dataset.armouryChar;render()});
  $$('[data-buy-pvp]').forEach(b=>b.onclick=()=>{const [tier,slot]=b.dataset.buyPvp.split(':');buyGear(Number(tier),slot)});
}
function toggleArenaChar(id){
  if(arenaSelection.includes(id))arenaSelection=arenaSelection.filter(x=>x!==id);else if(arenaSelection.length<arenaSize)arenaSelection.push(id);render()
}
const PVP_RIVAL_TEMPLATES=[
  {class:'Warrior',spec:'Protection',role:'tank'},{class:'Priest',spec:'Holy',role:'healer'},{class:'Rogue',spec:'Assassination',role:'dps'},
  {class:'Hunter',spec:'Marksman',role:'dps'},{class:'Mage',spec:'Arcane',role:'dps'},{class:'Paladin',spec:'Holy',role:'healer'},
  {class:'Paladin',spec:'Protection',role:'tank'},{class:'Druid',spec:'Restoration',role:'healer'}
];
function pvpCombatInput(c){
  const g=pvpGearScore(c);
  return {...c,role:classRole(c),pvpPower:characterPvpPower(c),pvpDefence:g.defence,controlResistance:g.control}
}
function makeEnemyUnits(count,power=125,defence=12,control=6){
  const names=['Vex','Rook','Nyra','Kade','Mara','Thorn','Iris','Vale','Ash','Renn','Cinder','Orin','Tessa','Bram','Selene','Doran','Lumi','Corin','Rhea','Aeris'];
  return Array.from({length:count},(_,i)=>{const t=PVP_RIVAL_TEMPLATES[i%PVP_RIVAL_TEMPLATES.length],variance=.92+Math.random()*.16;return{id:`enemy-${i}`,name:names[i%names.length]+(i>=names.length?` ${Math.floor(i/names.length)+1}`:''),portrait:'◆',...t,level:Math.max(1,Math.round(availableRoster()[0]?.level||10)),pvpPower:Math.round(power*variance),pvpDefence:Math.round(defence*variance),controlResistance:Math.round(control*variance)}})
}
function makeAlliedUnits(count,power=125,defence=10,control=5){
  return Array.from({length:Math.max(0,count)},(_,i)=>{const t=PVP_RIVAL_TEMPLATES[i%PVP_RIVAL_TEMPLATES.length];return{id:`ally-${i}`,name:`Allied ${Math.floor(i/5)+2} · ${i%5+1}`,portrait:'◇',...t,level:Math.max(1,Math.round(availableRoster()[0]?.level||10)),pvpPower:Math.round(power*(.94+Math.random()*.12)),pvpDefence:defence,controlResistance:control}})
}
function pvpSummary(kind,mode,win,result){
  if(kind==='arena')return win?'Your squad eliminates the opposing team.':'The opposing squad eliminates your team.';
  if(mode==='capture-the-flag')return win?`Your side wins ${result.scoreText} on captures.`:`The opposition wins the flag routes ${result.scoreText}.`;
  return win?`Your side wins King of the Hill ${result.scoreText}.`:`The opposition wins King of the Hill ${result.scoreText}.`
}
function applyShock(chars,delta){
  const e=game()?.getEntitlements?.()||{recoveryMinutes:60};
  chars.forEach(c=>{
    c.cellShock=clamp((Number(c.cellShock)||0)+delta,0,100);
    if(c.cellShock>=100&&!c.cellShockLockedUntil)c.cellShockLockedUntil=new Date(Date.now()+Number(e.recoveryMinutes||60)*60000).toISOString();
  })
}
function beginVisual(match,result,finish){
  const flow=window.CellboundPvPMatch;
  if(flow?.play){flow.play({match,result,onResolved:finish});return}
  const stage=$('#pvpMatchStage');if(!stage){finish();return}
  const viewer=window.CellboundPvPViewer;
  if(!viewer?.play){stage.innerHTML='<article class="pvp-panel pvp-result defeat"><p>PvP failed to load. Reload Cellbound and try again.</p></article>';matchRunning=false;return}
  viewer.play({stage,match,result,onComplete:finish})
}
function runBattleground(){
  if(matchRunning)return;const p=ensureState(),chars=activeParty(),ready=squadStatus(chars);if(!ready.ok)return;
  const engine=window.CellboundPvPCombat;if(!engine?.simulate){alert('PvP failed to load. Reload Cellbound and try again.');return}
  matchRunning=true;render();
  const playerCore=chars.map(pvpCombatInput),avgPower=playerCore.reduce((n,x)=>n+x.pvpPower,0)/Math.max(1,playerCore.length),avgDef=playerCore.reduce((n,x)=>n+(x.pvpDefence||0),0)/Math.max(1,playerCore.length),avgControl=playerCore.reduce((n,x)=>n+(x.controlResistance||0),0)/Math.max(1,playerCore.length);
  const allies=makeAlliedUnits(battlegroundSize-5,avgPower,avgDef,avgControl),enemyScale=.94+Math.random()*.12,enemies=makeEnemyUnits(battlegroundSize,avgPower*enemyScale,avgDef,avgControl),blue=[...playerCore,...allies];
  const result=engine.simulate({blue,red:enemies,kind:'battleground',mode:battlegroundMode,size:battlegroundSize,seed:[game()?.getUser?.()?.id||'guild',p.matchHistory.length,battlegroundMode,battlegroundSize,Date.now()].join(':')});
  const win=result.outcome==='victory',rewards=BG_SIZES[battlegroundSize],objectives=battlegroundMode==='capture-the-flag'?Number(result.score?.blue)||0:Math.max(1,Math.round((Number(result.score?.blue)||0)/25)),bonus=Math.min(Math.round(rewards.winMarks*.35),objectives*4),currency=(win?rewards.winMarks:rewards.lossMarks)+bonus,rankXp=(win?rewards.winXp:rewards.lossXp)+objectives*8,shockDelta=win?-2:2;
  const match={kind:'battleground',mode:battlegroundMode,size:battlegroundSize,win,scoreText:result.scoreText,currency,rankXp,objectives,shockDelta,summary:pvpSummary('battleground',battlegroundMode,win,result),playerGuild:activeName(),opponentGuild:chooseRivalGuild(),playerUnits:blue,enemyUnits:enemies};
  beginVisual(match,result,()=>{
    p.warMarks+=currency;p.bgXp+=rankXp;p.bgObjectives+=objectives;if(win)p.bgWins++;else p.bgLosses++;applyShock(chars,shockDelta);
    p.matchHistory.unshift({at:nowIso(),kind:'battleground',mode:battlegroundMode,size:battlegroundSize,win,currency,rankXp,score:result.scoreText,kills:result.summary?.blue?.kills||0,deaths:result.summary?.blue?.deaths||0});p.matchHistory=p.matchHistory.slice(0,40);
    state().activity?.push?.(`${win?'Won':'Lost'} ${battlegroundSize}v${battlegroundSize} ${MODE_DEFS[battlegroundMode].name}: ${result.scoreText}.`);
    if(arenaUnlocked(p)&&!p.arenaUnlockedAt){p.arenaUnlockedAt=nowIso();state().activity?.push?.('The Arena has opened. Rated PvP is now available.')}
    lastMatch=match;matchRunning=false;game()?.save?.();game()?.renderAll?.();render()
  })
}
function runArena(){
  if(matchRunning)return;const p=ensureState();if(!arenaUnlocked(p))return;
  const engine=window.CellboundPvPCombat;if(!engine?.simulate){alert('PvP failed to load. Reload Cellbound and try again.');return}
  const chars=arenaSelection.map(id=>state()?.roster?.find(c=>c.id===id)).filter(c=>c&&!game()?.isUnavailable?.(c));if(chars.length!==arenaSize)return;
  matchRunning=true;render();
  const blue=chars.map(pvpCombatInput),own=teamPower(chars,'arena'),oppRating=Math.max(700,Math.round(p.arenaRating-110+Math.random()*220)),expected=1/(1+Math.pow(10,(oppRating-p.arenaRating)/400)),avgPower=blue.reduce((n,x)=>n+x.pvpPower,0)/Math.max(1,blue.length),avgDef=blue.reduce((n,x)=>n+(x.pvpDefence||0),0)/Math.max(1,blue.length),avgControl=blue.reduce((n,x)=>n+(x.controlResistance||0),0)/Math.max(1,blue.length),ratingScale=clamp(1+(oppRating-p.arenaRating)/1800,.88,1.14),red=makeEnemyUnits(arenaSize,avgPower*ratingScale,avgDef*ratingScale,avgControl);
  const result=engine.simulate({blue,red,kind:'arena',mode:'arena',size:arenaSize,seed:[game()?.getUser?.()?.id||'guild',p.matchHistory.length,'arena',arenaSize,Date.now()].join(':')}),win=result.outcome==='victory';
  const k=32,ratingDelta=Math.round(k*((win?1:0)-expected)),ratingBefore=Math.round(p.arenaRating),ratingAfter=Math.max(0,ratingBefore+ratingDelta),reward=win?ARENA_FORMATS[arenaSize].win:ARENA_FORMATS[arenaSize].loss,shockDelta=win?-4:4;
  const match={kind:'arena',size:arenaSize,win,scoreText:result.scoreText+' standing',currency:reward,rankXp:0,objectives:0,shockDelta,ratingDelta,ratingBefore,ratingAfter,summary:pvpSummary('arena','arena',win,result),playerGuild:activeName(),opponentGuild:chooseRivalGuild(oppRating),playerUnits:blue,enemyUnits:red};
  beginVisual(match,result,()=>{
    p.arenaSeals+=reward;p.arenaRating=ratingAfter;if(win){p.arenaWins++;p.season.wins++}else{p.arenaLosses++;p.season.losses++}p.season.bestRating=Math.max(Number(p.season.bestRating)||1000,ratingAfter);applyShock(chars,shockDelta);
    p.matchHistory.unshift({at:nowIso(),kind:'arena',size:arenaSize,win,reward,ratingDelta,ratingAfter,kills:result.summary?.blue?.kills||0,deaths:result.summary?.blue?.deaths||0});p.matchHistory=p.matchHistory.slice(0,40);state().activity?.push?.(`${win?'Won':'Lost'} ${arenaSize}v${arenaSize} Arena · rating ${ratingBefore} → ${ratingAfter}.`);
    lastMatch=match;matchRunning=false;game()?.save?.();game()?.renderAll?.();render()
  })
}
function buyGear(tier,slot){
  const p=ensureState(),c=state()?.roster?.find(x=>x.id===armouryCharacterId),t=TIER_META[tier],meta=SLOT_META[slot];if(!c||!t||!meta)return;
  if(tier===2&&!arenaUnlocked(p))return;if(tier===3&&p.seasonCrests<=0)return;
  const cost=meta.cost[tier-1],currency=t.currency,current=c.pvpEquipment?.[slot];if((Number(current?.tier)||0)>=tier||p[currency]<cost)return;
  p[currency]-=cost;c.pvpEquipment[slot]=gearPiece(tier,slot);p.purchaseHistory.unshift({at:nowIso(),characterId:c.id,characterName:c.name,tier,slot,cost,currency});p.purchaseHistory=p.purchaseHistory.slice(0,80);if(tier===1)p.t1Purchases++;
  state().activity?.push?.(`${c.name} equipped ${c.pvpEquipment[slot].name}.`);
  if(arenaUnlocked(p)&&!p.arenaUnlockedAt){p.arenaUnlockedAt=nowIso();state().activity?.push?.('The Arena has opened. Rated PvP is now available.')}
  game()?.save?.();render()
}

window.CellboundPvP={version:'1.2.0',render,arenaUnlocked,getRank:()=>bgRank(ensureState()),getState:()=>ensureState()};
window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='pvp')render()});
let bootTries=0;const boot=setInterval(()=>{bootTries++;if(game()?.ready){clearInterval(boot);ensureState();if($('#pvp')?.classList.contains('active'))render()}else if(bootTries>80)clearInterval(boot)},125);
})();