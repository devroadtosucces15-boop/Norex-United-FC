// Web Push (BE0): RFC 8291 encryption round-trip, RFC 8292 VAPID signature, endpoint allowlist, and the
// send path through notify() (only members who opted into a type get a push). The receiver below is written
// separately from bot/webpush.js on purpose, so a mistake on the sending side can't cancel itself out.
import { env, sqlite, login, config } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { encryptPayload, vapidAuth, safeEndpoint, b64u } from '../bot/webpush.js';
import { notify } from '../bot/notify.js';

const enc = new TextEncoder(), dec = new TextDecoder();
const P256 = { name: 'ECDH', namedCurve: 'P-256' };
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const hkdf = async (salt, ikm, info, len) => {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
};

// Browser side: what the push service delivers and the page's service worker decrypts.
async function receiverKeys() {
  const kp = await crypto.subtle.generateKey(P256, true, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return { priv: kp.privateKey, pub, p256dh: b64u.enc(pub), auth: b64u.enc(auth), authRaw: auth };
}
async function receive(body, r) {
  const idlen = body[20];
  const keyid = body.slice(21, 21 + idlen);
  const ct = body.slice(21 + idlen);
  const asPub = await crypto.subtle.importKey('raw', keyid, P256, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asPub }, r.priv, 256));
  const ikm = await hkdf(r.authRaw, ecdh, cat(enc.encode('WebPush: info\0'), r.pub, keyid), 32);
  const salt = body.slice(0, 16);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct));
  let end = pt.length - 1;
  while (end >= 0 && pt[end] === 0) end--; // padding is zeros, then the 0x02 delimiter
  if (pt[end] !== 2) throw new Error('missing padding delimiter');
  return dec.decode(pt.slice(0, end));
}

// 1. Encryption round-trip, header layout, and tamper detection
const r = await receiverKeys();
const msg = JSON.stringify({ title: 'Trial stage changed ⚽', body: 'Ünïcode and "quotes" survive', link: 'members.html#alerts' });
const body = await encryptPayload(msg, { p256dh: r.p256dh, auth: r.auth });
await tt('RFC 8291 round-trip: browser decrypts what the Worker encrypted', async () => (await receive(body, r)) === msg);
await tt('header: salt 16 bytes, record size 4096, 65-byte sender key id', () => {
  const rs = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0);
  return rs === 4096 && body[20] === 65 && body.length > 21 + 65 + 16;
});
await tt('fresh salt and sender key per message (same text, different bytes)', async () => {
  const again = await encryptPayload(msg, { p256dh: r.p256dh, auth: r.auth });
  return again.length === body.length && !again.every((b, i) => b === body[i]) && (await receive(again, r)) === msg;
});
await tt('tampered ciphertext is rejected (GCM tag)', async () => {
  const bad = body.slice();
  bad[bad.length - 1] ^= 1;
  return receive(bad, r).then(() => false, () => true);
});
await tt('wrong subscriber cannot decrypt', async () => {
  const other = await receiverKeys();
  return receive(body, other).then(() => false, () => true);
});
await tt('payload too large is refused before encrypting', () =>
  encryptPayload('x'.repeat(3001), { p256dh: r.p256dh, auth: r.auth }).then(() => false, () => true));

// 2. VAPID: ES256 JWT that verifies with the public key we publish in wrangler.toml
const vk = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const vjwk = await crypto.subtle.exportKey('jwk', vk.privateKey);
const vpub = new Uint8Array(await crypto.subtle.exportKey('raw', vk.publicKey));
const vEnv = { VAPID_PRIVATE_KEY: vjwk.d, VAPID_PUBLIC_KEY: b64u.enc(vpub), SITE_URL: 'https://example.test/site/' };
await tt('VAPID header verifies with the published public key and has the right aud/exp', async () => {
  const now = 1_700_000_000_000;
  const auth = await vapidAuth('https://fcm.googleapis.com/fcm/send/abc', vEnv, now);
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(auth);
  if (!m || m[4] !== vEnv.VAPID_PUBLIC_KEY) return false;
  const pub = await crypto.subtle.importKey('raw', b64u.dec(m[4]), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64u.dec(m[3]), enc.encode(`${m[1]}.${m[2]}`));
  const claims = JSON.parse(dec.decode(b64u.dec(m[2])));
  const head = JSON.parse(dec.decode(b64u.dec(m[1])));
  return ok && head.alg === 'ES256' && claims.aud === 'https://fcm.googleapis.com' && claims.exp === Math.floor(now / 1000) + 12 * 3600 && claims.sub === vEnv.SITE_URL;
});

