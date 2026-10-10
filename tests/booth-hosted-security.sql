-- Execute within BEGIN / ROLLBACK. Synthetic identities exist only in that
-- transaction; no emails, passwords, sessions or existing account changes.
insert into auth.users(id) values
 ('99999999-0000-4000-8000-000000000901'),
 ('99999999-0000-4000-8000-000000000902'),
 ('99999999-0000-4000-8000-000000000903');
create function pg_temp.expect_denied(statement text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then return;
 end;
 raise exception 'SECURITY FAILURE: unexpected success: %',statement;
end $$;
select set_config('request.jwt.claim.sub',(select user_id::text from public.cellbound_admins where role='owner' limit 1),true);
set local role authenticated;
select public.cellbound_booth('grant','','',0,'{"user_id":"99999999-0000-4000-8000-000000000901","role":"editor","scopes":["comic-text"]}');
select public.cellbound_booth('grant','','',0,'{"user_id":"99999999-0000-4000-8000-000000000902","role":"viewer","scopes":["comic-text"]}');
select public.cellbound_booth('grant','','',0,'{"user_id":"99999999-0000-4000-8000-000000000903","role":"admin","scopes":["comic-text"],"can_publish":false}');
select set_config('request.jwt.claim.sub','99999999-0000-4000-8000-000000000901',true);
select public.cellbound_booth('save','comic-text','qa-job9-transaction-probe',0,'{"scene_id":"qa-job9-transaction-probe","panels":[{"title":"QA","text":"First"}]}');
select pg_temp.expect_denied($q$select public.cellbound_booth('save','comic-text','qa-job9-transaction-probe',0,'{}')$q$);
select pg_temp.expect_denied($q$select public.cellbound_booth('publish','comic-text','qa-job9-transaction-probe',1)$q$);
select pg_temp.expect_denied($q$select public.cellbound_booth('list','adventure')$q$);
select pg_temp.expect_denied($q$select * from booth_private.drafts$q$);
select pg_temp.expect_denied($q$select draft_blueprint from public.cellbound_design_blueprints$q$);
select pg_temp.expect_denied($q$delete from public.cellbound_room_layouts$q$);
select public.cellbound_booth('submit','comic-text','qa-job9-transaction-probe',1);
select set_config('request.jwt.claim.sub','99999999-0000-4000-8000-000000000902',true);
select public.cellbound_booth('get','comic-text','qa-job9-transaction-probe');
select pg_temp.expect_denied($q$select public.cellbound_booth('save','comic-text','qa-job9-transaction-probe',2,'{}')$q$);
select pg_temp.expect_denied($q$select public.cellbound_booth('approve','comic-text','qa-job9-transaction-probe',2)$q$);
select set_config('request.jwt.claim.sub','99999999-0000-4000-8000-000000000903',true);
select public.cellbound_booth('approve','comic-text','qa-job9-transaction-probe',2);
select pg_temp.expect_denied($q$select public.cellbound_booth('publish','comic-text','qa-job9-transaction-probe',3)$q$);
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.cellbound_admins where role='owner' limit 1),true);
set local role authenticated;
select public.cellbound_booth('publish','comic-text','qa-job9-transaction-probe',3);
select public.cellbound_booth('save','comic-text','qa-job9-transaction-probe',4,'{"scene_id":"qa-job9-transaction-probe","panels":[{"title":"QA","text":"Second"}]}');
select public.cellbound_booth('submit','comic-text','qa-job9-transaction-probe',5);
select public.cellbound_booth('approve','comic-text','qa-job9-transaction-probe',6);
select public.cellbound_booth('publish','comic-text','qa-job9-transaction-probe',7);
select public.cellbound_booth('rollback','comic-text','qa-job9-transaction-probe',8,jsonb_build_object('history_id',(public.cellbound_booth('history','comic-text','qa-job9-transaction-probe')->0->>'id')::bigint));
do $$ begin
 if (select panels->0->>'text' from public.cellbound_comic_text where scene_id='qa-job9-transaction-probe')<>'First' then raise exception 'Rollback failed'; end if;
end $$;
select public.cellbound_booth('save','comic-text','qa-job9-transaction-probe',9,'{"scene_id":"qa-job9-transaction-probe","panels":[]}');
select public.cellbound_booth('submit','comic-text','qa-job9-transaction-probe',10);
select public.cellbound_booth('approve','comic-text','qa-job9-transaction-probe',11);
select pg_temp.expect_denied($q$select public.cellbound_booth('publish','comic-text','qa-job9-transaction-probe',12)$q$);
do $$ begin
 if (select panels->0->>'text' from public.cellbound_comic_text where scene_id='qa-job9-transaction-probe')<>'First' then raise exception 'Failed publication changed content'; end if;
 if public.cellbound_booth('get','comic-text','qa-job9-transaction-probe')->'draft'->>'revision'<>'12' then raise exception 'Failed publication changed revision'; end if;
end $$;
reset role;
set local role anon;
select pg_temp.expect_denied($q$select public.cellbound_booth('access')$q$);
reset role;
-- Final caller MUST roll back this transaction.
