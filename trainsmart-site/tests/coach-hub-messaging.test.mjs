import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {defaultClients} from "../public/coach-clients-model.mjs";
import {
 MESSAGE_TEMPLATES,CHANNELS,TEMPLATE_CATEGORIES,defaultContactPreference,validContactPreference,
 changeContactPreference,validMessageTemplate,createCustomTemplate,editCustomTemplate,
 allMessageTemplates,interpolateTemplate,canContact,makeMessageDraft,validMessageDraft,
 editMessageDraft,approveMessageDraft,markExternalSend,whatsappDraftUrl,messageStats,legacyDraftsToNew
} from "../public/coach-messaging-model.mjs";
import {renderMessageCentre,messageComposeDialog,messagePreferenceDialog,messageTemplateDialog} from "../public/coach-messaging-ui.mjs";

const clients=defaultClients();
const c=clients[0],other=clients[1];
const verified={email:"example@example.invalid",phone:"07700 900123",contactVerified:true};
const t=MESSAGE_TEMPLATES.find(t=>t.id==="session_complete");
const pref=(channel="whatsapp")=>changeContactPreference(defaultContactPreference(c.id),channel);
const make=(template=t,channel=t.channel,id="test-msg",sourceKey="")=>
 makeMessageDraft({id,client:c,template,channel,sourceKey,existing:[]}).drafts[0];

