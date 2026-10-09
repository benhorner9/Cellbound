# Cellbound

Cellbound is a browser-based guild-management RPG currently in pre-alpha.

Players build and manage a roster of adventurers, form five-character parties, equip and develop characters, run dungeons and quests, use professions, trade with other players, and progress into raids and activities.

## Current stack

- Static HTML, CSS and vanilla JavaScript client
- Supabase for authentication, persistence and shared multiplayer systems
- GitHub Actions for validation and production deployment
- Shared-host FTPS deployment

## Dev/test deployment

`staging` is the **automatic game deployment branch**. Every push to `staging` runs `.github/workflows/deploy-staging.yml`:

1. Build the game with `npm run build` and run the configured QA checks.
2. Rebuild the exact approved `staging` commit into `dist/`.
3. Upload over FTPS to the dedicated staging `./cb/` directory using **only** the `STAGING_FTP_*` GitHub Actions secrets.
4. Verify `https://cb.athleticsmanagergame.com/build-meta.json` reports the exact commit and smoke-test the deployed game files.

**Dev game:** `https://cb.athleticsmanagergame.com/`

FTPS releases are serialised and never cancelled halfway through upload when new commits arrive. A failed build, browser regression, missing staging credential or smoke test fails the workflow. The `main` branch is **not** automatically copied into `staging`; changes merged only into `main` will **not** appear in the dev game until those changes are deliberately integrated into `staging`.

## Public website / production

The public `playcellbound.com` website is a **separate, manually approved deployment**. Its `.github/workflows/deploy-live.yml` runs on `workflow_dispatch`, builds `dist-site/` via `npm run build:site` and intentionally excludes the playable guild/auth application. The `FTP_*` credentials are reserved for that website; dev deployments never use them.

Do not enable automatic live/public deployment when changing the dev workflow. Do not merge `staging` blindly into `main` or vice versa; the two branches currently have different runtime and site histories.

## Validation

Run:

```bash
npm run build
```

The build creates a fresh `dist/`, validates JavaScript syntax and game contracts, verifies required assets and UI hooks, checks that every local JS/CSS reference in the HTML is actually shipped, stamps the build identifier, and cache-busts local runtime assets.

Pull requests to `main` also run browser regressions in Chromium and WebKit, including:

- shared Living Combat playback;
- new-player character creation and onboarding;
- roster and active-party rendering;
- Bank category ordering and isolation;
- Professions recipe filters and crafting startup;
- quests, dungeons, activities, raids, Trading Post, PvP shell and Social;
- iPad, phone and desktop viewport smoke checks.

## Runtime ownership

### Core state and shell
- `guild.html` — main game shell and screen mounts.
- `guild-v4.js` — authoritative guild state, roster, party, Bank, persistence and core PvE state.
- `class-build-v1.js` — class/spec build definitions used by the live shell.
- `gear-data.js` — equipment catalogue and gear rules.
- `profession-data.js` — reagents, professions, recipes and profession combat effects.

### Characters and equipment
- `character-sheet.js`
- `gear-character-patch.js`
- `character-foundations-patch.js`
- `character-portraits-v1.js`
- `item-art-v1.js`

### Combat
- `combat-reborn-v1.js` — canonical combat simulation.
- `combat-standard-v1.js` — shared content gateway into Combat Reborn.
- `combat-physical-v4.js/css` — shared Living Combat motion and effects.
- `dungeon-2d-v1.js/css` — shared 2D PvE viewer plus Ashen Vault content.
- `combat-3d-v1.js` — admin-only experimental 3D/2.5D presentation.

### PvE content
- `hollow-sanctum-v1.js/css`
- `chaos-canyon-v1.js/css`
- `blackout-station-v1.js/css`
- `fractured-ages-v1.js/css`
- `twelve-below-v1.js/css`
- `manor-raid-v1.js/css`
- `no-way-back-v1.js/css`
- `null-complex-v1.js/css`

### Quests, economy and social
- `quests-v2.js` with `quests-v1.css` and `quests-v2.css`
- `economy-v2.js/css`
- `trading-post-v3.js/css`
- `social-v3.js/css`
- `onboarding-v1.js/css`

### Shell and presentation
- `evolution-v1.js/css`
- `game-feel-v1.js/css`
- `mobile-v1.js/css`
- `admin-v1.js/css`
- `release-v1.js/css`

## Repository conventions

- Keep `main` deployable.
- Do not commit generated `dist/` output.
- Remove superseded runtime implementations once their replacement is verified.
- Avoid parallel implementations of the same combat or UI responsibility.
- Use `document.querySelectorAll(...)` or the local `$$` helper for collections; the local `$` helper returns one element.
- Every character has exactly one profession slot.
- Keep local runtime paths stable unless a migration is deliberate; production cache/version behaviour depends on them.
- Keep Chromium and WebKit playthrough regressions green before merging release-hardening changes.
- Production credentials and deployment secrets belong in GitHub Actions secrets, never in the repository.
