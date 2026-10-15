-- P6.1 social feed: posts, reactions, comments (threaded one level).
-- tag = chat | highlight | league | rush. media (JSON) is filled by the upload step (P6.1b); public = shown on the home page (P6.1c).
-- Removed posts/comments stay in the table (removed_by / removed_at) so managers can see what was taken down.
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT,
  body TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL DEFAULT 'chat',
  media TEXT,
  public INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  pinned_by TEXT,
  at INTEGER NOT NULL,
  edited_at INTEGER,
  removed INTEGER NOT NULL DEFAULT 0,
  removed_by TEXT,
  removed_at INTEGER
);
CREATE INDEX IF NOT EXISTS posts_feed ON posts (removed, id);
CREATE INDEX IF NOT EXISTS posts_user ON posts (user_id, at);

-- One row per member per emoji (members can add several different reactions, like Discord).
CREATE TABLE IF NOT EXISTS post_reactions (
  post_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id, emoji)
);

-- parent_id = the top-level comment a reply belongs to (replies to replies attach to the same top-level comment).
CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  parent_id INTEGER,
  user_id TEXT NOT NULL,
  name TEXT,
  body TEXT NOT NULL,
  at INTEGER NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0,
  removed_by TEXT
);
CREATE INDEX IF NOT EXISTS post_comments_post ON post_comments (post_id, id);
CREATE INDEX IF NOT EXISTS post_comments_user ON post_comments (user_id, at);
