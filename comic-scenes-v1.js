(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let activeToken=0;
const BUCKET='comic-scene-art',published=new Map(),catalog=new Map(),publishedText=new Map();
let pendingLoad=null,lastArtLoad=0;
const slug=v=>String(v||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function sceneKey(config={}){
 return [config.theme||'zeltira',config.page||'story',config.title||'scene',config.subtitle||config.speaker||''].map(slug).filter(Boolean).join('-').slice(0,180)
}
function registerScene(config={}){
 const id=sceneKey(config);
 catalog.set(id,{...config,panels:Array.isArray(config.panels)?config.panels.map(p=>({...p})):[]});
 return id
}
async function reloadArt(){
 const db=window.CellboundGame?.getSupabase?.();
 if(!db)return false;
 const {data,error}=await db.from('comic_scene_panel_art').select('scene_id,panel_index,object_path');
 if(error)throw error;
 published.clear();(data||[]).forEach(row=>published.set(row.scene_id+':'+row.panel_index,row.object_path));
 const captions=await db.from('cellbound_comic_text').select('scene_id,panels');
 if(!captions.error){publishedText.clear();(captions.data||[]).forEach(row=>publishedText.set(row.scene_id,row.panels))}
 lastArtLoad=Date.now();
 return true
}
function loadArt(){
 if(lastArtLoad&&Date.now()-lastArtLoad<30000)return Promise.resolve(true);
 if(!pendingLoad)pendingLoad=reloadArt().catch(error=>{console.warn('Comic panel art unavailable',error);return false}).finally(()=>{pendingLoad=null});
 return pendingLoad
}
function artworkFor(config,index,fallback=''){
 const path=published.get(sceneKey(config)+':'+index),db=window.CellboundGame?.getSupabase?.();
 return path&&db?db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl:fallback
}

function ensureRoot(){
  let root=$('#cellboundComicScene');
  if(root)return root;
  root=document.createElement('div');
  root.id='cellboundComicScene';
  root.className='cbcomic-backdrop';
  root.hidden=true;
  document.body.appendChild(root);
  return root;
}
function party(){
  return window.CellboundGame?.getPartyCharacters?.()||window.CellboundGame?.getState?.()?.roster||[];
}
function portrait(c,size='sm'){
  return window.CellboundPortraits?.portraitHTML?.(c,{size})||'<span class="cbcomic-fallback-portrait">'+esc(String(c?.name||'?').slice(0,2).toUpperCase())+'</span>';
}
function scenePartyMarkup(){
  const p=party().slice(0,5);
  if(!p.length)return'<div class="cbcomic-party-empty">Your party</div>';
  return'<div class="cbcomic-party-strip">'+p.map((c,i)=>'<div class="cbcomic-party-member" style="--i:'+i+'">'+portrait(c,'sm')+'<span>'+esc(c.name)+'</span></div>').join('')+'</div>';
}
function panelMarkup(panel,index,suppressCaption=false){
  const p=panel||{},kind=String(p.kind||'location').replace(/[^a-z0-9_-]/gi,'');
  const art=p.artwork?'<img src="'+esc(p.artwork)+'" alt="'+esc(p.artAlt||p.title||'Illustrated story scene')+'" decoding="async" loading="eager">':'';
  const speaker=p.speaker?'<div class="cbcomic-panel-speaker">'+esc(p.speaker)+'</div>':'';
  const caption=!suppressCaption&&(p.eyebrow||p.title||p.text)?'<div class="cbcomic-panel-caption">'+(p.eyebrow?'<small>'+esc(p.eyebrow)+'</small>':'')+(p.title?'<b>'+esc(p.title)+'</b>':'')+(p.text?'<span>'+esc(p.text)+'</span>':'')+'</div>':'';
  const sigil=p.icon?'<i class="cbcomic-panel-icon">'+esc(p.icon)+'</i>':'';
  return'<article class="cbcomic-panel kind-'+kind+' panel-'+(index+1)+' '+(p.wide?'wide ':'')+(p.artwork?'has-art':'')+'" data-panel="'+index+'">'+art+'<div class="cbcomic-panel-art" aria-hidden="true"><i></i><i></i><i></i><em></em></div>'+sigil+speaker+caption+'</article>';
}
function choiceMarkup(choice,index){
  const c=choice||{};
  return'<button type="button" data-comic-choice="'+esc(c.id||String(index))+'"><i>'+esc(c.icon||['◇','?','⚔'][index%3])+'</i><span>'+esc(c.label||'Continue')+'</span></button>';
}
function revealMarkup(r){
  const place=String(r?.placement||'bottom-left').replace(/[^a-z-]/g,'');
  return'<div class="cbcomic-panel-caption cbcomic-reveal-caption place-'+place+'">'+
    (r?.eyebrow?'<small>'+esc(r.eyebrow)+'</small>':'')+
    (r?.speaker?'<small class="cbcomic-reveal-speaker">'+esc(r.speaker)+'</small>':'')+
    (r?.title?'<b>'+esc(r.title)+'</b>':'')+
    (r?.text?'<span>'+esc(r.text)+'</span>':'')+
  '</div>';
}
async function show(config={}){
  const token=++activeToken;
  registerScene(config);
  await loadArt();
  if(token!==activeToken)return{choiceId:null,skipped:true};
  const root=ensureRoot();
  document.body.classList.add('cbcomic-open');
  root.hidden=false;
  return new Promise(resolve=>{
    let selected=null,resolved=false,revealIndex=0;
    const finish=result=>{
      if(resolved)return;resolved=true;
      root.hidden=true;root.innerHTML='';document.body.classList.remove('cbcomic-open');
      resolve(result||{choiceId:selected,skipped:false});
    };
    const original=Array.isArray(config.panels)&&config.panels.length?config.panels:[{kind:'location',title:config.title,text:config.text}];
    const text=config.boothPreview?null:publishedText.get(sceneKey(config));
    const panels=original.map((p,i)=>({...p,...(text?.[i]||{}),artwork:config.boothPreview?p.artwork:artworkFor(config,i,p.artwork)}));
    const choices=Array.isArray(config.choices)?config.choices:[];
    const explicitReveals=Array.isArray(config.reveals)?config.reveals.map(r=>({...r,...(text?.[r.panel]||{})})):[];
    const reveals=explicitReveals.length?explicitReveals:(config.progressive?panels.map((p,i)=>({panel:i,eyebrow:p.eyebrow||'',speaker:p.speaker||'',title:p.title||'',text:p.text||'',placement:['bottom-left','top-left','bottom-right'][i%3]})).filter(r=>r.eyebrow||r.speaker||r.title||r.text):[]);
    const progressive=reveals.length>0;
    const storyOnly=Boolean(config.storyOnly||config.panelOnly);
    const skipButton=config.allowSkip===false?'':'<button type="button" data-comic-skip>'+esc(config.skipLabel||'SKIP')+'</button>';
    root.dataset.theme=config.theme||'zeltira';
    const dialogue=storyOnly
      ? '<footer class="cbcomic-dialogue cbcomic-story-only"><div class="cbcomic-controls"><div id="cbcomicChoices" class="cbcomic-choices" '+(progressive||!choices.length?'hidden':'')+'>'+choices.map(choiceMarkup).join('')+'</div><div class="cbcomic-actions">'+skipButton+'<button type="button" class="primary" data-comic-continue '+((choices.length&&!progressive)?'disabled':'')+'>'+esc(progressive?(config.nextLabel||'NEXT →'):(config.continueLabel||'CONTINUE →'))+'</button></div></div></footer>'
      : '<footer class="cbcomic-dialogue">'+
        '<div class="cbcomic-speaker">'+(config.speakerPortrait?'<img src="'+esc(config.speakerPortrait)+'" alt="">':'<span>'+esc(config.speakerMark||String(config.speaker||'NPC').split(/\s+/).map(x=>x[0]).slice(0,2).join(''))+'</span>')+'<div><small>'+esc(config.speakerRole||'')+'</small><b>'+esc(config.speaker||'Narrator')+'</b></div></div>'+
        '<div class="cbcomic-line"><p id="cbcomicLine">'+esc(config.line||'')+'</p><div id="cbcomicReply" class="cbcomic-reply" hidden></div></div>'+
        '<div class="cbcomic-controls"><div id="cbcomicChoices" class="cbcomic-choices" '+(progressive?'hidden':'')+'>'+choices.map(choiceMarkup).join('')+'</div><div class="cbcomic-actions">'+skipButton+'<button type="button" class="primary" data-comic-continue '+((choices.length&&!progressive)?'disabled':'')+'>'+esc(progressive?(config.nextLabel||'NEXT →'):(config.continueLabel||'CONTINUE →'))+'</button></div></div>'+
      '</footer>';
    root.innerHTML='<section class="cbcomic-shell" role="dialog" aria-modal="true" aria-label="'+esc(config.title||'Story scene')+'">'+
      '<header class="cbcomic-head"><div><small>'+esc(config.eyebrow||'CELLBOUND · STORY')+'</small><h2>'+esc(config.title||'Story Scene')+'</h2><span>'+esc(config.subtitle||'')+'</span></div><div class="cbcomic-page-mark">'+esc(config.page||'STORY')+'</div></header>'+
      '<div class="cbcomic-page count-'+panels.length+'">'+panels.map((p,i)=>panelMarkup(p,i,progressive)).join('')+'</div>'+
      ((config.hideParty||config.panelOnly)?'':scenePartyMarkup())+
      dialogue+
    '</section>';
    // A missing approved illustration must not cover the dialogue with a
    // browser broken-image icon. Keep the panel and its story controls usable.
    root.querySelectorAll('.cbcomic-panel img').forEach(img=>{
      const unavailable=()=>{img.closest('.cbcomic-panel')?.classList.add('art-unavailable');img.remove()};
      img.addEventListener('error',unavailable,{once:true});
      if(img.complete&&img.naturalWidth===0)unavailable();
    });

    const continueBtn=root.querySelector('[data-comic-continue]');
    const choicesWrap=root.querySelector('#cbcomicChoices');
    const updateProgressiveControls=()=>{
      if(!progressive)return;
      const done=revealIndex>=reveals.length;
      if(done&&choices.length){
        if(choicesWrap)choicesWrap.hidden=false;
        if(continueBtn){continueBtn.disabled=true;continueBtn.textContent=config.continueLabel||'CONTINUE →';}
      }else if(done){
        if(continueBtn){continueBtn.disabled=false;continueBtn.textContent=config.continueLabel||'CONTINUE →';}
      }else if(continueBtn){
        continueBtn.disabled=false;continueBtn.textContent=config.nextLabel||'NEXT →';
      }
    };
    const revealNext=()=>{
      if(!progressive||revealIndex>=reveals.length)return false;
      const r=reveals[revealIndex++];
      const idx=Math.max(0,Math.min(panels.length-1,Number(r?.panel)||0));
      root.querySelectorAll('.cbcomic-panel').forEach(x=>x.classList.remove('reveal-active'));
      const panel=root.querySelector('[data-panel="'+idx+'"]');
      if(panel){
        panel.classList.add('reveal-active');
        const node=document.createElement('div');
        node.innerHTML=revealMarkup(r);
        const box=node.firstElementChild;
        panel.querySelectorAll('.cbcomic-reveal-caption').forEach(old=>old.remove());
        if(box)panel.appendChild(box);
      }
      updateProgressiveControls();
      return true;
    };

    root.querySelector('[data-comic-skip]')?.addEventListener('click',()=>finish({choiceId:selected,skipped:true}));
    continueBtn?.addEventListener('click',()=>{
      if(progressive&&revealIndex<reveals.length){revealNext();return}
      if(choices.length&&!selected)return;
      finish({choiceId:selected,skipped:false});
    });
    root.querySelectorAll('[data-comic-choice]').forEach(btn=>btn.addEventListener('click',()=>{
      if(token!==activeToken)return;
      const id=btn.dataset.comicChoice,choice=choices.find(c=>String(c.id)===String(id))||choices[Number(id)]||{};
      selected=id;
      root.querySelectorAll('[data-comic-choice]').forEach(x=>{x.classList.toggle('selected',x===btn);x.disabled=true});
      const reply=root.querySelector('#cbcomicReply');
      if(reply){reply.hidden=false;reply.innerHTML='<small>'+esc(choice.replySpeaker||config.speaker||'')+'</small><p>'+esc(choice.reply||config.defaultReply||'')+'</p>'}
      if(continueBtn){continueBtn.disabled=false;continueBtn.focus()}
    }));
    if(progressive)revealNext();else updateProgressiveControls();
  });
}
function close(){
  activeToken++;const root=ensureRoot();root.hidden=true;root.innerHTML='';document.body.classList.remove('cbcomic-open');
}
window.CellboundComicScenes={show,close,sceneKey,registerScene,catalog:()=>[...catalog.values()],artworkFor,reloadArt,loadArt,version:'1.3.0'};
})();