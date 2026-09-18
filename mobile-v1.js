(()=>{
'use strict';
const media=window.matchMedia('(max-width:720px)');
let observer=null;
function nav(){return document.querySelector('.sidebar nav')}
function active(){return document.querySelector('.sidebar .nav-btn[data-view].active')}
function reveal(behavior='smooth'){
  if(!media.matches)return;
  const a=active(),n=nav();if(!a||!n)return;
  const left=a.offsetLeft-(n.clientWidth-a.offsetWidth)/2;
  n.scrollTo({left:Math.max(0,left),behavior});
}
function sync(){
  document.documentElement.classList.toggle('cb-phone',media.matches);
  if(media.matches)setTimeout(()=>reveal('auto'),40);
}
function init(){
  const n=nav();if(!n){setTimeout(init,100);return}
  observer=new MutationObserver(list=>{
    if(!media.matches)return;
    if(list.some(x=>x.type==='attributes'&&x.attributeName==='class'))setTimeout(()=>reveal(),20);
  });
  n.querySelectorAll('.nav-btn[data-view]').forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['class']}));
  n.addEventListener('click',e=>{const b=e.target.closest('.nav-btn[data-view]');if(b)setTimeout(()=>reveal(),30)});
  media.addEventListener?.('change',sync);
  window.addEventListener('orientationchange',()=>setTimeout(()=>reveal('auto'),180));
  sync();
}
init();
})();