import { runIsolatedProjectValidation } from './project-validation.mjs';
import test from 'node:test';
import { request } from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rm, symlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServices, allowedPath, redact, execute, BRANCH } from './local-services.mjs';
import { startServer } from './server.mjs';
import { planIntent } from './control-plane.mjs';
import { createRuntimeStore } from './runtime-store.mjs';
import { routeCapability } from './capability-broker.mjs';
import { routeWithDurableApproval } from './routing-service.mjs';
import { probeProviderPresence } from './provider-probe.mjs';
import { permissionDecision, validateCredentialHandle } from './permission-broker.mjs';
import { permissionWithDurableGrant, permissionApprovalAction } from './permission-service.mjs';
import { createPtyService } from './pty-service.mjs';
import { utf8Prefix } from './utf8.mjs';
import { writeRecoveryBundle, readRecoveryBundle, restoreRecoveryBundle } from './recovery-bundle.mjs';
import { browserProbe, captureLocalPreview } from './browser-service.mjs';

const source = fileURLToPath(new URL('.', import.meta.url));
async function fixture(fn) {
  const root = await mkdtemp(resolve(tmpdir(), 'norex-service-test-'));
  try {
    await mkdir(resolve(root, '.norex/dev-os'), { recursive: true });
    await mkdir(resolve(root, '.norex/evidence'), { recursive: true });
    for (const file of ['server.mjs', 'local-services.mjs', 'runtime-store.mjs', 'capability-broker.mjs', 'routing-service.mjs', 'provider-probe.mjs', 'permission-broker.mjs', 'permission-service.mjs', 'pty-service.mjs', 'project-validation.mjs', 'recovery-bundle.mjs', 'browser-service.mjs', 'utf8.mjs', 'control-plane.mjs', 'app.js', 'services.test.mjs', 'index.html', 'style.css']) await copyFile(resolve(source, file), resolve(root, '.norex/dev-os', file));
    await writeFile(
      resolve(root, '.norex/evidence/ND-025-shadow-rehearsal.md'),
      '# ND-025 Shadow Rehearsal\n\nStatus: READY\nWorkflow: ND-025\n'
    );
    assert.equal((await execute('/usr/bin/git', ['init', '-b', BRANCH], root)).status, 'passed');
    assert.equal((await execute('/usr/bin/git', ['add', '--', '.norex/dev-os', '.norex/evidence/ND-025-shadow-rehearsal.md'], root)).status, 'passed');
    assert.equal((await execute('/usr/bin/git', ['-c', 'user.name=Norex Test', '-c', 'user.email=norex-test@localhost', 'commit', '-m', 'test fixture baseline'], root)).status, 'passed');
    await fn(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('Permission Broker requires opaque handles and mandatory high-risk approval', () => {
  assert.equal(validateCredentialHandle('credential://github/shadow-push'), true);
  assert.equal(validateCredentialHandle('ghp_secret'), false);
  assert.throws(() => permissionDecision({ provider: 'github', resource: 'repo', action: 'push', risk: 'R1', credential_handle: 'raw-secret' }), /opaque/);
  assert.equal(permissionDecision({ provider: 'local', resource: 'roadmap', action: 'read', risk: 'R0' }).status, 'ALLOWED');
  assert.equal(permissionDecision({ provider: 'github', resource: 'shadow', action: 'push', risk: 'R1', credential_handle: 'credential://github/shadow-push' }).status, 'APPROVAL_REQUIRED');
  assert.equal(permissionDecision({ provider: 'github', resource: 'shadow', action: 'push', risk: 'R1', credential_handle: 'credential://github/shadow-push', grant: 'ALLOW_SESSION', exact_grant_match: true }).status, 'ALLOWED');
  assert.equal(permissionDecision({ provider: 'cloud', resource: 'production', action: 'delete', environment: 'PRODUCTION', risk: 'R4', grant: 'ALLOW_ALWAYS_SPECIFIC_ACTION', exact_grant_match: true, destructive: true }).status, 'APPROVAL_REQUIRED');
  assert.equal(permissionDecision({ provider: 'github', resource: 'shadow', action: 'push', risk: 'R1', grant: 'DENY', exact_grant_match: true }).status, 'DENIED');
});

test('durable permission grants are exact, session-scoped and cannot bypass mandatory approval', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'norex-permission-grant-'));
  try {
    const store = createRuntimeStore({ dbPath: resolve(root, 'runtime.db') });
    store.ensureSession({ id: 'permission-session', project: 'Norex United', branch: BRANCH });
    const action = permissionApprovalAction({ provider: 'github', resource: 'shadow', action: 'push', credential_handle: 'credential://github/shadow-push' });
    store.recordApproval({ id: 'permission-approval', session_id: 'permission-session', action, scope: 'permission-action', risk: 'R1', decision: 'APPROVED' });
    const allowed = permissionWithDurableGrant({ store, session_id: 'permission-session', provider: 'github', resource: 'shadow', action: 'push', risk: 'R1', credential_handle: 'credential://github/shadow-push' });
    assert.equal(allowed.status, 'ALLOWED'); assert.equal(allowed.approval_id, 'permission-approval');
    const other = permissionWithDurableGrant({ store, session_id: 'permission-session', provider: 'github', resource: 'shadow', action: 'fetch', risk: 'R1', credential_handle: 'credential://github/shadow-push' });
    assert.equal(other.status, 'APPROVAL_REQUIRED'); assert.equal(other.approval_id, null);
    const highRisk = permissionWithDurableGrant({ store, session_id: 'permission-session', provider: 'github', resource: 'shadow', action: 'push', environment: 'PRODUCTION', risk: 'R1', credential_handle: 'credential://github/shadow-push' });
    assert.equal(highRisk.status, 'APPROVAL_REQUIRED');
    store.close();
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Capability Broker enforces deterministic, billing, security and override gates', () => {
  assert.deepEqual(routeCapability({ capability: 'unit_tests' }), { status: 'ROUTED', capability: 'unit_tests', provider: 'local_ci', billing_mode: 'LOCAL_OFFLINE', reason: 'deterministic-local-first', cost_permission: 'ALLOWED' });
  const candidates = [
    { provider: 'claude', billing_mode: 'METERED_API', available: true, security_permitted: true, rank: 1 },
    { provider: 'codex', billing_mode: 'SUBSCRIPTION_EXISTING_ACCESS', verified: true, available: true, security_permitted: true, rank: 2 }
  ];
  assert.equal(routeCapability({ capability: 'code_review', candidates }).provider, 'codex');
  assert.equal(routeCapability({ capability: 'code_review', candidates, override: 'claude' }).reason, 'metered-approval-required');
  assert.equal(routeCapability({ capability: 'code_review', candidates, override: 'claude', mike_approved_metered: true }).provider, 'claude');
  assert.equal(routeCapability({ capability: 'architecture', candidates: [{ provider: 'chatgpt', billing_mode: 'UNKNOWN_BILLING', available: true, security_permitted: true }] }).status, 'GATED');
  assert.equal(routeCapability({ capability: 'architecture', candidates: [{ provider: 'chatgpt', billing_mode: 'VERIFIED_FREE', available: true, security_permitted: false }] }).status, 'GATED');
  const ranked = routeCapability({ capability: 'architecture', candidates: [
    { provider: 'degraded', billing_mode: 'VERIFIED_FREE', available: true, security_permitted: true, rank: 1, health: 'degraded', quality_score: 50 },
    { provider: 'healthy', billing_mode: 'VERIFIED_FREE', available: true, security_permitted: true, rank: 1, health: 'healthy', quality_score: 90, reliability_score: 90, allowance_score: 90 }
  ] });
  assert.equal(ranked.provider, 'healthy');
});

test('provider presence probe is deterministic and never infers auth, allowance or billing', async () => {
  const paths = { claude: ['/fake/claude'], codex: ['/fake/codex'] };
  const accessFn = async path => { if (path !== '/fake/claude') throw Object.assign(new Error('missing'), { code: 'ENOENT' }); };
  const claude = await probeProviderPresence('claude', { paths, accessFn });
  const codex = await probeProviderPresence('codex', { paths, accessFn });
  assert.equal(claude.installed, true); assert.equal(claude.executable, '/fake/claude');
  assert.equal(codex.installed, false);
  for (const probe of [claude, codex]) { assert.equal(probe.auth, 'UNKNOWN'); assert.equal(probe.allowance, 'UNKNOWN'); assert.equal(probe.billing, 'UNKNOWN_BILLING'); }
  const missing = await probeProviderPresence('not-a-provider', { paths, accessFn }); assert.equal(missing.installed, false); assert.equal(missing.billing, 'UNKNOWN_BILLING');
});

test('durable approval authorizes only its exact metered route', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'norex-route-approval-'));
  try {
    const store = createRuntimeStore({ dbPath: resolve(root, 'runtime.db') });
    const session = store.ensureSession({ id: 'route-session', project: 'Norex United', branch: BRANCH });
    store.recordApproval({ id: 'approval-1', session_id: session, action: 'metered:claude:code_review', scope: 'single-route', risk: 'R3', decision: 'APPROVED' });
    const candidates = [{ provider: 'claude', billing_mode: 'METERED_API', available: true, security_permitted: true }];
    const approved = routeWithDurableApproval({ store, session_id: session, capability: 'code_review', candidates, override: 'claude' });
    assert.equal(approved.status, 'ROUTED'); assert.equal(approved.approval_id, 'approval-1');
    const other = routeWithDurableApproval({ store, session_id: session, capability: 'architecture', candidates, override: 'claude' });
    assert.equal(other.status, 'GATED'); assert.equal(other.approval_id, null);
    store.close();
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('UTF-8 byte prefix preserves complete code points and legitimate replacement characters', () => {
  assert.equal(utf8Prefix('abc😀z', 5), 'abc');
  assert.equal(utf8Prefix('abc😀z', 7), 'abc😀');
  assert.equal(utf8Prefix('ok�done', 5), 'ok�');
  assert.ok(Buffer.byteLength(utf8Prefix('😀'.repeat(100), 127), 'utf8') <= 127);
});

test('runtime store persists normalized task/execution/event state and rejects secret-like payloads', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'norex-runtime-test-'));
  const dbPath = resolve(root, 'runtime/norex.db');
  try {
    let store = createRuntimeStore({ dbPath });
    assert.equal((await stat(dbPath)).mode & 0o777, 0o600);
    const session = store.ensureSession({ id: 'session-test', project: 'Norex United', branch: BRANCH });
    store.upsertTask({ id: 'ND-027', session_id: session, title: 'Durable runtime state', status: 'IN_PROGRESS', risk: 'R1', active_model: 'local' });
    const execution = store.startExecution({ session_id: session, task_id: 'ND-027', operation: 'shadow-tests' });
    store.appendEvent({ session_id: session, task_id: 'ND-027', execution_id: execution, type: 'CIRunStarted', actor: 'local', payload: { command_id: 'shadow-tests' }, correlation_id: 'corr-1' });
    store.finishExecution(execution, { status: 'PASSED', exit_code: 0, summary: '10 tests passed' });
    store.appendEvent({ session_id: session, task_id: 'ND-027', execution_id: execution, type: 'CIPassed', actor: 'local', payload: { tests: 10 }, causation_id: 'corr-1' });
    store.recordApproval({ session_id: session, task_id: 'ND-027', action: 'execute local validation', scope: '.norex/** only', risk: 'R1', decision: 'APPROVED' });
    store.recordEvidence({ session_id: session, task_id: 'ND-027', subject: 'runtime persistence', result: 'PASSED', ref: '.norex/evidence/runtime.md' });
    store.recordArtifact({ session_id: session, task_id: 'ND-027', execution_id: execution, kind: 'tests', ref: 'execution://' + execution });
    assert.equal(store.listArtifacts(session)[0].kind, 'tests');
    assert.equal(store.recordExecutionOutput(execution, 'bounded output').truncated, false);
    assert.equal(store.getExecutionOutput(execution).output, 'bounded output');
    assert.equal(store.getExecutionOutput(execution, session).output, 'bounded output');
    assert.equal(store.getExecutionOutput(execution, 'different-session'), null);
    assert.equal(store.recordExecutionOutput(execution, 'x'.repeat(40000)).truncated, true);
    assert.equal(store.getExecutionOutput(execution).output.length, 32768);
    const unicode = store.recordExecutionOutput(execution, '😀'.repeat(10000));
    assert.equal(unicode.truncated, true);
    assert.ok(Buffer.byteLength(unicode.output, 'utf8') <= 32768);
    assert.equal(unicode.output.includes('�'), false);
    assert.throws(() => store.recordExecutionOutput(execution, 'password=secret'), /secret-like/);
    assert.deepEqual(store.snapshot(), { schema_version: 2, sessions: 1, tasks: 1, executions: 1, events: 2, approvals: 1, artifacts: 1, execution_output: 1, evidence: 1 });
    assert.deepEqual(store.executionTelemetry(session), { session_id: session, executions: 1, cost_microunits: 0, groups: [{ provider: 'local', billing_mode: 'LOCAL_OFFLINE', status: 'PASSED', executions: 1, cost_microunits: 0 }] });
    const active = store.startExecution({ session_id: session, task_id: 'ND-027', operation: 'still-running' });
    assert.equal(store.sessionObservability(session).execution_failures, 0);
    store.finishExecution(active, { status: 'FAILED', exit_code: 1, summary: 'expected test failure' });
    assert.equal(store.sessionObservability(session).execution_failures, 1);
    assert.throws(() => store.appendEvent({ session_id: session, type: 'CIPassed', actor: 'local', payload: { token: 'secret-value' } }), /secret-like/);
    assert.throws(() => store.appendEvent({ session_id: session, type: 'MadeUpEvent', actor: 'local' }), /Unknown event/);
    store.close();
    store = createRuntimeStore({ dbPath });
    const events = store.listEvents(session);
    assert.equal(events.length, 2);
    assert.equal(events[0].type, 'CIRunStarted');
    assert.deepEqual(events[1].payload, { tests: 10 });
    store.close();
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('runtime export/restore is versioned, non-secret and marks active executions interrupted', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'norex-restore-test-'));
  try {
    const sourceStore = createRuntimeStore({ dbPath: resolve(root, 'source.db') });
    const session = sourceStore.ensureSession({ id: 'restore-session', project: 'Norex United', branch: BRANCH });
    sourceStore.upsertTask({ id: 'ND-R', session_id: session, title: 'Recovery', status: 'IN_PROGRESS', risk: 'R1' });
    sourceStore.startExecution({ id: 'active-execution', session_id: session, task_id: 'ND-R', operation: 'recovery-test' });
    sourceStore.appendEvent({ session_id: session, task_id: 'ND-R', execution_id: 'active-execution', type: 'RecoveryCheckpoint', actor: 'local', payload: { checkpoint: 'before-export' } });
    sourceStore.recordExecutionOutput('active-execution', 'recoverable output');
    const bundle = sourceStore.exportState();
    sourceStore.close();
    assert.equal(bundle.format, 'norex-runtime-export');
    assert.equal(bundle.schema_version, 2);
    assert.doesNotMatch(JSON.stringify(bundle), /credential:\/\//i);
    const restored = createRuntimeStore({ dbPath: resolve(root, 'restored.db') });
    const snapshot = restored.restoreState(bundle);
    assert.equal(snapshot.sessions, 1);
    assert.equal(snapshot.executions, 1);
    assert.equal(restored.exportState().executions[0].status, 'INTERRUPTED');
    assert.equal(restored.getExecutionOutput('active-execution').output, 'recoverable output');
    assert.throws(() => restored.restoreState(bundle), /empty/);
    const incompatible = createRuntimeStore({ dbPath: resolve(root, 'bad.db') });
    assert.throws(() => incompatible.restoreState({ format: 'norex-runtime-export', schema_version: 999 }), /Unsupported/);
    incompatible.close();
    restored.close();
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('browser adapter is local-only and detects installed Chromium', async () => {
  const probe = await browserProbe();
  assert.equal(probe.status, 'AVAILABLE');
  assert.match(probe.executable, /chromium|chrome/);
  await assert.rejects(() => captureLocalPreview('https://example.com'), /localhost-only/);
  await assert.rejects(() => captureLocalPreview('http://127.0.0.1:4000', { allowedOrigin: 'http://127.0.0.1:3000' }), /approved origin/);
});

test('isolated project validation has a bounded timeout contract', async () => {
  await fixture(async root => {
    const result = await runIsolatedProjectValidation(root, { timeoutMs: 1 });
    assert.equal(result.status, 'timeout');
  });
});

test('portable recovery bundle is exclusive, integrity-checked and restorable', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'norex-recovery-bundle-'));
  const sourceDb = resolve(root, 'source.db'), restoredDb = resolve(root, 'restored.db'), bundlePath = resolve(root, 'runtime.norex-recovery.json');
  try {
    const sourceStore = createRuntimeStore({ dbPath: sourceDb });
    const session = sourceStore.ensureSession({ id: 'bundle-session', project: 'Norex United', branch: BRANCH });
    sourceStore.upsertTask({ id: 'ND-024', session_id: session, title: 'Recovery bundle', status: 'IN_PROGRESS', risk: 'R1' });
    const repository = { root, branch: BRANCH, commit: 'abc123' };
    const manifest = await writeRecoveryBundle(sourceStore, bundlePath, { repository });
    assert.equal(manifest.algorithm, 'sha256');
    assert.equal(manifest.version, 2);
    await assert.rejects(() => writeRecoveryBundle(sourceStore, bundlePath, { repository }), /EEXIST/);
    const bundle = await readRecoveryBundle(bundlePath);
    assert.equal(bundle.state.tasks.length, 1);
    assert.deepEqual(bundle.repository, { root: resolve(root), branch: BRANCH, commit: 'abc123' });
    const restoredStore = createRuntimeStore({ dbPath: restoredDb });
    await assert.rejects(() => restoreRecoveryBundle(restoredStore, bundlePath), /identity is required/);
    await assert.rejects(() => restoreRecoveryBundle(restoredStore, bundlePath, { repository: { ...repository, commit: 'wrong' } }), /identity mismatch/);
    assert.equal((await restoreRecoveryBundle(restoredStore, bundlePath, { repository })).tasks, 1);
    restoredStore.close(); sourceStore.close();
    const envelope = JSON.parse(await readFile(bundlePath, 'utf8'));
    const reorderedPath = resolve(root, 'reordered.norex-recovery.json');
    const reordered = { repository: envelope.repository, state: envelope.state, digest: envelope.digest, algorithm: envelope.algorithm, version: envelope.version, format: envelope.format };
    await writeFile(reorderedPath, JSON.stringify(reordered), { mode: 0o600 });
    assert.deepEqual(await readRecoveryBundle(reorderedPath), { state: envelope.state, repository: envelope.repository });
    envelope.state.tasks[0].title = 'tampered';
    await writeFile(bundlePath, JSON.stringify(envelope));
    await assert.rejects(() => readRecoveryBundle(bundlePath), /integrity/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('PTY service supports allowlisted interactive stdin/read/close and explicitly gates resize', { skip: process.env.NOREX_WORKFLOW_VALIDATION === '1' }, async () => {
  const pty = createPtyService({ cwd: tmpdir() });
  assert.throws(() => pty.open('bash'), /allowlisted/);
  const opened = pty.open('node-repl');
  await new Promise(done => setTimeout(done, 100));
  pty.write(opened.session_id, "console.log('interactive-ok')\n");
  await new Promise(done => setTimeout(done, 100));
  const state = pty.read(opened.session_id);
  assert.match(state.output, /interactive-ok/);
  assert.equal(pty.resize(opened.session_id, 100, 30).status, 'GATED');
  assert.match(pty.close(opened.session_id).status, /CLOSING|CLOSED|EXITED/);
  for (let i = 0; i < 20 && pty.read(opened.session_id).status === 'CLOSING'; i++) await new Promise(done => setTimeout(done, 50));
  assert.match(pty.read(opened.session_id).status, /CLOSED|EXITED/);
});

test('filesystem create is exclusive, Shadow-scoped and rejects secret-like content', () => fixture(async root => {
  await mkdir(resolve(root, '.norex/notes'), { recursive: true });
  const services = await createServices(root);
  const path = '.norex/notes/new-file.md';
  assert.equal((await services.createText(path, 'safe\n')).status, 'created');
  assert.equal((await services.inspect(path)).content, 'safe\n');
  await assert.rejects(() => services.createText(path, 'overwrite'), /EEXIST/);
  await assert.rejects(() => services.createText('.norex/notes/safe.txt', 'github_pat_abcdefghijklmnop'), /Secret-like/);
  await assert.rejects(() => services.createText('../outside.md', 'x'), /scoped/);
}));

test('filesystem write/edit requires scoped existing text, exact preconditions and no secret-like content', () => fixture(async root => {
  const services = await createServices(root);
  const path = '.norex/notes/write-test.md';
  await mkdir(resolve(root, '.norex/notes'), { recursive: true });
  await writeFile(resolve(root, path), 'alpha\nbeta\n');
  // Restart service after fixture creation so the path is reviewed as ordinary scoped content.
  const writer = await createServices(root);
  assert.equal((await writer.writeText(path, 'alpha\ngamma\n', { expected: 'alpha\nbeta\n' })).status, 'written');
  await assert.rejects(() => writer.writeText(path, 'bad', { expected: 'stale' }), /precondition/);
  await writer.editText(path, 'gamma', 'delta');
  assert.equal((await writer.inspect(path)).content, 'alpha\ndelta\n');
  await assert.rejects(() => writer.editText(path, 'missing', 'x'), /one exact match/);
  await assert.rejects(() => writer.writeText(path, 'sk-abcdefghijklmnop'), /Secret-like/);
  await assert.rejects(() => writer.writeText('../outside.md', 'x'), /scoped/);
}));

test('runner supports cancellation and redacted output streaming', async () => {
  const controller = new AbortController();
  const chunks = [];
  const pending = execute(process.execPath, ['-e', "console.log('first'); setTimeout(()=>console.log('second'),5000)"], tmpdir(), { timeout: 10000, signal: controller.signal, onChunk: chunk => chunks.push(chunk) });
  await new Promise(done => setTimeout(done, 100));
  controller.abort();
  const result = await pending;
  assert.equal(result.status, 'cancelled');
  assert.match(chunks.join(''), /first/);
  assert.doesNotMatch(chunks.join(''), /second/);
});

test('Control Plane recognizes ND-025 and gates unsupported intent', () => {
  const plan = planIntent('Run ND-025 Shadow rehearsal. Create a harmless Shadow-only evidence change under .norex/, inspect the resulting diff, run deterministic validation, record the evidence, and do not modify production files or main.');
  assert.equal(plan.recognized, true);
  assert.equal(plan.status, 'PROPOSED');
  assert.equal(plan.workflow_id, 'ND-025');
  assert.equal(plan.scope, '.norex/** only');
  assert.equal(plan.risk, 'R1');
  assert.equal(plan.requires_approval, true);
  assert.equal(plan.steps.length, 5);
  assert.deepEqual(plan.steps.map(step => step.capability), [
    'git.status',
    'evidence.write',
    'git.diff',
    'ci.shadow',
    'evidence.record'
  ]);

  const unknown = planIntent('delete production and deploy everything');
  assert.equal(unknown.recognized, false);
  assert.equal(unknown.status, 'GATED');

  assert.throws(() => planIntent(''), /1-1000/);
  assert.throws(() => planIntent('x'.repeat(1001)), /1-1000/);
  assert.throws(() => planIntent(null), /text/);
});

test('path policy rejects traversal, secrets, hidden files, absolute paths and shell paths', () => {
  for (const path of ['../a.md', '/etc/passwd', '.norex/../a.md', '.norex/.env', '.norex/secrets.json', '.norex/key.pem', '.norex/a\\b.md', '.norex//x.md', '.norex/a\0.md', '.norex/a.sh']) assert.equal(allowedPath(path), false, path);
  assert.equal(allowedPath('.norex/project/LOCAL_SERVICES.md'), true);
  assert.equal(redact('api_key=example-value'), 'api_key=[REDACTED]');
});
test('bounded runner reports nonzero exit, timeout and output limit', async () => {
  assert.equal((await execute(process.execPath, ['-e', 'process.exit(7)'], source)).exit_code, 7);
  assert.equal((await execute(process.execPath, ['-e', 'setInterval(()=>{},1000)'], source, { timeout: 100 })).status, 'timeout');
  assert.equal((await execute(process.execPath, ['-e', 'console.log("x".repeat(10000))'], source, { limit: 100 })).status, 'output_limit');
  assert.equal((await execute(process.execPath, ['-e', 'console.log(process.env.HOME); console.log(process.env.NODE_OPTIONS)'], source)).output, '/nonexistent\nundefined\n');
});
test('inspection blocks symlinks, binary/oversized files and outside scope', () => fixture(async root => {
  const service = await createServices(root);
  await symlink('/etc/passwd', resolve(root, '.norex/link.txt'));
  await writeFile(resolve(root, '.norex/large.txt'), 'x'.repeat(140000));
  await writeFile(resolve(root, '.norex/binary.txt'), '\0');
  for (const path of ['.norex/link.txt', '.norex/large.txt', '.norex/binary.txt', 'package.json']) await assert.rejects(service.inspect(path));
  assert.equal((await service.files()).includes('.norex/link.txt'), false);
  assert.ok((await service.inspect('.norex/dev-os/server.mjs')).content.includes('startServer'));
}));
test('Git returns only scoped status and separates staged and unstaged patches', () => fixture(async root => {
  await writeFile(resolve(root, 'outside.txt'), 'outside');
  await writeFile(resolve(root, '.norex/example.txt'), 'first\n');
  const service = await createServices(root);
  assert.ok((await service.status()).changes.every(c => c.path.startsWith('.norex/')));
  await execute('/usr/bin/git', ['add', '--', '.norex/example.txt'], root);
  await writeFile(resolve(root, '.norex/example.txt'), 'second\n');
  const diff = await service.diff('.norex/example.txt');
  assert.match(diff.staged, /\+first/); assert.match(diff.unstaged, /\+second/);
  await assert.rejects(service.diff('outside.txt'));
  assert.equal((await service.diff('.norex/*.txt')).staged, '', 'Git pathspec wildcards stay literal');
}));
test('execution rejects unknown commands, concurrent jobs, altered code and wrong branch', () => fixture(async root => {
  const service = await createServices(root);
  await assert.rejects(service.run('node --version; touch /tmp/no'));
  const run = service.run('shadow-check');
  await assert.rejects(service.run('node-version'), /already running/);
  assert.equal((await run).status, 'passed');
  assert.match((await service.run('node-version')).output, /^v\d/);
  await writeFile(resolve(root, '.norex/dev-os/app.js'), '// changed');
  await assert.rejects(service.run('node-version'), /code changed/);
  await execute('/usr/bin/git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], root);
  await assert.rejects(service.run('node-version'), /requires foundation/);
}));
test('ND-025 execution is fixed, approval-gated and Shadow-scoped', {
  skip: process.env.NOREX_WORKFLOW_VALIDATION === '1'
}, () => fixture(async root => {
  const service = await createServices(root);

  await assert.rejects(
    service.executeWorkflow('ND-025', false),
    /approval/i
  );

  await assert.rejects(
    service.executeWorkflow('UNKNOWN', true),
    /workflow/i
  );

  const before = await service.status();
  assert.deepEqual(before.changes, []);

  const result = await service.executeWorkflow('ND-025', true);

  assert.equal(result.workflow_id, 'ND-025');
  assert.equal(result.branch, BRANCH);
  assert.equal(result.scope, '.norex/** only');
  assert.equal(result.status, 'VALIDATED');
  assert.equal(result.approval, 'explicit-local-ui-action');
  assert.equal(result.provider_calls, 0);
  assert.equal(result.steps.length, 5);
  assert.deepEqual(result.steps.map(step => step.capability), [
    'git.status',
    'evidence.write',
    'git.diff',
    'ci.shadow',
    'evidence.record'
  ]);
  assert.ok(result.evidence_path.startsWith('.norex/evidence/'));
  assert.ok(result.evidence_path.endsWith('.md'));

  const evidence = await service.inspect(result.evidence_path);
  assert.match(evidence.content, /ND-025/);
  assert.match(evidence.content, /VALIDATED/);

  const after = await service.status();
  assert.ok(after.changes.length >= 1);
  assert.ok(after.changes.every(change => change.path.startsWith('.norex/')));
  assert.ok(after.changes.some(change => change.path === result.evidence_path));

  await assert.rejects(
    service.executeWorkflow('ND-025', true),
    /checkpoint|clean/i
  );
}));

test('HTTP deterministic execution records durable runtime events', () => fixture(async root => {
  const runtimeRoot = await mkdtemp(resolve(tmpdir(), 'norex-http-runtime-'));
  const store = createRuntimeStore({ dbPath: resolve(runtimeRoot, 'norex.db') });
  const server = await startServer({ projectRoot: root, port: 0, runtimeStore: store });
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    const response = await fetch(origin + '/api/run', {
      method: 'POST',
      headers: { 'X-Norex-Local': '1', Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ command_id: 'node-version', approved: true })
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'passed');
    const state = await (await fetch(origin + '/api/state', { headers: { 'X-Norex-Local': '1' } })).json();
    assert.equal(state.runtime.schema_version, 2);
    assert.equal(state.runtime.executions, 1);
    assert.equal(state.telemetry.execution.executions, 1);
    assert.equal(state.telemetry.observability.ci_passed, 1);
    assert.equal(state.telemetry.observability.ci_failed, 0);
    const snapshot = store.snapshot();
    assert.equal(snapshot.sessions, 1);
    assert.equal(snapshot.tasks, 1);
    assert.equal(snapshot.executions, 1);
    assert.equal(snapshot.events, 3);
    assert.equal(snapshot.artifacts, 1);
    assert.deepEqual(store.listEvents('shadow-local').map(event => event.type), ['CIRunStarted', 'ArtifactCreated', 'CIPassed']);
    const artifacts = await (await fetch(origin + '/api/artifacts', { headers: { 'X-Norex-Local': '1' } })).json();
    assert.equal(artifacts.artifacts.length, 1);
    assert.equal(artifacts.artifacts[0].kind, 'terminal');
  } finally {
    server.closeAllConnections();
    await new Promise(done => server.close(done));
    store.close();
    await rm(runtimeRoot, { recursive: true, force: true });
  }
}));

test('HTTP recovery export is approval-gated, repository-bound and integrity-verified', () => fixture(async root => {
  const dbPath = resolve(root, 'recovery-ui-runtime.db');
  const store = createRuntimeStore({ dbPath });
  store.ensureSession({ id: 'recovery-ui', project: 'Norex United', branch: BRANCH });
  const server = await startServer({ projectRoot: root, port: 0, runtimeStore: store });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const headers = { 'X-Norex-Local': '1', Origin: origin, 'Content-Type': 'application/json' };
  try {
    const denied = await fetch(origin + '/api/recovery/export', { method: 'POST', headers, body: JSON.stringify({ approved: false }) });
    assert.equal(denied.status, 400);
    const response = await fetch(origin + '/api/recovery/export', { method: 'POST', headers, body: JSON.stringify({ approved: true }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.status, 'VERIFIED');
    assert.equal(result.version, 2);
    assert.equal(result.algorithm, 'sha256');
    assert.equal(result.repository.root, resolve(root));
    assert.equal(result.repository.branch, BRANCH);
    assert.match(result.repository.commit, /^[0-9a-f]{40}$/);
    assert.ok(result.state.sessions >= 1);
  } finally { server.closeAllConnections(); await new Promise(resolveClose => server.close(resolveClose)); store.close(); }
}));

test('HTTP localhost preview persists durable artifact and bounded output', () => fixture(async root => {
  const dbPath = resolve(root, 'preview-runtime.db');
  const store = createRuntimeStore({ dbPath });
  const server = await startServer({ projectRoot: root, port: 0, runtimeStore: store });
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    const malformed = await fetch(origin + '/api/preview', { method: 'POST', headers: { 'X-Norex-Local': '1', Origin: origin, 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    const response = await fetch(origin + '/api/preview', { method: 'POST', headers: { 'X-Norex-Local': '1', Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ approved: true }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.status, 'passed');
    assert.ok(result.execution_id);
    const artifacts = store.listArtifacts('shadow-local');
    assert.equal(artifacts.at(-1).kind, 'preview');
    assert.match(store.getExecutionOutput(result.execution_id).output, /NOREX DEV/);
  } finally { server.closeAllConnections(); await new Promise(resolveClose => server.close(resolveClose)); store.close(); }
}));

test('HTTP capability routing never self-approves metered access', () => fixture(async root => {
  const server = await startServer({ projectRoot: root, port: 0 });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const headers = { 'X-Norex-Local': '1', Origin: origin, 'Content-Type': 'application/json' };
  const route = body => fetch(origin + '/api/route', { method: 'POST', headers, body: JSON.stringify(body) });
  try {
    const local = await (await route({ capability: 'unit_tests', candidates: [] })).json();
    assert.equal(local.provider, 'local_ci');
    assert.equal(local.cost_permission, 'ALLOWED');
    const metered = await (await route({ capability: 'code_review', candidates: [{ provider: 'claude', billing_mode: 'METERED_API', available: true, security_permitted: true }] })).json();
    assert.equal(metered.status, 'GATED');
    assert.equal(metered.reason, 'metered-approval-required');
    assert.equal((await route({ capability: 'code_review', candidates: [], mike_approved_metered: true })).status, 400);
  } finally { server.closeAllConnections(); await new Promise(done => server.close(done)); }
}));

test('HTTP planning is same-origin, bounded and exact-shape', () => fixture(async root => {
  const server = await startServer({ projectRoot: root, port: 0 });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const headers = {
    'X-Norex-Local': '1',
    Origin: origin,
    'Content-Type': 'application/json'
  };
  const plan = (body, requestHeaders = headers) => fetch(origin + '/api/plan', {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body)
  });
  try {
    assert.equal((await plan({})).status, 400);
    assert.equal((await plan({ intent: 'ND-025', extra: true })).status, 400);
    assert.equal((await plan({ intent: 25 })).status, 400);
    assert.equal((await plan({ intent: 'x'.repeat(2100) })).status, 413);
    assert.equal((await plan(
      { intent: 'ND-025' },
      { 'X-Norex-Local': '1', 'Content-Type': 'application/json' }
    )).status, 403);
    const recognized = await (await plan({ intent: 'Run ND-025 Shadow rehearsal.' })).json();
    assert.equal(recognized.recognized, true);
    assert.equal(recognized.workflow_id, 'ND-025');
    assert.equal(recognized.requires_approval, true);
    const gated = await (await plan({ intent: 'deploy production now' })).json();
    assert.equal(gated.recognized, false);
    assert.equal(gated.status, 'GATED');
  } finally {
    server.closeAllConnections();
    await new Promise(done => server.close(done));
  }
}));

test('HTTP workflow execution requires exact explicit approval', {
  skip: process.env.NOREX_WORKFLOW_VALIDATION === '1'
}, () => fixture(async root => {
  const server = await startServer({ projectRoot: root, port: 0 });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const headers = {
    'X-Norex-Local': '1',
    Origin: origin,
    'Content-Type': 'application/json'
  };

  const executeWorkflow = (body, requestHeaders = headers) =>
    fetch(origin + '/api/workflow/execute', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body)
    });

  try {
    assert.equal(
      (await executeWorkflow({ workflow_id: 'ND-025' })).status,
      400
    );

    assert.equal(
      (await executeWorkflow({ workflow_id: 'UNKNOWN', approved: true })).status,
      400
    );

    assert.equal(
      (await executeWorkflow({
        workflow_id: 'ND-025',
        approved: true,
        command: 'touch /tmp/no'
      })).status,
      400
    );

    assert.equal(
      (await executeWorkflow(
        { workflow_id: 'ND-025', approved: true },
        { 'X-Norex-Local': '1', 'Content-Type': 'application/json' }
      )).status,
      403
    );

    const result = await (
      await executeWorkflow({ workflow_id: 'ND-025', approved: true })
    ).json();

    assert.equal(result.workflow_id, 'ND-025');
    assert.equal(result.status, 'VALIDATED');
    assert.equal(result.approval, 'explicit-local-ui-action');
    assert.equal(result.provider_calls, 0);
    assert.ok(result.evidence_path.startsWith('.norex/evidence/'));
  } finally {
    server.closeAllConnections();
    await new Promise(done => server.close(done));
  }
}));

test('HTTP enforces host/origin/header/approval, static allowlist and API results', () => fixture(async root => {
  const server = await startServer({ projectRoot: root, port: 0 });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const headers = { 'X-Norex-Local': '1' };
  try {
    assert.equal((await fetch(origin)).status, 200);
    assert.equal((await fetch(origin + '/server.mjs')).status, 404);
    assert.equal((await fetch(origin + '/api/state')).status, 403);
    assert.equal(await new Promise((done, reject) => { const req = request(origin + '/api/state', { headers: { ...headers, Host: 'evil.test' } }, res => { res.resume(); done(res.statusCode); }); req.on('error', reject); req.end(); }), 403);
    assert.equal((await fetch(origin + '/api/state', { headers: { ...headers, Origin: 'https://evil.test' } })).status, 403);
    assert.equal((await fetch(origin + '/api/state', { headers: { ...headers, 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    assert.equal((await (await fetch(origin + '/api/state', { headers })).json()).provider, 'gated');
    assert.equal((await fetch(origin + '/api/file?path=..%2Fsecret.txt', { headers })).status, 400);
    const run = body => fetch(origin + '/api/run', { method: 'POST', headers: { ...headers, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await run({ command_id: 'node-version' })).status, 400);
    assert.equal((await run({ command_id: 'node-version', approved: true, args: ['-e', 'bad'] })).status, 400);
    assert.equal((await run({ command_id: 'bad', approved: true })).status, 400);
    assert.equal((await (await run({ command_id: 'node-version', approved: true })).json()).status, 'passed');
    assert.equal((await fetch(origin + '/api/run', { method: 'POST', headers, body: '{}' })).status, 403);
  } finally { server.closeAllConnections(); await new Promise(done => server.close(done)); }
}));
