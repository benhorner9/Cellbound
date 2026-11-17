/*
 * Coach Hub D02 fictional client directory UI.
 * Pure markup helpers: no requests, no secrets, no direct persistence.
 */
import {clientOverview,CLIENT_STATUSES} from "./coach-clients-model.mjs";
const safe = v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function chip(status){
 const color=status==="Active"?"good":status==="Archived"?"muted":status==="Paused"?"warn":"muted";
 return '<span class="tag '+color+'">'+safe(status)+'</span>';
}
function overview(client,tasks,sorted,actionable,taskRow,enrolment,renderFreshSection,coachSessions,renderClientSessionSummary,programmeAssignments,renderClientProgrammeSummary){
 const due=sorted(tasks.filter(t=>t.clientId===client.id && t.status!=="completed"));
 const active=due.filter(actionable);
 return '<div class="client-profile-head"><div class="profile-avatar">'+safe(client.initials)+'</div>'+
 '<div class="profile-identity"><p class="eyebrow">FICTIONAL CLIENT</p><h2>'+safe(client.name)+'</h2>'+
 '<div class="profile-meta">'+chip(client.status)+'<span class="small-muted">'+safe(client.experience)+' · '+safe(client.trainingDays)+' sessions per week</span></div></div>'+
 '<div class="profile-head-actions"><a class="btn btn-outline" href="./coach-client.html?client='+encodeURIComponent(client.id)+'">Preview client app</a><button type="button" class="btn btn-primary" data-action="edit-client" data-client-id="'+safe(client.id)+'">Edit profile</button>'+
 '<button type="button" class="btn btn-outline" data-action="run-session" data-client-id="'+safe(client.id)+'">Run session</button>'+
 '<button type="button" class="btn btn-outline" data-action="open-onboarding" data-client-id="'+safe(client.id)+'">Onboarding</button>'+
 (client.status==="Archived"?'<button type="button" class="btn btn-ghost" data-action="restore-client" data-client-id="'+safe(client.id)+'">Restore</button>':'<button type="button" class="btn btn-ghost" data-action="archive-client" data-client-id="'+safe(client.id)+'">Archive</button>')+
 '</div></div><div class="profile-tabbar" role="group" aria-label="Client details sections">'+
 ['overview','enrolment','contact','baseline','documents','programme','sessions','coaching','notes','timeline'].map(v=>{const label=({enrolment:'Fresh start',contact:'Contacts',baseline:'Measurements',documents:'Documents',programme:'Programme',sessions:'Sessions'})[v]||v.charAt(0).toUpperCase()+v.slice(1);return '<button type="button" class="seg '+(client._currentTab===v?"active":"")+'" data-client-tab="'+v+'">'+label+'</button>';}).join("")+'</div>'+
 (client._currentTab==="enrolment"||client._currentTab==="contact"||client._currentTab==="baseline"||client._currentTab==="documents"?renderFreshSection(client,enrolment,client._currentTab):client._currentTab==="coaching"?
  '<div class="details-two"><div class="detail-tile"><small>Training goal</small><strong>'+safe(client.goal)+'</strong></div>'+
  '<div class="detail-tile"><small>Experience</small><strong>'+safe(client.experience)+'</strong></div>'+
  '<div class="detail-tile"><small>Days per week</small><strong>'+safe(client.trainingDays)+'</strong></div>'+
  '<div class="detail-tile"><small>Session length</small><strong>'+safe(client.sessionMinutes)+' min</strong></div>'+
  '<div class="detail-tile client-span-two"><small>Available equipment</small><strong>'+safe(client.equipment||"Not specified")+'</strong></div></div>':
 client._currentTab==="programme"?renderClientProgrammeSummary(client,programmeAssignments):
 client._currentTab==="sessions"?renderClientSessionSummary(client,coachSessions):client._currentTab==="notes"?
  '<div class="client-note"><p class="eyebrow">COACH-ONLY DEMONSTRATION</p><p>'+safe(client.privateNotes||"No fictional coach notes yet.")+'</p>'+
  '<button class="btn btn-ghost btn-sm" data-action="edit-client" data-client-id="'+safe(client.id)+'">Edit notes</button></div>':
 client._currentTab==="timeline"?
  '<div class="client-timeline" id="profile-timeline"></div>':
 renderFreshSection(client,enrolment,'overview')+'<div class="details-two">'+
 '<div class="detail-tile"><small>Goal</small><strong>'+safe(client.goal)+'</strong></div>'+
 '<div class="detail-tile"><small>Current programme</small><strong>'+safe(client.plan)+'</strong></div>'+
 '<div class="detail-tile"><small>Training phase</small><strong>'+safe(client.phase)+'</strong></div>'+
 '<div class="detail-tile"><small>Weekly progress (example)</small><strong>'+safe(client.progress)+'</strong></div>'+
 '<div class="detail-tile"><small>Check-in (example)</small><strong>'+safe(client.checkin)+'</strong></div>'+
 '<div class="detail-tile"><small>Onboarding stage</small><strong>'+safe(client.onboarding)+'</strong></div></div>'+
 '<div class="divider-line"></div><div class="panel-header"><h3>Next actions for this client</h3><button class="subdued-link" data-action="client-task" data-client-id="'+safe(client.id)+'">+ Add task</button></div>'+
 (due.length?'<div class="task-list">'+due.map(t=>taskRow(t)).join("")+'</div>':'<div class="empty"><h3>Nothing waiting</h3><p>No open coaching tasks for this fictional client.</p></div>')+
 '<p class="footer-bits">'+active.length+' actionable item(s) · Data is fictional and lives in this browser session only.</p>');
}
export function renderClientDirectory({clients,tasks,selectedClientId,clientTab="overview",clientFilter="all",clientSearch="",clientEvents=[],taskRow,sortedTasks,actionable,enrolments={},renderFreshSection=()=>"",coachSessions=[],renderClientSessionSummary=()=>"",programmeAssignments=[],renderClientProgrammeSummary=()=>""}){
 const stats=clientOverview(clients,tasks);
 const counts='<div class="client-stats">'+
 [['Active',stats.active],['Onboarding',stats.onboarding],['Paused',stats.paused],['Archived',stats.archived]].map(([name,num])=>'<div class="stat"><p class="stat-label">'+name+'</p><div class="stat-number">'+num+'</div></div>').join("")+'</div>';
 const selected=clients.find(c=>c.id===selectedClientId);
 if(selected){
  const named={...selected,_currentTab:clientTab};
  const history=clientEvents.filter(e=>e.clientId===selected.id).slice().reverse().slice(0,18);
  const panel=overview(named,tasks,sortedTasks,actionable,taskRow,enrolments[named.id],renderFreshSection,coachSessions,renderClientSessionSummary,programmeAssignments,renderClientProgrammeSummary);
  const timeline='<div class="client-timeline">'+
  (history.length?history.map(e=>'<div class="client-event"><span class="activity-dot"></span><div><strong>'+safe(e.label)+'</strong><small>'+safe(e.at)+'</small></div></div>').join(""):'<p class="no-items">No changes in this fictional browser session yet.</p>')+
  '</div>';
  return '<button type="button" class="back-link" data-action="back-clients">← All clients</button><section class="panel client-profile">'+panel.replace('<div class="client-timeline" id="profile-timeline"></div>',timeline)+'</section>';
 }
 const countsBy={all:stats.total,Active:stats.active,Onboarding:stats.onboarding,Paused:stats.paused,Archived:stats.archived};
 const displayed=clients.filter(c=>(clientFilter==="all"||c.status===clientFilter)&&[c.name,c.goal,c.plan,c.equipment].some(v=>String(v||"").toLowerCase().includes(clientSearch.toLowerCase().trim())));
 const filters=['all',...CLIENT_STATUSES];
 const top='<div class="panel-header"><div><h3>Client management</h3><p class="small-muted">Create, review and update fictional coaching profiles.</p></div><button type="button" class="btn btn-primary" data-action="new-client">+ Add fictional client</button></div>';
 const filterBar='<div class="segment client-filters" role="group" aria-label="Filter clients">'+filters.map(f=>'<button type="button" class="seg '+(clientFilter===f?"active":"")+'" data-client-filter="'+safe(f)+'" aria-pressed="'+(clientFilter===f)+'">'+safe(f==="all"?"All clients":f)+' <span class="task-count">'+countsBy[f]+'</span></button>').join("")+'</div>';
 const list='<div class="client-directory-list">'+displayed.map(c=>{
  const pending=tasks.filter(t=>t.clientId===c.id&&actionable(t)).length;
  return '<article class="directory-card" data-client-search="'+safe((c.name+' '+c.goal+' '+c.plan+' '+c.equipment).toLowerCase())+'"><div class="directory-avatar">'+safe(c.initials)+'</div><div class="directory-info"><h3>'+safe(c.name)+'</h3><p>'+safe(c.goal)+'</p><div class="directory-badges">'+chip(c.status)+'<span class="tag muted">'+safe(c.plan)+'</span>'+(pending?'<span class="tag warn">'+pending+' task(s)</span>':'')+'</div></div><div class="directory-actions"><button class="btn btn-outline btn-sm" data-action="client" data-client-id="'+safe(c.id)+'">Open profile</button><button class="btn btn-ghost btn-sm" data-action="edit-client" data-client-id="'+safe(c.id)+'">Edit</button></div></article>';
 }).join("")+'</div>';
 return counts+'<section class="panel"><div class="client-directory-top">'+top+'<div class="search-wrap"><label class="sr-label" for="client-search">Search clients</label><input class="search" id="client-search" type="search" value="'+safe(clientSearch)+'" placeholder="Search fictional clients, goals, plans or equipment" autocomplete="off" aria-label="Search fictional clients"><span id="client-match-count" class="small-muted">'+displayed.length+' matching</span></div>'+filterBar+'</div>'+
 (displayed.length?list:'<div class="empty"><h3>No clients match</h3><p>Try a different name, search term or status filter.</p></div>')+
 '<p class="footer-bits">This is a fictional demo. Personal information entered here is not secure real-client storage. No invitations or notifications are sent.</p></section>';
}
