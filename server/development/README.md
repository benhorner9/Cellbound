# Isolated development deployment

Dev host: https://cb.athleticsmanagergame.com/
Backend: zrvehixcthljiktcctne (London); official backend remains jvydqeikdpelmtloulnd.

Public browser configuration is in config/development.json. The staging workflow builds with its staging ref; default/official builds retain the official backend and no chapter service. No private keys are committed.

Provisioning order for a fresh **development-only** database:
1. supabase/migrations/20261017120714_isolated_development_chapter.sql (schema-only legacy baseline).
2. server/development/episode-base.sql (Episode Manager and chapter RPCs).
3. supabase/migrations/20261017145518_development_episode_authority.sql (environment, save mirror, trusted finale, first-copy import).
4. server/development/booth-restore.sql (private design publishing schema and column permissions).
5. server/episodes/admin-role-hardening.sql (deny max/reset actions when the caller has no admin role).

The development-only migrations are not a production migration stream. Do not run the whole legacy migration directory against the official database.

Run node tools/build-episode-worker.cjs to regenerate the edge worker from the shared canonical combat and quest sources. Deploy episode-opening and development-account to the development project only. Both authenticate explicitly with Supabase Auth; the former requires a dev token, the latter validates an official token solely to read the user's own save and establish a separate dev identity. Neither writes to official storage. The first copy never overwrites an existing dev save and cannot import trusted finale proofs.

The owner role is assigned only after playcellbound@gmail.com is verified by dev Auth. The UI copy flow authenticates the same confirmed official email; it does not copy passwords. Existing legacy claims of Null completion require replay through the trusted Null story before Episode 2.

The existing Episode 1 game still uses client-driven gameplay snapshots and trusted legacy RPCs. This dev release protects the new chapter's reducer, verified combat/finale, reward replay and high-level XP from the legacy save path; it is not a claim that the entire legacy game is server authoritative. Official deployment remains separate and no release state is activated.
