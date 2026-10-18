/* Cellbound UI Block 5 — Workshop / Vault / Trading Post journey.
   Presentation only: existing profession, timer, forge and market engines own
   the live widgets, unlocks, permissions, account data and all mutations. */
(function(){
  'use strict';
  const workshop=document.querySelector('#professions');
  const bank=document.querySelector('#bank');
  const market=document.querySelector('#trading');
  const roster=workshop?.querySelector('#professionCharacterList');
  const work=workshop?.querySelector('#professionWorkshop');
  if(!workshop||!bank||!market||!roster||!work||
     document.querySelector('#cbWorkshopContext'))return;
  document.body.classList.add('cb-economy-v5');

  const workshopIntro=workshop.querySelector(':scope > .section-intro');
  const marketIntro=market.querySelector(':scope > .section-intro');
  if(workshopIntro){
    const title=workshopIntro.querySelector('h2');
    const copy=workshopIntro.querySelector('p');
    if(title)title.textContent='The Workshop';
    if(copy)copy.textContent='Choose an artisan, prepare the reagents and work through a recipe. Crafting pauses when you leave this screen.';
  }
  if(marketIntro){
    const copy=marketIntro.querySelector('p');
    if(copy)copy.textContent='Find what your workshop needs, list finished goods and collect your sales.';
  }

  function navigation(items,className){
    const nav=document.createElement('nav');
    nav.className=className;
    nav.setAttribute('aria-label','Workshop and economy destinations');
    items.forEach(([view,label,icon])=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.cbGo=view;
      button.className='cb-economy-route';
      button.innerHTML='<span aria-hidden="true">'+icon+'</span> ';
      button.append(document.createTextNode(label));
      nav.append(button);
    });
    return nav;
  }
  const routes=[
    ['professions','Workshop','⚒'],
    ['bank','Guild Bank','▦'],
    ['trading','Trading Post','⇄']
  ];
  const steps=navigation(routes,'cb-economy-journey');
  steps.setAttribute('aria-label','Workshop, storage and trading');
  workshopIntro?.insertAdjacentElement('afterend',steps);
  const marketNav=navigation([
    ['professions','Workshop','⚒'],
    ['bank','Guild Bank','▦']
  ],'cb-economy-inline-routes');
  marketIntro?.insertAdjacentElement('afterend',marketNav);
  const bankActions=bank.querySelector('.bank-intro-actions');
  if(bankActions&&!bankActions.querySelector('.cb-economy-inline-routes')){
    bankActions.append(navigation([
      ['professions','Workshop','⚒'],['trading','Trading Post','⇄']
    ],'cb-economy-inline-routes'));
  }

  // Context is derived from real selected artisan and existing workshop title,
  // never from fabricated levels, recipes or player inventories.
  const context=document.createElement('div');
  context.id='cbWorkshopContext';
  context.className='cb-workshop-context';
  context.setAttribute('aria-label','Current workshop selection');
  const state=document.createElement('div');
  state.className='cb-workshop-context__selection';
  const overline=document.createElement('small');
  overline.textContent='AT THE WORKBENCH';
  const name=document.createElement('strong');
  name.textContent='Choose an artisan';
  const description=document.createElement('span');
  description.textContent='Select an adventurer to view their profession.';
  state.append(overline,name,description);
  const help=document.createElement('p');
  help.textContent='Choose artisan → pick recipe → prepare materials → craft';
  context.append(state,help);
  const layout=workshop.querySelector('.profession-layout');
  if(layout)layout.before(context);

  function updateSelection(){
    const selected=roster.querySelector('.profession-char.active');
    const artisan=selected?.querySelector('b')?.textContent?.trim();
    const prof=workshop.querySelector('#workshopTitle')?.textContent?.trim();
    const trade=work.querySelector('.profession-command-copy h3')?.textContent?.trim();
    name.textContent=artisan||'Choose an artisan';
    description.textContent=trade ? trade + (prof ? ' · ' + prof : '') :
      prof||'Choose a character and a trade to view recipes.';
    context.classList.toggle('cb-workshop-context--active',!!artisan);
  }
  const nav=document.querySelector('.sidebar .primary-nav');
  function syncRoutes(){
    document.querySelectorAll('.cb-economy-route').forEach(button=>{
      const source=nav?.querySelector('.nav-btn[data-view="'+button.dataset.cbGo+'"]');
      const allowed=!!source&&!source.hidden&&!source.disabled&&
        !source.classList.contains('locked');
      button.hidden=!allowed;
      button.disabled=!allowed;
      button.classList.toggle('is-current',
        document.querySelector('.main>.view.active')?.id===button.dataset.cbGo);
      if(button.classList.contains('is-current'))button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
  }
  // The game fully replaces the artisan roster and workshop when selection
  // changes. Observe that existing DOM instead of overriding its click hooks.
  new MutationObserver(updateSelection).observe(roster,{childList:true});
  const title=workshop.querySelector('#workshopTitle');
  if(title)new MutationObserver(updateSelection).observe(title,{childList:true,characterData:true,subtree:true});
  if(nav)new MutationObserver(syncRoutes).observe(nav,{
    subtree:true,attributes:true,attributeFilter:['hidden','disabled','class']
  });
  window.addEventListener('cellbound:view-changed',syncRoutes);
  window.addEventListener('cellbound:ready',updateSelection);
  syncRoutes();updateSelection();
})();
