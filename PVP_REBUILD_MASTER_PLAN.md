# CELLBOUND — PVP REBUILD MASTER PLAN
**Draft for review — 9 October 2026**  
**Status:** Design plan only. No gameplay code or beta feature flag changed by this document.

## 1. Vision and non-negotiable rules

Build PvP as another ruleset of **Combat Reborn**, with **the same authoritative engine, event protocol and shared CB2D combat viewer** used by dungeons, raids, quests and bosses. PvP can have different map art, objective HUD, scoreboards, spawn rules and tactical controls, but must not fork core damage, healing, skill execution, movement, CC, visuals or character rendering.

- Real ranked queues match **actual online players**. The current generated rivals are not a valid ranked opponent.
- Player's **account commands a squad**: 2/3/5 of their characters in Arena; 5 characters per commander in Battlegrounds. 5v5 BG = one commander per side; 10v10 BG = two commanders per side; 20v20 BG = four commanders per side. The effective team sizes and UI must describe this clearly.
- The existing owner-only PvP lock stays in place until the new loop is tested.
- iPad browser/tablet is a first-class target.
- Server verifies account, participants, commands, outcomes, ratings, currency and gear purchases.

## 2. Confirmed current repository baseline

Reviewed on `main`:

- `pvp-v1.js` has an owner-only lock, War Marks / Arena Seals / Season Crests, T1/T2/T3 PvP gear, CTF/KOTH, 5/10/20 battleground sizes, 2/3/5 arena sizes, and starting Arena rating 1000.
- It currently unlocks Arena at PvP Rank 5 **and** 5 T1 purchases; replace that rule.
- `pvp-v1.js` builds locally generated opponents, selects a pseudo rival guild, runs `CellboundPvPCombat.simulate` and settles rewards into client state after replay. The ladder includes predefined rivals, not a live player leaderboard.
- `pvp-combat-v1.js` contains a separate PvP combat simulation, including objectives and arena cellstorm. `pvp-viewer-v1.js` supplies a separate PvP arena/view shell; `pvp-match-v1.js` shows a timed local 'Finding an opponent' interlude, not live matchmaking.
- `combat-standard-v1.js` / `COMBAT_STANDARD.md` require Combat Reborn as the shared authority and the shared CB2D shell. Present PvP does not satisfy that deeper single-engine objective.
- Current Supabase migration set has no dedicated PvP matchmaking/season migration.
- Existing feature logic and art are useful migration sources; replace the duplicated simulator/view implementation only after behavioural parity is verified.

## 3. PvP Command Centre

Reuse the Command Centre visual hierarchy and control pattern, but provide a PvP-specific command schema. Commands need *observable changes in shared-engine targeting/pathing/position* and an event/acknowledgment, not cosmetic UI toggles.

### Global targeting (one active order)
- **Balanced** (AI chooses threat/opportunity)
- **Attack Healer**
- **Attack Tank**
- **Attack DPS**
- **Focus Flag Carrier** (CTF-specific)
- **Protect Our Healer** (defensive counterplay)
- Optional advanced: **Focus Selected Enemy** after roster/map tap

Role orders resolve against *living, visible, reachable* enemies, with predictable fallback if a role is absent. Targeting a healer must not grant omniscience through walls/stealth or ignore line of sight.

### Formation/position (one active order)
- **Balanced**
- **Spread** (avoid clumps/AoE)
- **Group Up** (tight defence/healing)
- **Fall Back** (disengage to safer anchor)
- **Push Forward** (contest important ground)
- **Hold Position** (hold control area; cannot force a unit to stand in lethal hazards)
- **Regroup** (return toward squad commander/objective anchor)

Include visible command state, recent command feed, map location markers and a compact mobile-friendly command bar. On iPad, player can give an order within two taps.

