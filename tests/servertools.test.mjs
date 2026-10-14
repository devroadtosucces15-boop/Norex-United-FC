// Server tools (bot/servertools.js) – leave/join alerts, welcome posts, /purge, /tag, /remind, ping-role buttons.
// Discord is stubbed: every call is recorded and answered from the fake server below – nothing reaches the network.
import { env, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { parseDuration, memberWatch, purge, sendDueReminders, since, snowTime, PING_ROLES } from '../bot/servertools.js';

// ---------- pure helpers ----------
t('durations: 30m, 2h, 1h30m, 1d 12h, words', parseDuration('30m') === 18e5 && parseDuration('2h') === 72e5 && parseDuration('1h30m') === 54e5
  && parseDuration('1d 12h') === 1296e5 && parseDuration('2 hours and 5 mins') === 7500e3);
t('durations: junk and clock times are rejected', parseDuration('9pm') === null && parseDuration('soon') === null && parseDuration('abc 2h') === null && parseDuration('') === null);
t('since() reads like a person', since(0, 3 * 864e5) === '3 days' && since(0, 400 * 864e5) === '1 year' && since(0, 90 * 864e5) === '3 months' && since(0, 5 * 36e5) === '5 hours');
const idAt = (ms) => String((BigInt(ms - 1420070400000) << 22n));
t('snowflake → time', Math.abs(snowTime(idAt(1.7e12)) - 1.7e12) < 2);

// ---------- fake Discord ----------
env.DISCORD_BOT_TOKEN = 'bot-token';
const calls = [];
let members = [];
let channelMsgs = [];
let roles = [{ id: '9', name: '@everyone' }, { id: 'r-mgr', name: 'Manager' }];
let membersStatus = 200;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  const method = init.method ?? 'GET';
  const body = init.body ? JSON.parse(init.body) : undefined;
  if (!url.startsWith('https://discord.com/api/v10')) return realFetch(url, init);
  const path = url.slice('https://discord.com/api/v10'.length);
  calls.push({ method, path, body });
  if (path.startsWith('/guilds/9/members?')) {
    if (membersStatus !== 200) return Response.json({ code: 50001 }, { status: membersStatus });
    const after = new URL('https://x' + path).searchParams.get('after');
    return Response.json(after === '0' ? members : []);
  }
  if (path === '/guilds/9/roles' && method === 'GET') return Response.json(roles);
  if (path === '/guilds/9/roles' && method === 'POST') { const r = { id: `r-${roles.length}`, name: body.name }; roles.push(r); return Response.json(r); }
  if (/^\/channels\/[^/]+\/messages\?limit=100$/.test(path)) return Response.json(channelMsgs);
  if (/^\/channels\/[^/]+\/messages$/.test(path)) return Response.json({ id: 'msg' });
  if (/^\/guilds\/9\/members\/[^/]+\/roles\//.test(path)) return new Response(null, { status: 204 });
  if (/messages\/bulk-delete$/.test(path) || method === 'DELETE') return new Response(null, { status: 204 });
  if (path.startsWith('/webhooks/')) return Response.json({});
  return Response.json({ message: 'unexpected ' + path }, { status: 404 });
};
const posts = (channel) => calls.filter((c) => c.method === 'POST' && c.path === `/channels/${channel}/messages`).map((c) => c.body);
const now = Date.now();
const mem = (id, name, o = {}) => ({ user: { id, username: name, avatar: null }, nick: null, roles: [], joined_at: new Date(now - 40 * 864e5).toISOString(), ...o });

// ---------- signed interactions ----------
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
const pending = [];
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil: (p) => pending.push(p) });
  return res.json();
}
const flush = async () => { while (pending.length) await pending.shift(); };
const as = (uid, roleIds = []) => ({ member: { user: { id: uid, username: `u${uid}` }, roles: roleIds }, channel_id: 'chan-1', token: 'tok' });
const MGR = as('700', ['mgr']), MEMBER = as('701', []);
const slash = (u, name, options = []) => send({ type: 2, data: { name, options }, ...u });
const sub = (u, name, s, options = []) => slash(u, name, [{ type: 1, name: s, options }]);
const opt = (o) => Object.entries(o).map(([name, value]) => ({ name, value }));
const lastPatch = () => calls.filter((c) => c.method === 'PATCH' && c.path.startsWith('/webhooks/')).at(-1)?.body?.content ?? '';

