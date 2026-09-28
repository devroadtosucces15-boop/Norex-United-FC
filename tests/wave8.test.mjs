// Wave 8: P3.3 Discord RSVP buttons + reminders, P7.4 more bot commands, P3.4 lineup builder, P2.4 platform account linking.
import { call, env, login, mockDiscord, siteJson, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { eventReminders, FORMATIONS } from '../bot/events.js';
import { t, tt, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ events: 'public', matchNight: 'members', notifications: 'members', profiles: 'members', rushLog: 'members', platformLink: 'members', roleSync: 'off', discordRsvp: 'members' });

// ----- signed Discord interactions -----
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
env.DISCORD_BOT_TOKEN = 'bot';
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} });
  return res.json();
}
const who = (id, roles = [], nick = `Nick ${id}`) => ({ member: { user: { id, username: `u${id}`, global_name: `G${id}` }, nick, roles } });
const slash = (name, options, id = '500', roles = []) => send({ type: 2, data: { name, options }, ...who(id, roles) });
const button = (custom_id, id = '500') => send({ type: 3, data: { custom_id, component_type: 2 }, ...who(id) });

// ----- fake Discord REST: channel posts + edits -----
const posts = [], edits = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/guilds/9/channels')) return Response.json([{ id: '70001', name: 'match-nights', type: 0 }]);
  if (u.endsWith('/guilds/9/roles')) return Response.json([{ id: '9', name: '@everyone' }]);
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  let m = u.match(/\/channels\/(\d+)\/messages\/(\w+)$/);
  if (m && init.method === 'PATCH') { edits.push({ channel: m[1], msg: m[2], ...JSON.parse(init.body) }); return Response.json({}); }
  m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m && m[1] !== 'dm') { posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: `m${posts.length}` }); }
  if (m) return Response.json({ id: 'dm-msg' });
  return realFetch(url, init);
};

const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500', [], 'Player One');
const member2 = await login('501', [], 'Player Two');
const day = (d) => new Date(Date.now() + d * 86400e3).toISOString().slice(0, 10);

// ================= P3.3 =================
const made = await call(mgr, '/api/events', { type: 'league', date: day(3), time: '20:00', tz: 'UTC', duration: 120, needs: { GK: 1, players: 6 }, remind: 'mention', discord: { channel: '70001' } });
const evId = made.d.id, post = posts.at(-1);
const btns = post.components[0].components;
t('P3.3 event post carries ✅ ❔ ❌ buttons + a Squad Hub link', btns.filter((b) => b.custom_id).map((b) => b.custom_id).join() === `norex:ev:${evId}:yes,norex:ev:${evId}:maybe,norex:ev:${evId}:no` && btns.some((b) => b.style === 5));
t('P3.3 post shows answers + what is still needed', post.embeds[0].fields[0].name === 'Answers' && /6 more players/.test(post.embeds[0].fields[1]?.value ?? '') && /1 GK/.test(post.embeds[0].fields[1].value));
t('reminder setting stored', made.d.events.find((e) => e.id === evId).remind === 'mention');
const clicked = await button(`norex:ev:${evId}:yes`, '502');
t('P3.3 button answers privately (ephemeral) with the event', clicked.type === 4 && clicked.data.flags === 64 && /You’re in/.test(clicked.data.content));
t('P3.3 the answer lands in the same table as the Hub (Discord nickname)', sqlite.prepare('SELECT status, name FROM event_rsvps WHERE event_id = ? AND user_id = ?').get(evId, '502')?.name === 'Nick 502');
t('P3.3 the Discord post is refreshed with the new counts', edits.some((x) => x.msg === 'm1' && /✅ 1/.test(x.embeds[0].fields[0].value)));
await call(member, '/api/events/rsvp', { ids: [evId], status: 'maybe' });
t('P3.3 a Hub answer refreshes the Discord post too', /❔ 1/.test(edits.at(-1).embeds[0].fields[0].value));
t('P3.3 unknown answer refused', /Unknown answer/.test((await button(`norex:ev:${evId}:perhaps`)).data.content));
t('P3.3 closed event → friendly message', /over or was cancelled/.test((await button('norex:ev:999999:yes')).data.content));
setFlags({ events: 'owner' });
t('P3.3 buttons respect the events flag', /not switched on/.test((await button(`norex:ev:${evId}:yes`)).data.content));
setFlags({ events: 'public', discordRsvp: 'owner' });
t('P3.3 … and the discordRsvp flag (owner-only → members get pointed to the Hub)', /Squad Hub/.test((await button(`norex:ev:${evId}:yes`)).data.content));
setFlags({ discordRsvp: 'off' });
t('P3.3 flag off → no buttons on new posts, no reminders', (await call(mgr, '/api/events', { type: 'training', date: day(5), time: '19:00', tz: 'UTC', discord: { channel: '70001' } })).s === 200 && !posts.at(-1).components[0].components.some((b) => b.custom_id) && (await eventReminders(env)).sent === 0);
setFlags({ discordRsvp: 'members' });

