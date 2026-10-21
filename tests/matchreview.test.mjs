// Match review (message 2): the rule-based review model, its picture job, and the post that follows the result.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildReview, isFullMatch, loadHistory } from '../scripts/lib/matchreview.mjs';
import { reviewCard, cardJobs } from '../scripts/cards.mjs';
import { postResults } from '../scripts/lib/resultpost.mjs';
import { plainText, images } from '../bot/ui.js';
import { t, done } from './lib.mjs';

const P = (name, pos, o = {}) => ({ playername: name, pos, rating: '7.0', secondsPlayed: '5500', goals: '0', assists: '0', shots: '0', passesmade: '10', passattempts: '12', tacklesmade: '1', tackleattempts: '2', saves: '0', goalsconceded: '0', mom: '0', ...o });
const match = (over = {}) => ({
  matchId: '900', timestamp: 1791600000, matchType: 'leagueMatch',
  clubs: { 100: { goals: '3', goalsAgainst: '0', name: 'NOREX UNITED' }, 200: { goals: '0', goalsAgainst: '3', name: 'Poundin P.' } },
  players: {
    100: { a: P('Keeper', 'goalkeeper', { rating: '6.9', saves: '2', passesmade: '5', passattempts: '5' }), b: P('DefOne', 'defender', { tacklesmade: '3', tackleattempts: '4' }), c: P('DefTwo', 'defender'),
      d: P('MidOne', 'midfielder', { rating: '8.2', passesmade: '12', passattempts: '15' }), e: P('MidTwo', 'midfielder', { goals: '1', shots: '2' }), f: P('MidThree', 'midfielder', { goals: '1', shots: '2' }),
      g: P('FwdOne', 'forward', { goals: '1', shots: '4', passesmade: '6', passattempts: '14' }), h: P('FwdTwo', 'forward', { shots: '0', passesmade: '4', passattempts: '12' }) },
    200: { x: P('OppOne', 'forward', { shots: '2', passesmade: '5', passattempts: '9', tacklesmade: '1', tackleattempts: '5' }), y: P('OppTwo', 'midfielder', { rating: '6.0' }) },
  },
  ...over,
});
const win = buildReview(match(), '100');
t('a full match gets a review', !!win && win.res === 'W' && win.title === 'Comfortable win' && /Clean sheet/.test(win.sub));
t('went well: the door was shut, the keeper had safe hands, the chances counted – with numbers', win.good.some((g) => /shut the door/.test(g.lead) && /won 5 tackles to 6|won \d+ tackles to \d+/.test(g.text)) && win.good.some((g) => /Safe hands/.test(g.lead) && /saved 2 of 2/.test(g.text)) && win.good.some((g) => /Chances made to count/.test(g.lead) && /3 goals from 8 shots/.test(g.text)));
t('to work on: forwards’ passing, named as a line – never a person', win.work.some((w) => /^Forwards:/.test(w.lead) && /38% passing \(10 of 26\)/.test(w.text)) && !win.work.some((w) => /FwdOne|FwdTwo|MidOne|DefOne/.test(w.lead + w.text)));
t('praise may name players', win.good.some((g) => /MidOne|FwdOne|MidTwo|MidThree|DefOne/.test(g.text)));
t('next-match targets and recommendations come from the work items, recommendations name nobody', win.next.length >= 1 && win.next[0].b > win.next[0].a && win.recs.length >= 1 && !JSON.stringify(win.recs).match(/FwdOne|MidOne|DefOne/));
t('the shape is counted from where the players lined up, with the AI slots left over', win.shape.label === '1-2-3-2' && win.shape.humans === 8 && win.shape.ai === 3);
t('the model keeps no player names in the shape', !JSON.stringify(win.shape.players).includes('Keeper'));
const hidden = buildReview(match(), '100', { hide: new Set(['midone']) });
t('a hidden player is never named', !JSON.stringify(hidden).includes('MidOne'));
const abandoned = match(); abandoned.clubs[200].winnerByDnf = '1';
t('an abandoned match gets no review', buildReview(abandoned, '100') === null && !isFullMatch(abandoned, '100'));
const short = match(); for (const p of Object.values(short.players[100])) p.secondsPlayed = '1200';
t('a short match gets no review', buildReview(short, '100') === null);
const heavy = match(); heavy.clubs[100].goals = '0'; heavy.clubs[100].goalsAgainst = '3'; heavy.clubs[200].goals = '3'; heavy.clubs[200].goalsAgainst = '0';
for (const p of Object.values(heavy.players[100])) { p.goals = '0'; p.shots = '1'; }
const lost = buildReview(heavy, '100');
t('a heavy defeat is called one, and the work list says what to change', lost.title === 'Heavy defeat' && lost.work.some((w) => /Attack: nothing to show/.test(w.lead)));

