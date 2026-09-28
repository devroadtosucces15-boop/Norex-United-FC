-- P6.1 social feed. Media files live in Cloudflare R2 (bucket norex-media, binding MEDIA); `media` keeps the
-- size of every stored file so the storage guard can keep the bucket under the free 10 GB without listing R2.

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  tag TEXT, -- Discord @username at posting time
  mode TEXT NOT NULL DEFAULT 'general', -- general | league | rush
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  embed TEXT, -- JSON { kind, id, url, … } from the link
  media_key TEXT,
  media_type TEXT, -- image | video
  highlight INTEGER NOT NULL DEFAULT 0, -- a video or a clip link
  public INTEGER NOT NULL DEFAULT 0, -- managers: show on the public home page
  pinned_at INTEGER,
  at INTEGER NOT NULL,
  removed_at INTEGER,
  removed_by TEXT
);
CREATE INDEX IF NOT EXISTS posts_at ON posts (removed_at, at);
CREATE INDEX IF NOT EXISTS posts_user ON posts (user_id, at);

CREATE TABLE IF NOT EXISTS post_reactions (
  post_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id, emoji)
);

-- One level of threading: parent_id points at a top-level comment of the same post.
CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  parent_id INTEGER,
  user_id TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  tag TEXT,
  body TEXT NOT NULL,
  at INTEGER NOT NULL,
  removed_at INTEGER
);
CREATE INDEX IF NOT EXISTS post_comments_post ON post_comments (post_id, at);

CREATE TABLE IF NOT EXISTS media (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- image | video
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  post_id INTEGER, -- null until a post uses it; unused uploads are cleared after a day
  at INTEGER NOT NULL,
  deleted_at INTEGER,
  deleted_why TEXT -- removed | storage | expired | unused
);
CREATE INDEX IF NOT EXISTS media_live ON media (deleted_at, at);
CREATE INDEX IF NOT EXISTS media_user ON media (user_id, at);
