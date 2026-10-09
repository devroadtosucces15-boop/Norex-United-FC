// P11.16 quick bot-command wrappers: /nextevent /feedback /suggest /announce /trial /motm /history.
// Each is a thin wrapper around a route that already has its own coverage (feedback.test.mjs,
// docs.test.mjs, notify.test.mjs, trials.test.mjs) – this file checks the wiring, not the business rules.
import { env, siteJson, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ events: 'members', feedback: 'members', suggestions: 'members', notifications: 'members' });

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} });
  return res.json();
}
const who = (id, roles = [], nick = `Nick ${id}`) => ({ member: { user: { id, username: `u${id}`, global_name: `G${id}` }, nick, roles } });
const slash = (name, options, id = '600', roles = []) => send({ type: 2, data: { name, options }, ...who(id, roles) });

const now = Date.now();
sqlite.exec(`INSERT INTO users (id, name, first_at, last_at) VALUES ('600', 'Sender', ${now}, ${now}), ('601', 'Receiver', ${now}, ${now}), ('111', 'Boss', ${now}, ${now})`);
sqlite.exec(`INSERT INTO claims (user_id, player, player_name, status, at) VALUES ('601', 'p601', 'x_Receiver_x', 'approved', ${now}), ('600', 'p600', 'x_Sender_x', 'approved', ${now})`);

// ---------- /nextevent ----------
t('/nextevent with nothing scheduled → friendly message', /Nothing scheduled/.test((await slash('nextevent')).data.content ?? ''));
sqlite.exec(`INSERT INTO events (type, title, start, duration, status, by_id, by_name, at) VALUES ('friendly', 'Friendly', ${now + 36e5}, 60, 'scheduled', '111', 'Boss', ${now})`);
await tt('/nextevent shows just the one event (no "after that" section)', async () => {
  const d = (await slash('nextevent')).data;
  return !!d.embeds?.[0]?.title.includes('Friendly') && d.embeds.length === 1;
});

// ---------- /feedback ----------
await tt('/feedback rejects a non-verified target', async () => (await slash('feedback', [{ name: 'to', value: '999' }, { name: 'kind', value: 'praise' }, { name: 'text', value: 'Great game out there' }])).data.content.startsWith('⚠️'));
await tt('/feedback sends to a verified teammate', async () => {
  const d = (await slash('feedback', [{ name: 'to', value: '601' }, { name: 'kind', value: 'praise' }, { name: 'text', value: 'Great game out there' }])).data;
  return d.content.includes('Sent anonymously') && !d.content.startsWith('⚠️');
});
await tt('the recipient actually got it (reused feedback.js state, not duplicated)', async () => {
  const row = sqlite.prepare('SELECT * FROM feedback WHERE to_id = ?').get('601');
  return row?.kind === 'praise' && row.body === 'Great game out there';
});

// ---------- /suggest ----------
await tt('/suggest adds an idea to the board', async () => {
  const d = (await slash('suggest', [{ name: 'title', value: 'Friday scrims' }])).data;
  return d.content.includes('Friday scrims') && !!sqlite.prepare('SELECT * FROM suggestions WHERE title = ?').get('Friday scrims');
});
await tt('/suggest with the anon flag stores it', async () => {
  await slash('suggest', [{ name: 'title', value: 'Second idea' }, { name: 'anon', value: true }]);
  return sqlite.prepare('SELECT anon FROM suggestions WHERE title = ?').get('Second idea')?.anon === 1;
});

// ---------- /announce ----------
t('/announce refused for a non-manager', /Managers only/.test((await slash('announce', [{ name: 'title', value: 'Read this' }])).data.content ?? ''));
await tt('/announce sends to every member as a manager', async () => {
  const d = (await slash('announce', [{ name: 'title', value: 'Read this' }, { name: 'text', value: 'Important stuff' }], '111', ['mgr'])).data;
  return /Sent \*\*Read this\*\*/.test(d.content) && !!sqlite.prepare("SELECT * FROM notifications WHERE type = 'announce'").get();
});

// ---------- /trial ----------
t('/trial refused for a non-manager', /Managers only/.test((await slash('trial')).data.content ?? ''));
await tt('/trial with no cards → friendly message', async () => (await slash('trial', undefined, '111', ['mgr'])).data.embeds === undefined);
sqlite.exec(`INSERT INTO trials (ea_id, source, status, positions, by_id, by_name, at, updated_at) VALUES ('SomeGamer', 'manual', 'trialling', '[]', '111', 'Boss', ${now}, ${now})`);
await tt('/trial lists open cards', async () => {
  const d = (await slash('trial', undefined, '111', ['mgr'])).data;
  return /SomeGamer/.test(d.embeds?.[0]?.description ?? '');
});
await tt('/trial filters by gamertag', async () => {
  const hit = (await slash('trial', [{ name: 'gamertag', value: 'someg' }], '111', ['mgr'])).data;
  const miss = (await slash('trial', [{ name: 'gamertag', value: 'nobody' }], '111', ['mgr'])).data;
  return /SomeGamer/.test(hit.embeds?.[0]?.description ?? '') && /No trial cards match/.test(miss.content ?? '');
});

// ---------- /motm (real match data from the built site) ----------
const club = siteJson('club');
await tt('/motm shows the latest match with no votes yet', async () => {
  const d = (await slash('motm')).data;
  return d.embeds?.[0]?.title.includes(club.matches[0].opp) && /No votes yet/.test(d.embeds[0].description);
});

// ---------- /history (real match data, full archive via api/h2h.json – not just the last 25) ----------
const h2h = siteJson('h2h')[0];
await tt('/history matches the Stats Centre\'s own head-to-head numbers exactly', async () => {
  const d = (await slash('history', [{ name: 'opponent', value: h2h.n.slice(0, 5) }])).data;
  return d.content.includes(h2h.n) && d.content.includes(`${h2h.w}W ${h2h.d}D ${h2h.l}L`) && d.content.includes(`${h2h.gf}–${h2h.ga}`);
});
t('/history with an unknown opponent says so', /No matches found/.test((await slash('history', [{ name: 'opponent', value: 'Definitely Not A Real Club Zzz' }])).data.content ?? ''));


// ---------- Boardroom live flags reach Discord (they used to apply to website requests only) ----------
await tt('Discord honours a live Boardroom switch: suggestions off → /suggest is locked, back on → works', async () => {
  const args = [{ name: 'title', value: 'More cones please' }];
  sqlite.exec(`INSERT INTO flag_overrides (name, level, by_name, at) VALUES ('suggestions', 'off', 'Boss', ${now}) ON CONFLICT (name) DO UPDATE SET level = 'off'`);
  const locked = (await slash('suggest', args)).data.content ?? '';
  sqlite.exec("DELETE FROM flag_overrides WHERE name = 'suggestions'");
  const open = (await slash('suggest', args)).data.content ?? '';
  return /not switched on/.test(locked) && !/not switched on/.test(open);
});

done();
