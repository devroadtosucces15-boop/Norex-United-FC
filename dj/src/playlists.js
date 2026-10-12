// Personal playlists, likes and dislikes. One SQLite file in the data volume (node:sqlite, no extra packages).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { clean } from './match.js';

const DIR = process.env.DATA_DIR || '/app/data';
fs.mkdirSync(DIR, { recursive: true });
const db = new DatabaseSync(path.join(DIR, 'playlists.db'));
db.exec(`
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS playlists(id INTEGER PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL COLLATE NOCASE, public INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL, UNIQUE(owner, name));
CREATE TABLE IF NOT EXISTS items(id INTEGER PRIMARY KEY, playlist INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE, pos INTEGER NOT NULL, title TEXT NOT NULL, author TEXT, length INTEGER, uri TEXT, source TEXT, key TEXT NOT NULL, added INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS items_pl ON items(playlist, pos);
CREATE TABLE IF NOT EXISTS reactions(user TEXT NOT NULL, key TEXT NOT NULL, val INTEGER NOT NULL, title TEXT, author TEXT, ts INTEGER NOT NULL, PRIMARY KEY(user, key));
`);

export const LIKED = 'Liked songs';
export const LIMITS = { playlists: 20, items: 500, importAtOnce: 200, bulkLines: 40 };
export const keyOf = (info) => `${clean(String(info.author || '').split(/,|&/)[0])}|${clean(info.title)}`;
const q = (sql) => db.prepare(sql);

export function create(owner, name) {
  name = String(name).trim().slice(0, 40);
  if (!name) throw new Error('EMPTY');
  if (q('SELECT COUNT(*) c FROM playlists WHERE owner=?').get(owner).c >= LIMITS.playlists) throw new Error('LIMIT');
  try { return Number(q('INSERT INTO playlists(owner,name,created) VALUES(?,?,?)').run(owner, name, Date.now()).lastInsertRowid); }
  catch { throw new Error('EXISTS'); }
}
export const get = (owner, name) => q('SELECT * FROM playlists WHERE owner=? AND name=?').get(owner, String(name).trim()) || null;
export const ensure = (owner, name) => get(owner, name)?.id ?? create(owner, name);
export const lists = (owner, onlyPublic = false) => q(`SELECT p.*, (SELECT COUNT(*) FROM items i WHERE i.playlist=p.id) n FROM playlists p WHERE owner=? ${onlyPublic ? 'AND public=1' : ''} ORDER BY name`).all(owner);
export const items = (pid) => q('SELECT * FROM items WHERE playlist=? ORDER BY pos').all(pid);
export const count = (pid) => q('SELECT COUNT(*) c FROM items WHERE playlist=?').get(pid).c;
export const rename = (pid, name) => q('UPDATE playlists SET name=? WHERE id=?').run(String(name).trim().slice(0, 40), pid);
export const setPublic = (pid, on) => q('UPDATE playlists SET public=? WHERE id=?').run(on ? 1 : 0, pid);
export const destroy = (pid) => q('DELETE FROM playlists WHERE id=?').run(pid);

// Adds songs (skipping ones the list already has). Returns how many were new.
export function add(pid, songs) {
  let pos = (q('SELECT MAX(pos) m FROM items WHERE playlist=?').get(pid).m ?? 0), added = 0;
  const have = new Set(q('SELECT key FROM items WHERE playlist=?').all(pid).map((r) => r.key));
  const ins = q('INSERT INTO items(playlist,pos,title,author,length,uri,source,key,added) VALUES(?,?,?,?,?,?,?,?,?)');
  let room = LIMITS.items - count(pid);
  db.exec('BEGIN');
  try {
    for (const s of songs) {
      const key = keyOf(s); if (!key || have.has(key) || room <= 0) continue;
      ins.run(pid, ++pos, s.title, s.author || '', s.length || 0, s.uri || null, s.sourceName || s.source || null, key, Date.now());
      have.add(key); added++; room--;
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return added;
}
export function removeAt(pid, pos) {
  const row = q('SELECT id FROM items WHERE playlist=? ORDER BY pos LIMIT 1 OFFSET ?').get(pid, pos - 1);
  if (!row) return false;
  q('DELETE FROM items WHERE id=?').run(row.id); return true;
}

// Likes / dislikes. A like also drops the song into the member's "Liked songs" list.
export function react(user, info, val) {
  const key = keyOf(info);
  q('INSERT INTO reactions(user,key,val,title,author,ts) VALUES(?,?,?,?,?,?) ON CONFLICT(user,key) DO UPDATE SET val=excluded.val, ts=excluded.ts').run(user, key, val, info.title, info.author || '', Date.now());
  const pid = ensure(user, LIKED);
  if (val > 0) add(pid, [info]);
  else q('DELETE FROM items WHERE playlist=? AND key=?').run(pid, key);
}
export const reactionOf = (user, info) => q('SELECT val FROM reactions WHERE user=? AND key=?').get(user, keyOf(info))?.val ?? 0;
export function dislikedKeys(users) {
  if (!users.length) return new Set();
  return new Set(q(`SELECT key FROM reactions WHERE val<0 AND user IN (${users.map(() => '?').join(',')})`).all(...users).map((r) => r.key));
}
export const likedKeys = (users) => users.length ? new Set(q(`SELECT key FROM reactions WHERE val>0 AND user IN (${users.map(() => '?').join(',')})`).all(...users).map((r) => r.key)) : new Set();

export function exportText(pl, rows) {
  return [`# ${pl.name}`, ...rows.map((r) => `${r.author ? `${r.author} - ` : ''}${r.title}${r.uri ? ` | ${r.uri}` : ''}`)].join('\n');
}
