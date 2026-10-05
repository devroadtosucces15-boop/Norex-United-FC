// Notification centre (P7.1) + club & privacy requests (P5.6).
import { call, env, login, siteJson, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import { deliverDMs, notifyCron, overridesKey } from '../bot/notify.js';

const owner = await login('111', [], 'Founder 👑');
const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500', [], 'Player <b>One</b>');
const member2 = await login('501', [], 'Player Two');
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const count = async (tok) => (await call(tok, '/api/notify/count')).d;
const list = async (tok) => (await call(tok, '/api/notify')).d;

// Fake Discord REST for DMs: user 777 has DMs closed.
const dms = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.endsWith('/users/@me/channels')) { const { recipient_id: id } = JSON.parse(init.body); return Response.json({ id: `dm-${id}` }); }
  const m = u.match(/\/channels\/dm-(\d+)\/messages$/);
  if (m) {
    if (m[1] === '501') return Response.json({ code: 50007, message: 'Cannot send messages to this user' }, { status: 403 });
    dms.push({ to: m[1], ...JSON.parse(init.body) });
    return Response.json({ id: 'msg' });
  }
  return realFetch(url, init);
};

// ----- flags -----
setFlags({ notifications: 'owner', requests: 'owner' });
t('notifications hidden while owner-only (member 404)', (await call(member, '/api/notify')).s === 404);
t('owner can open notifications', (await call(owner, '/api/notify')).s === 200);
t('requests hidden while owner-only (public form 404)', (await call(null, '/api/requests/public', { subject: 'x_y' })).s === 404);
const pl = siteJson('players').filter((x) => x.home);
await call(member, '/api/claim', { player: pl[0].k }); // flag is owner-only for the member → nothing stored for them
setFlags({ notifications: 'members', requests: 'public' });
t('guest gets 401 on /api/notify', (await call(null, '/api/notify')).s === 401);

// ----- triggers: claims -----
await call(member, '/api/claim', { player: pl[1].k });
let m = await list(mgr);
t('manager gets a "new player claim" to-do', m.items.some((n) => n.type === 'queue' && n.title.includes('New player claim') && n.link === 'members.html#manager'));
t('manager to-dos are site-only by default', m.items.find((n) => n.type === 'queue').dm === undefined);
t('the member who acted gets nothing', (await count(member)).unread === 0);
t('owner (also a manager) gets the to-do too', (await list(owner)).items.some((n) => n.title.includes('New player claim')));
await call(mgr, '/api/admin/claims', { user: '500', action: 'approve' });
let me = await list(member);
const claimN = me.items.find((n) => n.type === 'claim');
t('member hears the claim was approved', claimN?.title.includes('approved') && claimN.link === `players/${pl[1].k}.html`);
t('claim decisions are DMed by default (sent right after the request; no bot token here → skipped)', claimN.dm === 'skipped');
t('XSS stripped from names in titles', !m.items.some((n) => n.title.includes('<')));
t('count endpoint: 1 unread', (await count(member)).unread === 1);
t('settings list the member types, not manager to-dos', me.types.some((x) => x.k === 'claim') && !me.types.some((x) => x.k === 'queue') && !me.types.some((x) => x.k === 'test'));
t('manager settings include manager to-dos', m.types.some((x) => x.k === 'queue'));

// ----- DM delivery -----
let r = await deliverDMs(env);
t('no bot token → nothing left queued', !r.sent && !r.skipped);
t('dmReady false without the bot token', (await list(member)).dmReady === false);
env.DISCORD_BOT_TOKEN = 'bot-token';
r = await call(member, '/api/notify/test', {});
t('test notification → DM sent', r.s === 200 && r.d.test.sent === 1 && dms.at(-1).to === '500');
t('DM embed: title, site link button, no pings', dms.at(-1).embeds[0].title.includes('Test notification') && dms.at(-1).components[0].components[0].url.endsWith('members.html#alerts') && dms.at(-1).allowed_mentions.parse.length === 0);
r = await call(member2, '/api/notify/test', {});
t('closed DMs → failed + dmBlocked hint', r.d.test.failed === 1 && r.d.dmBlocked === true);
await call(member, '/api/notify/test', {}); await call(member, '/api/notify/test', {});
t('test DMs rate-limited (3/hour)', (await call(member, '/api/notify/test', {})).s === 429);

