// Issue inbox sync (scripts/issues-sync.mjs): frame picking and report text. The Cloudflare and ffmpeg calls only run in the workflow.
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';
import { pickFrames, renderReport, dirName, mmss, LIMITS } from '../scripts/issues-sync.mjs';

const rec = { ms: 90000, bytes: 4e6, voice: true,
  events: [{ t: 0, k: 'page', url: '/squad.html' }, { t: 20000, k: 'moment', label: '' }, { t: 21000, k: 'mark', op: 'add' }, { t: 40000, k: 'page', url: '/stats.html' }],
  transcript: [{ t: 19500, text: 'this button does nothing' }, { t: 60000, text: 'and here too' }, { t: 99000, text: 'after the end' }] };
const f = pickFrames(rec);
t('frames: start (covers the first page), the second page, the flagged moment and a later caption – sorted', f.length === 4 && f[0].t === 500 && f.every((x, i) => !i || x.t >= f[i - 1].t) && f.some((x) => x.why.startsWith('🚩')) && f.some((x) => x.why.includes('/stats.html')) && f.some((x) => x.why.includes('and here too')));
t('frames: a caption 500 ms from the flagged moment is dropped, and nothing after the end', !f.some((x) => x.why.includes('this button')) && !f.some((x) => x.t > rec.ms));
t('frames: capped and spaced', pickFrames({ ms: 600000, events: Array.from({ length: 80 }, (_, i) => ({ t: i * 5000, k: 'moment' })) }).length === LIMITS.frames);
const row = { id: 'abc:3', session: 'abc', n: 3, page: '/squad.html', severity: 'broken', status: 'open', device: 'iPhone · iOS 18', role: 'owner', view_as: 'member', note: 'button dead', created_at: Date.UTC(2026, 9, 16, 1, 5) };
const md = renderReport(row, { recording: rec }, f.map((x, i) => ({ ...x, file: `f${i}.jpg` })), 'video kept');
t('report text: note, device, pages, moments, captions and frames are all there', ['button dead', 'iPhone · iOS 18', '/stats.html', '🚩', 'this button does nothing', '![', 'viewing as member'].every((s) => md.includes(s)));
t('folder name and clock', dirName(row) === '2026-10-16-abc-3' && mmss(61000) === '01:01');
t('a pin report (no recording) still renders', renderReport({ ...row, n: 4 }, { target: { tag: 'button' } }).includes('Element'));
const wf = fs.readFileSync(ROOT + '.github/workflows/issues-sync.yml', 'utf8');
t('workflow: scheduled + manual, reuses the backup secrets, videos stay out of git', wf.includes('workflow_dispatch') && wf.includes('secrets.CLOUDFLARE_API_TOKEN') && wf.includes('upload-artifact') && fs.readFileSync(ROOT + '.gitignore', 'utf8').includes('ISSUES/.videos/'));
done();
