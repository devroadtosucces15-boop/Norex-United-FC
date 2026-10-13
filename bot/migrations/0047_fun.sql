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
