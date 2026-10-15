// Web Push for the Worker (roadmap BE0): RFC 8291 payload encryption (aes128gcm) and RFC 8292 VAPID (ES256 JWT).
// WebCrypto only – zero npm dependencies. The encrypted body and Authorization header go to the browser's push service.
//   encryptPayload(text, { p256dh, auth })  → Uint8Array request body
//   vapidAuth(endpoint, env)                → Authorization header value
//   sendPush(endpoint, body, env)           → HTTP status from the push service
//   safeEndpoint(url)                       → the URL if it is https on a known push service, else null
const enc = new TextEncoder();
const RS = 4096; // record size we advertise (RFC 8188 header)
const MAX_PLAIN = 3000; // keeps one record well under RS

export const b64u = {
  dec(s) {
    const pad = '='.repeat((4 - (s.length % 4)) % 4);
    return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad), (c) => c.charCodeAt(0));
  },
  enc(buf) {
    let s = '';
    for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
};
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
// HKDF (RFC 5869) extract + expand in one WebCrypto call.
const hkdf = async (salt, ikm, info, len) => {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
};
const P256 = { name: 'ECDH', namedCurve: 'P-256' };

// RFC 8291 §3–4. `salt` and `asKey` are injectable so tests can pin the randomness; production leaves them out.
export async function encryptPayload(text, { p256dh, auth }, { salt, asKey } = {}) {
  const plain = enc.encode(text);
  if (plain.length > MAX_PLAIN) throw new Error('payload too large');
  const uaPublic = b64u.dec(p256dh); // browser's key, 65 bytes
  const authSecret = b64u.dec(auth); // 16 bytes
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, P256, false, []);
  const as = asKey ?? await crypto.subtle.generateKey(P256, true, ['deriveBits']); // our one-off sender key
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  // IKM = HKDF(salt = auth secret, ikm = ECDH secret, info = "WebPush: info\0" || ua public || as public)
  const keyInfo = cat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdh, keyInfo, 32);
  const s = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(s, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(s, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // One record: payload || 0x02 (last-record padding delimiter), then GCM tag (appended by WebCrypto).
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(plain, Uint8Array.of(2))));
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, RS);
  // RFC 8188 header: salt(16) || record size(4) || keyid length(1) || keyid (our public key) || record
  return cat(s, rs, Uint8Array.of(asPublic.length), asPublic, ct);
}

let vapidKey = null; // imported once per isolate
let vapidKeySrc = null;
async function vapidPrivate(env) {
  if (vapidKey && vapidKeySrc === env.VAPID_PRIVATE_KEY) return vapidKey;
  const pub = b64u.dec(env.VAPID_PUBLIC_KEY); // 0x04 || x || y
  vapidKey = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE_KEY, x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), ext: true,
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  vapidKeySrc = env.VAPID_PRIVATE_KEY;
  return vapidKey;
}

// RFC 8292: JWT signed ES256 (raw r||s signature, which WebCrypto returns by default). Valid 12 h.
export async function vapidAuth(endpoint, env, now = Date.now()) {
  const header = b64u.enc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u.enc(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + 12 * 3600,
    sub: env.SITE_URL, // a https: contact URL, as the spec asks
  })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await vapidPrivate(env), enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64u.enc(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

export async function sendPush(endpoint, body, env) {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(endpoint, env),
      TTL: '86400',
      Urgency: 'normal',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
    },
    body,
  });
  return r.status;
}

// Only the big browser push services are reachable. Stops a member from making the Worker POST to any URL.
const PUSH_HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
export function safeEndpoint(u) {
  try {
    const x = new URL(String(u));
    return x.protocol === 'https:' && PUSH_HOSTS.test(x.hostname) ? x.href : null;
  } catch { return null; }
}
