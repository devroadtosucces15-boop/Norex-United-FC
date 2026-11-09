// Hand-authored answers for routes the recorder cannot reproduce (they need the real Discord bot token).
// Idempotent: run after record.mjs (record.mjs calls it) or alone: node phoenix/fixtures.mjs
import fs from 'node:fs';
const F = new URL('./overlay/phoenix-api.json', import.meta.url);
const d = JSON.parse(fs.readFileSync(F, 'utf8'));
const now = Date.now(), D = 864e5;
const hist = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
const series = (a) => hist.map((m, i) => ({ m, site: a[0][i], joins: a[1][i], decided: a[2][i], resp: a[3][i], rush: a[4][i], trials: a[5][i] }));
const rec = (sev, area, kind, text, acted) => ({ sev, area, kind, id: `${area}.${kind}`, text, acted: acted || null });
const intel = {
  at: now - 3 * 36e5, guild: 'Phoenix Fire', overall: 78,
  scores: { server: 82, site: 74, admin: 69, team: 87 },
  server: { humans: 148, online: 37, joins30: 21, joins7: 6, posters7: 44, posters30: 79, msgs7: 1312, msgs30: 5204, active: 11, text: 14, voice: 4, noRole: 5,
    top: [{ name: 'match-chat', n: 402 }, { name: 'lineups', n: 288 }, { name: 'general', n: 241 }, { name: 'clips', n: 96 }], dead: ['old-trades', 'welcome-wall'] },
  site: { adoption: 61, users: 90, active7: 52, active30: 71, new30: 14, squadClaimed: 17, squad: 22, dmOff: 4, missing: ['Rafa Quintero', 'Leo Marchetti', 'Tomás Idowu'] },
  admin: { claims: 2, requests: 3, rush: 1, trials: 2, oldest: 4, resp: 9 },
  team: { w: 41, d: 9, l: 14, gp: 64, winPct: 64, gdpg: 1.3, form: 'W W D W L', regulars: 13, scorer: { n: 'Kai Okonkwo', g: 31 } },
  history: series([[9, 12, 15, 11, 14, 18], [14, 18, 22, 17, 21, 21], [6, 8, 9, 7, 11, 9], [14, 12, 11, 10, 9, 9], [5, 6, 8, 7, 9, 6], [3, 2, 4, 3, 2, 2]]),
  recs: [
    rec(1, 'admin', 'oldClaim', 'A player claim has waited **4 days** — someone should look at it in Staff tools.'),
    rec(2, 'site', 'unclaimed', '**5 regulars** haven\'t claimed their player on the site yet. A pinned nudge in #general usually helps.'),
    rec(2, 'admin', 'requests', '**3 requests** are waiting for a manager decision.'),
    rec(3, 'server', 'quiet', 'Two channels have been silent for 30+ days. Archive them to keep the server tidy.'),
    rec(3, 'site', 'dms', '**4 members** block the bot\'s DMs, so they miss match reminders.', { by: 'Mara Quill', at: now - 2 * D }),
    rec(4, 'team', 'form', 'The team is on a **64% win rate** with a +1.3 goal difference per game.'),
    rec(4, 'server', 'growth', '**21 people** joined Discord in the last 30 days — the best month since summer.')],
};
d['owner:GET /api/intel'] = intel;
d['member:GET /api/intel'] = { error: 'Managers only.' };

// ---- club feed / news: a handful of made-up posts so the Clubhouse and News pages are never empty
const au = (id, n) => ({ id, n, a: null, tag: null });
const who = [au('222', 'Skye Calder'), au('333', 'Kai Okonkwo'), au('444', 'Mara Quill'), au('111', 'Phoenix Owner')];
const T = [['highlight', 'Kai Okonkwo with the 89th-minute winner against Harbour Rovers. Replay that finish on repeat. 🔥', 2],
  ['league', 'League night is Thursday: lineup goes up Wednesday evening. Mark your availability in the Dugout.', 6],
  ['rush', 'Rush squad went 4-1 last night. Two clean sheets from the back line!', 20],
  ['chat', 'Welcome to everyone who joined this week. Claim your player on the site and say hi in #general. 👋', 30],
  ['highlight', 'Clip of the month nominations are open. Drop your best goal in the thread.', 52]];
const posts = T.map(([tag, text, h], i) => ({ id: 9000 + i, by: who[i % 4], text, tag, at: now - h * 36e5, edited: null, pinned: i === 1, media: [],
  reacts: { '🔥': 5 - (i % 3), '⚽': 3, '👏': 2 }, who: { '🔥': ['Skye Calder', 'Mara Quill'] }, mine: i % 2 ? ['🔥'] : [],
  comments: i < 3 ? [{ id: 8000 + i, parent: null, by: who[(i + 1) % 4], text: ['Unreal.', 'Locked in.', 'Cleanest sheet of the season.'][i], at: now - (h - 1) * 36e5 }] : [],
  nComments: i < 3 ? 1 : 0, mentions: {}, public: i !== 3, myReport: false, reported: false, shared: null }));
