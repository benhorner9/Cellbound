
create or replace function public.fail_manor_raid(p_session_id uuid,p_reason text default 'The raid was defeated')
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_session public.raid_sessions%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.raid_sessions where id=p_session_id for update;
  if not found then raise exception 'Raid session not found'; end if;
  if v_session.leader_id<>v_user then raise exception 'Only the raid leader can resolve a wipe'; end if;
  if v_session.status<>'active' then
    return jsonb_build_object('ok',true,'status',v_session.status,'stage',v_session.stage,'state',v_session.state);
  end if;

  update public.raid_sessions
     set status='failed',
         state=state || jsonb_build_object('failureReason',left(coalesce(nullif(btrim(p_reason),''),'The raid was defeated'),500),'failedAt',now()),
         updated_at=now()
   where id=p_session_id
   returning * into v_session;

  return jsonb_build_object('ok',true,'status',v_session.status,'stage',v_session.stage,'state',v_session.state);
end
$$;

revoke all on function public.fail_manor_raid(uuid,text) from public;
revoke execute on function public.fail_manor_raid(uuid,text) from anon;
grant execute on function public.fail_manor_raid(uuid,text) to authenticated;
