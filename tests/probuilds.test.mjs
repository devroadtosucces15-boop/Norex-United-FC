// Pro Builds board (PB.3) + my build on profiles (PB.4): flag gate, public reading, posting, votes, comments,
// "Club recommended", removal, my League/Rush build (incl. fork of someone else's), portal squad view.
import { call, env, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ builder: 'members', proBuilds: 'owner', profiles: 'members' });
const owner = await login('111');
const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('501', [], 'Ana');
const m2 = await login('502', [], 'Ben');
t('flag owner-only: guests get 404', (await call(null, '/api/probuilds')).s === 404);
t('flag owner-only: members get 404', (await call(m1, '/api/probuilds/post', {})).s === 404);
t('owner sees the (empty) board', (await call(owner, '/api/probuilds')).d?.builds?.length === 0);
setFlags({ proBuilds: 'public' });

const code = 'a=finisher&l=40&p=3x4.5x2&ps=0&h=185&v=fc27-launch';
const post = { title: 'Box poacher', code, description: 'Stay on the last man.\n\n\n\nFinish <b>everything</b>.', position: 'ST', mode: 'league', clip: 'https://youtu.be/abc', tags: ['Pace', 'pace', 'Finesse!', 'a', 'b', 'c', 'd'] };
t('logged-out posting → 401', (await call(null, '/api/probuilds/post', post)).s === 401);
t('position required', (await call(m1, '/api/probuilds/post', { ...post, position: 'XX' })).s === 400);
t('mode required', (await call(m1, '/api/probuilds/post', { ...post, mode: 'fifa' })).s === 400);
t('clip must be a known https video host', (await call(m1, '/api/probuilds/post', { ...post, clip: 'http://evil.example/x' })).s === 400 && (await call(m1, '/api/probuilds/post', { ...post, clip: 'javascript:alert(1)' })).s === 400);
t('bad code rejected', (await call(m1, '/api/probuilds/post', { ...post, code: 'a=<x>' })).s === 400);
const p1 = await call(m1, '/api/probuilds/post', post);
const b1 = p1.d?.build;
t('post a new build straight from the sandbox', p1.s === 200 && b1.title === 'Box poacher' && b1.position === 'ST' && b1.mode === 'league' && b1.mine && b1.level === 40);
t('description: no tags, max 2 blank lines', !b1.desc.includes('<') && !b1.desc.includes('\n\n\n'));
t('tags cleaned, deduped, max 5', b1.tags.length === 5 && b1.tags[0] === 'pace' && b1.tags.includes('finesse'));
t('posted build also lands in My builds', (await call(m1, '/api/builds')).d.builds.some((x) => x.id === b1.id && x.posted));
const pub = await call(null, '/api/probuilds');
t('guests can read the board', pub.s === 200 && pub.d.builds.length === 1 && pub.d.builds[0].by.n === 'Ana' && pub.d.canPost === false && pub.d.builds[0].mine === false);
t('guests can open a build', (await call(null, `/api/probuilds/get?id=${b1.id}`)).d.build.desc.includes('last man'));

// post an existing saved build
const s2 = await call(m2, '/api/builds', { title: 'Wall', code: 'a=boss&l=12&v=old-patch' });
t('cannot post someone else’s build', (await call(m2, '/api/probuilds/post', { ...post, id: b1.id })).s === 403);
const p2 = await call(m2, '/api/probuilds/post', { ...post, id: s2.d.saved, code: 'a=boss&l=12&v=old-patch', title: 'Wall', position: 'CB', mode: 'rush', clip: '' });
t('post my saved build (same row)', p2.s === 200 && p2.d.build.id === s2.d.saved && p2.d.build.mode === 'rush' && p2.d.build.clip === null);

// votes
t('cannot vote on my own build', (await call(m1, '/api/probuilds/vote', { id: b1.id, v: 1 })).s === 400);
t('guests cannot vote', (await call(null, '/api/probuilds/vote', { id: b1.id, v: 1 })).s === 401);
const v1 = await call(m2, '/api/probuilds/vote', { id: b1.id, v: 1 });
t('upvote', v1.s === 200 && v1.d.up === 1 && v1.d.score === 1 && v1.d.myVote === 1);
await call(mgr, '/api/probuilds/vote', { id: b1.id, v: -1 });
const v2 = await call(m2, '/api/probuilds/vote', { id: b1.id, v: 1 });
t('voting twice counts once; downvotes counted', v2.d.up === 1 && v2.d.down === 1 && v2.d.score === 0);
const v3 = await call(m2, '/api/probuilds/vote', { id: b1.id, v: 0 });
t('vote removed', v3.d.up === 0 && v3.d.down === 1 && v3.d.myVote === 0);
t('bad vote value rejected', (await call(m2, '/api/probuilds/vote', { id: b1.id, v: 5 })).s === 400);
t('my vote shows on the board', (await call(mgr, '/api/probuilds')).d.builds.find((x) => x.id === b1.id).myVote === -1);

