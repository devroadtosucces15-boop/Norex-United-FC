-- Watch list (bot/watchlist.js): the YouTube creators we follow, their videos (topic-sorted) and who found one useful.
CREATE TABLE IF NOT EXISTS watch_creators (
  channel_id TEXT PRIMARY KEY,
  name TEXT,
  added_by TEXT,
  at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  seen_at INTEGER
);
CREATE TABLE IF NOT EXISTS watch_videos (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  title TEXT NOT NULL,
  thumb TEXT,
  published INTEGER NOT NULL,
  topic TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  at INTEGER NOT NULL,
  posted_at INTEGER
);
CREATE INDEX IF NOT EXISTS watch_videos_pub ON watch_videos (published);
CREATE INDEX IF NOT EXISTS watch_videos_topic ON watch_videos (topic, published);
CREATE TABLE IF NOT EXISTS watch_useful (
  video_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (video_id, user_id)
);
