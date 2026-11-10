# Bot split: Stats · Matchday · Rush (design, 2026-11-10)

Status: **design only, nothing built.** Owner of `bot/**` is the Bot session (see `BOT-SITE.md`); this file is the brief
for it. Build waves are at the bottom.

## The idea

One bot per job, so each server channel, command list and DM stream has a clear owner:

| Bot | Job | Players see |
|---|---|---|
| **Norex Stats** (today's main bot, kept) | Anything that reads numbers: per player, per team, insights, leaderboards, club/profile lookups, awards, plus the server tools and member features | `/player`, `/club`, `/top`, `/compare`… |
| **Norex Matchday** (new) | Setting up and running one 11v11 match day: league, playoffs, friendlies, tournaments, VPG | `/host`, `/availability`, `/lineup`… |
| **Norex Rush** (new) | 5v5 Rush: logged by members (EA exposes no Rush data, see ROADMAP R0.1), LFG, queue | `/rush log`, `/lfg`, later `/queue` |

## How "a new bot" works here (the cheap way)

A Discord *application* is just an identity: its own name, avatar, token, public key and slash-command list. It does **not**
need its own server or database. So:

- Create two more applications in the Discord developer portal (**Norex Matchday**, **Norex Rush**). Invite to the server like the main bot.
- Keep **one Worker** and one D1/KV. Add routes `POST /discord/stats` (today's `/interactions`, kept as an alias), `/discord/matchday`, `/discord/rush`.
  Each route verifies with *its own* public key and posts with *its own* token (`MATCHDAY_*`, `RUSH_*` secrets next to the existing ones).
- "Moving a command" = changing which app *registers* it (`commanddefs.js` gets an `app: 'stats'|'matchday'|'rush'` field and `buildRegistration(app)`).
  The handler code does not move, so nothing is rewritten and nothing in D1 changes. The Boardroom command table (`botcommands.js`) keeps working: one table, grouped by app.
- Why not separate Workers: shared D1/KV, shared design system (`ui.js`, `icons.js`), one deploy, one test run. The DJ bot is separate only because voice needs a long-running VM.
- Cloudflare free-plan caps (DM/push/live throughput, see memory) are per account, so a second bot does **not** buy extra throughput. Fine for now.

## Command map (from `commanddefs.js` today)

**Matchday** (set up and run the day): `/host` (session or friendly), `/schedule`, `/nextevent`, `/availability`, `/lineup`,
`/remind`, `/reminders`, match-night posts + RSVP buttons, DM pushes and the reminder queue (`events.js`, `reminders.js`,
`host.js`, `notify.js` event kinds), the recommended-lineup draft (`lineuprec.js`), `/trial`, `/panel` approvals that are event-related.
Plus new: `/matchday create` (type: league · playoff · friendly · tournament · VPG), `/checkin`, `/status` (who is in/out/maybe, what is missing).

**Stats** (read the numbers): `/club`, `/last`, `/results`, `/player`, `/compare`, `/top`, `/stat`, `/opponent`, `/insight(s)`,
`/leaderboard`, `/profile`, `/member`, `/awards`, `/points`, `/avatarcard`, `/burner`, `/motm`, `/track`, `/search`.

**Rush**: `/rush log` and the rush leaderboard/profile views (data is member-logged, `rush_matches`), the Rush squad builder,
Rush events keep their RSVP (`event_rsvps.rush_positions`) but are *created* from Matchday for now. Added later: `/lfg`, `/queue`.

**Stays on the main bot** (not stats, not match day): server tools (`/purge`, `/tag`, `/welcome`, `/pingroles`, `/leavelog`),
`/streamalerts`, `/watch*`, `/share`, `/discoveries`, `/jail`, `/wheel`, `/trivia`, `/feedback`, `/suggest`, `/announce`, `/syncroles`, `/exportcontent`.
Rename the main bot later if "Stats" is too narrow; the split above is by *job of the command*, not by name.

**Transition:** register each moved command on its new bot first, keep it on the old one for ~2 weeks with a one-line
"this moved to @Norex Matchday" reply, then remove. Nobody loses a command overnight.

## Request 1: preferred position on check-in

When someone taps ✅ in / available for an event, they also pick **the position they want to play that night**
(GK · CB · LB/RB · CDM · CM · CAM · LW/RW · ST, single or up to 2, optional).

- Storage: new column `event_rsvps.pref_pos` (JSON, ordered) next to `positions` / `rush_positions`; migration owned by the Bot side (next number after `0056`; check `main` first).
- Discord: after the ✅ button, an ephemeral select menu "Where do you want to play?". Site: same picker in the RSVP sheet.
- It is **a preference, never a promise.** Managers still publish the lineup.

## Request 2: recommended lineup, layered ranking

Today `lineuprec.js` fills slots greedily by stats rating only. New order of priority, strictly in this order:

1. **Level**: stats rating (the existing per-player read from `aiinsights.js`).
2. **Commitment**: how often they actually play (turn-up rate over their last N events, from check-ins vs RSVPs; no-shows count against).
3. **Tiebreaker**: who ticked in first *for that position*.

Position preference is the *claim* each player makes; the layers above settle clashes over it:

1. Each slot is offered to the players who asked for that position, ranked by 1 → 2 → 3.
2. Players who lose a clash fall to their **next choice** in this order: their second pick that night → positions in their profile (primary, secondary, third) → the positions they have actually played most (from match history) → best-fit group from stats (today's behaviour).
3. Anyone still unplaced fills leftover slots best-rated first (nobody sits out over a mismatch, same as today).
4. Each placement carries a short reason ("asked ST, highest rating of 3 strikers", "lost ST clash → CAM from profile") so managers can see why and override.

Rush has no stats, so level is replaced by the profile/self-rating and logged rush games; commitment and tiebreak stay the same.
Tests to add: clash with 3 strikers for 1 slot, preference vs higher-rated non-asker, no-show history demotes, tie broken by check-in time, no preference = today's output.

## Rush bot, later (put in the pipeline, not built now)

- **Queue manager**: Mike has an earlier version in his Discord developer app (built with Claude / Google Cloud). **Needs the code or an export dropped into the repo** (or the app's command list pasted) before design; the portal is not reachable from here.
- **Availability marker / LFG**: a player marks "available for Rush", the bot posts to the Rush channel tagging `@here` / the Rush role (never blanket `@everyone`; honour the muted-alerts setting via `notify.js` `mutedFor()`). Buttons: "I'm in" / "later". Auto-expires (default 60 min). Add a short cooldown per player so it can't be spammed, and route it through the Notification Center registry.
- Both go behind flags (`rushQueue`, `rushLfg`, default `owner`) per BOT-SITE rule 6.

## Pipeline (waves)

| Wave | What | Touches | Model |
|---|---|---|---|
| **MB0** | Multi-app plumbing: `app` field in `commanddefs.js`, per-app verify/token routes, registration per app, Boardroom grouping, tests. No command moves yet | `bot/worker.js`, `commanddefs.js`, `botcommands.js`, `register.mjs` | Opus |
| **MB1** | Matchday bot goes live: move the command set above, transition replies, `/matchday create` types | `bot/events.js`, `host.js`, `commanddefs.js` | Sonnet |
| **MB2** | Preferred position: migration, Discord select, site picker (web side), show it in `/availability` + event post | `bot/events.js`, migration, `next/**` | Sonnet |
| **MB3** | Layered lineup recommender (rules above) + reasons + tests | `bot/lineuprec.js` | Opus |
| **MB4** | Rush bot goes live: move rush commands | `bot/commanddefs.js`, rush files | Sonnet |
| **MB5** | Rush LFG / availability marker | new `bot/rushlfg.js` | Sonnet |
| **MB6** | Queue manager (needs Mike's earlier code) | new `bot/rushqueue.js` | Opus |

Order is MB0 → MB3 → MB1/MB2 in parallel lanes → MB4 → MB5 → MB6. MB3 can ship on the current bot before the split, since it only changes `lineuprec.js`.
