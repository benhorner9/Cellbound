'use strict';

const SUPABASE_URL='https://jvydqeikdpelmtloulnd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl';
const REMEMBER_KEY='cellbound-remember-device';
const authStorage={
  getItem:k=>localStorage.getItem(k)??sessionStorage.getItem(k),
  setItem(k,v){const remember=localStorage.getItem(REMEMBER_KEY)==='1';const a=remember?localStorage:sessionStorage,b=remember?sessionStorage:localStorage;a.setItem(k,v);b.removeItem(k)},
  removeItem(k){localStorage.removeItem(k);sessionStorage.removeItem(k)}
};
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:authStorage}});
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const ui={
  playerName:$('playerName'),level:$('level'),hpFill:$('hpFill'),hpText:$('hpText'),focusFill:$('focusFill'),
  bossHud:$('bossHud'),bossFill:$('bossFill'),bossPct:$('bossPct'),bossState:$('bossState'),
  miniTitle:$('miniTitle'),miniState:$('miniState'),miniObjective:$('miniObjective'),questTitle:$('questTitle'),questText:$('questText'),
  chatLog:$('chatLog'),toast:$('toast'),basicBtn:$('basicBtn'),basicIcon:$('basicIcon'),slamBtn:$('slamBtn'),slamLabel:$('slamLabel'),slamCooldown:$('slamCooldown'),
  inventoryBtn:$('inventoryBtn'),cellsBtn:$('cellsBtn'),joy:$('joy'),knob:$('knob'),action:$('action'),actionIcon:$('actionIcon'),actionLabel:$('actionLabel'),prompt:$('prompt'),
  dialog:$('dialog'),dialogName:$('dialogName'),dialogText:$('dialogText'),dialogPortrait:$('dialogPortrait'),next:$('next'),
  inventoryPanel:$('inventoryPanel'),inventoryGrid:$('inventoryGrid'),itemDetail:$('itemDetail'),cellsPanel:$('cellsPanel'),cellList:$('cellList'),absorbBtn:$('absorbBtn'),
  deathPanel:$('deathPanel'),retryBtn:$('retryBtn'),completionPanel:$('completionPanel'),completionBtn:$('completionBtn'),loading:$('loading'),loadingText:$('loadingText')
};

const PIX=3;
let vw=0,vh=0,last=performance.now(),elapsed=0,mode='town',paused=true;
let dialogueQueue=[],dialogueIndex=0,slamCd=0,trollCd=0,trollState='idle',trollTimer=0,shake=0,flash=0,joyPointer=null,joyVec={x:0,y:0},toastTimer=0,autosaveTimer=0,dummyHit=0;
let selectedTarget=null,pointerTarget=null,autoAttackTimer=0,attackPulse=0;
const keys=new Set();
const world={w:1100,h:800};
const camera={x:0,y:0};
const player={x:550,y:650,hp:100,max:100,speed:112,name:'Bound One',style:'melee',level:1,walk:0,face:0,characterId:null,userId:null,appearance:{},tutorialStage:'arrived_curo',tutorialComplete:false,rewardClaimed:false};
const mage={x:610,y:400};
const shopkeeper={x:292,y:315};
const gatekeeper={x:550,y:225};
const troll={x:550,y:260,hp:320,max:320,on:false,dead:false,hit:0};
const dummy={x:720,y:390,hp:42,max:42,active:false,dead:false};
const portal={x:550,y:595,active:false};
let inventory=[],cells=[],abilities=[],quests=[];

const buildings=[
  {x:150,y:150,w:190,h:132,name:'CURO GOODS',roof:'#9c5542'},
  {x:760,y:155,w:190,h:135,name:'SUNLIT CUP',roof:'#8f493e'},
  {x:125,y:500,w:170,h:115,name:'COTTAGE',roof:'#6d5141'},
  {x:815,y:505,w:160,h:112,name:'HOME',roof:'#80503f'},
  {x:455,y:54,w:205,h:120,name:'OLD HALL',roof:'#58604a'}
];
const townTrees=[[64,80],[94,245],[60,690],[245,720],[985,82],[1015,240],[1025,650],[858,700],[352,88],[744,84],[357,690],[742,690],[385,570],[720,570],[388,250],[710,250]];
const mageIntro=["There you are. I've been waiting for you.","Curo is peaceful, but the world beyond it is not.","Power here isn't simply learned. Some creatures carry something rarer: Cells.","Defeat something powerful enough and you may claim the Cell it leaves behind.","Come. There is something beneath Curo you need to see."];
const dungeonIntro=["This chamber has been sealed beneath Curo for longer than anyone remembers.","Remember what I told you. Powerful creatures are the path to Cells.","When Gorvak appears, select him once. Your character will move into range and keep attacking.","And sometimes... they find you first."];
const cellDialogue=["That's a Cell.","Creatures like Gorvak don't surrender their power easily. But now it's yours.","Open your Cells and absorb it. Then show me what it gave you."];
const finalDialogue=["You understand now.","The creatures beyond Curo are stronger than anything you've seen here. So are the Cells they carry.","What you become from here is up to you."];
const postDialogue=["The first Cell is already changing the way you carry yourself.","Keep your eyes open beyond Curo. Power rarely announces itself twice."];

