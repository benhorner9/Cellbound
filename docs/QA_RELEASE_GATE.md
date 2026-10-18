# Cellbound automated quality gate

The production game runs **only the existing shared Combat Reborn engine**. This QA system does not grant rewards, call live production services or deploy by itself.

## What runs and where

1. Both PR validation (targeting `staging` or `main`) and every `staging` deployment run `npm run build`, `npm run test:appearance`, and `npm run test:core`.
2. PR and staging deploy each run `npm run test:browser` twice, once in Chromium and once in **WebKit** (the closest CI browser engine to iPad Safari).
3. Tests are automatically picked up from `tests/*.cjs`: all `*.browser.cjs` are browser tests; all other tests except the ten already handled by `test:appearance` are core checks. The runner fails if essential tests disappear.
4. A failed test results in a failed pull request check or blocks a staging deploy. GitHub Actions job summaries list every test and its result. Existing browser screenshots are uploaded by validation.
5. The `staging` deploy still requires its server-side smoke check and checks the exact published commit; this test runner **does not** replace real deployment verification.

## Existing coverage now enforced consistently

| Area | Checks |
| --- | --- |
| Character creation, equipment and saving | Browser creation, persistent reload, corrupted-save recovery; appearance, gear-fit and inventory item-catalogue integrity |
| Dungeons, quests and raid | Five-dungeon entry and reset, Quest journal, shared combat and presentation contracts, Manor owner QA with no loot, end-to-end playthrough |
| Combat / PvP | Living Combat self-tests, combat renderer checks, deterministic PvP objective simulations, matchmaking and authority contracts |
| Design Booth | Actual editor interactions, boss-drop editor, room art upload, item catalogue and authoring contracts |
| iPad browser compatibility | WebKit suite and tablet-sized gameplay checks; creator smoke at phone size |
| UI / beta operations | Login, layout and performance, admin, balance, analytics and beta support checks |

**Important limitation:** Browser tests use simulated or local QA accounts and stubbed backend behaviour. They do *not* prove that live Supabase permissions, multiplayer networking, FTPS credentials, external devices or every boss fight is functional. Those still require controlled owner testing on the dev site.

## Running the tests locally

With Node 20 and the repository available:

```sh
npm run build
npm run test:appearance
npm run test:core
npm install --no-save --package-lock=false playwright@1.51.1
npx playwright install chromium webkit
npm run test:browser
CELLBOUND_TEST_ENGINE=webkit npm run test:browser
```

When a test fails, open the GitHub Actions run and look for the failing named test in the job summary. Fix the actual behaviour (or update a genuinely obsolete test with a reason), rerun the pull request checks and only then merge into `staging`. Do not skip failed gates to force an upload.
