# NOREX redesign preview (local, detached)
Separate from the live site. Reads the repo's `data/` (club matches) and `config.json`; writes only to `dist/`. Ignored by git (PLANNING/).
- Rebuild after any change: `node PLANNING/redesign-site/build.mjs`
- View: `PORT=4400 node PLANNING/redesign-site/serve.mjs` then open http://localhost:4400
- Research data: `data/formations.json` (29 FC 27 shapes), `data/roles.json` (roles + focus per position, with sources)
- Pages so far: Tactics table (Our XI, All formations, Roles per position, Rush). Other groups added as each board is approved.

## Look A build (chosen design)
- **Canvas and cards:** "Midnight Pitch" in `static/style.css` (bottom block): blue-black canvas with a faint pitch outline, glossy graphite cards, red lacquer for one hero card per page, gold only for achievements and the Hub key.
- **Shared visuals:** `lib/widgets.mjs` (builders) + `static/widgets.js` (behaviour) + `static/widgets.css` (all scoped under `.wx`). Bento, flip digits, 3D towers, form orbs + goal wave, leaderboard race, radar, coverflow, swipe deck, flip cards, timeline reel, glass/heat/podium/expandable/ledger tables, trophy cabinet, medals, POTM poster, tier emblems, icon set (`lib/icons.mjs`).
- **Interaction layer:** `static/fx.js` + `static/fx.css`. Menus that follow you (gold orb / island pill / side rail), six page transitions (curtain, iris, shutter, card zoom, pitch lines, locker doors), click burst, ripple, spotlight, magnetic buttons, name scramble. Switch menu style and transitions in the Preview bar. Off for reduced motion and `?still`.
- **Formations:** all 29 FC27 shapes in Tactics (wall), Studio and Dugout; four pitch finishes (grass, night, blueprint, chalkboard).
- **Proposal pages kept for reference:** `/lookbook.html`, `/canvas.html`.
