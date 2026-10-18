/* Cellbound Block 3 — Heroes workspace. Presentation-only enhancements.
 * Roster, party, bank data and equipment actions remain under their existing
 * engine and account permissions. */
(function(){
  'use strict';
  const roster=document.querySelector('#roster');
  const party=document.querySelector('#party');
  const bank=document.querySelector('#bank');
  const grid=roster?.querySelector('#rosterGrid');
  if(!roster||!party||!bank||!grid||document.body.classList.contains('cb-heroes-v3'))return;
  document.body.classList.add('cb-heroes-v3');

  const panels=[
    {root:roster,tag:'HEROES',title:'Your Adventurers',description:'Inspect your heroes, check their equipment and choose who joins your party.'},
    {root:party,tag:'FORMATION',title:'Your Active Five',description:'Choose the tank, healer and damage dealers who will take the next fight.'},
    {root:bank,tag:'GUILD VAULT',title:'Equipment & Supplies',description:'Browse your stored equipment and materials. Open a hero to equip suitable gear.'}
  ];
  for(const info of panels){
    const intro=info.root.querySelector('.section-intro');
    if(!intro)continue;
    intro.classList.add('cb-heroes-intro');
    const label=intro.querySelector('small'),h2=intro.querySelector('h2'),p=intro.querySelector('p');
    if(label)label.textContent=info.tag;
    if(h2)h2.textContent=info.title;
    if(p)p.textContent=info.description;
  }

  // Keep route access obvious at the points people actually need it.
  // These buttons go through the existing data-cb-go dispatcher and therefore
  // cannot invent a new route or bypass unlock/permission checks.
  function addShortcut(root,selector,route,label){
    const host=root.querySelector(selector);
    if(!host||host.querySelector('[data-cb-go="'+route+'"]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='cb-heroes-shortcut';
    button.dataset.cbGo=route;
    button.textContent=label;
    host.append(button);
  }
  addShortcut(roster,'.roster-intro-actions','bank','Guild Bank →');
  addShortcut(party,'.section-intro','roster','View Roster →');
  addShortcut(bank,'.bank-intro-actions','roster','Open Heroes →');

  function syncShortcuts(){
    document.querySelectorAll('.cb-heroes-shortcut[data-cb-go]').forEach(button=>{
      const original=document.querySelector('.sidebar .nav-btn[data-view="'+button.dataset.cbGo+'"]');
      const allowed=!!original&&!original.hidden&&!original.disabled&&!original.classList.contains('locked');
      button.hidden=!allowed;
      button.disabled=!allowed;
    });
  }
  const nav=document.querySelector('.sidebar .primary-nav');
  if(nav)new MutationObserver(syncShortcuts).observe(nav,{
    subtree:true,attributes:true,attributeFilter:['hidden','disabled','class']
  });
  syncShortcuts();

  // Roster cards are rebuilt after filter, recruitment and save events.
  // Add an equipment shortcut to the live card each time, never clone cards
  // or render separate character/item representations.
  function enhanceCards(){
    grid.querySelectorAll('.roster-character-card').forEach(card=>{
      const actions=card.querySelector('.roster-card-actions');
      const original=actions?.querySelector('button[data-char]');
      if(!original||actions.querySelector('[data-char-equip]'))return;
      const button=document.createElement('button');
      button.type='button';
      button.className='cb-hero-equip-link';
      button.dataset.charEquip=original.dataset.char;
      const name=card.querySelector('.roster-card-identity h3')?.textContent?.trim()||'adventurer';
      const locked=card.classList.contains('roster-locked');
      button.textContent=locked?'View Gear':'Equipment';
      button.setAttribute('aria-label','Open '+name+' equipment');
      actions.append(button);
    });
  }
  // Observe only direct card replacement, not button insertions, to prevent
  // a MutationObserver feedback loop.
  new MutationObserver(enhanceCards).observe(grid,{childList:true});
  enhanceCards();
  window.addEventListener('cellbound:view-changed',syncShortcuts);
})();
