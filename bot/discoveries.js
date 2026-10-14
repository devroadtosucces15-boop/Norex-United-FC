// Discoveries – members share something worth knowing (a tip, a setting, a clip), a manager approves it, the club sees it.
//   /share title tip [link]   any member: sends it to the managers (3 waiting at a time)
//   /discoveries              managers: what's waiting, with Approve / Reject buttons right there
//   approved → a gold panel in the announce channel with "👍 Useful · n" (a toggle) and the link
//   GET  /api/discoveries?limit=20            approved ones, newest first (members) – flag `discoveries`
//   POST /api/discoveries/useful { id }       toggle "useful" on one
// Everything is in the design system (bot/ui.js). Rejected shares are kept but never shown.
import { can, flagOn } from './roles.js';
import { message, notice, reply, header, text, sep, footer, buttons } from './ui.js';
import { notify, notifyManagers, safely } from './notify.js';
import { postEmbed } from './docs.js';

export const DISCOVERY_COMMANDS = new Set(['share', 'discoveries']);
export const DISCOVERY_BUTTON = /^norex:dc:/;
const MAX_WAITING = 3;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, n);
const say = (title, body) => reply(notice(title, body));
const upd = (m) => ({ type: 7, data: { components: m.components, allowed_mentions: { parse: [] } } });
const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results ?? []);
const site = (env) => String(env.SITE_URL || '').replace(/\/?$/, '/');

// Only plain web links – nothing that runs, nothing without a host.
export function cleanLink(v) {
  const x = clean(v, 300);
  if (!x) return '';
  try {
    const u = new URL(x);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    return u.toString();
  } catch { return null; }
}

// ---------- the approved panel ----------
export function discoveryPanel(row, useful, env = {}) {
  return message({ accent: 'gold', mentions: { parse: [] }, blocks: [
    header({ eyebrow: 'NOREX UNITED · Discovery', title: row.title, sub: `Shared by <@${row.user_id}>${row.approved_by ? ` · approved by <@${row.approved_by}>` : ''}`, size: 3 }),
    text(row.body),
    sep(),
    buttons([{ label: `👍 Useful · ${useful}`, id: `norex:dc:useful:${row.id}` }, row.link && { label: 'Open link', url: row.link }, { label: 'On the site', url: `${site(env)}members.html#discoveries` }]),
  ] });
}
const usefulCount = async (env, id) => (await one(env, 'SELECT COUNT(*) AS n FROM discovery_useful WHERE discovery_id = ?', id))?.n ?? 0;

