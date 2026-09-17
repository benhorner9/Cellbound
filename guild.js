(()=>{
'use strict';

const SUPABASE_URL='https://jvydqeikdpelmtloulnd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl';
const REMEMBER_KEY='cellbound-remember-device';
const authStorage={
  getItem:key=>localStorage.getItem(key)??sessionStorage.getItem(key),
  setItem(key,value){
    const keep=localStorage.getItem(REMEMBER_KEY)==='1';
    const primary=keep?localStorage:sessionStorage;
    const secondary=keep?sessionStorage:localStorage;
    primary.setItem(key,value);
    secondary.removeItem(key);
  },
  removeItem(key){
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};
const supabaseClient=window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:authStorage}}
);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const STORAGE='cellbound-management-reboot-v2';

const ui={
  pageTitle:$('#pageTitle'),
  rosterGrid:$('#rosterGrid'),
  overviewRoster:$('#overviewRoster'),
  partyRoster:$('#partyRoster'),
  partySlots:$('#partySlots'),
  readinessFill:$('#readinessFill'),
  readinessText:$('#readinessText'),
  readinessLabel:$('#readinessLabel'),
  readinessHint:$('#readinessHint'),
  bossSelect:$('#bossSelect'),
  attemptBtn:$('#attemptBtn'),
  bossList:$('#bossList'),
  reportsList:$('#reportsList'),
  activityLog:$('#activityLog'),
  characterModal:$('#characterModal'),
  characterDetail:$('#characterDetail'),
  attemptModal:$('#attemptModal'),
  attemptStage:$('#attemptStage'),
  renown:$('#renown'),
  gold:$('#gold'),
  rosterCount:$('#rosterCount'),
  dungeonProgress:$('#dungeonProgress')
};

const classes={
  Warrior:{
    icon:'⚔',
    glow:'#b86b55',
    specs:{
      Protection:{role:'tank',talents:['Shield Mastery','Last Stand','Bulwark']},
      Arms:{role:'dps',talents:['Weapon Mastery','Deep Wounds','Execute']}
    }
  },
  Paladin:{
    icon:'✥',
    glow:'#d8b65d',
    specs:{
      Protection:{role:'tank',talents:['Sacred Shield','Guardian Oath','Consecration']},
      Holy:{role:'healer',talents:['Divine Light','Grace','Beacon']}
    }
  },
  Priest:{
    icon:'✚',
    glow:'#e2d9c5',
    specs:{
      Holy:{role:'healer',talents:['Renew','Serenity','Divine Hymn']}
    }
  },
  Druid:{
    icon:'❈',
    glow:'#7fc47a',
    specs:{
      Restoration:{role:'healer',talents:['Rejuvenation','Lifebloom','Tranquility']}
    }
  },
  Hunter:{
    icon:'➶',
    glow:'#9abe68',
    specs:{
      Marksman:{role:'dps',talents:['True Aim','Rapid Fire','Kill Shot']}
    }
  },
  Rogue:{
    icon:'◆',
    glow:'#d9c86c',
    specs:{
      Assassination:{role:'dps',talents:['Ambush','Venom','Eviscerate']}
    }
  },
  Mage:{
    icon:'✦',
    glow:'#6da7df',
    specs:{
      Arcane:{role:'dps',talents:['Arcane Focus','Surge','Barrage']}
    }
  }
};

const bosses=[
  {id:'ashwarden',name:'Ash Warden Kael',rune:'♜',glow:'#8c4e35',recommended:42,mechanic:'Tank pressure and frontal cleave.',loot:['Warden’s Iron Visor','Cinderbound Shield','Ashen Signet']},
  {id:'embermaw',name:'Embermaw',rune:'♨',glow:'#b66232',recommended:56,mechanic:'Heavy group damage and interrupt checks.',loot:['Emberhide Boots','Scorched Longbow','Heartcoal Charm']},
  {id:'vaultheart',name:'The Vaultheart',rune:'◇',glow:'#805b98',recommended:68,mechanic:'Multi-phase encounter with burst windows.',loot:['Vaultheart Core','Runic Greatblade','Crown of the Deep Forge']}
];

function talentState(className){
  const result={};
  Object.entries(classes[className].specs).forEach(([spec,data])=>{
    result[spec]={};
    data.talents.forEach((name,index)=>result[spec][name]=index<2?1:0);
  });
  return result;
}

