/* Cellbound Game Feel v1 — Step 2
   Presentation-only interaction layer. */
(()=>{
  'use strict';

  const VIEW_META={
    overview:{eyebrow:"THE GUILDMASTER'S DESK",label:'Home'},
    roster:{eyebrow:'MUSTER HALL',label:'Roster'},
    party:{eyebrow:'WAR TABLE',label:'Active Party'},
    bank:{eyebrow:'GUILD VAULT',label:'Bank'},
    professions:{eyebrow:'WORKSHOP',label:'Professions'},
    quests:{eyebrow:'QUEST JOURNAL',label:'Quests'},
    content:{eyebrow:'EXPEDITION TABLE',label:'Dungeons'},
    world:{eyebrow:'SIDE ACTIVITIES',label:'Activities'},
    raids:{eyebrow:'RAID COMMAND',label:'Raids'},
    trading:{eyebrow:'MERCHANT EXCHANGE',label:'Trading Post'},
    pvp:{eyebrow:'THE CRUCIBLE',label:'PvP'},
    chat:{eyebrow:'GUILD NETWORK',label:'Social'},
    admin:{eyebrow:'DEVELOPER CONTROL',label:'Admin'}
  };

  function activeView(){
    return document.querySelector('.view.active')?.id||'overview';
  }

  function updateHeader(view){
    const meta=VIEW_META[view]||{eyebrow:'GUILD COMMAND',label:'Cellbound'};
    const topSmall=document.querySelector('.topbar>div:first-child>small');
    if(topSmall)topSmall.textContent=meta.eyebrow;
  }

  function decorateHomeParty(){
    document.querySelectorAll('#overview .home-party-member').forEach(member=>{
      if(member.dataset.cbDecorated)return;
      member.dataset.cbDecorated='1';
      member.tabIndex=0;
      member.setAttribute('role','button');
      member.setAttribute('aria-label','Manage active party');
      member.title='Manage active party';
    });
  }

  function goToParty(){
    const nav=document.querySelector('.nav-btn[data-view="party"]');
    nav?.click();
  }

  document.addEventListener('click',event=>{
    const member=event.target.closest?.('#overview .home-party-member');
    if(member){goToParty();return}

    const target=event.target.closest?.('.home-destination,.dungeon-browser-card');
    if(target){
      target.classList.add('cb-selected');
      setTimeout(()=>target.classList.remove('cb-selected'),260);
    }

    const button=event.target.closest?.('.app-shell button');
    if(button&&!button.closest('.cb2d-backdrop,.hs2d-backdrop,.cc2d-backdrop,.bs2d-backdrop,.fa-backdrop,.pvp-match-backdrop')){
      button.classList.add('cb-confirmed');
      setTimeout(()=>button.classList.remove('cb-confirmed'),180);
    }
  },true);

  document.addEventListener('keydown',event=>{
    const member=event.target.closest?.('#overview .home-party-member');
    if(member&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();
      goToParty();
    }
  });

  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest?.('.app-shell button');
    if(!button||button.disabled)return;
    button.classList.add('cb-pressed');
  },true);
  const clearPress=()=>{
    document.querySelectorAll('.app-shell button.cb-pressed').forEach(b=>b.classList.remove('cb-pressed'));
  };
  document.addEventListener('pointerup',clearPress,true);
  document.addEventListener('pointercancel',clearPress,true);

  window.addEventListener('cellbound:view-changed',event=>{
    const view=event.detail?.view||activeView();
    updateHeader(view);
    decorateHomeParty();
  });

  const roster=document.getElementById('overviewRoster');
  if(roster){
    new MutationObserver(decorateHomeParty).observe(roster,{childList:true,subtree:true});
  }

  const resources=document.querySelector('.resource-strip');
  if(resources){
    new MutationObserver(mutations=>{
      mutations.forEach(m=>{
        const node=(m.target.nodeType===3?m.target.parentElement:m.target);
        const value=node?.closest?.('b');
        if(!value)return;
        value.classList.remove('cb-resource-pulse');
        void value.offsetWidth;
        value.classList.add('cb-resource-pulse');
        setTimeout(()=>value.classList.remove('cb-resource-pulse'),520);
      });
    }).observe(resources,{subtree:true,characterData:true,childList:true});
  }

  document.body.removeAttribute('data-cb-view');
  const first=activeView();
  updateHeader(first);
  decorateHomeParty();
})();
