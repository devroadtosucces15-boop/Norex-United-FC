// Live Dugout (redesign BE3): the line-up builder subscribes to room 'lineup:<id>' through a manager-only socket.
// Saves, yes/no answers and check-ins nudge the room; the nudge carries no data (the builder re-reads /api/events).
import fs from 'node:fs';
import { call, env, login, ROOT, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import { ClubRoom } from '../bot/clubroom.js';
import { broadcastRoom } from '../bot/clubroom.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ events: 'public', matchNight: 'members' });

const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500', [], 'Player One');
const member2 = await login('501', [], 'Player Two');

// A match that kicked off 10 minutes ago (inside the check-in window) and one tomorrow with no line-up.
const liveMs = Math.floor((Date.now() - 10 * 60e3) / 60e3) * 60e3;
const liveDate = new Date(liveMs).toISOString();
const tomorrow = new Date(Date.now() + 86400e3).toISOString().slice(0, 10);
const base = { type: 'league', tz: 'UTC', duration: 120, needs: { players: 5 }, notes: 'Lobby', public: true };
const liveRes = await call(mgr, '/api/events', { ...base, date: liveDate.slice(0, 10), time: liveDate.slice(11, 16) });
const liveId = liveRes.d.events.find((e) => e.start === liveMs)?.id;
const later = await call(mgr, '/api/events', { ...base, date: tomorrow, time: '20:00' });
const laterId = later.d.events.find((e) => e.start > liveMs + 3600e3)?.id;
t('setup: a live event and a later event exist', !!liveId && !!laterId);

// Fake Durable Object namespace: records every push and every socket join, per room name.
const pushes = [], joins = [];
const fakeNs = {
  idFromName: (n) => n,
  get: (name) => ({
    fetch: async (u, init) => {
      const url = typeof u === 'string' ? u : u.url;
      if (url.includes('/push')) pushes.push({ name, ...JSON.parse(init.body) });
      else joins.push({ name, url });
      return new Response('ok');
    },
  }),
};

// ----- the socket: who may open it -----
const ws = (tok, id = liveId, up = true) => W(`/api/events/${id}/lineup/ws${tok ? `?t=${encodeURIComponent(tok)}` : ''}`, { headers: up ? { Upgrade: 'websocket' } : {} });
t('ws: 503 when the live-room binding is not set up yet', (await ws(mgr)).status === 503);
env.CLUB_ROOM = fakeNs;
t('ws: 404 without a session', (await ws(null)).status === 404);
t('ws: 403 for a member (the ready check is manager data)', (await ws(member)).status === 403);
t('ws: 426 without an Upgrade header', (await ws(mgr, liveId, false)).status === 426);
t('ws: a non-numeric event id never opens a socket', (await ws(mgr, 'abc')).status !== 200);
t('ws: a manager joins room lineup:<id> as themself', (await ws(mgr)).status === 200 && joins.at(-1)?.name === `lineup:${liveId}` && joins.at(-1).url.includes('u=600'));

// ----- nudges from the write routes -----
const nudgesFor = (id) => pushes.filter((p) => p.name === `lineup:${id}`);
const saved = await call(mgr, '/api/events/lineup', { id: liveId, formation: '4-3-3', lineup: { 500: 'GK' }, publish: false });
t('save draft: 200 and a draft nudge on lineup:<id>', saved.s === 200 && nudgesFor(liveId).at(-1)?.kind === 'draft' && nudgesFor(liveId).at(-1).t === 'lineup' && nudgesFor(liveId).at(-1).id === liveId);
await call(mgr, '/api/events/lineup', { id: liveId, formation: '4-3-3', lineup: { 500: 'GK' }, publish: true });
t('publish: a publish nudge', nudgesFor(liveId).at(-1)?.kind === 'publish');
await call(member, '/api/events/rsvp', { ids: [laterId], status: 'yes' });
t('no line-up on the later event: a yes/no answer sends no lineup nudge', nudgesFor(laterId).length === 0);
await call(member2, '/api/events/rsvp', { ids: [liveId], status: 'yes' });
t('a yes on the line-up event nudges the ready check', nudgesFor(liveId).at(-1)?.kind === 'rsvp');
await call(member, '/api/events/checkin', { id: liveId, on: true });
t('check-in nudges the ready check', nudgesFor(liveId).at(-1)?.kind === 'checkin');
t('nudges carry no roster data (no names, no ids beyond the event)', nudgesFor(liveId).every((p) => Object.keys(p).sort().join() === 'at,id,kind,name,room,t' || Object.keys(p).sort().join() === 'at,id,kind,name,room,t'.replace('room,', '')) && !JSON.stringify(nudgesFor(liveId)).includes('Player'));
t('a room name outside lineup:<id> is refused (no push)', (await broadcastRoom(env, 'lineup:NaN', { t: 'x' })) === false);
delete env.CLUB_ROOM;

// ----- the room: fans out to everyone joined, ignores what clients send -----
const sockets = [];
const sent = (who) => ({ who, sent: [], send(d) { this.sent.push(d); }, close() {} });
const room = new ClubRoom({ getWebSockets: () => sockets, setWebSocketAutoResponse() {} }, {});
const a = sent('600'), b = sent('601');
sockets.push(a, b);
await room.fetch(new Request('https://room/push', { method: 'POST', body: JSON.stringify({ t: 'lineup', id: liveId, kind: 'draft' }) }));
t('room: a push reaches every connected manager', a.sent.length === 1 && b.sent.length === 1 && JSON.parse(a.sent[0]).kind === 'draft');
await room.webSocketMessage(a, 'send me the roster');
t('room: client messages are ignored (broadcast-only)', a.sent.length === 1);

// ----- site wiring: the builder subscribes, re-reads on a nudge, and never clobbers unsaved edits -----
const evJs = fs.readFileSync(ROOT + 'web/events.js', 'utf8');
t('site: the builder opens the lineup socket and refreshes from /api/events', evJs.includes('/lineup/ws?t=') && evJs.includes("ctx.call('/api/events')") && evJs.includes('openLineupLive(e.id'));
t('site: an unsaved draft is kept when someone else saves', evJs.includes('if (!dirty) { adopt(fresh)') && evJs.includes('your unsaved changes are kept'));
t('site: the ready check is shown in the builder for managers', evJs.includes('lu-ready') && evJs.includes('readyView(e)'));
done();
