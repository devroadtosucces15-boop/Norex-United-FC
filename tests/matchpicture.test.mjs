// Merged match picture (message 1): the model, the drawn picture, the faces route + fetch, and the post that swaps two pictures for one.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildMatchPicture, fetchPlayerFaces } from '../scripts/lib/matchpicture.mjs';
import { matchPicture, cardJobs } from '../scripts/cards.mjs';
import { postResults } from '../scripts/lib/resultpost.mjs';
import { plainText, images } from '../bot/ui.js';
import { call, env, login, W, sqlite } from './mock.mjs';
import { settingsKey } from '../bot/settings.js';
import { t, done } from './lib.mjs';

const P = (name, pos, o = {}) => ({ playername: name, pos, rating: '7.0', secondsPlayed: '5500', goals: '0', assists: '0', shots: '1', passesmade: '10', passattempts: '12', tacklesmade: '2', tackleattempts: '4', mom: '0', ...o });
const match = () => ({
  matchId: '900', timestamp: 1791600000, matchType: 'leagueMatch',
  clubs: { 100: { goals: '3', goalsAgainst: '1', name: 'NOREX UNITED', details: { name: 'NOREX UNITED' } }, 200: { goals: '1', goalsAgainst: '3', name: 'Poundin P.', details: { name: 'Poundin P.' } } },
  players: { 100: { 11: P('Keeper', 'goalkeeper', { rating: '6.9' }), 12: P('Striker', 'forward', { goals: '2', assists: '1', rating: '9.1', mom: '1' }), 13: P('Mid', 'midfielder', { goals: '1', rating: '7.4' }), 14: P('Hidden', 'defender', { goals: '0', assists: '1' }) },
    200: { 21: P('OppA', 'forward', { rating: '6.0', shots: '3' }) } },
});
const mp = buildMatchPicture(match(), '100', { hide: new Set(['hidden']) });
t('the model has the score, the stats pairs and the lines', mp.gf === 3 && mp.ga === 1 && mp.res === 'W' && mp.rows.map((r) => r.k).join() === 'Shots,Passes completed,Pass accuracy,Tackles won,Tackle success,Average rating' && mp.lines.map((l) => l.t).join() === 'GK,DEF,MID,FWD');
t('goals and assists per player, most first; the man of the match is ours', mp.contrib[0].n === 'Striker' && mp.contrib[0].g === 2 && mp.contrib[0].a === 1 && mp.motm.n === 'Striker' && mp.motm.r === 9.1);
t('a hidden player is in no list, but the totals still count them', !JSON.stringify(mp.players).includes('Hidden') && !JSON.stringify(mp.contrib).includes('Hidden') && mp.rows[0].a === 4);
t('no club data → no model', buildMatchPicture({ clubs: {}, players: {} }, '100') === null);

const html = matchPicture(mp, { name: 'NOREX UNITED FC' }, new Map([['12', 'data:image/png;base64,AAAA']]));
t('the picture has the scoreboard, goals, man of the match, stats, lines and field view', ['3–1', 'Man of', 'Shots', 'Tackle success', 'Rating by line', 'Field view'].every((x) => html.includes(x)));
t('a face is used when there is one, and a drawn avatar when there is not', html.includes('data:image/png;base64,AAAA') && /Ke<\/span>/.test(html) && /Mi<\/span>/.test(html));
t('names are escaped', !matchPicture({ ...mp, opp: '<i>x</i>' }, {}, new Map()).includes('<i>x</i>'));
t('the build draws it for the newest three matches, when a model exists', (() => {
  const club = { name: 'N', matches: [1, 2, 3, 4].map((i) => ({ id: String(i), ts: 1, gf: 1, ga: 0, res: 'W', opp: 'X', ps: [] })) };
  return cardJobs(club, [], { picture: (id) => (id === '2' ? null : { model: mp, faces: new Map() }) }).filter((j) => j.key[2] === 'picture').map((j) => j.key[1]).join() === '1,3';
})());

