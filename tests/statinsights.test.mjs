// BE9 Insights engine: fact packs, the fingerprint gate, the number checker (must reject invented
// numbers), the routes (tier gating, ask rate limit, feedback), the queue job, and the weekly post.
import { call, W, env, login, siteJson, setAiReply, DB, sqlite, config } from './mock.mjs';
import { t, done } from './lib.mjs';
import {
  factPackFor, registryKeys, numbersOk, extractNumbers, writeInsight, refreshStatInsights,
  handleStatInsightJob, statInsightWeekly, compareKey, statCompareRoute, statH2hRoute,
} from '../bot/statinsights.js';
import { can } from '../bot/roles.js';

const loadSite = async (f) => siteJson(f);
const homePlayer = siteJson('players').find((p) => p.home);

// ---------- fact packs ----------
const club = await factPackFor('club', loadSite);
t('club fact pack is public with the real club numbers', club.tier === 'public' && club.facts.gamesPlayed === siteJson('club').gp);
const match = await factPackFor('match.latest', loadSite);
t('match.latest fact pack matches the newest result', match.tier === 'public' && match.facts.opponent === siteJson('club').matches[0].opp);
const recentMatches = siteJson('club').matches;
const older = recentMatches[1];
if (older) {
  const olderPack = await factPackFor(`match.${older.id}`, loadSite);
  t('match.<id> fact pack is the result with that id, not the newest', olderPack?.tier === 'public' && olderPack.facts.opponent === older.opp && olderPack.facts.goalsFor === older.gf);
}
t('match.<id> for an id not in the recent list → null', (await factPackFor('match.1', loadSite)) === null);
const mkeys = (await registryKeys(loadSite)).filter((k) => /^match\./.test(k));
t('registry covers the three newest result pages (latest + two ids)', mkeys.includes('match.latest') && mkeys.length === Math.min(3, recentMatches.length) && recentMatches.slice(1, 3).every((m) => mkeys.includes(`match.${m.id}`)));
const playerPack = await factPackFor(`player.${homePlayer.k}`, loadSite);
t('player fact pack is member-tier with that player\'s own stats', playerPack.tier === 'member' && playerPack.facts.goals === (homePlayer.s?.g ?? 0));
t('unknown key → null', (await factPackFor('nope', loadSite)) === null);
t('a non-home player key → null (registry only covers the home squad)', (await factPackFor('player.not-a-real-key', loadSite)) === null);
const keys = await registryKeys(loadSite);
t('registry covers club + latest match + every home player + the four leaderboards', keys.includes('club') && keys.includes('match.latest') && siteJson('players').filter((p) => p.home).every((p) => keys.includes(`player.${p.k}`)) && ['goals', 'assists', 'rating', 'motm'].every((s) => keys.includes(`leaders.${s}`)));

// ---------- leaders fact packs ----------
const topScorer = [...siteJson('players')].filter((p) => p.home).sort((a, b) => (b.s?.g ?? 0) - (a.s?.g ?? 0))[0];
const leadersGoals = await factPackFor('leaders.goals', loadSite);
t('leaders.goals is public and top-ranks by goals, highest first', leadersGoals.tier === 'public' && leadersGoals.facts.top[0].name === topScorer.n && leadersGoals.facts.top[0].value === topScorer.s.g);
t('unknown leaders stat → null', (await factPackFor('leaders.nope', loadSite)) === null);

// ---------- last-5 + head-to-head fact packs ----------
const recent = siteJson('club').matches.slice(0, 5);
const last5 = await factPackFor('matches.last5', loadSite);
t('matches.last5 is public and counts the five newest results', last5.tier === 'public' && last5.facts.matches === recent.length
  && last5.facts.wins + last5.facts.draws + last5.facts.losses === recent.length && last5.facts.results === recent.map((m) => m.res).join(''));
t('matches.last5 goals + clean sheets add up from the matches', last5.facts.goalsFor === recent.reduce((n, m) => n + m.gf, 0)
  && last5.facts.goalsAgainst === recent.reduce((n, m) => n + m.ga, 0) && last5.facts.cleanSheets === recent.filter((m) => m.ga === 0).length);
t('matches.last5 top scorers are sorted by goals and capped at 3', last5.facts.topScorers.length <= 3
  && last5.facts.topScorers.every((s, i, a) => !i || a[i - 1].goals >= s.goals));
t('matches.last5 with no matches → null', (await factPackFor('matches.last5', async (f) => (f === 'club' ? { matches: [] } : siteJson(f)))) === null);
const h2hRows = siteJson('h2h');
const rival = h2hRows[0];
const h2hPack = await factPackFor(`h2h.${rival.o}`, loadSite);
t('h2h pack is public with the real record against that opponent', h2hPack.tier === 'public' && h2hPack.facts.opponent === rival.n
  && h2hPack.facts.played === rival.p && h2hPack.facts.wins === rival.w && h2hPack.facts.goalDiff === rival.gf - rival.ga && h2hPack.facts.lastScore === rival.lastScore);
t('h2h with an unknown opponent id → null', (await factPackFor('h2h.0000000', loadSite)) === null);
t('h2h with no h2h data at all → null', (await factPackFor(`h2h.${rival.o}`, async (f) => (f === 'h2h' ? null : siteJson(f)))) === null);
const latestOpp = h2hRows.find((e) => e.n === siteJson('club').matches[0].opp);
t('registry adds matches.last5 and the head-to-head vs the latest opponent (when known)', keys.includes('matches.last5')
  && (latestOpp ? keys.includes(`h2h.${latestOpp.o}`) : !keys.some((k) => k.startsWith('h2h.'))));
