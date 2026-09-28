// P7.2 "Show my match" (select menu + My match button on results) and P2.5 Verified role sync (+ /syncroles).
import { call, DB, env, login, siteJson } from './mock.mjs';
import worker from '../bot/worker.js';
import { matchComponents } from '../bot/matchcard.js';
import { positionGroup, syncMember } from '../bot/discordroles.js';
import { t, tt, done } from './lib.mjs';

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
env.DISCORD_BOT_TOKEN = 'bot';
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ discordMatch: 'owner', roleSync: 'owner' });
let pending = [];
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil: (p) => pending.push(p) });
  return { s: res.status, d: await res.json().catch(() => null) };
}
const as = (id, roles = []) => ({ member: { user: { id }, roles } });

// Fake Discord guild for role sync: roles + members; every call is recorded.
const calls = [];
const guild = { roles: [{ id: 'r-ver', name: '✅ Verified' }, { id: 'r-mid', name: 'MID' }, { id: 'r-fwd', name: 'fwd' }], members: { u1: ['r-fwd'], 222: [] } };
let denyRoles = false;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), method = init.method ?? 'GET';
  const g = u.match(/^https:\/\/discord\.com\/api\/v10\/guilds\/9\/(.*)$/);
  if (g) {
    calls.push(`${method} ${g[1]}`);
    if (g[1] === 'roles' && method === 'GET') return Response.json(guild.roles);
    if (g[1] === 'roles' && method === 'POST') { const r = { id: 'r-new', ...JSON.parse(init.body) }; guild.roles.push(r); return Response.json(r); }
    const mm = g[1].match(/^members\/(\w+)(?:\/roles\/([\w-]+))?$/);
    if (mm && !(mm[1] in guild.members)) return Response.json({ code: 10007 }, { status: 404 });
    if (mm && !mm[2]) return Response.json({ roles: guild.members[mm[1]] });
    if (mm && denyRoles) return Response.json({ code: 50013, message: 'Missing Permissions' }, { status: 403 });
    if (mm && method === 'PUT') { guild.members[mm[1]].push(mm[2]); return new Response(null, { status: 204 }); }
    if (mm && method === 'DELETE') { guild.members[mm[1]] = guild.members[mm[1]].filter((x) => x !== mm[2]); return new Response(null, { status: 204 }); }
  }
  if (u.includes('/webhooks/')) { calls.push(`PATCH reply ${JSON.parse(init.body).content}`); return Response.json({}); }
  if (u.endsWith('/users/@me/channels') || /\/channels\/[\w-]+\/messages$/.test(u)) return Response.json({ id: 'x' }); // P7.1 DMs
  return realFetch(url, init);
};

// ---------- P7.2 ----------
const club = siteJson('club');
const m = club.matches.find((x) => x.ps?.length >= 2);
const comps = matchComponents(m.id, m.ps, m.url);
const select = comps[0].components[0];
t('menu: select with one option per player, ≤25, ids ≤100', select.type === 3 && select.options.length === Math.min(25, m.ps.length) && select.custom_id === `norex:mm:${m.id}` && select.options.every((o) => o.label && o.value.length <= 100));
t('menu: My match button + match page link', comps[1].components[0].custom_id === `norex:mme:${m.id}` && comps[1].components[1].url === m.url);
t('club.json ps carries passes/tackles for the card', m.ps.every((p) => 'pm' in p && 'ta' in p && 'g' in p));

const pick = (who, k, id = m.id) => send({ type: 3, ...who, data: { component_type: 3, custom_id: `norex:mm:${id}`, values: [k] } });
const mine = (who, id = m.id) => send({ type: 3, ...who, data: { component_type: 2, custom_id: `norex:mme:${id}` } });
const line = m.ps[0];

