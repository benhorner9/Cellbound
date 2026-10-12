/* Cellbound UI Block 4: an expedition-preparation panel using live
   values and the existing, permission-controlled game routes. */
(function () {
  'use strict';
  const dungeons=document.querySelector('#content');
  const quests=document.querySelector('#quests');
  const world=document.querySelector('#world');
  const raids=document.querySelector('#raids');
  const status=document.querySelector('#dungeonBrowserStatus');
  const intro=dungeons?.querySelector(':scope > .section-intro');
  if(!intro||!quests||!world||!raids||!status||document.querySelector('#cbAdventureBrief'))return;
  document.body.classList.add('cb-adventure-v4');
  const title=intro.querySelector('h2'),paragraph=intro.querySelector('p');
  if(title)title.textContent='Choose an Expedition';
  if(paragraph)paragraph.textContent='Check the route, bosses, entry requirements and rewards before setting out with your five.';
  const brief=document.createElement('section');
  brief.id='cbAdventureBrief';
  brief.className='cb-adventure-brief';
  brief.setAttribute('aria-label','Expedition preparation');
  brief.innerHTML=
    '<div class="cb-adventure-brief__copy"><small>BEFORE YOU LEAVE</small>'+
      '<h3>Is your party ready?</h3><p>Review the five, then choose a dungeon. '+
      'The journal shows which encounters you can enter.</p></div>'+
    '<div class="cb-adventure-brief__tools"><div class="cb-adventure-brief__figures">'+
      '<div><small>PARTY iLVL</small><b id="cbAdventureItemLevel">—</b></div>'+
      '<div><small>READINESS</small><b id="cbAdventureReadiness">—</b></div>'+
      '<div><small>AVAILABLE</small><b id="cbAdventureAvailable">Checking…</b></div>'+
    '</div><div class="cb-adventure-brief__buttons">'+
      '<button type="button" data-cb-go="party">Manage Party →</button>'+
      '<button type="button" data-cb-go="quests">Quest Journal</button></div></div>';
  intro.insertAdjacentElement('afterend',brief);
  const metrics=[
    [document.querySelector('#partyItemLevelTop'),brief.querySelector('#cbAdventureItemLevel')],
    [document.querySelector('#readinessText'),brief.querySelector('#cbAdventureReadiness')],
    [status,brief.querySelector('#cbAdventureAvailable')]
  ];
  const nav=document.querySelector('.sidebar .primary-nav');
  function sync(){
    metrics.forEach(([source,target])=>{
      if(!target)return;
      const value=source?.textContent?.trim();
      target.textContent=value||'—';
      target.title=value||'Awaiting guild data';
    });
    brief.querySelectorAll('[data-cb-go]').forEach(button=>{
      const source=nav?.querySelector('.nav-btn[data-view="'+button.dataset.cbGo+'"]');
      const allowed=!!source&&!source.hidden&&!source.disabled&&!source.classList.contains('locked');
      button.hidden=!allowed;
      button.disabled=!allowed;
    });
  }
  metrics.forEach(([source])=>{
    if(source)new MutationObserver(sync).observe(source,{childList:true,subtree:true,characterData:true});
  });
  if(nav)new MutationObserver(sync).observe(nav,{
    subtree:true,attributes:true,attributeFilter:['hidden','disabled','class']
  });
  window.addEventListener('cellbound:view-changed',sync);
  sync();
  // Entrances, encounters, quest tracking and raid locks remain with their
  // original game systems, and the Design Booth retains its own UI editor.
})();