// 3. Only the big push services are reachable
t('endpoint: FCM accepted', safeEndpoint('https://fcm.googleapis.com/fcm/send/x') !== null);
t('endpoint: Mozilla, Apple and Windows accepted', ['https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/x', 'https://wns2-by3p.notify.windows.com/w/?x'].every((u) => safeEndpoint(u)));
t('endpoint: plain http refused', safeEndpoint('http://fcm.googleapis.com/x') === null);
t('endpoint: arbitrary host refused (no SSRF)', safeEndpoint('https://evil.example/x') === null && safeEndpoint('https://fcm.googleapis.com.evil.example/x') === null);
t('endpoint: junk refused', safeEndpoint('not a url') === null);

// 4. Send path through notify(): encrypted, sent to opted-in types only, dead endpoints forgotten
const pushEnv = {
  ...env,
  VAPID_PRIVATE_KEY: vjwk.d, VAPID_PUBLIC_KEY: b64u.enc(vpub),
  FEATURES: JSON.stringify({ ...(config.features ?? {}), notifications: 'public', push: 'public' }),
};
const who = '900000000000000001';
await login(who, []);
const sub = await receiverKeys();
const ep = 'https://fcm.googleapis.com/fcm/send/member1';
sqlite.prepare('INSERT OR REPLACE INTO push_subs (endpoint, user_id, p256dh, auth, at) VALUES (?, ?, ?, ?, ?)').run(ep, who, sub.p256dh, sub.auth, Date.now());
const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://fcm.googleapis.com/')) {
    sent.push({ url: String(url), body: new Uint8Array(init.body), headers: init.headers });
    return new Response(null, { status: 201 });
  }
  return realFetch(url, init);
};
try {
  // 'claim' defaults to dm (opted in to the Discord-DM tier) → pushed.
  await notify(pushEnv, [who], { type: 'claim', title: 'Claim approved 🪪', body: 'Welcome to the squad', link: 'members.html#profile' });
  await tt('opted-in type is pushed, encrypted, and decrypts to the notification', async () => {
    if (sent.length !== 1) return false;
    const msgOut = JSON.parse(await receive(sent[0].body, sub));
    return msgOut.title === 'Claim approved 🪪' && msgOut.body === 'Welcome to the squad' && msgOut.link === 'members.html#profile' && msgOut.tag === 'norex-claim';
  });
  await tt('push request carries VAPID auth and aes128gcm headers', () => /^vapid t=/.test(sent[0].headers.Authorization) && sent[0].headers['Content-Encoding'] === 'aes128gcm');

  // Flag still owner-only for everyone else → same opted-in type sends nothing.
  const flagOff = { ...pushEnv, FEATURES: JSON.stringify({ ...(config.features ?? {}), notifications: 'public', push: 'owner' }) };
  const beforeOff = sent.length;
  await notify(flagOff, [who], { type: 'claim', title: 'Flag off' });
  t('push flag off (owner-only) → no push sent', sent.length === beforeOff);

  // 'badge' defaults to site-only → nothing pushed.
  const before = sent.length;
  await notify(pushEnv, [who], { type: 'badge', title: 'New badge', link: 'members.html#badges' });
  t('site-only type is not pushed', sent.length === before);

  // Member mutes a 'dm' type → nothing pushed (only types the member opted into).
  sqlite.prepare('INSERT OR REPLACE INTO notify_prefs (user_id, prefs, updated) VALUES (?, ?, ?)').run(who, JSON.stringify({ claim: 'off' }), Date.now());
  await notify(pushEnv, [who], { type: 'claim', title: 'Muted claim' });
  t('muted type is not pushed', sent.length === before);
  sqlite.prepare('DELETE FROM notify_prefs WHERE user_id = ?').run(who);

  // Push service says the browser is gone → subscription removed.
  sqlite.prepare('INSERT OR REPLACE INTO push_subs (endpoint, user_id, p256dh, auth, at) VALUES (?, ?, ?, ?, ?)').run('https://fcm.googleapis.com/fcm/send/gone', who, sub.p256dh, sub.auth, Date.now());
  globalThis.fetch = async (url, init) => new Response(null, { status: String(url).endsWith('/gone') ? 410 : 201 }); // no real network
  await notify(pushEnv, [who], { type: 'claim', title: 'Gone device' });
  const left = sqlite.prepare('SELECT COUNT(*) AS n FROM push_subs WHERE endpoint = ?').get('https://fcm.googleapis.com/fcm/send/gone').n;
  t('410 from the push service forgets that endpoint', left === 0);
} finally {
  globalThis.fetch = realFetch;
}

done();
