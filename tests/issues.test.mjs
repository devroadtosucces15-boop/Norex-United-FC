// Owner issue tool: device/OS parsing (web/report.js), the owner-only save route, upsert, caps (bot/issues.js)
import fs from 'node:fs';
import { call, env, login, sqlite, ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

// ---------- device / OS parsing: load the real file with a stub DOM ----------
globalThis.window = globalThis;
globalThis.document = { body: { dataset: {} } };
globalThis.addEventListener = () => {};
(0, eval)(fs.readFileSync(ROOT + 'web/report.js', 'utf8'));
const P = window.NXReport.parseUA;
const iphone = P('Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1', 'iPhone', 5);
t('iPhone Safari: device, OS, version, browser', iphone.device === 'iPhone' && iphone.os === 'iOS' && iphone.osVersion === '18.2.1' && iphone.browser === 'Safari' && iphone.browserVersion === '18.2');
const pixel = P('Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A.240205.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.58 Mobile Safari/537.36', 'Linux armv81', 5);
t('Android Chrome: model, OS version, browser', pixel.device === 'Pixel 8' && pixel.os === 'Android' && pixel.osVersion === '14' && pixel.browser === 'Chrome' && pixel.browserVersion.startsWith('130.'));
const ipad = P('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15', 'MacIntel', 5);
t('iPadOS desktop-mode UA is spotted by touch points', ipad.os === 'iPadOS' && ipad.device === 'iPad');
const win = P('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.51', 'Win32', 0);
t('Windows Edge beats Chrome', win.os === 'Windows' && win.browser === 'Edge' && win.device === 'Desktop');
t('iOS Chrome (CriOS) reads as Chrome on iOS', P('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1', 'iPhone', 5).browser === 'Chrome');

// ---------- save route ----------
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ issueTool: 'owner' });
const owner = await login('1', ['founder'], 'The Boss');
const mgr = await login('2', ['mgr'], 'A Manager');
const item = (n, extra = {}) => ({ n, t: Date.now(), page: '/squad.html', severity: 'broken', note: `thing ${n} is off`, role: { real: 'owner', viewAs: 'member' },
  device: { device: 'iPhone', os: 'iOS', osVersion: '18.2', browser: 'Safari', browserVersion: '18.2', viewport: { w: 390, h: 664 }, dpr: 3, standalone: true }, shape: { type: 'pin', pts: [[10, 20]], bbox: { x: 10, y: 20, w: 0, h: 0 } }, ...extra });

t('a manager cannot file issue notes', (await call(mgr, '/api/issues', { session: 'abc123xyz', item: item(1) })).s === 403);
let r = await call(owner, '/api/issues', { session: 'abc123xyz', item: item(1) });
t('the owner can', r.s === 200 && r.d.ok && r.d.id === 'abc123xyz:1');
const row = sqlite.prepare('SELECT * FROM issue_reports WHERE id = ?').get('abc123xyz:1');
t('columns carry role, viewing-as role, device line, severity, page', row.role === 'owner' && row.view_as === 'member' && row.severity === 'broken' && row.page === '/squad.html'
  && row.device === 'iPhone · iOS 18.2 · Safari 18.2 · 390x664 @3x · installed app' && row.status === 'open' && JSON.parse(row.data).shape.type === 'pin');
r = await call(owner, '/api/issues', { session: 'abc123xyz', item: item(1, { note: 'edited', severity: 'bogus' }) });
t('saving the same note again updates it (retry-safe), unknown severity becomes "wrong"', sqlite.prepare('SELECT COUNT(*) AS c FROM issue_reports').get().c === 1 && sqlite.prepare('SELECT note, severity FROM issue_reports').get().note === 'edited'
  && sqlite.prepare('SELECT severity FROM issue_reports').get().severity === 'wrong');
t('bad session id refused', (await call(owner, '/api/issues', { session: 'BAD ID!', item: item(2) })).d.error === 'Bad report.');
t('bad note number refused', (await call(owner, '/api/issues', { session: 'abc123xyz', item: item(0) })).d.error === 'Bad report number.');
t('oversized report refused', (await call(owner, '/api/issues', { session: 'abc123xyz', item: item(3, { note: 'x'.repeat(2000), junk: 'y'.repeat(70000) }) })).d.error === 'Report too large.');
setFlags({ issueTool: 'off' });
t('flag off → refused even for the owner', (await call(owner, '/api/issues', { session: 'abc123xyz', item: item(4) })).s === 403);

const rep = fs.readFileSync(ROOT + 'web/report.js', 'utf8'), app = fs.readFileSync(ROOT + 'web/app.js', 'utf8');
t('tool captures page, element, role + viewing-as role, device', ['target: cur.target', 'device: deviceInfo()', 'viewAs: ctx.viewAs', 'real: ctx.role', 'tabs: activeTabs()'].every((x) => rep.includes(x)));
t('app.js mounts it for the real owner only and uploads without the view-as header', /realRole === 'owner' && flagOn\('issueTool'/.test(app) && !/x-view-as[^\n]*\n[^\n]*NXReport/.test(app));
done();