### Mode-aware objective orders
| Mode | Orders |
|---|---|
| 2v2/3v3/5v5 Arena | Pressure Healer, Peel for Healer, Focus Low HP, Kite/Retreat, Regroup, Spread, Push (plus core target orders) |
| Capture the Flag | Take Flag, Escort Carrier, Defend Base, Recover Our Flag, Intercept Enemy Carrier, Route Left/Mid/Right |
| King of the Hill | Capture Active Hill, Hold Hill, Contest Hill, Rotate Early, Defend Approach, Group Up, Split Pressure |

For 10v10/20v20 battlegrounds, commander orders control only their own five-character squad; team-wide pings (Attack A, Defend B, Need Help) are separate signals rather than overruling other human players.

**Live command model:** The current Combat Reborn PvE pipeline pre-simulates an entire fight, so meaningful mid-fight orders require incremental deterministic server-authoritative `init → apply validated command → advance ticks → publish events/snapshot`. Refactor the shared engine to expose this API without changing PvE outcomes; both PvP and PvE must use the same rules core. Commands are acknowledged/rejected with explanation (dead, silenced order source, invalid objective, cooldown); initially rate-limit changes to e.g. one every 3 seconds, subject to playtesting.

**AI safety:** Personal command does not cancel healer triage, interrupt logic, dangerous-area movement, resource limits, LOS, CC immunity, death, or target availability.

## 4. Shared engine and shared viewer

Proposed architecture:

`Supabase Auth + authoritative match coordinator` → `Combat Reborn shared simulation core (PvP ruleset, symmetric teams, tick/command API)` → `canonical Combat Reborn event stream` → `shared CB2D viewer / CombatFX + PvP HUD overlays`.

- Use the existing dungeon shared shell; supplement with two team rosters, score/timer, flag/hill status and tactical bar.
- Reuse combat vitals, portraits, status icons, meters, character appearance, animations, movement and event playback.
- Port PvP maps, flag lifecycle, hill rotation, arena storm, respawns and victory conditions as **ruleset/objective modules**, not a second combat engine.
- Support terrain blockers, LOS, paths, spawn protection, flag carriers, capture radius, safe zones, and objective resets.
- Arena must resolve on elimination / surrender / valid disconnect-forfeit; add anti-stalemate pressure (existing Cellstorm/dampening) as shared-engine mechanics.
- All match outcomes settle on the server from the canonical match event log once, regardless of client disconnect or replay.

## 5. Battlegrounds: entry tier

Modes: **Capture the Flag** and **King of the Hill**. Match sizes: 5v5, 10v10, 20v20, meaning characters (not necessarily unique human accounts). Start with 5v5 real players; expand to 10v10 and 20v20 only when participant density and sync are proven. The game must *never imply generated bots are real humans*.

- Wins and losses earn **War Marks**; victories give substantially more.
- Objective actions and participation add capped bonuses (captures, returns, useful control presence, defence, kills/assists/healing), not easily farmable damage spam.
- **War Marks** buy **Tier 1: Frontier** PvP gear.
- Arena unlock = **20 account-level battleground wins AND average PvP gear score ≥ 90** across every selected Arena character, provisional until balance review. Gate against *equipped* score not purchase count. Display `BG Wins: x/20` and `Selected squad PvP score: x/90` with a clickable gear route.
- BG rank XP can remain as a separate mastery/progression track, but **PvP Rank 5 is not an additional Arena gate**.
- Non-ranked AI practice modes are allowed for QA/low population but must be labelled Practice and must not mint rated rewards; any unranked bot rewards require independent caps and abuse checks.

## 6. Rated Arena

Formats: **2v2, 3v3, 5v5**. Each format has its **own visible seasonal rating** and leaderboard. Initial rating for every eligible player in each format: **1000**.

**No Bronze/Silver/Gold ladders at launch.** Use the plain visible number, match history, win rate, best rating, global standing and optional cosmetic titles for milestones. This gives players a single comprehensible number and reduces redundant systems.

### Rating formula
Standard Elo style:
`expected = 1 / (1 + 10^((opponentRating - playerRating)/400))`
`change = round(32 * (actualResult - expected))` where win=1 and loss=0.

Illustrative ratings before match:
- 1000 vs 1000: win +16, loss −16.
- 1000 vs 1200: win about +24, loss about −8.
- 1000 vs 800: win about +8, loss about −24.

