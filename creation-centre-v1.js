(()=>{
'use strict';
const P=window.CellboundPortraits;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STEPS=['race','appearance','features','class','identity','confirm'];
const STEP_NAMES={race:'Race',appearance:'Appearance',features:'Features',class:'Class',identity:'Identity',confirm:'Confirm'};
const STEP_COPY={
 race:['Choose your ancestry','Pick the race and body you want to build from.'],
 appearance:['Shape your adventurer','Adjust the core look of your character.'],
 features:['Add race features','Choose the details unique to this race.'],
 class:['Choose a calling','Pick how this character fights.'],
 identity:['Name your adventurer','Give this recruit their final name.'],
 confirm:['Ready to join the guild','Check the details and create your character.']
};
const LORE={
 Veyren:'Shadow-touched wanderers with dusky skin, long ears and ancient runes.',
 Stoneborn:'Living stone with broad mineral bodies, fractured ridges and crystal veins.',
 Aelari:'Celestial descendants with luminous eyes and pale arcane markings.',
 Thornkin:'Living woodland shaped by bark, roots, branches and new growth.',
 Emberkin:'Volcanic kin with charcoal skin and heat glowing beneath the surface.',
 Nymari:'Children of deep water with fins, smooth scales and luminous markings.'
};
const ROLE_COPY={
 Warrior:'Front-line fighter',Paladin:'Armoured protector',Hunter:'Ranged damage',
 Rogue:'Melee damage',Mage:'Arcane damage'
};
const BASIC_FIELDS=new Set(['frame','skinTone','face','brows','nose','mouth','eyeShape','eyes','hair','hairColor','facialHair']);
const FEATURE_FIELDS=new Set(['marking','feature','pattern','featureColor','texture','glow']);

const FIELD_LABELS={
 frame:'Frame',skinTone:'Skin',face:'Face',brows:'Brows',nose:'Nose',mouth:'Mouth',
 eyeShape:'Eye shape',eyes:'Eye colour',hair:'Hair',hairColor:'Hair colour',
 facialHair:'Facial hair',marking:'Marking',feature:'Race detail',pattern:'Body pattern',
 featureColor:'Feature colour',texture:'Surface detail',glow:'Glow intensity'
};
const APPEARANCE_GROUPS=[
 ['Body',['frame','skinTone']],
 ['Face',['face','brows','nose','mouth','eyeShape','eyes']],
 ['Hair',['hair','hairColor','facialHair']]
];
const FEATURE_GROUPS=[
 ['Markings',['marking']],
 ['Race features',['feature','pattern','featureColor','texture','glow']]
];
function fieldLabel(field,race){
 if(field==='feature')return P.RACES?.[race]?.featureLabel||'Race detail';
 return FIELD_LABELS[field]||field;
}
function fieldValue(field,value){
 const n=Number(value)||0,count=P.COUNTS?.[field]||1;
 if(field==='frame')return ['Lean','Balanced','Strong'][n]||'Balanced';
 if(field==='hair')return ['Bald','Cropped','Swept','Long','Crest','Braided'][n]||'Bald';
 if(field==='facialHair')return ['None','Stubble','Goatee','Full beard'][n]||'None';
 if(field==='glow')return ['Subtle','Soft','Bright','Radiant'][n]||'Soft';
 return String(n+1).padStart(2,'0')+' / '+String(count).padStart(2,'0');
}
function optionRow(d,field){
 const label=fieldLabel(field,d.race),value=fieldValue(field,d.appearance[field]);
 return '<div class="cc-option-row" data-cc-option="'+esc(field)+'">'+
  '<span class="cc-option-label">'+esc(label)+'</span>'+
  '<div class="cc-option-stepper">'+
   '<button type="button" data-appearance-field="'+esc(field)+'" data-direction="-1" aria-label="Previous '+esc(label)+'">‹</button>'+
   '<b>'+esc(value)+'</b>'+
   '<button type="button" data-appearance-field="'+esc(field)+'" data-direction="1" aria-label="Next '+esc(label)+'">›</button>'+
  '</div>'+
 '</div>';
}
function editorBlock(d,mode){
 const groups=mode==='features'?FEATURE_GROUPS:APPEARANCE_GROUPS;
 const content=groups.map(([title,fields])=>{
  const visible=fields.filter(field=>field!=='facialHair'||Number(d.appearance.gender)===0);
  return '<section class="cc-option-group"><h3>'+esc(title)+'</h3><div class="cc-options-grid">'+visible.map(field=>optionRow(d,field)).join('')+'</div></section>';
 }).join('');
 const random=mode==='appearance'?'<div class="cc-editor-tools"><button type="button" data-appearance-randomize>Randomise appearance</button></div>':'';
 return '<div class="cc-editor cc-editor-'+mode+'">'+random+content+'</div>';
}
function stepHeader(step,index){
 const copy=STEP_COPY[step]||['Create your character',''];
 return '<div class="cc-panel-heading"><span>STEP '+(index+1)+' OF '+STEPS.length+'</span><h2>'+esc(copy[0])+'</h2><p>'+esc(copy[1])+'</p></div>';
}
function navHTML(step){
 return '<nav class="creator-steps cc-rail" aria-label="Character creation steps">'+STEPS.map((s,i)=>
  '<button type="button" class="creator-step '+(s===step?'active':'')+'" data-builder-step="'+s+'" aria-current="'+(s===step?'step':'false')+'">'+
   '<i>'+(i+1)+'</i><span>'+esc(STEP_NAMES[s])+'</span>'+
  '</button>'
 ).join('')+'</nav>';
}
function racePanel(o,d){
 return '<div class="race-grid creator-choice-grid">'+o.races.map(r=>
  '<button type="button" class="race-card '+(r.id===d.race?'active':'')+'" data-race="'+esc(r.id)+'" aria-pressed="'+(r.id===d.race)+'">'+
   '<div class="cc-race-art">'+P.paperDollHTML({race:r.id,appearance:{...d.appearance,race:r.id}},{size:'race-choice',showGear:false})+'</div>'+
   '<div class="cc-race-copy"><b>'+esc(r.id)+'</b><p>'+esc(LORE[r.id]||'')+'</p>'+'</div>'+
  '</button>'
 ).join('')+'</div>'+
 '<div class="cc-inline-section"><div><b>Body</b><span>Choose the base model.</span></div><div class="cc-segmented" aria-label="Body">'+
 ['Male','Female'].map((name,i)=>'<button type="button" data-cc-sex="'+i+'" aria-pressed="'+(d.appearance.gender===i)+'">'+name+'</button>').join('')+
 '</div></div>';
}
function classPanel(o,d){
 return '<div class="class-grid creator-choice-grid">'+o.classes.map(c=>{
  const active=d.klass===c.klass&&d.spec===c.spec;
  const role=ROLE_COPY[c.klass]||'Adventurer';
  return '<button type="button" class="class-choice '+(active?'active':'')+'" data-class="'+esc(c.klass)+'" data-spec="'+esc(c.spec)+'" aria-pressed="'+active+'">'+
   '<strong aria-hidden="true">'+esc(c.icon||'◇')+'</strong>'+
   '<span class="cc-class-copy"><b>'+esc(c.klass)+'</b><small>'+esc(role)+'</small></span>'+
  '</button>';
 }).join('')+'</div>';
}
function identityPanel(d){
 return '<div class="cc-identity-card"><label class="cc-name-label" for="ccCharacterName">Character name</label>'+
  '<div class="name-builder"><input id="ccCharacterName" maxlength="24" autocomplete="off" value="'+esc(d.name)+'" placeholder="Enter a name"><button type="button" data-cc-random-name>Randomise</button></div>'+
  '<p class="cc-field-help">2–24 characters. You can review everything on the next step.</p></div>'+
  '<div class="cc-mini-summary"><div><span>Race</span><b>'+esc(d.race)+'</b></div><div><span>Class</span><b>'+esc(d.klass)+'</b></div></div>';
}
function confirmPanel(o,d){
 const gender=Number(d.appearance.gender)===1?'Female':'Male';
 return '<div class="cc-final-card"><span class="cc-final-kicker">GUILD RECRUIT</span><h3 data-cc-name>'+esc(d.name||'Unnamed')+'</h3>'+
  '<div class="cc-final-grid"><div><span>Race</span><b>'+esc(d.race)+'</b></div><div><span>Body</span><b>'+gender+'</b></div><div><span>Class</span><b>'+esc(d.klass)+'</b></div><div><span>Specialism</span><b>'+esc(d.spec||'Starting path')+'</b></div></div>'+
  (o.confirmHTML||'')+'</div><p class="cc-validation" role="status">'+esc(o.hint||'Everything look right? Create the character to add them to your roster.')+'</p>';
}
function scopeAppearance(){}
function render(o){
 const d=o.draft,root=o.mount;if(!root||!d||!P)return;
 d.appearance=P.normalizeAppearance(d.appearance,d.name||d.race,d.race);
 const step=STEPS.includes(o.step)?o.step:'race',index=STEPS.indexOf(step);
 const subject={name:d.name,race:d.race,class:d.klass,appearance:d.appearance,equipment:{}};
 const preview=P.paperDollHTML(subject,{size:'creator',showGear:false});
 let body='';
 if(step==='race')body=racePanel(o,d);
 if(step==='appearance')body=editorBlock(d,'basic');
 if(step==='features')body=editorBlock(d,'features');
 if(step==='class')body=classPanel(o,d);
 if(step==='identity')body=identityPanel(d);
 if(step==='confirm')body=confirmPanel(o,d);
 const previewName=d.name||'New recruit';
 root.innerHTML=
 '<div class="character-creator cc-centre cc-step-'+step+'">'+
  '<header class="cc-header"><div class="cc-brand"><span class="cc-brand-mark" aria-hidden="true">◇</span><div><small>CREATION CENTRE</small><h1>'+esc(o.title||'Forge a guild member')+'</h1></div></div>'+
  (o.onClose?'<button type="button" class="cc-close" data-cc-close aria-label="Close Creation Centre">×</button>':'')+'</header>'+
  '<div class="cc-layout">'+
   navHTML(step)+
   '<aside class="creator-hero cc-preview-stage"><div class="cc-preview-glow" aria-hidden="true"></div><span class="cc-preview-label">'+esc(d.race)+' · '+(Number(d.appearance.gender)===1?'Female':'Male')+'</span>'+
    '<div class="cc-preview-model">'+preview+'</div>'+
    '<div class="cc-preview-identity"><h2 data-cc-name>'+esc(previewName)+'</h2><p>'+esc(d.klass||'Choose a class')+'</p></div>'+(o.partyHTML||'')+
   '</aside>'+
   '<main class="cc-workbench"><section class="creator-panel">'+stepHeader(step,index)+body+
    '<footer>'+(index?'<button type="button" class="creator-back" data-prev-step="'+STEPS[index-1]+'">← Back</button>':'<span></span>')+
    (index<STEPS.length-1?'<button type="button" class="on-primary" data-next-step="'+STEPS[index+1]+'">Continue →</button>':'<button type="button" class="on-primary cc-create" data-cc-confirm '+(o.valid===false?'disabled':'')+'>'+esc(o.confirmLabel||'Create character')+'</button>')+
    '</footer></section></main>'+
  '</div>'+
 '</div>';
 const change=()=>o.onChange?.(d);
 root.querySelectorAll('[data-builder-step],[data-next-step],[data-prev-step]').forEach(b=>b.onclick=()=>o.onStep?.(b.dataset.builderStep||b.dataset.nextStep||b.dataset.prevStep));
 root.querySelectorAll('button[data-race]').forEach(b=>b.onclick=()=>{d.race=b.dataset.race;d.appearance=P.normalizeAppearance(d.appearance,d.name,d.race);change()});
 root.querySelectorAll('[data-cc-sex]').forEach(b=>b.onclick=()=>{d.appearance.gender=Number(b.dataset.ccSex);change()});
 root.querySelectorAll('button[data-class]').forEach(b=>b.onclick=()=>{d.klass=b.dataset.class;d.spec=b.dataset.spec;change()});
 P.bindEditor(root,d.appearance,change,{name:d.name,race:d.race});
 scopeAppearance(root,step);
 const input=root.querySelector('#ccCharacterName');
 if(input)input.oninput=()=>{
  d.name=input.value;
  root.querySelectorAll('[data-cc-name]').forEach(n=>n.textContent=d.name||'New recruit');
  o.onName?.(d);
  const button=root.querySelector('[data-cc-confirm]');
  if(button)button.disabled=o.isValid?!o.isValid():d.name.trim().length<2;
 };
 root.querySelector('[data-cc-random-name]')?.addEventListener('click',()=>{o.onRandomName?.(d);change()});
 root.querySelector('[data-cc-confirm]')?.addEventListener('click',async e=>{const b=e.currentTarget;if(b.disabled)return;b.disabled=true;try{await o.onConfirm?.()}finally{if(b.isConnected)b.disabled=false}});
 root.querySelector('[data-cc-close]')?.addEventListener('click',o.onClose);
 root.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>o.onSlot?.(Number(b.dataset.slot)));
}
window.CellboundCreationCentre={render,descriptions:LORE,version:2};
})();