-- Cellbound High Scores v1: public, carefully redacted profession rankings.
-- Scores originate from saved guild state; no auth IDs, emails or full saves are exposed.
create table if not exists public.cellbound_profession_highscores (
  score_key text primary key,
  guild_name text not null,
  character_name text not null,
  profession text not null,
  level integer not null check (level between 1 and 100),
  xp bigint not null check (xp >= 0),
  updated_at timestamptz not null default now(),
  constraint cellbound_profession_highscores_profession_check check (
    profession in ('Alchemy','Enchanting','Blacksmithing','Leatherworking','Tailoring',
                   'Jewelcrafting','Engineering','Cooking','Reliccrafting','Scribing')
  )
);
create index if not exists cellbound_profession_highscores_order
  on public.cellbound_profession_highscores (profession, level desc, xp desc, guild_name, character_name);
alter table public.cellbound_profession_highscores enable row level security;
drop policy if exists cellbound_scores_public_read on public.cellbound_profession_highscores;
create policy cellbound_scores_public_read
  on public.cellbound_profession_highscores for select to anon, authenticated using (true);
revoke all on public.cellbound_profession_highscores from public, anon, authenticated;
grant select (guild_name, character_name, profession, level, xp, updated_at)
  on public.cellbound_profession_highscores to anon, authenticated;

-- The trigger is in an unexposed schema, not a public callable SECURITY DEFINER API.
create schema if not exists cellbound_internal;
revoke all on schema cellbound_internal from public, anon, authenticated;

create or replace function cellbound_internal.refresh_profession_highscores()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_scores jsonb := '[]'::jsonb;
  new_scores jsonb := '[]'::jsonb;
  old_roster jsonb := '[]'::jsonb;
  new_roster jsonb := '[]'::jsonb;
begin
  if tg_op <> 'INSERT' then
    old_roster := case when jsonb_typeof(old.game_state->'roster') = 'array'
      then old.game_state->'roster' else '[]'::jsonb end;
    select coalesce(jsonb_agg(jsonb_build_array(ch.item->>'id', ch.item->>'name',
      prof.item->>'name', prof.item->>'level', prof.item->>'xp')
      order by ch.n, prof.n), '[]'::jsonb) into old_scores
    from jsonb_array_elements(old_roster) with ordinality as ch(item,n)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array'
      then ch.item->'professions' else '[]'::jsonb end) with ordinality as prof(item,n)
    where prof.item->>'name' is not null;
  end if;
  if tg_op <> 'DELETE' then
    new_roster := case when jsonb_typeof(new.game_state->'roster') = 'array'
      then new.game_state->'roster' else '[]'::jsonb end;
    select coalesce(jsonb_agg(jsonb_build_array(ch.item->>'id', ch.item->>'name',
      prof.item->>'name', prof.item->>'level', prof.item->>'xp')
      order by ch.n, prof.n), '[]'::jsonb) into new_scores
    from jsonb_array_elements(new_roster) with ordinality as ch(item,n)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array'
      then ch.item->'professions' else '[]'::jsonb end) with ordinality as prof(item,n)
    where prof.item->>'name' is not null;
  end if;
  -- Frequent gameplay saves do not touch the scoreboard unless public scores change.
  if tg_op = 'UPDATE'
     and new.guild_name is not distinct from old.guild_name
     and old_scores = new_scores then
    return new;
  end if;

  if tg_op <> 'INSERT' then
    delete from public.cellbound_profession_highscores as scores
    where scores.score_key in (
      select encode(sha256(convert_to(old.user_id::text || ':' ||
        coalesce(nullif(ch.item->>'id',''), ch.n::text) || ':' ||
        (prof.item->>'name'), 'UTF8')), 'hex')
      from jsonb_array_elements(old_roster) with ordinality as ch(item,n)
      cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array'
        then ch.item->'professions' else '[]'::jsonb end) as prof(item)
      where prof.item->>'name' is not null
    );
  end if;
  if tg_op <> 'DELETE' then
    insert into public.cellbound_profession_highscores
      (score_key, guild_name, character_name, profession, level, xp, updated_at)
    select
      encode(sha256(convert_to(new.user_id::text || ':' ||
        coalesce(nullif(ch.item->>'id',''), ch.n::text) || ':' ||
        (prof.item->>'name'), 'UTF8')), 'hex'),
      left(coalesce(nullif(btrim(new.guild_name),''),nullif(btrim(new.game_state->>'socialDisplayName'),''),'Unnamed Guild'),48),
      left(btrim(ch.item->>'name'),48),
      prof.item->>'name',
      least(100, greatest(1, (prof.item->>'level')::integer)),
      greatest(0, (prof.item->>'xp')::bigint),
      coalesce(new.updated_at, now())
    from jsonb_array_elements(new_roster) with ordinality as ch(item,n)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array'
      then ch.item->'professions' else '[]'::jsonb end) as prof(item)
    where nullif(btrim(ch.item->>'name'),'') is not null
      and prof.item->>'name' in ('Alchemy','Enchanting','Blacksmithing','Leatherworking','Tailoring',
                 'Jewelcrafting','Engineering','Cooking','Reliccrafting','Scribing')
      and (prof.item->>'level') ~ '^[0-9]{1,3}$'
      and (prof.item->>'xp') ~ '^[0-9]{1,15}$'
    on conflict (score_key) do update set
      guild_name = excluded.guild_name, character_name = excluded.character_name,
      profession = excluded.profession, level = excluded.level, xp = excluded.xp,
      updated_at = excluded.updated_at;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function cellbound_internal.refresh_profession_highscores() from public,anon,authenticated;

drop trigger if exists cellbound_refresh_profession_highscores on public.guild_accounts;
create trigger cellbound_refresh_profession_highscores
after insert or update of game_state, guild_name or delete on public.guild_accounts
for each row execute function cellbound_internal.refresh_profession_highscores();

-- Initial fill without updating guild save timestamps or invoking game mutation logic.
insert into public.cellbound_profession_highscores
  (score_key, guild_name, character_name, profession, level, xp, updated_at)
select
  encode(sha256(convert_to(ga.user_id::text || ':' ||
    coalesce(nullif(ch.item->>'id',''), ch.n::text) || ':' ||
    (prof.item->>'name'), 'UTF8')), 'hex'),
  left(coalesce(nullif(btrim(ga.guild_name),''),nullif(btrim(ga.game_state->>'socialDisplayName'),''),'Unnamed Guild'),48),
  left(btrim(ch.item->>'name'),48),
  prof.item->>'name',
  least(100, greatest(1, (prof.item->>'level')::integer)),
  greatest(0, (prof.item->>'xp')::bigint),
  coalesce(ga.updated_at,now())
from public.guild_accounts as ga
cross join lateral jsonb_array_elements(case when jsonb_typeof(ga.game_state->'roster')='array'
  then ga.game_state->'roster' else '[]'::jsonb end) with ordinality as ch(item,n)
cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array'
  then ch.item->'professions' else '[]'::jsonb end) as prof(item)
where nullif(btrim(ch.item->>'name'),'') is not null
  and prof.item->>'name' in ('Alchemy','Enchanting','Blacksmithing','Leatherworking','Tailoring',
               'Jewelcrafting','Engineering','Cooking','Reliccrafting','Scribing')
  and (prof.item->>'level') ~ '^[0-9]{1,3}$'
  and (prof.item->>'xp') ~ '^[0-9]{1,15}$'
on conflict(score_key) do update set
 guild_name=excluded.guild_name, character_name=excluded.character_name,
 profession=excluded.profession, level=excluded.level, xp=excluded.xp,
 updated_at=excluded.updated_at;
