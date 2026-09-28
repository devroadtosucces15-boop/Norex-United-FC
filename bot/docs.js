// Club knowledge & management (roadmap P5.1 Play Style, P5.2 documentation hub, P5.3 announcements to Discord,
// P5.4 suggestion box). One engine for every managed text: rows of `docs`, each edit versioned in `doc_versions`.
//   GET  /api/docs                 docs hub (flag `docs`): guests get items marked public, members everything;
//                                  + the rules version and whether I acknowledged it
//   POST /api/docs                 managers: create / edit { id?, area, title, body, pinned, public, ack, notify, discord }
//   POST /api/docs/remove          managers: take an item down (kept with removed_at)
//   GET  /api/docs/history?id=     managers: every version of one item;  POST /api/docs/restore { id, version }
//   POST /api/docs/ack             members: acknowledge the current rules
//   GET  /api/docs/acks            managers: who has / hasn't acknowledged;  POST /api/docs/remind – nudge the rest
//   GET  /api/docs/discord         managers: text channels + roles to pick from (P5.3)
//   POST /api/docs/discord         managers: post an item to a Discord channel { id, channel, role }
//   GET/POST /api/playstyle        Play Style per mode + section (flag `playStyle`, members read, managers edit)
//   GET/POST /api/suggestions (+ /vote /decide /remove)   suggestion box (flag `suggestions`)
// Text is "markdown-lite" (headings, bold, italics, lists, links, image + video lines) rendered by web/docs-md.js.
import { can, flagOn } from './roles.js';
import { notify, notifyManagers, notifyMembers, safely } from './notify.js';

