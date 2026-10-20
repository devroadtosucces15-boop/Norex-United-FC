-- Forced DMs (routing rule "send even if muted"): the flag orders the DM queue (urgent first) and counts the per-member daily cap.
ALTER TABLE notifications ADD COLUMN forced INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS notifications_forced ON notifications (user_id, forced, at);
