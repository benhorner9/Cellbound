import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {initialLibrary,setExerciseReviewed} from "../public/coach-library-model.mjs";
import {
 emptyAIBrief,validAIBrief,validateAIBrief,aiBriefFromClient,createAIRequest,
 parseAIResponse,aiExampleResponse
} from "../public/coach-ai-brief-model.mjs";
import {renderAIBriefWorkflow} from "../public/coach-ai-brief-ui.mjs";
import {validProgramme,saveNewTemplate,assignTemplateToClient} from "../public/coach-programmes-model.mjs";

const client={id:"demo-123",name:"TEST PRIVATE NAME",goal:"Build strength",experience:"beginner",
 trainingDays:2,sessionMinutes:45,status:"Active",contact:"test@email.example",equipment:"Dumbbells, bands"};
const lib=()=>initialLibrary([client]);
const brief=()=>({...emptyAIBrief(),name:"Example Strength Plan",goal:"Build strength safely",sessionsPerWeek:2,equipment:["dumbbells","bands","bodyweight"]});

test("D06.1: default AI brief is valid and includes no identifying client fields",()=>{
 const b=emptyAIBrief();
 assert.equal(validAIBrief(b),true);
 assert.equal("clientName" in b,false);
 assert.equal("clientId" in b,false);
 assert.equal("email" in b,false);
 assert.equal("medicalHistory" in b,false);
 assert.equal(b.sessionsPerWeek,3);
});
test("D06.1: select a demo client to prefill non-identifying coaching details",()=>{
 const b=aiBriefFromClient(client,lib());
 assert.equal(b.goal,client.goal);
 assert.equal(b.experience,"beginner");
 assert.equal(b.sessionsPerWeek,2);
 assert.equal(b.sessionMinutes,45);
 assert.equal("clientId" in b,false);
 assert.equal("name" in b,true);
 const prompt=createAIRequest(b,lib());
 assert.doesNotMatch(prompt,/TEST PRIVATE NAME/);
 assert.doesNotMatch(prompt,/test@email\.example/);
 assert.doesNotMatch(prompt,/demo-123/);
});
test("D06.1: brief has exact exercise IDs, output shape, no RIR or automatic publishing",()=>{
 const prompt=createAIRequest(brief(),lib());
 assert.match(prompt,/TRAINSMART COACHING — ANONYMOUS/);
 assert.match(prompt,/coachBrief: /);
 assert.match(prompt,/allowedExercises: /);
 assert.match(prompt,/demo:goblet-squat/);
 assert.match(prompt,/EXACT_ID_FROM_ALLOWED_LIST/);
 assert.match(prompt,/Produce exactly ONE valid JSON object/);
 assert.doesNotMatch(prompt,/\\\"rir\\\"/i);
 assert.match(prompt,/Do NOT include RIR/);
 assert.match(prompt,/qualified coach/);
 assert.ok(prompt.length<30000);
});
test("D06.1: beginner and restricted equipment filter candidate exercise IDs",()=>{
 const b={...brief(),equipment:["bands"],experience:"beginner"};
 const prompt=createAIRequest(b,lib());
 const list=JSON.parse(prompt.split("allowedExercises: ")[1]);
 assert.ok(list.length>0);
 assert.ok(list.every(x=>x.requiredEquipment.every(id=>id==="bands")));
 assert.ok(!list.some(x=>x.exerciseId==="demo:bb-deadlift"));
});
test("D06.1: no equipped exercises blocks brief generation",()=>{
 assert.throws(()=>createAIRequest({...brief(),equipment:["medicine-balls"],experience:"beginner"},lib()),/No example exercises/);
});
test("D06.1: reject client contact identifiers and health information from coach text",()=>{
 for(const testText of ["client@example.com","+44 7700 900123","medical history of patient","NHS number 1234"]){
  assert.throws(()=>validateAIBrief({...brief(),coachingNotes:testText}),/Remove contact information/);
 }
 assert.throws(()=>validateAIBrief({...brief(),goal:""}),/Complete a plan name/);
 assert.throws(()=>validateAIBrief({...brief(),sessionsPerWeek:0}),/Complete a plan name/);
 assert.throws(()=>validateAIBrief({...brief(),equipment:[]}),/Complete a plan name/);
});
test("D06.1: example JSON roundtrip produces full editable programme",()=>{
 const b=brief(),l=lib(),p=createAIRequest(b,l);
 assert.ok(p.length>100);
 const sample=aiExampleResponse(b,l);
 const draft=parseAIResponse(sample,"draft:ai-brief-001",l,b);
 assert.equal(draft.name,b.name);
 assert.equal(draft.sessions.length,2);
 assert.equal(draft.source,"ai-import");
 assert.ok(draft.sessions.every(x=>x.exercises.length>0));
 assert.equal(validProgramme(draft,l.exercises),true);
 assert.equal("rir" in draft.sessions[0].exercises[0].prescription,false);
});
test("D06.1: pasted markdown JSON code fence is supported, never execute arbitrary code",()=>{
 const b=brief(),l=lib(),json=aiExampleResponse(b,l);
 const result=parseAIResponse("```json\n"+json+"\n```","draft:ai-brief-002",l,b);
 assert.equal(result.sessions.length,2);
 assert.throws(()=>parseAIResponse("```json\n"+json+"\n``` plus extra", "draft:ai-brief-003",l,b),/complete JSON/);
 assert.throws(()=>parseAIResponse("This is my plan", "draft:ai-brief-004",l,b),/valid JSON/);
});
test("D06.1: mismatch with requested session count must be corrected",()=>{
 const b=brief(),l=lib(),obj=JSON.parse(aiExampleResponse(b,l));
 obj.sessions.pop();
 assert.throws(()=>parseAIResponse(JSON.stringify(obj),"draft:ai-brief-005",l,b),/requires 2/);
});
test("D06.1: equipment and experience constraints are rechecked on pasted plan",()=>{
 const b={...brief(),equipment:["bands"],experience:"beginner"};
 const l=lib(),obj=JSON.parse(aiExampleResponse(b,l));
 obj.sessions[0].exercises[0].exerciseId="demo:bb-deadlift";
 assert.throws(()=>parseAIResponse(JSON.stringify(obj),"draft:ai-brief-006",l,b),/does not match/);
});
test("D06.1: hallucinated exercise IDs do not become a plan",()=>{
 const b=brief(),l=lib(),obj=JSON.parse(aiExampleResponse(b,l));
 obj.sessions[0].exercises[0].exerciseId="invented:curl-master";
 assert.throws(()=>parseAIResponse(JSON.stringify(obj),"draft:ai-brief-007",l,b),/Unknown or inactive/);
});
test("D06.1: AI output can be named and saved; client assignment remains controlled",()=>{
 const b=brief(),l=lib(),draft=parseAIResponse(aiExampleResponse(b,l),"draft:ai-brief-008",l,b);
 const saved=saveNewTemplate([],draft,l,"template:demo-ai-008");
 assert.equal(saved.length,1);
 assert.equal(saved[0].name,b.name);
 assert.throws(()=>assignTemplateToClient([],saved[0],client,l,"assignment:demo-ai-001"),/Cannot assign/);
 const reviewed={...l,exercises:l.exercises.map(e=>({...e,reviewStatus:"demo-reviewed"}))};
 const assigned=assignTemplateToClient([],saved[0],client,reviewed,"assignment:demo-ai-002");
 assert.equal(assigned[0].clientId,client.id);
 assert.equal(assigned[0].name,b.name);
});
test("D06.1: UI exposes three guided steps, two copy-paste boxes, and demo-only wording",()=>{
 const b=brief(),l=lib(),prompt=createAIRequest(b,l),reply=aiExampleResponse(b,l);
 const html=renderAIBriefWorkflow({brief:b,prompt,reply,clients:[client],clientId:""});
 for(const fragment of ["Training requirements","Copy your brief","Import the plan","Prepare brief","Copy brief","Load example",
  "Open in plan editor","Save","fictional","Open ChatGPT"]){
  assert.ok(html.includes(fragment),fragment);
 }
 assert.match(html,/id="ai-request-box"/);
 assert.match(html,/id="ai-response-box"/);
 assert.match(html,/readonly/);
 assert.match(html,/data-ai-equipment="dumbbells"/);
 assert.match(html,/rel="noopener noreferrer"/);
 assert.doesNotMatch(html,/data-ai-field="rir"/);
});
test("D06.1: UI escapes pasted model response and coach notes, including injection strings",()=>{
 const b={...brief(),preferences:'<img src=x onerror=alert(1)>'};
 const html=renderAIBriefWorkflow({brief:b,prompt:"",reply:"<script>alert(1)</script>",clients:[client]});
 assert.match(html,/&lt;img/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>alert/);
});
test("D06.1: the published demo integrates source only; no AI API or external data upload",async()=>{
 const files=["../public/coach-hub.mjs","../public/coach-programmes-ui.mjs","../public/coach-hub.html","../public/coach-ai-brief-ui.mjs",
  "../public/coach-ai-brief-model.mjs","../public/coach-ai-brief.css"];
 const [hub,programmes,html,ui,model,css]=await Promise.all(files.map(p=>readFile(new URL(p,import.meta.url),"utf8")));
 assert.match(hub,/createAIRequest/);
 assert.match(hub,/parseAIResponse/);
 assert.match(hub,/copyAIBrief/);
 assert.match(hub,/aiBriefChanged/);
 assert.match(programmes,/renderAIBriefWorkflow/);
 assert.match(programmes,/Create with ChatGPT/);
 assert.match(html,/coach-ai-brief\.css/);
 assert.match(html,/connect-src 'none'/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.doesNotMatch(ui+model,/\bfetch\s*\(|\bXMLHttpRequest\s*\(|openai\.com\/api|supabase\.co|service_role|process\.env/i);
});
