// Messaging (roadmap P6.3a): 1:1 DMs and member-created group chats. Polling UI for now – Durable Objects
// real-time upgrade is P6.3b, mid-life group editing (rename/add/remove members) is P6.3c.
//   GET  /api/chats                        my chats, newest activity first, with unread counts
//   GET  /api/chats?all=1                  owner/founder: every chat on the club (disclosed in the chat UI)
//   POST /api/chats { kind:'dm', user }              open (or reuse) a 1:1 DM
//   POST /api/chats { kind:'group', name, emoji, members }   create a group chat
//   GET  /api/chats/:id/messages[?before=] up to 50 messages, oldest first
//   POST /api/chats/:id/messages { text }  send a message (polled by everyone else until P6.3b)
//   POST /api/chats/:id/read               mark everything in the chat read
//   POST /api/chats/:id/leave              leave a group chat (DMs can't be left)
//   POST /api/chats/:id/messages/:mid/report { reason }
//   GET  /api/chats/reports                managers: reported messages queue
//   POST /api/chats/reports/:mid { action: 'clear' | 'remove' }
// Owner/founder can read (not post into) any chat they're not a member of – the managers-see-reports-only /
// owner-sees-everything split from the roadmap. Group size capped at 16 to keep the D1 batch small.
import { can, flagOn } from './roles.js';
import { notify, notifyManagers, safely } from './notify.js';

const GROUP_EMOJI = ['💬', '⚽', '🔥', '🎮', '🏆', '🤝', '📣', '⚡'];
const GROUP_MAX = 16;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const excerpt = (s, n = 90) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

const msgOut = (r) => ({
  id: r.id, chatId: r.chat_id, text: r.text, at: r.at, by: { id: r.user_id, n: r.name, a: opt(r.avatar) },
  reported: r.reported_at ? { at: r.reported_at, by: r.reported_by, reason: r.reported_reason } : false,
});

// The chat + my membership row (or `mine: null` if I only have owner read-all access).
async function access(env, me, id) {
  const chat = await one(env, 'SELECT * FROM chats WHERE id = ?', id);
  if (!chat) return null;
  const mine = await one(env, 'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?', id, me.u);
  if (!mine && !can(me, 'messages.all')) return null;
  return { chat, mine };
}

function chatOut(c, members, last, unread, me) {
  const others = members.filter((m) => m.user_id !== me.u);
  const dm = c.kind === 'dm' ? others[0] : null;
  return {
    id: c.id, kind: c.kind,
    name: c.kind === 'dm' ? (dm?.name ?? 'Member') : (c.name || others.slice(0, 3).map((m) => m.name).join(', ') || 'Group'),
    emoji: c.kind === 'group' ? (c.emoji || '💬') : undefined,
    avatar: dm?.avatar,
    other: dm ? { id: dm.user_id, n: dm.name, a: opt(dm.avatar) } : undefined,
    members: members.map((m) => ({ id: m.user_id, n: m.name, a: opt(m.avatar) })),
    last: last ? { text: excerpt(last.text, 90), at: last.at, mine: last.user_id === me.u } : null,
    unread: unread ?? 0, at: c.last_at, mine: members.some((m) => m.user_id === me.u),
  };
}

