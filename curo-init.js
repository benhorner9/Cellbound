addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','1','2','i','c'].includes(k))e.preventDefault();keys.add(k);if(k==='1'||k===' '){if(troll.on&&!troll.dead)selectedTarget===troll?clearTarget(true):selectTarget(troll)}if(k==='2')useSlam();if(k==='i')ui.inventoryPanel.hidden?openPanel(ui.inventoryPanel):closePanels();if(k==='c')ui.cellsPanel.hidden?openPanel(ui.cellsPanel):closePanels();if(k==='escape'){clearTarget(false);closePanels()}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function setJoy(e){const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy),max=r.width*.32,scale=len>max?max/len:1,pxv=dx*scale,pyv=dy*scale;ui.knob.style.transform=`translate(${pxv}px,${pyv}px)`;joyVec.x=clamp(dx/max,-1,1);joyVec.y=clamp(dy/max,-1,1)}
ui.joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;ui.joy.setPointerCapture(e.pointerId);setJoy(e);pointerTarget=null});
ui.joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)setJoy(e)});
function clearJoy(e){if(e.pointerId!==joyPointer)return;joyPointer=null;joyVec={x:0,y:0};ui.knob.style.transform='translate(0,0)'}
ui.joy.addEventListener('pointerup',clearJoy);ui.joy.addEventListener('pointercancel',clearJoy);
ui.action.addEventListener('click',interact);
ui.basicBtn.addEventListener('click',()=>{if(troll.on&&!troll.dead)selectedTarget===troll?clearTarget(true):selectTarget(troll);else toast('No combat target available.',900)});
ui.slamBtn.addEventListener('click',useSlam);
ui.inventoryBtn.addEventListener('click',()=>openPanel(ui.inventoryPanel));ui.cellsBtn.addEventListener('click',()=>openPanel(ui.cellsPanel));ui.absorbBtn.addEventListener('click',absorbCell);
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closePanels));
ui.retryBtn.addEventListener('click',async()=>{ui.deathPanel.hidden=true;player.hp=player.max;paused=false;startTroll(true)});
ui.completionBtn.addEventListener('click',()=>{ui.completionPanel.hidden=true;paused=false;toast('A World Beyond Curo is now active.',2500)});

(async()=>{try{const ok=await loadPersistentState();if(!ok)return;configureFromStage();renderInventory();renderCells();updateHUD();ui.loadingText.textContent='Curo is ready.';setTimeout(()=>{ui.loading.classList.add('hide');paused=false;log(`You arrive in <span class="gold">${mode==='town'?'Curo':'Forgotten Hollow'}</span>.`);if(player.tutorialStage==='arrived_curo')toast('Use the movement control or WASD to explore.',2500)},350);requestAnimationFrame(loop)}catch(err){console.error(err);ui.loadingText.textContent='The world could not be loaded. Refresh to try again.'}})();
