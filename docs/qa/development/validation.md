# Isolated development release — 17 October 2026

Development target: https://cb.athleticsmanagergame.com/
Development backend: `zrvehixcthljiktcctne`, London.
Official backend: `jvydqeikdpelmtloulnd`; no schema changes or episode activation performed there.

## Implemented

- Separate Auth, account saves, private episode tables and hosted canonical combat verifier.
- Trusted Null Complex story adapter: sequential narrative, component puzzles, four mandatory shared-engine encounters and server-only finale proof.
- Full Morrowfields chapter from PR #227, with trusted first-clear XP/gold and both next-quest records.
- Secure save cutover with account revision checks, Level 16+ XP protection, equipment editing and synchronization with existing game RPCs.
- Development login can authenticate the official account and import that player's own save once. No official state is written, no passwords are copied, and an existing dev save is never overwritten. Imported legacy finale flags do not become trusted proofs.
- Separate public dev configuration for authentication, gameplay and high scores. Default official builds have no Episode 2 service configured.
- Private design-booth schema and column permissions restored in dev.

## Validation

- Local database end-to-end test covers actual Null combat replay through trusted finale, all Quest 1 stages, Level 16 rewards, repeat-claim protection, account revisions, post-15 editing, denied client settlement and downgrade prevention.
- Environment isolation suite: 22 assertions across two independent local PostgreSQL databases.
- Episode release suite: 30 executed PostgreSQL/RLS assertions.
- Login bridge contract tests cover origin, verified official identity, rejected dev/invalid tokens and unconfirmed email, raw Auth response handling and absence of official writes.
- Hosted browser test uses a separate QA account with an explicit Level 15 / Manor-cleared starting fixture. Null completion and Episode 2 completion are earned through the UI and hosted verifier, not inserted as proofs.
- Restricted executor networking forwards real Supabase requests through Node and supplies the unmodified pinned Supabase browser library. No Auth, save, reward or encounter endpoints are mocked in this hosted test. The initial static bundle is local pending website deployment.

Physical iPad Safari is not tested. This is a development release, not approval to activate the full Episode 2 campaign on official. Episode 1's older gameplay remains client-driven outside the new protected chapter boundary.

## Completed pre-deploy results

- Build: PASS.
- Core regression suite: **77/77 PASS**.
- Hosted UI: **PASS** at 1366×1024. Verified finale, all chapter stages, investigation reload, real shared-engine combat, server-side replay, 4,300 XP for each active character, 180 gold, both investigation unlocks and final reload.
- Test account balance: 5,000 starting gold + 150 Null first-clear + 180 chapter reward = **5,330**, roster **Level 16**.
- Screenshots: [regional map](regional-map.jpg), [chapter completion](hosted-complete.jpg).
- Supabase security advisors: no error-level findings; intentional service-only tables deny direct access. Warnings remain for the inherited authenticated security-definer game RPCs and unavailable leaked-password protection; these are not represented as a complete legacy security audit.