function resize(){vw=Math.ceil(innerWidth/PIX);vh=Math.ceil(innerHeight/PIX);canvas.width=vw;canvas.height=vh;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.imageSmoothingEnabled=false}
addEventListener('resize',resize);resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const sx=x=>Math.round(x-camera.x),sy=y=>Math.round(y-camera.y);
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function px(x,y,c,s=1){rect(x,y,s,s,c)}
function shadow(x,y,w,h){ctx.fillStyle='#0006';ctx.fillRect(Math.round(x-w/2),Math.round(y),Math.round(w),Math.round(h))}
function log(message,tone=''){const d=document.createElement('div');d.className=tone;d.innerHTML=message;ui.chatLog.appendChild(d);while(ui.chatLog.children.length>8)ui.chatLog.removeChild(ui.chatLog.firstChild);ui.chatLog.scrollTop=ui.chatLog.scrollHeight}
function toast(message,ms=2200){ui.toast.textContent=message;ui.toast.hidden=false;toastTimer=ms/1000}
function setQuest(title,text){ui.questTitle.textContent=title;ui.questText.textContent=text}
function setAction(label,icon='✦',prompt=''){ui.actionLabel.textContent=label;ui.actionIcon.textContent=icon;ui.prompt.textContent=prompt;ui.prompt.hidden=!prompt}
function combatMeta(){
  if(player.style==='ranged')return{range:145,damage:21,speed:1.05,icon:'➶'};
  if(player.style==='magic')return{range:135,damage:23,speed:1.12,icon:'✦'};
  return{range:72,damage:26,speed:.96,icon:'⚔'};
}
function updateHUD(){
  ui.playerName.textContent=player.name.toUpperCase();ui.level.textContent=player.level;
  ui.hpFill.style.width=`${clamp(player.hp/player.max*100,0,100)}%`;ui.hpText.textContent=`${Math.ceil(player.hp)} / ${player.max}`;
  ui.bossFill.style.width=`${clamp(troll.hp/troll.max*100,0,100)}%`;ui.bossPct.textContent=`${Math.ceil(clamp(troll.hp/troll.max*100,0,100))}%`;
  const hasSlam=abilities.some(a=>a.ability_key==='troll_slam');ui.slamBtn.disabled=!hasSlam;ui.slamBtn.classList.toggle('locked',!hasSlam);
  ui.slamLabel.textContent=hasSlam?(slamCd>0?`${slamCd.toFixed(1)}s`:'SLAM'):'LOCKED';ui.slamCooldown.style.height=hasSlam&&slamCd>0?`${clamp(slamCd/6*100,0,100)}%`:'0%';ui.focusFill.style.width=hasSlam?'100%':'0%';
  ui.basicBtn.classList.toggle('active',selectedTarget===troll&&!troll.dead);
}

