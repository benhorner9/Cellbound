(()=>{
'use strict';
const G=window.CellboundGear;
const P=window.CellboundProfessions;
if(!G){console.error('Cellbound gear catalogue failed to load.');return;}

const SUPABASE_URL='https://jvydqeikdpelmtloulnd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl';
const REMEMBER_KEY='cellbound-remember-device';
const STORAGE='cellbound-management-reboot-v3';
const PREVIOUS_STORAGE='cellbound-management-reboot-v2';
const LOCAL_OWNER='cellbound-management-owner';
const SAVE_VERSION=4;
const PVE_WIPE_CELL_SHOCK=25;
const STANDARD_RECOVERY_MINUTES=60;
const MEMBER_RECOVERY_MINUTES=30;
const ILVL_SLOTS=['Head','Chest','Weapon'];
const SLOT_ITEM_LEVEL={Head:[18,26,34],Chest:[20,28,36],Weapon:[22,30,38]};
const SLOT_POWER={Head:[2,5,9],Chest:[3,6,10],Weapon:[4,8,12]};
const authStorage={
  getItem:key=>localStorage.getItem(key)??sessionStorage.getItem(key),
  setItem(key,value){const keep=localStorage.getItem(REMEMBER_KEY)==='1';const a=keep?localStorage:sessionStorage,b=keep?sessionStorage:localStorage;a.setItem(key,value);b.removeItem(key)},
  removeItem(key){localStorage.removeItem(key);sessionStorage.removeItem(key)}
};
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:authStorage}});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

G.items.forEach(item=>{
  const tier=Math.max(1,Math.min(3,Number(item.tier)||1));
  const slot=item.slot;
  item.itemLevel=item.itemLevel||SLOT_ITEM_LEVEL[slot]?.[tier-1]||18+(tier-1)*8;
  item.power=item.power||SLOT_POWER[slot]?.[tier-1]||tier*3;
  item.tradeState=item.tradeState||'tradeable';
  item.visualKey=item.visualKey||item.itemId;
});

const ui={
  pageTitle:$('#pageTitle'),rosterGrid:$('#rosterGrid'),overviewRoster:$('#overviewRoster'),partyRoster:$('#partyRoster'),partySlots:$('#partySlots'),
  readinessFill:$('#readinessFill'),readinessText:$('#readinessText'),readinessLabel:$('#readinessLabel'),readinessHint:$('#readinessHint'),bossSelect:$('#bossSelect'),
  attemptBtn:$('#attemptBtn'),bossList:$('#bossList'),reportsList:$('#reportsList'),activityLog:$('#activityLog'),
  attemptModal:$('#attemptModal'),attemptStage:$('#attemptStage'),bankModal:$('#bankModal'),bankDetail:$('#bankDetail'),bankGrid:$('#bankGrid'),bankSummary:$('#bankSummary'),
  renown:$('#renown'),gold:$('#gold'),rosterCount:$('#rosterCount'),bankCount:$('#bankCount'),dungeonProgress:$('#dungeonProgress'),
  partyIlvlTop:$('#partyItemLevelTop'),membershipStatus:$('#membershipStatus'),syncStatus:$('#syncStatus')
};

const classes={
  Warrior:{icon:'⚔',glow:'#b86b55',specs:{Protection:{role:'tank',talents:['Shield Mastery','Last Stand','Bulwark']},Arms:{role:'dps',talents:['Weapon Mastery','Deep Wounds','Execute']}}},
  Paladin:{icon:'✥',glow:'#d8b65d',specs:{Protection:{role:'tank',talents:['Sacred Shield','Guardian Oath','Consecration']},Holy:{role:'healer',talents:['Divine Light','Grace','Beacon']}}},
  Priest:{icon:'✚',glow:'#e2d9c5',specs:{Holy:{role:'healer',talents:['Renew','Serenity','Divine Hymn']}}},
  Druid:{icon:'❈',glow:'#7fc47a',specs:{Restoration:{role:'healer',talents:['Rejuvenation','Lifebloom','Tranquility']}}},
  Hunter:{icon:'➶',glow:'#9abe68',specs:{Marksman:{role:'dps',talents:['True Aim','Rapid Fire','Kill Shot']}}},
  Rogue:{icon:'◆',glow:'#d9c86c',specs:{Assassination:{role:'dps',talents:['Ambush','Venom','Eviscerate']}}},
  Mage:{icon:'✦',glow:'#6da7df',specs:{Arcane:{role:'dps',talents:['Arcane Focus','Surge','Barrage']}}}
};

const bosses=[
  {id:'ashwarden',name:'Ash Warden Kael',rune:'♜',glow:'#8c4e35',requiredItemLevel:18,recommendedItemLevel:20,recommendedPower:42,mechanic:'Tank pressure and frontal cleave.',tier2Chance:.35},
  {id:'embermaw',name:'Embermaw',rune:'♨',glow:'#b66232',requiredItemLevel:22,recommendedItemLevel:24,recommendedPower:56,mechanic:'Heavy group damage and interrupt checks.',tier2Chance:.40},
  {id:'vaultheart',name:'The Vaultheart',rune:'◇',glow:'#805b98',requiredItemLevel:26,recommendedItemLevel:29,recommendedPower:68,mechanic:'Multi-phase encounter with burst windows.',tier2Chance:.50}
];

let state=null;
let account=null;
let currentUser=null;
let saveSerial=Promise.resolve();
let syncTimer=null;
let recoveringTicker=null;
const nativeLocalSet=Storage.prototype.setItem;

