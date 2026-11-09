
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const B07Engine = require("../match-engine.js");

function boot({autoCreate=true,saved=null,random=0.53}={}) {
  const key="five-aside-manager-alpha-v1";
  const storage = new Map(saved?[[key,JSON.stringify(saved)]]:[]);
  const nameInput = {value:"Test Town FC"};
  const previewName = {textContent:""};
  const previewCrest = {innerHTML:""};
  const nameLength = {textContent:""};
  const app = {innerHTML:"", handle:null, inputHandle:null, changeHandle:null,
    addEventListener(event,cb){if(event==="click")this.handle=cb;if(event==="input")this.inputHandle=cb;if(event==="change")this.changeHandle=cb;}};
  let clock;
  const seededMath = Object.create(Math);
  seededMath.random = () => typeof random==='function'?random():random;
  const sandbox = {
    document:{getElementById(name){if(name==="app")return app;if(name==="club-create-name")return nameInput;if(name==="kit-club-name")return previewName;if(name==="kit-club-crest")return previewCrest;if(name==="creator-name-length")return nameLength;return null;}},
    localStorage:{getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,v);}},
    setInterval(fn){clock=fn;return 1;},
    clearInterval(){clock=null;},
    confirm(){return true;},
    Math:seededMath, JSON, String, Object, Array, Number, Date
  };
  vm.runInNewContext(fs.readFileSync("match-engine.js","utf8"),sandbox,{filename:"match-engine.js"});
  vm.runInNewContext(fs.readFileSync("game.js","utf8"),sandbox,{filename:"game.js"});
  const click=(data)=>{
    assert.ok(app.handle,"Click handler installed");
    app.handle({target:{closest(){return {getAttribute(key){return data[key]??null;}};}}});
  };
  if(autoCreate){
    click({"data-action":"creator-next"});
    click({"data-action":"creator-next"});
    click({"data-action":"create-club"});
  }
  return {app,storage,nameInput,previewName,previewCrest,nameLength,click,engine:sandbox.FiveAsideEngine,
    input(value){nameInput.value=value;app.inputHandle({target:{id:"club-create-name",value}});},
    inputField(id,value){app.inputHandle({target:{id,value,selectionStart:value.length}});},
    change(id,value){assert.ok(app.changeHandle,"Change handler installed");app.changeHandle({target:{id,value}});},
    tick(){assert.ok(clock,"Running match clock");clock();}};
}

test("renders clubhouse and squad",()=>{
  const g=boot();
  assert.match(g.app.innerHTML,/The Clubhouse/);
  g.click({"data-tab":"squad"});
  assert.match(g.app.innerHTML,/Squad &amp; Availability|Squad & Availability/);
  assert.match(g.app.innerHTML,/Registered squad/);
});

test("plays an automatic match, saves and advances the season",()=>{
  const g=boot();
  g.click({"data-action":"go-fixtures"});
  assert.match(g.app.innerHTML,/Fixtures &amp; Results|Fixtures & Results/);
  g.click({"data-action":"start-auto"});
  assert.match(g.app.innerHTML,/FINISH MATCH/);
  g.click({"data-action":"finish"});
  assert.match(g.app.innerHTML,/The Clubhouse/);
  assert.ok(g.storage.size>0);
  g.click({"data-action":"go-fixtures"});
  assert.match(g.app.innerHTML,/ROUND 2/);
});

test("runs live touchline instructions and resets",()=>{
  const g=boot();
  g.click({"data-action":"start-live"});
  assert.match(g.app.innerHTML,/The Touchline/);
  g.click({"data-action":"push"});
  for(let i=0;i<10;i++)g.tick();
  assert.match(g.app.innerHTML,/FINISH MATCH/);
  g.click({"data-action":"finish"});
  g.click({"data-action":"reset"});
  assert.match(g.app.innerHTML,/CREATE YOUR CLUB/);
  g.click({"data-action":"creator-next"});
  g.click({"data-action":"creator-next"});
  g.click({"data-action":"create-club"});
  assert.match(g.app.innerHTML,/The Clubhouse/);
  assert.match(g.app.innerHTML,/ROUND 1/);
});


test("all expanded management screens render without an empty view",()=>{
  const g=boot();
  for(const tab of ["squad","tactics","fixtures","training","transfers","academy","finances","league","career"]){
    g.click({"data-tab":tab});
    assert.ok(g.app.innerHTML.length>600,tab+" should render a working screen");
  }
});

test("training costs money, develops attributes, and is limited once per fixture",()=>{
  const g=boot();
  g.click({"data-action":"go-training"});
  g.click({"data-action":"train","data-value":"passing"});
  const first=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(first.training["1:0"],"passing");
  assert.equal(first.money,228);
  assert.ok(first.roster[2].attributes.passing>0);
  g.click({"data-action":"train","data-value":"finishing"});
  assert.equal(JSON.parse(g.storage.get("five-aside-manager-alpha-v1")).money,228);
});

test("a free agent and youth prospect can join the registered squad",()=>{
  const g=boot();
  g.click({"data-action":"go-transfers"});
  let s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  g.click({"data-action":"sign-player","data-player":String(s.market[0].id)});
  s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(s.roster.length,10);
  g.click({"data-action":"go-academy"});
  g.click({"data-action":"promote-youth","data-player":String(s.youth[0].id)});
  assert.equal(JSON.parse(g.storage.get("five-aside-manager-alpha-v1")).roster.length,11);
});

test("missing goalkeepers can be covered by a guest friend",()=>{
  const g=boot();
  for(let round=0;round<2;round++){
    g.click({"data-action":"go-fixtures"});
    g.click({"data-action":"start-auto"});
    g.click({"data-action":"finish"});
  }
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"guest"});
  let state=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(state.guest[2][0].pos,"GK");
  g.click({"data-action":"go-fixtures"});
  g.click({"data-action":"start-auto"});
  assert.match(g.app.innerHTML,/FINISH MATCH/);
});

test("a complete season generates a new division and new schedule",()=>{
  const g=boot();
  g.click({"data-action":"go-fixtures"}); // persist the initial state before reading saved data
  for(let round=0;round<6;round++){
    const before=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
    const keepers=before.roster.filter(p=>p.pos==="GK"&&p.available[round]&&!(before.injuries[p.id]>round));
    if(!keepers.length)g.click({"data-action":"guest"}); // emergency stand-in GK
    g.click({"data-action":"go-fixtures"});
    g.click({"data-action":"start-auto"});
    g.click({"data-action":"finish"});
  }
  let s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(s.round,6);
  assert.equal(Object.keys(s.results).length,6);
  assert.equal(s.financeLog.filter(x=>x.kind.startsWith("Local match sponsorship")).length,6);
  g.click({"data-action":"next-season"});
  s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(s.season,2);
  assert.equal(s.round,0);
  assert.equal(s.seasonHistory.length,1);
  assert.equal(s.market.length>0,true);
});

test("manual lineup and player details work without losing progress",()=>{
  const g=boot();
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"profile-player","data-player":"1"});
  assert.match(g.app.innerHTML,/Individual attributes/);
  assert.match(g.app.innerHTML,/Fixture availability/);
  g.click({"data-action":"go-tactics"});
  g.click({"data-action":"lineup","data-player":"1"});
  assert.equal(JSON.parse(g.storage.get("five-aside-manager-alpha-v1")).lineupCustomized,true);
  g.click({"data-action":"auto-pick"});
  assert.equal(JSON.parse(g.storage.get("five-aside-manager-alpha-v1")).lineupCustomized,false);
});


test("a club without a keeper may forfeit 0-3 instead of becoming stuck",()=>{
  const g=boot();
  for(let i=0;i<2;i++){
    g.click({"data-action":"go-fixtures"});
    g.click({"data-action":"start-auto"});
    g.click({"data-action":"finish"});
  }
  g.click({"data-action":"go-fixtures"});
  g.click({"data-action":"forfeit"});
  const snapshot=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(snapshot.round,3);
  assert.equal(snapshot.results[2].home,0);
  assert.equal(snapshot.results[2].away,3);
  assert.ok(snapshot.financeLog.some(x=>x.kind==="Fixture forfeit penalty"));
});

test("a one-off guest may be scouted and signed but never automatically registered",()=>{
  const g=boot();
  g.click({"data-action":"guest"});
  g.click({"data-action":"start-auto"});
  g.click({"data-action":"finish"});
  let snapshot=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(snapshot.roster.length,9);
  assert.equal(snapshot.formerGuests.length,1);
  const guest=snapshot.formerGuests[0];
  g.click({"data-action":"go-transfers"});
  assert.match(g.app.innerHTML,/Scouted guest players/);
  g.click({"data-action":"sign-guest","data-player":String(guest.id)});
  snapshot=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(snapshot.roster.length,10);
  assert.equal(snapshot.formerGuests.length,0);
  assert.ok(snapshot.roster.some(p=>p.name===guest.name));
});

test("B02 guided onboarding validates name and colours before final confirmation",()=>{
  const g=boot({autoCreate:false});
  assert.match(g.app.innerHTML,/CREATE YOUR CLUB/);
  assert.match(g.app.innerHTML,/STEP 1 OF 3/);
  assert.match(g.app.innerHTML,/Live kit preview/i);
  assert.doesNotMatch(g.app.innerHTML,/The Clubhouse/);
  g.click({"data-action":"go-fixtures"});
  assert.match(g.app.innerHTML,/CREATE YOUR CLUB/);
  g.click({"data-action":"create-club"}); // hidden until confirmation: cannot bypass step 1
  assert.equal(g.storage.size,0);
  g.input("  ");
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/between 3 and 28 characters/);
  assert.equal(g.storage.size,0);
  g.input("Dockside Rovers");
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/belongs to another team/);
  g.input("Harbour Fives FC");
  assert.equal(g.previewName.textContent,"Harbour Fives FC");
  assert.match(g.previewCrest.innerHTML,/club-crest-own/);
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/STEP 2 OF 3/);
  g.click({"data-action":"kit-pattern","data-value":"hoops"});
  g.click({"data-action":"kit-primary","data-value":"#d63c4b"});
  g.click({"data-action":"kit-secondary","data-value":"#d63c4b"});
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/Choose two different kit colours/);
  g.click({"data-action":"kit-secondary","data-value":"#142f4d"});
  assert.match(g.app.innerHTML,/kit-hoops/);
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/STEP 3 OF 3/);
  assert.match(g.app.innerHTML,/Harbour Fives FC/);
  assert.equal(g.storage.size,0);
  g.click({"data-action":"create-club"});
  const state=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(state.clubCreated,true);
  assert.equal(state.club,"Harbour Fives FC");
  assert.equal(state.kit.pattern,"hoops");
  assert.equal(state.kit.primary,"#d63c4b");
  assert.equal(state.kit.secondary,"#142f4d");
  assert.match(g.app.innerHTML,/The Clubhouse/);
});

