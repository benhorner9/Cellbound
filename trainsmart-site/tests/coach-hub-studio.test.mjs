import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const get=path=>readFile(new URL("../public/"+path,import.meta.url),"utf8");
test("UX09 active theme is new standalone studio stylesheet, not old green redesign",async()=>{
 const [html,css]=await Promise.all([get("coach-hub.html"),get("coach-studio.css")]);
 assert.match(html,/href="\/coach-studio\.css"/);
 assert.doesNotMatch(html,/href="\/coach-design\.css"/);
 assert.match(css,/color-scheme:light/);
 assert.match(css,/--ts-blue:#2956cc/);
 assert.match(css,/--ts-sidebar:#151f31/);
 assert.match(css,/--ts-card:#fff/);
 assert.match(css,/\.workspace\{background:#f3f5f9/);
 assert.match(css,/\.side\{/);
 assert.match(css,/\.btn-primary\{background:#2956cc/);
 assert.doesNotMatch(css,/#c[0-9a-f]{2}e[0-9a-f]{2}/i);
});
test("UX09 replaces glyph-based navigation with ten actual inline line-art SVGs",async()=>{
 const html=await get("coach-hub.html");
 assert.equal((html.match(/<svg viewBox="0 0 24 24"/g)||[]).length,10);
 assert.match(html,/data-view="nutrition"/);
 assert.match(html,/id="nutrition-shortcut"/);
 assert.match(html,/<title>TrainSmart \| Coaching Dashboard<\/title>/);
 assert.match(html,/name="theme-color" content="#151f31"/);
});
test("UX09 remains an offline public example-only coaching workspace",async()=>{
 const [html,css]=await Promise.all([get("coach-hub.html"),get("coach-studio.css")]);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/id="workspace-demo-note"/);
 assert.doesNotMatch(css,/@import|url\(https?:|fonts\.googleapis/);
});