t('registry has at most one h2h key (only the latest opponent is pre-written)', keys.filter((k) => k.startsWith('h2h.')).length <= 1);
t('registry survives a missing h2h file', (await registryKeys(async (f) => { if (f === 'h2h') throw new Error('404'); return siteJson(f); })).includes('matches.last5'));
const bumped = await factPackFor('matches.last5', async (f) => (f === 'club' ? { matches: recent.map((m, i) => (i ? m : { ...m, gf: m.gf + 1 })) } : siteJson(f)));
t('matches.last5 facts change when the newest score changes (so the fingerprint gate re-writes it)', JSON.stringify(bumped.facts) !== JSON.stringify(last5.facts));

// ---------- number checker ----------
const allowed = new Set([5, 12, 50]);
t('extractNumbers pulls every number out of a string', extractNumbers('5 goals in 12 games, 50%').join() === '5,12,50');
t('numbersOk: only allowed numbers → true', numbersOk('They won 5 of 12, a 50% record.', allowed));
t('numbersOk: a made-up number → false', !numbersOk('A remarkable 17-game run.', allowed));
t('numbersOk: no numbers at all → true (nothing to check)', numbersOk('Steady as ever.', allowed));

// ---------- writer: fingerprint gate + number checker + retry ----------
env.FEATURES = JSON.stringify({ statInsights: 'public' }); // decouple tier tests from the flag's own owner gate

setAiReply(() => JSON.stringify({ headline: 'Solid week', body: 'A clean, honest read of the numbers.', watch: 'Keep it up.' }));
t('writeInsight writes a row when the writer stays inside the facts', await writeInsight(env, 'club', club));
let row = await DB.prepare('SELECT * FROM stat_insights WHERE key = ?').bind('club').first();
t('stored row has the right tier + sources', row.tier === 'public' && JSON.parse(row.sources).gamesPlayed === club.facts.gamesPlayed);

let calls = 0;
setAiReply((req) => {
  calls++;
  const text = req.messages[0].content;
  // First attempt invents a number; the retry (triggered by the rejection) must use only real facts.
  return calls === 1 ? JSON.stringify({ headline: 'An incredible 999 wins', body: 'Unreal form.', watch: 'More of the same.' })
    : JSON.stringify({ headline: 'Steady form', body: 'A fair read of a quiet week.', watch: 'Nothing alarming.' });
});
const matchKeyFacts = await factPackFor('match.latest', loadSite);
t('an invented number is rejected and retried, then written once the retry is clean', await writeInsight(env, 'match.latest', matchKeyFacts) && calls === 2);

calls = 0;
setAiReply(() => { calls++; return JSON.stringify({ headline: 'An incredible 999 wins', body: 'Unreal.', watch: 'Wow.' }); });
t('two invented-number replies in a row → skipped, not written', !(await writeInsight(env, 'club', club)) && calls === 2);

setAiReply(null); // back to the default reply for the rest of the file

calls = 0;
setAiReply(() => { calls++; return JSON.stringify({ headline: 'Dominant over 40 meetings', body: 'Unreal record.', watch: 'Wow.' }); });
t('an invented number in an h2h write is rejected twice and nothing is stored', !(await writeInsight(env, `h2h.${rival.o}`, h2hPack)) && calls === 2
  && !(await DB.prepare('SELECT 1 FROM stat_insights WHERE key = ?').bind(`h2h.${rival.o}`).first()));
setAiReply(() => JSON.stringify({ headline: `${last5.facts.wins} wins in ${last5.facts.matches}`, body: `${last5.facts.goalsFor} scored, ${last5.facts.goalsAgainst} conceded.`, watch: 'Keep going.' }));
t('last-5 copy that quotes only fact-pack figures is written', await writeInsight(env, 'matches.last5', last5)
  && (await DB.prepare('SELECT tier FROM stat_insights WHERE key = ?').bind('matches.last5').first()).tier === 'public');
t('last-5 copy may quote a score line from the pack (opponent names carry digits through the checker)', numbersOk(`${last5.facts.scores[0]}`, new Set(extractNumbers(JSON.stringify(last5.facts)))));
setAiReply(null);

// ---------- refresh: fingerprint gate skips unchanged facts ----------
await DB.exec('DELETE FROM stat_insights'); // clean slate – every registry key is missing
calls = 0;
setAiReply(() => { calls++; return JSON.stringify({ headline: 'Form check', body: 'Nothing has moved.', watch: 'As before.' }); });
await refreshStatInsights(env, loadSite);
t('refreshStatInsights writes every registry key on first run', calls === keys.length);
calls = 0;
await refreshStatInsights(env, loadSite); // nothing changed since → the fingerprint gate skips every key
t('refreshStatInsights skips every key whose fingerprint already matches', calls === 0);
setAiReply(null);

// ---------- queue job ----------
await DB.exec("DELETE FROM stat_insights WHERE key = 'match.latest'");
await handleStatInsightJob(env, loadSite, 'match.latest');
t('handleStatInsightJob writes the row it was told to', !!(await DB.prepare('SELECT 1 FROM stat_insights WHERE key = ?').bind('match.latest').first()));

