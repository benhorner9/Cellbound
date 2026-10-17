# Block 3A — The Morrowfields / After the Breach

This branch adds the playable opening on top of PR #225 (`4a4fe011`), which itself preserves PR #224. **Hosted release is blocked. Do not deploy this branch to the existing shared account backend, and do not activate official Episode 2.**

## Player path

Quest Journal or World → After the Breach → three transmission panels → Voss and Vey’s briefing → regional map → Fenstead Farm → Mara → East Fields → broken wagon → four spatial clues → shared dungeon combat → recover component → Tessa → three closing panels → rewards and two investigation records.

The eight regional landmarks are registered in `src/episodes/morrowfields-data-v1.js`. Fenstead and the opening East Fields are playable. Six later routes explain their prerequisites and never launch unfinished content. `e2_q02` and `e2_q03` are revealed together; their first objectives are displayed without start buttons. The existing episode reducer continues to own unlocks, world state, the Level 30 cap and the 90,750-XP campaign budget.

Fenstead has farmhouse/Mara, barn/Tessa, supplies, notice board, the East Fields route and a road back to Zeltira. Equipment opens the existing roster. No new shop, bank or inventory is introduced. Map/hub scenes use the existing illustrated interactive-world pattern, with keyboard-accessible buttons and a mobile location list. Existing Zeltira presentation stays intact.

The new three-enemy encounter calls `CellboundCombatStandard` and `CellboundDungeon2D.playSharedEncounter`. It does not add an engine or combat renderer. Six-pose enemy atlases use the existing monster animation, cast, impact, death and VFX systems. The generic viewer gained optional command capture and a consumable-disable option; its defaults are unchanged. Consumables are unavailable in this one encounter until they have a trusted server mutation protocol, rather than accepting client healing as evidence.

## Trust boundary

`server/episodes/opening-authority.cjs` loads the exact shared combat/data/progression sources into a Node VM. The server reads the account, release policy, private finale proof and active attempt from its database. Clients submit interaction choices and a bounded combat command history, never a trusted result, roster, XP amount or reward flag.

Each encounter receives a server seed and sealed party snapshot. The server re-executes the shared live engine, enforces command names/times/targets, verifies elapsed time and party consistency, and only advances the creatures objective on its own victory. A client-supplied `outcome: victory` cannot convert a wipe. The final panel advances the existing reducer, granting exactly 4,300 XP to the five recorded active characters and 180 gold. The account revision, reward claim and attempt are committed atomically. Retries retain the first-clear claim; concurrent/stale updates cannot overwrite newer state.

`opening-schema.sql` is a **local candidate following `release-schema.sql`**, not an automatically applied migration. Its two public functions are service-only. Browser roles cannot insert a finale proof, edit an encounter or commit a snapshot. The HTTP handler checks the bearer token against the same backend’s Auth `/user` endpoint, takes the account ID from the authenticated response, restricts origin/body size and returns `no-store` responses. Production requires the existing episode registry to be `live`; development requires authenticated accounts and story proof but no activation or owner allowlist. None of these files activates an episode.

The browser receives a complete committed snapshot via `acceptEpisodeSnapshot`, updating the secure save revision rather than awarding or re-saving rewards locally. Failed requests leave durable progression unchanged and offer reload/retry. A mid-investigation reload resumes the saved clue state. A dropped or expired battle can be restarted; partial battle playback is replayed from its sealed starting state, not restored halfway through the animation.

## Hosted prerequisites that remain outside this completed local opening

1. Provision and verify a separate Cellbound development backend. `config/booth-release.json` still has no development project; the existing shared-storage deployment prohibition remains.
2. Finish PR #225’s save cutover, trusted roster/equipment/economy mutations and privileged legacy-writer audit. Legacy saves are not sufficient evidence that combat stats were legitimately earned. Do not treat the new replay worker as proof of the entire legacy account’s integrity.
3. Implement the upstream Null Complex narrative verifier. The private `story_proofs` record must come from independently verified Episode 1 finale completion. **There is intentionally no browser import, owner shortcut, or automatic conversion of the old client-writable completion flag.** Local tests use an explicitly labelled trusted fixture. Therefore the live “finish Episode 1 → enter Episode 2” acceptance path is not signed off.
4. Deploy the authenticated Node worker behind HTTPS against that isolated backend, with its reviewed candidate schema and the exact client build. Environment: `CELLBOUND_EPISODE_BACKEND`, server-only `CELLBOUND_EPISODE_PRIVATE_KEY`, `CELLBOUND_GAME_ORIGIN`, optional `PORT`. The default listener is loopback for a TLS reverse proxy. Client build: existing isolated Supabase URL/key plus `CELLBOUND_EPISODE_SERVICE_URL` ending `/opening`. No credentials are shipped in frontend assets.
5. Run hosted JWT/PostgREST/concurrency tests and a physical iPad Safari playthrough. Local Chromium viewport tests are not a substitute for either.

## Reproduce local evidence

`npm ci`, `npm run build`, `node tests/morrowfields-opening.cjs`, `node tests/morrowfields-http.cjs`, `node tests/morrowfields-art.cjs`, and `node tests/morrowfields-opening.browser.cjs` (Playwright with Chromium installed). Core/browser runners discover these tests automatically. The browser test uses the real built game, a local PostgreSQL database and the actual worker through a test transport; authentication and the upstream finale proof are fixtures. Production databases are never contacted.

Art paths/hashes are in `config/morrowfields-art.json`; enemy entries are in `config/monster-art.json`. All 17 artworks were created with the built-in image generator; prompts are in `docs/qa/morrowfields/art-prompts.json`. Enemy atlases were packed with the existing `tools/pack-monster-art.cjs`. Source dimensions, pose boxes, ground lines and original source hashes are recorded in the existing monster provenance file. All game-consumed files are in `assets/episodes/morrowfields/` or `assets/monsters/v1/` and included by the build.
