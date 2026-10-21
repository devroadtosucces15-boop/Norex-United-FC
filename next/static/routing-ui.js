// Notification routing editor (owner), shared by the Boardroom's Control Center rows.
//   GET|POST /api/bot/routes  (rules: action → group → method → channel, optional "send even if muted")
//   GET /api/events/discord   (channels + roles to pick from)   ·   POST /api/bot/settings { reminderChannel }  (default channel)
// window.NorexRouting.create({ call, toast, paint }) → editor
//   editor.load()            fetch the rules and the Discord channel/role lists
//   editor.has(feature)      does this feature have alert actions that can be routed yet?
//   editor.count(feature)    live rules for it
//   editor.html(feature)     the rules table for one feature, with Add / Save
//   editor.defaultsHtml()    the "default channel" bar
//   editor.click(ev) / editor.change(ev)   → true when the event was ours (host calls these first)
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sel = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const pick = (o) => Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : `${v.icon} ${v.label}`]);

  function create({ call, toast, paint }) {
    const R = { routes: null, rdraft: null, dc: null, err: null, busy: false, open: new Set(), defaultChannel: '' };
    const feat = (r) => R.routes?.actions?.[r.action]?.feature;
    const actionsOf = (f) => Object.entries(R.routes?.actions ?? {}).filter(([, a]) => a.feature === f).map(([k]) => k);

    async function load() {
      try { R.routes = await call('/api/bot/routes'); R.rdraft = R.routes.rules.map((r) => ({ ...r })); R.err = null; } catch (e) { R.err = e.message; }
      try { R.dc = await call('/api/events/discord'); } catch { R.dc = { ready: false }; }
      try { R.defaultChannel = (await call('/api/bot/settings')).reminderChannel || ''; } catch { /* owner only */ }
    }
    const has = (f) => actionsOf(f).length > 0;
    const count = (f) => (R.rdraft ?? []).filter((r) => feat(r) === f && r.on !== false).length;

    function readRows() {
      document.querySelectorAll('tr[data-rt]').forEach((tr) => {
        const g = (f) => tr.querySelector(`[data-rf="${f}"]`), r = R.rdraft[+tr.dataset.rt]; if (!r) return;
        r.on = g('on').checked; r.action = g('action').value; r.group = g('group').value; r.method = g('method').value;
        r.force = r.method === 'dm' && !!g('force')?.checked;
        r.role = g('role')?.value ?? ''; if (r.group === 'role' && r.method === 'dm') r.method = 'tag';
        r.channel = g('channel') ? (g('channelId').value.trim() || g('channel').value) : '';
      });
    }

    function rowHtml(r, i, f) {
      const ch = R.dc?.channels || [], roles = R.dc?.roles || [], dm = r.method === 'dm', known = ch.some((c) => c.id === r.channel);
      const acts = actionsOf(f).map((k) => [k, `${R.routes.actions[k].icon} ${R.routes.actions[k].label}`]);
      return `<tr data-rt="${i}"><td><input type="checkbox" data-rf="on" aria-label="Rule on"${r.on === false ? '' : ' checked'}></td>
<td><select data-rf="action" aria-label="When this happens" style="width:100%">${sel(acts, r.action)}</select></td>
<td><select data-rf="group" aria-label="Who" style="width:100%">${sel(pick(R.routes.groups), r.group)}</select>${r.group === 'role' ? `<select data-rf="role" aria-label="Discord role" style="width:100%;margin-top:6px"><option value="">Pick a role…</option>${roles.map((x) => `<option value="${esc(x.id)}"${x.id === r.role ? ' selected' : ''}>${esc(x.name.startsWith('@') ? x.name : '@' + x.name)}</option>`).join('')}</select>` : ''}</td>
<td><select data-rf="method" aria-label="How" style="width:100%">${sel(pick(R.routes.methods).filter(([k]) => !(r.group === 'role' && k === 'dm')), r.method)}</select></td>
<td>${dm ? `<label class="small" style="display:flex;gap:6px;align-items:flex-start"><input type="checkbox" data-rf="force" aria-label="Send even if muted"${r.force ? ' checked' : ''}> <span><b>Send even if muted</b><br><span class="muted">Overrides their alert settings. Max 5 a day each, skips closed DMs, goes first in the queue.</span></span></label>`
        : `<select data-rf="channel" aria-label="Channel" style="width:100%"><option value="">Default channel</option>${ch.map((c) => `<option value="${esc(c.id)}"${c.id === r.channel ? ' selected' : ''}>#${esc(c.name)}</option>`).join('')}${r.channel && !known ? `<option value="${esc(r.channel)}" selected>ID ${esc(r.channel)}</option>` : ''}</select><input data-rf="channelId" style="width:100%;margin-top:6px" inputmode="numeric" pattern="\\d{5,25}" maxlength="25" placeholder="or paste a channel ID" aria-label="Channel ID" value="">`}</td>
<td><button class="chip danger" type="button" data-rt-del="${i}" aria-label="Remove rule">✕</button></td></tr>`;
    }

    function html(f) {
      if (R.err) return `<p class="muted small">Could not load the alert rules: ${esc(R.err)}</p>`;
      if (!R.routes) return '<div class="dg-skel"><i></i></div>';
      const rows = R.rdraft.map((r, i) => (feat(r) === f ? rowHtml(r, i, f) : '')).join('');
      return `<div class="br-alerts" style="grid-column:1 / -1;margin:6px 0 14px;padding:12px;border:1px solid var(--line, rgba(255,255,255,.1));border-radius:10px">
<p class="muted small" style="margin:0 0 8px">Who is told when something happens to this feature, and how. With no rules it keeps its built-in behaviour; once it has rules, only these run.</p>
${rows ? `<div style="overflow-x:auto"><table class="tbl" style="table-layout:fixed;min-width:900px"><thead><tr><th style="width:44px">On</th><th style="width:22%">When this happens</th><th style="width:22%">Tell</th><th style="width:20%">How</th><th>Where</th><th style="width:44px"></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted small">No rules yet – built-in behaviour.</p>'}
<div class="dk-btns" style="justify-content:flex-start;margin-top:10px"><button class="chip" type="button" data-rt-add="${esc(f)}">➕ Add rule</button><button class="btn" type="button" data-rt-save${R.busy ? ' disabled' : ''}>💾 Save alert rules</button></div></div>`;
    }

    function defaultsHtml() {
      const ch = R.dc?.channels || [], known = ch.some((c) => c.id === R.defaultChannel);
      return `<label class="small" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>Default channel for posts</b>
<select data-rt-default aria-label="Default channel"><option value="">None – each rule picks its own</option>${ch.map((c) => `<option value="${esc(c.id)}"${c.id === R.defaultChannel ? ' selected' : ''}>#${esc(c.name)}</option>`).join('')}${R.defaultChannel && !known ? `<option value="${esc(R.defaultChannel)}" selected>ID ${esc(R.defaultChannel)}</option>` : ''}</select>
<span class="muted">Used by any rule left on “Default channel” (replaces the old “reminder channel” box).</span></label>`;
    }

    function click(ev) {
      const t = ev.target.closest('button'); if (!t) return false;
      if (t.dataset.rtToggle !== undefined) { R.open.has(t.dataset.rtToggle) ? R.open.delete(t.dataset.rtToggle) : R.open.add(t.dataset.rtToggle); paint(); return true; }
      if (t.dataset.rtAdd !== undefined) { readRows(); const f = t.dataset.rtAdd; R.rdraft.push({ action: actionsOf(f)[0], group: 'everyone', method: 'channel', channel: '', on: true }); paint(); return true; }
      if (t.dataset.rtDel !== undefined) { readRows(); R.rdraft.splice(+t.dataset.rtDel, 1); paint(); return true; }
      if (t.hasAttribute('data-rt-save')) {
        readRows();
        if (R.rdraft.some((r) => r.force) && !confirm('A rule is set to “Send even if muted”. It DMs people even if they turned that alert off (max 5 a day each). Save it?')) return true;
        R.busy = true; paint();
        call('/api/bot/routes', { rules: R.rdraft }).then((r) => { R.routes = r; R.rdraft = r.rules.map((x) => ({ ...x })); toast('Alert rules saved'); }).catch((e) => toast(e.message, true)).finally(() => { R.busy = false; paint(); });
        return true;
      }
      return false;
    }
    function change(ev) {
      const t = ev.target;
      if (t.matches?.('[data-rt-default]')) { call('/api/bot/settings', { reminderChannel: t.value }).then((s) => { R.defaultChannel = s.reminderChannel || ''; toast(t.value ? 'Default channel saved' : 'Default channel cleared'); }).catch((e) => toast(e.message, true)); return true; }
      if (t.closest?.('tr[data-rt]')) { readRows(); if (['group', 'method'].includes(t.dataset.rf)) paint(); return true; }
      return false;
    }
    return { load, has, count, html, defaultsHtml, click, change, state: R };
  }
  window.NorexRouting = { create };
})();