// Reminders: T-24h (mention mode) and T-2h (dm mode).
const soonDate = new Date(Date.now() + 23 * 3600e3), soon2 = new Date(Date.now() + 90 * 60e3);
const e24 = (await call(mgr, '/api/events', { type: 'rush', date: soonDate.toISOString().slice(0, 10), time: soonDate.toISOString().slice(11, 16), tz: 'UTC', remind: 'mention', discord: { channel: '70001' } })).d.id;
const e2 = (await call(mgr, '/api/events', { type: 'league', date: soon2.toISOString().slice(0, 10), time: soon2.toISOString().slice(11, 16), tz: 'UTC', remind: 'dm' })).d.id;
await call(member, '/api/events/rsvp', { ids: [e24], status: 'yes' });
const before = posts.length;
const r1 = await eventReminders(env);
const reminder = posts.slice(before).find((p) => /Tomorrow/.test(p.content ?? ''));
t('P3.3 cron sends both reminders once', r1.sent === 2 && (await eventReminders(env)).sent === 0);
t('P3.3 T-24h reminder in the channel @mentions only members who haven’t answered', reminder && reminder.allowed_mentions.users.includes('501') && !reminder.allowed_mentions.users.includes('500') && /<@501>/.test(reminder.content) && reminder.components[0].components.length === 4);
t('P3.3 T-2h nudge by bell / DM for dm mode', (await call(member2, '/api/notify')).d.items.some((n) => n.type === 'event' && /Starting soon/.test(n.title) && n.link === `members.html#schedule-${e2}`));
t('P3.3 reminder times stored', sqlite.prepare('SELECT remind24_at, remind2_at FROM events WHERE id = ?').get(e2).remind2_at > 0 && sqlite.prepare('SELECT remind24_at FROM events WHERE id = ?').get(e24).remind24_at > 0);
await call(mgr, '/api/events', { id: e24, type: 'rush', date: day(2), time: '20:00', tz: 'UTC' });
t('P3.3 moving an event resets its reminders', sqlite.prepare('SELECT remind24_at FROM events WHERE id = ?').get(e24).remind24_at === null);

