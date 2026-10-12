/* Cellbound top navigation: presentation only. Existing routes remain owned by guild-v4.js. */
(function () {
  'use strict';
  const shell = document.querySelector('.app-shell');
  const oldDock = document.querySelector('#cbImmersiveDock');
  const oldMore = document.querySelector('#cbMoreToggle');
  const originalNav = document.querySelector('.sidebar .primary-nav');
  if (!shell || !oldDock || !oldMore || !originalNav || document.querySelector('#cbGlobalNavigation')) return;

  // Each entry points at an existing route; no new gameplay pages are invented.
  const destinations = [
    ['overview', '⌂', 'Guild Hall'],
    ['roster', '♟', 'Roster'],
    ['content', '▱', 'Dungeons'],
    ['quests', '⌁', 'Quests'],
    ['pvp', '⚔', 'PvP'],
    ['professions', '⚒', 'Professions'],
    ['chat', '◌', 'Social'],
    ['admin', '⚙', 'Design Booth'],
    ['trading', '⇄', 'Trading Post']
  ];
  const original = id => originalNav.querySelector('.nav-btn[data-view="' + id + '"]');
  const available = id => {
    const element = original(id);
    return !!element && !element.hidden && !element.classList.contains('locked') && !element.disabled;
  };

  const header = document.createElement('header');
  header.id = 'cbGlobalNavigation';
  header.className = 'cb-global-header';
  header.setAttribute('aria-label', 'Cellbound game navigation');
  header.innerHTML =
    '<button type="button" class="cb-global-brand" data-cb-go="overview" aria-label="Cellbound Guild Hall">' +
      '<span class="cb-global-brand-mark" aria-hidden="true">◇</span>' +
      '<span class="cb-global-brand-title">CELLBOUND</span></button>' +
    '<nav class="cb-global-links" aria-label="Main destinations"></nav>' +
    '<div class="cb-global-tools">' +
      '<span class="cb-global-gold" aria-label="Guild gold"><span aria-hidden="true">◉</span><b id="cbTopGold">—</b></span>' +
      '<button type="button" id="cbTopMore" class="cb-global-more" aria-controls="cbMorePanel" aria-expanded="false">☷ <span>More</span></button>' +
      '<details class="cb-global-account"><summary aria-label="Account and guild resources"><span aria-hidden="true">♜</span><b>Guild</b><i aria-hidden="true">⌄</i></summary>' +
        '<div class="cb-global-account-panel"><div class="cb-global-account-heading"><b>Guild resources</b><small>Current account</small></div>' +
          '<div class="cb-global-resource-slot"></div>' +
          '<button type="button" class="cb-global-signout" data-cb-signout>Sign out</button>' +
        '</div></details>' +
    '</div>';
  const links = header.querySelector('.cb-global-links');
  destinations.forEach(([id, icon, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.cbGo = id;
    button.dataset.cbNav = id;
    button.setAttribute('aria-label', label);
    const glyph = document.createElement('span');
    glyph.className = 'cb-global-link-icon';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = icon;
    const text = document.createElement('span');
    text.className = 'cb-global-link-label';
    text.textContent = label;
    button.append(glyph, text);
    links.append(button);
  });
  // Reuse the working resource IDs, so guild-v4.js keeps updating real numbers.
  const resourceStrip = document.querySelector('.main > .topbar > .resource-strip');
  if (resourceStrip) header.querySelector('.cb-global-resource-slot').append(resourceStrip);
  shell.insertBefore(header, shell.querySelector('.main'));
  document.body.classList.add('cb-top-nav-enabled');

  const goldSource = document.querySelector('#gold');
  const topGold = document.querySelector('#cbTopGold');
  const moreButton = document.querySelector('#cbTopMore');
  const account = header.querySelector('.cb-global-account');
  const syncGold = () => { if (goldSource) topGold.textContent = goldSource.textContent || '—'; };
  if (goldSource) {
    new MutationObserver(syncGold).observe(goldSource, { childList: true, characterData: true, subtree: true });
    syncGold();
  }
  const groupViews = {
    roster: ['roster', 'party', 'bank'],
    content: ['content', 'world', 'raids', 'endgame'],
    chat: ['chat', 'highscores']
  };
  function sync() {
    const activeView = document.querySelector('.main > .view.active')?.id || 'overview';
    links.querySelectorAll('[data-cb-nav]').forEach(button => {
      const id = button.dataset.cbNav;
      button.hidden = !available(id);
      const selected = (groupViews[id] || [id]).includes(activeView);
      button.classList.toggle('is-active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const hall = header.querySelector('.cb-global-brand');
    hall.classList.toggle('is-active', activeView === 'overview');
    const moreActive = ['world', 'raids', 'endgame', 'party', 'bank', 'highscores', 'support'].includes(activeView);
    moreButton.classList.toggle('is-active', moreActive || oldMore.getAttribute('aria-expanded') === 'true');
    moreButton.setAttribute('aria-expanded', oldMore.getAttribute('aria-expanded') || 'false');
  }
  moreButton.addEventListener('click', () => { account.open = false; oldMore.click(); sync(); });
  new MutationObserver(sync).observe(oldMore, { attributes: true, attributeFilter: ['aria-expanded'] });
  const admin = original('admin');
  if (admin) new MutationObserver(sync).observe(admin, { attributes: true, attributeFilter: ['hidden', 'class', 'disabled'] });
  const pvp = original('pvp');
  if (pvp) new MutationObserver(sync).observe(pvp, { attributes: true, attributeFilter: ['hidden', 'class', 'disabled'] });

  document.addEventListener('click', event => {
    if (account.open && !account.contains(event.target)) account.open = false;
    if (event.target.closest('#cbGlobalNavigation [data-cb-go]')) account.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && account.open) {
      account.open = false;
      account.querySelector('summary').focus();
    }
  });
  window.addEventListener('cellbound:view-changed', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  sync();
  // Account access can arrive after authentication finishes.
  if (!window.CellboundGame?.ready) {
    let attempts = 0;
    const watch = setInterval(() => {
      sync();
      if (window.CellboundGame?.ready || ++attempts >= 30) clearInterval(watch);
    }, 1000);
  }
})();

/* Cellbound Guild Hall Vision v2: real-data illustrated dashboard, shared routes retained. */
(function(){
  'use strict';
  const root=document.querySelector('#overview .home-command');
  const grid=root?.querySelector('.home-command-grid');
  const mission=document.querySelector('#overviewNextDungeon');
  const readiness=root?.querySelector('.home-readiness-panel');
  const objective=root?.querySelector('.home-objective-panel');
  const progress=root?.querySelector('#overviewProgress');
  if(!root||!grid||!mission||!readiness||!objective||!progress||document.querySelector('#cbHubHero'))return;
  document.body.classList.add('cb-hub-v2');
  const route=id=>document.querySelector('.sidebar .nav-btn[data-view="'+id+'"]');
  const isAllowed=id=>{const b=route(id);return !!b&&!b.hidden&&!b.classList.contains('locked')&&!b.disabled};

  const hero=document.createElement('section');
  hero.className='cb-hub-hero';hero.id='cbHubHero';
  hero.setAttribute('aria-label','Zeltira Guild Hall');
  hero.innerHTML=
    '<div class="cb-hub-hero-copy"><span class="cb-hub-eyebrow">WELCOME TO</span>'+
      '<h2>ZELTIRA</h2><p>Your guild starts here. Ready your five, follow the story and set out when the party is prepared.</p>'+
      '<div class="cb-hub-hero-actions"><button type="button" data-cb-go="content">Explore Dungeons <span aria-hidden="true">→</span></button>'+
      '<button type="button" data-cb-go="quests">View Quest Journal</button></div></div>'+
    '<aside class="cb-hub-watch" aria-label="Your guild at a glance"><div class="cb-hub-watch-head"><strong>Today in Cellbound</strong><small>Guild status</small></div>'+
      '<button type="button" class="cb-hub-watch-row" data-cb-go="content"><span class="cb-hub-watch-art mission" aria-hidden="true">⚔</span><div><span>Next expedition</span><b id="cbHubNextMission">Checking campaign…</b><small>Choose your next fight</small></div></button>'+
      '<button type="button" class="cb-hub-watch-row" data-cb-go="quests"><span class="cb-hub-watch-art quest" aria-hidden="true">⌁</span><div><span>Quest journal</span><b id="cbHubQuest">Checking your journal…</b><small>Pick up the story</small></div></button>'+
      '<button type="button" class="cb-hub-watch-row" data-cb-go="world"><span class="cb-hub-watch-art event" aria-hidden="true">✦</span><div><span>The Twelve Below</span><b id="cbHubEvent">Checking your entries…</b><small>Activity progress</small></div></button>'+
    '</aside>';
  root.prepend(hero);

  // Move EXISTING live panels; their IDs and gameplay handlers remain untouched.
  grid.appendChild(objective);
  const actions=document.createElement('article');
  actions.className='panel cb-hub-actions';
  actions.innerHTML=
    '<div class="panel-head"><div><small>DESTINATIONS</small><h3>Quick Actions</h3></div></div>'+
    '<div class="cb-hub-action-grid">'+[
      ['content','▱','Dungeons'],['quests','⌁','Quests'],['party','♟','Manage Party'],
      ['professions','⚒','Professions'],['trading','⇄','Trading Post'],['roster','◆','Roster']
    ].map(item=>'<button type="button" data-cb-go="'+item[0]+'"><span aria-hidden="true">'+item[1]+'</span>'+item[2]+'</button>').join('')+'</div>';
  grid.appendChild(actions);

  const featured=document.createElement('section');
  featured.className='cb-hub-featured';featured.setAttribute('aria-label','Featured dungeons');
  featured.innerHTML=
    '<div class="cb-hub-heading"><div><h3>Featured Dungeons</h3><p>Choose a route through Episode One.</p></div><button type="button" data-cb-go="content">View all dungeons →</button></div>'+
    '<div class="cb-hub-dungeon-grid">'+[
      ['ashen-vault','The Ashen Vault','Furnace halls'],
      ['hollow-sanctum','The Hollow Sanctum','Beneath Zeltira'],
      ['chaos-canyon','Chaos Canyon','The living canyon'],
      ['fractured-ages','The Fractured Ages','Across the eras']
    ].map(item=>'<button type="button" class="cb-hub-dungeon" data-dungeon="'+item[0]+'" aria-label="Open '+item[1]+'"><span class="cb-hub-dungeon-status">CHECKING</span><span class="cb-hub-dungeon-content"><b>'+item[1]+'</b><small>'+item[2]+' →</small></span></button>').join('')+'</div>';
  root.insertBefore(featured,mission);
  const missionRow=document.createElement('div');missionRow.className='cb-hub-mission-row';
  root.insertBefore(missionRow,mission);
  missionRow.append(mission,readiness);
  // Keep the visual story in order: hero, party, featured fights, expedition.
  root.insertBefore(grid,featured);

  // The campaign and destination panels remain in place below the featured adventures.
  const missionTitle=document.querySelector('#cbHubNextMission');
  const questTitle=document.querySelector('#cbHubQuest');
  const eventTitle=document.querySelector('#cbHubEvent');
  const sourceQuest=document.querySelector('#questHomeObjective');
  const sourceEvent=document.querySelector('#homeEventStatus');
  function updateGlance(){
    missionTitle.textContent=mission.querySelector('.home-continue-copy h2')?.textContent?.trim()||'Choose your next expedition';
    questTitle.textContent=sourceQuest?.querySelector('b')?.textContent?.trim()||'Open your quest journal';
    eventTitle.textContent=sourceEvent?.textContent?.trim()||'View activities';
    hero.querySelector('[data-cb-go="world"]').disabled=!isAllowed('world');
  }
  function updateDungeons(){
    featured.querySelectorAll('.cb-hub-dungeon').forEach(button=>{
      const stage=progress.querySelector('[data-home-stage="'+button.dataset.dungeon+'"]');
      const status=button.querySelector('.cb-hub-dungeon-status');
      const enabled=!!stage&&!stage.disabled&&isAllowed('content');
      button.disabled=!enabled;
      status.textContent=stage?.querySelector('em')?.textContent?.trim()||(enabled?'OPEN':'LOCKED');
    });
  }
  featured.addEventListener('click',event=>{
    const tile=event.target.closest('.cb-hub-dungeon');
    if(!tile||tile.disabled)return;
    event.preventDefault();
    const nav=route('content');
    if(!nav||!isAllowed('content'))return;
    nav.click();
    // The official browser still owns all dungeon entry, difficulty and unlock checks.
    const dungeonId=tile.dataset.dungeon;
    setTimeout(()=>window.CellboundDungeonBrowser?.open?.(dungeonId),40);
    if(window.scrollY>160)window.scrollTo({top:0,behavior:'instant'});
  });
  const watch=new MutationObserver(updateGlance);
  for(const source of [mission,sourceQuest,sourceEvent])if(source)watch.observe(source,{childList:true,subtree:true,characterData:true});
  new MutationObserver(updateDungeons).observe(progress,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled']});
  updateGlance();updateDungeons();
})();