// ---------- /setup + leave/join alerts ----------
t('/setup is managers only', /Managers only/.test((await sub(MEMBER, 'setup', 'leavelog', opt({ channel: 'log' }))).data.content));
t('nothing configured → the member check does nothing', (await memberWatch(env)) === null);

membersStatus = 403;
let r = await sub(MGR, 'setup', 'leavelog', opt({ channel: 'log' }));
await flush();
t('/setup leavelog defers, then explains the Server Members Intent when the list is blocked', r.type === 5 && /Server Members Intent/.test(lastPatch()));
membersStatus = 200;

members = [mem('1001', 'alice', { roles: ['r-mgr'] }), mem('1002', 'bob'), mem('1003', 'carl', { user: { id: '1003', username: 'carl', bot: true } })];
await sub(MGR, 'setup', 'leavelog', opt({ channel: 'log' }));
await flush();
t('/setup leavelog saves, snapshots the humans and posts a hello in the channel',
  /Tracking 2 members/.test(lastPatch()) && sqlite.prepare('SELECT COUNT(*) AS n FROM guild_members').get().n === 2 && /Leave and join alerts/.test(posts('log').at(-1)?.content));

await sub(MGR, 'setup', 'welcome', opt({ channel: 'hello', message: 'Hey {user}, welcome!' }));
await flush();
t('/setup welcome previews the first line', /Hey <@700>, welcome!/.test(lastPatch()));

sqlite.exec("INSERT INTO claims (user_id, player, player_name, status, at) VALUES ('1002', 'p1', 'BobTheKeeper', 'approved', 0)");
members = [mem('1001', 'alice', { roles: ['r-mgr'] }), mem('1004', 'dave', { nick: 'Davey' })];
calls.length = 0;
const w = await memberWatch(env, now);
const log = posts('log').flatMap((p) => p.embeds);
t('a leave and a join are spotted', w.left.map((k) => k.user_id).join() === '1002' && w.joined.map((k) => k.user_id).join() === '1004');
t('leave alert: name, time in the server, gamertag, no pings',
  log.some((e) => e.author?.name === 'bob left the server' && e.fields.some((f) => f.value.includes('40 days')) && e.fields.some((f) => f.value.includes('BobTheKeeper')))
  && posts('log').every((p) => p.allowed_mentions?.parse?.length === 0));
t('join alert uses the nickname and shows account age', log.some((e) => e.author?.name === 'Davey joined the server' && e.fields[0].name === 'Account created'));
t('welcome post pings only the new member', posts('hello').length === 1 && posts('hello')[0].content === 'Hey <@1004>, welcome!' && posts('hello')[0].allowed_mentions.users[0] === '1004');
t('snapshot follows the server', sqlite.prepare('SELECT group_concat(user_id) AS ids FROM (SELECT user_id FROM guild_members ORDER BY user_id)').get().ids === '1001,1004');

calls.length = 0;
const quiet = await memberWatch(env, now);
t('a quiet server writes nothing and posts nothing', !quiet.joined.length && !quiet.left.length && !posts('log').length);

members = [];
await tt('a half-empty member list is treated as a Discord hiccup, not a mass leave', async () => { try { await memberWatch(env, now); return false; } catch (e) { return e.message === 'member-list-short'; } });
t('…and nobody was removed from the snapshot', sqlite.prepare('SELECT COUNT(*) AS n FROM guild_members').get().n === 2);

