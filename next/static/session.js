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
  const realAs = role === 'guest' ? 'guest' : role === 'manager' || role === 'owner' ? 'owner' : 'member'; // the page's two member tiers; the server enforces the real rules
  // 👁️ "Preview as" (#53): the owner can look at the site as a member or a guest (menu, gated blocks). Display only – the server still sees the owner.
  const viewAs = realAs === 'owner' && ['member', 'guest'].includes(ls.get('norex.viewas')) ? ls.get('norex.viewas') : '';
  const as = viewAs || realAs;
  const loginUrl = () => `${API}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
  const logout = () => { ls.set(KEY, null); ss.set('nx.me', null); location.href = 'index.html'; };
  const call = async (path, opt = {}) => { const r = await fetch(API + path, { ...opt, headers: { ...(opt.headers || {}), ...(session ? { Authorization: 'Bearer ' + session.token } : {}) }, cache: 'no-store' }); if (!r.ok) { let m = ''; try { m = (await r.json()).error || ''; } catch {} const e = new Error(m || path + ' ' + r.status); e.status = r.status; throw e; } return r.json(); };
  let cached = null; try { cached = JSON.parse(ss.get('nx.me') || 'null'); } catch {}
  if (cached && (!session || cached.u !== session.u)) cached = null;
  const Auth = window.NorexAuth = { session, token: session?.token ?? null, role, as, realAs, viewAs, player: cached?.player ?? null, name: session?.n ?? '', avatar: session?.a ?? '', loginUrl, logout, call };
  // who is this member in the club? (approved claim = their player card)
  Auth.ready = !session ? Promise.resolve() : call('/api/me').then((m) => {
    const claim = m.claim && m.claim.status === 'approved' ? m.claim.player : null;
    const next = { u: session.u, player: claim, features: m.user?.features ?? null, roleLabel: m.user?.roleLabel ?? '' };
    ss.set('nx.me', JSON.stringify(next)); Auth.features = next.features; Auth.roleLabel = next.roleLabel;
    if ((cached?.player ?? null) !== claim && !ss.get('nx.reloaded')) { ss.set('nx.reloaded', '1'); location.reload(); } // first sign-in only: re-render with their card
    Auth.player = claim;
  }).catch(() => {});
  // 🐞 the owner's issue tool (live web/report.js + report.css, copied at build; flag issueTool): pin, arrow, circle, box or pen on
  // any /next/ page, type or dictate the note, Save. Notes go to POST /api/issues with the page, element, role and device, like on the live site.
  if (session && role === 'owner') Auth.ready.then(() => {
    if (!(Auth.features || []).includes('issueTool') || window.NXReport) return;
    d.head.append(Object.assign(d.createElement('link'), { rel: 'stylesheet', href: 'report.css' }));
    d.head.append(Object.assign(d.createElement('script'), { src: 'report.js', onload: () => window.NXReport?.init({
      call: (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      toast: (m) => window.NorexMotion?.toast(m, { kind: 'ok', icon: '🐞' }), role, viewAs: viewAs || null, user: { u: session.u, n: session.n } }) }));
  });
  // any [data-login] link points at Discord sign-in; the header chip, search and dropdown live in header.js
  const chip = () => [...d.querySelectorAll('[data-login]')].forEach((a) => (a.href = loginUrl()));
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', chip) : chip();
})();
