// Game data on the client (roadmap P1.7 / PB.1). Loaded by the updates page and, on first use, by the manager
// portal's "Game rules" tab. NXGame.load() is how anything that needs the max level (builder sandbox, Pro Builds)
// gets the newest game-rules version: live from the Worker, else the site's seed file.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '';
  const API = document.body.dataset.api;
  if (!$('link[href$="game.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/game.css` }));
  let cached;
  const load = () => (cached ??= (API ? fetch(`${API}/api/game`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject())) : Promise.reject())
    .catch(() => fetch(`${BASE}api/game.json`).then((r) => r.json())));

  // Everything marked data-game-* shows the live values (cap changes need no rebuild).
  function paint(g) {
    const cap = g.levelCap || {};
    $$('[data-game-cap]').forEach((el) => { el.textContent = cap.value ?? '–'; });
    $$('[data-game-version]').forEach((el) => { el.textContent = g.version; });
    $$('[data-game-verified]').forEach((el) => { el.textContent = cap.verified ? '✓ Official' : 'Unverified'; el.classList.toggle('home', !!cap.verified); });
    $$('[data-game-note]').forEach((el) => { el.textContent = cap.verified ? (g.publishedAt ? `Confirmed ${new Date(g.publishedAt).toLocaleDateString()}` : 'Confirmed by EA') : cap.note || 'Waiting for an official number from EA.'; });
  }
  if ($('[data-game]')) load().then(paint).catch(() => {});

  // ---------- updates page: chips + search ----------
  const list = $('.upd-list');
  if (list) {
    let f = 'all';
    const q = $('[data-upd-search]');
    const apply = () => {
      const words = (q.value || '').toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      $$('.upd', list).forEach((a) => {
        const ok = (f === 'all' || a.dataset.tags.split(' ').includes(f)) && words.every((w) => a.dataset.text.includes(w));
        a.hidden = !ok;
        if (ok) { shown++; a.classList.add('in'); }
      });
      $('[data-upd-none]').hidden = shown > 0;
    };
    $('[data-upd-filter]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      f = b.dataset.f;
      $$('[data-upd-filter] .chip').forEach((c) => c.classList.toggle('on', c === b));
      apply();
    });
    q.addEventListener('input', apply);
    // Deep link #slug opens that entry's sections.
    const hit = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (hit?.classList.contains('upd')) { const d = $('details', hit); if (d) d.open = true; }
  }

  // ---------- manager portal: Game rules (mounted by app.js into #game-admin) ----------
  const G = { data: null, busy: false, err: null, form: null };
  const ago = (t) => (window.UI?.ago ? UI.ago(t) : new Date(t).toLocaleDateString());
  const bump = (v) => { const m = String(v || 'fc27').match(/^(.*?)(\d+)$/); return m && /-v$|-tu$|\.$/.test(m[1]) ? m[1] + (+m[2] + 1) : `${v}-v2`; };

  function view(el) {
    if (G.err && !G.data) return `<p class="muted">${esc(G.err)}</p>`;
    if (!G.data) return window.UI ? UI.skeleton('rows', 4) : '…';
    const { current: c, versions, pending, keys } = G.data;
    const cap = c.levelCap || {};
    const fm = G.form ?? { version: bump(c.version), levelCap: cap.value ?? '', verified: !!cap.verified, source: cap.verified ? cap.source : '', note: '', changes: '', pending: null };
    G.form = fm;
    const pend = pending.filter((p) => !p.same);
    return `<div class="ga">
<div class="ga-now"><div><small>🔝 Max level now</small><b>${esc(cap.value ?? '–')}</b>${cap.verified ? '<span class="tag home">✓ Official</span>' : '<span class="tag">Unverified</span>'}</div>
<div class="muted small">Version <code>${esc(c.version)}</code>${c.publishedBy ? ` · by ${esc(c.publishedBy)} ${ago(c.publishedAt)}` : ' · starting dataset'}<br>The builder sandbox and Pro Builds read this version. Changing the max level here changes MAX everywhere – no code change.</div></div>
<h3>📢 From EA's patch notes${pend.length ? ` (${pend.length})` : ''}</h3>
${pend.length ? `<div class="ga-pend">${pend.map((p) => `<div class="card ga-hit"><div class="row"><b>${esc(p.title)}</b><small class="muted">${esc(String(p.published).slice(0, 10))} · ${esc(p.section)}</small></div>
<q>${esc(p.quote)}</q><div class="row">${p.value ? `<span class="tag owner">Level ${esc(p.value)}</span>` : '<span class="muted small">No number in this sentence – check the note.</span>'}<span class="grow"></span>
<a class="btn ghost sm" href="${esc(p.url)}" target="_blank" rel="noopener">Open note ↗</a>${p.value ? `<button class="btn sm" type="button" data-ga="apply" data-id="${esc(p.id)}">✅ Set max level ${esc(p.value)}</button>` : `<button class="btn sm" type="button" data-ga="use" data-id="${esc(p.id)}">Use in form</button>`}<button class="btn ghost sm" type="button" data-ga="dismiss" data-id="${esc(p.id)}">Dismiss</button></div></div>`).join('')}</div>`
    : (window.UI ? UI.empty({ icon: '🎉', title: 'Nothing to confirm', text: 'When EA’s Pitch Notes mention a level cap, it shows up here for one-click confirmation.' }) : '')}
<h3 style="margin-top:22px">🛠 Publish a new version</h3>
<form class="ga-form" data-ga-form>
<label>Version name<input name="version" value="${esc(fm.version)}" maxlength="40" required pattern="[a-z0-9][a-z0-9.\\-]*" placeholder="fc27-tu2"></label>
<label>Max level<input name="levelCap" type="number" min="1" max="200" value="${esc(fm.levelCap)}" required></label>
<label class="ga-chk"><input name="verified" type="checkbox"${fm.verified ? ' checked' : ''}> Confirmed by an official EA note</label>
<label>Source link<input name="source" type="url" value="${esc(fm.source || '')}" placeholder="https://www.ea.com/games/ea-sports-fc/fc-27/news/…"></label>
<label class="wide">Note<input name="note" value="${esc(fm.note)}" maxlength="300" placeholder="What changed, e.g. Title Update 2: cap raised"></label>
<label class="wide">Changed values <small class="muted">(optional JSON – replaces these fields: ${keys.map(esc).join(', ')})</small><textarea name="changes" rows="5" spellcheck="false" placeholder='{"apPerLevel": [2, 2, 3]}'>${esc(fm.changes)}</textarea></label>
<div class="wide row"><button class="btn" type="submit"${G.busy ? ' disabled' : ''}>🚀 Publish version</button><button class="btn ghost sm" type="button" data-ga="download">⬇ Current dataset (JSON)</button></div>
</form>
<h3 style="margin-top:22px">🗂 History</h3>
<div class="tbl"><table><thead><tr><th>Version</th><th class="n">Max level</th><th>Status</th><th>Note</th><th>By</th><th>When</th></tr></thead><tbody>${versions.map((v, i) => `<tr${i ? '' : ' class="ga-cur"'}><td><code>${esc(v.version)}</code>${i ? '' : ' <span class="tag home">live</span>'}</td><td class="n"><b>${esc(v.cap ?? '–')}</b></td><td>${v.verified ? `<a href="${esc(v.source)}" target="_blank" rel="noopener">✓ official</a>` : 'unverified'}</td><td>${esc(v.note || '–')}</td><td>${esc(v.by || '–')}</td><td>${v.at ? ago(v.at) : '–'}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function readForm(el) {
    const f = $('[data-ga-form]', el);
    if (!f) return;
    G.form = { ...G.form, version: f.version.value.trim(), levelCap: f.levelCap.value, verified: f.verified.checked, source: f.source.value.trim(), note: f.note.value, changes: f.changes.value };
  }

  async function publish(el, ctx, extra = {}) {
    readForm(el);
    const body = { ...G.form, levelCap: Number(G.form.levelCap), ...extra };
    G.busy = true; draw(el);
    try {
      G.data = await ctx.call('/api/game/publish', body);
      G.form = null; cached = null;
      ctx.toast(`Published ${body.version} – max level ${body.levelCap}`);
    } catch (e) { ctx.toast(e.message, true); }
    G.busy = false; draw(el);
  }

  function draw(el) { el.innerHTML = view(el); }

  async function portal(el, ctx) {
    draw(el);
    el.onclick = async (e) => {
      const b = e.target.closest('[data-ga]');
      if (!b) return;
      const hit = G.data?.pending.find((p) => p.id === b.dataset.id);
      if (b.dataset.ga === 'apply' && hit) {
        const ok = !window.UI || (await UI.confirm({ title: `Set max level to ${hit.value}?`, text: `Publishes a new game-rules version marked official, linked to “${hit.title}”. MAX updates everywhere straight away.`, ok: 'Publish' }));
        if (!ok) return;
        publish(el, ctx, { levelCap: hit.value, verified: true, source: hit.url, note: `${hit.title}: max level ${hit.value}`, pending: hit.id });
      }
      if (b.dataset.ga === 'use' && hit) { readForm(el); G.form = { ...G.form, verified: true, source: hit.url, note: hit.title }; G.form.pendingId = hit.id; draw(el); $('[name=levelCap]', el)?.focus(); }
      if (b.dataset.ga === 'dismiss' && hit) {
        const prev = G.data;
        G.data = { ...prev, pending: prev.pending.filter((p) => p !== hit) }; readForm(el); draw(el);
        try { G.data = await ctx.call('/api/game/dismiss', { id: hit.id }); draw(el); ctx.toast('Dismissed'); } catch (er) { G.data = prev; draw(el); ctx.toast(er.message, true); }
      }
      if (b.dataset.ga === 'download') {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify(G.data.current, null, 1)], { type: 'application/json' })), download: `${G.data.current.version}.json` });
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    };
    el.onsubmit = (e) => { e.preventDefault(); publish(el, ctx, G.form?.pendingId ? { pending: G.form.pendingId } : {}); };
    if (!G.data) {
      try { G.data = await ctx.call('/api/game/admin'); } catch (e) { G.err = e.message; ctx.toast(e.message, true); }
      if (el.isConnected) draw(el);
    }
  }

  window.NXGame = { load, portal };
})();
