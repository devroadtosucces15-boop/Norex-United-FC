import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createServices } from './local-services.mjs';
import { planIntent } from './control-plane.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const assets = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
export async function startServer({ projectRoot = resolve(root, '../..'), port = Number(process.env.PORT || 4177) } = {}) {
  const services = await createServices(projectRoot);
  const server = createServer(async (req, res) => {
    const send = (status, value, type = 'application/json') => {
      res.writeHead(status, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'Referrer-Policy': 'no-referrer' });
      res.end(type === 'application/json' ? JSON.stringify(value) : value);
    };
    try {
      const authority = '127.0.0.1:' + server.address().port;
      const origin = 'http://' + authority;
      if (req.headers.host !== authority || (req.headers.origin && req.headers.origin !== origin) || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) return send(403, { error: 'Local same-origin requests only' });
      const url = new URL(req.url, origin);
      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' || !assets[url.pathname]) return send(404, { error: 'Not found' });
        const [file, type] = assets[url.pathname];
        return send(200, await readFile(resolve(root, file)), type);
      }
      // A custom header prevents drive-by forms and cross-origin simple requests.
      if (req.headers['x-norex-local'] !== '1') return send(403, { error: 'Local request header required' });
      if (req.method === 'GET') {
        if (url.pathname === '/api/state') return send(200, await services.state());
        if (url.pathname === '/api/git/status') return send(200, await services.status());
        if (url.pathname === '/api/git/diff') return send(200, await services.diff(url.searchParams.get('path')));
        if (url.pathname === '/api/files') return send(200, { files: await services.files() });
        if (url.pathname === '/api/file') return send(200, await services.inspect(url.searchParams.get('path')));
      }
      if (req.method === 'POST' && url.pathname === '/api/plan') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Same-origin JSON planning required' });
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 2048) { send(413, { error: 'Request too large' }); return; } }
        const data = JSON.parse(body);
        if (!data || Object.keys(data).join(',') !== 'intent' || typeof data.intent !== 'string') return send(400, { error: 'A single text intent is required' });
        return send(200, planIntent(data.intent));
      }

      if (req.method === 'POST' && url.pathname === '/api/workflow/execute') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Same-origin JSON workflow execution required' });
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 1024) {
            send(413, { error: 'Request too large' });
            return;
          }
        }
        const data = JSON.parse(body);
        if (
          !data ||
          Object.keys(data).sort().join(',') !== 'approved,workflow_id' ||
          data.approved !== true ||
          data.workflow_id !== 'ND-025'
        ) return send(400, { error: 'Explicit approval and an allowlisted workflow_id are required' });
        return send(200, await services.executeWorkflow(data.workflow_id, data.approved));
      }

      if (req.method === 'POST' && url.pathname === '/api/run') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Same-origin JSON execution required' });
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 1024) { send(413, { error: 'Request too large' }); return; } }
        const data = JSON.parse(body);
        if (!data || Object.keys(data).sort().join(',') !== 'approved,command_id' || data.approved !== true) return send(400, { error: 'Explicit approval and a fixed command_id are required' });
        return send(200, await services.run(data.command_id));
      }
      send(404, { error: 'Unknown local operation' });
    } catch (error) { send(400, { error: error.code ? 'Local resource unavailable' : error.message }); }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startServer();
  console.log('Norex Dev OS Shadow: http://127.0.0.1:' + server.address().port);
}
