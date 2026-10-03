# Character rebuild — development foundation

This branch is a partial foundation for the supplied October 3 character brief. It is not the completed visual rebuild and must not be promoted to production.

## Implemented

- Appearance schema version 1, additive normalization retaining existing fields and progression.
- Model contract v10; existing race/sex/frame fitting retained with named anatomical anchors exposed.
- Portraits crop the same illustrated base used by the full character. Portraits consistently omit helmets.
- Face, brow, nose, mouth, hair, hair colour, skin, eye colour, markings, race detail and glow controls affect rendered geometry/colour.
- Bald option respected; Emberkin horns separate from hair; closed headgear suppresses incompatible hair/head growths.
- Aelari pale skin palette distinct from Veyren.
- Onboarding race previews enlarged, full-body hero, appearance before class.
- Living World local leader replaces generic pawn with shared appearance/equipment renderer; updates only when configuration changes.

## Validation

`npm run build` passes existing release gates including the gear/body matrix.
`node tests/appearance-foundation.cjs` passes 36 race/sex/frame combinations, checking class-independent anatomy, actual visible control changes, serialization, helmet coverage, named anchors and non-destructive defaults.
Static SVG render reviewed. Existing procedural bodies remain far below supplied concept sheet quality. Do not count this as completion of twelve new race assets.
Local Playwright browser unavailable; download failed with invalid/truncated archive. No browser/iPad, authenticated create/save/logout/login, live combat or raid performance acceptance claimed.
No player data, production branch or production deployment changed.

## Remaining, in brief order

1. Author twelve higher-quality modular bases from supplied sheets; body/face/hair layering and fitted silhouette review. Current vectors are an interim renderer only.
2. Complete unified Creation Centre for onboarding and recruitment (recruitment still uses its existing shell with shared appearance controls). Race-specific modular choices need richer art and independent feature controls.
3. Audit every current catalogue item across twelve bodies and supported builds; improve material art, grips, masks and high-tier sets. Existing equipment framework is retained, not newly audited in full.
4. Integrate full-body combat presentation. Combat portraits inherit the shared face, but combat actors still need a verified shared full-model adapter. Remote Living World peers do not yet transmit appearance.
5. Confirm inspection/remote party payloads retain appearance; authenticated migration/save verification without altering progression.
6. iPad first, then iPhone/desktop browser QA; five- and ten-character frame/memory measurements, clipping review, refresh/update-loop test.
7. Deploy verified candidate to staging only. Production requires explicit user approval after dev acceptance.
