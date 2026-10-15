// Feature flags (P0.7): levels off | owner | managers | members | public, enforced by the Worker.
import fs from 'node:fs';
import { ROOT, call, config, env, login, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import { FLAG_LEVELS, featuresFor, flagOn, flags } from '../bot/roles.js';
import { settingsKey } from '../bot/settings.js';

const who = { guest: null, member: { role: 'member' }, claimed: { role: 'claimed' }, manager: { role: 'manager' }, owner: { role: 'owner' } };
const expect = { off: [], owner: ['owner'], managers: ['manager', 'owner'], members: ['member', 'claimed', 'manager', 'owner'], public: Object.keys(who) };
const e = (f) => ({ FEATURES: JSON.stringify(f) });
for (const lvl of FLAG_LEVELS) {
  const seen = Object.entries(who).filter(([, u]) => flagOn(e({ x: lvl }), u, 'x')).map(([k]) => k);
  t(`level ${lvl} → ${seen.join(', ') || 'nobody'}`, seen.join() === expect[lvl].join());
}
t('unknown flag → off', !flagOn(e({}), who.owner, 'nope'));
t('invalid level → off', flags(e({ x: 'everyone' })).x === 'off' && !flagOn(e({ x: 'everyone' }), who.owner, 'x'));
t('broken FEATURES JSON → all off, no crash', Object.keys(flags({ FEATURES: '{oops' })).length === 0);
t('missing FEATURES → all off', Object.keys(flags({})).length === 0);
t('featuresFor lists only unlocked', featuresFor(e({ a: 'owner', b: 'members', c: 'off' }), who.member).join() === 'b');
t('config.json levels are all valid', Object.values(config.features ?? {}).every((v) => FLAG_LEVELS.includes(v)));

// Through the API: /api/me lists features, gated routes 404, owner sees the flag table.
const owner = await login('111');
const mgr = await login('600', ['mgr']);
const member = await login('500');
env.FEATURES = JSON.stringify({ rushLog: 'owner', demo: 'managers' });
t('/api/me features per role', (await call(owner, '/api/me')).d.user.features.join() === 'rushLog,demo' && (await call(mgr, '/api/me')).d.user.features.join() === 'demo' && (await call(member, '/api/me')).d.user.features.length === 0);
t('rushLog=owner: member → 404', (await call(member, '/api/rush/queue')).s === 404);
t('rushLog=owner: manager → 404', (await call(mgr, '/api/rush/queue')).s === 404);
t('rushLog=owner: owner → 200', (await call(owner, '/api/rush/queue')).s === 200);
t('public Rush list stays public', (await call(null, '/api/rush')).s === 200);
env.FEATURES = JSON.stringify({ rushLog: 'off' });
t('rushLog=off: owner → 404', (await call(owner, '/api/rush/queue')).s === 404);
env.FEATURES = JSON.stringify({ rushLog: 'members' });
t('rushLog=members: member → 200', (await call(member, '/api/rush/queue')).s === 200);
t('owner overview has the flag table', (await call(owner, '/api/admin/overview')).d.flags?.rushLog === 'members');
t('manager overview has no flag table', (await call(mgr, '/api/admin/overview')).d.flags === undefined);
// ----- P7.5 bot personalisation -----
t('bot settings: manager forbidden', (await call(mgr, '/api/bot/settings')).s === 403);
t('bot settings: owner sees defaults', (await call(owner, '/api/bot/settings')).d.autoPosts.results === true);
const saved = await call(owner, '/api/bot/settings', { resultChannel: '12345678901', pingRole: '22222', color: '#ff0000', emoji: '🔥', autoPosts: { results: true, reminders: false, awards: true } });
t('bot settings: save + read back', saved.d.resultChannel === '12345678901' && saved.d.color === 'ff0000' && saved.d.emoji === '🔥' && saved.d.autoPosts.reminders === false);
t('bot settings: rejects a non-snowflake channel', (await call(owner, '/api/bot/settings', { resultChannel: 'not-an-id' })).s === 400);
const bkey = await settingsKey(env.DISCORD_CLIENT_SECRET);
const pub = await W('/api/bot/settings/public', { headers: { 'X-Norex-Key': bkey } }).then(async (r) => ({ s: r.status, d: await r.json() }));
t('bot settings: public keyed endpoint reflects saved settings', pub.s === 200 && pub.d.resultChannel === '12345678901');
t('bot settings: public endpoint needs the key', (await W('/api/bot/settings/public')).status === 403);
// QA1: FEATURES/STREAMS must go under [vars] – appended after ensure-resources' [[d1_databases]] they were silently ignored
const deployStep = fs.readFileSync(ROOT + '.github/workflows/bot.yml', 'utf8').split('\n').find((l) => l.includes('FEATURES') && l.includes('run:')) ?? '';
t('bot.yml writes flags under [vars], not at the end of wrangler.toml', deployStep.includes('[vars]') && !deployStep.includes('appendFileSync'));

// ----- BE5: live D1 flag overrides (Boardroom 🚩 Flags tab) -----
env.FEATURES = JSON.stringify({ rushLog: 'owner', demo: 'members' });
t('flags.manage: manager forbidden', (await call(mgr, '/api/admin/flags', { name: 'rushLog', level: 'public' })).s === 403);
t('flags.manage: unknown flag rejected', (await call(owner, '/api/admin/flags', { name: 'nope', level: 'public' })).s === 404);
t('flags.manage: bad level rejected', (await call(owner, '/api/admin/flags', { name: 'rushLog', level: 'sometimes' })).s === 400);
const setRes = await call(owner, '/api/admin/flags', { name: 'rushLog', level: 'public' });
t('flags.manage: owner override takes effect in the response', setRes.s === 200 && setRes.d.flags.rushLog === 'public');
t('override is live on the very next request – member can now reach rushLog', (await call(member, '/api/rush/queue')).s === 200);
t('override is committed to D1, survives past the FEATURES var', (await call(owner, '/api/admin/overview')).d.flags.rushLog === 'public');
const afterOverride = await call(owner, '/api/admin/overview');
t('overview still reports canEditFlags for owner', afterOverride.d.canEditFlags === true);
t('audit log recorded the flag change', (await call(owner, '/api/admin/overview')).d.activity.some((a) => a.type === 'flag-change' && a.detail === 'rushLog → public'));
const resetRes = await call(owner, '/api/admin/flags/reset', { name: 'rushLog' });
t('flags.manage: reset restores the committed level', resetRes.s === 200 && resetRes.d.flags.rushLog === 'owner');
t('after reset, member is locked out again', (await call(member, '/api/rush/queue')).s === 404);
t('flags.manage: reset on unknown flag 404s', (await call(owner, '/api/admin/flags/reset', { name: 'nope' })).s === 404);
env.FEATURES = JSON.stringify({ rushLog: 'members' });

// ----- BE5: preview-as-role (x-view-as header) -----
const viewAs = async (tok, role) => { const r = await W('/api/me', { headers: { Authorization: 'Bearer ' + tok, 'x-view-as': role } }); return { s: r.status, d: await r.json().catch(() => null) }; };
t('owner previewing as member gets a member-shaped /api/me', (await viewAs(owner, 'member')).d.user.role === 'member');
t('preview response exposes the real role too', (await viewAs(owner, 'member')).d.user.realRole === 'owner');
t('manager previewing as guest 403s on /api/me – that route itself is member-gated, by design', (await viewAs(mgr, 'guest')).s === 403);
t('member cannot use x-view-as to escalate – stays a member', (await viewAs(member, 'owner')).d.user.role === 'member');
t('member gets no realRole/viewAsOptions – preview is manager+ only', (await viewAs(member, 'owner')).d.user.realRole === undefined);
t('owner sees every role in viewAsOptions', (await call(owner, '/api/me')).d.user.viewAsOptions.join() === 'guest,member,claimed,manager,owner');
t('manager is capped at manager in viewAsOptions', (await call(mgr, '/api/me')).d.user.viewAsOptions.join() === 'guest,member,claimed,manager');
t('member gets no viewAsOptions at all', (await call(member, '/api/me')).d.user.viewAsOptions === undefined);

// ----- BE6: health dashboard (Cloudflare Analytics + GitHub Actions) -----
t('health.view: manager forbidden', (await call(mgr, '/api/admin/health')).s === 403);
const health = await call(owner, '/api/admin/health');
t('health.view: owner allowed', health.s === 200);
t('health degrades gracefully with no analytics token in this env', health.d.analytics.ready === false && /token/.test(health.d.analytics.error));
t('GitHub Actions status degrades gracefully with no GITHUB_REPO in this env', health.d.actions.ready === false && /GITHUB_REPO/.test(health.d.actions.error));
// ----- board 09 front end: the Boardroom (flag boardroom, owner; tab only for flags.manage) -----
const brJs = fs.readFileSync(ROOT + 'web/boardroom.js', 'utf8');
const appJs9 = fs.readFileSync(ROOT + 'web/app.js', 'utf8');
t('board 09: boardroom flag ships at owner', config.features.boardroom === 'owner');
t('board 09: Boardroom sub-tab needs the flag and flag-edit rights, loads assets/boardroom.js', appJs9.includes("const boardroom = flagOn('boardroom', baseRole) && A.canEditFlags") && appJs9.includes("boardroom ? [['boardroom', '👑 Boardroom']]") && appJs9.includes('assets/boardroom.js'));
t('board 09: one 5-stop slider per flag, live edit + reset + undo on the existing routes', brJs.includes("const LEVELS = ['off', 'owner', 'managers', 'members', 'public']") && brJs.includes("'/api/admin/flags'") && brJs.includes("'/api/admin/flags/reset'") && brJs.includes('B.undo.pop()') && brJs.includes("d.br === 'undo' && !B.busy"));
t('board 09: LEVELS match bot/roles.js FLAG_LEVELS', JSON.stringify(FLAG_LEVELS) === JSON.stringify(['off', 'owner', 'managers', 'members', 'public']));
t('board 09: health, announcement, induction and requests reuse existing routes; sends ask first', ["'/api/admin/health'", "'/api/notify/announce'", "'/api/hof'", 'ctx.requests(rq)'].every((x) => brJs.includes(x)) && brJs.includes("title: 'Send announcement?'") && brJs.includes('title: `Induct ${pl.n}?`'));
t('board 09: preview-as pills use BE5 ?previewAs=', brJs.includes('index.html?previewAs='));
t('board 09: member text escaped in HTML', !brJs.split('\n').filter((l) => !l.includes('ctx.toast(') && !l.includes('UI.confirm(')).some((l) => /\$\{(x|pl|p|a)\.(n|title|body|detail)\}/.test(l)));
t('board 09: audit log has search, type filter and show-more over the loaded activity', ['data-aud-q', 'data-aud-type', "d.br === 'more'", 'B.aud.n += 20', 'hit.slice(0, a.n)'].every((x) => brJs.includes(x)) && fs.readFileSync(ROOT + 'web/style.css', 'utf8').includes('.br-audit-f'));
// D6: the old Portal tabs (Flags, Health, Requests) are hidden for whoever gets the Boardroom; managers without it keep Requests
{
  const app = fs.readFileSync(ROOT + 'web/app.js', 'utf8');
  t('D6: Boardroom viewers lose the old Flags/Health/Requests tabs', /const boardroom = flagOn\('boardroom', baseRole\) && A\.canEditFlags/.test(app) && /flagOn\('requests', baseRole\) && !boardroom/.test(app) && /boardroom \? \[\] : \[\['flags'/.test(app) && /canHealth && !boardroom/.test(app));
}
done();
