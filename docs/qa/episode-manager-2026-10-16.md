# Block 2 implementation checkpoint — 16 October 2026

**Not complete. Not deployed. Episode 2 is not activated. Do not merge or apply the candidate schema to production.**

Base: draft PR #224, `e3e951a8f2492c18ca93a761cd9a6f9864d1d4ef`.

## Follow-up: official release controls / open development

Ben clarified that public release controls belong to the official game, not dev. This correction is implemented in the candidate SQL and existing Admin interface:

* Isolated dev exposes registered content to signed-in development accounts without activation or tester allowlisting. Story, party, client-build and implementation checks still apply.
* Dev shows OPEN DEV PLAYTEST and no public activation/pause controls. Direct SQL RPC attempts to release an episode from dev are rejected.
* Official code deployments leave the persisted release state unchanged. Owner activation still requires current evidence, explicit environment confirmation and a revision match.
* Official pauses leave dev open. Development reward receipts cannot be redeemed in the separate official database.
* `node tests/episode-environments.database.cjs`: **22 assertions passed across two independent PGlite databases**, including normal dev access, official denial after deployment, forged dev flags rejected, owner activation, pause and unchanged saved progression.
* `node tests/episode-release.database.cjs`: **30 assertions passed**, now exercising release transitions in a disposable official-environment fixture.
* Follow-up `npm run test:core`: **72/72 passed in 92 seconds**. Follow-up `npm run build`: **passed**.

These are real local SQL tests, not hosted deployment evidence. Browser and provisioning limitations below remain. The broader Block 2 acceptance gaps are not resolved by this policy correction.

## Delivered in this checkpoint

Reusable private-schema SQL registry, five release states, E1 permanence, exact-environment confirmations, revision locking, owner authorisation, audited transitions, tester allowlist, future registration API, evidence-bound readiness, legacy direct-save revocation, version/CAS save API, protected high-level records, and transactional verified-result receipts.

The existing Admin Panel now contains an Episodes section that fetches server status and invokes the real RPC. It includes private content inspection and an adapter launch boundary. Missing Episode 2 encounter adapters are explicitly disabled; this is **not** a playable preview implementation.

The former shared-database deployment waiver is rejected. No connected isolated Cellbound project exists. No production/staging database, website or account was changed.

## Executed checks

| Check | Result | Scope |
|---|---|---|
| `npm run build` | Passed | Final implementation parses and packages; existing Design Booth mock warning remains |
| `npm run test:core` | 71/71 passed | Local Node suite; database test was subsequently extended and rerun separately |
| `node tests/episode-release.database.cjs` | 30 assertions passed | Actual SQL in disposable PGlite, authenticated-role execution |
| `npm run test:talents` | Passed | 13 classes, 28 specs, 113 combat self-tests |
| `npm run test:role-balance` | Passed | 386 seeded simulations |
| `npm run test:appearance` | Passed | Existing appearance/art regressions, not Episode 2 artwork acceptance |
| `npm run test:browser` | Blocked: 0/34 passed | Chromium executable absent; browser installation hit network approval boundary |
| New manager browser test | Blocked before launch | Test added for 1366×1024, phone and desktop, bridging RPCs to real SQL |
| Hosted/iPad Safari/WebKit | Not validated | No pass claimed |
| Screenshots | Not produced | No fabricated screenshots |
| Staging deployment | Not attempted | Required isolated project absent |

Database checks cover: fail-closed missing configuration, normal-account filtering, owner-only transitions, E1 permanence, stale release revisions, incomplete/stale evidence, old-build rejection, stale saves, direct legacy writes denied, forged episode progress denied, forged verified-result insertion denied, Level 30 snapshot downgrade denied, per-account load isolation, Episode 3 independent activation/pause/reactivation, schema/build evidence invalidation, future Episode 20 registration, settlement ownership, same-receipt retries and preview reward denial.

The settlement tests insert a **trusted-worker fixture**. They verify locking/receipts/atomic account replacement, not legitimate encounter-result verification. They must not be presented as working raid settlement.

## Acceptance gaps / defects

1. Separate staging project provisioning and hosted security validation are outstanding.
2. No authoritative Episode 2 encounter executor/result verifier exists. Real quest/dungeon/raid reward settlement remains blocked.
3. High-level characters are conservatively immutable through whole-account saves. Secure equipment/respec/consumable mutation APIs are still needed.
4. Guild/trading/social/raid RPCs and character mirrors still need a coordinated canonical-save cutover and security audit. Candidate schema must not be promoted yet.
5. Live/paused level-cap behaviour across every E1 XP path is unfinished; server-provided cap alone is insufficient.
6. Genuine private playthrough, QA reset isolation, persistent unlock notification, full readiness UI and hosted multi-device/reconnect tests are outstanding.
7. Browser rendering and screenshots remain unverified.

Full technical boundaries and pause policy: `docs/episode-release-architecture.md`.

## Next required owner decision

Choose the Supabase organisation for a new isolated Cellbound development project. Any chargeable provisioning must be confirmed before purchase. Retain Episode 2 in Development, preserve PR #224 as draft, and do not deploy this checkpoint.
