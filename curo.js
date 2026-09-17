const SUPABASE_URL='https://jvydqeikdpelmtloulnd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const shell=document.getElementById('game-shell');
const dialogue=document.getElementById('dialogue');
const dialogueText=document.getElementById('dialogue-text');
const dialogueName=document.getElementById('dialogue-name');
const dialogueNext=document.getElementById('dialogue-next');
const interactionPrompt=document.getElementById('interaction-prompt');
const interactionText=document.getElementById('interaction-text');
const actionButton=document.getElementById('action-button');
const actionLabel=document.getElementById('action-label');
const actionIcon=document.getElementById('action-icon');
const questTitle=document.getElementById('quest-title');
const questCopy=document.getElementById('quest-copy');
const locationName=document.getElementById('location-name');
const locationSubtitle=document.getElementById('location-subtitle');
const playerNameEl=document.getElementById('player-name');
const playerPathEl=document.getElementById('player-path');
const portraitRune=document.getElementById('portrait-rune');
const healthFill=document.getElementById('health-fill');
const hint=document.getElementById('hint');
const fade=document.getElementById('fade');
const lootBanner=document.getElementById('loot-banner');
const bonesCount=document.getElementById('bones-count');
const cellCount=document.getElementById('cell-count');
const joystick=document.getElementById('joystick');
const joystickKnob=document.getElementById('joystick-knob');

const supabaseClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const DPR=Math.min(window.devicePixelRatio||1,2);
const keys=new Set();
let last=performance.now();
let mode='town';
let dialogueStep=-1;
let world={w:1900,h:1350};
let pointerTarget=null;
let joystickVector={x:0,y:0};
let joystickPointer=null;
let attackCooldown=0;
let trollAttackCooldown=0;
let elapsed=0;
let shake=0;

const player={x:950,y:1040,r:18,speed:235,hp:100,maxHp:100,name:'Bound One',path:'melee',pathTitle:'Vanguard',skin:'#dca27f',hair:'#171a1a',facing:0,walk:0};
const mage={x:1015,y:675,r:20};
const troll={x:960,y:390,r:42,hp:190,maxHp:190,active:false,dead:false,hitFlash:0};
const loot=[{type:'bones',x:925,y:390,picked:false},{type:'cell',x:995,y:390,picked:false}];
const inventory={bones:0,cell:0};
const camera={x:0,y:0};

const townBuildings=[
 {x:355,y:300,w:330,h:235,roof:'#d76f58',wall:'#f2d69b',name:'CURO GOODS',sign:true},
 {x:1215,y:290,w:330,h:245,roof:'#b85f52',wall:'#efd29d',name:'THE SUNLIT CUP'},
 {x:230,y:760,w:270,h:205,roof:'#8c6753',wall:'#ead6ae',name:'COTTAGE'},
 {x:1395,y:745,w:270,h:215,roof:'#a46a55',wall:'#eddaa9',name:'HOME'},
 {x:770,y:120,w:360,h:195,roof:'#6f7553',wall:'#e5d6ae',name:'OLD HALL'}
];
const trees=[];const flowers=[];
for(let i=0;i<55;i++){const x=90+((i*271)%1720),y=85+((i*173)%1160);if(Math.hypot(x-950,y-690)>250)trees.push({x,y,s:.75+((i*13)%25)/100});}
for(let i=0;i<120;i++){flowers.push({x:70+((i*137)%1760),y:70+((i*223)%1210),c:i%3});}

function resize(){canvas.width=Math.floor(innerWidth*DPR);canvas.height=Math.floor(innerHeight*DPR);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(DPR,0,0,DPR,0,0);}
addEventListener('resize',resize);resize();

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function screen(x,y){return{x:x-camera.x,y:y-camera.y};}
function worldFromScreen(x,y){return{x:x+camera.x,y:y+camera.y};}
function setQuest(title,copy){questTitle.textContent=title;questCopy.textContent=copy;}
function setLocation(name,sub){locationName.textContent=name;locationSubtitle.textContent=sub;}
function updateHealth(){healthFill.style.width=`${(player.hp/player.maxHp)*100}%`;}
function pathMeta(path){return path==='magic'?['Arcanist','Magic','✦']:path==='ranged'?['Ranger','Ranged','➶']:['Vanguard','Melee','◆'];}

