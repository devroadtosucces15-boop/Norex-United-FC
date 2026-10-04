import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const EVENT_TYPES = new Set([
  'MikeMessage','UserOverride','OrchestratorAnalysis','TaskCreated','TaskStatusChanged',
  'AgentSelected','AgentStarted','AgentProgress','AgentPaused','AgentCompleted','AgentFailed',
  'CommitCreated','CIRunStarted','CIPassed','CIFailed','ArtifactCreated','EvidenceRecorded',
  'DiscoveryRecorded','ReviewStarted','ReviewCompleted','ApprovalRequested','MikeApproved',
  'MikeRejected','HandoffCreated','RecoveryCheckpoint'
]);
const SECRET_PATTERN = /(api[_-]?key|authorization|bearer\s+[a-z0-9._-]+|password|private[_-]?key|token[\"']?\s*[:=])/i;
const json = value => JSON.stringify(value ?? {});
const now = () => new Date().toISOString();

export function createRuntimeStore({ dbPath = resolve(homedir(), '.norex/norex.db') } = {}) {
  mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbPath);
  try { chmodSync(dbPath, 0o600); } catch {}
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;');
  for (const suffix of ['-wal','-shm']) { try { chmodSync(dbPath + suffix, 0o600); } catch {} }
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    INSERT OR IGNORE INTO schema_version(version, applied_at) VALUES(1, datetime('now'));
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, project TEXT NOT NULL, branch TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), title TEXT NOT NULL, status TEXT NOT NULL, risk TEXT NOT NULL, active_model TEXT, started_at TEXT, handoff_state TEXT, checkpoint TEXT, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS executions(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), task_id TEXT REFERENCES tasks(id), operation TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, exit_code INTEGER, summary TEXT, provider TEXT NOT NULL, billing_mode TEXT NOT NULL, cost_microunits INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT UNIQUE NOT NULL, session_id TEXT NOT NULL REFERENCES sessions(id), task_id TEXT REFERENCES tasks(id), execution_id TEXT REFERENCES executions(id), type TEXT NOT NULL, actor TEXT NOT NULL, payload_json TEXT NOT NULL, causation_id TEXT, correlation_id TEXT, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS events_session_time ON events(session_id, id);
    CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), task_id TEXT REFERENCES tasks(id), action TEXT NOT NULL, scope TEXT NOT NULL, risk TEXT NOT NULL, decision TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS artifacts(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), task_id TEXT REFERENCES tasks(id), execution_id TEXT REFERENCES executions(id), kind TEXT NOT NULL, ref TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS execution_output(execution_id TEXT PRIMARY KEY REFERENCES executions(id), output TEXT NOT NULL, truncated INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS evidence_index(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), task_id TEXT REFERENCES tasks(id), subject TEXT NOT NULL, result TEXT NOT NULL, ref TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  const ensureSafe = value => {
    const text = typeof value === 'string' ? value : json(value);
    if (SECRET_PATTERN.test(text)) throw new Error('Refusing to persist secret-like runtime data');
    return text;
  };
  const store = {
    dbPath,
    ensureSession({ id = randomUUID(), project, branch }) {
      const ts = now(); ensureSafe({ project, branch });
      db.prepare('INSERT INTO sessions(id,project,branch,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET project=excluded.project, branch=excluded.branch, updated_at=excluded.updated_at').run(id, project, branch, ts, ts);
      return id;
    },
    upsertTask({ id, session_id, title, status, risk, active_model = null, started_at = null, handoff_state = null, checkpoint = null }) {
      ensureSafe({ title, handoff_state, checkpoint });
      db.prepare(`INSERT INTO tasks(id,session_id,title,status,risk,active_model,started_at,handoff_state,checkpoint,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title,status=excluded.status,risk=excluded.risk,active_model=excluded.active_model,started_at=excluded.started_at,handoff_state=excluded.handoff_state,checkpoint=excluded.checkpoint,updated_at=excluded.updated_at`)
        .run(id, session_id, title, status, risk, active_model, started_at, handoff_state, checkpoint, now());
      return id;
    },
    startExecution({ id = randomUUID(), session_id, task_id = null, operation, provider = 'local', billing_mode = 'LOCAL_OFFLINE' }) {
      ensureSafe({ operation, provider, billing_mode });
      db.prepare('INSERT INTO executions(id,session_id,task_id,operation,status,started_at,provider,billing_mode,cost_microunits) VALUES(?,?,?,?,?,?,?,?,0)').run(id, session_id, task_id, operation, 'IN_PROGRESS', now(), provider, billing_mode);
      return id;
    },
    finishExecution(id, { status, exit_code = null, summary = null }) {
      ensureSafe(summary ?? '');
      db.prepare('UPDATE executions SET status=?,finished_at=?,exit_code=?,summary=? WHERE id=?').run(status, now(), exit_code, summary, id);
    },
    recordApproval({ id = randomUUID(), session_id, task_id = null, action, scope, risk, decision }) {
      ensureSafe({ action, scope, decision });
      db.prepare('INSERT INTO approvals(id,session_id,task_id,action,scope,risk,decision,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id, session_id, task_id, action, scope, risk, decision, now());
      return id;
    },
    findApproval({ session_id, action, scope, risk, decision = 'APPROVED' }) {
      ensureSafe({ action, scope, decision });
      const row = db.prepare('SELECT id,session_id,task_id,action,scope,risk,decision,created_at FROM approvals WHERE session_id=? AND action=? AND scope=? AND risk=? AND decision=? ORDER BY created_at DESC LIMIT 1').get(session_id, action, scope, risk, decision);
      return row ?? null;
    },
    recordExecutionOutput(execution_id, output) {
      if (typeof output !== 'string') throw new Error('Execution output must be text');
      const bounded = output.slice(0, 32768);
      ensureSafe(bounded);
      db.prepare('INSERT OR REPLACE INTO execution_output(execution_id,output,truncated,created_at) VALUES(?,?,?,?)').run(execution_id, bounded, output.length > bounded.length ? 1 : 0, now());
      return { execution_id, output: bounded, truncated: output.length > bounded.length };
    },
    getExecutionOutput(execution_id, session_id = null) {
      const row = session_id
        ? db.prepare('SELECT o.execution_id,o.output,o.truncated,o.created_at FROM execution_output o JOIN executions e ON e.id=o.execution_id WHERE o.execution_id=? AND e.session_id=?').get(execution_id, session_id)
        : db.prepare('SELECT execution_id,output,truncated,created_at FROM execution_output WHERE execution_id=?').get(execution_id);
      return row ? { ...row, truncated: Boolean(row.truncated) } : null;
    },
    recordArtifact({ id = randomUUID(), session_id, task_id = null, execution_id = null, kind, ref }) {
      ensureSafe({ kind, ref });
      db.prepare('INSERT INTO artifacts(id,session_id,task_id,execution_id,kind,ref,created_at) VALUES(?,?,?,?,?,?,?)').run(id, session_id, task_id, execution_id, kind, ref, now());
      return id;
    },
    listArtifacts(session_id, limit = 100) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('Artifact limit must be 1-500');
      return db.prepare('SELECT id,session_id,task_id,execution_id,kind,ref,created_at FROM artifacts WHERE session_id=? ORDER BY created_at ASC LIMIT ?').all(session_id, limit);
    },
    recordEvidence({ id = randomUUID(), session_id, task_id = null, subject, result, ref }) {
      ensureSafe({ subject, result, ref });
      db.prepare('INSERT INTO evidence_index(id,session_id,task_id,subject,result,ref,created_at) VALUES(?,?,?,?,?,?,?)').run(id, session_id, task_id, subject, result, ref, now());
      return id;
    },
    appendEvent({ event_id = randomUUID(), session_id, task_id = null, execution_id = null, type, actor, payload = {}, causation_id = null, correlation_id = null }) {
      if (!EVENT_TYPES.has(type)) throw new Error('Unknown event type');
      const payload_json = ensureSafe(payload);
      db.prepare('INSERT INTO events(event_id,session_id,task_id,execution_id,type,actor,payload_json,causation_id,correlation_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(event_id, session_id, task_id, execution_id, type, actor, payload_json, causation_id, correlation_id, now());
      return event_id;
    },
    listEvents(session_id, limit = 100) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('Event limit must be 1-500');
      return db.prepare('SELECT event_id,session_id,task_id,execution_id,type,actor,payload_json,causation_id,correlation_id,created_at FROM events WHERE session_id=? ORDER BY id ASC LIMIT ?').all(session_id, limit).map(row => ({ ...row, payload: JSON.parse(row.payload_json), payload_json: undefined }));
    },
    snapshot() {
      const count = table => Number(db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n);
      return { schema_version: 2, sessions: count('sessions'), tasks: count('tasks'), executions: count('executions'), events: count('events'), approvals: count('approvals'), artifacts: count('artifacts'), execution_output: count('execution_output'), evidence: count('evidence_index') };
    },
    exportState() {
      const rows = table => db.prepare(`SELECT * FROM ${table}`).all();
      return { format: 'norex-runtime-export', schema_version: 2, exported_at: now(), sessions: rows('sessions'), tasks: rows('tasks'), executions: rows('executions'), events: rows('events'), approvals: rows('approvals'), artifacts: rows('artifacts'), execution_output: rows('execution_output'), evidence_index: rows('evidence_index') };
    },
    restoreState(bundle) {
      if (!bundle || bundle.format !== 'norex-runtime-export' || ![1,2].includes(bundle.schema_version)) throw new Error('Unsupported runtime export');
      ensureSafe(bundle);
      const current = store.snapshot();
      if (current.sessions || current.tasks || current.executions || current.events || current.approvals || current.artifacts || current.execution_output || current.evidence) throw new Error('Restore target must be empty');
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const row of bundle.sessions ?? []) db.prepare('INSERT INTO sessions(id,project,branch,created_at,updated_at) VALUES(?,?,?,?,?)').run(row.id,row.project,row.branch,row.created_at,row.updated_at);
        for (const row of bundle.tasks ?? []) db.prepare('INSERT INTO tasks(id,session_id,title,status,risk,active_model,started_at,handoff_state,checkpoint,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(row.id,row.session_id,row.title,row.status,row.risk,row.active_model,row.started_at,row.handoff_state,row.checkpoint,row.updated_at);
        for (const row of bundle.executions ?? []) db.prepare('INSERT INTO executions(id,session_id,task_id,operation,status,started_at,finished_at,exit_code,summary,provider,billing_mode,cost_microunits) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(row.id,row.session_id,row.task_id,row.operation,row.status === 'IN_PROGRESS' ? 'INTERRUPTED' : row.status,row.started_at,row.status === 'IN_PROGRESS' ? now() : row.finished_at,row.exit_code,row.summary,row.provider,row.billing_mode,row.cost_microunits);
        for (const row of bundle.approvals ?? []) db.prepare('INSERT INTO approvals(id,session_id,task_id,action,scope,risk,decision,created_at) VALUES(?,?,?,?,?,?,?,?)').run(row.id,row.session_id,row.task_id,row.action,row.scope,row.risk,row.decision,row.created_at);
        for (const row of bundle.artifacts ?? []) db.prepare('INSERT INTO artifacts(id,session_id,task_id,execution_id,kind,ref,created_at) VALUES(?,?,?,?,?,?,?)').run(row.id,row.session_id,row.task_id,row.execution_id,row.kind,row.ref,row.created_at);
        if (bundle.schema_version >= 2) for (const row of bundle.execution_output ?? []) db.prepare('INSERT INTO execution_output(execution_id,output,truncated,created_at) VALUES(?,?,?,?)').run(row.execution_id,row.output,row.truncated,row.created_at);
        for (const row of bundle.evidence_index ?? []) db.prepare('INSERT INTO evidence_index(id,session_id,task_id,subject,result,ref,created_at) VALUES(?,?,?,?,?,?,?)').run(row.id,row.session_id,row.task_id,row.subject,row.result,row.ref,row.created_at);
        for (const row of bundle.events ?? []) db.prepare('INSERT INTO events(id,event_id,session_id,task_id,execution_id,type,actor,payload_json,causation_id,correlation_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(row.id,row.event_id,row.session_id,row.task_id,row.execution_id,row.type,row.actor,row.payload_json,row.causation_id,row.correlation_id,row.created_at);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return store.snapshot();
    },
    close() { db.close(); }
  };
  return store;
}
