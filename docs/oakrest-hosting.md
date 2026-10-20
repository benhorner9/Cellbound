# Project Oakrest — shared hosting release guide

Oakrest is a completely separate static Three.js game deployed alongside Cellbound.
It is **not** part of the Cellbound game, login or Supabase backend.

| Channel | URL | FTPS directory |
| --- | --- | --- |
| Development | https://playcellbound.com/oakrest-dev/ | `./oakrest-dev/` |
| Public | https://playcellbound.com/oakrest/ | `./oakrest/` |

## Who owns what

- Source: [benhorner9/Projectoakrest](https://github.com/benhorner9/Projectoakrest), with the current overhaul in open **PR #1**, `overhaul/greenwood-gameplay-visuals`.
- Deployment controller: `.github/workflows/deploy-oakrest.yml` in **this Cellbound repository**.
- Host credentials: the existing `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` and optional `FTP_PORT` **GitHub Actions secrets in Cellbound**. No credentials are copied into Oakrest's repository.
- Oakrest build: `npm ci --ignore-scripts`, `npm run check`, `npm test`, Chromium browser QA, then `npm run build`. The deployable output is `dist/`.
- No change to either Cellbound release workflow. The Oakrest workflow never uploads to `./`, `./game/` or `./cb/`.

## Deploy a new Oakrest revision

1. Get the full 40-character **commit SHA** of the tested Oakrest change. It can still be on the draft PR branch; do not merge PR #1 merely to deploy it.
2. Open **Cellbound → Actions → Oakrest - Shared Host Deploy → Run workflow** on `main`.
3. Choose **dev** and enter the desired `oakrest_ref` SHA. This tests and uploads to `/oakrest-dev/`, then checks the HTTPS entry point, source JavaScript, Three.js and exact `build-meta.json` revision.
4. Play-test that dev URL on a **physical iPad in Safari**. The automated suite uses Chromium touch emulation and cannot certify iPad Safari behaviour.
5. When ready to publish the **same approved SHA**, choose **both**, enter that SHA, and enter `PUBLISH_OAKREST` in `confirm_public`. The workflow rebuilds and tests it, verifies the dev deployment, then publishes the *identical build artifact* to `/oakrest/` only if the Chromium suite also passed.
6. Review the GitHub run summary and check `/oakrest/build-meta.json` matches the SHA.

The workflow also triggers on changes to its own file on `main` for deployment maintenance. Public promotion on this push trigger requires the explicit `[oakrest-public-approved]` commit-message marker. Ordinary changes to the workflow do not release the public game.

### Rollback

Rerun the workflow with the SHA of a known-good Oakrest release; choose **both** and confirm the public release. The FTP sync state is distinct for dev and public releases, so each directory can be updated independently from Cellbound.

### Save-data caution

Oakrest currently stores local player data in each browser's `localStorage` (key `oakrest-v1`). Data stored under an earlier `projectoakrest.vercel.app` origin will **not** automatically follow the move to `playcellbound.com`; it needs a save export/import feature or another explicitly consented migration path before users rely on it. Both `/oakrest-dev/` and `/oakrest/` are paths on the **same origin**, so they share localStorage if opened in the same browser/profile. This means they are *deployment-isolated but not save-isolated*. Avoid testing destructive/reset scenarios in the same browser profile as the public game until separate save keys are implemented.

### Limitations

- WebKit and physical iPad QA are not certified by this workflow.
- The static client has no Oakrest user accounts, multiplayer service, or server-backed saves.
- Hosted availability depends on the current shared host and configured FTPS account.
- The Vercel project can be retired separately **after** hosted deployment and user save migration are reviewed; this workflow does not touch or delete Vercel.
