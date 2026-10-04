import test from 'node:test';
import { request } from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServices, allowedPath, redact, execute, BRANCH } from './local-services.mjs';
import { startServer } from './server.mjs';
import { planIntent } from './control-plane.mjs';

const source = fileURLToPath(new URL('.', import.meta.url));
async function fixture(fn) {
  const root = await mkdtemp(resolve(tmpdir(), 'norex-service-test-'));
  try {
    await mkdir(resolve(root, '.norex/dev-os'), { recursive: true });
    await mkdir(resolve(root, '.norex/evidence'), { recursive: true });
    for (const file of ['server.mjs', 'local-services.mjs', 'control-plane.mjs', 'app.js', 'services.test.mjs', 'index.html', 'style.css']) await copyFile(resolve(source, file), resolve(root, '.norex/dev-os', file));
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
