-- /streamalerts: stream and post alerts per source (the club's main channel or a contributor's), one Discord channel each.
CREATE TABLE stream_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,                 -- 'main' | 'contributor'
  platform TEXT NOT NULL,              -- twitch | youtube | kick
  handle TEXT NOT NULL,                -- twitch/kick login, youtube '@handle' or 'channel/UC…'
  url TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  user_id TEXT,                        -- contributor's Discord id (credit only, never pinged)
  channel_id TEXT NOT NULL,            -- where the alerts go
  want_live INTEGER NOT NULL DEFAULT 1,
  want_posts INTEGER NOT NULL DEFAULT 1,
  live INTEGER NOT NULL DEFAULT 0,
  live_announced_at INTEGER,
  yt_channel TEXT,                     -- resolved UC id for the uploads feed
  seeded_at INTEGER,                   -- first feed read: existing videos are remembered, not posted
  checked_at INTEGER NOT NULL DEFAULT 0,
  added_by TEXT,
  at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (platform, handle, channel_id)
);
-- One row per thing already announced. The primary key is the "only once" guarantee.
CREATE TABLE stream_seen (
  source_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (source_id, item_id)
);
