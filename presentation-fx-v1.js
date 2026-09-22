(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const tones={
 cell:'91,211,198',gold:'224,180,92',danger:'224,83,83',arcane:'148,112,220',
 shadow:'119,125,155',ice:'99,184,232',nature:'103,190,126',story:'179,153,211'
};
const dungeonNames={
 'ashen-vault':'The Ashen Vault','hollow-sanctum':'The Hollow Sanctum','chaos-canyon':'Chaos Canyon',
 'blackout-station':'Blackout Station','fractured-ages':'The Fractured Ages','twelve-below':'The Twelve Below'
};
let root=null,cardTimer=null,calloutTimer=null,flashTimer=null,shakeTimer=null,lastComplete='';
function ensure(){
 if(root?.isConnected)return root;
 root=document.createElement('div');root.id='cellboundFxRoot';root.setAttribute('aria-hidden','true');
 root.innerHTML='<div class="cbfx-flash"></div><div class="cbfx-vignette"></div><div class="cbfx-particles"></div><div class="cbfx-card-wrap"></div><div class="cbfx-callout"></div>';
 document.body.appendChild(root);return root
}
function tone(name='cell'){return tones[name]||tones.cell}
function setTone(el,name){if(el)el.style.setProperty('--cbfx-rgb',tone(name))}
function particles(name='cell',count=14){
 if(reduce())return;const r=ensure(),p=r.querySelector('.cbfx-particles');setTone(p,name);
 p.innerHTML=Array.from({length:Math.min(28,Math.max(5,count))},(_,i)=>{
  const x=8+Math.random()*84,dx=(Math.random()-.5)*180,d=.8+Math.random()*.7,delay=Math.random()*.18;
  return'<i class="cbfx-particle" style="--x:'+x+'%;--dx:'+dx+'px;--d:'+d+'s;--delay:'+delay+'s"></i>'
 }).join('');
 setTimeout(()=>{if(p)p.innerHTML=''},1800)
}
function flash(name='cell',withVignette=false){
 const r=ensure(),f=r.querySelector('.cbfx-flash'),v=r.querySelector('.cbfx-vignette');setTone(f,name);setTone(v,name);
 f.classList.remove('show');void f.offsetWidth;f.classList.add('show');clearTimeout(flashTimer);
 if(withVignette){v.classList.remove('show');void v.offsetWidth;v.classList.add('show')}
 flashTimer=setTimeout(()=>{f.classList.remove('show');v.classList.remove('show')},920)
}
function shake(level='soft'){
 if(reduce())return;const cls=level==='hard'?'cbfx-shake-hard':'cbfx-shake-soft';
 document.body.classList.remove('cbfx-shake-soft','cbfx-shake-hard');void document.body.offsetWidth;document.body.classList.add(cls);clearTimeout(shakeTimer);
 shakeTimer=setTimeout(()=>document.body.classList.remove(cls),430)
}
function card(opts={}){
 const r=ensure(),w=r.querySelector('.cbfx-card-wrap'),name=opts.tone||'cell',duration=Math.max(700,Number(opts.duration)||1450);
 setTone(w,name);clearTimeout(cardTimer);w.classList.remove('show');w.innerHTML='<section class="cbfx-card" data-compact="'+(opts.compact?'1':'0')+'">'+
  '<span class="cbfx-icon">'+esc(opts.icon||'◇')+'</span><small>'+esc(opts.eyebrow||'CELLBOUND')+'</small><h2>'+esc(opts.title||'')+'</h2>'+
  (opts.copy?'<p>'+esc(opts.copy)+'</p>':'')+'</section>';
 void w.offsetWidth;w.classList.add('show');if(opts.particles)particles(name,opts.particles===true?16:Number(opts.particles)||16);
 cardTimer=setTimeout(()=>{w.classList.remove('show');w.innerHTML=''},duration)
}
function callout(opts={}){
 const r=ensure(),c=r.querySelector('.cbfx-callout');setTone(c,opts.tone||'cell');clearTimeout(calloutTimer);c.classList.remove('show');
 c.innerHTML='<small>'+esc(opts.eyebrow||'COMBAT UPDATE')+'</small><b>'+esc(opts.title||'')+'</b>';void c.offsetWidth;c.classList.add('show');
 calloutTimer=setTimeout(()=>{c.classList.remove('show');c.innerHTML=''},Math.max(900,Number(opts.duration)||1350))
}
function pulse(target){
 const el=typeof target==='string'?document.querySelector(target):target;if(!el)return;
 el.classList.remove('cbfx-pulse');void el.offsetWidth;el.classList.add('cbfx-pulse');setTimeout(()=>el.classList.remove('cbfx-pulse'),650)
}
function viewChanged(id){
 const el=document.getElementById(id);if(!el||!el.classList.contains('active'))return;
 el.classList.remove('cbfx-view-enter');void el.offsetWidth;el.classList.add('cbfx-view-enter');setTimeout(()=>el.classList.remove('cbfx-view-enter'),430)
}
function micro(title,t='cell'){callout({eyebrow:'UPDATED',title,tone:t,duration:1050})}
function boss(name,copy=''){
 flash('danger',true);callout({eyebrow:'BOSS ENGAGED',title:name||'Hostile Encounter',tone:'danger',duration:1500});
 if(copy)setTimeout(()=>callout({eyebrow:'ENCOUNTER',title:copy,tone:'danger',duration:1250}),260)
}
function phase(name,health){
 flash('danger');shake('soft');callout({eyebrow:health!=null?'PHASE CHANGE · '+Math.round(Number(health)||0)+'%':'PHASE CHANGE',title:name||'The fight changes',tone:'danger'})
}
function wipe(copy=''){
 flash('danger',true);shake('hard');card({eyebrow:'EXPEDITION FAILED',title:'Party Wiped',copy:copy||'The party has fallen. Review what happened before returning.',icon:'✕',tone:'danger',duration:1750})
}
function victory(opts={}){
 flash('gold');particles('gold',20);card({eyebrow:opts.eyebrow||'EXPEDITION CLEARED',title:opts.title||'Victory',copy:opts.copy||'',icon:opts.icon||'✦',tone:'gold',duration:1650})
}
function quest(opts={}){
 flash(opts.tone||'story');card({eyebrow:opts.eyebrow||'QUEST UPDATED',title:opts.title||'Adventure Updated',copy:opts.copy||'',icon:opts.icon||'⌁',tone:opts.tone||'story',duration:opts.duration||1450,compact:opts.compact!==false})
}
function key(name){
 flash('arcane');shake('soft');callout({eyebrow:'LOCK MECHANISM OPENED',title:name||'Key Inserted',tone:'arcane',duration:1400});particles('arcane',10)
}
function unlock(title,copy){
 flash('gold',true);particles('gold',24);card({eyebrow:'NEW CONTENT UNLOCKED',title:title||'Unlocked',copy:copy||'',icon:'◇',tone:'gold',duration:1900})
}
function loot(item={}){
 const rarity=String(item.rarity||'').toLowerCase(),t=rarity==='legendary'||rarity==='epic'?'arcane':rarity==='rare'?'ice':'gold';
 flash(t);if(rarity==='legendary'||rarity==='epic')particles(t,20);
 callout({eyebrow:(item.rarity||'Loot').toUpperCase()+' ACQUIRED',title:item.name||'Item Acquired',tone:t,duration:1450})
}
function story(title,copy='',opts={}){card({eyebrow:opts.eyebrow||'STORY',title,copy,icon:opts.icon||'⌁',tone:opts.tone||'story',duration:opts.duration||1600,particles:opts.particles||false})}
function play(detail={}){
 const type=detail.type||detail.kind;
 if(type==='phase')return phase(detail.title||detail.name,detail.healthPct);
 if(type==='boss')return boss(detail.title||detail.name,detail.copy);
 if(type==='wipe')return wipe(detail.copy);
 if(type==='victory')return victory(detail);
 if(type==='quest')return quest(detail);
 if(type==='key')return key(detail.title||detail.name);
 if(type==='unlock')return unlock(detail.title,detail.copy);
 if(type==='loot')return loot(detail.item||detail);
 if(type==='story')return story(detail.title,detail.copy,detail);
 if(type==='flash')return flash(detail.tone||'cell',detail.vignette);
 if(type==='shake')return shake(detail.level||'soft');
 if(type==='micro')return micro(detail.title,detail.tone||'cell')
}
document.addEventListener('pointerdown',e=>{
 const b=e.target?.closest?.('button,[role="button"]');if(!b||b.disabled||reduce())return;
 b.classList.remove('cbfx-press');void b.offsetWidth;b.classList.add('cbfx-press');setTimeout(()=>b.classList.remove('cbfx-press'),190)
},{passive:true});
window.addEventListener('cellbound:view-changed',e=>viewChanged(e.detail?.view));
window.addEventListener('cellbound:dungeon-complete',e=>{
 const id=String(e.detail?.id||''),sig=id+':'+String(e.detail?.timeMs||'')+':'+String(e.detail?.score||'');
 if(sig===lastComplete)return;lastComplete=sig;
 victory({title:dungeonNames[id]||'Dungeon Cleared',copy:'The expedition is complete. Rewards and run results are ready.'})
});
window.addEventListener('cellbound:fx',e=>play(e.detail||{}));
window.CellboundFX={VERSION:'1.0.0',flash,shake,card,callout,pulse,viewChanged,micro,boss,phase,wipe,victory,quest,key,unlock,loot,story,play};
})();
