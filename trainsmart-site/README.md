# TrainSmart fictional Coach Hub — isolated Cellbound distribution

This folder mirrors only the D01–D06 **fictional** TrainSmart Coach Hub from `benhorner9/Coaching` commit `2113d568a2da566731edb7c64e9e957e6ecf4275`. Never enter real client data; this public demonstration has **no authentication, signed consent, secure storage, email delivery or production database**.

Source files live in `public/`, tests in `tests/`, and `npm test && npm run build` generates `dist-trainsmart/`. For shared-host compatibility, the build changes .mjs module imports to .js and HTML root-relative asset paths to relative links, adds a prominent public-demo warning, and writes build-meta.json. No source workbook, live config, keys, private files, hosted databases or production Vercel assets are copied.

Only `./trainsmart/` is uploaded by `.github/workflows/deploy-trainsmart.yml`. The root website and other games are untouched. Any modification to source must be an explicitly pinned, tested update; do not auto-sync source/main.

**Acceptance:** confirm GitHub Actions tests, browser WebKit/Chromium, FTPS upload, hosted asset hashes, JS MIME types and build-meta exact Cellbound/Coaching commit. Physical iPad Safari owner QA remains separate.
