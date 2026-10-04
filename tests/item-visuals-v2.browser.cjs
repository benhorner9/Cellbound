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
    const page=await browser.newPage({viewport:{width:1500,height:1200},deviceScaleFactor:1});
    await page.setContent('<!doctype html><html><head><style>'+
      'body{margin:0;background:#081018;color:#edf5f4;font-family:system-ui;padding:24px}'+
      'h1{margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}'+
      '.card{background:#111b23;border:1px solid #2b3d47;border-radius:14px;padding:10px;text-align:center;overflow:hidden}'+
      '.model{height:365px;display:flex;align-items:flex-end;justify-content:center}.model svg{width:205px;height:350px}'+
      '.icons{display:flex;gap:7px;justify-content:center;align-items:center;margin-top:8px}.icons .cb-item-art{display:inline-flex}'+
      '.label{font-weight:800;margin-top:5px}.tier{font-size:12px;opacity:.7}'+
      '</style></head><body><h1>Cellbound Item Visuals V2 — Full Class / Set-First Palette Matrix</h1><div class="grid" id="grid"></div></body></html>');

    for(const file of ['gear-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js','item-art-v1.js']){
      await page.addScriptTag({path:path.join(root,file)});
    }

    const result=await page.evaluate(()=>{
      const G=window.CellboundGear,P=window.CellboundPortraits,IA=window.CellboundItemArt;
      const classes=G.CLASS_ORDER.slice(),positions=G.EQUIPMENT_POSITION_ORDER,grid=document.querySelector('#grid'),signatures={},failures=[],paletteSamples={},lowerStyles={};
      const slotFor=pos=>pos.startsWith('Ring')?'Ring':pos.startsWith('Trinket')?'Trinket':pos;
      const slug=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      let checked=0;
      classes.forEach((klass,ci)=>{
        signatures[klass]=[];paletteSamples[klass]={};lowerStyles[klass]=[];
        for(let tier=1;tier<=5;tier++){
          const equipment={};
          for(const pos of positions){
            const slot=slotFor(pos),item=G.items.find(x=>x.class===klass&&Number(x.tier)===tier&&x.slot===slot);
            if(!item){failures.push(klass+' T'+tier+' missing '+slot);continue}
            equipment[pos]=item;
          }
          const race='Veyren',appearance={race,gender:ci%2,frame:1,skinTone:2,face:0,hair:0,hairColor:0,facialHair:0,marking:0,eyes:0,feature:0};
          const c={id:'item-v2-'+slug(klass)+'-'+tier,race,class:klass,appearance,equipment};
          const svg=P.paperDollSVG(c),chest=equipment.Chest,weapon=equipment.Weapon,classSlug=slug(klass),mode=tier>=4?'set-first':'material-first';
          if(!svg.includes('data-item-visuals="v2"'))failures.push(klass+' T'+tier+' model missing V2 root');
          if(!svg.includes('data-equipment-fit="v3"')||!svg.includes('data-weapon-pose="side-held-v1"'))failures.push(klass+' T'+tier+' model missing fit v3 / side-held contract');
          if(!svg.includes('cb-paper-side-weapon')||!svg.includes('data-weapon-pose="side-held"'))failures.push(klass+' T'+tier+' weapon is not side-held');
          const fit=P.gearFitProfile(c);
          if(fit.weaponX<fit.weaponSideMin)failures.push(klass+' T'+tier+' weapon moved inward across body');
          if(!svg.includes('data-palette-mode="gear-owned"'))failures.push(klass+' T'+tier+' root missing gear-owned palette contract');
          if(!svg.includes('data-class-visual="'+classSlug+'"'))failures.push(klass+' T'+tier+' worn class signature missing');
          if(!svg.includes('data-palette-mode="'+mode+'"'))failures.push(klass+' T'+tier+' worn palette mode should be '+mode);
          if(/NaN|Infinity|undefined/.test(svg))failures.push(klass+' T'+tier+' invalid SVG');
          const chestIcon=G.artHTML(chest,54),weaponIcon=G.artHTML(weapon,54);
          if(!chestIcon.includes('data-class-visual="'+classSlug+'"'))failures.push(klass+' T'+tier+' chest icon missing class signature');
          if(!weaponIcon.includes('data-class-visual="'+classSlug+'"'))failures.push(klass+' T'+tier+' weapon icon missing class signature');
          if(!chestIcon.includes('data-palette-mode="'+mode+'"')||!weaponIcon.includes('data-palette-mode="'+mode+'"'))failures.push(klass+' T'+tier+' item-card palette mode should be '+mode);
          const pal=P.gearPalette(c,chest,tier,'Chest');
          paletteSamples[klass][tier]={base:pal.base,accent:pal.accent,mode:pal.paletteMode,classColor:P.CLASS_COLORS[klass]};
          const lower=P.clothLowerStyle(equipment.Legs);lowerStyles[klass].push(lower);
          if(!svg.includes('data-lower-silhouette="'+lower+'"'))failures.push(klass+' T'+tier+' lower silhouette marker mismatch');
          const signature=svg.replace(/pd[a-z0-9]+/g,'ID').replace(/#[0-9a-f]{6}/gi,'#HEX');
          signatures[klass].push(signature);
          const card=document.createElement('article');card.className='card';
          card.innerHTML='<div class="model">'+svg+'</div><div class="icons">'+chestIcon+weaponIcon+'</div><div class="label">'+klass+'</div><div class="tier">TIER '+tier+' · '+mode.toUpperCase()+'</div>';
          grid.appendChild(card);
          const model=card.querySelector('.model svg'),mr=model.getBoundingClientRect();
          if(mr.width<150||mr.height<300)failures.push(klass+' T'+tier+' model collapsed');
          card.querySelectorAll('.cb-item-art svg').forEach(icon=>{const r=icon.getBoundingClientRect();if(r.width<35||r.height<35)failures.push(klass+' T'+tier+' icon collapsed')});
          checked++;
        }
      });
      return{checked,failures,signatures,paletteSamples,lowerStyles,classCount:classes.length,itemVisualsVersion:P.itemVisualsVersion,equipmentFitVersion:P.equipmentFitVersion,weaponPoseVersion:P.weaponPoseVersion,itemArtVersion:IA.ITEM_VISUALS_VERSION,direction:IA.ART_DIRECTION};
    });

    assert.equal(result.itemVisualsVersion,2);
    assert.equal(result.equipmentFitVersion,3);
    assert.equal(result.weaponPoseVersion,1);
    assert.equal(result.itemArtVersion,2);
    assert.equal(result.direction,'class-tier-v2');
    assert.equal(result.classCount,13);
    assert.equal(result.checked,65);
    assert.deepEqual(result.failures,[]);
    for(const [klass,sigs] of Object.entries(result.signatures)){
      assert.equal(new Set(sigs).size,5,klass+' must have five visibly distinct tier renders');
      const p=result.paletteSamples[klass];
      assert.equal(p[1].mode,'material-first');assert.equal(p[3].mode,'material-first');
      assert.equal(p[4].mode,'set-first');assert.equal(p[5].mode,'set-first');
      assert.notEqual(p[4].base.toLowerCase(),p[4].classColor.toLowerCase(),klass+' T4 set cannot be a class-colour uniform');
      assert.notEqual(p[5].base.toLowerCase(),p[5].classColor.toLowerCase(),klass+' T5 set cannot be a class-colour uniform');
      assert.equal(p[4].accent.toLowerCase(),p[4].classColor.toLowerCase(),klass+' class colour remains an accent');
      assert.notEqual(p[4].base,p[5].base,klass+' T4/T5 sets must have their own collection palettes');
    }
    assert.equal(new Set(Object.values(result.signatures).map(x=>x[4])).size,13,'All 13 class T5 gear signatures must remain distinct on the same race base');
    assert.equal(new Set(Object.values(result.paletteSamples).map(x=>x[4].base)).size,13,'All 13 T4 set palettes must be distinct');
    assert.equal(new Set(Object.values(result.paletteSamples).map(x=>x[5].base)).size,13,'All 13 T5 set palettes must be distinct');
    for(const klass of ['Mage','Priest','Warlock','Druid']){
      const styles=result.lowerStyles[klass];
      assert(styles.includes('trousers'),klass+' must keep at least one trouser tier');
      assert(styles.some(x=>x!=='trousers'),klass+' must include robe/skirt lower silhouettes');
      assert(new Set(styles).size>=2,klass+' lower-body silhouettes must vary by tier');
    }
    await page.screenshot({path:'/tmp/cellbound-item-visuals-v2-'+engineName+'.png',fullPage:true});
    console.log(engineName+' Item Visuals V2 / fit v3 passed: 13 classes × 5 tiers, side-held weapons, varied cloth lowers, set-owned palettes and matching inventory icons.');
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
