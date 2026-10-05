import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { redact } from './local-services.mjs';
import { appendUtf8Bounded } from './utf8.mjs';

const LIMIT = 128 * 1024;
const ENV = { PATH: '/usr/bin:/bin', HOME: '/nonexistent', LANG: 'C.UTF-8', TZ: 'UTC', CI: '1' };
const PTY_COMMANDS = Object.freeze({
  'node-repl': { binary: process.execPath, args: ['-i'] }
});

export function createPtyService({ cwd, scriptBinary = '/usr/bin/script' }) {
  const sessions = new Map();
  function open(commandId) {
    const command = PTY_COMMANDS[commandId];
    if (!command) throw new Error('PTY command is not allowlisted');
    const id = randomUUID();
    const child = spawn(scriptBinary, ['-q', '-e', '-f', '-E', 'never', '/dev/null', '--', command.binary, ...command.args], { cwd, env: ENV, shell: false, detached: true, stdio: ['pipe','pipe','pipe'] });
    const session = { id, child, output: '', status: 'RUNNING', exit_code: null };
    const collect = chunk => {
      if (session.status !== 'RUNNING') return;
      const redacted = redact(chunk.toString());
      const bytes = Buffer.byteLength(session.output, 'utf8') + Buffer.byteLength(redacted, 'utf8');
      session.output = appendUtf8Bounded(session.output, redacted, LIMIT);
      if (bytes > LIMIT) {
        session.status = 'OUTPUT_LIMIT';
        try { process.kill(-session.child.pid, 'SIGKILL'); } catch {}
      }
    };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.on('close', code => { session.exit_code = code; if (session.status === 'CLOSING') session.status = 'CLOSED'; else if (session.status === 'RUNNING') session.status = 'EXITED'; });
    sessions.set(id, session);
    return { session_id: id, status: session.status };
  }
  function write(sessionId, input) {
    const session = sessions.get(sessionId);
    if (!session || session.status !== 'RUNNING') throw new Error('PTY session is not writable');
    if (typeof input !== 'string' || input.length > 4096 || /[\x00]/.test(input)) throw new Error('PTY input rejected');
    session.child.stdin.write(input);
    return { session_id: sessionId, status: 'written' };
  }
  function read(sessionId) {
    const session = sessions.get(sessionId); if (!session) throw new Error('Unknown PTY session');
    return { session_id: sessionId, status: session.status, exit_code: session.exit_code, output: session.output };
  }
  function resize(sessionId, columns, rows) {
    const session = sessions.get(sessionId); if (!session) throw new Error('Unknown PTY session');
    if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 20 || columns > 300 || rows < 5 || rows > 120) throw new Error('PTY dimensions rejected');
    // util-linux script owns the PTY; resize signaling is not exposed safely without a native PTY binding.
    return { session_id: sessionId, status: 'GATED', columns, rows, reason: 'native-pty-resize-unavailable' };
  }
  function close(sessionId) {
    const session = sessions.get(sessionId); if (!session) return { session_id: sessionId, status: 'not_running' };
    if (session.status === 'RUNNING') { session.status = 'CLOSING'; try { process.kill(-session.child.pid, 'SIGKILL'); } catch {} }
    return { session_id: sessionId, status: session.status };
  }
  return { open, write, read, resize, close };
}
