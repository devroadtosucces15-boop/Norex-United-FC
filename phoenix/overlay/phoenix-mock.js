// Phoenix Fire: stands in for the club's Worker on a static host. The pages talk to https://phoenix.mock; this file answers
// those calls from phoenix-api.json (recorded from the real Worker code on the Phoenix mock data, see phoenix/record.mjs),
// signs the visitor in as the role chosen in the bottom toolbar (guest / member / owner) and keeps small changes in this browser.
(() => {
  const API = 'https://phoenix.mock'; window.PF_MOCK = 1;
  const L = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const role = ['guest', 'member', 'owner'].includes(L.get('norex.as')) ? L.get('norex.as') : 'owner';
  const b64u = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
  if (role === 'guest') L.set('norex_session', null);
  else L.set('norex_session', b64u(role === 'owner' ? { u: '111', n: 'Phoenix Owner', a: '', role: 'owner', adm: 1, exp } : { u: '222', n: 'Skye Calder', a: '', role: 'member', exp }) + '.mock');
  L.set('norex.viewas', null);
  const real = window.fetch.bind(window); let fix = null;
  const load = () => fix || (fix = real(new URL('phoenix-api.json', document.currentScript?.src || location.href).href).then((r) => r.json()).catch(() => ({})));
  const mem = (() => { try { return JSON.parse(L.get('pf.mem') || '{}'); } catch { return {}; } })(); const save = () => L.set('pf.mem', JSON.stringify(mem));
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
  const pick = (f, m, u) => { const r = f[role + ':'], k = (x) => `${role}:${m} ${x}`; return f[k(u.pathname + u.search)] ?? f[k(u.pathname)] ?? (() => { const pre = k(u.pathname) + '?'; const hit = Object.keys(f).find((x) => x.startsWith(pre)); return hit ? f[hit] : undefined; })() ?? (role === 'guest' ? undefined : f[`owner:${m} ${u.pathname}`] ?? f[`member:${m} ${u.pathname}`]); };
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    if (!url.startsWith(API)) return real(input, init);
    const f = await load(), u = new URL(url), m = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    if (role === 'guest' && !/^\/(api\/(live|feed|hof|docs|events|trials|awards|insights)\b|auth)/.test(u.pathname)) return json({ error: 'Sign in to see this.' }, 401);
    let b = pick(f, m, u);
    if (u.pathname === '/api/me' && b) { // who am I: the toolbar's player becomes my approved card
      const key = L.get('norex.me'); b = JSON.parse(JSON.stringify(b)); const mb = f['member:GET /api/me']; if (!b.claim && mb && mb.claim) { b.claim = { ...mb.claim, n: (b.user && b.user.n) || mb.claim.n }; b.profile = b.profile || mb.profile; } if (key && b.claim) b.claim = { ...b.claim, status: 'approved', player: key };
    }
    if (b !== undefined) return json(b);
    return m === 'GET' ? json({ error: 'Nothing recorded for this in the preview.' }, 404) : json({ ok: true, preview: true });
  };
  // "Sign in" links point at the Worker's Discord login: here that just means "become the owner" and come back
  document.addEventListener('click', (e) => { const a = e.target.closest?.('a[href^="' + API + '/auth/login"]'); if (!a) return; e.preventDefault(); if (role === 'guest') L.set('norex.as', 'owner'); try { location.href = decodeURIComponent(new URL(a.href).searchParams.get('return') || 'index.html'); } catch { location.reload(); } }, true);
})();
