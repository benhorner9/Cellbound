(()=>{
'use strict';

const D=window.CellboundEndgameData,G=window.CellboundGear;
if(!D||!G){console.error('Cellbound endgame data failed to load.');return}

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

let Game=null,db=null,user=null,server={season:D.SEASON,rotation:{},progress:[],weekly:{},recentRuns:[]},leaderboards={};
const selection={
 'ashen-vault':{difficulty:'normal',tier:1},
 'hollow-sanctum':{difficulty:'normal',tier:1}
};

const progressFor=id=>(server.progress||[]).find(x=>x.dungeon_id===id)||{
 dungeon_id:id,normal_clears:0,heroic_unlocked:false,heroic_clears:0,cellbound_unlocked:false,highest_tier:0,cellbound_clears:0,best_score:0,best_time_ms:null
};
function formatTime(ms){
 const total=Math.max(0,Math.round((Number(ms)||0)/1000)),m=Math.floor(total/60),s=total%60;
 return m+':'+String(s).padStart(2,'0')
}
function difficultyUnlocked(id,difficulty,tier=1){
 const p=progressFor(id);
 if(difficulty==='normal')return true;
 if(difficulty==='heroic')return Boolean(p.heroic_unlocked);
 if(difficulty==='cellbound')return Boolean(p.cellbound_unlocked)&&Number(tier)<=Math.max(1,Number(p.highest_tier)||1);
 return false
}
function currentConfig(id){
 const s=selection[id]||selection['ashen-vault'],dungeon=D.DUNGEONS[id],diff=D.difficultyConfig(s.difficulty,s.tier);
 const affixes=s.difficulty==='cellbound'?D.affixesForTier(s.tier,server.rotation||{}):[];
 const recommendedItemLevel=s.difficulty==='normal'?dungeon.normalItemLevel:s.difficulty==='heroic'?dungeon.heroicItemLevel:dungeon.cellboundItemLevel+Math.floor(Math.max(0,s.tier-1)/3);
 return{dungeon,difficulty:s.difficulty,tier:s.difficulty==='cellbound'?s.tier:0,diff,affixes,targetTimeMs:dungeon.timerMs,recommendedItemLevel,seasonId:server.season?.id||D.SEASON.id}
}
function choose(id,difficulty,tier){
 const p=progressFor(id),s=selection[id]||{difficulty:'normal',tier:1};
 if(difficulty)s.difficulty=difficulty;
 if(tier!=null)s.tier=clamp(Number(tier)||1,1,Math.max(1,Number(p.highest_tier)||1));
 selection[id]=s;render()
}
function affixMarkup(ids){
 if(!ids?.length)return'<span class="eg-affix none">NO AFFIXES</span>';
 return ids.map(id=>{const a=D.AFFIXES[id];return a?'<span class="eg-affix '+a.tier+'" title="'+esc(a.description)+'">'+esc(a.name)+'</span>':''}).join('')
}
function progressCopy(id){
 const p=progressFor(id);
 if(!p.normal_clears)return'Complete Normal to unlock Heroic.';
 if(!p.heroic_clears)return'Heroic unlocked. Complete it to unlock Cellbound+1.';
 if(p.highest_tier<20)return'Cellbound+'+Math.max(1,p.highest_tier)+' available. Complete your highest tier to unlock the next.';
 return'Cellbound+20 cleared. Push score, time and seasonal rankings.'
}
function readyGuidance(cfg){
 const pi=Number(Game?.partyItemLevel?.())||0,p=progressFor(cfg.dungeon.id);
 const gap=pi-cfg.recommendedItemLevel;
 if(!difficultyUnlocked(cfg.dungeon.id,cfg.difficulty,cfg.tier))return'Complete the previous progression step first.';
 if(gap>=4)return'Party appears comfortably geared. Execution and strategy are now the main gains.';
 if(gap>=0)return'Party appears ready. Review affixes and strategy before entering.';
 return'Party is '+Math.abs(gap)+' Item Levels below the recommendation. You may still attempt unlocked content, but mistakes will be more punishing.'
}
function lootNames(id){
 const d=D.DUNGEONS[id];
 return (d.lootTable||[]).map(key=>D.UNIQUE_ITEMS[key]?.name||G.byId?.(key)?.name||key).slice(0,5)
}
function recentFor(id){return(server.recentRuns||[]).filter(x=>x.dungeon_id===id).slice(0,5)}
function dungeonCard(id){
 const cfg=currentConfig(id),p=progressFor(id),s=selection[id],tiers=Math.max(1,Number(p.highest_tier)||1),runs=recentFor(id);
 const modeButtons=['normal','heroic','cellbound'].map(mode=>{
   const unlocked=difficultyUnlocked(id,mode,s.tier),label=mode==='cellbound'?'CELLBOUND+':' '+mode.toUpperCase();
   return'<button data-eg-mode="'+id+'|'+mode+'" class="'+(s.difficulty===mode?'active':'')+'" '+(unlocked?'':'disabled')+'>'+label+'</button>'
 }).join('');
 const tier=s.difficulty==='cellbound'
   ?'<div class="eg-tier-select"><label>Tier <select data-eg-tier="'+id+'">'+Array.from({length:tiers},(_,i)=>i+1).map(t=>'<option value="'+t+'" '+(t===s.tier?'selected':'')+'>Cellbound+'+t+'</option>').join('')+'</select></label><span>Highest unlocked +'+tiers+'</span></div>'
   :'';
 const best=p.best_score?'<b>'+Number(p.best_score).toLocaleString()+' score</b><small>Best time '+formatTime(p.best_time_ms)+'</small>':'<b>No ranked clear yet</b><small>Your first completion will establish a baseline.</small>';
 return '<article class="eg-dungeon-card" data-eg-dungeon="'+id+'">'+
   '<header><div><small>'+esc(cfg.dungeon.theme.toUpperCase())+' · VERSION '+cfg.dungeon.version+'</small><h3>'+esc(cfg.dungeon.name)+'</h3><p>'+esc(cfg.dungeon.identity)+'</p></div><div class="eg-best">'+best+'</div></header>'+
   '<div class="eg-mode-tabs">'+modeButtons+'</div>'+tier+
   '<div class="eg-dungeon-grid">'+
     '<section><small>SELECTED RUN</small><h4>'+esc(cfg.diff.name)+'</h4><p>'+esc(cfg.diff.description)+'</p><div class="eg-affixes">'+affixMarkup(cfg.affixes)+'</div></section>'+
     '<section><small>READINESS</small><h4>iLvl '+cfg.recommendedItemLevel+' recommended</h4><p>'+esc(readyGuidance(cfg))+'</p><strong>'+esc(progressCopy(id))+'</strong></section>'+
     '<section><small>REWARDS</small><h4>'+esc(D.rewardBand(cfg.difficulty,cfg.tier).label)+'</h4><p>'+lootNames(id).map(esc).join(' · ')+'</p><strong>Cell Shards · boss loot · rare collection hooks</strong></section>'+
   '</div>'+
   '<div class="eg-boss-strip">'+cfg.dungeon.bosses.map(b=>'<span><b>'+esc(b.name)+'</b><small>'+esc(b.signature)+'</small></span>').join('')+'</div>'+
   '<footer><div><small>TARGET TIME</small><b>'+formatTime(cfg.targetTimeMs)+'</b><span>Score improves through tier, time, deaths and mechanical execution.</span></div><button data-eg-prepare="'+id+'" '+(difficultyUnlocked(id,cfg.difficulty,cfg.tier)?'':'disabled')+'>PREPARE '+esc(cfg.diff.label)+' →</button></footer>'+
   (runs.length?'<div class="eg-recent">'+runs.map(r=>'<span><b>'+esc(r.difficulty==='cellbound'?'+'+r.tier:r.difficulty.toUpperCase())+'</b><em>'+formatTime(r.completion_time_ms)+'</em><strong>'+Number(r.score).toLocaleString()+'</strong></span>').join('')+'</div>':'')+
 '</article>'
}
function weeklyMarkup(){
 const w=server.weekly||{},points=Number(w.progress_points)||0,highest=Number(w.highest_tier)||0,pct=clamp(points/60*100,0,100),claimed=Boolean(w.reward_claimed);
 return'<article class="eg-weekly panel"><div><small>WEEKLY ENDGAME</small><h3>Weekly Vault</h3><p>Dungeon clears build one weekly reward. Missing a day does not matter.</p></div><div class="eg-weekly-progress"><span><b>'+points+' / 60 points</b><em>Highest Cellbound+ '+highest+'</em></span><div><i style="width:'+pct+'%"></i></div><button data-eg-weekly '+(points>=60&&!claimed?'':'disabled')+'>'+(claimed?'CLAIMED':points>=60?'CLAIM WEEKLY REWARD':'KEEP PLAYING')+'</button></div></article>'
}
function leaderboardMarkup(id){
 const rows=leaderboards[id]||[];
 return'<section class="eg-leader panel"><div class="panel-head"><div><small>SEASON LEADERBOARD</small><h3>'+esc(D.DUNGEONS[id].name)+'</h3></div><b>'+esc(server.season?.name||D.SEASON.name)+'</b></div><div class="eg-leader-list">'+(rows.length?rows.slice(0,10).map(r=>'<div><b>#'+r.rank+'</b><span>'+esc(r.guild_label)+'<small>'+esc(r.difficulty==='cellbound'?'Cellbound+'+r.tier:r.difficulty.toUpperCase())+' · '+r.deaths+' deaths</small></span><em>'+formatTime(r.completion_time_ms)+'</em><strong>'+Number(r.score).toLocaleString()+'</strong></div>').join(''):'<p class="eg-empty">No validated runs recorded yet.</p>')+'</div></section>'
}
function render(){
 const root=$('#endgameHub');if(!root||!Game?.ready)return;
 const rotation=server.rotation||{},minor=D.AFFIXES[rotation.minor_affix],major=D.AFFIXES[rotation.major_affix];
 root.innerHTML=
 '<section class="eg-hero"><div><small>UPDATE 2 · ENDGAME HUB</small><h2>Dungeon mastery now has somewhere to go.</h2><p>Normal teaches the dungeon. Heroic changes it. Cellbound+ turns it into a scalable endgame challenge with weekly modifiers, persistent scores and targeted rewards.</p></div><div class="eg-season"><span>SEASON</span><b>'+esc(server.season?.name||D.SEASON.name)+'</b><small>'+esc(minor?.name||'No minor affix')+' · '+esc(major?.name||'No major affix')+'</small></div></section>'+
 weeklyMarkup()+
 '<div class="eg-content">'+dungeonCard('ashen-vault')+dungeonCard('hollow-sanctum')+'</div>'+
 '<div class="eg-leaderboards">'+leaderboardMarkup('ashen-vault')+leaderboardMarkup('hollow-sanctum')+'</div>';
 bind()
}
function bind(){
 document.querySelectorAll('[data-eg-mode]').forEach(b=>b.onclick=()=>{const[id,mode]=b.dataset.egMode.split('|');choose(id,mode)});
 document.querySelectorAll('[data-eg-tier]').forEach(s=>s.onchange=()=>choose(s.dataset.egTier,'cellbound',Number(s.value)));
 document.querySelectorAll('[data-eg-prepare]').forEach(b=>b.onclick=()=>prepare(b.dataset.egPrepare));
 $('[data-eg-weekly]')?.addEventListener('click',claimWeekly)
}
async function loadLeaderboard(id){
 if(!db)return;
 const {data,error}=await db.rpc('get_dungeon_leaderboard',{p_dungeon_id:id,p_season_id:server.season?.id||D.SEASON.id,p_limit:20});
 if(!error)leaderboards[id]=data||[];else console.warn('Leaderboard load failed',error)
}
async function refresh(){
 if(!db||!user)return;
 const {data,error}=await db.rpc('get_endgame_state');
 if(error){console.warn('Endgame state failed',error);return}
 server=data||server;
 for(const id of Object.keys(D.DUNGEONS)){
   const p=progressFor(id),s=selection[id];s.tier=clamp(s.tier,1,Math.max(1,Number(p.highest_tier)||1));
   if(s.difficulty==='heroic'&&!p.heroic_unlocked)s.difficulty='normal';
   if(s.difficulty==='cellbound'&&!p.cellbound_unlocked)s.difficulty=p.heroic_unlocked?'heroic':'normal'
 }
 await Promise.all(Object.keys(D.DUNGEONS).map(loadLeaderboard));
 render()
}
function prepare(id){
 const cfg=currentConfig(id);
 if(!difficultyUnlocked(id,cfg.difficulty,cfg.tier))return;
 if(id==='ashen-vault'){
   Game.switchView?.('content');
   setTimeout(()=>window.CellboundDungeon2D?.open?.({difficulty:cfg.difficulty,tier:cfg.tier}),80)
 }else if(id==='hollow-sanctum'){
   Game.switchView?.('content');
   setTimeout(()=>window.CellboundHollowSanctum?.open?.({difficulty:cfg.difficulty,tier:cfg.tier}),80)
 }
}
function stageConfig(dungeonId,stage){
 const cfg=currentConfig(dungeonId),out={...stage};
 out.scaling={
   enemyHealth:cfg.diff.enemyHealth,enemyDamage:cfg.diff.enemyDamage,castSpeed:cfg.diff.castSpeed,
   mechanicFrequency:cfg.diff.mechanicFrequency,addCountBonus:cfg.diff.addCountBonus
 };
 out.affixes=[...cfg.affixes];out.difficulty=cfg.difficulty;out.cellboundTier=cfg.tier;out.recommendedItemLevel=cfg.recommendedItemLevel;
 const extras=cfg.difficulty==='normal'?[]:(cfg.dungeon.heroicAdds?.[stage.id]||[]);
 if(extras.length)out.mechanics=[...(out.mechanics||[]),...extras];
 if(cfg.difficulty==='cellbound'&&cfg.tier>=10&&stage.kind==='final'){
   out.mechanics=[...(out.mechanics||[]),{name:'Cellbound Overload',type:'circles',duration:1350}]
 }
 return out
}
async function recordRun(dungeonId,metrics){
 const cfg=currentConfig(dungeonId);
 if(!db)return null;
 const payload={
   p_dungeon_id:dungeonId,p_difficulty:cfg.difficulty,p_tier:cfg.tier,
   p_completion_time_ms:Math.max(1,Math.round(metrics.timeMs||0)),
   p_target_time_ms:cfg.targetTimeMs,
   p_deaths:Math.max(0,Math.round(metrics.deaths||0)),
   p_mechanics_failed:Math.max(0,Math.round(metrics.mechanicsFailed||0)),
   p_mistakes:Math.max(0,Math.round(metrics.mistakes||0)),
   p_dungeon_version:cfg.dungeon.version,p_season_id:cfg.seasonId
 };
 const {data,error}=await db.rpc('record_dungeon_run',payload);
 if(error){console.warn('Dungeon run was not recorded',error);return{error}}
 await refresh();return data
}
function rarityTierFor(cfg){
 if(cfg.difficulty==='normal')return Math.random()<.72?1:2;
 if(cfg.difficulty==='heroic')return Math.random()<.68?2:3;
 if(cfg.tier>=10)return 3;
 return Math.random()<.35?2:3
}
function compatibleUnique(item,party){
 if(!item)return false;if(item.classes==='all'||!item.classes)return true;
 return party.some(c=>Array.isArray(item.classes)&&item.classes.includes(c.class))
}
function rollPersonalLoot(dungeonId,bossId=null){
 const cfg=currentConfig(dungeonId),party=Game?.getPartyCharacters?.()||[],sourceKeys=(bossId&&cfg.dungeon.bossDrops?.[bossId])||cfg.dungeon.lootTable||[],uniqueKeys=sourceKeys.filter(x=>D.UNIQUE_ITEMS[x]);
 const uniqueChance=cfg.difficulty==='normal'?.002:cfg.difficulty==='heroic'?.025:Math.min(.09,.035+cfg.tier*.0035);
 if(uniqueKeys.length&&Math.random()<uniqueChance){
   const candidates=uniqueKeys.map(x=>D.UNIQUE_ITEMS[x]).filter(x=>compatibleUnique(x,party));
   if(candidates.length)return{...candidates[Math.floor(Math.random()*candidates.length)],rollId:'unique-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),unique:true}
 }
 const fixed=sourceKeys.map(key=>G.byId?.(key)).filter(Boolean).filter(item=>party.some(c=>item.class===c.class));
 const tier=rarityTierFor(cfg),pool=G.items.filter(x=>x.tier===tier&&x.enabled&&party.some(c=>x.class===c.class));
 const targetChance=bossId&&fixed.length?.55:0;
 const base=(targetChance&&Math.random()<targetChance?fixed[Math.floor(Math.random()*fixed.length)]:null)||pool[Math.floor(Math.random()*Math.max(1,pool.length))]||G.items.find(x=>x.tier===tier&&x.enabled);
 if(!base)return null;
 const item=G.rollItemAffixes({...base,source:cfg.dungeon.name+' · '+cfg.diff.name});
 const cap=D.rewardBand(cfg.difficulty,cfg.tier).powerCap;
 const bonus=cfg.difficulty==='normal'?0:cfg.difficulty==='heroic'?4:6+Math.min(8,Math.floor(cfg.tier/2));
 item.itemLevel=Math.min(cap,Math.max(Number(item.itemLevel)||0,(Number(item.itemLevel)||0)+bonus));
 item.power=Math.max(Number(item.power)||0,Math.floor(bonus/2));return item
}
function shardReward(dungeonId){
 const cfg=currentConfig(dungeonId);return Math.max(1,Math.round(cfg.diff.cellShardBase+(cfg.difficulty==='cellbound'?cfg.tier:0)))
}
function rollChase(dungeonId){
 const cfg=currentConfig(dungeonId),state=Game?.getState?.();if(!state)return null;
 state.endgamePity=state.endgamePity||{};state.collections=state.collections||[];
 for(const key of cfg.dungeon.chase||[]){
   const reward=D.CHASE_REWARDS[key],pity=Number(state.endgamePity[key])||0,chance=reward.baseDropRate+Math.min(.02,pity*.00025);
   if(Math.random()<chance){
     state.endgamePity[key]=0;
     if(!state.collections.some(x=>x.id===key))state.collections.push({...reward,earnedAt:new Date().toISOString(),source:cfg.dungeon.name});
     return reward
   }
   state.endgamePity[key]=pity+1
 }
 return null
}
async function claimWeekly(){
 if(!db||!Game)return;
 const {data,error}=await db.rpc('claim_weekly_dungeon_reward');
 if(error){alert(error.message||'Weekly reward is not ready.');return}
 const quality=data?.quality||'starter',tier=quality==='epic'?3:quality==='rare'?3:quality==='uncommon'?2:1;
 const pool=G.items.filter(x=>x.tier===tier&&x.enabled),base=pool[Math.floor(Math.random()*Math.max(1,pool.length))];
 if(base)Game.addBankItem?.(G.rollItemAffixes({...base,source:'Weekly Endgame Vault'}));
 Game.addMaterial?.('cell-shards',quality==='epic'?40:quality==='rare'?28:quality==='uncommon'?18:10);
 Game.save?.();await Game.persistState?.();await refresh()
}
function runSummaryLabel(dungeonId){
 const cfg=currentConfig(dungeonId);return cfg.difficulty==='cellbound'?'Cellbound+'+cfg.tier:cfg.diff.name
}
async function init(){
 Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}
 db=Game.getSupabase?.();user=Game.getUser?.();if(!db||!user)return;
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='endgame')refresh()});
 window.addEventListener('cellbound:dungeon-complete',()=>refresh());
 await refresh();
 window.CellboundEndgame={
   refresh,render,currentConfig,stageConfig,recordRun,rollPersonalLoot,shardReward,rollChase,
   progressFor,difficultyUnlocked,choose,prepare,runSummaryLabel,getSelection:id=>({...selection[id]})
 }
}
init();
})();