// Rush squad builder on the client (roadmap P3.5) – Squad Hub → 🤝 Squads.
//   Members (verified player + Rush positions): pick up to 10 teammates you like playing with, best first (private –
//   only managers see them). Everyone sees the latest published squads with their chemistry.
//   Managers: pick who's available (everyone, or the ✅ list of an upcoming Rush event) → Generate (web/squadgen.js runs
//   here in the browser) → tap two players to swap them, 🔒 lock a squad and regenerate the rest → save a draft or publish
//   (everyone in a squad is told, optional Discord post).
// ctx = { call, toast, me: { u, n, a } }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const BASE = document.body.dataset.base || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const load = (f) => new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement(f.endsWith('.css') ? 'link' : 'script'), f.endsWith('.css') ? { rel: 'stylesheet', href: `${BASE}assets/${f}`, onload: ok, onerror: no } : { src: `${BASE}assets/${f}`, onload: ok, onerror: no })));
  if (!$('link[href$="squads.css"]')) load('squads.css').catch(() => {});
  const chemTone = (c) => (c >= 70 ? 'hi' : c >= 45 ? 'mid' : 'lo');
  const role = (r) => (r === 'FLEX' ? 'Flex' : r);

  function tab(el, ctx) {
    let S = null, D = null, pick = null, src = 'all', q = '', draftPrefs = null, targets = null;
    const byId = () => new Map(S.candidates.map((c) => [c.id, c]));
    const fetchState = async () => { S = await ctx.call('/api/squads'); draftPrefs = draftPrefs ?? [...S.me.prefs]; paint(); };

    function prefsBox() {
      if (!S.me.unlocked) return `<section class="card sq-lock">${UI.empty({ icon: '🔒', title: 'Rush squads unlock with a verified player + your Rush positions', text: S.me.reason === 'claim' ? 'Claim your player in My NOREX – once a manager approves it, come back here.' : 'Set your Rush 1st / 2nd / 3rd positions in My NOREX → profile.', action: `<a class="btn sm" href="${BASE}members.html#me">Go to My NOREX</a>` })}</section>`;
      const m = byId();
      const others = S.candidates.filter((c) => c.id !== ctx.me.u && !draftPrefs.includes(c.id) && (!q || c.n.toLowerCase().includes(q)));
      const changed = JSON.stringify(draftPrefs) !== JSON.stringify(S.me.prefs);
      return `<section class="card sq-prefs"><h3>🤝 Who do you play best with?</h3><p class="muted small">Up to 10 teammates, best first. <b>Only managers see this list</b> – the generator puts people who pick each other together.</p>
<ol class="sq-ranked">${draftPrefs.map((id, i) => { const c = m.get(id); return `<li>${UI.member({ id, n: c?.n ?? 'Member', a: c?.a, sub: (c?.pos ?? []).join(' / ') }, { size: 26 })}<span class="grow"></span><button type="button" class="sq-mini" data-up="${i}" aria-label="Move up"${i ? '' : ' disabled'}>↑</button><button type="button" class="sq-mini" data-down="${i}" aria-label="Move down"${i < draftPrefs.length - 1 ? '' : ' disabled'}>↓</button><button type="button" class="sq-mini" data-rm="${i}" aria-label="Remove">✕</button></li>`; }).join('') || '<li class="muted small">Nobody picked yet – add teammates below.</li>'}</ol>
${draftPrefs.length < 10 ? `<input type="search" class="sq-q" placeholder="Find a teammate…" value="${esc(q)}"><div class="sq-add">${others.slice(0, 30).map((c) => `<button type="button" class="sq-chip" data-add="${esc(c.id)}">${UI.avatar(c.a, c.n, 22)} ${esc(c.n)} <small>${esc(c.pos.join('/'))}</small></button>`).join('') || '<p class="muted small">No more teammates to add.</p>'}</div>` : '<p class="muted small">That’s 10 – remove someone to add another.</p>'}
<div class="row"><span class="grow"></span><button type="button" class="btn sm" data-saveprefs${changed ? '' : ' disabled'}>💾 Save my list</button></div></section>`;
    }
    function squadCards(set, { edit = false } = {}) {
      const m = byId();
      const card = (s, i) => `<article class="card sq-card${s.locked ? ' locked' : ''}"><header><b>Squad ${i + 1}</b><span class="sq-chem ${chemTone(s.chemistry)}" data-tip="Mutual picks + position fit"><i style="width:${s.chemistry}%"></i><em>${s.chemistry}</em></span>${edit ? `<button type="button" class="sq-mini" data-lock="${i}" aria-pressed="${!!s.locked}" data-tip="${s.locked ? 'Unlock' : 'Lock – regenerate keeps this squad'}">${s.locked ? '🔒' : '🔓'}</button>` : ''}</header>
${s.missing?.length ? `<p class="small sq-miss">⚠️ No ${s.missing.join(' / ')}</p>` : ''}
<ul>${s.ids.map((id) => { const c = m.get(id); return `<li>${edit ? `<button type="button" class="sq-p${pick === id ? ' sel' : ''}" data-p="${esc(id)}">` : '<span class="sq-p">'}<span class="sq-role">${esc(role(s.roles?.[id]))}</span>${UI.avatar(c?.a, c?.n, 24)}<span>${esc(c?.n ?? 'Member')}</span>${id === ctx.me.u ? ' <em>you</em>' : ''}${edit ? '</button>' : '</span>'}</li>`; }).join('')}</ul></article>`;
      return `<div class="sq-cards">${set.squads.map(card).join('')}</div>${set.bench?.length ? `<p class="small sq-bench"><b>🪑 Bench</b> ${set.bench.map((id) => (edit ? `<button type="button" class="sq-p sm${pick === id ? ' sel' : ''}" data-p="${esc(id)}">${esc(m.get(id)?.n ?? 'Member')}</button>` : esc(m.get(id)?.n ?? 'Member'))).join(' ')}</p>` : ''}`;
    }
    function published() {
      const P = S.published;
      if (!P) return `<section class="sq-pub">${UI.empty({ icon: '🤝', title: 'No squads published yet', text: 'Managers generate them from everyone’s picks and positions.' })}</section>`;
      const mine = P.squads.findIndex((s) => s.ids.includes(ctx.me.u));
      return `<section class="sq-pub"><h3>📣 ${esc(P.title)} <small class="muted">published ${UI.ago(P.publishedAt)}</small></h3>${mine >= 0 ? `<p class="sq-you">You’re in <b>Squad ${mine + 1}</b> as <b>${esc(role(P.squads[mine].roles[ctx.me.u]))}</b>.</p>` : ''}${squadCards(P)}</section>`;
    }
    function builder() {
      if (!S.canManage) return '';
      const pool = src === 'all' ? S.candidates.map((c) => c.id) : (S.events.find((e) => String(e.id) === src)?.yes ?? []).filter((id) => byId().has(id));
      return `<details class="card sq-build"${D ? ' open' : ''}><summary>🛡️ Build squads <small class="muted">managers</small></summary>
<div class="sq-bar"><label>Who’s playing<select data-src><option value="all"${src === 'all' ? ' selected' : ''}>Everyone who can (${S.candidates.length})</option>${S.events.map((e) => `<option value="${e.id}"${src === String(e.id) ? ' selected' : ''}>✅ ${esc(e.title)} · ${esc(new Date(e.start).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }))} (${e.yes.length})</option>`).join('')}</select></label>
<button type="button" class="btn sm" data-gen>${D ? '🔄 Regenerate' : '⚡ Generate'}</button><small class="muted">${pool.length} players → ${Math.floor(pool.length / 5)} squad${Math.floor(pool.length / 5) === 1 ? '' : 's'} of 5${pool.length % 5 ? ` + ${pool.length % 5} on the bench` : ''}</small></div>
${S.drafts?.length && !D ? `<p class="small">📝 Drafts: ${S.drafts.map((d) => `<button type="button" class="linkish" data-open="${d.id}">${esc(d.title)}</button> <button type="button" class="linkish" data-del="${d.id}" aria-label="Delete draft">🗑</button>`).join(' · ')}</p>` : ''}
${D ? `<p class="muted small">Tap two players to swap them (bench included). 🔒 keeps a squad when you regenerate.</p>${squadCards(D, { edit: true })}
<div class="sq-save"><input data-title maxlength="60" placeholder="Title, e.g. Friday Rush" value="${esc(D.title ?? '')}">${targets?.ready ? `<select data-ch><option value="">No Discord post</option>${targets.channels.map((c) => `<option value="${esc(c.id)}"${c.id === targets.last ? ' selected' : ''}>${c.news ? '📢' : '#'} ${esc(c.name)}</option>`).join('')}</select>` : ''}
<button type="button" class="btn sm ghost" data-save>💾 Save draft</button><button type="button" class="btn sm" data-publish>📣 Publish</button><button type="button" class="linkish" data-discard>discard</button></div>` : ''}
<details class="sq-all"><summary>👀 Everyone’s picks</summary>${Object.keys(S.prefsAll ?? {}).length ? `<ul>${Object.entries(S.prefsAll).map(([u, ids]) => `<li><b>${esc(byId().get(u)?.n ?? 'Member')}</b> → ${ids.map((x, i) => `${i + 1}. ${esc(byId().get(x)?.n ?? '?')}`).join(', ') || '–'}</li>`).join('')}</ul>` : '<p class="muted small">Nobody has picked teammates yet.</p>'}</details></details>`;
    }
    function paint() { el.innerHTML = `${prefsBox()}${published()}${builder()}`; }
    const rescore = () => {
      const m = byId();
      for (const s of D.squads) { const sc = NXSquadGen.squadScore(s.ids.map((id) => m.get(id)), S.prefsAll ?? {}); Object.assign(s, { roles: sc.roles, chemistry: sc.chemistry, missing: sc.missing }); }
    };
    async function generate() {
      if (!window.NXSquadGen) await load('squadgen.js');
      const m = byId();
      const poolIds = src === 'all' ? S.candidates.map((c) => c.id) : (S.events.find((e) => String(e.id) === src)?.yes ?? []).filter((id) => m.has(id));
      const locked = (D?.squads ?? []).filter((s) => s.locked).map((s) => s.ids);
      const pool = [...new Set([...poolIds, ...locked.flat()])].map((id) => m.get(id)).filter(Boolean);
      if (pool.length < 2) return ctx.toast('Not enough players who can play Rush squads yet', true);
      const r = NXSquadGen.generate(pool, S.prefsAll ?? {}, { size: 5, locked });
      D = { id: D?.id, title: D?.title ?? '', event: src === 'all' ? null : +src, squads: r.squads.length ? r.squads : [{ ids: r.bench.splice(0, 5), locked: false }], bench: r.bench };
      rescore();
      if (!targets) targets = await ctx.call('/api/events/discord').catch(() => ({ ready: false }));
      paint();
    }
    function swap(a, b) {
      const where = (id) => { for (const [i, s] of D.squads.entries()) { const j = s.ids.indexOf(id); if (j >= 0) return [s.ids, j]; } const j = D.bench.indexOf(id); return j >= 0 ? [D.bench, j] : null; };
      const A = where(a), B = where(b);
      if (!A || !B) return;
      [A[0][A[1]], B[0][B[1]]] = [B[0][B[1]], A[0][A[1]]];
      rescore();
    }
    async function save(publish) {
      const title = $('[data-title]', el)?.value ?? D.title;
      const channel = $('[data-ch]', el)?.value || undefined;
      if (publish && !(await UI.confirm({ title: 'Publish these squads?', text: 'Everyone in a squad gets told their squad and role, and all members see them in the Hub.', ok: 'Publish' }))) return;
      try {
        const r = await ctx.call('/api/squads/save', { id: D.id, title, event: D.event, squads: D.squads.map((s) => ({ ids: s.ids, locked: !!s.locked })), bench: D.bench, publish, channel });
        S = r; D = publish ? null : { ...D, id: r.id, title }; paint();
        ctx.toast(publish ? `Published · ${r.notified} players told${r.discord?.ok ? ' · posted to Discord' : ''}` : 'Draft saved');
        if (r.discord && !r.discord.ok) ctx.toast(`Discord: ${r.discord.error}`, true);
      } catch (er) { ctx.toast(er.message, true); }
    }

    el.addEventListener('input', (e) => { if (e.target.matches('.sq-q')) { q = e.target.value.trim().toLowerCase(); paint(); $('.sq-q', el)?.focus(); } if (e.target.matches('[data-title]') && D) D.title = e.target.value; });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-src]')) { src = e.target.value; paint(); } });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b)) return;
      const d = b.dataset;
      if (d.add) { draftPrefs.push(d.add); q = ''; paint(); }
      if (d.rm) { draftPrefs.splice(+d.rm, 1); paint(); }
      if (d.up) { const i = +d.up; [draftPrefs[i - 1], draftPrefs[i]] = [draftPrefs[i], draftPrefs[i - 1]]; paint(); }
      if (d.down) { const i = +d.down; [draftPrefs[i + 1], draftPrefs[i]] = [draftPrefs[i], draftPrefs[i + 1]]; paint(); }
      if (d.saveprefs !== undefined) { try { S = await ctx.call('/api/squads/prefs', { ids: draftPrefs }); draftPrefs = [...S.me.prefs]; paint(); ctx.toast('Saved – only managers see your list'); } catch (er) { ctx.toast(er.message, true); } }
      if (d.gen !== undefined) generate().catch((er) => ctx.toast(er.message, true));
      if (d.p) { if (!pick) pick = d.p; else if (pick === d.p) pick = null; else { swap(pick, d.p); pick = null; } paint(); }
      if (d.lock) { const s = D.squads[+d.lock]; s.locked = !s.locked; paint(); }
      if (d.save !== undefined) save(false);
      if (d.publish !== undefined) save(true);
      if (d.discard !== undefined) { D = null; pick = null; paint(); }
      if (d.open) { const dr = S.drafts.find((x) => x.id === +d.open); if (!window.NXSquadGen) await load('squadgen.js'); D = JSON.parse(JSON.stringify(dr)); if (!targets) targets = await ctx.call('/api/events/discord').catch(() => ({ ready: false })); paint(); }
      if (d.del && await UI.confirm({ title: 'Delete this draft?', ok: 'Delete', danger: true })) { try { S = await ctx.call('/api/squads/delete', { id: +d.del }); paint(); } catch (er) { ctx.toast(er.message, true); } }
    });
    el.innerHTML = UI.skeleton('cards', 2);
    fetchState().catch((er) => { el.innerHTML = UI.empty({ icon: '📡', title: 'Could not load Rush squads', text: er.message }); });
  }

  window.NXSquads = { tab };
})();
