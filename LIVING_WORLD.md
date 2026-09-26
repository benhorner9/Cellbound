# Living World presentation

`living-world-v1.js` and its stylesheet are the shared scene layer. They do not
read or write remote services, change inventory or choose encounter outcomes.
Existing navigation, transactions and gameplay handlers remain authoritative.

Locations are declared in `locations`; dungeon entrances in `stages`. `scene`
creates one environmental surface per host and updates it only when its visible
character/configuration data changes. Decorative layers ignore pointer input.
Inn buttons use the existing `data-char` character-sheet action. Selection,
filters, bulk operations and transaction buttons remain in their original DOM.

The guild emits `cellbound:state-rendered` after state rendering. View changes
refresh only the visible location. Structural observation mounts staging scenes
and Armoury styling, never combat frames. Only six ambient motes per scene are
used, and reduced-motion mode suppresses their movement.

Professions call `workstation(character, profession)` and emit `cellbound:crafted`
after a successful commit. Do not animate a craft as successful on button press.

The Manor calls `harbour(host, memberRows, departing, elapsedSeconds)` using
actual party snapshots. Departure follows the server readiness timestamp;
it must not delay launch or fabricate another player's arrival/readiness.
The normal ready/charge/role controls remain visible and authoritative.

Browser checks use production page markup with mocked account data and no live
transactions. They cover selection delegation, retained form controls, idempotent
mounting, two-party snapshots, crafting feedback, reduced motion and 390/768/1024px
viewports. Live purchase, craft persistence and multiplayer service behavior
remain unchanged; physical iPad performance requires device testing.
