// Profanity counter & escalation (P11.4): parseAlert() against a best-guess AutoMod alert shape, the strike
// escalation (warn at 3, mute at 5, no double-count on a re-read), and the clean-behaviour points bonus.
// setupAutoMod() itself just calls the real Discord AutoMod API – not exercised here (needs a live run, like
// P11.1's /aispike), only its owner-only guard.
import { env, login } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { checkProfanity, cleanBonus, parseAlert, setupAutoMod } from '../bot/profanity.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ points: 'members' });
const UID = '801000000000000001', CLEAN_UID = '802000000000000002'; // realistic-length snowflakes – parseAlert requires 5-25 digits
await login(UID, [], 'Flagged');

// ---------- parseAlert ----------
const alertMsg = (id, uid, keyword) => ({
  id, type: 24,
  embeds: [{ title: 'AutoMod', description: `Blocked a message from <@${uid}>`, fields: [{ name: 'Rule Triggered', value: 'NOREX profanity filter' }, { name: 'Matched Keyword', value: keyword }] }],
});
t('parses a mentioned user + keyword out of the alert embed', JSON.stringify(parseAlert(alertMsg('m1', UID, 'badword'))) === JSON.stringify({ uid: UID, keyword: 'badword' }));
t('non-AutoMod message type → ignored', parseAlert({ id: 'm2', type: 0, content: 'hi' }) === null);
t('AutoMod message with no mention anywhere → ignored (nothing to attribute)', parseAlert({ id: 'm3', type: 24, embeds: [{ description: 'no user here' }] }) === null);

// ---------- setupAutoMod guard ----------
await tt('non-owner blocked from setup', async () => { try { await setupAutoMod(env, { role: 'manager' }, '1'); return false; } catch (e) { return e.message === 'Owner only.'; } });
await tt('missing channel is rejected', async () => { try { await setupAutoMod(env, { role: 'owner' }, null); return false; } catch (e) { return /channel/.test(e.message); } });

// ---------- cron: checkProfanity ----------
env.DISCORD_BOT_TOKEN = 'bot';
await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('profanity_config', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(JSON.stringify({ channelId: '999', lastMessageId: null })).run();
const realFetch = globalThis.fetch;
let feed = [alertMsg('m1', UID, 'badword')];
globalThis.fetch = async (url) => (String(url).includes('/channels/999/messages') ? Response.json(feed) : realFetch(url));

await checkProfanity(env);
let u = await env.DB.prepare('SELECT profanity_strikes FROM users WHERE id = ?').bind(UID).first();
t('one alert → one strike', u.profanity_strikes === 1);

feed = [];
await checkProfanity(env);
u = await env.DB.prepare('SELECT profanity_strikes FROM users WHERE id = ?').bind(UID).first();
t('no new alerts → strikes unchanged', u.profanity_strikes === 1);

// Drive to the warning threshold with distinct message ids (so the unique index doesn't dedupe them).
feed = [alertMsg('m2', UID, 'x')];
await checkProfanity(env);
feed = [alertMsg('m3', UID, 'x')];
await checkProfanity(env);
u = await env.DB.prepare('SELECT warnings, profanity_strikes FROM users WHERE id = ?').bind(UID).first();
t('3rd strike → auto-warning recorded', u.profanity_strikes === 3 && JSON.parse(u.warnings).some((w) => w.by === 'AutoMod'));

for (const id of ['m4', 'm5']) { feed = [alertMsg(id, UID, 'x')]; await checkProfanity(env); }
u = await env.DB.prepare('SELECT profanity_strikes, muted_until FROM users WHERE id = ?').bind(UID).first();
t('5th strike → auto-muted', u.profanity_strikes === 5 && u.muted_until > Date.now());

// Re-reading the exact same alert again must not double-count (unique index on message_ref).
feed = [alertMsg('m5', UID, 'x')];
await checkProfanity(env);
u = await env.DB.prepare('SELECT profanity_strikes FROM users WHERE id = ?').bind(UID).first();
t('re-reading the same alert id does not add a 6th strike', u.profanity_strikes === 5);
globalThis.fetch = realFetch;

// ---------- cleanBonus ----------
await login(CLEAN_UID, [], 'Clean');
const before = (await env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(CLEAN_UID).first()).points;
await cleanBonus(env);
const afterClean = await env.DB.prepare('SELECT points, last_clean_bonus_at FROM users WHERE id = ?').bind(CLEAN_UID).first();
t('a member with no strikes gets the clean-behaviour bonus', afterClean.points === before + 3 && afterClean.last_clean_bonus_at > 0);
const flagged = await env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(UID).first();
t('the flagged member does not get a clean bonus', flagged.points === 0);
await cleanBonus(env);
const again = (await env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(CLEAN_UID).first()).points;
t('running the bonus again right away does not double-pay', again === afterClean.points);
done();
