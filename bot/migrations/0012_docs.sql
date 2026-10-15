-- Club knowledge (P5.1 Play Style, P5.2 documentation hub, P5.3 announcements to Discord) and the suggestion box (P5.4).

-- One row per document. area = announce | requirements | rules | faq | glossary | playstyle.
-- Play Style rows are one per (mode, section): mode = league | rush, section = philosophy | formations | positions | setpieces | tactics.
-- Every edit keeps the previous text in doc_versions (version counts up from 1).
CREATE TABLE IF NOT EXISTS docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area TEXT NOT NULL,
  mode TEXT,
  section TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  public INTEGER NOT NULL DEFAULT 0, -- 1 → guests see it too (public site)
  version INTEGER NOT NULL DEFAULT 1,
  by_id TEXT,
  by_name TEXT,
  at INTEGER NOT NULL,
  edited_by TEXT,
  edited_at INTEGER,
  removed_at INTEGER,
  discord_channel TEXT, -- P5.3: where it was last posted
  discord_msg TEXT,
  discord_at INTEGER
);
CREATE INDEX IF NOT EXISTS docs_area ON docs (area, removed_at);

CREATE TABLE IF NOT EXISTS doc_versions (
  doc_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  by_name TEXT,
  at INTEGER NOT NULL,
  PRIMARY KEY (doc_id, version)
);

-- Rules acknowledgements: the current rules version lives in meta 'rules_version' (0 = nothing to acknowledge).
CREATE TABLE IF NOT EXISTS doc_acks (
  user_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT,
  avatar TEXT,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, version)
);

-- Notifications can point at the thing they are about (e.g. 'rules:3'), so acknowledging one acknowledges the other.
ALTER TABLE notifications ADD COLUMN ref TEXT;

-- Suggestion box (P5.4). anon = 1 → other members don't see the author (managers always do).
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT,
  anon INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', -- open | planned | done | declined
  up INTEGER NOT NULL DEFAULT 0,
  by_id TEXT NOT NULL,
  by_name TEXT,
  by_avatar TEXT,
  at INTEGER NOT NULL,
  reply TEXT,
  replied_by TEXT,
  replied_at INTEGER,
  removed_at INTEGER
);
CREATE INDEX IF NOT EXISTS suggestions_status ON suggestions (status, removed_at);

CREATE TABLE IF NOT EXISTS suggestion_votes (
  suggestion_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (suggestion_id, user_id)
);
