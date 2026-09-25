create or replace function public.manor_screech_open_v2(
  p_session_id uuid,
  p_token text,
  p_duration_ms integer
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_session public.raid_sessions%rowtype;
  v_token text := left(btrim(coalesce(p_token,'')),180);
  v_side integer;
  v_duration integer := greatest(2500, least(coalesce(p_duration_ms,4500),7000));
  v_deadline timestamptz;
  v_prompts jsonb;
  v_prompt jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_token='' then raise exception 'Screech token is required'; end if;

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

  v_side := case when v_user=v_session.leader_id then 0 else 1 end;
  v_prompts := coalesce(v_session.state->'screechPrompts','{}'::jsonb);

  if v_prompts ? v_token then
    return jsonb_build_object('ok',true,'state',v_session.state,'prompt',v_prompts->v_token,'existing',true);
  end if;

  v_deadline := now() + make_interval(secs => v_duration / 1000.0);
  v_prompt := jsonb_build_object(
    'side',v_side,
    'stage',v_session.stage,
    'deadline',v_deadline,
    'resolved',false
  );
  v_prompts := v_prompts || jsonb_build_object(v_token,v_prompt);

  update public.raid_sessions
     set state=jsonb_set(state,'{screechPrompts}',v_prompts,true),
         updated_at=now()
   where id=p_session_id
   returning state into v_session.state;

  return jsonb_build_object('ok',true,'state',v_session.state,'prompt',v_prompt);
end
$$;

create or replace function public.manor_screech_result_v2(
  p_session_id uuid,
  p_token text,
  p_result text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_session public.raid_sessions%rowtype;
  v_token text := left(btrim(coalesce(p_token,'')),180);
  v_result text := lower(btrim(coalesce(p_result,'')));
  v_prompt jsonb;
  v_prompts jsonb;
  v_deadline timestamptz;
  v_side integer;
  v_caller_side integer;
  v_own_count_key text;
  v_own_success_key text;
  v_count integer;
  v_successes integer;
  v_penalty_a integer;
  v_penalty_b integer;
  v_failures integer;
  v_timeouts integer;
  v_patch jsonb := '{}'::jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_token='' then raise exception 'Screech token is required'; end if;
  if v_result not in ('success','wrong','timeout') then raise exception 'Invalid Screech result'; end if;

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

  v_prompts := coalesce(v_session.state->'screechPrompts','{}'::jsonb);
  v_prompt := v_prompts->v_token;
  if v_prompt is null then raise exception 'Screech prompt was not registered'; end if;

  if coalesce((v_prompt->>'resolved')::boolean,false) then
    return jsonb_build_object('ok',true,'state',v_session.state,'result',v_prompt->>'result','stale',true);
  end if;

  if coalesce(v_prompt->>'stage','')<>v_session.stage then
    return jsonb_build_object('ok',true,'state',v_session.state,'stale',true);
  end if;

  v_side := coalesce((v_prompt->>'side')::integer,0);
  v_caller_side := case when v_user=v_session.leader_id then 0 else 1 end;
  v_deadline := (v_prompt->>'deadline')::timestamptz;

  if now() >= v_deadline then
    v_result := 'timeout';
  elsif v_result='timeout' then
    return jsonb_build_object('ok',true,'state',v_session.state,'pending',true,'deadline',v_deadline);
  elsif v_caller_side<>v_side then
    raise exception 'Only the targeted commander can answer this Screech';
  end if;

  if v_session.stage='maids' then
    v_own_count_key := case when v_side=0 then 'screechCountA' else 'screechCountB' end;
    v_own_success_key := case when v_side=0 then 'screechSuccessA' else 'screechSuccessB' end;
    v_count := coalesce((v_session.state->>v_own_count_key)::integer,0)+1;
    v_successes := coalesce((v_session.state->>v_own_success_key)::integer,0)+(case when v_result='success' then 1 else 0 end);
    v_penalty_a := coalesce((v_session.state->>'maidPenaltyA')::integer,0);
    v_penalty_b := coalesce((v_session.state->>'maidPenaltyB')::integer,0);

    if v_result='wrong' then
      if v_side=0 then v_penalty_b:=v_penalty_b+1; else v_penalty_a:=v_penalty_a+1; end if;
    elsif v_result='timeout' then
      v_penalty_a:=v_penalty_a+1;
      v_penalty_b:=v_penalty_b+1;
    end if;

    v_patch := jsonb_build_object(
      v_own_count_key,v_count,
      v_own_success_key,v_successes,
      'maidPenaltyA',v_penalty_a,
      'maidPenaltyB',v_penalty_b
    );
  else
    v_failures := coalesce((v_session.state->>'masterScreechFailures')::integer,0)
      + case when v_result='success' then 0 else 1 end;
    v_timeouts := coalesce((v_session.state->>'masterScreechTimeouts')::integer,0)
      + case when v_result='timeout' then 1 else 0 end;
    v_patch := jsonb_build_object(
      'masterScreechFailures',v_failures,
      'masterScreechTimeouts',v_timeouts
    );
  end if;

  v_prompt := v_prompt || jsonb_build_object(
    'resolved',true,
    'result',v_result,
    'resolvedAt',now()
  );
  v_prompts := v_prompts || jsonb_build_object(v_token,v_prompt);
  v_patch := v_patch || jsonb_build_object('screechPrompts',v_prompts);

  update public.raid_sessions
     set state=state || v_patch,
         updated_at=now()
   where id=p_session_id
   returning state into v_session.state;

  return jsonb_build_object(
    'ok',true,
    'state',v_session.state,
    'result',v_result,
    'scope',case
      when v_session.stage='housebound' and v_result<>'success' then 'raid'
      when v_session.stage='maids' and v_result='timeout' then 'both'
      when v_session.stage='maids' and v_result='wrong' then 'other'
      else 'none'
    end
  );
end
$$;

revoke all on function public.manor_screech_open_v2(uuid,text,integer) from public;
revoke all on function public.manor_screech_result_v2(uuid,text,text) from public;
revoke execute on function public.manor_screech_open_v2(uuid,text,integer) from anon;
revoke execute on function public.manor_screech_result_v2(uuid,text,text) from anon;
grant execute on function public.manor_screech_open_v2(uuid,text,integer) to authenticated;
grant execute on function public.manor_screech_result_v2(uuid,text,text) to authenticated;