function talentState(className){
  const out={};Object.entries(classes[className]?.specs||{}).forEach(([spec,data])=>{out[spec]={};data.talents.forEach((name,i)=>out[spec][name]=i<2?1:0)});return out;
}
function cloneGear(item,source='Starting Equipment'){return item?{...item,source,quantity:undefined}:null;}
function starterEquipment(klass){
  const set=G.starterSet(klass);
  return {Head:cloneGear(set.find(x=>x.slot==='Head')),Chest:cloneGear(set.find(x=>x.slot==='Chest')),Weapon:cloneGear(set.find(x=>x.slot==='Weapon')),Shoulders:null,Hands:null,Waist:null,Legs:null,Feet:null,OffHand:null,Ring1:null,Ring2:null,Trinket1:null,Trinket2:null,Relic:null};
}
const starterDefs=[
  ['r1','Thane Alder','Warrior','Protection',6,48,18,'TA'],
  ['r2','Mira Voss','Priest','Holy',6,45,12,'MV'],
  ['r3','Kael Renn','Warrior','Arms',6,52,22,'KR'],
  ['r4','Sera Vale','Hunter','Marksman',5,44,9,'SV'],
  ['r5','Orin Pell','Mage','Arcane',5,46,14,'OP']
];
const starterRoster=starterDefs.map(([id,name,klass,spec,level,power,knowledge,portrait])=>{
  const equipment=starterEquipment(klass);
  return {id,name,class:klass,spec,level,power,gear:0,talent:1,knowledge:{ashwarden:knowledge,embermaw:0,vaultheart:0},portrait,gearItems:ILVL_SLOTS.map(slot=>equipment[slot]?.name||'Empty'),equipment,talents:talentState(klass),cellShock:0,cellShockLockedUntil:null,professions:[null,null]};
});
function initialState(){
  return {saveVersion:SAVE_VERSION,gearVersion:2,renown:120,gold:1840,roster:JSON.parse(JSON.stringify(starterRoster)),party:{tank:'r1',healer:'r2',dps:['r3','r4','r5']},bossKills:{ashwarden:false,embermaw:false,vaultheart:false},reports:[],bank:[],materials:{},consumables:[],discoveredRecipes:[],tradeInbox:[],collectionHistory:[],activity:['The guild charter has been signed.','Your first five adventurers are ready.','Tier 1 equipment issued to the active party.','The Ashen Vault is available.']};
}
function entitlementFromAccount(a){
  const until=a?.membership_active_until?new Date(a.membership_active_until).getTime():0;
  const member=Boolean(a?.membership_override)||(until>Date.now());
  return {member,rosterCap:member?10:5,professionSlots:member?2:1,recoveryMinutes:member?MEMBER_RECOVERY_MINUTES:STANDARD_RECOVERY_MINUTES,membershipActiveUntil:a?.membership_active_until||null};
}
function entitlements(){return entitlementFromAccount(account);}
function classDef(c){return classes[c.class]||classes.Warrior;}
function specDef(c){return classDef(c)?.specs?.[c.spec];}
function roleOf(c){return specDef(c)?.role||'dps';}
function roleLabel(role){return role==='dps'?'Damage':role[0].toUpperCase()+role.slice(1);}
function charById(id){return state?.roster?.find(c=>c.id===id)||null;}
function bossById(id){return bosses.find(b=>b.id===id)||bosses[0];}
function bankTotal(){return (state?.bank||[]).reduce((n,item)=>n+(item.quantity||1),0);}
function averageKnowledge(c){const vals=Object.values(c.knowledge||{});return vals.length?Math.round(vals.reduce((a,b)=>a+(Number(b)||0),0)/vals.length):0;}
function canonicalItem(raw){if(!raw)return null;const base=G.byName(raw.name)||G.byId(raw.itemId);return base?{...base,...raw,itemLevel:raw.itemLevel||base.itemLevel,power:raw.power||base.power,tradeState:raw.tradeState||base.tradeState,visualKey:raw.visualKey||base.visualKey}:raw;}
function characterItemLevel(c){
  const items=ILVL_SLOTS.map(slot=>canonicalItem(c?.equipment?.[slot]));
  const total=items.reduce((sum,item)=>sum+(Number(item?.itemLevel)||0),0);
  return Math.round(total/ILVL_SLOTS.length);
}
function flatPartyIds(){return [state?.party?.tank,state?.party?.healer,...(state?.party?.dps||[])].filter(Boolean);}
function partyCharacters(){return flatPartyIds().map(charById).filter(Boolean);}
function partyItemLevel(){const chars=partyCharacters();return chars.length===5?Math.round(chars.reduce((sum,c)=>sum+characterItemLevel(c),0)/5):0;}
function isRosterSlotUnlocked(index){return index<entitlements().rosterCap;}
function isCharacterRosterUnlocked(id){const i=state?.roster?.findIndex(c=>c.id===id)??-1;return i>=0&&isRosterSlotUnlocked(i);}
function recoveryRemainingMs(c){if(!c?.cellShockLockedUntil)return 0;return Math.max(0,new Date(c.cellShockLockedUntil).getTime()-Date.now());}
function refreshRecovery(c){
  if(!c)return false;
  const remaining=recoveryRemainingMs(c);
  if(c.cellShockLockedUntil&&remaining<=0){c.cellShockLockedUntil=null;c.cellShock=0;return true;}
  return false;
}
function isUnavailable(c){if(!c)return true;refreshRecovery(c);return Boolean(c.cellShockLockedUntil&&recoveryRemainingMs(c)>0);}
function formatRemaining(c){
  const ms=recoveryRemainingMs(c);if(ms<=0)return'';const total=Math.ceil(ms/1000),m=Math.floor(total/60),s=total%60;return `${m}:${String(s).padStart(2,'0')}`;
}
function canUseItem(c,item){return item?.class===c.class||item?.classes==='all'||item?.classes?.includes?.(c.class);}
function tierText(item){return `Tier ${item?.tier||1} · ${item?.rarity||'Common'} · iLvl ${item?.itemLevel||0}`;}
function currentBossProgressionUnlocked(boss){const i=bosses.findIndex(b=>b.id===boss.id);return i<=0||Boolean(state.bossKills[bosses[i-1].id]);}

