-- Match-night answers keep the time of the FIRST answer (event_rsvps.at moves on every change), and every answer,
-- change, clear and check-in is one row in event_answer_log so the check-in post can show who answered or checked in when.
ALTER TABLE event_rsvps ADD COLUMN first_at INTEGER;
UPDATE event_rsvps SET first_at = at WHERE first_at IS NULL;

CREATE TABLE IF NOT EXISTS event_answer_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT,
  kind TEXT NOT NULL,   -- yes | maybe | no | clear | checkin | checkout
  prev TEXT,            -- the answer it replaced (yes | maybe | no), if any
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS event_answer_log_event ON event_answer_log (event_id, at);

-- The "Check in now" post that goes out before kick-off, so it can be kept live as people check in.
ALTER TABLE events ADD COLUMN checkin_msg TEXT;
