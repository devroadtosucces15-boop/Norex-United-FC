-- P6.2 highlight of the week · P6.4 online presence · P6.5 reactions everywhere.

-- One vote per member per ISO week (changeable until the week closes), for a 🎬 highlight post of that week.
CREATE TABLE IF NOT EXISTS hotw_votes (
  week TEXT NOT NULL,
  user_id TEXT NOT NULL,
  post_id INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (week, user_id)
);
CREATE INDEX IF NOT EXISTS hotw_votes_post ON hotw_votes (week, post_id);

-- A closed week. post_id NULL = nobody voted. The winning post is copied (name, text, video link) so the public
-- home page and Discord can show it without opening the members-only feed.
CREATE TABLE IF NOT EXISTS hotw (
  week TEXT PRIMARY KEY,
  post_id INTEGER,
  user_id TEXT,
  name TEXT,
  avatar TEXT,
  body TEXT,
  video TEXT,
  media TEXT,
  votes INTEGER NOT NULL DEFAULT 0,
  entries INTEGER NOT NULL DEFAULT 0,
  closed_at INTEGER NOT NULL,
  posted_at INTEGER
);

-- Last request from a logged-in member (updated at most once a minute) + "appear offline".
ALTER TABLE users ADD COLUMN seen_at INTEGER;
ALTER TABLE users ADD COLUMN presence_hidden INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS users_seen ON users (seen_at);

-- Shared reactions for anything that isn't a feed post (kind = 'comment' now, chat messages later – P6.3).
CREATE TABLE IF NOT EXISTS reactions (
  kind TEXT NOT NULL,
  ref INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (kind, ref, user_id, emoji)
);
