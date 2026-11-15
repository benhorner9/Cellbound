/* TrainSmart D04 — fictional messaging UI. Buttons never send messages. */
import {MESSAGE_TEMPLATES,CHANNELS,TEMPLATE_CATEGORIES,allMessageTemplates,messageStats,canContact} from "./coach-messaging-model.mjs";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const option=(value,title,selected)=>'<option value="'+esc(value)+'" '+(selected===value?"selected":"")+'>'+esc(title)+'</option>';
const status=d=>d.status==="approved"?'<span class="tag good">Approved · Not sent</span>':d.status==="coach_marked_sent"?'<span class="tag muted">Coach marked sent · Unverified</span>':'<span class="tag warn">Draft · Not sent</span>';
export function renderMessageCentre({clients,drafts,preferences,enrolments,customTemplates,selectedClientId="",filter="all"}){
 const templates=allMessageTemplates(customTemplates),stats=messageStats(drafts);
 const eligible=clients.filter(c=>c.status!=="Archived");
 const chosen=selectedClientId&&eligible.some(c=>c.id===selectedClientId)?selectedClientId:"";
 const shown=drafts.filter(d=>(!chosen||d.clientId===chosen)&&(filter==="all"||d.status===filter));
 const filters=[["all","All",stats.total],["draft","Drafts",stats.draft],["approved","Approved",stats.approved],["coach_marked_sent","Coach marked sent",stats.coachMarked]];
 return '<div class="message-top-metrics">'+[
  ["Drafts awaiting review",stats.draft],["Approved, not sent",stats.approved],["Coach reported sent",stats.coachMarked]
 ].map(([k,v])=>'<div class="stat"><p class="stat-label">'+esc(k)+'</p><div class="stat-number">'+v+'</div></div>').join("")+'</div>'+
 '<div class="message-commands"><div><p class="eyebrow">PERSONALISED CLIENT COMMUNICATION</p><h2>Message centre</h2><p>Client portal login is optional. You can prepare WhatsApp or email messages for clients you coach in person.</p></div>'+
 '<div class="message-actions"><button type="button" class="btn btn-primary" data-action="message-new">+ New message</button>'+
 '<button type="button" class="btn btn-outline" data-action="message-template">+ Save a template</button></div></div>'+
 '<div class="message-layout"><section class="panel message-draft-list"><div class="panel-header"><h3>Outbox and drafts</h3><span class="tag muted">PREVIEW · NO ACTUAL SENDING</span></div>'+
 '<label for="message-client-filter">Client</label><select id="message-client-filter">'+option("","All fictional clients",chosen)+eligible.map(c=>option(c.id,c.name,chosen)).join("")+'</select>'+
 '<div class="message-filter-row">'+filters.map(([id,title,count])=>'<button type="button" class="seg '+(filter===id?"active":"")+'" data-message-filter="'+esc(id)+'">'+esc(title)+' ('+count+')</button>').join("")+'</div>'+
 (shown.length?'<div class="message-list">'+shown.map(d=>{
  const client=clients.find(c=>c.id===d.clientId),contact=enrolments[d.clientId]?.contacts||{},pref=preferences[d.clientId];
  const ready=canContact(pref,d.channel,contact);
  return '<article class="message-item"><div class="message-item-head"><div><small>'+esc(client?.name||"Fictional client")+' · '+esc(d.channel==="whatsapp"?"WhatsApp":"Email")+'</small>'+
   '<h3>'+esc(d.subject)+'</h3></div>'+status(d)+'</div>'+
   '<p class="message-preview">'+esc(d.text)+'</p>'+
   (!ready?'<p class="message-block-note">Recipient or communication preference not verified for this channel.</p>':"")+
   '<div class="message-item-buttons">'+
   (d.status!=="coach_marked_sent"?'<button type="button" class="btn btn-ghost btn-sm" data-action="message-edit" data-id="'+esc(d.id)+'">Edit</button>':'')+
   (d.status==="draft"?'<button type="button" class="btn btn-outline btn-sm" data-action="message-approve" data-id="'+esc(d.id)+'">Approve</button>':"")+
   '<button type="button" class="btn btn-outline btn-sm" data-action="message-copy" data-id="'+esc(d.id)+'" '+(d.status==="approved"&&ready?"":"disabled")+'>Copy '+(d.channel==="whatsapp"?"WhatsApp":"email")+' text</button>'+
   (d.channel==="whatsapp"&&d.status==="approved"&&ready?'<button type="button" class="btn btn-ghost btn-sm" data-action="message-copy-wa" data-id="'+esc(d.id)+'">Copy WhatsApp link</button>':"")+
   (d.status==="approved"?'<button type="button" class="btn btn-ghost btn-sm" data-action="message-mark-sent" data-id="'+esc(d.id)+'">I sent this externally</button>':"")+
   '</div></article>';
 }).join("")+'</div>':'<div class="empty"><h3>No messages here yet</h3><p>Choose a fictional client and a template to prepare your first message.</p></div>')+'</section>'+
 '<aside class="message-aside"><section class="panel"><div class="panel-header"><h3>Client contact preferences</h3></div>'+
 '<p class="small-muted">These choices are independent of whether a client uses TrainSmart login. They apply only to normal coaching communications, not marketing.</p>'+
 '<div class="message-client-preferences">'+eligible.map(c=>{
  const pref=preferences[c.id],channel=pref?.serviceChannel||"none",contact=enrolments[c.id]?.contacts||{};
  const hasContact=canContact(pref,channel,contact);
  return '<div class="message-pref-item"><div><strong>'+esc(c.name)+'</strong><small>'+esc(channel==="none"?"Not confirmed":channel==="whatsapp"?"WhatsApp": "Email")+
  ' · '+(hasContact?"Contact verified":"Not yet verified")+'</small></div>'+
  '<button type="button" class="btn btn-ghost btn-sm" data-action="message-preference" data-client-id="'+esc(c.id)+'">Edit</button></div>';
 }).join("")+'</div></section>'+
 '<section class="panel"><div class="panel-header"><h3>Reusable templates</h3><span class="tag muted">'+templates.length+'</span></div>'+
 '<p class="small-muted">Templates can use {{firstName}}, {{programme}} or {{milestone}}. Sensitive medical details are intentionally excluded.</p>'+
 '<div class="message-template-list">'+templates.map(t=>'<div class="message-template-item"><div><strong>'+esc(t.name)+'</strong><small>'+esc(t.category)+' · v'+esc(t.version||1)+'</small></div>'+
 '<button class="btn btn-ghost btn-sm" type="button" data-action="message-from-template" data-template-id="'+esc(t.id)+'">Use</button>'+
 (customTemplates.some(x=>x.id===t.id)?'<button class="btn btn-ghost btn-sm" type="button" data-action="message-edit-template" data-template-id="'+esc(t.id)+'">Edit</button>':"")+
 '</div>').join("")+'</div></section>'+
 '<section class="panel"><h3>Delivery safeguard</h3><p class="small-muted">Copying a message or WhatsApp link does not send it. “Coach marked sent” is your own note; it is not confirmation from WhatsApp or an email provider.</p>'+
 '<p class="message-block-note">No automatic email, WhatsApp, SMS or real client notification is enabled.</p></section></aside></div>';
}
export function messageComposeDialog({clients,selectedClientId="",draft=null,templateId="",templates=[]}){
 const list=allMessageTemplates(templates),chosen=templateId||draft?.templateId||list[0]?.id||"";
 return {title:draft?"Edit message draft":"New message",html:
 '<label for="message-compose-client">Fictional client</label><select id="message-compose-client" name="clientId" '+(draft?"disabled":"")+' required>'+
 clients.filter(c=>c.status!=="Archived").map(c=>option(c.id,c.name,selectedClientId||draft?.clientId)).join("")+'</select>'+
 '<label for="message-compose-template">Reusable template</label><select id="message-compose-template" name="templateId" '+(draft?"disabled":"")+'>'+
 list.map(t=>option(t.id,t.name,chosen)).join("")+'</select>'+
 '<label for="message-compose-channel">Message channel</label><select id="message-compose-channel" name="channel">'+
 option("whatsapp","WhatsApp",draft?.channel||"whatsapp")+option("email","Email",draft?.channel||"whatsapp")+'</select>'+
 '<label for="message-compose-subject">Subject / title</label><input name="subject" id="message-compose-subject" maxlength="160" required value="'+esc(draft?.subject||"")+'">'+
 '<label for="message-compose-text">Message (editable)</label><textarea name="text" id="message-compose-text" maxlength="2000" rows="6" required>'+esc(draft?.text||"")+'</textarea>'+
 '<p class="small-muted">Nothing here will be sent. Use fictional names and contact details only.</p>'};
}
export function messagePreferenceDialog(client,pref,contact){
 return '<p class="dialog-copy">Choose a preferred way to contact this fictional client about their coaching. Their app login remains optional. Never use this for marketing without separate permission.</p>'+
 '<p class="small-muted">Email: '+esc(contact?.email||"Not entered")+' · Phone: '+esc(contact?.phone||"Not entered")+'</p>'+
 '<label for="message-service-channel">Preferred coaching channel</label>'+
 '<select id="message-service-channel" name="channel">'+option("none","Not confirmed — block approval",pref?.serviceChannel||"none")+
 option("whatsapp","WhatsApp",pref?.serviceChannel||"none")+option("email","Email",pref?.serviceChannel||"none")+'</select>'+
 '<label class="message-checkbox"><input type="checkbox" name="marketing" value="yes" '+(pref?.marketingOptIn?"checked":"")+
 '> Separate optional marketing permission (demo only)</label>';
}
export function messageTemplateDialog(template=null){
 const t=template||{};
 return '<label for="msg-template-name">Template name</label><input name="name" id="msg-template-name" maxlength="70" required value="'+esc(t.name||"")+'">'+
 '<div class="form-grid"><div><label for="msg-template-category">Type</label><select name="category" id="msg-template-category">'+TEMPLATE_CATEGORIES.map(cat=>option(cat,cat,t.category||"general")).join("")+'</select></div>'+
 '<div><label for="msg-template-channel">Suggested channel</label><select name="channel" id="msg-template-channel">'+CHANNELS.map(ch=>option(ch,ch==="whatsapp"?"WhatsApp":"Email",t.channel||"whatsapp")).join("")+'</select></div></div>'+
 '<label for="msg-template-subject">Message title / email subject</label><input name="subject" id="msg-template-subject" maxlength="130" required value="'+esc(t.subject||"")+'">'+
 '<label for="msg-template-body">Template text</label><textarea id="msg-template-body" name="text" rows="5" maxlength="1200" required>'+esc(t.text||"Hi {{firstName}}, ")+'</textarea>'+
 '<p class="small-muted">Only {{firstName}}, {{programme}}, {{milestone}} are supported. Updating a saved template creates a new version; existing drafts keep their original text.</p>';
}
