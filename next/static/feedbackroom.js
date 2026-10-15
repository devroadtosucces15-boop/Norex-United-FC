// Hub › Clubhouse › Praise & feedback (flag feedbackRoom). Mirrors web/feedback.js on the redesign: inbox with the five reactions and
// "tell the managers why" on ❌ / 😕, a send form with a recent-match picker, what I sent (only the good reactions ever reach the
// sender), and for managers moderation with caution items. API: bot/feedback.js (/api/feedback*). Every write goes through the
// submit button state and reports errors in a toast. The section stays hidden unless the viewer's level includes the flag.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s);
  const mount = $('#chfeedback'); if (!mount) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  const sec = $('#ch-feedback'), chip = $('[data-fb-chip]');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const body = (s) => esc(s).replace(/\n/g, '<br>');
  const put = (el, html) => { el.innerHTML = html; setTimeout(() => window.NorexFit?.(el), 60); };
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60e3); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; if (m < 1440) return `${Math.floor(m / 60)} h ago`; if (m < 10080) return `${Math.floor(m / 1440)} d ago`; try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch { return ''; } };
  const KINDS = { praise: ['👏', 'Praise'], tip: ['💡', 'Tip'], concern: ['⚠️', 'Concern'] };
  const REACT = { like: ['👍', 'Thanks'], check: ['✅', 'Acknowledged'], heart: ['❤️', 'Appreciated'], disagree: ['❌', 'Disagree'], confused: ['😕', 'Confused'] };
  const BAD = ['disagree', 'confused'];
  const TABS = [['inbox', '📥 Inbox'], ['send', '💌 Send'], ['sent', '📤 Sent']];
  const empty = (icon, title, text = '', extra = '') => `<div class="panel sq-empty"><span>${icon}</span><div><b>${title}</b>${text ? `<p class="muted small">${text}</p>` : ''}${extra}</div></div>`;
  const reveal = () => { if (sec) sec.hidden = false; if (chip) chip.hidden = false; };

  if (!API || !A?.token) return;
  const post = (path, b) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  const busy = (btn, work) => (M ? M.submit(btn, work) : work());
  const oops = (e) => M?.toast(e.message || 'Could not save that', { kind: 'err' });
  const ok = (m, icon) => M?.toast(m, { kind: 'ok', icon });

  let S = null, ALL = null, view = 'inbox', pick = { to: '', kind: 'praise', match: '', anon: true, text: '' };
  let open = null; // { why: id } | { report: id } – the inline form under one inbox card
  let matches = [], byId = new Map();

  const loadMatches = () => fetch((window.NOREX_ROOT ?? '../') + 'api/club.json').then((r) => (r.ok ? r.json() : null)).then((c) => {
    matches = (c?.matches || []).filter((m) => m && m.id).sort((a, b) => b.ts - a.ts).slice(0, 8);
    byId = new Map((c?.matches || []).map((m) => [String(m.id), m]));
  }).catch(() => {});
  const day = (ts) => { try { return new Date(ts * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch { return ''; } };
  const matchLabel = (m) => `${m.res || ''} ${m.gf}–${m.ga} vs ${m.opp} · ${day(m.ts)}`.trim();
  const matchPill = (id) => { if (!id) return ''; const m = byId.get(String(id)); return `<span class="nx-pill fb-match" title="The match this is about">⚽ ${m ? esc(matchLabel(m)) : 'A recent match'}</span>`; };

  const head = (f, extra = '') => `<header class="fb-ih"><span class="fb-kind">${KINDS[f.kind]?.[0] ?? '💬'} ${KINDS[f.kind]?.[1] ?? ''}</span>${extra}${matchPill(f.match)}<span class="grow"></span><small class="muted tiny">${ago(f.at)}</small></header>`;
  const reacts = (f) => `<div class="fb-rx" role="group" aria-label="React to this message">${Object.entries(REACT).map(([k, [ic, l]]) => `<button type="button" class="ch-rx fb-r${f.reaction === k ? ' mine' : ''}" data-fbr="${f.id}" data-r="${k}" aria-pressed="${f.reaction === k}" title="${l}" aria-label="${l}">${ic}</button>`).join('')}</div>`;
  const whyBlock = (f) => {
    if (!BAD.includes(f.reaction)) return '';
    if (f.reply) return `<p class="fb-note">Your reason (managers only): ${body(f.reply)}</p>`;
    if (open?.why === f.id) return `<form class="fb-inl" data-fbwhy="${f.id}"><label class="fld">Tell the managers why <textarea name="t" rows="3" maxlength="500" required placeholder="What was off, or what did you not understand?"></textarea></label><small class="muted tiny">Only managers read this. The sender never sees it or your reaction.</small><div class="sq-acts"><button class="btn" type="submit">✍️ Send</button><button class="btn ghost" type="button" data-fbx>Cancel</button></div></form>`;
    return `<button type="button" class="btn sm" data-fbwhy-open="${f.id}">✍️ Tell the managers why</button>`;
  };
  const reportBlock = (f) => {
    if (f.reported) return '<span class="nx-pill t-red">🚩 Reported</span>';
    if (open?.report === f.id) return `<form class="fb-inl" data-fbrep="${f.id}"><label class="fld">Why report it? <input name="r" maxlength="200" placeholder="e.g. insulting, not about football"></label><small class="muted tiny">Managers will see the message, who sent it and your reason.</small><div class="sq-acts"><button class="btn danger" type="submit">🚩 Report</button><button class="btn ghost" type="button" data-fbx>Cancel</button></div></form>`;
    return `<button type="button" class="btn sm ghost" data-fbrep-open="${f.id}">🚩 Report</button>`;
  };

  const inboxHtml = () => S.inbox.length ? `<div class="fb-list">${S.inbox.map((f) => `<article class="panel fb-item k-${esc(f.kind)}${f.read ? '' : ' unread'}">${head(f, f.anon === false && f.from ? `<small class="muted">from <b>${esc(f.from)}</b></small>` : '<small class="muted">🕶️ a teammate</small>')}<p>${body(f.text)}</p>${reacts(f)}${whyBlock(f)}<footer>${reportBlock(f)}</footer></article>`).join('')}</div>`
    : empty('📥', 'No feedback yet', 'Messages teammates send you land here. You will not see who wrote an anonymous one.');

  const sendHtml = () => {
    if (!S.canSend) return empty('🔒', 'Claim your player to send', 'Only verified players can send praise and feedback.');
    const next = S.nextAt ? new Date(S.nextAt).toUTCString().slice(17, 22) : '';
    if (!S.left) return empty('⏳', `That is ${S.perDay} today`, `You can send more at ${next} UTC.`);
    const who = S.recipients.find((r) => r.id === pick.to)?.n ?? 'your teammate';
    return `<form class="panel fb-form" id="fb-form">
<div class="fb-warn">🛡️ <b>${pick.anon ? `Anonymous by default: ${esc(who)} will not see who sent it. You and the managers can.` : `Signed: ${esc(who)} will see your name.`}</b> They can react; you only ever see the good reactions.</div>
<label class="fld">To <select name="to" required><option value="">Pick a verified teammate…</option>${S.recipients.map((r) => `<option value="${esc(r.id)}"${r.id === pick.to ? ' selected' : ''}>${esc(r.n)} · ${esc(r.playerName)}</option>`).join('')}</select></label>
<div class="chips fb-kinds" role="radiogroup" aria-label="Kind">${Object.entries(KINDS).map(([k, [ic, l]]) => `<button type="button" role="radio" aria-checked="${pick.kind === k}" class="chip${pick.kind === k ? ' on' : ''}" data-fbk="${k}">${ic} ${l}</button>`).join('')}</div>
<label class="fld">About a match <select name="match"><option value="">No particular match</option>${matches.map((m) => `<option value="${esc(m.id)}"${String(m.id) === pick.match ? ' selected' : ''}>${esc(matchLabel(m))}</option>`).join('')}</select></label>
<label class="fb-anon"><input type="checkbox" name="anon"${pick.anon ? ' checked' : ''}> 🕶️ Send anonymously</label>
<label class="fld">Message <textarea name="text" rows="4" maxlength="500" minlength="10" required placeholder="e.g. Your runs in behind are class. Keep calling for it early.">${esc(pick.text)}</textarea></label>
<div class="fb-foot"><small class="muted tiny">${S.left} of ${S.perDay} left today · no bad language · 10–500 characters <span data-fbleft></span></small><button class="btn" type="submit">💌 Send</button></div></form>`;
  };

  const sentHtml = () => S.sent.length ? `<div class="fb-list">${S.sent.map((f) => `<article class="panel fb-item k-${esc(f.kind)}">${head(f, `<small class="muted">to <b>${esc(f.toName ?? '')}</b>${f.anon ? ' · 🕶️ anonymous' : ''}</small>${f.reaction ? `<span class="nx-pill" title="${REACT[f.reaction]?.[1] ?? ''}">${REACT[f.reaction]?.[0] ?? ''}</span>` : ''}`)}<p>${body(f.text)}</p>${f.hidden ? '<footer><span class="nx-pill">🙈 Hidden by a manager</span></footer>' : ''}</article>`).join('')}</div>`
    : empty('📤', 'Nothing sent yet', S.canSend ? 'Tell a teammate what they do well, or one thing to work on.' : 'Claim your player to send feedback.');

  const needsLook = (f) => (f.caution || (f.reportedAt && !f.hidden) ? 1 : 0);
  const modHtml = () => {
    if (!ALL) return '<div class="panel sq-empty"><span>⏳</span><div><b>Loading…</b></div></div>';
    const items = [...ALL.items].sort((a, b) => needsLook(b) - needsLook(a) || b.at - a.at);
    return items.length ? `<div class="fb-list">${items.map((f) => `<article class="panel fb-item k-${esc(f.kind)}${needsLook(f) ? ' flag' : ''}">${head(f, `<small><b>${esc(f.fromName)}</b> → <b>${esc(f.toName)}</b>${f.anon ? ' · 🕶️ anonymous to them' : ''}</small>`)}<p>${body(f.text)}</p>
${f.caution ? `<p class="fb-note">⚠️ Caution: ${esc(REACT[f.reaction]?.[1] ?? 'unhappy')}${f.reply ? `, they explain: “${esc(f.reply)}”` : ' (no reason given yet)'}</p>` : ''}${f.reportedAt ? `<p class="fb-note">🚩 Reported ${ago(f.reportedAt)}: “${esc(f.report)}”</p>` : ''}
<footer>${f.hidden ? `<span class="nx-pill">🙈 Hidden${f.hiddenBy ? ` by ${esc(f.hiddenBy)}` : ''}</span><button type="button" class="btn sm ghost" data-fbhide="${f.id}" data-v="0">Show again</button>` : `<button type="button" class="btn sm ghost" data-fbhide="${f.id}" data-v="1">🙈 Hide</button>`}</footer></article>`).join('')}</div>`
      : empty('🛡️', 'No feedback sent yet');
  };

  const paint = () => {
    const mod = S.canModerate ? [['mod', `🛡️ Moderation${ALL ? (n => n ? ` · ${n}` : '')(ALL.items.filter(needsLook).length) : ''}`]] : [];
    const tabs = [...TABS, ...mod].map(([k, l]) => `<button type="button" role="tab" class="chip${k === view ? ' on' : ''}" aria-selected="${k === view}" data-fbt="${k}">${l}${k === 'inbox' && S.unread ? ` <small class="num">${S.unread}</small>` : ''}</button>`).join('');
    put(mount, `<p class="muted small fb-intro">After a match, tell a teammate what they did well or one thing to work on, anonymously if you like. They react 👍 ✅ ❤️ ❌ 😕 and you only see the good ones. Managers can always see who wrote it.</p>
<div class="chips fb-tabs" role="tablist" aria-label="Feedback">${tabs}</div>${{ inbox: inboxHtml, send: sendHtml, sent: sentHtml, mod: modHtml }[view]()}`);
  };

  const loadMod = async () => { if (!S?.canModerate) return; try { ALL = await A.call('/api/feedback/all'); } catch (e) { ALL = { items: [] }; oops(e); } };
  const markRead = async () => { if (view === 'inbox' && S?.unread) { try { S = await post('/api/feedback/read', {}); } catch { /* unread dot just stays */ } } };
  const load = async () => {
    mount.innerHTML = '<div class="panel sq-empty"><span>⏳</span><div><b>Loading…</b></div></div>';
    try {
      [S] = await Promise.all([A.call('/api/feedback'), loadMatches()]);
      if (S.canModerate) loadMod().then(() => view === 'mod' && paint());
      reveal(); paint();
      if (S.unread) { const keep = S.unread; setTimeout(async () => { await markRead(); if (keep && view === 'inbox') paint(); }, 1500); }
    } catch (e) {
      if (e.status === 404 && /not available/i.test(e.message)) return; // server flag still off: leave the room hidden
      reveal(); put(mount, empty('📡', 'Praise & feedback is unavailable', esc(e.message || 'The club server did not answer.'), '<button type="button" class="btn ghost" data-fbretry>↻ Try again</button>'));
    }
  };

  mount.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.fbretry !== undefined) return load();
    if (t.dataset.fbt) { view = t.dataset.fbt; open = null; paint(); if (view === 'mod' && !ALL) { await loadMod(); paint(); } else if (view === 'inbox') { await markRead(); paint(); } return; }
    if (t.dataset.fbk) { pick.kind = t.dataset.fbk; const f = $('#fb-form', mount); if (f) { pick.text = f.text.value; pick.to = f.to.value; pick.match = f.match.value; pick.anon = f.anon.checked; } paint(); return; }
    if (t.dataset.fbx !== undefined) { open = null; paint(); return; }
    if (t.dataset.fbwhyOpen) { open = { why: Number(t.dataset.fbwhyOpen) }; paint(); $('[data-fbwhy] textarea', mount)?.focus(); return; }
    if (t.dataset.fbrepOpen) { open = { report: Number(t.dataset.fbrepOpen) }; paint(); $('[data-fbrep] input', mount)?.focus(); return; }
    if (t.dataset.fbr) {
      const r = t.dataset.r;
      try {
        S = await busy(t, () => post('/api/feedback/react', { id: Number(t.dataset.fbr), reaction: r }));
        if (BAD.includes(r)) open = { why: Number(t.dataset.fbr) };
        paint(); M?.pulse(t); M?.haptic();
        ok(BAD.includes(r) ? 'Noted. The managers will take a look' : 'Reaction sent', REACT[r][0]);
      } catch (er) { oops(er); }
      return;
    }
    if (t.dataset.fbhide) {
      try { await busy(t, () => post('/api/feedback/hide', { id: Number(t.dataset.fbhide), hidden: t.dataset.v === '1' })); await loadMod(); paint(); ok(t.dataset.v === '1' ? 'Hidden from the inbox' : 'Shown again', '🙈'); } catch (er) { oops(er); }
    }
  });
  mount.addEventListener('input', (e) => {
    const f = e.target.form; if (!f || f.id !== 'fb-form') return;
    if (e.target.name === 'text') { pick.text = e.target.value; const c = $('[data-fbleft]', f); if (c) { const n = 500 - e.target.value.length; c.textContent = n < 120 ? `· ${n} left` : ''; } }
    if (e.target.name === 'to') { pick.to = e.target.value; const w = $('.fb-warn b', f); if (w) { const nm = S.recipients.find((r) => r.id === pick.to)?.n ?? 'your teammate'; w.textContent = pick.anon ? `Anonymous by default: ${nm} will not see who sent it. You and the managers can.` : `Signed: ${nm} will see your name.`; } }
    if (e.target.name === 'match') pick.match = e.target.value;
    if (e.target.name === 'anon') { pick.anon = e.target.checked; const w = $('.fb-warn b', f); if (w) { const nm = S.recipients.find((r) => r.id === f.to.value)?.n ?? 'your teammate'; w.textContent = pick.anon ? `Anonymous by default: ${nm} will not see who sent it. You and the managers can.` : `Signed: ${nm} will see your name.`; } }
  });
  mount.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target, btn = f.querySelector('[type=submit]');
    try {
      if (f.id === 'fb-form') {
        S = await busy(btn, () => post('/api/feedback/send', { to: f.to.value, kind: pick.kind, text: f.text.value, anon: f.anon.checked, match: f.match.value || undefined }));
        pick = { to: '', kind: 'praise', match: '', anon: true, text: '' }; view = 'sent'; paint();
        ok(f.anon.checked ? 'Sent. Anonymous to them, visible to managers' : 'Sent with your name', '💌');
      } else if (f.dataset.fbwhy) {
        S = await busy(btn, () => post('/api/feedback/why', { id: Number(f.dataset.fbwhy), text: f.t.value })); open = null; paint(); ok('Sent to the managers', '✍️');
      } else if (f.dataset.fbrep) {
        S = await busy(btn, () => post('/api/feedback/report', { id: Number(f.dataset.fbrep), reason: f.r.value })); open = null; paint(); ok('Reported to the managers', '🚩');
      }
    } catch (er) { oops(er); }
  });

  (A.ready || Promise.resolve()).then(() => { if ((A.features || []).includes('feedbackRoom')) load(); });
})();
