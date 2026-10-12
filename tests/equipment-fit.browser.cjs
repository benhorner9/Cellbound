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
      const childBox=(svg,selector)=>{const el=svg.querySelector(selector);return el?modelBox(svg,el):null};
      const contains=(b,x,y,pad=1)=>Boolean(b&&x>=b.x-pad&&x<=b.x+b.w+pad&&y>=b.y-pad&&y<=b.y+b.h+pad);
      const anchorFor=(item,pos,fit)=>{
        if(item.slot==='Weapon')return[fit.weaponX,fit.weaponY];
        if(item.slot==='OffHand')return[fit.offhandX,fit.offhandY];
        if(item.slot==='Hands')return[fit.leftHand,fit.handY];
        if(item.slot==='Shoulders')return[fit.leftPad,151];
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
            const lb=childBox(svg,'.cb-paper-glove-left'),rb=childBox(svg,'.cb-paper-glove-right');
            if(!contains(lb,fit.leftHand,fit.handY-4,2))fail(item,race,gender,'left glove does not wrap left hand',lb);
            if(!contains(rb,fit.rightHand,fit.rightHandY-4,2))fail(item,race,gender,'right glove does not wrap right hand',rb);
            if(lb&&lb.w>fit.p.hand*17+8)fail(item,race,gender,'left glove is oversized for hand',lb);
            if(rb&&rb.w>fit.p.hand*17+8)fail(item,race,gender,'right glove is oversized for hand',rb);
          }
          if(item.slot==='Weapon'){
            if(!svg.outerHTML.includes('cb-paper-side-weapon')||!svg.outerHTML.includes('data-weapon-pose="side-held"'))fail(item,race,gender,'weapon is not using side-held presentation',b);
            if(fit.weaponX<fit.weaponSideMin)fail(item,race,gender,'weapon grip moved inward over torso',b);
            if(fit.weaponX>=fit.rightShoulder-fit.p.shoulder*.25)
              fail(item,race,gender,'weapon hand must visibly cross inside the shoulder',b);
            if(!svg.outerHTML.includes('data-weapon-pose-layout="across-body"'))
              fail(item,race,gender,'model still uses floating-side weapon stance',b);
            if(distance(b,fit.weaponX,fit.weaponY)>8)fail(item,race,gender,'weapon misses the held grip',b);
            if(el.getAttribute('data-weapon-pose-version')!=='2')fail(item,race,gender,'old floating weapon pose',b);
            const localX=Number(el.getAttribute('data-grip-local-x')),localY=Number(el.getAttribute('data-grip-local-y'));
            const matrix=el.getScreenCTM(),svgPoint=svg.createSVGPoint();
            svgPoint.x=localX;svgPoint.y=localY;
            const aligned=matrix?svgPoint.matrixTransform(matrix):null;
            const screenPoint=svg.createSVGPoint();screenPoint.x=fit.weaponX;screenPoint.y=fit.weaponY;
            const target=svg.getScreenCTM()?screenPoint.matrixTransform(svg.getScreenCTM()):null;
            if(!aligned||!target||Math.hypot(aligned.x-target.x,aligned.y-target.y)>2)
              fail(item,race,gender,'weapon handle does not touch the hand socket',b);
            if(!svg.querySelector('.cb-paper-held-grip-main .cb-paper-weapon-grip-hand'))
              fail(item,race,gender,'front fingers do not wrap the weapon handle',b);

            const forearm=svg.querySelector('.cb-paper-weapon-forearm');
            if(!forearm||forearm.getAttribute('data-weapon-forearm')!=='across-body'||
                Number(forearm.getAttribute('data-forearm-slope'))<36){
              fail(item,race,gender,'main hand is not supported by a visibly bent forearm',b);
            }else{
              const armBox=modelBox(svg,forearm);
              if(distance(armBox,fit.weaponX,fit.weaponY)>3)
                fail(item,race,gender,'forearm does not connect to the raised wrist',armBox);
              if(!(fit.weaponY<=251&&fit.weaponY<fit.handY-20))
                fail(item,race,gender,'weapon hand is still down beside the hip',armBox);
              const rightGlove=childBox(svg,'.cb-paper-glove-right');
              if(!contains(rightGlove,fit.weaponX,fit.weaponY,2))
                fail(item,race,gender,'glove and weapon have different wrist positions',rightGlove);
            }
            const type=P.weaponType(item,c);
            if(type==='sword'||type==='greatsword'){
              const guard=childBox(svg,'.cb-paper-hilt-guard'),blade=childBox(svg,'.cb-paper-held-blade');
              if(!guard||!blade)fail(item,race,gender,'missing physical hilt or blade geometry',b);
              else{
                const guardY=guard.y+guard.h/2;
                if(Math.abs(guardY-(fit.weaponY-17))>13)
                  fail(item,race,gender,'sword crossguard floats away from gripping fist',guard);
                if(blade.y>fit.weaponY-80||blade.y+blade.h>fit.weaponY-6)
                  fail(item,race,gender,'sword blade no longer points up from the hand',blade);
              }
            }
          }
          if(item.slot==='Shoulders'){
            const lb=childBox(svg,'.cb-paper-pad-left'),rb=childBox(svg,'.cb-paper-pad-right');
            if(!contains(lb,fit.leftPad,151,4))fail(item,race,gender,'left pad floats away from fitted pad centre',lb);
            if(!contains(rb,fit.rightPad,151,4))fail(item,race,gender,'right pad floats away from fitted pad centre',rb);
            if(distance(lb,fit.leftShoulder,151)>8)fail(item,race,gender,'left pad no longer overlaps shoulder joint',lb);
            if(distance(rb,fit.rightShoulder,151)>8)fail(item,race,gender,'right pad no longer overlaps shoulder joint',rb);
          }
          if(item.slot==='Chest'){
            const shell=childBox(svg,'.cb-paper-chest-shell');
            if(!shell||shell.w>fit.p.shoulder*1.9+8)fail(item,race,gender,'chest shell is too wide for torso',shell);
            if(shell&&shell.y+shell.h<235)fail(item,race,gender,'chest shell leaves waist gap',shell);
          }
          if(item.slot==='Waist'){
            const belt=childBox(svg,'.cb-paper-waist-belt');
            if(!belt||belt.w>fit.waistHalf*2+9)fail(item,race,gender,'belt is too wide for waist',belt);
          }
          if(item.slot==='Legs'&&P.clothLowerStyle(item)==='trousers'){
            const lb=childBox(svg,'.cb-paper-leg-left'),rb=childBox(svg,'.cb-paper-leg-right');
            if(!contains(lb,fit.leftLeg,280,3)||!contains(rb,fit.rightLeg,280,3))fail(item,race,gender,'leg armour misses leg centres',{left:lb,right:rb});
            if(lb&&rb&&rb.x-(lb.x+lb.w)>16)fail(item,race,gender,'leg armour gap is too large',{left:lb,right:rb});
          }
          if(item.slot==='Feet'){
            const lb=childBox(svg,'.cb-paper-boot-left'),rb=childBox(svg,'.cb-paper-boot-right');
            if(!contains(lb,fit.leftLeg,370,3)||!contains(rb,fit.rightLeg,370,3))fail(item,race,gender,'boots miss ankle centres',{left:lb,right:rb});
            if(lb&&lb.w>fit.footHalf*2.8+8)fail(item,race,gender,'left boot is oversized',lb);
            if(rb&&rb.w>fit.footHalf*2.8+8)fail(item,race,gender,'right boot is oversized',rb);
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
        if(fit.weaponX<fit.weaponSideMin)fail({itemId:klass+'-T'+tier+'-Weapon'},race,gender,'full loadout weapon crosses torso');
        if(fit.weaponX>=fit.rightShoulder-fit.p.shoulder*.25)
          fail({itemId:klass+'-T'+tier+'-Weapon'},race,gender,'full loadout wrist hangs outside the torso');
        if(!svg.querySelector('.cb-paper-weapon-forearm')||!contains(childBox(svg,'.cb-paper-glove-right'),fit.weaponX,fit.weaponY,2))
          fail({itemId:klass+'-T'+tier+'-Weapon'},race,gender,'full loadout raised wrist or bent arm missing');
        if(weapon){
          const type=weapon.getAttribute('data-weapon-type');
          if(['sword','greatsword'].includes(type)){
            const guard=childBox(svg,'.cb-paper-hilt-guard');
            if(!guard||Math.abs(guard.y+guard.h/2-(fit.weaponY-17))>13)
              fail({itemId:klass+'-T'+tier+'-Weapon'},race,gender,'full loadout sword hilt does not meet hand',guard);
          }
        }
        const chest=childBox(svg,'.cb-paper-chest-shell'),belt=childBox(svg,'.cb-paper-waist-belt');
        if(chest&&belt&&belt.y-(chest.y+chest.h)>5)fail({itemId:klass+'-T'+tier+'-Chest/Waist'},race,gender,'visible chest-to-waist gap',{chest,belt});
        const lp=childBox(svg,'.cb-paper-pad-left'),rp=childBox(svg,'.cb-paper-pad-right');
        if(!contains(lp,fit.leftPad,151,4)||!contains(rp,fit.rightPad,151,4))fail({itemId:klass+'-T'+tier+'-Shoulders'},race,gender,'full loadout pads float from body',{left:lp,right:rp});
        const lg=childBox(svg,'.cb-paper-glove-left'),rg=childBox(svg,'.cb-paper-glove-right');
        if(!contains(lg,fit.leftHand,fit.handY-4,2)||!contains(rg,fit.rightHand,fit.rightHandY-4,2))fail({itemId:klass+'-T'+tier+'-Hands'},race,gender,'full loadout gloves miss hands',{left:lg,right:rg});
        const lb=childBox(svg,'.cb-paper-boot-left'),rb=childBox(svg,'.cb-paper-boot-right');
        if(!contains(lb,fit.leftLeg,370,3)||!contains(rb,fit.rightLeg,370,3))fail({itemId:klass+'-T'+tier+'-Feet'},race,gender,'full loadout boots miss ankles',{left:lb,right:rb});
        loadoutChecks++;
      }
      return{checked,total:G.items.length*12,itemCount:G.items.length,loadoutChecks,expectedLoadouts:G.CLASS_ORDER.length*5*6*2*3,failures,fitVersion:P.equipmentFitVersion,rigFitVersion:R.fitVersion};
    });

    assert.equal(result.fitVersion,4);
    assert.equal(result.rigFitVersion,4);
    assert.equal(result.checked,result.total);
    assert.equal(result.loadoutChecks,result.expectedLoadouts);
    assert.deepEqual(result.failures,[],'Rendered equipment fit failures: '+JSON.stringify(result.failures,null,2));
    console.log(engineName+' equipment fit v4 passed '+result.checked+' individual item/body combinations plus '+result.loadoutChecks+' complete loadouts: shoulders, gloves, torso/waist, legs, boots and side-held weapons all body-fitted.');
    await page.screenshot({path:'/tmp/cellbound-equipment-fit-'+engineName+'.png'});
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
