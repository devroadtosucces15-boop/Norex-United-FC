-- P3.5 Rush squad builder. Preferences are private to their author (managers see all).
CREATE TABLE IF NOT EXISTS rush_prefs (
  user_id TEXT PRIMARY KEY,
  ranks TEXT NOT NULL DEFAULT '[]', -- JSON [discord ids], best first, max 10
  updated INTEGER NOT NULL
);
-- A generated (and possibly hand-edited) set of 5-a-side squads. data = { squads: [{ ids, roles, chemistry, missing, locked }], bench: [ids] }.
CREATE TABLE IF NOT EXISTS rush_squads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  event_id INTEGER,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published
  by_name TEXT,
  at INTEGER NOT NULL,
  published_at INTEGER,
  discord_msg TEXT
);
