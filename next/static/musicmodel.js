(() => {
  const w = window;
  const num = (n, max) => Math.min(max, Math.max(0, Math.floor(+n) || 0));
  const txt = (s, n) => String(s ?? '').slice(0, n);
  const img = (u) => w.NorexBotUtil?.imgUrl?.(u) || '';
  const url = (u) => w.NorexBotUtil?.safeUrl?.(u) || '';
  const clock = (s) => { s = num(s, 359999); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
  const LOOPS = ['off', 'track', 'queue'];
  const track = (q, i) => ({ id: String(q.id ?? i), title: txt(q.title, 140), artist: txt(q.artist, 80), thumb: img(q.thumb), url: url(q.url), length: num(q.length, 36000), by: txt(q.by?.name ?? q.by, 40), position: num(q.position, 36000) });
  const room = (r, t = Date.now()) => ({
    id: String(r.id), name: txt(r.name || 'Music room', 60), channel: txt(r.channel, 60), listeners: num(r.listeners, 9999), paused: !!r.paused, volume: r.volume == null ? 60 : num(r.volume, 100),
    loop: LOOPS.includes(r.loop) ? r.loop : 'off', at: +r.at > 0 ? +r.at : t,
    now: r.now && r.now.title ? track(r.now, 'now') : null,
    queue: (Array.isArray(r.queue) ? r.queue : []).filter((q) => q && q.title).slice(0, 50).map(track),
  });
  const norm = (list, t) => (Array.isArray(list) ? list : []).filter((r) => r && r.id != null).slice(0, 12).map((r) => room(r, t));
  const normTracks = (list) => (Array.isArray(list) ? list : []).filter((q) => q && q.title).slice(0, 12).map(track);
  const played = (r, t = Date.now()) => { const n = r?.now; if (!n) return 0; const run = r.paused ? 0 : Math.max(0, (t - (+r.at || t)) / 1000); return n.length ? Math.min(n.length, (+n.position || 0) + run) : (+n.position || 0) + run; };

  const sample = (t = Date.now()) => norm([
    { id: 'sample-lounge', name: 'SAMPLE · Club lounge', channel: 'Club lounge', paused: false, listeners: 5, volume: 60, at: t, now: { id: 'n1', title: 'SAMPLE · Late night warm-up', artist: 'SAMPLE Artist', length: 214, position: 96 },
      queue: [{ id: 'q1', title: 'SAMPLE · Pre-match hype', artist: 'SAMPLE Artist', length: 187, by: 'Mike' }, { id: 'q2', title: 'SAMPLE · A very long song title to test clamping across two lines on a phone screen', artist: 'SAMPLE Band', length: 203, by: 'Kruger' }] },
    { id: 'sample-match', name: 'SAMPLE · Match night', channel: 'Match night', paused: true, listeners: 0, volume: 40, at: t, now: { id: 'n2', title: 'SAMPLE · Walk-out theme', artist: 'SAMPLE Orchestra', length: 158, position: 40 }, queue: [] },
    { id: 'sample-quiet', name: 'SAMPLE · Quiet room', channel: 'Spare', paused: false, listeners: 0, volume: 50, at: t, now: null, queue: [] },
  ], t);
  const CATALOG = [['Pre-match hype', 'SAMPLE Artist', 187], ['Walk-out theme', 'SAMPLE Orchestra', 158], ['Full-time anthem', 'SAMPLE Choir', 203], ['Late night warm-up', 'SAMPLE Artist', 214], ['Penalty shootout drums', 'SAMPLE Band', 176], ['Golden goal', 'SAMPLE Band', 192]]
    .map(([title, artist, length], i) => ({ id: 'sample-t' + i, title: 'SAMPLE · ' + title, artist, length, thumb: '', url: '', by: '', position: 0 }));
  const samplePlaylists = () => [
    { id: 'sample-p1', name: 'SAMPLE · Match day', count: 4, tracks: CATALOG.slice(0, 4) },
    { id: 'sample-p2', name: 'SAMPLE · Late grind', count: 3, tracks: CATALOG.slice(3, 6) },
  ];
  const normPlaylists = (list) => (Array.isArray(list) ? list : []).filter((p) => p && p.id != null && p.name).slice(0, 12).map((p) => {
    const tracks = normTracks(p.tracks), count = Math.max(tracks.length, num(p.count, 5000));
    return { id: String(p.id), name: txt(p.name, 60), count, tracks, minutes: Math.round(tracks.reduce((a, x) => a + x.length, 0) / 60) };
  });

  const apply = (r, body, t = Date.now(), by = '') => {
    const x = JSON.parse(JSON.stringify(r)), n = x.now, a = body.action;
    if (a === 'pause') { if (n && !x.paused) { n.position = played(r, t); x.at = t; } x.paused = true; }
    else if (a === 'resume') { x.at = t; x.paused = false; }
    else if (a === 'skip') { const q = x.queue.shift(); x.now = q ? { ...q, position: 0 } : null; x.at = t; if (!q) x.paused = false; }
    else if (a === 'stop') { x.now = null; x.paused = false; x.at = t; }
    else if (a === 'clear') x.queue = [];
    else if (a === 'loop') x.loop = { off: 'track', track: 'queue', queue: 'off' }[x.loop] || 'off';
    else if (a === 'volume') x.volume = num(body.level, 100);
    else if (a === 'remove') x.queue = x.queue.filter((q) => q.id !== body.item);
    else if (a === 'add') { const q = body.track; if (!q || !q.title || x.queue.length >= 50) return x; const row = { ...q, id: String(q.id) + '-' + t, by, position: 0 }; if (!n) { x.now = row; x.at = t; x.paused = false; } else x.queue.push(row); }
    return x;
  };

  const reduce = (s, ev) => {
    if (ev.t === 'rooms') { const rooms = norm(ev.rooms); return { ...s, rooms, sel: rooms.some((r) => r.id === s.sel) ? s.sel : rooms[0]?.id || '' }; }
    if (ev.t === 'room') { const r = norm([ev.room])[0]; if (!r) return s; const has = s.rooms.some((x) => x.id === r.id); return { ...s, rooms: has ? s.rooms.map((x) => (x.id === r.id ? r : x)) : [...s.rooms, r], sel: s.sel || r.id }; }
    if (ev.t === 'conn') return { ...s, conn: ev.conn };
    if (ev.t === 'select') return s.rooms.some((r) => r.id === ev.id) ? { ...s, sel: ev.id } : s;
    return s;
  };
  const createStore = ({ me = '', onChange = () => {}, clock: nowFn = Date.now } = {}) => {
    let s = { rooms: [], sel: '', conn: 'sample' }, tr = null, stop = null, sseq = 0;
    const set = (n) => { s = n; onChange(s); };
    const emit = (ev) => set(reduce(s, ev));
    const cur = () => s.rooms.find((r) => r.id === s.sel) || null;
    return {
      get: () => s, room: cur, emit, select: (id) => emit({ t: 'select', id }),
      use(t) { stop?.(); tr = t; stop = t.connect(emit) || null; },
      stop() { stop?.(); stop = null; },
      async cmd(action, arg = {}) {
        const before = cur(); if (!before || !tr) return { ok: false, error: 'No room picked.' };
        const c = { action, ...arg };
        emit({ t: 'room', room: apply(before, c, nowFn(), me) });
        try { const r = await tr.send(before.id, c); if (r && r.id != null) emit({ t: 'room', room: r }); return { ok: true }; }
        catch (e) { emit({ t: 'room', room: before }); return { ok: false, error: e?.message || 'The music bot did not accept that.' }; }
      },
      async search(q) { const n = ++sseq; const rows = await tr.search(q); return n === sseq ? normTracks(rows) : null; },
    };
  };

  const sampleTransport = (me = '') => {
    let rooms = sample(), emit = null, timer = 0;
    const put = (r) => { rooms = rooms.map((x) => (x.id === r.id ? r : x)); emit?.({ t: 'room', room: r }); };
    return {
      kind: 'sample',
      connect(e) { emit = e; e({ t: 'conn', conn: 'sample' }); e({ t: 'rooms', rooms });
        timer = setInterval(() => { const t = Date.now(); rooms.forEach((r) => { if (r.now && !r.paused && r.now.length && played(r, t) >= r.now.length) put(apply(r, { action: 'skip' }, t, me)); }); }, 1000);
        return () => { clearInterval(timer); emit = null; }; },
      async send(id, body) { const r = rooms.find((x) => x.id === id); if (!r) throw new Error('That room is gone.'); const n = apply(r, body, Date.now(), me); put(n); return n; },
      search: (q) => new Promise((ok) => setTimeout(() => ok(CATALOG.filter((x) => (x.title + ' ' + x.artist).toLowerCase().includes(q.toLowerCase()))), 150)),
    };
  };
  const httpTransport = ({ get, post, every = 30e3 }) => ({
    kind: 'http',
    connect(emit) { let dead = false; const poll = async () => { try { const r = norm(await get('/api/music/rooms')); if (!dead && r.length) { emit({ t: 'conn', conn: 'live' }); emit({ t: 'rooms', rooms: r }); } } catch { if (!dead) emit({ t: 'conn', conn: 'offline' }); } };
      poll(); const i = setInterval(poll, every); return () => { dead = true; clearInterval(i); }; },
    send: (id, body) => post(`/api/music/rooms/${encodeURIComponent(id)}/control`, body.action === 'add' && body.track ? { action: 'add', item: body.track.id, query: body.track.title } : body),
    search: (q) => get('/api/music/search?q=' + encodeURIComponent(q)),
  });
  const socketTransport = ({ url: wsUrl, http, WS = w.WebSocket }) => ({
    kind: 'socket',
    connect(emit) { let ws = null, dead = false, wait = 1000, timer = 0;
      const open = () => { try { ws = new WS(wsUrl); } catch { emit({ t: 'conn', conn: 'offline' }); return; }
        ws.onopen = () => { wait = 1000; emit({ t: 'conn', conn: 'live' }); };
        ws.onmessage = (m) => { try { const ev = JSON.parse(m.data); if (ev && (ev.t === 'rooms' || ev.t === 'room')) emit(ev); } catch {} };
        ws.onclose = () => { if (dead) return; emit({ t: 'conn', conn: 'offline' }); timer = setTimeout(open, wait); wait = Math.min(30e3, wait * 2); }; };
      open(); return () => { dead = true; clearTimeout(timer); try { ws?.close(); } catch {} }; },
    send: http.send, search: http.search,
  });

  w.NorexMusicModel = { clock, played, norm, normTracks, normPlaylists, sample, samplePlaylists, catalog: CATALOG, apply, reduce, createStore, sampleTransport, httpTransport, socketTransport };
})();
