// Page behaviours. Sections are keyed by elements that exist on the page, so one file serves every page.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const ls = { get(k, f = null) { try { return localStorage.getItem(k) ?? f; } catch { return f; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const N = window.NOREX, me = window.NorexMe();
  window.NorexAs = me.as; d.documentElement.dataset.as = me.as;
  // ---- preview identity + entrance preference (stands in for Discord login while we design) ----
  if (!window.NOREX_API) {
  const bar = d.createElement('div'); bar.className = 'devbar';
  bar.innerHTML = `<span>Preview as</span><select id="dvAs" aria-label="Preview role"><option value="guest">Guest</option><option value="member">Member</option><option value="owner">Owner</option></select><select id="dvMe" aria-label="Preview player">${(N.players || []).map((p) => `<option value="${p.k.replace(/"/g, '&quot;')}">${p.n}</option>`).join('')}</select><select id="dvEn" aria-label="Hub entrance"><option value="auto">Entrance: auto</option><option value="full">Entrance: full</option><option value="short">Entrance: short</option><option value="skip">Entrance: skip</option></select><select id="dvNav" aria-label="Menu style"><option value="orb">Menu: gold orb</option><option value="island">Menu: island pill</option><option value="rail">Menu: side rail</option></select><select id="dvFx" aria-label="Page transitions"><option value="on">Transitions: on</option><option value="off">Transitions: off</option></select>`;
  const gear = d.createElement('button'); gear.className = 'devgear'; gear.type = 'button'; gear.textContent = '⚙'; gear.setAttribute('aria-label', 'Preview settings'); gear.onclick = () => bar.classList.toggle('open');
  d.body.appendChild(bar); d.body.appendChild(gear);
  $('#dvAs').value = me.as; $('#dvMe').value = me.me || (N.players[0] || {}).k; $('#dvEn').value = ls.get('norex.entrance', 'auto'); $('#dvMe').hidden = me.as === 'guest';
  if (!me.me && N.players[0]) ls.set('norex.me', N.players[0].k);
  $('#dvAs').onchange = (e) => { ls.set('norex.as', e.target.value); if (!ls.get('norex.me') && N.players[0]) ls.set('norex.me', N.players[0].k); location.reload(); };
  $('#dvMe').onchange = (e) => { ls.set('norex.me', e.target.value); location.reload(); };
  $('#dvEn').onchange = (e) => ls.set('norex.entrance', e.target.value);
  const raw = { get: (k, f) => { try { return localStorage.getItem(k) ?? f; } catch { return f; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  $('#dvNav').value = raw.get('norex.nav', 'orb'); $('#dvFx').value = raw.get('norex.fx', 'on');
  $('#dvNav').onchange = (e) => { raw.set('norex.nav', e.target.value); document.documentElement.dataset.nav = e.target.value; };
  $('#dvFx').onchange = (e) => { raw.set('norex.fx', e.target.value); location.reload(); };
  }
  // ---- role gating ----
  $$('[data-for]').forEach((el) => { el.hidden = !el.dataset.for.split(/\s+/).includes(me.as); });
  // ---- squad filters ----
  const grid = $('#grid.cards');
  if (grid && $('#lines')) {
    let line = '', sort = 'gp'; const cards = $$('.cardwrap', grid);
    const run = () => { cards.filter((c) => !line || c.dataset.line === line).sort((a, b) => b.dataset[sort] - a.dataset[sort]).forEach((c, i) => { c.hidden = false; c.style.order = i; }); cards.filter((c) => line && c.dataset.line !== line).forEach((c) => c.hidden = true); window.NorexMotion.watch(); };
    $$('#lines .chip').forEach((b) => b.onclick = () => { $$('#lines .chip').forEach((x) => x.classList.toggle('on', x === b)); line = b.dataset.l; window.NorexMotion?.flip ? NorexMotion.flip(grid, run) : run(); });
    $$('#sort .chip').forEach((b) => b.onclick = () => { $$('#sort .chip').forEach((x) => x.classList.toggle('on', x === b)); sort = b.dataset.s; window.NorexMotion?.flip ? NorexMotion.flip(grid, run) : run(); });
    run();
  }
})();
