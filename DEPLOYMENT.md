# Cellbound deployment route

Cellbound uses a gated staging pipeline and a deliberately manual production release.

## Development / staging

The active playable development build is:

- https://cb.athleticsmanagergame.com

The `staging` branch is the working game branch. Gameplay, UI, balance, content and bug fixes are made there first.

Every push to `staging` now follows one release pipeline:

1. Run the full staging QA suite.
2. Stop immediately if any QA step fails.
3. Build the exact commit that passed QA.
4. Stamp that commit into `build-meta.json`.
5. Deploy only to the canonical FTP directory `/cb/`.
6. Verify the same commit is being served over HTTPS.
7. Run post-deploy smoke diagnostics.

A failed QA run cannot deploy.

Staging uses:

- `STAGING_FTP_SERVER`
- `STAGING_FTP_USERNAME`
- `STAGING_FTP_PASSWORD`
- `STAGING_FTP_PORT` (defaults to 21)

The old uppercase `/CB/` staging copy is obsolete and is removed by the gated deployment job. The FTP account root is not automatically deleted because it can contain hosting-account files outside the Cellbound staging document root.

## Branch relationship

`main` is the production/release line. `staging` is the development line and should descend from `main`.

Normal work goes only to `staging`. Production-specific commits should not be made independently on `main` while development continues. When an approved build is ready for production, promote the tested staging commit to `main` through the release process rather than recreating changes by hand.

This keeps branch history linear enough to understand exactly which staging build a production release came from.

## Production

The public site is:

- https://playcellbound.com

Production remains manual-only. A push to `main` does not automatically deploy to the public site.

Production uses:

- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_PORT` (defaults to 21)

## Current release rule

1. Make changes on `staging`.
2. Let required QA pass.
3. Let the gated job deploy the exact passing commit to `cb.athleticsmanagergame.com`.
4. Verify the post-deploy commit marker and smoke checks.
5. Test the playable build there, with iPad as a primary target.
6. Fix on `staging` and repeat until approved.
7. Promote that approved staging commit to `main` only when intentionally preparing a production release.
8. Run the production workflow manually and verify `playcellbound.com`.

Never use production as the first test of a change, and never deploy staging before QA has passed.
