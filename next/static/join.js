// Club › Join: the real Discord apply link is in the page; this adds (1) the signed-in status card from /api/me, (2) the short application form
// (POST /api/trials/apply, public, behind the trials flag, rate-limited by the Worker), (3) the managers to talk to (GET /api/contacts).
// Local design builds have no API: the form and contacts stay hidden and the Discord button is the whole flow.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), API = window.NOREX_API, A = window.NorexAuth, M = window.NorexMotion;
  const form = $('[data-join-form]'); if (!form) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const apply = (window.NOREX && window.NOREX.apply) || '';
  const get = (p) => fetch(API + p, { cache: 'no-store', headers: A?.token ? { Authorization: 'Bearer ' + A.token } : {} }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

  // ---------- status for signed-in users ----------
  const stat = $('[data-join-status]');
  if (stat && API && A?.token) get('/api/me').then((m) => {
    const c = m.claim, role = m.user?.roleLabel || 'Member', name = esc(A.name || m.user?.name || 'you');
    const [icon, title, text, link] = c && c.status === 'approved' ? ['✅', 'You are in the squad', `You are signed in as ${name} and linked to ${esc(c.playerName || c.player)}. Nothing to apply for.`, ['hub.html', 'Open the Hub']]
      : c && c.status === 'pending' ? ['⏳', 'Your player link is waiting for a manager', `You asked to be linked to ${esc(c.playerName || c.player)}. A manager approves it, usually within a day or two.`, ['hub-squad.html', 'See the Hub']]
      : c && c.status === 'declined' ? ['❌', 'Your player link was declined', `Ask a manager on Discord why, then send a new link request from your profile.`, ['hub.html', 'Open the Hub']]
      : ['👋', `Welcome, ${name}`, `You are signed in as ${esc(role)} but not linked to a player yet. If you are already in the club, link your player from the Hub. If you want to join, apply on Discord or send the form below.`, ['hub.html', 'Open the Hub']];
    stat.innerHTML = `<div class="panel jn-st"><span class="em" aria-hidden="true">${icon}</span><div><b>${title}</b><p class="muted small" style="margin:4px 0 0">${text}</p></div><a class="btn ghost" href="${link[0]}">${link[1]}</a></div>`;
    stat.hidden = false;
  }).catch(() => {});
  else if (stat && API) { stat.innerHTML = `<div class="panel jn-st"><span class="em" aria-hidden="true">🔑</span><div><b>Already applied or in the club?</b><p class="muted small" style="margin:4px 0 0">Sign in with Discord to see where your application or player link stands.</p></div><a class="btn ghost" data-login href="#">Sign in with Discord</a></div>`; stat.hidden = false; A?.loginUrl && stat.querySelector('[data-login]').setAttribute('href', A.loginUrl()); }

  if (!API) return; // design build: Discord only

  // ---------- the short application ----------
  const f = $('form', form), msg = $('.jn-msg', f), picked = new Set();
  const say = (t, ok) => { msg.textContent = t; msg.className = 'jn-msg ' + (ok ? 'ok' : t ? 'err' : ''); };
  $('.jn-pos', f).addEventListener('click', (e) => {
    const b = e.target.closest('[data-pos]'); if (!b) return; const p = b.dataset.pos;
    if (picked.has(p)) picked.delete(p); else if (picked.size < 3) picked.add(p); else { say('Pick up to three positions.'); return; }
    b.classList.toggle('on', picked.has(p)); b.setAttribute('aria-pressed', picked.has(p)); say('');
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(f));
    if (String(v.ea || '').trim().length < 2) return say('Enter your EA ID / gamertag.');
    if (!v.platform) return say('Pick a platform.');
    if (!picked.size) return say('Pick at least one position.');
    if (!/^[\w.]{2,32}$/.test(String(v.discord || '').replace(/^@/, '').trim())) return say('Enter your Discord username so a manager can reach you.');
    if (v.clips && !/^https:\/\//i.test(String(v.clips).trim())) return say('The clips link must start with https://');
    const btn = $('button[type=submit]', f); btn.disabled = true; say('Sending…');
    try {
      const r = await fetch(API + '/api/trials/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...v, positions: [...picked] }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Could not send that. Try again, or apply on Discord.');
      f.innerHTML = `<div class="jn-done"><span style="font-size:44px" aria-hidden="true">✅</span><h3>Application sent</h3><p class="muted">A manager will message you on Discord (<b>${esc(String(v.discord).replace(/^@/, ''))}</b>). To be sure you do not miss it, ${apply ? `<a href="${esc(apply)}" target="_blank" rel="noopener">join our Discord</a>` : 'join our Discord'} too.</p></div>`;
      M?.toast('Application sent', { kind: 'ok' });
    } catch (er) { say(er.message); btn.disabled = false; }
  });

  // is the form open? (flag trials) – the contacts call answers 404 when it is off
  get('/api/contacts').then((r) => {
    form.hidden = false;
    const list = r.contacts || []; if (!list.length) return;
    const box = $('[data-join-contacts]'); $('.jn-ct', box).innerHTML = list.slice(0, 8).map((c) => `<div class="panel jn-c">${c.a ? `<img src="${esc(c.a)}" alt="" width="46" height="46" loading="lazy">` : '<span class="jn-av">👤</span>'}<div><b>${esc(c.n)}</b><div class="muted tiny">${c.role === 'owner' ? '👑 Founder' : '🧢 Manager'}${c.tag ? ' · @' + esc(c.tag) : ''}</div></div></div>`).join('');
    box.hidden = false;
  }).catch(() => {});
})();
