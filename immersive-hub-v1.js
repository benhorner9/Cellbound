/* Cellbound Immersive Guild Shell v1 — routes remain owned by guild-v4.js. */
(function(){
  'use strict';
  if(document.querySelector('#cbImmersiveDock'))return;
  const GROUPS={
    guild:{label:'Heroes',routes:[['roster','Roster'],['party','Active Party'],['bank','Bank']]},
    adventure:{label:'Adventure',routes:[['quests','Quests'],['content','Dungeons'],['world','Activities'],['raids','Raids'],['endgame','Endgame']]},
    social:{label:'Social',routes:[['chat','Guild & Chat'],['highscores','High Scores']]},
    market:{label:'Market',routes:[['trading','Trading Post']]},
    pvp:{label:'PvP',routes:[['pvp','PvP Arena']]}
  };
  const PRIMARY=[
    ['overview','⌂','Home'],
    ['party','♜','Guild'],
    ['quests','✦','Adventure'],
    ['professions','⚒','Forge'],
    ['pvp','⚔','PvP'],
    ['chat','❖','Social']
  ];
  const HUB_OF={overview:'overview',roster:'guild',party:'guild',bank:'guild',professions:'professions',quests:'adventure',content:'adventure',world:'adventure',raids:'adventure',endgame:'adventure',trading:'market',pvp:'pvp',chat:'social',highscores:'social',support:'support',admin:'admin'};
  const $=s=>document.querySelector(s);
  const clean=s=>String(s==null?'':s);
  const original=view=>$('.sidebar .nav-btn[data-view="'+view+'"]');
  let lastFocus=null;
  let panelOpen=false;
  const topbar=$('.main>.topbar');
  const overview=$('#overview');
  if(!topbar||!overview||!$('.sidebar .primary-nav'))return;
  document.body.classList.add('cb-immersive-ui');
  const crest=document.createElement('button');
  crest.type='button';crest.className='cb-top-crest';crest.setAttribute('aria-label','Return to Guild Hall');
  crest.innerHTML='<span class="cb-top-crest__mark" aria-hidden="true">◇</span><span><b>CELLBOUND</b><small>GUILD COMMAND</small></span>';
  crest.addEventListener('click',()=>go('overview'));
  topbar.prepend(crest);
  const rail=document.createElement('nav');
  rail.className='cb-subnav';rail.id='cbContextNav';rail.setAttribute('aria-label','Section destinations');
  rail.innerHTML='<span class="cb-subnav__label"></span><div class="cb-subnav__links"></div>';
  topbar.after(rail);
  const hero=document.createElement('section');
  hero.className='cb-guild-hall';hero.setAttribute('aria-label','Guild Hall');
  hero.innerHTML=
    '<div class="cb-guild-hall__art" role="img" aria-label="Painted fantasy guild gathering scene"></div>'+
    '<div class="cb-guild-hall__copy"><span class="cb-guild-hall__eyebrow">GUILD COMMAND</span>'+
      '<h2>The Guild Hall</h2><p id="cbHallGreeting">Check your party, sort their equipment or choose the next expedition.</p>'+
      '<div class="cb-guild-hall__actions"><button type="button" data-cb-go="content">VENTURE OUT →</button><button type="button" data-cb-go="party">ASSEMBLE PARTY</button></div></div>'+
    '<div class="cb-hall-quick" aria-label="Guild Hall destinations">'+
      '<button type="button" data-cb-go="quests"><span>⌁</span><b>Quest Journal</b><em>→</em></button>'+
      '<button type="button" data-cb-go="professions"><span>⚒</span><b>Workshop</b><em>→</em></button>'+
      '<button type="button" data-cb-go="trading"><span>⇄</span><b>Trading Post</b><em>→</em></button></div>';
  overview.prepend(hero);
  const dock=document.createElement('nav');
  dock.className='cb-dock';dock.id='cbImmersiveDock';dock.setAttribute('aria-label','Game destinations');
  dock.innerHTML=PRIMARY.map(item=>'<button type="button" data-cb-go="'+item[0]+'" data-cb-dock="'+item[0]+'" aria-label="'+item[2]+'"><span class="cb-dock__icon" aria-hidden="true">'+item[1]+'</span><span class="cb-dock__label">'+item[2]+'</span></button>').join('')+
    '<button type="button" id="cbMoreToggle" aria-controls="cbMorePanel" aria-expanded="false" aria-label="More destinations"><span class="cb-dock__icon" aria-hidden="true">☷</span><span class="cb-dock__label">More</span></button>';
  document.body.append(dock);
  const more=document.createElement('div');
  more.id='cbMorePanel';more.className='cb-more';more.hidden=true;
  more.innerHTML='<button type="button" class="cb-more__shade" data-cb-close aria-label="Close destinations"></button>'+
    '<section class="cb-more__panel" role="dialog" aria-modal="true" aria-label="All destinations">'+
      '<header class="cb-more__head"><div><small>CELLBOUND</small><h2>Other destinations</h2></div><button type="button" data-cb-close aria-label="Close menu">✕</button></header>'+
      '<div id="cbMoreGroups"></div><button type="button" class="cb-more__signout" data-cb-signout>Sign out</button></section>';
  document.body.append(more);
  const moreToggle=$('#cbMoreToggle');
  function isAvailable(view){const button=original(view);return !!button&&!button.hidden&&!button.classList.contains('locked')}
  function go(view){
    if(!isAvailable(view))return;
    if(window.CellboundGame&&typeof window.CellboundGame.switchView==='function')window.CellboundGame.switchView(view);
    else original(view).click();
    closePanel(false);
    sync(view);
    if(window.scrollY>160)window.scrollTo({top:0,behavior:'instant'});
  }
  function buttons(routes){
    return routes.filter(item=>isAvailable(item[0])).map(item=>{
      const icon=original(item[0])?.querySelector('span')?.textContent||'◇';
      return '<button type="button" data-cb-go="'+item[0]+'"><span aria-hidden="true">'+icon+'</span>'+item[1]+'</button>';
    }).join('');
  }
  function drawMore(){
    const groups=[
      ['Guild',GROUPS.guild.routes],
      ['Adventure',GROUPS.adventure.routes],
      ['Market & Competition',[['trading','Trading Post'],['pvp','PvP Arena']]],
      ['Community & Support',[['chat','Chat & Guilds'],['highscores','High Scores'],['support','Beta Support']]],
      ['Developer',[['admin','Admin & Design Booth']]]
    ];
    $('#cbMoreGroups').innerHTML=groups.map(group=>{
      const content=buttons(group[1]);
      return content?'<section class="cb-more__group"><h3>'+group[0]+'</h3><div class="cb-more__links">'+content+'</div></section>':'';
    }).join('');
  }
  function openPanel(){
    if(panelOpen)return;
    lastFocus=document.activeElement;
    drawMore();panelOpen=true;more.hidden=false;
    document.body.classList.add('cb-menu-open');
    moreToggle.setAttribute('aria-expanded','true');
    more.querySelector('[data-cb-close]')?.focus();
  }
  function closePanel(refocus){
    if(!panelOpen)return;
    panelOpen=false;more.hidden=true;document.body.classList.remove('cb-menu-open');
    moreToggle.setAttribute('aria-expanded','false');
    if(refocus)(lastFocus&&document.contains(lastFocus)?lastFocus:moreToggle).focus();
  }
  function activeView(){return $('.main>.view.active')?.id||$('.view.active')?.id||'overview'}
  function sync(given){
    const view=given||activeView(),hub=HUB_OF[view]||'overview';
    dock.querySelectorAll('[data-cb-dock]').forEach(button=>{
      const key=button.dataset.cbDock;
      const buttonHub=HUB_OF[key]||'overview';
      const selected=key==='professions'?view==='professions':key==='party'?hub==='guild'&&view!=='professions':key==='quests'?hub==='adventure':buttonHub===hub;
      button.classList.toggle('is-active',selected);
      if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    const special=!['overview','guild','adventure','pvp','social'].includes(hub);
    moreToggle.classList.toggle('is-active',special);
    const group=GROUPS[hub];
    rail.hidden=!group||group.routes.filter(item=>isAvailable(item[0])).length<2;
    if(group){
      rail.querySelector('.cb-subnav__label').textContent=group.label;
      const links=rail.querySelector('.cb-subnav__links');
      links.replaceChildren();
      for(const [id,title] of group.routes){
        if(!isAvailable(id))continue;
        const button=document.createElement('button');button.type='button';button.dataset.cbGo=id;button.textContent=title;
        if(id===view)button.setAttribute('aria-current','page');
        links.appendChild(button);
      }
    }
    const account=window.CellboundGame?.getAccount?.();
    const state=window.CellboundGame?.getState?.();
    const guildName=clean(account?.guild_name||state?.socialDisplayName).trim();
    const greeting=$('#cbHallGreeting');
    if(greeting&&guildName)greeting.textContent=''+guildName+' · Check your party, equipment and available expeditions.';
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-cb-go]');
    if(target){event.preventDefault();go(target.dataset.cbGo);return}
    if(event.target.closest('[data-cb-close]')){closePanel(true);return}
    if(event.target.closest('[data-cb-signout]')){closePanel(false);$('#signOut')?.click()}
  });
  moreToggle.addEventListener('click',()=>panelOpen?closePanel(true):openPanel());
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&panelOpen){event.preventDefault();closePanel(true);return}
    if(event.key==='Tab'&&panelOpen){
      const focusable=Array.from(more.querySelectorAll('button:not([disabled]):not([hidden])')).filter(el=>el.offsetParent!==null);
      if(!focusable.length)return;
      if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable[focusable.length-1].focus()}
      else if(!event.shiftKey&&document.activeElement===focusable[focusable.length-1]){event.preventDefault();focusable[0].focus()}
    }
  });
  window.addEventListener('cellbound:view-changed',event=>{closePanel(false);sync(event.detail?.view)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
  sync();
  if(!window.CellboundGame?.ready){
    let tries=0;const poll=setInterval(()=>{sync();if(window.CellboundGame?.ready||++tries>=30)clearInterval(poll)},1000);
  }
})();