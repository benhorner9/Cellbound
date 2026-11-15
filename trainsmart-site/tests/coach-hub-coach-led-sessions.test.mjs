import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {defaultClients} from "../public/coach-clients-model.mjs";
import {renderClientDirectory} from "../public/coach-clients-ui.mjs";
import {
 SESSION_TEMPLATES,COACHING_MODES,initialCoachSafety,validateSafety,setCoachSafety,coachSafetyReady,
 validCoachSession,activeCoachSession,completedCoachSessions,nextExampleTemplate,startCoachSession,
 logCoachSet,setCoachExerciseSkipped,sessionCanComplete,finishCoachSession,coachSessionTotals,changeCoachingPreference
} from "../public/coach-sessions-model.mjs";
import {renderCoachSessions,renderClientSessionSummary} from "../public/coach-sessions-ui.mjs";
const clients=defaultClients();
const a=clients[0],b=clients[1];
function safety(id=a.id){
 let s=initialCoachSafety(id);
 s=setCoachSafety(s,"screeningReviewed",true);
 return setCoachSafety(s,"consentEvidenceChecked",true);
}
function openFor(id=a.id){return startCoachSession([],id,safety(id)).record;}
function completeDemo(sessions,session){
 let all=sessions;
 for(const ex of session.exercises){
  all=logCoachSet(all,session.id,ex.exerciseId,{reps:"8",kg:"12",rir:"2",notes:"Demo"});
 }
 return finishCoachSession(all,session.id,"Fictional session completed");
}
test("D03.3: recording mode is a coaching preference, not a client login state",()=>{
 assert.deepEqual(COACHING_MODES,["coach_led","shared","client_led"]);
 assert.equal(changeCoachingPreference("client_led","coach_led"),"coach_led");
 assert.throws(()=>changeCoachingPreference("coach_led","no_account"),/valid/);
 assert.equal(SESSION_TEMPLATES.length,2);
 assert.ok(SESSION_TEMPLATES.every(t=>t.exercises.length===3));
});
test("D03.3: client login does not exist in the session start inputs",()=>{
 let e=initialCoachSafety(a.id);
 assert.equal(coachSafetyReady(e),false);
 assert.equal(validateSafety(e,a.id),true);
 assert.throws(()=>startCoachSession([],a.id,e),/screening and exercise consent/);
 e=setCoachSafety(e,"screeningReviewed",true);
 assert.equal(coachSafetyReady(e),false);
 e=setCoachSafety(e,"consentEvidenceChecked",true);
 assert.equal(coachSafetyReady(e),true);
 const {sessions,record}=startCoachSession([],a.id,e);
 assert.equal(sessions.length,1);
 assert.equal(record.clientId,a.id);
 assert.equal(record.mode,"coach_led");
 assert.equal(record.status,"in_progress");
 assert.equal("authUserId" in record,false);
 assert.equal("invitationStatus" in record,false);
 assert.ok(validCoachSession(record));
});
test("D03.3: session starts with no invented performed sets, and a second active session is blocked",()=>{
 const {record,sessions}=startCoachSession([],a.id,safety());
 assert.equal(record.exercises.reduce((n,e)=>n+e.sets.length,0),0);
 assert.equal(sessionCanComplete(record),false);
 assert.throws(()=>startCoachSession(sessions,a.id,safety()),/Finish.*current session/);
 assert.equal(activeCoachSession(sessions,a.id)?.id,record.id);
 assert.equal(activeCoachSession(sessions,b.id),null);
});
test("D03.3: recorded actual reps, load and RIR validate ranges; no fabricated loads",()=>{
 const rec=openFor();
 const original=[rec];
 assert.throws(()=>logCoachSet(original,rec.id,rec.exercises[0].exerciseId,{reps:"",kg:"15"}),/actual reps/);
 assert.throws(()=>logCoachSet(original,rec.id,rec.exercises[0].exerciseId,{reps:"10",kg:"-1"}),/recorded load/);
 assert.throws(()=>logCoachSet(original,rec.id,rec.exercises[0].exerciseId,{reps:"8",kg:"20",rir:"6"}),/RIR/);
 assert.throws(()=>logCoachSet(original,rec.id,"unknown",{reps:8,kg:20}),/not part/);
 const out=logCoachSet(original,rec.id,rec.exercises[0].exerciseId,{reps:"8",kg:"0",rir:"3",notes:"Bodyweight exercise"});
 assert.equal(out[0].exercises[0].sets[0].kg,0);
 assert.equal(out[0].exercises[0].sets[0].reps,8);
 assert.equal(out[0].exercises[0].sets[0].rir,3);
 assert.equal(original[0].exercises[0].sets.length,0);
});
test("D03.3: a skipped exercise requires a reason and cannot overwrite performed sets",()=>{
 const rec=openFor();
 assert.throws(()=>setCoachExerciseSkipped([rec],rec.id,rec.exercises[1].exerciseId,""),/reason/);
 let sessions=setCoachExerciseSkipped([rec],rec.id,rec.exercises[1].exerciseId,"Equipment unavailable");
 assert.equal(sessions[0].exercises[1].skipped,true);
 assert.throws(()=>logCoachSet(sessions,rec.id,rec.exercises[1].exerciseId,{reps:8,kg:12}),/Unskip/);
 sessions=setCoachExerciseSkipped(sessions,rec.id,rec.exercises[1].exerciseId);
 assert.equal(sessions[0].exercises[1].skipped,false);
 sessions=logCoachSet(sessions,rec.id,rec.exercises[1].exerciseId,{reps:8,kg:12});
 assert.throws(()=>setCoachExerciseSkipped(sessions,rec.id,rec.exercises[1].exerciseId,"Skip"),/performed/);
});
test("D03.3: session finish requires a performed set for every unskipped exercise",()=>{
 const rec=openFor();
 assert.throws(()=>finishCoachSession([rec],rec.id),/Log at least/);
 let sessions=[rec];
 sessions=logCoachSet(sessions,rec.id,rec.exercises[0].exerciseId,{reps:8,kg:10});
 sessions=setCoachExerciseSkipped(sessions,rec.id,rec.exercises[1].exerciseId,"Injury precaution in demo");
 sessions=setCoachExerciseSkipped(sessions,rec.id,rec.exercises[2].exerciseId,"Demo equipment unavailable");
 assert.equal(sessionCanComplete(sessions[0]),true);
 const done=finishCoachSession(sessions,rec.id,"Example training notes");
 assert.equal(done[0].status,"completed");
 assert.ok(done[0].completedAt);
 assert.deepEqual(coachSessionTotals(done[0]),{performed:1,skipped:2,exercises:3});
 assert.throws(()=>logCoachSet(done,rec.id,rec.exercises[0].exerciseId,{reps:9,kg:15}),/cannot be edited/);
 assert.throws(()=>finishCoachSession(done,rec.id),/cannot be edited/);
});
test("D03.3: historic completed sessions stay attached to the correct client and next example cycles",()=>{
 let rec=openFor(),sessions=[rec];
 sessions=completeDemo(sessions,rec);
 assert.equal(completedCoachSessions(sessions,a.id).length,1);
 assert.equal(completedCoachSessions(sessions,b.id).length,0);
 assert.equal(nextExampleTemplate(sessions,a.id).id,"example-b");
 const next=startCoachSession(sessions,a.id,safety());
 assert.equal(next.record.templateId,"example-b");
 assert.equal(next.record.id,"coach-demo:"+a.id+":2");
 assert.equal(completedCoachSessions(next.sessions,a.id)[0].id,rec.id);
});
test("D03.3: in-progress sessions remain valid and reusable after JSON session serialization",()=>{
 const rec=openFor();
 const copy=JSON.parse(JSON.stringify([rec]));
 assert.ok(validCoachSession(copy[0]));
 assert.equal(activeCoachSession(copy,a.id)?.id,rec.id);
 assert.equal(activeCoachSession(copy,b.id),null);
});
test("D03.3: fictional coach-led UI shows a profile-linked history without requiring account activation",()=>{
 const rec=openFor();
 let html=renderCoachSessions({clients,sessions:[rec],safeguards:{[a.id]:safety()},preferences:{[a.id]:"coach_led"},selectedClientId:a.id});
 assert.match(html,/Client login: not required for coach recording/);
 assert.match(html,/session-set-form|coach-set-form/);
 assert.match(html,/data-action="session-finish"/);
 assert.match(html,/Log set/);
 assert.match(html,/Dumbbell Goblet Squat/);
 assert.match(html,/data-action="session-profile"/);
 assert.doesNotMatch(html,/Invite client to TrainSmart/);
 const list=renderClientSessionSummary(a,[rec]);
 assert.match(list,/Continue active session/);
 let finished=completeDemo([rec],rec);
 html=renderClientSessionSummary(a,finished);
 assert.match(html,/1 completed/);
 assert.match(html,/performed sets/);
 const other=renderClientSessionSummary(b,finished);
 assert.match(other,/No sessions recorded yet/);
});
test("D03.3: notes and displayed client names are escaped, preventing injection into the demo",()=>{
 const rec=openFor();
 let sessions=[rec];
 sessions=logCoachSet(sessions,rec.id,rec.exercises[0].exerciseId,{reps:8,kg:15,notes:'<img src=x onerror=alert(1)>'});
 const html=renderCoachSessions({clients:[{...a,name:'Fake <script>bad</script>'}],sessions,safeguards:{[a.id]:safety()},selectedClientId:a.id});
 assert.match(html,/&lt;img/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>bad/);
 assert.doesNotMatch(html,/<img src=x/);
});
test("D03.3: client profile includes linked Sessions tab and Run session action",()=>{
 const html=renderClientDirectory({clients,tasks:[],selectedClientId:a.id,clientTab:"sessions",
  taskRow:()=>"",sortedTasks:x=>x,actionable:()=>false,
  coachSessions:[],renderClientSessionSummary});
 assert.match(html,/data-action="run-session"/);
 assert.match(html,/data-client-tab="sessions"/);
 assert.match(html,/No sessions recorded yet/);
 assert.match(html,/data-client-tab="overview">Overview/);
});
test("D03.3: integration and CSS keep all session data isolated from real accounts",async()=>{
 const paths=["../public/coach-hub.mjs","../public/coach-hub.html","../public/coach-sessions-model.mjs","../public/coach-sessions-ui.mjs","../public/coach-sessions.css"];
 const [hub,html,model,ui,css]=await Promise.all(paths.map(async p=>readFile(new URL(p,import.meta.url),"utf8")));
 assert.match(hub,/state\.coachSessions/);
 assert.match(hub,/startCoachSession/);
 assert.match(hub,/logCoachSet/);
 assert.match(hub,/finishCoachSession/);
 assert.match(hub,/changeView\("sessions"\)/);
 assert.match(hub,/\.coach-set-form/);
 assert.match(html,/data-view="sessions"/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/coach-sessions\.css/);
 assert.doesNotMatch(model+ui,/\bfetch\s*\(|\bXMLHttpRequest\b|https:\/\/|supabase\.co|service_role|\binviteUserByEmail\b/i);
 assert.match(css,/@media\(max-width:700px\)/);
});
