import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const CANDIDATES = ['/usr/bin/chromium','/usr/bin/google-chrome'];
export async function browserProbe() {
  for (const executable of CANDIDATES) { try { await access(executable); return { status: 'AVAILABLE', executable, mode: 'ephemeral-headless', cost: '$0.00' }; } catch {} }
  return { status: 'GATED', reason: 'No supported local Chromium executable' };
}
export async function captureLocalPreview(url, { timeoutMs = 10000 } = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(parsed.hostname)) throw new Error('Preview navigation is localhost-only');
  const probe = await browserProbe(); if (probe.status !== 'AVAILABLE') throw new Error(probe.reason);
  const args = ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--metrics-recording-only','--dump-dom',url];
  return await new Promise(resolve => {
    const child = spawn(probe.executable, args, { env: { PATH: '/usr/bin:/bin', HOME: '/tmp', LANG: 'C.UTF-8' }, shell: false, stdio: ['ignore','pipe','pipe'] });
    let output='', stderr=''; const cap=(target,chunk)=> (target+chunk.toString()).slice(0,65536);
    child.stdout.on('data', c => output=cap(output,c)); child.stderr.on('data', c => stderr=cap(stderr,c));
    const timer=setTimeout(()=>child.kill('SIGKILL'),timeoutMs);
    child.on('close', code => { clearTimeout(timer); resolve({ status: code===0?'passed':'failed', exit_code:code, url, output, stderr: stderr.slice(0,4096) }); });
    child.on('error', e => { clearTimeout(timer); resolve({ status:'spawn_failed', exit_code:null, url, output:'', stderr:e.message }); });
  });
}
