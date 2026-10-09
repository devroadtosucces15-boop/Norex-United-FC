-- Owner's "issue tool" (web/report.js): one row per pinned note. `data` is the full JSON (marks, target element, device, role…),
-- the other columns are there so a report can be queried/triaged with plain SQL. status: open | fixed | wontfix.
CREATE TABLE IF NOT EXISTS issue_reports (
  id TEXT PRIMARY KEY,            -- <session>:<n>
  session TEXT NOT NULL,
  n INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  page TEXT,
  severity TEXT,
  note TEXT,
  role TEXT,                      -- the viewer's real role
  view_as TEXT,                   -- the role being previewed, if any
  device TEXT,                    -- "iPhone · iOS 18.2 · Safari 18.2 · 390x844 @3x"
  status TEXT NOT NULL DEFAULT 'open',
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports (status, created_at);
