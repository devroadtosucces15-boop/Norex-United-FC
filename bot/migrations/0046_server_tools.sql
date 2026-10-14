-- Server tools (Miona + Carl-bot replacements): member snapshot for leave/join alerts, saved /tag answers, /remind queue.
CREATE TABLE IF NOT EXISTS guild_members (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  avatar TEXT,
  joined_at TEXT,
  roles TEXT
);
CREATE TABLE IF NOT EXISTS tags (
  name TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  by_id TEXT,
  uses INTEGER NOT NULL DEFAULT 0,
  at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  role_id TEXT,
  body TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  at INTEGER NOT NULL,
  sent_at INTEGER
);
CREATE INDEX IF NOT EXISTS reminders_due ON reminders (sent_at, due_at);
