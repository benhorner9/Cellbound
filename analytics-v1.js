(()=>{
'use strict';

const pending=[],sentKeys=new Set();
let Game=null,db=null,user=null,ready=false,lastView='';
const SESSION_KEY='cellbound-analytics-session-v1';

function channel(){
  const host=String(location.hostname||'').toLowerCase();
  if(/^(?:www\.)?playcellbound\.com$/.test(host))return'production';
  if(host==='cb.athleticsmanagergame.com')return'staging';
  if(host==='localhost'||host==='127.0.0.1')return'local';
  return'unknown';
}
function sessionId(){
  let id=sessionStorage.getItem(SESSION_KEY);
  if(!id){id=(globalThis.crypto?.randomUUID?.()||('s-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)));sessionStorage.setItem(SESSION_KEY,id)}
  return id
}
function activeView(){return document.querySelector('.view.active')?.id||'unknown'}
function cleanProperties(input){
  try{
    const raw=JSON.parse(JSON.stringify(input||{}));
    const out={};
    Object.entries(raw).slice(0,40).forEach(([k,v])=>{
      if(typeof v==='string')out[k]=v.slice(0,240);
      else if(typeof v==='number')out[k]=Number.isFinite(v)?v:0;
      else if(typeof v==='boolean'||v===null)out[k]=v;
      else if(Array.isArray(v))out[k]=v.slice(0,20).map(x=>typeof x==='string'?x.slice(0,120):x);
      else if(v&&typeof v==='object')out[k]=v;
    });
    return out
  }catch{return{}}
}
async function send(payload){
  if(!ready||!db||!user){pending.push(payload);return null}
  if(payload.event_key&&sentKeys.has(payload.event_key))return null;
  const row={
    event_name:payload.event_name,
    event_key:payload.event_key||null,
    session_id:sessionId(),
    channel:channel(),
    build_id:String(window.CELLBOUND_BUILD||'development').slice(0,80),
    build_number:Number(window.CELLBOUND_BUILD_NUMBER||0)||0,
    page_view:String(payload.page_view||activeView()).slice(0,80),
    properties:cleanProperties(payload.properties)
  };
  if(row.event_key)sentKeys.add(row.event_key);
  const {data,error}=await db.rpc('cellbound_record_analytics_event',{
    p_event_name:row.event_name,
    p_event_key:row.event_key,
    p_session_id:row.session_id,
    p_channel:row.channel,
    p_build_id:row.build_id,
    p_build_number:row.build_number,
    p_page_view:row.page_view,
    p_properties:row.properties
  });
  if(error){
    if(row.event_key)sentKeys.delete(row.event_key);
    console.warn('Cellbound analytics event skipped',row.event_name,error);
    return null
  }
  return data===false?null:row
}
function track(eventName,properties={},options={}){
  const name=String(eventName||'').trim().toLowerCase();
  if(!/^[a-z0-9_]{3,64}$/.test(name))return Promise.resolve(null);
  const payload={event_name:name,event_key:options.key?String(options.key).slice(0,160):null,page_view:options.pageView||null,properties};
  return send(payload)
}
function characterCreated(c,source='game'){
  if(!c?.id)return Promise.resolve(null);
  return track('character_created',{
    character_id:c.id,class:c.class||'Unknown',race:c.race||'Unknown',spec:c.spec||'',role:c.role||'',source
  },{key:'character_created:'+c.id})
}
function levelReached(c,level,source='progression'){
  if(!c?.id)return Promise.resolve(null);
  return track('level_reached',{character_id:c.id,class:c.class||'Unknown',race:c.race||'Unknown',level:Number(level)||1,source},{key:'level_reached:'+c.id+':'+level})
}
async function flush(){
  if(!ready||!pending.length)return;
  const batch=pending.splice(0,pending.length);
  for(const event of batch)await send(event)
}
function observeCurrentRoster(){
  const roster=Game?.getState?.()?.roster||[];
  roster.forEach(c=>characterCreated(c,'existing_at_tracking_start'));
}
function trackView(view){
  const id=String(view||activeView()||'unknown');
  if(!id||id===lastView)return;lastView=id;
  track('view_opened',{view:id},{pageView:id})
}
async function init(){
  Game=window.CellboundGame;
  if(!Game?.ready){setTimeout(init,120);return}
  db=Game.getSupabase?.();user=Game.getUser?.();
  if(!db||!user){setTimeout(init,250);return}
  ready=true;
  await flush();
  track('app_open',{entry_view:activeView()},{key:'app_open:'+sessionId()});
  observeCurrentRoster();
  trackView(activeView());
  window.addEventListener('cellbound:view-changed',e=>trackView(e.detail?.view));
}
window.CellboundAnalytics={track,characterCreated,levelReached,channel,sessionId,isReady:()=>ready};
init();
})();