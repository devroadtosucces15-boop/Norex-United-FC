// The Hub clubhouse (redesign board 10, front end for BE8) – loaded on /hub/ only, once a session with the
// `hub` flag exists. NXHub.init(el, ctx) draws:
//   - the gold bar's online count (GET /api/hub, reusing P6.4 presence via the Worker's onlineCount())
//   - a players'-tunnel entrance (once a day, skippable, reduced-motion/no-JS skip straight to the clubhouse)
//   - the clubhouse room map: a flat list of room tiles always renders first (works with JS off), upgraded to
//     a draggable CSS-3D isometric board when motion is allowed and the viewport is wide enough – same
//     flat-first/3D-upgrade shape as the squad carousel and tactics table (board 03/04)
// Room content itself (Match Night Centre's calendar, Tactics Studio, …) already lives on its own page or a
// Squad Hub tab – this only has to get a member to the right door; no new per-room page is built here.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BASE = document.body.dataset.base || '';
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Rooms = feature groups (mockup board 10). `flag` hides a room the viewer's role can't use yet; `min`
  // locks a room to manager/owner (Dugout, Boardroom) regardless of flags – both still show, just locked,
  // so members know the room exists. Target pages are the real, already-built surfaces (no new rooms built here).
  const RANK = { guest: 0, member: 1, claimed: 2, manager: 3, owner: 4 };
  const ROOMS = [
    { id: 'locker', icon: '🎽', name: 'Locker Room', desc: 'Me · stats · builds', href: `${BASE}members.html#locker` },
    { id: 'matchnight', icon: '🗓️', name: 'Match Night Centre', desc: 'Schedule · RSVP · reports', href: `${BASE}members.html#schedule`, flag: 'events' },
    { id: 'tactics', icon: '🧠', name: 'Tactics Room', desc: 'Studio · Playbook', href: `${BASE}tactics.html`, flag: 'tactics' },
    { id: 'trophy', icon: '🏅', name: 'Trophy Room', desc: 'Achievements · badges · HoF', href: `${BASE}members.html#awards`, flag: 'awards' },
    { id: 'scout', icon: '🔭', name: 'Scout Office', desc: 'Scout · Rush log', href: `${BASE}members.html#scout` },
    { id: 'notice', icon: '📣', name: 'Notice board', desc: 'Alerts · announcements', href: `${BASE}members.html#alerts`, flag: 'notifications' },
    { id: 'dugout', icon: '🛡️', name: 'Dugout', desc: 'Managers only', href: `${BASE}members.html#manager`, min: 'manager' },
    { id: 'boardroom', icon: '👑', name: 'Boardroom', desc: 'Owner only', href: `${BASE}members.html#manager`, min: 'owner' },
  ];

  function roomsFor(ctx) {
    const rank = RANK[ctx.role] ?? 0;
    return ROOMS.filter((r) => !r.flag || ctx.flagOn(r.flag)).map((r) => ({ ...r, locked: r.min ? rank < RANK[r.min] : false }));
  }

  const tileHtml = (r) => `<a class="hubw-room${r.locked ? ' locked' : ''}" data-room="${r.id}" ${r.locked ? 'aria-disabled="true"' : `href="${r.href}"`}>
<span class="hubw-room-ic">${r.icon}</span><b>${r.name}</b><small>${r.locked ? '🔒 ' : ''}${r.desc}</small></a>`;

  function flatList(rooms) {
    return `<div class="hubw-toolbar"><button type="button" class="hubw-listview" data-hubw-list aria-pressed="false">☰ List view</button><span class="muted small hubw-hint">Drag to turn · arrow keys between rooms</span></div>
<div class="hubw-stage" data-hubw-stage tabindex="0">${rooms.map(tileHtml).join('')}</div>`;
  }

  // ---------- tunnel entrance: plays once a day, ~1.2s, tap/Enter/Esc skips, reversed on the way out ----------
  function playTunnel(onDone) {
    if (reducedMotion()) return onDone();
    const key = `hub_tunnel_${new Date().toISOString().slice(0, 10)}`;
    let seen = false;
    try { seen = !!localStorage.getItem(key); } catch {}
    if (seen) return onDone();
    const el = document.createElement('div');
    el.className = 'hubw-tunnel';
    el.innerHTML = `<div class="hubw-tunnel-in"><div class="hubw-tn-key" data-tn="1">🔑 Entering the Hub…</div><div class="hubw-tn-walk" data-tn="2"></div><div class="hubw-tn-doors" data-tn="3"><img src="${BASE}assets/crest.png" alt=""><i class="l"></i><i class="r"></i></div><div class="hubw-tn-title" data-tn="4">NOREX<br>HUB</div></div><button type="button" class="hubw-tn-skip">Skip ⏭</button>`;
    document.body.appendChild(el);
    const steps = [1, 2, 3, 4];
    let i = 0, timer;
    const finish = () => { clearTimeout(timer); el.remove(); try { localStorage.setItem(key, '1'); } catch {} onDone(); };
    const step = () => { el.dataset.step = String(steps[i]); i++; if (i < steps.length) timer = setTimeout(step, 280); else timer = setTimeout(finish, 380); };
    el.querySelector('.hubw-tn-skip').addEventListener('click', finish);
    el.addEventListener('click', finish);
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' || e.key === 'Enter') { document.removeEventListener('keydown', esc); finish(); } });
    step();
  }

  // ---------- 3D upgrade: drag-to-orbit isometric board, same stage-driven hit-testing as board 04's carousel ----------
  function build3D(stage, rooms) {
    if (reducedMotion() || innerWidth < 760 || stage.dataset.tt3d) return;
    stage.dataset.tt3d = '1';
    stage.classList.add('hubw-3d');
    let ry = -28, rx = 52, dragging = false, startX = 0, startRy = 0;
    const apply = () => { stage.style.setProperty('--ry', `${ry}deg`); stage.style.setProperty('--rx', `${rx}deg`); };
    apply();
    const onDown = (e) => { dragging = true; startX = (e.touches ? e.touches[0].clientX : e.clientX); startRy = ry; stage.setPointerCapture?.(e.pointerId); };
    const onMove = (e) => { if (!dragging) return; const x = (e.touches ? e.touches[0].clientX : e.clientX); ry = startRy + (x - startX) * 0.4; apply(); };
    const onUp = () => { dragging = false; };
    stage.addEventListener('pointerdown', onDown); stage.addEventListener('pointermove', onMove); addEventListener('pointerup', onUp);
    const tiles = $$('.hubw-room', stage);
    stage.addEventListener('keydown', (e) => {
      const focused = document.activeElement.closest?.('.hubw-room');
      const idx = Math.max(0, tiles.indexOf(focused));
      if (e.key === 'ArrowRight') { e.preventDefault(); tiles[(idx + 1) % tiles.length]?.focus(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); tiles[(idx - 1 + tiles.length) % tiles.length]?.focus(); }
    });
  }

  function init(root, ctx) {
    const rooms = roomsFor(ctx);
    const render = () => {
      root.innerHTML = flatList(rooms);
      const stage = $('[data-hubw-stage]', root);
      const listBtn = $('[data-hubw-list]', root);
      let listMode = false;
      try { listMode = localStorage.getItem('hub_listview') === '1'; } catch {}
      const paint = () => { stage.classList.toggle('hubw-list', listMode); listBtn.setAttribute('aria-pressed', String(listMode)); listBtn.textContent = listMode ? '🧊 3D view' : '☰ List view'; if (!listMode) build3D(stage, rooms); };
      listBtn.addEventListener('click', () => { listMode = !listMode; try { localStorage.setItem('hub_listview', listMode ? '1' : '0'); } catch {} paint(); });
      paint();
      paintBadges();
    };
    // Per-room badges (vote / RSVP / alert numbers). Kept in `badges` so a re-render repaints them.
    let badges = {};
    const paintBadges = () => {
      root.querySelectorAll('[data-room]').forEach((el) => {
        const n = badges[el.dataset.room] ?? 0;
        let b = el.querySelector('.hubw-badge');
        if (!n) { b?.remove(); return; }
        if (!b) { b = document.createElement('i'); b.className = 'hubw-badge'; el.appendChild(b); }
        b.textContent = n > 99 ? '99+' : String(n);
      });
    };
    ctx.call('/api/hub/badges').then((d) => { badges = d.badges || {}; paintBadges(); }).catch(() => {});
    ctx.call('/api/hub').then((d) => {
      const pill = $('[data-hubw-online]');
      if (pill) { pill.hidden = false; $('b', pill).textContent = d.online ?? 0; }
    }).catch(() => {});
    playTunnel(render);
    $('.hubw-back')?.addEventListener('click', (e) => {
      if (reducedMotion()) return;
      const key = `hub_tunnel_${new Date().toISOString().slice(0, 10)}`;
      try { if (!localStorage.getItem(key)) return; } catch { return; }
      e.preventDefault();
      const el = document.createElement('div');
      el.className = 'hubw-tunnel hubw-tunnel-out';
      document.body.appendChild(el);
      setTimeout(() => { location.href = e.currentTarget.href; }, 320);
    });
  }

  window.NXHub = { init };
})();
