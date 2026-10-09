// Tactics Studio + Playbook (redesign BE1): plays as a versioned document (pieces/steps/drawings/quiz) in
// R2, assignment + learned state, quiz scored server-side.
import { call, env, login } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ tactics: 'members', notifications: 'members' });

const manager = await login('900', ['mgr'], 'Coach');
const member = await login('901', [], 'Player One');
const member2 = await login('902', [], 'Player Two');

t('flag off → 404', await (async () => { setFlags({ tactics: 'off' }); const r = await call(member, '/api/plays'); setFlags({ tactics: 'members' }); return r.s === 404; })());
t('no login → 401', (await call(null, '/api/plays')).s === 401);

t('member cannot create', (await call(member, '/api/plays', { title: 'Corner routine', category: 'set-piece' })).s === 403);
let r = await call(manager, '/api/plays', { title: 'Corner routine', category: 'set-piece' });
t('manager creates a play (draft, v1, empty doc)', r.s === 200 && r.d.published === false && r.d.version === 1 && r.d.doc.pieces.length === 0);
const id = r.d.id;

t('draft is invisible to a member', (await call(member, `/api/plays/${id}`)).s === 404);
t("member's list only shows published plays", (await call(member, '/api/plays')).d.plays.every((p) => p.published));
t("manager's list includes the draft", (await call(manager, '/api/plays')).d.plays.some((p) => p.id === id));

const doc = {
  pieces: [{ id: 'k1', team: 'us', x: 500, y: 20 }, { id: 'k2', team: 'opp', x: 500, y: 60 }],
  steps: [{ at: 0, pieces: { k1: { x: 500, y: 20 } } }],
  drawings: [{ points: [[500, 20], [480, 100]], color: '#c8352c' }],
  quiz: [{ q: 'Who takes the corner?', options: ['k1', 'k2'], answer: 0 }],
};
r = await call(manager, `/api/plays/${id}`, { doc });
t('save bumps the version and keeps the doc', r.s === 200 && r.d.version === 2 && r.d.doc.pieces.length === 2);
t('save rejects a piece off the pitch', (await call(manager, `/api/plays/${id}`, { doc: { ...doc, pieces: [{ id: 'k1', team: 'us', x: 5000, y: 20 }] } })).d.doc.pieces.length === 0);
t('save rejects an unbalanced team value', (await call(manager, `/api/plays/${id}`, { doc: { ...doc, pieces: [{ id: 'k1', team: 'ref', x: 1, y: 1 }] } })).d.doc.pieces.length === 0);

{ // Studio tools: shapes survive a save, junk is trimmed
  const rich = { ...doc, pieces: [{ id: 'c1', team: 'cone', x: 100, y: 100 }, { id: 'j1', team: 'joker', x: 200, y: 200, label: 'J' }],
    drawings: [{ id: 'a1', kind: 'arrow', points: [[10, 10], [300, 200]], color: '#3aa0ff', w: 10 }, { id: 'c2', kind: 'circle', points: [[500, 300], [560, 300]], color: '#ffffff', fill: true },
      { id: 't1', kind: 'text', points: [[400, 100]], text: 'Press <here>', color: '#d4af37' }, { id: 't2', kind: 'text', points: [[400, 120]], text: '  ', color: '#d4af37' },
      { id: 'bad', kind: 'arrow', points: [[10, 10]], color: '#fff' }, { id: 'old', points: [[1, 1], [5, 5]], color: '#c8352c' }, { id: 'nk', kind: 'laser', points: [[1, 1], [5, 5]] }] };
  const r = await call(manager, `/api/plays/${id}`, { doc: rich });
  const dr = r.d.doc.drawings;
  t('studio tools: cone + joker pieces and arrow/circle/text shapes are kept', r.s === 200 && r.d.doc.pieces.length === 2 && dr.find((x) => x.id === 'a1')?.kind === 'arrow' && dr.find((x) => x.id === 'a1').w === 10 && dr.find((x) => x.id === 'c2')?.fill === true);
  t('studio tools: text is cleaned, empty text and one-point arrows are dropped', dr.find((x) => x.id === 't1')?.text === 'Press here' && !dr.some((x) => x.id === 't2' || x.id === 'bad'));
  t('studio tools: old strokes stay freehand, unknown kinds fall back to freehand', !dr.find((x) => x.id === 'old').kind && !dr.find((x) => x.id === 'nk').kind);
}
t('member still 404s before publish', (await call(member, `/api/plays/${id}`)).s === 404);
r = await call(manager, `/api/plays/${id}/publish`, { published: true, userIds: ['901'] });
t('publish + assign succeeds', r.s === 200 && r.d.published === true);