const starterRoster=[
  {id:'r1',name:'Thane Alder',class:'Warrior',spec:'Protection',level:6,power:48,gear:46,talent:1,knowledge:{ashwarden:18,embermaw:0,vaultheart:0},portrait:'TA',gearItems:['Ironbound Helm','Tempered Chestplate','Dwarven Shield'],talents:talentState('Warrior')},
  {id:'r2',name:'Mira Voss',class:'Priest',spec:'Holy',level:6,power:45,gear:43,talent:1,knowledge:{ashwarden:12,embermaw:0,vaultheart:0},portrait:'MV',gearItems:['Willow Hood','Acolyte Robe','Mender’s Staff'],talents:talentState('Priest')},
  {id:'r3',name:'Kael Renn',class:'Warrior',spec:'Arms',level:6,power:52,gear:49,talent:1,knowledge:{ashwarden:22,embermaw:0,vaultheart:0},portrait:'KR',gearItems:['Steel Visor','Ashcloak','Runed Longsword'],talents:talentState('Warrior')},
  {id:'r4',name:'Sera Vale',class:'Hunter',spec:'Marksman',level:5,power:44,gear:42,talent:1,knowledge:{ashwarden:9,embermaw:0,vaultheart:0},portrait:'SV',gearItems:['Tracker Hood','Worn Jerkin','Yew Bow'],talents:talentState('Hunter')},
  {id:'r5',name:'Orin Pell',class:'Mage',spec:'Arcane',level:5,power:46,gear:44,talent:1,knowledge:{ashwarden:14,embermaw:0,vaultheart:0},portrait:'OP',gearItems:['Sage Circlet','Blueweave Robe','Crystal Focus'],talents:talentState('Mage')},
  {id:'r6',name:'Bren Hollow',class:'Rogue',spec:'Assassination',level:5,power:47,gear:45,talent:1,knowledge:{ashwarden:5,embermaw:0,vaultheart:0},portrait:'BH',gearItems:['Shadow Hood','Redscale Vest','Twin Daggers'],talents:talentState('Rogue')},
  {id:'r7',name:'Elira Dawn',class:'Druid',spec:'Restoration',level:5,power:42,gear:40,talent:1,knowledge:{ashwarden:3,embermaw:0,vaultheart:0},portrait:'ED',gearItems:['Leafwoven Hood','Pilgrim Wrap','Living Branch'],talents:talentState('Druid')},
  {id:'r8',name:'Doran Pike',class:'Paladin',spec:'Protection',level:5,power:43,gear:41,talent:1,knowledge:{ashwarden:7,embermaw:0,vaultheart:0},portrait:'DP',gearItems:['Bronze Helm','Oathplate','Tower Shield'],talents:talentState('Paladin')},
  {id:'r9',name:'Lyra Fen',class:'Paladin',spec:'Holy',level:5,power:41,gear:40,talent:1,knowledge:{ashwarden:6,embermaw:0,vaultheart:0},portrait:'LF',gearItems:['Silver Circlet','Sunplate Robe','Blessed Mace'],talents:talentState('Paladin')}
];

function initialState(){
  return{
    renown:120,
    gold:1840,
    roster:JSON.parse(JSON.stringify(starterRoster)),
    party:{tank:null,healer:null,dps:[null,null,null]},
    bossKills:{ashwarden:false,embermaw:false,vaultheart:false},
    reports:[],
    activity:[
      'The guild charter has been signed.',
      'Nine adventurers answer your call.',
      'Class specialisations now determine combat roles.',
      'The Ashen Vault is now available.'
    ]
  };
}

let state=(()=>{
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE));
    return saved?.roster?.length?saved:initialState();
  }catch{
    return initialState();
  }
})();

function save(){localStorage.setItem(STORAGE,JSON.stringify(state));}
function classDef(c){return classes[c.class];}
function specDef(c){return classDef(c)?.specs?.[c.spec];}
function roleOf(c){return specDef(c)?.role||'dps';}
function roleLabel(role){return role==='dps'?'Damage':role[0].toUpperCase()+role.slice(1);}
function charById(id){return state.roster.find(c=>c.id===id);}
function bossById(id){return bosses.find(b=>b.id===id);}
function availableSpecs(c){return Object.entries(classDef(c).specs);}
function roleOptions(c){return [...new Set(availableSpecs(c).map(([,s])=>s.role))];}
function averageKnowledge(c){return Math.round(Object.values(c.knowledge).reduce((a,b)=>a+b,0)/bosses.length);}
function activeTalents(c){return c.talents?.[c.spec]||{};}

