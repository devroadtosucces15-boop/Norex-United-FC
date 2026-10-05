-- Web Push (BE0): one row per browser/device that said yes to notifications. endpoint is the push service URL.
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  p256dh TEXT NOT NULL, -- browser's public key (base64url, 65 bytes uncompressed)
  auth TEXT NOT NULL, -- browser's auth secret (base64url, 16 bytes)
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS push_subs_user ON push_subs (user_id);
