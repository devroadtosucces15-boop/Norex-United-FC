ALTER TABLE card_requests ADD COLUMN target_player TEXT;
ALTER TABLE card_requests ADD COLUMN submitted_by TEXT;
CREATE INDEX card_requests_target_player ON card_requests(target_player, created_at);
