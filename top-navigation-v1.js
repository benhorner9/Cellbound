/* Cellbound top navigation: presentation only. Existing routes remain owned by guild-v4.js. */
(function () {
  'use strict';
  const shell = document.querySelector('.app-shell');
  const oldDock = document.querySelector('#cbImmersiveDock');
  const oldMore = document.querySelector('#cbMoreToggle');
  const originalNav = document.querySelector('.sidebar .primary-nav');
  if (!shell || !oldDock || !oldMore || !originalNav || document.querySelector('#cbGlobalNavigation')) return;

  // Each entry points at an existing route; no new gameplay pages are invented.
  // Six stable destinations. Existing navigation still owns every route.
  // Secondary activities, trading and developer tools remain in "More".
  const destinations = [
    ['overview', '⌂', 'Guild'],
    ['content', '⚔', 'Adventure'],
    ['roster', '♟', 'Heroes'],
    ['professions', '⚒', 'Professions'],
    ['pvp', '⚑', 'PvP'],
    ['chat', '◌', 'Social']
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
    content: ['content', 'quests', 'world', 'raids', 'endgame'],
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
    const moreActive = ['trading', 'support', 'admin'].includes(activeView);
    moreButton.classList.toggle('is-active', moreActive || oldMore.getAttribute('aria-expanded') === 'true');
    moreButton.setAttribute('aria-expanded', oldMore.getAttribute('aria-expanded') || 'false');
  }
  moreButton.addEventListener('click', () => { account.open = false; oldMore.click(); sync(); });
  new MutationObserver(sync).observe(oldMore, { attributes: true, attributeFilter: ['aria-expanded'] });
  // Permissions and beta unlocks may change after authentication.
  new MutationObserver(sync).observe(originalNav, {
    attributes: true, subtree: true, attributeFilter: ['hidden', 'class', 'disabled']
  });

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
    setTimeout(()=>{if(window.CellboundDungeonQuickEntry?.open)window.CellboundDungeonQuickEntry.open(dungeonId);else if(window.CellboundEndgame?.prepare)window.CellboundEndgame.prepare(dungeonId);else window.CellboundDungeonBrowser?.open?.(dungeonId)},40);
    if(window.scrollY>160)window.scrollTo({top:0,behavior:'instant'});
  });
  const watch=new MutationObserver(updateGlance);
  for(const source of [mission,sourceQuest,sourceEvent])if(source)watch.observe(source,{childList:true,subtree:true,characterData:true});
  new MutationObserver(updateDungeons).observe(progress,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled']});
  updateGlance();updateDungeons();
})();


