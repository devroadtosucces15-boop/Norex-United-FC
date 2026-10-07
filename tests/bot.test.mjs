// Discord bot: signed interactions (Ed25519) for every slash command + autocomplete, like Discord sends them.
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const env = { DISCORD_PUBLIC_KEY: Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex'), SITE_URL: 'http://localhost:4321/' };
async function send(payload, { badSig = false, raw } = {}) {
  const body = raw ?? JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': badSig ? '00'.repeat(64) : sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} });
  return { s: res.status, d: await res.json().catch(() => null) };
}
const cmd = async (name, options) => (await send({ type: 2, data: { name, options } })).d?.data;
const embed = (d) => d?.embeds?.[0];

t('bad signature → 401', (await send({ type: 1 }, { badSig: true })).s === 401);
t('ping → pong', (await send({ type: 1 })).d?.type === 1);
t('GET / health check', (await (await worker.fetch(new Request('https://bot/'), env, {})).text()).includes('running'));

// Every registered slash command must answer without an error message.
const registered = [...fs.readFileSync(ROOT + 'bot/register.mjs', 'utf8').matchAll(/\{\s*name: '(\w+)'/g)].map((m) => m[1]);
const players = JSON.parse(fs.readFileSync(ROOT + 'site/api/players.json', 'utf8')).filter((p) => p.home);
const sample = {
  club: [], last: [], site: [],
  results: [{ name: 'count', value: 3 }],
  player: [{ name: 'gamertag', value: players[0].n }],
  compare: [{ name: 'player1', value: players[0].n }, { name: 'player2', value: players[1].n }],
  top: [{ name: 'stat', value: 'rating' }],
  syncroles: null, // deferred reply – tested in discord.test.mjs (P2.5)
  schedule: null, availability: null, lineup: null, rush: null, me: null, leaderboard: null, profile: null, awards: null, // P7.4/P7.5 – need the member DB: tests/wave8.test.mjs / tests/wave13.test.mjs
  points: null, // P11.3 – needs the member DB: tests/points.test.mjs
  insights: null, // deferred reply – tested in insights.test.mjs (Club Intelligence)
  exportcontent: null, // deferred reply, owner only – DMs guide/rule/playstyle/announcement channels
  aispike: null, // deferred reply, owner only – needs the real Workers AI binding (P11.1)
  profanitysetup: null, // deferred reply, owner only – calls the real Discord AutoMod API (P11.4)
  avatarcard: null, // deferred reply, needs a resolved attachment – tests/avatarcard.test.mjs (P11.5)
  insight: null, // BE9 stored insight, flag-gated (owner) – embed + tier gate tested in tests/statinsights.test.mjs
  ask: null, // deferred reply, flag-gated + needs the real Workers AI binding – tests/ask.test.mjs (P11.11)
  burner: null, // managers only, deferred EA search + pick menus – tests/burners.test.mjs
  nextevent: null, feedback: null, suggest: null, announce: null, trial: null, motm: null, history: null, // P11.16 – need the member DB: tests/quickcommands.test.mjs
};
for (const name of Object.keys(sample)) {
  if (!registered.includes(name) || !sample[name]) continue;
  await tt(`/${name} answers with an embed`, async () => { const d = await cmd(name, sample[name]); return !!embed(d)?.title && !d.content?.startsWith('⚠️'); });
}
t('every registered command has a test here', registered.length >= 7 && registered.every((n) => n in sample));
await tt('/player unknown gamertag → friendly message', async () => { const d = await cmd('player', [{ name: 'gamertag', value: 'zz_nobody_zz' }]); return !!d.content || !!embed(d); });
await tt('/site has no repo link (P0.1)', async () => !JSON.stringify(await cmd('site', [])).includes('github.com'));
await tt('autocomplete returns choices', async () => { const r = await send({ type: 4, data: { name: 'player', options: [{ name: 'gamertag', value: players[0].n.slice(0, 3), focused: true }] } }); return r.d.type === 8 && r.d.data.choices.length > 0; });
await tt('insight opponent autocomplete lists h2h clubs by id', async () => { const h = JSON.parse(fs.readFileSync(ROOT + 'site/api/h2h.json', 'utf8')); const r = await send({ type: 4, data: { name: 'insight', options: [{ name: 'opponent', value: h[0].n.slice(0, 3).toLowerCase(), focused: true }] } }); const c = r.d.data.choices; return r.d.type === 8 && c.length > 0 && c.length <= 25 && c.some((x) => x.value === String(h[0].o)); });
t('register.mjs gives /insight an autocomplete opponent option', /name: 'opponent', description: 'Head to head[^\n]*autocomplete: true/.test(fs.readFileSync(ROOT + 'bot/register.mjs', 'utf8')));
t('unknown interaction type → 400', (await send({ type: 99 })).s === 400);
done();
