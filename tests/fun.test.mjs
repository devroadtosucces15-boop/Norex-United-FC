// Fun for members (bot/fun.js): /jail and /wheel with their buttons. Discord isn't involved – interactions go straight into the Worker.
import { env, call, login, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { plainText, isV2 } from '../bot/ui.js';
import { parseOptions, rng, CHARGES, TRIVIA, birthdaysOn, birthdayCheck, birthdayPanel } from '../bot/fun.js';
import { birthday } from '../bot/profiles.js';

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

// ---------- profile fields + birthdays ----------
const bd = (v) => { try { return birthday(v); } catch (e) { return e.message; } };
t('birthday: month-day only, padded; 7/14 and 07-14 both work', bd('7/14') === '07-14' && bd('12-01') === '12-01' && bd('') === '');
t('birthday: impossible dates and years are refused', /doesn’t exist/.test(bd('02-30')) && /doesn’t exist/.test(bd('13-01')) && /month and day/.test(bd('1990-07-14')));
t('birthday: 29 Feb is a real birthday', bd('2-29') === '02-29');
const sv = await call(tok, '/api/profile', { birthday: '07-14', kick: 'https://kick.com/Bash_TV/videos' });
t('profile saves kick channel and birthday', sv.s === 200 && sv.d.profile.kick === 'Bash_TV' && sv.d.profile.birthday === '07-14');
t('profile: a bad Kick name is refused', (await call(tok, '/api/profile', { kick: 'x' })).s === 400);
t('birthdays: today’s key; 29 Feb moves to 1 March in a non-leap year only', birthdaysOn(Date.UTC(2026, 6, 14, 9)).join() === '07-14' && birthdaysOn(Date.UTC(2026, 2, 1, 9)).join() === '03-01,02-29' && birthdaysOn(Date.UTC(2028, 2, 1, 9)).join() === '03-01');
const posts = [];
const post = async (e, channel, role, msg) => { posts.push({ channel, msg }); return { ok: true }; };
env.DISCORD_BOT_TOKEN = 'bot';
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('announce_channel', '42420') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
const day = Date.UTC(2026, 6, 14, 9);
t('birthday cron: nothing before 08:00 UTC', (await birthdayCheck(env, post, Date.UTC(2026, 6, 14, 7))).posted === false && posts.length === 0);
const b1 = await birthdayCheck(env, post, day);
t('birthday cron: one gold panel to the announce channel, mention without a ping', b1.posted && b1.count === 1 && posts[0].channel === '42420' && /Happy birthday/.test(plainText(posts[0].msg)) && /<@600>/.test(plainText(posts[0].msg)) && posts[0].msg.allowed_mentions.parse.length === 0);
t('birthday cron: only once a day', (await birthdayCheck(env, post, day + 36e5)).posted === false && posts.length === 1);
t('birthday cron: next day with no birthdays posts nothing', (await birthdayCheck(env, post, day + 864e5)).posted === false && posts.length === 1);
t('birthday panel: several in one post', /2 birthdays today/.test(plainText(birthdayPanel([{ user_id: '1' }, { user_id: '2' }]))));


// ---------- /trivia ----------
setFlags({ fun: 'members' });
t('trivia bank: every question has one right answer, three different wrong ones and a line for afterwards', TRIVIA.length >= 20 && TRIVIA.every((q) => q[0].endsWith('?') && q[2].length === 3 && new Set([q[1], ...q[2]]).size === 4 && q[3]));
const triv = (who, sub) => send({ type: 2, ...who, data: { name: 'trivia', options: sub ? [{ type: 1, name: sub }] : [] } });
chosen = 0;
const tq = await triv(MEMBER);
const tqRow = sqlite.prepare('SELECT * FROM fun_trivia_q ORDER BY id DESC LIMIT 1').get();
const tOrder = JSON.parse(tqRow.order_json), rightK = tOrder.indexOf(0), wrongK = (rightK + 1) % 4;
t('trivia: a public question with four lettered buttons (not revealing the answer)', tq.d.type === 4 && /Which country won the 2022/.test(plainText(tq.d.data)) && buttonIds(tq.d.data).length === 4 && !/✅/.test(plainText(tq.d.data)) && tOrder.length === 4);
const ans = (who, k, id = tqRow.id) => press(who, `norex:fun:tq:${id}:${k}`);
await tt('trivia: a right answer scores 10 points, privately, with the explanation', async () => {
  const r = await ans(as('300', 'Quick'), rightK);
  return (r.d.data.flags & 64) === 64 && /Right! \+10/.test(plainText(r.d.data)) && /3–3/.test(plainText(r.d.data));
});
await tt('trivia: a wrong answer names the right one and scores nothing', async () => {
  const r = await ans(as('301', 'Unlucky'), wrongK);
  return /Not this time/.test(plainText(r.d.data)) && plainText(r.d.data).includes('Argentina') && sqlite.prepare("SELECT points, played FROM fun_trivia_scores WHERE user_id = '301'").get().points === 0;
});
await tt('trivia: one go each', async () => /already answered/.test(plainText((await ans(as('300', 'Quick'), wrongK)).d.data)) && sqlite.prepare("SELECT points FROM fun_trivia_scores WHERE user_id = '300'").get().points === 10);
await tt('trivia: a question closes after 15 minutes', async () => {
  sqlite.prepare('UPDATE fun_trivia_q SET at = ? WHERE id = ?').run(Date.now() - 16 * 60e3, tqRow.id);
  return /Time’s up/.test(plainText((await ans(as('302', 'Late'), rightK)).d.data));
});
await tt('trivia board: ranked by points', async () => {
  const r = await triv(MEMBER, 'board');
  const txt = plainText(r.d.data);
  return /Trivia table/.test(txt) && txt.indexOf('Quick') >= 0 && txt.includes('1/1 right');
});
const fb = (await call(tok, '/api/member?u=600')).d?.fun;
t('profile fun block carries jail count, trivia points and birthday', fb?.jail === 2 && fb?.trivia === 0 && fb?.birthday === '07-14');

setFlags({ fun: 'owner' });
t('profile: no fun block while the flag is owner-only for a member', (await call(tok, '/api/member?u=600')).d?.fun === undefined);
done();
