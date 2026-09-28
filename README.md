# NOREX UNITED FC – auto-updating Pro Clubs site

A free public website for NOREX UNITED FC that updates itself every ~15 minutes from EA SPORTS FC's Pro Clubs data. There's no server, database or monthly bill, and nothing to enter by hand.

- **Club page:** record, division, form, leaders, squad, results
- **Every match archived for good** with full box scores for both teams (EA only keeps the last 5)
- **A profile for every player** we play with or against, with EA career totals across *all* their clubs plus stats for each tracked club
- **Clubs found automatically:** every opponent is tracked, and a background crawler scans the wider club network. When it finds one of our players in another club's squad, that club becomes **linked** and its matches are archived too
- **Self-service:** players can add their other clubs, or ask to be hidden, through a GitHub issue form. No code needed
- **Discord bot** that posts every result and answers `/player`, `/compare`, `/top` and more, hosted free on Cloudflare

## How it works

```
GitHub Actions (every 15 min)
  └─ scripts/fetch.mjs   → EA Pro Clubs API → data/*.json (committed to git = permanent archive)
  └─ scripts/build.mjs   → static HTML in site/
  └─ deploy              → GitHub Pages (free hosting)
```

It needs only Node 22+ and has **no npm dependencies**, so nothing needs updating as packages age.

## One-time setup (about 10 minutes)

1. Create a free GitHub account, then a **public** repository (e.g. `norex-united`). It must be public for unlimited free Actions minutes and free Pages.
2. Upload this folder to it. Either drag the files into GitHub's web page, or run:
   ```bash
   git init && git add . && git commit -m "NOREX site" && git branch -M main
   ```
   ```bash
   git remote add origin https://github.com/YOUR-NAME/norex-united.git && git push -u origin main
   ```
3. In the repo, go to **Settings → Pages → Source: GitHub Actions**.
4. **Settings → Actions → General → Workflow permissions: Read and write**.
5. **Actions** tab → *Update site* → **Run workflow**. The site goes live at `https://YOUR-NAME.github.io/norex-united/`.
6. *(Optional)* Set up the Discord bot. See "Discord bot" below.
7. *(Optional)* Add a custom domain under Settings → Pages (about £10/yr from any registrar).

## Discord bot (runs in the cloud, no PC needed)

There are two parts, and both are free:

**A. Automatic result posts.** In Discord go to Server settings → Integrations → Webhooks → New webhook, pick a channel and copy the URL. In GitHub go to Settings → Secrets and variables → Actions → New secret and name it `DISCORD_WEBHOOK`. Every new result is then posted as a card with scorers, assists and man of the match.

**B. Slash-command bot** (`/club`, `/last`, `/results`, `/player`, `/compare`, `/top`, `/site`), hosted on Cloudflare Workers:
1. https://discord.com/developers/applications → **New Application** "NOREX UNITED".
   - *General Information*: copy the **Application ID** and **Public Key**.
   - *Bot*: **Reset Token** and copy it.
   - *Installation*: tick **Guild Install**, scopes `applications.commands` + `bot`, then open the install link and add the bot to your server.
2. Create a free Cloudflare account at https://dash.cloudflare.com.
   - Copy your **Account ID** (on the right side of Workers & Pages).
   - Go to My Profile → API Tokens → Create Token → template **Edit Cloudflare Workers**, and copy the token.
3. In GitHub go to Settings → Secrets and variables → Actions and add: `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.
4. Actions → **Deploy Discord bot** → Run workflow. The log prints the bot address, e.g. `https://norex-bot.<you>.workers.dev`.
5. Back in the Discord developer portal, go to *General Information* → **Interactions Endpoint URL**, paste that address, and Save.

## Everyday use

Nothing. It runs itself. Things you *can* change in `config.json` (edit it on GitHub's website):

| Setting | What it does |
|---|---|
| `extraClubIds` | Clubs to fully track (the "Add a club" form fills this in for you) |
| `hiddenPlayers` | Gamertags or player IDs to hide from the site |
| `discovery.discoveredPerRun` | How many clubs the crawler scans per run (higher = finds linked clubs faster, more requests to EA) |
| `discovery.maxTrackedClubs` | Size cap on the crawl queue |
| `platform` | `common-gen5` (PS5 / Xbox Series / PC) |

## Maintenance you might have to do

- **New FC game each year:** EA usually keeps the same API. If it changes, `scripts/fetch.mjs` is the only file to update.
- **GitHub emails you if a run fails.** With the Discord secret set, you also get a ping.
- **If EA blocks GitHub** (repeated `HTTP 403` in the Actions log): run the fetcher from any always-on machine at home, such as a PC or a Raspberry Pi. A cron job there should run `node scripts/fetch.mjs`, then `git add data`, then commit and push. The GitHub workflow keeps building and deploying the site.
- GitHub pauses scheduled workflows after 60 days with no commits. The fetcher writes a daily heartbeat to `data/meta.json` to prevent that.

## Local preview

```bash
npm run update
```
```bash
npm run preview
```
Then open http://localhost:4321.

## Limits (from EA's side)

- EA has **no "look up a player" endpoint**, so a player's other clubs can only be found by crawling club squads or through the "Add a club" form. EA's career totals already cover every club, though.
- EA only returns each club's last 5 league matches. Anything played while the updater was down for a long stretch is lost, but squad and career totals still catch up.
- This uses EA's unofficial web API. It isn't affiliated with or endorsed by EA.
