create or replace function public.manor_screech_result(
  p_session_id uuid,
  p_success boolean
) returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_session public.raid_sessions%rowtype;
  v_leader boolean;
  v_own_count_key text;
  v_own_success_key text;
  v_other_penalty_key text;
  v_count integer;
  v_successes integer;
  v_penalty integer;
  v_failures integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select r.* into v_session
  from public.raid_sessions r
  where r.id=p_session_id
  for update;

  if not found or v_session.status<>'active' or v_session.stage not in ('maids','housebound') then
    raise exception 'Screech is not active';
  end if;

  if not exists(
    select 1
    from public.party_finder_members m
    where m.listing_id=v_session.listing_id
      and m.user_id=v_user
  ) then
    raise exception 'You are not in this raid';
  end if;

  if v_session.stage='housebound' then
    v_failures:=coalesce((v_session.state->>'masterScreechFailures')::integer,0)+(case when p_success then 0 else 1 end);

    update public.raid_sessions
       set state=jsonb_set(
                   jsonb_set(state,'{masterScreechFailures}',to_jsonb(v_failures),true),
                   '{masterDamageBuffUntil}',
                   to_jsonb(case
                     when p_success then coalesce(state->>'masterDamageBuffUntil','')
                     else (now()+interval '20 seconds')::text
                   end),
                   true
                 ),
           updated_at=now()
     where id=p_session_id
     returning state into v_session.state;

    return jsonb_build_object('ok',true,'state',v_session.state,'masterBuffed',not p_success);
  end if;

  v_leader:=v_user=v_session.leader_id;
  v_own_count_key:=case when v_leader then 'screechCountA' else 'screechCountB' end;
  v_own_success_key:=case when v_leader then 'screechSuccessA' else 'screechSuccessB' end;
  v_other_penalty_key:=case when v_leader then 'maidPenaltyB' else 'maidPenaltyA' end;

  v_count:=coalesce((v_session.state->>v_own_count_key)::integer,0)+1;
  v_successes:=coalesce((v_session.state->>v_own_success_key)::integer,0)+(case when p_success then 1 else 0 end);
  v_penalty:=coalesce((v_session.state->>v_other_penalty_key)::integer,0)+(case when p_success then 0 else 1 end);

  update public.raid_sessions
     set state=jsonb_set(
                 jsonb_set(
                   jsonb_set(state,array[v_own_count_key],to_jsonb(v_count),true),
                   array[v_own_success_key],to_jsonb(v_successes),true
                 ),
                 array[v_other_penalty_key],to_jsonb(v_penalty),true
               ),
         updated_at=now()
   where id=p_session_id
   returning state into v_session.state;

  return jsonb_build_object('ok',true,'state',v_session.state);
end
$$;

revoke all on function public.manor_screech_result(uuid,boolean) from public;
grant execute on function public.manor_screech_result(uuid,boolean) to authenticated;
