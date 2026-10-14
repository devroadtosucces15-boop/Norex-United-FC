// Headless Chrome over the DevTools protocol – no npm packages (Node 22's built-in WebSocket). Used by scripts/cards.mjs to
// turn the Discord card templates (HTML) into PNGs. One browser and one tab are reused for every card, so a card takes
// ~100 ms instead of a fresh browser launch each time.
//   const chrome = await launchChrome();  const png = await chrome.shot(html, 1200);  await chrome.close();
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'];

export function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const c of CANDIDATES) {
    if (c.startsWith('/')) { if (fs.existsSync(c)) return c; continue; }
    try { return execFileSync('which', [c], { encoding: 'utf8' }).trim(); } catch { /* not installed */ }
  }
  return null;
}

export async function launchChrome({ bin = findChrome(), timeout = 20000 } = {}) {
  if (!bin) throw new Error('No Chrome or Chromium found (set CHROME_BIN)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'norex-cards-'));
  const proc = spawn(bin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
    '--font-render-hinting=none', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('Chrome did not start')), timeout);
    proc.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(t); resolve(m[1]); }
    });
    proc.on('exit', (code) => { clearTimeout(t); reject(new Error(`Chrome exited (${code})`)); });
  });
  const port = new URL(wsUrl).port;
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('DevTools connection failed')); });
  let seq = 0;
  const waiting = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    const w = msg.id && waiting.get(msg.id);
    if (!w) return;
    waiting.delete(msg.id);
    if (msg.error) w.reject(new Error(msg.error.message)); else w.resolve(msg.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable');
  const { frameTree } = await send('Page.getFrameTree');
  const frameId = frameTree.frame.id;

  // Renders `html` at `width` px wide and returns the PNG (height = the page's content height, or `height` if given).
  async function shot(html, width, height = null) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: height ?? 800, deviceScaleFactor: 1, mobile: false });
    await send('Page.setDocumentContent', { frameId, html });
    // fonts + every <img> settled (a failed crest falls back via onerror, so it still "completes")
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `Promise.race([Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))]), new Promise((r) => setTimeout(r, 6000))]).then(() => 1)`,
    });
    const h = height ?? (await send('Runtime.evaluate', { expression: 'Math.ceil(document.documentElement.getBoundingClientRect().height)', returnByValue: true })).result.value;
    const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height: h, scale: 1 }, captureBeyondViewport: true });
    return Buffer.from(data, 'base64');
  }

  async function close() {
    try { ws.close(); } catch { /* already closed */ }
    const exited = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); } catch { /* temp dir – the OS cleans it */ }
  }
  return { shot, close };
}
