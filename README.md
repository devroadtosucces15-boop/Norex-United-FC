# NOREX UNITED FC

The club website and Discord bot for NOREX UNITED FC, an EA SPORTS FC Pro Clubs team.

- **Club pages:** record, division, form, leaders, squad and results
- **Match archive:** every match kept with full box scores for both teams
- **Player profiles:** cards, career totals and per-club stats for everyone we play with or against
- **Squad Hub:** Discord login, player claims, availability and man-of-the-match votes
- **Discord bot:** result posts plus `/club`, `/last`, `/results`, `/player`, `/compare`, `/top` and `/site`

## How it works

```
scripts/fetch.mjs   EA Pro Clubs data → data/*.json (the permanent archive)
scripts/build.mjs   data/ → static HTML in site/
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
