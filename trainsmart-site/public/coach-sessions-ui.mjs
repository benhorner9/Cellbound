/* D03.3 fictional coach-led session screens. No network, client login or real training data. */
import {SESSION_TEMPLATES,COACHING_MODES,activeCoachSession,completedCoachSessions,nextExampleTemplate,coachSafetyReady,sessionCanComplete,coachSessionTotals} from "./coach-sessions-model.mjs";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateFmt=s=>s?new Date(s).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):"";
const modeLabels={coach_led:"Coach records everything",shared:"Coach + client (future)",client_led:"Client logs (future)"};
function detail(session,client){
 const template=SESSION_TEMPLATES.find(t=>t.id===session.templateId);
 return '<section class="panel coach-session-active"><div class="panel-header"><div><p class="eyebrow">IN PROGRESS · COACH-RECORDED DEMO</p><h2>'+esc(session.name)+'</h2><p class="small-muted">Logged under '+esc(client.name)+' · Started '+esc(dateFmt(session.startedAt))+'</p></div>'+
 '<span class="tag warn">Not completed</span></div>'+
 '<p class="coach-session-notice">This is an example session only, not a personalised prescription. Record made-up results to test the flow; never enter real client information in this preview.</p>'+
 '<div class="coach-session-exercises">'+session.exercises.map((x,i)=>{
  const ex=template.exercises.find(t=>t.id===x.exerciseId);
  const rows=x.sets.map((z,n)=>'<div class="coach-performed-set"><span>Set '+(n+1)+'</span><strong>'+esc(z.reps)+' reps · '+esc(z.kg)+' kg</strong>'+(z.notes?'<small>'+esc(z.notes)+'</small>':"")+'</div>').join("");
  const log=x.skipped?'<div class="coach-skip-note">Skipped — '+esc(x.skipReason)+' <button type="button" class="btn btn-ghost btn-sm" data-action="session-unskip" data-session-id="'+esc(session.id)+'" data-exercise-id="'+esc(x.exerciseId)+'">Undo skip</button></div>':
   '<form class="coach-set-form" data-session-id="'+esc(session.id)+'" data-exercise-id="'+esc(x.exerciseId)+'">'+
   '<div><label>Reps<input name="reps" type="number" min="1" max="60" step="1" inputmode="numeric" placeholder="e.g. 8" required></label></div>'+
   '<div><label>Load (kg)<input name="kg" type="number" min="0" max="400" step="0.5" inputmode="decimal" placeholder="0 = bodyweight" required></label></div>'+
   
   '<div class="coach-set-note"><label>Note (optional)<input name="notes" maxlength="150" placeholder="Technique / feedback"></label></div>'+
   '<button type="submit" class="btn btn-primary btn-sm">+ Log set</button></form>'+
   (!x.sets.length?'<form class="coach-skip-form" data-session-id="'+esc(session.id)+'" data-exercise-id="'+esc(x.exerciseId)+'"><label for="skip-'+esc(x.exerciseId)+'">Skipping this exercise?<input id="skip-'+esc(x.exerciseId)+'" name="reason" maxlength="100" placeholder="Reason (e.g. equipment unavailable)"></label><button type="submit" class="btn btn-ghost btn-sm">Skip exercise</button></form>':"");
  return '<article class="coach-exercise"><div class="coach-exercise-header"><div><span class="eyebrow">EXERCISE '+(i+1)+'</span><h3>'+esc(ex.name)+'</h3><p>'+esc(ex.target)+' · Sample only</p></div><span class="tag muted">'+x.sets.length+' logged set(s)</span></div>'+
  (rows?'<div class="coach-performed-sets">'+rows+'</div>':"")+log+'</article>';
 }).join("")+'</div>'+
 '<div class="coach-finish"><h3>Finish session</h3><p>To complete, record at least one performed set per exercise or give a reason for skipping it. At least one set must have been performed in the session.</p>'+
 '<label for="coach-finish-note">Coach summary (optional)</label><textarea id="coach-finish-note" rows="2" maxlength="400" placeholder="Example notes from the session"></textarea>'+
 '<button class="btn btn-primary" type="button" data-action="session-finish" data-session-id="'+esc(session.id)+'" '+(sessionCanComplete(session)?"":"disabled")+' >Finish & save session</button>'+
 (!sessionCanComplete(session)?'<p class="coach-session-warning">Outstanding exercises still need logged sets or a skip reason.</p>':"")+'</div></section>';
}
export function renderCoachSessions({clients,sessions,safeguards={},preferences={},selectedClientId}){
 const eligible=clients.filter(c=>c.status!=="Archived");
 const selected=eligible.find(c=>c.id===selectedClientId)||eligible[0]||null;
 const list='<section class="panel coach-session-roster"><div class="panel-header"><h3>Client sessions</h3><span class="tag muted">COACH MODE</span></div>'+
  '<p class="small-muted">Choose a fictional client. Their training record does not depend on an invitation or client login.</p>'+
  '<div class="coach-session-client-list">'+eligible.map(c=>{
   const count=completedCoachSessions(sessions,c.id).length;
   const underway=activeCoachSession(sessions,c.id);
   return '<button type="button" class="coach-session-client '+(selected?.id===c.id?"selected":"")+'" data-session-client="'+esc(c.id)+'" aria-pressed="'+(selected?.id===c.id)+'"><span class="directory-avatar">'+esc(c.initials)+'</span>'+
   '<span><strong>'+esc(c.name)+'</strong><small>'+(underway?"Session in progress":count+" completed session(s)")+'</small></span></button>';
  }).join("")+'</div></section>';
 if(!selected)return '<div class="empty"><h3>No available fictional clients</h3><p>Create a fictional client to try coach-led logging.</p></div>';
 const safety=safeguards[selected.id]||{clientId:selected.id,screeningReviewed:false,consentEvidenceChecked:false};
 const active=activeCoachSession(sessions,selected.id);
 const completed=completedCoachSessions(sessions,selected.id);
 const preference=COACHING_MODES.includes(preferences[selected.id])?preferences[selected.id]:"coach_led";
 const prefs='<section class="panel"><p class="eyebrow">COACHING DELIVERY</p><h3>Client participation</h3><p class="small-muted">Coach-managed works even if the client has never logged in. Changing this preference will not delete their history.</p>'+
 '<div class="coach-mode-options">'+COACHING_MODES.map(m=>'<button class="seg '+(preference===m?"active":"")+'" type="button" data-action="session-mode" data-client-id="'+esc(selected.id)+'" data-mode="'+esc(m)+'" aria-pressed="'+(preference===m)+'">'+esc(modeLabels[m])+'</button>').join("")+'</div>'+
 '<div class="coach-login-independent"><strong><span class="coach-green-dot">●</span> Client login: not required for coach recording</strong><p>Only an authorised coach can record sessions in the finished system. This fictional preview does not authenticate anyone.</p></div></section>';
 let current="";
 if(active){current=detail(active,selected);}
 else{
 const upcoming=nextExampleTemplate(sessions,selected.id);
 current='<section class="panel"><div class="panel-header"><div><p class="eyebrow">READY TO RECORD · DEMO WORKOUT</p><h3>'+esc(upcoming.name)+'</h3></div><span class="tag muted">'+(completed.length+1)+' · sample session</span></div>'+
 '<p class="coach-session-notice">This sample session is provided for interface testing only. Real exercise selections must come from a coach-approved plan. There is no client login requirement.</p>'+
 (!coachSafetyReady(safety)?
  '<div class="coach-preflight"><h3>Before an in-person session</h3><p>In the live system, the coach must verify that real pre-exercise screening and signed exercise consent evidence exist. Here you can only practise confirming fictional checks. These buttons do not create legal consent or medical clearance.</p>'+
  '<div class="coach-safety-row"><span>'+(safety.screeningReviewed?"✓":"○")+' Example health-screening evidence reviewed</span>'+
  '<button class="btn btn-outline btn-sm" data-action="session-safety" data-client-id="'+esc(selected.id)+'" data-check="screeningReviewed">'+(safety.screeningReviewed?"Undo demo check":"Confirm demo check")+'</button></div>'+
  '<div class="coach-safety-row"><span>'+(safety.consentEvidenceChecked?"✓":"○")+' Example exercise-consent evidence checked</span>'+
  '<button class="btn btn-outline btn-sm" data-action="session-safety" data-client-id="'+esc(selected.id)+'" data-check="consentEvidenceChecked">'+(safety.consentEvidenceChecked?"Undo demo check":"Confirm demo check")+'</button></div></div>':
  '<div class="coach-safety-confirmed"><span>✓</span><div><strong>Example screening and consent checks recorded</strong><p>This is fictional. Actual health/consent approval and storage will be required before serving real clients.</p></div></div>')+
 '<button class="btn btn-primary" type="button" data-action="session-start" data-client-id="'+esc(selected.id)+'" '+(!coachSafetyReady(safety)?"disabled":"")+' >Start '+esc(upcoming.name)+'</button></section>';
 }
 const history='<section class="panel"><div class="panel-header"><h3>Recorded sessions</h3><span class="tag muted">'+completed.length+' complete</span></div>'+
 (completed.length?completed.map(s=>{
  const total=coachSessionTotals(s);
  const tmpl=SESSION_TEMPLATES.find(x=>x.id===s.templateId);
  return '<details class="coach-history-item"><summary><strong>'+esc(s.name)+'</strong><span>'+esc(dateFmt(s.completedAt))+' · '+total.performed+' sets · '+total.skipped+' skipped</span></summary>'+
  '<div class="coach-history-detail">'+s.exercises.map(ex=>{
   const t=tmpl.exercises.find(x=>x.id===ex.exerciseId);
   return '<div><strong>'+esc(t.name)+'</strong><span>'+esc(ex.skipped?"Skipped: "+ex.skipReason:ex.sets.map(z=>z.reps+" reps @ "+z.kg+" kg").join("; "))+'</span></div>';
  }).join("")+'</div>'+(s.coachNote?'<p class="small-muted">Coach note: '+esc(s.coachNote)+'</p>':"")+'</details>';
 }).join(""):'<div class="empty"><h3>No sessions recorded yet</h3><p>After your first fictional session, its completed sets will appear here.</p></div>')+'</section>';
 return '<div class="coach-session-layout">'+list+'<div class="coach-session-main"><div class="coach-client-heading"><div><p class="eyebrow">COACH-LED SESSION LOG · FICTIONAL</p><h2>'+esc(selected.name)+'</h2><p>Existing records stay in this client profile whether they use the app or not.</p></div>'+
 '<button type="button" class="btn btn-ghost" data-action="session-profile" data-client-id="'+esc(selected.id)+'">Open profile</button></div>'+
 prefs+current+history+'</div></div>'+
 '<p class="footer-bits">Fictional in-browser session records only. Client logins, live training programme assignments, signed documents and clinical screening are not connected to this preview.</p>';
}

export function renderClientSessionSummary(client,sessions){
 const active=activeCoachSession(sessions,client.id);
 const done=completedCoachSessions(sessions,client.id);
 return '<div class="coach-profile-sessions"><div class="panel-header"><h3>Coach-recorded sessions</h3><span class="tag muted">'+done.length+' completed</span></div>'+
 '<p class="small-muted">Sessions are attached to this client profile. A client login is optional and never required for the coach to record a session.</p>'+
 '<div class="wizard-actions"><button type="button" class="btn btn-primary" data-action="run-session" data-client-id="'+esc(client.id)+'">'+
 esc(active?"Continue active session":"Run a coach-led session")+'</button></div>'+
 (done.length?'<div class="coach-history-detail">'+done.slice(0,5).map(x=>'<div><strong>'+esc(x.name)+'</strong><span>'+esc(dateFmt(x.completedAt))+' · '+coachSessionTotals(x).performed+' performed sets</span></div>').join("")+'</div>':
 '<div class="empty"><h3>No sessions recorded yet</h3><p>Start a sample coach-led session to test the recording flow.</p></div>')+'</div>';
}
