-- Pro Builds board (PB.3) + "my build" on profiles (PB.4).
-- A posted build is a row of `builds` with posted_at set; the post's details live on the same row.
ALTER TABLE builds ADD COLUMN description TEXT; -- how to play it
ALTER TABLE builds ADD COLUMN position TEXT; -- e.g. ST, CB (author's pick)
ALTER TABLE builds ADD COLUMN mode TEXT; -- 'league' | 'rush'
ALTER TABLE builds ADD COLUMN clip TEXT; -- https link to a clip (YouTube, Twitch, Medal …)
ALTER TABLE builds ADD COLUMN tags TEXT; -- JSON array of author tags
ALTER TABLE builds ADD COLUMN up INTEGER NOT NULL DEFAULT 0; -- vote counts, kept in step with build_votes
ALTER TABLE builds ADD COLUMN down INTEGER NOT NULL DEFAULT 0;
ALTER TABLE builds ADD COLUMN comments INTEGER NOT NULL DEFAULT 0;
ALTER TABLE builds ADD COLUMN featured TEXT; -- "Club recommended" label, e.g. "ST · League" (managers)
ALTER TABLE builds ADD COLUMN featured_by TEXT;
ALTER TABLE builds ADD COLUMN unposted_by TEXT; -- manager who took the post down (NULL = author or never)
CREATE INDEX IF NOT EXISTS builds_posted ON builds (posted_at, removed_at);

CREATE TABLE IF NOT EXISTS build_votes (
  build_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  v INTEGER NOT NULL, -- 1 or -1
  at INTEGER NOT NULL,
  PRIMARY KEY (build_id, user_id)
);

CREATE TABLE IF NOT EXISTS build_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  build_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  text TEXT NOT NULL,
  at INTEGER NOT NULL,
  removed_at INTEGER
);
CREATE INDEX IF NOT EXISTS build_comments_build ON build_comments (build_id, removed_at, id);
CREATE INDEX IF NOT EXISTS build_comments_user ON build_comments (user_id, at);

-- PB.4: the build a member plays with, per mode. Points at one of their own builds.
CREATE TABLE IF NOT EXISTS my_builds (
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL, -- 'league' | 'rush'
  build_id INTEGER NOT NULL,
  position TEXT,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, mode)
);
