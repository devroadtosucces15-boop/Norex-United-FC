-- Member live alerts (bot/memberlive.js): who is on air right now, and whether the "is live" post went out for this stream.
CREATE TABLE IF NOT EXISTS member_live (
  user_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  since INTEGER NOT NULL,
  at INTEGER NOT NULL,
  announced_at INTEGER
);
