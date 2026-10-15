-- Discoveries (bot/discoveries.js): member tips that a manager approves, and who found each one useful.
CREATE TABLE IF NOT EXISTS discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  approved_by TEXT,
  at INTEGER NOT NULL,
  decided_at INTEGER,
  discord_at INTEGER
);
CREATE INDEX IF NOT EXISTS discoveries_status ON discoveries (status, at);
CREATE TABLE IF NOT EXISTS discovery_useful (
  discovery_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (discovery_id, user_id)
);