// history → the keepers' save rate
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-review-'));
const old = match({ matchId: '800', timestamp: 1791000000 }); old.players[100].a = P('Keeper', 'goalkeeper', { saves: '1', goalsconceded: '3' });
fs.writeFileSync(path.join(dir, '800.json'), JSON.stringify(old));
fs.writeFileSync(path.join(dir, '900.json'), JSON.stringify(match()));
t('history only holds earlier full matches of the club', loadHistory(dir, '100', 1791600000).map((m) => m.matchId).join() === '800');
t('the keepers’ usual save rate comes from that history', /against the club keepers’ 25%/.test(buildReview(match(), '100', { history: loadHistory(dir, '100', 1791600000) }).good.find((g) => /Safe hands/.test(g.lead)).text));

// the picture
const html = reviewCard(win, { name: 'NOREX UNITED' });
t('the picture holds every section and no gold', ['How we lined up', 'What went well', 'What to work on', 'Next match', 'Recommendations for the squad'].every((h) => html.includes(h)) && !/--gold|g2\)|efcf7a/.test(html.split('</style>')[1]));
t('picture text is escaped', !reviewCard({ ...win, opp: '<b>x</b>' }, {}).includes('<b>x</b>'));
t('the build draws a review for the newest three matches only, and only when a model exists', (() => {
  const club = { name: 'N', matches: [1, 2, 3, 4, 5].map((i) => ({ id: String(i), ts: 1, gf: 1, ga: 0, res: 'W', opp: 'X', ps: [] })) };
  return cardJobs(club, [], { review: (id) => (id === '2' ? null : win) }).filter((j) => j.key[2] === 'review').map((j) => j.key[1]).join() === '1,3' && cardJobs(club, []).every((j) => j.key[2] !== 'review');
})());

// the post
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-post-'));
for (const f of ['score-900.png', 'field-900.png', 'review-900.png']) fs.writeFileSync(path.join(out, f), 'x');
const manifest = { match: { 900: { score: 'score-900.png', field: 'field-900.png', review: 'review-900.png' } } };
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).includes('/webhooks/')) return new Response(JSON.stringify({ channel_id: 'chan-1' }), { status: 200 });
  return new Response('{}', { status: 200 });
};
process.env.DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1/abc';
process.env.DISCORD_BOT_TOKEN = 'tok';
const posts = () => calls.filter((c) => c.url.endsWith('/channels/chan-1/messages'));
const run = async (features) => { calls.length = 0; await postResults([match()], { config: { siteUrl: 'https://x.test/', features: { discordMatch: 'members', ...features }, hiddenPlayers: [] }, homeId: '100', drawn: { dir: out, manifest } }); return posts(); };
t('flag off (the default): only the result is posted', (await run({})).length === 1);
const two = await run({ matchReview: 'members' });
t('flag on: the review is a second post right after the result', two.length === 2);
const review = JSON.parse(two[1].init.body.get('payload_json'));
t('… carrying the review picture as an attachment, with a title and no ping', images(review).filter((u) => u.startsWith('attachment://')).join() === 'attachment://review-900.png' && two[1].init.body.get('files[0]') && /vs Poundin P\./.test(plainText(review)) && !/@everyone|<@&/.test(JSON.stringify(review)));
const noPic = await (async () => { calls.length = 0; await postResults([match()], { config: { siteUrl: 'https://x.test/', features: { discordMatch: 'members', matchReview: 'members' }, hiddenPlayers: [] }, homeId: '100', drawn: { dir: out, manifest: { match: { 900: { score: 'score-900.png', field: 'field-900.png' } } } } }); return posts(); })();
t('no review picture drawn (abandoned match, or the draw failed): no second post, the result still goes out', noPic.length === 1);
done();
