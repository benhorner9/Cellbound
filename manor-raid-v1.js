(()=>{
'use strict';
window.CellboundCombatStandard?.register?.('manor',{kind:'raid',execution:'local-coop',ui:'shared-cb2d'});
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
let Game=null,db=null,user=null,mount=null,groups=[],members=[],lockout=null,myGroup=null,session=null;
let hubTimer=null,raidTimer=null,paintTimer=null,advancing=false,lastStage='',lastScreechAt=0,screechOpen=false;
const combatCache=new Map();
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const roleOf=c=>Game?.classes?.[c?.class]?.specs?.[c?.spec]?.role||c?.role||'dps';
const partyReady=()=>party().length===5&&!party().some(c=>Game?.isUnavailable?.(c));
const unlocked=()=>Boolean(state()?.progression?.manorRaidUnlocked);
const now=()=>Date.now();
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
   const mine=myMembership();myGroup=mine?groups.find(g=>g.id===mine.listing_id)||null:null;session=null;
   if(myGroup){
     const {data:s}=await db.from('raid_sessions').select('*').eq('listing_id',myGroup.id).in('status',['active','completed']).order('started_at',{ascending:false}).limit(1);
     session=s?.[0]||null;
     if(myGroup&&(!Array.isArray(mine?.party_snapshot)||mine.party_snapshot.length!==5)&&partyReady())syncParty(myGroup.id).catch(()=>{});
   }
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
   body='<section class="mr-card mr-current"><div><small>RAID IN PROGRESS</small><h3>'+esc(stageName(session.stage))+'</h3><p>Your 10-character raid is already inside the Manor.</p></div><button data-mr-enter>ENTER RAID →</button></section>';
 }else if(session?.status==='completed'){
   const claimed=Boolean(state()?.raidRewardClaims?.[session.id]),leader=myGroup?.leader_id===user.id,count=mineRows.length,canRerun=claimed&&leader&&count===2&&Number(lockout?.runsRemaining??0)>0;
   body='<section class="mr-card mr-current victory"><div><small>THE MANOR · CLEARED</small><h3>The Master of the Manor has fallen</h3><p>'+(claimed?'Your Tier 5 rewards are secured in the Guild Bank.':'Two personal Tier 5 items are waiting for you.')+'</p></div><div class="mr-current-actions"><button data-mr-loot>'+(claimed?'VIEW CLEAR →':'COLLECT 2 RAID ITEMS →')+'</button>'+(canRerun?'<button data-mr-rerun>RUN THE MANOR AGAIN →</button>':(!leader&&count===2&&Number(lockout?.runsRemaining??0)>0?'<span>Waiting for the group leader to begin another run.</span>':'')+'</div></section>';
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
 mount.innerHTML=raidHeader()+encounterStrip()+body+'<section class="mr-card mr-loot-preview"><div><small>RAID REWARD</small><h3>Tier 5 equipment</h3><p>The Manor is the only source of Chapter 1 Tier 5 gear. Every clear awards <b>2 personal items per player</b>.</p></div><span class="mr-t5-frame">T5</span><div><b>ORANGE RAID FRAME</b><span>4 rolled stats · raid set pieces · iLvl up to 50</span></div></section>';
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
async function loadSession(id){
 const {data:s,error}=await db.from('raid_sessions').select('*').eq('id',id).maybeSingle();if(error)throw error;session=s;
 if(!session)return;
 const {data:m}=await db.from('party_finder_members').select('listing_id,user_id,guild_label,party_ilvl,joined_at,party_snapshot').eq('listing_id',session.listing_id).order('joined_at',{ascending:true});
 members=m||members;
}
async function openRaid(id){
 try{await loadSession(id)}catch(e){alert(e.message);return}
 const root=ensureOverlay();root.hidden=false;document.body.classList.add('mr-open');lastStage='';lastScreechAt=0;screechOpen=false;
 renderRaidShell();clearInterval(raidTimer);clearInterval(paintTimer);
 raidTimer=setInterval(()=>loadSession(id).then(()=>{if(session?.status==='completed'){renderRaidShell();clearInterval(raidTimer)}}).catch(()=>{}),1300);
 paintTimer=setInterval(tickRaid,180);tickRaid()
}
function closeRaid(){
 clearInterval(raidTimer);clearInterval(paintTimer);raidTimer=paintTimer=null;screechOpen=false;
 const root=$('#manorRaidOverlay');if(root)root.hidden=true;document.body.classList.remove('mr-open');fetchHub()
}
function stageName(id){return id==='maids'?'The Maids':id==='housebound'?'The Master of the Manor':id==='bedroom'?'The Bedroom':id==='victory'?'Raid Complete':STAGES[id]?.name||'The Manor'}
function stageRoom(id){return id==='maids'?'Dining Room / Kitchen':id==='victory'?'The Attic':STAGES[id]?.room||'The Manor'}
function stageElapsed(){return Math.max(0,now()-stamp(session?.state?.stageStartedAt))}
function memberRows(){return groupMembers(session?.listing_id).sort((a,b)=>stamp(a.joined_at)-stamp(b.joined_at))}
function allRaidChars(){return memberRows().flatMap((m,pi)=>(Array.isArray(m.party_snapshot)?m.party_snapshot:[]).map((c,ci)=>({...c,partyIndex:pi,charIndex:ci})))}
function renderRaidShell(){
 const root=ensureOverlay();if(!session)return;
 if(session.status==='completed'||session.stage==='victory'){renderVictoryShell();return}
 root.innerHTML='<section class="mr-raid-shell"><header class="mr-raid-head"><div><small>THE MANOR · '+esc(stageRoom(session.stage).toUpperCase())+'</small><h2>'+esc(stageName(session.stage))+'</h2></div><div class="mr-raid-head-center"><span>10-CHARACTER RAID</span><b>'+memberRows().length+'/2 COMMANDERS</b></div><button data-mr-close>×</button></header>'+
 '<div class="mr-stage-tabs">'+['butler','maids','engineer','bedroom','housebound'].map((x,i)=>'<span class="'+(x===session.stage?'active':'')+'"><i>'+(i+1)+'</i>'+stageName(x)+'</span>').join('')+'</div>'+
 '<div id="mrArenaHost"></div><aside class="mr-raid-side"><div id="mrMechanics"></div><div id="mrRaidRoster"></div></aside>'+
 '<div id="mrScreechHost"></div></section>';
 root.querySelector('[data-mr-close]')?.addEventListener('click',closeRaid);
 lastStage=session.stage
}
function tickRaid(){
 if(!session)return;
 if(session.status==='completed'||session.stage==='victory'){if(lastStage!=='victory')renderRaidShell();return}
 if(lastStage!==session.stage){lastScreechAt=0;screechOpen=false;renderRaidShell()}
 const e=stageElapsed();paintStage(e);if(isLeader())driveStage(e);
 if(session.stage==='maids'&&e>7000&&!screechOpen&&e-lastScreechAt>10500)openScreech()
}
function bossHp(stage,e){
 const d=STAGES[stage]?.duration||1;
 if(stage==='housebound'){
   if(e<30000)return Math.max(60,100-(e/30000)*40);
   if(e<58000)return Math.max(30,60-((e-30000)/28000)*30);
   if(e<80000)return Math.max(10,30-((e-58000)/22000)*20);
   return Math.max(0,10-((e-80000)/20000)*10)
 }
 return Math.max(0,100-(e/d)*100)
}
function paintStage(e){
 const arena=$('#mrArenaHost'),mech=$('#mrMechanics'),roster=$('#mrRaidRoster');if(!arena||!mech||!roster)return;
 if(session.stage==='maids'){paintMaids(arena,mech,roster,e);return}
 const hp=bossHp(session.stage,e),chars=allRaidChars(),phase=session.stage==='housebound'?(hp>60?1:hp>30?2:3):1;
 arena.innerHTML='<div class="mr-arena stage-'+session.stage+' phase-'+phase+'">'+arenaDecor(session.stage,e)+'<div class="mr-boss"><span class="mr-boss-icon">'+bossIcon(session.stage)+'</span><b>'+esc(stageName(session.stage))+'</b><div class="mr-boss-hp"><i style="width:'+hp.toFixed(1)+'%"></i></div><small>'+Math.ceil(hp)+'%</small></div><div class="mr-units">'+chars.map((c,i)=>unit(c,i,e)).join('')+'</div>'+stageCallout(session.stage,e)+'</div>';
 mech.innerHTML=mechanicsMarkup(session.stage,e,phase);
 roster.innerHTML='<small>RAID ROSTER</small><div class="mr-roster-grid">'+memberRows().map((m,i)=>'<section><b>PARTY '+(i?'B':'A')+' · '+esc(m.guild_label)+'</b>'+((m.party_snapshot||[]).map(ch=>'<span style="--class:'+(CLASS_COLORS[ch.class]||'#8aa')+'"><i></i>'+esc(ch.name)+'<em>'+esc(ch.role||'dps')+'</em></span>').join(''))+'</section>').join('')+'</div>'
}
function bossIcon(stage){return stage==='butler'?'♜':stage==='engineer'?'⚙':stage==='bedroom'?'☗':'◈'}
function unit(c,i,e){
 const color=CLASS_COLORS[c.class]||'#81aaa3',p=window.CellboundPortraits?.portraitHTML?.(c,{size:'sm'})||'<b>'+esc((c.name||'?').slice(0,2).toUpperCase())+'</b>';
 const danger=session.stage==='housebound'?Math.max(48,88-((i*7+Math.floor(e/1100)*5)%38)):session.stage==='engineer'&&i%4===Math.floor(e/5000)%4?62:90;
 return '<div class="mr-unit u'+i+'" style="--class:'+color+'"><div class="mr-unit-pic">'+p+'</div><span>'+esc(c.name)+'</span><div class="mr-unit-hp"><i style="width:'+danger+'%"></i></div></div>'
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
function stageCallout(stage,e){
 if(stage==='butler'&&Math.floor(e/5500)%2===1)return'<div class="mr-cast">SMASHED PLATES <span>MOVE</span></div>';
 if(stage==='engineer'){
   const hp=bossHp(stage,e),storm=[70,40,15].some(x=>Math.abs(hp-x)<6);
   if(storm)return'<div class="mr-cast">NAIL STORM <span>FIND THE SAFE LANE</span></div>';
   if(Math.floor(e/7000)%2===1)return'<div class="mr-cast">OVERCLOCK <span>DESTROY TURRETS</span></div>';
   return'<div class="mr-cast">REBUILD <span>TURRETS RETURN</span></div>'
 }
 if(stage==='bedroom')return'<div class="mr-cast trash">CLEAR THE ROOM <span>20 ENEMIES</span></div>';
 if(stage==='housebound'){
   const hp=bossHp(stage,e);
   if(hp<=10)return'<div class="mr-cast burn">BURN THE HOUSE <span>'+Math.max(0,Math.ceil((100000-e)/1000))+'s · UNINTERRUPTIBLE</span></div>';
   if(hp<=30)return'<div class="mr-cast">HOUSE COLLAPSES <span>SHRINKING ARENA · SCREECH · TURRETS</span></div>';
   if(hp<=60)return Math.floor(e/6500)%2?'<div class="mr-cast">CHOSEN SERVANT <span>SPREAD</span></div>':'<div class="mr-cast">MARK OF THE MANOR <span>TANK SWAP</span></div>';
   return Math.floor(e/7000)%2?'<div class="mr-cast">SERVANT\'S SCREECH <span>READ THE WORD</span></div>':'<div class="mr-cast">SHATTERED FLOOR <span>MOVE</span></div>'
 }
 return''
}
function mechanicsMarkup(stage,e,phase){
 const data={
  butler:['PLATE BARRAGE','The Butler smashes plate zones across the hall. Standing in a shattered zone deals damage over time; older zones disappear as new ones are created.','The Butler moves slowly and never performs normal attacks — the room itself is the threat.'],
  engineer:['NAIL GUN TURRETS','Two fragile turrets stay active, lock random characters and deal constant damage. Destroy them quickly; Rebuild replaces destroyed guns and Overclock punishes leaving both alive.','Nail Storm fires at 70%, 40% and 15% with lane-shaped safe gaps.'],
  bedroom:['BEDROOM SWARM','Twenty enemies rush the raid at once. No puzzle — group them, control them and burn them down.','When all twenty fall, the attic hatch drops open.'],
  housebound:['THE MASTER OF THE MANOR',phase===1?'Shattered Floor returns. Servant’s Screech punishes bad reads, and one Nail Gun Turret forces target priority.':phase===2?'At 60%, the Master rises. Mark of the Manor stacks +15% damage taken on the active tank; swap threat while Chosen Servant forces a spread.':'At 30%, the house collapses around the raid: shrinking space, beams, fire, turrets, Marks and Screech. At ~10%, BURN THE HOUSE begins a 20-second uninterruptible raid-kill cast.','Silas did not return to rule this house. He returned to wake its true master.']
 }[stage]||['THE MANOR','',''];
 return '<section class="mr-mechanic-card"><small>ACTIVE MECHANIC</small><h3>'+data[0]+'</h3><p>'+data[1]+'</p><span>'+data[2]+'</span></section>'
}
function paintMaids(arena,mech,roster,e){
 const rows=memberRows(),pa=Number(session.state?.maidPenaltyA)||0,pb=Number(session.state?.maidPenaltyB)||0;
 const hpA=Math.max(0,100-e/1000*2.5+pa*15),hpB=Math.max(0,100-e/1000*2.5+pb*15);
 const side=(row,i,hp,penalty)=>{
  const chars=Array.isArray(row?.party_snapshot)?row.party_snapshot:[];
  return '<section class="mr-maid-side '+(i?'kitchen':'dining')+'"><header><small>'+(i?'KITCHEN':'DINING ROOM')+'</small><b>'+esc(row?.guild_label||'Party')+'</b></header><div class="mr-maid-boss"><span>♟</span><div><b>The Maid</b><div class="mr-boss-hp"><i style="width:'+Math.min(100,hp)+'%"></i></div><small>'+Math.ceil(hp)+'% HP · +'+(penalty*10)+'% DAMAGE</small></div></div><div class="mr-maid-units">'+chars.map((c,x)=>unit(c,x+i*5,e)).join('')+'</div></section>'
 };
 arena.innerHTML='<div class="mr-arena mr-maids">'+side(rows[0],0,hpA,pa)+side(rows[1],1,hpB,pb)+'</div>';
 mech.innerHTML='<section class="mr-mechanic-card"><small>LINKED ENCOUNTER</small><h3>SCREECH</h3><p>Each Maid hard-focuses the highest-threat target and periodically swipes a random healer. Read the Screech word — not the colour it is painted. A wrong answer or timeout heals the <b>other player’s Maid for 15%</b> and gives her <b>+10% damage</b>.</p><span>Failures stack until that Maid dies.</span></section><div class="mr-linked-stats"><span>PARTY A FAILURES <b>'+pa+'</b></span><span>PARTY B FAILURES <b>'+pb+'</b></span></div>';
 roster.innerHTML='<small>SPLIT RAID</small><p class="mr-split-note">Both five-character parties are fighting at the same time. Your Screech answer can make your partner’s room harder.</p>';
 if(isLeader()&&hpA<=0&&hpB<=0)advance('engineer')
}
async function driveStage(e){
 if(advancing||session.stage==='maids')return;
 const d=STAGES[session.stage];if(d&&e>=d.duration)await advance(d.next)
}
async function advance(next){
 if(advancing||!session)return;advancing=true;
 try{
   const patch=next==='maids'?{maidPenaltyA:0,maidPenaltyB:0,screechCountA:0,screechCountB:0,screechSuccessA:0,screechSuccessB:0}:{};
   const {data,error}=await db.rpc('advance_manor_raid',{p_session_id:session.id,p_expected_stage:session.stage,p_next_stage:next,p_patch:patch});
   if(error)throw error;if(data?.state)session.state=data.state;if(data?.stage)session.stage=data.stage;if(data?.status)session.status=data.status;
   lastStage='';if(next==='victory'){await loadSession(session.id);renderRaidShell()}
 }catch(e){console.warn('Manor advance',e)}finally{advancing=false}
}
function openScreech(){
 if(screechOpen||session?.stage!=='maids')return;screechOpen=true;lastScreechAt=stageElapsed();
 const host=$('#mrScreechHost');if(!host){screechOpen=false;return}
 const target=SCREECH_COLOURS[Math.floor(Math.random()*SCREECH_COLOURS.length)];
 const display=SCREECH_COLOURS.filter(x=>x.name!==target.name)[Math.floor(Math.random()*4)];
 const shuffled=[...SCREECH_COLOURS].sort(()=>Math.random()-.5);
 let answered=false,deadline=now()+4500;
 host.innerHTML='<div class="mr-screech"><small>THE MAID CASTS</small><h3>SCREECH</h3><p>PRESS THE COLOUR THE <b>WORD SAYS</b></p><strong style="color:'+display.hex+'">'+target.name+'</strong><div>'+shuffled.map(x=>'<button data-colour="'+x.name+'" style="--c:'+x.hex+'">'+x.name+'</button>').join('')+'</div><span data-screech-time>4.5</span></div>';
 const finish=async success=>{
   if(answered)return;answered=true;clearInterval(clock);host.innerHTML='<div class="mr-screech-result '+(success?'ok':'fail')+'"><b>'+(success?'SCREECH RESISTED':'SCREECH FAILED')+'</b><span>'+(success?'Your room stays stable.':'The other Maid heals 15% and gains +10% damage.')+'</span></div>';
   const {error}=await db.rpc('manor_screech_result',{p_session_id:session.id,p_success:success});if(error)console.warn(error);
   await loadSession(session.id).catch(()=>{});setTimeout(()=>{host.innerHTML='';screechOpen=false},1200)
 };
 host.querySelectorAll('[data-colour]').forEach(b=>b.onclick=()=>finish(b.dataset.colour===target.name));
 const clock=setInterval(()=>{const left=Math.max(0,deadline-now()),el=host.querySelector('[data-screech-time]');if(el)el.textContent=(left/1000).toFixed(1);if(left<=0)finish(false)},100)
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
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='endgame')fetchHub()});
 window.addEventListener('cellbound:no-way-back-update',fetchHub);
}
async function init(){
 Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}
 db=Game.getSupabase?.();user=Game.getUser?.();mount=$('#manorRaidMount');if(!db||!user||!mount)return;
 bindView();await fetchHub();clearInterval(hubTimer);hubTimer=setInterval(()=>{if(document.querySelector('#endgame.view.active'))fetchHub()},5000);
 window.CellboundManorRaid={refresh:fetchHub,open:openRaid,syncPartyToListing:syncParty,snapshot}
}
init()
})();