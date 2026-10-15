// P11.4 – profanity counter & moderation escalation. Detection is Discord's own AutoMod (REST-created rule,
// no Gateway, no Message Content Intent) – it blocks the message itself and posts an alert to a chosen log
// channel. The cron reads that channel (bot REST token, same technique as P11.0/P8.4) and turns each alert
// into a strike: 3 strikes → auto-warning, 5 strikes → 24h auto-mute (reuses the P8.3 warnings/muted_until
// columns, so managers see it in the same place as a manual warn/mute). Members with no strikes in 7 days
// get a small "good behaviour" points bonus (P11.3, category `behaviour`).
//
// Not yet live-verified: Discord doesn't fully document the AutoMod alert message's exact embed field names.
// parseAlert() is written defensively (matches any <@id> mention + a field that looks like a keyword), but
// needs checking against one real triggered violation before the escalation is trusted – see P11.4 in
// PLANNING/ROADMAP.md.
import { can } from './roles.js';
import { notify, safely } from './notify.js';
import { awardPoints } from './points.js';

const API = 'https://discord.com/api/v10';
const WARN_AT = 3, MUTE_AT = 5, MUTE_HOURS = 24;
const CLEAN_DAYS = 7, CLEAN_BONUS = 3;
const DAY = 86400e3;
const RULE_NAME = 'NOREX profanity filter';
// A starting list – managers can extend it any time in Discord (Server Settings → Safety → AutoMod), this
// just seeds the rule so /profanitysetup has something to create.
const DEFAULT_WORDS = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'faggot', 'retard'];

