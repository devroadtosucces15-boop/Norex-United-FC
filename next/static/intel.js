// Staff › Insights (Phase C5): Club Intelligence, the club's written notes and the burner tracker, on the live routes.
//   Intelligence – GET /api/intel, POST /api/intel/act {id, undo?}, POST /api/intel/remind {id}   (flag insights, managers)
//   Notes        – GET /api/insights?keys=…  (the stat insights members see; read-only here)
//   Burners      – GET /api/burners, GET /api/burners/search?q=, POST /api/burners/track {id,name,crest}, POST /api/burners/remove {id}
//                  (flag burners, managers). Burners are the B team: never League totals, records, awards or the Hall of Fame.
(() => {
  const d = document, root = d.getElementById('ixLive'); if (!root) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const call = (path, body) => (body ? A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) : A.call(path));
  const toast = (m, err) => M?.toast ? M.toast(m, err ? { kind: 'err' } : { kind: 'ok' }) : console.log(m);
  const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 90 ? 'just now' : s < 5400 ? Math.round(s / 60) + ' min ago' : s < 129600 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
  const act = async (fn) => { try { await fn(); } catch (er) { toast(er.message, true); } };
  const empty = (icon, title, text) => `<div class="panel sq-empty"><span>${icon}</span><div><b>${esc(title)}</b><p class="muted small">${esc(text || '')}</p></div></div>`;
  const skel = '<div class="dg-skel"><i></i></div>';
  const AREAS = [['server', '💬', 'Discord server'], ['site', '🌐', 'Site and members'], ['admin', '🛡️', 'Management'], ['team', '⚽', 'Team']];
  const AREA_IC = { server: '💬', site: '🌐', admin: '🛡️', team: '⚽', setup: '🔧', good: '🌟' };
  const SEV = { 1: ['Urgent', 'bad'], 2: ['Important', 'warn'], 3: ['Nice to fix', 'meh'], 4: ['Good news', 'ok'] };
  const grade = (s) => (s >= 80 ? 4 : s >= 60 ? 3 : s >= 40 ? 2 : 1);
  const GRADE_TXT = { 4: 'In great shape', 3: 'Doing fine', 2: 'Needs attention', 1: 'Needs help now' };
  const METRICS = [['site', 'Sign-ups'], ['joins', 'Discord joins'], ['decided', 'Decisions'], ['resp', 'Response (h)'], ['rush', 'Rush results'], ['trials', 'Trial cards']];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = (m) => MONTHS[Number(String(m).slice(5, 7)) - 1] || m;
  const num = (n) => (n == null ? '–' : Number(n).toLocaleString());
  const NOTE_KEYS = [['club', '📈 Club form'], ['matches.last5', '🔟 Last five'], ['club.records', '🏆 Records'], ['leaders.goals', '⚽ Scoring race'], ['leaders.rating', '⭐ Ratings race'], ['leaders.assists', '🅰️ Assists race'], ['leaders.motm', '🏅 MOTM race']];

  const S = { tab: 'intel', card: 'health', r: null, err: {}, open: '', metric: 'site', filter: 'open', busy: '', notes: undefined,
    bn: { list: undefined, q: '', res: null, sug: undefined, busy: '' } };

  // ---------- ① Club Intelligence: three cards ----------
  function healthCard() {
    const r = S.r, g = grade(r.overall), C = 2 * Math.PI * 52;
    const order = AREAS.map(([k, , n]) => [k, n, r.scores[k]]).sort((a, b) => b[2] - a[2]);
    const open = r.recs.filter((x) => x.sev <= 3 && !x.acted), urgent = open.filter((x) => x.sev === 1);
    return `<div class="ix-top"><div class="ix-ring g${g}" role="img" aria-label="Overall score ${r.overall} out of 100"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ix-trk" cx="60" cy="60" r="52"/><circle class="ix-arc" cx="60" cy="60" r="52" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - r.overall / 100)).toFixed(1)}" transform="rotate(-90 60 60)"/></svg><div class="ix-ring-n"><b>${r.overall}</b><small>of 100</small></div></div>
<div class="ix-sum"><h3>${esc(GRADE_TXT[g])}</h3><p>${esc(r.guild || 'The club')} scores <b>${r.overall}</b>. Strongest: <b>${esc(order[0][1])}</b> (${order[0][2]}). Weakest: <b>${esc(order[3][1])}</b> (${order[3][2]}). ${open.length} to-do${open.length === 1 ? '' : 's'} open${urgent.length ? `, <b>${urgent.length} urgent</b>` : ''}.</p></div></div>
<div class="ix-gauges">${AREAS.map(([k, ic, name]) => { const s = r.scores[k], gg = grade(s), n = r.recs.filter((x) => x.area === k && x.sev <= 3 && !x.acted).length;
      return `<button type="button" class="ix-gauge g${gg}${S.open === k ? ' on' : ''}" data-area="${k}" aria-expanded="${S.open === k}"><span aria-hidden="true">${ic}</span><b>${esc(name)}</b><span class="ix-gn">${s}</span><span class="ix-bar"><i style="width:${s}%"></i></span><small>${n ? `${n} to-do${n === 1 ? '' : 's'}` : 'all clear'}</small></button>`; }).join('')}</div>${drill()}`;
  }
  const tile = (label, value, sub = '') => `<div class="ix-tile"><b>${esc(value)}</b><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const list = (title, items, fmt = esc) => (items?.length ? `<div class="ix-list"><h4>${esc(title)}</h4><ul>${items.map((x) => `<li>${fmt(x)}</li>`).join('')}</ul></div>` : '');
  function drill() {
    const k = S.open; if (!k) return '';
    const dd = S.r[k] || {}, [, ic, name] = AREAS.find((a) => a[0] === k); let body = '';
    if (k === 'server') body = `<div class="ix-tiles">${tile('Members', num(dd.humans), dd.online != null ? `${num(dd.online)} online` : '')}${tile('Joined in 30 days', num(dd.joins30), dd.joins7 != null ? `${dd.joins7} this week` : 'needs Members intent')}${tile('Posting this week', num(dd.posters7), `${num(dd.posters30)} in 30 days`)}${tile('Messages this week', num(dd.msgs7), `${num(dd.msgs30)} in 30 days`)}${tile('Active channels', `${dd.active}/${dd.text}`, `${dd.voice} voice`)}${tile('No role yet', num(dd.noRole))}</div>${list('Busiest channels this week', dd.top, (c) => `#${esc(c.name)} · ${c.n} message${c.n === 1 ? '' : 's'}`)}${list('Silent for 30+ days', dd.dead, (n) => `#${esc(n)}`)}`;
    else if (k === 'site') body = `<div class="ix-tiles">${tile('On the site', `${dd.adoption}%`, `${num(dd.users)} logged in`)}${tile('Active this week', num(dd.active7), `${num(dd.active30)} in 30 days`)}${tile('New this month', num(dd.new30))}${tile('Players claimed', `${dd.squadClaimed}/${dd.squad}`)}${tile('Blocking bot DMs', num(dd.dmOff))}</div>${list('Most-played players not claimed yet', dd.missing)}`;
    else if (k === 'admin') body = `<div class="ix-tiles">${tile('Claims waiting', num(dd.claims))}${tile('Requests waiting', num(dd.requests))}${tile('Rush results waiting', num(dd.rush))}${tile('Old trial cards', num(dd.trials), '7+ days untouched')}${tile('Longest wait', `${dd.oldest} d`)}${tile('Avg decision time', dd.resp == null ? '–' : `${dd.resp} h`)}</div>`;
    else body = `<div class="ix-tiles">${tile('Record', `${dd.w}-${dd.d}-${dd.l}`, `${num(dd.gp)} played`)}${tile('Win rate', `${dd.winPct}%`)}${tile('Goal diff per game', dd.gdpg > 0 ? `+${dd.gdpg}` : dd.gdpg)}${tile('Last 5', dd.form || '–')}${tile('Regulars (3+ games)', num(dd.regulars), 'of 11 spots')}${dd.scorer ? tile('Top scorer', dd.scorer.n, `${dd.scorer.g} goals`) : ''}</div>`;
    return `<div class="ix-drill"><div class="ix-h"><h4>${ic} ${esc(name)} in detail</h4><button type="button" class="chip" data-area="${k}">Close</button></div>${body}</div>`;
  }
  function todoCard() {
    const all = S.r.recs, doing = all.filter((x) => x.sev <= 3), good = all.filter((x) => x.sev === 4);
    const shown = doing.filter((x) => (S.filter === 'open' ? !x.acted : S.filter === 'done' ? x.acted : true) && (!S.open || x.area === S.open));
    const nOpen = doing.filter((x) => !x.acted).length, nDone = doing.length - nOpen;
    return `<div class="chips">${[['open', `Open (${nOpen})`], ['done', `Done (${nDone})`], ['all', 'All']].map(([k, l]) => `<button type="button" class="chip${S.filter === k ? ' on' : ''}" data-filter="${k}">${l}</button>`).join('')}</div>
${S.open ? `<p class="muted small">Showing <b>${esc(AREAS.find((a) => a[0] === S.open)[2])}</b> only · <button type="button" class="ix-link" data-area="${S.open}">show everything</button></p>` : ''}
<ul class="ix-todos">${shown.map((x) => { const [sl, sc] = SEV[x.sev] || SEV[3];
      return `<li class="ix-todo ${sc}${x.acted ? ' done' : ''}"><span class="ix-sev" aria-hidden="true"></span><div class="ix-tx"><p>${AREA_IC[x.area] || '•'} ${rich(x.text)}</p>${x.acted ? `<small class="muted">✅ Handled by ${esc(x.acted.by)} · ${esc(ago(x.acted.at))}</small>` : `<small class="muted">${sl}</small>`}</div>
<div class="ix-tb">${x.acted ? `<button type="button" class="chip" data-act="${esc(x.id)}" data-undo="1"${S.busy === x.id ? ' disabled' : ''}>↶ Undo</button>` : `<button type="button" class="btn" data-act="${esc(x.id)}"${S.busy === x.id ? ' disabled' : ''}>✅ Done</button><button type="button" class="chip" data-remind="${esc(x.id)}"${S.busy === x.id ? ' disabled' : ''}>🔔 Remind managers</button>`}</div></li>`; }).join('') || `<li>${empty(S.filter === 'done' ? '📭' : '🎉', S.filter === 'done' ? 'Nothing marked done yet' : 'Nothing to do here', S.filter === 'done' ? 'Items you tick off show up here.' : 'The club is in good shape on this front.')}</li>`}</ul>
${good.length && !S.open ? `<div class="ix-good">${good.map((x) => `<p>🌟 ${rich(x.text)}</p>`).join('')}</div>` : ''}`;
  }
  function historyCard() {
    const h = S.r.history || [], key = S.metric, vals = h.map((m) => m[key]), max = Math.max(1, ...vals.map((v) => v ?? 0));
    return `<div class="chips">${METRICS.map(([k, l]) => `<button type="button" class="chip${key === k ? ' on' : ''}" data-metric="${k}">${esc(l)}</button>`).join('')}</div>
${vals.some((v) => v != null) ? `<div class="ix-sky" role="img" aria-label="${esc(METRICS.find((m) => m[0] === key)[1])}: ${vals.map((v, i) => `${monthName(h[i].m)} ${v ?? 'no data'}`).join(', ')}">${h.map((m, i) => { const v = vals[i];
      return `<div class="ix-col${i === h.length - 1 ? ' now' : ''}"><b>${v == null ? '–' : esc(key === 'resp' ? v + 'h' : v)}</b><span class="ix-tower"><i style="height:${v == null ? 0 : Math.max(3, (v / max) * 100)}%"></i></span><small>${esc(monthName(m.m))}</small></div>`; }).join('')}</div>` : empty('🏙️', 'No history for this yet', key === 'joins' ? 'Discord joins need the bot’s Server Members intent switched on.' : 'It fills in as members use the site.')}`;
  }
  function intel() {
    if (!S.r) return S.err.intel ? `${empty('🧭', 'Could not load the report', S.err.intel)}<p><button type="button" class="chip" data-ix="refresh">↻ Try again</button></p>` : `${skel}<p class="muted small">Reading the Discord server and the club data – the first report can take a few seconds.</p>`;
    const cards = [['health', '🩺 Health', healthCard], ['todo', '🎯 To do', todoCard], ['history', '🏙️ Month by month', historyCard]];
    return `<div class="ix-head"><span class="muted small">Report from ${esc(ago(S.r.at))} · refreshes every Monday and whenever someone runs /insights</span><button type="button" class="chip" data-ix="refresh"${S.busy === 'load' ? ' disabled' : ''}>${S.busy === 'load' ? '⏳ Reading the club…' : '↻ Refresh'}</button></div>
<div class="chips ix-pick" role="tablist" aria-label="Report cards">${cards.map(([k, n]) => `<button type="button" role="tab" aria-selected="${S.card === k}" class="chip${S.card === k ? ' on' : ''}" data-card="${k}">${n}</button>`).join('')}</div>
<div class="ix-cards">${cards.map(([k, n, f]) => `<section class="panel ix-card${S.card === k ? ' on' : ''}" aria-label="${esc(n)}"><h3>${n}</h3>${f()}</section>`).join('')}</div>`;
  }
  async function loadIntel() {
    S.busy = 'load'; S.err.intel = ''; paint();
    try { S.r = await call('/api/intel'); } catch (er) { S.err.intel = er.message; if (S.r) toast(er.message, true); }
    S.busy = ''; paint();
  }

  // ---------- ② club notes ----------
  function notes() {
    if (S.notes === undefined) return skel;
    if (S.notes === null) return empty('📝', 'Could not load the notes', S.err.notes || 'Stat insights may be switched off.');
    const idx = (k) => { const i = NOTE_KEYS.findIndex((x) => x[0] === k); return i < 0 ? 99 : i; };
    const rows = [...S.notes].sort((a, b) => idx(a.key) - idx(b.key));
    return `<p class="muted small">These are the short written notes members see on the club, match and leaderboard pages. Each one is built only from the stored stats.</p>${rows.length ? `<div class="grid g2">${rows.map((n) => { const lab = NOTE_KEYS.find((x) => x[0] === n.key)?.[1] || (n.key.startsWith('player.') ? '🧑‍🎤 Player' : '✨ Insight');
      return `<article class="panel ix-note"><small class="muted">${lab}</small><p class="ix-head2">${esc(n.headline)}</p><p>${esc(n.body)}</p>${n.watch ? `<p class="small">👀 ${esc(n.watch)}</p>` : ''}</article>`; }).join('')}</div>` : empty('📭', 'No notes written yet', 'They appear once the stats have been collected.')}`;
  }
  async function loadNotes() {
    if (S.notes !== undefined) return;
    try { S.notes = (await call('/api/insights?keys=' + NOTE_KEYS.map((k) => encodeURIComponent(k[0])).join(','))).insights || []; } catch (er) { S.notes = null; S.err.notes = er.message; }
    if (S.tab === 'notes') paint();
  }

  // ---------- ③ burners ----------
  const form = (f) => (f || []).map((x) => `<i class="bn-f ${x === 'W' ? 'w' : x === 'L' ? 'l' : 'd'}" title="${esc(x)}"></i>`).join('');
  const crest = (c) => (c ? `<img class="bn-cr" src="${esc(API)}/crest/${esc(c)}.png" alt="" loading="lazy" width="36" height="36">` : '<span class="bn-cr bn-no">🔥</span>');
  function burners() {
    const B = S.bn, l = B.list;
    const row = (c) => `<li class="bn-row">${crest(c.crest)}<span class="bn-t"><b>${esc(c.name)}</b><small>${esc(c.note || '')} · <code>${esc(c.id)}</code></small></span>${c.tracked ? '<span class="chip on">✅ Tracked</span>' : `<button type="button" class="btn" data-track="${esc(c.id)}" data-name="${esc(c.name)}" data-crest="${esc(c.crest || '')}"${B.busy === c.id ? ' disabled' : ''}>🔥 Track</button>`}</li>`;
    const results = B.res === 'busy' ? skel : B.res === 'err' ? empty('⚠️', 'Search failed', S.err.bn) : B.res ? (B.res.length ? `<ul class="bn-list">${B.res.map(row).join('')}</ul>` : empty('🔍', 'No club found', 'Names match clubs NOREX has played. For any other club paste its club ID.')) : '';
    const sug = B.sug === undefined ? skel : B.sug === null ? '' : [['linked', '🔗 Clubs our players are also in'], ['recent', '🕘 Clubs NOREX faced lately']].map(([k, t]) => (B.sug[k]?.length ? `<h4 class="dk-h">${t}</h4><ul class="bn-list">${B.sug[k].slice(0, 8).map(row).join('')}</ul>` : '')).join('');
    return `<div class="panel ix-note"><b>🔥 Burners are the B team</b><p class="muted small">Fun clubs run by the same players. They are never official: they stay out of League totals, records, awards and the Hall of Fame. Each burner has its own page; the NOREX combined view is an opt-in “what if” only.</p></div>
<h4 class="dk-h">Tracked${l ? ` · ${l.clubs.length}/${l.max}` : ''}</h4>
${l === undefined ? skel : l === null ? empty('⚠️', 'Could not load the burner clubs', S.err.bn) : l.clubs.length ? `<div class="grid g2">${l.clubs.map((c) => `<article class="panel bn-card">${crest(c.crest)}<div class="bn-t"><b>${esc(c.name)}</b><small><code>${esc(c.id)}</code> · added ${esc(ago(c.at))}${c.by ? ` by ${esc(c.by)}` : ''}</small><span class="bn-rec">${c.stats ? `${c.stats.w}W ${c.stats.d}D ${c.stats.l}L · ${c.stats.gf}–${c.stats.ga} ${form(c.stats.form)}` : '⏳ first collection pending (next site update)'}</span></div><button type="button" class="chip danger" data-untrack="${esc(c.id)}" data-name="${esc(c.name)}">Stop tracking</button></article>`).join('')}</div>` : empty('🔥', 'No burner clubs tracked yet', 'Find one below when someone makes a new club.')}
<h4 class="dk-h">Find a club</h4>
<form class="bn-search" data-form="bn"><input class="br-in" name="q" maxlength="40" placeholder="Club name or club ID" value="${esc(B.q)}" aria-label="Club name or ID" enterkeyhint="search"><button class="btn" type="submit">🔍 Search</button></form>
${results}${sug}`;
  }
  async function loadBurners() {
    try { S.bn.list = await call('/api/burners'); } catch (er) { S.bn.list = null; S.err.bn = er.message; }
    if (S.tab === 'burners') paint();
    if (S.bn.sug === undefined && S.bn.list) { try { S.bn.sug = await call('/api/burners/search'); } catch { S.bn.sug = null; } if (S.tab === 'burners') paint(); }
  }

  // ---------- frame ----------
  const TABS = [['intel', '🧭 Intelligence'], ['notes', '📝 Club notes'], ['burners', '🔥 Burners']];
  function paint() {
    if (!root.isConnected) return;
    const keep = d.activeElement?.matches?.('input[name="q"]');
    root.innerHTML = `<div class="chips dk-tabs">${TABS.map(([k, n]) => `<button class="chip${S.tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div><div class="dk-pane">${{ intel, notes, burners }[S.tab]()}</div>`;
    if (keep) { const i = root.querySelector('input[name="q"]'); if (i) { i.focus(); const n = i.value.length; i.setSelectionRange(n, n); } }
  }
  const openTab = (k) => { S.tab = k; paint(); if (k === 'notes') loadNotes(); if (k === 'burners' && S.bn.list === undefined) loadBurners(); };

  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('button'); if (!t || t.disabled) return; const k = t.dataset;
    if (k.tab) openTab(k.tab);
    else if (k.card) { S.card = k.card; paint(); }
    else if (k.area) { S.open = S.open === k.area ? '' : k.area; paint(); }
    else if (k.filter) { S.filter = k.filter; paint(); }
    else if (k.metric) { S.metric = k.metric; paint(); }
    else if ('ix' in k) loadIntel();
    else if (k.act) act(async () => {
      S.busy = k.act; paint();
      try { S.r = await call('/api/intel/act', { id: k.act, undo: k.undo ? true : undefined }); toast(k.undo ? '↶ Back on the list' : 'Marked as handled'); }
      catch (er) { toast(er.message, true); if (/no longer current/i.test(er.message)) loadIntel(); }
      finally { S.busy = ''; paint(); }
    });
    else if (k.remind) act(async () => {
      if (!confirm('Remind the other managers about this to-do?\n\nThey get a site alert (and a Discord DM if they have DMs on).')) return;
      S.busy = k.remind; paint();
      try { const r = await call('/api/intel/remind', { id: k.remind }); toast(r.notified ? `🔔 Reminded ${r.notified} manager${r.notified === 1 ? '' : 's'}` : 'No other managers to remind'); }
      finally { S.busy = ''; paint(); }
    });
    else if (k.track) act(async () => {
      if (!confirm(`Track “${k.name}” as a burner club?\n\nThe next site update collects its squad and matches, and every new game gets a stats report in Discord. It never counts towards League totals, records or awards.`)) return;
      S.bn.busy = k.track; paint();
      try { const r = await call('/api/burners/track', { id: k.track, name: k.name, crest: k.crest || undefined }); toast(r.already ? 'Already tracking that club' : '🔥 Now tracking – first stats in a couple of minutes'); S.bn.res = null; S.bn.q = ''; S.bn.sug = undefined; S.bn.list = await call('/api/burners'); S.bn.sug = await call('/api/burners/search').catch(() => null); }
      finally { S.bn.busy = ''; paint(); }
    });
    else if (k.untrack) act(async () => {
      if (!confirm(`Stop tracking “${k.name}”?\n\nIts history stays on file and you can track it again later.`)) return;
      await call('/api/burners/remove', { id: k.untrack }); toast('Stopped tracking'); S.bn.list = await call('/api/burners'); S.bn.sug = await call('/api/burners/search').catch(() => null); paint();
    });
  });
  root.addEventListener('input', (ev) => { if (ev.target.name === 'q') S.bn.q = ev.target.value; });
  root.addEventListener('submit', (ev) => {
    ev.preventDefault(); if (!ev.target.closest('[data-form="bn"]')) return;
    act(async () => {
      const q = S.bn.q.trim(); if (q.length < 2) { toast('Type at least 2 letters or paste a club ID.', true); return; }
      S.bn.res = 'busy'; paint();
      try { S.bn.res = (await call('/api/burners/search?q=' + encodeURIComponent(q))).results || []; } catch (er) { S.bn.res = 'err'; S.err.bn = er.message; }
      paint();
    });
  });

  (async () => {
    await A.ready?.catch?.(() => {});
    if (!['owner', 'manager'].includes(A.role)) return;
    d.getElementById('ixLocal')?.setAttribute('hidden', ''); root.hidden = false; paint(); loadIntel();
  })();
})();
