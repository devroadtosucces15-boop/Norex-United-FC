// 24/7 uptime monitor (P11.2): pure state-change logic, then the cron wired to fake fetch + real mock D1/KV.
import { env, KV } from './mock.mjs';
import { t, done } from './lib.mjs';
import { diff, checkUptime } from '../bot/monitor.js';

t('all clear, no prior state → no alert', diff(null, []) === null);
t('all clear, was clear → no alert', diff({ down: false, problems: [] }, []) === null);

const down1 = diff(null, ['Site unreachable: x']);
t('goes down → alert + since set', down1.state.down && down1.state.since > 0 && down1.alert.includes('🔴') && down1.alert.includes('Site unreachable'));

const stillDown = diff(down1.state, ['Site unreachable: x']);
t('same problem again → no repeat alert', stillDown === null);

const worse = diff(down1.state, ['Site unreachable: x', 'Member database unreachable: y']);
t('a second problem joins → alerts again, keeps original since', worse.state.down && worse.state.since === down1.state.since && worse.alert.includes('Member database'));

const recovered = diff(worse.state, []);
t('clears → recovery alert, down false', !recovered.state.down && recovered.alert.includes('🟢') && recovered.state.since === null);

t('no repeat recovery alert', diff(recovered.state, []) === null);

// Cron: real mock D1 (healthy) + intercepted site fetch.
const realFetch = globalThis.fetch;
let siteOk = true;
globalThis.fetch = async (url, init) => (String(url).startsWith(env.SITE_URL) ? new Response('{}', { status: siteOk ? 200 : 500 }) : realFetch(url, init));
await KV.put('monitor', JSON.stringify({ down: false, problems: [] }));
await checkUptime(env);
t('cron: healthy site + DB → no state written beyond baseline', (await KV.get('monitor', 'json')).down === false);
siteOk = false;
await checkUptime(env);
const state = await KV.get('monitor', 'json');
t('cron: site failing → down stored with the problem', state.down && state.problems[0].includes('HTTP 500'));
globalThis.fetch = realFetch;
done();
