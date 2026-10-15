-- BE5 Boardroom: live-editable feature flags on top of config.json's committed `features` map.
-- A manager/owner edit in the portal writes here; the Worker re-reads this table on every request and
-- layers it over the static FEATURES var, so a change is live immediately – no deploy needed.
CREATE TABLE IF NOT EXISTS flag_overrides (
  name TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  by_name TEXT,
  at INTEGER NOT NULL
);
