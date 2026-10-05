import pty from 'node-pty';
import { randomUUID } from 'node:crypto';
import { appendUtf8Bounded } from './utf8.mjs';
import { redact } from './local-services.mjs';

const LIMIT = 128 * 1024;
const ENV = { PATH: '/usr/bin:/bin', HOME: '/nonexistent', LANG: 'C.UTF-8', TZ: 'UTC', CI: '1' };
const COMMANDS = { 'node-repl': { binary: process.execPath, args: ['-i'] } };
const terminal = status => !['RUNNING', 'CLOSING'].includes(status);

export function createNativePtyService({ cwd, timeoutMs = 5 * 60 * 1000, maxSessions = 8, ptyImpl = pty } = {}) {
  if (!cwd) throw new Error('PTY cwd required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30 * 60 * 1000) throw new Error('PTY timeout rejected');
  if (!Number.isInteger(maxSessions) || maxSessions < 1 || maxSessions > 32) throw new Error('PTY session limit rejected');
  const sessions = new Map();
  function get(id) { const s = sessions.get(id); if (!s) throw new Error('PTY session not found'); return s; }
  function open(commandId, { cols = 80, rows = 24 } = {}) {
    for (const [id, s] of sessions) if (terminal(s.status)) sessions.delete(id);
    if (sessions.size >= maxSessions) throw new Error('PTY session limit reached');
    const command = COMMANDS[commandId];
    if (!command) throw new Error('PTY command is not allowlisted');
    if (!Number.isInteger(cols) || cols < 20 || cols > 300 || !Number.isInteger(rows) || rows < 5 || rows > 120) throw new Error('PTY dimensions rejected');
    const id = randomUUID();
    const child = ptyImpl.spawn(command.binary, command.args, { name: 'xterm-256color', cols, rows, cwd, env: ENV });
    const session = { id, commandId, child, output: '', status: 'RUNNING', exit_code: null, cols, rows, timer: null };
    const stop = status => { if (session.status !== 'RUNNING') return; session.status = status; try { child.kill(); } catch {} };
    child.onData(chunk => { if (session.status !== 'RUNNING') return; const next = appendUtf8Bounded(session.output, redact(chunk), LIMIT); session.output = next; if (Buffer.byteLength(next, 'utf8') >= LIMIT) stop('OUTPUT_LIMIT'); });
    child.onExit(({ exitCode }) => { clearTimeout(session.timer); session.exit_code = exitCode; if (session.status === 'RUNNING') session.status = 'EXITED'; else if (session.status === 'CLOSING') session.status = 'CLOSED'; });
    session.timer = setTimeout(() => stop('TIMEOUT'), timeoutMs);
    session.timer.unref?.();
    sessions.set(id, session);
    return { session_id: id, command_id: commandId, status: session.status, cols, rows };
  }
  function write(id, data) { const s = get(id); if (s.status !== 'RUNNING') throw new Error('PTY session is not running'); if (typeof data !== 'string' || !data || Buffer.byteLength(data, 'utf8') > 4096 || data.includes('\0')) throw new Error('PTY input rejected'); s.child.write(data); return { session_id: id, status: s.status }; }
  function resize(id, cols, rows) { const s = get(id); if (s.status !== 'RUNNING') throw new Error('PTY session is not running'); if (!Number.isInteger(cols) || cols < 20 || cols > 300 || !Number.isInteger(rows) || rows < 5 || rows > 120) throw new Error('PTY dimensions rejected'); s.child.resize(cols, rows); s.cols = cols; s.rows = rows; return { session_id: id, status: s.status, cols, rows }; }
  function read(id) { const s = get(id); return { session_id: id, command_id: s.commandId, status: s.status, exit_code: s.exit_code, output: s.output, cols: s.cols, rows: s.rows }; }
  function close(id) { const s = get(id); clearTimeout(s.timer); if (s.status === 'RUNNING') { s.status = 'CLOSING'; try { s.child.kill(); } catch {} } return { session_id: id, status: s.status }; }
  return { open, write, resize, read, close };
}
