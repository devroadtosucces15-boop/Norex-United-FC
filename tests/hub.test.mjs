// Hub (redesign BE8): GET /api/hub online count + can-wave, POST /api/hub/wave (live via HUB_ROOM else
// queued), and the HubRoom Durable Object itself (roster broadcast, wave relay, join/leave).
import { call, env, login, W } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ hub: 'members', notifications: 'members' });

const m1 = await login('900', [], 'Hub One');
const m2 = await login('901', [], 'Hub Two');

t('flag off → 404', await (async () => { setFlags({ hub: 'off' }); const r = await call(m1, '/api/hub'); setFlags({ hub: 'members' }); return r.s === 404; })());
let r = await call(m1, '/api/hub');
t('online count + can-wave', r.s === 200 && typeof r.d.online === 'number' && r.d.canWave === true);

// ---------- wave: no room bound → queued (inline fallback, no JOBS) ----------
r = await call(m1, '/api/hub/wave', { to: '901' });
t('wave: not delivered live with no room bound, still succeeds', r.s === 200 && r.d.delivered === false);
t('wave: queued inline as a bell notification', (await call(m2, '/api/notify')).d.items.some((n) => n.type === 'wave' && n.title.includes('Hub One')));

t('wave: refused waving at yourself', (await call(m1, '/api/hub/wave', { to: '900' })).s === 400);
t('wave: refused for an unknown member', (await call(m1, '/api/hub/wave', { to: 'ghost' })).s === 404);

let okWaves = 0;
for (let i = 0; i < 20; i++) if ((await call(m1, '/api/hub/wave', { to: '901' })).s === 200) okWaves++;
t('wave: 20 a day go through (one already sent above counts)', okWaves === 19);
t('wave: the next one today is refused', (await call(m1, '/api/hub/wave', { to: '901' })).s === 429);

// ---------- wave: delivered live when HUB_ROOM has an open socket ----------
const pushed = [];
env.HUB_ROOM = {
  idFromName: (n) => n,
  get: () => ({ fetch: async (u, init) => {
    const url = typeof u === 'string' ? u : u.url;
    if (url.includes('/wave')) { pushed.push(JSON.parse(init.body)); return new Response(JSON.stringify({ delivered: true })); }
    return new Response(JSON.stringify({ delivered: false }));
  } }),
};
const m3 = await login('902', [], 'Hub Three');
r = await call(m2, '/api/hub/wave', { to: '902' });
t('wave: delivered live goes through HUB_ROOM, not the queue', r.s === 200 && r.d.delivered === true && pushed.some((p) => p.to === '902' && p.from.id === '901'));
t('wave: a delivered wave is not also queued as a notification', !(await call(m3, '/api/notify')).d.items.some((n) => n.type === 'wave'));
delete env.HUB_ROOM;

// ---------- ws upgrade ----------
const wsReq = (tok, up = true) => W(`/api/hub/ws${tok ? `?t=${encodeURIComponent(tok)}` : ''}`, { headers: up ? { Upgrade: 'websocket' } : {} });
t('ws: 503 (no live roster) when no room binding', (await wsReq(m1)).status === 503);
const opened = [];
env.HUB_ROOM = { idFromName: (n) => n, get: (name) => ({ fetch: async (u) => { opened.push({ name, url: typeof u === 'string' ? u : u.url }); return new Response('ok'); } }) };
t('ws: refused without a session', (await wsReq(null)).status === 404);
t('ws: needs an Upgrade header', (await wsReq(m1, false)).status === 426);
await wsReq(m1);
t('ws: joins the single shared hub room', opened.at(-1)?.name === 'hub' && opened.at(-1).url.includes('u=900'));
delete env.HUB_ROOM;

// ---------- the Durable Object itself ----------
const { HubRoom } = await import('../bot/hubroom.js');
const fakeWs = (who) => { const w = { who, sent: [], send(d) { this.sent.push(d); }, deserializeAttachment: () => who, close() {} }; return w; };
const sockets = [];
const room = new HubRoom({ getWebSockets: (tag) => sockets.filter((s) => !tag || s.who.u === tag), setWebSocketAutoResponse() {} }, {});
const a = fakeWs({ u: '900', n: 'Hub One' });
sockets.push(a);
await room.fetch(new Request('https://room/wave', { method: 'POST', body: JSON.stringify({ to: '900', from: { id: '901', n: 'Hub Two' } }) }));
t('room: /wave reaches a connected member\'s socket', JSON.parse(a.sent.at(-1)).t === 'wave' && JSON.parse(a.sent.at(-1)).from.n === 'Hub Two');
t('room: /count reflects open sockets', (await (await room.fetch(new Request('https://room/count', { method: 'POST' }))).json()).n === 1);
const noOne = await room.fetch(new Request('https://room/wave', { method: 'POST', body: JSON.stringify({ to: '999', from: { id: '901', n: 'x' } }) }));
t('room: /wave to nobody connected reports not delivered', (await noOne.json()).delivered === false);

done();
