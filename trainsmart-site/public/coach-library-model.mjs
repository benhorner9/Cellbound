/*
 * TrainSmart D05 — fictional exercise, equipment and coaching-method libraries.
 * Stable demo IDs, immutable versioned edits, no live programme prescription.
 * The real exercise catalogue and Progressive Logbook V3 rules are NOT imported.
 */
export const EQUIPMENT=Object.freeze([
 {id:"barbell-rack",name:"Barbell / Rack",category:"strength"},
 {id:"dumbbells",name:"Dumbbells",category:"strength"},
 {id:"medicine-balls",name:"Medicine Balls",category:"strength"},
 {id:"boxes",name:"Boxes",category:"strength"},
 {id:"rower",name:"Rower",category:"conditioning"},
 {id:"trx",name:"TRX Row / Suspension Trainer",category:"strength"},
 {id:"air-bike",name:"Air Bike",category:"conditioning"},
 {id:"skierg",name:"SkiErg",category:"conditioning"},
 {id:"bands",name:"Bands",category:"strength"},
 {id:"bodyweight",name:"Bodyweight / Floor",category:"bodyweight"}
]);
export const GYM_PRESET=Object.freeze(EQUIPMENT.map(x=>x.id));
export const MOVEMENTS=Object.freeze(["squat","hinge","push","pull","lunge","core","carry","conditioning"]);
export const SKILL_LEVELS=Object.freeze(["beginner","intermediate","advanced"]);
export const METHOD_TYPES=Object.freeze(["straight","top_backoff","drop","amrap"]);
export const EXERCISE_FIXTURES=Object.freeze([
 {id:"demo:goblet-squat",name:"Dumbbell Goblet Squat",movement:"squat",category:"Lower body",level:"beginner",primaryEquipment:["dumbbells"],secondaryEquipment:["bodyweight"],substitutions:["demo:box-squat"],tags:["strength","lower"]},
 {id:"demo:box-squat",name:"Box Squat (sample)",movement:"squat",category:"Lower body",level:"beginner",primaryEquipment:["boxes","bodyweight"],secondaryEquipment:[],substitutions:["demo:goblet-squat"],tags:["lower","technique"]},
 {id:"demo:db-press",name:"Dumbbell Bench Press",movement:"push",category:"Upper body",level:"intermediate",primaryEquipment:["dumbbells"],secondaryEquipment:[],substitutions:["demo:band-press"],tags:["strength","upper"]},
 {id:"demo:band-press",name:"Band Press",movement:"push",category:"Upper body",level:"beginner",primaryEquipment:["bands"],secondaryEquipment:[],substitutions:["demo:db-press"],tags:["upper"]},
 {id:"demo:trx-row",name:"TRX Row",movement:"pull",category:"Upper body",level:"beginner",primaryEquipment:["trx"],secondaryEquipment:[],substitutions:["demo:band-row"],tags:["upper"]},
 {id:"demo:band-row",name:"Band Row",movement:"pull",category:"Upper body",level:"beginner",primaryEquipment:["bands"],secondaryEquipment:[],substitutions:["demo:trx-row"],tags:["upper"]},
 {id:"demo:bb-deadlift",name:"Barbell Deadlift",movement:"hinge",category:"Lower body",level:"advanced",primaryEquipment:["barbell-rack"],secondaryEquipment:[],substitutions:[],tags:["strength","lower"]},
 {id:"demo:db-lunge",name:"Dumbbell Reverse Lunge",movement:"lunge",category:"Lower body",level:"intermediate",primaryEquipment:["dumbbells"],secondaryEquipment:[],substitutions:[],tags:["lower"]},
 {id:"demo:core",name:"Band Pallof Press",movement:"core",category:"Core",level:"beginner",primaryEquipment:["bands"],secondaryEquipment:[],substitutions:[],tags:["core"]},
 {id:"demo:row",name:"Rower Conditioning",movement:"conditioning",category:"Conditioning",level:"beginner",primaryEquipment:["rower"],secondaryEquipment:[],substitutions:["demo:airbike"],tags:["conditioning"]},
 {id:"demo:airbike",name:"Air Bike Conditioning",movement:"conditioning",category:"Conditioning",level:"beginner",primaryEquipment:["air-bike"],secondaryEquipment:[],substitutions:["demo:row"],tags:["conditioning"]},
 {id:"demo:skierg",name:"SkiErg Conditioning",movement:"conditioning",category:"Conditioning",level:"beginner",primaryEquipment:["skierg"],secondaryEquipment:[],substitutions:[],tags:["conditioning"]},
 {id:"demo:med-ball",name:"Medicine Ball Slam",movement:"hinge",category:"Full body",level:"intermediate",primaryEquipment:["medicine-balls"],secondaryEquipment:[],substitutions:[],tags:["power"]},
 {id:"demo:step-up",name:"Box Step-up",movement:"lunge",category:"Lower body",level:"beginner",primaryEquipment:["boxes"],secondaryEquipment:[],substitutions:[],tags:["lower"]}
].map(x=>Object.freeze({...x,setupNotes:"Coach confirmation required; this is an example, not instruction.",cues:"Not approved for client use.",videoUrl:"",version:1,reviewStatus:"pending",active:true,source:"fictional-example"})));
export const METHOD_FIXTURES=Object.freeze([
 {id:"demo:straight",name:"Straight working sets (example)",type:"straight",feederSets:1,workingSets:3,repsMin:8,repsMax:10,rir:2,tempo:"2-0-2-0",restSeconds:90,
 notes:"Example structure only — exact TrainSmart progression requires review.",version:1,reviewStatus:"pending"},
 {id:"demo:top-backoff",name:"Top set + back-off (example)",type:"top_backoff",feederSets:2,workingSets:3,repsMin:5,repsMax:8,rir:2,tempo:"2-0-1-0",restSeconds:120,
 notes:"Example only — no automated load changes until source rules are verified.",version:1,reviewStatus:"pending"},
 {id:"demo:drop",name:"Drop set (example)",type:"drop",feederSets:0,workingSets:2,repsMin:8,repsMax:12,rir:2,tempo:"2-0-2-0",restSeconds:120,
 notes:"Example method type, NOT an approved loading or safety prescription.",version:1,reviewStatus:"pending"},
 {id:"demo:amrap",name:"AMRAP (example)",type:"amrap",feederSets:1,workingSets:1,repsMin:6,repsMax:12,rir:1,tempo:"2-0-1-0",restSeconds:180,
 notes:"Example method only — no automatic effort progression or client assignment.",version:1,reviewStatus:"pending"}
].map(x=>Object.freeze({...x,source:"fictional-example"})));
const val=(s,n=240)=>String(s??"").trim().slice(0,n);
export function validEquipmentIds(ids){return Array.isArray(ids)&&ids.every(id=>EQUIPMENT.some(x=>x.id===id))&&new Set(ids).size===ids.length;}
export function equipmentName(id){return EQUIPMENT.find(x=>x.id===id)?.name||"Unknown equipment";}
export function defaultClientEquipment(client){
 const raw=String(client?.equipment||"").toLowerCase();
 if(raw.includes("trainsmart gym"))return [...GYM_PRESET];
 let ids=[];
 if(/dumbbells?/.test(raw))ids.push("dumbbells");
 if(/bands?/.test(raw))ids.push("bands");
 if(/barbell/.test(raw))ids.push("barbell-rack");
 if(/rower/.test(raw))ids.push("rower");
 return [...new Set(ids)];
}
export function validExercise(ex){
 return !!(ex&&/^(demo|custom):[a-z0-9-]+$/.test(ex.id)&&val(ex.name,85).length>=3&&
 MOVEMENTS.includes(ex.movement)&&SKILL_LEVELS.includes(ex.level)&&typeof ex.category==="string"&&
 validEquipmentIds(ex.primaryEquipment)&&ex.primaryEquipment.length>=1&&
 validEquipmentIds(ex.secondaryEquipment)&&Array.isArray(ex.tags)&&ex.tags.length<=8&&
 ex.tags.every(t=>/^[a-z0-9 -]{1,28}$/.test(t))&&Array.isArray(ex.substitutions)&&ex.substitutions.length<=8&&
 ex.substitutions.every(t=>/^(demo|custom):[a-z0-9-]+$/.test(t)&&t!==ex.id)&&
 typeof ex.setupNotes==="string"&&ex.setupNotes.length<=400&&
 typeof ex.cues==="string"&&ex.cues.length<=400&&
 typeof ex.videoUrl==="string"&&(!ex.videoUrl||(/^https:\/\//i.test(ex.videoUrl)&&!/[<>"'\s]/.test(ex.videoUrl)))&&
 Number.isInteger(ex.version)&&ex.version>=1&&["pending","demo-reviewed"].includes(ex.reviewStatus)&&
 typeof ex.active==="boolean"&&["fictional-example","coach-demo"].includes(ex.source));
}
function toFields(form){
 const get=(k)=>val(form[k]||"",400);
 const parse=(k)=>String(form[k]||"").split(",").map(x=>x.trim()).filter(Boolean);
 return {name:get("name").slice(0,85),movement:get("movement"),category:get("category").slice(0,60),
 level:get("level"),primaryEquipment:parse("primaryEquipment"),secondaryEquipment:parse("secondaryEquipment"),
 substitutions:parse("substitutions"),tags:parse("tags").map(x=>x.toLowerCase()),setupNotes:get("setupNotes"),cues:get("cues"),
 videoUrl:get("videoUrl").slice(0,260)};
}
export function createExercise(list,form,id){
 if(list.length>=100)throw Error("Demo exercise limit reached.");
 if(!/^custom:[a-z0-9-]+$/.test(id)||list.some(x=>x.id===id)||EXERCISE_FIXTURES.some(x=>x.id===id))
  throw Error("Stable exercise ID invalid or already used.");
 const ex={...toFields(form),id,version:1,reviewStatus:"pending",active:true,source:"coach-demo"};
 if(!validExercise(ex))throw Error("Check name, movement, equipment, level, tags, substitutions and HTTPS video URL.");
 return [...list,ex];
}
export function editExercise(list,id,form){
 const existing=list.find(x=>x.id===id);
 if(!existing)throw Error("The exercise could not be found.");
 const changed={...existing,...toFields(form),version:existing.version+1,reviewStatus:"pending"};
 if(!validExercise(changed))throw Error("Invalid exercise edit; review required.");
 return list.map(x=>x.id===id?changed:x);
}
export function setExerciseReviewed(list,id,reviewed){
 if(typeof reviewed!=="boolean")throw Error("Invalid review decision.");
 if(!list.some(x=>x.id===id))throw Error("Exercise not found.");
 return list.map(x=>x.id===id?{...x,reviewStatus:reviewed?"demo-reviewed":"pending"}:x);
}
export function setExerciseActive(list,id,active){
 if(typeof active!=="boolean")throw Error("Invalid active status.");
 if(!list.some(x=>x.id===id))throw Error("Exercise not found.");
 return list.map(x=>x.id===id?{...x,active}:x);
}
export function canUseForActualProgramme(ex){return false;} // only backend source/insurance approval can ever unlock this.
export function exerciseEligible(ex,available){
 return !!(validExercise(ex)&&ex.active&&ex.reviewStatus==="demo-reviewed"&&
 validEquipmentIds(available)&&ex.primaryEquipment.every(eq=>available.includes(eq)));
}
export function filterExercises(list,{q="",movement="all",equipment="all",status="all",available=null}={}){
 const text=val(q,85).toLowerCase();
 return list.filter(ex=>(!text||[ex.name,ex.category,ex.movement,...ex.tags].join(" ").toLowerCase().includes(text))&&
 (movement==="all"||ex.movement===movement)&&(equipment==="all"||ex.primaryEquipment.includes(equipment))&&
 (status==="all"||status==="active"&&ex.active||status==="archived"&&!ex.active||
 status==="reviewed"&&ex.reviewStatus==="demo-reviewed"||status==="pending"&&ex.reviewStatus==="pending")&&
 (available===null||exerciseEligible(ex,available)));
}
export function substitutionOptions(ex,list,available){
 if(!ex||!list.some(x=>x.id===ex.id))throw Error("Source exercise unavailable.");
 return ex.substitutions.map(id=>{
  const target=list.find(x=>x.id===id);
  return {id,name:target?.name||"Unavailable substitution",available:!!(target&&exerciseEligible(target,available)),needsReview:!target||!target.active||target.reviewStatus!=="demo-reviewed"};
 });
}
export function missingExerciseReferences(ids,list){
 return ids.map(id=>({id,exercise:list.find(x=>x.id===id)||null})).filter(item=>!item.exercise||!item.exercise.active||item.exercise.reviewStatus!=="demo-reviewed");
}
export function validMethod(m){
 return !!(m&&/^(demo|custom):[a-z0-9-]+$/.test(m.id)&&val(m.name,80).length>=4&&METHOD_TYPES.includes(m.type)&&
 Number.isInteger(m.feederSets)&&m.feederSets>=0&&m.feederSets<=3&&
 Number.isInteger(m.workingSets)&&m.workingSets>=1&&m.workingSets<=8&&
 Number.isInteger(m.repsMin)&&m.repsMin>=1&&m.repsMin<=60&&
 Number.isInteger(m.repsMax)&&m.repsMax>=m.repsMin&&m.repsMax<=60&&
 (m.rir===null||m.rir===undefined||Number.isInteger(m.rir)&&m.rir>=0&&m.rir<=5)&&
 Number.isInteger(m.restSeconds)&&m.restSeconds>=20&&m.restSeconds<=300&&
 /^\d-\d-\d-\d$/.test(m.tempo)&&typeof m.notes==="string"&&m.notes.length<=400&&
 Number.isInteger(m.version)&&m.version>=1&&["pending","demo-reviewed"].includes(m.reviewStatus)&&
 ["fictional-example","coach-demo"].includes(m.source));
}
function methodForm(form){return {name:val(form.name,80),type:String(form.type||"straight"),
 feederSets:Number(form.feederSets),workingSets:Number(form.workingSets),repsMin:Number(form.repsMin),
 repsMax:Number(form.repsMax),rir:form.rir===undefined||form.rir===null||String(form.rir).trim()===""?null:Number(form.rir),tempo:val(form.tempo,20),restSeconds:Number(form.restSeconds),
 notes:val(form.notes,400)};}
export function createMethod(list,form,id){
 if(list.length>=70)throw Error("Demo methods limit reached.");
 if(!/^custom:[a-z0-9-]+$/.test(id)||list.some(x=>x.id===id)||METHOD_FIXTURES.some(x=>x.id===id))throw Error("Invalid or duplicate method ID.");
 const m={...methodForm(form),id,source:"coach-demo",version:1,reviewStatus:"pending"};
 if(!validMethod(m))throw Error("Use approved ranges: feeder 0–3, working 1–8, reps 1–60, optional RIR 0–5, rest 20–300 seconds, tempo 0-0-0-0.");
 return [...list,m];
}
export function editMethod(list,id,form){
 const original=list.find(x=>x.id===id);
 if(!original)throw Error("Method does not exist.");
 const next={...original,...methodForm(form),version:original.version+1,reviewStatus:"pending"};
 if(!validMethod(next))throw Error("Invalid method numbers or tempo.");
 return list.map(m=>m.id===id?next:m);
}
export function setMethodReviewed(list,id,reviewed){
 if(typeof reviewed!=="boolean"||!list.some(m=>m.id===id))throw Error("Method review not possible.");
 return list.map(m=>m.id===id?{...m,reviewStatus:reviewed?"demo-reviewed":"pending"}:m);
}
export function canUseMethodInActualProgramme(m){return false;}
export function validLibraryState(state){
 return !!(state&&Array.isArray(state.exercises)&&state.exercises.length<=100&&state.exercises.every(validExercise)&&
 new Set(state.exercises.map(x=>x.id)).size===state.exercises.length&&
 Array.isArray(state.methods)&&state.methods.length<=70&&state.methods.every(validMethod)&&
 new Set(state.methods.map(m=>m.id)).size===state.methods.length&&typeof state.clientEquipment==="object");
}
export function initialLibrary(clients=[]){
 return {exercises:EXERCISE_FIXTURES.map(x=>({...x,tags:[...x.tags],primaryEquipment:[...x.primaryEquipment],
 secondaryEquipment:[...x.secondaryEquipment],substitutions:[...x.substitutions]})),
 methods:METHOD_FIXTURES.map(x=>({...x})),clientEquipment:Object.fromEntries(clients.map(c=>[c.id,defaultClientEquipment(c)]))};
}
export function setClientEquipment(lib,clientId,selection){
 if(!lib||!clientId||!validEquipmentIds(selection))throw Error("Choose known equipment items for the fictional client.");
 return {...lib,clientEquipment:{...lib.clientEquipment,[clientId]:[...selection]}};
}
export function libraryStats(lib){
 return {exercises:lib.exercises.length,needsReview:lib.exercises.filter(x=>x.reviewStatus==="pending").length,
 equipment:EQUIPMENT.length,methods:lib.methods.length};
}
