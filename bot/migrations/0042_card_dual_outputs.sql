ALTER TABLE card_requests ADD COLUMN avatar_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE card_requests ADD COLUMN portrait_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE card_requests ADD COLUMN portrait_key TEXT;
