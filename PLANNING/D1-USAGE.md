# D1 usage: what burns rows and what was done about it

Written 2026-10-15 from the code only (no Cloudflare dashboard access). Free-plan daily limits assumed: **5,000,000 rows read**, **100,000 rows written**.
Numbers below are estimates built from formulas, so check them against the dashboard (see the end). `bot/` line numbers are for `main` before this change.

D1 bills *rows scanned*, not rows returned. A query with no usable index reads the whole table every time it runs, which is what almost all of this is.

## Ranked by estimated rows read per day

| # | Cause | Where | Rows read per day (formula, then an illustrative figure) | Fix in this PR |
|---|---|---|---|---|
| 1 | **Chat badge poll scans every message.** The header polls `GET /api/chats` every 60 s in every signed-in tab (`next/static/header.js:146`), every 6 s on the Messages page (`web/messages.js:364`). The unread count (`bot/chat.js:111-112`) and the "last message" query (`chat.js:110`) have no index on `at` / `removed`, so each poll reads every message in every chat the member is in. | `chat.js:102-118`, index only on `(chat_id, id)` (`0022_chats.sql`) | tab-minutes × 2 × messages-in-your-chats. 20 tab-hours a day and 2,000 messages: **≈ 4.8M** | Migration 0054 adds `(chat_id, removed, at)` and `(chat_id, removed, id)`; last-message query rewritten as one index seek per chat. Plans checked with `EXPLAIN QUERY PLAN`. |
| 2 | **Notification cron scans the whole table.** Every 10 min the "announcements waiting for Got it" query filters on `ack`, `ack_at`, `reminders`, none indexed. The hourly housekeeping (`ROW_NUMBER() OVER (PARTITION BY user_id)` and the 90-day delete) scans it twice more. | `notify.js:200-208` | 144 × N + 24 × 2 × N, N = rows in `notifications` (kept ≤ 200 per member). N = 10,000: **≈ 1.9M** | Partial index `notifications_ack_open` (only open acknowledgements are indexed, so ordinary notifications cost no extra write). Housekeeping now runs once a day at 03:00 UTC instead of hourly. |
| 3 | **Public portraits list, uncached, on page views.** `GET /api/cards/portraits` is public, `cors()` sets `no-store` (`members.js:94`), and the query scans `card_requests` with a `claims` join. Called by `web/playerportraits.js:42` and `next/static/cards.js:62`. | `cardstudio.js:453-458` | page views × rows in `card_requests`. 2,000 views, 500 requests: **≈ 1M** | Rows kept in the edge Cache API for 60 s; index `card_requests_status (status, published)` for the cold path, the Card Studio cron and `faces.js:24`. |
| 4 | **Flag overrides read on every API request.** `loadFlagOverrides` selects the whole `flag_overrides` table before any route runs, including public GETs and every poll. | `members.js:315`, `roles.js:166` | requests × flags overridden. 20,000 requests, 30 overrides: **≈ 600K** | 15 s in-isolate cache for the website API; a Boardroom save clears it at once, other isolates see an edit within 15 s. Discord keeps the uncached read, so its behaviour is untouched. |
| 5 | Smaller scans on the 10-minute cron (not changed): `scoreDue` scans `events` and `predictions` (`predict.js:60-61`); `cleanBonus` scans `users` (`profanity.js:107`); `memberWatch` reads all of `guild_members` (`servertools.js:123`); `refreshStatInsights` does one hash read per registry key (`statinsights.js:287-291`, ~70 keys, flag `statInsights`). | | each ≈ 144 × table size, so 20K–60K a day for a club this size | Left alone; they only matter if those tables grow past a few thousand rows. |

## Rows written per day

Writes are probably **not** what is at 90%. Estimates, none near 100K at this club's size:

- Presence stamp (`social.js:28`, every authed request): rewrites the `users` row plus the `users_seen` index entry, so 2 rows. With a 60 s poll and a 60 s throttle it fired on almost every poll. Now throttled to 150 s (online window is 5 min, so nothing visible changes): about a third of the writes.
- `memberLiveCron` rewrote its `meta` cursor every 10 min even when it had not moved (`memberlive.js:51`): 144 writes a day, now skipped when unchanged.
- Activity log: insert plus `activity_at` index plus a trim delete per logged action (`members.js:224-225`). Proportional to actions, small.
- Notification fan-out: one row (+ 3 index entries) per recipient per announcement. Proportional to announcements × members.

## PR #41 (issue recorder and auto-delete)

`issueSweep` (added to `worker.js` scheduled() on that branch) runs every 10 min: `WHERE status IN ('fixed','wontfix') AND updated_at < ?`. The existing `(status, created_at)` index limits it to fixed or won't-fix rows, which are deleted after 24 h, so it reads a handful of rows. `issueList` reads at most 300 rows per call. Neither is a meaningful cost. Not touched here: that PR's files are separate from this one's edits (no conflicting hunks with `issues.js`/`worker.js`; `members.js` has two small, separate edits).

## Not D1

Durable Objects (`ChatRoom`, `HubRoom`, `ClubRoom`), KV, R2 and Workers AI have their own quotas. Live presence and chat sockets do not touch D1.

## What to look at in the Cloudflare dashboard to confirm

1. **Workers & Pages → D1 → norex database → Metrics.** Compare *Rows read* and *Rows written* for the last 24 h. Reads are the likely culprit (limit 5M/day); writes should sit far below 100K.
2. Same page, **Queries** (top queries by rows read) if your plan shows it. Expect the `chat_messages` unread count and the `notifications ... ack = 1` query at the top. If either shows up, causes 1 and 2 are confirmed.
3. `wrangler d1 insights norex-members --sort-type sum --sort-by reads --limit 10` gives the same ranking from the CLI.
4. Row counts to size the estimates: `SELECT COUNT(*) FROM chat_messages; SELECT COUNT(*) FROM notifications; SELECT COUNT(*) FROM card_requests; SELECT COUNT(*) FROM flag_overrides;`
5. After deploying, run migration 0054 (`wrangler d1 migrations apply`) and watch Rows read over the next 24 h.

## Ideas not done (would change behaviour or need the web side)

- Header poll: 60 s → 120 s or "only when the tab is visible" (`next/static/header.js:146`, web side). Halves cause 1 even without the index.
- Switch the Messages page poll (6 s) to WebSocket-only, which the code already supports.
- Upgrade to Workers Paid: D1 then includes 25 billion rows read a month, which makes the limit a non-issue.
