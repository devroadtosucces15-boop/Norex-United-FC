// P8.1 Full visibility: GET /api/admin/submissions?type=… aggregates feedback, ratings, award votes,
// predictions, suggestions and builds for the manager portal, with search + manager-only gate.
import { call, env, login, siteJson, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const claim = (uid, p, name) => sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at, name) VALUES (?, ?, ?, 'approved', ?, ?)").run(uid, p.k, p.n, Date.now(), name);
setFlags({ builder: 'members' });
const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('500', [], 'Player One');
const m2 = await login('501', [], 'Player Two');
const home = siteJson('players').filter((p) => p.home);
claim('500', home[0], 'Player One');
claim('501', home[1], 'Player Two');

t('member cannot list submissions → 403', (await call(m1, '/api/admin/submissions?type=feedback')).s === 403);
t('unknown type → 400', (await call(mgr, '/api/admin/submissions?type=nonsense')).s === 400);

// ----- feedback, with author -----
await call(m1, '/api/feedback/send', { to: '501', kind: 'praise', text: 'Great game last night, well played out there' });
let r = await call(mgr, '/api/admin/submissions?type=feedback');
t('feedback: manager sees the author', r.s === 200 && r.d.rows.length === 1 && r.d.rows[0].author === 'Player One');
r = await call(mgr, '/api/admin/submissions?type=feedback&q=Player+One');
t('feedback: search by author name', r.d.rows.length === 1);
t('feedback: search miss → empty', (await call(mgr, '/api/admin/submissions?type=feedback&q=nobody')).d.rows.length === 0);

// ----- star ratings (can't rate your own claimed player, so rate the other home player) -----
await call(m1, '/api/ratings/rate', { player: home[2].k, stars: 4 });
r = await call(mgr, '/api/admin/submissions?type=ratings');
t('ratings: manager sees who rated whom', r.d.rows.length === 1 && r.d.rows[0].author === 'Player One' && r.d.rows[0].subject === home[2].k);

// ----- award votes -----
setFlags({ awards: 'public' });
const cat = (await call(m1, '/api/awards')).d.categories[0];
await call(m1, '/api/awards/vote', { category: cat.id, player: home[2].k });
r = await call(mgr, '/api/admin/submissions?type=awardVotes');
t('award votes: manager sees the voter', r.d.rows.length === 1 && r.d.rows[0].author === 'Player One' && r.d.rows[0].subject === home[2].k);

// ----- suggestions -----
await call(m1, '/api/suggestions', { title: 'Add a poll for match nights', anon: true });
r = await call(mgr, '/api/admin/submissions?type=suggestions');
t('suggestions: manager sees the real author even when anon', r.d.rows.length === 1 && r.d.rows[0].author === 'Player One');

// ----- builds (squad-builder submissions) -----
await call(m1, '/api/builds', { title: 'Target Man', code: 'a=finisher&l=30&p=3x4.5x2&ps=0&h=185&v=fc27-launch' });
r = await call(mgr, '/api/admin/submissions?type=builds');
t('builds: manager sees who saved it', r.d.rows.length === 1 && r.d.rows[0].author === 'Player One');

// ----- predictions: no event set up in this test, just checks the endpoint shape -----
r = await call(mgr, '/api/admin/submissions?type=predictions');
t('predictions: empty but well-formed', r.s === 200 && Array.isArray(r.d.rows));

done();
