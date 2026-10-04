(()=>{
'use strict';

const $=s=>document.querySelector(s);
const RACES=['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari'];
const FRAME_NAMES=['Lean','Balanced','Strong'];
const GENDER_NAMES=['Male','Female'];
const STORAGE_KEY='cellbound-owner-character-fit-viewer-v1';

let opened=false;
let autoTimer=null;
let state=loadState();

function loadState(){
  const fallback={race:'Veyren',gender:0,frame:1,skinTone:0,klass:'Warrior',tier:1,position:'Chest',itemId:'',loadout:'full',compare:'single',zoom:100,anchors:false};
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return raw&&typeof raw==='object'?{...fallback,...raw}:fallback;
  }catch{return fallback}
}
function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function isOwner(){return Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner'}
function G(){return window.CellboundGear}
function CP(){return window.CellboundPortraits}
function CR(){return window.CellboundCharacterRig}
function positions(){return G()?.EQUIPMENT_POSITION_ORDER||['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring1','Ring2','Trinket1','Trinket2','Relic']}
function slotForPosition(pos){return pos?.startsWith('Ring')?'Ring':pos?.startsWith('Trinket')?'Trinket':pos}
function allItems(){return (G()?.items||[]).filter(x=>x&&x.enabled!==false)}
function canonicalItem(){
  const items=allItems(),slot=slotForPosition(state.position);
  const direct=items.find(x=>x.itemId===state.itemId&&x.class===state.klass&&Number(x.tier)===Number(state.tier)&&x.slot===slot);
  if(direct)return direct;
  return items.find(x=>x.class===state.klass&&Number(x.tier)===Number(state.tier)&&x.slot===slot)||items[0]||null
}
function syncFromItem(item){
  if(!item)return;
  state.itemId=item.itemId||'';
  state.klass=item.class||state.klass;
  state.tier=Math.max(1,Math.min(5,Number(item.tier)||1));
  const desired=item.slot==='Ring'?'Ring1':item.slot==='Trinket'?'Trinket1':item.slot;
  if(positions().includes(desired))state.position=desired;
}
function appearance(overrides={}){
  return {
    race:overrides.race??state.race,
    gender:Number(overrides.gender??state.gender)||0,
    frame:Number(overrides.frame??state.frame)||0,
    skinTone:Number(state.skinTone)||0,
    face:0,hair:0,hairColor:0,facialHair:0,marking:0,eyes:0,feature:0
  };
}
function itemFor(klass,tier,position){
  const slot=slotForPosition(position);
  return allItems().find(x=>x.class===klass&&Number(x.tier)===Number(tier)&&x.slot===slot)||null
}
function loadoutFor(klass,tier,mode,item,position){
  const equipment={};
  if(mode==='base')return equipment;
  if(mode==='single'){
    if(item)equipment[position]=item;
    return equipment;
  }
  positions().forEach(pos=>{
    const found=itemFor(klass,tier,pos);
    if(found)equipment[pos]=found;
  });
  if(item&&position&&item.class===klass&&Number(item.tier)===Number(tier)&&slotForPosition(position)===item.slot)equipment[position]=item;
  return equipment;
}
function character(overrides={}){
  const a=appearance(overrides),item=canonicalItem(),klass=overrides.klass||state.klass,tier=Number(overrides.tier||state.tier);
  return {
    id:'owner-fit-viewer-'+a.race+'-'+a.gender+'-'+a.frame+'-'+klass+'-'+tier,
    name:'Fit Test',
    race:a.race,class:klass,spec:'',level:15,power:100,cellShock:0,
    appearance:a,
    equipment:loadoutFor(klass,tier,state.loadout,item,state.position)
  };
}
function anchorSVG(c){
  if(!state.anchors||!CR()?.anchors)return'';
  const a=CR().anchors(c),marks=[
    [a.leftShoulder,'SH'],[a.rightShoulder,'SH'],
    [a.leftHand,'H'],[a.rightHand,'H'],
    [a.leftHip,'HIP'],[a.rightHip,'HIP'],
    [a.mainHand,'MH'],[a.offHand,'OH'],
    [a.leftFoot,'FT'],[a.rightFoot,'FT'],
    [a.crown,'CR'],[a.hairline,'HL']
  ];
  return '<svg class="cfv-anchor-layer" viewBox="0 0 240 410" aria-hidden="true">'+
    marks.map(([p,l])=>'<g><circle cx="'+p.x+'" cy="'+p.y+'" r="3.2"/><text x="'+(p.x+5)+'" y="'+(p.y-4)+'">'+l+'</text></g>').join('')+
    '<path d="M'+a.leftHip.x+' '+a.waist.y+' H'+a.rightHip.x+' M'+a.leftShoulder.x+' '+a.leftShoulder.y+' H'+a.rightShoulder.x+'" />'+
  '</svg>';
}
function modelHTML(c,label){
  const item=canonicalItem(),highlight=state.loadout==='single'?state.position:'';
  const doll=CP()?.paperDollHTML?.(c,{size:'equipment',highlightedSlot:highlight,showGear:state.loadout!=='base'})||'<div class="cfv-error">Character renderer unavailable.</div>';
  return '<article class="cfv-model-card"><header><b>'+esc(label)+'</b><span>'+esc(c.race)+' · '+esc(GENDER_NAMES[c.appearance.gender])+' · '+esc(FRAME_NAMES[c.appearance.frame])+'</span></header>'+
    '<div class="cfv-model-stage" style="--cfv-zoom:'+(Math.max(60,Math.min(150,Number(state.zoom)||100))/100)+'">'+
      '<div class="cfv-model-inner">'+doll+anchorSVG(c)+'</div>'+
    '</div>'+
    '<footer><span>'+esc(state.loadout==='base'?'BASE BODY':state.loadout==='full'?c.class+' T'+state.tier+' FULL SET':item?.name||'NO ITEM')+'</span><em>'+esc((CR()?.masterRig?.(c)?.id||'rig')+' · '+(state.loadout==='single'?state.position:'ALL FIT POINTS'))+'</em></footer></article>';
}
function comparisonModels(){
  if(state.compare==='frames')return [0,1,2].map(frame=>({c:character({frame}),label:FRAME_NAMES[frame]}));
  if(state.compare==='sexes')return [0,1].map(gender=>({c:character({gender}),label:GENDER_NAMES[gender]}));
  if(state.compare==='races')return RACES.map(race=>({c:character({race}),label:race}));
  return [{c:character(),label:state.race+' '+GENDER_NAMES[state.gender]+' '+FRAME_NAMES[state.frame]}];
}
function option(value,label,current){return '<option value="'+esc(value)+'" '+(String(value)===String(current)?'selected':'')+'>'+esc(label)+'</option>'}
function groupedItemOptions(){
  const items=allItems();
  return (G()?.CLASS_ORDER||[]).map(klass=>{
    const rows=items.filter(x=>x.class===klass).map(x=>option(x.itemId,'T'+x.tier+' · '+x.slot+' · '+x.name,state.itemId)).join('');
    return '<optgroup label="'+esc(klass)+'">'+rows+'</optgroup>';
  }).join('');
}
function fitFamily(klass){
  return String(klass||'Warrior').toLowerCase().replace(/\s+/g,'-');
}
function svgNumber(html,name){
  const m=html.match(new RegExp(name+'="(-?[0-9.]+)"'));return m?Number(m[1]):NaN;
}
function closeTo(a,b,t=.12){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=t}
function validateCharacter(c,{highlight='',requireFull=false}={}){
  const P=CP(),R=CR(),html=P.paperDollHTML(c,{size:'equipment',highlightedSlot:highlight,showGear:true}),fit=P.gearFitProfile(c);
  const nums=['leftShoulder','rightShoulder','leftHand','rightHand','baseRightHand','handY','waistHalf','hipHalf','leftLeg','rightLeg','weaponX','weaponY','offhandX','offhandY'];
  if(P.equipmentFitVersion!==3||R?.fitVersion!==3)throw new Error('equipment fit v3 is not active');
  if(nums.some(k=>!Number.isFinite(fit[k])))throw new Error('invalid anchors');
  if(/NaN|Infinity|undefined/.test(html))throw new Error('invalid SVG output');
  if(!html.includes('data-equipment-fit="v3"'))throw new Error('model is not using equipment fit v3');
  if(!(fit.leftShoulder<fit.rightShoulder&&fit.leftHand<fit.rightHand&&fit.leftLeg<fit.rightLeg&&fit.waistHalf>0&&fit.hipHalf>0))throw new Error('invalid body anchor ordering');

  const core=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet'];
  for(const slot of core){
    if(!c.equipment?.[slot])continue;
    if(!html.includes('cb-paper-slot-'+slot.toLowerCase()))throw new Error(slot+' layer missing');
    if(!html.includes('data-fit-version="3"')||!html.includes('data-alignment="v3"'))throw new Error(slot+' is not on fit/alignment v3');
    const b=R?.fitSlot?.(c,slot,{family:fitFamily(c.class),tier:c.equipment[slot]?.tier||1});
    if(!b||!Number.isFinite(b.y)||!Number.isFinite(b.w)||!Number.isFinite(b.h)||b.w<=3||b.h<=3||b.y<-20||b.y>410)throw new Error(slot+' fit bounds invalid');
  }

  if(c.equipment?.Hands){
    if(!closeTo(svgNumber(html,'data-left-hand-x'),fit.leftHand)||!closeTo(svgNumber(html,'data-right-hand-x'),fit.rightHand)||!closeTo(svgNumber(html,'data-hand-y'),fit.handY))throw new Error('gloves are not locked to the hand anchors');
  }
  if(c.equipment?.Shoulders){
    if(!closeTo(svgNumber(html,'data-left-shoulder-x'),fit.leftShoulder)||!closeTo(svgNumber(html,'data-right-shoulder-x'),fit.rightShoulder))throw new Error('shoulders are not locked to the shoulder anchors');
  }
  if(c.equipment?.Weapon){
    const weaponAt=html.indexOf('cb-paper-side-weapon'),headAt=html.indexOf('cb-paper-head');
    if(weaponAt<0||weaponAt<headAt||!html.includes('data-weapon-pose="side-held"'))throw new Error('main-hand weapon is not using the side-held pose');
    const weaponHtml=html.slice(weaponAt);if(!closeTo(svgNumber(weaponHtml,'data-grip-x'),fit.weaponX)||!closeTo(svgNumber(weaponHtml,'data-grip-y'),fit.weaponY))throw new Error('main-hand side grip is not attached to the posed right hand');
    if(fit.weaponX<fit.baseRightHand)throw new Error('main-hand weapon crossed inward over the torso');
  }
  if(c.equipment?.OffHand){
    const type=P.offHandType(c.equipment.OffHand,c),offAt=html.indexOf('data-offhand-type="'+type+'"'),armsAt=html.indexOf('cb-paper-arms'),headAt=html.indexOf('cb-paper-head'),weaponAt=html.indexOf('cb-paper-side-weapon');
    if(offAt<0)throw new Error('off-hand layer missing');
    if(!closeTo(svgNumber(html.slice(offAt),'data-grip-x'),fit.offhandX)||!closeTo(svgNumber(html.slice(offAt),'data-grip-y'),fit.offhandY))throw new Error('off-hand grip is not attached to the left hand');
    if(type==='shield'&&offAt>armsAt)throw new Error('shield must remain behind the body');
    if(type!=='shield'&&offAt<headAt)throw new Error('front off-hand must remain above the body');
    if(c.equipment?.Weapon&&type!=='shield'&&weaponAt<offAt)throw new Error('main-hand must remain above front off-hand');
  }
  if(c.equipment?.Ring1&&!closeTo(svgNumber(html,'data-ring-x'),fit.leftHand))throw new Error('Ring1 is not attached to the left hand');

  if(requireFull){
    for(const pos of positions())if(!c.equipment?.[pos])throw new Error('catalogue missing '+pos);
    for(const pos of positions())if(!html.includes('cb-paper-slot-'+String(pos).toLowerCase()))throw new Error('render missing '+pos);
  }
  return html;
}
function auditCurrent(){
  const P=CP(),R=CR(),item=canonicalItem();
  if(!P?.paperDollHTML||!P?.gearFitProfile||!R?.validateAll)return{ok:0,total:0,failures:['Master rig / character visual engine unavailable.']};
  const rigAudit=R.validateAll(),failures=[...rigAudit.errors];let ok=rigAudit.ok?R.masterRigCount:0,total=R.masterRigCount;
  const cases=[];
  RACES.forEach(race=>[0,1].forEach(gender=>[0,1,2].forEach(frame=>cases.push({race,gender,frame}))));
  total+=cases.length;
  for(const body of cases){
    try{
      const c=character(body),html=validateCharacter(c,{highlight:state.loadout==='single'?state.position:''});
      if(state.loadout==='single'&&item&&!html.includes('cb-paper-slot-'+String(state.position).toLowerCase()))throw new Error('selected slot missing');
      ok++;
    }catch(error){failures.push(body.race+' '+GENDER_NAMES[body.gender]+' '+FRAME_NAMES[body.frame]+': '+(error?.message||error))}
  }
  return{ok,total,failures,rigCount:R.masterRigCount,variantCount:cases.length};
}
function auditBetaMatrix(){
  const P=CP(),classes=G()?.CLASS_ORDER||[];
  if(!P?.paperDollHTML||!P?.gearFitProfile||!classes.length)return{ok:0,total:0,failures:['Character visual engine unavailable.']};
  const failures=[];let ok=0,total=0;
  for(const klass of classes)for(const tier of [1,2,3,4,5])for(const race of RACES)for(const gender of [0,1])for(const frame of [0,1,2]){
    total++;
    try{
      const a={race,gender,frame,skinTone:Number(state.skinTone)||0,face:0,hair:0,hairColor:0,facialHair:0,marking:0,eyes:0,feature:0};
      const c={id:'beta-fit-'+klass+'-'+tier+'-'+race+'-'+gender+'-'+frame,name:'Beta Fit',race,class:klass,spec:'',level:15,power:100,cellShock:0,appearance:a,equipment:loadoutFor(klass,tier,'full',null,null)};
      validateCharacter(c,{requireFull:true});
      ok++;
    }catch(error){
      if(failures.length<30)failures.push(klass+' T'+tier+' · '+race+' '+GENDER_NAMES[gender]+' '+FRAME_NAMES[frame]+': '+(error?.message||error));
    }
  }
  const tiers=[1,2,3,4,5].map(t=>P.tierVisualProfile?.(t));
  if(tiers.some(x=>!x)||tiers.some((x,i)=>i&&!(x.shoulder>tiers[i-1].shoulder&&x.chest>tiers[i-1].chest&&x.weapon>tiers[i-1].weapon))){
    failures.push('Tier silhouette contract is not strictly progressive from T1 to T5.');
  }
  return{ok,total,failures};
}
function statsHTML(){
  const item=canonicalItem(),count=allItems().length;
  return '<div class="cfv-stats">'+
    '<div><span>CATALOGUE</span><b>'+count+' items</b></div>'+
    '<div><span>MODEL LOCK</span><b>'+esc(CP()?.modelContract||'unlocked')+'</b></div>'+
    '<div><span>FIT CONTRACT</span><b>V'+esc(CP()?.equipmentFitVersion||0)+' · '+esc(CR()?.fitVersion||0)+' rig</b></div>'+
    '<div><span>MASTER RIGS</span><b>'+esc(CR()?.masterRigCount||0)+' locked · 36 bodies</b></div>'+
    '<div><span>VIEWING</span><b>'+esc(state.loadout==='full'?'Full set':state.loadout==='single'?'Single item':'Base only')+'</b></div>'+
    '<div><span>ITEM</span><b>'+esc(item?item.slot+' · T'+item.tier:'None')+'</b></div>'+
  '</div>';
}
function render(){
  const mount=$('#characterFitViewerMount');if(!mount||!opened||!isOwner())return;
  const item=canonicalItem();
  if(item&&state.itemId!==item.itemId){state.itemId=item.itemId;saveState()}
  const compareClass='cfv-compare-'+state.compare;
  mount.innerHTML='<section class="cfv-shell">'+
    '<header class="cfv-header"><div><small>OWNER CHARACTER LAB · FIT V3</small><h2>Character Fit Viewer</h2><p>Inspect every equipment slot against all race/sex master models and body variants. Fit V3 also checks side-held weapons and varied robe/skirt lower silhouettes.</p></div><div class="cfv-header-actions"><button id="cfvAudit" type="button">RUN CURRENT ITEM AUDIT</button><button id="cfvBetaAudit" type="button">RUN FULL FIT MATRIX</button><button id="cfvClose" type="button">CLOSE</button></div></header>'+
    statsHTML()+
    '<div class="cfv-toolbar">'+
      '<label><span>RACE</span><select id="cfvRace">'+RACES.map(x=>option(x,x,state.race)).join('')+'</select></label>'+
      '<label><span>SEX</span><select id="cfvGender">'+[0,1].map(x=>option(x,GENDER_NAMES[x],state.gender)).join('')+'</select></label>'+
      '<label><span>FRAME</span><select id="cfvFrame">'+[0,1,2].map(x=>option(x,FRAME_NAMES[x],state.frame)).join('')+'</select></label>'+
      '<label><span>SKIN</span><select id="cfvSkin">'+[0,1,2,3,4,5].map(x=>option(x,'Tone '+(x+1),state.skinTone)).join('')+'</select></label>'+
      '<label><span>CLASS</span><select id="cfvClass">'+(G()?.CLASS_ORDER||[]).map(x=>option(x,x,state.klass)).join('')+'</select></label>'+
      '<label><span>TIER</span><select id="cfvTier">'+[1,2,3,4,5].map(x=>option(x,'Tier '+x,state.tier)).join('')+'</select></label>'+
      '<label><span>LOADOUT</span><select id="cfvLoadout">'+option('full','Full set',state.loadout)+option('single','Single item',state.loadout)+option('base','Base only',state.loadout)+'</select></label>'+
      '<label><span>POSITION</span><select id="cfvPosition">'+positions().map(x=>option(x,x,state.position)).join('')+'</select></label>'+
      '<label class="cfv-item-select"><span>ITEM CATALOGUE</span><select id="cfvItem">'+groupedItemOptions()+'</select></label>'+
      '<label><span>COMPARE</span><select id="cfvCompare">'+option('single','Single model',state.compare)+option('frames','Lean / Balanced / Strong',state.compare)+option('sexes','Male / Female',state.compare)+option('races','All races',state.compare)+'</select></label>'+
      '<label class="cfv-zoom"><span>ZOOM <b id="cfvZoomLabel">'+state.zoom+'%</b></span><input id="cfvZoom" type="range" min="60" max="150" step="5" value="'+state.zoom+'"></label>'+
    '</div>'+
    '<div class="cfv-quickbar">'+
      '<button id="cfvPrevBody" type="button">← BODY</button><button id="cfvNextBody" type="button">BODY →</button>'+
      '<button id="cfvPrevItem" type="button">← ITEM</button><button id="cfvNextItem" type="button">ITEM →</button>'+
      '<button id="cfvAuto" type="button" class="'+(autoTimer?'active':'')+'">'+(autoTimer?'STOP AUTO CYCLE':'AUTO CYCLE ITEMS')+'</button>'+
      '<button id="cfvAnchors" type="button" class="'+(state.anchors?'active':'')+'">'+(state.anchors?'HIDE FIT POINTS':'SHOW FIT POINTS')+'</button>'+
    '</div>'+
    '<div id="cfvAuditResult" class="cfv-audit-result" hidden></div>'+
    '<div class="cfv-main">'+
      '<section class="cfv-preview '+compareClass+'">'+comparisonModels().map(x=>modelHTML(x.c,x.label)).join('')+'</section>'+
      '<aside class="cfv-inspector">'+
        '<small>SELECTED ITEM</small><h3>'+esc(item?.name||'No item selected')+'</h3>'+
        '<div class="cfv-item-art">'+(G()?.artHTML?.(item,92,'cfv-item-icon')||'')+'</div>'+
        '<dl><div><dt>Class</dt><dd>'+esc(item?.class||'—')+'</dd></div><div><dt>Tier</dt><dd>'+esc(item?.tierLabel||('Tier '+(item?.tier||'—')))+'</dd></div><div><dt>Slot</dt><dd>'+esc(item?.slot||'—')+'</dd></div><div><dt>Item level</dt><dd>'+esc(item?.itemLevel||'—')+'</dd></div><div><dt>Visual ID</dt><dd>'+esc(item?.appearanceId||item?.itemId||'—')+'</dd></div></dl>'+
        '<div class="cfv-note"><b>FIT CHECK</b><span>Look for floating shoulders, chest gaps, gloves missing hands, leg armour crossing the body, boots missing the feet, or weapons/off-hands not sitting at the hands.</span></div>'+
      '</aside>'+
    '</div>'+
  '</section>';
  bind();
}
function commit(){saveState();render()}
function setValue(id,key,parser=v=>v){
  $('#'+id)?.addEventListener('change',e=>{state[key]=parser(e.target.value);commit()});
}
function stepBody(dir){
  const combos=[];RACES.forEach(race=>[0,1].forEach(gender=>[0,1,2].forEach(frame=>combos.push({race,gender,frame}))));
  let idx=combos.findIndex(x=>x.race===state.race&&x.gender===Number(state.gender)&&x.frame===Number(state.frame));
  idx=(idx+dir+combos.length)%combos.length;Object.assign(state,combos[idx]);commit();
}
function stepItem(dir){
  const items=allItems();if(!items.length)return;
  const current=canonicalItem(),idx=Math.max(0,items.findIndex(x=>x.itemId===current?.itemId)),next=items[(idx+dir+items.length)%items.length];
  syncFromItem(next);state.loadout='single';commit();
}
function toggleAuto(){
  if(autoTimer){clearInterval(autoTimer);autoTimer=null;render();return}
  autoTimer=setInterval(()=>stepItem(1),1300);render();
}
function showAuditResult(result,label){
  const el=$('#cfvAuditResult');if(!el)return;
  el.hidden=false;el.dataset.tone=result.failures.length?'error':'ok';
  el.innerHTML=result.failures.length
    ?'<b>'+result.ok+' / '+result.total+' '+esc(label)+' PASSED</b><span>'+esc(result.failures.slice(0,4).join(' · '))+(result.failures.length>4?' · +'+(result.failures.length-4)+' more':'')+'</span>'
    :'<b>'+result.ok+' / '+result.total+' '+esc(label)+' PASSED</b><span>No missing layers, invalid anchors, hand/grip mismatches, slot-fit faults, layer-order faults or broken SVG values were found.</span>';
}
function runAudit(){showAuditResult(auditCurrent(),'CURRENT ITEM · ALL 36 BODIES')}
function runBetaAudit(){
  const el=$('#cfvAuditResult');if(el){el.hidden=false;el.dataset.tone='busy';el.innerHTML='<b>RUNNING EQUIPMENT FIT V3 MATRIX…</b><span>Checking every class, tier, race, sex and frame combination.</span>'}
  setTimeout(()=>showAuditResult(auditBetaMatrix(),'FULL LOADOUT CONFIGURATIONS'),0);
}
function bind(){
  setValue('cfvRace','race');
  setValue('cfvGender','gender',Number);
  setValue('cfvFrame','frame',Number);
  setValue('cfvSkin','skinTone',Number);
  setValue('cfvClass','klass');
  setValue('cfvTier','tier',Number);
  setValue('cfvLoadout','loadout');
  setValue('cfvPosition','position');
  setValue('cfvCompare','compare');
  $('#cfvItem')?.addEventListener('change',e=>{const item=allItems().find(x=>x.itemId===e.target.value);syncFromItem(item);state.loadout='single';commit()});
  $('#cfvZoom')?.addEventListener('input',e=>{state.zoom=Number(e.target.value)||100;const label=$('#cfvZoomLabel');if(label)label.textContent=state.zoom+'%';document.querySelectorAll('.cfv-model-stage').forEach(x=>x.style.setProperty('--cfv-zoom',state.zoom/100));saveState()});
  $('#cfvPrevBody')?.addEventListener('click',()=>stepBody(-1));
  $('#cfvNextBody')?.addEventListener('click',()=>stepBody(1));
  $('#cfvPrevItem')?.addEventListener('click',()=>stepItem(-1));
  $('#cfvNextItem')?.addEventListener('click',()=>stepItem(1));
  $('#cfvAuto')?.addEventListener('click',toggleAuto);
  $('#cfvAnchors')?.addEventListener('click',()=>{state.anchors=!state.anchors;commit()});
  $('#cfvAudit')?.addEventListener('click',runAudit);
  $('#cfvBetaAudit')?.addEventListener('click',runBetaAudit);
  $('#cfvClose')?.addEventListener('click',close);
}
function open(){
  if(!isOwner())return;
  const mount=$('#characterFitViewerMount');if(!mount)return;
  opened=true;mount.hidden=false;render();
  requestAnimationFrame(()=>mount.scrollIntoView({behavior:'smooth',block:'start'}));
}
function close(){
  opened=false;if(autoTimer){clearInterval(autoTimer);autoTimer=null}
  const mount=$('#characterFitViewerMount');if(mount){mount.hidden=true;mount.innerHTML=''}
}
function syncAccess(){
  const entry=$('#characterFitViewerEntry'),mount=$('#characterFitViewerMount'),owner=isOwner();
  if(entry)entry.hidden=!owner;
  if(!owner&&mount)close();
}
function init(){
  const entry=$('#characterFitViewerEntry');
  if(!entry){setTimeout(init,150);return}
  entry.querySelector('#openCharacterFitViewer')?.addEventListener('click',open);
  window.addEventListener('cellbound:admin-status',syncAccess);
  window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin')setTimeout(syncAccess,0)});
  syncAccess();
}
window.CellboundCharacterFitViewer={open,close,render,isOwner,auditCurrent,auditBetaMatrix};
init();
})();