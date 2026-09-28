-- Hall of fame (P4.6): legends inducted by managers and club-history moments for the timeline.
-- kind: legend (a player – EA key when known) | moment (a dated event on the club history timeline)
CREATE TABLE IF NOT EXISTS hof (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  player TEXT, -- EA player key (legend), NULL for a name-only legend or a moment
  name TEXT NOT NULL, -- legend's name or the moment's title
  title TEXT, -- legend's honour line, e.g. "Captain 2026–27"
  text TEXT, -- citation / description
  date TEXT, -- YYYY-MM-DD (inducted on / happened on)
  by_id TEXT NOT NULL,
  by_name TEXT,
  at INTEGER NOT NULL,
  removed_at INTEGER -- set when a manager takes it down (kept for the activity trail)
);
CREATE INDEX IF NOT EXISTS hof_kind ON hof (kind, removed_at);