test("B02 existing team edits preserve progress, can be cancelled and reject identical colours",()=>{
  const g=boot();
  g.click({"data-action":"go-fixtures"});
  const before=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  g.click({"data-action":"go-overview"});
  g.click({"data-action":"edit-club"});
  assert.match(g.app.innerHTML,/YOUR CLUB IDENTITY/);
  g.input("Should Be Cancelled FC");
  g.click({"data-action":"creator-next"});
  g.click({"data-action":"kit-pattern","data-value":"halves"});
  g.click({"data-action":"cancel-creator"});
  let after=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(after.club,before.club);
  assert.deepEqual(after.kit,before.kit);
  g.click({"data-action":"edit-club"});
  g.input("New Club  Athletic");
  g.click({"data-action":"creator-next"});
  g.click({"data-action":"kit-secondary","data-value":"#1d8967"});
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/Choose two different kit colours/);
  g.click({"data-action":"kit-secondary","data-value":"#f4bf52"});
  g.click({"data-action":"creator-next"});
  g.click({"data-action":"create-club"});
  after=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(after.club,"New Club Athletic");
  assert.equal(after.kit.secondary,"#f4bf52");
  assert.equal(after.money,before.money);
  assert.equal(after.round,before.round);
  assert.equal(after.roster.length,before.roster.length);
  assert.equal(after.standings.length,before.standings.length);
  assert.match(g.app.innerHTML,/New Club Athletic/);
});

test("legacy saves skip onboarding and receive a default kit",()=>{
  const g=boot();
  const prior=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  delete prior.clubCreated;
  delete prior.kit;
  const migrated=boot({autoCreate:false,saved:prior});
  assert.match(migrated.app.innerHTML,/The Clubhouse/);
  migrated.click({"data-tab":"tactics"});
  const saved=JSON.parse(migrated.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(saved.clubCreated,true);
  assert.equal(saved.kit.pattern,"stripes");
});

test("manager navigation groups pages and full player reports expose meaningful sections",()=>{
  const g=boot();
  assert.match(g.app.innerHTML,/Main management areas/);
  assert.match(g.app.innerHTML,/Match Day/);
  g.click({"data-tab":"squad"});
  g.click({"data-action":"profile-player","data-player":"3"});
  assert.match(g.app.innerHTML,/PLAYER REPORT/);
  assert.match(g.app.innerHTML,/Individual attributes/);
  assert.match(g.app.innerHTML,/Fixture availability/);
  assert.match(g.app.innerHTML,/Career record/);
  g.click({"data-action":"profile-section","data-value":"attributes"});
  assert.match(g.app.innerHTML,/Technical skills/);
  assert.match(g.app.innerHTML,/Physical skills/);
  g.click({"data-action":"profile-section","data-value":"development"});
  assert.match(g.app.innerHTML,/Individual development/);
  g.click({"data-action":"profile-section","data-value":"availability"});
  assert.match(g.app.innerHTML,/Education commitment|Available|Work/);
  g.click({"data-action":"profile-close"});
  assert.match(g.app.innerHTML,/Registered squad/);
});

test("simulated matches create authentic appearances and scorer statistics",()=>{
  const g=boot();
  g.click({"data-action":"go-fixtures"});
  const before=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  g.click({"data-action":"start-auto"});
  g.click({"data-action":"finish"});
  const after=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  const regular=before.roster.filter(p=>p.available[0]);
  assert.ok(Object.values(after.playerStats).some(s=>s.appearances===1));
  assert.ok(Object.values(after.playerStats).every(s=>s.appearances>=1&&s.goals>=0&&s.cleanSheets>=0));
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"profile-player","data-player":"3"});
  assert.match(g.app.innerHTML,/Appearances/);
});


test("B01 groups all manager windows under reachable navigation and contextual controls",()=>{
  const g=boot();
  const pages=[
    ["overview","The Clubhouse"],
    ["squad","Squad &"],
    ["training","Training Ground"],
    ["academy","Youth Academy"],
    ["tactics","Tactical Setup"],
    ["fixtures","Fixtures &"],
    ["league","League Standings"],
    ["transfers","Transfer Market"],
    ["finances","Club Finances"],
    ["career","Manager Career"],
    ["settings","Settings & Saves"]
  ];
  for(const [page,title] of pages){
    g.click({"data-tab":page});
    assert.ok(g.app.innerHTML.includes(title),"Missing "+title+" in "+page);
    assert.match(g.app.innerHTML,/Main management areas/);
    assert.match(g.app.innerHTML,/aria-label="Current location"/);
    assert.match(g.app.innerHTML,/SAVE TRANSFER/);
    assert.match(g.app.innerHTML,/SAVED ON THIS DEVICE/);
  }
  assert.match(g.app.innerHTML,/EXPORT \/ IMPORT SAVE/);
  assert.match(g.app.innerHTML,/RESET TEST SAVE/);
  g.click({"data-action":"go-career"});
  assert.match(g.app.innerHTML,/Manager Career/);
  g.click({"data-action":"go-settings"});
  assert.match(g.app.innerHTML,/Settings & Saves/);
  const state=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(state.tab,"settings");
});

test("B01 preserves and applies losing and winning pre-match tactical instructions",()=>{
  const g=boot();
  g.click({"data-tab":"tactics"});
  g.click({"data-action":"planBehind","data-value":"counter"});
  g.click({"data-action":"planAhead","data-value":"press"});
  const saved=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(saved.planBehind,"counter");
  assert.equal(saved.planAhead,"press");
  const reloaded=boot({autoCreate:false,saved});
  reloaded.click({"data-tab":"tactics"});
  assert.match(reloaded.app.innerHTML,/Automatic match plan/);
  const again=JSON.parse(reloaded.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(again.planBehind,"counter");
  assert.equal(again.planAhead,"press");
});

test("B01 keeps in-progress match reachable while visiting another section",()=>{
  const g=boot();
  g.click({"data-action":"start-live"});
  assert.match(g.app.innerHTML,/The Touchline/);
  g.click({"data-tab":"squad"});
  assert.match(g.app.innerHTML,/RETURN TO LIVE MATCH/);
  g.click({"data-action":"go-match"});
  assert.match(g.app.innerHTML,/The Touchline/);
  g.tick();
  assert.match(g.app.innerHTML,/LIVE/);
});


test("B02 kit selection covers all five patterns and rejects similar-contrast colours",()=>{
  const g=boot({autoCreate:false});
  g.input("Seafront FC");
  g.click({"data-action":"creator-next"});
  for(const p of ["solid","stripes","hoops","halves","sash"]){
    g.click({"data-action":"kit-pattern","data-value":p});
    assert.match(g.app.innerHTML,new RegExp("kit-"+p));
    assert.match(g.app.innerHTML,new RegExp('data-action="kit-pattern" data-value="'+p+'" aria-pressed="true"'));
  }
  g.click({"data-action":"kit-primary","data-value":"#1d8967"});
  g.click({"data-action":"kit-secondary","data-value":"#d63c4b"});
  // Accept/reject based on measurable contrast, not just two different names.
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/stronger contrast/);
  g.click({"data-action":"kit-primary","data-value":"#142f4d"});
  g.click({"data-action":"kit-secondary","data-value":"#f4f2e9"});
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/STEP 3 OF 3/);
  g.click({"data-action":"create-club"});
  const s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(s.kit.pattern,"sash");
  assert.equal(s.kit.primary,"#142f4d");
  assert.equal(s.kit.secondary,"#f4f2e9");
});

test("B02 club editor handles long and unsafe names while preserving existing career",()=>{
  const g=boot();
  const pre=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  g.click({"data-action":"go-career"});
  g.click({"data-action":"edit-club"});
  g.input('<script>alert("bad")</script>');
  assert.doesNotMatch(g.app.innerHTML,/<script>alert/);
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/between 3 and 28 characters/);
  g.input("South Coast Eagles Football Club");
  g.click({"data-action":"creator-next"});
  assert.match(g.app.innerHTML,/between 3 and 28 characters/);
  g.input("South Coast Eagles");
  g.click({"data-action":"creator-next"});
  g.click({"data-action":"creator-next"});
  g.click({"data-action":"create-club"});
  const after=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(after.club,"South Coast Eagles");
  assert.equal(after.money,pre.money);
  assert.equal(after.season,pre.season);
  assert.equal(after.financeLog.length,pre.financeLog.length);
  assert.match(g.app.innerHTML,/South Coast Eagles/);
  g.click({"data-action":"go-fixtures"});
  assert.match(g.app.innerHTML,/South Coast Eagles/);
  assert.match(g.app.innerHTML,/club-crest-own/);
  g.click({"data-action":"go-league"});
  assert.match(g.app.innerHTML,/league-club/);
  assert.match(g.app.innerHTML,/South Coast Eagles/);
  g.click({"data-action":"start-auto"});
  assert.match(g.app.innerHTML,/club-crest-own/);
  g.click({"data-action":"finish"});
  const post=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(post.club,"South Coast Eagles");
});

