-- P6.1c: report queue + Discord share timestamp for feed posts. `public` column already exists (0018).
ALTER TABLE posts ADD COLUMN reported_at INTEGER;
ALTER TABLE posts ADD COLUMN reported_by TEXT;
ALTER TABLE posts ADD COLUMN reported_reason TEXT;
ALTER TABLE posts ADD COLUMN discord_at INTEGER;
