// Per-command bot control: enabled / min role / channel limit / private-public reply / post-to + registration shape.
import { env, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { COMMANDS, buildRegistration } from '../bot/commanddefs.js';
import { cleanCommandSettings, commandBlocked, shapeReply } from '../bot/botcommands.js';
import { t, tt, done } from './lib.mjs';

env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), suggestions: 'members' });
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} });
  return res.json();
}
const slash = (name, id = '700', channel = 'c1', roles = []) => send({ type: 2, channel_id: channel, data: { name, options: [] }, member: { user: { id, username: `u${id}` }, roles } });
const save = (o) => sqlite.exec(`INSERT INTO meta (key, value) VALUES ('bot_commands', '${JSON.stringify(o)}') ON CONFLICT (key) DO UPDATE SET value = excluded.value`);

t('cleanCommandSettings drops unknown commands and bad values', JSON.stringify(cleanCommandSettings({ nope: { enabled: false }, club: { enabled: false, min: 'god', channels: ['x', '12345'], reply: 'private', postTo: 'bad' } })) === JSON.stringify({ club: { enabled: false, channels: ['12345'], reply: 'private' } }));
t('registration drops disabled commands', !buildRegistration(COMMANDS, { club: { enabled: false } }).some((c) => c.name === 'club'));
t('registration makes manager-min commands staff-only', buildRegistration(COMMANDS, { last: { min: 'manager' } }).find((c) => c.name === 'last').default_member_permissions);
t('registration leaves member-min commands visible', !buildRegistration(COMMANDS, { last: { min: 'member' } }).find((c) => c.name === 'last').default_member_permissions);

save({ club: { enabled: false } });
await tt('a switched-off command answers privately that it is off', async () => { const d = (await slash('club')).data; return /switched off/.test(d.content) && d.flags === 64; });
save({ club: { min: 'manager' } });
await tt('min role manager blocks a plain member', async () => /managers/.test((await slash('club')).data.content ?? ''));
save({ club: { channels: ['c9'] } });
await tt('channel limit blocks the wrong channel', async () => /<#c9>|Use \/club/.test((await slash('club', '700', 'c1')).data.content ?? ''));
await tt('owner is never blocked', async () => !/Use \/club|switched off/.test((await slash('club', '111', 'c1')).data?.content ?? ''));
t('commandBlocked: manager ignores channel limit', (await commandBlocked(env, 'club', { u: '1', role: 'manager' }, 'c1', { club: { channels: ['c9'] } })) === null);
const priv = await shapeReply(env, 'x', new Response(JSON.stringify({ type: 4, data: { content: 'hi' } })), { x: { reply: 'private' } });
t('shapeReply private sets flag 64', (await priv.json()).data.flags === 64);
const pub = await shapeReply(env, 'x', new Response(JSON.stringify({ type: 4, data: { content: 'hi', flags: 64 } })), { x: { reply: 'public' } });
t('shapeReply public clears flag 64', ((await pub.json()).data.flags ?? 0) === 0);
save({});
await tt('no rules → command works as before', async () => !/switched off|managers|Use \/club/.test((await slash('club')).data?.content ?? ''));
done();
