// D1 usage fixes (migration 0054): cached flag read, query plans that seek instead of scan, quieter writes.
import { env, sqlite, DB } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { loadFlagOverrides, loadFlagOverridesCached, clearFlagOverrides } from '../bot/roles.js';
import { memberLiveCron } from '../bot/memberlive.js';

const plan = (sql) => sqlite.prepare(`EXPLAIN QUERY PLAN ${sql}`).all().map((r) => r.detail).join(' | ');

// ---------- flag overrides: one read per window, a save drops it ----------
let reads = 0;
const realPrepare = DB.prepare.bind(DB);
DB.prepare = (sql) => { if (/FROM flag_overrides/.test(sql)) reads++; return realPrepare(sql); };
sqlite.exec("INSERT OR REPLACE INTO flag_overrides (name, level, by_name, at) VALUES ('d1usage', 'owner', 'test', 1)");
clearFlagOverrides();
const a = await loadFlagOverridesCached(env, 1000), b = await loadFlagOverridesCached(env, 1000 + 5e3);
t('flags: two reads inside 15 s hit D1 once', reads === 1 && a.d1usage === 'owner' && b.d1usage === 'owner');
await loadFlagOverridesCached(env, 1000 + 16e3);
t('flags: a read after 15 s asks D1 again', reads === 2);
clearFlagOverrides(); await loadFlagOverridesCached(env, 1000 + 16e3);
t('flags: clearFlagOverrides (a Boardroom save) forces a fresh read', reads === 3);
reads = 0; await loadFlagOverrides(env); await loadFlagOverrides(env);
t('flags: the Discord path keeps the uncached read', reads === 2);
DB.prepare = realPrepare;

// ---------- query plans ----------
await tt('chats: unread count seeks on (chat_id, removed, at)', () => /idx_chat_messages_unread \(chat_id=\? AND removed=\? AND at>\?\)/.test(plan(
  `SELECT cm.chat_id, COUNT(*) n FROM chat_messages cm JOIN chat_members me ON me.chat_id = cm.chat_id AND me.user_id = 'u' WHERE cm.chat_id IN (1,2) AND cm.removed = 0 AND cm.user_id != 'u' AND cm.at > me.read_at GROUP BY cm.chat_id`)));
await tt('chats: last message is one index seek per chat', () => /idx_chat_messages_live/.test(plan(
  'SELECT m.* FROM chats c JOIN chat_messages m ON m.id = (SELECT id FROM chat_messages WHERE chat_id = c.id AND removed = 0 ORDER BY id DESC LIMIT 1) WHERE c.id IN (1,2)')));
await tt('notify cron: open acknowledgements come from the partial index', () => /notifications_ack_open/.test(plan(
  'SELECT n.id FROM notifications n WHERE n.ack = 1 AND n.ack_at IS NULL AND n.reminders < 3 AND COALESCE(n.dm_at, n.at) < 5 LIMIT 100')));
await tt('card studio: portraits and the generator use the status index', () => /card_requests_status/.test(plan("SELECT * FROM card_requests WHERE status = 'done' AND published = 1")));

// ---------- member live cursor: no write when nothing moves ----------
sqlite.exec("DELETE FROM meta WHERE key = 'memberlive_cursor'");
let writes = 0;
DB.prepare = (sql) => { if (/INSERT INTO meta.*memberlive_cursor/.test(sql)) writes++; return realPrepare(sql); };
sqlite.exec("INSERT OR IGNORE INTO users (id, name, first_at, last_at, logins) VALUES ('ml1', 'Streamer', 1, 1, 1)");
sqlite.exec("INSERT OR REPLACE INTO profiles (user_id, twitch, updated) VALUES ('ml1', 'streamer', 1)");
const none = async () => ({ ok: false, status: 404, json: async () => null, text: async () => '' });
await memberLiveCron(env, Date.now(), none); await memberLiveCron(env, Date.now(), none); await memberLiveCron(env, Date.now(), none);
t('member live: the cursor is written once, not every 10 minutes', writes === 1);
DB.prepare = realPrepare;
done();