async function myChats(env, me, wantAll) {
  const rows = wantAll
    ? await all(env, 'SELECT * FROM chats ORDER BY last_at DESC LIMIT 300')
    : await all(env, `SELECT c.* FROM chats c JOIN chat_members m ON m.chat_id = c.id AND m.user_id = ? ORDER BY c.last_at DESC LIMIT 200`, me.u);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [members, lastRows, unreadRows] = await Promise.all([
    all(env, `SELECT * FROM chat_members WHERE chat_id IN (${marks(ids.length)})`, ...ids),
    all(env, `SELECT m.* FROM chat_messages m JOIN (SELECT chat_id, MAX(id) mid FROM chat_messages WHERE chat_id IN (${marks(ids.length)}) AND removed = 0 GROUP BY chat_id) x ON x.mid = m.id`, ...ids),
    wantAll ? [] : all(env, `SELECT cm.chat_id, COUNT(*) n FROM chat_messages cm JOIN chat_members me ON me.chat_id = cm.chat_id AND me.user_id = ?
      WHERE cm.chat_id IN (${marks(ids.length)}) AND cm.removed = 0 AND cm.user_id != ? AND cm.at > me.read_at GROUP BY cm.chat_id`, me.u, ...ids, me.u),
  ]);
  const byChat = {}; for (const m of members) (byChat[m.chat_id] ??= []).push(m);
  const lastByChat = Object.fromEntries(lastRows.map((m) => [m.chat_id, m]));
  const unreadByChat = Object.fromEntries(unreadRows.map((r) => [r.chat_id, r.n]));
  return rows.map((c) => chatOut(c, byChat[c.id] ?? [], lastByChat[c.id], unreadByChat[c.id], me));
}

