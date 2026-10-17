(()=>{
'use strict';
let report=null,busy=false;
const labels={in_development:'In Development',private_testing:'Private Testing',ready:'Ready to Release',live:'Live',paused:'Paused'};
const Game=()=>window.CellboundGame;
const build=()=>String(window.CELLBOUND_EPISODE_BUILD||window.CELLBOUND_BUILD||'development');
async function rpc(action,payload={}){
 const db=Game()?.getSupabase?.();if(!db)throw Error('Sign in to verify episode availability.');
 const {data,error}=await db.rpc('cellbound_episodes',{p_action:action,p_payload:payload});
 if(error)throw Error(error.message||'Episode service unavailable. No release was changed.');return data;
}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function message(text){const el=document.getElementById('episodeManagerMessage');if(el)el.textContent=text;}
async function refresh(){
 try{report=await rpc('list');render();return report;}catch(e){report=null;render();message(e.message+' Unreleased content remains closed.');return null;}
}
async function change(episode,state){
 if(busy)return;
 if(!window.confirm(`${labels[state]}: ${episode.id} — ${episode.title}\nEnvironment: ${report.environment}\nBuild: ${report.build}\nThis changes server-enforced access. Confirm?`))return;
 busy=true;render();
 try{await rpc('transition',{episode:episode.id,state,revision:episode.revision,environment:report.environment,confirm:episode.id});await refresh();message('Server confirmed the release change.');}
 catch(e){await refresh();message(e.message);}finally{busy=false;render();}
}
async function preview(episode){
 const box=document.getElementById('episodePreview');box.replaceChildren();
 try{
  // Re-query server; a local preview flag is never an authority.
  const fresh=await rpc('list');const current=fresh.episodes?.find(e=>e.id===episode.id);
  const development=fresh.environment==='isolated-development';
  if(!current||(!development&&(!fresh.owner||current.state!=='private_testing')))throw Error('Owner private testing access is required.');
  box.append(node('h3',`${current.title} — ${development?'DEV PLAYTEST':'PRIVATE TEST'}`),node('p',development?'Development access is open. Story prerequisites still apply. Progress and rewards stay in the separate development database.':'Prerequisites remain required. Production preview sessions cannot settle durable rewards.'));
  for(const id of Object.values(current.manifest).flat()){
   const def=window.CellboundEpisodeTwo?.CONTENT?.[id];
   const row=node('div',`${id} · ${def?.name||def?.title||'Registered content'}`,'episode-content-row');
   const adapter=window.CellboundEpisodeAdapters?.[id];
   const button=node('button',adapter?(development?'START DEV SESSION':'START PRIVATE SESSION'):'ENCOUNTER NOT IMPLEMENTED');
   button.disabled=!adapter;button.onclick=async()=>{try{if(adapter.authoritativeStart){await adapter.start();return;}const session=await rpc('start',{episode:current.id,content:id,build:build()});await adapter.start(session);}catch(e){message(e.message);}};
   row.append(button);box.append(row);
  }
 }catch(e){message(e.message);}
}
function render(){
 const root=document.getElementById('episodeManagerCards');if(!root)return;root.replaceChildren();
 const development=report?.environment==='isolated-development';
 const env=document.getElementById('episodeManagerEnvironment');env.textContent=report?`${development?'DEV — OPEN FOR TESTING; NO PUBLIC RELEASE CONTROLS':'OFFICIAL GAME — OWNER ACTIVATION REQUIRED'} · ${report.build} · schema ${report.schemaVersion}`:'ENVIRONMENT NOT VERIFIED — RELEASE DISABLED';
 for(const episode of report?.episodes||[]){
  const card=node('article',undefined,'episode-manager-card');
  card.append(node('small',episode.id.replace('_',' ').toUpperCase()),node('h3',episode.title),node('strong',!episode.built&&episode.id!=='episode_2'?'Not Built':labels[episode.state]));
  const m=episode.manifest;
  card.append(node('p',`${m.quests.length} quests · ${m.dungeons.length} dungeons · ${m.raids.length} raids`),node('p',development?'Development access: OPEN. Unimplemented encounters remain unavailable.':episode.ready?'Release evidence: VERIFIED for this build and schema':'Release evidence: INCOMPLETE — activation blocked'));
  if(episode.id==='episode_1'){card.append(node('p','Permanent release. Cannot be paused.'));root.append(card);continue;}
  if(development){
   card.append(node('p','No activation needed on dev. Deploying this content to the official game does not release it.'));
   const button=node('button','OPEN DEV PLAYTEST');button.disabled=busy;button.onclick=()=>preview(episode);card.append(button);root.append(card);continue;
  }
  if(report.owner){
   const states={in_development:['private_testing'],private_testing:['in_development','ready'],ready:['private_testing','live'],live:['paused'],paused:['private_testing','live']}[episode.state]||[];
   for(const state of states){const button=node('button',state==='live'?`ACTIVATE ${episode.id.replace('_',' ').toUpperCase()}`:state==='paused'?'PAUSE EPISODE':labels[state].toUpperCase());button.disabled=busy||(['ready','live'].includes(state)&&!episode.ready);button.onclick=()=>change(episode,state);card.append(button);}
   if(episode.state==='private_testing'){const button=node('button','OPEN PRIVATE PREVIEW');button.disabled=busy;button.onclick=()=>preview(episode);card.append(button);}
  }else card.append(node('p','Read-only. Public release changes require the owner.'));
  root.append(card);
 }
}
function init(){
 const admin=document.getElementById('admin');if(!admin)return;
 const section=node('section',undefined,'admin-card admin-panel-filtered episode-manager');section.dataset.adminPanel='episodes';
 const heading=node('h2','Episode Manager');const env=node('p',undefined,'episode-environment');env.id='episodeManagerEnvironment';
 const msg=node('p','Connect to the release service to inspect authoritative status.');msg.id='episodeManagerMessage';msg.setAttribute('role','status');
 const reload=node('button','REFRESH SERVER STATUS');reload.onclick=refresh;
 const cards=node('div');cards.id='episodeManagerCards';const previewBox=node('section');previewBox.id='episodePreview';
 section.append(heading,env,msg,reload,cards,previewBox);admin.append(section);render();
 window.addEventListener('cellbound:admin-panel-changed',e=>{if(e.detail?.panel==='episodes')refresh();});
}
window.CellboundEpisodes={refresh,start:(episode,content)=>rpc('start',{episode,content,build:build()}),settle:session=>rpc('settle',{session})};
init();
})();
