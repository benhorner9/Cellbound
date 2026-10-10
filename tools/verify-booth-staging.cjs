'use strict';
function validate(url,key){
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url||'')||url==='https://jvydqeikdpelmtloulnd.supabase.co')throw Error('Job 9 deployment blocked: configure a separate staging Supabase project. The existing project is shared with production.');
 let anon=false;try{anon=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon'}catch{}
 if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key||'')&&!anon)throw Error('Staging requires a publishable or anon key. Server credentials are forbidden.');
 return true;
}
module.exports={validate};
if(require.main===module){validate(process.env.CELLBOUND_STAGING_SUPABASE_URL,process.env.CELLBOUND_STAGING_SUPABASE_KEY);console.log('Isolated staging database configuration verified.');}
