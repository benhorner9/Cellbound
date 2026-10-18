# Cellbound release language and website audit — 18 October 2026

## Voice
Use plain UK English. Talk to the player as a guild leader. Keep sentences short and concrete. Explain what the player can do, what happens when they act and what they earn.

Avoid promotional filler such as *immersive adventure*, *epic journey*, *unleash your potential*, and other stock sales language. Avoid repetitive contrasts such as “not just X, but Y” and vague claims about “revolutionary” gameplay. Never make claims about features that are not ready.

## Release scope
**Episode 1:** playable quest line, five initial dungeons, the Manor raid, Null Complex finale, equipment, professions and endgame difficulties. Launch copy uses *early access* so it does not imply flawless completion.

**Episode 2:** described as in development, **locked** on the production client. No claim that its planned dungeons are playable.

**Website structure:** marketing homepage at `/`, separate signed-in game at `/game/`. No iframe, fake “Play” button or accidental development backend connection.

## Player-facing copy updates
- Public page rewritten with clear description, shorter headings, accurate dungeon names, a How to Play section, raid details and replayable endgame.
- Primary CTAs now open `/game/`. Mobile navigation includes How to Play.
- Game login footer uses *Episode One · Early Access* instead of *Pre-alpha*.
- Developer-only admin copy uses ordinary language in the shipped UI rather than references to internal launch pushes.
- Automated check: `node tools/check-public-copy.cjs`; checks page status, episode names, CTAs, sections, placeholder terms, duplicate IDs and generic promo phrases.

## Still to validate manually before launching
- iPad Safari: first-time registration, saved-game reload, navigation and content overflow.
- Screen-reader labels and contrast on the actual rendered build.
- Further quest dialogue and item descriptions throughout the whole game; automated phrase checks cannot certify natural writing or all spelling.
- Production website domain ownership and the WordPress installation, if one remains part of the hosting arrangement.
