// Page-specific behaviour. Each block runs only if its elements exist.
addEventListener('DOMContentLoaded', () => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const N = window.NOREX, me = window.NorexMe(), isOwner = me.as === 'owner';
  const ls = { get(k, f = null) { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch { return f; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const byK = (k) => (N.players || []).find((p) => p.k === k);
  const tabs = (rootSel, attr, on) => $$(rootSel + ' .chip').forEach((b) => b.addEventListener('click', () => { $$(rootSel + ' .chip').forEach((x) => x.classList.toggle('on', x === b)); on(b.dataset[attr], b); }));
  const wide = () => innerWidth >= 900;

  // ---------- match facts: Field / Table toggle, player mini cards, pitch draw-in, result graphic ----------
  if ($('#mfield')) {
    const field = $('#mfield'), seg = $$('.seg [data-mv]'), MKEY = 'norex.mview';
    let pop = null; const close = () => { pop?.remove(); pop = null; $$('.fm.sel', field).forEach((x) => x.classList.remove('sel')); };
    const setView = (v, save) => { seg.forEach((b) => { const on = b.dataset.mv === v; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); $('#mv-field').hidden = v !== 'field'; $('#mv-table').hidden = v !== 'table'; if (save) ls.set(MKEY, v); window.NorexMotion?.watch(); };
    seg.forEach((b) => b.addEventListener('click', () => setView(b.dataset.mv, true)));
    if (ls.get(MKEY) === 'table') setView('table');
    const pts = $$('.pteam [data-pt]'), setTeam = (t) => { pts.forEach((b) => { const on = b.dataset.pt === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); field.classList.toggle('solo', t !== 'both'); field.classList.toggle('solo-us', t === 'us'); field.classList.toggle('solo-them', t === 'them'); close(); };
    pts.forEach((b) => b.addEventListener('click', () => setTeam(b.dataset.pt)));
    if (innerWidth < 700) setTeam('us');
    // keeper first, strikers last, both teams at once
    $$('.fm', field).forEach((m) => { const y = +m.dataset.yb, fromGoal = m.classList.contains('us') ? 100 - y : y; m.style.setProperty('--fd', Math.round(fromGoal * 14)); });
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { requestAnimationFrame(() => field.classList.add('drawn')); io.disconnect(); } }), { threshold: .2 });
    io.observe(field); setTimeout(() => field.classList.add('drawn'), 2500);
    field.addEventListener('click', (e) => { const m = e.target.closest('.fm'); if (!m) return; const was = m.classList.contains('sel'); close(); if (was) return;
      const s = JSON.parse(m.dataset.s), y = +(field.classList.contains('solo') ? m.dataset.ys : m.dataset.yb), x = Math.min(78, Math.max(22, parseFloat(m.style.left)));
      const cells = [['Goals', s.g], ['Assists', s.a], ['Pre-assists', s.sa], ['Shots', s.sh], ['Passes', `${s.pm}/${s.pa}`], ['Pass %', s.pa ? Math.round(s.pm / s.pa * 100) + '%' : '–'], ['Dribbles', s.drb], ['Tackles', `${s.tm}/${s.ta}`], [s.line === 'GK' ? 'Saves' : 'Minutes', s.line === 'GK' ? s.sv : s.min + '′']];
      pop = d.createElement('div'); pop.className = 'fpop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', s.n);
      pop.innerHTML = `<h4><span>${esc(s.n)}</span><b class="rt ${s.r >= 8 ? 'hi' : s.r >= 7 ? 'mid' : s.r < 6 ? 'bad' : ''}">${(+s.r).toFixed(1)}</b></h4><div class="fp-sub">${s.line}${s.arch ? ' · ' + esc(s.arch) : ''}${s.mom ? ' · 🏅 Man of the match' : ''}${s.red ? ' · 🟥 sent off' : ''}</div><dl>${cells.map(([k, v]) => `<div><dt>${k}</dt><dd>${v ?? 0}</dd></div>`).join('')}</dl>${s.k ? `<a href="player-${encodeURIComponent(s.k)}.html">Open profile →</a>` : ''}`;
      Object.assign(pop.style, { left: x + '%', [y > 50 ? 'bottom' : 'top']: (y > 50 ? 100 - y + 7 : y + 7) + '%' }); field.appendChild(pop); m.classList.add('sel'); window.NorexMotion?.haptic(); });
    d.addEventListener('click', (e) => { if (pop && !e.target.closest('.fm,.fpop')) close(); }); d.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    // result graphic: drawn on a canvas from the same real numbers, downloaded as a PNG
    const pb = $('#mposter'), P = JSON.parse($('#mposterdata')?.textContent || 'null');
    if (pb && P) pb.addEventListener('click', () => window.NorexMotion ? NorexMotion.submit(pb, poster(P)).catch(() => NorexMotion.toast('Could not make the graphic. Try again.', { kind: 'err' })) : poster(P));
    async function poster(P) {
      const W = 1080, Hh = 1350, c = d.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
      const img = (src, cors) => new Promise((ok) => { const i = new Image(); if (cors) i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
      await d.fonts?.ready; const rc = { W: '#22b35e', D: '#d4a23c', L: '#d23a2f' }[P.res];
      const bg = g.createLinearGradient(0, 0, 0, Hh); bg.addColorStop(0, '#141b27'); bg.addColorStop(1, '#07090e'); g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
      const glow = g.createRadialGradient(W / 2, 360, 40, W / 2, 360, 620); glow.addColorStop(0, rc + '55'); glow.addColorStop(1, 'transparent'); g.fillStyle = glow; g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#c8352c'; g.fillRect(0, 0, W, 14); g.fillStyle = '#efcf7a'; g.fillRect(0, 14, W, 4);
      g.textAlign = 'center'; g.fillStyle = '#aab4c9'; g.font = '600 30px Oswald'; g.fillText(`${P.type.toUpperCase()} · ${P.date.toUpperCase()}`, W / 2, 110);
      g.fillStyle = rc; const rl = { W: 'VICTORY', D: 'DRAW', L: 'DEFEAT' }[P.res]; g.font = '700 34px Oswald'; const rw = g.measureText(rl).width + 60; g.beginPath(); g.roundRect((W - rw) / 2, 140, rw, 56, 28); g.fill(); g.fillStyle = '#fff'; g.fillText(rl, W / 2, 180);
      const own = await img('crest.png'), opp = P.crest && window.NOREX_API ? await img(`${window.NOREX_API}/crest/${P.crest}.png`, true) : null;
      if (own) g.drawImage(own, 120, 260, 220, 220);
      if (opp) g.drawImage(opp, W - 340, 260, 220, 220); else { g.fillStyle = '#2a3344'; g.beginPath(); g.arc(W - 230, 370, 110, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 110px Oswald'; g.fillText((P.opp[0] || '?').toUpperCase(), W - 230, 410); }
      g.fillStyle = '#fff'; g.font = '700 230px Oswald'; g.fillText(`${P.gf}`, W / 2 - 95, 455); g.fillText(`${P.ga}`, W / 2 + 95, 455); g.fillStyle = rc; g.font = '700 150px Oswald'; g.fillText(':', W / 2, 430);
      const fit = (t, max, size, w = 'bold') => { let s = size; do { g.font = `700 ${s}px Oswald`; s -= 2; } while (g.measureText(t).width > max && s > 16); return t; };
      g.fillStyle = '#fff'; fit('NOREX UNITED FC', 320, 40); g.fillText('NOREX UNITED FC', 230, 540); fit(P.opp.toUpperCase(), 320, 40); g.fillText(P.opp.toUpperCase(), W - 230, 540);
      g.font = '500 30px Inter'; g.fillStyle = '#d6dce6'; P.us.slice(0, 5).forEach(([n, k], i) => g.fillText(`⚽ ${n}${k > 1 ? ' ×' + k : ''}`, 230, 610 + i * 44)); P.them.slice(0, 5).forEach(([n, k], i) => g.fillText(`⚽ ${n}${k > 1 ? ' ×' + k : ''}`, W - 230, 610 + i * 44));
      if (P.motm) { g.fillStyle = 'rgba(239,207,122,.12)'; g.beginPath(); g.roundRect(140, 900, W - 280, 150, 26); g.fill(); g.strokeStyle = 'rgba(239,207,122,.6)'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#efcf7a'; g.font = '700 28px Oswald'; g.fillText('🏅 MAN OF THE MATCH', W / 2, 950); g.fillStyle = '#fff'; fit(`${P.motm[0]} · ${(+P.motm[1]).toFixed(1)}`, W - 340, 52); g.fillText(`${P.motm[0]} · ${(+P.motm[1]).toFixed(1)}`, W / 2, 1015); }
      g.font = '600 30px Inter'; g.fillStyle = '#cfd6e3'; g.fillText(P.tags.join('   '), W / 2, 1130);
      g.fillStyle = '#6f7a8c'; g.font = '500 24px Inter'; g.fillText('NOREX UNITED FC · EA FC Pro Clubs · live EA data', W / 2, Hh - 60);
      const blob = await new Promise((ok, no) => { try { c.toBlob((b) => (b ? ok(b) : no(new Error('blob'))), 'image/png'); } catch (e) { no(e); } });
      const a = d.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `norex-${P.gf}-${P.ga}-${P.opp.replace(/\W+/g, '-').toLowerCase()}.png`; d.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    }
  }
  // ---------- results / opponents / builds ----------
  if ($('#rf')) tabs('#rf', 'f', (f) => $$('#rl .rrow').forEach((r) => { r.hidden = !!f && r.dataset.res !== f; }));
  if ($('#ot')) tabs('#ot', 't', (t) => { $('#po').hidden = t !== 'o'; $('#pb').hidden = t !== 'b'; });
  if ($('#bt')) tabs('#bt', 't', (t) => { $('#pb').hidden = t !== 'b'; $('#pp').hidden = t !== 'p'; });
  // ---------- match night: real RSVPs and availability (signed-in members; answers are saved to the live club) ----------
  if ($('#rsvppanel') && window.NOREX_API && window.NorexAuth && NorexAuth.token) {
    const post = (path, body) => NorexAuth.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const when = (ms) => new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const OPT = [['yes', "✅ I'm in"], ['maybe', '❔ Maybe'], ['no', "❌ Can't"]];
    const panel = $('#rsvppanel'), btns = (cur, attr) => OPT.map(([v, l]) => `<button class="chip${cur === v ? ' on' : ''}" ${attr} data-v="${v}">${l}</button>`).join('');
    const drawEvents = (L) => {
      const now = Date.now(), list = (L.events || []).filter((e) => e.status === 'scheduled' && e.end > now).slice(0, 6);
      panel.innerHTML = '<h3>RSVP</h3>' + (list.length ? list.map((e) => { const me = (e.rsvps || []).find((r) => r.id === NorexAuth.session.u), yes = (e.rsvps || []).filter((r) => r.s === 'yes').length;
        return `<div class="rsvprow" style="margin-top:14px"><div><b>${esc(e.title || (e.type ? e.type[0].toUpperCase() + e.type.slice(1) : 'Match night'))}</b> <span class="muted small">· ${esc(when(e.start))} · ${yes} in</span></div><div class="chips" style="margin-top:6px">${btns(me && me.s, `data-ev="${e.id}"`)}</div></div>`; }).join('') : '<p class="muted small">No match night is scheduled. When one is, you answer here and managers see who is in.</p>') + '<p class="muted small" id="rs" style="margin-top:8px"></p>';
      panel.querySelectorAll('.chip[data-ev]').forEach((c) => c.onclick = () => { const cur = c.classList.contains('on'), M = window.NorexMotion; c.disabled = true; const job = () => post('/api/events/rsvp', { id: +c.dataset.ev, status: cur ? 'clear' : c.dataset.v });
        (M ? M.submit(c, job) : job()).then((L) => { M?.toast(cur ? 'Answer cleared' : 'Saved. The managers can see your answer.', { kind: 'ok' }); setTimeout(() => drawEvents(L), 450); }).catch(() => { c.disabled = false; $('#rs').textContent = 'Could not save that. Try again.'; M?.toast('Could not save that. Try again.', { kind: 'err' }); }); });
    };
    NorexAuth.call('/api/events').then(drawEvents).catch(() => { panel.querySelector('.muted.small').textContent = 'Could not load match nights right now.'; });
    const ap = $('#availpanel'), box = $('#availbox');
    const drawAvail = (A) => {
      ap.style.display = '';
      box.innerHTML = (A.days || []).map((d) => { const me = (d.people || []).find((x) => x.id === NorexAuth.session.u), yes = (d.people || []).filter((x) => x.status === 'yes').length;
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px"><span>${esc(new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }))} <span class="muted small">· ${yes} in</span></span><span class="chips">${btns(me && me.status, `data-day="${d.date}"`)}</span></div>`; }).join('');
      box.querySelectorAll('.chip[data-day]').forEach((c) => c.onclick = () => { const cur = c.classList.contains('on'); c.disabled = true; post('/api/availability', { date: c.dataset.day, status: cur ? 'clear' : c.dataset.v }).then(drawAvail).catch(() => { c.disabled = false; }); });
    };
    NorexAuth.call('/api/availability').then(drawAvail).catch(() => {});
    // Rush log: members log a result, a manager confirms it (managers' own results count straight away)
    const rpn = $('#rushpanel');
    if (rpn) {
      const today = new Date().toISOString().slice(0, 10), squad = (window.NOREX?.players || []).filter((x) => x.k);
      const drawRush = (Q) => {
        const mine = (Q && Q.mine) || [];
        rpn.innerHTML = `<h3>Rush log</h3><p class="muted small">Rush is not in EA's data. Log your Rush result here and a manager confirms it.</p>
        <button class="btn ghost" id="rushopen" style="margin-top:8px">Log a Rush game</button>
        <form id="rushform" hidden style="margin-top:12px;display:none;gap:8px">
          <div class="chips"><input type="date" name="date" value="${today}" max="${today}" required aria-label="Date" style="background:var(--p3);color:#fff;border:1px solid var(--line);border-radius:10px;padding:7px 10px"><input name="opponent" placeholder="Opponent club" maxlength="60" required aria-label="Opponent" style="background:var(--p3);color:#fff;border:1px solid var(--line);border-radius:10px;padding:7px 10px"></div>
          <div class="chips" style="margin-top:8px"><span class="muted small">Score</span><input type="number" name="gf" min="0" max="40" value="0" aria-label="Goals for" style="width:64px;background:var(--p3);color:#fff;border:1px solid var(--line);border-radius:10px;padding:7px 10px"><span>–</span><input type="number" name="ga" min="0" max="40" value="0" aria-label="Goals against" style="width:64px;background:var(--p3);color:#fff;border:1px solid var(--line);border-radius:10px;padding:7px 10px"></div>
          <p class="muted small" style="margin-top:10px">Who played (up to 5)</p>
          ${[0, 1, 2, 3, 4].map((i) => `<div class="chips" style="margin-top:6px"><select name="p${i}" aria-label="Player ${i + 1}" style="background:var(--p3);color:#fff;border:1px solid var(--line);border-radius:10px;padding:7px 10px"><option value="">${i ? '— none —' : '— choose —'}</option>${squad.map((x) => `<option value="${esc(x.k)}">${esc(x.n)}</option>`).join('')}</select><input type="number" name="g${i}" min="0" max="40" value="0" aria-label="Goals" title="Goals" style="width:56px;background:var(--p3);color:#fff;border:1px solid var(--line);border-radius:10px;padding:7px 8px"><input type="number" name="a${i}" min="0" max="40" value="0" aria-label="Assists" title="Assists" style="width:56px;background:var(--p3);color:#fff;border:1px solid var(--line);border-radius:10px;padding:7px 8px"></div>`).join('')}
          <p class="muted small" style="margin-top:4px">Boxes after each name: goals, then assists.</p>
          <div class="chips" style="margin-top:10px"><button class="btn gold" type="submit">Submit result</button><button class="btn ghost" type="button" id="rushcancel">Cancel</button></div><p class="muted small" id="rushmsg" style="margin-top:8px"></p></form>
        ${mine.length ? `<p class="muted small" style="margin-top:12px">Your recent results</p>${mine.slice(0, 5).map((r) => `<p class="small" style="margin-top:4px">${esc(r.date)} · ${r.gf}–${r.ga} vs ${esc(r.opp)} <span class="muted">· ${esc(r.status)}</span></p>`).join('')}` : ''}`;
        const f = $('#rushform'), open = $('#rushopen');
        open.onclick = () => { f.style.display = 'block'; open.style.display = 'none'; };
        $('#rushcancel').onclick = () => { f.style.display = 'none'; open.style.display = ''; };
        f.onsubmit = (e) => { e.preventDefault(); const d = new FormData(f), ps = [0, 1, 2, 3, 4].map((i) => d.get('p' + i) ? { k: d.get('p' + i), g: +d.get('g' + i) || 0, a: +d.get('a' + i) || 0 } : null).filter(Boolean);
          const btn = f.querySelector('[type=submit]'); btn.disabled = true;
          post('/api/rush', { date: d.get('date'), opponent: d.get('opponent'), gf: +d.get('gf'), ga: +d.get('ga'), players: ps }).then((Q2) => { drawRush(Q2); $('#rushmsg') && ($('#rushmsg').textContent = ''); }).catch((er) => { btn.disabled = false; $('#rushmsg').textContent = er.message || 'Could not save that result.'; }); };
      };
      drawRush(null);
      NorexAuth.call('/api/rush/queue').then(drawRush).catch(() => {});
    }
    // MOTM vote on the latest matches (72 h window is enforced by the server)
    const mp = $('#motmpanel');
    const drawVote = (V) => {
      mp.innerHTML = '<h3>MOTM vote</h3>' + ((V.matches || []).length ? V.matches.map((m) => `<div style="margin-top:14px"><b>vs ${esc(m.opp)}</b> <span class="muted small">· ${m.gf}–${m.ga} · ${m.total} vote${m.total === 1 ? '' : 's'}</span><div class="chips" style="margin-top:6px">${(m.players || []).map((x) => `<button class="chip${m.mine === x.k ? ' on' : ''}" data-m="${esc(m.id)}" data-p="${esc(x.k)}">${esc(x.n)}${m.tally && m.tally[x.k] ? ` · ${m.tally[x.k]}` : ''}</button>`).join('')}</div></div>`).join('') : '<p class="muted small">Voting opens after the final whistle.</p>') + '<p class="muted small" id="mv" style="margin-top:8px"></p>';
      mp.querySelectorAll('.chip[data-m]').forEach((c) => c.onclick = () => { c.disabled = true; post('/api/vote', { match: isNaN(+c.dataset.m) ? c.dataset.m : +c.dataset.m, player: c.dataset.p }).then(drawVote).catch(() => { c.disabled = false; $('#mv').textContent = 'Could not save that vote. It may have closed.'; }); });
    };
    NorexAuth.call('/api/vote').then(drawVote).catch(() => {});
    // weekly star ratings of teammates
    const rp = $('#ratepanel');
    const drawRate = (R) => {
      rp.innerHTML = `<h3>Ratings</h3><p class="muted small">Rate your teammates this week. Averages feed the leaderboards.</p>` + (R.players || []).filter((x) => x.k !== R.self).map((x) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px"><span>${esc(x.n)}${x.played ? ' <span class="muted small">· played</span>' : ''}</span><span class="stars" style="white-space:nowrap">${[1, 2, 3, 4, 5].map((s) => `<button type="button" class="star" data-k="${esc(x.k)}" data-s="${s}" aria-label="${s} stars" style="background:none;border:0;cursor:pointer;font-size:22px;color:${(R.my && R.my[x.k]) >= s ? 'var(--gold,#e8b84a)' : 'rgba(255,255,255,.3)'}">★</button>`).join('')}</span></div>`).join('') + '<p class="muted small" id="rr" style="margin-top:8px"></p>';
      rp.querySelectorAll('.star').forEach((c) => c.onclick = () => { const s = +c.dataset.s, cur = R.my && R.my[c.dataset.k]; post('/api/ratings/rate', { player: c.dataset.k, stars: cur === s ? 0 : s }).then(drawRate).catch(() => { $('#rr').textContent = 'Could not save that rating.'; }); });
    };
    NorexAuth.call('/api/ratings').then(drawRate).catch(() => {});
  } else
  if ($('#rsvp')) { const v = ls.get('norex.rsvp'); const show = (x) => { $$('#rsvp .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === x)); $('#rs').textContent = x ? 'Saved in this preview browser only.' : ''; }; show(v); $$('#rsvp .chip').forEach((c) => c.onclick = () => { ls.set('norex.rsvp', c.dataset.v); show(c.dataset.v); }); }

  // ---------- leaders + best XI ----------
  if ($('#lt')) {
    tabs('#lt', 't', (t) => $$('.lp').forEach((p) => { p.hidden = p.dataset.p !== t; })); window.NorexMotion.watch();
    const f = N.formations[0], slots = NorexPitch.leagueSlots(f), assign = slots.map((s) => byK(N.bestXI[s.s]));
    NorexPitch.mount($('#bxi'), { mode: 'league', orient: 'auto', slots, assign, three: false, onPick: (i) => { const p = assign[i]; if (!p) return; $('#bxiCard').innerHTML = NorexCards.cardHTML(p, { s: 1 }); NorexMotion.tilt(); NorexArt.apply($('#bxiCard')); } });
  }

  // ---------- pitch finishes (grass / night / blueprint / chalkboard) ----------
  (() => { const set = (v) => { document.documentElement.dataset.pstyle = v; ls.set('norex.pstyle', v); $$('.pfin .chip').forEach((b) => b.classList.toggle('on', b.dataset.pf === v)); }; set(ls.get('norex.pstyle', 'grass')); $$('.pfin .chip').forEach((b) => (b.onclick = () => set(b.dataset.pf))); })();
  // ---------- players directory + compare ----------
  if ($('#dir')) {
    let line = '', q = ''; const run = () => $$('#dir tbody tr').forEach((r) => { r.hidden = (line && r.dataset.l !== line) || (q && !r.dataset.n.includes(q)); });
    $('#q').oninput = (e) => { q = e.target.value.toLowerCase(); run(); }; tabs('#pl', 'l', (l) => { line = l; run(); });
    const KEYS = [['ovr', 'Overall', 1], ['gp', 'Games', 1], ['goals', 'Goals', 1], ['assists', 'Assists', 1], ['rating', 'Avg rating', 1], ['mom', 'MOTM', 1], ['win', 'Win rate %', 1], ['pass', 'Pass %', 1], ['tackles', 'Tackles', 1], ['cs', 'Clean sheets', 1], ['cgoals', 'Career goals', 1], ['cassists', 'Career assists', 1]];
    const render = () => {
      let keys = []; const m = location.hash.match(/compare=([^&?]+)/); if (m) keys = decodeURIComponent(m[1]).split(',').filter(Boolean); else keys = NorexCmp.get();
      const ps = keys.map((k) => N.full.find((p) => p.k === k)).filter(Boolean).slice(0, 3), root = $('#cmpRoot');
      if (ps.length < 1) { root.hidden = true; return; } root.hidden = false;
      const best = Object.fromEntries(KEYS.map(([k]) => [k, Math.max(...ps.map((p) => p[k] || 0))]));
      const AXN = [['Goals / game', (p) => p.goals / Math.max(1, p.gp)], ['Assists / game', (p) => p.assists / Math.max(1, p.gp)], ['Rating', (p) => p.rating], ['Passing', (p) => p.pass], ['Tackling', (p) => p.tackleRate], ['Win rate', (p) => p.win]], pool = N.full.filter((p) => p.gp >= 8), mxs = AXN.map(([, f]) => Math.max(1e-9, ...pool.map(f)));
      const radarJ = esc(JSON.stringify({ axes: AXN.map((a) => a[0]), series: ps.map((p) => ({ n: p.n, v: AXN.map(([, f], i) => +(f(p) / mxs[i]).toFixed(3)) })) }));
      root.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">Compare</h3><button class="chip" id="cmpClear">Clear</button></div><div style="display:grid;grid-template-columns:repeat(${ps.length},1fr);gap:18px;align-items:start">${ps.map((p) => `<div style="text-align:center">${NorexCards.cardHTML(p, { s: Math.min(.9, Math.max(.4, ((Math.min(innerWidth, 1200) - 90) / ps.length - 18) / 240)) })}<div class="osw" style="margin-top:8px">${esc(p.n)}</div></div>`).join('')}</div>
      <div class="wx" style="margin-top:14px"><div class="radar" data-w="radar" data-j="${radarJ}"></div></div><div style="margin-top:16px;display:grid;gap:8px">${KEYS.map(([k, l]) => `<div style="display:grid;grid-template-columns:repeat(${ps.length},1fr);gap:18px;align-items:center"><div style="grid-column:1/-1;font:600 11px Inter;letter-spacing:.16em;color:var(--mute);text-transform:uppercase">${l}</div>${ps.map((p) => { const v = p[k] || 0, top = v === best[k] && ps.length > 1 && v > 0; return `<div class="bars"><div class="r" style="grid-template-columns:1fr 46px"><div class="t"><i style="--w:${best[k] ? (v / best[k]) * 100 : 0}%;${top ? 'background:var(--gold)' : ''}"></i></div><b class="num" style="${top ? 'color:var(--g2)' : ''}">${k === 'rating' ? v.toFixed(1) : v}</b></div></div>`; }).join('')}</div>`).join('')}</div>`;
      NorexMotion.tilt(); NorexArt.apply(root); window.NorexWidgets && NorexWidgets.init(root); $('#cmpClear').onclick = () => { NorexCmp.set([]); history.replaceState(null, '', location.pathname); NorexCmp.sync(); render(); };
    };
    addEventListener('norex-cmp', render); addEventListener('hashchange', render); render();
    if ($('#cmpRoot') && !$('#cmpRoot').hidden) $('#cmpRoot').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // ---------- tactics table ----------
  if ($('#xiPitch')) {
    const F = N.formations, main = F.find((f) => f.main), LS = { get: ls.get, set: ls.set };
    const mounted = {}; let cam = '3d';
    const slotsMain = NorexPitch.leagueSlots(main), assign = slotsMain.map((s) => byK(N.xi[s.s]));
    const pop = (p) => { $('#pop').innerHTML = p ? `<div class="pop">${NorexCards.cardHTML(p, { s: .95 })}</div>` : ''; NorexMotion.tilt(); NorexArt.apply($('#pop')); };
    mounted.xi = NorexPitch.mount($('#xiPitch'), { mode: 'league', orient: 'auto', slots: slotsMain, assign, three: cam === '3d', onPick: (i) => pop(assign[i]) });
    $$('[data-cam]').forEach((b) => b.onclick = () => { cam = b.dataset.cam; $$('[data-cam]').forEach((x) => x.classList.toggle('on', x === b)); mounted.xi.update({ three: cam === '3d' }); });
    // formation wall
    let sel = LS.get('norex.sel', '3-5-2'), clubF = LS.get('norex.clubF', '3-5-2'), lobby = new Set(LS.get('norex.lobby', [])), back = 0;
    const mini = (f) => `<svg viewBox="0 0 68 105"><rect width="68" height="105" fill="#14502e"/><rect x=".5" y=".5" width="67" height="104" fill="none" stroke="#fff6" stroke-width=".6"/><line x1="0" y1="52.5" x2="68" y2="52.5" stroke="#fff6" stroke-width=".5"/>${NorexPitch.leagueSlots(f).map((p) => `<circle cx="${p.lat * 68}" cy="${(1 - p.depth) * 105}" r="3.6" fill="${p.s === 'GK' ? '#4aa3ff' : '#f6dc92'}"/>`).join('')}</svg>`;
    const wall = () => { $('#wall').innerHTML = F.filter((f) => !back || f.back === back).map((f, i) => `<button type="button" class="tile ${f.id === sel ? 'on' : ''} ${f.id === clubF ? 'main' : ''}" data-id="${esc(f.id)}" style="--d:${i * .03}s">${mini(f)}<b>${esc(f.id)}${f.id === clubF ? '<span class="tag">OURS</span>' : ''}${lobby.has(f.id) ? ' <span class="ok">✔</span>' : ''}</b><small>${f.variant ? 'variant layout' : f.back + ' at the back'}</small></button>`).join('');
      $('#fc').textContent = `(${F.length})`; $('#fnote').textContent = `${F.length} shapes: ${F.filter((f) => f.back === 3).length} with 3 at the back, ${F.filter((f) => f.back === 4).length} with 4, ${F.filter((f) => f.back === 5).length} with 5. ✔ marks the ones you ticked as offered in the Clubs lobby (${lobby.size} of ${F.length}). ${N.formationNote}`; };
    const R = N.roles, roleDef = (s, id) => { if (id === '3-5-2' && R.clubPlan352[s]) return R.clubPlan352[s]; const t = R.types[R.slotType[s]]; return [t.roles[0].n, t.roles[0].f[0] ?? '']; };
    const detail = () => { const f = F.find((x) => x.id === sel) || main, plan = LS.get('norex.plan.' + f.id, {}), slots = NorexPitch.leagueSlots(f);
      $('#dN').textContent = f.id; $('#dS').textContent = `${f.back} at the back · ${f.id === clubF ? 'our club formation' : f.main ? 'our usual shape in the archive' : 'not used yet'}`;
      if (mounted.d) mounted.d.update({ slots }); else mounted.d = NorexPitch.mount($('#dPitch'), { mode: 'league', orient: 'v', slots, three: false });
      $('#dSlots').innerHTML = slots.map((p) => { const t = R.types[R.slotType[p.s]], cur = plan[p.s] || roleDef(p.s, f.id), role = t.roles.find((r) => r.n === cur[0]) || t.roles[0];
        return `<div class="slot" data-s="${p.s}"><b>${p.s}</b><select data-k="r" aria-label="${p.s} role">${t.roles.map((r) => `<option ${r.n === role.n ? 'selected' : ''}>${r.n}</option>`).join('')}</select><select data-k="f" aria-label="${p.s} focus">${role.f.length ? role.f.map((x) => `<option ${x === cur[1] ? 'selected' : ''}>${x}</option>`).join('') : '<option>set in game</option>'}</select></div>`; }).join('');
      $('#lobby').textContent = lobby.has(f.id) ? '✔ Offered in the Clubs lobby' : '☐ Tick if the Clubs lobby offers it';
      $('#dMsg').textContent = f.main ? 'Roles pre-filled from the club League Tactics document (a suggestion, edit freely). Saved in this browser only.' : 'Default roles shown. Saved in this browser only, nothing is sent.'; };
    $('#wall').onclick = (e) => { const t = e.target.closest('.tile'); if (!t) return; sel = t.dataset.id; LS.set('norex.sel', sel); wall(); detail(); };
    $('#dSlots').onchange = (e) => { const row = e.target.closest('.slot'); if (!row) return; const f = F.find((x) => x.id === sel), plan = LS.get('norex.plan.' + f.id, {}), s = row.dataset.s, t = R.types[R.slotType[s]]; const rn = $('[data-k=r]', row).value, role = t.roles.find((x) => x.n === rn); plan[s] = [rn, e.target.dataset.k === 'r' ? (role.f[0] || '') : $('[data-k=f]', row).value]; LS.set('norex.plan.' + f.id, plan); detail(); };
    $('#setClub').onclick = () => { clubF = sel; LS.set('norex.clubF', clubF); wall(); detail(); $('#dMsg').textContent = `${sel} marked as our club formation (preview, this browser only).`; };
    $('#lobby').onclick = () => { lobby.has(sel) ? lobby.delete(sel) : lobby.add(sel); LS.set('norex.lobby', [...lobby]); wall(); detail(); };
    tabs('#back', 'b', (b) => { back = +b; wall(); });
    // roles catalogue
    $('#rn').textContent = R.note;
    $('#rg').innerHTML = Object.values(R.types).map((t) => `<div class="rcard"><h3>${t.label}</h3><small>Slots: ${t.slots.join(', ')} · ${t.roles.length} roles</small>${t.roles.map((r) => `<div class="role"><b>${r.n}</b> — ${r.d}<br>${r.f.length ? r.f.map((x) => `<em>${x}</em>`).join('') : '<em>focus: set in game</em>'}</div>`).join('')}</div>`).join('');
    wall(); detail();
    // tabs and modes
    tabs('#tabs', 'tab', (t) => $$('[data-pane]').forEach((p) => { const was = p.hidden; p.hidden = p.dataset.pane !== t; if (!p.hidden) { if (was) { p.classList.remove('tx-in'); void p.offsetWidth; p.classList.add('tx-in'); } NorexMotion.watch(); } }));
    // Rush log: confirmed results (public read of /api/rush; EA has no Rush data). Skeleton, then land.
    const rushLog = () => { const body = $('#rushlogBody'); if (!body || body.dataset.done) return; body.dataset.done = 1;
      if (!window.NOREX_API) { body.innerHTML = '<p class="muted small">The Rush log loads from the club server on the live preview.</p>'; return; }
      NorexMotion.skeleton(body, 3);
      fetch(window.NOREX_API + '/api/rush', { cache: 'no-store' }).then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((R) => {
        const M = (R.matches || []), w = M.filter((m) => m.res === 'W').length, dr = M.filter((m) => m.res === 'D').length, l = M.length - w - dr;
        const pos = {}; M.forEach((m) => (m.players || []).forEach((p) => { const k = p.pos || '–'; const o = pos[k] ??= { g: 0, a: 0, n: 0 }; o.g += p.g || 0; o.a += p.a || 0; o.n++; }));
        const html = !M.length ? '<p class="muted small">No Rush games confirmed yet. Log one from Match Night in the Hub after you play.</p>'
          : `<div class="txf-kpi"><div><b data-count="${M.length}">${M.length}</b><span>confirmed Rush games</span></div><div><b class="num">${w}-${dr}-${l}</b><span>won · drawn · lost</span></div><div><b data-count="${Math.round(w / M.length * 100)}" data-suffix="%">${Math.round(w / M.length * 100)}%</b><span>win rate</span></div>${Object.entries(pos).sort((a, b) => b[1].g - a[1].g).slice(0, 1).map(([k, o]) => `<div><b class="num">${o.g}</b><span>goals from ${esc(k)} (most of any role)</span></div>`).join('')}</div>`
            + M.slice(0, 5).map((m) => `<div class="rush-row"><span class="pill ${m.res.toLowerCase()}">${m.res}</span><span>${esc(m.opp || 'Opponent')} <small class="muted">${esc(m.date)}</small></span><b class="num">${m.gf}–${m.ga}</b></div>`).join('');
        NorexMotion.land(body, html);
      }).catch(() => { body.innerHTML = '<p class="muted small">Could not reach the club server just now. The Rush log will be back on the next visit.</p>'; });
    };
    const rush = () => { if (mounted.r) return; mounted.r = 1; ['r31', 'r22'].forEach((id) => NorexPitch.mount($('#' + id), { mode: 'rush', orient: 'v', slots: NorexPitch.RUSH[$('#' + id).dataset.shape] })); };
    tabs('#mode', 'mode', (m) => { $('#league').hidden = m !== 'league'; $('#rush').hidden = m !== 'rush'; $('#eb').textContent = m === 'rush' ? "Rush · 4 players + AI goalkeeper · the club's own formations" : 'The usual XI · from the club archive'; if (m === 'rush') { rush(); rushLog(); } });
    const h = location.hash.slice(1); if (h === 'rush') $('#mode [data-mode=rush]').click(); else if (['forms', 'roles', 'xi'].includes(h)) $('#tabs [data-tab=' + h + ']').click();
  }

  // ---------- studio: drag, capture keyframes, play ----------
  if ($('#board')) {
    let mode = 'league', orient = 'h', kfs = [], cur = 0;
    let fid = (N.formations.find((f) => f.main) || N.formations[0]).id, rid = '3-1';
    const base = () => mode === 'league' ? NorexPitch.leagueSlots(N.formations.find((f) => f.id === fid)).map((s) => ({ ...s })) : NorexPitch.RUSH[rid].map((s) => ({ ...s }));
    const fillForm = () => { const sel = $('#sform'); sel.innerHTML = mode === 'league' ? N.formations.map((f) => `<option value="${f.id}"${f.id === fid ? ' selected' : ''}>${f.id}${f.main ? ' ★ club' : ''}</option>`).join('') : [['3-1', 'Defensive 3-1'], ['2-2', 'Offensive 2-2']].map(([v, l]) => `<option value="${v}"${v === rid ? ' selected' : ''}>${l}</option>`).join(''); };
    $('#sform').onchange = (e) => { if (mode === 'league') fid = e.target.value; else rid = e.target.value; slots = base(); kfs = []; cur = 0; kfRender(); draw(); };
    let slots = base(); const assignFor = () => slots.map((s) => mode === 'league' ? byK(N.xi[s.s]) : null);
    let inst; const draw = () => { if (inst) inst.destroy(); inst = NorexPitch.mount($('#board'), { mode, orient: mode === 'rush' ? 'v' : 'auto', slots, assign: assignFor(), three: false }); wire(); };
    function wire() { const box = $('#board .pitchbox'); if (!box) return; const o = box.dataset.orient;
      $$('.pc-marker', box).forEach((el, i) => { el.style.touchAction = 'none'; let drag = false;
        el.onpointerdown = (e) => { drag = true; el.setPointerCapture(e.pointerId); el.classList.add('sel'); };
        el.onpointermove = (e) => { if (!drag) return; const r = box.getBoundingClientRect(), x = Math.max(2, Math.min(98, ((e.clientX - r.left) / r.width) * 100)), y = Math.max(2, Math.min(98, ((e.clientY - r.top) / r.height) * 100)); el.style.left = x + '%'; el.style.top = y + '%'; const p = NorexPitch.fromAt(mode, o, x, y); slots[i].depth = p.depth; slots[i].lat = p.lat; };
        el.onpointerup = el.onpointercancel = () => { drag = false; el.classList.remove('sel'); }; }); }
    const kfRender = () => { $('#kfs').innerHTML = `<span class="kf">${kfs.map((_, i) => `<button class="${i === cur ? 'on' : ''}" data-i="${i}">${i + 1}</button>`).join('')}</span>`; $$('#kfs button').forEach((b) => b.onclick = () => { cur = +b.dataset.i; slots = kfs[cur].map((s) => ({ ...s })); draw(); kfRender(); }); };
    $('#kfAdd').onclick = () => { kfs.push(slots.map((s) => ({ ...s }))); cur = kfs.length - 1; kfRender(); };
    $('#kfReset').onclick = () => { slots = base(); kfs = []; cur = 0; kfRender(); draw(); };
    $('#kfPlay').onclick = () => { if (kfs.length < 2) { alert('Capture at least two keyframes first.'); return; } const box = $('#board .pitchbox'), o = box.dataset.orient; slots = kfs[0].map((s) => ({ ...s })); draw(); const nb = $('#board .pitchbox');
      $$('.pc-marker', nb).forEach((el, i) => { const kf = kfs.map((k) => { const p = NorexPitch.at(mode, o, k[i].depth, k[i].lat); return { left: p.x + '%', top: p.y + '%' }; }); el.animate(kf, { duration: 900 * (kfs.length - 1), easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }); }); };
    tabs('#smode', 'mode', (m) => { mode = m; fillForm(); slots = base(); kfs = []; cur = 0; kfRender(); draw(); }); fillForm(); draw(); kfRender();
  }

  // ---------- dugout: pick a formation, tap a slot, tap a player ----------
  if ($('#dgPitch')) {
    const F = N.formations; $('#dgF').innerHTML = F.map((f) => `<option>${f.id}</option>`).join(''); const saved = ls.get('norex.lineup', { f: '3-5-2', a: {} }); $('#dgF').value = saved.f;
    let f = F.find((x) => x.id === saved.f) || F[0], slots = NorexPitch.leagueSlots(f), a = saved.a, selSlot = null, inst;
    const draw = () => { const asg = slots.map((s) => byK(a[s.s])); if (inst) inst.update({ slots, assign: asg }); else inst = NorexPitch.mount($('#dgPitch'), { mode: 'league', orient: 'auto', slots, assign: asg, three: false, onPick: (i) => { selSlot = slots[i].s; $('#dgMsg').textContent = `Picking for ${selSlot}. Choose a player.`; } });
      const used = new Set(Object.values(a)); $('#dgList').innerHTML = N.players.map((p) => `<button class="chip ${used.has(p.k) ? 'on' : ''}" style="justify-content:space-between" data-k="${esc(p.k)}"><span>${esc(p.n)}</span><span class="muted">${p.line} · ${p.ovr ?? '—'}</span></button>`).join(''); };
    const save = () => ls.set('norex.lineup', { f: f.id, a });
    $('#dgList').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b || !selSlot) { if (b) $('#dgMsg').textContent = 'Tap a marker on the pitch first.'; return; } for (const s in a) if (a[s] === b.dataset.k) delete a[s]; a[selSlot] = b.dataset.k; selSlot = null; save(); draw(); $('#dgMsg').textContent = 'Saved in this preview browser.'; };
    $('#dgF').onchange = (e) => { f = F.find((x) => x.id === e.target.value); slots = NorexPitch.leagueSlots(f); const keep = {}; for (const s of slots) if (a[s.s]) keep[s.s] = a[s.s]; a = keep; save(); draw(); };
    $('#dgFill').onclick = () => { a = {}; for (const s of slots) if (N.xi[s.s]) a[s.s] = N.xi[s.s]; save(); draw(); };
    $('#dgClear').onclick = () => { a = {}; save(); draw(); }; draw();
  }

  // ---------- artwork studio (owner) ----------
  if ($('#aList') && window.NOREX_API) { $('#aList').closest('.sec').querySelector('[data-for=owner]').innerHTML = '<div class="panel"><h3>Artwork is managed in the Hub card studio</h3><p class="muted">On the live site, managers approve, revoke and request resubmission in the existing card studio. Approved portraits already show on every card in this preview.</p></div>'; }
  else if ($('#aList')) {
    const H = { 'x-as': 'owner' }, q = (u) => u + (u.includes('?') ? '&' : '?') + 'as=owner';
    const act = async (k, action, extra = {}) => { const r = await fetch('api/art/action', { method: 'POST', headers: H, body: JSON.stringify({ k, action, ...extra }) }); if (!r.ok) alert((await r.json()).error); NorexArt.notify(); await NorexArt.refresh(); list(); };
    async function list() {
      const r = await fetch('api/art/all', { headers: H, cache: 'no-store' }); const all = r.ok ? await r.json() : {}, keys = Object.keys(all);
      $('#aList').innerHTML = keys.length ? keys.map((k) => { const a = all[k], pill = { approved: 'w', pending: 's', revoked: 'l', resubmit: 'd' }[a.status] || '';
        return `<div class="aitem" data-k="${esc(k)}"><img class="thumb" src="${q('art/' + encodeURIComponent(k) + '.png?v=' + a.v)}" alt="Artwork for ${esc(k)}"><div style="display:flex;justify-content:space-between"><b>${esc(k)}</b><span class="pill ${pill}">${a.status.toUpperCase()}</span></div><div class="muted tiny">${a.w}×${a.h} · ${(a.bytes / 1024).toFixed(0)} KB · by ${a.by}${a.note ? ' · “' + esc(a.note) + '”' : ''}</div>
        <div class="chips" style="margin-top:8px"><input data-r="kit" value="${esc(a.kit)}" maxlength="2" placeholder="Kit" aria-label="Kit number" style="width:64px;padding:7px;border-radius:8px;background:var(--p3);border:1px solid var(--line2);color:#fff"><label class="muted tiny">number height <input data-r="y" type="range" min="30" max="70" value="${a.numY || 47}" style="vertical-align:middle;width:90px"></label><button class="chip" data-a="kit">Save</button></div>
        <div class="chips"><button class="chip gold" data-a="approve">Approve</button><button class="chip" data-a="revoke">Revoke</button><button class="chip" data-a="resubmit">Ask to resubmit</button><a class="chip" href="${q('art/' + encodeURIComponent(k) + '.png?dl=1')}">⬇ Download</a><button class="chip" data-a="del">Delete</button></div></div>`; }).join('') : '<p class="muted">No artwork submitted yet.</p>';
    }
    $('#aList').onclick = async (e) => { const b = e.target.closest('[data-a]'); if (!b) return; const it = b.closest('.aitem'), k = it.dataset.k, a = b.dataset.a;
      if (a === 'resubmit') { const note = prompt('What should they fix? (shown to the member)', 'Please use a transparent background and a full-body pose.'); if (note !== null) act(k, 'resubmit', { note }); }
      else if (a === 'kit') act(k, 'kit', { kit: $('[data-r=kit]', it).value, numY: $('[data-r=y]', it).value });
      else if (a === 'del') { if (confirm('Delete this artwork for good?')) { await fetch('api/art/delete?k=' + encodeURIComponent(k), { method: 'POST', headers: H }); NorexArt.notify(); await NorexArt.refresh(); list(); } }
      else act(k, a); };
    $('#aGo').onclick = async () => { const f = $('#aF').files[0], k = $('#aP').value; if (!f) { $('#aM').textContent = 'Choose a PNG first.'; return; }
      const r = await fetch(`api/art/submit?k=${encodeURIComponent(k)}&kit=${encodeURIComponent($('#aK').value)}&approve=${$('#aOK').checked ? 1 : 0}`, { method: 'POST', headers: H, body: await f.arrayBuffer() }); const j = await r.json();
      $('#aM').textContent = r.ok ? `Uploaded for ${k} (${j.status}).` : j.error; if (r.ok) { NorexArt.notify(); await NorexArt.refresh(); list(); } };
    list();
  }

  // skeleton placeholders while live panels load (cleared when each panel draws itself)
  if (window.NOREX_API && window.NorexAuth && NorexAuth.token) ['#rsvppanel', '#motmpanel', '#ratepanel', '#availpanel'].forEach((s) => { const el = $(s); if (el) el.insertAdjacentHTML('beforeend', '<div class="sk-wrap" aria-hidden="true"><i class="sk"></i><i class="sk s2"></i><i class="sk s3"></i></div>'); });
  // ---------- hub landing: real next match night, alerts and medals (read-only, signed-in members) ----------
  if ($('#nextpanel') && window.NOREX_API && window.NorexAuth && NorexAuth.token) {
    const T = (ms, tz) => { try { return new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
    const ago = (ms) => { const m = Math.max(1, Math.round((Date.now() - ms) / 60000)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
    const M = NorexMotion, np = $('#nextpanel'), ap = $('#alertpanel'), mp = $('#medalpanel');
    // countdown ring: a full lap is the last 7 days before kick-off; inside 30 minutes it pulses, during the night it reads "On now"
    const span = (ms) => { const m = Math.max(0, Math.round(ms / 60000)), dd = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60; return dd ? `${dd}d ${h}h` : h ? `${h}h ${mm}m` : `${mm}m`; };
    let tick = 0;
    const ring = (n) => { const box = $('.lk-ring', np); if (!box) return; const now = Date.now(), left = n.start - now, on = left <= 0 && now < n.start + (n.duration || 120) * 60000, f = on ? 1 : Math.max(0, Math.min(1, 1 - left / (7 * 864e5)));
      box.style.setProperty('--f', f.toFixed(4)); $('.lk-rt', box).textContent = on ? 'On now' : span(left); $('.lk-rs', box).textContent = on ? 'join the lobby' : 'to kick-off';
      box.classList.toggle('soon', !on && left <= 30 * 60000); box.classList.toggle('live', on);
      clearTimeout(tick); if (now < n.start + (n.duration || 120) * 60000) tick = setTimeout(() => ring(n), left < 3600e3 ? 1000 : 30000); };
    const load = () => {
      [np, ap].forEach((el) => M.skeleton(el, 4)); mp.hidden = false; M.skeleton(mp, 2);
      NorexAuth.call('/api/locker').then((L) => {
        const n = L.next;
        if (n) {
          const mine = { yes: '✅ You are in', no: '❌ You are out', maybe: '🤔 Maybe' }[n.mine] || '⏳ Not answered yet';
          M.land(np, `<div class="eyebrow">🗓️ Next match night</div><div class="lk-next"><div class="lk-ring" role="timer" aria-live="off"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="t" cx="50" cy="50" r="44"/><circle class="v" cx="50" cy="50" r="44" pathLength="100"/></svg><div><b class="lk-rt">–</b><small class="lk-rs"></small></div></div>
<div class="lk-nt"><h3 class="fit">${esc(n.title || (n.type ? n.type[0].toUpperCase() + n.type.slice(1) : 'Match night'))}</h3><p class="small">${esc(T(n.start))}</p><p class="small" style="margin-top:4px"><b class="num">${n.inCount}</b> in · <b>${mine}</b></p>${(n.in || []).length ? `<div class="lk-in">${n.in.slice(0, 6).map((u) => u.a ? `<img src="${esc(u.a)}" alt="${esc(u.n)}" title="${esc(u.n)}" loading="lazy">` : `<span title="${esc(u.n)}">${esc((u.n || '?')[0])}</span>`).join('')}${n.inCount > 6 ? `<span>+${n.inCount - 6}</span>` : ''}</div>` : ''}</div></div>
<a class="btn ${n.mine ? 'ghost' : 'gold'}" href="hub-matchnight.html" style="margin-top:10px;width:100%">${n.mine ? 'Match Night' : '🙋 Answer the RSVP'}</a>`, () => ring(n));
        } else M.land(np, `<div class="eyebrow">🗓️ Next match night</div><h3 style="margin:6px 0">None scheduled</h3><p class="muted small">You'll be alerted here the moment the managers schedule one.</p><a class="btn ghost" href="hub-matchnight.html" style="margin-top:6px">Match Night</a>`);
        const al = L.alerts || [];
        M.land(ap, `<div class="eyebrow"><span class="lk-bell" aria-hidden="true">🔔</span> Alerts${L.unread ? ` <span class="lk-badge">${L.unread} new</span>` : ''}</div>` + (al.length ? `<ul class="lk-al">${al.map((a) => `<li class="${a.read ? '' : 'new'}"><span>${esc(a.icon || '🔔')}</span><span>${a.link ? `<a href="${esc(/^(https?:|\.\.\/)/.test(a.link) ? a.link : '../' + a.link.replace(/^\//, ''))}">${esc(a.title)}</a>` : esc(a.title)}<small class="muted"> · ${ago(a.at)}</small></span></li>`).join('')}</ul>` : '<p class="muted small" style="margin-top:6px">No alerts yet. Approvals, RSVPs and mentions appear here.</p>'),
          () => { if (L.unread) setTimeout(() => M.ring($('.lk-bell', ap)), 500); });
        const m = L.medals;
        if (m && m.count) M.land(mp, `<div class="eyebrow">🏅 Medals · ${m.count}/${m.total}</div><div class="lk-med">${m.top.map((x) => `<span class="lk-m t-${esc(String(x.tier).toLowerCase())}" title="${esc(x.name)} · ${esc(x.tier)}"><i>${esc(x.icon)}</i><small>${esc(x.name)}</small></span>`).join('')}</div>${m.count > m.top.length ? `<p class="muted tiny" style="margin-top:8px">+${m.count - m.top.length} more on your profile</p>` : ''}`);
        else M.land(mp, '<div class="eyebrow">🏅 Medals</div><p class="muted small" style="margin-top:6px">No medals yet. Play, vote and RSVP to unlock your first.</p>');
      }).catch((e) => { clearTimeout(tick); const err = `<p class="muted small" style="margin-top:6px">Could not load this just now.</p><button type="button" class="btn ghost" data-lkretry style="margin-top:8px">↻ Try again</button>`;
        [np, ap, mp].forEach((el) => { el.removeAttribute('aria-busy'); el.innerHTML = `<div class="eyebrow">${el === np ? '🗓️ Next match night' : el === ap ? '🔔 Alerts' : '🏅 Medals'}</div>` + err; });
        M.toast(e.message || 'Could not reach the club server', { kind: 'err' }); });
    };
    d.addEventListener('click', (e) => { if (e.target.closest('[data-lkretry]')) load(); });
    load();
  }
  // ---------- hub landing: the card, in the exact place the entrance ends ----------
  if ($('#cardslot')) {
    const player = me.player || (!window.NOREX_API && me.as !== 'guest' ? N.players[0] : null);
    if (!player && window.NOREX_API && me.as !== 'guest') { const nc = $('#noclaim'); if (nc) nc.hidden = false; $('#lockstage')?.classList.add('nocard'); }
    if (player) {
      const T = NorexHub.hubCardRect(), slot = $('#cardslot'); const arrived = /[?&]arrived=1/.test(location.search);
      Object.assign(slot.style, { position: 'absolute', left: T.left + 'px', top: T.top + 'px', width: T.w + 'px', height: T.h + 'px', zIndex: 3 }); d.documentElement.style.setProperty('--cardH', T.h + 'px');
      slot.innerHTML = NorexCards.cardHTML(player, { s: T.s, link: false, id: 'mycard' }).replace('style="--s', 'style="view-transition-name:hubcard;--s'); const card = $('#mycard'); NorexMotion.tilt(); NorexArt.apply(slot);
      if (arrived) { history.replaceState(null, '', location.pathname); }
      const gl = $('.gloss i', card); if (gl && !NorexMotion.reduced()) setTimeout(() => gl.animate([{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 1100, easing: 'cubic-bezier(.2,.9,.2,1)' }), arrived ? 150 : 400);
      let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const n = NorexHub.hubCardRect(); Object.assign(slot.style, { left: n.left + 'px', top: n.top + 'px', width: n.w + 'px', height: n.h + 'px' }); card.style.setProperty('--s', n.s); d.documentElement.style.setProperty('--cardH', n.h + 'px'); }, 120); });
      const mp = N.players.find((p) => p.k === player.k) || player;
      $('#mystats').innerHTML = `<div class="eyebrow">${esc(mp.n)}</div><div class="sb" style="margin-top:10px;grid-template-columns:repeat(3,1fr)"><div class="sbt gold"><b>${mp.goals}</b><span>Goals</span></div><div class="sbt"><b>${mp.assists}</b><span>Assists</span></div><div class="sbt gold"><b>${mp.rating ? (+mp.rating).toFixed(1) : '—'}</b><span>Rating</span></div></div><a class="btn ghost" href="player-${encodeURIComponent(mp.k)}.html" style="margin-top:12px;width:100%">Open my profile</a>`;
      // form: the last three match ratings (fire 8.0+, frost 6.0 or lower), same rule as the cards and profile
      const fp = $('#formpanel'), ff = N.full && N.full.find((p) => p.k === mp.k);
      if (fp && ff) { fp.hidden = false; const f3 = ff.form3 || [], st = ff.hot ? ['🔥', 'On fire', 'hot'] : ff.cold ? ['🧊', 'Gone cold', 'cold'] : f3.length === 3 ? ['〰️', 'Steady', ''] : ['⏳', 'Needs three games', ''];
        fp.innerHTML = `<div class="eyebrow">📈 Form · last ${f3.length || 3}</div><div class="lk-form ${st[2]}"><span class="lk-fe">${st[0]}</span><div><b>${st[1]}</b><small class="muted">${ff.formAvg != null ? `average <b class="num">${(+ff.formAvg).toFixed(1)}</b>` : `${f3.length} of 3 rated games on record`}</small></div></div><div class="lk-orbs">${f3.map((r, i) => `<span class="${r >= 8 ? 'hi' : r <= 6 ? 'lo' : ''}" style="--i:${i}"><b class="num">${(+r).toFixed(1)}</b><small>${i ? i === 1 ? '2nd last' : '3rd last' : 'latest'}</small></span>`).join('')}</div>`; }
      if ($('#myviz') && N.full) { const mf = N.full.find((p) => p.k === mp.k) || mp, pool = N.full.filter((p) => p.gp >= 8), AX = [['Goals / game', (p) => p.goals / Math.max(1, p.gp)], ['Assists / game', (p) => p.assists / Math.max(1, p.gp)], ['Rating', (p) => p.rating], ['Passing', (p) => p.pass], ['Tackling', (p) => p.tackleRate], ['Win rate', (p) => p.win]], mxs = AX.map(([, f]) => Math.max(1e-9, ...pool.map(f))), tier = (mf.ovr || 0) >= 85 ? 3 : (mf.ovr || 0) >= 80 ? 2 : (mf.ovr || 0) >= 75 ? 1 : 0;
        $('#myviz').innerHTML = `<div class="wx"><div class="radar" data-w="radar" data-j="${esc(JSON.stringify({ axes: AX.map((a) => a[0]), series: [{ n: mf.n, v: AX.map(([, f], i) => +(f(mf) / mxs[i]).toFixed(3)) }] }))}"></div></div><div class="tiernote muted small" style="text-align:center">Your tier: <b class="gold-t">${['Bronze', 'Silver', 'Gold', 'Elite'][tier]}</b> (overall ${mf.ovr ?? '—'})</div>`; window.NorexWidgets && NorexWidgets.init($('#myviz')); }
      (async () => { const box = $('#artpanel'); if (window.NOREX_API) { box.innerHTML = '<div class="eyebrow">Card artwork</div><p class="muted small" style="margin-top:8px">You submit and manage your card artwork in the Hub card studio. Approved portraits already appear on every card here.</p>'; return; } const r = await fetch('api/art/mine?k=' + encodeURIComponent(player.k)).then((x) => x.json()).catch(() => ({ status: 'none' }));
        const msg = { none: 'No artwork yet. Your card uses the club fallback until your AI Studio artwork is approved.', pending: 'Submitted. A manager will review it.', approved: 'Approved. It now appears everywhere you do.', revoked: 'Approval was withdrawn. Submit a new image.', resubmit: 'The owner asked for a new image: ' + (r.note || '') }[r.status];
        box.innerHTML = `<div class="eyebrow">AI Studio artwork</div><p class="muted small" style="margin:6px 0 10px">${msg}</p><label class="btn gold" style="width:100%;cursor:pointer">Upload transparent PNG<input id="mAf" type="file" accept="image/png" hidden></label><input id="mAk" maxlength="2" placeholder="Kit number" aria-label="Kit number" value="${esc(r.kit || '')}" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;background:var(--p3);border:1px solid var(--line2);color:#fff"><p class="muted tiny" id="mAm" style="margin-top:6px"></p>`;
        $('#mAf').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const res = await fetch(`api/art/submit?k=${encodeURIComponent(player.k)}&kit=${encodeURIComponent($('#mAk').value)}`, { method: 'POST', headers: me.as === 'owner' ? { 'x-as': 'owner' } : {}, body: await f.arrayBuffer() }); const j = await res.json(); $('#mAm').textContent = res.ok ? 'Sent for approval.' : j.error; }; })();
    }
  }
});
