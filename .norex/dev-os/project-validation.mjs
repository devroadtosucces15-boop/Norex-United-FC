import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

export async function runIsolatedProjectValidation(projectRoot) {
  const sandbox = await mkdtemp(resolve(tmpdir(), 'norex-project-validation-'));
  const copy = resolve(sandbox, 'repo');
  try {
    await cp(projectRoot, copy, { recursive: true, filter: source => !/(?:^|\/)\.git(?:\/|$)/.test(source) && !/(?:^|\/)site(?:\/|$)/.test(source) && !/(?:^|\/)node_modules(?:\/|$)/.test(source) });
    return await new Promise(resolveResult => {
      const child = spawn(process.execPath, ['tests/run.mjs'], { cwd: copy, env: { PATH: '/usr/bin:/bin', HOME: '/nonexistent', LANG: 'C.UTF-8', TZ: 'UTC', CI: '1', NO_LISTEN: '1' }, shell: false, stdio: ['ignore','pipe','pipe'] });
      let output = '';
      const collect = chunk => { if (output.length < 128 * 1024) output += chunk.toString().slice(0, 128 * 1024 - output.length); };
      child.stdout.on('data', collect); child.stderr.on('data', collect);
      child.on('close', exit_code => resolveResult({ status: exit_code === 0 ? 'passed' : 'failed', exit_code, output }));
      child.on('error', error => resolveResult({ status: 'spawn_failed', exit_code: null, output: error.message }));
    });
  } finally { await rm(sandbox, { recursive: true, force: true }); }
}

if (process.argv[1] && process.argv[1].endsWith('project-validation.mjs')) {
  const result = await runIsolatedProjectValidation(process.cwd());
  process.stdout.write(result.output);
  process.exit(result.exit_code ?? 1);
}
