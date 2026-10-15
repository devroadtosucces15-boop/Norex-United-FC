-- Tags & community badges (P2.3) and achievements (P2.3 / P4.3).
ALTER TABLE profiles ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'; -- JSON [{t: text, e: emoji, c: colour key}] – self tags, max 8

-- A badge one member gives another: a curated kind or 'custom' with its own text. One per (giver, member, kind).
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_id TEXT NOT NULL,
  from_id TEXT NOT NULL,
  from_name TEXT,
  from_avatar TEXT,
  kind TEXT NOT NULL,
  text TEXT, -- custom badges only
  at INTEGER NOT NULL,
  removed_at INTEGER, -- taken back by the giver, or removed by the member / a manager
  removed_by TEXT
);
CREATE INDEX IF NOT EXISTS badges_to ON badges (to_id, removed_at);
CREATE INDEX IF NOT EXISTS badges_from ON badges (from_id, at);

-- Achievements a member has unlocked (computed from stats + events; stored the first time they're reached).
CREATE TABLE IF NOT EXISTS achievements (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  at INTEGER NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0, -- 1 once the member has seen the unlock toast
  PRIMARY KEY (user_id, id)
);
