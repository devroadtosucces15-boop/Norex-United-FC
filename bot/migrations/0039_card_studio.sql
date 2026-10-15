CREATE TABLE IF NOT EXISTS card_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('bg', 'pose')),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  point_cost INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  asset_key TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS card_templates_kind ON card_templates (kind, active);

CREATE TABLE IF NOT EXISTS card_unlocks (
  user_id TEXT NOT NULL,
  template_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('purchase', 'grant')),
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, template_id)
);

CREATE TABLE IF NOT EXISTS card_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  bg_id INTEGER NOT NULL,
  pose_id INTEGER NOT NULL,
  photo_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'generating', 'done', 'failed')),
  result_key TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  decided_by TEXT,
  decided_at INTEGER,
  UNIQUE (user_id, month)
);
