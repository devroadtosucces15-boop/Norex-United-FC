-- Staff Dugout: a published line-up can also be shown on the public home page (opt-in per post).
ALTER TABLE events ADD COLUMN lineup_home INTEGER NOT NULL DEFAULT 0;
