# Oakrest development deployment

The release bridge in `.github/workflows/deploy-oakrest-dev.yml` is pinned to reviewed Oakrest development source commit `062a6522415c752447f1818193196ac5d478e6c3`.

This release redesigns the approach to the relocated well: the upper and lower Merchant Quarter roads are set back from the entire paved courtyard, narrow stepping stones replace roads ending at the well, and the connecting street mesh uses properly joined mitres. Market stalls, lamps, benches and a crate were adjusted. Automated road clearance tests now examine the real paved quads as well as the complete well courtyard.

Target directory: `./oakrest-dev/` only. The public `./oakrest/` remains protected by before/after file fingerprints in the workflow.

Use only this reviewed pin; do not point the bridge at an arbitrary moving branch. Keep iPad Safari visual signoff distinct from automated Chromium/WebKit tests.

## Grand Oakrest Bank and Inventory Drag

The new reviewed development source expands Oakrest Bank into a stone institution with a large banking hall, multiple teller windows, a guarded-looking iron vault, and visible stored coffers, chests and shelves. Item positions in backpack and vault are persistent, validated presentation slots and do not alter ownership. Players may touch-drag or mouse-drag items between the backpack and bank to deposit/withdraw, or move them among inventory slots; the previous quantity controls remain. Focused browser bank drag/save tests passed. Physical iPad Safari hardware visual assessment remains outstanding.
