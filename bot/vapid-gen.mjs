// One-off utility (roadmap BE0): generates a VAPID keypair for Web Push (RFC 8292). Run manually –
// `node bot/vapid-gen.mjs` – then put VAPID_PUBLIC_KEY in wrangler.toml [vars] (safe to commit, it's
// sent to browsers on purpose) and VAPID_PRIVATE_KEY as a GitHub Actions secret (never commit it).
// No npm dependency: crypto.createECDH gives the raw uncompressed point / raw scalar that VAPID wants,
// unlike generateKeyPairSync which would need SPKI/PKCS8 DER unwrapping first.
import crypto from 'node:crypto';

const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();
const b64url = (buf) => buf.toString('base64url');
// Private key scalar can be shorter than 32 bytes (leading zero byte dropped) – pad back to 32.
const priv = ecdh.getPrivateKey();
const privPadded = priv.length === 32 ? priv : Buffer.concat([Buffer.alloc(32 - priv.length), priv]);

console.log('VAPID_PUBLIC_KEY  =', b64url(ecdh.getPublicKey())); // 65 bytes, uncompressed point (0x04 prefix)
console.log('VAPID_PRIVATE_KEY =', b64url(privPadded)); // 32-byte scalar
