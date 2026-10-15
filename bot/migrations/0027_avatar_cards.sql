-- P11.5 (backend half – see roadmap): one row per member holding their uploaded photo + AI-generated
-- background, both R2 object keys served at /media/<key> (same scheme as the feed, P6.1b).
CREATE TABLE IF NOT EXISTS avatar_cards (
  user_id TEXT PRIMARY KEY,
  photo_key TEXT NOT NULL,
  bg_key TEXT NOT NULL,
  at INTEGER NOT NULL
);
