// Bot design system: the layout kit (bot/ui.js), the card templates (scripts/cards.mjs) and the drawn cards turning up in
// replies. The site's api/cards.json is stubbed here, so this runs the same with or without a real card render.
import { env, SITE, siteJson } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { message, notice, header, buttons, cards, cardUrl, plainText, images, isV2, IS_V2, EPHEMERAL, ACCENT, resultAccent } from '../bot/ui.js';
import { scoreCard, fieldCard, fieldSlots, playerCard, tableCard, clubCard, resultsCard, ratingGraph, cardJobs, topRows, esc } from '../scripts/cards.mjs';
import { shapeReply } from '../bot/botcommands.js';
import { findChrome, launchChrome } from '../scripts/lib/chrome.mjs';

const club = siteJson('club'), players = siteJson('players');
const m = club.matches.find((x) => x.ps?.length >= 5) ?? club.matches[0];
const p = players.find((x) => x.home && x.s?.gp && (x.tr ?? []).length >= 2);

// ---------- kit ----------
const msg = message({ accent: 'win', blocks: [header({ title: 'T', sub: 'S', thumb: 'https://x/c.png' }), cards('https://x/a.png', null), buttons([{ label: 'Site', url: 'https://x' }, { label: 'Act', id: 'a' }])] });
t('message = V2 flag + one panel with the stripe colour', isV2(msg) && msg.components.length === 1 && msg.components[0].type === 17 && msg.components[0].accent_color === ACCENT.win);
t('header: small label, ## title, grey detail, picture on the right', msg.components[0].components[0].type === 9 && msg.components[0].components[0].components[0].content === '-# NOREX UNITED\n## T\n-# S' && images(msg).includes('https://x/c.png'));
t('cards() drops missing pictures; nothing to show → null', images(msg).includes('https://x/a.png') && cards(null, undefined) === null);
const row = msg.components[0].components.at(-1);
t('buttons: actions first, the site link always last', row.type === 1 && row.components[0].custom_id === 'a' && row.components[1].style === 5);
t('buttons wrap 5 to a row', buttons(Array.from({ length: 7 }, (_, k) => ({ label: `b${k}`, id: `b${k}` }))).map((r) => r.components.length).join() === '5,2');
const n = notice('Only managers can use /purge', 'Ask a manager.');
t('notice: private, steel, bold line + how to fix', n.flags === (IS_V2 | EPHEMERAL) && n.components[0].accent_color === ACCENT.steel && plainText(n) === '**Only managers can use /purge**\nAsk a manager.');
t('ping line sits above the panel, mentions locked down by default', message({ ping: '<@1>', blocks: [] }).components[0].content === '<@1>' && message({ blocks: [] }).allowed_mentions.parse.length === 0);
t('result colours: W green, D gold, L red', resultAccent('W') === 'win' && resultAccent('D') === 'gold' && resultAccent('L') === 'loss');
t('cardUrl reads the manifest, missing → null', cardUrl({ base: 'https://s/cards/', club: 'c.png' }, 'club') === 'https://s/cards/c.png' && cardUrl({ base: 'b/' }, 'match', '1', 'score') === null && cardUrl(null, 'club') === null);

// ---------- templates ----------
t('score card: both names, the score and the result', ((h) => h.includes(`${m.gf}–${m.ga}`) && h.includes(esc(m.opp)) && h.includes(`pill ${m.res}`))(scoreCard(m, club)));
t('score card: unreadable crest falls back to a drawn shield', /onerror=/.test(scoreCard({ ...m, oppCrest: 'https://nope/x.png' }, club)) && /<svg/.test(scoreCard({ ...m, oppCrest: null }, club)));
const slots = fieldSlots(m.ps);
t('field view: every player placed once, inside the pitch', slots.length === m.ps.length && slots.every((s) => s.x > 0 && s.x < 105 && s.y > 0 && s.y < 68));
t('field view: keeper behind defenders behind midfield behind forwards', ((x) => !x.goalkeeper || !x.defender || x.goalkeeper < x.defender)(Object.fromEntries(slots.map((s) => [s.p.pos, s.x]))));
const f = fieldCard({ ...m, ps: [{ n: 'Star', r: 9.8, mom: 1, pos: 'forward' }, { n: 'Ok', r: 7.1, pos: 'midfielder' }, { n: 'Meh', r: 6.4, pos: 'defender' }, { n: 'Bad', r: 5.2, pos: 'defender' }] });
t('field view: MOTM gold, 7+ green, 6–6.9 orange, under 6 red', f.includes('url(#gd)') && f.includes('#4be08a') && f.includes('#ff9f43') && f.includes('#ff7d72'));
t('field view: names are escaped', fieldCard({ ...m, ps: [{ n: '<b>x</b>', r: 7, pos: 'forward' }] }).includes('&lt;b&gt;x&lt;/b&gt;'));
t('player card: tiles + rating graph', ((h) => h.includes(esc(p.n)) && h.includes('Match rating') && h.includes('<polyline'))(playerCard(p)));
t('rating graph needs 2+ matches', ratingGraph([7]) === '' && ratingGraph([6, 8]).includes('<polyline'));
t('leaderboard: top 10, sorted, home club players only', ((rows) => rows.length <= 10 && rows.every(([x], k) => x.home && (k === 0 || rows[k - 1][1] >= rows[k][1])))(topRows(players, 'goals')));
t('leaderboard card lists the leader', ((rows) => !rows.length || tableCard(players, 'goals', club).includes(esc(rows[0][0].n)))(topRows(players, 'goals')));
t('club card + results card render', clubCard(club).includes(esc(club.name)) && resultsCard(club).includes(`${club.matches[0].gf}–${club.matches[0].ga}`));
const jobs = cardJobs(club, players);
t('card jobs: score + field per recent match, a card per player, 6 leaderboards, club, results', jobs.some((j) => j.key.join() === `match,${m.id},score`) && jobs.filter((j) => j.key[0] === 'top').length === 6 && jobs.some((j) => j.key[0] === 'club') && jobs.some((j) => j.key[0] === 'results'));
const again = cardJobs(club, players), bumped = cardJobs({ ...club, w: club.w + 1 }, players);
t('file names change only when what is drawn changes', jobs.map((j) => j.file).join() === again.map((j) => j.file).join()
  && jobs.find((j) => j.key[0] === 'club').file !== bumped.find((j) => j.key[0] === 'club').file && jobs.find((j) => j.key[0] === 'results').file === bumped.find((j) => j.key[0] === 'results').file);

