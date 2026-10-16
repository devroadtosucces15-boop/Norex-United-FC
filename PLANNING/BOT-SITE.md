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
| 1 | **Stream links + live alerts** | `kick` and `birthday` profile fields, live checks every 10 min, Discord "🔴 X is live" posts, `GET /api/live` | Twitch / YouTube / Kick + birthday inputs on the profile edit form; a "Live now" strip (Hub / home) | Web side built behind flags `memberLive` / `fun` (2026-10-15) |
| 2 | **Watch list** (Pro Clubs YouTube videos sorted by topic) | creator list, upload checks, AI topic sorting, `GET /api/watchlist`, `POST /api/watchlist/:id/useful`, Discord video alerts | Watch list page with topic filters; a "Related videos" block on build, tactics and position pages | Web side built behind flag `watchlist` (position pages: not yet) |
| 3 | **Discoveries** (member FYI posts approved by managers) | `/share` in Discord, manager approve/reject, `GET /api/discoveries`, `POST /api/discoveries/:id/useful` | Discoveries feed page (and a Hub widget) | Web side built behind flag `discoveries` |
| 4 | **Fun stats on profiles** | jail count, trivia points, birthdays in `GET /api/member` | badges / counters on the member profile page | Web side built (shows when `fun` is open) |
| 5 | **Music** (Norex DJ) | the music bot (Oracle server), room state, controls, playlist import, `GET /api/music/rooms`, a live room socket, `GET/POST /api/music/playlists` | Music page (live player: queue, search, skip, volume) and a playlist section on profiles | Web side: music page built behind flag `music` (owner), against the draft below, with a sample-rooms preview. Bot side: no HTTP routes yet (the DJ only talks to Discord and Lavalink) |
| 6 | **Owner floating button** (Mike's request) | `GET /api/manager/queue` → what's waiting (same counts as Discord's `/panel`), for a badge | A floating button only the owner sees, with its own **owner stamp/crest**, premium look (gold, sheen, spring animations, its own colours – richer than anything members get), opening owner tools: the approvals queue with the badge, Boardroom, flags, preview-as, health, announcements, issue reporter | Bot side built (PR #22). Web side built behind flag `ownerFab` (owner): crest button with a queue badge, sheet with the approvals queue, Boardroom, flags, health, announcements, preview-as, issue reporter, and a pointer to the docs release |
| 7 | **Faces everywhere** | `bot/faces.js` in Discord: a shipped Card Studio card beats the Discord picture beats the default. `GET /api/faces?ids=` for the site | The same rule on the site wherever a person has a picture (sign-ups, profiles, chat, rosters, votes) | Discord done (PR #22), site built behind new flag `facesSite` (owner) |

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

// GET /api/manager/queue (managers) – built in PR #22
{ "claims": 1, "cards": 0, "rush": 2, "requests": 0, "ideas": 3, "at": 1791600000000 } // only the queues this person may decide

// GET /api/music/rooms (flag `music`) – web side's proposal for the music bot to serve; length/position in seconds, at = server ms
[{ "id": "room1", "name": "Match Night", "channel": "Match night lounge", "listeners": 7, "paused": false, "volume": 60, "loop": "off|track|queue", "at": 1791600000000,
   "now": { "id": "…", "title": "…", "artist": "…", "thumb": "https://…", "url": "https://…", "length": 214, "position": 71 },   // null when idle
   "queue": [{ "id": "…", "title": "…", "artist": "…", "length": 188, "by": "Jez" }] }]
// POST /api/music/rooms/:id/control  { "action": "pause|resume|skip|stop|clear|volume|loop|add|remove", "level": 0-100, "query": "name or link", "item": "queueId" }
//   → the room, same shape. Managers may control; any member may `add`. The page polls every 5 s and moves the bar itself from position + at.

// GET /api/member?id=… (existing) – new block
{ "fun": { "jail": 3, "trivia": 120, "birthday": "07-14" } }
```

## Bot-side work in flight

- **PR #17** (merged) – server tools: leave/join alerts, welcome posts, `/purge`, `/tag`, `/remind`, ping-role buttons.
- **PR #18** (stacked on #17) – bot design system: every Discord message in the site's look, plus drawn PNG cards
  (`scripts/cards.mjs` → `site/cards/*.png` + `site/api/cards.json`) made after each site build.
- **PR #20** (stacked on #18) – the member commands and match-night posts on the design system.
- **PR #22** (stacked on #20) – `/host` (schedule a session or friendly in one command), `/panel` (manager approvals in
  Discord), faces everywhere, `GET /api/manager/queue`.

All of the above (#17–#27) is on `main`: #17 merged directly, the rest landed together through #29 (see the next section for why).

## Stacked PRs: merge from the top down

When PR B is stacked on PR A (B's base is A's branch), merging B only adds it to A's branch. If A has already
been merged, B shows as "merged" on GitHub but never reaches `main`. This happened to #18–#27 and they had to be
recovered with #29.

- Open a stacked PR with its base set to the branch below it, and say so in the description ("stacked on #N").
- Before merging anything in a stack, retarget the PR to `main` (change its base in GitHub) or merge the **top** of the
  stack into the one below it first, then merge the bottom into `main` last.
- After merging, check that the work is really on `main`: `git branch -r --contains <tip>` should list `origin/main`.
- Delete a stack's branches only once that check passes.

## Bot design system status (2026-10-15)
- Done: panel layout for commands and for everything the bots post on their own (result post with score card + field view, match-night
  and RSVP posts with a banner, reminders, DMs with a stripe colour by type, uptime alerts, EA patch notes, private errors as steel notices).
- The result post is queued by `scripts/fetch.mjs` (`NOREX_DEFER_RESULTS`) and sent by `scripts/post-results.mjs` after the cards are drawn.
- Icon set: `bot/iconset.mjs` → uploaded as the bot's own emoji by `bot/ensure-emojis.mjs` (bot.yml) → `bot/icons.js` (`it()` / `ic()`).
  Positions icons (GK, CAM …) are not drawn yet.
- Banners (jail, wheel, discovery, matchnight) are fixed pictures in `scripts/cards.mjs` – the Worker can't draw per-member images.
- Norex DJ (`dj/`) merged into main 2026-10-15; its YouTube WEB client fails now and then and the self-heal script recovers it.
- Still to do: live check on a real server, then open the `fun`, `discoveries`, `watchlist`, `memberLive` flags to members.

Next on the bot side: features 1–4 above on the site (web side), `POST /api/me/prefs`, then music.

## Issue tool recordings (web side touched bot/ with the owner's OK, PR #41)
`bot/issues.js` (+ 2 route lines in `members.js`, 1 cron line in `worker.js`): `POST/GET /api/issues/recording` (raw video → MEDIA R2 `issues/<session>/<n>.<ext>`),
`GET /api/issues`, `POST /api/issues/status`, and `issueSweep` deleting fixed/wontfix reports (and videos) 24 h after they were marked. No migration. Tests: `tests/issuesrec.test.mjs`.
