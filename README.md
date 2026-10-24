# NOREX UNITED FC

The club website and Discord bot for NOREX UNITED FC, an EA SPORTS FC Pro Clubs team.

- **Club pages:** record, division, form, leaders, squad and results
- **Match archive:** every match kept with full box scores for both teams
- **Player profiles:** cards, career totals and per-club stats for everyone we play with or against
- **Squad Hub:** Discord login, player claims, availability and man-of-the-match votes
- **Club docs:** announcements (optionally posted to Discord), requirements, rules members acknowledge, FAQ, glossary, Play Style and a suggestion box
- **Discord bot:** result posts plus `/club`, `/last`, `/results`, `/player`, `/compare`, `/top` and `/site`

## How it works

```
scripts/fetch.mjs   EA Pro Clubs data → data/*.json (the permanent archive)
scripts/build.mjs   data/ → static HTML in site/
scripts/cards.mjs   site data → Discord cards (score cards, field views, tables) the bot attaches
bot/                Cloudflare Worker: Discord commands, member login and API
```

The site rebuilds itself about every 10 minutes. It needs Node 22+ and has no npm dependencies.

## Local preview

```bash
npm run update
```
```bash
npm run preview
```

Then open http://localhost:4321.

## Settings

Everything club-specific lives in `config.json`:

| Setting | What it does |
|---|---|
| `extraClubIds` | Extra clubs to track in full |
| `hiddenPlayers` | Gamertags or player IDs to hide from the site |
| `recruitment` | Opens or closes the Trials page |
| `discovery` | How many clubs are scanned per run, and the size of the crawl queue |

## Limits

- EA only returns each club's last 5 league matches, so anything played during a long outage is lost.
  Squad and career totals still catch up.
- There's no player-lookup endpoint, so a player's other clubs are found by scanning club squads.
- Data comes from EA's public Pro Clubs web API. This project isn't affiliated with or endorsed by EA.

## EA event counters
`scripts/lib/events.mjs` decodes EA's undocumented per-player `match_event_aggregate_0..3` counters (passes by direction/length,
possession won/lost by third, tackles, shots in/out of the box, positioning feedback). Every archived player row keeps the raw
non-zero counters as `evraw` (`"215:21,216:5,…"`), so ids decoded later also work on old matches. The id table is community
observation, not EA documentation; credit to the EA FC Pro Clubs API research project and the fc-clubs-api docs
(https://1erkandogan.github.io/fc27-clubs-api/match-events/). `scripts/lib/schema.mjs` flags endpoint shape drift
(`data/meta.json` `schemaDrift`) and a bad `platform` (use `common-gen5` or `nx`; EA rejects `common-gen4`).