// ----- settings -----
t('unknown type rejected', (await call(member, '/api/notify/prefs', { prefs: { nope: 'dm' } })).s === 400);
t('bad mode rejected', (await call(member, '/api/notify/prefs', { prefs: { claim: 'loud' } })).s === 400);
t('announcements cannot be muted', (await call(member, '/api/notify/prefs', { prefs: { announce: 'off' } })).s === 400);
r = await call(member, '/api/notify/prefs', { prefs: { claim: 'off', rush: 'dm' } });
t('prefs saved + returned', r.s === 200 && r.d.types.find((x) => x.k === 'claim').mode === 'off' && r.d.types.find((x) => x.k === 'rush').mode === 'dm');
const before = (await list(member)).items.length;
await call(mgr, '/api/admin/claims', { user: '500', action: 'unlink' });
t('muted type → no notification', (await list(member)).items.length === before);

// ----- read -----
r = await call(member, '/api/notify/read', { ids: [claimN.id] });
t('mark one read', r.d.items.find((n) => n.id === claimN.id).read === true);
t('cannot mark someone else’s notification', (await call(member2, '/api/notify/read', { ids: [claimN.id] })).s === 200 && (await list(member)).items.find((n) => n.id === claimN.id).read);
r = await call(member, '/api/notify/read', { all: true });
t('mark all read → 0 unread', r.d.unread === 0);
t('empty read request rejected', (await call(member, '/api/notify/read', {})).s === 400);

// ----- announcements + acknowledge -----
t('member cannot announce', (await call(member, '/api/notify/announce', { title: 'Hi all' })).s === 403);
t('javascript: link rejected', (await call(mgr, '/api/notify/announce', { title: 'Rules', link: 'javascript:alert(1)' })).s === 400);
t('protocol-relative link rejected', (await call(mgr, '/api/notify/announce', { title: 'Rules', link: '//evil.com/x.html' })).s === 400);
r = await call(mgr, '/api/notify/announce', { title: 'New match-night rules <script>', body: 'Be on time.\nMics on.', link: 'about.html', ack: true });
t('manager announces to every member', r.s === 200 && r.d.sent >= 4);
let c = await count(member);
t('must-acknowledge shows in count.ack (banner)', c.ack?.title.startsWith('New match-night rules') && !c.ack.title.includes('<'));
me = await list(member);
const ann = me.items.find((n) => n.type === 'announce');
t('announcement pinned first while unacknowledged', me.items[0].id === ann.id && ann.ack === 'due' && ann.body.includes('\n'));
t('other members cannot acknowledge it', (await call(member2, '/api/notify/ack', { id: ann.id })).s === 409);
r = await call(member, '/api/notify/ack', { id: ann.id });
t('acknowledge → banner gone + marked read', r.s === 200 && r.d.ack === null && r.d.items.find((n) => n.id === ann.id).ack === 'done' && r.d.items.find((n) => n.id === ann.id).read);
t('acknowledge twice → 409', (await call(member, '/api/notify/ack', { id: ann.id })).s === 409);
r = await call(mgr, '/api/notify/announce', { title: 'Managers only', audience: 'managers' });
t('managers-only announcement skips members', !(await list(member)).items.some((n) => n.title === 'Managers only') && (await list(owner)).items.some((n) => n.title === 'Managers only'));