function normalizeCharacter(c,index=0){
  c.id=c.id||`legacy-${index}-${Date.now()}`;c.class=c.class||'Warrior';c.spec=c.spec||Object.keys(classDef(c).specs)[0];c.level=Math.max(1,Number(c.level)||1);c.power=Math.max(1,Number(c.power)||1);
  c.talents=c.talents||talentState(c.class);c.knowledge=c.knowledge||{ashwarden:0,embermaw:0,vaultheart:0};c.equipment=c.equipment||{};
  const starters=starterEquipment(c.class);
  ILVL_SLOTS.forEach(slot=>{const existing=canonicalItem(c.equipment?.[slot]);c.equipment[slot]=existing||starters[slot];});
  ['Shoulders','Hands','Waist','Legs','Feet','OffHand','Ring1','Ring2','Trinket1','Trinket2','Relic'].forEach(slot=>{if(!(slot in c.equipment))c.equipment[slot]=null;});
  c.gearItems=ILVL_SLOTS.map(slot=>c.equipment[slot]?.name||'Empty');c.cellShock=Math.max(0,Math.min(100,Number(c.cellShock)||0));c.cellShockLockedUntil=c.cellShockLockedUntil||null;c.professions=Array.isArray(c.professions)?c.professions.slice(0,2):[null,null];while(c.professions.length<2)c.professions.push(null);
  c.gear=characterItemLevel(c);return c;
}
function canonicalBank(raw){
  const out=[];(Array.isArray(raw)?raw:[]).forEach(item=>{const canon=canonicalItem(item);if(!canon?.name)return;const found=out.find(x=>x.itemId===canon.itemId&&x.source===item.source);if(found)found.quantity+=(item.quantity||1);else out.push({...canon,id:item.id||`bank-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,quantity:item.quantity||1,source:item.source||'Previous loot'});});return out;
}
function removeInvalidPartyMembers(s){
  const allowed=new Set((s.roster||[]).filter((c,i)=>isRosterSlotUnlocked(i)&&!isUnavailable(c)).map(c=>c.id));
  if(!allowed.has(s.party?.tank))s.party.tank=null;if(!allowed.has(s.party?.healer))s.party.healer=null;
  s.party.dps=Array.isArray(s.party?.dps)?s.party.dps.slice(0,3):[null,null,null];while(s.party.dps.length<3)s.party.dps.push(null);s.party.dps=s.party.dps.map(id=>allowed.has(id)?id:null);
}
function migrateState(raw){
  const s=raw&&Array.isArray(raw.roster)&&raw.roster.length?raw:initialState();
  s.saveVersion=SAVE_VERSION;s.gearVersion=2;s.renown=Number(s.renown)||0;s.gold=Number(s.gold)||0;s.roster=s.roster.map(normalizeCharacter);s.bank=canonicalBank(s.bank);s.materials=s.materials&&typeof s.materials==='object'?s.materials:{};s.consumables=Array.isArray(s.consumables)?s.consumables:[];s.discoveredRecipes=Array.isArray(s.discoveredRecipes)?s.discoveredRecipes:[];s.tradeInbox=Array.isArray(s.tradeInbox)?s.tradeInbox:[];s.collectionHistory=Array.isArray(s.collectionHistory)?s.collectionHistory:[];s.reports=Array.isArray(s.reports)?s.reports:[];s.activity=Array.isArray(s.activity)?s.activity:[];s.bossKills=s.bossKills||{ashwarden:false,embermaw:false,vaultheart:false};s.party=s.party||{tank:null,healer:null,dps:[null,null,null]};
  s.roster.forEach(c=>refreshRecovery(c));return s;
}
function localCandidate(userId){
  const owner=localStorage.getItem(LOCAL_OWNER);
  if(owner&&userId&&owner!==userId)return null;
  for(const key of [STORAGE,PREVIOUS_STORAGE]){try{const raw=JSON.parse(localStorage.getItem(key));if(raw?.roster?.length)return raw;}catch{}}
  return null;
}
function setSync(text,tone='ok'){if(!ui.syncStatus)return;ui.syncStatus.textContent=text;ui.syncStatus.dataset.tone=tone;}
function writeLocal(){if(!state)return;nativeLocalSet.call(localStorage,STORAGE,JSON.stringify(state));}
async function persistState(){
  if(!currentUser||!state)return;
  const snapshot=JSON.parse(JSON.stringify(state));setSync('Saving…','busy');
  saveSerial=saveSerial.then(async()=>{
    const {error}=await supabaseClient.from('guild_accounts').upsert({user_id:currentUser.id,game_state:snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error){console.error('Cellbound save failed',error);setSync('Save issue','error');return false;}setSync('Saved','ok');return true;
  });
  return saveSerial;
}
function save(){writeLocal();clearTimeout(syncTimer);syncTimer=setTimeout(()=>persistState(),120);return saveSerial;}
async function loadAccount(user){
  currentUser=user;setSync('Loading…','busy');
  const {data,error}=await supabaseClient.from('guild_accounts').select('user_id,game_state,membership_active_until,membership_override,updated_at').eq('user_id',user.id).maybeSingle();
  if(error){console.error('Cellbound account load failed',error);account={user_id:user.id,membership_active_until:null,membership_override:false};state=migrateState(localCandidate(user.id)||initialState());setSync('Local fallback','error');writeLocal();return;}
  account=data||{user_id:user.id,membership_active_until:null,membership_override:false};
  state=migrateState(data?.game_state&&Object.keys(data.game_state).length?data.game_state:(localCandidate(user.id)||initialState()));
  removeInvalidPartyMembers(state);nativeLocalSet.call(localStorage,LOCAL_OWNER,user.id);writeLocal();
  if(!data){await supabaseClient.from('guild_accounts').insert({user_id:user.id,game_state:state,updated_at:new Date().toISOString()});}
  else await persistState();
  setSync('Saved','ok');
}
function replaceState(next){state=migrateState(next);removeInvalidPartyMembers(state);writeLocal();persistState();renderAll();}

// Compatibility: the existing character sheet writes to localStorage. Capture those writes,
// adopt them into the authoritative in-memory state and persist them to Supabase.
Storage.prototype.setItem=function(key,value){
  nativeLocalSet.call(this,key,value);
  if(this===localStorage&&key===STORAGE&&window.CellboundGame?.ready){
    try{const next=JSON.parse(value);if(next?.roster?.length){state=migrateState(next);removeInvalidPartyMembers(state);nativeLocalSet.call(localStorage,STORAGE,JSON.stringify(state));persistState();}}
    catch(err){console.warn('Ignored invalid Cellbound local save',err);}
  }
};

function switchView(id){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  const labels={overview:'Command Overview',roster:'Roster',bank:'Guild Bank',content:'PvE Content',party:'Party Builder',reports:'Attempt Reports'};if(ui.pageTitle)ui.pageTitle.textContent=labels[id]||'Cellbound';
  if(id==='party')renderParty();if(id==='reports')renderReports();if(id==='bank')renderBank();if(id==='content')renderBosses();
}
$$('.nav-btn[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.jump)));

function renderTop(){
  if(!state)return;const e=entitlements(),pi=partyItemLevel(),unlocked=Math.min(state.roster.length,e.rosterCap);
  ui.renown.textContent=state.renown;ui.gold.textContent=state.gold.toLocaleString();ui.rosterCount.textContent=`${unlocked} / ${e.rosterCap}`;if(ui.bankCount)ui.bankCount.textContent=bankTotal();if(ui.dungeonProgress)ui.dungeonProgress.textContent=`${Object.values(state.bossKills).filter(Boolean).length} / 3 bosses`;if(ui.partyIlvlTop)ui.partyIlvlTop.textContent=pi||'—';if(ui.membershipStatus){ui.membershipStatus.textContent=e.member?'MEMBER':'STANDARD';ui.membershipStatus.dataset.member=e.member?'1':'0';}
}
function shockMarkup(c){const pct=Math.round(c.cellShock||0),locked=isUnavailable(c);return `<div class="cell-shock-row"><div><span>Cell Shock</span><b>${pct}%${locked?` · ${formatRemaining(c)}`:''}</b></div><div class="cell-shock-bar"><i style="width:${pct}%"></i></div></div>`;}
function rosterCard(c,index){
  const role=roleOf(c),unlocked=isRosterSlotUnlocked(index),locked=isUnavailable(c),ilvl=characterItemLevel(c),status=!unlocked?'MEMBERSHIP SLOT':locked?'RECOVERING':'READY';
  return `<article class="char-card ${!unlocked?'roster-locked':''} ${locked?'shock-locked':''}" data-role="${role}" style="--glow:${classDef(c).glow}"><div class="char-top"><div class="char-portrait">${c.portrait}</div><span class="role-tag role-${role}">${roleLabel(role)}</span></div><div class="character-status ${locked?'danger':''}">${status}${locked?` · ${formatRemaining(c)}`:''}</div><h3>${c.name}</h3><div class="class">${c.class} · ${c.spec} · Level ${c.level}</div><div class="char-stats"><div><span>Power</span><b>${c.power}</b></div><div><span>Item Level</span><b>${ilvl}</b></div><div><span>Points</span><b>${c.talent}</b></div></div>${shockMarkup(c)}<div class="knowledge-row"><div><span>Avg. Knowledge</span><b>${averageKnowledge(c)}%</b></div><div class="knowledge-bar"><i style="width:${averageKnowledge(c)}%"></i></div></div><button data-char="${c.id}" ${!unlocked?'disabled':''}>${unlocked?'VIEW CHARACTER':'MEMBERSHIP REQUIRED'}</button></article>`;
}
function renderRoster(filter='all'){if(!ui.rosterGrid)return;ui.rosterGrid.innerHTML=state.roster.filter(c=>filter==='all'||roleOf(c)===filter).map(c=>rosterCard(c,state.roster.indexOf(c))).join('');}
$$('.filter').forEach(b=>b.addEventListener('click',()=>{$$('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderRoster(b.dataset.filter);}));
function renderOverview(){
  if(!ui.overviewRoster)return;const active=new Set(flatPartyIds());ui.overviewRoster.innerHTML=state.roster.slice(0,entitlements().rosterCap).map(c=>`<div class="mini-row ${isUnavailable(c)?'shock-mini':''}"><div class="avatar">${c.portrait}</div><div><b>${c.name}</b><small>${c.class} · ${c.spec} · iLvl ${characterItemLevel(c)}${active.has(c.id)?' · ACTIVE':''}</small></div><span class="role-tag role-${roleOf(c)}">${isUnavailable(c)?formatRemaining(c):roleLabel(roleOf(c))}</span></div>`).join('');if(ui.activityLog)ui.activityLog.innerHTML=state.activity.slice(-6).reverse().map((a,i)=>`<div class="activity-entry"><span>${i===0?'Latest':`${i} event${i>1?'s':''} ago`}</span><b>${a}</b></div>`).join('');
}
function renderBosses(){
  const pi=partyItemLevel();
  ui.bossList.innerHTML=bosses.map((b,i)=>{const progression=currentBossProgressionUnlocked(b),ilvlOk=pi>=b.requiredItemLevel,known=Math.round(state.roster.reduce((s,c)=>s+(c.knowledge[b.id]||0),0)/Math.max(1,state.roster.length));const gate=state.bossKills[b.id]?'DEFEATED · FARMABLE':!progression?'LOCKED — DEFEAT PREVIOUS BOSS':!ilvlOk?`ITEM LEVEL REQUIRED — ${pi} / ${b.requiredItemLevel}`:'AVAILABLE';return `<article class="boss-card ${(!progression||!ilvlOk)?'boss-gated':''}"><div class="boss-visual" data-rune="${b.rune}" style="--boss-glow:${b.glow}"><span class="boss-number">BOSS ${i+1}</span></div><div class="boss-body"><div class="boss-title-row"><h3>${b.name}</h3><span class="ilvl-badge">iLvl ${b.requiredItemLevel}+</span></div><p>${b.mechanic}</p><div class="boss-meta"><div><span>Your Party</span><b>iLvl ${pi||'—'}</b></div><div><span>Recommended</span><b>iLvl ${b.recommendedItemLevel}</b></div><div><span>Guild Knowledge</span><b>${known}%</b></div><div><span>Gear Drops</span><b>T1 / T2</b></div></div><div class="boss-lock">${gate}</div></div></article>`;}).join('');
  ui.bossSelect.innerHTML=bosses.map((b,i)=>`<option value="${b.id}" ${i>0&&!state.bossKills[bosses[i-1].id]?'disabled':''}>${b.name} · iLvl ${b.requiredItemLevel}${state.bossKills[b.id]?' — Farm':''}</option>`).join('');
}
function renderBank(){
  const total=bankTotal(),unique=state.bank.length,t1=state.bank.filter(x=>x.tier===1).reduce((a,b)=>a+(b.quantity||1),0),t2=state.bank.filter(x=>x.tier===2).reduce((a,b)=>a+(b.quantity||1),0);
  ui.bankSummary.innerHTML=`<div><span>Stored Items</span><b>${total}</b></div><div><span>Unique Items</span><b>${unique}</b></div><div><span>Tier 1 / Tier 2</span><b>${t1} / ${t2}</b></div>`;
  if(!state.bank.length){ui.bankGrid.innerHTML='<div class="bank-empty"><span>◇</span><h3>Your bank is empty.</h3><p>Dungeon victories award equipment here before you decide who receives it.</p></div>';return;}
  ui.bankGrid.innerHTML=state.bank.map(item=>`<article class="bank-item gear-bank-item tier-${item.tier||1}"><div class="bank-icon gear-bank-icon">${G.artHTML(item,72)}</div><div class="bank-copy"><small>${tierText(item)} · ${item.class} · ${item.slot}</small><h3>${item.name}</h3><p>${item.source||'Guild Bank'}</p></div><div class="bank-qty">×${item.quantity||1}</div><button data-bank-item="${item.id}">MANAGE</button></article>`).join('');
  ui.bankGrid.querySelectorAll('[data-bank-item]').forEach(b=>b.addEventListener('click',()=>openBankItem(b.dataset.bankItem)));
}
function openBankItem(id){
  const item=state.bank.find(x=>x.id===id);if(!item)return;const eligible=state.roster.filter((c,i)=>isRosterSlotUnlocked(i)&&canUseItem(c,item)&&!isUnavailable(c));
  ui.bankDetail.innerHTML=`<div class="detail-hero gear-detail-hero"><div class="gear-detail-art">${G.artHTML(item,112)}</div><div><small>${tierText(item).toUpperCase()} · ${item.class.toUpperCase()} · ${item.slot.toUpperCase()}</small><h2>${item.name}</h2><p>Dropped by ${item.source||'Unknown source'}</p><p>Quantity in bank: ${item.quantity||1}</p></div></div><div class="bank-manage"><h3>Equip to an adventurer</h3><p>Equipment stays in the Guild Bank until you assign it.</p><div class="bank-character-list">${eligible.map(c=>`<button data-equip-char="${c.id}"><span class="avatar">${c.portrait}</span><span><b>${c.name}</b><small>${c.class} · ${c.spec} · iLvl ${characterItemLevel(c)}</small></span><em>${c.equipment?.[item.slot]?.name?`Replace ${c.equipment[item.slot].name}`:'Empty slot'}</em></button>`).join('')||'<p>No available characters can use this item.</p>'}</div></div>`;
  ui.bankModal.hidden=false;ui.bankDetail.querySelectorAll('[data-equip-char]').forEach(b=>b.addEventListener('click',()=>equipBankItem(id,b.dataset.equipChar)));
}
function addBankItem(raw,record=true){
  const canonical=canonicalItem(raw);if(!canonical)return;const existing=state.bank.find(x=>x.itemId===canonical.itemId);if(existing){existing.quantity=(existing.quantity||1)+1;existing.source=raw.source||existing.source;}else state.bank.push({...canonical,id:`bank-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,quantity:1,source:raw.source||'Unknown'});if(record)state.collectionHistory.push({itemId:canonical.itemId,name:canonical.name,tier:canonical.tier,itemLevel:canonical.itemLevel,source:raw.source||'Unknown',at:new Date().toISOString()});
}
function addMaterial(key,quantity=1){if(!key||quantity<=0)return;state.materials[key]=(Number(state.materials[key])||0)+quantity;}
function awardReagents(boss){if(!P)return[];const drops=P.rollReagents(boss.id);drops.forEach(d=>addMaterial(d.key,d.quantity));if(boss.id==='vaultheart'&&!state.discoveredRecipes.includes('enc-vault-glyph')&&Math.random()<.12){state.discoveredRecipes.push('enc-vault-glyph');drops.push({key:'recipe:enc-vault-glyph',quantity:1,recipe:true});state.activity.push('Rare recipe discovered: Vaultheart Glyph.');}return drops;}
function equipBankItem(itemId,charId){
  const item=state.bank.find(x=>x.id===itemId),c=charById(charId);if(!item||!c||!canUseItem(c,item)||isUnavailable(c))return;const old=canonicalItem(c.equipment?.[item.slot]);if(old?.name)addBankItem({...old,source:`Unequipped from ${c.name}`},false);c.equipment[item.slot]={...canonicalItem(item),source:'Equipped'};c.gearItems=ILVL_SLOTS.map(slot=>c.equipment?.[slot]?.name||'Empty');c.gear=characterItemLevel(c);item.quantity=(item.quantity||1)-1;if(item.quantity<=0)state.bank=state.bank.filter(x=>x.id!==item.id);state.activity.push(`${c.name} equipped ${item.name} (iLvl ${item.itemLevel}).`);save();ui.bankModal.hidden=true;renderAll();switchView('bank');
}
$('[data-bank-close]')?.addEventListener('click',()=>ui.bankModal.hidden=true);ui.bankModal?.addEventListener('click',e=>{if(e.target===ui.bankModal)ui.bankModal.hidden=true;});

function removeChar(id){if(state.party.tank===id)state.party.tank=null;if(state.party.healer===id)state.party.healer=null;state.party.dps=state.party.dps.map(x=>x===id?null:x);}
function assignChar(id){const c=charById(id);if(!c||!isCharacterRosterUnlocked(id)||isUnavailable(c))return;const role=roleOf(c);removeChar(id);if(role==='tank')state.party.tank=id;else if(role==='healer')state.party.healer=id;else{const idx=state.party.dps.findIndex(x=>!x);if(idx>=0)state.party.dps[idx]=id;else state.party.dps[0]=id;}save();renderAll();}
function slotHtml(role,id,index=''){const c=id?charById(id):null,icon=role==='tank'?'🛡':role==='healer'?'✚':'⚔';return `<div class="party-slot ${c?'filled':''} ${c&&isUnavailable(c)?'shock-locked':''}"><div class="slot-role">${icon}</div><div>${c?`<b>${c.name}</b><small>${c.class} · ${c.spec} · iLvl ${characterItemLevel(c)} · Shock ${c.cellShock||0}%</small>`:`<b>${roleLabel(role)} Slot${role==='dps'?` ${Number(index)+1}`:''}</b><small>Select an available adventurer</small>`}</div>${c?`<button data-remove="${c.id}">×</button>`:''}</div>`;}
function partyReadiness(){
  const ids=flatPartyIds(),boss=bossById(ui.bossSelect?.value||'ashwarden');
  if(ids.length<5)return{score:ids.length*12,ready:false,hint:'Assign 1 Tank, 1 Healer and 3 Damage characters.'};
  const chars=ids.map(charById);if(chars.some(c=>!c||isUnavailable(c)))return{score:45,ready:false,hint:'A party member is recovering from 100% Cell Shock. Rotate them out before entering content.'};
  if(ids.some(id=>!isCharacterRosterUnlocked(id)))return{score:45,ready:false,hint:'A selected character is outside your currently unlocked roster slots.'};
  const pi=partyItemLevel();if(!currentBossProgressionUnlocked(boss))return{score:55,ready:false,hint:`Defeat the previous boss before challenging ${boss.name}.`};
  if(pi<boss.requiredItemLevel)return{score:Math.min(90,Math.round((pi/boss.requiredItemLevel)*80)),ready:false,hint:`Party Item Level ${pi}. ${boss.name} requires ${boss.requiredItemLevel}. Upgrade the lowest-geared characters first.`};
  const avgPower=chars.reduce((s,c)=>s+c.power,0)/5,avgKnowledge=chars.reduce((s,c)=>s+(c.knowledge[boss.id]||0),0)/5;const score=Math.round(Math.min(100,55+(pi/boss.recommendedItemLevel)*25+avgKnowledge*.20));return{score,ready:true,hint:`Party iLvl ${pi} · Required ${boss.requiredItemLevel} · Recommended ${boss.recommendedItemLevel} · Knowledge ${avgKnowledge.toFixed(0)}% · Power ${avgPower.toFixed(0)}`};
}
function renderParty(){
  ui.partySlots.innerHTML=slotHtml('tank',state.party.tank)+slotHtml('healer',state.party.healer)+state.party.dps.map((id,i)=>slotHtml('dps',id,i)).join('');ui.partySlots.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{removeChar(b.dataset.remove);save();renderAll();}));
  const selected=new Set(flatPartyIds());ui.partyRoster.innerHTML=state.roster.map((c,i)=>{const slotLocked=!isRosterSlotUnlocked(i),shock=isUnavailable(c),disabled=selected.has(c.id)||slotLocked||shock;return `<button class="party-choice ${slotLocked?'roster-locked':''} ${shock?'shock-locked':''}" data-pick="${c.id}" ${disabled?'disabled':''}><div class="avatar">${c.portrait}</div><div><b>${c.name}</b><small>${c.class} · ${c.spec} · iLvl ${characterItemLevel(c)}</small></div><em>${slotLocked?'Member slot':shock?`Recovering ${formatRemaining(c)}`:`${roleLabel(roleOf(c))} · Shock ${c.cellShock||0}%`}</em></button>`;}).join('');
  ui.partyRoster.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>assignChar(b.dataset.pick)));const r=partyReadiness();ui.readinessFill.style.width=`${r.score}%`;ui.readinessText.textContent=`${r.score}%`;ui.readinessLabel.textContent=r.ready?'READY':'NOT READY';ui.readinessLabel.className=r.ready?'good':'';ui.readinessHint.textContent=r.hint;ui.attemptBtn.disabled=!r.ready;
}
$('#autoFill')?.addEventListener('click',()=>{const available=state.roster.filter((c,i)=>isRosterSlotUnlocked(i)&&!isUnavailable(c));const best=role=>available.filter(c=>roleOf(c)===role).sort((a,b)=>characterItemLevel(b)-characterItemLevel(a)||b.power-a.power);state.party.tank=best('tank')[0]?.id||null;state.party.healer=best('healer')[0]?.id||null;state.party.dps=best('dps').slice(0,3).map(c=>c.id);while(state.party.dps.length<3)state.party.dps.push(null);save();renderAll();});ui.bossSelect?.addEventListener('change',renderParty);

