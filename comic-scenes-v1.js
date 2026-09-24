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
function panelMarkup(panel,index){
  const p=panel||{},kind=String(p.kind||'location').replace(/[^a-z0-9_-]/gi,'');
  const art=p.artwork?'<img src="'+esc(p.artwork)+'" alt="">':'';
  const speaker=p.speaker?'<div class="cbcomic-panel-speaker">'+esc(p.speaker)+'</div>':'';
  const caption=(p.eyebrow||p.title||p.text)?'<div class="cbcomic-panel-caption">'+(p.eyebrow?'<small>'+esc(p.eyebrow)+'</small>':'')+(p.title?'<b>'+esc(p.title)+'</b>':'')+(p.text?'<span>'+esc(p.text)+'</span>':'')+'</div>':'';
  const sigil=p.icon?'<i class="cbcomic-panel-icon">'+esc(p.icon)+'</i>':'';
  return'<article class="cbcomic-panel kind-'+kind+' panel-'+(index+1)+' '+(p.wide?'wide':'')+'" data-panel="'+index+'">'+art+'<div class="cbcomic-panel-art" aria-hidden="true"><i></i><i></i><i></i><em></em></div>'+sigil+speaker+caption+'</article>';
}
function choiceMarkup(choice,index){
  const c=choice||{};
  return'<button type="button" data-comic-choice="'+esc(c.id||String(index))+'"><i>'+esc(c.icon||['◇','?','⚔'][index%3])+'</i><span>'+esc(c.label||'Continue')+'</span></button>';
}
function show(config={}){
  const root=ensureRoot(),token=++activeToken;
  document.body.classList.add('cbcomic-open');
  root.hidden=false;
  return new Promise(resolve=>{
    let selected=null,resolved=false;
    const finish=result=>{
      if(resolved)return;resolved=true;
      root.hidden=true;root.innerHTML='';document.body.classList.remove('cbcomic-open');
      resolve(result||{choiceId:selected,skipped:false});
    };
    const panels=Array.isArray(config.panels)&&config.panels.length?config.panels:[{kind:'location',title:config.title,text:config.text}];
    const choices=Array.isArray(config.choices)?config.choices:[];
    root.dataset.theme=config.theme||'zeltira';
    root.innerHTML='<section class="cbcomic-shell" role="dialog" aria-modal="true" aria-label="'+esc(config.title||'Story scene')+'">'+
      '<header class="cbcomic-head"><div><small>'+esc(config.eyebrow||'CELLBOUND · STORY')+'</small><h2>'+esc(config.title||'Story Scene')+'</h2><span>'+esc(config.subtitle||'')+'</span></div><div class="cbcomic-page-mark">'+esc(config.page||'STORY')+'</div></header>'+
      '<div class="cbcomic-page">'+panels.map(panelMarkup).join('')+'</div>'+
      scenePartyMarkup()+
      '<footer class="cbcomic-dialogue">'+
        '<div class="cbcomic-speaker">'+(config.speakerPortrait?'<img src="'+esc(config.speakerPortrait)+'" alt="">':'<span>'+esc(config.speakerMark||String(config.speaker||'NPC').split(/\s+/).map(x=>x[0]).slice(0,2).join(''))+'</span>')+'<div><small>'+esc(config.speakerRole||'')+'</small><b>'+esc(config.speaker||'Narrator')+'</b></div></div>'+
        '<div class="cbcomic-line"><p id="cbcomicLine">'+esc(config.line||'')+'</p><div id="cbcomicReply" class="cbcomic-reply" hidden></div></div>'+
        '<div class="cbcomic-controls"><div id="cbcomicChoices" class="cbcomic-choices">'+choices.map(choiceMarkup).join('')+'</div><div class="cbcomic-actions"><button type="button" data-comic-skip>'+esc(config.skipLabel||'SKIP')+'</button><button type="button" class="primary" data-comic-continue '+(choices.length?'disabled':'')+'>'+esc(config.continueLabel||'CONTINUE →')+'</button></div></div>'+
      '</footer></section>';
    root.querySelector('[data-comic-skip]')?.addEventListener('click',()=>finish({choiceId:selected,skipped:true}));
    root.querySelector('[data-comic-continue]')?.addEventListener('click',()=>finish({choiceId:selected,skipped:false}));
    root.querySelectorAll('[data-comic-choice]').forEach(btn=>btn.addEventListener('click',()=>{
      if(token!==activeToken)return;
      const id=btn.dataset.comicChoice,choice=choices.find(c=>String(c.id)===String(id))||choices[Number(id)]||{};
      selected=id;
      root.querySelectorAll('[data-comic-choice]').forEach(x=>{x.classList.toggle('selected',x===btn);x.disabled=true});
      const reply=root.querySelector('#cbcomicReply');
      if(reply){reply.hidden=false;reply.innerHTML='<small>'+esc(choice.replySpeaker||config.speaker||'')+'</small><p>'+esc(choice.reply||config.defaultReply||'')+'</p>'}
      const cont=root.querySelector('[data-comic-continue]');if(cont){cont.disabled=false;cont.focus()}
    }));
  });
}
function close(){
  activeToken++;const root=ensureRoot();root.hidden=true;root.innerHTML='';document.body.classList.remove('cbcomic-open');
}
window.CellboundComicScenes={show,close,version:'1.0.0'};
})();