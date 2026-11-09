(function(root,factory){
  'use strict';
  var engine=factory();
  if(typeof module==='object'&&module.exports)module.exports=engine;
  if(root)root.FiveAsideEngine=engine;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  var VERSION=1;
  function cap(value,lo,hi){return Math.max(lo,Math.min(hi,Number(value)||0));}
  function seed(text){
    var h=2166136261,s=String(text);
    for(var i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619);}
    return h>>>0;
  }
  function next(current){
    var value=(Math.imul(current>>>0,1664525)+1013904223)>>>0;
    return {state:value,roll:value/4294967296};
  }
  function step(previous,context){
    if(!previous||!context||!Array.isArray(context.team))throw Error('Invalid match phase');
    if(previous.minute>=20)return Object.assign({},previous,{events:(previous.events||[]).slice()});
    var m=Object.assign({},previous,{events:(previous.events||[]).slice()});
    var rng=Number.isInteger(m.rngState)?m.rngState>>>0:seed(String(m.seed||'fixture'));
    function roll(){var n=next(rng);rng=n.state;return n.roll;}
    function add(e){m.events.push(e);}
    var team=context.team,opp=cap(context.opponentStrength||65,35,95);
    var keeper=team.find(function(p){return p.id===context.keeperId;})||team.find(function(p){return p.pos==='GK';});
    var outfield=team.filter(function(p){return p.pos!=='GK';});
    var average=team.reduce(function(sum,p){return sum+(p.roleFit||p.rating||60)*.45+(p.rating||60)*.55;},0)/Math.max(1,team.length);
    var passing=team.reduce(function(sum,p){return sum+(p.attributes&&p.attributes.passing||60);},0)/Math.max(1,team.length);
    var defending=team.reduce(function(sum,p){return sum+(p.attributes&&p.attributes.defending||60);},0)/Math.max(1,team.length);
    var shift=context.approach==='counter'?-4:context.approach==='balanced'?3:context.approach==='press'?1:context.approach==='push'?-1:2;
    var possession=cap(50+(passing-opp)*.28+(average-opp)*.16+shift,28,72);
    m.possessionSum=(m.possessionSum||0)+possession;
    m.phases=(m.phases||0)+1;
    m.minute=Math.min(20,(m.minute||0)+2);
    ['shotsFor','shotsAgainst','onTargetFor','onTargetAgainst','savesFor','savesAgainst'].forEach(function(key){m[key]=m[key]||0;});
    var forChance=cap(.14+1.6*context.attackChance+(average-opp)*.002, .07,.82);
    var againstChance=cap(.14+1.6*context.concedeChance+(opp-average)*.002, .07,.82);
    function shooter(){
      if(!outfield.length)return null;
      var weights=outfield.map(function(p){
        return Math.max(5,((p.attributes&&p.attributes.finishing)||p.rating||55)-15)*
          (p.roleType==='FWD'?1.35:p.roleType==='MID'?1.05:.75)*
          cap((p.fitness||100)/100,.5,1);
      });
      var sum=weights.reduce(function(a,b){return a+b;},0),pick=roll()*sum;
      for(var i=0;i<outfield.length;i++){pick-=weights[i];if(pick<0)return outfield[i];}
      return outfield[outfield.length-1];
    }
    if(roll()<forChance){
      var player=shooter(),fin=player?(player.attributes&&player.attributes.finishing||player.rating||60):60;
      m.shotsFor++;
      var target=roll()<cap(.44+(fin-65)*.0045,.25,.77);
      var goal=target&&roll()<cap(.40+(fin-65)*.0035-(opp-65)*.005,.14,.67);
      var event={minute:m.minute,side:'home',type:goal?'goal':target?'saved-shot':'miss',
        shooterId:player?player.id:null,onTarget:target,goal:goal};
      if(target)m.onTargetFor++;
      if(goal){
        m.home++;
        event.scorerId=player.id;
        event.text='GOAL! '+player.name+' finishes for '+context.club+'.';
      }else if(target){
        m.savesAgainst++;
        event.text=(player?player.name:'An attacker')+' forces a save from the opposition goalkeeper.';
      }else event.text=(player?player.name:'An attacker')+' fires wide after a passing move.';
      add(event);
    }
    if(roll()<againstChance){
      m.shotsAgainst++;
      var chanceToHit=cap(.45+(opp-defending)*.0025,.3,.72);
      var onTarget=roll()<chanceToHit;
      var keeping=keeper?(keeper.attributes&&keeper.attributes.keeping||keeper.rating||60):50;
      var chanceToScore=cap(.43+(opp-65)*.0035-(keeping-65)*.0055-(defending-65)*.0015,.12,.74);
      var scored=onTarget&&roll()<chanceToScore;
      var awayEvent={minute:m.minute,side:'away',type:scored?'goal':onTarget?'save':'miss',onTarget:onTarget,goal:scored};
      if(onTarget)m.onTargetAgainst++;
      if(scored){
        m.away++;
        awayEvent.text='Goal for '+context.opponent+' after an attacking move.';
      }else if(onTarget){
        m.savesFor++;
        awayEvent.keeperId=keeper?keeper.id:null;
        awayEvent.text=(keeper?keeper.name:'The goalkeeper')+' saves a '+context.opponent+' shot.';
      }else awayEvent.text=context.opponent+' shoot wide under defensive pressure.';
      add(awayEvent);
    }
    if(!m.events.some(function(e){return e.minute===m.minute&&e.type!=='phase';})){
      add({minute:m.minute,type:'phase',text:possession>=50?
        'Patient possession creates space but no clear shot.':
        'Both sides compete for midfield territory.'});
    }
    m.rngState=rng;
    m.lastPhase={minute:m.minute,attack:forChance,concede:againstChance,possession:Math.round(possession)};
    return m;
  }
  function verify(result){
    var events=(result.events||[]),home=events.filter(function(e){return e.goal&&e.side==='home';});
    var away=events.filter(function(e){return e.goal&&e.side==='away';});
    var shots=events.filter(function(e){return e.side==='home'&&e.shooterId!=null;});
    var awayShots=events.filter(function(e){return e.side==='away'&&e.onTarget!==undefined;});
    return home.length===(result.home||0)&&away.length===(result.away||0)&&
      shots.length===(result.shotsFor||0)&&awayShots.length===(result.shotsAgainst||0)&&
      (result.onTargetFor||0)<=(result.shotsFor||0)&&
      (result.onTargetAgainst||0)<=(result.shotsAgainst||0)&&
      (result.savesFor||0)+(result.away||0)===(result.onTargetAgainst||0)&&
      (result.savesAgainst||0)+(result.home||0)===(result.onTargetFor||0)&&
      home.every(function(e){return Number.isSafeInteger(e.scorerId);});
  }
  return Object.freeze({version:VERSION,seed:seed,step:step,verify:verify});
});
