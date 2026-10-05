// Tactics Studio live co-editing (redesign BE1): managers join room 'studio:<id>' through a socket, send one op at a
// time through POST /api/plays/:id/op, and every op is stamped by the Worker from the session (never the body).
import fs from 'node:fs';
import { call, env, login, ROOT, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import { broadcastRoom } from '../bot/clubroom.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ tactics: 'members' });

const mgr = await login('700', ['mgr'], 'Coach');
const mgr2 = await login('701', ['mgr'], 'Assistant');
const member = await login('702', [], 'Player One');

const made = await call(mgr, '/api/plays', { title: 'Live corner', category: 'set-piece' });
const id = made.d.id;

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
const last = () => pushes.at(-1);
const op = (tok, body, path = `/api/plays/${id}/op`) => call(tok, path, body);

// ----- ops: who may send, and what gets relayed -----
t('op: 503 while the live-room binding is not set up', (await op(mgr, { op: { k: 'chalkClear' } })).s === 503);
env.CLUB_ROOM = fakeNs;
t('op: 401 without a session', (await op(null, { op: { k: 'chalkClear' } })).s === 401);
t('op: 403 for a member (they cannot edit)', (await op(member, { op: { k: 'chalkClear' } })).s === 403);
t('op: 404 for an unknown play', (await op(mgr, { op: { k: 'chalkClear' } }, '/api/plays/99999/op')).s === 404);

const r1 = await op(mgr, { op: { k: 'piece', id: 'p1', team: 'us', x: 400, y: 300, label: 'N' } });
t('op: a manager piece move is relayed to studio:<id>', r1.s === 200 && r1.d.ok === true && last()?.name === `studio:${id}`);
t('op: the relayed event carries the sender from the session', last().by === '700' && last().n === 'Coach' && last().t === 'studio');
t('op: the server stamps a time for last-write-wins', Number.isFinite(last().at));
t('op: the piece is cleaned to the known fields', JSON.stringify(last().op) === JSON.stringify({ k: 'piece', id: 'p1', team: 'us', x: 400, y: 300, label: 'N' }));

// Spoofing: the body names another member and carries extra fields; neither reaches the room.
await op(mgr, { by: '702', n: 'Player One', at: 1, op: { k: 'pieceDel', id: 'p1', by: '702', extra: 'x' } });
t('spoof: a body claiming another member id is ignored (by = session user)', last().by === '700' && last().n === 'Coach');
t('spoof: the server stamps time, not the client', last().at > 1 && last().op.extra === undefined && last().op.by === undefined);
await op(mgr2, { op: { k: 'pieceDel', id: 'p1' } });
t('two managers: each op carries the right sender', last().by === '701' && last().n === 'Assistant');

// Refused shapes: nothing is relayed.
const before = pushes.length;
const bad = [
  { k: 'piece', id: 'p2', team: 'ref', x: 1, y: 1 },
  { k: 'piece', id: 'p2', team: 'us', x: 5000, y: 1 },
  { k: 'stroke', sid: 's1', points: [[1, 1]] },
  { k: 'key', at: 999999, pieces: {} },
  { k: 'shutdown' },
  null,
];
const codes = [];
for (const o of bad) codes.push((await op(mgr, { op: o })).s);
t('refused: bad team, off-pitch, short stroke, bad keyframe time, unknown kind, empty', codes.every((s) => s === 400) && pushes.length === before);
t('refused: an oversize op is 413 and not relayed', (await op(mgr, { op: { k: 'stroke', sid: 's9', points: Array.from({ length: 60 }, (_, i) => [i, i]), color: 'x'.repeat(5000) } })).s === 413 && pushes.length === before);

// Chalk: a stroke with a bad colour falls back to the crest red; points are clipped to the pitch.
await op(mgr, { op: { k: 'stroke', sid: 's1', color: 'javascript:1', points: [[10, 10], [2000, 5], [20, 20]] } });
t('chalk: stroke colour is sanitised and off-pitch points are dropped', last().op.k === 'stroke' && last().op.color === '#c8352c' && last().op.points.length === 2);
await op(mgr, { op: { k: 'strokeDel', sid: 's1' } });
t('chalk: strokeDel and chalkClear are relayed', last().op.k === 'strokeDel' && (await op(mgr, { op: { k: 'chalkClear' } })).s === 200 && last().op.k === 'chalkClear');

// Keyframes: positions are kept only for valid coordinates.
await op(mgr, { op: { k: 'key', at: 2000.4, pieces: { p1: { x: 100, y: 100 }, bad: { x: -1, y: 1 } } } });
t('keyframe: time rounded, off-pitch positions removed', last().op.k === 'key' && last().op.at === 2000 && Object.keys(last().op.pieces).join() === 'p1');
await op(mgr, { op: { k: 'keyDel', at: 2000 } });
t('keyframe: keyDel relayed', last().op.k === 'keyDel' && last().op.at === 2000);

// ----- saves: the version path still stores, and announces the new version to the room -----
const doc = { pieces: [{ id: 'p1', team: 'us', x: 100, y: 100 }], steps: [], drawings: [{ id: 'c1', points: [[1, 1], [9, 9]], color: '#3aa0ff' }, { points: [[5, 5], [6, 6]] }], quiz: [] };
const saved = await call(mgr, `/api/plays/${id}`, { doc });
t('save: still a new version, unchanged behaviour', saved.s === 200 && saved.d.version === 2);
t('save: the room hears about the new version from the server', last().op.k === 'saved' && last().op.version === 2 && last().by === '700');
t('save: a drawing keeps its id, and one without an id gets one', saved.d.doc.drawings[0].id === 'c1' && typeof saved.d.doc.drawings[1].id === 'string' && saved.d.doc.drawings[1].id.length > 0);

// ----- the socket: who may join -----
const ws = (tok, path = `/api/plays/${id}/ws`, up = true) => W(`${path}${tok ? `?t=${encodeURIComponent(tok)}` : ''}`, { headers: up ? { Upgrade: 'websocket' } : {} });
t('ws: 404 without a session', (await ws(null)).status === 404);
t('ws: 403 for a member', (await ws(member)).status === 403);
t('ws: 426 without an Upgrade header', (await ws(mgr, `/api/plays/${id}/ws`, false)).status === 426);
t('ws: a non-numeric play id never opens a socket', (await ws(mgr, '/api/plays/abc/ws')).status !== 200);
t('ws: 404 for an unknown play', (await ws(mgr, '/api/plays/99999/ws')).status === 404);
t('ws: a manager joins room studio:<id> as themself', (await ws(mgr)).status === 200 && joins.at(-1)?.name === `studio:${id}` && joins.at(-1).url.includes('u=700'));

// ----- room: broadcast-only, so the client can't send ops over the socket -----
const room = (await import('../bot/clubroom.js')).ClubRoom;
const sockets = [];
const sent = (who) => ({ who, sent: [], send(d) { this.sent.push(d); }, close() {} });
const rm = new room({ getWebSockets: () => sockets, setWebSocketAutoResponse() {} }, {});
const a = sent('700'), b = sent('701');
sockets.push(a, b);
await rm.fetch(new Request('https://room/push', { method: 'POST', body: JSON.stringify({ t: 'studio', id, op: { k: 'chalkClear' }, by: '700', n: 'Coach', at: 1 }) }));
t('room: the relayed op reaches every connected manager', a.sent.length === 1 && b.sent.length === 1);
await rm.webSocketMessage(a, JSON.stringify({ t: 'studio', op: { k: 'chalkClear' }, by: '999' }));
t('room: a client-sent op is ignored (cannot spoof)', a.sent.length === 1 && b.sent.length === 1);
t('room: a studio room name outside studio:<id> is refused', (await broadcastRoom(env, 'studio:abc', { t: 'x' })) === false);

// ----- site wiring: the studio opens the socket, sends ops, and applies remote ones with last-write-wins -----
const tactics = fs.readFileSync(ROOT + 'web/tactics.js', 'utf8');
t('site: the studio opens the live socket', tactics.includes('/api/plays/${id}/ws?t=') || tactics.includes('/ws?t='));
t('site: local changes are sent as ops to /op', tactics.includes('/op`') && tactics.includes("k: 'piece'") && tactics.includes("k: 'stroke'") && tactics.includes("k: 'key'"));
t('site: remote ops are applied with per-key last-write-wins', tactics.includes('applyRemote') && tactics.includes('wins('));
t('site: a remote change never re-renders over a focused input', tactics.includes('pendingRender') && tactics.includes('busy()'));

// Save path untouched: the client still posts the whole document to /api/plays/:id.
t('site: Save still posts the whole document (source of truth)', tactics.includes("call(`/api/plays/${active}`, { doc: studio.doc })"));

done();
