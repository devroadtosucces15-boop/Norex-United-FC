// Bot personalisation (roadmap P7.5): result/reminder channel, ping role, embed colour/emoji, which auto-posts run.
// Stored as one JSON blob in the D1 meta table (same key/value pattern as awards_channel, announce_channel, …).
//   GET  /api/bot/settings         owner (settings.bot): current settings, for the manager portal's "Bot settings" tab
//   POST /api/bot/settings         owner: save settings
//   GET  /api/bot/settings/public  keyed (X-Norex-Key, same shared-secret pattern as /api/overrides) – fetch.mjs reads
//                                  this before posting a match result so the channel/colour/emoji/toggle stay in sync.
import { can } from './roles.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const CH = /^\d{5,25}$/; // a Discord channel/role snowflake
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export const DEFAULT_SETTINGS = {
  resultChannel: '', reminderChannel: '', pingRole: '', color: 'c8352c', emoji: '⚽',
  autoPosts: { results: true, reminders: true, awards: true },
};

export async function getBotSettings(env) {
  const row = await one(env, "SELECT value FROM meta WHERE key = 'bot_settings'");
  if (!row?.value) return { ...DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(row.value);
    return { ...DEFAULT_SETTINGS, ...saved, autoPosts: { ...DEFAULT_SETTINGS.autoPosts, ...(saved.autoPosts ?? {}) } };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
async function saveBotSettings(env, s) {
  await run(env, "INSERT INTO meta (key, value) VALUES ('bot_settings', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", JSON.stringify(s));
  return s;
}

// Shared secret with fetch.mjs (scripts/lib.mjs) – same derivation family as loadOverrides()'s /api/overrides key.
export async function settingsKey(secret) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:norex-bot-settings`));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function botSettingsRoute(p, method, body, me, env, log) {
  if (p !== '/api/bot/settings') return null;
  if (!can(me, 'settings.bot')) return fail('Owner only.', 403);
  if (method === 'GET') return json(await getBotSettings(env));
  if (method !== 'POST') return fail('Not found', 404);
  const cur = await getBotSettings(env);
  const ch = (v) => (v === '' || v == null ? '' : CH.test(String(v)) ? String(v) : null);
  const resultChannel = ch(body.resultChannel), reminderChannel = ch(body.reminderChannel), pingRole = ch(body.pingRole);
  if (resultChannel === null || reminderChannel === null || pingRole === null) return fail('Channel/role IDs must be plain Discord IDs (right-click → Copy ID).');
  const color = /^#?[0-9a-fA-F]{6}$/.test(body.color ?? '') ? String(body.color).replace('#', '') : cur.color;
  const emoji = clean(body.emoji, 8) || cur.emoji;
  const autoPosts = { ...cur.autoPosts };
  if (body.autoPosts && typeof body.autoPosts === 'object') for (const k of Object.keys(autoPosts)) if (k in body.autoPosts) autoPosts[k] = !!body.autoPosts[k];
  const saved = await saveBotSettings(env, { resultChannel, reminderChannel, pingRole, color, emoji, autoPosts });
  await log?.(env, me, 'bot-settings', 'Updated bot personalisation');
  return json(saved);
}

// Unauthenticated, keyed like /api/overrides – fetch.mjs (GitHub Actions) has no D1 access, so it asks the Worker.
export async function botSettingsPublicRoute(request, env) {
  if (!env.DISCORD_CLIENT_SECRET || request.headers.get('X-Norex-Key') !== await settingsKey(env.DISCORD_CLIENT_SECRET)) return fail('Forbidden', 403);
  return json(await getBotSettings(env));
}
