// Club Intelligence: /insights (server + club analysis), the weekly cron report DMed to the owner, and the pure analysis.
import { env, siteJson, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { analyse, insightsCron, insightsNow, reportEmbeds } from '../bot/insights.js';
import { t, tt, done } from './lib.mjs';

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
env.DISCORD_BOT_TOKEN = 'bot';
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ insights: 'owner' });
let pending = [];
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil: (p) => pending.push(p) });
  return { s: res.status, d: await res.json().catch(() => null) };
}
const settle = async () => { await Promise.all(pending); pending = []; };
const slash = (id, roles = []) => ({ type: 2, token: 'tok', member: { user: { id }, roles }, data: { name: 'insights' } });

// ---------- fake Discord server ----------
const DAY = 864e5, NOW = Date.now();
const snow = (ms) => String(BigInt(ms - 1420070400000) << 22n);
const iso = (ms) => new Date(ms).toISOString();
const joined = (d) => iso(NOW - d * DAY);
const guild = {
  info: { id: '9', name: 'NOREX UNITED', approximate_member_count: 7, approximate_presence_count: 3, verification_level: 0, rules_channel_id: null, premium_subscription_count: 2 },
  channels: [
    { id: 'c-gen', name: 'general', type: 0, last_message_id: snow(NOW - 36e5) },
    { id: 'c-clips', name: 'clips', type: 0, last_message_id: snow(NOW - 10 * DAY) },
    { id: 'c-old', name: 'old-news', type: 0, last_message_id: snow(NOW - 60 * DAY) },
    { id: 'c-secret', name: 'staff-room', type: 0, last_message_id: snow(NOW - 2 * DAY) },
    { id: 'c-voice', name: 'Match Night', type: 2 },
    { id: 'c-cat', name: 'CHAT', type: 4 },
  ],
  roles: [{ id: '9', name: '@everyone' }, { id: 'mgr', name: 'Manager' }, { id: 'r-old', name: 'Old Role' }, { id: 'r-unused', name: 'Unused' }, { id: 'r-bot', name: 'Bot', managed: true }],
  members: [
    { user: { id: '111' }, roles: ['mgr'], joined_at: joined(200) },
    { user: { id: 'u1' }, roles: ['mgr'], joined_at: joined(90) },
    { user: { id: 'u2' }, roles: [], joined_at: joined(3) },
    { user: { id: 'u3' }, roles: [], joined_at: joined(40) },
    { user: { id: 'u4' }, roles: [], joined_at: joined(20) },
    { user: { id: 'u5' }, roles: [], joined_at: joined(100) },
    { user: { id: 'b1', bot: true }, roles: ['r-bot'], joined_at: joined(100) },
  ],
  messages: {
    'c-gen': [{ author: { id: 'u2' }, timestamp: iso(NOW - 36e5) }, { author: { id: '111' }, timestamp: iso(NOW - 2 * DAY) }, { author: { id: 'b1', bot: true }, timestamp: iso(NOW - DAY) }, { author: { id: 'u3' }, timestamp: iso(NOW - 20 * DAY) }],
    'c-clips': [{ author: { id: 'u3' }, timestamp: iso(NOW - 10 * DAY) }],
  },
};
let intent = true;
const calls = [], dms = [], replies = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), method = init.method ?? 'GET';
  const d = u.match(/^https:\/\/discord\.com\/api\/v10(\/.*)$/)?.[1];
  if (d) {
    calls.push(`${method} ${d}`);
    if (d === '/guilds/9?with_counts=true') return Response.json(guild.info);
    if (d === '/guilds/9/channels') return Response.json(guild.channels);
    if (d === '/guilds/9/roles') return Response.json(guild.roles);
    if (d.startsWith('/guilds/9/members')) return intent ? Response.json(guild.members) : Response.json({ code: 50001, message: 'Missing Access' }, { status: 403 });
    const ch = d.match(/^\/channels\/([\w-]+)\/messages/)?.[1];
    if (ch === 'dm1' && method === 'POST') { dms.push(JSON.parse(init.body)); return Response.json({ id: 'm' }); }
    if (ch) return guild.messages[ch] ? Response.json(guild.messages[ch]) : Response.json({ code: 50001 }, { status: 403 });
    if (d === '/users/@me/channels') return Response.json({ id: 'dm1' });
    if (d.startsWith('/webhooks/')) { replies.push(JSON.parse(init.body)); return Response.json({}); }
  }
  return realFetch(url, init);
};

