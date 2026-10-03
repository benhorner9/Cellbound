# Cellbound deployment route

Cellbound uses separate development/staging and production branches.

## Development / staging

The active playable development build is:

- https://cb.athleticsmanagergame.com

The `staging` branch is the working game branch. Gameplay, UI, balance, content and bug-fix changes are made and tested there first.

Pushes to `staging` deploy to the legacy Athletics Manager `/cb/` directory.

Staging uses:

- `STAGING_FTP_SERVER`
- `STAGING_FTP_USERNAME`
- `STAGING_FTP_PASSWORD`
- `STAGING_FTP_PORT` (defaults to 21)

## Production

The public site is:

- https://playcellbound.com

The `main` branch is the production branch. While Cellbound is not publicly launched, production shows a Coming Soon page and redirects the game entry back to that page.

Production does not deploy automatically. The **Deploy Cellbound Production** workflow is manual-only.

Production uses:

- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_PORT` (defaults to 21)

## Current release rule

1. Make game changes on `staging`.
2. Let staging deploy to `cb.athleticsmanagergame.com`.
3. Test the playable build there, with iPad as a primary target.
4. Fix and redeploy staging until approved.
5. Keep `playcellbound.com` on Coming Soon until public launch.
6. At launch, promote the approved staging build to `main`, remove the production holding-page redirect, run the production workflow manually, and verify `playcellbound.com`.

Never use production as the first test of a change.
