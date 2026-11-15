import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {clients,firstTasks,sortedTasks,actionable,escapeHtml,currentDay,addDays,dueLabel} from "../public/coach-hub.mjs";

test("D01: fictional clients and tasks never depend on real account data",()=>{
 assert.equal(clients.length,5);
 assert.equal(firstTasks().length,6);
 assert.ok(clients.every(c=>c.id&&c.name&&c.plan&&c.phase));
 assert.ok(firstTasks().every(t=>clients.some(c=>c.id===t.clientId)));
 assert.equal(firstTasks().filter(t=>t.priority==="high").length,2);
});
test("D01: recommended task is prioritised; completed and waiting tasks leave the active queue",()=>{
 const tasks=firstTasks();
 assert.equal(sortedTasks(tasks.filter(actionable))[0].id,"review-sarah");
 tasks[0].status="completed";
 assert.equal(actionable(tasks[0]),false);
 assert.equal(sortedTasks(tasks.filter(actionable))[0].id,"followup-james");
 tasks[1].status="waiting";
 assert.equal(actionable(tasks[1]),false);
 assert.equal(sortedTasks(tasks.filter(actionable))[0].id,"programme-tom");
 tasks[2].status="snoozed";
 tasks[2].due=addDays(currentDay(),1);
 assert.equal(actionable(tasks[2]),false);
 tasks[2].due=addDays(currentDay(),-1);
 assert.equal(actionable(tasks[2]),true);
 assert.equal(dueLabel(tasks[2]),"Overdue");
});
test("D01: preview escapes user text and normalizes due dates",()=>{
 assert.equal(escapeHtml('<img src="x" onerror="bad()">'),"&lt;img src=&quot;x&quot; onerror=&quot;bad()&quot;&gt;");
 assert.match(currentDay(),/^\d{4}-\d{2}-\d{2}$/);
 assert.match(addDays(currentDay(),1),/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(dueLabel({status:"open",due:currentDay()}),"Today");
});
test("D01: isolated Coach Hub has complete UI shell, dialog controls and zero network linkage",async()=>{
 const html=await readFile(new URL("../public/coach-hub.html",import.meta.url),"utf8");
 const css=await readFile(new URL("../public/coach-hub.css",import.meta.url),"utf8");
 const js=await readFile(new URL("../public/coach-hub.mjs",import.meta.url),"utf8");
 assert.match(html,/<main id="main-content"/);
 assert.match(html,/id="task-dialog"/);
 assert.match(html,/id="new-task-form"/);
 assert.match(html,/id="view-content"/);
 for(const section of ["today","clients","tasks","messages"])
   assert.match(html,new RegExp('data-view="'+section+'"'));
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/fictional/i);
 for(const action of ["snooze","complete","waiting","new-task","draft","copy-draft"])
   assert.match(js,new RegExp('action==="'+action+'"'));
 assert.match(js,/sessionStorage/);
 assert.doesNotMatch(js,/\bfetch\s*\(|https:\/\/|supabase\.co|service_role|\bXMLHttpRequest\b/i);
 assert.match(css,/max-width:700px/);
 assert.match(css,/max-width:900px/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});
