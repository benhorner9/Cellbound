# Cellbound Beta Operations

This is the operating playbook for the Founding Beta.

## Daily loop

1. Open **Admin → Tester Reports** and start with `BLOCKER` and `HIGH` impact reports.
2. Move reproducible reports to **TRIAGED**, then **IN PROGRESS** when a fix is actively being worked.
3. Reproduce against the current development build before changing live data.
4. Use **Player Recovery** only when a tester is genuinely stuck. Recovery actions are deliberately narrow:
   - Clear Cell Shock
   - Abandon active dungeon attempts
   - Restore The Twelve Below daily attempts
5. Fix the underlying issue in GitHub and keep the regression with the fix.
6. Move the report to **FIXED** and leave a short tester-facing note.
7. Publish the new build through **Admin → Publish Cellbound Update** only after CI is green.
8. Move old reports to **CLOSED** once the fix has shipped or the report is no longer actionable.

## Severity

- **Blocker** — player cannot continue, cannot sign in, save/progression is trapped, or a core loop is unusable.
- **High** — major system is broken but the player can continue elsewhere.
- **Normal** — clear defect with a workaround or limited scope.
- **Minor** — visual/copy/polish issue that does not block play.

## Recovery rules

Recovery is not a substitute for fixing the bug. Use it to get a tester moving again after the cause is understood or recorded.

Do not edit arbitrary save JSON in production. Do not reset raid lockouts, rewards, currencies, gear, quest completion or character progress through support tooling unless a dedicated, audited recovery action is added for that case.

## Release notes workflow

Player-facing notes live in `beta-ops-v1.js` under `PATCH_NOTES`. Keep them short and written as game updates, not implementation notes.

Engineering detail lives in `BETA_CHANGELOG.md`. Add an entry for each beta PR that materially changes player experience, save safety, operations or release behaviour.

## Analytics review

Use **Admin → Beta Analytics** to review player behaviour before making balance decisions.

- Keep **Dev / Staging** selected while testing internally.
- Switch to **Production** only after the Founding Beta is live.
- Class and race popularity is based on tracked character creation events, not just the current roster.
- Dungeon starts and clears are tracked as separate events so completion rate can be reviewed.
- Use at least several testers before treating popularity or completion percentages as meaningful.
- Analytics is for product/balance decisions, not anti-cheat enforcement.

## Beta release checklist

- CI build/regressions green
- Chromium full playthrough green
- WebKit full playthrough green
- Login/account regression green
- No unresolved blocker report for the release candidate
- Current patch note added
- Required build published only after deployment is live
- Test one fresh account and one existing account after deployment
