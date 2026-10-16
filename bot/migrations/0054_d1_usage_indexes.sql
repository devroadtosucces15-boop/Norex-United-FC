-- D1 usage: indexes so the hot, repeated queries read the rows they need instead of whole tables.
-- Nothing here changes data or behaviour. Each index is named after the query it serves.

-- GET /api/chats runs for every signed-in tab each minute (header bell poll) and every 6 s on the Messages page.
-- Unread counts: only the messages newer than the member's read marker (was: every message in every chat they are in).
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages (chat_id, removed, at);
-- Last visible message per chat: one index seek per chat (was: every message in the chat).
CREATE INDEX IF NOT EXISTS idx_chat_messages_live ON chat_messages (chat_id, removed, id);

-- 10-minute cron "announcements still waiting for a Got it" (notify.js notifyCron). Partial: only the open ones are indexed,
-- so ordinary notifications cost no extra write.
CREATE INDEX IF NOT EXISTS notifications_ack_open ON notifications (at) WHERE ack = 1 AND ack_at IS NULL;

-- Public GET /api/cards/portraits (every page that shows a player card) and the Card Studio generator cron.
CREATE INDEX IF NOT EXISTS card_requests_status ON card_requests (status, published);
