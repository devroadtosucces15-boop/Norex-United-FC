// P11.1 – AI verification spike. Owner-only /aispike: exercises the Workers AI text model and the img2img
// model once each and reports latency + success, so real findings (model id, speed, failure rate) can be
// written back into PLANNING/ROADMAP.md before the rest of Phase 11 is built on top of them. The mock server
// can't emulate Workers AI, so this has to be run against the real deployed Worker – it's a throwaway tool,
// not meant to stay a permanent command once P11.1 is closed out.
import { can } from './roles.js';

export const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct';
export const IMAGE_MODEL = '@cf/runwayml/stable-diffusion-v1-5-img2img';

// An 8x8 solid PNG – content doesn't matter, it just needs to be a real decodable image for img2img's input.
const PLACEHOLDER_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVR4nGP8z8DwHwAFVQIBAADm/g8Yf7WjfQAAAABJRU5ErkJggg==';

function toBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Workers AI image models can hand back a ReadableStream, an ArrayBuffer or a Uint8Array depending on version.
async function bytesOf(result) {
  if (result instanceof ReadableStream) return new Uint8Array(await new Response(result).arrayBuffer());
  if (result instanceof ArrayBuffer) return new Uint8Array(result);
  if (result instanceof Uint8Array) return result;
  return null;
}

async function testText(env) {
  const start = Date.now();
  try {
    const r = await env.AI.run(TEXT_MODEL, { messages: [{ role: 'user', content: 'Reply with the single word: pong' }], max_tokens: 10 });
    return { ok: true, ms: Date.now() - start, sample: String(r?.response ?? JSON.stringify(r)).slice(0, 120) };
  } catch (e) {
    return { ok: false, ms: Date.now() - start, error: e.message };
  }
}

// Retries once – the model is beta and occasionally returns a near-empty/black image.
async function testImage(env) {
  const image = [...toBytes(PLACEHOLDER_PNG_B64)];
  let last;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const start = Date.now();
    try {
      const out = await bytesOf(await env.AI.run(IMAGE_MODEL, { prompt: 'club crest emblem, bold graphic style', image, strength: 0.8 }));
      const ok = !!out && out.length > 500; // a failed/black result comes back tiny
      last = { ok, ms: Date.now() - start, bytes: out?.length ?? 0, attempt };
    } catch (e) {
      last = { ok: false, ms: Date.now() - start, error: e.message, attempt };
    }
    if (last.ok) break;
  }
  return last;
}

export async function runSpike(env, who) {
  if (!can(who, 'settings.bot')) throw new Error('Owner only.');
  if (!env.AI) throw new Error('The AI binding is missing – add [ai]\\nbinding = "AI" to bot/wrangler.toml and redeploy.');
  const [text, image] = await Promise.all([testText(env), testImage(env)]);
  return { text, image };
}

// Formats the spike result for a Discord message.
export function spikeReport({ text, image }) {
  const line = (label, r, model) => r.ok
    ? `✅ ${label} (\`${model}\`) – ${r.ms} ms${r.sample ? ` – "${r.sample}"` : ''}${r.attempt === 2 ? ' (needed a retry)' : ''}`
    : `❌ ${label} (\`${model}\`) – ${r.ms} ms – ${r.error ?? 'failed'}${r.attempt === 2 ? ' (failed twice)' : ''}`;
  return [line('Text model', text, TEXT_MODEL), line('Image model', image, IMAGE_MODEL)].join('\n');
}
