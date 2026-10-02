(()=>{
'use strict';
const VALID=new Set(['town','guild','inn','bank','craft','quests','dungeons','activities','raids','market','social','arena']);
const VIEW_ZONE={overview:'town',roster:'guild',party:'inn',bank:'bank',professions:'craft',quests:'quests',content:'dungeons',world:'activities',raids:'raids',trading:'market',chat:'social',pvp:'arena'};
let Game=null,db=null,user=null,zone='town',peers=[],timer=null,beatTimer=null,running=false,queued=false;
function safeZone(v){v=String(v||'').toLowerCase();return VALID.has(v)?v:'town'}
function emit(){window.dispatchEvent(new CustomEvent('cellbound:world-presence',{detail:{zone,peers:peers.slice(),online:peers.length}}))}
async function heartbeat(force=false){
  if(!db||!user||document.visibilityState==='hidden')return;
  if(running){queued=true;return}
  running=true;
  try{
    const {data,error}=await db.rpc('cellbound_world_presence_heartbeat',{p_zone:zone});
    if(error)throw error;
    peers=(data||[]).map(p=>({presence_key:String(p.presence_key||''),guild_name:String(p.guild_name||'Unnamed Guild'),zone:safeZone(p.zone),updated_at:p.updated_at,is_self:Boolean(p.is_self)})).filter(p=>p.presence_key);
    emit();
  }catch(err){if(force)console.warn('World presence heartbeat failed',err)}
  finally{running=false;if(queued){queued=false;clearTimeout(beatTimer);beatTimer=setTimeout(()=>heartbeat(false),250)}}
}
function setZone(next,force=false){const z=safeZone(next);if(z===zone&&!force)return zone;zone=z;clearTimeout(beatTimer);beatTimer=setTimeout(()=>heartbeat(true),120);return zone}
function activeView(){return document.querySelector('.view.active')?.id||'overview'}
function syncFromView(view){if(window.CellboundLivingWorld?.isEnabled?.()&&document.body.classList.contains('cb-lw-active'))return;setZone(VIEW_ZONE[view]||'town')}
async function leave(){if(!db||!user)return;try{await db.rpc('cellbound_world_presence_leave')}catch{}}
function init(){
  Game=window.CellboundGame;
  if(!Game?.ready){setTimeout(init,100);return}
  db=Game.getSupabase?.();user=Game.getUser?.();if(!db||!user)return;
  zone=VIEW_ZONE[activeView()]||'town';
  heartbeat(true);
  timer=setInterval(()=>heartbeat(false),12000);
  window.addEventListener('cellbound:view-changed',e=>syncFromView(e.detail?.view));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')heartbeat(true)});
  window.addEventListener('pagehide',()=>{clearInterval(timer);clearTimeout(beatTimer);leave()},{once:true});
  window.CellboundWorldPresence={getZone:()=>zone,getPeers:()=>peers.slice(),getOnlineCount:()=>peers.length,setZone,refresh:()=>heartbeat(true),leave};
}
init();
})();