// ---------- routes: tier gating ----------
const guest = null;
const member = await login('700');
const mgr = await login('701', ['mgr']);
let r = await call(guest, `/api/insights?keys=club,player.${homePlayer.k}`);
t('guest sees the public club insight but not the member-tier player one', r.s === 200 && r.d.insights.some((x) => x.key === 'club') && !r.d.insights.some((x) => x.key.startsWith('player.')));
r = await call(member, `/api/insights?keys=club,player.${homePlayer.k}`);
t('a member sees both public and member-tier insights', r.s === 200 && r.d.insights.length === 2);
r = await call(guest, '/api/insights?keys=club');
t('statInsights=off → route 404s', (env.FEATURES = JSON.stringify({ statInsights: 'off' })) && (await call(guest, '/api/insights?keys=club')).s === 404);
env.FEATURES = JSON.stringify({ statInsights: 'public' });

// ---------- feedback ----------
r = await call(member, '/api/insights/feedback', { key: 'club', vote: 1 });
t('feedback upserts a vote', r.s === 200 && r.d.ok);
r = await call(member, '/api/insights/feedback', { key: 'club', vote: -1 });
const fb = await DB.prepare('SELECT vote FROM stat_insight_feedback WHERE key = ? AND user_id = ?').bind('club', '700').first();
t('a second vote replaces the first, not duplicates it', fb.vote === -1);
t('feedback needs a key and a valid vote', (await call(member, '/api/insights/feedback', { key: '', vote: 1 })).d.error && (await call(member, '/api/insights/feedback', { key: 'club', vote: 3 })).d.error);

// ---------- ask ----------
setAiReply(() => JSON.stringify({ answer: 'A fair return for the effort shown.' }));
r = await call(member, '/api/insights/ask', { key: 'club', question: 'How are we doing?' });
t('ask answers from the stored fact pack', r.s === 200 && r.d.answer);
r = await call(member, '/api/insights/ask', { key: 'no-such-key', question: 'x' });
t('ask on an unknown key → error', !!r.d.error);
r = await call(guest, '/api/insights/ask', { key: 'club', question: 'x' });
t('ask requires login', r.s === 401);
for (let i = 0; i < 10; i++) await call(mgr, '/api/insights/ask', { key: 'club', question: `q${i}` });
r = await call(mgr, '/api/insights/ask', { key: 'club', question: 'one more' });
t('ask is rate-limited to 10/day per member', r.d.error?.includes('Too many'));
setAiReply(null);

// ---------- weekly post ----------
let posted = null;
const fakePostEmbed = async (e2, channel, role, message) => { posted = { channel, message }; return { ok: true, id: '1' }; };
await DB.exec("INSERT INTO meta (key, value) VALUES ('announce_channel', '555') ON CONFLICT (key) DO UPDATE SET value = excluded.value");
const monday10am = new Date('2026-10-05T10:00:00Z').getTime(); // a Monday
await statInsightWeekly(env, fakePostEmbed, monday10am);
t('weekly post fires on Monday 10:00 UTC with a channel set', posted?.channel === '555' && posted.message.embeds[0].title.includes('Insight of the week'));
posted = null;
await statInsightWeekly(env, fakePostEmbed, monday10am);
t('the weekly post only fires once per week', posted === null);
posted = null;
await statInsightWeekly(env, fakePostEmbed, new Date('2026-10-06T10:00:00Z').getTime()); // a Tuesday
t('no post on a non-Monday', posted === null);

