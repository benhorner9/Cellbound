/*
 * D04 Messaging Centre — fictional, pure model. No external sending, mail or user accounts.
 * Service communication preferences are not marketing consents.
 */
export const CHANNELS=Object.freeze(["whatsapp","email"]);
export const DEFAULT_TEMPLATE_VERSION=1;
export const MESSAGE_TEMPLATES=Object.freeze([
 {id:"checkin_due",name:"Weekly check-in reminder",category:"checkin",channel:"whatsapp",subject:"Your TrainSmart check-in",
  text:"Hi {{firstName}}, just a quick reminder to complete your weekly check-in when you get a chance. Let me know if you need anything. Thanks!"},
 {id:"checkin_reviewed",name:"Check-in acknowledged",category:"checkin",channel:"whatsapp",subject:"Check-in received",
  text:"Hi {{firstName}}, thanks for completing your check-in. I'll review it and come back to you with any adjustments. Keep up the consistency!"},
 {id:"programme_ready",name:"New programme ready",category:"programme",channel:"email",subject:"Your next training programme",
  text:"Hi {{firstName}}, your next TrainSmart training programme is ready. We can go through the changes together at your next session. Speak soon!"},
 {id:"session_complete",name:"Well done after training",category:"milestone",channel:"whatsapp",subject:"Well done today",
  text:"Hi {{firstName}}, great work in your session today! Keep up the effort and we'll build on it next time."},
 {id:"progress_milestone",name:"Progress milestone",category:"milestone",channel:"whatsapp",subject:"Your training progress",
  text:"Hi {{firstName}}, you've reached another training milestone! Well done for the effort you've put in. Let's keep it going."},
 {id:"payment_followup",name:"Payment follow-up",category:"payment",channel:"email",subject:"A quick note about your coaching payment",
  text:"Hi {{firstName}}, just a quick reminder to check your coaching payment when you have a moment. If you've already sorted it, please ignore this and thank you!"},
 {id:"renewal",name:"Coaching renewal",category:"renewal",channel:"email",subject:"Your next TrainSmart coaching block",
  text:"Hi {{firstName}}, we're coming towards the end of your current coaching block. Can we have a chat about what you'd like to work towards next?"},
 {id:"welcome",name:"Welcome (no portal needed)",category:"onboarding",channel:"email",subject:"Welcome to TrainSmart Coaching",
  text:"Hi {{firstName}}, welcome to TrainSmart Coaching! We'll go through your training and your next steps together. You can train with me even if you don't use the app."},
 {id:"personal",name:"Personal follow-up",category:"general",channel:"whatsapp",subject:"Checking in",
  text:"Hi {{firstName}}, just checking in. How's everything going with your training? Let me know if you need anything."}
]);
const SUPPORTED_VARS=Object.freeze(["firstName","programme","milestone"]);
export const TEMPLATE_CATEGORIES=Object.freeze(["general","checkin","programme","milestone","payment","renewal","onboarding"]);
const clean=(v,max)=>String(v??"").trim().slice(0,max);
export function defaultContactPreference(clientId){
 if(typeof clientId!=="string"||!clientId)throw Error("A client ID is required.");
 return {clientId,serviceChannel:"none",marketingOptIn:false,contactConfirmedAt:""};
}
export function validContactPreference(p,id){
 return !!(p&&p.clientId===id&&["none",...CHANNELS].includes(p.serviceChannel)&&typeof p.marketingOptIn==="boolean");
}
export function changeContactPreference(old,channel,marketing=false){
 if(!old||!["none",...CHANNELS].includes(channel)||typeof marketing!=="boolean")throw Error("Choose a supported client contact preference.");
 return {...old,serviceChannel:channel,marketingOptIn:marketing,contactConfirmedAt:new Date().toISOString()};
}
export function validMessageTemplate(t){
 if(!t||typeof t.id!=="string"||!/^[a-z0-9_-]{1,70}$/.test(t.id))return false;
 if(!TEMPLATE_CATEGORIES.includes(t.category)||!CHANNELS.includes(t.channel))return false;
 if(!clean(t.name,70)||!clean(t.text,1200)||t.text.length>1200||!clean(t.subject,130)||t.subject.length>130)return false;
 const tokens=[...t.text.matchAll(/{{(.*?)}}/g)].map(m=>m[1].trim());
 return tokens.every(t=>SUPPORTED_VARS.includes(t));
}
export function createCustomTemplate(templates,form,id){
 if(!id||!/^[a-z0-9_-]+$/.test(id)||templates.some(t=>t.id===id)||MESSAGE_TEMPLATES.some(t=>t.id===id))throw Error("Duplicate or invalid template key.");
 const template={id,name:clean(form.name,70),category:String(form.category||"general"),
 channel:String(form.channel||"whatsapp"),subject:clean(form.subject,130),text:clean(form.text,1200),version:1};
 if(!validMessageTemplate(template))throw Error("Enter a valid title, subject and message. Only {{firstName}}, {{programme}} and {{milestone}} are supported.");
 return [...templates,template];
}
export function editCustomTemplate(templates,id,form){
 if(!templates.some(t=>t.id===id))throw Error("Only custom templates can be changed.");
 return templates.map(t=>{
  if(t.id!==id)return t;
  const template={...t,name:clean(form.name,70),category:String(form.category||t.category),channel:String(form.channel||t.channel),
   subject:clean(form.subject,130),text:clean(form.text,1200),version:t.version+1};
  if(!validMessageTemplate(template))throw Error("Invalid template. Supported tokens are {{firstName}}, {{programme}}, {{milestone}}.");
  return template;
 });
}
export function allMessageTemplates(custom=[]){return [...MESSAGE_TEMPLATES,...custom.filter(validMessageTemplate)];}
export function interpolateTemplate(input,context={}){
 const str=String(input??"");
 return str.replace(/{{(.*?)}}/g,(match,k)=>{
  if(!SUPPORTED_VARS.includes(k.trim()))return match;
  const replacement=context[k.trim()];
  return clean(replacement||({firstName:"there",programme:"your next programme",milestone:"your milestone"}[k.trim()]),80);
 });
}
export function canContact(preference,channel,contact={}){
 if(!preference||preference.serviceChannel!==channel||!CHANNELS.includes(channel))return false;
 if(channel==="email")return !!(contact.contactVerified&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(contact.email,110)));
 return !!(contact.contactVerified&&/^[+\d()\s-]+$/.test(clean(contact.phone,40))&&clean(contact.phone,40).replace(/\D/g,"").length>=7);
}
export function makeMessageDraft({id,client,template,channel,sourceKey="",context={},existing=[]}){
 if(!client?.id||!template||!validMessageTemplate(template))throw Error("Choose a client and an approved fictional template.");
 if(existing.length>=150)throw Error("Demo draft limit reached.");
 if(sourceKey&&existing.some(d=>d.sourceKey===sourceKey))return {drafts:existing,created:false};
 if(!CHANNELS.includes(channel))throw Error("Choose WhatsApp or email.");
 if(existing.some(d=>d.id===id))throw Error("Duplicate demo draft ID.");
 const firstName=String(client.name||"there").trim().split(/\s+/)[0];
 const data={firstName,...context};
 const draft={id,clientId:client.id,clientName:client.name,templateId:template.id,
  templateVersion:template.version||DEFAULT_TEMPLATE_VERSION,sourceKey,
  channel,subject:interpolateTemplate(template.subject,data),
  text:interpolateTemplate(template.text,data),status:"draft",coachNote:"",
  createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),approvedAt:"",coachMarkedAt:""};
 return {drafts:[draft,...existing],created:true};
}
export function validMessageDraft(d){
 return !!(d&&typeof d.id==="string"&&typeof d.clientId==="string"&&CHANNELS.includes(d.channel)&&
 ["draft","approved","coach_marked_sent"].includes(d.status)&&typeof d.text==="string"&&d.text.length<=2000&&
 typeof d.subject==="string"&&d.subject.length<=160);
}
export function editMessageDraft(drafts,id,form){
 const draft=drafts.find(d=>d.id===id);if(!draft)throw Error("Draft not found.");
 if(draft.status==="coach_marked_sent")throw Error("Externally marked messages are kept as historical records; create a new draft.");
 const text=clean(form.text,2000),subject=clean(form.subject,160),channel=String(form.channel||draft.channel);
 if(text.length<5||subject.length<3||!CHANNELS.includes(channel))throw Error("Enter a subject, message and valid channel.");
 return drafts.map(d=>d.id===id?{...d,text,subject,channel,status:"draft",approvedAt:"",coachMarkedAt:"",updatedAt:new Date().toISOString()}:d);
}
export function approveMessageDraft(drafts,id,pref,contacts){
 const draft=drafts.find(d=>d.id===id);if(!draft)throw Error("Draft not found.");
 if(draft.status==="coach_marked_sent")throw Error("The coach has already recorded this as sent externally.");
 if(!canContact(pref,draft.channel,contacts))throw Error("Confirm this client's service contact preference and contact details before approving.");
 return drafts.map(d=>d.id===id?{...d,status:"approved",approvedAt:new Date().toISOString()}:d);
}
export function markExternalSend(drafts,id,pref,contacts){
 const draft=drafts.find(d=>d.id===id);if(!draft||draft.status!=="approved")throw Error("Approve the draft before recording an external send.");
 if(!canContact(pref,draft.channel,contacts))throw Error("Client contact preference no longer permits this channel.");
 return drafts.map(d=>d.id===id?{...d,status:"coach_marked_sent",coachMarkedAt:new Date().toISOString()}:d);
}
export function whatsappDraftUrl(phone,message){
 const numeric=clean(phone,40).replace(/\D/g,"");
 if(numeric.length<7||numeric.length>15)throw Error("Fictional contact phone is missing or invalid.");
 if(!clean(message,2000))throw Error("No message to prepare.");
 const formatted=numeric.startsWith("07")?"44"+numeric.slice(1):numeric.startsWith("00")?numeric.slice(2):numeric;
 return "https://wa.me/"+formatted+"?text="+encodeURIComponent(message);
}
export function messageStats(drafts){
 return {total:drafts.length,draft:drafts.filter(d=>d.status==="draft").length,
 approved:drafts.filter(d=>d.status==="approved").length,
 coachMarked:drafts.filter(d=>d.status==="coach_marked_sent").length};
}
export function legacyDraftsToNew(old,clients){
 return (Array.isArray(old)?old:[]).filter(x=>typeof x.id==="string"&&typeof x.text==="string")
 .map(x=>{
  if(validMessageDraft(x))return x;
  const c=clients.find(c=>c.name===x.clientName)||null;
  if(!c)return null;
  return {id:x.id,clientId:c.id,clientName:c.name,templateId:"legacy",templateVersion:1,
   sourceKey:x.sourceId||x.id,channel:"email",subject:clean(x.title||"Coaching follow-up",160),
   text:clean(x.text,2000),status:"draft",createdAt:"",updatedAt:"",approvedAt:"",coachMarkedAt:""};
 }).filter(Boolean).slice(0,150);
}
