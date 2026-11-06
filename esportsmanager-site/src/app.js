import {GAME_KEY,VERSION,ROLES,TACTICS,ACTIVITIES,createGame,advanceWeek,perform,nextOpponent,runway,brandValue,recentTotal,pound,count,pct,validateSave,restoreSave} from './engine.js?v=1.1.0';
const root=document.getElementById('app');
let game=null,view='hq',modal=null,toast='',toastError=false,lastAdvance=0,showcase=false;
const NAV=[['hq','home','HQ'],['esports','target','Esports'],['creators','users','Creators'],['content','video','Content'],['merch','shirt','Merch'],['sponsors','handshake','Sponsors'],['operations','settings','Operations']];
const ic=(n)=>'<svg class="icon" aria-hidden="true"><use href="#i-'+n+'"></use></svg>';
const e=(value)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const compact=(n)=>Math.abs(n)>=1e6?(n/1e6).toFixed(1)+'M':Math.abs(n)>=1000?(n/1000).toFixed(1)+'K':count(n);
const bt=(text,act='',val='',type='soft',id='',extra='')=>'<button type="button" class="btn '+type+'"'+(act?' data-action="'+e(act)+'"':'')+(val!==''?' data-value="'+e(val)+'"':'')+(id?' data-id="'+e(id)+'"':'')+' '+extra+'>'+text+'</button>';
const go=(name,label,klass='')=>'<button type="button" class="'+(klass||'button-link')+'" data-view="'+name+'">'+label+'</button>';
const pn=(title,body,aside='',cls='')=>'<section class="panel '+cls+'"><div class="panel-title">'+title+(aside?'<span class="aside">'+aside+'</span>':'')+'</div>'+body+'</section>';
const m=(n,good=false)=>'<div class="meter '+(good?'green':'')+'"><i style="--p:'+Math.max(0,Math.min(100,Number(n)||0))+'%"></i></div>';
const line=(a,b)=>'<div class="stat-line"><span>'+a+'</span><strong>'+b+'</strong></div>';
const badge=(a,cls='')=>'<span class="tag '+cls+'">'+a+'</span>';
const item=(heading,detail,right='',icon='star')=>'<div class="list-card"><span class="logo-chip">'+ic(icon)+'</span><span class="copy"><strong>'+heading+'</strong><small>'+detail+'</small></span>'+(right?'<span class="right">'+right+'</span>':'')+'</div>';
const tr=(heading,rows,cls='')=>pn(heading,'<div class="stat-list">'+rows.join('')+'</div>','',cls);
const metric=(icon,label,value,more='')=>'<div class="kpi">'+ic(icon)+'<div><span class="small">'+label+'</span><strong>'+value+'</strong>'+(more?'<span class="micro">'+more+'</span>':'')+'</div></div>';
const money=(v)=>pound(v||0);
const hero=(heading,sub,metrics=[],kind='')=>'<div class="hero '+kind+'"><span class="hero-badge">'+e(game.tag)+' · '+(game.mode==='Showcase'?'SHOWCASE ORGANISATION':'FOUNDER JOURNEY')+'</span><strong>'+heading+'</strong><p>'+sub+'</p><div class="hero-metrics">'+metrics.map(x=>'<span>'+ic(x[0])+x[1]+'</span>').join('')+'</div></div>';
const cardFeature=(name,caption,art,destination)=>'<button type="button" class="feature" data-view="'+destination+'"><div class="feature-header">'+name+' <span style="float:right">›</span></div><div class="feature-body"><div><div class="value">'+caption[0]+'</div><div class="feature-caption">'+caption[1]+'</div></div><div class="feature-art">'+art+'</div></div></button>';
const blockHeading=(title,aside='')=>'<div class="title-row"><strong>'+title+'</strong>'+(aside?'<span class="right small">'+aside+'</span>':'')+'</div>';
const formatWeek=()=>game.week<=12?'Spring Season, Year '+game.year:'Offseason, Year '+game.year;
const scheduled=(id)=>game.scheduled[id]||'Rest week';
const report=()=>game.lastReport;
const last=(n)=>game.weeklyRecords.slice(-n);
const profit=()=>game.weeklyRecords.length?game.weeklyRecords[game.weeklyRecords.length-1].net:0;
const round=(n)=>Math.round(n);
function save(){try{localStorage.setItem(GAME_KEY,JSON.stringify(game));return true;}catch(err){flash('Save failed: browser storage may be full or disabled.',true);return false;}}
function load(){
 try{
  const raw=localStorage.getItem(GAME_KEY);
  if(!raw)return;
  const parsed=JSON.parse(raw);
  if(!validateSave(parsed))return;
  const restored=restoreSave(parsed);
  if(parsed.version===1){
   // Keep the original save untouched as a rollback safety net, then upgrade
   // the active save once. Never delete it in response to failed parsing.
   try{
    if(!localStorage.getItem(GAME_KEY+'-legacy-backup'))localStorage.setItem(GAME_KEY+'-legacy-backup',raw);
    localStorage.setItem(GAME_KEY,JSON.stringify(restored));
   }catch(err){console.warn('Migration succeeded in memory; backup/storage unavailable',err);}
  }
  game=restored;
 }catch(err){console.warn('Save not loaded',err);}
}
function flash(text,error=false){toast=String(text);toastError=error;render();if(window.__toastTimer)clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>{toast='';const t=document.querySelector('.toast');if(t)t.remove();},3600);}
function performAction(action,payload){const result=perform(game,action,payload);if(result.ok){save();modal=null;flash(result.message);return;}flash(result.message,true);}
function openModal(type,id='',value=''){modal={type,id,value};render();}
function setView(name){if(!NAV.some(x=>x[0]===name))return;view=name;modal=null;render();document.querySelector('.main')?.scrollTo(0,0);}
function nav(){return NAV.map(([id,symbol,label])=>'<button type="button" data-view="'+id+'" aria-label="'+label+'" class="nav-link '+(view===id?'active':'')+'">'+ic(symbol)+'<span>'+label+'</span></button>').join('');}
function header(){
 const brand=brandValue(game);
 return '<div class="topbar"><div class="logo"><span class="logo-mark">'+ic('crown')+'</span><div class="logo-name">ESPORTS<span>EMPIRE</span></div></div>'
 +'<div class="top-week">'+ic('calendar')+'<div><strong>Week '+game.week+'</strong><span class="small">'+formatWeek()+'</span></div></div>'
 +'<div class="top-stats"><div class="stat-pill">'+ic('coins')+'<div><span class="small">Cash</span><strong>'+money(game.cash)+'</strong></div></div>'
 +'<div class="stat-pill">'+ic('users')+'<div><span class="small">Fans</span><strong>'+count(game.fans)+'</strong></div></div>'
 +'<div class="stat-pill">'+ic('star')+'<div><span class="small">Brand Value</span><strong>'+money(brand)+'</strong></div></div>'
 +'<div class="stat-pill">'+ic('heart')+'<div><span class="small">Staff Mood</span><strong>'+pct(game.staffMood)+'</strong></div></div>'
 +'<button class="top-btn" type="button" data-open="news" aria-label="Industry notifications">'+ic('bell')+'</button><button class="top-btn" type="button" data-open="settings" aria-label="Settings">'+ic('settings')+'</button></div></div>';
}
function page(title,subtitle,button=''){return '<div class="page-head"><div class="page-title-wrap"><h1 class="page-title">'+title+'</h1><span class="page-subtitle">'+subtitle+'</span></div>'+(button?'<div class="page-actions">'+button+'</div>':'')+'</div>';}
function btnWeek(){return bt(ic('play')+' Advance to Next Week','advance','','primary');}
function portrait(initial,index=0){return '<div class="portrait p'+index+'"><span>'+e(initial)+'</span></div>';}
function events(){
 const rival=nextOpponent(game);
 const list=[['Mon',ic('target')+' Training focus: '+game.training],['Tue',ic('video')+' '+e(game.project)],['Wed',ic('handshake')+' '+game.sponsors.length+' active sponsors'],['Fri',ic('trophy')+(rival?' Strikefront vs '+e(rival.name):' Offseason scouting')],['Sun',ic('shirt')+' Merchandise online sales']];
 return pn(ic('calendar')+' Upcoming Events','<div>'+list.map(([day,t],i)=>'<div class="event '+(i===3?'event-now':'')+'"><span class="event-day">'+day+'</span><span>'+t+'</span></div>').join('')+'</div>','This week');
}
function news(){
 const list=game.industry.slice(0,4);
 return pn(ic('archive')+' Industry News',list.map(n=>'<div class="news-item"><strong>'+e(n.text)+'</strong><small>Week '+n.week+' · '+e(n.kind)+'</small></div>').join('')+go('operations','Read organisation log'));
}
function financePanel(){
 const r=report();
 const body='<div class="row spread"><div><span class="small">Current cash</span><div class="value">'+money(game.cash)+'</div></div>'+badge(r?(r.net>=0?'+':'')+money(r.net):'Starting position',r&&r.net<0?'bad':'good')+'</div>'
  +'<div class="divider"></div>'+line('Last week revenue',r?money(r.revenue):'—')+line('Last week expenses',r?money(r.expenses):'—')
  +line('Net result',r?'<span class="'+(r.net>=0?'positive':'negative')+'">'+money(r.net)+'</span>':'—');
 return pn(ic('coins')+' Organisation Finances',body,go('operations','View details'));
}
function performancePanel(){
 const lastResult=game.results[0];
 return pn(ic('trophy')+' Team Performance',line('Strikefront / Regional',badge('League Season'))+line('Season record','W: '+game.teamWins+' / L: '+game.teamLosses)+line('Team chemistry',pct(game.teamChemistry))+line('Playstyle',e(game.tactic))+line('Last match',lastResult?(lastResult.won?'WIN ':'LOSS ')+e(lastResult.score):'Not played yet'),go('esports','Manage squad'));
}
function creatorSummary(){return pn(ic('users')+' Creator Activity',line('Roster',game.creators.length+' signed talents')+line('Audience reach',compact(game.creators.reduce((a,c)=>a+c.audience,0)))+line('Last week video views',compact(report()?.contentViews||0))+line('Organisation fans',count(game.fans))+line('Upcoming project',e(game.project)),go('creators','Creator studio'));}
function merchSummary(){return pn(ic('shirt')+' Merch Sales',line('Catalogue',game.products.length+' products')+line('Available stock',count(game.products.reduce((a,x)=>a+x.stock,0))+' units')+line('Last week sales',money(report()?.merchRevenue||0))+line('Best seller',e(game.products.slice().sort((a,b)=>b.sold-a.sold)[0]?.name||'Core Jersey')),go('merch','Merch studio'));}
function sponsorSummary(){return pn(ic('handshake')+' Sponsor Obligations',game.sponsors.map(s=>'<div class="list-card" style="margin-bottom:8px"><span class="logo-chip">'+e(s.logo)+'</span><span class="copy"><strong>'+e(s.name)+'</strong><small>'+s.deliveries+'/'+s.target+' integrations delivered · '+s.weeks+' weeks remaining</small></span>'+badge(s.deliveries>=s.target?'On track':'Due',s.deliveries>=s.target?'good':'warn')+'</div>').join('')+(game.sponsors.length?'':'<div class="empty">No active sponsors.</div>'),go('sponsors','Manage partnerships'));}
function headquarters(){
 return page('Headquarters','Weekly Overview',btnWeek())
 +'<div class="hq-grid"><div class="main-stack">'
 +hero(e(game.org),'Build a global esports, entertainment and lifestyle organisation.',[['trophy','#'+Math.max(1,100-game.prestige)+' Industry Rank'],['target','1 Competitive Team'],['users',game.creators.length+' Creators']], 'hq')
 +'<div class="feature-row">'+cardFeature('Tactical FPS — Main Roster',['W '+game.teamWins+' : L '+game.teamLosses,'Strikefront Regional League'],'🎮','esports')
 +cardFeature('Featured Creator',[e(game.creators[0]?.name||'Talent'),'Streamer · '+compact(game.creators[0]?.audience||0)+' audience'],'🎙️','creators')
 +cardFeature('Current Merch Collection',[e(game.products[0]?.name||'New range'),'Stock '+count(game.products.reduce((a,p)=>a+p.stock,0))],'👕','merch')+'</div>'
 +'<div class="grid3">'+financePanel()+performancePanel()+creatorSummary()+'</div>'
 +'<div class="grid2">'+merchSummary()+sponsorSummary()+'</div>'
 +'</div><div class="side-stack">'+events()+news()
 +pn(ic('briefcase')+' CEO Decisions','<div class="row spread"><span class="muted">Decisions remaining</span><span class="value">'+game.decisions+' / 4</span></div>'+m(game.decisions*25)+
 '<p class="help">Major signings and investments use CEO decisions. Training, tactics and scheduling are free.</p>'+go('operations','Manage resources'))+'</div></div>';
}
function playerCard(p){
 return '<article class="player-card"><div class="top"><span>'+e(p.role)+'</span><span class="rating">'+p.skill+'</span></div>'+portrait(e(p.name).slice(0,1),p.avatar)+'<div class="player-meta"><strong>'+e(p.name)+'</strong><span class="micro">'+e(p.role)+' · Contract '+p.contract+'w</span>'
 +'<div class="stat-line"><span>Form</span><span class="positive">'+pct(p.form)+'</span></div><div class="stat-line"><span>Morale</span><span>'+pct(p.morale)+'</span></div><div class="stat-line"><span>Salary</span><span>'+money(p.wage)+'/wk</span></div>'
 +bt('Contract','open','renew', 'tiny-btn',p.id)+'</div></article>';
}
function esports(){
 const rival=nextOpponent(game),latest=game.results[0];
 const matchInfo=rival?'<div class="center"><div class="value">'+e(game.tag)+'  VS  '+e(rival.name)+'</div><div class="small">Strikefront · League Week '+game.week+'</div><div class="divider"></div><span class="small">Opponent form</span><div class="value">'+rival.skill+'/100</div><p class="help">Your training, team chemistry and selected tactics affect the simulated best-of-three match.</p></div>':'<div class="empty">No fixture scheduled — offseason management week.</div>';
 const tactics=TACTICS.map(x=>bt(x,'tactic',x,game.tactic===x?'primary':'tiny-btn')).join('');
 const training=['Aim','Teamwork','Strategy','Rest'].map(x=>bt(x,'training',x,game.training===x?'primary':'tiny-btn')).join('');
 const schedule=game.results.slice(0,4).map(r=>item('Week '+r.week+' vs '+e(r.opponent),e(r.summary),badge((r.won?'W ':'L ')+r.score,r.won?'good':'bad'),'trophy')).join('')||'<div class="empty">No games played yet. Advance the week for your first fixture.</div>';
 return page('Esports Operations',game.org+' — Strikefront',go('hq',ic('home')+' Back to HQ','btn soft'))
 +hero('Strikefront — Tactical FPS Division','Manage your five-player squad, training and match preparation.',[['trophy',game.teamWins+' Wins / '+game.teamLosses+' Losses'],['target',pct(game.teamChemistry)+' Chemistry'],['star','Prestige '+game.prestige]],'compact')
 +'<div class="divider"></div><div class="split"><div class="col">'+pn(ic('users')+' Roster — Strikefront (5/5)','<div class="roster-grid">'+game.players.map(playerCard).join('')+'</div>','Role fit & contracts')+'</div>'
 +pn(ic('trophy')+' Featured Upcoming Match',matchInfo)+'</div>'
 +'<div class="grid3" style="margin-top:12px">'
 +pn(ic('calendar')+' Match Schedule & Results','<div class="compact-list">'+schedule+'</div>')
 +pn(ic('target')+' Training Focus','<p class="help">Emphasis changes skill development, chemistry and fatigue.</p><div class="focus-tabs">'+training+'</div><div class="divider"></div><span class="small">Team fatigue</span>'+m(round(game.players.reduce((a,p)=>a+p.fatigue,0)/5)))
 +pn(ic('settings')+' Tactical Setup','<p class="help">Choose an approach to counter rival tendencies.</p><div class="focus-tabs">'+tactics+'</div><div class="divider"></div>'+line('Current strategy',badge(e(game.tactic)))+line('Chemistry',pct(game.teamChemistry)))
 +'</div>'
 +'<div class="grid2" style="margin-top:12px">'
 +pn(ic('search')+' Scouting Shortlist',game.prospects.map(p=>item(e(p.name)+' · '+e(p.role),'Rating '+p.skill+' · Wage '+money(p.wage)+'/wk',bt('Review','open','player','tiny-btn',p.id),'search')).join(''),'3 prospects')
 +pn(ic('users')+' Coaching Staff & Team Chemistry','<div class="compact-list">'+game.staff.filter(x=>x.role.includes('Coach')).map(x=>item(e(x.name),e(x.role),money(x.wage)+'/wk','users')).join('')+'</div><div class="divider"></div>'+line('Team chemistry',pct(game.teamChemistry))+m(game.teamChemistry,true)+line('Training',e(game.training)))
 +'</div>';
}
function creatorCard(c){
 return '<button type="button" class="creator-card" data-open="creator" data-id="'+e(c.id)+'">'+portrait(e(c.name).slice(0,1),c.avatar)+'<div class="name">'+e(c.name)+'</div><small>'+e(c.role)+' · '+compact(c.audience)+' audience</small></button>';
}
function creators(){
 const chosen=game.creators[0],a=chosen||{name:'No creator',audience:0,mood:0,fit:0,energy:0,engagement:0};
 const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 const sched='<div class="table-wrap"><div class="schedule"><div class="head">Channel</div>'+days.map(x=>'<div class="head">'+x+'</div>').join('')
 +'<div class="label">Streams</div>'+days.map((d,i)=>'<div class="'+(i===0||i===3?'slot':'')+'">'+(i===0?e(game.creators[0]?.name||'')+' LIVE':i===3?'Club Stream':'—')+'</div>').join('')
 +'<div class="label">Collabs</div>'+days.map((d,i)=>'<div class="'+(i===2||i===5?'slot':'')+'">'+(i===2?'Creator Collab':i===5?'Community':'—')+'</div>').join('')
 +'<div class="label">Uploads</div>'+days.map((d,i)=>'<div class="'+(i===1||i===4?'slot':'')+'">'+(i===1?e(game.project):i===4?'Weekly Recap':'—')+'</div>').join('')+'</div></div>';
 return page('Creator Studio',game.org,bt(ic('plus')+' Scout Talent','open','recruit','primary'))
 +'<div class="hero creators compact"><span class="hero-badge">FEATURED CREATOR</span><strong>'+e(a.name)+'</strong><p>Streaming, entertainment and influence, connected to your organisation.</p><div class="hero-metrics"><span>'+ic('users')+compact(a.audience)+' Audience</span><span>'+ic('heart')+pct(a.mood)+' Mood</span><span>'+ic('star')+pct(a.fit)+' Brand Fit</span></div></div>'
 +'<div class="business-grid" style="margin-top:12px"><div class="col">'
 +pn(ic('users')+' Creator Roster','<div class="creator-grid">'+game.creators.map(creatorCard).join('')+'</div>','Signed '+game.creators.length)
 +pn(ic('heart')+' Wellbeing & Burnout',line('Average energy',pct(round(game.creators.reduce((a,c)=>a+c.energy,0)/game.creators.length)))+m(round(game.creators.reduce((a,c)=>a+c.energy,0)/game.creators.length),true)
 +line('At risk',game.creators.filter(c=>c.energy<35).length+' creators')+'<p class="help">High output reduces energy. Scheduling a rest week restores it.</p>')
 +'</div><div class="col">'+pn(ic('calendar')+' Weekly Content Calendar',sched,'Week '+game.week)
 +pn(ic('chart')+' Creator Analytics','<div class="stat-tiles"><div class="stat-tile"><span class="small">Content Views</span><div class="value">'+compact(report()?.contentViews||0)+'</div></div><div class="stat-tile"><span class="small">Fans Gained</span><div class="value">'+count(report()?.fanGain||0)+'</div></div><div class="stat-tile"><span class="small">Commercial Revenue</span><div class="value">'+money(report()?.creatorRevenue||0)+'</div></div></div>')
 +'</div><div class="col third">'
 +pn(ic('handshake')+' Campaigns & Brand Deals',game.sponsors.map(s=>item(e(s.name)+' — Content Series',s.deliveries+'/'+s.target+' creator integrations',badge(s.weeks+'w remaining'),'handshake')).join('')+go('sponsors','Manage sponsorships'))
 +pn(ic('calendar')+' Programming',game.creators.map(c=>'<div class="list-card"><div class="copy"><strong>'+e(c.name)+'</strong><small>'+e(scheduled(c.id))+'</small></div>'+bt('Change','open','schedule','tiny-btn',c.id)+'</div>').join('')+'<p class="help">Each creator can carry out one primary activity per week.</p>')
 +pn(ic('star')+' Talent Market',game.creatorCandidates.map(c=>item(e(c.name),e(c.role)+' · '+compact(c.audience)+' audience',bt('Review','open','recruit','tiny-btn',c.id),'search')).join(''))
 +'</div></div>';
}
function content(){
 const choices=['Behind the scenes','Player interview','Creator challenge','Tournament recap'];
 return page('Content Production','Media House & Programming',go('creators','Creator Studio','btn soft'))
 +hero('Media House','Create videos, grow reach and strengthen sponsor value.',[['video',e(game.project)],['users',compact(report()?.contentViews||0)+' Latest Views'],['star','Trust '+game.trust]],'compact creators')
 +'<div class="grid2" style="margin-top:12px">'
 +pn(ic('video')+' Choose Next Production','<p class="help">Choose one organisation-owned production project for the coming week. Performance depends on your audience, talent and staff.</p><div class="compact-list">'+choices.map(c=>'<div class="list-card '+(game.project===c?'highlight':'')+'"><div class="copy"><strong>'+e(c)+'</strong><small>'+(['Tournament recap','Creator challenge'].includes(c)?'High growth potential':'Reliable evergreen programming')+'</small></div>'+bt(game.project===c?'Selected':'Schedule','content',c,game.project===c?'soft':'tiny-btn')+'</div>').join('')+'</div>')
 +pn(ic('calendar')+' Production Slate','<div class="calendar-list">'+[['MON','Planning'],['TUE','Script & capture'],['THU','Editing'],['SAT','Release']].map(([d,t])=>'<div class="calendar-mini"><strong>'+d+'</strong><span class="small">'+t+'</span><span>'+ic('video')+'</span></div>').join('')+'</div><div class="divider"></div>'+line('Upcoming release',e(game.project))+line('Weekly production budget',money(game.contentBudget))+line('Content staff',game.staff.filter(x=>x.role==='Content Producer').length?'Producer hired':'Freelance support'))
 +pn(ic('chart')+' Content Performance',line('Latest week views',count(report()?.contentViews||0))+line('Creator revenue',money(report()?.creatorRevenue||0))+line('Organisation fans',count(game.fans))+line('Sponsorship campaigns',game.sponsors.length))
 +pn(ic('handshake')+' Cross-Division Effects','<p class="help">Content unlocks sponsor deliverables, introduces esports players to new viewers and increases merchandise demand. Your creator activity plan also contributes to the next weekly results.</p>'+go('sponsors','Review sponsor obligations'))
 +'</div>';
}
function sponsors(){
 const pending=game.pitches.map(p=>item(e(p.name),'Proposal under review · resolves next week',badge('Pending','warn'),'handshake')).join('');
 const opportunities=game.sponsorOffers.map(p=>'<div class="list-card"><span class="logo-chip">'+e(p.title.slice(0,2))+'</span><span class="copy"><strong>'+e(p.title)+'</strong><small>'+money(p.value)+'/wk · Fit '+p.fit+'%</small></span>'+bt('Negotiate','open','pitch','tiny-btn',p.id)+'</div>').join('');
 const summary=pn(ic('chart')+' Revenue Breakdown',line('Sponsors',money(report()?.sponsorRevenue||0))+line('Merchandise',money(report()?.merchRevenue||0))+line('Creator & media',money(report()?.creatorRevenue||0))+line('Prize money',money(report()?.match?.prize||0))+line('Last week revenue',money(report()?.revenue||0)));
 const active=game.sponsors.map(s=>'<div class="list-card"><span class="logo-chip">'+e(s.logo)+'</span><span class="copy"><strong>'+e(s.name)+'</strong><small>'+money(s.amount)+'/wk · '+s.weeks+'w remaining</small><div style="margin-top:6px">'+m(s.deliveries/Math.max(1,s.target)*100,true)+'</div><small>Integrations '+s.deliveries+' / '+s.target+' · Relation '+pct(s.relationship)+'</small></span>'+badge(s.deliveries>=s.target?'Fulfilled':'Action needed',s.deliveries>=s.target?'good':'warn')+'</div>').join('');
 const c=game.sponsors[0];
 return page('Commercial Office','Sponsorships, Partnerships & Deals',bt(ic('plus')+' New Deal','open','all-pitches','primary'))
 +hero('Commercial Partnerships','Build long-term income through real negotiations and campaign delivery.',[['handshake',game.sponsors.length+' Active Sponsors'],['briefcase',game.pitches.length+' Proposals'],['coins',money(recentTotal(game,'sponsorRevenue'))+' Last 4 Weeks']],'compact sponsors')
 +'<div class="business-grid" style="margin-top:12px"><div class="col">'
 +pn(ic('handshake')+' Sponsor Negotiation Pipeline','<div class="compact-list">'+(pending||'')+opportunities+'</div>',game.sponsorOffers.length+' opportunities')
 +pn(ic('coins')+' Financial Snapshot',line('Cash on hand',money(game.cash))+line('Last week result','<span class="'+(profit()>=0?'positive':'negative')+'">'+money(profit())+'</span>')+line('Brand trust',pct(game.trust)))
 +'</div><div class="col">'
 +pn(ic('calendar')+' Active Sponsor Obligations',active||'<div class="empty">No current commercial contracts.</div>')
 +summary
 +'</div><div class="col third">'
 +pn(ic('briefcase')+' Contract Details',c?'<div class="contract-card"><h3>'+e(c.name)+'</h3><span class="small">'+e(c.category)+' Partnership</span><div class="amount">'+money(c.amount)+'/week</div><div class="divider"></div>'+line('Term remaining',c.weeks+' weeks')+line('Weekly deliverables',c.target+' integrations')+line('Relationship score',pct(c.relationship))+'</div><p class="help">Campaign obligations are assessed when you advance the week. Schedule streams, collaborations or sponsored content to fulfil them.</p>':'<div class="empty">No selected contract.</div>')
 +pn(ic('heart')+' Brand Trust',line('Trust score',pct(game.trust))+m(game.trust,true)+'<p class="help">Overpromising sponsors reduces trust and future negotiating power.</p>')
 +'</div></div>';
}
function productRow(p){
 const margin=round((p.price-p.cost)/p.price*100);
 return '<tr><td><div class="row"><span class="product-icon">'+(p.symbol==='hoodie'?'🧥':p.symbol==='cap'?'🧢':'👕')+'</span><span><strong>'+e(p.name)+'</strong><span class="small" style="display:block">SKU '+e(p.id.toUpperCase())+'</span></span></div></td>'
 +'<td>'+e(p.category)+'</td><td>'+count(p.stock)+'</td><td>'+money(p.price)+'</td><td class="positive">'+margin+'%</td><td>'+badge(p.stock<20?'Low stock':'On sale',p.stock<20?'warn':'good')+'</td>'
 +'<td>'+bt('Price','open','price','tiny-btn',p.id)+bt('Order','open','reorder','tiny-btn',p.id)+'</td></tr>';
}
function merch(){
 const totalStock=game.products.reduce((a,p)=>a+p.stock,0),sold=game.products.reduce((a,p)=>a+p.sold,0),rec=last(4);
 return page('Merchandise Studio','Design · Produce · Launch · Sell',bt(ic('plus')+' Propose New Drop','open','product','primary'))
 +hero('The '+e(game.org)+' Core Collection','Competition ready. Everyday wearable. Original apparel, exclusive drops and creator collaborations.',[['shirt',game.products.length+' Products'],['package',count(totalStock)+' Stock'],['chart',count(sold)+' Total Sold']],'compact merch')
 +'<div class="merch-columns" style="margin-top:12px"><div class="col">'
 +pn(ic('package')+' Product Catalogue ('+game.products.length+' items)','<div class="table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Margin</th><th>Sales Status</th><th>Actions</th></tr></thead><tbody>'+game.products.map(productRow).join('')+'</tbody></table></div>')
 +pn(ic('chart')+' Sales Analytics','<div class="stat-tiles"><div class="stat-tile"><span class="small">Units Sold</span><div class="value">'+count(sold)+'</div></div><div class="stat-tile"><span class="small">Revenue (4 weeks)</span><div class="value">'+money(recentTotal(game,'merchRevenue'))+'</div></div><div class="stat-tile"><span class="small">Stock Available</span><div class="value">'+count(totalStock)+'</div></div></div><div class="bar-chart">'+[0,1,2,3].map(i=>'<div style="--h:'+Math.min(98,Math.max(12,round((rec[i]?.merchRevenue||0)/(Math.max(1,...rec.map(x=>x.merchRevenue)))*95)))+'%"></div>').join('')+'</div><div class="row spread"><span class="micro">Last four trading weeks</span><span class="micro">Sales revenue</span></div>')
 +'</div><div class="col">'
 +pn(ic('package')+' Inventory & Fulfilment',line('Current stock',count(totalStock)+' units')+line('Manufacturing',count(game.products.reduce((a,p)=>a+p.producing,0))+' on order')+line('Products near sell-out',game.products.filter(x=>x.stock<20).length)+m(Math.min(100,totalStock/5),true))
 +pn(ic('clock')+' Manufacturing Timeline','<div class="timeline">'+[['✓','Design'],['✓','Sampling'],['▶','Production'],['4','Quality'],['5','Delivery']].map((x,i)=>'<span class="'+(i<2?'done':'')+'"><b>'+x[0]+'</b>'+x[1]+'</span>').join('')+'</div><div class="divider"></div>'+game.products.map(p=>item(e(p.name),p.producing?p.producing+' units · arrives Week '+p.arrival:'No open manufacturing order',p.producing?badge('Producing','warn'):'')).join(''))
 +pn(ic('calendar')+' Release Calendar','<div class="compact-list">'+item('Core Collection','Available now',badge('Live','good'),'shirt')+item('Creator Capsule','Create a new product to open a drop',bt('Create','open','product','tiny-btn'),'star')+'</div>')
 +pn(ic('star')+' Creator Collaboration','<div class="row" style="gap:13px"><div class="product-icon">🎙️</div><div><strong>'+e(game.creators[0]?.name||'Creators')+' Capsule</strong><div class="small">Limited-run co-branded products</div></div></div><div class="divider"></div>'+bt('Approve New Collection','open','product','primary'))
 +'</div></div>';
}
function operations(){
 const cost=game.players.reduce((a,p)=>a+p.wage,0)+game.creators.reduce((a,p)=>a+p.wage,0)+game.staff.reduce((a,p)=>a+p.wage,0)+game.officeRent+game.contentBudget;
 const run=runway(game);
 const records=last(8).slice().reverse();
 return page('Business Operations','Headquarters · Staff · Finance · Strategy',bt(ic('plus')+' Hire Staff','open','hire','primary'))
 +hero('Organisation Headquarters','Build your people, facilities and financial resilience.',[['home','HQ Level '+game.facilities],['users',game.staff.length+' Employees'],['coins',money(cost)+' Weekly Fixed Costs']],'compact operations')
 +'<div class="kpi-row" style="margin-top:12px">'+metric('coins','Cash Available',money(game.cash))
 +metric('chart','Last Week Profit',money(profit()))+metric('clock','Cash Runway',run===null?'Sustainable':run+' weeks')
 +metric('star','Brand Prestige',pct(game.prestige))+'</div>'
 +'<div class="grid3" style="margin-top:12px">'
 +pn(ic('briefcase')+' Staff & Payroll','<div class="compact-list">'+game.staff.map(x=>item(e(x.name),e(x.role),money(x.wage)+'/wk','users')).join('')+'</div><div class="divider"></div>'+line('Staff salaries',money(game.staff.reduce((a,x)=>a+x.wage,0))+'/wk')+bt('Hire Additional Staff','open','hire','primary'))
 +pn(ic('home')+' Facilities & Development',line('Headquarters level',game.facilities+' / 5')+line('Weekly premises rent',money(game.officeRent))+line('Next upgrade',game.facilities===5?'MAX':money(game.facilities*250000))+m(game.facilities*20)+
 '<p class="help">Facilities help the organisation accommodate higher-profile business operations. Upgrades require a CEO decision and increase ongoing rent.</p>'+bt('Upgrade Headquarters','open','upgrade','primary'))
 +pn(ic('archive')+' Financial Ledger',line('Creator payroll',money(game.creators.reduce((a,c)=>a+c.wage,0))+'/wk')+line('Esports payroll',money(game.players.reduce((a,p)=>a+p.wage,0))+'/wk')+
 line('Core operating costs',money(cost)+'/wk')+line('Sponsor revenue (4 weeks)',money(recentTotal(game,'sponsorRevenue')))+line('Trading revenue (4 weeks)',money(recentTotal(game,'merchRevenue')))+line('Trust',pct(game.trust)))
 +'</div>'
 +'<div class="grid2" style="margin-top:12px">'
 +pn(ic('chart')+' Weekly Trading History','<div class="table-wrap"><table class="data-table"><thead><tr><th>Week</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Fans gained</th></tr></thead><tbody>'+records.map(x=>'<tr><td>W'+x.week+'</td><td>'+money(x.revenue)+'</td><td>'+money(x.expenses)+'</td><td class="'+(x.net>=0?'positive':'negative')+'">'+money(x.net)+'</td><td>'+count(x.fanGain)+'</td></tr>').join('')+'</tbody></table></div>'+(records.length?'':'<div class="empty">Advance the week to begin trading.</div>'))
 +pn(ic('archive')+' Save & Organisation Tools','<p class="help">Your progress automatically saves to this browser after each action. You can export a copy to move between devices.</p><div class="btn-group">'+bt(ic('archive')+' Export Save','export','','primary')+bt('Import Save','open','import','soft')+bt('Load Showcase','open','showcase','soft')+bt('Restart','open','reset','danger')+'</div><div class="divider"></div>'+line('Game version','Starter v1.1 · Save v2')+line('Season',game.season)+line('CEO decisions',game.decisions+' remaining'))
 +'</div><div style="margin-top:12px">'+pn(ic('archive')+' Organisation News Log',game.industry.slice(0,9).map(n=>'<div class="news-item"><strong>'+e(n.text)+'</strong><small>Week '+n.week+' · '+e(n.kind)+'</small></div>').join(''))+'</div>';
}
function shell(){
 const activeScreen={hq:headquarters,esports,creators,content,merch,sponsors,operations}[view]();
 return '<div class="app-shell">'+header()+'<div class="shell-body"><nav class="sidebar" aria-label="Game navigation">'+nav()+'<div class="side-mark">♛</div></nav><main class="main" id="game-content">'+activeScreen+'<div class="version">ESPORTS EMPIRE · STARTER BUILD 1.1 · ALL-ROUND ORGANISATION</div></main></div></div>';
}
function modalMarkup(){
 if(!modal)return '';
 const typ=modal.type,id=modal.id;
 let title='Make a Decision',body='',buttons='';
 const confirm=(label,action,value='',key='')=>bt(label,'commit',action,'primary',key||id,'data-payload="'+e(value)+'"');
 if(typ==='report'){
  const r=game.lastReport;
  if(!r)return '';
  title='Week '+r.week+' — Executive Report';
  body='<div class="report-top"><h3>'+(r.match?(r.match.won?'Victory against ':'Defeat to ')+e(r.match.opponent)+' · '+e(r.match.score):'Organisation trading week')+'</h3><div class="small">Your decisions created these results. The next week is now ready.</div></div>'
  +'<div class="report-list">'+[['Revenue',money(r.revenue)],['Operating Costs',money(r.expenses)],['Net Result',money(r.net)],['Fan Movement',(r.fanGain>=0?'+':'')+count(r.fanGain)],['Merchandise Sales',money(r.merchRevenue)],['Creator & Media',money(r.creatorRevenue)],['Sponsor Payments',money(r.sponsorRevenue)],['Content Views',count(r.contentViews)]].map(x=>'<div><span class="small">'+x[0]+'</span><strong class="value">'+x[1]+'</strong></div>').join('')+'</div>'
  +r.details.map(x=>'<div class="notice" style="margin-bottom:7px">'+e(x)+'</div>').join('');
 }
 else if(typ==='player'){
  const p=game.prospects.find(x=>x.id===id);if(!p)return '';
  title='Scout '+e(p.name);
  body=line('Role',e(p.role))+line('Overall rating',p.skill)+line('Contract salary',money(p.wage)+'/week')+
  '<p class="help">Signing costs four weeks of salary upfront and replaces one existing player. Chemistry temporarily falls after a roster change.</p>'+
  '<label class="field"><span>Player to replace</span><select id="replace-player">'+game.players.map(x=>'<option value="'+e(x.id)+'">'+e(x.name)+' · '+e(x.role)+'</option>').join('')+'</select></label>';
  buttons=bt('Sign & Replace','confirmPlayer','', 'primary',p.id);
 }
 else if(typ==='creator'){
  const c=game.creators.find(x=>x.id===id);if(!c)return '';
  title=e(c.name)+' — Talent Profile';
  body=line('Position',e(c.role))+line('Personal audience',count(c.audience))+line('Engagement',c.engagement+'%')+
  line('Energy',pct(c.energy))+m(c.energy,true)+line('Mood',pct(c.mood))+line('Weekly salary',money(c.wage))+
  line('Contract',c.contract+' weeks')+'<div class="divider"></div>'+bt('Plan Activity','open','schedule','soft',c.id)+bt('Renew Contract','open','renew','soft',c.id);
 }
 else if(typ==='recruit'){
  const c=game.creatorCandidates.find(x=>x.id===id);
  title=c?'Sign '+e(c.name):'Scout New Talent';
  body=c?line('Creator type',e(c.role))+line('Audience',compact(c.audience))+line('Brand Fit',pct(c.fit))+line('Weekly salary',money(c.wage))+
  line('Signing bonus',money(c.wage*3))+'<p class="help">Uses one CEO decision. The new creator becomes available immediately.</p>'
  :game.creatorCandidates.map(x=>item(e(x.name),e(x.role)+' · '+compact(x.audience)+' audience · '+money(x.wage)+'/week',bt('Review','open','recruit','tiny-btn',x.id),'search')).join('');
  if(c)buttons=confirm('Sign Creator','signCreator','',c.id);
 }
 else if(typ==='pitch'||typ==='all-pitches'){
  const t=game.sponsorOffers.find(x=>x.id===id);
  title=t?'Negotiate with '+e(t.title):'New Commercial Opportunity';
  body=t?line('Weekly payment',money(t.value))+line('Brand fit',pct(t.fit))+line('Negotiation cost','£180')+'<p class="help">One CEO decision. Proposal resolves the next week; acceptance is influenced by trust and sponsor fit.</p>':
  game.sponsorOffers.map(x=>item(e(x.title),money(x.value)+'/week · '+e(x.description),bt('Review','open','pitch','tiny-btn',x.id),'handshake')).join('');
  if(t)buttons=confirm('Send Proposal','pitch','',t.id);
 }
 else if(typ==='schedule'){
  const c=game.creators.find(x=>x.id===id);if(!c)return '';
  title='Schedule '+e(c.name);
  body='<p>Select one primary activity for next week. High-output activities grow audiences but reduce energy.</p><div class="compact-list">'+ACTIVITIES.map(x=>'<div class="list-card"><div class="copy"><strong>'+e(x)+'</strong><small>'+(x==='Rest week'?'Restores energy':x==='Creator collaboration'?'Strong growth, higher workload':x==='Sponsored feature'?'Useful for partner commitments':'Reach and community growth')+'</small></div>'+bt(scheduled(c.id)===x?'Selected':'Select','commit','schedule','tiny-btn',c.id,'data-payload="'+e(x)+'"')+'</div>').join('')+'</div>';
 }
 else if(typ==='reorder'||typ==='price'){
  const p=game.products.find(x=>x.id===id);if(!p)return '';
  title=(typ==='reorder'?'Order Stock — ':'Set Price — ')+e(p.name);
  body=typ==='reorder'?line('Quantity','100 units')+line('Unit production cost',money(p.cost))+line('Full order cost',money(p.cost*100))+line('Manufacturing lead','2 weeks')+
   '<p class="help">Stock is prepaid and arrives after two game weeks. Uses a CEO decision.</p>'
   :line('Current price',money(p.price))+line('Manufacturing cost',money(p.cost))+'<label class="field"><span>New selling price in GBP (£10–£250)</span><input type="number" id="new-price" min="10" max="250" value="'+(p.price/100)+'"></label>';
  buttons=typ==='reorder'?confirm('Order 100 Units','reorder','',id):bt('Set Price','confirmPrice','','primary',id);
 }
 else if(typ==='product'){
  title='Launch a New Merch Collection';
  body='<p>Design, manufacture and launch a small creator capsule. £1,300 includes 50 units of starting stock. Uses one CEO decision.</p>'
  +'<label class="field"><span>Product name</span><select id="new-product"><option>Creator Hoodie</option><option>Signature Cap</option><option>Limited Edition Jersey</option></select></label>'
  +'<div class="notice">This first playable build uses curated product styles. A deeper visual garment designer comes later.</div>';
  buttons=bt('Approve & Launch','confirmProduct','','primary');
 }
 else if(typ==='hire'){
  title='Hire a Team Member';
  body='<p>Hiring costs £350 up front and £180/week thereafter. Uses one CEO decision.</p><label class="field"><span>Choose specialism</span><select id="hire-role"><option>Content Producer</option><option>Commercial Manager</option><option>Scout</option><option>Merchandise Manager</option></select></label>';
  buttons=bt('Confirm Hire','confirmHire','','primary');
 }
 else if(typ==='renew'){
  const p=game.players.find(x=>x.id===id)||game.creators.find(x=>x.id===id);if(!p)return '';
  title='Renew '+e(p.name);
  body=line('Current salary',money(p.wage)+'/week')+line('Renewal bonus',money(p.wage*2))+line('New term','+24 weeks')+line('Salary adjustment','+7%')+
  '<p class="help">Uses one CEO decision.</p>';
  buttons=confirm('Extend Contract','renew','',id);
 }
 else if(typ==='upgrade'){
  title='Upgrade Your Headquarters';
  body=line('Current level',game.facilities+' / 5')+line('Upgrade cost',money(game.facilities*250000))+line('Weekly added rent','£95')+
  '<p class="help">A better headquarters increases operational capacity and provides room to grow.</p>';
  buttons=confirm('Approve Upgrade','upgrade');
 }
 else if(typ==='import'){
  title='Import Organisation Save';
  body='<p>Choose an Esports Empire save JSON file. Importing replaces the current local save only after it passes validation.</p><label class="field"><span>Save file</span><input id="import-file" type="file" accept=".json,application/json"></label>';
  buttons=bt('Import File','confirmImport','','primary');
 }
 else if(typ==='showcase'){
  title='Load Showcase Organisation';
  body='<p>This demonstration organisation has substantial cash, a large creator audience and more departments to explore, matching the scale of the reference mockups.</p><div class="notice">Loading it replaces your current browser save. Export first to preserve your founder progress.</div>';
  buttons=bt('Load Showcase','confirmShowcase','','primary');
 }
 else if(typ==='reset'){
  title='Start a New Organisation';
  body='<p>Current browser progress will be replaced. Export a copy first if you want to keep it.</p>';
  buttons=bt('Restart Game','confirmReset','','danger');
 }
 else if(typ==='settings'){
  title='Settings & Save Management';
  body=line('Current save',e(game.org))+line('Mode',e(game.mode))+line('Game week',game.week)+line('Version','v1.1 · Save v2')+
  '<p class="help">Progress saves automatically in this browser. Export or import JSON to move to another device.</p><div class="btn-group">'+bt('Export Save','export','','soft')+bt('Import','open','import','soft')+bt('Showcase','open','showcase','soft')+bt('New Game','open','reset','danger')+'</div>';
 }
 else if(typ==='news'){
  title='Industry News & Notifications';
  body=game.industry.slice(0,12).map(x=>item(e(x.text),'Week '+x.week+' · '+e(x.kind),'','archive')).join('');
 }
 const footer='<div class="modal-foot">'+bt('Close','close','','soft')+buttons+'</div>';
 return '<div class="modal-backdrop" role="presentation" data-backdrop="1"><div class="modal" role="dialog" aria-modal="true" aria-label="'+e(title)+'"><h2>'+title+'</h2>'+body+footer+'</div></div>';
}
function setup(){
 return '<div class="newgame"><div><span class="hero-badge">THE BUSINESS OF ESPORTS</span><div class="headline">BUILD THE ORG.<br><b>OWN THE INDUSTRY.</b></div><p>Run the whole business. Recruit an esports roster, manage streamers, produce content, secure sponsors, launch apparel and turn a startup into an esports empire.</p><div class="hero-metrics"><span>'+ic('target')+' Competitive Teams</span><span>'+ic('video')+' Creators & Content</span><span>'+ic('shirt')+' Merchandise</span><span>'+ic('handshake')+' Sponsorships</span></div></div>'
 +'<form class="newgame-card" id="start-form"><span class="hero-badge">NEW ORGANISATION · ALL-ROUND START</span><h1>Founder Journey</h1><p class="help">£45,000 starting cash · One 5-player team · Streamer + influencer · First commercial partner · 12-week season.</p>'
 +'<label class="field"><span>Organisation name</span><input name="org" maxlength="32" required value="Apex Esports"></label><label class="field"><span>Team abbreviation</span><input name="tag" maxlength="5" required value="APX"></label>'
 +'<label class="field"><span>Team accent colour</span><input name="colour" type="color" value="#9d55ed"></label><button class="btn primary" style="width:100%" type="submit">'+ic('play')+' Create Organisation</button>'
 +'<div class="divider"></div><button class="btn soft" type="button" data-action="startShowcase" style="width:100%">Explore a Showcase Organisation</button><p class="help center">Local browser save · No account required for this starter.</p></form></div>';
}
function render(){
 if(!game){root.innerHTML=setup();return;}
 const main=document.querySelector('.main');const y=main?.scrollTop||0;
 root.innerHTML=shell()+modalMarkup()+(toast?'<div class="toast '+(toastError?'error':'')+'" role="status">'+e(toast)+'</div>':'');
 if(modal){document.querySelector('.modal .btn')?.focus();}else document.querySelector('.main')?.scrollTo(0,y);
}
function createNew(form){
 const values=new FormData(form);
 game=createGame(values.get('org'),values.get('tag'),values.get('colour'),false);view='hq';modal=null;save();render();
}
function exportFile(){
 const blob=new Blob([JSON.stringify(game,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='esports-empire-'+game.org.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-week-'+game.week+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 flash('Save downloaded. Keep the JSON file somewhere safe.');
}
async function importFile(){
 const file=document.getElementById('import-file')?.files?.[0];if(!file)return flash('Select a save file first.',true);
 try{const parsed=JSON.parse(await file.text());if(!validateSave(parsed))throw new Error('This save is invalid or its format is unsupported.');
 const restored=restoreSave(parsed);
 game=restored;view='hq';modal=null;save();flash('Organisation imported successfully.');}catch(err){flash('Import failed: '+err.message,true);}
}
root.addEventListener('submit',ev=>{if(ev.target.id==='start-form'){ev.preventDefault();createNew(ev.target);}});
root.addEventListener('click',ev=>{
 if(ev.target.closest('[data-backdrop]')===ev.target){modal=null;render();return;}
 const b=ev.target.closest('button');if(!b)return;
 if(b.dataset.view){setView(b.dataset.view);return;}
 const id=b.dataset.id||'',action=b.dataset.action||'',value=b.dataset.value||'';
 if(action==='startShowcase'){game=createGame('Apex Esports','APX','#9d55ed',true);save();view='hq';render();return;}
 if(action==='close'){modal=null;render();return;}
 if(action==='open'){openModal(value,id);return;}
 if(action==='advance'){
  const now=Date.now();if(now-lastAdvance<750)return;lastAdvance=now;
  try{advanceWeek(game);save();modal={type:'report'};render();document.querySelector('.modal')?.scrollTo(0,0);}catch(err){flash('Week could not advance: '+err.message,true);}return;
 }
 if(action==='export'){exportFile();return;}
 if(action==='tactic'||action==='training'||action==='content'){performAction(action,{value});return;}
 if(action==='commit'){performAction(value,{id,value:b.dataset.payload||''});return;}
 if(action==='confirmPlayer'){performAction('signPlayer',{id,replace:document.getElementById('replace-player')?.value});return;}
 if(action==='confirmPrice'){performAction('price',{id,value:document.getElementById('new-price')?.value});return;}
 if(action==='confirmProduct'){performAction('createProduct',{value:document.getElementById('new-product')?.value});return;}
 if(action==='confirmHire'){performAction('hire',{value:document.getElementById('hire-role')?.value});return;}
 if(action==='confirmImport'){importFile();return;}
 if(action==='confirmShowcase'){game=createGame('Apex Esports','APX','#9d55ed',true);save();modal=null;view='hq';flash('Showcase organisation loaded.');return;}
 if(action==='confirmReset'){try{localStorage.removeItem(GAME_KEY);}catch(err){}game=null;modal=null;render();return;}
});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&modal){modal=null;render();}});
load();render();
