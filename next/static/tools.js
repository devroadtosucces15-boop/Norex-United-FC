// Staff › Tools (swap-over blockers, NEXT-PARITY §2–3): the rest of the classic manager portal, on the same live routes.
//   Submissions – GET /api/admin/submissions?type=&q=  (+ CSV export in the browser)
//   Reports     – GET /api/admin/reports, POST /api/feed/delete|unreport, /api/feedback/hide, /api/chats/reports/:id {action: clear|remove}
//   Game data   – GET /api/game/admin, POST /api/game/publish, /api/game/dismiss
//   Bot         – GET|POST /api/bot/settings, GET|POST /api/bot/commands, POST /api/bot/commands/sync
//   Awards      – GET /api/awards, POST /api/awards/category|category/remove|close|settings, GET /api/events/discord (channels)
(() => {
  const d = document, root = d.getElementById('tlLive'); if (!root) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const call = (path, body) => (body ? A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) : A.call(path));
  const toast = (m, err) => M?.toast ? M.toast(m, err ? { kind: 'err' } : { kind: 'ok' }) : console.log(m);
  const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 90 ? 'just now' : s < 5400 ? Math.round(s / 60) + ' min ago' : s < 129600 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
  const empty = (icon, title, text) => `<div class="panel sq-empty"><span>${icon}</span><div><b>${esc(title)}</b><p class="muted small">${esc(text || '')}</p></div></div>`;
  const skel = '<div class="dg-skel"><i></i></div>';
  const TABS = [['subm', '📥 Submissions'], ['reports', '🚩 Reports'], ['game', '🎮 Game data'], ['bot', '🤖 Bot'], ['awards', '🏆 Awards'], ['notif', '🔔 Notifications']];
  const SUBM = { feedback: '💌 Feedback', ratings: '🌟 Ratings', awardVotes: '🏆 Award votes', predictions: '🔮 Predictions', suggestions: '💡 Suggestions', builds: '🧬 Builds' };
  const SRC = { post: '📰 Post', feedback: '💌 Feedback', message: '💬 Message' };
  const GRP = { GK: '🧤 Keepers', DEF: '🛡️ Defenders', MID: '🎯 Midfielders', FWD: '⚽ Forwards', any: '👥 Anyone' };
  const ROLE_OPTS = [['guest', 'Everyone'], ['member', 'Members'], ['claimed', 'Verified players'], ['manager', 'Managers'], ['owner', 'Owner only']];
  const REPLY_OPTS = [['default', 'As built'], ['private', 'Private (only them)'], ['public', 'Public']];
  const AP = [['results', '⚽ Match results'], ['reminders', '⏰ Event reminders'], ['awards', '🏆 Weekly awards'], ['posts', '📝 New site posts → alerts channel'], ['live', '🔴 Live streams → alerts channel']];
  const S = { tab: 'subm', type: 'feedback', q: '', rows: null, reports: null, game: null, form: null, bot: null, cmds: null, awards: null, notif: null, channels: null, ask: null, busy: false, err: {} };
  const bump = (v) => { const m = String(v || 'fc27').match(/^(.*?)(\d+)$/); return m && /-v$|-tu$|\.$/.test(m[1]) ? m[1] + (+m[2] + 1) : `${v}-v2`; };
  const sel = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const failed = (k, what) => (S.err[k] ? empty('⚠️', `Could not load ${what}`, S.err[k]) : null);
  // two taps for anything destructive: the first arms the button (it says so), the second does it
  const two = (key, label, cls = 'chip danger', attrs = '') => `<button class="${cls}" type="button" ${attrs} data-two="${esc(key)}">${S.ask === key ? 'Sure? Tap again' : label}</button>`;

  // ---------- Submissions ----------
  async function loadSubm(type = S.type, q = S.q) {
    S.type = type; S.q = q; S.rows = null; paint();
    try { S.rows = (await call(`/api/admin/submissions?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}`)).rows || []; S.err.subm = null; } catch (e) { S.err.subm = e.message; S.rows = []; }
    if (S.tab === 'subm') paint();
  }
  function subm() {
    const rows = S.rows;
    return `<form class="chips dk-row" data-subm-form><select name="type" aria-label="Type">${sel(Object.entries(SUBM), S.type)}</select><input name="q" value="${esc(S.q)}" placeholder="Search author, text…" aria-label="Search" style="flex:1;min-width:160px"><button class="chip" type="submit">Search</button><button class="chip" type="button" data-csv${rows?.length ? '' : ' disabled'}>⬇️ Export CSV</button></form>
${S.err.subm ? empty('⚠️', 'Could not load submissions', S.err.subm) : rows === null ? skel : rows.length ? `<div class="panel" style="overflow-x:auto;margin-top:14px"><table class="tbl"><thead><tr><th>When</th><th>Author</th><th>Subject</th><th>Detail</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${ago(r.at)}</td><td>${esc(r.author ?? '–')}</td><td>${esc(r.subject ?? '–')}</td><td>${r.kind ? `<span class="pill">${esc(r.kind)}</span> ` : ''}${esc((r.body || '').slice(0, 160))}${r.reported ? ' <span class="pill loss">🚩 reported</span>' : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('📭', 'Nothing here', 'No submissions of this type match.')}`;
  }
  function csv() {
    const cols = ['at', 'author', 'subject', 'kind', 'body'], cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const text = [cols.join(','), ...S.rows.map((r) => cols.map((c) => cell(c === 'at' ? new Date(r.at).toISOString() : r[c])).join(','))].join('\r\n');
    const a = Object.assign(d.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/csv' })), download: `norex-${S.type}-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Reports ----------
  function reports() {
    const f = failed('reports', 'reports'); if (f) return f;
    if (!S.reports) return skel;
    return `<p class="muted small">Everything a member has flagged, across the feed, anonymous feedback and chats.</p>${S.reports.length ? `<div class="dk-grid">${S.reports.map((r) => { const key = `${r.source}:${r.id}`; return `<article class="panel dk-card"><div><span class="pill">${SRC[r.source] ?? esc(r.source)}</span> <b>${esc(r.author ?? '–')}</b>${r.reason ? ` <span class="muted">“${esc(r.reason)}”</span>` : ''}</div><p class="muted small">${esc(r.excerpt || '')}</p><small class="muted">${ago(r.at)}</small>
<div class="dk-btns">${r.link && /^[\w./#?=&%-]+$/.test(r.link) ? `<a class="chip" href="${esc(r.link)}">Open</a>` : ''}<button class="chip" type="button" data-rep="clear" data-src="${esc(r.source)}" data-id="${esc(r.id)}">✓ Clear report</button>${two('rm:' + key, '🗑 Remove', 'chip danger', `data-rep="remove" data-src="${esc(r.source)}" data-id="${esc(r.id)}"`)}</div></article>`; }).join('')}</div>` : empty('🎉', 'Nothing reported', 'No content is waiting for review.')}`;
  }
  async function repAct(src, id, remove) {
    if (src === 'post') await call(remove ? '/api/feed/delete' : '/api/feed/unreport', { id: Number(id) });
    else if (src === 'feedback') await call('/api/feedback/hide', { id: Number(id), hidden: remove });
    else await call(`/api/chats/reports/${encodeURIComponent(id)}`, { action: remove ? 'remove' : 'clear' });
    S.reports = S.reports.filter((r) => !(r.source === src && String(r.id) === String(id)));
    paint(); toast(remove ? 'Removed' : 'Report cleared');
  }

  // ---------- Game data ----------
  function game() {
    const f = failed('game', 'game data'); if (f) return f;
    if (!S.game) return skel;
    const { current: c, versions, pending, keys } = S.game, cap = c.levelCap || {}, pend = pending.filter((p) => !p.same);
    const fm = S.form ??= { version: bump(c.version), levelCap: cap.value ?? '', verified: !!cap.verified, source: cap.verified ? cap.source : '', note: '', changes: '', pending: null, notify: true };
    return `<div class="panel dk-card"><div><small class="muted">🔝 Max level now</small><div style="font:700 34px Oswald">${esc(cap.value ?? '–')} ${cap.verified ? '<span class="pill win">✓ Official</span>' : '<span class="pill">Unverified</span>'}</div></div><p class="muted small">Version <code>${esc(c.version)}</code>${c.publishedBy ? ` · by ${esc(c.publishedBy)} ${ago(c.publishedAt)}` : ' · starting dataset'}. The builder and Pro Builds read this; changing the max level here changes it everywhere, no code change.</p></div>
<h4 class="dk-h">📢 From EA's patch notes${pend.length ? ` (${pend.length})` : ''}</h4>
${pend.length ? `<div class="dk-grid">${pend.map((p) => `<article class="panel dk-card"><div><b>${esc(p.title)}</b><br><small class="muted">${esc(String(p.published).slice(0, 10))} · ${esc(p.section)}</small></div><q class="small">${esc(p.quote)}</q>
<div class="dk-btns">${p.value ? `<span class="pill gold">Level ${esc(p.value)}</span>` : '<small class="muted">No number in this sentence.</small>'}<a class="chip" href="${esc(p.url)}" target="_blank" rel="noopener">Open note ↗</a><button class="chip danger" type="button" data-g="dismiss" data-id="${esc(p.id)}">Dismiss</button>${p.value ? two('ga:' + p.id, `✅ Set max level ${p.value}`, 'btn', `data-g="apply" data-id="${esc(p.id)}"`) : `<button class="btn" type="button" data-g="use" data-id="${esc(p.id)}">Use in form</button>`}</div></article>`).join('')}</div>` : empty('🎉', 'Nothing to confirm', 'When EA’s Pitch Notes mention a level cap, it shows up here for one-click confirmation.')}
<h4 class="dk-h">🛠 Publish a new version</h4>
<form class="panel dk-nf" data-g-form><label>Version name<input name="version" value="${esc(fm.version)}" maxlength="40" required pattern="[a-z0-9][a-z0-9.\\-]*" placeholder="fc27-tu2"></label>
<label>Max level<input name="levelCap" type="number" min="1" max="200" value="${esc(fm.levelCap)}" required></label>
<label><input name="verified" type="checkbox"${fm.verified ? ' checked' : ''}> Confirmed by an official EA note</label><label><input name="notify" type="checkbox"${fm.notify !== false ? ' checked' : ''}> 🔔 Tell members what changed</label>
<label>Source link<input name="source" type="url" value="${esc(fm.source || '')}" placeholder="https://www.ea.com/games/ea-sports-fc/fc-27/news/…"></label>
<label>Note<input name="note" value="${esc(fm.note)}" maxlength="300" placeholder="What changed, e.g. Title Update 2: cap raised"></label>
<label>Changed values <small class="muted">(optional JSON – replaces: ${keys.map(esc).join(', ')})</small><textarea name="changes" rows="4" spellcheck="false" placeholder='{"apPerLevel": [2, 2, 3]}'>${esc(fm.changes)}</textarea></label>
<div class="dk-btns"><button class="btn" type="submit"${S.busy ? ' disabled' : ''}>🚀 Publish version</button><button class="chip" type="button" data-g="download">⬇ Current dataset (JSON)</button></div></form>
<h4 class="dk-h">🗂 History</h4><div class="panel" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Version</th><th>Max level</th><th>Status</th><th>Note</th><th>By</th><th>When</th></tr></thead><tbody>${versions.map((v, i) => `<tr><td><code>${esc(v.version)}</code>${i ? '' : ' <span class="pill win">live</span>'}</td><td><b>${esc(v.cap ?? '–')}</b></td><td>${v.verified ? `<a href="${esc(v.source)}" target="_blank" rel="noopener">✓ official</a>` : 'unverified'}</td><td>${esc(v.note || '–')}</td><td>${esc(v.by || '–')}</td><td>${v.at ? ago(v.at) : '–'}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const readGame = () => { const f = root.querySelector('[data-g-form]'); if (f) S.form = { ...S.form, version: f.version.value.trim(), levelCap: f.levelCap.value, verified: f.verified.checked, source: f.source.value.trim(), note: f.note.value, changes: f.changes.value, notify: f.notify.checked }; };
  async function publish(extra = {}) {
    readGame(); const body = { ...S.form, levelCap: Number(S.form.levelCap), ...extra }; S.busy = true; paint();
    try { S.game = await call('/api/game/publish', body); S.form = null; toast(`Published ${body.version} – max level ${body.levelCap}${S.game.told ? ` · ${S.game.told} told` : ''}`); } catch (e) { toast(e.message, true); }
    S.busy = false; paint();
  }

  // ---------- Notifications (owner only) ----------
  const ROUTE_LABEL = { default: 'As built (member decides)', dm: 'Bell + Discord DM', site: 'Bell only', off: 'Off' };
  function notif() {
    const f = failed('notif', 'the notifications'); if (f) return f;
    if (!S.notif) return skel;
    const groups = [...new Set(S.notif.items.map((i) => i.group))];
    return `<h4 class="dk-h" style="margin-top:0">🔔 Notification Center</h4><p class="muted small">Change what each notification says, who gets it and how, and when. Use <code>{placeholders}</code> in the wording. Blank = the wording as built. “Send me a test” sends the wording with sample values to you only, never to members, whatever the route above.</p>${groups.map((g) => `<h4 class="dk-h">${esc(g)}</h4>${S.notif.items.filter((i) => i.group === g).map((i) => {
      const c = i.saved || {};
      const timing = Object.entries(i.timing || {}).map(([k, t]) => `<label>${esc(t.label)}<input name="t-${k}" type="number" min="${t.min}" max="${t.max}" value="${esc(c.timing?.[k] ?? t.def)}"></label>`).join('');
      return `<form class="panel dk-nf" data-n-form="${esc(i.key)}"><b>${esc(i.label)}</b>
<label><input name="enabled" type="checkbox"${c.enabled === false ? '' : ' checked'}> Send this notification</label>
<label>How it is sent<select name="route">${sel(Object.entries(ROUTE_LABEL), c.route || 'default')}</select></label>
<label><input name="locked" type="checkbox"${c.locked ? ' checked' : ''}> Members cannot mute it</label>
<label>Title<input name="title" maxlength="140" value="${esc(c.title || '')}" placeholder="${esc(i.title)}"></label>
<label>Message<textarea name="body" rows="2" maxlength="1500" placeholder="${esc(i.body)}">${esc(c.body || '')}</textarea></label>
${i.vars.length ? `<p class="muted small">Placeholders: ${i.vars.map((v) => `<code>{${esc(v)}}</code>`).join(' ')}</p>` : ''}${timing}
<div class="dk-btns"><button class="btn" type="submit"${S.busy ? ' disabled' : ''}>💾 Save</button><button class="chip" type="button" data-n-test="${esc(i.key)}">📨 Send me a test</button><button class="chip" type="button" data-n-reset="${esc(i.key)}">Reset</button></div></form>`;
    }).join('')}`).join('')}`;
  }
  const readNotif = (f) => { const e = (n) => f.elements.namedItem(n); return { key: f.dataset.nForm, enabled: e('enabled').checked, route: e('route').value, locked: e('locked').checked, title: e('title').value, body: e('body').value,
    timing: Object.fromEntries([...f.querySelectorAll('[name^="t-"]')].map((el) => [el.name.slice(2), Number(el.value)])) }; }; // elements.namedItem: form.title is the HTML attribute

  // ---------- Bot ----------
  function bot() {
    const f = failed('bot', 'the bot settings'); if (f) return f;
    if (!S.bot) return skel;
    const s = S.bot, ch = S.cmds?.channels || [];
    const chOpts = (cur, blank) => `<option value="">${blank}</option>${ch.map((c) => `<option value="${esc(c.id)}"${c.id === cur ? ' selected' : ''}>#${esc(c.name)}</option>`).join('')}`;
    const cmds = S.err.cmds ? empty('⚠️', 'Could not load the commands', S.err.cmds) : !S.cmds ? skel : `<div class="panel" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Command</th><th>On</th><th>Who can use it</th><th>Only in</th><th>Reply</th><th>Post to</th></tr></thead><tbody>${S.cmds.commands.map((c) => `<tr data-cmd="${esc(c.name)}"><td><b>/${esc(c.name)}</b><div class="muted small">${esc(c.description)}</div></td><td><input type="checkbox" data-f="enabled" aria-label="/${esc(c.name)} on"${c.enabled === false ? '' : ' checked'}></td>
<td><select data-f="min" aria-label="Who can use /${esc(c.name)}">${sel(ROLE_OPTS, c.min || (c.staff ? 'manager' : 'guest'))}</select></td><td><select data-f="channel" aria-label="Channel">${chOpts((c.channels || [])[0] || '', 'Any channel')}</select></td><td><select data-f="reply" aria-label="Reply">${sel(REPLY_OPTS, c.reply || 'default')}</select></td><td><select data-f="postTo" aria-label="Post to">${chOpts(c.postTo || '', 'Where it was used')}</select></td></tr>`).join('')}</tbody></table></div>
<div class="dk-btns" style="justify-content:flex-start;margin-top:12px"><button class="btn" type="button" data-b="save-cmds"${S.busy ? ' disabled' : ''}>💾 Save commands</button><button class="chip" type="button" data-b="sync"${S.busy ? ' disabled' : ''}>🔄 Sync to Discord</button></div>`;
    return `<h4 class="dk-h" style="margin-top:0">🤖 Personalisation</h4><p class="muted small">Where the bot posts, who it pings and its look. Channel and role IDs come from Discord (Developer Mode on, right-click → Copy ID).</p>
<form class="panel dk-nf" data-b-form><label>Result channel ID<input name="resultChannel" value="${esc(s.resultChannel)}" placeholder="Blank = the webhook's own channel" pattern="\\d{5,25}" maxlength="25"></label>
<label>Reminder ping role ID<input name="pingRole" value="${esc(s.pingRole)}" placeholder="Optional – pinged on result posts" pattern="\\d{1,25}" maxlength="25"></label>
<label>Alerts channel ID<input name="alertChannel" value="${esc(s.alertChannel)}" placeholder="New posts and live streams also post here" pattern="\\d{5,25}" maxlength="25"><span class="muted small">Needs the <b>alertRoute</b> switch on (Boardroom → Switches). <button class="chip" type="button" data-b="alert-test">Send me a test DM</button></span></label>
<label>Embed colour<input name="color" type="color" value="#${esc(s.color)}"></label><label>Emoji<input name="emoji" value="${esc(s.emoji)}" maxlength="8" placeholder="⚽"></label>
<label>Cloudflare Worker plan<select name="plan">${sel([['free', 'Free – 25 DMs per run, live checks 8 per run, bell every 2 min'], ['paid', 'Paid – 100 DMs per run, live checks 30 per run, bell every 1 min']], s.plan || 'free')}</select></label>
<div><b class="small">Auto-posts on</b>${AP.map(([k, l]) => `<label><input name="ap-${k}" type="checkbox"${s.autoPosts[k] ? ' checked' : ''}> ${l}</label>`).join('')}</div>
<div class="dk-btns"><button class="btn" type="submit"${S.busy ? ' disabled' : ''}>💾 Save settings</button></div></form>
<p class="panel muted small" style="padding:10px 12px">🔀 <b>Who gets which alert, and where it posts</b> now lives in <a href="staff-boardroom.html">Boardroom → Control Center</a>, next to each feature’s access switch.</p>
<h4 class="dk-h">🎛️ Commands</h4><p class="muted small">Who can use each command, where, and where it posts. Owners always get through; managers ignore the channel limit. Rules apply the moment you save; <b>Sync</b> also hides staff-only commands from Discord's list.${S.cmds?.channelsError ? ` <b>Channel list unavailable:</b> ${esc(S.cmds.channelsError)}` : ''}</p>${cmds}`;
  }
  function readCmds() {
    const out = {};
    root.querySelectorAll('tr[data-cmd]').forEach((tr) => {
      const g = (f) => tr.querySelector(`[data-f="${f}"]`), c = S.cmds.commands.find((x) => x.name === tr.dataset.cmd);
      const o = { enabled: g('enabled').checked, min: g('min').value, reply: g('reply').value, postTo: g('postTo').value };
      if (g('channel').value) o.channels = [g('channel').value];
      if (o.min === (c.staff ? 'manager' : 'guest')) delete o.min;
      out[tr.dataset.cmd] = o;
    });
    return out;
  }

  // ---------- Awards ----------
  function awards() {
    const f = failed('awards', 'the awards'); if (f) return f;
    const a = S.awards; if (!a) return skel;
    if (!a.canManage) return empty('🔒', 'Managers only', 'Awards admin is for managers and the owner.');
    return `<div class="panel dk-card"><div><b>🏆 This week</b><p class="muted small" style="margin:4px 0 0">${a.closed ? '🔒 Voting is closed – results are out.' : `Voting closes Sunday 24:00 UTC · ${a.voters ?? 0} member${a.voters === 1 ? '' : 's'} voted so far.`}</p></div><div class="dk-btns">${a.closed ? '' : two('aw:close', '🔒 Close this week now', 'btn', 'data-aw="close"')}</div></div>
<h4 class="dk-h">Categories on the ballot</h4><ul class="dk-log">${a.categories.map((c) => `<li><span>${esc(c.icon)} <b>${esc(c.name)}</b> <small class="muted">${GRP[c.grp] || GRP.any}${c.builtin ? ' · stats-based' : ''}</small></span>${c.builtin ? '' : two('aw:rm:' + c.id, 'Retire', 'chip danger', `data-aw="retire" data-id="${esc(c.id)}"`)}</li>`).join('')}</ul>
<h4 class="dk-h">➕ New fun award</h4><form class="panel dk-nf" data-aw-form><label>Name<input name="name" maxlength="40" placeholder="Most Non-Sleeper" required></label><label>Icon<input name="icon" maxlength="4" placeholder="😴"></label><label>Nominees<select name="grp">${sel(Object.entries(GRP), 'any')}</select></label><div class="dk-btns"><button class="btn" type="submit">Add to this week’s ballot</button></div></form>
<h4 class="dk-h">📣 Where results are posted</h4><label class="panel dk-nf">Discord channel<select data-aw-ch aria-label="Discord channel for the results"><option value="">Don’t post</option>${(S.channels || []).map((c) => `<option value="${esc(c.id)}"${c.id === a.channel ? ' selected' : ''}>${c.news ? '📢' : '#'} ${esc(c.name)}</option>`).join('')}</select></label>`;
  }

  // ---------- shell ----------
  function paint() {
    if (!root.isConnected) return;
    const focus = d.activeElement?.name ? { n: d.activeElement.name } : null;
    root.innerHTML = `<div class="chips dk-tabs">${TABS.filter(([k]) => k !== 'notif' || A.role === 'owner').map(([k, n]) => `<button class="chip${S.tab === k ? ' on' : ''}" type="button" data-tab="${k}">${n}${k === 'reports' && S.reports?.length ? ` <span class="dk-n">${S.reports.length}</span>` : ''}</button>`).join('')}</div><div class="dk-pane">${{ subm, reports, game, bot, awards, notif }[S.tab]()}</div>`;
    if (focus) root.querySelector(`[name="${focus.n}"]`)?.focus({ preventScroll: true });
  }
  const guard = async (k, fn) => { try { const r = await fn(); S.err[k] = null; return r; } catch (e) { S.err[k] = e.message; return null; } };
  const need = async (tab) => {
    if (tab === 'subm' && S.rows === null && !S.err.subm) return loadSubm();
    if (tab === 'reports' && !S.reports) S.reports = (await guard('reports', () => call('/api/admin/reports')))?.items ?? null;
    if (tab === 'game' && !S.game) S.game = await guard('game', () => call('/api/game/admin'));
    if (tab === 'bot') {
      if (!S.bot) S.bot = await guard('bot', () => call('/api/bot/settings'));
      if (!S.cmds) S.cmds = await guard('cmds', () => call('/api/bot/commands'));
    }
    if (tab === 'notif' && !S.notif) S.notif = await guard('notif', () => call('/api/admin/notif'));
    if (tab === 'awards') {
      if (!S.awards) S.awards = await guard('awards', () => call('/api/awards'));
      if (!S.channels) S.channels = await call('/api/events/discord').then((t) => (t.ready ? t.channels : [])).catch(() => []);
    }
    if (S.tab === tab) paint();
  };
  const act = async (fn) => { try { await fn(); } catch (e) { S.busy = false; paint(); toast(e.message, true); } };

  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('button'); if (!t) return; const k = t.dataset;
    if (k.two !== undefined && S.ask !== k.two) { S.ask = k.two; paint(); setTimeout(() => { if (S.ask === k.two) { S.ask = null; paint(); } }, 4000); return; }
    S.ask = null;
    if (k.tab) { S.tab = k.tab; paint(); need(k.tab); }
    else if (k.csv !== undefined) csv();
    else if (k.rep) act(() => repAct(k.src, k.id, k.rep === 'remove'));
    else if (k.g === 'download') { const a = Object.assign(d.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify(S.game.current, null, 1)], { type: 'application/json' })), download: `${S.game.current.version}.json` }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
    else if (k.g) {
      const hit = S.game.pending.find((p) => p.id === k.id); if (!hit) return;
      if (k.g === 'apply') act(() => publish({ levelCap: hit.value, verified: true, source: hit.url, note: `${hit.title}: max level ${hit.value}`, pending: hit.id }));
      else if (k.g === 'use') { readGame(); S.form = { ...S.form, verified: true, source: hit.url, note: hit.title, pendingId: hit.id }; paint(); root.querySelector('[name=levelCap]')?.focus(); }
      else if (k.g === 'dismiss') act(async () => { S.game = await call('/api/game/dismiss', { id: hit.id }); paint(); toast('Dismissed'); });
    } else if (k.nTest) act(async () => { await call('/api/admin/notif/test', { key: k.nTest }); toast('Test sent to you'); });
    else if (k.nReset) act(async () => { S.notif = await call('/api/admin/notif', { key: k.nReset, reset: true }); paint(); toast('Back to the default wording'); });
    else if (k.b === 'save-cmds') act(async () => { S.busy = true; await call('/api/bot/commands', { commands: readCmds() }); S.cmds = await call('/api/bot/commands'); S.busy = false; paint(); toast('Command rules saved'); });
    else if (k.b === 'alert-test') act(async () => { const r = await call('/api/bot/alerts/test', { kind: 'posts' }); toast(r.active ? 'Test sent to your DMs' : 'Test sent to your DMs – alerts are still off (switch alertRoute)'); });
    else if (k.b === 'sync') act(async () => { S.busy = true; paint(); const r = await call('/api/bot/commands/sync', {}); S.cmds = await call('/api/bot/commands'); S.busy = false; paint(); toast(`Synced ${r.count} commands to Discord`); });
    else if (k.aw === 'close') act(async () => { S.awards = await call('/api/awards/close', {}); paint(); toast('Week closed – winners are out'); });
    else if (k.aw === 'retire') act(async () => { S.awards = await call('/api/awards/category/remove', { id: Number(k.id) }); paint(); toast('Award retired'); });
  });
  root.addEventListener('submit', (ev) => {
    ev.preventDefault(); const f = ev.target;
    if (f.matches('[data-subm-form]')) loadSubm(f.type.value, f.q.value.trim());
    else if (f.matches('[data-g-form]')) act(() => publish(S.form?.pendingId ? { pending: S.form.pendingId } : {}));
    else if (f.matches('[data-b-form]')) act(async () => {
      S.busy = true; paint();
      S.bot = await call('/api/bot/settings', { resultChannel: f.resultChannel.value.trim(), pingRole: f.pingRole.value.trim(), alertChannel: f.alertChannel.value.trim(), color: f.color.value.replace('#', ''), emoji: f.emoji.value.trim(), plan: f.plan.value, autoPosts: Object.fromEntries(AP.map(([k]) => [k, f[`ap-${k}`].checked])) });
      S.busy = false; paint(); toast('Bot settings saved');
    });
    else if (f.matches('[data-n-form]')) act(async () => { S.busy = true; S.notif = await call('/api/admin/notif', readNotif(f)); S.busy = false; paint(); toast('Notification saved'); });
    else if (f.matches('[data-aw-form]')) act(async () => { const el = f.elements; S.awards = await call('/api/awards/category', { name: el.namedItem('name').value, icon: el.namedItem('icon').value, grp: el.namedItem('grp').value }); paint(); toast('Award added to this week’s ballot'); });
  });
  root.addEventListener('change', (ev) => {
    if (ev.target.matches('[data-aw-ch]')) act(async () => { S.awards = await call('/api/awards/settings', { channel: ev.target.value }); paint(); toast(ev.target.value ? 'Results will be posted there' : 'No Discord post'); });
  });
  (async () => {
    await A.ready?.catch?.(() => {});
    if (!['manager', 'owner'].includes(A.role)) return;
    d.getElementById('tlLocal')?.setAttribute('hidden', ''); root.hidden = false; paint();
    need('subm');
  })();
})();
