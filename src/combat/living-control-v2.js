(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const commands=[['focus','Focus target'],['defend-healer','Defend healer'],['regroup','Regroup'],['spread','Spread out'],['hold','Hold position'],['full-attack','Full attack'],['retreat','Retreat'],['interrupt','Interrupt']];
function allowed(){return window.CELLBOUND_CONTROL_PREVIEW===true&&window.CellboundAdmin?.role==='owner'}
function mount({root,arena,session,characters=[]}){
 if(!session?.controlState?.().enabled)return null;
 const shell=root.querySelector('.cbcombat-shell');if(!shell||!arena)return null;
 shell.classList.add('living-control');arena.dataset.authoritativeControl='1';
 const hud=document.createElement('section');hud.className='lc-hud';hud.setAttribute('aria-label','Hero and party controls');
 hud.innerHTML='<div class="lc-heroes" aria-label="Choose controlled hero"></div><div class="lc-context"><b data-lc-active>Party on automatic</b><span data-lc-target>No target</span><button type="button" data-lc-ai>All AI</button><button type="button" data-lc-orders aria-expanded="false">Party orders</button></div><div class="lc-abilities" aria-label="Active hero abilities"></div><div class="lc-orders" hidden>'+commands.map(([id,label])=>'<button type="button" data-lc-command="'+id+'">'+label+'<small></small></button>').join('')+'</div><p class="lc-status" role="status">Tap a hero, then tap the ground to move. Tap a unit to target it.</p>';
 shell.appendChild(hud);
 const portrait=h=>{const c=characters.find(c=>'p-'+c.id===h.id);return c&&window.CellboundPortraits?.portraitHTML?window.CellboundPortraits.portraitHTML(c,{size:'fill',label:h.name}):esc(h.class.slice(0,2))};
 const heroes=hud.querySelector('.lc-heroes'),abilities=hud.querySelector('.lc-abilities'),feedback=hud.querySelector('.lc-status');
 let activeSignature='',retreatArmed=false,disposed=false,lastPaint=-Infinity;
 const report=out=>{if(!out?.ok)feedback.textContent=({'position':'Choose open ground inside the room.','range':'Move closer to your target.','line-of-sight':'The target is behind an obstacle.','resource':'Not enough resource.','cooldown':'That action is still on cooldown.','hero':'Select a living hero first.','target':'Select a suitable target.','no-cast':'No interruptible cast in reach.','no-power':'Not enough command power.'}[out?.reason]||'Action unavailable: '+String(out?.reason||'unknown'));else feedback.textContent=retreatArmed?'Tap safe ground for the party to retreat.':'Order accepted. Combat continues.';update(true);return out};
 const send=action=>report(session.input(action));
 function update(force=false){
  if(disposed||!hud.isConnected||!force&&session.timeMs-lastPaint<100)return;lastPaint=session.timeMs;
  const state=session.controlState(),hero=state.heroes.find(h=>h.id===state.heroId),enemies=state.targets;
  window.CellboundCombatFX?.authoritativeFrame?.(arena,state.positions);
  if(!heroes.childElementCount)heroes.innerHTML=state.heroes.map((h,i)=>'<button type="button" data-lc-hero="'+esc(h.id)+'" aria-pressed="false"><span class="lc-avatar">'+portrait(h)+'</span><b>'+esc(h.name)+'</b><em><i data-lc-hp></i></em><em class="lc-resource"><i data-lc-resource></i></em><small></small></button>').join('');
  state.heroes.forEach(h=>{const b=[...heroes.children].find(x=>x.dataset.lcHero===h.id);b.disabled=!h.alive||session.finished;b.setAttribute('aria-pressed',String(h.id===state.heroId));b.querySelector('[data-lc-hp]').style.width=(100*h.health/h.maxHealth)+'%';b.querySelector('[data-lc-resource]').style.width=(100*h.resource.value/Math.max(1,h.resource.max))+'%';b.querySelector('small').textContent=h.alive?Math.ceil(h.health)+' HP · '+Math.floor(h.resource.value)+' '+h.resource.name:'Down';b.setAttribute('aria-label',h.name+', '+h.class+', '+(h.alive?Math.ceil(h.health)+' health':'incapacitated'));});
  hud.querySelector('[data-lc-active]').textContent=hero?hero.name+' · direct control':'Party on automatic';
  const target=[...state.heroes,...enemies].find(u=>u.id===hero?.targetId);
  hud.querySelector('[data-lc-target]').textContent=target?'Target: '+target.name:'Tap a unit to target';
  const signature=hero?hero.id+':'+hero.abilities.map(a=>a.id).join(','):'';
  if(signature!==activeSignature){activeSignature=signature;abilities.innerHTML=hero?hero.abilities.map(a=>'<button type="button" data-lc-ability="'+esc(a.id)+'"><b>'+esc(a.name)+'</b><small></small></button>').join(''):'<span>Select a hero to use abilities.</span>'}
  hero?.abilities.forEach(a=>{const b=[...abilities.children].find(x=>x.dataset.lcAbility===a.id);b.disabled=!a.available||session.finished;b.querySelector('small').textContent=a.remainingMs>0?(a.remainingMs/1000).toFixed(1)+'s':a.available?(a.cost||0)+' '+hero.resource.name:a.reason.replace(/-/g,' ');b.title=a.name+' · '+a.reason;});
  hud.querySelectorAll('[data-lc-command]').forEach(b=>{const state=session.commandState(b.dataset.lcCommand);b.disabled=!state.available||session.finished;b.querySelector('small').textContent=state.remainingMs>0?(state.remainingMs/1000).toFixed(1)+'s':state.cost+' CP'});
  hud.querySelector('[data-lc-orders]').textContent='Party orders · '+session.commandPowerState().value+' CP';
  arena.querySelectorAll('[data-unit]').forEach(n=>{n.classList.toggle('lc-controlled',n.dataset.unit===state.heroId);n.classList.toggle('lc-targeted',n.dataset.unit===hero?.targetId)});
 }
 const onHud=e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.lcHero){retreatArmed=false;send({type:'select',heroId:b.dataset.lcHero})}
  else if(b.hasAttribute('data-lc-ai')){retreatArmed=false;send({type:'select',heroId:null})}
  else if(b.dataset.lcAbility)send({type:'ability',abilityId:b.dataset.lcAbility});
  else if(b.hasAttribute('data-lc-orders')){const list=hud.querySelector('.lc-orders');list.hidden=!list.hidden;b.setAttribute('aria-expanded',String(!list.hidden))}
  else if(b.dataset.lcCommand){
   if(b.dataset.lcCommand==='retreat'){retreatArmed=true;feedback.textContent='Tap safe ground for the AI party to retreat. Your hero stays under your control.';return}
   const state=session.controlState(),hero=state.heroes.find(h=>h.id===state.heroId);
   send({type:'command',command:b.dataset.lcCommand,...(hero?.targetId?{targetId:hero.targetId}:{})})
  }
 };
 const onArena=e=>{
  if(e.target.closest('button')||session.finished)return;
  // Consume the old party-focus click; selecting a target must not command the whole party.
  e.preventDefault();e.stopImmediatePropagation();
  const unit=e.target.closest('[data-unit]');
  if(unit&&!retreatArmed){send({type:'target',targetId:unit.dataset.unit});return}
  const r=arena.getBoundingClientRect(),position={x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};
  if(retreatArmed){const out=send({type:'command',command:'retreat',position});if(out.ok)retreatArmed=false}
  else send({type:'move',position})
 };
 hud.addEventListener('click',onHud);arena.addEventListener('click',onArena,true);update(true);
 return{update,dispose(){if(disposed)return;disposed=true;hud.removeEventListener('click',onHud);arena.removeEventListener('click',onArena,true);hud.remove();delete arena.dataset.authoritativeControl;shell.classList.remove('living-control')}}
}
function telegraph(arena,event){
 const shape=event.payload?.controlGeometry;if(!shape)return null;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.classList.add('lc-telegraph');svg.setAttribute('aria-hidden','true');
 if(shape.type==='circles')for(const c of shape.circles){const n=document.createElementNS(ns,'circle');for(const [key,value]of Object.entries({cx:c.x,cy:c.y,r:c.radius}))n.setAttribute(key,value);svg.appendChild(n)}
 else{
  const o=shape.origin,angle=shape.angle,point=(a,r)=>[o.x+Math.cos(a)*r,o.y+Math.sin(a)*r];let points;
  if(shape.type==='cone')points=[[o.x,o.y],...Array.from({length:25},(_,i)=>point(angle-shape.halfAngle+i*shape.halfAngle*2/24,shape.length))];
  else{const end=point(angle,shape.length),dx=-Math.sin(angle)*shape.halfWidth,dy=Math.cos(angle)*shape.halfWidth;points=[[o.x+dx,o.y+dy],[end[0]+dx,end[1]+dy],[end[0]-dx,end[1]-dy],[o.x-dx,o.y-dy]]}
  const n=document.createElementNS(ns,'polygon');n.setAttribute('points',points.map(p=>p.join(',')).join(' '));svg.appendChild(n)
 }
 (arena.querySelector('#cb2dTelegraphs')||arena).appendChild(svg);return svg
}
window.CellboundLivingControl=Object.freeze({allowed,mount,telegraph});
})();
