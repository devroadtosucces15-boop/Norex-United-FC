import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { redact } from './local-services.mjs';

const run = promisify(execFile);
const MAX_PROMPT = 16 * 1024;
const MAX_OUTPUT = 128 * 1024;

export async function dispatchCodexReadOnly({ prompt, projectRoot, readiness, execFileAsync = run } = {}) {
  if (!readiness || readiness.status !== 'READY' || readiness.provider !== 'codex' || readiness.billing_mode !== 'SUBSCRIPTION_EXISTING_ACCESS') throw new Error('Codex dispatch readiness required');
  if (typeof prompt !== 'string' || !prompt.trim() || Buffer.byteLength(prompt, 'utf8') > MAX_PROMPT || prompt.includes('\0')) throw new Error('Codex prompt rejected');
  const executable = readiness.executable;
  if (executable !== '/home/mrsuccess/.local/bin/codex') throw new Error('Codex executable rejected');
  const args = ['exec', '--ephemeral', '--sandbox', 'read-only', '--ignore-user-config', '--color', 'never', prompt];
  const result = await execFileAsync(executable, args, { cwd: projectRoot, encoding: 'utf8', timeout: 120000, maxBuffer: MAX_OUTPUT });
  return { status: 'PASSED', provider: 'codex', billing_mode: readiness.billing_mode, sandbox: 'read-only', ephemeral: true, output: redact(result.stdout).slice(0, MAX_OUTPUT) };
}