function switchView(id){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  $$('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  const labels={overview:'Command Overview',roster:'Roster',content:'PvE Content',party:'Party Builder',reports:'Attempt Reports'};
  ui.pageTitle.textContent=labels[id]||'Cellbound';
  if(id==='party')renderParty();
  if(id==='reports')renderReports();
}
$$('.nav-btn[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.jump)));

function renderTop(){
  ui.renown.textContent=state.renown;
  ui.gold.textContent=state.gold.toLocaleString();
  ui.rosterCount.textContent=`${state.roster.length} / 12`;
  ui.dungeonProgress.textContent=`${Object.values(state.bossKills).filter(Boolean).length} / 3 bosses`;
}

function rosterCard(c){
  const role=roleOf(c);
  return `<article class="char-card" data-role="${role}" style="--glow:${classDef(c).glow}">
    <div class="char-top"><div class="char-portrait">${c.portrait}</div><span class="role-tag role-${role}">${roleLabel(role)}</span></div>
    <h3>${c.name}</h3>
    <div class="class">${c.class} · ${c.spec} · Level ${c.level}</div>
    <div class="char-stats"><div><span>Power</span><b>${c.power}</b></div><div><span>Gear</span><b>${c.gear}</b></div><div><span>Points</span><b>${c.talent}</b></div></div>
    <div class="knowledge-row"><div><span>Avg. Knowledge</span><b>${averageKnowledge(c)}%</b></div><div class="knowledge-bar"><i style="width:${averageKnowledge(c)}%"></i></div></div>
    <button data-char="${c.id}">VIEW CHARACTER</button>
  </article>`;
}

function renderRoster(filter='all'){
  ui.rosterGrid.innerHTML=state.roster.filter(c=>filter==='all'||roleOf(c)===filter).map(rosterCard).join('');
  ui.rosterGrid.querySelectorAll('[data-char]').forEach(b=>b.addEventListener('click',()=>openCharacter(b.dataset.char)));
}
$$('.filter').forEach(b=>b.addEventListener('click',()=>{
  $$('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  renderRoster(b.dataset.filter);
}));

function renderOverview(){
  ui.overviewRoster.innerHTML=state.roster.slice(0,5).map(c=>`<div class="mini-row">
    <div class="avatar">${c.portrait}</div>
    <div><b>${c.name}</b><small>${c.class} · ${c.spec} · Level ${c.level}</small></div>
    <span class="role-tag role-${roleOf(c)}">${roleLabel(roleOf(c))}</span>
  </div>`).join('');
  ui.activityLog.innerHTML=state.activity.slice(-6).reverse().map((a,i)=>`<div class="activity-entry"><span>${i===0?'Just now':`${i} event${i>1?'s':''} ago`}</span><b>${a}</b></div>`).join('');
}

function renderBosses(){
  ui.bossList.innerHTML=bosses.map((b,i)=>{
    const locked=i>0&&!state.bossKills[bosses[i-1].id];
    const known=Math.round(state.roster.reduce((s,c)=>s+(c.knowledge[b.id]||0),0)/state.roster.length);
    return `<article class="boss-card">
      <div class="boss-visual" data-rune="${b.rune}" style="--boss-glow:${b.glow}"><span class="boss-number">BOSS ${i+1}</span></div>
      <div class="boss-body"><h3>${b.name}</h3><p>${b.mechanic}</p>
      <div class="boss-meta"><div><span>Guild Knowledge</span><b>${known}%</b></div><div><span>Recommended</span><b>${b.recommended} Power</b></div></div>
      <div class="boss-lock">${state.bossKills[b.id]?'DEFEATED':locked?'LOCKED — DEFEAT PREVIOUS BOSS':'AVAILABLE'}</div></div>
    </article>`;
  }).join('');
  ui.bossSelect.innerHTML=bosses.map((b,i)=>`<option value="${b.id}" ${i>0&&!state.bossKills[bosses[i-1].id]?'disabled':''}>${b.name}${state.bossKills[b.id]?' — Farm':''}</option>`).join('');
}

function renderSpecSection(c){
  const specs=availableSpecs(c);
  if(specs.length===1){
    const [name,data]=specs[0];
    return `<div class="talent-line"><div><b>${name}</b><span>${roleLabel(data.role)} specialisation</span></div><span class="role-tag role-${data.role}">ACTIVE</span></div>`;
  }
  return specs.map(([name,data])=>{
    const active=name===c.spec;
    return `<div class="talent-line">
      <div><b>${name}</b><span>${roleLabel(data.role)} talent path${active?' · Active':''}</span></div>
      <button data-spec="${name}" ${active?'disabled':''}>${active?'✓':'→'}</button>
    </div>`;
  }).join('');
}

function renderTalentTree(c){
  const talents=activeTalents(c);
  return Object.entries(talents).map(([name,val])=>`<div class="talent-line">
    <div><b>${name}</b><span>Rank ${val} · ${c.spec}</span></div>
    <button data-talent="${name}" ${c.talent<1?'disabled':''}>+</button>
  </div>`).join('');
}

function openCharacter(id){
  const c=charById(id);
  const role=roleOf(c);
  const roles=roleOptions(c).map(roleLabel).join(' / ');
  ui.characterDetail.innerHTML=`
    <div class="detail-hero"><div class="detail-avatar">${c.portrait}</div><div>
      <small class="role-tag role-${role}">${roleLabel(role)}</small>
      <h2>${c.name}</h2>
      <p>${c.class} · ${c.spec} · Level ${c.level} · Power ${c.power} · Gear ${c.gear}</p>
      <p>Class roles: ${roles}</p>
    </div></div>
    <div class="detail-grid">
      <section class="detail-card"><h3>Equipment</h3><div class="gear-grid">${c.gearItems.map((g,i)=>`<div class="gear-slot"><span>${['Head','Chest','Weapon'][i]}</span><b>${g}</b></div>`).join('')}</div></section>
      <section class="detail-card"><h3>Specialisation</h3>${renderSpecSection(c)}<p style="color:#667975;font-size:.58rem;line-height:1.5">Warrior and Paladin change role through their active talent specialisation.</p></section>
      <section class="detail-card"><h3>${c.spec} Talents</h3>${renderTalentTree(c)}<p style="color:#667975;font-size:.58rem">Unspent points: <b>${c.talent}</b></p></section>
      <section class="detail-card"><h3>Encounter Knowledge</h3>${bosses.map(b=>`<div class="talent-line"><div><b>${b.name}</b><span>${c.knowledge[b.id]||0}% known</span></div></div>`).join('')}</section>
    </div>`;
  ui.characterModal.hidden=false;

  ui.characterDetail.querySelectorAll('[data-spec]').forEach(button=>button.addEventListener('click',()=>{
    changeSpec(c,button.dataset.spec);
  }));
  ui.characterDetail.querySelectorAll('[data-talent]').forEach(button=>button.addEventListener('click',()=>{
    if(c.talent<1)return;
    c.talents[c.spec][button.dataset.talent]=(c.talents[c.spec][button.dataset.talent]||0)+1;
    c.talent--;
    c.power++;
    state.activity.push(`${c.name} invested a talent point in ${c.spec}: ${button.dataset.talent}.`);
    save();
    openCharacter(c.id);
    renderAll();
  }));
}

function changeSpec(c,newSpec){
  if(!classDef(c).specs[newSpec]||newSpec===c.spec)return;
  c.spec=newSpec;
  const newRole=roleOf(c);
  removeChar(c.id);
  state.activity.push(`${c.name} changed ${c.class} specialisation to ${newSpec} (${roleLabel(newRole)}).`);
  save();
  openCharacter(c.id);
  renderAll();
}

$('[data-close]')?.addEventListener('click',()=>ui.characterModal.hidden=true);
ui.characterModal.addEventListener('click',e=>{if(e.target===ui.characterModal)ui.characterModal.hidden=true;});

function flatPartyIds(){return [state.party.tank,state.party.healer,...state.party.dps].filter(Boolean);}
function removeChar(id){
  if(state.party.tank===id)state.party.tank=null;
  if(state.party.healer===id)state.party.healer=null;
  state.party.dps=state.party.dps.map(x=>x===id?null:x);
}
function assignChar(id){
  const c=charById(id);
  const role=roleOf(c);
  removeChar(id);
  if(role==='tank')state.party.tank=id;
  else if(role==='healer')state.party.healer=id;
  else{
    const idx=state.party.dps.findIndex(x=>!x);
    if(idx>=0)state.party.dps[idx]=id;
    else state.party.dps[0]=id;
  }
  save();
  renderParty();
}

function slotHtml(role,id,index=''){
  const c=id?charById(id):null;
  const icon=role==='tank'?'🛡':role==='healer'?'✚':'⚔';
  return `<div class="party-slot ${c?'filled':''}">
    <div class="slot-role">${icon}</div>
    <div>${c?`<b>${c.name}</b><small>${c.class} · ${c.spec} · Power ${c.power}</small>`:`<b>${roleLabel(role)} Slot${role==='dps'?` ${Number(index)+1}`:''}</b><small>Select a suitable adventurer</small>`}</div>
    ${c?`<button data-remove="${c.id}">×</button>`:''}
  </div>`;
}

function partyReadiness(){
  const ids=flatPartyIds();
  if(ids.length<5)return{score:ids.length*12,ready:false,hint:'Assign 1 Tank, 1 Healer and 3 Damage characters.'};
  const boss=bossById(ui.bossSelect.value||'ashwarden');
  const chars=ids.map(charById);
  const avgPower=chars.reduce((s,c)=>s+c.power,0)/5;
  const avgKnowledge=chars.reduce((s,c)=>s+(c.knowledge[boss.id]||0),0)/5;
  const score=Math.round(Math.min(100,(avgPower/boss.recommended)*58+avgKnowledge*.42));
  return{score,ready:true,hint:`Average power ${avgPower.toFixed(0)} · Average ${boss.name} knowledge ${avgKnowledge.toFixed(0)}%`};
}

function renderParty(){
  ui.partySlots.innerHTML=
    slotHtml('tank',state.party.tank)+
    slotHtml('healer',state.party.healer)+
    state.party.dps.map((id,i)=>slotHtml('dps',id,i)).join('');
  ui.partySlots.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{
    removeChar(b.dataset.remove);
    save();
    renderParty();
  }));

  const selected=new Set(flatPartyIds());
  ui.partyRoster.innerHTML=state.roster.map(c=>`<button class="party-choice" data-pick="${c.id}" ${selected.has(c.id)?'disabled':''}>
    <div class="avatar">${c.portrait}</div>
    <div><b>${c.name}</b><small>${c.class} · ${c.spec} · Level ${c.level}</small></div>
    <em>${roleLabel(roleOf(c))} · ${c.power}</em>
  </button>`).join('');
  ui.partyRoster.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>assignChar(b.dataset.pick)));

  const r=partyReadiness();
  ui.readinessFill.style.width=`${r.score}%`;
  ui.readinessText.textContent=`${r.score}%`;
  ui.readinessLabel.textContent=r.ready?'READY':'NOT READY';
  ui.readinessLabel.className=r.ready?'good':'';
  ui.readinessHint.textContent=r.hint;
  ui.attemptBtn.disabled=!r.ready;
}

