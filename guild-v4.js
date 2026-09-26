(()=>{
'use strict';
const G=window.CellboundGear;
const P=window.CellboundProfessions;
const CP=window.CellboundPortraits;
if(!G){console.error('Cellbound gear catalogue failed to load.');return;}

const SUPABASE_URL='https://jvydqeikdpelmtloulnd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl';
const REMEMBER_KEY='cellbound-remember-device';
const STORAGE='cellbound-management-reboot-v3';
const PREVIOUS_STORAGE='cellbound-management-reboot-v2';
const LOCAL_OWNER='cellbound-management-owner';
const SAVE_VERSION=6;
const PLAYER_LEVEL_CAP=15;
const PVE_WIPE_CELL_SHOCK=25;
const STANDARD_RECOVERY_MINUTES=60;
const MEMBER_RECOVERY_MINUTES=30;
const LEGACY_ILVL_SLOTS=['Head','Chest','Weapon'];
const ILVL_SLOTS=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring1','Ring2','Trinket1','Trinket2','Relic'];
const SLOT_ITEM_LEVEL=G.ITEM_LEVELS||{Head:[18,24,32,40,46],Chest:[20,26,34,42,48],Weapon:[22,28,36,44,50]};
const SLOT_POWER={Head:[2,5,9,13,17],Chest:[3,6,10,15,20],Weapon:[4,8,12,18,24]};
const authStorage={
  getItem:key=>localStorage.getItem(key)??sessionStorage.getItem(key),
  setItem(key,value){const keep=localStorage.getItem(REMEMBER_KEY)==='1';const a=keep?localStorage:sessionStorage,b=keep?sessionStorage:localStorage;a.setItem(key,value);b.removeItem(key)},
  removeItem(key){localStorage.removeItem(key);sessionStorage.removeItem(key)}
};
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:authStorage}});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));

G.items.forEach(item=>{
  const tier=Math.max(1,Math.min(5,Number(item.tier)||1));
  const slot=item.slot;
  item.itemLevel=item.itemLevel||SLOT_ITEM_LEVEL[slot]?.[tier-1]||18+(tier-1)*8;
  item.power=item.power||SLOT_POWER[slot]?.[tier-1]||tier*3;
  item.tradeState=item.tradeState||'tradeable';
  item.visualKey=item.visualKey||item.itemId;
});

const ui={
  pageTitle:$('#pageTitle'),rosterGrid:$('#rosterGrid'),overviewRoster:$('#overviewRoster'),partyRoster:$('#partyRoster'),partySlots:$('#partySlots'),
  readinessFill:$('#readinessFill'),readinessText:$('#readinessText'),readinessLabel:$('#readinessLabel'),readinessHint:$('#readinessHint'),
  bossList:$('#bossList'),reportsList:$('#reportsList'),activityLog:$('#activityLog'),
  bankModal:$('#bankModal'),bankDetail:$('#bankDetail'),bankGrid:$('#bankGrid'),bankSummary:$('#bankSummary'),
  renown:$('#renown'),gold:$('#gold'),rosterCount:$('#rosterCount'),bankCount:$('#bankCount'),dungeonProgress:$('#dungeonProgress'),
  partyIlvlTop:$('#partyItemLevelTop'),membershipStatus:$('#membershipStatus'),syncStatus:$('#syncStatus')
};

const classes={
  Warrior:{icon:'⚔',glow:'#C69B6D',specs:{Protection:{role:'tank',talents:['Shield Mastery','Last Stand','Bulwark']},Arms:{role:'dps',talents:['Weapon Mastery','Deep Wounds','Execute']}}},
  Paladin:{icon:'✥',glow:'#F48CBA',specs:{Protection:{role:'tank',talents:['Sacred Shield','Guardian Oath','Consecration']},Holy:{role:'healer',talents:['Divine Light','Grace','Beacon']}}},
  Priest:{icon:'✚',glow:'#FFFFFF',specs:{Holy:{role:'healer',talents:['Renew','Serenity','Divine Hymn']}}},
  Druid:{icon:'❈',glow:'#FF7C0A',specs:{Restoration:{role:'healer',talents:['Rejuvenation','Lifebloom','Tranquility']}}},
  Hunter:{icon:'➶',glow:'#AAD372',specs:{Marksman:{role:'dps',talents:['True Aim','Rapid Fire','Kill Shot']}}},
  Rogue:{icon:'◆',glow:'#FFF468',specs:{Assassination:{role:'dps',talents:['Ambush','Venom','Eviscerate']}}},
  Mage:{icon:'✦',glow:'#3FC7EB',specs:{Arcane:{role:'dps',talents:['Arcane Focus','Surge','Barrage']}}}
};

const RECRUIT_RACES=[
  {id:'Veyren',icon:'◇',trait:'Adaptable'},
  {id:'Stoneborn',icon:'⬡',trait:'Unyielding'},
  {id:'Aelari',icon:'✧',trait:'Soul Attuned'},
  {id:'Thornkin',icon:'❈',trait:'Living Guard'},
  {id:'Emberkin',icon:'◆',trait:'Fierce Blood'},
  {id:'Nymari',icon:'✦',trait:'Quickmind'}
];
const RECRUIT_NAMES={
  Veyren:['Aren Vale','Tessa Renn','Corin Hale','Mira Venn','Joren Pell','Sera Noll'],
  Stoneborn:['Bram Korr','Dara Flint','Hald Brenn','Kessa Dorn','Torren Crag','Mara Keld'],
  Aelari:['Aeris Lume','Selene Var','Ilyra Sen','Cael Eryn','Nyra Vale','Elion Sor'],
  Thornkin:['Briar Fen','Rowan Moss','Ashen Reed','Willow Tarn','Thorne Vale','Iris Root'],
  Emberkin:['Kael Pyre','Rhea Ash','Doran Cinder','Vessa Flare','Korin Brand','Tala Ember'],
  Nymari:['Ori Quill','Nima Voss','Tali Renn','Perrin Vox','Lumi Pell','Caro Venn']
};
const bosses=[
  {id:'ashwarden',name:'Ash Warden Kael',level:4,rune:'♜',glow:'#8c4e35',requiredItemLevel:18,recommendedItemLevel:20,recommendedPower:42,mechanic:'Tank pressure and frontal cleave.',tier2Chance:.35},
  {id:'embermaw',name:'Embermaw',level:4,rune:'♨',glow:'#b66232',requiredItemLevel:22,recommendedItemLevel:24,recommendedPower:56,mechanic:'Heavy group damage and interrupt checks.',tier2Chance:.40},
  {id:'vaultheart',name:'The Vaultheart',level:5,rune:'◇',glow:'#805b98',requiredItemLevel:26,recommendedItemLevel:29,recommendedPower:68,mechanic:'Multi-phase encounter with burst windows.',tier2Chance:.50}
];

