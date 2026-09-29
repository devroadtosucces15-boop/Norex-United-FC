// Bot personalisation (roadmap P7.5): manager portal "Bot settings" tab, mounted by app.js into #bot-admin.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const AP = [['results', '⚽ Match results'], ['reminders', '⏰ Event reminders'], ['awards', '🏆 Weekly awards']];
  const B = { data: null, busy: false, err: null };

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
</form>`;
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
    if (!B.data) {
      try { B.data = await ctx.call('/api/bot/settings'); } catch (e) { B.err = e.message; ctx.toast(e.message, true); }
      if (el.isConnected) draw(el);
    }
  }

  window.NXBotSettings = { portal };
})();
