insert into public.analytics_events(
  user_id,event_name,event_key,session_id,channel,build_id,build_number,page_view,properties,created_at
)
select
  g.user_id,
  'character_created',
  'character_created:'||(member->>'id'),
  'server-baseline',
  'staging',
  'analytics-rollout',
  0,
  'migration',
  jsonb_build_object(
    'character_id',member->>'id',
    'class',coalesce(member->>'class','Unknown'),
    'race',coalesce(member->>'race','Unknown'),
    'spec',coalesce(member->>'spec',''),
    'role',coalesce(member->>'role',''),
    'source','staging_baseline'
  ),
  now()
from public.guild_accounts g
cross join lateral jsonb_array_elements(coalesce(g.game_state->'roster','[]'::jsonb)) member
where coalesce(member->>'id','')<>''
on conflict (user_id,event_key) where event_key is not null and event_key <> '' do nothing;