test("B02 imported kit and name persist after reload and season change",()=>{
  const g=boot({autoCreate:false});
  g.input("Coastal United");
  g.click({"data-action":"creator-next"});
  g.click({"data-action":"kit-pattern","data-value":"sash"});
  g.click({"data-action":"kit-primary","data-value":"#7452ad"});
  g.click({"data-action":"kit-secondary","data-value":"#f4f2e9"});
  g.click({"data-action":"creator-next"});
  g.click({"data-action":"create-club"});
  const saved=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  const imported=boot({autoCreate:false,saved});
  assert.match(imported.app.innerHTML,/The Clubhouse/);
  assert.match(imported.app.innerHTML,/kit-sash/);
  for(let i=0;i<6;i++){
    imported.click({"data-action":"go-fixtures"});
    const current=JSON.parse(imported.storage.get("five-aside-manager-alpha-v1"));
    const keepers=current.roster.filter(p=>p.pos==="GK"&&p.available[i]&&!(current.injuries[p.id]>i));
    if(!keepers.length)imported.click({"data-action":"guest"});
    imported.click({"data-action":"start-auto"});
    imported.click({"data-action":"finish"});
  }
  imported.click({"data-action":"next-season"});
  const final=JSON.parse(imported.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(final.season,2);
  assert.equal(final.club,"Coastal United");
  assert.equal(final.kit.pattern,"sash");
  assert.equal(final.kit.primary,"#7452ad");
  assert.equal(final.kit.secondary,"#f4f2e9");
  imported.click({"data-action":"go-league"});
  assert.match(imported.app.innerHTML,/Coastal United/);
  assert.match(imported.app.innerHTML,/club-crest-own kit-sash/);
});


test("B03 first fixture dashboard prioritises real decisions and welcome correspondence",()=>{
  const g=boot();
  assert.match(g.app.innerHTML,/Manager priorities/);
  assert.match(g.app.innerHTML,/Manager inbox/);
  assert.match(g.app.innerHTML,/NEXT DECISION/);
  assert.match(g.app.innerHTML,/Fixture diary/);
  assert.match(g.app.innerHTML,/Recent form/);
  const s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(s.round,0);
  assert.ok(s.inbox.length>=1);
  assert.equal(s.inbox[0].kind,"club");
  assert.equal(s.inbox[0].read,false);
  assert.match(g.app.innerHTML,/Welcome to the league/);
  g.click({"data-action":"inbox-open","data-entry":String(s.inbox[0].id)});
  assert.match(g.app.innerHTML,/Manager Career/);
  assert.match(g.app.innerHTML,/BACK TO INBOX/);
  g.click({"data-action":"back-dashboard"});
  assert.match(g.app.innerHTML,/Manager inbox/);
  const changed=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(changed.inbox[0].read,true);
  const reloaded=boot({autoCreate:false,saved:changed});
  assert.match(reloaded.app.innerHTML,/Manager inbox/);
  assert.doesNotMatch(reloaded.app.innerHTML,/Welcome to the league.*unread/);
  assert.equal(JSON.parse(reloaded.storage.get("five-aside-manager-alpha-v1")).inbox.length,1);
});

test("B03 inbox read, dismiss, filters and mark-all survive local reload",()=>{
  const g=boot();
  g.click({"data-action":"go-training"});
  g.click({"data-action":"train","data-value":"passing"});
  let saved=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.ok(saved.inbox.some(m=>m.kind==="training"));
  assert.ok(saved.inbox.some(m=>m.kind==="finance"));
  g.click({"data-action":"go-overview"});
  assert.match(g.app.innerHTML,/Manager inbox/);
  const entry=saved.inbox.find(m=>m.kind==="training");
  g.click({"data-action":"inbox-read","data-entry":String(entry.id)});
  saved=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(saved.inbox.find(m=>m.id===entry.id).read,true);
  g.click({"data-action":"inbox-filter","data-value":"unread"});
  assert.match(g.app.innerHTML,/UNREAD/);
  assert.doesNotMatch(g.app.innerHTML,/Training completed/);
  const finance=saved.inbox.find(m=>m.kind==="finance");
  g.click({"data-action":"inbox-dismiss","data-entry":String(finance.id)});
  saved=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(saved.inbox.find(m=>m.id===finance.id).dismissed,true);
  g.click({"data-action":"inbox-all-read"});
  assert.match(g.app.innerHTML,/You are up to date/);
  saved=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(saved.inbox.filter(m=>!m.read&&!m.dismissed).length,0);
  const again=boot({autoCreate:false,saved});
  assert.match(again.app.innerHTML,/You are up to date/);
  again.click({"data-action":"inbox-filter","data-value":"all"});
  assert.match(again.app.innerHTML,/Training completed/);
  assert.doesNotMatch(again.app.innerHTML,/Club expense recorded/);
});

test("B03 inbox is event-sourced by confirmed recruitment, fees and availability",()=>{
  const g=boot();
  g.click({"data-action":"go-transfers"});
  let initial=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  g.click({"data-action":"sign-player","data-player":String(initial.market[0].id)});
  let s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(s.roster.length,10);
  assert.ok(s.inbox.some(m=>m.kind==="recruitment"&&m.detail.includes("registered squad")));
  assert.ok(s.inbox.some(m=>m.kind==="finance"&&m.detail.includes("Signed:")));
  g.click({"data-action":"go-squad"});
  const absent=s.roster.find(p=>!p.available[0]&&p.pos!=="GK"&&!s.injuries[p.id]);
  assert.ok(absent);
  g.click({"data-action":"offer","data-player":String(absent.id)});
  s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.ok(s.inbox.some(m=>m.kind==="availability"&&m.detail.includes(absent.name)));
  g.click({"data-action":"go-overview"});
  const notice=s.inbox.find(m=>m.kind==="recruitment");
  g.click({"data-action":"inbox-open","data-entry":String(notice.id)});
  assert.match(g.app.innerHTML,/Squad &amp; Availability|Squad & Availability/);
  assert.match(g.app.innerHTML,/BACK TO INBOX/);
  g.click({"data-action":"back-dashboard"});
  assert.match(g.app.innerHTML,/Manager inbox/);
});

test("B03 dashboard handles absent goalkeeper and routes medical task to real player",()=>{
  const base=boot();
  const saved=JSON.parse(base.storage.get("five-aside-manager-alpha-v1"));
  saved.roster.forEach(p=>{p.available[0]=0;});
  saved.injuries={1:2};
  const g=boot({autoCreate:false,saved});
  assert.match(g.app.innerHTML,/A goalkeeper is needed/);
  assert.match(g.app.innerHTML,/player injured/);
  g.click({"data-action":"profile-player","data-player":"1","data-section":"availability"});
  assert.match(g.app.innerHTML,/Fixture availability/);
  assert.match(g.app.innerHTML,/BACK TO CLUBHOUSE/);
  g.click({"data-action":"back-dashboard"});
  assert.match(g.app.innerHTML,/A goalkeeper is needed/);
  g.click({"data-action":"go-squad"});
  assert.match(g.app.innerHTML,/Squad &/);
});

test("B03 live-match and mid-season dashboard priorities show real fixture progress and form",()=>{
  const g=boot();
  g.click({"data-action":"start-live"});
  g.click({"data-tab":"overview"});
  assert.match(g.app.innerHTML,/Match in progress/);
  assert.match(g.app.innerHTML,/RETURN TO MATCH/);
  g.click({"data-action":"go-match"});
  assert.match(g.app.innerHTML,/The Touchline/);
  for(let i=0;i<10;i++)g.tick();
  g.click({"data-action":"finish"});
  assert.match(g.app.innerHTML,/Manager priorities/);
  assert.match(g.app.innerHTML,/LAST RESULT/);
  assert.match(g.app.innerHTML,/form-chip/);
  const s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(s.round,1);
  assert.ok(s.inbox.some(m=>m.kind==="result"&&m.detail.includes("Dockside Rovers")));
  const resumed=boot({autoCreate:false,saved:s});
  assert.match(resumed.app.innerHTML,/ROUND 2/);
  assert.match(resumed.app.innerHTML,/LAST RESULT/);
  assert.ok(JSON.parse(resumed.storage.get("five-aside-manager-alpha-v1")).inbox.some(m=>m.kind==="result"));
});

test("B03 fixture completion and season rollover generate a real league message and new calendar",()=>{
  const base=boot();
  const saved=JSON.parse(base.storage.get("five-aside-manager-alpha-v1"));
  saved.round=6;
  saved.results={0:{home:2,away:1,opponent:"Dockside Rovers"},1:{home:0,away:2,opponent:"Briarwood FC"}};
  const g=boot({autoCreate:false,saved});
  assert.match(g.app.innerHTML,/Your season has finished/);
  assert.match(g.app.innerHTML,/Start the next season/);
  g.click({"data-action":"next-season"});
  const s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(s.season,2);
  assert.equal(s.round,0);
  assert.ok(s.inbox.some(m=>m.kind==="league"&&m.title.includes("Season 1 review")));
  assert.ok(s.inbox.some(m=>m.kind==="availability"&&m.title==="New season availability"));
  assert.ok(s.inbox.some(m=>m.kind==="finance"&&m.detail.includes("finish prize")));
  assert.match(g.app.innerHTML,/ROUND 1/);
  const prior=JSON.stringify(s.inbox);
  const reloaded=boot({autoCreate:false,saved:s});
  assert.equal(JSON.stringify(JSON.parse(reloaded.storage.get("five-aside-manager-alpha-v1")).inbox),prior);
});

test("B03 old/imported saves gain inbox safely without inventing historical messages",()=>{
  const base=boot();
  const legacy=JSON.parse(base.storage.get("five-aside-manager-alpha-v1"));
  delete legacy.inbox;delete legacy.inboxSeq;delete legacy.inboxFilter;delete legacy.inboxReturn;
  legacy.money=417;legacy.round=2;legacy.tab="overview";
  const g=boot({autoCreate:false,saved:legacy});
  assert.match(g.app.innerHTML,/No messages yet/);
  const saved=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(saved.money,417);
  assert.equal(saved.round,2);
  assert.equal(saved.club,legacy.club);
  assert.deepEqual(saved.kit,legacy.kit);
  assert.deepEqual(saved.roster,legacy.roster);
  assert.equal(saved.inbox.length,0);
});

test("B03 injury messages follow genuine seeded match events and medical actions",()=>{
  const initial=boot(),key="five-aside-manager-alpha-v1";
  const template=JSON.parse(initial.storage.get(key));
  let injuredSave;
  for(let season=1;season<=80;season++){
    const saved=JSON.parse(JSON.stringify(template));
    saved.season=season;
    const g=boot({autoCreate:false,saved});
    g.click({"data-action":"start-auto"});
    g.click({"data-action":"finish"});
    const final=JSON.parse(g.storage.get(key));
    if(final.inbox.some(m=>m.kind==="injury")){injuredSave=final;break;}
  }
  assert.ok(injuredSave,"Seeded fixtures can generate injuries");
  assert.ok(injuredSave.inbox.filter(m=>m.kind==="injury").every(m=>m.detail.includes("sidelined")));
  assert.ok(Object.values(injuredSave.injuries).some(round=>round>0));
});

test("B04 grouped squad sorting, position filtering, status and live search are functional",()=>{
  const g=boot();
  g.click({"data-tab":"squad"});
  assert.match(g.app.innerHTML,/Registered squad/);
  assert.match(g.app.innerHTML,/squad-table/);
  assert.match(g.app.innerHTML,/GOALKEEPERS/);
  assert.match(g.app.innerHTML,/DEFENDERS/);
  assert.match(g.app.innerHTML,/MIDFIELDERS/);
  assert.match(g.app.innerHTML,/FORWARDS/);
  g.change("squad-sort","name");
  assert.match(g.app.innerHTML,/option value="name" selected/);
  g.click({"data-action":"squad-position","data-value":"DEF"});
  assert.match(g.app.innerHTML,/DEFENDERS/);
  assert.doesNotMatch(g.app.innerHTML,/GOALKEEPERS/);
  assert.match(g.app.innerHTML,/3 of 9 registered players/);
  g.inputField("squad-search","Lewis");
  assert.match(g.app.innerHTML,/Lewis Carter/);
  assert.doesNotMatch(g.app.innerHTML,/Sam Patel/);
  assert.match(g.app.innerHTML,/1 of 9 registered players/);
  g.change("squad-group","none");
  assert.doesNotMatch(g.app.innerHTML,/class="squad-group-row"/);
  let saved=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(saved.squadView.position,"DEF");
  assert.equal(saved.squadView.query,"Lewis");
  assert.equal(saved.squadView.sort,"name");
  assert.equal(saved.squadView.group,"none");
  const again=boot({autoCreate:false,saved});
  assert.match(again.app.innerHTML,/Registered squad/);
  again.click({"data-tab":"squad"});
  assert.match(again.app.innerHTML,/1 of 9 registered players/);
  again.click({"data-action":"squad-clear"});
  saved=JSON.parse(again.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(saved.squadView.query,"");
  assert.equal(saved.squadView.position,"all");
  assert.match(again.app.innerHTML,/9 of 9 registered players/);
  assert.match(again.app.innerHTML,/GOALKEEPERS/);
});

test("B04 squad eligibility, injury and season-complete filters reflect saved facts",()=>{
  const created=boot();
  const saved=JSON.parse(created.storage.get("five-aside-manager-alpha-v1"));
  saved.injuries[1]=2;
  saved.roster.find(p=>p.id===6).available[0]=0;
  saved.tab="squad";
  const g=boot({autoCreate:false,saved});
  assert.match(g.app.innerHTML,/Injured/);
  assert.match(g.app.innerHTML,/Paramedic/);
  g.change("squad-availability","injured");
  assert.match(g.app.innerHTML,/Jamie Foster/);
  assert.match(g.app.innerHTML,/1 of 9 registered players/);
  assert.doesNotMatch(g.app.innerHTML,/Lewis Carter/);
  g.change("squad-availability","unavailable");
  assert.match(g.app.innerHTML,/Dylan Brooks/);
  assert.doesNotMatch(g.app.innerHTML,/Jamie Foster/);
  g.change("squad-availability","available");
  assert.match(g.app.innerHTML,/Lewis Carter/);
  assert.doesNotMatch(g.app.innerHTML,/Jamie Foster/);
  const data=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  data.round=6;data.tab="squad";data.squadView.availability="all";
  const ended=boot({autoCreate:false,saved:data});
  assert.match(ended.app.innerHTML,/Season 1 is complete/);
  assert.match(ended.app.innerHTML,/Season finished/);
  assert.doesNotMatch(ended.app.innerHTML,/Eligible next match.*9/);
});

test("B04 player comparisons use real statistics and preserve filtered next/previous order",()=>{
  const g=boot();
  g.click({"data-tab":"squad"});
  g.click({"data-action":"squad-position","data-value":"MID"});
  g.click({"data-action":"profile-player","data-player":"3"});
  assert.match(g.app.innerHTML,/Alex Morgan/);
  assert.match(g.app.innerHTML,/PLAYER REPORT/);
  assert.match(g.app.innerHTML,/Career record/);
  assert.match(g.app.innerHTML,/COMPARE WITH A TEAMMATE/);
  g.change("profile-compare-select","9");
  assert.match(g.app.innerHTML,/Side-by-side player comparison/);
  assert.match(g.app.innerHTML,/Finley Hughes/);
  assert.match(g.app.innerHTML,/Appearances/);
  g.click({"data-action":"profile-section","data-value":"attributes"});
  assert.match(g.app.innerHTML,/Technical skills/);
  assert.match(g.app.innerHTML,/Side-by-side player comparison/);
  g.click({"data-action":"profile-next"});
  assert.match(g.app.innerHTML,/Finley Hughes/);
  assert.match(g.app.innerHTML,/Technical skills/);
  g.click({"data-action":"profile-prev"});
  assert.match(g.app.innerHTML,/Alex Morgan/);
  g.click({"data-action":"compare-clear"});
  assert.doesNotMatch(g.app.innerHTML,/Side-by-side player comparison/);
  const saved=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(saved.profileCompareId,null);
  assert.equal(saved.squadView.position,"MID");
  g.click({"data-action":"profile-close"});
  assert.match(g.app.innerHTML,/Registered squad/);
  assert.match(g.app.innerHTML,/3 of 9 registered players/);
});

test("B04 progress and appearance histories follow actual training and match records",()=>{
  const g=boot();
  const key="five-aside-manager-alpha-v1";
  const prior=JSON.parse(g.storage.get(key));
  const player=prior.roster.find(x=>x.id===3);
  g.click({"data-action":"go-training"});
  g.click({"data-action":"train","data-value":"passing"});
  let after=JSON.parse(g.storage.get(key));
  const dev=after.developmentHistory[3];
  assert.equal(dev.length,1);
  assert.equal(dev[0].source,"Training: passing");
  assert.ok(dev[0].xpGained>0);
  assert.equal(dev[0].ratingBefore,player.rating);
  g.click({"data-action":"go-fixtures"});
  g.click({"data-action":"start-auto"});
  g.click({"data-action":"finish"});
  after=JSON.parse(g.storage.get(key));
  const matchHistories=Object.values(after.playerMatchHistory).flat();
  assert.equal(matchHistories.length,5,"one goalkeeper and four outfielders logged");
  const totalRecordedGoals=matchHistories.reduce((total,m)=>total+m.goals,0);
  assert.equal(totalRecordedGoals,after.results[0].home);
  for(const [id,history] of Object.entries(after.playerMatchHistory)){
    const stats=after.playerStats[id];
    assert.equal(stats.appearances,history.length);
    assert.equal(stats.goals,history.reduce((sum,m)=>sum+m.goals,0));
    assert.equal(stats.cleanSheets,history.filter(m=>m.cleanSheet).length);
  }
  assert.ok(after.developmentHistory[3].some(x=>x.source.startsWith("Match:")));
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"profile-player","data-player":"3"});
  assert.match(g.app.innerHTML,/Recent match record/);
  assert.match(g.app.innerHTML,/Appearances/);
  g.click({"data-action":"profile-section","data-value":"development"});
  assert.match(g.app.innerHTML,/Recent progression/);
  assert.match(g.app.innerHTML,/Training: passing/);
  const finishable=JSON.parse(JSON.stringify(after));
  finishable.roster.forEach(p=>{p.available=[1,1,1,1,1,1];});
  const reloaded=boot({autoCreate:false,saved:finishable});
  const same=JSON.parse(reloaded.storage.get(key));
  assert.equal(same.developmentHistory[3].length,after.developmentHistory[3].length);
  assert.equal(same.playerMatchHistory[3].length,after.playerMatchHistory[3].length);
  reloaded.click({"data-action":"go-fixtures"});
  for(let i=1;i<6;i++){
    reloaded.click({"data-action":"start-auto"});
    reloaded.click({"data-action":"finish"});
    reloaded.click({"data-action":"go-fixtures"});
  }
  reloaded.click({"data-action":"next-season"});
  const next=JSON.parse(reloaded.storage.get(key));
  assert.equal(next.season,2);
  assert.ok(next.developmentHistory[3].length>=after.developmentHistory[3].length);
  assert.ok(next.playerMatchHistory[3].length>=after.playerMatchHistory[3].length);
});