for (const k of Object.keys(d)) if (/^(owner|member):GET \/api\/feed(\?|$)/.test(k) && Array.isArray(d[k].posts)) d[k].posts = posts;
const pub = { posts: posts.filter((x) => x.public).map((x) => ({ id: x.id, by: x.by, text: x.text, tag: x.tag, at: x.at, media: [], nReacts: 8, nComments: x.nComments })) };
d['owner:GET /api/feed/public'] = pub; d['member:GET /api/feed/public'] = pub; d['guest:GET /api/feed/public'] = pub;

// ---- staff tools: submissions (all six types), reports, burners; plus chats, Rush squads and award votes
const H = 36e5, nm = (k) => (d['owner:GET /api/awards'].nominees.find((x) => x.k === k) || {}).n || k;
const NOM = d['owner:GET /api/awards'].nominees; const pn = (i) => NOM[i % NOM.length].n;
const MEM = [['222', 'Skye Calder'], ['333', 'Kai Okonkwo'], ['444', 'Mara Quill'], ['555', 'Rafa Quintero'], ['666', 'Leo Marchetti'], ['777', 'Tomás Idowu'], ['888', 'Nia Okafor'], ['999', 'Dev Harlan']];
const av = (id) => `https://cdn.discordapp.com/embed/avatars/${Number(id) % 5}.png`;
const sub = (type, rows) => { const b = { type, rows }; d[`owner:GET /api/admin/submissions?type=${type}&q=`] = b; if (type === 'feedback') d['owner:GET /api/admin/submissions'] = b; };
const FB = [['Anonymous', 'Kai Okonkwo', 'praise', 'Best first touch on the team. Every pass into feet.', 3], ['Anonymous', 'Leo Marchetti', 'tip', 'Drop deeper when we build from the back, the gap to the strikers is too big.', 9], ['Anonymous', 'Dev Harlan', 'praise', 'Calm in goal all night, that save in the 80th won us the game.', 26],
  ['Anonymous', 'Rafa Quintero', 'tip', 'Be louder on voice when you press, we keep losing the trigger.', 31], ['Anonymous', 'Nia Okafor', 'praise', 'Clean tackling and never a card. Proper captain material.', 50], ['Anonymous', 'Mara Quill', 'concern', 'Late to two league nights in a row, a heads-up would help the lineup.', 70]];
sub('feedback', FB.map((f, i) => ({ id: 400 + i, at: now - f[4] * H, author: f[0], subject: f[1], kind: f[2], body: f[3], hidden: false, reported: i === 5, report: i === 5 ? 'Feels personal, not constructive' : null })));
sub('ratings', MEM.flatMap((m, i) => [0, 1].map((j) => ({ id: `2026-W46:${m[0]}:${pn(i * 2 + j)}`, at: now - (i * 3 + j + 1) * H, author: m[1], subject: pn(i * 2 + j), body: `${[5, 4, 4, 5, 3, 4, 5, 4][(i + j) % 8]}★ · week 2026-W46` }))));
sub('awardVotes', MEM.flatMap((m, i) => ['Best Striker', 'Best Midfielder', 'Best Defender', 'Best Keeper'].slice(0, 2 + (i % 3)).map((c, j) => ({ id: `2026-W46:${m[1]}:${c}`, at: now - (i * 2 + j + 1) * H, author: m[1], subject: pn(i + j * 4 + 3), body: `${c} · week 2026-W46` }))));
sub('predictions', MEM.map((m, i) => ({ id: `1:${m[0]}`, at: now - (i + 2) * H, author: m[1], subject: 'Event #1', body: `${[2, 3, 1, 2, 4, 1, 2, 3][i]}–${[1, 1, 1, 0, 2, 0, 2, 1][i]}` })));
sub('suggestions', [['Add a clip of the week wall on the home page', 'Would make the highlights easier to find. Pin the winner for 7 days.', 'open', 5, 'Skye Calder'], ['Rush squads: let us see why we were paired', 'A short note on chemistry would stop the questions in #rush.', 'planned', 28, 'Kai Okonkwo'],
  ['Match night reminders 30 minutes earlier', 'An hour is too early, 15 is too late. Half an hour works.', 'open', 40, 'Mara Quill'], ['Dark mode for the tactics board', 'The white pitch is bright at night.', 'done', 90, 'Nia Okafor'], ['A proper trophy room', 'Show every title with the squad that won it.', 'open', 120, 'Anonymous']]
  .map((s, i) => ({ id: 60 + i, at: now - s[3] * H, author: s[4], subject: s[0], body: s[1], kind: s[2], anon: s[4] === 'Anonymous' })));
