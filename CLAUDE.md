# NOREX UNITED FC

Club website (`next/` is the redesign, `web/` + `scripts/build.mjs` the current site) and the Discord bot / member API
(`bot/`, a Cloudflare Worker). See `README.md` for how the pieces fit.

- **Several Claude sessions work here at once.** Before touching `bot/`, `scripts/cards.mjs`, or building a site feature
  that needs Discord or new API data, read `PLANNING/BOT-SITE.md`. It covers who owns which files, the API contract
  between the two sides, and how to message the other side.
- Run `node tests/run.mjs` before every push.

## How to work here

Adapted from the Karpathy-inspired guidelines (https://github.com/multica-ai/andrej-karpathy-skills). They bias toward care over
speed; for trivial tasks use judgment.

1. **Think before coding.** State assumptions. If a request has more than one reading, say so instead of picking silently.
   If something is unclear, name it and ask. If a simpler approach exists, say so.
2. **Simplicity first.** The least code that solves the request. No extra features, single-use abstractions, unrequested
   options, or handling for cases that can't happen. If 200 lines could be 50, rewrite it.
3. **Surgical changes.** Touch only what the request needs and match the surrounding style. Don't tidy neighbouring code.
   Remove only the imports and helpers *your* change made unused; mention other dead code instead of deleting it.
   Every changed line should trace back to the request. This also keeps parallel Claude sessions out of each other's files.
4. **Goal-driven.** Turn the task into a check you can run (a failing test, then green), say the plan in a few steps, and
   verify each. `node tests/run.mjs` is the check for this repo.