test("B04 player availability distinguishes completed rounds from future work conflicts",()=>{
  const g=boot();
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"profile-player","data-player":"3"});
  g.click({"data-action":"profile-section","data-value":"availability"});
  assert.match(g.app.innerHTML,/Fixture availability/);
  assert.match(g.app.innerHTML,/eligible for selection|Eligible for selection/);
  assert.match(g.app.innerHTML,/ROUND 6/);
  g.click({"data-action":"go-fixtures"});
  g.click({"data-action":"start-auto"});
  g.click({"data-action":"finish"});
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"profile-player","data-player":"3"});
  g.click({"data-action":"profile-section","data-value":"availability"});
  assert.match(g.app.innerHTML,/Fixture complete/);
  assert.match(g.app.innerHTML,/Result: /);
  assert.match(g.app.innerHTML,/University student/);
});

test("B04 imported old saves preserve historical statistics without fabricating a match log",()=>{
  const g=boot();
  const old=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  old.playerStats={3:{appearances:7,goals:4,cleanSheets:0}};
  delete old.squadView;delete old.developmentHistory;delete old.playerMatchHistory;delete old.profileCompareId;
  old.money=376;old.round=3;
  const loaded=boot({autoCreate:false,saved:old});
  const upgraded=JSON.parse(loaded.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(upgraded.money,376);
  assert.equal(upgraded.round,3);
  assert.equal(upgraded.playerStats[3].appearances,7);
  assert.equal(upgraded.playerStats[3].goals,4);
  assert.equal(upgraded.developmentHistory[3],undefined);
  assert.equal(upgraded.playerMatchHistory[3],undefined);
  assert.equal(upgraded.squadView.group,"position");
  assert.equal(upgraded.profileCompareId,null);
  assert.equal(JSON.stringify(upgraded.roster),JSON.stringify(old.roster));
  loaded.click({"data-action":"go-squad"});
  loaded.click({"data-action":"profile-player","data-player":"3"});
  assert.match(loaded.app.innerHTML,/Recent match record/);
  assert.match(loaded.app.innerHTML,/7<\/strong><small>Appearances/);
  assert.match(loaded.app.innerHTML,/Future matches will record appearances/);
});


test("B04 player report contextual physio and attendance offers obey existing fees and eligibility",()=>{
  const key="five-aside-manager-alpha-v1";
  const first=boot();
  const save=JSON.parse(first.storage.get(key));
  save.money=240;
  save.injuries={1:2};
  const g=boot({autoCreate:false,saved:save});
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"profile-player","data-player":"1"});
  g.click({"data-action":"profile-section","data-value":"availability"});
  assert.match(g.app.innerHTML,/PHYSIO TREATMENT/);
  g.click({"data-action":"physio","data-player":"1"});
  let after=JSON.parse(g.storage.get(key));
  assert.equal(after.money,200);
  assert.equal(after.injuries[1],0);
  assert.ok(after.inbox.some(m=>m.title==="Player cleared for selection"));
  assert.match(g.app.innerHTML,/Available/);
  g.click({"data-action":"profile-close"});
  g.click({"data-action":"profile-player","data-player":"6"});
  g.click({"data-action":"profile-section","data-value":"availability"});
  assert.match(g.app.innerHTML,/OFFER £20 TO ATTEND/);
  g.click({"data-action":"offer","data-player":"6"});
  after=JSON.parse(g.storage.get(key));
  assert.equal(after.money,180);
  assert.equal(after.offers["0:6"],true);
  assert.equal(after.offerAttempts["1:0:6"],true);
  assert.ok(after.inbox.some(m=>m.title==="Appearance offer accepted"));
  assert.match(g.app.innerHTML,/Available/);
  // A previously accepted offer cannot be purchased twice.
  g.click({"data-action":"offer","data-player":"6"});
  assert.equal(JSON.parse(g.storage.get(key)).money,180);
});


