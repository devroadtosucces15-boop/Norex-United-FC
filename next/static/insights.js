// ✨ Insight boxes (the live site's stat insights, bot/statinsights.js): short written notes about the club, a match, a player
// or the leaderboards, each built only from the stored stats. Members only (the server returns nothing to guests), so every slot
// stays hidden until a row actually arrives. Branded as a plain club feature (same rule as the live site).
// Slots: <div data-insight="club" hidden></div>; a wrapper [data-insight-sec] appears once any slot inside it fills.
(() => {
  const d = document, $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KIND = { club: ['📈', 'Club form'], 'match.latest': ['⚽', 'Latest match'], 'matches.last5': ['🔟', 'Last five'], 'club.records': ['🏆', 'Records'], 'leaders.goals': ['⚽', 'Scoring race'], 'leaders.rating': ['⭐', 'Ratings race'] };
  const kind = (k) => KIND[k] || (k.startsWith('player.') ? ['🧑‍🎤', 'Player'] : k.startsWith('note.') ? ['📝', "Coach's note"] : k.startsWith('h2h.') ? ['⚔️', 'Head to head'] : k.startsWith('match.') ? ['⚽', 'This match'] : ['✨', 'Insight']);
  const M = () => window.NorexMotion, A = () => window.NorexAuth;
  const OFF = 'norex.insights';
  const off = () => { try { return localStorage.getItem(OFF) === 'off'; } catch { return false; } };
  const paint = () => d.documentElement.classList.toggle('insights-off', off());
  const toggle = () => { try { localStorage.setItem(OFF, off() ? 'on' : 'off'); } catch {} paint(); M()?.toast(off() ? 'Insights hidden (press I to bring them back)' : '✨ Insights on', { icon: '✨' }); };
  paint();
  d.addEventListener('keydown', (e) => { if (e.key.toLowerCase() !== 'i' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input,textarea,[contenteditable]')) return; if ($$('[data-insight]').length) toggle(); });
  addEventListener('norex:settings', (e) => { const box = e.detail; if (!box || !$$('[data-insight]').length) return;
    const b = d.createElement('button'); b.type = 'button'; b.className = 'mx-opt'; b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', !off()); b.style.marginTop = '10px';
    b.innerHTML = '<span class="e">✨</span><span><b>Show insights</b><small>Short notes about the club, matches and players. Press I to toggle</small></span>';
    b.onclick = () => { toggle(); b.setAttribute('aria-checked', !off()); }; box.appendChild(b); });

  function html(key, r) {
    const [ic, lab] = kind(key), member = !!A()?.token;
    return `<div class="ins-top"><span class="ins-kind">${ic} ${esc(lab)}</span><span class="ins-spark" aria-hidden="true">✨</span></div>
<p class="ins-head">${esc(r.headline)}</p><p class="ins-body">${esc(r.body)}</p>${r.watch ? `<p class="ins-watch">👀 ${esc(r.watch)}</p>` : ''}
<div class="ins-foot"><div class="ins-vote" role="group" aria-label="Was this useful?"><button type="button" data-vote="1" aria-label="Useful">👍</button><button type="button" data-vote="-1" aria-label="Not useful">👎</button></div>${member ? '<button type="button" class="ins-askbtn" aria-expanded="false">💬 Ask a follow-up</button>' : ''}</div>
${member ? `<form class="ins-ask" hidden><div class="ins-thread" aria-live="polite"></div><div class="ins-row"><input type="text" maxlength="200" placeholder="Ask about these numbers…" aria-label="Your question" enterkeyhint="send"><button type="submit" class="btn gold">Ask</button></div><p class="muted tiny">Answers use only the stored stats. 10 questions a day.</p></form>` : ''}`;
  }
  function bind(el, key) {
    el.querySelectorAll('[data-vote]').forEach((b) => b.addEventListener('click', async () => {
      if (!A()?.token) return M()?.toast('Sign in to rate insights', { kind: 'err' });
      el.querySelectorAll('[data-vote]').forEach((x) => x.classList.toggle('picked', x === b)); b.classList.remove('mx-ok'); void b.offsetWidth; b.classList.add('mx-ok'); M()?.haptic();
      try { await A().call('/api/insights/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, vote: +b.dataset.vote }) }); M()?.toast('Thanks for the feedback', { kind: 'ok' }); }
      catch (e) { b.classList.remove('picked'); M()?.toast(e.message || 'Could not send feedback', { kind: 'err' }); }
    }));
    const ab = el.querySelector('.ins-askbtn'), form = el.querySelector('.ins-ask'); if (!ab) return;
    ab.addEventListener('click', () => { form.hidden = !form.hidden; ab.setAttribute('aria-expanded', !form.hidden); if (!form.hidden) { form.classList.add('mx-pop'); form.querySelector('input').focus({ preventScroll: true }); } });
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); const input = form.querySelector('input'), q = input.value.trim(), btn = form.querySelector('button'), th = form.querySelector('.ins-thread'); if (!q) return;
      const me = d.createElement('p'); me.className = 'ins-q'; me.textContent = q; th.appendChild(me);
      const typing = d.createElement('p'); typing.className = 'ins-a'; typing.innerHTML = '<span class="mx-typing" aria-label="Writing"><i></i><i></i><i></i></span>'; th.appendChild(typing);
      input.value = ''; input.blur();
      try { const res = await (M() ? M().submit(btn, () => A().call('/api/insights/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, question: q }) }), { burst: false }) : A().call('/api/insights/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, question: q }) }));
        type(typing, res.answer || "I couldn't answer that from the stored stats."); }
      catch (err) { typing.textContent = err.message || "Couldn't answer that right now."; typing.classList.add('err'); }
    });
  }
  // the answer writes itself in, word by word (instant in Calm/Off)
  function type(el, text) { if (M()?.mode !== 'full') { el.textContent = text; return; } const w = text.split(/(\s+)/); el.textContent = ''; let i = 0; const t = setInterval(() => { el.textContent += w[i++] ?? ''; if (i >= w.length) clearInterval(t); }, 28); }

  async function run() {
    const slots = $$('[data-insight]'); if (!slots.length || !window.NOREX_API || !A()?.token) { slots.forEach((s) => s.remove()); return; }
    slots.forEach((s) => { s.hidden = false; s.classList.add('ins'); M()?.skeleton(s, 3); });
    $$('[data-insight-sec]').forEach((s) => (s.hidden = false));
    const keys = [...new Set(slots.map((s) => s.dataset.insight))]; let rows = [];
    for (let i = 0; i < keys.length; i += 20) { try { const r = await A().call('/api/insights?keys=' + keys.slice(i, i + 20).map(encodeURIComponent).join(',')); rows = rows.concat(r.insights || []); } catch {} }
    const by = new Map(rows.map((r) => [r.key, r]));
    for (const s of slots) { const r = by.get(s.dataset.insight); if (!r) { s.remove(); continue; } const k = s.dataset.insight; if (M()) M().land(s, html(k, r), (el) => bind(el, k)); else { s.innerHTML = html(k, r); bind(s, k); } }
    $$('[data-insight-sec]').forEach((sec) => { if (!sec.querySelector('.ins')) sec.remove(); else M()?.watch(sec); });
  }
  const go = () => (A()?.ready || Promise.resolve()).then(run);
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', go) : go();
})();
