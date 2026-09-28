-- Rush results (P0.4). EA doesn't expose Rush, so members log them and a manager confirms.
-- status: pending (waiting for a manager) | confirmed (counts everywhere) | rejected | removed (confirmed, then taken down)
CREATE TABLE IF NOT EXISTS rush_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL, -- YYYY-MM-DD
  opponent TEXT NOT NULL,
  opp_club_id TEXT, -- set when the opponent matches a tracked club
  gf INTEGER NOT NULL,
  ga INTEGER NOT NULL,
  shot TEXT, -- screenshot link
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  by_id TEXT NOT NULL,
  by_name TEXT,
  by_avatar TEXT,
  at INTEGER NOT NULL,
  decided_by TEXT,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS rush_matches_status ON rush_matches (status, date);
CREATE INDEX IF NOT EXISTS rush_matches_by ON rush_matches (by_id, at);

-- Our players in a Rush match (1–5). `player` = EA player key from the NOREX squad, '' for a guest.
CREATE TABLE IF NOT EXISTS rush_players (
  match_id INTEGER NOT NULL,
  slot INTEGER NOT NULL,
  player TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  pos TEXT NOT NULL DEFAULT '',
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  rating REAL,
  motm INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, slot)
);
CREATE INDEX IF NOT EXISTS rush_players_player ON rush_players (player);