// ---------- /share ----------
async function share(i, env, now) {
  const o = Object.fromEntries((i.data?.options ?? []).map((x) => [x.name, x.value]));
  const me = i.member?.user?.id ?? i.user?.id;
  const title = clean(o.title, 100), body = clean(o.tip, 600);
  if (title.length < 4 || body.length < 10) return say('Add a bit more', 'A short title and a tip of at least a sentence.');
  const link = o.link ? cleanLink(o.link) : '';
  if (link === null) return say('That link doesn’t look right', 'Use a full web address starting with https://');
  const waiting = (await one(env, "SELECT COUNT(*) AS n FROM discoveries WHERE user_id = ? AND status = 'pending'", me))?.n ?? 0;
  if (waiting >= MAX_WAITING) return say('You have three waiting already', 'Give the managers a moment to look at those first.');
  const name = clean(i.member?.nick || i.member?.user?.global_name || i.member?.user?.username || 'A member', 40);
  const res = await env.DB.prepare('INSERT INTO discoveries (user_id, name, title, body, link, status, at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(me, name, title, body, link || null, 'pending', now).run();
  await safely(notifyManagers(env, { icon: '🔎', title: `New discovery to approve: ${title}`, body: `From ${name}`, link: 'members.html#manager' }, me));
  return reply(notice('Sent to the managers', `“${title}” will show up here and on the site once a manager approves it.`, { accent: 'win' }));
}

// ---------- /discoveries (managers) ----------
const queueRows = (env) => all(env, "SELECT * FROM discoveries WHERE status = 'pending' ORDER BY at LIMIT 5");
async function queuePanel(env) {
  const rows = await queueRows(env);
  if (!rows.length) return message({ ephemeral: true, accent: 'steel', blocks: [text('**Nothing waiting**\nEvery discovery has been looked at.')] });
  const total = (await one(env, "SELECT COUNT(*) AS n FROM discoveries WHERE status = 'pending'"))?.n ?? rows.length;
  return message({ ephemeral: true, accent: 'steel', blocks: [
    header({ eyebrow: 'Staff · Discoveries', title: `🔎 ${total} waiting`, sub: total > rows.length ? `Showing the oldest ${rows.length}` : undefined, size: 3 }),
    ...rows.flatMap((r, k) => [k ? sep() : null, text(`**${r.title}**\nFrom <@${r.user_id}>\n${r.body}${r.link ? `\n${r.link}` : ''}`),
      { type: 1, components: [{ type: 2, style: 3, label: 'Approve', custom_id: `norex:dc:ok:${r.id}` }, { type: 2, style: 4, label: 'Reject', custom_id: `norex:dc:no:${r.id}` }] }]),
  ] });
}

async function decide(i, env, who, id, approve, now) {
  const row = await one(env, 'SELECT * FROM discoveries WHERE id = ?', id);
  if (!row || row.status !== 'pending') return upd(await queuePanel(env));
  const me = i.member?.user?.id ?? i.user?.id;
  await env.DB.prepare('UPDATE discoveries SET status = ?, approved_by = ?, decided_at = ? WHERE id = ?').bind(approve ? 'approved' : 'rejected', me, now, id).run();
  if (approve) {
    const channel = (await one(env, "SELECT value FROM meta WHERE key = 'announce_channel'"))?.value;
    const posted = channel ? await postEmbed(env, channel, '', discoveryPanel({ ...row, approved_by: me }, 0, env)).catch(() => null) : null;
    if (posted?.ok) await env.DB.prepare('UPDATE discoveries SET discord_at = ? WHERE id = ?').bind(now, id).run();
  }
  await safely(notify(env, [row.user_id], approve
    ? { type: 'idea', icon: '🔎', title: `Your discovery is live: ${row.title}`, body: 'Thanks for sharing it with the squad.', link: 'members.html#discoveries' }
    : { type: 'idea', icon: '🔎', title: `Your discovery wasn’t used: ${row.title}`, body: 'A manager decided not to share this one. Keep them coming.', link: 'members.html#discoveries' }));
  return upd(await queuePanel(env));
}

async function toggleUseful(i, env, id) {
  const row = await one(env, "SELECT * FROM discoveries WHERE id = ? AND status = 'approved'", id);
  if (!row) return say('That discovery is gone', 'It may have been removed.');
  const me = i.member?.user?.id ?? i.user?.id;
  const had = await one(env, 'SELECT 1 AS x FROM discovery_useful WHERE discovery_id = ? AND user_id = ?', id, me);
  if (had) await env.DB.prepare('DELETE FROM discovery_useful WHERE discovery_id = ? AND user_id = ?').bind(id, me).run();
  else await env.DB.prepare('INSERT OR IGNORE INTO discovery_useful (discovery_id, user_id) VALUES (?, ?)').bind(id, me).run();
  return upd(discoveryPanel(row, await usefulCount(env, id), env));
}

// ---------- entry points ----------
export async function discoveryCommand(i, env, ctx, who, now = Date.now()) {
  if (!flagOn(env, who, 'discoveries')) return say('This isn’t switched on yet', 'Discoveries are being tested.');
  if (!env.DB) return say('The member database isn’t connected');
  try {
    if (i.data.name === 'share') {
      if (!can(who, 'discoveries.share')) return say('Members only', 'Link your Discord account on the site first.');
      return await share(i, env, now);
    }
    if (!can(who, 'discoveries.manage')) return say('Only managers can use /discoveries', 'Ask a manager to look at the waiting ones.');
    return reply(await queuePanel(env));
  } catch (e) {
    return say('Something went wrong', String(e.message ?? e).slice(0, 200));
  }
}

export async function discoveryButton(i, env, who, now = Date.now()) {
  if (!flagOn(env, who, 'discoveries')) return say('This isn’t switched on yet');
  if (!env.DB) return say('The member database isn’t connected');
  const [, , kind, a] = String(i.data?.custom_id ?? '').split(':');
  try {
    if (kind === 'ok' || kind === 'no') {
      if (!can(who, 'discoveries.manage')) return say('Managers only', 'Only a manager can approve or reject.');
      return await decide(i, env, who, Number(a), kind === 'ok', now);
    }
    if (kind === 'useful') {
      if (!can(who, 'discoveries.share')) return say('Members only', 'Link your Discord account on the site first.');
      return await toggleUseful(i, env, Number(a));
    }
  } catch (e) {
    return say('Something went wrong', String(e.message ?? e).slice(0, 200));
  }
  return say('Unknown button');
}

// ---------- site API ----------
export async function discoveriesRoute(p, method, body, me, env) {
  if (p !== '/api/discoveries' && p !== '/api/discoveries/useful') return null;
  if (!flagOn(env, me, 'discoveries')) return fail('Not available yet.', 404);
  if (!can(me, 'discoveries.share')) return fail('Members only.', 403);
  if (p === '/api/discoveries/useful') {
    if (method !== 'POST') return fail('Not found', 404);
    const id = Number(body?.id);
    const row = await one(env, "SELECT id FROM discoveries WHERE id = ? AND status = 'approved'", id);
    if (!row) return fail('Discovery not found.', 404);
    const had = await one(env, 'SELECT 1 AS x FROM discovery_useful WHERE discovery_id = ? AND user_id = ?', id, me.u);
    if (had) await env.DB.prepare('DELETE FROM discovery_useful WHERE discovery_id = ? AND user_id = ?').bind(id, me.u).run();
    else await env.DB.prepare('INSERT OR IGNORE INTO discovery_useful (discovery_id, user_id) VALUES (?, ?)').bind(id, me.u).run();
    return json({ id, useful: await usefulCount(env, id), mine: !had });
  }
  if (method !== 'GET') return fail('Not found', 404);
  const rows = await all(env, `SELECT d.*, (SELECT COUNT(*) FROM discovery_useful x WHERE x.discovery_id = d.id) AS useful,
      EXISTS (SELECT 1 FROM discovery_useful x WHERE x.discovery_id = d.id AND x.user_id = ?) AS mine
    FROM discoveries d WHERE d.status = 'approved' ORDER BY d.decided_at DESC, d.id DESC LIMIT 50`, me.u);
  return json(rows.map((r) => ({
    id: r.id, title: r.title, body: r.body, link: r.link, image: null,
    by: { id: r.user_id, name: r.name }, approvedBy: r.approved_by ? { id: r.approved_by } : null,
    at: Math.floor((r.decided_at ?? r.at) / 1000), useful: r.useful, mine: !!r.mine,
  })));
}