async function loadCharacter(){if(!supabaseClient)return;try{const{data}=await supabaseClient.auth.getSession();const user=data?.session?.user;if(!user)return;const res=await supabaseClient.from('characters').select('name,combat_style,appearance').eq('user_id',user.id).order('created_at',{ascending:true}).limit(1).maybeSingle();if(res.data){player.name=res.data.name||player.name;player.path=res.data.combat_style||player.path;player.skin=res.data.appearance?.skin||player.skin;player.hair=res.data.appearance?.hairColor||player.hair;const meta=pathMeta(player.path);player.pathTitle=meta[0];playerNameEl.textContent=player.name.toUpperCase();playerPathEl.textContent=`${meta[0]} · ${meta[1]}`;portraitRune.textContent=meta[2];}}catch(err){console.warn('Curo character load:',err);}}

function circleCollision(nx,ny,obj,pad=0){const cx=clamp(nx,obj.x,obj.x+obj.w),cy=clamp(ny,obj.y,obj.y+obj.h);return Math.hypot(nx-cx,ny-cy)<player.r+pad;}
function canMove(nx,ny){if(nx<35||ny<35||nx>world.w-35||ny>world.h-35)return false;if(mode==='town'){for(const b of townBuildings){if(circleCollision(nx,ny,b,10))return false;}if(Math.hypot(nx-950,ny-690)<78)return false;}else{if(nx<250||nx>1650||ny<170||ny>1120)return false;}return true;}

function movementVector(){let x=0,y=0;if(keys.has('w')||keys.has('arrowup'))y--;if(keys.has('s')||keys.has('arrowdown'))y++;if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;x+=joystickVector.x;y+=joystickVector.y;if(pointerTarget&&Math.hypot(pointerTarget.x-player.x,pointerTarget.y-player.y)>8&&Math.abs(x)+Math.abs(y)<.15){const dx=pointerTarget.x-player.x,dy=pointerTarget.y-player.y,l=Math.hypot(dx,dy);x=dx/l;y=dy/l;}else if(Math.abs(x)+Math.abs(y)>.15){pointerTarget=null;}const len=Math.hypot(x,y);return len>1?{x:x/len,y:y/len}:{x,y};}

function update(dt){elapsed+=dt;attackCooldown=Math.max(0,attackCooldown-dt);trollAttackCooldown=Math.max(0,trollAttackCooldown-dt);troll.hitFlash=Math.max(0,troll.hitFlash-dt);shake=Math.max(0,shake-dt*2.7);if(!dialogue.hidden)return;
 const mv=movementVector();const moving=Math.hypot(mv.x,mv.y)>.05;if(moving){player.facing=Math.atan2(mv.y,mv.x);player.walk+=dt*10;const nx=player.x+mv.x*player.speed*dt,ny=player.y+mv.y*player.speed*dt;if(canMove(nx,player.y))player.x=nx;if(canMove(player.x,ny))player.y=ny;}else player.walk=0;
 if(mode==='town'){const near=dist(player,mage)<118;interactionPrompt.hidden=!near;interactionText.textContent='Speak to the Mage';actionLabel.textContent='INTERACT';actionIcon.textContent='✦';}
 if(mode==='dungeon'&&troll.active&&!troll.dead){interactionPrompt.hidden=true;actionLabel.textContent='ATTACK';actionIcon.textContent=player.path==='ranged'?'➶':player.path==='magic'?'✦':'◆';const d=dist(player,troll);if(d>72){const dx=(player.x-troll.x)/d,dy=(player.y-troll.y)/d;troll.x+=dx*58*dt;troll.y+=dy*58*dt;}else if(trollAttackCooldown<=0){player.hp=Math.max(0,player.hp-8);trollAttackCooldown=1.05;shake=.18;updateHealth();if(player.hp<=0){player.hp=100;updateHealth();player.x=960;player.y=870;troll.x=960;troll.y=390;}}
 }
 if(mode==='dungeon'&&troll.dead){for(const item of loot){if(!item.picked&&Math.hypot(player.x-item.x,player.y-item.y)<62){item.picked=true;inventory[item.type]++;if(item.type==='bones')bonesCount.textContent=inventory.bones;if(item.type==='cell')cellCount.textContent=inventory.cell;setQuest(item.type==='cell'?'The First Cell':'Monster Remains',item.type==='cell'?'You found a Cell. This is how new skills begin.':'You picked up Troll Bones. Something else is glowing nearby.');}}
 }
 const targetX=player.x-innerWidth/2,targetY=player.y-innerHeight/2;camera.x+=((clamp(targetX,0,Math.max(0,world.w-innerWidth)))-camera.x)*Math.min(1,dt*5.5));camera.y+=((clamp(targetY,0,Math.max(0,world.h-innerHeight)))-camera.y)*Math.min(1,dt*5.5));
}

