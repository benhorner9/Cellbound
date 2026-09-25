create or replace function public.manor_screech_result_v2(
  p_session_id uuid,
  p_side integer,
  p_event_ms integer,
  p_outcome text
) returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_session public.raid_sessions%rowtype;
  v_side_user uuid;
  v_outcome text:=lower(coalesce(p_outcome,''));
  v_started timestamptz;
  v_deadline timestamptz;
  v_token text;
  v_resolved jsonb;
  v_state jsonb;
  v_count_key text;
  v_success_key text;
  v_count integer;
  v_success integer;
  v_penalty_a integer;
  v_penalty_b integer;
  v_master_penalty integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_side not in (0,1) then raise exception 'Invalid raid side'; end if;
  if p_event_ms < 0 or p_event_ms > 300000 then raise exception 'Invalid Screech event time'; end if;
  if v_outcome not in ('success','wrong','timeout') then raise exception 'Invalid Screech outcome'; end if;

  select r.* into v_session
  from public.raid_sessions r
  where r.id=p_session_id
  for update;

  if not found or v_session.status<>'active' or v_session.stage not in ('maids','housebound') then
    raise exception 'Screech is not active';
  end if;

  if not exists(
    select 1 from public.party_finder_members m
    where m.listing_id=v_session.listing_id and m.user_id=v_user
  ) then
    raise exception 'You are not in this raid';
  end if;

  select m.user_id into v_side_user
  from public.party_finder_members m
  where m.listing_id=v_session.listing_id
  order by m.joined_at asc, m.user_id asc
  offset p_side limit 1;

  if v_side_user is null then raise exception 'Raid side is unavailable'; end if;

  begin
    v_started:=nullif(v_session.state->>'stageStartedAt','')::timestamptz;
  exception when others then
    v_started:=null;
  end;
  if v_started is null then raise exception 'Encounter has not started'; end if;

  v_deadline:=v_started + make_interval(secs => (p_event_ms+4500)/1000.0);
  if now()>=v_deadline then
    v_outcome:='timeout';
  elsif v_outcome='timeout' then
    raise exception 'Screech timer has not expired';
  elsif v_side_user<>v_user then
    raise exception 'Only that commander can answer their Screech';
  end if;

  v_token:=v_session.stage||':'||p_side::text||':'||p_event_ms::text;
  v_resolved:=coalesce(v_session.state->'screechResolved','{}'::jsonb);

  if v_resolved ? v_token then
    return jsonb_build_object('ok',true,'duplicate',true,'state',v_session.state);
  end if;

  v_state:=jsonb_set(
    v_session.state,
    '{screechResolved}',
    v_resolved || jsonb_build_object(
      v_token,
      jsonb_build_object('outcome',v_outcome,'side',p_side,'resolvedAt',now())
    ),
    true
  );

  v_count_key:=case when p_side=0 then 'screechCountA' else 'screechCountB' end;
  v_success_key:=case when p_side=0 then 'screechSuccessA' else 'screechSuccessB' end;
  v_count:=coalesce((v_state->>v_count_key)::integer,0)+1;
  v_success:=coalesce((v_state->>v_success_key)::integer,0)+(case when v_outcome='success' then 1 else 0 end);
  v_state:=jsonb_set(jsonb_set(v_state,array[v_count_key],to_jsonb(v_count),true),array[v_success_key],to_jsonb(v_success),true);

  if v_session.stage='maids' then
    v_penalty_a:=coalesce((v_state->>'maidPenaltyA')::integer,0);
    v_penalty_b:=coalesce((v_state->>'maidPenaltyB')::integer,0);

    if v_outcome='wrong' then
      if p_side=0 then v_penalty_b:=v_penalty_b+1; else v_penalty_a:=v_penalty_a+1; end if;
    elsif v_outcome='timeout' then
      v_penalty_a:=v_penalty_a+1;
      v_penalty_b:=v_penalty_b+1;
    end if;

    v_state:=v_state || jsonb_build_object('maidPenaltyA',v_penalty_a,'maidPenaltyB',v_penalty_b);
  else
    v_master_penalty:=coalesce((v_state->>'masterPenalty')::integer,0)+(case when v_outcome='success' then 0 else 1 end);
    v_state:=v_state || jsonb_build_object(
      'masterPenalty',v_master_penalty,
      'masterScreechFailures',v_master_penalty
    );
  end if;

  update public.raid_sessions
  set state=v_state,updated_at=now()
  where id=p_session_id
  returning state into v_state;

  return jsonb_build_object(
    'ok',true,
    'outcome',v_outcome,
    'state',v_state,
    'maidPenaltyA',coalesce((v_state->>'maidPenaltyA')::integer,0),
    'maidPenaltyB',coalesce((v_state->>'maidPenaltyB')::integer,0),
    'masterPenalty',coalesce((v_state->>'masterPenalty')::integer,0)
  );
end
$$;

revoke all on function public.manor_screech_result_v2(uuid,integer,integer,text) from public;
revoke execute on function public.manor_screech_result_v2(uuid,integer,integer,text) from anon;
grant execute on function public.manor_screech_result_v2(uuid,integer,integer,text) to authenticated;