$('#autoFill').addEventListener('click',()=>{
  const best=role=>state.roster.filter(c=>roleOf(c)===role).sort((a,b)=>b.power-a.power);
  state.party.tank=best('tank')[0]?.id||null;
  state.party.healer=best('healer')[0]?.id||null;
  state.party.dps=best('dps').slice(0,3).map(c=>c.id);
  while(state.party.dps.length<3)state.party.dps.push(null);
  save();
  renderParty();
});
ui.bossSelect.addEventListener('change',renderParty);

function simulateAttempt(){
  const ids=flatPartyIds();
  if(ids.length!==5)return;
  const boss=bossById(ui.bossSelect.value);
  const party=ids.map(charById);
  const r=partyReadiness();
  const knowledge=party.reduce((s,c)=>s+(c.knowledge[boss.id]||0),0)/5;
  const roleBonus=(
    party.filter(c=>roleOf(c)==='tank').length===1&&
    party.filter(c=>roleOf(c)==='healer').length===1&&
    party.filter(c=>roleOf(c)==='dps').length===3
  )?8:-18;
  const chance=Math.max(8,Math.min(92,r.score*.72+knowledge*.18+roleBonus-16));
  const roll=Math.random()*100;
  const success=roll<chance;

  ui.attemptModal.hidden=false;
  ui.attemptStage.innerHTML=`<div class="attempt-head"><div><small>THE ASHEN VAULT</small><h2>${boss.name}</h2></div><b>${Math.round(chance)}% projected chance</b></div>
    <div class="attempt-body">
      <div class="attempt-raid">
        <div class="party-column">${party.map(c=>`<div class="sim-unit"><b>${c.name}</b><span>${c.class} · ${c.spec} · ${roleLabel(roleOf(c))}</span><div class="sim-bar sim-party"><i style="width:100%"></i></div></div>`).join('')}</div>
        <div class="versus">VS</div>
        <div class="boss-column"><div class="sim-unit"><b>${boss.name}</b><span>${boss.mechanic}</span><div class="sim-bar sim-boss"><i id="bossSimBar" style="width:100%"></i></div></div></div>
      </div>
      <div class="attempt-log" id="attemptLog">Party enters combat...<br>${party[0].name} establishes threat.<br>${party[1].name} begins healing rotation.<br>The group starts learning the encounter...</div>
      <div id="attemptResult"></div>
    </div>`;

  const bar=$('#bossSimBar');
  setTimeout(()=>{if(bar)bar.style.width=success?'0%':`${Math.max(8,Math.round(100-r.score*.72))}%`;},300);
  setTimeout(()=>resolveAttempt(boss,party,success,$('#attemptResult')),1100);
}

