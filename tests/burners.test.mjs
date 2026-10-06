// Burner-club tracker: the pure stats helpers (bot/burnerstats.js), the keyed endpoint fetch.mjs reads, and the
// /burner command + pick menus (EA is stubbed – nothing here reaches the network).
import { env, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { burnerStats, mergeMatches, reportEmbed, slimBurnerMatch, updateRoster, MAX_BURNERS } from '../bot/burnerstats.js';
import { burnersKey } from '../bot/burners.js';

// ---------- pure helpers ----------
const player = (name, o = {}) => ({ playername: name, pos: 'midfielder', rating: '7.0', goals: '0', assists: '0', shots: '1', passattempts: '10', passesmade: '8', tackleattempts: '4', tacklesmade: '2', mom: '0', secondsPlayed: '5400', ...o });
const ea = (id, goals, oppGoals, ps, extra = {}) => ({
  matchId: id, timestamp: String(extra.ts ?? 1000),
  clubs: { 1355341: { goals: String(goals), wins: goals > oppGoals ? '1' : '0', losses: goals < oppGoals ? '1' : '0', details: { name: 'TeloSico', customKit: { crestAssetId: '99' } } },
    218552: { goals: String(oppGoals), details: { name: 'Poundin Pitches', customKit: { crestAssetId: '7' } } } },
  players: { 1355341: ps, 218552: { 5: player('Other') } },
});
const m1 = slimBurnerMatch(ea('a1', 3, 1, { 10: player('Mike', { goals: '2', assists: '1', rating: '9.8', mom: '1' }), 11: player('Jez', { goals: '1', rating: '8.7' }) }, { ts: 2000 }), '1355341', 'leagueMatch');
const m2 = slimBurnerMatch(ea('a2', 1, 3, { 10: player('Mike', { rating: '6.0' }), 11: player('Jez', { rating: '7.0' }) }, { ts: 1000 }), '1355341', 'friendlyMatch');

t('slim keeps the result, score, opponent and only the burner players', m1.res === 'W' && m1.gf === 3 && m1.ga === 1 && m1.opp.name === 'Poundin Pitches' && m1.players.length === 2);
t('slim drops matches the club was not in', slimBurnerMatch(ea('x', 1, 0, {}), '999', 'leagueMatch') === null);
t('merge dedupes by match id, newest first, and caps', mergeMatches([m2], [m1, m2]).map((m) => m.id).join() === 'a1,a2' && mergeMatches([m1], [m2], 1).length === 1);

const s = burnerStats([m2, m1]);
t('record + goals + win % + form', s.gp === 2 && s.w === 1 && s.l === 1 && s.gf === 4 && s.ga === 4 && s.winPct === 50 && s.form.join('') === 'WL');
t('per-mode split keeps friendlies apart', s.byType.leagueMatch.gp === 1 && s.byType.friendlyMatch.l === 1);
t('squad table: apps, goals, MOTM, average rating, pass %', (() => { const p = s.players.find((x) => x.n === 'Mike'); return p.gp === 2 && p.g === 2 && p.motm === 1 && Math.abs(p.rating - 7.9) < 0.01 && p.passPct === 80; })());

const r1 = updateRoster({}, [{ name: 'Mike', gamesPlayed: '2' }], '2026-10-06T10:00:00Z');
t('first roster snapshot is not a "join" event', r1.joined.length === 0 && r1.roster.Mike.active);
const r2 = updateRoster(r1.roster, [{ name: 'Jez' }], '2026-10-07T10:00:00Z');
t('roster diff reports who joined and left, keeping first-seen', r2.joined[0] === 'Jez' && r2.left[0] === 'Mike' && r2.roster.Mike.active === false && r2.roster.Mike.first === '2026-10-06T10:00:00Z');

const emb = reportEmbed({ id: '1355341', name: 'TeloSico', crest: '99' }, m1, s, 'https://site.test/');
t('report embed: title, MOTM, season line, link to the burner card', emb.title === '🔥 TeloSico 3–1 Poundin Pitches' && emb.fields.some((f) => f.name.includes('Man of the match') && f.value.includes('Mike'))
  && emb.fields.some((f) => f.value.includes('1W 0D 1L')) && emb.url === 'https://site.test/burners.html#c1355341');

// ---------- keyed endpoint (what fetch.mjs reads) ----------
const W = (path, init) => worker.fetch(new Request('http://localhost:8788' + path, init), env, { waitUntil() {} });
t('tracked list rejects a missing key', (await W('/api/burners/tracked')).status === 403);
const key = await burnersKey(env.DISCORD_CLIENT_SECRET);
const tracked = async () => (await (await W('/api/burners/tracked', { headers: { 'X-Norex-Key': key } })).json()).burners;
t('tracked list starts empty', (await tracked()).length === 0);

// ---------- /burner ----------
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
const pending = [];
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil: (p) => pending.push(p) });
  return res.json();
}
const as = (uid, roles) => ({ member: { user: { id: uid, username: `u${uid}` }, nick: `Nick ${uid}`, roles }, channel_id: 'chan-1', token: 'tok' });
const MGR = as('700', ['mgr']), MEMBER = as('701', []);
const slash = (u, sub, club) => send({ type: 2, data: { name: 'burner', options: [{ type: 1, name: sub, options: club ? [{ name: 'club', value: club }] : [] }] }, ...u });
const pick = (u, id, values) => send({ type: 3, data: { custom_id: id, values }, ...u });

