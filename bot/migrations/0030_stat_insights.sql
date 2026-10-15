-- BE9 Insights engine (board 12): per-stat fact-pack insights, written by an LLM constrained to numbers
-- actually present in the fact pack (the "number checker" in bot/statinsights.js). `sources` stores the
-- fact pack JSON itself, so a follow-up question (POST /api/insights/ask) is answered from the same
-- facts without recomputing them. Distinct from the `insights` table-less Club Intelligence feature
-- (bot/insights.js, board 13) and the KV-cached per-player note in bot/aiinsights.js (P11.14).
CREATE TABLE stat_insights (
  key TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  watch TEXT,
  sources TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'member',
  at INTEGER NOT NULL
);

CREATE TABLE stat_insight_feedback (
  key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (key, user_id)
);

-- Rate-limits POST /api/insights/ask (a handful of free-form questions per member per day).
CREATE TABLE stat_insight_asks (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  question TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX idx_stat_insight_asks_user_at ON stat_insight_asks (user_id, at);