function resolveAttempt(boss,party,success,result){
  const knowledgeGain=party.map(c=>{
    const before=c.knowledge[boss.id]||0;
    const gain=success?Math.floor(5+Math.random()*6):Math.floor(7+Math.random()*9);
    const after=Math.min(100,before+gain);
    c.knowledge[boss.id]=after;
    return{name:c.name,before,after,gain};
  });

  let loot=null;
  if(success){
    state.bossKills[boss.id]=true;
    state.renown+=25;
    state.gold+=120;
    const winner=party[Math.floor(Math.random()*party.length)];
    if(Math.random()<.72){
      loot=boss.loot[Math.floor(Math.random()*boss.loot.length)];
      winner.gearItems[2]=loot;
      winner.gear+=3;
      winner.power+=3;
      state.activity.push(`${winner.name} equipped ${loot} from ${boss.name}.`);
    }
    state.activity.push(`${boss.name} was defeated in The Ashen Vault.`);
  }else{
    state.activity.push(`The guild wiped on ${boss.name}, but the team learned from the attempt.`);
  }

  state.reports.unshift({id:Date.now(),boss:boss.id,success,knowledgeGain,loot,at:new Date().toISOString()});
  save();
  renderAll();

  result.innerHTML=`<div class="attempt-result">
    <h3>${success?'VICTORY':'WIPE — PROGRESS MADE'}</h3>
    <p>${success?'Boss defeated. Your composition, gear and encounter knowledge were enough.':'The group wiped, but every member gained encounter knowledge for the next attempt.'}</p>
    ${loot?`<div class="loot-drop">Loot acquired: <b>${loot}</b></div>`:''}
    <p>${knowledgeGain.map(k=>`${k.name}: ${k.before}% → ${k.after}%`).join('<br>')}</p>
    <button id="closeAttempt">RETURN TO GUILD</button>
  </div>`;
  $('#closeAttempt').addEventListener('click',()=>ui.attemptModal.hidden=true);
}