test("B04 substitutions preserve appearances for both outgoing and incoming footballers",()=>{
  const g=boot();
  g.click({"data-action":"start-live"});
  g.click({"data-action":"substitute"});
  assert.match(g.app.innerHTML,/The Touchline/);
  for(let i=0;i<10;i++)g.tick();
  g.click({"data-action":"finish"});
  const data=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  const appeared=Object.entries(data.playerMatchHistory).filter(([id,rows])=>rows.some(r=>r.season===1&&r.round===0));
  assert.equal(appeared.length,6,"Both the player substituted off and the replacement should receive an appearance");
  for(const [id,rows] of appeared){
    assert.equal(data.playerStats[id].appearances,1);
    assert.equal(rows.length,1);
  }
  const goals=appeared.flatMap(([id,rows])=>rows).reduce((sum,r)=>sum+r.goals,0);
  assert.equal(goals,data.results[0].home,"Recorded scorers must match the actual match result after substitutions");
});


test("B05 match preparation shows explicit starting five, bench, keeper and same-night rotation",()=>{
  const g=boot(),k="five-aside-manager-alpha-v1";
  g.click({"data-action":"go-tactics"});
  assert.match(g.app.innerHTML,/Pick your starting five/);
  assert.match(g.app.innerHTML,/READY FOR KICKOFF/);
  assert.match(g.app.innerHTML,/Substitute bench/);
  assert.match(g.app.innerHTML,/MULTI-MATCH NIGHT/);
  assert.match(g.app.innerHTML,/19:40/);
  const selected=(g.app.innerHTML.match(/aria-pressed="true"/g)||[]).length;
  assert.ok(selected>=5);
  const saved=JSON.parse(g.storage.get(k));
  assert.equal(saved.round,0);
  g.click({"data-action":"go-squad"});
  assert.match(g.app.innerHTML,/Fixture availability desk/);
  assert.match(g.app.innerHTML,/BACK-TO-BACK MATCH NIGHT/);
  assert.match(g.app.innerHTML,/Education commitment|Work shift/);
});

test("B05 outfield substitutes cannot replace the required keeper and manual picks validate a full five",()=>{
  const first=boot();
  const k="five-aside-manager-alpha-v1";
  const saved=JSON.parse(first.storage.get(k));
  saved.roster.push({...saved.roster[0],id:88,name:"Backup Keeper",rating:62,available:[1,1,1,1,1,1]});
  saved.tab="tactics";const g=boot({autoCreate:false,saved});
  g.click({"data-action":"lineup","data-player":"88"});
  let s=JSON.parse(g.storage.get(k));
  assert.equal(s.lineup.filter(id=>id===1||id===88).length,1);
  assert.ok(s.lineup.includes(88),"one-tap keeper swap should select replacement");
  assert.ok(!s.lineup.includes(1));
  g.click({"data-action":"lineup","data-player":"88"});
  assert.match(g.app.innerHTML,/KICKOFF BLOCKED/);
  g.click({"data-action":"go-fixtures"});
  assert.match(g.app.innerHTML,/Exactly one goalkeeper/);
  g.click({"data-action":"forfeit"});
  assert.equal(JSON.parse(g.storage.get(k)).round,0,"cannot forfeit merely because a valid keeper was deselected");
  g.click({"data-action":"go-tactics"});
  g.click({"data-action":"auto-pick"});
  assert.match(g.app.innerHTML,/READY FOR KICKOFF/);
  s=JSON.parse(g.storage.get(k));
  assert.equal(s.lineupCustomized,false);
  g.click({"data-action":"go-fixtures"});
  assert.match(g.app.innerHTML,/READY TO PLAY/);
});

test("B05 unavailable keeper and one-off emergency guest resolve an otherwise invalid fixture",()=>{
  const first=boot();
  const k="five-aside-manager-alpha-v1";
  const saved=JSON.parse(first.storage.get(k));
  saved.roster[0].available[0]=0;
  saved.tab="fixtures";
  const g=boot({autoCreate:false,saved});
  assert.match(g.app.innerHTML,/No eligible goalkeeper/);
  g.click({"data-action":"start-auto"});
  assert.equal(JSON.parse(g.storage.get(k)).round,0);
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"guest"});
  let after=JSON.parse(g.storage.get(k));
  assert.equal(after.guest[0][0].pos,"GK");
  assert.equal(after.money,saved.money-15);
  assert.equal(after.guestAttempts["1:0"],1);
  assert.equal(after.roster.length,saved.roster.length);
  g.click({"data-action":"go-fixtures"});
  assert.match(g.app.innerHTML,/READY TO PLAY/);
  g.click({"data-action":"start-auto"});
  g.click({"data-action":"finish"});
  after=JSON.parse(g.storage.get(k));
  assert.equal(after.round,1);
  assert.equal(after.roster.length,saved.roster.length);
  assert.equal(after.formerGuests.length,1);
  assert.equal(after.formerGuests[0].pos,"GK");
});

test("B05 unsuccessful guest arrivals cost nothing, max three requests and legacy guest limits survive",()=>{
  const g=boot({random:0.99}),k="five-aside-manager-alpha-v1";
  const starting=JSON.parse(g.storage.get(k));
  g.click({"data-action":"go-squad"});
  for(let i=0;i<3;i++)g.click({"data-action":"guest"});
  let after=JSON.parse(g.storage.get(k));
  assert.equal(after.money,starting.money);
  assert.equal(after.guestAttempts["1:0"],3);
  assert.equal(after.guest[0],undefined);
  assert.equal(after.inbox.filter(m=>m.title==="Guest request unsuccessful").length,3);
  assert.match(g.app.innerHTML,/Requests used: 3 \/ 3/);
  g.click({"data-action":"guest"});
  after=JSON.parse(g.storage.get(k));
  assert.equal(after.guestAttempts["1:0"],3);
  assert.equal(after.inbox.filter(m=>m.title==="Guest request unsuccessful").length,3);
  const previous=JSON.parse(starting.clubCreated?JSON.stringify(starting):"null");
  previous.guest={0:[
    {id:100,name:"Guest One",pos:"DEF",rating:55},
    {id:101,name:"Guest Two",pos:"FWD",rating:48},
    {id:102,name:"Guest Three",pos:"GK",rating:43}
  ]};
  delete previous.guestAttempts;
  previous.tab="squad";
  const legacy=boot({autoCreate:false,saved:previous});
  assert.match(legacy.app.innerHTML,/Requests used: 3 \/ 3/);
  legacy.click({"data-action":"guest"});
  assert.equal(JSON.parse(legacy.storage.get(k)).guest[0].length,3);
});

test("B05 refused appearance offer is free and never rerollable within a fixture",()=>{
  const g=boot({random:0.99}),k="five-aside-manager-alpha-v1";
  const original=JSON.parse(g.storage.get(k));
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"offer","data-player":"6"});
  let after=JSON.parse(g.storage.get(k));
  assert.equal(after.money,original.money);
  assert.equal(after.offerAttempts["1:0:6"],true);
  assert.equal(after.offers["0:6"],undefined);
  assert.ok(after.inbox.some(m=>m.title==="Player remains unavailable"));
  const count=after.inbox.length;
  g.click({"data-action":"offer","data-player":"6"});
  after=JSON.parse(g.storage.get(k));
  assert.equal(after.inbox.length,count);
  const again=boot({autoCreate:false,saved:after});
  again.click({"data-action":"go-squad"});
  assert.match(again.app.innerHTML,/ALREADY ASKED/);
  again.click({"data-action":"offer","data-player":"6"});
  assert.equal(JSON.parse(again.storage.get(k)).money,original.money);
});

test("B05 accepted appearance offer costs £20 exactly once and clears a work shift",()=>{
  const g=boot(),k="five-aside-manager-alpha-v1";
  const original=JSON.parse(g.storage.get(k));
  g.click({"data-action":"go-squad"});
  g.click({"data-action":"offer","data-player":"6"});
  let after=JSON.parse(g.storage.get(k));
  assert.equal(after.money,original.money-20);
  assert.equal(after.offers["0:6"],true);
  assert.equal(after.offerAttempts["1:0:6"],true);
  assert.ok(after.inbox.some(m=>m.title==="Appearance offer accepted"));
  g.click({"data-action":"offer","data-player":"6"});
  assert.equal(JSON.parse(g.storage.get(k)).money,original.money-20);
  g.click({"data-action":"go-tactics"});
  assert.match(g.app.innerHTML,/Dylan Brooks/);
  assert.match(g.app.innerHTML,/Attendance confirmed by appearance offer|Appearance offer accepted/);
});

test("B05 exhaustion prevents kickoff and a fitness session legitimately restores eligibility",()=>{
  const base=boot(),k="five-aside-manager-alpha-v1";
  const saved=JSON.parse(base.storage.get(k));
  saved.fitness["1"]=35;
  saved.tab="fixtures";
  const g=boot({autoCreate:false,saved});
  assert.match(g.app.innerHTML,/No eligible goalkeeper/);
  g.click({"data-action":"start-auto"});
  assert.equal(JSON.parse(g.storage.get(k)).round,0);
  g.click({"data-action":"go-squad"});
  assert.match(g.app.innerHTML,/Exhausted/);
  assert.match(g.app.innerHTML,/REST REQUIRED/);
  g.click({"data-action":"offer","data-player":"1"});
  assert.equal(JSON.parse(g.storage.get(k)).money,saved.money,"cannot pay an exhausted player into eligibility");
  g.click({"data-action":"go-training"});
  g.click({"data-action":"train","data-value":"fitness"});
  const after=JSON.parse(g.storage.get(k));
  assert.ok(after.fitness["1"]>=40);
  assert.equal(after.money,saved.money-12);
  g.click({"data-action":"go-fixtures"});
  assert.match(g.app.innerHTML,/READY TO PLAY/);
});

test("B05 genuine same-night fatigue does not recover between rounds but recovers across different nights",()=>{
  const g=boot(),k="five-aside-manager-alpha-v1";
  g.click({"data-action":"go-fixtures"});
  g.click({"data-action":"start-auto"});
  g.click({"data-action":"finish"});
  let after=JSON.parse(g.storage.get(k));
  assert.equal(after.round,1);
  assert.equal(after.fitness["1"],86);
  g.click({"data-action":"go-tactics"});
  assert.match(g.app.innerHTML,/ROUND 2/);
  g.click({"data-action":"go-fixtures"});
  g.click({"data-action":"start-auto"});
  g.click({"data-action":"finish"});
  after=JSON.parse(g.storage.get(k));
  assert.equal(after.round,2);
  assert.equal(after.fitness["1"],96,"recovery should happen when moving from Tuesday to Thursday, not between Tuesday games");
});

