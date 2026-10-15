// Local preview server: static dist/ plus a tiny artwork API (stands in for the real member API + R2 while we design).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.join(here, 'dist'), store = path.join(here, 'store'), artDir = path.join(store, 'art'), dbf = path.join(store, 'art.json');
fs.mkdirSync(artDir, { recursive: true }); const port = +process.env.PORT || 4400;
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const load = () => { try { return JSON.parse(fs.readFileSync(dbf, 'utf8')); } catch { return {}; } }, save = (d) => fs.writeFileSync(dbf, JSON.stringify(d, null, 1));
const fileOf = (k) => path.join(artDir, crypto.createHash('sha1').update(k).digest('hex') + '.png');
const json = (r, c, o) => { r.writeHead(c, { 'content-type': 'application/json', 'cache-control': 'no-store' }); r.end(JSON.stringify(o)); };
const isOwner = (q, u) => (q.headers['x-as'] || u.searchParams.get('as') || '') === 'owner';
const body = (q, max = 8e6) => new Promise((ok, no) => { const c = []; let n = 0; q.on('data', (x) => { n += x.length; if (n > max) { no(new Error('too big')); q.destroy(); } else c.push(x); }); q.on('end', () => ok(Buffer.concat(c))); q.on('error', no); });
function pngInfo(b) { if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') return null; const w = b.readUInt32BE(16), h = b.readUInt32BE(20), ct = b[25]; const trns = b.includes(Buffer.from('tRNS')); return { w, h, alpha: ct === 4 || ct === 6 || (ct === 3 && trns) }; }
http.createServer(async (q, r) => {
  const u = new URL(q.url, 'http://x'); let p = decodeURIComponent(u.pathname);
  try {
    if (p === '/api/art' && q.method === 'GET') { const d = load(), o = {}; for (const [k, a] of Object.entries(d)) if (a.status === 'approved') o[k] = { v: a.v, kit: a.kit || '', numY: a.numY || '' }; return json(r, 200, o); }
    if (p === '/api/art/all' && q.method === 'GET') { if (!isOwner(q, u)) return json(r, 403, { error: 'Owner only' }); return json(r, 200, load()); }
    if (p === '/api/art/mine' && q.method === 'GET') { const k = u.searchParams.get('k'), a = load()[k]; return json(r, 200, a ? { status: a.status, note: a.note || '', kit: a.kit || '', v: a.v } : { status: 'none' }); }
    if (p === '/api/art/submit' && q.method === 'POST') { const k = u.searchParams.get('k'); if (!k) return json(r, 400, { error: 'Pick a player.' });
      const b = await body(q); const i = pngInfo(b); if (!i) return json(r, 400, { error: 'That is not a PNG file.' }); if (!i.alpha) return json(r, 400, { error: 'The PNG needs a transparent background.' }); if (i.w < 400 || i.h < 400) return json(r, 400, { error: 'Too small. Use at least 400 px.' });
      const d = load(); fs.writeFileSync(fileOf(k), b); d[k] = { status: isOwner(q, u) && u.searchParams.get('approve') === '1' ? 'approved' : 'pending', v: Date.now(), kit: (u.searchParams.get('kit') || '').slice(0, 2), numY: '', w: i.w, h: i.h, bytes: b.length, by: isOwner(q, u) ? 'owner' : 'member', note: '' }; save(d); return json(r, 200, d[k]); }
    if (p === '/api/art/action' && q.method === 'POST') { if (!isOwner(q, u)) return json(r, 403, { error: 'Owner only' }); const j = JSON.parse((await body(q, 1e5)).toString() || '{}'); const d = load(), a = d[j.k]; if (!a) return json(r, 404, { error: 'No artwork for that player.' });
      if (j.action === 'approve') a.status = 'approved'; else if (j.action === 'revoke') a.status = 'revoked'; else if (j.action === 'resubmit') { a.status = 'resubmit'; a.note = String(j.note || '').slice(0, 200); } else if (j.action === 'kit') { a.kit = String(j.kit || '').slice(0, 2); a.numY = +j.numY || ''; } else return json(r, 400, { error: 'Unknown action.' }); a.v = Date.now(); save(d); return json(r, 200, a); }
    if (p === '/api/art/delete' && q.method === 'POST') { if (!isOwner(q, u)) return json(r, 403, { error: 'Owner only' }); const k = u.searchParams.get('k'), d = load(); delete d[k]; try { fs.unlinkSync(fileOf(k)); } catch {} save(d); return json(r, 200, {}); }
    if (p.startsWith('/art/') && p.endsWith('.png')) { const k = p.slice(5, -4), a = load()[k]; if (!a || (a.status !== 'approved' && !isOwner(q, u))) { r.writeHead(404); return r.end(); } const f = fileOf(k); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      const h = { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' }; if (u.searchParams.get('dl')) h['content-disposition'] = `attachment; filename="${k}.png"`; r.writeHead(200, h); return fs.createReadStream(f).pipe(r); }
    if (p === '/') p = '/index.html'; const f = path.join(dist, path.normalize(p));
    if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404, { 'content-type': 'text/plain' }); return r.end('not found'); }
    r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); fs.createReadStream(f).pipe(r);
  } catch (e) { json(r, 500, { error: String(e.message || e) }); }
}).listen(port, () => console.log('NOREX redesign preview: http://localhost:' + port));
