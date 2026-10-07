// Tactics Studio recordings (redesign BE1): raw video/voice-over upload (managers), list + file (members who can
// see the play), hide (managers). Flag `tactics`.
import { call, env, login, W, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ tactics: 'members' });

const manager = await login('910', ['mgr'], 'Coach');
const member = await login('911', [], 'Player Three');
const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4]);
const up = (tok, kind, body = bytes, type = 'video/webm', len) => W(`/api/plays/${id}/media?kind=${kind}`, {
  method: 'POST',
  headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': type, 'Content-Length': String(len ?? body.byteLength) },
  body,
});

const r = await call(manager, '/api/plays', { title: 'Overlap run', category: 'drill' });
const id = r.d.id;

t('flag off → 404 on upload', await (async () => { setFlags({ tactics: 'off' }); const x = await up(manager, 'video'); setFlags({ tactics: 'members' }); return x.status === 404; })());
t('guest upload → 401', (await up(null, 'video')).status === 401);
t('member upload → 403', (await up(member, 'video')).status === 403);
t('wrong kind for the type → 415', (await up(manager, 'voice', bytes, 'video/webm')).status === 415);
t('unknown type (html) → 415', (await up(manager, 'video', bytes, 'text/html')).status === 415);
t('voice over the 10 MB cap → 413 before reading', (await up(manager, 'voice', bytes, 'audio/webm', 11e6)).status === 413);
t('empty body → 411', (await up(manager, 'video', new Uint8Array(0), 'video/webm')).status === 411);

const ok = await up(manager, 'video');
const okJson = await ok.json();
t('manager uploads a video → ready media row', ok.status === 200 && okJson.media.kind === 'video' && okJson.media.size === bytes.byteLength);
const vid = okJson.media.id;
const voice = await (await up(manager, 'voice', new Uint8Array([9, 9, 9]), 'audio/webm')).json();
t('voice-over uploads alongside the video', !!voice.media?.id && voice.media.kind === 'voice');
t('row is ready in D1, file is in R2 under play/<id>/m/', sqlite.prepare("SELECT status, key FROM play_media WHERE id = ?").get(vid)?.status === 'ready' && sqlite.prepare("SELECT key FROM play_media WHERE id = ?").get(vid)?.key.startsWith(`play/${id}/m/`));

t('draft: member cannot list recordings', (await call(member, `/api/plays/${id}/media`)).s === 404);
await call(manager, `/api/plays/${id}/publish`, { published: true, userIds: ['911'] });
const list = await call(member, `/api/plays/${id}/media`);
t('published + assigned: member lists both recordings', list.s === 200 && list.d.media.length === 2);
const file = await W(`/api/plays/${id}/media/${vid}`, { headers: { Authorization: 'Bearer ' + member } });
const got = new Uint8Array(await file.arrayBuffer());
t('member streams the file back byte-for-byte with its type', file.status === 200 && file.headers.get('Content-Type') === 'video/webm' && got.length === bytes.length && got.every((b, i) => b === bytes[i]));
t('guest cannot read the file', (await W(`/api/plays/${id}/media/${vid}`)).status === 401);

// ---- send a recording to Discord (C8) ----
env.DISCORD_BOT_TOKEN = 'bot'; env.DISCORD_GUILD_ID = '9';
const dc = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const m = String(url).match(/\/channels\/(\w+)\/messages$/);
  if (!m) return realFetch(url, init);
  const isForm = init.body instanceof FormData;
  dc.push({ channel: m[1], form: isForm, ...(isForm ? { json: JSON.parse(init.body.get('payload_json')), file: init.body.get('files[0]') } : JSON.parse(init.body)) });
  return Response.json({ id: 'm' + dc.length });
};
const share = (tok, mid, b) => call(tok, `/api/plays/${id}/media/${mid}/discord`, b);
t('member cannot send a recording to Discord', (await share(member, vid, { channel: '70001' })).s === 403);
t('bad channel refused', (await share(manager, vid, { channel: 'abc' })).d.error === 'Pick a channel.');
const sent = await share(manager, vid, { channel: '70001', role: '123' });
const post = dc.at(-1);
t('manager sends the video as a real attachment with an Open in Studio button', sent.s === 200 && sent.d.attached === true && post.form && post.file.size === bytes.length && post.json.components[0].components[0].style === 5 && post.json.content === '<@&123>');
t('attachment filename keeps the play title + extension', post.file.name === 'Overlap-run.webm');
sqlite.prepare('UPDATE play_media SET size = 30000000 WHERE id = ?').run(voice.media.id);
const big = await share(manager, voice.media.id, { channel: '70001' });
t('over 25 MB → link card instead of an attachment', big.s === 200 && big.d.attached === false && !dc.at(-1).form && dc.at(-1).embeds[0].description.includes('Too big'));
sqlite.prepare('UPDATE play_media SET size = 3 WHERE id = ?').run(voice.media.id);
globalThis.fetch = realFetch;

t('member cannot hide a recording', (await call(member, `/api/plays/${id}/media/${vid}/delete`, {})).s === 403);
t('manager hides the video → gone from the list', (await call(manager, `/api/plays/${id}/media/${vid}/delete`, {})).s === 200 && (await call(member, `/api/plays/${id}/media`)).d.media.length === 1);
t('hidden row is kept, not hard-deleted', sqlite.prepare('SELECT deleted FROM play_media WHERE id = ?').get(vid)?.deleted === 1);

done();
