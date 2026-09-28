// Member profiles (roadmap P2.2 Profile 2.0, P2.1 hover cards + profile pages).
//   POST /api/profile        own profile – only the fields sent are changed (older clients send bio/positions/platform)
//   GET  /api/member?u=<id>  any member's profile card (hover card + member.html) – flag `profiles`
// Play times: 7 ints (Mon..Sun), bit h set = usually plays at hour h, in the member's own time zone (`tz`).
// The site converts them to the viewer's time zone.
import { ROLE_LABEL, can, flagOn } from './roles.js';
import { picksOf } from './probuilds.js';
import { achSummary, badgesOf } from './badges.js';

export const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
export const RUSH_POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const PLATFORMS = ['PS5', 'Xbox', 'PC'];
const ID_KEYS = ['psn', 'xbox', 'ea', 'steam'];
const FULL_DAY = 0xffffff;
export const TAG_COLOURS = ['red', 'gold', 'green', 'blue', 'purple', 'grey'];
const MAX_TAGS = 8;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const parse = (s, fb) => { try { return s ? JSON.parse(s) : fb; } catch { return fb; } };

export const profileOut = (r) => r && {
  bio: r.bio, positions: parse(r.positions, []), platform: r.platform, updated: r.updated,
  rushPositions: parse(r.rush_positions, []), tz: r.tz || '', playTimes: parse(r.play_times, null),
  ids: parse(r.ids, {}), twitch: r.twitch || '', youtube: r.youtube || '', country: r.country || '', club: r.fav_club || '',
  tags: parse(r.tags, []),
};

