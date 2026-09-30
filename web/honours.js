// Member-data parts of the leaderboards (P4.5) and hall of fame (P4.6) pages. Loaded only on those pages.
//   [data-leaders-members]  squad boards for a month: attendance, MOTM vote wins, votes cast (+ awards / predictions later)
//   [data-hof-legends]      legend cards; managers induct and remove
//   [data-hof-timeline]     manager-added moments merged into the club history timeline
// Runs on DOMContentLoaded: this deferred script sits in <main>, before ui.js, so window.UI isn't there yet.
document.addEventListener('DOMContentLoaded', () => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '';
  const MAPI = document.body.dataset.api || '';
  if (!MAPI) return;
  const FLAGS = (() => { try { return JSON.parse(document.body.dataset.features || '{}'); } catch { return {}; } })();
  const FLAG_MIN = { public: 0, members: 1, managers: 3, owner: 4 };
  const RANK = { guest: 0, member: 1, claimed: 2, manager: 3, owner: 4 };
  const session = (() => {
    try {
      const t = localStorage.getItem('norex_session');
      const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
      return p.exp > Date.now() / 1000 ? { token: t, ...p } : null;
    } catch { return null; }
  })();
  const role = session ? session.role ?? (session.adm ? 'manager' : 'member') : 'guest';
  const flagOn = (name) => FLAGS[name] in FLAG_MIN && (RANK[role] ?? 0) >= FLAG_MIN[FLAGS[name]];
  const call = async (path, body) => {
    const r = await fetch(MAPI + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { ...(session ? { Authorization: `Bearer ${session.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  const loginUrl = () => `${MAPI}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
  const nice = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const pHref = (k) => `${BASE}players/${encodeURIComponent(k)}.html`;
  const bars = (rows, label, fmt) => {
    const max = Math.max(1, ...rows.map((r) => r.v));
    return `<ol class="barlist in">${rows.slice(0, 8).map((r, i) => `<li style="--w:${Math.max(4, (r.v / max) * 100)}%"><span class="bl-rank">${i + 1}</span><span class="bl-name">${label(r)}</span><b>${fmt ? fmt(r) : r.v}</b></li>`).join('') || '<li class="muted bl-empty">Nobody yet this month</li>'}</ol>`;
  };

  // ---------- P4.5 squad boards ----------
  const lb = $('[data-leaders-members]');
  if (lb && flagOn('leaders')) {
    if (!session) lb.innerHTML = UI.empty({ icon: '🔒', title: 'Members only', text: 'Log in with Discord to see attendance and MOTM vote tables.', action: `<a class="btn discord" href="${loginUrl()}">Log in with Discord</a>` });
    else {
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
      const label = (m) => new Date(m + '-15T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      lb.innerHTML = `${UI.tabsHtml(months.map((m) => [m, label(m)]), months[0], 'lb-months')}<div class="lb-members"></div>`;
      const out = $('.lb-members', lb);
      const show = async (month) => {
        out.innerHTML = UI.skeleton('rows', 4);
        try {
          const d = await call(`/api/leaders?month=${month}`);
          const who = (u) => UI.member({ id: u.id, n: u.n, a: u.a }, { size: 22, card: false });
          out.innerHTML = `<div class="mx-boards">
<div class="card mx-board"><h3>📅 Attendance</h3>${bars(d.attendance.map((u) => ({ ...u, v: u.yes })), who, (u) => `${u.yes}${u.maybe ? ` <small class="muted">+${u.maybe}?</small>` : ''}`)}<p class="small muted">Days marked “I’m in” in the Squad Hub</p></div>
<div class="card mx-board"><h3>⭐ MOTM by vote</h3>${bars(d.motmVotes.map((p) => ({ ...p, v: p.wins })), (p) => `<a href="${pHref(p.k)}">${esc(p.n)}</a>`)}<p class="small muted">Squad-vote winners · ${d.matchesVoted} matches voted</p></div>
<div class="card mx-board"><h3>🗳️ Most votes cast</h3>${bars(d.voters.map((u) => ({ ...u, v: u.votes })), who)}<p class="small muted">Members who voted for MOTM</p></div>
${d.awards ? `<div class="card mx-board"><h3>🏅 Weekly awards</h3>${bars(d.awards.map((p) => ({ ...p, v: p.wins })), (p) => `<a href="${pHref(p.k)}">${esc(p.n)}</a>`)}<p class="small muted">Weekly award wins (votes + stat awards) this month</p></div>`
  : `<div class="card mx-board lb-soon"><h3>🏅 Weekly awards</h3>${UI.empty({ icon: '🏅', title: 'Coming soon', text: 'Best Striker, Defender, Keeper and Midfielder winners land here once weekly awards open.' })}</div>`}
${d.predictions ? `<div class="card mx-board"><h3>🔮 Predictions</h3>${bars(d.predictions.map((u) => ({ ...u, v: u.pts })), who, (u) => `${u.pts}${u.exact ? ` <small class="muted">${u.exact} exact</small>` : ''}`)}<p class="small muted">Prediction points from this month’s match nights</p></div>`
  : `<div class="card mx-board lb-soon"><h3>🔮 Predictions</h3>${UI.empty({ icon: '🔮', title: 'Coming soon', text: 'Score prediction points appear here once predictions open.' })}</div>`}</div>`;
        } catch (e) { out.innerHTML = UI.empty({ icon: '📡', title: 'Squad boards are unavailable', text: e.message }); }
      };
      UI.tabs($('.lb-months', lb), show);
      show(months[0]);
    }
  }

  // ---------- P4.6 legends + moments ----------
  const lg = $('[data-hof-legends]');
  const tl = $('[data-hof-timeline]');
  const teaser = $('[data-hof-teaser]');
  if ((!lg && !teaser) || !flagOn('hallOfFame')) return;
  let S = null;
  let playersP;
  const players = () => (playersP ??= fetch(`${BASE}api/players.json`).then((r) => r.json()).catch(() => []));

  const legendCard = (x) => `<article class="legend"><span class="lg-star" aria-hidden="true">🌟</span><b>${x.k ? `<a href="${pHref(x.k)}">${esc(x.n)}</a>` : esc(x.n)}</b>
<small>${esc(x.title || 'Club legend')}</small>${x.text ? `<p>${esc(x.text)}</p>` : ''}<div class="lg-meta">Inducted ${x.date ? nice(x.date) : ''}</div>
${S.canManage ? `<button type="button" class="btn sm ghost hof-x" data-rm="${x.id}" aria-label="Remove ${esc(x.n)}">✕ Remove</button>` : ''}</article>`;
  const momentLi = (x) => `<li class="hof-ev moment" data-date="${esc(x.date)}" data-mid="${x.id}"><time datetime="${esc(x.date)}">${nice(x.date)}</time><span class="hof-ic">📜</span><div><b>${esc(x.n)}</b>${S.canManage ? `<button type="button" class="btn sm ghost hof-x" data-rm="${x.id}" aria-label="Remove">✕</button>` : ''}<p>${esc(x.text || '')}</p></div></li>`;

  // Home page teaser (board 04, part 1): one legend card + a link to the full page. Independent of `lg`
  // so it also works on index.html, which has no full legends/timeline UI.
  if (teaser) {
    call('/api/hof').then((d) => {
      const x = d.legends?.[0];
      if (!x) return;
      S = d;
      teaser.innerHTML = `${legendCard(x)}<p><a class="btn ghost" href="${BASE}halloffame.html">🏛️ Enter the Hall →</a></p>`;
      teaser.hidden = false;
    }).catch(() => {});
  }
  if (!lg) return;

  function render() {
    lg.innerHTML = `${S.canManage ? `<div class="hof-tools"><button type="button" class="btn sm" data-add="legend">🌟 Induct a legend</button><button type="button" class="btn sm ghost" data-add="moment">📜 Add a history moment</button></div>` : ''}
${S.legends.length ? `<div class="legends">${S.legends.map(legendCard).join('')}</div>` : UI.empty({ icon: '🌟', title: 'No legends inducted yet', text: 'Managers induct the players who defined the club. The first names go up here.' })}`;
    if (tl) {
      $$('li.moment', tl).forEach((li) => li.remove());
      for (const x of S.moments) {
        const li = document.createRange().createContextualFragment(momentLi(x)).firstElementChild;
        const after = $$('li', tl).find((o) => (o.dataset.date || '') < x.date);
        tl.insertBefore(li, after ?? null);
      }
    }
  }
  async function load() {
    try { S = await call('/api/hof'); render(); } catch (e) { lg.innerHTML = UI.empty({ icon: '📡', title: 'Legends are unavailable right now', text: e.message }); }
  }
  async function add(kind) {
    const list = kind === 'legend' ? await players() : [];
    const home = list.filter((p) => p.home);
    const today = new Date().toISOString().slice(0, 10);
    const body = kind === 'legend'
      ? `<form class="hof-form" novalidate><label>Player (from the site) or any name<input name="who" list="hof-pl" maxlength="60" required autocomplete="off" placeholder="Gamertag"></label>
<datalist id="hof-pl">${[...home, ...list.filter((p) => !p.home)].slice(0, 400).map((p) => `<option value="${esc(p.n)}">`).join('')}</datalist>
<label>Honour<input name="title" maxlength="80" placeholder="Club legend · Captain 2026–27"></label>
<label>Citation<textarea name="text" maxlength="400" rows="3" placeholder="Why they belong here"></textarea></label>
<label>Inducted on<input name="date" type="date" value="${today}"></label></form>`
      : `<form class="hof-form" novalidate><label>Title<input name="who" maxlength="60" required placeholder="Promoted to Division 3"></label>
<label>What happened<textarea name="text" maxlength="400" rows="3" required></textarea></label>
<label>Date<input name="date" type="date" value="${today}" required></label></form>`;
    let f = null;
    const read = (d) => { f = Object.fromEntries(new FormData($('form', d))); };
    const v = await UI.modal({ title: kind === 'legend' ? 'Induct a legend' : 'Add a history moment', icon: kind === 'legend' ? '🌟' : '📜', body,
      actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: kind === 'legend' ? 'Induct' : 'Add', value: 'ok' }],
      onOpen: (d) => { read(d); d.addEventListener('input', () => read(d)); } });
    if (v !== 'ok' || !f) return;
    const pl = kind === 'legend' && list.find((p) => p.n.toLowerCase() === String(f.who).trim().toLowerCase());
    try {
      S = await call('/api/hof', { kind, name: f.who, player: pl ? pl.k : undefined, title: f.title, text: f.text, date: f.date });
      render();
      UI.toast(kind === 'legend' ? `🌟 ${f.who} is in the Hall of Fame` : '📜 Moment added to the timeline', 'ok');
    } catch (e) { UI.toast(e.message, 'bad'); }
  }
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-add]');
    if (a && lg.contains(a)) return add(a.dataset.add);
    const rm = e.target.closest('[data-rm]');
    if (rm && S?.canManage) {
      if (!(await UI.confirm({ title: 'Remove from the Hall of Fame?', text: 'It disappears from the public page. The activity log keeps a record.', ok: 'Remove', danger: true }))) return;
      try { S = await call('/api/hof/remove', { id: +rm.dataset.rm }); render(); UI.toast('Removed', 'ok'); } catch (err) { UI.toast(err.message, 'bad'); }
    }
  });
  load();
});