export async function chatRoute(p, method, body, me, env, log, url) {
  if (!p.startsWith('/api/chats')) return null;
  if (!flagOn(env, me, 'messages')) return fail('Not available yet.', 404);
  if (!can(me, 'messages.use')) return fail('Members only.', 403);

  if (p === '/api/chats' && method === 'GET') {
    const wantAll = url.searchParams.get('all') === '1' && can(me, 'messages.all');
    return json({ chats: await myChats(env, me, wantAll), canReadAll: can(me, 'messages.all'), canModerate: can(me, 'messages.reported') });
  }

  if (p === '/api/chats' && method === 'POST') {
    if (body.kind === 'dm') {
      const uid = String(body.user ?? '').slice(0, 24);
      if (!uid || uid === me.u) return fail('Pick someone to message.');
      const other = await one(env, 'SELECT id, name, avatar FROM users WHERE id = ?', uid);
      if (!other) return fail('Member not found.', 404);
      const key = [me.u, uid].sort().join(':');
      let chat = await one(env, 'SELECT * FROM chats WHERE dm_key = ?', key);
      if (!chat) {
        const at = Date.now();
        const r = await run(env, `INSERT INTO chats (kind, dm_key, created_by, created_at, last_at) VALUES ('dm', ?, ?, ?, ?)`, key, me.u, at, at);
        const id = r.meta.last_row_id;
        await env.DB.batch([
          env.DB.prepare('INSERT INTO chat_members (chat_id, user_id, name, avatar, joined_at, read_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, me.u, me.n, me.a, at, at),
          env.DB.prepare('INSERT INTO chat_members (chat_id, user_id, name, avatar, joined_at, read_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, uid, other.name, other.avatar, at, 0),
        ]);
        chat = { id };
        await log(env, me, 'chat-open', `DM · ${other.name}`);
      }
      const [members, last] = await Promise.all([
        all(env, 'SELECT * FROM chat_members WHERE chat_id = ?', chat.id),
        one(env, 'SELECT * FROM chat_messages WHERE chat_id = ? AND removed = 0 ORDER BY id DESC LIMIT 1', chat.id),
      ]);
      const full = await one(env, 'SELECT * FROM chats WHERE id = ?', chat.id);
      return json({ chat: chatOut(full, members, last, 0, me) });
    }
    if (body.kind === 'group') {
      const name = clean(body.name, 40).replace(/\n/g, ' ');
      if (!name) return fail('Give the group a name.');
      const emoji = GROUP_EMOJI.includes(body.emoji) ? body.emoji : '💬';
      const memberIds = [...new Set((Array.isArray(body.members) ? body.members : []).map(String).slice(0, GROUP_MAX))].filter((id) => id !== me.u);
      if (!memberIds.length) return fail('Add at least one other member.');
      if (memberIds.length >= GROUP_MAX) return fail(`Groups top out at ${GROUP_MAX} members.`);
      const rows = await all(env, `SELECT id, name, avatar FROM users WHERE id IN (${marks(memberIds.length)})`, ...memberIds);
      if (rows.length !== memberIds.length) return fail('One of those members was not found.');
      const at = Date.now();
      const r = await run(env, `INSERT INTO chats (kind, name, emoji, created_by, created_at, last_at) VALUES ('group', ?, ?, ?, ?, ?)`, name, emoji, me.u, at, at);
      const id = r.meta.last_row_id;
      await env.DB.batch([
        env.DB.prepare('INSERT INTO chat_members (chat_id, user_id, name, avatar, joined_at, read_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, me.u, me.n, me.a, at, at),
        ...rows.map((r2) => env.DB.prepare('INSERT INTO chat_members (chat_id, user_id, name, avatar, joined_at, read_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, r2.id, r2.name, r2.avatar, at, 0)),
      ]);
      await log(env, me, 'chat-create', `${emoji} ${name} · ${rows.length + 1} members`);
      await safely(notify(env, memberIds, { type: 'message', icon: emoji, title: `${me.n} added you to ${emoji} ${name}`, link: `messages.html#c${id}` }));
      const chat = await one(env, 'SELECT * FROM chats WHERE id = ?', id);
      const members = await all(env, 'SELECT * FROM chat_members WHERE chat_id = ?', id);
      return json({ chat: chatOut(chat, members, null, 0, me) });
    }
    return fail('Unknown chat kind.');
  }

  if (p === '/api/chats/people' && method === 'GET') { // who to start a DM/group with – own search so it never depends on the `mentions` flag
    const q = String(url.searchParams.get('q') ?? '').toLowerCase().trim().slice(0, 32);
    const like = q.replace(/[\\%_]/g, '\\$&');
    const rows = await all(env, `SELECT id, name, avatar, tag FROM users WHERE id != ?
      AND (? = '' OR lower(name) LIKE ? ESCAPE '\\' OR lower(tag) LIKE ? ESCAPE '\\') ORDER BY COALESCE(seen_at, last_at) DESC LIMIT 8`, me.u, q, `%${like}%`, `${like}%`);
    return json({ people: rows.map((r) => ({ id: r.id, n: r.name, a: opt(r.avatar), tag: opt(r.tag) })) });
  }

  if (p === '/api/chats/reports' && method === 'GET') {
    if (!can(me, 'messages.reported')) return fail('Managers only.', 403);
    const rows = await all(env, `SELECT m.*, c.kind, c.name AS chat_name, c.emoji AS chat_emoji FROM chat_messages m
      JOIN chats c ON c.id = m.chat_id WHERE m.reported_at IS NOT NULL AND m.removed = 0 ORDER BY m.reported_at DESC LIMIT 100`);
    return json({ reports: rows.map((r) => ({ ...msgOut(r), chatKind: r.kind, chatName: r.kind === 'dm' ? 'DM' : (r.chat_name || 'Group') })) });
  }
  if (p.startsWith('/api/chats/reports/') && method === 'POST') {
    if (!can(me, 'messages.reported')) return fail('Managers only.', 403);
    const mid = Number(p.slice('/api/chats/reports/'.length)) || 0;
    const msg = await one(env, 'SELECT * FROM chat_messages WHERE id = ? AND removed = 0', mid);
    if (!msg) return fail('Message not found.', 404);
    if (body.action === 'remove') {
      await run(env, 'UPDATE chat_messages SET removed = 1 WHERE id = ?', mid);
      await log(env, me, 'message-remove', `#${mid}`);
    } else if (body.action === 'clear') {
      await run(env, 'UPDATE chat_messages SET reported_at = NULL, reported_by = NULL, reported_reason = NULL WHERE id = ?', mid);
      await log(env, me, 'message-unreport', `#${mid}`);
    } else return fail('Unknown action');
    return json({ ok: true });
  }

  const m = p.match(/^\/api\/chats\/(\d+)(\/(messages|read|leave))?(\/messages\/(\d+)\/report)?$/);
  if (!m) return fail('Not found', 404);
  const id = Number(m[1]);
  const acc = await access(env, me, id);
  if (!acc) return fail('Chat not found.', 404);

  if (m[3] === 'messages' && method === 'GET') {
    const before = Number(url.searchParams.get('before')) || 0;
    const rows = await all(env, `SELECT * FROM chat_messages WHERE chat_id = ? AND removed = 0 ${before ? 'AND id < ?' : ''} ORDER BY id DESC LIMIT 50`, id, ...(before ? [before] : []));
    return json({ messages: rows.reverse().map(msgOut), more: rows.length === 50, readonly: !acc.mine });
  }
  if (m[3] === 'messages' && method === 'POST') {
    if (!acc.mine) return fail('You can only read this chat.', 403);
    const text = clean(body.text, 2000);
    if (!text) return fail('Write a message.');
    const at = Date.now();
    const r = await run(env, 'INSERT INTO chat_messages (chat_id, user_id, name, avatar, text, at) VALUES (?, ?, ?, ?, ?, ?)', id, me.u, me.n, me.a, text, at);
    await env.DB.batch([
      env.DB.prepare('UPDATE chats SET last_at = ? WHERE id = ?').bind(at, id),
      env.DB.prepare('UPDATE chat_members SET read_at = ? WHERE chat_id = ? AND user_id = ?').bind(at, id, me.u),
    ]);
    await log(env, me, 'message', acc.chat.kind === 'dm' ? 'DM' : acc.chat.name || 'group');
    const others = await all(env, 'SELECT user_id FROM chat_members WHERE chat_id = ? AND user_id != ?', id, me.u);
    if (others.length) {
      const title = acc.chat.kind === 'dm' ? `${me.n} messaged you` : `${me.n} in ${acc.chat.emoji || '💬'} ${acc.chat.name}`;
      await safely(notify(env, others.map((o) => o.user_id), { type: 'message', title, body: excerpt(text, 140), link: `messages.html#c${id}` }));
    }
    return json({ message: msgOut({ id: r.meta.last_row_id, chat_id: id, user_id: me.u, name: me.n, avatar: me.a, text, at }) });
  }
  if (m[3] === 'read' && method === 'POST') {
    if (!acc.mine) return fail('You can only read this chat.', 403);
    await run(env, 'UPDATE chat_members SET read_at = ? WHERE chat_id = ? AND user_id = ?', Date.now(), id, me.u);
    return json({ ok: true });
  }
  if (m[3] === 'leave' && method === 'POST') {
    if (!acc.mine) return fail('You can only read this chat.', 403);
    if (acc.chat.kind === 'dm') return fail("DMs can't be left – just stop replying.");
    await run(env, 'DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?', id, me.u);
    await log(env, me, 'chat-leave', acc.chat.name || 'group');
    return json({ ok: true });
  }
  if (m[4]) {
    if (!acc.mine) return fail('You can only read this chat.', 403);
    const mid = Number(m[5]);
    const msg = await one(env, 'SELECT * FROM chat_messages WHERE id = ? AND chat_id = ? AND removed = 0', mid, id);
    if (!msg) return fail('Message not found.', 404);
    if (msg.user_id === me.u) return fail('You can’t report your own message.');
    if (msg.reported_at) return fail('Already reported – the managers are on it.', 409);
    const reason = clean(body.reason, 200) || 'No reason given';
    await run(env, 'UPDATE chat_messages SET reported_at = ?, reported_by = ?, reported_reason = ? WHERE id = ?', Date.now(), me.u, reason, mid);
    await log(env, me, 'message-report', `#${mid}: ${reason}`);
    await safely(notifyManagers(env, { icon: '🚩', title: `${me.n} reported a message`, body: `“${excerpt(msg.text, 100)}” – ${reason}`, link: 'members.html#manager' }, me.u));
    return json({ ok: true });
  }
  return fail('Not found', 404);
}