await sub(MGR, 'setup', 'off', opt({ feature: 'welcome' }));
members = [mem('1001', 'alice', { roles: ['r-mgr'] }), mem('1004', 'dave'), mem('1005', 'erin')];
calls.length = 0;
await memberWatch(env, now);
t('welcome off → join still logged, no welcome', posts('hello').length === 0 && posts('log').length === 1);

// ---------- /purge ----------
t('/purge is managers only', /Managers only/.test((await slash(MEMBER, 'purge', opt({ count: 5 }))).data.content));
channelMsgs = [
  { id: idAt(now - 60e3), author: { id: '1001' } },
  { id: idAt(now - 120e3), author: { id: '1004' }, pinned: true },
  { id: idAt(now - 180e3), author: { id: '1004' } },
  { id: idAt(now - 20 * 864e5), author: { id: '1004' } },
];
calls.length = 0;
let msg = await purge(env, 'chan-1', 10, null, 'mgr', now);
const bulk = calls.find((c) => c.path.endsWith('/bulk-delete'));
t('purge: bulk-deletes the fresh ones, keeps pinned, explains the 14-day limit', bulk?.body.messages.length === 2 && /Deleted \*\*2\*\*/.test(msg) && /older than 14 days/.test(msg) && /Pinned/.test(msg));
calls.length = 0;
msg = await purge(env, 'chan-1', 5, '1004', 'mgr', now);
t('purge by member: one message → single delete', calls.filter((c) => c.method === 'DELETE').length === 1 && !calls.some((c) => c.path.endsWith('/bulk-delete')) && /from <@1004>/.test(msg));
r = await slash(MGR, 'purge', opt({ count: 3 }));
await flush();
t('/purge answers privately and patches the result in', r.type === 5 && r.data.flags === 64 && /Deleted/.test(lastPatch()));

// ---------- /tag + /tags ----------
t('/tags set is managers only', /Managers only/.test((await sub(MEMBER, 'tags', 'set', opt({ name: 'rules', text: 'x' }))).data.content));
r = await sub(MGR, 'tags', 'set', opt({ name: 'Trial Info', text: 'Line one\\nLine two' }));
t('/tags set saves (name tidied, \\n → new line)', /Saved \*\*trial-info\*\*/.test(r.data.content) && sqlite.prepare("SELECT body FROM tags WHERE name = 'trial-info'").get().body === 'Line one\nLine two');
t('bad tag names are refused', /letters, numbers or dashes/.test((await sub(MGR, 'tags', 'set', opt({ name: '!!', text: 'x' }))).data.content));
r = await slash(MEMBER, 'tag', opt({ name: 'trial-info', member: '1004' }));
t('/tag posts it publicly and pings only the chosen member', r.type === 4 && !(r.data.flags & 64) && r.data.embeds[0].description === 'Line one\nLine two' && r.data.content === '<@1004>' && r.data.allowed_mentions.users[0] === '1004');
t('/tag counts uses', sqlite.prepare("SELECT uses FROM tags WHERE name = 'trial-info'").get().uses === 1);
t('/tag unknown → friendly miss', /No tag called/.test((await slash(MEMBER, 'tag', opt({ name: 'nope' }))).data.content));
r = await send({ type: 4, data: { name: 'tag', options: [{ name: 'name', value: 'tri', focused: true }] }, ...MEMBER });
t('/tag autocomplete suggests saved tags', r.type === 8 && r.data.choices[0]?.value === 'trial-info');
t('/tags list shows them', /trial-info/.test((await sub(MEMBER, 'tags', 'list')).data.content));
t('/tags delete', /Deleted/.test((await sub(MGR, 'tags', 'delete', opt({ name: 'trial-info' }))).data.content));

