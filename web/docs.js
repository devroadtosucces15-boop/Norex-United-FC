// Club knowledge on the client (roadmap P5.1 Play Style, P5.2 docs hub, P5.3 announcements to Discord, P5.4 suggestions).
//   docs.html       [data-docs]       announcements, requirements, rules (+ acknowledgement), FAQ, glossary terms
//   playstyle.html  [data-playstyle]  League ⇄ Rush: philosophy, formations, positions, set pieces, tactics
//   index.html      [data-news]       newest pinned / latest announcement strip (app.js mounts it when `docs` is on)
//   NXDocs.ideas(el, ctx)             Squad Hub → 💡 Ideas: suggestion box (ctx = { call, toast, me })
// Text is markdown-lite (web/docs-md.js). Managers get ✏️ edit, 🕘 history, 📣 Discord and 🗑 on every item.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BASE = document.body.dataset.base || '';
  const MAPI = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!$('link[href$="docs.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/docs.css` }));
  const session = () => { try { const t = localStorage.getItem('norex_session'); const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))); return p.exp > Date.now() / 1000 ? { token: t, ...p } : null; } catch { return null; } };
  const call = async (path, body) => {
    const s = session();
    const r = await fetch(MAPI + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { ...(s ? { Authorization: `Bearer ${s.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  const toast = (m, bad) => UI.toast(m, bad ? 'bad' : 'ok');
  const loginUrl = () => `${MAPI}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
  const mdReady = () => (window.NXMd ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/docs-md.js`, onload: ok, onerror: no }))));
  const md = (s) => NXMd.html(s, { host: location.hostname });
  // Element for the URL hash inside root (ignores hashes that aren't valid selectors).
  const byHash = (root) => { try { return location.hash.length > 1 ? $(location.hash, root) : null; } catch { return null; } };
  const day = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const AREAS = [
    ['announce', '📣', 'Announcements', 'News from the managers – newest first.'],
    ['requirements', '✅', 'Requirements', 'What we expect from everyone in the squad.'],
    ['rules', '📜', 'Rules', 'The club rules. Members acknowledge each new version.'],
    ['faq', '❓', 'FAQ', 'Questions new and old members ask.'],
    ['glossary', '📖', 'Glossary', 'Game terms and the numbers on this site, explained.'],
  ];
  const AREA = Object.fromEntries(AREAS.map(([k, ic, l, sub]) => [k, { ic, l, sub }]));
  const HELP = '<details class="dx-help"><summary>✍️ Formatting</summary><p><code># Heading</code> · <code>**bold**</code> · <code>*italic*</code> · <code>- list</code> · <code>1. list</code> · <code>&gt; quote</code> · <code>---</code> · <code>[text](https://…)</code><br>A line with only an image link (<code>.png .jpg .gif .webp</code>) shows the picture; a line with only a YouTube, Twitch or Streamable link plays the video.</p></details>';

  // ---------- shared: editor + history ----------
  // Opens the editor; resolves with the form values or null. `draft` survives a failed save (we reopen with it).
  async function editor({ title, icon, draft, fields = [], area }) {
    let f = { ...draft };
    const read = (d) => {
      f = { ...f, title: $('[name=title]', d)?.value ?? f.title, body: $('[name=body]', d).value };
      for (const x of $$('input[type=checkbox]', d)) f[x.name] = x.checked;
      for (const x of $$('select', d)) f[x.name] = x.value;
      const pv = $('.dx-preview', d);
      if (pv && !pv.hidden) pv.innerHTML = md(f.body) || '<p class="muted">Nothing to preview yet.</p>';
      const dc = $('.dx-dc', d);
      if (dc) dc.hidden = !f.discordOn;
    };
    const v = await UI.modal({
      title, icon, wide: true,
      body: `<form class="dx-form" onsubmit="return false">${draft.title !== undefined ? `<label>Title<input name="title" maxlength="120" value="${esc(draft.title)}" required></label>` : ''}
<label>Text <span class="dx-tabs"><button type="button" class="linkish" data-pv="0">Write</button> · <button type="button" class="linkish" data-pv="1">Preview</button></span><textarea name="body" rows="12" maxlength="8000">${esc(draft.body ?? '')}</textarea></label>
<div class="dx-preview md" hidden></div>${HELP}
${fields.map((x) => x.html ?? `<label class="dx-check"><input type="checkbox" name="${x.name}"${draft[x.name] ? ' checked' : ''}> <span>${x.label}${x.tip ? ` <small class="muted">${x.tip}</small>` : ''}</span></label>`).join('')}</form>`,
      actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: area === 'announce' && !draft.id ? '📣 Publish' : '💾 Save', value: 'ok' }],
      onOpen: (d) => {
        read(d);
        d.addEventListener('input', () => read(d));
        d.addEventListener('change', () => read(d));
        d.addEventListener('click', (e) => {
          const b = e.target.closest('[data-pv]');
          if (!b) return;
          $('.dx-preview', d).hidden = b.dataset.pv !== '1';
          $('[name=body]', d).hidden = b.dataset.pv === '1';
          read(d);
        });
        $('[name=title]', d)?.focus();
      },
    });
    return v === 'ok' ? f : null;
  }

  async function showHistory(id, onRestored) {
    let h;
    try { h = await call(`/api/docs/history?id=${id}`); } catch (e) { return toast(e.message, true); }
    const v = await UI.modal({
      title: `History · ${h.doc.title}`, icon: '🕘', wide: true,
      body: `<ol class="dx-hist">${h.versions.map((x) => `<li><details${x.current ? ' open' : ''}><summary><b>v${x.version}</b> ${x.current ? UI.pill('current', { tone: 'win' }) : ''} <span class="muted">${esc(x.by || '–')} · ${day(x.at)}</span>${x.current ? '' : ` <button type="button" class="btn sm ghost" data-restore="${x.version}">↩ Restore</button>`}</summary><h4>${esc(x.title)}</h4><div class="md">${md(x.body)}</div></details></li>`).join('')}</ol>`,
      onOpen: (d, close) => d.addEventListener('click', (e) => { const b = e.target.closest('[data-restore]'); if (b) { e.preventDefault(); close(+b.dataset.restore); } }),
    });
    if (!v) return;
    try { onRestored(await call('/api/docs/restore', { id, version: v })); toast(`Restored version ${v} – saved as a new version`); } catch (e) { toast(e.message, true); }
  }

  // P5.3 – channel + role pickers (loaded once per page).
  let targets = null;
  const discordTargets = () => (targets ??= call('/api/docs/discord').catch((e) => ({ ready: false, error: e.message })));
  const pickers = (t) => (t.ready ? `<div class="dx-dc-row"><label>Channel<select name="channel">${t.channels.map((c) => `<option value="${esc(c.id)}"${c.id === t.last ? ' selected' : ''}>${c.news ? '📢' : '#'} ${esc(c.name)}</option>`).join('')}</select></label>
<label>Ping<select name="role"><option value="">Nobody</option>${t.roles.map((r) => `<option value="${esc(r.id)}">${esc(r.name.startsWith('@') ? r.name : `@${r.name}`)}</option>`).join('')}</select></label></div>` : `<p class="muted small">⚠️ ${esc(t.error)}</p>`);
  // BE6 – dry-run preview card: renders exactly the embed `/api/docs/discord?preview` would post, so a
  // manager can check it before it actually goes out.
  const previewCard = (p) => {
    if (!p) return '<div class="dx-preview-card"><p class="muted small">Loading preview…</p></div>';
    const e = p.embeds[0];
    return `<div class="dx-preview-card"><div class="dx-preview-bar"></div><div class="dx-preview-body">
${p.ping ? `<p class="dx-preview-ping">📣 pings ${esc(p.ping)}</p>` : ''}
<p class="dx-preview-author">${esc(e.author.name)}</p>
<p class="dx-preview-title">${esc(e.title)}</p>
${e.description ? `<p class="dx-preview-desc">${esc(e.description).replace(/\n/g, '<br>')}</p>` : ''}
${e.image ? `<img class="dx-preview-img" src="${esc(e.image.url)}" alt="">` : ''}
<p class="dx-preview-footer">${esc(e.footer.text)}</p></div></div>`;
  };
  async function toDiscord(item, onDone) {
    const t = await discordTargets();
    let f = {}, preview = null;
    const refreshPreview = async (d) => {
      const el = $('.dx-preview-card', d);
      if (!el) return;
      try { preview = (await call('/api/docs/discord', { id: item.id, preview: true, role: f.role })).preview; } catch { preview = null; }
      el.outerHTML = previewCard(preview);
    };
    const v = await UI.modal({
      title: `Post to Discord · ${item.title}`, icon: '📣', wide: true,
      body: `${item.discord ? `<p class="muted small">Already posted ${UI.time(item.discord.at)} – this posts it again.</p>` : ''}${pickers(t)}<p class="muted small">The bot posts it as a card with a link back here. It needs View Channel, Send Messages and Embed Links in that channel (and Mention Everyone for pings).</p>
<h4 style="margin:14px 0 6px">👁️ Preview</h4>${previewCard(null)}`,
      actions: t.ready ? [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '📣 Post', value: 'ok' }] : undefined,
      onOpen: (d) => { const rd = () => { f = { channel: $('[name=channel]', d)?.value, role: $('[name=role]', d)?.value }; refreshPreview(d); }; rd(); d.addEventListener('change', rd); },
    });
    if (v !== 'ok') return;
    try { onDone(await call('/api/docs/discord', { id: item.id, ...f })); toast('Posted to Discord 📣'); } catch (e) { toast(e.message, true); }
  }

  // ================= docs hub =================
  async function hub(root) {
    await mdReady();
    let S = null;
    const s = session();
    const load = async () => { S = await call('/api/docs'); paint(); };
    const items = (area) => S.items.filter((x) => x.area === area).sort(area === 'announce' ? (a, b) => b.pinned - a.pinned || b.at - a.at : (a, b) => b.pinned - a.pinned || a.id - b.id);
    const pills = (x) => UI.pills([x.pinned && { label: 'Pinned', emoji: '📌', tone: 'gold' }, false && { label: 'Public', emoji: '🌍', tip: 'Guests see this on the public site' }, S.canEdit && !x.public && { label: 'Members', emoji: '🔒' }, S.canEdit && x.version > 1 && { label: `v${x.version}` }, S.canEdit && x.discord && { label: 'On Discord', emoji: '💬', tone: 'discord', tip: `Posted ${day(x.discord.at)}` }].filter(Boolean));
    const tools = (x) => (S.canEdit ? `<div class="dx-tools"><button type="button" class="btn sm ghost" data-edit="${x.id}">✏️ Edit</button>${x.version > 1 ? `<button type="button" class="btn sm ghost" data-hist="${x.id}">🕘 History</button>` : ''}${S.canDiscord ? `<button type="button" class="btn sm ghost" data-dc="${x.id}">📣 Discord</button>` : ''}<button type="button" class="btn sm ghost" data-rm="${x.id}">🗑</button></div>` : '');
    const meta = (x) => `<small class="muted dx-meta">${x.by ? `${esc(x.by)} · ` : ''}${day(x.at)}${x.editedAt ? ` · edited ${UI.time(x.editedAt)}${x.editedBy && x.editedBy !== x.by ? ` by ${esc(x.editedBy)}` : ''}` : ''}</small>`;
    const card = (x) => `<article class="card dx-item${x.pinned ? ' pinned' : ''}" id="d-${x.id}"><header><h3>${esc(x.title)}</h3>${pills(x)}</header><div class="md">${md(x.body)}</div><footer>${meta(x)}${tools(x)}</footer></article>`;
    const faq = (x) => `<details class="card dx-faq" id="d-${x.id}"><summary><h3>${esc(x.title)}</h3>${pills(x)}</summary><div class="md">${md(x.body)}</div><footer>${meta(x)}${tools(x)}</footer></details>`;
    const term = (x) => `<div class="dx-term" id="d-${x.id}"><dt>${esc(x.title)} ${pills(x)}</dt><dd><div class="md">${md(x.body)}</div>${tools(x)}</dd></div>`;
    function rulesBox() {
      const r = S.rules;
      if (!r) return s ? '' : `<p class="muted small">🔒 Members see every rule – <a href="${esc(loginUrl())}">log in with Discord</a>.</p>`;
      if (!r.version) return '';
      return `<div class="dx-ack ${r.acked ? 'ok' : 'due'}">${r.acked
        ? `<span>✅ You acknowledged these rules${r.ackedAt ? ` on ${day(r.ackedAt)}` : ''}.</span>`
        : `<span>✋ <b>Please read the rules below and confirm.</b> Managers can see who has.</span><button type="button" class="btn sm" data-ack>✓ I’ve read and accept the rules</button>`}${S.canEdit ? `<button type="button" class="btn sm ghost" data-acks>👥 Who has acknowledged</button>` : ''}</div>`;
    }
    function section([k, ic, l, sub]) {
      const list = items(k);
      if (!list.length && !S.canEdit && k !== 'glossary') return '';
      const body = !list.length ? (k === 'glossary' ? '' : UI.empty({ icon: ic, title: `No ${l.toLowerCase()} yet`, text: 'Managers add them with the button above.' }))
        : k === 'faq' ? list.map(faq).join('') : k === 'glossary' ? `<dl class="dx-terms">${list.map(term).join('')}</dl>` : list.map(card).join('');
      return `<section class="dx-sec" id="${k === 'announce' ? 'announcements' : k}"><header class="dx-head"><h2>${ic} ${l}${list.length ? ` <em>${list.length}</em>` : ''}</h2><p class="muted small">${sub}</p>${S.canEdit ? `<button type="button" class="btn sm" data-new="${k}">➕ ${k === 'announce' ? 'New announcement' : 'Add'}</button>` : ''}</header>
${k === 'rules' ? rulesBox() : ''}${body}${k === 'glossary' ? '<div data-glossary-static></div>' : ''}</section>`;
    }
    const staticGlossary = $('[data-docs-glossary]');
    function paint() {
      const shown = AREAS.filter(([k]) => S.canEdit || k === 'glossary' || items(k).length);
      root.innerHTML = `<nav class="dx-nav chipset" aria-label="Sections">${shown.map(([k, ic, l]) => `<a class="chip" href="#${k === 'announce' ? 'announcements' : k}">${ic} ${l}${items(k).length ? ` <em>${items(k).length}</em>` : ''}</a>`).join('')}</nav>
${!s ? `<p class="dx-guest card">🔒 Club docs are for squad members only. <a href="${esc(loginUrl())}">Log in with Discord</a> for the members’ docs.</p>` : ''}${shown.map(section).join('')}`;
      const slot = $('[data-glossary-static]', root);
      if (slot && staticGlossary) { slot.append(staticGlossary); staticGlossary.hidden = false; }
      const target = location.hash.startsWith('#d-') && byHash(root);
      const area = !target && location.hash.length > 1 && byHash(root); // /docs.html#rules etc. – the sections are drawn after load, so the browser can't scroll to them itself
      if (area) setTimeout(() => area.scrollIntoView({ block: 'start', behavior: 'instant' }), 150); // after the glossary slot below has been filled, and instant: the page's smooth scrolling gets cancelled by late layout
      if (target) { if (target.tagName === 'DETAILS') target.open = true; target.classList.add('flash'); target.scrollIntoView({ block: 'center' }); }
    }

    async function edit(area, item) {
      const draft = item ? { id: item.id, title: item.title, body: item.body, pinned: item.pinned, public: item.public, ack: true } : { title: '', body: '', pinned: false, public: area === 'requirements' || area === 'faq' || area === 'glossary', notify: area === 'announce', ack: area === 'rules' };
      let d = draft;
      for (;;) {
        const t = area === 'announce' && !item && S.canDiscord ? await discordTargets() : null;
        const fields = [
          { name: 'pinned', label: '📌 Pin to the top' },
          ...(area === 'announce' && !item ? [{ name: 'notify', label: '🔔 Notify members', tip: '(site bell + Discord DM, per their settings)' }, { name: 'ack', label: '✋ Members must acknowledge it' }] : []),
          ...(area === 'rules' ? [{ name: 'ack', label: '✋ Everyone must acknowledge the rules again', tip: '(untick for typo fixes)' }] : []),
          ...(t ? [{ name: 'discordOn', label: '💬 Also post it to Discord' }, { html: `<div class="dx-dc" hidden>${pickers(t)}</div>` }] : []),
        ];
        const f = await editor({ title: item ? `Edit ${AREA[area].l.toLowerCase().replace(/s$/, '')}` : `New ${AREA[area].l.toLowerCase().replace(/s$/, '')}`, icon: AREA[area].ic, draft: d, fields, area });
        if (!f) return;
        d = f;
        try {
          const r = await call('/api/docs', { id: item?.id, area, title: f.title, body: f.body, pinned: f.pinned, public: f.public, ack: f.ack, notify: f.notify, discord: f.discordOn && t?.ready ? { channel: f.channel, role: f.role } : undefined });
          S = r; paint();
          toast([item ? 'Saved' : 'Published', r.rulesVersion ? '· members asked to acknowledge' : '', r.notified ? `· ${r.notified} notified` : ''].filter(Boolean).join(' '));
          if (r.discord && !r.discord.ok) toast(`Discord: ${r.discord.error}`, true);
          else if (r.discord?.ok) toast('Posted to Discord 📣');
          return;
        } catch (e) { toast(e.message, true); }
      }
    }
    async function acks() {
      let a;
      try { a = await call('/api/docs/acks'); } catch (e) { return toast(e.message, true); }
      const row = (u, sub) => `<li>${UI.member({ id: u.id, n: u.n, a: u.a, sub, href: `${BASE}member.html?u=${encodeURIComponent(u.id)}` }, { size: 26 })}</li>`;
      const v = await UI.modal({
        title: `Rules v${a.version} – acknowledgements`, icon: '👥', wide: true,
        body: `<p class="muted small">${a.acked.length} of ${a.acked.length + a.missing.length} active members (logged in within 6 months).${a.updatedAt ? ` Rules last changed ${day(a.updatedAt)}.` : ''}</p>
<div class="dx-acks"><div><h4>✋ Still to acknowledge <em>${a.missing.length}</em></h4>${a.missing.length ? `<ul>${a.missing.map((u) => row(u, `last seen ${UI.ago(u.last)}`)).join('')}</ul>` : '<p class="muted">Everyone’s done 🎉</p>'}</div>
<div><h4>✅ Acknowledged <em>${a.acked.length}</em></h4>${a.acked.length ? `<ul>${a.acked.map((u) => row(u, day(u.at))).join('')}</ul>` : '<p class="muted">Nobody yet.</p>'}</div></div>`,
        actions: [{ label: 'Close', value: null, kind: 'ghost' }, ...(a.missing.length ? [{ label: `🔔 Remind ${a.missing.length}`, value: 'remind' }] : [])],
      });
      if (v !== 'remind') return;
      try { const r = await call('/api/docs/remind', {}); toast(r.sent ? `Reminder sent to ${r.sent}` : 'Nobody could be reminded (notifications may be off for them)'); } catch (e) { toast(e.message, true); }
    }

    root.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b || !root.contains(b)) return;
      const d = b.dataset, item = S.items.find((x) => x.id === +(d.edit || d.hist || d.dc || d.rm));
      if (d.new) edit(d.new);
      if (d.edit) edit(item.area, item);
      if (d.hist) showHistory(item.id, (r) => { S = r; paint(); });
      if (d.dc) toDiscord(item, (r) => { S = r; paint(); });
      if (d.rm && await UI.confirm({ title: 'Remove this?', text: `“${item.title}” disappears for everyone. Its history is kept.`, ok: 'Remove', danger: true })) {
        try { S = await call('/api/docs/remove', { id: item.id }); paint(); toast('Removed'); } catch (er) { toast(er.message, true); }
      }
      if (d.ack !== undefined) {
        S.rules = { ...S.rules, acked: true, ackedAt: Date.now() }; paint(); // optimistic
        try { S = await call('/api/docs/ack', {}); paint(); toast('Thanks – rules acknowledged ✓'); } catch (er) { toast(er.message, true); load().catch(() => {}); }
      }
      if (d.acks !== undefined) acks();
    });
    root.innerHTML = UI.skeleton('cards', 3);
    try { await load(); } catch (e) { root.innerHTML = UI.empty({ icon: '📡', title: 'Could not load the docs', text: e.message }); }
  }

  // ================= P5.1 Play Style =================
  const PS = [
    ['philosophy', '🧭', 'Philosophy', { league: ['What NOREX league football looks like – our identity in one line', 'In possession: how we build, where we attack', 'Out of possession: when we press, when we drop', 'The non-negotiables everyone sticks to'], rush: ['What NOREX Rush looks like – our identity in one line', 'How the small pitch changes our game', 'Risk vs control: when to go for it', 'The non-negotiables everyone sticks to'] }],
    ['formations', '📐', 'Formations', { league: ['Our main formation and why', 'Plan B when chasing a game', 'Plan C when protecting a lead', 'Who covers which zone'], rush: ['Our usual shape and why', 'Shape when we lose the ball', 'Shape when we need a goal', 'Who covers which zone'] }],
    ['positions', '🧍', 'Position by position', { league: ['GK – distribution, sweeping, organising', 'Centre-backs & full-backs – line height, overlaps, marking', 'Midfield – who holds, who goes', 'Wingers & attackers – runs, pressing, finishing'], rush: ['Each role in our Rush setup and its job', 'Who holds, who roams', 'Pressing triggers per role', 'Comms: who calls what'] }],
    ['setpieces', '🎯', 'Set pieces', { league: ['Attacking corners – routine and who goes where', 'Defending corners – zonal or man-marking', 'Free kicks and penalties – who takes them', 'Throw-ins and kick-offs'], rush: ['Attacking restarts – our routine', 'Defending restarts', 'Penalties – who takes them', 'Kick-offs'] }],
    ['tactics', '🧠', 'Tactics & instructions', { league: ['Team tactics we use (and when we switch)', 'Player instructions by position', 'In-game adjustments at half-time', 'Comms calls we all use'], rush: ['How we set up tactically', 'Player instructions by role', 'Adjustments between games', 'Comms calls we all use'] }],
  ];
  async function playStyle(root) {
    await mdReady();
    let S = null;
    const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
    let mode = location.hash.startsWith('#rush') ? 'rush' : location.hash.startsWith('#league') ? 'league' : ls.get('norex_mode') === 'rush' ? 'rush' : 'league';
    const row = (sec) => S.sections.find((x) => x.mode === mode && x.section === sec);
    const sec = ([k, ic, label, ph]) => {
      const r = row(k);
      return `<section class="card ps-sec${r ? '' : ' ph'}" id="${mode}-${k}" style="--i:${PS.findIndex((x) => x[0] === k)}"><header><span class="ps-ic" aria-hidden="true">${ic}</span><h2>${esc(r?.title || label)}</h2>${r ? '' : UI.pill('Placeholder', { emoji: '🚧', tone: 'gold', tip: 'A manager hasn’t written this part yet' })}</header>
${r?.body ? `<div class="md">${md(r.body)}</div>` : `<p class="muted">What goes here:</p><ul class="ps-outline">${ph[mode].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`}
<footer>${r ? `<small class="muted">Updated by ${esc(r.editedBy || r.by || '–')} · ${UI.time(r.editedAt || r.at)}${r.version > 1 ? ` · v${r.version}` : ''}</small>` : '<span></span>'}${S.canEdit ? `<div class="dx-tools"><button type="button" class="btn sm ghost" data-ps="${k}">✏️ ${r ? 'Edit' : 'Write'}</button>${r?.version > 1 ? `<button type="button" class="btn sm ghost" data-hist="${r.id}">🕘 History</button>` : ''}</div>` : ''}</footer></section>`;
    };
    function paint() {
      root.innerHTML = `<div class="ps-bar">${UI.tabsHtml([['league', '🏆 League'], ['rush', '⚡ Rush']], mode, 'ps-modes')}<nav class="chipset ps-index" aria-label="Sections">${PS.map(([k, ic, label]) => `<a class="chip" href="#${mode}-${k}">${ic} ${label}</a>`).join('')}</nav></div>
<div class="ps-grid">${PS.map(sec).join('')}</div>
${S.canEdit ? '<p class="muted small">✍️ Managers: write each part in your own words – text, pictures and video links. Interactive formation boards come later.</p>' : ''}`;
      UI.tabs($('.ps-modes', root), (k) => { mode = k; ls.set('norex_mode', k); history.replaceState(null, '', `#${k}`); paint(); $('.ps-modes [aria-selected=true]', root)?.focus(); });
      const target = byHash(root);
      if (target?.classList.contains('ps-sec')) { target.classList.add('flash'); target.scrollIntoView({ block: 'start' }); }
    }
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.hist) showHistory(+b.dataset.hist, async () => { S = await call('/api/playstyle'); paint(); });
      const k = b.dataset.ps;
      if (!k) return;
      const [, ic, label] = PS.find((x) => x[0] === k), r = row(k);
      let d = { title: r?.title || label, body: r?.body || '' };
      for (;;) {
        const f = await editor({ title: `${mode === 'rush' ? '⚡ Rush' : '🏆 League'} · ${label}`, icon: ic, draft: d });
        if (!f) return;
        d = f;
        try { S = await call('/api/playstyle', { mode, section: k, title: f.title, body: f.body }); paint(); toast('Play Style saved'); return; } catch (er) { toast(er.message, true); }
      }
    });
    if (!session()) { root.innerHTML = UI.empty({ icon: '🔒', title: 'Members only', text: 'Log in with Discord to read how NOREX plays.', action: `<a class="btn discord" href="${esc(loginUrl())}">Log in with Discord</a>` }); return; }
    root.innerHTML = UI.skeleton('cards', 3);
    try { S = await call('/api/playstyle'); paint(); } catch (e) { root.innerHTML = UI.empty({ icon: '📡', title: 'Could not load Play Style', text: e.message }); }
  }

  // ================= home page news strip =================
  async function news(el) {
    try {
      const { items } = await call('/api/docs');
      const a = items.filter((x) => x.area === 'announce').sort((x, y) => y.pinned - x.pinned || y.at - x.at)[0];
      if (!a) return;
      await mdReady();
      el.innerHTML = `<a class="dx-news reveal in" href="${BASE}docs.html#d-${a.id}"><span class="dx-news-ic" aria-hidden="true">📣</span><span><small>${a.pinned ? '📌 Pinned · ' : ''}Club news · ${day(a.at)}</small><b>${esc(a.title)}</b>${a.body ? `<em>${esc(NXMd.excerpt(a.body, 140))}</em>` : ''}</span><i aria-hidden="true">→</i></a>`;
      el.hidden = false;
    } catch {}
  }

  // ================= P5.4 suggestion box (Squad Hub tab) =================
  const ST = { open: ['💭', 'Open', ''], planned: ['🗓️', 'Planned', 'gold'], done: ['✅', 'Done', 'win'], declined: ['🚫', 'Not for now', 'loss'] };
  function ideas(el, ctx) {
    let S = null, sort = 'top', filter = 'all', draft = { title: '', body: '', anon: false };
    const load = async () => { S = await ctx.call('/api/suggestions'); paint(); };
    const list = () => S.items.filter((x) => filter === 'all' || x.status === filter)
      .sort(sort === 'new' ? (a, b) => b.at - a.at : (a, b) => (a.status === 'done' || a.status === 'declined') - (b.status === 'done' || b.status === 'declined') || b.up - a.up || b.at - a.at);
    const who = (x) => (x.by ? `${UI.member({ id: x.by.id, n: x.by.n, a: x.by.a, sub: x.anon ? '🕶️ anonymous to members' : '' }, { size: 22 })}` : '<span class="ix-anon">🕶️ Anonymous</span>');
    const item = (x) => `<article class="card ix-item st-${x.status}" data-id="${x.id}">
<button type="button" class="ix-vote${x.voted ? ' on' : ''}" data-vote${x.own ? ' disabled data-tip="Your own idea"' : ''} aria-pressed="${x.voted}" aria-label="Upvote (${x.up})"><span aria-hidden="true">▲</span><b>${x.up}</b></button>
<div class="ix-main"><header><h3>${esc(x.title)}</h3>${UI.pill(ST[x.status][1], { emoji: ST[x.status][0], tone: ST[x.status][2] })}</header>
${x.body ? `<p>${esc(x.body).replace(/\n/g, '<br>')}</p>` : ''}
${x.reply ? `<blockquote class="ix-reply"><small>🛡️ ${esc(x.repliedBy || 'Manager')} · ${UI.time(x.repliedAt)}</small>${esc(x.reply).replace(/\n/g, '<br>')}</blockquote>` : ''}
<footer>${who(x)}<small class="muted">${UI.time(x.at)}</small><span class="grow"></span>${S.canDecide ? `<button type="button" class="btn sm ghost" data-decide>🛡️ Status & reply</button>` : ''}${x.own || S.canDecide ? `<button type="button" class="btn sm ghost" data-rm aria-label="Remove">🗑</button>` : ''}</footer></div></article>`;
    function paint() {
      const n = (k) => S.items.filter((x) => k === 'all' || x.status === k).length;
      const shown = list();
      el.innerHTML = `<form class="card ix-form" id="ix-form"><h3>💡 Got an idea for the club?</h3>
<input name="title" maxlength="100" placeholder="Sum it up in a few words" value="${esc(draft.title)}" required>
<textarea name="body" rows="3" maxlength="1000" placeholder="Details (optional) – what, why, how">${esc(draft.body)}</textarea>
<div class="row"><label class="dx-check"><input type="checkbox" name="anon"${draft.anon ? ' checked' : ''}> <span>🕶️ Hide my name from other members <small class="muted">(managers still see it)</small></span></label><span class="grow"></span><button class="btn" type="submit">Send idea</button></div></form>
<div class="ix-bar"><div class="chipset">${[['top', '🔥 Top'], ['new', '🆕 New']].map(([k, l]) => `<button type="button" class="chip${sort === k ? ' on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div>
<div class="chipset">${[['all', '📋 All'], ...Object.entries(ST).map(([k, [ic, l]]) => [k, `${ic} ${l}`])].map(([k, l]) => `<button type="button" class="chip${filter === k ? ' on' : ''}" data-filter="${k}">${l} <em>${n(k)}</em></button>`).join('')}</div></div>
${shown.length ? `<div class="ix-list">${shown.map(item).join('')}</div>` : UI.empty({ icon: '💡', title: filter === 'all' ? 'No ideas yet' : 'Nothing here', text: filter === 'all' ? 'Be the first – what would make NOREX better?' : 'Try another filter.' })}`;
    }
    const readForm = (e) => { const f = e.target.form; if (f?.id !== 'ix-form') return; const v = (n) => f.elements.namedItem(n); draft = { title: v('title').value, body: v('body').value, anon: v('anon').checked }; };
    el.addEventListener('input', readForm);
    el.addEventListener('change', readForm);
    el.addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = $('button[type=submit]', e.target);
      b.disabled = true;
      try { S = await ctx.call('/api/suggestions', draft); draft = { title: '', body: '', anon: false }; sort = 'new'; filter = 'all'; paint(); ctx.toast('Idea sent – thanks! 💡'); } catch (er) { b.disabled = false; ctx.toast(er.message, true); }
    });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b) || b.type === 'submit') return;
      if (b.dataset.sort) { sort = b.dataset.sort; return paint(); }
      if (b.dataset.filter) { filter = b.dataset.filter; return paint(); }
      const x = S.items.find((i) => i.id === +b.closest('[data-id]')?.dataset.id);
      if (!x) return;
      if (b.dataset.vote !== undefined) {
        const on = !x.voted;
        x.voted = on; x.up += on ? 1 : -1; paint(); // optimistic
        try { S = await ctx.call('/api/suggestions/vote', { id: x.id, on }); paint(); } catch (er) { x.voted = !on; x.up += on ? -1 : 1; paint(); ctx.toast(er.message, true); }
      }
      if (b.dataset.rm !== undefined && await UI.confirm({ title: 'Remove this idea?', text: `“${x.title}” and its votes disappear.`, ok: 'Remove', danger: true })) {
        try { S = await ctx.call('/api/suggestions/remove', { id: x.id }); paint(); ctx.toast('Removed'); } catch (er) { ctx.toast(er.message, true); }
      }
      if (b.dataset.decide !== undefined) {
        let f = { status: x.status, reply: x.reply ?? '' };
        const v = await UI.modal({
          title: x.title, icon: '🛡️',
          body: `${x.by ? `<p class="muted small">From ${esc(x.by.n)}${x.anon ? ' (anonymous to members)' : ''}</p>` : ''}<div class="chipset ix-status">${Object.entries(ST).map(([k, [ic, l]]) => `<label class="chip"><input type="radio" name="st" value="${k}"${k === x.status ? ' checked' : ''}> ${ic} ${l}</label>`).join('')}</div>
<label class="ix-reply-in">Reply <small class="muted">(shown under the idea; the author gets a notification)</small><textarea rows="4" maxlength="500">${esc(f.reply)}</textarea></label>`,
          actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: 'Save', value: 'ok' }],
          onOpen: (d) => { const rd = () => { f = { status: $('input[name=st]:checked', d)?.value ?? x.status, reply: $('textarea', d).value }; }; d.addEventListener('input', rd); d.addEventListener('change', rd); },
        });
        if (v !== 'ok') return;
        try { S = await ctx.call('/api/suggestions/decide', { id: x.id, ...f }); paint(); ctx.toast(`Marked ${ST[f.status][1].toLowerCase()}`); } catch (er) { ctx.toast(er.message, true); }
      }
    });
    el.innerHTML = UI.skeleton('rows', 4);
    load().catch((e) => { el.innerHTML = UI.empty({ icon: '📡', title: 'Could not load the ideas', text: e.message }); });
  }

  window.NXDocs = { hub, playStyle, news, ideas };
  // Pages mount themselves after app.js has run (it un-hides [data-flag] parts for whoever is looking).
  document.addEventListener('DOMContentLoaded', () => {
    const d = $('[data-docs]'), p = $('[data-playstyle]');
    if (d && !d.closest('[hidden]')) hub(d);
    if (p && !p.closest('[hidden]')) playStyle(p);
  });
})();
