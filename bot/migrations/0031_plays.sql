-- BE1 Tactics Studio + Playbook (board 06): set-pieces/formations/drills as a document (pieces, steps,
-- drawings, recorded tracks) stored in R2 (MEDIA bucket, `play/<id>/v<version>.json`), versioned here.
-- Assignment + learned state is one row per (play, member) rather than a separate progress table – the
-- same "extend in place, don't duplicate" call as BE4's trial_events.
CREATE TABLE plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'set-piece', -- set-piece | formation | drill
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  doc_key TEXT, -- R2 key of the current version's document
  archived INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_plays_visible ON plays (archived, published);

CREATE TABLE play_versions (
  play_id INTEGER NOT NULL REFERENCES plays(id),
  version INTEGER NOT NULL,
  key TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (play_id, version)
);

-- learned = explicitly ticked off or earned via a perfect quiz. assigned_by is NULL when a member opted in
-- themselves (any published play) rather than being pushed one by a manager.
CREATE TABLE play_assign (
  play_id INTEGER NOT NULL REFERENCES plays(id),
  user_id TEXT NOT NULL,
  assigned_by TEXT,
  assigned_at INTEGER NOT NULL,
  learned INTEGER NOT NULL DEFAULT 0,
  learned_at INTEGER,
  PRIMARY KEY (play_id, user_id)
);
CREATE INDEX idx_play_assign_user ON play_assign (user_id);

CREATE TABLE play_quiz_attempts (
  play_id INTEGER NOT NULL REFERENCES plays(id),
  user_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (play_id, user_id)
);
