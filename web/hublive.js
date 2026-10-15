// Hub live roster + waves (board 10, front end for BE8's HubRoom socket) – loaded by hub.js once the
// `hubLive` flag is on. NXHubLive.mount(el, ctx) draws a "Here right now" strip of member chips with a 👋 button
// on each, keeps it current from the /api/hub/ws socket (roster / here / gone / wave), and shows a toast when
// someone waves at you. Without a socket (or if it drops) the strip shows a quiet "offline" note and retries;
// waves still go through POST /api/hub/wave, which queues a bell/DM notification when the target isn't connected.
// Reduced motion: no pulse/bounce animations (CSS), the wave toast just appears.
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function mount(el, ctx) {
    const { call, toast, api, token, me, canWave } = ctx;
    const here = new Map(); // id → { u, n, a }
    let sock = null, ping = null, retry = null, state = 'connecting', stopped = false;

    el.hidden = false;
    el.innerHTML = `<div class="hubl-head"><b>🟢 Here right now</b><span class="hubl-state muted small" data-hubl-state></span></div><div class="hubl-row" data-hubl-row aria-live="polite"></div>`;
    const row = el.querySelector('[data-hubl-row]');
    const stateEl = el.querySelector('[data-hubl-state]');

    const chip = (w) => `<span class="hubl-chip${w.u === me ? ' me' : ''}" data-u="${esc(w.u)}">${window.UI ? UI.avatar(w.a, w.n, 28) : ''}<span class="hubl-name">${esc(w.n)}${w.u === me ? ' <small>(you)</small>' : ''}</span>${w.u !== me && canWave ? `<button type="button" class="hubl-wave" data-wave="${esc(w.u)}" aria-label="Wave at ${esc(w.n)}" title="Wave at ${esc(w.n)}">👋</button>` : ''}</span>`;
    const paint = () => {
      const list = [...here.values()].sort((a, b) => (a.u === me ? -1 : b.u === me ? 1 : a.n.localeCompare(b.n)));
      row.innerHTML = list.length ? list.map(chip).join('') : `<span class="muted small">${state === 'live' ? 'Just you for now – the clubhouse is quiet.' : ''}</span>`;
      stateEl.textContent = state === 'live' ? `${list.length} in the clubhouse` : state === 'connecting' ? 'connecting…' : 'live view offline – retrying';
    };

    const onMsg = (e) => {
      if (e.data === 'pong') return;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'roster') { here.clear(); (m.who || []).forEach((w) => here.set(w.u, w)); paint(); }
      else if (m.t === 'here' && m.who?.u) { here.set(m.who.u, m.who); paint(); }
      else if (m.t === 'gone') { here.delete(m.u); paint(); }
      else if (m.t === 'wave' && m.from) toast?.(`👋 ${m.from.n} waved at you`);
    };

    function connect() {
      if (stopped || !window.WebSocket || !api || !token) { state = 'offline'; paint(); return; }
      state = 'connecting'; paint();
      try { sock = new WebSocket(`${api.replace(/^http/, 'ws')}/api/hub/ws?t=${encodeURIComponent(token)}`); } catch { state = 'offline'; paint(); return; }
      const s = sock;
      s.onopen = () => {
        state = 'live';
        here.set(me, { u: me, n: ctx.name || 'You', a: ctx.avatar || null }); // the room only sends *others'* join events, never ours
        paint();
        ping = setInterval(() => { if (s.readyState === 1) s.send('ping'); }, 30000);
      };
      s.onmessage = onMsg;
      s.onclose = () => {
        clearInterval(ping);
        if (sock !== s) return;
        sock = null; here.clear(); state = 'offline'; paint();
        if (!stopped) retry = setTimeout(connect, 8000);
      };
    }

    row.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-wave]');
      if (!b || b.disabled) return;
      b.disabled = true;
      try {
        const r = await call('/api/hub/wave', { to: b.dataset.wave });
        b.classList.add('sent');
        toast?.(r.delivered ? '👋 Waved – they saw it live' : '👋 Waved – they’ll get it as an alert');
      } catch (err) { toast?.(err.message || 'Couldn’t wave right now', 'err'); }
      setTimeout(() => { b.disabled = false; b.classList.remove('sent'); }, 4000);
    });

    // Don't hold a socket open for a hidden tab; reconnect when it comes back.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { clearTimeout(retry); if (sock) { const s = sock; sock = null; s.onclose = null; try { s.close(1000); } catch {} clearInterval(ping); here.clear(); state = 'offline'; paint(); } }
      else if (!sock && !stopped) connect();
    });
    paint();
    connect();
    return { stop() { stopped = true; clearTimeout(retry); clearInterval(ping); try { sock?.close(1000); } catch {} } };
  }
  window.NXHubLive = { mount };
})();