const DAY = 86400e3;
const AREAS = { announce: 'Announcement', requirements: 'Requirement', rules: 'Rule', faq: 'FAQ', glossary: 'Glossary term' };
const PS_MODES = ['league', 'rush'];
const PS_SECTIONS = { philosophy: 'Philosophy', formations: 'Formations', positions: 'Position by position', setpieces: 'Set pieces', tactics: 'Tactics & instructions' };
const MAX_DOCS = 400;
const MAX_BODY = 8000;
const SUG_DAILY = 5;
const SUG_STATUS = ['open', 'planned', 'done', 'declined'];
const RED = 0xc8352c;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
// Long text keeps newlines (and '>' for quotes); web/docs-md.js escapes everything before formatting.
const cleanBody = (s, max) => String(s ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const opt = (v) => v ?? undefined;

const docOut = (r, manager) => ({
  id: r.id, area: r.area, mode: opt(r.mode), section: opt(r.section), title: r.title, body: r.body, pinned: !!r.pinned, public: !!r.public,
  version: r.version, by: opt(r.by_name), at: r.at, editedBy: opt(r.edited_by), editedAt: opt(r.edited_at),
  ...(manager && r.discord_at ? { discord: { channel: r.discord_channel, at: r.discord_at } } : {}),
});

// ---------- rules version + acknowledgements ----------
const rulesVersion = async (env) => Number((await one(env, "SELECT value FROM meta WHERE key = 'rules_version'"))?.value) || 0;
async function rulesState(env, me) {
  const v = await rulesVersion(env);
  if (!me || !v) return { version: v, acked: !v };
  const a = await one(env, 'SELECT at FROM doc_acks WHERE user_id = ? AND version = ?', me.u, v);
  return { version: v, acked: !!a, ackedAt: opt(a?.at) };
}
async function bumpRules(env, me, title) {
  const v = (await rulesVersion(env)) + 1;
  await run(env, "INSERT INTO meta (key, value) VALUES ('rules_version', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", String(v));
  await run(env, "INSERT INTO meta (key, value) VALUES ('rules_at', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", String(Date.now()));
  // The person who changed the rules has obviously read them.
  await run(env, 'INSERT OR IGNORE INTO doc_acks (user_id, version, name, avatar, at) VALUES (?, ?, ?, ?, ?)', me.u, v, me.n, me.a ?? null, Date.now());
  await safely(notifyMembers(env, { type: 'announce', icon: '📜', title: 'Club rules updated – please read and acknowledge', body: `Changed: ${title}`, link: 'docs.html#rules', ack: true, ref: `rules:${v}` }));
  return v;
}

// ---------- docs hub ----------
export async function docsList(env, me) {
  const member = !!me && can(me, 'docs.read');
  const manager = !!me && can(me, 'content.edit');
  const rows = await all(env, `SELECT * FROM docs WHERE removed_at IS NULL AND area != 'playstyle'${member ? '' : ' AND public = 1'} ORDER BY pinned DESC, id LIMIT ?`, MAX_DOCS);
  return {
    items: rows.map((r) => docOut(r, manager)),
    rules: member ? await rulesState(env, me) : undefined,
    canEdit: manager, canDiscord: !!me && can(me, 'announce.discord') && !!env.DISCORD_BOT_TOKEN,
  };
}

// Writes a new version of an existing row (old text → doc_versions) or inserts one. Returns the row id.
async function writeDoc(env, me, row, fields) {
  const now = Date.now();
  if (!row) {
    const r = await run(env, `INSERT INTO docs (area, mode, section, title, body, pinned, public, by_id, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      fields.area, fields.mode ?? null, fields.section ?? null, fields.title, fields.body, fields.pinned ? 1 : 0, fields.public ? 1 : 0, me.u, me.n, now);
    return { id: r.meta.last_row_id, changed: true };
  }
  const changed = row.title !== fields.title || row.body !== fields.body;
  if (changed) {
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO doc_versions (doc_id, version, title, body, by_name, at) VALUES (?, ?, ?, ?, ?, ?)').bind(row.id, row.version, row.title, row.body, row.edited_by ?? row.by_name, row.edited_at ?? row.at),
      env.DB.prepare('UPDATE docs SET title = ?, body = ?, version = version + 1, edited_by = ?, edited_at = ? WHERE id = ?').bind(fields.title, fields.body, me.n, now, row.id),
    ]);
  }
  await run(env, 'UPDATE docs SET pinned = ?, public = ? WHERE id = ?', fields.pinned ? 1 : 0, fields.public ? 1 : 0, row.id);
  return { id: row.id, changed };
}

async function saveDoc(body, me, env, log) {
  if (!can(me, 'content.edit')) return fail('Managers only.', 403);
  const row = body.id ? await one(env, "SELECT * FROM docs WHERE id = ? AND removed_at IS NULL AND area != 'playstyle'", Number(body.id) || 0) : null;
  if (body.id && !row) return fail('That item no longer exists.', 404);
  const area = row?.area ?? body.area;
  if (!AREAS[area]) return fail('Pick a section.');
  const title = clean(body.title, 120), text = cleanBody(body.body, MAX_BODY);
  if (title.length < 3) return fail('Give it a title (3+ characters).');
  if (area !== 'announce' && !text) return fail('Write something first.');
  if (!row && (await one(env, 'SELECT COUNT(*) AS n FROM docs WHERE removed_at IS NULL')).n >= MAX_DOCS) return fail('That’s a lot of documents – remove an old one first.', 429);
  const { id, changed } = await writeDoc(env, me, row, { area, title, body: text, pinned: !!body.pinned, public: !!body.public });
  await log(env, me, row ? 'doc-edit' : 'doc-new', `${AREAS[area]} · ${title}`);
  const out = { id };
  if (area === 'rules' && body.ack && (changed || !row)) out.rulesVersion = await bumpRules(env, me, title);
  if (area === 'announce' && body.notify) {
    out.notified = await safely(notifyMembers(env, { type: 'announce', title, body: plain(text).slice(0, 600) || null, link: `docs.html#d-${id}`, ack: !!body.ack })) ?? 0;
  }
  if (body.discord?.channel) out.discord = await postDoc(env, me, id, body.discord, log);
  return json({ ...out, ...(await docsList(env, me)) });
}

// Plain text for DMs / Discord: markdown-lite → readable text (image lines dropped, headings bold).
export function plain(md, discord = false) {
  return String(md ?? '').split('\n').filter((l) => !IMG_LINE.test(l.trim()))
    .map((l) => l.replace(/^#{1,3}\s+(.+)$/, discord ? '**$1**' : '$1').replace(/^>\s?/, discord ? '> ' : ''))
    .map((l) => (discord ? l : l.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\((https:[^)\s]+)\)/g, '$1 ($2)')))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
const IMG_LINE = /^https:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i;

// ---------- P5.3 Discord ----------
const DISCORD_HELP = {
  50013: 'The bot is missing a permission in that channel – it needs View Channel, Send Messages and Embed Links (and Mention Everyone to ping @everyone or a role that isn’t mentionable).',
  50001: 'The bot can’t see that channel – give its role View Channel there.',
  10003: 'That channel no longer exists – pick another one.',
  setup: 'The bot token isn’t set up on the Worker yet.',
};
const discord = (env, path, init = {}) => fetch(`https://discord.com/api/v10${path}`, {
  ...init, headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
});
export async function discordTargets(env) {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return { ready: false, error: DISCORD_HELP.setup };
  const [c, r] = await Promise.all([discord(env, `/guilds/${env.DISCORD_GUILD_ID}/channels`), discord(env, `/guilds/${env.DISCORD_GUILD_ID}/roles`)]);
  if (!c.ok || !r.ok) return { ready: false, error: `Discord said ${c.ok ? r.status : c.status} – is the bot in the server?` };
  const [channels, roles] = await Promise.all([c.json(), r.json()]);
  return {
    ready: true,
    channels: channels.filter((x) => x.type === 0 || x.type === 5).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((x) => ({ id: x.id, name: x.name, news: x.type === 5 })),
    roles: roles.filter((x) => !x.managed).sort((a, b) => (b.position ?? 0) - (a.position ?? 0)).map((x) => ({ id: x.id, name: x.id === env.DISCORD_GUILD_ID ? '@everyone' : x.name })),
    last: opt((await one(env, "SELECT value FROM meta WHERE key = 'announce_channel'"))?.value),
  };
}
// Sends one message to a channel, pinging `role` (the guild id = @everyone) and nobody else. Never throws.
// Shared with P3.1 events. Returns { ok, id } or { ok: false, error } with a human explanation.
export async function postEmbed(env, channel, role, message) {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return { ok: false, error: DISCORD_HELP.setup };
  channel = String(channel ?? ''); role = String(role ?? '');
  if (!/^\d{5,25}$/.test(channel)) return { ok: false, error: 'Pick a channel.' };
  if (role && !/^\d{1,25}$/.test(role)) return { ok: false, error: 'Pick a role to ping, or none.' };
  const everyone = role && role === env.DISCORD_GUILD_ID;
  const msg = {
    ...message,
    content: role ? `${everyone ? '@everyone' : `<@&${role}>`}${message.content ? ` ${message.content}` : ''}` : message.content,
    allowed_mentions: role ? (everyone ? { parse: ['everyone'] } : { roles: [role] }) : { parse: [] },
  };
  let r;
  try { r = await discord(env, `/channels/${channel}/messages`, { method: 'POST', body: JSON.stringify(msg) }); } catch (e) { return { ok: false, error: e.message }; }
  const res = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: DISCORD_HELP[res.code] ?? `Discord refused the post (${r.status}${res.message ? `: ${res.message}` : ''}).` };
  await run(env, "INSERT INTO meta (key, value) VALUES ('announce_channel', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", channel);
  return { ok: true, id: res.id };
}
// Posts one docs item as a rich embed. Never throws – returns { ok } or { ok: false, error } for the UI.
async function postDoc(env, me, id, target, log) {
  if (!can(me, 'announce.discord')) return { ok: false, error: 'Managers only.' };
  const channel = String(target.channel ?? ''), role = String(target.role ?? '');
  const d = await one(env, 'SELECT * FROM docs WHERE id = ? AND removed_at IS NULL', id);
  if (!d) return { ok: false, error: 'That item no longer exists.' };
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/');
  const img = d.body.split('\n').map((l) => l.trim()).find((l) => IMG_LINE.test(l));
  const res = await postEmbed(env, channel, role, {
    embeds: [{
      title: `${{ announce: '📣', rules: '📜', requirements: '✅', faq: '❓', glossary: '📖', playstyle: '🧠' }[d.area] ?? '📣'} ${d.title}`.slice(0, 250),
      description: plain(d.body, true).slice(0, 3900) || undefined,
      url: `${site}docs.html#d-${d.id}`, color: RED, timestamp: new Date(d.edited_at ?? d.at).toISOString(),
      ...(img ? { image: { url: img } } : {}),
      author: { name: me.n }, footer: { text: 'NOREX UNITED · club announcements' },
    }],
    components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Open on the site', url: `${site}docs.html#d-${d.id}` }] }],
  });
  if (!res.ok) return res;
  await run(env, 'UPDATE docs SET discord_channel = ?, discord_msg = ?, discord_at = ? WHERE id = ?', channel, res.id ?? null, Date.now(), d.id);
  await log(env, me, 'doc-discord', `${d.title}${role ? ` · ping ${role === env.DISCORD_GUILD_ID ? '@everyone' : 'role'}` : ''}`);
  return { ok: true };
}

// ---------- routes ----------
async function docsRoute(p, method, body, me, env, log, url) {
  if (!flagOn(env, me, 'docs')) return fail('Not available yet.', 404);
  if (p === '/api/docs' && method === 'GET') return json(await docsList(env, me));
  if (p === '/api/docs/ack' && method === 'POST') {
    if (!can(me, 'docs.ack')) return fail('Members only.', 403);
    const v = await rulesVersion(env);
    if (!v) return fail('There are no rules to acknowledge yet.', 409);
    await run(env, 'INSERT OR IGNORE INTO doc_acks (user_id, version, name, avatar, at) VALUES (?, ?, ?, ?, ?)', me.u, v, me.n, me.a ?? null, Date.now());
    // The matching "please acknowledge" notifications (this version and older) stop nagging too.
    await run(env, "UPDATE notifications SET ack_at = ?, read_at = COALESCE(read_at, ?) WHERE user_id = ? AND ack = 1 AND ack_at IS NULL AND ref LIKE 'rules:%'", Date.now(), Date.now(), me.u);
    await log(env, me, 'rules-ack', `version ${v}`);
    return json(await docsList(env, me));
  }
  if (!can(me, 'content.edit')) return fail('Managers only.', 403);
  if (p === '/api/docs' && method === 'POST') return saveDoc(body, me, env, log);
  if (p === '/api/docs/remove' && method === 'POST') {
    const row = await one(env, "SELECT * FROM docs WHERE id = ? AND removed_at IS NULL AND area != 'playstyle'", Number(body.id) || 0);
    if (!row) return fail('That item no longer exists.', 404);
    await run(env, 'UPDATE docs SET removed_at = ? WHERE id = ?', Date.now(), row.id);
    await log(env, me, 'doc-remove', `${AREAS[row.area] ?? row.area} · ${row.title}`);
    return json(await docsList(env, me));
  }
  if (p === '/api/docs/history' && method === 'GET') {
    const row = await one(env, 'SELECT * FROM docs WHERE id = ?', Number(url?.searchParams.get('id')) || 0);
    if (!row) return fail('That item no longer exists.', 404);
    const old = await all(env, 'SELECT * FROM doc_versions WHERE doc_id = ? ORDER BY version DESC LIMIT 50', row.id);
    return json({ doc: docOut(row, true), versions: [{ version: row.version, title: row.title, body: row.body, by: row.edited_by ?? row.by_name, at: row.edited_at ?? row.at, current: true }, ...old.map((v) => ({ version: v.version, title: v.title, body: v.body, by: opt(v.by_name), at: v.at }))] });
  }
  if (p === '/api/docs/restore' && method === 'POST') {
    const row = await one(env, 'SELECT * FROM docs WHERE id = ? AND removed_at IS NULL', Number(body.id) || 0);
    const v = row && await one(env, 'SELECT * FROM doc_versions WHERE doc_id = ? AND version = ?', row.id, Number(body.version) || 0);
    if (!v) return fail('That version no longer exists.', 404);
    await writeDoc(env, me, row, { title: v.title, body: v.body, pinned: row.pinned, public: row.public });
    await log(env, me, 'doc-restore', `${row.title} → version ${v.version}`);
    return json({ id: row.id, ...(await docsList(env, me)) });
  }
  if (p === '/api/docs/acks' && method === 'GET') return json(await ackList(env));
  if (p === '/api/docs/remind' && method === 'POST') {
    const last = Number((await one(env, "SELECT value FROM meta WHERE key = 'rules_remind_at'"))?.value) || 0;
    if (Date.now() - last < DAY / 2) return fail('A reminder already went out in the last 12 hours.', 429);
    const a = await ackList(env);
    if (!a.version) return fail('There are no rules to acknowledge yet.', 409);
    const sent = a.missing.length ? await notify(env, a.missing.map((m) => m.id), { type: 'announce', icon: '📜', title: 'Reminder: please read and acknowledge the club rules', link: 'docs.html#rules', ack: true, ref: `rules:${a.version}` }) : 0;
    await run(env, "INSERT INTO meta (key, value) VALUES ('rules_remind_at', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", String(Date.now()));
    await log(env, me, 'rules-remind', `${sent} members`);
    return json({ ...a, sent });
  }
  if (p === '/api/docs/discord') {
    if (!can(me, 'announce.discord')) return fail('Managers only.', 403);
    if (method === 'GET') return json(await discordTargets(env));
    const res = await postDoc(env, me, Number(body.id) || 0, body, log);
    return res.ok ? json({ discord: res, ...(await docsList(env, me)) }) : fail(res.error, 400);
  }
  return fail('Not found', 404);
}

// Active members (logged in within 180 days) split by whether they acknowledged the current rules.
async function ackList(env) {
  const v = await rulesVersion(env);
  const [users, acks] = await Promise.all([
    all(env, 'SELECT id, name, avatar, role, last_at FROM users WHERE last_at > ? ORDER BY name', Date.now() - 180 * DAY),
    all(env, 'SELECT user_id, at FROM doc_acks WHERE version = ?', v),
  ]);
  const at = new Map(acks.map((a) => [a.user_id, a.at]));
  const who = (u) => ({ id: u.id, n: u.name, a: opt(u.avatar), role: u.role, last: u.last_at });
  return {
    version: v, updatedAt: Number((await one(env, "SELECT value FROM meta WHERE key = 'rules_at'"))?.value) || undefined,
    acked: users.filter((u) => at.has(u.id)).map((u) => ({ ...who(u), at: at.get(u.id) })),
    missing: v ? users.filter((u) => !at.has(u.id)).map(who) : [],
  };
}

// ---------- P5.1 Play Style ----------
async function playStyle(env, me) {
  const rows = await all(env, "SELECT * FROM docs WHERE area = 'playstyle' AND removed_at IS NULL");
  return { sections: rows.map((r) => docOut(r, false)), canEdit: can(me, 'content.edit'), modes: PS_MODES, names: PS_SECTIONS };
}
async function playStyleRoute(method, body, me, env, log) {
  if (!flagOn(env, me, 'playStyle')) return fail('Not available yet.', 404);
  if (!can(me, 'docs.read')) return fail('Members only.', 403);
  if (method === 'GET') return json(await playStyle(env, me));
  if (!can(me, 'content.edit')) return fail('Managers only.', 403);
  if (!PS_MODES.includes(body.mode) || !PS_SECTIONS[body.section]) return fail('Pick League or Rush and a section.');
  const title = clean(body.title, 80) || PS_SECTIONS[body.section];
  const text = cleanBody(body.body, MAX_BODY);
  const row = await one(env, "SELECT * FROM docs WHERE area = 'playstyle' AND mode = ? AND section = ? AND removed_at IS NULL", body.mode, body.section);
  const { id } = await writeDoc(env, me, row, { area: 'playstyle', mode: body.mode, section: body.section, title, body: text, pinned: 0, public: 0 });
  await log(env, me, 'playstyle-edit', `${body.mode === 'rush' ? 'Rush' : 'League'} · ${PS_SECTIONS[body.section]}`);
  return json({ id, ...(await playStyle(env, me)) });
}

// ---------- P5.4 suggestion box ----------
async function suggestions(env, me) {
  const manager = can(me, 'suggest.decide');
  const [rows, votes] = await Promise.all([
    all(env, 'SELECT * FROM suggestions WHERE removed_at IS NULL ORDER BY id DESC LIMIT 300'),
    all(env, 'SELECT suggestion_id FROM suggestion_votes WHERE user_id = ?', me.u),
  ]);
  const mine = new Set(votes.map((v) => v.suggestion_id));
  return {
    items: rows.map((r) => {
      const own = r.by_id === me.u;
      return {
        id: r.id, title: r.title, body: opt(r.body), status: r.status, up: r.up, voted: mine.has(r.id), own, anon: !!r.anon, at: r.at,
        by: !r.anon || own || manager ? { id: r.by_id, n: r.by_name, a: opt(r.by_avatar) } : null,
        reply: opt(r.reply), repliedBy: opt(r.replied_by), repliedAt: opt(r.replied_at),
      };
    }),
    canDecide: manager, canSend: can(me, 'suggest.send'),
  };
}
async function suggestionsRoute(p, method, body, me, env, log) {
  if (!flagOn(env, me, 'suggestions')) return fail('Not available yet.', 404);
  if (!can(me, 'suggest.send')) return fail('Members only.', 403);
  if (p === '/api/suggestions' && method === 'GET') return json(await suggestions(env, me));
  if (method !== 'POST') return fail('Not found', 404);
  if (p === '/api/suggestions') {
    const title = clean(body.title, 100), text = cleanBody(body.body, 1000);
    if (title.length < 4) return fail('Sum the idea up in a few words (4+ characters).');
    const today = await one(env, 'SELECT COUNT(*) AS n FROM suggestions WHERE by_id = ? AND at > ?', me.u, Date.now() - DAY);
    if (today.n >= SUG_DAILY) return fail(`That’s ${SUG_DAILY} ideas today – keep the rest for tomorrow.`, 429);
    if (await one(env, "SELECT id FROM suggestions WHERE lower(title) = lower(?) AND removed_at IS NULL AND status IN ('open', 'planned')", title)) return fail('That idea is already on the board – vote it up instead.', 409);
    await run(env, 'INSERT INTO suggestions (title, body, anon, by_id, by_name, by_avatar, at) VALUES (?, ?, ?, ?, ?, ?, ?)', title, text || null, body.anon ? 1 : 0, me.u, me.n, me.a ?? null, Date.now());
    await safely(notifyManagers(env, { icon: '💡', title: `New suggestion: ${title}`, body: `${body.anon ? 'Anonymous to members – you can see the author in the list.' : `From ${me.n}`}${text ? `\n“${text.slice(0, 300)}”` : ''}`, link: 'members.html#ideas' }, me.u));
    await log(env, me, 'suggest', title);
    return json(await suggestions(env, me));
  }
  const row = await one(env, 'SELECT * FROM suggestions WHERE id = ? AND removed_at IS NULL', Number(body.id) || 0);
  if (!row) return fail('That suggestion no longer exists.', 404);
  if (p === '/api/suggestions/vote') {
    if (!can(me, 'suggest.vote')) return fail('Members only.', 403);
    if (row.by_id === me.u) return fail('You can’t vote for your own idea.');
    if (body.on) await run(env, 'INSERT OR IGNORE INTO suggestion_votes (suggestion_id, user_id, at) VALUES (?, ?, ?)', row.id, me.u, Date.now());
    else await run(env, 'DELETE FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?', row.id, me.u);
    await run(env, 'UPDATE suggestions SET up = (SELECT COUNT(*) FROM suggestion_votes WHERE suggestion_id = ?) WHERE id = ?', row.id, row.id);
    return json(await suggestions(env, me));
  }
  if (p === '/api/suggestions/decide') {
    if (!can(me, 'suggest.decide')) return fail('Managers only.', 403);
    if (!SUG_STATUS.includes(body.status)) return fail('Pick a status.');
    const reply = cleanBody(body.reply, 500) || null;
    await run(env, 'UPDATE suggestions SET status = ?, reply = ?, replied_by = ?, replied_at = ? WHERE id = ?', body.status, reply, reply || body.status !== 'open' ? me.n : null, reply || body.status !== 'open' ? Date.now() : null, row.id);
    await log(env, me, 'suggest-status', `${row.title} → ${body.status}`);
    if (row.by_id !== me.u && (body.status !== row.status || reply !== row.reply)) {
      const label = { open: '💭 Open again', planned: '🗓️ Planned', done: '✅ Done', declined: '🚫 Not for now' }[body.status];
      await safely(notify(env, [row.by_id], { type: 'idea', title: `Your idea “${row.title.slice(0, 60)}”: ${label}`, body: reply ? `${me.n}: ${reply}` : null, link: 'members.html#ideas' }));
    }
    return json(await suggestions(env, me));
  }
  if (p === '/api/suggestions/remove') {
    if (row.by_id !== me.u && !can(me, 'suggest.decide')) return fail('Only the author or a manager can remove it.', 403);
    await run(env, 'UPDATE suggestions SET removed_at = ? WHERE id = ?', Date.now(), row.id);
    await log(env, me, 'suggest-remove', row.title);
    return json(await suggestions(env, me));
  }
  return fail('Not found', 404);
}

// Routes behind login (called from members.js route()). Returns null when the path isn't ours.
export async function knowledgeRoute(p, method, body, me, env, log, url) {
  if (p === '/api/docs' || p.startsWith('/api/docs/')) return docsRoute(p, method, body, me, env, log, url);
  if (p === '/api/playstyle') return playStyleRoute(method, body, me, env, log);
  if (p === '/api/suggestions' || p.startsWith('/api/suggestions/')) return suggestionsRoute(p, method, body, me, env, log);
  return null;
}
