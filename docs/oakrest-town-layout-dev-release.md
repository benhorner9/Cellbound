# Oakrest development deployment

The release bridge in `.github/workflows/deploy-oakrest-dev.yml` is pinned to reviewed Oakrest development source commit `7a1408c59f4b220df23460d36093ff1a853ecf59`.

This release redesigns the approach to the relocated well: the upper and lower Merchant Quarter roads are set back from the entire paved courtyard, narrow stepping stones replace roads ending at the well, and the connecting street mesh uses properly joined mitres. Market stalls, lamps, benches and a crate were adjusted. Automated road clearance tests now examine the real paved quads as well as the complete well courtyard.

Target directory: `./oakrest-dev/` only. The public `./oakrest/` remains protected by before/after file fingerprints in the workflow.

Use only this reviewed pin; do not point the bridge at an arbitrary moving branch. Keep iPad Safari visual signoff distinct from automated Chromium/WebKit tests.
