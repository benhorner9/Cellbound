(()=>{
'use strict';
window.CellboundCombatStandard?.register?.('manor-raid',{kind:'raid',execution:'local-coop',ui:'shared-cb2d'});
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const RAID_ID='manor';
const RAID_NAME='The Manor';
const CLASS_COLORS={Warrior:'#C69B6D',Paladin:'#F48CBA',Priest:'#FFFFFF',Druid:'#FF7C0A',Hunter:'#AAD372',Rogue:'#FFF468',Mage:'#3FC7EB',Monk:'#00FF98',Shaman:'#0070DD',Warlock:'#8788EE','Death Knight':'#C41E3A','Demon Hunter':'#A330C9',Evoker:'#33937F'};
const SET_NAMES={Warrior:'Housebreaker Plate',Paladin:'Gilded Vigil',Priest:'Veil of the Attic',Druid:'Nightbloom Regalia',Hunter:'Blackwood Hunt',Rogue:'Silent Service',Mage:'Housebound Arcanum',Monk:'Stillhouse Vestments',Shaman:'Stormcell Regalia',Warlock:'Ashen Covenant','Death Knight':'Grave Manor Plate','Demon Hunter':'Nightglass Harness',Evoker:'Emberwing Regalia'};
const STAGES={
 butler:{name:'The Butler',room:'Entrance Hall',duration:36000,next:'maids'},
 engineer:{name:'The Engineer',room:'Upper Workshop',duration:52000,next:'bedroom'},
 bedroom:{name:'The Bedroom',room:'West Bedroom',duration:20000,next:'housebound'},
 housebound:{name:'The Master of the Manor',room:'The Attic',duration:100000,next:'victory'}
};
const SCREECH_COLOURS=[
 {name:'RED',hex:'#ff5050'},{name:'BLUE',hex:'#55a7ff'},{name:'GREEN',hex:'#58d87a'},{name:'YELLOW',hex:'#ffd34f'},{name:'PURPLE',hex:'#bf75ff'}
];
let Game=null,db=null,user=null,mount=null,groups=[],members=[],lockout=null,myGroup=null,session=null,pendingRewardSession=null;
let hubTimer=null,raidTimer=null,paintTimer=null,advancing=false,lastStage='',lastScreechAt=0,screechOpen=false,sharedStageKey='',closingRaid=false,raidRealtime=null,readyLaunchTimer=null,serverClockOffset=0;
const combatCache=new Map();
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const roleOf=c=>Game?.classes?.[c?.class]?.specs?.[c?.spec]?.role||c?.role||'dps';
const partyReady=()=>party().length===5&&!party().some(c=>Game?.isUnavailable?.(c));
const unlocked=()=>Boolean(state()?.progression?.manorRaidUnlocked);
const now=()=>Date.now();
const serverNow=()=>Date.now()+serverClockOffset;
function syncServerClock(serverStamp,localReference=Date.now()){
 const ms=stamp(serverStamp);if(ms)serverClockOffset=ms-localReference
}
const stamp=v=>new Date(v||0).getTime()||0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function snapshot(){
 return party().map(c=>JSON.parse(JSON.stringify({
   id:c.id,name:c.name,class:c.class,spec:c.spec,role:roleOf(c),level:Number(c.level)||1,power:Number(c.power)||1,
   race:c.race||null,raceTrait:c.raceTrait||null,itemLevel:Number(Game?.characterItemLevel?.(c))||0,
   portrait:c.portrait||'',appearance:c.appearance||null,equipment:c.equipment||{},talents:c.talents||{},
   skillLoadouts:c.skillLoadouts||{},buffSkill:c.buffSkill||null,knowledge:c.knowledge||{}
 })));
}

const STAGE_MIN_MS={butler:30000,maids:30000,engineer:40000,bedroom:12000,housebound:40000};
function combatEngine(){return window.CellboundCombatStandard}
function engineParty(side=null){
 const rows=memberRows(),selected=side===null?rows:(rows[side]?[rows[side]]:[]);
 return selected.flatMap((row,rowIndex)=>{
   const actualSide=side===null?rowIndex:side;
   return (Array.isArray(row?.party_snapshot)?row.party_snapshot:[]).map(ch=>({
     ...JSON.parse(JSON.stringify(ch)),
     id:(side===null?'raid-':'maid-')+actualSide+'-'+String(ch.id||ch.name||'character'),
     _combatItemLevel:Number(ch.itemLevel)||0,itemLevel:Number(ch.itemLevel)||0,gear:Number(ch.itemLevel)||0,
     power:Math.max(1,Number(ch.power)||Math.round((Number(ch.itemLevel)||20)*1.1))
   }))
 })
}
function manorEncounter(stage){
 if(stage==='butler')return{id:'manor-butler',title:'The Butler',kind:'boss',level:15,enemies:[{name:'The Butler',classification:'boss',passive:true}],enemyHealth:5000,mechanicIntervalMs:3200,mechanics:[{name:'Plate Barrage',type:'persistent-circle',duration:1300,persistMs:9000,tickMs:1100,tickDamage:5,radius:10},{name:'Slow Patrol',type:'patrol',duration:1300}],hardEnrageMs:70000};
 if(stage==='engineer')return{id:'manor-engineer',title:'The Engineer',kind:'boss',level:15,enemies:[{name:'The Engineer',classification:'boss'}],enemyHealth:4000,scaling:{enemyDamage:.72},mechanicIntervalMs:4200,mechanics:[{name:'Rebuild Nail Guns',type:'adds',duration:900,addCount:2,addName:'Nail Gun Turret',addGroup:'nail-guns',maxActive:2,healthScale:.13,damageScale:.32,targeting:'random',attackRange:35,attackName:'Nail Burst',overclockOnCap:1.08,overclockAbility:'Overclock'},{name:'Nail Storm',type:'line',duration:1900}],phases:[{id:'nail70',name:'Nail Storm · 70%',atPct:70,triggerMechanic:{name:'Nail Storm',type:'line',duration:1800}},{id:'nail40',name:'Nail Storm · 40%',atPct:40,triggerMechanic:{name:'Nail Storm',type:'line',duration:1600}},{id:'nail15',name:'Nail Storm · 15%',atPct:15,triggerMechanic:{name:'Nail Storm',type:'line',duration:1400}}],hardEnrageMs:105000};
 if(stage==='bedroom')return{id:'manor-bedroom',title:'The Bedroom',kind:'event',level:15,enemies:Array.from({length:20},(_,i)=>({name:'Manor Thrall '+(i+1),classification:'trash',priority:i<4?2:1})),enemyHealth:140,scaling:{enemyDamage:.40},mechanics:[],hardEnrageMs:95000};
 if(stage==='housebound')return{id:'manor-master',title:'The Master of the Manor',kind:'final',level:15,enemies:[{name:'The Master of the Manor',classification:'boss'}],enemyHealth:5000,scaling:{enemyDamage:.68},mechanicIntervalMs:5200,mechanics:[{name:'Shattered Floor',type:'persistent-circle',duration:1500,persistMs:7000,tickMs:1200,tickDamage:4,radius:9},{name:"Servant's Screech",type:'interaction',duration:900,interaction:'manor-screech',interactionDurationMs:4500},{name:'Nail Gun',type:'adds',duration:900,addCount:1,addName:'Nail Gun Turret',addGroup:'master-turret',maxActive:1,healthScale:.10,damageScale:.25,targeting:'random',attackRange:35,attackName:'Nail Burst'}],phases:[{id:'standing',name:'The Master Rises',atPct:60,damageScale:1.04,addMechanics:[{name:'Mark of the Manor',type:'tank-mark',duration:1000,damageTakenPerStack:.15,swapAt:3,markDuration:22000},{name:'Chosen Servant',type:'target-circle',duration:1850,radius:11}]},{id:'collapse',name:'House Collapses',atPct:30,damageScale:1.08,arenaBounds:{left:20,right:80,top:18,bottom:82},addMechanics:[{name:'Falling Beam',type:'line',duration:1500},{name:'Fire Floor',type:'persistent-circle',duration:1500,persistMs:8000,tickMs:1100,tickDamage:5,radius:10}],wipeAfterMs:20000,wipeAbility:'BURN THE HOUSE'}],hardEnrageMs:150000};
 return null
}
function maidEncounter(side){
 return{id:'manor-maid-'+side,title:'The Maid',kind:'boss',level:15,enemies:[{name:'The Maid',classification:'boss'}],enemyHealth:2500,scaling:{enemyDamage:.72},mechanicIntervalMs:4400,mechanics:[{name:'Screech',type:'interaction',duration:900,interaction:'manor-screech',interactionDurationMs:4500},{name:'Silver Tray',type:'cone',duration:1500},{name:'Healer Swipe',type:'healer-swipe',duration:1400,status:{id:'maid-gash',name:'Maid Gash',duration:5000,effect:{incomingDamageTaken:.08}}}],hardEnrageMs:85000}
}
function combatFor(stage,side=null){
 const E=combatEngine();if(!E?.simulate||!session)return null;
 const key=session.id+':'+stage+':'+(side===null?'raid':side);
 if(combatCache.has(key))return combatCache.get(key);
 const p=stage==='maids'?engineParty(side):engineParty(null),enc=stage==='maids'?maidEncounter(side):manorEncounter(stage);
 if(!p.length||!enc)return null;
 try{
   const result=E.simulate({party:p,encounter:enc,seed:key,maxDurationMs:180000},{zone:'manor-raid'});
   const pack={result,party:p,encounter:enc};combatCache.set(key,pack);return pack
 }catch(error){console.warn('Manor shared combat simulation failed',stage,error);return null}
}
function hpPctAt(result,elapsed,targetId,fallback=100){
 let hp=fallback;
 for(const ev of result?.events||[]){
   if(Number(ev.timestamp)>elapsed)break;
   if(ev.target===targetId&&Number.isFinite(Number(ev.payload?.targetHpPct)))hp=Number(ev.payload.targetHpPct);
   if((ev.type==='PLAYER_DEFEATED'||ev.type==='ENEMY_DEFEATED')&&ev.target===targetId)hp=0
 }
 return Math.max(0,Math.min(100,hp))
}
function combatBossHp(stage,elapsed){const pack=combatFor(stage);return pack?hpPctAt(pack.result,elapsed,'e-0',100):null}
function combatPlayerHp(ch,elapsed){
 if(!session)return null;
 const side=Number(ch?.partyIndex)||0,stage=session.stage,pack=stage==='maids'?combatFor('maids',side):combatFor(stage);
 if(!pack)return null;
 const id='p-'+(stage==='maids'?'maid-':'raid-')+side+'-'+String(ch?.id||ch?.name||'character');
 let hp=hpPctAt(pack.result,elapsed,id,100);
 if(stage==='maids'){const penalty=Number(session.state?.[side===0?'maidPenaltyA':'maidPenaltyB'])||0;hp=Math.max(0,hp-penalty*2.5)}
 if(stage==='housebound'&&masterBuffRemaining())hp=Math.max(0,hp-4);
 return hp
}
function maidBossHp(side,elapsed,penalty){
 const pack=combatFor('maids',side);if(!pack)return null;
 const base=hpPctAt(pack.result,elapsed,'e-0',100),duration=Math.max(1,Number(pack.result.durationMs)||30000);
 if(elapsed<=duration)return Math.min(100,base+penalty*15);
 return Math.max(0,penalty*15-((elapsed-duration)/duration)*100)
}
function stageCombatDuration(stage){
 if(stage==='maids'){const a=combatFor('maids',0)?.result?.durationMs||0,b=combatFor('maids',1)?.result?.durationMs||0;return Math.max(STAGE_MIN_MS.maids,a,b)}
 return Math.max(STAGE_MIN_MS[stage]||0,Number(combatFor(stage)?.result?.durationMs)||Number(STAGES[stage]?.duration)||0)
}
function bedroomRemaining(elapsed){
 const result=combatFor('bedroom')?.result;if(!result)return 20;
 const dead=(result.events||[]).filter(ev=>ev.type==='ENEMY_DEFEATED'&&Number(ev.timestamp)<=elapsed).length;
 return Math.max(0,20-dead)
}
function combatCallout(stage,elapsed){
 const pack=combatFor(stage);if(!pack)return null;let last=null;
 for(const ev of pack.result.events||[]){if(Number(ev.timestamp)>elapsed)break;if(['MECHANIC_TELEGRAPH','PHASE_CHANGE','ADD_OVERCLOCKED','CAST_START'].includes(ev.type))last=ev}
 return last
}
async function failRaid(reason='The raid was defeated'){
 if(!session||session.status!=='active')return;
 if(isLeader()){
   const {error}=await db.rpc('fail_manor_raid',{p_session_id:session.id,p_reason:reason});
   if(error){console.warn('Could not resolve Manor wipe',error);return}
 }
 await loadSession(session.id).catch(()=>{});
 await syncSharedRaidView(true)
}
function applyLocalRaidFailureShock(){
 const s=state();if(!s||!session?.id)return;
 s.raidFailureShock=s.raidFailureShock&&typeof s.raidFailureShock==='object'?s.raidFailureShock:{};
 if(s.raidFailureShock[session.id])return;
 s.raidFailureShock[session.id]=true;Game.applyPartyCellShock?.();Game.save?.();Game.persistState?.()
}
function groupMembers(id){return members.filter(m=>m.listing_id===id)}
function myMembership(){return members.find(m=>m.user_id===user?.id)}
function isLeader(){return Boolean(session&&session.leader_id===user?.id)}
function formatReset(v){
 const ms=Math.max(0,stamp(v)-now()),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);
 return h>24?Math.floor(h/24)+'d '+(h%24)+'h':h+'h '+m+'m';
}
function roleSummary(rows){
 const counts={tank:0,healer:0,dps:0};
 rows.flatMap(x=>Array.isArray(x.party_snapshot)?x.party_snapshot:[]).forEach(c=>counts[c.role]===undefined?counts.dps++:counts[c.role]++);
 return counts;
}
function compositionClass(rows){
 const c=roleSummary(rows);return c.tank>=2&&c.healer>=2&&c.dps>=6?'recommended':'custom'
}
async function syncParty(listingId){
 if(!partyReady())throw new Error('Build a complete available five-character party first.');
 const {error}=await db.rpc('sync_party_finder_party',{p_listing_id:listingId,p_party_snapshot:snapshot(),p_party_ilvl:Number(Game.partyItemLevel?.())||0});
 if(error)throw error;
}
async function fetchHub(){
 if(!db||!user)return;
 try{
   const {data:l}=await db.rpc('manor_lockout_status');lockout=l||null;
   const {data:g,error:ge}=await db.from('party_finder_listings').select('*').eq('content_type','raid').eq('target_id','manor').in('status',['open','full']).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(30);
   if(ge)throw ge;groups=g||[];
   members=[];
   if(groups.length){
     const {data:m,error:me}=await db.from('party_finder_members').select('listing_id,user_id,guild_label,party_ilvl,joined_at,party_snapshot').in('listing_id',groups.map(x=>x.id)).order('joined_at',{ascending:true});
     if(me)throw me;members=m||[];
   }
   const mine=myMembership();myGroup=mine?groups.find(g=>g.id===mine.listing_id)||null:null;session=null;pendingRewardSession=null;
   if(myGroup){
     const {data:s}=await db.from('raid_sessions').select('*').eq('listing_id',myGroup.id).order('started_at',{ascending:false}).limit(1);
     session=s?.[0]||null;
     if(myGroup&&(!Array.isArray(mine?.party_snapshot)||mine.party_snapshot.length!==5)&&partyReady())syncParty(myGroup.id).catch(()=>{});
   }
   const {data:completed,error:completedError}=await db.from('raid_sessions').select('*').eq('raid_id','manor').eq('status','completed').order('completed_at',{ascending:false}).limit(12);
   if(completedError)throw completedError;
   const localClaims=state()?.raidRewardClaims&&typeof state().raidRewardClaims==='object'?state().raidRewardClaims:{};
   pendingRewardSession=(completed||[]).find(s=>!localClaims[s.id])||null;
   renderHub();
 }catch(e){renderError(e)}
}
function renderError(e){
 if(!mount)return;mount.innerHTML='<section class="mr-card mr-error"><small>THE MANOR</small><h3>Raid service unavailable</h3><p>'+esc(e?.message||'Could not load the raid service.')+'</p><button data-mr-refresh>TRY AGAIN</button></section>';
 mount.querySelector('[data-mr-refresh]')?.addEventListener('click',fetchHub)
}
function raidHeader(){
 const used=Number(lockout?.runsUsed)||0,remain=Math.max(0,Number(lockout?.runsRemaining??3));
 return '<section class="mr-hero"><div class="mr-hero-copy"><small>10-CHARACTER RAID · 2 PLAYERS</small><h2>The Manor</h2><p>Silas is dead. The black iron key turns anyway. Ten Cellbound cross the threshold to face what he woke inside.</p><div class="mr-tags"><span>2 PLAYERS</span><span>10 CHARACTERS</span><span>TIER 5</span><span>2 ITEMS EACH</span></div></div><div class="mr-lockout"><small>RAID WINDOW</small><strong>'+remain+' / 3</strong><span>runs remaining</span><em>'+(lockout?.resetAt?'Reset in '+formatReset(lockout.resetAt):'48-hour reset')+'</em><i>'+used+' used this window</i></div></section>';
}
function encounterStrip(){
 return '<div class="mr-route"><span><b>01</b>Butler</span><i>›</i><span><b>02</b>Maids</span><i>›</i><span><b>03</b>Engineer</span><i>›</i><span><b>04</b>Bedroom</span><i>›</i><span class="final"><b>05</b>Master</span></div>'
}
function renderHub(){
 if(!mount)return;
 if(!unlocked()){
   mount.innerHTML='<section class="mr-locked"><div class="mr-door">⚿</div><small>RAID · LOCKED</small><h2>The Manor</h2><p>The Manor cannot be entered yet. Complete <b>No Way Back</b>, recover the Manor Key and finish the raid attunement.</p><button data-mr-quests>OPEN QUEST JOURNAL →</button></section>';
   mount.querySelector('[data-mr-quests]')?.addEventListener('click',()=>Game.switchView?.('quests'));return
 }
 const mine=myMembership(),mineRows=myGroup?groupMembers(myGroup.id):[],comp=roleSummary(mineRows),recommended=compositionClass(mineRows)==='recommended';
 let body='';
 if(session?.status==='active'){
   body='<section class="mr-card mr-current"><div><small>RAID IN PROGRESS</small><h3>'+esc(stageName(session.stage))+'</h3><p>Combat Reborn is resolving the ten-character fight inside the Manor.</p></div><button data-mr-enter>ENTER RAID →</button></section>';
 }else if(session?.status==='failed'){
   const leader=myGroup?.leader_id===user.id,count=mineRows.length,canRetry=leader&&count===2&&Number(lockout?.runsRemaining??0)>0;
   body='<section class="mr-card mr-current mr-failed"><div><small>RAID WIPE</small><h3>'+esc(session.state?.failureReason||'The Manor claimed the raid')+'</h3><p>This run has ended. The temporary raid group will close so both commanders can form a fresh team for the next attempt.</p></div><div class="mr-current-actions">'+(canRetry?'<button data-mr-rerun>TRY THE MANOR AGAIN →</button>':'<span>'+(leader?'No runs remain this reset.':'Raid group closing…')+'</span>')+'</div></section>';
 }else if(session?.status==='completed'){
   const claimed=Boolean(state()?.raidRewardClaims?.[session.id]),leader=myGroup?.leader_id===user.id,count=mineRows.length,canRerun=claimed&&leader&&count===2&&Number(lockout?.runsRemaining??0)>0;
   const followup=canRerun?'<button data-mr-rerun>RUN THE MANOR AGAIN →</button>':(!leader&&count===2&&Number(lockout?.runsRemaining??0)>0?'<span>Waiting for the group leader to begin another run.</span>':'');
   body='<section class="mr-card mr-current victory"><div><small>THE MANOR · CLEARED</small><h3>The Master of the Manor has fallen</h3><p>'+(claimed?'Your Tier 5 rewards are secured in the Guild Bank.':'Two personal Tier 5 items are waiting for you.')+'</p></div><div class="mr-current-actions"><button data-mr-loot>'+(claimed?'VIEW CLEAR →':'COLLECT 2 RAID ITEMS →')+'</button>'+followup+'</div></section>';
 }else if(myGroup){
   const leader=myGroup.leader_id===user.id,count=mineRows.length;
   body='<section class="mr-card mr-group"><header><div><small>YOUR RAID GROUP</small><h3>'+esc(myGroup.guild_label)+' · '+count+'/2 players</h3></div><span class="'+(count===2?'ready':'waiting')+'">'+(count===2?'READY':'WAITING')+'</span></header>'+
   '<div class="mr-group-parties">'+mineRows.map((m,i)=>partyPanel(m,i)).join('')+(count<2?'<div class="mr-empty-party"><b>PARTY B</b><span>Waiting for another player…</span></div>':'')+'</div>'+
   '<div class="mr-comp '+(recommended?'recommended':'custom')+'"><b>Raid composition</b><span>'+comp.tank+' Tanks · '+comp.healer+' Healers · '+comp.dps+' Damage</span><em>'+(recommended?'RECOMMENDED 2 / 2 / 6':'CUSTOM COMPOSITION ALLOWED')+'</em></div>'+
   '<footer><button class="secondary" data-mr-sync>LOCK IN CURRENT PARTY</button><button class="secondary" data-mr-leave>'+(leader?'CLOSE GROUP':'LEAVE GROUP')+'</button>'+(leader&&count===2?'<button data-mr-start>ENTER THE MANOR →</button>':'')+(count===2&&!leader?'<span>Waiting for the group leader to open the Manor.</span>':'')+'</footer></section>';
 }else{
   const open=groups.filter(g=>groupMembers(g.id).length<2);
   body='<section class="mr-card mr-finder"><header><div><small>RAID FINDER</small><h3>Form a two-player raid</h3><p>Each player brings their active five-character party. 2 Tanks / 2 Healers / 6 Damage is recommended, not required.</p></div><button data-mr-create '+(partyReady()&&Number(lockout?.runsRemaining??3)>0?'':'disabled')+'>CREATE RAID GROUP</button></header>'+
   '<div class="mr-list">'+(open.length?open.map(g=>finderRow(g)).join(''):'<div class="mr-empty-list">No open Manor groups right now. Create one and another player can join you here.</div>')+'</div></section>';
 }
 const pendingLoot=pendingRewardSession
   ?'<section class="mr-card mr-current victory mr-pending-loot"><div><small>UNCLAIMED MANOR REWARD</small><h3>Your previous raid group has been released</h3><p>Your two Tier 5 items are still waiting. You can claim them without rejoining the old team.</p></div><div class="mr-current-actions"><button data-mr-pending-loot="'+pendingRewardSession.id+'">COLLECT 2 RAID ITEMS →</button></div></section>'
   :'';
 mount.innerHTML=raidHeader()+encounterStrip()+pendingLoot+body+'<section class="mr-card mr-loot-preview"><div><small>RAID REWARD</small><h3>Tier 5 equipment</h3><p>The Manor is the only source of Chapter 1 Tier 5 gear. Every clear awards <b>2 personal items per player</b>.</p></div><span class="mr-t5-frame">T5</span><div><b>ORANGE RAID FRAME</b><span>4 rolled stats · raid set pieces · iLvl up to 50</span></div></section>';
 bindHub();
}
function partyPanel(m,i){
 const snap=Array.isArray(m.party_snapshot)?m.party_snapshot:[];
 return '<div class="mr-party-panel"><small>PARTY '+(i?'B':'A')+' · '+esc(m.guild_label)+'</small><div>'+snap.map(ch=>mini(ch)).join('')+'</div><span>iLvl '+Number(m.party_ilvl||0).toFixed(1)+'</span></div>'
}
function mini(ch){
 const color=CLASS_COLORS[ch.class]||'#81aaa3',p=window.CellboundPortraits?.portraitHTML?.(ch,{size:'sm'})||'<b>'+esc((ch.name||'?').slice(0,2).toUpperCase())+'</b>';
 return '<span class="mr-mini" style="--class:'+color+'" title="'+esc(ch.name+' · '+ch.class+' · '+ch.role)+'">'+p+'<i>'+esc((ch.role||'dps').slice(0,1).toUpperCase())+'</i></span>'
}
function finderRow(g){
 const rows=groupMembers(g.id);
 return '<article><div><b>'+esc(g.guild_label)+'</b><span>Party iLvl '+Number(g.party_ilvl||0).toFixed(1)+' · '+rows.length+'/2 players</span></div><button data-mr-join="'+g.id+'" '+(partyReady()&&Number(lockout?.runsRemaining??3)>0?'':'disabled')+'>JOIN</button></article>'
}
function bindHub(){
 mount.querySelector('[data-mr-create]')?.addEventListener('click',createGroup);
 mount.querySelectorAll('[data-mr-join]').forEach(b=>b.addEventListener('click',()=>joinGroup(b.dataset.mrJoin)));
 mount.querySelector('[data-mr-sync]')?.addEventListener('click',async()=>{try{await syncParty(myGroup.id);await fetchHub()}catch(e){alert(e.message)}});
 mount.querySelector('[data-mr-leave]')?.addEventListener('click',leaveGroup);
 mount.querySelector('[data-mr-start]')?.addEventListener('click',startRaid);
 mount.querySelector('[data-mr-enter]')?.addEventListener('click',()=>openRaid(session.id));
 mount.querySelector('[data-mr-loot]')?.addEventListener('click',()=>session?.status==='completed'?showVictory(session.id):null);
 mount.querySelector('[data-mr-pending-loot]')?.addEventListener('click',e=>showVictory(e.currentTarget.dataset.mrPendingLoot));
 mount.querySelector('[data-mr-rerun]')?.addEventListener('click',startRaid)
}
async function createGroup(){
 try{
   if(!partyReady())throw new Error('Build a complete available five-character party first.');
   const {data,error}=await db.rpc('create_party_finder_listing',{p_content_type:'raid',p_target_id:'manor',p_target_label:'The Manor',p_note:'First raid · 10 characters',p_party_ilvl:Number(Game.partyItemLevel?.())||0,p_player_cap:2});
   if(error)throw error;await syncParty(data);await fetchHub()
 }catch(e){alert(e.message||'Could not create raid group')}
}
async function joinGroup(id){
 try{
   if(!partyReady())throw new Error('Build a complete available five-character party first.');
   const {error}=await db.rpc('join_party_finder_listing',{p_listing_id:id,p_party_ilvl:Number(Game.partyItemLevel?.())||0});if(error)throw error;
   await syncParty(id);await fetchHub()
 }catch(e){alert(e.message||'Could not join raid group')}
}
async function leaveGroup(){
 if(!myGroup)return;const {error}=await db.rpc('leave_party_finder_listing',{p_listing_id:myGroup.id});
 if(error){alert(error.message);return}await fetchHub()
}
async function startRaid(){
 try{
   await syncParty(myGroup.id);
   const {data,error}=await db.rpc('start_manor_raid',{p_listing_id:myGroup.id});if(error)throw error;
   await fetchHub();await openRaid(data)
 }catch(e){alert(e.message||'The Manor could not be started')}
}
function ensureOverlay(){
 let root=$('#manorRaidOverlay');if(root)return root;
 root=document.createElement('div');root.id='manorRaidOverlay';root.className='mr-overlay';root.hidden=true;document.body.appendChild(root);return root
}

function readyStartAt(){return stamp(session?.state?.encounterStartAt)}
function encounterIsLive(){const start=readyStartAt();return Boolean(start&&serverNow()>=start)}
function readyState(){
 return{
  a:Boolean(session?.state?.readyA),
  b:Boolean(session?.state?.readyB),
  stage:String(session?.state?.readyStage||session?.stage||''),
  startAt:readyStartAt()
 }
}
function clearReadyLaunch(){if(readyLaunchTimer){clearTimeout(readyLaunchTimer);readyLaunchTimer=null}}
function scheduleReadyLaunch(){
 clearReadyLaunch();
 const start=readyStartAt();if(!start)return;
 const delay=Math.max(0,start-serverNow());
 readyLaunchTimer=setTimeout(()=>{readyLaunchTimer=null;syncSharedRaidView(true)},delay+20)
}
function commanderLabel(side){
 const rows=memberRows();return rows[side]?.guild_label||('Party '+(side===0?'A':'B'))
}
async function setRaidReady(next){
 if(!session?.id)return;
 try{
   const sentAt=Date.now();
   const {data,error}=await db.rpc('manor_set_ready',{p_session_id:session.id,p_ready:Boolean(next)});
   const receivedAt=Date.now();
   if(error)throw error;
   if(data?.serverNow)syncServerClock(data.serverNow,Math.round((sentAt+receivedAt)/2));
   if(data?.state)session={...session,state:data.state,updated_at:new Date(serverNow()).toISOString()};
   renderReadyGate();scheduleReadyLaunch()
 }catch(error){alert(error.message||'Could not update raid ready state')}
}
function renderReadyGate(){
 if(!session||session.status!=='active'||encounterIsLive())return;
 window.CellboundDungeon2D?.closeShared?.(true);
 const root=ensureOverlay();root.hidden=false;document.body.classList.add('mr-open');
 const ready=readyState(),mine=myRaidSide(),mineReady=mine===0?ready.a:ready.b,otherReady=mine===0?ready.b:ready.a;
 const remaining=ready.startAt?Math.max(0,ready.startAt-serverNow()):0;
 const count=ready.startAt?Math.max(1,Math.ceil(remaining/1000)):null;
 const countdown=ready.startAt
   ?'<div class="mr-ready-count"><small>BOTH COMMANDERS READY</small><strong>'+(remaining<=80?'GO':count)+'</strong><span>Entering '+esc(stageName(session.stage))+' together</span></div>'
   :'<div class="mr-ready-wait"><small>READY CHECK</small><h1>'+esc(stageName(session.stage))+'</h1><p>Both commanders must be ready before combat begins.</p></div>';
 const renderKey=[session.stage,ready.a,ready.b,ready.startAt?count:'wait',mineReady,otherReady].join('|');
 if(!root.hidden&&root.dataset.readyKey===renderKey)return;
 root.dataset.readyKey=renderKey;
 root.innerHTML='<section class="mr-ready-shell"><header><div><small>THE MANOR · SYNCHRONISED RAID</small><h2>'+esc(stageRoom(session.stage))+'</h2></div><button data-ready-close>×</button></header>'+
  countdown+
  '<div class="mr-ready-teams"><article class="'+(ready.a?'is-ready':'')+'"><i>PARTY A</i><b>'+esc(commanderLabel(0))+'</b><span>'+(ready.a?'READY ✓':'NOT READY')+'</span></article>'+
  '<article class="'+(ready.b?'is-ready':'')+'"><i>PARTY B</i><b>'+esc(commanderLabel(1))+'</b><span>'+(ready.b?'READY ✓':'NOT READY')+'</span></article></div>'+
  (ready.startAt?'':'<button class="mr-ready-button '+(mineReady?'is-ready':'')+'" data-raid-ready="'+(!mineReady)+'">'+(mineReady?'READY ✓ · CANCEL':'READY UP')+'</button>')+
  (!ready.startAt&&mineReady&&!otherReady?'<p class="mr-ready-status">Waiting for the other commander…</p>':'')+
  '<footer><span>Both clients use the same server start timestamp.</span><b>3 SECOND COUNTDOWN</b></footer></section>';
 root.querySelector('[data-ready-close]')?.addEventListener('click',()=>closeRaid());
 root.querySelector('[data-raid-ready]')?.addEventListener('click',e=>setRaidReady(e.currentTarget.dataset.raidReady==='true'));
 if(ready.startAt){
   if(remaining<=80){scheduleReadyLaunch()}
 }
}
async function subscribeRaidRealtime(id){
 if(!db?.channel)return;
 if(raidRealtime){try{await db.removeChannel(raidRealtime)}catch(_){}raidRealtime=null}
 raidRealtime=db.channel('manor-session-'+id)
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'raid_sessions',filter:'id=eq.'+id},payload=>{
    const incoming=payload?.new;if(!incoming||incoming.id!==id)return;
    const beforeStage=session?.stage,beforeStatus=session?.status,beforeStart=readyStartAt(),beforeState=JSON.stringify(session?.state||{});
    session=incoming;
    const changedStage=beforeStage!==session.stage||beforeStatus!==session.status;
    const changedStart=beforeStart!==readyStartAt();
    if(changedStage||changedStart){sharedStageKey='';syncSharedRaidView(true);return}
    if(!encounterIsLive())renderReadyGate();
    else if(beforeState!==JSON.stringify(session.state||{})){
      // Screech penalties and other shared raid state are now available immediately.
      if(session.stage==='maids')window.dispatchEvent(new CustomEvent('cellbound:manor-sync',{detail:{state:session.state}}))
    }
  })
  .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Manor realtime status',status)})
}
async function unsubscribeRaidRealtime(){
 if(!raidRealtime||!db)return;
 const channel=raidRealtime;raidRealtime=null;
 try{await db.removeChannel(channel)}catch(error){console.warn('Could not remove Manor realtime channel',error)}
}
function ensureScreechHost(){
 let host=$('#mrScreechHost');
 // The old raid renderer could leave this host inside the hidden Manor overlay.
 // Raid interactions must always sit above the active shared CB2D combat viewer.
 if(host&&host.parentElement!==document.body){host.remove();host=null}
 if(!host){host=document.createElement('div');host.id='mrScreechHost';host.className='mr-screech-host';document.body.appendChild(host)}
 host.hidden=false;return host
}
function myRaidSide(){
 const rows=memberRows(),index=rows.findIndex(m=>m.user_id===user?.id);
 return index<0?0:index
}
function sharedRaidRoute(){
 return[
   {id:'butler',title:'The Butler'},
   {id:'maids',title:'The Maids'},
   {id:'engineer',title:'The Engineer'},
   {id:'bedroom',title:'Bedroom'},
   {id:'housebound',title:'The Master'}
 ]
}
function sharedStagePack(){
 if(!session||!['butler','maids','engineer','bedroom','housebound'].includes(session.stage))return null;
 const side=session.stage==='maids'?myRaidSide():null;
 return session.stage==='maids'?combatFor('maids',side):combatFor(session.stage)
}
async function syncSharedRaidView(force=false){
 if(!session)return;
 if(session.status==='active'&&!encounterIsLive()){
   sharedStageKey='';renderReadyGate();scheduleReadyLaunch();return
 }
 if(session.status==='failed'){
   window.CellboundDungeon2D?.closeShared?.(true);
   const root=ensureOverlay();root.hidden=false;document.body.classList.add('mr-open');renderWipeShell();return
 }
 if(session.status==='completed'||session.stage==='victory'){
   window.CellboundDungeon2D?.closeShared?.(true);
   const root=ensureOverlay();root.hidden=false;document.body.classList.add('mr-open');renderVictoryShell();return
 }
 const pack=sharedStagePack();if(!pack)return;
 const side=session.stage==='maids'?myRaidSide():null,key=session.id+':'+session.stage+':'+(side===null?'raid':side);
 if(!force&&sharedStageKey===key)return;
 sharedStageKey=key;lastStage=session.stage;lastScreechAt=0;screechOpen=false;
 const overlay=$('#manorRaidOverlay');if(overlay)overlay.hidden=true;document.body.classList.remove('mr-open');
 ensureScreechHost().innerHTML='';
 const viewer=window.CellboundDungeon2D;
 if(!viewer?.playSharedEncounter){console.error('The shared CB2D combat viewer is unavailable');return}
 const room=session.stage==='maids'?(side===0?'Dining Room':'Kitchen'):stageRoom(session.stage);
 viewer.playSharedEncounter({
   party:pack.party,encounter:pack.encounter,result:pack.result,
   startAt:readyStartAt()||stamp(session?.state?.stageStartedAt),
   header:'THE MANOR · '+String(room).toUpperCase()+' · LIVE 2D RAID',
   title:session.stage==='maids'?'The Maid':stageName(session.stage),
   route:sharedRaidRoute(),currentId:session.stage,theme:'manor',room:'manor-'+session.stage,
   roomLabel:room,ambience:session.stage==='maids'?'Your five-character party is separated from the other commander. Screech links both rooms.':'The raid fights together as one ten-character group.',
   shellClass:'cb2d-manor-raid',arenaClass:'cb2d-manor-arena',
   planTitle:'The Manor uses the same combat system as every dungeon.',
   planCopy:'Combat Reborn controls movement, threat, resources, healing, interrupts, deaths and boss mechanics. Raid-only interactions are layered over the same event stream.',
   onEvent:handleRaidCombatEvent,
   onClose:()=>closeRaid(true)
 }).catch(error=>console.error('Manor shared viewer failed',error))
}
async function pollRaidSession(id){
 try{
   const beforeStage=session?.stage,beforeStatus=session?.status,beforeUpdated=session?.updated_at,beforeStart=readyStartAt();
   await loadSession(id);
   if(session?.stage!==beforeStage||session?.status!==beforeStatus||readyStartAt()!==beforeStart)await syncSharedRaidView(true);
   else if(session?.updated_at!==beforeUpdated&&!encounterIsLive())renderReadyGate()
 }catch(error){console.warn('Manor session refresh failed',error)}
}
async function loadSession(id){
 const {data:s,error}=await db.from('raid_sessions').select('*').eq('id',id).maybeSingle();if(error)throw error;session=s;
 if(!session)return;
 const {data:m}=await db.from('party_finder_members').select('listing_id,user_id,guild_label,party_ilvl,joined_at,party_snapshot').eq('listing_id',session.listing_id).order('joined_at',{ascending:true});
 members=m||members;
}
async function openRaid(id){
 try{await loadSession(id)}catch(e){alert(e.message);return}
 sharedStageKey='';lastStage='';lastScreechAt=0;screechOpen=false;closingRaid=false;
 clearInterval(raidTimer);clearInterval(paintTimer);clearReadyLaunch();
 await subscribeRaidRealtime(id);
 await syncSharedRaidView(true);
 raidTimer=setInterval(()=>pollRaidSession(id),2500);
 paintTimer=setInterval(tickRaid,100);
 tickRaid()
}
function closeRaid(fromShared=false){
 if(closingRaid)return;closingRaid=true;
 clearInterval(raidTimer);clearInterval(paintTimer);raidTimer=paintTimer=null;screechOpen=false;sharedStageKey='';clearReadyLaunch();
 unsubscribeRaidRealtime();
 const host=$('#mrScreechHost');if(host)host.innerHTML='';
 if(!fromShared)window.CellboundDungeon2D?.closeShared?.(true);
 const root=$('#manorRaidOverlay');if(root){root.hidden=true;delete root.dataset.readyKey;}
 document.body.classList.remove('mr-open');fetchHub();
 setTimeout(()=>{closingRaid=false},0)
}
function stageName(id){return id==='maids'?'The Maids':id==='housebound'?'The Master of the Manor':id==='bedroom'?'The Bedroom':id==='victory'?'Raid Complete':STAGES[id]?.name||'The Manor'}
function stageRoom(id){return id==='maids'?'Dining Room / Kitchen':id==='victory'?'The Attic':STAGES[id]?.room||'The Manor'}
function stageElapsed(){return Math.max(0,serverNow()-stamp(session?.state?.stageStartedAt))}
function memberRows(){return groupMembers(session?.listing_id).sort((a,b)=>stamp(a.joined_at)-stamp(b.joined_at))}
function allRaidChars(){return memberRows().flatMap((m,pi)=>(Array.isArray(m.party_snapshot)?m.party_snapshot:[]).map((c,ci)=>({...c,partyIndex:pi,charIndex:ci})))}
function renderRaidShell(){
 const root=ensureOverlay();if(!session)return;
 if(session.status==='failed'){renderWipeShell();return}
 if(session.status==='completed'||session.stage==='victory'){renderVictoryShell();return}
 root.innerHTML='<section class="mr-raid-shell"><header class="mr-raid-head"><div><small>THE MANOR · '+esc(stageRoom(session.stage).toUpperCase())+'</small><h2>'+esc(stageName(session.stage))+'</h2></div><div class="mr-raid-head-center"><span>COMBAT REBORN</span><b>10 CHARACTERS · '+memberRows().length+'/2 COMMANDERS</b></div><button data-mr-close>×</button></header>'+
 '<div class="mr-stage-tabs">'+['butler','maids','engineer','bedroom','housebound'].map((x,i)=>'<span class="'+(x===session.stage?'active':'')+'"><i>'+(i+1)+'</i>'+stageName(x)+'</span>').join('')+'</div>'+
 '<div id="mrArenaHost"></div><aside class="mr-raid-side"><div id="mrMechanics"></div><div id="mrRaidRoster"></div></aside><div id="mrScreechHost"></div></section>';
 root.querySelector('[data-mr-close]')?.addEventListener('click',closeRaid);lastStage=session.stage
}
function tickRaid(){
 if(!session)return;
 if(session.status==='failed'||session.status==='completed'||session.stage==='victory')return;
 if(!encounterIsLive()){renderReadyGate();return}
 const e=stageElapsed();
 if(isLeader()){
   if(session.stage==='maids')driveMaids(e);
   else driveStage(e)
 }
 // Safety fallback only. Normal Screech timing now comes directly from the
 // Combat Reborn INTERACTION_REQUIRED event in the shared viewer.
 if(!screechOpen&&lastScreechAt===0){
   const ownCount=Number(session?.state?.[isLeader()?'screechCountA':'screechCountB'])||0;
   if(session.stage==='maids'&&ownCount<1&&e>=16000)openScreech({fallback:true});
   else if(session.stage==='housebound'&&e>=22000)openScreech({fallback:true})
 }
}
function handleRaidCombatEvent(event){
 if(!event||event.type!=='INTERACTION_REQUIRED')return;
 if(String(event.payload?.interaction||'')!=='manor-screech')return;
 if(!['maids','housebound'].includes(session?.stage))return;
 openScreech({event})
}
function bossHp(stage,e){
 const engineHp=combatBossHp(stage,e);if(engineHp!==null)return engineHp;
 const d=STAGES[stage]?.duration||1;return Math.max(0,100-(e/d)*100)
}
function paintStage(e){
 const arena=$('#mrArenaHost'),mech=$('#mrMechanics'),roster=$('#mrRaidRoster');if(!arena||!mech||!roster)return;
 if(session.stage==='maids'){paintMaids(arena,mech,roster,e);return}
 if(session.stage==='bedroom'){paintBedroom(arena,mech,roster,e);return}
 const hp=bossHp(session.stage,e),chars=allRaidChars(),phase=session.stage==='housebound'?(hp>60?1:hp>30?2:3):1,call=combatCallout(session.stage,e);
 arena.innerHTML='<div class="mr-arena stage-'+session.stage+' phase-'+phase+'">'+arenaDecor(session.stage,e)+'<div class="mr-boss"><span class="mr-boss-icon">'+bossIcon(session.stage)+'</span><b>'+esc(stageName(session.stage))+'</b><div class="mr-boss-hp"><i style="width:'+hp.toFixed(1)+'%"></i></div><small>'+Math.ceil(hp)+'%</small></div><div class="mr-units">'+chars.map((ch,i)=>unit(ch,i,e)).join('')+'</div>'+stageCallout(session.stage,e,call)+'</div>';
 mech.innerHTML=mechanicsMarkup(session.stage,e,phase)+(call?'<div class="mr-engine-event"><small>ENGINE EVENT</small><b>'+esc(call.ability||call.payload?.name||call.type)+'</b><span>'+Math.round((Number(call.timestamp)||0)/100)/10+'s</span></div>':'');
 roster.innerHTML=raidRosterMarkup(chars,e)
}
function bossIcon(stage){return stage==='butler'?'♜':stage==='engineer'?'⚙':stage==='bedroom'?'☗':'◈'}
function unit(c,i,e){
 const color=CLASS_COLORS[c.class]||'#81aaa3',p=window.CellboundPortraits?.portraitHTML?.(c,{size:'sm'})||'<b>'+esc((c.name||'?').slice(0,2).toUpperCase())+'</b>';
 const engineHp=combatPlayerHp(c,e),danger=engineHp===null?90:engineHp;
 const hp=session.stage==='housebound'?bossHp('housebound',e):100,chosen=session.stage==='housebound'&&hp<=60&&hp>30&&i===Math.floor(e/6500)%10;
 return '<div class="mr-unit u'+i+' '+(chosen?'chosen':'')+'" style="--class:'+color+'"><div class="mr-unit-pic">'+p+'</div><span>'+esc(c.name)+'</span><div class="mr-unit-hp"><i style="width:'+Math.max(0,danger)+'%"></i></div></div>'
}
function paintBedroom(arena,mech,roster,e){
 const remaining=bedroomRemaining(e),chars=allRaidChars(),result=combatFor('bedroom')?.result;
 arena.innerHTML='<div class="mr-arena stage-bedroom"><div class="mr-trash">'+Array.from({length:remaining},(_,i)=>'<i class="m'+i+'">◆</i>').join('')+'</div><div class="mr-bedroom-counter"><small>BEDROOM SWARM</small><strong>'+remaining+'</strong><span>ENEMIES REMAIN</span></div><div class="mr-units">'+chars.map((ch,i)=>unit(ch,i,e)).join('')+'</div><div class="mr-cast trash">CLEAR THE ROOM <span>'+remaining+' / 20 REMAIN</span></div></div>';
 mech.innerHTML='<section class="mr-mechanic-card"><small>COMBAT REBORN · TRASH PULL</small><h3>BEDROOM SWARM</h3><p>Twenty real enemies are active in the combat engine at once. Tanks gather them, healers stabilise the raid and damage burns the room down.</p><span>'+(result?'Engine outcome: '+String(result.outcome).toUpperCase()+' · '+Math.round(result.durationMs/1000)+'s simulation':'Preparing combat simulation…')+'</span></section>';
 roster.innerHTML=raidRosterMarkup(chars,e)
}
function raidRosterMarkup(chars,e){
 const rows=memberRows();
 return '<small>RAID ROSTER</small><div class="mr-roster-grid">'+rows.map((m,i)=>'<section><b>PARTY '+(i?'B':'A')+' · '+esc(m.guild_label)+'</b>'+((m.party_snapshot||[]).map(ch=>{const view={...ch,partyIndex:i},hp=combatPlayerHp(view,e);return'<span style="--class:'+(CLASS_COLORS[ch.class]||'#8aa')+'"><i></i>'+esc(ch.name)+'<em>'+esc(ch.role||'dps')+(hp!==null?' · '+Math.round(hp)+'%':'')+'</em></span>'}).join(''))+'</section>').join('')+'</div>'
}
function arenaDecor(stage,e){
 if(stage==='butler'){
   const pts=[[15,22],[72,18],[42,64],[80,70],[25,76],[58,35],[10,58],[68,82]];
   const n=Math.min(pts.length,1+Math.floor(e/4500));
   return '<div class="mr-plates">'+pts.slice(0,n).map((p,i)=>'<i style="left:'+p[0]+'%;top:'+p[1]+'%;opacity:'+(i<Math.max(0,n-5)?.18:.76)+'"></i>').join('')+'</div>'
 }
 if(stage==='engineer')return '<div class="mr-turret t1">⌁<span>NAIL GUN</span></div><div class="mr-turret t2">⌁<span>NAIL GUN</span></div>';
 if(stage==='bedroom')return '<div class="mr-trash">'+Array.from({length:20},(_,i)=>'<i class="m'+i+'">◆</i>').join('')+'</div>';
 if(stage==='housebound'){
   const hp=bossHp(stage,e),turret=hp>60||hp<=30?'<div class="mr-turret master-turret">⌁<span>NAIL GUN</span></div>':'';
   return '<div class="mr-collapse"><i></i><i></i><i></i><i></i></div>'+turret
 }
 return''
}
function stageCallout(stage,e,engineEvent=null){
 if(engineEvent?.type==='PHASE_CHANGE')return'<div class="mr-cast phase-call">'+esc(engineEvent.ability||'PHASE CHANGE')+' <span>'+Math.round(Number(engineEvent.payload?.healthPct)||0)+'%</span></div>';
 if(engineEvent?.type==='ADD_OVERCLOCKED')return'<div class="mr-cast">OVERCLOCK <span>DESTROY TURRETS</span></div>';
 if(stage==='butler')return'<div class="mr-cast">PLATE BARRAGE <span>MOVE · OLD HAZARDS FADE</span></div>';
 if(stage==='engineer'){const hp=bossHp(stage,e);if([70,40,15].some(x=>Math.abs(hp-x)<5))return'<div class="mr-cast">NAIL STORM <span>FIND THE SAFE LANE</span></div>';return'<div class="mr-cast">REBUILD <span>KEEP TWO TURRETS UNDER CONTROL</span></div>'}
 if(stage==='housebound'){const hp=bossHp(stage,e);if(hp<=10)return'<div class="mr-cast burn">BURN THE HOUSE <span>20s · UNINTERRUPTIBLE</span></div>';if(hp<=30)return'<div class="mr-cast">HOUSE COLLAPSES <span>SHRINKING ARENA · SCREECH · TURRETS</span></div>';if(hp<=60)return Math.floor(e/6500)%2?'<div class="mr-cast">CHOSEN SERVANT <span>SPREAD</span></div>':'<div class="mr-cast">MARK OF THE MANOR <span>TANK SWAP</span></div>';return Math.floor(e/7000)%2?'<div class="mr-cast">SERVANT\'S SCREECH <span>READ THE WORD</span></div>':'<div class="mr-cast">SHATTERED FLOOR <span>MOVE</span></div>'}
 return''
}
function masterBuffRemaining(){
 const until=stamp(session?.state?.masterDamageBuffUntil),left=Math.max(0,until-now());
 return left>0?Math.ceil(left/1000):0
}
function mechanicsMarkup(stage,e,phase){
 const data={
  butler:['PLATE BARRAGE','The Butler smashes plate zones across the hall. Standing in a shattered zone deals damage over time; older zones disappear as new ones are created.','The Butler moves slowly and never performs normal attacks — the room itself is the threat.'],
  engineer:['NAIL GUN TURRETS','Two fragile turrets stay active, lock random characters and deal constant damage. Destroy them quickly; Rebuild replaces destroyed guns and Overclock punishes leaving both alive.','Nail Storm fires at 70%, 40% and 15% with lane-shaped safe gaps.'],
  bedroom:['BEDROOM SWARM','Twenty enemies rush the raid at once. No puzzle — group them, control them and burn them down.','When all twenty fall, the attic hatch drops open.'],
  housebound:['THE MASTER OF THE MANOR',phase===1?'Shattered Floor returns. Servant’s Screech punishes bad reads, and one Nail Gun Turret forces target priority.':phase===2?'At 60%, the Master rises. Mark of the Manor stacks +15% damage taken on the active tank; swap threat while Chosen Servant forces a spread.':'At 30%, the house collapses around the raid: shrinking space, beams, fire, turrets, Marks and Screech. At ~10%, BURN THE HOUSE begins a 20-second uninterruptible raid-kill cast.','Silas did not return to rule this house. He returned to wake its true master.']
 }[stage]||['THE MANOR','',''];
 const buff=stage==='housebound'&&masterBuffRemaining()?'<strong class="mr-master-buff">SCREECH FAILURE · MASTER +10% DAMAGE · '+masterBuffRemaining()+'s</strong>':'';
 return '<section class="mr-mechanic-card"><small>ACTIVE MECHANIC</small><h3>'+data[0]+'</h3><p>'+data[1]+'</p><span>'+data[2]+'</span>'+buff+'</section>'
}
function paintMaids(arena,mech,roster,e){
 const rows=memberRows(),pa=Number(session.state?.maidPenaltyA)||0,pb=Number(session.state?.maidPenaltyB)||0;
 const ea=maidBossHp(0,e,pa),eb=maidBossHp(1,e,pb),hpA=ea===null?Math.max(0,100-e/1000*2.5+pa*15):ea,hpB=eb===null?Math.max(0,100-e/1000*2.5+pb*15):eb;
 const side=(row,i,hp,penalty)=>{const chars=Array.isArray(row?.party_snapshot)?row.party_snapshot:[];return'<section class="mr-maid-side '+(i?'kitchen':'dining')+'"><header><small>'+(i?'KITCHEN':'DINING ROOM')+'</small><b>'+esc(row?.guild_label||'Party')+'</b></header><div class="mr-maid-boss"><span>♟</span><div><b>The Maid</b><div class="mr-boss-hp"><i style="width:'+Math.min(100,hp)+'%"></i></div><small>'+Math.ceil(hp)+'% HP · +'+(penalty*10)+'% DAMAGE</small></div></div><div class="mr-maid-units">'+chars.map((ch,x)=>unit({...ch,partyIndex:i},x+i*5,e)).join('')+'</div></section>'};
 arena.innerHTML='<div class="mr-arena mr-maids">'+side(rows[0],0,hpA,pa)+side(rows[1],1,hpB,pb)+'</div>';
 mech.innerHTML='<section class="mr-mechanic-card"><small>COMBAT REBORN · LINKED ENCOUNTER</small><h3>SCREECH</h3><p>Each Maid runs her own five-character combat simulation: threat, tanking, healer swipes, damage and healing are real. A failed Screech heals the <b>other player’s Maid for 15%</b> and gives her <b>+10% damage</b>.</p><span>Failures stack until that Maid dies. Both players must resolve at least one Screech.</span></section><div class="mr-linked-stats"><span>PARTY A FAILURES <b>'+pa+'</b></span><span>PARTY B FAILURES <b>'+pb+'</b></span></div>';
 roster.innerHTML='<small>SPLIT RAID</small><p class="mr-split-note">Both five-character parties are fighting at the same time. Your Screech answer can make your partner’s room harder.</p>';
 const aPack=combatFor('maids',0),bPack=combatFor('maids',1),defeat=(aPack?.result?.outcome!=='victory'&&e>=Number(aPack?.result?.durationMs||Infinity))||(bPack?.result?.outcome!=='victory'&&e>=Number(bPack?.result?.durationMs||Infinity));
 if(defeat&&isLeader()){failRaid('The Maids overwhelmed one of the split parties.');return}
 if(isLeader()&&hpA<=0&&hpB<=0)advance('engineer')
}
async function driveMaids(e){
 const pa=Number(session?.state?.maidPenaltyA)||0,pb=Number(session?.state?.maidPenaltyB)||0;
 const aPack=combatFor('maids',0),bPack=combatFor('maids',1);
 const defeated=(aPack?.result?.outcome!=='victory'&&e>=Number(aPack?.result?.durationMs||Infinity))||(bPack?.result?.outcome!=='victory'&&e>=Number(bPack?.result?.durationMs||Infinity));
 if(defeated){await failRaid('The Maids overwhelmed one of the split parties.');return}
 const hpA=maidBossHp(0,e,pa),hpB=maidBossHp(1,e,pb);
 const countA=Number(session?.state?.screechCountA)||0,countB=Number(session?.state?.screechCountB)||0;
 if(hpA!==null&&hpB!==null&&hpA<=0&&hpB<=0&&countA>0&&countB>0)await advance('engineer')
}
async function driveStage(e){
 if(advancing||session.stage==='maids')return;
 const stage=session.stage,pack=combatFor(stage),result=pack?.result;
 if(result){
   if(result.outcome!=='victory'&&e>=Number(result.durationMs||0)){await failRaid(stageName(stage)+' defeated the raid.');return}
   if(result.outcome==='victory'&&e>=stageCombatDuration(stage)){await advance(STAGES[stage]?.next);return}
 }
 const d=STAGES[stage];if(!pack&&d&&e>=d.duration)await advance(d.next)
}
async function advance(next){
 if(advancing||!session)return;advancing=true;
 try{
   const patch=next==='maids'?{maidPenaltyA:0,maidPenaltyB:0,screechCountA:0,screechCountB:0,screechSuccessA:0,screechSuccessB:0}:{};
   const {data,error}=await db.rpc('advance_manor_raid',{p_session_id:session.id,p_expected_stage:session.stage,p_next_stage:next,p_patch:patch});
   if(error)throw error;if(data?.state)session.state=data.state;if(data?.stage)session.stage=data.stage;if(data?.status)session.status=data.status;
   lastStage='';sharedStageKey='';await loadSession(session.id);await syncSharedRaidView(true)
 }catch(e){console.warn('Manor advance',e)}finally{advancing=false}
}
function openScreech(trigger={}){
 if(screechOpen||!['maids','housebound'].includes(session?.stage))return;
 screechOpen=true;lastScreechAt=now();
 const host=ensureScreechHost(),event=trigger?.event;
 const target=SCREECH_COLOURS[Math.floor(Math.random()*SCREECH_COLOURS.length)];
 const display=SCREECH_COLOURS.filter(x=>x.name!==target.name)[Math.floor(Math.random()*4)];
 const shuffled=[...SCREECH_COLOURS].sort(()=>Math.random()-.5);
 const promptMs=Math.max(2500,Number(event?.payload?.durationMs)||4500);
 let answered=false,deadline=now()+promptMs;
 const master=session.stage==='housebound';
 host.innerHTML='<div class="mr-screech"><small>'+(master?'THE MASTER CALLS A SERVANT':'THE MAID CASTS')+'</small><h3>'+(master?"SERVANT'S SCREECH":'SCREECH')+'</h3><p>PRESS THE COLOUR THE <b>WORD SAYS</b></p><strong style="color:'+display.hex+'">'+target.name+'</strong><div>'+shuffled.map(x=>'<button data-colour="'+x.name+'" style="--c:'+x.hex+'">'+x.name+'</button>').join('')+'</div><span data-screech-time>'+(promptMs/1000).toFixed(1)+'</span></div>';
 const finish=async success=>{
   if(answered)return;answered=true;clearInterval(clock);
   const master=session.stage==='housebound';
   host.innerHTML='<div class="mr-screech-result '+(success?'ok':'fail')+'"><b>'+(success?'SCREECH RESISTED':'SCREECH FAILED')+'</b><span>'+(success?(master?'The Master gains nothing.':'Your room stays stable.'):(master?'The Master gains +10% damage for 20 seconds.':'The other Maid heals 15% and gains +10% damage.'))+'</span></div>';
   const {error}=await db.rpc('manor_screech_result',{p_session_id:session.id,p_success:success});if(error)console.warn(error);
   await loadSession(session.id).catch(()=>{});setTimeout(()=>{host.innerHTML='';screechOpen=false},1200)
 };
 host.querySelectorAll('[data-colour]').forEach(b=>b.onclick=()=>finish(b.dataset.colour===target.name));
 const clock=setInterval(()=>{const left=Math.max(0,deadline-now()),el=host.querySelector('[data-screech-time]');if(el)el.textContent=(left/1000).toFixed(1);if(left<=0)finish(false)},100)
}
function renderWipeShell(){
 const root=ensureOverlay();applyLocalRaidFailureShock();
 root.innerHTML='<section class="mr-raid-shell mr-wipe-shell"><header class="mr-raid-head"><div><small>THE MANOR · RAID WIPE</small><h2>'+esc(stageName(session.stage))+'</h2></div><button data-mr-close>×</button></header><div class="mr-wipe"><span>☠</span><small>COMBAT REBORN RESULT</small><h1>The Manor Claims Another Raid</h1><p>'+esc(session.state?.failureReason||'The ten-character raid was defeated.')+'</p><button data-mr-wipe-close>RETURN TO RAID HUB →</button></div></section>';
 root.querySelector('[data-mr-close]')?.addEventListener('click',closeRaid);root.querySelector('[data-mr-wipe-close]')?.addEventListener('click',closeRaid);lastStage='failed'
}
function renderVictoryShell(){
 const root=ensureOverlay(),claimed=Boolean(state()?.raidRewardClaims?.[session.id]);
 root.innerHTML='<section class="mr-raid-shell mr-victory-shell"><header class="mr-raid-head"><div><small>THE MANOR · THE ATTIC</small><h2>Raid Complete</h2></div><button data-mr-close>×</button></header><div class="mr-victory-art"><span>◈</span><small>THE HOUSE FALLS SILENT</small><h1>The Master of the Manor</h1><p>The creature collapses into the attic floorboards. Every door below unlocks at once.</p></div><div class="mr-victory-loot"><small>PERSONAL RAID LOOT</small><h2>2 × Tier 5 Items</h2><p>Orange-framed Chapter 1 raid equipment. Four rolled stats with Tier 5 raid-set progression.</p><button data-mr-claim '+(claimed?'disabled':'')+'>'+(claimed?'REWARDS SECURED':'REVEAL RAID LOOT →')+'</button><div id="mrLootDrops"></div></div></section>';
 root.querySelector('[data-mr-close]')?.addEventListener('click',closeRaid);
 root.querySelector('[data-mr-claim]')?.addEventListener('click',()=>claimLoot(session.id))
}
async function showVictory(id){await loadSession(id);const root=ensureOverlay();root.hidden=false;document.body.classList.add('mr-open');renderVictoryShell()}
async function claimLoot(id){
 const btn=$('[data-mr-claim]');if(btn)btn.disabled=true;
 try{
   const s=state();s.raidRewardClaims=s.raidRewardClaims&&typeof s.raidRewardClaims==='object'?s.raidRewardClaims:{};
   if(s.raidRewardClaims[id]){renderLootDrops(s.raidRewardClaims[id]);return}
   const {data,error}=await db.rpc('claim_manor_raid_rewards',{p_session_id:id});if(error)throw error;
   const defs=Array.isArray(data)?data:[],items=defs.map((d,i)=>makeTier5Item(d,i));
   items.forEach(x=>Game.addBankItem?.(x));
   s.raidRewardClaims[id]=items.map(x=>({itemId:x.itemId,name:x.name,tier:x.tier,itemLevel:x.itemLevel,class:x.class,slot:x.slot,bonusStats:x.bonusStats,setId:x.setId,setName:x.setName,source:x.source}));
   s.activity=Array.isArray(s.activity)?s.activity:[];s.activity.push('The Manor cleared. Two Tier 5 raid items were secured.');
   Game.save?.();await Game.persistState?.();Game.renderAll?.();renderLootDrops(s.raidRewardClaims[id]);if(btn)btn.textContent='REWARDS SECURED'
 }catch(e){if(btn)btn.disabled=false;alert(e.message||'Could not claim raid loot')}
}
function slug(v){return String(v||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function makeTier5Item(def,i){
 const G=window.CellboundGear,klass=def.class||'Warrior',slot=def.slot||'Chest';
 const base=G?.items?.find(x=>x.class===klass&&x.slot===slot&&Number(x.tier)===4)||G?.items?.find(x=>x.slot===slot&&Number(x.tier)===4)||{};
 const setName=SET_NAMES[klass]||'Housebound Regalia',ilvl=Number(G?.ITEM_LEVELS?.[slot]?.[4])||46;
 const raw={...base,itemId:'manor-t5-'+slug(klass)+'-'+slug(slot)+'-'+Date.now().toString(36)+'-'+i,name:setName+' '+slot,class:klass,slot,tier:5,tierLabel:'Tier 5',rarity:'Epic',itemLevel:ilvl,power:Math.max(Number(base.power)||0,Math.round(ilvl*.55)),source:'The Manor · Master of the Manor',raidExclusive:true,nonStackable:true,tradeState:'bound',appearanceId:base.appearanceId||base.itemId};
 return G?.rollItemAffixes?G.rollItemAffixes(raw):raw
}
function renderLootDrops(items){
 const host=$('#mrLootDrops');if(!host)return;const G=window.CellboundGear;
 host.innerHTML='<div class="mr-loot-grid">'+(items||[]).map(item=>'<article class="mr-t5-drop"><div>'+((G?.artHTML?.(item,78))||'<span>◇</span>')+'</div><small>TIER 5 · iLvl '+esc(item.itemLevel)+'</small><h3>'+esc(item.name)+'</h3><p>'+esc(item.class)+' · '+esc(item.slot)+'</p><div>'+((G?.statLines?.(item)||[]).map(s=>'<span>'+esc(s.text)+'</span>').join(''))+'</div></article>').join('')+'</div>'
}
function bindView(){
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='raids')fetchHub()});
 window.addEventListener('cellbound:no-way-back-update',fetchHub);
}
async function init(){
 Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}
 db=Game.getSupabase?.();user=Game.getUser?.();mount=$('#manorRaidMount');if(!db||!user||!mount)return;
 bindView();await fetchHub();clearInterval(hubTimer);hubTimer=setInterval(()=>{if(document.querySelector('#raids.view.active'))fetchHub()},5000);
 window.CellboundManorRaid={refresh:fetchHub,open:openRaid,syncPartyToListing:syncParty,snapshot}
}
init()
})();