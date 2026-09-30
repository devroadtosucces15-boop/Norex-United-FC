// P11.6 auto match hype (folds in P11.7's "rivalry" idea – see PLANNING/ROADMAP.md: Pro Clubs matches are
// found by EA matchmaking, there is no advance fixture list, so a genuine "before the match" crest-clash post
// has no real trigger; this fires right after a new match is fetched instead, with both crests already in the
// embed) + P11.10's AI match recap. Runs on the existing 10-min cron: compares the newest match id in the
// site's club data to the last one already posted, and when a new one appears, generates a stadium background
// with the text-to-image model (tone matches the result) and a 2-3 sentence recap with the text model, and
// posts an embed with the real score/scorers/MOTM/both crests, using the art as the embed's backdrop image.
// There's no image-compositing library in Workers, so the art is the backdrop and the real stats stay as
// normal embed text/fields – same shape as the existing /last command; the recap is the description.
// Needs config.json → hype.channel (bot.yml injects it as the Worker var HYPE_CHANNEL); unset = no-op, so
// this never duplicates the existing GitHub Actions result webhook (scripts/fetch.mjs → postToDiscord()).
// P11.10 site-side placement is a follow-up (see P11.3's note on the same fetch.mjs↔D1 gap) – the recap only
// posts to Discord for now, same scope cut as match-performance points.
import { safely } from './notify.js';

const RED = 0xc8352c, GREEN = 0x22c55e, GREY = 0x6b7280;
const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';

function artPrompt(res) {
  if (res === 'W') return 'triumphant football stadium at night, fireworks, crowd celebrating, dramatic lighting, bold graphic sports poster style, ink black and crimson red';
  if (res === 'L') return 'empty rain-soaked football stadium at night, dim moody lighting, somber sports poster style, deep red and black';
  return 'floodlit football stadium at dusk, tense atmosphere, bold graphic sports poster style, black and red';
}

function hypeChannel(env) {
  try { return JSON.parse(env.HYPE_CHANNEL || '{}').channel || null; } catch { return null; }
}

async function generateArt(env, res) {
  const out = await env.AI.run(IMAGE_MODEL, { prompt: artPrompt(res) });
  if (typeof out?.image !== 'string') return null;
  const bytes = Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
  return bytes.length > 500 ? bytes : null; // a near-empty result means the model failed
}

// P11.10: a short journalist-style recap from the real box score. Falls back to a plain result line if the
// model fails or gives an empty answer – the embed still works, it's just less colourful.
async function generateRecap(env, club, m) {
  const prompt = [
    'You are a sports journalist. Write a punchy 2-3 sentence recap of this football result for a fan Discord server.',
    'Be vivid but factual. No hashtags, no emoji, no headline, just the recap.',
    `Club: ${club.name}`,
    `Result: ${m.res === 'W' ? 'Win' : m.res === 'L' ? 'Loss' : 'Draw'} ${m.gf}-${m.ga} vs ${m.opp}`,
    `Scorers: ${(m.scorers ?? []).map((s) => `${s.n}${s.g > 1 ? ` (${s.g})` : ''}`).join(', ') || 'none'}`,
    `Man of the match: ${m.motm || 'not recorded'}`,
  ].join('\n');
  const out = await env.AI.run(TEXT_MODEL, { messages: [{ role: 'user', content: prompt }], max_tokens: 120 });
  const text = typeof out?.response === 'string' ? out.response.trim() : '';
  return text ? text.slice(0, 600) : null;
}

async function postHype(env, channel, embed, art) {
  const form = new FormData();
  form.set('payload_json', JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }));
  if (art) form.set('files[0]', new Blob([art], { type: 'image/png' }), 'hype.png');
  const r = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, { method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` }, body: form });
  if (!r.ok) console.log('hype post failed', r.status, await r.text());
}

export async function checkHype(env, loadSite) {
  const channel = hypeChannel(env);
  if (!channel || !env.AI || !env.DISCORD_BOT_TOKEN || !env.NOREX_KV) return { posted: false };
  const club = await loadSite('club').catch(() => null);
  const m = club?.matches?.[0];
  if (!m) return { posted: false };
  const last = await env.NOREX_KV.get('hype_last_id');
  if (String(m.id) === last) return { posted: false };
  await env.NOREX_KV.put('hype_last_id', String(m.id));
  if (last == null) return { posted: false }; // first run after this ships: remember the current match, don't blast old history
  const [art, recap] = await Promise.all([
    generateArt(env, m.res).catch((e) => { console.log('hype art failed', e.message); return null; }),
    generateRecap(env, club, m).catch((e) => { console.log('hype recap failed', e.message); return null; }),
  ]);
  const fallback = m.res === 'W' ? '🎉 **Victory!**' : m.res === 'L' ? '😤 **Defeat**' : '➖ **Draw**';
  const embed = {
    title: `${club.name} ${m.gf}–${m.ga} ${m.opp}`, url: m.url, color: m.res === 'W' ? GREEN : m.res === 'L' ? RED : GREY,
    description: recap ?? fallback,
    fields: [
      m.scorers?.length && { name: '⚽ Scorers', value: m.scorers.map((s) => `${s.n}${s.g > 1 ? ` ×${s.g}` : ''}`).join('\n'), inline: true },
      m.motm && { name: '⭐ MOTM', value: m.motm, inline: true },
    ].filter(Boolean),
    image: art ? { url: 'attachment://hype.png' } : undefined,
  };
  await safely(postHype(env, channel, embed, art));
  return { posted: true };
}
