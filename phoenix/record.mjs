// Records the member/staff API answers the pages need, from the REAL Worker code running on the Phoenix mock data, into
// phoenix/overlay/phoenix-api.json (replayed in the browser by phoenix-mock.js, because GitHub Pages has no Worker).
// usage: node phoenix/record.mjs          (needs chromium; takes a few minutes; re-run after changing gen-data.mjs or the Worker)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..');
const PORT = 8795, BASE = `http://localhost:${PORT}`, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'phoenix-rec-')); const kids = [];
const cp = (a, b, o = {}) => fs.cpSync(path.join(repo, a), path.join(stage, b ?? a), { recursive: true, ...o });
try {
  for (const d of ['bot', 'scripts', 'web']) cp(d, d, { filter: (f) => !/__pycache__|\.wrangler|node_modules/.test(f) });
  fs.mkdirSync(path.join(stage, 'tests')); fs.mkdirSync(path.join(stage, '.claude')); fs.mkdirSync(path.join(stage, 'next/static'), { recursive: true });
  cp('tests/mock.mjs'); cp('.claude/mockserver.mjs'); cp('next/static/musicmodel.js');
  execFileSync('node', [path.join(here, 'gen-data.mjs'), stage], { stdio: 'inherit', env: { ...process.env, PF_API: BASE } });
  execFileSync('node', [path.join(stage, 'scripts/build.mjs')], { stdio: 'inherit', cwd: stage, env: { ...process.env, NOREX_OUT: path.join(stage, 'site') } });
  // the harness seeds belong to the test suite: swap the real-looking names for Phoenix ones
  const players = JSON.parse(fs.readFileSync(path.join(stage, 'site/api/players.json'), 'utf8')); const me = (players.players || players)[0];
  const mk = path.join(stage, 'tests/mock.mjs'); let m = fs.readFileSync(mk, 'utf8');
  m = m.replace(/Зуб_Ноrex 👑/g, 'Phoenix Owner').replace(/x_MrMike_x/g, me.n || me.name).replace(/1007531598629/g, String(me.id ?? me.k)).replace(/'Mike'/g, "'Skye Calder'").replace(/Box-to-box/g, 'Box-to-box').replace(/status: 'pending'/, "status: 'approved'");
  fs.writeFileSync(mk, m);
  const out = path.join(stage, 'pf-site');
  execFileSync('node', [path.join(here, 'build.mjs'), '--out', out, '--api', BASE], { stdio: 'inherit' });
  // the Worker, same origin as the pages (no CORS)
  const srv = spawn('node', ['.claude/mockserver.mjs'], { cwd: stage, env: { ...process.env, PORT, SITE_DIR: out }, stdio: ['ignore', 'pipe', 'inherit'] }); kids.push(srv);
  await new Promise((r) => srv.stdout.on('data', (d) => /mock api/.test(String(d)) && r()));

  // ---- fill the Worker's database with plausible club life (best effort: a refused call is just skipped) ----
  const loc = (await fetch(`${BASE}/auth/login?return=${encodeURIComponent(BASE + '/index.html')}`, { redirect: 'manual' })).headers.get('location');
  const tok = new URLSearchParams(loc.split('#')[1]).get('norex_session');
  const post = (p, b, t = tok, ip = '9.9.9.9') => fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, 'CF-Connecting-IP': ip }, body: JSON.stringify(b) }).then((r) => r.status).catch(() => 0);
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10), pl = (players.players || players), ok = [];
  const S = async (label, p, b, t, ip) => { const s = await post(p, b, t, ip); ok.push(`${label}:${s}`); };
  const nights = [[1, 'league', '20:00'], [3, 'rush', '21:00'], [6, 'friendly', '19:30'], [9, 'league', '20:00']];
  for (const [n, type, time] of nights) await S('event', '/api/events', { type, date: day(n), time, tz: 'Europe/London', duration: 120, needs: { GK: 1, CB: 2, players: 5 }, notes: `${type} night · lobby host: SolarGlove`, public: true });
  for (const [ea, plat, pos] of [['Cinder_Ace', 'PS5', ['CB']], ['Nova_Spark', 'Xbox', ['CM', 'CAM']], ['Tempest_9', 'PC', ['ST']], ['Ashline', 'PS5', ['GK']]]) await S('trial', '/api/trials/apply', { ea, platform: plat, positions: pos, discord: ea.toLowerCase() }, tok, `9.9.${ea.length}.${pos.length}`);
  for (const [area, title, body, pinned] of [['rules', 'Match-night conduct', 'Be on time, be kind, play for the badge. No quitting mid-match.', false], ['rules', 'Rotation rules', 'Everyone plays. Starters follow availability and form.', false], ['announce', 'Season launch', 'Phoenix Fire kicks off the new season: Rise. Burn. Repeat.', true], ['faq', 'How do I join?', 'Apply with your EA ID and a position. A manager will invite you to a trial night.', false], ['faq', 'Who picks the squad?', 'Managers pick from availability, form and position needs.', false], ['philosophy', 'Club philosophy', 'We play with fire: press high, move fast, win together.', false]]) await S('doc', '/api/docs', { area, title, body, pinned, ack: area === 'rules' });
  for (const t of [['Weekly scrims', 'Two practice nights a week against div 1 clubs'], ['Ember kit alt', 'A silver third kit for cup nights'], ['Vote the formation', 'Let members vote the formation before kick-off']]) await S('idea', '/api/suggestions', { title: t[0], body: t[1] });
  for (const [i, k] of ['legend', 'legend', 'founder'].entries()) if (pl[i]) await S('hof', '/api/hof', { kind: k, player: pl[i].k });
  for (const [i, t] of ['A model captain', 'Needs more minutes at CB', 'Great energy in the lobby'].entries()) if (pl[i + 1]) await S('note', '/api/notes', { kind: 'player', subject: pl[i + 1].k, text: t });
  for (const [icon, name, desc, tier] of [['🔥', 'Ember Streak', 'Five wins in a row', 'epic'], ['🧤', 'Wall of Ash', 'Three clean sheets', 'rare'], ['👑', 'Phoenix Crowned', 'League champions', 'legendary']]) await S('medal', '/api/admin/medals', { op: 'save', icon, name, desc, tier, fact: 'manual' });
  await S('announce', '/api/notify/announce', { title: 'Welcome to Phoenix Fire', body: 'Preview build: every section has sample content.' });
  for (const n of [1, 3, 6]) await post('/api/availability', { dates: [day(n)], status: 'yes' });
  if (pl[0] && pl[1]) await S('vote', '/api/vote', { match: (await (await fetch(`${BASE}/api/club.json`)).json()).matches?.[0]?.id, player: pl[1].k });
  console.log('phoenix record: seeded ' + ok.join(' '));
  const cdpPort = 9444, prof = fs.mkdtempSync(path.join(os.tmpdir(), 'phoenix-prof-'));
  kids.push(spawn('chromium', ['--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,900', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' }));
  let tgt; for (let i = 0; i < 80 && !tgt; i++) { try { tgt = (await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json()).find((t) => t.type === 'page'); } catch {} await sleep(250); }
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); const reqs = new Map(); const rec = {}; let role = 'owner';
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = async (e) => {
    const d = JSON.parse(e.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result ?? d.error); pend.delete(d.id); return; }
    if (d.method === 'Network.requestWillBeSent') reqs.set(d.params.requestId, { m: d.params.request.method, u: d.params.request.url, body: d.params.request.postData });
    if (d.method === 'Network.loadingFinished') {
      const q = reqs.get(d.params.requestId); if (!q) return; const u = new URL(q.u);
      if (u.origin !== BASE || !/^\/api\//.test(u.pathname) || /\.json$/.test(u.pathname)) return;
      const r = await send('Network.getResponseBody', { requestId: d.params.requestId }).catch(() => null); if (!r || r.code) return;
      let b; try { b = JSON.parse(r.body); } catch { return; }
      const key = `${role}:${q.m} ${u.pathname}${u.search}`; rec[key] = b;
      if (q.m === 'GET' && !rec[`${role}:${q.m} ${u.pathname}`]) rec[`${role}:${q.m} ${u.pathname}`] = b; // path-only fallback = first answer seen
    }
  };
  await send('Network.enable'); await send('Page.enable'); await send('Runtime.enable');
  const go = async (u, ms = 2500) => { await send('Page.navigate', { url: u }); await sleep(ms); };
  const pages = fs.readdirSync(out).filter((f) => f.endsWith('.html') && !/^(offline|404)\./.test(f)).sort();
  for (const [r, who] of [['owner', 'id=111&user=boss'], ['member', 'id=222&user=skye&roles=']]) {
    role = r; await fetch(`${BASE}/__mock?${who}`);
    await go(`${BASE}/auth/login?return=${encodeURIComponent(BASE + '/index.html')}`, 2500);
    for (const p of pages) { await go(`${BASE}/${p}`, Number(process.env.WAIT || 2200)); }
    console.log(`phoenix record: ${r} done (${Object.keys(rec).length} answers so far)`);
  }
  const text = JSON.stringify(rec).split(BASE).join('https://phoenix.mock');
  fs.writeFileSync(path.join(here, 'overlay/phoenix-api.json'), text);
await import("./fixtures.mjs"); // hand-authored answers (intel etc.)
  console.log(`phoenix record: ${Object.keys(rec).length} answers, ${(text.length / 1024).toFixed(0)} KB -> phoenix/overlay/phoenix-api.json`);
  ws.close();
} finally { for (const k of kids) k.kill(); await sleep(500); fs.rmSync(stage, { recursive: true, force: true }); }
process.exit(0);
