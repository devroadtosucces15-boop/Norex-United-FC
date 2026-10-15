// Boardroom (redesign board 09) – the owner's tools in one place, on existing owner routes only:
//   ① feature switchboard – one 5-stop slider per flag (POST /api/admin/flags, live on the next request), undo + reset
//   ② health at a glance – data/build/Pages/bot dots + free-tier usage (GET /api/admin/health)
//   ③ announcement with a live preview (POST /api/notify/announce)
//   ④ Hall of Fame induction as a ceremony (POST /api/hof, kind legend)
//   ⑤ people + audit – privacy/hide requests (NXNotify.requestsPortal) and the activity log (search, type filter, show more)
// Preview-as pills reuse BE5's ?previewAs=. app.js mounts it as the Manager tab's 👑 Boardroom sub-tab. Flag `boardroom`.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const LEVELS = ['off', 'owner', 'managers', 'members', 'public'];
  const LABEL = {
    events: ['🗓️', 'Match nights and schedule'], myStats: ['📊', 'My stats dashboard'], badges: ['🏅', 'Badges and achievements'], notifications: ['🔔', 'Alerts and Discord DMs'],
    discordMatch: ['💬', 'Show my match in Discord'], proBuilds: ['🧬', 'Pro Builds'], builder: ['🧩', 'Builder'], roleSync: ['🔁', 'Discord role sync'], rushLog: ['⚡', 'Rush log'],
    scouting: ['🔭', 'Scouting'], leaders: ['🥇', 'Leaders page'], profiles: ['👤', 'Player profiles'], managerNotes: ['📝', 'Manager notes'], hallOfFame: ['🏛️', 'Hall of Fame'],
    trials: ['🧭', 'Trials page'], liveBanner: ['🔴', 'Live banner'], gameRules: ['🎮', 'Game rules'], requests: ['📨', 'Club & privacy requests'], playStyle: ['🎯', 'Play style'],
    docs: ['📄', 'Club docs'], suggestions: ['💡', 'Suggestion box'], matchNight: ['🌙', 'Match night mode'], platformLink: ['🔗', 'Platform links'], discordRsvp: ['✅', 'RSVP from Discord'],
    awards: ['🏆', 'Weekly awards'], rushSquads: ['🤝', 'Rush squads'], starRatings: ['🌟', 'Star ratings'], feedback: ['💌', 'Anonymous feedback'], predictions: ['🔮', 'Predictions'],
    recommendations: ['🎯', 'Who to play with'], scoutReport: ['📋', 'Scout reports'], ask: ['❓', 'Ask the club'], aiInsights: ['🧠', 'Player notes'], lineupRec: ['✨', 'Line-up suggestions'],
    insights: ['🧭', 'Club Intelligence'], feed: ['📰', 'Club feed'], hotw: ['🔥', 'Highlight of the week'], presence: ['🟢', 'Who’s online'], mentions: ['@', 'Mentions'],
    messages: ['✉️', 'Messages'], points: ['⭐', 'Club points'], avatarCard: ['🎨', 'Avatar card'], cardStudio: ['🪪', 'Card Studio'], locker: ['🎽', 'Locker Room tab'], lockerRoom: ['🎽', 'Locker Room redesign'],
    dugout: ['🧢', 'Dugout'], boardroom: ['👑', 'Boardroom'], tactics: ['🧠', 'Tactics Studio + Playbook'], statInsights: ['✨', 'Stat insights'], insightWidget: ['✨', 'Insight widget (front end)'], hub: ['🔑', 'The Hub'], push: ['📲', 'Phone notifications'],
  };
  const FREE = { requests: 100000 };

  let el = null, ctx = null;
  const B = { flags: null, health: undefined, ping: null, undo: [], filter: '', ann: { title: '', body: '', audience: 'members', ack: false }, hof: { player: '', title: '', text: '' }, busy: false, aud: { q: '', type: '', n: 8 } };

  // ---------- ① switchboard ----------
  function switchboard() {
    const flags = B.flags || {};
    const committed = ctx.committed();
    const q = B.filter.toLowerCase();
    const rows = Object.entries(flags).filter(([k]) => !q || k.toLowerCase().includes(q) || (LABEL[k]?.[1] || '').toLowerCase().includes(q));
    return `<div class="br-sec-h"><h3>🎛️ Who can see what</h3><input type="search" class="br-filter" data-br="filter" placeholder="Find a feature…" value="${esc(B.filter)}" aria-label="Find a feature"></div>
<div class="br-flags">${rows.map(([k, v]) => {
      const [ic, label] = LABEL[k] || ['⚙️', k];
      const over = committed[k] !== undefined && committed[k] !== v;
      return `<div class="br-flag"><span class="br-ic" aria-hidden="true">${ic}</span><span class="br-name"><b>${esc(label)}</b><code>${esc(k)}</code>${over ? `<button type="button" class="br-reset" data-reset="${esc(k)}" title="Back to the committed level (${esc(committed[k])})">↺ live override</button>` : ''}</span>
<span class="br-slider" role="radiogroup" aria-label="${esc(label)}" style="--i:${LEVELS.indexOf(v)}"><i class="br-thumb" aria-hidden="true"></i>${LEVELS.map((l) => `<button type="button" role="radio" aria-checked="${l === v}" class="${l === v ? 'on' : ''}" data-flag="${esc(k)}" data-level="${l}">${l[0].toUpperCase() + l.slice(1)}</button>`).join('')}</span></div>`;
    }).join('') || '<p class="muted small">No feature matches.</p>'}</div>
<div class="br-foot"><button type="button" class="btn ghost sm" data-br="undo"${B.undo.length ? '' : ' disabled'}>↶ Undo last change${B.undo.length ? ` (${esc(B.undo[B.undo.length - 1].name)})` : ''}</button><span class="muted small">Every change is live on the next page load – no deploy. New features start at Owner.</span></div>`;
  }

  // ---------- ② health ----------
  function health() {
    const h = B.health;
    const head = '<div class="br-sec-h"><h3>🩺 Health</h3><button type="button" class="btn ghost sm" data-br="health">↻</button></div>';
    if (h === undefined) return head + ctx.UI.skeleton('rows', 3);
    if (h === null) return head + ctx.UI.empty({ icon: '🩺', title: 'Could not load health data', text: 'Try the ↻ button.' });
    const runs = h.actions?.runs || [];
    const built = document.querySelector('footer time[datetime]')?.getAttribute('datetime');
    const ago = (t) => (ctx.UI.ago ? ctx.UI.ago(t) : new Date(t).toLocaleString());
    const run = (re) => runs.find((r) => re.test(r.name));
    const upd = run(/update/i), pages = run(/pages/i), bot = run(/bot|worker/i);
    const st = (r) => (!r ? 'grey' : r.conclusion === 'success' ? 'ok' : r.conclusion === 'failure' ? 'bad' : r.status === 'in_progress' || r.status === 'queued' ? 'busy' : 'grey');
    const tile = (name, cls, sub, url) => `<div class="br-dot ${cls}"><i aria-hidden="true"></i><b>${esc(name)}</b><small>${esc(sub)}</small>${cls === 'bad' && url ? `<a class="btn ghost sm" href="${esc(url)}" target="_blank" rel="noopener">Retry</a>` : ''}</div>`;
    const age = built ? Date.now() - Date.parse(built) : null;
    const tiles = [
      tile('EA data', age === null ? 'grey' : age < 30 * 6e4 ? 'ok' : age < 3 * 36e5 ? 'busy' : 'bad', built ? `fetched ${ago(Date.parse(built))}` : 'unknown', upd?.url),
      tile('Site build', st(upd), upd ? `${esc(upd.conclusion || upd.status)} · ${ago(upd.at)}` : 'no runs found', upd?.url),
      tile('Pages', pages ? st(pages) : st(upd), pages ? `${pages.conclusion || pages.status} · ${ago(pages.at)}` : 'deploys with the build', (pages || upd)?.url),
      tile('Bot', B.ping !== null ? 'ok' : 'bad', B.ping !== null ? `OK · ${B.ping} ms` : 'not answering', bot?.url),
    ].join('');
    const a = h.analytics;
    const bar = (label, n, max, txt) => `<div class="br-use"><span>${esc(label)}</span><b>${esc(txt)}</b><span class="br-track"><i class="${n / max > 0.8 ? 'hot' : n / max > 0.5 ? 'warm' : ''}" style="width:${Math.min(100, (n / max) * 100).toFixed(1)}%"></i></span></div>`;
    const c = h.crawl;
    const crawl = c?.ready ? `<div class="br-sec-h br-sub"><h3>🧭 Club crawl</h3><span class="br-tag">P9.1</span></div>
<p class="small"><b>${c.indexed.toLocaleString()}</b> clubs indexed · cursor at ID <b>${c.cursor.toLocaleString()}</b> · <b>${c.perDay.toLocaleString()}</b> clubs/day${c.lastAt ? ` · last hit ${esc(ago(c.lastAt))}` : ''}</p>` : '';
    return `${head}<div class="br-dots">${tiles}</div>
${crawl}
<div class="br-sec-h br-sub"><h3>📦 Free-tier usage</h3><span class="br-tag">last 24 h</span></div>
${a?.ready ? `${bar('Worker requests', a.requests, FREE.requests, `${a.requests.toLocaleString()} / ${FREE.requests.toLocaleString()}`)}${bar('Worker errors', a.errors, Math.max(1, a.requests), `${a.errors.toLocaleString()}`)}<p class="muted small">CPU p50 ${esc(a.cpuP50)} ms · p99 ${esc(a.cpuP99)} ms</p>`
      : `<p class="muted small">⚠️ ${esc(a?.error || 'Cloudflare usage not available yet.')}</p>`}
<div class="br-use"><span>GitHub Actions minutes</span><b>unlimited (public repo)</b><span class="br-track"><i class="free" style="width:100%"></i></span></div>`;
  }

  // ---------- ③ announcement ----------
  function announce() {
    if (!ctx.canAnnounce) return '';
    const a = B.ann;
    return `<div class="br-sec-h"><h3>📣 Announcement</h3></div>
<input class="br-in" data-ann="title" maxlength="120" placeholder="Title – e.g. Match night moved" value="${esc(a.title)}">
<textarea class="br-in" data-ann="body" maxlength="1500" rows="3" placeholder="Wednesday 20:00 this week. Hit ✅ in your locker if you can make it.">${esc(a.body)}</textarea>
<div class="br-pills"><button type="button" class="chip${a.audience === 'members' ? ' on' : ''}" data-aud="members">Everyone</button><button type="button" class="chip${a.audience === 'managers' ? ' on' : ''}" data-aud="managers">Managers</button>
<button type="button" class="chip${a.ack ? ' on' : ''}" data-ack>${a.ack ? '☑' : '☐'} Must acknowledge</button></div>
<div class="br-preview" aria-label="Preview"><small>Preview · 🔔 alert${a.ack ? ' (stays until they tap “Got it”)' : ''} + Discord DM for members who chose DMs</small>
<div class="br-dm"><b>NOREX Bot</b><div class="br-embed"><b>📣 ${esc(a.title || 'Your title')}</b><p>${esc(a.body || 'Your message shows here.')}</p></div></div></div>
<button type="button" class="btn sm" data-br="announce"${a.title.trim().length < 3 ? ' disabled' : ''}>📣 Send to ${a.audience === 'managers' ? 'managers' : 'every member'}</button>`;
  }

  // ---------- ④ Hall of Fame induction ----------
  function hof() {
    if (!ctx.flagOn('hallOfFame')) return '';
    const squad = ctx.players().filter((p) => p.home).sort((a, b) => a.n.localeCompare(b.n));
    const pl = squad.find((p) => p.k === B.hof.player);
    return `<div class="br-sec-h"><h3>🏛️ Hall of Fame induction</h3><a class="br-more" href="${ctx.base}halloffame.html">See the hall →</a></div>
<div class="br-hof"><div class="br-stage${pl ? ' lit' : ''}"><span class="br-beam" aria-hidden="true"></span><div class="br-legend"><span>★</span><small>Legend</small><b>${pl ? esc(pl.n) : 'Choose a player'}</b>${pl?.s ? `<em>${pl.s.gp} games · ${pl.s.g}G ${pl.s.a}A</em>` : ''}</div><span class="br-plinth" aria-hidden="true"></span></div>
<div class="br-hof-form"><select class="br-in" data-hof="player"><option value="">Pick a player…</option>${squad.map((p) => `<option value="${esc(p.k)}"${p.k === B.hof.player ? ' selected' : ''}>${esc(p.n)}</option>`).join('')}</select>
<input class="br-in" data-hof="title" maxlength="80" placeholder="Plaque title – e.g. The engine room" value="${esc(B.hof.title)}">
<textarea class="br-in" data-hof="text" maxlength="400" rows="3" placeholder="Citation – why they’re a legend">${esc(B.hof.text)}</textarea>
<button type="button" class="btn sm" data-br="induct"${pl ? '' : ' disabled'}>🏛️ Induct a legend</button><p class="muted small">Their card rises onto the lit plinth on the public Hall of Fame.</p></div></div>`;
  }

  // ---------- ⑤ people + audit ----------
  function audit() {
    const all = ctx.admin()?.activity || [];
    const a = B.aud, q = a.q.trim().toLowerCase();
    const types = [...new Set(all.map((x) => x.type))].sort();
    const hit = all.filter((x) => (!a.type || x.type === a.type) && (!q || `${x.n || ''} ${ctx.actText(x.type)} ${x.detail || ''}`.toLowerCase().includes(q)));
    const acts = hit.slice(0, a.n);
    return `<div class="br-sec-h"><h3>🛡️ People and audit</h3></div><div id="br-requests"></div>
<div class="br-audit-f"><input type="search" class="br-in" data-aud-q placeholder="Search the log…" value="${esc(a.q)}" aria-label="Search the audit log"><select class="br-in" data-aud-type aria-label="Filter by type"><option value="">All types</option>${types.map((t) => `<option value="${esc(t)}"${t === a.type ? ' selected' : ''}>${esc(ctx.actIcon(t))} ${esc(ctx.actText(t))}</option>`).join('')}</select></div>
<ul class="br-audit">${acts.map((x) => `<li><span>${esc(ctx.actIcon(x.type))} <b>${esc(x.n)}</b> ${esc(ctx.actText(x.type))}${x.detail ? ` · ${esc(x.detail)}` : ''}</span><small>${esc(ctx.UI.ago ? ctx.UI.ago(x.at) : '')}</small></li>`).join('') || `<li class="muted small">${all.length ? 'No entries match.' : 'Nothing logged yet.'}</li>`}</ul>
${hit.length > acts.length ? `<button type="button" class="btn ghost sm" data-br="more">Show more (${hit.length - acts.length} left)</button>` : ''}<p class="muted small">Latest ${all.length} entries · ${hit.length} shown by the filter.</p>`;
  }

  function paint() {
    if (!el?.isConnected) return;
    const roles = (ctx.viewAs() || []).filter((r) => r !== 'owner');
    el.innerHTML = `<div class="br">
<div class="br-head"><h2>👑 Boardroom</h2><div class="br-as"><span class="muted small">Preview the site as</span>${roles.map((r) => `<a class="chip" href="${ctx.base}index.html?previewAs=${encodeURIComponent(r)}">${esc(r[0].toUpperCase() + r.slice(1))}</a>`).join('')}</div></div>
<div class="br-grid"><section class="card br-sec br-sw">${B.flags ? switchboard() : ctx.UI.skeleton('rows', 6)}</section>
<div class="br-side"><section class="card br-sec br-hl">${health()}</section>${ctx.canAnnounce ? `<section class="card br-sec br-an">${announce()}</section>` : ''}</div>
${ctx.flagOn('hallOfFame') ? `<section class="card br-sec br-hf">${hof()}</section>` : ''}<section class="card br-sec br-au">${audit()}</section></div></div>`;
    const rq = $('#br-requests', el);
    if (rq && ctx.flagOn('requests')) ctx.requests(rq);
  }
  const repaint = (sel, fn) => { const s = $(sel, el); if (s) s.innerHTML = fn(); else paint(); };

  async function setFlag(name, level, { undo = false } = {}) {
    const prev = B.flags[name];
    if (prev === level || B.busy) return;
    B.busy = true;
    B.flags = { ...B.flags, [name]: level };
    repaint('.br-sw', switchboard);
    try {
      B.flags = (await ctx.call('/api/admin/flags', { name, level })).flags;
      if (!undo) B.undo.push({ name, level: prev });
      ctx.onFlags(B.flags);
      ctx.toast(`${(LABEL[name] || [, name])[1]} → ${level}`);
    } catch (er) { B.flags = { ...B.flags, [name]: prev }; ctx.toast(er.message, true); }
    B.busy = false;
    repaint('.br-sw', switchboard);
  }
  async function resetFlag(name) {
    try { B.flags = (await ctx.call('/api/admin/flags/reset', { name })).flags; ctx.onFlags(B.flags); ctx.toast(`${name}: back to committed`); } catch (er) { ctx.toast(er.message, true); }
    repaint('.br-sw', switchboard);
  }
  async function loadHealth() {
    B.health = undefined; repaint('.br-hl', health);
    const t0 = performance.now();
    try { B.health = await ctx.call('/api/admin/health'); B.ping = Math.round(performance.now() - t0); } catch { B.health = null; B.ping = null; }
    repaint('.br-hl', health);
  }
  async function sendAnnouncement() {
    const a = B.ann;
    if (!(await ctx.UI.confirm({ title: 'Send announcement?', icon: '📣', text: `“${a.title}” goes to ${a.audience === 'managers' ? 'all managers' : 'every member'}${a.ack ? ' and must be acknowledged' : ''}.`, ok: 'Send' }))) return;
    try {
      const r = await ctx.call('/api/notify/announce', { title: a.title, body: a.body, audience: a.audience, ack: a.ack });
      ctx.toast(`📣 Sent to ${r.sent} member${r.sent === 1 ? '' : 's'}`);
      B.ann = { title: '', body: '', audience: 'members', ack: false };
      repaint('.br-an', announce);
    } catch (er) { ctx.toast(er.message, true); }
  }
  async function induct() {
    const pl = ctx.players().find((p) => p.k === B.hof.player);
    if (!pl || !(await ctx.UI.confirm({ title: `Induct ${pl.n}?`, icon: '🏛️', text: 'They go up on the public Hall of Fame straight away.', ok: 'Induct' }))) return;
    try {
      await ctx.call('/api/hof', { kind: 'legend', player: pl.k, title: B.hof.title, text: B.hof.text });
      const stage = $('.br-stage', el);
      stage?.classList.add('inducted');
      ctx.toast(`🏛️ ${pl.n} is in the Hall of Fame`);
      setTimeout(() => { B.hof = { player: '', title: '', text: '' }; repaint('.br-hf', hof); }, 1800);
    } catch (er) { ctx.toast(er.message, true); }
  }

  const rq = () => { const r = $('#br-requests', el); if (r && ctx.flagOn('requests')) ctx.requests(r); };
  function bind() {
    el.onclick = (ev) => {
      const t = ev.target.closest('button');
      if (!t || t.disabled) return;
      const d = t.dataset;
      if (d.flag) setFlag(d.flag, d.level);
      if (d.reset) resetFlag(d.reset);
      if (d.br === 'undo' && !B.busy) { const u = B.undo.pop(); if (u) setFlag(u.name, u.level, { undo: true }); }
      if (d.br === 'health') loadHealth();
      if (d.br === 'announce') sendAnnouncement();
      if (d.br === 'induct') induct();
      if (d.br === 'more') { B.aud.n += 20; repaint('.br-au', audit); rq(); }
      if (d.aud) { B.ann.audience = d.aud; repaint('.br-an', announce); }
      if (d.ack !== undefined) { B.ann.ack = !B.ann.ack; repaint('.br-an', announce); }
    };
    el.oninput = (ev) => {
      const t = ev.target, d = t.dataset;
      if (d.br === 'filter') { B.filter = t.value; const pos = t.selectionStart; repaint('.br-sw', switchboard); const f = $('[data-br="filter"]', el); f.focus(); f.setSelectionRange(pos, pos); }
      if (d.ann) {
        B.ann[d.ann] = t.value;
        const p = $('.br-embed', el); if (p) p.innerHTML = `<b>📣 ${esc(B.ann.title || 'Your title')}</b><p>${esc(B.ann.body || 'Your message shows here.')}</p>`;
        const send = $('[data-br="announce"]', el); if (send) send.disabled = B.ann.title.trim().length < 3;
      }
      if ('audQ' in d) { B.aud.q = t.value; B.aud.n = 8; const pos = t.selectionStart; repaint('.br-au', audit); rq(); const f = $('[data-aud-q]', el); f.focus(); f.setSelectionRange(pos, pos); }
      if (d.hof && d.hof !== 'player') B.hof[d.hof] = t.value;
    };
    el.onchange = (ev) => { if (ev.target.matches('[data-aud-type]')) { B.aud.type = ev.target.value; B.aud.n = 8; repaint('.br-au', audit); rq(); } if (ev.target.dataset.hof === 'player') { B.hof.player = ev.target.value; repaint('.br-hf', hof); } };
  }
  function mount(root, c) {
    el = root; ctx = c;
    B.flags = ctx.admin()?.flags || null;
    bind();
    paint();
    if (B.health === undefined || B.health === null) loadHealth();
  }
  window.NXBoardroom = { mount };
})();
