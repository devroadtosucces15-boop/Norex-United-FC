-- Wave 8: P3.3 Discord RSVP & reminders, P3.4 lineup builder, P2.4 platform account linking.

-- P3.3: who gets nudged before an event (dm = site bell + Discord DM · mention = @ in the event's channel · off),
-- and when the T-24h / T-2h reminders went out.
ALTER TABLE events ADD COLUMN remind TEXT NOT NULL DEFAULT 'dm';
ALTER TABLE events ADD COLUMN remind24_at INTEGER;
ALTER TABLE events ADD COLUMN remind2_at INTEGER;

-- P3.4: the formation the lineup uses (e.g. '4-3-3'); lineup (existing column) = { "<discord id>": "<slot>" };
-- lineup_at = when a manager published it (starters are told "You're starting at CM").
ALTER TABLE events ADD COLUMN formation TEXT;
ALTER TABLE events ADD COLUMN lineup_at INTEGER;

-- P3.4: saved lineups a manager can reuse – formation + who plays which slot.
CREATE TABLE IF NOT EXISTS lineup_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  formation TEXT NOT NULL,
  slots TEXT NOT NULL DEFAULT '{}', -- { "<slot>": "<discord id>" }
  by_name TEXT,
  at INTEGER NOT NULL
);

-- P2.4: platform accounts Discord says are verified (connections scope), refreshed at every login:
-- { "psn": { "name": "…", "at": … }, "xbox": {…}, "steam": {…}, "epic": {…} }
ALTER TABLE profiles ADD COLUMN verified TEXT NOT NULL DEFAULT '{}';