test("B05 live substitution only allows compatible roles and records actual playing minutes",()=>{
  const first=boot(),k="five-aside-manager-alpha-v1";
  const saved=JSON.parse(first.storage.get(k));
  saved.roster.push({...saved.roster[0],id:88,name:"Reserve Keeper",rating:55,available:[1,1,1,1,1,1]});
  const g=boot({autoCreate:false,saved});
  g.click({"data-action":"go-fixtures"});
  g.click({"data-action":"start-live"});
  assert.match(g.app.innerHTML,/Pitch & bench/);
  for(let i=0;i<3;i++)g.tick();
  g.click({"data-action":"sub-off","data-player":"4"});
  assert.match(g.app.innerHTML,/LEAVING PITCH/);
  g.click({"data-action":"sub-on","data-player":"88"});
  assert.match(g.app.innerHTML,/goalkeeper must replace a goalkeeper/i);
  g.click({"data-action":"sub-on","data-player":"9"});
  assert.match(g.app.innerHTML,/Substitution: Finley Hughes replaces Ollie Wright/);
  for(let i=0;i<7;i++)g.tick();
  g.click({"data-action":"finish"});
  const after=JSON.parse(g.storage.get(k));
  assert.equal(after.round,1);
  assert.equal(after.playerMatchHistory[4][0].minutes,6);
  assert.equal(after.playerMatchHistory[9][0].minutes,14);
  assert.equal(after.playerStats[4].appearances,1);
  assert.equal(after.playerStats[9].appearances,1);
  assert.equal(after.fitness["4"],100-Math.round(14*6/20));
  assert.equal(after.fitness["9"],100-Math.round(14*14/20));
  const total=Object.values(after.playerMatchHistory).reduce((a,h)=>a+h.filter(r=>r.round===0).length,0);
  assert.equal(total,6);
});

test("B05 forfeit is deliberate only when a legitimate eligible team is impossible",()=>{
  const first=boot(),k="five-aside-manager-alpha-v1";
  const saved=JSON.parse(first.storage.get(k));
  saved.roster[0].available[0]=0;
  saved.tab="fixtures";
  const g=boot({autoCreate:false,saved});
  assert.match(g.app.innerHTML,/CONFIRM FORFEIT 0–3/);
  assert.match(g.app.innerHTML,/no sponsor income/i);
  g.click({"data-action":"forfeit"});
  const after=JSON.parse(g.storage.get(k));
  assert.equal(after.round,1);
  assert.equal(after.results[0].home,0);
  assert.equal(after.results[0].away,3);
  assert.equal(after.money,saved.money-15);
  assert.equal(after.financeLog.filter(x=>x.kind.startsWith("Local match sponsorship")).length,0);
  assert.ok(after.inbox.some(m=>m.title==="Fixture forfeited"));
});

test("B05 legacy imports and season reset retain real histories and reset old offers/guest requests",()=>{
  const original=boot(),k="five-aside-manager-alpha-v1";
  const old=JSON.parse(original.storage.get(k));
  delete old.offerAttempts;delete old.guestAttempts;
  old.playerStats[3]={appearances:4,goals:2,cleanSheets:0};
  old.developmentHistory={3:[{season:1,round:0,source:"Training: passing",xpGained:22,ratingBefore:76,ratingAfter:76}]};
  old.round=6;old.tab="overview";
  const g=boot({autoCreate:false,saved:old});
  const migrated=JSON.parse(g.storage.get(k));
  assert.equal(migrated.playerStats[3].appearances,4);
  assert.equal(migrated.developmentHistory[3].length,1);
  assert.deepEqual(migrated.offerAttempts,{});
  assert.deepEqual(migrated.guestAttempts,{});
  g.click({"data-action":"next-season"});
  const after=JSON.parse(g.storage.get(k));
  assert.equal(after.season,2);
  assert.equal(after.round,0);
  assert.equal(after.playerStats[3].appearances,4);
  assert.equal(after.developmentHistory[3].length,1);
  assert.equal(Object.keys(after.offerAttempts).length,0);
  assert.equal(Object.keys(after.guestAttempts).length,0);
});


test("B05 insufficient funds and absence of a registered inviter block guest/fee exploits",()=>{
  const base=boot(),key="five-aside-manager-alpha-v1";
  const saved=JSON.parse(base.storage.get(key));
  saved.money=10;saved.roster[0].available[0]=0;
  const broke=boot({autoCreate:false,saved});
  broke.click({"data-action":"go-squad"});
  assert.match(broke.app.innerHTML,/Insufficient funds: £15 needed/);
  broke.click({"data-action":"guest"});
  broke.click({"data-action":"offer","data-player":"6"});
  let after=JSON.parse(broke.storage.get(key));
  assert.equal(after.money,10);
  assert.equal(after.guestAttempts["1:0"],undefined);
  assert.equal(after.offerAttempts["1:0:6"],undefined);
  const empty=JSON.parse(base.storage.get(key));
  empty.roster.forEach(p=>{p.available[0]=0;});
  const noInviter=boot({autoCreate:false,saved:empty});
  noInviter.click({"data-action":"go-squad"});
  noInviter.click({"data-action":"guest"});
  after=JSON.parse(noInviter.storage.get(key));
  assert.equal(after.money,empty.money);
  assert.equal(after.guestAttempts["1:0"],undefined);
  assert.equal(after.guest[0],undefined);
  noInviter.click({"data-action":"go-fixtures"});
  assert.match(noInviter.app.innerHTML,/No eligible goalkeeper/);
  assert.match(noInviter.app.innerHTML,/Need four eligible outfield players/);
  assert.match(noInviter.app.innerHTML,/CONFIRM FORFEIT 0–3/);
});

test("B05 injured players cannot pay to bypass injury and guest medical restrictions",()=>{
  const original=boot(),key="five-aside-manager-alpha-v1";
  const saved=JSON.parse(original.storage.get(key));
  saved.injuries[6]=2;saved.money=19;
  const g=boot({autoCreate:false,saved});
  g.click({"data-action":"go-squad"});
  assert.match(g.app.innerHTML,/Injured/);
  g.click({"data-action":"offer","data-player":"6"});
  g.click({"data-action":"physio","data-player":"6"});
  const after=JSON.parse(g.storage.get(key));
  assert.equal(after.money,19);
  assert.equal(after.offerAttempts["1:0:6"],undefined);
  assert.equal(after.injuries[6],2);
});


