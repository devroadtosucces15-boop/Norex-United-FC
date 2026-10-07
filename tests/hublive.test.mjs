// Hub live roster + waves front end (web/hublive.js): drives it with a fake DOM + fake WebSocket.
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const nodes = {};
const mkNode = () => ({ innerHTML: '', textContent: '', hidden: true, listeners: {}, addEventListener(k, f) { this.listeners[k] = f; }, querySelector(sel) { return nodes[sel] ??= mkNode(); } });
const el = mkNode();
globalThis.document = { visibilityState: 'visible', addEventListener() {} };
globalThis.UI = { avatar: (a, n) => `<av:${n}>` };
const socks = [];
globalThis.WebSocket = class { constructor(url) { this.url = url; this.readyState = 1; this.sent = []; socks.push(this); } send(x) { this.sent.push(x); } close() { this.readyState = 3; } };
globalThis.window = globalThis;
globalThis.setInterval = () => 0; globalThis.clearInterval = () => {}; // keep the test from hanging on the 30 s ping
(0, eval)(fs.readFileSync(ROOT + 'web/hublive.js', 'utf8'));

const calls = [], toasts = [];
const ctx = { call: async (p, b) => { calls.push([p, b]); return { delivered: b.to === 'live' }; }, toast: (m) => toasts.push(m), api: 'https://w.example', token: 'tok en', me: 'me1', name: 'Me <b>', avatar: null, canWave: true };
window.NXHubLive.mount(el, ctx);
const s = socks[0];
t('connects to /api/hub/ws over wss with the encoded token', s.url === 'wss://w.example/api/hub/ws?t=tok%20en');
s.onopen();
const row = nodes['[data-hubl-row]'];
t('shows yourself first once connected, name escaped, no wave button on you', row.innerHTML.includes('Me &lt;b&gt;') && !row.innerHTML.includes('data-wave="me1"'));
s.onmessage({ data: JSON.stringify({ t: 'roster', who: [{ u: 'a', n: 'Ann', a: null }] }) });
t('roster replaces the list (self dropped until the room says otherwise is fine)', row.innerHTML.includes('Ann') && row.innerHTML.includes('data-wave="a"'));
s.onmessage({ data: JSON.stringify({ t: 'here', who: { u: 'b', n: 'Bo', a: null } }) });
t('a join adds a chip', row.innerHTML.includes('Bo'));
s.onmessage({ data: JSON.stringify({ t: 'gone', u: 'a' }) });
t('a leave removes it', !row.innerHTML.includes('Ann') && row.innerHTML.includes('Bo'));
s.onmessage({ data: 'pong' });
s.onmessage({ data: 'not json' });
t('pong and junk frames are ignored', row.innerHTML.includes('Bo'));
s.onmessage({ data: JSON.stringify({ t: 'wave', from: { id: 'b', n: 'Bo' } }) });
t('a wave at you shows a toast', toasts.some((m) => m.includes('Bo waved at you')));
const btn = { dataset: { wave: 'live' }, disabled: false, classList: { add() {}, remove() {} } };
await row.listeners.click({ target: { closest: () => btn } });
t('clicking 👋 posts to /api/hub/wave and says it landed live', calls[0][0] === '/api/hub/wave' && calls[0][1].to === 'live' && toasts.at(-1).includes('saw it live'));
const btn2 = { dataset: { wave: 'away' }, disabled: false, classList: { add() {}, remove() {} } };
await row.listeners.click({ target: { closest: () => btn2 } });
t('the button locks while a wave is cooling down', btn.disabled === true);
t('a queued wave says they will get an alert', toasts.at(-1).includes('alert'));

// ---------- static wiring ----------
const css = fs.readFileSync(ROOT + 'web/hub.css', 'utf8');
t('reduced-motion fallback turns the animations off', /prefers-reduced-motion:reduce\)\{\.hubl-chip/.test(css));
t('hubLive ships as an owner flag', JSON.parse(fs.readFileSync(ROOT + 'config.json', 'utf8')).features.hubLive === 'owner');
t('app.js only loads it behind hubLive', /flagOn\('hubLive', baseRole\)\s*\?\s*\(slot\) => loadAsset\('hublive\.js'/.test(fs.readFileSync(ROOT + 'web/app.js', 'utf8')));
t('hub page has the mount point', fs.readFileSync(ROOT + 'scripts/hub-page.mjs', 'utf8').includes('data-hubw-live'));
done();
