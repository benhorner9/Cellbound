# Oakrest development deployment

The release bridge in `.github/workflows/deploy-oakrest-dev.yml` is pinned to reviewed Oakrest development source commit `c92c1582fed8bae1f03ffcf909ba43f6ea7e0bec`.

This release moves the original merchant well to its own paved courtyard, repositions stalls, benches, lamps, trade furniture and garden fixtures, closes duplicated gate geometry, and adds collision/road-clearance checks.

Target directory: `./oakrest-dev/` only. The public `./oakrest/` remains protected by before/after file fingerprints in the workflow.

Use only this reviewed pin; do not point the bridge at an arbitrary moving branch. Keep iPad Safari visual signoff distinct from automated Chromium/WebKit tests.
