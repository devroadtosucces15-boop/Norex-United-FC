-- Burner-club tracker: clubs a manager picked with /burner. scripts/fetch.mjs reads the active rows
-- (GET /api/burners/tracked, keyed) and keeps each club's full history in data/burners/<id>.json.
CREATE TABLE IF NOT EXISTS burner_clubs (
  club_id TEXT PRIMARY KEY, -- EA club ID – burners rename, the ID stays
  name TEXT NOT NULL,
  crest TEXT, -- EA crestAssetId
  channel_id TEXT, -- Discord channel where it was tracked: game reports are posted there
  added_by TEXT NOT NULL,
  added_by_name TEXT,
  added_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  removed_at INTEGER
);
