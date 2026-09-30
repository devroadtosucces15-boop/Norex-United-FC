// Voice recap → highlight card (P11.13): no-op without a configured channel, remembers-but-skips the first
// clip after deploy, transcribes + posts once per new clip, and degrades gracefully when any AI call fails.
import { env } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { bestLine, checkVoiceRecap } from '../bot/voicerecap.js';

env.DISCORD_BOT_TOKEN = 'bot';
const clip = { size: 1000, url: 'https://cdn/x.ogg', content_type: 'audio/ogg', filename: 'voice-message.ogg' };
const msg = (id, over = {}) => ({ id, author: { username: 'Alice' }, attachments: [clip], ...over });
const realFetch = globalThis.fetch;
const loadSite = (data) => (() => Promise.resolve(data));
const club = { name: 'NOREX', crest: 'x.png' };
const posts = [];

// GET /channels/777/messages → `listing`; GET the clip URL → 200 bytes; POST → recorded into `posts`.
function mockDiscord(listing) {
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('/channels/777/messages') && init?.method === 'POST') { posts.push(init); return new Response('{}', { status: 200 }); }
    if (u.includes('/channels/777/messages')) return new Response(JSON.stringify(listing), { status: 200 });
    if (u === clip.url) return new Response(new Uint8Array(200), { status: 200 });
    return realFetch(url, init);
  };
}

t('no VOICE_CHANNEL configured → no-op even with new data', await (async () => (await checkVoiceRecap(env, loadSite(club))).posted === false)());

env.VOICE_CHANNEL = JSON.stringify({ channel: '777' });
let whisperFail = false, textFail = false, imgFail = false;
env.AI = {
  run: async (model) => {
    if (model.includes('whisper')) { if (whisperFail) throw new Error('whisper down'); return { text: 'What a strike! That is an absolute screamer from thirty yards.' }; }
    if (model.includes('llama')) { if (textFail) throw new Error('text model down'); return { response: '"That is an absolute screamer from thirty yards."' }; }
    if (imgFail) throw new Error('image model down');
    return { image: Buffer.from('x'.repeat(600)).toString('base64') };
  },
};
const lastEmbed = () => JSON.parse(posts.at(-1).body.get('payload_json')).embeds[0];

mockDiscord([msg('m1')]);
await tt('first run after deploy remembers the clip but does not post', async () => {
  const r = await checkVoiceRecap(env, loadSite(club));
  return r.posted === false && posts.length === 0;
});
await tt('same clip id again → still no-op', async () => (await checkVoiceRecap(env, loadSite(club))).posted === false && posts.length === 0);

mockDiscord([msg('m2')]);
await tt('a genuinely new clip → transcribes and posts the quote', async () => {
  const r = await checkVoiceRecap(env, loadSite(club));
  return r.posted === true && posts.length === 1 && lastEmbed().description.includes('screamer from thirty yards');
});

mockDiscord([{ id: 'm3', author: { username: 'Bob' }, attachments: [] }]);
await tt('a message with no audio attachment → no-op', async () => (await checkVoiceRecap(env, loadSite(club))).posted === false && posts.length === 1);

mockDiscord([msg('m4')]);
await tt('image model failing does not block the post, just drops the image', async () => {
  imgFail = true;
  const r = await checkVoiceRecap(env, loadSite(club));
  imgFail = false;
  return r.posted === true && posts.length === 2 && lastEmbed().image === undefined;
});

mockDiscord([msg('m5')]);
await tt('text model failing falls back to the transcript itself, still posts', async () => {
  textFail = true;
  const r = await checkVoiceRecap(env, loadSite(club));
  textFail = false;
  return r.posted === true && posts.length === 3 && lastEmbed().description.includes('What a strike!');
});

mockDiscord([msg('m6')]);
await tt('whisper failing (or coming back empty) skips the clip without throwing', async () => {
  whisperFail = true;
  const r = await checkVoiceRecap(env, loadSite(club));
  whisperFail = false;
  return r.posted === false && posts.length === 3;
});

mockDiscord([msg('m7', { attachments: [{ ...clip, size: 9e6 }] })]);
await tt('an oversized clip is skipped without calling the AI', async () => (await checkVoiceRecap(env, loadSite(club))).posted === false && posts.length === 3);

await tt('bestLine falls back to the first sentence when the text model call throws', async () => {
  const line = await bestLine({ AI: { run: async () => { throw new Error('down'); } } }, 'First sentence here. Second sentence here.');
  return line === 'First sentence here.';
});

globalThis.fetch = realFetch;
done();
