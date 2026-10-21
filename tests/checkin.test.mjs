// Check-in + answer order: first answer time, the answer log, the Check in button/post, the lineup post's bench and kick-off notes.
import { call, env, login, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { plainText } from '../bot/ui.js';
import { eventReminders, kickoffNotes, MIN_REAL } from '../bot/events.js';
import { t, done } from './lib.mjs';

const txt = (m) => plainText(m);
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ events: 'public', matchNight: 'members', notifications: 'members', profiles: 'members', discordRsvp: 'members' });

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
env.DISCORD_BOT_TOKEN = 'bot';
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  return (await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} })).json();
}
const who = (id) => ({ member: { user: { id, username: `u${id}`, global_name: `G${id}` }, nick: `Nick ${id}`, roles: [] } });
const button = (custom_id, id = '500') => send({ type: 3, data: { custom_id, component_type: 2 }, ...who(id) });

const posts = [], edits = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/guilds/9/channels')) return Response.json([{ id: '70001', name: 'match-nights', type: 0 }]);
  if (u.endsWith('/guilds/9/roles')) return Response.json([{ id: '9', name: '@everyone' }]);
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  let m = u.match(/\/channels\/(\d+)\/messages\/(\w+)$/);
  if (m && init.method === 'PATCH') { edits.push({ channel: m[1], msg: m[2], ...JSON.parse(init.body) }); return Response.json({}); }
  m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m && m[1] !== 'dm') { posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: `m${posts.length}` }); }
  if (m) return Response.json({ id: 'dm-msg' });
  return realFetch(url, init);
};
const btnsOf = (m) => { const out = []; const walk = (c) => { if (!c || typeof c !== 'object') return; if (Array.isArray(c)) return c.forEach(walk); if (c.type === 2) out.push(c); walk(c.components); walk(c.accessory); }; walk(m?.components); return out; };

const mgr = await login('600', ['mgr'], 'Coach');
const a = await login('500', [], 'Player One'), b = await login('501', [], 'Player Two'), c = await login('502', [], 'Player Three');
const inMin = (n) => { const d = new Date(Date.now() + n * 60e3); return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) }; };

// ----- answer order: the first answer keeps its place when the answer changes -----
const far = inMin(60 * 48);
const ev = (await call(mgr, '/api/events', { type: 'league', ...far, tz: 'UTC', duration: 120, discord: { channel: '70001' } })).d.id;
const order = () => sqlite.prepare('SELECT user_id FROM event_rsvps WHERE event_id = ? ORDER BY COALESCE(first_at, at), user_id').all(ev).map((r) => r.user_id).join();
await call(b, '/api/events/rsvp', { ids: [ev], status: 'maybe' }); await new Promise((r) => setTimeout(r, 5));
await call(a, '/api/events/rsvp', { ids: [ev], status: 'no' }); await new Promise((r) => setTimeout(r, 5));
await call(c, '/api/events/rsvp', { ids: [ev], status: 'yes' }); await new Promise((r) => setTimeout(r, 5));
const firstA = sqlite.prepare("SELECT first_at FROM event_rsvps WHERE event_id = ? AND user_id = '500'").get(ev).first_at;
await call(a, '/api/events/rsvp', { ids: [ev], status: 'yes' });
t('first answer keeps its place when the answer changes', order() === '501,500,502' && sqlite.prepare("SELECT first_at FROM event_rsvps WHERE event_id = ? AND user_id = '500'").get(ev).first_at === firstA);
t('the order the API sends follows the first answer, with the time', (await call(mgr, '/api/events')).d.events.find((e) => e.id === ev).rsvps.map((r) => r.id).join() === '501,500,502');
await call(a, '/api/events/rsvp', { ids: [ev], status: 'clear' }); await new Promise((r) => setTimeout(r, 5));
await call(a, '/api/events/rsvp', { ids: [ev], status: 'yes' });
t('clearing an answer and answering again goes to the back', order() === '501,502,500');

// ----- the log -----
const log = sqlite.prepare('SELECT name, kind, prev FROM event_answer_log WHERE event_id = ? ORDER BY id').all(ev).map((r) => `${r.name}:${r.kind}${r.prev ? `<${r.prev}` : ''}`);
t('every answer, change and clear is logged with what it replaced', log.join() === 'Player Two:maybe,Player One:no,Player Three:yes,Player One:yes<no,Player One:clear<yes,Player One:yes');
await call(c, '/api/events/rsvp', { ids: [ev], status: 'yes' });
t('answering the same thing again is not logged twice', sqlite.prepare('SELECT COUNT(*) AS n FROM event_answer_log WHERE event_id = ?').get(ev).n === 6);