sub('builds', [['Skye Calder', 'Sweeper Keeper v2', 'Sweeper', 28, true], ['Kai Okonkwo', 'Poacher 29', 'Poacher', 30, true], ['Leo Marchetti', 'Engine Room', 'Box-to-box', 27, false], ['Nia Okafor', 'Wall of Fire', 'Stopper', 29, true], ['Dev Harlan', 'Playmaker Lite', 'Playmaker', 25, false]]
  .map((b, i) => ({ id: 30 + i, at: now - (i * 11 + 4) * H, author: b[0], subject: b[1], body: `${b[2]} · lvl ${b[3]}${b[4] ? ' · posted' : ''}` })));
const REP = { items: [
  { source: 'post', id: 9003, at: now - 3 * H, author: 'Rafa Quintero', reason: 'Spam link', excerpt: 'free coins on my profile, click the link in my bio and claim before it ends…', link: 'feed.html#p9003' },
  { source: 'feedback', id: 405, at: now - 5 * H, author: 'Anonymous → Mara Quill', reason: 'Feels personal, not constructive', excerpt: 'Late to two league nights in a row, a heads-up would help the lineup.', link: 'members.html#feedback' },
  { source: 'message', id: 7102, at: now - 22 * H, author: 'Leo Marchetti', reason: 'Rude to a new player', excerpt: 'you were useless again last night, learn your position before you queue.', link: 'messages.html#c2' },
  { source: 'post', id: 9004, at: now - 30 * H, author: 'Tomás Idowu', reason: 'Off topic', excerpt: 'selling my old console, DM me for the price and a bundle of games.', link: 'feed.html#p9004' }] };
d['owner:GET /api/admin/reports'] = REP;
d['owner:GET /api/admin/requests'] = { requests: [{ id: 1, user: '555', name: 'Rafa Quintero', kind: 'position', text: 'Move me from CM to CAM for league nights.', at: now - 4 * H }, { id: 2, user: '999', name: 'Dev Harlan', kind: 'role', text: 'Can I get the Rush keeper tag? I have played 14 Rush nights.', at: now - 20 * H }, { id: 3, user: '888', name: 'Nia Okafor', kind: 'claim', text: 'Wrong player linked, I am Wildfire_J not Ignis77.', at: now - 52 * H }] };
// burners (flagged B-team clubs managers follow)
const crestOf = (n) => null, form = (s) => s.split('');
d['owner:GET /api/burners'] = { max: 6, clubs: [
  { id: '1203391', name: 'Ember Reserve', crest: null, by: 'Mara Quill', at: now - 6 * D, stats: { gp: 9, w: 6, d: 1, l: 2, gf: 24, ga: 11, form: form('WWLWD') } },
  { id: '1198042', name: 'Phoenix Academy', crest: null, by: 'Phoenix Owner', at: now - 15 * D, stats: { gp: 14, w: 8, d: 3, l: 3, gf: 31, ga: 19, form: form('DWWLW') } },
  { id: '1210877', name: 'Ash FC', crest: null, by: 'Skye Calder', at: now - 1 * D, stats: null }] };
d['owner:GET /api/burners/search'] = { linked: [{ id: '1220415', name: 'Cinder Rovers', crest: null, note: 'also played by AshMender, GoldenLoom +1', tracked: false }, { id: '1203391', name: 'Ember Reserve', crest: null, note: 'also played by Scorch9', tracked: true }],
  recent: [{ id: '1115838', name: 'Harbour Rovers', crest: null, note: 'we won 3–1', tracked: false }, { id: '1171271', name: 'Iron Gate', crest: null, note: 'we drew 2–2', tracked: false }] };
// chats (owner 111, member 222) – DMs and groups with a short believable history
const CH = [{ id: 1, kind: 'group', name: 'League night', emoji: '⚽' }, { id: 2, kind: 'dm', name: 'Kai Okonkwo', avatar: av(333), other: '333' }, { id: 3, kind: 'group', name: 'Rush crew', emoji: '🔥' }, { id: 4, kind: 'dm', name: 'Mara Quill', avatar: av(444), other: '444' }];
const LINES = { 1: [['333', 'Lineup is up. We go 3-5-2 against Harbour.'], ['222', 'Can I take the right wing back spot?'], ['111', 'Yes, you earned it. Check-in opens at 19:30.'], ['444', 'I will host the lobby again.'], ['333', 'Win this and we top the table. 🔥']],
  2: [['333', 'That finish on Thursday was filthy.'], ['me', 'Cheers. Your pass made it.'], ['333', 'Run it again tonight?'], ['me', 'Always.']], 3: [['222', 'Rush at 21:00?'], ['444', 'In. Need a keeper.'], ['333', 'Dev can keep.'], ['222', 'Perfect, squads are posted.']], 4: [['444', 'Can you approve the Rush squads before 20:00?'], ['me', 'Doing it now.'], ['444', 'Legend.']] };
