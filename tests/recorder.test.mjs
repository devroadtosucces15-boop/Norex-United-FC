// Owner screen recorder (web/record.js, web/annotate.js, web/record-host.html, and its wiring into web/report.js)
import fs from 'node:fs';
import { ROOT, config } from './mock.mjs';
import { t, done } from './lib.mjs';

globalThis.window = globalThis;
globalThis.location = { search: '' };
for (const f of ['annotate.js', 'record.js']) (0, eval)(fs.readFileSync(ROOT + 'web/' + f, 'utf8'));
const A = window.NXAnnotate, R = window.NXRec;
const read = (f) => fs.readFileSync(ROOT + f, 'utf8');

// ---------- drawing marks ----------
const pen = A.make('pen', [[0, 0], [50, 0], [100, 0]]), box = A.make('box', [[200, 200], [300, 260]]), circ = A.make('circle', [[400, 400], [500, 500]]), arr = A.make('arrow', [[0, 300], [100, 300]]);
t('pen: hit on the line, miss away from it', A.hit(pen, 50, 3) && !A.hit(pen, 50, 40));
t('box: hit on the outline, not in the middle', A.hit(box, 200, 230) && A.hit(box, 250, 260) && !A.hit(box, 250, 230));
t('circle: hit on the ring, not in the centre', A.hit(circ, 450, 400) && !A.hit(circ, 450, 450));
t('arrow: hit along the shaft', A.hit(arr, 40, 302) && !A.hit(arr, 40, 330));
t('shift moves every point and leaves the original alone', A.shift(pen, 10, 5).pts[1].join() === '60,5' && pen.pts[1].join() === '50,0');
t('simplify keeps the ends and drops near-duplicates', (() => { const s = A.simplify([[0, 0], [0.5, 0], [1, 0], [10, 0], [10.4, 0], [20, 0]], 2); return s[0][0] === 0 && s.at(-1)[0] === 20 && s.length === 3; })());

const s = A.store(5);
const a = s.add(A.make('pen', [[1, 1]])), b = s.add(A.make('box', [[1, 1], [9, 9]]));
t('store: add / undo / redo', s.marks.length === 2 && s.undo() && s.marks.length === 1 && s.canRedo && s.redo() && s.marks.length === 2 && !s.redo());
t('store: a new change drops the redo branch', (s.undo(), s.add(A.make('pen', [[2, 2]])), !s.canRedo && s.marks.length === 2));
t('store: remove + replace by id, topAt finds the newest', (() => { const m = s.marks.at(-1); s.replace({ ...m, color: '#fff' }); return s.marks.at(-1).color === '#fff' && s.topAt(2, 2, 5).id === m.id && s.remove(m.id) && !s.remove('nope'); })());
t('store: clear is undoable', (() => { const n = s.marks.length; s.clear(); return s.marks.length === 0 && s.undo() && s.marks.length === n; })());
t('store: capped at max marks', (() => { const c = A.store(3); for (let i = 0; i < 6; i++) c.add(A.make('pen', [[i, i]])); return c.marks.length === 3; })());
t('fade: expired marks are swept without touching history', (() => { const c = A.store(); c.add(A.make('pen', [[0, 0]], { fadeAfter: 100, now: 1000 })); const had = c.canUndo; return c.sweep(1050) === false && c.sweep(1200) === true && c.marks.length === 0 && had; })());
t('fade: alpha ramps down over the last second', (() => { const m = A.make('pen', [[0, 0]], { fadeAfter: 5000, now: 0 }); return A.alphaOf(m, 1000) === 1 && A.alphaOf(m, 4500) > 0.4 && A.alphaOf(m, 4500) < 0.6 && A.alphaOf(m, 6000) === 0; })());
t('load ignores junk', (() => { const c = A.store(); c.load([null, { type: 'pen' }, A.make('box', [[0, 0], [1, 1]])]); return c.marks.length === 1; })());
// painting runs against a recording stub, every mark type draws something
const calls = []; const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : (...x) => calls.push(k)), set: () => true });
for (const m of [pen, box, circ, arr, A.make('highlight', [[0, 0], [30, 30]])]) A.paint(ctx, m, 10, 10);
t('paint draws all five mark types', calls.filter((c) => c === 'stroke' || c === 'strokeRect').length >= 5);