// ---------- /insight Discord embed (read-only, same tier gate as the site) ----------
const { discordInsightEmbed } = await import('../bot/statinsights.js');
await DB.exec('DELETE FROM stat_insights');
await DB.prepare('INSERT INTO stat_insights (key, hash, headline, body, watch, sources, tier, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  .bind('club', 'h', 'Unbeaten at home', 'Form is solid.', 'Keep it tight.', '{}', 'public', Date.now()).run();
await DB.prepare('INSERT INTO stat_insights (key, hash, headline, body, watch, sources, tier, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  .bind('leaders.goals', 'h', 'Goals race', 'Close at the top.', 'Watch the striker.', '{}', 'member', Date.now()).run();
const ok = await discordInsightEmbed(env, 'club', 'guest');
t('/insight club → embed in club red with the stored headline', ok.embed?.title === '✨ Unbeaten at home' && ok.embed.color === 0xc8352c);
t('/insight member-tier row → gated for a guest', /members only/.test((await discordInsightEmbed(env, 'goals', 'guest')).error ?? ''));
t('/insight member-tier row → shown to a member', (await discordInsightEmbed(env, 'goals', 'member')).embed?.title === '✨ Goals race');
t('/insight with no stored row → friendly error', /No insight/.test((await discordInsightEmbed(env, 'match', 'owner')).error ?? ''));
t('/insight unknown stat → error', !!(await discordInsightEmbed(env, 'nope', 'owner')).error);
await DB.prepare('INSERT INTO stat_insights (key, hash, headline, body, watch, sources, tier, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  .bind('matches.last5', 'h', 'Five-game run', 'Body.', 'Watch.', '{}', 'public', Date.now()).run();
t('/insight last5 reads the matches.last5 row for a guest (public tier)', (await discordInsightEmbed(env, 'last5', 'guest')).embed?.title === '✨ Five-game run');

// ---------- BE9 compare (on demand, member+, pair key sorted, cached by fingerprint) ----------
const homes = siteJson('players').filter((p) => p.home);
const [pa, pb] = [homes[0], homes[1]];
t('compareKey sorts the pair so A-vs-B and B-vs-A share one row', compareKey(pa.k, pb.k) === compareKey(pb.k, pa.k));
const cmpPack = await factPackFor(compareKey(pa.k, pb.k), loadSite);
t('compare fact pack is member-tier and carries both players by name (sorted pair)', cmpPack.tier === 'member' && [cmpPack.facts.a.name, cmpPack.facts.b.name].sort().join('|') === [pa.n, pb.n].sort().join('|'));
t('compare fact pack with a non-home player → null', (await factPackFor(compareKey(pa.k, 'not-a-real-key'), loadSite)) === null);
t('compare route: guests are refused', /Members only/.test((await statCompareRoute(env, loadSite, { role: 'guest' }, { a: pa.k, b: pb.k })).error ?? ''));
t('compare route: same player twice is refused', /different/.test((await statCompareRoute(env, loadSite, { role: 'member' }, { a: pa.k, b: pa.k })).error ?? ''));
setAiReply(() => JSON.stringify({ headline: 'Close call', body: 'Two very different games, one clear edge.', watch: 'Who grabs the next big game.' }));
const first = await statCompareRoute(env, loadSite, { role: 'member' }, { a: pa.k, b: pb.k });
t('compare route writes the pair on first view', first.insight?.headline === 'Close call' && first.insight.key === compareKey(pa.k, pb.k));
let writerCalls = 0;
setAiReply(() => { writerCalls++; return JSON.stringify({ headline: 'Changed', body: 'Changed body.', watch: 'Changed watch.' }); });
const again = await statCompareRoute(env, loadSite, { role: 'member' }, { a: pb.k, b: pa.k });
t('a repeat view of the same pair (either order) is served from the stored row, no writer call', again.insight?.headline === 'Close call' && writerCalls === 0);

// ---------- BE9 compare: number checker, permission matrix, flag gating ----------
const pc = homes[2] ?? homes[1];
setAiReply(() => JSON.stringify({ headline: 'Invented', body: 'One of them has 987 goals this season.', watch: 'Nothing.' }));
const invented = await statCompareRoute(env, loadSite, { role: 'member' }, { a: pa.k, b: pc.k });
t('compare: a reply with a number not in the fact pack is rejected (retry included) and nothing is stored', !!invented.error && !(await DB.prepare('SELECT 1 FROM stat_insights WHERE key = ?').bind(compareKey(pa.k, pc.k)).first()));
t('compare: a non-home player is refused', /home squad/.test((await statCompareRoute(env, loadSite, { role: 'member' }, { a: pa.k, b: 'not-a-real-key' })).error ?? ''));
t('compare: PERMS gate is member+', ['member', 'claimed', 'manager', 'owner'].every((r) => can({ role: r }, 'statInsights.compare')) && !can({ role: 'guest' }, 'statInsights.compare') && !can(null, 'statInsights.compare'));

setAiReply(() => JSON.stringify({ headline: 'Close call', body: 'Two very different games, one clear edge.', watch: 'Who grabs the next big game.' }));
const setFlag = (lvl) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), statInsights: lvl }); };
const startLevel = JSON.parse(env.FEATURES).statInsights;
sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at, name) VALUES ('931', ?, ?, 'approved', ?, 'Cmp Claimed')").run(pa.k, pa.n, Date.now());
const tok = { member: await login('930', [], 'Cmp Member'), claimed: await login('931', [], 'Cmp Claimed'), manager: await login('932', ['mgr'], 'Cmp Manager'), owner: await login('933', ['founder'], 'Cmp Owner') };
const cmpAllowed = { off: [], owner: ['owner'], managers: ['manager', 'owner'], members: ['member', 'claimed', 'manager', 'owner'], public: ['member', 'claimed', 'manager', 'owner'] };
for (const [lvl, who] of Object.entries(cmpAllowed)) {
  setFlag(lvl);
  const got = [];
  for (const [role, tk] of Object.entries(tok)) {
    const r = await call(tk, '/api/insights/compare', { a: pa.k, b: pb.k });
    if (r.s === 200 && r.d?.insight?.key === compareKey(pa.k, pb.k)) got.push(role);
    else if (r.s !== 404) got.push(`${role}:${r.s}`); // flag off for this role must be a plain 404
  }
  t(`compare flag "${lvl}" → only ${who.join('/') || 'nobody'} get the insight, everyone else 404`, got.join() === who.join());
  const anon = await call(null, '/api/insights/compare', { a: pa.k, b: pb.k });
  t(`compare flag "${lvl}" → signed-out visitors never get it`, anon.s >= 400 && !anon.d?.insight);
}
setFlag(startLevel);
// ---------- BE9 h2h on demand (member+, any opponent in h2h.json, same fingerprint gate as compare) ----------
const rival2 = h2hRows.find((e) => e.o !== rival.o) ?? rival;
t('h2h route: guests are refused', /Members only/.test((await statH2hRoute(env, loadSite, { role: 'guest' }, { o: rival2.o })).error ?? ''));
t('h2h route: a malformed id is refused', /opponent/.test((await statH2hRoute(env, loadSite, { role: 'member' }, { o: "1'; DROP TABLE x" })).error ?? ''));
t('h2h route: an unknown opponent is refused and nothing is stored', /No record/.test((await statH2hRoute(env, loadSite, { role: 'member' }, { o: '0000000' })).error ?? '') && !(await DB.prepare("SELECT 1 FROM stat_insights WHERE key = 'h2h.0000000'").first()));
setAiReply(() => JSON.stringify({ headline: 'Familiar foe', body: `${rival2.n} have met NOREX ${rival2.p} time${rival2.p === 1 ? '' : 's'}.`, watch: 'The next meeting.' }));
await DB.prepare('DELETE FROM stat_insights WHERE key = ?').bind(`h2h.${rival2.o}`).run();
const h1 = await statH2hRoute(env, loadSite, { role: 'member' }, { o: rival2.o });
t('h2h route writes an opponent on first view (public tier row)', h1.insight?.headline === 'Familiar foe' && h1.insight.key === `h2h.${rival2.o}` && (await DB.prepare('SELECT tier FROM stat_insights WHERE key = ?').bind(`h2h.${rival2.o}`).first())?.tier === 'public');
writerCalls = 0;
setAiReply(() => { writerCalls++; return JSON.stringify({ headline: 'Changed', body: 'Changed body.', watch: 'Changed watch.' }); });
const h2 = await statH2hRoute(env, loadSite, { role: 'member' }, { o: rival2.o });
t('h2h repeat view is served from the stored row, no writer call', h2.insight?.headline === 'Familiar foe' && writerCalls === 0);
const changedSite = async (f) => (f === 'h2h' ? h2hRows.map((e) => (e.o === rival2.o ? { ...e, p: e.p + 1, w: e.w + 1, gf: e.gf + 1, lastScore: '1–0' } : e)) : siteJson(f));
setAiReply(() => { writerCalls++; return JSON.stringify({ headline: 'Another one', body: 'A fresh result is in.', watch: 'Next up.' }); });
const h3 = await statH2hRoute(env, loadSite, { role: 'member' }, { o: rival2.o });
t('h2h: unchanged record still no writer call after the gate (control)', h3.insight?.headline === 'Familiar foe');
const h4 = await statH2hRoute(env, changedSite, { role: 'member' }, { o: rival2.o });
t('h2h: a changed record (new result) re-writes the row once', h4.insight?.headline === 'Another one' && writerCalls === 1);
setAiReply(() => JSON.stringify({ headline: 'Invented', body: 'They have conceded 987 goals to us.', watch: 'Nothing.' }));
await DB.prepare('DELETE FROM stat_insights WHERE key = ?').bind(`h2h.${rival.o}`).run();
const hInv = await statH2hRoute(env, loadSite, { role: 'member' }, { o: rival.o });
t('h2h route: an invented number is rejected and nothing is stored', !!hInv.error && !(await DB.prepare('SELECT 1 FROM stat_insights WHERE key = ?').bind(`h2h.${rival.o}`).first()));
t('h2h: PERMS gate is member+', ['member', 'claimed', 'manager', 'owner'].every((r) => can({ role: r }, 'statInsights.h2h')) && !can({ role: 'guest' }, 'statInsights.h2h') && !can(null, 'statInsights.h2h'));
setAiReply(() => JSON.stringify({ headline: 'Familiar foe', body: 'Met before.', watch: 'Next time.' }));
for (const [lvl, who] of Object.entries(cmpAllowed)) {
  setFlag(lvl);
  const got = [];
  for (const [role, tk] of Object.entries(tok)) {
    const r = await call(tk, '/api/insights/h2h', { o: rival2.o });
    if (r.s === 200 && r.d?.insight?.key === `h2h.${rival2.o}`) got.push(role);
    else if (r.s !== 404) got.push(`${role}:${r.s}`);
  }
  t(`h2h flag "${lvl}" → only ${who.join('/') || 'nobody'} get the on-demand route, everyone else 404`, got.join() === who.join());
  const anon = await call(null, '/api/insights/h2h', { o: rival2.o });
  t(`h2h flag "${lvl}" → signed-out visitors never get it`, anon.s >= 400 && !anon.d?.insight);
}
setFlag(startLevel);
t('statInsights ships at members level (rolled out 2026-10-07) in config.json', config.features.statInsights === 'members');

