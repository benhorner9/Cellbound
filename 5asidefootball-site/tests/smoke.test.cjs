
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function boot({autoCreate=true,saved=null}={}) {
  const key="five-aside-manager-alpha-v1";
  const storage = new Map(saved?[[key,JSON.stringify(saved)]]:[]);
  const nameInput = {value:"Test Town FC"};
  const previewName = {textContent:""};
  const app = {innerHTML:"", handle:null, inputHandle:null, addEventListener(event,cb){if(event==="click")this.handle=cb;if(event==="input")this.inputHandle=cb;}};
  let clock;
  const seededMath = Object.create(Math);
  seededMath.random = () => 0.53;
  const sandbox = {
    document:{getElementById(name){if(name==="app")return app;if(name==="club-create-name")return nameInput;if(name==="kit-club-name")return previewName;return null;}},
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
  if(autoCreate)click({"data-action":"create-club"});
  return {app,storage,nameInput,click,input(value){nameInput.value=value;app.inputHandle({target:{id:"club-create-name",value}});},tick(){assert.ok(clock,"Running match clock");clock();}};
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

test("new managers must create a club before accessing the clubhouse",()=>{
  const g=boot({autoCreate:false});
  assert.match(g.app.innerHTML,/CREATE YOUR CLUB/);
  assert.match(g.app.innerHTML,/Live kit preview/i);
  assert.doesNotMatch(g.app.innerHTML,/The Clubhouse/);
  g.click({"data-action":"go-fixtures"});
  assert.match(g.app.innerHTML,/CREATE YOUR CLUB/);
  g.input("  ");
  g.click({"data-action":"create-club"});
  assert.match(g.app.innerHTML,/between 3 and 28 characters/);
  assert.equal(g.storage.size,0);
  g.input("Harbour Fives FC");
  g.click({"data-action":"kit-pattern","data-value":"hoops"});
  g.click({"data-action":"kit-primary","data-value":"#d63c4b"});
  g.click({"data-action":"kit-secondary","data-value":"#142f4d"});
  assert.match(g.app.innerHTML,/kit-hoops/);
  assert.match(g.app.innerHTML,/Harbour Fives FC/);
  g.click({"data-action":"create-club"});
  const state=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(state.clubCreated,true);
  assert.equal(state.club,"Harbour Fives FC");
  assert.equal(state.kit.pattern,"hoops");
  assert.equal(state.kit.primary,"#d63c4b");
  assert.equal(state.kit.secondary,"#142f4d");
  assert.match(g.app.innerHTML,/The Clubhouse/);
});

test("kit editing preserves progress and blocks identical colours",()=>{
  const g=boot();
  g.click({"data-action":"go-fixtures"});
  const before=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  g.click({"data-action":"go-overview"});
  g.click({"data-action":"edit-club"});
  assert.match(g.app.innerHTML,/YOUR CLUB IDENTITY/);
  g.click({"data-action":"kit-secondary","data-value":"#1d8967"});
  g.click({"data-action":"create-club"});
  assert.match(g.app.innerHTML,/Choose two different kit colours/);
  g.click({"data-action":"kit-secondary","data-value":"#f4bf52"});
  g.input("New Club  Athletic");
  g.click({"data-action":"create-club"});
  const after=JSON.parse(g.storage.get("five-aside-manager-alpha-v1"));
  assert.equal(after.club,"New Club Athletic");
  assert.equal(after.kit.secondary,"#f4bf52");
  assert.equal(after.money,before.money);
  assert.equal(after.round,before.round);
  assert.equal(after.roster.length,before.roster.length);
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
