-- Beta operations foundation: tester reports, admin triage and safe recovery tools.
-- Players can create/read only their own reports. Admin reads/updates go through
-- server-verified RPCs and never rely on browser-visible email checks.

create table if not exists public.beta_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category = any (array['bug'::text,'ui'::text,'balance'::text,'account'::text,'other'::text])),
  severity text not null check (severity = any (array['low'::text,'medium'::text,'high'::text,'blocker'::text])),
  summary text not null check (char_length(btrim(summary)) between 4 and 120),
  details text not null default '' check (char_length(details) <= 4000),
  page_view text not null default '' check (char_length(page_view) <= 80),
  build_id text not null default '' check (char_length(build_id) <= 80),
  build_number bigint not null default 0 check (build_number >= 0),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'::text),
  status text not null default 'new' check (status = any (array['new'::text,'triaged'::text,'in_progress'::text,'fixed'::text,'closed'::text])),
  admin_note text not null default '' check (char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.beta_reports is 'Player-submitted Cellbound beta feedback and bug reports.';

alter table public.beta_reports enable row level security;

revoke all on table public.beta_reports from anon, authenticated;
grant select on table public.beta_reports to authenticated;
grant insert (category,severity,summary,details,page_view,build_id,build_number,context) on table public.beta_reports to authenticated;

drop policy if exists "Players can read their own beta reports" on public.beta_reports;
create policy "Players can read their own beta reports"
on public.beta_reports for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Players can submit their own beta reports" on public.beta_reports;
create policy "Players can submit their own beta reports"
on public.beta_reports for insert
to authenticated
with check ((select auth.uid()) = user_id);

create index if not exists beta_reports_user_created_idx
  on public.beta_reports(user_id, created_at desc);

create index if not exists beta_reports_status_created_idx
  on public.beta_reports(status, created_at desc);

create or replace function public.cellbound_admin_beta_reports(
  p_status text default null,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_status text := nullif(lower(btrim(coalesce(p_status,''))),'');
  v_limit integer := greatest(1, least(coalesce(p_limit,100), 200));
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.cellbound_admins a where a.user_id=v_uid) then
    raise exception 'Admin access required';
  end if;
  if v_status is not null and v_status not in ('new','triaged','in_progress','fixed','closed') then
    raise exception 'Invalid report status';
  end if;

  select coalesce(jsonb_agg(row_data order by created_at desc),'[]'::jsonb)
  into v_rows
  from (
    select
      r.created_at,
      jsonb_build_object(
        'id',r.id,
        'user_id',r.user_id,
        'email',coalesce(u.email,''),
        'guild_name',coalesce(g.guild_name,''),
        'category',r.category,
        'severity',r.severity,
        'summary',r.summary,
        'details',r.details,
        'page_view',r.page_view,
        'build_id',r.build_id,
        'build_number',r.build_number,
        'context',r.context,
        'status',r.status,
        'admin_note',r.admin_note,
        'created_at',r.created_at,
        'updated_at',r.updated_at
      ) as row_data
    from public.beta_reports r
    left join auth.users u on u.id=r.user_id
    left join public.guild_accounts g on g.user_id=r.user_id
    where v_status is null or r.status=v_status
    order by r.created_at desc
    limit v_limit
  ) q;

  return v_rows;
end;
$function$;

create or replace function public.cellbound_admin_update_beta_report(
  p_report_id uuid,
  p_status text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_status text := lower(btrim(coalesce(p_status,'')));
  v_row public.beta_reports%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.cellbound_admins a where a.user_id=v_uid) then
    raise exception 'Admin access required';
  end if;
  if v_status not in ('new','triaged','in_progress','fixed','closed') then
    raise exception 'Invalid report status';
  end if;

  update public.beta_reports
  set status=v_status,
      admin_note=left(coalesce(p_note,''),2000),
      updated_at=now()
  where id=p_report_id
  returning * into v_row;

  if v_row.id is null then raise exception 'Beta report not found'; end if;

  return jsonb_build_object(
    'id',v_row.id,
    'status',v_row.status,
    'admin_note',v_row.admin_note,
    'updated_at',v_row.updated_at
  );
end;
$function$;

create or replace function public.cellbound_admin_player_lookup(p_lookup text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_lookup text := lower(btrim(coalesce(p_lookup,'')));
  v_target uuid;
  v_email text;
  v_guild text;
  v_state jsonb;
  v_roster_count integer := 0;
  v_shock_count integer := 0;
  v_active_attempts integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.cellbound_admins a where a.user_id=v_uid) then
    raise exception 'Admin access required';
  end if;
  if char_length(v_lookup) < 3 then raise exception 'Enter an email, guild name or account ID'; end if;

  select u.id,u.email,g.guild_name,g.game_state
  into v_target,v_email,v_guild,v_state
  from auth.users u
  left join public.guild_accounts g on g.user_id=u.id
  where lower(coalesce(u.email,''))=v_lookup
     or lower(coalesce(g.guild_name,''))=v_lookup
     or lower(u.id::text)=v_lookup
  order by case when lower(coalesce(u.email,''))=v_lookup then 0
                when lower(coalesce(g.guild_name,''))=v_lookup then 1 else 2 end
  limit 1;

  if v_target is null then raise exception 'Player not found'; end if;

  v_roster_count := jsonb_array_length(coalesce(v_state->'roster','[]'::jsonb));
  select count(*)::integer into v_shock_count
  from jsonb_array_elements(coalesce(v_state->'roster','[]'::jsonb)) member
  where coalesce((member->>'cellShock')::numeric,0)>0
     or nullif(member->>'cellShockLockedUntil','') is not null;

  select count(*)::integer into v_active_attempts
  from public.dungeon_attempts d
  where d.user_id=v_target and d.status='active';

  return jsonb_build_object(
    'user_id',v_target,
    'email',coalesce(v_email,''),
    'guild_name',coalesce(v_guild,''),
    'roster_count',v_roster_count,
    'cell_shock_affected',v_shock_count,
    'active_dungeon_attempts',v_active_attempts,
    'onboarding_stage',coalesce(v_state->'onboarding'->>'stage','unknown'),
    'onboarding_complete',coalesce((v_state->'onboarding'->>'complete')::boolean,false),
    'updated_at',(select g.updated_at from public.guild_accounts g where g.user_id=v_target)
  );
end;
$function$;

create or replace function public.cellbound_admin_recover_player(
  p_user_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_action text := lower(btrim(coalesce(p_action,'')));
  v_rows integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.cellbound_admins a where a.user_id=v_uid) then
    raise exception 'Admin access required';
  end if;
  if p_user_id is null or not exists(select 1 from auth.users u where u.id=p_user_id) then
    raise exception 'Player not found';
  end if;

  if v_action='cell_shock' then
    update public.guild_accounts g
    set game_state=jsonb_set(
          coalesce(g.game_state,'{}'::jsonb),
          '{roster}',
          coalesce((
            select jsonb_agg(
              jsonb_set(
                jsonb_set(member,'{cellShock}','0'::jsonb,true),
                '{cellShockLockedUntil}','null'::jsonb,true
              )
            )
            from jsonb_array_elements(coalesce(g.game_state->'roster','[]'::jsonb)) member
          ),'[]'::jsonb),
          true
        ),
        updated_at=now()
    where g.user_id=p_user_id;
    get diagnostics v_rows = row_count;

  elsif v_action='dungeon_attempts' then
    update public.dungeon_attempts d
    set status='abandoned',
        completed_at=now(),
        runtime_state=coalesce(d.runtime_state,'{}'::jsonb) || jsonb_build_object(
          'phase','abandoned',
          'adminRecoveredAt',now(),
          'adminRecoveredBy',v_uid
        ),
        runtime_updated_at=now()
    where d.user_id=p_user_id and d.status='active';
    get diagnostics v_rows = row_count;

  elsif v_action='twelve_below' then
    update public.guild_accounts g
    set game_state=jsonb_set(
          coalesce(g.game_state,'{}'::jsonb),
          '{twelveBelow}',
          coalesce(g.game_state->'twelveBelow','{}'::jsonb) ||
            jsonb_build_object('date',to_char(current_date,'YYYY-MM-DD'),'attemptsUsed',0),
          true
        ),
        updated_at=now()
    where g.user_id=p_user_id;
    get diagnostics v_rows = row_count;

  else
    raise exception 'Unsupported recovery action';
  end if;

  return jsonb_build_object(
    'ok',true,
    'action',v_action,
    'rows_changed',v_rows,
    'player',public.cellbound_admin_player_lookup(p_user_id::text)
  );
end;
$function$;

revoke all on function public.cellbound_admin_beta_reports(text,integer) from public;
revoke all on function public.cellbound_admin_update_beta_report(uuid,text,text) from public;
revoke all on function public.cellbound_admin_player_lookup(text) from public;
revoke all on function public.cellbound_admin_recover_player(uuid,text) from public;

revoke execute on function public.cellbound_admin_beta_reports(text,integer) from anon;
revoke execute on function public.cellbound_admin_update_beta_report(uuid,text,text) from anon;
revoke execute on function public.cellbound_admin_player_lookup(text) from anon;
revoke execute on function public.cellbound_admin_recover_player(uuid,text) from anon;

grant execute on function public.cellbound_admin_beta_reports(text,integer) to authenticated;
grant execute on function public.cellbound_admin_update_beta_report(uuid,text,text) to authenticated;
grant execute on function public.cellbound_admin_player_lookup(text) to authenticated;
grant execute on function public.cellbound_admin_recover_player(uuid,text) to authenticated;
