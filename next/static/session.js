// Real Discord sign-in for the public preview. Uses the same session key as the live site, so being signed in there signs you in here too.
// Local design builds (no NOREX_API) keep the "Preview as" bar instead.
(() => {
  const API = window.NOREX_API; if (!API) return;
  const KEY = 'norex_session', d = document;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('norex_session')) ls.set(KEY, hash.get('norex_session'));
  if (hash.has('norex_session') || hash.get('norex_error')) history.replaceState(null, '', location.pathname + location.search);
  const decode = (t) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
  const session = (() => { try { const t = ls.get(KEY), p = decode(t); return p.exp > Date.now() / 1000 ? { token: t, ...p } : null; } catch { return null; } })();
  if (!session) ls.set(KEY, null);
  const role = session ? (session.role ?? (session.adm ? 'manager' : 'member')) : 'guest';
  const as = role === 'guest' ? 'guest' : role === 'manager' || role === 'owner' ? 'owner' : 'member'; // the page's two member tiers; the server enforces the real rules
  const loginUrl = () => `${API}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
  const logout = () => { ls.set(KEY, null); ss.set('nx.me', null); location.href = 'index.html'; };
  const call = async (path, opt = {}) => { const r = await fetch(API + path, { ...opt, headers: { ...(opt.headers || {}), ...(session ? { Authorization: 'Bearer ' + session.token } : {}) }, cache: 'no-store' }); if (!r.ok) throw new Error(path + ' ' + r.status); return r.json(); };
  let cached = null; try { cached = JSON.parse(ss.get('nx.me') || 'null'); } catch {}
  if (cached && (!session || cached.u !== session.u)) cached = null;
  const Auth = window.NorexAuth = { session, token: session?.token ?? null, role, as, player: cached?.player ?? null, name: session?.n ?? '', avatar: session?.a ?? '', loginUrl, logout, call };
  // who is this member in the club? (approved claim = their player card)
  Auth.ready = !session ? Promise.resolve() : call('/api/me').then((m) => {
    const claim = m.claim && m.claim.status === 'approved' ? m.claim.player : null;
    const next = { u: session.u, player: claim, features: m.user?.features ?? null, roleLabel: m.user?.roleLabel ?? '' };
    ss.set('nx.me', JSON.stringify(next)); Auth.features = next.features; Auth.roleLabel = next.roleLabel;
    if ((cached?.player ?? null) !== claim && !ss.get('nx.reloaded')) { ss.set('nx.reloaded', '1'); location.reload(); } // first sign-in only: re-render with their card
    Auth.player = claim;
  }).catch(() => {});
  // account chip in the header + any [data-login] link
  const chip = () => {
    $$ = (s) => [...d.querySelectorAll(s)];
    $$('[data-login]').forEach((a) => (a.href = loginUrl()));
    const wrap = d.querySelector('.bar .wrap'), key = d.querySelector('.bar .keybtn'); if (!wrap || d.getElementById('acct')) return;
    const el = d.createElement('div'); el.id = 'acct';
    el.innerHTML = session ? `<button type="button" class="ac" aria-haspopup="true" aria-expanded="false">${session.a ? `<img src="${String(session.a).replace(/"/g, '&quot;')}" alt="">` : ''}<span>${String(session.n ?? 'Member').replace(/[<>&"]/g, '')}</span></button><div class="acm"><div class="muted tiny">Signed in with Discord</div><a class="btn ghost" href="#" data-out>Sign out</a></div>` : `<a class="btn ghost" data-login href="${loginUrl()}">Sign in with Discord</a>`;
    wrap.insertBefore(el, key);
    const b = el.querySelector('.ac'); if (b) { b.onclick = () => { const o = el.classList.toggle('open'); b.setAttribute('aria-expanded', o); }; d.addEventListener('click', (e) => { if (!el.contains(e.target)) el.classList.remove('open'); }); el.querySelector('[data-out]').onclick = (e) => { e.preventDefault(); logout(); }; }
  };
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', chip) : chip();
})();
