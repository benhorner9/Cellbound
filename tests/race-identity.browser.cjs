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
    const page=await browser.newPage({viewport:{width:1440,height:1060},deviceScaleFactor:1});
    await page.setContent('<!doctype html><html><head><style>'+
      'body{margin:0;background:#081018;color:#eef6f7;font-family:system-ui;padding:28px}'+
      'h1{margin:0 0 22px;font-size:28px}'+
      '#grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}'+
      '.card{background:#111c25;border:1px solid #2a3b46;border-radius:16px;padding:12px;text-align:center;overflow:hidden}'+
      '.model{height:390px;display:flex;align-items:flex-end;justify-content:center}'+
      '.model svg{width:210px;height:359px;display:block}'+
      '.race{font-weight:800;font-size:16px}.sex{font-size:12px;opacity:.7}'+
      '</style></head><body><h1>Cellbound Race Identity V2</h1><div id="grid"></div></body></html>');
    for(const file of ['item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js']){
      await page.addScriptTag({path:path.join(root,file)});
    }

    const result=await page.evaluate(()=>{
      const P=window.CellboundPortraits,R=window.CellboundCharacterRig;
      const races=['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari'],grid=document.querySelector('#grid'),profiles={},neckFailures=[];
      const modelBox=(svg,el)=>{
        const sr=svg.getBoundingClientRect(),er=el.getBoundingClientRect(),sx=240/sr.width,sy=410/sr.height;
        return{x:(er.left-sr.left)*sx,y:(er.top-sr.top)*sy,w:er.width*sx,h:er.height*sy};
      };
      let checked=0;
      for(const race of races){
        profiles[race]=P.bodyProfile({race,appearance:{race,gender:0,frame:1}});
        for(const gender of [0,1]){
          const c={id:'race-v2-'+race+'-'+gender,race,class:'Warrior',appearance:{race,gender,frame:1,skinTone:2,face:0,hair:0,hairColor:0,facialHair:0,marking:0,eyes:0,feature:0},equipment:{}};
          const svg=P.paperDollSVG(c,{showGear:false});
          const wrap=document.createElement('article');wrap.className='card';wrap.innerHTML='<div class="model">'+svg+'</div><div class="race">'+race+'</div><div class="sex">'+(gender?'FEMALE':'MALE')+'</div>';grid.appendChild(wrap);
          const root=wrap.querySelector('svg');
          if(!root||root.dataset.raceIdentity!=='v2'||root.dataset.race!==race)throw new Error(race+' '+gender+' missing Race Identity V2 root contract');
          if(!svg.includes('cb-paper-race-'+race.toLowerCase()))throw new Error(race+' '+gender+' missing race-specific silhouette/detail class');
          if(svg.includes('cb-paper-slot-chest')||svg.includes('cb-paper-slot-legs')||svg.includes('cb-paper-slot-feet'))throw new Error(race+' '+gender+' base preview unexpectedly contains equipment');
          const neck=root.querySelector('.cb-paper-neck'),head=root.querySelector('.cb-paper-head');
          if(!neck||!head)throw new Error(race+' '+gender+' missing head/neck geometry');
          const nb=modelBox(root,neck),hb=modelBox(root,head),visible=Math.max(0,(nb.y+nb.h)-(hb.y+hb.h));
          if(nb.h>31||hb.y+hb.h<nb.y+4||visible>22)neckFailures.push({race,gender,neck:nb,head:hb,visible});
          checked++;
        }
      }
      return{checked,profiles,neckFailures,fitVersion:P.equipmentFitVersion,rigFitVersion:R.fitVersion,raceIdentityVersion:P.raceIdentityVersion};
    });

    assert.equal(result.raceIdentityVersion,2);
    assert.equal(result.fitVersion,4);
    assert.equal(result.rigFitVersion,3);
    assert.equal(result.checked,12);
    assert.deepEqual(result.neckFailures,[],'Heads must overlap short natural necks: '+JSON.stringify(result.neckFailures,null,2));
    const p=result.profiles;
    assert(p.Stoneborn.shoulder>p.Emberkin.shoulder&&p.Emberkin.shoulder>p.Thornkin.shoulder&&p.Thornkin.shoulder>p.Veyren.shoulder&&p.Veyren.shoulder>p.Nymari.shoulder&&p.Nymari.shoulder>p.Aelari.shoulder);
    assert(p.Stoneborn.waist-p.Aelari.waist>=18);
    assert(p.Stoneborn.hand>1.2&&p.Aelari.hand<.9);
    assert(p.Nymari.hip>p.Veyren.hip&&p.Nymari.hip>p.Aelari.hip);

    await page.screenshot({path:'/tmp/cellbound-race-identity-v2-'+engineName+'.png',fullPage:true});
    console.log(engineName+' Race Identity V2 passed: 12 race/sex base models, short natural neck proportions, distinct anatomy ordering and universal fit compatibility.');
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