// ---------- BE9 coach's note (private tier): fact pack, registry, writer, visibility ----------
const players = siteJson('players').filter((p) => p.home && (p.s?.gp ?? 0) > 0);
const [np, nq] = [players[0], players[1] ?? players[0]]; // note subject / "some other player"
const noPlayed = siteJson('players').find((p) => p.home && !(p.s?.gp > 0));
const addNote = (subject, tag, text) => sqlite.prepare("INSERT INTO notes (kind, subject, tag, text, by_id, by_name, at) VALUES ('player', ?, ?, ?, 'm1', 'Coach', ?)").run(subject, tag, text, Date.now());
sqlite.prepare("DELETE FROM notes WHERE kind = 'player'").run();
addNote(np.k, 'strength', 'Brilliant first touch under pressure');
addNote(np.k, 'issue', 'Keeps going missing in the 80th minute');
addNote(np.k, 'general', 'Asked about moving to CAM');
addNote(nq.k, 'strength', 'Great communicator');

const notePack = await factPackFor(`note.${np.k}`, loadSite, env);
t('note fact pack is private-tier and carries the player\'s own season stats', notePack.tier === 'private' && notePack.facts.goals === (np.s?.g ?? 0) && notePack.facts.games === np.s.gp);
t('note fact pack carries only the manager STRENGTH notes – issue/general notes never reach the writer', notePack.facts.coachStrengths.join('|') === 'Brilliant first touch under pressure');
t('note fact pack gives the squad rank + size (computed, not invented)', notePack.facts.squadSize === players.length && notePack.facts.goalsRank >= 1 && notePack.facts.goalsRank <= players.length);
t('note fact pack without a D1 binding degrades to stats only', (await factPackFor(`note.${np.k}`, loadSite)).facts.coachStrengths.length === 0);
t('note fact pack for a non-home player → null', (await factPackFor('note.not-a-real-key', loadSite, env)) === null);
if (noPlayed) t('note fact pack for a home player with no league games → null', (await factPackFor(`note.${noPlayed.k}`, loadSite, env)) === null);
const noteKeys = await registryKeys(loadSite);
t('registry has one note key per home player with games (squad size, not squad²) and none for the others', players.every((p) => noteKeys.includes(`note.${p.k}`)) && noteKeys.filter((k) => k.startsWith('note.')).length === players.length);

