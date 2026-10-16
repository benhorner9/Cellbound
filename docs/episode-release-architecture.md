# Episode release system — candidate implementation

Status: **not production-ready; not deployed; Block 2 is incomplete**.

Built on draft PR #224, `e3e951a8f2492c18ca93a761cd9a6f9864d1d4ef`. The Episode 2 domain contract, XP budget, unlock graph, talent budget and catalogue records are unchanged.

## Implemented paths

* Existing Admin navigation → Episodes → server registry. No separate admin app.
* `public.cellbound_episodes(action,payload)` is an invoker wrapper around a deliberately privileged, private-schema API. Every call requires `auth.uid()`. Owner checks read `cellbound_admins`, never user metadata or browser flags.
* Seven initial registrations; E1 permanently live. `register` accepts future manifests without custom episode controls. Owner-only tester allowlist changes are audited and restricted to isolated development.
* State changes require owner, expected revision, exact environment and exact episode confirmation. Database row locking serialises competing release changes. Failed transitions roll back without audit or state mutation.
* Readiness requires fourteen evidence records tied to deployment build, schema and content revision. Critical migration/isolation/rewards/progression/character checks require automated evidence. Browser callers cannot write evidence or mark implementation complete.
* Private preview enumerates the real Episode 2 records. Only implemented, registered adapters can start, and the SQL gate still checks access. **None of the Episode 2 encounter adapters exists yet; their buttons correctly remain disabled. This is not a playable private campaign.**
* New secure save path is selected for builds with an isolated staging backend configured. No fallback to direct writes occurs on RPC failure. Legacy direct account writes are revoked by the candidate schema. Compare-and-swap saves reject unsupported builds/versions, changed Episode 2 progress and changes to protected high-level character records.
* Verified-result settlement locks the session and account, checks ownership, verifier build, revision and result lifetime, and commits state and receipt together. A retry returns the same receipt. Preview sessions cannot settle durable rewards.

## Deliberate deployment block

The old shared-database waiver is removed. `tools/verify-booth-staging.cjs` rejects the production project even with the former approval record. Both client configurations are replaced only with the supplied isolated URL/key. Server credentials remain forbidden in frontend output.

The connected projects currently contain only Cellbound production and an unrelated coaching project. No separate development project has been provisioned. Provisioning requires the owner's choice of Supabase organisation and any required cost approval. No remote schema or player data has been modified.

`server/episodes/release-schema.sql` is a **local candidate**, not an auto-applied migration. Its environment row is intentionally unseeded. Do not apply it to production: legacy integrations and the transition plan are not complete. Generate a migration through the Supabase CLI only after local validation, integration review and deployment-isolation verification.

## Pause policy

Paused episodes reject new sessions. Previously issued non-preview sessions can settle a result verified during their four-hour lifetime, even after pause or a later build rollout. Retries return the original receipt. A stale account revision requires trusted-worker reconciliation; it is never overwritten. No pause transition modifies saves, inventory, talent allocation or completion flags.

## Outstanding security/integration work

1. **Trusted encounter execution is missing.** `verified_results` is private and clients cannot forge rows, but there is no deployed worker producing independently verified PvE results. The SQL tests insert explicit trusted fixtures to test transaction semantics; they do not prove a raid was played. Do not enable content or claim genuine reward verification is complete.
2. **Character mutation APIs are missing.** The candidate freezes whole high-level character records for safety. Authoritative equipment changes, respecs, item consumption and E1 rewards must be integrated before this is usable for high-level players. A freeze is not final acceptance of functional talent/equipment editing.
3. **Legacy integrations need reconciliation.** The new canonical save table is not yet the data source for all guild, trading, social, character mirror and raid RPCs. Direct legacy writes are revoked, but all other privileged writers need an audited cutover. The original `guild_accounts` data is retained, not deleted. Do not switch a live player population to this candidate.
4. The load RPC returns an access-derived progression cap, but every client XP path has not yet been adapted to that cap. The server rejects new client-authored levels over 15; this is fail-closed, not the completed live/paused progression experience.
5. Actual quest/raid adapter integration, server-owned narrative proofs, tester progression/reset isolation, durable player acknowledgement notification, detailed readiness evidence UI and release-data authoring tools remain incomplete.
6. Hosted JWT/PostgREST tests, concurrent multi-connection tests, old-client tests against the real hosted schema, full browser screenshots and iPad Safari validation remain required.

## Testing and operation

Run `node tests/episode-release.database.cjs` to execute real PostgreSQL SQL/role tests in disposable PGlite. No cloud project is touched. Run `node tests/episode-manager.browser.cjs` for the production-built admin interface at 1366×1024, 390×844 and 1440×900. The browser fixture bridges release RPCs to real local SQL; its surrounding auth/game shell is mocked and must not be represented as hosted acceptance.

Evidence must be issued by trusted CI/manual acceptance ingestion, not an owner checkbox. Production promotion requires a reviewed legacy-save cutover, a complete worker and mutation API, verified isolated staging, and exact deployed commit/schema evidence. Episode 2 stays **In Development**.