function applyCellShock(c,amount){
  if(!c)return;c.cellShock=Math.min(100,Math.max(0,(Number(c.cellShock)||0)+amount));if(c.cellShock>=100&&!c.cellShockLockedUntil){const mins=entitlements().recoveryMinutes;c.cellShock=100;c.cellShockLockedUntil=new Date(Date.now()+mins*60000).toISOString();state.activity.push(`${c.name} reached 100% Cell Shock and must recover for ${mins} minutes.`);removeChar(c.id);}
}
function simulateAttempt(){
  const ids=flatPartyIds(),readiness=partyReadiness();if(ids.length!==5||!readiness.ready)return;const boss=bossById(ui.bossSelect.value),party=ids.map(charById),knowledge=party.reduce((s,c)=>s+(c.knowledge[boss.id]||0),0)/5,pi=partyItemLevel(),roleBonus=(party.filter(c=>roleOf(c)==='tank').length===1&&party.filter(c=>roleOf(c)==='healer').length===1&&party.filter(c=>roleOf(c)==='dps').length===3)?8:-18,chance=Math.max(8,Math.min(92,38+(pi/boss.recommendedItemLevel)*28+knowledge*.20+roleBonus)),success=Math.random()*100<chance;
  ui.attemptModal.hidden=false;ui.attemptStage.innerHTML=`<div class="attempt-head"><div><small>THE ASHEN VAULT · PARTY ILVL ${pi}</small><h2>${boss.name}</h2></div><b>${Math.round(chance)}% projected chance</b></div><div class="attempt-body"><div class="attempt-raid"><div class="party-column">${party.map(c=>`<div class="sim-unit"><b>${c.name}</b><span>${c.class} · ${c.spec} · iLvl ${characterItemLevel(c)} · Shock ${c.cellShock||0}%</span><div class="sim-bar sim-party"><i style="width:100%"></i></div></div>`).join('')}</div><div class="versus">VS</div><div class="boss-column"><div class="sim-unit"><b>${boss.name}</b><span>${boss.mechanic}</span><div class="sim-bar sim-boss"><i id="bossSimBar" style="width:100%"></i></div></div></div></div><div class="attempt-log">Party enters combat...<br>${party[0].name} establishes threat.<br>${party[1].name} begins the healing rotation.<br>The team starts reading the encounter...</div><div id="attemptResult"></div></div>`;
  const bar=$('#bossSimBar');setTimeout(()=>{if(bar)bar.style.width=success?'0%':`${Math.max(8,Math.round(100-readiness.score*.72))}%`;},300);setTimeout(()=>resolveAttempt(boss,party,success,$('#attemptResult')),1100);
}
function resolveAttempt(boss,party,success,result){
  const knowledgeGain=party.map(c=>{const before=c.knowledge[boss.id]||0,gain=success?Math.floor(5+Math.random()*6):Math.floor(7+Math.random()*9),after=Math.min(100,before+gain);c.knowledge[boss.id]=after;return{name:c.name,before,after,gain};});let loot=null,reagents=[];
  if(success){state.bossKills[boss.id]=true;state.renown+=25;state.gold+=120;loot=canonicalItem(G.rollDungeonLoot(boss.name,boss.tier2Chance));addBankItem({...loot,source:boss.name});reagents=awardReagents(boss);state.activity.push(`${loot.name} (${loot.tierLabel}, iLvl ${loot.itemLevel}) dropped from ${boss.name}.`);state.activity.push(`${boss.name} was defeated in The Ashen Vault.`);}else{party.forEach(c=>applyCellShock(c,PVE_WIPE_CELL_SHOCK));state.activity.push(`The guild wiped on ${boss.name}. Each participating character gained ${PVE_WIPE_CELL_SHOCK}% Cell Shock.`);}
  state.reports.unshift({id:Date.now(),boss:boss.id,success,knowledgeGain,loot:loot?.name||null,lootItemId:loot?.itemId||null,lootTier:loot?.tier||null,lootItemLevel:loot?.itemLevel||null,reagents,cellShockGain:success?0:PVE_WIPE_CELL_SHOCK,partyItemLevel:party.reduce((s,c)=>s+characterItemLevel(c),0)/5,at:new Date().toISOString()});save();renderAll();
  result.innerHTML=`<div class="attempt-result"><h3>${success?'VICTORY':'WIPE — CELL SHOCK GAINED'}</h3><p>${success?'Boss defeated. PvE victories do not reduce Cell Shock.':'The group wiped. Each participating character gained Cell Shock; encounter knowledge was still earned.'}</p>${loot?`<div class="loot-drop gear-loot-drop">${G.artHTML(loot,80)}<div><small>${loot.tierLabel.toUpperCase()} · ILVL ${loot.itemLevel} · ${loot.rarity.toUpperCase()} · ${loot.class}</small><b>${loot.name}</b><span>Stored in the Guild Bank</span></div></div>`:''}${reagents.length?`<div class="reagent-reward"><small>REAGENTS RECOVERED</small>${reagents.map(d=>`<span>${P?.MATERIALS?.[d.key]?.name||'Recipe: Vaultheart Glyph'} ×${d.quantity}</span>`).join('')}</div>`:''}<p>${knowledgeGain.map(k=>`${k.name}: ${k.before}% → ${k.after}%${success?'':` · Shock ${charById(party.find(p=>p.name===k.name)?.id)?.cellShock||0}%`}`).join('<br>')}</p><button id="closeAttempt">RETURN TO GUILD</button></div>`;$('#closeAttempt')?.addEventListener('click',()=>ui.attemptModal.hidden=true);
}
ui.attemptBtn?.addEventListener('click',simulateAttempt);ui.attemptModal?.addEventListener('click',e=>{if(e.target===ui.attemptModal)ui.attemptModal.hidden=true;});
function renderReports(){
  if(!state.reports.length){ui.reportsList.innerHTML='<div class="panel" style="padding:30px;color:#657874">No attempts yet. Build a party and enter The Ashen Vault.</div>';return;}
  ui.reportsList.innerHTML=state.reports.map(r=>{const b=bossById(r.boss),loot=G.byId(r.lootItemId)||G.byName(r.loot);return `<article class="report-card"><div><div class="report-result ${r.success?'kill':'wipe'}">${r.success?'VICTORY':'WIPE'}</div><small>${new Date(r.at).toLocaleString()}</small></div><div><h3>${b?.name||'Encounter'}</h3><p>${r.success?'The party defeated the encounter. PvE victories do not clear Cell Shock.':`The party gained ${r.cellShockGain||PVE_WIPE_CELL_SHOCK}% Cell Shock and encounter knowledge.`}${loot?` Loot: ${loot.name} · iLvl ${r.lootItemLevel||loot.itemLevel||'—'} → Guild Bank.`:''}${r.reagents?.length?` Reagents: ${r.reagents.map(d=>`${P?.MATERIALS?.[d.key]?.name||'Recipe'} ×${d.quantity}`).join(', ')}.`:''}</p></div><div class="report-gain"><b>Knowledge gained</b>${r.knowledgeGain.map(k=>`<span>${k.name} +${k.gain}%</span>`).join('')}</div></article>`;}).join('');
}
function renderAll(){if(!state)return;state.roster.forEach(c=>{refreshRecovery(c);c.gear=characterItemLevel(c);});renderTop();renderOverview();renderRoster();renderBosses();renderParty();renderBank();renderReports();writeLocal();}
function tickRecovery(){if(!state)return;let changed=false;state.roster.forEach(c=>{if(refreshRecovery(c)){state.activity.push(`${c.name} has fully recovered from Cell Shock.`);changed=true;}});if(changed)save();if(state.roster.some(c=>isUnavailable(c)))renderAll();}

window.CellboundGame={
  ready:false,getState:()=>state,replaceState,getEntitlements:()=>entitlements(),getUser:()=>currentUser,getAccount:()=>account,getSupabase:()=>supabaseClient,
  characterItemLevel,partyItemLevel,isUnavailable,formatRecovery:formatRemaining,persistState,save,canonicalItem,bosses,classes,
  addBankItem,addMaterial,renderAll,switchView
};
$('#signOut')?.addEventListener('click',async()=>{clearTimeout(syncTimer);await persistState();await supabaseClient.auth.signOut();location.replace('./index.html');});
(async()=>{
  const {data,error}=await supabaseClient.auth.getSession();if(error||!data.session?.user){location.replace('./index.html');return;}
  await loadAccount(data.session.user);window.CellboundGame.ready=true;renderAll();recoveringTicker=setInterval(tickRecovery,1000);
})();
})();