// writer: private tier gets the coach's-note voice; a number from a manager note is a legitimate fact; an invented one is rejected
let noteSystem = '';
setAiReply((req) => { noteSystem = req.messages[0].content; return JSON.stringify({ headline: 'First touch like glue', body: 'Management rate your first touch, and the numbers back a steady season.', watch: 'Push for more goals.' }); });
await DB.exec("DELETE FROM stat_insights WHERE key LIKE 'note.%'");
t('writeInsight stores a private-tier row for note.<k>', await writeInsight(env, `note.${np.k}`, notePack));
t("the private tier uses the coach's-note system prompt", /private coach's note/.test(noteSystem));
const noteRow = await DB.prepare('SELECT tier, sources FROM stat_insights WHERE key = ?').bind(`note.${np.k}`).first();
t('the stored row is tier private and keeps the fact pack (incl. the strength note) as sources', noteRow.tier === 'private' && JSON.parse(noteRow.sources).coachStrengths.length === 1);
setAiReply(() => JSON.stringify({ headline: 'Big numbers', body: 'You have 987 goals this season.', watch: 'Keep going.' }));
await DB.prepare('DELETE FROM stat_insights WHERE key = ?').bind(`note.${np.k}`).run();
t('a coach\'s note with an invented number is rejected and nothing is stored', !(await writeInsight(env, `note.${np.k}`, notePack)) && !(await DB.prepare('SELECT 1 FROM stat_insights WHERE key = ?').bind(`note.${np.k}`).first()));
sqlite.prepare("DELETE FROM notes WHERE kind = 'player' AND subject = ? AND tag = 'strength'").run(np.k);
addNote(np.k, 'strength', 'Scored 3 in one night against the league leaders');
const numPack = await factPackFor(`note.${np.k}`, loadSite, env);
setAiReply(() => JSON.stringify({ headline: 'Hat-trick hero', body: 'Management still talk about the 3 you scored in one night.', watch: 'Do it again.' }));
t('a number that appears in a manager strength note is part of the fact pack, so it passes the checker', await writeInsight(env, `note.${np.k}`, numPack));

// fingerprint gate: a new strength note re-writes only that player's note key
setAiReply(null);
let refreshCalls = 0;
await refreshStatInsights(env, loadSite); // settle every other key first
setAiReply(() => { refreshCalls++; return JSON.stringify({ headline: 'Updated', body: 'A fresh read.', watch: 'Next up.' }); });
await refreshStatInsights(env, loadSite);
t('refresh with unchanged facts + notes calls the writer zero times', refreshCalls === 0);
addNote(np.k, 'strength', 'Reads the game early');
await refreshStatInsights(env, loadSite);
t('adding a manager strength note re-writes exactly that player\'s note key', refreshCalls === 1);
addNote(np.k, 'issue', 'Quiet on comms');
await refreshStatInsights(env, loadSite);
t('an issue-tagged note does not change the fact pack, so no re-write', refreshCalls === 1);
setAiReply(null);

// visibility over HTTP: only the claimed player and managers/owner – never another member, another claimant, or a guest
const noteKey = `note.${np.k}`, otherKey = `note.${nq.k}`;
await DB.prepare("INSERT INTO stat_insights (key, hash, headline, body, watch, sources, tier, at) VALUES (?, 'h', 'Coach says', 'Well played.', 'Keep it up.', '{}', 'private', ?) ON CONFLICT (key) DO NOTHING").bind(otherKey, Date.now()).run();
sqlite.prepare("DELETE FROM claims WHERE user_id IN ('941','942')").run();
sqlite.prepare("INSERT INTO claims (user_id, player, player_name, status, at, name) VALUES ('941', ?, ?, 'approved', ?, 'Note Owner')").run(np.k, np.n, Date.now());
sqlite.prepare("INSERT INTO claims (user_id, player, player_name, status, at, name) VALUES ('942', ?, ?, 'approved', ?, 'Note Other')").run(nq.k, nq.n, Date.now());
const ntok = { member: await login('940', [], 'Note Member'), mine: await login('941', [], 'Note Owner'), other: await login('942', [], 'Note Other'), manager: await login('943', ['mgr'], 'Note Manager'), owner: await login('944', ['founder'], 'Note Founder') };
const noteStart = JSON.parse(env.FEATURES).statInsights;
const setNoteFlag = (lvl) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), statInsights: lvl }); };
const seesNote = async (tk, k = noteKey) => (await call(tk, `/api/insights?keys=${encodeURIComponent(k)}`)).d?.insights?.some((x) => x.key === k) ?? false;
setNoteFlag('public');
t('coach\'s note: guest, plain member and another claimed player do not see it', !(await seesNote(null)) && !(await seesNote(ntok.member)) && !(await seesNote(ntok.other)));
t('coach\'s note: the claimed player sees their own, managers and owner see it', (await seesNote(ntok.mine)) && (await seesNote(ntok.manager)) && (await seesNote(ntok.owner)));
t('coach\'s note: a claimed player does not see a different player\'s note', !(await seesNote(ntok.mine, otherKey)) && (await seesNote(ntok.other, otherKey)));
t('coach\'s note: a private row never leaks the tier or fact pack to the viewer', !('sources' in ((await call(ntok.mine, `/api/insights?keys=${encodeURIComponent(noteKey)}`)).d.insights[0] ?? {})) && !('tier' in ((await call(ntok.mine, `/api/insights?keys=${encodeURIComponent(noteKey)}`)).d.insights[0] ?? {})));
const idx = async (tk, headers = {}) => W(`/api/insights?keys=${encodeURIComponent(noteKey)}`, { headers: { ...(tk ? { Authorization: 'Bearer ' + tk } : {}), ...headers } });
t('insights responses for a signed-in viewer are private-cache, varied by Authorization; guests keep the shared cache', (await idx(ntok.mine)).headers.get('Cache-Control').startsWith('private') && /Authorization/i.test((await idx(ntok.mine)).headers.get('Vary') ?? '') && (await idx(null)).headers.get('Cache-Control').startsWith('public'));
t('PERMS gate: statInsights.note is claimed+ (members and guests fail it)', ['claimed', 'manager', 'owner'].every((r) => can({ role: r }, 'statInsights.note')) && !can({ role: 'member' }, 'statInsights.note') && !can({ role: 'guest' }, 'statInsights.note'));