Floor rating at 0 (or configurable floor). Outcome affects rating; damage, time and volume of kills do not inflate Elo. Show pre-rating → delta → post-rating on the result screen. Separate persistent skill estimate/previous-season information can help early matching even when visible seasonal points reset; never misrepresent the visible value.

### Matchmaking
- One queue per rated format. Queue is maintained by a **server**, not a visual countdown.
- Initially select closest available **actual online opponent** within ±75 points; expand by +50 every 15 seconds, up to a playtested ±500 cap. These are *proposed* tuning values, not promises about queue duration.
- Find a mutually compatible candidate by both players' active brackets (prevent 'one player thinks within bounds' mismatch), plus region/latency, duplicate accounts, recent rematches, account state and cooldowns.
- Show elapsed search, current allowed rating range, cancel, and an optional switch to **unranked practice**, never silently put an AI into ranked.
- Match ready → short acceptance window → lock rosters / validate gear → intro → combat. Timeout/decline returns the other player to priority queue.
- Protect against queue abuse, disconnect/reconnect, intentionally feeding rating, repeatedly pairing same player, AFK and smurfing. Server settles surrender/forfeit consistently.

## 7. Arena progression / currency

| Source | Reward | Use |
|---|---|---|
| CTF/KOTH | **War Marks** (win > loss) | Tier 1 Frontier PvP gear |
| Rated Arena | **Arena Seals** (win > loss, both nonzero for genuine participation) | Tier 2 Arenaforged PvP gear |
| End of season leaderboard | **Season Crests** (awarded only at settlement) | Tier 3 Seasonbound PvP gear |

Keep existing names and item tier definitions initially, then balance the item stats. No separate fourth PvP currency. All rewards grant via a durable, idempotent server ledger. No rewards for practice, unfinished/invalid matches, duplicate results, abandoned queue, or dishonest replay.

**Fairness:** Limit effective PvP gear-score differentials per bracket, or normalize T1/T2/T3 effective combat power within ranked play, so prestige gear cannot make the next season unwinnable for newcomers. T3 should still look and feel special through presentation, modest advantages, cosmetics and provenance, not an overwhelming numerical gap. PvE and PvP gear/stat interaction needs a published rule.

## 8. Seasons

- Start from the current **56-day / 8-week** cadence; use a single global UTC start/end defined on the server rather than each user's first-login date.
- Each Arena format tracks rating, wins, losses, games played, best rating, and position. Require **20 completed genuine rated matches** for seasonal placement rewards (provisional).
- Seasonal leaderboard determines **Season Crests** at settlement. Suggested starting bracket: top 1% = 10, top 5% = 7, top 15% = 5, top 30% = 3, remaining players 0, subject to population tuning. Small populations require minimum eligibility counts and sensible absolute-rank fallback.
- Award the **best single eligible Arena bracket per account**, not three stacks of rewards, to avoid multi-bracket crest farming. Show reward preview all season.
- On season close, freeze leaderboard, compute standings, grant crests once transactionally, archive standings/rewards/history, then reset *visible* seasonal ratings to 1000 for all three formats.
- Preserve lifetime wins, earned/purchased gear, unlocked Arena access, previous-season records and title/cosmetics; do not silently remove earned gear/currency.
- Admin must be able to inspect dry-run settlement, audit grants, and manually investigate fraud before payout when necessary.

## 9. Crucible interface / navigation

Keep `The Crucible` but simplify to four purpose-led destinations:

1. **Battlegrounds**: CTF/KOTH tiles, 5v5 (later 10v10/20v20), party preview, rewards and queue.
2. **Arena**: 2v2/3v3/5v5 selectors, party picker, individual bracket rating, live queue and last results.
3. **PvP Armoury**: Tier 1/2/3 categories with item icon/name/tier/stats/cost, Owned/Equipped state, preview and score.
4. **Season & Rankings**: current rating by bracket, sortable real player leaderboard, personal match history, countdown and crest preview.

