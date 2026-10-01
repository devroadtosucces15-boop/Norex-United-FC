// Avatar card backend (P11.5, Discord side only – the web card page is a follow-up, see the roadmap):
// upload validation, AI background generation, R2 storage under the feed's key scheme, and re-upload (upsert).
import { call, env, login } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { makeAvatarCard, myAvatarCard } from '../bot/avatarcard.js';
import { serveMedia } from '../bot/media.js';
import worker from '../bot/worker.js';

const UID = '901000000000000001';
const wrapped = globalThis.fetch;
globalThis.fetch = async (url, init) => (String(url).startsWith('https://cdn.example/') ? new Response(new Uint8Array(2000), { status: 200 }) : wrapped(url, init));
env.AI = { run: async () => ({ image: Buffer.from('a'.repeat(600)).toString('base64') }) };

const attach = (over = {}) => ({ content_type: 'image/png', size: 1000, url: 'https://cdn.example/a.png', ...over });

await tt('rejects an unsupported content type', async () => { try { await makeAvatarCard(env, UID, attach({ content_type: 'image/svg+xml' })); return false; } catch (e) { return /PNG, JPG or WEBP/.test(e.message); } });
await tt('rejects a file over the size limit', async () => { try { await makeAvatarCard(env, UID, attach({ size: 9e6 })); return false; } catch (e) { return /too big/.test(e.message); } });
await tt('missing AI binding gives a clear error', async () => { try { await makeAvatarCard({ ...env, AI: undefined }, UID, attach()); return false; } catch (e) { return /AI binding/.test(e.message); } });

await tt('a good upload stores a photo + AI background and rows the member', async () => {
  const { photoKey, bgKey } = await makeAvatarCard(env, UID, attach());
  const row = await myAvatarCard(env, UID);
  return row.photo_key === photoKey && row.bg_key === bgKey && photoKey !== bgKey;
});

await tt('both images are actually servable at /media/<key>', async () => {
  const row = await myAvatarCard(env, UID);
  const [photo, bg] = await Promise.all([
    serveMedia(new Request('https://x/media/' + row.photo_key), env, row.photo_key),
    serveMedia(new Request('https://x/media/' + row.bg_key), env, row.bg_key),
  ]);
  return photo.status === 200 && bg.status === 200;
});

await tt('uploading again replaces the row rather than adding a second one', async () => {
  const first = await myAvatarCard(env, UID);
  await makeAvatarCard(env, UID, attach());
  const second = await myAvatarCard(env, UID);
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM avatar_cards WHERE user_id = ?').bind(UID).first('n');
  return count === 1 && second.photo_key !== first.photo_key;
});

// ---------- web half: GET /api/avatarcard (P11.5) ----------
const owner = await login('111', [], 'Founder 👑');
const member = await login('500', [], 'Winger');
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };

setFlags({ avatarCard: 'owner' });
t('hidden from members while the flag is owner-only', (await call(member, '/api/avatarcard')).s === 404);
let r = await call(owner, '/api/avatarcard');
t('owner with no card yet gets card: null', r.s === 200 && r.d.card === null);

await makeAvatarCard(env, '111', attach());
r = await call(owner, '/api/avatarcard');
t('owner with a card gets its photo/bg keys', r.s === 200 && r.d.card.photoKey && r.d.card.bgKey);

setFlags({ avatarCard: 'members' });
t('members see their own card once the flag opens up', (await call(member, '/api/avatarcard')).s === 200);

// ---------- /avatarcard Discord command respects the flag too (not just the web route) ----------
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
env.DISCORD_BOT_TOKEN = 'bot';
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} });
  return { s: res.status, d: await res.json().catch(() => null) };
}
const slash = (id) => ({ type: 2, token: 'tok', member: { user: { id }, roles: [] }, data: { name: 'avatarcard', options: [] } });

setFlags({ avatarCard: 'owner' });
t('/avatarcard locked for a member while the flag is owner-only', /Not switched on/.test((await send(slash('500'))).d.data.content));
setFlags({ avatarCard: 'members' });
t('/avatarcard reachable for a member once the flag opens up (missing attachment → prompts for one, not locked)', /Attach an image/.test((await send(slash('500'))).d.data.content));

globalThis.fetch = wrapped;
done();