// ----- the check-in post, 30 minutes before -----
const soon = inMin(20);
const e30 = (await call(mgr, '/api/events', { type: 'league', ...soon, tz: 'UTC', discord: { channel: '70001' } })).d.id;
await call(b, '/api/events/rsvp', { ids: [e30], status: 'maybe' });
await call(a, '/api/events/rsvp', { ids: [e30], status: 'yes' });
await call(c, '/api/events/rsvp', { ids: [e30], status: 'no' });
const before = posts.length;
await eventReminders(env);
const ci = posts.slice(before).find((p) => /Check in now/.test(txt(p)));
t('30 minutes before: a check-in post with a Check in button', ci && btnsOf(ci).some((x) => x.custom_id === `norex:ci:${e30}`));
t('… tags everyone who said yes or maybe, not the ones who said no', ci.allowed_mentions.users.includes('500') && ci.allowed_mentions.users.includes('501') && !ci.allowed_mentions.users.includes('502'));
t('… lists them as not checked in yet, in the order they answered, and repeats the kick-off notes', /NOT CHECKED IN/.test(txt(ci)) && txt(ci).indexOf('Player Two') < txt(ci).indexOf('Player One') && /10 minutes before the start/.test(txt(ci)) && /6 real players/.test(txt(ci)));
t('… and remembers the post so it can stay live', sqlite.prepare('SELECT checkin_msg FROM events WHERE id = ?').get(e30).checkin_msg === `m${posts.indexOf(ci) + 1}`);

const pressed = await button(`norex:ci:${e30}`, '500');
t('Check in button checks the player in, privately', (pressed.data.flags & 64) === 64 && /checked in/.test(txt(pressed.data)) && sqlite.prepare("SELECT 1 FROM event_checkins WHERE event_id = ? AND user_id = '500'").get(e30));
t('… logs it with the time', sqlite.prepare("SELECT kind FROM event_answer_log WHERE event_id = ? AND user_id = '500' AND kind = 'checkin'").all(e30).length === 1);
t('… and the post moves them to Checked in', /-# \*\*CHECKED IN\*\*\n[^\n]*Player One/.test(txt(edits.filter((x) => x.msg === sqlite.prepare('SELECT checkin_msg FROM events WHERE id = ?').get(e30).checkin_msg).at(-1))));
await button(`norex:ci:${e30}`, '500');
t('pressing twice logs one check-in', sqlite.prepare("SELECT COUNT(*) AS n FROM event_answer_log WHERE event_id = ? AND user_id = '500' AND kind = 'checkin'").get(e30).n === 1);
t('check-in on a far-away event is refused', /opens an hour before/.test(txt((await button(`norex:ci:${ev}`, '500')).data)));
setFlags({ matchNight: 'owner' });
t('Check in button respects the matchNight flag', /not switched on/.test(txt((await button(`norex:ci:${e30}`, '501')).data)));
setFlags({ matchNight: 'members' });

// ----- kick-off notes by event type -----
t('minimum real players: league 6, playoffs 8, others none', MIN_REAL.league === 6 && MIN_REAL.playoffs === 8 && !MIN_REAL.friendly);
t('league notes mention 6 and that tournaments need 8; playoffs say 8; friendlies have no minimum', /6 real players/.test(kickoffNotes({ type: 'league' })) && /tournaments need 8/.test(kickoffNotes({ type: 'league' })) && /8 real players/.test(kickoffNotes({ type: 'playoffs' })) && !/real players/.test(kickoffNotes({ type: 'friendly' })) && /5 to 10 minute/.test(kickoffNotes({ type: 'friendly' })));

// ----- the lineup post: suggestion note + bench + kick-off notes -----
await call(c, '/api/events/rsvp', { ids: [ev], status: 'maybe' });
const lb = posts.length;
const pub = await call(mgr, '/api/events/lineup', { id: ev, formation: '4-3-3', lineup: { 500: 'ST', 502: 'GK' }, publish: true, channel: '70001' });
const lp = posts.slice(lb).find((p) => /starting/.test(txt(p)));
t('lineup published long before the start is a suggestion with the check-in reminder', pub.s === 200 && /This is a suggested lineup/.test(txt(lp)) && /Check in 30 minutes before kick-off/.test(txt(lp)) && /will not be considered/.test(txt(lp)));
t('… with the bench (said yes or maybe, not starting) in the order they answered, and the kick-off notes', /BENCH/.test(txt(lp)) && /Player Two.*maybe/.test(txt(lp)) && !/Player Three.*maybe\n.*Player Three/.test(txt(lp)) && /10 minutes before the start/.test(txt(lp)));
const lb2 = posts.length;
await call(mgr, '/api/events/lineup', { id: ev, formation: '4-3-3', lineup: { 500: 'ST', 502: 'GK' }, publish: true, channel: '70001', final: true });
t('a lineup marked final is not called a suggestion', !/suggested lineup/.test(txt(posts.slice(lb2).find((p) => /starting/.test(txt(p))))));

done();
