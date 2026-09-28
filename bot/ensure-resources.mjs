// Creates the Cloudflare resources the Worker needs (once) and binds them in wrangler.toml for this deploy:
// KV namespace `norex-members` (public cache) and D1 database `norex` (member data, migrations in bot/migrations).
import fs from 'node:fs';
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
const TITLE = 'norex-members';
const api = (path, init = {}) =>
  fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }).then((r) => r.json());

const list = await api('?per_page=100');
if (!list.success) throw new Error(JSON.stringify(list.errors));
let ns = list.result.find((n) => n.title === TITLE);
if (!ns) {
  const made = await api('', { method: 'POST', body: JSON.stringify({ title: TITLE }) });
  if (!made.success) throw new Error(JSON.stringify(made.errors));
  ns = made.result;
  console.log('Created KV namespace', ns.id);
}
const file = new URL('./wrangler.toml', import.meta.url);
const toml = fs.readFileSync(file, 'utf8');
if (!toml.includes('NOREX_KV')) fs.appendFileSync(file, `\n[[kv_namespaces]]\nbinding = "NOREX_KV"\nid = "${ns.id}"\n`);
console.log('KV ready:', ns.id);

// D1 database for member data. Migrations are applied by the workflow (`wrangler d1 migrations apply`).
const D1_NAME = 'norex';
const cf = (path, init = {}) =>
  fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }).then((r) => r.json()).catch((e) => ({ success: false, errors: [{ message: e.message }] }));
const why = (res) => (res.errors || []).map((e) => `${e.code ?? ''} ${e.message}`.trim()).join('; ');

const dbs = await cf(`/d1/database?name=${D1_NAME}&per_page=100`);
if (!dbs.success) throw new Error(`D1 list failed – ${why(dbs)}`);
let db = dbs.result.find((d) => d.name === D1_NAME);
if (!db) {
  const made = await cf('/d1/database', { method: 'POST', body: JSON.stringify({ name: D1_NAME }) });
  if (!made.success) throw new Error(`D1 create failed – ${why(made)}`);
  db = made.result;
  console.log('Created D1 database', db.uuid);
}
if (!fs.readFileSync(file, 'utf8').includes('binding = "DB"')) {
  fs.appendFileSync(file, `\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "${D1_NAME}"\ndatabase_id = "${db.uuid}"\nmigrations_dir = "migrations"\n`);
}
console.log('D1 ready:', db.uuid);

// R2 bucket for feed media (P6.1, decided in R0.4): created once and bound as MEDIA. Never fails the deploy – without
// the bucket the Worker still runs and uploads answer "not set up yet".
const BUCKET = 'norex-media';
const r2 = await cf('/r2/buckets?per_page=1000');
if (!r2.success) console.log(`::warning title=R2 check::❌ R2 not ready – ${why(r2)}`);
else {
  let ok = (r2.result?.buckets ?? []).some((b) => b.name === BUCKET);
  if (!ok) {
    const made = await cf('/r2/buckets', { method: 'POST', body: JSON.stringify({ name: BUCKET }) });
    ok = made.success;
    console.log(ok ? `Created R2 bucket ${BUCKET}` : `::warning title=R2 bucket::❌ could not create ${BUCKET} – ${why(made)}`);
  }
  if (ok) {
    // Backstop for the Worker's storage guard: R2 itself deletes media older than 365 days.
    const life = await cf(`/r2/buckets/${BUCKET}/lifecycle`, { method: 'PUT', body: JSON.stringify({ rules: [{ id: 'expire-365-days', enabled: true, conditions: { prefix: '' }, deleteObjectsTransition: { condition: { type: 'Age', maxAge: 365 * 86400 } } }] }) });
    if (!life.success) console.log(`::warning title=R2 lifecycle::could not set the 365-day rule – ${why(life)}`);
    if (!fs.readFileSync(file, 'utf8').includes('binding = "MEDIA"')) fs.appendFileSync(file, `\n[[r2_buckets]]\nbinding = "MEDIA"\nbucket_name = "${BUCKET}"\n`);
    console.log(`::notice title=R2 check::✅ R2 bucket ${BUCKET} bound as MEDIA${life.success ? ' (365-day lifecycle on)' : ''}`);
  }
}
