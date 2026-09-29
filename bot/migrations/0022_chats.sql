-- Messaging (P6.3a): 1:1 DMs and member-created group chats, data + REST + polling UI.
-- Real-time (P6.3b, Durable Objects – see roadmap R0.5) and mid-life group editing (P6.3c) land later.
CREATE TABLE chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL, -- 'dm' | 'group'
  name TEXT, -- group only
  emoji TEXT, -- group only
  dm_key TEXT, -- 'uidA:uidB' sorted – one DM chat per pair
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL -- last message time, orders the chat list
);
CREATE UNIQUE INDEX idx_chats_dm_key ON chats(dm_key) WHERE dm_key IS NOT NULL;

CREATE TABLE chat_members (
  chat_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  joined_at INTEGER NOT NULL,
  read_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (chat_id, user_id)
);
CREATE INDEX idx_chat_members_user ON chat_members(user_id);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  text TEXT NOT NULL,
  at INTEGER NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0,
  reported_at INTEGER,
  reported_by TEXT,
  reported_reason TEXT
);
CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id, id);
CREATE INDEX idx_chat_messages_reported ON chat_messages(reported_at);
