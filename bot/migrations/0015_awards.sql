-- P4.1 weekly awards. A week = ISO week in UTC (Monday 00:00 → Sunday 24:00), key 'YYYY-Www'.
-- Vote categories live in award_categories (4 built-in + fun ones managers add); stat awards (Golden Boot, Playmaker,
-- Iron Man, Rising Star) are worked out from the match log when the week closes. Player of the Month rolls up the weeks.
CREATE TABLE IF NOT EXISTS award_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  grp TEXT NOT NULL DEFAULT 'any', -- nominees: GK | DEF | MID | FWD | any
  builtin INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 50,
  active INTEGER NOT NULL DEFAULT 1,
  by_name TEXT,
  at INTEGER NOT NULL
);
INSERT INTO award_categories (name, icon, grp, builtin, sort, at) VALUES
  ('Best Striker', '⚽', 'FWD', 1, 1, 0), ('Best Midfielder', '🎯', 'MID', 1, 2, 0), ('Best Defender', '🛡️', 'DEF', 1, 3, 0), ('Best Keeper', '🧤', 'GK', 1, 4, 0);

CREATE TABLE IF NOT EXISTS award_votes (
  week TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  player TEXT NOT NULL, -- EA player key
  at INTEGER NOT NULL,
  PRIMARY KEY (week, category_id, user_id)
);

-- One row per week once it's closed (winners worked out). month = the month of the week's Sunday ('YYYY-MM').
CREATE TABLE IF NOT EXISTS award_weeks (
  week TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  closed_at INTEGER NOT NULL,
  posted_at INTEGER
);

-- Winners. period = week key, or 'M' + month for Player of the Month. award = category id (votes) or a stat key
-- (boot | playmaker | ironman | rising | potm). A tie crowns everyone tied.
CREATE TABLE IF NOT EXISTS award_winners (
  period TEXT NOT NULL,
  award TEXT NOT NULL,
  player TEXT NOT NULL,
  name TEXT NOT NULL,
  value REAL, -- votes, goals, G+A, games, rating …
  at INTEGER NOT NULL,
  PRIMARY KEY (period, award, player)
);
CREATE INDEX IF NOT EXISTS award_winners_player ON award_winners (player);
