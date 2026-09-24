(()=>{
'use strict';

const VERSION='1.0.0';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let token=0,active=false,countdownTimer=null,searchTimer=null;

function root(){
  let r=document.querySelector('#pvpMatchBackdrop');
  if(!r){
    r=document.createElement('div');
    r.id='pvpMatchBackdrop';
    r.className='pvp-match-backdrop';
    r.hidden=true;
    document.body.appendChild(r);
  }
  return r;
}
function clearTimers(){
  if(countdownTimer){clearInterval(countdownTimer);countdownTimer=null}
  if(searchTimer){clearTimeout(searchTimer);searchTimer=null}
}
function close(){
  token++;clearTimers();active=false;
  window.CellboundPvPViewer?.stop?.();
  document.body.classList.remove('pvp-match-open');
  const r=root();r.hidden=true;r.innerHTML='';
}
function roleLabel(u){return String(u?.role||'dps').toUpperCase()}
function classColour(u){return window.CellboundPvPCombat?.CLASS_COLORS?.[u?.class]||'#8da09b'}
function portraitHTML(u){return window.CellboundPortraits?.portraitHTML?.(u,{size:'sm',accent:classColour(u)})||'<span class="pvp-match-portrait-fallback">'+esc(u?.portrait||u?.name?.slice(0,2)||'?')+'</span>'}
function teamRows(units,side){
  return (units||[]).map((u,i)=>
    '<div class="pvp-match-roster-row '+side+'">'+
      '<i style="--match-class:'+classColour(u)+'"></i><div class="pvp-match-portrait">'+portraitHTML(u)+'</div>'+
      '<span><b>'+esc(u.name||('Combatant '+(i+1)))+'</b><small>'+esc(u.class||'Adventurer')+' · '+esc(u.spec||roleLabel(u))+'</small></span>'+
      '<strong>'+esc(roleLabel(u))+'</strong>'+
    '</div>'
  ).join('');
}
function groupSummary(units){
  const map={tank:0,healer:0,dps:0};
  (units||[]).forEach(u=>map[String(u.role||'dps').toLowerCase()] = (map[String(u.role||'dps').toLowerCase()]||0)+1);
  return '<span>'+map.tank+' Tank</span><span>'+map.healer+' Healer</span><span>'+map.dps+' DPS</span>';
}
function searchMarkup(match){
  return '<section class="pvp-match-search">'+
    '<div class="pvp-match-search-core"><i></i><small>MATCHMAKING</small><h2>Finding an opponent…</h2>'+
    '<p>'+esc(match.kind==='arena'?(match.size+'v'+match.size+' Rated Arena'):(match.size+'v'+match.size+' '+(match.mode==='capture-the-flag'?'Capture the Flag':'King of the Hill')))+'</p>'+
    '<div class="pvp-match-search-line"><span></span></div></div>'+
  '</section>';
}
function introMarkup(match,seconds){
  const blue=match.playerUnits||[],red=match.enemyUnits||[];
  const mode=match.kind==='arena'?'RATED ARENA':match.mode==='capture-the-flag'?'CAPTURE THE FLAG':'KING OF THE HILL';
  return '<section class="pvp-match-intro">'+
    '<header><div><small>OPPONENT FOUND · '+esc(mode)+'</small><h2>'+esc(match.size+'v'+match.size)+' Match Ready</h2></div><div class="pvp-match-countdown"><span>BATTLE BEGINS IN</span><b id="pvpMatchCountdown">'+seconds+'</b></div></header>'+
    '<div class="pvp-match-versus">'+
      '<article class="pvp-match-team blue"><div class="pvp-match-team-head"><small>YOUR SIDE</small><h3>'+esc(match.playerGuild||'Your Guild')+'</h3><div>'+groupSummary(blue)+'</div></div><div class="pvp-match-roster">'+teamRows(blue,'blue')+'</div></article>'+
      '<div class="pvp-match-vs"><i></i><b>VS</b><span>'+esc(mode)+'</span></div>'+
      '<article class="pvp-match-team red"><div class="pvp-match-team-head"><small>OPPOSITION</small><h3>'+esc(match.opponentGuild||'Rival Guild')+'</h3><div>'+groupSummary(red)+'</div></div><div class="pvp-match-roster">'+teamRows(red,'red')+'</div></article>'+
    '</div>'+
    '<footer><span>Review the enemy composition before combat begins.</span><strong>REAL-TIME COMBAT · NO SPEED CONTROL</strong></footer>'+
  '</section>';
}
function resultMarkup(match){
  const win=Boolean(match.win),mode=match.kind==='arena'?'RATED ARENA':match.mode==='capture-the-flag'?'CAPTURE THE FLAG':'KING OF THE HILL';
  return '<section class="pvp-match-result '+(win?'victory':'defeat')+'">'+
    '<div class="pvp-match-result-core"><small>'+esc(mode)+' COMPLETE</small><h2>'+(win?'VICTORY':'DEFEAT')+'</h2><div class="pvp-match-final-score"><span>'+esc(match.playerGuild||'Your Guild')+'</span><b>'+esc(match.scoreText||'—')+'</b><span>'+esc(match.opponentGuild||'Rival Guild')+'</span></div>'+
    '<p>'+esc(match.summary||'The match is complete.')+'</p>'+
    '<div class="pvp-match-rewards">'+
      '<div><span>'+(match.kind==='arena'?'Arena Seals':'War Marks')+'</span><b>+'+Math.max(0,Number(match.currency)||0)+'</b></div>'+
      (match.kind==='arena'?'<div><span>Rating</span><b>'+(Number(match.ratingDelta)>0?'+':'')+(Number(match.ratingDelta)||0)+'</b></div>':'<div><span>PvP Rank XP</span><b>+'+Math.max(0,Number(match.rankXp)||0)+'</b></div>')+
      '<div><span>Cell Shock</span><b>'+(Number(match.shockDelta)>0?'+':'')+(Number(match.shockDelta)||0)+'%</b></div>'+
    '</div>'+
    '<button type="button" data-pvp-match-return>RETURN TO THE CRUCIBLE →</button></div>'+
  '</section>';
}
function showIntro(r,match,result,onResolved,myToken){
  if(myToken!==token)return;
  let seconds=10;r.innerHTML=introMarkup(match,seconds);
  const tick=()=>{
    if(myToken!==token)return;
    seconds--;
    const el=r.querySelector('#pvpMatchCountdown');if(el)el.textContent=String(Math.max(0,seconds));
    if(seconds<=0){
      clearInterval(countdownTimer);countdownTimer=null;
      showBattle(r,match,result,onResolved,myToken);
    }
  };
  countdownTimer=setInterval(tick,1000);
}
function showBattle(r,match,result,onResolved,myToken){
  if(myToken!==token)return;
  r.innerHTML='<section class="pvp-match-battle"><div id="pvpDedicatedViewer" class="pvp-match-viewer"></div></section>';
  const stage=r.querySelector('#pvpDedicatedViewer'),viewer=window.CellboundPvPViewer;
  if(!stage||!viewer?.play){
    r.innerHTML='<section class="pvp-match-error"><h2>PvP viewer unavailable</h2><button data-pvp-match-return>RETURN TO PVP</button></section>';
    r.querySelector('[data-pvp-match-return]')?.addEventListener('click',close);return;
  }
  viewer.play({stage,match,result,onComplete:()=>{
    if(myToken!==token)return;
    try{onResolved?.()}catch(error){console.error('PvP result resolution failed',error)}
    r.innerHTML=resultMarkup(match);
    r.querySelector('[data-pvp-match-return]')?.addEventListener('click',close);
  }});
}
function play({match,result,onResolved}={}){
  if(!match||!result)throw new Error('Dedicated PvP match requires match and result data.');
  close();const myToken=++token, r=root();active=true;
  document.body.classList.add('pvp-match-open');r.hidden=false;r.innerHTML=searchMarkup(match);
  const searchDelay=900+Math.round(Math.random()*700);
  searchTimer=setTimeout(()=>{searchTimer=null;showIntro(r,match,result,onResolved,myToken)},searchDelay);
}
window.CellboundPvPMatch={VERSION,play,close,isActive:()=>active};
})();