// comments
const c1 = await call(m2, '/api/probuilds/comment', { id: b1.id, text: 'Great build <img src=x onerror=alert(1)>' });
t('comment added, XSS stripped, count updated', c1.s === 200 && c1.d.comments.length === 1 && !c1.d.comments[0].text.includes('<') && c1.d.build.comments === 1);
t('empty comment rejected', (await call(m2, '/api/probuilds/comment', { id: b1.id, text: ' ' })).s === 400);
t('guests cannot comment', (await call(null, '/api/probuilds/comment', { id: b1.id, text: 'hi there' })).s === 401);
const cid = c1.d.comments[0].id;
t('others cannot delete my comment', (await call(m1, '/api/probuilds/comment/delete', { comment: cid })).s === 403);
t('comment author sees delete; others do not', c1.d.comments[0].canDelete === true && (await call(m1, `/api/probuilds/get?id=${b1.id}`)).d.comments[0].canDelete === false);
const cd = await call(mgr, '/api/probuilds/comment/delete', { comment: cid });
t('manager removes a comment', cd.s === 200 && cd.d.comments.length === 0 && cd.d.build.comments === 0);
for (let i = 0; i < 30; i++) sqlite.prepare("INSERT INTO build_comments (build_id, user_id, text, at) VALUES (?, '502', 'x', ?)").run(b1.id, Date.now());
t('30 comments per day limit', (await call(m2, '/api/probuilds/comment', { id: b1.id, text: 'one more' })).s === 429);

// featuring + moderation
t('members cannot feature', (await call(m1, '/api/probuilds/feature', { id: b1.id, label: 'x' })).s === 403);
const f1 = await call(mgr, '/api/probuilds/feature', { id: b1.id, label: '' });
t('manager features: default label from position + mode', f1.s === 200 && f1.d.build.featured === 'ST · League');
t('unfeature', (await call(mgr, '/api/probuilds/feature', { id: b1.id, label: null })).d.build.featured === null);
t('members cannot remove others’ posts', (await call(m1, '/api/probuilds/unpost', { id: p2.d.build.id })).s === 403);
t('manager removes a post', (await call(mgr, '/api/probuilds/unpost', { id: p2.d.build.id })).s === 200 && (await call(null, '/api/probuilds')).d.builds.length === 1);
t('removed post stays in the author’s builds', (await call(m2, '/api/builds')).d.builds.some((x) => x.id === p2.d.build.id && !x.posted));

// PB.4 my build
setFlags({ proBuilds: 'owner' });
t('my build behind the flag', (await call(m1, '/api/mybuild', { mode: 'league', id: b1.id })).s === 404);
t('member card has no builds while the flag is off for them', !('builds' in (await call(m2, '/api/member?u=501')).d));
setFlags({ proBuilds: 'members' });
t('mode required', (await call(m1, '/api/mybuild', { mode: 'x', id: b1.id })).s === 400);
const my1 = await call(m1, '/api/mybuild', { mode: 'league', id: b1.id, position: 'ST' });
t('use my own posted build as my League build', my1.s === 200 && my1.d.picks.league.id === b1.id && my1.d.picks.league.position === 'ST' && my1.d.picks.rush === null);
const my2 = await call(m2, '/api/mybuild', { mode: 'rush', id: b1.id });
t('someone else’s posted build is forked first', my2.s === 200 && my2.d.picks.rush.id !== b1.id && (await call(m2, '/api/builds')).d.builds.find((x) => x.id === my2.d.picks.rush.id)?.forkedFrom === b1.id);
t('cannot pick someone else’s private build', (await call(m1, '/api/mybuild', { mode: 'rush', id: s2.d.saved })).s === 404);
const my3 = await call(m1, '/api/mybuild', { mode: 'rush', code: 'a=engine&l=20', title: 'Rush engine', position: 'CM' });
t('pick the build on screen (saved as new)', my3.s === 200 && my3.d.picks.rush.title === 'Rush engine' && my3.d.picks.rush.position === 'CM');
t('My builds knows my picks', (await call(m1, '/api/builds')).d.picks.rush === my3.d.saved);
const card = await call(m2, '/api/member?u=501');
t('member card carries League + Rush build', card.d.builds.league.id === b1.id && card.d.builds.rush.title === 'Rush engine');
t('picked build can be opened by others in the builder', (await call(m2, `/api/builds/get?id=${my3.d.saved}`)).s === 200);
t('guests: no builds of unverified members', (await call(null, '/api/probuilds/player?u=501')).s === 404);
setFlags({ proBuilds: 'public' });
t('guests: still none for unverified members', (await call(null, '/api/probuilds/player?u=501')).s === 404);
sqlite.prepare("INSERT INTO claims (user_id, player, player_name, status, at) VALUES ('501', 'p501', 'AnaFC', 'approved', 1)").run();
const pp = await call(null, '/api/probuilds/player?u=501');
t('guests see a verified player’s builds', pp.s === 200 && pp.d.picks.league.title === 'Box poacher');
const clr = await call(m1, '/api/mybuild', { mode: 'rush', id: null });
t('clear my Rush build', clr.s === 200 && clr.d.picks.rush === null && clr.d.picks.league);
await call(m1, '/api/builds/delete', { id: b1.id });
t('deleting a build unposts it and clears the pick', (await call(null, '/api/probuilds')).d.builds.length === 0 && (await call(m1, '/api/mybuild')).d.picks.league === null);

// portal squad view
t('members cannot see the squad builds', (await call(m1, '/api/probuilds/squad')).s === 403);
const sq = await call(mgr, '/api/probuilds/squad');
t('managers see everyone’s picks', sq.s === 200 && sq.d.picks.some((x) => x.user.id === '502' && x.mode === 'rush'));
const ov = await call(owner, '/api/admin/overview');
t('board actions are logged', ['probuild-post', 'probuild-remove', 'probuild-feature', 'mybuild'].every((k) => ov.d.activity.some((x) => x.type === k)));
done();