// ---------- recorder helpers ----------
t('pickMime takes the first supported type', R.pickMime((m) => m === 'video/webm') === 'video/webm' && R.pickMime(() => false) === '' && R.pickMime((m) => { if (m.includes('vp9')) throw new Error('x'); return m === 'video/mp4'; }) === 'video/mp4');
t('fmtDur / fmtBytes', R.fmtDur(0) === '00:00' && R.fmtDur(125400) === '02:05' && R.fmtBytes(2_500_000) === '2.5 MB' && R.fmtBytes(40_000) === '40 KB');
t('the length cap keeps a recording under the 55 MB size cap at both qualities', Object.values(R.QUALITY).every((q) => (R.capMs(q) / 1000) * (q.video + q.audio) / 8 <= R.MAX_BYTES + 1) && R.capMs(R.QUALITY.standard) > 5 * 60_000 && R.capMs(R.QUALITY.sharp) > 2 * 60_000);
t('file name carries the session, date and the right extension', /^norex-bug-abc123-\d{8}-\d{4}\.webm$/.test(R.fileName('abc123', Date.now(), 'video/webm;codecs=vp9,opus')) && R.fileName('x', 0, 'video/mp4').endsWith('.mp4'));

const many = (n) => Array.from({ length: n }, (_, i) => ({ t: i * 1000, k: i % 5 ? 'mark' : 'page', url: `/page${i}.html`, title: 'T', op: 'add', type: 'pen' }));
const lines = (n) => Array.from({ length: n }, (_, i) => ({ t: i * 3000, text: `line ${i} ${'blah '.repeat(25)}` }));
const big = R.buildItem({ session: 'abc123', started: 1, ms: 400000, bytes: 40e6, mime: 'video/webm', file: 'f.webm', events: many(400), transcript: lines(400), voice: true, captions: true, quality: 'standard', page: '/squad.html', title: 'Squad' });
t('a long recording still fits the Worker report cap (60 000 chars, with device info on top)', JSON.stringify(big).length <= R.MAX_ITEM && big.recording.trimmed === true && big.recording.events.some((e) => e.k === 'page') && big.recording.transcript.length >= 1);
const small = R.buildItem({ session: 'abc123', started: 1, ms: 65000, bytes: 3e6, mime: 'video/webm', file: 'f.webm', events: [{ t: 0, k: 'page', url: '/a.html' }, { t: 9000, k: 'page', url: '/b.html' }, { t: 12000, k: 'moment', label: '' }], transcript: [{ t: 2000, text: 'the badge overlaps' }], voice: true, captions: true, quality: 'standard', page: '/a.html', title: '' });
t('small recording is untouched; the note names length, pages, file and what was said', !small.recording.trimmed && small.kind === 'recording' && small.severity === 'wrong' && small.note.includes('01:05') && small.note.includes('2 pages') && small.note.includes('f.webm') && small.note.includes('the badge overlaps') && small.recording.uploaded === false);
t('the note stays under the 2000 characters the Worker keeps', R.buildItem({ session: 's', started: 1, ms: 1e5, bytes: 1e6, mime: 'video/webm', file: 'f.webm', events: [], transcript: lines(80), voice: true, captions: true, quality: 'standard', page: '/', title: '' }).note.length < 1400);

