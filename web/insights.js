// Board 12 – the "✨ Insight" widget (BE9's per-stat fact-pack copy, bot/statinsights.js). Mounted wherever
// build.mjs drops a `[data-nx-insight][data-key]` slot (home page club form + latest match + last 5, match-page head-to-head, home-squad
// player profiles, plus the private `note.<k>` coach's note – the API only returns it to that player + managers, so the slot
// vanishes for everyone else). No "AI"/"LLM" wording anywhere here – resolved naming question (2026-10-03): branded
// as a plain club feature, not disclosed as machine-written.
//   NXInsight.mount(el, key, ctx)   ctx = { call, toast, session, baseRole } from app.js
// Insight mode (site-wide show/hide, `I` key) is self-contained: the first mount() call injects one
// floating toggle pill and a body-level class (`insights-off`) that every `.nx-insight` respects in CSS.
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '', MAPI = document.body.dataset.api || '';
  const MODE_KEY = 'nx_insights_on';

  function ensureToggle() {
    if (document.querySelector('[data-insight-toggle]')) return;
    const on = () => localStorage.getItem(MODE_KEY) !== '0';
    const paint = (btn) => { const isOn = on(); btn.setAttribute('aria-pressed', String(isOn)); btn.textContent = `✨ Insights: ${isOn ? 'on' : 'off'}`; document.body.classList.toggle('insights-off', !isOn); };
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'nx-ins-toggle'; btn.dataset.insightToggle = '';
    btn.title = 'Toggle insights (press I)';
    btn.addEventListener('click', () => { localStorage.setItem(MODE_KEY, on() ? '0' : '1'); paint(btn); });
    document.body.append(btn);
    paint(btn);
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() !== 'i' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      localStorage.setItem(MODE_KEY, on() ? '0' : '1');
      paint(btn);
    });
  }

  async function mount(el, key, ctx = {}) {
    if (ctx.compare) key = `compare.${[ctx.compare.a, ctx.compare.b].sort().join('~')}`; // same key the server stores (compareKey)
    ensureToggle();
    el.hidden = false;
    el.classList.add('nx-insight', 'card');
    el.innerHTML = window.UI ? UI.skeleton('rows', 2) : '';
    let row;
    try {
      if (ctx.compare) { // BE9 compare: written on demand for members, nothing to show for guests
        row = ctx.session ? (await ctx.call('/api/insights/compare', ctx.compare))?.insight : null;
      } else {
        if (ctx.session && key.startsWith('h2h.')) { // BE9 h2h: a member's first view writes the opponent's row (cron pre-writes only the latest opponent); fall through to the plain read if refused
          try { row = (await ctx.call('/api/insights/h2h', { o: key.slice(4) }))?.insight; } catch {}
        }
        if (!row) {
        const r = await fetch(`${MAPI}/api/insights?keys=${encodeURIComponent(key)}`, ctx.session ? { headers: { Authorization: `Bearer ${ctx.session.token}` } } : undefined);
        const d = r.ok ? await r.json() : null;
        row = d?.insights?.[0];
        }
      }
    } catch {}
    if (!row && ctx.empty) { el.classList.remove('card'); el.innerHTML = `<p class="muted small">${esc(ctx.empty)}</p>`; return; } // a slot the caller keeps (manager portal picker)
    if (!row) { if (ctx.compare) { el.hidden = true; el.innerHTML = ''; } else el.remove(); return; } // compare slot is reused for the next pair
    render(row);

    function render(r) {
      const written = ctx.showAt && r.at && window.UI ? `<p class="nx-ins-at muted small">✍️ Last written ${UI.time(r.at, false)}</p>` : ''; // only where asked (manager portal)
      const DD = { club: '📈 Club form', 'match.latest': '⚽ Latest match', 'matches.last5': '🔟 Last five' }[key]; // home page: three cards become tidy dropdowns
      const inner = `<p class="nx-ins-head">${esc(r.headline)}</p>
<p class="nx-ins-body">${esc(r.body)}</p>
${r.watch ? `<p class="nx-ins-watch">👀 ${esc(r.watch)}</p>` : ''}
${written}
<div class="nx-ins-foot">
<div class="nx-ins-vote" role="group" aria-label="Was this useful?">
<button type="button" data-vote="1" aria-label="Useful">👍</button>
<button type="button" data-vote="-1" aria-label="Not useful">👎</button>
</div>
${ctx.session ? '<button type="button" class="nx-ins-ask-btn">💬 Ask a follow-up</button>' : ''}
</div>
${ctx.session ? '<div class="nx-ins-ask" hidden><input type="text" maxlength="200" placeholder="Ask a follow-up…"><button type="button" class="btn small">Ask</button><p class="nx-ins-answer"></p></div>' : ''}`;
      el.innerHTML = DD
        ? `<details class="nx-ins-dd"><summary><span class="nx-ins-kind">${DD}</span><span class="nx-ins-sum">${esc(r.headline)}</span></summary><div class="nx-ins-ddbody">${inner}</div></details>`
        : `<h4>${key.startsWith('note.') ? "✨ Coach's note" : '✨ Insight'}</h4>${inner}`;
      if (DD) el.classList.add('nx-ins-ddcard');

      el.querySelectorAll('[data-vote]').forEach((b) => b.addEventListener('click', async () => {
        if (!ctx.session) { ctx.toast?.('Log in to rate insights', true); return; }
        const vote = Number(b.dataset.vote);
        el.querySelectorAll('[data-vote]').forEach((x) => x.classList.toggle('picked', x === b));
        try { await ctx.call('/api/insights/feedback', { key, vote }); ctx.toast?.('Thanks for the feedback'); }
        catch (e) { ctx.toast?.(e.message || 'Could not send feedback', true); }
      }));

      const askBtn = el.querySelector('.nx-ins-ask-btn'), askBox = el.querySelector('.nx-ins-ask');
      askBtn?.addEventListener('click', () => { askBox.hidden = !askBox.hidden; if (!askBox.hidden) askBox.querySelector('input')?.focus(); });
      const ask = async () => {
        const input = askBox.querySelector('input'), answer = askBox.querySelector('.nx-ins-answer'), question = input.value.trim();
        if (!question) return;
        answer.textContent = '…';
        try { const { answer: a } = await ctx.call('/api/insights/ask', { key, question }); answer.textContent = a; input.value = ''; }
        catch (e) { answer.textContent = e.message || "Couldn't answer that right now."; }
      };
      askBox?.querySelector('button')?.addEventListener('click', ask);
      askBox?.querySelector('input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(); });
    }
  }

  // ✨ chips on a grid of `.stat` tiles: one chip per tile, click toggles one shared insight panel under the grid (mounted on first open)
  function tiles(grid, key, ctx = {}) {
    if (!grid || grid.dataset.insTiled) return;
    grid.dataset.insTiled = '1';
    ensureToggle();
    let panel = null;
    grid.querySelectorAll('.stat').forEach((tile) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'nx-ins-tile'; b.textContent = '✨';
      b.title = 'Show the insight'; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'Show the insight for this number');
      b.addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        const open = b.getAttribute('aria-expanded') !== 'true';
        grid.querySelectorAll('.nx-ins-tile').forEach((x) => x.setAttribute('aria-expanded', 'false'));
        if (!open) { if (panel) panel.hidden = true; return; }
        b.setAttribute('aria-expanded', 'true');
        if (!panel) { panel = document.createElement('div'); panel.className = 'nx-ins-tilepanel'; grid.after(panel); await mount(panel, key, ctx); if (!panel.isConnected) { panel = null; grid.querySelectorAll('.nx-ins-tile').forEach((x) => x.remove()); } }
        else panel.hidden = false;
      });
      tile.append(b);
    });
  }

  globalThis.NXInsight = { mount, tiles };
})();
