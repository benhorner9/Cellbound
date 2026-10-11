# Cellbound High Scores — Job 13A

## Scope
One shared high-score source for the signed-in guild game and the public website.

- **Categories**: ten current professions. Future systems (dungeons, PvP, guild achievements) get their own future categories; no empty dummy numbers or rankings.
- **Ranking**: level DESC, then current XP DESC, then guild/character name ASC for deterministic ordering. One entry per character per profession; the top 100 are displayed.
- **Max level**: new XP earned at level 100 remains tracked for tie-breaking. Old discarded max-level XP cannot be reconstructed.
- **Source**: the existing saved `guild_accounts.game_state.roster[].professions[]` and locked guild name.
- **Projection**: database trigger copies only safe guild, character, profession, level, XP and update timestamp to `public.cellbound_profession_highscores`. Public read-only column grants hide the opaque score key; RLS allows only SELECT. No user ID, email, account data, equipment, inventory, raw save blob or permission fields in the public output.
- **Writes**: the sanitized table cannot be updated directly by public or authenticated API roles. The refresh trigger is isolated in an unexposed `cellbound_internal` schema, and unrelated save mutations with unchanged profession standings skip regeneration. Deleting a guild/character/profession drops the corresponding ranking row.
- **Known limitation**: current game saves are player-authoritative. The board is tamper-resistant against direct scoreboard modification but is not yet a cheat-proof competition system; moving progression calculations to server-authoritative RPCs is future work.

## Routes
- In game: **Social → High Scores** (`guild.html`, `guild-v4.js`).
- Public without login: **/highscores.html**, linked from the login page and from the in-game board.
- Frontend shared implementation: `highscores-v1.js` / `highscores-v1.css`.
- The public website at WordPress.com is still in coming-soon mode. It can link directly to the public URL; publishing or embedding that route on a separate WordPress site is independent of this repo's staging deployment.

## Validation
- SQL migration, backfill, anonymized read privileges, read-only RLS, direct write denial.
- Browser test on Chromium and WebKit covering level/XP rank, profession switch, refresh and HTML escaping.
- Core contract test ensures both pages, game nav, build manifest and SQL safety exist.
- QA on iPad: open the social nav High Scores, switch categories, confirm scores reflect actual saved profession progress, then visit the separate public page without signing in.
