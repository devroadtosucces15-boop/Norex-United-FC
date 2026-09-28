// Feature flags (P0.7): levels off | owner | managers | members | public, enforced by the Worker.
import fs from 'node:fs';
import { ROOT, call, config, env, login } from './mock.mjs';
import { t, done } from './lib.mjs';
import { FLAG_LEVELS, featuresFor, flagOn, flags } from '../bot/roles.js';

const who = { guest: null, member: { role: 'member' }, claimed: { role: 'claimed' }, manager: { role: 'manager' }, owner: { role: 'owner' } };
const expect = { off: [], owner: ['owner'], managers: ['manager', 'owner'], members: ['member', 'claimed', 'manager', 'owner'], public: Object.keys(who) };
const e = (f) => ({ FEATURES: JSON.stringify(f) });
for (const lvl of FLAG_LEVELS) {
  const seen = Object.entries(who).filter(([, u]) => flagOn(e({ x: lvl }), u, 'x')).map(([k]) => k);
  t(`level ${lvl} → ${seen.join(', ') || 'nobody'}`, seen.join() === expect[lvl].join());
}
t('unknown flag → off', !flagOn(e({}), who.owner, 'nope'));
t('invalid level → off', flags(e({ x: 'everyone' })).x === 'off' && !flagOn(e({ x: 'everyone' }), who.owner, 'x'));
t('broken FEATURES JSON → all off, no crash', Object.keys(flags({ FEATURES: '{oops' })).length === 0);
t('missing FEATURES → all off', Object.keys(flags({})).length === 0);
t('featuresFor lists only unlocked', featuresFor(e({ a: 'owner', b: 'members', c: 'off' }), who.member).join() === 'b');
t('config.json levels are all valid', Object.values(config.features ?? {}).every((v) => FLAG_LEVELS.includes(v)));

// Through the API: /api/me lists features, gated routes 404, owner sees the flag table.
const owner = await login('111');
const mgr = await login('600', ['mgr']);
const member = await login('500');
env.FEATURES = JSON.stringify({ rushLog: 'owner', demo: 'managers' });
t('/api/me features per role', (await call(owner, '/api/me')).d.user.features.join() === 'rushLog,demo' && (await call(mgr, '/api/me')).d.user.features.join() === 'demo' && (await call(member, '/api/me')).d.user.features.length === 0);
t('rushLog=owner: member → 404', (await call(member, '/api/rush/queue')).s === 404);
t('rushLog=owner: manager → 404', (await call(mgr, '/api/rush/queue')).s === 404);
t('rushLog=owner: owner → 200', (await call(owner, '/api/rush/queue')).s === 200);
t('public Rush list stays public', (await call(null, '/api/rush')).s === 200);
env.FEATURES = JSON.stringify({ rushLog: 'off' });
t('rushLog=off: owner → 404', (await call(owner, '/api/rush/queue')).s === 404);
env.FEATURES = JSON.stringify({ rushLog: 'members' });
t('rushLog=members: member → 200', (await call(member, '/api/rush/queue')).s === 200);
t('owner overview has the flag table', (await call(owner, '/api/admin/overview')).d.flags?.rushLog === 'members');
t('manager overview has no flag table', (await call(mgr, '/api/admin/overview')).d.flags === undefined);
// QA1: FEATURES/STREAMS must go under [vars] – appended after ensure-resources' [[d1_databases]] they were silently ignored
const deployStep = fs.readFileSync(ROOT + '.github/workflows/bot.yml', 'utf8').split('\n').find((l) => l.includes('FEATURES') && l.includes('run:')) ?? '';
t('bot.yml writes flags under [vars], not at the end of wrangler.toml', deployStep.includes('[vars]') && !deployStep.includes('appendFileSync'));
done();
