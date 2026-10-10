(()=>{
'use strict';
const M=()=>window.CellboundEnemyModel,W=()=>window.CellboundBoothWorkflow,$=s=>document.querySelector(s),clone=x=>JSON.parse(JSON.stringify(x)),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let doc=null,account='',rows=[],tab='basic',timer=0,busy=false,blocked=false,opened=false,message='',stageTarget=null;
const key=()=> 'cellbound-enemy-builder-v1:'+account;
const dirty=()=>doc&&JSON.stringify(doc.spec)!==doc.saved;
const editable=()=>W()?.can('template','edit');
function backup(){try{localStorage.setItem(key(),JSON.stringify(doc));return true}catch{message='Device storage is full. Keep this page open and export your draft.';blocked=true;return false}}
function note(s){message=s;const el=$('#ebStatus');if(el)el.textContent=s}
function changed(){blocked=false;backup();clearTimeout(timer);timer=setTimeout(()=>save(),2000);status()}
function status(){const errors=M().validate(doc?.spec);const el=$('#ebValidation');if(el)el.textContent=errors.join(' ');note(errors.length?'Check the highlighted guidance · saved on this device':dirty()?'Saved on this device · waiting for cloud save':doc?.revision?'Cloud draft saved · revision '+doc.revision:'New draft · not yet saved to cloud')}
function fresh(){if(busy)return;if(dirty()&&!confirm('Keep the current recovery copy and start a new boss? Export it first if you need it.'))return;clearTimeout(timer);doc={slug:'studio-fight-'+crypto.randomUUID(),revision:0,spec:M().fresh(),saved:''};stageTarget=null;blocked=false;backup();render()}
async function reload(){rows=(await W().list('template')).filter(r=>r.payload?.kind==='fight'&&r.payload?.blueprint?.enemySpec);return rows}
async function load(slug){if(busy)return;if(dirty()&&!confirm('Open the cloud version? Export any unsaved changes first.'))return;const result=await W().get('template',slug);if(!result.draft)throw Error('This boss draft is unavailable.');clearTimeout(timer);const r=result.draft;doc={slug,revision:r.revision,spec:clone(r.payload.blueprint.enemySpec),saved:JSON.stringify(r.payload.blueprint.enemySpec)};stageTarget=null;blocked=false;backup();render()}
async function save(submit=false){
 if(!doc||!editable()||busy||blocked&&!submit)return;
 clearTimeout(timer);const errors=M().validate(doc.spec);if(errors.length){note(errors.join(' '));return}
 if(!dirty()&&!submit)return;
 const current=doc,owner=account,snapshot=clone(doc.spec),encoded=JSON.stringify(snapshot);busy=true;note('Saving private cloud draft…');
 try{const payload={slug:doc.slug,kind:'fight',title:snapshot.name,blueprint:M().stage(snapshot,{slug:doc.slug,revision:doc.revision})};
  const result=await W().save('template',doc.slug,payload,doc.revision);
  if(current!==doc||owner!==account)return;
  doc.revision=result.revision;doc.saved=encoded;backup();
  if(submit&&JSON.stringify(doc.spec)===encoded){const reviewed=await W().transition('submit','template',doc.slug,{},doc.revision);doc.revision=reviewed.revision;backup();note('Submitted for review. Approve and publish in Review & Publishing.');}
  else status();
  await reload();picker();
 }catch(e){blocked=true;note(e.message+' Your device recovery is retained. Use Reload cloud after exporting if this is a conflict.');}
 finally{busy=false;if(current===doc&&owner===account&&dirty()&&!blocked)timer=setTimeout(()=>save(),2000)}
}
function picker(){const el=$('#ebPicker');if(el)el.innerHTML='<option value="">Open a cloud boss…</option>'+rows.map(r=>'<option value="'+esc(r.key)+'">'+esc(r.payload.title+' · '+r.state)+'</option>').join('')}
function field(label,path,value,type='text',options=null,help=''){
 const control=options?'<select data-eb="'+path+'">'+Object.entries(options).map(([v,t])=>'<option value="'+esc(v)+'" '+(String(value)===v?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select>':type==='textarea'?'<textarea data-eb="'+path+'" rows="3">'+esc(value)+'</textarea>':'<input data-eb="'+path+'" type="'+type+'" '+(type==='number'?'step="any" inputmode="decimal"':'')+' value="'+esc(value)+'">';
 return'<label class="dbo-field">'+esc(label)+control+(help?'<small>'+esc(help)+'</small>':'')+'</label>'
}
function listAbilities(list,path){return list.map((a,i)=>'<article class="eb-card"><h4>Ability '+(i+1)+'</h4><div class="dbo-form-grid">'+field('Mechanic',path+'.'+i+'.type',a.type,'text',M().abilities)+field('Warning / ability name',path+'.'+i+'.name',a.name)+field('Telegraph duration (ms)',path+'.'+i+'.duration',a.duration,'number')+field('Minimum cooldown (ms)',path+'.'+i+'.cooldownMs',a.cooldownMs,'number')+field('Available below health (%)',path+'.'+i+'.belowPct',a.belowPct,'number')+(a.type==='self-heal'?field('Healing (% maximum health)',path+'.'+i+'.healPct',a.healPct,'number'):['pull','knockback'].includes(a.type)?field('Impact damage before scaling',path+'.'+i+'.damage',a.damage,'number'):'')+'</div><p>'+esc(a.type==='interrupt'||a.type==='self-heal'?'Interruptible: the party can stop this cast.': 'Telegraphed: the existing movement mechanic controls targeting and avoidance.')+'</p><button data-eb-remove="'+path+'.'+i+'">Remove ability</button></article>').join('')+'<button data-eb-add="'+path+'" '+(list.length>=6?'disabled':'')+'>+ Add ability</button>'}
function render(){
 const root=$('#dboEnemies');if(!root||!opened||!doc)return;const x=doc.spec;
 let fields='';
 if(tab==='basic')fields='<div class="dbo-form-grid">'+field('Name','name',x.name)+field('Enemy or boss','designation',x.designation,'text',{enemy:'Enemy',boss:'Boss'})+field('Description','description',x.description,'textarea')+field('Encounter location','location',x.location)+field('Level','level',x.level,'number')+field('Exact maximum health','health',x.health,'number')+field('Damage multiplier','damageScale',x.damageScale,'number',null,'0.25–3 × the engine’s level-scaled damage.')+field('Defence (%)','defence',x.defence,'number',null,'Reduces incoming damage by 0–60%.')+'</div>';
 if(tab==='behaviour')fields='<div class="dbo-form-grid">'+field('Combat role / AI pattern','behaviour',x.behaviour,'text',M().behaviours)+field('Basic attack target','targeting',x.targeting,'text',{threat:'Highest threat',random:'Random party member'})+field('Minimum gap between casts (ms)','intervalMs',x.intervalMs,'number')+'</div><p>Healer hunter and random skirmisher override basic targeting. Support heals injured allies; a solo boss has no allies. Retreat works for enemies, not bosses. Artillery keeps ranged distance. Ability targeting follows its mechanic: frontal targets the tank, line selects a non-tank, spread targets the party, healing targets self.</p>';
 if(tab==='abilities')fields='<p>Up to six opening abilities. They remain available in later phases. Cooldowns are minimums; only one mechanic casts at a time. A health condition makes an ability available only below that percentage.</p>'+listAbilities(x.abilities,'abilities');
 if(tab==='phases')fields='<p>Bosses can have three health-triggered changes, in decreasing order. Each change adds abilities and can increase damage or enable sweeping basic attacks. Changes persist for the rest of the fight.</p>'+x.phases.map((p,i)=>'<article class="eb-card"><div class="dbo-form-grid">'+field('Phase warning','phases.'+i+'.name',p.name)+field('Starts at health (%)','phases.'+i+'.atPct',p.atPct,'number')+field('Damage multiplier','phases.'+i+'.damageScale',p.damageScale,'number')+field('Basic attacks','phases.'+i+'.allAttacksAoe',String(p.allAttacksAoe),'text',{false:'Single target',true:'Whole party'})+'</div>'+listAbilities(p.abilities,'phases.'+i+'.abilities')+'<button data-eb-phase-remove="'+i+'">Remove phase</button></article>').join('')+'<button id="ebPhaseAdd" '+(x.phases.length>=3||x.designation!=='boss'?'disabled':'')+'>+ Add phase change</button>';
 if(tab==='art')fields='<p>Artwork is the encounter background. Existing combat actor visuals remain unchanged. Uploaded files use the existing public art bucket; draft metadata stays private.</p>'+field('Existing artwork','artPath',x.artPath,'text',Object.fromEntries(M().backgrounds.map(p=>[p,p.split('/').pop()]).concat(x.artPath&&!M().backgrounds.includes(x.artPath)?[[x.artPath,'Uploaded artwork']]:[])))+'<label class="dbo-field">Upload background<input id="ebUpload" type="file" accept="image/png,image/jpeg,image/webp,image/avif"></label><img class="eb-art" src="'+esc(window.CellboundDesignedContent?.artUrl(x.artPath)||'')+'" alt="Encounter background" draggable="false">';
 root.innerHTML='<section class="eb-shell"><h3>Enemy & Boss Builder</h3><p>Create a reusable fight, test with your party, then add a snapshot to the adventure currently open in Adventure Builder. Use Drop Tables there for optional rewards.</p><div class="eb-actions"><button id="ebNew">New boss</button><select id="ebPicker" aria-label="Saved bosses"></select><button id="ebReload">Reload cloud</button><button id="ebExport">Export recovery</button></div><nav class="eb-tabs" aria-label="Enemy settings">'+['basic','behaviour','abilities','phases','art'].map(t=>'<button data-eb-tab="'+t+'" aria-pressed="'+(t===tab)+'">'+({basic:'Basics',behaviour:'Behaviour',abilities:'Abilities',phases:'Boss phases',art:'Artwork'})[t]+'</button>').join('')+'</nav><fieldset id="ebFields" '+(!editable()?'disabled':'')+'>'+fields+'</fieldset><p id="ebValidation" role="alert"></p><p id="ebStatus" role="status"></p><div class="eb-actions"><button id="ebSave" '+(!editable()?'disabled':'')+'>Save draft</button><button id="ebPreview">Test encounter · no rewards</button><button id="ebInsert" '+(!W()?.can('adventure','edit')?'disabled':'')+'>'+(stageTarget?'Apply to selected fight':'Add to open adventure')+'</button><button id="ebSubmit" '+(!editable()?'disabled':'')+'>Submit for review</button></div><div id="ebResult" aria-live="polite"></div></section>';
 picker();status();
 root.querySelectorAll('[data-eb]').forEach(el=>el.addEventListener('input',()=>{const path=el.dataset.eb.split('.'),last=path.pop();let obj=doc.spec;for(const p of path)obj=obj[p];obj[last]=last==='allAttacksAoe'?el.value==='true':el.type==='number'?Number(el.value):el.value;changed()}));
 root.querySelectorAll('[data-eb$=".type"],[data-eb="designation"]').forEach(el=>el.addEventListener('change',()=>render()));
 root.querySelectorAll('[data-eb-tab]').forEach(el=>el.onclick=()=>{tab=el.dataset.ebTab;render()});
 root.querySelectorAll('[data-eb-add]').forEach(el=>el.onclick=()=>{let list=doc.spec;for(const p of el.dataset.ebAdd.split('.'))list=list[p];if(list.length<6){list.push(M().ability());changed();render()}});
 root.querySelectorAll('[data-eb-remove]').forEach(el=>el.onclick=()=>{const path=el.dataset.ebRemove.split('.'),i=Number(path.pop());let list=doc.spec;for(const p of path)list=list[p];list.splice(i,1);changed();render()});
 root.querySelectorAll('[data-eb-phase-remove]').forEach(el=>el.onclick=()=>{doc.spec.phases.splice(Number(el.dataset.ebPhaseRemove),1);changed();render()});
 $('#ebPhaseAdd')?.addEventListener('click',()=>{if(x.phases.length<3){x.phases.push({...M().phase(),atPct:Math.max(1,(x.phases.at(-1)?.atPct||100)-25)});changed();render()}});
 $('#ebNew').disabled=!editable();$('#ebNew').onclick=fresh;
 $('#ebPicker').onchange=async e=>{if(e.target.value)try{await load(e.target.value)}catch(err){note(err.message)}};
 $('#ebReload').onclick=async()=>{try{await load(doc.slug)}catch(e){note(e.message)}};
 $('#ebSave').onclick=()=>{blocked=false;save()};$('#ebSubmit').onclick=()=>{blocked=false;save(true)};
 $('#ebExport').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=doc.slug+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 $('#ebPreview').onclick=async()=>{try{await preview()}catch(e){note(e.message)}};
 $('#ebInsert').onclick=()=>{try{const s=M().stage(doc.spec,{slug:doc.slug,revision:doc.revision});const ok=stageTarget?window.CellboundDesignBooth.updateEnemyStage(stageTarget,s):window.CellboundDesignBooth.insertTemplate(s,s.title);if(!ok)note('Select an editable adventure first.')}catch(e){note(e.message)}};
 $('#ebUpload')?.addEventListener('change',e=>upload(e.target.files?.[0]));
}
async function upload(file){
 if(!file||!editable()||busy)return;const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/avif':'avif'};
 if(!types[file.type]||file.size>10*1024*1024){note('Choose a PNG, JPEG, WebP or AVIF up to 10 MB.');return}
 busy=true;const current=doc,owner=account;note('Uploading artwork…');
 try{const path='templates/'+doc.slug+'/'+crypto.randomUUID()+'.'+types[file.type];const {error}=await window.CellboundGame.getSupabase().storage.from('cellbound-design-art').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;if(current!==doc||owner!==account)return;doc.spec.artPath=path;changed();render()}
 catch(e){note('Upload failed: '+e.message)}finally{busy=false}
}
async function preview(){if(busy)throw Error('Wait for the current save first.');const spec=M().clean(doc.spec);note('Preview runs without rewards or defeat penalties. Exit combat to return here.');const result=await window.CellboundDesignedContent.previewEnemy(spec);const el=$('#ebResult');if(el)el.textContent=result?.summary?'Preview ended: '+result.summary.outcome+' · phases: '+Object.keys(result.summary.phases||{}).length+' · interrupts: '+(result.summary.interrupts?.success||0):'Preview closed. No rewards were granted.'}
async function open(){
 if(!W()?.can('template'))return;opened=true;const next=W().user();
 if(account!==next){clearTimeout(timer);doc=null;account=next;blocked=false;stageTarget=null}
 if(!doc){try{doc=JSON.parse(localStorage.getItem(key())||'null')}catch{}if(!doc?.spec){doc={slug:'studio-fight-'+crypto.randomUUID(),revision:0,spec:M().fresh(),saved:''}}}
 render();try{await reload();picker()}catch(e){note('Cloud unavailable: '+e.message+' Device recovery remains available.')}
}
function editStage(id,spec){stageTarget=id;doc={slug:'studio-fight-'+crypto.randomUUID(),revision:0,spec:clone(spec),saved:''};backup();tab='basic';render()}
window.addEventListener('online',()=>{blocked=false;save()});
window.addEventListener('beforeunload',e=>{if(dirty()||busy){backup();e.preventDefault();e.returnValue=''}});
window.addEventListener('cellbound:booth-access',()=>{if(account!==W()?.user()){clearTimeout(timer);doc=null;account=W()?.user()||'';stageTarget=null}if(opened&&W()?.can('template'))open()});
window.CellboundEnemyBuilder={open,close:()=>{opened=false;backup()},editStage};
})();
