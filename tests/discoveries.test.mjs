// Discoveries (bot/discoveries.js): /share → manager approves in /discoveries → gold post with "Useful" → site API.
import { env, call, login, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { plainText } from '../bot/ui.js';
import { cleanLink } from '../bot/discoveries.js';

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
env.DISCORD_BOT_TOKEN = 'bot'; env.DISCORD_GUILD_ID = '9';
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil: () => {} });
  return { s: res.status, d: await res.json().catch(() => null) };
}
const as = (id, name, roles = []) => ({ member: { user: { id, username: name }, roles }, channel_id: 'c1', token: 'tok' });
const share = (who, o) => send({ type: 2, ...who, data: { name: 'share', options: Object.entries(o).map(([name, value]) => ({ name, value })) } });
const press = (who, id) => send({ type: 3, ...who, data: { component_type: 2, custom_id: id } });
const queue = (who) => send({ type: 2, ...who, data: { name: 'discoveries' } });
const ids = (m) => { const out = []; const w = (c) => { if (!c || typeof c !== 'object') return; if (Array.isArray(c)) return c.forEach(w); if (c.custom_id) out.push(c.custom_id); w(c.components); }; w(m.components); return out; };

const posts = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  const m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m) { if (m[1] !== 'dm') posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: 'm1' }); }
  return realFetch(url, init);
};

// ---------- helpers ----------
t('links: https only, a host with a dot, junk refused', cleanLink('https://youtu.be/abc') === 'https://youtu.be/abc' && cleanLink('javascript:alert(1)') === null && cleanLink('http://localhost') === null && cleanLink('') === '' && cleanLink('not a link') === null);

// ---------- flag ----------
setFlags({ discoveries: 'owner' });
const MEMBER = as('500', 'Jez'), MGR = as('900', 'Kruger', ['mgr']);
t('flag owner: a plain member is told it isn’t on yet', /switched on/.test(plainText((await share(MEMBER, { title: 'Far post', tip: 'Aim far post low driven' })).d.data)));
setFlags({ discoveries: 'members' });

// ---------- /share ----------
await tt('/share: too short is refused', async () => /Add a bit more/.test(plainText((await share(MEMBER, { title: 'Hi', tip: 'x' })).d.data)));
await tt('/share: a bad link is refused', async () => /link doesn’t look right/.test(plainText((await share(MEMBER, { title: 'Far post trick', tip: 'Aim for the far post low driven', link: 'javascript:1' })).d.data)));
await tt('/share: saved as pending, private thank-you', async () => {
  const r = await share(MEMBER, { title: 'Low driven shots beat keepers', tip: 'Hold the shot button lightly from the edge of the box and aim far post.', link: 'https://youtu.be/abc' });
  const row = sqlite.prepare('SELECT * FROM discoveries').get();
  return (r.d.data.flags & 64) === 64 && /Sent to the managers/.test(plainText(r.d.data)) && row.status === 'pending' && row.link === 'https://youtu.be/abc' && row.user_id === '500';
});
await tt('/share: three waiting at a time', async () => {
  await share(MEMBER, { title: 'Second tip here', tip: 'Another useful sentence about passing.' });
  await share(MEMBER, { title: 'Third tip here', tip: 'Another useful sentence about tackling.' });
  return /three waiting/.test(plainText((await share(MEMBER, { title: 'Fourth tip here', tip: 'One tip too many for now.' })).d.data));
});

