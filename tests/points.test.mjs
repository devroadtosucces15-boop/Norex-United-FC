// Point system (P11.3): awardPoints(), the /api/points + /api/points/leaderboard route, and the /points
// Discord command. Category wiring (check-in, MOTM vote, rating, prediction) is exercised in-place by
// events/wave8/wave10 tests already passing with awardPoints() added – this file covers the engine itself.
import { call, env, login } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { awardPoints, CATEGORIES } from '../bot/points.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ points: 'members' });

const u1 = await login('701', [], 'Alice');
const u2 = await login('702', [], 'Bob');

// ---------- awardPoints ----------
await tt('unknown category throws', async () => { try { await awardPoints(env, '701', 'nonsense', 5, 'x'); return false; } catch (e) { return /Unknown point category/.test(e.message); } });
await tt('zero delta is a no-op', async () => { const before = (await call(u1, '/api/points')).d.total; await awardPoints(env, '701', 'match', 0, 'x'); return (await call(u1, '/api/points')).d.total === before; });

await awardPoints(env, '701', 'match', 10, 'Hat-trick');
await awardPoints(env, '701', 'attendance', 5, 'Checked in');
await awardPoints(env, '701', 'community', 2, 'MOTM vote');
await awardPoints(env, '702', 'community', 20, 'Very chatty');

// ---------- /api/points ----------
const mine = await call(u1, '/api/points');
t('my total adds up across categories', mine.d.total === 17);
t('breakdown has every category, unused ones at 0', CATEGORIES.every((c) => c in mine.d.by) && mine.d.by.match === 10 && mine.d.by.attendance === 5 && mine.d.by.community === 2 && mine.d.by.behaviour === 0);
t('recent log has the 3 awards, newest first', mine.d.recent.length === 3 && mine.d.recent[0].reason === 'MOTM vote');
t('guest (no token) is refused', (await call(null, '/api/points')).s !== 200);

// ---------- leaderboard ----------
const board = await call(u1, '/api/points/leaderboard');
t('leaderboard ranks Bob above Alice', board.d.rows[0].pts === 20 && board.d.rows[1].pts === 17);

// ---------- flag gate ----------
setFlags({ points: 'off' });
t('flag off → 404 even for a member', (await call(u1, '/api/points')).s === 404);
setFlags({ points: 'members' });

// ---------- /points Discord command ----------
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
async function slash(name, id = '701') {
  const body = JSON.stringify({ type: 2, data: { name }, member: { user: { id, username: `u${id}`, global_name: `G${id}` }, roles: [] } });
  const ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} });
  return res.json();
}
const cmd = await slash('points');
const embed = cmd.data?.embeds?.[0];
t('/points replies with an embed showing the total', !!embed && embed.description.includes('17') && cmd.data.flags === 64);
done();
