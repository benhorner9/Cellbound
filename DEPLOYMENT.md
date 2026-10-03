# Cellbound deployment route

Cellbound uses a staging-first release flow.

## Staging

All gameplay, UI, balance, content and bug-fix updates are tested first at:

- https://cb.athleticsmanagergame.com

The `main` branch is the candidate build. Use the **Deploy Cellbound Staging** GitHub Actions workflow to publish the current `main` build to staging.

Staging uses separate GitHub Actions secrets:

- `STAGING_FTP_SERVER`
- `STAGING_FTP_USERNAME`
- `STAGING_FTP_PASSWORD`
- `STAGING_FTP_PORT` (optional; defaults to 21)

## Production

Production is:

- https://playcellbound.com

Production must not deploy automatically when code changes. After a build has been tested and approved on staging, use the **Deploy Cellbound Production** workflow to promote the current `main` build to production.

Production uses:

- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_PORT` (optional; defaults to 21)

## Release rule

1. Make/update Cellbound on `main`.
2. Deploy `main` to staging.
3. Test on `cb.athleticsmanagergame.com`, with iPad as a primary test target.
4. Fix issues on `main` and redeploy staging until approved.
5. Manually run the production workflow.
6. Verify `playcellbound.com` after promotion.

Never use the production workflow as the first test of a change.
