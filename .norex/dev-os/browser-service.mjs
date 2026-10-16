import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { appendUtf8Bounded } from './utf8.mjs';

const CANDIDATES = ['/usr/bin/chromium','/usr/bin/google-chrome'];
const OUTPUT_LIMIT = 65536, STDERR_LIMIT = 4096;
export async function browserProbe() {
  for (const executable of CANDIDATES) { try { await access(executable); return { status: 'AVAILABLE', executable, mode: 'ephemeral-headless', cost: '$0.00' }; } catch {} }
  return { status: 'GATED', reason: 'No supported local Chromium executable' };
}
export async function captureLocalPreview(url, { timeoutMs = 10000, allowedOrigin = null } = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(parsed.hostname)) throw new Error('Preview navigation is localhost-only');
  if (allowedOrigin && parsed.origin !== new URL(allowedOrigin).origin) throw new Error('Preview navigation must match the approved origin');
  const probe = await browserProbe(); if (probe.status !== 'AVAILABLE') throw new Error(probe.reason);
  const profile = await mkdtemp(join(tmpdir(), 'norex-browser-'));
  const args = ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--metrics-recording-only',`--user-data-dir=${profile}`,'--dump-dom',url];
  try {
    return await new Promise(resolve => {
      const child = spawn(probe.executable, args, { env: { PATH: '/usr/bin:/bin', HOME: profile, LANG: 'C.UTF-8' }, shell: false, stdio: ['ignore','pipe','pipe'] });
      let output='', stderr='';
      child.stdout.on('data', c => output=appendUtf8Bounded(output,c,OUTPUT_LIMIT)); child.stderr.on('data', c => stderr=appendUtf8Bounded(stderr,c,STDERR_LIMIT));
      const timer=setTimeout(()=>child.kill('SIGKILL'),timeoutMs);
      child.on('close', code => { clearTimeout(timer); resolve({ status: code===0?'passed':'failed', exit_code:code, url, output, stderr }); });
      child.on('error', e => { clearTimeout(timer); resolve({ status:'spawn_failed', exit_code:null, url, output:'', stderr:e.message }); });
    });
  } finally { await rm(profile, { recursive: true, force: true }); }
}
