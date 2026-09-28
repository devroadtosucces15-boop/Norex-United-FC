// Local full-stack driver for NOREX UNITED FC – agent tooling, not product code.
//
//   node .claude/skills/run-norex-united-fc/driver.mjs < script.txt   run a command script, then exit
//   node .claude/skills/run-norex-united-fc/driver.mjs serve          just the servers, until Ctrl-C
//
// One process starts:
//   http://localhost:4321  the built site/ (like `npm run preview`), with every page's data-api
//                          rewritten to the local Worker below instead of the live workers.dev one
//   http://localhost:8788  the real bot/worker.js on tests/mock.mjs (in-memory D1 + KV, fake Discord
//                          OAuth, seeded member "Mike") – so login, Squad Hub and flags work offline
// and (script mode) headless Chromium via the globally installed Playwright.
// Script commands, one per line (# comments ok) – see SKILL.md for the table.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SITE_DIR = path.join(ROOT, 'site');
const SITE_PORT = 4321; // tests/mock.mjs hard-codes SITE_URL http://localhost:4321/ (CORS + OAuth return)
const API_PORT = Number(process.env.API_PORT || 8788);
const API = `http://localhost:${API_PORT}`;
const SITE = `http://localhost:${SITE_PORT}/`;
const SHOTS = process.env.SHOTS || '/tmp/norex-shots';
const serveOnly = process.argv[2] === 'serve';

// tests/mock.mjs reads site/api/club.json on import, so the site must exist first.
if (!fs.existsSync(path.join(SITE_DIR, 'api/club.json'))) {
  console.log('site/ missing – running scripts/build.mjs');
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: ROOT, stdio: 'inherit' });
}
const mock = await import(path.join(ROOT, 'tests/mock.mjs'));

// ---------- static site ----------
const LIVE_API = /data-api="[^"]*"/;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };
const siteServer = http.createServer((req, res) => {
  let p = path.join(SITE_DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(SITE_DIR)) return res.writeHead(403).end();
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) return res.writeHead(404).end('Not found');
  const ext = path.extname(p);
  res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  if (ext === '.html') return res.end(fs.readFileSync(p, 'utf8').replace(LIVE_API, `data-api="${API}"`));
  fs.createReadStream(p).pipe(res);
});

// ---------- Worker (node http → fetch Request → worker.fetch) ----------
const apiServer = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length && !['GET', 'HEAD'].includes(req.method) ? Buffer.concat(chunks) : undefined;
  try {
    const r = await mock.worker.fetch(new Request(API + req.url, { method: req.method, headers: req.headers, body }), mock.env, { waitUntil() {} });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error('worker error', req.method, req.url, e);
    res.writeHead(500).end(String(e));
  }
});

const listen = (srv, port) => new Promise((ok, bad) => srv.once('error', bad).listen(port, ok));
try {
  await listen(siteServer, SITE_PORT);
  await listen(apiServer, API_PORT);
} catch (e) {
  console.error(`${e.code}: port ${e.port} busy – stop the other server first: lsof -ti:${e.port} -sTCP:LISTEN | xargs -r kill`);
  process.exit(1);
}
console.log(`site ${SITE}  api ${API}`);
if (serveOnly) {
  console.log('serving – Ctrl-C to stop');
} else {
  await runScript();
  siteServer.close(); apiServer.close();
  process.exit(process.exitCode ?? 0);
}

// ---------- browser script ----------
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const g = execSync('npm root -g').toString().trim();
  return createRequire(path.join(g, 'noop.js'))('playwright');
}

