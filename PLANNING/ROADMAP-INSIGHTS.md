# Roadmap: Insights, banter cards and scouting

Separate from the platform roadmap (`ROADMAP.md`). Source ideas: `PLANNING/PROCLUBS-TRACKER-PLAN.md` (placement and reasoning) and `PLANNING/RESEARCH-proclubstracker.md` (what the competitor does).
**Size:** S = part of a session · M = one session · L = 2+ sessions. **Status:** ☐ todo · ◐ in progress · ☑ done.
**Side:** W = web (`next/**`, `web/**`, `scripts/build.mjs`, new `scripts/lib/insights/`), B = bot (`bot/**`, `scripts/cards.mjs`; ask via `BOT-SITE.md` first).
Every item ships behind a flag in `config.json → features`, `owner` first. `node tests/run.mjs` before every push; each metric gets a test with a fixture from `data/matches`.

## Ground rules (apply to every item)
1. Show the sample size ("based on 9 matches"). No ranking under 5 games.
2. Weight ratings by `secondsPlayed`; ignore appearances under 30% of the match.
3. Tag by `season_id` so the FC27 wipe never mixes numbers.
4. Honour hide-me requests (P5.6) and the banter opt-out (I2.1) in every card, ranking and share image.
5. Banter cards are never posted automatically. They are made on demand (site button or Discord command) by a member, and show only members of this club.
6. Wording is playful and about the stat, not the person. See the naming table in I2.1.
7. Written text keeps going through the number checker in `bot/statinsights.js`.

## I0 – Foundations
| ID | Item | Size | Side | Depends | Status | Done when |
|---|---|---|---|---|---|---|
| I0.1 | Insights module: pure functions over `data/matches`, output `site/api/insights.json` (per player, per match, per team, per session) | M | W | – | ☐ | Fixture tests pass; JSON schema documented in this file |
| I0.2 | Data audit: explain the 36 team-sides where goals + opposing saves > shots; define minutes weighting; use `realtimeidle`/`gameTime` to flag AFK and early leavers | S | W | I0.1 | ☐ | Written rules plus tests; derived-shots rule confirmed or dropped |
| I0.3 | Flags and privacy: add `proInsights`, `bantercards`, `sessions`, `scout` flags (owner first); banter opt-out per member; hide-me honoured | S | W + B (profile field) | – | ☐ | Flag off = nothing renders; opted-out member never appears |

## I1 – Match the tracker's free features
Each is computed at build time from the archive, so pages stay fast and no per-visit EA call is needed.
| ID | Item (PCT name) | Size | Side | Depends | Status | Done when |
|---|---|---|---|---|---|---|
| I1.1 | Form graph + match-by-match charts (rating, tackles, pass %, goal contributions; last 5/10) | M | W | I0.1 | ☐ | On stats page and each player page |
| I1.2 | Match detail tabs: Scoring, Passing, Defending, Discipline, Formations | M | W | I0.1 | ☐ | On `matches/<id>.html` |
| I1.3 | Defensive ratings (min 5 matches in defence/goal) + best and other partnerships | M | W | I0.1 | ☐ | Method text shown on page |
| I1.4 | Passing insights: accuracy rank, volume passers, per-player trend | S | W | I0.1 | ☐ | |
| I1.5 | Goal partnerships (best duos, passenger duos) | S | W | I0.1 | ☐ | |
| I1.6 | Weekly power rankings with risers/fallers (last 5 vs previous 5) | S | W | I0.1 | ☐ | |
| I1.7 | Clutch (rating in 1-goal and drawn games, min 5) | S | W | I0.1 | ☐ | |
| I1.8 | Carry score (position-aware; weights published on the page) | M | W | I0.1 | ☐ | |
| I1.9 | Stat-padder index | S | W | I1.8 | ☐ | Reads as "padding index", not an accusation |
| I1.10 | Player head-to-head | S | W | I0.1 | ☐ | |
| I1.11 | Creativity ranking: completed dribbles and second assists per 90 (PCT+ feature, free here) | S | W | I0.1 | ☐ | Uses `dribbles`, `secondassists`, `secondsPlayed` |
| I1.12 | Improvement tips by position (templated, plus the existing LLM writer for the longer version) | M | W + B | I1.3 | ☐ | |
| I1.13 | Plan-your-next-game extension (formation + fill from squad + share image) | M | W | – | ☐ | Builds on `next/pages/tactics.mjs` |

