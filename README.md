# Cellbound

Cellbound is a browser-based guild-management RPG currently in pre-alpha.

Players build and manage a roster of adventurers, form five-character parties, equip and develop characters, run dungeons, complete handcrafted quests, use professions, trade with other players, and take part in shared world-boss encounters.

## Current stack

- Static HTML / CSS / vanilla JavaScript client
- Supabase for authentication, persistence and shared multiplayer systems
- GitHub Actions for production builds and deployment
- Shared-host FTPS deployment

## Production

The `main` branch is the production branch.

Every push to `main` runs `.github/workflows/deploy-live.yml`, which:

1. checks out the repository;
2. runs `npm run build`;
3. verifies the generated production package;
4. deploys `dist/` to the shared hosting `./cb/` directory over FTPS.

Production path:

`https://athleticsmanagergame.com/cb/`

The `cb.athleticsmanagergame.com` alias may also point at the same lowercase `/cb` document root.

Vercel is not part of the current Cellbound production deployment.

## Local build

```bash
npm run build
```

The build script creates a fresh `dist/` directory, validates browser JavaScript syntax, checks important UI hooks/assets, stamps the current build identifier into the HTML, and cache-busts local JS/CSS references.

## Main application files

### Core
- `index.html` / `auth.js` — sign-in and account entry
- `guild.html` — main game shell and screen markup
- `guild-v4.js` — authoritative guild state, roster, party, bank and core PvE state
- `gear-data.js` — equipment catalogue and gear artwork mapping
- `profession-data.js` — reagents, professions and recipes

### Character systems
- `character-sheet.js`
- `character-sheet.css`
- `gear-character-patch.js`
- `character-foundations-patch.js`

### Gameplay systems
- `dungeon-2d-v1.js/css` — Ashen Vault 2D dungeon
- `hollow-sanctum-v1.js/css` — quest-unlocked Hollow Sanctum
- `world-boss-2d-v1.js/css` — shared world-boss viewer
- `quests-v2.js` — current adventure/quest logic
- `quests-v1.css` + `quests-v2.css` — quest base styling and current adventure-log styling
- `economy-v2.js/css` — Trading Post
- `social-v3.js/css` — chat, Party Finder and shared-world UI
- `evolution-v1.js/css` — presentation/enhancement layer
- `onboarding-v1.js/css` — first-login tutorial flow
- `mobile-v1.js/css` — phone-specific layout and interaction layer
- `admin-v1.js/css` — authorised developer controls
- `release-v1.js/css` — client update/release gate

## Repository conventions

- Keep `main` deployable.
- Do not commit generated `dist/` output.
- Superseded feature files should be removed once the replacement is verified and live.
- Temporary deployment markers should not remain in the repository.
- Feature branches may be used for larger batches, but fully merged branches should be pruned after verification.
- Avoid moving active runtime files purely for cosmetic organisation; path changes affect the production build and cache behaviour.

## Secrets

Production credentials and deployment secrets are stored in GitHub Actions secrets and must never be committed to the repository.
