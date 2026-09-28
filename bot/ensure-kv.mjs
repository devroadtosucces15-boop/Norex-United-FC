// Creates the Cloudflare KV namespace for member data (once) and binds it in wrangler.toml for this deploy.
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
