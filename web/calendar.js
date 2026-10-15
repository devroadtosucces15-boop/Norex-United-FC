// Match Night Centre month grid (BE11). Squad Hub → 🗓️ Schedule → 📆 Month – assets/events.js switches to it.
//   NXCalendar.grid(el, ctx)   ctx = { call, onPick(eventId) }
// One call per month: GET /api/events/calendar?month=YYYY-MM. Days are the viewer's own local days (Monday first);
// every event shows its kind colour, start time, title and your answer. Tap an event → onPick jumps to its card in the list.
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ICON = { yes: '✅', maybe: '❔', no: '❌' };
  const MAX_PER_DAY = 3;
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const timeOf = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  // Mon..Sun labels from a known Monday (1 Jan 2024), so they follow the viewer's locale.
  const WEEKDAYS = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }));

  function grid(el, ctx) {
    let cur = new Date();
    cur.setDate(1); cur.setHours(12, 0, 0, 0);
    let data = null, seq = 0;

    const load = async () => {
      const mine = ++seq;
      el.innerHTML = `<div class="cal-skel" aria-busy="true"><span></span><span></span><span></span></div>`;
      try {
        const r = await ctx.call(`/api/events/calendar?month=${monthKey(cur)}`);
        if (mine !== seq) return; // a newer month was asked for meanwhile
        data = r;
        paint();
      } catch {
        el.innerHTML = `<div class="cal-err"><p class="muted">Couldn’t load this month.</p><button type="button" class="btn sm ghost" data-cal-nav="retry">↻ Try again</button></div>`;
      }
    };

    // Events grouped by the viewer's local day. Cancelled ones stay visible, struck through.
    function byDay(events) {
      const map = new Map();
      for (const e of events) {
        const k = dayKey(new Date(e.start));
        (map.get(k) ?? map.set(k, []).get(k)).push(e);
      }
      return map;
    }

    function chip(e, types) {
      const t = types[e.type] ?? { emoji: '🗓️', label: 'Event', colour: '#c8352c' };
      const cancelled = e.status !== 'scheduled';
      const answer = e.mine ? ` · you: ${e.mine}` : '';
      return `<button type="button" class="cal-ev${cancelled ? ' off' : ''}${e.mine ? ` my-${esc(e.mine)}` : ''}" style="--c:${esc(t.colour)}" data-cal-ev="${e.id}" title="${esc(`${e.title || t.label} · ${timeOf(e.start)}${answer}`)}">
<i aria-hidden="true">${t.emoji}</i><b>${timeOf(e.start)}</b><span>${esc(e.title || t.label)}</span><em aria-hidden="true">${cancelled ? '🚫' : e.mine ? ICON[e.mine] : ''}</em></button>`;
    }

    function paint() {
      const types = data.types ?? {};
      const days = byDay(data.events ?? []);
      const todayKey = dayKey(new Date());
      const lead = (cur.getDay() + 6) % 7; // Monday-first offset of the 1st
      const count = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push('<div class="cal-day pad" aria-hidden="true"></div>');
      for (let d = 1; d <= count; d++) {
        const dt = new Date(cur.getFullYear(), cur.getMonth(), d, 12);
        const k = dayKey(dt), list = days.get(k) ?? [];
        const shown = list.slice(0, MAX_PER_DAY), more = list.length - shown.length;
        cells.push(`<div class="cal-day${k === todayKey ? ' today' : ''}${list.length ? ' has' : ''}" role="gridcell" aria-label="${esc(dt.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))}${list.length ? `, ${list.length} event${list.length > 1 ? 's' : ''}` : ''}">
<span class="cal-num">${d}</span>${shown.map((e) => chip(e, types)).join('')}${more > 0 ? `<small class="cal-more">+${more} more</small>` : ''}</div>`);
      }
      while (cells.length % 7) cells.push('<div class="cal-day pad" aria-hidden="true"></div>');

      const used = [...new Set((data.events ?? []).map((e) => e.type))].filter((t) => types[t]);
      const title = cur.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const isNow = monthKey(cur) === monthKey(new Date());
      el.innerHTML = `<div class="cal">
<div class="cal-head"><button type="button" class="btn sm ghost" data-cal-nav="prev" aria-label="Previous month">‹</button>
<h4>${esc(title)}</h4>
<button type="button" class="btn sm ghost" data-cal-nav="next" aria-label="Next month">›</button>${isNow ? '' : '<button type="button" class="btn sm ghost" data-cal-nav="today">Today</button>'}</div>
${used.length ? `<div class="cal-legend">${used.map((t) => `<span style="--c:${esc(types[t].colour)}">${types[t].emoji} ${esc(types[t].label)}</span>`).join('')}</div>` : ''}
<div class="cal-grid" role="grid" aria-label="${esc(title)}">
<div class="cal-wk" role="row">${WEEKDAYS.map((w) => `<span role="columnheader">${esc(w)}</span>`).join('')}</div>
<div class="cal-body">${cells.join('')}</div>
</div>
${(data.events ?? []).length ? '' : '<p class="muted small cal-none">No match nights this month yet.</p>'}
</div>`;
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b)) return;
      const nav = b.dataset.calNav, ev = b.dataset.calEv;
      if (nav === 'retry') return load();
      if (nav === 'prev') { cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1, 12); return load(); }
      if (nav === 'next') { cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1, 12); return load(); }
      if (nav === 'today') { cur = new Date(); cur.setDate(1); cur.setHours(12, 0, 0, 0); return load(); }
      if (ev) ctx.onPick?.(+ev);
    });

    load();
  }

  window.NXCalendar = { grid };
})();
