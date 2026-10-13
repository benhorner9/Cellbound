# Illustrated monster rollout — 13 October 2026

## Scope

This extends the deployed first batch `06f5e1476be11829731d43d6f45ecf74bb120030`. It completes the artwork registry for the audited runtime catalogue: **103 named entries, 99 unique illustrated assets, no known unconverted definitions**. Four Fractured Ages echoes intentionally reuse their original identities. The catalogue includes locked quests and class trials, summoned Cave Spawn, numbered Manor Thralls, Twelve Below's twelve bosses, and the three database world bosses. No content was unlocked and no combat statistics, inventory, rewards or database records were changed.

`monster-inventory.json` and `.csv` give the exact enemy names, IDs, source definitions, encounters, previous visuals and new asset paths. Published Design Booth templates/blueprints were empty at the database audit; future user-authored enemies require their own visual mapping and retain the existing fallback until provided.

## Implementation

- Added the remaining 82 transparent six-pose WebP atlases. Total shipped monster texture bytes: 10,540,304. Each atlas is 768×512 with six 256×256 cells; all are below 190 KB. Only current/next encounter assets are requested, with a 12-entry decoded-image cache.
- Retained the shared animation controller, real combat event timing, spatial footprints, ground shadows, facing and hit feedback. Added compatible turret and serpent motion profiles; turrets do not breathe or bounce like humanoids.
- Standardised source orientation mechanically during packing. All poses of one creature share a scale and a ground baseline. Existing completed assets are preserved when packing another batch.
- Kept distinct existing boss identities where reference art existed. Fang, Grim and Fel Pursuer received separate non-fire designs, avoiding accidental reuse of the Cinder Hound silhouette/materials.
- Twelve Below now keeps a defeated actor long enough for the shared death clip and its bounded impact delay to finish. Defeat bookkeeping still occurs immediately; this is a presentation-only lifetime change.
- Expanded browser coverage to every asset, all six presentation poses and recovery, genuine engine-driven attacks, death priority, reduced motion, failed image loading and cache bounds. Added a real Twelve Below entry/death/exit check.
- CI now archives the monster screenshots and coverage data alongside existing combat captures.

## Art and motion limitations

These are six authored key poses per creature, not a full skeletal rig or authored multi-frame walk cycles. The existing controller supplies timing, movement, recoil and transitions. Flying, mechanical and serpentine creatures have compatible movement profiles, but unique phase-transition sequences and richer attack inbetweens remain future asset work. Original source PNGs are flattened RGBA illustrations, not layered paintings. All 99 source hashes, generation prompts (or explicitly marked reconstructed summaries) and packing metadata are recorded in `monster-art-production.json`.

Coverage of every asset in the shared combat fixture does not certify every authored encounter, boss ability or reward flow. The report distinguishes fixture coverage from actual dungeon navigation tests.

Physical iPad Safari is unavailable. Local WebKit installation downloaded successfully but cannot run because system libraries are missing and the environment rejects dependency installation. Chromium measurements use this container's software renderer; they do not establish real-device 60 FPS. Previous full CI also has failing browser checks, including WebKit combat checks; these must not be described as an all-green release.

## Verification

Production build, 53/53 core suites, appearance suites, 99/99 atlas/animation fixture coverage and the new Twelve Below entry/death/exit test passed. Ashen Guardian animation checks passed (joints, contact, block, miss/dodge, death/revive, interrupts/control, reduced motion, engine invariance and cleanup). Mercer spatial checks reported zero unresolved overlaps with five party members and a pet. Ashen room progression/exit/re-entry and Mercer victory/next-room/departure/cancelled asynchronous entry passed.

Every monster was exercised in batches of up to four against a five-character party in the shared viewer. This is comprehensive asset fixture coverage, not a full playthrough of every raid, world boss, quest and PvP mode.

Fresh serial performance runs:

| Scenario | Average FPS | p95 frame time | Worst frame | Frames >33.4 ms |
|---|---:|---:|---:|---:|
| baseline | 32.0 | 50.1 ms | 99.9 ms | 186/641 |
| full-landscape | 33.3 | 50.1 ms | 100.0 ms | 155/667 |
| full-portrait | 44.3 | 49.9 ms | 116.7 ms | 81/887 |
| full-mobile | 46.1 | 33.4 ms | 100.0 ms | 65/922 |
| full-extended | 36.7 | 50.0 ms | 233.3 ms | 456/2204 |

Landscape uses 1366×1024, portrait 1024×1366, mobile 390×844. Normal samples are 20 seconds; extended is 60 seconds. The landscape average rose approximately 4.1%; p95 did not improve. These results **do not meet the 60 FPS target**. A 233.3 ms worst frame in the extended run remains a frame-pacing limitation. Command response, real Wanted Mark resolution, tab suspension/resumption and teardown assertions passed. Exact intervals and event traces are in the evidence archive; summaries are in `monster-full-performance-results.json`.

The before/after video from the first batch remains valid for Mercer, whose atlas is unchanged in this expansion. New coverage screenshots show all 99 monsters in combat and defeated poses. No new video measurements are implied by the historical recording.

Local WebKit remains blocked by missing host libraries. Previous staging browser CI reported 24/27 Chromium and 18/27 WebKit suites passing; failures are not silently waived. In particular, WebKit combat timing checks require investigation on a supported runner/device. The current focused Chromium checks passing is not an all-platform certification.
