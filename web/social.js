// Shared social pieces (roadmap P6.5) – used by the feed now, chats next (P6.3). window.NXSocial:
//   reactBar(state, emoji, { kind, id, small })  club reaction chips + picker for anything reactable through /api/react
//   wire(root, { call, toast, find })            one capture-phase click handler for every reactBar inside root
//   mentions(html, map)                          @username → member chip (hover card) when it's a real member
//   autocomplete(root, call)                     @ in any textarea[data-mention] inside root → pick a member
// State shape (same as feed posts): { reacts: {emoji: n}, who: {emoji: [names]}, mine: [emoji] }.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '';
  if (!$('link[href$="social.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/social.css` }));
  const myName = () => { try { const t = localStorage.getItem('norex_session'); return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))).n; } catch { return 'You'; } };

  // ---------- reactions ----------
  const tip = (s, e) => { const w = s.who?.[e] ?? []; return w.join(', ') + (s.reacts[e] > w.length ? ` +${s.reacts[e] - w.length}` : ''); };
  function reactBar(s, emoji, { kind, id, small = false } = {}) {
    const reacts = s.reacts ?? {}, mine = s.mine ?? [];
    const used = emoji.filter((e) => reacts[e]);
    return `<span class="nx-react${small ? ' sm' : ''}" data-rkind="${esc(kind)}" data-rid="${esc(id)}">${used.map((e) => `<button type="button" class="nx-rx${mine.includes(e) ? ' on' : ''}" data-srx="${e}" aria-pressed="${mine.includes(e)}" data-tip="${esc(tip({ ...s, reacts }, e))}"><span>${e}</span><b>${reacts[e]}</b></button>`).join('')}<span class="nx-rx-wrap"><button type="button" class="nx-rx-add" data-srx-pick aria-label="Add a reaction" aria-expanded="false">😀<i>+</i></button><span class="nx-rx-pick" hidden>${emoji.map((e) => `<button type="button" data-srx="${e}" aria-label="React ${e}">${e}</button>`).join('')}</span></span></span>`;
  }
  // Optimistic toggle – returns a snapshot to roll back to.
  function toggle(s, e) {
    const before = { reacts: { ...(s.reacts ?? {}) }, who: { ...(s.who ?? {}) }, mine: [...(s.mine ?? [])] };
    const on = before.mine.includes(e), me = myName();
    s.reacts = { ...before.reacts, [e]: Math.max(0, (before.reacts[e] ?? 0) + (on ? -1 : 1)) };
    if (!s.reacts[e]) delete s.reacts[e];
    s.who = { ...before.who, [e]: on ? (before.who[e] ?? []).filter((n) => n !== me) : [...(before.who[e] ?? []), me] };
    s.mine = on ? before.mine.filter((x) => x !== e) : [...before.mine, e];
    return before;
  }
  // find(kind, id) → the state object to update; emoji = the club set.
  function wire(root, { call, toast, find, emoji }) {
    const paint = (bar, s) => { bar.outerHTML = reactBar(s, emoji(), { kind: bar.dataset.rkind, id: bar.dataset.rid, small: bar.classList.contains('sm') }); };
    const closeAll = (except) => $$('.nx-rx-pick:not([hidden])', root).forEach((m) => { if (m !== except) { m.hidden = true; m.previousElementSibling?.setAttribute('aria-expanded', 'false'); } });
    root.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-srx], [data-srx-pick]');
      if (!b || !root.contains(b)) { if (!ev.target.closest('.nx-rx-pick')) closeAll(); return; }
      ev.stopPropagation(); ev.preventDefault();
      if (b.hasAttribute('data-srx-pick')) {
        const m = b.nextElementSibling;
        closeAll(m);
        m.hidden = !m.hidden; b.setAttribute('aria-expanded', !m.hidden);
        return;
      }
      const bar = b.closest('.nx-react'), kind = bar.dataset.rkind, id = +bar.dataset.rid;
      const s = find(kind, id);
      if (!s) return;
      const e = b.dataset.srx, before = toggle(s, e);
      paint(bar, s);
      const again = () => $(`.nx-react[data-rkind="${kind}"][data-rid="${id}"]`, root);
      try { const r = await call('/api/react', { kind, id, emoji: e }); Object.assign(s, { reacts: r.reacts, who: r.who, mine: r.mine }); } catch (er) { Object.assign(s, before); toast(er.message, true); }
      const now = again();
      if (now) paint(now, s);
    }, true);
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  }

  // ---------- mentions ----------
  // Only in text, never inside tags/attributes: split the HTML on tags and touch the text parts.
  const AT = /(^|[^\w@./&])@([a-z0-9_.]{2,32})/gi;
  function mentions(html, map) {
    if (!map || !Object.keys(map).length) return html;
    const profiles = window.NXViewer?.flagOn('profiles');
    return String(html).split(/(<[^>]*>)/).map((part, i) => (i % 2 ? part : part.replace(AT, (all, pre, raw) => {
      const tag = raw.replace(/\.+$/, ''), rest = raw.slice(tag.length), m = map[tag.toLowerCase()];
      if (!m) return all;
      const t = profiles ? 'a' : 'span';
      return `${pre}<${t} class="nx-at"${profiles ? ` href="${BASE}member.html?u=${encodeURIComponent(m.id)}"` : ''} data-hc="${esc(m.id)}" data-hc-name="${esc(m.n)}" data-hc-sub="@${esc(tag)}" tabindex="0">@${esc(m.n)}</${t}>${rest}`;
    }))).join('');
  }

  // @ autocomplete for textarea[data-mention]: ↑↓ move, Enter/Tab pick, Esc close. Inserts "@username ".
  function autocomplete(root, call) {
    let menu = null, ta = null, list = [], idx = 0, timer = 0, seq = 0;
    const cache = new Map();
    const close = () => { menu?.remove(); menu = null; list = []; };
    const word = () => { const m = /(^|[\s(])@([\w.]{0,32})$/.exec(ta.value.slice(0, ta.selectionStart)); return m ? m[2] : null; };
    const pick = (p) => {
      const pos = ta.selectionStart, before = ta.value.slice(0, pos).replace(/@([\w.]{0,32})$/, `@${p.tag} `);
      ta.value = before + ta.value.slice(pos);
      ta.selectionStart = ta.selectionEnd = before.length;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      close(); ta.focus();
    };
    const paint = () => {
      if (!list.length) { close(); return; }
      if (!menu) { menu = Object.assign(document.createElement('ul'), { className: 'nx-at-menu', role: 'listbox' }); ta.parentElement.style.position ||= 'relative'; ta.after(menu); }
      menu.innerHTML = list.map((p, i) => `<li role="option" aria-selected="${i === idx}" data-i="${i}">${window.UI.avatar(p.a, p.n, 22)}<b>${esc(p.n)}</b><small>@${esc(p.tag)}</small></li>`).join('');
    };
    const lookup = (q) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const n = ++seq;
        try {
          if (!cache.has(q)) cache.set(q, (await call(`/api/mentions?q=${encodeURIComponent(q)}`)).people);
          if (n !== seq || !ta) return;
          list = cache.get(q); idx = 0; paint();
        } catch { close(); }
      }, cache.has(q) ? 0 : 150);
    };
    root.addEventListener('input', (e) => {
      if (!e.target.matches('textarea[data-mention]')) return;
      ta = e.target;
      const q = word();
      if (q === null) { close(); return; }
      lookup(q.toLowerCase());
    });
    // Capture phase so Enter picks a name instead of sending the comment.
    root.addEventListener('keydown', (e) => {
      if (!menu || e.target !== ta) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { idx = (idx + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length; paint(); }
      else if (e.key === 'Enter' || e.key === 'Tab') pick(list[idx]);
      else if (e.key === 'Escape') close();
      else return;
      e.preventDefault(); e.stopPropagation();
    }, true);
    root.addEventListener('mousedown', (e) => { const li = e.target.closest('.nx-at-menu li'); if (li) { e.preventDefault(); pick(list[+li.dataset.i]); } });
    root.addEventListener('focusout', (e) => { if (e.target === ta) setTimeout(() => { if (document.activeElement !== ta) close(); }, 120); });
  }

  window.NXSocial = { reactBar, toggle, wire, mentions, autocomplete };
})();
