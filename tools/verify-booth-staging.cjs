'use strict';
function validate(url,key,approval={}){
 const shared=url==='https://jvydqeikdpelmtloulnd.supabase.co';
 const approved=approval.backendMode==='owner-approved-shared-2026-10-10'&&approval.projectRef==='jvydqeikdpelmtloulnd'&&approval.websiteTarget==='staging';
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url||'')||shared&&!approved)throw Error('Job 9 deployment blocked: configure a separate staging Supabase project or the explicit owner approval. The existing project is shared with production.');
 let anon=false;try{anon=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon'}catch{}
 if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key||'')&&!anon)throw Error('Staging requires a publishable or anon key. Server credentials are forbidden.');
 return true;
}
module.exports={validate};
if(require.main===module){
 const fs=require('node:fs'),approval=require('../config/booth-release.json');
 if(process.env.GITHUB_REF&&process.env.GITHUB_REF!=='refs/heads/staging')throw Error('Website deployment is staging-only.');
 const source=fs.readFileSync('auth.js','utf8');
 const url=process.env.CELLBOUND_STAGING_SUPABASE_URL||source.match(/const SUPABASE_URL='([^']+)'/)[1];
 const key=process.env.CELLBOUND_STAGING_SUPABASE_KEY||source.match(/const SUPABASE_PUBLISHABLE_KEY='([^']+)'/)[1];
 if(Boolean(process.env.CELLBOUND_STAGING_SUPABASE_URL)!==Boolean(process.env.CELLBOUND_STAGING_SUPABASE_KEY))throw Error('Configure both staging URL and key, or neither.');
 validate(url,key,approval);
 console.log('Staging-only website deployment verified. Backend: '+url+' ('+approval.backendMode+').');
}
