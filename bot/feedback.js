// Anonymous feedback between verified players (roadmap P4.4).
//   GET  /api/feedback          members: my inbox (no author), what I sent, who I can send to, sends left today
//   POST /api/feedback/send     verified players: { to, kind, text } – to another verified player; 3 per day; clean language
//   POST /api/feedback/read     recipient: mark my inbox read
//   POST /api/feedback/report   recipient: { id, reason } – flags it for the managers
//   GET  /api/feedback/all      managers: everything, with the author (reported first)
//   POST /api/feedback/hide     managers: { id, hidden } – hidden messages leave the recipient's inbox
// The recipient never sees who wrote it; managers always can – the send dialog says so.
import { can, flagOn } from './roles.js';
import { notify, notifyManagers, safely } from './notify.js';

export const KINDS = { praise: ['👏', 'Praise'], tip: ['💡', 'Tip'], concern: ['⚠️', 'Concern'] };
export const PER_DAY = 3;
const DAY = 86400e3;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const cleanText = (s, max) => String(s ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const opt = (v) => v ?? undefined;

// ---------- language filter ----------
// Lower-cases, undoes common l33t swaps and repeated letters, then looks for whole words (and their endings).
const WORDS = ['fuck', 'fuk', 'fck', 'shit', 'shite', 'shitty', 'cunt', 'bitch', 'bastard', 'dick', 'dickhead', 'prick', 'twat', 'wanker', 'wank', 'slut', 'whore',
  'retard', 'retarded', 'fag', 'faggot', 'nigger', 'nigga', 'spastic', 'spaz', 'motherfucker', 'asshole', 'arsehole', 'bellend', 'pussy', 'cock', 'kys'];
const PHRASES = [/kill\s*your\s*self/, /\bgo\s+die\b/, /\bneck\s+your\s*self\b/];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i', '|': 'i' };
export function unclean(text) {
  const t = String(text ?? '').toLowerCase().replace(/[013457@$!|]/g, (c) => LEET[c]).replace(/(.)\1{2,}/g, '$1$1');
  const squashed = t.replace(/[^a-z\s]/g, '');
  if (PHRASES.some((re) => re.test(squashed))) return true;
  return squashed.split(/\s+/).some((w) => WORDS.some((bad) => w === bad || w === bad + 's' || w === bad + 'ing' || w === bad + 'ed' || w === bad + 'er' || w.replace(/(.)\1+/g, '$1') === bad));
}

// Verified players (approved claim) someone can send to.
async function recipients(env, me) {
  const rows = await all(env, `SELECT u.id, u.name, u.avatar, c.player, c.player_name FROM users u JOIN claims c ON c.user_id = u.id AND c.status = 'approved' WHERE u.id != ? ORDER BY u.name`, me.u);
  return rows.map((r) => ({ id: r.id, n: r.name, a: opt(r.avatar), player: r.player, playerName: r.player_name }));
}
const sentToday = (env, me) => one(env, 'SELECT COUNT(*) AS n, MIN(at) AS first FROM feedback WHERE from_id = ? AND at > ?', me.u, Date.now() - DAY);
const inboxOut = (r) => ({ id: r.id, kind: r.kind, text: r.body, at: r.at, read: !!r.read_at, reported: !!r.reported_at });

async function state(env, me) {
  const [inbox, sent, today] = await Promise.all([
    all(env, 'SELECT * FROM feedback WHERE to_id = ? AND hidden = 0 ORDER BY at DESC LIMIT 100', me.u),
    all(env, 'SELECT * FROM feedback WHERE from_id = ? ORDER BY at DESC LIMIT 50', me.u),
    sentToday(env, me),
  ]);
  const canSend = can(me, 'feedback.send');
  return {
    inbox: inbox.map(inboxOut), unread: inbox.filter((r) => !r.read_at).length,
    sent: sent.map((r) => ({ id: r.id, to: r.to_id, toName: r.to_name, kind: r.kind, text: r.body, at: r.at, hidden: !!r.hidden })),
    canSend, left: Math.max(0, PER_DAY - today.n), nextAt: today.n >= PER_DAY ? today.first + DAY : undefined, perDay: PER_DAY,
    recipients: canSend ? await recipients(env, me) : [], kinds: KINDS, canModerate: can(me, 'feedback.authors'),
  };
}

export async function feedbackRoute(p, method, body, me, env, log) {
  if (p !== '/api/feedback' && !p.startsWith('/api/feedback/')) return null;
  if (!flagOn(env, me, 'feedback')) return fail('Not available yet.', 404);
  if (p === '/api/feedback' && method === 'GET') return json(await state(env, me));
  if (p === '/api/feedback/all' && method === 'GET') {
    if (!can(me, 'feedback.authors')) return fail('Managers only.', 403);
    const rows = await all(env, 'SELECT * FROM feedback ORDER BY (reported_at IS NOT NULL AND hidden = 0) DESC, at DESC LIMIT 200');
    return json({ items: rows.map((r) => ({ ...inboxOut(r), from: r.from_id, fromName: r.from_name, to: r.to_id, toName: r.to_name, hidden: !!r.hidden, hiddenBy: opt(r.hidden_by), report: opt(r.report), reportedAt: opt(r.reported_at) })) });
  }
  if (method !== 'POST') return fail('Not found', 404);

  if (p === '/api/feedback/send') {
    // Verified players only – a manager's rank alone isn't enough, the sender needs an approved claim too.
    if (!can(me, 'feedback.send') || !(await one(env, "SELECT 1 FROM claims WHERE user_id = ? AND status = 'approved'", me.u))) return fail('Only verified players can send feedback – claim your player first.', 403);
    const to = await one(env, "SELECT u.id, u.name FROM users u JOIN claims c ON c.user_id = u.id AND c.status = 'approved' WHERE u.id = ?", String(body.to ?? ''));
    if (!to) return fail('Pick a verified teammate.');
    if (to.id === me.u) return fail('That’s you 😉');
    if (!KINDS[body.kind]) return fail('Pick praise, a tip or a concern.');
    const text = cleanText(body.text, 500);
    if (text.length < 10) return fail('Write a bit more (10+ characters).');
    if (unclean(text)) return fail('Keep it clean – rephrase without the bad language.', 422);
    // The daily limit is checked inside the INSERT, so sending several at once can't slip past it.
    const now = Date.now();
    const ins = await run(env, `INSERT INTO feedback (from_id, from_name, to_id, to_name, kind, body, at) SELECT ?, ?, ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM feedback WHERE from_id = ? AND at > ?) < ?`, me.u, me.n, to.id, to.name, body.kind, text, now, me.u, now - DAY, PER_DAY);
    if (!ins.meta?.changes) {
      const today = await sentToday(env, me);
      return fail(`That’s ${PER_DAY} today – you can send more ${new Date(today.first + DAY).toUTCString().slice(17, 22)} UTC.`, 429);
    }
    // No message text in the bell / DM: a message managers hide later must not already sit in someone's Discord DMs.
    await safely(notify(env, [to.id], { type: 'feedback', icon: KINDS[body.kind][0], title: `New anonymous ${KINDS[body.kind][1].toLowerCase()} from a teammate – open the Squad Hub to read it`, link: 'members.html#feedback', ref: `feedback:${ins.meta.last_row_id}` }));
    await log(env, me, 'feedback-send', `${KINDS[body.kind][1]} → ${to.name}`);
    return json(await state(env, me));
  }
  if (p === '/api/feedback/read') {
    await run(env, 'UPDATE feedback SET read_at = ? WHERE to_id = ? AND read_at IS NULL', Date.now(), me.u);
    return json(await state(env, me));
  }
  if (p === '/api/feedback/report') {
    const f = await one(env, 'SELECT * FROM feedback WHERE id = ? AND to_id = ?', Number(body.id) || 0, me.u);
    if (!f) return fail('Message not found.', 404);
    if (f.reported_at) return fail('Already reported – the managers are on it.', 409);
    const reason = cleanText(body.reason, 200) || 'No reason given';
    await run(env, 'UPDATE feedback SET report = ?, reported_at = ? WHERE id = ?', reason, Date.now(), f.id);
    await safely(notifyManagers(env, { type: 'queue', icon: '🚩', title: 'Anonymous feedback reported', body: `${f.to_name ?? 'A member'}: “${reason.slice(0, 80)}”`, link: 'members.html#feedback' }));
    await log(env, me, 'feedback-report', `#${f.id}`);
    return json(await state(env, me));
  }
  if (p === '/api/feedback/hide') {
    if (!can(me, 'feedback.authors')) return fail('Managers only.', 403);
    const hidden = body.hidden !== false;
    const r = await run(env, 'UPDATE feedback SET hidden = ?, hidden_by = ?, hidden_at = ? WHERE id = ?', hidden ? 1 : 0, hidden ? me.n : null, hidden ? Date.now() : null, Number(body.id) || 0);
    if (!r.meta?.changes) return fail('Message not found.', 404);
    if (hidden) await run(env, 'DELETE FROM notifications WHERE ref = ?', `feedback:${Number(body.id)}`); // and its bell note
    await log(env, me, hidden ? 'feedback-hide' : 'feedback-unhide', `#${body.id}`);
    return json({ ok: true, hidden });
  }
  return fail('Not found', 404);
}
