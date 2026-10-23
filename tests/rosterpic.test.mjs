// The drawn roster for the match-night and check-in posts: model, SVG, drawing + caching, and the post fallback.
import { env, R2 } from './mock.mjs';
import { rosterModel, rosterSvg, drawRoster, rosterBlock, rosterOn } from '../bot/rosterpic.js';
import { eventMessage, checkinMessage, eventPost, checkinPost } from '../bot/events.js';
import { plainText } from '../bot/ui.js';
import { t, done } from './lib.mjs';

const PNG = Uint8Array.from({ length: 4000 }, (_, i) => (i < 8 ? [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][i] : i % 251));
let draws = 0, svgSeen = null, imagesFail = false;
env.IMAGES = { input: (stream) => ({ output: async () => {
  if (imagesFail) throw new Error('boom');
  draws++; svgSeen = await new Response(stream).text();
  return { response: () => new Response(PNG) };
} }) };
env.PUBLIC_URL = 'https://bot.test';
const setFlag = (v) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), rosterPicture: v }); };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => (String(url).startsWith('https://cdn.discordapp.com/') ? new Response(PNG, { headers: { 'Content-Type': 'image/png' } }) : realFetch(url, init));

const rs = [
  { user_id: '1', name: 'Slug17-_-', status: 'yes', positions: '["CM"]' },
  { user_id: '2', name: 'derbrecki 🔥', status: 'maybe', positions: '["CB"]' },
  { user_id: '3', name: '<b>Evil</b> & "co"', status: 'yes', positions: '[]' },
  { user_id: '4', name: 'Semiols', status: 'no', positions: '[]' },
];
const posOf = (r) => JSON.parse(r.positions)[0] ?? '';

// ----- model -----
const m = rosterModel(rs, [{ user_id: '1', name: 'x' }, { user_id: '9', name: 'Walk In' }], { posOf });
t('rsvp model groups by answer, numbered in answer order', m.groups.map((g) => g[2].map((p) => p.n).join()).join('|') === '1,3|2|4');
t('… marks who has checked in', m.groups[0][2][0].on && !m.groups[0][2][1].on);
const c = rosterModel(rs, [{ user_id: '1', name: 'x' }, { user_id: '9', name: 'Walk In' }], { mode: 'checkin', posOf });
t('check-in model: checked in first (walk-ins included), then who is missing', c.groups[0][2].map((p) => p.name).join() === 'Slug17-_-,Walk In' && c.groups[1][2].map((p) => p.name).join() === 'derbrecki,bEvilb co');
t('names lose emoji, and check-in leaves out people who said no', !JSON.stringify(m).includes('🔥') && ![...c.groups[0][2], ...c.groups[1][2]].some((p) => p.name === 'Semiols'));

// ----- svg -----
const svg = rosterSvg(m, new Map([['1', 'data:image/png;base64,AAAA']]), { title: 'Who is playing', sub: 'League' });
t('svg: valid shell with the size in the header', svg.startsWith('<svg xmlns') && svg.endsWith('</svg>') && /width="1000" height="\d+"/.test(svg));
t('svg: markup in a name cannot reach the picture', !svg.includes('<b>') && !svg.includes('Evil</b>'));
t('svg: a face is inlined round; a missing face shows initials', svg.includes('clip-path="url(#f0)"') && svg.includes('data:image/png;base64,AAAA') && svg.includes('>BE<') && !svg.includes('>SL<'));
t('svg: counts per group', /<tspan[^>]*>2<\/tspan> <tspan[^>]*>in<\/tspan>/.test(svg));
const many = Array.from({ length: 12 }, (_, i) => ({ user_id: String(i + 10), name: `P${i}`, status: 'yes', positions: '[]' }));
t('svg: a long group goes to two columns and stays shorter than one column', Number(rosterSvg(rosterModel(many, []), new Map()).match(/height="(\d+)"/)[1]) < 12 * 54 + 200);

// ----- drawing + cache -----
const r1 = await drawRoster(env, 7, m, { title: 'T' });
t('draw: png stored in R2 and served from /media', r1.url?.startsWith('https://bot.test/media/r/7-rsvp-') && r1.url.endsWith('.png') && !r1.cached && draws === 1);
t('draw: faces were inlined for the renderer', /data:image\/png;base64,/.test(svgSeen));
const r2 = await drawRoster(env, 7, m, { title: 'T' });
t('draw: the same roster is not drawn twice', r2.cached && r2.url === r1.url && draws === 1);
const r3 = await drawRoster(env, 7, rosterModel(rs.slice(1), [], { posOf }), { title: 'T' });
t('draw: a changed roster is drawn again under a new key', r3.url && r3.url !== r1.url && draws === 2);
imagesFail = true;
const bad = await drawRoster(env, 8, m, {});
t('draw: a failing renderer returns an error and never throws', !bad.url && /boom/.test(bad.error));
imagesFail = false;

// ----- the posts -----
const e = { id: 7, type: 'league', start: Date.now() + 36e5, duration: 120, status: 'scheduled', formation: null, notes: '' };
const media = (msg) => JSON.stringify(msg).includes('/media/r/7-');
setFlag('off');
t('flag off: the post is exactly as before (face rows, no picture)', rosterOn(env) === false && !media(await eventPost(env, e, rs)) && /Slug17/.test(plainText(await eventPost(env, e, rs))));
setFlag('owner');
const withPic = await eventPost(env, e, rs);
t('flag on: the post carries the picture and drops the name rows', rosterOn(env) && media(withPic) && !/Slug17/.test(plainText(withPic)) && /Answers/.test(plainText(withPic)));
t('… the picture has a text description for screen readers', /In: 1 Slug17/.test(JSON.stringify(withPic)));
const ck = await checkinPost(env, e, rs, [{ user_id: '1', name: 'Slug17-_-' }]);
t('check-in post: picture instead of the two lists, buttons and kick-off notes stay', media(ck) && !/NOT CHECKED IN/.test(plainText(ck)) && /Be lined up 10 minutes/.test(plainText(ck)) && JSON.stringify(ck).includes('norex:ci:7'));
imagesFail = true;
const fb = await eventPost(env, e, rs);
t('draw fails: the post falls back to the text rows, nothing breaks', !media(fb) && /Slug17/.test(plainText(fb)));
const fb2 = await checkinPost(env, e, rs, []);
t('… and so does the check-in post', /NOT CHECKED IN/.test(plainText(fb2)));
imagesFail = false;
t('no answers yet: no picture', (await rosterBlock(env, 7, [], [])) === null);
t('the plain builders still work without the picture', !!eventMessage(env, e, rs) && !!checkinMessage(env, e, rs, []));
globalThis.fetch = realFetch;
done();