// ================= P3.4 =================
t('P3.4 formations have 11 unique slots', Object.values(FORMATIONS).every((f) => f.length === 11 && new Set(f.map((x) => x[0])).size === 11 && f[0][0] === 'GK'));
t('P3.4 unknown formation refused', (await call(mgr, '/api/events/lineup', { id: evId, formation: '2-2-6', lineup: {} })).s === 400);
t('P3.4 slot must exist in the formation', (await call(mgr, '/api/events/lineup', { id: evId, formation: '4-3-3', lineup: { 500: 'LM' } })).s === 400);
t('P3.4 one player per slot', (await call(mgr, '/api/events/lineup', { id: evId, formation: '4-3-3', lineup: { 500: 'ST', 501: 'ST' } })).s === 400);
t('P3.4 members cannot build lineups', (await call(member, '/api/events/lineup', { id: evId, formation: '4-3-3', lineup: { 500: 'ST' } })).s === 403);
const draft = await call(mgr, '/api/events/lineup', { id: evId, formation: '4-3-3', lineup: { 500: 'LCM', 501: 'GK' } });
t('P3.4 save a draft (not published, nobody told)', draft.s === 200 && draft.d.events.find((e) => e.id === evId).formation === '4-3-3' && !draft.d.events.find((e) => e.id === evId).lineupAt && !draft.d.notified);
t('P3.4 /lineup says not published yet', /No lineup published/.test((await slash('lineup')).data.content ?? ''));
const pub = await call(mgr, '/api/events/lineup', { id: evId, formation: '4-3-3', lineup: { 500: 'LCM', 501: 'GK' }, publish: true });
t('P3.4 publish → each starter told their position', pub.d.notified === 2 && (await call(member, '/api/notify')).d.items.some((n) => /You’re starting at CM/.test(n.title)));
t('P3.4 publish → lineup posted in the event’s Discord channel', /Lineup/.test(posts.at(-1).embeds[0].title) && /`CM  ` Player One/.test(posts.at(-1).embeds[0].description) && posts.at(-1).channel === '70001');
t('P3.4 lineup players who never answered still come with their name', pub.d.events.find((e) => e.id === evId).lineupPeople['501']?.n === 'Player Two');
t('P3.4 profile shows “starting at”', (await call(member2, '/api/member?u=500')).d.starting?.pos === 'CM');
t('P3.4 /lineup shows the published lineup', /GK/.test((await slash('lineup')).data.embeds?.[0]?.description ?? ''));
const tpl = await call(mgr, '/api/events/templates', { name: 'Friday A', formation: '4-3-3', slots: { GK: '501', LCM: '500', XX: '1' } });
t('P3.4 save a template (bad slots dropped)', tpl.s === 200 && tpl.d.templates.length === 1 && tpl.d.templates[0].slots.GK === '501' && !('XX' in tpl.d.templates[0].slots));
t('P3.4 same name overwrites', (await call(mgr, '/api/events/templates', { name: 'friday a', formation: '4-4-2', slots: {} })).d.templates.length === 1);
t('P3.4 delete template', (await call(mgr, '/api/events/templates/delete', { id: tpl.d.templates[0].id })).d.templates.length === 0);
t('P3.4 quick list (no formation) still works', (await call(mgr, '/api/events/lineup', { id: e24, formation: null, lineup: { 500: 'CB' } })).s === 200);

// ================= P7.4 =================
const sched = await slash('schedule');
t('P7.4 /schedule: next event with answer buttons + the ones after', sched.type === 4 && sched.data.embeds.length >= 1 && sched.data.components[0].components.some((b) => /^norex:ev:\d+:yes$/.test(b.custom_id ?? '')));
const av = await slash('availability');
t('P7.4 /availability: in / maybe / out lists', av.data.embeds[0].fields.some((f) => /^✅ In/.test(f.name)) && av.data.embeds[0].fields.some((f) => /^❔ Maybe/.test(f.name)));
t('P7.4 /rush log needs a verified player', /Claim your player/.test((await slash('rush', [{ type: 1, name: 'log', options: [{ name: 'opponent', value: 'Rush FC' }, { name: 'for', value: 3 }, { name: 'against', value: 1 }] }])).data.content));
const pk = siteJson('players').find((p) => p.home);
sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at, name) VALUES ('500', ?, ?, 'approved', ?, 'Player One')").run(pk.k, pk.n, Date.now());
const rl = await slash('rush', [{ type: 1, name: 'log', options: [{ name: 'opponent', value: 'Rush FC' }, { name: 'for', value: 3 }, { name: 'against', value: 1 }, { name: 'goals', value: 2 }] }]);
const logged = sqlite.prepare("SELECT m.status, m.by_id, p.player, p.goals FROM rush_matches m JOIN rush_players p ON p.match_id = m.id WHERE m.opponent = 'Rush FC' ORDER BY m.id DESC").get();
t('P7.4 /rush log → pending result with me as the player', /manager confirms/.test(rl.data.content) && logged.status === 'pending' && logged.player === pk.k && logged.goals === 2 && logged.by_id === '500');
t('P7.4 /rush log uses the Hub checks (goals > score refused)', /more than our/.test((await slash('rush', [{ type: 1, name: 'log', options: [{ name: 'opponent', value: 'X FC' }, { name: 'for', value: 1 }, { name: 'against', value: 0 }, { name: 'goals', value: 3 }] }])).data.content));
const me = await slash('me');
t('P7.4 /me: my player card, only for me', me.data.flags === 64 && me.data.embeds[0].title.includes(pk.n));
t('P7.4 /me without a claim → how to claim', /claim yours/.test((await slash('me', undefined, '501')).data.content));
sqlite.prepare("UPDATE rush_matches SET status = 'confirmed' WHERE opponent = 'Rush FC'").run();
t('P7.4 /leaderboard mode:rush from confirmed logs', /Rush – Top scorers/.test((await slash('leaderboard', [{ name: 'mode', value: 'rush' }, { name: 'stat', value: 'goals' }])).data.embeds[0].title));
t('P7.4 /leaderboard mode:league = the EA leaderboard', !!(await slash('leaderboard', [{ name: 'mode', value: 'league' }, { name: 'stat', value: 'goals' }])).data.embeds?.[0]?.title);

