import test from "node:test";
import assert from "node:assert/strict";
import {readdirSync,readFileSync} from "node:fs";
test("UX11: all coach/client stylesheet literals use no green palette",()=>{
 const folder=new URL("../public/",import.meta.url);
 const styles=readdirSync(folder).filter(n=>n.endsWith(".css"));
 assert.ok(styles.length>=13);
 for(const name of styles){
  const body=readFileSync(new URL(name,folder),"utf8");
  for(const m of body.matchAll(/#[0-9a-fA-F]{3,8}\b/g)){
   let h=m[0].slice(1);if(h.length===3||h.length===4)h=h.split("").map(c=>c+c).join("");
   if(![6,8].includes(h.length))continue;
   const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));
   assert.ok(!(g>r+3&&g>b+3),name+" contains legacy green "+m[0]);
  }
 }
});
