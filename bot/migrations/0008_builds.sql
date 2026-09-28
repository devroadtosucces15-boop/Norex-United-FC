-- Pro Builder saved builds (PB.2 c): "Save to My builds", Fork. PB.3 posts a build by setting posted_at.
-- code = the builder's share-link string (URLSearchParams: a, l, p, ps, pp, sp, fa, h, w, v) – decoded client-side.
CREATE TABLE IF NOT EXISTS builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT, -- author's display name at save time
  avatar TEXT,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  arch TEXT NOT NULL,
  level INTEGER NOT NULL,
  version TEXT, -- game-rules version the build was made on
  forked_from INTEGER, -- builds.id it was copied from
  posted_at INTEGER, -- PB.3: set when posted to Pro Builds (public to read)
  at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  removed_at INTEGER
);
CREATE INDEX IF NOT EXISTS builds_user ON builds (user_id, removed_at, updated_at);
