# Bot ↔ site: who builds what

Two kinds of Claude sessions work on this repo at the same time. This file is how they stay out of each other's way.
Read it before touching `bot/`, `scripts/cards.mjs`, or building a site feature that needs Discord.

| Side | Session | Owns |
|---|---|---|
| **Bot** | "Discord server cleanup and bots" (`session_018AFLi6nCwUsb89kpZJJGgR`) | `bot/**` (the Worker: Discord commands **and** the `/api/*` routes the site calls), `bot/migrations/**`, `scripts/cards.mjs`, `scripts/lib/chrome.mjs`, the Norex DJ music bot (separate server, coming) |
| **Web** | the "/next/ redesign" sessions | `next/**`, `web/**`, `scripts/build.mjs` and the other page builders, the site's look (`next/static/style.css`) |

Message the other side with `send_message` to the session id above. When a session ends, the next one on that side takes
over this file: update the **Status** column when something lands.

## Rules

1. **Stay on your side.** Need a change in the other side's files? Ask the owner. One-line fixes to make CI green are fine;
   mention them afterwards.
2. **The API is the contract.** The web side builds against the shapes below. The bot side doesn't change a shape
   without telling the web side first. New fields are fine, renamed or removed ones are not.
3. **Database changes belong to the bot side.** Before adding a migration, check the newest number on `main`. Taken or in
   open PRs: `0046_server_tools.sql` (PR #17).
4. **One look.** `next/static/style.css` is the source of truth for colours and fonts. The Discord cards copy it in
   `scripts/cards.mjs` (the `BASE` block). Changing ink, red, gold, the W/D/L pill colours, Oswald or Inter? Tell the bot
   side so the cards match.
5. **Links the bot posts.** Discord messages link to `members.html`, `players/<id>.html`, `stats.html`,
   `results.html`, `compare.html`, `matches/<id>.html`. Moving or renaming one? Tell the bot side first, or old messages
   break.
6. **New features ship behind a flag** in `config.json → features`, set to `owner` first and opened up after testing.
7. **Test before pushing.** Run `node tests/run.mjs`. Web pages can use the local mock (`tests/mock.mjs`, see
   `PLANNING/LOCAL-PREVIEW.md` if present) until the real API lands.

## Features that need both sides

The bot side builds the data and the API first, then tells the web side the feature is ready (with the flag name).
Until then the web side can build against the shapes below with sample data.

| # | Feature | Bot side builds | Web side builds | Status |
|---|---|---|---|---|
| 1 | **Stream links + live alerts** | `kick` and `birthday` profile fields, live checks every 10 min, Discord "🔴 X is live" posts, `GET /api/live` | Twitch / YouTube / Kick + birthday inputs on the profile edit form; a "Live now" strip (Hub / home) | Planned |
| 2 | **Watch list** (Pro Clubs YouTube videos sorted by topic) | creator list, upload checks, AI topic sorting, `GET /api/watchlist`, `POST /api/watchlist/:id/useful`, Discord video alerts | Watch list page with topic filters; a "Related videos" block on build, tactics and position pages | Planned |
| 3 | **Discoveries** (member FYI posts approved by managers) | `/share` in Discord, manager approve/reject, `GET /api/discoveries`, `POST /api/discoveries/:id/useful` | Discoveries feed page (and a Hub widget) | Planned |
| 4 | **Fun stats on profiles** | jail count, trivia points, birthdays in `GET /api/member` | badges / counters on the member profile page | Planned |
| 5 | **Music** (Norex DJ) | the music bot (Oracle server), room state, controls, playlist import, `GET /api/music/rooms`, a live room socket, `GET/POST /api/music/playlists` | Music page (live player: queue, search, skip, volume) and a playlist section on profiles | Later (needs the Oracle server) |

### API shapes (draft – the bot side fills these in as each lands)

```jsonc
// GET /api/profile (existing) – new fields, same form
{ "twitch": "name", "youtube": "@handle", "kick": "name", "birthday": "MM-DD" }

// GET /api/live → who is streaming right now
[{ "user": "discordId", "name": "Mike", "platform": "twitch|youtube|kick", "url": "https://…", "title": "…", "since": 1791600000 }]

// GET /api/watchlist?topic=builds|tactics|tips|meta|news&limit=20&related=<topic or position>
[{ "id": "ytVideoId", "title": "…", "channel": "…", "url": "https://youtu.be/…", "thumb": "https://i.ytimg.com/…",
   "topic": "builds", "tags": ["CAM", "meta"], "published": 1791600000, "useful": 12, "mine": false }]

// GET /api/discoveries?limit=20
[{ "id": 1, "title": "…", "body": "…", "link": "https://…", "image": "https://…", "by": { "id": "…", "name": "Jez" },
   "approvedBy": { "id": "…", "name": "Kruger" }, "at": 1791600000, "useful": 12, "mine": false }]

// GET /api/member?id=… (existing) – new block
{ "fun": { "jail": 3, "trivia": 120, "birthday": "07-14" } }
```

## Bot-side work in flight

- **PR #17** – server tools: leave/join alerts, welcome posts, `/purge`, `/tag`, `/remind`, ping-role buttons.
- **PR #18** (stacked on #17) – bot design system: every Discord message in the site's look, plus drawn PNG cards
  (`scripts/cards.mjs` → `site/cards/*.png` + `site/api/cards.json`) made after each site build.

Next on the bot side: the rest of the commands on the design system, then features 1–4 above, then music.
