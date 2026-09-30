# Cellbound

Cellbound is a browser-based guild-management RPG currently in pre-alpha.

Players build and manage a roster of adventurers, form five-character parties, equip and develop characters, run dungeons and quests, use professions, trade with other players, and progress into raids and activities.

## Current stack

- Static HTML, CSS and vanilla JavaScript client
- Supabase for authentication, persistence and shared multiplayer systems
- GitHub Actions for validation and production deployment
- Shared-host FTPS deployment

## Production

`main` is the production branch. Every push to `main` runs `.github/workflows/deploy-live.yml`, which builds the game, verifies the generated package and deploys `dist/` to the live `./cb/` directory.

Production URL: `https://athleticsmanagergame.com/cb/`

The `cb.athleticsmanagergame.com` alias may point at the same lowercase `/cb` document root. Vercel is not part of the current production deployment.

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
