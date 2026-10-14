(()=>{
'use strict';
// Reusable pre-match plan editor. Storage is local and never awards PvP rewards or unlocks matchmaking.
const HEAL=['balanced','tank-first','group','triage'];
const isHealer=c=>String(c?.role||'').toLowerCase()==='healer'||['Holy','Restoration','Mistweaver','Preservation','Discipline'].includes(String(c?.spec||''));
const TARGET=['balanced','attack-healer','attack-tank','attack-dps','focus-flag-carrier','focus-low-health','protect-healer'];
const POSITION=['balanced','spread','group-up','fall-back','push-forward','hold-position','regroup'];
const OBJECTIVE={arena:['pressure-healer','peel-healer','kite','push','regroup'],'capture-the-flag':['take-flag','escort-carrier','defend-base','recover-flag','intercept-carrier','route-left','route-mid','route-right'],'king-of-the-hill':['capture-hill','hold-hill','contest-hill','rotate-early','defend-approach','split-pressure']};
const LABEL={'balanced':'Balanced','tank-first':'Guard tank','group':'Protect whole team','triage':'Save lowest-health ally','attack-healer':'Focus enemy healer','attack-tank':'Focus enemy tank','attack-dps':'Focus enemy DPS','focus-flag-carrier':'Focus enemy flag carrier','focus-low-health':'Finish low-health targets','protect-healer':'Protect our healer','spread':'Spread apart','group-up':'Fight together','fall-back':'Fall back','push-forward':'Push forward','hold-position':'Hold position','regroup':'Regroup','pressure-healer':'Pressure healer','peel-healer':'Peel for healer','kite':'Kite','push':'Push','take-flag':'Capture their flag','escort-carrier':'Escort carrier','defend-base':'Defend our base','recover-flag':'Recover our flag','intercept-carrier':'Intercept enemy carrier','route-left':'Left lane','route-mid':'Middle lane','route-right':'Right lane','capture-hill':'Capture active hill','hold-hill':'Hold hill','contest-hill':'Contest hill','rotate-early':'Rotate early','defend-approach':'Defend approaches','split-pressure':'Split pressure'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(mode,size)=>'cellbound:pvp-prematch:v1:'+String(window.CellboundGame?.getUser?.()?.id||'local')+':'+mode+':'+size;
const select=(field,values,selected)=>'<select data-pvp-plan-field="'+field+'">'+values.map(v=>'<option value="'+v+'"'+(v===selected?' selected':'')+'>'+esc(v==='balanced'&&field.startsWith('unit:')?'Follow team priority':LABEL[v]||v)+'</option>').join('')+'</select>';
const valid=(list,value,fallback)=>list.includes(value)?value:fallback;
const defaults=mode=>({target:'balanced',position:'balanced',objective:OBJECTIVE[mode]?.[0]||'push',individual:{},healing:{}});
function clean(raw,mode,roster=[]){
 const x=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},base=defaults(mode),individual={},healing={};
 for(const c of roster.slice(0,20)){const id=String(c?.id||'');if(id&&id.length<128){const choice=x.individual?.[id];individual[id]=valid(TARGET,choice,'balanced');if(isHealer(c))healing[id]=valid(HEAL,x.healing?.[id],'balanced')}}
 return{target:valid(TARGET,x.target,base.target),position:valid(POSITION,x.position,base.position),objective:valid(OBJECTIVE[mode]||[],x.objective,base.objective),individual,healing};
}
function load(mode,size,roster=[]){try{return clean(JSON.parse(localStorage.getItem(key(mode,size))||'{}'),mode,roster)}catch(_){return clean(null,mode,roster)}}
function save(mode,size,plan,roster=[]){const value=clean(plan,mode,roster);try{localStorage.setItem(key(mode,size),JSON.stringify(value))}catch(_){}return value}
function preset(mode,name,roster=[]){
 const x=defaults(mode);
 if(name==='assault'){x.target='attack-healer';x.position='push-forward';x.objective=mode==='arena'?'pressure-healer':mode==='capture-the-flag'?'take-flag':'capture-hill'}
 if(name==='defence'){x.target='protect-healer';x.position='group-up';x.objective=mode==='arena'?'peel-healer':mode==='capture-the-flag'?'defend-base':'hold-hill'}
 x.individual=Object.fromEntries(roster.map(c=>[String(c.id),'balanced']));
 x.healing=Object.fromEntries(roster.filter(isHealer).map(c=>[String(c.id),name==='defence'?'group':name==='assault'?'triage':'tank-first']));
 return x
}
function markup(mode,size,roster=[]){
 if(!OBJECTIVE[mode])return'';
 const p=load(mode,size,roster);
 return '<details class="cb-pvp-plan" data-pvp-plan><summary><span><b>PRE-MATCH TACTICS</b><small>Set the opening plan · Live commands can override it</small></span><strong>EDIT PLAN</strong></summary>'+
 '<div class="cb-pvp-plan-inner"><div class="cb-pvp-plan-presets"><button type="button" data-pvp-plan-preset="balanced">Balanced</button><button type="button" data-pvp-plan-preset="assault">Full Assault</button><button type="button" data-pvp-plan-preset="defence">Defensive Hold</button></div>'+
 '<div class="cb-pvp-plan-grid"><label>Team focus'+select('target',TARGET,p.target)+'</label><label>Opening formation'+select('position',POSITION,p.position)+'</label><label>Objective plan'+select('objective',OBJECTIVE[mode],p.objective)+'</label></div>'+
 '<div class="cb-pvp-plan-units"><small>INDIVIDUAL TARGET PRIORITIES</small>'+roster.map(c=>'<label><span><b>'+esc(c.name||c.class||'Adventurer')+'</b><small>'+esc(c.class||'')+'</small></span>'+select('unit:'+esc(c.id),TARGET,p.individual[String(c.id)]||'balanced')+'</label>'+(isHealer(c)?'<label><span><b>'+esc(c.name||'Healer')+' · HEALING</b><small>Ally survival priority</small></span>'+select('heal:'+esc(c.id),HEAL,p.healing[String(c.id)]||'balanced')+'</label>':'')).join('')+'</div>'+
 '<p data-pvp-plan-status role="status">Plan saved on this device for '+esc(mode)+' '+size+'v'+size+'.</p></div></details>'
}
function bind(root,mode,size,roster=[]){
 const panel=root?.querySelector?.('[data-pvp-plan]');if(!panel)return;
 const status=panel.querySelector('[data-pvp-plan-status]');
 panel.addEventListener('change',e=>{
  const field=e.target?.dataset?.pvpPlanField;if(!field)return;
  const p=load(mode,size,roster);
  if(field.startsWith('unit:'))p.individual[field.slice(5)]=e.target.value;
   else if(field.startsWith('heal:'))p.healing[field.slice(5)]=e.target.value;
  else if(['target','position','objective'].includes(field))p[field]=e.target.value;
  save(mode,size,p,roster);status.textContent='Plan saved. These instructions will be used at the next match start.'
 });
 panel.addEventListener('click',e=>{
  const name=e.target?.closest?.('[data-pvp-plan-preset]')?.dataset?.pvpPlanPreset;
  if(!['balanced','assault','defence'].includes(name))return;
  const p=save(mode,size,preset(mode,name,roster),roster);
  panel.querySelectorAll('[data-pvp-plan-field]').forEach(el=>{const f=el.dataset.pvpPlanField;el.value=f.startsWith('unit:')?p.individual[f.slice(5)]:f.startsWith('heal:')?p.healing[f.slice(5)]:p[f]});
  status.textContent='Applied '+(name==='assault'?'Full Assault':name==='defence'?'Defensive Hold':'Balanced')+'. You can customise any order.'
 })
}
window.CellboundPvPPreTactics=Object.freeze({VERSION:1,load,save,clean,preset,markup,bind});
})();