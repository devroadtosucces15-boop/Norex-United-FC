-- Fun for members (bot/fun.js): /jail sentences and /wheel spins.
CREATE TABLE IF NOT EXISTS fun_jail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT,
  by_id TEXT NOT NULL,
  by_name TEXT,
  reason TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  at INTEGER NOT NULL,
  bail_by TEXT,
  bail_at INTEGER
);
CREATE INDEX IF NOT EXISTS fun_jail_user ON fun_jail (user_id, at);
CREATE INDEX IF NOT EXISTS fun_jail_by ON fun_jail (by_id, at);
CREATE TABLE IF NOT EXISTS fun_wheels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT,
  options TEXT NOT NULL,
  by_id TEXT NOT NULL,
  at INTEGER NOT NULL
);
-- /trivia: a posted question (shuffled answer order), who answered, running score.
CREATE TABLE IF NOT EXISTS fun_trivia_q (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  q_idx INTEGER NOT NULL,
  order_json TEXT NOT NULL,
  by_id TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fun_trivia_answers (
  q_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  pick INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (q_id, user_id)
);
CREATE TABLE IF NOT EXISTS fun_trivia_scores (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0
);
