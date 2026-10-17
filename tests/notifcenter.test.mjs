// Notification Center (bot/notifcenter.js): owner-only wording, route, lock and timing for selected notifications, test-send to the owner only.
import { call, env, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';
import { notify } from '../bot/notify.js';
import { remindersCron } from '../bot/reminders.js';
import { notifTiming } from '../bot/notifcenter.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ notifications: 'members', reminders: 'members', feedback: 'members' });
const owner = await login('111', [], 'Founder');
const mgr = await login('600', ['mgr'], 'Coach');
const mem = await login('500', [], 'Player');
const mem2 = await login('501', [], 'Player Two');
await login('502', [], 'Muter');
const rows = (id, type = 'award') => sqlite.prepare('SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY id').all(id, type);
const save = (b) => call(owner, '/api/admin/notif', b);

t('managers and members are refused', (await call(mgr, '/api/admin/notif')).s === 403 && (await call(mem, '/api/admin/notif')).s === 403 && (await call(mem, '/api/admin/notif', { key: 'award.won', enabled: false })).s === 403);
t('manager cannot test-send either', (await call(mgr, '/api/admin/notif/test', { key: 'award.won' })).s === 403);
const list = (await call(owner, '/api/admin/notif')).d;
t('owner sees the registry with defaults', list.items.length >= 8 && list.items.every((i) => i.title && i.group));

const send = (ids, extra = {}) => notify(env, ids, { type: 'award', nkey: 'award.won', vars: { awards: '⭐ MOTM', week: '42' }, title: 'You won ⭐ MOTM – week 42', ...extra });
await send(['500']);
t('no saved settings → wording exactly as built', rows('500')[0]?.title === 'You won ⭐ MOTM – week 42');

await save({ key: 'award.won', title: 'GG {awards}! Week {week}', body: 'Proud of you, {awards}.' });
await send(['501']);
t('owner template is rendered with the placeholders', rows('501')[0]?.title === 'GG ⭐ MOTM! Week 42' && rows('501')[0]?.body === 'Proud of you, ⭐ MOTM.');

await save({ key: 'award.won', enabled: false });
t('switched off → nothing sent', (await send(['500'], { title: 'x2' })) === 0 && rows('500').length === 1);
await save({ key: 'award.won', enabled: true, route: 'dm' });
await send(['500']);
t('route dm → bell row queued for a Discord DM even though award defaults to site', rows('500').at(-1).dm === 'queued');
await save({ key: 'award.won', route: 'site' });
await send(['501'], { title: 'y' });
t('route site → bell only', rows('501').at(-1).dm === null);

// a member who muted the type
sqlite.prepare("INSERT INTO notify_prefs (user_id, prefs, updated) VALUES ('502', ?, 1) ON CONFLICT (user_id) DO UPDATE SET prefs = excluded.prefs").run(JSON.stringify({ award: 'off' }));
await save({ key: 'award.won', route: 'default', locked: false });
await send(['502'], { title: 'z1' });
const before = rows('502').length;
await save({ key: 'award.won', locked: true });
await send(['502'], { title: 'z2' });
t('locked → a muted member still gets it', before === 0 && rows('502').length === 1);

// test-send goes only to the owner
const n0 = sqlite.prepare('SELECT COUNT(*) AS n FROM notifications').get().n;
const res = await call(owner, '/api/admin/notif/test', { key: 'award.won', to: ['500', '501'], userId: '500' });
const test = sqlite.prepare("SELECT * FROM notifications WHERE type = 'test' ORDER BY id DESC").all();
t('test-send reaches the owner only, ignoring any recipient in the request', res.d.ok && test.length === 1 && test[0].user_id === '111' && /^\[Test\] /.test(test[0].title) && sqlite.prepare('SELECT COUNT(*) AS n FROM notifications').get().n === n0 + 1);

t('unknown key and bad route are rejected', (await save({ key: 'nope' })).s === 400 && (await save({ key: 'award.won', route: 'everyone' })).s === 400);

// timing
t('timing default', (await notifTiming(env, 'event.start30', 'mins')) === 30);
t('timing out of range is rejected', (await save({ key: 'event.start30', timing: { mins: 500 } })).s === 400);
await save({ key: 'event.start30', timing: { mins: 45 } });
t('timing saved', (await notifTiming(env, 'event.start30', 'mins')) === 45);

// reminder window now owner-set: 14:00 UTC is inside 9-21, outside 15-21
await save({ key: 'remind.waiting', timing: { from: 15, to: 21 } });
const NOW = Date.UTC(2026, 9, 13, 14, 0);
sqlite.prepare('UPDATE users SET last_at = ?').run(NOW - 3600e3);
sqlite.prepare("INSERT INTO feedback (from_id, from_name, to_id, to_name, kind, body, at, reaction) VALUES ('900', 'X', '501', 'N', 'tip', 'a long enough body', ?, NULL)").run(NOW - 30 * 3600e3);
const site = async () => ({ matches: [] });
t('reminder window moved by the owner', (await remindersCron(env, site, NOW)).waiting === 0);
await save({ key: 'remind.waiting', reset: true });
t('reset → back to the default window', (await remindersCron(env, site, NOW)).waiting === 1);
t('a title that drops every placeholder is rejected', (await save({ key: 'event.cancelled', title: 'Session cancelled' })).s === 400);
t('reminder window must be from < to', (await save({ key: 'remind.waiting', timing: { from: 22, to: 21 } })).s === 400);
await save({ key: 'award.won', route: 'dm', locked: false });
sqlite.prepare('UPDATE notifications SET at = 1').run(); // outside the 15-minute repeat window
const k = rows('502').length;
sqlite.prepare("UPDATE notify_prefs SET prefs = ? WHERE user_id = '502'").run(JSON.stringify({ award: 'off' }));
await send(['502'], { title: 'q' });
t('a route does not override a member mute unless locked', rows('502').length === k);
done();
