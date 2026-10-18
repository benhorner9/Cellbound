/* Cellbound UI Block 2: Guild Hall. Reuse live widgets, not fake data. */
(function () {
  'use strict';
  const home = document.querySelector('#overview .home-command');
  const hero = home?.querySelector('#cbHubHero');
  const grid = home?.querySelector('.home-command-grid');
  const party = home?.querySelector('.home-party-panel');
  const mission = home?.querySelector('#overviewNextDungeon');
  const objective = home?.querySelector('.home-objective-panel');
  const readiness = home?.querySelector('.home-readiness-panel');
  const actions = home?.querySelector('.cb-hub-actions');
  const featured = home?.querySelector('.cb-hub-featured');
  const progress = home?.querySelector('.home-progression-panel');
  if (!hero || !grid || !party || !mission || !objective || !readiness ||
      !actions || !featured || !progress || document.querySelector('#cbGuildHallStage')) return;
  document.body.classList.add('cb-guildhall-v2');

  // The existing hero still contains the noticeboard buttons watched by
  // top-navigation-v1.js, so update them in place rather than replacing it.
  const eyebrow = hero.querySelector('.cb-hub-eyebrow');
  const nameHeading = hero.querySelector('.cb-hub-hero-copy h2');
  const description = hero.querySelector('.cb-hub-hero-copy p');
  if (eyebrow) eyebrow.textContent = 'THE GUILD HALL';
  if (nameHeading) nameHeading.textContent = 'Your Guild';
  if (description) description.textContent =
    'Your adventurers are gathered. Check the party, settle your business and decide where to send them next.';
  const expeditionButton = hero.querySelector('.cb-hub-hero-actions [data-cb-go="content"]');
  if (expeditionButton) expeditionButton.textContent = 'Choose an expedition →';
  const partyButton = hero.querySelector('.cb-hub-hero-actions [data-cb-go="quests"]');
  if (partyButton) {
    partyButton.dataset.cbGo = 'party';
    partyButton.textContent = 'Manage your party';
  }
  const watchTitle = hero.querySelector('.cb-hub-watch-head strong');
  const watchSubtitle = hero.querySelector('.cb-hub-watch-head small');
  if (watchTitle) watchTitle.textContent = 'On the noticeboard';
  if (watchSubtitle) watchSubtitle.textContent = 'Your current progress';

  // Reparent the ACTUAL gameplay widgets. Their child IDs, observers and
  // button handlers survive; the quest and dungeon engines are unchanged.
  const stage = document.createElement('section');
  stage.id = 'cbGuildHallStage';
  stage.className = 'cb-guild-hall-stage';
  stage.setAttribute('aria-label','Your active party and next expedition');
  home.insertBefore(stage,grid);
  stage.append(party,mission);
  party.classList.add('cb-guildhall-party');
  mission.classList.add('cb-guildhall-expedition');
  party.querySelector('.panel-head h3')?.replaceChildren('Your Adventurers');
  grid.classList.add('cb-guildhall-noticeboard');
  grid.replaceChildren(objective,readiness,actions);

  const actionTitle = actions.querySelector('.panel-head h3');
  if (actionTitle) actionTitle.textContent = 'Around the Guild';
  const actionSubtitle = actions.querySelector('.panel-head small');
  if (actionSubtitle) actionSubtitle.textContent = 'QUICK ACCESS';
  const actionGrid = actions.querySelector('.cb-hub-action-grid');
  if (actionGrid) actionGrid.innerHTML = [
    ['quests','⌁','Quest Journal'],['professions','⚒','Workshop'],
    ['bank','▦','Bank'],['trading','⇄','Trading Post']
  ].map(([route,glyph,label]) =>
    '<button type="button" data-cb-go="'+route+'"><span aria-hidden="true">'+glyph+'</span>'+label+'</button>'
  ).join('');

  // The campaign, dungeons and live activity stay available further down.
  const featuredTitle = featured.querySelector('.cb-hub-heading h3');
  const featuredSubtitle = featured.querySelector('.cb-hub-heading p');
  if (featuredTitle) featuredTitle.textContent = 'Beyond the Guild Hall';
  if (featuredSubtitle) featuredSubtitle.textContent = 'Explore places you can reach.';
  home.insertBefore(featured, progress.nextSibling);
  const oldMissionRow = home.querySelector('.cb-hub-mission-row');
  if (oldMissionRow && !oldMissionRow.children.length) oldMissionRow.remove();

  const original = route => document.querySelector('.sidebar .nav-btn[data-view="'+route+'"]');
  function syncRoutes() {
    actionGrid?.querySelectorAll('[data-cb-go]').forEach(button => {
      const route = original(button.dataset.cbGo);
      const allowed = !!route && !route.hidden && !route.disabled &&
        !route.classList.contains('locked');
      button.hidden = !allowed;
      button.disabled = !allowed;
    });
  }
  const originalNav = document.querySelector('.sidebar .primary-nav');
  if (originalNav) new MutationObserver(syncRoutes).observe(originalNav,{
    subtree:true,attributes:true,attributeFilter:['hidden','disabled','class']
  });
  const partyCounter = document.createElement('span');
  partyCounter.className = 'cb-guildhall-party-count';
  partyCounter.setAttribute('aria-live','polite');
  party.querySelector('.panel-head')?.append(partyCounter);
  function syncIdentity() {
    const account = window.CellboundGame?.getAccount?.();
    const state = window.CellboundGame?.getState?.();
    const guildName = String(account?.guild_name || state?.guild_name || state?.guildName || '').trim();
    if (nameHeading) nameHeading.textContent = guildName || 'Your Guild';
    const count = party.querySelectorAll('#overviewRoster .home-party-member').length;
    partyCounter.textContent = count + ' / 5 assembled';
  }
  const roster = party.querySelector('#overviewRoster');
  if (roster) new MutationObserver(syncIdentity).observe(roster,{childList:true,subtree:true});
  window.addEventListener('cellbound:view-changed', () => { syncIdentity(); syncRoutes(); });
  window.addEventListener('cellbound:ready', syncIdentity);
  syncRoutes();
  syncIdentity();
})();
