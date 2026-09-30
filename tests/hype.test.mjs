// Auto hype poster + AI recap (P11.6/P11.7/P11.10): no-op without a configured channel, remembers-but-skips
// the first match after deploy, posts once per new match id, and degrades gracefully when either AI call fails.
import { env } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { checkHype } from '../bot/hype.js';

env.DISCORD_BOT_TOKEN = 'bot';
const club = (id, over = {}) => ({ name: 'NOREX', matches: [{ id, gf: 3, ga: 1, res: 'W', opp: 'Rivals FC', url: 'https://x/', scorers: [{ n: 'Alice', g: 2 }], motm: 'Alice', ...over }] });
const loadSite = (data) => (() => Promise.resolve(data));

t('no HYPE_CHANNEL configured → no-op even with new data', await (async () => (await checkHype(env, loadSite(club('m1')))).posted === false)());

env.HYPE_CHANNEL = JSON.stringify({ channel: '555' });
const posts = [];
let imgFail = false, textFail = false;
env.AI = {
  run: async (model, input) => {
    if (model.includes('llama')) { if (textFail) throw new Error('text model down'); return { response: 'NOREX ran riot in a dominant win.' }; }
    if (imgFail) throw new Error('image model down');
    return { image: Buffer.from('x'.repeat(600)).toString('base64') };
  },
};
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/channels/555/messages')) { posts.push(init); return new Response('{}', { status: 200 }); }
  return realFetch(url, init);
};
const lastEmbed = () => JSON.parse(posts.at(-1).body.get('payload_json')).embeds[0];

await tt('first run after deploy remembers the match but does not post', async () => {
  const r = await checkHype(env, loadSite(club('m1')));
  return r.posted === false && posts.length === 0;
});
await tt('same match id again → still no-op', async () => (await checkHype(env, loadSite(club('m1')))).posted === false && posts.length === 0);
await tt('a genuinely new match id → posts once with the AI recap as the description', async () => {
  const r = await checkHype(env, loadSite(club('m2')));
  return r.posted === true && posts.length === 1 && lastEmbed().description.includes('dominant win');
});
await tt('image model failing does not block the post, just drops the image', async () => {
  imgFail = true;
  const r = await checkHype(env, loadSite(club('m3')));
  imgFail = false;
  return r.posted === true && posts.length === 2 && lastEmbed().image === undefined;
});
await tt('text model failing falls back to a plain result line, still posts', async () => {
  textFail = true;
  const r = await checkHype(env, loadSite(club('m4')));
  textFail = false;
  return r.posted === true && posts.length === 3 && lastEmbed().description.includes('Victory');
});
globalThis.fetch = realFetch;
done();
