
(function () {
  'use strict';
  var KEY = 'five-aside-manager-alpha-v1';
  var KIT_COLOURS = [
    ['Midnight','#142f4d'],['Royal blue','#2467bf'],['Sky blue','#7cc9ed'],
    ['Scarlet','#d63c4b'],['Claret','#772a4a'],['Forest green','#1d8967'],
    ['Amber','#f4bf52'],['Orange','#e8793e'],['Purple','#7452ad'],
    ['White','#f4f2e9'],['Black','#1b222a']
  ];
  var KIT_PATTERNS = [['solid','Plain'],['stripes','Stripes'],['hoops','Hoops'],['halves','Halves'],['sash','Sash']];
  function defaultKit(){return {pattern:'stripes',primary:'#1d8967',secondary:'#f4f2e9'};}
  function normalizeKit(kit){
    var fallback=defaultKit(),allowed=KIT_COLOURS.map(function(c){return c[1];});
    if(!kit || typeof kit!=='object')return fallback;
    return {
      pattern:KIT_PATTERNS.some(function(p){return p[0]===kit.pattern;})?kit.pattern:fallback.pattern,
      primary:allowed.includes(kit.primary)?kit.primary:fallback.primary,
      secondary:allowed.includes(kit.secondary)?kit.secondary:fallback.secondary
    };
  }
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
    return {tab:'overview', club:'Sunday Strikers',clubCreated:false,kit:defaultKit(),money:240, sponsor:35, formation:'1-2-1',style:'balanced',plan:'balanced',roleAssignments:{},trainingReports:{},trainingFocus:'passing',tacticalReports:{},matchReports:{},autoSubPolicy:'none', offers:{},offerAttempts:{},guest:{},guestAttempts:{},round:0,results:{}, fitness:{},seasonDone:false, season:1,division:8,roster:JSON.parse(JSON.stringify(originalRoster)),registeredCap:12,
      market:marketPool(1,8),youth:youthPool(1),training:{},injuries:{},playerStats:{},developmentHistory:{},playerMatchHistory:{},squadView:{position:'all',availability:'all',sort:'rating',group:'position',query:''},profileCompareId:null,lineup:[],lineupRound:0,lineupCustomized:false,
      planBehind:'press',planAhead:'counter',formerGuests:[],seasonHistory:[],financeLog:[{kind:'Starting funds',amount:240,season:1,round:0}],inbox:[],inboxSeq:0,inboxFilter:'all',inboxReturn:false,homeReturn:false,profileReturn:'squad',match:null, log:[], standings:names.map(function(n){return {name:n,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0};}).concat([{name:'Sunday Strikers',played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}])};
  }
  function read() {
    try {
      var s=JSON.parse(localStorage.getItem(KEY));
      if(s && s.standings && Array.isArray(s.standings) && s.results && s.offers){
        var loaded=Object.assign(initial(),s,{match:null});
        // Old saves already had a functioning club: migrate them without losing progress.
        if(typeof s.clubCreated==='undefined')loaded.clubCreated=true;
        loaded.kit=normalizeKit(s.kit);
        return loaded;
      }
    }catch(e){}
    return initial();
  }
  var state=read(), timer=null, toast='';
  var editingClub=false, creatorError='', creatorStep=1;
  var draftClub={name:state.clubCreated?state.club:'',kit:normalizeKit(state.kit)};
  state.roster=Array.isArray(state.roster)?state.roster:JSON.parse(JSON.stringify(originalRoster));
  roster=state.roster;roster.forEach(ensureDetails);state.season=state.season||1;state.division=state.division||8;state.registeredCap=12;
  state.market=state.market||marketPool(state.season,state.division);state.youth=state.youth||youthPool(state.season);
  state.training=state.training||{};
  // B06 adds strategy assignments and reports without overwriting legacy tactics, training or player XP.
  state.roleAssignments=state.roleAssignments&&typeof state.roleAssignments==='object'&&!Array.isArray(state.roleAssignments)?state.roleAssignments:{};
  state.trainingReports=state.trainingReports&&typeof state.trainingReports==='object'&&!Array.isArray(state.trainingReports)?state.trainingReports:{};
  state.trainingFocus=['passing','finishing','defending','fitness'].includes(state.trainingFocus)?state.trainingFocus:'passing';
  state.tacticalReports=state.tacticalReports&&typeof state.tacticalReports==='object'&&!Array.isArray(state.tacticalReports)?state.tacticalReports:{};
  // B07 reports are additive: never rewrite an imported result or pre-B07 player statistics.
  state.matchReports=state.matchReports&&typeof state.matchReports==='object'&&!Array.isArray(state.matchReports)?state.matchReports:{};
  state.autoSubPolicy=state.autoSubPolicy==='rotate'?'rotate':'none';
  state.formation=['1-2-1','2-1-1','1-1-2'].includes(state.formation)?state.formation:'1-2-1';
  ['style','plan','planBehind','planAhead'].forEach(function(key){
    if(!['balanced','press','counter'].includes(state[key]))state[key]=key==='planBehind'?'press':key==='planAhead'?'counter':'balanced';
  });
  state.injuries=state.injuries||{};state.playerStats=state.playerStats||{};state.seasonHistory=state.seasonHistory||[];state.formerGuests=state.formerGuests||[];state.financeLog=state.financeLog||[];
  state.lineup=Array.isArray(state.lineup)?state.lineup.filter(function(id){return Number.isSafeInteger(id);}):[];
  state.lineupCustomized=!!state.lineupCustomized;
  state.offerAttempts=state.offerAttempts&&typeof state.offerAttempts==='object'&&!Array.isArray(state.offerAttempts)?state.offerAttempts:{};
  state.guestAttempts=state.guestAttempts&&typeof state.guestAttempts==='object'&&!Array.isArray(state.guestAttempts)?state.guestAttempts:{};
  state.guest=state.guest&&typeof state.guest==='object'&&!Array.isArray(state.guest)?state.guest:{};
  state.offers=state.offers&&typeof state.offers==='object'&&!Array.isArray(state.offers)?state.offers:{};
  // B04: preserve old/imported games; migrate only new presentation and event-log fields.
  var importedView=state.squadView&&typeof state.squadView==='object'?state.squadView:{};
  state.squadView={
    position:['all','GK','DEF','MID','FWD'].includes(importedView.position)?importedView.position:'all',
    group:importedView.group==='none'?'none':'position',
    availability:['all','available','unavailable','injured'].includes(importedView.availability)?importedView.availability:'all',
    sort:['rating','name','position','fitness','morale','appearances','goals','availability'].includes(importedView.sort)?importedView.sort:'rating',
    query:typeof importedView.query==='string'?importedView.query.slice(0,60):''
  };
  state.profileCompareId=Number.isSafeInteger(state.profileCompareId)&&
    state.roster.some(function(p){return p.id===state.profileCompareId;})?state.profileCompareId:null;
  function safeHistory(value,limit){
    if(!value||typeof value!=='object'||Array.isArray(value))return {};
    var result={};
    Object.keys(value).slice(0,100).forEach(function(id){
      var n=Number(id);
      if(!Number.isSafeInteger(n)||!state.roster.some(function(p){return p.id===n;}))return;
      var rows=Array.isArray(value[id])?value[id]:[];
      result[id]=rows.filter(function(row){
        return row&&Number.isInteger(row.season)&&row.season>=1&&
          Number.isInteger(row.round)&&row.round>=0&&row.round<=6;
      }).slice(-limit);
    });
    return result;
  }
  state.developmentHistory=safeHistory(state.developmentHistory,20);
  state.playerMatchHistory=safeHistory(state.playerMatchHistory,40);

  // B03: migrate old/imported saves in-place without changing player or season data.
  state.inbox=Array.isArray(state.inbox)?state.inbox.filter(function(m){
    return m&&Number.isSafeInteger(m.id)&&m.id>0&&typeof m.title==='string'&&typeof m.detail==='string'&&
      ['club','availability','recruitment','injury','finance','result','league','training'].includes(m.kind);
  }).slice(0,80).map(function(m){
    return {id:m.id,kind:m.kind,title:m.title.slice(0,120),detail:m.detail.slice(0,600),
      route:['overview','squad','tactics','fixtures','league','training','transfers','academy','finances','career','settings'].includes(m.route)?m.route:'overview',
      season:Number.isInteger(m.season)&&m.season>=1&&m.season<=10000?m.season:state.season,
      round:Number.isInteger(m.round)&&m.round>=0&&m.round<=6?m.round:state.round,
      read:!!m.read,dismissed:!!m.dismissed};
  }):[];
  state.inboxSeq=Math.max(Number.isSafeInteger(state.inboxSeq)?state.inboxSeq:0,state.inbox.reduce(function(max,m){return Math.max(max,m.id);},0));
  state.inboxFilter=state.inboxFilter==='unread'?'unread':'all';
  state.inboxReturn=!!state.inboxReturn&&state.tab!=='overview';
  state.homeReturn=!!state.homeReturn&&state.tab!=='overview';
  state.profileReturn=state.profileReturn==='overview'?'overview':'squad';
  var app=document.getElementById('app');
  function esc(x){return String(x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function save(){try{state.roster=roster;var copy=Object.assign({},state,{match:null});localStorage.setItem(KEY,JSON.stringify(copy));}catch(e){}}
  function money(v){return '£'+v.toLocaleString('en-GB');}
  function fixtureAt(i){if(i<0||i>=6)return null;var x=matchSlots[i];return {id:i,opponent:names[(i+state.season-1)%6],day:x[0],time:x[1],night:x[2]};}
  function fixture(){return fixtureAt(state.round);}
  function ledger(kind,amount){
    state.money+=amount;
    state.financeLog.unshift({kind:kind,amount:amount,season:state.season,round:state.round});
    state.financeLog=state.financeLog.slice(0,50);
    if(state.clubCreated)pushInbox('finance',amount>=0?'Payment received':'Club expense recorded',
      kind+' · '+(amount>=0?'+':'−')+money(Math.abs(amount))+'. Balance: '+money(state.money)+'.','finances');
  }
  function fitness(p){return state.fitness[p.id]==null?100:state.fitness[p.id];}
  function reason(p,round){
    if(state.injuries[p.id]>round)return 'Injured';
    if(p.professional)return 'Available';
    return p.available&&p.available[round]?'Available':(/student|college|university|apprentice/i.test(p.job)?'Education commitment':/evening|shift/i.test(p.job)?'Work shift':'Work / personal commitment');
  }
  function available(p,round){
    return (p.professional||!!(p.available&&p.available[round])||!!state.offers[round+':'+p.id])&&!(state.injuries[p.id]>round);
  }
  // Attendance and match fitness are separate: future shifts are not retrospectively affected by today's fatigue.
  function matchEligible(p,round){
    if(p.id>=100&&p.id<2000)return true; // arrived temporary stand-in; not part of registered career
    return available(p,round)&&(round!==state.round||fitness(p)>=40);
  }
  function eligibilityReason(p,round){
    if(p.id>=100&&p.id<2000)return 'One-off stand-in · this match only';
    if(state.injuries[p.id]>round)return 'Injured · physio available for £40';
    if(!available(p,round)){
      var offerKey=state.season+':'+round+':'+p.id;
      return reason(p,round)+(state.offerAttempts[offerKey]?' · already asked':' · appearance offer possible');
    }
    if(round===state.round&&fitness(p)<40)return 'Exhausted ('+fitness(p)+'% fit) · rest required';
    if(round===state.round&&fitness(p)<55)return 'Fatigue risk ('+fitness(p)+'% fit) · consider rotation';
    return state.offers[round+':'+p.id]?'Appearance offer accepted':'Cleared for fixture';
  }
  function guestsAt(round){
    var raw=state.guest[round];
    return Array.isArray(raw)?raw:(raw?[raw]:[]);
  }
  function guestRequests(round){
    // Older saves may already contain guests without a separate attempt counter.
    return Math.min(3,Math.max(0,Number(state.guestAttempts[state.season+':'+round])||0,guestsAt(round).length));
  }
  function players(round){
    if(round==null)round=state.round;
    var list=roster.filter(function(p){return matchEligible(p,round);}).slice().sort(function(a,b){return b.rating-a.rating;});
    list.push.apply(list,guestsAt(round));
    return list;
  }
  function recommendFive(round){
    var arr=players(round);
    function score(p){return p.rating+Math.min(12,(fitness(p)-65)*.26)+(p.morale||75)*.028;}
    var keeper=arr.filter(function(p){return p.pos==='GK';}).sort(function(a,b){return score(b)-score(a);})[0];
    var field=arr.filter(function(p){return p.pos!=='GK';}).sort(function(a,b){return score(b)-score(a);}).slice(0,4);
    return (keeper?[keeper]:[]).concat(field).slice(0,5);
  }
  function starters(round){
    if(round==null)round=state.round;
    var arr=players(round);
    if(state.match&&round===state.match.round&&Array.isArray(state.match.selectedIds))
      return state.match.selectedIds.map(function(id){return arr.find(function(p){return p.id===id;});}).filter(Boolean);
    if(state.lineupCustomized&&round===state.lineupRound)
      return state.lineup.map(function(id){return arr.find(function(p){return p.id===id;});}).filter(Boolean);
    return recommendFive(round);
  }
  function selectionIssues(){
    var f=fixture(),list=players(state.round),team=starters(state.round),issues=[];
    if(!f)return ['No fixture scheduled'];
    if(!list.some(function(p){return p.pos==='GK';}))issues.push('No eligible goalkeeper · resolve a work shift or invite an emergency keeper');
    if(list.filter(function(p){return p.pos!=='GK';}).length<4)issues.push('Need four eligible outfield players · '+list.filter(function(p){return p.pos!=='GK';}).length+' available');
    if(team.length!==5)issues.push('Starting five incomplete · '+team.length+' / 5 selected');
    if(team.filter(function(p){return p.pos==='GK';}).length!==1)issues.push('Exactly one goalkeeper must start');
    if(new Set(team.map(function(p){return p.id;})).size!==team.length)issues.push('A player cannot be selected twice');
    if(team.some(function(p){return !list.some(function(x){return x.id===p.id;});}))issues.push('A selected player is unavailable or too exhausted');
    return issues;
  }
  function ready(){return !!fixture()&&selectionIssues().length===0;}
  function canForfeit(){
    if(!fixture()||state.match)return false;
    var list=players(state.round);
    return !list.some(function(p){return p.pos==='GK';})||list.filter(function(p){return p.pos!=='GK';}).length<4;
  }
  function benchPlayers(round){
    var ids=starters(round).map(function(p){return p.id;});
    return players(round).filter(function(p){return !ids.includes(p.id);});
  }
  var FORMATION_SLOTS={
    '1-2-1':[
      {key:'GK',label:'Goalkeeper',type:'GK',x:50,y:87},
      {key:'BACK',label:'Defensive anchor',type:'DEF',x:50,y:67},
      {key:'MID_L',label:'Left support',type:'MID',x:25,y:44},
      {key:'MID_R',label:'Right support',type:'MID',x:75,y:44},
      {key:'FRONT',label:'Striker',type:'FWD',x:50,y:19}
    ],
    '2-1-1':[
      {key:'GK',label:'Goalkeeper',type:'GK',x:50,y:87},
      {key:'BACK_L',label:'Left defender',type:'DEF',x:27,y:68},
      {key:'BACK_R',label:'Right defender',type:'DEF',x:73,y:68},
      {key:'MID',label:'Playmaker',type:'MID',x:50,y:44},
      {key:'FRONT',label:'Striker',type:'FWD',x:50,y:19}
    ],
    '1-1-2':[
      {key:'GK',label:'Goalkeeper',type:'GK',x:50,y:87},
      {key:'BACK',label:'Defensive anchor',type:'DEF',x:50,y:70},
      {key:'MID',label:'Playmaker',type:'MID',x:50,y:48},
      {key:'FRONT_L',label:'Left attacker',type:'FWD',x:27,y:23},
      {key:'FRONT_R',label:'Right attacker',type:'FWD',x:73,y:23}
    ]
  };
  var TACTIC_PROFILES={
    balanced:{label:'Possession / balanced',attack:0,concede:0,fatigue:1.4,
      description:'Keep the ball, use passing links and conserve energy. Neutral goal risk.'},
    press:{label:'High press',attack:0.055,concede:0.015,fatigue:2.0,
      description:'More pressure and chances, but higher fatigue and a little more counterattack risk.'},
    counter:{label:'Counterattack',attack:0.018,concede:-0.044,fatigue:1.3,
      description:'Protect space and break with pace; fewer direct chances and lower defensive risk.'},
    push:{label:'Push forward',attack:0.09,concede:0.055,fatigue:2.2},
    hold:{label:'Hold shape',attack:-0.055,concede:-0.05,fatigue:1.15}
  };
  function roleQuality(p,slot){
    ensureDetails(p);
    var a=p.attributes,w=slot.type==='GK'?
      {keeping:.65,passing:.15,stamina:.2}:slot.type==='DEF'?
      {defending:.55,passing:.2,stamina:.15,pace:.1}:slot.type==='MID'?
      {passing:.45,stamina:.3,pace:.15,defending:.1}:
      {finishing:.55,pace:.25,passing:.15,stamina:.05};
    var base=Object.keys(w).reduce(function(total,key){return total+(a[key]||40)*w[key];},0);
    return clamp(base*.83+p.rating*.17+(p.morale-75)*.06+(fitness(p)-100)*.055,1,99);
  }
  function formationSlots(key){return FORMATION_SLOTS[key]||FORMATION_SLOTS['1-2-1'];}
  function optimizeRoles(team,formation){
    var slots=formationSlots(formation),keeper=team.find(function(p){return p.pos==='GK';});
    var outfield=team.filter(function(p){return p.pos!=='GK';}),best=null,highest=-1;
    function assign(index,ids,score){
      if(index===slots.length-1){
        if(score>highest){highest=score;best=ids.slice();}
        return;
      }
      var slot=slots[index+1];
      outfield.forEach(function(p){
        if(ids.includes(p.id))return;
        assign(index+1,ids.concat(p.id),score+roleQuality(p,slot));
      });
    }
    if(keeper&&outfield.length===4)assign(0,[],0);
    if(!best)return {};
    var result={GK:keeper.id};
    slots.slice(1).forEach(function(slot,i){result[slot.key]=best[i];});
    return result;
  }
  function rolesForTeam(team,formation){
    var saved=state.roleAssignments[formation],slots=formationSlots(formation);
    if(saved&&typeof saved==='object'){
      var ids=slots.map(function(slot){return saved[slot.key];});
      if(ids.length===5&&new Set(ids).size===5&&ids.every(function(id){return team.some(function(p){return p.id===id;});})){
        var keeper=team.find(function(p){return p.id===saved.GK;});
        if(keeper&&keeper.pos==='GK'&&slots.slice(1).every(function(slot){
          return team.some(function(p){return p.id===saved[slot.key]&&p.pos!=='GK';});
        }))return Object.assign({},saved);
      }
    }
    return optimizeRoles(team,formation);
  }
  function tacticalAssessment(team,formation,map){
    var slots=formationSlots(formation),quality=0,byRole={};
    slots.forEach(function(slot){
      var p=team.find(function(p){return p.id===map[slot.key];});
      if(!p)return;
      var fit=roleQuality(p,slot);quality+=fit;
      byRole[slot.key]={id:p.id,fit:fit,type:slot.type};
    });
    return {average:slots.length?Math.round(quality/slots.length):0,byRole:byRole};
  }
  function chanceRange(n){return Math.max(.025,Math.min(.43,n));}
  function tacticForecast(team,formation,map,approach){
    var assessment=tacticalAssessment(team,formation,map),profile=TACTIC_PROFILES[approach]||TACTIC_PROFILES.balanced;
    var bias=formation==='1-1-2'?{attack:.045,concede:.035}:formation==='2-1-1'?{attack:-.015,concede:-.052}:{attack:0,concede:0};
    var fin=assessment.average||60;
    return {roleFit:fin,profile:profile,attack:chanceRange(.13+(fin-65)*.003+profile.attack+bias.attack),
      concede:chanceRange(.14-(fin-65)*.0018+profile.concede+bias.concede),fatigue:profile.fatigue};
  }
  function trainingEstimate(p,focus){
    ensureDetails(p);
    var skill=focus==='finishing'?'finishing':focus==='defending'?(p.pos==='GK'?'keeping':'defending'):
      focus==='fitness'?'stamina':'passing';
    var gain=focus==='fitness'?5:focus==='finishing'?(p.pos==='FWD'?30:12):
      focus==='defending'?(p.pos==='DEF'||p.pos==='GK'?30:12):22;
    var change=focus==='fitness'?3:2;
    return {skill:skill,from:p.attributes[skill],to:clamp(p.attributes[skill]+change,15,99),
      xp:p.rating>=p.potential?0:gain,fitnessBefore:fitness(p),
      fitnessAfter:Math.min(100,Math.max(45,fitness(p)+(focus==='fitness'?17:-5)))};
  }
  function develop(p,xp,source){
    ensureDetails(p);
    var startRating=p.rating,startXP=p.xp||0;
    var cap=p.potential,actualXP=p.rating<cap?xp:0;
    p.xp=startXP+actualXP;
    var advanced=0;
    while(p.rating<cap&&p.xp>=70+(p.rating-45)*5){
      p.xp-=70+(p.rating-45)*5;p.rating++;advanced++;
    }
    if(source&&Number.isSafeInteger(p.id)&&p.id>=1&&actualXP>0){
      var logs=state.developmentHistory[p.id]||(state.developmentHistory[p.id]=[]);
      logs.push({season:state.season,round:state.round,source:source,xpGained:actualXP,
        ratingBefore:startRating,ratingAfter:p.rating,xpBefore:startXP,xpAfter:p.xp});
      if(logs.length>20)logs.splice(0,logs.length-20);
    }
    return advanced;
  }
  function betweenNights(prev,next){if(prev&&next&&prev.night!==next.night)roster.forEach(function(p){state.fitness[p.id]=Math.min(100,fitness(p)+24);});}
  function clubMark(name,kit){
    var short=String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w.charAt(0).toUpperCase();}).join('')||'FC';
    var own=!!kit,theme=own?normalizeKit(kit):null;
    return '<span class="club-crest '+(own?'club-crest-own kit-'+theme.pattern:'club-crest-rival')+'" '+
      (own?kitVars(theme)+' ':'')+'aria-label="'+esc(name)+'">'+esc(short)+'</span>';
  }
  function club(name,own){return clubMark(name,own?state.kit:null);}

  function badge(text,mode){return '<span class="status '+(mode||'')+'">'+esc(text)+'</span>';}
  function button(label,action,style,extra){return '<button type="button" class="btn '+(style||'')+'" data-action="'+action+'" '+(extra||'')+'>'+label+'</button>';}
  function kitVars(kit){
    kit=normalizeKit(kit);
    return 'style="--kit-primary:'+kit.primary+';--kit-secondary:'+kit.secondary+'"';
  }
  function kitPreview(kit,compact){
    kit=normalizeKit(kit);
    return '<div class="kit-display '+(compact?'compact':'')+'" '+kitVars(kit)+'><div class="kit-shirt kit-'+kit.pattern+'"><span class="kit-number">5</span></div></div>';
  }
  function tidyClubName(value){return String(value||'').trim().replace(/\s+/g,' ');}
  function identityNameError(value){
    var name=tidyClubName(value);
    if(name.length<3||name.length>28)return 'Enter a club name between 3 and 28 characters.';
    if(names.some(function(n){return n.toLowerCase()===name.toLowerCase();}))
      return 'That name belongs to another team in this division. Choose a different name.';
    return '';
  }
  function kitContrastRatio(kit){
    function lum(hex){
      var rgb=[1,3,5].map(function(i){var v=parseInt(hex.slice(i,i+2),16)/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});
      return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    }
    var a=lum(kit.primary),b=lum(kit.secondary);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  }
  function identityKitError(kit){
    if(kit.primary===kit.secondary)return 'Choose two different kit colours so the design stays visible.';
    if(kitContrastRatio(kit)<1.5)return 'Choose two shirt colours with stronger contrast so the kit is readable.';
    return '';
  }
  function creator(){
    var kit=draftClub.kit, editing=state.clubCreated&&editingClub, name=tidyClubName(draftClub.name);
    var contrast=kitContrastRatio(kit),contrastNote=identityKitError(kit);
    var steps=['Club name','Home kit','Confirm identity'];
    var progress='<div class="creator-progress" aria-label="Creation progress">'+steps.map(function(label,i){
      var current=creatorStep===i+1;
      return '<div class="creator-step '+(current?'current':creatorStep>i+1?'done':'upcoming')+'" '+
        (current?'aria-current="step"':'')+'><span>'+(i+1)+'</span><b>'+label+'</b></div>';
    }).join('')+'</div>';
    function colours(kind){
      return KIT_COLOURS.map(function(c){
        var selected=kit[kind]===c[1];
        return '<button type="button" data-action="kit-'+kind+'" data-value="'+c[1]+'" class="colour-choice '+(selected?'chosen':'')+
          '" aria-label="'+c[0]+' '+kind+' colour" aria-pressed="'+selected+'" title="'+c[0]+'"><span style="background:'+c[1]+'"></span></button>';
      }).join('');
    }
    var content='';
    if(creatorStep===1){
      content='<div class="creator-stage-heading"><span class="eyebrow">STEP 1 OF 3 · CLUB NAME</span><h2>Give your team its name</h2>'+
        '<p>What will the league call your club? Your name appears in fixtures, the league table and match reports.</p></div>'+
        '<label class="creation-label" for="club-create-name">Team name</label>'+
        '<input class="club-input creation-name" id="club-create-name" maxlength="28" autocomplete="off" spellcheck="false" '+
        'aria-describedby="creator-name-help" '+(creatorError?'aria-invalid="true" ':'')+
        'placeholder="e.g. Harbour Fives FC" value="'+esc(draftClub.name)+'">'+
        '<p class="creator-hint" id="creator-name-help">3–28 characters. You can change this in Club → Career later. <span id="creator-name-length">'+name.length+'</span>/28</p>'+
        '<div class="creation-actions">'+button('CONTINUE TO HOME KIT →','creator-next','primary')+
        (editing?button('CANCEL CHANGES','cancel-creator','ghost'):'')+'</div>';
    }else if(creatorStep===2){
      content='<div class="creator-stage-heading"><span class="eyebrow">STEP 2 OF 3 · DESIGN YOUR KIT</span><h2>Own your colours</h2>'+
        '<p>Choose a shirt design and two contrasting club colours. You will see this kit in match preparation and club identity.</p></div>'+
        '<div class="creation-label">Home shirt design</div><div class="design-options">'+KIT_PATTERNS.map(function(c){
          var selected=kit.pattern===c[0];
          return '<button type="button" class="design-choice '+(selected?'selected':'')+'" data-action="kit-pattern" data-value="'+c[0]+'" aria-pressed="'+selected+'">'+
            '<span class="pattern-thumb kit-'+c[0]+'" '+kitVars(kit)+' aria-hidden="true"></span><b>'+c[1]+'</b></button>';
        }).join('')+'</div>'+
        '<div class="creation-label">Main shirt colour</div><div class="colour-options" role="group" aria-label="Main shirt colour">'+colours('primary')+'</div>'+
        '<div class="creation-label">Secondary / trim colour</div><div class="colour-options" role="group" aria-label="Secondary shirt colour">'+colours('secondary')+'</div>'+
        '<p class="creator-hint '+(contrastNote?'creator-warning':'creator-good')+'" role="status">'+
        (contrastNote?esc(contrastNote):'Colour contrast: '+contrast.toFixed(1)+':1 · clear distinction')+'</p>'+
        '<div class="creation-actions">'+button('← BACK TO NAME','creator-back','ghost')+button('REVIEW CLUB →','creator-next','primary')+
        (editing?button('CANCEL CHANGES','cancel-creator','ghost'):'')+'</div>';
    }else{
      content='<div class="creator-stage-heading"><span class="eyebrow">STEP 3 OF 3 · FINAL CHECK</span><h2>Ready for the first match?</h2>'+
        '<p>Review the identity you will take into your first league season. This does not reset existing progress when you are editing.</p></div>'+
        '<div class="creator-review"><div class="creator-review-row"><span>Club name</span><strong>'+esc(name)+'</strong>'+button('EDIT NAME','creator-name-step','small ghost')+'</div>'+
        '<div class="creator-review-row"><span>Home kit</span><strong>'+esc(KIT_PATTERNS.find(function(p){return p[0]===kit.pattern;})[1])+'</strong>'+button('EDIT KIT','creator-kit-step','small ghost')+'</div>'+
        '<div class="creator-review-row"><span>Colours</span><strong>'+esc(KIT_COLOURS.find(function(c){return c[1]===kit.primary;})[0])+
          ' / '+esc(KIT_COLOURS.find(function(c){return c[1]===kit.secondary;})[0])+'</strong></div></div>'+
        '<div class="creator-confirmation">No online account is required. Your club, kit, squad and progress are saved on this device.</div>'+
        '<div class="creation-actions">'+button('← BACK TO KIT','creator-back','ghost')+
        button(editing?'SAVE CLUB IDENTITY':'CREATE MY TEAM →','create-club','primary')+
        (editing?button('CANCEL CHANGES','cancel-creator','ghost'):'')+'</div>';
    }
    return '<div class="creation-screen">'+
      '<header class="creation-header"><div class="brand"><div class="brandmark">5A</div><div class="brandcopy"><b>FIVE ASIDE</b><small>MANAGER</small></div></div>'+
        '<span class="chip highlight">'+(editing?'EDIT EXISTING CLUB':'NEW MANAGER CAREER')+'</span></header>'+
      '<div class="creation-layout"><section class="card creation-form" aria-label="Club creator">'+
      '<div class="eyebrow">THE CLUB IS YOURS</div><h1>'+(editing?'YOUR CLUB IDENTITY':'CREATE YOUR CLUB')+'</h1>'+progress+
      (creatorError?'<div class="banner" role="alert">'+esc(creatorError)+'</div>':'')+content+'</section>'+
      '<section class="creation-preview" aria-label="Live kit preview">'+
      '<div class="eyebrow">YOUR CLUB · LIVE PREVIEW</div>'+
      '<div class="creator-crest-preview" id="kit-club-crest">'+clubMark(name||'YOUR CLUB FC',kit)+'</div>'+
      kitPreview(kit,false)+'<div id="kit-club-name" class="preview-club-name">'+esc(name||'YOUR CLUB FC')+'</div>'+
      '<div class="preview-caption">'+esc(KIT_PATTERNS.find(function(p){return p[0]===kit.pattern;})[1])+' · Home strip</div>'+
      '<div class="preview-note">Your colours and club badge follow your team into the fixture diary, league and match centre.</div>'+
      '</section></div></div>';
  }
  function syncClubDraft(){
    var field=document.getElementById('club-create-name');
    if(field && typeof field.value==='string')draftClub.name=field.value;
  }
  // B03 — Persist only actual management events. Dashboard decisions are derived each render.
  var INBOX_ROUTES=['overview','squad','tactics','fixtures','league','training','transfers','academy','finances','career','settings'];
  function pushInbox(kind,title,detail,route){
    if(!state.inbox || !Array.isArray(state.inbox))state.inbox=[];
    if(INBOX_ROUTES.indexOf(route)<0)route='overview';
    state.inboxSeq=(Number.isSafeInteger(state.inboxSeq)?state.inboxSeq:0)+1;
    state.inbox.unshift({id:state.inboxSeq,kind:kind,title:String(title),detail:String(detail),
      route:route,season:state.season,round:state.round,read:false,dismissed:false});
    if(state.inbox.length>80)state.inbox.length=80;
  }
  function unreadInbox(){return state.inbox.filter(function(m){return !m.read&&!m.dismissed;}).length;}
  function currentRank(){
    return state.standings.slice().sort(sortTable).findIndex(function(p){return p.name==='Sunday Strikers';})+1;
  }
  function latestMatchResult(){
    if(state.round<1)return null;
    var i=state.round-1,r=state.results[i];
    return r?{result:r,fixture:fixtureAt(i),outcome:r.home>r.away?'W':r.home===r.away?'D':'L'}:null;
  }
  function managerTasks(){
    var f=fixture(),tasks=[],key=state.season+':'+state.round;
    function add(priority,title,description,action,cta,player){
      tasks.push({priority:priority,title:title,description:description,action:action,cta:cta,player:player});
    }
    if(state.match){
      add('critical','Match in progress','Your match against '+state.match.opponent+' is underway. Return to the touchline.','go-match','RETURN TO MATCH');
      return tasks;
    }
    if(!f){
      add('critical','Start the next season','Season '+state.season+' is complete. Review the final table and advance your career.','next-season','START NEXT SEASON');
      add('standard','Review final standings','Your season results and league position are ready.','go-league','VIEW LEAGUE');
      return tasks;
    }
    var eligible=players(state.round),keepers=eligible.filter(function(p){return p.pos==='GK';});
    if(!keepers.length){
      add('critical','A goalkeeper is needed','No eligible goalkeeper for round '+(state.round+1)+'. Check shifts, appearance offers and stand-ins.','go-squad','SOLVE AVAILABILITY');
    }else if(eligible.length<5){
      add('critical','Short of '+(5-eligible.length)+' player'+(5-eligible.length===1?'':'s'),
        'You have '+eligible.length+' eligible for round '+(state.round+1)+'. Find cover before kickoff.','go-squad','FIND COVER');
    }else if(!ready()){
      add('critical','Complete your starting five','Choose five eligible footballers including a goalkeeper before kickoff.','go-tactics','PICK THE FIVE');
    }
    var injured=roster.filter(function(p){return state.injuries[p.id]>state.round;});
    if(injured.length){
      add('attention',injured.length+' player'+(injured.length===1?'':'s')+' injured',
        injured.map(function(p){return p.name;}).slice(0,2).join(', ')+(injured.length>2?' + more':'')+'. Review treatment and future selection.',
        'profile-player','REVIEW INJURY',injured[0].id);
    }
    if(!state.training[key] && state.money>=12){
      add('standard','Training session available','A £12 team training session is still available before this fixture.','go-training','PLAN TRAINING');
    }
    if(ready()){
      add('standard','Prepare the match plan',state.formation+' · '+state.style+' approach. Your saved plan runs when you are away.','go-tactics','SET TACTICS');
      add('standard','Kickoff is ready','Five eligible starters are available for '+f.opponent+'.','go-fixtures','MATCH CENTRE');
    }else{
      add('standard','Review fixture details','Round '+(state.round+1)+' against '+f.opponent+' · '+f.day+' '+f.time+'.','go-fixtures','FIXTURE DETAILS');
    }
    return tasks.slice(0,4);
  }
  function inboxView(){
    var unread=unreadInbox(),all=state.inbox.filter(function(m){return !m.dismissed;});
    var showing=state.inboxFilter==='unread'?all.filter(function(m){return !m.read;}):all;
    return '<section class="card manager-inbox" id="manager-inbox" aria-label="Manager inbox">'+
      '<div class="head"><div><div class="eyebrow">CLUB COMMUNICATIONS</div><h2>Manager inbox</h2></div>'+
      '<span class="manager-unread" aria-live="polite">'+unread+' unread</span></div>'+
      '<div class="inbox-toolbar" role="group" aria-label="Inbox filter">'+
      button('ALL ('+all.length+')','inbox-filter',state.inboxFilter==='all'?'small primary':'small ghost','data-value="all" aria-pressed="'+(state.inboxFilter==='all')+'"')+
      button('UNREAD ('+unread+')','inbox-filter',state.inboxFilter==='unread'?'small primary':'small ghost','data-value="unread" aria-pressed="'+(state.inboxFilter==='unread')+'"')+
      (unread?button('MARK ALL READ','inbox-all-read','small ghost'):'')+'</div>'+
      (showing.length?'<div class="inbox-list">'+showing.map(function(m){
        var focus=!m.read?' unread':'';
        return '<article class="inbox-message'+focus+'"><div class="inbox-message-top">'+
          '<span class="inbox-kind kind-'+esc(m.kind)+'">'+esc(m.kind)+'</span>'+
          '<span class="inbox-period">SEASON '+m.season+' · ROUND '+(m.round+1)+'</span></div>'+
          '<h3>'+esc(m.title)+'</h3><p>'+esc(m.detail)+'</p>'+
          '<div class="inbox-actions">'+button('OPEN →','inbox-open','small primary','data-entry="'+m.id+'"')+
          (!m.read?button('MARK READ','inbox-read','small ghost','data-entry="'+m.id+'"'):'')+
          button('DISMISS','inbox-dismiss','small ghost','data-entry="'+m.id+'"')+'</div></article>';
      }).join('')+'</div>':
      '<div class="inbox-empty" role="status"><strong>'+(state.inboxFilter==='unread'?'You are up to date':'No messages yet')+'</strong>'+
      '<p>'+(state.inboxFilter==='unread'?'All club communications have been read.':'Transfers, finances, results and availability updates will appear here as they happen.')+'</p></div>')+
      '</section>';
  }
  function formStrip(){
    var scores=Object.keys(state.results).map(function(key){return {i:Number(key),r:state.results[key]};})
      .filter(function(x){return x.r&&Number.isInteger(x.i);}).sort(function(a,b){return b.i-a.i;}).slice(0,5).reverse();
    return '<div class="manager-form-strip">'+(scores.length?scores.map(function(item){
      var mode=item.r.home>item.r.away?'win':item.r.home===item.r.away?'draw':'loss';
      return '<span class="form-chip '+mode+'" aria-label="Round '+(item.i+1)+' '+(mode==='win'?'win':mode==='draw'?'draw':'loss')+'">'+(mode==='win'?'W':mode==='draw'?'D':'L')+'</span>';
    }).join(''):'<span class="manager-no-form">First match awaits</span>')+'</div>';
  }
  function metrics(){
    var p=state.standings.find(function(t){return t.name==='Sunday Strikers';})||{points:0};
    return '<div class="metrics manager-metrics"><div class="metric"><small>LEAGUE POSITION</small><strong>'+currentRank()+' <span class="muted">/ 7</span></strong></div>'+
      '<div class="metric"><small>LEAGUE POINTS</small><strong>'+p.points+'</strong></div>'+
      '<div class="metric"><small>CLUB BALANCE</small><strong>'+money(state.money)+'</strong></div>'+
      '<div class="metric"><small>UNREAD MESSAGES</small><strong>'+unreadInbox()+'</strong></div></div>';
  }
  function sortTable(a,b){return b.points-a.points || (b.gf-b.ga)-(a.gf-a.ga) || b.gf-a.gf || a.name.localeCompare(b.name);}


  // B01: a single consistent manager information architecture.
  var MANAGER_GROUPS=[
    {name:'Home',entries:[['overview','Dashboard']]},
    {name:'Squad',entries:[['squad','First Team'],['training','Training'],['academy','Academy']]},
    {name:'Tactics',entries:[['tactics','Tactical Setup']]},
    {name:'Match Day',entries:[['fixtures','Fixtures & Results'],['league','League Table']]},
    {name:'Recruitment',entries:[['transfers','Transfer Market']]},
    {name:'Club',entries:[['finances','Finances'],['career','Career & Club'],['settings','Settings & Saves']]}
  ];
  var MANAGER_TABS=MANAGER_GROUPS.reduce(function(all,g){return all.concat(g.entries.map(function(e){return e[0];}));},[]).concat(['profile','match']);
  function activeTab(){return state.tab==='profile'?'squad':state.tab==='match'?'fixtures':state.tab;}
  function currentGroup(){return MANAGER_GROUPS.find(function(g){return g.entries.some(function(e){return e[0]===activeTab();});})||MANAGER_GROUPS[0];}
  function pageName(tab){
    for(var i=0;i<MANAGER_GROUPS.length;i++){
      var page=MANAGER_GROUPS[i].entries.find(function(p){return p[0]===tab;});
      if(page)return page[1];
    }
    return tab==='profile'?'Player Report':tab==='match'?'Live Match':'Dashboard';
  }
  function navigate(tab,origin){
    if(MANAGER_TABS.indexOf(tab)<0)return;
    if(tab==='match'&&!state.match)return;
    if(tab==='profile'&&!roster.some(function(p){return p.id===state.profileId;}))return;
    state.inboxReturn=origin==='inbox'&&tab!=='overview';
    state.homeReturn=origin==='dashboard'&&tab!=='overview';
    state.tab=tab;toast='';render();save();
    if(typeof window!=='undefined'&&window.scrollTo)window.scrollTo(0,0);
  }
  function nav(){
    var group=currentGroup(),active=activeTab();
    var primary=MANAGER_GROUPS.map(function(g){
      var chosen=g===group;
      return '<button type="button" data-tab="'+g.entries[0][0]+'" class="'+(chosen?'active':'')+'" aria-current="'+(chosen?'page':'false')+'">'+g.name+'</button>';
    }).join('');
    var secondary=group.entries.map(function(p){
      var chosen=p[0]===active;
      return '<button type="button" data-tab="'+p[0]+'" class="'+(chosen?'active':'')+'" aria-current="'+(chosen?'page':'false')+'">'+p[1]+'</button>';
    }).join('');
    return '<nav aria-label="Main management areas" class="fm-primary-nav">'+primary+'</nav>'+
      '<nav aria-label="'+esc(group.name)+' pages" class="fm-secondary-nav">'+secondary+'</nav>';
  }
  function contextBar(){
    var group=currentGroup(),name=state.tab==='profile'?'Player Report':state.tab==='match'?'Live Match':pageName(state.tab);
    var crumbs='<div class="fm-crumbs" aria-label="Current location"><button type="button" data-tab="'+group.entries[0][0]+'">'+esc(group.name)+'</button>'+
      '<span aria-hidden="true">/</span><strong aria-current="page">'+esc(name)+'</strong></div>';
    var live=state.match&&state.tab!=='match'?button('RETURN TO LIVE MATCH','go-match','small primary'):'';
    var back=state.inboxReturn?button('← BACK TO INBOX','back-dashboard','small ghost'):
      state.homeReturn?button('← BACK TO CLUBHOUSE','back-dashboard','small ghost'):'';
    return '<div class="fm-contextbar">'+crumbs+'<div class="fm-quicktools">'+back+live+
      '<span class="fm-save-status">● SAVED ON THIS DEVICE</span>'+
      '<a class="btn small ghost" href="./save-transfer.html" aria-label="Export or import your local club save">SAVE TRANSFER</a>'+
      (state.tab==='settings'?'':button('SETTINGS','go-settings','small ghost'))+'</div></div>';
  }
  function emptyState(title,body,action,label){
    return '<div class="fm-empty" role="status"><strong>'+esc(title)+'</strong><p>'+esc(body)+'</p>'+
      (action?button(label,action,'small primary'):'')+'</div>';
  }
  function sectionCard(title,body,footer){
    return '<section class="card fm-section-card"><div class="head"><h2>'+esc(title)+'</h2></div>'+body+
      (footer?'<div class="fm-card-footer">'+footer+'</div>':'')+'</section>';
  }
  function settingsView(){
    return '<p class="section-intro">Manage this browser-only career safely. Your squad, kit, fixtures and finances are stored locally until online accounts arrive in a later block.</p>'+
      '<div class="grid fm-settings-grid">'+
      sectionCard('Save & restore','<p>Export a backup before changing devices, clearing Safari data or resetting your club. Importing a save creates a backup of the previous one.</p>'+
        '<div class="fm-settings-facts"><div><span>Club</span><b>'+esc(state.club)+'</b></div><div><span>Season</span><b>'+state.season+'</b></div><div><span>Squad</span><b>'+roster.length+' registered</b></div></div>',
        '<a class="btn primary" href="./save-transfer.html">EXPORT / IMPORT SAVE</a>')+
      sectionCard('Career & support','<p>Your manager progress is not attached to an online account yet. Keep a copy of your save if you use several devices.</p>'+
        '<p class="fine">Competition mode: local single-player alpha · real online leagues planned for a later block.</p>',
        button('OPEN CLUB CAREER','go-career','ghost'))+
      '<div class="span-all">'+sectionCard('Danger zone','<p>Resetting starts a brand-new local club. This cannot be undone unless you have exported your previous save.</p>',
        button('RESET TEST SAVE','reset','warning'))+'</div></div>';
  }
  function heading(){
    var headings={overview:['CLUB DASHBOARD','The Clubhouse'],squad:['TEAM SELECTION','Squad & Availability'],fixtures:['MATCH CENTRE','Fixtures & Results'],tactics:['TOUCHLINE','Tactical Setup'],league:['DIVISION '+state.division,'League Standings'],training:['TEAM DEVELOPMENT','Training Ground'],transfers:['RECRUITMENT','Transfer Market'],academy:['FUTURE TALENT','Youth Academy'],finances:['CLUB ACCOUNTS','Club Finances'],career:['YOUR JOURNEY','Manager Career'],settings:['CAREER OPTIONS','Settings & Saves'],profile:['PLAYER REPORT','Player Profile'],match:['MATCHDAY LIVE','The Touchline']};
    var t=headings[state.tab]||headings.overview;
    return '<header class="top"><div><div class="eyebrow">'+t[0]+'</div><h1>'+t[1]+'</h1></div><div class="topmeta"><span class="chip">SEASON '+String(state.season).padStart(2,'0')+'</span><span class="chip highlight">DIVISION '+state.division+'</span></div></header>';
  }
  function rowFixture(f,i){
    var r=state.results[i];
    return '<div class="fixture-row"><div class="fixture-badges">'+club(state.club,true)+club(f.opponent,false)+'</div><div class="info"><b>'+esc(state.club)+' vs '+esc(f.opponent)+'</b><small>ROUND '+(i+1)+' · '+f.day+' · '+f.time+' · NIGHT '+f.night+' (demo)</small></div>'+(r?'<span class="score">'+r.home+' – '+r.away+'</span>':i===state.round?badge('NEXT UP',''):badge('UPCOMING','grey'))+'</div>';
  }
  function overview(){
    var f=fixture(),tasks=managerTasks(),primary=tasks[0],latest=latestMatchResult();
    var summary=state.match?'LIVE MATCH · MINUTE '+state.match.minute:
      f?'ROUND '+(state.round+1)+' · NIGHT '+f.night+' · '+f.day+' '+f.time:'SEASON '+state.season+' COMPLETE';
    var headline=state.match?'Return to the touchline':
      f?(!ready()?'Your next match needs attention':'Your next match is on the horizon'):'Your season has finished';
    var details=state.match?state.club+' vs '+state.match.opponent+' · '+state.match.home+'–'+state.match.away:
      f?state.club+' vs '+f.opponent:'Review your final position and move into another league season.';
    var diary=f?Array.from({length:Math.min(3,6-state.round)},function(_,i){return fixtureAt(state.round+i);}):
      Array.from({length:Math.min(3,state.round)},function(_,i){return fixtureAt(Math.max(0,state.round-3)+i);});
    var lastText=latest?'<div class="manager-last-result">LAST RESULT · '+esc(latest.fixture.opponent)+' · '+
      latest.result.home+'–'+latest.result.away+' ('+latest.outcome+')</div>':'<div class="manager-last-result">Your first league result is still to come.</div>';
    return '<div class="manager-dashboard">'+
      '<div class="manager-welcome"><div><span class="eyebrow">MANAGER DESK · SEASON '+state.season+'</span>'+
      '<p>Welcome to '+esc(state.club)+'. Focus on the next decision, then follow your club updates below.</p></div>'+
      '<div class="manager-identity club-office-mark">'+club(state.club,true)+'<strong>'+esc(state.club)+'</strong></div></div>'+
      metrics()+
      '<div class="manager-layout">'+
      '<section class="card manager-next" aria-label="Next manager decision"><div class="eyebrow">NEXT DECISION · '+esc(summary)+'</div>'+
      '<h2>'+esc(headline)+'</h2><div class="manager-fixture-name">'+esc(details)+'</div>'+
      '<p>'+esc(primary.description)+'</p>'+
      '<div class="manager-next-actions">'+button(primary.cta,primary.action,'primary',
        primary.player?'data-player="'+primary.player+'"':'')+
      (f?button('VIEW FIXTURES','go-fixtures','ghost'):button('LEAGUE TABLE','go-league','ghost'))+'</div>'+
      lastText+'</section>'+
      '<section class="card manager-to-do" aria-label="Manager action list"><div class="head"><div><div class="eyebrow">WHAT NEEDS YOUR ATTENTION</div><h2>Manager priorities</h2></div>'+
      badge(tasks.length+' ACTION'+(tasks.length===1?'':'S'),'grey')+'</div>'+
      '<div class="manager-task-list">'+tasks.map(function(t,i){
        return '<div class="manager-task"><span class="manager-task-index">'+(i+1)+'</span><div class="manager-task-main">'+
          '<div class="manager-task-heading"><b>'+esc(t.title)+'</b>'+badge(t.priority==='critical'?'URGENT':t.priority==='attention'?'ATTENTION':'READY',t.priority==='critical'?'red':t.priority==='attention'?'amber':'grey')+'</div>'+
          '<p>'+esc(t.description)+'</p>'+button(t.cta,t.action,'small ghost',t.player?'data-player="'+t.player+'" data-section="availability"':'')+'</div></div>';
      }).join('')+'</div></section>'+
      inboxView()+
      '<section class="card manager-diary" aria-label="Fixture diary"><div class="head"><div><div class="eyebrow">SEASON '+state.season+' · SIX-MATCH TEST LEAGUE</div><h2>Fixture diary</h2></div>'+
      button('VIEW ALL','go-fixtures','small ghost')+'</div>'+
      (diary.length?diary.map(function(game){return rowFixture(game,game.id);}).join(''):
        emptyState('No fixtures scheduled','Start another season to see your new match night slots.','next-season','START SEASON'))+
      '</section>'+
      '<section class="card manager-club-status" aria-label="Club status"><div class="head"><div><div class="eyebrow">THE BIG PICTURE</div><h2>Club overview</h2></div>'+
      button('LEAGUE','go-league','small ghost')+'</div>'+
      '<div class="manager-status-line"><span>Recent form</span>'+formStrip()+'</div>'+
      '<div class="manager-status-line"><span>Eligible next match</span><strong>'+(f?players().length+' available · '+(ready()?'five ready':'selection needed'):'Season completed')+'</strong></div>'+
      '<div class="manager-status-line"><span>Average fitness</span><strong>'+Math.round(roster.reduce(function(sum,p){return sum+fitness(p);},0)/Math.max(1,roster.length))+'%</strong></div>'+
      '<div class="manager-status-line"><span>Sponsor per match</span><strong>'+money(state.sponsor)+'</strong></div>'+
      '<div class="manager-status-actions">'+button('SQUAD','go-squad','small ghost')+button('FINANCES','go-finances','small ghost')+
      button('EDIT CLUB','edit-club','small ghost')+'</div></section>'+
      '</div></div>';
  }

  // B04 — All squad filters and player figures use the saved roster and real simulation.
  var SQUAD_POSITIONS=['GK','DEF','MID','FWD'];
  var SQUAD_SKILLS={GK:'keeping',DEF:'defending',MID:'passing',FWD:'finishing'};
  function roleFor(p){
    ensureDetails(p);
    if(p.pos==='GK')return p.attributes.passing>p.attributes.keeping?'Distributor':'Shot stopper';
    if(p.pos==='DEF')return p.attributes.passing>=p.attributes.defending?'Ball-playing defender':'Defensive anchor';
    if(p.pos==='MID')return p.attributes.stamina>p.attributes.passing?'Box-to-box midfielder':'Playmaker';
    return p.attributes.pace>p.attributes.finishing?'Pressing forward':'Finisher';
  }
  function playerRecord(p){
    var rec=state.playerStats[p.id]||{};
    return {appearances:rec.appearances||0,goals:rec.goals||0,cleanSheets:rec.cleanSheets||0,shots:rec.shots||0,saves:rec.saves||0};
  }
  function playerStatus(p){
    if(!fixture())return {key:'complete',label:'Season finished',why:'No fixtures scheduled'};
    if(state.injuries[p.id]>state.round)return {key:'injured',label:'Injured',why:eligibilityReason(p,state.round)};
    if(!matchEligible(p,state.round))return {key:'unavailable',label:available(p,state.round)?'Exhausted':'Unavailable',why:eligibilityReason(p,state.round)};
    return {key:'available',label:'Available',why:eligibilityReason(p,state.round)};
  }
  function squadSorted(){
    var cfg=state.squadView,q=cfg.query.trim().toLocaleLowerCase('en-GB');
    var filtered=roster.filter(function(p){
      ensureDetails(p);
      var status=playerStatus(p);
      return (cfg.position==='all'||cfg.position===p.pos)&&
        (cfg.availability==='all'||cfg.availability===status.key)&&
        (!q||(p.name+' '+p.job+' '+p.pos+' '+roleFor(p)).toLocaleLowerCase('en-GB').includes(q));
    });
    function value(p){
      if(cfg.sort==='rating')return p.rating;
      if(cfg.sort==='fitness')return fitness(p);
      if(cfg.sort==='morale')return p.morale;
      if(cfg.sort==='appearances')return playerRecord(p).appearances;
      if(cfg.sort==='goals')return playerRecord(p).goals;
      if(cfg.sort==='availability')return playerStatus(p).key==='available'?2:playerStatus(p).key==='injured'?0:1;
      if(cfg.sort==='position')return SQUAD_POSITIONS.indexOf(p.pos);
      return 0;
    }
    return filtered.sort(function(a,b){
      if(cfg.sort==='name')return a.name.localeCompare(b.name)||a.id-b.id;
      if(cfg.sort==='position')return value(a)-value(b)||b.rating-a.rating||a.name.localeCompare(b.name);
      return value(b)-value(a)||b.rating-a.rating||a.name.localeCompare(b.name)||a.id-b.id;
    });
  }
  function squadSelect(id,label,choices,selected){
    return '<label class="squad-select"><span>'+esc(label)+'</span><select id="'+id+'" aria-label="'+esc(label)+'">'+
      choices.map(function(v){return '<option value="'+esc(v[0])+'"'+(v[0]===selected?' selected':'')+'>'+esc(v[1])+'</option>';}).join('')+
      '</select></label>';
  }
  function registeredTableRow(p){
    var status=playerStatus(p),skill=SQUAD_SKILLS[p.pos]||'passing',rec=playerRecord(p);
    return '<tr class="squad-data-row" data-player="'+p.id+'">'+
      '<td data-label="PLAYER"><div class="squad-player-cell"><span class="avatar '+(p.pos==='GK'?'gk':'')+'">'+esc(p.name.charAt(0))+'</span>'+
      '<div><strong>'+esc(p.name)+'</strong><small>'+esc(p.job)+(p.professional?' · PRO':'')+'</small></div></div></td>'+
      '<td data-label="ROLE"><strong>'+esc(p.pos)+'</strong><small>'+esc(roleFor(p))+'</small></td>'+
      '<td data-label="OVERALL"><b class="squad-rating">'+p.rating+'</b><small>'+p.potential+' potential</small></td>'+
      '<td data-label="KEY SKILL"><b>'+p.attributes[skill]+'</b><small>'+esc(skill==='keeping'?'Keeping':skill.charAt(0).toUpperCase()+skill.slice(1))+'</small></td>'+
      '<td data-label="FITNESS"><div class="squad-condition"><strong>'+fitness(p)+'%</strong><span class="squad-mini-meter"><span style="width:'+fitness(p)+'%"></span></span></div></td>'+
      '<td data-label="MORALE"><div class="squad-condition"><strong>'+p.morale+'%</strong><span class="squad-mini-meter"><span style="width:'+p.morale+'%"></span></span></div></td>'+
      '<td data-label="FIXTURE STATUS"><span class="squad-status '+status.key+'">'+esc(status.label)+'</span><small>'+esc(status.why)+'</small></td>'+
      '<td data-label="CAREER"><strong>'+rec.appearances+' app · '+rec.goals+' goals</strong><small>'+rec.cleanSheets+' clean sheets</small></td>'+
      '<td data-label="ACTIONS">'+button('VIEW REPORT','profile-player','small primary','data-player="'+p.id+'"')+'</td></tr>';
  }
  function availabilityDesk(){
    var f=fixture();
    if(!f)return '<section class="card availability-desk"><div class="head"><h2>Fixture availability</h2></div><p>The current season has finished. Players receive new work/study availability when you start another season.</p></section>';
    // Keep the availability desk in sync with First Team search/position/status filters.
    var list=squadSorted();
    var low=list.filter(function(p){return available(p,state.round)&&fitness(p)<55;});
    var next=fixtureAt(state.round+1),sameNight=next&&next.night===f.night;
    return '<section class="card availability-desk" aria-label="Fixture availability desk">'+
      '<div class="head"><div><div class="eyebrow">ROUND '+(state.round+1)+' · '+f.day+' '+f.time+'</div><h2>Fixture availability desk</h2></div>'+
      button('PICK FIVE','go-tactics','small primary')+'</div>'+
      '<p>Work and education commitments change by fixture. A £20 offer may persuade an unavailable but fit player to attend; it is charged only on acceptance, and you may ask only once per fixture. Injured players need physio; exhausted players must rest.</p>'+
      (sameNight?'<div class="rotation-warning"><b>BACK-TO-BACK MATCH NIGHT</b><span>Round '+(state.round+2)+' follows at '+next.time+'. No overnight recovery between these fixtures. Rest tired players or use fresh substitutes.</span></div>':
       '<p class="fine">Next league fixture: '+(next?next.day+' '+next.time+' · Night '+next.night:'season ends after this match')+'. Players recover between different match nights, not between games on the same evening.</p>')+
      (low.length?'<p class="fine"><b>Fatigue watch:</b> '+low.slice(0,4).map(function(p){return esc(p.name)+' ('+fitness(p)+'%)';}).join(', ')+'.</p>':'')+
      '<div class="availability-list">'+list.map(function(p){
        var status=playerStatus(p),attempted=!!state.offerAttempts[state.season+':'+state.round+':'+p.id];
        var canOffer=!state.match&&!available(p,state.round)&&!(state.injuries[p.id]>state.round)&&fitness(p)>=40&&!attempted&&state.money>=20;
        var injured=state.injuries[p.id]>state.round;
        return '<div class="availability-entry" data-player="'+p.id+'">'+
          '<div class="availability-person"><strong>'+esc(p.name)+'</strong><small>'+esc(p.pos)+' · '+esc(p.job)+' · '+fitness(p)+'% fit</small></div>'+
          '<div class="availability-note"><span class="squad-status '+status.key+'">'+esc(status.label)+'</span><small>'+esc(eligibilityReason(p,state.round))+'</small></div>'+
          '<div class="availability-tools">'+
          (injured?button('PHYSIO · £40','physio','small warning','data-player="'+p.id+'" '+(state.money<40||state.match?'disabled':'')):
           !available(p,state.round)?button(attempted?'ALREADY ASKED':state.money<20?'£20 NEEDED':'OFFER £20','offer','small warning',
              'data-player="'+p.id+'" '+(canOffer?'':'disabled')):
           fitness(p)<40?badge('REST REQUIRED','amber'):
           button('REPORT','profile-player','small ghost','data-player="'+p.id+'" data-section="availability"'))+
          '</div></div>';
      }).join('')+'</div></section>';
  }
  function squad(){
    var f=fixture(),eligible=f?players().length:0,cfg=state.squadView,filtered=squadSorted();
    var sel=starters(state.round),injured=roster.filter(function(p){return state.injuries[p.id]>state.round;}).length;
    var positions=[['all','All players'],['GK','Goalkeepers'],['DEF','Defenders'],['MID','Midfielders'],['FWD','Forwards']];
    var statuses=[['all','All availability'],['available','Available'],['unavailable','Unavailable'],['injured','Injured']];
    var sorts=[['rating','Overall · highest'],['name','Name · A–Z'],['position','Position'],['fitness','Fitness · highest'],
      ['morale','Morale · highest'],['appearances','Appearances'],['goals','Goals'],['availability','Available first']];
    var rows=cfg.group==='none'?filtered.map(registeredTableRow).join(''):
      SQUAD_POSITIONS.map(function(pos){
        var items=filtered.filter(function(p){return p.pos===pos;});
        return items.length?'<tr class="squad-group-row"><td colspan="9">'+
          esc({GK:'GOALKEEPERS',DEF:'DEFENDERS',MID:'MIDFIELDERS',FWD:'FORWARDS'}[pos])+' · '+items.length+'</td></tr>'+
          items.map(registeredTableRow).join(''):'';
      }).join('');
    var guests=f?(Array.isArray(state.guest[state.round])?state.guest[state.round]:state.guest[state.round]?[state.guest[state.round]]:[]):[];
    return '<div class="squad-workspace">'+
      '<p class="section-intro">A five-a-side club needs one keeper and four outfield players. Compare ability, fitness, morale and outside commitments before choosing the squad. Figures reflect real saved progress.</p>'+
      '<div class="metrics squad-metrics">'+
      '<div class="metric"><small>REGISTERED</small><strong>'+roster.length+' <span class="muted">/ 12</span></strong></div>'+
      '<div class="metric"><small>ELIGIBLE NEXT MATCH</small><strong>'+(f?eligible:'—')+'</strong></div>'+
      '<div class="metric"><small>STARTING FIVE</small><strong>'+(f?sel.length+'/5':'—')+'</strong></div>'+
      '<div class="metric"><small>INJURED</small><strong>'+injured+'</strong></div></div>'+
      (f?(eligible<5||!ready()?'<div class="banner" role="status">Selection needs attention: '+eligible+
        ' eligible, '+sel.length+' selected. Check the goalkeeper, work commitments and emergency cover.</div>':
        '<div class="banner success" role="status">Your team is eligible for '+esc(f.opponent)+'. '+Math.max(0,eligible-5)+' substitutes available.</div>'):
        '<div class="banner">Season '+state.season+' is complete. Future availability will refresh with the new fixture list.</div>')+
      '<section class="card squad-register" aria-label="Registered first-team players">'+
      '<div class="head"><div><div class="eyebrow">CLUB SQUAD · DIVISION '+state.division+'</div><h2>Registered squad · First Team</h2></div>'+badge('12 SLOTS · PROVISIONAL','grey')+'</div>'+
      '<div class="squad-controls" aria-label="Squad filters">'+
        '<label class="squad-search"><span>FIND A PLAYER</span><input id="squad-search" type="search" maxlength="60" value="'+esc(cfg.query)+'" placeholder="Name, job or role…" autocomplete="off" aria-label="Search registered players"></label>'+
        squadSelect('squad-availability','FIXTURE STATUS',statuses,cfg.availability)+
        squadSelect('squad-sort','SORT PLAYERS',sorts,cfg.sort)+
        squadSelect('squad-group','GROUP BY',[['position','Position'],['none','No groups']],cfg.group)+'</div>'+
      '<div class="squad-position-tabs" role="group" aria-label="Filter by player position">'+positions.map(function(opt){
        var active=cfg.position===opt[0];
        return button(opt[1],'squad-position',active?'small primary':'small ghost',
          'data-value="'+opt[0]+'" aria-pressed="'+active+'"');
      }).join('')+'</div>'+
      '<div class="squad-table-heading"><span id="squad-result-count" aria-live="polite">'+filtered.length+' of '+roster.length+
      ' registered players</span>'+button('RESET FILTERS','squad-clear','small ghost')+'</div>'+
      '<div class="squad-table-wrap"><table class="squad-table"><thead><tr><th>PLAYER</th><th>POSITION / ROLE</th><th>OVR</th><th>KEY SKILL</th><th>FITNESS</th><th>MORALE</th><th>THIS FIXTURE</th><th>CAREER</th><th>REPORT</th></tr></thead>'+
      '<tbody>'+rows+'</tbody></table></div>'+
      (!filtered.length?emptyState('No matching players','Change a search, position or availability filter to see more of your squad.','squad-clear','CLEAR FILTERS'):'')+
      '</section>'+
      '<div class="squad-bottom-grid">'+
      '<section class="card"><div class="head"><h2>Match preparation</h2>'+badge(f?'ROUND '+(state.round+1):'SEASON COMPLETE','grey')+'</div>'+
      (f?'<p><b>'+esc(state.club)+' vs '+esc(f.opponent)+'</b> · '+f.day+' '+f.time+' · Night '+f.night+'</p>'+
        '<div class="detail-list"><div class="detail-line"><span>Available registered & guests</span><b>'+eligible+'</b></div>'+
        '<div class="detail-line"><span>First five selected</span><b>'+sel.length+'/5</b></div>'+
        '<div class="detail-line"><span>Goalkeeper</span><b>'+(sel.some(function(p){return p.pos==='GK';})?'Selected':'Needed')+'</b></div></div>'+
        '<div class="actions squad-context-actions">'+button('PICK STARTING FIVE','go-tactics','primary')+
        button('FIXTURE DIARY','go-fixtures','ghost')+'</div>':
        '<p>Finish the season review before making a new team selection.</p>'+button('NEXT SEASON','next-season','primary'))+
      '</section><section class="card"><div class="head"><h2>Emergency cover</h2></div>'+
      '<p>Outside shifts and education may leave gaps. A one-off stand-in is not automatically registered to the club.</p>'+
      guests.map(function(g){return '<div class="squad-guest-row">'+badge('GUEST','grey')+' '+esc(g.name)+' · '+g.pos+' · '+g.rating+' OVR</div>';}).join('')+
      (f?button('REQUEST A FRIEND · £15 IF ARRIVED','guest','primary',guestRequests(state.round)>=3||state.money<15||state.match||
        !roster.some(function(p){return matchEligible(p,state.round);})?'disabled':''):
        '<p class="fine">Guest invitations reopen when a new season begins.</p>')+
      '<p class="fine">Stand-in ability varies between 40 and 82 OVR. Arrival is uncertain; £15 is charged only on arrival. Maximum three requests per fixture and guests are never automatically registered.</p>'+
      '<p class="fine">Requests used: '+guestRequests(state.round)+' / 3. '+
        (state.money<15?'Insufficient funds: £15 needed.':'You have '+money(state.money)+' in the club balance.')+'</p></section>'+
      '</div>'+availabilityDesk()+'</div>';
  }

  function tactics(){
    var choices=[['1-2-1','Balanced diamond','One defender, two midfield links and one forward. Flexible possession.'],
      ['2-1-1','Defensive base','Two defenders, one link and a forward. Better defensive cover, fewer attacking chances.'],
      ['1-1-2','Attacking pair','One defender, one playmaker and two forwards. More chances, more space left behind.']];
    var approaches=[['balanced','Possession / balanced','Short passing links · lowest risk · moderate fatigue'],
      ['press','High press','More shots and ball pressure · higher fatigue · counterattack exposure'],
      ['counter','Counterattack','Compact shape and quick breaks · safer defence · less open attacking']];
    var picks=fixture()?starters(state.round):[],roles=rolesForTeam(picks,state.formation),
      slots=formationSlots(state.formation),assessment=tacticalAssessment(picks,state.formation,roles),
      forecast=tacticForecast(picks,state.formation,roles,state.style);
    function draw(options,key){
      return '<div class="tactic-grid tactical-options">'+options.map(function(c){
        var active=state[key]===c[0];
        return '<button type="button" class="tactic-choice '+(active?'selected':'')+
          '" data-action="'+key+'" data-value="'+c[0]+'" aria-pressed="'+active+'"'+
          (state.match?' disabled':'')+'><b>'+esc(c[1])+'</b><small>'+esc(c[2])+'</small></button>';
      }).join('')+'</div>';
    }
    function roll(count){return (count*100).toFixed(1)+'%';}
    var shape='<div class="tactical-pitch" '+kitVars(state.kit)+' aria-label="'+esc(state.formation)+' formation pitch">'+
      '<div class="tactical-centre-line"></div><div class="tactical-centre-circle"></div>'+
      slots.map(function(slot){
        var p=picks.find(function(x){return x.id===roles[slot.key];});
        var fit=p?roleQuality(p,slot):0;
        return '<div class="tactical-pitch-position" style="left:'+slot.x+'%;top:'+slot.y+'%">'+
          '<span class="tactical-pitch-shirt '+(slot.type==='GK'?'keeper':'')+'">'+
          (p?esc(p.name.split(' ').map(function(w){return w[0];}).join('')):'—')+'</span>'+
          '<b>'+esc(slot.label)+'</b><small>'+(p?esc(p.name.split(' ').pop())+' · '+fit+' fit':'Not assigned')+'</small></div>';
      }).join('')+'</div>';
    var assignments='<section class="card tactical-role-board" aria-label="Individual tactical role assignments">'+
      '<div class="head"><div><div class="eyebrow">ROLE MATCHING · USES REAL PLAYER ATTRIBUTES</div><h2>Individual roles</h2></div>'+
      badge(assessment.average+' / 100 AVG FIT',assessment.average>=70?'':'amber')+'</div>'+
      '<p>Assign your eligible starting five to the role positions. Changing one outfield role swaps the two players rather than duplicating a player. Role fit is derived from current passing, defending, finishing, pace, stamina, keeping, morale and fitness.</p>'+
      '<div class="tactical-role-list">'+slots.map(function(slot){
        var p=picks.find(function(x){return x.id===roles[slot.key];});
        var pool=slot.type==='GK'?picks.filter(function(x){return x.pos==='GK';}):picks.filter(function(x){return x.pos!=='GK';});
        return '<label class="tactical-role-row" for="role-assign-'+slot.key+'">'+
          '<div class="tactical-role-description"><strong>'+esc(slot.label)+'</strong>'+
          '<small>'+esc(slot.type)+' · '+(p?roleQuality(p,slot)+'% suitability · '+esc(p.pos)+' natural':'Choose player')+'</small></div>'+
          '<select id="role-assign-'+slot.key+'" aria-label="'+esc(slot.label)+' assignment"'+(state.match||slot.type==='GK'?' disabled':'')+'>'+
          pool.map(function(x){
            return '<option value="'+x.id+'"'+(p&&x.id===p.id?' selected':'')+'>'+esc(x.name)+' ('+roleQuality(x,slot)+' fit)</option>';
          }).join('')+'</select></label>';
      }).join('')+'</div>'+
      '<p class="fine">A high striker score does not make a player an actual goalkeeper. Keeper eligibility and the starting-five rules remain enforced separately.</p></section>';
    return '<p class="section-intro">Make tactical choices before the fixture: the five-on-the-pitch shape, individual roles and your approach change the existing match simulator. Save an absence plan to use when you are not watching live.</p>'+
      '<div class="b06-tactics-layout">'+
      '<section class="card tactical-formation"><div class="head"><div><div class="eyebrow">MATCH SHAPE</div><h2>Formation</h2></div>'+badge(esc(state.formation),'grey')+'</div>'+
      draw(choices,'formation')+
      '<div class="tactical-field-header"><h3>Positioning preview</h3><span>'+esc(state.formation)+' · '+picks.length+' / 5 selected</span></div>'+shape+'</section>'+
      assignments+
      '<section class="card tactical-approach"><div class="head"><div><div class="eyebrow">MATCH TRADE-OFFS</div><h2>Live approach</h2></div></div>'+
      draw(approaches,'style')+
      '<div class="tactical-forecast"><div><small>TEAM ROLE FIT</small><strong>'+assessment.average+'/100</strong></div>'+
      '<div><small>ATTACK CHANCE / 2 MIN</small><strong>'+roll(forecast.attack)+'</strong></div>'+
      '<div><small>CONCEDE CHANCE / 2 MIN</small><strong>'+roll(forecast.concede)+'</strong></div>'+
      '<div><small>FATIGUE / MATCH</small><strong>~'+Math.round(forecast.fatigue*10)+' pts</strong></div></div>'+
      '<p class="fine">Illustrative baseline probabilities, before in-match score, opposition and player condition changes. Chances are not guaranteed goals. Pressing increases fatigue; an attacking shape leaves more space; counterattacking protects against concessions.</p></section>'+
      '<section class="card tactical-absence"><div class="head"><div><div class="eyebrow">SAVED ABSENCE RULES</div><h2>Automatic match plan</h2></div>'+
      badge('SAVED ON DEVICE','grey')+'</div>'+
      '<p>For instant simulation and future unattended fixtures, these rules execute on the same match engine as live play. They use the formation and player roles selected at kickoff; no bonus is granted just for being online.</p>'+
      '<div class="tactical-rule"><h3>At kickoff</h3>'+draw(approaches,'plan')+'</div>'+
      '<div class="tactical-rule"><h3>If losing from minute 10</h3>'+draw(approaches,'planBehind')+'</div>'+
      '<div class="tactical-rule"><h3>If winning from minute 14</h3>'+draw(approaches,'planAhead')+'</div>'+
      '<div class="tactical-rule"><h3>Unattended substitutions</h3>'+
        '<p>Choose whether your saved plan should rotate exhausted outfielders from minute 12 when a clearly fresher eligible replacement is available. Goalkeepers never auto-swap. At most two automatic substitutions are made.</p>'+
        draw([['none','Hold the selected five','No automatic changes; only a live manager can substitute.'],
          ['rotate','Rotate tired outfielders','From minute 12, replace fatigued players if a bench player is at least 12 fitness points fresher. Maximum two swaps.']],
          'autoSubPolicy')+'</div>'+
      '<p class="fine">If level, use your initial plan. If a lead or deficit changes, instructions are reassessed at each 2-minute step. Live Push/Hold commands override the approach at the touchline.</p></section>'+
      (state.tacticalReports[state.season+':'+(state.round-1)]?
        '<section class="card tactical-recap"><div class="head"><h2>Previous match tactical report</h2></div>'+
        '<p>Stored choices actually executed during your last fixture. These are recorded phases, not a reconstructed plan.</p>'+
        state.tacticalReports[state.season+':'+(state.round-1)].phases.map(function(phase){
          return '<div class="profile-history-row"><span>'+phase.minute+"' · "+esc(phase.reason)+'</span>'+
            '<strong>'+esc((TACTIC_PROFILES[phase.approach]||TACTIC_PROFILES.balanced).label)+'</strong></div>';
        }).join('')+'</section>':'')+
      '<div class="tactical-selection">'+lineupView()+
      '<div class="actions" style="margin-top:16px">'+button('MATCH CENTRE →','go-fixtures','primary')+
      button('TRAINING GROUND','go-training','ghost')+'</div></div></div>';
  }

  function fixtures(){
    var f=fixture(),issues=f?selectionIssues():[],team=starters(state.round),bench=benchPlayers(state.round);
    var rows=names.map(function(n,i){return rowFixture(fixtureAt(i),i);}).join('');
    var latest=state.matchReports[state.season+':'+(state.round-1)];
    var recap=latest?'<section class="card span-all b07-recap" aria-label="Previous match event report">'+
      '<div class="head"><div><div class="eyebrow">SEE WHAT REALLY HAPPENED</div><h2>Previous match report</h2></div>'+
      badge('SEED '+latest.seed,'grey')+'</div>'+
      '<p><b>'+esc(state.club)+' '+latest.home+'–'+latest.away+' '+esc(latest.opponent)+'</b></p>'+
      '<div class="b07-match-stats">Shots '+latest.metrics.shotsFor+'–'+latest.metrics.shotsAgainst+
      ' · On target '+latest.metrics.onTargetFor+'–'+latest.metrics.onTargetAgainst+
      ' · Keeper saves '+latest.metrics.savesFor+
      ' · Possession '+latest.metrics.possession+'%</div>'+
      '<div class="log">'+latest.events.filter(function(e){return e.goal||e.type==='save'||e.type==='saved-shot';}).slice(-8).reverse().map(function(e){
        return '<div class="logline '+(e.goal?'goal':'')+'"><strong>'+e.minute+"'" +'</strong><span>'+esc(e.text)+'</span></div>';
      }).join('')+'</div>'+
      '<p class="fine">Every scorer and shot in this match is stored in your club save. The same seed and decisions reproduce the result.</p></section>':'';
    return '<div class="grid"><div class="card"><div class="head"><h2>Season fixture list</h2>'+badge('6 MATCHES','grey')+'</div>'+rows+'</div>'+
      '<div><section class="card fixture-readiness" aria-label="Match readiness"><div class="head"><h2>'+(f?'Your next kickoff':'End of season')+'</h2>'+
      (f?badge(issues.length?'PREPARATION NEEDED':'READY TO PLAY',issues.length?'amber':''):'')+'</div>'+
      (f?'<div class="eyebrow">ROUND '+(state.round+1)+' · '+f.day+' '+f.time+' · MATCH NIGHT '+f.night+'</div>'+
        '<div class="fixture-feature-identity">'+club(state.club,true)+'<strong>'+esc(state.club)+'</strong></div>'+
        '<h2 style="margin:15px 0 5px"><span class="muted">vs</span> '+esc(f.opponent)+'</h2>'+
        '<p>'+players().length+' eligible footballers · '+team.length+' starting · '+bench.length+' substitutes · '+state.formation+' · '+state.style+' play</p>'+
        (issues.length?'<div class="selection-match-status blocked" role="status"><strong>KICKOFF IS BLOCKED</strong><ul>'+
          issues.map(function(item){return '<li>'+esc(item)+'</li>';}).join('')+'</ul></div>':
          '<div class="selection-match-status ready" role="status"><strong>READY TO PLAY</strong><p>One goalkeeper and four outfield starters. You can watch live or simulate your saved plan.</p></div>')+
        '<div class="actions fixture-match-actions">'+button('WATCH LIVE MATCH','start-live','primary',issues.length?'disabled':'')+
        button('SIMULATE OFFLINE','start-auto','',issues.length?'disabled':'')+
        button('EDIT LINEUP','go-tactics','ghost')+'</div>'+
        (canForfeit()?'<section class="forfeit-decision"><h3>Unable to field your team?</h3>'+
          '<p>First consider appearances, physio and one-off guests. Forfeiting is irreversible: a 0–3 defeat, no sponsor income and a £15 administrative penalty. It advances to the next fixture.</p>'+
          '<div class="actions">'+button('SOLVE AVAILABILITY','go-squad','small primary')+
          button('CONFIRM FORFEIT 0–3','forfeit','small warning')+'</div></section>':'')+
        (fixtureAt(state.round+1)&&fixtureAt(state.round+1).night===f.night?
          '<div class="rotation-warning"><b>BACK-TO-BACK FIXTURES</b><span>Another kickoff follows at '+
          fixtureAt(state.round+1).time+' tonight. Rotate tired starters. There is no between-game recovery on this match night.</span></div>':''):
        '<p>All six test fixtures are complete.</p>'+button('START NEXT SEASON →','next-season','primary')+
        button('League table','go-league','small'))+
      '</section><div class="card" style="margin-top:16px"><h2>Testing modes</h2>'+
      '<p><b>Live:</b> Watch a 20-minute simulated game and manage eligible substitutions.</p>'+
      '<p><b>Offline:</b> Your saved match plan is simulated instantly. In the eventual online game, planned instructions will run while you are away.</p></div></div>'+recap+'</div>';
  }
  function league(){
    var sorted=state.standings.slice().sort(sortTable);
    return '<p class="section-intro">Season '+state.season+' · Division '+state.division+'. The top two teams move up and the bottom two move down, except at the pyramid boundaries. For now, opponents are computer controlled.</p><div class="card"><div class="head"><h2>Division '+state.division+'</h2>'+badge('SEASON '+state.season,'grey')+'</div><div class="table-wrap"><table class="standings"><thead><tr><th>#</th><th>CLUB</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>PTS</th></tr></thead><tbody>'+sorted.map(function(t,i){return '<tr class="'+(t.name==='Sunday Strikers'?'highlight-row':'')+'"><td>'+(i+1)+'</td><td><div class="league-club">'+club(t.name==='Sunday Strikers'?state.club:t.name,t.name==='Sunday Strikers')+'<b>'+esc(t.name==='Sunday Strikers'?state.club:t.name)+'</b></div></td><td>'+t.played+'</td><td>'+t.won+'</td><td>'+t.drawn+'</td><td>'+t.lost+'</td><td>'+t.gf+'</td><td>'+t.ga+'</td><td><b>'+t.points+'</b></td></tr>';}).join('')+'</tbody></table></div></div>';
  }
  function match(){
    var m=state.match;if(!m)return fixtures();
    var on=starters(m.round),bench=benchPlayers(m.round),selected=on.find(function(p){return p.id===m.targetOffId;});
    var canChange=!m.auto&&m.minute<20;
    var liveBench='<section class="card match-bench" aria-label="Live substitution bench">'+
      '<div class="head"><div><div class="eyebrow">SUBSTITUTION BOARD · '+m.minute+"'"+'</div>'+
      '<h2>Pitch & bench</h2></div>'+badge(bench.length+' ON BENCH','grey')+'</div>'+
      '<p>Select who comes off, then a compatible replacement. Goalkeepers may replace goalkeepers only. Everyone who plays earns a recorded appearance and fatigue depends on actual minutes.</p>'+
      '<div class="match-sub-layout"><div><h3>On the pitch</h3><div class="match-sub-list">'+on.map(function(p){
        var isSelected=m.targetOffId===p.id;
        return '<button class="match-sub-person '+(isSelected?'selected':'')+'" data-action="sub-off" data-player="'+p.id+'"'+(!canChange?' disabled':'')+
          ' aria-pressed="'+isSelected+'"><b>'+esc(p.name)+'</b><small>'+esc(p.pos)+' · '+p.rating+' OVR · '+fitness(p)+'% fit</small><span>'+(!canChange?'ON PITCH':isSelected?'LEAVING PITCH':'CHOOSE OFF')+'</span></button>';
      }).join('')+'</div></div><div><h3>Substitute bench</h3><div class="match-sub-list">'+
      (bench.length?bench.map(function(p){
        var allowed=selected&&(selected.pos==='GK')===(p.pos==='GK');
        return '<button class="match-sub-person '+(allowed?'compatible':'')+'" data-action="sub-on" data-player="'+p.id+
          '"'+(!canChange||!allowed?' disabled':'')+'><b>'+esc(p.name)+'</b><small>'+esc(p.pos)+' · '+p.rating+' OVR · '+fitness(p)+'% fit</small>'+
          '<span>'+(allowed?'SEND ON':'BENCH')+'</span></button>';
      }).join(''):'<p>No eligible substitutes. You must finish with your current five.</p>')+'</div></div></div></section>';
    return '<div class="grid match-centre">'+
      '<div class="card span-all"><div class="match-scoreboard"><div class="home">'+club(state.club,true)+'<span>'+esc(state.club)+'</span></div>'+
      '<div><div class="big-score">'+m.home+' : '+m.away+'</div><div class="minute">'+m.minute+"' / 20'"+(m.auto?' · OFFLINE PLAN':' · LIVE')+'</div></div>'+
      '<div class="away">'+esc(m.opponent)+'</div></div>'+
      '<div class="tactical-match-summary" data-attack-chance="'+(m.lastProbabilities?m.lastProbabilities.attack.toFixed(4):'')+
      '" data-concede-chance="'+(m.lastProbabilities?m.lastProbabilities.concede.toFixed(4):'')+'">'+
      '<span><b>FORMATION</b> '+esc(m.formation||state.formation)+'</span>'+
      '<span><b>CURRENT APPROACH</b> '+esc((TACTIC_PROFILES[m.instruction]||TACTIC_PROFILES.balanced).label)+'</span>'+
      '<span><b>ACTUAL ROLE FIT</b> '+tacticalAssessment(on,m.formation||state.formation,m.roleMap||rolesForTeam(on,m.formation||state.formation)).average+'/100</span>'+
      (m.lastProbabilities?'<span><b>SHOT OPPORTUNITY</b> '+(m.lastProbabilities.attack*100).toFixed(1)+'% / '+
        (m.lastProbabilities.concede*100).toFixed(1)+'% this 2-minute phase</span>':'')+'</div>'+
      '<div class="b07-match-stats" aria-label="Match statistics"><b>Match statistics</b> · Shots '+(m.shotsFor||0)+'–'+(m.shotsAgainst||0)+' · On target '+(m.onTargetFor||0)+'–'+(m.onTargetAgainst||0)+' · Saves '+(m.savesFor||0)+' · Possession '+(m.phases?Math.round(m.possessionSum/m.phases):50)+'%</div>'+ 
      '<div class="actions" style="justify-content:center;margin-top:20px">'+
      (m.auto?'':button('PUSH FORWARD','push','primary',m.minute>=20?'disabled':'')+
        button('HOLD SHAPE','hold','',m.minute>=20?'disabled':'')+
        button('ROTATE SUBSTITUTE','substitute','',m.minute>=20?'disabled':''))+
      button('FINISH MATCH','finish','ghost',m.minute>=20?'':'disabled')+'</div></div>'+
      (!m.auto?'<div class="span-all">'+liveBench+'</div>':'')+
      '<div class="card"><div class="head"><h2>Match commentary</h2>'+badge('LIVE','')+'</div>'+
      '<div class="log" aria-live="polite">'+m.events.slice().reverse().map(function(e){
        return '<div class="logline '+(e.goal?'goal':'')+'"><strong>'+e.minute+"'</strong><span>"+esc(e.text)+'</span></div>';
      }).join('')+'</div></div>'+
      '<div class="card"><div class="head"><h2>Touchline instructions</h2></div>'+
      '<div class="detail-list"><div class="detail-line"><span>Formation</span><b>'+esc(state.formation)+'</b></div>'+
      '<div class="detail-line"><span>Team style</span><b>'+esc(state.style)+'</b></div>'+
      '<div class="detail-line"><span>Current instruction</span><b>'+esc(m.instruction)+'</b></div>'+
      '<div class="detail-line"><span>Average squad rating</span><b>'+Math.round(on.reduce(function(sum,p){return sum+p.rating;},0)/Math.max(1,on.length))+'</b></div></div>'+
      '<p class="fine">B07 seeded match events now drive actual goals, chances, shot totals, goalkeeper saves and player histories. B08 will improve the visual presentation.</p></div></div>';
  }
  function availableTeam(){return players(state.round);}

  // All profile numbers come from the saved player or real simulated appearances.
  function profileSkill(label,value){
    var v=clamp(value,0,100),tier=v>=80?'elite':v>=65?'strong':'';
    return '<div class="profile-skill"><span>'+label+'</span><div class="profile-skill-track"><span style="width:'+v+'%"></span></div><b class="'+tier+'">'+v+'</b></div>';
  }
  function profileSequence(){
    var sorted=squadSorted();
    return sorted.some(function(p){return p.id===state.profileId;})?sorted:roster.slice();
  }
  function comparisonTable(p,other){
    if(!other||other.id===p.id)return '';
    var labels={pace:'Pace',finishing:'Finishing',passing:'Passing',defending:'Defending',keeping:'Goalkeeping',stamina:'Stamina'};
    var a=playerRecord(p),b=playerRecord(other),cells=[
      ['Overall',p.rating,other.rating],['Fitness',fitness(p)+'%',fitness(other)+'%'],
      ['Morale',p.morale+'%',other.morale+'%'],
      ['Appearances',a.appearances,b.appearances],['Goals',a.goals,b.goals],
      ['Clean sheets',a.cleanSheets,b.cleanSheets]
    ].concat(Object.keys(labels).map(function(k){return [labels[k],p.attributes[k],other.attributes[k]];}));
    return '<section class="card player-compare" aria-label="Player comparison">'+
      '<div class="head"><h2>Side-by-side player comparison</h2>'+button('CLEAR COMPARISON','compare-clear','small ghost')+'</div>'+
      '<p class="fine">All numbers reflect current saved records. A higher attribute helps the skills indicated by its role; a higher fitness percentage means less fatigue.</p>'+
      '<div class="player-compare-wrap"><table class="player-compare-table"><thead><tr><th>MEASURE</th><th>'+esc(p.name)+'</th><th>'+esc(other.name)+'</th></tr></thead>'+
      '<tbody>'+cells.map(function(item){
        var v1=parseInt(item[1],10),v2=parseInt(item[2],10);
        return '<tr><th scope="row">'+esc(item[0])+'</th><td class="'+(v1>v2?'compare-better':'')+'">'+esc(item[1])+'</td>'+
          '<td class="'+(v2>v1?'compare-better':'')+'">'+esc(item[2])+'</td></tr>';
      }).join('')+'</tbody></table></div></section>';
  }
  function profileView(){
    var p=roster.find(function(x){return x.id===state.profileId;});
    if(!p)return '<div class="card"><p>This player is no longer registered to your squad.</p>'+button('BACK TO SQUAD','profile-close','primary')+'</div>';
    ensureDetails(p);
    var labels={pace:'Pace',finishing:'Finishing',passing:'Passing',defending:'Defending',keeping:'Goalkeeping',stamina:'Stamina'};
    var keys=Object.keys(labels).sort(function(a,b){return p.attributes[b]-p.attributes[a]||a.localeCompare(b);});
    var role=roleFor(p),stats=playerRecord(p),idx=profileSequence().findIndex(function(x){return x.id===p.id;});
    var sequence=profileSequence(),last=sequence.length-1;
    var progress=Math.min(100,Math.round(100*(p.xp||0)/Math.max(1,70+(p.rating-45)*5)));
    var status=playerStatus(p),tab=state.profileSection||'overview';
    var matches=(state.playerMatchHistory[p.id]||[]).slice().reverse();
    var developments=(state.developmentHistory[p.id]||[]).slice().reverse();
    var other=roster.find(function(x){return x.id===state.profileCompareId&&x.id!==p.id;});
    var totalUpcoming=Math.max(0,6-Math.max(0,state.round));
    var eligibleUpcoming=Array.from({length:totalUpcoming},function(_,i){return state.round+i;})
      .filter(function(i){return i===state.round?matchEligible(p,i):available(p,i);}).length;
    var reportReturn=state.profileReturn==='overview'?'← BACK TO CLUBHOUSE':'← BACK TO SQUAD';
    var hero='<section class="card player-report-hero"><div class="profile-topline">'+button(reportReturn,'profile-close','small ghost')+
      '<div class="actions">'+button('← PREVIOUS','profile-prev','small',idx<=0?'disabled':'')+
      button('NEXT →','profile-next','small',idx<0||idx>=last?'disabled':'')+'</div></div>'+
      '<div class="profile-head"><div class="profile-avatar '+(p.pos==='GK'?'keeper':'')+'">'+esc(p.name.split(' ').map(function(n){return n.charAt(0);}).join(''))+'</div>'+
      '<div class="profile-identity"><div class="eyebrow">FIRST TEAM · PLAYER REPORT</div><h2>'+esc(p.name)+'</h2>'+
      '<p class="profile-role">'+esc(role)+' · '+esc(p.pos)+' · '+p.age+' years old · #'+p.id+'</p>'+
      '<p>'+esc(p.job)+(p.professional?' · Full-time professional':' · Outside commitments')+'</p></div>'+
      '<div class="profile-status"><span class="squad-status '+status.key+'">'+esc(status.label)+'</span></div></div>'+
      '<div class="profile-metrics"><div><small>OVERALL</small><strong>'+p.rating+'</strong></div>'+
      '<div><small>POTENTIAL</small><strong>'+p.potential+'</strong></div>'+
      '<div><small>FITNESS</small><strong>'+fitness(p)+'%</strong></div>'+
      '<div><small>MORALE</small><strong>'+p.morale+'%</strong></div></div>'+
      '<div class="player-report-context"><span>'+esc(status.why)+'</span>'+
      '<span>'+stats.appearances+' recorded appearances · '+stats.goals+' goals</span></div></section>';
    var subtabs=[['overview','Overview'],['attributes','Individual attributes'],['development','Development'],['availability','Fixture availability']];
    var nav='<nav class="profile-tabs" aria-label="Player profile sections">'+subtabs.map(function(v){
      return '<button type="button" aria-current="'+(tab===v[0]?'page':'false')+'" class="'+(tab===v[0]?'active':'')+
        '" data-action="profile-section" data-value="'+v[0]+'">'+v[1]+'</button>';
    }).join('')+'</nav>';
    var compareChoices=roster.filter(function(x){return x.id!==p.id;}).slice().sort(function(a,b){return a.name.localeCompare(b.name);});
    var comparePicker='<div class="profile-compare-picker"><label for="profile-compare-select">COMPARE WITH A TEAMMATE</label>'+
      '<select id="profile-compare-select" aria-label="Compare player with teammate"><option value="">Select another player</option>'+
      compareChoices.map(function(x){return '<option value="'+x.id+'"'+(other&&other.id===x.id?' selected':'')+'>'+
        esc(x.name)+' · '+esc(x.pos)+' · '+x.rating+' OVR</option>';}).join('')+'</select>'+
      (other?'<p class="fine">Comparing with '+esc(other.name)+'. Current figures update after matches and training.</p>':'')+'</div>';
    var body='';
    if(tab==='overview'){
      body='<div class="profile-content-grid"><section class="card"><div class="head"><h2>Player overview</h2>'+badge(esc(role),'grey')+'</div>'+
        '<p>Current playing role: '+esc(role)+'. Skills are saved per footballer and contribute to the match and training simulation.</p>'+
        '<div class="head" style="margin-top:20px"><h3>Strongest skills</h3></div>'+keys.slice(0,3).map(function(k){return profileSkill(labels[k],p.attributes[k]);}).join('')+
        '<div class="head" style="margin-top:22px"><h3>Areas to develop</h3></div>'+keys.slice(-2).reverse().map(function(k){return profileSkill(labels[k],p.attributes[k]);}).join('')+'</section>'+
        '<section class="card"><div class="head"><h2>Career record</h2></div>'+
        '<div class="profile-record"><div><strong>'+stats.appearances+'</strong><small>Appearances</small></div>'+
        '<div><strong>'+stats.goals+'</strong><small>Goals</small></div>'+
        '<div><strong>'+stats.cleanSheets+'</strong><small>Clean sheets</small></div>'+ 
        '<div><strong>'+stats.shots+'</strong><small>Shots</small></div>'+ 
        '<div><strong>'+stats.saves+'</strong><small>Saves</small></div></div>'+
        '<p class="fine">Stats use recorded matches, not assumptions about past saves. Clean sheets count for goalkeepers only.</p>'+
        '<div class="detail-list"><div class="detail-line"><span>Position / role</span><b>'+esc(p.pos)+' · '+esc(role)+'</b></div>'+
        '<div class="detail-line"><span>Age / potential</span><b>'+p.age+' years · '+p.potential+' potential</b></div>'+
        '<div class="detail-line"><span>Employment / education</span><b>'+esc(p.job)+'</b></div>'+
        '<div class="detail-line"><span>Next match</span><b>'+esc(status.label)+' · '+esc(status.why)+'</b></div>'+
        '<div class="detail-line"><span>Eligible remaining fixtures</span><b>'+eligibleUpcoming+' / '+totalUpcoming+'</b></div></div></section>'+
        '<section class="card profile-wide"><div class="head"><h2>Recent match record</h2></div>'+
        (matches.length?matches.slice(0,5).map(function(m){
          return '<div class="profile-history-row"><span>S'+m.season+' · R'+(m.round+1)+' · '+esc(m.opponent)+'</span>'+
            '<strong>'+m.home+'–'+m.away+' · '+m.goals+' goals · '+(m.shots||0)+' shots'+(m.saves?' · '+m.saves+' saves':'')+(m.cleanSheet?' · CLEAN SHEET':'')+'</strong></div>';
        }).join(''):'<p>No individually tracked match entries yet. Future matches will record appearances, goals and clean sheets. Existing career totals remain intact.</p>')+'</section></div>';
    }else if(tab==='attributes'){
      body='<div class="profile-content-grid"><section class="card"><div class="head"><h2>Technical skills</h2></div>'+
        ['finishing','passing','defending','keeping'].map(function(k){return profileSkill(labels[k],p.attributes[k]);}).join('')+
        '<p class="fine">Role-specific attributes affect simulated team strength, while finishing, passing, defending and goalkeeping are developed by training.</p></section>'+
        '<section class="card"><div class="head"><h2>Physical skills</h2></div>'+
        ['pace','stamina'].map(function(k){return profileSkill(labels[k],p.attributes[k]);}).join('')+
        '<div class="head" style="margin-top:26px"><h2>Condition & mindset</h2></div>'+
        profileSkill('Fitness',fitness(p))+profileSkill('Morale',p.morale)+
        '<p class="fine">Fitness drops after appearances and recovers between different league nights. Morale changes with match results.</p></section>'+
        '<section class="card profile-wide"><div class="head"><h2>Skill assessment</h2></div>'+
        '<p>Strongest: <b>'+esc(labels[keys[0]])+' '+p.attributes[keys[0]]+'</b>. Development focus: <b>'+esc(labels[keys[keys.length-1]])+
        ' '+p.attributes[keys[keys.length-1]]+'</b>. These are real saved attributes—not a generated scouting score.</p></section></div>';
    }else if(tab==='development'){
      var sourceEntries=developments.slice(0,7);
      body='<div class="profile-content-grid"><section class="card"><div class="head"><h2>Individual development</h2></div>'+
        '<div class="detail-list"><div class="detail-line"><span>Current ability</span><b>'+p.rating+'</b></div>'+
        '<div class="detail-line"><span>Potential ceiling</span><b>'+p.potential+'</b></div>'+
        '<div class="detail-line"><span>Growth remaining</span><b>'+Math.max(0,p.potential-p.rating)+' rating points</b></div>'+
        '<div class="detail-line"><span>Stored experience</span><b>'+p.xp+' XP</b></div></div>'+
        '<p>Progress towards next rating improvement</p><div class="progress" role="progressbar" aria-label="Experience to next improvement" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"><span style="width:'+progress+'%"></span></div>'+
        '<p class="fine">'+progress+'% progress · Actual matches and training award experience. Once potential is reached, the rating cannot improve further.</p>'+
        button('OPEN TRAINING','go-training','primary')+'</section>'+
        '<section class="card"><div class="head"><h2>Recent progression</h2></div>'+
        (sourceEntries.length?sourceEntries.map(function(e){
          var gain=e.ratingAfter-e.ratingBefore;
          return '<div class="profile-history-row"><span>S'+e.season+' R'+(e.round+1)+' · '+esc(e.source)+'</span>'+
            '<strong>+'+e.xpGained+' XP'+(gain>0?' · +'+gain+' OVR':'')+'</strong></div>';
        }).join(''):'<p>No tracked development sessions yet. Previous career progress is preserved; new match and training improvements will appear here.</p>')+
        '<p class="fine">Progression events are tracked from B04 onwards; older training results cannot be reconstructed accurately.</p></section>'+
        '<section class="card profile-wide"><div class="head"><h2>Development priorities</h2></div>'+
        '<p>Strongest attribute: <b>'+esc(labels[keys[0]])+' ('+p.attributes[keys[0]]+')</b>. Weakest attribute: <b>'+
        esc(labels[keys[keys.length-1]])+' ('+p.attributes[keys[keys.length-1]]+')</b>.</p></section></div>';
    }else{
      var f=fixture();
      body='<div class="profile-content-grid"><section class="card"><div class="head"><h2>Fixture availability</h2>'+
        badge(eligibleUpcoming+' / '+totalUpcoming+' UPCOMING','grey')+'</div>'+
        '<p>'+esc(p.job)+(p.professional?' · Full-time professional':' · Work or study impacts individual fixtures')+'. Below are confirmed eligibility and recorded match outcomes, not an assumed attendance history.</p>'+
        '<div class="player-fixture-timeline">'+matchSlots.map(function(slot,i){
          var finished=i<state.round,statusText=finished?'Fixture complete':
            (i===state.round?matchEligible(p,i):available(p,i))?'Available':
            (i===state.round&&available(p,i)?'Exhausted':reason(p,i));
          var r=state.results[i];
          var note=finished?(r?'Result: '+r.home+'–'+r.away+' vs '+r.opponent:'Played · no recorded score'):
            !available(p,i)&&state.injuries[p.id]>i?'Injury · '+esc(reason(p,i)):
            (i===state.round?matchEligible(p,i):available(p,i))?
              state.offers[i+':'+p.id]?'Attendance confirmed by appearance offer':'Eligible for selection':
              eligibilityReason(p,i);
          return '<div class="player-fixture-row '+(finished?'past':i===state.round?'current':'future')+'">'+
            '<div><strong>ROUND '+(i+1)+'</strong><small>'+slot[0]+' · '+slot[1]+' · NIGHT '+slot[2]+'</small></div>'+
            '<div><span class="squad-status '+(finished?'complete':
            (i===state.round?matchEligible(p,i):available(p,i))?'available':
            state.injuries[p.id]>i?'injured':'unavailable')+'">'+esc(statusText)+'</span>'+
            '<small>'+esc(note)+'</small></div></div>';
        }).join('')+'</div></section>'+
        '<section class="card"><div class="head"><h2>Manager action</h2></div>'+
        '<p><b>'+esc(status.label)+'</b> · '+esc(status.why)+'.</p>'+
        (f&&state.injuries[p.id]>state.round?button('PHYSIO TREATMENT · £40','physio','warning',
          'data-player="'+p.id+'" '+(state.money<40||state.match?'disabled':'') ):
          f&&!available(p,state.round)?button('OFFER £20 TO ATTEND','offer','primary',
          'data-player="'+p.id+'" '+(state.money<20||state.match||fitness(p)<40||state.offerAttempts&&state.offerAttempts[state.season+':'+state.round+':'+p.id]?'disabled':'') ):
          f?button('REVIEW STARTING FIVE','go-tactics','primary'):button('START NEXT SEASON','next-season','primary'))+
        '<p class="fine">Appearance fees are only charged if accepted. Injured footballers cannot play until cleared; guest invites and detailed squad availability are expanded in B05.</p></section></div>';
    }
    var controls='<div class="profile-context-actions">'+comparePicker+
      '<div class="actions">'+button('FIRST TEAM','go-squad','small ghost')+
      button('TACTICS','go-tactics','small ghost')+
      button('TRAINING','go-training','small ghost')+'</div></div>';
    return '<div class="player-report-layout">'+hero+nav+controls+body+
      ((tab==='overview'||tab==='attributes')&&other?comparisonTable(p,other):'')+'</div>';
  }

  function registeredCard(p){
    ensureDetails(p);var a=available(p,state.round),injured=(state.injuries[p.id]||0)>state.round;
    var note=reason(p,state.round);
    return '<div class="player-row"><span class="avatar '+(p.pos==='GK'?'gk':'')+'">'+esc(p.name[0])+'</span><div class="player-main"><b>'+esc(p.name)+(p.professional?' ★':'')+'</b><small>'+p.pos+' · '+esc(p.job)+' · age '+(p.age||22)+' · fitness '+fitness(p)+'% · morale '+p.morale+'% · '+esc(note)+'</small></div><span class="rating">'+p.rating+'</span><div style="text-align:right">'+(a?badge('AVAILABLE',''):injured?badge('INJURED','red'):button('Offer £20','offer','small warning','data-player="'+p.id+'" '+(state.money<20?'disabled':'')))+button('PROFILE','profile-player','small ghost','data-player="'+p.id+'"')+'</div></div>';
  }
  function lineupView(){
    var f=fixture();
    if(!f)return '';
    var selected=starters(state.round),availablePlayers=availableTeam(),bench=benchPlayers(state.round);
    var issues=selectionIssues(),next=fixtureAt(state.round+1);
    var sameNight=next&&next.night===f.night;
    function playerChip(p,slot){
      var chosen=selected.some(function(x){return x.id===p.id;});
      var label=slot==='starter'?'✓ STARTING':slot==='bench'?'SUBSTITUTE':'UNAVAILABLE';
      var fatigue=fitness(p),note=p.id>=100&&p.id<2000?'GUEST · THIS FIXTURE':eligibilityReason(p,state.round);
      return '<button class="selection-player '+(chosen?'selected':'')+
        (fatigue<55?' tired':'')+'" data-action="lineup" data-player="'+p.id+'" aria-pressed="'+chosen+'"'+
        (state.match||slot==='unavailable'?' disabled':'')+'>'+
        '<span class="selection-shirt '+(p.pos==='GK'?'keeper':'')+'">'+esc(p.pos)+'</span>'+
        '<span class="selection-player-info"><b>'+esc(p.name)+'</b><small>'+p.rating+' OVR · '+fatigue+'% fitness · '+esc(note)+'</small></span>'+
        '<span class="selection-label">'+label+'</span></button>';
    }
    var missing=roster.filter(function(p){return !matchEligible(p,state.round);});
    return '<section class="card lineup-manager" aria-label="Match selection and substitutes">'+
      '<div class="head"><div><div class="eyebrow">ROUND '+(state.round+1)+' · '+f.day+' '+f.time+'</div>'+
      '<h2>Pick your starting five</h2></div>'+badge(selected.length+'/5 SELECTED',issues.length?'amber':'')+'</div>'+
      '<p>Select one eligible goalkeeper and four outfield players. Tap a starter to remove them, or tap a bench player to select them. Selecting another goalkeeper swaps your keeper automatically.</p>'+
      '<div class="selection-match-status '+(issues.length?'blocked':'ready')+'" role="status">'+
        (issues.length?'<strong>KICKOFF BLOCKED</strong><ul>'+issues.map(function(msg){return '<li>'+esc(msg)+'</li>';}).join('')+'</ul>':
          '<strong>READY FOR KICKOFF</strong><p>One goalkeeper, four outfield players, '+bench.length+' substitutes available.</p>')+'</div>'+
      (sameNight?'<div class="rotation-warning"><b>MULTI-MATCH NIGHT</b><span>Your next game kicks off at '+next.time+' on the same evening. Players will not recover between these fixtures. Plan for rotation.</span></div>':'')+
      '<div class="selection-layout"><div><div class="selection-subheading"><h3>Starting five</h3><span>'+selected.length+' / 5</span></div>'+
      '<div class="selection-pitch" '+kitVars(state.kit)+'>'+selected.map(function(p){return playerChip(p,'starter');}).join('')+
        (selected.length<5?Array.from({length:5-selected.length},function(){return '<div class="selection-empty">EMPTY STARTING SPOT</div>';}).join(''):'')+'</div></div>'+
      '<div><div class="selection-subheading"><h3>Substitute bench</h3><span>'+bench.length+' eligible</span></div>'+
      '<div class="selection-bench">'+(bench.length?bench.map(function(p){return playerChip(p,'bench');}).join(''):
        '<div class="selection-empty">No eligible substitutes. Check availability or guest options.</div>')+'</div></div></div>'+
      '<div class="selection-actions">'+button('SUGGEST BEST FIT FIVE','auto-pick','primary',state.match?'disabled':'')+
        button('OPEN AVAILABILITY DESK','go-squad','ghost')+button('GO TO KICKOFF','go-fixtures','ghost')+'</div>'+
      (missing.length?'<details class="selection-absent"><summary>Unavailable / exhausted squad members ('+missing.length+')</summary>'+
        missing.map(function(p){return '<div class="selection-unavailable"><b>'+esc(p.name)+'</b><span>'+esc(eligibilityReason(p,state.round))+'</span>'+
          button('REPORT','profile-player','small ghost','data-player="'+p.id+'" data-section="availability"')+'</div>';}).join('')+'</details>':'')+
      '</section>';
  }

  function trainingView(){
    var f=fixture(),key=state.season+':'+state.round,done=!!state.training[key];
    var focus=state.trainingFocus,report=state.trainingReports[key],canTrain=!!f&&!state.match&&!done&&state.money>=12;
    var options=[['passing','Passing & movement','Passing +2, +22 XP before potential cap, -5% fitness'],
      ['finishing','Shooting & finishing','Finishing +2; forwards +30 XP, others +12 XP; -5% fitness'],
      ['defending','Shape & defending','Defending +2 (GK keeping +2); DEF/GK +30 XP; -5% fitness'],
      ['fitness','Fitness & recovery','Stamina +3, +5 XP; restores up to 17% fitness']];
    var choices='<div class="training-focus-options">'+options.map(function(option){
      var active=focus===option[0],selected=active?'selected':'';
      return '<section class="training-focus-card '+selected+'">'+
        '<div class="training-focus-top"><h3>'+esc(option[1])+'</h3>'+badge(option[0]==='fitness'?'RECOVERY':'TECHNICAL','grey')+'</div>'+
        '<p>'+esc(option[2])+'</p><div class="training-focus-actions">'+
        button('VIEW IMPACT','training-preview','small ghost','data-value="'+option[0]+'"')+
        button(done?'SESSION USED':'TRAIN · £12','train','small primary',
          'data-value="'+option[0]+'" '+(!canTrain?'disabled':''))+'</div></section>';
    }).join('')+'</div>';
    var previews=roster.map(function(p){
      var estimate=trainingEstimate(p,focus),skill=estimate.skill.charAt(0).toUpperCase()+estimate.skill.slice(1);
      return '<div class="training-impact-row"><div><b>'+esc(p.name)+'</b><small>'+esc(p.pos)+' · '+p.rating+' / '+p.potential+' potential</small></div>'+
        '<div><small>'+esc(skill)+'</small><strong>'+estimate.from+' → '+estimate.to+'</strong></div>'+
        '<div><small>EXPERIENCE</small><strong>'+ (estimate.xp?'+'+estimate.xp+' XP':'AT POTENTIAL CAP')+'</strong></div>'+
        '<div><small>FITNESS</small><strong>'+estimate.fitnessBefore+' → '+estimate.fitnessAfter+'%</strong></div></div>';
    }).join('');
    var history=Object.keys(state.trainingReports).filter(function(k){return k!==key;}).slice(-3).reverse();
    return '<p class="section-intro">The Training Ground shows exactly which abilities, XP and fitness change before you spend £12. One session per fixture. Sessions have real capped player improvements and may leave the team tired for a same-night match.</p>'+
      '<div class="metrics training-b06-metrics">'+
      '<div class="metric"><small>REGISTERED</small><strong>'+roster.length+' / 12</strong></div>'+
      '<div class="metric"><small>AVG FITNESS</small><strong>'+Math.round(roster.reduce(function(sum,p){return sum+fitness(p);},0)/Math.max(1,roster.length))+'%</strong></div>'+
      '<div class="metric"><small>TRAINING COST</small><strong>£12</strong></div>'+
      '<div class="metric"><small>SESSION</small><strong>'+(done?'DONE':state.match?'IN MATCH':f?'READY':'—')+'</strong></div></div>'+
      (f?'<section class="card training-b06-room"><div class="head"><div><div class="eyebrow">SEASON '+state.season+' · ROUND '+(state.round+1)+'</div><h2>Training focus</h2></div>'+
        badge(done?'SESSION COMPLETE':state.money<12?'INSUFFICIENT FUNDS':'ONE SESSION AVAILABLE',done?'':'grey')+'</div>'+
        '<p>Pick a focus, inspect projected gains below, then pay £12 if eligible. These gains apply to every registered squad member only; temporary guests are excluded. Skill attributes are capped at 99 and overall ability cannot exceed potential.</p>'+
        choices+(done?'<div class="banner success">You have completed this fixture’s training session. The recorded result is below.</div>':
          state.match?'<div class="banner">Training is locked during a match.</div>':
          state.money<12?'<div class="banner">You need £12 in club funds to train. No expenditure is made.</div>':
          '<p class="fine">Technical sessions cost up to 5 fitness points per player. Fitness training restores up to 17 points, capped at 100.</p>')+'</section>':
        '<div class="banner">The season is complete. Begin the next season to schedule more training.</div>')+
      '<section class="card training-b06-impact"><div class="head"><h2>Training impact preview</h2>'+badge(esc(focus.toUpperCase()),'grey')+'</div>'+
      '<p>Changes below are calculated from your saved player stats, injuries and current fatigue. A player at their overall potential limit gains no further XP, although technical skills can still develop to their own cap.</p>'+
      '<div class="training-impact-list">'+previews+'</div></section>'+
      (report?'<section class="card training-b06-report"><div class="head"><h2>Completed session report</h2>'+badge('£12 PAID','grey')+'</div>'+
        '<p>Recorded outcomes from the actual '+esc(report.focus)+' session. Values are saved with your club and will not be replayed by opening this report.</p>'+
        '<div class="training-impact-list">'+report.players.map(function(p){
          return '<div class="training-impact-row"><div><b>'+esc(p.name)+'</b><small>Applied training · '+esc(p.skill)+'</small></div>'+
            '<div><small>SKILL GAIN</small><strong>'+p.skillBefore+' → '+p.skillAfter+'</strong></div>'+
            '<div><small>XP / OVERALL</small><strong>+'+p.xp+' XP · '+p.ratingBefore+' → '+p.ratingAfter+'</strong></div>'+
            '<div><small>FITNESS</small><strong>'+p.fitnessBefore+' → '+p.fitnessAfter+'%</strong></div></div>';
        }).join('')+'</div></section>':'')+
      '<section class="card training-b06-development"><div class="head"><h2>Player development</h2></div>'+
      roster.map(function(p){
        var atCap=p.rating>=p.potential,progress=atCap?100:Math.min(100,Math.round(100*(p.xp||0)/Math.max(1,70+(p.rating-45)*5)));
        return '<div class="training-player"><b>'+esc(p.name)+'</b><span>'+p.rating+' / '+p.potential+
          ' potential · '+(atCap?'POTENTIAL REACHED':progress+'% towards next overall improvement')+
          '</span><div class="progress" role="progressbar" aria-valuenow="'+progress+'" aria-valuemin="0" aria-valuemax="100">'+
          '<span style="width:'+progress+'%"></span></div></div>';
      }).join('')+
      (history.length?'<p class="fine">Recent training: '+history.map(function(k){
        var h=state.trainingReports[k];
        return 'S'+h.season+' R'+(h.round+1)+' '+esc(h.focus);
      }).join(' · ')+'</p>':'')+'</section>';
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
      }).join(''):emptyState('Market cleared','A fresh list of candidates arrives next season.','go-career','VIEW YOUR CAREER'))+'</div>'+
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
      '<div class="card" style="margin-top:16px"><div class="head"><h2>Club identity</h2></div><div class="club-office-mark">'+club(state.club,true)+'<strong>'+esc(state.club)+'</strong></div>'+kitPreview(state.kit,true)+'<p>Change the club name, home shirt design and colours in one saved editor.</p>'+
      '<div class="actions">'+button('EDIT CLUB IDENTITY','edit-club','primary')+'</div></div>';
  }
  function nextSeason(){
    if(fixture()||state.match)return;
    var rank=state.standings.slice().sort(sortTable).findIndex(function(t){return t.name==='Sunday Strikers';})+1;
    var old=state.division,prior=state.season,prize=rank===1?180:rank===2?100:rank===3?65:35;
    var shift=rank<=2?-1:rank>=6?1:0;
    state.division=Math.max(1,Math.min(8,old+shift));
    state.seasonHistory.push({season:prior,division:old,position:rank,points:state.standings.find(function(t){return t.name==='Sunday Strikers';}).points,prize:prize});
    ledger('Season '+prior+' finish prize',prize);
    pushInbox('league','Season '+prior+' review', 'Finished '+(rank===1?'1st':rank===2?'2nd':rank===3?'3rd':rank+'th')+
      ' in Division '+old+'. '+(state.division<old?'Promoted to Division '+state.division+'.':state.division>old?'Relegated to Division '+state.division+'.':'Division '+state.division+' retained.')+
      ' '+money(prize)+' prize.','career');
    state.season++;state.round=0;state.results={};state.offers={};state.offerAttempts={};state.guest={};state.guestAttempts={};state.training={};state.injuries={};
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
    pushInbox('availability','New season availability',roster.filter(function(p){return available(p,0);}).length+
      ' registered players are eligible for round 1 of season '+state.season+'. Work, education and shifts may affect selection.','squad');
    notice('Season '+prior+' finished '+(rank<=2?'with promotion':rank>=6?'in the relegation places':'in mid-table')+'. Division '+state.division+' is ready. '+money(prize)+' prize received.');
  }
  function applySubstitution(off,on){
    var m=state.match;
    if(!m||m.minute>=20||!off||!on)return false;
    if(!m.selectedIds.includes(off.id)||m.selectedIds.includes(on.id)||
       (off.pos==='GK')!==(on.pos==='GK')||!players(m.round).some(function(p){return p.id===on.id;}))return false;
    if(!Array.isArray(m.participantIds))m.participantIds=m.selectedIds.slice();
    if(!m.participantIds.includes(on.id))m.participantIds.push(on.id);
    if(!m.minutes||typeof m.minutes!=='object')m.minutes={};
    if(m.minutes[on.id]==null)m.minutes[on.id]=0;
    m.selectedIds[m.selectedIds.indexOf(off.id)]=on.id;
    if(m.roleMap&&typeof m.roleMap==='object'){
      var assigned=Object.keys(m.roleMap).find(function(key){return m.roleMap[key]===off.id;});
      if(assigned)m.roleMap[assigned]=on.id;
    }
    m.targetOffId=null;
    m.events.push({minute:m.minute,text:'Substitution: '+on.name+' replaces '+off.name+'.'});
    if(!Array.isArray(m.substitutions))m.substitutions=[];
    m.substitutions.push({minute:m.minute,offId:off.id,onId:on.id});
    render();return true;
  }
  function extraAction(action,target){
    var id=Number(target.getAttribute('data-player')),p,fee,f=fixture();
    if(action==='squad-position'){
      var position=target.getAttribute('data-value');
      if(['all','GK','DEF','MID','FWD'].includes(position))state.squadView.position=position;
      render();return true;
    }
    if(action==='squad-clear'){
      state.squadView={position:'all',availability:'all',sort:'rating',group:'position',query:''};
      render();return true;
    }
    if(action==='compare-clear'){state.profileCompareId=null;render();return true;}
    if(action==='inbox-filter'){
      var filter=target.getAttribute('data-value');
      if(filter==='all'||filter==='unread')state.inboxFilter=filter;
      render();return true;
    }
    if(action==='inbox-all-read'){
      state.inbox.forEach(function(m){m.read=true;});render();return true;
    }
    if(action==='inbox-open'||action==='inbox-read'||action==='inbox-dismiss'){
      var entryId=Number(target.getAttribute('data-entry'));
      var entry=state.inbox.find(function(m){return m.id===entryId&&!m.dismissed;});
      if(!entry)return true;
      if(action==='inbox-dismiss'){entry.dismissed=true;render();return true;}
      entry.read=true;
      if(action==='inbox-read'){render();return true;}
      navigate(INBOX_ROUTES.includes(entry.route)?entry.route:'overview','inbox');return true;
    }
    if(action==='back-dashboard'){navigate('overview');return true;}
    if(action==='profile-player'){
      if(!roster.some(function(x){return x.id===id;}))return true;
      state.profileReturn=state.tab==='overview'?'overview':'squad';
      state.homeReturn=state.tab==='overview';
      state.profileId=id;state.profileSection=target.getAttribute('data-section')==='availability'?'availability':'overview';
      state.tab='profile';render();return true;
    }
    if(action==='profile-close'){
      state.tab=state.profileReturn==='overview'?'overview':'squad';
      state.profileId=null;state.profileSection='overview';state.homeReturn=false;state.profileReturn='squad';render();return true;
    }
    if(action==='profile-section'){
      var section=target.getAttribute('data-value');
      if(['overview','attributes','development','availability'].includes(section)){state.profileSection=section;render();}
      return true;
    }
    if(action==='profile-prev'||action==='profile-next'){
      var sequence=profileSequence(),current=sequence.findIndex(function(x){return x.id===state.profileId;});
      var next=current+(action==='profile-next'?1:-1);
      if(next>=0&&next<sequence.length){
        state.profileId=sequence[next].id;
        if(state.profileCompareId===state.profileId)state.profileCompareId=null;
        render();
      }
      return true;
    }
    if(action==='physio'){
      p=roster.find(function(x){return x.id===id;});
      if(!p||state.match||!(state.injuries[id]>state.round)||state.money<40)return true;
      ledger('Physio care: '+p.name,-40);state.injuries[id]=state.round;state.fitness[id]=Math.max(70,fitness(p));
      pushInbox('injury','Player cleared for selection',p.name+' completed physio treatment. Check fixture eligibility.','squad');
      notice(p.name+' completed treatment and is available for selection.');return true;
    }
    if(action==='forfeit'){
      // A manager cannot take a shortcut for an incomplete manual selection when a real five is available.
      if(!canForfeit())return true;
      if(!confirm('Forfeit this match 0–3? You will not receive sponsorship and a £15 admin penalty applies.'))return true;
      state.match={round:state.round,opponent:f.opponent,minute:20,home:0,away:3,instruction:'balanced',auto:true,forfeit:true,selectedIds:[],events:[{minute:20,text:'Fixture forfeited. No eligible team available.'}]};
      finish();return true;
    }
    if(action==='next-season'){nextSeason();return true;}
    if(action==='auto-pick'){
      if(!f||state.match)return true;
      state.lineup=[];state.lineupCustomized=false;
      notice('The best eligible five have been suggested, balancing playing ability with current fitness.');return true;
    }
    if(action==='lineup'){
      if(!f||state.match)return true;
      p=players().find(function(x){return x.id===id;});if(!p)return true;
      if(!state.lineupCustomized||state.lineupRound!==state.round){
        state.lineup=starters(state.round).map(function(x){return x.id;});
        state.lineupCustomized=true;state.lineupRound=state.round;
      }
      if(state.lineup.includes(id))state.lineup=state.lineup.filter(function(x){return x!==id;});
      else if(p.pos==='GK'){
        // A five-a-side team can start only one keeper; swapping keepers is one touch.
        var oldKeeper=state.lineup.find(function(id){return players().some(function(x){return x.id===id&&x.pos==='GK';});});
        if(oldKeeper!=null)state.lineup=state.lineup.map(function(x){return x===oldKeeper?id:x;});
        else if(state.lineup.length<5)state.lineup.unshift(id);
        else{notice('Deselect an outfield starter to make room for the goalkeeper.');return true;}
      }else if(state.lineup.length<5)state.lineup.push(id);
      else{notice('Deselect a starter before adding '+p.name+' to your five.');return true;}
      toast='';render();return true;
    }
    if(action==='training-preview'){
      var preview=target.getAttribute('data-value');
      if(['passing','finishing','defending','fitness'].includes(preview))state.trainingFocus=preview;
      render();return true;
    }
    if(action==='train'){
      if(!f||state.match)return true;var key=state.season+':'+state.round,focus=target.getAttribute('data-value');
      if(state.training[key]||state.money<12)return true;
      if(!['passing','finishing','defending','fitness'].includes(focus))return true;
      ledger('Training: '+focus,-12);state.training[key]=focus;state.trainingFocus=focus;
      var trained=roster.map(function(p){
        var estimate=trainingEstimate(p,focus),priorRating=p.rating;
        p.attributes[estimate.skill]=estimate.to;
        develop(p,estimate.xp,'Training: '+focus);
        state.fitness[p.id]=estimate.fitnessAfter;
        return {id:p.id,name:p.name,skill:estimate.skill,skillBefore:estimate.from,skillAfter:estimate.to,
          xp:estimate.xp,fitnessBefore:estimate.fitnessBefore,fitnessAfter:estimate.fitnessAfter,
          ratingBefore:priorRating,ratingAfter:p.rating};
      });
      state.trainingReports[key]={focus:focus,cost:12,season:state.season,round:state.round,players:trained};
      if(Object.keys(state.trainingReports).length>36)delete state.trainingReports[Object.keys(state.trainingReports)[0]];
      pushInbox('training','Training completed','The squad worked on '+focus+'. Fitness and attributes have been updated.','training');
      notice('Training session completed. Player development and fitness updated.');return true;
    }
    if(action==='sign-guest'){
      var guest=state.formerGuests.find(function(g){return g.id===id;});
      if(!guest||roster.length>=12||state.money<guest.fee)return true;
      var pNew=ensureDetails({id:50000+guest.id,name:guest.name,pos:guest.pos,rating:guest.rating,
        job:jobs[(guest.id+state.season)%jobs.length],age:18+(guest.id%12),
        potential:Math.min(95,guest.rating+8+guest.id%10),professional:false,xp:0,
        available:Array.from({length:6},function(){return Math.random()<.75?1:0;})});
      roster.push(pNew);state.formerGuests=state.formerGuests.filter(function(x){return x.id!==id;});
      ledger('Signed former stand-in: '+guest.name,-guest.fee);
      pushInbox('recruitment','Stand-in joined the squad',guest.name+' has joined your registered squad following their guest appearance.','squad');
      notice(guest.name+' has been registered after impressing as a guest.');return true;
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
      pushInbox('recruitment',young?'Academy promotion confirmed':'New signing confirmed',
        p.name+' ('+p.pos+', '+p.rating+' rating) joined the registered squad. '+roster.length+'/12 provisional places used.','squad');
      notice(p.name+' joined the registered squad.');return true;
    }
    if(action==='release-player'){
      if(roster.length<=5)return true;p=roster.find(function(x){return x.id===id;});if(!p)return true;
      if(!confirm('Release '+p.name+' from your registered squad? This cannot be undone.'))return true;
      roster.splice(roster.indexOf(p),1);state.lineup=state.lineup.filter(function(x){return x!==id;});
      pushInbox('recruitment','Player released',p.name+' left the registered squad. '+roster.length+'/12 provisional places used.','squad');
      notice(p.name+' has left your squad.');return true;
    }
    if(action==='offer'){
      p=roster.find(function(x){return x.id===id;});
      if(!p||!f||state.match||available(p,state.round)||state.money<20||
         state.injuries[id]>state.round||fitness(p)<40)return true;
      var key=state.season+':'+state.round+':'+id;
      if(state.offerAttempts[key]){notice('You have already asked '+p.name+' about this fixture.');return true;}
      if(!confirm('Ask '+p.name+' to change their '+reason(p,state.round).toLowerCase()+
        ' for round '+(state.round+1)+'? An appearance fee of £20 applies only if accepted. One request per player per fixture.'))return true;
      state.offerAttempts[key]=true;
      var odds=/shift|evening/i.test(p.job)?.62:/college|university|student/i.test(p.job)?.54:.75;
      if(Math.random()<odds){
        state.offers[state.round+':'+id]=true;ledger('Appearance fee: '+p.name,-20);
        pushInbox('availability','Appearance offer accepted',p.name+' will attend round '+(state.round+1)+' for a £20 appearance fee.','squad');
        notice(p.name+' accepted the £20 appearance fee and will attend this fixture.');
      }else{
        pushInbox('availability','Player remains unavailable',p.name+' could not change commitments for round '+(state.round+1)+'. No fee was charged.','squad');
        notice(p.name+' could not change their plans, even for an appearance fee. No money was charged.');
      }
      return true;
    }
    if(action==='guest'){
      if(!f||state.match||state.money<15)return true;
      var inviters=roster.filter(function(p){return matchEligible(p,state.round);});
      if(!inviters.length){notice('At least one eligible registered player must invite their friend.');return true;}
      var current=guestsAt(state.round),attempts=guestRequests(state.round);
      if(attempts>=3){notice('All three guest requests for this fixture have been used.');return true;}
      if(!confirm('Ask a registered squad member to bring a stand-in for round '+(state.round+1)+
        '? Up to three requests are allowed per fixture. Arrival is not guaranteed and ability (40–82 OVR) is unknown until arrival. £15 is charged ONLY if a friend arrives. A guest plays this fixture only and is never automatically registered.'))return true;
      var requestKey=state.season+':'+state.round;
      state.guestAttempts[requestKey]=attempts+1;
      var inviter=inviters[attempts%inviters.length];
      if(Math.random()>=.85){
        pushInbox('availability','Guest request unsuccessful',
          inviter.name+' could not find a friend for round '+(state.round+1)+'. No fee was charged. '+(2-attempts)+' requests remain.','squad');
        notice(inviter.name+' could not bring a friend. No fee charged. Try another request if available.');
        return true;
      }
      var friends=['Taylor Clarke','Morgan Price','Riley Scott','Jordan Ellis','Casey Hall','Avery Lewis','Frankie Wood','Jesse Brown'];
      var needsGoalkeeper=!players(state.round).some(function(x){return x.pos==='GK';});
      var guest={id:100+state.round*10+current.length,
        name:friends[(state.round+state.season+attempts)%friends.length],
        pos:needsGoalkeeper?'GK':attempts%2?'DEF':'FWD',
        rating:40+Math.floor(Math.random()*43)};
      current.push(guest);state.guest[state.round]=current;
      ledger('Stand-in introduced by '+inviter.name,-15);
      pushInbox('availability','Stand-in arrived',guest.name+' can play as '+guest.pos+' in round '+(state.round+1)+
        ' only. '+guest.rating+' OVR revealed on arrival; not registered for future fixtures.','squad');
      notice(inviter.name+' introduced '+guest.name+' ('+guest.pos+', '+guest.rating+
        ' OVR). £15 charged. One fixture only; future signing is a separate manager choice.');
      return true;
    }
    if(action==='sub-off'){
      if(!state.match||state.match.minute>=20)return true;
      if(state.match.selectedIds.includes(id))state.match.targetOffId=id;
      render();return true;
    }
    if(action==='sub-on'){
      if(!state.match||state.match.minute>=20)return true;
      var currentTeam=starters(state.match.round),candidate=benchPlayers(state.match.round).find(function(x){return x.id===id;});
      var off=currentTeam.find(function(x){return x.id===state.match.targetOffId;});
      if(!candidate||!off){notice('Choose a player on the pitch first, then select the replacement on the bench.');return true;}
      if((candidate.pos==='GK')!==(off.pos==='GK')){
        notice('A goalkeeper must replace a goalkeeper; choose a matching bench option.');return true;
      }
      applySubstitution(off,candidate);return true;
    }
    if(action==='substitute'){
      if(!state.match||state.match.minute>=20)return true;
      var m=state.match,team=starters(m.round),bench=benchPlayers(m.round);
      var off=team.filter(function(p){return p.pos!=='GK';}).sort(function(a,b){return fitness(a)-fitness(b);})[0];
      var on=bench.filter(function(p){return p.pos!=='GK';}).sort(function(a,b){
        return (b.rating+fitness(b)*.2)-(a.rating+fitness(a)*.2);
      })[0];
      if(!off||!on){notice('No compatible outfield substitute is available. Open the bench panel for a goalkeeper change.');return true;}
      applySubstitution(off,on);return true;
    }
    return false;
  }


  function render(){
    if(typeof document!=='undefined')document.title=(editingClub?'Edit '+state.club+' identity':state.clubCreated?state.club+' · '+pageName(state.tab):'Create your club')+' | 5 Aside Manager';
    if(!state.clubCreated||editingClub){app.innerHTML=creator();return;}
    var body=state.tab==='overview'?overview():state.tab==='squad'?squad():state.tab==='tactics'?tactics():state.tab==='fixtures'?fixtures():state.tab==='league'?league():state.tab==='training'?trainingView():state.tab==='transfers'?transfersView():state.tab==='academy'?academyView():state.tab==='finances'?financesView():state.tab==='career'?careerView():state.tab==='settings'?settingsView():state.tab==='profile'?profileView():match();
    app.innerHTML='<div class="shell fm-shell"><header class="fm-chrome"><div class="fm-header-row"><div class="brand"><div class="brandmark">5A</div><div class="brandcopy"><b>FIVE ASIDE</b><small>MANAGER · ALPHA</small></div></div>'+
      '<div class="fm-header-meta"><div class="fm-header-club">'+club(state.club,true)+'<b>'+esc(state.club)+'</b></div><span class="chip">SEASON '+String(state.season).padStart(2,'0')+'</span><span class="chip highlight">DIVISION '+state.division+'</span></div></div>'+nav()+'</header>'+contextBar()+
      '<main class="main fm-main">'+heading()+(toast?'<div class="banner success" role="status">'+esc(toast)+'</div>':'')+body+
      '<div class="footer-note">5 ASIDE MANAGER · LOCAL ALPHA · <a href="./save-transfer.html">BACK UP SAVE</a> · '+button('SETTINGS','go-settings','small ghost')+'</div></main></div>';
  }
  function notice(msg){toast=msg;render();}
  function updateTable(name,gf,ga){
    var t=state.standings.find(function(x){return x.name===name;});if(!t)return;
    t.played++;t.gf+=gf;t.ga+=ga;if(gf>ga){t.won++;t.points+=3;}else if(gf===ga){t.drawn++;t.points++;}else t.lost++;
  }
  // Stable opponent ability across replays; higher divisions and team identity matter.
  function oppositionRating(name){
    return clamp(59+(8-state.division)*3+(FiveAsideEngine.seed(name)%13)-6,38,94);
  }
  function tick() {
    var m=state.match;
    if(!m||m.minute>=20)return;
    if(!m.minutes||typeof m.minutes!=='object')m.minutes={};
    if(!m.fatigueLoad||typeof m.fatigueLoad!=='object')m.fatigueLoad={};
    if(!Array.isArray(m.tacticTimeline))m.tacticTimeline=[];
    var nextMinute=m.minute+2,team=starters(m.round);
    if(m.auto){
      var expected=nextMinute>=14&&m.home>m.away?m.planAhead:
        nextMinute>=10&&m.home<m.away?m.planBehind:m.plan;
      if(!TACTIC_PROFILES[expected])expected='balanced';
      if(m.instruction!==expected){
        m.tacticTimeline.push({minute:nextMinute,reason:nextMinute>=14&&m.home>m.away?'Protect or extend lead':
          nextMinute>=10&&m.home<m.away?'Trailing after 10 minutes':'Score levelled',
          approach:expected});
        m.instruction=expected;
        m.events.push({minute:nextMinute,type:'instruction',text:'Saved plan: '+TACTIC_PROFILES[expected].label+' activated.'});
      }
    }
    var planProfile=TACTIC_PROFILES[m.instruction]||TACTIC_PROFILES.balanced;
    team.forEach(function(p){
      m.minutes[p.id]=(m.minutes[p.id]||0)+2;
      m.fatigueLoad[p.id]=Math.round(((m.fatigueLoad[p.id]||0)+planProfile.fatigue)*100)/100;
    });
    var formation=m.formation||state.formation,roles=m.roleMap||rolesForTeam(team,formation);
    var forecast=tacticForecast(team,formation,roles,m.instruction);
    var mean=team.reduce(function(total,p){
      ensureDetails(p);
      var slot=formationSlots(formation).find(function(item){return roles[item.key]===p.id;});
      var fit=slot?roleQuality(p,slot):p.rating;
      return total+p.rating+(fit-p.rating)*.28+(p.morale-75)*.08+
        (p.attributes.stamina-65)*.045-(100-fitness(p)+(m.fatigueLoad[p.id]||0))*.12;
    },0)/Math.max(1,team.length);
    var attackChance=chanceRange(forecast.attack+(mean-65)*.0075+(forecast.roleFit-65)*.0018);
    var concedeChance=chanceRange(forecast.concede+(70-mean)*.007+(65-forecast.roleFit)*.0014);
    var context={
      team:team.map(function(p){
        var slot=formationSlots(formation).find(function(item){return roles[item.key]===p.id;});
        return {id:p.id,name:p.name,pos:p.pos,rating:p.rating,morale:p.morale,fitness:fitness(p)-(m.fatigueLoad[p.id]||0),
          attributes:p.attributes,roleType:slot?slot.type:p.pos,roleFit:slot?roleQuality(p,slot):p.rating};
      }),
      keeperId:roles.GK,opponentStrength:m.opponentStrength,
      attackChance:attackChance,concedeChance:concedeChance,approach:m.instruction,
      club:state.club,opponent:m.opponent
    };
    // This is the same pure, seeded transition for watched and offline matches.
    // Rendering speed is not a scoring modifier. No Math.random is used per phase.
    Object.assign(m,FiveAsideEngine.step(m,context));
    m.lastProbabilities={attack:m.lastPhase.attack,concede:m.lastPhase.concede,
      roleFit:forecast.roleFit,approach:m.instruction,minute:m.minute};
    if(m.auto&&m.autoSubPolicy==='rotate'&&m.minute>=12&&m.minute<20&&(m.autoRotations||0)<2){
      var active=starters(m.round).filter(function(p){return p.pos!=='GK';});
      var reserves=benchPlayers(m.round).filter(function(p){return p.pos!=='GK';});
      var remaining=function(p){return fitness(p)-(m.fatigueLoad[p.id]||0);};
      active.sort(function(a,b){return remaining(a)-remaining(b);});
      reserves.sort(function(a,b){return remaining(b)-remaining(a);});
      if(active.length&&reserves.length&&remaining(reserves[0])-remaining(active[0])>=12){
        var off=active[0],on=reserves[0];
        if(applySubstitution(off,on)){
          m.autoRotations=(m.autoRotations||0)+1;
          m.events.push({minute:m.minute,text:'Saved rotation rule: a fresher outfielder takes over.'});
        }
      }
    }
    if(m.minute>=20){
      clearInterval(timer);timer=null;
      m.events.push({minute:20,text:'Full-time whistle. Confirm the result to continue.'});
    }
    render();
  }
  function finish(){
    var m=state.match;if(!m || m.minute<20)return;
    if(!m.forfeit&&!FiveAsideEngine.verify(m)){notice('Match totals did not reconcile. Result not recorded.');return;}
    var f=fixture();
    var metrics={shotsFor:m.shotsFor||0,shotsAgainst:m.shotsAgainst||0,onTargetFor:m.onTargetFor||0,
      onTargetAgainst:m.onTargetAgainst||0,savesFor:m.savesFor||0,savesAgainst:m.savesAgainst||0,
      possession:m.phases?Math.round(m.possessionSum/m.phases):50};
    state.results[f.id]={home:m.home,away:m.away,opponent:f.opponent,metrics:metrics};
    updateTable('Sunday Strikers',m.home,m.away);updateTable(f.opponent,m.away,m.home);
    var others=names.filter(function(n){return n!==f.opponent;});
    var offset=state.round%others.length;
    others=others.slice(offset).concat(others.slice(0,offset));
    for(var i=0;i<2;i++){
      var a=others[i*2],b=others[i*2+1],x=FiveAsideEngine.seed(String(m.seed)+':'+a+':'+i)%4,y=FiveAsideEngine.seed(String(m.seed)+':'+b+':'+i)%4;
      updateTable(a,x,y);updateTable(b,y,x);
    }
    var before=fixtureAt(state.round);
    // B04: appearances belong to everyone who actually took part, not just the five at full time.
    var participants=Array.isArray(m.participantIds)?m.participantIds:
      Array.isArray(m.selectedIds)?m.selectedIds:starters(m.round).map(function(p){return p.id;});
    var played=players(m.round).filter(function(p){return participants.includes(p.id);});
    if(m.forfeit){
      ledger('Fixture forfeit penalty',-15);
    }else{
      state.playerStats=state.playerStats||{};
      var matchGoals={},matchShots={},matchSaves={};
      m.events.forEach(function(event){
        if(event.scorerId!=null)matchGoals[event.scorerId]=(matchGoals[event.scorerId]||0)+1;
        if(event.shooterId!=null)matchShots[event.shooterId]=(matchShots[event.shooterId]||0)+1;
        if(event.keeperId!=null)matchSaves[event.keeperId]=(matchSaves[event.keeperId]||0)+1;
      });
      played.forEach(function(p){
        if(p.id>=100&&p.id<2000)return;
        var rec=state.playerStats[p.id]||(state.playerStats[p.id]={appearances:0,goals:0,cleanSheets:0});
        rec.appearances++;
        rec.goals+=(matchGoals[p.id]||0);
        rec.shots=(rec.shots||0)+(matchShots[p.id]||0);
        rec.saves=(rec.saves||0)+(matchSaves[p.id]||0);
        if(p.pos==='GK'&&m.away===0)rec.cleanSheets++;
        var history=state.playerMatchHistory[p.id]||(state.playerMatchHistory[p.id]=[]);
        history.push({season:state.season,round:state.round,opponent:f.opponent,
          home:m.home,away:m.away,goals:matchGoals[p.id]||0,shots:matchShots[p.id]||0,saves:matchSaves[p.id]||0,
          cleanSheet:p.pos==='GK'&&m.away===0,position:p.pos,
          minutes:m.minutes&&Number.isFinite(m.minutes[p.id])?m.minutes[p.id]:20});
        if(history.length>40)history.splice(0,history.length-40);
      });
      played.forEach(function(p){
        if(p.id>=100 && p.id<2000)return;
        var minutes=m.minutes&&Number.isFinite(m.minutes[p.id])?m.minutes[p.id]:20;
        var fatigueCost=m.fatigueLoad&&Number.isFinite(m.fatigueLoad[p.id])?
          Math.max(2,Math.round(m.fatigueLoad[p.id])):
          Math.max(3,Math.round((state.style==='press'||m.instruction==='press'?20:14)*minutes/20));
        state.fitness[p.id]=Math.max(35,fitness(p)-fatigueCost);
        develop(p,22+(m.home>m.away?8:0),'Match: '+f.opponent);
        p.morale=clamp(p.morale+(m.home>m.away?4:m.home===m.away?1:-3),35,100);
        if(FiveAsideEngine.seed(String(m.seed)+':injury:'+p.id)%1000<25 && !p.professional){
          state.injuries[p.id]=state.round+2;
          pushInbox('injury','Injury report: '+p.name,p.name+' is sidelined after round '+(state.round+1)+'. Review treatment and future availability.','squad');
        }
      });
      ledger('Local match sponsorship: '+m.opponent,state.sponsor);
      var paidProfessionals=roster.filter(function(p){return p.professional;});
      if(paidProfessionals.length)ledger('Professional match wages',-45*paidProfessionals.length);
    }
    if(!m.forfeit){
      // Keep a bounded event ledger: goals, scorers, shots, saves, substitutions, phase totals.
      var reportKey=state.season+':'+state.round;
      state.matchReports[reportKey]={season:state.season,round:state.round,seed:m.seed,
        opponent:m.opponent,home:m.home,away:m.away,metrics:metrics,
        events:m.events.slice(0,60),substitutions:(m.substitutions||[]).slice(0,15),
        selectedIds:(m.participantIds||[]).slice(),version:FiveAsideEngine.version};
      if(Object.keys(state.matchReports).length>30)delete state.matchReports[Object.keys(state.matchReports)[0]];
      var key=state.season+':'+state.round;
      state.tacticalReports[key]={formation:m.formation||state.formation,
        startingPlan:m.plan||state.plan,behind:m.planBehind||state.planBehind,
        ahead:m.planAhead||state.planAhead,live:!m.auto,
        initialRoles:m.initialRoles||{},phases:Array.isArray(m.tacticTimeline)?m.tacticTimeline.slice(0,30):[],
        rotationPolicy:m.autoSubPolicy||'none',
        substitutions:Array.isArray(m.substitutions)?m.substitutions.slice(0,15):[],
        finalApproach:m.instruction,home:m.home,away:m.away};
      if(Object.keys(state.tacticalReports).length>36)delete state.tacticalReports[Object.keys(state.tacticalReports)[0]];
    }
    pushInbox('result',m.forfeit?'Fixture forfeited':'Full-time report',
      state.club+' '+m.home+'–'+m.away+' '+f.opponent+'. '+
      (m.forfeit?'Forfeited with no sponsor payment and a £15 penalty.':
        m.home>m.away?'Three league points secured.':m.home===m.away?'One point gained.':'No league points gained.'),
      'fixtures');
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
    notice('Full-time: '+m.home+'–'+m.away+' against '+f.opponent+'. '+
      (m.forfeit?'No sponsorship paid; £15 penalty.':money(state.sponsor)+' sponsorship paid.'));
    save();
  }
  function start(auto){
    if(!fixture()||state.match)return;
    if(!ready()){notice('You need five available players including a goalkeeper before kickoff.');return;}
    toast='';
    var team=starters(state.round),roleMap=rolesForTeam(team,state.formation);
    var kickoffStyle=auto?state.plan:state.style;
    var matchSeed=FiveAsideEngine.seed('5aside:v1:'+state.season+':'+state.round+':'+fixture().opponent);
    state.match={round:state.round,opponent:fixture().opponent,minute:0,home:0,away:0,
      seed:matchSeed,rngState:matchSeed,opponentStrength:oppositionRating(fixture().opponent),
      shotsFor:0,shotsAgainst:0,onTargetFor:0,onTargetAgainst:0,savesFor:0,savesAgainst:0,phases:0,possessionSum:0,
      instruction:kickoffStyle,formation:state.formation,baseStyle:state.style,
      plan:state.plan,planBehind:state.planBehind,planAhead:state.planAhead,
      autoSubPolicy:auto?state.autoSubPolicy:'none',autoRotations:0,substitutions:[],
      auto:auto,roleMap:Object.assign({},roleMap),initialRoles:Object.assign({},roleMap),
      tacticTimeline:[{minute:0,reason:auto?'Saved absence plan':'Manager live setup',approach:kickoffStyle}],
      selectedIds:team.map(function(p){return p.id;}),minutes:{},fatigueLoad:{},
      events:[{minute:0,text:'Kickoff! '+state.club+' take on '+fixture().opponent+'.'}]};
    state.match.participantIds=state.match.selectedIds.slice();
    state.tab='match';
    if(auto){for(var i=0;i<10;i++)tick();render();}
    else{render();timer=setInterval(function(){tick();},1050);}
  }
  app.addEventListener('change',function(e){
    if(!state.clubCreated||editingClub||!e.target)return;
    var id=e.target.id,value=e.target.value;
    if(typeof id==='string'&&id.indexOf('role-assign-')===0){
      if(state.match||!fixture())return;
      var slotKey=id.slice('role-assign-'.length),slots=formationSlots(state.formation);
      var slot=slots.find(function(x){return x.key===slotKey;});
      var team=starters(state.round),playerId=Number(value),person=team.find(function(p){return p.id===playerId;});
      if(!slot||slot.type==='GK'||!person||person.pos==='GK'||team.length!==5)return;
      var assignments=rolesForTeam(team,state.formation);
      if(Object.keys(assignments).length!==5)return;
      var fromSlot=slots.find(function(x){return assignments[x.key]===person.id;});
      if(!fromSlot||fromSlot.type==='GK')return;
      if(fromSlot.key!==slotKey){
        var displaced=assignments[slotKey];
        assignments[slotKey]=person.id;assignments[fromSlot.key]=displaced;
        state.roleAssignments[state.formation]=assignments;
      }
      render();save();return;
    }
    if(id==='squad-availability'&&['all','available','unavailable','injured'].includes(value))state.squadView.availability=value;
    else if(id==='squad-sort'&&['rating','name','position','fitness','morale','appearances','goals','availability'].includes(value))state.squadView.sort=value;
    else if(id==='squad-group'&&['position','none'].includes(value))state.squadView.group=value;
    else if(id==='profile-compare-select'){
      var target=Number(value);
      state.profileCompareId=Number.isSafeInteger(target)&&target!==state.profileId&&roster.some(function(p){return p.id===target;})?target:null;
    }else return;
    render();save();
  });
  app.addEventListener('input',function(e){
    if(e.target&&e.target.id==='squad-search'&&state.clubCreated&&!editingClub){
      state.squadView.query=String(e.target.value||'').slice(0,60);
      var position=typeof e.target.selectionStart==='number'?e.target.selectionStart:state.squadView.query.length;
      render();save();
      var field=document.getElementById('squad-search');
      if(field&&typeof field.focus==='function'){
        field.focus();
        if(typeof field.setSelectionRange==='function')field.setSelectionRange(position,position);
      }
      return;
    }
    if(e.target && e.target.id==='club-create-name'){
      draftClub.name=e.target.value;creatorError='';
      var normalized=tidyClubName(draftClub.name);
      var title=document.getElementById('kit-club-name');
      if(title)title.textContent=normalized||'YOUR CLUB FC';
      var crest=document.getElementById('kit-club-crest');
      if(crest)crest.innerHTML=clubMark(normalized||'YOUR CLUB FC',draftClub.kit);
      var length=document.getElementById('creator-name-length');
      if(length)length.textContent=String(normalized.length);
    }
  });
  app.addEventListener('click',function(e){
    var target=e.target.closest('button');if(!target)return;
    var creatorAction=target.getAttribute('data-action');
    if(creatorAction==='edit-club'){
      draftClub={name:state.club,kit:normalizeKit(state.kit)};
      creatorError='';creatorStep=1;editingClub=true;render();return;
    }
    if(creatorAction==='cancel-creator'){
      if(state.clubCreated){editingClub=false;creatorError='';creatorStep=1;draftClub={name:state.club,kit:normalizeKit(state.kit)};render();}
      return;
    }
    if(creatorAction==='creator-next'){
      if(creatorStep===1){syncClubDraft();creatorError=identityNameError(draftClub.name);}
      else if(creatorStep===2)creatorError=identityKitError(draftClub.kit);
      if(!creatorError){creatorStep=Math.min(3,creatorStep+1);}
      render();return;
    }
    if(creatorAction==='creator-back'){creatorError='';creatorStep=Math.max(1,creatorStep-1);render();return;}
    if(creatorAction==='creator-name-step'||creatorAction==='creator-kit-step'){
      creatorError='';creatorStep=creatorAction==='creator-name-step'?1:2;render();return;
    }
    if(creatorAction==='kit-pattern'||creatorAction==='kit-primary'||creatorAction==='kit-secondary'){
      if((state.clubCreated&&!editingClub)||creatorStep!==2)return;
      syncClubDraft();
      var choice=target.getAttribute('data-value');
      if(creatorAction==='kit-pattern'&&KIT_PATTERNS.some(function(p){return p[0]===choice;}))draftClub.kit.pattern=choice;
      if(creatorAction==='kit-primary'&&KIT_COLOURS.some(function(c){return c[1]===choice;}))draftClub.kit.primary=choice;
      if(creatorAction==='kit-secondary'&&KIT_COLOURS.some(function(c){return c[1]===choice;}))draftClub.kit.secondary=choice;
      creatorError='';render();return;
    }
    if(creatorAction==='create-club'){
      if((state.clubCreated&&!editingClub)||creatorStep!==3)return;
      syncClubDraft();
      var name=tidyClubName(draftClub.name);
      creatorError=identityNameError(name)||identityKitError(draftClub.kit);
      if(creatorError){creatorStep=identityNameError(name)?1:2;render();return;}
      var newClub=!state.clubCreated;
      state.club=name;state.kit=normalizeKit(draftClub.kit);state.clubCreated=true;state.tab='overview';
      editingClub=false;creatorStep=1;creatorError='';
      draftClub={name:state.club,kit:normalizeKit(state.kit)};
      pushInbox('club',newClub?'Welcome to the league':'Club identity updated',
        newClub?state.club+' has entered Division '+state.division+'. Check your first fixture and player availability.':
          state.club+' will appear with its updated name and kit throughout the competition.','career');
      notice(newClub?'Welcome to '+state.club+'. Your club is ready!':'Your club identity has been updated.');
      save();return;
    }
    if(!state.clubCreated||editingClub)return;
    var tab=target.getAttribute('data-tab');if(tab){navigate(tab);return;}
    var action=target.getAttribute('data-action');if(!action)return;
    if(extraAction(action,target)){save();return;}
    if(action.slice(0,3)==='go-'){navigate(action.slice(3),state.tab==='overview'?'dashboard':null);return;}
    if(action==='offer'){
      var id=Number(target.getAttribute('data-player')),p=roster.find(function(v){return v.id===id;});
      if(!p || available(p,state.round)||state.money<20)return;
      state.money-=20;state.offers[state.round+':'+id]=true;notice(p.name+' accepted a £20 appearance fee for this match.');
    } else if(action==='guest'){
      if(state.guest[state.round]||state.money<15)return;
      var pool=['Taylor Clarke','Morgan Price','Riley Scott','Jordan Ellis','Casey Hall'];
      state.money-=15;state.guest[state.round]={id:100+state.round,name:pool[state.round%pool.length],pos:state.round%2?'DEF':'FWD',rating:44+Math.floor(Math.random()*40)};
      notice('Friend invited! Their ability was revealed when they turned up.');
    } else if(action==='formation'||action==='style'||action==='plan'||action==='planBehind'||action==='planAhead'||action==='autoSubPolicy'){
      var choice=target.getAttribute('data-value');
      if(state.match)return;
      if(action==='formation'&&!['1-2-1','2-1-1','1-1-2'].includes(choice))return;
      if(action==='autoSubPolicy'&&!['none','rotate'].includes(choice))return;
      if(action!=='formation'&&action!=='autoSubPolicy'&&!['balanced','press','counter'].includes(choice))return;
      state[action]=choice;toast='';render();
    } else if(action==='start-live'||action==='start-auto')start(action==='start-auto');
    else if(action==='push'||action==='hold'){
      if(state.match&&!state.match.auto&&state.match.minute<20){
        state.match.instruction=action;
        state.match.tacticTimeline.push({minute:state.match.minute,reason:'Live manager',approach:action});
        state.match.events.push({minute:state.match.minute,text:action==='push'?'Manager instruction: push forward!':'Manager instruction: hold shape.'});
        render();
      }
    } else if(action==='finish')finish();
    else if(action==='reset'){
      if(!confirm('Reset all local prototype progress? This cannot be undone.'))return;
      if(timer)clearInterval(timer);timer=null;state=initial();roster=state.roster;editingClub=false;creatorError='';draftClub={name:'',kit:defaultKit()};creatorStep=1;toast='';render();
    }
    save();
  });
  render();
  // Persist migration defaults for an existing career; never create a save before onboarding.
  if(state.clubCreated)save();
})();