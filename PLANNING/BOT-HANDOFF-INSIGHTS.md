# Bot-side handoff: insights and banter cards

For the next bot-side session (see `BOT-SITE.md`). Mike released these on 2026-10-15. The session id listed in BOT-SITE.md could not be reached when the web side tried to message it, so this file is the message.
Plan and reasoning: `PROCLUBS-TRACKER-PLAN.md`. Item list and order: `ROADMAP-INSIGHTS.md`. Nothing here is built yet.

What the web side builds: deeper stats (per player, per match, per team, per session) computed at site build time from `data/matches`, published as `site/api/insights.json` (new `scripts/lib/insights/`). The shape will be added here when item I0.1 lands; new fields only, nothing renamed.

## Bot-side items (all behind flags in `config.json → features`, owner first)
1. **I0.3** A per-member "banter opt-out" profile field, plus flags `proInsights`, `bantercards`, `sessions`, `scout`. Needs a migration: check the newest number on `main` first.
2. **I2.4** `/banter`: returns a banter card to the person who asked, never posted to the channel. Cards: Big Talk Small Output, Main Character, Ghost, L Merchant, Self-Glazer, Dressing Room Gossip. Honour opt-out and hide-me.
3. **I5.1** `/scout <club>` (opponent dossier) and `/session` (last night's report), returned to the asker only.
4. **I5.2** Optional Monday leaderboard post. Off by default; managers switch it on.
5. Card art for the above in `scripts/cards.mjs`, matching `next/static/style.css`.

Rules from Mike: banter cards are never auto-posted. Wording is playful and about the stat, not the person.

Check for overlap with `bot/statinsights.js`, `bot/predict.js`, `bot/fun.js`, `bot/awards.js` before building, and reply here (edit this file) with what you take and the migration number.
