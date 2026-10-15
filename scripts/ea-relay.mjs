// EA relay (see .github/workflows/ea-relay.yml): ask EA for a club name from Actions' network and hand the raw answer to the
// Worker, which edits the Discord reply that is waiting on it. Input comes from env so nothing user-typed reaches a shell.
import fs from 'node:fs';
import { eaGet } from '../bot/clublookup.js';
import { burnersKey } from '../bot/burners.js';

const { RELAY_REF: ref, RELAY_KIND: kind, RELAY_Q: q, DISCORD_CLIENT_SECRET: secret } = process.env;
const config = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const api = (config.members?.api ?? config.membersApi ?? '').replace(/\/$/, '');
if (!ref || !q || !secret || !api) { console.error('relay: missing input'); process.exit(1); }

let hits = null;
if (kind === 'search') hits = await eaGet('allTimeLeaderboard/search', { clubName: String(q).slice(0, 40) });
console.log(`relay ${ref}: ${kind} "${q}" → ${Array.isArray(hits) ? hits.length : 'no answer'} hit(s)`);

const res = await fetch(`${api}/api/burners/relay`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Norex-Key': await burnersKey(secret) },
  body: JSON.stringify({ ref, hits: Array.isArray(hits) ? hits.slice(0, 40) : null }),
});
console.log(`worker answered ${res.status}`);
if (!res.ok) process.exit(1);
