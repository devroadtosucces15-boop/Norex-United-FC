import { readdir, readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export const BRANCH = 'foundation/norex-dev-shadow';
export const LIMIT = 128 * 1024;
export const commands = Object.freeze([
  { id: 'node-version', label: 'Node runtime version', command: 'node --version' },
  { id: 'shadow-check', label: 'Dev OS syntax validation', command: 'node --check (fixed Dev OS files)' },
  { id: 'shadow-tests', label: 'Dev OS service regression', command: 'node --test .norex/dev-os/services.test.mjs' },
]);
const codeFiles = ['server.mjs', 'local-services.mjs', 'control-plane.mjs', 'app.js', 'services.test.mjs'];
const environment = { PATH: '/usr/bin:/bin', HOME: '/nonexistent', LANG: 'C.UTF-8', TZ: 'UTC', CI: '1', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' };
export function allowedPath(path) {
  return typeof path === 'string' && path.length < 512 && path.startsWith('.norex/') &&
    !path.split('/').slice(1).some(p => !p || p === '.' || p === '..' || p.startsWith('.')) &&
    !/[\\\x00-\x1f\x7f]/.test(path) &&
    !/(secret|credential|token|password|private[-_]?key|\.pem$|\.key$)/i.test(path) &&
    /\.(md|yaml|yml|json|js|mjs|html|css|txt)$/.test(path);
}
export function redact(value) {
  return String(value).replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g, '[REDACTED KEY]')
    .replace(/\b(?:sk-[\w-]{12,}|gh[pousr]_[\w]{12,}|github_pat_[\w]{12,})/g, '[REDACTED TOKEN]')
    .replace(/((?:authorization|password|secret|api[_-]?key|access[_-]?token)\s*["']?\s*[:=]\s*)[^\r\n]+/gi, '$1[REDACTED]');
}
export function execute(binary, args, cwd, { timeout = 15000, limit = LIMIT } = {}) {
  return new Promise(resolveResult => {
    let output = '', size = 0, reason = null;
    const child = spawn(binary, args, { cwd, env: environment, shell: false, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const stop = why => { reason ||= why; try { process.kill(-child.pid, 'SIGKILL'); } catch {} };
    const timer = setTimeout(() => stop('timeout'), timeout);
    const collect = chunk => { size += chunk.length; if (size > limit) stop('output_limit'); else output += chunk.toString(); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.on('error', () => { reason = 'spawn_failed'; });
    child.on('close', (exit_code, signal) => {
      clearTimeout(timer);
      // Kill descendants still in this process group, including children with closed stdio.
      try { process.kill(-child.pid, 'SIGKILL'); } catch {}
      resolveResult({ exit_code, signal, status: reason || (exit_code === 0 ? 'passed' : 'failed'), output: redact(output) });
    });
  });
}
export async function createServices(projectRoot) {
  const root = await realpath(projectRoot);
  let busy = false;
  async function safeFile(path) {
    if (!allowedPath(path)) throw new Error('Path is outside the readable Shadow policy');
    let current = root;
    for (const part of path.split('/')) {
      current = resolve(current, part);
      if ((await lstat(current)).isSymbolicLink()) throw new Error('Symlinks are not readable');
    }
    const actual = await realpath(current);
    if (!actual.startsWith(root + sep) || !(await lstat(actual)).isFile()) throw new Error('Not a scoped file');
    if ((await lstat(actual)).size > LIMIT) throw new Error('File exceeds the size limit');
    return actual;
  }
  async function inspect(path) {
    const text = await readFile(await safeFile(path), 'utf8');
    if (text.includes('\0')) throw new Error('Binary files are not readable');
    return { path, content: redact(text) };
  }
  async function files() {
    const result = [];
    let visited = 0;
    async function walk(dir, depth = 0) {
      if (depth > 12 || ++visited > 2000) throw new Error('Project inspection limit reached');
      if ((await lstat(dir)).isSymbolicLink()) throw new Error('Symlink scope is forbidden');
      for (const item of await readdir(dir, { withFileTypes: true })) {
        if (++visited > 2000) throw new Error('Project inspection limit reached');
        if (item.isSymbolicLink() || item.name.startsWith('.') || item.name === 'node_modules') continue;
        const full = resolve(dir, item.name), path = relative(root, full).split(sep).join('/');
        if (item.isDirectory()) await walk(full, depth + 1);
        else if (item.isFile() && allowedPath(path)) result.push(path);
      }
    }
    await walk(resolve(root, '.norex'));
    return result.sort();
  }
  async function git(args) {
    const result = await execute('/usr/bin/git', ['--no-pager', '--literal-pathspecs', '-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', ...args], root);
    if (result.status !== 'passed') throw new Error('Git inspection failed or exceeded limits');
    return result.output;
  }
  async function branch() { return (await git(['branch', '--show-current'])).trim(); }
  async function guard() { if (await branch() !== BRANCH) throw new Error('Execution requires ' + BRANCH); }
  const trusted = new Map();
  for (const name of codeFiles) { const path = '.norex/dev-os/' + name; trusted.set(path, await readFile(await safeFile(path), 'utf8')); }
  async function run(commandId) {
    const command = commands.find(c => c.id === commandId);
    if (!command) throw new Error('Command is not allowlisted');
    if (busy) throw new Error('A command is already running');
    busy = true;
    const started_at = new Date().toISOString();
    try {
      await guard();
      for (const [path, content] of trusted) {
        if (await readFile(await safeFile(path), 'utf8') !== content) throw new Error('Dev OS code changed; review it and restart the server before execution');
      }
      const args = commandId === 'node-version' ? [['--version']] : commandId === 'shadow-check' ? codeFiles.map(f => ['--check', '.norex/dev-os/' + f]) : [['--test', '.norex/dev-os/services.test.mjs']];
      const results = [];
      for (const arg of args) {
        const result = await execute(process.execPath, arg, root, { timeout: 30000 });
        results.push(result);
        if (result.status !== 'passed') break;
      }
      const last = results.at(-1);
      return { request_id: randomUUID(), task_id: 'ND-013', service: 'terminal', operation: commandId, started_at, finished_at: new Date().toISOString(), branch: BRANCH, command: command.command, status: last.status, exit_code: last.exit_code, output: results.map(r => r.output).join('\n'), approval: 'explicit-local-ui-action', persistence: 'in-memory response only' };
    } finally { busy = false; }
  }
  return {
    files, inspect, run,
    async status() {
      const output = await git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames', '--', '.norex/']);
      return { branch: await branch(), scope: '.norex/', changes: output.split('\0').filter(Boolean).filter(row => allowedPath(row.slice(3))).map(row => ({ status: row.slice(0, 2), path: row.slice(3) })) };
    },
    async diff(path) {
      if (!allowedPath(path)) throw new Error('Diff path is outside the readable Shadow policy');
      // Deleted files are allowed; existing files must satisfy the same no-symlink policy.
      try { await safeFile(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const common = ['--no-ext-diff', '--no-textconv', '--no-renames', '--', path];
      return { path, unstaged: await git(['diff', ...common]), staged: await git(['diff', '--cached', ...common]), note: 'Untracked files have no Git patch; use file inspection.' };
    },
    async state() { return { branch: await branch(), scope: '.norex/', commands, provider: 'gated', browser: 'gated', budget: '$0.00', busy }; },
  };
}
