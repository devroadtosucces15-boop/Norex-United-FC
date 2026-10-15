-- Praise & feedback after a match: optional anonymity, the match it is about, the recipient's reaction and (for 😕/❌) their reason.
ALTER TABLE feedback ADD COLUMN anon INTEGER NOT NULL DEFAULT 1;   -- 1 = the recipient does not see who wrote it (sender, managers always do)
ALTER TABLE feedback ADD COLUMN match_id TEXT;
ALTER TABLE feedback ADD COLUMN reaction TEXT;                      -- like | check | heart | disagree | confused
ALTER TABLE feedback ADD COLUMN reacted_at INTEGER;
ALTER TABLE feedback ADD COLUMN reply TEXT;                         -- recipient's "why", only managers read it
ALTER TABLE feedback ADD COLUMN reply_at INTEGER;
