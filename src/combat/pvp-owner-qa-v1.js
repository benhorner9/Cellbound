(()=>{
'use strict';
// Isolated OWNER-ONLY sandbox. Cannot unlock the legacy PvP shell or award anything.
const $=selector=>document.querySelector(selector);
const game=()=>window.CellboundGame;
const availableRoster=()=>((game()?.getState?.()?.roster)||[]).filter(c=>game()?.isCharacterRosterUnlocked?.(c.id)!==false&&!game()?.isUnavailable?.(c));
const activeParty=()=>game()?.getPartyCharacters?.()||[];
// Owner-only LOCAL practice harness: never calls save(), rewards, match history or rating APIs.
let pvpPractice=null;
function stopPractice(){
 if(!pvpPractice)return;
 clearInterval(pvpPractice.timer);pvpPractice.timer=null;pvpPractice=null
}
function practiceRosters(size){
 const defs=[['Warrior','Protection'],['Priest','Holy'],['Mage','Arcane'],['Rogue','Assassination'],['Hunter','Marksman']];
 const mine=availableRoster(),party=activeParty(),selected=[...party,...mine.filter(c=>!party.some(p=>p.id===c.id))];
 const blue=Array.from({length:size},(_,i)=>{
  const c=selected[i],d=defs[i%defs.length];
  return{id:'practice-blue-'+i,name:c?.name||d[0]+' '+(i+1),class:c?.class||d[0],spec:c?.spec||d[1],level:Math.max(1,Number(c?.level)||12),power:Math.max(10,Number(c?.power)||14)}
 });
 const red=Array.from({length:size},(_,i)=>{
  const d=defs[(i+1)%defs.length];
  return{id:'practice-red-'+i,name:'Rival '+d[0]+' '+(i+1),class:d[0],spec:d[1],level:blue[i].level,power:blue[i].power}
 });
 return{blue,red}
}
function practiceMarkup(){
 return '<article class="pvp-panel cbpvp-qa"><header><div><small>OWNER ONLY · DEVELOPMENT BUILD</small><h3>Crucible Practice Room</h3></div><b>NO REWARDS</b></header>'+
 '<p>Test live combat, shrinking Cellstorm, flags and capture points against practice squads. This is not online matchmaking. No rating, equipment or currency is changed.</p>'+
 '<div class="cbpvp-qa-toolbar"><label>Mode <select data-pvp-qa-mode><option value="arena">Arena</option><option value="capture-the-flag">Capture the Flag</option><option value="king-of-the-hill">King of the Hill</option></select></label>'+
 '<label>Party <select data-pvp-qa-size><option value="2">2v2</option><option value="3">3v3</option><option value="5">5v5</option></select></label>'+
 '<button type="button" data-pvp-qa-start>Start practice</button><button type="button" data-pvp-qa-stop>Stop</button></div>'+
 '<div class="cbpvp-qa-toolbar" data-pvp-qa-orders hidden><strong>TACTICS</strong>'+
 '<button type="button" data-pvp-qa-command="target:attack-healer">Attack Healer</button>'+
 '<button type="button" data-pvp-qa-command="target:attack-tank">Attack Tank</button>'+
 '<button type="button" data-pvp-qa-command="target:attack-dps">Attack DPS</button>'+
 '<button type="button" data-pvp-qa-command="position:spread">Spread</button>'+
 '<button type="button" data-pvp-qa-command="position:group-up">Group Up</button>'+
 '<button type="button" data-pvp-qa-command="position:fall-back">Fall Back</button>'+
 '<button type="button" data-pvp-qa-command="objective:take-flag" data-qa-ctf hidden>Take Flag</button>'+
 '<button type="button" data-pvp-qa-command="objective:recover-flag" data-qa-ctf hidden>Recover Flag</button>'+
 '<button type="button" data-pvp-qa-command="objective:capture-hill" data-qa-hill hidden>Capture Hill</button>'+
 '<button type="button" data-pvp-qa-command="objective:rotate-early" data-qa-hill hidden>Rotate</button></div>'+
 '<p data-pvp-qa-status role="status">Choose a practice mode to begin. Only the owner can access this room.</p>'+
 '<div data-pvp-qa-viewer></div></article>'
}
function setupPractice(){
 const mount=$('#pvpMount'),host=mount?.querySelector('.cbpvp-qa');if(!host)return;
 const mode=host.querySelector('[data-pvp-qa-mode]'),size=host.querySelector('[data-pvp-qa-size]');
 mode.addEventListener('change',()=>{size.disabled=mode.value!=='arena';if(size.disabled)size.value='5'});
 host.querySelector('[data-pvp-qa-stop]').addEventListener('click',()=>{
  stopPractice();host.querySelector('[data-pvp-qa-viewer]').replaceChildren();
  host.querySelector('[data-pvp-qa-orders]').hidden=true;host.querySelector('[data-pvp-qa-status]').textContent='Practice stopped. No results saved.'
 });
 host.querySelector('[data-pvp-qa-start]').addEventListener('click',()=>{
  if(window.CellboundAdmin?.role!=='owner')return;
  stopPractice();
  const gameMode=mode.value,n=gameMode==='arena'?Number(size.value):5;
  const engine=window.CellboundCombatStandard,viewer=window.CellboundCombatViewer,root=host.querySelector('[data-pvp-qa-viewer]'),status=host.querySelector('[data-pvp-qa-status]');
  if(!engine?.createPvpSession||!viewer?.renderPvpFrame){status.textContent='Shared PvP engine or viewer is unavailable.';return}
  try{
   const squad=practiceRosters(n),session=engine.createPvpSession({pvp:{mode:gameMode,size:n,...squad},encounter:{id:'owner-pvp-practice',environment:{blockers:[]}},seed:'owner-practice-'+gameMode+'-'+n,maxDurationMs:120000},{zone:'owner-pvp-qa'});
   root.replaceChildren();
   const shell=viewer.mount(root,{profile:'pvp',title:gameMode==='arena'?n+'v'+n+' Arena':gameMode==='capture-the-flag'?'Capture the Flag':'King of the Hill',header:'OWNER PRACTICE · NO REWARDS',inline:true});
   viewer.renderPvpFrame(shell,session.snapshot());
   const controls=host.querySelector('[data-pvp-qa-orders]');controls.hidden=false;
   controls.querySelectorAll('[data-qa-ctf]').forEach(el=>el.hidden=gameMode!=='capture-the-flag');
   controls.querySelectorAll('[data-qa-hill]').forEach(el=>el.hidden=gameMode!=='king-of-the-hill');
   const practice={session,shell,timer:null};pvpPractice=practice;
   const advance=()=>{
    if(pvpPractice!==practice)return;
    if(!root.isConnected||window.CellboundAdmin?.role!=='owner'){stopPractice();return}
    try{
     const step=session.advance(200);
     viewer.renderPvpFrame(shell,session.snapshot());
     if(step.finished){clearInterval(practice.timer);practice.timer=null;
      status.textContent='Practice '+(step.result?.pvp?.winner||'draw').toUpperCase()+' · '+Math.round(session.timeMs/1000)+'s · no results saved.';
      controls.hidden=true
     }else status.textContent='Practice running · '+Math.floor(session.timeMs/1000)+'s · command cooldown 1.5s'
    }catch(error){stopPractice();status.textContent='Practice ended with an error: '+String(error?.message||error)}
   };
   practice.timer=setInterval(advance,200);advance();
  }catch(error){status.textContent='Unable to start practice: '+String(error?.message||error)}
 });
 host.querySelectorAll('[data-pvp-qa-command]').forEach(button=>button.addEventListener('click',()=>{
  if(window.CellboundAdmin?.role!=='owner'||!pvpPractice)return;
  const [category,value]=button.dataset.pvpQaCommand.split(':');
  const result=pvpPractice.session.pvpCommand('blue',category,value);
  host.querySelector('[data-pvp-qa-status]').textContent=result.ok?'Order accepted: '+value:result.reason==='cooldown'?'Command on cooldown ('+((result.remainingMs||0)/1000).toFixed(1)+'s)':'Order rejected: '+(result.reason||'unknown');
  window.CellboundCombatViewer?.renderPvpFrame?.(pvpPractice.shell,pvpPractice.session.snapshot())
 }))
}

function render(mount){
 stopPractice();
 if(!mount||window.CellboundAdmin?.role!=='owner')return;
 mount.insertAdjacentHTML('beforeend',practiceMarkup());
 setupPractice()
}
window.CellboundPvPOwnerQA=Object.freeze({render,stop:stopPractice});
})();