// ---------- club data in D1 ----------
const ins = (sql, ...a) => sqlite.prepare(sql).run(...a);
ins("INSERT INTO users (id, name, first_at, last_at, role) VALUES ('111', 'Boss', ?, ?, 'owner')", NOW - 150 * DAY, NOW - DAY);
ins("INSERT INTO users (id, name, first_at, last_at, role) VALUES ('u2', 'Newbie', ?, ?, 'member')", NOW - 2 * DAY, NOW - 2 * DAY);
ins("INSERT INTO claims (user_id, player, player_name, status, at) VALUES ('u3', 'p-x', 'X', 'pending', ?)", NOW - 10 * DAY);
ins("INSERT INTO claims (user_id, player, player_name, status, at, decided_by, decided_at) VALUES ('u2', 'p-y', 'Y', 'approved', ?, '111', ?)", NOW - 5 * DAY, NOW - 5 * DAY + 3 * 36e5);
ins("INSERT INTO trials (source, ea_id, positions, status, at, updated_at) VALUES ('form', 'Trialist', '[]', 'applied', ?, ?)", NOW - 20 * DAY, NOW - 20 * DAY);
const meta = (k) => JSON.parse(sqlite.prepare('SELECT value FROM meta WHERE key = ?').get(k)?.value ?? 'null');
const clearReport = () => sqlite.prepare("DELETE FROM meta WHERE key IN ('insights', 'insights_hist', 'insights_job', 'insights_week')").run();

const load = async (f) => siteJson(f);
const club = siteJson('club'), players = siteJson('players');

// ---------- /insights command ----------
await tt('plain member → locked, private', async () => {
  const r = await send(slash('u5'));
  return r.d.type === 4 && r.d.data.flags === 64 && /Managers only/.test(r.d.data.content);
});
await tt('manager while flag is owner-only → locked', async () => /Managers only/.test((await send(slash('u1', ['mgr']))).d.data.content));