// ----- cron: daily DM reminders until acknowledged (max 3) -----
const { sqlite } = await import('./mock.mjs');
sqlite.prepare("UPDATE notifications SET dm_at = ?, at = ? WHERE type = 'announce'").run(Date.now() - 2 * 864e5, Date.now() - 2 * 864e5);
dms.length = 0;
r = await notifyCron(env);
const remindedTo = new Set(dms.filter((x) => x.embeds[0].title.includes('Reminder')).map((x) => x.to));
t('cron re-DMs unacknowledged rules', r.reminded >= 1 && remindedTo.has('600') && remindedTo.has('111'));
t('no reminder for someone who acknowledged', !remindedTo.has('500'));
for (let i = 0; i < 4; i++) { sqlite.prepare("UPDATE notifications SET dm_at = ? WHERE type = 'announce'").run(Date.now() - 2 * 864e5); await notifyCron(env); }
t('reminders stop after 3', sqlite.prepare("SELECT MAX(reminders) AS n FROM notifications").get().n === 3);

// ----- triggers: scouting + trials, Rush -----
setFlags({ scouting: 'members', trials: 'public', rushLog: 'members' });
await call(member, '/api/scout', { ea: 'Hot_Prospect', platform: 'PS5', positions: ['ST'], note: 'Scores every game' });
t('managers get the scouting tip', (await list(mgr)).items.some((n) => n.title.includes('New scouting tip: Hot_Prospect')));
const tip = (await call(mgr, '/api/trials')).d.trials.find((x) => x.ea === 'Hot_Prospect');
await call(mgr, '/api/trials/update', { id: tip.id, status: 'trialling' });
t('recommender hears their tip is on trial', (await list(member)).items.some((n) => n.type === 'trial' && n.title.includes('Hot_Prospect is now on trial')));
await W('/api/trials/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '9.9.9.9' }, body: JSON.stringify({ ea: 'Form_Guy', platform: 'Xbox', positions: ['CB'], discord: 'formguy' }) });
t('managers get new public applications', (await list(mgr)).items.some((n) => n.title.startsWith('New trial application: Form_Guy')));
const today = new Date().toISOString().slice(0, 10);
r = await call(member, '/api/rush', { date: today, opponent: 'Rush Rivals', gf: 3, ga: 1, players: [{ k: pl[0].k, g: 2, a: 0 }] });
t('managers get pending Rush results', (await list(mgr)).items.some((n) => n.title.includes('Rush result to confirm: 3–1 vs Rush Rivals')));
await call(mgr, '/api/rush/decide', { id: r.d.id, action: 'confirm' });
t('submitter hears the Rush result was confirmed', (await list(member)).items.some((n) => n.type === 'rush' && n.title.includes('confirmed')));

// ----- BE4: trial stage changes (opt-in DMs for the player and the Dugout) -----
const stagePlayer = await login('502', [], 'Stage Player');
sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at) VALUES ('502', ?, 'Stage Player', 'approved', ?)").run(pl[1].k, Date.now());
await call(mgr, '/api/trials/add', { ea: 'Stage_Lad', platform: 'PS5', positions: ['CM'], status: 'applied' });
const stageCard = (await call(mgr, '/api/trials')).d.trials.find((x) => x.ea === 'Stage_Lad');
await call(mgr, '/api/trials/update', { id: stageCard.id, player: pl[1].k });
const stageItems = async (tok) => (await list(tok)).items.filter((n) => n.type === 'trialstage');
t('BE4 default off: booking a trial sends the player nothing', (await stageItems(stagePlayer)).length === 0);
await call(mgr, '/api/trials/update', { id: stageCard.id, status: 'booked' });
t('BE4 default off: still nothing after a stage change', (await stageItems(stagePlayer)).length === 0);
t('BE4 default off: managers see no Dugout stage DM either', (await stageItems(mgr)).length === 0);
await call(stagePlayer, '/api/notify/prefs', { prefs: { trialstage: 'dm' } });
await call(mgr, '/api/trials/update', { id: stageCard.id, status: 'played' });
t('BE4 opt-in: player hears the stage change', (await stageItems(stagePlayer)).some((n) => n.title === 'Trial update: Stage_Lad has played a trial session'));
await deliverDMs(env);
t('BE4 opt-in dm: the player gets a Discord DM', dms.some((x) => x.to === '502' && x.embeds[0].title.includes('Trial update: Stage_Lad')));
await call(stagePlayer, '/api/notify/prefs', { prefs: { trialstage: 'off' } });
const beforeOff = (await stageItems(stagePlayer)).length;
await call(mgr, '/api/trials/update', { id: stageCard.id, status: 'trialling' });
t("BE4 respects the player switching it off", (await stageItems(stagePlayer)).length === beforeOff);
await call(mgr, '/api/notify/prefs', { prefs: { trialstage: 'site' } });
await call(owner, '/api/trials/update', { id: stageCard.id, status: 'signed' });
t('BE4 Dugout: an opted-in manager sees the stage change', (await stageItems(mgr)).some((n) => n.title === 'Dugout: Trial update: Stage_Lad signed for NOREX ✍️'));
t('BE4 Dugout: the acting manager is not told about their own change', (await stageItems(mgr)).length === 1);
await call(mgr, '/api/notify/prefs', { prefs: { trialstage: 'off' } });
t('BE4 is listed in the settings with its default', (await list(stagePlayer)).types.find((x) => x.k === 'trialstage')?.mode === 'off');

