-- Notification centre (P7.1): one row per recipient. dm = NULL (site only) | queued | sent | failed | skipped.
-- ack = 1 → announcement/rule that repeats (banner + up to 3 daily DM reminders) until acknowledged.
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT, -- site-relative, e.g. members.html#manager
  ack INTEGER NOT NULL DEFAULT 0,
  at INTEGER NOT NULL,
  read_at INTEGER,
  ack_at INTEGER,
  dm TEXT,
  dm_at INTEGER,
  reminders INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications (user_id, id);
CREATE INDEX IF NOT EXISTS notifications_dm ON notifications (dm);

-- Per-member settings: prefs = JSON { type: 'dm' | 'site' | 'off' }. dm_channel caches the bot's DM channel.
CREATE TABLE IF NOT EXISTS notify_prefs (
  user_id TEXT PRIMARY KEY,
  prefs TEXT NOT NULL DEFAULT '{}',
  dm_channel TEXT,
  dm_failed_at INTEGER, -- last time Discord refused a DM (member has DMs from server members off)
  updated INTEGER
);

-- Club & privacy requests (P5.6): kind = club (track another club) | hide (hide me from the site).
-- Approved rows feed GET /api/overrides, which the site build reads next to config.json.
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | undone
  subject TEXT NOT NULL, -- club name or gamertag
  club_id TEXT,
  note TEXT,
  contact TEXT, -- Discord username (guests)
  by_id TEXT,
  by_name TEXT,
  by_avatar TEXT,
  ip_hash TEXT,
  at INTEGER NOT NULL,
  decided_by TEXT,
  decided_at INTEGER,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS requests_status ON requests (status, at);
