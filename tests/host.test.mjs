// /host (bot/host.js) – schedule a League/Rush session or friendly in one command – and faces (bot/faces.js): a shipped
// Card Studio card beats a Discord picture beats the default, everywhere a person appears. Discord is stubbed.
import { env, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { parseWhen, hostBody, zoneChoices } from '../bot/host.js';
import { facesOf, playerFaces, defaultAvatar } from '../bot/faces.js';
import { zonedToUtc } from '../bot/events.js';
import { plainText, images } from '../bot/ui.js';

// ---------- when ----------
const FRI_2PM_NY = Date.parse('2026-10-16T18:00:00Z'); // Friday 16 Oct 2026, 14:00 in New York
const w = (s) => parseWhen(s, 'America/New_York', FRI_2PM_NY);
const is = (s, date, time) => { const r = w(s); return r.date === date && r.time === time; };
t('when: tonight 9pm / 9pm / tonight 9', is('tonight 9pm', '2026-10-16', '21:00') && is('9pm', '2026-10-16', '21:00') && is('tonight 9', '2026-10-16', '21:00'));
t('when: a time that already passed today → tomorrow', is('1pm', '2026-10-17', '13:00') && is('noon', '2026-10-17', '12:00'));
t('when: tomorrow 20:30, 24 h clock', is('tomorrow 20:30', '2026-10-17', '20:30'));
t('when: weekdays – later today, or next week once passed', is('fri 8:30pm', '2026-10-16', '20:30') && is('fri 1pm', '2026-10-23', '13:00') && is('next sunday 7:15 pm', '2026-10-18', '19:15'));
t('when: month + day either way round, rolling into next year once past', is('oct 20 9pm', '2026-10-20', '21:00') && is('20 oct 9pm', '2026-10-20', '21:00') && is('jan 3 8pm', '2027-01-03', '20:00'));
t('when: ISO date and "in 2h"', is('2026-10-20 21:00', '2026-10-20', '21:00') && is('in 2h', '2026-10-16', '16:00'));
t('when: no time / nonsense / a past ISO date → a helpful error', /What time/.test(w('sat').error) && /What time/.test(w('blah').error) && /already passed/.test(w('2026-10-01 21:00').error));
t('when: read in the host’s zone – 9pm London is 21:00 London', parseWhen('tomorrow 9pm', 'Europe/London', FRI_2PM_NY).time === '21:00'
  && zonedToUtc('2026-10-17', '21:00', 'Europe/London') === Date.parse('2026-10-17T20:00:00Z'));
t('time-zone autocomplete', zoneChoices('new y')[0].value === 'America/New_York' && zoneChoices('').length === 25);
const b = hostBody({ mode: 'rush', kind: 'friendly', opponent: 'Shortsquad' }, 'UTC', { date: '2026-10-20', time: '21:00' });
t('a Rush friendly: friendly type, titled, 5 players, 90 minutes', b.type === 'friendly' && b.title === 'Rush friendly vs Shortsquad' && b.needs.players === 5 && b.duration === 90 && b.notify);
t('a League session: league night, 11 players, 2 hours, weekly = 4 dates', ((x) => x.type === 'league' && !x.title && x.needs.players === 11 && x.duration === 120 && x.repeat === 3)(hostBody({ mode: 'league', kind: 'session', weekly: true }, 'UTC', { date: 'x', time: 'y' })));

// ---------- faces ----------
env.PUBLIC_URL = 'https://bot.example';
const now = Date.now();
sqlite.exec(`INSERT INTO users (id, name, avatar, first_at, last_at) VALUES ('801', 'Carded', 'https://cdn/u801.png', ${now}, ${now}), ('802', 'SiteOnly', 'https://cdn/u802.png', ${now}, ${now}), ('900', 'Boss', null, ${now}, ${now})`);
sqlite.exec("INSERT INTO guild_members (user_id, name, avatar, joined_at, roles) VALUES ('803', 'DiscordOnly', 'https://cdn/g803.png', '', '[]')");
sqlite.exec(`INSERT INTO card_requests (user_id, month, bg_id, pose_id, photo_key, status, result_key, published, created_at) VALUES
  ('801', '2026-09', 1, 1, 'p1', 'done', 'cards/old.png', 1, ${now - 9e5}), ('801', '2026-10', 1, 1, 'p2', 'done', 'cards/new.png', 1, ${now}),
  ('802', '2026-10', 1, 1, 'p3', 'done', 'cards/unshipped.png', 0, ${now}), ('802', '2026-08', 1, 1, 'p4', 'approved', null, 1, ${now})`);
const f = await facesOf(env, ['801', '802', '803', '804']);
t('faces: newest shipped card first', f.get('801') === 'https://bot.example/media/cards/new.png');
t('faces: a card not published yet doesn’t count → site picture', f.get('802') === 'https://cdn/u802.png');
t('faces: Discord picture from the member snapshot, then the default', f.get('803') === 'https://cdn/g803.png' && f.get('804') === defaultAvatar('804') && /embed\/avatars\/\d\.png$/.test(defaultAvatar('804')));
sqlite.exec(`INSERT INTO claims (user_id, player, player_name, status, at) VALUES ('803', 'pk803', 'GamerThree', 'approved', ${now})`);
sqlite.exec(`INSERT INTO card_requests (user_id, month, bg_id, pose_id, photo_key, status, result_key, published, created_at, target_player) VALUES ('900', '2026-10', 1, 1, 'p5', 'done', 'cards/forthree.png', 1, ${now}, 'pk803')`);
t('faces: a card the owner made for a claimed player belongs to that player’s member', (await facesOf(env, ['803'])).get('803') === 'https://bot.example/media/cards/forthree.png'
  && (await playerFaces(env, ['pk803', 'nobody'])).get('pk803') === 'https://bot.example/media/cards/forthree.png' && !(await playerFaces(env, ['nobody'])).has('nobody'));

// ---------- /host end to end ----------
env.DISCORD_BOT_TOKEN = 'bot';
env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), events: 'members', discordRsvp: 'members' });
const posts = [], edits = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (!url.startsWith('https://discord.com/api/v10')) return realFetch(url, init);
  const m = url.match(/\/channels\/(\w+)\/messages(?:\/(\w+))?$/);
  if (m && init.method === 'PATCH') { edits.push({ channel: m[1], msg: m[2], ...JSON.parse(init.body) }); return Response.json({}); }
  if (m) { posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: `m${posts.length}` }); }
  return Response.json({});
};
sqlite.exec(`INSERT INTO meta (key, value) VALUES ('server_tools', '{"pingRoles":{"match":"7001","rush":"7002"}}') ON CONFLICT (key) DO UPDATE SET value = excluded.value`);
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  return (await worker.fetch(new Request('https://bot.example/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} })).json();
}
const as = (id, roles = []) => ({ member: { user: { id, username: `u${id}` }, roles }, channel_id: '700100', token: 'tok' });
const host = (opts, who = as('900', ['mgr'])) => send({ type: 2, data: { name: 'host', options: Object.entries(opts).map(([name, value]) => ({ name, value })) }, ...who });

t('/host is managers only', /Only managers can host/.test(plainText((await host({ mode: 'league', kind: 'session', when: 'tomorrow 9pm', timezone: 'UTC' }, as('801'))).data)));
t('/host without a time zone (none in the profile either) asks for one', /Which time zone/.test(plainText((await host({ mode: 'league', kind: 'session', when: 'tomorrow 9pm' })).data)));
t('/host with a time it can’t read explains', /couldn’t read that time/.test(plainText((await host({ mode: 'league', kind: 'session', when: 'whenever', timezone: 'UTC' })).data)));

let r = await host({ mode: 'league', kind: 'session', when: 'tomorrow 9pm', timezone: 'America/New_York', notes: 'Lobby: Norex' });
const ev = sqlite.prepare("SELECT * FROM events WHERE type = 'league' ORDER BY id DESC").get();
const tomorrowNY = parseWhen('tomorrow 9pm', 'America/New_York').date;
t('/host creates the event at 9pm New York time', ev && ev.start === zonedToUtc(tomorrowNY, '21:00', 'America/New_York') && ev.tz === 'America/New_York' && ev.notes === 'Lobby: Norex' && JSON.parse(ev.needs).players === 11);
t('/host confirms privately with a Discord timestamp (everyone sees their own time)', (r.data.flags & 64) === 64 && new RegExp(`<t:${ev.start / 1000}:F>`).test(plainText(r.data)) && /own time zone/.test(plainText(r.data)));
const post = posts.at(-1);
t('/host posts in this channel, pinging the Match night role, with sign-up buttons', post.channel === '700100' && post.components[0].content === '<@&7001>' && post.allowed_mentions.roles[0] === '7001'
  && /norex:ev:\d+:yes/.test(JSON.stringify(post)) && sqlite.prepare('SELECT discord_msg FROM events WHERE id = ?').get(ev.id).discord_msg === `m${posts.length}`);

sqlite.exec(`INSERT INTO profiles (user_id, tz, updated) VALUES ('900', 'Europe/London', ${now}) ON CONFLICT (user_id) DO UPDATE SET tz = excluded.tz`);
await host({ mode: 'rush', kind: 'friendly', when: 'tomorrow 8pm', opponent: 'Shortsquad', weekly: true });
const rush = sqlite.prepare("SELECT * FROM events WHERE title = 'Rush friendly vs Shortsquad' ORDER BY id").all();
t('/host uses the profile’s time zone, Rush ping role, weekly ×4', rush.length === 4 && rush[0].tz === 'Europe/London' && posts.at(-1).components[0].content === '<@&7002>'
  && rush[1].start - rush[0].start >= 6.9 * 864e5);
await host({ mode: 'league', kind: 'session', when: 'tomorrow 10pm', timezone: 'UTC', silent: true });
t('/host silent: posted with no ping', posts.at(-1).components[0].type === 17 && posts.at(-1).allowed_mentions.parse.length === 0);

// ---------- sign-ups show faces ----------
const btn = (id, who) => send({ type: 3, data: { custom_id: `norex:ev:${ev.id}:yes` }, ...as(who) });
await btn(ev.id, '801'); await btn(ev.id, '803');
await new Promise((res) => setTimeout(res, 50));
const live = edits.filter((e) => e.msg === sqlite.prepare('SELECT discord_msg FROM events WHERE id = ?').get(ev.id).discord_msg).at(-1);
t('the live post shows who’s in, each with their face (card first)', !!live && images(live).includes('https://bot.example/media/cards/new.png') && images(live).includes('https://bot.example/media/cards/forthree.png') && /✅ 2/.test(plainText(live)));
await tt('timezone autocomplete is answered', async () => (await send({ type: 4, data: { name: 'host', options: [{ name: 'timezone', value: 'london', focused: true }] }, ...as('900', ['mgr']) })).data.choices[0].value === 'Europe/London');

globalThis.fetch = realFetch;
done();
