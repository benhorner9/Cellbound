/* Cellbound Block 8 — focused, accessible crafting work window.
 * Moves the existing LIVE work-order node, preserving every action handler,
 * forge timing, material reservation, save operation and completion logic.
 * No second crafting state or second set of game rules is created. */
(function(){
  'use strict';
  const workshop=document.querySelector('#professionWorkshop');
  const page=document.querySelector('#professions');
  if(!workshop||!page||document.querySelector('#cbCraftModal'))return;

  const dialog=document.createElement('div');
  dialog.id='cbCraftModal';
  dialog.className='cb-craft-modal';
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-label','Crafting work order');
  dialog.hidden=true;
  dialog.innerHTML=
    '<div class="cb-craft-modal__shade" aria-hidden="true"></div>'+
    '<section class="cb-craft-modal__window">'+
      '<header class="cb-craft-modal__header">'+
        '<div class="cb-craft-modal__title"><small>GUILD WORKSHOP · FOCUSED CRAFT</small>'+
          '<h2 id="cbCraftModalTitle">Work Order</h2>'+
          '<p id="cbCraftModalSubtitle">The workshop clock runs only while you are working here.</p></div>'+
        '<button type="button" class="cb-craft-modal__close" data-craft-modal-close aria-label="Close work order and pause crafting">✕ <span>Pause & Close</span></button>'+
      '</header>'+
      '<div class="cb-craft-modal__body">'+
        '<div class="cb-craft-modal__live" id="cbCraftModalLive"></div>'+
        '<div class="cb-craft-modal__prep" id="cbCraftModalPrep">'+
          '<div class="cb-craft-modal__prep-copy"><small>READY WHEN YOU ARE</small>'+
            '<h3 id="cbCraftModalPrepTitle">Prepare your tools</h3>'+
            '<p>Materials are reserved. Your timer does not begin until you start. Leaving this window pauses the work; nothing is lost.</p>'+
            '<button type="button" class="cb-craft-modal__begin" id="cbCraftModalBegin">BEGIN WORK →</button></div>'+
        '</div>'+
      '</div>'+
      '<footer class="cb-craft-modal__footer"><span>Focused workshop time only · No offline progress</span><span id="cbCraftModalState" role="status">PAUSED</span></footer>'+
    '</section>';
  document.body.appendChild(dialog);
  const live=dialog.querySelector('#cbCraftModalLive');
  const prep=dialog.querySelector('#cbCraftModalPrep');
  const start=dialog.querySelector('#cbCraftModalBegin');
  const heading=dialog.querySelector('#cbCraftModalTitle');
  const subtitle=dialog.querySelector('#cbCraftModalSubtitle');
  const mode=dialog.querySelector('#cbCraftModalState');

  let orderKey='',open=false,running=false,summary=false,previousFocus=null;
  const game=()=>window.CellboundGame?.getState?.();
  const project=()=>game()?.workshopCraftProject||null;
  const finished=()=>game()?.workshopCraftSummary||null;
  const getKey=p=>p?String(p.charId)+'|'+String(p.recipeId)+'|'+String(p.startedAt||''):''; 
  const canFocus=()=>document.visibilityState==='visible'&&page.classList.contains('active');
  function getOriginal(){
    return workshop.querySelector('.timed-craft-project')||
      workshop.querySelector('[data-forge-job-summary]');
  }
  function setRunning(value){
    running=Boolean(value)&&!summary&&open&&!!project();
    prep.hidden=running||summary;
    live.inert=!running&&!summary;
    mode.textContent=summary?'WORK COMPLETE':running?'WORKSHOP ACTIVE':'PAUSED · READY TO RESUME';
    if(running){
      // Tick the existing economy clock through its normal focused handler.
      // Do not alter any timers, materials or rules inside the economy engine.
      window.dispatchEvent(new Event('focus'));
    }else if(project()){
      window.dispatchEvent(new Event('blur'));
    }
  }
  function markOpen(value){
    open=Boolean(value);
    dialog.hidden=!open;
    document.body.classList.toggle('cb-craft-modal-open',open);
    if(open){
      // Opening is preparation, not a timer-start event.
      start.textContent=orderKey&&project()&&project().remainingMs<project().totalMs?
        'RESUME WORK →':'BEGIN WORK →';
      start.focus({preventScroll:true});
    }else{
      if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
      else workshop.querySelector('[data-craft-modal-reopen]')?.focus({preventScroll:true});
    }
  }
  function close(){
    if(!open)return;
    setRunning(false);
    markOpen(false);
  }
  function openWindow(){
    if(!live.firstElementChild)return;
    previousFocus=document.activeElement;
    markOpen(true);
    setRunning(false);
  }
  function makeReopen(target,isSummary){
    // A placeholder stays near the real recipe list when the window is closed.
    const row=document.createElement('div');
    row.className='cb-craft-modal__reopen';
    const b=document.createElement('button');
    b.type='button';
    b.dataset.craftModalReopen='';
    b.textContent=isSummary?'VIEW COMPLETED ORDER →':'OPEN WORK ORDER →';
    b.addEventListener('click',openWindow);
    const copy=document.createElement('span');
    copy.textContent=isSummary?'Your forge results are ready to review.':
      'Your reserved materials and crafting progress are safe. Reopen to continue.';
    row.append(b,copy);
    target.before(row);
  }
  function sync(){
    const node=getOriginal();
    const p=project(),result=finished();
    const nextKey=p?getKey(p):'';
    if(!node){
      if(!p&&!result&&live.firstElementChild){
        close();
        live.replaceChildren();
        orderKey='';summary=false;
      }
      return;
    }
    const newWork=!!p&&orderKey!==nextKey;
    const resultTransition=!p&&!!result&&!summary;
    const isSummary=!!node.matches('[data-forge-job-summary]');
    if(newWork){
      orderKey=nextKey;summary=false;running=false;
    }
    if(isSummary){
      summary=true;running=false;
      orderKey='';
    }
    // Leave the reopen control in the original WORKSHOP location, then
    // move the native, already-bound work order into our focused window.
    // Moving before adding the reopen control would put it inside the modal.
    makeReopen(node,isSummary);
    live.replaceChildren(node);
    const c=game()?.roster?.find(x=>String(x.id)===String(p?.charId||result?.characterId));
    heading.textContent=result?.recipeName||node.querySelector('.craft-project h3')?.textContent||
      node.querySelector('h3')?.textContent||'Work Order';
    subtitle.textContent=(c?.name||result?.characterName||'Your artisan')+' · '+
      (p?.profession||result?.profession||'Crafting')+
      (p?.quantity?' · Batch ×'+p.quantity:'');
    if(newWork||resultTransition||!open) {
      if(newWork||resultTransition) {
        previousFocus=document.activeElement;
        markOpen(true);
      }
    }
    if(isSummary){
      if(!open){previousFocus=document.activeElement;markOpen(true);}
      prep.hidden=true;live.inert=false;
      mode.textContent='WORK COMPLETE';
      node.querySelector('[data-forge-summary-title]')?.focus?.({preventScroll:true});
    }else{
      // Preserve current running state through skill-action rerenders.
      // Never allow a backgrounded or manually closed modal to run time.
      running=running&&open&&canFocus();
      prep.hidden=running;
      live.inert=!running;
      mode.textContent=running?'WORKSHOP ACTIVE':'PAUSED · READY TO RESUME';
      start.textContent=p?.remainingMs<p?.totalMs?'RESUME WORK →':'BEGIN WORK →';
      if(running)window.dispatchEvent(new Event('focus'));
    }
  }
  window.CellboundCraftOverlay={
    isReady:()=>open&&running&&!dialog.hidden&&canFocus(),
    open:openWindow,
    close,
    isOpen:()=>open,
    refresh:sync
  };
  workshop.querySelector('[data-craft-modal-reopen]')?.addEventListener('click',openWindow);
  new MutationObserver(sync).observe(workshop,{childList:true});
  dialog.querySelector('[data-craft-modal-close]').addEventListener('click',close);
  start.addEventListener('click',()=>{
    if(!project()||!open)return;
    setRunning(true);
    dialog.querySelector('[data-forge-strike]')?.focus({preventScroll:true});
  });
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key!=='Tab')return;
    const tabbables=[...dialog.querySelectorAll('button:not([disabled]):not([hidden]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')]
      .filter(el=>!el.closest('[hidden]')&&!el.closest('[inert]')&&el.getClientRects().length);
    if(!tabbables.length)return;
    if(e.shiftKey&&document.activeElement===tabbables[0]){
      e.preventDefault();tabbables.at(-1).focus();
    }else if(!e.shiftKey&&document.activeElement===tabbables.at(-1)){
      e.preventDefault();tabbables[0].focus();
    }
  });
  window.addEventListener('cellbound:view-changed',e=>{
    if(e.detail?.view&&e.detail.view!=='professions')close();
  });
  // Leaving or backgrounding the app is already handled by economy-v2.
  // Keep our display state too, so returning never silently starts work.
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible')setRunning(false);
  });
  const bug=document.getElementById('betaQuickReportTrigger');
  if(bug)bug.setAttribute('aria-label','Report a bug or request a feature');
  sync();
})();
