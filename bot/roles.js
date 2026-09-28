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
  'feedback.authors': 'manager', // P4.4 – who wrote anonymous feedback
  'lineup.unlock': 'claimed', // P3.x – claimed + Rush positions set
  'events.manage': 'manager', // P3.x
  'builds.feature': 'manager', // PB – "Club recommended"
  'content.edit': 'manager', // P5.x – announcements, rules, FAQ
  'notes.private': 'manager', // P5.x – private member notes
  'posts.moderate': 'manager', // P6.1 / P8.3 – pin/remove posts
  'messages.reported': 'manager', // P6.3 – managers see reported messages only
  'messages.all': 'owner', // P6.3 – owner/founder sees every DM and group chat
  'settings.bot': 'owner', // P7/P8 – bot and site settings
};

export function can(user, action) {
  const min = PERMS[action];
  if (!min) throw new Error(`Unknown permission: ${action}`);
  return atLeast(user?.role ?? 'guest', min);
}

// Every action this role unlocks – sent to the site so it can show the right buttons.
export const permsFor = (role) => Object.keys(PERMS).filter((a) => atLeast(role, PERMS[a]));

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
