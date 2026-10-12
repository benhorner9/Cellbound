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