ui.attemptBtn.addEventListener('click',simulateAttempt);
ui.attemptModal.addEventListener('click',e=>{if(e.target===ui.attemptModal)ui.attemptModal.hidden=true;});

function renderReports(){
  if(!state.reports.length){
    ui.reportsList.innerHTML='<div class="panel" style="padding:30px;color:#657874">No attempts yet. Build a party and enter The Ashen Vault.</div>';
    return;
  }
  ui.reportsList.innerHTML=state.reports.map(r=>{
    const b=bossById(r.boss);
    return `<article class="report-card">
      <div><div class="report-result ${r.success?'kill':'wipe'}">${r.success?'VICTORY':'WIPE'}</div><small>${new Date(r.at).toLocaleString()}</small></div>
      <div><h3>${b.name}</h3><p>${r.success?'The party defeated the encounter.':'The party failed the encounter but gained meaningful experience.'}${r.loot?` Loot: ${r.loot}.`:''}</p></div>
      <div class="report-gain"><b>Knowledge gained</b>${r.knowledgeGain.map(k=>`<span>${k.name} +${k.gain}%</span>`).join('')}</div>
    </article>`;
  }).join('');
}

function renderAll(){
  renderTop();
  renderOverview();
  renderRoster();
  renderBosses();
  renderParty();
  renderReports();
}

$('#signOut').addEventListener('click',async()=>{
  await supabaseClient.auth.signOut();
  location.replace('./index.html');
});

(async()=>{
  const{data,error}=await supabaseClient.auth.getSession();
  if(error||!data.session?.user){
    location.replace('./index.html');
    return;
  }
  renderAll();
})();
})();