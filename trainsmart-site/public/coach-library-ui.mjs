/* D05 fictional Coach Library UI, accessible iPad cards, no live publishing. */
import {EQUIPMENT,GYM_PRESET,MOVEMENTS,SKILL_LEVELS,METHOD_TYPES,equipmentName,
 filterExercises,exerciseEligible,substitutionOptions,libraryStats,missingExerciseReferences} from "./coach-library-model.mjs";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const option=(v,txt,sel)=>'<option value="'+esc(v)+'" '+(v===sel?"selected":"")+'>'+esc(txt)+'</option>';
const tag=(txt,approved=false)=>'<span class="tag '+(approved?"good":"warn")+'">'+esc(txt)+'</span>';
const flags=ex=>tag(ex.reviewStatus==="demo-reviewed"?"Demo reviewed":"Needs coach review",ex.reviewStatus==="demo-reviewed")+
 (!ex.active?'<span class="tag muted">Archived</span>':"");
const smallBtn=(action,label,more="")=>'<button type="button" class="btn btn-outline btn-sm" data-action="'+action+'" '+more+'>'+esc(label)+'</button>';
export function renderLibraryCentre({library,clients,tab="exercises",q="",movement="all",equipment="all",status="active",selectedClientId="",onlyClientFit=false}){
 const stats=libraryStats(library),client=clients.find(c=>c.id===selectedClientId&&c.status!=="Archived");
 const selectable=clients.filter(c=>c.status!=="Archived"),gear=client?library.clientEquipment[client.id]||[]:null;
 const tabs=[["exercises","Exercises"],["equipment","Equipment & clients"],["methods","Coaching methods"]];
 let main="";
 if(tab==="equipment"){
  const selected=client?.id||"";
  main='<section class="panel library-main"><div class="panel-header"><div><h3>TrainSmart Gym equipment</h3><p class="small-muted">Confirm equipment available to this client.</p></div>'+tag("10 equipment categories",true)+'</div>'+
  '<div class="library-gym-preset">'+EQUIPMENT.map(item=>'<div class="library-equipment-card"><span class="library-equipment-symbol">▣</span><div><strong>'+esc(item.name)+'</strong><small>'+esc(item.category)+'</small></div></div>').join("")+'</div></section>'+
  '<section class="panel library-main"><div class="panel-header"><h3>Client equipment access</h3>'+tag(client?"Fictional "+client.name:"Select client")+'</div>'+
   '<p class="library-help">Equipment changes affect filters, not existing plans or logs.</p>'+
   '<label for="library-equipment-client">Fictional client</label><select id="library-equipment-client">'+option("","Choose a client",selected)+selectable.map(c=>option(c.id,c.name,selected)).join("")+'</select>'+
   (client?'<form id="library-client-equipment-form" data-client-id="'+esc(client.id)+'">'+
   '<div class="library-equipment-checks">'+EQUIPMENT.map(item=>'<label><input type="checkbox" name="equipmentId" value="'+esc(item.id)+'" '+(gear.includes(item.id)?"checked":"")+'><span>'+esc(item.name)+'</span></label>').join("")+'</div>'+
   '<div class="library-form-actions">'+smallBtn("library-gym-preset","Use all Gym equipment",'data-client-id="'+esc(client.id)+'"')+
    '<button class="btn btn-primary" type="submit">Save equipment</button></div></form>'+
   '<p class="small-muted">'+gear.length+' equipment categories currently available to this client. Use the Exercise filter to see which exercises might fit; nothing is prescribed automatically.</p>':
   '<div class="empty"><h3>Choose a client</h3><p>Select a client to edit equipment.</p></div>')+'</section>';
 }else if(tab==="methods"){
  const methods=library.methods.filter(m=>!q||[m.name,m.type,m.notes].join(" ").toLowerCase().includes(q.toLowerCase()));
  main='<section class="panel library-main"><div class="panel-header"><div><h3>Reusable coaching methods</h3><p class="small-muted">Example methods. Progression rules are not verified.</p></div>'+
  '<button class="btn btn-primary btn-sm" data-action="library-add-method" type="button">+ Add method</button></div>'+
  '<div class="library-method-grid">'+methods.map(m=>'<article class="library-method-card"><div class="library-card-heading"><div><p class="eyebrow">'+esc(m.type.replaceAll("_"," "))+' · v'+m.version+'</p><h3>'+esc(m.name)+'</h3></div>'+
  tag(m.reviewStatus==="demo-reviewed"?"Demo reviewed":"Needs review",m.reviewStatus==="demo-reviewed")+'</div>'+
  '<div class="library-method-numbers">'+[
   ["Feeder",m.feederSets],["Working",m.workingSets],["Reps",m.repsMin+"–"+m.repsMax],
   ["Rest",m.restSeconds+"s"],["Tempo",m.tempo]
  ].map(([name,value])=>'<div><small>'+esc(name)+'</small><strong>'+esc(value)+'</strong></div>').join("")+'</div>'+
  '<p>'+esc(m.notes)+'</p><div class="library-card-actions">'+smallBtn("library-edit-method","Edit",'data-id="'+esc(m.id)+'"')+
  smallBtn("library-review-method",m.reviewStatus==="pending"?"Mark demo-reviewed":"Return to review",'data-id="'+esc(m.id)+'"')+'</div></article>').join("")+'</div>'+
  (!methods.length?'<div class="empty"><h3>No matching methods</h3></div>':"")+'</section>';
 }else{
  const available=client?gear:null;
  const records=filterExercises(library.exercises,{q,movement,equipment,status,available:client&&onlyClientFit?gear:null});
  const selectedRecords=records.map(ex=>({ex,clientFit:available===null?null:ex.primaryEquipment.every(eq=>available.includes(eq))}));
  main='<section class="panel library-main"><div class="panel-header"><div><h3>Exercise catalogue</h3><p class="small-muted">Find exercises, substitutes and equipment matches.</p></div>'+
  '<button type="button" class="btn btn-primary btn-sm" data-action="library-add-exercise">+ Add exercise</button></div>'+
  '<div class="library-filters"><div><label for="library-search">Search</label><input id="library-search" type="search" maxlength="85" value="'+esc(q)+'" placeholder="Exercise, muscle group, tag…"></div>'+
  '<div><label for="library-movement">Movement</label><select id="library-movement">'+option("all","All movements",movement)+MOVEMENTS.map(m=>option(m,m,movement)).join("")+'</select></div>'+
  '<div><label for="library-equipment">Equipment</label><select id="library-equipment">'+option("all","All equipment",equipment)+EQUIPMENT.map(e=>option(e.id,e.name,equipment)).join("")+'</select></div>'+
  '<div><label for="library-status">Review status</label><select id="library-status">'+[
   ["active","Active"],["all","All"],["pending","Pending review"],["reviewed","Demo reviewed"],["archived","Archived"]
  ].map(([id,name])=>option(id,name,status)).join("")+'</select></div></div>'+
  '<div class="library-client-fit"><label for="library-client">Check client equipment</label><select id="library-client">'+option("","All clients / no filter",selectedClientId)+
  selectable.map(c=>option(c.id,c.name,selectedClientId)).join("")+'</select>'+
  (client?'<span class="small-muted">'+gear.length+' available equipment categories · '+esc(client.name)+'</span>':
   '<span class="small-muted">Use the Equipment tab to edit a client’s available equipment.</span>')+'</div>'+
  (client?'<label class="library-eligible-toggle"><input type="checkbox" id="library-fit-only" '+(onlyClientFit?"checked":"")+'><span>Show reviewed, compatible exercises</span></label>':"")+
  '<div class="library-exercise-grid">'+selectedRecords.map(({ex,clientFit})=>{
   const subs=substitutionOptions(ex,library.exercises,available||GYM_PRESET);
   return '<article class="library-exercise-card"><div class="library-card-heading"><div><p class="eyebrow">'+esc(ex.movement)+' · '+esc(ex.category)+'</p><h3>'+esc(ex.name)+'</h3></div>'+flags(ex)+'</div>'+
   '<p class="library-stable-id">Stable ID: <code>'+esc(ex.id)+'</code> · version '+esc(ex.version)+'</p>'+
   '<p class="library-gear"><strong>Required:</strong> '+ex.primaryEquipment.map(equipmentName).map(esc).join(", ")+'</p>'+
   '<div class="library-exercise-meta"><span class="tag muted">'+esc(ex.level)+'</span>'+ex.tags.map(t=>'<span class="tag muted">'+esc(t)+'</span>').join("")+'</div>'+
   (clientFit===null?"":'<p class="library-compat">'+(clientFit?"✓ Equipment available":"⚠ Equipment missing for "+esc(client.name))+
    (clientFit&&ex.reviewStatus==="demo-reviewed"?" · Demo eligible":" · Coach review needed")+'</p>')+
   '<p class="library-exercise-note">'+esc(ex.setupNotes||"No setup notes")+'</p>'+
   (subs.length?'<p class="library-substitutions"><strong>Alternatives:</strong> '+subs.map(v=>esc(v.name)+(v.available?" ✓":" · needs review")).join(", ")+'</p>':"")+
   (ex.videoUrl?'<a href="'+esc(ex.videoUrl)+'" rel="noopener noreferrer" target="_blank">View supplied demo link</a>':"")+
   '<div class="library-card-actions">'+smallBtn("library-edit-exercise","Edit",'data-id="'+esc(ex.id)+'"')+
   smallBtn("library-review-exercise",ex.reviewStatus==="pending"?"Demo review":"Reopen review",'data-id="'+esc(ex.id)+'"')+
   smallBtn("library-toggle-exercise",ex.active?"Archive":"Restore",'data-id="'+esc(ex.id)+'"')+'</div></article>';
  }).join("")+'</div>'+
  (!selectedRecords.length?'<div class="empty"><h3>No matching exercises</h3><p>Adjust search or filters; archived or missing exercises are never silently replaced.</p></div>':"")+
  '</section>';
 }
 return '<div class="library-header"><div><p class="eyebrow">EXERCISE LIBRARY</p><h2>Exercise & coaching library</h2>'+
 '<p>Sample catalogue. TrainSmart’s original library is not yet verified.</p></div>'+
 '<span class="tag warn">Not approved for real clients</span></div>'+
 '<div class="library-stats">'+[
 ["Example exercises",stats.exercises],["Waiting for review",stats.needsReview],["Gym equipment",stats.equipment],["Method templates",stats.methods]
 ].map(([title,n])=>'<div class="stat"><p class="stat-label">'+esc(title)+'</p><div class="stat-number">'+n+'</div></div>').join("")+'</div>'+
 '<div class="library-tabs" role="group" aria-label="Library section">'+tabs.map(([key,name])=>
 '<button type="button" class="seg '+(tab===key?"active":"")+'" data-library-tab="'+key+'">'+esc(name)+'</button>').join("")+'</div>'+
 '<div class="library-warning"><strong>Source verification still needed.</strong> Demo review is not production approval. Verify exercises, rules and links before real use.</div>'+
 main+'<p class="footer-bits">Sample library only. No live data or prescriptions.</p>';
}
function eqCheckboxes(field,selected){
 return '<fieldset class="library-equipment-fieldset"><legend>'+esc(field==="primaryEquipment"?"Required equipment":"Additional / optional equipment")+'</legend>'+
 '<div class="library-checks">'+EQUIPMENT.map(e=>'<label><input type="checkbox" name="'+esc(field)+'" value="'+esc(e.id)+'" '+(selected.includes(e.id)?"checked":"")+'><span>'+esc(e.name)+'</span></label>').join("")+'</div></fieldset>';
}
export function exerciseDialog(ex=null){
 const data=ex||{name:"",movement:"squat",category:"",level:"beginner",primaryEquipment:[],secondaryEquipment:[],substitutions:[],tags:[],setupNotes:"",cues:"",videoUrl:""};
 return '<label for="lib-ex-name">Exercise name</label><input id="lib-ex-name" name="name" maxlength="85" required value="'+esc(data.name)+'">'+
 '<div class="form-grid"><div><label for="lib-ex-movement">Movement</label><select name="movement" id="lib-ex-movement">'+MOVEMENTS.map(m=>option(m,m,data.movement)).join("")+'</select></div>'+
 '<div><label for="lib-ex-level">Experience level</label><select name="level" id="lib-ex-level">'+SKILL_LEVELS.map(m=>option(m,m,data.level)).join("")+'</select></div></div>'+
 '<label for="lib-ex-category">Muscle/category</label><input id="lib-ex-category" name="category" maxlength="60" value="'+esc(data.category)+'" placeholder="e.g. Lower body">'+
 eqCheckboxes("primaryEquipment",data.primaryEquipment)+eqCheckboxes("secondaryEquipment",data.secondaryEquipment)+
 '<label for="lib-ex-subs">Stable IDs of permitted alternatives (comma-separated)</label><input id="lib-ex-subs" name="substitutions" value="'+esc(data.substitutions.join(","))+'" placeholder="demo:band-row">'+
 '<label for="lib-ex-tags">Search tags (comma-separated)</label><input id="lib-ex-tags" name="tags" value="'+esc(data.tags.join(","))+'" placeholder="strength, lower">'+
 '<label for="lib-ex-setup">Setup notes</label><textarea id="lib-ex-setup" name="setupNotes" rows="2" maxlength="400">'+esc(data.setupNotes)+'</textarea>'+
 '<label for="lib-ex-cues">Coach cues</label><textarea id="lib-ex-cues" name="cues" rows="2" maxlength="400">'+esc(data.cues)+'</textarea>'+
 '<label for="lib-ex-video">Coach-selected YouTube video link (optional)</label><input id="lib-ex-video" name="videoUrl" type="url" maxlength="260" value="'+esc(data.videoUrl)+'" placeholder="https://www.youtube.com/watch?v=...">'+
 '<p class="small-muted">Saving creates a new version and requires review. Existing plans are unchanged.</p>';
}
export function methodDialog(m=null){
 const data=m||{name:"",type:"straight",feederSets:0,workingSets:3,repsMin:8,repsMax:10,rir:2,tempo:"2-0-2-0",restSeconds:90,notes:""};
 return '<label for="lib-method-name">Method name</label><input name="name" id="lib-method-name" maxlength="80" required value="'+esc(data.name)+'">'+
 '<label for="lib-method-type">Method type</label><select name="type" id="lib-method-type">'+METHOD_TYPES.map(t=>option(t,t.replaceAll("_"," + "),data.type)).join("")+'</select>'+
 '<div class="library-number-grid">'+[
 ["feederSets","Feeder sets",0,3,1],["workingSets","Working sets",1,8,1],["repsMin","Reps minimum",1,60,1],
 ["repsMax","Reps maximum",1,60,1],["restSeconds","Rest (seconds)",20,300,5]
 ].map(([id,label,min,max,step])=>'<div><label for="lib-method-'+id+'">'+label+'</label><input type="number" name="'+id+'" id="lib-method-'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+esc(data[id])+'" required></div>').join("")+'</div>'+
 '<label for="lib-method-tempo">Tempo (e.g. 2-0-2-0)</label><input name="tempo" id="lib-method-tempo" pattern="[0-9]-[0-9]-[0-9]-[0-9]" value="'+esc(data.tempo)+'" required>'+
 '<label for="lib-method-notes">Coach method notes</label><textarea name="notes" id="lib-method-notes" rows="3" maxlength="400">'+esc(data.notes)+'</textarea>'+
 '<p class="small-muted">Top/back-off/drop/AMRAP labels are example structures only. No automatic loading or progression is calculated until the original rules are verified.</p>';
}
