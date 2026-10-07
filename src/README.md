# Cellbound source layout

Runtime source is organised by domain, while the deployed game keeps the existing flat browser paths.

- `src/combat/` — shared combat engine presentation, viewer, HUD, portraits, status and command layers.
- `src/dungeons/` — dungeon runtimes, dungeon presentation and dungeon tooling.
- Root runtime files — game shell and cross-domain systems that have not yet been split into a dedicated domain.
- `tools/runtime-manifest.cjs` — the single source-to-output map used by the build and source-aware tests.

Do not add duplicate root copies of files listed in `RuntimeManifest.moved`. The staging build deliberately fails if a domain-organised runtime drifts back to root.

Production URLs remain unchanged. For example, `src/combat/combat-viewer-v1.js` still deploys as `/combat-viewer-v1.js`.
