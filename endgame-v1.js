(()=>{
'use strict';

const D=window.CellboundEndgameData,G=window.CellboundGear;
if(!D||!G){console.error('Cellbound endgame data failed to load.');return}

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

let Game=null,db=null,user=null,server={season:D.SEASON,rotation:{},progress:[],weekly:{},recentRuns:[],achievements:[]},leaderboards={},attempts={};
const selection={
 'ashen-vault':{difficulty:'normal',tier:1},
 'hollow-sanctum':{difficulty:'normal',tier:1}
};
const leaderboardView={
 'ashen-vault':{scope:'overall',klass:null},
 'hollow-sanctum':{scope:'overall',klass:null}
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

function itemDisplay(key){
 const x=D.UNIQUE_ITEMS[key]||G.byId?.(key);
 if(!x)return{name:key,rarity:'Unknown',slot:'Item',uniqueEffect:null};
 return{name:x.name||key,rarity:x.rarity||'Gear',slot:x.slot||'Item',uniqueEffect:x.uniqueEffect||null}
}
function bossLootMarkup(id){
 const d=D.DUNGEONS[id],rows=(d.bosses||[]).map(b=>{
   const keys=d.bossDrops?.[b.id]||[];
   return '<article><div><small>BOSS LOOT</small><b>'+esc(b.name)+'</b></div><div>'+keys.map(key=>{
     const it=itemDisplay(key);return '<span class="eg-loot-pill rarity-'+String(it.rarity).toLowerCase()+'"><i>'+esc(String(it.rarity).toUpperCase())+'</i><b>'+esc(it.name)+'</b><em>'+esc(it.slot)+(it.uniqueEffect?' · BUILD ITEM':'')+'</em></span>'
   }).join('')+'</div></article>'
 }).join('');
 return '<section class="eg-loot-table"><div class="panel-head"><div><small>TARGET LOOT</small><h4>Boss-specific drops</h4></div><span>Secret collection drops remain hidden.</span></div>'+rows+'</section>'
}

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
   '<div class="eg-boss-strip">'+cfg.dungeon.bosses.map(b=>'<span><b>'+esc(b.name)+'</b><small>'+esc(b.signature)+'</small></span>').join('')+'</div>'+bossLootMarkup(id)+
   '<footer><div><small>TARGET TIME</small><b>'+formatTime(cfg.targetTimeMs)+'</b><span>Score improves through tier, time, deaths and mechanical execution.</span></div><button data-eg-prepare="'+id+'" '+(difficultyUnlocked(id,cfg.difficulty,cfg.tier)?'':'disabled')+'>PREPARE '+esc(cfg.diff.label)+' →</button></footer>'+
   (runs.length?'<div class="eg-recent">'+runs.map(r=>'<span><b>'+esc(r.difficulty==='cellbound'?'+'+r.tier:r.difficulty.toUpperCase())+'</b><em>'+formatTime(r.completion_time_ms)+'</em><strong>'+Number(r.score).toLocaleString()+'</strong></span>').join('')+'</div>':'')+
 '</article>'
}

const ACHIEVEMENT_DEFS={
 'first-heroic':{name:'Into Heroic',description:'Complete your first Heroic dungeon.',reward:'Title hook · Heroic Delver'},
 'cellbound-10':{name:'Bound Beyond Ten',description:'Complete Cellbound+10 or higher.',reward:'Prestige cosmetic hook'},
 'deathless':{name:'Untouched',description:'Complete a dungeon without a death.',reward:'Achievement'},
 'clean-mechanics':{name:'Perfect Execution',description:'Complete Heroic or Cellbound+ without failing a boss mechanic.',reward:'Achievement'},
 'perfect-interrupts':{name:'Not On My Watch',description:'Miss no critical interrupts in Heroic or Cellbound+.',reward:'Achievement'},
 'in-time':{name:'Ahead of the Cell',description:'Complete a Cellbound+ dungeon within its target time.',reward:'Achievement'}
};
function achievementMarkup(){
 const unlocked=new Map((server.achievements||[]).map(a=>[a.achievement_id,a]));
 return '<section class="eg-achievements panel"><div class="panel-head"><div><small>ENDGAME ACHIEVEMENTS</small><h3>Dungeon Mastery</h3></div><b>'+unlocked.size+' / '+Object.keys(ACHIEVEMENT_DEFS).length+' UNLOCKED</b></div><div class="eg-achievement-grid">'+Object.entries(ACHIEVEMENT_DEFS).map(([id,a])=>{
   const row=unlocked.get(id);return '<article class="'+(row?'unlocked':'locked')+'"><i>'+(row?'✓':'◇')+'</i><span><b>'+esc(a.name)+'</b><small>'+esc(a.description)+'</small><em>'+(row?'Unlocked '+new Date(row.unlocked_at).toLocaleDateString():esc(a.reward))+'</em></span></article>'
 }).join('')+'</div></section>'
}
function collectionMarkup(){
 const list=Game?.getState?.()?.collections||[];
 return '<section class="eg-collections panel"><div class="panel-head"><div><small>COLLECTION HOOKS</small><h3>Rare Finds</h3></div><b>'+list.length+' FOUND</b></div><div class="eg-collection-list">'+(list.length?list.slice(-8).reverse().map(x=>'<article><i>'+((x.kind==='mount'?'♞':x.kind==='pet'?'◆':x.kind==='cell'?'◈':'◇'))+'</i><span><b>'+esc(x.name)+'</b><small>'+esc(String(x.rarity||'Rare').toUpperCase())+' · '+esc(x.kind||'collection')+'</small><em>'+esc(x.source||'Endgame')+'</em></span></article>').join(''):'<p class="eg-empty">Rare mounts, pets and Cells can drop from endgame dungeons. Power progression never depends on these drops.</p>')+'</div></section>'
}

function weeklyMarkup(){
 const w=server.weekly||{},points=Number(w.progress_points)||0,highest=Number(w.highest_tier)||0,pct=clamp(points/60*100,0,100),claimed=Boolean(w.reward_claimed);
 return'<article class="eg-weekly panel"><div><small>WEEKLY ENDGAME</small><h3>Weekly Vault</h3><p>Dungeon clears build one weekly reward. Missing a day does not matter.</p></div><div class="eg-weekly-progress"><span><b>'+points+' / 60 points</b><em>Highest Cellbound+ '+highest+'</em></span><div><i style="width:'+pct+'%"></i></div><button data-eg-weekly '+(points>=60&&!claimed?'':'disabled')+'>'+(claimed?'CLAIMED':points>=60?'CLAIM WEEKLY REWARD':'KEEP PLAYING')+'</button></div></article>'
}
function leaderboardMarkup(id){
 const rows=leaderboards[id]||[],view=leaderboardView[id]||{scope:'overall'},cfg=currentConfig(id),partyClasses=[...new Set((Game?.getPartyCharacters?.()||[]).map(c=>c.class))];
 if(!view.klass&&partyClasses.length)view.klass=partyClasses[0];
 const scopes=[['overall','OVERALL'],['tier','TIER +'+Math.max(1,cfg.tier||progressFor(id).highest_tier||1)],['class','CLASS'],['party','MY PARTY']];
 const filters='<div class="eg-leader-filters">'+scopes.map(x=>'<button data-eg-lb-scope="'+id+'|'+x[0]+'" class="'+(view.scope===x[0]?'active':'')+'">'+x[1]+'</button>').join('')+(view.scope==='class'?'<select data-eg-lb-class="'+id+'">'+partyClasses.map(k=>'<option '+(k===view.klass?'selected':'')+'>'+esc(k)+'</option>').join('')+'</select>':'')+'</div>';
 return'<section class="eg-leader panel"><div class="panel-head"><div><small>SEASON LEADERBOARD</small><h3>'+esc(D.DUNGEONS[id].name)+'</h3></div><b>'+esc(server.season?.name||D.SEASON.name)+'</b></div>'+filters+'<div class="eg-leader-list">'+(rows.length?rows.slice(0,10).map(r=>'<div><b>#'+r.rank+'</b><span>'+esc(r.guild_label)+'<small>'+esc(r.difficulty==='cellbound'?'Cellbound+'+r.tier:r.difficulty.toUpperCase())+' · '+r.deaths+' deaths · '+esc((r.party_classes||[]).join(' / '))+'</small></span><em>'+formatTime(r.completion_time_ms)+'</em><strong>'+Number(r.score).toLocaleString()+'</strong></div>').join(''):'<p class="eg-empty">No validated runs recorded for this scope yet.</p>')+'</div></section>'
}
function render(){
 const root=$('#endgameHub');if(!root||!Game?.ready)return;
 const rotation=server.rotation||{},minor=D.AFFIXES[rotation.minor_affix],major=D.AFFIXES[rotation.major_affix];
 root.innerHTML=
 '<section class="eg-hero"><div><small>UPDATE 2 · ENDGAME HUB</small><h2>Dungeon mastery now has somewhere to go.</h2><p>Normal teaches the dungeon. Heroic changes it. Cellbound+ turns it into a scalable endgame challenge with weekly modifiers, persistent scores and targeted rewards.</p></div><div class="eg-season"><span>SEASON</span><b>'+esc(server.season?.name||D.SEASON.name)+'</b><small>'+esc(minor?.name||'No minor affix')+' · '+esc(major?.name||'No major affix')+'</small></div></section>'+
 weeklyMarkup()+achievementMarkup()+collectionMarkup()+
 '<div class="eg-content">'+dungeonCard('ashen-vault')+dungeonCard('hollow-sanctum')+'</div>'+
 '<div class="eg-leaderboards">'+leaderboardMarkup('ashen-vault')+leaderboardMarkup('hollow-sanctum')+'</div>';
 bind()
}
function bind(){
 document.querySelectorAll('[data-eg-mode]').forEach(b=>b.onclick=()=>{const[id,mode]=b.dataset.egMode.split('|');choose(id,mode)});
 document.querySelectorAll('[data-eg-tier]').forEach(s=>s.onchange=()=>choose(s.dataset.egTier,'cellbound',Number(s.value)));
 document.querySelectorAll('[data-eg-prepare]').forEach(b=>b.onclick=()=>prepare(b.dataset.egPrepare));
 $('[data-eg-weekly]')?.addEventListener('click',claimWeekly);
 document.querySelectorAll('[data-eg-lb-scope]').forEach(b=>b.onclick=async()=>{const[id,scope]=b.dataset.egLbScope.split('|');leaderboardView[id].scope=scope;await loadLeaderboard(id);render()});
 document.querySelectorAll('[data-eg-lb-class]').forEach(s=>s.onchange=async()=>{leaderboardView[s.dataset.egLbClass].klass=s.value;await loadLeaderboard(s.dataset.egLbClass);render()})
}
async function loadLeaderboard(id){
 if(!db)return;
 const view=leaderboardView[id]||{scope:'overall'},cfg=currentConfig(id),tier=Math.max(1,Number(cfg.tier)||Number(progressFor(id).highest_tier)||1);
 const {data,error}=await db.rpc('get_dungeon_leaderboard_v2',{
   p_dungeon_id:id,p_season_id:server.season?.id||D.SEASON.id,p_scope:view.scope,
   p_tier:view.scope==='tier'?tier:null,p_class:view.scope==='class'?view.klass:null,p_limit:20
 });
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
 if(cfg.difficulty!=='normal'){
   const phases=D.BOSS_PHASES?.[dungeonId]?.[stage.id]||[];
   if(phases.length)out.phases=phases.map(x=>({...x,addMechanics:(x.addMechanics||[]).map(m=>({...m}))}));
   if(stage.kind==='boss'||stage.kind==='final'){
     out.softEnragePct=20;out.softEnrageDamage=cfg.difficulty==='cellbound'?1.28:1.22;
     out.hardEnrageMs=cfg.difficulty==='cellbound'
       ?Math.max(55000,90000-(cfg.tier*1500))
       :105000;
   }
 }
 if(cfg.difficulty==='cellbound'&&cfg.tier>=10&&stage.kind==='final'){
   out.mechanics=[...(out.mechanics||[]),{name:'Cellbound Overload',type:'circles',duration:1350}]
 }
 return out
}

async function beginAttempt(dungeonId){
 const cfg=currentConfig(dungeonId);if(!db)return{error:new Error('Endgame service unavailable')};
 const {data,error}=await db.rpc('begin_dungeon_attempt',{
   p_dungeon_id:dungeonId,p_difficulty:cfg.difficulty,p_tier:cfg.tier,
   p_dungeon_version:cfg.dungeon.version,p_season_id:cfg.seasonId
 });
 if(error){console.warn('Dungeon attempt could not start',error);return{error}}
 attempts[dungeonId]=data;return data
}

async function recordRun(dungeonId,metrics){
 const before={...progressFor(dungeonId)},attempt=attempts[dungeonId];
 if(!db)return null;
 if(!attempt?.attemptId)return{error:new Error('Missing server dungeon attempt'),reason:'missing-attempt'};
 const payload={
   p_attempt_id:attempt.attemptId,
   p_completion_time_ms:Math.max(1,Math.round(metrics.timeMs||0)),
   p_deaths:Math.max(0,Math.round(metrics.deaths||0)),
   p_mechanics_failed:Math.max(0,Math.round(metrics.mechanicsFailed||0)),
   p_mistakes:Math.max(0,Math.round(metrics.mistakes||0)),
   p_missed_interrupts:Math.max(0,Math.round(metrics.missedInterrupts||0)),
   p_threat_losses:Math.max(0,Math.round(metrics.threatLosses||0)),
   p_avoidable_damage:Math.max(0,Number(metrics.avoidableDamage)||0),
   p_battle_resurrections:Math.max(0,Math.round(metrics.battleResurrections||0))
 };
 const {data,error}=await db.rpc('record_dungeon_run_v3',payload);
 if(error){console.warn('Dungeon run was not recorded',error);return{error}}
 delete attempts[dungeonId];
 if(data?.valid===false){console.warn('Dungeon run failed integrity checks',data);return{error:new Error(data.reason||'Run integrity check failed'),...data}}
 await refresh();
 const after=progressFor(dungeonId),newUnlocks=[];
 if(!before.heroic_unlocked&&after.heroic_unlocked)newUnlocks.push('Heroic difficulty unlocked');
 if(!before.cellbound_unlocked&&after.cellbound_unlocked)newUnlocks.push('Cellbound+1 unlocked');
 if(Number(after.highest_tier)>Number(before.highest_tier)&&Number(before.highest_tier)>=1)newUnlocks.push('Cellbound+'+Number(after.highest_tier)+' unlocked');
 return{...(data||{}),newUnlocks,previousBestScore:Number(before.best_score)||0,previousBestTimeMs:before.best_time_ms?Number(before.best_time_ms):null,isNewBest:Number(data?.score||0)>Number(before.best_score||0)}
}

function weightedTier(weights){
 const r=Math.random(),entries=Object.entries(weights||{}).map(([k,v])=>[Number(k),Number(v)||0]);let acc=0;
 for(const [tier,w] of entries){acc+=w;if(r<=acc)return tier}
 return entries[entries.length-1]?.[0]||1
}
function rarityTierFor(cfg){
 const rules=D.LOOT_RULES?.rarityWeights||{};
 if(cfg.difficulty==='normal')return weightedTier(rules.normal||{1:.72,2:.28});
 if(cfg.difficulty==='heroic')return weightedTier(rules.heroic||{2:.68,3:.32});
 if(cfg.tier>=10)return weightedTier(rules.cellboundHigh||{3:.8,4:.2});
 if(cfg.tier>=5)return weightedTier(rules.cellboundMid||{3:.88,4:.12});
 return weightedTier(rules.cellboundLow||{2:.35,3:.65})
}
function compatibleUnique(item,party){
 if(!item)return false;if(item.classes==='all'||!item.classes)return true;
 return party.some(c=>Array.isArray(item.classes)&&item.classes.includes(c.class))
}
function rollPersonalLoot(dungeonId,bossId=null){
 const cfg=currentConfig(dungeonId),party=Game?.getPartyCharacters?.()||[],sourceKeys=(bossId&&cfg.dungeon.bossDrops?.[bossId])||cfg.dungeon.lootTable||[],uniqueKeys=sourceKeys.filter(x=>D.UNIQUE_ITEMS[x]);
 const lr=D.LOOT_RULES||{},uniqueChance=cfg.difficulty==='normal'?(lr.uniqueChance?.normal??.002):cfg.difficulty==='heroic'?(lr.uniqueChance?.heroic??.025):Math.min(lr.uniqueChance?.cellboundCap??.09,(lr.uniqueChance?.cellboundBase??.035)+cfg.tier*(lr.uniqueChance?.cellboundPerTier??.0035));
 if(uniqueKeys.length&&Math.random()<uniqueChance){
   const candidates=uniqueKeys.map(x=>D.UNIQUE_ITEMS[x]).filter(x=>compatibleUnique(x,party));
   if(candidates.length)return{...candidates[Math.floor(Math.random()*candidates.length)],rollId:'unique-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),unique:true}
 }
 const fixed=sourceKeys.map(key=>G.byId?.(key)).filter(Boolean).filter(item=>party.some(c=>item.class===c.class));
 const tier=rarityTierFor(cfg),pool=G.items.filter(x=>x.tier===tier&&x.enabled&&party.some(c=>x.class===c.class));
 const targetChance=bossId&&fixed.length?(D.LOOT_RULES?.targetedBossChance??.55):0;
 const base=(targetChance&&Math.random()<targetChance?fixed[Math.floor(Math.random()*fixed.length)]:null)||pool[Math.floor(Math.random()*Math.max(1,pool.length))]||G.items.find(x=>x.tier===tier&&x.enabled);
 if(!base)return null;
 const item=G.rollItemAffixes({...base,source:cfg.dungeon.name+' · '+cfg.diff.name});
 const cap=Math.min(D.LOOT_RULES?.powerCeiling||42,D.rewardBand(cfg.difficulty,cfg.tier).powerCap);
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
   const reward=D.CHASE_REWARDS[key],pity=Number(state.endgamePity[key])||0,chance=reward.baseDropRate+Math.min(D.LOOT_RULES?.chasePityCap??.02,pity*(D.LOOT_RULES?.chasePityStep??.00025));
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
function achievementName(id){return ACHIEVEMENT_DEFS[id]?.name||String(id||'Achievement').replace(/-/g,' ')}

function debugSnapshot(dungeonId='ashen-vault'){
 const cfg=currentConfig(dungeonId);
 return{
   version:'update-2',
   dungeon:{id:dungeonId,version:cfg.dungeon.version,difficulty:cfg.difficulty,tier:cfg.tier,targetTimeMs:cfg.targetTimeMs,recommendedItemLevel:cfg.recommendedItemLevel},
   scaling:{...cfg.diff},
   affixes:[...cfg.affixes],
   rewardBand:D.rewardBand(cfg.difficulty,cfg.tier),
   lootRules:D.LOOT_RULES,
   progress:{...progressFor(dungeonId)},
   weekly:{...(server.weekly||{})},
   season:{...(server.season||{})}
 }
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
   refresh,render,currentConfig,stageConfig,beginAttempt,recordRun,rollPersonalLoot,shardReward,rollChase,
   progressFor,difficultyUnlocked,choose,prepare,runSummaryLabel,achievementName,debugSnapshot,getSelection:id=>({...selection[id]})
 }
}
init();
})();