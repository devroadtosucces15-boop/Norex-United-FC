// Issue inbox sync: copies the owner's bug reports (and a few frames from each screen recording) out of the bot's D1 database and R2 bucket
// into ISSUES/, so a Claude session can read them without access to Cloudflare. Run by .github/workflows/issues-sync.yml.
//   ISSUES/index.json                       which reports were synced (so each is only fetched once, even after the Worker auto-deletes it)
//   ISSUES/<date>-<session>-<n>/report.md   note, category, page, device, pages visited, flagged moments, captions, links to frames
//   ISSUES/<date>-<session>-<n>/report.json the stored report row
//   ISSUES/<date>-<session>-<n>/f*.jpg      frames at flagged moments / page changes / captions (ffmpeg)
//   ISSUES/.videos/                         the full video, NOT committed (workflow uploads it as a 14-day artifact)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const LIMITS = { frames: 12, minGapMs: 2500, frameWidth: 960, videoBytes: 60e6, perRun: 25 };

const pad = (n) => String(n).padStart(2, '0');
export const mmss = (ms) => `${pad(Math.floor(Math.max(0, ms) / 60000))}:${pad(Math.floor(Math.max(0, ms) / 1000) % 60)}`;
const slug = (s) => String(s || '').replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'x';
export const dirName = (row) => `${new Date(row.created_at || Date.now()).toISOString().slice(0, 10)}-${slug(row.session)}-${row.n}`;

// Which moments of the video are worth a picture: the start, every page change, every flagged moment, and caption lines – at most `max`,
// at least `gap` ms apart (flagged moments win over page changes win over captions when they crowd each other).
export function pickFrames(rec, { max = LIMITS.frames, gap = LIMITS.minGapMs } = {}) {
  const ms = rec?.ms || 0, ev = rec?.events || [], say = rec?.transcript || [];
  const cand = [{ t: 500, why: 'start', w: 3 }];
  for (const e of ev) {
    if (e.k === 'moment') cand.push({ t: e.t, why: `🚩 ${e.label || 'marked moment'}`, w: 4 });
    else if (e.k === 'page') cand.push({ t: e.t + 700, why: `📄 ${e.url}`, w: 2 });
  }
  for (const c of say) cand.push({ t: c.t, why: `💬 ${c.text}`, w: 1 });
  const out = [];
  for (const c of cand.sort((a, b) => b.w - a.w || a.t - b.t)) {
    if (out.length >= max) break;
    if (ms && c.t > ms) continue;
    if (out.some((o) => Math.abs(o.t - c.t) < gap)) continue;
    out.push(c);
  }
  return out.sort((a, b) => a.t - b.t);
}

const clip = (s, n) => (String(s).length > n ? `${String(s).slice(0, n)}…` : String(s));
export function renderReport(row, data, frames = [], videoNote = '') {
  const rec = data?.recording, L = [];
  L.push(`# Report #${row.n} · ${row.severity} · ${row.status}`, '');
  L.push(`- **Page:** ${row.page}`, `- **Device:** ${row.device || 'unknown'}`, `- **Role:** ${row.role || '?'}${row.view_as && row.view_as !== row.role ? ` (viewing as ${row.view_as})` : ''}`, `- **Filed:** ${new Date(row.created_at).toISOString()}`, `- **Id:** ${row.id}`, '');
  L.push('## What Mike wrote', '', String(row.note || '(no note)'), '');
  if (data?.target) L.push(`**Element:** \`${clip(JSON.stringify(data.target), 300)}\``, '');
  if (rec) {
    L.push('## Recording', '', `${mmss(rec.ms)} long · ${(rec.bytes / 1e6).toFixed(1)} MB · voice-over ${rec.voice ? 'on' : 'off'}${videoNote ? ` · ${videoNote}` : ''}`, '');
    const pages = (rec.events || []).filter((e) => e.k === 'page');
    if (pages.length) L.push('### Pages visited', '', ...pages.map((e) => `- ${mmss(e.t)} ${e.url}`), '');
    const mom = (rec.events || []).filter((e) => e.k === 'moment');
    if (mom.length) L.push('### Flagged moments', '', ...mom.map((e) => `- ${mmss(e.t)} 🚩 ${e.label || ''}`), '');
    if (rec.transcript?.length) L.push('### What was said (captions)', '', ...rec.transcript.map((c) => `- ${mmss(c.t)} ${c.text}`), '');
    if (frames.length) L.push('### Frames', '', ...frames.map((f) => `**${mmss(f.t)}** ${f.why}\n\n![${mmss(f.t)}](${f.file})\n`));
  }
  return `${L.join('\n')}\n`;
}

