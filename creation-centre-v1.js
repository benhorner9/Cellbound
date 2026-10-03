(()=>{
'use strict';
const P=window.CellboundPortraits;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STEPS=['race','appearance','class','confirm'];
const LORE={Veyren:'Shadow-touched wanderers, with dusky skin, long ears and ancient runes.',Stoneborn:'Living stone: broad mineral bodies, fractured ridges and crystal veins.',Aelari:'Celestial descendants with luminous eyes and pale, arcane markings.',Thornkin:'Living woodland, shaped by bark, roots, branches and new growth.',Emberkin:'Volcanic kin with charcoal skin and heat glowing beneath its surface.',Nymari:'Children of deep water, with fins, smooth scales and luminous markings.'};
function render(o){
 const d=o.draft,root=o.mount;if(!root||!d)return;
 d.appearance=P.normalizeAppearance(d.appearance,d.name||d.race,d.race);
 const step=STEPS.includes(o.step)?o.step:'race',index=STEPS.indexOf(step);
 const subject={name:d.name,race:d.race,class:d.klass,appearance:d.appearance,equipment:{}};
 const names={race:'Race',appearance:'Appearance',class:'Class',confirm:'Name & confirm'};
 const preview=P.paperDollHTML(subject,{size:'creator',showGear:false});
 let panel='';
 if(step==='race')panel='<h2>Choose your ancestry</h2><p>Race shapes your character. Equipment will tell their story.</p><div class="race-grid creator-choice-grid">'+o.races.map(r=>'<button type="button" class="race-card '+(r.id===d.race?'active':'')+'" data-race="'+esc(r.id)+'" aria-pressed="'+(r.id===d.race)+'">'+P.paperDollHTML({race:r.id,appearance:{...d.appearance,race:r.id}},{size:'race-choice',showGear:false})+'<div><b>'+esc(r.id)+'</b><p>'+esc(LORE[r.id])+'</p><small>'+esc(r.trait||'')+'</small></div></button>').join('')+'</div><div class="cc-sex" aria-label="Body">'+['Male','Female'].map((name,i)=>'<button type="button" data-cc-sex="'+i+'" aria-pressed="'+(d.appearance.gender===i)+'">'+name+'</button>').join('')+'</div>';
 if(step==='appearance')panel='<h2>Make them yours</h2><p>'+esc(d.race)+' · '+esc(LORE[d.race])+'</p>'+P.editorHTML(d.appearance,{name:d.name,race:d.race});
 if(step==='class')panel='<h2>Choose a calling</h2><p>Your anatomy stays the same. Armour, weapons and skills define your class.</p><div class="class-grid creator-choice-grid">'+o.classes.map(c=>'<button type="button" class="class-choice '+(d.klass===c.klass&&d.spec===c.spec?'active':'')+'" data-class="'+esc(c.klass)+'" data-spec="'+esc(c.spec)+'" aria-pressed="'+(d.klass===c.klass&&d.spec===c.spec)+'"><strong>'+esc(c.icon||'◇')+'</strong><div><b>'+esc(c.klass)+'</b><small>'+esc(c.label||c.spec||'')+'</small></div></button>').join('')+'</div>';
 if(step==='confirm')panel='<h2>'+esc(o.confirmTitle||'Confirm your adventurer')+'</h2><label class="cc-name-label" for="ccCharacterName">Character name</label><div class="name-builder"><input id="ccCharacterName" maxlength="24" autocomplete="off" value="'+esc(d.name)+'" placeholder="Adventurer name"><button type="button" data-cc-random-name>RANDOMISE</button></div><div class="cc-summary"><b data-cc-name>'+esc(d.name||'Unnamed')+'</b><span>'+esc(d.race)+' · '+esc(d.klass)+'</span></div>'+(o.confirmHTML||'')+'<p class="cc-validation" role="status">'+esc(o.hint||'Review your character, then confirm to create them.')+'</p>';
 root.innerHTML='<div class="character-creator cc-centre"><header class="cc-header"><div><small>CREATION CENTRE</small><h1>'+esc(o.title||'A new guild member')+'</h1></div>'+(o.onClose?'<button type="button" data-cc-close aria-label="Close Creation Centre">×</button>':'')+'</header><nav class="creator-steps" aria-label="Character creation steps">'+STEPS.map((s,i)=>'<button type="button" class="creator-step '+(s===step?'active':'')+'" data-builder-step="'+s+'" aria-current="'+(s===step?'step':'false')+'"><i>'+(i+1)+'</i><span>'+names[s]+'</span></button>').join('')+'</nav><div class="creator-stage"><aside class="creator-hero">'+preview+'<h2 data-cc-name>'+esc(d.name||'Unnamed')+'</h2><p>'+esc(d.race)+' · '+esc(d.klass)+'</p>'+(o.partyHTML||'')+'</aside><main><section class="creator-panel">'+panel+'<footer>'+(index?'<button type="button" class="creator-back" data-prev-step="'+STEPS[index-1]+'">← BACK</button>':'<span></span>')+(index<3?'<button type="button" class="on-primary" data-next-step="'+STEPS[index+1]+'">CONTINUE →</button>':'<button type="button" class="on-primary" data-cc-confirm '+(o.valid===false?'disabled':'')+'>'+esc(o.confirmLabel||'CONFIRM CHARACTER')+'</button>')+'</footer></section></main></div></div>';
 const change=()=>o.onChange?.(d);
 root.querySelectorAll('[data-builder-step],[data-next-step],[data-prev-step]').forEach(b=>b.onclick=()=>o.onStep?.(b.dataset.builderStep||b.dataset.nextStep||b.dataset.prevStep));
 root.querySelectorAll('button[data-race]').forEach(b=>b.onclick=()=>{d.race=b.dataset.race;d.appearance=P.normalizeAppearance(d.appearance,d.name,d.race);change()});
 root.querySelectorAll('[data-cc-sex]').forEach(b=>b.onclick=()=>{d.appearance.gender=Number(b.dataset.ccSex);change()});
 root.querySelectorAll('button[data-class]').forEach(b=>b.onclick=()=>{d.klass=b.dataset.class;d.spec=b.dataset.spec;change()});
 P.bindEditor(root,d.appearance,change,{name:d.name,race:d.race});
 const input=root.querySelector('#ccCharacterName');if(input)input.oninput=()=>{d.name=input.value;root.querySelectorAll('[data-cc-name]').forEach(n=>n.textContent=d.name||'Unnamed');o.onName?.(d);const button=root.querySelector('[data-cc-confirm]');if(button)button.disabled=o.isValid?!o.isValid():d.name.trim().length<2};
 root.querySelector('[data-cc-random-name]')?.addEventListener('click',()=>{o.onRandomName?.(d);change()});
 root.querySelector('[data-cc-confirm]')?.addEventListener('click',async e=>{const b=e.currentTarget;if(b.disabled)return;b.disabled=true;try{await o.onConfirm?.()}finally{if(b.isConnected)b.disabled=false}});
 root.querySelector('[data-cc-close]')?.addEventListener('click',o.onClose);
 root.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>o.onSlot?.(Number(b.dataset.slot)));
}
window.CellboundCreationCentre={render,descriptions:LORE,version:1};
})();
