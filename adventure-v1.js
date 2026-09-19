(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let Game=null,selectedLocation='zeltira';

const LOCATIONS={
 zeltira:{name:'Zeltira',eyebrow:'GUILD HUB',x:16,y:49,icon:'⌂',desc:'A fortified city built around the old Cell roads. Your guild can trade, craft, take work and follow new leads from here.',unlock:'Open from the end of the tutorial.',links:['east-road','ashen-ridge']},
 'east-road':{name:'East Road',eyebrow:'SURVEY COUNTRY',x:34,y:31,icon:'⌁',desc:'Broken drainage works, abandoned survey camps and old routes lie beneath this road. Bram Kel’s crew found something here that should have stayed buried.',unlock:'Open after the Zeltira tutorial.',links:['zeltira','gloam-marsh','hollow-deep']},
 'ashen-ridge':{name:'Ashen Ridge',eyebrow:'DUNGEON REGION',x:39,y:70,icon:'▲',desc:'A scorched mountain road leads to The Ashen Vault. The region is dangerous, but its old forgeworks still contain valuable reagents and lost caches.',unlock:'Open after the Zeltira tutorial.',links:['zeltira','cell-scar']},
 'gloam-marsh':{name:'Gloam Marsh',eyebrow:'WILDERNESS',x:62,y:24,icon:'♜',desc:'A drowned stretch of old trade road. Strange tracks vanish into black water and Gloamhide is known to surface somewhere in the marsh.',unlock:'Complete 2 world incidents to map a safe route.',links:['east-road','hollow-deep','cell-scar']},
 'hollow-deep':{name:'Hollow Deep',eyebrow:'QUEST DISCOVERY',x:67,y:51,icon:'◆',desc:'Sealed works beneath the eastern road. This region does not appear on modern maps and must be discovered through the Echoes Beneath Zeltira adventure.',unlock:'Complete Echoes Beneath Zeltira.',links:['east-road','gloam-marsh','cell-scar']},
 'cell-scar':{name:'The Cell Scar',eyebrow:'DANGEROUS FRONTIER',x:82,y:73,icon:'✦',desc:'The land itself has split around a violent Cell wound. Powerful enemies and unstable resources gather where the scar reaches the surface.',unlock:'Complete 5 world incidents to establish a route.',links:['ashen-ridge','gloam-marsh','hollow-deep']}
};

const INCIDENTS=[
 {id:'broken-caravan',location:'east-road',title:'The Broken Caravan',tag:'ROAD EVENT',summary:'A merchant wagon lies on its side below the road. One guard is injured and something has dragged the cargo into the reeds.',choices:[
  {id:'rescue',label:'Rescue the Guard',desc:'Stabilise the wounded first, then recover what you can.',base:78,bonus:'healer',success:{gold:35,renown:24,materials:{'faded-cell-fragment':2}},fail:{gold:15,renown:8,shock:3}},
  {id:'track',label:'Track the Cargo',desc:'Follow the drag marks before the trail disappears.',base:60,bonus:'dps',success:{gold:80,renown:12,materials:{'zeltiran-iron':2}},fail:{gold:20,renown:5,shock:6}}
 ]},
 {id:'survey-collapse',location:'east-road',title:'Collapsed Survey Cut',tag:'DISCOVERY',summary:'Fresh subsidence has exposed an old work tunnel. The supports are failing, but survey marks continue deeper inside.',choices:[
  {id:'shore',label:'Shore the Tunnel',desc:'Use trade skills and patience to make the route safe.',base:72,bonus:'Blacksmithing',success:{gold:30,renown:18,materials:{'zeltiran-iron':3}},fail:{gold:10,renown:5,shock:2}},
  {id:'dash',label:'Make a Fast Survey',desc:'Move through before the tunnel settles again.',base:58,bonus:'tank',success:{gold:55,renown:25,materials:{'faded-cell-fragment':2}},fail:{renown:5,shock:7}}
 ]},
 {id:'ash-scavengers',location:'ashen-ridge',title:'Ash Scavenger Camp',tag:'FIELD COMBAT',summary:'Scavengers have built a camp across the safest ridge path. Their packs are full of material stripped from old Warden armour.',choices:[
  {id:'break',label:'Break the Camp',desc:'Hit them hard and take the ridge back.',base:68,bonus:'dps',success:{gold:55,renown:22,materials:{'ashen-soul-fragment':2,'warden-iron':1}},fail:{gold:15,renown:6,shock:7}},
  {id:'outflank',label:'Outflank Them',desc:'Take the upper path and force them to abandon their supplies.',base:82,bonus:'tank',success:{gold:35,renown:16,materials:{'warden-iron':2}},fail:{renown:6,shock:3}}
 ]},
 {id:'ember-vent',location:'ashen-ridge',title:'Unstable Ember Vent',tag:'RESOURCE EVENT',summary:'Heat is bleeding through cracked forge stone. Ember residue is forming around the vent before burning away.',choices:[
  {id:'harvest',label:'Harvest the Vent',desc:'Work close to the heat for a chance at stronger material.',base:55,bonus:'Alchemy',success:{gold:25,renown:10,materials:{'ashen-soul-fragment':3,'ember-core':1}},fail:{materials:{'ashen-soul-fragment':1},shock:6}},
  {id:'cool',label:'Cool the Area',desc:'Make the site safe and collect the stable residue.',base:92,bonus:'healer',success:{gold:20,renown:18,materials:{'ashen-soul-fragment':2}},fail:{renown:5}}
 ]},
 {id:'gloam-tracks',location:'gloam-marsh',title:'Tracks in Black Water',tag:'HUNT',summary:'Something huge crossed the marsh overnight. Smaller creatures are following the same trail and the water is still moving.',choices:[
  {id:'hunt',label:'Follow the Tracks',desc:'Push into the reeds and confront whatever is using the trail.',base:60,bonus:'dps',success:{gold:70,renown:28,materials:{'faded-cell-fragment':3}},fail:{gold:10,renown:5,shock:8}},
  {id:'observe',label:'Observe the Trail',desc:'Map the movement pattern without committing to a fight.',base:96,bonus:'Hunter',success:{gold:20,renown:20,materials:{'faded-cell-fragment':2}},fail:{renown:5}}
 ]},
 {id:'marsh-lanterns',location:'gloam-marsh',title:'Lanterns in the Reeds',tag:'MYSTERY',summary:'Three lights have been appearing in the same flooded field after dusk. Locals insist nobody lives there.',choices:[
  {id:'approach',label:'Approach the Lights',desc:'Take the party in and find the source.',base:63,bonus:'healer',success:{gold:45,renown:30,materials:{'faded-cell-fragment':3}},fail:{renown:8,shock:6}},
  {id:'ward',label:'Mark and Ward the Site',desc:'Keep your distance and leave a safe route for later.',base:90,bonus:'Enchanting',success:{gold:25,renown:18,materials:{'faded-cell-fragment':2}},fail:{renown:5}}
 ]},
 {id:'hollow-echo',location:'hollow-deep',title:'A Voice Behind the Stone',tag:'HOLLOW EVENT',summary:'A sealed side passage is answering footsteps with a second set of footsteps. The rhythm does not match anyone in your party.',choices:[
  {id:'open',label:'Open the Passage',desc:'Break the seal and face whatever is copying you.',base:58,bonus:'tank',success:{gold:80,renown:32,materials:{'void-crystal':1}},fail:{renown:7,shock:9}},
  {id:'listen',label:'Study the Echo',desc:'Use the resonance without opening the chamber.',base:88,bonus:'Enchanting',success:{gold:25,renown:22,materials:{'faded-cell-fragment':3}},fail:{renown:5,shock:2}}
 ]},
 {id:'scar-storm',location:'cell-scar',title:'Cell Storm',tag:'HIGH RISK',summary:'A violent pulse is crawling across the Cell Scar. Raw fragments are appearing in the wake of each surge.',choices:[
  {id:'stabilise',label:'Stabilise the Surge',desc:'Keep the party together and bleed the energy away safely.',base:75,bonus:'healer',success:{gold:40,renown:32,materials:{'ashen-soul-fragment':3}},fail:{renown:8,shock:7}},
  {id:'harvest',label:'Harvest During the Storm',desc:'Stay inside the pulse window for a chance at rare material.',base:45,bonus:'Alchemy',success:{gold:85,renown:25,materials:{'vaultheart-crystal':1,'ashen-soul-fragment':3}},fail:{gold:10,renown:5,shock:12}}
 ]},
 {id:'zeltira-request',location:'zeltira',title:'Warden’s Request',tag:'CITY WORK',summary:'A Zeltiran Warden needs a guild to inspect a Cell-sick storage cellar before the market opens.',choices:[
  {id:'clear',label:'Clear the Cellar',desc:'Take the active five below and remove the threat.',base:84,bonus:'tank',success:{gold:55,renown:18,materials:{'faded-cell-fragment':2}},fail:{gold:15,renown:5,shock:3}},
  {id:'inspect',label:'Inspect the Source',desc:'Find out why the cellar became unstable before fighting anything.',base:90,bonus:'Alchemy',success:{gold:35,renown:22,materials:{'faded-cell-fragment':3}},fail:{renown:5}}
 ]}
];

const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const dateKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function ensure(){
 const s=state();if(!s)return null;
 if(!s.adventureWorld)s.adventureWorld={version:1,currentLocation:'zeltira',discovered:['zeltira','east-road','ashen-ridge'],exploration:{},visits:{},daily:{date:'',completed:{}},totalIncidents:0,cacheClaims:{}};
 const a=s.adventureWorld;
 a.discovered=Array.isArray(a.discovered)?a.discovered:['zeltira','east-road','ashen-ridge'];
 ['zeltira','east-road','ashen-ridge'].forEach(id=>{if(!a.discovered.includes(id))a.discovered.push(id)});
 a.exploration=a.exploration&&typeof a.exploration==='object'?a.exploration:{};
 a.visits=a.visits&&typeof a.visits==='object'?a.visits:{};
 a.cacheClaims=a.cacheClaims&&typeof a.cacheClaims==='object'?a.cacheClaims:{};
 a.totalIncidents=Math.max(0,Number(a.totalIncidents)||0);
 if(s.questSystem?.flags?.hollowSanctumUnlocked&&!a.discovered.includes('hollow-deep'))a.discovered.push('hollow-deep');
 if(a.totalIncidents>=2&&!a.discovered.includes('gloam-marsh'))a.discovered.push('gloam-marsh');
 if(a.totalIncidents>=5&&!a.discovered.includes('cell-scar'))a.discovered.push('cell-scar');
 if(!LOCATIONS[a.currentLocation]||!a.discovered.includes(a.currentLocation))a.currentLocation='zeltira';
 const today=dateKey();if(!a.daily||a.daily.date!==today)a.daily={date:today,completed:{}};
 return a;
}
function isUnlocked(id){return Boolean(ensure()?.discovered?.includes(id))}
function locationProgress(id){return Number(ensure()?.exploration?.[id])||0}
function roleOf(c){return Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps'}
function hasRole(r){return party().some(c=>roleOf(c)===r)}
function hasClass(k){return party().some(c=>String(c.class).toLowerCase()===String(k).toLowerCase())}
function hasProfession(k){return party().some(c=>(c.professions||[]).some(p=>String(p).toLowerCase()===String(k).toLowerCase()))}
function bonusMet(b){if(!b)return false;if(['tank','healer','dps'].includes(b))return hasRole(b);if(['Warrior','Paladin','Priest','Druid','Hunter','Rogue','Mage'].includes(b))return hasClass(b);return hasProfession(b)}
function worldBosses(){return window.CellboundSocial?.getWorldBosses?.()||[]}
function bossRegion(b){return b.id==='gloamhide'?'gloam-marsh':b.id==='hollow-wyrm'?'hollow-deep':b.id==='cell-torn'?'cell-scar':null}
function activeBossForRegion(id){return worldBosses().find(b=>bossRegion(b)===id&&(b.status==='active'||b.status==='in_combat'))}
function todaysIncidents(){
 const a=ensure();if(!a)return[];
 if(Array.isArray(a.daily?.lineup)&&a.daily.lineup.length){
  const saved=a.daily.lineup.map(id=>INCIDENTS.find(x=>x.id===id)).filter(Boolean);
  if(saved.length)return saved;
 }
 const available=INCIDENTS.filter(x=>isUnlocked(x.location));if(!available.length)return[];
 const seed=hash(dateKey()+'|'+(Game.getUser?.()?.id||'guild')+'|cellbound-world');
 const ordered=[...available].sort((x,y)=>hash(x.id+'|'+seed)-hash(y.id+'|'+seed)),chosen=[],regions=new Set();
 for(const item of ordered){if(chosen.length>=3)break;if(!regions.has(item.location)){chosen.push(item);regions.add(item.location)}}
 for(const item of ordered){if(chosen.length>=3)break;if(!chosen.includes(item))chosen.push(item)}
 a.daily.lineup=chosen.map(x=>x.id);Game.save?.();
 return chosen;
}
async function commit(){Game.save?.();await Game.persistState?.();Game.renderAll?.();render()}
function toast(title,text){
 let root=$('#adventureToast');if(!root){root=document.createElement('div');root.id='adventureToast';root.className='adventure-toast';root.hidden=true;document.body.appendChild(root)}
 root.innerHTML='<small>WORLD UPDATED</small><b>'+esc(title)+'</b><span>'+esc(text||'')+'</span>';root.hidden=false;clearTimeout(root._hide);root._hide=setTimeout(()=>root.hidden=true,3400)
}
function travel(id){
 const a=ensure();if(!a||!isUnlocked(id))return;
 const from=a.currentLocation;a.currentLocation=id;selectedLocation=id;a.visits[id]=(Number(a.visits[id])||0)+1;
 if(from!==id)state().activity.push('Your party travelled to '+LOCATIONS[id].name+'.');
 Game.save?.();render();toast('Arrived at '+LOCATIONS[id].name,LOCATIONS[id].desc)
}
function openView(id){Game.switchView?.(id)}
function scrollBosses(){document.getElementById('worldBossSection')?.scrollIntoView({behavior:'smooth',block:'start'})}
function locationActions(id){
 if(!isUnlocked(id))return '<button disabled>'+esc(LOCATIONS[id].unlock)+'</button>';
 if(id==='zeltira')return '<button data-view-go="quests">QUEST JOURNAL</button><button data-view-go="professions">PROFESSIONS</button><button data-view-go="trading">TRADING POST</button>';
 if(id==='east-road')return '<button data-view-go="quests">FOLLOW EAST ROAD QUEST</button><button data-focus-incidents>CHECK TODAY’S INCIDENTS</button>';
 if(id==='ashen-ridge')return '<button data-view-go="content">OPEN DUNGEON JOURNAL</button><button data-focus-incidents>SEARCH THE RIDGE</button>';
 if(id==='hollow-deep')return '<button data-view-go="content">OPEN HOLLOW CONTENT</button><button data-focus-incidents>INVESTIGATE THE DEEP</button>';
 return '<button data-boss-scroll>CHECK WORLD BOSS</button><button data-focus-incidents>SEARCH THIS REGION</button>';
}
function renderMap(){
 const root=$('#adventureWorldMount');if(!root)return;
 const a=ensure(),edges=[];
 Object.entries(LOCATIONS).forEach(([id,l])=>l.links.forEach(other=>{if(id<other){const o=LOCATIONS[other];edges.push('<line x1="'+l.x+'" y1="'+l.y+'" x2="'+o.x+'" y2="'+o.y+'" />')}}));
 root.innerHTML='<div class="adventure-world-grid"><section class="adventure-map-panel panel"><div class="adventure-map-head"><div><small>ADVENTURE MAP</small><h3>The Zeltiran Frontier</h3></div><span>'+a.discovered.length+' / '+Object.keys(LOCATIONS).length+' REGIONS DISCOVERED</span></div><div class="adventure-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+edges.join('')+'</svg>'+Object.entries(LOCATIONS).map(([id,l])=>{
  const open=isUnlocked(id),here=a.currentLocation===id,boss=activeBossForRegion(id),progress=locationProgress(id);
  return '<button class="adventure-node '+(open?'open':'locked')+' '+(here?'here':'')+' '+(boss?'boss-live':'')+'" style="left:'+l.x+'%;top:'+l.y+'%" data-location="'+id+'"><i>'+l.icon+'</i><span><b>'+esc(open?l.name:'Unknown Region')+'</b><small>'+(here?'YOUR PARTY':boss?'WORLD BOSS ACTIVE':open?(progress?'EXPLORED '+progress:'DISCOVERED'):'UNDISCOVERED')+'</small></span></button>';
 }).join('')+'<div class="adventure-map-caption">Roads become useful as your guild learns where they lead.</div></div></section><aside class="adventure-location panel" id="adventureLocationDetail"></aside></div>';
 root.querySelectorAll('[data-location]').forEach(b=>b.addEventListener('click',()=>{selectedLocation=b.dataset.location;renderLocation()}));renderLocation()
}
function renderLocation(){
 const root=$('#adventureLocationDetail');if(!root)return;
 const a=ensure(),id=LOCATIONS[selectedLocation]?selectedLocation:a.currentLocation,l=LOCATIONS[id],open=isUnlocked(id),here=a.currentLocation===id,boss=activeBossForRegion(id),progress=locationProgress(id);
 root.innerHTML='<div class="adventure-location-top '+(open?'':'locked')+'"><small>'+esc(l.eyebrow)+'</small><div><i>'+l.icon+'</i><h3>'+esc(open?l.name:'Undiscovered Region')+'</h3></div><p>'+esc(open?l.desc:l.unlock)+'</p></div><div class="adventure-region-stats"><span><small>EXPLORATION</small><b>'+progress+'</b></span><span><small>VISITS</small><b>'+Number(a.visits[id]||0)+'</b></span><span><small>STATUS</small><b>'+(boss?'BOSS ACTIVE':here?'HERE':open?'OPEN':'LOCKED')+'</b></span></div>'+(open?'<div class="adventure-progress"><span style="width:'+clamp(progress/5*100,0,100)+'%"></span></div>':'')+(boss?'<div class="adventure-boss-signal"><b>'+esc(boss.name)+' is active.</b><span>A shared encounter is happening in this region now.</span></div>':'')+'<div class="adventure-location-actions">'+(!here&&open?'<button class="travel" data-travel="'+id+'">TRAVEL HERE</button>':'')+locationActions(id)+'</div>';
 root.querySelector('[data-travel]')?.addEventListener('click',()=>travel(id));
 root.querySelectorAll('[data-view-go]').forEach(b=>b.addEventListener('click',()=>openView(b.dataset.viewGo)));
 root.querySelector('[data-boss-scroll]')?.addEventListener('click',scrollBosses);
 root.querySelector('[data-focus-incidents]')?.addEventListener('click',()=>document.getElementById('adventureDailyMount')?.scrollIntoView({behavior:'smooth',block:'start'}))
}
function incidentStatus(inc){return ensure()?.daily?.completed?.[inc.id]||null}
function renderIncidents(){
 const root=$('#adventureDailyMount');if(!root)return;
 const a=ensure(),items=todaysIncidents(),done=items.filter(x=>incidentStatus(x)).length;
 root.innerHTML='<article class="panel adventure-board"><div class="adventure-board-head"><div><small>TODAY IN THE WORLD</small><h3>Field Incidents</h3><p>These change each day. Pick an approach, accept the risk and earn progress outside the dungeon loop.</p></div><b>'+done+' / '+items.length+' COMPLETE</b></div><div class="adventure-incidents">'+items.map(inc=>{
  const result=incidentStatus(inc),l=LOCATIONS[inc.location];
  return '<button class="adventure-incident '+(result?'complete':'')+'" data-incident="'+inc.id+'"><span class="adventure-incident-icon">'+l.icon+'</span><span><small>'+esc(inc.tag)+' · '+esc(l.name)+'</small><b>'+esc(inc.title)+'</b><p>'+esc(inc.summary)+'</p></span><em>'+(result?'COMPLETED · '+esc(result.choiceLabel):'INVESTIGATE →')+'</em></button>';
 }).join('')+'</div><div class="adventure-board-foot"><span>Completing incidents increases regional exploration and reveals new routes.</span><strong>'+a.totalIncidents+' incidents completed all-time</strong></div></article>';
 root.querySelectorAll('[data-incident]').forEach(b=>b.addEventListener('click',()=>openIncident(b.dataset.incident)))
}
function incidentRoot(){let root=$('#adventureIncidentModal');if(!root){root=document.createElement('div');root.id='adventureIncidentModal';root.className='adventure-incident-backdrop';root.hidden=true;document.body.appendChild(root)}return root}
function chanceFor(choice){const ilvl=Number(Game.partyItemLevel?.())||0,gear=Math.max(0,Math.min(12,Math.floor((ilvl-18)*1.2))),bonus=bonusMet(choice.bonus)?12:0;return clamp(choice.base+gear+bonus,20,98)}
function openIncident(id){
 const inc=INCIDENTS.find(x=>x.id===id),a=ensure();if(!inc||!a||incidentStatus(inc))return;
 if(party().length!==5){alert('Build a complete five-character party before taking field work.');openView('party');return}
 if(a.currentLocation!==inc.location){selectedLocation=inc.location;renderMap();toast('Travel required','Move your party to '+LOCATIONS[inc.location].name+' before beginning this incident.');return}
 const root=incidentRoot(),l=LOCATIONS[inc.location];root.hidden=false;document.body.classList.add('adventure-incident-open');
 root.innerHTML='<section class="adventure-incident-modal"><header><div><small>'+esc(inc.tag)+' · '+esc(l.name)+'</small><h2>'+esc(inc.title)+'</h2></div><button data-close>×</button></header><p class="adventure-incident-story">'+esc(inc.summary)+'</p><div class="adventure-choice-grid">'+inc.choices.map(c=>'<button data-choice="'+c.id+'"><small>'+chanceFor(c)+'% ESTIMATED SUCCESS</small><b>'+esc(c.label)+'</b><p>'+esc(c.desc)+'</p><span>'+(bonusMet(c.bonus)?'PARTY ADVANTAGE · '+esc(c.bonus):'Bonus if prepared: '+esc(c.bonus))+'</span></button>').join('')+'</div><footer><span>Failure can add Cell Shock. The incident is consumed either way.</span></footer></section>';
 root.querySelector('[data-close]').onclick=()=>{root.hidden=true;document.body.classList.remove('adventure-incident-open')};
 root.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>resolveIncident(inc,b.dataset.choice)))
}
function addRewards(reward){
 const s=state(),parts=[];
 if(reward.gold){s.gold=(Number(s.gold)||0)+reward.gold;parts.push(reward.gold+' Gold')}
 if(reward.renown){s.renown=(Number(s.renown)||0)+reward.renown;parts.push(reward.renown+' Renown')}
 Object.entries(reward.materials||{}).forEach(([key,qty])=>{Game.addMaterial?.(key,qty);const m=window.CellboundProfessions?.MATERIALS?.[key];parts.push((m?.name||key)+' ×'+qty)});
 return parts
}
function applyMilestones(a,location){
 const newly=[];
 if(a.totalIncidents>=2&&!a.discovered.includes('gloam-marsh')){a.discovered.push('gloam-marsh');newly.push('A safe route into Gloam Marsh has been mapped.')}
 if(a.totalIncidents>=5&&!a.discovered.includes('cell-scar')){a.discovered.push('cell-scar');newly.push('Your scouts have established a route to The Cell Scar.')}
 const p=Number(a.exploration[location])||0;
 if(p>=3&&!a.cacheClaims[location]){
  a.cacheClaims[location]=true;state().gold=(Number(state().gold)||0)+75;
  Game.addMaterial?.(location==='ashen-ridge'?'ashen-soul-fragment':location==='hollow-deep'?'void-crystal':'faded-cell-fragment',1);
  newly.push(LOCATIONS[location].name+' exploration reached 3. A hidden field cache was recovered.')
 }
 return newly
}
async function resolveIncident(inc,choiceId){
 const choice=inc.choices.find(x=>x.id===choiceId),a=ensure();if(!choice||!a||incidentStatus(inc))return;
 const chance=chanceFor(choice),roll=hash(dateKey()+'|'+inc.id+'|'+choice.id+'|'+(Game.getUser?.()?.id||'guild'))%100,success=roll<chance,reward=success?choice.success:choice.fail,rewards=addRewards(reward),shock=Number(reward.shock)||0;
 a.daily.completed[inc.id]={choice:choice.id,choiceLabel:choice.label,success,at:new Date().toISOString()};a.totalIncidents++;a.exploration[inc.location]=(Number(a.exploration[inc.location])||0)+1;
 const milestones=applyMilestones(a,inc.location);state().activity.push((success?'Field success: ':'Field setback: ')+inc.title+' — '+choice.label+'.');
 if(shock)Game.applyPartyCellShock?.(shock);
 await commit();
 const root=incidentRoot();root.innerHTML='<section class="adventure-result '+(success?'success':'failure')+'"><small>'+(success?'FIELD SUCCESS':'FIELD SETBACK')+'</small><h2>'+esc(inc.title)+'</h2><p>'+(success?'Your approach worked. The guild returns with something useful and a better understanding of the region.':'The plan went wrong, but the guild survived and learned from the attempt.')+'</p><div class="adventure-result-rewards">'+(rewards.length?rewards.map(x=>'<span>'+esc(x)+'</span>').join(''):'<span>No material reward</span>')+(shock?'<span>+'+shock+' Cell Shock to active party</span>':'')+'</div>'+(milestones.length?'<div class="adventure-discovery">'+milestones.map(x=>'<b>'+esc(x)+'</b>').join('')+'</div>':'')+'<button data-finish>RETURN TO WORLD →</button></section>';
 root.querySelector('[data-finish]').onclick=()=>{root.hidden=true;document.body.classList.remove('adventure-incident-open');render()}
}
function renderBossBridge(){
 const heading=$('#worldBossSectionTitle'),sub=$('#worldBossSectionCopy');if(!heading||!sub)return;
 const live=worldBosses().filter(b=>b.status==='active'||b.status==='in_combat');
 heading.textContent=live.length?live.length+' World Boss Signal'+(live.length===1?'':'s'):'World Bosses';
 sub.textContent=live.length?'Powerful enemies are active in the regions below. Travel is not required to join a shared encounter yet.':'World bosses appear on hidden random timers. Their regions remain useful even while the bosses are dormant.'
}
function renderOverview(){
 const root=$('#adventureOverviewCard');if(!root)return;
 const a=ensure(),items=todaysIncidents(),done=items.filter(x=>incidentStatus(x)).length,q=state()?.questSystem,boss=worldBosses().find(b=>b.status==='active'||b.status==='in_combat');
 let title=done<items.length?'The world has unfinished work.':q&&!q.flags?.hollowSanctumUnlocked?'Follow the mystery beneath the East Road.':boss?boss.name+' is active.':'Choose your next move.';
 let copy=done<items.length?(items.length-done)+' field incident'+(items.length-done===1?'':'s')+' remain today.':boss?'A shared world encounter is currently live.':'Travel, pursue quests, gather resources or enter a dungeon when you choose.';
 root.innerHTML='<div class="adventure-overview-copy"><small>LIVING WORLD</small><h3>'+esc(title)+'</h3><p>'+esc(copy)+'</p><div><span>'+a.discovered.length+' REGIONS</span><span>'+a.totalIncidents+' INCIDENTS</span><span>'+done+'/'+items.length+' TODAY</span></div></div><button data-open-world>OPEN WORLD →</button>';
 root.querySelector('[data-open-world]').onclick=()=>openView('world')
}
function render(){if(!Game?.ready)return;ensure();renderMap();renderIncidents();renderBossBridge();renderOverview()}
function init(){
 Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}
 ensure();selectedLocation=ensure().currentLocation;
 document.querySelector('.nav-btn[data-view="world"]')?.addEventListener('click',()=>setTimeout(render,30));
 document.getElementById('refreshWorld')?.addEventListener('click',()=>setTimeout(render,250));
 window.addEventListener('cellbound:dungeon-complete',render);window.addEventListener('cellbound:hollow-complete',render);window.addEventListener('cellbound:world-boss-complete',render);
 setInterval(()=>{if(document.querySelector('#world.view.active'))render()},5000);
 render();window.CellboundAdventure={render,ensure,travel,todaysIncidents}
}
init();
})();