async function runScript() {
  // Chromium starts on the first command that needs it, so api/slash-only scripts stay fast (~1 s).
  let browser, page, token = null, n = 0, blocked = 0;
  const errors = [];
  const applyToken = async () => {
    if (!page.url().startsWith(SITE)) await page.goto(SITE + 'about.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => { t ? localStorage.setItem('norex_session', t) : localStorage.removeItem('norex_session'); sessionStorage.clear(); }, token);
  };
  async function openBrowser() {
    const { chromium } = await loadPlaywright();
    browser = await chromium.launch({ args: ['--no-sandbox'] });
    // reducedMotion: the .reveal fade-ins (web/style.css) otherwise leave screenshots half-transparent.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    // Off-site requests (Google Fonts, EA crest CDN, Discord avatars…) can't be reached from the sandbox and
    // only add noise; abort them unless EXTERNAL=1. The page falls back to system fonts and badge SVGs.
    if (!process.env.EXTERNAL) await ctx.route((u) => !/^https?:\/\/localhost[:/]/.test(u.href), (r) => (blocked++, r.abort('blockedbyclient')));
    page = await ctx.newPage();
    page.on('console', (m) => m.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/.test(m.text()) && errors.push(`console: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => !/ERR_BLOCKED_BY_CLIENT/.test(r.failure()?.errorText) && errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
    if (token) await applyToken();
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  const url = (p) => (/^https?:/.test(p) ? p : SITE + p.replace(/^\//, ''));
  const loc = (sel) => (sel.startsWith('text=') ? page.getByText(sel.slice(5)).first() : page.locator(sel).first());
  const USERS = { owner: ['111', []], manager: ['444', ['mgr']], member: ['222', []] };
  const NO_BROWSER = new Set(['login', 'api', 'slash', 'sleep', 'errors']);

  // Discord slash commands: sign interactions with a throwaway Ed25519 key, like tests/bot.test.mjs.
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  mock.env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
  async function interaction(payload) {
    const body = JSON.stringify(payload), ts = String(Math.floor(Date.now() / 1000));
    const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
    const r = await mock.worker.fetch(new Request(API + '/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), mock.env, { waitUntil() {} });
    return r.json();
  }

  const cmds = {
    async login(who = 'owner') {
      if (who === 'guest') token = null;
      else {
        if (!USERS[who]) throw new Error('login owner|manager|member|guest');
        const t = await mock.login(...USERS[who], who[0].toUpperCase() + who.slice(1));
        if (typeof t !== 'string') throw new Error('login failed: ' + JSON.stringify(t));
        token = t;
      }
      if (page) await applyToken();
      return `logged in as ${who}`;
    },
    async nav(p) { await page.goto(url(p), { waitUntil: 'load', timeout: 20000 }).catch((e) => errors.push('nav: ' + e.message.split('\n')[0])); return page.url(); },
    // Selectors may contain spaces: everything after the command word is the selector.
    async wait(...sel) { await loc(sel.join(' ')).waitFor({ timeout: 10000 }); return 'ok'; },
    async click(...sel) { await loc(sel.join(' ')).click({ timeout: 10000 }); return 'ok'; },
    async fill(...rest) { // fill <selector> | <text>
      const [sel, text = ''] = rest.join(' ').split(' | ');
      await loc(sel).fill(text); return 'ok';
    },
    async press(key) { await page.keyboard.press(key); return 'ok'; },
    async text(...sel) { return (await loc(sel.join(' ') || 'main').innerText()).slice(0, 2000); },
    async eval(...js) { return JSON.stringify(await page.evaluate(js.join(' '))); },
    async sleep(ms = '500') { await page.waitForTimeout(Number(ms)); return 'ok'; },
    async viewport(w, h) { await page.setViewportSize({ width: Number(w), height: Number(h) }); return 'ok'; },
    async shot(name) {
      const f = path.join(SHOTS, `${name || String(++n).padStart(2, '0')}.png`);
      // Clicks scroll the page; a full-page shot taken while scrolled paints the sticky header mid-page.
      // behavior 'instant' because style.css sets html{scroll-behavior:smooth} – a plain scrollTo animates.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: f, fullPage: true });
      return f;
    },
    async 'shot-el'(name, ...sel) { // shot-el <name> <selector>
      const f = path.join(SHOTS, `${name}.png`);
      await loc(sel.join(' ')).screenshot({ path: f });
      return f;
    },
    async api(p, ...json) {
      const r = await mock.call(token, p.startsWith('/') ? p : '/' + p, json.length ? JSON.parse(json.join(' ')) : undefined);
      return `${r.s} ${JSON.stringify(r.d).slice(0, 2000)}`;
    },
    async slash(name, ...opts) { // slash player gamertag=x_MrMike_x
      const options = opts.map((o) => { const [k, ...v] = o.split('='); const val = v.join('='); return { name: k, value: /^\d+$/.test(val) ? Number(val) : val }; });
      const d = (await interaction({ type: 2, data: { name, options } })).data ?? {};
      const e = d.embeds?.[0];
      return [d.content, e && `# ${e.title ?? ''}\n${e.description ?? ''}`, ...(e?.fields ?? []).map((f) => `- ${f.name}: ${f.value}`)].filter(Boolean).join('\n').slice(0, 3000) || JSON.stringify(d).slice(0, 1000);
    },
    async errors() {
      const out = errors.splice(0);
      if (out.length) process.exitCode = 3;
      const note = blocked ? ` (${blocked} off-site requests blocked – EXTERNAL=1 to allow)` : '';
      return (out.length ? out.join('\n') : 'no errors') + note;
    },
  };

  const rl = readline.createInterface({ input: process.stdin });
  for await (const raw of rl) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [cmd, ...args] = line.split(/\s+/);
    if (!cmds[cmd]) { console.log(`✘ ${line}\n  unknown command – ${Object.keys(cmds).join(', ')}`); process.exitCode = 2; continue; }
    try {
      if (!page && !NO_BROWSER.has(cmd)) await openBrowser();
      console.log(`> ${line}\n${await cmds[cmd](...args)}`);
    } catch (e) {
      console.log(`✘ ${line}\n  ${e.message.split('\n')[0]}`);
      process.exitCode = 1;
    }
  }
  await browser?.close();
}
