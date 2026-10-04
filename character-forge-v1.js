(()=>{
'use strict';
const P=window.CellboundPortraits;
const VERSION=1;
const STEPS=['form','class','identity','confirm'];
const STEP_NAMES={form:'Body',class:'Class',identity:'Identity',confirm:'Confirm'};
const LORE={
 Veyren:'Shadow-touched and adaptable. Lean, alert and naturally attuned to arcane energy.',
 Stoneborn:'Ancient mineral-bodied people built around mass, resilience and raw physical presence.',
 Aelari:'Refined and ethereal, with a lighter silhouette and a strong connection to higher magic.',
 Thornkin:'Living woodland beings whose bodies are grown from bark, fibre and new growth.',
 Emberkin:'Fire-blooded people with volcanic skin and heat burning visibly beneath the surface.',
 Nymari:'Aquatic-adapted people with cool skin, fins and a clean, agile silhouette.'
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sexName=g=>Number(g)===1?'Female':'Male';
const asset=(race,gender)=>'./assets/characters/forge-bases/'+String(race||'Veyren').toLowerCase()+'-'+(Number(gender)===1?'female':'male')+'.png';
function appearance(race,gender,prior){
 const raw={...(prior||{}),race,gender:Number(gender)===1?1:0,frame:1,skinTone:0,face:0,brows:0,nose:0,mouth:0,eyeShape:0,eyes:0,hair:0,hairColor:0,facialHair:0,marking:0,feature:0,pattern:0,featureColor:0,texture:0,glow:0};
 const a=P?.normalizeAppearance?P.normalizeAppearance(raw,'forge',race):raw;
 return {...a,race,gender:raw.gender,frame:1,skinTone:0,face:0,brows:0,nose:0,mouth:0,eyeShape:0,eyes:0,hair:0,hairColor:0,facialHair:0,marking:0,feature:0,pattern:0,featureColor:0,texture:0,glow:0};
}
function ensureDraft(d){
 d.race=d.race||'Veyren';
 const gender=Number(d.appearance?.gender)===1?1:0;
 d.appearance=appearance(d.race,gender,d.appearance);
 return d;
}
function normaliseStep(step){return STEPS.includes(step)?step:(step==='race'||step==='appearance'||step==='features'?'form':'form')}
function previewHTML(d,cls=''){
 return '<div class="cf-model '+cls+'"><img src="'+asset(d.race,d.appearance.gender)+'" alt="'+esc(d.race+' '+sexName(d.appearance.gender))+' base model" draggable="false"></div>';
}
function nav(step){
 return '<nav class="cf-steps">'+STEPS.map((s,i)=>'<button type="button" data-forge-step="'+s+'" class="'+(s===step?'active':'')+'"><i>'+(i+1)+'</i><span>'+STEP_NAMES[s]+'</span></button>').join('')+'</nav>';
}
function formPanel(o,d){
 const races=o.races||[];
 return '<div class="cf-body-pick"><div class="cf-sex"><span>BODY</span>'+
  [0,1].map(g=>'<button type="button" data-forge-sex="'+g+'" class="'+(Number(d.appearance.gender)===g?'active':'')+'">'+sexName(g)+'</button>').join('')+
 '</div><div class="cf-race-grid">'+races.map(r=>'<button type="button" class="cf-race-card '+(r.id===d.race?'active':'')+'" data-forge-race="'+esc(r.id)+'">'+
   '<div class="cf-race-model"><img src="'+asset(r.id,d.appearance.gender)+'" alt="" draggable="false"></div>'+
   '<div><b>'+esc(r.id)+'</b><small>'+esc(r.trait||'')+'</small><p>'+esc(LORE[r.id]||r.lore||'')+'</p></div>'+
  '</button>').join('')+'</div></div>';
}
function classPanel(o,d){
 return '<div class="cf-class-grid">'+(o.classes||[]).map(c=>{
   const active=d.klass===c.klass&&d.spec===c.spec;
   return '<button type="button" data-forge-class="'+esc(c.klass)+'" data-forge-spec="'+esc(c.spec)+'" class="'+(active?'active':'')+'"><strong>'+esc(c.icon||'◇')+'</strong><span><b>'+esc(c.klass)+'</b><small>'+esc(c.spec||'Starting path')+'</small></span></button>';
 }).join('')+'</div>';
}
function identityPanel(d){
 return '<div class="cf-name-card"><label for="cfCharacterName">CHARACTER NAME</label><input id="cfCharacterName" maxlength="24" autocomplete="off" value="'+esc(d.name||'')+'" placeholder="Enter a name"><button type="button" data-forge-random>Randomise name</button><p>2–24 characters. Appearance options will expand later; for now the base model is defined by race and sex.</p></div>';
}
function confirmPanel(o,d){
 return '<div class="cf-confirm-card">'+previewHTML(d,'compact')+'<div><small>NEW GUILD MEMBER</small><h3 data-forge-name>'+esc(d.name||'Unnamed')+'</h3><dl>'+
  '<div><dt>Race</dt><dd>'+esc(d.race)+'</dd></div><div><dt>Body</dt><dd>'+sexName(d.appearance.gender)+'</dd></div><div><dt>Class</dt><dd>'+esc(d.klass||'Unchosen')+'</dd></div><div><dt>Specialism</dt><dd>'+esc(d.spec||'Starting path')+'</dd></div>'+
 '</dl>'+(o.confirmHTML||'')+'</div></div><p class="cf-hint">'+esc(o.hint||'Ready to create this character.')+'</p>';
}
function render(o){
 const root=o.mount,d=ensureDraft(o.draft||{});if(!root)return;
 const step=normaliseStep(o.step),index=STEPS.indexOf(step);
 let panel='';
 if(step==='form')panel=formPanel(o,d);
 if(step==='class')panel=classPanel(o,d);
 if(step==='identity')panel=identityPanel(d);
 if(step==='confirm')panel=confirmPanel(o,d);
 root.innerHTML='<section class="cellbound-character-forge cf-step-'+step+'" data-character-forge-version="'+VERSION+'">'+
  '<header class="cf-head"><div><small>CELLBOUND CHARACTER FORGE</small><h1>'+esc(o.title||'Forge a character')+'</h1><p>Race defines the body. Class and equipment are layered on top.</p></div>'+(o.onClose?'<button type="button" class="cf-close" data-forge-close>×</button>':'')+'</header>'+
  nav(step)+'<div class="cf-layout"><aside class="cf-preview">'+previewHTML(d)+'<div class="cf-preview-copy"><span>'+esc(d.race)+' · '+sexName(d.appearance.gender)+'</span><b data-forge-name>'+esc(d.name||'New recruit')+'</b><small>'+esc(d.klass||'Choose a class')+'</small></div>'+(o.partyHTML||'')+'</aside>'+
  '<main class="cf-work"><div class="cf-step-head"><span>STEP '+(index+1)+' OF '+STEPS.length+'</span><h2>'+STEP_NAMES[step]+'</h2></div>'+panel+
  '<footer>'+(index?'<button type="button" data-forge-prev="'+STEPS[index-1]+'">← Back</button>':'<span></span>')+
  (index<STEPS.length-1?'<button type="button" class="primary" data-forge-next="'+STEPS[index+1]+'">Continue →</button>':'<button type="button" class="primary" data-forge-confirm '+(o.valid===false?'disabled':'')+'>'+esc(o.confirmLabel||'Create character')+'</button>')+'</footer></main></div></section>';

 const change=()=>{d.appearance=appearance(d.race,d.appearance.gender,d.appearance);o.onChange?.(d)};
 root.querySelectorAll('[data-forge-step],[data-forge-prev],[data-forge-next]').forEach(b=>b.onclick=()=>o.onStep?.(b.dataset.forgeStep||b.dataset.forgePrev||b.dataset.forgeNext));
 root.querySelectorAll('[data-forge-race]').forEach(b=>b.onclick=()=>{d.race=b.dataset.forgeRace;change()});
 root.querySelectorAll('[data-forge-sex]').forEach(b=>b.onclick=()=>{d.appearance=appearance(d.race,Number(b.dataset.forgeSex),d.appearance);change()});
 root.querySelectorAll('[data-forge-class]').forEach(b=>b.onclick=()=>{d.klass=b.dataset.forgeClass;d.spec=b.dataset.forgeSpec;change()});
 const input=root.querySelector('#cfCharacterName');
 if(input)input.oninput=()=>{d.name=input.value;root.querySelectorAll('[data-forge-name]').forEach(x=>x.textContent=d.name||'New recruit');o.onName?.(d)};
 root.querySelector('[data-forge-random]')?.addEventListener('click',()=>{o.onRandomName?.(d);change()});
 root.querySelector('[data-forge-confirm]')?.addEventListener('click',async e=>{const b=e.currentTarget;if(b.disabled)return;b.disabled=true;try{await o.onConfirm?.()}finally{if(b.isConnected)b.disabled=false}});
 root.querySelector('[data-forge-close]')?.addEventListener('click',o.onClose);
 root.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>o.onSlot?.(Number(b.dataset.slot)));
}
window.CellboundCharacterForge=Object.freeze({version:VERSION,render,asset,appearance,lore:LORE});
})();