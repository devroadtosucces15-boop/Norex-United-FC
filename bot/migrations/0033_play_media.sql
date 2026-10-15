-- BE1 Tactics Studio: recorded video of a play (tab capture) and voice-over narration. Files live in R2 (MEDIA
-- bucket, `play/<id>/m/<hex>.<ext>`, kept out of the feed's storage guard). Status is 'pending' while the upload
-- is in flight and 'ready' once R2 has the object – no Stream webhook needed, so nothing is provisioned outside R2.
CREATE TABLE play_media (
  id TEXT PRIMARY KEY,               -- random hex, also the R2 file name
  play_id INTEGER NOT NULL REFERENCES plays(id),
  kind TEXT NOT NULL,                -- video | voice
  key TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | ready | failed
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_play_media_play ON play_media (play_id, deleted);