test("B06 each formation has five real pitch assignments with role-specific fit and save-safe matching",()=>{
  const g=boot(),key="five-aside-manager-alpha-v1";
  g.click({"data-action":"go-tactics"});
  for(const [formation,labels] of [
    ["1-2-1",["Defensive anchor","Left support","Right support","Striker"]],
    ["2-1-1",["Left defender","Right defender","Playmaker","Striker"]],
    ["1-1-2",["Defensive anchor","Playmaker","Left attacker","Right attacker"]]
  ]){
    g.click({"data-action":"formation","data-value":formation});
    assert.match(g.app.innerHTML,new RegExp(formation.replace(/-/g,"-")));
    assert.match(g.app.innerHTML,/tactical-pitch/);
    assert.equal((g.app.innerHTML.match(/tactical-pitch-position"/g)||[]).length,5);
    for(const label of labels)assert.match(g.app.innerHTML,new RegExp(label));
    assert.match(g.app.innerHTML,/ROLE MATCHING/);
    assert.match(g.app.innerHTML,/AVG FIT/);
    assert.match(g.app.innerHTML,/ATTACK CHANCE/);
  }
  const saved=JSON.parse(g.storage.get(key));
  assert.equal(saved.formation,"1-1-2");
  assert.equal(saved.lineupCustomized,false);
});

test("B06 manual outfield role swap persists without duplicating players or assigning goalkeeper to attack",()=>{
  const g=boot(),key="five-aside-manager-alpha-v1";
  g.click({"data-action":"go-tactics"});
  const before=JSON.parse(g.storage.get(key));
  const select=(id)=>g.app.innerHTML.match(new RegExp('id="role-assign-'+id+'"[^>]*>([\\s\\S]*?)<\\/select>'))?.[1].match(/<option value="(\d+)" selected/)?.[1];
  const left=Number(select("MID_L")),right=Number(select("MID_R"));
  assert.ok(left&&right&&left!==right);
  g.change("role-assign-MID_L",String(right));
  const after=JSON.parse(g.storage.get(key));
  assert.equal(after.roleAssignments["1-2-1"].MID_L,right);
  assert.equal(after.roleAssignments["1-2-1"].MID_R,left);
  assert.equal(after.roleAssignments["1-2-1"].GK,1);
  assert.equal(new Set(Object.values(after.roleAssignments["1-2-1"])).size,5);
  g.change("role-assign-MID_R","1");
  assert.equal(JSON.parse(g.storage.get(key)).roleAssignments["1-2-1"].MID_R,left);
  const again=boot({autoCreate:false,saved:after});
  again.click({"data-action":"go-tactics"});
  assert.match(again.app.innerHTML,/Right support/);
  assert.equal(JSON.parse(again.storage.get(key)).roleAssignments["1-2-1"].MID_L,right);
  assert.equal(JSON.parse(again.storage.get(key)).roster.length,before.roster.length);
});

test("B06 roles safely re-optimize when the lineup or saved assignment becomes invalid",()=>{
  const g=boot(),key="five-aside-manager-alpha-v1";
  const old=JSON.parse(g.storage.get(key));
  old.roleAssignments={"1-2-1":{GK:3,BACK:3,MID_L:3,MID_R:3,FRONT:3}};
  old.tab="tactics";
  const migrated=boot({autoCreate:false,saved:old});
  assert.match(migrated.app.innerHTML,/Individual roles/);
  assert.match(migrated.app.innerHTML,/AVG FIT/);
  assert.doesNotMatch(migrated.app.innerHTML,/NaN/);
  migrated.click({"data-action":"auto-pick"});
  migrated.click({"data-action":"go-fixtures"});
  migrated.click({"data-action":"start-auto"});
  migrated.click({"data-action":"finish"});
  const report=JSON.parse(migrated.storage.get(key)).tacticalReports["1:0"];
  assert.equal(report.formation,"1-2-1");
  assert.equal(report.initialRoles.GK,1);
  assert.equal(new Set(Object.values(report.initialRoles)).size,5);
});

test("B06 style and formation alter real match attack/defence probabilities",()=>{
  const base=boot(),key="five-aside-manager-alpha-v1";
  const old=JSON.parse(base.storage.get(key));
  function probabilities(style,formation,roles=null){
    const saved=JSON.parse(JSON.stringify(old));
    saved.style=style;saved.formation=formation;
    if(roles)saved.roleAssignments[formation]=roles;
    const g=boot({autoCreate:false,saved});
    g.click({"data-action":"start-live"});
    g.tick();
    const html=g.app.innerHTML;
    const attack=Number(html.match(/data-attack-chance="([0-9.]+)"/)?.[1]);
    const concede=Number(html.match(/data-concede-chance="([0-9.]+)"/)?.[1]);
    assert.ok(attack>0&&concede>0);
    return {attack,concede,html};
  }
  const balanced=probabilities("balanced","1-2-1");
  const press=probabilities("press","1-2-1");
  const counter=probabilities("counter","1-2-1");
  assert.ok(press.attack>balanced.attack);
  assert.ok(press.concede>balanced.concede);
  assert.ok(counter.concede<balanced.concede);
  assert.ok(counter.attack<press.attack);
  const defence=probabilities("balanced","2-1-1");
  const attack=probabilities("balanced","1-1-2");
  assert.ok(defence.concede<balanced.concede);
  assert.ok(attack.attack>balanced.attack);
  assert.match(press.html,/CURRENT APPROACH/);
  assert.match(press.html,/High press/);
});

test("B06 watched match and equal saved offline plan have equal score and fitness from same input",()=>{
  const base=boot(),key="five-aside-manager-alpha-v1";
  const old=JSON.parse(base.storage.get(key));
  old.style="counter";old.plan="counter";
  // Equal instructions give the same seeded result in both viewing modes.
  old.planBehind="counter";old.planAhead="counter";
  old.formation="2-1-1";
  function play(auto){
    const g=boot({autoCreate:false,saved:old,random:0.53});
    g.click({"data-action":auto?"start-auto":"start-live"});
    if(!auto)for(let i=0;i<10;i++)g.tick();
    g.click({"data-action":"finish"});
    return JSON.parse(g.storage.get(key));
  }
  const watched=play(false),offline=play(true);
  assert.deepEqual(watched.results,offline.results);
  assert.deepEqual(watched.fitness,offline.fitness);
  assert.deepEqual(watched.playerStats,offline.playerStats);
  assert.deepEqual(watched.playerMatchHistory,offline.playerMatchHistory);
  assert.equal(offline.tacticalReports["1:0"].formation,"2-1-1");
  assert.equal(offline.tacticalReports["1:0"].startingPlan,"counter");
  assert.equal(watched.tacticalReports["1:0"].finalApproach,"counter");
  assert.equal(offline.tacticalReports["1:0"].finalApproach,"counter");
});

test("B06 seeded offline plans react to real leading and trailing score states",()=>{
  const key="five-aside-manager-alpha-v1",base=boot();
  const template=JSON.parse(base.storage.get(key));
  function scenario(type){
    for(let season=1;season<=120;season++){
      const saved=JSON.parse(JSON.stringify(template));
      saved.season=season;saved.division=type==="trailing"?1:8;
      saved.plan="balanced";saved.planAhead="press";saved.planBehind="counter";
      const g=boot({autoCreate:false,saved});
      g.click({"data-action":"start-auto"});
      g.click({"data-action":"finish"});
      const final=JSON.parse(g.storage.get(key));
      const report=final.tacticalReports[season+":0"];
      if(report&&report.phases.some(p=>p.reason===(type==="trailing"?"Trailing after 10 minutes":"Protect or extend lead")&&
          p.approach===(type==="trailing"?"counter":"press")))return {g,final,report};
    }
    return null;
  }
  const leading=scenario("leading"),trailing=scenario("trailing");
  assert.ok(leading,"At least one seeded fixture should lead from minute 14");
  assert.ok(trailing,"At least one seeded fixture should trail from minute 10");
  assert.equal(leading.report.live,false);
  assert.equal(trailing.report.live,false);
  assert.equal(leading.report.startingPlan,"balanced");
  assert.ok(leading.report.phases.some(p=>p.minute>=14&&p.approach==="press"));
  assert.ok(trailing.report.phases.some(p=>p.minute>=10&&p.approach==="counter"));
  assert.ok(leading.final.matchReports[leading.final.season+":0"]);
  const reloaded=boot({autoCreate:false,saved:leading.final});
  reloaded.click({"data-action":"go-tactics"});
  assert.match(reloaded.app.innerHTML,/Previous match tactical report/);
  const live=boot({autoCreate:false,saved:template});
  live.click({"data-action":"start-live"});
  live.click({"data-action":"push"});
  live.tick();
  assert.match(live.app.innerHTML,/Push forward/);
  for(let i=1;i<10;i++)live.tick();
  live.click({"data-action":"finish"});
  const liveReport=JSON.parse(live.storage.get(key)).tacticalReports["1:0"];
  assert.equal(liveReport.live,true);
  assert.equal(liveReport.finalApproach,"push");
  assert.ok(liveReport.phases.some(x=>x.reason==="Live manager"&&x.approach==="push"));
});

test("B06 pressing changes actual recorded fatigue while saved player histories remain intact",()=>{
  const base=boot(),key="five-aside-manager-alpha-v1",saved=JSON.parse(base.storage.get(key));
  function play(style){
    const old=JSON.parse(JSON.stringify(saved));
    old.plan=style;old.style=style;
    const g=boot({autoCreate:false,saved:old,random:0.53});
    g.click({"data-action":"start-auto"});
    g.click({"data-action":"finish"});
    return JSON.parse(g.storage.get(key));
  }
  const balanced=play("balanced"),press=play("press"),counter=play("counter");
  assert.ok(press.fitness[1]<balanced.fitness[1]);
  assert.ok(counter.fitness[1]>balanced.fitness[1]);
  assert.equal(press.playerStats[1].appearances,1);
  assert.equal(counter.playerMatchHistory[1][0].minutes,20);
  assert.deepEqual(press.roster.map(p=>p.id),balanced.roster.map(p=>p.id));
});

test("B06 training impact previews are actual per-player forecasts, not financial transactions",()=>{
  const g=boot(),key="five-aside-manager-alpha-v1";
  g.click({"data-action":"go-training"});
  assert.match(g.app.innerHTML,/Training impact preview/);
  assert.match(g.app.innerHTML,/Passing \+2/);
  const old=JSON.parse(g.storage.get(key));
  g.click({"data-action":"training-preview","data-value":"finishing"});
  const after=JSON.parse(g.storage.get(key));
  assert.equal(after.trainingFocus,"finishing");
  assert.equal(after.money,old.money);
  assert.equal(after.roster[3].attributes.finishing,old.roster[3].attributes.finishing);
  assert.match(g.app.innerHTML,/\+30 XP/);
  assert.match(g.app.innerHTML,/FITNESS/);
  const reloaded=boot({autoCreate:false,saved:after});
  reloaded.click({"data-action":"go-training"});
  assert.match(reloaded.app.innerHTML,/FINISHING/);
  assert.match(reloaded.app.innerHTML,/Training impact preview/);
});

test("B06 training session applies the preview to real saved stats once and stores a complete review",()=>{
  const g=boot(),key="five-aside-manager-alpha-v1";
  g.click({"data-action":"go-training"});
  const before=JSON.parse(g.storage.get(key));
  g.click({"data-action":"train","data-value":"defending"});
  const after=JSON.parse(g.storage.get(key));
  assert.equal(after.money,before.money-12);
  assert.equal(after.training["1:0"],"defending");
  assert.equal(after.trainingReports["1:0"].cost,12);
  assert.equal(after.trainingReports["1:0"].players.length,before.roster.length);
  for(let i=0;i<before.roster.length;i++){
    const prior=before.roster[i],now=after.roster[i],log=after.trainingReports["1:0"].players[i];
    const skill=prior.pos==="GK"?"keeping":"defending";
    assert.equal(log.skill,skill);
    assert.equal(now.attributes[skill],Math.min(99,prior.attributes[skill]+2));
    assert.equal(log.skillBefore,prior.attributes[skill]);
    assert.equal(log.skillAfter,now.attributes[skill]);
    assert.equal(now.attributes.passing,prior.attributes.passing);
    assert.equal(log.xp,prior.pos==="DEF"||prior.pos==="GK"?30:12);
    assert.equal(log.fitnessAfter,Math.max(45,log.fitnessBefore-5));
    assert.ok((after.developmentHistory[prior.id]||[]).some(e=>e.source==="Training: defending"));
  }
  assert.match(g.app.innerHTML,/Completed session report/);
  g.click({"data-action":"train","data-value":"fitness"});
  assert.equal(JSON.parse(g.storage.get(key)).money,before.money-12);
  const again=boot({autoCreate:false,saved:after});
  again.click({"data-action":"go-training"});
  assert.match(again.app.innerHTML,/Completed session report/);
  assert.equal(JSON.parse(again.storage.get(key)).trainingReports["1:0"].players.length,9);
});

test("B06 recovery training restores current fitness without exceeding 100 or providing a free second session",()=>{
  const base=boot(),key="five-aside-manager-alpha-v1",old=JSON.parse(base.storage.get(key));
  old.fitness={1:84,3:99,4:35};
  const g=boot({autoCreate:false,saved:old});
  g.click({"data-action":"go-training"});
  g.click({"data-action":"train","data-value":"fitness"});
  const after=JSON.parse(g.storage.get(key));
  assert.equal(after.fitness["1"],100);
  assert.equal(after.fitness["3"],100);
  assert.equal(after.fitness["4"],52);
  assert.equal(after.trainingReports["1:0"].players[0].fitnessBefore,84);
  assert.equal(after.trainingReports["1:0"].players[0].fitnessAfter,100);
  assert.equal(after.trainingReports["1:0"].players[0].xp,5);
  g.click({"data-action":"train","data-value":"passing"});
  assert.equal(JSON.parse(g.storage.get(key)).money,old.money-12);
});

test("B06 skill and potential caps, insufficient funds and imported saves never invent progress",()=>{
  const base=boot(),key="five-aside-manager-alpha-v1",old=JSON.parse(base.storage.get(key));
  old.money=10;old.roster[2].potential=old.roster[2].rating;
  old.roster[2].attributes.passing=99;
  old.roster[2].xp=37;
  delete old.roleAssignments;delete old.trainingReports;delete old.trainingFocus;delete old.tacticalReports;
  const g=boot({autoCreate:false,saved:old});
  g.click({"data-action":"go-training"});
  g.click({"data-action":"train","data-value":"passing"});
  let after=JSON.parse(g.storage.get(key));
  assert.equal(after.money,10);
  assert.equal(after.trainingReports["1:0"],undefined);
  assert.equal(after.roster[2].xp,37);
  after.money=240;
  const restored=boot({autoCreate:false,saved:after});
  restored.click({"data-action":"go-training"});
  assert.match(restored.app.innerHTML,/AT POTENTIAL CAP/);
  restored.click({"data-action":"train","data-value":"passing"});
  const trained=JSON.parse(restored.storage.get(key));
  assert.equal(trained.roster[2].xp,37);
  assert.equal(trained.roster[2].attributes.passing,99);
  assert.equal(trained.trainingReports["1:0"].players[2].xp,0);
  assert.equal(trained.trainingReports["1:0"].players[2].skillAfter,99);
  assert.equal(trained.money,228);
  assert.equal(trained.roster.length,9);
  assert.equal(trained.club,old.club);
});

test("B06 simulated training and tactical history survives season change without changing legacy saves",()=>{
  const key="five-aside-manager-alpha-v1",base=boot();
  const configured=JSON.parse(base.storage.get(key));
  // This test isolates persistence and season changes: make every round eligible
  // rather than accidentally testing the B05 guest/availability conditions again.
  configured.roster.forEach(p=>{p.available=[1,1,1,1,1,1];});
  const g=boot({autoCreate:false,saved:configured});
  g.click({"data-action":"train","data-value":"passing"});
  for(let i=0;i<6;i++){
    g.click({"data-action":"go-fixtures"});
    const snapshot=JSON.parse(g.storage.get(key));
    if(snapshot.round===2)g.click({"data-action":"guest"});
    g.click({"data-action":"start-auto"});
    g.click({"data-action":"finish"});
  }
  let data=JSON.parse(g.storage.get(key));
  assert.ok(data.tacticalReports["1:0"]);
  assert.ok(data.trainingReports["1:0"]);
  g.click({"data-action":"next-season"});
  data=JSON.parse(g.storage.get(key));
  assert.equal(data.season,2);
  assert.ok(data.tacticalReports["1:0"]);
  assert.ok(data.trainingReports["1:0"]);
  assert.ok(data.playerMatchHistory[1].length>=1);
  assert.equal(data.training["2:0"],undefined);
});


test("B06 saved absence policy genuinely rotates tired outfielders but never the goalkeeper",()=>{
  const base=boot(),key="five-aside-manager-alpha-v1";
  const save=JSON.parse(base.storage.get(key));
  save.roster.find(p=>p.id===4).available=[1,1,1,1,1,1];
  save.fitness[4]=70;
  save.autoSubPolicy="rotate";
  function play(rotate){
    const configured=JSON.parse(JSON.stringify(save));
    configured.autoSubPolicy=rotate?"rotate":"none";
    const g=boot({autoCreate:false,saved:configured,random:0.53});
    g.click({"data-action":"go-tactics"});
    assert.match(g.app.innerHTML,/Unattended substitutions/);
    g.click({"data-action":"go-fixtures"});
    g.click({"data-action":"start-auto"});
    assert.match(g.app.innerHTML,rotate?/Saved rotation rule/:/FULL-TIME WHISTLE|Full-time whistle/i);
    g.click({"data-action":"finish"});
    return JSON.parse(g.storage.get(key));
  }
  const rotating=play(true),staticTeam=play(false);
  const report=rotating.tacticalReports["1:0"];
  assert.equal(report.rotationPolicy,"rotate");
  assert.ok(report.substitutions.length>=1);
  assert.ok(report.substitutions.length<=2);
  assert.equal(staticTeam.tacticalReports["1:0"].substitutions.length,0);
  assert.ok(Object.values(rotating.playerStats).reduce((sum,p)=>sum+p.appearances,0)>
    Object.values(staticTeam.playerStats).reduce((sum,p)=>sum+p.appearances,0));
  const starter=report.initialRoles.GK;
  assert.ok(report.substitutions.every(p=>p.offId!==starter&&p.onId!==starter));
  const keeper=rotating.playerMatchHistory[starter];
  assert.equal(keeper[0].minutes,20);
  assert.equal(new Set(report.substitutions.map(s=>s.offId)).size,report.substitutions.length);
});

test("B06 absence rotation selection persists and is safe on imported saves",()=>{
  const g=boot(),key="five-aside-manager-alpha-v1";
  g.click({"data-action":"go-tactics"});
  g.click({"data-action":"autoSubPolicy","data-value":"rotate"});
  let saved=JSON.parse(g.storage.get(key));
  assert.equal(saved.autoSubPolicy,"rotate");
  const again=boot({autoCreate:false,saved});
  again.click({"data-action":"go-tactics"});
  assert.match(again.app.innerHTML,/Unattended substitutions/);
  assert.match(again.app.innerHTML,/data-action="autoSubPolicy" data-value="rotate" aria-pressed="true"/);
  again.click({"data-action":"autoSubPolicy","data-value":"none"});
  saved=JSON.parse(again.storage.get(key));
  assert.equal(saved.autoSubPolicy,"none");
  delete saved.autoSubPolicy;
  const legacy=boot({autoCreate:false,saved});
  assert.equal(JSON.parse(legacy.storage.get(key)).autoSubPolicy,"none");
});


test("B07 phase engine is pure, seeded and reconciles every goal, shot and save",()=>{
  const team=[
    {id:1,name:"Keeper",pos:"GK",rating:71,roleFit:72,attributes:{keeping:78,passing:55,defending:65}},
    {id:2,name:"Anchor",pos:"DEF",rating:69,roleFit:72,attributes:{finishing:48,passing:68,defending:76}},
    {id:3,name:"Left",pos:"MID",rating:74,roleFit:77,attributes:{finishing:68,passing:80,defending:62}},
    {id:4,name:"Right",pos:"MID",rating:73,roleFit:71,attributes:{finishing:64,passing:76,defending:65}},
    {id:5,name:"Striker",pos:"FWD",rating:77,roleFit:83,attributes:{finishing:84,passing:67,defending:43}}
  ];
  const context={team,keeperId:1,opponentStrength:68,attackChance:.21,concedeChance:.14,
    approach:"balanced",club:"Test FC",opponent:"Away Club"};
  const original={minute:0,seed:B07Engine.seed("fixture-test"),rngState:B07Engine.seed("fixture-test"),
    home:0,away:0,events:[{minute:0,type:"kickoff",text:"Kickoff!"}]};
  const saved=JSON.stringify({original,context});
  const play=()=>Array.from({length:10}).reduce(m=>B07Engine.step(m,context),original);
  const one=play(),two=play();
  assert.deepEqual(one,two);
  assert.equal(JSON.stringify({original,context}),saved,"Engine must not mutate supplied objects");
  assert.equal(one.minute,20);
  assert.equal(one.phases,10);
  assert.ok(B07Engine.verify(one));
  assert.equal(one.events.filter(e=>e.scorerId!=null).length,one.home);
  assert.equal(one.events.filter(e=>e.keeperId!=null).length,one.savesFor);
  assert.equal(one.shotsFor,one.onTargetFor+one.events.filter(e=>e.side==="home"&&!e.onTarget).length);
});

test("B07 live and offline reproduce exact events, metrics and player histories with identical decisions",()=>{
  const key="five-aside-manager-alpha-v1",base=boot();
  const saved=JSON.parse(base.storage.get(key));
  saved.style="balanced";saved.plan="balanced";saved.planAhead="balanced";saved.planBehind="balanced";
  saved.autoSubPolicy="none";
  function play(auto){
    const g=boot({autoCreate:false,saved});
    g.click({"data-action":auto?"start-auto":"start-live"});
    if(!auto)for(let i=0;i<10;i++)g.tick();
    assert.match(g.app.innerHTML,/Match statistics/);
    g.click({"data-action":"finish"});
    return JSON.parse(g.storage.get(key));
  }
  const watched=play(false),offline=play(true);
  assert.deepEqual(watched.results,offline.results);
  assert.deepEqual(watched.playerStats,offline.playerStats);
  assert.deepEqual(watched.playerMatchHistory,offline.playerMatchHistory);
  assert.deepEqual(watched.matchReports["1:0"].events,offline.matchReports["1:0"].events);
  assert.deepEqual(watched.matchReports["1:0"].metrics,offline.matchReports["1:0"].metrics);
  assert.ok(B07Engine.verify(Object.assign({},offline.matchReports["1:0"].metrics,{
    home:offline.results[0].home,away:offline.results[0].away,
    shotsFor:offline.results[0].metrics.shotsFor,shotsAgainst:offline.results[0].metrics.shotsAgainst,
    onTargetFor:offline.results[0].metrics.onTargetFor,
    onTargetAgainst:offline.results[0].metrics.onTargetAgainst,
    savesFor:offline.results[0].metrics.savesFor,
    savesAgainst:offline.matchReports["1:0"].events.filter(e=>e.type==="saved-shot").length,
    events:offline.matchReports["1:0"].events
  })));
  const totalGoals=Object.values(offline.playerStats).reduce((n,p)=>n+p.goals,0);
  const totalShots=Object.values(offline.playerStats).reduce((n,p)=>n+(p.shots||0),0);
  assert.equal(totalGoals,offline.results[0].home);
  assert.equal(totalShots,offline.results[0].metrics.shotsFor);
});

test("B07 legacy career migration is additive and match ledgers persist across reload",()=>{
  const key="five-aside-manager-alpha-v1",first=boot();
  const prior=JSON.parse(first.storage.get(key));
  prior.playerStats={3:{appearances:7,goals:4,cleanSheets:0}};
  delete prior.matchReports;
  const g=boot({autoCreate:false,saved:prior});
  g.click({"data-action":"start-auto"});
  g.click({"data-action":"finish"});
  const recorded=JSON.parse(g.storage.get(key));
  assert.equal(recorded.playerStats[3].appearances,8);
  assert.ok(recorded.playerStats[3].goals>=4);
  assert.ok(recorded.matchReports["1:0"].events.length>0);
  assert.equal(recorded.matchReports["1:0"].seed,B07Engine.seed("5aside:v1:1:0:Dockside Rovers"));
  const reloaded=boot({autoCreate:false,saved:recorded});
  const again=JSON.parse(reloaded.storage.get(key));
  assert.equal(again.matchReports["1:0"].seed,recorded.matchReports["1:0"].seed);
  assert.equal(again.playerStats[3].appearances,8);
});

test("B07 player ability, opponent quality and goalkeeper skill change repeatable outcomes",()=>{
  const team=[
    {id:1,name:"GK",pos:"GK",rating:72,roleFit:70,attributes:{keeping:75,passing:55,defending:60}},
    {id:2,name:"DEF",pos:"DEF",rating:70,roleFit:72,attributes:{finishing:45,passing:65,defending:78}},
    {id:3,name:"MID",pos:"MID",rating:70,roleFit:72,attributes:{finishing:65,passing:75,defending:60}},
    {id:4,name:"MID2",pos:"MID",rating:70,roleFit:72,attributes:{finishing:65,passing:75,defending:60}},
    {id:5,name:"FWD",pos:"FWD",rating:70,roleFit:72,attributes:{finishing:80,passing:65,defending:45}}
  ];
  function sample(opponentStrength,keeperSkill){
    let goals=0,saves=0;
    for(let n=0;n<120;n++){
      const players=JSON.parse(JSON.stringify(team));
      players[0].attributes.keeping=keeperSkill;
      const context={team:players,keeperId:1,opponentStrength,attackChance:.18,concedeChance:.18,
        approach:"balanced",club:"Test",opponent:"CPU"};
      const fixtureSeed=B07Engine.seed("balance-"+n);
      let match={minute:0,seed:fixtureSeed,rngState:fixtureSeed,home:0,away:0,events:[]};
      for(let phase=0;phase<10;phase++)match=B07Engine.step(match,context);
      goals+=match.away;saves+=match.savesFor;
    }
    return {goals,saves};
  }
  const weakKeeper=sample(70,40),strongKeeper=sample(70,95);
  const weakRivals=sample(48,75),strongRivals=sample(91,75);
  assert.ok(strongKeeper.goals<weakKeeper.goals);
  assert.ok(strongRivals.goals>weakRivals.goals);
});
