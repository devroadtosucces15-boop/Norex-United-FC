// The Hub layer (members only, loads on every hub room): the things that make the Hub feel different from the public site.
//  1. Medals and badges that reveal with the scroll – progress follows the finger (position, not time), then each medal plays its own effect once
//  2. A black-screen award moment with confetti for brand-new achievements (NorexHubX.celebrate)
//  3. A rules reminder: if the club rules changed and you have not acknowledged them, a nudge on every sign-in session and a dot on the Handbook
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || d.documentElement.dataset.motion === 'off';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch {} } };

  // ---------- 1. scroll-driven medals ----------
  // Each medal gets one signature effect, chosen from its name/icon, else from its tier.
  const FX = [[/unstopp|speed|fast|rocket|sprint|🚀|⚡|streak|on a roll|🔥/i, 'streak'], [/unbeat|wall|clean|sheet|defen|rock|🧱|🛡/i, 'wall'], [/rise|climb|grow|level|up|📈/i, 'rise'], [/goal|hat.?trick|score|striker|⚽|🎯/i, 'ball'], [/star|motm|rating|man of|⭐|🌟/i, 'stars'], [/assist|pass|link|maestro|🧠|🤝/i, 'link'], [/captain|leader|boss|👑|🏆|trophy/i, 'crown']];
  const TIERFX = { common: 'shine', rare: 'ring', epic: 'burst', legendary: 'prism' };
  const pick = (el) => { const t = (el.textContent || '').slice(0, 120); for (const [re, k] of FX) if (re.test(t)) return k; const m = /t-(common|rare|epic|legendary)/.exec(el.className); return TIERFX[m?.[1]] || 'shine'; };
  const meds = new Set(); const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) kick(); }, { rootMargin: '80px', threshold: [0, .25, .5, .75, 1] }) : null; let raf = 0, lastY = scrollY, lastT = performance.now(), vel = 0;
  const reg = (el) => { if (el.__mx) return; el.__mx = { cur: reduced() ? 1 : 0, fx: pick(el), played: false }; el.classList.add('mx-md'); el.dataset.fx = el.__mx.fx; if (!el.querySelector('.mx-fx')) el.insertAdjacentHTML('afterbegin', '<span class="mx-fx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>'); meds.add(el); io?.observe(el); if (el.__mx.cur) { el.style.setProperty('--p', 1); el.classList.add('in'); } };
  function frame() {
    raf = 0; const vh = innerHeight; let busy = false;
    for (const el of meds) {
      if (!el.isConnected) { meds.delete(el); continue; }
      const m = el.__mx, r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) { if (m.cur < 1) { m.cur = 0; el.style.setProperty('--p', 0); } continue; }
      const target = reduced() ? 1 : Math.max(0, Math.min(1, (vh * .98 - r.top) / (vh * .34)));
      // the reveal tracks the scroll: a fast swipe lets it ease in faster, a slow drag scrubs it exactly
      const k = Math.min(.6, .18 + vel * .02); m.cur += (target - m.cur) * k; if (Math.abs(target - m.cur) < .004) m.cur = target; else busy = true;
      el.style.setProperty('--p', m.cur.toFixed(3));
      if (m.cur > .96 && !m.played) { m.played = true; el.classList.add('in'); }
    }
    if (busy || Math.abs(vel) > .05) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', () => { const t = performance.now(), dy = Math.abs(scrollY - lastY), dt = Math.max(8, t - lastT); vel = vel * .6 + (dy / dt) * .4; lastY = scrollY; lastT = t; kick(); }, { passive: true });
  addEventListener('resize', kick); addEventListener('scrollend', kick);
  setInterval(() => { vel *= .7; }, 120);
  const scan = (root = d) => { $$('.ac-c, .bd-c', root).forEach(reg); if (meds.size) kick(); };
  const watch = () => { const mount = $('#lkmedals'); if (!mount) return; new MutationObserver(() => scan(mount)).observe(mount, { childList: true, subtree: true }); scan(mount); };

  // ---------- 2. award moment ----------
  const seen = () => { try { return JSON.parse(ss.get('nx.celebrated') || '[]'); } catch { return []; } };
  function celebrate(list) {
    const fresh = (list || []).filter((x) => x && !seen().includes(x.name)); if (!fresh.length || $('#awardfx')) return;
    ss.set('nx.celebrated', JSON.stringify(seen().concat(fresh.map((x) => x.name)).slice(-30)));
    const x = fresh[0], o = d.createElement('div'); o.id = 'awardfx'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'New achievement');
    const cols = ['#efcf7a', '#c8352c', '#fff', '#7fd4ff', '#8be0a0']; const bits = reduced() ? '' : Array.from({ length: 46 }, (_, i) => `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 1.2).toFixed(2)}s;--t:${(2.4 + Math.random() * 1.8).toFixed(2)}s;--c:${cols[i % cols.length]};--r:${Math.round(Math.random() * 360)}deg;--w:${(5 + Math.random() * 7).toFixed(0)}px"></i>`).join('');
    o.innerHTML = `<div class="afx-bits" aria-hidden="true">${bits}</div><div class="afx-card"><div class="afx-rays" aria-hidden="true"></div><span class="afx-ic" aria-hidden="true">${esc(x.icon || '🏅')}</span><small>${fresh.length > 1 ? fresh.length + ' NEW ACHIEVEMENTS' : 'NEW ACHIEVEMENT'}</small><h2>${esc(x.name)}</h2><p>${esc(x.desc || '')}</p>${x.pts ? `<b class="afx-pts">+${x.pts} points</b>` : ''}<button type="button" class="btn gold big" data-afx>Brilliant</button>${fresh.length > 1 ? `<p class="afx-more">and ${fresh.slice(1, 4).map((y) => esc(y.icon + ' ' + y.name)).join(', ')}${fresh.length > 4 ? '…' : ''}</p>` : ''}</div>`;
    const prev = d.activeElement; d.body.appendChild(o); requestAnimationFrame(() => o.classList.add('on'));
    const close = () => { o.classList.remove('on'); setTimeout(() => { o.remove(); prev?.focus?.(); }, 320); d.removeEventListener('keydown', key); };
    const key = (e) => { if (e.key === 'Escape' || e.key === 'Enter') close(); }; d.addEventListener('keydown', key);
    o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('[data-afx]')) close(); }); $('[data-afx]', o).focus();
  }
  window.NorexHubX = { celebrate };

  // ---------- 3. rules reminder ----------
  async function rules() {
    const A = window.NorexAuth; if (!window.NOREX_API || !A?.token || ss.get('nx.rulesRemind')) return;
    if (!['member', 'owner', 'manager'].includes(A.as || A.role)) return;
    try {
      const D = await A.call('/api/docs'); ss.set('nx.rulesRemind', '1');
      if (D?.rules?.version && !D.rules.acked) {
        $$('a[href="hub-handbook.html"]').forEach((a) => a.classList.add('rules-due'));
        if (!/hub-handbook/.test(location.pathname)) window.NorexMotion?.toast?.('📜 The club rules changed. Open the Handbook and tick each rule.', { kind: 'ok' });
      }
    } catch {}
  }

  const boot = () => { watch(); rules(); };
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', boot) : boot();
})();
