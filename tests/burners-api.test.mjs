// C5: the staff site API for the burner tracker (bot/burners.js burnersAdminRoute) – list, search, track, remove.
import { call, env, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ burners: 'managers' });
const member = await login('800', [], 'Plain Member');
const mgr = await login('801', ['mgr'], 'Mgr One');

t('a plain member cannot list burners', (await call(member, '/api/burners')).s === 404 || (await call(member, '/api/burners')).s === 403);
t('a guest is refused', (await call(null, '/api/burners')).s === 401);
t('empty list for a manager', (await call(mgr, '/api/burners')).d?.clubs?.length === 0);

const bad = await call(mgr, '/api/burners/track', { id: 'abc' });
t('track rejects a non-numeric ID', bad.s === 400);
const ok = await call(mgr, '/api/burners/track', { id: '1355341', name: 'TeloSico', crest: '99' });
t('track stores the club with who added it', ok.s === 200 && sqlite.prepare('SELECT added_by_name, active, crest FROM burner_clubs WHERE club_id = ?').get('1355341').crest === '99');
t('tracking twice says already, no duplicate', (await call(mgr, '/api/burners/track', { id: '1355341', name: 'TeloSico' })).d.already === true && sqlite.prepare('SELECT COUNT(*) AS n FROM burner_clubs').get().n === 1);
const list = (await call(mgr, '/api/burners')).d;
t('list shows the club with its collected record (or null while pending)', list.clubs.length === 1 && list.clubs[0].id === '1355341' && (list.clubs[0].stats === null || typeof list.clubs[0].stats.w === 'number') && list.max > 0);
t('search needs 2 letters', (await call(mgr, '/api/burners/search?q=a')).s === 400);
const sug = await call(mgr, '/api/burners/search');
t('suggestions come back as linked + recent lists', sug.s === 200 && Array.isArray(sug.d.linked) && Array.isArray(sug.d.recent));
t('a member cannot track or remove', [(await call(member, '/api/burners/track', { id: '5' })).s, (await call(member, '/api/burners/remove', { id: '1355341' })).s].every((s) => s === 403 || s === 404));
t('removing an unknown club is a 404', (await call(mgr, '/api/burners/remove', { id: '42' })).s === 404);
t('remove stops tracking but keeps the row', (await call(mgr, '/api/burners/remove', { id: '1355341' })).s === 200 && sqlite.prepare('SELECT active FROM burner_clubs WHERE club_id = ?').get('1355341').active === 0);
t('the keyed endpoint fetch.mjs reads is untouched (still keyed)', (await call(null, '/api/burners/tracked')).s === 403);
setFlags({ burners: 'off' });
t('flag off hides the whole API', (await call(mgr, '/api/burners')).s === 404);
done();
