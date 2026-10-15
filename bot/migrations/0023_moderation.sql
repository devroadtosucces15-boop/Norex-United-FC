-- P8.3 moderation & audit: warn/mute members, track role changes over time.
ALTER TABLE users ADD COLUMN muted_until INTEGER;
ALTER TABLE users ADD COLUMN warnings TEXT NOT NULL DEFAULT '[]'; -- JSON array of {at, by, reason}

-- Discord role syncs at login; this is the history of a member moving between tiers.
CREATE TABLE IF NOT EXISTS role_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  from_role TEXT,
  to_role TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS role_history_user ON role_history (user_id, at);
