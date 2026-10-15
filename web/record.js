// Owner screen recorder for the issue tool. Two halves in one file:
//   • pure helpers (NXRec.pickMime / fmtDur / fmtBytes / capMs / fileName / summarize / fitItem) – unit-tested in tests/recorder.test.mjs
//   • NXRec.host(document) – runs in the small pop-up window record-host.html. The pop-up (not the page) owns getDisplayMedia, the mic and the
//     MediaRecorder, because the site is multi-page: a normal page navigation would kill a recorder that lived in the page. The pop-up stays
//     alive while the owner browses, and talks to whichever Norex page is open over a BroadcastChannel.
// Drawing is NOT composited into the video: the marks are real elements on the Norex page (web/annotate.js), so whatever the owner shares
// (that tab, the browser window, or the whole screen) already contains them. Marks cannot be drawn over other applications' windows.
(() => {
  const CHANNEL = 'nx-rec';
  const ACTIVE = 'nx_rec_active';           // localStorage: { id, state, ts } written by the pop-up every second while it lives
  const PENDING = 'nx_issue_pending_rec';   // localStorage: a finished recording nobody was around to attach
  const MAX_BYTES = 55e6;                   // matches the 60 MB media cap the Tactics Studio already uses, with headroom for container overhead
  const MAX_ITEM = 50000;                   // bot/issues.js refuses a report whose JSON is over 60 000 characters; the page adds device info on top
  const QUALITY = { standard: { label: 'Standard · 1 Mbps', video: 1_000_000, audio: 64_000 }, sharp: { label: 'Sharp · 2.5 Mbps', video: 2_500_000, audio: 64_000 } };
  const MIMES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

  const pickMime = (supported) => MIMES.find((m) => { try { return supported(m); } catch { return false; } }) || '';
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDur = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
  const fmtBytes = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(0, Math.round(b / 1e3))} KB`);
  // longest recording that stays under the size cap at this bitrate
  const capMs = (q) => Math.floor((MAX_BYTES * 8) / (q.video + q.audio) * 1000);
  const ext = (mime) => (/mp4/.test(mime) ? 'mp4' : 'webm');
  const fileName = (session, started, mime) => { const d = new Date(started); return `norex-bug-${session || 'session'}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.${ext(mime)}`; };

  const pages = (events) => [...new Set(events.filter((e) => e.k === 'page').map((e) => e.url))];
  function summarize(rec) {
    const r = rec.recording, say = r.transcript.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
    const n = pages(r.events).length;
    return `🎥 Screen recording · ${fmtDur(r.ms)} · ${n} page${n === 1 ? '' : 's'} · ${fmtBytes(r.bytes)} (${r.file})${say ? ` — “${say.slice(0, 900)}${say.length > 900 ? '…' : ''}”` : ''}`;
  }

  // Make a recording item fit the Worker's report-size cap: drop the noisiest events first (mark counts), then the oldest transcript lines.
  function fitItem(item, limit = MAX_ITEM) {
    const r = item.recording, size = () => JSON.stringify(item).length;
    if (size() <= limit) return item;
    r.events = r.events.filter((e) => e.k !== 'mark');
    r.trimmed = true;
    while (size() > limit && r.transcript.length > 1) r.transcript.splice(0, Math.ceil(r.transcript.length / 8));
    while (size() > limit && r.events.length > 2) r.events.splice(Math.floor(r.events.length / 2), 1);
    return item;
  }

  function buildItem({ session, started, ms, bytes, mime, file, events, transcript, voice, captions, quality, page, title }) {
    const item = {
      kind: 'recording', page, title, severity: 'wrong', t: started,
      recording: { file, mime, ms, bytes, quality, voice, captions, uploaded: false, events: events.slice(0, 400), transcript: transcript.slice(-400), session },
    };
    item.note = summarize(item);
    return fitItem(item);
  }

  // ---------- the pop-up ----------
  function host(doc) {
    const $ = (s) => doc.querySelector(s);
    const ch = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null;
    const qs = new URLSearchParams(location.search), session = (qs.get('s') || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
    const store = {
      set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
      del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } },
    };
    const S = { state: 'idle', stream: null, mic: null, rec: null, ac: null, chunks: [], bytes: 0, started: 0, runStart: 0, paused: 0, pauseAt: 0, events: [], transcript: [], mime: '', q: QUALITY.standard, voice: false, id: `r${Date.now().toString(36)}`, blob: null, url: null, sr: null, srOn: false, level: null, ticker: 0 };
    const elapsed = () => (S.state === 'idle' ? 0 : (S.state === 'paused' ? S.pauseAt : Date.now()) - S.runStart - S.paused);
    const view = (name) => doc.querySelectorAll('[data-view]').forEach((e) => { e.hidden = e.dataset.view !== name; });
    const say = (msg, bad) => { const el = $('#msg'); el.textContent = msg || ''; el.className = bad ? 'bad' : ''; };

    function broadcast() {
      const m = { from: 'host', k: 'state', id: S.id, state: S.state, ms: elapsed(), bytes: S.bytes, mic: !!S.mic && S.mic.enabled !== false, session };
      try { ch?.postMessage(m); } catch { /* channel closed */ }
      if (S.state === 'recording' || S.state === 'paused') store.set(ACTIVE, { id: S.id, state: S.state, ts: Date.now(), startedAt: S.runStart });
    }

    function paint() {
      const ms = elapsed();
      $('#clock').textContent = fmtDur(ms);
      $('#size').textContent = `${fmtBytes(S.bytes)} of ${fmtBytes(MAX_BYTES)} · up to ${fmtDur(capMs(S.q))}`;
      $('#pause').textContent = S.state === 'paused' ? '▶ Resume' : '⏸ Pause';
      $('#mute').textContent = S.mic?.enabled === false ? '🔇 Muted' : '🎙 Mic on';
      $('#mute').hidden = !S.mic;
      doc.body.dataset.state = S.state;
      doc.title = S.state === 'recording' ? `● ${fmtDur(ms)} Recording` : S.state === 'paused' ? `⏸ ${fmtDur(ms)} Paused` : 'Norex recorder';
      if (S.level) { const a = new Uint8Array(S.level.fftSize); S.level.getByteTimeDomainData(a); let peak = 0; for (const v of a) peak = Math.max(peak, Math.abs(v - 128)); $('#meter i').style.width = `${Math.min(100, peak * 1.6)}%`; }
    }

    // live captions – a transcript of the voice-over, searchable in the report (the video itself can't go in the database)
    function startCaptions() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR || !$('#caps').checked) return;
      S.srOn = true;
      let fails = 0;
      const run = () => {
        if (!S.srOn) return;
        const sr = S.sr = new SR(); sr.lang = navigator.language || 'en-GB'; sr.interimResults = false; sr.continuous = false;
        sr.onresult = (ev) => { fails = 0; for (const r of [...ev.results].slice(ev.resultIndex)) if (r.isFinal && S.state === 'recording') { const text = r[0].transcript.trim(); if (text) S.transcript.push({ t: elapsed(), text }); } };
        sr.onerror = (ev) => { if (ev.error !== 'no-speech' && ev.error !== 'aborted') fails++; };
        sr.onend = () => { if (S.srOn && fails < 4) { try { run(); } catch { S.srOn = false; } } };
        try { sr.start(); } catch { S.srOn = false; }
      };
      run();
    }
    const stopCaptions = () => { S.srOn = false; try { S.sr?.abort(); } catch { /* ended */ } S.sr = null; };

    async function start(surface) {
      say('');
      const withSound = $('#sound').checked;
      S.q = QUALITY[$('#quality').value] || QUALITY.standard;
      let disp;
      try {
        const base = { video: { displaySurface: surface, frameRate: { ideal: 20, max: 30 }, width: { max: 1920 }, height: { max: 1080 }, cursor: 'always' }, audio: withSound };
        try { disp = await navigator.mediaDevices.getDisplayMedia({ ...base, selfBrowserSurface: 'exclude', surfaceSwitching: 'include', monitorTypeSurfaces: 'include', systemAudio: withSound ? 'include' : 'exclude' }); }
        catch (e) { if (e?.name === 'TypeError') disp = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: withSound }); else throw e; }
      } catch (e) { return say(e?.name === 'NotAllowedError' ? 'Nothing was shared – pick a screen, window or tab to start.' : `Could not start sharing: ${e?.message || e}`, true); }
      let mic = null;
      if ($('#voice').checked) {
        try { mic = (await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })).getAudioTracks()[0]; }
        catch { say('Microphone blocked – recording without a voice-over. Allow the mic for this site to talk over it.', true); }
      }
      S.mic = mic; S.voice = !!mic;
      const sys = withSound ? disp.getAudioTracks()[0] : null;
      let audio = mic || sys || null;
      if (mic && sys) { // voice-over and page sound in one track
        try {
          S.ac = new AudioContext(); const dest = S.ac.createMediaStreamDestination();
          S.ac.createMediaStreamSource(new MediaStream([mic])).connect(dest); S.ac.createMediaStreamSource(new MediaStream([sys])).connect(dest);
          audio = dest.stream.getAudioTracks()[0];
        } catch { audio = mic; }
      }
      if (mic) {
        try { S.ac ||= new AudioContext(); const an = S.ac.createAnalyser(); an.fftSize = 256; S.ac.createMediaStreamSource(new MediaStream([mic])).connect(an); S.level = an; } catch { S.level = null; }
      }
      S.stream = new MediaStream([...disp.getVideoTracks(), ...(audio ? [audio] : [])]);
      S.display = disp;
      S.mime = pickMime((m) => MediaRecorder.isTypeSupported(m));
      let rec;
      try { rec = new MediaRecorder(S.stream, { ...(S.mime ? { mimeType: S.mime } : {}), videoBitsPerSecond: S.q.video, audioBitsPerSecond: S.q.audio }); }
      catch (e) { cleanup(); return say(`This browser cannot record that: ${e?.message || e}`, true); }
      S.mime = rec.mimeType || S.mime || 'video/webm';
      S.rec = rec; S.chunks = []; S.bytes = 0; S.events = []; S.transcript = []; S.paused = 0;
      rec.ondataavailable = (ev) => { if (ev.data?.size) { S.chunks.push(ev.data); S.bytes += ev.data.size; } };
      rec.onstop = finish;
      disp.getVideoTracks()[0].addEventListener('ended', () => { if (S.state === 'recording' || S.state === 'paused') stop(); }); // the browser's own "Stop sharing" bar
      // 3-2-1 so the owner can get back to the page
      view('count');
      for (let i = 3; i > 0; i--) { $('#count').textContent = i; await new Promise((r) => setTimeout(r, 1000)); if (!S.stream) return; }
      if (S.display.getVideoTracks()[0]?.readyState === 'ended') { cleanup(); view('start'); return say('Sharing stopped before the recording began.', true); }
      S.started = Date.now(); S.runStart = S.started; S.state = 'recording';
      rec.start(1000);
      startCaptions();
      view('rec'); S.ticker = setInterval(tick, 500); tick();
      say('Recording. Go back to the Norex page – this window can sit behind it.');
    }

    function tick() {
      paint(); broadcast();
      if (S.state === 'recording' && (elapsed() >= capMs(S.q) || S.bytes >= MAX_BYTES)) { say('Reached the size limit – recording stopped and saved.', true); stop(); }
    }

    function pause() {
      if (S.state === 'recording') { S.rec.pause(); S.state = 'paused'; S.pauseAt = Date.now(); stopCaptions(); }
      else if (S.state === 'paused') { S.paused += Date.now() - S.pauseAt; S.rec.resume(); S.state = 'recording'; startCaptions(); }
      tick();
    }
    const moment = (label = '') => { if (S.state === 'recording') { S.events.push({ t: elapsed(), k: 'moment', label }); $('#moments').textContent = `${S.events.filter((e) => e.k === 'moment').length} moment(s) marked`; } };
    function stop() { if (S.state !== 'recording' && S.state !== 'paused') return; if (S.state === 'paused') S.paused += Date.now() - S.pauseAt; S.stopMs = elapsed(); S.state = 'stopping'; stopCaptions(); try { S.rec.stop(); } catch { finish(); } }

    function cleanup() {
      clearInterval(S.ticker); stopCaptions();
      S.stream?.getTracks().forEach((t) => t.stop()); S.display?.getTracks().forEach((t) => t.stop()); S.mic?.stop();
      try { S.ac?.close(); } catch { /* closed */ }
      S.stream = S.display = S.mic = S.ac = S.level = null;
    }

    function finish() {
      const ms = S.stopMs ?? elapsed(), blob = new Blob(S.chunks, { type: S.mime });
      cleanup(); store.del(ACTIVE);
      S.state = 'done'; S.blob = blob; S.url = URL.createObjectURL(blob);
      const file = fileName(session, S.started, S.mime);
      const pg = S.events.find((e) => e.k === 'page');
      const item = buildItem({ session, started: S.started, ms, bytes: blob.size, mime: S.mime, file, events: S.events, transcript: S.transcript, voice: S.voice, captions: S.transcript.length > 0,
        quality: $('#quality').value, page: pg?.url || '/', title: pg?.title || '' });
      view('done'); paint();
      $('#preview').src = S.url;
      const a = $('#dl'); a.href = S.url; a.download = file; a.textContent = `⬇ Save ${file} (${fmtBytes(blob.size)})`;
      $('#doneInfo').textContent = `${fmtDur(ms)} · ${pages(S.events).length} page(s) · ${S.transcript.length} caption line(s)`;
      a.click(); // the file is the only copy of the video until the Worker can store it, so save it straight away
      if ($('#attach').checked) attach(item); else $('#attachState').textContent = 'Not attached to a report (you turned that off).';
      broadcast();
    }

    // hand the finished item to an open Norex page (it numbers it and queues the upload); if no page answers, leave it for the next page that loads
    function attach(item) {
      let acked = false;
      const onAck = (ev) => { if (ev.data?.from === 'page' && ev.data.k === 'ack' && ev.data.id === S.id) { acked = true; $('#attachState').textContent = `Attached to your bug session as note #${ev.data.n}.`; } };
      ch?.addEventListener('message', onAck);
      try { ch?.postMessage({ from: 'host', k: 'done', id: S.id, item }); } catch { /* closed */ }
      $('#attachState').textContent = 'Attaching to your bug session…';
      setTimeout(() => { if (!acked) { store.set(PENDING, { id: S.id, item }); $('#attachState').textContent = 'No Norex page answered – it will attach itself the next time you open one while signed in as owner.'; } }, 1800);
    }

    ch?.addEventListener('message', (ev) => {
      const m = ev.data;
      if (m?.from !== 'page') return;
      if (m.k === 'event' && S.state === 'recording' && S.events.length < 600) S.events.push({ t: elapsed(), ...m.ev });
      else if (m.k === 'cmd') { if (m.cmd === 'stop') stop(); else if (m.cmd === 'pause') pause(); else if (m.cmd === 'moment') moment(m.label); else if (m.cmd === 'ping') broadcast(); }
    });

    doc.querySelectorAll('[data-surface]').forEach((b) => b.addEventListener('click', () => start(b.dataset.surface)));
    $('#pause').addEventListener('click', pause);
    $('#stop').addEventListener('click', stop);
    $('#moment').addEventListener('click', () => moment());
    $('#mute').addEventListener('click', () => { if (S.mic) { S.mic.enabled = !S.mic.enabled; tick(); } });
    $('#again').addEventListener('click', () => { if (S.url) URL.revokeObjectURL(S.url); S.state = 'idle'; S.blob = S.url = null; $('#preview').removeAttribute('src'); view('start'); say(''); doc.title = 'Norex recorder'; broadcast(); });
    $('#close').addEventListener('click', () => window.close());
    addEventListener('beforeunload', (e) => { if (S.state === 'recording' || S.state === 'paused' || S.state === 'stopping') { e.preventDefault(); e.returnValue = ''; } else if (S.state === 'done' && !S.saved) { /* the file was already saved on stop */ } });
    addEventListener('pagehide', () => { store.del(ACTIVE); try { ch?.postMessage({ from: 'host', k: 'state', id: S.id, state: 'idle', ms: 0, bytes: 0, session }); } catch { /* closed */ } });

    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      view('none');
      return;
    }
    $('#quality').innerHTML = Object.entries(QUALITY).map(([k, v]) => `<option value="${k}">${v.label} · up to ${fmtDur(capMs(v))}</option>`).join('');
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) { $('#caps').checked = false; $('#caps').disabled = true; $('#capsLabel').title = 'Live captions need Chrome or Edge'; }
    view('start'); broadcast();
  }

  window.NXRec = { CHANNEL, ACTIVE, PENDING, QUALITY, MAX_BYTES, MAX_ITEM, pickMime, fmtDur, fmtBytes, capMs, fileName, summarize, fitItem, buildItem, pages, host };
})();