async function saveCharacter(fields={}){if(!player.characterId)return;const payload={last_played_at:new Date().toISOString(),updated_at:new Date().toISOString(),...fields};const {error}=await supabaseClient.from('characters').update(payload).eq('id',player.characterId).eq('user_id',player.userId);if(error)console.warn('Character save failed',error.message)}
async function saveStage(stage,extra={}){player.tutorialStage=stage;await saveCharacter({tutorial_stage:stage,current_location:mode,...extra})}
async function loadPersistentState(){
  const {data:session,error:sessionError}=await supabaseClient.auth.getSession();if(sessionError||!session.session?.user){location.replace('./index.html');return false}
  player.userId=session.session.user.id;
  const {data:char,error}=await supabaseClient.from('characters').select('id,name,combat_style,appearance,level,current_hp,max_hp,current_location,tutorial_stage,tutorial_complete,tutorial_reward_claimed,creation_complete').eq('user_id',player.userId).order('created_at',{ascending:true}).limit(1).maybeSingle();
  if(error||!char?.creation_complete){location.replace('./character.html');return false}
  player.characterId=char.id;player.name=char.name||player.name;player.style=char.combat_style||player.style;player.appearance=char.appearance||{};player.level=char.level||1;player.max=char.max_hp||100;player.hp=clamp(char.current_hp??player.max,1,player.max);player.tutorialStage=char.tutorial_stage||'arrived_curo';player.tutorialComplete=!!char.tutorial_complete;player.rewardClaimed=!!char.tutorial_reward_claimed;
  const [invRes,cellRes,abilityRes,questRes]=await Promise.all([
    supabaseClient.from('inventory_items').select('*').eq('character_id',player.characterId).order('created_at'),
    supabaseClient.from('character_cells').select('*').eq('character_id',player.characterId).order('acquired_at'),
    supabaseClient.from('character_abilities').select('*').eq('character_id',player.characterId).order('hotbar_slot'),
    supabaseClient.from('quest_progress').select('*').eq('character_id',player.characterId).order('created_at')
  ]);
  inventory=invRes.data||[];cells=cellRes.data||[];abilities=abilityRes.data||[];quests=questRes.data||[];return true;
}
function renderInventory(){ui.inventoryGrid.innerHTML='';const starter=[{item_key:'starter_blade',item_name:player.style==='magic'?'Apprentice Focus':player.style==='ranged'?'Ash Shortbow':'Curo Blade',item_type:'weapon',quantity:1,rarity:'common',metadata:{description:'Your first reliable weapon.'}}];const all=[...starter,...inventory];all.forEach(item=>{const b=document.createElement('button');b.className=`inv-item ${item.rarity==='rare'?'rare':''}`;const icon=item.item_type==='cell'?'◇':item.item_type==='material'?'☠':'⚔';b.innerHTML=`<span>${icon}</span><b>${item.item_name}</b><small>${item.quantity>1?`×${item.quantity} · `:''}${item.rarity||'common'}</small>`;b.addEventListener('click',()=>{ui.itemDetail.innerHTML=`<b>${item.item_name}</b><p>${item.metadata?.description||'A recovered item from your journey.'}</p>`});ui.inventoryGrid.appendChild(b)});if(!all.length)ui.inventoryGrid.innerHTML='<p>Your pack is empty.</p>'}
function renderCells(){ui.cellList.innerHTML='';if(!cells.length){ui.cellList.innerHTML='<div class="cell-card"><small>NO CELLS BOUND</small><h3>Unknown</h3><p>Powerful creatures may leave Cells behind.</p></div>';ui.absorbBtn.hidden=true;return}cells.forEach(cell=>{const d=document.createElement('div');d.className='cell-card';d.innerHTML=`<small>${cell.absorbed?'ABSORBED':'UNBOUND CELL'}</small><h3>◇ ${cell.cell_name}</h3><p>${cell.description}</p>`;ui.cellList.appendChild(d)});ui.absorbBtn.hidden=!cells.find(c=>c.cell_key==='troll_cell'&&!c.absorbed)}
function openPanel(panel){panel.hidden=false;paused=true;if(panel===ui.inventoryPanel)renderInventory();if(panel===ui.cellsPanel)renderCells()}
function closePanels(){ui.inventoryPanel.hidden=true;ui.cellsPanel.hidden=true;if(ui.dialog.hidden&&ui.deathPanel.hidden&&ui.completionPanel.hidden)paused=false}
function beginDialogue(name,portrait,lines,onDone){dialogueQueue=lines.map(text=>({name,portrait,text}));dialogueIndex=0;ui.dialog.hidden=false;paused=true;ui.next.onclick=()=>advanceDialogue(onDone);showDialogueLine()}
function showDialogueLine(){const line=dialogueQueue[dialogueIndex];ui.dialogName.textContent=line.name;ui.dialogPortrait.textContent=line.portrait;ui.dialogText.textContent=line.text;ui.next.textContent=dialogueIndex===dialogueQueue.length-1?'CONTINUE →':'NEXT →'}
function advanceDialogue(onDone){dialogueIndex++;if(dialogueIndex>=dialogueQueue.length){ui.dialog.hidden=true;paused=false;onDone?.();return}showDialogueLine()}

function configureFromStage(){
  const stage=player.tutorialStage;
  if(player.tutorialComplete||stage==='complete'){
    mode='town';player.x=550;player.y=650;troll.on=false;portal.active=false;ui.miniTitle.textContent='Curo';ui.miniState.textContent='SAFE';
    const q=quests.find(q=>q.quest_key==='world_beyond_curo'&&q.status==='active');setQuest(q?.quest_title||'A World Beyond Curo',q?.data?.objective||'Speak with the Gatekeeper at Curo’s northern road.');log(`Welcome back to <span class="gold">Curo</span>.`);return;
  }
  if(['dungeon_entered','troll_active','troll_defeated','loot_collected','cell_absorbed','ability_used','return_ready'].includes(stage)){
    mode='dungeon';player.x=550;player.y=575;ui.miniTitle.textContent='Forgotten Hollow';ui.miniState.textContent='DANGER';
    if(stage==='dungeon_entered'||stage==='troll_active')startTroll(false);
    else if(stage==='troll_defeated'){troll.dead=true;troll.on=true;troll.hp=0;setQuest('Claim What Remains','Loot Gorvak’s remains.');}
    else if(stage==='loot_collected'){troll.dead=true;troll.on=true;troll.hp=0;setQuest('Your First Cell','Open Cells and absorb the Troll Cell.');}
    else if(stage==='cell_absorbed'){troll.dead=true;dummy.active=true;setQuest('Power Made Yours','Use Troll Slam on the training effigy.');}
    else{troll.dead=true;dummy.dead=true;portal.active=true;setQuest('Return to Curo','Enter the portal and return to the Mage.');}
  }else{mode='town';player.x=550;player.y=650;setQuest('The Waiting Mage','Find the mage beside Curo’s old well.');}
}
