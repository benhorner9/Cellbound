(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const templates=new Map(),published=new Map();
let loading=null,playing=false,lastRefresh=0,activeSession=0;
const db=()=>window.CellboundGame?.getSupabase?.();
const isOwner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&window.CellboundAdmin?.role==='owner';
const artUrl=path=>window.CellboundEnemyModel?.safeArt(path)&&path.startsWith('assets/')?new URL(path,document.baseURI).href:path&&db()?.storage?.from('cellbound-design-art').getPublicUrl(path)?.data?.publicUrl||'';
const safeUrl=url=>/^https:\/\//i.test(String(url||''))?String(url):'';
/* Boss loot is chosen from existing early-tier gear and profession reagents.
   No arbitrary item JSON, Tier 5 raid equipment or endgame-only materials. */
function lootCatalog(){
 const G=window.CellboundGear,P=window.CellboundProfessions;
 const gear=(G?.items||[]).filter(x=>x?.enabled&&x.dropEnabled&&x.tier<=2&&!x.raidExclusive).map(x=>({kind:'gear',key:String(x.itemId),label:String(x.name),tier:x.tier,slot:x.slot,klass:x.class}));
 const materials=Object.entries(P?.MATERIALS||{}).filter(([,m])=>m&&!m.endgame).map(([key,m])=>({kind:'material',key,label:m.name,rarity:m.rarity}));
 return{gear,materials}
}
function allowedDrop(raw){
 if(!raw||!['gear','material'].includes(raw.kind))return null;
 const catalog=lootCatalog(),source=(raw.kind==='gear'?catalog.gear:catalog.materials).find(x=>x.key===String(raw.key||''));
 if(!source)return null;
 const chance=Math.max(0,Math.min(100,Math.round(Number(raw.chance)||0)));
 const quantity=raw.kind==='gear'?1:Math.max(1,Math.min(5,Math.round(Number(raw.quantity)||1)));
 return{kind:raw.kind,key:source.key,chance,quantity}
}
function rollBossLoot(step,{random=Math.random}={}){
 const drops=Array.isArray(step?.drops)?step.drops.slice(0,6):[];
 const valid=drops.map(allowedDrop).filter(Boolean),gear=valid.filter(d=>d.kind==='gear');
 if(gear.length>2||gear.reduce((sum,d)=>sum+d.chance,0)>100)return[];
 return valid.filter(d=>d.chance>0&&random()*100<d.chance)
}
async function awardBossLoot(step,source,claimed,ledger,{preview=false,raid=false,random=Math.random}={}){
 if(preview||raid||!step||!claimed||!ledger||claimed.has(step.id))return[];
 // Mark the encounter before any async save, preventing double claims on repeated callbacks.
 claimed.add(step.id);
 const G=window.CellboundGear,Game=window.CellboundGame;
 if(!Game?.ready||!Game.addBankItem||!Game.addMaterial)return[];
 const awarded=[];
 for(const drop of rollBossLoot(step,{random})){
  if(drop.kind==='gear'){
   const base=G?.byId?.(drop.key);
   if(!base?.dropEnabled||!base?.enabled||base.tier>2||base.raidExclusive)continue;
   const item=G.rollItemAffixes({...base,source});
   Game.addBankItem(item);awarded.push({kind:'gear',name:item.name,quantity:1,tier:item.tier,source})
  }else{
   const info=window.CellboundProfessions?.MATERIALS?.[drop.key];
   if(!info||info.endgame)continue;
   Game.addMaterial(drop.key,drop.quantity);awarded.push({kind:'material',name:info.name,quantity:drop.quantity,source})
  }
 }
 ledger.push(...awarded);
 if(awarded.length){
  const state=Game.getState?.();
  if(state){state.activity=Array.isArray(state.activity)?state.activity:[];state.activity.push(source+' · Boss loot: '+awarded.map(x=>x.name+(x.quantity>1?' ×'+x.quantity:'')).join(', ')+'.')}
  Game.save?.();await Game.persistState?.();Game.renderAll?.()
 }
 return awarded
}
function bossLootNotice(step,awarded){
 return new Promise(resolve=>{
  const description=awarded.length
   ?'<div class="dbo-loot-list">'+awarded.map(item=>'<div><span>'+esc(item.kind==='gear'?'◆':'◇')+'</span><b>'+esc(item.name)+'</b><small>'+esc(item.kind==='gear'?'Equipment · Guild Bank':'Reagents · Materials')+'</small><strong>×'+item.quantity+'</strong></div>').join('')+'</div>'
   :'<p>Nothing dropped from this encounter.</p>';
  const root=modal({title:step.title,type:'Boss defeated',text:awarded.length?'The following rewards were added to your Guild Bank and materials.':'This boss has no reward roll this time.'},description,'<button type="button" class="primary" data-db-loot-next>CONTINUE →</button>');
  if(!root)return resolve();
  root.querySelector('[data-db-loot-next]').onclick=resolve
 })
}

function registerMinigame(template){
 if(!template||!/^[a-z0-9-]{3,64}$/.test(template.id)||typeof template.play!=='function')throw new Error('A minigame needs an ID and a playable handler.');
 if(templates.has(template.id))throw new Error('Duplicate minigame template '+template.id);
 templates.set(template.id,template);return template.id
}
const choicesFor=step=>(Array.isArray(step.choices)&&step.choices.length>=2?step.choices:['Left','Centre','Right']).slice(0,5).map(x=>String(x||'Option').slice(0,90));
function modal(step,body,actions=''){
 const overlay=$('#designAdventureOverlay');
 if(!overlay)return null;
 const art=safeUrl(artUrl(step.artPath));
 overlay.hidden=false;
 overlay.innerHTML='<section class="dbo-player-panel"><header><small>CELLBOUND · '+esc(step.type||'stage')+'</small><b>'+esc(step.title||'Encounter')+'</b><button type="button" data-db-quit>EXIT ×</button></header>'+
 (art?'<img src="'+esc(art)+'" alt="" draggable="false">':'')+
 '<div class="dbo-player-body">'+(step.text?'<p>'+esc(step.text)+'</p>':'')+body+'</div>'+
 '<footer>'+actions+'</footer></section>';
 overlay.querySelector('[data-db-quit]')?.addEventListener('click',()=>stop());
 return overlay
}
function stop(){
 activeSession++;playing=false;const overlay=$('#designAdventureOverlay');if(overlay){overlay.hidden=true;overlay.innerHTML=''}
 document.body.classList.remove('dbo-adventure-open');
 window.CellboundComicScenes?.close?.();
}
async function choiceMinigame(step){
 return await new Promise(resolve=>{
  const picks=choicesFor(step),answer=Math.max(0,Math.min(picks.length-1,Number(step.answer)||0));
  let attempts=0,done=false;
  const view=msg=>{
   const overlay=modal(step,'<h3>'+esc(step.prompt||'Choose the correct answer')+'</h3><div class="dbo-picks">'+picks.map((c,i)=>'<button type="button" data-db-pick="'+i+'">'+esc(c)+'</button>').join('')+'</div><p role="status" class="dbo-feedback">'+esc(msg||'')+'</p>');
   if(!overlay){resolve(false);return}
   overlay.querySelectorAll('[data-db-pick]').forEach(btn=>btn.addEventListener('click',()=>{
    if(done)return;
    attempts++;
    if(Number(btn.dataset.dbPick)===answer){done=true;overlay.querySelector('.dbo-feedback').textContent='Correct. The path is open.';overlay.querySelectorAll('[data-db-pick]').forEach(x=>x.disabled=true);const footer=overlay.querySelector('footer');footer.innerHTML='<button type="button" class="primary" data-db-done>CONTINUE →</button>';footer.querySelector('button').onclick=()=>resolve(true)}
    else{overlay.querySelector('.dbo-feedback').textContent='Not quite. Try another choice. ('+attempts+' attempts)'}
   }))
  };
  view()
 })
}
async function sequenceMinigame(step){
 return await new Promise(resolve=>{
  const picks=choicesFor(step),target=(Array.isArray(step.sequence)&&step.sequence.length?step.sequence:[0,1,2]).map(Number).filter(i=>i>=0&&i<picks.length).slice(0,8);
  if(!target.length)return resolve(false);
  let progress=0;
  const view=()=>{
   const overlay=modal(step,'<h3>'+esc(step.prompt||'Activate the symbols in the correct sequence')+'</h3><p class="dbo-progress">Symbols activated: '+progress+' / '+target.length+'</p><div class="dbo-picks">'+picks.map((c,i)=>'<button type="button" data-db-pick="'+i+'">'+esc(c)+'</button>').join('')+'</div><p role="status" class="dbo-feedback"></p>');
   if(!overlay){resolve(false);return}
   overlay.querySelectorAll('[data-db-pick]').forEach(btn=>btn.addEventListener('click',()=>{
    if(Number(btn.dataset.dbPick)===target[progress]){progress++;if(progress===target.length){
      overlay.querySelectorAll('[data-db-pick]').forEach(x=>x.disabled=true);overlay.querySelector('.dbo-feedback').textContent='Sequence complete.';overlay.querySelector('footer').innerHTML='<button class="primary" type="button" data-db-done>CONTINUE →</button>';overlay.querySelector('[data-db-done]').onclick=()=>resolve(true)
     }else view()
    }else{progress=0;view();overlay.querySelector('.dbo-feedback').textContent='The sequence resets. Try again.'}
   }))
  };view()
 })
}
registerMinigame({id:'choice',label:'Choice Puzzle',description:'Find the correct symbol, lever or route.',play:choiceMinigame});
registerMinigame({id:'sequence',label:'Sequence Puzzle',description:'Press symbols in the correct order.',play:sequenceMinigame});
function cleanBlueprint(x){
 const b=x&&typeof x==='object'?x:{};
 return{version:1,summary:String(b.summary||'').slice(0,500),level:Math.max(1,Math.min(75,Number(b.level)||1)),
  steps:(Array.isArray(b.steps)?b.steps:[]).slice(0,30).map(s=>({
   id:String(s.id||'step').slice(0,70),type:['comic','room','fight','minigame'].includes(s.type)?s.type:'room',
   title:String(s.title||'Untitled stage').slice(0,100),text:String(s.text||'').slice(0,1500),artPath:String(s.artPath||'').slice(0,255),
   panels:(Array.isArray(s.panels)?s.panels:[]).slice(0,6).map(p=>({title:String(p.title||'').slice(0,100),text:String(p.text||'').slice(0,550),artPath:String(p.artPath||'').slice(0,255)})),
   enemySpec:s.enemySpec==null?null:JSON.parse(JSON.stringify(s.enemySpec)),enemySource:s.enemySource?{slug:String(s.enemySource.slug||''),revision:Number(s.enemySource.revision)||0}:null,
   enemies:String(s.enemies||'Enemy').slice(0,280),enemyHealth:Math.max(30,Math.min(50000,Number(s.enemyHealth)||750)),
   mechanic:['none','circle','line','interrupt','adds'].includes(s.mechanic)?s.mechanic:'none',template:String(s.template||'choice').slice(0,64),
   prompt:String(s.prompt||'').slice(0,300),choices:choicesFor(s),answer:Math.max(0,Number(s.answer)||0),
   sequence:(Array.isArray(s.sequence)?s.sequence:[0,1,2]).slice(0,8).map(n=>Math.max(0,Number(n)||0)),
   drops:s.type==='fight'?(Array.isArray(s.drops)?s.drops:[]).slice(0,6).map(allowedDrop).filter(Boolean):[]
  }))}
}
function installDesignedItems(templates){
 const G=window.CellboundGear;if(!G?.items)return;
 // Only published, T1-T2 variants of known balanced items enter the game.
 // Never accept arbitrary stat, rarity, economy or combat metadata from a blueprint.
 for(let i=G.items.length-1;i>=0;i--)if(G.items[i]?.designedItem)G.items.splice(i,1);
 const originals=G.items.slice(),used=new Set(originals.map(x=>String(x.name||'').toLowerCase()));
 for(const row of templates||[]){
  if(row.kind!=='item'||!row.slug||!/^studio-item-[a-z0-9-]+$/.test(row.slug))continue;
  const data=row.blueprint&&typeof row.blueprint==='object'?row.blueprint:{};
  const base=originals.find(x=>x.itemId===data.baseItemId&&x.enabled&&x.dropEnabled&&x.tier<=2&&!x.raidExclusive);
  const name=String(row.title||'').trim().slice(0,120);
  if(!base||name.length<3||used.has(name.toLowerCase()))continue;
  used.add(name.toLowerCase());
  G.items.push({...base,itemId:'design-'+row.slug,baseItemId:base.itemId,appearanceId:base.appearanceId||base.itemId,
   name,designedItem:true,designedSlug:row.slug,description:String(data.description||'').slice(0,500),
   source:'Design Booth',enabled:true,dropEnabled:true,raidExclusive:false});
 }
}
async function refresh(force=false){
 if(loading)return loading;
 if(!db()||!window.CellboundGame?.ready)return false;
 if(!force&&Date.now()-lastRefresh<20000)return true;
 loading=(async()=>{
  const {data,error}=await db().from('cellbound_design_blueprints').select('id,slug,title,content_type,blueprint,version,published_at').eq('status','published').order('updated_at',{ascending:false});
  if(error)throw error;
  published.clear();(data||[]).forEach(row=>published.set(row.id,row));
  // A failed optional template lookup must never hide normal adventures.
  try{
   const {data:assets,error:assetError}=await db().from('cellbound_design_templates').select('slug,kind,title,blueprint').eq('status','published');
   if(assetError)throw assetError;
   installDesignedItems(assets||[]);
  }catch(e){console.warn('Designed item refresh unavailable:',e)}
  lastRefresh=Date.now();return true
 })().finally(()=>{loading=null});
 try{return await loading}catch(error){console.warn('Published Design Booth adventures unavailable:',error);return false}
}
function mountCards(type){
 const host=$('#designBoothAdventures-'+type);if(!host)return;
 const rows=[...published.values()].filter(x=>x.content_type===type);
 host.hidden=!rows.length;
 if(!rows.length){host.innerHTML='';return}
 host.innerHTML='<div class="dbo-public-head"><small>DESIGN BOOTH ADVENTURES</small><h3>New '+(type==='quest'?'Quests':type==='dungeon'?'Dungeons':'Raids')+'</h3><p>Created with the Cellbound Design Booth. Boss-specific gear and reagent drops are available in quests and dungeons. Raid prototypes and owner previews remain reward-free.</p></div><div class="dbo-public-grid">'+rows.map(r=>'<article><small>'+esc(type.toUpperCase())+' · '+cleanBlueprint(r.blueprint).steps.length+' STAGES</small><h4>'+esc(r.title)+'</h4><p>'+esc(cleanBlueprint(r.blueprint).summary)+'</p><button type="button" data-db-play="'+esc(r.id)+'">PLAY ADVENTURE →</button></article>').join('')+'</div>';
 host.querySelectorAll('[data-db-play]').forEach(btn=>btn.onclick=()=>play(btn.dataset.dbPlay))
}
function renderCards(){mountCards('quest');mountCards('dungeon');mountCards('raid')}
async function play(id,override=null){
 if(playing)return;
 const row=override||published.get(id);if(!row)return;
 const b=cleanBlueprint(row.blueprint||row.draft_blueprint);
 if(!b.steps.length){alert('This adventure has no playable stages.');return}
 try{for(const step of b.steps)if(step.enemySpec)window.CellboundEnemyModel.clean(step.enemySpec)}catch(e){alert('Invalid enemy configuration: '+e.message);return}
 const party=window.CellboundGame?.getPartyCharacters?.()||[];
 if(party.length!==5){alert('Build a five-character party before entering.');return}
 if(party.some(c=>Number(c.level||1)<b.level)){alert('Every character must be at least level '+b.level+'.');return}
 const token=++activeSession,claimed=new Set(),earned=[];let completed=true;playing=true;document.body.classList.add('dbo-adventure-open');
 try{
  for(let i=0;i<b.steps.length;i++){
   if(token!==activeSession)return;
   const step=b.steps[i],roomImg=safeUrl(artUrl(step.artPath));
   if(step.type==='comic'){
    const panels=(step.panels?.length?step.panels:[{title:step.title,text:step.text,artPath:step.artPath}]).map(p=>({kind:'location',title:p.title||step.title,text:p.text||step.text,artwork:safeUrl(artUrl(p.artPath||step.artPath))}));
    const result=await window.CellboundComicScenes?.show?.({eyebrow:String(row.content_type).toUpperCase()+' · '+(i+1)+' / '+b.steps.length,title:step.title,subtitle:row.title,page:'STORY',theme:'zeltira',panels,storyOnly:true,allowSkip:true});
    if(token!==activeSession)return
   }else if(step.type==='fight'){
    let enemies=step.enemies.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean).slice(0,5);
    let encounter={kind:enemies.length===1?'boss':'trash',level:b.level,enemyHealth:step.enemyHealth,mechanics:step.mechanic==='none'?[]:[{name:({'circle':'Ground Burst','line':'Sweeping Attack','interrupt':'Dangerous Cast','adds':'Reinforcements'})[step.mechanic]||'Mechanic',type:step.mechanic==='adds'?'adds':step.mechanic,duration:1600}],mechanicIntervalMs:step.mechanic==='none'?0:3600};
    if(step.enemySpec){encounter=window.CellboundEnemyModel.encounter(step.enemySpec);enemies=encounter.enemies}
    const markup=roomImg?'<div class="dbo-combat-art"><img src="'+esc(roomImg)+'" alt="" draggable="false"></div>':'';
    const won=await window.CellboundQuests?.runQuest2DFight?.({quest:row.title,title:step.title,location:step.enemySpec?.location||row.title,ambience:step.text,presentationKind:row.content_type==='quest'?'quest':'dungeon',enemies:enemies.length?enemies:['Enemy'],environmentMarkup:markup,combat:encounter,noLossPenalty:true,autoContinueOnVictory:true,autoContinueDelayMs:650,completeText:'The way ahead is clear.'});
    if(token!==activeSession)return;
    if(won!==true){completed=false;break}
    if(Array.isArray(step.drops)&&step.drops.length){
     const rewards=await awardBossLoot(step,row.title+' · '+step.title,claimed,earned,{preview:Boolean(override),raid:row.content_type==='raid'});
     if(token!==activeSession)return;
     if(!override&&row.content_type!=='raid'){await bossLootNotice(step,rewards);if(token!==activeSession)return}
    }
   }else if(step.type==='minigame'){
    const puzzle=templates.get(step.template)||templates.get('choice');
    const cleared=await puzzle.play(step);
    if(token!==activeSession||!cleared)return
   }else{
    const done=await new Promise(resolve=>{
     const root=modal(step,'<span class="dbo-stage-count">STAGE '+(i+1)+' OF '+b.steps.length+'</span>','<button class="primary" type="button" data-db-advance>CONTINUE →</button>');
     if(!root)return resolve(false);
     root.querySelector('[data-db-advance]').onclick=()=>resolve(true);
    });
    if(token!==activeSession||!done)return
   }
  }
  if(token===activeSession)await new Promise(resolve=>{
   const items=earned.map(item=>'<li>'+esc(item.name)+' ×'+item.quantity+' · '+esc(item.source)+'</li>').join('');
   const end=modal({title:completed?'Adventure complete':'Adventure ended',type:row.content_type,text:completed?'You reached the end of '+row.title+'.':'Your party did not clear the encounter. Return when you are ready.'},'<h3>'+(completed?'RUN COMPLETE':'RUN FAILED')+'</h3><p>'+(earned.length?'Boss loot already secured to your guild:':'No boss loot acquired this run.')+'</p>'+(items?'<ul>'+items+'</ul>':''),' <button type="button" class="primary" data-db-finish>RETURN TO GAME →</button>');
   if(!end)return resolve();
   end.querySelector('[data-db-finish]').onclick=resolve
  })
 }catch(e){console.error('Designed adventure failed',e);alert('Adventure could not continue: '+(e?.message||e))}
 finally{if(token===activeSession)stop()}
}

