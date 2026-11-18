import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {defaultClients} from "../public/coach-clients-model.mjs";
import {
 ONBOARDING_STAGES,INTAKE_CHECKLIST,newOnboarding,validateOnboardingRecord,updateIntake,
 toggleChecklist,nextOnboardingStage,onboardProgress,stageById,onboardingTask,syncOnboardingTasks,onboardingSummary
} from "../public/coach-onboarding-model.mjs";
import {renderOnboarding} from "../public/coach-onboarding-ui.mjs";

const example=defaultClients().find(c=>c.id==="chris");
const intake={goal:"Build strength",equipment:"Barbell and dumbbells",days:"3",preferredSchedule:"Mon Wed Fri",
 foodPreferences:"No fictional food preferences",notes:"Demonstration text only"};
test("D03: creates isolated fictional onboarding with ordered stages",()=>{
 const flow=newOnboarding(example);
 assert.equal(flow.clientId,"chris");
 assert.equal(flow.stage,"draft");
 assert.deepEqual(flow.checks,[]);
 assert.ok(validateOnboardingRecord(flow,"chris"));
 assert.equal(onboardProgress(flow),0);
 assert.equal(ONBOARDING_STAGES.length,6);
 assert.equal(INTAKE_CHECKLIST.length,5);
 assert.equal(stageById("prepared").label,"Invite prepared");
});
test("D03: all stages are explicit and coach review cannot be bypassed",()=>{
 let rec=newOnboarding(example);
 assert.throws(()=>toggleChecklist(rec,"identity",true),/only during/i);
 rec=nextOnboardingStage(rec);
 assert.equal(rec.stage,"awaiting");
 assert.throws(()=>nextOnboardingStage(rec),/intake/i);
 rec=updateIntake(rec,intake);
 rec=nextOnboardingStage(rec);
 assert.equal(rec.stage,"review");
 assert.throws(()=>nextOnboardingStage(rec),/all five/i);
 for(const step of INTAKE_CHECKLIST)rec=toggleChecklist(rec,step.id,true);
 assert.equal(rec.checks.length,5);
 rec=nextOnboardingStage(rec);
 assert.equal(rec.stage,"ready");
 rec=nextOnboardingStage(rec);
 assert.equal(rec.stage,"prepared");
 rec=nextOnboardingStage(rec);
 assert.equal(rec.stage,"complete");
 assert.equal(onboardProgress(rec),100);
 assert.throws(()=>nextOnboardingStage(rec),/already complete/i);
 assert.equal(onboardingTask(rec,example,"2026-11-15",1),null);
});
test("D03: intake rejects incomplete or out-of-range values and preserves input history",()=>{
 const draft=nextOnboardingStage(newOnboarding(example));
 assert.throws(()=>updateIntake(draft,{...intake,days:"0"}),/Complete the goal/);
 assert.throws(()=>updateIntake(draft,{...intake,preferredSchedule:""}),/schedule|details|Complete/i);
 const done=updateIntake(draft,intake);
 assert.equal(done.intake.days,"3");
 assert.equal(draft.intake.preferredSchedule,"");
 assert.throws(()=>toggleChecklist(done,"alien",true),/Unknown/);
});
test("D03: toggling checklist makes readiness reversible",()=>{
 let r=nextOnboardingStage(updateIntake(nextOnboardingStage(newOnboarding(example)),intake));
 for(const step of INTAKE_CHECKLIST)r=toggleChecklist(r,step.id,true);
 assert.equal(r.checks.length,5);
 r=toggleChecklist(r,INTAKE_CHECKLIST[0].id,false);
 assert.equal(r.checks.length,4);
 assert.throws(()=>nextOnboardingStage(r),/all five/i);
});
test("D03: automatic next-action tasks are idempotent and preserve previous phase history",()=>{
 let r=newOnboarding(example);
 const today="2026-11-15";
 let tasks=syncOnboardingTasks([],r,example,today);
 assert.equal(tasks.length,1);
 assert.equal(tasks[0].id,"onboarding:chris:draft");
 tasks=syncOnboardingTasks(tasks,r,example,today);
 assert.equal(tasks.length,1);
 assert.equal(tasks[0].status,"open");
 r=nextOnboardingStage(r);
 tasks=syncOnboardingTasks(tasks,r,example,today);
 assert.equal(tasks.length,2);
 assert.equal(tasks[0].status,"completed");
 assert.equal(tasks[1].id,"onboarding:chris:awaiting");
 tasks=syncOnboardingTasks(tasks,r,example,today);
 assert.equal(tasks.length,2);
 assert.equal(tasks.filter(x=>x.status==="open").length,1);
 const paused=onboardingTask(r,{...example,status:"Archived"},today,3);
 assert.equal(paused,null);
});
test("D03: pipeline excludes archived clients and shows relevant counts",()=>{
 const c=defaultClients();
 const r={chris:newOnboarding(example)};
 assert.deepEqual(onboardingSummary(c,r),{total:1,pending:1,awaiting:0,review:0,ready:0,complete:0});
 assert.equal(onboardingSummary(c.map(x=>x.id==="chris"?{...x,status:"Archived"}:x),r).pending,0);
});
test("D03: HTML is escaped in fictional intake and controls show no invitation delivery",()=>{
 const c=defaultClients();
 const r=newOnboarding(example);
 r.intake.notes="<img src=x onerror=alert(1)>";
 r.intake.goal="<script>script injection</script>";
 const rendered=renderOnboarding({clients:c,records:{chris:r},selectedId:"chris"});
 assert.match(rendered,/data-action="onboarding-next"/);
 assert.match(rendered,/data-action="onboarding-edit"/);
 assert.match(rendered,/data-onboarding-check="coach"/);
 assert.match(rendered,/&lt;script&gt;/);
 assert.doesNotMatch(rendered,/<script>script injection/);
 assert.match(rendered,/Nothing is actually sent|Invitations and account creation are disabled/);
});
test("D03: isolated code and UI remain disconnected from hosted records",async()=>{
 const paths=["../public/coach-hub.html","../public/coach-hub.mjs","../public/coach-onboarding-model.mjs","../public/coach-onboarding-ui.mjs","../public/coach-onboarding.css"];
 const [html,hub,model,ui,css]=await Promise.all(paths.map(async p=>readFile(new URL(p,import.meta.url),"utf8")));
 assert.match(html,/id="onboarding-intake-form"/);
 assert.match(html,/data-view="onboarding"/);
 assert.match(html,/connect-src 'none'/);
 assert.match(hub,/syncOnboardingTasks/);
 assert.match(hub,/submitIntakeEditor/);
 assert.match(hub,/stageById/);
 assert.match(hub,/sessionStorage/);
 assert.doesNotMatch(model+ui,/\bfetch\s*\(|https:\/\/|supabase\.co|service_role|\bXMLHttpRequest\b/i);
 assert.match(css,/max-width:700px/);
 assert.match(css,/onboarding-stages/);
});
