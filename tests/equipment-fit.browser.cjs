'use strict';

const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium,webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const engineName=process.env.CELLBOUND_TEST_ENGINE==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;

(async()=>{
  const browser=await engine.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:720,height:720}});
    await page.setContent('<!doctype html><html><head><style>body{margin:0}#fitHost{position:absolute;left:0;top:0;width:240px;height:410px}#fitHost>svg{width:240px;height:410px;display:block}</style></head><body><div id="fitHost"></div></body></html>');
    for(const file of ['gear-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js']){
      await page.addScriptTag({path:path.join(root,file)});
    }

    const result=await page.evaluate(()=>{
      const G=window.CellboundGear,P=window.CellboundPortraits,R=window.CellboundCharacterRig,host=document.querySelector('#fitHost');
      const races=['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari'],failures=[];
      const posFor=item=>item.slot==='Ring'?'Ring1':item.slot==='Trinket'?'Trinket1':item.slot;
      const fail=(item,race,gender,msg,box)=>{
        if(failures.length<40)failures.push({item:item.itemId,race,gender,msg,box});
      };
      const modelBox=(svg,el)=>{
        const sr=svg.getBoundingClientRect(),er=el.getBoundingClientRect(),sx=240/sr.width,sy=410/sr.height;
        return{x:(er.left-sr.left)*sx,y:(er.top-sr.top)*sy,w:er.width*sx,h:er.height*sy};
      };
      const distance=(b,x,y)=>{
        const dx=x<b.x?b.x-x:x>b.x+b.w?x-(b.x+b.w):0;
        const dy=y<b.y?b.y-y:y>b.y+b.h?y-(b.y+b.h):0;
        return Math.hypot(dx,dy);
      };
      const anchorFor=(item,pos,fit)=>{
        if(item.slot==='Weapon')return[fit.weaponX,fit.weaponY];
        if(item.slot==='OffHand')return[fit.offhandX,fit.offhandY];
        if(item.slot==='Hands')return[fit.leftHand,fit.handY];
        if(item.slot==='Shoulders')return[fit.leftShoulder,150];
        if(item.slot==='Waist')return[120,247];
        if(item.slot==='Chest')return[120,190];
        if(item.slot==='Legs')return[120,300];
        if(item.slot==='Feet')return[120,370];
        if(item.slot==='Head')return[120,48];
        if(item.slot==='Ring')return[fit.leftHand,fit.handY-1];
        if(item.slot==='Trinket')return[120-fit.waistHalf*.48,278];
        if(item.slot==='Relic')return[120-fit.p.waist*.95,233];
        return[120,205];
      };

      let checked=0;
      for(const item of G.items){
        const pos=posFor(item);
        for(const race of races)for(const gender of [0,1]){
          const appearance={race,gender,frame:1,skinTone:1,face:0,hair:0,hairColor:0,facialHair:0,marking:0,eyes:0,feature:0};
          const c={id:'browser-fit-'+checked,race,class:item.class,appearance,equipment:{[pos]:item}};
          host.innerHTML=P.paperDollSVG(c);
          const svg=host.querySelector('svg'),el=svg?.querySelector('.cb-paper-slot-'+pos.toLowerCase()),fit=P.gearFitProfile(c);
          if(!svg||!el){fail(item,race,gender,'slot layer missing');checked++;continue}
          const b=modelBox(svg,el);
          if(![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<1||b.h<1){
            fail(item,race,gender,'empty/invalid visual bounds',b);checked++;continue;
          }
          const margin=item.slot==='Weapon'?8:22;
          if(b.x<-margin||b.x+b.w>240+margin||b.y<-22||b.y+b.h>432)fail(item,race,gender,'visual escapes character canvas',b);
          const [ax,ay]=anchorFor(item,pos,fit),max=item.slot==='Shoulders'?24:item.slot==='Head'?25:item.slot==='Trinket'||item.slot==='Relic'?18:14;
          if(distance(b,ax,ay)>max)fail(item,race,gender,'visual misses anatomical anchor by '+distance(b,ax,ay).toFixed(1),b);

          if(item.slot==='Hands'){
            if(distance(b,fit.rightHand,fit.handY)>14)fail(item,race,gender,'right glove misses right hand',b);
          }
          if(item.slot==='Weapon'){
            if(!svg.outerHTML.includes('cb-paper-side-weapon')||!svg.outerHTML.includes('data-weapon-pose="side-held"'))fail(item,race,gender,'weapon is not using side-held presentation',b);
            if(fit.weaponX<fit.baseRightHand)fail(item,race,gender,'weapon grip moved inward over torso',b);
            if(distance(b,fit.weaponX,fit.weaponY)>8)fail(item,race,gender,'weapon misses side-held grip',b);
          }
          if(item.slot==='Shoulders'){
            if(distance(b,fit.rightShoulder,150)>24)fail(item,race,gender,'right shoulder misses shoulder anchor',b);
          }
          checked++;
        }
      }
      let loadoutChecks=0;
      const positions=G.EQUIPMENT_POSITION_ORDER,slotFor=pos=>pos.startsWith('Ring')?'Ring':pos.startsWith('Trinket')?'Trinket':pos;
      for(const klass of G.CLASS_ORDER)for(let tier=1;tier<=5;tier++)for(const race of races)for(const gender of [0,1])for(const frame of [0,1,2]){
        const equipment={};
        for(const pos of positions){
          const slot=slotFor(pos),item=G.items.find(x=>x.class===klass&&Number(x.tier)===tier&&x.slot===slot);
          if(item)equipment[pos]=item;
        }
        const c={id:'loadout-browser-'+loadoutChecks,race,class:klass,appearance:{race,gender,frame,skinTone:1,face:0,hair:0,hairColor:0,facialHair:0,marking:0,eyes:0,feature:0},equipment};
        host.innerHTML=P.paperDollSVG(c);
        const svg=host.querySelector('svg'),fit=P.gearFitProfile(c);
        if(!svg){fail({itemId:klass+'-T'+tier},race,gender,'full loadout svg missing');loadoutChecks++;continue}
        for(const pos of positions){
          const el=svg.querySelector('.cb-paper-slot-'+pos.toLowerCase());
          if(!el){fail({itemId:klass+'-T'+tier+'-'+pos},race,gender,'full loadout slot missing');continue}
          const b=modelBox(svg,el),margin=pos==='Weapon'?8:22;
          if(![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<1||b.h<1)fail({itemId:klass+'-T'+tier+'-'+pos},race,gender,'full loadout invalid bounds',b);
          else if(b.x<-margin||b.x+b.w>240+margin||b.y<-22||b.y+b.h>432)fail({itemId:klass+'-T'+tier+'-'+pos},race,gender,'full loadout escapes canvas',b);
        }
        const weapon=svg.querySelector('.cb-paper-side-weapon');
        if(!weapon||weapon.getAttribute('data-weapon-pose')!=='side-held')fail({itemId:klass+'-T'+tier+'-Weapon'},race,gender,'full loadout missing side-held weapon');
        if(fit.weaponX<fit.baseRightHand)fail({itemId:klass+'-T'+tier+'-Weapon'},race,gender,'full loadout weapon crosses torso');
        loadoutChecks++;
      }
      return{checked,total:G.items.length*12,itemCount:G.items.length,loadoutChecks,expectedLoadouts:G.CLASS_ORDER.length*5*6*2*3,failures,fitVersion:P.equipmentFitVersion,rigFitVersion:R.fitVersion};
    });

    assert.equal(result.fitVersion,3);
    assert.equal(result.rigFitVersion,3);
    assert.equal(result.checked,result.total);
    assert.equal(result.loadoutChecks,result.expectedLoadouts);
    assert.deepEqual(result.failures,[],'Rendered equipment fit failures: '+JSON.stringify(result.failures,null,2));
    console.log(engineName+' equipment fit v3 passed '+result.checked+' individual item/body combinations plus '+result.loadoutChecks+' complete loadouts across all 36 race/sex/frame bodies, including side-held weapon visibility.');
    await page.screenshot({path:'/tmp/cellbound-equipment-fit-'+engineName+'.png'});
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
