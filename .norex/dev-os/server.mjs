import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeRecoveryBundle, readRecoveryBundle, restoreRecoveryBundle } from './recovery-bundle.mjs';
import { createServices } from './local-services.mjs';
import { planIntent } from './control-plane.mjs';
import { createRuntimeStore } from './runtime-store.mjs';
import { routeCapability } from './capability-broker.mjs';
import { browserProbe, captureLocalPreview } from './browser-service.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const execFileAsync = promisify(execFile);
const assets = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
export async function startServer({ projectRoot = resolve(root, '../..'), port = Number(process.env.PORT || 4177), runtimeStore = null } = {}) {
  const services = await createServices(projectRoot);
  const sessionId = runtimeStore?.ensureSession({ id: 'shadow-local', project: 'Norex United', branch: 'foundation/norex-dev-shadow' });
  const runRecorded = async (taskId, operation, execute) => {
    if (!runtimeStore) return execute();
    runtimeStore.upsertTask({ id: taskId, session_id: sessionId, title: operation, status: 'IN_PROGRESS', risk: 'R1', active_model: 'local', started_at: new Date().toISOString() });
    const executionId = runtimeStore.startExecution({ session_id: sessionId, task_id: taskId, operation });
    runtimeStore.appendEvent({ session_id: sessionId, task_id: taskId, execution_id: executionId, type: 'CIRunStarted', actor: 'local', payload: { operation } });
    try {
      const result = await execute();
      const passed = ['passed', 'VALIDATED'].includes(result.status);
      runtimeStore.finishExecution(executionId, { status: passed ? 'PASSED' : result.status, exit_code: result.exit_code ?? null, summary: passed ? 'Deterministic local execution passed' : 'Deterministic local execution completed' });
      if (typeof result.output === 'string') runtimeStore.recordExecutionOutput(executionId, result.output);
      const artifactKind = operation.startsWith('command:shadow-test') ? 'tests' : operation.startsWith('command:') ? 'terminal' : 'workflow';
      const artifactId = runtimeStore.recordArtifact({ session_id: sessionId, task_id: taskId, execution_id: executionId, kind: artifactKind, ref: 'execution://' + executionId });
      runtimeStore.appendEvent({ session_id: sessionId, task_id: taskId, execution_id: executionId, type: 'ArtifactCreated', actor: 'local', payload: { artifact_id: artifactId, kind: artifactKind, ref: 'execution://' + executionId } });
      runtimeStore.appendEvent({ session_id: sessionId, task_id: taskId, execution_id: executionId, type: passed ? 'CIPassed' : 'CIFailed', actor: 'local', payload: { operation, status: result.status } });
      return result;
    } catch (error) {
      runtimeStore.finishExecution(executionId, { status: 'FAILED', summary: 'Local execution failed' });
      runtimeStore.appendEvent({ session_id: sessionId, task_id: taskId, execution_id: executionId, type: 'CIFailed', actor: 'local', payload: { operation, status: 'FAILED' } });
      throw error;
    }
  };
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
        if (url.pathname === '/api/state') return send(200, { ...(await services.state()), runtime: runtimeStore ? runtimeStore.snapshot() : { status: 'not-attached' }, telemetry: runtimeStore ? { execution: runtimeStore.executionTelemetry(sessionId), observability: runtimeStore.sessionObservability(sessionId) } : { status: 'not-attached' } });
        if (url.pathname === '/api/artifacts') return send(200, { artifacts: runtimeStore ? runtimeStore.listArtifacts(sessionId) : [] });
        if (url.pathname === '/api/execution/output') return send(200, { output: runtimeStore ? runtimeStore.getExecutionOutput(url.searchParams.get('id'), sessionId) : null });
        if (url.pathname === '/api/git/status') return send(200, await services.status());
        if (url.pathname === '/api/git/diff') return send(200, await services.diff(url.searchParams.get('path')));
        if (url.pathname === '/api/files') return send(200, { files: await services.files() });
        if (url.pathname === '/api/file') return send(200, await services.inspect(url.searchParams.get('path')));
      }
      if (req.method === 'POST' && url.pathname === '/api/recovery/export') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Same-origin JSON recovery export required' });
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1024) { send(413, { error: 'Request too large' }); return; } }
        let data; try { data = JSON.parse(body); } catch { return send(400, { error: 'Valid JSON recovery approval is required' }); }
        if (!runtimeStore || !data || data.approved !== true || Object.keys(data).sort().join(',') !== 'approved') return send(400, { error: 'Explicit recovery export approval is required' });
        const branch = (await execFileAsync('/usr/bin/git', ['-C', projectRoot, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' })).stdout.trim();
        const commit = (await execFileAsync('/usr/bin/git', ['-C', projectRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' })).stdout.trim();
        const dir = await mkdtemp(resolve(tmpdir(), 'norex-recovery-ui-'));
        const path = resolve(dir, 'runtime.recovery.json');
        try {
          const written = await writeRecoveryBundle(runtimeStore, path, { repository: { root: projectRoot, branch, commit } });
          const verified = await readRecoveryBundle(path);
          return send(200, { status: 'VERIFIED', format: written.format, version: written.version, algorithm: written.algorithm, digest: written.digest, repository: verified.repository, state: { schema_version: verified.state.schema_version, sessions: verified.state.sessions.length, tasks: verified.state.tasks.length, executions: verified.state.executions.length, events: verified.state.events.length } });
        } finally { await rm(dir, { recursive: true, force: true }); }
      }

      if (req.method === 'POST' && url.pathname === '/api/recovery/roundtrip') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Same-origin JSON recovery verification required' });
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1024) { send(413, { error: 'Request too large' }); return; } }
        let data; try { data = JSON.parse(body); } catch { return send(400, { error: 'Valid JSON recovery approval is required' }); }
        if (!runtimeStore || !data || data.approved !== true || Object.keys(data).sort().join(',') !== 'approved') return send(400, { error: 'Explicit recovery roundtrip approval is required' });
        const branch = (await execFileAsync('/usr/bin/git', ['-C', projectRoot, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' })).stdout.trim();
        const commit = (await execFileAsync('/usr/bin/git', ['-C', projectRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' })).stdout.trim();
        const repository = { root: projectRoot, branch, commit };
        const dir = await mkdtemp(resolve(tmpdir(), 'norex-recovery-roundtrip-'));
        const path = resolve(dir, 'runtime.recovery.json'), dbPath = resolve(dir, 'restored.db');
        let restored;
        try {
          await writeRecoveryBundle(runtimeStore, path, { repository });
          const target = createRuntimeStore({ dbPath });
          try { restored = await restoreRecoveryBundle(target, path, { repository }); } finally { target.close(); }
          const source = runtimeStore.snapshot();
          if (JSON.stringify(restored) !== JSON.stringify(source)) throw new Error('Recovery roundtrip state mismatch');
          return send(200, { status: 'RESTORE_VERIFIED', repository, state: restored });
        } finally { await rm(dir, { recursive: true, force: true }); }
      }

      if (req.method === 'POST' && url.pathname === '/api/preview') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Same-origin JSON preview required' });
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1024) { send(413, { error: 'Request too large' }); return; } }
        let data;
        try { data = JSON.parse(body); } catch { return send(400, { error: 'Valid JSON preview approval is required' }); }
        if (!data || data.approved !== true || Object.keys(data).sort().join(',') !== 'approved') return send(400, { error: 'Explicit preview approval is required' });
        const probe = await browserProbe(); if (probe.status !== 'AVAILABLE') return send(409, probe);
        const result = await captureLocalPreview(origin + '/', { allowedOrigin: origin });
        let artifact_id = null, execution_id = null;
        if (runtimeStore) {
          runtimeStore.upsertTask({ id: 'ND-022', session_id: sessionId, title: 'localhost preview capture', status: 'IN_PROGRESS', risk: 'R1', active_model: 'local', started_at: new Date().toISOString() });
          execution_id = runtimeStore.startExecution({ session_id: sessionId, task_id: 'ND-022', operation: 'preview:localhost' });
          runtimeStore.finishExecution(execution_id, { status: result.status === 'passed' ? 'PASSED' : 'FAILED', exit_code: result.exit_code, summary: 'Ephemeral localhost DOM preview' });
          runtimeStore.recordExecutionOutput(execution_id, result.output);
          artifact_id = runtimeStore.recordArtifact({ session_id: sessionId, task_id: 'ND-022', execution_id, kind: 'preview', ref: 'execution://' + execution_id });
          runtimeStore.appendEvent({ session_id: sessionId, task_id: 'ND-022', execution_id, type: 'ArtifactCreated', actor: 'local-browser', payload: { artifact_id, kind: 'preview', ref: 'execution://' + execution_id } });
        }
        return send(200, { status: result.status, url: result.url, exit_code: result.exit_code, output: result.output.slice(0, 32768), artifact_id, execution_id });
      }

      if (req.method === 'POST' && url.pathname === '/api/route') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Same-origin JSON routing required' });
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 4096) { send(413, { error: 'Request too large' }); return; } }
        const data = JSON.parse(body);
        if (!data || typeof data.capability !== 'string' || !Array.isArray(data.candidates) || Object.keys(data).some(key => !['capability','candidates','override'].includes(key))) return send(400, { error: 'A bounded capability route request is required' });
        return send(200, routeCapability({ capability: data.capability, candidates: data.candidates, override: data.override ?? null, mike_approved_metered: false }));
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
        if (runtimeStore) {
          runtimeStore.upsertTask({ id: 'ND-025', session_id: sessionId, title: 'workflow:ND-025', status: 'IN_PROGRESS', risk: 'R1', active_model: 'local', started_at: new Date().toISOString() });
          runtimeStore.recordApproval({ session_id: sessionId, task_id: 'ND-025', action: 'execute ND-025', scope: '.norex/** only', risk: 'R1', decision: 'APPROVED' });
          runtimeStore.appendEvent({ session_id: sessionId, task_id: null, type: 'MikeApproved', actor: 'mike', payload: { workflow_id: 'ND-025', scope: '.norex/** only' } });
        }
        const result = await runRecorded('ND-025', 'workflow:ND-025', () => services.executeWorkflow(data.workflow_id, data.approved));
        if (runtimeStore && result.evidence_path) {
          runtimeStore.recordEvidence({ session_id: sessionId, task_id: 'ND-025', subject: 'ND-025 Shadow rehearsal', result: result.status, ref: result.evidence_path });
          runtimeStore.appendEvent({ session_id: sessionId, task_id: 'ND-025', type: 'EvidenceRecorded', actor: 'local', payload: { ref: result.evidence_path, result: result.status } });
        }
        return send(200, result);
      }

      if (req.method === 'POST' && url.pathname === '/api/cancel') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Same-origin JSON cancellation required' });
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1024) { send(413, { error: 'Request too large' }); return; } }
        const data = JSON.parse(body);
        if (!data || typeof data.request_id !== 'string' || Object.keys(data).sort().join(',') !== 'request_id') return send(400, { error: 'Exact request_id is required' });
        return send(200, await services.cancel(data.request_id));
      }

      if (req.method === 'POST' && url.pathname === '/api/run') {
        if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Same-origin JSON execution required' });
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 1024) { send(413, { error: 'Request too large' }); return; } }
        const data = JSON.parse(body);
        if (!data || Object.keys(data).sort().join(',') !== 'approved,command_id' || data.approved !== true) return send(400, { error: 'Explicit approval and a fixed command_id are required' });
        return send(200, await runRecorded('ND-020', 'command:' + data.command_id, () => services.run(data.command_id)));
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
  const runtimeStore = createRuntimeStore();
  const server = await startServer({ runtimeStore });
  let closing = false;
  const shutdown = signal => {
    if (closing) return;
    closing = true;
    const timer = setTimeout(() => process.exit(1), 3000); timer.unref();
    server.close(() => { runtimeStore.close(); clearTimeout(timer); process.exit(0); });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  console.log('Norex Dev OS Shadow: http://127.0.0.1:' + server.address().port);
}
