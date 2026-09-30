// P11.13 – voice recap → highlight card. A voice clip (Discord voice message or any audio attachment)
// dropped in a configured channel gets transcribed by Workers AI Whisper, the standout line is picked by the
// text model (P11.1), and both turn into a shareable card: an AI-generated backdrop (same "no compositing
// library in Workers, so the art is the backdrop and the real text stays as normal embed content" approach as
// P11.6's hype poster) plus an embed with the quote. Runs on the existing 10-min cron: reads the configured
// channel's recent messages via REST (same technique as P11.4/P5.2), picks the newest message with an audio
// attachment not yet processed (KV bookmark; first run after deploy just remembers where to start, same as
// P11.6's hype poster so it never blasts old clips), and skips it silently (but still marks it processed) if
// the file is too big or transcription comes back empty.
//
// ⚠️ Whisper was not part of the P11.1 spike (only the text + image models were confirmed against this
// account) – check that a real dropped clip transcribes correctly before relying on this; see P11.13 in
// PLANNING/ROADMAP.md. The model id/input shape follows Cloudflare's documented Workers AI Whisper contract
// (`{ audio: number[] }` → `{ text }`), same as every other `@cf/...` call in this codebase.
import { safely } from './notify.js';

const API = 'https://discord.com/api/v10';
const WHISPER_MODEL = '@cf/openai/whisper';
const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const MAX_BYTES = 8e6; // 8 MB – generous for a short voice clip, keeps a huge file from stalling the cron
const RED = 0xc8352c;
const ART_PROMPT = 'football locker room after a big match, energetic crowd chants, dramatic spotlight, bold graphic sports poster style, ink black and crimson red, no text, no people';

function voiceChannel(env) {
  try { return JSON.parse(env.VOICE_CHANNEL || '{}').channel || null; } catch { return null; }
}
// Discord voice messages and plain audio uploads both show up as a normal attachment.
const isAudio = (a) => /^audio\//.test(a.content_type || '') || /\.(ogg|oga|mp3|wav|m4a|flac|webm)$/i.test(a.filename || '');

async function dget(env, path) {
  const r = await fetch(API + path, { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
  if (!r.ok) throw new Error(`discord-${r.status}`);
  return r.json();
}

async function transcribe(env, url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (!bytes.length) return null;
  const out = await env.AI.run(WHISPER_MODEL, { audio: Array.from(bytes) });
  const text = typeof out?.text === 'string' ? out.text.trim() : '';
  return text || null;
}

// The one line worth sharing – falls back to the transcript's first sentence if the text model can't pick one.
export async function bestLine(env, transcript) {
  try {
    const out = await env.AI.run(TEXT_MODEL, {
      messages: [
        { role: 'system', content: 'Pick the single most quotable, exciting sentence from this football (soccer) voice clip transcript. Reply with ONLY that sentence, verbatim, no quote marks, no extra text.' },
        { role: 'user', content: transcript.slice(0, 2000) },
      ],
      max_tokens: 80,
    });
    const text = typeof out?.response === 'string' ? out.response.trim().replace(/^["']+|["']+$/g, '') : '';
    if (text) return text.slice(0, 300);
  } catch (e) {
    console.log('voice recap best-line pick failed', e.message);
  }
  return (transcript.split(/(?<=[.!?])\s+/)[0] || transcript).slice(0, 200);
}

async function generateArt(env) {
  try {
    const out = await env.AI.run(IMAGE_MODEL, { prompt: ART_PROMPT });
    if (typeof out?.image !== 'string') return null;
    const bytes = Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
    return bytes.length > 500 ? bytes : null; // a near-empty result means the model failed
  } catch (e) {
    console.log('voice recap art failed', e.message);
    return null;
  }
}

async function postCard(env, channel, embed, art) {
  const form = new FormData();
  form.set('payload_json', JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }));
  if (art) form.set('files[0]', new Blob([art], { type: 'image/png' }), 'quote.png');
  const r = await fetch(`${API}/channels/${channel}/messages`, { method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` }, body: form });
  if (!r.ok) console.log('voice recap post failed', r.status, await r.text());
}

export async function checkVoiceRecap(env, loadSite) {
  const channel = voiceChannel(env);
  if (!channel || !env.AI || !env.DISCORD_BOT_TOKEN || !env.NOREX_KV) return { posted: false };
  let messages;
  try {
    messages = await dget(env, `/channels/${channel}/messages?limit=20`);
  } catch (e) {
    console.log('voice recap channel read failed', e.message);
    return { posted: false };
  }
  const newest = messages.find((m) => (m.attachments ?? []).some(isAudio)); // Discord returns newest-first
  if (!newest) return { posted: false };
  const last = await env.NOREX_KV.get('voice_last_id');
  if (String(newest.id) === last) return { posted: false };
  await env.NOREX_KV.put('voice_last_id', String(newest.id));
  if (last == null) return { posted: false }; // first run after deploy: remember where to start, don't process history

  const clip = newest.attachments.find(isAudio);
  if ((clip.size ?? 0) > MAX_BYTES) { console.log('voice recap skipped: clip too big', clip.size); return { posted: false }; }
  const transcript = await transcribe(env, clip.url).catch((e) => { console.log('voice recap transcription failed', e.message); return null; });
  if (!transcript) return { posted: false };

  const [quote, art] = await Promise.all([bestLine(env, transcript), generateArt(env)]);
  const club = await loadSite('club').catch(() => null);
  const embed = {
    title: '🎤 Quote of the match', color: RED,
    description: `*"${quote}"*\n— ${newest.author?.username ?? 'a member'}`,
    image: art ? { url: 'attachment://quote.png' } : undefined,
    footer: club ? { text: club.name, icon_url: club.crest } : undefined,
  };
  await safely(postCard(env, channel, embed, art));
  return { posted: true };
}