const wrangler = (args, opt = {}) => execFileSync('npx', ['--yes', 'wrangler@4', ...args], { cwd: path.join(ROOT, 'bot'), encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'pipe'], ...opt });
const d1 = (sql) => { const j = JSON.parse(wrangler(['d1', 'execute', 'norex', '--remote', '--json', '--command', sql])); return (Array.isArray(j) ? j[0] : j).results || []; };

function main() {
  if (!process.env.CLOUDFLARE_API_TOKEN) { console.log('::notice::Cloudflare secrets not added yet – skipping issue sync.'); return; }
  const dir = path.join(ROOT, 'ISSUES'), idxFile = path.join(dir, 'index.json');
  fs.mkdirSync(path.join(dir, '.videos'), { recursive: true });
  const index = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : { synced: {} };
  const rows = d1('SELECT id, session, n, page, severity, note, status, role, view_as, device, data, created_at, updated_at FROM issue_reports ORDER BY created_at');
  const live = new Set(rows.map((r) => r.id));
  let fresh = 0;
  for (const row of rows) {
    const have = index.synced[row.id];
    if (have) { have.status = row.status; have.gone = false; continue; }
    if (fresh >= LIMITS.perRun) break;
    let data = {}; try { data = JSON.parse(row.data || '{}'); } catch { /* keep empty */ }
    const rel = dirName(row), out = path.join(dir, rel); fs.mkdirSync(out, { recursive: true });
    const rec = data.recording; let frames = [], videoNote = '';
    if (rec?.uploaded && rec.key) {
      const file = path.join(dir, '.videos', `${rel}${path.extname(rec.key)}`);
      try {
        wrangler(['r2', 'object', 'get', `norex-media/${rec.key}`, '--remote', '--file', file]);
        if (fs.statSync(file).size > LIMITS.videoBytes) { fs.rmSync(file); videoNote = 'video too large to keep'; }
        else {
          videoNote = `full video in the workflow artifact “issue-videos” (${path.basename(file)})`;
          pickFrames(rec).forEach((p, i) => {
            const name = `f${pad(i + 1)}-${mmss(p.t).replace(':', 'm')}s.jpg`;
            try { execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(p.t / 1000), '-i', file, '-frames:v', '1', '-vf', `scale=${LIMITS.frameWidth}:-2`, '-q:v', '5', path.join(out, name)], { stdio: 'ignore' }); frames.push({ ...p, file: name }); }
            catch { /* a frame that cannot be cut is skipped */ }
          });
        }
      } catch (e) { videoNote = `video could not be downloaded (${String(e.message).split('\n')[0].slice(0, 120)})`; }
    } else if (rec) videoNote = 'video was not uploaded (only the captions and moments below)';
    fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify({ ...row, data }, null, 1)}\n`);
    fs.writeFileSync(path.join(out, 'report.md'), renderReport(row, data, frames, videoNote));
    index.synced[row.id] = { dir: rel, at: new Date().toISOString(), status: row.status, frames: frames.length, video: !!rec?.uploaded };
    fresh++; console.log(`synced ${row.id} → ISSUES/${rel} (${frames.length} frames)`);
  }
  for (const [id, v] of Object.entries(index.synced)) if (!live.has(id)) v.gone = true; // deleted by the Worker after it was fixed – our copy stays
  fs.writeFileSync(idxFile, `${JSON.stringify(index, null, 1)}\n`);
  const list = Object.entries(index.synced).sort((a, b) => b[1].dir.localeCompare(a[1].dir));
  fs.writeFileSync(path.join(dir, 'INDEX.md'), `# Synced reports\n\nNewest first. Open the folder's report.md. “gone” = already deleted on the site after being fixed.\n\n${list.map(([id, v]) => `- [${v.dir}](${v.dir}/report.md) · ${v.status}${v.gone ? ' · gone' : ''}${v.video ? ` · ${v.frames} frames` : ''}`).join('\n')}\n`);
  console.log(`${fresh} new report(s), ${list.length} total.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
