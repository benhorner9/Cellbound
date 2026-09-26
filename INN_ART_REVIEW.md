# Lantern Inn — unified art direction proof

Open `inn-art-review.html` to review the environment, five painted class studies and contextual controls together. This is intentionally an isolated sample company: it loads no account, save, economy or combat systems. The room, character buttons, Ledger/Party Table dialogs, focus handling and mobile composition use `lantern-inn-v1.js`, the existing Inn implementation.

## Delivered

- `CELLBOUND_ART_BIBLE.md`: visual rules, interface tokens, modular identity/gear contract and rollout gates.
- Two original illustrated room compositions, landscape and portrait.
- Five alpha-preserving painted character studies: Warrior, Priest, Mage, Rogue, Hunter.
- `inn-art-direction-v1.css`: shared Inn overlay styling, also applied to the live Inn's existing controls.
- An optional room-art configuration on the shared Inn; normal gameplay keeps its existing room and data-driven adventurers while this new art is reviewed.
- Review interactions: character detail, searchable sample Ledger, sample Party Table, return to the room, label-free acceptance view.

## What this does not claim

The five cutouts are not a completed painted modular avatar pipeline. They do not replace the player's custom appearance or gear. The production character renderer, save data and Combat Reborn are unchanged. The next art-production task after approval is compatible painted layers for race/appearance, armour families, tiers, weapons, off-hands and sets. That must be validated before fixed prototype paintings can become real world avatars.

## Assets and provenance

Built-in imagegen was used. Exact prompts are in `ART_DIRECTION_PROMPTS.json`. The supplied reference was used as a rendering benchmark, not shipped as an asset. Original generated PNGs were encoded to WebP without recolouring, background removal or pixel editing; character alpha was preserved.

| Asset | Bytes |
|---|---:|
| `assets/world/lantern-inn-landscape-v2.webp` | 334090 |
| `assets/world/lantern-inn-portrait-v2.webp` | 346712 |
| `assets/world/avatars/warrior-study-v1.webp` | 325324 |
| `assets/world/avatars/priest-study-v1.webp` | 281702 |
| `assets/world/avatars/mage-study-v1.webp` | 245204 |
| `assets/world/avatars/rogue-study-v1.webp` | 251122 |
| `assets/world/avatars/hunter-study-v1.webp` | 269512 |

The Warrior is slightly above the 300KB character target. Only the isolated review loads these five studies; ordinary gameplay incurs no prototype image transfer.

## Review states

The browser review captures default room, selected character, Ledger, Party Table, 1024px iPad landscape, 390px mobile, mobile character sheet and a label-free scene. Production Inn regression independently covers real roster/party handlers, appearance and gear changes, keyboard focus, ten-character slots and reduced motion. Physical iPad performance still requires device testing.
