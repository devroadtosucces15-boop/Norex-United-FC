-- Match operations: P3.1 scheduling, P3.2 availability per event, P3.7 check-in, quick lineup and session report.

-- type = league | rush | playoffs | friendly | trial | training. start = UTC ms; tz = the zone the manager scheduled it in.
-- needs = JSON { "GK": 1, "CB": 2, … } (positions still wanted) plus optional "players" (head count).
-- lineup = JSON { "<discord id>": "CB", … } set by a manager during the night (P3.7).
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT,
  start INTEGER NOT NULL,
  duration INTEGER NOT NULL DEFAULT 120, -- minutes
  tz TEXT NOT NULL DEFAULT 'UTC',
  notes TEXT,
  needs TEXT NOT NULL DEFAULT '{}',
  public INTEGER NOT NULL DEFAULT 0, -- 1 → "next match night" strip on the public home page
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | cancelled
  cancel_reason TEXT,
  lineup TEXT NOT NULL DEFAULT '{}',
  series TEXT, -- events created together with "repeat weekly" share this
  by_id TEXT,
  by_name TEXT,
  at INTEGER NOT NULL,
  edited_by TEXT,
  edited_at INTEGER,
  discord_channel TEXT,
  discord_msg TEXT,
  report_at INTEGER -- when the session report was posted
);
CREATE INDEX IF NOT EXISTS events_start ON events (start);

-- P3.2: one answer per member per event (yes | maybe | no).
CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  at INTEGER NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

-- P3.7: "I'm on" during the night; trial = a position the member is trying tonight (position-trial mode).
CREATE TABLE IF NOT EXISTS event_checkins (
  event_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  trial TEXT,
  at INTEGER NOT NULL,
  PRIMARY KEY (event_id, user_id)
);