async function previewEnemy(raw){
 if(!window.CellboundBoothWorkflow?.can('template'))throw Error('Enemy preview requires Design Booth access.');
 if(playing)throw Error('Exit the current adventure before testing another encounter.');
 const spec=window.CellboundEnemyModel.clean(raw),combat=window.CellboundEnemyModel.encounter(spec);
 const party=window.CellboundGame?.getPartyCharacters?.()||[];
 if(party.length!==5)throw Error('Choose a five-character party first.');
 let result=null;playing=true;
 try{
  const url=safeUrl(artUrl(spec.artPath));
  await window.CellboundQuests.runQuest2DFight({quest:'DESIGN BOOTH · REWARD-FREE PREVIEW',title:spec.name,location:spec.location,ambience:spec.description,participants:JSON.parse(JSON.stringify(party)),enemies:combat.enemies,combat,noLossPenalty:true,presentationKind:'dungeon',environmentMarkup:url?'<div class="dbo-combat-art"><img src="'+esc(url)+'" alt="" draggable="false"></div>':'',completeText:'Preview complete. No XP, currency, items or progression were awarded.',onResult:r=>{result=r}});
  return result;
 }finally{playing=false}
}

function bind(){
 window.addEventListener('cellbound:view-changed',()=>{if(Date.now()-lastRefresh>20000)refresh().then(renderCards);else renderCards()});
 window.addEventListener('cellbound:design-published',()=>refresh(true).then(renderCards));
 const boot=async()=>{for(let i=0;i<80&&!window.CellboundGame?.ready;i++)await new Promise(r=>setTimeout(r,150));await refresh();renderCards()};
 boot()
}
window.CellboundDesignedContent={refresh,renderCards,play,stop,previewEnemy,cleanBlueprint,artUrl,lootCatalog,rollBossLoot,registerMinigame,templates:()=>[...templates.values()].map(({id,label,description})=>({id,label,description}))};
bind()
})();