## I2 – Banter cards (made on demand, never auto-posted)
| ID | Item | Size | Side | Depends | Status | Done when |
|---|---|---|---|---|---|---|
| I2.1 | Banter engine: opt-out, member-only, share image, wording table below | M | W | I0.3, I1.8 | ☐ | Member can opt out; no auto-post anywhere |
| I2.2 | Cards: Big Talk Small Output, Main Character, Missing Persons, Loss Collector, Self-Praise Index | M | W | I2.1 | ☐ | Each card shows its formula and sample size |
| I2.3 | "Dressing Room Gossip" summary (4–5 playful flags for the club, pairs with LLM writer) | S | W + B | I2.2 | ☐ | Managers can switch it off |
| I2.4 | Discord `/banter` command that returns a card to the person who asked, not the channel | S | B | I2.2 | ☐ | |

Naming table (original PCT name → Norex wording): Fraud Rating → **Big Talk Small Output**; Ghost → **Missing Persons**; L Merchant → **Loss Collector**; Self-Glazer → **Self-Praise Index**; Main Character stays; Red Flag Detector → **Dressing Room Gossip**; Squad Deadwood → **Bench Warmers' Union**.

## I3 – Sessions and scouting
| ID | Item | Size | Side | Depends | Status | Done when |
|---|---|---|---|---|---|---|
| I3.1 | Session engine: group matches by night (gap > 90 min), session grade, fade by game number, best hour and weekday | M | W | I0.2 | ☐ | |
| I3.2 | Session report page (grade, what to fix first, one line per player) | M | W + B | I3.1 | ☐ | |
| I3.3 | Opponent scouting dossier: usual squad, danger men, rating by line, how they lose, our record vs them | L | W | I0.1, `data/clubs` | ☐ | Works for any tracked club |
| I3.4 | Key-man risk: club results with and without each top player | S | W | I0.1 | ☐ | |

## I4 – Beyond the tracker
| ID | Item | Size | Side | Depends | Status | Done when |
|---|---|---|---|---|---|---|
| I4.1 | Derived shots on target (opposing GK saves + our goals), finishing %, keeper save %, "deserved result" | M | W | I0.2 | ☐ | |
| I4.2 | On/off impact and pair chemistry map (goal difference in vs out) | M | W | I0.1 | ☐ | Shows "not enough data" below threshold |
| I4.3 | Role fingerprint: listed position/`archetypeid` vs how the player plays | M | W | I0.1 | ☐ | |
| I4.4 | Win probability + best XI from tonight's RSVPs | L | W + B | I4.2, `bot/predict.js` review | ☐ | |
| I4.5 | Career vault: all-time stats surviving the FC27 wipe, tagged by season | M | W | I0.1 | ☐ | |
| I4.6 | Opponent-adjusted ratings (weight by opponent SR) | M | W | I0.1 | ☐ | |

## I5 – Discord and reach (opt-in, off by default)
| ID | Item | Size | Side | Depends | Status |
|---|---|---|---|---|---|
| I5.1 | `/scout <club>` and `/session` commands returning a card to the asker | M | B | I3.1, I3.3 | ☐ |
| I5.2 | Monday leaderboard post (managers switch it on; never default) | S | B | I1.6 | ☐ |
| I5.3 | Club search for any club on the site (EA name search, cached) | M | W | – | ☐ |
| I5.4 | Transfer Window board | L | W + B | `bot/trials.js` | ☐ |

## Suggested waves
1. I0.1–I0.3, then I1.11 (quick win), I1.1, I1.6.
2. I1.3–I1.5, I1.7–I1.10, I1.2.
3. I4.1 and I3.1 (cheap and visible), then I2.1–I2.2.
4. I3.2–I3.4, I4.2, I4.3.
5. I5.x, I4.4–I4.6, I1.12–I1.13.

## Open items for Mike
- Confirm the banter naming table above.
- Confirm "never auto-posted" covers scheduled posts such as the Monday leaderboard (I5.2 is off by default).
- OK to message the bot-side session about I0.3, I2.4, I5.1 and card art.
