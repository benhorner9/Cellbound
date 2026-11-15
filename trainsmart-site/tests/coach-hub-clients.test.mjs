import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {fixtureClients,defaultClients,clientInitials,validateClientForm,validClient,createFictionalClient,updateFictionalClient,changeClientStatus,clientOverview} from "../public/coach-clients-model.mjs";
import {renderClientDirectory} from "../public/coach-clients-ui.mjs";

const example={name:"Demo Example",goal:"Improve strength",equipment:"Dumbbells, TRX",experience:"beginner",status:"Onboarding",trainingDays:3,sessionMinutes:45,privateNotes:"Test-only note"};
function render(clients,selectedClientId=null,clientTab="overview",clientFilter="all",clientSearch="",events=[]){
 return renderClientDirectory({clients,tasks:[],selectedClientId,clientTab,clientFilter,clientSearch,clientEvents:events,
 taskRow:()=>"<article>Fictional task</article>",sortedTasks:a=>a,actionable:()=>true});
}
test("D02: five fictional clients have valid editable profiles",()=>{
 const clients=defaultClients();
 assert.equal(clients.length,5);
 assert.ok(clients.every(validClient));
 assert.notStrictEqual(clients,fixtureClients);
 clients[0].goal="Edited in memory";
 assert.notEqual(fixtureClients[0].goal,clients[0].goal);
 assert.equal(clientInitials("Demo Example"),"DE");
});
test("D02: creation appends a new fictional client and preserves existing roster",()=>{
 const starting=defaultClients();
 const {clients,client}=createFictionalClient(starting,example,"demo-test-001");
 assert.equal(clients.length,6);assert.equal(starting.length,5);
 assert.equal(client.status,"Onboarding");
 assert.equal(client.initials,"DE");
 assert.equal(client.plan,"Not assigned");
 assert.equal(client.onboarding,"Draft");
 assert.ok(client.id.startsWith("demo-"));
 assert.equal(clients[0].name,starting[0].name);
});
test("D02: edits update only selected fixture and preserve programme and task identity",()=>{
 const starting=defaultClients();
 const original=starting[0],other=starting[1];
 const modified=updateFictionalClient(starting,"sarah",{...example,name:"Sarah Morgan",status:"Paused",trainingDays:4});
 assert.equal(modified[0].id,original.id);
 assert.equal(modified[0].plan,original.plan);
 assert.equal(modified[0].trainingDays,4);
 assert.equal(modified[0].status,"Paused");
 assert.deepEqual(modified[1],other);
 assert.equal(starting[0].status,"Active");
});
test("D02: archive and restore are reversible and preserve historical identity",()=>{
 const first=defaultClients();
 const archived=changeClientStatus(first,"sarah","Archived");
 assert.equal(archived[0].status,"Archived");
 assert.equal(first[0].status,"Active");
 assert.equal(archived[0].id,first[0].id);
 const restored=changeClientStatus(archived,"sarah","Active");
 assert.equal(restored[0].status,"Active");
 assert.equal(restored[0].plan,first[0].plan);
});
test("D02: reject invalid or duplicate fictional profiles",()=>{
 const list=defaultClients();
 assert.throws(()=>validateClientForm({...example,name:"X"}),/name/i);
 assert.throws(()=>validateClientForm({...example,trainingDays:0}),/days/i);
 assert.throws(()=>validateClientForm({...example,sessionMinutes:200}),/length/i);
 assert.throws(()=>validateClientForm({...example,status:"Removed"}),/status/i);
 assert.throws(()=>createFictionalClient(list,example,"sarah"),/Invalid/);
 const withOne=createFictionalClient(list,example,"demo-1").clients;
 assert.throws(()=>createFictionalClient(withOne,example,"demo-1"),/duplicate/);
 assert.throws(()=>updateFictionalClient(list,"notfound",example),/not found/);
 assert.throws(()=>changeClientStatus(list,"unknown","Paused"),/not found/);
});
test("D02: dashboard overview reacts to fictional status changes",()=>{
 const list=defaultClients();
 let stats=clientOverview(list,[]);
 assert.equal(stats.active,5);assert.equal(stats.paused,0);
 stats=clientOverview(changeClientStatus(list,"sarah","Paused"),[]);
 assert.equal(stats.active,4);assert.equal(stats.paused,1);
});
test("D02: directory and profile tabs escape coach-entered input and show action controls",()=>{
 const {clients}=createFictionalClient(defaultClients(),{...example,name:'Demo <img src=x onerror=alert(1)>',privateNotes:"Note <script>alert(1)</script>"},"demo-injection");
 const listing=render(clients);
 assert.match(listing,/&lt;img/);assert.doesNotMatch(listing,/<img src=x/);
 assert.match(listing,/data-action="new-client"/);
 assert.match(listing,/data-client-filter="Paused"/);
 assert.match(listing,/data-action="edit-client"/);
 assert.match(listing,/data-client-search=/);
 const profile=render(clients,"demo-injection","notes");
 assert.match(profile,/&lt;script&gt;/);
 assert.doesNotMatch(profile,/<script>alert/);
 assert.match(profile,/data-action="archive-client"/);
 const timeline=render(clients,"demo-injection","timeline","all","",[{clientId:"demo-injection",label:"Profile updated",at:"15 Nov 2026"}]);
 assert.match(timeline,/Profile updated/);
});
test("D02: form markup and preview remain disconnected from real clients",async()=>{
 const [html,js,ui,model,css]=await Promise.all([
  readFile(new URL("../public/coach-hub.html",import.meta.url),"utf8"),
  readFile(new URL("../public/coach-hub.mjs",import.meta.url),"utf8"),
  readFile(new URL("../public/coach-clients-ui.mjs",import.meta.url),"utf8"),
  readFile(new URL("../public/coach-clients-model.mjs",import.meta.url),"utf8"),
  readFile(new URL("../public/coach-clients.css",import.meta.url),"utf8")
 ]);
 assert.match(html,/id="client-form"/);assert.match(html,/id="client-dialog"/);
 for(const f of ["client-name","client-goal","client-status","client-equipment","client-notes"])assert.ok(html.includes('id="'+f+'"'));
 assert.match(js,/sessionStorage/);
 assert.match(js,/createFictionalClient/);
 assert.match(js,/setClientStatus/);
 assert.match(js,/submitClientEditor/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(model+ui,/\bfetch\s*\(|https:\/\/|supabase\.co|service_role|\bXMLHttpRequest\b/i);
 assert.match(css,/max-width:700px/);
 assert.match(css,/focus-visible|client-profile/);
});
