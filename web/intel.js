// Club Intelligence room (redesign board 13) – the staff view of bot/insights.js on existing routes only:
//   GET /api/intel (report + each to-do's acted state) · POST /api/intel/act { id, undo? } · POST /api/intel/remind { id }
// Overall ring + four gauges (Discord server, Site and members, Management, Team), a written summary, to-dos with
// "Done" and "Remind managers", a month-by-month skyline and per-area drill-downs. Flag `insights`; app.js mounts it as
// the Manager tab's 🧭 Intelligence sub-tab (managers and the owner).
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); // the report marks emphasis with **…**
  const AREAS = [['server', '💬', 'Discord server'], ['site', '🌐', 'Site and members'], ['admin', '🛡️', 'Management'], ['team', '⚽', 'Team']];
  const AREA_IC = { server: '💬', site: '🌐', admin: '🛡️', team: '⚽', setup: '🔧', good: '🌟' };
  const SEV = { 1: ['Urgent', 'bad'], 2: ['Important', 'warn'], 3: ['Nice to fix', 'meh'], 4: ['Good news', 'ok'] };
  const grade = (s) => (s >= 80 ? 4 : s >= 60 ? 3 : s >= 40 ? 2 : 1);
  const GRADE_TXT = { 4: 'In great shape', 3: 'Doing fine', 2: 'Needs attention', 1: 'Needs help now' };
  const METRICS = [['site', 'Site sign-ups'], ['joins', 'Discord joins'], ['decided', 'Decisions made'], ['resp', 'Response time (h)'], ['rush', 'Rush results'], ['trials', 'Trial cards']];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = (m) => MONTHS[Number(String(m).slice(5, 7)) - 1] || m;
  const num = (n) => (n == null ? '–' : Number(n).toLocaleString());

  let el = null, ctx = null;
  const I = { r: null, err: null, open: '', metric: 'site', filter: 'open', busy: '' };

  const delta = (now, was) => {
    if (was == null) return '';
    const d = now - was;
    return d === 0 ? '<em class="ix-d">±0</em>' : `<em class="ix-d ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}</em>`;
  };

  // ---------- ① overall ring + written summary ----------
  function ring() {
    const r = I.r, g = grade(r.overall), C = 2 * Math.PI * 52;
    return `<div class="ix-ring g${g}" role="img" aria-label="Overall score ${r.overall} out of 100"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ix-trk" cx="60" cy="60" r="52"/><circle class="ix-arc" cx="60" cy="60" r="52" style="--len:${C.toFixed(1)};--to:${(C * (1 - r.overall / 100)).toFixed(1)}" transform="rotate(-90 60 60)"/></svg>
<div class="ix-ring-n"><b>${r.overall}</b><small>of 100</small></div></div>`;
  }
  function summary() {
    const r = I.r, sc = r.scores, order = AREAS.map(([k, , n]) => [k, n, sc[k]]).sort((a, b) => b[2] - a[2]);
    const open = r.recs.filter((x) => x.sev <= 3 && !x.acted), urgent = open.filter((x) => x.sev === 1);
    const prevOverall = r.prev?.scores ? Math.round(Object.values(r.prev.scores).reduce((t, v) => t + v, 0) / 4) : null;
    const trend = prevOverall == null || prevOverall === r.overall ? '' : ` That is ${r.overall > prevOverall ? 'up' : 'down'} ${Math.abs(r.overall - prevOverall)} since the last report.`;
    return `${esc(r.guild || 'The club')} is <b>${esc(GRADE_TXT[grade(r.overall)].toLowerCase())}</b> at ${r.overall} out of 100.${trend} Strongest area: <b>${esc(order[0][1])}</b> (${order[0][2]}). Weakest: <b>${esc(order[3][1])}</b> (${order[3][2]}). ${open.length} to-do${open.length === 1 ? '' : 's'} still open${urgent.length ? ` (<b>${urgent.length} urgent</b>)` : ''}.`;
  }

  // ---------- ② four gauges ----------
  function gauges() {
    const r = I.r;
    return `<div class="ix-gauges">${AREAS.map(([k, ic, name]) => {
      const s = r.scores[k], g = grade(s), n = r.recs.filter((x) => x.area === k && x.sev <= 3 && !x.acted).length;
      return `<button type="button" class="ix-gauge g${g}${I.open === k ? ' on' : ''}" data-area="${k}" aria-expanded="${I.open === k}" title="${esc(GRADE_TXT[g])} – tap for the details">
<span class="ix-gi" aria-hidden="true">${ic}</span><b>${esc(name)}</b><span class="ix-gn">${s}${delta(s, r.prev?.scores?.[k])}</span>
<span class="ix-bar"><i style="width:${s}%"></i></span><small>${n ? `${n} to-do${n === 1 ? '' : 's'}` : 'all clear'}</small></button>`;
    }).join('')}</div>`;
  }

  // ---------- ③ to-dos ----------
  function todos() {
    const all = I.r.recs, doing = all.filter((x) => x.sev <= 3), good = all.filter((x) => x.sev === 4);
    const shown = doing.filter((x) => (I.filter === 'open' ? !x.acted : I.filter === 'done' ? x.acted : true) && (!I.open || x.area === I.open));
    const nOpen = doing.filter((x) => !x.acted).length, nDone = doing.length - nOpen;
    return `<div class="ix-h"><h3>🎯 What to do next</h3><span class="ix-chips" role="tablist">${[['open', `Open (${nOpen})`], ['done', `Done (${nDone})`], ['all', 'All']].map(([k, l]) => `<button type="button" class="chip${I.filter === k ? ' on' : ''}" data-filter="${k}">${l}</button>`).join('')}</span></div>
${I.open ? `<p class="muted small">Showing <b>${esc(AREAS.find((a) => a[0] === I.open)[2])}</b> only · <button type="button" class="ix-link" data-area="${I.open}">show everything</button></p>` : ''}
<ul class="ix-todos">${shown.map((x) => {
      const [sl, sc] = SEV[x.sev] || SEV[3];
      return `<li class="ix-todo ${sc}${x.acted ? ' done' : ''}"><span class="ix-sev" title="${sl}" aria-hidden="true"></span><span class="ix-ti" aria-hidden="true">${AREA_IC[x.area] || '•'}</span>
<div class="ix-tx"><p>${rich(x.text)}</p>${x.acted ? `<small class="muted">✅ Handled by ${esc(x.acted.by)} · ${esc(ctx.UI.ago(x.acted.at))}</small>` : `<small class="muted">${sl}</small>`}</div>
<div class="ix-tb">${x.acted ? `<button type="button" class="btn ghost sm" data-act="${esc(x.id)}" data-undo="1"${I.busy === x.id ? ' disabled' : ''}>↶ Undo</button>`
        : `<button type="button" class="btn sm" data-act="${esc(x.id)}"${I.busy === x.id ? ' disabled' : ''}>✅ Done</button><button type="button" class="btn ghost sm" data-remind="${esc(x.id)}"${I.busy === x.id ? ' disabled' : ''} title="Send this to the other managers">🔔 Remind managers</button>`}</div></li>`;
    }).join('') || `<li class="ix-empty">${ctx.UI.empty({ icon: I.filter === 'done' ? '📭' : '🎉', title: I.filter === 'done' ? 'Nothing marked done yet' : 'Nothing to do here', text: I.filter === 'done' ? 'Items you tick off show up here.' : 'The club is in good shape on this front.' })}</li>`}</ul>
${good.length && !I.open ? `<div class="ix-good">${good.map((x) => `<p>🌟 ${rich(x.text)}</p>`).join('')}</div>` : ''}`;
  }

  // ---------- ④ month-by-month skyline ----------
  function skyline() {
    const h = I.r.history || [], key = I.metric;
    const vals = h.map((m) => m[key]), max = Math.max(1, ...vals.map((v) => v ?? 0));
    const hasData = vals.some((v) => v != null);
    return `<div class="ix-h"><h3>🏙️ How we’ve run, month by month</h3><span class="ix-chips">${METRICS.map(([k, l]) => `<button type="button" class="chip${key === k ? ' on' : ''}" data-metric="${k}">${esc(l)}</button>`).join('')}</span></div>
${hasData ? `<div class="ix-sky" role="img" aria-label="${esc(METRICS.find((m) => m[0] === key)[1])} for the last ${h.length} months: ${vals.map((v, i) => `${monthName(h[i].m)} ${v ?? 'no data'}`).join(', ')}">${h.map((m, i) => {
      const v = vals[i];
      return `<div class="ix-col${i === h.length - 1 ? ' now' : ''}"><b>${v == null ? '–' : esc(key === 'resp' ? v + 'h' : v)}</b><span class="ix-tower"><i style="height:${v == null ? 0 : Math.max(3, (v / max) * 100)}%;--d:${i * 70}ms"></i></span><small>${esc(monthName(m.m))}</small></div>`;
    }).join('')}</div>` : ctx.UI.empty({ icon: '🏙️', title: 'No history for this yet', text: key === 'joins' ? 'Discord joins need the bot’s Server Members intent switched on.' : 'It fills in as members use the site.' })}`;
  }

  // ---------- ⑤ drill-downs ----------
  const tile = (label, value, sub = '') => `<div class="ix-tile"><b>${esc(value)}</b><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const list = (title, items, fmt = esc) => (items?.length ? `<div class="ix-list"><h4>${esc(title)}</h4><ul>${items.map((x) => `<li>${fmt(x)}</li>`).join('')}</ul></div>` : '');
  function drill() {
    const k = I.open;
    if (!k) return '';
    const r = I.r, d = r[k] || {}, [, ic, name] = AREAS.find((a) => a[0] === k);
    let body = '';
    if (k === 'server') {
      body = `<div class="ix-tiles">${tile('Members', num(d.humans), d.online != null ? `${num(d.online)} online` : '')}${tile('Joined in 30 days', num(d.joins30), d.joins7 != null ? `${d.joins7} this week` : 'needs Members intent')}${tile('Posting this week', num(d.posters7), `${num(d.posters30)} in 30 days`)}${tile('Messages this week', num(d.msgs7), `${num(d.msgs30)} in 30 days`)}${tile('Active channels', `${d.active}/${d.text}`, `${d.voice} voice`)}${tile('Staff posts this week', num(d.staff7), d.staff != null ? `${d.staff} staff` : '')}${tile('Boosts', num(d.boosts))}${tile('No role yet', num(d.noRole))}</div>`
        + list('Busiest channels this week', d.top, (c) => `#${esc(c.name)} · ${c.n} message${c.n === 1 ? '' : 's'}${c.full ? '' : '+'}`) + list('Silent for 30+ days', d.dead, (n) => `#${esc(n)}`) + list('Roles nobody has', d.unused) + list('Channels the bot can’t read', d.unread, (n) => `#${esc(n)}`);
    } else if (k === 'site') {
      body = `<div class="ix-tiles">${tile('Members on the site', `${d.adoption}%`, `${num(d.users)} logged in`)}${tile('Active this week', num(d.active7), `${num(d.active30)} in 30 days`)}${tile('New this month', num(d.new30))}${tile('Players claimed', `${d.squadClaimed}/${d.squad}`)}${tile('Set availability', num(d.availUsers), 'for the coming days')}${tile('MOTM votes per match', num(d.votesAvg))}${tile('Blocking bot DMs', num(d.dmOff))}</div>`
        + list('Most-played players not claimed yet', d.missing);
    } else if (k === 'admin') {
      body = `<div class="ix-tiles">${tile('Claims waiting', num(d.claims))}${tile('Requests waiting', num(d.requests))}${tile('Rush results waiting', num(d.rush))}${tile('Old trial cards', num(d.trials), '7+ days untouched')}${tile('Longest wait', `${d.oldest} d`)}${tile('Average decision time', d.resp == null ? '–' : `${d.resp} h`, `${num(d.decided)} decisions in 90 days`)}${tile('Managers deciding', num(d.deciders), d.decided ? `top one made ${d.topShare}%` : '')}${tile('Match nights next 7 days', num(d.upcoming))}${tile('Open trials', num(d.trialsOpen), `${num(d.signed)} signed`)}</div>`;
    } else {
      body = `<div class="ix-tiles">${tile('Record', `${d.w}-${d.d}-${d.l}`, `${num(d.gp)} played`)}${tile('Win rate', `${d.winPct}%`)}${tile('Goal difference per game', d.gdpg > 0 ? `+${d.gdpg}` : d.gdpg)}${tile('Last 5', d.form || '–')}${tile('Win streak', num(d.streak))}${tile('Regulars (3+ games)', num(d.regulars), 'of 11 spots')}${d.division != null ? tile('Division', d.division) : ''}${d.scorer ? tile('Top scorer', d.scorer.n, `${d.scorer.g} goals · ${d.scorer.share}% of ours`) : ''}</div>`;
    }
    return `<section class="card ix-sec ix-drill"><div class="ix-h"><h3>${ic} ${esc(name)} in detail</h3><button type="button" class="btn ghost sm" data-area="${k}">Close</button></div>${body}</section>`;
  }

  // ---------- page ----------
  function paint() {
    if (!el?.isConnected) return;
    const head = `<div class="ix-head"><h2>🧭 Club Intelligence</h2><span class="muted small">${I.r ? `Report from ${esc(ctx.UI.ago(I.r.at))} · refreshes every Monday and whenever someone runs /insights` : ''}</span><button type="button" class="btn ghost sm" data-ix="refresh"${I.busy === 'load' ? ' disabled' : ''}>${I.busy === 'load' ? '⏳ Reading the club…' : '↻ Refresh'}</button></div>`;
    if (!I.r) {
      el.innerHTML = `<div class="ix">${head}${I.err ? ctx.UI.empty({ icon: '🧭', title: 'Could not load the report', text: I.err }) : `<section class="card ix-sec">${ctx.UI.skeleton('rows', 5)}<p class="muted small">Reading the Discord server and the club data – the first report can take a few seconds.</p></section>`}</div>`;
      return;
    }
    el.innerHTML = `<div class="ix">${head}
<section class="card ix-sec ix-top">${ring()}<div class="ix-sum"><h3>${esc(GRADE_TXT[grade(I.r.overall)])}</h3><p>${summary()}</p></div></section>
${gauges()}${drill()}
<div class="ix-grid"><section class="card ix-sec ix-td">${todos()}</section><section class="card ix-sec ix-sk">${skyline()}</section></div></div>`;
  }

  async function load() {
    I.busy = 'load'; I.err = null; paint();
    try { I.r = await ctx.call('/api/intel'); } catch (er) { I.err = er.message; if (I.r) ctx.toast(er.message, true); }
    I.busy = '';
    paint();
  }
  async function act(id, undo) {
    I.busy = id; paint();
    try { I.r = await ctx.call('/api/intel/act', { id, undo: undo || undefined }); ctx.toast(undo ? '↶ Back on the list' : 'Marked as handled'); }
    catch (er) { ctx.toast(er.message, true); if (/no longer current/i.test(er.message)) load(); }
    I.busy = ''; paint();
  }
  async function remind(id) {
    const rec = I.r.recs.find((x) => x.id === id);
    if (!rec || !(await ctx.UI.confirm({ title: 'Remind the other managers?', icon: '🔔', text: 'They get a site alert (and a Discord DM if they have DMs on) with this to-do.', ok: 'Send reminder' }))) return;
    I.busy = id; paint();
    try { const r = await ctx.call('/api/intel/remind', { id }); ctx.toast(r.notified ? `🔔 Reminded ${r.notified} manager${r.notified === 1 ? '' : 's'}` : 'No other managers to remind'); }
    catch (er) { ctx.toast(er.message, true); }
    I.busy = ''; paint();
  }

  function bind() {
    el.onclick = (ev) => {
      const t = ev.target.closest('button');
      if (!t || t.disabled) return;
      const d = t.dataset;
      if (d.area) { I.open = I.open === d.area ? '' : d.area; paint(); if (I.open) $('.ix-drill', el)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }
      else if (d.filter) { I.filter = d.filter; paint(); }
      else if (d.metric) { I.metric = d.metric; paint(); }
      else if (d.act) act(d.act, !!d.undo);
      else if (d.remind) remind(d.remind);
      else if (d.ix === 'refresh') load();
    };
  }
  function mount(root, c) {
    el = root; ctx = c;
    bind();
    paint();
    load();
  }
  window.NXIntel = { mount };
})();
