# Plan: learning from proclubstracker.com (PCT) and going past it

Source: `PLANNING/RESEARCH-proclubstracker.md` (rea capture, 2026-10-15). Read that first for the endpoints and the feature list.
Status: **plan only, nothing built.** Needs Mike's go on the open questions in section 8.

## 1. How deep is PCT's "intelligence"?

| Level | What PCT free gives | What PCT+ adds | Norex today |
|---|---|---|---|
| Per player, per game | Rating, goals, assists, MOTM per match; match detail tabs (Scoring/Passing/Defending/Discipline); charts of rating, tackles, pass %, goal contributions over last 5/10 | Player impact incl. keepers, advanced stats (dribbles, second assists), creativity ranking | Full per-player stat line for every match archived (321 matches since 2026-09-24); match pages |
| Per player, over time | Averages, 10-season goals sparkline, form graph, power rank (last 5), carry score, stat-padder index, clutch rating | Same, with kept history | Player pages, leaders, badges, `bot/ratings.js`, awards |
| Per team | Record, SR, streak, goals/game, defensive partnerships, goal partnerships, templated "areas to improve" tips | Team profile /100, match control, modelled goals and expected points, session grade | Club stats, H2H compare, `bot/predict.js`, Club Intelligence (`bot/insights.js`) |
| Narrative breakdown | None. Numbers, ranks and canned tip text (picked by thresholds) | Session report: one grade, "what to fix first", one line per player (only marketing copy seen) | `bot/statinsights.js`: LLM writer with a number checker. Already ahead on prose |

Verdict: PCT does **not** do a full per-game analysis. Its free tier is descriptive (rank, average, chart) over EA's last 10 matches, with canned tips. The only per-session deeper analysis is behind PCT+, and I could not see it. Their real moat is kept history, ads-free pages and shareable cards, not clever maths. Norex can beat the analytics because it has data PCT's free users never get.

## 2. Key finding: Norex data is richer than what PCT sells

Every archived match in `data/matches/*.json` already has, for **both clubs' players**: `dribbles`, `secondassists` (the "advanced stats EA never shows" PCT+ charges for), `archetypeid`, `secondsPlayed`/`gameTime`, `realtimeidle`, `goalsconceded`, all keeper save types, `passattempts`/`passesmade`, `tackleattempts`/`tacklesmade`, `shots`, `redcards`, `mom`, `rating`, `SCORE`. Club side: `season_id`, `winnerByDnf`, opponent name and kit. `scripts/fetch.mjs` keeps this forever; PCT keeps nothing for free users. So "keep your history" is already a Norex feature, and the first marketing line.

## 3. Where each feature goes

Ownership follows `PLANNING/BOT-SITE.md`: web side owns `next/**`, `web/**`, `scripts/build.mjs`; bot side owns `bot/**`, `scripts/cards.mjs`.

| Feature (PCT name) | Web side | Bot side (ask first) | Data it needs | Flag |
|---|---|---|---|---|
| Insight engine (shared maths) | new `scripts/lib/insights/*.mjs` (pure functions over `data/matches`), build writes `site/api/insights.json` | later reuse as fact packs in `bot/statinsights.js` | match archive | `proInsights` |
| Form graph, match-by-match charts | chart widgets in `next/lib/widgets.mjs` (reuse `scripts/charts.mjs`) on `next/pages/stats.mjs` and player pages | none | per-match player rating, tackles, pass %, G+A | `proInsights` |
| Power rankings (weekly) | new block on stats page | Monday leaderboard post (PCT bot does this) | last 5 games, rank deltas vs previous 5 | `proInsights` |
| Defending / passing / goal partnerships | `next/pages/stats.mjs` tabs; player pairs from shared matches | none | per-match players, goals conceded, assists | `proInsights` |
| Clutch, carry, stat-padder | same | none | rating by match margin; see section 6 for privacy | `proFun` (owner first) |
| Fun cards (Fraud, Red Flags, share image) | card pages + share image | `scripts/cards.mjs` draws PNG, `/fun` command | derived above | `proFun` |
| Plan your next game | extend existing builder/tactics (`next/pages/tactics.mjs`) | `bot/lineuprec.js` already exists | squad + formation data | existing |
| Session report | session grouping in build; page per session | auto-post after a night, `bot/matchcard.js` style | matches within 90 min of each other | `sessionReport` |
| Search any club | `club.mjs` already renders any tracked club; add client search | `bot/clublookup.js` exists | `data/clubs/*`, EA name search | `clubSearch` |
| Transfer Window | feature fits `apply.html`/trials | `bot/trials.js` already runs trials | EA member stats for free agents | later |

Adaptation needed: today the site is built statically at fetch time (`scripts/build.mjs`). PCT computes in the browser from one payload. Norex should keep build-time computing (matches already on disk) and ship small JSON per page. That keeps pages fast and avoids sending 228 KB per visitor.