async function dget(env, path) {
  const r = await fetch(API + path, { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
  if (!r.ok) throw new Error(`discord-${r.status}`);
  return r.json();
}
async function dcall(env, path, method, body) {
  const r = await fetch(API + path, { method, headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `discord-${r.status}`);
  return d;
}
const getMeta = async (env, key) => { try { return JSON.parse(await env.DB.prepare('SELECT value FROM meta WHERE key = ?').bind(key).first('value')); } catch { return null; } };
const setMeta = (env, key, v) => env.DB.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind(key, JSON.stringify(v)).run();

// Creates (or updates) the guild's NOREX AutoMod rule: blocks the seed word list and alerts the chosen channel.
// Needs the bot to have Manage Guild in the server (Discord requirement for AutoMod, not something this code can grant).
export async function setupAutoMod(env, who, channelId) {
  if (!can(who, 'settings.bot')) throw new Error('Owner only.');
  if (!channelId) throw new Error('Give the channel to send AutoMod alerts to.');
  if (!env.DISCORD_BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN is not set.');
  const rules = await dget(env, `/guilds/${env.DISCORD_GUILD_ID}/auto-moderation/rules`);
  const body = {
    name: RULE_NAME, event_type: 1, trigger_type: 1,
    trigger_metadata: { keyword_filter: DEFAULT_WORDS.map((w) => `*${w}*`) },
    actions: [{ type: 1, metadata: { custom_message: "Let's keep it clean in here 🙂" } }, { type: 2, metadata: { channel_id: channelId } }],
    enabled: true,
  };
  const existing = rules.find((r) => r.name === RULE_NAME);
  const rule = existing
    ? await dcall(env, `/guilds/${env.DISCORD_GUILD_ID}/auto-moderation/rules/${existing.id}`, 'PATCH', body)
    : await dcall(env, `/guilds/${env.DISCORD_GUILD_ID}/auto-moderation/rules`, 'POST', body);
  await setMeta(env, 'profanity_config', { channelId, ruleId: rule.id, lastMessageId: null });
  return rule;
}

// Defensive parse: works off whatever the alert message actually contains, rather than one assumed exact schema.
export function parseAlert(msg) {
  if (msg.type !== 24) return null; // AUTO_MODERATION_ACTION system message
  const text = [msg.content, ...(msg.embeds ?? []).flatMap((e) => [e.title, e.description, ...(e.fields ?? []).map((f) => `${f.name} ${f.value}`)])].filter(Boolean).join('\n');
  const uid = text.match(/<@!?(\d{5,25})>/)?.[1];
  if (!uid) return null;
  const keyword = (msg.embeds ?? []).flatMap((e) => e.fields ?? []).find((f) => /keyword|word|matched/i.test(f.name))?.value ?? null;
  return { uid, keyword };
}

async function strike(env, uid, keyword, ref) {
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO profanity_log (user_id, keyword, message_ref, at) VALUES (?, ?, ?, ?)').bind(uid, keyword, ref, Date.now()).run();
  if (!ins.meta?.changes) return; // this alert message was already counted (re-reading overlap)
  await env.DB.prepare('UPDATE users SET profanity_strikes = profanity_strikes + 1 WHERE id = ?').bind(uid).run();
  const u = await env.DB.prepare('SELECT profanity_strikes, warnings FROM users WHERE id = ?').bind(uid).first();
  if (!u) return;
  if (u.profanity_strikes === MUTE_AT) {
    await env.DB.prepare('UPDATE users SET muted_until = ? WHERE id = ?').bind(Date.now() + MUTE_HOURS * 3600e3, uid).run();
    await safely(notify(env, [uid], { type: 'moderation', icon: '🔇', title: 'Auto-muted: repeated flagged messages', body: `AutoMod caught ${u.profanity_strikes} messages from you – muted ${MUTE_HOURS}h.`, link: 'members.html#me' }));
  } else if (u.profanity_strikes === WARN_AT) {
    let warnings; try { warnings = JSON.parse(u.warnings || '[]'); } catch { warnings = []; }
    warnings.push({ at: Date.now(), by: 'AutoMod', reason: `${WARN_AT} flagged messages (auto)` });
    await env.DB.prepare('UPDATE users SET warnings = ? WHERE id = ?').bind(JSON.stringify(warnings), uid).run();
    await safely(notify(env, [uid], { type: 'moderation', icon: '⚠️', title: 'Auto-warning: repeated flagged messages', body: `AutoMod caught ${WARN_AT} messages from you – please keep it clean.`, link: 'members.html#me' }));
  }
}

// Cron step: reads any new alert messages since last time, turns each into a strike.
export async function checkProfanity(env) {
  if (!env.DB || !env.DISCORD_BOT_TOKEN) return { checked: 0 };
  const cfg = await getMeta(env, 'profanity_config');
  if (!cfg?.channelId) return { checked: 0 }; // not set up yet (/profanitysetup)
  const q = cfg.lastMessageId ? `?limit=50&after=${cfg.lastMessageId}` : '?limit=50';
  const msgs = await dget(env, `/channels/${cfg.channelId}/messages${q}`).catch(() => []);
  if (!msgs.length) return { checked: 0 };
  let checked = 0;
  for (const m of [...msgs].reverse()) {
    const hit = parseAlert(m);
    if (hit) { await strike(env, hit.uid, hit.keyword, m.id); checked++; }
  }
  await setMeta(env, 'profanity_config', { ...cfg, lastMessageId: msgs[0].id });
  return { checked };
}

// Weekly-ish "good behaviour" bonus: active members with no strikes in the last CLEAN_DAYS get points once.
export async function cleanBonus(env) {
  if (!env.DB) return { awarded: 0 };
  const cutoff = Date.now() - CLEAN_DAYS * DAY;
  const rows = await env.DB.prepare(`SELECT id FROM users WHERE last_at > ? AND (last_clean_bonus_at IS NULL OR last_clean_bonus_at < ?)
    AND id NOT IN (SELECT user_id FROM profanity_log WHERE at > ?) LIMIT 100`).bind(Date.now() - 30 * DAY, cutoff, cutoff).all().then((r) => r.results);
  for (const r of rows) {
    await awardPoints(env, r.id, 'behaviour', CLEAN_BONUS, `${CLEAN_DAYS} days clean`);
    await env.DB.prepare('UPDATE users SET last_clean_bonus_at = ? WHERE id = ?').bind(Date.now(), r.id).run();
  }
  return { awarded: rows.length };
}
