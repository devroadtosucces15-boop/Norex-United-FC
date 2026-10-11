// /panel (bot/panel.js) – the manager panel in Discord: what's waiting, and approve / reject in place through the Squad
// Hub's own routes (members.js apiAs). Discord is stubbed.
import { env, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { plainText, images } from '../bot/ui.js';

env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), cardStudio: 'members', rushLog: 'members', requests: 'public', suggestions: 'members' });
env.DISCORD_BOT_TOKEN = 'bot';
env.PUBLIC_URL = 'https://bot.example';
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => (String(url).startsWith('https://discord.com/') ? new Response(null, { status: 204 }) : realFetch(url, init));

const now = Date.now();
sqlite.exec(`INSERT INTO users (id, name, avatar, first_at, last_at) VALUES ('950', 'Claimer', 'https://cdn/u950.png', ${now}, ${now}), ('951', 'Painter', null, ${now}, ${now}), ('952', 'Rusher', null, ${now}, ${now})`);
sqlite.exec(`INSERT INTO claims (user_id, player, player_name, status, at, name) VALUES ('950', 'pk950', 'x_Claimer_x', 'pending', ${now - 6e4}, 'Claimer')`);
sqlite.exec(`INSERT INTO card_requests (user_id, month, bg_id, pose_id, photo_key, status, created_at) VALUES ('951', '2026-10', 1, 1, 'photos/p951.jpg', 'pending', ${now})`);
sqlite.exec(`INSERT INTO rush_matches (date, opponent, gf, ga, status, by_id, by_name, at) VALUES ('2026-10-10', 'Rush FC', 3, 1, 'pending', '952', 'Rusher', ${now})`);
sqlite.exec(`INSERT INTO requests (kind, subject, status, by_id, by_name, at) VALUES ('club', 'Shortsquad', 'pending', '952', 'Rusher', ${now})`);
sqlite.exec(`INSERT INTO suggestions (title, body, by_id, by_name, at) VALUES ('Friday scrims', 'Every week please', '952', 'Rusher', ${now})`);

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  return (await worker.fetch(new Request('https://bot.example/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} })).json();
}
const as = (id, roles = []) => ({ member: { user: { id, username: `u${id}` }, roles }, channel_id: '700100', token: 'tok' });
const MGR = as('960', ['mgr']);
const press = (custom_id, who = MGR) => send({ type: 3, data: { custom_id }, ...who });
const ids = (d) => (JSON.stringify(d).match(/"custom_id":"[^"]+"/g) ?? []).map((x) => x.slice(13, -1));
const txt = (r) => plainText(r.data);

t('/panel is managers only', /Managers only/.test(txt(await send({ type: 2, data: { name: 'panel' }, ...as('950') }))));
const home = await send({ type: 2, data: { name: 'panel' }, ...MGR });
t('/panel: private, every queue with its count', home.type === 4 && (home.data.flags & 64) === 64 && /5 waiting for a decision/.test(txt(home))
  && ['claims', 'cards', 'rush', 'requests', 'ideas'].every((k) => ids(home.data).includes(`norex:mp:q:${k}`)));

let r = await press('norex:mp:q:claims');
t('claims queue: updates the same message, a row with their face, Approve / Reject', r.type === 7 && /says they play as \*\*x_Claimer_x/.test(txt(r)) && images(r.data).includes('https://cdn/u950.png')
  && ids(r.data).includes('norex:mp:a:claims:950:approve') && ids(r.data).includes('norex:mp:a:claims:950:reject'));
r = await press('norex:mp:a:claims:950:approve');
t('approve → the claim is approved through the Hub route, the panel says so', sqlite.prepare("SELECT status FROM claims WHERE user_id = '950'").get().status === 'approved' && /Claim approved/.test(txt(r)) && /All clear/.test(txt(r)));
t('…and the member got the Hub’s notification', !!sqlite.prepare("SELECT * FROM notifications WHERE user_id = '950' AND type = 'claim'").get());

r = await press('norex:mp:q:cards');
t('cards queue shows the uploaded photo', images(r.data).includes('https://bot.example/media/photos/p951.jpg') && ids(r.data).some((x) => /^norex:mp:r:cards:\d+:reject$/.test(x)));
const cardId = sqlite.prepare("SELECT id FROM card_requests WHERE user_id = '951'").get().id;
r = await press(`norex:mp:r:cards:${cardId}:reject`);
t('reject a card → a form asking what to fix (required)', r.type === 9 && r.data.components[0].components[0].required === true);
r = await send({ type: 5, data: { custom_id: `norex:mp:r:cards:${cardId}:reject`, components: [{ type: 1, components: [{ type: 4, custom_id: 'why', value: 'Face is too dark' }] }] }, ...MGR });
const card = sqlite.prepare('SELECT status, note FROM card_requests WHERE id = ?').get(cardId);
t('…sending it rejects with that reason', r.type === 7 && card.status === 'rejected' && card.note === 'Face is too dark' && /told what to fix/.test(txt(r)));

const rushId = sqlite.prepare("SELECT id FROM rush_matches WHERE opponent = 'Rush FC'").get().id;
r = await press(`norex:mp:a:rush:${rushId}:confirm`);
t('Rush result confirmed', sqlite.prepare('SELECT status FROM rush_matches WHERE id = ?').get(rushId).status === 'confirmed' && /Confirmed/.test(txt(r)));
const reqId = sqlite.prepare("SELECT id FROM requests WHERE subject = 'Shortsquad'").get().id;
await press(`norex:mp:a:requests:${reqId}:approve`);
t('club request approved', sqlite.prepare('SELECT status FROM requests WHERE id = ?').get(reqId).status === 'approved');
const ideaId = sqlite.prepare("SELECT id FROM suggestions WHERE title = 'Friday scrims'").get().id;
r = await press(`norex:mp:a:ideas:${ideaId}:planned`);
t('idea marked planned', sqlite.prepare('SELECT status FROM suggestions WHERE id = ?').get(ideaId).status === 'planned' && /planned/.test(txt(r)));
r = await press('norex:mp:a:claims:950:approve');
t('pressing an old button again → the Hub route decides (re-approving is harmless), the panel still renders', r.type === 7 && /Player claims/.test(txt(r)));
t('back to the panel: all clear', /All clear – nothing waiting/.test(txt(await press('norex:mp:home'))));
await tt('a member pressing a panel button is refused', async () => /Managers only/.test(txt(await press('norex:mp:q:claims', as('950')))));

globalThis.fetch = realFetch; // the login round trip needs the mock's own Discord OAuth stub
const { W, login } = await import('./mock.mjs');
await tt('GET /api/manager/queue: the same counts, managers only', async () => {
  const mgr = await login('961', ['mgr']), member = await login('962');
  const q = await (await W('/api/manager/queue', { headers: { Authorization: `Bearer ${mgr.token ?? mgr}` } })).json();
  const no = await W('/api/manager/queue', { headers: { Authorization: `Bearer ${member.token ?? member}` } });
  return Number.isInteger(q.claims) && q.ideas === 0 && q.rush === 0 && typeof q.at === 'number' && no.status === 403;
});
globalThis.fetch = realFetch;
done();
