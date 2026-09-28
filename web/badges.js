// Tags & community badges (P2.3) and achievements & streaks (P2.3 / P4.3) – loaded on demand by profile.js / app.js.
// window.NXBadges: tagsHtml, tagsEditor, badgesSection, hcRow, achievements, board, checkUnlocks, unlockToast.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = UI.esc;
  const BASE = document.body.dataset.base || '';
  if (!$('link[href$="badges.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/badges.css` }));

  // ================= self tags =================
  const COLOURS = [['red', 'Crest red'], ['gold', 'Gold'], ['green', 'Green'], ['blue', 'Blue'], ['purple', 'Purple'], ['grey', 'Grey']];
  const EMOJI = ['', '🧱', '🎯', '🧠', '🚀', '🪄', '🧤', '📣', '🔥', '⚡', '💪', '🐐', '👑', '🎩', '🛡️', '🦉', '😂', '🧊', '🎮', '❤️', '⭐', '🏆', '🥶', '🫡'];
  const IDEAS = [['🧱', 'The Wall', 'red'], ['🎯', 'Sniper', 'gold'], ['🧠', 'Playmaker', 'blue'], ['🦉', 'Night owl', 'purple'], ['🔥', 'Tryhard', 'red'], ['😂', 'Banter', 'green'], ['🧤', 'Safe hands', 'gold'], ['🎙️', 'On the mic', 'grey']];
  const MAX = 8;
  const tagsHtml = (tags, { max } = {}) => (tags?.length ? `<div class="bd-tags">${tags.slice(0, max ?? MAX).map((t) => `<span class="bd-tag c-${esc(t.c || 'grey')}">${t.e ? `<i aria-hidden="true">${esc(t.e)}</i>` : ''}${esc(t.t)}</span>`).join('')}${max && tags.length > max ? `<span class="bd-tag more">+${tags.length - max}</span>` : ''}</div>` : '');

  // Editor inside the Profile 2.0 form: edits `list` in place and calls onChange after every change.
  function tagsEditor(el, list, onChange) {
    const draw = () => {
      el.innerHTML = `<p class="small muted">Up to ${MAX} – serious or fun. They show on your profile and hover card.</p>
<div class="bd-tedit">${list.map((t, i) => `<div class="bd-trow" data-i="${i}">
<select data-f="e" aria-label="Emoji">${[...new Set([t.e || '', ...EMOJI])].map((e) => `<option value="${esc(e)}"${e === (t.e || '') ? ' selected' : ''}>${e || '–'}</option>`).join('')}</select>
<input data-f="t" maxlength="20" value="${esc(t.t)}" placeholder="e.g. The Wall" aria-label="Tag text">
<span class="bd-dots" role="radiogroup" aria-label="Colour">${COLOURS.map(([c, l]) => `<button type="button" class="bd-dot c-${c}${(t.c || 'grey') === c ? ' on' : ''}" data-c="${c}" role="radio" aria-checked="${(t.c || 'grey') === c}" aria-label="${l}"></button>`).join('')}</span>
<button type="button" class="bd-x" data-del aria-label="Remove tag">×</button></div>`).join('')}</div>
${list.length < MAX ? `<div class="row bd-tadd"><button type="button" class="btn sm ghost" data-add>➕ Add tag</button>${IDEAS.filter(([, t]) => !list.some((x) => x.t.toLowerCase() === t.toLowerCase())).slice(0, 5).map(([e, t, c]) => `<button type="button" class="chip" data-idea="${esc(`${e}|${t}|${c}`)}">${e} ${esc(t)}</button>`).join('')}</div>` : ''}
<div class="bd-preview">${tagsHtml(list.filter((t) => t.t.trim())) || '<small class="muted">Preview shows here.</small>'}</div>`;
    };
    const changed = (redraw) => { onChange(list); if (redraw) draw(); else $('.bd-preview', el).innerHTML = tagsHtml(list.filter((t) => t.t.trim())) || '<small class="muted">Preview shows here.</small>'; };
    el.oninput = el.onchange = (e) => {
      e.stopPropagation(); // keep the profile form's own handler out of it
      const row = e.target.closest('[data-i]');
      if (!row) return;
      list[+row.dataset.i][e.target.dataset.f] = e.target.value;
      changed(false);
    };
    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      const row = b.closest('[data-i]');
      if (b.dataset.c && row) { list[+row.dataset.i].c = b.dataset.c; changed(true); }
      if (b.dataset.del !== undefined && row) { list.splice(+row.dataset.i, 1); changed(true); }
      if (b.dataset.add !== undefined && list.length < MAX) { list.push({ t: '', e: '', c: 'red' }); changed(true); $$('[data-f="t"]', el).pop()?.focus(); }
      if (b.dataset.idea && list.length < MAX) { const [em, t, c] = b.dataset.idea.split('|'); list.push({ t, e: em, c }); changed(true); }
    };
    draw();
  }

  // ================= community badges =================
  let catalog = null;
  const giversLine = (g) => g.givers.map((x) => x.n).slice(0, 8).join(', ') + (g.givers.length > 8 ? ` +${g.givers.length - 8}` : '');
  const badgeChip = (g, i) => `<button type="button" class="bd-badge${g.mine ? ' mine' : ''}" data-g="${i}" data-tip="${esc(`Given by ${giversLine(g)}`)}" style="--d:${i * 40}ms"><i aria-hidden="true">${esc(g.icon)}</i><b>${esc(g.name)}</b>${g.n > 1 ? `<em>×${g.n}</em>` : ''}</button>`;
  // Hover-card row: top badges + achievement points (data from /api/member).
  const hcRow = (d) => {
    const bs = d.badges ?? [], a = d.ach;
    if (!bs.length && !a?.count) return '';
    return `<div class="pf-hc-row bd-hc"><small>🎖️ Badges</small><span>${bs.slice(0, 4).map((g) => `<span class="bd-mini" title="${esc(`${g.name} · given by ${giversLine(g)}`)}">${esc(g.icon)}${g.n > 1 ? `<em>${g.n}</em>` : ''}</span>`).join('')}${bs.length > 4 ? `<small>+${bs.length - 4}</small>` : ''}${a?.count ? `<span class="bd-pts" title="${a.count} of ${a.total} achievements">🏆 ${a.pts} pts ${a.top.map((x) => esc(x.icon)).join('')}</span>` : ''}</span></div>`;
  };

  // Section on member.html. m = member ({ id, n, me }), data = { badges, canRemoveBadges } from /api/member.
  function badgesSection(el, ctx, m, data) {
    let S = { badges: data.badges ?? [], canRemove: !!data.canRemoveBadges };
    const draw = () => {
      el.innerHTML = `${S.badges.length ? `<div class="bd-list">${S.badges.map(badgeChip).join('')}</div>` : UI.empty({ icon: '🎖️', title: m.me ? 'No badges yet' : `${m.n} has no badges yet`, text: m.me ? 'Teammates give badges from your profile – play well, be a good teammate!' : 'Be the first to give one.' })}
${m.me ? '' : '<div class="row"><button type="button" class="btn sm" data-give>🎖️ Give a badge</button></div>'}`;
    };
    const set = (d) => { S = { badges: d.badges, canRemove: d.canRemove }; draw(); ctx.onChange?.(); };
    async function giveDialog() {
      if (!catalog) catalog = (await ctx.call(`/api/badges?u=${encodeURIComponent(m.id)}`)).catalog;
      const mine = new Set(S.badges.filter((g) => g.mine).map((g) => g.kind));
      const dlg = UI.modal({
        title: `Give ${m.n} a badge`, icon: '🎖️', wide: true,
        body: `<p class="small muted">One of each per teammate. Tap one you gave to take it back. Managers can remove badges that aren’t OK.</p>
<div class="bd-pick">${catalog.filter((b) => b.id !== 'custom').map((b) => `<button type="button" class="bd-opt${mine.has(b.id) ? ' on' : ''}" data-kind="${esc(b.id)}"><i>${esc(b.icon)}</i><b>${esc(b.name)}</b>${mine.has(b.id) ? '<small>✓ given · tap to take back</small>' : ''}</button>`).join('')}</div>
<div class="bd-custom"><label class="fld">✏️ Or write your own <input id="bd-text" maxlength="24" placeholder="e.g. Tekkers merchant"${mine.has('custom') ? ' disabled' : ''}></label>
<button type="button" class="btn sm" data-kind="custom">${mine.has('custom') ? '↩ Take back my custom badge' : 'Give custom badge'}</button></div>`,
        actions: [{ label: 'Done', value: null, kind: 'ghost' }],
        onOpen: (d, close) => d.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-kind]');
          if (!b || b.disabled) return;
          const kind = b.dataset.kind, undo = mine.has(kind);
          b.disabled = true;
          try {
            set(await ctx.call('/api/badges', { to: m.id, kind, ...(undo ? { undo: true } : kind === 'custom' ? { text: $('#bd-text', d).value } : {}) }));
            ctx.toast(undo ? 'Badge taken back' : '🎖️ Badge given!');
            close();
          } catch (er) { ctx.toast(er.message, true); b.disabled = false; }
        }),
      });
      return dlg;
    }
    function detail(g) {
      UI.modal({
        title: g.name, icon: g.icon,
        body: `<p class="small muted">${g.n} teammate${g.n > 1 ? 's' : ''} gave ${m.me ? 'you' : esc(m.n)} this badge.</p><ul class="bd-givers">${g.givers.map((x) => `<li>${UI.member({ id: x.id, n: x.n, a: x.a, href: `${BASE}member.html?u=${encodeURIComponent(x.id)}` })}${x.rid ? `<button type="button" class="btn sm ghost danger" data-rid="${x.rid}">Remove</button>` : ''}</li>`).join('')}</ul>`,
        actions: [...(g.mine ? [{ label: '↩ Take mine back', value: 'undo', kind: 'ghost' }] : []), { label: 'Close', value: null, kind: 'ghost' }],
        onOpen: (d, close) => d.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-rid]');
          if (!b) return;
          close();
          if (!(await UI.confirm({ title: 'Remove this badge?', text: `${g.name} – it disappears from ${m.me ? 'your' : `${m.n}'s`} profile and can't be given again by that teammate.`, ok: 'Remove', danger: true }))) return;
          try { set(await ctx.call('/api/badges/remove', { id: +b.dataset.rid })); ctx.toast('Badge removed'); } catch (er) { ctx.toast(er.message, true); }
        }),
      }).then(async (v) => {
        if (v !== 'undo') return;
        try { set(await ctx.call('/api/badges', { to: m.id, kind: g.kind, undo: true })); ctx.toast('Badge taken back'); } catch (er) { ctx.toast(er.message, true); }
      });
    }
    el.onclick = (e) => {
      if (e.target.closest('[data-give]')) giveDialog().catch((er) => ctx.toast(er.message, true));
      const g = e.target.closest('[data-g]');
      if (g) detail(S.badges[+g.dataset.g]);
    };
    draw();
  }

  // ================= achievements =================
  const TIER_ICON = { common: '🥉', rare: '🥈', epic: '🥇', legendary: '💠' };
  const TIER_ORDER = ['legendary', 'epic', 'rare', 'common'];
  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const tile = (a, i = 0) => `<div class="ach t-${a.tier}${a.done ? ' on' : ''}" style="--d:${Math.min(i, 20) * 35}ms"${a.done ? '' : ` data-tip="${esc(`${a.v} / ${a.goal}`)}"`}>
<span class="ach-ic" aria-hidden="true">${a.done ? esc(a.icon) : '🔒'}</span><div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>
${a.done ? `<em>${a.at ? `Unlocked ${fmtDate(a.at)}` : 'Unlocked'}</em>` : `<span class="ach-prog"><i style="width:${Math.round((a.v / a.goal) * 100)}%"></i></span>`}</div>
<span class="ach-tier">${TIER_ICON[a.tier]} ${a.pts}</span></div>`;
  const nextUp = (list, n = 4) => list.filter((a) => !a.done && a.v > 0).sort((a, b) => b.v / b.goal - a.v / a.goal).slice(0, n);

  function achHead(d) {
    return `<div class="ach-head"><div class="ach-pts"><b class="count" data-to="${d.pts}">${d.pts}</b><small>points</small></div>
<div class="ach-sum"><div class="ach-bar" role="img" aria-label="${d.count} of ${d.total} unlocked"><i style="width:${Math.round((d.count / d.total) * 100)}%"></i></div><small>${d.count} of ${d.total} unlocked</small>
<div class="ach-tiers">${TIER_ORDER.map((t) => `<span class="ach-tp t-${t}" data-tip="${esc(`${d.tierInfo[t].label} · ${d.tierInfo[t].pts} pts each`)}">${TIER_ICON[t]} ${d.tiers[t]}</span>`).join('')}</div></div></div>`;
  }
  // Full section (member.html) – fetches /api/achievements?u=
  async function achievements(el, ctx, userId, { mine = false } = {}) {
    el.innerHTML = UI.skeleton('cards', 3);
    let d;
    try { d = await ctx.call(`/api/achievements?u=${encodeURIComponent(userId)}`); } catch (e) { el.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return null; }
    let showLocked = false;
    const draw = () => {
      const done = d.list.filter((a) => a.done).sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || (b.at ?? 0) - (a.at ?? 0));
      const locked = d.list.filter((a) => !a.done).sort((a, b) => b.v / b.goal - a.v / a.goal);
      el.innerHTML = `${achHead(d)}
${done.length ? `<div class="ach-grid">${done.map(tile).join('')}</div>` : UI.empty({ icon: '🏆', title: 'Nothing unlocked yet', text: mine ? 'Claim your player, fill in your profile and play – they unlock by themselves.' : 'They unlock automatically from stats and squad life.' })}
<button type="button" class="btn sm ghost" data-locked>${showLocked ? '🙈 Hide locked' : `🔒 Show locked (${locked.length})`}</button>
${showLocked ? `<div class="ach-grid locked">${locked.map(tile).join('')}</div>` : ''}`;
    };
    el.onclick = (e) => { if (e.target.closest('[data-locked]')) { showLocked = !showLocked; draw(); } };
    draw();
    if (mine) showFresh(d, ctx);
    return d;
  }

  // ================= unlock toast =================
  function unlockToast(list) {
    if (!list.length) return;
    const top = [...list].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
    const box = document.createElement('div');
    box.className = 'ach-pop';
    box.setAttribute('role', 'status');
    box.innerHTML = `<div class="ach-pop-card t-${top[0].tier}"><span class="ach-burst" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * (360 / 14)}deg;--c:${['var(--gold)', 'var(--red)', '#fff'][i % 3]}"></i>`).join('')}</span>
<small>${list.length > 1 ? `🏆 ${list.length} achievements unlocked!` : '🏆 Achievement unlocked!'}</small>
${top.slice(0, 3).map((a) => `<div class="ach-pop-row"><span class="ach-ic">${esc(a.icon)}</span><div><b>${esc(a.name)}</b><small>${TIER_ICON[a.tier]} ${esc(a.tier)} · +${a.pts} pts</small></div></div>`).join('')}
${list.length > 3 ? `<small class="muted">…and ${list.length - 3} more</small>` : ''}<button type="button" class="btn sm" data-close>Nice!</button></div>`;
    document.body.appendChild(box);
    const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 400); };
    box.onclick = (e) => { if (e.target === box || e.target.closest('[data-close]')) close(); };
    setTimeout(close, 7000);
  }
  function showFresh(d, ctx) {
    const fresh = d.list.filter((a) => a.fresh);
    if (!fresh.length) return;
    unlockToast(fresh);
    ctx.call('/api/achievements/seen', {}).catch(() => {});
    d.list.forEach((a) => { delete a.fresh; });
  }
  // Squad Hub start: toast any unseen unlocks. Returns the achievements (or null).
  async function checkUnlocks(ctx) {
    try { const d = await ctx.call('/api/achievements'); showFresh(d, ctx); return d; } catch { return null; }
  }

  // ================= points leaderboard =================
  async function board(el, ctx) {
    el.innerHTML = UI.skeleton('rows', 5);
    try {
      const { board: rows } = await ctx.call('/api/achievements/board');
      el.innerHTML = rows.length ? `<ol class="ach-board">${rows.slice(0, 25).map((r, i) => `<li class="${r.id === ctx.me.u ? 'me' : ''}"><span class="ach-rank">${['🥇', '🥈', '🥉'][i] ?? i + 1}</span>${UI.member({ id: r.id, n: r.n, a: r.a, sub: r.player || '', href: `${BASE}member.html?u=${encodeURIComponent(r.id)}` })}<span class="ach-icons">${r.top.map(esc).join('')}</span><b>${r.pts}<small> pts</small></b></li>`).join('')}</ol>`
        : UI.empty({ icon: '🏆', title: 'No points yet', text: 'Achievements unlock from stats and squad life.' });
    } catch (e) { el.innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
  }

  window.NXBadges = { tagsHtml, tagsEditor, badgesSection, hcRow, achievements, achHead, tile, nextUp, board, checkUnlocks, unlockToast, TIER_ICON };
})();
