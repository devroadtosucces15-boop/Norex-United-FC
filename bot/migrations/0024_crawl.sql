-- P9.1 resumable club crawl: lightweight index row per club found while walking EA's sequential club-ID
-- range. Full detail (members, matches, stats) is fetched on demand elsewhere, not stored here.
-- The crawl's checkpoint lives in meta (key 'crawl_cursor'), same table other cron jobs already use.
CREATE TABLE IF NOT EXISTS club_index (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  crest TEXT,
  checked_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS club_index_checked ON club_index (checked_at);
