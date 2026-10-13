// Fun for members (bot/fun.js): /jail and /wheel with their buttons. Discord isn't involved – interactions go straight into the Worker.
import { env, call, login, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { plainText, isV2 } from '../bot/ui.js';
import { parseOptions, rng, CHARGES } from '../bot/fun.js';

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil: () => {} });
  return { s: res.status, d: await res.json().catch(() => null) };
}
const as = (id, name, roles = []) => ({ member: { user: { id, username: name }, roles }, channel_id: 'c1', token: 'tok' });
const jailCmd = (who, target, extra = []) => send({ type: 2, ...who, data: { name: 'jail', options: [{ name: 'member', value: target }, ...extra], resolved: { users: { [target]: { id: target, username: `user${target}` } } } } });
const wheelCmd = (who, options, question) => send({ type: 2, ...who, data: { name: 'wheel', options: [{ name: 'options', value: options }, ...(question ? [{ name: 'question', value: question }] : [])] } });
const press = (who, id) => send({ type: 3, ...who, data: { component_type: 2, custom_id: id } });
const buttonIds = (m) => { const out = []; const w = (c) => { if (!c || typeof c !== 'object') return; if (Array.isArray(c)) return c.forEach(w); if (c.custom_id) out.push(c.custom_id); w(c.components); }; w(m.components); return out; };

// ---------- pure helpers ----------
t('wheel options: commas, semicolons, new lines, duplicates and blanks tidied, capped at 12', parseOptions('Jez, Kruger;Davey\nJez,, ') .join() === 'Jez,Kruger,Davey' && parseOptions(Array.from({ length: 20 }, (_, n) => `p${n}`).join(',')).length === 12);

// ---------- flag ----------
setFlags({ fun: 'owner' });
const OWNER = as('111', 'Boss', []), MEMBER = as('500', 'Mate');
t('flag owner: a plain member is told it isn’t on yet', /switched on/.test(plainText((await jailCmd(MEMBER, '600')).d.data)));

// ---------- /jail ----------
setFlags({ fun: 'members' });
let chosen = 0; rng.pick = (n) => Math.min(chosen, n - 1);
await tt('/jail: mugshot panel in the loss colour with a charge, sentence, offence count and buttons', async () => {
  const r = await jailCmd(MEMBER, '600');
  const txt = plainText(r.d.data), panel = r.d.data.components.find((c) => c.type === 17);
  return r.d.type === 4 && isV2(r.d.data) && panel.accent_color === 0xff7d72 && txt.includes('NRX-0001') && txt.includes(CHARGES[0]) && /30 min/.test(txt) && /1st offence this month/.test(txt)
    && buttonIds(r.d.data).join() === 'norex:fun:bail:1,norex:fun:sheet:600' && /<@500>/.test(txt) && r.d.data.allowed_mentions.parse.length === 0;
});
await tt('/jail: own reason and minutes are used, second offence counted', async () => {
  const r = await jailCmd(as('501', 'Other'), '600', [{ name: 'reason', value: 'dribbling in his own box' }, { name: 'minutes', value: 5 }]);
  const txt = plainText(r.d.data);
  return txt.includes('dribbling in his own box') && /5 min/.test(txt) && /2nd offence this month/.test(txt);
});
await tt('/jail: can’t jail yourself', async () => /lock yourself up/.test(plainText((await jailCmd(MEMBER, '500')).d.data)));
await tt('/jail: five sentences a day, then the cells are full', async () => {
  const me = as('502', 'Busy');
  for (let n = 0; n < 5; n++) await jailCmd(me, `7${n}`);
  return /cells are full/.test(plainText((await jailCmd(me, '799')).d.data));
});
await tt('/jail: someone else can’t post bail, the prisoner can', async () => {
  const no = await press(as('777', 'Nosy'), 'norex:fun:bail:1');
  const yes = await press(as('600', 'Prisoner'), 'norex:fun:bail:1');
  const panel = yes.d.data.components.find((c) => c.type === 17);
  return /Only the prisoner or a manager/.test(plainText(no.d.data)) && yes.d.type === 7 && panel.accent_color === 0x4be08a && /Released/.test(plainText(yes.d.data)) && !buttonIds(yes.d.data).some((x) => x.includes('bail'));
});
await tt('/jail: bail twice → already out', async () => /Already out/.test(plainText((await press(as('600', 'Prisoner'), 'norex:fun:bail:1')).d.data)));
await tt('/jail: a manager can post bail for anyone', async () => {
  const r = await press(as('900', 'Mgr', ['mgr']), 'norex:fun:bail:2');
  return r.d.type === 7 && /Released/.test(plainText(r.d.data));
});
await tt('rap sheet: private list of offences, newest first, bailed ones marked', async () => {
  const r = await press(MEMBER, 'norex:fun:sheet:600');
  const txt = plainText(r.d.data);
  return (r.d.data.flags & 64) === 64 && /Rap sheet/.test(txt) && /2 offences/.test(txt) && /bailed/.test(txt) && txt.indexOf('NRX-0002') < txt.indexOf('NRX-0001');
});
await tt('rap sheet: clean record', async () => /Clean record/.test(plainText((await press(MEMBER, 'norex:fun:sheet:12345')).d.data)));

// ---------- /wheel ----------
await tt('/wheel: result panel in gold with every option listed and the winner marked', async () => {
  chosen = 1;
  const r = await wheelCmd(MEMBER, 'Jez, Kruger, Davey', 'Who plays GK tonight');
  const txt = plainText(r.d.data), panel = r.d.data.components.find((c) => c.type === 17);
  return panel.accent_color === 0xefcf7a && /Who plays GK tonight/.test(txt) && /## Kruger/.test(txt) && /▸ \*\*Kruger\*\*/.test(txt) && /▫ Jez/.test(txt) && /3 options/.test(txt)
    && buttonIds(r.d.data).join() === 'norex:fun:spin:1,norex:fun:rmspin:1:1';
});
await tt('/wheel: one option is not a wheel', async () => /at least two/.test(plainText((await wheelCmd(MEMBER, 'Jez')).d.data)));
await tt('spin again: same wheel, new pick, edited in place', async () => {
  chosen = 2;
  const r = await press(as('888', 'Anyone'), 'norex:fun:spin:1');
  return r.d.type === 7 && /## Davey/.test(plainText(r.d.data));
});
await tt('remove the winner and spin: the option is gone for good, down to two', async () => {
  chosen = 0;
  const r = await press(MEMBER, 'norex:fun:rmspin:1:1');
  const txt = plainText(r.d.data);
  const left = JSON.parse(sqlite.prepare('SELECT options FROM fun_wheels WHERE id = 1').get().options);
  return r.d.type === 7 && left.join() === 'Jez,Davey' && /2 options/.test(txt) && !/Kruger/.test(txt) && !buttonIds(r.d.data).some((x) => x.includes('rmspin'));
});
await tt('removing below two is refused', async () => /Two is the minimum/.test(plainText((await press(MEMBER, 'norex:fun:rmspin:1:0')).d.data)));
await tt('a wheel that no longer exists', async () => /wheel is gone/.test(plainText((await press(MEMBER, 'norex:fun:spin:999')).d.data)));

// ---------- profile ----------
const tok = await login('600', []);
const mem = (await call(tok, '/api/member?u=600')).d;
t('profile: fun.jail counts the sentences', mem?.fun?.jail === 2);
setFlags({ fun: 'owner' });
t('profile: no fun block while the flag is owner-only for a member', (await call(tok, '/api/member?u=600')).d?.fun === undefined);
done();
