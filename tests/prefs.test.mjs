// B4: POST /api/me/prefs { motion } saves the site's motion choice per member and GET /api/me hands it back as user.prefs.motion.
import { call, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';
import { cleanMotion } from '../bot/members.js';

const a = await login('500', [], 'Player One');
const b = await login('501', [], 'Player Two');

t('prefs: guests refused', [401, 404].includes((await call(null, '/api/me/prefs', { motion: 'full' })).s));
t('prefs: nothing saved yet → user.prefs.motion is empty', (await call(a, '/api/me')).d.user.prefs.motion === undefined);
let r = await call(a, '/api/me/prefs', { motion: 'calm' });
t('prefs: calm saves', r.s === 200 && r.d.prefs.motion === 'calm');
t('prefs: GET /api/me returns it', (await call(a, '/api/me')).d.user.prefs.motion === 'calm');
t('prefs: another member is unaffected', (await call(b, '/api/me')).d.user.prefs.motion === undefined);
r = await call(a, '/api/me/prefs', { motion: 'custom:tilt,glow' });
t('prefs: custom with effects off saves and replaces the old value', r.s === 200 && (await call(a, '/api/me')).d.user.prefs.motion === 'custom:tilt,glow');
t('prefs: one row per member', sqlite.prepare("SELECT COUNT(*) n FROM meta WHERE key = 'motion:500'").get().n === 1);
t('prefs: bare custom (everything on) is fine', (await call(a, '/api/me/prefs', { motion: 'custom:' })).s === 200);
for (const bad of ['off', 'custom:sparkle', 'custom:tilt,tilt', 'full; DROP', '', undefined, 'x'.repeat(130), 'custom:' + 'tilt,'.repeat(30)])
  t(`prefs: rejects ${JSON.stringify(bad)?.slice(0, 24)}`, (await call(a, '/api/me/prefs', { motion: bad })).s === 400);
t('prefs: a rejected value leaves the old one', (await call(a, '/api/me')).d.user.prefs.motion === 'custom:');
t('prefs: cleanMotion trims', cleanMotion(' full ') === 'full');
done();
