-- P11.4 profanity counter & moderation escalation. Detection itself is Discord's own AutoMod (no bot code,
-- no Message Content Intent, no Gateway needed) – it posts an alert message to a chosen log channel, which
-- the cron reads via the bot's REST token (same read-only channel-history technique as P11.0/P8.4) and turns
-- into a per-member strike counter + auto warn/mute, reusing the existing moderation columns.
ALTER TABLE users ADD COLUMN profanity_strikes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_clean_bonus_at INTEGER;

CREATE TABLE IF NOT EXISTS profanity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  keyword TEXT,
  message_ref TEXT, -- the AutoMod alert message id, so a re-read of the channel never double-counts it
  at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS profanity_log_ref ON profanity_log (message_ref);
CREATE INDEX IF NOT EXISTS profanity_log_user ON profanity_log (user_id, at);
