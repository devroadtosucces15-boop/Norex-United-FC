// Tags & community badges (P2.3), achievements & streaks (P2.3 / P4.3), squad match log for the dashboard (P2.6).
import fs from 'node:fs';
import { call, env, login, ROOT, siteJson, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';
import { ACHIEVEMENTS, BADGES, TIERS, goldenBoots, leagueFacts, weekStreak } from '../bot/badges.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };

// ----- engine (pure) -----
const cols = ['ts', 'res', 'g', 'a', 'r', 'motm'];
const rows = [[1, 'W', 1, 0, 7, 0], [2, 'D', 3, 1, 9.1, 1], [3, 'W', 0, 2, 7, 0], [4, 'L', 0, 0, 6, 0], [5, 'W', 2, 0, 8, 1], [6, 'W', 1, 0, 7.5, 0]];
const lf = leagueFacts(rows, cols);
t('league facts: totals', lf.apps === 6 && lf.goals === 7 && lf.assists === 3 && lf.motm === 2);
t('league facts: bests', lf.bestGoals === 3 && lf.bestRating === 9.1 && lf.bestAssists === 2);
t('league facts: unbeaten run ends at the loss, current run counted', lf.unbeaten === 3 && lf.unbeatenNow === 2 && lf.winsNow === 2 && lf.winStreak === 2);
t('league facts: scoring streak', lf.scoring === 2 && lf.scoringNow === 2);
t('league facts: empty log', leagueFacts([], cols).apps === 0 && leagueFacts([], cols).bestGoals === 0);
const ws = weekStreak(['2026-09-01', '2026-09-02', '2026-09-08', '2026-09-15', '2026-09-28'], '2026-09-28');
t('week streak: consecutive Monday weeks, current alive this week', ws.best === 3 && ws.cur === 1);
t('week streak: gone after a missed week', weekStreak(['2026-09-01'], '2026-09-28').cur === 0);
const ts = (d) => Date.parse(d + 'T20:00:00Z') / 1000;
const boots = goldenBoots({ cols: ['ts', 'g'], players: { a: [[ts('2026-08-02'), 2], [ts('2026-09-02'), 5]], b: [[ts('2026-08-03'), 2]] } }, '2026-09');
t('golden boot: ties share it, current month not counted', boots.get('a') === 1 && boots.get('b') === 1);
t('catalogue: ids unique, tiers known, custom badge exists', new Set(ACHIEVEMENTS.map((a) => a.id)).size === ACHIEVEMENTS.length && ACHIEVEMENTS.every((a) => TIERS[a.tier]) && BADGES.some((b) => b.id === 'custom'));

// ----- squad.json (build output) -----
const squad = siteJson('squad');
const k0 = Object.keys(squad.players)[0];
t('squad.json: cols + per-player logs oldest → newest', squad.cols.includes('res') && squad.players[k0].length > 0 && squad.players[k0].every((r, i, a) => !i || a[i - 1][0] <= r[0]));

// ----- API -----
const owner = await login('111', [], 'Founder');
const mgr = await login('600', ['mgr'], 'Coach');
const a = await login('701', [], 'Ana <b>');
const b = await login('702', [], 'Ben');
setFlags({ badges: 'owner' });
t('flag: members get 404 while owner-only', (await call(a, '/api/badges?u=702')).s === 404 && (await call(a, '/api/achievements')).s === 404);
t('flag: owner can read', (await call(owner, '/api/badges?u=701')).s === 200);
setFlags({ badges: 'members', profiles: 'members', notifications: 'members' });

// tags
const tg = await call(a, '/api/profile', { tags: [{ t: 'The Wall', e: '🧱', c: 'red' }, { t: '<i>Night</i> owl', e: '', c: 'nope' }, { t: 'the wall', e: '🧱' }] });
t('tags: saved, cleaned, deduped, bad colour → grey', tg.s === 200 && tg.d.profile.tags.length === 2 && tg.d.profile.tags[1].c === 'grey' && !tg.d.profile.tags[1].t.includes('<'));
t('tags: max 8', (await call(a, '/api/profile', { tags: Array.from({ length: 9 }, (_, i) => ({ t: 'x' + i })) })).s === 400);
t('tags: emoji only', (await call(a, '/api/profile', { tags: [{ t: 'Hi', e: 'abc' }] })).s === 400);
t('tags: other profile fields untouched', (await call(a, '/api/profile', { bio: 'Hello' })).d.profile.tags.length === 2);
t('tags: shown on the member card', (await call(b, '/api/member?u=701')).d.profile.tags[0].t === 'The Wall');

// badges
t('badge: cannot give yourself', (await call(a, '/api/badges', { to: '701', kind: 'wall' })).s === 400);
t('badge: unknown kind rejected', (await call(a, '/api/badges', { to: '702', kind: 'king' })).s === 400);
t('badge: unknown member 404', (await call(a, '/api/badges', { to: '999', kind: 'wall' })).s === 404);
const g1 = await call(a, '/api/badges', { to: '702', kind: 'wall' });
t('badge: given, returns the new state', g1.s === 200 && g1.d.badges[0].kind === 'wall' && g1.d.badges[0].n === 1 && g1.d.badges[0].mine);
t('badge: one of each type per giver', (await call(a, '/api/badges', { to: '702', kind: 'wall' })).s === 409);
await call(mgr, '/api/badges', { to: '702', kind: 'wall' });
const bb = await call(b, '/api/badges?u=702');
t('badge: grouped with count + givers, recipient may remove', bb.d.badges[0].n === 2 && bb.d.badges[0].givers.length === 2 && bb.d.canRemove && bb.d.badges[0].givers[0].rid);
t('badge: giver names carry no markup', bb.d.badges[0].givers.every((g) => !String(g.n).includes('<')));
const other = await call(a, '/api/badges?u=702');
t('badge: others see no removal ids', !other.d.canRemove && !other.d.badges[0].givers[0].rid && other.d.canGive);
t('badge: custom needs text', (await call(a, '/api/badges', { to: '702', kind: 'custom', text: 'x' })).s === 400);
const cu = await call(a, '/api/badges', { to: '702', kind: 'custom', text: '<script>Tekkers</script>' });
t('badge: custom text cleaned', cu.s === 200 && cu.d.badges.some((x) => x.kind === 'custom' && !x.name.includes('<')));
const n = sqlite.prepare("SELECT title FROM notifications WHERE user_id = '702' AND type = 'badge'").all();
t('badge: recipient notified', n.length >= 2 && n[0].title.includes('gave you a badge'));
t('badge: giver can take it back', (await call(a, '/api/badges', { to: '702', kind: 'custom', undo: true })).d.badges.every((x) => x.kind !== 'custom'));
const wallId = sqlite.prepare("SELECT id FROM badges WHERE to_id = '702' AND from_id = '701' AND kind = 'wall'").get().id;
t('badge: a manager/owner can remove any badge', (await call(owner, '/api/badges/remove', { id: wallId })).s === 200);
t('badge: removed by someone else → giver cannot re-give', (await call(a, '/api/badges', { to: '702', kind: 'wall' })).s === 403);
const mgrWall = sqlite.prepare("SELECT id FROM badges WHERE to_id = '702' AND from_id = '600' AND removed_at IS NULL").get().id;
t('badge: plain member cannot remove on someone else', (await call(a, '/api/badges/remove', { id: mgrWall })).s === 403);
t('badge: recipient removes one on their profile', (await call(b, '/api/badges/remove', { id: mgrWall })).d.badges.length === 0);
sqlite.exec("INSERT INTO badges (to_id, from_id, kind, at) SELECT '600', '701', 'wall', " + Date.now() + " FROM (SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15) x");
t('badge: daily give limit', (await call(a, '/api/badges', { to: '111', kind: 'leader' })).s === 429);
sqlite.exec("DELETE FROM badges WHERE to_id = '600'");

// achievements
const pl = Object.keys(squad.players).map((k) => siteJson('players').find((p) => p.k === k)).find(Boolean);
await call(b, '/api/claim', { player: pl.k });
await call(mgr, '/api/admin/claims', { user: '702', action: 'approve' });
const ach = await call(b, '/api/achievements');
const got = (id) => ach.d.list.find((x) => x.id === id);
t('achievements: list with progress + tiers', ach.s === 200 && ach.d.list.length === ACHIEVEMENTS.length && ach.d.tierInfo.legendary.pts === 100);
t('achievements: verified + debut unlocked from claim + League log', got('verified').done && got('debut').done);
t('achievements: first batch is fresh (toast) but not notified', got('verified').fresh && !sqlite.prepare("SELECT 1 FROM notifications WHERE user_id = '702' AND title LIKE 'Achievement%'").get());
t('achievements: points = sum of tiers', ach.d.pts === ach.d.list.filter((x) => x.done).reduce((s, x) => s + x.pts, 0));
t('achievements: EA career totals count', ach.d.facts.apps >= (pl.car?.gp ?? 0));
t('achievements: streak facts present', 'unbeatenNow' in ach.d.facts && 'weekNow' in ach.d.facts);
await call(b, '/api/achievements/seen', {});
t('achievements: seen clears fresh', !(await call(b, '/api/achievements')).d.list.some((x) => x.fresh));
// a later unlock is notified
for (let i = 0; i < 3; i++) await call(b, '/api/profile', { tags: [{ t: 'A' }, { t: 'B' }, { t: 'C' }] });
await call(b, '/api/achievements');
t('achievements: later unlock → notification', !!sqlite.prepare("SELECT 1 FROM notifications WHERE user_id = '702' AND title LIKE 'Achievement unlocked: Tagged%'").get());
const other2 = await call(a, '/api/achievements?u=702');
t('achievements: others see them, never as fresh', other2.s === 200 && other2.d.count > 0 && !other2.d.list.some((x) => x.fresh));
const brd = await call(a, '/api/achievements/board');
t('board: sorted by points, has top icons', brd.s === 200 && brd.d.board.length >= 1 && brd.d.board.every((r, i, l) => !i || l[i - 1].pts >= r.pts) && brd.d.board[0].top.length > 0);
const card = await call(a, '/api/member?u=702');
t('member card: badges + achievement summary', Array.isArray(card.d.badges) && card.d.ach.pts === brd.d.board.find((r) => r.id === '702').pts);
setFlags({ badges: 'owner' });
t('member card: no badges while flag is off for the viewer', !('badges' in (await call(a, '/api/member?u=702')).d));
setFlags({ badges: 'members' });

// ----- C4 Boardroom: medal definitions -----
const m0 = await call(owner, '/api/admin/medals');
t('medals admin: owner lists built-ins with holders + fact labels', m0.s === 200 && m0.d.defs.length === ACHIEVEMENTS.length && m0.d.defs.some((x) => x.id === 'all-medals') && m0.d.facts.manual && m0.d.members.length > 0);
t('medals admin: managers and members are refused', (await call(mgr, '/api/admin/medals')).s === 403 && (await call(a, '/api/admin/medals')).s === 403 && (await call(mgr, '/api/admin/medals', { op: 'hide', id: 'debut', hidden: true })).s === 403);
const n0 = m0.d.defs.length;
const mk = await call(owner, '/api/admin/medals', { op: 'save', icon: '🧤', name: 'Clean sheet king', desc: 'Keeper of the year', tier: 'epic', fact: 'manual' });
const cid = mk.d.defs.find((x) => x.name === 'Clean sheet king')?.id;
t('medals admin: custom special medal created (owner-awarded)', mk.s === 200 && cid?.startsWith('x-') && mk.d.defs.length === n0 + 1 && mk.d.defs.find((x) => x.id === cid).pts === 50);
t('medals admin: validation', (await call(owner, '/api/admin/medals', { op: 'save', icon: '', name: 'x', tier: 'epic', fact: 'manual' })).s === 400 && (await call(owner, '/api/admin/medals', { op: 'save', icon: '🔥', name: 'Burner', tier: 'mythic', fact: 'goals', goal: 5 })).s === 400 && (await call(owner, '/api/admin/medals', { op: 'save', icon: '🔥', name: 'Burner', tier: 'rare', fact: 'goals', goal: 0 })).s === 400 && (await call(owner, '/api/admin/medals', { op: 'save', icon: '🔥', name: 'Burner', tier: 'rare', fact: 'nope', goal: 3 })).s === 400);
const cn = await call(owner, '/api/admin/medals', { op: 'save', icon: '🔥', name: 'Ten goals', desc: '10 League goals', tier: 'rare', fact: 'goals', goal: 10 });
t('medals admin: counting medal tied to a fact', cn.s === 200 && cn.d.defs.find((x) => x.name === 'Ten goals').goal === 10);
const aw = await call(owner, '/api/admin/medals', { op: 'award', id: cid, to: '702' });
t('medals admin: award + member sees it + notified', aw.s === 200 && (await call(b, '/api/achievements')).d.list.find((x) => x.id === cid).done && !!sqlite.prepare("SELECT 1 FROM notifications WHERE user_id = '702' AND title LIKE 'Medal awarded%'").get());
t('medals admin: counting medals cannot be handed out', (await call(owner, '/api/admin/medals', { op: 'award', id: 'debut', to: '702' })).s === 400);
const ed = await call(owner, '/api/admin/medals', { op: 'save', id: 'debut', icon: '🥾', name: 'First cap', desc: 'Play a League match', tier: 'common', goal: 1 });
t('medals admin: built-in edit shows on the member list; reset restores', ed.d.defs.find((x) => x.id === 'debut').name === 'First cap' && (await call(b, '/api/achievements')).d.list.find((x) => x.id === 'debut').name === 'First cap' && (await call(owner, '/api/admin/medals', { op: 'reset', id: 'debut' })).d.defs.find((x) => x.id === 'debut').name === 'Debut');
const hd = await call(owner, '/api/admin/medals', { op: 'hide', id: 'wins-10', hidden: true });
t('medals admin: hide removes a medal from members and lists it as hidden', !hd.d.defs.some((x) => x.id === 'wins-10') && hd.d.hidden.some((x) => x.id === 'wins-10') && !(await call(b, '/api/achievements')).d.list.some((x) => x.id === 'wins-10'));
t('medals admin: show brings it back', (await call(owner, '/api/admin/medals', { op: 'hide', id: 'wins-10', hidden: false })).d.defs.some((x) => x.id === 'wins-10'));
// "Got them all": unlock every regular medal for a member, then the collector medal follows
const regular = ACHIEVEMENTS.filter((x) => x.fact !== 'manual' && x.fact !== 'others').map((x) => x.id);
for (const id of regular) sqlite.prepare('INSERT OR IGNORE INTO achievements (user_id, id, at, seen) VALUES (?, ?, ?, 1)').run('702', id, Date.now());
const all1 = await call(b, '/api/achievements');
t('got them all: unlocks once every regular medal is held (special ones not required)', all1.d.list.find((x) => x.id === 'all-medals').done && !all1.d.list.find((x) => x.id === 'all-medals' && x.v < x.goal));
const nobody = await call(a, '/api/achievements');
t('got them all: others do not have it', !nobody.d.list.find((x) => x.id === 'all-medals').done);
t('medals admin: revoke + delete clean up', (await call(owner, '/api/admin/medals', { op: 'revoke', id: cid, to: '702' })).s === 200 && !(await call(b, '/api/achievements')).d.list.find((x) => x.id === cid).done && (await call(owner, '/api/admin/medals', { op: 'delete', id: cid })).d.defs.every((x) => x.id !== cid));
await call(owner, '/api/admin/medals', { op: 'delete', id: cn.d.defs.find((x) => x.name === 'Ten goals').id });
t('medals admin: back to the built-in catalogue', (await call(owner, '/api/admin/medals')).d.defs.length === n0);

// ----- client -----
t('assets shipped', ['badges.js', 'badges.css', 'mystats.js', 'mystats.css'].every((f) => fs.existsSync(ROOT + 'site/assets/' + f)));
const app = fs.readFileSync(ROOT + 'web/app.js', 'utf8');
t('P2.6 hub tab behind the myStats flag', app.includes("flagOn('myStats', baseRole) ? [['stats', '📊 My stats']]") && app.includes('assets/mystats.js'));
t('P4.3 unlock toast checked on hub start behind the badges flag', app.includes("flagOn('badges', me.user.role)") && app.includes('checkUnlocks'));
const LEVELS = ['off', 'owner', 'managers', 'members', 'public'];
t('badges + myStats flags declared with a valid level (owner-only until QA2, members after)', ['badges', 'myStats'].every((f) => LEVELS.includes(JSON.parse(fs.readFileSync(ROOT + 'config.json', 'utf8')).features[f])));

done();
