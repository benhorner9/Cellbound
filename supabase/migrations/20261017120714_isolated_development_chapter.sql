-- Schema-only snapshot of the existing game. No accounts, credentials or player rows.
-- Reviewed deployment target: Cellbound Development only.
begin;
set check_function_bodies=off;
set search_path=public,extensions;
create table public."analytics_events" (
 "id" bigint generated always as identity not null,
 "user_id" uuid not null,
 "event_name" text not null,
 "event_key" text,
 "session_id" text not null,
 "channel" text not null,
 "build_id" text not null,
 "build_number" bigint not null,
 "page_view" text not null,
 "properties" jsonb not null,
 "created_at" timestamp with time zone not null
);
alter table public."analytics_events" enable row level security;
create table public."beta_reports" (
 "id" uuid not null,
 "user_id" uuid not null,
 "category" text not null,
 "severity" text not null,
 "summary" text not null,
 "details" text not null,
 "page_view" text not null,
 "build_id" text not null,
 "build_number" bigint not null,
 "context" jsonb not null,
 "status" text not null,
 "admin_note" text not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null
);
alter table public."beta_reports" enable row level security;
create table public."cellbound_admins" (
 "user_id" uuid not null,
 "role" text not null,
 "auto_clear_cell_shock" boolean not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null
);
alter table public."cellbound_admins" enable row level security;
create table public."cellbound_boss_drop_tables" (
 "boss_key" text not null,
 "drops" jsonb not null,
 "updated_by" uuid,
 "updated_at" timestamp with time zone not null
);
alter table public."cellbound_boss_drop_tables" enable row level security;
create table public."cellbound_comic_text" (
 "scene_id" text not null,
 "panels" jsonb not null,
 "updated_by" uuid not null,
 "updated_at" timestamp with time zone not null
);
alter table public."cellbound_comic_text" enable row level security;
create table public."cellbound_design_blueprints" (
 "id" uuid not null,
 "slug" text not null,
 "content_type" text not null,
 "title" text not null,
 "status" text not null,
 "blueprint" jsonb not null,
 "version" integer not null,
 "created_by" uuid not null,
 "updated_by" uuid not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null,
 "published_at" timestamp with time zone,
 "draft_blueprint" jsonb not null
);
alter table public."cellbound_design_blueprints" enable row level security;
create table public."cellbound_design_templates" (
 "id" uuid not null,
 "slug" text not null,
 "kind" text not null,
 "title" text not null,
 "status" text not null,
 "blueprint" jsonb not null,
 "draft_blueprint" jsonb not null,
 "version" integer not null,
 "created_by" uuid not null,
 "updated_by" uuid not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null,
 "published_at" timestamp with time zone
);
alter table public."cellbound_design_templates" enable row level security;
create table public."cellbound_moderators" (
 "user_id" uuid not null,
 "role" text not null,
 "active" boolean not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null
);
alter table public."cellbound_moderators" enable row level security;
create table public."cellbound_profession_highscores" (
 "score_key" text not null,
 "guild_name" text not null,
 "character_name" text not null,
 "profession" text not null,
 "level" integer not null,
 "xp" bigint not null,
 "updated_at" timestamp with time zone not null
);
alter table public."cellbound_profession_highscores" enable row level security;
create table public."cellbound_pvp_commands" (
 "match_id" uuid not null,
 "user_id" uuid not null,
 "sequence" bigint not null,
 "category" text not null,
 "value" text not null,
 "accepted" boolean not null,
 "rejection_reason" text,
 "received_at" timestamp with time zone not null
);
alter table public."cellbound_pvp_commands" enable row level security;
create table public."cellbound_pvp_map_drafts" (
 "id" text not null,
 "mode" text not null,
 "title" text not null,
 "layout" jsonb not null,
 "art_path" text,
 "updated_at" timestamp with time zone not null,
 "updated_by" uuid not null
);
alter table public."cellbound_pvp_map_drafts" enable row level security;
create table public."cellbound_pvp_maps" (
 "id" text not null,
 "mode" text not null,
 "title" text not null,
 "layout" jsonb not null,
 "art_path" text,
 "version" integer not null,
 "published_at" timestamp with time zone not null,
 "updated_by" uuid not null
);
alter table public."cellbound_pvp_maps" enable row level security;
create table public."cellbound_pvp_match_events" (
 "match_id" uuid not null,
 "sequence" bigint not null,
 "kind" text not null,
 "payload" jsonb not null,
 "recorded_at" timestamp with time zone not null
);
alter table public."cellbound_pvp_match_events" enable row level security;
create table public."cellbound_pvp_match_participants" (
 "match_id" uuid not null,
 "user_id" uuid not null,
 "team" text not null,
 "ready" boolean not null,
 "connected" boolean not null,
 "last_command_sequence" bigint not null,
 "joined_at" timestamp with time zone not null,
 "disconnected_at" timestamp with time zone
);
alter table public."cellbound_pvp_match_participants" enable row level security;
create table public."cellbound_pvp_match_rosters" (
 "match_id" uuid not null,
 "user_id" uuid not null,
 "sealed_roster" jsonb not null,
 "sealed_at" timestamp with time zone not null
);
alter table public."cellbound_pvp_match_rosters" enable row level security;
create table public."cellbound_pvp_match_snapshots" (
 "match_id" uuid not null,
 "revision" bigint not null,
 "state" jsonb not null,
 "recorded_at" timestamp with time zone not null
);
alter table public."cellbound_pvp_match_snapshots" enable row level security;
create table public."cellbound_pvp_matches" (
 "id" uuid not null,
 "mode" text not null,
 "squad_size" integer not null,
 "status" text not null,
 "map_id" text,
 "map_snapshot" jsonb,
 "revision" bigint not null,
 "winning_team" text,
 "created_at" timestamp with time zone not null,
 "ready_deadline" timestamp with time zone not null,
 "started_at" timestamp with time zone,
 "completed_at" timestamp with time zone,
 "reason" text
);
alter table public."cellbound_pvp_matches" enable row level security;
create table public."cellbound_pvp_queue_entries" (
 "id" uuid not null,
 "user_id" uuid not null,
 "mode" text not null,
 "squad_size" integer not null,
 "status" text not null,
 "match_id" uuid,
 "joined_at" timestamp with time zone not null,
 "expires_at" timestamp with time zone not null
);
alter table public."cellbound_pvp_queue_entries" enable row level security;
create table public."cellbound_release_state" (
 "singleton" boolean not null,
 "build_id" text,
 "message" text not null,
 "published_at" timestamp with time zone,
 "published_by" uuid,
 "build_number" bigint
);
alter table public."cellbound_release_state" enable row level security;
create table public."cellbound_room_art" (
 "content_id" text not null,
 "room_id" text not null,
 "object_path" text not null,
 "updated_by" uuid not null,
 "updated_at" timestamp with time zone not null
);
alter table public."cellbound_room_art" enable row level security;
create table public."cellbound_room_layouts" (
 "content_id" text not null,
 "room_id" text not null,
 "layout" jsonb not null,
 "version" bigint not null,
 "published_by" uuid not null,
 "published_at" timestamp with time zone not null
);
alter table public."cellbound_room_layouts" enable row level security;
create table public."cellbound_world_presence" (
 "user_id" uuid not null,
 "zone" text not null,
 "updated_at" timestamp with time zone not null
);
alter table public."cellbound_world_presence" enable row level security;
create table public."character_abilities" (
 "id" uuid not null,
 "character_id" uuid not null,
 "ability_key" text not null,
 "ability_name" text not null,
 "hotbar_slot" integer,
 "cooldown_ms" integer not null,
 "metadata" jsonb not null,
 "unlocked_at" timestamp with time zone not null
);
alter table public."character_abilities" enable row level security;
create table public."character_cells" (
 "id" uuid not null,
 "character_id" uuid not null,
 "cell_key" text not null,
 "cell_name" text not null,
 "description" text not null,
 "absorbed" boolean not null,
 "acquired_at" timestamp with time zone not null,
 "absorbed_at" timestamp with time zone
);
alter table public."character_cells" enable row level security;
create table public."characters" (
 "id" uuid not null,
 "user_id" uuid not null,
 "name" text,
 "combat_style" text,
 "tutorial_complete" boolean not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null,
 "appearance" jsonb not null,
 "creation_complete" boolean not null,
 "level" integer not null,
 "xp" integer not null,
 "current_hp" integer not null,
 "max_hp" integer not null,
 "current_location" text not null,
 "tutorial_stage" text not null,
 "tutorial_reward_claimed" boolean not null,
 "last_played_at" timestamp with time zone not null
);
alter table public."characters" enable row level security;
create table public."chat_messages" (
 "id" uuid not null,
 "user_id" uuid not null,
 "guild_label" text not null,
 "channel" text not null,
 "body" text not null,
 "created_at" timestamp with time zone not null,
 "sender_badge" text not null
);
alter table public."chat_messages" enable row level security;
create table public."comic_scene_panel_art" (
 "scene_id" text not null,
 "panel_index" integer not null,
 "object_path" text not null,
 "updated_by" uuid not null,
 "updated_at" timestamp with time zone not null
);
alter table public."comic_scene_panel_art" enable row level security;
create table public."dungeon_affix_rotation" (
 "week_start" date not null,
 "season_id" text not null,
 "minor_affix" text,
 "major_affix" text,
 "created_at" timestamp with time zone not null
);
alter table public."dungeon_affix_rotation" enable row level security;
create table public."dungeon_attempts" (
 "id" uuid not null,
 "user_id" uuid not null,
 "dungeon_id" text not null,
 "difficulty" text not null,
 "tier" integer not null,
 "season_id" text not null,
 "dungeon_version" integer not null,
 "target_time_ms" integer not null,
 "seed" text not null,
 "status" text not null,
 "started_at" timestamp with time zone not null,
 "completed_at" timestamp with time zone,
 "run_id" bigint,
 "invalid_reason" text,
 "party_snapshot" jsonb not null,
 "party_signature" text,
 "party_classes" text[] not null,
 "runtime_state" jsonb not null,
 "runtime_updated_at" timestamp with time zone
);
alter table public."dungeon_attempts" enable row level security;
create table public."dungeon_integrity_events" (
 "id" bigint generated always as identity not null,
 "user_id" uuid not null,
 "attempt_id" uuid,
 "reason" text not null,
 "payload" jsonb not null,
 "created_at" timestamp with time zone not null
);
alter table public."dungeon_integrity_events" enable row level security;
create table public."dungeon_progress" (
 "user_id" uuid not null,
 "dungeon_id" text not null,
 "normal_clears" integer not null,
 "heroic_unlocked" boolean not null,
 "heroic_clears" integer not null,
 "cellbound_unlocked" boolean not null,
 "highest_tier" integer not null,
 "cellbound_clears" integer not null,
 "best_score" integer not null,
 "best_time_ms" integer,
 "updated_at" timestamp with time zone not null
);
alter table public."dungeon_progress" enable row level security;
create table public."dungeon_runs" (
 "id" bigint generated always as identity not null,
 "user_id" uuid not null,
 "guild_label" text not null,
 "dungeon_id" text not null,
 "dungeon_name" text not null,
 "difficulty" text not null,
 "tier" integer not null,
 "season_id" text not null,
 "dungeon_version" integer not null,
 "completion_time_ms" integer not null,
 "target_time_ms" integer,
 "deaths" integer not null,
 "mechanics_failed" integer not null,
 "mistakes" integer not null,
 "score" integer not null,
 "timed" boolean not null,
 "valid" boolean not null,
 "validity_reason" text,
 "created_at" timestamp with time zone not null,
 "missed_interrupts" integer not null,
 "threat_losses" integer not null,
 "avoidable_damage" numeric not null,
 "battle_resurrections" integer not null,
 "attempt_id" uuid,
 "party_snapshot" jsonb not null,
 "party_signature" text,
 "party_classes" text[] not null
);
alter table public."dungeon_runs" enable row level security;
create table public."dungeon_weekly_progress" (
 "user_id" uuid not null,
 "week_start" date not null,
 "season_id" text not null,
 "progress_points" integer not null,
 "highest_tier" integer not null,
 "completed_runs" integer not null,
 "reward_claimed" boolean not null,
 "reward_claimed_at" timestamp with time zone,
 "updated_at" timestamp with time zone not null
);
alter table public."dungeon_weekly_progress" enable row level security;
create table public."endgame_achievements" (
 "user_id" uuid not null,
 "achievement_id" text not null,
 "dungeon_id" text not null,
 "season_id" text not null,
 "unlocked_at" timestamp with time zone not null,
 "metadata" jsonb not null
);
alter table public."endgame_achievements" enable row level security;
create table public."endgame_seasons" (
 "id" text not null,
 "name" text not null,
 "starts_at" timestamp with time zone not null,
 "ends_at" timestamp with time zone,
 "active" boolean not null,
 "created_at" timestamp with time zone not null
);
alter table public."endgame_seasons" enable row level security;
create table public."guild_accounts" (
 "user_id" uuid not null,
 "game_state" jsonb not null,
 "membership_active_until" timestamp with time zone,
 "membership_override" boolean not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null,
 "guild_name" text
);
alter table public."guild_accounts" enable row level security;
create table public."inventory_items" (
 "id" uuid not null,
 "character_id" uuid not null,
 "item_key" text not null,
 "item_name" text not null,
 "item_type" text not null,
 "quantity" integer not null,
 "rarity" text not null,
 "metadata" jsonb not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null
);
alter table public."inventory_items" enable row level security;
create table public."market_commodity_orders" (
 "id" uuid not null,
 "user_id" uuid not null,
 "side" text not null,
 "category" text not null,
 "item_key" text not null,
 "item_name" text not null,
 "rarity" text not null,
 "payload" jsonb not null,
 "quantity_initial" integer not null,
 "quantity_remaining" integer not null,
 "unit_price" integer not null,
 "reserved_gold" integer not null,
 "status" text not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null,
 "expires_at" timestamp with time zone not null
);
alter table public."market_commodity_orders" enable row level security;
create table public."market_saved_searches" (
 "id" uuid not null,
 "user_id" uuid not null,
 "name" text not null,
 "filters" jsonb not null,
 "created_at" timestamp with time zone not null
);
alter table public."market_saved_searches" enable row level security;
create table public."market_transactions" (
 "id" uuid not null,
 "buyer_id" uuid,
 "seller_id" uuid,
 "category" text not null,
 "item_key" text not null,
 "item_name" text not null,
 "rarity" text,
 "payload" jsonb not null,
 "quantity" integer not null,
 "unit_price" integer not null,
 "gross_gold" integer not null,
 "tax_gold" integer not null,
 "net_gold" integer not null,
 "source" text not null,
 "listing_id" uuid,
 "buy_order_id" uuid,
 "sell_order_id" uuid,
 "created_at" timestamp with time zone not null
);
alter table public."market_transactions" enable row level security;
create table public."market_watchlist" (
 "user_id" uuid not null,
 "category" text not null,
 "item_key" text not null,
 "item_name" text not null,
 "target_price" integer,
 "created_at" timestamp with time zone not null
);
alter table public."market_watchlist" enable row level security;
create table public."party_finder_listings" (
 "id" uuid not null,
 "leader_id" uuid not null,
 "guild_label" text not null,
 "content_type" text not null,
 "target_id" text not null,
 "target_label" text not null,
 "note" text not null,
 "party_ilvl" numeric(8,2) not null,
 "player_cap" integer not null,
 "status" text not null,
 "created_at" timestamp with time zone not null,
 "expires_at" timestamp with time zone not null
);
alter table public."party_finder_listings" enable row level security;
create table public."party_finder_members" (
 "listing_id" uuid not null,
 "user_id" uuid not null,
 "guild_label" text not null,
 "party_ilvl" numeric(8,2) not null,
 "joined_at" timestamp with time zone not null,
 "party_snapshot" jsonb not null
);
alter table public."party_finder_members" enable row level security;
create table public."profiles" (
 "user_id" uuid not null,
 "display_name" text,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null
);
alter table public."profiles" enable row level security;
create table public."quest_progress" (
 "id" uuid not null,
 "character_id" uuid not null,
 "quest_key" text not null,
 "quest_title" text not null,
 "status" text not null,
 "objective_index" integer not null,
 "data" jsonb not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null
);
alter table public."quest_progress" enable row level security;
create table public."raid_lockouts" (
 "user_id" uuid not null,
 "raid_id" text not null,
 "window_start" timestamp with time zone not null,
 "runs_used" integer not null,
 "updated_at" timestamp with time zone not null
);
alter table public."raid_lockouts" enable row level security;
create table public."raid_reward_claims" (
 "session_id" uuid not null,
 "user_id" uuid not null,
 "reward_payload" jsonb not null,
 "claimed_at" timestamp with time zone not null
);
alter table public."raid_reward_claims" enable row level security;
create table public."raid_sessions" (
 "id" uuid not null,
 "listing_id" uuid not null,
 "raid_id" text not null,
 "leader_id" uuid not null,
 "status" text not null,
 "stage" text not null,
 "state" jsonb not null,
 "started_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null,
 "completed_at" timestamp with time zone
);
alter table public."raid_sessions" enable row level security;
create table public."trading_post_listings" (
 "id" uuid not null,
 "seller_id" uuid not null,
 "seller_label" text not null,
 "category" text not null,
 "item_key" text not null,
 "item_name" text not null,
 "payload" jsonb not null,
 "quantity" integer not null,
 "unit_price" integer not null,
 "status" text not null,
 "created_at" timestamp with time zone not null,
 "updated_at" timestamp with time zone not null,
 "rarity" text,
 "item_level" integer,
 "item_class" text,
 "slot" text,
 "original_quantity" integer,
 "sold_quantity" integer not null,
 "expires_at" timestamp with time zone
);
alter table public."trading_post_listings" enable row level security;
create table public."trading_post_proceeds" (
 "id" uuid not null,
 "seller_id" uuid not null,
 "listing_id" uuid,
 "gross_gold" integer not null,
 "tax_gold" integer not null,
 "net_gold" integer not null,
 "claimed" boolean not null,
 "created_at" timestamp with time zone not null,
 "claimed_at" timestamp with time zone
);
alter table public."trading_post_proceeds" enable row level security;
create table public."world_boss_participants" (
 "boss_id" text not null,
 "generation" integer not null,
 "user_id" uuid not null,
 "guild_label" text not null,
 "party_ilvl" numeric(8,2) not null,
 "damage_done" integer not null,
 "joined_at" timestamp with time zone not null,
 "last_attack_at" timestamp with time zone,
 "threat_done" integer not null,
 "healing_done" integer not null,
 "threat_breakdown" jsonb not null,
 "combat_state" jsonb not null,
 "combat_event_seq" integer not null,
 "combat_pulse_token" uuid,
 "combat_pulse_started_at" timestamp with time zone
);
alter table public."world_boss_participants" enable row level security;
create table public."world_boss_rewards" (
 "id" uuid not null,
 "boss_id" text not null,
 "boss_name" text not null,
 "generation" integer not null,
 "user_id" uuid not null,
 "item_tier" integer not null,
 "item_key" text not null,
 "claimed" boolean not null,
 "created_at" timestamp with time zone not null,
 "claimed_at" timestamp with time zone
);
alter table public."world_boss_rewards" enable row level security;
create table public."world_bosses" (
 "id" text not null,
 "name" text not null,
 "tier" integer not null,
 "required_party_ilvl" integer not null,
 "player_cap" integer not null,
 "max_hp" integer not null,
 "current_hp" integer not null,
 "status" text not null,
 "generation" integer not null,
 "active_since" timestamp with time zone,
 "last_killed_at" timestamp with time zone,
 "next_spawn_at" timestamp with time zone,
 "updated_at" timestamp with time zone not null
);
alter table public."world_bosses" enable row level security;
CREATE OR REPLACE FUNCTION public.absorb_tutorial_troll_cell(p_character_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  absorbed_now boolean := false;
begin
  update public.character_cells cc
     set absorbed = true, absorbed_at = now()
   where cc.character_id = p_character_id
     and cc.cell_key = 'troll_cell'
     and cc.absorbed = false
     and exists (select 1 from public.characters c where c.id = cc.character_id and c.user_id = (select auth.uid()))
  returning true into absorbed_now;

  if coalesce(absorbed_now,false) is false then
    return false;
  end if;

  delete from public.inventory_items
   where character_id = p_character_id and item_key = 'troll_cell';

  insert into public.character_abilities(character_id,ability_key,ability_name,hotbar_slot,cooldown_ms,metadata)
  values (p_character_id,'troll_slam','Troll Slam',2,6000,'{"description":"Channel the Troll Cell into a crushing short-range slam.","damage":42,"range":82}'::jsonb)
  on conflict (character_id,ability_key) do nothing;

  update public.characters
     set tutorial_stage = 'cell_absorbed', updated_at = now(), last_played_at = now()
   where id = p_character_id and user_id = (select auth.uid());

  return true;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.advance_manor_raid(p_session_id uuid, p_expected_stage text, p_next_stage text, p_patch jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_session public.raid_sessions%rowtype;
  v_status text:='active';
  v_completed timestamptz:=null;
  v_expected_next text;
  v_started timestamptz;
  v_elapsed numeric;
  v_min_seconds numeric;
  v_a integer;
  v_b integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.raid_sessions where id=p_session_id for update;
  if not found then raise exception 'Raid session not found'; end if;
  if v_session.leader_id<>v_user then raise exception 'Only the raid leader can advance encounters'; end if;
  if v_session.status<>'active' then return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status); end if;
  if v_session.stage<>p_expected_stage then return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status,'stale',true); end if;

  v_expected_next:=case v_session.stage
    when 'butler' then 'maids'
    when 'maids' then 'engineer'
    when 'engineer' then 'bedroom'
    when 'bedroom' then 'housebound'
    when 'housebound' then 'victory'
    else null
  end;
  if v_expected_next is null or p_next_stage<>v_expected_next then raise exception 'Invalid Manor encounter transition'; end if;

  begin
    v_started:=nullif(v_session.state->>'stageStartedAt','')::timestamptz;
  exception when others then
    v_started:=null;
  end;
  if v_started is null or now()<v_started then raise exception 'Both commanders must ready up before the encounter can progress'; end if;

  v_elapsed:=extract(epoch from (now()-v_started));
  v_min_seconds:=case v_session.stage
    when 'butler' then 30
    when 'maids' then 30
    when 'engineer' then 40
    when 'bedroom' then 12
    when 'housebound' then 40
    else 0
  end;
  if v_elapsed<v_min_seconds then raise exception 'Encounter is still in progress'; end if;

  if v_session.stage='maids' then
    v_a:=coalesce((v_session.state->>'screechCountA')::integer,0);
    v_b:=coalesce((v_session.state->>'screechCountB')::integer,0);
    if v_a<1 or v_b<1 then raise exception 'Both players must resolve Screech before the Maids can fall'; end if;
  end if;

  if p_next_stage='victory' then
    v_status:='completed';
    v_completed:=now();
  end if;

  update public.raid_sessions
  set stage=p_next_stage,status=v_status,
      state=case
        when p_next_stage='victory' then state || coalesce(p_patch,'{}'::jsonb)
        else state || coalesce(p_patch,'{}'::jsonb) || jsonb_build_object(
          'stageStartedAt',null,
          'readyStage',p_next_stage,
          'readyA',false,
          'readyB',false,
          'countdownStartedAt',null,
          'encounterStartAt',null
        )
      end,
      updated_at=now(),completed_at=v_completed
  where id=p_session_id
  returning * into v_session;

  if v_status='completed' then
    update public.party_finder_listings
       set status='closed'
     where id=v_session.listing_id
       and status in ('open','full');
  end if;

  return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status,'state',v_session.state,'groupReleased',v_status='completed');
