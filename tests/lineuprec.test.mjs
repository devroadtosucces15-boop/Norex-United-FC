// P11.15 AI lineup recommender: combines P11.14's per-player read with the P3.4 lineup shape.
import { call, env, login, siteJson, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ events: 'public', lineupRec: 'owner' });

const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500', [], 'Player One');
const day = (d) => new Date(Date.now() + d * 86400e3).toISOString().slice(0, 10);

const made = await call(mgr, '/api/events', { type: 'league', date: day(3), time: '20:00', tz: 'UTC' });
const evId = made.d.id;

t('flag off (default members) → 404 for a manager', (await call(mgr, '/api/events/recommend', { id: evId })).s === 404);
setFlags({ lineupRec: 'members' });

t('members cannot suggest a lineup (managers only)', (await call(member, '/api/events/recommend', { id: evId })).s === 403);
t('no one said yes yet → empty lineup, no crash', (await (async () => { const r = await call(mgr, '/api/events/recommend', { id: evId }); return r.s === 200 && r.d.formation === '4-3-3' && Object.keys(r.d.lineup).length === 0; })()));

// A home player with enough League games in the squad archive to get a stats-based best-position read.
const squad = siteJson('squad'), players = siteJson('players');
const pl = players.filter((p) => p.home).find((p) => (squad.players[p.k] ?? []).length >= 5);
sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at, name) VALUES ('500', ?, ?, 'approved', ?, 'Player One')").run(pl.k, pl.n, Date.now());
await call(member, '/api/events/rsvp', { ids: [evId], status: 'yes' });
const member2 = await login('501', [], 'Player Two');
await call(member2, '/api/events/rsvp', { ids: [evId], status: 'yes' }); // no claim – falls back to profile position

const r = await call(mgr, '/api/events/recommend', { id: evId });
t('200, a formation, and both confirmed players placed in the lineup', r.s === 200 && r.d.formation === '4-3-3' && Object.keys(r.d.lineup).length === 2 && '500' in r.d.lineup && '501' in r.d.lineup);
t('every slot used is one of the formation’s own slots', Object.values(r.d.lineup).every((slot) => ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CDM', 'RCM', 'LW', 'ST', 'RW'].includes(slot)));
t('the claimed player has a rated reason, the unclaimed one a fallback reason', /Rated/.test(r.d.reasons['500']) && /not enough games/.test(r.d.reasons['501']));
t('unknown formation in the request falls back to a real one', (await call(mgr, '/api/events/recommend', { id: evId, formation: 'nope' })).d.formation === '4-3-3');
t('picking a different valid formation is honoured', (await call(mgr, '/api/events/recommend', { id: evId, formation: '4-4-2' })).d.formation === '4-4-2');
t('bogus event id refused', (await call(mgr, '/api/events/recommend', { id: 999999 })).s === 404);

// Publishing what came back reuses the existing P3.4 lineup route unchanged.
const pub = await call(mgr, '/api/events/lineup', { id: evId, formation: r.d.formation, lineup: r.d.lineup, publish: true });
t('the suggested lineup is a valid draft for the real /api/events/lineup route', pub.s === 200 && pub.d.events.find((e) => e.id === evId).formation === r.d.formation);

done();