// ask on a private row follows the same visibility
setAiReply(() => JSON.stringify({ answer: 'Your first touch is the headline.' }));
t('ask on your own coach\'s note works', !!(await call(ntok.mine, '/api/insights/ask', { key: noteKey, question: 'What stands out?' })).d.answer);
t('ask on someone else\'s coach\'s note is refused', /Not available/.test((await call(ntok.other, '/api/insights/ask', { key: noteKey, question: 'What stands out?' })).d.error ?? ''));
t('ask on a coach\'s note is refused for a plain member', /Not available/.test((await call(ntok.member, '/api/insights/ask', { key: noteKey, question: 'x' })).d.error ?? ''));
t('managers can ask about any coach\'s note', !!(await call(ntok.manager, '/api/insights/ask', { key: otherKey, question: 'Summary?' })).d.answer);
setAiReply(null);

// flag matrix for the coach's note: the statInsights flag gates who can reach the route at all
const noteAllowed = { off: [], owner: ['owner'], managers: ['manager', 'owner'], members: ['mine', 'manager', 'owner'], public: ['mine', 'manager', 'owner'] };
for (const [lvl, who] of Object.entries(noteAllowed)) {
  setNoteFlag(lvl);
  const got = [];
  for (const [role, tk] of Object.entries(ntok)) if (await seesNote(tk)) got.push(role);
  t(`coach's note flag "${lvl}" → only ${who.join('/') || 'nobody'} get it`, got.join() === who.join());
  t(`coach's note flag "${lvl}" → signed-out visitors never get it`, !(await seesNote(null)));
}
setNoteFlag(noteStart);
t('statInsights still ships at members level in config.json', config.features.statInsights === 'members');