// ----- faces route: keyed, only claimed players -----
const secretKey = await settingsKey(env.DISCORD_CLIENT_SECRET);
sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at, name) VALUES ('500', '12', 'Striker', 'approved', ?, 'Player One')").run(Date.now());
await login('500', [], 'Player One');
sqlite.prepare("UPDATE users SET avatar = 'https://cdn.example/a.png' WHERE id = '500'").run();
t('faces route refuses a call without the key', (await W('/api/bot/faces?players=12')).status === 403);
const faces = await W('/api/bot/faces?players=12,13,../x', { headers: { 'X-Norex-Key': secretKey } }).then((r) => r.json());
t('… and answers with the face of each claimed player only', faces['12'] === 'https://cdn.example/a.png' && !('13' in faces));

// ----- fetching faces in the Action -----
const realFetch = globalThis.fetch;
const asked = [];
globalThis.fetch = async (url, init = {}) => {
  asked.push(String(url));
  if (String(url).includes('api.test/api/bot/faces')) return new Response(JSON.stringify({ 12: 'https://img.test/12.png', 13: 'https://img.test/gone.png' }), { status: 200 });
  if (String(url) === 'https://img.test/12.png') return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/png' } });
  return new Response('', { status: 404 });
};
process.env.DISCORD_CLIENT_SECRET = 'secret';
const got = await fetchPlayerFaces({ members: { api: 'https://api.test' } }, ['12', '13']);
t('faces are fetched once and inlined, a face that cannot be fetched is just missing', got.get('12') === 'data:image/png;base64,AQID' && !got.has('13'));
t('the call is keyed the same way as the bot settings', asked[0].includes('players=12%2C13'));
t('with no Worker address or secret there are no faces, and no error', (await fetchPlayerFaces({}, ['12'])).size === 0);

// ----- the post -----
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-pic-'));
for (const f of ['score-900.png', 'field-900.png', 'picture-900.png']) fs.writeFileSync(path.join(out, f), 'x');
const manifest = { match: { 900: { score: 'score-900.png', field: 'field-900.png', picture: 'picture-900.png' } } };
const calls = [];
globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), init }); if (String(url).includes('/webhooks/')) return new Response(JSON.stringify({ channel_id: 'chan-1' }), { status: 200 }); return new Response('{}', { status: 200 }); };
process.env.DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1/abc';
process.env.DISCORD_BOT_TOKEN = 'tok';
const run = async (features, man = manifest) => { calls.length = 0; await postResults([match()], { config: { siteUrl: 'https://x.test/', features: { discordMatch: 'members', ...features }, hiddenPlayers: [] }, homeId: '100', drawn: { dir: out, manifest: man } }); return calls.filter((c) => c.url.endsWith('/channels/chan-1/messages')); };
const old = (await run({}))[0];
t('flag off (the default): the score card and field view, as before', JSON.stringify(JSON.parse(old.init.body.get('payload_json'))).includes('score-900.png') && old.init.body.get('files[1]') && !old.init.body.get('files[2]'));
const merged = (await run({ matchPicture: 'members' }))[0];
const payload = JSON.parse(merged.init.body.get('payload_json'));
t('flag on: one picture instead of two, and only that file is attached', images(payload).filter((u) => u.startsWith('attachment://')).join() === 'attachment://picture-900.png' && merged.init.body.get('files[0]') && !merged.init.body.get('files[1]'));
t('… the title has no score, the "Show my match" menu is still there', /vs Poundin P\./.test(plainText(payload)) && !/3–1/.test(plainText(payload).split('\n')[1] ?? '') && JSON.stringify(payload).includes('norex:mm:900'));
const fallback = (await run({ matchPicture: 'members' }, { match: { 900: { score: 'score-900.png', field: 'field-900.png' } } }))[0];
t('flag on but the picture was not drawn: falls back to the two pictures', images(JSON.parse(fallback.init.body.get('payload_json'))).filter((u) => u.startsWith('attachment://')).join() === 'attachment://score-900.png,attachment://field-900.png');
globalThis.fetch = realFetch;
done();