let state=null;
let account=null;
let currentUser=null;
let bankBulkMode=false;
const bankBulkSelected=new Set();
let saveSerial=Promise.resolve();
let syncTimer=null;
let recoveringTicker=null;
let membershipTicker=null;
let lastMembershipMember=null;
let recruitDraft=null;
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
  return {
    saveVersion:SAVE_VERSION,gearVersion:2,renown:0,gold:250,socialDisplayName:'',
    roster:[],party:{tank:null,healer:null,dps:[null,null,null]},
    bossKills:{ashwarden:false,embermaw:false,vaultheart:false},progression:{ashenVaultUnlocked:false},reports:[],bank:[],materials:{},
    consumables:[],recipeScrolls:[],discoveredRecipes:[],tradeInbox:[],collectionHistory:[],
    onboarding:{version:1,complete:false,stage:'party-builder',zone:'zeltira',startedAt:new Date().toISOString()},
    activity:['A new charter awaits. Build your first party to begin.']
  };
}
function entitlementFromAccount(a){
  const until=a?.membership_active_until?new Date(a.membership_active_until).getTime():0;
  const staffMember=Boolean(a?.staff_member);
  const member=staffMember||Boolean(a?.membership_override)||(until>Date.now());
  return {member,staffMember,chatBadge:a?.chat_badge||'player',playerModDiscountEligible:Boolean(a?.player_mod_discount_eligible),rosterCap:member?10:5,professionSlots:member?2:1,recoveryMinutes:member?MEMBER_RECOVERY_MINUTES:STANDARD_RECOVERY_MINUTES,membershipActiveUntil:a?.membership_active_until||null};
}
function entitlements(){return entitlementFromAccount(account);}
function classDef(c){return classes[c.class]||classes.Warrior;}
function specDef(c){return classDef(c)?.specs?.[c.spec];}
function roleOf(c){return specDef(c)?.role||'dps';}
function roleLabel(role){return role==='dps'?'Damage':role[0].toUpperCase()+role.slice(1);}
function levelHpBonus(c){return Math.round(Math.max(0,(Number(c?.level)||1)-1)*3)}
function levelOutputBonus(c){return Math.round(Math.max(0,(Number(c?.level)||1)-1)*2)}
function partyAverageLevel(){const p=partyCharacters();return p.length?Math.round(p.reduce((n,c)=>n+Math.max(1,Number(c.level)||1),0)/p.length):1}
function combatClassKey(c){return 'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function portraitHTML(c,size='md',className=''){return CP?.portraitHTML?.(c,{size,className})||`<span class="cb-portrait cb-portrait--${esc(size)} ${esc(className)}"><b>${esc(c?.portrait||String(c?.name||'?').slice(0,2).toUpperCase())}</b></span>`}
function charById(id){return state?.roster?.find(c=>c.id===id)||null;}
function bossById(id){return bosses.find(b=>b.id===id)||bosses[0];}
function bankTotal(){return (state?.bank||[]).reduce((n,item)=>n+(item.quantity||1),0);}
function averageMastery(c){const vals=Object.values(c.knowledge||{});return vals.length?Math.round(vals.reduce((a,b)=>a+(Number(b)||0),0)/vals.length):0;}
function canonicalItem(raw){if(!raw)return null;const base=G.byName(raw.name)||G.byId(raw.itemId);return base?{...base,...raw,itemLevel:raw.itemLevel||base.itemLevel,power:raw.power||base.power,tradeState:raw.tradeState||base.tradeState,visualKey:raw.visualKey||base.visualKey}:raw;}
function isBankUtility(item){return Boolean(item?.category==='utility'||item?.utilityType)}
function bankUtilityArt(item,size=66){const icon=esc(item?.icon||'⚡');return window.CellboundItemArt?.artHTML?.(item,size,'bank-utility-art')||`<span class="bank-utility-art rarity-${String(item?.rarity||'rare').toLowerCase()}" style="width:${size}px;height:${size}px" aria-label="${esc(item?.name||'Utility item')}"><i>${icon}</i></span>`}
function bankItemArt(item,size=66){return isBankUtility(item)?bankUtilityArt(item,size):G.artHTML(item,size)}
function setBonusPanel(item,c=null){
  if(!item?.setId||!item?.setName)return'';
  const rules=G.SET_BONUS_RULES||{
    pieces2:{threshold:2,name:'Resonant Pair',short:'+5% damage & healing output',description:'All damaging and healing abilities are 5% stronger.'},
    pieces4:{threshold:4,name:'Cellbound Ensemble',short:'+12% resource recovery',description:'Passive class-resource recovery is increased by 12%.'}
  };
  const count=c?(G.setPieceCount?.(c,item.setId)||0):null;
  const row=rule=>{
    const active=count!==null&&count>=rule.threshold;
    return `<div class="gear-set-bonus ${active?'active':''}"><span>${rule.threshold} PIECES</span><div><b>${esc(rule.name)}</b><strong>${esc(rule.short)}</strong><p>${esc(rule.description)}</p></div>${count!==null?`<em>${active?'ACTIVE':count+'/'+rule.threshold}</em>`:''}</div>`
  };
  return `<section class="gear-set-panel"><header><div><small>EQUIPMENT SET</small><h3>${esc(item.setName)}</h3></div>${count!==null?`<b>${count}/4 EQUIPPED</b>`:''}</header>${row(rules.pieces2)}${row(rules.pieces4)}</section>`
}
function characterItemLevel(c){
  const core=LEGACY_ILVL_SLOTS.map(slot=>canonicalItem(c?.equipment?.[slot])).filter(Boolean);
  const legacyBaseline=core.length?core.reduce((sum,item)=>sum+(Number(item?.itemLevel)||0),0)/core.length:0;
  const total=ILVL_SLOTS.reduce((sum,slot)=>{
    const item=canonicalItem(c?.equipment?.[slot]),level=Number(item?.itemLevel)||0;
    return sum+(LEGACY_ILVL_SLOTS.includes(slot)?level:Math.max(legacyBaseline,level));
  },0);
  return Math.round(total/ILVL_SLOTS.length);
}
function partySlotIds(){return [state?.party?.tank,state?.party?.healer,...(state?.party?.dps||[])].slice(0,5)}
function writePartySlots(ids){
  const slots=[...(ids||[])].slice(0,5);while(slots.length<5)slots.push(null);
  state.party=state.party&&typeof state.party==='object'?state.party:{tank:null,healer:null,dps:[null,null,null]};
  state.party.tank=slots[0]||null;state.party.healer=slots[1]||null;state.party.dps=[slots[2]||null,slots[3]||null,slots[4]||null]
}
function flatPartyIds(){return partySlotIds().filter(Boolean);}
function partyCharacters(){return flatPartyIds().map(charById).filter(c=>c&&isCharacterRosterUnlocked(c.id));}
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
function canUseItem(c,item){
  if(isBankUtility(item))return false;
  const classOk=item?.class===c.class||item?.classes==='all'||item?.classes?.includes?.(c.class);
  const roleOk=!item?.relicRole||roleOf(c)===item.relicRole;
  return classOk&&roleOk;
}
function tierText(item){return `Tier ${item?.tier||1} · ${item?.rarity||'Common'} · iLvl ${item?.itemLevel||0}`;}
function currentBossProgressionUnlocked(boss){const i=bosses.findIndex(b=>b.id===boss.id);return i<=0||Boolean(state.bossKills[bosses[i-1].id]);}

function normalizeCharacter(c,index=0){
  c.id=c.id||`legacy-${index}-${Date.now()}`;c.class=c.class||'Warrior';c.spec=c.spec||Object.keys(classDef(c).specs)[0];const rawLevel=Math.max(1,Number(c.level)||1),overCapLevels=Math.max(0,rawLevel-PLAYER_LEVEL_CAP);c.level=Math.min(PLAYER_LEVEL_CAP,rawLevel);c.xp=c.level>=PLAYER_LEVEL_CAP?0:Math.max(0,Number(c.xp)||0);if(overCapLevels>0)c.talent=Math.max(0,(Number(c.talent)||0)-overCapLevels);c.power=Math.max(1,Number(c.power)||1);
  c.race=c.race||'Veyren';c.raceTrait=c.raceTrait||window.CellboundIdentities?.getRace?.(c.race)?.trait||'';if(CP)c.appearance=CP.normalizeAppearance(c.appearance,c.id||c.name,c.race);c.talents=c.talents||talentState(c.class);c.knowledge=c.knowledge||{ashwarden:0,embermaw:0,vaultheart:0};c.equipment=c.equipment||{};
  const starters=starterEquipment(c.class);
  ILVL_SLOTS.forEach(slot=>{
    const hasSlot=Object.prototype.hasOwnProperty.call(c.equipment,slot),existing=canonicalItem(c.equipment?.[slot]);
    // Explicit null means the player intentionally unequipped this slot.
    // Only seed starter gear when the slot has never existed on the save.
    c.equipment[slot]=existing||(hasSlot?null:starters[slot]);
  });
  ['Shoulders','Hands','Waist','Legs','Feet','OffHand','Ring1','Ring2','Trinket1','Trinket2','Relic'].forEach(slot=>{if(!(slot in c.equipment))c.equipment[slot]=null;});
  c.gearItems=ILVL_SLOTS.map(slot=>c.equipment[slot]?.name||'Empty');c.cellShock=Math.max(0,Math.min(100,Number(c.cellShock)||0));c.cellShockLockedUntil=c.cellShockLockedUntil||null;c.professions=Array.isArray(c.professions)?c.professions.slice(0,2):[null,null];while(c.professions.length<2)c.professions.push(null);c.professions=c.professions.map(p=>p?{...p,name:p.name,level:Math.max(1,Math.min(100,Number(p.level)||1)),xp:Math.max(0,Number(p.xp)||0),craftHistory:p.craftHistory&&typeof p.craftHistory==='object'?p.craftHistory:{},masterworks:Math.max(0,Number(p.masterworks)||0),projectsCompleted:Math.max(0,Number(p.projectsCompleted)||0)}:null);
  c.gear=characterItemLevel(c);return c;
}
function canonicalBank(raw){
  const out=[];(Array.isArray(raw)?raw:[]).forEach(item=>{const canon=canonicalItem(item);if(!canon?.name)return;const sig=G.rollSignature?.(canon)||'';const found=!canon.nonStackable&&out.find(x=>x.itemId===canon.itemId&&(G.rollSignature?.(x)||'')===sig&&x.source===item.source);if(found)found.quantity+=(item.quantity||1);else out.push({...canon,id:item.id||`bank-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,quantity:item.quantity||1,source:item.source||'Previous loot'});});return out;
}
function repairInvalidOffHands(s){
  if(!s||!Array.isArray(s.roster))return 0;
  s.bank=Array.isArray(s.bank)?s.bank:[];
  let repaired=0;
  s.roster.forEach(c=>{
    const raw=c?.equipment?.OffHand,off=canonicalItem(raw);
    if(!off)return;
    // Old Equipment UI allowed a main-hand Weapon item to be stored in OffHand.
    // Return it safely to the Bank rather than inventing an off-hand visual for it.
    if(!G?.canEquipInSlot?.(off,'OffHand')){
      c.equipment.OffHand=null;
      c.power=Math.max(1,(Number(c.power)||1)-(Number(off.power)||0));
      s.bank.push({...off,id:`bank-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,quantity:1,source:`Recovered from invalid OffHand on ${c.name}`});
      c.gearItems=ILVL_SLOTS.map(slot=>c.equipment?.[slot]?.name||'Empty');
      c.gear=characterItemLevel(c);
      repaired++;
    }
  });
  if(repaired){
    s.bank=canonicalBank(s.bank);
    s.activity=Array.isArray(s.activity)?s.activity:[];
    s.activity.push(`Recovered ${repaired} main-hand weapon${repaired===1?'':'s'} that had been incorrectly equipped in OffHand.`);
  }
  return repaired;
}
function removeInvalidPartyMembers(s){
  const allowed=new Set((s.roster||[]).filter((c,i)=>isRosterSlotUnlocked(i)&&!isUnavailable(c)).map(c=>c.id));
  if(!allowed.has(s.party?.tank))s.party.tank=null;if(!allowed.has(s.party?.healer))s.party.healer=null;
  s.party.dps=Array.isArray(s.party?.dps)?s.party.dps.slice(0,3):[null,null,null];while(s.party.dps.length<3)s.party.dps.push(null);s.party.dps=s.party.dps.map(id=>allowed.has(id)?id:null);
}
function migrateState(raw){
  const freshMarker=raw&&raw.__fresh_start===true;
  const validRaw=raw&&typeof raw==='object'&&(Array.isArray(raw.roster)||freshMarker||raw.onboarding);
  const freshStartedAt=freshMarker?(raw.fresh_start_at||new Date().toISOString()):null;
  const s=freshMarker?initialState():(validRaw?raw:initialState());
  if(freshMarker){s.onboarding.freshStartAt=freshStartedAt;s.activity=['Fresh Start ready. Build your first party to begin again.'];}
  const hadRoster=Array.isArray(s.roster)&&s.roster.length>0;
  s.saveVersion=SAVE_VERSION;s.gearVersion=2;s.renown=Number(s.renown)||0;s.gold=Number(s.gold)||0;s.socialDisplayName=typeof s.socialDisplayName==='string'?s.socialDisplayName:'';
  s.roster=Array.isArray(s.roster)?s.roster.map(normalizeCharacter):[];
  s.progression=s.progression&&typeof s.progression==='object'?s.progression:{};if(typeof s.progression.ashenVaultUnlocked!=='boolean')s.progression.ashenVaultUnlocked=Boolean(Number(s.dungeonCompletions)>0||Object.values(s.bossKills||{}).some(Boolean)||s.questSystem?.ashfall?.complete);s.bank=canonicalBank(s.bank);s.materials=s.materials&&typeof s.materials==='object'?s.materials:{};s.consumables=Array.isArray(s.consumables)?s.consumables:[];s.recipeScrolls=Array.isArray(s.recipeScrolls)?s.recipeScrolls:[];s.discoveredRecipes=Array.isArray(s.discoveredRecipes)?s.discoveredRecipes:[];s.tradeInbox=Array.isArray(s.tradeInbox)?s.tradeInbox:[];s.collectionHistory=Array.isArray(s.collectionHistory)?s.collectionHistory:[];s.reports=Array.isArray(s.reports)?s.reports:[];s.activity=Array.isArray(s.activity)?s.activity:[];s.bossKills=s.bossKills||{ashwarden:false,embermaw:false,vaultheart:false};s.party=s.party||{tank:null,healer:null,dps:[null,null,null]};
  if(s.__fresh_start===true||!s.onboarding&&!hadRoster)s.onboarding={version:1,complete:false,stage:'party-builder',zone:'zeltira',startedAt:new Date().toISOString()};
  else if(!s.onboarding&&hadRoster)s.onboarding={version:1,complete:true,stage:'complete',zone:'zeltira',legacy:true};
  repairInvalidOffHands(s);s.roster.forEach(c=>refreshRecovery(c));delete s.__fresh_start;return s;
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
  const [accountResult,identityResult]=await Promise.all([
    supabaseClient.from('guild_accounts').select('user_id,game_state,membership_active_until,membership_override,updated_at').eq('user_id',user.id).maybeSingle(),
    supabaseClient.rpc('cellbound_social_identity')
  ]);
  const {data,error}=accountResult,identity=identityResult?.data;
  if(error){
    console.error('Cellbound account load failed',error);
    account={user_id:user.id,membership_active_until:null,membership_override:false,staff_member:Boolean(identity?.staff_member),chat_badge:identity?.chat_badge||'player',player_mod_discount_eligible:Boolean(identity?.player_mod_discount_eligible)};
    state=migrateState(localCandidate(user.id)||initialState());setSync('Local fallback','error');writeLocal();return;
  }
  if(identityResult?.error)console.warn('Cellbound social identity unavailable',identityResult.error);
  account={...(data||{user_id:user.id,membership_active_until:null,membership_override:false}),staff_member:Boolean(identity?.staff_member),chat_badge:identity?.chat_badge||'player',player_mod_discount_eligible:Boolean(identity?.player_mod_discount_eligible)};
  state=migrateState(data?.game_state&&Object.keys(data.game_state).length?data.game_state:(localCandidate(user.id)||initialState()));
  removeInvalidPartyMembers(state);nativeLocalSet.call(localStorage,LOCAL_OWNER,user.id);writeLocal();
  if(!data){await supabaseClient.from('guild_accounts').insert({user_id:user.id,game_state:state,updated_at:new Date().toISOString()});}
  else await persistState();
  lastMembershipMember=entitlements().member;
  setSync('Saved','ok');
}
async function refreshStateFromServer({render=true}={}){
  if(!currentUser||!supabaseClient)return false;
  clearTimeout(syncTimer);
  try{
    await saveSerial;
    const {data,error}=await supabaseClient.from('guild_accounts').select('game_state,updated_at').eq('user_id',currentUser.id).maybeSingle();
    if(error||!data?.game_state){if(error)console.warn('Cellbound state refresh failed',error);return false;}
    state=migrateState(data.game_state);removeInvalidPartyMembers(state);nativeLocalSet.call(localStorage,LOCAL_OWNER,currentUser.id);writeLocal();
    if(render)renderAll();setSync('Saved','ok');return true;
  }catch(err){console.warn('Cellbound state refresh failed',err);return false;}
}
async function refreshMembershipStatus({render=true,silent=false}={}){
  if(!currentUser||!supabaseClient)return entitlements().member;
  const before=lastMembershipMember===null?entitlements().member:lastMembershipMember;
  const partyBefore=JSON.stringify(partySlotIds());
  const results=await Promise.all([
    supabaseClient.from('guild_accounts').select('membership_active_until,membership_override').eq('user_id',currentUser.id).maybeSingle(),
    supabaseClient.rpc('cellbound_social_identity')
  ]);
  const accountResult=results[0],identityResult=results[1];
  if(accountResult.error){if(!silent)console.warn('Membership refresh failed',accountResult.error);return entitlements().member}
  const identity=identityResult&&identityResult.data?identityResult.data:{};
  account=Object.assign({},account||{},accountResult.data||{}, {staff_member:Boolean(identity.staff_member),chat_badge:identity.chat_badge||(account&&account.chat_badge)||'player',player_mod_discount_eligible:Boolean(identity.player_mod_discount_eligible)});
  const after=entitlements().member;
  removeInvalidPartyMembers(state);
  const partyChanged=partyBefore!==JSON.stringify(partySlotIds());
  if(before!==after){
    if(after)state.activity.push('Membership activated. Roster slots 6–10 and second profession slots are now available.');
    else {
      const stored=Math.max(0,(state.roster&&state.roster.length||0)-5);
      state.activity.push('Membership ended. Roster slots 6–10 are locked'+(stored?' with '+stored+' adventurer'+(stored===1?'':'s')+' safely stored.':'.'));
    }
  }
  lastMembershipMember=after;
  if(before!==after||partyChanged){writeLocal();await persistState()}
  if(render&&(before!==after||partyChanged))renderAll();
  return after;
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

const WORKSPACES={
  overview:{label:'Home',views:[['overview','Home']]},
  guild:{label:'Guild',views:[['roster','Roster'],['party','Active Party'],['bank','Bank'],['professions','Professions']]},
  adventure:{label:'Adventure',views:[['quests','Quests'],['content','Dungeons'],['world','Activities'],['raids','Raids']]},
  market:{label:'Market',views:[['trading','Trading Post']]},
  pvp:{label:'Combat',views:[['pvp','PvP']]},
  social:{label:'Social',views:[['chat','Social']]},
  admin:{label:'Admin',views:[['admin','Admin']]}
};
const VIEW_WORKSPACE={};
const VIEW_LABELS={};
Object.entries(WORKSPACES).forEach(([hub,data])=>data.views.forEach(([id,label])=>{VIEW_WORKSPACE[id]=hub;VIEW_LABELS[id]=label}));
function renderWorkspaceTabs(){
  const nav=$('#workspaceTabs');
  if(nav){nav.hidden=true;nav.innerHTML=''}
}
function switchView(id){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  const hub=VIEW_WORKSPACE[id]||id;
  $$('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  if(ui.pageTitle)ui.pageTitle.textContent=VIEW_LABELS[id]||'Cellbound';
  renderWorkspaceTabs();
  if(id==='party')renderParty();
  if(id==='bank')renderBank();
  if(id==='professions')window.CellboundEconomy?.renderProfessions?.();
  if(id==='trading')window.CellboundEconomy?.renderTrading?.();
  if(id==='content'){renderBosses();safeFeatureRender('hollow-sanctum',()=>window.CellboundHollowSanctum?.renderCard?.());safeFeatureRender('chaos-canyon',()=>window.CellboundChaosCanyon?.renderCard?.());safeFeatureRender('blackout-station',()=>window.CellboundBlackoutStation?.renderCard?.());safeFeatureRender('fractured-ages',()=>window.CellboundFracturedAges?.renderCard?.())}
  if(id==='raids')window.CellboundManorRaid?.refresh?.();
  if(id==='endgame'){window.CellboundEndgame?.render?.();renderReports()}
  if(id==='roster')renderRoster();
  if(id==='quests')window.CellboundQuests?.render?.();
  window.dispatchEvent(new CustomEvent('cellbound:view-changed',{detail:{view:id,workspace:hub}}));
}
$$('.nav-btn[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.jump)));


function renderTop(){
  if(!state)return;const e=entitlements(),pi=partyItemLevel(),unlocked=Math.min(state.roster.length,e.rosterCap);
  ui.renown.textContent=state.renown;ui.gold.textContent=state.gold.toLocaleString();ui.rosterCount.textContent=`${unlocked} / ${e.rosterCap}`;if(ui.bankCount)ui.bankCount.textContent=bankTotal();if(ui.dungeonProgress)ui.dungeonProgress.textContent=`${Object.values(state.bossKills).filter(Boolean).length} / 3 bosses`;if(ui.partyIlvlTop)ui.partyIlvlTop.textContent=pi||'—';if(ui.membershipStatus){ui.membershipStatus.textContent=e.member?'MEMBER':'STANDARD';ui.membershipStatus.dataset.member=e.member?'1':'0';}
}
function shockMarkup(c){const pct=Math.round(c.cellShock||0),locked=isUnavailable(c);return `<div class="cell-shock-row"><div><span>Cell Shock</span><b>${pct}%${locked?` · ${formatRemaining(c)}`:''}</b></div><div class="cell-shock-bar"><i style="width:${pct}%"></i></div></div>`;}
function rosterCard(c,index){
  const role=roleOf(c),unlocked=isRosterSlotUnlocked(index),recovering=isUnavailable(c),ilvl=characterItemLevel(c),classKey=combatClassKey(c),active=flatPartyIds().includes(c.id);
  const shock=Math.round(Number(c.cellShock)||0),meta=classDef(c),status=!unlocked?'MEMBERSHIP LOCKED':recovering?'RECOVERING':active?'ACTIVE PARTY':'AVAILABLE';
  const statusClass=!unlocked?'locked':recovering?'recovering':active?'active':'ready';
  return `<article class="char-card roster-character-card ${classKey} ${!unlocked?'roster-locked':''} ${recovering?'shock-locked':''} ${active?'is-active':''}" data-role="${role}" data-class-name="${c.class}" style="--roster-accent:${meta?.glow||'#7F8B88'};--glow:${meta?.glow||'#7F8B88'}">
    ${!unlocked?'<div class="member-slot-ribbon">MEMBERSHIP SLOT '+(index+1)+'</div>':''}
    <div class="roster-card-head">
      <div class="roster-card-portrait">${portraitHTML(c,'md')}<i>${meta?.icon||'◇'}</i></div>
      <div class="roster-card-identity">
        <div class="roster-card-flags"><span class="role-tag role-${role}">${roleLabel(role)}</span><em class="roster-state ${statusClass}">${status}${recovering&&unlocked?` · ${formatRemaining(c)}`:''}</em></div>
        <h3>${c.name}</h3>
        <p>${c.race||'Veyren'} · ${c.class} · ${c.spec}</p>
        <small>Level ${c.level}</small>
      </div>
    </div>
    <div class="roster-card-metrics">
      <div><span>ITEM LEVEL</span><b>${ilvl}</b></div>
      <div><span>POWER</span><b>${c.power||0}</b></div>
      <div><span>CELL SHOCK</span><b class="${shock>=75?'danger':''}">${shock}%</b></div>
      <div><span>TALENT POINTS</span><b>${c.talent||0}</b></div>
    </div>
    <div class="roster-shock-line"><div><span>CELL SHOCK</span><b>${recovering?'RECOVERING':shock?shock+'%':'CLEAR'}</b></div><i><em style="width:${shock}%"></em></i></div>
    <div class="roster-card-actions"><button type="button" data-char="${c.id}">${unlocked?'OPEN CHARACTER':'VIEW LOCKED CHARACTER'} →</button></div>
  </article>`;
}

function recruitSlotCard(index){
  return `<article class="char-card recruit-slot-card roster-recruit-card">
    <div class="recruit-slot-number">MEMBERSHIP SLOT ${index+1}</div>
    <div class="recruit-plus">+</div>
    <h3>Recruit Adventurer</h3>
    <div class="class">Open roster position</div>
    <p>Add a Level 1 adventurer and choose their class, specialisation and identity.</p>
    <button type="button" data-recruit-slot="${index}">RECRUIT ADVENTURER →</button>
  </article>`;
}

function renderRoster(filter='all'){
  if(!ui.rosterGrid)return;
  const e=entitlements(),chars=state.roster.slice(0,e.rosterCap),rosterCount=chars.length,activeCount=flatPartyIds().filter(id=>isCharacterRosterUnlocked(id)).length,openCount=Math.max(0,e.rosterCap-rosterCount);
  const recovering=chars.filter(isUnavailable).length,available=Math.max(0,rosterCount-recovering);
  const avgIlvl=rosterCount?Math.round(chars.reduce((sum,c)=>sum+characterItemLevel(c),0)/rosterCount):0;
  const activeSummary=$('#rosterActiveSummary'),recoverySummary=$('#rosterRecoverySummary');
  if(activeSummary)activeSummary.textContent=rosterCount+' / '+e.rosterCap;
  if(recoverySummary)recoverySummary.textContent=openCount?openCount+' open slot'+(openCount===1?'':'s'):'Roster capacity filled';
  if($('#rosterMetricActive'))$('#rosterMetricActive').textContent=activeCount+' / 5';
  if($('#rosterMetricAvailable'))$('#rosterMetricAvailable').textContent=String(available);
  if($('#rosterMetricRecovering'))$('#rosterMetricRecovering').textContent=String(recovering);
  if($('#rosterMetricIlvl'))$('#rosterMetricIlvl').textContent=String(avgIlvl);

  // Always keep the complete roster in the DOM. Evolution handles combined role,
  // status, class, profession, search and sort filters without destroying cards.
  let html=state.roster.map((c,index)=>rosterCard(c,index)).join('');
  if(e.member&&state.onboarding?.complete&&state.roster.length<10){
    for(let i=state.roster.length;i<10;i++)html+=recruitSlotCard(i);
  }
  ui.rosterGrid.innerHTML=html;
  ui.rosterGrid.querySelectorAll('[data-recruit-slot]').forEach(b=>b.onclick=()=>openRecruit(Number(b.dataset.recruitSlot)));
}
$$('#roster .filter[data-filter]').forEach(b=>b.addEventListener('click',()=>{
  $$('#roster .filter[data-filter]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  renderRoster('all');
}));

function recruitInitials(name){return String(name||'??').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'??'}
function recruitRandomName(race){
  const used=new Set((state.roster||[]).map(c=>String(c.name||'').toLowerCase()));
  const pool=RECRUIT_NAMES[race]||RECRUIT_NAMES.Veyren,free=pool.filter(x=>!used.has(x.toLowerCase()));
  return (free.length?free:pool)[Math.floor(Math.random()*(free.length?free.length:pool.length))]
}
function recruitUid(){return globalThis.crypto?.randomUUID?'recruit-'+crypto.randomUUID():'recruit-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)}
function ensureRecruitModal(){
  let root=$('#recruitAdventurerModal');if(root)return root;
  root=document.createElement('div');root.id='recruitAdventurerModal';root.className='modal-backdrop recruit-modal-backdrop';root.hidden=true;document.body.appendChild(root);return root
}
function openRecruit(slotIndex){
  if(!entitlements().member||!state.onboarding?.complete||state.roster.length>=10||slotIndex!==state.roster.length)return;
  const klass=Object.keys(classes)[0],spec=Object.keys(classes[klass]?.specs||{})[0];
  recruitDraft={race:'Veyren',klass,spec,name:recruitRandomName('Veyren'),appearance:CP?.randomAppearance?.('Veyren')||{race:'Veyren'}};renderRecruitModal()
}
function closeRecruit(){
  const root=$('#recruitAdventurerModal');if(root)root.hidden=true;document.body.classList.remove('recruit-adventurer-open');recruitDraft=null
}
function renderRecruitModal(){
  const root=ensureRecruitModal();if(!recruitDraft)return;
  const race=RECRUIT_RACES.find(x=>x.id===recruitDraft.race)||RECRUIT_RACES[0],specs=Object.entries(classes[recruitDraft.klass]?.specs||{}),role=classes[recruitDraft.klass]?.specs?.[recruitDraft.spec]?.role||'dps';
  recruitDraft.appearance=CP?.normalizeAppearance?.(recruitDraft.appearance,recruitDraft.name||recruitDraft.race,recruitDraft.race)||recruitDraft.appearance||{race:recruitDraft.race};
  const appearanceEditor=CP?.editorHTML?.(recruitDraft.appearance,{characterClass:recruitDraft.klass,name:recruitDraft.name,race:recruitDraft.race})||'';
  root.hidden=false;document.body.classList.add('recruit-adventurer-open');
  root.innerHTML='<section class="recruit-modal"><button class="modal-close" data-close-recruit>×</button>'+
    '<header><small>MEMBERSHIP ROSTER · SLOT '+(state.roster.length+1)+' OF 10</small><h2>Recruit Adventurer</h2><p>Membership adds five roster slots. Recruit them whenever you need them.</p></header>'+
    '<div class="recruit-body">'+
      '<label><span>Race</span><select id="recruitRace">'+RECRUIT_RACES.map(r=>'<option value="'+r.id+'" '+(r.id===recruitDraft.race?'selected':'')+'>'+r.icon+' '+r.id+' · '+r.trait+'</option>').join('')+'</select></label>'+
      '<label><span>Class</span><select id="recruitClass">'+Object.entries(classes).map(([name,d])=>'<option value="'+name+'" '+(name===recruitDraft.klass?'selected':'')+'>'+d.icon+' '+name+'</option>').join('')+'</select></label>'+
      '<label><span>Specialisation</span><select id="recruitSpec">'+specs.map(([name,d])=>'<option value="'+name+'" '+(name===recruitDraft.spec?'selected':'')+'>'+name+' · '+roleLabel(d.role)+'</option>').join('')+'</select></label>'+
      '<div class="recruit-appearance-wrap"><small>APPEARANCE</small>'+appearanceEditor+'</div>'+ 
      '<label class="recruit-name-label"><span>Name</span><div class="recruit-name"><input id="recruitName" maxlength="24" autocomplete="off" value="'+esc(recruitDraft.name)+'"><button type="button" data-random-recruit>RANDOMISE</button></div></label>'+
    '</div>'+
    '<div class="recruit-preview">'+portraitHTML({race:recruitDraft.race,appearance:recruitDraft.appearance,class:recruitDraft.klass,name:recruitDraft.name},'lg')+'<div><small>NEW LEVEL 1 ADVENTURER</small><b>'+esc(recruitDraft.name||'Unnamed')+'</b><span>'+race.id+' · '+recruitDraft.klass+' · '+recruitDraft.spec+' · '+roleLabel(role)+'</span></div></div>'+
    '<footer><small>Starts with basic equipment · 0% Cell Shock · independent talents and professions</small><button class="on-primary" data-confirm-recruit>CONFIRM RECRUIT →</button></footer></section>';
  root.querySelector('[data-close-recruit]').onclick=closeRecruit;
  root.querySelector('#recruitRace').onchange=e=>{recruitDraft.race=e.target.value;recruitDraft.name=recruitRandomName(recruitDraft.race);recruitDraft.appearance=CP?.randomAppearance?.(recruitDraft.race)||{race:recruitDraft.race};renderRecruitModal()};
  root.querySelector('#recruitClass').onchange=e=>{recruitDraft.klass=e.target.value;recruitDraft.spec=Object.keys(classes[recruitDraft.klass]?.specs||{})[0];renderRecruitModal()};
  root.querySelector('#recruitSpec').onchange=e=>{recruitDraft.spec=e.target.value;renderRecruitModal()};
  root.querySelector('#recruitName').oninput=e=>{recruitDraft.name=e.target.value};
  root.querySelector('[data-random-recruit]').onclick=()=>{recruitDraft.name=recruitRandomName(recruitDraft.race);renderRecruitModal()};
  CP?.bindEditor?.(root,recruitDraft.appearance,()=>renderRecruitModal(),{characterClass:recruitDraft.klass,name:recruitDraft.name});
  root.querySelector('[data-confirm-recruit]').onclick=createRecruit;
}
async function createRecruit(){
  if(!recruitDraft)return;
  await refreshMembershipStatus({render:false,silent:true});
  if(!entitlements().member||state.roster.length>=10){closeRecruit();renderAll();return}
  const name=String(recruitDraft.name||'').trim().replace(/\s+/g,' ');
  if(name.length<2||name.length>24||state.roster.some(c=>String(c.name||'').toLowerCase()===name.toLowerCase())){
    const input=$('#recruitName');if(input){input.setCustomValidity('Use a unique name between 2 and 24 characters.');input.reportValidity();setTimeout(()=>input.setCustomValidity(''),1800)}return
  }
  const race=RECRUIT_RACES.find(x=>x.id===recruitDraft.race)||RECRUIT_RACES[0],klass=recruitDraft.klass,spec=recruitDraft.spec,role=classes[klass]?.specs?.[spec]?.role||'dps',equipment=starterEquipment(klass);
  const ch=normalizeCharacter({
    id:recruitUid(),name,race:race.id,raceTrait:window.CellboundIdentities?.getRace?.(race.id)?.trait||race.trait,class:klass,spec,role,
    level:1,xp:0,power:role==='tank'?30:role==='healer'?27:29,talent:1,portrait:recruitInitials(name),appearance:CP?.normalizeAppearance?.(recruitDraft.appearance,name,race.id)||recruitDraft.appearance,
    knowledge:{ashwarden:0,embermaw:0,vaultheart:0},equipment,gearItems:ILVL_SLOTS.map(slot=>equipment[slot]?.name||'Empty'),
    talents:talentState(klass),cellShock:0,cellShockLockedUntil:null,professions:[null,null],recruitedAt:new Date().toISOString()
  },state.roster.length);
  state.roster.push(ch);state.activity.push(name+' joined the guild in membership roster slot '+state.roster.length+'.');
  closeRecruit();writeLocal();await persistState();
  const combatStyle=['Mage','Priest','Druid','Hunter'].includes(ch.class)?'ranged':'melee';
  const mirror=await supabaseClient.from('characters').insert({user_id:currentUser.id,name:ch.name,combat_style:combatStyle,tutorial_complete:true,creation_complete:true,appearance:{...(ch.appearance||{}),race:ch.race,class:ch.class,spec:ch.spec,role,roster_slot:state.roster.length-1,recruited:true},level:1,xp:0,current_hp:100,max_hp:100,current_location:'zeltira',tutorial_stage:'complete',tutorial_reward_claimed:true,last_played_at:new Date().toISOString()});
  if(mirror.error)console.warn('Recruit character mirror record skipped',mirror.error);
  renderAll()
}

function renderOverview(){
  if(!ui.overviewRoster)return;
  const party=partyCharacters(),activeIds=new Set(party.map(c=>c.id)),cap=entitlements().rosterCap;
  const recovering=party.filter(c=>isUnavailable(c)).length;
  const pi=partyItemLevel();

  ui.overviewRoster.innerHTML=party.length
    ?party.map(c=>`<div class="home-party-member ${isUnavailable(c)?'recovering':''}" style="--party-class:${classDef(c)?.glow||'#77d7cf'}"><div class="home-party-portrait">${portraitHTML(c,'sm')}</div><div class="home-party-copy"><b>${c.name}</b><small>${c.class} · ${c.spec}</small><span>${roleLabel(roleOf(c))} · iLvl ${characterItemLevel(c)}</span></div><em>${isUnavailable(c)?formatRemaining(c):'READY'}</em></div>`).join('')
    :'<div class="home-party-empty"><b>No active party yet.</b><span>Build your first five to begin.</span></div>';

  if(ui.activityLog){
    const activity=state.activity.slice(-5).reverse();
    ui.activityLog.innerHTML=activity.length
      ?activity.map((a,i)=>`<div class="activity-entry"><span>${i===0?'Latest':i===1?'Previous':'Earlier'}</span><b>${a}</b></div>`).join('')
      :'<div class="home-activity-empty">Your guild activity will appear here.</div>';
  }

  const hollowOpen=Boolean(state?.questSystem?.flags?.hollowSanctumUnlocked);
  const hollowDone=Boolean(state?.questSystem?.flags?.hollowFirstClear);
  const ashenOpen=state?.progression?.ashenVaultUnlocked!==false;
  const ashenDone=(Number(state?.dungeonCompletions)||0)>0;
  const chaosDone=(Number(state?.chaosCanyonCompletions)||0)>0;
  const blackoutDone=(Number(state?.blackoutStationCompletions)||0)>0;
  const fracturedOpen=Boolean(state?.progression?.fracturedAgesUnlocked);
  const fracturedDone=(Number(state?.fracturedAgesCompletions)||0)>0;
  const dungeonImages={
    'ashen-vault':'./assets/dungeons/ashen-vault.webp',
    'hollow-sanctum':'./assets/dungeons/hollow-sanctum.webp',
    'chaos-canyon':'./assets/dungeons/chaos-canyon.webp',
    'blackout-station':'./assets/dungeons/blackout-station.webp',
    'fractured-ages':'./assets/dungeons/fractured-ages.webp'
  };
  let dungeon;
  if(!ashenOpen||!ashenDone)dungeon={id:'ashen-vault',name:'The Ashen Vault',tag:ashenOpen?'AVAILABLE':'QUEST LOCKED',copy:'Break through the furnace halls and reach the living Vaultheart.',pips:3,active:Math.min(3,Object.values(state?.bossKills||{}).filter(Boolean).length||1),req:18};
  else if(hollowOpen&&!hollowDone)dungeon={id:'hollow-sanctum',name:'The Hollow Sanctum',tag:'NEWLY UNLOCKED',copy:'Descend beneath Zeltira and face the Bound Choir.',pips:3,active:1,req:24};
  else if(!chaosDone)dungeon={id:'chaos-canyon',name:'Chaos Canyon',tag:'AVAILABLE',copy:'Cross Vorran’s living canyon and break the Druid at its heart.',pips:3,active:1,req:30};
  else if(!blackoutDone)dungeon={id:'blackout-station',name:'Blackout Station',tag:'AVAILABLE',copy:'Restore the dead grid and survive Dr. Vex Calder’s role circuits.',pips:2,active:1,req:34};
  else if(fracturedOpen&&!fracturedDone)dungeon={id:'fractured-ages',name:'The Fractured Ages',tag:'NEWLY UNLOCKED',copy:'Follow the Strange Old Man through impossible eras.',pips:5,active:1,req:38};
  else if(fracturedOpen)dungeon={id:'fractured-ages',name:'The Fractured Ages',tag:'CLEARED',copy:'Return for temporal gear, stronger rolls and another encounter with the Old Man.',pips:5,active:5,req:38};
  else if(hollowOpen)dungeon={id:'hollow-sanctum',name:'The Hollow Sanctum',tag:hollowDone?'CLEARED':'AVAILABLE',copy:hollowDone?'Return to the Sanctum for another run.':'The Hollow Sanctum is open when your party is ready.',pips:3,active:hollowDone?3:1,req:24};
  else dungeon={id:'ashen-vault',name:'The Ashen Vault',tag:'CLEARED',copy:'The Ashen Vault remains open while you follow the next lead.',pips:3,active:3,req:18};

  const next=$('#overviewNextDungeon');
  if(next){
    const partyState=party.length<5?party.length+'/5 PARTY':recovering?recovering+' RECOVERING':pi<dungeon.req?'iLvl '+pi+' · ENTRY '+dungeon.req+'+':'PARTY READY';
    const primaryLabel=!ashenOpen&&dungeon.id==='ashen-vault'?'CONTINUE QUEST':party.length<5?'BUILD ACTIVE PARTY':'OPEN DUNGEON';
    next.dataset.dungeon=dungeon.id;
    next.innerHTML=`
      <div class="home-continue-art"><img src="${dungeonImages[dungeon.id]}" alt="" aria-hidden="true" decoding="async"><i></i></div>
      <div class="home-continue-copy">
        <div class="home-continue-eyebrow"><span>CONTINUE EXPEDITION</span><em>${dungeon.tag}</em></div>
        <h2>${dungeon.name}</h2>
        <p>${dungeon.copy}</p>
        <div class="home-continue-meta"><span>Party iLvl <b>${pi||'—'}</b></span><span>Entry <b>${dungeon.req}+</b></span><span class="${party.length===5&&!recovering&&pi>=dungeon.req?'ready':''}">${partyState}</span></div>
        <div class="boss-pips">${Array.from({length:dungeon.pips},(_,i)=>`<span class="${i<dungeon.active?'active':''}"></span>`).join('')}</div>
        <div class="home-continue-actions"><button type="button" data-home-primary>${primaryLabel} →</button><button type="button" data-home-party>MANAGE PARTY</button></div>
      </div>`;
    next.querySelector('[data-home-primary]')?.addEventListener('click',()=>{
      if(!ashenOpen&&dungeon.id==='ashen-vault'){switchView('quests');return}
      if(party.length<5){switchView('party');return}
      switchView('content');
      setTimeout(()=>window.CellboundDungeonBrowser?.open?.(dungeon.id),40)
    });
    next.querySelector('[data-home-party]')?.addEventListener('click',()=>switchView('party'));
  }

  const today=(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})();
  const tb=state.twelveBelow&&typeof state.twelveBelow==='object'?state.twelveBelow:{};
  const attemptsUsed=tb.date===today?Math.max(0,Number(tb.attemptsUsed)||0):0;
  const attemptsLeft=Math.max(0,3-attemptsUsed),bestKills=Math.max(0,Number(tb.bestKills)||0);
  const eventStatus=$('#homeEventStatus');if(eventStatus)eventStatus.textContent=attemptsLeft+' entr'+(attemptsLeft===1?'y':'ies')+' today · Best '+bestKills+'/12';
  const dungeonStatus=$('#homeDungeonStatus');if(dungeonStatus)dungeonStatus.textContent=dungeon.name;

  const pulse=$('#overviewGuildPulse');
  if(pulse){
    const assignedProfessions=state.roster.slice(0,cap).reduce((n,c)=>n+(Array.isArray(c.professions)?c.professions.filter(Boolean).length:0),0);
    const recoveringRoster=state.roster.slice(0,cap).filter(c=>isUnavailable(c)).length;
    pulse.innerHTML=`
      <button type="button" data-pulse="party"><span>PARTY</span><b>${party.length}/5</b><small>${recovering?'Recovery needed':party.length===5?'Active five set':'Slots open'}</small></button>
      <button type="button" data-pulse="bank"><span>BANK</span><b>${bankTotal()}</b><small>Items stored</small></button>
      <button type="button" data-pulse="professions"><span>PROFESSIONS</span><b>${assignedProfessions}</b><small>Assignments</small></button>
      <button type="button" data-pulse="roster"><span>ROSTER</span><b>${Math.min(state.roster.length,cap)}/${cap}</b><small>${recoveringRoster?recoveringRoster+' recovering':'All available'}</small></button>`;
    pulse.querySelector('[data-pulse="party"]')?.addEventListener('click',()=>switchView('party'));
    pulse.querySelector('[data-pulse="bank"]')?.addEventListener('click',()=>switchView('bank'));
    pulse.querySelector('[data-pulse="professions"]')?.addEventListener('click',()=>switchView('professions'));
    pulse.querySelector('[data-pulse="roster"]')?.addEventListener('click',()=>switchView('roster'));
  }
}
function bankBulkSelection(){
  [...bankBulkSelected].forEach(id=>{
    const item=state.bank.find(x=>x.id===id);
    if(!item||bankItemProtected(item))bankBulkSelected.delete(id);
  });
  return state.bank.filter(item=>bankBulkSelected.has(item.id)&&!bankItemProtected(item));
}
function mergeBankYield(target,source){
  Object.entries(source||{}).forEach(([key,qty])=>target[key]=(target[key]||0)+(Number(qty)||0));
  return target;
}
function bankBulkTotals(){
  const items=bankBulkSelection(),yieldMap={};
  let units=0,gold=0;
  items.forEach(item=>{
    const qty=Math.max(1,Number(item.quantity)||1);
    units+=qty;
    gold+=bankVendorUnitValue(item)*qty;
    mergeBankYield(yieldMap,bankDismantleYield(item,qty));
  });
  return{items,units,gold,yieldMap};
}
function updateBankBulkControls(){
  const toggle=$('#bankBulkToggle'),bar=$('#bankBulkBar'),count=$('#bankBulkCount'),hint=$('#bankBulkHint'),returns=$('#bankBulkReturns'),sell=$('#bankBulkSell'),dismantle=$('#bankBulkDismantle'),clear=$('#bankBulkClear');
  if(toggle){
    toggle.textContent=bankBulkMode?'DONE CLEANING':'CLEAN UP BANK';
    toggle.setAttribute('aria-pressed',bankBulkMode?'true':'false');
  }
  if(bar)bar.hidden=!bankBulkMode;
  if(!bankBulkMode)return;
  const{items,units,gold,yieldMap}=bankBulkTotals(),stacks=items.length;
  if(count)count.textContent=`${stacks} stack${stacks===1?'':'s'} selected · ${units} item${units===1?'':'s'}`;
  if(hint)hint.textContent=stacks?'Whole stacks will be processed. Review the combined return before confirming.':'Select unwanted equipment below. Protected quest and story items cannot be selected.';
  if(returns)returns.innerHTML=stacks
    ?`<div><span>SELL VALUE</span><b>+${gold.toLocaleString()} Gold</b></div><div><span>DISMANTLE RETURN</span><strong>${bankDismantleMarkup(yieldMap)||'No materials'}</strong></div>`
    :'<div class="bank-bulk-empty">Nothing selected yet.</div>';
  if(sell){sell.disabled=!stacks;sell.textContent=stacks?`SELL ${units} ITEM${units===1?'':'S'}`:'SELL SELECTED';}
  if(dismantle){dismantle.disabled=!stacks;dismantle.textContent=stacks?`DISMANTLE ${units} ITEM${units===1?'':'S'}`:'DISMANTLE SELECTED';}
  if(clear)clear.disabled=!stacks;
}
function setBankBulkMode(next){
  bankBulkMode=typeof next==='boolean'?next:!bankBulkMode;
  if(!bankBulkMode)bankBulkSelected.clear();
  renderBank();
}
function toggleBankBulkItem(id){
  const item=state.bank.find(x=>x.id===id);
  if(!bankBulkMode||!item||bankItemProtected(item))return;
  if(bankBulkSelected.has(id))bankBulkSelected.delete(id);else bankBulkSelected.add(id);
  renderBank();
}
function clearBankBulkSelection(){
  bankBulkSelected.clear();
  renderBank();
}
function disposeBankBulk(mode){
  const{items,units,gold,yieldMap}=bankBulkTotals();
  if(!items.length)return;
  const stackSummary=items.map(item=>`• ${item.name} ×${Math.max(1,Number(item.quantity)||1)}`).join('\n');
  if(mode==='vendor'){
    if(!confirm(`Sell ${units} selected item${units===1?'':'s'} to the Guild Quartermaster for ${gold.toLocaleString()} Gold?\n\n${stackSummary}\n\nThis cannot be undone.`))return;
    items.forEach(item=>removeBankQuantity(item,Math.max(1,Number(item.quantity)||1)));
    state.gold=(Number(state.gold)||0)+gold;
    state.activity.push(`Bulk sold ${units} item${units===1?'':'s'} from ${items.length} bank stack${items.length===1?'':'s'} for ${gold} Gold.`);
  }else if(mode==='dismantle'){
    const materialSummary=Object.entries(yieldMap).map(([key,n])=>`${P?.MATERIALS?.[key]?.name||key} ×${n}`).join(', ');
    if(!confirm(`Dismantle ${units} selected item${units===1?'':'s'}?\n\n${stackSummary}\n\nYou will receive: ${materialSummary}.\n\nThis cannot be undone.`))return;
    items.forEach(item=>removeBankQuantity(item,Math.max(1,Number(item.quantity)||1)));
    Object.entries(yieldMap).forEach(([key,n])=>addMaterial(key,n));
    state.activity.push(`Bulk dismantled ${units} item${units===1?'':'s'} from ${items.length} bank stack${items.length===1?'':'s'}: ${materialSummary}.`);
  }else return;
  bankBulkSelected.clear();
  bankBulkMode=false;
  save();
  renderAll();
  switchView('bank');
}

function bankRarityRank(item){
  const order={Common:1,Uncommon:2,Rare:3,Epic:4,Legendary:5,Ancient:6,Mythic:6};
  return order[String(item?.rarity||'Common')]||0;
}
function bankFilteredItems(){
  const search=String($('#bankSearch')?.value||'').trim().toLowerCase();
  const category=$('#bankCategory')?.value||'all',klass=$('#bankClass')?.value||'all',rarity=$('#bankRarity')?.value||'all',trade=$('#bankTrade')?.value||'all',sort=$('#bankSort')?.value||'newest';
  let items=[...state.bank];
  items=items.filter(item=>{
    const text=[item.name,item.source,item.class,item.slot,item.rarity,item.uniqueEffect?.name,item.uniqueEffect?.description].filter(Boolean).join(' ').toLowerCase();
    if(search&&!text.includes(search))return false;
    if(['Reagent','Consumable','Recipe'].includes(category))return false;
    if(category==='favorite'&&!item.favorite)return false;
    if(category==='junk'&&!item.junk)return false;
    if(!['all','Gear','favorite','junk'].includes(category)&&item.slot!==category)return false;
    if(klass!=='all'&&item.class!==klass&&item.classes!=='all'&&!(Array.isArray(item.classes)&&item.classes.includes(klass)))return false;
    if(rarity!=='all'&&String(item.rarity)!==rarity)return false;
    if(trade!=='all'&&String(item.tradeState||'tradeable')!==trade)return false;
    return true;
  });
  items.sort((a,b)=>{
    if(sort==='ilvl-desc')return(Number(b.itemLevel)||0)-(Number(a.itemLevel)||0);
    if(sort==='ilvl-asc')return(Number(a.itemLevel)||0)-(Number(b.itemLevel)||0);
    if(sort==='rarity')return bankRarityRank(b)-bankRarityRank(a)||(Number(b.itemLevel)||0)-(Number(a.itemLevel)||0);
    if(sort==='name')return String(a.name||'').localeCompare(String(b.name||''));
    return state.bank.indexOf(b)-state.bank.indexOf(a);
  });
  return items;
}
function renderBank(){
  bankBulkSelection();
  const gearStacks=state.bank.length,shards=Number(state.materials?.['cell-shards'])||0;
  const favourites=state.bank.filter(x=>x.favorite).length,junk=state.bank.filter(x=>x.junk).length;
  if($('#bankMetricGear'))$('#bankMetricGear').textContent=String(gearStacks);
  if($('#bankMetricShards'))$('#bankMetricShards').textContent=String(shards);
  if($('#bankMetricFavorites'))$('#bankMetricFavorites').textContent=String(favourites);
  if($('#bankMetricJunk'))$('#bankMetricJunk').textContent=String(junk);
  updateBankBulkControls();

  const visible=bankFilteredItems();
  const resourceCategory=['Reagent','Consumable','Recipe'].includes($('#bankCategory')?.value||'all');
  if(!visible.length&&!resourceCategory&&($('#bankCategory')?.value||'all')!=='all'){
    ui.bankGrid.innerHTML='<div class="bank-empty"><span>⌕</span><h3>No equipment matches this view.</h3><p>Change the category or reset the filters to return to the full vault.</p></div>';
    return;
  }
  if(!state.bank.length&&!resourceCategory&&($('#bankCategory')?.value||'all')!=='all'){
    ui.bankGrid.innerHTML='<div class="bank-empty"><span>◇</span><h3>No equipment stored yet.</h3><p>Dungeon rewards appear here before you decide who receives them.</p></div>';
    return;
  }

  ui.bankGrid.innerHTML=visible.map(item=>{
    const protectedItem=bankItemProtected(item),selected=bankBulkSelected.has(item.id),utility=isBankUtility(item);
    const action=bankBulkMode
      ?`<button class="bank-card-action select" data-bank-select="${item.id}" aria-pressed="${selected?'true':'false'}" ${protectedItem?'disabled':''}>${protectedItem?'PROTECTED':selected?'✓ SELECTED':'SELECT'}</button>`
      :`<button class="bank-card-action" data-bank-item="${item.id}">OPEN ITEM →</button>`;
    const stats=G.statLines?.(item)||[];
    const preview=utility
      ?`<span>${esc(item.description||'Encounter utility item.')}</span>`
      :stats.slice(0,2).map(s=>`<span>${s.text}</span>`).join('')||'<span class="legacy">No rolled stats</span>';
    const effect=item.uniqueEffect?`<span class="bank-effect-chip">✦ ${esc(item.uniqueEffect.name)}</span>`:'';
    const flags=(item.favorite?'<i class="bank-flag favorite">★</i>':'')+(item.junk?'<i class="bank-flag junk">JUNK</i>':'');
    const qty=utility?`${Math.max(0,Number(item.charges)||0)}/${Math.max(1,Number(item.maxCharges)||5)} uses`:`×${item.quantity||1}`;
    const meta=utility
      ?`${item.rarity||'Rare'} · Utility`
      :`${String(item.rarity||'Common')} · ${item.slot||'Gear'} · iLvl ${item.itemLevel||0}`;

    return `<article class="bank-item gear-bank-item bank-card-v2 tier-${item.tier||1} ${utility?'bank-utility-item':''} ${selected?'bank-item-selected':''} ${protectedItem?'bank-item-protected':''} ${item.favorite?'is-favorite':''} ${item.junk?'is-junk':''}">
      ${flags}
      <div class="bank-card-main">
        <div class="bank-icon gear-bank-icon">${bankItemArt(item,66)}</div>
        <div class="bank-copy">
          <small>${meta}</small>
          <h3>${esc(item.name)}</h3>
          <div class="bank-card-preview">${preview}${effect}</div>
        </div>
        <div class="bank-qty">${qty}</div>
      </div>
      <div class="bank-card-foot"><span>${esc(item.source||'Guild Bank')}${Number(item.upgradeLevel)>0?' · Upgrade '+Number(item.upgradeLevel):''}</span>${action}</div>
    </article>`;
  }).join('');

  ui.bankGrid.querySelectorAll('[data-bank-item]').forEach(b=>b.addEventListener('click',()=>openBankItem(b.dataset.bankItem)));
  ui.bankGrid.querySelectorAll('[data-bank-select]').forEach(b=>b.addEventListener('click',()=>toggleBankBulkItem(b.dataset.bankSelect)));
}
function bankItemProtected(item){
  const id=String(item?.itemId||'').toLowerCase(),label=String(item?.tierLabel||'').toLowerCase();
  return Boolean(item?.favorite)||Boolean(item?.questProtected)||isBankUtility(item)||id.startsWith('quest-')||label.includes('quest relic');
}
function bankVendorUnitValue(item){
  const i=canonicalItem(item)||item||{},tier=Math.max(1,Number(i.tier)||1),ilvl=Math.max(0,Number(i.itemLevel)||0),power=Math.max(0,Number(i.power)||0);
  const rarity=String(i.rarity||'Common'),mult=rarity==='Epic'?1.55:rarity==='Rare'?1.32:rarity==='Uncommon'?1.14:1;
  return Math.max(5,Math.round((8+ilvl*.5+power*1.35+tier*6)*mult));
}
function bankDismantleYield(item,quantity=1){
  const qty=Math.max(1,Math.floor(Number(quantity)||1)),tier=Math.max(1,Number(item?.tier)||1),rareBonus=['Rare','Epic'].includes(String(item?.rarity||''))?1:0;
  const heavy=['Warrior','Paladin'].includes(item?.class),out={};
  const add=(key,n)=>{out[key]=(out[key]||0)+n};
  if(tier<=1){
    add(heavy?'zeltiran-iron':'faded-cell-fragment',qty*(1+rareBonus));
  }else if(tier===2){
    add('ashen-soul-fragment',qty*(1+rareBonus));
    add(heavy?'warden-iron':'faded-cell-fragment',qty);
  }else{
    add('ashen-soul-fragment',qty*(2+rareBonus));
    add(heavy?'warden-iron':'faded-cell-fragment',qty);
  }
  add('cell-shards',qty*(tier===1?2:tier===2?4:tier===3?7:11));
  return out;
}
function bankDismantleMarkup(yieldMap){
  return Object.entries(yieldMap).map(([key,qty])=>{
    const m=P?.MATERIALS?.[key],art=P?.materialArtHTML?P.materialArtHTML(key,30,'bank-salvage-art'):`<span class="bank-salvage-fallback">${m?.icon||'◇'}</span>`;
    return `<span class="bank-salvage-material">${art}<b>${m?.name||key}</b><em>×${qty}</em></span>`;
  }).join('');
}
function bankCleanupQuantity(item){
  const input=$('#bankCleanupQty'),max=Math.max(1,Number(item?.quantity)||1),raw=Math.floor(Number(input?.value)||1),qty=Math.max(1,Math.min(max,raw));
  if(input&&Number(input.value)!==qty)input.value=qty;
  return qty;
}
function updateBankCleanupPreview(id){
  const item=state.bank.find(x=>x.id===id);if(!item||bankItemProtected(item))return;
  const qty=bankCleanupQuantity(item),gold=bankVendorUnitValue(item)*qty,yieldMap=bankDismantleYield(item,qty);
  const vendor=$('#bankVendorPreview'),salvage=$('#bankDismantlePreview');
  if(vendor)vendor.innerHTML=`<span>Quartermaster pays</span><b>+${gold.toLocaleString()} Gold</b>`;
  if(salvage)salvage.innerHTML=bankDismantleMarkup(yieldMap);
}
function removeBankQuantity(item,quantity){
  const qty=Math.max(1,Math.min(Number(item?.quantity)||1,Math.floor(Number(quantity)||1)));
  item.quantity=(Number(item.quantity)||1)-qty;
  if(item.quantity<=0)state.bank=state.bank.filter(x=>x.id!==item.id);
  return qty;
}
function disposeBankItem(id,mode){
  const item=state.bank.find(x=>x.id===id);if(!item||bankItemProtected(item))return;
  const qty=bankCleanupQuantity(item),name=item.name||'item';
  if(mode==='vendor'){
    const gold=bankVendorUnitValue(item)*qty;
    if(!confirm(`Sell ${qty} × ${name} to the Guild Quartermaster for ${gold.toLocaleString()} Gold?\n\nThis cannot be undone.`))return;
    removeBankQuantity(item,qty);state.gold=(Number(state.gold)||0)+gold;
    state.activity.push(`Sold ${qty} × ${name} to the Guild Quartermaster for ${gold} Gold.`);
  }else if(mode==='dismantle'){
    const yieldMap=bankDismantleYield(item,qty),summary=Object.entries(yieldMap).map(([key,n])=>`${P?.MATERIALS?.[key]?.name||key} ×${n}`).join(', ');
    if(!confirm(`Dismantle ${qty} × ${name}?\n\nYou will receive: ${summary}.\n\nThis cannot be undone.`))return;
    removeBankQuantity(item,qty);Object.entries(yieldMap).forEach(([key,n])=>addMaterial(key,n));
    state.activity.push(`Dismantled ${qty} × ${name}: ${summary}.`);
  }else return;
  save();ui.bankModal.hidden=true;document.body.classList.remove('bank-manage-open');renderAll();switchView('bank');
}

function bankUpgradeMax(item){
  const tier=Math.max(1,Number(item?.tier)||1),base=Number(item?.baseItemLevel)||Number(item?.itemLevel)||0,current=Number(item?.itemLevel)||0;
  if(tier>=5)return current;
  const steps=({1:2,2:3,3:3,4:4})[tier]||2,ceiling=({1:26,2:32,3:40,4:44})[tier]||44;
  return Math.max(current,Math.min(ceiling,base+steps*2));
}
function bankUpgradeCost(item){
  const tier=Math.max(1,Number(item?.tier)||1),level=Math.max(0,Number(item?.upgradeLevel)||0);
  return 4+tier*3+level*4;
}
function bankCanUpgrade(item){return (Number(item?.itemLevel)||0)<bankUpgradeMax(item);}
function upgradeBankItem(id){
  const item=state.bank.find(x=>x.id===id);if(!item||!bankCanUpgrade(item))return;
  const cost=bankUpgradeCost(item),available=Number(state.materials?.['cell-shards'])||0,next=Math.min(bankUpgradeMax(item),(Number(item.itemLevel)||0)+2);
  if(available<cost){alert('You need '+cost+' Cell Shards. You currently have '+available+'.');return;}
  if(!confirm('Upgrade '+item.name+' from Item Level '+item.itemLevel+' to '+next+' for '+cost+' Cell Shards?'))return;
  const detailScroll=Math.max(0,Number(ui.bankDetail?.scrollTop)||0);
  let target=item;
  if((Number(item.quantity)||1)>1){
    item.quantity--;
    target={...item,id:'bank-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),quantity:1,favorite:false,junk:false};
    state.bank.push(target);
  }
  target.baseItemLevel=Number(target.baseItemLevel)||Number(target.itemLevel)||0;
  target.itemLevel=next;target.upgradeLevel=(Number(target.upgradeLevel)||0)+1;
  if(target.upgradeLevel%2===0)target.power=(Number(target.power)||0)+1;
  state.materials['cell-shards']=available-cost;
  state.activity.push('Upgraded '+target.name+' to Item Level '+target.itemLevel+' for '+cost+' Cell Shards.');
  save();
  renderAll();
  openBankItem(target.id);
  requestAnimationFrame(()=>{if(ui.bankDetail)ui.bankDetail.scrollTop=detailScroll});
  window.CellboundFX?.micro?.(target.name+' upgraded to iLvl '+target.itemLevel,'gold');
}
function toggleBankFlag(id,key){
  const item=state.bank.find(x=>x.id===id);if(!item||!['favorite','junk'].includes(key))return;
  item[key]=!item[key];
  if(key==='favorite'&&item.favorite)item.junk=false;
  if(key==='junk'&&item.junk)item.favorite=false;
  bankBulkSelection();save();openBankItem(id);renderBank();
}
function bankStatMap(item){return Object.fromEntries((G.statLines?.(item)||[]).map(x=>[x.key,x]));}
function bankCompareMarkup(ch,item){
  const current=canonicalItem(ch?.equipment?.[item.slot]),incoming=bankStatMap(item),equipped=bankStatMap(current),keys=[...new Set([...Object.keys(incoming),...Object.keys(equipped)])];
  const ilvlDelta=(Number(item.itemLevel)||0)-(Number(current?.itemLevel)||0);
  const stats=keys.map(key=>{
    const a=Number(incoming[key]?.value)||0,b=Number(equipped[key]?.value)||0,d=a-b,label=incoming[key]?.label||equipped[key]?.label||key,unit=(incoming[key]?.unit||equipped[key]?.unit)==='percent'?'%':'';
    return '<span class="'+(d>0?'gain':d<0?'loss':'same')+'"><b>'+(d>0?'+':'')+d+unit+'</b>'+esc(label)+'</span>';
  }).join('');
  const effect=item.uniqueEffect?'<p><strong>'+esc(item.uniqueEffect.name)+'</strong>'+esc(item.uniqueEffect.description)+'</p>':'';
  return '<span class="bank-comparison"><span><small>CURRENT</small><b>'+esc(current?.name||('Empty '+item.slot))+'</b><em>iLvl '+(Number(current?.itemLevel)||0)+'</em></span><span class="bank-compare-delta '+(ilvlDelta>0?'gain':ilvlDelta<0?'loss':'')+'"><strong>'+(ilvlDelta>0?'+':'')+ilvlDelta+' iLvl</strong>'+(stats||'<span class="same"><b>—</b>No stat delta</span>')+'</span><span><small>NEW</small><b>'+esc(item.name)+'</b><em>iLvl '+(Number(item.itemLevel)||0)+'</em>'+effect+'</span></span>';
}
function selectJunkForBulk(){
  const junk=state.bank.filter(x=>x.junk&&!bankItemProtected(x));
  if(!junk.length){alert('No unprotected junk items are marked in the Bank.');return;}
  bankBulkMode=true;bankBulkSelected.clear();junk.forEach(x=>bankBulkSelected.add(x.id));renderBank();
}
function openBankItem(id){
  const item=state.bank.find(x=>x.id===id);if(!item)return;
  if(isBankUtility(item)){
    const charges=Math.max(0,Number(item.charges)||0),maxCharges=Math.max(1,Number(item.maxCharges)||5);
    ui.bankDetail.innerHTML=`<div class="detail-hero gear-detail-hero bank-utility-detail"><div class="gear-detail-art">${bankItemArt(item,112)}</div><div><small>${esc(String(item.rarity||'Rare').toUpperCase())} · UTILITY · ${charges}/${maxCharges} USES</small><h2>${esc(item.name)}</h2><div class="bank-utility-chargebar"><i style="width:${Math.max(0,Math.min(100,charges/maxCharges*100))}%"></i></div><p>${esc(item.description||'Encounter utility item.')}</p><p>Dropped by ${esc(item.source||'Unknown source')}</p><p><strong>Tradeable.</strong> List it through the Trading Post, or use it from the Blackout Station grid puzzle.</p></div></div><div class="bank-cleanup bank-cleanup-protected"><div class="bank-cleanup-head"><div><small>UTILITY ITEM</small><h3>Protected from dismantling</h3></div><span>${charges}/${maxCharges}</span></div><p>Charges are consumed only when this module overrides the Blackout Station grid. It cannot be equipped, upgraded or dismantled.</p></div>`;
    document.body.classList.add('bank-manage-open');ui.bankModal.hidden=false;return;
  }
  const eligible=state.roster.filter((c,i)=>isRosterSlotUnlocked(i)&&canUseItem(c,item)&&!isUnavailable(c));
  const protectedItem=bankItemProtected(item),qty=Math.max(1,Number(item.quantity)||1),unitValue=bankVendorUnitValue(item),oneYield=bankDismantleYield(item,1),shards=Number(state.materials?.['cell-shards'])||0,upgradeCost=bankUpgradeCost(item),upgradeMax=bankUpgradeMax(item);
  const protectionCopy=item.favorite?'This item is marked as favourite. Remove the favourite mark before selling or dismantling it.':'Unique quest and story relics cannot be sold or dismantled. This prevents permanent rewards being destroyed accidentally.';
  const upgrade=bankCanUpgrade(item)?`<div class="bank-upgrade-box"><div><small>ITEM UPGRADE</small><h3>Item Level ${item.itemLevel} → ${Math.min(upgradeMax,(Number(item.itemLevel)||0)+2)}</h3><p>Spend Cell Shards to keep a valued item relevant. Upgrades are capped and cannot scale forever.</p></div><div><b>${shards} shards</b><span>${upgradeCost} required</span><button data-bank-upgrade type="button" ${shards<upgradeCost?'disabled':''}>UPGRADE ITEM</button></div></div>`:`<div class="bank-upgrade-box capped"><div><small>ITEM UPGRADE</small><h3>Upgrade cap reached</h3><p>This item has reached its current dungeon-power ceiling.</p></div><b>iLvl ${item.itemLevel}</b></div>`;
  const flags=`<div class="bank-item-flags"><button data-bank-favorite type="button" class="${item.favorite?'active':''}">${item.favorite?'★ FAVOURITE':'☆ MARK FAVOURITE'}</button><button data-bank-junk type="button" class="${item.junk?'active junk':''}">${item.junk?'✓ JUNK':'MARK AS JUNK'}</button></div>`;
  const cleanup=protectedItem
    ?`<div class="bank-cleanup bank-cleanup-protected"><div class="bank-cleanup-head"><div><small>ITEM SAFETY</small><h3>Protected item</h3></div><span>LOCKED</span></div><p>${protectionCopy}</p></div>`
    :`<div class="bank-cleanup">
        <div class="bank-cleanup-head"><div><small>BANK CLEANUP</small><h3>Sell or dismantle</h3></div><span>IRREVERSIBLE</span></div>
        <p>Sell unwanted equipment for guaranteed Gold, or dismantle it into useful crafting materials.</p>
        <div class="bank-cleanup-quantity"><label><span>Quantity</span><input id="bankCleanupQty" type="number" inputmode="numeric" min="1" max="${qty}" value="1"></label><button data-bank-cleanup-all type="button">ALL ×${qty}</button></div>
        <div class="bank-cleanup-options">
          <article class="bank-cleanup-option vendor"><div><small>GUILD QUARTERMASTER</small><h4>Sell equipment</h4><p>Fastest way to clear space. Vendor prices are intentionally below player-market value.</p></div><div id="bankVendorPreview" class="bank-cleanup-return"><span>Quartermaster pays</span><b>+${unitValue.toLocaleString()} Gold</b></div><button data-bank-vendor type="button">SELL TO QUARTERMASTER</button></article>
          <article class="bank-cleanup-option salvage"><div><small>WORKBENCH</small><h4>Dismantle equipment</h4><p>Recover part of the equipment's crafting value. Boss-specific rare cores are never generated by dismantling.</p></div><div id="bankDismantlePreview" class="bank-salvage-preview">${bankDismantleMarkup(oneYield)}</div><button data-bank-dismantle type="button">DISMANTLE AT WORKBENCH</button></article>
        </div>
      </div>`;

  const stats=G.statLines?.(item)||[];ui.bankDetail.innerHTML=`<div class="detail-hero gear-detail-hero"><div class="gear-detail-art">${G.artHTML(item,112)}</div><div><small>${tierText(item).toUpperCase()} · ${String(item.class||'All').toUpperCase()} · ${String(item.slot||'Gear').toUpperCase()}</small><h2>${item.name}</h2><div class="bank-detail-rolls">${stats.length?stats.map(s=>`<span>${s.text}</span>`).join(''):'<span class="legacy">Legacy item · no rolled stats</span>'}</div>${setBonusPanel(item)}${item.uniqueEffect?`<div class="bank-unique-detail"><small>UNIQUE EFFECT</small><b>${esc(item.uniqueEffect.name)}</b><p>${esc(item.uniqueEffect.description)}</p></div>`:''}<p>Dropped by ${item.source||'Unknown source'}</p><p>Quantity in bank: ${qty}</p></div></div>${flags}${upgrade}<div class="bank-manage"><h3>Equip to an adventurer</h3><p>Same Item Level can still be an upgrade if the roll better suits that character's spec.</p><div class="bank-character-list">${eligible.map(ch=>{const fit=G.rollFit?.(ch,item);return`<button data-equip-char="${ch.id}"><span class="avatar">${portraitHTML(ch,'sm')}</span><span><b>${ch.name}</b><small>${ch.race||'Veyren'} · ${ch.class} · ${ch.spec} · iLvl ${characterItemLevel(ch)}</small></span><em class="roll-fit ${fit?.tone||''}">${fit?.label||''}</em>${bankCompareMarkup(ch,item)}</button>`}).join('')||'<p>No available characters can use this item.</p>'}</div></div>${cleanup}`;
  document.body.classList.add('bank-manage-open');ui.bankModal.hidden=false;
  ui.bankDetail.querySelectorAll('[data-equip-char]').forEach(b=>b.addEventListener('click',()=>equipBankItem(id,b.dataset.equipChar)));
  $('[data-bank-favorite]')?.addEventListener('click',()=>toggleBankFlag(id,'favorite'));
  $('[data-bank-junk]')?.addEventListener('click',()=>toggleBankFlag(id,'junk'));
  $('[data-bank-upgrade]')?.addEventListener('click',()=>upgradeBankItem(id));
  if(!protectedItem){
    $('#bankCleanupQty')?.addEventListener('input',()=>updateBankCleanupPreview(id));
    $('[data-bank-cleanup-all]')?.addEventListener('click',()=>{const input=$('#bankCleanupQty');if(input)input.value=qty;updateBankCleanupPreview(id)});
    $('[data-bank-vendor]')?.addEventListener('click',()=>disposeBankItem(id,'vendor'));
    $('[data-bank-dismantle]')?.addEventListener('click',()=>disposeBankItem(id,'dismantle'));
  }
}
function addBankItem(raw,record=true){
  const canonical=canonicalItem(raw);if(!canonical)return;const sig=G.rollSignature?.(canonical)||'';const existing=!canonical.nonStackable&&state.bank.find(x=>x.itemId===canonical.itemId&&(G.rollSignature?.(x)||'')===sig);if(existing){existing.quantity=(existing.quantity||1)+1;existing.source=raw.source||existing.source;}else state.bank.push({...canonical,id:`bank-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,quantity:1,source:raw.source||'Unknown'});if(record)state.collectionHistory.push({itemId:canonical.itemId,name:canonical.name,tier:canonical.tier,itemLevel:canonical.itemLevel,bonusStats:canonical.bonusStats||[],source:raw.source||'Unknown',at:new Date().toISOString()});
}
function addMaterial(key,quantity=1){if(!key||quantity<=0)return;state.materials[key]=(Number(state.materials[key])||0)+quantity;}
function awardReagents(boss){if(!P)return[];const drops=P.rollReagents(boss.id);drops.forEach(d=>addMaterial(d.key,d.quantity));if(boss.id==='vaultheart'&&!state.discoveredRecipes.includes('enc-vault-glyph')&&!state.recipeScrolls.some(x=>x.recipeId==='enc-vault-glyph')&&Math.random()<.12){state.recipeScrolls.push({recipeId:'enc-vault-glyph',name:'Recipe: Vaultheart Glyph',quantity:1});drops.push({key:'recipe:enc-vault-glyph',quantity:1,recipe:true});state.activity.push('Rare recipe scroll dropped: Vaultheart Glyph.');}return drops;}
function equipBankItem(itemId,charId){
  const item=state.bank.find(x=>x.id===itemId),c=charById(charId);if(!item||!c||!canUseItem(c,item)||isUnavailable(c))return;
  const slot=item.slot,incoming=canonicalItem(item);
  if(!G?.canEquipInSlot?.(incoming,slot))return;
  const old=canonicalItem(c.equipment?.[slot]);
  if(old?.name){c.power=Math.max(1,(Number(c.power)||1)-(Number(old.power)||0));addBankItem({...old,source:`Unequipped from ${c.name}`},false)}
  c.equipment[slot]={...incoming,source:'Equipped'};c.power=Math.max(1,(Number(c.power)||1)+(Number(incoming?.power)||0));
  c.gearItems=ILVL_SLOTS.map(s=>c.equipment?.[s]?.name||'Empty');c.gear=characterItemLevel(c);item.quantity=(item.quantity||1)-1;if(item.quantity<=0)state.bank=state.bank.filter(x=>x.id!==item.id);state.activity.push(`${c.name} equipped ${item.name} (iLvl ${item.itemLevel}).`);save();ui.bankModal.hidden=true;document.body.classList.remove('bank-manage-open');renderAll();switchView('bank');
}
$('[data-bank-close]')?.addEventListener('click',()=>{ui.bankModal.hidden=true;document.body.classList.remove('bank-manage-open')});ui.bankModal?.addEventListener('click',e=>{if(e.target===ui.bankModal){ui.bankModal.hidden=true;document.body.classList.remove('bank-manage-open')}});
function setBankCategory(value){
  const select=$('#bankCategory');if(!select)return;
  select.value=value;
  document.querySelectorAll('.bank-category-tabs [data-bank-category]').forEach(b=>b.classList.toggle('active',b.dataset.bankCategory===value));
  select.dispatchEvent(new Event('change',{bubbles:true}));
}
$('#bankBulkToggle')?.addEventListener('click',()=>setBankBulkMode());
$('#bankSelectJunk')?.addEventListener('click',selectJunkForBulk);
$('#bankSearch')?.addEventListener('input',renderBank);
['bankCategory','bankClass','bankRarity','bankTrade','bankSort'].forEach(id=>$('#'+id)?.addEventListener('change',renderBank));
document.querySelectorAll('.bank-category-tabs [data-bank-category]').forEach(b=>b.addEventListener('click',()=>setBankCategory(b.dataset.bankCategory)));
$('#bankClearFilters')?.addEventListener('click',()=>{
  const search=$('#bankSearch');if(search)search.value='';
  for(const id of ['bankClass','bankRarity','bankTrade']){const el=$('#'+id);if(el){el.value='all';el.dispatchEvent(new Event('change',{bubbles:true}))}}
  const sort=$('#bankSort');if(sort){sort.value='newest';sort.dispatchEvent(new Event('change',{bubbles:true}))}
  const searchEvent=new Event('input',{bubbles:true});search?.dispatchEvent(searchEvent);
  setBankCategory('all');
});
$('#bankBulkClear')?.addEventListener('click',clearBankBulkSelection);
$('#bankBulkSell')?.addEventListener('click',()=>disposeBankBulk('vendor'));
$('#bankBulkDismantle')?.addEventListener('click',()=>disposeBankBulk('dismantle'));

function removeChar(id){writePartySlots(partySlotIds().map(x=>x===id?null:x))}
function assignChar(id){
  const c=charById(id);if(!c||!isCharacterRosterUnlocked(id)||isUnavailable(c))return;
  const slots=partySlotIds();if(slots.includes(id))return;
  const idx=slots.findIndex(x=>!x);if(idx<0)return;
  slots[idx]=id;writePartySlots(slots);save();renderAll()
}
function partyComposition(chars=partyCharacters()){
  const counts={tank:0,healer:0,dps:0};chars.forEach(c=>counts[roleOf(c)]=(counts[roleOf(c)]||0)+1);
  const parts=[];if(counts.tank)parts.push(counts.tank+' Tank');if(counts.healer)parts.push(counts.healer+' Healer');if(counts.dps)parts.push(counts.dps+' Damage');
  return parts.join(' · ')||'No roles assigned'
}
function slotHtml(index,id){
  const c=id?charById(id):null,r=c?roleOf(c):null,icon=r==='tank'?'🛡':r==='healer'?'✚':r==='dps'?'⚔':'•',accent=c?(classDef(c)?.glow||'#d8b976'):'#6d7d78';
  return `<div class="party-slot ${c?'filled':''} ${c&&isUnavailable(c)?'shock-locked':''}" style="--slot-accent:${accent}"><span class="party-slot-index">0${index+1}</span><div class="slot-role">${c?portraitHTML(c,'sm'):icon}</div><div class="party-slot-copy">${c?`<b>${c.name}</b><small>${c.class} · ${c.spec}</small><span>${roleLabel(r)} · iLvl ${characterItemLevel(c)} · Shock ${c.cellShock||0}%</span>`:`<b>Open Slot</b><small>Choose any available adventurer</small><span>Role follows active specialisation</span>`}</div>${c?`<button data-remove="${c.id}" aria-label="Remove ${c.name} from party">×</button>`:''}</div>`;
}
function partyReadiness(){
  const ids=flatPartyIds();
  if(ids.length<5)return{score:ids.length*20,ready:false,hint:'Fill all five party slots. Any role composition is allowed.'};
  const chars=ids.map(charById);
  if(chars.some(c=>!c||isUnavailable(c)))return{score:60,ready:false,hint:'A party member is recovering from 100% Cell Shock. Rotate them out before entering combat.'};
  if(ids.some(id=>!isCharacterRosterUnlocked(id)))return{score:60,ready:false,hint:'A selected character is outside your currently unlocked roster slots.'};
  const pi=partyItemLevel(),avgLevel=Math.round(chars.reduce((s,c)=>s+Math.max(1,Number(c.level)||1),0)/5),composition=partyComposition(chars);
  return{score:100,ready:true,hint:`${composition} · Party Lv ${avgLevel} · iLvl ${pi}. Choose a dungeon to check its specific entry requirement.`};
}
function renderParty(){
  const slots=partySlotIds();ui.partySlots.innerHTML=slots.map((id,i)=>slotHtml(i,id)).join('');ui.partySlots.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{removeChar(b.dataset.remove);save();renderAll();}));
  const selected=new Set(flatPartyIds());ui.partyRoster.innerHTML=state.roster.map((c,i)=>{const slotLocked=!isRosterSlotUnlocked(i),shock=isUnavailable(c),disabled=selected.has(c.id)||slotLocked||shock||selected.size>=5;return `<button class="party-choice ${slotLocked?'roster-locked':''} ${shock?'shock-locked':''}" data-pick="${c.id}" ${disabled?'disabled':''}><div class="avatar">${portraitHTML(c,'sm')}</div><div><b>${c.name}</b><small>Lv. ${c.level} · ${c.class} · ${c.spec} · iLvl ${characterItemLevel(c)}</small></div><em>${slotLocked?'Member slot':shock?`Recovering ${formatRemaining(c)}`:`${roleLabel(roleOf(c))} · Shock ${c.cellShock||0}%`}</em></button>`;}).join('');
  ui.partyRoster.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>assignChar(b.dataset.pick)));const r=partyReadiness();ui.readinessFill.style.width=`${r.score}%`;ui.readinessText.textContent=`${r.score}%`;ui.readinessLabel.textContent=r.ready?'READY':'NOT READY';ui.readinessLabel.className=r.ready?'good':'';ui.readinessHint.textContent=r.hint;
}
$('#autoFill')?.addEventListener('click',()=>{const available=state.roster.filter((c,i)=>isRosterSlotUnlocked(i)&&!isUnavailable(c)).sort((a,b)=>characterItemLevel(b)-characterItemLevel(a)||b.power-a.power).slice(0,5);writePartySlots(available.map(c=>c.id));save();renderAll();});
$('#partyOpenDungeons')?.addEventListener('click',()=>switchView('content'));

function applyCellShock(c,amount){
  if(!c)return;c.cellShock=Math.min(100,Math.max(0,(Number(c.cellShock)||0)+amount));if(c.cellShock>=100&&!c.cellShockLockedUntil){const mins=entitlements().recoveryMinutes;c.cellShock=100;c.cellShockLockedUntil=new Date(Date.now()+mins*60000).toISOString();state.activity.push(`${c.name} reached 100% Cell Shock and must recover for ${mins} minutes.`);removeChar(c.id);}
}
function renderReports(){
  if(!state.reports.length){ui.reportsList.innerHTML='<div class="panel" style="padding:30px;color:#657874">No attempts yet. Build a party and enter The Ashen Vault.</div>';return;}
  ui.reportsList.innerHTML=state.reports.map(r=>{const b=bossById(r.boss),loot=G.byId(r.lootItemId)||G.byName(r.loot);return `<article class="report-card"><div><div class="report-result ${r.success?'kill':'wipe'}">${r.success?'VICTORY':'WIPE'}</div><small>${new Date(r.at).toLocaleString()}</small></div><div><h3>${b?.name||'Encounter'}</h3><p>${r.success?'The party won. Existing Cell Shock remains.':`The party gained ${r.cellShockGain||PVE_WIPE_CELL_SHOCK}% Cell Shock and Mastery.`}${loot?` Loot: ${loot.name} · iLvl ${r.lootItemLevel||loot.itemLevel||'—'} → Guild Bank.`:''}${r.reagents?.length?` Reagents: ${r.reagents.map(d=>`${P?.MATERIALS?.[d.key]?.name||'Recipe'} ×${d.quantity}`).join(', ')}.`:''}</p></div><div class="report-gain"><b>Mastery gained</b>${r.knowledgeGain.map(k=>`<span>${k.name} +${k.gain}%</span>`).join('')}</div></article>`;}).join('');
}
function safeFeatureRender(label,fn){try{fn?.()}catch(error){console.warn('Cellbound UI refresh isolated:',label,error)}}
function renderAll(){if(!state)return;state.roster.forEach(c=>{refreshRecovery(c);c.gear=characterItemLevel(c);});renderTop();renderOverview();renderRoster();renderParty();renderBank();renderReports();writeLocal();safeFeatureRender('quests',()=>window.CellboundQuests?.render?.());safeFeatureRender('hollow-sanctum',()=>window.CellboundHollowSanctum?.renderCard?.());safeFeatureRender('chaos-canyon',()=>window.CellboundChaosCanyon?.renderCard?.());safeFeatureRender('blackout-station',()=>window.CellboundBlackoutStation?.renderCard?.());safeFeatureRender('fractured-ages',()=>window.CellboundFracturedAges?.renderCard?.());window.dispatchEvent(new CustomEvent('cellbound:state-rendered'));}
function tickRecovery(){if(!state)return;let changed=false;state.roster.forEach(c=>{if(refreshRecovery(c)){state.activity.push(`${c.name} has fully recovered from Cell Shock.`);changed=true;}});if(changed)save();if(state.roster.some(c=>isUnavailable(c)))renderAll();}

window.CellboundGame={
  ready:false,getState:()=>state,replaceState,getEntitlements:()=>entitlements(),getLevelCap:()=>PLAYER_LEVEL_CAP,getUser:()=>currentUser,getAccount:()=>account,getSupabase:()=>supabaseClient,isCharacterRosterUnlocked,refreshMembershipStatus,refreshStateFromServer,
  characterItemLevel,partyItemLevel,isUnavailable,formatRecovery:formatRemaining,persistState,save,canonicalItem,bosses,classes,portraitHTML,
  addBankItem,addMaterial,renderAll,switchView,starterEquipment,
  getPartyCharacters:()=>partyCharacters(),
  applyPartyCellShock:(amount=PVE_WIPE_CELL_SHOCK)=>{const chars=partyCharacters();chars.forEach(ch=>applyCellShock(ch,amount));save();renderAll();return chars.map(ch=>({id:ch.id,name:ch.name,cellShock:ch.cellShock}));}
};
$('#signOut')?.addEventListener('click',async()=>{clearTimeout(syncTimer);await persistState();await supabaseClient.auth.signOut();location.replace('./index.html');});
(async()=>{
  const {data,error}=await supabaseClient.auth.getSession();if(error||!data.session?.user){location.replace('./index.html');return;}
  await loadAccount(data.session.user);window.CellboundGame.ready=true;renderAll();recoveringTicker=setInterval(tickRecovery,1000);
  membershipTicker=setInterval(()=>refreshMembershipStatus({render:true,silent:true}),30000);
  window.addEventListener('focus',()=>refreshMembershipStatus({render:true,silent:true}));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshMembershipStatus({render:true,silent:true})});
  window.addEventListener('beforeunload',()=>{if(membershipTicker)clearInterval(membershipTicker)},{once:true});
})();
})();