// ----- P5.6 requests -----
const home = siteJson('clubs').find((x) => x.t === 'home');
const other = siteJson('clubs').find((x) => x.t === 'discovered');
t('members only for club requests (guest 401)', (await call(null, '/api/requests', { kind: 'club', subject: 'X FC' })).s === 401);
t('already tracked club → 409', (await call(member, '/api/requests', { kind: 'club', subject: home.n })).s === 409);
r = await call(member, '/api/requests', { kind: 'club', subject: other.n.toUpperCase(), note: 'I play there <b>too</b>' });
const clubReq = r.d.requests?.[0];
t('club request stored with the known club ID', r.s === 200 && clubReq.status === 'pending' && clubReq.clubId === String(other.id) && !clubReq.note.includes('<'));
t('duplicate club request → 409', (await call(member2, '/api/requests', { kind: 'club', subject: other.n })).s === 409);
r = await call(member2, '/api/requests', { kind: 'club', subject: 'Brand New FC' });
const byName = r.d.requests[0];
t('unknown club accepted without ID', r.s === 200 && !byName.clubId);
t('managers get request to-dos', (await list(mgr)).items.some((n) => n.title.includes('Track club – Brand New FC')));
const pub = (body, ip = '5.5.5.5') => W('/api/requests/public', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) }).then(async (x) => ({ s: x.status, d: await x.json() }));
t('guest hide request needs a Discord username', (await pub({ subject: 'Shy_Guy' })).s === 400);
t('guest hide request accepted', (await pub({ subject: 'Shy_Guy', contact: '@shyguy', note: 'please' })).s === 200);
t('honeypot silently dropped', (await pub({ subject: 'Bot_Spam', contact: 'bot', website: 'x' })).s === 200);
t('duplicate hide → 409', (await pub({ subject: 'shy_guy', contact: 'shyguy' }, '6.6.6.6')).s === 409);
await pub({ subject: 'Another_One', contact: 'ano' });
await pub({ subject: 'Third_One', contact: 'three' });
t('4th public request from one IP → 429', (await pub({ subject: 'Fourth_One', contact: 'four' })).s === 429);
t('member cannot see the admin list', (await call(member, '/api/admin/requests')).s === 403);
let a = (await call(mgr, '/api/admin/requests')).d.requests;
const hide = a.find((x) => x.subject === 'Shy_Guy');
t('admin list: guest request shows the Discord contact', hide.guest && hide.contact === 'shyguy' && !a.some((x) => x.subject === 'Bot_Spam'));
t('bad club ID rejected on approve', (await call(mgr, '/api/admin/requests/decide', { id: byName.id, action: 'approve', clubId: '12ab' })).s === 400);
await call(mgr, '/api/admin/requests/decide', { id: hide.id, action: 'approve' });
await call(mgr, '/api/admin/requests/decide', { id: clubReq.id, action: 'approve' });
a = (await call(mgr, '/api/admin/requests/decide', { id: byName.id, action: 'reject', reason: 'Not a real club' })).d.requests;
t('decided requests listed with who decided', a.find((x) => x.id === byName.id).status === 'rejected' && a.find((x) => x.id === byName.id).decidedBy === 'Coach');
t('cannot approve twice', (await call(mgr, '/api/admin/requests/decide', { id: hide.id, action: 'approve' })).s === 409);
t('requester hears the decision', (await list(member)).items.some((n) => n.type === 'request' && n.title.includes(`Approved: Track ${other.n.toUpperCase()}`)));
t('rejection reason reaches the requester', (await list(member2)).items.some((n) => n.type === 'request' && n.body?.includes('Not a real club')));

