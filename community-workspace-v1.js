/* Cellbound Block 6 — community & remaining player screens.
 * Uses the game's existing permission-aware route dispatcher. PvP remains
 * locked in the current beta; this layer cannot enable modes or rewards. */
(function () {
  'use strict';
  const ids=['pvp','chat','highscores','support','admin'];
  const views=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
  if(ids.some(id=>!views[id])||document.body.classList.contains('cb-community-v6'))return;
  document.body.classList.add('cb-community-v6');
  const nav=document.querySelector('.sidebar .primary-nav');
  const route=(view)=>nav?.querySelector('.nav-btn[data-view="'+view+'"]');
  const allowed=view=>{
    const button=route(view);
    return !!button&&!button.hidden&&!button.disabled&&!button.classList.contains('locked');
  };
  const routeBars=[];
  function routeBar(section,items,description){
    const intro=section.querySelector(':scope > .section-intro');
    if(!intro)return;
    const bar=document.createElement('nav');
    bar.className='cb-community-routes';
    bar.setAttribute('aria-label',description);
    for(const [view,label,icon] of items){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='cb-community-route';
      btn.dataset.cbGo=view;
      const glyph=document.createElement('span');
      glyph.textContent=icon;
      glyph.setAttribute('aria-hidden','true');
      btn.append(glyph,document.createTextNode(label));
      bar.append(btn);
    }
    intro.insertAdjacentElement('afterend',bar);
    routeBars.push(bar);
  }
  routeBar(views.pvp,[['party','Assemble Party','♟'],['chat','Guild Chat','◌']],
    'PvP related destinations');
  routeBar(views.chat,[['highscores','High Scores','♛'],['trading','Trading Post','⇄']],
    'Community destinations');
  routeBar(views.highscores,[['professions','Your Artisans','⚒'],['chat','Guild Chat','◌']],
    'Rankings related destinations');
  routeBar(views.support,[['overview','Guild Hall','⌂'],['chat','Guild Chat','◌']],
    'Return from beta support');
  function sync(){
    for(const bar of routeBars){
      bar.querySelectorAll('[data-cb-go]').forEach(btn=>{
        const enabled=allowed(btn.dataset.cbGo);
        btn.hidden=!enabled;
        btn.disabled=!enabled;
      });
      bar.hidden=!Array.from(bar.querySelectorAll('button')).some(btn=>!btn.hidden);
    }
  }
  if(nav)new MutationObserver(sync).observe(nav,{
    subtree:true,attributes:true,attributeFilter:['hidden','disabled','class']
  });
  // Jump to the game's actual Party Finder, rather than rendering a second
  // sign-up flow or duplicating the live group listings.
  const chatHeading=views.chat.querySelector('.section-intro');
  if(chatHeading){
    const findGroup=document.createElement('button');
    findGroup.type='button';
    findGroup.className='cb-community-find-group';
    findGroup.textContent='Find a Group ↓';
    findGroup.setAttribute('aria-controls','partyFinderForm');
    findGroup.addEventListener('click',()=>{
      const form=views.chat.querySelector('#partyFinderForm');
      if(!form||form.closest('[hidden]'))return;
      form.scrollIntoView({behavior:'auto',block:'center'});
      const target=form.querySelector('#partyFinderTarget')||form.querySelector('input,select,button');
      if(target&&!target.disabled)target.focus({preventScroll:true});
    });
    chatHeading.append(findGroup);
  }
  // Text is deliberately plain and describes only implemented features.
  const socialText=views.chat.querySelector('.section-intro p');
  if(socialText)socialText.textContent='Speak to other guilds, join a group or trade. Your guild identity follows you through Cellbound.';
  const supportText=views.support.querySelector('.section-intro p');
  if(supportText)supportText.textContent='Report a bug, suggest an improvement or check the beta queue. Your build and screen details are attached to reports.';
  // No PvP markup or disabled state is replaced. The same applies to High
  // Scores ranking data, social moderation and Design Booth administration.
  window.addEventListener('cellbound:view-changed',sync);
  sync();
})();
