# Cellbound Beta Development Log

## 2026-10-03 — Beta Analytics

- Added channel-separated gameplay telemetry for staging and production.
- Character creation now records class, race, spec and role so popularity can be measured historically.
- Added level, quest, profession, crafting, gear, Cell Shock, dungeon, raid, activity and screen-usage events.
- Added an aggregate-only Beta Analytics dashboard to Admin.
- Added class/race popularity, dungeon start/clear funnel, feature usage, level milestones, professions and daily active tester views.
- Existing roster characters are observed once when analytics first loads so the dev dashboard has a starting baseline.


## 2026-10-03 — Step 9: Beta Operations

- Added in-game Beta Support for tester reports.
- Added a persistent Report Bug / Request launcher available from anywhere in the game.
- Feature requests now have their own report category, and quick reports preserve the originating screen.
- Reports capture build, active screen, viewport and lightweight party/progression context automatically.
- Added private admin triage queue with tester-visible team notes.
- Added safe player lookup and recovery for Cell Shock, stuck dungeon attempts and Twelve Below attempts.
- Added permanent release-gated beta operations checks.
- Added the beta operations playbook and development log.

## 2026-10-03 — Step 8: Break-the-Game QA

- Added corrupted-save recovery coverage.
- Hardened repeated Bank upgrades, dungeon start races and Manor start spam.
- Verified dungeon refresh/resume across Chromium and WebKit.
- Fixed verification and password-reset return paths.

## 2026-10-03 — Step 7: UI/UX and Language

- Polished player-facing language and beta filters.
- Improved touch, keyboard and iPad behaviour.
- Added regression protection for UI consistency.

## 2026-10-03 — Step 6: Progression and Economy

- Locked the Level 15 beta progression curve.
- Rebalanced first-clear/repeat XP, dungeon gear and Cell Shards.
- Added Fourfold bad-luck protection and adjusted key progression costs.
