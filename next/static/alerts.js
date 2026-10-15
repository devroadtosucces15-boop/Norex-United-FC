// Hub › My Locker › Alerts inbox + Alert settings (/api/notify). The inbox lists the latest 60 notifications by day with
// filters, marks one read when it is opened (or all at once) and takes the "Got it" on announcements and rules. Settings
// pick how each kind of alert reaches you: Discord DM + site, site only, or off (announcements can't be switched off).
// Links written for the live site are pointed at the matching /next/ room when there is one.
// Web Push: turn pop-ups on or off for this device (the live sw.js at the site root, POST /api/push/subscribe + unsubscribe).
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const inbox = $('#lkinbox'), prefsEl = $('#lkprefs'); if (!inbox || !prefsEl) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const post = (path, body) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const put = (el, html, then) => (M ? M.land(el, html, then) : ((el.innerHTML = html), then?.(el)));
  const oops = (e) => M?.toast(e.message || 'Could not save that', { kind: 'err' });
  const clock = (t) => { try { return new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const day = (t) => { const a = new Date(t), b = new Date(), k = (x) => x.toDateString(); if (k(a) === k(b)) return 'Today'; b.setDate(b.getDate() - 1); if (k(a) === k(b)) return 'Yesterday'; if (Date.now() - t < 7 * 864e5) try { return a.toLocaleDateString(undefined, { weekday: 'long' }); } catch {} try { return a.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }); } catch { return ''; } };
  // live-site links → the /next/ room that shows the same thing; anything else opens on the live site
  const ROUTE = [[/^feed\.html(#p\d+)?$/, (m) => `hub-clubhouse.html${m[1] || '#ch-feed'}`], [/^messages\.html(#c\d+)?$/, (m) => `hub-clubhouse.html${m[1] || '#ch-chat'}`], [/^members\.html#ideas$/, () => 'hub-clubhouse.html#ch-ideas'], [/^members\.html#feedback$/, () => 'hub-clubhouse.html#ch-feedback'],
    [/^members\.html#(events|rsvp|motm|rush)/, () => 'hub-matchnight.html'], [/^members\.html#(awards|predict|squads|recs|scout)/, () => 'hub-squad.html'], [/^(docs\.html|members\.html#docs|playstyle\.html)/, () => 'hub-handbook.html'], [/^members\.html#alerts$/, () => '#lk-alerts']];
  const href = (l) => { if (!l) return ''; if (/^https:/.test(l)) return l; const s = l.replace(/^\//, ''); for (const [re, to] of ROUTE) { const m = s.match(re); if (m) return to(m); } return '../' + s; };
  const GROUPS = [['all', '📬', 'All'], ['unread', '🔴', 'Unread'], ['matches', '⚽', 'Matches', ['event', 'rush', 'predict', 'award', 'play', 'game']], ['social', '💬', 'Social', ['feed', 'mention', 'message', 'wave', 'idea', 'feedback']], ['club', '🛡️', 'Club', ['announce', 'claim', 'card', 'trial', 'trialstage', 'request', 'badge', 'moderation', 'queue', 'storage', 'test']]];
  let N = null, f = 'all';

  // ---------- 🔔 inbox ----------
  const item = (n) => { const to = href(n.link), due = n.ack === 'due';
    return `<li class="al-i${n.read ? '' : ' new'}${due ? ' due' : ''}" data-nid="${n.id}"><span class="al-ic" aria-hidden="true">${esc(n.icon || '🔔')}</span><div class="al-t"><b>${esc(n.title)}</b>${n.body ? `<p class="small muted">${esc(n.body)}</p>` : ''}<small class="muted tiny">${clock(n.at)}${n.dm === 'sent' ? ' · 📩 also sent to your Discord DMs' : ''}${n.ack === 'done' ? ' · ✅ acknowledged' : ''}</small>
<div class="al-acts">${due ? `<button type="button" class="btn gold" data-ack="${n.id}">👍 Got it</button>` : ''}${to ? `<a class="btn ghost" href="${esc(to)}" data-open="${n.id}"${/^https:|^\.\.\//.test(to) ? ' target="_blank" rel="noopener"' : ''}>Open ›</a>` : ''}${!n.read && !due ? `<button type="button" class="al-mk" data-read="${n.id}" aria-label="Mark as read">✓ Mark read</button>` : ''}</div></div></li>`; };
  const inboxHtml = () => {
    const pick = GROUPS.find(([k]) => k === f), list = N.items.filter((n) => f === 'all' ? true : f === 'unread' ? !n.read || n.ack === 'due' : pick[3].includes(n.type));
    const cnt = (k) => k === 'all' ? N.items.length : k === 'unread' ? N.items.filter((n) => !n.read || n.ack === 'due').length : N.items.filter((n) => GROUPS.find(([g]) => g === k)[3].includes(n.type)).length;
    // announcements waiting for a "Got it" sit on top in their own group, the rest run newest first by day
    const due = list.filter((n) => n.ack === 'due'), rest = list.filter((n) => n.ack !== 'due').sort((a, b) => b.at - a.at);
    let last = '', body = due.length ? `<h4 class="al-day due">📌 Needs your OK</h4><ul class="al-list">${due.map(item).join('')}</ul>` : '';
    for (const n of rest) { const dd = day(n.at); if (dd !== last) { if (last) body += '</ul>'; body += `<h4 class="al-day">${dd}</h4><ul class="al-list">`; last = dd; } body += item(n); }
    if (last) body += '</ul>';
    return `<div class="sq-bar"><div class="chips ch-filters" role="tablist" aria-label="Show">${GROUPS.map(([k, i, l]) => `<button type="button" role="tab" class="chip${k === f ? ' on' : ''}" aria-selected="${k === f}" data-af="${k}">${i} ${l} <small class="muted">${cnt(k)}</small></button>`).join('')}</div>
${N.unread ? `<button type="button" class="btn ghost" data-readall>✓ Mark all read <span class="lk-badge num" data-unr>${N.unread}</span></button>` : '<span class="muted small">✅ All caught up</span>'}</div>
${list.length ? `<div class="al-box">${body}</div>` : `<div class="panel sq-empty"><span>${f === 'unread' ? '🎉' : '📭'}</span><div><b>${f === 'unread' ? 'Nothing unread' : 'No alerts here yet'}</b><p class="muted small">Approvals, RSVPs, mentions, votes and replies land here.</p></div></div>`}
<p class="muted tiny" style="margin-top:10px">Your latest ${N.items.length} alerts. Older ones drop off automatically.</p>`;
  };
  // keep the locker's alert card and header bell in step
  const syncBadge = () => { const b = $('#alertpanel .lk-badge'); if (b) { if (N.unread) b.textContent = `${N.unread} new`; else b.remove(); } };
  const paintInbox = () => { inbox.innerHTML = inboxHtml(); syncBadge(); };
  const markRead = async (ids) => {
    const before = N; N = { ...N, items: N.items.map((n) => ids.includes(n.id) ? { ...n, read: true } : n), unread: Math.max(0, N.unread - N.items.filter((n) => ids.includes(n.id) && !n.read).length) }; paintInbox();
    try { N = await post('/api/notify/read', { ids }); paintInbox(); } catch (e) { N = before; paintInbox(); oops(e); }
  };
  inbox.addEventListener('click', async (e) => {
    const t = e.target;
    const fb = t.closest('[data-af]'); if (fb) { if (fb.dataset.af !== f) { f = fb.dataset.af; paintInbox(); } return; }
    const op = t.closest('[data-open]'); if (op) { const n = N.items.find((x) => x.id === +op.dataset.open); if (n && !n.read) post('/api/notify/read', { ids: [n.id] }).catch(() => {}); return; } // let the link open
    const rd = t.closest('[data-read]'); if (rd) { markRead([+rd.dataset.read]); return; }
    const ra = t.closest('[data-readall]');
    if (ra) { try { N = await (M ? M.submit(ra, () => post('/api/notify/read', { all: true })) : post('/api/notify/read', { all: true })); setTimeout(paintInbox, M?.off() ? 0 : 500); M?.toast('All caught up', { kind: 'ok', icon: '✅' }); } catch (er) { oops(er); } return; }
    const ak = t.closest('[data-ack]');
    if (ak) { try { N = await (M ? M.submit(ak, () => post('/api/notify/ack', { id: +ak.dataset.ack })) : post('/api/notify/ack', { id: +ak.dataset.ack })); setTimeout(paintInbox, M?.off() ? 0 : 500); M?.toast('Thanks, noted', { kind: 'ok', icon: '👍' }); } catch (er) { oops(er); } }
  });

  // ---------- ⚙️ settings ----------
  const MODES = [['dm', '📩', 'DM + site', 'Discord DM and here'], ['site', '🖥️', 'Site only', 'Only in your locker'], ['off', '🔕', 'Off', 'Not at all']];
  const prefsHtml = () => `${!N.dmReady ? '<p class="sq-tonight">📩 Discord DMs are not switched on for the club yet, so “DM + site” shows here only for now.</p>' : N.dmBlocked ? '<p class="sq-tonight">⚠️ Discord would not deliver your last DM. In Discord, open the club server, tap its name, then <b>Privacy settings</b> and allow <b>Direct messages</b>. Then send yourself a test.</p>' : ''}
<ul class="al-prefs">${N.types.map((t) => `<li><span class="al-ic" aria-hidden="true">${esc(t.icon)}</span><b class="al-pl">${esc(t.label)}</b><div class="seg al-seg" role="radiogroup" aria-label="${esc(t.label)}">${MODES.map(([v, i, l, s]) => `<button type="button" role="radio" aria-checked="${t.mode === v}" class="${t.mode === v ? 'on' : ''}" data-pk="${esc(t.k)}" data-pv="${v}" title="${s}"${v === 'off' && !t.mute ? ' disabled title="This one can’t be switched off"' : ''}><span aria-hidden="true">${i}</span> ${l}</button>`).join('')}</div></li>`).join('')}</ul>
<div class="sq-acts"><button type="button" class="btn ghost" data-test>🔔 Send me a test alert</button><span class="muted small">Saved as you tap. Same settings as the live Hub.</span></div>${N.push?.key ? '<div class="al-push" id="alpush" aria-live="polite"></div>' : ''}`;
  // ---------- 📲 Web Push on this device (the live site's sw.js at the site root receives them) ----------
  const SW = new URL(window.NOREX_SW || '../sw.js', location.href).href;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator.standalone || matchMedia('(display-mode: standalone)').matches);
  const pushState = async () => { if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return ios ? 'ios' : 'none';
    if (Notification.permission === 'denied') return 'blocked';
    try { const reg = await navigator.serviceWorker.getRegistration(SW); return (await reg?.pushManager.getSubscription()) ? 'on' : 'off'; } catch { return 'off'; } };
  const PUSH = { on: ['🟢', 'On for this device', 'Alerts set to “DM + site” also pop up here, even with the site closed.'], off: ['⚪', 'Off on this device', 'Turn it on to get a phone or desktop pop-up for alerts set to “DM + site”.'],
    blocked: ['🚫', 'Blocked by the browser', 'Notifications are blocked for this site. Open the browser’s site settings (the 🔒 next to the address), allow Notifications, then reload.'],
    ios: ['📱', 'Add to Home Screen first', 'On iPhone and iPad, pushes only work from the Home Screen app: tap Share, then “Add to Home Screen”, open NOREX from there and turn this on.'], none: ['⛔', 'Not supported here', 'This browser can’t receive push notifications. Try Chrome, Edge, Firefox or Safari.'] };
  const paintPush = async () => { const box = $('#alpush'); if (!box) return; const st = await pushState(), [i, t, x] = PUSH[st], n = N.push?.devices || 0;
    box.innerHTML = `<span class="al-ic" aria-hidden="true">📲</span><div class="al-t"><b>Push to this device <small class="al-st ${st}">${i} ${t}</small></b><p class="small muted">${x}</p><small class="muted tiny">${n ? `On for <b class="num">${n}</b> device${n === 1 ? '' : 's'} on your account.` : 'Not on for any of your devices yet.'}</small></div>
<div class="al-acts">${st === 'off' ? '<button type="button" class="btn gold" data-push="on">🔔 Turn on</button>' : st === 'on' ? '<button type="button" class="btn ghost" data-push="off">🔕 Turn off here</button>' : ''}</div>`; };
  const b64key = (k) => Uint8Array.from(atob(k.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (k.length % 4)) % 4)), (c) => c.charCodeAt(0));
  const pushOn = async () => { if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications were not allowed. Allow them for this site, then try again.');
    const reg = await navigator.serviceWorker.register(SW), ready = await navigator.serviceWorker.ready.catch(() => reg), r = ready || reg;
    const sub = (await r.pushManager.getSubscription()) ?? (await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64key(N.push.key) }));
    await post('/api/push/subscribe', { subscription: sub.toJSON() }); N.push = { ...N.push, devices: (N.push.devices || 0) + 1 }; };
  const pushOff = async () => { const reg = await navigator.serviceWorker.getRegistration(SW), sub = await reg?.pushManager.getSubscription(); if (!sub) return;
    await post('/api/push/unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe().catch(() => {}); N.push = { ...N.push, devices: Math.max(0, (N.push.devices || 1) - 1) }; };
  prefsEl.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pv]');
    if (b && !b.disabled && b.getAttribute('aria-checked') !== 'true') {
      const k = b.dataset.pk, v = b.dataset.pv, seg = b.parentElement;
      seg.querySelectorAll('button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      try { N = await post('/api/notify/prefs', { prefs: { [k]: v } }); M?.pulse(seg); M?.toast(`${N.types.find((t) => t.k === k)?.label || 'Setting'}: ${MODES.find(([m]) => m === v)[2]}`, { kind: 'ok', icon: MODES.find(([m]) => m === v)[1] }); }
      catch (er) { oops(er); prefsEl.innerHTML = prefsHtml(); paintPush(); }
      return;
    }
    const pb = e.target.closest('[data-push]');
    if (pb) { const on = pb.dataset.push === 'on'; try { await (M ? M.submit(pb, on ? pushOn : pushOff) : (on ? pushOn() : pushOff())); M?.toast(on ? 'This device will get pushes now' : 'Pushes off on this device', { kind: 'ok', icon: on ? '📲' : '🔕' }); } catch (er) { oops(er); } paintPush(); return; }
    const tb = e.target.closest('[data-test]');
    if (tb) { try { N = await (M ? M.submit(tb, () => post('/api/notify/test', {})) : post('/api/notify/test', {})); paintInbox(); M?.toast(N.test?.sent ? 'Test sent here and to your Discord DMs' : 'Test sent. Check the inbox above', { kind: 'ok', icon: '🔔' }); } catch (er) { oops(er); } }
  });

  const fail = (el, e) => { el.removeAttribute('aria-busy'); el.innerHTML = `<div class="panel sq-empty"><span>📡</span><div><b>Could not load your alerts</b><p class="muted small">${esc(e?.message || 'The club server did not answer.')}</p><button type="button" class="btn ghost" data-alretry>↻ Try again</button></div></div>`; };
  const load = () => { M?.skeleton(inbox, 5); M?.skeleton(prefsEl, 4);
    A.call('/api/notify').then((r) => { N = r; if (location.hash === '#lk-unread') f = 'unread'; put(inbox, inboxHtml()); put(prefsEl, prefsHtml(), paintPush); syncBadge(); }).catch((e) => { fail(inbox, e); prefsEl.innerHTML = ''; }); };
  d.addEventListener('click', (e) => { if (e.target.closest('[data-alretry]')) load(); });
  (A.ready || Promise.resolve()).then(load);
})();
