import { call, env, login, r2objects, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import { canUseTemplate, CARD_SIZE, pngSize, photoType, monthKey, generateCards, cardPrompt, CARD_MODEL } from '../bot/cardstudio.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const owner = await login('111', [], 'Boss');
const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('500', [], 'Player One');
const m2 = await login('501', [], 'Player Two');

const PNG = (w, h) => { const b = new Uint8Array(64); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); const v = new DataView(b.buffer); v.setUint32(16, w); v.setUint32(20, h); return b; };
const up = async (tok, q, bytes, type = 'image/png') => {
  const r = await W(`/api/cards/templates/upload?${q}`, { method: 'POST', headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': type }, body: bytes });
  return { s: r.status, d: await r.json().catch(() => null) };
};

t('png size reader', pngSize(PNG(1024, 768)).w === 1024 && pngSize(PNG(1024, 768)).h === 768 && pngSize(new Uint8Array(30)) === null);

setFlags({ cardStudio: 'owner' });
t('flag owner-only: member gets 404', (await call(m1, '/api/cards/templates')).s === 404);
t('flag owner-only: manager gets 404', (await call(mgr, '/api/cards/templates')).s === 404);
t('flag owner-only: owner sees it', (await call(owner, '/api/cards/templates')).s === 200);
setFlags({ cardStudio: 'members' });
t('guests refused', (await call(null, '/api/cards/templates')).s === 401);

t('member cannot upload', (await up(m1, 'kind=bg&name=Smoke', PNG(CARD_SIZE, CARD_SIZE))).s === 403);
t('bg wrong size refused', /1024×1024/.test((await up(mgr, 'kind=bg&name=Smoke', PNG(512, 512))).d.error));
t('bg must be PNG', (await up(mgr, 'kind=bg&name=Smoke', new Uint8Array(100), 'image/jpeg')).s === 400);
t('bg not a real PNG refused', (await up(mgr, 'kind=bg&name=Smoke', new Uint8Array(100))).s === 400);
t('svg refused', (await up(mgr, 'kind=bg&name=Smoke', new Uint8Array(100), 'image/svg+xml')).s === 400);
t('name required', (await up(mgr, 'kind=bg&name=', PNG(CARD_SIZE, CARD_SIZE))).s === 400);
t('pose needs a prompt fragment', (await up(mgr, 'kind=pose&name=Flex', new Uint8Array(100), 'image/jpeg')).s === 400);
t('premium needs a cost', (await up(mgr, 'kind=bg&name=Gold&tier=premium', PNG(CARD_SIZE, CARD_SIZE))).s === 400);

const free = await up(mgr, 'kind=bg&name=Smoke', PNG(CARD_SIZE, CARD_SIZE));
t('manager uploads a free background', free.s === 200 && free.d.id > 0 && r2objects.has(free.d.key) && free.d.key.startsWith('card/'));
const prem = await up(owner, 'kind=bg&name=Gold&tier=premium&cost=500', PNG(CARD_SIZE, CARD_SIZE));
t('owner uploads a premium background', prem.s === 200);
const pose = await up(mgr, 'kind=pose&name=Flex&prompt=flexing%20both%20arms', new Uint8Array(100), 'image/jpeg');
t('manager uploads a pose', pose.s === 200);
const premPose = await up(mgr, 'kind=pose&name=Trophy&tier=premium&cost=300&prompt=holding%20trophy%20overhead', new Uint8Array(100), 'image/webp');

let list = (await call(m1, '/api/cards/templates')).d;
t('member sees 2 backgrounds and 2 poses', list.backgrounds.length === 2 && list.poses.length === 2 && list.manage === false);
const pg = list.backgrounds.find((x) => x.name === 'Gold');
t('premium shows locked with its cost', pg.locked === true && pg.pointCost === 500 && pg.tier === 'premium');
t('free shows unlocked', list.backgrounds.find((x) => x.name === 'Smoke').locked === false);
t('member never sees pose prompts', list.poses.every((x) => x.prompt === undefined));
const mlist = (await call(mgr, '/api/cards/templates')).d;
t('manager sees prompts and manage flag', mlist.manage === true && mlist.poses.find((x) => x.name === 'Flex').prompt === 'flexing both arms');

const rowOf = (id) => env.DB.prepare('SELECT * FROM card_templates WHERE id = ?').bind(id).first();
t('entitlement: free is allowed', await canUseTemplate(env, '500', await rowOf(free.d.id)));
t('entitlement: premium denied without unlock', !(await canUseTemplate(env, '500', await rowOf(prem.d.id))));
t('entitlement: missing template denied', !(await canUseTemplate(env, '500', null)));

t('member cannot grant', (await call(m1, '/api/cards/grant', { user: '500', template: prem.d.id })).s === 403);
t('grant: free template rejected', (await call(mgr, '/api/cards/grant', { user: '500', template: free.d.id })).s === 400);
t('grant: unknown member', (await call(mgr, '/api/cards/grant', { user: 'ghost', template: prem.d.id })).s === 404);
t('manager grants a premium template', (await call(mgr, '/api/cards/grant', { user: '500', template: prem.d.id })).s === 200);
t('entitlement: premium allowed after grant', await canUseTemplate(env, '500', await rowOf(prem.d.id)));
t('grant is per member', !(await canUseTemplate(env, '501', await rowOf(prem.d.id))));
t('grant twice is harmless', (await call(mgr, '/api/cards/grant', { user: '500', template: prem.d.id })).s === 200);
list = (await call(m1, '/api/cards/templates')).d;
t('granted member sees it unlocked', list.backgrounds.find((x) => x.name === 'Gold').locked === false);
t('grant row recorded as grant', (await env.DB.prepare('SELECT source FROM card_unlocks WHERE user_id = ?').bind('500').first('source')) === 'grant');

t('update: deactivating hides from members', (await call(mgr, '/api/cards/templates/update', { id: free.d.id, active: false })).s === 200 && (await call(m1, '/api/cards/templates')).d.backgrounds.length === 1);
t('entitlement: inactive template denied', !(await canUseTemplate(env, '500', await rowOf(free.d.id))));
t('update: tier to premium needs a cost', (await call(mgr, '/api/cards/templates/update', { id: free.d.id, tier: 'premium' })).s === 400);
t('update: tier to premium with cost', (await call(mgr, '/api/cards/templates/update', { id: free.d.id, tier: 'premium', point_cost: 200, active: true })).s === 200 && (await call(m2, '/api/cards/templates')).d.backgrounds.find((x) => x.name === 'Smoke').pointCost === 200);
t('update: member refused', (await call(m1, '/api/cards/templates/update', { id: free.d.id, name: 'x' })).s === 403);
t('revoke removes the unlock', (await call(mgr, '/api/cards/revoke', { user: '500', template: prem.d.id })).s === 200 && !(await canUseTemplate(env, '500', await rowOf(prem.d.id))));

const served = await W(`/media/${pose.d.key}`);
t('template assets are served from /media', served.status === 200);
t('premium pose present in list', premPose.s === 200);

t('manager gets a member list for granting, members do not', (await call(mgr, '/api/cards/templates')).d.people.some((u) => u.id === '500') && (await call(m1, '/api/cards/templates')).d.people === undefined);
// ---------- member card requests (step 4) ----------
const JPG = (n = 200) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); return b; };
const reqUp = async (tok, q, bytes, type = 'image/jpeg') => {
  const r = await W(`/api/cards/request?${q}`, { method: 'POST', headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': type }, body: bytes });
  return { s: r.status, d: await r.json().catch(() => null) };
};
const photoGet = (tok, id) => W(`/api/cards/photo/${id}`, { headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
await call(mgr, '/api/cards/templates/update', { id: free.d.id, tier: 'free', active: true });
const m3 = await login('502', [], 'Player Three');
const bgId = free.d.id, poseId = pose.d.id;

t('photoType sniffs real bytes', photoType(JPG())[1] === 'jpg' && photoType(PNG(1, 1))[1] === 'png' && photoType(new Uint8Array(40)) === null);
t('monthKey is UTC YYYY-MM', monthKey(Date.UTC(2026, 9, 31, 23, 59)) === '2026-10' && monthKey(Date.UTC(2026, 10, 1)) === '2026-11');
t('guest cannot request', (await reqUp(null, `bg=${bgId}&pose=${poseId}`, JPG())).s === 401);
t('request needs a background', (await reqUp(m1, `pose=${poseId}`, JPG())).s === 400);
t('request needs a pose', (await reqUp(m1, `bg=${bgId}`, JPG())).s === 400);
t('request refuses a bg id used as pose', (await reqUp(m1, `bg=${bgId}&pose=${bgId}`, JPG())).s === 400);
t('request refuses an empty body', (await reqUp(m1, `bg=${bgId}&pose=${poseId}`, new Uint8Array(0))).s === 400);
t('request refuses non-images even with an image type', (await reqUp(m1, `bg=${bgId}&pose=${poseId}`, new Uint8Array(100))).s === 400);
t('request refuses oversize photos', (await reqUp(m1, `bg=${bgId}&pose=${poseId}`, (() => { const b = JPG(8e6 + 1); return b; })())).s === 400);
t('locked premium background refused', (await reqUp(m2, `bg=${prem.d.id}&pose=${poseId}`, JPG())).s === 403);
t('locked premium pose refused', (await reqUp(m2, `bg=${bgId}&pose=${premPose.d.id}`, JPG())).s === 403);
t('nothing was stored by the refusals', ![...r2objects.keys()].some((k) => k.startsWith('cardphoto/')));

const sent = await reqUp(m1, `bg=${bgId}&pose=${poseId}`, JPG());
t('member sends a request', sent.s === 200 && sent.d.request.status === 'pending' && sent.d.request.month === monthKey() && sent.d.request.bg === 'Smoke' && sent.d.request.pose === 'Flex');
const reqRow = await env.DB.prepare('SELECT * FROM card_requests WHERE user_id = ?').bind('500').first();
t('photo stored privately under cardphoto/, never card/', reqRow.photo_key.startsWith('cardphoto/') && r2objects.has(reqRow.photo_key));
t('private photo is not served by /media', (await W(`/media/${reqRow.photo_key}`)).status === 404);
t('second request same month refused', (await reqUp(m1, `bg=${bgId}&pose=${poseId}`, JPG())).s === 409);
t('mine returns the pending request', (await call(m1, '/api/cards/request')).d.request.status === 'pending');
t('other member sees no request of theirs', (await call(m2, '/api/cards/request')).d.request === null);
t('granted premium template can be requested', (await call(mgr, '/api/cards/grant', { user: '501', template: prem.d.id })).s === 200 && (await reqUp(m2, `bg=${prem.d.id}&pose=${poseId}`, JPG(), 'image/jpeg')).s === 200);

t('requester can view their photo', (await photoGet(m1, reqRow.id)).status === 200);
t('manager can view the photo', (await photoGet(mgr, reqRow.id)).status === 200);
t('another member cannot view it', (await photoGet(m3, reqRow.id)).status === 404);
t('guest cannot view it', (await photoGet(null, reqRow.id)).status === 401);

t('member cannot list the queue', (await call(m1, '/api/cards/requests')).s === 403);
const q1 = (await call(mgr, '/api/cards/requests')).d.requests;
t('manager queue lists both with names', q1.length === 2 && q1.every((x) => x.status === 'pending') && q1.some((x) => x.user === 'Player One' && x.bg === 'Smoke'));
t('manager was notified of the request', (await env.DB.prepare("SELECT COUNT(*) AS n FROM notifications WHERE type = 'queue' AND title = 'New card request'").first('n')) >= 1);
t('requester was not notified of their own request', (await env.DB.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = '500' AND title = 'New card request'").first('n')) === 0);

t('member cannot decide', (await call(m1, '/api/cards/requests/decide', { id: reqRow.id, decision: 'approve' })).s === 403);
t('bad decision refused', (await call(mgr, '/api/cards/requests/decide', { id: reqRow.id, decision: 'maybe' })).s === 400);
t('unknown request 404', (await call(mgr, '/api/cards/requests/decide', { id: 9999, decision: 'approve' })).s === 404);
t('reject needs a reason', (await call(mgr, '/api/cards/requests/decide', { id: reqRow.id, decision: 'reject' })).s === 400);
const rej = await call(mgr, '/api/cards/requests/decide', { id: reqRow.id, decision: 'reject', note: 'Face is too small – use a closer photo' });
t('manager rejects with a reason', rej.s === 200 && rej.d.status === 'rejected');
t('rejection deletes the private photo', !r2objects.has(reqRow.photo_key) && (await photoGet(m1, reqRow.id)).status === 404);
t('cannot decide twice', (await call(mgr, '/api/cards/requests/decide', { id: reqRow.id, decision: 'approve' })).s === 409);
const mine1 = (await call(m1, '/api/cards/request')).d.request;
t('member sees the rejection reason', mine1.status === 'rejected' && /closer photo/.test(mine1.note));
t('member was notified of the rejection', (await env.DB.prepare("SELECT body FROM notifications WHERE user_id = '500' AND type = 'card'").first('body'))?.includes('closer photo'));
const again = await reqUp(m1, `bg=${bgId}&pose=${poseId}`, JPG());
t('after a rejection the member can send a new one', again.s === 200 && again.d.request.status === 'pending' && again.d.request.id !== reqRow.id);
t('still only one row per member per month', (await env.DB.prepare("SELECT COUNT(*) AS n FROM card_requests WHERE user_id = '500'").first('n')) === 1);

const q2 = (await call(mgr, '/api/cards/requests')).d.requests;
const two = q2.find((x) => x.userId === '501');
const appr = await call(mgr, '/api/cards/requests/decide', { id: two.id, decision: 'approve' });
t('manager approves', appr.s === 200 && appr.d.status === 'approved');
t('approval keeps the photo for generation', (await env.DB.prepare('SELECT photo_key FROM card_requests WHERE id = ?').bind(two.id).first('photo_key')).startsWith('cardphoto/'));
t('member notified of the approval', (await env.DB.prepare("SELECT title FROM notifications WHERE user_id = '501' AND type = 'card'").first('title')) === 'Your card request was approved');
t('approved request blocks a new one', (await reqUp(m2, `bg=${bgId}&pose=${poseId}`, JPG())).s === 409);
t('approved request cannot be cancelled', (await call(m2, '/api/cards/request/cancel', {})).s === 404);

const pendingKey = await env.DB.prepare("SELECT photo_key FROM card_requests WHERE user_id = '500'").first('photo_key');
t('pending photo exists before cancel', r2objects.has(pendingKey));
const cancelled = await call(m1, '/api/cards/request/cancel', {});
t('member cancels a pending request', cancelled.s === 200 && cancelled.d.request === null);
t('cancel deletes the photo', !r2objects.has(pendingKey) && (await env.DB.prepare("SELECT COUNT(*) AS n FROM card_requests WHERE user_id = '500'").first('n')) === 0);
t('after cancelling the month is free again', (await reqUp(m1, `bg=${bgId}&pose=${poseId}`, JPG())).s === 200);

// ---------- generation ----------
const realAI = env.AI;
const outPng = Buffer.alloc(3000, 7); outPng.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const calls = [];
let aiMode = 'ok';
env.AI = {
  run: async (model, input) => {
    const form = await new Response(input.multipart.body, { headers: { 'content-type': input.multipart.contentType } }).formData();
    calls.push({ model, form });
    if (aiMode === 'throw') throw new Error('model busy');
    if (aiMode === 'empty') return {};
    return { image: outPng.toString('base64') };
  },
};
const row = (id) => env.DB.prepare('SELECT * FROM card_requests WHERE id = ?').bind(id).first();
const resGet = (tok, id) => W(`/api/cards/result/${id}`, { headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
const posePrompt = await env.DB.prepare('SELECT prompt FROM card_templates WHERE id = ?').bind(poseId).first('prompt');

t('prompt carries the pose fragment', cardPrompt('arms crossed').includes('arms crossed') && /image 0/i.test(cardPrompt('x')));
const pendingId = (await env.DB.prepare("SELECT id FROM card_requests WHERE user_id = '500'").first('id'));
t('pending request is not picked up', (await row(pendingId)).status === 'pending');
const settle = () => new Promise((r) => setTimeout(r, 60));
await settle();
t('approving kicks generation straight away (default mock AI returns no picture → one failed try)', (await row(two.id)).attempts === 1 && (await row(two.id)).status === 'approved');
await env.DB.prepare("UPDATE card_requests SET attempts = 0, started_at = NULL WHERE id = ?").bind(two.id).run();
calls.length = 0;
const bgBytes = r2objects.get(await env.DB.prepare('SELECT asset_key FROM card_templates WHERE id = ?').bind(bgId).first('asset_key')).buf;
const photoKey2 = (await row(two.id)).photo_key;
const g1 = await generateCards(env, { now: 1e12 });
const done2 = await row(two.id);
t('approved request is generated', g1[0] === 'done' && done2.status === 'done' && done2.attempts === 1);
t('uses the flux model with prompt, size, bg and photo', calls[0].model === CARD_MODEL && calls[0].form.get('prompt').includes(posePrompt) && calls[0].form.get('width') === '1024' && calls[0].form.get('height') === '1024');
t('background is sent as image 0 untouched', Buffer.from(await calls[0].form.get('input_image_0').arrayBuffer()).equals(bgBytes) && !!calls[0].form.get('input_image_1'));
t('result stored privately under cardresult/', done2.result_key.startsWith('cardresult/') && r2objects.get(done2.result_key).buf.equals(outPng));
t('result is not served by /media', (await W(`/media/${done2.result_key}`)).status === 404);
t('selfie is deleted once the card is made', done2.photo_key === '' && !r2objects.has(photoKey2));
t('member notified the card is ready', (await env.DB.prepare("SELECT title FROM notifications WHERE user_id = '501' AND type = 'card' ORDER BY id DESC").first('title')) === 'Your club card is ready');
t('requester sees the card', (await resGet(m2, two.id)).status === 200);
t('manager sees the card', (await resGet(mgr, two.id)).status === 200);
t('another member cannot', (await resGet(m3, two.id)).status === 404);
t('guest cannot', (await resGet(null, two.id)).status === 401);
t('member view shows done with a result', (await call(m2, '/api/cards/request')).d.request.status === 'done' && (await call(m2, '/api/cards/request')).d.request.hasResult === true);
t('done requests are not generated twice', (await generateCards(env, { now: 2e12 })).length === 0);

// retries: a failing model is tried 3 times with a pause between, then the request is marked failed
aiMode = 'throw';
await call(mgr, '/api/cards/requests/decide', { id: pendingId, decision: 'approve' });
await settle();
await env.DB.prepare("UPDATE card_requests SET attempts = 0, started_at = NULL WHERE id = ?").bind(pendingId).run();
const T0 = 3e12;
t('first failure goes back to the queue', (await generateCards(env, { now: T0 }))[0] === 'retry' && (await row(pendingId)).status === 'approved' && (await row(pendingId)).attempts === 1);
t('no immediate hammering – waits before the next try', (await generateCards(env, { now: T0 + 1000 })).length === 0);
t('second try after the pause', (await generateCards(env, { now: T0 + 3 * 60e3 }))[0] === 'retry' && (await row(pendingId)).attempts === 2);
const fin = await generateCards(env, { now: T0 + 6 * 60e3 });
const failed = await row(pendingId);
t('third failure marks it failed', fin[0] === 'failed' && failed.status === 'failed' && failed.attempts === 3 && failed.result_key === null);
t('photo is kept so a manager can retry', failed.photo_key.startsWith('cardphoto/') && r2objects.has(failed.photo_key));
t('failed requests are not tried a fourth time', (await generateCards(env, { now: T0 + 60 * 60e3 })).length === 0);
t('member told it failed', (await env.DB.prepare("SELECT title FROM notifications WHERE user_id = '500' AND type = 'card' ORDER BY id DESC").first('title')) === 'Your card could not be made');
t('managers told it failed', (await env.DB.prepare("SELECT COUNT(*) AS n FROM notifications WHERE type = 'queue' AND title = 'A card failed to generate'").first('n')) >= 1);
t('member cannot retry', (await call(m1, '/api/cards/requests/retry', { id: pendingId })).s === 403);
t('only failed requests can be retried', (await call(mgr, '/api/cards/requests/retry', { id: two.id })).s === 409);
aiMode = 'empty';
t('manager retries a failed request', (await call(mgr, '/api/cards/requests/retry', { id: pendingId })).s === 200);
await settle();
t('retry resets the count and kicks a new try', (await row(pendingId)).status === 'approved' && (await row(pendingId)).attempts === 1);
await env.DB.prepare("UPDATE card_requests SET attempts = 0, started_at = NULL WHERE id = ?").bind(pendingId).run();
t('a model reply without an image counts as a failure', (await generateCards(env, { now: T0 + 70 * 60e3 }))[0] === 'retry' && (await row(pendingId)).attempts === 1);
aiMode = 'ok';
t('succeeds on a later try', (await generateCards(env, { now: T0 + 80 * 60e3 }))[0] === 'done' && (await row(pendingId)).attempts === 2 && (await row(pendingId)).status === 'done');

// a Worker that died mid-generation: the stale claim is picked up again
await env.MEDIA.put('cardphoto/' + 'a'.repeat(32) + '.jpg', JPG(), { httpMetadata: { contentType: 'image/jpeg' } });
await env.DB.prepare("UPDATE card_requests SET status = 'generating', attempts = 1, started_at = ?, result_key = NULL, photo_key = ? WHERE id = ?").bind(T0, 'cardphoto/' + 'a'.repeat(32) + '.jpg', two.id).run();
t('a fresh claim is left alone', (await generateCards(env, { now: T0 + 60e3 })).length === 0);
t('an abandoned claim is retried', (await generateCards(env, { now: T0 + 11 * 60e3 }))[0] === 'done' && (await row(two.id)).attempts === 2 && (await row(two.id)).status === 'done');
await env.DB.prepare("UPDATE card_requests SET status = 'generating', attempts = 3, started_at = ? WHERE id = ?").bind(T0, two.id).run();
await generateCards(env, { now: T0 + 11 * 60e3 });
t('a claim that died on the last try is failed, not stuck', (await row(two.id)).status === 'failed');
env.AI = realAI;

setFlags({ cardStudio: 'owner' });
t('flag owner-only hides requests from members', (await call(m3, '/api/cards/request')).s === 404 && (await reqUp(m3, `bg=${bgId}&pose=${poseId}`, JPG())).s === 404);
setFlags({ cardStudio: 'members' });
done();
