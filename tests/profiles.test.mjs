// Profile 2.0 (P2.2) + member cards / profile pages (P2.1).
import fs from 'node:fs';
import { call, env, login, ROOT, W } from './mock.mjs';
import { t, done } from './lib.mjs';

const owner = await login('111', [], 'Founder 👑');
const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500', [], 'Winger');
const other = await login('501', [], 'Keeper');
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const save = (tok, body) => call(tok, '/api/profile', body);

// ----- flag -----
setFlags({ profiles: 'owner' });
t('member card hidden from members while flag is owner-only', (await call(member, '/api/member?u=500')).s === 404);
t('owner sees member cards while owner-only', (await call(owner, '/api/member?u=500')).s === 200);
setFlags({ profiles: 'members' });
t('no login → 401', (await W('/api/member?u=500')).status === 401);

// ----- P2.2 save + validation -----
const week = [0, 0, 0, 0, 0xe00000, 0xf00000, 0]; // Fri 21–23, Sat 20–23
let r = await save(member, {
  bio: 'Fast <b>winger</b>', positions: ['RW', 'ST', 'RW', 'XX', 'CAM', 'LW'], rushPositions: ['ST', 'LWB'], platform: 'PS5',
  tz: 'Europe/London', playTimes: week, ids: { psn: 'Wing_er-9', ea: 'Winger EA' }, twitch: 'https://www.twitch.tv/winger_tv/videos',
  youtube: 'https://www.youtube.com/@WingerClips', country: 'gb', club: 'Arsenal <script>',
});
const pf = r.d.profile;
t('profile 2.0 saved', r.s === 200 && pf.tz === 'Europe/London' && pf.playTimes[4] === 0xe00000 && pf.country === 'GB');
t('League positions ranked, deduped, max 3', pf.positions.join() === 'RW,ST,CAM');
t('Rush positions: only Rush list (LWB dropped)', pf.rushPositions.join() === 'ST');
t('twitch link → channel name', pf.twitch === 'winger_tv');
t('youtube link → @handle', pf.youtube === '@WingerClips');
t('platform IDs kept', pf.ids.psn === 'Wing_er-9' && pf.ids.ea === 'Winger EA' && !pf.ids.xbox);
t('XSS stripped from club + bio', !pf.club.includes('<') && !pf.bio.includes('<'));
r = await save(member, { bio: 'Only the bio' });
t('partial save keeps the other fields', r.s === 200 && r.d.profile.bio === 'Only the bio' && r.d.profile.tz === 'Europe/London' && r.d.profile.positions[0] === 'RW');
t('bad time zone rejected', (await save(member, { tz: 'Mars/Olympus' })).s === 400);
t('time zone injection rejected', (await save(member, { tz: '../../etc' })).s === 400);
t('play times need 7 days', (await save(member, { playTimes: [1, 2, 3] })).s === 400);
t('play-time hours out of range rejected', (await save(member, { playTimes: [0x1000000, 0, 0, 0, 0, 0, 0] })).s === 400);
t('play times without a time zone rejected', (await save(other, { playTimes: week })).s === 400);
t('empty grid clears play times', (await save(member, { playTimes: [0, 0, 0, 0, 0, 0, 0] })).d.profile.playTimes === null);
t('javascript: twitch rejected', (await save(member, { twitch: 'javascript:alert(1)' })).s === 400);
t('youtube on another site rejected', (await save(member, { youtube: 'https://evil.example/@x' })).s === 400);
t('youtube channel id accepted', (await save(member, { youtube: 'https://youtube.com/channel/UCabcdefghijklmnopqrstuv' })).d.profile.youtube === 'channel/UCabcdefghijklmnopqrstuv');
t('bad PSN ID rejected', (await save(member, { ids: { psn: 'a b <c>' } })).s === 400);
t('Xbox gamertag with suffix accepted', (await save(member, { ids: { xbox: 'Wing Er#1234' } })).d.profile.ids.xbox === 'Wing Er#1234');
t('bad country rejected', (await save(member, { country: 'Britain' })).s === 400);
t('old client (bio/positions/platform) still works', (await save(other, { bio: 'gk', positions: ['GK'], platform: 'Xbox' })).d.profile.positions[0] === 'GK');
t('/api/me returns the new fields', (await call(member, '/api/me')).d.profile.country === 'GB');

// ----- P2.1 member card -----
r = await call(other, '/api/member?u=500');
t('member reads another member card', r.s === 200 && r.d.member.n === 'Winger' && r.d.profile.twitch === 'winger_tv' && r.d.member.me === false);
t('members do not get the activity log', !('activity' in r.d));
t('no ?u= → own card', (await call(member, '/api/member')).d.member.id === '500');
t('unknown member → 404', (await call(member, '/api/member?u=999999')).s === 404);
r = await call(mgr, '/api/member?u=500');
t('managers get the member activity log', Array.isArray(r.d.activity) && r.d.activity.some((a) => a.type === 'profile'));
t('owner card shows the owner role', (await call(member, '/api/member?u=111')).d.member.role === 'owner');
t('portal overview carries new profile fields', (await call(mgr, '/api/admin/overview')).d.profiles['500'].tz === 'Europe/London');

const mp = fs.readFileSync(ROOT + 'site/member.html', 'utf8');
t('member.html built with the profile mount', mp.includes('id="member-page"') && fs.existsSync(ROOT + 'site/assets/profile.js'));

done();
