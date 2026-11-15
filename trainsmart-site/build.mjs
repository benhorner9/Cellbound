import {readFileSync,writeFileSync,mkdirSync,rmSync} from "node:fs";
import {join} from "node:path";
import {createHash} from "node:crypto";
const root=process.cwd(),m=JSON.parse(readFileSync("source.json","utf8"));
if(m.source!=="benhorner9/Coaching"||m.target!=="/trainsmart/"||m.demoOnly!==true||
 !/^[a-f0-9]{40}$/.test(m.sourceCommit))throw Error("Invalid source provenance/target");
const out=join(root,"dist-trainsmart");
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const checks={},files=[];
for(const file of m.files){
 if(!/^coach-[a-z0-9-]+\.(?:html|mjs|css)$/.test(file))throw Error("Unauthorized asset: "+file);
 let body=readFileSync(join(root,"public",file),"utf8");
 if(file.endsWith(".mjs")){
  if(/\bfetch\s*\(|\bXMLHttpRequest\s*\(|\bWebSocket\s*\(/.test(body))
   throw Error("Network-capable runtime in demo asset: "+file);
  body=body.replace(/\.mjs(?=["'])/g,".js");
 }
 if(file.endsWith(".html")){
  if(!body.includes("connect-src 'none'"))throw Error("Demo network CSP missing");
  body=body.replace(/((?:href|src))="\/(coach-[^"]+)"/g,'$1="./$2"');
  body=body.replace(/\.mjs(?=["'])/g,".js");
  if(/(?:src|href)="\/(?!\/)/.test(body))throw Error("Root-relative site asset: "+file);
  if(!body.includes("FICTIONAL PREVIEW"))throw Error("User-facing demo disclosure missing");
  body=body.replace('<main id="main-content" tabindex="-1">',
   '<main id="main-content" tabindex="-1"><div class="public-demo-notice" role="note"><strong>PUBLIC DEMONSTRATION — NOT A SECURE CLIENT SYSTEM</strong> Do not enter real client names, contact details, health information or workout records. All sample changes stay in this browser tab and can be lost.</div>');
 }
 if(file==="coach-hub.css"){
  body+='\n.public-demo-notice{border:1px solid #b5b069;background:#3f3f2a;color:#f6ebc1;border-radius:11px;padding:12px 16px;font-size:12px;line-height:1.6;margin:10px 0 17px}.public-demo-notice strong{display:block;margin-bottom:4px}\n';
 }
 const output=file.replace(/\.mjs$/,".js");
 writeFileSync(join(out,output),body);
 files.push(output);
 checks[output]=createHash("sha256").update(body).digest("hex");
}
const html=readFileSync(join(out,"coach-hub.html"),"utf8");
for(const [,attr,asset] of html.matchAll(/(href|src)="\.\/(coach-[^"?#]+)/g)){
 if(!files.includes(asset))throw Error("HTML references missing asset: "+asset);
}
for(const file of files.filter(x=>x.endsWith(".js"))){
 const body=readFileSync(join(out,file),"utf8");
 for(const imp of body.matchAll(/from\s+["']\.\/([^"']+)["']/g)){
  if(!files.includes(imp[1]))throw Error(file+" imports unshipped "+imp[1]);
 }
}
writeFileSync(join(out,"index.html"),html);checks["index.html"]=checks["coach-hub.html"];files.push("index.html");
const meta={project:"TrainSmart Coaching",channel:"fictional-preview",target:m.target,
 source:m.source,sourceCommit:m.sourceCommit,bridgeCommit:process.env.GITHUB_SHA||"local-check",
 builtAt:new Date().toISOString(),files:checks};
writeFileSync(join(out,"build-meta.json"),JSON.stringify(meta,null,2)+"\n");
console.log("TrainSmart isolated site validated",files.length,"assets. Source",m.sourceCommit);
