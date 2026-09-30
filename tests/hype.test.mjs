// Auto hype poster (P11.6, folds in P11.7): no-op without a configured channel, remembers-but-skips the first
// match after deploy, posts once per new match id, and degrades gracefully when the AI art call fails.
import { env } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { checkHype } from '../bot/hype.js';

env.DISCORD_BOT_TOKEN = 'bot';
const club = (id, over = {}) => ({ name: 'NOREX', matches: [{ id, gf: 3, ga: 1, res: 'W', opp: 'Rivals FC', url: 'https://x/', scorers: [{ n: 'Alice', g: 2 }], motm: 'Alice', ...over }] });
const loadSite = (data) => (() => Promise.resolve(data));

t('no HYPE_CHANNEL configured → no-op even with new data', await (async () => (await checkHype(env, loadSite(club('m1')))).posted === false)());

env.HYPE_CHANNEL = JSON.stringify({ channel: '555' });
const posts = [];
let aiFail = false;
env.AI = { run: async () => { if (aiFail) throw new Error('model down'); return { image: Buffer.from('x'.repeat(600)).toString('base64') }; } };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/channels/555/messages')) { posts.push(init); return new Response('{}', { status: 200 }); }
  return realFetch(url, init);
};

await tt('first run after deploy remembers the match but does not post', async () => {
  const r = await checkHype(env, loadSite(club('m1')));
  return r.posted === false && posts.length === 0;
});
await tt('same match id again → still no-op', async () => (await checkHype(env, loadSite(club('m1')))).posted === false && posts.length === 0);
await tt('a genuinely new match id → posts once', async () => {
  const r = await checkHype(env, loadSite(club('m2')));
  return r.posted === true && posts.length === 1;
});
await tt('AI failing does not block the post, just drops the image', async () => {
  aiFail = true;
  const r = await checkHype(env, loadSite(club('m3')));
  aiFail = false;
  return r.posted === true && posts.length === 2;
});
globalThis.fetch = realFetch;
done();
