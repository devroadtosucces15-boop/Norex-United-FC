// Resumable club-ID crawl (P9.1): checkpoint + lightweight index kept in D1 behind the shared crawl key.
import { W, env } from './mock.mjs';
import { t, done } from './lib.mjs';
import { crawlKey } from '../bot/crawl.js';

const key = await crawlKey(env.DISCORD_CLIENT_SECRET);
const crawl = (k = key, init) => W('/api/crawl', { headers: { 'X-Norex-Key': k, ...(init?.method === 'POST' ? { 'Content-Type': 'application/json' } : {}) }, ...init })
  .then(async (x) => ({ s: x.status, d: await x.json() }));

t('crawl needs the shared key', (await crawl('wrong')).s === 403);
t('crawl needs the key at all', (await W('/api/crawl')).status === 403);

const start = await crawl();
t('starts at cursor 1 with nothing indexed yet', start.d.cursor === 1 && start.d.indexed === 0);

const post = await crawl(key, { method: 'POST', body: JSON.stringify({
  cursor: 16,
  found: [{ id: '5', name: 'FC Testers', crest: '123' }, { id: '9', name: 'Nameless' }],
}) });
t('slice saves and reports how many it kept', post.s === 200 && post.d.saved === 2);

const after = await crawl();
t('cursor advances and the index grows', after.d.cursor === 16 && after.d.indexed === 2);

const bad = await crawl(key, { method: 'POST', body: JSON.stringify({ cursor: 0, found: [] }) });
t('rejects a non-positive cursor', bad.s === 400);

const reup = await crawl(key, { method: 'POST', body: JSON.stringify({ cursor: 31, found: [{ id: '5', name: 'FC Testers Renamed' }] }) });
t('re-checking a club updates its row instead of duplicating it', reup.s === 200);
const final = await crawl();
t('still just 2 rows after the update', final.d.indexed === 2);

// Boardroom health readout: owner-only, reads cursor + count + clubs/day, no writes
const { call, login } = await import('./mock.mjs');
const owner = await login('111');
const hc = (await call(owner, '/api/admin/health')).d.crawl;
t('health shows crawl cursor, count and clubs/day', hc?.ready && hc.cursor === 31 && hc.indexed === 2 && hc.perDay === 2 && hc.lastAt > 0);
t('Boardroom renders the crawl readout', (await import('node:fs')).readFileSync(new URL('../web/boardroom.js', import.meta.url), 'utf8').includes('h.crawl'));

done();