await tt('owner → deferred private reply, then the report is patched in', async () => {
  const r = await send(slash('111'));
  await settle();
  const e = replies.at(-1)?.embeds ?? [];
  return r.d.type === 5 && r.d.data.flags === 64 && /Club Intelligence/.test(e[0]?.title) && e.length === 5;
});
const report = meta('insights');
t('report saved in meta + one trend point', report?.overall >= 0 && report.overall <= 100 && meta('insights_hist')?.length === 1);
t('server: members from the list (bots left out), joins, no-role, staff', report.server.humans === 6 && report.server.joins7 === 1 && report.server.joins30 === 2 && report.server.noRole === 4 && report.server.staff === 2);
t('server: chat counts people not bots, 7 vs 30 days', report.server.msgs7 === 2 && report.server.posters7 === 2 && report.server.msgs30 === 4 && report.server.posters30 === 3);
t('server: silent channel from last_message_id, never read', report.server.dead.join() === 'old-news' && !calls.some((c) => c.includes('c-old')));
t('server: unreadable channel reported, unused roles found', report.server.unread.join() === 'staff-room' && report.server.unused.join() === 'Old Role,Unused');
t('admin: pending claim, stale trial, response time', report.admin.claims === 1 && report.admin.trials === 1 && report.admin.resp === 3 && report.admin.oldest >= 9.9);
const recText = report.recs.map((x) => x.text).join('\n');
t('recs: urgent first (10-day wait)', report.recs[0].sev === 1 && /waited \*\*10 days/.test(report.recs[0].text));
t('recs: silent channel, unused roles, verification, rules, missing access', /#old-news/.test(recText) && /roles nobody has/.test(recText) && /Verification level/.test(recText) && /Rules channel/.test(recText) && /#staff-room/.test(recText));
t('recs: good news for fast decisions', report.recs.at(-1).sev === 4 && /within 3 h/.test(report.recs.at(-1).text));
t('history: 6 months, joins per month', report.history.length === 6 && report.history.at(-1).joins >= 1);
const e = replies.at(-1).embeds;
t('embeds fit Discord limits', JSON.stringify(e).length <= 6000 && e.every((x) => (x.fields ?? []).every((f) => f.value.length <= 1024 && f.name.length <= 256)));

await tt('second run within 10 minutes reuses the report (no Discord reads)', async () => {
  const n = calls.length;
  await send(slash('111')); await settle();
  return calls.slice(n).every((c) => c.startsWith('PATCH /webhooks'));
});

await tt('Server Members Intent off → report still built, with a setup tip first', async () => {
  intent = false;
  const r = await insightsNow(env, load, NOW + 11 * 60e3);
  intent = true;
  return r.server.joins30 === null && r.recs[0].area === 'setup' && /Server Members Intent/.test(r.recs[0].text) && meta('insights_hist').length === 1;
});

await tt('manager after the flag opens to managers', async () => {
  setFlags({ insights: 'managers' });
  const r = await send(slash('u1', ['mgr']));
  await settle();
  return r.d.type === 5;
});

// ---------- weekly cron ----------
clearReport();
const monday = (h) => { const d = new Date(NOW); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7)); d.setUTCHours(h, 0, 0, 0); return d.getTime(); };
await tt('cron: nothing before Monday 09:00 UTC or on Tuesday', async () => (await insightsCron(env, load, monday(8))) === null && (await insightsCron(env, load, monday(10) + DAY)) === null);
await tt('cron: Monday → start, read channels, DM the owner', async () => {
  const t0 = monday(10);
  const steps = [];
  for (let i = 0; i < 5 && steps.at(-1) !== 'sent'; i++) steps.push(await insightsCron(env, load, t0 + i * 6e5));
  return steps[0] === 'started' && steps.includes('reading') && steps.at(-1) === 'sent' && dms.length === 1 && /weekly Club Intelligence/.test(dms[0].content) && dms[0].embeds.length === 5;
});
await tt('cron: only once a week', async () => (await insightsCron(env, load, monday(11))) === null && meta('insights_job') === null);

// ---------- pure analysis ----------
const job = { at: NOW, base: { name: 'X', total: 30, online: 5, boosts: 0, verification: 1, rules: true, members: null, roles: [], channels: [{ id: 'a', name: 'a', type: 0, last: NOW }] }, queue: [], reads: [{ id: 'a', name: 'a', n7: 50, n30: 90, staff7: 5 }], p7: ['1', '2'], p30: ['1', '2', '3'] };
const db = { users: [], claims: [], requests: [], trials: [], rush: [], avail: [], votes: [], dmOff: 3, events: [{ start: NOW - DAY }] };
const r2 = analyse({ job, db, club, players, now: NOW, prev: { at: NOW - 7 * DAY, key: { overall: 10, members: 25 }, scores: { server: 10 } } });
t('analyse: works without the member list or any club activity', r2.scores.server >= 0 && r2.admin.resp === null && r2.site.adoption === 0);
t('analyse: events in use but none upcoming → schedule tip; DMs blocked tip', r2.recs.some((x) => /No match night/.test(x.text)) && r2.recs.some((x) => /block DMs/.test(x.text)));
t('analyse: trend vs last week in the embeds', /▲/.test(reportEmbeds(r2, 'https://x/')[0].title) && /vs /.test(reportEmbeds(r2)[0].footer.text));

done();