// EA stub + a record of what gets patched back into Discord.
const realFetch = globalThis.fetch;
const patches = [];
const BOARD = [
  { clubId: '1355341', gamesPlayed: '2', wins: '1', losses: '1', ties: '0', goals: '4', goalsAgainst: '4', bestDivision: '6', clubInfo: { name: 'TeloSico', customKit: { crestAssetId: '99' } } },
  { clubId: '1355999', gamesPlayed: '30', wins: '20', losses: '5', ties: '5', goals: '70', goalsAgainst: '30', bestDivision: '2', clubInfo: { name: 'TeloSico Reserves', customKit: { crestAssetId: '98' } } },
];
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.includes('proclubs.ea.com/api/fc/allTimeLeaderboard/search')) {
    const q = new URL(url).searchParams.get('clubName').toLowerCase();
    return Response.json(BOARD.filter((c) => c.clubInfo.name.toLowerCase().includes(q)));
  }
  if (url.includes('proclubs.ea.com/api/fc/clubs/info')) {
    const id = new URL(url).searchParams.get('clubIds');
    const c = BOARD.find((x) => x.clubId === id);
    return Response.json(c ? { [id]: { name: c.clubInfo.name, customKit: c.clubInfo.customKit } } : {});
  }
  if (url.includes('/webhooks/') && init.method === 'PATCH') { patches.push(JSON.parse(init.body)); return new Response('{}'); }
  return realFetch(url, init);
};
const settle = async () => { await Promise.all(pending.splice(0)); return patches.at(-1); };

try {
  t('a plain member is turned away', /Managers only/.test((await slash(MEMBER, 'search', 'telosico')).data.content));
  t('/burner search defers the reply (EA can be slow)', (await slash(MGR, 'search', 'telosico')).type === 5);
  const found = await settle();
  t('search lists every match with its record and a pick menu', found.embeds[0].description.includes('TeloSico') && found.embeds[0].description.includes('TeloSico Reserves')
    && found.components[0].components[0].custom_id === 'norex:bn:pick' && found.components[0].components[0].options.length === 2);
  t('the exact name sorts first', found.embeds[0].description.indexOf('1355341') < found.embeds[0].description.indexOf('1355999'));

  await slash(MGR, 'search', 'zzzz');
  t('no match explains how a brand-new club appears', /no club matching/.test((await settle()).content));

  const picked = await pick(MGR, 'norex:bn:pick', ['1355341']);
  t('picking from the menu tracks the club and confirms in place', picked.type === 7 && /Now tracking/.test(picked.data.content) && picked.data.components.length === 0);
  const row = sqlite.prepare('SELECT * FROM burner_clubs WHERE club_id = ?').get('1355341');
  t('the row remembers who, which channel and the crest', row.active === 1 && row.channel_id === 'chan-1' && row.added_by === '700' && row.crest === '99' && row.name === 'TeloSico');
  t('fetch.mjs now sees it in the tracked list', (await tracked()).map((b) => b.id).join() === '1355341' && (await tracked())[0].channel === 'chan-1');

  const again = await pick(MGR, 'norex:bn:pick', ['1355341']);
  t('picking it twice says already tracking, no duplicate row', /Already tracking/.test(again.data.content) && sqlite.prepare('SELECT COUNT(*) AS n FROM burner_clubs').get().n === 1);
  t('a plain member cannot use the pick menu', /Managers only/.test((await pick(MEMBER, 'norex:bn:pick', ['1355999'])).data.content));

  await slash(MGR, 'track', 'TELOSICO RESERVES');
  t('/burner track by exact name tracks straight away', /Now tracking\*\* \*\*TeloSico Reserves|Now tracking \*\*TeloSico Reserves/.test((await settle()).content));
  await slash(MGR, 'track', 'telos');
  t('/burner track on a partial name (no exact match) falls back to the menu', !!(await settle()).components?.length && (await tracked()).length === 2);

  const list = await slash(MGR, 'list');
  t('/burner list shows both with a pending note (no site data yet)', list.data.embeds[0].description.includes('TeloSico') && /first collection pending/.test(list.data.embeds[0].description));
  const rm = await slash(MGR, 'remove');
  t('/burner remove offers a menu of tracked clubs', rm.data.components[0].components[0].custom_id === 'norex:bn:rm' && rm.data.components[0].components[0].options.length === 2);
  const gone = await pick(MGR, 'norex:bn:rm', ['1355999']);
  t('removing stops tracking but keeps the row for history', /Stopped tracking/.test(gone.data.content) && sqlite.prepare('SELECT active FROM burner_clubs WHERE club_id = ?').get('1355999').active === 0 && (await tracked()).length === 1);

  await tt(`the ${MAX_BURNERS}-club cap is enforced`, async () => {
    for (let n = 0; n < MAX_BURNERS; n++) sqlite.prepare("INSERT OR IGNORE INTO burner_clubs (club_id, name, added_by, added_at, active) VALUES (?, ?, '1', 1, 1)").run(`9${n}`, `Filler ${n}`);
    return /already tracking/i.test((await pick(MGR, 'norex:bn:pick', ['1355999'])).data.content);
  });

  env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), burners: 'off' });
  t('the flag switches the command off for everyone', /Managers only|not switched on/.test((await slash(MGR, 'list')).data.content));
} finally {
  globalThis.fetch = realFetch;
}
done();
