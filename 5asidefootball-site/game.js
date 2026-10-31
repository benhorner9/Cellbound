
(function () {
  'use strict';
  var KEY = 'five-aside-manager-alpha-v1';
  var names = ['Dockside Rovers','Briarwood FC','City Fives','Eastgate Athletic','North End Social','Red Lion FC'];
  var roster = [
    {id:1,name:'Jamie Foster',pos:'GK',rating:73,job:'Paramedic · shifts',available:[1,1,0,1,1,0]},
    {id:2,name:'Lewis Carter',pos:'DEF',rating:70,job:'Electrician',available:[1,0,1,1,1,1]},
    {id:3,name:'Alex Morgan',pos:'MID',rating:76,job:'University student',available:[1,1,1,1,0,1]},
    {id:4,name:'Ollie Wright',pos:'FWD',rating:79,job:'Warehouse supervisor',available:[1,1,0,1,1,1]},
    {id:5,name:'Sam Patel',pos:'DEF',rating:66,job:'Teacher',available:[1,1,1,0,1,1]},
    {id:6,name:'Dylan Brooks',pos:'MID',rating:64,job:'Bar staff · evenings',available:[0,1,1,1,0,1]},
    {id:7,name:'Charlie Reid',pos:'FWD',rating:69,job:'Apprentice mechanic',available:[1,0,1,1,1,0]},
    {id:8,name:'Noah Bennett',pos:'DEF',rating:62,job:'Retail · shifts',available:[0,1,1,0,1,1]},
    {id:9,name:'Finley Hughes',pos:'MID',rating:68,job:'Office worker',available:[1,1,1,1,1,1]}
  ];
  var originalRoster=JSON.parse(JSON.stringify(roster));
  var matchSlots=[
    ['TUESDAY','19:00',1],['TUESDAY','19:40',1],['THURSDAY','19:00',2],
    ['THURSDAY','19:40',2],['THURSDAY','20:20',2],['TUESDAY','19:20',3]
  ];
  var jobs=['College student','University student','Office worker','Retail · shifts','Bar staff · evenings','Paramedic · shifts','Builder','Teacher','Apprentice mechanic'];
  var given=['Harvey','Isaac','Ethan','Jacob','Louis','Theo','Callum','Reece','Kian','Max','Owen','Toby'];
  var surnames=['White','Bell','Evans','Turner','Ward','King','Cooper','Young','James','Roberts','Morris','Hill'];
  function generatePlayer(seed,type){
    var i=seed%12,pro=type==='professional';
    return {id:2000+seed,name:given[(seed*3+1)%12]+' '+surnames[(seed+3)%12],pos:['GK','DEF','MID','FWD'][seed%4],
      rating:(type==='youth'?42:pro?79:56)+(seed%13),potential:(type==='youth'?83:pro?90:74)+(seed%9),
      age:type==='youth'?16+seed%3:19+seed%17,job:pro?'Full-time footballer':type==='youth'?'College student':jobs[seed%jobs.length],
      professional:pro,available:[1,1,1,1,1,1],fee:type==='youth'?20:pro?300:55+seed%9*10,xp:0};
  }
  function marketPool(season,div){var a=Array.from({length:6},function(_,i){return generatePlayer(season*100+i*7,'market');});if(div===1)a.push(generatePlayer(season*100+51,'professional'));return a;}
  function youthPool(season){return Array.from({length:3},function(_,i){return generatePlayer(season*100+80+i*3,'youth');});}
  function clamp(n,lo,hi){return Math.max(lo,Math.min(hi,Math.round(n)));}
  function ensureDetails(p){
    if(!p.attributes){
      var r=p.rating,id=p.id;
      p.attributes={pace:clamp(r+(id*3%19)-9+(p.pos==='FWD'?6:0),35,95),
        finishing:clamp(r+(id*5%21)-10+(p.pos==='FWD'?9:p.pos==='GK'?-18:0),20,96),
        passing:clamp(r+(id*7%19)-9+(p.pos==='MID'?10:0),30,96),
        defending:clamp(r+(id*11%19)-9+(p.pos==='DEF'?10:0),25,96),
        keeping:clamp(r+(id*13%15)-8+(p.pos==='GK'?12:-35),10,96),
        stamina:clamp(r+(id*17%17)-8,35,96)};
    }
    if(p.age==null)p.age=20+p.id%14;
    if(p.morale==null)p.morale=72+p.id%14;
    if(!p.potential)p.potential=Math.min(92,p.rating+8+p.id%7);
    if(p.xp==null)p.xp=0;
    return p;
  }
  function initial() {
    return {tab:'overview', club:'Sunday Strikers',money:240, sponsor:35, formation:'1-2-1',style:'balanced',plan:'balanced', offers:{},guest:{},round:0,results:{}, fitness:{},seasonDone:false, season:1,division:8,roster:JSON.parse(JSON.stringify(originalRoster)),registeredCap:12,
      market:marketPool(1,8),youth:youthPool(1),training:{},injuries:{},lineup:[],lineupRound:0,lineupCustomized:false,
      planBehind:'press',planAhead:'counter',formerGuests:[],seasonHistory:[],financeLog:[{kind:'Starting funds',amount:240,season:1,round:0}],match:null, log:[], standings:names.map(function(n){return {name:n,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0};}).concat([{name:'Sunday Strikers',played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}])};
  }
  function read() {
    try {var s=JSON.parse(localStorage.getItem(KEY)); if(s && s.standings && Array.isArray(s.standings) && s.results && s.offers) return Object.assign(initial(),s,{match:null});}catch(e){}
    return initial();
  }
  var state=read(), timer=null, toast='';
  state.roster=Array.isArray(state.roster)?state.roster:JSON.parse(JSON.stringify(originalRoster));
  roster=state.roster;roster.forEach(ensureDetails);state.season=state.season||1;state.division=state.division||8;state.registeredCap=12;
  state.market=state.market||marketPool(state.season,state.division);state.youth=state.youth||youthPool(state.season);
  state.training=state.training||{};state.injuries=state.injuries||{};state.seasonHistory=state.seasonHistory||[];state.formerGuests=state.formerGuests||[];state.financeLog=state.financeLog||[];
  state.lineup=state.lineup||[];state.lineupCustomized=!!state.lineupCustomized;
  var app=document.getElementById('app');
  function esc(x){return String(x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function save(){try{state.roster=roster;var copy=Object.assign({},state,{match:null});localStorage.setItem(KEY,JSON.stringify(copy));}catch(e){}}
  function money(v){return '£'+v.toLocaleString('en-GB');}
  function fixtureAt(i){if(i<0||i>=6)return null;var x=matchSlots[i];return {id:i,opponent:names[(i+state.season-1)%6],day:x[0],time:x[1],night:x[2]};}
  function fixture(){return fixtureAt(state.round);}
  function ledger(kind,amount){state.money+=amount;state.financeLog.unshift({kind:kind,amount:amount,season:state.season,round:state.round});state.financeLog=state.financeLog.slice(0,50);}
  function fitness(p){return state.fitness[p.id]==null?100:state.fitness[p.id];}
  function reason(p,round){if(state.injuries[p.id]>round)return 'Injured';if(p.professional)return 'Available';return p.available[round]?'Available':(/student|college|university|apprentice/i.test(p.job)?'Education commitment':/evening|shift/i.test(p.job)?'Work shift':'Work / personal commitment');}
  function available(p,round){return (p.professional || !!(p.available&&p.available[round]) || !!state.offers[round+':'+p.id]) && !(state.injuries[p.id]>round);}
  function players(round) {
    if(round==null) round=state.round;
    var list=roster.filter(function(p){return available(p,round);}).slice().sort(function(a,b){return b.rating-a.rating;});
    if(state.guest[round])list.push.apply(list,Array.isArray(state.guest[round])?state.guest[round]:[state.guest[round]]);
    return list;
  }
  function starters(round) {
    var arr=players(round);var team=[];
    var goal=arr.find(function(p){return p.pos==='GK';});if(goal)team.push(goal);
    arr.forEach(function(p){if(team.length<5 && team.indexOf(p)<0)team.push(p);});
    if(state.match && round===state.match.round && state.match.selectedIds)return state.match.selectedIds.map(function(id){return arr.find(function(p){return p.id===id;});}).filter(Boolean);
    if(state.lineupCustomized && round===state.lineupRound)return state.lineup.map(function(id){return arr.find(function(p){return p.id===id;});}).filter(Boolean);
    return team;
  }
  function ready(){var group=starters(state.round);return group.length===5 && group.some(function(p){return p.pos==='GK';});}
  function develop(p,xp){ensureDetails(p);p.xp=(p.xp||0)+xp;var advanced=0,cap=p.potential;while(p.rating<cap&&p.xp>=70+(p.rating-45)*5){p.xp-=70+(p.rating-45)*5;p.rating++;advanced++;}return advanced;}
  function betweenNights(prev,next){if(prev&&next&&prev.night!==next.night)roster.forEach(function(p){state.fitness[p.id]=Math.min(100,fitness(p)+24);});}
  function club(name){return '<span class="club-crest">'+esc(name.split(' ').map(function(w){return w.charAt(0)}).join('').slice(0,2))+'</span>';}
  function badge(text,mode){return '<span class="status '+(mode||'')+'">'+esc(text)+'</span>';}
  function button(label,action,style,extra){return '<button type="button" class="btn '+(style||'')+'" data-action="'+action+'" '+(extra||'')+'>'+label+'</button>';}
  function metrics(){
    var p=state.standings.find(function(t){return t.name==='Sunday Strikers';});
    var rank=state.standings.slice().sort(sortTable).findIndex(function(t){return t.name===state.club;})+1;
    if(!rank) rank=state.standings.slice().sort(sortTable).findIndex(function(t){return t.name==='Sunday Strikers';})+1;
    return '<div class="metrics"><div class="metric"><small>CLUB BALANCE</small><strong>'+money(state.money)+'</strong></div><div class="metric"><small>LEAGUE POSITION</small><strong>'+rank+'<span class="muted"> / 7</span></strong></div><div class="metric"><small>POINTS</small><strong>'+p.points+'</strong></div><div class="metric"><small>AVAILABLE PLAYERS</small><strong>'+ (fixture()?players().length:'—')+' <span class="muted">/ 9+</span></strong></div></div>';
  }
  function sortTable(a,b){return b.points-a.points || (b.gf-b.ga)-(a.gf-a.ga) || b.gf-a.gf || a.name.localeCompare(b.name);}
  function nav(){
    var sections=[['overview','◈','Overview'],['squad','♙','Squad'],['fixtures','▦','Fixtures'],['tactics','⌁','Tactics'],['training','✦','Training'],['transfers','⇄','Transfers'],['academy','♧','Academy'],['finances','£','Finances'],['league','≡','League'],['career','★','Career']];
    return sections.map(function(s){return '<button data-tab="'+s[0]+'" class="'+((state.tab===s[0] || state.tab==='match' && s[0]==='fixtures')?'active':'')+'"><span class="symbol">'+s[1]+'</span>'+s[2]+'</button>';}).join('');
  }
  function heading(){
    var headings={overview:['CLUB DASHBOARD','The Clubhouse'],squad:['TEAM SELECTION','Squad & Availability'],fixtures:['MATCH CENTRE','Fixtures & Results'],tactics:['TOUCHLINE','Tactical Setup'],league:['DIVISION '+state.division,'League Standings'],training:['TEAM DEVELOPMENT','Training Ground'],transfers:['RECRUITMENT','Transfer Market'],academy:['FUTURE TALENT','Youth Academy'],finances:['CLUB ACCOUNTS','Club Finances'],career:['YOUR JOURNEY','Manager Career'],match:['MATCHDAY LIVE','The Touchline']};
    var t=headings[state.tab]||headings.overview;
    return '<header class="top"><div><div class="eyebrow">'+t[0]+'</div><h1>'+t[1]+'</h1></div><div class="topmeta"><span class="chip">SEASON '+String(state.season).padStart(2,'0')+'</span><span class="chip highlight">DIVISION '+state.division+'</span></div></header>';
  }
  function rowFixture(f,i){
    var r=state.results[i];
    return '<div class="fixture-row">'+club(f.opponent)+'<div class="info"><b>'+esc(state.club)+' vs '+esc(f.opponent)+'</b><small>ROUND '+(i+1)+' · '+f.day+' · '+f.time+' · NIGHT '+f.night+' (demo)</small></div>'+(r?'<span class="score">'+r.home+' – '+r.away+'</span>':i===state.round?badge('NEXT UP',''):badge('UPCOMING','grey'))+'</div>';
  }
  function overview(){
    var f=fixture();
    var section=f?'<div class="card hero"><div class="eyebrow">NEXT MATCH · ROUND '+(f.id+1)+' · NIGHT '+f.night+'</div><h2>'+esc(state.club)+'<br>VS '+esc(f.opponent).toUpperCase()+'</h2><div class="kickoff">'+f.day+' · '+f.time+'</div><p>Your players have jobs, commitments and lives outside football. Check who can make kickoff before picking your side.</p><div class="actions">'+button('PREPARE MATCH →','go-squad','primary')+button('Match centre','go-fixtures','ghost')+'</div></div>':
      '<div class="card hero"><div class="eyebrow">SEASON COMPLETE</div><h2>SEASON '+state.season+' FINISHED</h2><p>Check the final league table and advance to the next season, including promotion, relegation and new player schedules.</p>'+button('START NEXT SEASON →','next-season','primary')+button('League table','go-league','small')+'</div>';
    var soon=names.map(function(n,i){return fixtureAt(i);}).slice(Math.max(0,state.round-1),Math.min(6,state.round+3));
    return metrics()+'<div class="grid">'+section+'<div class="card"><div class="head"><h2>Club identity</h2>'+badge('GRASSROOTS','')+'</div><div class="detail-list"><div class="detail-line"><span>Club</span><b>'+esc(state.club)+'</b></div><div class="detail-line"><span>Registered squad</span><b>'+roster.length+' / 12 players</b></div><div class="detail-line"><span>Level</span><b>'+(state.division===1?'Top division · up to 3 pros':'Semi-professional')+'</b></div><div class="detail-line"><span>Match income</span><b>'+money(state.sponsor)+' sponsorship</b></div><div class="detail-line"><span>Home venue</span><b>Community Sports Hall</b></div></div><p class="fine">At this level, your players still have work and education commitments. Match fees can help persuade a player to attend.</p></div><div class="card span-all"><div class="head"><h2>Fixture diary</h2>'+button('All fixtures →','go-fixtures','small')+'</div>'+soon.map(function(f){return rowFixture(f,f.id);}).join('')+'</div></div>';
  }

  function squad(){
    var f=fixture(),yes=f?players().length:0;
    return '<p class="section-intro">Players balance football with shifts, studies and personal commitments. Availability is specific to each fixture. An appearance offer may persuade somebody to attend, but it is not guaranteed.</p>'+
      '<div class="metrics"><div class="metric"><small>AVAILABLE THIS MATCH</small><strong>'+(f?yes:'—')+'</strong></div><div class="metric"><small>STARTING FIVE</small><strong>'+(f?starters(state.round).length+'/5':'—')+'</strong></div><div class="metric"><small>REGISTERED</small><strong>'+roster.length+' / 12</strong></div><div class="metric"><small>CLUB BALANCE</small><strong>'+money(state.money)+'</strong></div></div>'+
      (f?(yes<5?'<div class="banner">You need '+(5-yes)+' additional player(s) to make kickoff. Consider an appearance offer or guest invitation.</div>':!ready()?'<div class="banner">Select exactly five available players including one goalkeeper.</div>':'<div class="banner success">Your squad is eligible. '+Math.max(0,yes-5)+' substitutes available.</div>'):'<div class="banner">All fixtures are complete. Start a new season to update player schedules.</div>')+
      '<div class="grid"><div class="card"><div class="head"><h2>Registered squad</h2>'+badge('12 SLOTS · PROVISIONAL','grey')+'</div>'+roster.map(registeredCard).join('')+'</div><div>'+
      '<div class="card"><div class="head"><h2>Guest stand-in</h2></div><p>Ask an available squad member to invite a friend for this fixture. Their ability is uncertain until they arrive and they are never automatically signed.</p>'+
      (!f?'<p class="fine">Invitations reopen next season.</p>':(function(){var g=state.guest[state.round]?(Array.isArray(state.guest[state.round])?state.guest[state.round]:[state.guest[state.round]]):[];return g.map(function(x){return '<div class="banner success">'+esc(x.name)+' · '+x.pos+' · '+x.rating+' rating · one-off guest</div>';}).join('')+(g.length<3?button('Invite '+(g.length?'another':'a')+' friend · £15','guest','primary',(state.money<15||!roster.some(function(p){return available(p,state.round);})?'disabled':'')):'<p class="fine">Maximum three guests for this fixture.</p>');})())+
      '<p class="fine">Guest players participate for one game only. If they are particularly talented, recruiting a permanent player later may become worthwhile.</p></div>'+
      '<div class="card" style="margin-top:16px"><div class="head"><h2>Next fixture</h2></div>'+
      (f?'<div class="detail-list"><div class="detail-line"><span>Opponent</span><b>'+esc(f.opponent)+'</b></div><div class="detail-line"><span>Match night</span><b>'+f.night+'</b></div><div class="detail-line"><span>Kickoff</span><b>'+f.day+' '+f.time+'</b></div></div><div class="actions" style="margin-top:18px">'+button('SELECT STARTERS →','go-tactics','primary')+'</div>':'<p>Season '+state.season+' is complete.</p>'+button('NEXT SEASON →','next-season','primary'))+
      '</div></div></div>'+profileView();
  }

  function tactics(){
    var choices=[['1-2-1','Balanced diamond','One defender, two midfielders and an attacker.'],['2-1-1','Stay compact','Two defenders protect the keeper.'],['1-1-2','Go for goals','Play two up front with less cover.']];
    var styles=[['balanced','Balanced','Share possession while conserving energy.'],['press','High press','Win the ball early, with greater fatigue.'],['counter','Counterattack','Defend deeper and break quickly.']];
    var picks=fixture()?starters(state.round):[];
    var draw=function(arr,key){return '<div class="tactic-grid">'+arr.map(function(c){return '<button class="tactic-choice '+(state[key]===c[0]?'selected':'')+'" data-action="'+key+'" data-value="'+c[0]+'"><b>'+c[1]+'</b><small>'+c[2]+'</small></button>';}).join('')+'</div>';};
    return '<p class="section-intro">Pick your five, set a formation, then prepare an automatic plan for when you cannot attend the match live. You can still issue direct commands during a live simulation.</p>'+
      '<div class="grid"><div class="card"><div class="head"><h2>Formation</h2>'+badge(esc(state.formation),'')+'</div>'+draw(choices,'formation')+
      '<div class="head" style="margin-top:27px"><h2>Live approach</h2></div>'+draw(styles,'style')+'</div>'+
      '<div class="card"><div class="head"><h2>Your starting five</h2></div><div class="pitch">'+picks.map(function(p){return '<div class="pitch-player"><span class="shirt">'+p.rating+'</span><small>'+esc(p.name.split(' ').pop())+'<br>'+esc(p.pos)+'</small></div>';}).join('')+'</div><p class="fine">Available players not in the starting five will sit on your substitute bench.</p></div>'+
      '<div class="card"><div class="head"><h2>Automatic match plan</h2></div><p>Starting approach</p>'+draw(styles,'plan')+
      '<p>If losing after 10 minutes</p>'+draw(styles,'planBehind')+
      '<p>If winning after 14 minutes</p>'+draw(styles,'planAhead')+'</div>'+
      '<div>'+lineupView()+'<div class="actions" style="margin-top:16px">'+button('MATCH CENTRE →','go-fixtures','primary')+'</div></div></div>';
  }
  function fixtures(){
    var f=fixture();
    var rows=names.map(function(n,i){return rowFixture(fixtureAt(i),i);}).join('');
    return '<div class="grid"><div class="card"><div class="head"><h2>Season fixture list</h2>'+badge('6 MATCHES','grey')+'</div>'+rows+'</div><div><div class="card"><div class="head"><h2>'+(f?'Your next kickoff':'End of season')+'</h2></div>'+(f?'<div class="eyebrow">ROUND '+(state.round+1)+' · '+f.day+' '+f.time+'</div><h2 style="margin:15px 0 5px">'+esc(state.club)+'<br><span class="muted">vs</span> '+esc(f.opponent)+'</h2><p>'+players().length+' players available · '+state.formation+' · '+state.style+' play</p><div class="actions">'+button('WATCH LIVE MATCH','start-live','primary',!ready()?'disabled':'')+button('SIMULATE OFFLINE','start-auto','',!ready()?'disabled':'')+'</div>'+(!ready()?'<div class="banner">Five players, including a goalkeeper, are required to play. If you cannot get a team together, you can concede the fixture 0–3.</div>'+button('FORFEIT 0–3','forfeit','small warning'):''):'<p>All six test fixtures are complete.</p>'+button('START NEXT SEASON →','next-season','primary')+button('League table','go-league','small'))+'</div><div class="card" style="margin-top:16px"><h2>Testing modes</h2><p><b>Live:</b> Watch a 20-minute simulated game, sending simple touchline instructions as it runs.</p><p><b>Offline:</b> Apply your saved pre-match plan instantly. In the eventual online game, real scheduled fixtures will use this plan if you are away.</p></div></div></div>';
  }
  function league(){
    var sorted=state.standings.slice().sort(sortTable);
    return '<p class="section-intro">Season '+state.season+' · Division '+state.division+'. The top two teams move up and the bottom two move down, except at the pyramid boundaries. For now, opponents are computer controlled.</p><div class="card"><div class="head"><h2>Division '+state.division+'</h2>'+badge('SEASON '+state.season,'grey')+'</div><div class="table-wrap"><table class="standings"><thead><tr><th>#</th><th>CLUB</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>PTS</th></tr></thead><tbody>'+sorted.map(function(t,i){return '<tr class="'+(t.name==='Sunday Strikers'?'highlight-row':'')+'"><td>'+(i+1)+'</td><td><b>'+esc(t.name==='Sunday Strikers'?state.club:t.name)+'</b></td><td>'+t.played+'</td><td>'+t.won+'</td><td>'+t.drawn+'</td><td>'+t.lost+'</td><td>'+t.gf+'</td><td>'+t.ga+'</td><td><b>'+t.points+'</b></td></tr>';}).join('')+'</tbody></table></div></div>';
  }
  function match(){
    var m=state.match;if(!m)return fixtures();
    return '<div class="grid"><div class="card span-all"><div class="match-scoreboard"><div class="home">'+esc(state.club)+'</div><div><div class="big-score">'+m.home+' : '+m.away+'</div><div class="minute">'+m.minute+"' / 20'"+(m.auto?' · OFFLINE PLAN':' · LIVE')+'</div></div><div class="away">'+esc(m.opponent)+'</div></div><div class="actions" style="justify-content:center;margin-top:20px">'+(m.auto?'':button('PUSH FORWARD','push','primary',m.minute>=20?'disabled':'')+button('HOLD SHAPE','hold','',m.minute>=20?'disabled':'')+button('ROTATE SUBSTITUTE','substitute','',m.minute>=20?'disabled':''))+button('FINISH MATCH','finish','ghost',m.minute>=20?'':'disabled')+'</div></div><div class="card"><div class="head"><h2>Match commentary</h2>'+badge('LIVE','')+'</div><div class="log" aria-live="polite">'+m.events.slice().reverse().map(function(e){return '<div class="logline '+(e.goal?'goal':'')+'"><strong>'+e.minute+"'</strong><span>"+esc(e.text)+'</span></div>';}).join('')+'</div></div><div class="card"><div class="head"><h2>Touchline instructions</h2></div><div class="detail-list"><div class="detail-line"><span>Formation</span><b>'+esc(state.formation)+'</b></div><div class="detail-line"><span>Team style</span><b>'+esc(state.style)+'</b></div><div class="detail-line"><span>Current instruction</span><b>'+esc(m.instruction)+'</b></div><div class="detail-line"><span>Average squad rating</span><b>'+Math.round(starters(m.round).reduce(function(a,p){return a+p.rating;},0)/5)+'</b></div></div><p class="fine">This is a simplified playable match engine, not the finished real-time football simulation.</p></div></div>';
  }

  function availableTeam(){return players(state.round);}
  function profileView(){
    if(!state.profileId)return '';
    var p=roster.find(function(x){return x.id===state.profileId;});if(!p)return '';
    ensureDetails(p);
    var labels={pace:'Pace',finishing:'Finishing',passing:'Passing',defending:'Defending',keeping:'Goalkeeping',stamina:'Stamina'};
    return '<div class="card" style="margin-top:16px"><div class="head"><h2>'+esc(p.name)+' · Player profile</h2>'+button('CLOSE','profile-player','small ghost','data-player="'+p.id+'"')+'</div>'+
      '<div class="detail-list"><div class="detail-line"><span>Position / age</span><b>'+p.pos+' / '+p.age+'</b></div><div class="detail-line"><span>Employment / education</span><b>'+esc(p.job)+'</b></div><div class="detail-line"><span>Overall / potential</span><b>'+p.rating+' / '+p.potential+'</b></div><div class="detail-line"><span>Fitness / morale</span><b>'+fitness(p)+'% / '+p.morale+'%</b></div></div>'+
      '<div class="head" style="margin-top:22px"><h2>Individual attributes</h2></div>'+
      Object.keys(labels).map(function(k){return '<div class="training-player"><b>'+labels[k]+'</b><span>'+p.attributes[k]+' / 100</span><div class="progress"><span style="width:'+p.attributes[k]+'%"></span></div></div>';}).join('')+
      ((state.injuries[p.id]||0)>state.round?'<div class="actions" style="margin-top:14px">'+button('PHYSIO TREATMENT · £40','physio','small warning','data-player="'+p.id+'" '+(state.money<40?'disabled':''))+'</div>':'')+
      '<div class="head" style="margin-top:24px"><h2>Fixture availability</h2></div>'+
      matchSlots.map(function(slot,i){return '<div class="detail-line"><span>Round '+(i+1)+' · '+slot[0]+' '+slot[1]+'</span><b style="color:'+(available(p,i)?'var(--mint)':'var(--orange)')+'">'+(available(p,i)?'Available':esc(reason(p,i)))+'</b></div>';}).join('')+'</div>';
  }
  function registeredCard(p){
    ensureDetails(p);var a=available(p,state.round),injured=(state.injuries[p.id]||0)>state.round;
    var note=reason(p,state.round);
    return '<div class="player-row"><span class="avatar '+(p.pos==='GK'?'gk':'')+'">'+esc(p.name[0])+'</span><div class="player-main"><b>'+esc(p.name)+(p.professional?' ★':'')+'</b><small>'+p.pos+' · '+esc(p.job)+' · age '+(p.age||22)+' · fitness '+fitness(p)+'% · morale '+p.morale+'% · '+esc(note)+'</small></div><span class="rating">'+p.rating+'</span><div style="text-align:right">'+(a?badge('AVAILABLE',''):injured?badge('INJURED','red'):button('Offer £20','offer','small warning','data-player="'+p.id+'" '+(state.money<20?'disabled':'')))+button('PROFILE','profile-player','small ghost','data-player="'+p.id+'"')+'</div></div>';
  }
  function lineupView(){
    if(!fixture())return '';
    var selected=starters(state.round),availablePlayers=availableTeam();
    return '<div class="card"><div class="head"><h2>Pick your starting five</h2>'+badge(selected.length+'/5 SELECTED',selected.length===5?'':'amber')+'</div><p>Choose exactly five available players, including a goalkeeper. Your remaining available players become substitutes.</p>'+
      '<div class="lineup-grid">'+availablePlayers.map(function(p){var chosen=selected.some(function(x){return x.id===p.id;});return '<button class="tactic-choice '+(chosen?'selected':'')+'" data-action="lineup" data-player="'+p.id+'"><b>'+(chosen?'✓ ':'')+esc(p.name)+'</b><small>'+p.pos+' · '+p.rating+' OVR · '+fitness(p)+'% fit'+(chosen?' · STARTER':' · BENCH')+'</small></button>';}).join('')+'</div>'+
      '<div class="actions" style="margin-top:15px">'+button('AUTO SELECT BEST FIVE','auto-pick','small')+'</div></div>';
  }
  function trainingView(){
    var f=fixture(),key=state.season+':'+state.round,done=!!state.training[key];
    var options=[['passing','Passing & movement','Work on possession and combination play.'],['finishing','Shooting & finishing','Give attacking players extra development.'],['defending','Shape & defending','Prioritise your defensive unit and keeper.'],['fitness','Fitness & recovery','Improve fitness, with less technical development.']];
    return '<p class="section-intro">Train between matches, develop young players and manage fatigue. Sessions can only be used once before each fixture. On back-to-back match nights, fresh legs are valuable.</p>'+
      '<div class="metrics"><div class="metric"><small>REGISTERED</small><strong>'+roster.length+' / 12</strong></div><div class="metric"><small>AVG FITNESS</small><strong>'+Math.round(roster.reduce(function(sum,p){return sum+fitness(p);},0)/Math.max(1,roster.length))+'%</strong></div><div class="metric"><small>TRAINING COST</small><strong>£12</strong></div><div class="metric"><small>SESSION</small><strong>'+(done?'DONE':f?'READY':'—')+'</strong></div></div>'+
      (f?'<div class="card"><div class="head"><h2>Training focus</h2>'+badge('BEFORE ROUND '+(state.round+1),'grey')+'</div><div class="tactic-grid">'+options.map(function(o){return '<button class="tactic-choice" data-action="train" data-value="'+o[0]+'" '+(done||state.money<12?'disabled':'')+'><b>'+o[1]+'</b><small>'+o[2]+'</small></button>';}).join('')+'</div>'+(done?'<div class="banner success">You have completed this fixture’s training session.</div>':'<p class="fine">A training session costs £12. Technical work creates some fatigue; recovery work restores it.</p>')+'</div>':'<div class="banner">The season is complete. Begin the next season to schedule more training.</div>')+
      '<div class="card" style="margin-top:16px"><div class="head"><h2>Player development</h2></div>'+
      roster.map(function(p){var progress=Math.min(100,Math.round(100*(p.xp||0)/Math.max(1,70+(p.rating-45)*5)));return '<div class="training-player"><b>'+esc(p.name)+'</b><span>'+p.rating+' / '+(p.potential||Math.min(88,p.rating+10))+' potential · '+progress+'% towards next improvement</span><div class="progress"><span style="width:'+progress+'%"></span></div></div>';}).join('')+'</div>';
  }
  function friendScoutingView(){
    var guests=state.formerGuests||[];
    return '<div class="card" style="margin-top:16px"><div class="head"><h2>Scouted guest players</h2>'+badge('DISCOVERED AT MATCH NIGHT','grey')+'</div>'+
      (guests.length?'<p>These one-off guests might be worth a permanent contract. Signing is optional; invitations alone never register a player.</p>':'<p>Invite friends on match nights. After a game you can decide if one deserves a permanent place in the registered squad.</p>')+
      guests.map(function(p){var okay=roster.length<12&&state.money>=p.fee;
        return '<div class="player-row"><span class="avatar">'+esc(p.name[0])+'</span><div class="player-main"><b>'+esc(p.name)+'</b><small>'+p.pos+' · discovered Season '+p.discovered+' · one-off guest ability '+p.rating+'</small></div><span class="rating">'+p.rating+'</span>'+button('SIGN '+money(p.fee),'sign-guest','small primary','data-player="'+p.id+'" '+(!okay?'disabled':''))+'</div>';
      }).join('')+'</div>';
  }
  function transfersView(){
    var pros=roster.filter(function(p){return p.professional;}).length;
    return '<p class="section-intro">Recruit players for your registered squad. This is a local simulated transfer list — direct transfers with other real managers will follow when multiplayer is ready. The working squad cap is 12 (provisional).</p>'+
      '<div class="metrics"><div class="metric"><small>REGISTERED</small><strong>'+roster.length+' / 12</strong></div><div class="metric"><small>AVAILABLE BUDGET</small><strong>'+money(state.money)+'</strong></div><div class="metric"><small>PROFESSIONALS</small><strong>'+pros+' / '+(state.division===1?'3':'0')+'</strong></div><div class="metric"><small>MARKET LISTED</small><strong>'+state.market.length+'</strong></div></div>'+
      '<div class="grid"><div class="card"><div class="head"><h2>Available players</h2>'+badge('SEASON '+state.season,'grey')+'</div>'+
      (state.market.length?state.market.map(function(p){
        var allowed=roster.length<12&&state.money>=p.fee&&(!p.professional||(state.division===1&&pros<3));
        return '<div class="player-row"><span class="avatar '+(p.pos==='GK'?'gk':'')+'">'+esc(p.name[0])+'</span><div class="player-main"><b>'+esc(p.name)+'</b><small>'+p.pos+' · '+p.age+' yrs · '+esc(p.job)+(p.professional?' · PRO':'')+'</small></div><span class="rating">'+p.rating+'</span>'+button('SIGN '+money(p.fee),'sign-player','small primary','data-player="'+p.id+'" '+(!allowed?'disabled':''))+'</div>';
      }).join(''):'<p>No players remaining on this season’s market. A new list arrives next season.</p>')+'</div>'+
      '<div class="card"><div class="head"><h2>Registered squad</h2></div><p>Release a player if you need room for a stronger signing. Released players cannot be recovered in this demo.</p>'+
      roster.map(function(p){return '<div class="detail-line"><span>'+esc(p.name)+' · '+p.pos+(p.professional?' · PRO':'')+'</span>'+button('RELEASE','release-player','small ghost','data-player="'+p.id+'" '+(roster.length<=5?'disabled':''))+'</div>';}).join('')+
      '<p class="fine">Only the highest division permits professional players, capped at three. At every other level players continue outside work or education. Professional appearances cost an additional £45 per match.</p></div></div>'+friendScoutingView();
  }
  function academyView(){
    return '<p class="section-intro">Scout and develop local youngsters. Prospects are part of your academy until you promote them to the registered squad, where they must balance training with education.</p>'+
      '<div class="metrics"><div class="metric"><small>ACADEMY PROSPECTS</small><strong>'+state.youth.length+'</strong></div><div class="metric"><small>SQUAD SPACES</small><strong>'+Math.max(0,12-roster.length)+'</strong></div><div class="metric"><small>PROMOTION COST</small><strong>£20</strong></div><div class="metric"><small>SEASON</small><strong>'+state.season+'</strong></div></div>'+
      '<div class="card"><div class="head"><h2>Youth prospects</h2>'+badge('LOCAL ACADEMY','')+'</div>'+
      (state.youth.length?state.youth.map(function(p){
        return '<div class="player-row"><span class="avatar">'+esc(p.name[0])+'</span><div class="player-main"><b>'+esc(p.name)+'</b><small>'+p.age+' yrs · '+p.pos+' · '+esc(p.job)+' · potential '+p.potential+'</small></div><span class="rating">'+p.rating+'</span>'+button('PROMOTE','promote-youth','small primary','data-player="'+p.id+'" '+(roster.length>=12||state.money<20?'disabled':''))+'</div>';
      }).join(''):'<p>Your academy prospects have been promoted. New talent is scouted next season.</p>')+'</div>';
  }
  function financesView(){
    var pros=roster.filter(function(p){return p.professional;}).length,projected=state.sponsor-pros*45;
    return '<p class="section-intro">Small local sponsors help keep your five-a-side club running. Match appearance offers, guest expenses, training and transfers all come from the same club budget.</p>'+
      '<div class="metrics"><div class="metric"><small>CLUB BALANCE</small><strong>'+money(state.money)+'</strong></div><div class="metric"><small>SPONSOR / MATCH</small><strong>'+money(state.sponsor)+'</strong></div><div class="metric"><small>PRO / MATCH</small><strong>'+money(pros*45)+'</strong></div><div class="metric"><small>BASE NET / MATCH</small><strong>'+money(projected)+'</strong></div></div>'+
      '<div class="grid"><div class="card"><div class="head"><h2>Transactions</h2></div>'+
      (state.financeLog.length?state.financeLog.map(function(x){return '<div class="detail-line"><span>'+esc(x.kind)+' <small>· S'+x.season+' R'+(x.round+1)+'</small></span><b style="color:'+(x.amount>=0?'var(--mint)':'var(--danger)')+'">'+(x.amount>=0?'+':'')+money(x.amount)+'</b></div>';}).join(''):'<p>No transactions yet.</p>')+'</div>'+
      '<div class="card"><div class="head"><h2>Club rules</h2></div><div class="detail-list"><div class="detail-line"><span>Division</span><b>'+state.division+'</b></div><div class="detail-line"><span>Registered squad limit</span><b>12 · provisional</b></div><div class="detail-line"><span>Professional limit</span><b>'+(state.division===1?3:0)+'</b></div><div class="detail-line"><span>Guest invitation expense</span><b>£15</b></div><div class="detail-line"><span>Appearance offer</span><b>£20 · if accepted</b></div><div class="detail-line"><span>Training session</span><b>£12</b></div></div><p class="fine">Sponsorship increases as you climb the pyramid. The fees and squad cap are early balancing values and can be adjusted after testing.</p></div></div>';
  }
  function careerView(){
    var t=state.standings.slice().sort(sortTable),rank=t.findIndex(function(p){return p.name==='Sunday Strikers';})+1;
    return '<p class="section-intro">Take your club through an eight-division local test pyramid. Finish in the top two for promotion, or in the bottom two for relegation where a lower division exists.</p>'+
      '<div class="metrics"><div class="metric"><small>CAREER SEASON</small><strong>'+state.season+'</strong></div><div class="metric"><small>CURRENT DIVISION</small><strong>'+state.division+'</strong></div><div class="metric"><small>CURRENT PLACE</small><strong>'+rank+' / 7</strong></div><div class="metric"><small>COMPLETED</small><strong>'+state.seasonHistory.length+'</strong></div></div>'+
      '<div class="card"><div class="head"><h2>Season history</h2></div>'+
      (state.seasonHistory.length?state.seasonHistory.slice().reverse().map(function(s){return '<div class="detail-line"><span>Season '+s.season+' · Division '+s.division+' · '+s.points+' pts</span><b>#'+s.position+' · '+money(s.prize)+'</b></div>';}).join(''):'<p>Complete your first six-match season to start your managerial record.</p>')+'</div>'+
      '<div class="card" style="margin-top:16px"><div class="head"><h2>Road to the top</h2></div><p>Division 8 → Division 1. All levels remain semi-professional, with only the top division permitting up to three full-time professional players.</p><p>Future online version: real managers across time zones, scheduled live fixtures, pre-set instructions for absent managers, youth scouting, and negotiated player-to-player transfers. None of these online services are live yet.</p>'+
      (!fixture()?button('START NEXT SEASON →','next-season','primary'):'')+'</div>'+
      '<div class="card" style="margin-top:16px"><div class="head"><h2>Club identity</h2></div><p>Name your grassroots club for your own saved career.</p>'+
      '<div class="actions"><input class="club-input" id="club-name-input" aria-label="Club name" maxlength="28" value="'+esc(state.club)+'">'+button('SAVE NAME','rename-club','primary')+'</div></div>';
  }
  function nextSeason(){
    if(fixture()||state.match)return;
    var rank=state.standings.slice().sort(sortTable).findIndex(function(t){return t.name==='Sunday Strikers';})+1;
    var old=state.division,prior=state.season,prize=rank===1?180:rank===2?100:rank===3?65:35;
    var shift=rank<=2?-1:rank>=6?1:0;
    state.division=Math.max(1,Math.min(8,old+shift));
    state.seasonHistory.push({season:prior,division:old,position:rank,points:state.standings.find(function(t){return t.name==='Sunday Strikers';}).points,prize:prize});
    ledger('Season '+prior+' finish prize',prize);
    state.season++;state.round=0;state.results={};state.offers={};state.guest={};state.training={};state.injuries={};
    state.lineup=[];state.lineupCustomized=false;state.lineupRound=0;
    state.standings=names.map(function(n){return {name:n,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0};}).concat([{name:'Sunday Strikers',played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}]);
    roster.forEach(function(p){
      p.age=(p.age||22)+1;state.fitness[p.id]=100;
      if(state.division>1 && p.professional){p.professional=false;p.job=jobs[p.id%jobs.length];}
      else if(!p.professional && Math.random()<.25)p.job=jobs[Math.floor(Math.random()*jobs.length)];
      var chance=/shift|evenings/i.test(p.job)?.56:/college|university|student/i.test(p.job)?.76:.82;
      p.available=Array.from({length:6},function(){return p.professional?1:Math.random()<chance?1:0;});
    });
    state.market=marketPool(state.season,state.division);state.youth=youthPool(state.season);state.sponsor=35+(8-state.division)*18;state.tab='overview';
    notice('Season '+prior+' finished '+(rank<=2?'with promotion':rank>=6?'in the relegation places':'in mid-table')+'. Division '+state.division+' is ready. '+money(prize)+' prize received.');
  }
  function extraAction(action,target){
    var id=Number(target.getAttribute('data-player')),p,fee,f=fixture();
    if(action==='profile-player'){state.profileId=state.profileId===id?null:id;render();return true;}
    if(action==='rename-club'){
      var field=document.getElementById('club-name-input'),name=field&&typeof field.value==='string'?field.value.trim():'';
      if(!name)return true;
      state.club=name.slice(0,28);notice('Club renamed to '+state.club+'.');return true;
    }
    if(action==='physio'){
      p=roster.find(function(x){return x.id===id;});
      if(!p||!(state.injuries[id]>state.round)||state.money<40)return true;
      ledger('Physio care: '+p.name,-40);state.injuries[id]=state.round;state.fitness[id]=Math.max(70,fitness(p));
      notice(p.name+' completed treatment and is available for selection.');return true;
    }
    if(action==='forfeit'){
      if(!f||state.match||ready())return true;
      if(!confirm('Forfeit this match 0–3? You will not receive sponsorship and a £15 admin penalty applies.'))return true;
      state.match={round:state.round,opponent:f.opponent,minute:20,home:0,away:3,instruction:'balanced',auto:true,forfeit:true,selectedIds:[],events:[{minute:20,text:'Fixture forfeited. No eligible team available.'}]};
      finish();return true;
    }
    if(action==='next-season'){nextSeason();return true;}
    if(action==='auto-pick'){state.lineup=[];state.lineupCustomized=false;notice('The best available starting five have been selected.');return true;}
    if(action==='lineup'){
      if(!f)return true;
      p=players().find(function(x){return x.id===id;});if(!p)return true;
      if(!state.lineupCustomized || state.lineupRound!==state.round){state.lineup=starters(state.round).map(function(x){return x.id;});state.lineupCustomized=true;state.lineupRound=state.round;}
      if(state.lineup.includes(id))state.lineup=state.lineup.filter(function(x){return x!==id;});
      else if(state.lineup.length<5)state.lineup.push(id);
      else{notice('Deselect a starter before selecting another player.');return true;}
      toast='';render();return true;
    }
    if(action==='train'){
      if(!f)return true;var key=state.season+':'+state.round,focus=target.getAttribute('data-value');
      if(state.training[key]||state.money<12)return true;
      if(!['passing','finishing','defending','fitness'].includes(focus))return true;
      ledger('Training: '+focus,-12);state.training[key]=focus;
      roster.forEach(function(p){
        ensureDetails(p);
        var skill=focus==='finishing'?'finishing':focus==='defending'?(p.pos==='GK'?'keeping':'defending'):focus==='fitness'?'stamina':'passing';
        p.attributes[skill]=clamp(p.attributes[skill]+(focus==='fitness'?3:2),15,99);
        var gain=focus==='fitness'?5:focus==='finishing'?(p.pos==='FWD'?30:12):focus==='defending'?(p.pos==='DEF'||p.pos==='GK'?30:12):22;
        develop(p,gain);
        state.fitness[p.id]=Math.min(100,Math.max(45,fitness(p)+(focus==='fitness'?17:-5)));
      });notice('Training session completed. Player development and fitness updated.');return true;
    }
    if(action==='sign-guest'){
      var guest=state.formerGuests.find(function(g){return g.id===id;});
      if(!guest||roster.length>=12||state.money<guest.fee)return true;
      var pNew=ensureDetails({id:50000+guest.id,name:guest.name,pos:guest.pos,rating:guest.rating,
        job:jobs[(guest.id+state.season)%jobs.length],age:18+(guest.id%12),
        potential:Math.min(95,guest.rating+8+guest.id%10),professional:false,xp:0,
        available:Array.from({length:6},function(){return Math.random()<.75?1:0;})});
      roster.push(pNew);state.formerGuests=state.formerGuests.filter(function(x){return x.id!==id;});
      ledger('Signed former stand-in: '+guest.name,-guest.fee);notice(guest.name+' has been registered after impressing as a guest.');return true;
    }
    if(action==='sign-player'||action==='promote-youth'){
      var young=action==='promote-youth',pool=young?state.youth:state.market;
      p=pool.find(function(x){return x.id===id;});if(!p||roster.length>=12)return true;
      fee=young?20:p.fee;
      if(state.money<fee)return true;
      if(p.professional && (state.division!==1||roster.filter(function(x){return x.professional;}).length>=3)){notice('Only Division 1 permits up to three professionals.');return true;}
      var copy=ensureDetails(JSON.parse(JSON.stringify(p)));
      if(!copy.professional){var chance=/shift|evening/i.test(copy.job)?.58:.82;copy.available=Array.from({length:6},function(){return Math.random()<chance?1:0;});}
      roster.push(copy);pool.splice(pool.indexOf(p),1);ledger(young?'Youth promoted: '+p.name:'Signed: '+p.name,-fee);
      notice(p.name+' joined the registered squad.');return true;
    }
    if(action==='release-player'){
      if(roster.length<=5)return true;p=roster.find(function(x){return x.id===id;});if(!p)return true;
      if(!confirm('Release '+p.name+' from your registered squad? This cannot be undone.'))return true;
      roster.splice(roster.indexOf(p),1);state.lineup=state.lineup.filter(function(x){return x!==id;});
      notice(p.name+' has left your squad.');return true;
    }
    if(action==='offer'){
      p=roster.find(function(x){return x.id===id;});if(!p||!f||available(p,state.round)||state.money<20||(state.injuries[id]>state.round))return true;
      state.offerAttempts=state.offerAttempts||{};
      var key=state.season+':'+state.round+':'+id;
      if(state.offerAttempts[key]){notice('You have already asked '+p.name+' about this fixture.');return true;}
      state.offerAttempts[key]=true;
      var odds=/shift|evening/i.test(p.job)?.62:/college|university|student/i.test(p.job)?.54:.75;
      if(Math.random()<odds){state.offers[state.round+':'+id]=true;ledger('Appearance fee: '+p.name,-20);notice(p.name+' accepted the £20 appearance fee and will attend this fixture.');}
      else notice(p.name+' could not change their plans, even for an appearance fee. No money was charged.');
      return true;
    }
    if(action==='guest'){
      if(!f||state.money<15||!roster.some(function(x){return available(x,state.round);}))return true;
      var current=state.guest[state.round]?(Array.isArray(state.guest[state.round])?state.guest[state.round]:[state.guest[state.round]]):[];
      if(current.length>=3)return true;
      var friends=['Taylor Clarke','Morgan Price','Riley Scott','Jordan Ellis','Casey Hall','Avery Lewis','Frankie Wood','Jesse Brown'];
      p=roster.filter(function(x){return available(x,state.round);})[current.length%roster.filter(function(x){return available(x,state.round);}).length];
      var needsGoalkeeper=!players(state.round).some(function(x){return x.pos==='GK';});
      var guest={id:100+state.round*10+current.length,name:friends[(state.round+state.season+current.length)%friends.length],
        pos:needsGoalkeeper?'GK':current.length%2?'DEF':'FWD',rating:40+Math.floor(Math.random()*43)};
      current.push(guest);state.guest[state.round]=current;ledger('Stand-in introduced by '+p.name,-15);
      notice(p.name+' brought '+guest.name+' along. '+guest.rating+' overall · '+guest.pos+' · guest for this match only.');return true;
    }
    if(action==='substitute'){
      if(!state.match||state.match.minute>=20)return true;
      var m=state.match,used=starters(m.round),bench=players(m.round).filter(function(x){return !used.some(function(p){return p.id===x.id;});});
      var on=bench.sort(function(a,b){return b.rating-a.rating;})[0],off=used.filter(function(p){return p.pos!=='GK';}).sort(function(a,b){return fitness(a)-fitness(b);})[0];
      if(!on||!off){notice('No substitute is available.');return true;}
      m.selectedIds[m.selectedIds.indexOf(off.id)]=on.id;m.events.push({minute:m.minute,text:'Substitution: '+on.name+' replaces '+off.name+'.'});render();return true;
    }
    return false;
  }

  function render(){
    var body=state.tab==='overview'?overview():state.tab==='squad'?squad():state.tab==='tactics'?tactics():state.tab==='fixtures'?fixtures():state.tab==='league'?league():state.tab==='training'?trainingView():state.tab==='transfers'?transfersView():state.tab==='academy'?academyView():state.tab==='finances'?financesView():state.tab==='career'?careerView():match();
    app.innerHTML='<div class="shell"><aside class="sidebar"><div class="brand"><div class="brandmark">5A</div><div class="brandcopy"><b>FIVE ASIDE</b><small>MANAGER · ALPHA</small></div></div><div><div class="side-label">CLUB OFFICE</div><nav class="nav">'+nav()+'</nav></div><div class="sidebar-foot"><span class="online-dot"></span> LOCAL TEST BUILD<br>Progress saves on this device.<br>No online managers yet.<br><br>'+button('RESET TEST SAVE','reset','small ghost')+'</div></aside><main class="main">'+heading()+(toast?'<div class="banner success" role="status">'+esc(toast)+'</div>':'')+body+'<div class="footer-note">5 ASIDE MANAGER · GAMEPLAY PROTOTYPE · NOT A LIVE ONLINE LEAGUE · <a href="./save-transfer.html">TRANSFER SAVE</a></div></main></div>';
  }
  function notice(msg){toast=msg;render();}
  function updateTable(name,gf,ga){
    var t=state.standings.find(function(x){return x.name===name;});if(!t)return;
    t.played++;t.gf+=gf;t.ga+=ga;if(gf>ga){t.won++;t.points+=3;}else if(gf===ga){t.drawn++;t.points++;}else t.lost++;
  }
  function randomGoal(chance){return Math.random()<chance;}
  function tick() {
    var m=state.match;if(!m || m.minute>=20)return;
    m.minute+=2;
    var team=starters(m.round),mean=team.reduce(function(a,p){
      ensureDetails(p);
      var skill=p.attributes[p.pos==='GK'?'keeping':p.pos==='DEF'?'defending':p.pos==='FWD'?'finishing':'passing'];
      return a+p.rating+(skill-p.rating)*.18+(p.morale-75)*.08+(p.attributes.stamina-65)*.045-(100-fitness(p))*.13;
    },0)/5;
    if(m.auto)m.instruction=m.minute>=14&&m.home>m.away?state.planAhead:m.minute>=10&&m.home<m.away?state.planBehind:state.plan;
    var attack=(m.instruction==='push'?0.10:m.instruction==='press'?.065:m.instruction==='hold'?-0.07:0);
    var style=(m.auto?state.plan:state.style);
    var bonus=style==='press'?.04:style==='counter'?.015:0;var fatigue=Math.max(0,m.minute-10)/10*(style==='press'?.045:.018);
    if(randomGoal(Math.max(.02,Math.min(.40,.13+(mean-65)*.008+bonus+attack-fatigue+(state.formation==='1-1-2'?.045:0))))){
      m.home++;
      var scorer=team.filter(function(p){return p.pos!=='GK';});
      var p=scorer[Math.floor(Math.random()*scorer.length)]||team[0];
      m.events.push({minute:m.minute,goal:true,text:'GOAL! '+p.name+' finishes a chance for '+state.club+'.'});
    }else if(randomGoal(Math.max(.025,Math.min(.36,.14+(70-mean)*.008+fatigue+(m.instruction==='hold'?-0.07:.04)+(state.formation==='2-1-1'?-0.055:0))))){
      m.away++;m.events.push({minute:m.minute,goal:true,text:'Goal for '+m.opponent+' after a quick move.'});
    }else{
      var lines=['A patient spell of possession in midfield.','Both sides battle for space on the small pitch.','The keeper makes a tidy save.','A shot flashes just wide of the post.','A good interception stops a dangerous move.'];
      m.events.push({minute:m.minute,text:lines[Math.floor(Math.random()*lines.length)]});
    }
    if(m.minute>=20){clearInterval(timer);timer=null;m.events.push({minute:20,text:'Full-time whistle. Confirm the result to continue.'});}
    render();
  }
  function finish(){
    var m=state.match;if(!m || m.minute<20)return;
    var f=fixture();state.results[f.id]={home:m.home,away:m.away,opponent:f.opponent};
    updateTable('Sunday Strikers',m.home,m.away);updateTable(f.opponent,m.away,m.home);
    var others=names.filter(function(n){return n!==f.opponent;});
    var offset=state.round%others.length;
    others=others.slice(offset).concat(others.slice(0,offset));
    for(var i=0;i<2;i++){
      var a=others[i*2],b=others[i*2+1],x=Math.floor(Math.random()*4),y=Math.floor(Math.random()*4);
      updateTable(a,x,y);updateTable(b,y,x);
    }
    var before=fixtureAt(state.round),played=starters(m.round);
    if(m.forfeit){
      ledger('Fixture forfeit penalty',-15);
    }else{
      played.forEach(function(p){
        if(p.id>=100 && p.id<2000)return;
        state.fitness[p.id]=Math.max(35,fitness(p)-(state.style==='press'||m.instruction==='press'?20:14));
        develop(p,22+(m.home>m.away?8:0));
        p.morale=clamp(p.morale+(m.home>m.away?4:m.home===m.away?1:-3),35,100);
        if(Math.random()<.025 && !p.professional)state.injuries[p.id]=state.round+2;
      });
      ledger('Local match sponsorship: '+m.opponent,state.sponsor);
      var paidProfessionals=roster.filter(function(p){return p.professional;});
      if(paidProfessionals.length)ledger('Professional match wages',-45*paidProfessionals.length);
    }
    if(state.guest[state.round]){
      var guests=Array.isArray(state.guest[state.round])?state.guest[state.round]:[state.guest[state.round]];
      guests.forEach(function(g){
        state.formerGuests.push({id:g.id+state.season*1000,name:g.name,rating:g.rating,pos:g.pos,discovered:state.season,fee:Math.max(35,Math.round((g.rating-36)*4))});
      });
      state.formerGuests=state.formerGuests.slice(-10);
    }
    state.round++;
    betweenNights(before,fixtureAt(state.round));
    state.lineupCustomized=false;state.lineup=[];state.lineupRound=state.round;
    state.match=null;state.tab='overview';
    notice('Full-time: '+m.home+'–'+m.away+' against '+f.opponent+'. '+money(state.sponsor)+' sponsorship paid.');
    save();
  }
  function start(auto){
    if(!fixture()||state.match)return;
    if(!ready()){notice('You need five available players including a goalkeeper before kickoff.');return;}
    toast='';
    state.match={round:state.round,opponent:fixture().opponent,minute:0,home:0,away:0,instruction:state.plan,auto:auto,selectedIds:starters(state.round).map(function(p){return p.id;}),events:[{minute:0,text:'Kickoff! '+state.club+' take on '+fixture().opponent+'.'}]};
    state.tab='match';
    if(auto){for(var i=0;i<10;i++)tick();render();}
    else{render();timer=setInterval(function(){tick();},1050);}
  }
  app.addEventListener('click',function(e){
    var target=e.target.closest('button');if(!target)return;
    var tab=target.getAttribute('data-tab');if(tab){state.tab=tab;toast='';render();save();return;}
    var action=target.getAttribute('data-action');if(!action)return;
    if(extraAction(action,target)){save();return;}
    if(action.slice(0,3)==='go-'){state.tab=action.slice(3);toast='';render();save();return;}
    if(action==='offer'){
      var id=Number(target.getAttribute('data-player')),p=roster.find(function(v){return v.id===id;});
      if(!p || available(p,state.round)||state.money<20)return;
      state.money-=20;state.offers[state.round+':'+id]=true;notice(p.name+' accepted a £20 appearance fee for this match.');
    } else if(action==='guest'){
      if(state.guest[state.round]||state.money<15)return;
      var pool=['Taylor Clarke','Morgan Price','Riley Scott','Jordan Ellis','Casey Hall'];
      state.money-=15;state.guest[state.round]={id:100+state.round,name:pool[state.round%pool.length],pos:state.round%2?'DEF':'FWD',rating:44+Math.floor(Math.random()*40)};
      notice('Friend invited! Their ability was revealed when they turned up.');
    } else if(action==='formation'||action==='style'||action==='plan'){
      state[action]=target.getAttribute('data-value');toast='';render();
    } else if(action==='start-live'||action==='start-auto')start(action==='start-auto');
    else if(action==='push'||action==='hold'){
      if(state.match){state.match.instruction=action;state.match.events.push({minute:state.match.minute,text:action==='push'?'Manager instruction: push forward!':'Manager instruction: hold shape.'});render();}
    } else if(action==='finish')finish();
    else if(action==='reset'){
      if(!confirm('Reset all local prototype progress? This cannot be undone.'))return;
      if(timer)clearInterval(timer);timer=null;state=initial();roster=state.roster;notice('Test save reset. A new season is ready.');
    }
    save();
  });
  render();
})();