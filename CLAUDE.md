# NOREX UNITED FC

Club website (`next/` is the redesign, `web/` + `scripts/build.mjs` the current site) and the Discord bot / member API
(`bot/`, a Cloudflare Worker). See `README.md` for how the pieces fit.

- **Several Claude sessions work here at once.** Before touching `bot/`, `scripts/cards.mjs`, or building a site feature
  that needs Discord or new API data, read `PLANNING/BOT-SITE.md`. It covers who owns which files, the API contract
  between the two sides, and how to message the other side.
- Run `node tests/run.mjs` before every push.
