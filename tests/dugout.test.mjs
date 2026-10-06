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
// ----- board 08 front end: the Dugout as the manager portal's home (flag dugout, owner) -----
const dgJs = fs.readFileSync(ROOT + 'web/dugout.js', 'utf8');
const css08 = fs.readFileSync(ROOT + 'web/style.css', 'utf8');
const appJs8 = fs.readFileSync(ROOT + 'web/app.js', 'utf8');
t('board 08: dugout flag ships at managers (QA passed 2026-10-06)', JSON.parse(fs.readFileSync(ROOT + 'config.json', 'utf8')).features.dugout === 'managers');
// QA fixes: a cancelled drag leaves no hidden pick, a shape change keeps the players, the claim card survives pointercancel
t('board 08 QA: a drag that lands nowhere clears the pick', /ondragend = \(ev\) => \{[^}]*D\.pick = null/.test(dgJs));
t('board 08 QA: changing the formation keeps players (reshape by position), not a wipe', dgJs.includes('function reshape(next)') && dgJs.includes('reshape(ev.target.value)') && !dgJs.includes("D.formation = ev.target.value; D.slots = {}"));
t('board 08 QA: claim card resets on pointercancel', dgJs.includes('el.onpointercancel'));
t('board 08 QA: editing a published line-up says it is not re-posted', dgJs.includes('post again to tell players'));
t('board 08 QA: the trials funnel gets the full row', css08.includes('.dg-tr{grid-column:1/-1;order:3}'));
t('board 08: Dugout is the first manager sub-tab when the flag is on, and loads assets/dugout.js', appJs8.includes("flagOn('dugout', baseRole) ? [['dugout', '🧢 Dugout']]") && appJs8.includes('assets/dugout.js') && appJs8.includes("S.adminTab = 'dugout'"));
t('board 08: only existing routes – lineup draft/publish, trials move, plays, claims via decide()', ["'/api/events/lineup'", "'/api/trials/update'", "'/api/plays'", "'/api/events'", 'ctx.decide(user, action)'].every((x) => dgJs.includes(x)));
t('board 08: drag + tap fallback for the pitch and the funnel, swipe for claims', dgJs.includes('ondrop') && dgJs.includes('data-move') && dgJs.includes('onpointerup') && dgJs.includes('Math.abs(dx) > 110'));
t('board 08: publishing asks first; a pending drag is never thrown away', dgJs.includes("ctx.UI.confirm({ title: 'Post the line-up?'") && dgJs.includes('never throw away an unsaved drag'));
t('board 08: member/EA text escaped in HTML (toasts escape their own text)', !dgJs.split('\n').filter((l) => !l.includes('ctx.toast(')).some((l) => /\$\{(p|c|t|r|e)\.(n|ea|title|playerName)\}/.test(l)));
// ----- board 08 C3: plays for tonight (POST /api/events/plays) + the Dugout listening live -----
setFlags({ tactics: 'members' });
const mkPlay = async (title, pub) => { const r = await call(mgr, '/api/plays', { title, category: 'set-piece' }); if (pub) await call(mgr, `/api/plays/${r.d.id}/publish`, { published: true }); return r.d.id; };
const pA = await mkPlay('Near-post corner', true), pB = await mkPlay('Low block', true), pDraft = await mkPlay('Secret draft', false);
t('plays: a member cannot pin plays', (await call(member, '/api/events/plays', { id: laterId, plays: [pA] })).s === 403);
t('plays: a draft play cannot be pinned', (await call(mgr, '/api/events/plays', { id: laterId, plays: [pDraft] })).s === 400);
t('plays: more than 4 is refused', (await call(mgr, '/api/events/plays', { id: laterId, plays: [1, 2, 3, 4, 5] })).s === 400);
t('plays: a missing event is a 404', (await call(mgr, '/api/events/plays', { id: 999999, plays: [pA] })).s === 404);
env.CLUB_ROOM = fakeNs;
const before = nudgesFor(laterId).length;
await call(mgr, '/api/events/lineup', { id: laterId, formation: '4-3-3', lineup: { 500: 'GK', 501: 'ST' }, publish: false });
await call(mgr, `/api/plays/${pA}/assign`, { userIds: ['500', '501'] });
await call(member, `/api/plays/${pA}/learned`, { learned: true });
const pinned = await call(mgr, '/api/events/plays', { id: laterId, plays: [pA, pB, pA] });
const ev8 = pinned.d.events?.find((e) => e.id === laterId);
t('plays: pinning returns the schedule with titles in order, de-duplicated', pinned.s === 200 && ev8?.plays.map((p) => p.id).join() === `${pA},${pB}` && ev8.plays[0].title === 'Near-post corner');
t('plays: managers see who is assigned and who learned it', ev8?.plays[0].assigned.length === 2 && ev8.plays[0].learned.join() === '500' && ev8.plays[1].assigned.length === 0);
t('plays: pinning nudges the live Dugout room', nudgesFor(laterId).length > before && nudgesFor(laterId).at(-1)?.kind === 'plays');
delete env.CLUB_ROOM;
const memEv = (await call(member, '/api/events')).d.events.find((e) => e.id === laterId);
t('plays: members see tonight\'s plays by title, never who learned what', memEv?.plays.length === 2 && memEv.plays.every((p) => p.title && p.assigned === undefined && p.learned === undefined));
await call(mgr, `/api/plays/${pB}/publish`, { published: false });
t('plays: an unpublished play drops off the night', (await call(mgr, '/api/events')).d.events.find((e) => e.id === laterId)?.plays.map((p) => p.id).join() === `${pA}`);
t('plays: an empty list clears the pins', (await call(mgr, '/api/events/plays', { id: laterId, plays: [] })).d.events.find((e) => e.id === laterId)?.plays.length === 0);
t('board 08 C3: Dugout pins/assigns via the routes, shows the starters-learned line', ["'/api/events/plays'", '/assign`', 'starters know all', 'data-pin', 'data-assign'].every((x) => dgJs.includes(x)));
t('board 08 C3: Dugout listens on the lineup room and keeps unsaved edits', dgJs.includes('/lineup/ws?t=') && dgJs.includes('function listen(e)') && dgJs.includes('!D.dirty && !D.pick') && dgJs.includes('if (!el?.isConnected) return close()'));
done();
