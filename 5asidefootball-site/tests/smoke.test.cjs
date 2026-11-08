
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

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
  seededMath.random = () => random;
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
  return {app,storage,nameInput,previewName,previewCrest,nameLength,click,
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

test("B03 injury messages follow actual simulation events and medical actions",()=>{
  const g=boot({random:0.01});
  g.click({"data-action":"start-auto"});
  g.click({"data-action":"finish"});
  const s=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  const injured=s.inbox.filter(m=>m.kind==="injury");
  assert.ok(injured.length>0,"no simulated injury events");
  assert.ok(injured.every(m=>m.detail.includes("sidelined")));
  assert.ok(Object.values(s.injuries).some(round=>round>0));
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
