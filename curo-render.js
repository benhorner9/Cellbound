const curoBackdrop=new Image();
let curoBackdropReady=false;
async function loadCuroBackdrop(){
  try{
    const urls=['./assets/curo/curo-world.part1','./assets/curo/curo-world.part2'];
    const parts=await Promise.all(urls.map(async url=>{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error(`Curo art ${r.status}`);return r.text()}));
    const src=`data:image/jpeg;base64,${parts.join('')}`;
    await new Promise((resolve,reject)=>{curoBackdrop.onload=()=>{curoBackdropReady=true;resolve()};curoBackdrop.onerror=()=>reject(new Error('Curo art decode failed'));curoBackdrop.src=src});
  }catch(err){console.warn('Curo world art fallback:',err);curoBackdropReady=false}
}

function drawGrass(){rect(0,0,vw,vh,'#273d2d');for(let y=-8;y<vh+8;y+=8)for(let x=-8;x<vw+8;x+=8){const wx=x+camera.x,wy=y+camera.y,n=((Math.floor(wx/8)*17+Math.floor(wy/8)*31)%7+7)%7;rect(x,y,8,8,n<2?'#315039':n<4?'#2b4632':'#29422f');if(n===0){px(x+2,y+5,'#4d7147');px(x+4,y+3,'#577d4d')}}}
function drawPath(){ctx.save();ctx.translate(-camera.x,-camera.y);ctx.fillStyle='#766b53';ctx.fillRect(505,0,90,800);ctx.fillRect(0,350,1100,90);ctx.fillStyle='#395938';ctx.beginPath();ctx.ellipse(550,395,115,90,0,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawBuilding(b){const x=sx(b.x),y=sy(b.y);shadow(x+b.w/2,y+b.h-2,b.w+18,12);rect(x,y+24,b.w,b.h-24,'#b69d70');rect(x+8,y+30,b.w-16,b.h-35,'#c2aa7a');ctx.fillStyle=b.roof;ctx.beginPath();ctx.moveTo(x-12,y+30);ctx.lineTo(x+b.w/2,y-18);ctx.lineTo(x+b.w+12,y+30);ctx.lineTo(x+b.w-5,y+49);ctx.lineTo(x+5,y+49);ctx.closePath();ctx.fill();rect(x+b.w*.43,y+b.h-42,28,42,'#5e4634');rect(x+24,y+63,28,28,'#56767b');rect(x+b.w-52,y+63,28,28,'#56767b')}
function tree(wx,wy,s=1.1){const x=sx(wx),y=sy(wy);shadow(x,y+14,28*s,6);rect(x-3*s,y,6*s,18*s,'#60472f');const cs=['#274f31','#2e6338','#397441','#24482d'];for(let i=0;i<7;i++){ctx.fillStyle=cs[i%cs.length];ctx.fillRect(Math.round(x+((i%3)-1)*8*s),Math.round(y-12*s+Math.floor(i/3)*7*s),Math.round(15*s),Math.round(13*s))}}
function well(){const x=sx(550),y=sy(395);shadow(x,y+17,70,9);rect(x-33,y-10,66,24,'#7c7767');rect(x-28,y-8,56,18,'#aaa28c');rect(x-22,y-7,44,13,'#31565d');rect(x-30,y-35,5,30,'#765d43');rect(x+25,y-35,5,30,'#765d43');rect(x-34,y-38,68,5,'#765d43');rect(x-4,y-37,8,16,'#4c3828')}
function drawNpc(n,kind='mage'){const x=sx(n.x),y=sy(n.y);shadow(x,y+12,21,5);if(kind==='mage'){rect(x-9,y-7,18,25,'#223a43');rect(x-12,y+6,24,14,'#1a2b32');rect(x-7,y-20,14,12,'#c5a17b');rect(x-8,y-23,16,5,'#324c53');rect(x+10,y-25,3,37,'#765331');rect(x+8,y-27,7,7,'#52dbe0');px(x+10,y-25,'#d4ffff',2)}else{rect(x-7,y-8,14,22,kind==='gate'?'#4c3c2f':'#56412f');rect(x-6,y-19,12,11,'#c9a17d');rect(x-8,y-21,16,4,kind==='gate'?'#30373a':'#6b4a2d')}}
function drawPlayer(){const x=sx(player.x),y=sy(player.y)+(player.walk?Math.sin(elapsed*15):0);shadow(x,y+14,25,6);rect(x-8,y-9,16,23,'#222a2d');rect(x-10,y+9,8,12,'#151b1e');rect(x+2,y+9,8,12,'#151b1e');rect(x-7,y-21,14,12,player.appearance.skin||'#d1a07c');rect(x-8,y-24,16,6,player.appearance.hairColor||'#2d2725');rect(x-13,y-8,5,20,'#7a2b29');rect(x-15,y+7,7,15,'#4d1d20');if(player.style==='ranged'){ctx.strokeStyle='#c69a62';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+13,y-5,8,-1.25,1.25);ctx.stroke()}else if(player.style==='magic'){rect(x+11,y-8,2,20,'#76563b');rect(x+8,y-13,8,8,'#58e4ee')}else{rect(x+10,y-11,2,21,'#d2d9d5');rect(x+7,y+7,8,2,'#80603f')}if(mode==='town'){ctx.font='7px Georgia';ctx.textAlign='center';ctx.fillStyle='#f3ead7';ctx.fillText(player.name,x,y-31)}if(flash>0||attackPulse>0){ctx.strokeStyle=attackPulse>0?'#f1d17b':'#efd07b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,18+Math.max(flash,attackPulse)*28,-1.2,1.25);ctx.stroke()}}

function drawTownFallback(){drawGrass();drawPath();townTrees.forEach(t=>tree(t[0],t[1]));buildings.forEach(drawBuilding);well();drawNpc(mage,'mage');drawNpc(shopkeeper,'shop');drawNpc(gatekeeper,'gate')}
function drawTownArt(){
  rect(0,0,vw,vh,'#101913');
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(curoBackdrop,Math.round(-camera.x),Math.round(90-camera.y),1100,619);
  ctx.imageSmoothingEnabled=false;
  const top=ctx.createLinearGradient(0,0,0,80);top.addColorStop(0,'rgba(3,7,7,.48)');top.addColorStop(1,'rgba(3,7,7,0)');ctx.fillStyle=top;ctx.fillRect(0,0,vw,80);
  ctx.restore();
  // Live quest marker over the pre-rendered mage so the artwork remains interactive.
  const mx=sx(mage.x),my=sy(mage.y);const pulse=1+Math.sin(elapsed*4)*.08;
  ctx.strokeStyle='rgba(91,230,235,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(mx,my+12,17*pulse,7*pulse,0,0,Math.PI*2);ctx.stroke();
  if(!player.tutorialComplete){ctx.fillStyle='#8ef5f7';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('!',mx,my-31);ctx.font='7px Georgia';ctx.fillStyle='#f4e6c9';ctx.fillText('THE MAGE',mx,my-20)}
  // A few subtle animated highlights keep the painted world from feeling like a flat screenshot.
  ctx.fillStyle=`rgba(100,231,239,${.12+Math.sin(elapsed*2)*.05})`;for(const [wx,wy] of [[175,490],[195,520],[270,610],[535,385]]){ctx.fillRect(sx(wx),sy(wy),2,1)}
}
function drawTown(){curoBackdropReady?drawTownArt():drawTownFallback()}

function stoneFloor(){rect(0,0,vw,vh,'#0e1516');ctx.save();ctx.translate(-camera.x,-camera.y);rect(145,100,810,590,'#1c2525');for(let y=112;y<680;y+=18)for(let x=155;x<945;x+=26){const c=((x+y)/2)%3?'#2b3432':'#252e2d';ctx.fillStyle=c;ctx.fillRect(x+(Math.floor(y/18)%2?10:0),y,23,15);ctx.fillStyle='#121918';ctx.fillRect(x+(Math.floor(y/18)%2?10:0),y+14,23,2)}for(let i=0;i<10;i++){const a=i*Math.PI*2/10,cx=550+Math.cos(a)*250,cy=390+Math.sin(a)*170;rect(cx-10,cy-18,20,36,'#34403d');rect(cx-8,cy-28,16,10,'#6a4d34');rect(cx-4,cy-35,8,9,'#e58d3b');rect(cx-2,cy-34,4,5,'#ffd16b')}ctx.strokeStyle='#3d4c49';ctx.lineWidth=2;ctx.beginPath();ctx.arc(550,390,150,0,Math.PI*2);ctx.stroke();ctx.restore()}
function drawTroll(){const x=sx(troll.x),y=sy(troll.y);shadow(x,y+26,50,8);if(selectedTarget===troll&&!troll.dead){ctx.strokeStyle='#f0c765';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+18,32,13,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f0c765';ctx.font='7px monospace';ctx.textAlign='center';ctx.fillText('TARGET',x,y-46)}const hit=troll.hit>0;rect(x-18,y-10,36,36,hit?'#a8c886':'#58784b');rect(x-25,y,11,31,hit?'#93b875':'#4c6943');rect(x+14,y,11,31,hit?'#93b875':'#4c6943');rect(x-14,y+24,11,20,'#38462f');rect(x+3,y+24,11,20,'#38462f');rect(x-15,y-30,30,22,hit?'#b7d493':'#6e905a');rect(x-11,y-35,8,7,'#3a432e');rect(x+5,y-35,8,7,'#3a432e');px(x-8,y-20,'#e5d77c',3);px(x+6,y-20,'#e5d77c',3);rect(x+23,y-20,5,48,'#765538');rect(x+20,y-23,19,9,'#59412e');if(trollState==='smash'){ctx.strokeStyle='#cf554c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,30+trollTimer*18,0,Math.PI*2);ctx.stroke()}}
function drawLoot(){if(!troll.dead)return;const x=sx(550),y=sy(300);ctx.fillStyle='#e9dec5';ctx.font='15px monospace';ctx.fillText('☠',x-23,y+5);ctx.fillStyle='#60e6ef';ctx.font='23px monospace';ctx.fillText('◇',x+16,y+5);ctx.fillStyle='#59dfe944';ctx.fillRect(x+10,y-10,18,18)}
function drawDummy(){if(!dummy.active||dummy.dead)return;const x=sx(dummy.x),y=sy(dummy.y);shadow(x,y+15,28,6);rect(x-4,y-2,8,32,'#6c5338');rect(x-19,y+4,38,6,'#7c6041');rect(x-12,y-18,24,18,'#8b6d49');ctx.fillStyle='#d3b36e';ctx.font='7px monospace';ctx.textAlign='center';ctx.fillText('EFFIGY',x,y-24)}
function drawPortal(){if(!portal.active)return;const x=sx(portal.x),y=sy(portal.y);const r=22+Math.sin(elapsed*4)*3;ctx.strokeStyle='#5ddfe8';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,r,r*1.5,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#4fdde522';ctx.beginPath();ctx.ellipse(x,y,r-5,(r-5)*1.45,0,0,Math.PI*2);ctx.fill()}
function drawDungeon(){stoneFloor();if(troll.on&&!troll.dead)drawTroll();drawLoot();drawDummy();drawPortal();drawNpc({x:380,y:560},'mage')}
function draw(){ctx.clearRect(0,0,vw,vh);ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*4,(Math.random()-.5)*4);mode==='town'?drawTown():drawDungeon();drawPlayer();ctx.restore()}