// Music page (flag music, owner first): the Norex DJ rooms. Built against the contract drafted in PLANNING/BOT-SITE.md #5:
//   GET  /api/music/rooms                       → [{ id, name, channel, listeners, paused, volume, loop, at,
//                                                    now:{ id, title, artist, thumb, url, length, position } | null,
//                                                    queue:[{ id, title, artist, length, by }] }]   (length/position in seconds, at = server ms)
//   POST /api/music/rooms/<id>/control { action: 'pause'|'resume'|'skip'|'stop'|'clear'|'volume'|'loop'|'add'|'remove', level?, mode?, query?, item? }
//                                                → the room, same shape (managers control; everyone in the club may add)
// The bot side has no HTTP yet, so until it lands the page says so (a 404 is "not connected", not an error) and "Preview with sample rooms"
// draws labelled SAMPLE rooms in the browser. The position bar is worked out locally from `position` + `at`, so one poll per 5 s is enough.
(() => {
  const w = window, d = document;
  const fmt = (s) => { s = Math.max(0, Math.floor(+s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
  // where the song is now: the reported position plus the time since the bot reported it (frozen while paused), never past the end
  const place = (room, now = Date.now()) => { const n = room?.now; if (!n) return 0; const run = room.paused ? 0 : Math.max(0, (now - (+room.at || now)) / 1000); const len = +n.length || 0, p = (+n.position || 0) + run; return len ? Math.min(p, len) : p; };
  const pct = (room, now) => { const len = +room?.now?.length || 0; return len ? Math.round((place(room, now) / len) * 1000) / 10 : 0; };
  const sampleRooms = (now = Date.now()) => [
    { id: 'sample-1', name: 'SAMPLE · Match Night', channel: 'Match night lounge', listeners: 7, paused: false, volume: 60, loop: 'off', at: now,
      now: { id: 's1', title: 'SAMPLE · Walk Out Theme', artist: 'Norex DJ', thumb: '', url: '', length: 214, position: 71 },
      queue: [{ id: 'q1', title: 'SAMPLE · Warm-up Mix', artist: 'Norex DJ', length: 188, by: 'Jez' }, { id: 'q2', title: 'SAMPLE · Final Whistle', artist: 'Norex DJ', length: 241, by: 'Kruger' }] },
    { id: 'sample-2', name: 'SAMPLE · Chill Room', channel: 'Chill', listeners: 2, paused: true, volume: 35, loop: 'queue', at: now,
      now: { id: 's2', title: 'SAMPLE · Late Night Lo-fi', artist: 'Norex DJ', thumb: '', url: '', length: 3600, position: 1260 }, queue: [] },
    { id: 'sample-3', name: 'SAMPLE · Empty Room', channel: 'Spare room', listeners: 0, paused: false, volume: 50, loop: 'off', at: now, now: null, queue: [] },
  ];
  w.NorexMusic = { fmt, place, pct, sampleRooms };

  const B = w.NorexBot, root = d.querySelector('[data-music]'); if (!B || !root) return;
  const { esc, safeUrl, imgUrl } = B.U, A = w.NorexAuth;
  const grid = root.querySelector('#mu-rooms'), state = root.querySelector('[data-mu-state]'), sampleBtn = root.querySelector('[data-mu-sample]');
  const canControl = () => ['owner', 'manager'].includes(A?.role) && !A?.viewAs;
  let rooms = [], sample = false, timer = 0, tick = 0, busy = new Set();

  const empty = (icon, title, text, extra = '') => `<div class="panel sq-empty"><span>${icon}</span><div><b>${esc(title)}</b><p class="muted small">${text}</p>${extra}</div></div>`;
  const ctl = (id, action, label, extra = '', cls = 'chip') => `<button type="button" class="${cls}" data-act="${action}" data-room="${esc(id)}" ${extra}>${label}</button>`;
  const roomCard = (r) => {
    const n = r.now, art = n && imgUrl(n.thumb), link = n && safeUrl(n.url), ctrl = canControl() || sample;
    const q = Array.isArray(r.queue) ? r.queue : [];
    return `<article class="panel nxm${r.paused ? ' paused' : ''}" data-room="${esc(r.id)}" aria-label="${esc(r.name)}">
<header class="nxm-h"><div><h3>${esc(r.name)}</h3><p class="muted small">${esc(r.channel || '')} · ${+r.listeners || 0} listening</p></div>${r.paused ? '<span class="pill">Paused</span>' : n ? '<span class="nxm-eq" aria-label="Playing"><i></i><i></i><i></i></span>' : '<span class="pill">Idle</span>'}</header>
${n ? `<div class="nxm-now"><span class="nxm-art">${art ? `<img src="${esc(art)}" alt="" width="72" height="72" loading="lazy" decoding="async">` : '<span aria-hidden="true">🎵</span>'}</span>
<div class="nxm-t"><b>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener nofollow">${esc(n.title)}</a>` : esc(n.title)}</b><span class="muted small">${esc(n.artist || '')}</span>
<div class="nxm-bar2" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct(r))}" aria-label="Song progress"><i style="width:${pct(r)}%"></i></div>
<div class="nxm-tm muted tiny"><span data-pos>${fmt(place(r))}</span><span>${fmt(n.length)}</span></div></div></div>` : `<p class="muted small nxm-none">Nothing is playing. Add a song below to start the room.</p>`}
${ctrl ? `<div class="chips nxm-c">${n ? (r.paused ? ctl(r.id, 'resume', '▶ Play') : ctl(r.id, 'pause', '⏸ Pause')) + ctl(r.id, 'skip', '⏭ Skip') : ''}${n || q.length ? ctl(r.id, 'loop', `🔁 Loop: ${esc(r.loop || 'off')}`) : ''}${q.length ? ctl(r.id, 'clear', '🧹 Clear queue') : ''}
<label class="nxm-vol"><span aria-hidden="true">🔊</span><input type="range" min="0" max="100" step="5" value="${+r.volume || 0}" data-vol="${esc(r.id)}" aria-label="Volume"><b class="num">${+r.volume || 0}</b></label></div>` : ''}
<form class="nxm-add" data-add="${esc(r.id)}"><input name="q" type="text" maxlength="200" placeholder="Song name or link" aria-label="Add a song to ${esc(r.name)}" autocomplete="off"><button class="btn" type="submit">＋ Add</button></form>
${q.length ? `<ol class="nxm-q">${q.slice(0, 8).map((x, i) => `<li><span class="num">${i + 1}</span><span class="nxm-qt"><b>${esc(x.title)}</b><small class="muted">${esc(x.artist || '')}${x.by ? ' · added by ' + esc(x.by) : ''}</small></span><span class="muted tiny">${fmt(x.length)}</span>${ctrl ? `<button type="button" class="chip" data-act="remove" data-room="${esc(r.id)}" data-item="${esc(x.id)}" aria-label="Remove ${esc(x.title)}">✕</button>` : ''}</li>`).join('')}</ol>${q.length > 8 ? `<p class="muted tiny">…and ${q.length - 8} more</p>` : ''}` : ''}
</article>`;
  };
  const paint = () => {
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = rooms.length ? rooms.map(roomCard).join('') : empty('🎧', 'No rooms yet', 'Norex DJ has no voice rooms to show. Once the bot is online they appear here.');
    state.textContent = sample ? 'Showing sample rooms, nothing here is real.' : rooms.length ? `${rooms.length} room${rooms.length === 1 ? '' : 's'} · updates every few seconds` : '';
    sampleBtn.textContent = sample ? '✕ Leave the sample' : '🧪 Preview with sample rooms';
  };
  const offline = (e) => { rooms = []; grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = empty('🔌', e?.status === 404 || /not available|not found|404/i.test(e?.message || '') ? 'Norex DJ isn’t connected to the site yet' : 'Could not reach the music rooms', B.U.esc(e?.message || 'The club server did not answer.'), '<button type="button" class="btn ghost" data-retry>↻ Try again</button>'); state.textContent = ''; };
  const load = async () => {
    if (sample || d.hidden) return;
    try { const l = await B.call('/api/music/rooms'); rooms = Array.isArray(l) ? l : []; paint(); } catch (e) { offline(e); }
  };
  const merge = (room) => { if (!room?.id) return; const i = rooms.findIndex((x) => x.id === room.id); if (i > -1) rooms[i] = room; else rooms.push(room); };
  // sample rooms answer controls locally, so the buttons can be tried without a bot
  const local = (r, body) => { const a = body.action; r.at = Date.now();
    if (r.now) r.now.position = place(r);
    if (a === 'pause') r.paused = true; else if (a === 'resume') r.paused = false; else if (a === 'clear') r.queue = [];
    else if (a === 'volume') r.volume = Math.max(0, Math.min(100, +body.level || 0)); else if (a === 'loop') r.loop = { off: 'track', track: 'queue', queue: 'off' }[r.loop] || 'off';
    else if (a === 'remove') r.queue = r.queue.filter((x) => x.id !== body.item);
    else if (a === 'skip') { const nx = r.queue.shift(); r.now = nx ? { ...nx, thumb: '', url: '', position: 0 } : null; }
    else if (a === 'add') { const t = 'SAMPLE · ' + String(body.query).slice(0, 60); const it = { id: 'a' + Date.now(), title: t, artist: 'Norex DJ', length: 180, by: A?.name || 'You' }; if (r.now) r.queue.push(it); else { r.now = { ...it, thumb: '', url: '', position: 0 }; r.paused = false; } }
    return r; };
  const send = async (id, body) => {
    const key = id + body.action; if (busy.has(key)) return; busy.add(key);
    try { const r = rooms.find((x) => x.id === id); if (!r) return;
      if (sample) local(r, body); else merge(await B.post(`/api/music/rooms/${encodeURIComponent(id)}/control`, body));
      paint();
    } catch (e) { B.toast(e?.message || 'Could not do that'); load(); }
    busy.delete(key);
  };
  grid.addEventListener('click', (e) => {
    if (e.target.closest('[data-retry]')) return load();
    const b = e.target.closest('[data-act]'); if (!b) return;
    send(b.dataset.room, { action: b.dataset.act, ...(b.dataset.item ? { item: b.dataset.item } : {}) });
  });
  grid.addEventListener('change', (e) => { const v = e.target.closest('[data-vol]'); if (v) send(v.dataset.vol, { action: 'volume', level: +v.value }); });
  grid.addEventListener('input', (e) => { const v = e.target.closest('[data-vol]'); if (v) v.parentElement.querySelector('b').textContent = v.value; });
  grid.addEventListener('submit', (e) => { const f = e.target.closest('[data-add]'); if (!f) return; e.preventDefault(); const q = f.q.value.trim(); if (!q) return; f.q.value = ''; send(f.dataset.add, { action: 'add', query: q }); });
  sampleBtn.addEventListener('click', () => { sample = !sample; if (sample) { rooms = sampleRooms(); paint(); } else { grid.innerHTML = ''; grid.setAttribute('aria-busy', 'true'); load(); } });

  // the bars and clocks move every second without a request
  const animate = () => grid.querySelectorAll('.nxm[data-room]').forEach((el) => { const r = rooms.find((x) => x.id === el.dataset.room); if (!r?.now || r.paused) return;
    const bar = el.querySelector('.nxm-bar2 i'), pos = el.querySelector('[data-pos]'); if (bar) bar.style.width = pct(r) + '%'; if (pos) pos.textContent = fmt(place(r)); });
  B.flag('music').then((on) => { root.querySelector('[data-mu-on]').hidden = !on; root.querySelector('[data-mu-off]').hidden = on; if (!on) return;
    load(); timer = setInterval(load, 5000); tick = setInterval(animate, 1000); d.addEventListener('visibilitychange', () => { if (!d.hidden) load(); }); });
})();
