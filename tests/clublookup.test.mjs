// On-demand club lookup (P9.4): indexed clubs answer from D1; unknown ones are fetched live once and saved.
import { W, env } from './mock.mjs';
import { t, done } from './lib.mjs';
import { crawlKey } from '../bot/crawl.js';

const key = await crawlKey(env.DISCORD_CLIENT_SECRET);
const seed = await W('/api/crawl', { method: 'POST', headers: { 'X-Norex-Key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ cursor: 2, found: [{ id: '777', name: 'Lookup Rovers', crest: '42' }] }) });
t('seeds one indexed club', seed.status === 200);

const look = (q) => W(`/api/clubs/lookup?q=${encodeURIComponent(q)}`).then(async (x) => ({ s: x.status, d: await x.json() }));

const short = await look('a');
t('rejects a one-character query', short.s === 400);

const byId = await look('777');
t('finds an indexed club by id without calling EA', byId.s === 200 && byId.d.results[0]?.name === 'Lookup Rovers' && byId.d.live === false);

const byName = await look('rover');
t('finds an indexed club by partial name', byName.d.results.some((r) => r.id === '777'));

// Unknown id: stub EA's clubs/info so the test never reaches the network.
const realFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url) => {
  calls.push(String(url));
  if (String(url).includes('clubs/info') && String(url).includes('clubIds=9001')) {
    return new Response(JSON.stringify({ 9001: { name: 'Fresh Club', customKit: { crestAssetId: '555' } } }), { status: 200 });
  }
  return new Response('[]', { status: 200 });
};
try {
  const live = await look('9001');
  t('fetches an unindexed id live and returns it', live.d.results[0]?.name === 'Fresh Club' && live.d.results[0]?.live === true);
  t('makes exactly one EA call for it', calls.length === 1 && calls[0].includes('clubs/info'));

  const again = await look('9001');
  t('a second search for the same id is answered from the index', again.d.results[0]?.live === false && calls.length === 1);

  calls.length = 0;
  const miss = await look('424242');
  t('an id EA does not know returns no results (no crash)', miss.s === 200 && miss.d.results.length === 0);

  calls.length = 0;
  await look('nobody club');
  t('a name search makes at most one EA call', calls.length <= 1);
} finally {
  globalThis.fetch = realFetch;
}

done();
