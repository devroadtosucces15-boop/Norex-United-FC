-- P6.1b feed photos and clips in Cloudflare R2 (bucket norex-media). One row per uploaded file; the R2 object key is
-- random (128 bits) and doubles as the /media/<key> URL. post_id stays NULL until the file is attached to a post.
-- gone: 0 stored · 1 expired (storage guard or 365-day age limit) · 2 removed (post deleted / owner) · 3 never posted or failed.
-- Every row counts towards the member's daily upload limit, so deleting and re-uploading can't get around it.
CREATE TABLE IF NOT EXISTS media (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id INTEGER,
  kind TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  w INTEGER,
  h INTEGER,
  at INTEGER NOT NULL,
  gone INTEGER NOT NULL DEFAULT 0,
  gone_at INTEGER
);
CREATE INDEX IF NOT EXISTS media_user ON media (user_id, at);
CREATE INDEX IF NOT EXISTS media_post ON media (post_id);
CREATE INDEX IF NOT EXISTS media_live ON media (gone, at);