A compact pre-match command setup can set an opening order. During a live match the PvP Command Centre overlays the shared CB2D shell, not a new dedicated full-screen combat UI. Post-match: scoreboard, objective contributions, War Marks/Arena Seals, change in rating and Cell Shock status.

## 10. Data / operational backbone

Add Supabase tables / server-side equivalents for `pvp_seasons`, `pvp_queue_entries`, `pvp_matches`, `pvp_match_participants`, `pvp_commands`, `pvp_match_events` or compressed snapshots, `pvp_ratings` by account+format+season, `pvp_currency_ledger`, `pvp_purchases`, `pvp_season_rewards`, and antifraud flags. Design for unique settlement ids, RLS, no client-write privilege on balances/rating, and user-safe public leaderboard fields.

Live PvP requires a secure **server-authoritative tick coordinator** (worker/long-running match service or appropriate hosted equivalent) with realtime subscriptions. Supabase database/realtime alone should not be assumed to be an always-on game simulation loop without separately validating worker lifecycles, latency and concurrent match capacity.

Admin panel should show live queues, match rooms, online players, stuck matches, disconnects, average queue time, class/role win rates, map objective progress, rating movement, per-season eligibility and payout ledger; owner practice overrides must never contaminate ranked ladder or award balances.

## 11. Implementation sequence and acceptance gates

**Block 1 — Shared combat contract / architectural spike:** Confirm full PvP mechanics fit Combat Reborn; introduce symmetric-team PvP ruleset + incrementally stepped deterministic engine API; run regression tests for *unchanged dungeon/raid/quest* outcomes. *Done when PvE and PvP call the same simulation core.*

**Block 2 — Unified viewer + Command Centre:** Remove PvP-only viewer dependency via shared CB2D surface; show flag/hill/storm overlays and tactical commands. Test on iPad touch interactions, formation, role targeting, LOS and event synchronization. *Done when there is one viewer and meaningful commands visibly affect authoritative results.*

**Block 3 — Actual online CTF/KOTH:** Build authenticated two-side lobby, realtime queue, acceptance, start, live commands, recovery, objective wins, BG currency. Add bot-labelled practice if needed. *Done when two separate real player accounts complete a match and receive correct rewards once.*

**Block 4 — Ranked Arena + Elo:** 2v2, 3v3, 5v5 queues, separate seasonal 1000 ratings, widening match range, fair roster locking and server-settled rating. *Done when real matched players receive inverse result ratings, ties/drops are handled, and no generated opponent can enter ranked.*

**Block 5 — Gear/progression and the Crucible:** War Marks → Tier 1, 20 BG wins + PvP score gate, Arena Seals → Tier 2, Season Crests → Tier 3; clean all four sections and rating screens. *Done when all economy flows survive reload, cannot duplicate rewards and score gate reflects equipped team.*

**Block 6 — Season system, admin and QA:** Global seasons, real leaderboards, one-time crest payout, reset, match analytics, reconnect/AFK/abuse tests, PvP↔PvE parity, load/latency testing for 5v5 then bigger BG formats. *Done when full season can be simulated and settled twice without duplicate currency, and real iPad browser end-to-end journeys pass.*

## 12. Deliberately deferred / open tuning

- Final battleground 10v10/20v20 release timing depends on enough active real commanders.
- Confirm PvP combat duration target and action cadence in live gameplay.
- Tune ±75/15 s/+50 matching expansion, Elo K=32, 90 PvP gear-score gate, 20-match seasonal qualification, crest percentile/quantity, rank stat normalization and server capacity with playtest data.
- Design rewards for leaving, disconnects and automatic Cell Shock recovery consistently with the game-wide rules.
- Decide whether premade groups/guild-vs-guild queue needs a later milestone; not necessary to launch first real rated 1-commander-vs-1-commander squad matches.

**Definition of done:** A real player queues against another real player, commands a selected squad throughout a battle, watches the same Combat Reborn viewer as PvE, sees a truthful result, gains/loses rating and earns the right currency, with an auditable global season and no disconnected parallel combat engine.