// ---------- /discoveries ----------
await tt('/discoveries: members are turned away', async () => /Only managers/.test(plainText((await queue(MEMBER)).d.data)));
await tt('/discoveries: managers see what is waiting with Approve / Reject per item', async () => {
  const r = await queue(MGR);
  return /3 waiting/.test(plainText(r.d.data)) && ids(r.d.data).join() === 'norex:dc:ok:1,norex:dc:no:1,norex:dc:ok:2,norex:dc:no:2,norex:dc:ok:3,norex:dc:no:3';
});
await tt('approve/reject: members can’t press them', async () => /Managers only/.test(plainText((await press(MEMBER, 'norex:dc:ok:1')).d.data)));
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('announce_channel', '42420') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
await tt('approve: posts a gold panel to the announce channel, the list refreshes without it', async () => {
  const r = await press(MGR, 'norex:dc:ok:1');
  const panel = posts.at(-1)?.components?.find((c) => c.type === 17);
  return r.d.type === 7 && /2 waiting/.test(plainText(r.d.data)) && posts.length === 1 && posts[0].channel === '42420' && panel.accent_color === 0xefcf7a
    && /Low driven shots/.test(plainText(posts[0])) && /<@500>/.test(plainText(posts[0])) && /<@900>/.test(plainText(posts[0])) && ids(posts[0]).join() === 'norex:dc:useful:1';
});
await tt('reject: kept but never shown', async () => {
  const r = await press(MGR, 'norex:dc:no:2');
  return r.d.type === 7 && sqlite.prepare('SELECT status FROM discoveries WHERE id = 2').get().status === 'rejected' && posts.length === 1;
});
await tt('deciding twice just shows the list again', async () => (await press(MGR, 'norex:dc:ok:1')).d.type === 7 && posts.length === 1);
// the owner's routing rules (Control Center → Discovery approved) replace the announce-channel post
await tt('routing: approving posts where the rule says (tagging a role), not in the announce channel, and the discovery is marked posted', async () => {
  sqlite.prepare("INSERT INTO meta (key, value) VALUES ('notify_routes', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(JSON.stringify([{ action: 'discoveries.approved', group: 'role', role: '31337', method: 'tag', channel: '51515', on: true }]));
  const before = posts.length;
  const r = await press(MGR, 'norex:dc:ok:3');
  const p = posts.at(-1);
  const ok = r.d.type === 7 && posts.length === before + 1 && p.channel === '51515' && /<@&31337>/.test(JSON.stringify(p)) && p.allowed_mentions.roles[0] === '31337' && sqlite.prepare('SELECT discord_at FROM discoveries WHERE id = 3').get().discord_at > 0;
  sqlite.prepare("DELETE FROM meta WHERE key = 'notify_routes'").run();
  sqlite.prepare("UPDATE discoveries SET status = 'pending', approved_by = NULL, decided_at = NULL, discord_at = NULL WHERE id = 3").run(); posts.pop(); // put things back for the tests below
  return ok;
});

// ---------- Useful ----------
await tt('useful: toggles, count in the button, edited in place', async () => {
  const a = await press(as('501', 'Mate'), 'norex:dc:useful:1');
  const b = await press(as('502', 'Pal'), 'norex:dc:useful:1');
  const c = await press(as('501', 'Mate'), 'norex:dc:useful:1');
  return /Useful · 1/.test(JSON.stringify(a.d.data)) && /Useful · 2/.test(JSON.stringify(b.d.data)) && /Useful · 1/.test(JSON.stringify(c.d.data)) && a.d.type === 7;
});
await tt('useful: on something not approved', async () => /gone/.test(plainText((await press(MEMBER, 'norex:dc:useful:2')).d.data)));

// ---------- site API ----------
const tok = await login('500', []);
const list = await call(tok, '/api/discoveries');
t('API: approved discoveries only, with author, useful count and mine', list.s === 200 && list.d.length === 1 && list.d[0].title.startsWith('Low driven') && list.d[0].by.id === '500' && list.d[0].approvedBy.id === '900' && list.d[0].useful === 1 && list.d[0].mine === false && list.d[0].image === null && list.d[0].link === 'https://youtu.be/abc');
const us = await call(tok, '/api/discoveries/useful', { id: 1 });
t('API: useful toggles for the signed-in member', us.s === 200 && us.d.useful === 2 && us.d.mine === true && (await call(tok, '/api/discoveries')).d[0].mine === true);
t('API: unknown id → 404', (await call(tok, '/api/discoveries/useful', { id: 99 })).s === 404);
t('API: signed-out is refused', (await call(null, '/api/discoveries')).s === 401 || (await call(null, '/api/discoveries')).s === 403);
setFlags({ discoveries: 'owner' });
t('API: hidden while the flag is owner-only for a member', (await call(tok, '/api/discoveries')).s === 404);
done();
