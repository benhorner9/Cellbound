'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),name=process.env.CELLBOUND_TEST_ENGINE==='webkit'?'webkit':'chromium';
(async()=>{
 const browser=await(name==='webkit'?webkit:chromium).launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.setContent('<style>body{margin:0;background:#172027;color:#e5dcc8;font:14px sans-serif}h1{font-size:19px;margin:18px}main{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;padding:12px}article{text-align:center;min-width:0}article svg{display:block;width:100%;height:auto}h2{font-size:14px}small{color:#acb8b8}#host{position:absolute;left:0;top:0;width:240px}#host>svg{width:240px;height:410px}</style><h1>Shared equipment attachments</h1><main></main><div id="host"></div>');
  await page.addStyleTag({path:path.join(root,'character-portraits-v1.css')});
  for(const f of ['gear-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js'])await page.addScriptTag({path:path.join(root,f)});
  await page.evaluate(()=>{
   window.qaCharacter=(i,race='Veyren',gender=0,frame=1)=>{
    const [klass,tier]=[['Warrior',1],['Warrior',3],['Paladin',2],['Hunter',2],['Rogue',3],['Mage',3]][i],G=CellboundGear,equipment={};
    for(const pos of G.EQUIPMENT_POSITION_ORDER)equipment[pos]=G.items.find(x=>x.class===klass&&x.tier===tier&&x.slot===(pos.startsWith('Ring')?'Ring':pos.startsWith('Trinket')?'Trinket':pos));
    return {id:'qa-'+i,race,class:klass,name:klass,appearance:{race,gender,frame,skinTone:frame,face:gender,hair:2,hairColor:2,facialHair:0,marking:frame,eyes:gender,feature:frame},equipment};
   };
   window.qaContacts=(c,mirror)=>{
    const P=CellboundPortraits,R=CellboundCharacterRig,host=document.querySelector('#host');host.innerHTML=P.paperDollSVG(c,{mirrored:mirror});
    const svg=host.querySelector('svg'),actor=svg.querySelector('.cb-paper-actor'),pose=P.gearFitProfile(c).attachments,errors=[];
    const svgPoint=p=>{const v=svg.createSVGPoint();v.x=p.x;v.y=p.y;return v};
    const screen=p=>svgPoint(p).matrixTransform(actor.getScreenCTM());
    const touches=(group,target)=>[...group.querySelectorAll('path,ellipse,circle,rect')].some(el=>{
     const p=svgPoint(target).matrixTransform(el.getScreenCTM().inverse()),style=getComputedStyle(el);
     return (style.fill!=='none'&&el.isPointInFill(p))||(style.stroke!=='none'&&el.isPointInStroke(p));
    });
    for(const [slot,part] of [['weapon',pose.main],['offhand',pose.off]]){
     if(!part)continue;
     const el=svg.querySelector('.cb-paper-slot-'+slot),target=screen(part),actual=new DOMPoint(...part.grip).matrixTransform(el.getScreenCTM());
     if(Math.hypot(target.x-actual.x,target.y-actual.y)>.05)errors.push(slot+' transform misses socket');
     // This interrogates the painted SVG geometry, not data-* agreement.
     if(!touches(el,target))errors.push(slot+' socket lies in empty artwork');
     if(part.mode!=='stowed'&&part.kind!=='shield'){
      const side=slot==='weapon'?'right':'left',hand=svg.querySelector('.cb-paper-glove-'+side);
      const point=svgPoint(target).matrixTransform(hand.getScreenCTM().inverse());
      if(!hand.isPointInFill(point))errors.push(slot+' drawn palm misses handle');
     }
    }
    if(pose.twoHanded){
     const weapon=svg.querySelector('.cb-paper-slot-weapon'),hand=screen(pose.left.hand);
     if(!touches(weapon,hand))errors.push('second hand misses physical handle');
     if(!svg.querySelector('.cb-paper-held-grip-off'))errors.push('second gripping fingers absent');
    }
    for(const side of ['left','right']){
     const arm=pose[side],group=svg.querySelector('.cb-paper-forearm-'+side);
     if(!touches(group,screen(arm.hand)))errors.push(side+' forearm disconnected from hand');
     const publicPoint=P.anatomicalAnchors(c)[side+'Hand'];
     if(Math.hypot(publicPoint.x-arm.hand.x,publicPoint.y-arm.hand.y)>.01)errors.push('published anchor not in rendered coordinates');
    }
    const weapon=svg.querySelector('.cb-paper-slot-weapon');
    if(pose.off){
     const off=svg.querySelector('.cb-paper-slot-offhand'),forearm=svg.querySelector('.cb-paper-forearm-left');
     if(pose.off.layer==='shield-front'&&!(forearm.compareDocumentPosition(off)&Node.DOCUMENT_POSITION_FOLLOWING))errors.push('shield behind forearm');
     if(pose.off.mode==='stowed'&&!(off.compareDocumentPosition(forearm)&Node.DOCUMENT_POSITION_FOLLOWING))errors.push('stowed object above arm');
    }
    const bounds=actor.getBBox();if(bounds.x<0||bounds.x+bounds.width>240||bounds.y<0||bounds.y+bounds.height>410)errors.push('actor clipped by canvas '+JSON.stringify({x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}));
    return errors;
   };
  });
  const result=await page.evaluate(()=>{
   const errors=[];let count=0;
   for(const race of CellboundCharacterRig.races)for(const gender of [0,1])for(const frame of [0,1,2])for(let i=0;i<6;i++)for(const mirror of [false,true]){
    const c=qaCharacter(i,race,gender,frame),before=JSON.stringify(c),found=qaContacts(c,mirror);
    if(JSON.stringify(c)!==before)found.push('character mutated');
    if(found.length)errors.push({race,gender,frame,i,mirror,found});count++;
   }
   // Every supported category, including currently absent catalogue types.
   for(const kind of Object.keys(CellboundCharacterRig.weaponProfiles))for(const race of CellboundCharacterRig.races){
    const c=qaCharacter(0,race);c.equipment.Weapon={slot:'Weapon',class:'Warrior',name:kind,weaponType:kind,tier:2};
    const found=qaContacts(c,false);if(found.length)errors.push({kind,race,found});count++;
   }
   return {count,errors};
  });
  assert.deepEqual(result.errors,[],JSON.stringify(result.errors.slice(0,12),null,2));
  for(const [label,width,height] of [['desktop',1440,1000],['ipad-landscape',1366,1024],['ipad-portrait',1024,1366]]){
   await page.setViewportSize({width,height});
   const errors=await page.evaluate(()=>Array.from({length:6},(_,i)=>qaContacts(qaCharacter(i),i%2===1)).flat());assert.deepEqual(errors,[]);
   await page.evaluate(()=>{
    document.querySelector('#host').innerHTML='';document.querySelector('main').innerHTML=Array.from({length:6},(_,i)=>{
     const c=qaCharacter(i);return '<article><h2>'+c.class+' T'+c.equipment.Weapon.tier+'</h2><small>Veyren · male · balanced</small>'+CellboundPortraits.paperDollSVG(c)+'</article>';
    }).join('');
   });
   await page.screenshot({path:'/tmp/cellbound-weapon-'+name+'-'+label+'.png'});
  }
  // Visual sheets span every race, sex and physique, cycling six required kits.
  await page.setViewportSize({width:1440,height:1050});
  for(const gender of [0,1])for(const frame of [0,1,2]){
   await page.evaluate(({gender,frame})=>{
    document.querySelector('main').innerHTML=CellboundCharacterRig.races.map((race,i)=>{
     const c=qaCharacter(i,race,gender,frame);return '<article><h2>'+race+' · '+c.class+'</h2><small>'+['Male','Female'][gender]+' · '+['Lean','Balanced','Strong'][frame]+'</small>'+CellboundPortraits.paperDollSVG(c)+'</article>';
    }).join('');
   },{gender,frame});
   await page.screenshot({path:'/tmp/cellbound-weapon-'+name+'-races-'+gender+'-'+frame+'.png'});
  }
  // Real combat mount: all existing player selectors use the shared renderer;
  // equipment/appearance changes refresh mounts. Animation transforms the unit.
  await page.addStyleTag({path:path.join(root,'src/combat/combat-portraits-v1.css')});
  await page.evaluate(()=>{
   window.qaRoster=[qaCharacter(0)];window.CellboundGame={getState:()=>({roster:qaRoster})};
   document.body.innerHTML=['data-unit','data-hs','data-cc','data-bs','data-tb-unit','data-q-unit','data-combat-party'].map(a=>'<div class="cb2d-unit" '+a+'="p-qa-0"></div>').join('')+'<div class="pvp2d-unit" data-pvp2d-unit="blue-qa-0"><div class="pvp2d-token"></div></div>';
  });
  await page.addScriptTag({path:path.join(root,'src/combat/combat-portraits-v1.js')});
  const integration=await page.evaluate(()=>{
   CellboundCombatPortraits.refresh();const before=[...document.querySelectorAll('.cb-paper-slot-weapon')].map(e=>e.dataset.weaponType);
   qaRoster[0].equipment=qaCharacter(4).equipment;qaRoster[0].appearance.frame=2;CellboundCombatPortraits.refresh();
   const after=[...document.querySelectorAll('.cb-paper-slot-weapon')].map(e=>e.dataset.weaponType);
   const unit=document.querySelector('.cb2d-unit');unit.classList.add('attacking');
   return {before,after};
  });
  assert.equal(integration.before.length,8);assert(integration.before.every(x=>x==='sword'));assert(integration.after.every(x=>x==='dagger'));
  await page.waitForTimeout(40);
  const animated=await page.evaluate(()=>{
   const unit=document.querySelector('.cb2d-unit'),svg=unit.querySelector('svg'),w=unit.querySelector('.cb-paper-slot-weapon'),hand=unit.querySelector('.cb-paper-glove-right');
   const animations=unit.getAnimations({subtree:true});const errors=[];
   for(const t of [0,140,280]){for(const a of animations){a.pause();a.currentTime=t}
    const wp=new DOMPoint(+w.dataset.gripLocalX,+w.dataset.gripLocalY).matrixTransform(w.getScreenCTM());
    const hp=new DOMPoint(+hand.getAttribute('cx'),+hand.getAttribute('cy')).matrixTransform(hand.getScreenCTM());
    if(Math.hypot(wp.x-hp.x,wp.y-hp.y)>.05)errors.push(t);
   }
   return {count:animations.length,errors};
  });
  assert(animated.count>0,'actual combat attack animation did not run');assert.deepEqual(animated.errors,[]);
  console.log(name+' shared attachments: '+result.count+' painted-geometry cases; 3 viewports; 8 combat mounts; live swaps and attack animation passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
