// Permissions model (roadmap P0.6). One place that decides who may do what – every /api route and
// Discord command asks can(user, action). The site only hides buttons; the Worker enforces.
//
// Tiers, lowest → highest (each tier can do everything the tiers below it can):
//   guest   – not logged in
//   member  – logged in and in the NOREX Discord server
//   claimed – member with an approved player claim
//   manager – has the manager role (ADMIN_ROLE_ID)
//   owner   – in ADMIN_IDS or has the Founder role (OWNER_ROLE_ID); sees everything incl. private messages

export const ROLES = ['guest', 'member', 'claimed', 'manager', 'owner'];
export const ROLE_LABEL = { guest: 'Guest', member: 'Member', claimed: 'Verified player', manager: 'Manager', owner: 'Owner' };
const rank = (role) => Math.max(0, ROLES.indexOf(role));
export const atLeast = (role, min) => rank(role) >= rank(min);

// action → lowest role that unlocks it. New features add their actions here (roadmap item in the comment).
export const PERMS = {
  // Squad Hub (built)
  'hub.use': 'member',
  'claim.request': 'member',
  'profile.edit': 'member',
  'profiles.view': 'member', // P2.1 – hover cards + member profile pages
  'availability.set': 'member',
  'vote.motm': 'member',
  // Manager portal (built)
  'portal.view': 'manager',
  'claims.decide': 'manager',
  'members.view': 'manager',
  'activity.view': 'manager',
  'votes.view': 'manager',
  // Upcoming items
  'rush.submit': 'member', // P0.4 – members submit, managers confirm
  'rush.confirm': 'manager', // P0.4
  'feedback.send': 'claimed', // P4.4 – claimed → claimed players
  'feedback.authors': 'manager', // P4.4 – who wrote anonymous feedback, hide messages, see reports
  'ratings.give': 'member', // P4.2 – weekly 1–5★ for teammates (not yourself)
  'ratings.raters': 'manager', // P4.2 – who gave which stars
  'predict.play': 'member', // P3.8 – predictions game
  'recs.view': 'member', // P3.6 – "who to play with tonight"
  'lineup.unlock': 'claimed', // P3.5 – Rush squad preferences (claimed + Rush positions set)
  'squads.manage': 'manager', // P3.5 – generate / edit / publish Rush squads, see everyone's preferences
  'events.manage': 'manager', // P3.1 – create / edit / cancel events, quick lineup (P3.7), share session reports
  'events.view': 'member', // P3.1 – schedule in the Squad Hub (+ session reports, P3.7)
  'events.rsvp': 'member', // P3.2 – ✅ ❔ ❌ per event
  'events.checkin': 'member', // P3.7 – "I'm on" during a match night (+ position trial)
  'builds.save': 'member', // PB.2 – Save to My builds, fork
  'builds.feature': 'manager', // PB.3 – "Club recommended" on the Pro Builds board
  'builds.squad': 'manager', // PB.4 – everyone's League/Rush build in the portal
  'game.edit': 'manager', // PB.1 – publish game-rules versions (level cap, dataset), confirm patch-note cap changes
  'content.edit': 'manager', // P5.1 / P5.2 – announcements, requirements, rules, FAQ, glossary, Play Style; see who acknowledged the rules
  'docs.read': 'member', // P5.2 – members-only docs + Play Style (guests only see items marked public)
  'docs.ack': 'member', // P5.2 – acknowledge the current rules
  'announce.discord': 'manager', // P5.3 – post an announcement to a Discord channel (optional role ping)
  'suggest.send': 'member', // P5.4 – suggestion box (optionally anonymous to members)
  'suggest.vote': 'member', // P5.4
  'suggest.decide': 'manager', // P5.4 – status (planned / done / declined) + reply, sees anonymous authors, removes
  'notes.private': 'manager', // P5.7 – private notes per member / player / trial
  'trials.manage': 'manager', // P1.5 – trial cards, sessions, decisions
  'scout.recommend': 'member', // P5.5 – recommend a player to the managers
  'leaders.view': 'member', // P4.5 – squad boards (attendance, MOTM votes) on the leaderboards page
  'hof.manage': 'manager', // P4.6 – induct legends, add club-history moments
  'feed.view': 'member', // P6.1 – club feed: read, react, comment
  'feed.post': 'member', // P6.1 – write posts (edit/remove own)
  'posts.moderate': 'manager', // P6.1 / P8.3 – pin/remove posts
  'media.storage': 'owner', // P6.1b – media storage dashboard (R2 usage, delete files)
  'messages.use': 'member', // P6.3 – DMs and group chats: read/send in your own chats
  'messages.reported': 'manager', // P6.3 – managers see reported messages only
  'messages.all': 'owner', // P6.3 – owner/founder sees every DM and group chat
  'settings.bot': 'owner', // P7/P8 – bot and site settings
  'notify.use': 'member', // P7.1 – notification centre (bell, settings, Discord DMs)
  'notify.announce': 'manager', // P7.1 – announcements / rules to every member (optionally must-acknowledge)
  'presence.view': 'member', // P6.4 – who's online now (+ appear offline)
  'mentions.use': 'member', // P6.5 – @mention members (people search), react to comments
  'hotw.vote': 'member', // P6.2 – vote the highlight of the week (not your own clip)
  'requests.club': 'member', // P5.6 – "Track another club"
  'requests.hide': 'guest', // P5.6 – "Hide me from the site" (visitors too, verified by managers)
  'requests.decide': 'manager', // P5.6 – approve / reject / undo requests
  'badges.give': 'member', // P2.3 – give teammates community badges (tags are part of profile.edit)
  'badges.remove': 'manager', // P2.3 – remove abusive badges (members can remove badges on their own profile)
  'awards.vote': 'member', // P4.1 – weekly award ballots, boards
  'awards.manage': 'manager', // P4.1 – fun categories, Discord channel, close a week early
  'roles.sync': 'manager', // P2.5 – /syncroles: re-sync the ✅ Verified Discord role for every claim
  'insights.view': 'manager', // Club Intelligence – /insights server + club analysis (weekly DM goes to the owner)
  'submissions.view': 'manager', // P8.1 – portal: feedback, ratings, award votes, predictions, suggestions, builds in one place
  'reports.view': 'manager', // P8.3 – unified reported-content queue (posts, feedback, messages)
  'moderation.manage': 'manager', // P8.3 – warn / mute members
  'points.view': 'member', // P11.3 – point system: my total/breakdown + leaderboard
  'flags.manage': 'owner', // BE5 – Boardroom: live-edit feature flag levels (flag_overrides table)
  'preview.viewAs': 'manager', // BE5 – Boardroom: preview the site/API as a lower role
  'health.view': 'owner', // BE6 – Boardroom: Cloudflare Analytics + GitHub Actions health/usage dashboard
  'plays.view': 'member', // BE1 – Tactics Studio: view published plays, mark learned, take the quiz
  'plays.manage': 'manager', // BE1 – create/edit/publish/assign/archive plays, restore old versions
  'hubroom.view': 'member', // BE8 – Hub: online count, live "who's here" roster
  'hubroom.wave': 'member', // BE8 – Hub: wave at another member
  'statInsights.compare': 'member', // BE9 – ✨ head-to-head insight for two home players, written on demand (flag statInsights on top)
  'statInsights.note': 'claimed', // BE9 – ✨ coach's note per home player (private tier): a claimed member (their own player only – the row check) or a manager/owner; flag statInsights on top
};

