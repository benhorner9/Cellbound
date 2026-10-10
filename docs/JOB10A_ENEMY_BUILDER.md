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
