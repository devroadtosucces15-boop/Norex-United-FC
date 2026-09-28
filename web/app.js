// Sortable tables, live filtering and local times. Progressive enhancement only.
document.querySelectorAll('table.sortable').forEach((table) => {
  table.querySelectorAll('th').forEach((th, col) => {
    th.addEventListener('click', () => {
      const asc = th.getAttribute('aria-sort') === 'descending';
      table.querySelectorAll('th').forEach((h) => h.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
      const body = table.tBodies[0];
      const val = (tr) => {
        const td = tr.children[col];
        const v = td?.dataset.v ?? td?.textContent.trim() ?? '';
        const n = parseFloat(v.replace(/[%,]/g, ''));
        return isNaN(n) || !/^-?[\d.]/.test(v) ? v.toLowerCase() : n;
      };
      [...body.rows]
        .sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); })
        .forEach((r) => body.appendChild(r));
    });
  });
});
document.querySelectorAll('input[data-filter]').forEach((input) => {
  const rows = [...document.getElementById(input.dataset.filter).tBodies[0].rows];
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    rows.forEach((r) => (r.hidden = q && !r.textContent.toLowerCase().includes(q)));
  });
});
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
document.querySelectorAll('time.ago').forEach((t) => {
  const mins = Math.round((new Date(t.dateTime) - Date.now()) / 60000);
  t.textContent = Math.abs(mins) < 60 ? rtf.format(mins, 'minute') : Math.abs(mins) < 1440 ? rtf.format(Math.round(mins / 60), 'hour') : rtf.format(Math.round(mins / 1440), 'day');
});
