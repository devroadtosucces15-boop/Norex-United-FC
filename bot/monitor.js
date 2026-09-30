// 24/7 uptime monitor (roadmap P11.2). Piggybacks the existing 10-min cron: pings the public site and the
// member database, DMs the owner only when something changes (goes down, or comes back) – never every 10
// minutes. State lives in KV, not D1, so a D1 outage doesn't also break the monitor's own memory.

const KEY = 'monitor';

async function siteCheck(env) {
  if (!env.SITE_URL) return null;
  try {
    const r = await fetch(`${env.SITE_URL.replace(/\/?$/, '/')}api/club.json`, { cf: { cacheTtl: 0 } });
    return r.ok ? null : `Site returned HTTP ${r.status}`;
  } catch (e) {
    return `Site unreachable: ${e.message}`;
  }
}

async function dbCheck(env) {
  if (!env.DB) return null;
  try {
    await env.DB.prepare('SELECT 1').first();
    return null;
  } catch (e) {
    return `Member database unreachable: ${e.message}`;
  }
}

// Pure decision: given the last stored state and this run's problems, returns null (nothing changed) or the
// new state to store + the DM to send. Exported so the logic is tested without any network/DB.
export function diff(prev, problems) {
  const down = problems.length > 0;
  const was = prev?.down ?? false;
  if (down === was && JSON.stringify(problems) === JSON.stringify(prev?.problems ?? [])) return null;
  const since = down ? (was ? prev.since : Date.now()) : null;
  const stamp = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  return {
    state: { down, problems, since, at: Date.now() },
    alert: down
      ? `🔴 **NOREX bot: something's down**\n${problems.map((p) => `• ${p}`).join('\n')}`
      : `🟢 **NOREX bot: back to normal** (was down since ${stamp(prev.since ?? prev.at)} UTC)`,
  };
}

async function dmOwner(env, content) {
  if (!env.DISCORD_BOT_TOKEN) return;
  const ids = String(env.ADMIN_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
  for (const id of ids) {
    try {
      const r = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient_id: id }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.id) continue;
      await fetch(`https://discord.com/api/v10/channels/${d.id}/messages`, {
        method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      });
    } catch (e) {
      console.log('monitor DM failed', e.message);
    }
  }
}

// Cron step: check, and only write/alert when the state actually changed (KV free tier = 1,000 writes/day).
export async function checkUptime(env) {
  if (!env.NOREX_KV) return null;
  const problems = (await Promise.all([siteCheck(env), dbCheck(env)])).filter(Boolean);
  const prev = await env.NOREX_KV.get(KEY, 'json');
  const result = diff(prev, problems);
  if (!result) return prev;
  await env.NOREX_KV.put(KEY, JSON.stringify(result.state));
  await dmOwner(env, result.alert);
  return result.state;
}
