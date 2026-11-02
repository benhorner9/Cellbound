// Presentation-only UX polish; never mutates combat, rewards, inventory or profile storage.
// Keep all animations non-blocking, with reduced-motion and hidden-tab safeguards.
let feedbackTimer=null;
let ambienceInitialised=false;
const byId=id=>document.getElementById(id);

export function initPolish(){
 if(ambienceInitialised)return;
 ambienceInitialised=true;
 const update=()=>{document.documentElement.dataset.ambiencePaused=String(document.hidden);};
 document.addEventListener('visibilitychange',update,{passive:true});
 update();
}

// A tiny arrival gesture on a real screen, rather than delaying navigation.
// OffsetWidth restarts only a short CSS animation on the chosen screen, not the game loop.
export function polishEnter(element){
 if(!element||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 element.classList.remove('polish-enter');
 void element.offsetWidth;
 element.classList.add('polish-enter');
}

// Feedback is passive and pointer-transparent, so neither the user nor automation
// can accidentally tap it instead of a game control.
export function polishFeedback(message,kind='travel'){
 const el=byId('polishFeedback');
 if(!el)return;
 if(feedbackTimer!==null)clearTimeout(feedbackTimer);
 el.textContent=String(message);
 el.dataset.kind=kind;
 el.classList.add('is-visible');
 feedbackTimer=setTimeout(()=>{
  el.classList.remove('is-visible');
  feedbackTimer=null;
 },kind==='error'?2900:1650);
}
