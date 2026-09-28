-- Trials funnel (P1.5), player recommendations (P5.5) and private manager notes (P5.7).
-- status: recommended (a member's scouting tip) | applied | trialling | signed | released | declined
-- source: form (public mini-form) | discord (added by a manager from Discord "Apply to Join") | scout | manual
CREATE TABLE IF NOT EXISTS trials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  ea_id TEXT NOT NULL,
  discord TEXT, -- Discord username to contact
  platform TEXT,
  positions TEXT NOT NULL DEFAULT '[]', -- JSON array
  clips TEXT, -- https link
  note TEXT, -- applicant's message or the scout's reason
  status TEXT NOT NULL,
  player TEXT, -- EA player key when we've played them (linked player page)
  by_id TEXT, -- recommender / manager who added it (NULL for the public form)
  by_name TEXT,
  by_avatar TEXT,
  ip_hash TEXT, -- public form rate limit only
  at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS trials_status ON trials (status, updated_at);
CREATE INDEX IF NOT EXISTS trials_by ON trials (by_id, at);
CREATE INDEX IF NOT EXISTS trials_ip ON trials (ip_hash, at);

-- Decision history + trial session results per trial card. kind: status | session
CREATE TABLE IF NOT EXISTS trial_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trial_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  status TEXT, -- kind=status: the new status
  date TEXT, -- kind=session: YYYY-MM-DD
  result TEXT, -- kind=session: e.g. "W 3–1 vs Rivals"
  rating REAL, -- kind=session: 1–10
  detail TEXT,
  by_name TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS trial_events_trial ON trial_events (trial_id, id);

-- Private manager notes. kind: member (Discord user id) | player (EA player key) | trial (trial id)
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'general', -- strength | issue | trial | general
  text TEXT NOT NULL,
  by_id TEXT NOT NULL,
  by_name TEXT,
  by_avatar TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notes_subject ON notes (kind, subject, id);
