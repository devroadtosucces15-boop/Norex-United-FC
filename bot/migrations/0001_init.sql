-- Member data (P0.3). Replaces the KV documents users / claims / activity / profile:* / avail:* / votes:*.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  tag TEXT,
  admin INTEGER NOT NULL DEFAULT 0,
  first_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  logins INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  bio TEXT NOT NULL DEFAULT '',
  positions TEXT NOT NULL DEFAULT '[]', -- JSON array
  platform TEXT NOT NULL DEFAULT '',
  updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  user_id TEXT PRIMARY KEY,
  player TEXT NOT NULL,
  player_name TEXT NOT NULL,
  status TEXT NOT NULL, -- pending | approved | rejected | unlinked
  at INTEGER NOT NULL,
  name TEXT,
  avatar TEXT,
  decided_by TEXT,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS claims_player ON claims (player, status);

CREATE TABLE IF NOT EXISTS claim_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  player TEXT,
  by_name TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS claim_history_user ON claim_history (user_id, id);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  user_id TEXT,
  name TEXT,
  avatar TEXT,
  type TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS activity_at ON activity (at);

CREATE TABLE IF NOT EXISTS availability (
  date TEXT NOT NULL, -- YYYY-MM-DD
  user_id TEXT NOT NULL,
  status TEXT NOT NULL, -- yes | maybe | no
  name TEXT,
  avatar TEXT,
  at INTEGER NOT NULL,
  PRIMARY KEY (date, user_id)
);

CREATE TABLE IF NOT EXISTS votes (
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  player TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  at INTEGER NOT NULL,
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