test("D04: nine reusable templates with approved safe placeholder syntax",()=>{
 assert.equal(MESSAGE_TEMPLATES.length,9);
 assert.equal(new Set(MESSAGE_TEMPLATES.map(x=>x.id)).size,9);
 assert.ok(MESSAGE_TEMPLATES.every(validMessageTemplate));
 assert.deepEqual(CHANNELS,["whatsapp","email"]);
 assert.ok(TEMPLATE_CATEGORIES.includes("renewal"));
});
test("D04: editable custom templates version without changing a prior draft",()=>{
 const args={name:"My follow-up",category:"general",channel:"whatsapp",subject:"Checking in",
  text:"Hi {{firstName}}, I have reviewed {{programme}}."};
 const old=createCustomTemplate([],args,"custom-test");
 const draft=make(old[0],"whatsapp","my-draft");
 const revised=editCustomTemplate(old,"custom-test",{...args,text:"Hi {{firstName}}, congratulations on {{milestone}}."});
 assert.equal(old[0].version,1);
 assert.equal(revised[0].version,2);
 assert.match(draft.text,/your next programme/);
 assert.doesNotMatch(draft.text,/congratulations/);
 assert.equal(allMessageTemplates(revised).length,10);
 assert.throws(()=>createCustomTemplate(old,args,"custom-test"),/Duplicate/);
 assert.throws(()=>createCustomTemplate([],{...args,text:"Hello {{email}}"},"bad"),/Only/);
});
test("D04: approved placeholders are substituted safely and unknown placeholders are not expanded",()=>{
 assert.equal(interpolateTemplate("Hi {{firstName}}, great work on {{milestone}}!",{firstName:"Alex",milestone:"PB"}),"Hi Alex, great work on PB!");
 assert.equal(interpolateTemplate("Hi {{firstName}}, {{programme}}",{}),"Hi there, your next programme");
 assert.equal(interpolateTemplate("Keep {{healthInfo}} private",{healthInfo:"secret"}),"Keep {{healthInfo}} private");
});
test("D04: opt-out and missing contacts prevent approval; portal credentials are not consulted",()=>{
 const none=defaultContactPreference(c.id);
 assert.equal(validContactPreference(none,c.id),true);
 assert.equal(canContact(none,"email",verified),false);
 assert.equal(canContact(pref("email"),"whatsapp",verified),false);
 assert.equal(canContact(pref("email"),"email",verified),true);
 assert.equal(canContact(pref("whatsapp"),"whatsapp",verified),true);
 assert.equal(canContact(pref("whatsapp"),"whatsapp",{...verified,contactVerified:false}),false);
 assert.equal(canContact(pref("email"),"email",{...verified,email:""}),false);
 assert.throws(()=>changeContactPreference(none,"sms"),/supported/);
 assert.equal("authUserId" in pref("whatsapp"),false);
});
test("D04: drafts are deduped by originating task or session",()=>{
 const first=makeMessageDraft({id:"task-1",client:c,template:t,channel:"whatsapp",sourceKey:"completed-session:abc",existing:[]});
 const second=makeMessageDraft({id:"task-2",client:c,template:t,channel:"whatsapp",sourceKey:"completed-session:abc",existing:first.drafts});
 assert.equal(first.created,true);assert.equal(second.created,false);
 assert.equal(second.drafts.length,1);
 assert.throws(()=>makeMessageDraft({id:"task-1",client:c,template:t,channel:"whatsapp",existing:first.drafts}),/Duplicate/);
});
test("D04: editing an approved draft returns it to review; already externally marked stays immutable",()=>{
 let drafts=[make()];
 assert.equal(validMessageDraft(drafts[0]),true);
 drafts=approveMessageDraft(drafts,"test-msg",pref(),verified);
 assert.equal(drafts[0].status,"approved");
 drafts=editMessageDraft(drafts,"test-msg",{subject:"Updated",text:"Hi example, see you soon!",channel:"email"});
 assert.equal(drafts[0].status,"draft");
 assert.equal(drafts[0].channel,"email");
 assert.equal(drafts[0].approvedAt,"");
 drafts=approveMessageDraft(drafts,"test-msg",pref("email"),verified);
 drafts=markExternalSend(drafts,"test-msg",pref("email"),verified);
 assert.equal(drafts[0].status,"coach_marked_sent");
 assert.ok(drafts[0].coachMarkedAt);
 assert.throws(()=>editMessageDraft(drafts,"test-msg",{subject:"Oops",text:"Changed",channel:"email"}),/historical records/);
});
test("D04: externally marked is not provider-verified delivery",()=>{
 let drafts=[make()];
 assert.throws(()=>markExternalSend(drafts,"test-msg",pref(),verified),/Approve/);
 assert.throws(()=>approveMessageDraft(drafts,"test-msg",defaultContactPreference(c.id),verified),/Confirm/);
 drafts=approveMessageDraft(drafts,"test-msg",pref(),verified);
 const copied=markExternalSend(drafts,"test-msg",pref(),verified);
 assert.equal(copied[0].status,"coach_marked_sent");
 assert.equal("providerDeliveredAt" in copied[0],false);
 assert.equal("providerMessageId" in copied[0],false);
 assert.deepEqual(messageStats(copied),{total:1,draft:0,approved:0,coachMarked:1});
});
test("D04: WhatsApp URL percent-encodes newlines safely and normalises UK demo mobile",()=>{
 const url=whatsappDraftUrl("07700 900123","Hello & welcome!\nTrainSmart");
 assert.match(url,/^https:\/\/wa\.me\/447700900123\?text=/);
 assert.match(url,/%26/);
 assert.match(url,/%0A/);
 assert.throws(()=>whatsappDraftUrl("bad","Test"),/invalid/);
});
test("D04: old welcome/task drafts migrate to new editable model without losing the message",()=>{
 const old=[{id:"draft-checkin",sourceId:"checkin-1",clientName:c.name,text:"Hello fictional client",title:"Check-in follow-up"}];
 const newOnes=legacyDraftsToNew(old,clients);
 assert.equal(newOnes.length,1);
 assert.equal(newOnes[0].clientId,c.id);
 assert.equal(newOnes[0].status,"draft");
 assert.equal(newOnes[0].sourceKey,"checkin-1");
 assert.equal(newOnes[0].text,"Hello fictional client");
 assert.equal(legacyDraftsToNew([{...old[0],clientName:"Nobody"}],clients).length,0);
});
test("D04: UI labels approval, sender, opt-out and no-delivery confirmation honestly",()=>{
 const drafts=[make()];
 const prefs={[c.id]:pref("whatsapp")},enrolments={[c.id]:{contacts:verified}};
 let html=renderMessageCentre({clients,drafts,preferences:prefs,enrolments,customTemplates:[]});
 assert.match(html,/Message centre/);
 assert.match(html,/data-action="message-new"/);
 assert.match(html,/data-action="message-template"/);
 assert.match(html,/data-action="message-approve"/);
 assert.match(html,/data-action="message-copy"/);
 assert.match(html,/disabled>Copy WhatsApp text/);
 assert.match(html,/Prepare client messages by WhatsApp or email/);
 assert.match(html,/Sending is disabled/);
 const approved=approveMessageDraft(drafts,"test-msg",pref(),verified);
 html=renderMessageCentre({clients,drafts:approved,preferences:prefs,enrolments,customTemplates:[]});
 assert.match(html,/Approved · Not sent/);
 assert.match(html,/data-action="message-copy-wa"/);
 assert.match(html,/I sent this externally/);
 const sent=markExternalSend(approved,"test-msg",pref(),verified);
 html=renderMessageCentre({clients,drafts:sent,preferences:prefs,enrolments,customTemplates:[]});
 assert.match(html,/Coach marked sent · Unverified/);
});
test("D04: templates and drafts escape unsafe text before display",()=>{
 const draft=make();
 draft.subject="<img src=x onerror=alert(1)>";
 draft.text="<script>alert(1)</script>";
 const html=renderMessageCentre({clients,drafts:[draft],preferences:{},enrolments:{},customTemplates:[]});
 assert.match(html,/&lt;img/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>alert/);
 const composer=messageComposeDialog({clients,selectedClientId:c.id,draft,templates:[]}).html;
 assert.match(composer,/&lt;script&gt;/);
 assert.match(messagePreferenceDialog(c,defaultContactPreference(c.id),verified),/Preferred coaching channel/);
 assert.match(messageTemplateDialog(),/firstName/);
});
test("D04: client filtering doesn't mix another client's message in shortlist",()=>{
 const one=make();
 const two=makeMessageDraft({id:"other",client:other,template:t,channel:"whatsapp",existing:[]}).drafts[0];
 const html=renderMessageCentre({clients,drafts:[one,two],preferences:{},enrolments:{},customTemplates:[],selectedClientId:c.id});
 assert.match(html,/id="message-client-filter"/);
 assert.match(html,/test-msg/);
 assert.doesNotMatch(html,/data-action="message-edit" data-id="other"/);
});
test("D04: source integration uses safe isolated modules without external send actions",async()=>{
 const files=["../public/coach-hub.mjs","../public/coach-hub.html","../public/coach-messaging-model.mjs",
 "../public/coach-messaging-ui.mjs","../public/coach-messaging.css"];
 const [hub,html,model,ui,css]=await Promise.all(files.map(async x=>readFile(new URL(x,import.meta.url),"utf8")));
 assert.match(hub,/state\.messagePreferences/);
 assert.match(hub,/makeMessageDraft/);
 assert.match(hub,/queueSessionFollowup\(session\)/);
 assert.match(hub,/data\.action|action==="message-approve"/);
 assert.match(hub,/state\.messageStatusFilter/);
 assert.match(html,/id="message-compose-dialog"/);
 assert.match(html,/coach-messaging\.css/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(model+ui,/\bfetch\s*\(|\bXMLHttpRequest\b|service_role|\binviteUserByEmail\b|\.sendMail\s*\(/i);
 assert.match(css,/@media\(max-width:700px\)/);
});