export function can(user, action) {
  const min = PERMS[action];
  if (!min) throw new Error(`Unknown permission: ${action}`);
  return atLeast(user?.role ?? 'guest', min);
}

// Every action this role unlocks – sent to the site so it can show the right buttons.
export const permsFor = (role) => Object.keys(PERMS).filter((a) => atLeast(role, PERMS[a]));

// P8.3 – a muted member keeps read access but can't post/comment/message until this passes.
export async function muted(env, uid) {
  const r = await env.DB.prepare('SELECT muted_until FROM users WHERE id = ?').bind(uid).first();
  return r?.muted_until > Date.now() ? r.muted_until : null;
}

const ids = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
// Role from Discord at login (roles = the member's role IDs in the NOREX server). `claimed` is added per request.
export function discordRole(env, userId, roles = []) {
  if (ids(env.ADMIN_IDS).includes(userId) || (env.OWNER_ROLE_ID && roles.includes(env.OWNER_ROLE_ID))) return 'owner';
  if (env.ADMIN_ROLE_ID && roles.includes(env.ADMIN_ROLE_ID)) return 'manager';
  return 'member';
}
// Sessions issued before P0.6 have only `adm`; ADMIN_IDS still marks the owner.
export const sessionRole = (env, s) => s.role ?? (ids(env.ADMIN_IDS).includes(s.u) ? 'owner' : s.adm ? 'manager' : 'member');

