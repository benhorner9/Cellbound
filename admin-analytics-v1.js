(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,bound=false,loading=false,lastData=null;

function adminReady(){return Boolean(window.CellboundAdmin?.isAdmin&&db)}
function currentChannel(){
  const selected=$('#adminAnalyticsChannel')?.value;
  if(selected)return selected;
  return window.CellboundAnalytics?.channel?.()||(/playcellbound\.com$/i.test(location.hostname)?'production':'staging')
}
function number(v){return Math.max(0,Number(v)||0)}
function pct(v){return number(v).toFixed(1).replace('.0','')+'%'}
function empty(text){return '<div class="admin-analytics-empty">'+esc(text)+'</div>'}
function bars(rows,key='count',label='name',suffix=''){
  const list=Array.isArray(rows)?rows:[];if(!list.length)return empty('No tracked data in this period yet.');
  const max=Math.max(1,...list.map(x=>number(x[key])));
  return '<div class="admin-analytics-bars">'+list.map((row,i)=>{
    const value=number(row[key]),width=Math.max(2,value/max*100);
    return '<div class="admin-analytics-bar"><span><b>'+esc(row[label]||'Unknown')+'</b><em>#'+(i+1)+'</em></span><i><u style="width:'+width.toFixed(2)+'%"></u></i><strong>'+value.toLocaleString()+esc(suffix)+'</strong></div>'
  }).join('')+'</div>'
}
function kpis(o){
  const cards=[
    ['ACTIVE TESTERS',o.active_testers],
    ['SESSIONS',o.sessions],
    ['CHARACTERS TRACKED',o.characters_tracked],
    ['QUEST CLEARS',o.quests_completed],
    ['CRAFTS',o.crafts_completed],
    ['GEAR EQUIPS',o.items_equipped],
    ['ITEMS DISMANTLED',o.items_dismantled],
    ['EVENTS RECORDED',o.events]
  ];
  return cards.map(([label,value])=>'<article><small>'+label+'</small><b>'+number(value).toLocaleString()+'</b></article>').join('')
}
function dungeonTable(rows){
  const list=Array.isArray(rows)?rows:[];if(!list.length)return empty('No dungeon starts have been tracked in this period yet.');
  return '<div class="admin-analytics-table"><header><span>DUNGEON</span><span>STARTS</span><span>CLEARS</span><span>CLEAR RATE</span><span>PLAYERS</span></header>'+list.map(x=>'<div><span><b>'+esc(x.name||x.id||'Unknown')+'</b><small>'+esc(x.id||'')+'</small></span><span>'+number(x.starts)+'</span><span>'+number(x.completions)+'</span><span>'+pct(x.completion_rate)+'</span><span>'+number(x.unique_players)+'</span></div>').join('')+'</div>'
}
function compactRows(rows,config){
  const list=Array.isArray(rows)?rows:[];if(!list.length)return empty(config.empty||'No tracked data yet.');
  return '<div class="admin-analytics-list">'+list.map((x,i)=>'<div><span><em>'+String(i+1).padStart(2,'0')+'</em><b>'+esc(config.title(x))+'</b><small>'+esc(config.sub(x))+'</small></span><strong>'+esc(config.value(x))+'</strong></div>').join('')+'</div>'
}
function daily(rows){
  const list=Array.isArray(rows)?rows:[];if(!list.length)return empty('Daily activity begins once testers open this build.');
  const max=Math.max(1,...list.map(x=>number(x.players)));
  return '<div class="admin-daily-chart">'+list.map(x=>'<div title="'+esc(x.date)+' · '+number(x.players)+' players · '+number(x.sessions)+' sessions"><i style="height:'+Math.max(4,number(x.players)/max*100).toFixed(1)+'%"></i><span>'+esc(String(x.date||'').slice(5))+'</span></div>').join('')+'</div>'
}
function render(data){
  lastData=data||{};
  const o=data?.overview||{};
  const k=$('#adminAnalyticsKpis');if(k)k.innerHTML=kpis(o);
  const classes=$('#adminAnalyticsClasses');if(classes)classes.innerHTML=bars(data?.classes?.slice?.(0,10)||[]);
  const races=$('#adminAnalyticsRaces');if(races)races.innerHTML=bars(data?.races?.slice?.(0,10)||[]);
  const dungeons=$('#adminAnalyticsDungeons');if(dungeons)dungeons.innerHTML=dungeonTable(data?.dungeons);
  const combos=$('#adminAnalyticsCombos');if(combos)combos.innerHTML=compactRows(data?.class_race,{title:x=>(x.race||'Unknown')+' '+(x.class||'Unknown'),sub:()=> 'CHARACTERS CREATED',value:x=>number(x.count).toLocaleString(),empty:'No class/race combinations tracked yet.'});
  const quests=$('#adminAnalyticsQuests');if(quests)quests.innerHTML=compactRows(data?.quests,{title:x=>x.name||x.id||'Unknown quest',sub:x=>number(x.unique_players)+' player'+(number(x.unique_players)===1?'':'s'),value:x=>number(x.completions)+' clears',empty:'No quest completions tracked yet.'});
  const features=$('#adminAnalyticsFeatures');if(features)features.innerHTML=compactRows(data?.features?.slice?.(0,12)||[],{title:x=>String(x.name||'unknown').replace(/-/g,' '),sub:x=>number(x.unique_players)+' player'+(number(x.unique_players)===1?'':'s'),value:x=>number(x.opens)+' opens',empty:'Feature usage will appear after testers navigate the build.'});
  const levels=$('#adminAnalyticsLevels');if(levels)levels.innerHTML=compactRows(data?.levels,{title:x=>'Level '+number(x.level),sub:x=>number(x.players)+' player'+(number(x.players)===1?'':'s'),value:x=>number(x.characters)+' characters',empty:'No level milestones tracked yet.'});
  const professions=$('#adminAnalyticsProfessions');if(professions)professions.innerHTML=compactRows(data?.professions,{title:x=>x.name||'Unknown',sub:x=>number(x.learned)+' learned',value:x=>number(x.crafts)+' crafts',empty:'No profession activity tracked yet.'});
  const activity=$('#adminAnalyticsDaily');if(activity)activity.innerHTML=daily(data?.daily_activity);
  const channel=$('#adminAnalyticsCurrent');if(channel)channel.textContent=String(data?.channel||currentChannel()).toUpperCase()+' · '+number(data?.days)+' DAYS';
  const since=$('#adminAnalyticsSince');if(since)since.textContent=data?.since?'SINCE '+new Date(data.since).toLocaleDateString():'TRACKING STARTED WITH THIS BUILD'
}
async function refresh(){
  if(!adminReady()||loading)return;loading=true;
  const btn=$('#adminAnalyticsRefresh');if(btn){btn.disabled=true;btn.textContent='LOADING…'}
  const root=$('#adminAnalyticsKpis');if(root)root.innerHTML='<article><small>ANALYTICS</small><b>…</b></article>';
  try{
    const days=Math.max(1,Number($('#adminAnalyticsDays')?.value)||30),channel=currentChannel();
    const {data,error}=await db.rpc('cellbound_admin_analytics_summary',{p_days:days,p_channel:channel});
    if(error)throw error;render(data||{})
  }catch(error){
    console.warn('Admin analytics unavailable',error);
    const msg=$('#adminAnalyticsError');if(msg){msg.hidden=false;msg.textContent=error?.message||'Could not load beta analytics.'}
  }finally{
    loading=false;if(btn){btn.disabled=false;btn.textContent='REFRESH ANALYTICS'}
  }
}
function bind(){
  if(bound)return;bound=true;
  $('#adminAnalyticsRefresh')?.addEventListener('click',refresh);
  $('#adminAnalyticsDays')?.addEventListener('change',refresh);
  $('#adminAnalyticsChannel')?.addEventListener('change',refresh);
  window.addEventListener('cellbound:admin-status',e=>{if(e.detail?.isAdmin)refresh()});
  window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin'&&adminReady())refresh()})
}
async function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,120);return}
  db=Game.getSupabase?.();if(!db){setTimeout(init,250);return}
  bind();
  const channel=$('#adminAnalyticsChannel');if(channel)channel.value=window.CellboundAnalytics?.channel?.()==='production'?'production':'staging';
  if(adminReady())refresh();
  window.CellboundAdminAnalytics={refresh,getData:()=>lastData}
}
init();
})();