function drawGround(){ctx.fillStyle=mode==='town'?'#8ac67e':'#28312e';ctx.fillRect(0,0,innerWidth,innerHeight);if(mode==='town')drawTownGround();else drawDungeonGround();}
function drawTownGround(){ctx.save();ctx.translate(-camera.x,-camera.y);ctx.fillStyle='#8dc97f';ctx.fillRect(0,0,world.w,world.h);for(const f of flowers){ctx.globalAlpha=.42;ctx.fillStyle=f.c===0?'#fff2ad':f.c===1?'#f7b6ad':'#d7d6ff';ctx.beginPath();ctx.arc(f.x,f.y,2.3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 ctx.strokeStyle='#e5cf98';ctx.lineCap='round';ctx.lineWidth=145;ctx.beginPath();ctx.moveTo(950,1350);ctx.lineTo(950,690);ctx.lineTo(950,240);ctx.stroke();ctx.beginPath();ctx.moveTo(360,675);ctx.lineTo(1540,675);ctx.stroke();ctx.strokeStyle='rgba(255,242,196,.28)';ctx.lineWidth=105;ctx.beginPath();ctx.moveTo(950,1350);ctx.lineTo(950,240);ctx.stroke();ctx.beginPath();ctx.moveTo(360,675);ctx.lineTo(1540,675);ctx.stroke();
 ctx.fillStyle='#76b86c';ctx.beginPath();ctx.ellipse(950,690,185,160,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawDungeonGround(){ctx.save();ctx.translate(-camera.x,-camera.y);ctx.fillStyle='#252d2a';ctx.fillRect(0,0,world.w,world.h);for(let x=250;x<1650;x+=82)for(let y=170;y<1120;y+=58){ctx.fillStyle=((x+y)/10)%2?'#303a36':'#2b3431';ctx.fillRect(x+2,y+2,78,54);}ctx.strokeStyle='#101714';ctx.lineWidth=26;ctx.strokeRect(240,160,1420,970);ctx.strokeStyle='#44534d';ctx.lineWidth=3;ctx.strokeRect(255,175,1390,940);for(let y=260;y<1080;y+=180){drawTorch(285,y);drawTorch(1615,y);}ctx.restore();}
function drawTorch(x,y){ctx.save();ctx.translate(x,y);const g=ctx.createRadialGradient(0,0,2,0,0,62);g.addColorStop(0,'rgba(255,189,86,.32)');g.addColorStop(1,'rgba(255,189,86,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,62,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e7903d';ctx.beginPath();ctx.moveTo(0,-13);ctx.quadraticCurveTo(12,0,0,13);ctx.quadraticCurveTo(-11,0,0,-13);ctx.fill();ctx.restore();}
function drawBuilding(b){const p=screen(b.x,b.y);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='rgba(42,57,43,.18)';roundedRect(13,20,b.w,b.h,16);ctx.fill();ctx.fillStyle=b.wall;roundedRect(0,0,b.w,b.h,14);ctx.fill();ctx.fillStyle='#b37b4e';ctx.fillRect(b.w*.44,b.h-64,b.w*.14,64);ctx.fillStyle='#7eb5bd';ctx.globalAlpha=.75;ctx.fillRect(40,85,48,55);ctx.fillRect(b.w-88,85,48,55);ctx.globalAlpha=1;ctx.fillStyle=b.roof;ctx.beginPath();ctx.moveTo(-28,35);ctx.lineTo(b.w/2,-72);ctx.lineTo(b.w+28,35);ctx.lineTo(b.w-4,65);ctx.lineTo(4,65);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(74,62,45,.28)';ctx.lineWidth=4;ctx.stroke();if(b.sign){ctx.fillStyle='#704d32';roundedRect(72,b.h-20,184,47,5);ctx.fill();ctx.fillStyle='#fff0c5';ctx.font='700 13px Georgia';ctx.textAlign='center';ctx.fillText(b.name,164,b.h+9);}ctx.restore();}
function drawTree(t){const p=screen(t.x,t.y);ctx.save();ctx.translate(p.x,p.y);ctx.scale(t.s,t.s);ctx.fillStyle='rgba(40,68,45,.18)';ctx.beginPath();ctx.ellipse(8,25,34,15,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6d5337';ctx.fillRect(-5,8,10,34);ctx.fillStyle='#4f9857';ctx.beginPath();ctx.arc(0,0,27,0,Math.PI*2);ctx.arc(-17,8,19,0,Math.PI*2);ctx.arc(17,8,20,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6daf68';ctx.beginPath();ctx.arc(-7,-9,14,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawWell(){const p=screen(950,690);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='rgba(39,58,45,.22)';ctx.beginPath();ctx.ellipse(6,20,70,32,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b7b8a5';ctx.beginPath();ctx.ellipse(0,0,63,35,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#707d75';ctx.beginPath();ctx.ellipse(0,-4,47,24,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5797a0';ctx.beginPath();ctx.ellipse(0,-5,37,17,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8b7560';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-48,-10);ctx.lineTo(-48,-72);ctx.moveTo(48,-10);ctx.lineTo(48,-72);ctx.moveTo(-54,-70);ctx.lineTo(54,-70);ctx.stroke();ctx.restore();}
function drawMage(){const p=screen(mage.x,mage.y);ctx.save();ctx.translate(p.x,p.y);const pulse=1+Math.sin(elapsed*3)*.05;ctx.strokeStyle=`rgba(91,230,217,${.25+Math.sin(elapsed*2)*.08})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,19,31*pulse,12*pulse,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#22393e';ctx.beginPath();ctx.moveTo(-18,28);ctx.lineTo(-10,-17);ctx.lineTo(10,-17);ctx.lineTo(20,28);ctx.closePath();ctx.fill();ctx.fillStyle='#5bc5bd';ctx.fillRect(-2,-12,4,31);ctx.fillStyle='#d4af8c';ctx.beginPath();ctx.arc(0,-28,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d8d4c8';ctx.beginPath();ctx.arc(0,-37,13,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#634d3c';ctx.fillRect(16,-35,4,65);ctx.fillStyle='#84efe5';ctx.beginPath();ctx.arc(18,-41,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=18;ctx.shadowColor='#6fe9df';ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#18342f';roundedRect(-51,-75,102,23,4);ctx.fill();ctx.fillStyle='#d8eee9';ctx.font='700 11px Inter';ctx.textAlign='center';ctx.fillText('THE MAGE',0,-59);ctx.restore();}
function drawPlayer(){const p=screen(player.x,player.y);ctx.save();ctx.translate(p.x,p.y);const bob=player.walk?Math.sin(player.walk)*2:0;ctx.translate(0,bob);ctx.fillStyle='rgba(37,58,43,.24)';ctx.beginPath();ctx.ellipse(0,18,20,9,0,0,Math.PI*2);ctx.fill();ctx.save();ctx.rotate(player.facing+Math.PI/2);ctx.fillStyle=player.path==='magic'?'#395b72':player.path==='ranged'?'#506845':'#555d62';ctx.beginPath();ctx.moveTo(-14,22);ctx.lineTo(-11,-10);ctx.lineTo(11,-10);ctx.lineTo(15,22);ctx.closePath();ctx.fill();ctx.fillStyle=player.skin;ctx.beginPath();ctx.arc(0,-21,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=player.hair;ctx.beginPath();ctx.arc(0,-25,10,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#e9d5b2';if(player.path==='melee'){ctx.fillRect(11,-4,4,29);ctx.fillStyle='#b9c6c8';ctx.fillRect(10,-14,6,18);}else if(player.path==='ranged'){ctx.strokeStyle='#b58455';ctx.lineWidth=3;ctx.beginPath();ctx.arc(13,1,12,-Math.PI/2,Math.PI/2);ctx.stroke();}else{ctx.fillStyle='#6de7dc';ctx.beginPath();ctx.arc(14,-2,5,0,Math.PI*2);ctx.fill();}ctx.restore();ctx.restore();}
function drawTroll(){if(!troll.active||troll.dead)return;const p=screen(troll.x,troll.y);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,34,48,17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=troll.hitFlash>0?'#c5e0b3':'#65785a';ctx.beginPath();ctx.ellipse(0,0,41,52,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5c6a52';ctx.beginPath();ctx.arc(0,-48,27,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ded29c';ctx.beginPath();ctx.moveTo(-22,-60);ctx.lineTo(-35,-80);ctx.lineTo(-12,-65);ctx.moveTo(22,-60);ctx.lineTo(35,-80);ctx.lineTo(12,-65);ctx.fill();ctx.fillStyle='#d8c09b';ctx.fillRect(-4,-42,8,18);ctx.fillStyle='#d9584c';ctx.fillRect(-14,-54,7,5);ctx.fillRect(7,-54,7,5);ctx.fillStyle='#4d5b46';ctx.beginPath();ctx.ellipse(-42,5,16,38,-.3,0,Math.PI*2);ctx.ellipse(42,5,16,38,.3,0,Math.PI*2);ctx.fill();ctx.restore();
 const barW=Math.min(520,innerWidth*.64),x=(innerWidth-barW)/2;ctx.fillStyle='rgba(12,18,15,.88)';ctx.fillRect(x,22,barW,34);ctx.fillStyle='#763e36';ctx.fillRect(x+4,45,(barW-8)*(troll.hp/troll.maxHp),7);ctx.fillStyle='#f1e7d8';ctx.font='700 12px Georgia';ctx.textAlign='center';ctx.fillText('CURO CAVE TROLL',innerWidth/2,39);}
function drawLoot(){if(!troll.dead)return;for(const item of loot){if(item.picked)continue;const p=screen(item.x,item.y);ctx.save();ctx.translate(p.x,p.y);const pulse=.75+Math.sin(elapsed*4+item.x)*.2;if(item.type==='cell'){ctx.shadowBlur=30;ctx.shadowColor='#65eee6';ctx.fillStyle='#82fff5';ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(11,-4);ctx.lineTo(5,18);ctx.lineTo(-9,11);ctx.lineTo(-12,-5);ctx.closePath();ctx.fill();ctx.strokeStyle=`rgba(115,246,238,${pulse})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,28+Math.sin(elapsed*3)*3,0,Math.PI*2);ctx.stroke();}else{ctx.font='28px serif';ctx.textAlign='center';ctx.fillText('🦴',0,9);}ctx.restore();}}
function drawDungeonMage(){const old={x:mage.x,y:mage.y};mage.x=820;mage.y=890;drawMage();mage.x=old.x;mage.y=old.y;}
function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*10*shake,(Math.random()-.5)*10*shake);drawGround();if(mode==='town'){for(const t of trees)drawTree(t);for(const b of townBuildings)drawBuilding(b);drawWell();drawMage();}else{drawDungeonMage();drawLoot();drawTroll();}drawPlayer();ctx.restore();}

const mageDialogue=[
 "At last. I've been waiting for you.",
 "Curo is quiet, but the world beyond it is not. Before you leave, you need to understand what makes this world different.",
 "Power is bound inside Cells. A Cell can awaken a skill you simply cannot use without it.",
 "And Cells are not bought from teachers. The creatures strong enough to carry them must be defeated.",
 "Come. There is something beneath Curo you should see for yourself."
];
const dungeonDialogue=[
 "This chamber is old. Things crawl up from deeper places more often than I'd like.",
 "Remember what I told you: powerful creatures can carry Cells. Sometimes the only way forward is through them."
];
function openDialogue(lines,name='THE MAGE',onEnd){dialogue.hidden=false;interactionPrompt.hidden=true;dialogueName.textContent=name;let i=0;dialogueText.textContent=lines[i];dialogueNext.onclick=()=>{i++;if(i<lines.length){dialogueText.textContent=lines[i];return;}dialogue.hidden=true;dialogueNext.onclick=null;onEnd?.();};}
function interact(){if(!dialogue.hidden){dialogueNext.click();return;}if(mode==='town'&&dist(player,mage)<125){openDialogue(mageDialogue,'THE MAGE',enterDungeon);return;}if(mode==='dungeon'&&troll.active&&!troll.dead){attack();}}
function enterDungeon(){setQuest('Below Curo','Follow the mage and learn why Cells matter.');fade.classList.add('is-on');setTimeout(()=>{mode='dungeon';world={w:1900,h:1300};player.x=960;player.y=930;camera.x=0;camera.y=0;pointerTarget=null;setLocation('CURO DEPTHS','Beneath the old well');fade.classList.remove('is-on');setTimeout(()=>openDialogue(dungeonDialogue,'THE MAGE',spawnTroll),280);},460);}
function spawnTroll(){troll.active=true;troll.dead=false;troll.hp=troll.maxHp;troll.x=960;troll.y=390;setQuest('A Powerful Creature','Defeat the troll. Your first lesson is no longer theoretical.');hint.textContent='Attack when in range · move away from the troll to create space';hint.style.opacity='1';setTimeout(()=>hint.style.opacity='.15',5200);}
function attack(){if(mode!=='dungeon'||!troll.active||troll.dead||attackCooldown>0)return;const d=dist(player,troll);const range=player.path==='melee'?88:player.path==='ranged'?245:210;if(d>range){interactionText.textContent='Move closer to attack';interactionPrompt.hidden=false;setTimeout(()=>interactionPrompt.hidden=true,700);return;}attackCooldown=player.path==='melee'?.55:player.path==='ranged'?.7:.78;const damage=player.path==='melee'?18:player.path==='ranged'?15:22;troll.hp=Math.max(0,troll.hp-damage);troll.hitFlash=.12;shake=.07;if(troll.hp<=0)killTroll();}
function killTroll(){troll.dead=true;lootBanner.hidden=false;setQuest('The First Drop','Walk over the remains and collect what the troll left behind.');actionLabel.textContent='INTERACT';actionIcon.textContent='✦';setTimeout(()=>lootBanner.hidden=true,3300);}

addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(['arrowup','arrowdown','arrowleft','arrowright',' ','e'].includes(k))e.preventDefault();if(k===' '||k==='e')interact();});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.clientX<160&&e.clientY>innerHeight-180)return;pointerTarget=worldFromScreen(e.clientX,e.clientY);});
actionButton.addEventListener('click',interact);

function joystickStart(e){joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joystickMove(e);}
function joystickMove(e){if(e.pointerId!==joystickPointer)return;const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.33,len=Math.hypot(dx,dy)||1,scale=Math.min(1,max/len),kx=dx*scale,ky=dy*scale;joystickKnob.style.transform=`translate(${kx}px,${ky}px)`;joystickVector={x:kx/max,y:ky/max};pointerTarget=null;}
function joystickEnd(e){if(e.pointerId!==joystickPointer)return;joystickPointer=null;joystickVector={x:0,y:0};joystickKnob.style.transform='translate(0,0)';}
joystick.addEventListener('pointerdown',joystickStart);joystick.addEventListener('pointermove',joystickMove);joystick.addEventListener('pointerup',joystickEnd);joystick.addEventListener('pointercancel',joystickEnd);

function tick(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(tick);}requestAnimationFrame(tick);
setTimeout(()=>hint.style.opacity='.2',6500);
loadCharacter();updateHealth();
