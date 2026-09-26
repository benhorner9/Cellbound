(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let activeToken=0;

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
  const art=p.artwork?'<img src="'+esc(p.artwork)+'" alt="">':'';
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
function show(config={}){
  const root=ensureRoot(),token=++activeToken;
  document.body.classList.add('cbcomic-open');
  root.hidden=false;
  return new Promise(resolve=>{
    let selected=null,resolved=false,revealIndex=0;
    const finish=result=>{
      if(resolved)return;resolved=true;
      root.hidden=true;root.innerHTML='';document.body.classList.remove('cbcomic-open');
      resolve(result||{choiceId:selected,skipped:false});
    };
    const panels=Array.isArray(config.panels)&&config.panels.length?config.panels:[{kind:'location',title:config.title,text:config.text}];
    const choices=Array.isArray(config.choices)?config.choices:[];
    const reveals=Array.isArray(config.reveals)?config.reveals:[];
    const progressive=reveals.length>0;
    const storyOnly=Boolean(config.storyOnly);
    root.dataset.theme=config.theme||'zeltira';
    const dialogue=storyOnly
      ? '<footer class="cbcomic-dialogue cbcomic-story-only"><div class="cbcomic-controls"><div id="cbcomicChoices" class="cbcomic-choices" '+(progressive||!choices.length?'hidden':'')+'>'+choices.map(choiceMarkup).join('')+'</div><div class="cbcomic-actions"><button type="button" data-comic-skip>'+esc(config.skipLabel||'SKIP')+'</button><button type="button" class="primary" data-comic-continue '+((choices.length&&!progressive)?'disabled':'')+'>'+esc(progressive?(config.nextLabel||'NEXT →'):(config.continueLabel||'CONTINUE →'))+'</button></div></div></footer>'
      : '<footer class="cbcomic-dialogue">'+
        '<div class="cbcomic-speaker">'+(config.speakerPortrait?'<img src="'+esc(config.speakerPortrait)+'" alt="">':'<span>'+esc(config.speakerMark||String(config.speaker||'NPC').split(/\s+/).map(x=>x[0]).slice(0,2).join(''))+'</span>')+'<div><small>'+esc(config.speakerRole||'')+'</small><b>'+esc(config.speaker||'Narrator')+'</b></div></div>'+
        '<div class="cbcomic-line"><p id="cbcomicLine">'+esc(config.line||'')+'</p><div id="cbcomicReply" class="cbcomic-reply" hidden></div></div>'+
        '<div class="cbcomic-controls"><div id="cbcomicChoices" class="cbcomic-choices" '+(progressive?'hidden':'')+'>'+choices.map(choiceMarkup).join('')+'</div><div class="cbcomic-actions"><button type="button" data-comic-skip>'+esc(config.skipLabel||'SKIP')+'</button><button type="button" class="primary" data-comic-continue '+((choices.length&&!progressive)?'disabled':'')+'>'+esc(progressive?(config.nextLabel||'NEXT →'):(config.continueLabel||'CONTINUE →'))+'</button></div></div>'+
      '</footer>';
    root.innerHTML='<section class="cbcomic-shell" role="dialog" aria-modal="true" aria-label="'+esc(config.title||'Story scene')+'">'+
      '<header class="cbcomic-head"><div><small>'+esc(config.eyebrow||'CELLBOUND · STORY')+'</small><h2>'+esc(config.title||'Story Scene')+'</h2><span>'+esc(config.subtitle||'')+'</span></div><div class="cbcomic-page-mark">'+esc(config.page||'STORY')+'</div></header>'+
      '<div class="cbcomic-page count-'+panels.length+'">'+panels.map((p,i)=>panelMarkup(p,i,progressive)).join('')+'</div>'+
      (config.hideParty?'':scenePartyMarkup())+
      dialogue+
    '</section>';

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
    updateProgressiveControls();
  });
}
function close(){
  activeToken++;const root=ensureRoot();root.hidden=true;root.innerHTML='';document.body.classList.remove('cbcomic-open');
}
window.CellboundComicScenes={show,close,version:'1.2.0'};
})();