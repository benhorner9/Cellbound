# Job 10A — Enemy & Boss Builder

## Technical assessment

- `src/combat/combat-reborn-v1.js`: one shared simulation and live-session engine. Enemy normalization already accepts exact health, level, classification, AI pattern, basic targeting and range. Damage is level/classification scaled. Existing mechanic handlers implement ground/spread/line/cone warnings, interruptible blast/healing, knockback and pull. Existing phases emit `PHASE_CHANGE`, increase damage, add mechanics and enable party-wide basics.
- Existing limitations: basic attack damage/cadence and most mechanic damage amounts are presets. Arbitrary spells, scripting, phase replacement and new boss models are not exposed. The release uses existing mechanics; small opt-in configuration hooks will provide bounded defence and cooldown/health conditions without changing legacy encounters.
- `cellbound_design_templates`, kind `fight`: existing JSON blueprint stores `enemySpec` schema 1. Job 9 `template` scope / RPC supplies private cloud drafts, revisions, submission, approval, publication, history and rollback. No migration, grants or policies need changing. Existing generic JSON storage does not enforce this new nested schema; editor and gameplay adapter both validate/fail closed before execution. Backend role/state/revision enforcement remains unchanged.
- `admin-design-booth-v1.js`: new dedicated tool within the existing Booth. Adventure fight stages carry an independent enemy snapshot plus source slug/revision. Template publication never silently updates an existing adventure. Updating a fight requires a separate adventure review/publication; adventure rollback restores its previous enemy snapshot.
- `design-booth-content-v1.js` → `CellboundQuests.runQuest2DFight` → `CellboundCombatStandard.createLiveSession`: existing game runtime and canonical viewer. Preview will call the same wrapper with copied party data, no loss penalty, and no reward functions.
- Existing Drop Tables continue owning fight-stage drops. Built-in dungeon/raid/quest/PvP/world-boss definitions and artwork remain unchanged. Encounter artwork is a background, not a new animated actor model.

## Checkpoint 1

Core builder and validated versioned model implemented: basics, AI, abilities, phases, artwork, private template save/reload/autosave, device recovery, contributor scope, export, review submission. Existing and uploaded backgrounds use the existing art system. Validation/model tests pass. Runtime preview and adventure integration remain checkpoint 2; no deployment yet.

## Checkpoint 2

Implemented independent fight snapshots in Adventure Builder, editing an attached snapshot, built-in/background art reuse, public adventure loading and dedicated reward-free preview. Canonical quest fight adapter preserves the opt-in configuration marker. Existing phase/telegraph/interrupt renderer is reused. Added bounded opt-in defence, fair serial ability scheduling with per-ability minimum cooldowns and health conditions; legacy scheduler stays unchanged. Fixed hidden combat backdrop intercepting taps after preview exit.

Passed model and actual Combat Reborn tests, existing combat authority regressions, existing Design Booth contracts, and Chromium touch browser flow: cloud save/reopen after removing device recovery, phase editing, dungeon insertion/save, public runtime loading, canonical combat viewer, preview exit, no reward/penalty calls, submission and viewer restrictions. PostgreSQL suite passes 50 checks including boss JSON roundtrip, private/public separation, editor/viewer denial, publication and rollback under the unchanged migration.

Checkpoint 3 remains: complete release-gate runs in Chromium/WebKit, publish the feature branch/PR, merge only after green checks, deploy staging, and independently verify the deployed commit.

## Release scope and iPad instructions

1. Select your normal five-character party. Open Design Booth → Enemy & Boss Builder.
2. Set a name, level, exact health, damage multiplier, defence and AI pattern. Choose mechanics under Abilities; set warning duration, minimum cooldown and health condition. Under Boss phases, set descending thresholds and additional abilities. Select an existing background or upload one.
3. Wait for **Cloud draft saved**, then use Test encounter. The canonical combat interface shows warnings, interrupts and phase messages. Close combat or finish the encounter to return. Dedicated tests call no XP, item, currency or defeat-penalty functions.
4. Open/create a dungeon in Adventure Builder. Return to Enemy & Boss Builder, choose your saved boss and click Add to open adventure. The fight is copied independently. Edit this fight’s boss changes that snapshot; it does not alter other adventures.
5. Use Manage this boss’s loot / Drop Tables for optional existing reward choices. Save the adventure, test its fight stage, and submit it for review. Review & Publishing supplies Approve, Publish and History. Publishing the reusable boss alone does not publish its adventure.
6. To restore a released encounter, use the adventure’s History → Restore previous version. Template history restores the reusable template; it does not rewrite already-copied fights.

Supported first-release mechanics: ground burst, party spread, line, frontal cone, interruptible blast, interruptible self-heal, knockback and pull. Heal percentage and movement-impact damage are configurable. Other mechanic damage uses the existing preset scaled by enemy/phase damage. Basic targeting is threat/random, with documented AI overrides. Phase behaviour supports increasing damage, unlocking additional abilities and enabling whole-party basic attacks. Existing phase warnings and visual effects are reused.

Not included: arbitrary spell scripting, per-phase replacement/removal of old abilities, custom attack animations/actor models, new mechanic families, live-link updates of existing adventures, or automatic migration of built-in bosses. Artwork means encounter backgrounds. Uploaded art retains Job 9’s public-bucket limitation. Physical 13-inch iPad Safari and separate real-account / cross-device Auth and Storage acceptance remain manual checks; browser tests emulate touch viewports.

No SQL migration or shared-backend content mutation is part of this release. Database tests execute the actual existing migrations in disposable PostgreSQL/PGlite with authenticated roles. Browser cloud/auth fixtures are simulated; combat, viewer, editor and published-content adapters are real. The existing owner-controlled publication boundary is unchanged.

Checkpoint 3 preparation: all 29 core suites passed locally; new Chromium builder flow also verifies offline recovery and edits arriving during an in-flight save. Final PR gate, merge/deployment SHA and independent HTTPS verification are recorded on the GitHub PR after execution.
