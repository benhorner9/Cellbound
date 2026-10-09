(()=>{
'use strict';
const BAL=window.CellboundBalance;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const QUEST={
 id:'fourfold-lock',title:'The Fourfold Lock',difficulty:'Mystery',length:'Long',
 start:'A Strange Old Man · Zeltira Marketplace',
 summary:'A strange old man has left your guild a lockbox with four unmatched keyholes. The only clue he offered was simple: “Find what fits.”',
 rewards:['The Fractured Ages permanently unlocked','400 Gold','250 Guild Renown',(BAL?.CAMPAIGN_XP?.fourfoldLock||3800)+' XP each']
};
const KEY_SOURCES={
 'ashen-vault':{id:'cinder-key',name:'Cinder-Iron Key',icon:'♨',place:'The Ashen Vault',copy:'Warm metal scarred by furnace soot. Its teeth resemble no modern lock.'},
 'hollow-sanctum':{id:'blackglass-key',name:'Blackglass Key',icon:'◇',place:'The Hollow Sanctum',copy:'A key cut from black Cell glass. Silver marks move beneath its surface.'},
 'chaos-canyon':{id:'verdant-key',name:'Verdant Key',icon:'⌁',place:'Chaos Canyon',copy:'Root and metal have grown together around a key that should have rotted centuries ago.'},
 'blackout-station':{id:'relay-key',name:'Relay Key',icon:'⚡',place:'Blackout Station',copy:'A precision-machined key carrying a weak charge despite having no visible power source.'}
};
let Game=null;
const state=()=>Game?.getState?.();
function available(){
 const s=state();
 return Boolean(s?.progression?.ashenVaultUnlocked!==false&&s?.questSystem?.flags?.hollowSanctumUnlocked)
}
function ensure(){
 const s=state();if(!s)return null;
 s.questSystem=s.questSystem&&typeof s.questSystem==='object'?s.questSystem:{};
 const seed={version:1,started:false,stage:'old-man',keys:{},attempts:{},inserted:{},boxOpened:false,mapSolved:false,mapMistakes:0,complete:false,history:[],startedAt:null};
 const q=s.questSystem.fourfold=s.questSystem.fourfold&&typeof s.questSystem.fourfold==='object'?s.questSystem.fourfold:seed;
 q.version=1;q.keys=q.keys&&typeof q.keys==='object'?q.keys:{};q.attempts=q.attempts&&typeof q.attempts==='object'?q.attempts:{};q.inserted=q.inserted&&typeof q.inserted==='object'?q.inserted:{};
 q.history=Array.isArray(q.history)?q.history:[];q.stage=q.complete?'complete':q.stage||'old-man';q.mapMistakes=Math.max(0,Number(q.mapMistakes)||0);
 s.progression=s.progression&&typeof s.progression==='object'?s.progression:{};
 if(typeof s.progression.fracturedAgesUnlocked!=='boolean')s.progression.fracturedAgesUnlocked=Boolean(q.complete);
 return q
}
function history(text){const q=ensure();q.history.push({at:new Date().toISOString(),text});q.history=q.history.slice(-40)}
async function commit(note){
 if(note)history(note);
 Game.save?.();await Game.persistState?.();Game.renderAll?.();renderMarketplace();
 window.dispatchEvent(new CustomEvent('cellbound:fourfold-update'));
}
function notify(label,title,text){
 let e=$('#fourfoldToast');if(!e){e=document.createElement('div');e.id='fourfoldToast';e.className='fourfold-toast';document.body.appendChild(e)}
 e.innerHTML='<small>'+esc(label)+'</small><b>'+esc(title)+'</b><span>'+esc(text||'')+'</span>';e.classList.add('show');
 clearTimeout(e._timer);e._timer=setTimeout(()=>e.classList.remove('show'),4300)
}
const FOURFOLD_STORY_ART={
 oldMan:'./assets/bosses/fractured-ages-old-man.webp',
 hero:'./assets/dungeons/fractured-ages.webp',
 highNoon:'./assets/fractured-ages/rooms/high-noon.webp',
 firstKingdom:'./assets/fractured-ages/rooms/first-kingdom.webp',
 silentFrontier:'./assets/fractured-ages/rooms/silent-frontier.webp',
 funhouse:'./assets/fractured-ages/rooms/funhouse.webp',
 box:[
  './assets/comics/story-composites-2026/fourfold-stranger.svg',
  './assets/comics/story-composites-2026/fourfold-locked-coffer.svg',
  './assets/comics/story-composites-2026/fourfold-four-keyholes.svg'
 ],
 journey:[
  './assets/comics/story-composites-2026/fourfold-fractured-timeline.svg',
  './assets/comics/story-composites-2026/fourfold-worlds-through-time.svg',
  './assets/comics/story-composites-2026/fourfold-future-reveal.svg'
 ]
};
function fourfoldStoryArt(title){
 const key=String(title||'').toLowerCase();
 return key.includes('journey through the ages')?FOURFOLD_STORY_ART.journey:FOURFOLD_STORY_ART.box;
}
function legacyStory(title,speaker,lines,onDone,buttonText){
 let root=$('#fourfoldStory');if(!root){root=document.createElement('div');root.id='fourfoldStory';root.className='fourfold-story-backdrop';root.hidden=true;document.body.appendChild(root)}
 let index=0;
 const draw=()=>{
  const last=index>=lines.length-1;
  root.innerHTML='<section class="fourfold-story"><div class="fourfold-oldman">⌛</div><small>'+esc(speaker)+'</small><h2>'+esc(title)+'</h2><p>'+esc(lines[index])+'</p><div class="fourfold-story-step">'+(index+1)+' / '+lines.length+'</div><button data-fourfold-next>'+(last?esc(buttonText||'CONTINUE →'):'CONTINUE →')+'</button></section>';
  root.hidden=false;root.querySelector('[data-fourfold-next]').onclick=async()=>{if(!last){index++;draw();return}root.hidden=true;if(onDone)await onDone()}
 };
 draw()
}
function story(title,speaker,lines,onDone,buttonText){
 const C=window.CellboundComicScenes;
 if(typeof C?.show!=='function'){legacyStory(title,speaker,lines,onDone,buttonText);return}
 const art=fourfoldStoryArt(title),panels=art.map((artwork,i)=>({
  kind:i===0?'npc':'location',artwork,
  eyebrow:i===0?'ZELTIRA MARKETPLACE':'THE FRACTURED AGES',
  title:i===0?speaker:'',
  text:'',wide:false
 }));
 const placements=['bottom-left','top-right','bottom-right','top-left'];
 C.show({
  eyebrow:'CELLBOUND · MYSTERY',
  title,
  subtitle:speaker,
  page:'THE FOURFOLD LOCK',
  theme:'fourfold',
  panels,
  reveals:(Array.isArray(lines)?lines:[lines]).map((text,i)=>({
   panel:i%panels.length,
   placement:placements[i%placements.length],
   speaker,
   eyebrow:i===0?'A STRANGE ENCOUNTER':'',
   text:String(text||'')
  })),
  progressive:true,
  panelOnly:true,
  allowSkip:true,
  skipLabel:'SKIP STORY',
  nextLabel:'NEXT →',
  continueLabel:buttonText||'CONTINUE →'
 }).then(async()=>{if(onDone)await onDone()}).catch(error=>{
  console.warn('Fourfold comic presentation recovered',error);
  legacyStory(title,speaker,lines,onDone,buttonText)
 })
}
async function start(){
 const q=ensure();if(!available()&&!q.started)return;
 if(q.started){Game.switchView?.('quests');return}
 story('An Unremarkable Box','Strange Old Man',[
  'Funny thing about locks. Everyone assumes they are designed to keep people out.',
  'This one has spent a very long time waiting for somebody to let something out.',
  'Four holes. Four keys. I could tell you where they are, of course. But then you would learn nothing.',
  'Find what fits.'
 ],async()=>{
  q.started=true;q.stage='keys';q.startedAt=new Date().toISOString();
  await commit('A strange old man in Zeltira Marketplace gave the guild a four-key lockbox.');
  window.CellboundQuests?.selectAdventure?.('fourfold-lock');Game.switchView?.('quests')
 },'TAKE THE LOCKBOX')
}
function keyCount(q=ensure()){return Object.keys(KEY_SOURCES).filter(id=>q.keys[id]).length}
function insertCount(q=ensure()){return Object.keys(KEY_SOURCES).filter(id=>q.inserted[id]).length}
function rollChance(attempt){return BAL?.fourfoldKeyChance?.(attempt)??(attempt>=4?1:[0,.35,.60,.85][Math.max(1,Number(attempt)||1)])}
async function dungeonComplete(detail){
 const id=detail?.id,q=ensure(),def=KEY_SOURCES[id];
 if(!def||!q?.started||q.complete||q.keys[id])return;
 const attempt=q.attempts[id]=(Number(q.attempts[id])||0)+1,chance=rollChance(attempt);
 if(Math.random()<chance){
  q.keys[id]={foundAt:new Date().toISOString(),attempt};
  history(def.name+' was recovered from '+def.place+'.');
  notify('QUEST ITEM FOUND',def.name,'The lockbox reacts the moment the key enters your possession.');
  window.CellboundFX?.quest?.({eyebrow:'QUEST ITEM FOUND',title:def.name,copy:'Recovered from '+def.place+'.',icon:def.icon,tone:'arcane',duration:1500});
  state().activity=Array.isArray(state().activity)?state().activity:[];state().activity.push('Quest item found: '+def.name+' · '+def.place+'.');
  if(keyCount(q)===4)q.stage='box'
 }
 await commit()
}
async function insertKey(id){
 const q=ensure(),def=KEY_SOURCES[id];if(!def||!q.keys[id]||q.inserted[id])return;
 q.inserted[id]=true;
 await commit(def.name+' turned once inside the lockbox.');
 notify('LOCKBOX',def.name,'One of the four mechanisms unlocks.');
 window.CellboundFX?.key?.(def.name);window.CellboundFX?.pulse?.('.fourfold-lockbox');
 if(insertCount(q)===4){q.stage='box';await commit('All four mechanisms inside the lockbox are unlocked.');window.CellboundFX?.callout?.({eyebrow:'FOUR LOCKS OPEN',title:'The lockbox is ready.',tone:'arcane'})}
}
function puzzleRoot(){
 let e=$('#fourfoldPuzzle');if(e)return e;e=document.createElement('div');e.id='fourfoldPuzzle';e.className='fourfold-puzzle-backdrop';e.hidden=true;document.body.appendChild(e);return e
}
async function openBox(){
 const q=ensure();if(insertCount(q)!==4)return;
 q.boxOpened=true;q.stage='map';await commit('The Fourfold Lock opened. Inside was a parchment map that did not show a single fixed time.');
 window.CellboundFX?.callout?.({eyebrow:'THE FOURFOLD LOCK OPENS',title:'Something inside is moving.',tone:'story',duration:1450});
 openMap()
}
function mapEra(id,label,year,options){
 return '<section class="chrono-era" data-era="'+id+'"><header><small>'+esc(year)+'</small><b>'+esc(label)+'</b></header><div class="chrono-options">'+options.map(o=>'<button data-anchor="'+id+':'+o.id+'"><i>'+o.icon+'</i><b>'+esc(o.name)+'</b><span>'+esc(o.copy)+'</span></button>').join('')+'</div></section>'
}
function openMap(){
 const q=ensure();if(!q.started||q.complete)return;
 if(!q.boxOpened){openBox();return}
 const root=puzzleRoot(),selected={ancient:null,medieval:null,frontier:null,future:null};
 const eras=[
  ['ancient','FIRST AGE','UNKNOWN',[
   {id:'river',icon:'≈',name:'Split River Shrine',copy:'Two rivers meet beneath four black stones planted in a perfect square.'},
   {id:'dunes',icon:'△',name:'Dune Observatory',copy:'A sun wheel faces east from a field of pale sand.'},
   {id:'forest',icon:'♣',name:'Hollow Grove',copy:'Carved trees surround a spring with no visible source.'}
  ]],
  ['medieval','IRON AGE','712 YEARS AGO',[
   {id:'harbour',icon:'⚓',name:'Grey Harbour',copy:'A keep watches the sea from black cliffs.'},
   {id:'fortress',icon:'♜',name:'Fourstone Keep',copy:'A fortress encloses four black pillars where two old waterways once met.'},
   {id:'abbey',icon:'✦',name:'Sun Abbey',copy:'Gold windows face the sunrise above terraced farms.'}
  ]],
  ['frontier','FRONTIER AGE','184 YEARS AGO',[
   {id:'mine',icon:'◆',name:'Redglass Mine',copy:'A mining camp clings to a copper canyon.'},
   {id:'station',icon:'⌂',name:'Fourpost Station',copy:'A dusty fort reuses four black posts beside the scar of a dried forked river.'},
   {id:'rail',icon:'═',name:'Last Rail',copy:'A rail terminus runs toward mountains marked with white paint.'}
  ]],
  ['future','LAST AGE','DATE UNKNOWN',[
   {id:'array',icon:'◎',name:'Quadrant Array',copy:'Four obsidian pylons surround a reactor built above two buried water channels.'},
   {id:'orbital',icon:'◉',name:'Orbital Gate',copy:'A launch tower hangs over a coastal megacity.'},
   {id:'vault',icon:'⬡',name:'Deep Cell Vault',copy:'A sealed research complex descends beneath blue ice.'}
  ]]
 ];
 root.innerHTML='<section class="chronomap"><header class="chronomap-head"><div><small>THE LIVING MAP</small><h2>Find the same place through four ages.</h2><p>Landmarks change. Geography remembers. Select one location in every age, then trace the timeline.</p></div><button data-map-close aria-label="Close map">×</button></header><div class="chrono-dial"><span>PAST</span><i></i><b>TIME ANCHORS</b><i></i><span>FUTURE</span></div><div class="chrono-eras">'+eras.map(x=>mapEra(...x)).join('')+'</div><div class="chrono-result" id="chronoResult"><span>Look for what survives when names, buildings and people disappear.</span><button data-trace disabled>TRACE THE TIMELINE →</button></div></section>';
 root.hidden=false;document.body.classList.add('fourfold-puzzle-open');
 root.querySelector('[data-map-close]').onclick=()=>{root.hidden=true;document.body.classList.remove('fourfold-puzzle-open')};
 root.querySelectorAll('[data-anchor]').forEach(btn=>btn.onclick=()=>{
  const [era,id]=btn.dataset.anchor.split(':');selected[era]=id;
  root.querySelectorAll('[data-anchor^="'+era+':"]').forEach(x=>x.classList.toggle('selected',x===btn));
  root.querySelector('[data-trace]').disabled=Object.values(selected).some(v=>!v)
 });
 root.querySelector('[data-trace]').onclick=async()=>{
  const ok=selected.ancient==='river'&&selected.medieval==='fortress'&&selected.frontier==='station'&&selected.future==='array',result=$('#chronoResult');
  if(!ok){
   q.mapMistakes++;root.querySelector('.chronomap').classList.add('wrong');window.CellboundFX?.shake?.('soft');window.CellboundFX?.flash?.('danger');setTimeout(()=>root.querySelector('.chronomap')?.classList.remove('wrong'),520);
   result.querySelector('span').textContent='The ink runs backward. One or more anchors belong to a different place.';
   await commit();return
  }
  root.querySelector('.chronomap').classList.add('solved');
  result.innerHTML='<strong>⌛</strong><b>YOU FOUND ME.</b><span>The roads vanish. The map is becoming ash.</span>';
  q.mapSolved=true;q.stage='return';history('The living map revealed one location repeated through four ages, then disintegrated.');
  await commit();window.CellboundFX?.callout?.({eyebrow:'THE MAP REMEMBERS',title:'YOU FOUND ME.',tone:'story',duration:1800});
  setTimeout(()=>{root.classList.add('disintegrating')},850);
  setTimeout(()=>{root.hidden=true;root.classList.remove('disintegrating');document.body.classList.remove('fourfold-puzzle-open');Game.switchView?.('quests')},2100)
 }
}
async function finish(){
 const q=ensure();if(!q.mapSolved||q.complete)return;
 story('A Journey Through the Ages','Strange Old Man',[
  'Well. You opened it.',
  'You looked at that map and saw places. That was your first mistake.',
  'They were not places. They were moments.',
  'You have spent all this time believing this world is exactly what it appears to be. Stone. Steel. Cells. Monsters.',
  'It is not.',
  'Come. I think it is time somebody showed you what came before... and what comes after.'
 ],async()=>{
  q.complete=true;q.stage='complete';q.completedAt=new Date().toISOString();
  const s=state();s.progression.fracturedAgesUnlocked=true;s.gold=(Number(s.gold)||0)+400;s.renown=(Number(s.renown)||0)+250;
  s.activity=Array.isArray(s.activity)?s.activity:[];s.activity.push('Quest complete: The Fourfold Lock. The Fractured Ages was unlocked.');
  await Game.awardPartyXp?.(BAL?.CAMPAIGN_XP?.fourfoldLock||3800,{source:'Quest complete · The Fourfold Lock'});
  await commit('The Strange Old Man opened a route into The Fractured Ages.');
  window.CellboundFX?.unlock?.('The Fractured Ages','A fifth dungeon has appeared beyond the normal world.');
  completion()
 },'FOLLOW THE OLD MAN')
}
async function completion(){
 const C=window.CellboundComicScenes;
 if(typeof C?.show==='function'){
  try{
   await C.show({
    eyebrow:'QUEST COMPLETE',title:'The Fourfold Lock',subtitle:'The map is ash. The road through time is open.',page:'COMPLETE',theme:'fourfold',
    panels:[
     {kind:'npc',artwork:FOURFOLD_STORY_ART.oldMan,eyebrow:'THE STRANGE OLD MAN',title:'He kept his promise.',text:'The lockbox is empty. The living map is gone. Only the route remains.'},
     {kind:'location',artwork:FOURFOLD_STORY_ART.hero,eyebrow:'PERMANENT UNLOCK',title:'THE FRACTURED AGES',text:'A fifth dungeon now exists beyond the normal roads of the world.'},
     {kind:'location',artwork:FOURFOLD_STORY_ART.funhouse,eyebrow:'REWARDS',title:'+400 Gold · +250 Renown · +'+(BAL?.CAMPAIGN_XP?.fourfoldLock||3800)+' XP',text:'The active five are rewarded and the Fractured Ages is permanently unlocked.'}
    ],
    progressive:true,panelOnly:true,allowSkip:false,nextLabel:'NEXT →',continueLabel:'OPEN DUNGEON JOURNAL →'
   });
   Game.switchView?.('content');setTimeout(()=>window.CellboundDungeonBrowser?.open?.('fractured-ages'),50);return
  }catch(error){console.warn('Fourfold completion comic recovered',error)}
 }
 const root=document.createElement('div');root.className='fourfold-complete-backdrop';
 root.innerHTML='<section class="fourfold-complete"><small>QUEST COMPLETE</small><h2>The Fourfold Lock</h2><p>The box is empty. The map is ash. Somewhere beyond the marketplace, history has stopped behaving.</p><div><article><span>GOLD</span><b>+400</b></article><article><span>RENOWN</span><b>+250</b></article><article><span>PARTY XP</span><b>+'+(BAL?.CAMPAIGN_XP?.fourfoldLock||3800)+'</b></article><article><span>DUNGEON</span><b>UNLOCKED</b></article></div><section><small>PERMANENT UNLOCK</small><h3>The Fractured Ages</h3><p>Follow the Strange Old Man through a western shootout, an iron kingdom, an ancient temple, the lunar frontier and whatever waits at the end of time.</p></section><button>OPEN DUNGEON JOURNAL →</button></section>';
 document.body.appendChild(root);root.querySelector('button').onclick=()=>{root.remove();Game.switchView?.('content');setTimeout(()=>window.CellboundDungeonBrowser?.open?.('fractured-ages'),50)}
}
function stageCopy(q){
 if(q.complete)return['The Fractured Ages','The old man kept his promise. A fifth dungeon now waits beyond the normal world.'];
 if(!q.started)return['The Man in the Marketplace','A strange old man has been watching your guild from beside the exchange.'];
 if(q.stage==='keys')return['Find What Fits','The lockbox has four keyholes. Its keys appear to have been scattered through four very different dungeons.'];
 if(q.stage==='box')return['Four Locks, One Box','Every required key has been found. Insert them into the lockbox.'];
 if(q.stage==='map')return['The Living Map','The lockbox contained a map that changes when you look at it. Find the same place through four ages.'];
 if(q.stage==='return')return['You Found Me','The map disintegrated after revealing its message. The old man is back in the marketplace.'];
 return['The Fourfold Lock','Follow the old man’s trail.']
}
function card(){
 const q=ensure();if(!q)return null;const locked=!available()&&!q.started;
 return{id:'fourfold-lock',title:QUEST.title,meta:'Long adventure · Four dungeons',difficulty:QUEST.difficulty,status:q.complete?'COMPLETE':q.started?'IN PROGRESS':locked?'LOCKED':'AVAILABLE',complete:q.complete,locked,icon:'⌗'}
}
function actionHtml(q){
 if(q.complete)return'<button data-fourfold-dungeon>OPEN THE FRACTURED AGES →</button>';
 if(!q.started)return available()?'<button data-fourfold-start>APPROACH THE OLD MAN →</button>':'<button disabled>DISCOVER THE HOLLOW SANCTUM FIRST</button>';
 if(q.stage==='keys'||q.stage==='box'){
  if(insertCount(q)===4)return'<button data-fourfold-open>OPEN THE LOCKBOX →</button>';
  return'<span class="fourfold-action-note">'+keyCount(q)+' / 4 keys found · '+insertCount(q)+' / 4 inserted</span>'
 }
 if(q.stage==='map')return'<button data-fourfold-map>EXAMINE THE LIVING MAP →</button>';
 if(q.stage==='return')return'<button data-fourfold-finish>RETURN TO THE OLD MAN →</button>';
 return''
}
function keysMarkup(q){
 return Object.entries(KEY_SOURCES).map(([id,k])=>{
  const found=Boolean(q.keys[id]),inserted=Boolean(q.inserted[id]),attempt=Number(q.attempts[id])||0;
  const keyArt=found&&window.CellboundItemArt?.artHTML?window.CellboundItemArt.artHTML({id:k.id,itemId:k.id,name:k.name,category:'key',rarity:'Rare'},48,'fourfold-key-art'):k.icon;return'<article class="fourfold-key '+(inserted?'inserted':found?'found':'')+'"><i>'+keyArt+'</i><div><small>'+esc(k.place.toUpperCase())+'</small><b>'+esc(found?k.name:'Unknown Key')+'</b><p>'+esc(found?k.copy:'The lockbox offers no clue beyond the shape of this keyhole.')+'</p><em>'+(inserted?'KEY INSERTED':found?'KEY RECOVERED':attempt?attempt+' eligible clear'+(attempt===1?'':'s')+' searched':'NOT YET FOUND')+'</em></div>'+(found&&!inserted?'<button data-insert-key="'+id+'">USE KEY</button>':'')+'</article>'
 }).join('')
}
function renderDetail(root,side){
 const q=ensure(),locked=!available()&&!q.started,[label,copy]=stageCopy(q);
 root.innerHTML='<div class="quest-v3-hero fourfold-quest-hero"><div><small>MYSTERY · LONG ADVENTURE</small><h2>The Fourfold Lock</h2><p>'+esc(QUEST.start)+'</p></div><span class="quest-v3-status '+(q.complete?'complete':'')+'">'+(q.complete?'COMPLETE':q.started?'IN PROGRESS':locked?'LOCKED':'AVAILABLE')+'</span></div><div class="quest-v3-story"><p>'+esc(QUEST.summary)+'</p></div><section class="quest-v3-clue"><small>'+(q.complete?'WHERE IT LED':'CURRENT CLUE')+'</small><h3>'+esc(label)+'</h3><p>'+esc(copy)+'</p></section>'+(q.started&&!q.complete?'<section class="fourfold-lockbox"><div class="fourfold-box"><span>⌗</span><b>THE LOCKBOX</b><small>'+insertCount(q)+' / 4 LOCKS OPEN</small></div><div class="fourfold-key-grid">'+keysMarkup(q)+'</div></section>':'')+'<div class="quest-detail-action">'+actionHtml(q)+'</div>';
 side.innerHTML='<section><small>QUEST RULE</small><div class="quest-reward-list"><p>Each current dungeon final clear can reveal its unique key.</p><p>Key chance: 35% → 60% → 85%.</p><p>The fourth eligible clear is guaranteed if the key has not dropped.</p></div></section><section><small>REWARDS</small><div class="quest-reward-list">'+QUEST.rewards.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div></section><section><small>ADVENTURE JOURNAL</small><div class="quest-history">'+(q.history.slice(-7).reverse().map(h=>'<p>'+esc(h.text)+'</p>').join('')||'<p>The old man has not spoken to your guild yet.</p>')+'</div></section>'+(document.querySelector('#adminNav:not([hidden])')&&q.started&&!q.complete?'<section class="fourfold-dev"><small>DEV TESTING</small><button data-fourfold-dev-keys>GRANT FOUR KEYS</button></section>':'');
 bindDetail()
}
function bindDetail(){
 $('[data-fourfold-start]')?.addEventListener('click',start);
 $$('[data-insert-key]').forEach(b=>b.addEventListener('click',()=>insertKey(b.dataset.insertKey)));
 $('[data-fourfold-open]')?.addEventListener('click',openBox);
 $('[data-fourfold-map]')?.addEventListener('click',openMap);
 $('[data-fourfold-finish]')?.addEventListener('click',finish);
 $('[data-fourfold-dungeon]')?.addEventListener('click',()=>{Game.switchView?.('content');setTimeout(()=>window.CellboundDungeonBrowser?.open?.('fractured-ages'),50)});
 $('[data-fourfold-dev-keys]')?.addEventListener('click',async()=>{const q=ensure();Object.keys(KEY_SOURCES).forEach(id=>q.keys[id]=q.keys[id]||{foundAt:new Date().toISOString(),attempt:'DEV'});q.stage='box';await commit('Developer test: all four keys granted.');notify('DEV TEST','Four keys granted','Use each key on the lockbox to continue.')})
}
function homeState(){
 const q=ensure();if(!q||q.complete||(!q.started&&!available()))return{active:false};
 const [label,copy]=stageCopy(q);return{active:true,small:'MYSTERY ADVENTURE',title:q.started?copy:'A strange old man is waiting in Zeltira Marketplace.',label}
}
function open(){window.CellboundQuests?.selectAdventure?.('fourfold-lock');Game.switchView?.('quests')}
function renderMarketplace(){
 const host=$('#trading');if(!host||!Game?.ready)return;let mount=$('#fourfoldMarketEncounter');
 if(!mount){mount=document.createElement('div');mount.id='fourfoldMarketEncounter';const intro=host.querySelector('.section-intro');intro?.insertAdjacentElement('afterend',mount)}
 const q=ensure();if((!available()&&!q.started)||q.complete){mount.innerHTML='';return}
 const waiting=!q.started||q.stage==='return';
 if(!waiting){mount.innerHTML='<article class="fourfold-market gone"><span>⌛</span><div><small>ZELTIRA MARKETPLACE</small><b>The old man is gone.</b><p>The place where he sat is empty. The lockbox is the only proof he was ever here.</p></div><button data-fourfold-journal>OPEN QUEST</button></article>';mount.querySelector('[data-fourfold-journal]').onclick=open;return}
 mount.innerHTML='<article class="fourfold-market"><span class="fourfold-market-npc">⌛</span><div><small>ZELTIRA MARKETPLACE · STRANGE ENCOUNTER</small><b>'+(q.stage==='return'?'He is waiting for you.':'A strange old man is watching the crowd.')+'</b><p>'+(q.stage==='return'?'He glances at the ash still clinging to your hands and smiles.':'Nobody else seems interested in him. The moment you look his way, he taps a small metal box beside his boot.')+'</p></div><button data-fourfold-market>'+(q.stage==='return'?'SPEAK TO HIM':'APPROACH')+'</button></article>';
 mount.querySelector('[data-fourfold-market]').onclick=q.stage==='return'?finish:start
}
function bind(){
 window.addEventListener('cellbound:dungeon-complete',e=>dungeonComplete(e.detail||{}));
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='trading')renderMarketplace()});
 document.querySelector('.nav-btn[data-view="trading"]')?.addEventListener('click',renderMarketplace)
}
function init(){
 Game=window.CellboundGame;if(!Game?.ready||!window.CellboundQuests){setTimeout(init,120);return}
 ensure();bind();renderMarketplace();
 window.CellboundFourfoldLock={card,renderDetail,homeState,open,ensure,renderMarketplace,start,openMap};
 window.CellboundQuests.render?.()
}
init();
})();