// ---------- /remind + /reminders ----------
t('/remind rejects a clock time with examples', /Try `10m`/.test((await slash(MEMBER, 'remind', opt({ in: '9pm', text: 'league' }))).data.content));
t('/remind: members can’t ping roles', /Only managers/.test((await slash(MEMBER, 'remind', opt({ in: '1h', text: 'x', role: 'r-mgr' }))).data.content));
r = await slash(MEMBER, 'remind', opt({ in: '30m', text: 'join league' }));
t('/remind confirms privately with the time', r.data.flags === 64 && /<t:\d+:R>/.test(r.data.content) && /join league/.test(r.data.content));
await slash(MGR, 'remind', opt({ in: '2h', text: 'Match night!', channel: 'league', role: 'r-match' }));
t('two reminders waiting', sqlite.prepare('SELECT COUNT(*) AS n FROM reminders WHERE sent_at IS NULL').get().n === 2);
calls.length = 0;
t('nothing is due yet', (await sendDueReminders(env, Date.now())) === 0);
t('due → posted with only that member pinged', (await sendDueReminders(env, Date.now() + 31 * 60e3)) === 1
  && posts('chan-1')[0].content.startsWith('⏰ <@701> **Reminder:** join league') && posts('chan-1')[0].allowed_mentions.users[0] === '701' && !posts('chan-1')[0].allowed_mentions.roles.length);
t('…and never twice', (await sendDueReminders(env, Date.now() + 31 * 60e3)) === 0);
calls.length = 0;
await worker.scheduled({ cron: '* * * * *' }, env, { waitUntil: (p) => pending.push(p) });
await flush();
t('the 1-minute timer only sends reminders (no member check, no site update)', !calls.some((c) => c.path.includes('/members?')));
r = await slash(MGR, 'reminders');
const cancelId = r.data.components?.[0]?.components?.[0]?.custom_id;
t('/reminders lists yours with cancel buttons', /Match night!/.test(r.data.content) && /^norex:rm:x:\d+$/.test(cancelId));
t('someone else can’t cancel it', /already sent or cancelled/.test((await send({ type: 3, data: { custom_id: cancelId }, ...MEMBER })).data.content));
t('cancel works', /cancelled/.test((await send({ type: 3, data: { custom_id: cancelId }, ...MGR })).data.content) && sqlite.prepare('SELECT COUNT(*) AS n FROM reminders WHERE sent_at IS NULL').get().n === 0);

// ---------- ping roles ----------
t('ping button before setup → tells you to run /setup', /setup pingroles/.test((await send({ type: 3, data: { custom_id: 'norex:pr:match' }, ...MEMBER })).data.content));
roles.push({ id: 'r-existing', name: 'Match night' });
calls.length = 0;
await sub(MGR, 'setup', 'pingroles', opt({ channel: 'roles' }));
await flush();
const created = calls.filter((c) => c.method === 'POST' && c.path === '/guilds/9/roles').map((c) => c.body);
const panel = posts('roles')[0];
t('/setup pingroles reuses a same-named role and creates the rest as mentionable', created.length === PING_ROLES.length - 1 && created.every((b) => b.mentionable && b.permissions === '0') && !created.some((b) => b.name === 'Match night'));
t('panel has one button per ping role', panel?.components[0].components.map((b) => b.custom_id).join() === PING_ROLES.map((p) => `norex:pr:${p.key}`).join());
calls.length = 0;
r = await send({ type: 3, data: { custom_id: 'norex:pr:match' }, ...MEMBER });
t('tap → role added', /pings are on/.test(r.data.content) && r.data.flags === 64 && calls.some((c) => c.method === 'PUT' && c.path === '/guilds/9/members/701/roles/r-existing'));
calls.length = 0;
r = await send({ type: 3, data: { custom_id: 'norex:pr:match' }, ...as('701', ['r-existing']) });
t('tap again → role removed', /pings are off/.test(r.data.content) && calls.some((c) => c.method === 'DELETE' && c.path === '/guilds/9/members/701/roles/r-existing'));

// ---------- flag ----------
const savedFeatures = env.FEATURES;
env.FEATURES = JSON.stringify({ ...JSON.parse(savedFeatures), serverTools: 'off' });
t('flag off → commands say so', /isn’t switched on/.test((await slash(MEMBER, 'tag', opt({ name: 'x' }))).data.content));
env.FEATURES = savedFeatures;

globalThis.fetch = realFetch;
done();