r = await call(member, `/api/plays/${id}`);
t('member sees the published play and is marked assigned', r.s === 200 && r.d.mine.assigned === true && r.d.mine.learned === false);
t("member doesn't see the quiz answers", r.d.doc.quiz[0].answer === undefined);

t('quiz: wrong answer does not mark learned', (await call(member, `/api/plays/${id}/quiz`, { answers: [1] })).d.score === 0);
t('still not learned after a wrong attempt', (await call(member, `/api/plays/${id}`)).d.mine.learned === false);
r = await call(member, `/api/plays/${id}/quiz`, { answers: [0] });
t('quiz: perfect score', r.s === 200 && r.d.score === 1 && r.d.total === 1);
t('a perfect quiz marks the play learned', (await call(member, `/api/plays/${id}`)).d.mine.learned === true);

t('a non-assigned member can still self-mark learned on a published play', (await call(member2, `/api/plays/${id}/learned`, { learned: true })).d.learned === true);
t('member cannot publish/assign/delete', (await call(member, `/api/plays/${id}/delete`, {})).s === 403);

// ================= Discord share (BE1 follow-up) =================
env.DISCORD_BOT_TOKEN = 'bot';
const dcPosts = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/guilds/9/channels')) return Response.json([{ id: '70001', name: 'tactics-room', type: 0 }]);
  if (u.endsWith('/guilds/9/roles')) return Response.json([{ id: '9', name: '@everyone' }]);
  const m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m) { dcPosts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: `pm${dcPosts.length}` }); }
  return realFetch(url, init);
};

t('member cannot see Discord targets', (await call(member, '/api/plays/discord')).s === 403);
const tg = (await call(manager, '/api/plays/discord')).d;
t('manager sees channels + roles', tg.channels[0].name === 'tactics-room' && tg.roles[0].name === '@everyone');

const draft = (await call(manager, '/api/plays', { title: 'Unpublished drill', category: 'drill' })).d;
t('cannot share an unpublished play', (await call(manager, `/api/plays/${draft.id}/discord`, { channel: '70001' })).d.error === 'Publish the play before sharing it.');
t('member cannot share', (await call(member, `/api/plays/${id}/discord`, { channel: '70001' })).s === 403);

const shared = await call(manager, `/api/plays/${id}/discord`, { channel: '70001' });
const post = dcPosts.at(-1);
t('manager shares the play as a card', shared.s === 200 && shared.d.discord?.channel === '70001' && post.embeds[0].title.includes('Corner routine'));
const btns = post.components[0].components;
t('card carries a Learned it button + an Open in Studio link', btns[0].custom_id === `norex:play:${id}:learned` && btns[0].style === 3 && btns[1].style === 5 && btns[1].url.includes(`tactics.html#play${id}`));
t('bad channel id refused', (await call(manager, `/api/plays/${id}/discord`, { channel: 'abc' })).d.error === 'Pick a channel.');

// ----- the "✅ Learned it" button itself, as a real signed Discord interaction -----
setFlags({ discordRsvp: 'members' });
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
async function press(custom_id, id2 = '903') {
  const body = JSON.stringify({ type: 3, data: { custom_id, component_type: 2 }, member: { user: { id: id2, username: `u${id2}`, global_name: `G${id2}` }, nick: `Nick ${id2}`, roles: [] } });
  const ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil() {} });
  return res.json();
}
const pressed = await press(`norex:play:${id}:learned`);
t('pressing the button marks it learned, ephemerally', pressed.type === 4 && pressed.data.flags === 64 && /Marked as learned/.test(pressed.data.content));
t('…and it sticks (visible in the manager\'s assigned list)', (await call(manager, `/api/plays/${id}`)).d.assigned.some((a) => a.user_id === '903' && a.learned === 1));
setFlags({ tactics: 'off' });
t('button refuses when the flag is off', /not switched on/.test((await press(`norex:play:${id}:learned`)).data.content));
setFlags({ tactics: 'members' });
globalThis.fetch = realFetch;

const before = (await call(manager, `/api/plays/${id}`)).d.version;
r = await call(manager, `/api/plays/${id}/restore`, { version: 1 });
t('restore makes the empty v1 doc current again, as a new version', r.s === 200 && r.d.version === before + 1 && r.d.doc.pieces.length === 0);

r = await call(manager, `/api/plays/${id}/delete`, {});
t('manager archives the play', r.s === 200);
t('archived play is gone from both lists', !(await call(manager, '/api/plays')).d.plays.some((p) => p.id === id) && (await call(manager, `/api/plays/${id}`)).s === 404);

done();
