# Job 9 — Design Booth security and publishing

Status: implementation and local regression work; **not released or ready for contributor rollout**.

## Release blocker: shared production database

Both `origin/main` and the initial `origin/staging` contain the same Supabase URL in `auth.js` and `guild-v4.js`: project `jvydqeikdpelmtloulnd`. The connected Supabase account reported no development branches. Separate FTP credentials and a staging URL therefore do **not** isolate content changes from production.

No migration or content mutation was executed against this project. Read-only catalog queries confirmed existing ownership checks and policies. Do not merge/deploy this PR until a separate development database is provisioned and the backend acceptance checks below pass.

The migration refuses to run unless the operator explicitly sets `cellbound.booth_environment` to `isolated-development` in the migration session. This is an operational stop guard, not a substitute for verifying the project reference. Deployment additionally rejects the existing production project and requires the `STAGING_SUPABASE_URL` and `STAGING_SUPABASE_PUBLISHABLE_KEY` repository secrets. The build substitutes these into both browser clients; server credentials are rejected.

## Existing editor audit

| Editor/system | Previous persistence and game connection | Changes in this branch / remaining limits |
| --- | --- | --- |
| Adventure Builder | Cloud `cellbound_design_blueprints`; draft and published JSON in the same row. Published adventures consumed by the real quest/dungeon/raid runtime. Device recovery stash. | Separate private draft RPC, revision checks, idle autosave, account-scoped recovery, review/publish/history. Preview continues through the existing reward-free override path. |
| Content Creator | Cloud `cellbound_design_templates`; reusable room/fight/comic/puzzle templates and T1–T2 item variants. | Private drafts and versioned publishing; cloud autosave when focus leaves the editor; contributor access for this editor. |
| Existing boss drops | Owner-only RLS, but Save immediately upserted player-visible drops. | Save submits a private draft. The reviewed version alone reaches `cellbound_boss_drop_tables`; caches are not updated on submission. |
| Comic artwork | Owner-only append uploads and direct `comic_scene_panel_art` upsert. | Upload submits a mapping for review. Published mapping changes only in the transaction. |
| Comic captions | Device-only drafts/export; no real text publication. | Linked scene captions now cloud-save and publish to `cellbound_comic_text`, read by the existing comic renderer. Source-only scenes without a runtime scene ID still require export/developer review. Draft artwork-path edits remain preview-only; uploading artwork is a separate reviewed mapping. |
| Dungeon/Manor room positions | Local drafts; owner-test session overrides; owner RPC directly published cloud layouts. | Cloud autosave and cross-device loading, account-scoped immediate recovery, revision checks, shared review/history. In-flight saves preserve newer edits and retain their original room target. Existing local previews and drag controls retained. |
| Room backgrounds | Separate cloud art mapping, direct publishing/removal. | Reviewed publication and owner-only recoverable archive/restore; built-in artwork files remain untouched. |
| PvP maps | Separate private cloud draft table and public map table; owner preview; direct publish/delete. | Draft import, common review/history, no public-map cache mutation during submission. Map-to-combat integration preserved. |
| Combat UI editor | Device-local layout profiles; owner-only application on this device. | Remains local and owner-only. No global publication was invented for a personal layout tool. Cloud profile portability is unfinished. |
| Game Build Hub | Local planning briefs, links and QA checklists. | Retained. Planning briefs are not game content and still need cloud portability. |
| Item Catalogue | Read-only registry/filter/export; designed item variants loaded from published templates. | Retained; no item, stat or artwork changes. |
| Character Models | Owner visual inspection/fitting, not asset authoring. | Retained unchanged. |
| Dungeon Planner | Legacy planning/generator tool; not a secure game publication path. | Retained owner-only. Its outputs still need implementation/review. |
| Minigame Library | Code-registered handlers reused by designed adventures. | Retained. New mechanics still require code and regression tests. |

## Critical findings

1. Staging and production share the database, so changing backend policies there would breach the staging-only requirement.
2. Published blueprint/template rows were readable by signed-in players **including `draft_blueprint`**. Client-side column selection did not prevent a different API request reading unpublished drafts.
3. Client saves generally had no database-enforced revision check. Comparing `updated_at` only while opening a project did not prevent a later overwrite.
4. Publication was performed by several direct updates/upserts and layout RPCs. There was no shared approval state or immutable publication history.
5. Several “save” actions published immediately; captions were local-only despite appearing beside publishable art.
6. Deletion/restoration did not retain the removed version. Owner permissions were enforced, but contributor roles did not exist.
7. Some local recovery records were unscoped to the account, and failed/local-only saves were not consistently distinguished from cloud persistence.

