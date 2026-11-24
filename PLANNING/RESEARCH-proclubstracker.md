# proclubstracker.com teardown (club page, free vs PCT+)

Captured 2026-10-15 with rea (headless Chrome, 4 page loads of /club/80869, plus 1 search GET and 1 club GET). Public data only, no login.
Labels: **[seen]** observed in capture, **[inferred]** my reading, not proven.

## 1. How data is collected
- Next.js app on Vercel. HTML is a shell; the browser then calls its own `/api` **[seen]**:
  - `GET /api/clubs/search?clubName=&platform=` -> body has EA's `allTimeLeaderboard/search` shape (clubId, wins, ties, reputationtier, clubInfo.customKit...). **[seen]** Server proxies EA, caches `public`.
  - `GET /api/clubs/{id}?platform=` (228 KB for NOREX) -> `{clubId, platform, overallStats{44 fields}, memberStats{members[39], positionCount}, matches{league[10], playoff[], friendly[]}, clubInfoData}`. **[seen]** This is exactly EA's `clubs/overallStats`, `members/stats`, `clubs/matches` x3 and `clubs/info`, merged in one call. Same endpoints scripts/fetch.mjs uses. Per-member fields include proOverall, prevGoals..prevGoals10 (last 10 seasons), manOfTheMatch. Per-match player fields: rating, saves, tacklesmade, passesmade, passattempts, shots, mom, secondsPlayed, pos, plus an `aggregate` block.
  - `GET /api/clubs/{id}/history?platform=&limit=100[&before=]` -> `{subscribed:false, access:"none", matches:[], nextBefore:null}` for a non-subscriber. **[seen]** Client pages it (up to 10 pages) via `nextBefore`.
  - `GET /api/replays?clubId=`, `/api/cups/wins`, `/api/cups/next` (next cup, prize, entries), `/api/pct-plus/clubs?clubs=platform:id,...` (which listed clubs are subscribed). **[seen]**
- Switching tabs (Matches/Fun/Analytics/Players) fires **no new requests** **[seen]**: all stats are computed client-side from the one club payload.
- ~190 requests per load, mostly ad-tech (Prebid header bidding, Google Analytics, id syncs). Their own origin is ~6 API calls.

## 2. How "all clubs" works
There is no crawl or club index **[inferred from the above]**. Search is an on-demand proxy of EA's name search; any club ID then loads live from EA through the same proxy. Nothing is stored for free users. The author says the same: "built live from EA's servers... for anyone who types a name in".
Limit: EA only returns the last 10 matches per type, so free users never see more than 10.
Platforms offered: `common-gen5` (PS5/Xbox X|S/PC) and `nx` (Switch).

## 3. Free features
Header: crest, SR (skill rating), W/D/L, win rate, goal diff, goals/game, streak, last-5/10 form strip, favourites star, share button, cup banner (PCT Cup, free entry).
- **Matches tab**: last 10 league/playoff/friendly, scorers and MOTM per match; "Show match details" expands to Match Stats / Player Stats / Formations (Scoring, Passing, Defending, Discipline totals). Formations/some detail is locked ("Unlock with PCT+").
- **Fun tab** (shareable cards): Viral Rankings (Fraud, Main Character, Ghost, L Merchant, Self-Glazer), Red Flag Detector (L merchants, ghosts, fraud ratings, deadwood), Plan Your Next Game (formation picker 4-3-3 etc, fill from squad, randomise, share image; saved on device).
- **Analytics (Beta) tab**: Form Graph (rating per player over last 5/10), Match-by-Match charts (rating, tackles, pass accuracy, goal contributions), Weekly Power Rankings with movers, Defending (defender ratings, tackles/game, clean-sheet %, goals conceded/game, best defensive partnership, improvement tips), Passing Insights (accuracy ranks, volume passers, trend), Goal Partnerships (best duos, "passenger" duos), Mr. Clutch (rating in 1-goal games), Who Carries Who (carry score by position), Stat Padder Detector, Player Head-to-Head.
- **Players tab**: position counts, per-player cards (OVR, avg rating, games, G, A, MOTM, win rate, pass %, shot %, per-game rates, goals over last 10 seasons, tackles, clean sheets), sortable by 12 metrics.
- Club summary text, stat explainer copy, club-vs-club Compare (H2H), Search, Transfer Window (free-agent/vacancy board, data pulled from EA), PCT Cups (pctcups.com).
All of these are derived from fields in the single EA payload. Formulas (power rank, carry score, padding index, fraud rating) are theirs; only descriptions are visible, e.g. carry score "uses rating, goals, assists, clean sheets, tackles, MOTM, win impact, min 5 games", clutch "min 5 games, 1-goal margin or draw".

## 4. PCT+ (GBP 3.99/month per club, covers the whole club, no accounts needed for viewers)
From /pct-plus and lock badges on the club page **[seen]**:
- Session report after every night: grade, what to fix first, a line per player.
- Match control / modelled goals / expected points ("did you deserve that result").
- Team profile: attack, defending, control, ball security scored /100. Player impact (keepers judged on saves, clean sheets).
- Advanced stats EA never shows: completed dribbles, second assists, creativity ranking, ball progressors.
- Position trials with live link; Starting XI poster and matchday poster in club colours.
- Discord bot: hourly results, matchday recaps, Monday leaderboard, /stats.
- **Stored match history from subscription day** (this is the real moat: EA keeps 10), Excel export by season/date range/last session.
- No ads. Payments via Stripe; the payer signs in by email to manage/cancel; locks at month end but keeps stored matches.
How the history works **[inferred]**: a backend job polls EA for subscribed clubs and writes matches to a DB; `/history` returns them only when `subscribed:true`.
Not captured: the PCT+ tab body itself (stuck on "Loading club analytics..." in the free view) and any paid-only API payload.

## 5. What Norex could adopt
Already similar: compare/H2H, match pages, player pages, badges, trials. Missing: Fun/shareable cards (fraud, red flags, power rankings), clutch/carry/padding insights, partnership analysis, club search for any club, Transfer Window, session reports, poster generator, long-term match archive (Norex already archives all home matches in data/matches).
