-- Wave 10: P4.2 community star ratings, P4.4 anonymous feedback, P3.8 predictions game.

-- P4.2: a member's 1–5★ for a NOREX player in an ISO week (key 'YYYY-Www', same weeks as the awards).
-- Changeable until the week ends. Raters stay private (managers see them).
CREATE TABLE IF NOT EXISTS star_ratings (
  week TEXT NOT NULL,
  user_id TEXT NOT NULL,
  player TEXT NOT NULL,
  stars INTEGER NOT NULL,
  name TEXT,
  at INTEGER NOT NULL,
  PRIMARY KEY (week, user_id, player)
);
CREATE INDEX IF NOT EXISTS star_ratings_player ON star_ratings (player, week);

-- P4.4: anonymous to the recipient – managers see the author. kind = praise | tip | concern.
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id TEXT NOT NULL,
  from_name TEXT,
  to_id TEXT NOT NULL,
  to_name TEXT,
  kind TEXT NOT NULL DEFAULT 'tip',
  body TEXT NOT NULL,
  at INTEGER NOT NULL,
  read_at INTEGER,
  hidden INTEGER NOT NULL DEFAULT 0,
  hidden_by TEXT,
  hidden_at INTEGER,
  report TEXT, -- the recipient's reason, when reported
  reported_at INTEGER
);
CREATE INDEX IF NOT EXISTS feedback_to ON feedback (to_id, at);
CREATE INDEX IF NOT EXISTS feedback_from ON feedback (from_id, at);

-- P3.8: one prediction per member per event (our score first). points is set when the event is scored.
CREATE TABLE IF NOT EXISTS predictions (
  event_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  gf INTEGER NOT NULL,
  ga INTEGER NOT NULL,
  at INTEGER NOT NULL,
  points INTEGER,
  PRIMARY KEY (event_id, user_id)
);
-- The result a night was scored on: the first League match in the event window, or the first confirmed Rush result that
-- day. status = scored | void (no match found within a week).
CREATE TABLE IF NOT EXISTS prediction_results (
  event_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL,
  gf INTEGER,
  ga INTEGER,
  opp TEXT,
  match_ref TEXT,
  at INTEGER NOT NULL
);