end
$function$
;
CREATE OR REPLACE FUNCTION public.attack_world_boss(p_boss_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  raise exception 'Shared world bosses are temporarily disabled. The Twelve Below remains available.';
end
$function$
;
CREATE OR REPLACE FUNCTION public.begin_dungeon_attempt(p_dungeon_id text, p_difficulty text, p_tier integer, p_dungeon_version integer, p_season_id text DEFAULT 'foundations-1'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_progress public.dungeon_progress%rowtype;
  v_tier integer:=greatest(0,coalesce(p_tier,0));
  v_target integer;
  v_attempt uuid;
  v_seed text;
  v_snapshot jsonb;
  v_signature text;
  v_classes text[];
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_dungeon_id not in ('ashen-vault','hollow-sanctum','chaos-canyon','blackout-station','fractured-ages') then raise exception 'Unknown dungeon'; end if;
  if p_difficulty not in ('normal','heroic','cellbound') then raise exception 'Invalid difficulty'; end if;
  if p_difficulty<>'cellbound' then v_tier:=0; end if;
  if p_difficulty='cellbound' and v_tier not between 1 and 20 then raise exception 'Invalid Cellbound+ tier'; end if;
  if coalesce(p_dungeon_version,0)<1 then raise exception 'Invalid dungeon version'; end if;
  if not exists(select 1 from public.endgame_seasons where id=p_season_id and active=true) then raise exception 'Season is not active'; end if;

  select * into v_progress from public.dungeon_progress where user_id=v_uid and dungeon_id=p_dungeon_id;
  if p_difficulty='heroic' and (not found or not v_progress.heroic_unlocked) then raise exception 'Heroic is not unlocked'; end if;
  if p_difficulty='cellbound' and (not found or not v_progress.cellbound_unlocked or v_tier>greatest(1,v_progress.highest_tier)) then raise exception 'Cellbound+ tier is not unlocked'; end if;

  v_snapshot:=public.endgame_party_snapshot(v_uid);
  if jsonb_array_length(v_snapshot)<>5 or exists(
    select 1 from jsonb_array_elements(v_snapshot) x where coalesce(x->>'class','')=''
  ) then raise exception 'A complete five-character party is required'; end if;

  select array_agg(distinct x->>'class' order by x->>'class') into v_classes from jsonb_array_elements(v_snapshot) x;
  v_signature:=md5(v_snapshot::text);
  v_target:=case p_dungeon_id
    when 'ashen-vault' then 720000
    when 'hollow-sanctum' then 900000
    when 'chaos-canyon' then 1080000
    when 'blackout-station' then 840000
    when 'fractured-ages' then 1320000
    else 1080000
  end;
  v_seed:=replace(gen_random_uuid()::text,'-','');

  update public.dungeon_attempts set status='abandoned',completed_at=now(),invalid_reason='superseded'
  where user_id=v_uid and dungeon_id=p_dungeon_id and status='active';

  insert into public.dungeon_attempts(user_id,dungeon_id,difficulty,tier,season_id,dungeon_version,target_time_ms,seed,party_snapshot,party_signature,party_classes)
  values(v_uid,p_dungeon_id,p_difficulty,v_tier,p_season_id,p_dungeon_version,v_target,v_seed,v_snapshot,v_signature,coalesce(v_classes,'{}'::text[]))
  returning id into v_attempt;

  return jsonb_build_object('attemptId',v_attempt,'seed',v_seed,'targetTimeMs',v_target,'difficulty',p_difficulty,'tier',v_tier,'dungeonVersion',p_dungeon_version,'seasonId',p_season_id,'party',v_snapshot);
end
$function$
;
CREATE OR REPLACE FUNCTION public.begin_world_boss_reborn_pulse(p_boss_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_boss public.world_bosses%rowtype;
  v_part public.world_boss_participants%rowtype;
  v_state jsonb;
  v_party jsonb;
  v_tank text;
  v_healer text;
  v_dps text[];
  v_ids text[];
  v_hp jsonb;
  v_resources jsonb;
  v_cooldowns jsonb;
  v_revive jsonb;
  v_token uuid:=gen_random_uuid();
  v_seq integer;
  v_seed text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_boss from public.world_bosses where id=p_boss_id for update;
  if not found or v_boss.status<>'in_combat' then raise exception 'World boss is not in combat'; end if;

  select * into v_part
  from public.world_boss_participants
  where boss_id=v_boss.id and generation=v_boss.generation and user_id=v_user
  for update;
  if not found then raise exception 'Join this world boss first'; end if;
  if coalesce((v_part.combat_state->>'wiped')::boolean,false) then raise exception 'Your party has wiped'; end if;

  if v_part.combat_pulse_token is not null
     and v_part.combat_pulse_started_at>now()-interval '20 seconds' then
    raise exception 'Your party is already resolving a Combat Reborn pulse';
  end if;
  if v_part.last_attack_at is not null and v_part.last_attack_at>now()-interval '5 seconds' then
    raise exception 'Your party is regrouping';
  end if;

  select game_state into v_state from public.guild_accounts where user_id=v_user;
  if v_state is null then raise exception 'Guild state unavailable'; end if;

  v_tank:=nullif(v_state#>>'{party,tank}','');
  v_healer:=nullif(v_state#>>'{party,healer}','');
  select coalesce(array_agg(value order by ordinality),array[]::text[])
  into v_dps
  from jsonb_array_elements_text(coalesce(v_state#>'{party,dps}','[]'::jsonb)) with ordinality d(value,ordinality)
  where value<>'';
  v_ids:=array_remove(array_cat(array[v_tank,v_healer],v_dps),null);
  if coalesce(array_length(v_ids,1),0)<>5 then raise exception 'A complete five-character party is required'; end if;

  v_hp:=coalesce(v_part.combat_state->'hp','{}'::jsonb);
  v_resources:=coalesce(v_part.combat_state->'resources','{}'::jsonb);
  v_cooldowns:=coalesce(v_part.combat_state->'cooldowns','{}'::jsonb);
  v_revive:=coalesce(v_part.combat_state->'reviveSickness','{}'::jsonb);

  with ids as (
    select 1 ord,v_tank id
    union all select 2,v_healer
    union all
    select 2+ordinality::int,value
    from unnest(v_dps) with ordinality d(value,ordinality)
  ),
  roster as (
    select elem from jsonb_array_elements(coalesce(v_state->'roster','[]'::jsonb)) elem
  )
  select jsonb_agg(
    roster.elem ||
    jsonb_build_object(
      '_combatHealthPct',coalesce((v_hp->>ids.id)::numeric,100),
      '_combatResource',coalesce(v_resources->ids.id,'null'::jsonb),
      '_combatCooldowns',coalesce(v_cooldowns->ids.id,'{}'::jsonb),
      '_reviveSicknessMs',coalesce((v_revive->>ids.id)::integer,0),
      '_combatItemLevel',v_part.party_ilvl
    )
    order by ids.ord
  )
  into v_party
  from ids join roster on roster.elem->>'id'=ids.id;

  if jsonb_array_length(coalesce(v_party,'[]'::jsonb))<>5 then raise exception 'Saved party roster is incomplete'; end if;

  v_seq:=coalesce(v_part.combat_event_seq,0)+1;
  v_seed:=concat(v_boss.id,':',v_boss.generation,':',v_user,':',v_seq);

  update public.world_boss_participants
  set combat_pulse_token=v_token,
      combat_pulse_started_at=now(),
      last_attack_at=now(),
      combat_event_seq=v_seq
  where boss_id=v_boss.id and generation=v_boss.generation and user_id=v_user;

  return jsonb_build_object(
    'pulseToken',v_token,
    'eventSeq',v_seq,
    'seed',v_seed,
    'boss',jsonb_build_object(
      'id',v_boss.id,'name',v_boss.name,'tier',v_boss.tier,'generation',v_boss.generation,
      'currentHp',v_boss.current_hp,'maxHp',v_boss.max_hp,'requiredPartyIlvl',v_boss.required_party_ilvl,
      'activeSince',v_boss.active_since
    ),
    'party',v_party,
    'continuation',jsonb_build_object(
      'phaseTriggered',coalesce(v_part.combat_state->'phaseTriggered','{}'::jsonb),
      'softEnraged',coalesce((v_part.combat_state->>'softEnraged')::boolean,false),
      'hardEnraged',coalesce((v_part.combat_state->>'hardEnraged')::boolean,false),
      'mechanicIndex',coalesce((v_part.combat_state->>'mechanicIndex')::integer,0),
      'interruptCursor',coalesce((v_part.combat_state->>'interruptCursor')::integer,0),
      'elapsedMs',coalesce((v_part.combat_state->>'elapsedMs')::integer,0)
    )
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_analytics_summary(p_days integer DEFAULT 30, p_channel text DEFAULT 'staging'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_days integer := greatest(1,least(coalesce(p_days,30),365));
  v_channel text := lower(btrim(coalesce(p_channel,'staging')));
  v_since timestamptz;
  v_overview jsonb;
  v_classes jsonb;
  v_races jsonb;
  v_combos jsonb;
  v_dungeons jsonb;
  v_quests jsonb;
  v_features jsonb;
  v_levels jsonb;
  v_professions jsonb;
  v_daily jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.cellbound_admins a where a.user_id=v_uid) then raise exception 'Admin access required'; end if;
  if v_channel not in ('staging','production','local','unknown') then raise exception 'Invalid analytics channel'; end if;
  v_since := now() - make_interval(days=>v_days);

  select jsonb_build_object(
    'active_testers',count(distinct user_id) filter(where event_name='app_open'),
    'sessions',count(distinct nullif(session_id,'')) filter(where event_name='app_open'),
    'events',count(*),
    'characters_tracked',count(*) filter(where event_name='character_created'),
    'quests_completed',count(*) filter(where event_name='quest_completed'),
    'crafts_completed',coalesce(sum(case when event_name='craft_completed' then greatest(1,coalesce((properties->>'quantity')::integer,1)) else 0 end),0),
    'items_equipped',count(*) filter(where event_name='item_equipped'),
    'items_dismantled',coalesce(sum(case when event_name='item_dismantled' then greatest(1,coalesce((properties->>'quantity')::integer,1)) else 0 end),0)
  )
  into v_overview
  from public.analytics_events
  where channel=v_channel and created_at>=v_since;

  select coalesce(jsonb_agg(x order by (x->>'count')::int desc),'[]'::jsonb) into v_classes
  from (select jsonb_build_object('name',coalesce(properties->>'class','Unknown'),'count',count(*)) x
    from public.analytics_events where channel=v_channel and created_at>=v_since and event_name='character_created'
    group by coalesce(properties->>'class','Unknown')) q;

  select coalesce(jsonb_agg(x order by (x->>'count')::int desc),'[]'::jsonb) into v_races
  from (select jsonb_build_object('name',coalesce(properties->>'race','Unknown'),'count',count(*)) x
    from public.analytics_events where channel=v_channel and created_at>=v_since and event_name='character_created'
    group by coalesce(properties->>'race','Unknown')) q;

  select coalesce(jsonb_agg(x order by (x->>'count')::int desc),'[]'::jsonb) into v_combos
  from (select jsonb_build_object('class',coalesce(properties->>'class','Unknown'),'race',coalesce(properties->>'race','Unknown'),'count',count(*)) x
    from public.analytics_events where channel=v_channel and created_at>=v_since and event_name='character_created'
    group by coalesce(properties->>'class','Unknown'),coalesce(properties->>'race','Unknown')
    order by count(*) desc limit 12) q;

  select coalesce(jsonb_agg(x order by (x->>'starts')::int desc),'[]'::jsonb) into v_dungeons
  from (
    select jsonb_build_object(
      'id',properties->>'dungeon_id',
      'name',coalesce(max(properties->>'dungeon_name'),properties->>'dungeon_id'),
      'starts',count(*) filter(where event_name='dungeon_started'),
      'completions',count(*) filter(where event_name='dungeon_completed'),
      'unique_players',count(distinct user_id),
      'completion_rate',case when count(*) filter(where event_name='dungeon_started')=0 then 0 else round(100.0*(count(*) filter(where event_name='dungeon_completed'))/(count(*) filter(where event_name='dungeon_started')),1) end
    ) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name in ('dungeon_started','dungeon_completed') and coalesce(properties->>'dungeon_id','')<>''
    group by properties->>'dungeon_id'
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'completions')::int desc),'[]'::jsonb) into v_quests
  from (
    select jsonb_build_object('id',coalesce(properties->>'quest_id','unknown'),'name',coalesce(max(properties->>'quest_name'),min(coalesce(properties->>'quest_id','unknown')),'Unknown quest'),'completions',count(*),'unique_players',count(distinct user_id)) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name='quest_completed'
    group by coalesce(properties->>'quest_id','unknown')
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'opens')::int desc),'[]'::jsonb) into v_features
  from (
    select jsonb_build_object('name',coalesce(properties->>'view','unknown'),'opens',count(*),'unique_players',count(distinct user_id)) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name='view_opened'
    group by coalesce(properties->>'view','unknown') order by count(*) desc limit 20
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'level')::int),'[]'::jsonb) into v_levels
  from (
    select jsonb_build_object('level',greatest(1,coalesce((properties->>'level')::integer,1)),'characters',count(*),'players',count(distinct user_id)) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name='level_reached'
    group by greatest(1,coalesce((properties->>'level')::integer,1))
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'learned')::int desc),'[]'::jsonb) into v_professions
  from (
    select jsonb_build_object('name',coalesce(properties->>'profession','Unknown'),'learned',count(*) filter(where event_name='profession_learned'),'crafts',coalesce(sum(case when event_name='craft_completed' then greatest(1,coalesce((properties->>'quantity')::integer,1)) else 0 end),0),'players',count(distinct user_id)) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name in ('profession_learned','craft_completed')
    group by coalesce(properties->>'profession','Unknown')
  ) q;

  select coalesce(jsonb_agg(x order by x->>'date'),'[]'::jsonb) into v_daily
  from (
    select jsonb_build_object('date',created_at::date,'players',count(distinct user_id),'sessions',count(distinct nullif(session_id,''))) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name='app_open'
    group by created_at::date
  ) q;

  return jsonb_build_object(
    'channel',v_channel,'days',v_days,'since',v_since,'overview',coalesce(v_overview,'{}'::jsonb),
    'classes',v_classes,'races',v_races,'class_race',v_combos,'dungeons',v_dungeons,'quests',v_quests,
    'features',v_features,'levels',v_levels,'professions',v_professions,'daily_activity',v_daily
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_auto_clear_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from public.cellbound_admins a
    where a.user_id = new.user_id
      and a.auto_clear_cell_shock = true
  ) then
    new.game_state := jsonb_set(
      coalesce(new.game_state, '{}'::jsonb),
      '{roster}',
      coalesce(
        (
          select jsonb_agg(
            jsonb_set(
              jsonb_set(member, '{cellShock}', '0'::jsonb, true),
              '{cellShockLockedUntil}', 'null'::jsonb, true
            )
          )
          from jsonb_array_elements(coalesce(new.game_state->'roster', '[]'::jsonb)) member
        ),
        '[]'::jsonb
      ),
      true
    );
  end if;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_beta_reports(p_status text DEFAULT NULL::text, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_status text := nullif(lower(btrim(coalesce(p_status,''))),''); v_limit integer := greatest(1, least(coalesce(p_limit,100), 200)); v_rows jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.cellbound_admins a where a.user_id=v_uid) then raise exception 'Admin access required'; end if;
  if v_status is not null and v_status not in ('new','triaged','in_progress','fixed','closed') then raise exception 'Invalid report status'; end if;
  select coalesce(jsonb_agg(row_data order by created_at desc),'[]'::jsonb) into v_rows
  from (
    select r.created_at,
      jsonb_build_object('id',r.id,'user_id',r.user_id,'email',coalesce(u.email,''),'guild_name',coalesce(g.guild_name,''),'category',r.category,'severity',r.severity,'summary',r.summary,'details',r.details,'page_view',r.page_view,'build_id',r.build_id,'build_number',r.build_number,'context',r.context,'status',r.status,'admin_note',r.admin_note,'created_at',r.created_at,'updated_at',r.updated_at) row_data
    from public.beta_reports r
    left join auth.users u on u.id=r.user_id
    left join public.guild_accounts g on g.user_id=r.user_id
    where v_status is null or r.status=v_status
    order by r.created_at desc limit v_limit
  ) q;
  return v_rows;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_fresh_start(p_confirmation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.cellbound_admins a where a.user_id = v_uid
  ) then
    raise exception 'Admin access required';
  end if;

  if upper(trim(coalesce(p_confirmation,''))) <> 'FRESH START' then
    raise exception 'Type FRESH START to confirm';
  end if;

  -- Clear character/onboarding progression for this account.
  delete from public.inventory_items
  where character_id in (select id from public.characters where user_id=v_uid);

  delete from public.character_cells
  where character_id in (select id from public.characters where user_id=v_uid);

  delete from public.character_abilities
  where character_id in (select id from public.characters where user_id=v_uid);

  delete from public.quest_progress
  where character_id in (select id from public.characters where user_id=v_uid);

  delete from public.characters where user_id=v_uid;

  -- Remove account-specific multiplayer/economy state so a new test is clean.
  delete from public.party_finder_members
  where user_id=v_uid
     or listing_id in (select id from public.party_finder_listings where leader_id=v_uid);

  delete from public.party_finder_listings where leader_id=v_uid;

  delete from public.world_boss_participants where user_id=v_uid;
  delete from public.world_boss_rewards where user_id=v_uid;

  delete from public.trading_post_proceeds
  where seller_id=v_uid
     or listing_id in (select id from public.trading_post_listings where seller_id=v_uid);

  delete from public.trading_post_listings where seller_id=v_uid;

  update public.profiles
  set display_name=null, updated_at=now()
  where user_id=v_uid;

  -- Non-empty marker intentionally beats any stale browser save on next load.
  update public.guild_accounts
  set game_state=jsonb_build_object(
        '__fresh_start',true,
        'fresh_start_at',now()
      ),
      updated_at=now()
  where user_id=v_uid;

  if not found then
    insert into public.guild_accounts(user_id,game_state,updated_at)
    values (
      v_uid,
      jsonb_build_object('__fresh_start',true,'fresh_start_at',now()),
      now()
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'fresh_start',true,
    'message','Cellbound account reset to a fresh playable state.'
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_fresh_start_player(p_user_id uuid, p_confirmation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select a.role into v_role
  from public.cellbound_admins a
  where a.user_id=v_uid;

  if v_role not in ('owner','admin') then
    raise exception 'Admin access required';
  end if;

  select lower(coalesce(u.email,'')) into v_email
  from auth.users u
  where u.id=p_user_id;

  if v_email is null or v_email='' then
    raise exception 'Player not found';
  end if;

  if lower(btrim(coalesce(p_confirmation,''))) <> v_email then
    raise exception 'Type the selected account email exactly to confirm';
  end if;

  delete from public.inventory_items
  where character_id in (select id from public.characters where user_id=p_user_id);
  delete from public.character_cells
  where character_id in (select id from public.characters where user_id=p_user_id);
  delete from public.character_abilities
  where character_id in (select id from public.characters where user_id=p_user_id);
  delete from public.quest_progress
  where character_id in (select id from public.characters where user_id=p_user_id);
  delete from public.characters where user_id=p_user_id;

  update public.dungeon_attempts
  set status='abandoned',
      completed_at=coalesce(completed_at,now()),
      runtime_state=coalesce(runtime_state,'{}'::jsonb)
        || jsonb_build_object('phase','abandoned','adminFreshStartAt',now(),'adminFreshStartBy',v_uid),
      runtime_updated_at=now()
  where user_id=p_user_id and status='active';

  delete from public.dungeon_integrity_events where user_id=p_user_id;
  delete from public.dungeon_runs where user_id=p_user_id;
  delete from public.dungeon_progress where user_id=p_user_id;
  delete from public.dungeon_weekly_progress where user_id=p_user_id;
  delete from public.endgame_achievements where user_id=p_user_id;

  update public.raid_sessions
  set status='abandoned',completed_at=coalesce(completed_at,now()),updated_at=now()
  where leader_id=p_user_id and status='active';
  delete from public.raid_reward_claims where user_id=p_user_id;
  delete from public.raid_lockouts where user_id=p_user_id;

  delete from public.party_finder_members where user_id=p_user_id;
  update public.party_finder_listings
  set status='closed',expires_at=least(expires_at,now())
  where leader_id=p_user_id and status<>'closed';

  delete from public.world_boss_participants where user_id=p_user_id;
  delete from public.world_boss_rewards where user_id=p_user_id;
  delete from public.cellbound_world_presence where user_id=p_user_id;

  delete from public.trading_post_proceeds where seller_id=p_user_id;
  update public.trading_post_listings
  set status='cancelled',updated_at=now()
  where seller_id=p_user_id and status='active';
  update public.market_commodity_orders
  set status='cancelled',reserved_gold=0,updated_at=now()
  where user_id=p_user_id and status='active';
  delete from public.market_watchlist where user_id=p_user_id;
  delete from public.market_saved_searches where user_id=p_user_id;

  update public.profiles
  set display_name=null,updated_at=now()
  where user_id=p_user_id;

  update public.guild_accounts
  set game_state=jsonb_build_object(
        '__fresh_start',true,
        'fresh_start_at',now(),
        'admin_fresh_start_by',v_uid
      ),
      updated_at=now()
  where user_id=p_user_id;

  if not found then
    insert into public.guild_accounts(user_id,game_state,updated_at)
    values (
      p_user_id,
      jsonb_build_object('__fresh_start',true,'fresh_start_at',now(),'admin_fresh_start_by',v_uid),
      now()
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'action','fresh_start',
    'message','Account reset to a fresh playable state.',
    'player',public.cellbound_admin_player_lookup(p_user_id::text)
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_market_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_is_admin boolean;
  v_active_gear integer;
  v_buy_orders integer;
  v_sell_orders integer;
  v_volume_24 bigint;
  v_tax_24 bigint;
  v_trades_24 integer;
  v_top jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select exists(select 1 from public.cellbound_admins a where a.user_id=v_uid) into v_is_admin;
  if not v_is_admin then raise exception 'Admin access required'; end if;

  select count(*) into v_active_gear from public.trading_post_listings where status='active' and (expires_at is null or expires_at>now());
  select count(*) filter(where side='buy'),count(*) filter(where side='sell')
    into v_buy_orders,v_sell_orders
  from public.market_commodity_orders where status='active' and expires_at>now();

  select coalesce(sum(gross_gold),0),coalesce(sum(tax_gold),0),count(*)
    into v_volume_24,v_tax_24,v_trades_24
  from public.market_transactions where created_at>=now()-interval '24 hours';

  select coalesce(jsonb_agg(x order by x.volume desc),'[]'::jsonb) into v_top
  from (
    select item_key,item_name,category,sum(quantity)::integer as units,sum(gross_gold)::bigint as volume
    from public.market_transactions
    where created_at>=now()-interval '7 days'
    group by item_key,item_name,category
    order by sum(gross_gold) desc
    limit 8
  ) x;

  return jsonb_build_object(
    'active_gear',v_active_gear,
    'buy_orders',v_buy_orders,
    'sell_orders',v_sell_orders,
    'volume_24',v_volume_24,
    'tax_24',v_tax_24,
    'trades_24',v_trades_24,
    'top_items',v_top
  );
end $function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_max_player(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_state jsonb;
  v_roster jsonb;
  v_roster_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select a.role into v_role
  from public.cellbound_admins a
  where a.user_id=v_uid;

  if v_role not in ('owner','admin') then
    raise exception 'Admin access required';
  end if;

  if p_user_id is null or not exists(select 1 from auth.users u where u.id=p_user_id) then
    raise exception 'Player not found';
  end if;

  select coalesce(g.game_state,'{}'::jsonb)
    into v_state
  from public.guild_accounts g
  where g.user_id=p_user_id;

  if v_state is null then
    v_state := '{}'::jsonb;
  end if;

  v_roster_count := jsonb_array_length(coalesce(v_state->'roster','[]'::jsonb));
  if v_roster_count < 1 then
    raise exception 'This account has no roster yet. Complete character creation before using MAX ACCOUNT.';
  end if;

  select jsonb_agg(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          member || jsonb_build_object(
            'level',15,
            'xp',0,
            'talent',12,
            'cellShock',0,
            'cellShockLockedUntil',null,
            'gear',50,
            'classBuffProgress',jsonb_build_object(
              'unlocked',
              case member->>'class'
                when 'Warrior' then '["warrior-guardian","warrior-battle-focus","warrior-pvp"]'::jsonb
                when 'Paladin' then '["paladin-blessing-resolve","paladin-radiant-purpose","paladin-pvp"]'::jsonb
                when 'Priest' then '["priest-divine-inspiration","priest-inner-fire","priest-pvp"]'::jsonb
                when 'Druid' then '["druid-wild-communion","druid-primal-flow","druid-pvp"]'::jsonb
                when 'Hunter' then '["hunter-predators-focus","hunter-pack-instinct","hunter-pvp"]'::jsonb
                when 'Rogue' then '["rogue-killing-tempo","rogue-relentless","rogue-pvp"]'::jsonb
                when 'Mage' then '["mage-arcane-empowerment","mage-flow-state","mage-pvp"]'::jsonb
                when 'Shaman' then '["shaman-bloodlust","shaman-ancestral-current","shaman-pvp"]'::jsonb
                when 'Warlock' then '["warlock-demonic-pact","warlock-soul-hunger","warlock-pvp"]'::jsonb
                when 'Monk' then '["monk-mystic-touch","monk-inner-tempo","monk-pvp"]'::jsonb
                when 'Death Knight' then '["death-knight-horn","death-knight-frozen-will","death-knight-pvp"]'::jsonb
                when 'Demon Hunter' then '["demon-hunter-momentum","demon-hunter-fel-instinct","demon-hunter-pvp"]'::jsonb
                when 'Evoker' then '["evoker-draconic-resonance","evoker-ancient-vitality","evoker-pvp"]'::jsonb
                else coalesce(member#>'{classBuffProgress,unlocked}','[]'::jsonb)
              end
            )
          ),
          '{equipment,Head}',
          coalesce(nullif(member#>'{equipment,Head}','null'::jsonb),'{}'::jsonb)
            || '{"tier":5,"tierLabel":"Tier 5 · Admin Max","rarity":"Epic","itemLevel":50,"baseItemLevel":50,"source":"Admin Max Account","raidExclusive":true}'::jsonb,
          true
        ),
        '{equipment,Chest}',
        coalesce(nullif(member#>'{equipment,Chest}','null'::jsonb),'{}'::jsonb)
          || '{"tier":5,"tierLabel":"Tier 5 · Admin Max","rarity":"Epic","itemLevel":50,"baseItemLevel":50,"source":"Admin Max Account","raidExclusive":true}'::jsonb,
        true
      ),
      '{equipment,Weapon}',
      coalesce(nullif(member#>'{equipment,Weapon}','null'::jsonb),'{}'::jsonb)
        || '{"tier":5,"tierLabel":"Tier 5 · Admin Max","rarity":"Epic","itemLevel":50,"baseItemLevel":50,"source":"Admin Max Account","raidExclusive":true}'::jsonb,
      true
    )
    order by ord
  )
  into v_roster
  from jsonb_array_elements(coalesce(v_state->'roster','[]'::jsonb)) with ordinality r(member,ord);

  v_state := (v_state - '__fresh_start' - 'fresh_start_at')
    || jsonb_build_object(
      'renown', greatest(coalesce((v_state->>'renown')::int,0),10000),
      'gold', greatest(coalesce((v_state->>'gold')::int,0),50000),
      'dungeonCompletions', greatest(coalesce((v_state->>'dungeonCompletions')::int,0),25),
      'roster', coalesce(v_roster,'[]'::jsonb),
      'bossKills', coalesce(v_state->'bossKills','{}'::jsonb)
        || '{"ashwarden":true,"embermaw":true,"vaultheart":true}'::jsonb,
      'progression', coalesce(v_state->'progression','{}'::jsonb)
        || '{
          "ashenVaultUnlocked":true,
          "hollowSanctumUnlocked":true,
          "fracturedAgesUnlocked":true,
          "manorRaidUnlocked":true,
          "manorRaidCleared":true,
          "nullComplexUnlocked":true,
          "ashenVaultFirstClear":true,
          "hollowSanctumFirstClear":true,
          "chaosCanyonFirstClear":true,
          "blackoutStationFirstClear":true,
          "fracturedAgesFirstClear":true
        }'::jsonb,
      'onboarding', coalesce(v_state->'onboarding','{}'::jsonb)
        || jsonb_build_object(
          'version',3,'complete',true,'stage','complete','zone','zeltira',
          'completedAt',coalesce(v_state#>>'{onboarding,completedAt}',now()::text)
        ),
      'questSystem', coalesce(v_state->'questSystem','{}'::jsonb)
        || jsonb_build_object(
          'started',true,
          'currentStage','complete',
          'completedAt',now()::text,
          'flags',coalesce(v_state#>'{questSystem,flags}','{}'::jsonb)
            || '{"hollowSanctumUnlocked":true,"hollowFirstClear":true}'::jsonb,
          'fourfold',coalesce(v_state#>'{questSystem,fourfold}','{}'::jsonb)
            || '{"started":true,"complete":true,"stage":"complete","boxOpened":true,"mapSolved":true}'::jsonb,
          'noWayBack',coalesce(v_state#>'{questSystem,noWayBack}','{}'::jsonb)
            || '{"started":true,"complete":true,"stage":"complete","manorKey":true,"arrived":true,"mapSolved":true,"gatePicked":true,"ropeSolved":true,"sailRepaired":true,"silasDefeated":true,"houndsDefeated":true}'::jsonb,
          'nullComplex',coalesce(v_state#>'{questSystem,nullComplex}','{}'::jsonb)
            || '{"started":true,"complete":true,"stage":"complete","components":{"cable":true,"cell":true,"fuse":true}}'::jsonb
        ),
      'adminMaxProfile',jsonb_build_object(
        'maxed',true,
        'allContentUnlocked',true,
        'targetItemLevel',50,
        'cellboundPlusTier',20,
        'appliedAt',now()::text,
        'appliedBy',v_uid
      )
    );

  update public.guild_accounts g
  set game_state=v_state, updated_at=now()
  where g.user_id=p_user_id;

  if not found then
    insert into public.guild_accounts(user_id,game_state,updated_at)
    values (p_user_id,v_state,now());
  end if;

  update public.characters c
  set level=15, xp=0, tutorial_complete=true, creation_complete=true,
      tutorial_stage='complete', tutorial_reward_claimed=true,
      last_played_at=now(), updated_at=now()
  where c.user_id=p_user_id;

  insert into public.dungeon_progress
    (user_id,dungeon_id,normal_clears,heroic_unlocked,heroic_clears,cellbound_unlocked,highest_tier,cellbound_clears,best_score,updated_at)
  select p_user_id,dungeon_id,1,true,1,true,20,20,0,now()
  from (values
    ('ashen-vault'),('hollow-sanctum'),('chaos-canyon'),('blackout-station'),('fractured-ages')
  ) d(dungeon_id)
  on conflict (user_id,dungeon_id) do update set
    normal_clears=greatest(public.dungeon_progress.normal_clears,excluded.normal_clears),
    heroic_unlocked=true,
    heroic_clears=greatest(public.dungeon_progress.heroic_clears,excluded.heroic_clears),
    cellbound_unlocked=true,
    highest_tier=greatest(public.dungeon_progress.highest_tier,excluded.highest_tier),
    cellbound_clears=greatest(public.dungeon_progress.cellbound_clears,excluded.cellbound_clears),
    updated_at=now();

  insert into public.dungeon_weekly_progress
    (user_id,week_start,season_id,progress_points,highest_tier,completed_runs,reward_claimed,updated_at)
  select p_user_id,date_trunc('week',current_date)::date,s.id,60,20,20,false,now()
  from public.endgame_seasons s
  where s.active=true
  order by s.starts_at desc
  limit 1
  on conflict (user_id,week_start) do update set
    progress_points=greatest(public.dungeon_weekly_progress.progress_points,60),
    highest_tier=greatest(public.dungeon_weekly_progress.highest_tier,20),
    completed_runs=greatest(public.dungeon_weekly_progress.completed_runs,20),
    updated_at=now();

  return jsonb_build_object(
    'ok',true,
    'action','max_account',
    'message','Account maxed for endgame testing.',
    'player',public.cellbound_admin_player_lookup(p_user_id::text)
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_player_lookup(p_lookup text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_lookup text := lower(btrim(coalesce(p_lookup,''))); v_target uuid; v_email text; v_guild text; v_state jsonb; v_roster_count integer := 0; v_shock_count integer := 0; v_active_attempts integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.cellbound_admins a where a.user_id=v_uid) then raise exception 'Admin access required'; end if;
  if char_length(v_lookup) < 3 then raise exception 'Enter an email, guild name or account ID'; end if;
  select u.id,u.email,g.guild_name,g.game_state into v_target,v_email,v_guild,v_state
  from auth.users u left join public.guild_accounts g on g.user_id=u.id
  where lower(coalesce(u.email,''))=v_lookup or lower(coalesce(g.guild_name,''))=v_lookup or lower(u.id::text)=v_lookup
  order by case when lower(coalesce(u.email,''))=v_lookup then 0 when lower(coalesce(g.guild_name,''))=v_lookup then 1 else 2 end limit 1;
  if v_target is null then raise exception 'Player not found'; end if;
  v_roster_count := jsonb_array_length(coalesce(v_state->'roster','[]'::jsonb));
  select count(*)::integer into v_shock_count from jsonb_array_elements(coalesce(v_state->'roster','[]'::jsonb)) member where coalesce((member->>'cellShock')::numeric,0)>0 or nullif(member->>'cellShockLockedUntil','') is not null;
  select count(*)::integer into v_active_attempts from public.dungeon_attempts d where d.user_id=v_target and d.status='active';
  return jsonb_build_object('user_id',v_target,'email',coalesce(v_email,''),'guild_name',coalesce(v_guild,''),'roster_count',v_roster_count,'cell_shock_affected',v_shock_count,'active_dungeon_attempts',v_active_attempts,'onboarding_stage',coalesce(v_state->'onboarding'->>'stage','unknown'),'onboarding_complete',coalesce((v_state->'onboarding'->>'complete')::boolean,false),'updated_at',(select g.updated_at from public.guild_accounts g where g.user_id=v_target));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_publish_release(p_build_id text, p_build_number bigint, p_message text DEFAULT 'A new Cellbound update is ready. Load the latest version to continue.'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_build text := trim(coalesce(p_build_id,''));
  v_number bigint := coalesce(p_build_number,0);
  v_message text := trim(coalesce(p_message,''));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.cellbound_admins a where a.user_id = v_uid
  ) then
    raise exception 'Admin access required';
  end if;

  if length(v_build) < 7 or length(v_build) > 80 then
    raise exception 'Invalid build ID';
  end if;

  if v_number <= 0 then
    raise exception 'Invalid build number';
  end if;

  if v_message = '' then
    v_message := 'A new Cellbound update is ready. Load the latest version to continue.';
  end if;

  insert into public.cellbound_release_state(singleton,build_id,build_number,message,published_at,published_by)
  values (true,v_build,v_number,left(v_message,240),now(),v_uid)
  on conflict (singleton) do update
  set build_id=excluded.build_id,
      build_number=excluded.build_number,
      message=excluded.message,
      published_at=excluded.published_at,
      published_by=excluded.published_by;

  return public.cellbound_release_status();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_publish_release(p_build_id text, p_message text DEFAULT 'A new Cellbound update is ready. Load the latest version to continue.'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_build text := trim(coalesce(p_build_id,''));
  v_message text := trim(coalesce(p_message,''));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.cellbound_admins a where a.user_id = v_uid
  ) then
    raise exception 'Admin access required';
  end if;

  if length(v_build) < 7 or length(v_build) > 80 then
    raise exception 'Invalid build ID';
  end if;

  if v_message = '' then
    v_message := 'A new Cellbound update is ready. Load the latest version to continue.';
  end if;

  insert into public.cellbound_release_state(singleton,build_id,message,published_at,published_by)
  values (true,v_build,left(v_message,240),now(),v_uid)
  on conflict (singleton) do update
  set build_id=excluded.build_id,
      message=excluded.message,
      published_at=excluded.published_at,
      published_by=excluded.published_by;

  return public.cellbound_release_status();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_recover_player(p_user_id uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_action text := lower(btrim(coalesce(p_action,''))); v_rows integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.cellbound_admins a where a.user_id=v_uid) then raise exception 'Admin access required'; end if;
  if p_user_id is null or not exists(select 1 from auth.users u where u.id=p_user_id) then raise exception 'Player not found'; end if;
  if v_action='cell_shock' then
    update public.guild_accounts g
    set game_state=jsonb_set(coalesce(g.game_state,'{}'::jsonb),'{roster}',coalesce((select jsonb_agg(jsonb_set(jsonb_set(member,'{cellShock}','0'::jsonb,true),'{cellShockLockedUntil}','null'::jsonb,true)) from jsonb_array_elements(coalesce(g.game_state->'roster','[]'::jsonb)) member),'[]'::jsonb),true),updated_at=now()
    where g.user_id=p_user_id; get diagnostics v_rows = row_count;
  elsif v_action='dungeon_attempts' then
    update public.dungeon_attempts d
    set status='abandoned',completed_at=now(),runtime_state=coalesce(d.runtime_state,'{}'::jsonb)||jsonb_build_object('phase','abandoned','adminRecoveredAt',now(),'adminRecoveredBy',v_uid),runtime_updated_at=now()
    where d.user_id=p_user_id and d.status='active'; get diagnostics v_rows = row_count;
  elsif v_action='twelve_below' then
    update public.guild_accounts g
    set game_state=jsonb_set(coalesce(g.game_state,'{}'::jsonb),'{twelveBelow}',coalesce(g.game_state->'twelveBelow','{}'::jsonb)||jsonb_build_object('date',to_char(current_date,'YYYY-MM-DD'),'attemptsUsed',0),true),updated_at=now()
    where g.user_id=p_user_id; get diagnostics v_rows = row_count;
  else raise exception 'Unsupported recovery action'; end if;
  return jsonb_build_object('ok',true,'action',v_action,'rows_changed',v_rows,'player',public.cellbound_admin_player_lookup(p_user_id::text));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_reset_my_cell_shock()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_state jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.cellbound_admins a where a.user_id = v_uid
  ) then
    raise exception 'Admin access required';
  end if;

  update public.guild_accounts g
  set game_state = jsonb_set(
        coalesce(g.game_state, '{}'::jsonb),
        '{roster}',
        coalesce(
          (
            select jsonb_agg(
              jsonb_set(
                jsonb_set(member, '{cellShock}', '0'::jsonb, true),
                '{cellShockLockedUntil}', 'null'::jsonb, true
              )
            )
            from jsonb_array_elements(coalesce(g.game_state->'roster', '[]'::jsonb)) member
          ),
          '[]'::jsonb
        ),
        true
      ),
      updated_at = now()
  where g.user_id = v_uid
  returning g.game_state into v_state;

  if v_state is null then
    raise exception 'Guild account not found';
  end if;

  return v_state;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_set_auto_clear_cell_shock(p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  update public.cellbound_admins a
  set auto_clear_cell_shock = coalesce(p_enabled, false),
      updated_at = now()
  where a.user_id = v_uid;

  if not found then
    raise exception 'Admin access required';
  end if;

  if coalesce(p_enabled, false) then
    update public.guild_accounts g
    set game_state = jsonb_set(
          coalesce(g.game_state, '{}'::jsonb),
          '{roster}',
          coalesce(
            (
              select jsonb_agg(
                jsonb_set(
                  jsonb_set(member, '{cellShock}', '0'::jsonb, true),
                  '{cellShockLockedUntil}', 'null'::jsonb, true
                )
              )
              from jsonb_array_elements(coalesce(g.game_state->'roster', '[]'::jsonb)) member
            ),
            '[]'::jsonb
          ),
          true
        ),
        updated_at = now()
    where g.user_id = v_uid;
  end if;

  return public.cellbound_admin_status();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_auto boolean;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select a.role, a.auto_clear_cell_shock
    into v_role, v_auto
  from public.cellbound_admins a
  where a.user_id = v_uid;

  if not found then
    return jsonb_build_object(
      'is_admin', false,
      'role', null,
      'auto_clear_cell_shock', false
    );
  end if;

  return jsonb_build_object(
    'is_admin', true,
    'role', v_role,
    'auto_clear_cell_shock', v_auto
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_admin_update_beta_report(p_report_id uuid, p_status text, p_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_status text := lower(btrim(coalesce(p_status,''))); v_row public.beta_reports%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.cellbound_admins a where a.user_id=v_uid) then raise exception 'Admin access required'; end if;
  if v_status not in ('new','triaged','in_progress','fixed','closed') then raise exception 'Invalid report status'; end if;
  update public.beta_reports set status=v_status,admin_note=left(coalesce(p_note,''),2000),updated_at=now() where id=p_report_id returning * into v_row;
  if v_row.id is null then raise exception 'Beta report not found'; end if;
  return jsonb_build_object('id',v_row.id,'status',v_row.status,'admin_note',v_row.admin_note,'updated_at',v_row.updated_at);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_booth(p_action text, p_kind text DEFAULT ''::text, p_key text DEFAULT ''::text, p_revision bigint DEFAULT 0, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select booth_private.command(p_action,p_kind,p_key,p_revision,p_payload)
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_booth_can_upload()
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select booth_private.can_upload() $function$
;
CREATE OR REPLACE FUNCTION public.cellbound_booth_can_upload_kind(p_kind text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select (public.cellbound_booth('access')->>'role'='owner') or
 ((public.cellbound_booth('access')->'scopes') ? p_kind and public.cellbound_booth('access')->>'role' in ('editor','admin'))
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_chat_block_reason(p_body text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v text := lower(coalesce(p_body,''));
begin
  v := replace(v,'0','o');
  v := replace(v,'1','i');
  v := replace(v,'3','e');
  v := replace(v,'4','a');
  v := replace(v,'5','s');
  v := replace(v,'7','t');
  v := replace(v,'@','a');
  v := replace(v,'$','s');
  v := replace(v,'!','i');

  if v ~ '(^|[^a-z0-9])f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*(i+[^a-z0-9]*n+[^a-z0-9]*g+|e+[^a-z0-9]*d+|e+[^a-z0-9]*r+([^a-z0-9]*s+)?|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])m+[^a-z0-9]*o+[^a-z0-9]*t+[^a-z0-9]*h+[^a-z0-9]*e+[^a-z0-9]*r+[^a-z0-9]*f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*(i+[^a-z0-9]*n+[^a-z0-9]*g+|e+[^a-z0-9]*d+|e+[^a-z0-9]*r+([^a-z0-9]*s+)?|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])s+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*t+([^a-z0-9]*(t+[^a-z0-9]*y+|t+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*g+|t+[^a-z0-9]*e+[^a-z0-9]*d+|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])b+[^a-z0-9]*u+[^a-z0-9]*l+[^a-z0-9]*s+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*t+([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])c+[^a-z0-9]*u+[^a-z0-9]*n+[^a-z0-9]*t+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])b+[^a-z0-9]*i+[^a-z0-9]*t+[^a-z0-9]*c+[^a-z0-9]*h+([^a-z0-9]*(e+[^a-z0-9]*s+|i+[^a-z0-9]*n+[^a-z0-9]*g+|y+|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])w+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*k+[^a-z0-9]*e+[^a-z0-9]*r+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])t+[^a-z0-9]*w+[^a-z0-9]*a+[^a-z0-9]*t+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])a+[^a-z0-9]*s+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])a+[^a-z0-9]*r+[^a-z0-9]*s+[^a-z0-9]*e+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])b+[^a-z0-9]*a+[^a-z0-9]*s+[^a-z0-9]*t+[^a-z0-9]*a+[^a-z0-9]*r+[^a-z0-9]*d+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])d+[^a-z0-9]*i+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*(h+[^a-z0-9]*e+[^a-z0-9]*a+[^a-z0-9]*d+([^a-z0-9]*s+)?|s+))?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])p+[^a-z0-9]*r+[^a-z0-9]*i+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*s+)?([^a-z0-9]|$)'
  then
    return 'profanity';
  end if;

  if v ~ '(^|[^a-z0-9])n+[^a-z0-9]*i+[^a-z0-9]*g{2,}[^a-z0-9]*(e+[^a-z0-9]*r+|a+)([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])f+[^a-z0-9]*a+[^a-z0-9]*g+([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])f+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*o+[^a-z0-9]*t+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])p+[^a-z0-9]*a+[^a-z0-9]*k+[^a-z0-9]*i+([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])c+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*k+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])s+[^a-z0-9]*p+[^a-z0-9]*i+[^a-z0-9]*c+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])k+[^a-z0-9]*i+[^a-z0-9]*k+[^a-z0-9]*e+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])g+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*k+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])w+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*c+[^a-z0-9]*k+([^a-z0-9]*s+)?([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])t+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*n+[^a-z0-9]*y+([^a-z0-9]|$)'
     or v ~ '(^|[^a-z0-9])r+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*a+[^a-z0-9]*r+[^a-z0-9]*d+([^a-z0-9]*(e+[^a-z0-9]*d+|s+))?([^a-z0-9]|$)'
  then
    return 'slur';
  end if;

  if regexp_replace(v,'[^a-z0-9]+','','g') ~ '(k+y+s+|k+i+l+l+y+o+u+r+s+e+l+f+)' then
    return 'abusive_phrase';
  end if;

  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_enforce_guild_name_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_candidate text;
begin
  if tg_op = 'UPDATE' and nullif(btrim(old.guild_name),'') is not null then
    new.guild_name := old.guild_name;
  else
    v_candidate := nullif(
      regexp_replace(
        btrim(coalesce(new.guild_name,new.game_state->>'socialDisplayName','')),
        '\s+',
        ' ',
        'g'
      ),
      ''
    );

    if v_candidate is not null then
      if char_length(v_candidate) < 3 or char_length(v_candidate) > 24 then
        raise exception 'Guild names must be 3–24 characters';
      end if;
      new.guild_name := v_candidate;
    end if;
  end if;

  if nullif(btrim(new.guild_name),'') is not null then
    new.game_state := jsonb_set(
      coalesce(new.game_state,'{}'::jsonb),
      '{socialDisplayName}',
      to_jsonb(new.guild_name),
      true
    );
  end if;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_is_owner()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.cellbound_admins
    where user_id = (select auth.uid()) and role = 'owner'
  );
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_lock_guild_name(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name,'')),'\s+',' ','g'),'');
  v_existing text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_name is null or char_length(v_name) < 3 or char_length(v_name) > 24 then
    raise exception 'Guild names must be 3–24 characters';
  end if;

  select guild_name
    into v_existing
  from public.guild_accounts
  where user_id = v_uid
  for update;

  if not found then
    insert into public.guild_accounts(user_id,guild_name,game_state,updated_at)
    values(
      v_uid,
      v_name,
      jsonb_build_object('socialDisplayName',v_name),
      now()
    );
    return v_name;
  end if;

  if nullif(btrim(v_existing),'') is not null then
    if v_existing = v_name then
      return v_existing;
    end if;
    raise exception 'Your guild name is permanent and cannot be changed';
  end if;

  update public.guild_accounts
  set guild_name = v_name,
      game_state = jsonb_set(
        coalesce(game_state,'{}'::jsonb),
        '{socialDisplayName}',
        to_jsonb(v_name),
        true
      ),
      updated_at = now()
  where user_id = v_uid;

  return v_name;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_owner_publish_room_layout(p_content_id text, p_room_id text, p_layout jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_content text := lower(btrim(coalesce(p_content_id,'')));
  v_room text := lower(btrim(coalesce(p_room_id,'')));
  v_layout jsonb := coalesce(p_layout,'{}'::jsonb);
  v_row public.cellbound_room_layouts%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.cellbound_admins a
    where a.user_id=v_uid and lower(coalesce(a.role,''))='owner'
  ) then
    raise exception 'Owner access required';
  end if;

  if v_content !~ '^[a-z0-9][a-z0-9-]{1,63}$' then
    raise exception 'Invalid content ID';
  end if;
  if v_room !~ '^[a-z0-9][a-z0-9-]{1,63}$' then
    raise exception 'Invalid room ID';
  end if;
  if jsonb_typeof(v_layout) <> 'object' then
    raise exception 'Layout must be an object';
  end if;
  if not (v_layout ? 'markers') or jsonb_typeof(v_layout->'markers') <> 'array' then
    raise exception 'Layout markers are required';
  end if;
  if jsonb_array_length(v_layout->'markers') > 64 then
    raise exception 'Too many layout markers';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_layout->'markers') m
    where jsonb_typeof(m) <> 'object'
       or coalesce(m->>'kind','') not in ('entry','exit','party','enemy','add','mechanic')
       or coalesce(m->>'label','') = ''
       or (m->>'x') is null
       or (m->>'y') is null
       or (m->>'x')::numeric < 0
       or (m->>'x')::numeric > 100
       or (m->>'y')::numeric < 0
       or (m->>'y')::numeric > 100
  ) then
    raise exception 'Invalid room marker';
  end if;

  insert into public.cellbound_room_layouts(content_id,room_id,layout,version,published_by,published_at)
  values(v_content,v_room,v_layout,1,v_uid,now())
  on conflict(content_id,room_id) do update
    set layout=excluded.layout,
        version=public.cellbound_room_layouts.version+1,
        published_by=excluded.published_by,
        published_at=excluded.published_at
  returning * into v_row;

  return jsonb_build_object(
    'content_id',v_row.content_id,
    'room_id',v_row.room_id,
    'layout',v_row.layout,
    'version',v_row.version,
    'published_at',v_row.published_at
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_owner_unpublish_room_layout(p_content_id text, p_room_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_content text := lower(btrim(coalesce(p_content_id,'')));
  v_room text := lower(btrim(coalesce(p_room_id,'')));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1
    from public.cellbound_admins a
    where a.user_id=v_uid and lower(coalesce(a.role,''))='owner'
  ) then
    raise exception 'Owner access required';
  end if;

  delete from public.cellbound_room_layouts
  where content_id=v_content and room_id=v_room;
  return found;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_protect_account_entitlements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- Requests carrying an ordinary signed-in player JWT must never be able to
  -- grant or extend their own Membership, even if a future table grant regresses.
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      new.membership_active_until := null;
      new.membership_override := false;
    else
      new.membership_active_until := old.membership_active_until;
      new.membership_override := old.membership_override;
    end if;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_pvp_pair_waiting(p_mode text, p_squad_size integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
 blue public.cellbound_pvp_queue_entries%rowtype;
 red public.cellbound_pvp_queue_entries%rowtype;
 created_match uuid;
begin
 if p_mode not in ('arena','capture-the-flag','king-of-the-hill')
    or not ((p_mode='arena' and p_squad_size in (2,3,5))
      or (p_mode in ('capture-the-flag','king-of-the-hill') and p_squad_size=5))
 then raise exception 'Invalid PvP matchmaking format'; end if;
 select * into blue from public.cellbound_pvp_queue_entries
 where status='waiting' and mode=p_mode and squad_size=p_squad_size and expires_at>now()
 and not exists(
  select 1 from public.cellbound_pvp_match_participants p
  join public.cellbound_pvp_matches m on m.id=p.match_id
  where p.user_id=cellbound_pvp_queue_entries.user_id and m.status in ('forming','ready','active'))
 order by joined_at,id for update skip locked limit 1;
 if blue.id is null then return null; end if;
 select * into red from public.cellbound_pvp_queue_entries
 where status='waiting' and mode=p_mode and squad_size=p_squad_size and expires_at>now()
 and user_id<>blue.user_id
 and not exists(
  select 1 from public.cellbound_pvp_match_participants p
  join public.cellbound_pvp_matches m on m.id=p.match_id
  where p.user_id=cellbound_pvp_queue_entries.user_id and m.status in ('forming','ready','active'))
 order by joined_at,id for update skip locked limit 1;
 if red.id is null then return null; end if;
 insert into public.cellbound_pvp_matches(mode,squad_size,status)
 values(p_mode,p_squad_size,'forming') returning id into created_match;
 insert into public.cellbound_pvp_match_participants(match_id,user_id,team)
 values(created_match,blue.user_id,'blue'),(created_match,red.user_id,'red');
 update public.cellbound_pvp_queue_entries set status='matched',match_id=created_match
 where id in (blue.id,red.id) and status='waiting';
 return created_match;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_record_analytics_event(p_event_name text, p_event_key text DEFAULT NULL::text, p_session_id text DEFAULT ''::text, p_channel text DEFAULT 'unknown'::text, p_build_id text DEFAULT ''::text, p_build_number bigint DEFAULT 0, p_page_view text DEFAULT ''::text, p_properties jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_inserted boolean := false;
  v_event_name text := lower(btrim(coalesce(p_event_name,'')));
  v_event_key text := nullif(left(btrim(coalesce(p_event_key,'')),160),'');
  v_channel text := lower(btrim(coalesce(p_channel,'unknown')));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_event_name !~ '^[a-z0-9_]{3,64}$' then raise exception 'Invalid analytics event name'; end if;
  if v_channel not in ('staging','production','local','unknown') then raise exception 'Invalid analytics channel'; end if;
  if jsonb_typeof(coalesce(p_properties,'{}'::jsonb)) <> 'object' then raise exception 'Analytics properties must be an object'; end if;

  insert into public.analytics_events(
    user_id,event_name,event_key,session_id,channel,build_id,build_number,page_view,properties
  )
  values(
    v_uid,
    v_event_name,
    v_event_key,
    left(coalesce(p_session_id,''),80),
    v_channel,
    left(coalesce(p_build_id,''),80),
    greatest(0,coalesce(p_build_number,0)),
    left(coalesce(p_page_view,''),80),
    coalesce(p_properties,'{}'::jsonb)
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_release_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_row public.cellbound_release_state%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_row
  from public.cellbound_release_state
  where singleton = true;

  return jsonb_build_object(
    'build_id', v_row.build_id,
    'build_number', v_row.build_number,
    'message', v_row.message,
    'published_at', v_row.published_at
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_social_identity()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_badge text := 'player';
  v_staff_member boolean := false;
  v_admin_role text;
  v_mod_role text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select a.role
    into v_admin_role
  from public.cellbound_admins a
  where a.user_id = v_uid;

  if found then
    v_badge := case when v_admin_role = 'owner' then 'owner' else 'mod' end;
    v_staff_member := true;
  else
    select m.role into v_mod_role
    from public.cellbound_moderators m
    where m.user_id = v_uid and m.active = true;

    if found then
      v_badge := v_mod_role;
      v_staff_member := (v_mod_role = 'mod');
    end if;
  end if;

  return jsonb_build_object(
    'chat_badge', v_badge,
    'staff_member', v_staff_member,
    'player_mod_discount_eligible', v_badge = 'player_mod'
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_world_presence_heartbeat(p_zone text)
 RETURNS TABLE(presence_key text, guild_name text, zone text, updated_at timestamp with time zone, is_self boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_zone text := lower(trim(coalesce(p_zone,'')));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not (v_zone = any (array[
    'town'::text,'guild'::text,'inn'::text,'bank'::text,'craft'::text,
    'quests'::text,'dungeons'::text,'activities'::text,'raids'::text,
    'market'::text,'social'::text,'arena'::text
  ])) then raise exception 'Invalid world zone'; end if;

  insert into public.cellbound_world_presence as presence(user_id,zone,updated_at)
  values (v_uid,v_zone,now())
  on conflict (user_id) do update
    set zone=excluded.zone,
        updated_at=excluded.updated_at;

  delete from public.cellbound_world_presence as stale
  where stale.updated_at < now()-interval '5 minutes';

  return query
  select
    md5(p.user_id::text||':cellbound-world-presence-v1'),
    coalesce(nullif(trim(g.guild_name),''),'Unnamed Guild'),
    p.zone,
    p.updated_at,
    (p.user_id=v_uid)
  from public.cellbound_world_presence p
  left join public.guild_accounts g on g.user_id=p.user_id
  where p.updated_at > now()-interval '45 seconds'
  order by p.updated_at desc
  limit 40;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cellbound_world_presence_leave()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then return; end if;
  delete from public.cellbound_world_presence where user_id=auth.uid();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_manor_raid_rewards(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_session public.raid_sessions%rowtype;
  v_snapshot jsonb;
  v_existing jsonb;
  v_payload jsonb;
  v_slots text[]:=array['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic'];
  v_i1 integer;
  v_i2 integer;
  v_c1 text;
  v_c2 text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.raid_sessions where id=p_session_id;
  if not found or v_session.status<>'completed' then raise exception 'The raid is not complete'; end if;

  select reward_payload into v_existing from public.raid_reward_claims
   where session_id=p_session_id and user_id=v_user;
  if v_existing is not null then return v_existing; end if;

  select party_snapshot into v_snapshot from public.party_finder_members
   where listing_id=v_session.listing_id and user_id=v_user;
  if v_snapshot is null or jsonb_array_length(v_snapshot)<>5 then raise exception 'Raid party snapshot missing'; end if;

  v_i1:=floor(random()*5)::integer;
  v_i2:=floor(random()*5)::integer;
  v_c1:=coalesce(v_snapshot->v_i1->>'class','Warrior');
  v_c2:=coalesce(v_snapshot->v_i2->>'class','Warrior');
  v_payload:=jsonb_build_array(
    jsonb_build_object('class',v_c1,'slot',v_slots[1+floor(random()*array_length(v_slots,1))::integer],'tier',5),
    jsonb_build_object('class',v_c2,'slot',v_slots[1+floor(random()*array_length(v_slots,1))::integer],'tier',5)
  );

  insert into public.raid_reward_claims(session_id,user_id,reward_payload)
  values(p_session_id,v_user,v_payload);
  return v_payload;
end
$function$
;
CREATE OR REPLACE FUNCTION public.claim_trading_proceeds()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_account public.guild_accounts%rowtype;
  v_amount integer := 0;
  v_gold integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_account
  from public.guild_accounts
  where user_id=v_user
  for update;

  if not found then raise exception 'Guild account not found'; end if;

  with claimed_rows as (
    update public.trading_post_proceeds
    set claimed=true, claimed_at=now()
    where seller_id=v_user and claimed=false
    returning net_gold
  )
  select coalesce(sum(net_gold),0)::integer into v_amount from claimed_rows;

  if v_amount <= 0 then
    return jsonb_build_object('claimedGold',0);
  end if;

  v_gold := coalesce((v_account.game_state->>'gold')::integer,0);

  update public.guild_accounts
  set game_state=jsonb_set(game_state,'{gold}',to_jsonb(v_gold+v_amount),true),
      updated_at=now()
  where user_id=v_user;

  return jsonb_build_object('claimedGold',v_amount);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_tutorial_troll_reward(p_character_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  claimed boolean := false;
begin
  update public.characters
     set tutorial_reward_claimed = true,
         tutorial_stage = 'loot_collected',
         updated_at = now(),
         last_played_at = now()
   where id = p_character_id
     and user_id = (select auth.uid())
     and tutorial_reward_claimed = false
  returning true into claimed;

  if coalesce(claimed,false) is false then
    return false;
  end if;

  insert into public.inventory_items(character_id,item_key,item_name,item_type,quantity,rarity,metadata)
  values
    (p_character_id,'troll_bones','Troll Bones','material',1,'common','{"description":"Heavy fragments taken from a Curo Troll. Useful in crafting."}'::jsonb),
    (p_character_id,'troll_cell','Troll Cell','cell',1,'rare','{"description":"A living fragment of power recovered from a defeated Troll."}'::jsonb)
  on conflict (character_id,item_key) do update
    set quantity = greatest(public.inventory_items.quantity, excluded.quantity), updated_at = now();

  insert into public.character_cells(character_id,cell_key,cell_name,description,absorbed)
  values (p_character_id,'troll_cell','Troll Cell','A living fragment of power recovered from Gorvak, the Curo Troll.',false)
  on conflict (character_id,cell_key) do nothing;

  return true;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_weekly_dungeon_reward()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_week date:=date_trunc('week',current_date)::date; v_row public.dungeon_weekly_progress%rowtype; v_quality text;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select * into v_row from public.dungeon_weekly_progress where user_id=v_uid and week_start=v_week for update;
 if not found then raise exception 'No weekly dungeon progress'; end if;
 if v_row.reward_claimed then raise exception 'Weekly reward already claimed'; end if;
 if v_row.progress_points<60 then raise exception 'Earn 60 weekly points before claiming'; end if;
 v_quality:=case when v_row.highest_tier>=10 then 'epic' when v_row.highest_tier>=5 then 'rare' when v_row.highest_tier>=1 then 'uncommon' else 'starter' end;
 update public.dungeon_weekly_progress set reward_claimed=true,reward_claimed_at=now(),updated_at=now() where user_id=v_uid and week_start=v_week;
 return jsonb_build_object('claimed',true,'quality',v_quality,'highestTier',v_row.highest_tier,'points',v_row.progress_points);
end $function$
;
CREATE OR REPLACE FUNCTION public.claim_world_boss_reward(p_reward_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid:=auth.uid();v_reward public.world_boss_rewards%rowtype;v_acc public.guild_accounts%rowtype;v_inbox jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_reward from public.world_boss_rewards where id=p_reward_id and user_id=v_user and claimed=false for update;
  if not found then raise exception 'Reward is no longer available'; end if;
  select * into v_acc from public.guild_accounts where user_id=v_user for update;
  if not found then raise exception 'Guild account not found'; end if;
  v_inbox:=coalesce(v_acc.game_state->'tradeInbox','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'deliveryId',gen_random_uuid(),'category','gear','itemKey',v_reward.item_key,'itemName',v_reward.item_key,'quantity',1,
    'payload',jsonb_build_object('source',v_reward.boss_name),'purchasedAt',now()
  ));
  update public.guild_accounts set game_state=jsonb_set(game_state,'{tradeInbox}',v_inbox,true),updated_at=now() where user_id=v_user;
  update public.world_boss_rewards set claimed=true,claimed_at=now() where id=v_reward.id;
  return jsonb_build_object('ok',true,'itemKey',v_reward.item_key,'bossName',v_reward.boss_name,'tier',v_reward.item_tier);
end $function$
;
CREATE OR REPLACE FUNCTION public.command_world_boss(p_boss_id text, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_boss public.world_bosses%rowtype;
  v_part public.world_boss_participants%rowtype;
  v_action text := lower(coalesce(p_action,'attack'));
  v_ratio numeric;
  v_hp_ratio numeric;
  v_phase integer;
  v_recommended text;
  v_multiplier numeric := 1;
  v_damage integer;
  v_wipe_chance numeric;
  v_wiped boolean := false;
  v_killed boolean := false;
  v_next timestamptz;
  v_keys text[];
  v_key text;
  r record;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_action not in ('attack','defend','interrupt','cell') then raise exception 'Invalid command'; end if;

  select * into v_boss from public.world_bosses where id=p_boss_id for update;
  if not found or v_boss.status <> 'in_combat' then raise exception 'World boss is not in combat'; end if;

  select * into v_part
  from public.world_boss_participants
  where boss_id=v_boss.id and generation=v_boss.generation and user_id=v_user
  for update;
  if not found then raise exception 'Join this world boss first'; end if;
  if v_part.last_attack_at is not null and v_part.last_attack_at > now()-interval '5 seconds' then
    raise exception 'Your party is regrouping';
  end if;

  v_ratio := least(1.35,greatest(.85,v_part.party_ilvl/greatest(1,v_boss.required_party_ilvl)));
  v_hp_ratio := v_boss.current_hp::numeric / greatest(1,v_boss.max_hp);

  if v_hp_ratio > .70 then v_phase:=1; v_recommended:='defend';
  elsif v_hp_ratio > .35 then v_phase:=2; v_recommended:='interrupt';
  else v_phase:=3; v_recommended:='cell';
  end if;

  v_wipe_chance := greatest(.03,.105-((v_ratio-1)*.17)+(v_boss.tier-1)*.015);

  if v_action='defend' then
    v_multiplier:=.55; v_wipe_chance:=greatest(.015,v_wipe_chance-.045);
  elsif v_action='interrupt' then
    v_multiplier:=.78;
  elsif v_action='cell' then
    v_multiplier:=1.18; v_wipe_chance:=v_wipe_chance+.01;
  end if;

  if v_action=v_recommended then
    v_multiplier:=v_multiplier*1.42;
    v_wipe_chance:=greatest(.01,v_wipe_chance-.04);
  else
    v_wipe_chance:=least(.22,v_wipe_chance+.018);
  end if;

  v_wiped := random() < v_wipe_chance;
  if v_wiped then v_damage:=0;
  else
    v_damage:=greatest(1,round(v_boss.max_hp*(.032+random()*.018)*v_ratio*v_multiplier));
  end if;

  update public.world_boss_participants
  set last_attack_at=now(),damage_done=damage_done+v_damage
  where boss_id=v_boss.id and generation=v_boss.generation and user_id=v_user;

  update public.world_bosses
  set current_hp=greatest(0,current_hp-v_damage),updated_at=now()
  where id=v_boss.id
  returning * into v_boss;

  if v_boss.current_hp<=0 then
    v_killed:=true;
    v_next:=now()+make_interval(secs => (600+floor(random()*(28800-600)))::int);
    update public.world_bosses
    set status='dormant',last_killed_at=now(),next_spawn_at=v_next,updated_at=now()
    where id=v_boss.id;

    v_keys:=case v_boss.tier
      when 1 then array['warrior-t1-head','warrior-t1-chest','warrior-t1-weapon','paladin-t1-head','paladin-t1-chest','paladin-t1-weapon','priest-t1-head','priest-t1-chest','priest-t1-weapon','druid-t1-head','druid-t1-chest','druid-t1-weapon','hunter-t1-head','hunter-t1-chest','hunter-t1-weapon','rogue-t1-head','rogue-t1-chest','rogue-t1-weapon','mage-t1-head','mage-t1-chest','mage-t1-weapon']
      when 2 then array['warrior-t2-head','warrior-t2-chest','warrior-t2-weapon','paladin-t2-head','paladin-t2-chest','paladin-t2-weapon','priest-t2-head','priest-t2-chest','priest-t2-weapon','druid-t2-head','druid-t2-chest','druid-t2-weapon','hunter-t2-head','hunter-t2-chest','hunter-t2-weapon','rogue-t2-head','rogue-t2-chest','rogue-t2-weapon','mage-t2-head','mage-t2-chest','mage-t2-weapon']
      else array['warrior-t3-head','warrior-t3-chest','warrior-t3-weapon','paladin-t3-head','paladin-t3-chest','paladin-t3-weapon','priest-t3-head','priest-t3-chest','priest-t3-weapon','druid-t3-head','druid-t3-chest','druid-t3-weapon','hunter-t3-head','hunter-t3-chest','hunter-t3-weapon','rogue-t3-head','rogue-t3-chest','rogue-t3-weapon','mage-t3-head','mage-t3-chest','mage-t3-weapon']
    end;

    for r in
      select user_id from public.world_boss_participants
      where boss_id=v_boss.id and generation=v_boss.generation
    loop
      v_key:=v_keys[1+floor(random()*array_length(v_keys,1))::int];
      insert into public.world_boss_rewards(boss_id,boss_name,generation,user_id,item_tier,item_key)
      values(v_boss.id,v_boss.name,v_boss.generation,r.user_id,v_boss.tier,v_key)
      on conflict(boss_id,generation,user_id) do nothing;
    end loop;
  end if;

  return jsonb_build_object(
    'ok',true,'action',v_action,'recommended',v_recommended,'phase',v_phase,
    'damage',v_damage,'wiped',v_wiped,'killed',v_killed,
    'currentHp',v_boss.current_hp,'maxHp',v_boss.max_hp
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.commit_world_boss_reborn_pulse(p_user_id uuid, p_boss_id text, p_generation integer, p_pulse_token uuid, p_party_damage integer, p_healing integer, p_threat_breakdown jsonb, p_combat_state jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_boss public.world_bosses%rowtype;
  v_part public.world_boss_participants%rowtype;
  v_damage integer:=greatest(0,coalesce(p_party_damage,0));
  v_healing integer:=greatest(0,coalesce(p_healing,0));
  v_threat integer:=0;
  v_member text;
  v_value numeric;
  v_global_hp integer;
  v_killed boolean:=false;
  v_wiped boolean:=coalesce((p_combat_state->>'wiped')::boolean,false);
  v_next timestamptz;
  v_keys text[];
  v_key text;
  r record;
begin
  if p_user_id is null then raise exception 'User required'; end if;

  select * into v_boss from public.world_bosses
  where id=p_boss_id and generation=p_generation
  for update;
  if not found then raise exception 'World boss generation changed'; end if;

  select * into v_part
  from public.world_boss_participants
  where boss_id=p_boss_id and generation=p_generation and user_id=p_user_id
  for update;
  if not found then raise exception 'World boss participant missing'; end if;
  if v_part.combat_pulse_token is null or v_part.combat_pulse_token<>p_pulse_token then
    raise exception 'Combat pulse token is no longer valid';
  end if;

  if v_damage>greatest(1000,round(v_boss.max_hp*.08)) then
    update public.world_boss_participants
    set combat_pulse_token=null,combat_pulse_started_at=null
    where boss_id=p_boss_id and generation=p_generation and user_id=p_user_id;
    raise exception 'Combat Reborn pulse damage failed integrity check';
  end if;

  for v_member,v_value in select key,value::text::numeric from jsonb_each(coalesce(p_threat_breakdown,'{}'::jsonb))
  loop
    if v_value<0 or v_value>10000000 then raise exception 'Invalid threat value'; end if;
    v_threat:=v_threat+round(v_value);
  end loop;

  v_global_hp:=greatest(0,v_boss.current_hp-v_damage);

  update public.world_boss_participants
  set damage_done=damage_done+v_damage,
      healing_done=healing_done+v_healing,
      threat_done=case when v_wiped then 0 else threat_done+v_threat end,
      threat_breakdown=(
        select coalesce(jsonb_object_agg(k,to_jsonb(
          coalesce((v_part.threat_breakdown->>k)::numeric,0)+coalesce((p_threat_breakdown->>k)::numeric,0)
        )),'{}'::jsonb)
        from (
          select key k from jsonb_object_keys(coalesce(v_part.threat_breakdown,'{}'::jsonb)) key
          union
          select key k from jsonb_object_keys(coalesce(p_threat_breakdown,'{}'::jsonb)) key
        ) keys
      ),
      combat_state=coalesce(p_combat_state,'{}'::jsonb),
      combat_pulse_token=null,
      combat_pulse_started_at=null
  where boss_id=p_boss_id and generation=p_generation and user_id=p_user_id
  returning * into v_part;

  if v_boss.current_hp>0 then
    update public.world_bosses set current_hp=v_global_hp,updated_at=now()
    where id=p_boss_id and generation=p_generation
    returning * into v_boss;
  end if;

  if v_boss.current_hp<=0 and v_boss.status<>'dormant' then
    v_killed:=true;
    v_next:=now()+make_interval(secs => (600+floor(random()*(28800-600)))::int);
    update public.world_bosses
    set status='dormant',current_hp=0,last_killed_at=now(),next_spawn_at=v_next,updated_at=now()
    where id=p_boss_id and generation=p_generation
    returning * into v_boss;

    v_keys:=case v_boss.tier
      when 1 then array['warrior-t1-head','warrior-t1-chest','warrior-t1-weapon','paladin-t1-head','paladin-t1-chest','paladin-t1-weapon','priest-t1-head','priest-t1-chest','priest-t1-weapon','druid-t1-head','druid-t1-chest','druid-t1-weapon','hunter-t1-head','hunter-t1-chest','hunter-t1-weapon','rogue-t1-head','rogue-t1-chest','rogue-t1-weapon','mage-t1-head','mage-t1-chest','mage-t1-weapon']
      when 2 then array['warrior-t2-head','warrior-t2-chest','warrior-t2-weapon','paladin-t2-head','paladin-t2-chest','paladin-t2-weapon','priest-t2-head','priest-t2-chest','priest-t2-weapon','druid-t2-head','druid-t2-chest','druid-t2-weapon','hunter-t2-head','hunter-t2-chest','hunter-t2-weapon','rogue-t2-head','rogue-t2-chest','rogue-t2-weapon','mage-t2-head','mage-t2-chest','mage-t2-weapon']
      else array['warrior-t3-head','warrior-t3-chest','warrior-t3-weapon','paladin-t3-head','paladin-t3-chest','paladin-t3-weapon','priest-t3-head','priest-t3-chest','priest-t3-weapon','druid-t3-head','druid-t3-chest','druid-t3-weapon','hunter-t3-head','hunter-t3-chest','hunter-t3-weapon','rogue-t3-head','rogue-t3-chest','rogue-t3-weapon','mage-t3-head','mage-t3-chest','mage-t3-weapon']
    end;

    for r in
      select user_id from public.world_boss_participants
      where boss_id=p_boss_id and generation=p_generation
    loop
      v_key:=v_keys[1+floor(random()*array_length(v_keys,1))::int];
      insert into public.world_boss_rewards(boss_id,boss_name,generation,user_id,item_tier,item_key)
      values(v_boss.id,v_boss.name,v_boss.generation,r.user_id,v_boss.tier,v_key)
      on conflict(boss_id,generation,user_id) do nothing;
    end loop;
  elsif v_boss.current_hp<=0 then
    v_killed:=true;
  end if;

  return jsonb_build_object(
    'ok',true,'damage',v_damage,'healing',v_healing,'threat',v_threat,
    'threatBreakdown',coalesce(v_part.threat_breakdown,'{}'::jsonb),
    'wiped',v_wiped,'killed',v_killed,'currentHp',v_boss.current_hp,'maxHp',v_boss.max_hp,
    'combatState',v_part.combat_state
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.complete_cellbound_tutorial(p_character_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  owns boolean := false;
begin
  select exists(select 1 from public.characters c where c.id = p_character_id and c.user_id = (select auth.uid())) into owns;
  if owns is false then return false; end if;

  update public.characters
     set tutorial_complete = true,
         tutorial_stage = 'complete',
         current_location = 'curo',
         current_hp = max_hp,
         updated_at = now(),
         last_played_at = now()
   where id = p_character_id;

  insert into public.quest_progress(character_id,quest_key,quest_title,status,objective_index,data)
  values (p_character_id,'world_beyond_curo','A World Beyond Curo','active',0,'{"objective":"Speak with the Gatekeeper at Curo’s northern road."}'::jsonb)
  on conflict (character_id,quest_key) do update
    set status='active', updated_at=now();

  return true;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_party_finder_listing(p_content_type text, p_target_id text, p_target_label text, p_note text, p_party_ilvl numeric, p_player_cap integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_label text;
  v_id uuid;
  v_type text:=lower(coalesce(p_content_type,''));
  v_cap integer:=p_player_cap;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_type not in ('dungeon','raid') then raise exception 'Unsupported Party Finder activity'; end if;
  if v_type='raid' then
    if p_target_id<>'manor' then raise exception 'Unknown raid'; end if;
    v_cap:=2;
  elsif v_cap<2 or v_cap>8 then
    raise exception 'Player cap must be 2–8';
  end if;

  update public.party_finder_listings
     set status='closed'
   where leader_id=v_user and status in ('open','full');

  select nullif(btrim(game_state->>'socialDisplayName'),'')
    into v_label from public.guild_accounts where user_id=v_user;
  v_label:=coalesce(v_label,'Guild '||upper(substr(v_user::text,1,4)));

  insert into public.party_finder_listings(
    leader_id,guild_label,content_type,target_id,target_label,note,party_ilvl,player_cap
  ) values(
    v_user,left(v_label,24),v_type,left(coalesce(p_target_id,''),80),
    left(coalesce(p_target_label,''),100),left(coalesce(p_note,''),180),
    greatest(0,p_party_ilvl),v_cap
  ) returning id into v_id;

  insert into public.party_finder_members(listing_id,user_id,guild_label,party_ilvl)
  values(v_id,v_user,left(v_label,24),greatest(0,p_party_ilvl));

  return v_id;
end
$function$
;
CREATE OR REPLACE FUNCTION public.endgame_party_snapshot(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_state jsonb;
  v_party jsonb;
  v_snapshot jsonb;
begin
  select game_state into v_state from public.guild_accounts where user_id=p_user;
  v_party:=coalesce(v_state->'party','{}'::jsonb);

  with ids as (
    select 1 ord,'tank'::text role,v_party->>'tank' id
    union all
    select 2,'healer',v_party->>'healer'
    union all
    select 3+ordinality::int,'dps',value
    from jsonb_array_elements_text(coalesce(v_party->'dps','[]'::jsonb)) with ordinality
  ),
  roster as (
    select r from jsonb_array_elements(coalesce(v_state->'roster','[]'::jsonb)) r
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'role',ids.role,
    'class',roster.r->>'class',
    'spec',roster.r->>'spec'
  ) order by ids.ord),'[]'::jsonb)
  into v_snapshot
  from ids
  left join roster on roster.r->>'id'=ids.id
  where ids.id is not null;

  return v_snapshot;
end
$function$
;
CREATE OR REPLACE FUNCTION public.fail_manor_raid(p_session_id uuid, p_reason text DEFAULT 'The raid was defeated'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  update public.party_finder_listings
     set status='closed'
   where id=v_session.listing_id
     and status in ('open','full');

  return jsonb_build_object('ok',true,'status',v_session.status,'stage',v_session.stage,'state',v_session.state,'groupReleased',true);
end
$function$
;
CREATE OR REPLACE FUNCTION public.get_dungeon_leaderboard(p_dungeon_id text, p_season_id text DEFAULT 'foundations-1'::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(rank bigint, guild_label text, difficulty text, tier integer, score integer, completion_time_ms integer, deaths integer, mechanics_failed integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 return query select * from(
  select row_number() over(order by r.score desc,r.tier desc,r.completion_time_ms asc,r.created_at asc) rank,r.guild_label,r.difficulty,r.tier,r.score,r.completion_time_ms,r.deaths,r.mechanics_failed,r.created_at
  from public.dungeon_runs r where r.valid=true and r.dungeon_id=p_dungeon_id and r.season_id=p_season_id
 )ranked order by rank limit greatest(1,least(coalesce(p_limit,50),100));
end $function$
;
CREATE OR REPLACE FUNCTION public.get_dungeon_leaderboard_v2(p_dungeon_id text, p_season_id text DEFAULT 'foundations-1'::text, p_scope text DEFAULT 'overall'::text, p_tier integer DEFAULT NULL::integer, p_class text DEFAULT NULL::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(rank bigint, guild_label text, difficulty text, tier integer, score integer, completion_time_ms integer, deaths integer, mechanics_failed integer, party_classes text[], created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_party_sig text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_scope not in ('overall','tier','class','party') then raise exception 'Invalid leaderboard scope'; end if;
  if p_scope='party' then v_party_sig:=md5(public.endgame_party_snapshot(v_uid)::text); end if;

  return query
  select * from (
    select row_number() over(order by r.score desc,r.tier desc,r.completion_time_ms asc,r.created_at asc) as rank,
      r.guild_label,r.difficulty,r.tier,r.score,r.completion_time_ms,r.deaths,r.mechanics_failed,r.party_classes,r.created_at
    from public.dungeon_runs r
    where r.valid=true
      and r.dungeon_id=p_dungeon_id
      and r.season_id=p_season_id
      and (p_scope<>'tier' or (r.difficulty='cellbound' and r.tier=coalesce(p_tier,r.tier)))
      and (p_scope<>'class' or (p_class is not null and p_class=any(r.party_classes)))
      and (p_scope<>'party' or r.party_signature=v_party_sig)
  ) ranked
  order by rank
  limit greatest(1,least(coalesce(p_limit,50),100));
end
$function$
;
CREATE OR REPLACE FUNCTION public.get_endgame_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_week date:=date_trunc('week',current_date)::date;v_season text;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 select id into v_season from public.endgame_seasons where active=true order by starts_at desc limit 1;
 return jsonb_build_object(
  'season',coalesce((select to_jsonb(s) from public.endgame_seasons s where s.id=v_season),'{}'::jsonb),
  'rotation',coalesce((select to_jsonb(r) from public.dungeon_affix_rotation r where r.week_start=v_week),'{}'::jsonb),
  'progress',coalesce((select jsonb_agg(to_jsonb(p) order by p.dungeon_id) from public.dungeon_progress p where p.user_id=v_uid),'[]'::jsonb),
  'weekly',coalesce((select to_jsonb(w) from public.dungeon_weekly_progress w where w.user_id=v_uid and w.week_start=v_week),'{}'::jsonb),
  'achievements',coalesce((select jsonb_agg(to_jsonb(a) order by a.unlocked_at desc) from public.endgame_achievements a where a.user_id=v_uid),'[]'::jsonb),
  'recentRuns',coalesce((select jsonb_agg(x.row_json) from(select to_jsonb(r) row_json from public.dungeon_runs r where r.user_id=v_uid order by r.created_at desc limit 12)x),'[]'::jsonb)
 );
end $function$
;
CREATE OR REPLACE FUNCTION public.get_world_boss_combat_state(p_boss_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  raise exception 'Shared world bosses are temporarily disabled. The Twelve Below remains available.';
end
$function$
;
CREATE OR REPLACE FUNCTION public.get_world_boss_detail(p_boss_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_boss public.world_bosses%rowtype;
  v_names jsonb;
  v_total_damage bigint;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_boss
  from public.world_bosses
  where id=p_boss_id;

  if not found then raise exception 'World boss not found'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'guildLabel',p.guild_label,
      'partyIlvl',p.party_ilvl,
      'damageDone',p.damage_done
    )
    order by p.damage_done desc,p.joined_at asc
  ),'[]'::jsonb),
  coalesce(sum(p.damage_done),0)
  into v_names,v_total_damage
  from public.world_boss_participants p
  where p.boss_id=v_boss.id and p.generation=v_boss.generation;

  return jsonb_build_object(
    'id',v_boss.id,
    'name',v_boss.name,
    'tier',v_boss.tier,
    'requiredPartyIlvl',v_boss.required_party_ilvl,
    'playerCap',v_boss.player_cap,
    'maxHp',v_boss.max_hp,
    'currentHp',v_boss.current_hp,
    'status',v_boss.status,
    'generation',v_boss.generation,
    'participants',v_names,
    'totalDamage',v_total_damage
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_world_boss_rewards()
 RETURNS TABLE(id uuid, boss_name text, item_tier integer, item_key text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select r.id,r.boss_name,r.item_tier,r.item_key,r.created_at
 from public.world_boss_rewards r
 where r.user_id=auth.uid() and r.claimed=false
 order by r.created_at desc;
$function$
;
CREATE OR REPLACE FUNCTION public.get_world_bosses()
 RETURNS TABLE(id text, name text, tier integer, required_party_ilvl integer, player_cap integer, max_hp integer, current_hp integer, status text, generation integer, active_since timestamp with time zone, last_killed_at timestamp with time zone, participant_count bigint, joined boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return;
end
$function$
;
CREATE OR REPLACE FUNCTION public.join_party_finder_listing(p_listing_id uuid, p_party_ilvl numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid:=auth.uid();v_listing public.party_finder_listings%rowtype;v_count int;v_label text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_listing from public.party_finder_listings where id=p_listing_id for update;
  if not found or v_listing.status not in ('open','full') or v_listing.expires_at<=now() then raise exception 'Group is no longer available'; end if;
  if exists(select 1 from public.party_finder_members where listing_id=p_listing_id and user_id=v_user) then return jsonb_build_object('ok',true,'alreadyJoined',true); end if;
  select count(*) into v_count from public.party_finder_members where listing_id=p_listing_id;
  if v_count>=v_listing.player_cap then raise exception 'Group is full'; end if;
  select nullif(btrim(game_state->>'socialDisplayName'),'') into v_label from public.guild_accounts where user_id=v_user;
  v_label:=coalesce(v_label,'Guild '||upper(substr(v_user::text,1,4)));
  insert into public.party_finder_members(listing_id,user_id,guild_label,party_ilvl)
  values(p_listing_id,v_user,left(v_label,24),greatest(0,p_party_ilvl));
  v_count:=v_count+1;
  if v_count>=v_listing.player_cap then update public.party_finder_listings set status='full' where id=p_listing_id; end if;
  return jsonb_build_object('ok',true,'members',v_count,'capacity',v_listing.player_cap);
end $function$
;
CREATE OR REPLACE FUNCTION public.join_world_boss(p_boss_id text, p_party_ilvl numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  raise exception 'Shared world bosses are temporarily disabled. The Twelve Below remains available.';
end
$function$
;
CREATE OR REPLACE FUNCTION public.leave_party_finder_listing(p_listing_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid:=auth.uid();v_leader uuid;v_count int;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select leader_id into v_leader from public.party_finder_listings where id=p_listing_id for update;
  if not found then return jsonb_build_object('ok',true); end if;
  if v_leader=v_user then
    update public.party_finder_listings set status='closed' where id=p_listing_id;
    delete from public.party_finder_members where listing_id=p_listing_id;
    return jsonb_build_object('ok',true,'closed',true);
  end if;
  delete from public.party_finder_members where listing_id=p_listing_id and user_id=v_user;
  select count(*) into v_count from public.party_finder_members where listing_id=p_listing_id;
  update public.party_finder_listings set status=case when v_count>=player_cap then 'full' else 'open' end where id=p_listing_id and status<>'closed';
  return jsonb_build_object('ok',true,'members',v_count);
end $function$
;
CREATE OR REPLACE FUNCTION public.leave_world_boss(p_boss_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  delete from public.world_boss_participants where user_id=v_user and boss_id=p_boss_id;
  return jsonb_build_object('ok',true,'disabled',true);
end
$function$
;
CREATE OR REPLACE FUNCTION public.manor_lockout_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_start timestamptz:=to_timestamp(floor(extract(epoch from now())/172800)*172800);
  v_used integer:=0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select case when window_start=v_start then runs_used else 0 end
    into v_used from public.raid_lockouts
   where user_id=v_user and raid_id='manor';
  v_used:=coalesce(v_used,0);
  return jsonb_build_object(
    'runsUsed',v_used,
    'runsRemaining',greatest(0,3-v_used),
    'windowStart',v_start,
    'resetAt',v_start+interval '2 days'
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.manor_screech_open_v2(p_session_id uuid, p_token text, p_duration_ms integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.manor_screech_result(p_session_id uuid, p_success boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  where r.id=p_session_id for update;
  if not found or v_session.status<>'active' or v_session.stage not in ('maids','housebound')
    then raise exception 'Screech is not active';
  end if;
  if not exists(
    select 1 from public.party_finder_members m
    where m.listing_id=v_session.listing_id and m.user_id=v_user
  ) then raise exception 'You are not in this raid'; end if;

  if v_session.stage='housebound' then
    v_failures:=coalesce((v_session.state->>'masterScreechFailures')::integer,0)+(case when p_success then 0 else 1 end);
    update public.raid_sessions
       set state=jsonb_set(
                   jsonb_set(state,'{masterScreechFailures}',to_jsonb(v_failures),true),
                   '{masterDamageBuffUntil}',
                   to_jsonb(case when p_success then coalesce(state->>'masterDamageBuffUntil','') else (now()+interval '20 seconds')::text end),
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
$function$
;
CREATE OR REPLACE FUNCTION public.manor_screech_result_v2(p_session_id uuid, p_side integer, p_event_ms integer, p_outcome text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.manor_screech_result_v2(p_session_id uuid, p_token text, p_result text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.manor_set_ready(p_session_id uuid, p_ready boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_session public.raid_sessions%rowtype;
  v_is_leader boolean;
  v_ready_a boolean;
  v_ready_b boolean;
  v_start_at timestamptz;
  v_state jsonb;
  v_ready_path text[];
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_session
  from public.raid_sessions
  where id=p_session_id
  for update;

  if not found then raise exception 'Raid session not found'; end if;
  if v_session.status<>'active' then raise exception 'The raid is not active'; end if;

  if not exists (
    select 1 from public.party_finder_members m
    where m.listing_id=v_session.listing_id and m.user_id=v_user
  ) then
    raise exception 'You are not in this raid';
  end if;

  v_is_leader:=v_user=v_session.leader_id;
  v_state:=v_session.state;

  if coalesce(v_state->>'readyStage','')<>v_session.stage then
    v_state:=v_state || jsonb_build_object(
      'readyStage',v_session.stage,
      'readyA',false,
      'readyB',false,
      'countdownStartedAt',null,
      'encounterStartAt',null,
      'stageStartedAt',null
    );
  end if;

  if nullif(v_state->>'encounterStartAt','') is not null then
    return jsonb_build_object('ok',true,'state',v_state,'serverNow',now(),'locked',true);
  end if;

  v_ready_path:=case when v_is_leader then array['readyA']::text[] else array['readyB']::text[] end;
  v_state:=jsonb_set(v_state,v_ready_path,to_jsonb(coalesce(p_ready,false)),true);

  v_ready_a:=coalesce((v_state->>'readyA')::boolean,false);
  v_ready_b:=coalesce((v_state->>'readyB')::boolean,false);

  if v_ready_a and v_ready_b then
    v_start_at:=now()+interval '3 seconds';
    v_state:=v_state || jsonb_build_object(
      'countdownStartedAt',now(),
      'encounterStartAt',v_start_at,
      'stageStartedAt',v_start_at
    );
  end if;

  update public.raid_sessions
  set state=v_state, updated_at=now()
  where id=p_session_id
  returning state into v_state;

  return jsonb_build_object(
    'ok',true,
    'state',v_state,
    'serverNow',now(),
    'locked',v_ready_a and v_ready_b
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.market_cancel_commodity_order(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_user uuid:=auth.uid(); v_o public.market_commodity_orders%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_o from public.market_commodity_orders where id=p_order_id for update;
  if not found or v_o.user_id<>v_user then raise exception 'Order not found'; end if;
  if v_o.status<>'active' then raise exception 'Order is no longer active'; end if;
  if v_o.side='buy' and v_o.reserved_gold>0 then
    perform private.market_credit_gold(v_user,v_o.reserved_gold);
  elsif v_o.side='sell' and v_o.quantity_remaining>0 then
    perform private.market_append_delivery(v_user,v_o.category,v_o.item_key,v_o.item_name,v_o.payload,v_o.quantity_remaining,'Cancelled commodity order');
  end if;
  update public.market_commodity_orders set status='cancelled',reserved_gold=0,updated_at=now() where id=v_o.id;
  return jsonb_build_object('ok',true,'side',v_o.side,'returnedQuantity',case when v_o.side='sell' then v_o.quantity_remaining else 0 end,'refundedGold',case when v_o.side='buy' then v_o.reserved_gold else 0 end);
end $function$
;
CREATE OR REPLACE FUNCTION public.market_cancel_listing(p_listing_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_user uuid:=auth.uid(); v_l public.trading_post_listings%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_l from public.trading_post_listings where id=p_listing_id for update;
  if not found or v_l.seller_id<>v_user then raise exception 'Listing not found'; end if;
  if v_l.status<>'active' then raise exception 'Listing is no longer active'; end if;
  perform private.market_append_delivery(v_user,v_l.category,v_l.item_key,v_l.item_name,v_l.payload,v_l.quantity,'Trading Post cancellation');
  update public.trading_post_listings set status='cancelled',updated_at=now() where id=v_l.id;
  return jsonb_build_object('ok',true,'returnedQuantity',v_l.quantity);
end $function$
;
CREATE OR REPLACE FUNCTION public.market_create_listing(p_category text, p_item_id text, p_item_key text, p_item_name text, p_quantity integer, p_unit_price integer, p_payload jsonb DEFAULT '{}'::jsonb, p_duration_hours integer DEFAULT 48)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_acc public.guild_accounts%rowtype;
  v_state jsonb;
  v_item jsonb;
  v_arr jsonb;
  v_qty integer:=greatest(1,least(coalesce(p_quantity,1),100000));
  v_price integer:=greatest(1,least(coalesce(p_unit_price,1),1000000000));
  v_listing public.trading_post_listings%rowtype;
  v_have integer;
  v_label text;
  v_payload jsonb:=coalesce(p_payload,'{}'::jsonb);
  v_name text:=p_item_name;
  v_key text:=p_item_key;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_category not in ('gear','material','consumable','recipe') then raise exception 'Unsupported category'; end if;
  if p_category <> 'gear' then raise exception 'Stackable goods must use commodity orders'; end if;

  select * into v_acc from public.guild_accounts where user_id=v_user for update;
  if not found then raise exception 'Guild account not found'; end if;
  v_state:=v_acc.game_state;

  select e into v_item
  from jsonb_array_elements(coalesce(v_state->'bank','[]'::jsonb)) e
  where e->>'id'=p_item_id
  limit 1;
  if v_item is null then raise exception 'Item not found in Guild Bank'; end if;
  if coalesce(v_item->>'tradeState','tradeable')='soulbound' then raise exception 'Soulbound items cannot be traded'; end if;
  v_have:=greatest(1,coalesce((v_item->>'quantity')::integer,1));
  if v_qty>v_have then raise exception 'Not enough quantity'; end if;
  v_payload:=v_item;
  v_name:=coalesce(v_item->>'name',p_item_name);
  v_key:=coalesce(v_item->>'itemId',p_item_key);

  select coalesce(jsonb_agg(
    case when e->>'id'=p_item_id and v_have-v_qty>0
      then jsonb_set(e,'{quantity}',to_jsonb(v_have-v_qty),true)
      else e end
  ) filter(where not(e->>'id'=p_item_id and v_have-v_qty<=0)),'[]'::jsonb)
  into v_arr
  from jsonb_array_elements(coalesce(v_state->'bank','[]'::jsonb)) e;

  v_state:=jsonb_set(v_state,'{bank}',v_arr,true);
  update public.guild_accounts set game_state=v_state,updated_at=now() where user_id=v_user;

  v_label:=coalesce(nullif(v_state->>'socialDisplayName',''),'Guild '||upper(substr(v_user::text,1,4)));

  insert into public.trading_post_listings(
    seller_id,seller_label,category,item_key,item_name,payload,quantity,original_quantity,unit_price,
    rarity,item_level,item_class,slot,status,expires_at
  ) values(
    v_user,v_label,'gear',v_key,v_name,v_payload,v_qty,v_qty,v_price,
    coalesce(v_payload->>'rarity','Common'),
    nullif(v_payload->>'itemLevel','')::integer,
    v_payload->>'class',v_payload->>'slot','active',
    now()+make_interval(hours=>greatest(1,least(coalesce(p_duration_hours,48),168)))
  ) returning * into v_listing;

  return to_jsonb(v_listing);
end $function$
;
CREATE OR REPLACE FUNCTION public.market_get_gear_listings(p_limit integer DEFAULT 300)
 RETURNS TABLE(id uuid, seller_label text, category text, item_key text, item_name text, payload jsonb, quantity integer, unit_price integer, status text, created_at timestamp with time zone, updated_at timestamp with time zone, rarity text, item_level integer, item_class text, slot text, original_quantity integer, sold_quantity integer, expires_at timestamp with time zone, is_own boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select
    l.id,l.seller_label,l.category,l.item_key,l.item_name,l.payload,l.quantity,l.unit_price,l.status,
    l.created_at,l.updated_at,l.rarity,l.item_level,l.item_class,l.slot,l.original_quantity,l.sold_quantity,l.expires_at,
    (l.seller_id = auth.uid()) as is_own
  from public.trading_post_listings l
  where auth.uid() is not null
    and l.status='active'
    and l.quantity>0
  order by l.created_at desc
  limit least(greatest(coalesce(p_limit,300),1),500);
$function$
;
CREATE OR REPLACE FUNCTION public.market_get_order_book(p_limit integer DEFAULT 600)
 RETURNS TABLE(id uuid, side text, category text, item_key text, item_name text, rarity text, payload jsonb, quantity_initial integer, quantity_remaining integer, unit_price integer, reserved_gold integer, status text, created_at timestamp with time zone, updated_at timestamp with time zone, expires_at timestamp with time zone, is_own boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select
    o.id,o.side,o.category,o.item_key,o.item_name,o.rarity,o.payload,o.quantity_initial,o.quantity_remaining,
    o.unit_price,o.reserved_gold,o.status,o.created_at,o.updated_at,o.expires_at,
    (o.user_id = auth.uid()) as is_own
  from public.market_commodity_orders o
  where auth.uid() is not null
    and o.status='active'
    and o.quantity_remaining>0
  order by o.created_at desc
  limit least(greatest(coalesce(p_limit,600),1),1000);
$function$
;
CREATE OR REPLACE FUNCTION public.market_get_trade_history(p_limit integer DEFAULT 300)
 RETURNS TABLE(id uuid, category text, item_key text, item_name text, rarity text, payload jsonb, quantity integer, unit_price integer, gross_gold integer, tax_gold integer, net_gold integer, source text, listing_id uuid, buy_order_id uuid, sell_order_id uuid, created_at timestamp with time zone, bought_by_me boolean, sold_by_me boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select
    t.id,t.category,t.item_key,t.item_name,t.rarity,t.payload,t.quantity,t.unit_price,t.gross_gold,t.tax_gold,t.net_gold,
    t.source,t.listing_id,t.buy_order_id,t.sell_order_id,t.created_at,
    (t.buyer_id = auth.uid()) as bought_by_me,
    (t.seller_id = auth.uid()) as sold_by_me
  from public.market_transactions t
  where auth.uid() is not null
  order by t.created_at desc
  limit least(greatest(coalesce(p_limit,300),1),500);
$function$
;
CREATE OR REPLACE FUNCTION public.market_place_commodity_order(p_side text, p_category text, p_item_key text, p_item_name text, p_quantity integer, p_unit_price integer, p_payload jsonb DEFAULT '{}'::jsonb, p_rarity text DEFAULT 'Common'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_user uuid:=auth.uid(); v_acc public.guild_accounts%rowtype; v_state jsonb;
  v_qty integer:=greatest(1,least(coalesce(p_quantity,1),100000));
  v_price integer:=greatest(1,least(coalesce(p_unit_price,1),1000000000));
  v_total integer; v_gold integer; v_order public.market_commodity_orders%rowtype;
  v_removed record; v_name text:=p_item_name; v_payload jsonb:=coalesce(p_payload,'{}'::jsonb); v_rarity text:=coalesce(nullif(p_rarity,''),'Common');
  v_ref record;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_side not in ('buy','sell') then raise exception 'Invalid order side'; end if;
  if p_category not in ('material','consumable','recipe') then raise exception 'Commodity category required'; end if;
  if coalesce(p_item_key,'')='' then raise exception 'Item key required'; end if;

  select * into v_acc from public.guild_accounts where user_id=v_user for update;
  if not found then raise exception 'Guild account not found'; end if;
  v_state:=v_acc.game_state;

  if p_category='material' then
    select item_name,rarity,payload into v_name,v_rarity,v_payload
    from private.market_material_catalog where item_key=p_item_key;
    if not found then raise exception 'Unknown reagent'; end if;
  elsif p_side='buy' then
    select item_name,rarity,payload into v_name,v_rarity,v_payload
    from (
      select item_name,rarity,payload,created_at
      from public.market_commodity_orders
      where category=p_category and item_key=p_item_key and side='sell'
      union all
      select item_name,coalesce(rarity,'Common'),payload,created_at
      from public.market_transactions
      where category=p_category and item_key=p_item_key
    ) x
    order by created_at desc limit 1;
    if not found then raise exception 'This item has not entered the market yet'; end if;
  end if;

  if p_side='buy' then
    v_total:=v_qty*v_price; v_gold:=coalesce((v_state->>'gold')::integer,0);
    if v_gold<v_total then raise exception 'Not enough gold'; end if;
    v_state:=jsonb_set(v_state,'{gold}',to_jsonb(v_gold-v_total),true);
    update public.guild_accounts set game_state=v_state,updated_at=now() where user_id=v_user;
  else
    select * into v_removed from private.market_remove_stackable(v_state,p_category,p_item_key,v_qty);
    v_state:=v_removed.new_state;
    if p_category<>'material' then
      v_name:=coalesce(v_removed.item_name,p_item_name);
      v_payload:=coalesce(v_removed.item_payload,'{}'::jsonb);
      v_rarity:=case when p_category='recipe' then 'Rare' else 'Common' end;
    end if;
    update public.guild_accounts set game_state=v_state,updated_at=now() where user_id=v_user;
  end if;

  insert into public.market_commodity_orders(
    user_id,side,category,item_key,item_name,rarity,payload,quantity_initial,quantity_remaining,unit_price,reserved_gold,status
  ) values(
    v_user,p_side,p_category,p_item_key,coalesce(nullif(v_name,''),p_item_key),v_rarity,v_payload,
    v_qty,v_qty,v_price,case when p_side='buy' then v_qty*v_price else 0 end,'active'
  ) returning * into v_order;

  return private.market_match_commodity(v_order.id);
end $function$
;
CREATE OR REPLACE FUNCTION public.market_sweep_my_expired()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_l public.trading_post_listings%rowtype;
  v_o public.market_commodity_orders%rowtype;
  v_gear integer:=0;
  v_orders integer:=0;
  v_refund integer:=0;
  v_returned integer:=0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  for v_l in
    select * from public.trading_post_listings
    where seller_id=v_user and status='active' and expires_at is not null and expires_at<=now()
    order by created_at
    for update
  loop
    perform private.market_append_delivery(v_user,v_l.category,v_l.item_key,v_l.item_name,v_l.payload,v_l.quantity,'Expired Trading Post listing');
    update public.trading_post_listings set status='cancelled',updated_at=now() where id=v_l.id;
    v_gear:=v_gear+1;
    v_returned:=v_returned+greatest(0,v_l.quantity);
  end loop;

  for v_o in
    select * from public.market_commodity_orders
    where user_id=v_user and status='active' and expires_at<=now()
    order by created_at
    for update
  loop
    if v_o.side='buy' and v_o.reserved_gold>0 then
      perform private.market_credit_gold(v_user,v_o.reserved_gold);
      v_refund:=v_refund+v_o.reserved_gold;
    elsif v_o.side='sell' and v_o.quantity_remaining>0 then
      perform private.market_append_delivery(v_user,v_o.category,v_o.item_key,v_o.item_name,v_o.payload,v_o.quantity_remaining,'Expired commodity order');
      v_returned:=v_returned+v_o.quantity_remaining;
    end if;
    update public.market_commodity_orders set status='expired',reserved_gold=0,updated_at=now() where id=v_o.id;
    v_orders:=v_orders+1;
  end loop;

  return jsonb_build_object(
    'gearListingsExpired',v_gear,
    'commodityOrdersExpired',v_orders,
    'goldRefunded',v_refund,
    'itemsReturned',v_returned
  );
end $function$
;
CREATE OR REPLACE FUNCTION public.post_chat_message(p_channel text, p_body text)
 RETURNS chat_messages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_label text;
  v_body text := btrim(coalesce(p_body,''));
  v_row public.chat_messages%rowtype;
  v_last timestamptz;
  v_badge text := 'player';
  v_admin_role text;
  v_mod_role text;
  v_reason text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_channel not in ('world','trade','party') then raise exception 'Invalid channel'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 300 then raise exception 'Messages must be 1–300 characters'; end if;

  v_reason := public.cellbound_chat_block_reason(v_body);
  if v_reason is not null then
    raise exception 'That message contains language blocked by the Cellbound chat filter';
  end if;

  select created_at into v_last
  from public.chat_messages
  where user_id = v_user
  order by created_at desc
  limit 1;

  if v_last is not null and v_last > now() - interval '2 seconds' then
    raise exception 'Please wait before sending another message';
  end if;

  select nullif(btrim(game_state->>'socialDisplayName'),'')
    into v_label
  from public.guild_accounts
  where user_id = v_user;

  v_label := coalesce(v_label,'Guild '||upper(substr(v_user::text,1,4)));

  select a.role
    into v_admin_role
  from public.cellbound_admins a
  where a.user_id = v_user;

  if found then
    v_badge := case when v_admin_role = 'owner' then 'owner' else 'mod' end;
  else
    select m.role into v_mod_role
    from public.cellbound_moderators m
    where m.user_id = v_user and m.active = true;
    if found then v_badge := v_mod_role; end if;
  end if;

  insert into public.chat_messages(user_id,guild_label,channel,body,sender_badge)
  values(v_user,left(v_label,24),p_channel,v_body,v_badge)
  returning * into v_row;

  return v_row;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.purchase_trading_listing(p_listing_id uuid, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_buyer uuid:=auth.uid(); v_l public.trading_post_listings%rowtype; v_acc public.guild_accounts%rowtype;
  v_qty integer:=greatest(1,p_quantity); v_total integer; v_gold integer; v_tax integer; v_net integer;
begin
  if v_buyer is null then raise exception 'Authentication required'; end if;
  select * into v_l from public.trading_post_listings where id=p_listing_id for update;
  if not found or v_l.status<>'active' then raise exception 'Listing is no longer available'; end if;
  if v_l.expires_at is not null and v_l.expires_at<=now() then
    perform private.market_append_delivery(v_l.seller_id,v_l.category,v_l.item_key,v_l.item_name,v_l.payload,v_l.quantity,'Expired Trading Post listing');
    update public.trading_post_listings set status='cancelled',updated_at=now() where id=v_l.id;
    return jsonb_build_object('ok',false,'reason','expired','message','Listing has expired');
  end if;
  if v_l.seller_id=v_buyer then raise exception 'You cannot buy your own listing'; end if;
  if v_qty>v_l.quantity then raise exception 'Not enough quantity remains'; end if;

  select * into v_acc from public.guild_accounts where user_id=v_buyer for update;
  if not found then raise exception 'Buyer guild account not found'; end if;
  v_total:=v_l.unit_price*v_qty; v_gold:=coalesce((v_acc.game_state->>'gold')::integer,0);
  if v_gold<v_total then raise exception 'Not enough gold'; end if;

  update public.guild_accounts
    set game_state=jsonb_set(game_state,'{gold}',to_jsonb(v_gold-v_total),true),updated_at=now()
    where user_id=v_buyer;
  perform private.market_append_delivery(v_buyer,v_l.category,v_l.item_key,v_l.item_name,v_l.payload,v_qty,'Trading Post purchase');

  v_tax:=floor(v_total*.05); v_net:=v_total-v_tax;
  insert into public.trading_post_proceeds(seller_id,listing_id,gross_gold,tax_gold,net_gold)
    values(v_l.seller_id,v_l.id,v_total,v_tax,v_net);

  insert into public.market_transactions(
    buyer_id,seller_id,category,item_key,item_name,rarity,payload,quantity,unit_price,gross_gold,tax_gold,net_gold,source,listing_id
  ) values(
    v_buyer,v_l.seller_id,v_l.category,v_l.item_key,v_l.item_name,coalesce(v_l.rarity,v_l.payload->>'rarity'),
    v_l.payload,v_qty,v_l.unit_price,v_total,v_tax,v_net,'gear_listing',v_l.id
  );

  update public.trading_post_listings
    set quantity=quantity-v_qty,sold_quantity=sold_quantity+v_qty,
        status=case when quantity-v_qty<=0 then 'sold' else 'active' end,updated_at=now()
    where id=v_l.id;

  return jsonb_build_object('ok',true,'totalGold',v_total,'taxGold',v_tax,'quantity',v_qty,'itemName',v_l.item_name);
end $function$
;
CREATE OR REPLACE FUNCTION public.record_dungeon_run(p_dungeon_id text, p_difficulty text, p_tier integer, p_completion_time_ms integer, p_target_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_dungeon_version integer, p_season_id text DEFAULT 'foundations-1'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_uid uuid:=auth.uid(); v_name text; v_progress public.dungeon_progress%rowtype; v_score integer; v_base integer;
 v_time_bonus integer:=0; v_tier integer:=greatest(0,coalesce(p_tier,0)); v_week date:=date_trunc('week',current_date)::date;
 v_week_points integer; v_timed boolean:=false; v_guild text; v_min_time integer; v_run_id bigint;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if p_dungeon_id not in ('ashen-vault','hollow-sanctum','chaos-canyon','blackout-station','fractured-ages') then raise exception 'Unknown dungeon'; end if;
 if p_difficulty not in ('normal','heroic','cellbound') then raise exception 'Invalid difficulty'; end if;
 if p_difficulty='cellbound' and (v_tier<1 or v_tier>20) then raise exception 'Cellbound+ tier must be 1–20'; end if;
 if p_difficulty<>'cellbound' then v_tier:=0; end if;
 if coalesce(p_dungeon_version,0)<1 then raise exception 'Invalid dungeon version'; end if;
 if coalesce(p_deaths,-1) not between 0 and 100 or coalesce(p_mechanics_failed,-1) not between 0 and 500 or coalesce(p_mistakes,-1) not between 0 and 500 then raise exception 'Invalid run metrics'; end if;
 v_min_time:=case when p_difficulty='normal' then 25000 when p_difficulty='heroic' then 35000 else 45000 end;
 if coalesce(p_completion_time_ms,0)<v_min_time or p_completion_time_ms>14400000 then raise exception 'Implausible completion time'; end if;
 if p_difficulty='cellbound' and coalesce(p_target_time_ms,0)<60000 then raise exception 'Invalid target time'; end if;

 select * into v_progress from public.dungeon_progress where user_id=v_uid and dungeon_id=p_dungeon_id;
 if not found then insert into public.dungeon_progress(user_id,dungeon_id) values(v_uid,p_dungeon_id) returning * into v_progress; end if;
 if p_difficulty='heroic' and not v_progress.heroic_unlocked then raise exception 'Heroic is not unlocked'; end if;
 if p_difficulty='cellbound' then
  if not v_progress.cellbound_unlocked then raise exception 'Cellbound+ is not unlocked'; end if;
  if v_tier>greatest(1,v_progress.highest_tier) then raise exception 'Cellbound+ tier is not unlocked'; end if;
 end if;

 v_name:=case p_dungeon_id
  when 'ashen-vault' then 'The Ashen Vault'
  when 'hollow-sanctum' then 'The Hollow Sanctum'
  when 'chaos-canyon' then 'Chaos Canyon'
  when 'blackout-station' then 'Blackout Station'
  when 'fractured-ages' then 'The Fractured Ages'
  else p_dungeon_id
 end;
 select coalesce(nullif(game_state->>'socialDisplayName',''),'Guild '||upper(left(v_uid::text,4))) into v_guild from public.guild_accounts where user_id=v_uid;
 v_guild:=coalesce(v_guild,'Guild '||upper(left(v_uid::text,4)));

 v_base:=case p_difficulty when 'normal' then 180 when 'heroic' then 360 else 500+v_tier*95 end;
 if p_difficulty='cellbound' then
  v_timed:=p_completion_time_ms<=p_target_time_ms;
  v_time_bonus:=greatest(-120,least(300,round((p_target_time_ms-p_completion_time_ms)::numeric/1000)*4));
 else
  v_time_bonus:=greatest(0,180-round(p_completion_time_ms::numeric/1000));
 end if;
 v_score:=greatest(0,v_base+v_time_bonus-(p_deaths*50)-(p_mechanics_failed*22)-(p_mistakes*8));

 insert into public.dungeon_runs(user_id,guild_label,dungeon_id,dungeon_name,difficulty,tier,season_id,dungeon_version,completion_time_ms,target_time_ms,deaths,mechanics_failed,mistakes,score,timed,valid)
 values(v_uid,v_guild,p_dungeon_id,v_name,p_difficulty,v_tier,p_season_id,p_dungeon_version,p_completion_time_ms,case when p_difficulty='cellbound' then p_target_time_ms else null end,p_deaths,p_mechanics_failed,p_mistakes,v_score,v_timed,true)
 returning id into v_run_id;

 update public.dungeon_progress set
  normal_clears=normal_clears+case when p_difficulty='normal' then 1 else 0 end,
  heroic_unlocked=heroic_unlocked or p_difficulty='normal',
  heroic_clears=heroic_clears+case when p_difficulty='heroic' then 1 else 0 end,
  cellbound_unlocked=cellbound_unlocked or p_difficulty='heroic',
  highest_tier=case when p_difficulty='heroic' then greatest(highest_tier,1) when p_difficulty='cellbound' then greatest(highest_tier,least(20,v_tier+1)) else highest_tier end,
  cellbound_clears=cellbound_clears+case when p_difficulty='cellbound' then 1 else 0 end,
  best_score=greatest(best_score,v_score),
  best_time_ms=case when best_time_ms is null then p_completion_time_ms else least(best_time_ms,p_completion_time_ms) end,
  updated_at=now()
 where user_id=v_uid and dungeon_id=p_dungeon_id returning * into v_progress;

 v_week_points:=case when p_difficulty='normal' then 10 when p_difficulty='heroic' then 25 else 30+v_tier*5 end;
 insert into public.dungeon_weekly_progress(user_id,week_start,season_id,progress_points,highest_tier,completed_runs)
 values(v_uid,v_week,p_season_id,v_week_points,v_tier,1)
 on conflict(user_id,week_start) do update set
  progress_points=public.dungeon_weekly_progress.progress_points+excluded.progress_points,
  highest_tier=greatest(public.dungeon_weekly_progress.highest_tier,excluded.highest_tier),
  completed_runs=public.dungeon_weekly_progress.completed_runs+1,updated_at=now();

 return jsonb_build_object('runId',v_run_id,'score',v_score,'timed',v_timed,'heroicUnlocked',v_progress.heroic_unlocked,'cellboundUnlocked',v_progress.cellbound_unlocked,'highestTier',v_progress.highest_tier,'weeklyPoints',(select progress_points from public.dungeon_weekly_progress where user_id=v_uid and week_start=v_week));
end
$function$
;
CREATE OR REPLACE FUNCTION public.record_dungeon_run_v2(p_dungeon_id text, p_difficulty text, p_tier integer, p_completion_time_ms integer, p_target_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_dungeon_version integer, p_season_id text, p_missed_interrupts integer DEFAULT 0, p_threat_losses integer DEFAULT 0, p_avoidable_damage numeric DEFAULT 0, p_battle_resurrections integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_uid uuid:=auth.uid(); v_result jsonb; v_run_id bigint; v_new text[]:=array[]::text[]; v_id text;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if coalesce(p_missed_interrupts,-1) not between 0 and 500 or coalesce(p_threat_losses,-1) not between 0 and 500 or coalesce(p_battle_resurrections,-1) not between 0 and 50 or coalesce(p_avoidable_damage,-1)<0 then raise exception 'Invalid diagnostic metrics'; end if;

 v_result:=public.record_dungeon_run(p_dungeon_id,p_difficulty,p_tier,p_completion_time_ms,p_target_time_ms,p_deaths,p_mechanics_failed,p_mistakes,p_dungeon_version,p_season_id);
 v_run_id:=(v_result->>'runId')::bigint;
 update public.dungeon_runs set missed_interrupts=p_missed_interrupts,threat_losses=p_threat_losses,avoidable_damage=p_avoidable_damage,battle_resurrections=p_battle_resurrections
 where id=v_run_id and user_id=v_uid;

 if p_difficulty='heroic' then
  insert into public.endgame_achievements(user_id,achievement_id,dungeon_id,season_id,metadata)
  values(v_uid,'first-heroic',p_dungeon_id,p_season_id,jsonb_build_object('runId',v_run_id))
  on conflict do nothing returning achievement_id into v_id;
  if v_id is not null then v_new:=array_append(v_new,v_id);v_id:=null;end if;
 end if;

 if p_difficulty='cellbound' and p_tier>=10 then
  insert into public.endgame_achievements(user_id,achievement_id,dungeon_id,season_id,metadata)
  values(v_uid,'cellbound-10',p_dungeon_id,p_season_id,jsonb_build_object('tier',p_tier,'runId',v_run_id))
  on conflict do nothing returning achievement_id into v_id;
  if v_id is not null then v_new:=array_append(v_new,v_id);v_id:=null;end if;
 end if;

 if p_deaths=0 then
  insert into public.endgame_achievements(user_id,achievement_id,dungeon_id,season_id,metadata)
  values(v_uid,'deathless',p_dungeon_id,p_season_id,jsonb_build_object('difficulty',p_difficulty,'tier',p_tier,'runId',v_run_id))
  on conflict do nothing returning achievement_id into v_id;
  if v_id is not null then v_new:=array_append(v_new,v_id);v_id:=null;end if;
 end if;

 if p_difficulty<>'normal' and p_mechanics_failed=0 then
  insert into public.endgame_achievements(user_id,achievement_id,dungeon_id,season_id,metadata)
  values(v_uid,'clean-mechanics',p_dungeon_id,p_season_id,jsonb_build_object('difficulty',p_difficulty,'tier',p_tier,'runId',v_run_id))
  on conflict do nothing returning achievement_id into v_id;
  if v_id is not null then v_new:=array_append(v_new,v_id);v_id:=null;end if;
 end if;

 if p_difficulty<>'normal' and p_missed_interrupts=0 then
  insert into public.endgame_achievements(user_id,achievement_id,dungeon_id,season_id,metadata)
  values(v_uid,'perfect-interrupts',p_dungeon_id,p_season_id,jsonb_build_object('difficulty',p_difficulty,'tier',p_tier,'runId',v_run_id))
  on conflict do nothing returning achievement_id into v_id;
  if v_id is not null then v_new:=array_append(v_new,v_id);v_id:=null;end if;
 end if;

 if p_difficulty='cellbound' and p_completion_time_ms<=p_target_time_ms then
  insert into public.endgame_achievements(user_id,achievement_id,dungeon_id,season_id,metadata)
  values(v_uid,'in-time',p_dungeon_id,p_season_id,jsonb_build_object('tier',p_tier,'timeMs',p_completion_time_ms,'runId',v_run_id))
  on conflict do nothing returning achievement_id into v_id;
  if v_id is not null then v_new:=array_append(v_new,v_id);v_id:=null;end if;
 end if;

 return v_result||jsonb_build_object('newAchievements',to_jsonb(v_new));
end $function$
;
CREATE OR REPLACE FUNCTION public.record_dungeon_run_v3(p_attempt_id uuid, p_completion_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_missed_interrupts integer DEFAULT 0, p_threat_losses integer DEFAULT 0, p_avoidable_damage numeric DEFAULT 0, p_battle_resurrections integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid(); v_attempt public.dungeon_attempts%rowtype; v_floor integer; v_result jsonb; v_run_id bigint; v_reason text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_attempt from public.dungeon_attempts where id=p_attempt_id and user_id=v_uid for update;
  if not found then return jsonb_build_object('valid',false,'reason','attempt-not-found'); end if;
  if v_attempt.status<>'active' then
    insert into public.dungeon_integrity_events(user_id,attempt_id,reason,payload) values(v_uid,p_attempt_id,'attempt-not-active',jsonb_build_object('status',v_attempt.status));
    return jsonb_build_object('valid',false,'reason','attempt-not-active');
  end if;
  if now()-v_attempt.started_at>interval '4 hours' then
    update public.dungeon_attempts set status='invalid',completed_at=now(),invalid_reason='expired' where id=p_attempt_id;
    insert into public.dungeon_integrity_events(user_id,attempt_id,reason) values(v_uid,p_attempt_id,'expired');
    return jsonb_build_object('valid',false,'reason','expired');
  end if;

  if coalesce(p_deaths,-1) not between 0 and 100 or coalesce(p_mechanics_failed,-1) not between 0 and 500
     or coalesce(p_mistakes,-1) not between 0 and 500 or coalesce(p_missed_interrupts,-1) not between 0 and 500
     or coalesce(p_threat_losses,-1) not between 0 and 500 or coalesce(p_battle_resurrections,-1) not between 0 and 50
     or coalesce(p_avoidable_damage,-1)<0 then v_reason:='invalid-metrics'; end if;

  v_floor:=case
    when v_attempt.dungeon_id='ashen-vault' and v_attempt.difficulty='normal' then 180000
    when v_attempt.dungeon_id='ashen-vault' and v_attempt.difficulty='heroic' then 190000
    when v_attempt.dungeon_id='ashen-vault' then 200000
    when v_attempt.dungeon_id='chaos-canyon' and v_attempt.difficulty='normal' then 90000
    when v_attempt.dungeon_id='chaos-canyon' and v_attempt.difficulty='heroic' then 100000
    when v_attempt.dungeon_id='chaos-canyon' then 110000
    when v_attempt.difficulty='normal' then 90000
    when v_attempt.difficulty='heroic' then 100000
    else 110000
  end;

  if v_reason is null and (coalesce(p_completion_time_ms,0)<v_floor or p_completion_time_ms>14400000) then v_reason:='implausible-completion-time'; end if;
  if v_reason is not null then
    update public.dungeon_attempts set status='invalid',completed_at=now(),invalid_reason=v_reason where id=p_attempt_id;
    insert into public.dungeon_integrity_events(user_id,attempt_id,reason,payload)
    values(v_uid,p_attempt_id,v_reason,jsonb_build_object('completionTimeMs',p_completion_time_ms,'deaths',p_deaths,'mechanicsFailed',p_mechanics_failed,'mistakes',p_mistakes));
    return jsonb_build_object('valid',false,'reason',v_reason);
  end if;

  v_result:=public.record_dungeon_run_v2(v_attempt.dungeon_id,v_attempt.difficulty,v_attempt.tier,p_completion_time_ms,v_attempt.target_time_ms,p_deaths,p_mechanics_failed,p_mistakes,v_attempt.dungeon_version,v_attempt.season_id,p_missed_interrupts,p_threat_losses,p_avoidable_damage,p_battle_resurrections);
  v_run_id:=(v_result->>'runId')::bigint;
  update public.dungeon_runs set attempt_id=p_attempt_id,party_snapshot=v_attempt.party_snapshot,party_signature=v_attempt.party_signature,party_classes=v_attempt.party_classes where id=v_run_id and user_id=v_uid;
  update public.dungeon_attempts set status='completed',completed_at=now(),run_id=v_run_id where id=p_attempt_id;
  return v_result||jsonb_build_object('valid',true,'attemptId',p_attempt_id);
end
$function$
;
CREATE OR REPLACE FUNCTION public.refresh_world_bosses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Shared world bosses are intentionally retired. Twelve Below is the active world event.
  return;
end
$function$
;
CREATE OR REPLACE FUNCTION public.resume_dungeon_attempt(p_dungeon_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_attempt public.dungeon_attempts%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select * into v_attempt
  from public.dungeon_attempts
  where user_id=v_uid
    and dungeon_id=p_dungeon_id
    and status='active'
  order by started_at desc
  limit 1
  for update;

  if not found then return jsonb_build_object('active',false); end if;

  if now()-v_attempt.started_at>interval '4 hours' then
    update public.dungeon_attempts
       set status='invalid',completed_at=now(),invalid_reason='expired'
     where id=v_attempt.id;
    return jsonb_build_object('active',false,'reason','expired');
  end if;

  return jsonb_build_object(
    'active',true,
    'attemptId',v_attempt.id,
    'dungeonId',v_attempt.dungeon_id,
    'difficulty',v_attempt.difficulty,
    'tier',v_attempt.tier,
    'seasonId',v_attempt.season_id,
    'dungeonVersion',v_attempt.dungeon_version,
    'targetTimeMs',v_attempt.target_time_ms,
    'seed',v_attempt.seed,
    'party',v_attempt.party_snapshot,
    'startedAt',v_attempt.started_at,
    'runtimeState',v_attempt.runtime_state,
    'runtimeUpdatedAt',v_attempt.runtime_updated_at,
    'serverNow',now()
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.save_dungeon_attempt_runtime(p_attempt_id uuid, p_runtime_state jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_attempt public.dungeon_attempts%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_runtime_state is null or jsonb_typeof(p_runtime_state)<>'object' then
    raise exception 'Runtime state must be an object';
  end if;
  if octet_length(p_runtime_state::text)>1048576 then
    raise exception 'Runtime state is too large';
  end if;

  select * into v_attempt
  from public.dungeon_attempts
  where id=p_attempt_id and user_id=v_uid
  for update;

  if not found then raise exception 'Dungeon attempt not found'; end if;
  if v_attempt.status<>'active' then
    return jsonb_build_object('ok',false,'reason','attempt-not-active','status',v_attempt.status);
  end if;
  if now()-v_attempt.started_at>interval '4 hours' then
    update public.dungeon_attempts
       set status='invalid',completed_at=now(),invalid_reason='expired'
     where id=p_attempt_id;
    return jsonb_build_object('ok',false,'reason','expired');
  end if;

  update public.dungeon_attempts
     set runtime_state=p_runtime_state,
         runtime_updated_at=now()
   where id=p_attempt_id;

  return jsonb_build_object('ok',true,'attemptId',p_attempt_id,'serverNow',now());
end
$function$
;
CREATE OR REPLACE FUNCTION public.start_manor_raid(p_listing_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_listing public.party_finder_listings%rowtype;
  v_count integer;
  v_ready integer;
  v_unlocked integer;
  v_start timestamptz:=to_timestamp(floor(extract(epoch from now())/172800)*172800);
  v_blocked integer;
  v_session uuid;
  v_last_completed uuid;
  v_claimed integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_listing from public.party_finder_listings where id=p_listing_id for update;
  if not found or v_listing.content_type<>'raid' or v_listing.target_id<>'manor'
    then raise exception 'The Manor raid group was not found';
  end if;
  if v_listing.leader_id<>v_user then raise exception 'Only the group leader can start the raid'; end if;

  select id into v_session from public.raid_sessions
   where listing_id=p_listing_id and status='active' limit 1;
  if v_session is not null then return v_session; end if;

  select count(*) into v_count from public.party_finder_members where listing_id=p_listing_id;
  if v_count<>2 then raise exception 'The Manor requires exactly 2 players'; end if;

  select count(*) into v_ready from public.party_finder_members
   where listing_id=p_listing_id
     and jsonb_typeof(party_snapshot)='array'
     and jsonb_array_length(party_snapshot)=5;
  if v_ready<>2 then raise exception 'Both players must lock in a complete five-character party'; end if;

  select count(*) into v_unlocked
  from public.party_finder_members m
  join public.guild_accounts g on g.user_id=m.user_id
  where m.listing_id=p_listing_id
    and lower(coalesce(g.game_state #>> '{progression,manorRaidUnlocked}','false'))='true';
  if v_unlocked<>2 then raise exception 'Both players must complete the Manor attunement'; end if;

  select id into v_last_completed
  from public.raid_sessions
  where listing_id=p_listing_id and status='completed'
  order by completed_at desc nulls last, started_at desc
  limit 1;

  if v_last_completed is not null then
    select count(*) into v_claimed
    from public.raid_reward_claims r
    where r.session_id=v_last_completed
      and r.user_id in (select user_id from public.party_finder_members where listing_id=p_listing_id);
    if v_claimed<2 then
      raise exception 'Both players must collect their previous Manor rewards before another run can begin';
    end if;
  end if;

  insert into public.raid_lockouts(user_id,raid_id,window_start,runs_used)
  select m.user_id,'manor',v_start,0 from public.party_finder_members m where m.listing_id=p_listing_id
  on conflict(user_id,raid_id) do update
    set window_start=excluded.window_start,
        runs_used=case when public.raid_lockouts.window_start=excluded.window_start then public.raid_lockouts.runs_used else 0 end,
        updated_at=now();

  select count(*) into v_blocked
  from public.raid_lockouts l
  join public.party_finder_members m on m.user_id=l.user_id
  where m.listing_id=p_listing_id and l.raid_id='manor'
    and l.window_start=v_start and l.runs_used>=3;
  if v_blocked>0 then raise exception 'A player in this group has used all Manor runs for this reset'; end if;

  update public.raid_lockouts l
     set runs_used=runs_used+1,updated_at=now()
   where l.raid_id='manor'
     and l.user_id in (select user_id from public.party_finder_members where listing_id=p_listing_id);

  insert into public.raid_sessions(listing_id,leader_id,state)
  values(
    p_listing_id,v_user,
    jsonb_build_object(
      'stageStartedAt',null,
      'readyStage','butler',
      'readyA',false,'readyB',false,
      'countdownStartedAt',null,'encounterStartAt',null,
      'maidPenaltyA',0,'maidPenaltyB',0,
      'screechCountA',0,'screechCountB',0,
      'screechSuccessA',0,'screechSuccessB',0,
      'events',jsonb_build_array('The Manor doors close behind the raid.')
    )
  ) returning id into v_session;

  return v_session;
end
$function$
;
CREATE OR REPLACE FUNCTION public.sync_party_finder_party(p_listing_id uuid, p_party_snapshot jsonb, p_party_ilvl numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_party_snapshot)<>'array' or jsonb_array_length(p_party_snapshot)<>5
    then raise exception 'A complete five-character party is required';
  end if;
  update public.party_finder_members
     set party_snapshot=p_party_snapshot, party_ilvl=greatest(0,p_party_ilvl)
   where listing_id=p_listing_id and user_id=v_user;
  if not found then raise exception 'You are not a member of this group'; end if;
  return jsonb_build_object('ok',true);
end
$function$
;
alter table public."analytics_events" alter column "user_id" set default auth.uid();
alter table public."analytics_events" alter column "session_id" set default ''::text;
alter table public."analytics_events" alter column "channel" set default 'unknown'::text;
alter table public."analytics_events" alter column "build_id" set default ''::text;
alter table public."analytics_events" alter column "build_number" set default 0;
alter table public."analytics_events" alter column "page_view" set default ''::text;
alter table public."analytics_events" alter column "properties" set default '{}'::jsonb;
alter table public."analytics_events" alter column "created_at" set default now();
alter table public."beta_reports" alter column "id" set default gen_random_uuid();
alter table public."beta_reports" alter column "user_id" set default auth.uid();
alter table public."beta_reports" alter column "details" set default ''::text;
alter table public."beta_reports" alter column "page_view" set default ''::text;
alter table public."beta_reports" alter column "build_id" set default ''::text;
alter table public."beta_reports" alter column "build_number" set default 0;
alter table public."beta_reports" alter column "context" set default '{}'::jsonb;
alter table public."beta_reports" alter column "status" set default 'new'::text;
alter table public."beta_reports" alter column "admin_note" set default ''::text;
alter table public."beta_reports" alter column "created_at" set default now();
alter table public."beta_reports" alter column "updated_at" set default now();
alter table public."cellbound_admins" alter column "role" set default 'admin'::text;
alter table public."cellbound_admins" alter column "auto_clear_cell_shock" set default false;
alter table public."cellbound_admins" alter column "created_at" set default now();
alter table public."cellbound_admins" alter column "updated_at" set default now();
alter table public."cellbound_boss_drop_tables" alter column "drops" set default '[]'::jsonb;
alter table public."cellbound_boss_drop_tables" alter column "updated_at" set default now();
alter table public."cellbound_comic_text" alter column "updated_at" set default now();
alter table public."cellbound_design_blueprints" alter column "id" set default gen_random_uuid();
alter table public."cellbound_design_blueprints" alter column "status" set default 'draft'::text;
alter table public."cellbound_design_blueprints" alter column "blueprint" set default '{}'::jsonb;
alter table public."cellbound_design_blueprints" alter column "version" set default 1;
alter table public."cellbound_design_blueprints" alter column "created_by" set default auth.uid();
alter table public."cellbound_design_blueprints" alter column "updated_by" set default auth.uid();
alter table public."cellbound_design_blueprints" alter column "created_at" set default now();
alter table public."cellbound_design_blueprints" alter column "updated_at" set default now();
alter table public."cellbound_design_blueprints" alter column "draft_blueprint" set default '{}'::jsonb;
alter table public."cellbound_design_templates" alter column "id" set default gen_random_uuid();
alter table public."cellbound_design_templates" alter column "status" set default 'draft'::text;
alter table public."cellbound_design_templates" alter column "blueprint" set default '{}'::jsonb;
alter table public."cellbound_design_templates" alter column "draft_blueprint" set default '{}'::jsonb;
alter table public."cellbound_design_templates" alter column "version" set default 1;
alter table public."cellbound_design_templates" alter column "created_by" set default auth.uid();
alter table public."cellbound_design_templates" alter column "updated_by" set default auth.uid();
alter table public."cellbound_design_templates" alter column "created_at" set default now();
alter table public."cellbound_design_templates" alter column "updated_at" set default now();
alter table public."cellbound_moderators" alter column "active" set default true;
alter table public."cellbound_moderators" alter column "created_at" set default now();
alter table public."cellbound_moderators" alter column "updated_at" set default now();
alter table public."cellbound_profession_highscores" alter column "updated_at" set default now();
alter table public."cellbound_pvp_commands" alter column "received_at" set default now();
alter table public."cellbound_pvp_map_drafts" alter column "updated_at" set default now();
alter table public."cellbound_pvp_maps" alter column "version" set default 1;
alter table public."cellbound_pvp_maps" alter column "published_at" set default now();
alter table public."cellbound_pvp_match_events" alter column "recorded_at" set default now();
alter table public."cellbound_pvp_match_participants" alter column "ready" set default false;
alter table public."cellbound_pvp_match_participants" alter column "connected" set default true;
alter table public."cellbound_pvp_match_participants" alter column "last_command_sequence" set default 0;
alter table public."cellbound_pvp_match_participants" alter column "joined_at" set default now();
alter table public."cellbound_pvp_match_rosters" alter column "sealed_at" set default now();
alter table public."cellbound_pvp_match_snapshots" alter column "recorded_at" set default now();
alter table public."cellbound_pvp_matches" alter column "id" set default gen_random_uuid();
alter table public."cellbound_pvp_matches" alter column "status" set default 'forming'::text;
alter table public."cellbound_pvp_matches" alter column "revision" set default 1;
alter table public."cellbound_pvp_matches" alter column "created_at" set default now();
alter table public."cellbound_pvp_matches" alter column "ready_deadline" set default (now() + '00:00:15'::interval);
alter table public."cellbound_pvp_queue_entries" alter column "id" set default gen_random_uuid();
alter table public."cellbound_pvp_queue_entries" alter column "status" set default 'waiting'::text;
alter table public."cellbound_pvp_queue_entries" alter column "joined_at" set default now();
alter table public."cellbound_pvp_queue_entries" alter column "expires_at" set default (now() + '00:10:00'::interval);
alter table public."cellbound_release_state" alter column "singleton" set default true;
alter table public."cellbound_release_state" alter column "message" set default 'A new Cellbound update is ready. Load the latest version to continue.'::text;
alter table public."cellbound_room_art" alter column "updated_at" set default now();
alter table public."cellbound_room_layouts" alter column "layout" set default '{"markers": []}'::jsonb;
alter table public."cellbound_room_layouts" alter column "version" set default 1;
alter table public."cellbound_room_layouts" alter column "published_at" set default now();
alter table public."cellbound_world_presence" alter column "updated_at" set default now();
alter table public."character_abilities" alter column "id" set default gen_random_uuid();
alter table public."character_abilities" alter column "cooldown_ms" set default 0;
alter table public."character_abilities" alter column "metadata" set default '{}'::jsonb;
alter table public."character_abilities" alter column "unlocked_at" set default now();
alter table public."character_cells" alter column "id" set default gen_random_uuid();
alter table public."character_cells" alter column "description" set default ''::text;
alter table public."character_cells" alter column "absorbed" set default false;
alter table public."character_cells" alter column "acquired_at" set default now();
alter table public."characters" alter column "id" set default gen_random_uuid();
alter table public."characters" alter column "tutorial_complete" set default false;
alter table public."characters" alter column "created_at" set default now();
alter table public."characters" alter column "updated_at" set default now();
alter table public."characters" alter column "appearance" set default '{}'::jsonb;
alter table public."characters" alter column "creation_complete" set default false;
alter table public."characters" alter column "level" set default 1;
alter table public."characters" alter column "xp" set default 0;
alter table public."characters" alter column "current_hp" set default 100;
alter table public."characters" alter column "max_hp" set default 100;
alter table public."characters" alter column "current_location" set default 'zeltira'::text;
alter table public."characters" alter column "tutorial_stage" set default 'arrived_zeltira'::text;
alter table public."characters" alter column "tutorial_reward_claimed" set default false;
alter table public."characters" alter column "last_played_at" set default now();
alter table public."chat_messages" alter column "id" set default gen_random_uuid();
alter table public."chat_messages" alter column "created_at" set default now();
alter table public."chat_messages" alter column "sender_badge" set default 'player'::text;
alter table public."comic_scene_panel_art" alter column "updated_at" set default now();
alter table public."dungeon_affix_rotation" alter column "created_at" set default now();
alter table public."dungeon_attempts" alter column "id" set default gen_random_uuid();
alter table public."dungeon_attempts" alter column "tier" set default 0;
alter table public."dungeon_attempts" alter column "status" set default 'active'::text;
alter table public."dungeon_attempts" alter column "started_at" set default now();
alter table public."dungeon_attempts" alter column "party_snapshot" set default '[]'::jsonb;
alter table public."dungeon_attempts" alter column "party_classes" set default '{}'::text[];
alter table public."dungeon_attempts" alter column "runtime_state" set default '{}'::jsonb;
alter table public."dungeon_integrity_events" alter column "payload" set default '{}'::jsonb;
alter table public."dungeon_integrity_events" alter column "created_at" set default now();
alter table public."dungeon_progress" alter column "normal_clears" set default 0;
alter table public."dungeon_progress" alter column "heroic_unlocked" set default false;
alter table public."dungeon_progress" alter column "heroic_clears" set default 0;
alter table public."dungeon_progress" alter column "cellbound_unlocked" set default false;
alter table public."dungeon_progress" alter column "highest_tier" set default 0;
alter table public."dungeon_progress" alter column "cellbound_clears" set default 0;
alter table public."dungeon_progress" alter column "best_score" set default 0;
alter table public."dungeon_progress" alter column "updated_at" set default now();
alter table public."dungeon_runs" alter column "tier" set default 0;
alter table public."dungeon_runs" alter column "dungeon_version" set default 1;
alter table public."dungeon_runs" alter column "deaths" set default 0;
alter table public."dungeon_runs" alter column "mechanics_failed" set default 0;
alter table public."dungeon_runs" alter column "mistakes" set default 0;
alter table public."dungeon_runs" alter column "timed" set default false;
alter table public."dungeon_runs" alter column "valid" set default true;
alter table public."dungeon_runs" alter column "created_at" set default now();
alter table public."dungeon_runs" alter column "missed_interrupts" set default 0;
alter table public."dungeon_runs" alter column "threat_losses" set default 0;
alter table public."dungeon_runs" alter column "avoidable_damage" set default 0;
alter table public."dungeon_runs" alter column "battle_resurrections" set default 0;
alter table public."dungeon_runs" alter column "party_snapshot" set default '[]'::jsonb;
alter table public."dungeon_runs" alter column "party_classes" set default '{}'::text[];
alter table public."dungeon_weekly_progress" alter column "progress_points" set default 0;
alter table public."dungeon_weekly_progress" alter column "highest_tier" set default 0;
alter table public."dungeon_weekly_progress" alter column "completed_runs" set default 0;
alter table public."dungeon_weekly_progress" alter column "reward_claimed" set default false;
alter table public."dungeon_weekly_progress" alter column "updated_at" set default now();
alter table public."endgame_achievements" alter column "dungeon_id" set default 'global'::text;
alter table public."endgame_achievements" alter column "unlocked_at" set default now();
alter table public."endgame_achievements" alter column "metadata" set default '{}'::jsonb;
alter table public."endgame_seasons" alter column "active" set default false;
alter table public."endgame_seasons" alter column "created_at" set default now();
alter table public."guild_accounts" alter column "game_state" set default '{}'::jsonb;
alter table public."guild_accounts" alter column "membership_override" set default false;
alter table public."guild_accounts" alter column "created_at" set default now();
alter table public."guild_accounts" alter column "updated_at" set default now();
alter table public."inventory_items" alter column "id" set default gen_random_uuid();
alter table public."inventory_items" alter column "quantity" set default 1;
alter table public."inventory_items" alter column "rarity" set default 'common'::text;
alter table public."inventory_items" alter column "metadata" set default '{}'::jsonb;
alter table public."inventory_items" alter column "created_at" set default now();
alter table public."inventory_items" alter column "updated_at" set default now();
alter table public."market_commodity_orders" alter column "id" set default gen_random_uuid();
alter table public."market_commodity_orders" alter column "rarity" set default 'Common'::text;
alter table public."market_commodity_orders" alter column "payload" set default '{}'::jsonb;
alter table public."market_commodity_orders" alter column "reserved_gold" set default 0;
alter table public."market_commodity_orders" alter column "status" set default 'active'::text;
alter table public."market_commodity_orders" alter column "created_at" set default now();
alter table public."market_commodity_orders" alter column "updated_at" set default now();
alter table public."market_commodity_orders" alter column "expires_at" set default (now() + '30 days'::interval);
alter table public."market_saved_searches" alter column "id" set default gen_random_uuid();
alter table public."market_saved_searches" alter column "filters" set default '{}'::jsonb;
alter table public."market_saved_searches" alter column "created_at" set default now();
alter table public."market_transactions" alter column "id" set default gen_random_uuid();
alter table public."market_transactions" alter column "payload" set default '{}'::jsonb;
alter table public."market_transactions" alter column "tax_gold" set default 0;
alter table public."market_transactions" alter column "created_at" set default now();
alter table public."market_watchlist" alter column "created_at" set default now();
alter table public."party_finder_listings" alter column "id" set default gen_random_uuid();
alter table public."party_finder_listings" alter column "note" set default ''::text;
alter table public."party_finder_listings" alter column "party_ilvl" set default 0;
alter table public."party_finder_listings" alter column "status" set default 'open'::text;
alter table public."party_finder_listings" alter column "created_at" set default now();
alter table public."party_finder_listings" alter column "expires_at" set default (now() + '02:00:00'::interval);
alter table public."party_finder_members" alter column "party_ilvl" set default 0;
alter table public."party_finder_members" alter column "joined_at" set default now();
alter table public."party_finder_members" alter column "party_snapshot" set default '[]'::jsonb;
alter table public."profiles" alter column "created_at" set default now();
alter table public."profiles" alter column "updated_at" set default now();
alter table public."quest_progress" alter column "id" set default gen_random_uuid();
alter table public."quest_progress" alter column "status" set default 'active'::text;
alter table public."quest_progress" alter column "objective_index" set default 0;
alter table public."quest_progress" alter column "data" set default '{}'::jsonb;
alter table public."quest_progress" alter column "created_at" set default now();
alter table public."quest_progress" alter column "updated_at" set default now();
alter table public."raid_lockouts" alter column "raid_id" set default 'manor'::text;
alter table public."raid_lockouts" alter column "runs_used" set default 0;
alter table public."raid_lockouts" alter column "updated_at" set default now();
alter table public."raid_reward_claims" alter column "claimed_at" set default now();
alter table public."raid_sessions" alter column "id" set default gen_random_uuid();
alter table public."raid_sessions" alter column "raid_id" set default 'manor'::text;
alter table public."raid_sessions" alter column "status" set default 'active'::text;
alter table public."raid_sessions" alter column "stage" set default 'butler'::text;
alter table public."raid_sessions" alter column "state" set default '{}'::jsonb;
alter table public."raid_sessions" alter column "started_at" set default now();
alter table public."raid_sessions" alter column "updated_at" set default now();
alter table public."trading_post_listings" alter column "id" set default gen_random_uuid();
alter table public."trading_post_listings" alter column "seller_label" set default 'Player Guild'::text;
alter table public."trading_post_listings" alter column "payload" set default '{}'::jsonb;
alter table public."trading_post_listings" alter column "status" set default 'active'::text;
alter table public."trading_post_listings" alter column "created_at" set default now();
alter table public."trading_post_listings" alter column "updated_at" set default now();
alter table public."trading_post_listings" alter column "original_quantity" set default 1;
alter table public."trading_post_listings" alter column "sold_quantity" set default 0;
alter table public."trading_post_proceeds" alter column "id" set default gen_random_uuid();
alter table public."trading_post_proceeds" alter column "claimed" set default false;
alter table public."trading_post_proceeds" alter column "created_at" set default now();
alter table public."world_boss_participants" alter column "damage_done" set default 0;
alter table public."world_boss_participants" alter column "joined_at" set default now();
alter table public."world_boss_participants" alter column "threat_done" set default 0;
alter table public."world_boss_participants" alter column "healing_done" set default 0;
alter table public."world_boss_participants" alter column "threat_breakdown" set default '{}'::jsonb;
alter table public."world_boss_participants" alter column "combat_state" set default '{}'::jsonb;
alter table public."world_boss_participants" alter column "combat_event_seq" set default 0;
alter table public."world_boss_rewards" alter column "id" set default gen_random_uuid();
alter table public."world_boss_rewards" alter column "claimed" set default false;
alter table public."world_boss_rewards" alter column "created_at" set default now();
alter table public."world_bosses" alter column "generation" set default 0;
alter table public."world_bosses" alter column "updated_at" set default now();
alter table public."inventory_items" add constraint "inventory_items_character_id_item_key_key" UNIQUE (character_id, item_key);
alter table public."inventory_items" add constraint "inventory_items_pkey" PRIMARY KEY (id);
alter table public."inventory_items" add constraint "inventory_items_quantity_check" CHECK ((quantity >= 0));
alter table public."character_cells" add constraint "character_cells_character_id_cell_key_key" UNIQUE (character_id, cell_key);
alter table public."character_cells" add constraint "character_cells_pkey" PRIMARY KEY (id);
alter table public."quest_progress" add constraint "quest_progress_character_id_quest_key_key" UNIQUE (character_id, quest_key);
alter table public."quest_progress" add constraint "quest_progress_objective_index_check" CHECK ((objective_index >= 0));
alter table public."quest_progress" add constraint "quest_progress_pkey" PRIMARY KEY (id);
alter table public."quest_progress" add constraint "quest_progress_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'complete'::text])));
alter table public."character_abilities" add constraint "character_abilities_character_id_ability_key_key" UNIQUE (character_id, ability_key);
alter table public."character_abilities" add constraint "character_abilities_cooldown_ms_check" CHECK ((cooldown_ms >= 0));
alter table public."character_abilities" add constraint "character_abilities_hotbar_slot_check" CHECK (((hotbar_slot >= 1) AND (hotbar_slot <= 10)));
alter table public."character_abilities" add constraint "character_abilities_pkey" PRIMARY KEY (id);
alter table public."trading_post_proceeds" add constraint "trading_post_proceeds_gross_gold_check" CHECK ((gross_gold >= 0));
alter table public."trading_post_proceeds" add constraint "trading_post_proceeds_net_gold_check" CHECK ((net_gold >= 0));
alter table public."trading_post_proceeds" add constraint "trading_post_proceeds_pkey" PRIMARY KEY (id);
alter table public."trading_post_proceeds" add constraint "trading_post_proceeds_tax_gold_check" CHECK ((tax_gold >= 0));
alter table public."world_boss_rewards" add constraint "world_boss_rewards_boss_id_generation_user_id_key" UNIQUE (boss_id, generation, user_id);
alter table public."world_boss_rewards" add constraint "world_boss_rewards_item_tier_check" CHECK (((item_tier >= 1) AND (item_tier <= 3)));
alter table public."world_boss_rewards" add constraint "world_boss_rewards_pkey" PRIMARY KEY (id);
alter table public."cellbound_admins" add constraint "cellbound_admins_pkey" PRIMARY KEY (user_id);
alter table public."cellbound_admins" add constraint "cellbound_admins_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'owner'::text])));
alter table public."world_boss_participants" add constraint "world_boss_participants_pkey" PRIMARY KEY (boss_id, generation, user_id);
alter table public."dungeon_attempts" add constraint "dungeon_attempts_difficulty_check" CHECK ((difficulty = ANY (ARRAY['normal'::text, 'heroic'::text, 'cellbound'::text])));
alter table public."dungeon_attempts" add constraint "dungeon_attempts_dungeon_version_check" CHECK ((dungeon_version >= 1));
alter table public."dungeon_attempts" add constraint "dungeon_attempts_pkey" PRIMARY KEY (id);
alter table public."dungeon_attempts" add constraint "dungeon_attempts_runtime_state_object" CHECK ((jsonb_typeof(runtime_state) = 'object'::text));
alter table public."dungeon_attempts" add constraint "dungeon_attempts_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'abandoned'::text, 'invalid'::text])));
alter table public."dungeon_attempts" add constraint "dungeon_attempts_tier_check" CHECK (((tier >= 0) AND (tier <= 20)));
alter table public."dungeon_runs" add constraint "dungeon_runs_avoidable_damage_check" CHECK ((avoidable_damage >= (0)::numeric));
alter table public."dungeon_runs" add constraint "dungeon_runs_battle_resurrections_check" CHECK (((battle_resurrections >= 0) AND (battle_resurrections <= 50)));
alter table public."dungeon_runs" add constraint "dungeon_runs_completion_time_ms_check" CHECK ((completion_time_ms > 0));
alter table public."dungeon_runs" add constraint "dungeon_runs_deaths_check" CHECK (((deaths >= 0) AND (deaths <= 100)));
alter table public."dungeon_runs" add constraint "dungeon_runs_difficulty_check" CHECK ((difficulty = ANY (ARRAY['normal'::text, 'heroic'::text, 'cellbound'::text])));
alter table public."dungeon_runs" add constraint "dungeon_runs_dungeon_version_check" CHECK ((dungeon_version >= 1));
alter table public."dungeon_runs" add constraint "dungeon_runs_mechanics_failed_check" CHECK (((mechanics_failed >= 0) AND (mechanics_failed <= 500)));
alter table public."dungeon_runs" add constraint "dungeon_runs_missed_interrupts_check" CHECK (((missed_interrupts >= 0) AND (missed_interrupts <= 500)));
alter table public."dungeon_runs" add constraint "dungeon_runs_mistakes_check" CHECK (((mistakes >= 0) AND (mistakes <= 500)));
alter table public."dungeon_runs" add constraint "dungeon_runs_pkey" PRIMARY KEY (id);
alter table public."dungeon_runs" add constraint "dungeon_runs_score_check" CHECK ((score >= 0));
alter table public."dungeon_runs" add constraint "dungeon_runs_threat_losses_check" CHECK (((threat_losses >= 0) AND (threat_losses <= 500)));
alter table public."dungeon_runs" add constraint "dungeon_runs_tier_check" CHECK (((tier >= 0) AND (tier <= 20)));
alter table public."dungeon_weekly_progress" add constraint "dungeon_weekly_progress_completed_runs_check" CHECK ((completed_runs >= 0));
alter table public."dungeon_weekly_progress" add constraint "dungeon_weekly_progress_highest_tier_check" CHECK (((highest_tier >= 0) AND (highest_tier <= 20)));
alter table public."dungeon_weekly_progress" add constraint "dungeon_weekly_progress_pkey" PRIMARY KEY (user_id, week_start);
alter table public."dungeon_weekly_progress" add constraint "dungeon_weekly_progress_progress_points_check" CHECK ((progress_points >= 0));
alter table public."endgame_seasons" add constraint "endgame_seasons_pkey" PRIMARY KEY (id);
alter table public."dungeon_affix_rotation" add constraint "dungeon_affix_rotation_pkey" PRIMARY KEY (week_start);
alter table public."endgame_achievements" add constraint "endgame_achievements_pkey" PRIMARY KEY (user_id, achievement_id, dungeon_id);
alter table public."market_watchlist" add constraint "market_watchlist_pkey" PRIMARY KEY (user_id, category, item_key);
alter table public."market_watchlist" add constraint "market_watchlist_target_price_check" CHECK (((target_price IS NULL) OR (target_price > 0)));
alter table public."market_saved_searches" add constraint "market_saved_searches_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 50)));
alter table public."market_saved_searches" add constraint "market_saved_searches_pkey" PRIMARY KEY (id);
alter table public."trading_post_listings" add constraint "trading_post_listings_category_check" CHECK ((category = ANY (ARRAY['gear'::text, 'material'::text, 'recipe'::text, 'consumable'::text])));
alter table public."trading_post_listings" add constraint "trading_post_listings_pkey" PRIMARY KEY (id);
alter table public."trading_post_listings" add constraint "trading_post_listings_quantity_check" CHECK ((((status = 'active'::text) AND (quantity > 0)) OR ((status = ANY (ARRAY['sold'::text, 'cancelled'::text])) AND (quantity >= 0))));
alter table public."trading_post_listings" add constraint "trading_post_listings_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'sold'::text, 'cancelled'::text])));
alter table public."trading_post_listings" add constraint "trading_post_listings_unit_price_check" CHECK ((unit_price > 0));
alter table public."market_commodity_orders" add constraint "market_commodity_orders_category_check" CHECK ((category = ANY (ARRAY['material'::text, 'consumable'::text, 'recipe'::text])));
alter table public."market_commodity_orders" add constraint "market_commodity_orders_pkey" PRIMARY KEY (id);
alter table public."market_commodity_orders" add constraint "market_commodity_orders_quantity_initial_check" CHECK ((quantity_initial > 0));
alter table public."market_commodity_orders" add constraint "market_commodity_orders_quantity_remaining_check" CHECK ((quantity_remaining >= 0));
alter table public."market_commodity_orders" add constraint "market_commodity_orders_reserved_gold_check" CHECK ((reserved_gold >= 0));
alter table public."market_commodity_orders" add constraint "market_commodity_orders_side_check" CHECK ((side = ANY (ARRAY['buy'::text, 'sell'::text])));
alter table public."market_commodity_orders" add constraint "market_commodity_orders_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'filled'::text, 'cancelled'::text, 'expired'::text])));
alter table public."market_commodity_orders" add constraint "market_commodity_orders_unit_price_check" CHECK ((unit_price > 0));
alter table public."market_transactions" add constraint "market_transactions_gross_gold_check" CHECK ((gross_gold >= 0));
alter table public."market_transactions" add constraint "market_transactions_net_gold_check" CHECK ((net_gold >= 0));
alter table public."market_transactions" add constraint "market_transactions_pkey" PRIMARY KEY (id);
alter table public."market_transactions" add constraint "market_transactions_quantity_check" CHECK ((quantity > 0));
alter table public."market_transactions" add constraint "market_transactions_source_check" CHECK ((source = ANY (ARRAY['gear_listing'::text, 'commodity_order'::text])));
alter table public."market_transactions" add constraint "market_transactions_tax_gold_check" CHECK ((tax_gold >= 0));
alter table public."market_transactions" add constraint "market_transactions_unit_price_check" CHECK ((unit_price > 0));
alter table public."raid_sessions" add constraint "raid_sessions_pkey" PRIMARY KEY (id);
alter table public."raid_sessions" add constraint "raid_sessions_raid_id_check" CHECK ((raid_id = 'manor'::text));
alter table public."raid_sessions" add constraint "raid_sessions_stage_check" CHECK ((stage = ANY (ARRAY['butler'::text, 'maids'::text, 'engineer'::text, 'bedroom'::text, 'housebound'::text, 'victory'::text])));
alter table public."raid_sessions" add constraint "raid_sessions_state_check" CHECK ((jsonb_typeof(state) = 'object'::text));
alter table public."raid_sessions" add constraint "raid_sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'failed'::text, 'abandoned'::text])));
alter table public."raid_lockouts" add constraint "raid_lockouts_pkey" PRIMARY KEY (user_id, raid_id);
alter table public."raid_lockouts" add constraint "raid_lockouts_raid_id_check" CHECK ((raid_id = 'manor'::text));
alter table public."raid_lockouts" add constraint "raid_lockouts_runs_used_check" CHECK (((runs_used >= 0) AND (runs_used <= 3)));
alter table public."guild_accounts" add constraint "guild_accounts_game_state_object" CHECK ((jsonb_typeof(game_state) = 'object'::text));
alter table public."guild_accounts" add constraint "guild_accounts_guild_name_length_check" CHECK (((guild_name IS NULL) OR (((char_length(guild_name) >= 3) AND (char_length(guild_name) <= 24)) AND (guild_name = btrim(guild_name)))));
alter table public."guild_accounts" add constraint "guild_accounts_pkey" PRIMARY KEY (user_id);
alter table public."cellbound_world_presence" add constraint "cellbound_world_presence_pkey" PRIMARY KEY (user_id);
alter table public."cellbound_world_presence" add constraint "cellbound_world_presence_zone_check" CHECK ((zone = ANY (ARRAY['town'::text, 'guild'::text, 'inn'::text, 'bank'::text, 'craft'::text, 'quests'::text, 'dungeons'::text, 'activities'::text, 'raids'::text, 'market'::text, 'social'::text, 'arena'::text])));
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_blueprint_check" CHECK (((jsonb_typeof(blueprint) = 'object'::text) AND (pg_column_size(blueprint) <= 65536)));
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_draft_blueprint_check" CHECK (((jsonb_typeof(draft_blueprint) = 'object'::text) AND (pg_column_size(draft_blueprint) <= 65536)));
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_kind_check" CHECK ((kind = ANY (ARRAY['room'::text, 'fight'::text, 'comic'::text, 'minigame'::text, 'item'::text])));
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_pkey" PRIMARY KEY (id);
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_slug_check" CHECK ((((length(slug) >= 3) AND (length(slug) <= 100)) AND (slug ~ '^[a-z0-9-]+$'::text)));
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_slug_key" UNIQUE (slug);
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])));
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_title_check" CHECK (((length(title) >= 1) AND (length(title) <= 120)));
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_version_check" CHECK (((version >= 1) AND (version <= 1000000)));
alter table public."beta_reports" add constraint "beta_reports_admin_note_check" CHECK ((char_length(admin_note) <= 2000));
alter table public."beta_reports" add constraint "beta_reports_build_id_check" CHECK ((char_length(build_id) <= 80));
alter table public."beta_reports" add constraint "beta_reports_build_number_check" CHECK ((build_number >= 0));
alter table public."beta_reports" add constraint "beta_reports_category_check" CHECK ((category = ANY (ARRAY['bug'::text, 'feature'::text, 'ui'::text, 'balance'::text, 'account'::text, 'other'::text])));
alter table public."beta_reports" add constraint "beta_reports_context_check" CHECK ((jsonb_typeof(context) = 'object'::text));
alter table public."beta_reports" add constraint "beta_reports_details_check" CHECK ((char_length(details) <= 4000));
alter table public."beta_reports" add constraint "beta_reports_page_view_check" CHECK ((char_length(page_view) <= 80));
alter table public."beta_reports" add constraint "beta_reports_pkey" PRIMARY KEY (id);
alter table public."beta_reports" add constraint "beta_reports_severity_check" CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'blocker'::text])));
alter table public."beta_reports" add constraint "beta_reports_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'triaged'::text, 'in_progress'::text, 'fixed'::text, 'closed'::text])));
alter table public."beta_reports" add constraint "beta_reports_summary_check" CHECK (((char_length(btrim(summary)) >= 4) AND (char_length(btrim(summary)) <= 120)));
alter table public."cellbound_profession_highscores" add constraint "cellbound_profession_highscores_level_check" CHECK (((level >= 1) AND (level <= 100)));
alter table public."cellbound_profession_highscores" add constraint "cellbound_profession_highscores_pkey" PRIMARY KEY (score_key);
alter table public."cellbound_profession_highscores" add constraint "cellbound_profession_highscores_profession_check" CHECK ((profession = ANY (ARRAY['Alchemy'::text, 'Enchanting'::text, 'Blacksmithing'::text, 'Leatherworking'::text, 'Tailoring'::text, 'Jewelcrafting'::text, 'Engineering'::text, 'Cooking'::text, 'Reliccrafting'::text, 'Scribing'::text])));
alter table public."cellbound_profession_highscores" add constraint "cellbound_profession_highscores_xp_check" CHECK ((xp >= 0));
alter table public."analytics_events" add constraint "analytics_events_build_id_check" CHECK ((char_length(build_id) <= 80));
alter table public."analytics_events" add constraint "analytics_events_build_number_check" CHECK ((build_number >= 0));
alter table public."analytics_events" add constraint "analytics_events_channel_check" CHECK ((channel = ANY (ARRAY['staging'::text, 'production'::text, 'local'::text, 'unknown'::text])));
alter table public."analytics_events" add constraint "analytics_events_event_key_check" CHECK (((event_key IS NULL) OR (char_length(event_key) <= 160)));
alter table public."analytics_events" add constraint "analytics_events_event_name_check" CHECK ((event_name ~ '^[a-z0-9_]{3,64}$'::text));
alter table public."analytics_events" add constraint "analytics_events_page_view_check" CHECK ((char_length(page_view) <= 80));
alter table public."analytics_events" add constraint "analytics_events_pkey" PRIMARY KEY (id);
alter table public."analytics_events" add constraint "analytics_events_properties_check" CHECK ((jsonb_typeof(properties) = 'object'::text));
alter table public."analytics_events" add constraint "analytics_events_session_id_check" CHECK ((char_length(session_id) <= 80));
alter table public."profiles" add constraint "profiles_pkey" PRIMARY KEY (user_id);
alter table public."characters" add constraint "characters_combat_style_check" CHECK ((combat_style = ANY (ARRAY['melee'::text, 'ranged'::text, 'magic'::text])));
alter table public."characters" add constraint "characters_current_hp_check" CHECK ((current_hp >= 0));
alter table public."characters" add constraint "characters_level_check" CHECK ((level >= 1));
alter table public."characters" add constraint "characters_max_hp_check" CHECK ((max_hp > 0));
alter table public."characters" add constraint "characters_pkey" PRIMARY KEY (id);
alter table public."characters" add constraint "characters_xp_check" CHECK ((xp >= 0));
alter table public."chat_messages" add constraint "chat_messages_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 300)));
alter table public."chat_messages" add constraint "chat_messages_channel_check" CHECK ((channel = ANY (ARRAY['world'::text, 'trade'::text, 'party'::text])));
alter table public."chat_messages" add constraint "chat_messages_pkey" PRIMARY KEY (id);
alter table public."chat_messages" add constraint "chat_messages_sender_badge_check" CHECK ((sender_badge = ANY (ARRAY['player'::text, 'mod'::text, 'player_mod'::text, 'owner'::text])));
alter table public."party_finder_listings" add constraint "party_finder_listings_content_type_check" CHECK ((content_type = ANY (ARRAY['dungeon'::text, 'world_boss'::text, 'raid'::text])));
alter table public."party_finder_listings" add constraint "party_finder_listings_pkey" PRIMARY KEY (id);
alter table public."party_finder_listings" add constraint "party_finder_listings_player_cap_check" CHECK (((player_cap >= 2) AND (player_cap <= 8)));
alter table public."party_finder_listings" add constraint "party_finder_listings_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'full'::text, 'closed'::text])));
alter table public."party_finder_members" add constraint "party_finder_members_party_snapshot_check" CHECK (((jsonb_typeof(party_snapshot) = 'array'::text) AND (jsonb_array_length(party_snapshot) <= 5)));
alter table public."party_finder_members" add constraint "party_finder_members_pkey" PRIMARY KEY (listing_id, user_id);
alter table public."cellbound_release_state" add constraint "cellbound_release_state_pkey" PRIMARY KEY (singleton);
alter table public."cellbound_release_state" add constraint "cellbound_release_state_singleton_check" CHECK (singleton);
alter table public."world_bosses" add constraint "world_bosses_current_hp_check" CHECK ((current_hp >= 0));
alter table public."world_bosses" add constraint "world_bosses_max_hp_check" CHECK ((max_hp > 0));
alter table public."world_bosses" add constraint "world_bosses_pkey" PRIMARY KEY (id);
alter table public."world_bosses" add constraint "world_bosses_player_cap_check" CHECK (((player_cap >= 2) AND (player_cap <= 12)));
alter table public."world_bosses" add constraint "world_bosses_status_check" CHECK ((status = ANY (ARRAY['dormant'::text, 'active'::text, 'in_combat'::text])));
alter table public."world_bosses" add constraint "world_bosses_tier_check" CHECK (((tier >= 1) AND (tier <= 3)));
alter table public."dungeon_progress" add constraint "dungeon_progress_best_score_check" CHECK ((best_score >= 0));
alter table public."dungeon_progress" add constraint "dungeon_progress_cellbound_clears_check" CHECK ((cellbound_clears >= 0));
alter table public."dungeon_progress" add constraint "dungeon_progress_heroic_clears_check" CHECK ((heroic_clears >= 0));
alter table public."dungeon_progress" add constraint "dungeon_progress_highest_tier_check" CHECK (((highest_tier >= 0) AND (highest_tier <= 20)));
alter table public."dungeon_progress" add constraint "dungeon_progress_normal_clears_check" CHECK ((normal_clears >= 0));
alter table public."dungeon_progress" add constraint "dungeon_progress_pkey" PRIMARY KEY (user_id, dungeon_id);
alter table public."dungeon_integrity_events" add constraint "dungeon_integrity_events_pkey" PRIMARY KEY (id);
alter table public."cellbound_moderators" add constraint "cellbound_moderators_pkey" PRIMARY KEY (user_id);
alter table public."cellbound_moderators" add constraint "cellbound_moderators_role_check" CHECK ((role = ANY (ARRAY['mod'::text, 'player_mod'::text])));
alter table public."cellbound_room_layouts" add constraint "cellbound_room_layouts_pkey" PRIMARY KEY (content_id, room_id);
alter table public."raid_reward_claims" add constraint "raid_reward_claims_pkey" PRIMARY KEY (session_id, user_id);
alter table public."raid_reward_claims" add constraint "raid_reward_claims_reward_payload_check" CHECK ((jsonb_typeof(reward_payload) = 'array'::text));
alter table public."cellbound_pvp_match_rosters" add constraint "cellbound_pvp_match_rosters_pkey" PRIMARY KEY (match_id, user_id);
alter table public."cellbound_pvp_match_rosters" add constraint "cellbound_pvp_match_rosters_sealed_roster_check" CHECK (((jsonb_typeof(sealed_roster) = 'array'::text) AND (pg_column_size(sealed_roster) < 32768)));
alter table public."cellbound_pvp_commands" add constraint "cellbound_pvp_commands_category_check" CHECK ((category = ANY (ARRAY['target'::text, 'position'::text, 'objective'::text])));
alter table public."cellbound_pvp_commands" add constraint "cellbound_pvp_commands_pkey" PRIMARY KEY (match_id, user_id, sequence);
alter table public."cellbound_pvp_commands" add constraint "cellbound_pvp_commands_sequence_check" CHECK ((sequence > 0));
alter table public."cellbound_pvp_commands" add constraint "cellbound_pvp_commands_value_check" CHECK (((length(value) >= 1) AND (length(value) <= 64)));
alter table public."cellbound_pvp_match_participants" add constraint "cellbound_pvp_match_participants_last_command_sequence_check" CHECK ((last_command_sequence >= 0));
alter table public."cellbound_pvp_match_participants" add constraint "cellbound_pvp_match_participants_match_id_team_key" UNIQUE (match_id, team);
alter table public."cellbound_pvp_match_participants" add constraint "cellbound_pvp_match_participants_pkey" PRIMARY KEY (match_id, user_id);
alter table public."cellbound_pvp_match_participants" add constraint "cellbound_pvp_match_participants_team_check" CHECK ((team = ANY (ARRAY['blue'::text, 'red'::text])));
alter table public."cellbound_pvp_match_snapshots" add constraint "cellbound_pvp_match_snapshots_pkey" PRIMARY KEY (match_id, revision);
alter table public."cellbound_pvp_match_snapshots" add constraint "cellbound_pvp_match_snapshots_revision_check" CHECK ((revision > 0));
alter table public."cellbound_pvp_match_snapshots" add constraint "cellbound_pvp_match_snapshots_state_check" CHECK (((jsonb_typeof(state) = 'object'::text) AND (pg_column_size(state) < 200000)));
alter table public."cellbound_pvp_match_events" add constraint "cellbound_pvp_match_events_kind_check" CHECK (((length(kind) >= 1) AND (length(kind) <= 80)));
alter table public."cellbound_pvp_match_events" add constraint "cellbound_pvp_match_events_payload_check" CHECK (((jsonb_typeof(payload) = 'object'::text) AND (pg_column_size(payload) < 32768)));
alter table public."cellbound_pvp_match_events" add constraint "cellbound_pvp_match_events_pkey" PRIMARY KEY (match_id, sequence);
alter table public."cellbound_pvp_match_events" add constraint "cellbound_pvp_match_events_sequence_check" CHECK ((sequence > 0));
alter table public."cellbound_pvp_matches" add constraint "cellbound_pvp_match_map_slug" CHECK (((map_id IS NULL) OR (map_id ~ '^[a-z0-9-]{3,64}$'::text)));
alter table public."cellbound_pvp_matches" add constraint "cellbound_pvp_matches_check" CHECK ((((mode = 'arena'::text) AND (squad_size = ANY (ARRAY[2, 3, 5]))) OR ((mode = ANY (ARRAY['capture-the-flag'::text, 'king-of-the-hill'::text])) AND (squad_size = 5))));
alter table public."cellbound_pvp_matches" add constraint "cellbound_pvp_matches_check1" CHECK (((completed_at IS NULL) OR (status = ANY (ARRAY['completed'::text, 'cancelled'::text, 'abandoned'::text]))));
alter table public."cellbound_pvp_matches" add constraint "cellbound_pvp_matches_map_snapshot_check" CHECK (((map_snapshot IS NULL) OR ((jsonb_typeof(map_snapshot) = 'object'::text) AND (pg_column_size(map_snapshot) < 32768))));
alter table public."cellbound_pvp_matches" add constraint "cellbound_pvp_matches_mode_check" CHECK ((mode = ANY (ARRAY['arena'::text, 'capture-the-flag'::text, 'king-of-the-hill'::text])));
alter table public."cellbound_pvp_matches" add constraint "cellbound_pvp_matches_pkey" PRIMARY KEY (id);
alter table public."cellbound_pvp_matches" add constraint "cellbound_pvp_matches_revision_check" CHECK ((revision > 0));
alter table public."cellbound_pvp_matches" add constraint "cellbound_pvp_matches_status_check" CHECK ((status = ANY (ARRAY['forming'::text, 'ready'::text, 'active'::text, 'completed'::text, 'cancelled'::text, 'abandoned'::text])));
alter table public."cellbound_pvp_matches" add constraint "cellbound_pvp_matches_winning_team_check" CHECK ((winning_team = ANY (ARRAY['blue'::text, 'red'::text, 'draw'::text])));
alter table public."cellbound_pvp_queue_entries" add constraint "cellbound_pvp_queue_entries_check" CHECK ((((mode = 'arena'::text) AND (squad_size = ANY (ARRAY[2, 3, 5]))) OR ((mode = ANY (ARRAY['capture-the-flag'::text, 'king-of-the-hill'::text])) AND (squad_size = 5))));
alter table public."cellbound_pvp_queue_entries" add constraint "cellbound_pvp_queue_entries_mode_check" CHECK ((mode = ANY (ARRAY['arena'::text, 'capture-the-flag'::text, 'king-of-the-hill'::text])));
alter table public."cellbound_pvp_queue_entries" add constraint "cellbound_pvp_queue_entries_pkey" PRIMARY KEY (id);
alter table public."cellbound_pvp_queue_entries" add constraint "cellbound_pvp_queue_entries_status_check" CHECK ((status = ANY (ARRAY['waiting'::text, 'matched'::text, 'cancelled'::text, 'expired'::text])));
alter table public."cellbound_pvp_queue_entries" add constraint "cellbound_pvp_queue_lifetime" CHECK (((expires_at > joined_at) AND (expires_at <= (joined_at + '00:30:00'::interval))));
alter table public."cellbound_room_art" add constraint "cellbound_room_art_content_id_check" CHECK ((((length(content_id) >= 1) AND (length(content_id) <= 90)) AND (content_id ~ '^[a-z0-9-]+$'::text)));
alter table public."cellbound_room_art" add constraint "cellbound_room_art_object_path_check" CHECK (((length(object_path) >= 1) AND (length(object_path) <= 255)));
alter table public."cellbound_room_art" add constraint "cellbound_room_art_pkey" PRIMARY KEY (content_id, room_id);
alter table public."cellbound_room_art" add constraint "cellbound_room_art_room_id_check" CHECK ((((length(room_id) >= 1) AND (length(room_id) <= 90)) AND (room_id ~ '^[a-z0-9-]+$'::text)));
alter table public."cellbound_comic_text" add constraint "cellbound_comic_text_panels_check" CHECK (((jsonb_typeof(panels) = 'array'::text) AND ((jsonb_array_length(panels) >= 1) AND (jsonb_array_length(panels) <= 50)) AND (octet_length((panels)::text) < 65536)));
alter table public."cellbound_comic_text" add constraint "cellbound_comic_text_pkey" PRIMARY KEY (scene_id);
alter table public."cellbound_comic_text" add constraint "cellbound_comic_text_scene_id_check" CHECK ((scene_id ~ '^[a-z0-9-]{1,180}$'::text));
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_blueprint_check" CHECK (((jsonb_typeof(blueprint) = 'object'::text) AND (pg_column_size(blueprint) <= 131072)));
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_content_type_check" CHECK ((content_type = ANY (ARRAY['quest'::text, 'dungeon'::text, 'raid'::text])));
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_draft_blueprint_check" CHECK (((jsonb_typeof(draft_blueprint) = 'object'::text) AND (pg_column_size(draft_blueprint) <= 131072)));
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_pkey" PRIMARY KEY (id);
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_slug_check" CHECK ((((length(slug) >= 3) AND (length(slug) <= 80)) AND (slug ~ '^[a-z0-9-]+$'::text)));
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_slug_key" UNIQUE (slug);
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])));
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_title_check" CHECK (((length(title) >= 1) AND (length(title) <= 120)));
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_version_check" CHECK (((version >= 1) AND (version <= 1000000)));
alter table public."comic_scene_panel_art" add constraint "comic_scene_panel_art_object_path_check" CHECK (((length(object_path) >= 1) AND (length(object_path) <= 255)));
alter table public."comic_scene_panel_art" add constraint "comic_scene_panel_art_panel_index_check" CHECK (((panel_index >= 0) AND (panel_index <= 50)));
alter table public."comic_scene_panel_art" add constraint "comic_scene_panel_art_pkey" PRIMARY KEY (scene_id, panel_index);
alter table public."comic_scene_panel_art" add constraint "comic_scene_panel_art_scene_id_check" CHECK ((((length(scene_id) >= 1) AND (length(scene_id) <= 180)) AND (scene_id ~ '^[a-z0-9-]+$'::text)));
alter table public."cellbound_pvp_maps" add constraint "cellbound_pvp_maps_art_path_check" CHECK (((art_path IS NULL) OR ((length(art_path) >= 5) AND (length(art_path) <= 255))));
alter table public."cellbound_pvp_maps" add constraint "cellbound_pvp_maps_id_check" CHECK ((id ~ '^[a-z0-9-]{3,64}$'::text));
alter table public."cellbound_pvp_maps" add constraint "cellbound_pvp_maps_layout_check" CHECK (((jsonb_typeof(layout) = 'object'::text) AND (pg_column_size(layout) < 32768)));
alter table public."cellbound_pvp_maps" add constraint "cellbound_pvp_maps_mode_check" CHECK ((mode = ANY (ARRAY['arena'::text, 'capture-the-flag'::text, 'king-of-the-hill'::text])));
alter table public."cellbound_pvp_maps" add constraint "cellbound_pvp_maps_pkey" PRIMARY KEY (id);
alter table public."cellbound_pvp_maps" add constraint "cellbound_pvp_maps_title_check" CHECK (((length(title) >= 2) AND (length(title) <= 100)));
alter table public."cellbound_pvp_maps" add constraint "cellbound_pvp_maps_version_check" CHECK (((version >= 1) AND (version <= 99999)));
alter table public."cellbound_pvp_map_drafts" add constraint "cellbound_pvp_map_drafts_art_path_check" CHECK (((art_path IS NULL) OR ((length(art_path) >= 5) AND (length(art_path) <= 255))));
alter table public."cellbound_pvp_map_drafts" add constraint "cellbound_pvp_map_drafts_id_check" CHECK ((id ~ '^[a-z0-9-]{3,64}$'::text));
alter table public."cellbound_pvp_map_drafts" add constraint "cellbound_pvp_map_drafts_layout_check" CHECK (((jsonb_typeof(layout) = 'object'::text) AND (pg_column_size(layout) < 32768)));
alter table public."cellbound_pvp_map_drafts" add constraint "cellbound_pvp_map_drafts_mode_check" CHECK ((mode = ANY (ARRAY['arena'::text, 'capture-the-flag'::text, 'king-of-the-hill'::text])));
alter table public."cellbound_pvp_map_drafts" add constraint "cellbound_pvp_map_drafts_pkey" PRIMARY KEY (id);
alter table public."cellbound_pvp_map_drafts" add constraint "cellbound_pvp_map_drafts_title_check" CHECK (((length(title) >= 2) AND (length(title) <= 100)));
alter table public."cellbound_boss_drop_tables" add constraint "cellbound_boss_drop_tables_boss_key_check" CHECK (((length(boss_key) >= 5) AND (length(boss_key) <= 120)));
alter table public."cellbound_boss_drop_tables" add constraint "cellbound_boss_drop_tables_drops_check" CHECK (((jsonb_typeof(drops) = 'array'::text) AND (jsonb_array_length(drops) <= 6)));
alter table public."cellbound_boss_drop_tables" add constraint "cellbound_boss_drop_tables_pkey" PRIMARY KEY (boss_key);
alter table public."inventory_items" add constraint "inventory_items_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;
alter table public."character_cells" add constraint "character_cells_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;
alter table public."quest_progress" add constraint "quest_progress_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;
alter table public."character_abilities" add constraint "character_abilities_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;
alter table public."trading_post_proceeds" add constraint "trading_post_proceeds_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES trading_post_listings(id) ON DELETE SET NULL;
alter table public."trading_post_proceeds" add constraint "trading_post_proceeds_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."world_boss_rewards" add constraint "world_boss_rewards_boss_id_fkey" FOREIGN KEY (boss_id) REFERENCES world_bosses(id) ON DELETE CASCADE;
alter table public."world_boss_rewards" add constraint "world_boss_rewards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."cellbound_admins" add constraint "cellbound_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."world_boss_participants" add constraint "world_boss_participants_boss_id_fkey" FOREIGN KEY (boss_id) REFERENCES world_bosses(id) ON DELETE CASCADE;
alter table public."world_boss_participants" add constraint "world_boss_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."dungeon_attempts" add constraint "dungeon_attempts_season_id_fkey" FOREIGN KEY (season_id) REFERENCES endgame_seasons(id);
alter table public."dungeon_attempts" add constraint "dungeon_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."dungeon_runs" add constraint "dungeon_runs_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES dungeon_attempts(id);
alter table public."dungeon_runs" add constraint "dungeon_runs_season_id_fkey" FOREIGN KEY (season_id) REFERENCES endgame_seasons(id);
alter table public."dungeon_runs" add constraint "dungeon_runs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."dungeon_weekly_progress" add constraint "dungeon_weekly_progress_season_id_fkey" FOREIGN KEY (season_id) REFERENCES endgame_seasons(id);
alter table public."dungeon_weekly_progress" add constraint "dungeon_weekly_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."dungeon_affix_rotation" add constraint "dungeon_affix_rotation_season_id_fkey" FOREIGN KEY (season_id) REFERENCES endgame_seasons(id);
alter table public."endgame_achievements" add constraint "endgame_achievements_season_id_fkey" FOREIGN KEY (season_id) REFERENCES endgame_seasons(id);
alter table public."endgame_achievements" add constraint "endgame_achievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."market_watchlist" add constraint "market_watchlist_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."market_saved_searches" add constraint "market_saved_searches_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."trading_post_listings" add constraint "trading_post_listings_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."market_commodity_orders" add constraint "market_commodity_orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."market_transactions" add constraint "market_transactions_buy_order_id_fkey" FOREIGN KEY (buy_order_id) REFERENCES market_commodity_orders(id) ON DELETE SET NULL;
alter table public."market_transactions" add constraint "market_transactions_buyer_id_fkey" FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."market_transactions" add constraint "market_transactions_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES trading_post_listings(id) ON DELETE SET NULL;
alter table public."market_transactions" add constraint "market_transactions_sell_order_id_fkey" FOREIGN KEY (sell_order_id) REFERENCES market_commodity_orders(id) ON DELETE SET NULL;
alter table public."market_transactions" add constraint "market_transactions_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."raid_sessions" add constraint "raid_sessions_leader_id_fkey" FOREIGN KEY (leader_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."raid_sessions" add constraint "raid_sessions_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES party_finder_listings(id) ON DELETE CASCADE;
alter table public."raid_lockouts" add constraint "raid_lockouts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."guild_accounts" add constraint "guild_accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."cellbound_world_presence" add constraint "cellbound_world_presence_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public."cellbound_design_templates" add constraint "cellbound_design_templates_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
alter table public."beta_reports" add constraint "beta_reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."analytics_events" add constraint "analytics_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."characters" add constraint "characters_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."chat_messages" add constraint "chat_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."party_finder_listings" add constraint "party_finder_listings_leader_id_fkey" FOREIGN KEY (leader_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."party_finder_members" add constraint "party_finder_members_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES party_finder_listings(id) ON DELETE CASCADE;
alter table public."party_finder_members" add constraint "party_finder_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."cellbound_release_state" add constraint "cellbound_release_state_published_by_fkey" FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."dungeon_progress" add constraint "dungeon_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."dungeon_integrity_events" add constraint "dungeon_integrity_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."cellbound_moderators" add constraint "cellbound_moderators_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."raid_reward_claims" add constraint "raid_reward_claims_session_id_fkey" FOREIGN KEY (session_id) REFERENCES raid_sessions(id) ON DELETE CASCADE;
alter table public."raid_reward_claims" add constraint "raid_reward_claims_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."cellbound_pvp_match_rosters" add constraint "cellbound_pvp_match_rosters_match_id_user_id_fkey" FOREIGN KEY (match_id, user_id) REFERENCES cellbound_pvp_match_participants(match_id, user_id) ON DELETE CASCADE;
alter table public."cellbound_pvp_commands" add constraint "cellbound_pvp_commands_match_id_user_id_fkey" FOREIGN KEY (match_id, user_id) REFERENCES cellbound_pvp_match_participants(match_id, user_id) ON DELETE CASCADE;
alter table public."cellbound_pvp_match_participants" add constraint "cellbound_pvp_match_participants_match_id_fkey" FOREIGN KEY (match_id) REFERENCES cellbound_pvp_matches(id) ON DELETE CASCADE;
alter table public."cellbound_pvp_match_participants" add constraint "cellbound_pvp_match_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."cellbound_pvp_match_snapshots" add constraint "cellbound_pvp_match_snapshots_match_id_fkey" FOREIGN KEY (match_id) REFERENCES cellbound_pvp_matches(id) ON DELETE CASCADE;
alter table public."cellbound_pvp_match_events" add constraint "cellbound_pvp_match_events_match_id_fkey" FOREIGN KEY (match_id) REFERENCES cellbound_pvp_matches(id) ON DELETE CASCADE;
alter table public."cellbound_pvp_queue_entries" add constraint "cellbound_pvp_queue_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."cellbound_room_art" add constraint "cellbound_room_art_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
alter table public."cellbound_comic_text" add constraint "cellbound_comic_text_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public."cellbound_design_blueprints" add constraint "cellbound_design_blueprints_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
alter table public."comic_scene_panel_art" add constraint "comic_scene_panel_art_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
alter table public."cellbound_pvp_maps" add constraint "cellbound_pvp_maps_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
alter table public."cellbound_pvp_map_drafts" add constraint "cellbound_pvp_map_drafts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
alter table public."cellbound_boss_drop_tables" add constraint "cellbound_boss_drop_tables_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX dungeon_affix_rotation_season_idx ON public.dungeon_affix_rotation USING btree (season_id);
CREATE INDEX dungeon_weekly_progress_season_idx ON public.dungeon_weekly_progress USING btree (season_id);
CREATE INDEX beta_reports_status_created_idx ON public.beta_reports USING btree (status, created_at DESC);
CREATE INDEX dungeon_integrity_events_user_idx ON public.dungeon_integrity_events USING btree (user_id, created_at DESC);
CREATE INDEX characters_user_id_idx ON public.characters USING btree (user_id);
CREATE INDEX cellbound_pvp_snapshots_latest ON public.cellbound_pvp_match_snapshots USING btree (match_id, revision DESC);
CREATE INDEX trading_post_proceeds_listing_idx ON public.trading_post_proceeds USING btree (listing_id);
CREATE INDEX cellbound_design_templates_public_idx ON public.cellbound_design_templates USING btree (kind, updated_at DESC) WHERE (status = 'published'::text);
CREATE INDEX dungeon_attempts_user_active_idx ON public.dungeon_attempts USING btree (user_id, status, started_at DESC);
CREATE UNIQUE INDEX analytics_events_user_event_key_uidx ON public.analytics_events USING btree (user_id, event_key) WHERE ((event_key IS NOT NULL) AND (event_key <> ''::text));
CREATE INDEX market_transactions_seller_idx ON public.market_transactions USING btree (seller_id, created_at DESC);
CREATE INDEX dungeon_runs_leaderboard_idx ON public.dungeon_runs USING btree (season_id, dungeon_id, score DESC, completion_time_ms) WHERE (valid = true);
CREATE INDEX cellbound_pvp_queue_pairing ON public.cellbound_pvp_queue_entries USING btree (mode, squad_size, joined_at, id) WHERE (status = 'waiting'::text);
CREATE INDEX market_transactions_buyer_idx ON public.market_transactions USING btree (buyer_id, created_at DESC);
CREATE INDEX raid_sessions_listing_started_idx ON public.raid_sessions USING btree (listing_id, started_at DESC);
CREATE INDEX party_finder_leader_idx ON public.party_finder_listings USING btree (leader_id, status);
CREATE INDEX cellbound_pvp_maps_mode_idx ON public.cellbound_pvp_maps USING btree (mode, published_at DESC);
CREATE UNIQUE INDEX raid_sessions_one_active_per_listing_idx ON public.raid_sessions USING btree (listing_id) WHERE (status = 'active'::text);
CREATE INDEX cellbound_profession_highscores_order ON public.cellbound_profession_highscores USING btree (profession, level DESC, xp DESC, guild_name, character_name);
CREATE INDEX market_orders_owner_idx ON public.market_commodity_orders USING btree (user_id, status, created_at DESC);
CREATE INDEX market_transactions_item_time_idx ON public.market_transactions USING btree (category, item_key, created_at DESC);
CREATE INDEX cellbound_pvp_participants_account ON public.cellbound_pvp_match_participants USING btree (user_id, match_id);
CREATE INDEX trading_post_expires_idx ON public.trading_post_listings USING btree (seller_id, status, expires_at) WHERE (status = 'active'::text);
CREATE INDEX beta_reports_user_created_idx ON public.beta_reports USING btree (user_id, created_at DESC);
CREATE INDEX market_orders_book_idx ON public.market_commodity_orders USING btree (category, item_key, side, status, unit_price, created_at);
CREATE INDEX dungeon_runs_tier_idx ON public.dungeon_runs USING btree (season_id, dungeon_id, tier, score DESC) WHERE (valid = true);
CREATE INDEX trading_post_proceeds_seller_idx ON public.trading_post_proceeds USING btree (seller_id, claimed, created_at);
CREATE INDEX analytics_events_name_channel_created_idx ON public.analytics_events USING btree (event_name, channel, created_at DESC);
CREATE INDEX dungeon_attempts_season_idx ON public.dungeon_attempts USING btree (season_id);
CREATE INDEX raid_sessions_leader_idx ON public.raid_sessions USING btree (leader_id);
CREATE INDEX raid_reward_claims_user_idx ON public.raid_reward_claims USING btree (user_id);
CREATE INDEX endgame_achievements_season_idx ON public.endgame_achievements USING btree (season_id);
CREATE INDEX cellbound_pvp_matches_open ON public.cellbound_pvp_matches USING btree (status, created_at) WHERE (status = ANY (ARRAY['forming'::text, 'ready'::text, 'active'::text]));
CREATE INDEX trading_post_active_item_price_idx ON public.trading_post_listings USING btree (category, item_key, unit_price, created_at) WHERE (status = 'active'::text);
CREATE INDEX world_boss_participant_user_idx ON public.world_boss_participants USING btree (user_id, joined_at DESC);
CREATE INDEX analytics_events_channel_created_idx ON public.analytics_events USING btree (channel, created_at DESC);
CREATE UNIQUE INDEX dungeon_runs_attempt_unique ON public.dungeon_runs USING btree (attempt_id) WHERE (attempt_id IS NOT NULL);
CREATE INDEX party_finder_status_created_idx ON public.party_finder_listings USING btree (status, created_at DESC);
CREATE INDEX market_transactions_buy_order_idx ON public.market_transactions USING btree (buy_order_id);
CREATE INDEX market_orders_expires_idx ON public.market_commodity_orders USING btree (user_id, status, expires_at) WHERE (status = 'active'::text);
CREATE INDEX market_transactions_sell_order_idx ON public.market_transactions USING btree (sell_order_id);
CREATE INDEX party_finder_members_user_idx ON public.party_finder_members USING btree (user_id, joined_at DESC);
CREATE INDEX market_saved_searches_user_idx ON public.market_saved_searches USING btree (user_id);
CREATE INDEX chat_messages_user_created_idx ON public.chat_messages USING btree (user_id, created_at DESC);
CREATE INDEX trading_post_active_gear_filter_idx ON public.trading_post_listings USING btree (item_class, slot, rarity, item_level, unit_price) WHERE ((status = 'active'::text) AND (category = 'gear'::text));
CREATE INDEX trading_post_active_idx ON public.trading_post_listings USING btree (status, category, created_at DESC);
CREATE INDEX market_transactions_listing_idx ON public.market_transactions USING btree (listing_id);
CREATE INDEX cellbound_design_blueprints_published_idx ON public.cellbound_design_blueprints USING btree (content_type, updated_at DESC) WHERE (status = 'published'::text);
CREATE INDEX dungeon_runs_party_signature_idx ON public.dungeon_runs USING btree (season_id, dungeon_id, party_signature, score DESC) WHERE (valid = true);
CREATE INDEX dungeon_runs_user_idx ON public.dungeon_runs USING btree (user_id, created_at DESC);
CREATE INDEX world_boss_rewards_user_idx ON public.world_boss_rewards USING btree (user_id, claimed, created_at DESC);
CREATE INDEX chat_messages_channel_created_idx ON public.chat_messages USING btree (channel, created_at DESC);
CREATE UNIQUE INDEX cellbound_pvp_queue_one_waiting_user ON public.cellbound_pvp_queue_entries USING btree (user_id) WHERE (status = 'waiting'::text);
CREATE INDEX trading_post_seller_idx ON public.trading_post_listings USING btree (seller_id, status, created_at DESC);
create view public."market_trade_history" with (security_invoker=true) as  SELECT id,
    category,
    item_key,
    item_name,
    rarity,
    payload,
    quantity,
    unit_price,
    gross_gold,
    tax_gold,
    net_gold,
    source,
    listing_id,
    buy_order_id,
    sell_order_id,
    created_at,
    (buyer_id = ( SELECT auth.uid() AS uid)) AS bought_by_me,
    (seller_id = ( SELECT auth.uid() AS uid)) AS sold_by_me
   FROM market_transactions;
create view public."market_gear_listings" with (security_invoker=true) as  SELECT id,
    seller_label,
    category,
    item_key,
    item_name,
    payload,
    quantity,
    unit_price,
    status,
    created_at,
    updated_at,
    rarity,
    item_level,
    item_class,
    slot,
    original_quantity,
    sold_quantity,
    expires_at,
    (seller_id = ( SELECT auth.uid() AS uid)) AS is_own
   FROM trading_post_listings
  WHERE ((status = 'active'::text) OR (seller_id = ( SELECT auth.uid() AS uid)));
create view public."market_order_book" with (security_invoker=true) as  SELECT id,
    side,
    category,
    item_key,
    item_name,
    rarity,
    payload,
    quantity_initial,
    quantity_remaining,
    unit_price,
    reserved_gold,
    status,
    created_at,
    updated_at,
    expires_at,
    (user_id = ( SELECT auth.uid() AS uid)) AS is_own
   FROM market_commodity_orders
  WHERE ((status = 'active'::text) OR (user_id = ( SELECT auth.uid() AS uid)));
create policy "profiles_select_own" on public."profiles" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "profiles_insert_own" on public."profiles" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "profiles_update_own" on public."profiles" as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "profiles_delete_own" on public."profiles" as PERMISSIVE for DELETE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "characters_select_own" on public."characters" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "characters_insert_own" on public."characters" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "characters_update_own" on public."characters" as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "characters_delete_own" on public."characters" as PERMISSIVE for DELETE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "inventory_select_own" on public."inventory_items" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = inventory_items.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "inventory_insert_own" on public."inventory_items" as PERMISSIVE for INSERT to "authenticated" with check ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = inventory_items.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "inventory_update_own" on public."inventory_items" as PERMISSIVE for UPDATE to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = inventory_items.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = inventory_items.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "inventory_delete_own" on public."inventory_items" as PERMISSIVE for DELETE to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = inventory_items.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "cells_select_own" on public."character_cells" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_cells.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "cells_insert_own" on public."character_cells" as PERMISSIVE for INSERT to "authenticated" with check ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_cells.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "cells_update_own" on public."character_cells" as PERMISSIVE for UPDATE to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_cells.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_cells.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "cells_delete_own" on public."character_cells" as PERMISSIVE for DELETE to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_cells.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "abilities_select_own" on public."character_abilities" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_abilities.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "abilities_insert_own" on public."character_abilities" as PERMISSIVE for INSERT to "authenticated" with check ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_abilities.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "abilities_update_own" on public."character_abilities" as PERMISSIVE for UPDATE to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_abilities.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_abilities.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "abilities_delete_own" on public."character_abilities" as PERMISSIVE for DELETE to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = character_abilities.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "quests_select_own" on public."quest_progress" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = quest_progress.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "quests_insert_own" on public."quest_progress" as PERMISSIVE for INSERT to "authenticated" with check ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = quest_progress.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "quests_update_own" on public."quest_progress" as PERMISSIVE for UPDATE to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = quest_progress.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = quest_progress.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "quests_delete_own" on public."quest_progress" as PERMISSIVE for DELETE to "authenticated" using ((EXISTS ( SELECT 1
   FROM characters c
  WHERE ((c.id = quest_progress.character_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));
create policy "guild_accounts_select_own" on public."guild_accounts" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "guild_accounts_insert_own" on public."guild_accounts" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "players read own proceeds" on public."trading_post_proceeds" as PERMISSIVE for SELECT to "authenticated" using ((seller_id = ( SELECT auth.uid() AS uid)));
create policy "guild_accounts_update_own" on public."guild_accounts" as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "trade listings readable" on public."trading_post_listings" as PERMISSIVE for SELECT to "authenticated" using (((status = 'active'::text) OR (seller_id = ( SELECT auth.uid() AS uid))));
create policy "authenticated read chat" on public."chat_messages" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "authenticated read party listings" on public."party_finder_listings" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "authenticated read party members" on public."party_finder_members" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "Only owner creates content templates" on public."cellbound_design_templates" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (created_by = ( SELECT auth.uid() AS uid)) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Only owner updates content templates" on public."cellbound_design_templates" as PERMISSIVE for UPDATE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner)) with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Authenticated can read endgame seasons" on public."endgame_seasons" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "Authenticated can read affix rotation" on public."dungeon_affix_rotation" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "Users read own dungeon progress" on public."dungeon_progress" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users read own dungeon runs" on public."dungeon_runs" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users read own weekly dungeon progress" on public."dungeon_weekly_progress" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users read own endgame achievements" on public."endgame_achievements" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users read own dungeon attempts" on public."dungeon_attempts" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "market orders readable" on public."market_commodity_orders" as PERMISSIVE for SELECT to "authenticated" using (((status = 'active'::text) OR (user_id = ( SELECT auth.uid() AS uid))));
create policy "market history readable" on public."market_transactions" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "watchlist own select" on public."market_watchlist" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "watchlist own insert" on public."market_watchlist" as PERMISSIVE for INSERT to "authenticated" with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "watchlist own update" on public."market_watchlist" as PERMISSIVE for UPDATE to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "watchlist own delete" on public."market_watchlist" as PERMISSIVE for DELETE to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "saved searches own select" on public."market_saved_searches" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "saved searches own insert" on public."market_saved_searches" as PERMISSIVE for INSERT to "authenticated" with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "saved searches own update" on public."market_saved_searches" as PERMISSIVE for UPDATE to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "saved searches own delete" on public."market_saved_searches" as PERMISSIVE for DELETE to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "raid members can read sessions" on public."raid_sessions" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM party_finder_members m
  WHERE ((m.listing_id = raid_sessions.listing_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))));
create policy "users can read own raid lockouts" on public."raid_lockouts" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "users can read own raid rewards" on public."raid_reward_claims" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Players can read their own beta reports" on public."beta_reports" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Players can submit their own beta reports" on public."beta_reports" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Players can append own analytics events" on public."analytics_events" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Authenticated players can read published room layouts" on public."cellbound_room_layouts" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "Read comic panel art" on public."comic_scene_panel_art" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "Owner inserts comic art" on public."comic_scene_panel_art" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Owner updates comic art" on public."comic_scene_panel_art" as PERMISSIVE for UPDATE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner)) with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Players can read published room art" on public."cellbound_room_art" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "Owner inserts room art" on public."cellbound_room_art" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Owner updates room art" on public."cellbound_room_art" as PERMISSIVE for UPDATE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner)) with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Owner restores original room art" on public."cellbound_room_art" as PERMISSIVE for DELETE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner));
create policy "Published designs visible to players and owners see drafts" on public."cellbound_design_blueprints" as PERMISSIVE for SELECT to "authenticated" using (((status = 'published'::text) OR ( SELECT cellbound_is_owner() AS cellbound_is_owner)));
create policy "Only owner creates designs" on public."cellbound_design_blueprints" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (created_by = ( SELECT auth.uid() AS uid)) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Only owner updates designs" on public."cellbound_design_blueprints" as PERMISSIVE for UPDATE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner)) with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Only owner deletes designs" on public."cellbound_design_blueprints" as PERMISSIVE for DELETE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner));
create policy "All signed-in players read configured boss drops" on public."cellbound_boss_drop_tables" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "Only Cellbound owner creates boss drop tables" on public."cellbound_boss_drop_tables" as PERMISSIVE for INSERT to "authenticated" with check (cellbound_is_owner());
create policy "Only Cellbound owner edits boss drop tables" on public."cellbound_boss_drop_tables" as PERMISSIVE for UPDATE to "authenticated" using (cellbound_is_owner()) with check (cellbound_is_owner());
create policy "Only Cellbound owner deletes boss drop tables" on public."cellbound_boss_drop_tables" as PERMISSIVE for DELETE to "authenticated" using (cellbound_is_owner());
create policy "Published content templates visible to players" on public."cellbound_design_templates" as PERMISSIVE for SELECT to "authenticated" using (((status = 'published'::text) OR ( SELECT cellbound_is_owner() AS cellbound_is_owner)));
create policy "Only owner removes content templates" on public."cellbound_design_templates" as PERMISSIVE for DELETE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner));
create policy "Players read published PvP maps" on public."cellbound_pvp_maps" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "Owner publishes PvP maps" on public."cellbound_pvp_maps" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Owner updates published PvP maps" on public."cellbound_pvp_maps" as PERMISSIVE for UPDATE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner)) with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Owner restores built-in PvP maps" on public."cellbound_pvp_maps" as PERMISSIVE for DELETE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner));
create policy "Owner reads PvP map drafts" on public."cellbound_pvp_map_drafts" as PERMISSIVE for SELECT to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner));
create policy "Owner creates PvP map drafts" on public."cellbound_pvp_map_drafts" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Owner updates PvP map drafts" on public."cellbound_pvp_map_drafts" as PERMISSIVE for UPDATE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner)) with check ((( SELECT cellbound_is_owner() AS cellbound_is_owner) AND (updated_by = ( SELECT auth.uid() AS uid))));
create policy "Owner deletes PvP map drafts" on public."cellbound_pvp_map_drafts" as PERMISSIVE for DELETE to "authenticated" using (( SELECT cellbound_is_owner() AS cellbound_is_owner));
create policy "Queue read own entries" on public."cellbound_pvp_queue_entries" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Queue insert own waiting request" on public."cellbound_pvp_queue_entries" as PERMISSIVE for INSERT to "authenticated" with check (((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'waiting'::text) AND (match_id IS NULL) AND ((joined_at >= (now() - '00:02:00'::interval)) AND (joined_at <= (now() + '00:02:00'::interval))) AND (expires_at > now()) AND (expires_at <= (now() + '00:12:00'::interval))));
create policy "Queue withdraw own waiting request" on public."cellbound_pvp_queue_entries" as PERMISSIVE for DELETE to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'waiting'::text)));
create policy "Participants see own identity" on public."cellbound_pvp_match_participants" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Participants see their matches" on public."cellbound_pvp_matches" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM cellbound_pvp_match_participants p
  WHERE ((p.match_id = cellbound_pvp_matches.id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Participants see match snapshots" on public."cellbound_pvp_match_snapshots" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM cellbound_pvp_match_participants p
  WHERE ((p.match_id = cellbound_pvp_match_snapshots.match_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Participants see public combat events" on public."cellbound_pvp_match_events" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM cellbound_pvp_match_participants p
  WHERE ((p.match_id = cellbound_pvp_match_events.match_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Published comic captions" on public."cellbound_comic_text" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "cellbound_scores_public_read" on public."cellbound_profession_highscores" as PERMISSIVE for SELECT to "anon","authenticated" using (true);
CREATE TRIGGER cellbound_admin_auto_clear_shock BEFORE INSERT OR UPDATE OF game_state ON public.guild_accounts FOR EACH ROW EXECUTE FUNCTION cellbound_admin_auto_clear_trigger();
CREATE TRIGGER cellbound_enforce_guild_name_lock BEFORE INSERT OR UPDATE ON public.guild_accounts FOR EACH ROW EXECUTE FUNCTION cellbound_enforce_guild_name_lock();
CREATE TRIGGER cellbound_protect_account_entitlements BEFORE INSERT OR UPDATE ON public.guild_accounts FOR EACH ROW EXECUTE FUNCTION cellbound_protect_account_entitlements();
revoke all on all tables in schema public from anon,authenticated;
grant INSERT on public."inventory_items" to "service_role";
grant SELECT on public."inventory_items" to "service_role";
grant UPDATE on public."inventory_items" to "service_role";
grant DELETE on public."inventory_items" to "service_role";
grant TRUNCATE on public."inventory_items" to "service_role";
grant REFERENCES on public."inventory_items" to "service_role";
grant TRIGGER on public."inventory_items" to "service_role";
grant INSERT on public."inventory_items" to "authenticated";
grant SELECT on public."inventory_items" to "authenticated";
grant UPDATE on public."inventory_items" to "authenticated";
grant DELETE on public."inventory_items" to "authenticated";
grant INSERT on public."character_cells" to "service_role";
grant SELECT on public."character_cells" to "service_role";
grant UPDATE on public."character_cells" to "service_role";
grant DELETE on public."character_cells" to "service_role";
grant TRUNCATE on public."character_cells" to "service_role";
grant REFERENCES on public."character_cells" to "service_role";
grant TRIGGER on public."character_cells" to "service_role";
grant INSERT on public."character_cells" to "authenticated";
grant SELECT on public."character_cells" to "authenticated";
grant UPDATE on public."character_cells" to "authenticated";
grant DELETE on public."character_cells" to "authenticated";
grant INSERT on public."quest_progress" to "service_role";
grant SELECT on public."quest_progress" to "service_role";
grant UPDATE on public."quest_progress" to "service_role";
grant DELETE on public."quest_progress" to "service_role";
grant TRUNCATE on public."quest_progress" to "service_role";
grant REFERENCES on public."quest_progress" to "service_role";
grant TRIGGER on public."quest_progress" to "service_role";
grant INSERT on public."quest_progress" to "authenticated";
grant SELECT on public."quest_progress" to "authenticated";
grant UPDATE on public."quest_progress" to "authenticated";
grant DELETE on public."quest_progress" to "authenticated";
grant INSERT on public."character_abilities" to "service_role";
grant SELECT on public."character_abilities" to "service_role";
grant UPDATE on public."character_abilities" to "service_role";
grant DELETE on public."character_abilities" to "service_role";
grant TRUNCATE on public."character_abilities" to "service_role";
grant REFERENCES on public."character_abilities" to "service_role";
grant TRIGGER on public."character_abilities" to "service_role";
grant INSERT on public."character_abilities" to "authenticated";
grant SELECT on public."character_abilities" to "authenticated";
grant UPDATE on public."character_abilities" to "authenticated";
grant DELETE on public."character_abilities" to "authenticated";
grant INSERT on public."trading_post_proceeds" to "authenticated";
grant SELECT on public."trading_post_proceeds" to "authenticated";
grant UPDATE on public."trading_post_proceeds" to "authenticated";
grant DELETE on public."trading_post_proceeds" to "authenticated";
grant INSERT on public."trading_post_proceeds" to "service_role";
grant SELECT on public."trading_post_proceeds" to "service_role";
grant UPDATE on public."trading_post_proceeds" to "service_role";
grant DELETE on public."trading_post_proceeds" to "service_role";
grant TRUNCATE on public."trading_post_proceeds" to "service_role";
grant REFERENCES on public."trading_post_proceeds" to "service_role";
grant TRIGGER on public."trading_post_proceeds" to "service_role";
grant INSERT on public."world_boss_rewards" to "service_role";
grant SELECT on public."world_boss_rewards" to "service_role";
grant UPDATE on public."world_boss_rewards" to "service_role";
grant DELETE on public."world_boss_rewards" to "service_role";
grant TRUNCATE on public."world_boss_rewards" to "service_role";
grant REFERENCES on public."world_boss_rewards" to "service_role";
grant TRIGGER on public."world_boss_rewards" to "service_role";
grant INSERT on public."cellbound_admins" to "service_role";
grant SELECT on public."cellbound_admins" to "service_role";
grant UPDATE on public."cellbound_admins" to "service_role";
grant DELETE on public."cellbound_admins" to "service_role";
grant TRUNCATE on public."cellbound_admins" to "service_role";
grant REFERENCES on public."cellbound_admins" to "service_role";
grant TRIGGER on public."cellbound_admins" to "service_role";
grant INSERT on public."world_boss_participants" to "service_role";
grant SELECT on public."world_boss_participants" to "service_role";
grant UPDATE on public."world_boss_participants" to "service_role";
grant DELETE on public."world_boss_participants" to "service_role";
grant TRUNCATE on public."world_boss_participants" to "service_role";
grant REFERENCES on public."world_boss_participants" to "service_role";
grant TRIGGER on public."world_boss_participants" to "service_role";
grant SELECT on public."dungeon_attempts" to "authenticated";
grant INSERT on public."dungeon_attempts" to "service_role";
grant SELECT on public."dungeon_attempts" to "service_role";
grant UPDATE on public."dungeon_attempts" to "service_role";
grant DELETE on public."dungeon_attempts" to "service_role";
grant TRUNCATE on public."dungeon_attempts" to "service_role";
grant REFERENCES on public."dungeon_attempts" to "service_role";
grant TRIGGER on public."dungeon_attempts" to "service_role";
grant SELECT on public."dungeon_runs" to "authenticated";
grant INSERT on public."dungeon_runs" to "service_role";
grant SELECT on public."dungeon_runs" to "service_role";
grant UPDATE on public."dungeon_runs" to "service_role";
grant DELETE on public."dungeon_runs" to "service_role";
grant TRUNCATE on public."dungeon_runs" to "service_role";
grant REFERENCES on public."dungeon_runs" to "service_role";
grant TRIGGER on public."dungeon_runs" to "service_role";
grant SELECT on public."dungeon_weekly_progress" to "authenticated";
grant INSERT on public."dungeon_weekly_progress" to "service_role";
grant SELECT on public."dungeon_weekly_progress" to "service_role";
grant UPDATE on public."dungeon_weekly_progress" to "service_role";
grant DELETE on public."dungeon_weekly_progress" to "service_role";
grant TRUNCATE on public."dungeon_weekly_progress" to "service_role";
grant REFERENCES on public."dungeon_weekly_progress" to "service_role";
grant TRIGGER on public."dungeon_weekly_progress" to "service_role";
grant INSERT on public."endgame_seasons" to "authenticated";
grant SELECT on public."endgame_seasons" to "authenticated";
grant UPDATE on public."endgame_seasons" to "authenticated";
grant DELETE on public."endgame_seasons" to "authenticated";
grant INSERT on public."endgame_seasons" to "service_role";
grant SELECT on public."endgame_seasons" to "service_role";
grant UPDATE on public."endgame_seasons" to "service_role";
grant DELETE on public."endgame_seasons" to "service_role";
grant TRUNCATE on public."endgame_seasons" to "service_role";
grant REFERENCES on public."endgame_seasons" to "service_role";
grant TRIGGER on public."endgame_seasons" to "service_role";
grant INSERT on public."dungeon_affix_rotation" to "authenticated";
grant SELECT on public."dungeon_affix_rotation" to "authenticated";
grant UPDATE on public."dungeon_affix_rotation" to "authenticated";
grant DELETE on public."dungeon_affix_rotation" to "authenticated";
grant INSERT on public."dungeon_affix_rotation" to "service_role";
grant SELECT on public."dungeon_affix_rotation" to "service_role";
grant UPDATE on public."dungeon_affix_rotation" to "service_role";
grant DELETE on public."dungeon_affix_rotation" to "service_role";
grant TRUNCATE on public."dungeon_affix_rotation" to "service_role";
grant REFERENCES on public."dungeon_affix_rotation" to "service_role";
grant TRIGGER on public."dungeon_affix_rotation" to "service_role";
grant SELECT on public."endgame_achievements" to "authenticated";
grant INSERT on public."endgame_achievements" to "service_role";
grant SELECT on public."endgame_achievements" to "service_role";
grant UPDATE on public."endgame_achievements" to "service_role";
grant DELETE on public."endgame_achievements" to "service_role";
grant TRUNCATE on public."endgame_achievements" to "service_role";
grant REFERENCES on public."endgame_achievements" to "service_role";
grant TRIGGER on public."endgame_achievements" to "service_role";
grant INSERT on public."market_watchlist" to "authenticated";
grant SELECT on public."market_watchlist" to "authenticated";
grant UPDATE on public."market_watchlist" to "authenticated";
grant DELETE on public."market_watchlist" to "authenticated";
grant INSERT on public."market_watchlist" to "service_role";
grant SELECT on public."market_watchlist" to "service_role";
grant UPDATE on public."market_watchlist" to "service_role";
grant DELETE on public."market_watchlist" to "service_role";
grant TRUNCATE on public."market_watchlist" to "service_role";
grant REFERENCES on public."market_watchlist" to "service_role";
grant TRIGGER on public."market_watchlist" to "service_role";
grant INSERT on public."market_saved_searches" to "authenticated";
grant SELECT on public."market_saved_searches" to "authenticated";
grant UPDATE on public."market_saved_searches" to "authenticated";
grant DELETE on public."market_saved_searches" to "authenticated";
grant INSERT on public."market_saved_searches" to "service_role";
grant SELECT on public."market_saved_searches" to "service_role";
grant UPDATE on public."market_saved_searches" to "service_role";
grant DELETE on public."market_saved_searches" to "service_role";
grant TRUNCATE on public."market_saved_searches" to "service_role";
grant REFERENCES on public."market_saved_searches" to "service_role";
grant TRIGGER on public."market_saved_searches" to "service_role";
grant INSERT on public."trading_post_listings" to "service_role";
grant SELECT on public."trading_post_listings" to "service_role";
grant UPDATE on public."trading_post_listings" to "service_role";
grant DELETE on public."trading_post_listings" to "service_role";
grant TRUNCATE on public."trading_post_listings" to "service_role";
grant REFERENCES on public."trading_post_listings" to "service_role";
grant TRIGGER on public."trading_post_listings" to "service_role";
grant INSERT on public."market_commodity_orders" to "authenticated";
grant UPDATE on public."market_commodity_orders" to "authenticated";
grant DELETE on public."market_commodity_orders" to "authenticated";
grant INSERT on public."market_commodity_orders" to "service_role";
grant SELECT on public."market_commodity_orders" to "service_role";
grant UPDATE on public."market_commodity_orders" to "service_role";
grant DELETE on public."market_commodity_orders" to "service_role";
grant TRUNCATE on public."market_commodity_orders" to "service_role";
grant REFERENCES on public."market_commodity_orders" to "service_role";
grant TRIGGER on public."market_commodity_orders" to "service_role";
grant INSERT on public."market_transactions" to "authenticated";
grant UPDATE on public."market_transactions" to "authenticated";
grant DELETE on public."market_transactions" to "authenticated";
grant INSERT on public."market_transactions" to "service_role";
grant SELECT on public."market_transactions" to "service_role";
grant UPDATE on public."market_transactions" to "service_role";
grant DELETE on public."market_transactions" to "service_role";
grant TRUNCATE on public."market_transactions" to "service_role";
grant REFERENCES on public."market_transactions" to "service_role";
grant TRIGGER on public."market_transactions" to "service_role";
grant INSERT on public."raid_sessions" to "authenticated";
grant SELECT on public."raid_sessions" to "authenticated";
grant UPDATE on public."raid_sessions" to "authenticated";
grant DELETE on public."raid_sessions" to "authenticated";
grant INSERT on public."raid_sessions" to "service_role";
grant SELECT on public."raid_sessions" to "service_role";
grant UPDATE on public."raid_sessions" to "service_role";
grant DELETE on public."raid_sessions" to "service_role";
grant TRUNCATE on public."raid_sessions" to "service_role";
grant REFERENCES on public."raid_sessions" to "service_role";
grant TRIGGER on public."raid_sessions" to "service_role";
grant INSERT on public."raid_lockouts" to "authenticated";
grant SELECT on public."raid_lockouts" to "authenticated";
grant UPDATE on public."raid_lockouts" to "authenticated";
grant DELETE on public."raid_lockouts" to "authenticated";
grant INSERT on public."raid_lockouts" to "service_role";
grant SELECT on public."raid_lockouts" to "service_role";
grant UPDATE on public."raid_lockouts" to "service_role";
grant DELETE on public."raid_lockouts" to "service_role";
grant TRUNCATE on public."raid_lockouts" to "service_role";
grant REFERENCES on public."raid_lockouts" to "service_role";
grant TRIGGER on public."raid_lockouts" to "service_role";
grant INSERT on public."market_trade_history" to "service_role";
grant SELECT on public."market_trade_history" to "service_role";
grant UPDATE on public."market_trade_history" to "service_role";
grant DELETE on public."market_trade_history" to "service_role";
grant TRUNCATE on public."market_trade_history" to "service_role";
grant REFERENCES on public."market_trade_history" to "service_role";
grant TRIGGER on public."market_trade_history" to "service_role";
grant INSERT on public."market_gear_listings" to "service_role";
grant SELECT on public."market_gear_listings" to "service_role";
grant UPDATE on public."market_gear_listings" to "service_role";
grant DELETE on public."market_gear_listings" to "service_role";
grant TRUNCATE on public."market_gear_listings" to "service_role";
grant REFERENCES on public."market_gear_listings" to "service_role";
grant TRIGGER on public."market_gear_listings" to "service_role";
grant INSERT on public."market_order_book" to "service_role";
grant SELECT on public."market_order_book" to "service_role";
grant UPDATE on public."market_order_book" to "service_role";
grant DELETE on public."market_order_book" to "service_role";
grant TRUNCATE on public."market_order_book" to "service_role";
grant REFERENCES on public."market_order_book" to "service_role";
grant TRIGGER on public."market_order_book" to "service_role";
grant SELECT on public."guild_accounts" to "authenticated";
grant INSERT on public."guild_accounts" to "service_role";
grant SELECT on public."guild_accounts" to "service_role";
grant UPDATE on public."guild_accounts" to "service_role";
grant DELETE on public."guild_accounts" to "service_role";
grant TRUNCATE on public."guild_accounts" to "service_role";
grant REFERENCES on public."guild_accounts" to "service_role";
grant TRIGGER on public."guild_accounts" to "service_role";
grant INSERT on public."cellbound_world_presence" to "service_role";
grant SELECT on public."cellbound_world_presence" to "service_role";
grant UPDATE on public."cellbound_world_presence" to "service_role";
grant DELETE on public."cellbound_world_presence" to "service_role";
grant TRUNCATE on public."cellbound_world_presence" to "service_role";
grant REFERENCES on public."cellbound_world_presence" to "service_role";
grant TRIGGER on public."cellbound_world_presence" to "service_role";
grant INSERT on public."cellbound_design_templates" to "service_role";
grant SELECT on public."cellbound_design_templates" to "service_role";
grant UPDATE on public."cellbound_design_templates" to "service_role";
grant DELETE on public."cellbound_design_templates" to "service_role";
grant TRUNCATE on public."cellbound_design_templates" to "service_role";
grant REFERENCES on public."cellbound_design_templates" to "service_role";
grant TRIGGER on public."cellbound_design_templates" to "service_role";
grant INSERT on public."beta_reports" to "service_role";
grant SELECT on public."beta_reports" to "service_role";
grant UPDATE on public."beta_reports" to "service_role";
grant DELETE on public."beta_reports" to "service_role";
grant TRUNCATE on public."beta_reports" to "service_role";
grant REFERENCES on public."beta_reports" to "service_role";
grant TRIGGER on public."beta_reports" to "service_role";
grant SELECT on public."beta_reports" to "authenticated";
grant INSERT on public."cellbound_profession_highscores" to "service_role";
grant SELECT on public."cellbound_profession_highscores" to "service_role";
grant UPDATE on public."cellbound_profession_highscores" to "service_role";
grant DELETE on public."cellbound_profession_highscores" to "service_role";
grant TRUNCATE on public."cellbound_profession_highscores" to "service_role";
grant REFERENCES on public."cellbound_profession_highscores" to "service_role";
grant TRIGGER on public."cellbound_profession_highscores" to "service_role";
grant INSERT on public."analytics_events" to "service_role";
grant SELECT on public."analytics_events" to "service_role";
grant UPDATE on public."analytics_events" to "service_role";
grant DELETE on public."analytics_events" to "service_role";
grant TRUNCATE on public."analytics_events" to "service_role";
grant REFERENCES on public."analytics_events" to "service_role";
grant TRIGGER on public."analytics_events" to "service_role";
grant INSERT on public."profiles" to "authenticated";
grant SELECT on public."profiles" to "authenticated";
grant UPDATE on public."profiles" to "authenticated";
grant DELETE on public."profiles" to "authenticated";
grant INSERT on public."profiles" to "service_role";
grant SELECT on public."profiles" to "service_role";
grant UPDATE on public."profiles" to "service_role";
grant DELETE on public."profiles" to "service_role";
grant TRUNCATE on public."profiles" to "service_role";
grant REFERENCES on public."profiles" to "service_role";
grant TRIGGER on public."profiles" to "service_role";
grant INSERT on public."characters" to "authenticated";
grant SELECT on public."characters" to "authenticated";
grant UPDATE on public."characters" to "authenticated";
grant DELETE on public."characters" to "authenticated";
grant INSERT on public."characters" to "service_role";
grant SELECT on public."characters" to "service_role";
grant UPDATE on public."characters" to "service_role";
grant DELETE on public."characters" to "service_role";
grant TRUNCATE on public."characters" to "service_role";
grant REFERENCES on public."characters" to "service_role";
grant TRIGGER on public."characters" to "service_role";
grant SELECT on public."chat_messages" to "authenticated";
grant INSERT on public."chat_messages" to "service_role";
grant SELECT on public."chat_messages" to "service_role";
grant UPDATE on public."chat_messages" to "service_role";
grant DELETE on public."chat_messages" to "service_role";
grant TRUNCATE on public."chat_messages" to "service_role";
grant REFERENCES on public."chat_messages" to "service_role";
grant TRIGGER on public."chat_messages" to "service_role";
grant SELECT on public."party_finder_listings" to "authenticated";
grant INSERT on public."party_finder_listings" to "service_role";
grant SELECT on public."party_finder_listings" to "service_role";
grant UPDATE on public."party_finder_listings" to "service_role";
grant DELETE on public."party_finder_listings" to "service_role";
grant TRUNCATE on public."party_finder_listings" to "service_role";
grant REFERENCES on public."party_finder_listings" to "service_role";
grant TRIGGER on public."party_finder_listings" to "service_role";
grant SELECT on public."party_finder_members" to "authenticated";
grant INSERT on public."party_finder_members" to "service_role";
grant SELECT on public."party_finder_members" to "service_role";
grant UPDATE on public."party_finder_members" to "service_role";
grant DELETE on public."party_finder_members" to "service_role";
grant TRUNCATE on public."party_finder_members" to "service_role";
grant REFERENCES on public."party_finder_members" to "service_role";
grant TRIGGER on public."party_finder_members" to "service_role";
grant INSERT on public."cellbound_release_state" to "service_role";
grant SELECT on public."cellbound_release_state" to "service_role";
grant UPDATE on public."cellbound_release_state" to "service_role";
grant DELETE on public."cellbound_release_state" to "service_role";
grant TRUNCATE on public."cellbound_release_state" to "service_role";
grant REFERENCES on public."cellbound_release_state" to "service_role";
grant TRIGGER on public."cellbound_release_state" to "service_role";
grant INSERT on public."world_bosses" to "service_role";
grant SELECT on public."world_bosses" to "service_role";
grant UPDATE on public."world_bosses" to "service_role";
grant DELETE on public."world_bosses" to "service_role";
grant TRUNCATE on public."world_bosses" to "service_role";
grant REFERENCES on public."world_bosses" to "service_role";
grant TRIGGER on public."world_bosses" to "service_role";
grant SELECT on public."dungeon_progress" to "authenticated";
grant INSERT on public."dungeon_progress" to "service_role";
grant SELECT on public."dungeon_progress" to "service_role";
grant UPDATE on public."dungeon_progress" to "service_role";
grant DELETE on public."dungeon_progress" to "service_role";
grant TRUNCATE on public."dungeon_progress" to "service_role";
grant REFERENCES on public."dungeon_progress" to "service_role";
grant TRIGGER on public."dungeon_progress" to "service_role";
grant INSERT on public."dungeon_integrity_events" to "service_role";
grant SELECT on public."dungeon_integrity_events" to "service_role";
grant UPDATE on public."dungeon_integrity_events" to "service_role";
grant DELETE on public."dungeon_integrity_events" to "service_role";
grant TRUNCATE on public."dungeon_integrity_events" to "service_role";
grant REFERENCES on public."dungeon_integrity_events" to "service_role";
grant TRIGGER on public."dungeon_integrity_events" to "service_role";
grant INSERT on public."cellbound_moderators" to "service_role";
grant SELECT on public."cellbound_moderators" to "service_role";
grant UPDATE on public."cellbound_moderators" to "service_role";
grant DELETE on public."cellbound_moderators" to "service_role";
grant TRUNCATE on public."cellbound_moderators" to "service_role";
grant REFERENCES on public."cellbound_moderators" to "service_role";
grant TRIGGER on public."cellbound_moderators" to "service_role";
grant INSERT on public."cellbound_room_layouts" to "service_role";
grant SELECT on public."cellbound_room_layouts" to "service_role";
grant UPDATE on public."cellbound_room_layouts" to "service_role";
grant DELETE on public."cellbound_room_layouts" to "service_role";
grant TRUNCATE on public."cellbound_room_layouts" to "service_role";
grant REFERENCES on public."cellbound_room_layouts" to "service_role";
grant TRIGGER on public."cellbound_room_layouts" to "service_role";
grant SELECT on public."cellbound_room_layouts" to "authenticated";
grant INSERT on public."raid_reward_claims" to "authenticated";
grant SELECT on public."raid_reward_claims" to "authenticated";
grant UPDATE on public."raid_reward_claims" to "authenticated";
grant DELETE on public."raid_reward_claims" to "authenticated";
grant INSERT on public."raid_reward_claims" to "service_role";
grant SELECT on public."raid_reward_claims" to "service_role";
grant UPDATE on public."raid_reward_claims" to "service_role";
grant DELETE on public."raid_reward_claims" to "service_role";
grant TRUNCATE on public."raid_reward_claims" to "service_role";
grant REFERENCES on public."raid_reward_claims" to "service_role";
grant TRIGGER on public."raid_reward_claims" to "service_role";
grant INSERT on public."cellbound_pvp_match_rosters" to "service_role";
grant SELECT on public."cellbound_pvp_match_rosters" to "service_role";
grant UPDATE on public."cellbound_pvp_match_rosters" to "service_role";
grant DELETE on public."cellbound_pvp_match_rosters" to "service_role";
grant TRUNCATE on public."cellbound_pvp_match_rosters" to "service_role";
grant REFERENCES on public."cellbound_pvp_match_rosters" to "service_role";
grant TRIGGER on public."cellbound_pvp_match_rosters" to "service_role";
grant INSERT on public."cellbound_pvp_commands" to "service_role";
grant SELECT on public."cellbound_pvp_commands" to "service_role";
grant UPDATE on public."cellbound_pvp_commands" to "service_role";
grant DELETE on public."cellbound_pvp_commands" to "service_role";
grant TRUNCATE on public."cellbound_pvp_commands" to "service_role";
grant REFERENCES on public."cellbound_pvp_commands" to "service_role";
grant TRIGGER on public."cellbound_pvp_commands" to "service_role";
grant INSERT on public."cellbound_pvp_match_participants" to "service_role";
grant SELECT on public."cellbound_pvp_match_participants" to "service_role";
grant UPDATE on public."cellbound_pvp_match_participants" to "service_role";
grant DELETE on public."cellbound_pvp_match_participants" to "service_role";
grant TRUNCATE on public."cellbound_pvp_match_participants" to "service_role";
grant REFERENCES on public."cellbound_pvp_match_participants" to "service_role";
grant TRIGGER on public."cellbound_pvp_match_participants" to "service_role";
grant SELECT on public."cellbound_pvp_match_participants" to "authenticated";
grant INSERT on public."cellbound_pvp_match_snapshots" to "service_role";
grant SELECT on public."cellbound_pvp_match_snapshots" to "service_role";
grant UPDATE on public."cellbound_pvp_match_snapshots" to "service_role";
grant DELETE on public."cellbound_pvp_match_snapshots" to "service_role";
grant TRUNCATE on public."cellbound_pvp_match_snapshots" to "service_role";
grant REFERENCES on public."cellbound_pvp_match_snapshots" to "service_role";
grant TRIGGER on public."cellbound_pvp_match_snapshots" to "service_role";
grant SELECT on public."cellbound_pvp_match_snapshots" to "authenticated";
grant INSERT on public."cellbound_pvp_match_events" to "service_role";
grant SELECT on public."cellbound_pvp_match_events" to "service_role";
grant UPDATE on public."cellbound_pvp_match_events" to "service_role";
grant DELETE on public."cellbound_pvp_match_events" to "service_role";
grant TRUNCATE on public."cellbound_pvp_match_events" to "service_role";
grant REFERENCES on public."cellbound_pvp_match_events" to "service_role";
grant TRIGGER on public."cellbound_pvp_match_events" to "service_role";
grant SELECT on public."cellbound_pvp_match_events" to "authenticated";
grant INSERT on public."cellbound_pvp_matches" to "service_role";
grant SELECT on public."cellbound_pvp_matches" to "service_role";
grant UPDATE on public."cellbound_pvp_matches" to "service_role";
grant DELETE on public."cellbound_pvp_matches" to "service_role";
grant TRUNCATE on public."cellbound_pvp_matches" to "service_role";
grant REFERENCES on public."cellbound_pvp_matches" to "service_role";
grant TRIGGER on public."cellbound_pvp_matches" to "service_role";
grant SELECT on public."cellbound_pvp_matches" to "authenticated";
grant INSERT on public."cellbound_pvp_queue_entries" to "service_role";
grant SELECT on public."cellbound_pvp_queue_entries" to "service_role";
grant UPDATE on public."cellbound_pvp_queue_entries" to "service_role";
grant DELETE on public."cellbound_pvp_queue_entries" to "service_role";
grant TRUNCATE on public."cellbound_pvp_queue_entries" to "service_role";
grant REFERENCES on public."cellbound_pvp_queue_entries" to "service_role";
grant TRIGGER on public."cellbound_pvp_queue_entries" to "service_role";
grant SELECT on public."cellbound_pvp_queue_entries" to "authenticated";
grant DELETE on public."cellbound_pvp_queue_entries" to "authenticated";
grant SELECT on public."cellbound_room_art" to "authenticated";
grant INSERT on public."cellbound_room_art" to "service_role";
grant SELECT on public."cellbound_room_art" to "service_role";
grant UPDATE on public."cellbound_room_art" to "service_role";
grant DELETE on public."cellbound_room_art" to "service_role";
grant TRUNCATE on public."cellbound_room_art" to "service_role";
grant REFERENCES on public."cellbound_room_art" to "service_role";
grant TRIGGER on public."cellbound_room_art" to "service_role";
grant INSERT on public."cellbound_comic_text" to "service_role";
grant SELECT on public."cellbound_comic_text" to "service_role";
grant UPDATE on public."cellbound_comic_text" to "service_role";
grant DELETE on public."cellbound_comic_text" to "service_role";
grant TRUNCATE on public."cellbound_comic_text" to "service_role";
grant REFERENCES on public."cellbound_comic_text" to "service_role";
grant TRIGGER on public."cellbound_comic_text" to "service_role";
grant SELECT on public."cellbound_comic_text" to "authenticated";
grant INSERT on public."cellbound_design_blueprints" to "service_role";
grant SELECT on public."cellbound_design_blueprints" to "service_role";
grant UPDATE on public."cellbound_design_blueprints" to "service_role";
grant DELETE on public."cellbound_design_blueprints" to "service_role";
grant TRUNCATE on public."cellbound_design_blueprints" to "service_role";
grant REFERENCES on public."cellbound_design_blueprints" to "service_role";
grant TRIGGER on public."cellbound_design_blueprints" to "service_role";
grant SELECT on public."comic_scene_panel_art" to "authenticated";
grant INSERT on public."comic_scene_panel_art" to "service_role";
grant SELECT on public."comic_scene_panel_art" to "service_role";
grant UPDATE on public."comic_scene_panel_art" to "service_role";
grant DELETE on public."comic_scene_panel_art" to "service_role";
grant TRUNCATE on public."comic_scene_panel_art" to "service_role";
grant REFERENCES on public."comic_scene_panel_art" to "service_role";
grant TRIGGER on public."comic_scene_panel_art" to "service_role";
grant INSERT on public."cellbound_pvp_maps" to "service_role";
grant SELECT on public."cellbound_pvp_maps" to "service_role";
grant UPDATE on public."cellbound_pvp_maps" to "service_role";
grant DELETE on public."cellbound_pvp_maps" to "service_role";
grant TRUNCATE on public."cellbound_pvp_maps" to "service_role";
grant REFERENCES on public."cellbound_pvp_maps" to "service_role";
grant TRIGGER on public."cellbound_pvp_maps" to "service_role";
grant SELECT on public."cellbound_pvp_maps" to "authenticated";
grant INSERT on public."cellbound_pvp_map_drafts" to "service_role";
grant SELECT on public."cellbound_pvp_map_drafts" to "service_role";
grant UPDATE on public."cellbound_pvp_map_drafts" to "service_role";
grant DELETE on public."cellbound_pvp_map_drafts" to "service_role";
grant TRUNCATE on public."cellbound_pvp_map_drafts" to "service_role";
grant REFERENCES on public."cellbound_pvp_map_drafts" to "service_role";
grant TRIGGER on public."cellbound_pvp_map_drafts" to "service_role";
grant SELECT on public."cellbound_pvp_map_drafts" to "authenticated";
grant SELECT on public."cellbound_boss_drop_tables" to "authenticated";
grant INSERT on public."cellbound_boss_drop_tables" to "service_role";
grant SELECT on public."cellbound_boss_drop_tables" to "service_role";
grant UPDATE on public."cellbound_boss_drop_tables" to "service_role";
grant DELETE on public."cellbound_boss_drop_tables" to "service_role";
grant TRUNCATE on public."cellbound_boss_drop_tables" to "service_role";
grant REFERENCES on public."cellbound_boss_drop_tables" to "service_role";
grant TRIGGER on public."cellbound_boss_drop_tables" to "service_role";
revoke all on function public."absorb_tutorial_troll_cell"(p_character_id uuid) from public,anon,authenticated;
grant execute on function public."absorb_tutorial_troll_cell"(p_character_id uuid) to "authenticated";
grant execute on function public."absorb_tutorial_troll_cell"(p_character_id uuid) to "service_role";
revoke all on function public."advance_manor_raid"(p_session_id uuid, p_expected_stage text, p_next_stage text, p_patch jsonb) from public,anon,authenticated;
grant execute on function public."advance_manor_raid"(p_session_id uuid, p_expected_stage text, p_next_stage text, p_patch jsonb) to "authenticated";
grant execute on function public."advance_manor_raid"(p_session_id uuid, p_expected_stage text, p_next_stage text, p_patch jsonb) to "service_role";
revoke all on function public."attack_world_boss"(p_boss_id text) from public,anon,authenticated;
grant execute on function public."attack_world_boss"(p_boss_id text) to "service_role";
revoke all on function public."begin_dungeon_attempt"(p_dungeon_id text, p_difficulty text, p_tier integer, p_dungeon_version integer, p_season_id text) from public,anon,authenticated;
grant execute on function public."begin_dungeon_attempt"(p_dungeon_id text, p_difficulty text, p_tier integer, p_dungeon_version integer, p_season_id text) to "authenticated";
grant execute on function public."begin_dungeon_attempt"(p_dungeon_id text, p_difficulty text, p_tier integer, p_dungeon_version integer, p_season_id text) to "service_role";
revoke all on function public."begin_world_boss_reborn_pulse"(p_boss_id text) from public,anon,authenticated;
grant execute on function public."begin_world_boss_reborn_pulse"(p_boss_id text) to "authenticated";
grant execute on function public."begin_world_boss_reborn_pulse"(p_boss_id text) to "service_role";
revoke all on function public."cellbound_admin_analytics_summary"(p_days integer, p_channel text) from public,anon,authenticated;
grant execute on function public."cellbound_admin_analytics_summary"(p_days integer, p_channel text) to "authenticated";
grant execute on function public."cellbound_admin_analytics_summary"(p_days integer, p_channel text) to "service_role";
revoke all on function public."cellbound_admin_auto_clear_trigger"() from public,anon,authenticated;
grant execute on function public."cellbound_admin_auto_clear_trigger"() to "service_role";
revoke all on function public."cellbound_admin_beta_reports"(p_status text, p_limit integer) from public,anon,authenticated;
grant execute on function public."cellbound_admin_beta_reports"(p_status text, p_limit integer) to "authenticated";
grant execute on function public."cellbound_admin_beta_reports"(p_status text, p_limit integer) to "service_role";
revoke all on function public."cellbound_admin_fresh_start"(p_confirmation text) from public,anon,authenticated;
grant execute on function public."cellbound_admin_fresh_start"(p_confirmation text) to "authenticated";
grant execute on function public."cellbound_admin_fresh_start"(p_confirmation text) to "service_role";
revoke all on function public."cellbound_admin_fresh_start_player"(p_user_id uuid, p_confirmation text) from public,anon,authenticated;
grant execute on function public."cellbound_admin_fresh_start_player"(p_user_id uuid, p_confirmation text) to "authenticated";
grant execute on function public."cellbound_admin_fresh_start_player"(p_user_id uuid, p_confirmation text) to "service_role";
revoke all on function public."cellbound_admin_market_summary"() from public,anon,authenticated;
grant execute on function public."cellbound_admin_market_summary"() to "authenticated";
grant execute on function public."cellbound_admin_market_summary"() to "service_role";
revoke all on function public."cellbound_admin_max_player"(p_user_id uuid) from public,anon,authenticated;
grant execute on function public."cellbound_admin_max_player"(p_user_id uuid) to "authenticated";
grant execute on function public."cellbound_admin_max_player"(p_user_id uuid) to "service_role";
revoke all on function public."cellbound_admin_player_lookup"(p_lookup text) from public,anon,authenticated;
grant execute on function public."cellbound_admin_player_lookup"(p_lookup text) to "authenticated";
grant execute on function public."cellbound_admin_player_lookup"(p_lookup text) to "service_role";
revoke all on function public."cellbound_admin_publish_release"(p_build_id text, p_build_number bigint, p_message text) from public,anon,authenticated;
grant execute on function public."cellbound_admin_publish_release"(p_build_id text, p_build_number bigint, p_message text) to "authenticated";
grant execute on function public."cellbound_admin_publish_release"(p_build_id text, p_build_number bigint, p_message text) to "service_role";
revoke all on function public."cellbound_admin_publish_release"(p_build_id text, p_message text) from public,anon,authenticated;
grant execute on function public."cellbound_admin_publish_release"(p_build_id text, p_message text) to "authenticated";
grant execute on function public."cellbound_admin_publish_release"(p_build_id text, p_message text) to "service_role";
revoke all on function public."cellbound_admin_recover_player"(p_user_id uuid, p_action text) from public,anon,authenticated;
grant execute on function public."cellbound_admin_recover_player"(p_user_id uuid, p_action text) to "authenticated";
grant execute on function public."cellbound_admin_recover_player"(p_user_id uuid, p_action text) to "service_role";
revoke all on function public."cellbound_admin_reset_my_cell_shock"() from public,anon,authenticated;
grant execute on function public."cellbound_admin_reset_my_cell_shock"() to "authenticated";
grant execute on function public."cellbound_admin_reset_my_cell_shock"() to "service_role";
revoke all on function public."cellbound_admin_set_auto_clear_cell_shock"(p_enabled boolean) from public,anon,authenticated;
grant execute on function public."cellbound_admin_set_auto_clear_cell_shock"(p_enabled boolean) to "authenticated";
grant execute on function public."cellbound_admin_set_auto_clear_cell_shock"(p_enabled boolean) to "service_role";
revoke all on function public."cellbound_admin_status"() from public,anon,authenticated;
grant execute on function public."cellbound_admin_status"() to "authenticated";
grant execute on function public."cellbound_admin_status"() to "service_role";
revoke all on function public."cellbound_admin_update_beta_report"(p_report_id uuid, p_status text, p_note text) from public,anon,authenticated;
grant execute on function public."cellbound_admin_update_beta_report"(p_report_id uuid, p_status text, p_note text) to "authenticated";
grant execute on function public."cellbound_admin_update_beta_report"(p_report_id uuid, p_status text, p_note text) to "service_role";
revoke all on function public."cellbound_booth"(p_action text, p_kind text, p_key text, p_revision bigint, p_payload jsonb) from public,anon,authenticated;
grant execute on function public."cellbound_booth"(p_action text, p_kind text, p_key text, p_revision bigint, p_payload jsonb) to "authenticated";
grant execute on function public."cellbound_booth"(p_action text, p_kind text, p_key text, p_revision bigint, p_payload jsonb) to "service_role";
revoke all on function public."cellbound_booth_can_upload"() from public,anon,authenticated;
grant execute on function public."cellbound_booth_can_upload"() to "authenticated";
grant execute on function public."cellbound_booth_can_upload"() to "service_role";
revoke all on function public."cellbound_booth_can_upload_kind"(p_kind text) from public,anon,authenticated;
grant execute on function public."cellbound_booth_can_upload_kind"(p_kind text) to "authenticated";
grant execute on function public."cellbound_booth_can_upload_kind"(p_kind text) to "service_role";
revoke all on function public."cellbound_chat_block_reason"(p_body text) from public,anon,authenticated;
grant execute on function public."cellbound_chat_block_reason"(p_body text) to "service_role";
revoke all on function public."cellbound_enforce_guild_name_lock"() from public,anon,authenticated;
grant execute on function public."cellbound_enforce_guild_name_lock"() to "service_role";
revoke all on function public."cellbound_is_owner"() from public,anon,authenticated;
grant execute on function public."cellbound_is_owner"() to "authenticated";
grant execute on function public."cellbound_is_owner"() to "service_role";
revoke all on function public."cellbound_lock_guild_name"(p_name text) from public,anon,authenticated;
grant execute on function public."cellbound_lock_guild_name"(p_name text) to "authenticated";
grant execute on function public."cellbound_lock_guild_name"(p_name text) to "service_role";
revoke all on function public."cellbound_owner_publish_room_layout"(p_content_id text, p_room_id text, p_layout jsonb) from public,anon,authenticated;
grant execute on function public."cellbound_owner_publish_room_layout"(p_content_id text, p_room_id text, p_layout jsonb) to "service_role";
revoke all on function public."cellbound_owner_unpublish_room_layout"(p_content_id text, p_room_id text) from public,anon,authenticated;
grant execute on function public."cellbound_owner_unpublish_room_layout"(p_content_id text, p_room_id text) to "service_role";
revoke all on function public."cellbound_protect_account_entitlements"() from public,anon,authenticated;
grant execute on function public."cellbound_protect_account_entitlements"() to "service_role";
revoke all on function public."cellbound_pvp_pair_waiting"(p_mode text, p_squad_size integer) from public,anon,authenticated;
grant execute on function public."cellbound_pvp_pair_waiting"(p_mode text, p_squad_size integer) to "service_role";
revoke all on function public."cellbound_record_analytics_event"(p_event_name text, p_event_key text, p_session_id text, p_channel text, p_build_id text, p_build_number bigint, p_page_view text, p_properties jsonb) from public,anon,authenticated;
grant execute on function public."cellbound_record_analytics_event"(p_event_name text, p_event_key text, p_session_id text, p_channel text, p_build_id text, p_build_number bigint, p_page_view text, p_properties jsonb) to "authenticated";
grant execute on function public."cellbound_record_analytics_event"(p_event_name text, p_event_key text, p_session_id text, p_channel text, p_build_id text, p_build_number bigint, p_page_view text, p_properties jsonb) to "service_role";
revoke all on function public."cellbound_release_status"() from public,anon,authenticated;
grant execute on function public."cellbound_release_status"() to "authenticated";
grant execute on function public."cellbound_release_status"() to "service_role";
revoke all on function public."cellbound_social_identity"() from public,anon,authenticated;
grant execute on function public."cellbound_social_identity"() to "authenticated";
grant execute on function public."cellbound_social_identity"() to "service_role";
revoke all on function public."cellbound_world_presence_heartbeat"(p_zone text) from public,anon,authenticated;
grant execute on function public."cellbound_world_presence_heartbeat"(p_zone text) to "authenticated";
grant execute on function public."cellbound_world_presence_heartbeat"(p_zone text) to "service_role";
revoke all on function public."cellbound_world_presence_leave"() from public,anon,authenticated;
grant execute on function public."cellbound_world_presence_leave"() to "authenticated";
grant execute on function public."cellbound_world_presence_leave"() to "service_role";
revoke all on function public."claim_manor_raid_rewards"(p_session_id uuid) from public,anon,authenticated;
grant execute on function public."claim_manor_raid_rewards"(p_session_id uuid) to "authenticated";
grant execute on function public."claim_manor_raid_rewards"(p_session_id uuid) to "service_role";
revoke all on function public."claim_trading_proceeds"() from public,anon,authenticated;
grant execute on function public."claim_trading_proceeds"() to "authenticated";
grant execute on function public."claim_trading_proceeds"() to "service_role";
revoke all on function public."claim_tutorial_troll_reward"(p_character_id uuid) from public,anon,authenticated;
grant execute on function public."claim_tutorial_troll_reward"(p_character_id uuid) to "authenticated";
grant execute on function public."claim_tutorial_troll_reward"(p_character_id uuid) to "service_role";
revoke all on function public."claim_weekly_dungeon_reward"() from public,anon,authenticated;
grant execute on function public."claim_weekly_dungeon_reward"() to "authenticated";
grant execute on function public."claim_weekly_dungeon_reward"() to "service_role";
revoke all on function public."claim_world_boss_reward"(p_reward_id uuid) from public,anon,authenticated;
grant execute on function public."claim_world_boss_reward"(p_reward_id uuid) to "authenticated";
grant execute on function public."claim_world_boss_reward"(p_reward_id uuid) to "service_role";
revoke all on function public."command_world_boss"(p_boss_id text, p_action text) from public,anon,authenticated;
grant execute on function public."command_world_boss"(p_boss_id text, p_action text) to "authenticated";
grant execute on function public."command_world_boss"(p_boss_id text, p_action text) to "service_role";
revoke all on function public."commit_world_boss_reborn_pulse"(p_user_id uuid, p_boss_id text, p_generation integer, p_pulse_token uuid, p_party_damage integer, p_healing integer, p_threat_breakdown jsonb, p_combat_state jsonb) from public,anon,authenticated;
grant execute on function public."commit_world_boss_reborn_pulse"(p_user_id uuid, p_boss_id text, p_generation integer, p_pulse_token uuid, p_party_damage integer, p_healing integer, p_threat_breakdown jsonb, p_combat_state jsonb) to "service_role";
revoke all on function public."complete_cellbound_tutorial"(p_character_id uuid) from public,anon,authenticated;
grant execute on function public."complete_cellbound_tutorial"(p_character_id uuid) to "authenticated";
grant execute on function public."complete_cellbound_tutorial"(p_character_id uuid) to "service_role";
revoke all on function public."create_party_finder_listing"(p_content_type text, p_target_id text, p_target_label text, p_note text, p_party_ilvl numeric, p_player_cap integer) from public,anon,authenticated;
grant execute on function public."create_party_finder_listing"(p_content_type text, p_target_id text, p_target_label text, p_note text, p_party_ilvl numeric, p_player_cap integer) to "authenticated";
grant execute on function public."create_party_finder_listing"(p_content_type text, p_target_id text, p_target_label text, p_note text, p_party_ilvl numeric, p_player_cap integer) to "service_role";
revoke all on function public."endgame_party_snapshot"(p_user uuid) from public,anon,authenticated;
grant execute on function public."endgame_party_snapshot"(p_user uuid) to "service_role";
revoke all on function public."fail_manor_raid"(p_session_id uuid, p_reason text) from public,anon,authenticated;
grant execute on function public."fail_manor_raid"(p_session_id uuid, p_reason text) to "authenticated";
grant execute on function public."fail_manor_raid"(p_session_id uuid, p_reason text) to "service_role";
revoke all on function public."get_dungeon_leaderboard"(p_dungeon_id text, p_season_id text, p_limit integer) from public,anon,authenticated;
grant execute on function public."get_dungeon_leaderboard"(p_dungeon_id text, p_season_id text, p_limit integer) to "authenticated";
grant execute on function public."get_dungeon_leaderboard"(p_dungeon_id text, p_season_id text, p_limit integer) to "service_role";
revoke all on function public."get_dungeon_leaderboard_v2"(p_dungeon_id text, p_season_id text, p_scope text, p_tier integer, p_class text, p_limit integer) from public,anon,authenticated;
grant execute on function public."get_dungeon_leaderboard_v2"(p_dungeon_id text, p_season_id text, p_scope text, p_tier integer, p_class text, p_limit integer) to "authenticated";
grant execute on function public."get_dungeon_leaderboard_v2"(p_dungeon_id text, p_season_id text, p_scope text, p_tier integer, p_class text, p_limit integer) to "service_role";
revoke all on function public."get_endgame_state"() from public,anon,authenticated;
grant execute on function public."get_endgame_state"() to "authenticated";
grant execute on function public."get_endgame_state"() to "service_role";
revoke all on function public."get_world_boss_combat_state"(p_boss_id text) from public,anon,authenticated;
grant execute on function public."get_world_boss_combat_state"(p_boss_id text) to "authenticated";
grant execute on function public."get_world_boss_combat_state"(p_boss_id text) to "service_role";
revoke all on function public."get_world_boss_detail"(p_boss_id text) from public,anon,authenticated;
grant execute on function public."get_world_boss_detail"(p_boss_id text) to "authenticated";
grant execute on function public."get_world_boss_detail"(p_boss_id text) to "service_role";
revoke all on function public."get_world_boss_rewards"() from public,anon,authenticated;
grant execute on function public."get_world_boss_rewards"() to "authenticated";
grant execute on function public."get_world_boss_rewards"() to "service_role";
revoke all on function public."get_world_bosses"() from public,anon,authenticated;
grant execute on function public."get_world_bosses"() to "authenticated";
grant execute on function public."get_world_bosses"() to "service_role";
revoke all on function public."join_party_finder_listing"(p_listing_id uuid, p_party_ilvl numeric) from public,anon,authenticated;
grant execute on function public."join_party_finder_listing"(p_listing_id uuid, p_party_ilvl numeric) to "authenticated";
grant execute on function public."join_party_finder_listing"(p_listing_id uuid, p_party_ilvl numeric) to "service_role";
revoke all on function public."join_world_boss"(p_boss_id text, p_party_ilvl numeric) from public,anon,authenticated;
grant execute on function public."join_world_boss"(p_boss_id text, p_party_ilvl numeric) to "authenticated";
grant execute on function public."join_world_boss"(p_boss_id text, p_party_ilvl numeric) to "service_role";
revoke all on function public."leave_party_finder_listing"(p_listing_id uuid) from public,anon,authenticated;
grant execute on function public."leave_party_finder_listing"(p_listing_id uuid) to "authenticated";
grant execute on function public."leave_party_finder_listing"(p_listing_id uuid) to "service_role";
revoke all on function public."leave_world_boss"(p_boss_id text) from public,anon,authenticated;
grant execute on function public."leave_world_boss"(p_boss_id text) to "authenticated";
grant execute on function public."leave_world_boss"(p_boss_id text) to "service_role";
revoke all on function public."manor_lockout_status"() from public,anon,authenticated;
grant execute on function public."manor_lockout_status"() to "authenticated";
grant execute on function public."manor_lockout_status"() to "service_role";
revoke all on function public."manor_screech_open_v2"(p_session_id uuid, p_token text, p_duration_ms integer) from public,anon,authenticated;
grant execute on function public."manor_screech_open_v2"(p_session_id uuid, p_token text, p_duration_ms integer) to "authenticated";
grant execute on function public."manor_screech_open_v2"(p_session_id uuid, p_token text, p_duration_ms integer) to "service_role";
revoke all on function public."manor_screech_result"(p_session_id uuid, p_success boolean) from public,anon,authenticated;
grant execute on function public."manor_screech_result"(p_session_id uuid, p_success boolean) to "authenticated";
grant execute on function public."manor_screech_result"(p_session_id uuid, p_success boolean) to "service_role";
revoke all on function public."manor_screech_result_v2"(p_session_id uuid, p_token text, p_result text) from public,anon,authenticated;
grant execute on function public."manor_screech_result_v2"(p_session_id uuid, p_token text, p_result text) to "authenticated";
grant execute on function public."manor_screech_result_v2"(p_session_id uuid, p_token text, p_result text) to "service_role";
revoke all on function public."manor_screech_result_v2"(p_session_id uuid, p_side integer, p_event_ms integer, p_outcome text) from public,anon,authenticated;
grant execute on function public."manor_screech_result_v2"(p_session_id uuid, p_side integer, p_event_ms integer, p_outcome text) to "authenticated";
grant execute on function public."manor_screech_result_v2"(p_session_id uuid, p_side integer, p_event_ms integer, p_outcome text) to "service_role";
revoke all on function public."manor_set_ready"(p_session_id uuid, p_ready boolean) from public,anon,authenticated;
grant execute on function public."manor_set_ready"(p_session_id uuid, p_ready boolean) to "authenticated";
grant execute on function public."manor_set_ready"(p_session_id uuid, p_ready boolean) to "service_role";
revoke all on function public."market_cancel_commodity_order"(p_order_id uuid) from public,anon,authenticated;
grant execute on function public."market_cancel_commodity_order"(p_order_id uuid) to "authenticated";
grant execute on function public."market_cancel_commodity_order"(p_order_id uuid) to "service_role";
revoke all on function public."market_cancel_listing"(p_listing_id uuid) from public,anon,authenticated;
grant execute on function public."market_cancel_listing"(p_listing_id uuid) to "authenticated";
grant execute on function public."market_cancel_listing"(p_listing_id uuid) to "service_role";
revoke all on function public."market_create_listing"(p_category text, p_item_id text, p_item_key text, p_item_name text, p_quantity integer, p_unit_price integer, p_payload jsonb, p_duration_hours integer) from public,anon,authenticated;
grant execute on function public."market_create_listing"(p_category text, p_item_id text, p_item_key text, p_item_name text, p_quantity integer, p_unit_price integer, p_payload jsonb, p_duration_hours integer) to "authenticated";
grant execute on function public."market_create_listing"(p_category text, p_item_id text, p_item_key text, p_item_name text, p_quantity integer, p_unit_price integer, p_payload jsonb, p_duration_hours integer) to "service_role";
revoke all on function public."market_get_gear_listings"(p_limit integer) from public,anon,authenticated;
grant execute on function public."market_get_gear_listings"(p_limit integer) to "authenticated";
grant execute on function public."market_get_gear_listings"(p_limit integer) to "service_role";
revoke all on function public."market_get_order_book"(p_limit integer) from public,anon,authenticated;
grant execute on function public."market_get_order_book"(p_limit integer) to "authenticated";
grant execute on function public."market_get_order_book"(p_limit integer) to "service_role";
revoke all on function public."market_get_trade_history"(p_limit integer) from public,anon,authenticated;
grant execute on function public."market_get_trade_history"(p_limit integer) to "authenticated";
grant execute on function public."market_get_trade_history"(p_limit integer) to "service_role";
revoke all on function public."market_place_commodity_order"(p_side text, p_category text, p_item_key text, p_item_name text, p_quantity integer, p_unit_price integer, p_payload jsonb, p_rarity text) from public,anon,authenticated;
grant execute on function public."market_place_commodity_order"(p_side text, p_category text, p_item_key text, p_item_name text, p_quantity integer, p_unit_price integer, p_payload jsonb, p_rarity text) to "authenticated";
grant execute on function public."market_place_commodity_order"(p_side text, p_category text, p_item_key text, p_item_name text, p_quantity integer, p_unit_price integer, p_payload jsonb, p_rarity text) to "service_role";
revoke all on function public."market_sweep_my_expired"() from public,anon,authenticated;
grant execute on function public."market_sweep_my_expired"() to "authenticated";
grant execute on function public."market_sweep_my_expired"() to "service_role";
revoke all on function public."post_chat_message"(p_channel text, p_body text) from public,anon,authenticated;
grant execute on function public."post_chat_message"(p_channel text, p_body text) to "authenticated";
grant execute on function public."post_chat_message"(p_channel text, p_body text) to "service_role";
revoke all on function public."purchase_trading_listing"(p_listing_id uuid, p_quantity integer) from public,anon,authenticated;
grant execute on function public."purchase_trading_listing"(p_listing_id uuid, p_quantity integer) to "authenticated";
grant execute on function public."purchase_trading_listing"(p_listing_id uuid, p_quantity integer) to "service_role";
revoke all on function public."record_dungeon_run"(p_dungeon_id text, p_difficulty text, p_tier integer, p_completion_time_ms integer, p_target_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_dungeon_version integer, p_season_id text) from public,anon,authenticated;
grant execute on function public."record_dungeon_run"(p_dungeon_id text, p_difficulty text, p_tier integer, p_completion_time_ms integer, p_target_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_dungeon_version integer, p_season_id text) to "service_role";
revoke all on function public."record_dungeon_run_v2"(p_dungeon_id text, p_difficulty text, p_tier integer, p_completion_time_ms integer, p_target_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_dungeon_version integer, p_season_id text, p_missed_interrupts integer, p_threat_losses integer, p_avoidable_damage numeric, p_battle_resurrections integer) from public,anon,authenticated;
grant execute on function public."record_dungeon_run_v2"(p_dungeon_id text, p_difficulty text, p_tier integer, p_completion_time_ms integer, p_target_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_dungeon_version integer, p_season_id text, p_missed_interrupts integer, p_threat_losses integer, p_avoidable_damage numeric, p_battle_resurrections integer) to "service_role";
revoke all on function public."record_dungeon_run_v3"(p_attempt_id uuid, p_completion_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_missed_interrupts integer, p_threat_losses integer, p_avoidable_damage numeric, p_battle_resurrections integer) from public,anon,authenticated;
grant execute on function public."record_dungeon_run_v3"(p_attempt_id uuid, p_completion_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_missed_interrupts integer, p_threat_losses integer, p_avoidable_damage numeric, p_battle_resurrections integer) to "authenticated";
grant execute on function public."record_dungeon_run_v3"(p_attempt_id uuid, p_completion_time_ms integer, p_deaths integer, p_mechanics_failed integer, p_mistakes integer, p_missed_interrupts integer, p_threat_losses integer, p_avoidable_damage numeric, p_battle_resurrections integer) to "service_role";
revoke all on function public."refresh_world_bosses"() from public,anon,authenticated;
grant execute on function public."refresh_world_bosses"() to "service_role";
revoke all on function public."resume_dungeon_attempt"(p_dungeon_id text) from public,anon,authenticated;
grant execute on function public."resume_dungeon_attempt"(p_dungeon_id text) to "authenticated";
grant execute on function public."resume_dungeon_attempt"(p_dungeon_id text) to "service_role";
revoke all on function public."save_dungeon_attempt_runtime"(p_attempt_id uuid, p_runtime_state jsonb) from public,anon,authenticated;
grant execute on function public."save_dungeon_attempt_runtime"(p_attempt_id uuid, p_runtime_state jsonb) to "authenticated";
grant execute on function public."save_dungeon_attempt_runtime"(p_attempt_id uuid, p_runtime_state jsonb) to "service_role";
revoke all on function public."start_manor_raid"(p_listing_id uuid) from public,anon,authenticated;
grant execute on function public."start_manor_raid"(p_listing_id uuid) to "authenticated";
grant execute on function public."start_manor_raid"(p_listing_id uuid) to "service_role";
revoke all on function public."sync_party_finder_party"(p_listing_id uuid, p_party_snapshot jsonb, p_party_ilvl numeric) from public,anon,authenticated;
grant execute on function public."sync_party_finder_party"(p_listing_id uuid, p_party_snapshot jsonb, p_party_ilvl numeric) to "authenticated";
grant execute on function public."sync_party_finder_party"(p_listing_id uuid, p_party_snapshot jsonb, p_party_ilvl numeric) to "service_role";
grant usage,select on all sequences in schema public to service_role;
commit;
