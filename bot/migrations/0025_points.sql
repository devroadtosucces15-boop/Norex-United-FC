-- P11.3 point system: a running total per member (no season reset), broken down by category
-- (match | attendance | community | behaviour) via points_log.
ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS points_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS points_log_user ON points_log (user_id, at);
