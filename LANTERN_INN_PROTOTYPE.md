# Lantern Inn — review prototype

Scope is the Inn only. Other locations are deliberately not converted to world-as-interface.

The default roster destination is a painted room containing actual equipment paper dolls. Ten named slots have separate landscape and phone coordinates. The current party occupies foreground positions; reserves occupy quieter background positions. The slot resolver is exposed as `CellboundInn.assign`, with no gameplay authority.

Guild Ledger contains the original roster controls under the original `#roster` ancestor. Party Table temporarily moves the original `#party` node into a native dialog and restores it on close; references and handlers are retained. Character selection uses the existing character-sheet capture handler, presented as a side panel or mobile bottom sheet. Escape, dialog focus and character-focus restoration are supported. No equipment, progression, membership or party rules are reimplemented.

## Artwork

Built-in image generation produced two original environments, then lossless-in-dimensions WebP encoding optimized delivery (about 310 KB landscape and 324 KB portrait). No generated characters, text or controls are baked into the artwork.

- `assets/world/lantern-inn-landscape-v1.webp`: 1536 × 1024
- `assets/world/lantern-inn-portrait-v1.webp`: 1024 × 1536

Landscape prompt: Create a production game background for Cellbound's Lantern Inn, a believable warm fantasy adventurers' inn. Rich painted RPG environment, amber hearth and lantern light against cool teal dusk. Elevated view of a wide timber room, fireplace left, window and reserve table at rear, stocked bar and stairs right, round planning table foreground left, open ledger foreground right. Adventure equipment, mugs, banners, bags, coherent floor perspective and clear spaces for separately rendered characters. No people, UI, text, labels or watermark; original art, not Darkest Dungeon's style.

Portrait prompt: Recompose the same room for a 2:3 portrait mobile environment, rather than cropping or stretching. Preserve all key landmarks and lighting, with fireplace upper left, window and reserve seating upper centre, bar/stairs upper right, main table lower left and open ledger lower right. Keep clear placement areas for ten separately rendered characters. No people, UI, labels, text or watermark.

## Review states

`tests/lantern-inn.browser.cjs` uses production portrait, character sheet, roster-card and party-renderer code with a fixture account. It captures default Inn, selected character, Ledger, Party Table, iPad landscape, mobile and mobile selected character. It checks real control-node preservation, party-handler updates, search persistence, focus return, named slots, touch targets, responsive art choice and reduced motion. Fixture search logic and state persistence do not exercise live account transactions. Physical iPad frame rate is unmeasured.

The prototype is ready for visual review after these states pass. Do not propagate to other locations until the direction is accepted.