/* Cellbound Premium City Hub v3 — real content, existing gameplay, no invented event timers. */
(function(){
  'use strict';
  const home=document.querySelector('#overview .home-command');
  const hero=document.querySelector('#cbHubHero');
  const mainRow=home?.querySelector('.home-command-grid');
  const featured=home?.querySelector('.cb-hub-featured');
  const missionRow=home?.querySelector('.cb-hub-mission-row');
  const party=home?.querySelector('.home-party-panel');
  const objectives=home?.querySelector('.home-objective-panel');
  const actions=home?.querySelector('.cb-hub-actions');
  if(!home||!hero||!mainRow||!featured||!missionRow||!party||!objectives||!actions||document.querySelector('#cbLatestUpdates'))return;
  document.body.classList.add('cb-premium-hub-v3');

  // Keep core party, dungeon, quest and account components. Only reorder their existing panels.
  mainRow.replaceChildren(party,objectives,actions);
  const title=hero.querySelector('.cb-hub-hero-copy');
  if(title){
    title.querySelector('.cb-hub-eyebrow').textContent='WELCOME TO THE GUILD CITY';
    title.querySelector('h2').textContent='ZELTIRA';
    title.querySelector('p').textContent='The home of your guild. Gather your party, follow the story and prepare for the next adventure.';
    title.querySelector('[data-cb-go="content"]').firstChild.textContent='Explore Dungeons ';
    title.querySelector('[data-cb-go="quests"]').textContent='View Quest Journal';
  }
  hero.querySelector('.cb-hub-watch-head small').textContent=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date());
  hero.querySelector('.cb-hub-watch-row[data-cb-go="content"]>div>span').textContent='Your next dungeon';
  hero.querySelector('.cb-hub-watch-row[data-cb-go="quests"]>div>span').textContent='Current quest';
  hero.querySelector('.cb-hub-watch-row[data-cb-go="world"]>div>span').textContent='The Twelve Below';

  // Compact, actionable objectives. The first objective is the genuine quest widget.
  const questWidget=objectives.querySelector('#questHomeObjective');
  const questButton=questWidget?.querySelector('button[data-jump="quests"]');
  if(questButton)questButton.textContent='Open Journal →';
  const objectiveExtras=document.createElement('div');
  objectiveExtras.className='cb-v3-objectives';
  objectiveExtras.innerHTML=
    '<button type="button" data-cb-go="party" class="cb-v3-objective">'+
      '<span class="cb-v3-task-icon" aria-hidden="true">♟</span><span class="cb-v3-task-content"><b>Build your active party</b><small id="cbV3PartyCount">Checking your party…</small><i class="cb-v3-progress"><i id="cbV3PartyBar"></i></i></span><span class="cb-v3-task-arrow" aria-hidden="true">›</span></button>'+
    '<button type="button" data-cb-go="content" class="cb-v3-objective">'+
      '<span class="cb-v3-task-icon" aria-hidden="true">⚔</span><span class="cb-v3-task-content"><b>Prepare your next expedition</b><small id="cbV3Readiness">Checking readiness…</small><i class="cb-v3-progress"><i id="cbV3ReadyBar"></i></i></span><span class="cb-v3-task-arrow" aria-hidden="true">›</span></button>'+
    '<button type="button" data-cb-go="content" class="cb-v3-objective">'+
      '<span class="cb-v3-task-icon" aria-hidden="true">✦</span><span class="cb-v3-task-content"><b>Episode One campaign</b><small id="cbV3Campaign">Checking progress…</small></span><span class="cb-v3-task-arrow" aria-hidden="true">›</span></button>';
  objectives.append(objectiveExtras);
  const write=(selector,value)=>{
    const el=objectives.querySelector(selector);
    if(el&&el.textContent!==value)el.textContent=value;
  };
  function syncObjectives(){
    const partyCount=document.querySelectorAll('#overviewRoster .home-party-member').length;
    write('#cbV3PartyCount',partyCount+'/5 adventurers selected');
    const partyBar=document.querySelector('#cbV3PartyBar');
    if(partyBar)partyBar.style.width=Math.min(100,partyCount*20)+'%';
    const ringText=document.querySelector('#overviewReadiness .home-readiness-ring b')?.textContent?.trim();
    const badge=document.querySelector('#homeReadinessBadge')?.textContent?.trim();
    write('#cbV3Readiness',(ringText?ringText+' ready':'Check party readiness')+(badge?' · '+badge.toLowerCase():''));
    const readyBar=document.querySelector('#cbV3ReadyBar');
    const pct=Number.parseFloat(ringText);
    if(readyBar)readyBar.style.width=(Number.isFinite(pct)?Math.max(0,Math.min(100,pct)):0)+'%';
    const stages=document.querySelectorAll('#overviewProgress .home-progress-stage');
    const cleared=document.querySelectorAll('#overviewProgress .home-progress-stage.done');
    write('#cbV3Campaign',stages.length?cleared.length+' of '+stages.length+' stages cleared':'View the dungeon journal');
  }
  const sources=['#overviewRoster','#overviewReadiness','#homeReadinessBadge','#overviewProgress'];
  const observer=new MutationObserver(syncObjectives);
  sources.forEach(selector=>{
    const element=document.querySelector(selector);
    if(element)observer.observe(element,{childList:true,subtree:true,characterData:true,attributes:false});
  });
  syncObjectives();

  // Visibility respects existing admin unlocks, not mockup-only features.
  const original=id=>document.querySelector('.sidebar .nav-btn[data-view="'+id+'"]');
  const allowed=id=>{
    const el=original(id);
    return !!el&&!el.hidden&&!el.disabled&&!el.classList.contains('locked');
  };
  const fastActions=actions.querySelector('.cb-hub-action-grid');
  if(fastActions){
    const admin=document.createElement('button');
    admin.type='button';admin.dataset.cbGo='admin';admin.className='cb-v3-admin-action';
    admin.innerHTML='<span aria-hidden="true">⚙</span>Design Booth';
    fastActions.append(admin);
    function permissions(){
      fastActions.querySelectorAll('[data-cb-go]').forEach(button=>{
        const ok=allowed(button.dataset.cbGo);
        button.hidden=!ok;
        button.disabled=!ok;
      });
    }
    const a=original('admin');
    if(a)new MutationObserver(permissions).observe(a,{attributes:true,attributeFilter:['hidden','class','disabled']});
    window.addEventListener('cellbound:view-changed',permissions);
    permissions();
  }

  const updates=document.createElement('section');
  updates.id='cbLatestUpdates';updates.className='cb-v3-updates';
  updates.setAttribute('aria-label','Cellbound news and features');
  updates.innerHTML=
    '<div class="cb-hub-heading"><div><h3>Latest News & Updates</h3><p>From the founding beta and the world of Cellbound.</p></div>'+
      '<button type="button" data-cb-go="support">Beta patch notes →</button></div>'+
    '<div class="cb-v3-update-grid">'+
      '<button class="cb-v3-update cb-v3-update-beta" data-cb-go="support" type="button"><span class="cb-v3-update-picture" aria-hidden="true"></span><span class="cb-v3-update-copy"><small id="cbV3NoteTag1">BETA NOTES</small><b id="cbV3NoteTitle1">Founding Beta</b><em id="cbV3NoteDesc1">Read the latest beta notes and improvements.</em><span class="cb-v3-news-link">Read notes →</span></span></button>'+
      '<button class="cb-v3-update cb-v3-update-professions" data-cb-go="professions" type="button"><span class="cb-v3-update-picture" aria-hidden="true"></span><span class="cb-v3-update-copy"><small>GUILD CRAFTING</small><b>Master Your Profession</b><em>Choose an artisan and prepare for tougher adventures.</em><span class="cb-v3-news-link">Visit Workshop →</span></span></button>'+
      '<button class="cb-v3-update cb-v3-update-manor" data-cb-go="raids" type="button"><span class="cb-v3-update-picture" aria-hidden="true"></span><span class="cb-v3-update-copy"><small>RAID SPOTLIGHT</small><b>The Manor</b><em>Prepare your party for the challenges that lie within.</em><span class="cb-v3-news-link">View Raid →</span></span></button>'+
    '</div>';
  home.insertBefore(updates,missionRow);
  function syncNews(){
    const notes=window.CellboundBetaOps?.patchNotes;
    if(Array.isArray(notes)&&notes.length){
      const latest=notes[0];
      const tag=document.querySelector('#cbV3NoteTag1');
      const heading=document.querySelector('#cbV3NoteTitle1');
      const description=document.querySelector('#cbV3NoteDesc1');
      if(tag)tag.textContent=[latest.label,latest.date].filter(Boolean).join(' · ');
      if(heading)heading.textContent=latest.title||'Founding Beta';
      if(description)description.textContent=Array.isArray(latest.items)?(latest.items[0]||'Read the latest beta notes.'):'Read the latest beta notes.';
      return true;
    }
    return false;
  }
  if(!syncNews()){
    let attempts=0;
    const timer=setInterval(()=>{if(syncNews()||++attempts>=30)clearInterval(timer)},500);
  }
  function syncNewsRoutes(){
    const support=allowed('support');
    updates.querySelectorAll('[data-cb-go="support"]').forEach(el=>{el.hidden=!support});
    const raid=allowed('raids');
    const tile=updates.querySelector('[data-cb-go="raids"]');
    if(tile){tile.hidden=!raid;tile.disabled=!raid}
  }
  syncNewsRoutes();
  window.addEventListener('cellbound:view-changed',syncNewsRoutes);
})();
