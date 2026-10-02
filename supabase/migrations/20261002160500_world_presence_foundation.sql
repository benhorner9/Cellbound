-- Phase 3 Living World presence foundation.
-- Broad location only: no character, inventory, progression, email, or save-state data.

create table if not exists public.cellbound_world_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  zone text not null,
  updated_at timestamptz not null default now(),
  constraint cellbound_world_presence_zone_check check (
    zone = any (array[
      'town'::text,'guild'::text,'inn'::text,'bank'::text,'craft'::text,
      'quests'::text,'dungeons'::text,'activities'::text,'raids'::text,
      'market'::text,'social'::text,'arena'::text
    ])
  )
);
alter table public.cellbound_world_presence enable row level security;
revoke all on table public.cellbound_world_presence from anon;
revoke all on table public.cellbound_world_presence from authenticated;

create or replace function public.cellbound_world_presence_heartbeat(p_zone text)
returns table (presence_key text,guild_name text,zone text,updated_at timestamptz,is_self boolean)
language plpgsql security definer set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_zone text := lower(trim(coalesce(p_zone,'')));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not (v_zone = any (array[
    'town'::text,'guild'::text,'inn'::text,'bank'::text,'craft'::text,
    'quests'::text,'dungeons'::text,'activities'::text,'raids'::text,
    'market'::text,'social'::text,'arena'::text
  ])) then raise exception 'Invalid world zone'; end if;
  insert into public.cellbound_world_presence(user_id,zone,updated_at)
  values (v_uid,v_zone,now())
  on conflict (user_id) do update set zone=excluded.zone,updated_at=excluded.updated_at;
  delete from public.cellbound_world_presence where updated_at < now()-interval '5 minutes';
  return query
  select md5(p.user_id::text||':cellbound-world-presence-v1'),
         coalesce(nullif(trim(g.guild_name),''),'Unnamed Guild'),
         p.zone,p.updated_at,(p.user_id=v_uid)
  from public.cellbound_world_presence p
  left join public.guild_accounts g on g.user_id=p.user_id
  where p.updated_at > now()-interval '45 seconds'
  order by p.updated_at desc
  limit 40;
end;
$function$;

create or replace function public.cellbound_world_presence_leave()
returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if auth.uid() is null then return; end if;
  delete from public.cellbound_world_presence where user_id=auth.uid();
end;
$function$;

revoke execute on function public.cellbound_world_presence_heartbeat(text) from public;
revoke execute on function public.cellbound_world_presence_heartbeat(text) from anon;
grant execute on function public.cellbound_world_presence_heartbeat(text) to authenticated;
revoke execute on function public.cellbound_world_presence_leave() from public;
revoke execute on function public.cellbound_world_presence_leave() from anon;
grant execute on function public.cellbound_world_presence_leave() to authenticated;