// ================= P2.4 =================
const psnName = siteJson('players').filter((p) => p.home)[1].n, psnKey = siteJson('players').filter((p) => p.home)[1].k;
Object.assign(mockDiscord, { connections: [{ type: 'playstation', name: psnName, verified: true }, { type: 'xbox', name: 'NotVerified', verified: false }, { type: 'steam', name: 'SteamGuy', verified: true }, { type: 'twitch', name: 'tw', verified: true }] });
const p8 = await login('800', [], 'Linked');
const card = (await call(p8, '/api/member?u=800')).d;
t('P2.4 login keeps Discord-verified PSN + Steam, ignores unverified / other types', card.profile.verified.psn?.name === psnName && card.profile.verified.steam?.name === 'SteamGuy' && !card.profile.verified.xbox && !card.profile.verified.twitch);
const cl = await call(p8, '/api/claim', { player: psnKey });
t('P2.4 claim with a matching verified PSN is approved straight away', cl.d.auto === 'verified PSN' && cl.d.claim.status === 'approved' && /Auto/.test(cl.d.claim.decidedBy));
t('P2.4 the member is told', (await call(p8, '/api/notify')).d.items.some((n) => n.type === 'claim' && /matched your verified PSN/.test(n.title)));
const prof = await slash('profile', [{ name: 'member', value: '800' }]);
t('P7.4 /profile shows the verified player + ✓ platforms', /Plays as/.test(prof.data.embeds[0].description) && /PSN: \*\*.+\*\* ✓/.test(prof.data.embeds[0].fields.find((f) => /Platforms/.test(f.name)).value));
Object.assign(mockDiscord, { connections: [{ type: 'playstation', name: 'SomeoneElse', verified: true }] });
const p9 = await login('900', [], 'Other');
t('P2.4 no match → normal pending claim for a manager', (await call(p9, '/api/claim', { player: siteJson('players').filter((p) => p.home)[2].k })).d.claim.status === 'pending');
Object.assign(mockDiscord, { connections: [{ type: 'playstation', name: siteJson('players').filter((p) => p.home)[2].n, verified: true }] });
await login('900', [], 'Other');
t('P2.4 a pending claim is approved at the next login once the account matches', sqlite.prepare('SELECT status FROM claims WHERE user_id = ?').get('900').status === 'approved');
setFlags({ platformLink: 'owner' });
Object.assign(mockDiscord, { connections: [{ type: 'playstation', name: siteJson('players').filter((p) => p.home)[3].n, verified: true }] });
const p10 = await login('901', [], 'Flagged');
t('P2.4 no auto-approval while the flag is off for them', (await call(p10, '/api/claim', { player: siteJson('players').filter((p) => p.home)[3].k })).d.claim.status === 'pending');
Object.assign(mockDiscord, { connections: [] });

await tt('activity log records the wave', async () => {
  const types = sqlite.prepare('SELECT DISTINCT type FROM activity').all().map((r) => r.type);
  return ['event-lineup', 'event-lineup-publish', 'lineup-template', 'claim-approved', 'rush-submit'].every((x) => types.includes(x)) && sqlite.prepare("SELECT 1 FROM activity WHERE detail LIKE '%Discord%' AND type = 'event-rsvp'").get();
});
done();