## Security model implemented

- Existing `cellbound_admins` owner identity remains authoritative and cannot be changed through the Booth.
- New contributor memberships are separate from game-admin privileges. Roles: viewer, editor and admin; owner is derived from the existing protected registry.
- The owner grants content scopes and may separately grant an admin publishing permission. Default admin has review permission, not publishing permission.
- Current membership is checked on every RPC; authorization does not depend on editable user metadata or stale role JWT claims.
- Private schema tables have RLS enabled, no direct client table grants and no public mutation privileges.
- A public invoker RPC delegates to a private, explicitly granted function with an empty search path. Resource tables/columns are selected from a fixed server-side allowlist.
- Existing direct content-write grants and legacy room publish RPC execution are revoked by the migration. Players retain access only to published columns; private drafts are read through authorized RPCs.
- Editor UI access is currently complete for Adventure Builder and Content Creator. Other specialist editors remain owner-only even if the backend supports their content scopes. Do not invite specialist contributors until those UI integrations are completed and tested.
- Existing image buckets remain public for runtime compatibility. Draft metadata is private, but an uploaded image is accessible to somebody holding its URL. Private draft-asset delivery is still required before confidential art collaboration.

## Publish and rollback semantics

Save resets approval and increments revision. Submit and approve also increment revision, so an approval is tied to the exact saved state. Publish requires an approved draft and publishing permission.

A resource-scoped transaction lock covers first saves, updates, publication, archive and rollback. A stale draft revision fails instead of overwriting. Publication also compares the current published row to the draft's base to detect independent changes.

The published row, before/after history and draft state change in one PostgreSQL transaction. Constraints or validation errors roll all changes back. Actor and timestamps come from the server. IDs cannot be redirected through client-controlled table names or keys.

Owner archive removes a published override but retains its full snapshot in history, restoring built-in content where applicable. Owner rollback restores a selected historical previous version and records that operation as another history event. Ordinary direct deletion remains denied.

A publication is atomic per content resource. A room background and its marker layout are two resources and two review actions; multi-resource release bundles are not implemented.

## Validation performed

- Actual migration and RPC executed with local PGlite/PostgreSQL roles. Tests cover owner protection, player/anonymous denial, editor and viewer restrictions, scoped admin publish grants, direct-write denial, conflict detection, draft-field privacy, every publication adapter, failed-publication atomicity, archive and rollback.
- Existing core, appearance and build checks run locally.
- Existing full Chromium browser suite run locally, including iPad portrait/landscape viewport checks.
- New browser regression exercises contributor access outside the game admin panel, scoped navigation, confirmed saves, stale/offline recovery, review comparison, submission and viewer controls.
- GitHub Actions run 38059042172 passed the complete Chromium and WebKit suites, core/build checks and final release gate at commit `4b621e1b1996e19b96c393329be5854bec314e49`. Local WebKit system libraries were unavailable, so WebKit evidence comes from GitHub Ubuntu.
- Additional room recovery regression covers account isolation, immediate local recovery, edits during a save, navigation during a save and offline failures.
- No production writes, migration deployment, staging merge or deployment occurred during this work. No exact deployed-commit success is claimed.

## Remaining acceptance work before release

1. Provision isolated staging Supabase, copy the complete required schema and published content/art references, and establish a staging owner account without modifying production. Database branch cost requires confirmation through the Supabase connector.
2. Apply the guarded migration there, run Supabase security advisors, and exercise the real PostgREST RPC using separate owner/admin/editor/viewer accounts. Local PostgreSQL tests do not verify hosted API schema exposure or Storage policies.
3. Complete specialist contributor entry/permissions, private draft-art storage, account-scoped recovery for legacy editors, and consistent autosaving across those editors. Adventure/template/room autosaving is implemented; caption/PvP saves remain explicit.
4. Add a guided visual version comparison/preview to replace the technical field comparison for nontechnical reviewers. Current field history is readable and escaped but is still technical.
5. Complete safe rebase/merge UX after conflicts. Current conflict handling refuses overwrite and keeps recovery content; it does not automatically merge two people's edits.
6. Validate physical 13-inch iPad Safari: touch marker capture, resizing, scrolling, keyboard focus, file uploads, browser background/termination, reconnect, and second-device recovery.
7. Only after those checks and green PR CI: merge into `staging`, verify `build-meta.json` matches the merged commit, check database identity and publish/rollback an isolated test resource. Never merge to `main` as part of Job 9.

This branch is a tested security/publishing foundation with practical editor changes. It is deliberately **not represented as completed Job 9** while these gates remain open.