for (const [role, me, myName] of [['owner', '111', 'Phoenix Owner'], ['member', '222', 'Skye Calder']]) {
  const who2 = Object.fromEntries([...MEM, ['111', 'Phoenix Owner']]);
  const chats = CH.filter((c) => role === 'owner' || c.id !== 4).map((c, i) => { const ls = LINES[c.id]; const last = ls[ls.length - 1]; const mine = (last[0] === 'me' ? me : last[0]) === me;
    return { id: c.id, kind: c.kind, name: c.name, emoji: c.emoji || null, avatar: c.avatar || null, members: c.kind === 'group' ? 6 : 2, unread: i === 0 ? 2 : 0, at: now - (i + 1) * 2 * H, last: { text: last[1], at: now - (i + 1) * 2 * H, mine } }; });
  d[`${role}:GET /api/chats`] = { chats, canReadAll: role === 'owner', canModerate: role === 'owner' };
  for (const c of CH) { if (role === 'member' && c.id === 4) continue; const ls = LINES[c.id];
    d[`${role}:GET /api/chats/${c.id}/messages`] = { messages: ls.map((l, j) => { const id = l[0] === 'me' ? me : l[0]; return { id: c.id * 100 + j, by: { id, n: id === me ? myName : who2[id], a: av(id) }, text: l[1], at: now - (ls.length - j) * 7 * 6e4 - c.id * H }; }), more: false }; }
}
// Rush squads: two squads, bench, teammate picks
const cand = MEM.map((m, i) => ({ id: m[0], n: m[1], a: av(m[0]), pos: [['CM', 'CAM'], ['ST'], ['CB'], ['CM'], ['LB', 'CB'], ['RW', 'ST'], ['CB', 'RB'], ['GK']][i] }));
const pubSq = { title: 'Rush night · 2026-W46', at: now - 5 * H, publishedAt: now - 5 * H, by: 'Mara Quill', bench: [], squads: [
  { ids: ['222', '333', '444', '555', '666'], chemistry: 86, roles: { 222: 'CM', 333: 'ST', 444: 'CB', 555: 'CAM', 666: 'LB' } },
  { ids: ['777', '888', '999'], chemistry: 71, roles: { 777: 'RW', 888: 'CB', 999: 'FLEX' }, missing: ['one CM'] }] };
for (const role of ['owner', 'member']) { const b = d[`${role}:GET /api/squads`] || {}; d[`${role}:GET /api/squads`] = { ...b, me: { unlocked: true, reason: null, prefs: ['333', '444', '666'] }, candidates: cand, published: pubSq, canManage: role === 'owner', prefsAll: role === 'owner' ? { 222: ['333', '444', '666'], 333: ['222', '555'], 444: ['222', '333', '888'] } : {}, drafts: [], events: b.events || [] }; }
// dugout: who's in for the next two nights (state s: yes / maybe / wait)
{ const S = ['yes', 'yes', 'yes', 'maybe', 'yes', 'yes', 'maybe', 'yes']; const P = [['CM', 'CAM'], ['ST'], ['CB'], ['CM'], ['LB', 'CB'], ['RW', 'ST'], ['CB', 'RB'], ['GK']];
  for (const r of ['owner', 'member']) { const k = `${r}:GET /api/events`; if (!d[k]) continue;
    d[k].events = d[k].events.map((e) => e.id > 2 ? e : { ...e, rsvps: MEM.slice(0, e.id === 1 ? 8 : 6).map((m, i) => ({ id: m[0], n: m[1], a: av(m[0]), s: S[(i + e.id) % 8], pos: P[i], at: now - (i + 1) * H })) }); } }
// award votes: a lively ballot
const aw = d['owner:GET /api/awards']; aw.voters = 17; aw.nominees = aw.nominees.map((x, i) => ({ ...x, played: i % 3 !== 0, votes: (i * 5 + 3) % 9 + 1 }));
for (const r of ['owner', 'member']) d[`${r}:GET /api/awards`] = { ...aw, canManage: r === 'owner', my: r === 'member' ? { 1: aw.nominees.find((x) => x.grp === 'FWD').k, 4: aw.nominees.find((x) => x.grp === 'GK').k } : { 2: aw.nominees.find((x) => x.grp === 'MID').k } };
d['guest:GET /api/awards'] = { ...aw, my: {}, canManage: false };
fs.writeFileSync(F, JSON.stringify(d));
console.log('fixtures patched');