// ---------- Feature flags (roadmap P0.7) ----------
// config.json → features { name: level } is copied into the Worker var FEATURES on deploy (bot.yml).
// New member-facing features ship as 'owner' and a QA checkpoint switches them to 'members' / 'public'.
// A flag says whether a feature exists for someone; can() still decides what they may do inside it.
export const FLAG_LEVELS = ['off', 'owner', 'managers', 'members', 'public'];
const FLAG_MIN = { owner: 'owner', managers: 'manager', members: 'member', public: 'guest' };
export function flags(env) {
  let map = {};
  try { map = JSON.parse(env.FEATURES || '{}'); } catch { console.log('FEATURES is not valid JSON'); }
  for (const [k, v] of Object.entries(map)) if (!FLAG_LEVELS.includes(v)) map[k] = 'off';
  return map;
}
// Unknown flags count as 'off', so a typo hides a feature instead of leaking it.
export function flagOn(env, user, name) {
  const level = flags(env)[name] ?? 'off';
  return level !== 'off' && atLeast(user?.role ?? 'guest', FLAG_MIN[level]);
}
export const featuresFor = (env, user) => Object.keys(flags(env)).filter((f) => flagOn(env, user, f));

// ---------- BE5: live D1 overrides on top of config.json's committed flags ----------
// A manager/owner edit in the Boardroom's 🚩 Flags tab writes one row here. `handleMembers` calls this
// once per request and layers the result over the static FEATURES var (see `flags()` above), so every
// route/flagOn() check downstream sees the live value with no code changes and no broadcast plumbing –
// the next request after an edit already reads the new level from D1.
export async function loadFlagOverrides(env) {
  if (!env.DB) return {};
  try {
    const { results } = await env.DB.prepare('SELECT name, level FROM flag_overrides').all();
    return Object.fromEntries((results || []).map((r) => [r.name, r.level]));
  } catch { return {}; }
}
// Returns a NEW env with FEATURES merged (never mutates the one passed in – the Worker's `env` binding is
// shared across requests within an isolate, so mutating it in place would leak one request's override into
// the next). `handleMembers` reassigns its own local `env` to the result; the caller's object is untouched.
export function withFlagOverrides(env, overrides) {
  const committed = flags(env);
  return { ...env, _committedFlags: committed, ...(overrides && Object.keys(overrides).length ? { FEATURES: JSON.stringify({ ...committed, ...overrides }) } : {}) };
}
// The map as config.json → features shipped it, ignoring any live D1 override – used by the Flags tab's
// "reset to committed" and to validate flag names against the real, deployed set.
export const committedFlags = (env) => env._committedFlags ?? flags(env);

// ---------- BE5: preview-as-role ----------
// A manager/owner request may carry an `x-view-as` header asking to be treated as a lower role for that
// one request (Boardroom "preview as"). Never lets anyone escalate – only ranks at or below their own.
export function viewAsRole(real, requested) {
  if (!requested || !ROLES.includes(requested) || !atLeast(real, 'manager')) return real;
  return atLeast(real, requested) ? requested : real;
}