await tt('owner picks a player → ephemeral card with rating + passes', async () => {
  const d = (await pick(as('111'), line.k)).d;
  const e = d.data.embeds?.[0];
  return d.type === 4 && d.data.flags === 64 && e.title.startsWith(line.n) && e.fields.some((f) => f.name.includes('Rating')) && e.fields.some((f) => f.name.includes('Passes')) && !e.author;
});
await tt('flag owner: a plain member gets "coming soon"', async () => (await pick(as('500'), line.k)).d.data.content.includes('🔒'));
await tt('My match without a claim → how to link it', async () => (await mine(as('111'))).d.data.content.includes('Squad Hub'));
DB.prepare("INSERT INTO claims (user_id, player, player_name, status, at, name) VALUES ('111', ?, ?, 'approved', 1, 'Boss')").bind(m.ps[1].k, m.ps[1].n).run();
await tt('My match with an approved claim → own card, marked verified', async () => { const e = (await mine(as('111'))).d.data.embeds[0]; return e.title.startsWith(m.ps[1].n) && e.author?.name.includes('verified'); });
await tt('picking my own player also shows "your verified player"', async () => (await pick(as('111'), m.ps[1].k)).d.data.embeds[0].author?.name.includes('verified'));
await tt('player not in that match → friendly note', async () => (await pick(as('111'), 'nobody')).d.data.content.includes("didn't play"));
await tt('unknown / old match → link to the match page', async () => (await pick(as('111'), line.k, '1')).d.data.content.includes('matches/1.html'));
await tt('/last: owner gets the menu, members do not (flag owner)', async () => {
  const o = (await send({ type: 2, ...as('111'), data: { name: 'last' } })).d.data, p = (await send({ type: 2, ...as('500'), data: { name: 'last' } })).d.data;
  return o.components?.[0]?.components[0].custom_id === `norex:mm:${club.matches[0].id}` && !p.components && !!p.embeds;
});
setFlags({ discordMatch: 'members' });
await tt('flag members: plain member can use the menu', async () => !!(await pick(as('500'), line.k)).d.data.embeds);
DB.prepare("DELETE FROM claims WHERE user_id = '111'").run();

// ---------- P2.5 ----------
t('position groups', positionGroup('CM') === 'MID' && positionGroup('ST') === 'FWD' && positionGroup('GK') === 'GK' && positionGroup('—') === null);
calls.length = 0;
let r = await syncMember(env, 'u1', true, 'CM');
t('approve: Verified + MID added, old FWD removed', r.ok && guild.members.u1.sort().join() === 'r-mid,r-ver' && calls.includes('PUT members/u1/roles/r-ver'));
calls.length = 0;
r = await syncMember(env, 'u1', true, 'CM');
t('re-sync with nothing to change → no role calls', r.ok && !calls.some((c) => c.startsWith('PUT') || c.startsWith('DELETE')));
r = await syncMember(env, 'u1', false);
t('unlink: every managed role removed', r.ok && guild.members.u1.length === 0);
t('Verified role id remembered in D1 meta', (await DB.prepare("SELECT value FROM meta WHERE key = 'verified_role'").first('value')) === 'r-ver');
t('member who left the server → not-in-server, no crash', (await syncMember(env, 'gone', true, 'ST')).error === 'not-in-server');
denyRoles = true;
r = await syncMember(env, 'u1', true, 'ST');
t('bot role too low → missing-permission recorded', r.error === 'missing-permission' && JSON.parse(await DB.prepare("SELECT value FROM meta WHERE key = 'rolesync'").first('value')).ok === false);
denyRoles = false;
guild.roles = guild.roles.filter((x) => x.id !== 'r-ver');
await DB.prepare("DELETE FROM meta WHERE key = 'verified_role'").run();
calls.length = 0;
await syncMember(env, 'u1', true, 'ST');
t('no Verified role in the server → bot creates it once', calls.includes('POST roles') && guild.members.u1.includes('r-new'));

// Claim decision in the portal syncs roles (owner acting, flag owner).
const owner = await login('111', [], 'Founder 👑');
const mgr = await login('600', ['mgr'], 'Coach');
await call(owner, '/api/me'); // runs the one-time KV → D1 copy (seeded pending claim for 222)
calls.length = 0;
await tt('owner approves a claim → 222 gets Verified', async () => (await call(owner, '/api/admin/claims', { user: '222', action: 'approve' })).s === 200 && guild.members['222'].includes('r-new'));
await tt('owner unlinks → role removed', async () => (await call(owner, '/api/admin/claims', { user: '222', action: 'unlink' })).s === 200 && !guild.members['222'].includes('r-new'));
await DB.prepare("UPDATE claims SET status = 'approved' WHERE user_id = '222'").run();
calls.length = 0;
await tt('flag owner: a manager decision does not touch Discord yet', async () => (await call(mgr, '/api/admin/claims', { user: '222', action: 'unlink' })).s === 200 && !calls.length);

// /syncroles
await tt('/syncroles: plain member → 🔒', async () => (await send({ type: 2, ...as('500'), data: { name: 'syncroles' } })).d.data.content.includes('🔒'));
pending = []; calls.length = 0;
await tt('/syncroles as owner → deferred, then a summary', async () => {
  const d = (await send({ type: 2, token: 'tok', ...as('111'), data: { name: 'syncroles' } })).d;
  await Promise.all(pending);
  return d.type === 5 && d.data.flags === 64 && calls.some((c) => c.startsWith('PATCH reply 🪪 **Role sync done**'));
});
done();