// manager portal (Notes tab): every squad player's coach's note + "last written" – managers already pass visibleRow, no API change
const mgrRows = (await (await W(`/api/insights?keys=${encodeURIComponent(`${noteKey},${otherKey}`)}`, { headers: { Authorization: 'Bearer ' + ntok.manager } })).json()).insights ?? [];
t('a manager gets both players\' coach\'s notes, each with a numeric "at" for "last written"', mgrRows.length === 2 && mgrRows.every((r) => Number.isFinite(r.at) && r.at > 0));
const { readFileSync } = await import('node:fs');
const trialsSrc = readFileSync(new URL('../web/trials.js', import.meta.url), 'utf8'), appSrc = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8'), insSrc = readFileSync(new URL('../web/insights.js', import.meta.url), 'utf8');
t('Notes tab mounts note.<player> through the shared widget with showAt', /ctx\.mountNote\(slot, `note\.\$\{k\}`, \{ showAt: true/.test(trialsSrc));
t('portal ctx hands trials.js a mountNote behind the statInsights flag', /trialsCtx = [\s\S]{0,400}mountNote: flagOn\('statInsights'/.test(appSrc));
t('D3: Members 📝 modal gets the claimed player\'s coach note (player passed from the approved claim, mounted once)', /player: S\.admin\.claims\?\.\[d\.notes\]\?\.status === 'approved'/.test(appSrc) && /async function notesModal\(ctx, \{ kind, subject, title, player \}\)/.test(trialsSrc) && /ctx\.mountNote\(\$\('\[data-coach-slot\]', coach\), `note\.\$\{player\}`/.test(trialsSrc));
t('D3: "All notes at a glance" chunks keys by 20 (route cap), escapes names + bodies, one fetch per chunk', /i \+= 20/.test(trialsSrc) && /slice\(i, i \+ 20\)/.test(trialsSrc) && /esc\(x\.headline\)\}<\/strong> \$\{esc\(x\.body\)\}/.test(trialsSrc));
t('widget shows "last written" only when asked (showAt) and keeps an empty slot only when asked (empty)', /ctx\.showAt && r\.at/.test(insSrc) && /!row && ctx\.empty/.test(insSrc));

// surfaces: matches.html last-5 slot + clickable "Head to head" rows on stats.html (ids from api/h2h.json)
const buildSrc = readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
t('matches index drops a matches.last5 slot above the sessions', /pageHead\('Matches'[^\n]*\n\$\{homeMatches\.length \? '<div data-nx-insight="matches\.last5" hidden>/.test(buildSrc));
t('stats h2h rows carry data-h2h (EA club id) and the panel sits under the table', /<tr data-h2h="\$\{esc\(e\.o\)\}"/.test(buildSrc) && /data-nx-h2h-insight hidden/.test(buildSrc));
t('app.js mounts h2h.<opponent> on row click/Enter behind statInsights, ignoring link clicks', /\[data-nx-h2h-insight\]/.test(appSrc) && /flagOn\('statInsights'[\s\S]{0,900}`h2h\.\$\{tr\.dataset\.h2h\}`/.test(appSrc) && /!e\.target\.closest\('a'\)/.test(appSrc));
t('every h2h.json id is a digit string (safe for the data-h2h attribute + route)', h2hRows.every((e) => /^\d+$/.test(String(e.o))));

// ---------- /insight opponent: (Discord head to head, stored row first, on-demand writer second) ----------
{
  const { discordH2hEmbed } = await import('../bot/statinsights.js');
  const opp = siteJson('h2h')[0];
  await DB.prepare('DELETE FROM stat_insights WHERE key = ?').bind(`h2h.${opp.o}`).run();
  t('discord h2h: junk opponent id → error', /Pick an opponent/.test((await discordH2hEmbed(env, loadSite, 'abc', { role: 'owner' })).error ?? ''));
  t('discord h2h: unknown club id → error', /No record/.test((await discordH2hEmbed(env, loadSite, '1', { role: 'owner' })).error ?? ''));
  t('discord h2h: a guest cannot trigger a write when no row exists', /log in/.test((await discordH2hEmbed(env, loadSite, opp.o, { role: 'guest' })).error ?? ''));
  let calls = 0;
  setAiReply(() => { calls++; return JSON.stringify({ headline: 'Perfect against them', body: `Played ${opp.p} and never lost.`, watch: 'Keep the record spotless.' }); });
  const first = await discordH2hEmbed(env, loadSite, opp.o, { role: 'owner' });
  t('discord h2h: member+ with no stored row → writer runs, embed has record field', first.embed?.title === '✨ Perfect against them' && first.embed.fields[0].name === `vs ${opp.n}` && calls === 1);
  const again = await discordH2hEmbed(env, loadSite, opp.o, { role: 'guest' });
  t('discord h2h: stored row is reused with no writer call, and guests can read it', again.embed?.title === first.embed.title && calls === 1);
  setAiReply(null);
}


// ----- D2: club records insight -----
const recsRow = siteJson('records');
const recPack = await factPackFor('club.records', async (f) => siteJson(f));
t('D2 records: public fact pack from records.json (win/defeat, streak, hat-tricks, best-in-a-match)', recPack?.tier === 'public' && recPack.facts.games === recsRow.games && recPack.facts.longestWinStreak === recsRow.longestWinStreak && recPack.facts.hatTricks === recsRow.hatTricks && 'bestInAMatch' in recPack.facts);
t('D2 records: no records file or no games → null', (await factPackFor('club.records', async (f) => { if (f === 'records') throw new Error('404'); return siteJson(f); })) === null && (await factPackFor('club.records', async (f) => (f === 'records' ? { games: 0 } : siteJson(f)))) === null);
t('D2 records: pre-written by the cron registry', (await registryKeys(async (f) => siteJson(f))).includes('club.records'));
t('D2 records: stats + leaders pages carry the slot under Club records', ['scripts/build.mjs', 'scripts/leaders-page.mjs'].every((f) => /<div data-nx-insight=\\?"club\.records\\?" hidden><\/div>/.test(readFileSync(new URL('../' + f, import.meta.url), 'utf8'))));

done();

// club pages: per-opponent h2h slot (only for clubs NOREX has played = the ids in api/h2h.json)
t('non-home club pages drop a data-nx-insight="h2h.<id>" slot only when NOREX has played that club', /homeMatches\.some\(\(m\) => oppOf\(m, homeId\) === String\(id\)\) \? `<div data-nx-insight="h2h\.\$\{esc\(id\)\}"/.test(buildSrc));
