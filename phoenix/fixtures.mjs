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
fs.writeFileSync(F, JSON.stringify(d));
console.log('fixtures patched');
