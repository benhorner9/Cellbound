# Esports Empire — starter build

A browser-based, single-player **esports organisation management simulator** developed from the November 2026 mockups and Game Design Document. This is a playable foundation, not the full 23-section finished game.

## Play

Target hosting directory: **/esportsmanager/** on the existing Cellbound shared-host FTPS server.

- Established public domain: https://playcellbound.com/esportsmanager/
- Repository: https://github.com/benhorner9/Esportsmanager
- Deployment bridge (isolated): https://github.com/benhorner9/Cellbound/tree/main/esportsmanager-site

**Domain note:** The requested host \`cellbound.com\` is not yet confirmed to be the same hosting account as \`playcellbound.com\`; the deployed directory uses the established Cellbound production host. A redirect or domain mapping is required to serve the same game at the alternate host if needed.

## Playable now

- Create a custom organisation (all-round founder start: £45,000, 5 esports players, a streamer, influencer, sponsor and jersey product), or load a wealthy showcase organisation.
- Week-by-week business simulation, with finances, fan conversion, match outcomes, AI rivals, wages and a detailed executive report.
- Headquarters with functional navigation, news, upcoming activities and summary cards.
- Esports Operations: 5-player roster, scout / sign / replace, renewal, tactics, training, season fixtures and team chemistry.
- Creator Studio: streamer and influencer talent, recruitment, activity schedules, audience, energy, wellbeing and campaign dependencies.
- Content Production: choose organisation-owned media projects and track views and output.
- Commercial Office: sponsorship offers, negotiations, recurring payments, contractual obligations and trust effects.
- Merchandise Studio: products, pricing, manufacturing runs, inventory, stock sales and limited new collections.
- Operations: staff hiring, facilities upgrades, payroll, cashflow, trading ledger and cash runway.
- Local auto-save with JSON export and import. Primary desktop / iPad landscape layouts.

## Important limitations

This first playable version does **not** yet include an illustrated portrait library, an advanced garment designer, real-time online multiplayer, authentication/cloud saves, a publisher rights system, full tactical map simulation, advanced transfer negotiations, or a complete dynamic league playoff bracket. Those belong in later development blocks. Screen artwork is currently rendered in original CSS/vector styles rather than using flattened mockup screenshots.

Creator audiences and business finances use simulation balancing values, not industry forecasts. Data in the showcase is intentionally scaled to demonstrate the richer UI state.

## Run locally

Requires Node.js 20+ only for tests. The game itself has no build dependencies.

\`\`\`bash
python3 -m http.server 8080
# Open http://localhost:8080/
npm test
npm run check
\`\`\`

The app uses relative asset paths so it runs both at the site root and at \`/esportsmanager/\`. Saves are held in the browser's localStorage and must be exported to move to another device.

## Deployment safety

The \`benhorner9/Cellbound\` repository contains the matching copy under \`esportsmanager-site/\`, plus an isolated workflow that uploads **only** \`./esportsmanager/\` using its existing \`FTP_*\` GitHub Action secrets. It must not overwrite the other games or the root site.

Future changes to the source repo are **not automatically mirrored** into the Cellbound bridge by GitHub, because the source is private and the bridge uses independent credentials. Update both copies together, or later configure a secure cross-repository sync and validation flow. Never commit FTP secrets.
