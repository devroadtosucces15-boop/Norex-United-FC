// Bot personalisation (roadmap P7.5): manager portal "Bot settings" tab, mounted by app.js into #bot-admin.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const AP = [['results', '⚽ Match results'], ['reminders', '⏰ Event reminders'], ['awards', '🏆 Weekly awards']];
  const B = { data: null, busy: false, err: null, cmds: null, cmdErr: null, dirty: false };
  const ROLE_OPTS = [['guest', 'Everyone'], ['member', 'Members'], ['claimed', 'Verified players'], ['manager', 'Managers'], ['owner', 'Owner only']];
  const REPLY_OPTS = [['default', 'As built'], ['private', 'Private (only them)'], ['public', 'Public']];

  function cmdView() {
    if (B.cmdErr && !B.cmds) return `<p class="muted">${esc(B.cmdErr)}</p>`;
    if (!B.cmds) return window.UI ? UI.skeleton('rows', 4) : '…';
    const chans = B.cmds.channels;
    const opts = (list, cur) => list.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const chOpts = (cur, blank) => `<option value="">${blank}</option>` + chans.map((c) => `<option value="${c.id}"${c.id === cur ? ' selected' : ''}>#${esc(c.name)}</option>`).join('');
    const rows = B.cmds.commands.map((c) => `<tr data-cmd="${esc(c.name)}">
<td><b>/${esc(c.name)}</b><div class="muted small">${esc(c.description)}</div></td>
<td><input type="checkbox" data-f="enabled"${c.enabled === false ? '' : ' checked'} aria-label="On"></td>
<td><select data-f="min">${opts(ROLE_OPTS, c.min || (c.staff ? 'manager' : 'guest'))}</select></td>
<td><select data-f="channel">${chOpts((c.channels || [])[0] || '', 'Any channel')}</select></td>
<td><select data-f="reply">${opts(REPLY_OPTS, c.reply || 'default')}</select></td>
<td><select data-f="postTo">${chOpts(c.postTo || '', 'Where it was used')}</select></td></tr>`).join('');
    return `<h3>🎛️ Bot commands</h3>
<p class="muted small">Pick who can use each command, which channel it works in, whether the answer is private, and where it posts. Owners always get through; managers ignore the channel limit. Rules apply the moment you save. <b>Sync to Discord</b> also hides staff-only commands from the command list.${B.cmds.channelsError ? ` <span class="warn">Channel list unavailable: ${esc(B.cmds.channelsError)}</span>` : ''}</p>
<div class="table-wrap"><table class="tbl"><thead><tr><th>Command</th><th>On</th><th>Who can use it</th><th>Only in</th><th>Reply</th><th>Post to</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="row" style="margin-top:14px;gap:10px"><button class="btn" data-cmd-save${B.busy ? ' disabled' : ''}>💾 Save commands</button><button class="btn ghost" data-cmd-sync${B.busy ? ' disabled' : ''}>🔄 Sync to Discord</button></div>`;
  }
  function readCmds(el) {
    const out = {};
    el.querySelectorAll('tr[data-cmd]').forEach((tr) => {
      const g = (f) => tr.querySelector(`[data-f="${f}"]`);
      const c = B.cmds.commands.find((x) => x.name === tr.dataset.cmd);
      const o = { enabled: g('enabled').checked, min: g('min').value, reply: g('reply').value, postTo: g('postTo').value };
      if (g('channel').value) o.channels = [g('channel').value];
      if (o.min === (c.staff ? 'manager' : 'guest')) delete o.min;
      out[tr.dataset.cmd] = o;
    });
    return out;
  }
  async function cmdAct(el, ctx, sync) {
    B.busy = true; const box = $('[data-cmds]', el); const keep = sync ? null : readCmds(el);
    try {
      if (keep) { await ctx.call('/api/bot/commands', { commands: keep }); ctx.toast('Command rules saved'); }
      else { const r = await ctx.call('/api/bot/commands/sync', {}); ctx.toast(`Synced ${r.count} commands to Discord`); }
      B.cmds = await ctx.call('/api/bot/commands');
    } catch (e) { ctx.toast(e.message, true); }
    B.busy = false; if (box) box.innerHTML = cmdView();
  }

  function view() {
    if (B.err && !B.data) return `<p class="muted">${esc(B.err)}</p>`;
    if (!B.data) return window.UI ? UI.skeleton('rows', 4) : '…';
    const s = B.data;
    return `<h3>🤖 Bot personalisation</h3>
<p class="muted small">Where the bot posts, who it pings, and its look – Discord channel and role IDs come from Discord (right-click a channel or role → Copy ID, with Developer Mode on).</p>
<form class="ga-form" data-bs-form>
<label>Result channel ID<input name="resultChannel" value="${esc(s.resultChannel)}" placeholder="Leave blank to use the webhook's own channel" pattern="\\d{5,25}" maxlength="25"></label>
<label>Reminder ping role ID<input name="pingRole" value="${esc(s.pingRole)}" placeholder="Optional – pinged on result posts" pattern="\\d{1,25}" maxlength="25"></label>
<label>Default reminder channel ID<input name="reminderChannel" value="${esc(s.reminderChannel)}" placeholder="Prefill for new events" pattern="\\d{5,25}" maxlength="25"></label>
<label>Embed colour<input name="color" type="color" value="#${esc(s.color)}"></label>
<label>Emoji<input name="emoji" value="${esc(s.emoji)}" maxlength="8" placeholder="⚽"></label>
<div class="wide"><b class="small">Auto-posts on</b>${AP.map(([k, l]) => `<label class="ga-chk"><input name="ap-${k}" type="checkbox"${s.autoPosts[k] ? ' checked' : ''}> ${l}</label>`).join('')}</div>
<div class="wide row"><button class="btn" type="submit"${B.busy ? ' disabled' : ''}>💾 Save settings</button></div>
</form>
<div data-cmds>${cmdView()}</div>`;
  }

  function draw(el) { el.innerHTML = view(); }

  async function save(el, ctx) {
    const f = $('[data-bs-form]', el);
    const body = {
      resultChannel: f.resultChannel.value.trim(), pingRole: f.pingRole.value.trim(), reminderChannel: f.reminderChannel.value.trim(),
      color: f.color.value.replace('#', ''), emoji: f.emoji.value.trim(),
      autoPosts: Object.fromEntries(AP.map(([k]) => [k, f[`ap-${k}`].checked])),
    };
    B.busy = true; draw(el);
    try { B.data = await ctx.call('/api/bot/settings', body); ctx.toast('Bot settings saved'); }
    catch (e) { ctx.toast(e.message, true); }
    B.busy = false; draw(el);
  }

  async function portal(el, ctx) {
    draw(el);
    el.onsubmit = (e) => { e.preventDefault(); save(el, ctx); };
    el.onclick = (e) => {
      if (e.target.closest('[data-cmd-save]')) cmdAct(el, ctx, false);
      else if (e.target.closest('[data-cmd-sync]')) cmdAct(el, ctx, true);
    };
    if (!B.cmds) {
      ctx.call('/api/bot/commands').then((d) => { B.cmds = d; }, (e) => { B.cmdErr = e.message; }).then(() => { const box = $('[data-cmds]', el); if (box) box.innerHTML = cmdView(); });
    }
    if (!B.data) {
      try { B.data = await ctx.call('/api/bot/settings'); } catch (e) { B.err = e.message; ctx.toast(e.message, true); }
      if (el.isConnected) draw(el);
    }
  }

  window.NXBotSettings = { portal };
})();