// ---------- a real render, wherever Chrome is installed (GitHub's runners have it) ----------
if (findChrome()) {
  await tt('renderer: the score card comes out as a 1200 × 500 PNG', async () => {
    const chrome = await launchChrome();
    try {
      const png = await chrome.shot(scoreCard({ ...m, oppCrest: null }, { ...club, crest: null }), 1200);
      return png.subarray(1, 4).toString() === 'PNG' && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 500;
    } finally { await chrome.close(); }
  });
} else console.log('– renderer check skipped (no Chrome here)');

// ---------- drawn cards in replies (cards.json stubbed) ----------
const base = `${SITE}cards/`;
const manifest = { v: 2, base, club: 'club-x.png', results: 'results-x.png', top: { goals: 'top-goals-x.png' }, match: { [club.matches[0].id]: { score: 'score-x.png', field: 'field-x.png' } }, player: { [p.k]: 'player-x.png' } };
let deck = manifest;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => (String(url).endsWith('api/cards.json') ? (deck ? Response.json(deck) : new Response('nope', { status: 404 })) : realFetch(url, init));

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
async function slash(name, options = []) {
  const body = JSON.stringify({ type: 2, data: { name, options }, member: { user: { id: '701', username: 'u' }, roles: [] }, channel_id: 'c', token: 't' }), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  return (await (await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} })).json()).data;
}
const last = await slash('last');
t('/last: score card on top, field view at the bottom', images(last)[0] === `${base}score-x.png` && images(last).at(-1) === `${base}field-x.png` && /FIELD VIEW/.test(plainText(last)));
t('/last: stripe follows the result', last.components[0].accent_color === ACCENT[resultAccent(club.matches[0].res)]);
t('/player: the drawn player card', images(await slash('player', [{ name: 'gamertag', value: p.n }])).includes(`${base}player-x.png`));
const top = await slash('top', [{ name: 'stat', value: 'goals' }]);
t('/top: the drawn table replaces the text list', images(top).includes(`${base}top-goals-x.png`) && !/🥇/.test(plainText(top)));
t('/club + /results show their cards', images(await slash('club')).includes(`${base}club-x.png`) && images(await slash('results')).includes(`${base}results-x.png`));

deck = null; // no cards drawn yet (or the card step failed) → the same layout, with the numbers as text
const bare = await slash('top', [{ name: 'stat', value: 'assists' }]);
t('no card for it → text fallback in the same panel', isV2(bare) && /🥇/.test(plainText(bare)) && !images(bare).some((u) => u.includes('/cards/')));

// ---------- the Boardroom "post to channel" setting keeps the V2 flag ----------
const posted = [];
globalThis.fetch = async (url, init) => { posted.push(JSON.parse(init.body)); return Response.json({ id: '1' }); };
const shaped = await shapeReply({ DISCORD_BOT_TOKEN: 'x' }, 'club', Response.json({ type: 4, data: message({ blocks: [header({ title: 'X' })] }) }), { club: { postTo: '123456' } });
t('post-to-channel copy keeps the V2 flag, drops nothing else', posted[0]?.flags === IS_V2 && posted[0].components[0].type === 17 && /Posted in/.test(plainText((await shaped.json()).data)));
globalThis.fetch = realFetch;
done();
