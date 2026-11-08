
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function boot({autoCreate=true,saved=null}={}) {
  const key="five-aside-manager-alpha-v1";
  const storage = new Map(saved?[[key,JSON.stringify(saved)]]:[]);
  const nameInput = {value:"Test Town FC"};
  const previewName = {textContent:""};
  const previewCrest = {innerHTML:""};
  const nameLength = {textContent:""};
  const app = {innerHTML:"", handle:null, inputHandle:null, addEventListener(event,cb){if(event==="click")this.handle=cb;if(event==="input")this.inputHandle=cb;}};
  let clock;
  const seededMath = Object.create(Math);
  seededMath.random = () => 0.53;
  const sandbox = {
    document:{getElementById(name){if(name==="app")return app;if(name==="club-create-name")return nameInput;if(name==="kit-club-name")return previewName;if(name==="kit-club-crest")return previewCrest;if(name==="creator-name-length")return nameLength;return null;}},
    localStorage:{getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,v);}},
    setInterval(fn){clock=fn;return 1;},
    clearInterval(){clock=null;},
    confirm(){return true;},
    Math:seededMath, JSON, String, Object, Array, Number, Date
  };
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
  return {app,storage,nameInput,previewName,previewCrest,nameLength,click,input(value){nameInput.value=value;app.inputHandle({target:{id:"club-create-name",value}});},tick(){assert.ok(clock,"Running match clock");clock();}};
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
