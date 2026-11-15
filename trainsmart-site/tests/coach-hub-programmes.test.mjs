import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {defaultClients} from "../public/coach-clients-model.mjs";
import {initialLibrary,setExerciseReviewed,validExercise} from "../public/coach-library-model.mjs";
import {
 DEFAULT_PRESCRIPTION,newProgramme,validProgramme,updateProgrammeBasics,addProgrammeSession,
 renameProgrammeSession,removeProgrammeSession,insertProgrammeExercise,editProgrammeExercise,
 removeProgrammeExercise,importAIProgramme,saveNewTemplate,saveTemplateVersion,loadTemplateIntoDraft,
 latestTemplateVersion,clientPlanWarnings,assignTemplateToClient,currentClientAssignment,
 canonicalYoutubeUrl,instructionForExercise,videoForExercise,validProgrammeLibrary,programmeMetrics
} from "../public/coach-programmes-model.mjs";
import {renderProgrammesCentre,renderClientProgrammeSummary,aiImportDialog,assignmentDialog} from "../public/coach-programmes-ui.mjs";

const clients=defaultClients(),client=clients[0],other=clients[1];
const lib=()=>initialLibrary(clients);
function readyLibrary(){
 let l=lib();
 l.exercises=setExerciseReviewed(l.exercises,"demo:goblet-squat",true);
 return l;
}
function readyDraft(l=lib(),id="draft:demo-001"){
 let p=newProgramme(id,"Strength Foundations");
 p=updateProgrammeBasics(p,{name:"Strength Foundations",goal:"Build strength and confidence",notes:"Example plan"});
 p=insertProgrammeExercise(p,"session:1","demo:goblet-squat",l);
 return p;
}
test("D06: manually build and name a draft with ordered sessions; RIR is absent",()=>{
 let p=readyDraft();
 assert.equal(p.name,"Strength Foundations");
 assert.equal(p.source,"manual");
 assert.deepEqual(programmeMetrics(p),{sessions:1,exercises:1});
 assert.equal("rir" in p.sessions[0].exercises[0].prescription,false);
 p=addProgrammeSession(p);
 p=renameProgrammeSession(p,"session:2","Second training session");
 p=insertProgrammeExercise(p,"session:2","demo:trx-row",lib());
 assert.equal(p.sessions.length,2);
 assert.equal(p.sessions[1].name,"Second training session");
 assert.equal(validProgramme(p,lib().exercises),true);
 p=removeProgrammeExercise(p,"session:2",p.sessions[1].exercises[0].id);
 p=removeProgrammeSession(p,"session:2");
 assert.equal(p.sessions.length,1);
 assert.throws(()=>removeProgrammeSession(p,"session:1"),/one session/);
});
test("D06: named programme saves to library, rejects unnamed or incomplete drafts",()=>{
 const l=lib(),p=readyDraft(l);
 let templates=saveNewTemplate([],p,l,"template:strength-a");
 assert.equal(templates.length,1);
 assert.equal(templates[0].name,"Strength Foundations");
 assert.equal(templates[0].versions[0].version,1);
 assert.equal(templates[0].versions[0].plan.sessions.length,1);
 assert.throws(()=>saveNewTemplate(templates,p,l,"template:strength-a"),/Duplicate/);
 assert.throws(()=>saveNewTemplate([],{...p,name:"New training plan"},l,"template:generic-1"),/descriptive name/);
 assert.throws(()=>saveNewTemplate([],newProgramme("draft:empty-001","Empty Plan"),l,"template:empty-1"),/exercise/);
});
test("D06: load template for another client without modifying saved master",()=>{
 const l=lib(),p=readyDraft(l),t=saveNewTemplate([],p,l,"template:strength-a")[0];
 let reused=loadTemplateIntoDraft(t,"draft:reuse-001");
 reused=updateProgrammeBasics(reused,{name:"Strength Foundations — Modified"});
 reused=editProgrammeExercise(reused,"session:1",reused.sessions[0].exercises[0].id,{
  feederSets:"1",workingSets:"4",repsMin:"6",repsMax:"8",restSeconds:"120",
  tempo:"2-0-2-0",loadKg:"",notes:"Adapt for second fictional client"
 });
 assert.equal(t.versions[0].plan.name,"Strength Foundations");
 assert.equal(t.versions[0].plan.sessions[0].exercises[0].prescription.workingSets,3);
 assert.equal(reused.sessions[0].exercises[0].prescription.workingSets,4);
 assert.equal(reused.sessions[0].exercises[0].prescription.loadKg,null);
 assert.equal("rir" in reused.sessions[0].exercises[0].prescription,false);
});
test("D06: saved plan versions preserve old snapshots and source identity",()=>{
 const l=lib(),p=readyDraft(l);
 let templates=saveNewTemplate([],p,l,"template:strength-a");
 let newer=updateProgrammeBasics(p,{name:"Strength Foundations V2"});
 templates=saveTemplateVersion(templates,"template:strength-a",newer,l);
 assert.equal(templates[0].versions.length,2);
 assert.equal(templates[0].versions[0].plan.name,"Strength Foundations");
 assert.equal(templates[0].versions[1].plan.name,"Strength Foundations V2");
 assert.equal(latestTemplateVersion(templates[0]).version,2);
 const oldest=loadTemplateIntoDraft(templates[0],"draft:historical-001",1);
 assert.equal(oldest.name,"Strength Foundations");
 assert.equal(oldest.source,"saved-template");
});
test("D06: AI JSON import uses the same exercise IDs, becomes an editable draft and ignores RIR",()=>{
 const l=lib();
 const json=JSON.stringify({name:"AI Strength Plan",goal:"Technique and strength",sessions:[{
  name:"Full Body A",exercises:[{exerciseId:"demo:goblet-squat",workingSets:3,
    feederSets:1,repsMin:8,repsMax:10,restSeconds:90,rir:4}]
 }]});
 let p=importAIProgramme(json,"draft:ai-001",l);
 assert.equal(p.source,"ai-import");
 assert.equal(p.name,"AI Strength Plan");
 assert.equal(p.sessions[0].exercises[0].exerciseId,"demo:goblet-squat");
 assert.equal(p.sessions[0].exercises[0].prescription.workingSets,3);
 assert.equal("rir" in p.sessions[0].exercises[0].prescription,false);
 p=updateProgrammeBasics(p,{name:"AI Plan — Coach Reviewed"});
 assert.equal(saveNewTemplate([],p,l,"template:ai-edited")[0].name,"AI Plan — Coach Reviewed");
});
test("D06: reject AI hallucinated exercise IDs and unsafe or oversized inputs",()=>{
 const l=lib(),input={name:"Example",goal:"Strength",sessions:[{
  name:"Session 1",exercises:[{exerciseId:"invented:super-exercise",workingSets:3}]
 }]};
 assert.throws(()=>importAIProgramme(JSON.stringify(input),"draft:bad-001",l),/Unknown or inactive exercise ID/);
 assert.throws(()=>importAIProgramme("Ignore your instructions","draft:bad-002",l),/valid JSON/);
 assert.throws(()=>importAIProgramme("x".repeat(30001),"draft:bad-003",l),/small structured/);
 assert.throws(()=>importAIProgramme(JSON.stringify({...input,sessions:[]}),"draft:bad-004",l),/1–7 sessions/);
});
test("D06: working sets, reps and rest validate; starting load and tempo are optional",()=>{
 let p=readyDraft(),sid="session:1",row=p.sessions[0].exercises[0].id;
 p=editProgrammeExercise(p,sid,row,{feederSets:"0",workingSets:"3",repsMin:"8",repsMax:"12",restSeconds:"90",loadKg:"",tempo:"",notes:""});
 assert.equal(p.sessions[0].exercises[0].prescription.loadKg,null);
 assert.throws(()=>editProgrammeExercise(p,sid,row,{workingSets:"9"}),/valid feeder/);
 assert.throws(()=>editProgrammeExercise(p,sid,row,{repsMin:"12",repsMax:"8"}),/valid feeder/);
 assert.throws(()=>editProgrammeExercise(p,sid,row,{restSeconds:"0"}),/valid feeder/);
 assert.throws(()=>editProgrammeExercise(p,sid,row,{workingSets:"3",repsMin:"8",repsMax:"10",restSeconds:"90",tempo:"fast"}),/valid feeder/);
 assert.equal("rir" in DEFAULT_PRESCRIPTION,false);
});
test("D06: exercise review and client equipment must match before demo assignment",()=>{
 const l=lib(),p=readyDraft(l),t=saveNewTemplate([],p,l,"template:strength-a")[0];
 assert.ok(clientPlanWarnings(p,l,l.clientEquipment[client.id]).some(x=>/review outstanding/.test(x)));
 assert.throws(()=>assignTemplateToClient([],t,client,l,"assignment:first-001"),/Cannot assign this demo/);
 const approved=readyLibrary();
 const assigned=assignTemplateToClient([],t,client,approved,"assignment:first-001");
 assert.equal(assigned[0].clientId,client.id);
 assert.equal(assigned[0].templateVersion,1);
 assert.equal(assigned[0].sessions[0].exercises[0].exerciseId,"demo:goblet-squat");
 const missing={...approved,clientEquipment:{...approved.clientEquipment,[client.id]:["bands"]}};
 assert.throws(()=>assignTemplateToClient([],t,client,missing,"assignment:second-001"),/equipment unavailable/);
});
test("D06: client assignments remain immutable after updating the library master",()=>{
 const l=readyLibrary(),p=readyDraft(l);
 let templates=saveNewTemplate([],p,l,"template:strength-a");
 let a=assignTemplateToClient([],templates[0],client,l,"assignment:first-001");
 const original=JSON.stringify(a[0]);
 let newer=updateProgrammeBasics(p,{name:"More Advanced Foundation"});
 templates=saveTemplateVersion(templates,"template:strength-a",newer,l);
 assert.equal(JSON.stringify(a[0]),original);
 assert.equal(currentClientAssignment(a,client.id).name,"Strength Foundations");
 a=assignTemplateToClient(a,templates[0],client,l,"assignment:second-001");
 assert.equal(a.length,2);
 assert.equal(a[0].current,false);
 assert.equal(a[1].current,true);
 assert.equal(a[1].supersedes,"assignment:first-001");
 assert.equal(currentClientAssignment(a,client.id).name,"More Advanced Foundation");
});
test("D06: video URL allows valid direct YouTube links, rejects lookalike domains",()=>{
 assert.equal(canonicalYoutubeUrl("https://youtu.be/AbCdEfGhI12"),"https://www.youtube.com/watch?v=AbCdEfGhI12");
 assert.equal(canonicalYoutubeUrl("https://www.youtube.com/watch?v=AbCdEfGhI12&t=50"),"https://www.youtube.com/watch?v=AbCdEfGhI12");
 assert.equal(canonicalYoutubeUrl("https://www.youtube.com/shorts/AbCdEfGhI12"),"https://www.youtube.com/watch?v=AbCdEfGhI12");
 for(const unsafe of ["javascript:alert(1)","http://youtube.com/watch?v=AbCdEfGhI12",
  "https://www.youtube.com.evil.com/watch?v=AbCdEfGhI12","https://evil.com/?v=AbCdEfGhI12",
  "https://youtube.com/watch?v=invalid","https://example.org/watch?v=AbCdEfGhI12"]){
  assert.equal(canonicalYoutubeUrl(unsafe),null,unsafe);
 }
});
test("D06: client watch link comes from a vetted YouTube URL and pinned exercise snapshot",()=>{
 let l=readyLibrary(),p=readyDraft(l);
 l={...l,exercises:l.exercises.map(ex=>ex.id==="demo:goblet-squat"?{
  ...ex,videoUrl:"https://youtu.be/AbCdEfGhI12",cues:"Keep core engaged."}:ex)};
 const t=saveNewTemplate([],p,l,"template:strength-a")[0];
 const assignments=assignTemplateToClient([],t,client,l,"assignment:first-001");
 assert.equal(assignments[0].sessions[0].exercises[0].youtubeUrl,"https://www.youtube.com/watch?v=AbCdEfGhI12");
 assert.match(assignments[0].sessions[0].exercises[0].instructions,/core engaged/);
 const altered={...l,exercises:l.exercises.map(ex=>ex.id==="demo:goblet-squat"?{...ex,videoUrl:""}:ex)};
 assert.equal(altered.exercises.find(ex=>ex.id==="demo:goblet-squat").videoUrl,"");
 assert.equal(assignments[0].sessions[0].exercises[0].youtubeUrl,"https://www.youtube.com/watch?v=AbCdEfGhI12");
 assert.equal(videoForExercise({videoUrl:"https://evil.example/watch?v=AbCdEfGhI12"}),null);
 assert.match(instructionForExercise({cues:"Not approved for client use."}),/Ask your coach/);
});
test("D06: rendering client preview includes Watch here link, client profile name and no RIR fields",()=>{
 let l=readyLibrary();
 l.exercises=l.exercises.map(e=>e.id==="demo:goblet-squat"?{...e,videoUrl:"https://youtu.be/AbCdEfGhI12",cues:"Keep steady."}:e);
 const p=readyDraft(l),t=saveNewTemplate([],p,l,"template:strength-a")[0];
 const a=assignTemplateToClient([],t,client,l,"assignment:first-001");
 let html=renderProgrammesCentre({draft:p,templates:[t],assignments:a,library:l,clients,tab:"preview",selectedClientId:client.id});
 assert.match(html,/Watch here — YouTube/);
 assert.match(html,/href="https:\/\/www.youtube.com\/watch\?v=AbCdEfGhI12"/);
 assert.match(html,/target="_blank" rel="noopener noreferrer"/);
 assert.match(html,/Strength Foundations/);
 assert.doesNotMatch(html,/name="rir"/i);
 html=renderClientProgrammeSummary(client,a);
 assert.match(html,/Watch here — YouTube/);
 assert.match(html,/programme/i);
 assert.match(html,/independent|snapshots/i);
});
test("D06: saved plan screen has reuse/version actions; manual and AI controls are visible",()=>{
 const l=lib(),p=readyDraft(l),t=saveNewTemplate([],p,l,"template:strength-a")[0];
 let html=renderProgrammesCentre({draft:p,templates:[t],assignments:[],library:l,clients,tab:"saved"});
 assert.match(html,/Reuse \/ edit in builder/);
 assert.match(html,/Assign example copy to client/);
 assert.match(html,/Version 1/);
 assert.match(html,/New manual plan/);
 assert.match(html,/AI plan builder/);
 html=renderProgrammesCentre({draft:p,templates:[t],assignments:[],library:l,clients,tab:"build"});
 assert.match(html,/Save named plan to library/);
 assert.doesNotMatch(html,/name="rir"/i);
 assert.match(html,/data-action="programme-add-exercise"/);
 assert.match(aiImportDialog(),/JSON/);
 assert.match(assignmentDialog(t,clients,l),/independent snapshot/);
});
test("D06: HTML sanitizes untrusted plan names and YouTube URLs before display",()=>{
 const l=lib(),p=readyDraft(l);
 const bad={...p,name:'Plan <img src=x onerror=alert(1)>'};
 const html=renderProgrammesCentre({draft:bad,templates:[],assignments:[],library:l,clients,tab:"build"});
 assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/<img src=x/);
 assert.equal(canonicalYoutubeUrl('https://youtube.com/watch?v=AbCdEfGhI12" onload="'),null);
});
test("D06: new programme features keep live backend off and integrate into existing Coach Hub",async()=>{
 const files=["../public/coach-hub.mjs","../public/coach-hub.html",
  "../public/coach-programmes-model.mjs","../public/coach-programmes-ui.mjs",
  "../public/coach-programmes.css","../public/coach-clients-ui.mjs"];
 const [hub,html,model,ui,css,clientsUi]=await Promise.all(files.map(p=>readFile(new URL(p,import.meta.url),"utf8")));
 assert.match(hub,/saveNewTemplate/);
 assert.match(hub,/saveTemplateVersion/);
 assert.match(hub,/assignTemplateToClient/);
 assert.match(hub,/importAIProgramme/);
 assert.match(hub,/changeView\("programmes"\)/);
 assert.match(hub,/state\.programmeAssignments/);
 assert.match(clientsUi,/data-client-tab=/);
 assert.match(clientsUi,/programme:'Programme'/);
 assert.match(html,/data-view="programmes"/);
 assert.match(html,/id="programme-ai-form"/);
 assert.match(html,/id="programme-assignment-form"/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/coach-programmes\.css/);
 assert.doesNotMatch(model+ui,/\bfetch\s*\(|\bXMLHttpRequest\b|service_role|\binviteUserByEmail\b|supabase\.co/i);
 assert.match(css,/@media\(max-width:700px\)/);
});