## 4. Requirements and rules for every insight
- Always show sample size ("based on 9 matches"). Hide rankings under a minimum (PCT uses 5 games; use that).
- Rating is meaningless for a 5-minute cameo: weight by `secondsPlayed`, drop under 30% of match.
- Opponent strength: compare against opponent SR when known (`data/clubs`, `data/world.json`).
- Respect hide-me requests (`overrideHidden`, P5.6) in every new card, ranking and share image.
- Season boundaries: tag everything with `season_id`. FC27 wipes EA's numbers; Norex's archive must not.
- Insights that call a member out by name (Fraud, Ghost, L Merchant) are opt-in, members-only, off by default. A club of friends is not a stat site; see open question 1.
- Every figure written by the LLM writer keeps going through the existing number checker.
- Behind flags in `config.json → features`, `owner` first. `node tests/run.mjs` before every push; add a test per metric with a fixture from `data/matches`.

## 5. Mimic PCT's advanced stats tool
Do first, because the data is already there:
1. Creativity ranking: completed dribbles and second assists per 90 (`dribbles`, `secondassists`, `secondsPlayed`). Same as PCT+, free.
2. Ball progressor / carry score: position-aware mix of rating, G, A, clean sheets, tackles, MOTM, win impact (min 5 games). Document the weights on the page, since PCT hides theirs.
3. Defensive rating from matches played in defence or goal, min 5, partnerships by shared matches.
4. Clutch rating: average rating minus career average in 1-goal and drawn games.
5. Match control and "did you deserve it": see idea A below (we can do better than PCT's model).

## 6. Ideas beyond PCT (ranked by wow, with the data that backs each)

A. **Shots on target and finishing, derived.** EA does not give shots on target, but the opposing keeper's `saves` + our `goals` ≈ our shots on target. Gives real finishing %, keeper save %, and a "deserved result" built from shots, shots on target, passes and tackles instead of a black-box model. Data: both clubs' players per match. Sanity check run 2026-10-15: goals + opposing saves is at most the team's recorded shots in 606 of 642 team-sides (94%). The 36 exceptions (own goals, missing players or EA counting rules) must be explained before this ships.

B. **On/off impact.** Team goal difference per match with player X in vs out, with sample sizes and a confidence note. Rating-based "carry" scores reward stat padding; on/off shows who the team actually wins with. Also pair on/off (A+B together vs apart) = a real chemistry map. Data: lineups per match. Needs enough matches; show "not enough data" honestly.

C. **Opponent scouting dossier.** Before a match, for a named club: their usual squad, danger men, average rating by line, how they lose, our record against them. Uses `data/clubs/*.json` (discovered clubs) and past meetings in the archive. Also `/scout <club>` in Discord. Nobody on the free trackers does a pre-match brief.

D. **Session engine.** Group matches by night (gap > 90 min). Per session: grade, record, who played, performance fade by game number ("you drop after game 5"), best kickoff hour and weekday, best 5-a-side combination. PCT+ sells a session grade; fade and best-hour are not on their page.

E. **Role fingerprint.** Compare each player's registered position and `archetypeid` with how they actually play (tackles/90, dribbles/90, shot share, pass volume). Flags "listed CM, plays like a destroyer" and suggests where they fit the squad. A manager would use this for the next lineup.

F. **Key-man risk.** Club win rate with and without each top player, plus who covers. Tells a manager who the club cannot afford to lose.

G. **Idle and early-leaver detection.** `realtimeidle` and `secondsPlayed` vs game length separate "AFK" from "dropped connection" from "joined late". Fixes unfair ratings and mutes false Ghost flags.

H. **Win probability and lineup optimiser.** Elo-style win chance from our SR vs opponent SR, calibrated on our own matches, then "best XI of whoever RSVP'd tonight" (Discord RSVP exists in `bot/events.js`). Builds on `bot/predict.js`; check what it already does before starting.

I. **Career vault across FC versions.** Per-player all-time stats that survive the FC27 wipe, with the season tag. PCT's author says the wipe erases everything; Norex already stores it.

What EA staff might notice: A (derived shots on target from opposing keeper saves, using only EA's own fields) and B (on/off chemistry from public match data). Neither needs anything EA does not already publish.

## 7. Suggested order
1. `scripts/lib/insights/` with creativity, carry, clutch, defence and tests (one PR, web side). Output `site/api/insights.json`.
2. Stats-page tabs and player-page charts behind `proInsights`.
3. Idea A (derived shots on target) and D (sessions) because they are cheap and visible.
4. Fun cards and share images (needs bot side for `scripts/cards.mjs`).
5. Scout dossier C, then B and E once enough matches exist (about 321 now, over three weeks).

## 8. Open questions for Mike
1. Should name-and-shame cards (Fraud, Red Flags, Ghost) exist at all, and for whom? Recommendation: managers only, opt-in for members.
2. Does Norex copy PCT's rating-based power rank, or lead with on/off (B)? Recommendation: both, with B as the headline.
3. Do you want club search for any club on the public site now, or later? It adds EA traffic; the proxy on PCT's side caches `public`.
4. Sign-off to message the bot-side session about `/scout`, `/session` and card art.