// ---------- wiring ----------
const rep = read('web/report.js'), app = read('web/app.js'), ses = read('next/static/session.js'), html = read('web/record-host.html'), rec = read('web/record.js');
t('flag issueRecorder is owner-only in config.json and listed in the Boardroom flag map', config.features.issueRecorder === 'owner' && read('next/static/boardroom.js').includes('issueRecorder:'));
t('both sites pass the flag, owner-only, with the path to the shared files', app.includes("recorder: flagOn('issueRecorder', 'owner')") && app.includes('libBase: `${BASE}assets/`') && ses.includes("includes('issueRecorder')") && ses.includes("libBase: ''") && /realRole === 'owner' && flagOn\('issueTool'/.test(app));
t('/next/ build copies the recorder files next to report.js', ['annotate.js', 'record.js', 'record-host.html'].every((f) => read('next/build.mjs').includes(`'${f}'`)));
t('every id record.js looks up exists in the pop-up page', [...rec.matchAll(/\$\('#(\w+)'\)/g)].every(([, id]) => html.includes(`id="${id}"`)) && [...rec.matchAll(/data-view="(\w+)"|view\('(\w+)'\)/g)].every(([, a, b]) => html.includes(`data-view="${a || b}"`)));
t('pop-up loads record.js from the same folder, and the three surface choices are offered', html.includes('src="record.js"') && ['monitor', 'window', 'browser'].every((k) => html.includes(`data-surface="${k}"`)));
t('recorder: display capture, mic voice-over, pause, mixed audio, size + duration caps', rec.includes('getDisplayMedia(') && rec.includes('getUserMedia({ audio:') && rec.includes('S.rec.pause()') && rec.includes('createMediaStreamDestination') && rec.includes('capMs(S.q)') && rec.includes('MAX_BYTES'));
t('recorder lives in a pop-up so page changes cannot kill it; the page only talks to it over a channel', rep.includes("window.open('', 'nx-recorder'") && rep.includes("record-host.html?s=") && rep.includes("channel: 'nx-rec'") && rec.includes("CHANNEL = 'nx-rec'") && !rep.includes('new MediaRecorder'));
t('phones fall back to the pin report: the recorder row needs getDisplayMedia', rep.includes('!!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder'));
t('recording items are skipped when pins are drawn (they have no shape)', rep.includes('it.shape && it.page === pageKey()'));
t('one tab commits a finished recording (visible tab), others wait; no duplicates', rep.includes("document.visibilityState !== 'visible' || L.seen.has(m.id)") && rep.includes('openRecordingSheet()') && rec.includes("k: 'finished'"));
t('Record never reloads a running recorder window: it only opens-or-finds by name and navigates a blank one', rep.includes("w.location.href === 'about:blank'") && rep.includes('else w.focus()'));
t('one toolbar: the recorder build replaces the pin bar and keeps Reports; it can tuck into a pill with a live timer', rep.includes('if (ctx.recorder && L.cv) return liveBar()') && rep.includes('nxr-pill') && rep.includes('data-l="__list"') && rep.includes('nxr-clock') && rep.includes("fab.querySelector('em')") && !rep.includes('L.bar2.'));
t('ending a recording opens the issue sheet (video, note, category, Save & send) and acks the upload target', rep.includes('Save &amp; send') && rep.includes("k: 'ack'") && rep.includes('upTarget()') && rec.includes("m.k === 'ack'"));
t('no migration: the video upload goes to /api/issues/recording with the owner token the page hands over, the pop-up hard-codes no route', !rec.includes('/api/') && rep.includes('/api/issues/recording') && rec.includes('Authorization: `Bearer ${S.up.token}`') && rec.includes('S.blob.size > MAX_BYTES'));
t('Cancel on a note and Esc both leave the pin tool, so its canvas stops covering the page (browsing bug)', rep.includes("nxr-x').addEventListener('click', () => setTool('browse'))") && rep.includes("tool !== 'browse')) { if (L.tool) liveTool(null); else setTool('browse')"));
t('discarding a recording: button on the page bar and in the pop-up, nothing saved or attached, drawing tool released', rep.includes("cmd: 'discard'") && rec.includes('function discard()') && rec.includes('S.discarded') && html.includes('id="discard"') && rep.includes("liveTool(null); else liveBar()"));
t('finished recording lists pages, moments and captions that seek the preview (text set with textContent)', html.includes('id="jump"') && rec.includes('v.currentTime = +b.dataset.t / 1000') && rec.includes('s.textContent = rows[i].text'));
t('reports panel lists reports and marks them fixed or reopened through the owner routes', rep.includes("api('/api/issues')") && rep.includes('/api/issues/status') && rep.includes('data-s='));
t('phones record inside the page (iframe panel), not a second tab; Back minimizes without stopping; desktop keeps the pop-up with a Back button', rep.includes("matchMedia('(pointer:coarse)')") && rep.includes("class: 'nxr-rh'") || rep.includes("className: 'nxr-rh'") && rec.includes('const INLINE = window.parent !== window') && html.includes('id="back"') && rec.includes("goBack('min')") && rep.includes("rhost('min')"));
done();
