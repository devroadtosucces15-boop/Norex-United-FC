// Praise & feedback on the client (roadmap P4.4, reactions added with feedback E3).
//   NXFeedback.tab(el, ctx)          Squad Hub → 💌 Feedback: inbox (no author, 🚩 report), send, what I sent; managers: moderation
//   NXFeedback.send(ctx, to?)        the send dialog – says plainly that managers can see who wrote it (also from member profiles)
// ctx = { call, toast, me: { u, n, a } }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const BASE = document.body.dataset.base || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!$('link[href$="feedback.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/feedback.css` }));
  const KINDS = { praise: ['👏', 'Praise'], tip: ['💡', 'Tip'], concern: ['⚠️', 'Concern'] };
  const text = (s) => esc(s).replace(/\n/g, '<br>');
  const REACT = { like: ['👍', 'Thanks'], check: ['✅', 'Acknowledged'], heart: ['❤️', 'Appreciated'], disagree: ['❌', 'Disagree'], confused: ['😕', 'Confused'] };

  // The send dialog. to = a member id to preselect (from a profile). Resolves with the new state, or null.
  async function send(ctx, to = null, S = null) {
    S = S ?? await ctx.call('/api/feedback');
    if (!S.canSend) { ctx.toast('Only verified players can send feedback – claim your player first.', true); return null; }
    if (!S.left) { ctx.toast(`That’s ${S.perDay} today – try again tomorrow.`, true); return null; }
    let out = null;
    await UI.modal({
      title: 'Send praise or feedback', icon: '💌',
      body: `<div class="fb-warn">🛡️ <b>Anonymous by default: ${esc(S.recipients.find((r) => r.id === to)?.n ?? 'your teammate')} won’t see who sent it – you and the managers can.</b> Untick it to sign your name. They are pinged straight away and can react; you only ever see the good reactions.</div>
<form class="fb-form" id="fb-form"><label class="fld">To <select name="to" required><option value="">Pick a verified teammate…</option>${S.recipients.map((r) => `<option value="${esc(r.id)}"${r.id === to ? ' selected' : ''}>${esc(r.n)} · ${esc(r.playerName)}</option>`).join('')}</select></label>
<fieldset class="fb-kinds"><legend>Kind</legend>${Object.entries(KINDS).map(([k, [ic, l]], i) => `<label><input type="radio" name="kind" value="${k}"${i === 0 ? ' checked' : ''}> ${ic} ${l}</label>`).join('')}</fieldset>
<label class="fb-anon"><input type="checkbox" name="anon" checked> 🕶️ Send anonymously</label>
<label class="fld">Message <textarea name="text" rows="4" maxlength="500" minlength="10" required placeholder="e.g. Your runs in behind are class – keep calling for it early."></textarea></label>
<small class="muted">${S.left} of ${S.perDay} left today · no bad language · 10–500 characters</small></form>`,
      actions: [],
      onOpen: (d, close) => {
        const f = $('#fb-form', d);
        f.insertAdjacentHTML('beforeend', '<div class="row"><span class="grow"></span><button class="btn ghost" type="button" data-cancel>Cancel</button><button class="btn" type="submit">💌 Send</button></div>');
        $('[data-cancel]', f).onclick = () => close(null);
        f.onsubmit = async (e) => {
          e.preventDefault();
          const btn = $('button[type=submit]', f);
          btn.disabled = true;
          try {
            out = await ctx.call('/api/feedback/send', { to: f.to.value, kind: f.kind.value, text: f.text.value, anon: f.anon.checked });
            ctx.toast(f.anon.checked ? 'Sent – anonymous to them, visible to managers' : 'Sent with your name');
            close(true);
          } catch (er) { ctx.toast(er.message, true); btn.disabled = false; }
        };
      },
    });
    return out;
  }

  function tab(el, ctx) {
    let S = null, M = null, view = 'inbox';
    const who = (f) => (f.anon === false && f.from ? `<span class="muted small">from <b>${esc(f.from)}</b></span>` : '');
    const reacts = (f) => `<div class="fb-react" role="group" aria-label="React">${Object.entries(REACT).map(([k, [ic, l]]) => `<button type="button" class="btn sm ghost${f.reaction === k ? ' on' : ''}" data-react="${f.id}" data-r="${k}" title="${l}" aria-pressed="${f.reaction === k}">${ic}</button>`).join('')}</div>${['disagree', 'confused'].includes(f.reaction) ? (f.reply ? `<p class="fb-report">Your reason (managers only): ${text(f.reply)}</p>` : `<button type="button" class="btn sm" data-why="${f.id}">✍️ Tell the managers why</button>`) : ''}`;
    const item = (f, extra = '') => `<article class="card fb-item k-${esc(f.kind)}${f.read === false ? ' unread' : ''}"><header><span class="fb-kind">${KINDS[f.kind]?.[0] ?? '💬'} ${KINDS[f.kind]?.[1] ?? ''}</span>${extra}<span class="grow"></span>${UI.time(f.at)}</header><p>${text(f.text)}</p>`;
    const paint = () => {
      const tabs = [['inbox', '📥 Inbox', S.unread || null], ['sent', '📤 Sent', S.sent.length || null], ...(S.canModerate ? [['mod', '🛡️ Moderation', M ? M.items.filter((i) => i.reportedAt && !i.hidden).length || null : null]] : [])];
      const body = {
        inbox: () => (S.inbox.length ? S.inbox.map((f) => `${item(f, who(f))}${reacts(f)}<footer>${f.reported ? '<span class="nx-pill t-red">🚩 Reported</span>' : `<button type="button" class="btn sm ghost" data-report="${f.id}">🚩 Report</button>`}</footer></article>`).join('')
          : UI.empty({ icon: '📥', title: 'No feedback yet', text: 'Messages teammates send you land here – you won’t see who wrote them.' })),
        sent: () => (S.sent.length ? S.sent.map((f) => `${item(f, `<span class="muted small">to <b>${esc(f.toName ?? '')}</b>${f.anon === false ? '' : ' · 🕶️ anonymous'}</span>${f.reaction ? `<span class="nx-pill" title="${REACT[f.reaction][1]}">${REACT[f.reaction][0]}</span>` : ''}`)}${f.hidden ? '<footer><span class="nx-pill">🙈 Hidden by a manager</span></footer>' : ''}</article>`).join('')
          : UI.empty({ icon: '📤', title: 'Nothing sent yet', text: S.canSend ? 'Tell a teammate what they do well – or one thing to work on.' : 'Claim your player to send feedback.' })),
        mod: () => (!M ? UI.skeleton('rows', 3) : M.items.length ? M.items.map((f) => `${item(f, `<span class="small"><b>${esc(f.fromName)}</b> → <b>${esc(f.toName)}</b></span>`)}${f.caution ? `<p class="fb-report">⚠️ Caution – ${esc(f.reaction ? REACT[f.reaction]?.[1] : 'unhappy')}${f.reply ? `: “${esc(f.reply)}”` : ' (no reason given yet)'}</p>` : ''}${f.reportedAt ? `<p class="fb-report">🚩 Reported ${UI.time(f.reportedAt)}: “${esc(f.report)}”</p>` : ''}<footer>${f.hidden ? `<span class="nx-pill">🙈 Hidden${f.hiddenBy ? ` by ${esc(f.hiddenBy)}` : ''}</span><button type="button" class="btn sm ghost" data-hide="${f.id}" data-v="0">Show again</button>` : `<button type="button" class="btn sm ghost" data-hide="${f.id}" data-v="1">🙈 Hide</button>`}</footer></article>`).join('')
          : UI.empty({ icon: '🛡️', title: 'No feedback sent yet' })),
      };
      el.innerHTML = `<div class="fb-head"><div><h3>💌 Praise &amp; feedback</h3><p class="muted small">After a match, tell a teammate what they did well or one thing to work on – anonymously if you like. They react (👍 ✅ ❤️ ❌ 😕); you only see the good ones. Managers can always see who wrote it.</p></div>
${S.canSend ? `<button type="button" class="btn" data-send${S.left ? '' : ' disabled'}>💌 Send praise / feedback</button>` : '<span class="nx-pill">🔒 Claim your player to send</span>'}</div>
${UI.tabsHtml(tabs, view, 'fb-tabs')}<div class="fb-list">${body[view]()}</div>`;
      UI.tabs($('.fb-tabs', el), async (k) => {
        view = k;
        if (k === 'mod' && !M) { M = await ctx.call('/api/feedback/all').catch((er) => { ctx.toast(er.message, true); return { items: [] }; }); }
        paint();
        if (k === 'inbox' && S.unread) S = await ctx.call('/api/feedback/read', {}).catch(() => S);
      });
    };
    const load = async () => {
      try {
        S = await ctx.call('/api/feedback');
        if (S.canModerate) M = await ctx.call('/api/feedback/all').catch(() => null);
        paint();
        if (view === 'inbox' && S.unread) S = await ctx.call('/api/feedback/read', {}).catch(() => S);
      } catch (e) { el.innerHTML = UI.empty({ icon: '📡', title: 'Feedback is unavailable', text: e.message }); }
    };
    el.innerHTML = UI.skeleton('rows', 3);
    el.onclick = async (e) => {
      if (e.target.closest('[data-send]')) { const n = await send(ctx, null, S); if (n) { S = n; view = 'sent'; paint(); } return; }
      const rep = e.target.closest('[data-report]');
      if (rep) {
        let why = '';
        const reason = await UI.modal({ title: 'Report this message', icon: '🚩', body: '<p class="small">Managers will see the message, who sent it and your reason.</p><label class="fld">Why? <input id="fb-why" maxlength="200" placeholder="e.g. insulting, not about football"></label>',
          actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '🚩 Report', value: 'go', kind: 'danger' }], onOpen: (d) => { const i = $('#fb-why', d); i.oninput = () => { why = i.value; }; i.focus(); } });
        if (reason !== 'go') return;
        try { S = await ctx.call('/api/feedback/report', { id: Number(rep.dataset.report), reason: why }); ctx.toast('Reported to the managers'); paint(); } catch (er) { ctx.toast(er.message, true); }
        return;
      }
      const rc = e.target.closest('[data-react]');
      if (rc) { try { S = await ctx.call('/api/feedback/react', { id: Number(rc.dataset.react), reaction: rc.dataset.r }); ctx.toast(['disagree', 'confused'].includes(rc.dataset.r) ? 'Noted – the managers will take a look' : 'Reaction sent'); paint(); } catch (er) { ctx.toast(er.message, true); } return; }
      const wy = e.target.closest('[data-why]');
      if (wy) {
        let why = '';
        const go = await UI.modal({ title: 'Tell the managers why', icon: '✍️', body: '<p class="small">Only managers read this – the sender never sees it.</p><label class="fld">Your reason <textarea id="fb-why2" rows="4" maxlength="500" placeholder="What was off, or what did you not understand?"></textarea></label>',
          actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: 'Send', value: 'go' }], onOpen: (d) => { const i = $('#fb-why2', d); i.oninput = () => { why = i.value; }; i.focus(); } });
        if (go !== 'go') return;
        try { S = await ctx.call('/api/feedback/why', { id: Number(wy.dataset.why), text: why }); ctx.toast('Sent to the managers'); paint(); } catch (er) { ctx.toast(er.message, true); }
        return;
      }
      const h = e.target.closest('[data-hide]');
      if (h) {
        try { await ctx.call('/api/feedback/hide', { id: Number(h.dataset.hide), hidden: h.dataset.v === '1' }); M = await ctx.call('/api/feedback/all'); paint(); } catch (er) { ctx.toast(er.message, true); }
      }
    };
    load();
  }

  window.NXFeedback = { tab, send };
})();
