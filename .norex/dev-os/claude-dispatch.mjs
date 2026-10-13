import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { redact } from './local-services.mjs';

const run = promisify(execFile);
const MAX_PROMPT = 16 * 1024;
const MAX_OUTPUT = 128 * 1024;

export async function dispatchClaudePlan({ prompt, projectRoot, readiness, execFileAsync = run } = {}) {
  if (!readiness || readiness.status !== 'READY' || readiness.provider !== 'claude' || readiness.billing_mode !== 'SUBSCRIPTION_EXISTING_ACCESS') throw new Error('Claude dispatch readiness required');
  if (typeof prompt !== 'string' || !prompt.trim() || Buffer.byteLength(prompt, 'utf8') > MAX_PROMPT || prompt.includes('\0')) throw new Error('Claude prompt rejected');
  const executable = readiness.executable;
  if (executable !== '/home/mrsuccess/.npm-global/bin/claude') throw new Error('Claude executable rejected');
  const args = ['-p', '--permission-mode', 'plan', '--output-format', 'text', prompt];
  const result = await execFileAsync(executable, args, { cwd: projectRoot, encoding: 'utf8', timeout: 120000, maxBuffer: MAX_OUTPUT });
  return { status: 'PASSED', provider: 'claude', billing_mode: readiness.billing_mode, permission_mode: 'plan', output: redact(result.stdout).slice(0, MAX_OUTPUT) };
}
