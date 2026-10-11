// Staff › Boardroom (Phase C4): the owner's room on the live routes.
//   Switches  – GET /api/admin/overview (flags, canEditFlags), POST /api/admin/flags {name, level}, /api/admin/flags/reset {name}
//   Health    – GET /api/admin/health (Cloudflare analytics + GitHub Actions + club crawl)
//   Audit     – activity from /api/admin/overview, GET /api/admin/submissions?type=, GET /api/admin/reports
//   Announce  – POST /api/notify/announce (preview + confirm), Discord post of a club doc: GET /api/events/discord,
//               GET /api/docs, POST /api/docs/discord {id, preview} then {id, channel, role}
//   Hall of Fame – GET /api/hof, POST /api/hof {kind, player|name, title, text, date}, POST /api/hof/remove {id}
// Backups: the live Boardroom has none (data lives in D1 / the git archive), so there is no tab for them.
(() => {
  const d = document, root = d.getElementById('brLive'); if (!root) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const call = (path, body) => (body ? A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) : A.call(path));
  const toast = (m, err) => M?.toast ? M.toast(m, err ? { kind: 'err' } : { kind: 'ok' }) : console.log(m);
  const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - (t > 1e12 ? t : Date.parse(t))) / 1000)); return s < 90 ? 'just now' : s < 5400 ? Math.round(s / 60) + ' min ago' : s < 129600 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
  let committed = {}; try { committed = JSON.parse(root.dataset.committed || '{}'); } catch {}
  const LEVELS = ['off', 'owner', 'managers', 'members', 'public'];
  const LVL_HELP = { off: 'Nobody', owner: 'Owner only', managers: 'Managers and owner', members: 'All signed-in members', public: 'Everyone, even guests' };
  const GROUPS = [
    ['🗓️ Match nights', ['events', 'matchNight', 'discordRsvp', 'rushLog', 'lockerRoom', 'locker', 'dugout']],
    ['👤 Players and stats', ['myStats', 'badges', 'profiles', 'leaders', 'hallOfFame', 'scouting', 'trials', 'statInsights', 'insightWidget', 'insights']],
    ['🛠️ Builds and tactics', ['builder', 'proBuilds', 'tactics', 'gameRules', 'playStyle']],
    ['💬 Community', ['notifications', 'push', 'suggestions', 'docs', 'requests', 'hub', 'hubLive', 'awards', 'predictions']],
    ['👑 Staff and Discord', ['boardroom', 'managerNotes', 'roleSync', 'discordMatch', 'platformLink', 'liveBanner', 'burners']],
  ];
  const FREE = { requests: 100000 };
  const S = { tab: 'switches', flags: null, canEdit: false, activity: null, health: undefined, ping: null, filter: '', undo: [], busy: false,
    aud: { sub: 'log', q: '', type: '', n: 12, subs: {}, subType: 'feedback', reports: null }, err: {},
    ann: { title: '', body: '', audience: 'all', ack: false, preview: false }, docs: null, targets: undefined, dc: { doc: '', channel: '', role: '', preview: null },
    hof: null, hofForm: { kind: 'legend', player: '', name: '', title: '', text: '' } };
  const empty = (icon, title, text) => `<div class="panel sq-empty"><span>${icon}</span><div><b>${esc(title)}</b><p class="muted small">${esc(text || '')}</p></div></div>`;
  const skel = '<div class="dg-skel"><i></i></div>';
  const act = async (fn) => { try { await fn(); } catch (er) { toast(er.message, true); } };
  const nice = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

  // ---------- ① switches ----------
  function switches() {
    if (!S.flags) return S.err.flags ? empty('⚠️', 'Could not load the switches', S.err.flags) : skel;
    const q = S.filter.toLowerCase(), all = Object.keys(S.flags), used = new Set();
    const groups = GROUPS.map(([t, ks]) => [t, ks.filter((k) => all.includes(k))]);
    groups.forEach(([, ks]) => ks.forEach((k) => used.add(k)));
    const rest = all.filter((k) => !used.has(k)); if (rest.length) groups.push(['⚙️ Everything else', rest]);
    const row = (k) => {
      const v = S.flags[k], over = committed[k] !== undefined && committed[k] !== v;
      return `<div class="br-flag"><span class="br-name"><b>${esc(nice(k))}</b><code>${esc(k)}</code>${over ? `<span class="br-over">live override · committed: ${esc(committed[k])}</span>` : ''}</span>
<span class="br-seg" role="radiogroup" aria-label="${esc(k)}">${LEVELS.map((l) => `<button type="button" role="radio" aria-checked="${l === v}" class="${l === v ? 'on' : ''}" title="${esc(LVL_HELP[l])}" data-flag="${esc(k)}" data-level="${l}"${S.canEdit ? '' : ' disabled'}>${l[0].toUpperCase() + l.slice(1)}</button>`).join('')}</span>
${over && S.canEdit ? `<button type="button" class="chip" data-reset="${esc(k)}">↺ Back to committed</button>` : ''}</div>`;
    };
    const html = groups.map(([t, ks]) => { const hit = ks.filter((k) => !q || k.toLowerCase().includes(q) || nice(k).toLowerCase().includes(q)); return hit.length ? `<h4 class="dk-h">${esc(t)}</h4><div class="br-flags">${hit.map(row).join('')}</div>` : ''; }).join('');
    const nOver = all.filter((k) => committed[k] !== undefined && committed[k] !== S.flags[k]).length;
    return `<div class="br-bar"><input type="search" class="br-in" data-filter placeholder="Find a feature…" value="${esc(S.filter)}" aria-label="Find a feature"><span class="muted small">${all.length} switches · ${nOver} live override${nOver === 1 ? '' : 's'}</span><button type="button" class="chip" data-undo${S.undo.length ? '' : ' disabled'}>↶ Undo${S.undo.length ? ` (${esc(S.undo[S.undo.length - 1].name)})` : ''}</button></div>
${S.canEdit ? '' : '<p class="muted small">Only the owner can change switches; you can see them.</p>'}
${html || '<p class="muted small">No switch matches.</p>'}
<p class="muted small">A change is live on the next page load, with no deploy. “Committed” is the level saved in the club config. New features start at Owner.</p>`;
  }
  async function setFlag(name, level, undo) {
    const prev = S.flags[name]; if (prev === level || S.busy) return;
    if (!confirm(`Change “${nice(name)}” from ${prev} to ${level}?\n\n${LVL_HELP[level]} will see it on the live site.`)) return;
    S.busy = true;
    try { S.flags = (await call('/api/admin/flags', { name, level })).flags; if (!undo) S.undo.push({ name, level: prev }); toast(`${nice(name)} → ${level}`); } finally { S.busy = false; paint(); }
  }

  // ---------- ② health ----------
  function health() {
    const h = S.health;
    if (h === undefined) return skel;
    if (h === null) return empty('🩺', 'Could not load health data', S.err.health || 'Try the refresh button.');
    const runs = h.actions?.runs || [], run = (re) => runs.find((r) => re.test(r.name));
    const upd = run(/update/i), pages = run(/pages/i), bot = run(/bot|worker/i);
    const st = (r) => (!r ? 'grey' : r.conclusion === 'success' ? 'ok' : r.conclusion === 'failure' ? 'bad' : ['in_progress', 'queued'].includes(r.status) ? 'busy' : 'grey');
    const tile = (name, cls, sub, url) => `<div class="br-dot ${cls}"><i aria-hidden="true"></i><b>${esc(name)}</b><small>${esc(sub)}</small>${cls === 'bad' && url ? `<a class="chip" href="${esc(url)}" target="_blank" rel="noopener">Open run</a>` : ''}</div>`;
    const built = window.NOREX?.updated || d.querySelector('footer time[datetime]')?.getAttribute('datetime');
    const age = built ? Date.now() - Date.parse(built) : null;
    const tiles = [
      tile('EA data', age === null ? 'grey' : age < 30 * 6e4 ? 'ok' : age < 3 * 36e5 ? 'busy' : 'bad', built ? `fetched ${ago(built)}` : 'unknown', upd?.url),
      tile('Site build', st(upd), upd ? `${upd.conclusion || upd.status} · ${ago(upd.at)}` : (h.actions?.ready === false ? h.actions.error : 'no runs found'), upd?.url),
      tile('Pages', pages ? st(pages) : st(upd), pages ? `${pages.conclusion || pages.status} · ${ago(pages.at)}` : 'deploys with the build', (pages || upd)?.url),
      tile('Bot', S.ping !== null ? 'ok' : 'bad', S.ping !== null ? `answering · ${S.ping} ms` : 'not answering', bot?.url),
    ].join('');
    const a = h.analytics, c = h.crawl;
    const bar = (label, n, max, txt) => `<div class="br-use"><span>${esc(label)}</span><b>${esc(txt)}</b><span class="br-track"><i class="${n / max > 0.8 ? 'hot' : n / max > 0.5 ? 'warm' : ''}" style="width:${Math.min(100, (n / max) * 100).toFixed(1)}%"></i></span></div>`;
    return `<div class="br-dots">${tiles}</div>
<h4 class="dk-h">📦 Free-tier usage · last 24 h</h4>
${a?.ready ? `${bar('Worker requests', a.requests, FREE.requests, `${a.requests.toLocaleString()} / ${FREE.requests.toLocaleString()}`)}${bar('Worker errors', a.errors, Math.max(1, a.requests), a.errors.toLocaleString())}<p class="muted small">CPU p50 ${esc(a.cpuP50)} ms · p99 ${esc(a.cpuP99)} ms · ${esc(a.subrequests?.toLocaleString?.() ?? a.subrequests)} sub-requests</p>`
      : `<p class="muted small">⚠️ ${esc(a?.error || 'Cloudflare usage is not available yet.')}</p>`}
<div class="br-use"><span>GitHub Actions minutes</span><b>unlimited (public repo)</b><span class="br-track"><i class="free" style="width:100%"></i></span></div>
${c?.ready ? `<h4 class="dk-h">🧭 Club crawl</h4><p class="small"><b>${c.indexed.toLocaleString()}</b> clubs indexed · cursor at ID <b>${c.cursor.toLocaleString()}</b> · <b>${c.perDay.toLocaleString()}</b> per day${c.lastAt ? ` · last hit ${esc(ago(c.lastAt))}` : ''}</p>` : ''}
${runs.length ? `<h4 class="dk-h">Recent runs</h4><ul class="dk-log">${runs.slice(0, 6).map((r) => `<li><span>${r.conclusion === 'success' ? '✅' : r.conclusion === 'failure' ? '❌' : '⏳'} <b>${esc(r.name)}</b></span><small>${esc(r.conclusion || r.status)} · ${esc(ago(r.at))}</small></li>`).join('')}</ul>` : ''}`;
  }
  async function loadHealth() {
    S.health = undefined; if (S.tab === 'health') paint();
    const t0 = performance.now();
    try { S.health = await call('/api/admin/health'); S.ping = Math.round(performance.now() - t0); S.err.health = ''; } catch (er) { S.health = null; S.ping = null; S.err.health = er.message; }
    if (S.tab === 'health') paint();
  }

  // ---------- ③ audit ----------
  const ACT = { 'flag-change': '🎛️', announce: '📣', 'hof-induct': '🏛️', 'hof-moment': '🏛️', 'hof-remove': '🗑️', 'doc-discord': '💬', claim: '🪪', approve: '✅' };
  function audit() {
    const a = S.aud, subs = [['log', '🛡️ Activity log'], ['subs', '📥 Submissions'], ['reports', '🚩 Reports']];
    const tabs = `<div class="chips dk-tabs">${subs.map(([k, n]) => `<button class="chip${a.sub === k ? ' on' : ''}" data-asub="${k}">${n}</button>`).join('')}</div>`;
    if (a.sub === 'log') {
      if (!S.activity) return tabs + (S.err.activity ? empty('⚠️', 'Could not load the log', S.err.activity) : skel);
      const q = a.q.trim().toLowerCase(), types = [...new Set(S.activity.map((x) => x.type))].sort();
      const hit = S.activity.filter((x) => (!a.type || x.type === a.type) && (!q || `${x.n || ''} ${x.type} ${x.detail || ''}`.toLowerCase().includes(q))), shown = hit.slice(0, a.n);
      return `${tabs}<div class="br-bar"><input type="search" class="br-in" data-aq placeholder="Search the log…" value="${esc(a.q)}" aria-label="Search the log"><select class="br-in" data-atype aria-label="Type"><option value="">All types</option>${types.map((t) => `<option value="${esc(t)}"${t === a.type ? ' selected' : ''}>${esc(ACT[t] || '•')} ${esc(t)}</option>`).join('')}</select></div>
<ul class="dk-log">${shown.map((x) => `<li><span>${esc(ACT[x.type] || '•')} <b>${esc(x.n)}</b> ${esc(x.type)}${x.detail ? ` · ${esc(x.detail)}` : ''}</span><small>${esc(ago(x.at))}</small></li>`).join('') || `<li class="muted small">${S.activity.length ? 'No entries match.' : 'Nothing logged yet.'}</li>`}</ul>
${hit.length > shown.length ? `<button type="button" class="chip" data-amore>Show more (${hit.length - shown.length} left)</button>` : ''}<p class="muted small">Latest ${S.activity.length} entries · ${hit.length} match the filter.</p>`;
    }
    if (a.sub === 'subs') {
      const rows = a.subs[a.subType];
      return `${tabs}<div class="br-bar"><select class="br-in" data-stype aria-label="Submission type">${['feedback', 'ratings', 'awardVotes', 'predictions', 'suggestions', 'builds'].map((t) => `<option value="${t}"${t === a.subType ? ' selected' : ''}>${esc(nice(t))}</option>`).join('')}</select></div>
${rows === undefined ? skel : rows === null ? empty('⚠️', 'Could not load these', S.err.subs) : rows.length ? `<ul class="dk-log">${rows.slice(0, 40).map((r) => `<li><span><b>${esc(r.author || '?')}</b>${r.subject ? ` → ${esc(r.subject)}` : ''}${r.hidden ? ' <em class="muted">(hidden)</em>' : ''}<br>${esc(String(r.body ?? r.title ?? '').slice(0, 220))}</span><small>${r.at ? esc(ago(r.at)) : ''}</small></li>`).join('')}</ul>` : empty('📭', 'Nothing here yet', 'No submissions of this type.')}`;
    }
    const r = a.reports;
    return `${tabs}${r === null ? skel : r === false ? empty('⚠️', 'Could not load reports', S.err.reports) : r.length ? `<ul class="dk-log">${r.map((x) => `<li><span>🚩 <b>${esc(x.author)}</b> · ${esc(x.source)}${x.reason ? ` · “${esc(x.reason)}”` : ''}<br>${esc(x.excerpt)}</span><small>${esc(ago(x.at))}</small></li>`).join('')}</ul>` : empty('🎉', 'No reports waiting', 'Nothing has been reported.')}`;
  }
  async function loadSubs(t) {
    S.aud.subs[t] = undefined; paint();
    try { S.aud.subs[t] = (await call(`/api/admin/submissions?type=${encodeURIComponent(t)}`)).rows; } catch (er) { S.aud.subs[t] = null; S.err.subs = er.message; }
    paint();
  }
  async function loadReports() {
    if (S.aud.reports) return;
    try { S.aud.reports = (await call('/api/admin/reports')).items; } catch (er) { S.aud.reports = false; S.err.reports = er.message; }
    paint();
  }

  // ---------- ④ announcements ----------
  function announce() {
    const a = S.ann, ok = a.title.trim().length >= 3, dc = S.dc;
    const sendTo = a.audience === 'managers' ? 'all managers' : 'every member';
    const docs = (S.docs || []).filter((x) => x.area === 'announce' || x.area === 'rules' || x.area === 'faq');
    const T = S.targets;
    return `<div class="grid g2"><form class="panel br-form" data-form="ann"><h4 class="dk-h" style="margin:0">📣 Announce to members</h4>
<p class="muted small">Goes to the Squad Hub bell and, where they allow it, a Discord DM.</p>
<input class="br-in" name="title" maxlength="120" placeholder="Title (at least 3 letters)" value="${esc(a.title)}" required>
<textarea class="br-in" name="body" maxlength="1500" rows="4" placeholder="What do you want to say?">${esc(a.body)}</textarea>
<div class="dk-row"><select class="br-in" name="audience" aria-label="Who gets it"><option value="all"${a.audience === 'all' ? ' selected' : ''}>Every member</option><option value="managers"${a.audience === 'managers' ? ' selected' : ''}>Managers only</option></select>
<label class="small br-chk"><input type="checkbox" name="ack"${a.ack ? ' checked' : ''}> Must be acknowledged</label></div>
${a.preview ? `<div class="br-prev"><small class="muted">Preview · what members will see</small><b>📣 ${esc(a.title || 'Title')}</b><p>${esc(a.body || '(no message)')}</p><small>${a.ack ? '✔ They must tap “I have read this”. ' : ''}Sent to ${esc(sendTo)}.</small></div>` : ''}
<div class="dk-btns"><button type="button" class="chip" data-ann="preview"${ok ? '' : ' disabled'}>👁️ ${a.preview ? 'Hide preview' : 'Preview'}</button><button type="button" class="btn" data-ann="send"${ok && a.preview ? '' : ' disabled'}>📣 Send to ${esc(sendTo)}</button></div>
${a.preview ? '' : '<p class="muted tiny">Preview first, then Send unlocks. You will be asked to confirm.</p>'}</form>
<div class="panel br-form"><h4 class="dk-h" style="margin:0">💬 Post a club doc to Discord</h4>
<p class="muted small">Posts one of the announcements or rules written in Club docs as a rich message.</p>
${T === undefined ? skel : !T?.ready ? empty('💬', 'Discord is not connected', T?.error || 'The bot token or server is not set up, so nothing can be posted from here.') : !docs.length ? empty('📄', 'No announcements written yet', 'Write one in Club docs first, then post it here.') : `
<select class="br-in" data-dc="doc" aria-label="Doc to post"><option value="">Pick an announcement…</option>${docs.map((x) => `<option value="${x.id}"${String(x.id) === String(dc.doc) ? ' selected' : ''}>${esc(x.title)}</option>`).join('')}</select>
<div class="dk-row"><select class="br-in" data-dc="channel" aria-label="Channel"><option value="">Pick a channel…</option>${T.channels.map((c) => `<option value="${esc(c.id)}"${c.id === dc.channel ? ' selected' : ''}>#${esc(c.name)}${c.news ? ' 📢' : ''}</option>`).join('')}</select>
<select class="br-in" data-dc="role" aria-label="Who to ping"><option value="">Ping nobody</option>${T.roles.map((r) => `<option value="${esc(r.id)}"${r.id === dc.role ? ' selected' : ''}>Ping ${esc(r.name)}</option>`).join('')}</select></div>
${dc.preview ? `<div class="br-prev">${dc.preview.ping ? `<small class="muted">Pings ${esc(dc.preview.ping)}</small>` : ''}${(dc.preview.embeds || []).map((e) => `<b>${esc(e.title)}</b><p>${esc(String(e.description || '').slice(0, 500))}</p><small class="muted">${esc(e.footer?.text || '')}</small>`).join('')}</div>` : ''}
<div class="dk-btns"><button type="button" class="chip" data-dcgo="preview"${dc.doc ? '' : ' disabled'}>👁️ Preview</button><button type="button" class="btn" data-dcgo="send"${dc.doc && dc.channel && dc.preview ? '' : ' disabled'}>💬 Post to Discord</button></div>`}</div></div>`;
  }
  async function loadAnnounce() {
    if (S.targets !== undefined) return;
    const [t, dcs] = await Promise.all([call('/api/events/discord').catch((er) => ({ ready: false, error: er.message })), call('/api/docs').catch(() => null)]);
    S.targets = t; S.docs = dcs?.items || []; if (S.tab === 'announce') paint();
  }
  const readAnn = (f) => { const fd = new FormData(f); S.ann.title = fd.get('title') || ''; S.ann.body = fd.get('body') || ''; S.ann.audience = fd.get('audience'); S.ann.ack = !!fd.get('ack'); };

  // ---------- ⑤ hall of fame ----------
  function hof() {
    if (!S.hof) return S.err.hof ? empty('🏛️', S.err.hof.includes('available') ? 'Hall of Fame is switched off' : 'Could not load the Hall of Fame', S.err.hof.includes('available') ? 'Turn the hallOfFame switch on for the owner to edit it here.' : S.err.hof) : skel;
    const h = S.hofForm, players = window.NOREX?.players || [], entry = (x) => `<li><span>${x.kind === 'legend' ? '⭐' : '📜'} <b>${esc(x.n)}</b>${x.title ? ` · ${esc(x.title)}` : ''}<br><small class="muted">${esc(x.text || '')}</small></span><small>${esc(x.date || '')}${x.by ? ` · ${esc(x.by)}` : ''}</small><button class="chip danger" data-hofdel="${x.id}" data-name="${esc(x.n)}">Remove</button></li>`;
    return `<form class="panel br-form" data-form="hof"><h4 class="dk-h" style="margin:0">Add to the Hall of Fame</h4>
<div class="chips"><button type="button" class="chip${h.kind === 'legend' ? ' on' : ''}" data-hofkind="legend">⭐ Legend</button><button type="button" class="chip${h.kind === 'moment' ? ' on' : ''}" data-hofkind="moment">📜 Club moment</button></div>
${h.kind === 'legend' ? `<select class="br-in" name="player" aria-label="Player"><option value="">Pick a player…</option>${players.map((p) => `<option value="${esc(p.k)}"${p.k === h.player ? ' selected' : ''}>${esc(p.n)}</option>`).join('')}</select>` : `<input class="br-in" name="name" maxlength="60" placeholder="Moment title" value="${esc(h.name)}">`}
<input class="br-in" name="title" maxlength="80" placeholder="${h.kind === 'legend' ? 'Plaque title – e.g. The engine room' : 'Short label (optional)'}" value="${esc(h.title)}">
<textarea class="br-in" name="text" maxlength="400" rows="3" placeholder="${h.kind === 'legend' ? 'Citation – why they are a legend' : 'What happened?'}">${esc(h.text)}</textarea>
<div class="dk-btns"><button class="btn" type="submit">${h.kind === 'legend' ? '⭐ Induct' : '📜 Add moment'}</button></div></form>
<h4 class="dk-h">Legends · ${S.hof.legends.length}</h4>${S.hof.legends.length ? `<ul class="dk-log">${S.hof.legends.map(entry).join('')}</ul>` : empty('⭐', 'No legends yet', 'Induct the first one above.')}
<h4 class="dk-h">Club moments · ${S.hof.moments.length}</h4>${S.hof.moments.length ? `<ul class="dk-log">${S.hof.moments.map(entry).join('')}</ul>` : empty('📜', 'No moments yet', 'Add a milestone above.')}`;
  }
  async function loadHof() { if (S.hof || S.err.hof) return; try { S.hof = await call('/api/hof'); } catch (er) { S.err.hof = er.message; } if (S.tab === 'hof') paint(); }

  // ---------- frame ----------
  const TABS = [['switches', '🎛️ Switches'], ['health', '🩺 Health'], ['audit', '🛡️ Audit'], ['announce', '📣 Announce'], ['hof', '🏛️ Hall of Fame']];
  function paint() {
    if (!root.isConnected) return;
    const keep = d.activeElement?.matches?.('input[data-filter],input[data-aq]') ? d.activeElement.dataset.filter !== undefined ? 'data-filter' : 'data-aq' : null;
    root.innerHTML = `<div class="chips dk-tabs">${TABS.map(([k, n]) => `<button class="chip${S.tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}${S.tab === 'health' ? '<button class="chip" data-hrefresh>↻ Refresh</button>' : ''}</div><div class="dk-pane">${{ switches, health, audit, announce, hof }[S.tab]()}</div>`;
    if (keep) { const i = root.querySelector(`[${keep}]`); if (i) { i.focus(); const n = i.value.length; i.setSelectionRange(n, n); } }
  }
  const openTab = (k) => { S.tab = k; paint(); if (k === 'health' && S.health === undefined) loadHealth(); if (k === 'announce') loadAnnounce(); if (k === 'hof') loadHof(); if (k === 'audit' && S.aud.sub === 'reports') loadReports(); };

  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('button'); if (!t) return; const k = t.dataset;
    if (k.tab) openTab(k.tab);
    else if (k.flag) act(() => setFlag(k.flag, k.level));
    else if (k.reset) act(async () => { if (!confirm(`Drop the live override for “${nice(k.reset)}” and go back to the committed level (${committed[k.reset]})?`)) return; S.flags = (await call('/api/admin/flags/reset', { name: k.reset })).flags; toast(`${nice(k.reset)}: back to committed`); paint(); });
    else if ('undo' in k) act(async () => { const u = S.undo.pop(); if (u) await setFlag(u.name, u.level, true); });
    else if ('hrefresh' in k) loadHealth();
    else if (k.asub) { S.aud.sub = k.asub; paint(); if (k.asub === 'subs' && S.aud.subs[S.aud.subType] === undefined) loadSubs(S.aud.subType); if (k.asub === 'reports') loadReports(); }
    else if ('amore' in k) { S.aud.n += 20; paint(); }
    else if (k.ann === 'preview') { readAnn(t.closest('form')); S.ann.preview = !S.ann.preview; paint(); }
    else if (k.ann === 'send') act(async () => {
      readAnn(t.closest('form')); const a = S.ann;
      if (!confirm(`Send “${a.title}” to ${a.audience === 'managers' ? 'all managers' : 'every member'}${a.ack ? ' (must be acknowledged)' : ''}?\n\nThis notifies real people and can send Discord DMs. It cannot be unsent.`)) return;
      const r = await call('/api/notify/announce', { title: a.title, body: a.body, audience: a.audience, ack: a.ack });
      S.ann = { title: '', body: '', audience: 'all', ack: false, preview: false }; paint(); toast(`📣 Sent to ${r.sent ?? 0} member${r.sent === 1 ? '' : 's'}`);
    });
    else if (k.dcgo === 'preview') act(async () => { const r = await call('/api/docs/discord', { preview: true, id: Number(S.dc.doc), role: S.dc.role }); S.dc.preview = r.preview; paint(); });
    else if (k.dcgo === 'send') act(async () => {
      const ch = S.targets.channels.find((c) => c.id === S.dc.channel), ro = S.targets.roles.find((r) => r.id === S.dc.role);
      if (!confirm(`Post this to #${ch?.name} on Discord${ro ? `, pinging ${ro.name}` : ''}?\n\nIt goes to the real server and cannot be unsent from here.`)) return;
      await call('/api/docs/discord', { id: Number(S.dc.doc), channel: S.dc.channel, role: S.dc.role }); S.dc.preview = null; paint(); toast('💬 Posted to Discord');
    });
    else if (k.hofkind) { S.hofForm.kind = k.hofkind; paint(); }
    else if (k.hofdel) act(async () => { if (!confirm(`Remove “${k.name}” from the Hall of Fame? It is kept in the database but disappears from the site.`)) return; S.hof = await call('/api/hof/remove', { id: Number(k.hofdel) }); paint(); toast('Removed'); });
  });
  root.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.matches('[data-filter]')) { S.filter = t.value; paint(); }
    else if (t.matches('[data-aq]')) { S.aud.q = t.value; S.aud.n = 12; paint(); }
    else if (t.closest('[data-form="ann"]')) { S.ann.preview = false; const f = t.closest('form'); readAnn(f); f.querySelector('[data-ann="preview"]').disabled = S.ann.title.trim().length < 3; const s = f.querySelector('[data-ann="send"]'); s.disabled = true; f.querySelector('.br-prev')?.remove(); }
    else if (t.closest('[data-form="hof"]') && t.name) S.hofForm[t.name] = t.value;
  });
  root.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.matches('[data-atype]')) { S.aud.type = t.value; S.aud.n = 12; paint(); }
    else if (t.matches('[data-stype]')) { S.aud.subType = t.value; if (S.aud.subs[t.value] === undefined) loadSubs(t.value); else paint(); }
    else if (t.dataset.dc) { S.dc[t.dataset.dc] = t.value; S.dc.preview = null; paint(); }
    else if (t.closest('[data-form="hof"]') && t.name) { S.hofForm[t.name] = t.value; }
    else if (t.closest('[data-form="ann"]')) { readAnn(t.closest('form')); S.ann.preview = false; paint(); }
  });
  root.addEventListener('submit', (ev) => {
    const f = ev.target.closest('[data-form="hof"]'); if (!f) { ev.preventDefault(); return; } ev.preventDefault();
    act(async () => {
      const h = S.hofForm, player = h.kind === 'legend' ? h.player : undefined;
      if (h.kind === 'legend' && !player) throw new Error('Pick a player first.');
      const pl = (window.NOREX?.players || []).find((p) => p.k === player);
      if (!confirm(`Add ${h.kind === 'legend' ? `${pl?.n || 'this player'} as a legend` : `“${h.name}” as a club moment`} to the public Hall of Fame?`)) return;
      S.hof = await call('/api/hof', { kind: h.kind, player, name: h.kind === 'moment' ? h.name : undefined, title: h.title, text: h.text });
      S.hofForm = { kind: h.kind, player: '', name: '', title: '', text: '' }; paint(); toast(h.kind === 'legend' ? '⭐ Inducted' : '📜 Added');
    });
  });

  const load = async () => {
    try { const ov = await call('/api/admin/overview'); S.flags = ov.flags || null; S.canEdit = !!ov.canEditFlags; S.activity = ov.activity || []; if (!ov.flags) S.err.flags = 'Switches are only shown to the owner.'; }
    catch (er) { S.err.flags = er.message; S.err.activity = er.message; }
    paint();
  };
  (async () => {
    await A.ready?.catch?.(() => {});
    if (A.role === 'manager') { const l = d.getElementById('brLocal'); if (l) l.insertAdjacentHTML('afterbegin', '<div class="panel sq-empty" style="margin-bottom:18px"><span>👑</span><div><b>The Boardroom is for the owner</b><p class="muted small">Feature switches, health and the Hall of Fame open for the owner. Managers can use Schedule, Desk and Dugout.</p></div></div>'); }
    if (A.role !== 'owner') return;
    d.getElementById('brLocal')?.setAttribute('hidden', ''); root.hidden = false; paint();
    load();
  })();
})();
