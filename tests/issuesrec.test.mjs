// Owner issue recordings (raw upload + owner-only file), fix status and the automatic clean-up of fixed reports
import { call, env, login, W, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';
import { issueSweep, FIX_GRACE } from '../bot/issues.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ issueTool: 'owner' });
const owner = await login('1', ['founder'], 'The Boss');
const mgr = await login('2', ['mgr'], 'A Manager');
const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3]);
const up = (tok, q = 'session=abc123xyz&n=1', body = bytes, type = 'video/webm', len) => W(`/api/issues/recording?${q}`, { method: 'POST', headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': type, 'Content-Length': String(len ?? body.byteLength) }, body });
const item = (n) => ({ n, t: Date.now(), page: '/squad.html', severity: 'broken', note: `thing ${n}`, role: { real: 'owner' }, device: {}, recording: { file: 'f.webm', uploaded: false } });
await call(owner, '/api/issues', { session: 'abc123xyz', item: item(1) });
await call(owner, '/api/issues', { session: 'abc123xyz', item: item(2) });

t('guest 401, manager 403 on the recording upload', (await up(null)).status === 401 && (await up(mgr)).status === 403);
t('wrong type → 415, empty → 411, over the cap → 413, bad ids → 400', (await up(owner, undefined, bytes, 'text/html')).status === 415 && (await up(owner, undefined, new Uint8Array(0))).status === 411 && (await up(owner, undefined, bytes, 'video/webm', 61e6)).status === 413 && (await up(owner, 'session=BAD&n=1')).status === 400);
setFlags({ issueTool: 'off' });
t('flag off → refused for the owner too', (await up(owner)).status === 403);
setFlags({ issueTool: 'owner' });
const ok = await up(owner);
const okJson = await ok.json();
t('owner upload stores the file under issues/<session>/<n> and flags the report row', ok.status === 200 && okJson.key === 'issues/abc123xyz/1.webm'
  && JSON.parse(sqlite.prepare('SELECT data FROM issue_reports WHERE id = ?').get('abc123xyz:1').data).recording.uploaded === true);
const get = (tok, q = 'session=abc123xyz&n=1') => W(`/api/issues/recording?${q}`, { headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
t('only the owner can read it back', (await get(owner)).status === 200 && (await get(mgr)).status === 403 && (await get(owner, 'session=abc123xyz&n=2')).status === 404);

// status + listing
t('manager cannot change status or list', (await call(mgr, '/api/issues/status', { id: 'abc123xyz:1', status: 'fixed' })).s === 403 && (await call(mgr, '/api/issues')).s === 403);
t('bad status / unknown id refused', (await call(owner, '/api/issues/status', { id: 'abc123xyz:1', status: 'done' })).s === 400 && (await call(owner, '/api/issues/status', { id: 'nope:1', status: 'fixed' })).s === 400);
const fixed = await call(owner, '/api/issues/status', { id: 'abc123xyz:1', status: 'fixed' });
t('marking fixed returns when it will be cleared', fixed.s === 200 && fixed.d.deleteAt > Date.now() + FIX_GRACE - 5000);
const list = (await call(owner, '/api/issues')).d.items;
t('list shows status, video flag and the clear time', list.length === 2 && list.find((x) => x.n === 1).video === true && list.find((x) => x.n === 1).deleteAt && list.find((x) => x.n === 2).deleteAt === null);

// clean-up
t('inside the grace period nothing is deleted', (await issueSweep(env, Date.now() + FIX_GRACE - 60e3)) === 0 && sqlite.prepare('SELECT COUNT(*) AS c FROM issue_reports').get().c === 2);
await call(owner, '/api/issues/status', { id: 'abc123xyz:1', status: 'open' });
t('reopening cancels the deletion', (await issueSweep(env, Date.now() + 2 * FIX_GRACE)) === 0);
await call(owner, '/api/issues/status', { id: 'abc123xyz:1', status: 'fixed' });
const n = await issueSweep(env, Date.now() + FIX_GRACE + 60e3);
t('after the grace period the fixed report and its video are deleted; open ones stay', n === 1 && !sqlite.prepare('SELECT 1 FROM issue_reports WHERE id = ?').get('abc123xyz:1') && !!sqlite.prepare('SELECT 1 FROM issue_reports WHERE id = ?').get('abc123xyz:2') && (await get(owner)).status === 404);
t('one line in the activity log records what was cleared', sqlite.prepare("SELECT detail FROM activity WHERE type = 'issue-cleared'").get()?.detail.includes('fixed #1 broken'));
done();
