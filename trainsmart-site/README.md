# TrainSmart fictional Coach Hub — isolated Cellbound distribution

This folder mirrors the D01–D07 **fictional** TrainSmart Coach Hub from `benhorner9/Coaching` commit `2ab199279f2308d9bd8be6dec4129b7eb8aaf105`. Never enter real client data; this public demonstration has **no authentication, signed consent, secure storage, email delivery or production database**.

Source files live in `public/`, tests in `tests/`, and `npm test && npm run build` generates `dist-trainsmart/`. For shared-host compatibility, the build changes .mjs module imports to .js and HTML root-relative asset paths to relative links, adds a prominent public-demo warning, and writes build-meta.json. No source workbook, live config, keys, private files, hosted databases or production Vercel assets are copied.

Only `./trainsmart/` is uploaded by `.github/workflows/deploy-trainsmart.yml`. The root website and other games are untouched. Any modification to source must be an explicitly pinned, tested update; do not auto-sync source/main.

**Acceptance:** confirm GitHub Actions tests, browser WebKit/Chromium, FTPS upload, hosted asset hashes, JS MIME types and build-meta exact Cellbound/Coaching commit. Physical iPad Safari owner QA remains separate.

D07 adds fictional Mifflin–St Jeor calorie/macros, anonymous ChatGPT meal prompt/JSON import, manual 16-choice meals, recipe reuse and named versioned meal templates. All food amounts are illustrative, not verified for real clients; see Coaching/docs/D07_NUTRITION_PREVIEW.md.

D07.1 navigation fix: visible Meals & Nutrition shortcut, bookmarkable #nutrition route, and source-versioned CSS/entry module to avoid old Safari caches. Mobile WebKit tests are part of the smoke QA.

UX08: grouped navigation, quiet coach-facing copy, premium responsive workspace and four focused nutrition stages (Targets, Create plan, Meal editor, Library). Includes native accessible tab focus and no loss of demo data.

UX09 deliberately replaces the prior green/dark identity with a professional light neutral/navy/cobalt theme, new standalone non-cacheable CSS asset, consistent coach module skins and line icons. Fictional example only.

D07.2: Open recipe vocabulary (TRAINSMART_MEALS_V2). Name any new food in ChatGPT instead of an existing ID, then review new ingredients' per-100 g/ml label/composition values. Until reviewed, meal nutrition remains incomplete and saving to templates is blocked. Existing V1 recipes remain supported. No automatic AI nutrition or live backend calls.

D08 fictional client preview: `coach-client.html?client=sarah` opens a separate, mobile-first home/training/meals/progress experience. Assigned programmes and meal snapshots are read from the SAME TAB's fictional session storage; workout drafts, ordered completion and weekly check-ins are local only. Client switching is explicit demo-only and is NOT identity or authorisation. No production backend, live account or real client data is accessible. The coach dashboard provides a link from individual client profiles. Source version and permissions are gated independently before any real-client roll-out.

D08.1 plans-only client preview: no Home, Progress or Check-ins in the client UI. Training shows all assigned sessions and allows logging working sets (reps/weight), saving unfinished drafts, and completing only the next session in order. Nutrition displays all four coach-assigned options for each of breakfast/lunch/dinner/snacks and logs the selected option for today's date; changing or removing today's choice is supported. Logs stay in the same browser tab's fictional session storage and are not usable as authenticated real-client records. No unverified calorie totals are inferred from logged meals. Dedicated independent backend permission tests and iPad pilot are still required before real-client deployment.

D08.2 preview role switch: top navigation includes **Coach view / Client view** on desktop, iPad and mobile. The selection is a demo-only view toggle, NOT a login or permission change. The fictional client last chosen in the client preview is remembered in sessionStorage; returning to the coach preview restores its previous section. No backend/auth added.