// ----- overrides for the site build -----
const key = await overridesKey(env.DISCORD_CLIENT_SECRET);
const ov = (k = key, body) => W('/api/overrides', { method: body ? 'POST' : 'GET', headers: { 'X-Norex-Key': k, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(async (x) => ({ s: x.status, d: await x.json() }));
t('overrides need the build key', (await ov('wrong')).s === 403 && (await W('/api/overrides')).status === 403);
let o = await ov();
t('overrides: approved hide + club', o.d.hiddenPlayers.includes('Shy_Guy') && o.d.clubs.some((x) => x.id === String(other.id)) && !o.d.clubs.some((x) => x.name === 'Brand New FC'));
await call(member2, '/api/requests', { kind: 'club', subject: 'Name Only FC' });
const nameOnly = (await call(mgr, '/api/admin/requests')).d.requests.find((x) => x.subject === 'Name Only FC');
await call(mgr, '/api/admin/requests/decide', { id: nameOnly.id, action: 'approve' });
o = await ov(key, { resolved: [{ req: nameOnly.id, clubId: '424242' }] });
t('build reports the EA ID it found for a name-only club', o.d.clubs.find((x) => x.name === 'Name Only FC')?.id === '424242');
await call(mgr, '/api/admin/requests/decide', { id: hide.id, action: 'undo' });
o = await ov();
t('undo removes the player from the overrides', !o.d.hiddenPlayers.includes('Shy_Guy'));

// build side (scripts/lib.mjs) derives the same key with node:crypto and reads the list
const { loadOverrides } = await import('../scripts/lib.mjs');
const { config } = await import('./mock.mjs');
const f0 = globalThis.fetch;
globalThis.fetch = (url, init) => (String(url).startsWith(config.members.api) ? W(String(url).slice(config.members.api.length), init) : f0(url, init));
process.env.DISCORD_CLIENT_SECRET = 'shh';
o = await loadOverrides(config);
t('loadOverrides(): build key matches the Worker', o.ok && o.clubs.some((x) => x.id === String(other.id)));
process.env.DISCORD_CLIENT_SECRET = 'wrong';
t('loadOverrides(): wrong secret → empty, build carries on', (await loadOverrides(config)).ok === false);
globalThis.fetch = f0;

// ----- site: About page + bell assets -----
const fs = await import('node:fs');
const about = fs.readFileSync(new URL('../site/about.html', import.meta.url), 'utf8');
t('About page has the request forms behind the flag', about.includes('id="request-forms" data-flag="requests" hidden'));
t('notify.js + notify.css shipped', fs.existsSync(new URL('../site/assets/notify.js', import.meta.url)) && fs.existsSync(new URL('../site/assets/notify.css', import.meta.url)));
done();
