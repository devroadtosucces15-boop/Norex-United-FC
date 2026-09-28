-- Game rules versions (PB.1). Each row is a full, self-contained FC dataset; the newest row is what the
-- builder sandbox and Pro Builds read. With no rows yet, the Worker serves the site's data/game seed file.
CREATE TABLE IF NOT EXISTS game_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  level_cap INTEGER NOT NULL,
  cap_verified INTEGER NOT NULL DEFAULT 0,
  cap_source TEXT,
  data TEXT NOT NULL, -- full dataset JSON
  note TEXT,
  based_on TEXT,
  by_id TEXT,
  by_name TEXT,
  at INTEGER NOT NULL
);

-- Manager decisions on level-cap mentions found in EA's patch notes (P1.7): applied | dismissed.
CREATE TABLE IF NOT EXISTS game_decisions (
  hit_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  version TEXT,
  by_name TEXT,
  at INTEGER NOT NULL
);