// ---------- validation (each returns the clean value, or throws a human message) ----------
const ranked = (v, list) => [...new Set((Array.isArray(v) ? v : []).filter((x) => list.includes(x)))].slice(0, 3);
function timeZone(v) {
  const tz = clean(v, 64);
  if (!tz) return '';
  if (!/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(tz)) throw new Error('Unknown time zone.');
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch { throw new Error('Unknown time zone.'); }
  return tz;
}
function playTimes(v) {
  if (v === null || v === '') return null;
  if (!Array.isArray(v) || v.length !== 7 || !v.every((x) => Number.isInteger(x) && x >= 0 && x <= FULL_DAY)) throw new Error('Bad play times.');
  return v.some(Boolean) ? v : null;
}
const ID_RULES = { psn: [/^[A-Za-z][\w-]{2,15}$/, 'PSN ID'], xbox: [/^[A-Za-z0-9][A-Za-z0-9 ]{0,14}(#\d{3,4})?$/, 'Xbox gamertag'], ea: [/^[\w .-]{2,32}$/, 'EA ID'], steam: [/^[\w .-]{2,32}$/, 'Steam name'] };
function gameIds(v) {
  const out = {};
  for (const k of ID_KEYS) {
    const x = clean(v?.[k], 40);
    if (!x) continue;
    if (!ID_RULES[k][0].test(x)) throw new Error(`Check your ${ID_RULES[k][1]}.`);
    out[k] = x;
  }
  return out;
}
function twitch(v) {
  let x = clean(v, 120).replace(/^https?:\/\/(www\.|m\.)?twitch\.tv\//i, '').replace(/[/?#].*$/, '').replace(/^@/, '');
  if (!x) return '';
  if (!/^[A-Za-z0-9_]{3,25}$/.test(x)) throw new Error('Twitch: enter your channel name or twitch.tv link.');
  return x;
}
function youtube(v) {
  let x = clean(v, 160);
  if (!x) return '';
  if (/^https?:\/\//i.test(x)) {
    let u;
    try { u = new URL(x); } catch { throw new Error('YouTube: enter your @handle or channel link.'); }
    if (!/^(www\.|m\.)?youtube\.com$/i.test(u.hostname)) throw new Error('YouTube: the link must be on youtube.com.');
    x = decodeURIComponent(u.pathname).replace(/^\/|\/$/g, '').split('/').slice(0, 2).join('/');
  } else if (!x.startsWith('@')) x = `@${x}`;
  if (/^@[\w.-]{3,30}$/.test(x) || /^channel\/UC[\w-]{22}$/.test(x)) return x;
  throw new Error('YouTube: enter your @handle or channel link.');
}
// P2.3 self tags: [{ t: text ≤20, e: one emoji (optional), c: colour key }], max 8, no duplicates.
const EMOJI = /^[\p{Extended_Pictographic}\p{Emoji_Component}\u200d\ufe0f\u{1F1E6}-\u{1F1FF}]+$/u;
function tags(v) {
  if (!Array.isArray(v)) throw new Error('Bad tags.');
  if (v.length > MAX_TAGS) throw new Error(`Up to ${MAX_TAGS} tags.`);
  const out = [];
  for (const x of v) {
    const t = clean(x?.t, 20).replace(/\s+/g, ' ');
    if (!t) continue;
    const e = String(x?.e ?? '').trim();
    if (e && (!EMOJI.test(e) || [...e].length > 8 || /^[\d#*]+$/.test(e))) throw new Error(`“${t}”: pick one emoji or leave it empty.`);
    if (out.some((o) => o.t.toLowerCase() === t.toLowerCase())) continue;
    out.push({ t, e, c: TAG_COLOURS.includes(x?.c) ? x.c : 'grey' });
  }
  return out;
}
function country(v) {
  const x = clean(v, 8).toUpperCase();
  if (!x) return '';
  if (!/^[A-Z]{2}$/.test(x)) throw new Error('Pick a country from the list.');
  return x;
}

// Saves the fields present in `body`, keeps the rest. Returns the new profile or { error }.
export async function saveProfile(env, me, body) {
  const cur = profileOut(await one(env, 'SELECT * FROM profiles WHERE user_id = ?', me.u)) ?? { bio: '', positions: [], platform: '', rushPositions: [], tz: '', playTimes: null, ids: {}, twitch: '', youtube: '', country: '', club: '', tags: [] };
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const p = { ...cur };
  try {
    if (has('bio')) p.bio = clean(body.bio, 280);
    if (has('positions')) p.positions = ranked(body.positions, POSITIONS);
    if (has('rushPositions')) p.rushPositions = ranked(body.rushPositions, RUSH_POS);
    if (has('platform')) p.platform = PLATFORMS.includes(body.platform) ? body.platform : '';
    if (has('tz')) p.tz = timeZone(body.tz);
    if (has('playTimes')) p.playTimes = playTimes(body.playTimes);
    if (has('ids')) p.ids = gameIds(body.ids);
    if (has('twitch')) p.twitch = twitch(body.twitch);
    if (has('youtube')) p.youtube = youtube(body.youtube);
    if (has('country')) p.country = country(body.country);
    if (has('club')) p.club = clean(body.club, 40);
    if (has('tags')) p.tags = tags(body.tags);
  } catch (e) { return { error: e.message }; }
  if (p.playTimes && !p.tz) return { error: 'Pick your time zone so others see your play times in theirs.' };
  p.updated = Date.now();
  await env.DB.prepare(`INSERT INTO profiles (user_id, bio, positions, platform, updated, rush_positions, tz, play_times, ids, twitch, youtube, country, fav_club, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id) DO UPDATE SET bio = excluded.bio, positions = excluded.positions, platform = excluded.platform, updated = excluded.updated,
      rush_positions = excluded.rush_positions, tz = excluded.tz, play_times = excluded.play_times, ids = excluded.ids, twitch = excluded.twitch,
      youtube = excluded.youtube, country = excluded.country, fav_club = excluded.fav_club, tags = excluded.tags`)
    .bind(me.u, p.bio, JSON.stringify(p.positions), p.platform, p.updated, JSON.stringify(p.rushPositions), p.tz,
      p.playTimes ? JSON.stringify(p.playTimes) : '', JSON.stringify(p.ids), p.twitch, p.youtube, p.country, p.club, JSON.stringify(p.tags ?? [])).run();
  return { profile: p };
}

// A short summary for the activity log.
export const profileSummary = (p) => [p.positions.join('/'), p.rushPositions.length ? `Rush ${p.rushPositions.join('/')}` : '', p.platform, p.country].filter(Boolean).join(' · ');

// ---------- P2.1 profile card ----------
export async function memberCard(env, me, id) {
  const u = await one(env, 'SELECT * FROM users WHERE id = ?', id);
  if (!u) return null;
  const badgesOn = flagOn(env, me, 'badges'); // P2.3 / P4.3
  const [claim, prof, activity, builds, badges, ach] = await Promise.all([
    one(env, "SELECT player, player_name FROM claims WHERE user_id = ? AND status = 'approved'", id),
    one(env, 'SELECT * FROM profiles WHERE user_id = ?', id),
    can(me, 'activity.view') ? all(env, 'SELECT at, type, detail FROM activity WHERE user_id = ? ORDER BY id DESC LIMIT 30', id) : null,
    flagOn(env, me, 'proBuilds') ? picksOf(env, id) : null, // PB.4 – League / Rush build
    badgesOn ? badgesOf(env, id, me) : null,
    badgesOn ? achSummary(env, id) : null,
  ]);
  const role = u.role && u.role !== 'member' ? u.role : u.admin ? 'manager' : claim ? 'claimed' : 'member';
  return {
    member: { id: u.id, n: u.name, a: u.avatar, tag: u.tag, role, roleLabel: ROLE_LABEL[role], first: u.first_at, last: u.last_at, me: u.id === me.u },
    claim: claim ? { player: claim.player, playerName: claim.player_name } : null,
    profile: profileOut(prof),
    ...(activity ? { activity } : {}),
    ...(builds ? { builds } : {}),
    ...(badges ? { badges: badges.badges, canRemoveBadges: badges.canRemove, ach } : {}),
  };
}
