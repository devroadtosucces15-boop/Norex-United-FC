// BE10: GET /api/intel (Boardroom read of the Club Intelligence report), POST /api/intel/act (mark a
// recommendation handled, or undo), POST /api/intel/remind (DM the other managers about one). Builds on
// bot/insights.js's /insights report – see tests/insights.test.mjs for the analysis itself.
import { call, env, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ insights: 'managers', notifications: 'members' });
env.DISCORD_BOT_TOKEN = 'bot-token'; // insightsNow() requires it even when reusing a cached report

const member = await login('700', [], 'Plain Member');
const mgr1 = await login('701', ['mgr'], 'Mgr One');
const mgr2 = await login('702', ['mgr'], 'Mgr Two');

const REC = { sev: 2, area: 'admin', kind: 'backlog', id: 'admin.backlog', text: '**3** items waiting for a manager.' };
const seedReport = (overrides = {}) => {
  const report = { at: Date.now(), guild: 'NOREX', overall: 70, scores: { server: 70, site: 70, admin: 70, team: 70 }, server: {}, site: {}, admin: {}, team: {}, history: [], recs: [REC], key: {}, ...overrides };
  sqlite.prepare("INSERT INTO meta (key, value) VALUES ('insights', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(JSON.stringify(report));
  return report;
};
const acted = () => JSON.parse(sqlite.prepare("SELECT value FROM meta WHERE key = 'insights_acted'").get()?.value ?? '{}');

seedReport();

t('plain member → 404 (flag is managers-only)', (await call(member, '/api/intel')).s === 404);
t('flag off → 404 for a manager too', await (async () => { setFlags({ insights: 'off' }); const r = await call(mgr1, '/api/intel'); setFlags({ insights: 'managers' }); return r.s === 404; })());
t('flag on but not a manager → 403', await (async () => { setFlags({ insights: 'members' }); const r = await call(member, '/api/intel'); setFlags({ insights: 'managers' }); return r.s === 403; })());

let r = await call(mgr1, '/api/intel');
t('manager GET: the cached report, rec carries its id, not yet acted', r.s === 200 && r.d.overall === 70 && r.d.recs[0].id === 'admin.backlog' && r.d.recs[0].acted === null);

r = await call(mgr1, '/api/intel/act', { id: 'nope' });
t('act on an id the current report no longer has → 404', r.s === 404);

r = await call(mgr1, '/api/intel/act', { id: 'admin.backlog' });
t('act: marks it done, returns the updated report', r.s === 200 && r.d.recs[0].acted?.by === 'Mgr One' && acted()['admin.backlog']?.by === 'Mgr One');

r = await call(mgr1, '/api/intel');
t('act persists across a fresh GET', r.d.recs[0].acted?.by === 'Mgr One');

r = await call(mgr1, '/api/intel/act', { id: 'admin.backlog', undo: true });
t('act: undo clears it', r.s === 200 && r.d.recs[0].acted === null && !('admin.backlog' in acted()));

r = await call(mgr1, '/api/intel/remind', { id: 'admin.backlog' });
t('remind: notifies the other manager, not the one who clicked it', r.s === 200 && r.d.notified === 1);
const n = sqlite.prepare("SELECT * FROM notifications WHERE user_id = '702' ORDER BY id DESC LIMIT 1").get();
t('remind: notification carries the recommendation text', n && /items waiting/.test(n.body) && n.title === 'Club Intelligence reminder');
t('remind: not sent to the acting manager', !sqlite.prepare("SELECT 1 FROM notifications WHERE user_id = '701' AND title = 'Club Intelligence reminder'").get());

seedReport({ recs: [] }); // the report moved on – the old id is gone
t('remind on a stale id → 404', (await call(mgr1, '/api/intel/remind', { id: 'admin.backlog' })).s === 404);

done();
