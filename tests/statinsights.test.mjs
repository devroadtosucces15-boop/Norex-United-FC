// BE9 Insights engine: fact packs, the fingerprint gate, the number checker (must reject invented
// numbers), the routes (tier gating, ask rate limit, feedback), the queue job, and the weekly post.
import { call, env, login, siteJson, setAnthropicReply, DB } from './mock.mjs';
import { t, done } from './lib.mjs';
import {
  factPackFor, registryKeys, numbersOk, extractNumbers, writeInsight, refreshStatInsights,
  handleStatInsightJob, statInsightWeekly,
} from '../bot/statinsights.js';

const loadSite = async (f) => siteJson(f);
const homePlayer = siteJson('players').find((p) => p.home);

// ---------- fact packs ----------
const club = await factPackFor('club', loadSite);
t('club fact pack is public with the real club numbers', club.tier === 'public' && club.facts.gamesPlayed === siteJson('club').gp);
const match = await factPackFor('match.latest', loadSite);
t('match.latest fact pack matches the newest result', match.tier === 'public' && match.facts.opponent === siteJson('club').matches[0].opp);
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

// ---------- number checker ----------
const allowed = new Set([5, 12, 50]);
t('extractNumbers pulls every number out of a string', extractNumbers('5 goals in 12 games, 50%').join() === '5,12,50');
t('numbersOk: only allowed numbers → true', numbersOk('They won 5 of 12, a 50% record.', allowed));
t('numbersOk: a made-up number → false', !numbersOk('A remarkable 17-game run.', allowed));
t('numbersOk: no numbers at all → true (nothing to check)', numbersOk('Steady as ever.', allowed));

// ---------- writer: fingerprint gate + number checker + retry ----------
env.FEATURES = JSON.stringify({ statInsights: 'public' }); // decouple tier tests from the flag's own owner gate

setAnthropicReply(() => JSON.stringify({ headline: 'Solid week', body: 'A clean, honest read of the numbers.', watch: 'Keep it up.' }));
t('writeInsight writes a row when the writer stays inside the facts', await writeInsight(env, 'club', club));
let row = await DB.prepare('SELECT * FROM stat_insights WHERE key = ?').bind('club').first();
t('stored row has the right tier + sources', row.tier === 'public' && JSON.parse(row.sources).gamesPlayed === club.facts.gamesPlayed);

let calls = 0;
setAnthropicReply((req) => {
  calls++;
  const text = req.messages[0].content;
  // First attempt invents a number; the retry (triggered by the rejection) must use only real facts.
  return calls === 1 ? JSON.stringify({ headline: 'An incredible 999 wins', body: 'Unreal form.', watch: 'More of the same.' })
    : JSON.stringify({ headline: 'Steady form', body: 'A fair read of a quiet week.', watch: 'Nothing alarming.' });
});
const matchKeyFacts = await factPackFor('match.latest', loadSite);
t('an invented number is rejected and retried, then written once the retry is clean', await writeInsight(env, 'match.latest', matchKeyFacts) && calls === 2);

calls = 0;
setAnthropicReply(() => { calls++; return JSON.stringify({ headline: 'An incredible 999 wins', body: 'Unreal.', watch: 'Wow.' }); });
t('two invented-number replies in a row → skipped, not written', !(await writeInsight(env, 'club', club)) && calls === 2);

setAnthropicReply(null); // back to the default reply for the rest of the file

// ---------- refresh: fingerprint gate skips unchanged facts ----------
await DB.exec('DELETE FROM stat_insights'); // clean slate – every registry key is missing
calls = 0;
setAnthropicReply(() => { calls++; return JSON.stringify({ headline: 'Form check', body: 'Nothing has moved.', watch: 'As before.' }); });
await refreshStatInsights(env, loadSite);
t('refreshStatInsights writes every registry key on first run', calls === keys.length);
calls = 0;
await refreshStatInsights(env, loadSite); // nothing changed since → the fingerprint gate skips every key
t('refreshStatInsights skips every key whose fingerprint already matches', calls === 0);
setAnthropicReply(null);

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
setAnthropicReply(() => JSON.stringify({ answer: 'A fair return for the effort shown.' }));
r = await call(member, '/api/insights/ask', { key: 'club', question: 'How are we doing?' });
t('ask answers from the stored fact pack', r.s === 200 && r.d.answer);
r = await call(member, '/api/insights/ask', { key: 'no-such-key', question: 'x' });
t('ask on an unknown key → error', !!r.d.error);
r = await call(guest, '/api/insights/ask', { key: 'club', question: 'x' });
t('ask requires login', r.s === 401);
for (let i = 0; i < 10; i++) await call(mgr, '/api/insights/ask', { key: 'club', question: `q${i}` });
r = await call(mgr, '/api/insights/ask', { key: 'club', question: 'one more' });
t('ask is rate-limited to 10/day per member', r.d.error?.includes('Too many'));
setAnthropicReply(null);

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

done();
