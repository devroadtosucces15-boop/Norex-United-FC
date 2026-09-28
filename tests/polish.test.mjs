// Public polish (P1.6): crest CORS proxy for the result graphic, share previews, empty states.
import fs from 'node:fs';
import { ROOT, W } from './mock.mjs';
import { t, done } from './lib.mjs';

const CDN = 'https://eafc24.content.easports.com/';
const realFetch = globalThis.fetch;
let asked = [];
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith(CDN)) { asked.push(u); return u.includes('l404.png') ? new Response('nope', { status: 404 }) : new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } }); }
  return realFetch(url, init);
};
const ok = await W('/crest/99160705.png');
t('crest proxy: image with CORS header', ok.status === 200 && ok.headers.get('Access-Control-Allow-Origin') === '*' && ok.headers.get('Content-Type') === 'image/png');
t('crest proxy only fetches the EA crest CDN', asked.length === 1 && asked[0].endsWith('/l99160705.png'));
t('crest proxy: missing crest → 404', (await W('/crest/404.png')).status === 404);
asked = [];
for (const bad of ['/crest/../x.png', '/crest/abc.png', '/crest/1.png?u=https://evil.com', '/crest/https%3A%2F%2Fevil.com.png']) {
  const r = await W(bad);
  t(`crest proxy rejects ${bad}`, r.status === 404 || (r.status === 200 && asked.every((u) => u.startsWith(CDN))));
}
t('crest proxy never fetched anything but the CDN', asked.every((u) => u.startsWith(CDN)));
globalThis.fetch = realFetch;

const SITE = ROOT + 'site/';
const read = (f) => fs.readFileSync(SITE + f, 'utf8');
const index = read('index.html');
t('poster carries both crests (home + opponent/proxy/badge)', /data-crest="assets\/crest\.png" data-acrest="(https?:\/\/[^"]+\/crest\/\d+\.png|data:image\/svg\+xml[^"]*)"/.test(index));
const match = fs.readdirSync(SITE + 'matches').find((f) => /^\d+\.html$/.test(f));
const mh = read('matches/' + match);
t('match page: og:description with result + og:image crest', /<meta property="og:description" content="(Win|Defeat|Draw) · /.test(mh) && /<meta property="og:image" content="https:\/\//.test(mh));
const ph = read('players/' + fs.readdirSync(SITE + 'players').find((f) => f !== 'index.html'));
t('player page: og:description with position/stats', /<meta property="og:description" content="[^"]*(OVR|games|Player)/.test(ph) && ph.includes('twitter:card'));
t('no share image is a data: URI', fs.readdirSync(SITE + 'matches').concat().every((f) => !/og:image" content="data:/.test(read('matches/' + f))));
done();
