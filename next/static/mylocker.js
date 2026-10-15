// Hub › My Locker › My profile, My stats, Badges and achievements.
// Profile: the same fields as the live Hub editor (/api/me to read, POST /api/profile to save; only the changed fields are sent,
// the server keeps the rest). Positions are tapped in order of preference, play times are painted on a week grid in your own
// time zone. Stats: the League season from the site data ranked against the squad, all-time club numbers, Rush and streaks from
// /api/achievements, next starting slot + teammate star rating + picked builds from /api/member. Medals: achievements with
// progress (new unlocks are marked seen once shown) and community badges from teammates (you can take one off your profile).
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const meEl = $('#lkme'), stEl = $('#lkstats'), mdEl = $('#lkmedals'); if (!meEl || !stEl || !mdEl) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API, N = window.NOREX || {};
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const post = (path, body) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const put = (el, html, then) => (M ? M.land(el, html, then) : ((el.innerHTML = html), then?.(el)));
  const oops = (e) => M?.toast(e.message || 'Could not save that', { kind: 'err' });
  const flagOn = (f) => (A.features || []).includes(f);
  const when = (t) => { try { return new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const dayOf = (t) => { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
  const fail = (el, what, e) => { el.removeAttribute('aria-busy'); el.innerHTML = `<div class="panel sq-empty"><span>📡</span><div><b>Could not load ${what}</b><p class="muted small">${esc(e?.message || 'The club server did not answer.')}</p><button type="button" class="btn ghost" data-lmretry>↻ Try again</button></div></div>`; };

  // ---------- shared lookups (the same lists and rules as the live editor and bot/profiles.js) ----------
  const LEAGUE_POS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
  const RUSH_POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
  const PLATFORMS = [['PS5', '🎮'], ['Xbox', '🟩'], ['PC', '🖥️']];
  const IDS = [['psn', 'PSN ID', '🎮', 'e.g. Norex_Striker'], ['xbox', 'Xbox gamertag', '🟩', 'e.g. Norex Striker'], ['ea', 'EA ID', '⚽', 'Your EA account name'], ['steam', 'Steam name', '💨', 'PC players']];
  const COLOURS = ['red', 'gold', 'green', 'blue', 'purple', 'grey'];
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const CC = 'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FO FR GA GB GD GE GH GI GL GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PR PS PT PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS SV SY SZ TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VC VE VN XK YE ZA ZM ZW'.split(' ');
  const regionName = (() => { try { const r = new Intl.DisplayNames(['en'], { type: 'region' }); return (c) => r.of(c) || c; } catch { return (c) => c; } })();
  const COUNTRIES = CC.map((c) => [c, regionName(c)]).sort((a, b) => a[1].localeCompare(b[1]));
  const flag = (c) => (/^[A-Z]{2}$/.test(c || '') ? String.fromCodePoint(...[...c].map((x) => 0x1f1a5 + x.charCodeAt(0))) : '');
  const myTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
  const allTz = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return [myTz, 'UTC']; } })();
  const tzOff = (tz) => { try { const t = new Date(), p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(t).map((x) => [x.type, x.value])); return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, p.hour % 24, +p.minute) - Math.floor(t / 60000) * 60000) / 60000); } catch { return 0; } };
  const tzLabel = (tz) => { const o = tzOff(tz), a = Math.abs(o); return `${tz.replace(/_/g, ' ')} (UTC${o < 0 ? '−' : '+'}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''})`; };
  const hh = (h) => String(h % 24).padStart(2, '0');
  // "Fri 21–00 · Sat 20–00": ranges end on the hour after the last one ticked
  const summary = (g) => (g || []).map((m, i) => { const r = []; for (let h = 0; h < 24; h++) if (m & (1 << h)) { if (r.length && r[r.length - 1][1] === h) r[r.length - 1][1] = h + 1; else r.push([h, h + 1]); } return r.length ? `${DAYS[i]} ${r.map(([a, b]) => a === 0 && b === 24 ? 'all day' : `${hh(a)}–${hh(b)}`).join(', ')}` : ''; }).filter(Boolean).join(' · ');
  const hours = (g) => (g || []).reduce((n, m) => { for (let h = 0; h < 24; h++) if (m & (1 << h)) n++; return n; }, 0);

  // one /api/achievements call feeds both the stats (Rush + streak facts) and the medals section
  let achP = null; const ach = () => (achP ||= flagOn('badges') ? A.call('/api/achievements').catch((e) => { achP = null; throw e; }) : Promise.resolve(null));

  // ================= 🪪 MY PROFILE =================
  const BLANK = { bio: '', positions: [], rushPositions: [], platform: '', tz: '', playTimes: null, ids: {}, twitch: '', youtube: '', kick: '', birthday: '', country: '', club: '', tags: [] };
  const LABEL = { bio: 'bio', positions: 'League positions', rushPositions: 'Rush positions', platform: 'platform', tz: 'time zone', playTimes: 'play times', ids: 'game IDs', twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', birthday: 'birthday', country: 'country', club: 'favourite club', tags: 'tags' };
  const norm = (k, v) => k === 'playTimes' ? (Array.isArray(v) && v.some(Boolean) ? v : null) : k === 'ids' ? Object.fromEntries(Object.entries(v || {}).map(([a, b]) => [a, String(b).trim()]).filter(([, b]) => b).sort()) : k === 'tags' ? (v || []).map((t) => ({ t: t.t, e: t.e || '', c: t.c || 'grey' })) : Array.isArray(BLANK[k]) ? (v || []) : typeof v === 'string' ? v.trim() : v ?? '';
  const pick = (src) => Object.fromEntries(Object.keys(BLANK).map((k) => [k, JSON.parse(JSON.stringify(src?.[k] ?? BLANK[k]))]));
  let P0 = null, P = null, verified = {}, grid = [0, 0, 0, 0, 0, 0, 0];
  const changed = () => P0 ? Object.keys(BLANK).filter((k) => JSON.stringify(norm(k, P[k])) !== JSON.stringify(norm(k, P0[k]))) : [];

  const posPicker = (key, list) => `<div class="pf-pick" role="group" aria-label="${key === 'positions' ? 'League' : 'Rush'} positions" data-pk="${key}">${list.map((x) => { const i = P[key].indexOf(x); return `<button type="button" class="pf-pos${i > -1 ? ' on r' + i : ''}" aria-pressed="${i > -1}" data-pos="${x}">${i > -1 ? `<i>${i + 1}</i>` : ''}${x}</button>`; }).join('')}</div>`;
  const gridHtml = () => { const n = new Date(), nd = (n.getDay() + 6) % 7, nh = n.getHours();
    return `<span></span>${Array.from({ length: 24 }, (_, h) => `<i class="pt-h">${h % 3 ? '' : hh(h)}</i>`).join('')}${DAYS.map((day, r) => `<b>${day}</b>${Array.from({ length: 24 }, (_, h) => `<span class="pt-c${grid[r] & (1 << h) ? ' on' : ''}${r === nd && h === nh && (P.tz || myTz) === myTz ? ' now' : ''}" data-c="${r * 24 + h}" title="${day} ${hh(h)}:00"></span>`).join('')}`).join('')}`; };
  const tagsHtml = () => `<ul class="pf-tags">${P.tags.map((t, i) => `<li class="pf-tag c-${esc(t.c)}">${t.e ? `<span aria-hidden="true">${esc(t.e)}</span>` : ''}${esc(t.t)}<button type="button" data-tagx="${i}" aria-label="Remove tag ${esc(t.t)}">×</button></li>`).join('')}${P.tags.length ? '' : '<li class="muted small">No tags yet. Add up to 8 that sum you up.</li>'}</ul>
<div class="pf-tadd"${P.tags.length >= 8 ? ' hidden' : ''}><input id="pf-te" maxlength="8" placeholder="🙂" aria-label="Tag emoji (optional)"><input id="pf-tt" maxlength="20" placeholder="e.g. Late-night Rush" aria-label="Tag text"><div class="pf-sw" role="radiogroup" aria-label="Tag colour">${COLOURS.map((c, i) => `<button type="button" role="radio" aria-checked="${!i}" class="c-${c}${i ? '' : ' on'}" data-tc="${c}" aria-label="${c}"></button>`).join('')}</div><button type="button" class="btn ghost" data-tagadd>＋ Add tag</button></div>`;
  const prevHtml = () => { const sm = summary(grid), pos = (l, cls) => l.map((x, i) => `<span class="pf-pp ${cls}${i ? '' : ' first'}">${esc(x)}</span>`).join('');
    return `<div class="pf-pa">${A.avatar ? `<img src="${esc(A.avatar)}" alt="" width="56" height="56">` : `<span>${esc((A.name || '?')[0])}</span>`}</div><div class="pf-pm"><div class="pf-pn"><b>${esc(A.name || 'You')}</b> ${flag(P.country)}${P.platform ? `<span class="pf-plat">${PLATFORMS.find(([p]) => p === P.platform)?.[1] || ''} ${esc(P.platform)}</span>` : ''}</div>
<div class="pf-pl">${P.positions.length ? `<small>🏆</small>${pos(P.positions, '')}` : '<small class="muted">No League positions</small>'}${P.rushPositions.length ? `<small>⚡</small>${pos(P.rushPositions, 'rush')}` : ''}</div>
${P.bio.trim() ? `<p class="small pf-pb">${esc(P.bio.trim())}</p>` : ''}<p class="tiny muted">${sm ? `🕒 ${esc(sm)}${(P.tz || myTz) !== myTz ? ` · ${esc(tzLabel(P.tz))}` : ''}` : '🕒 No play times yet'}</p>${P.tags.length ? `<ul class="pf-tags sm">${P.tags.map((t) => `<li class="pf-tag c-${esc(t.c)}">${t.e ? esc(t.e) + ' ' : ''}${esc(t.t)}</li>`).join('')}</ul>` : ''}</div>`; };
  const barHtml = () => { const c = changed(); return `<span class="pf-bm">✏️ <b class="num">${c.length}</b> unsaved: ${esc(c.map((k) => LABEL[k]).join(', '))}</span><span class="pf-bb"><button type="button" class="btn ghost" data-pfundo>↺ Undo</button><button type="button" class="btn gold" data-pfsave>💾 Save profile</button></span>`; };
  const meHtml = () => `<div class="panel pf-prev"><div class="eyebrow">👀 How teammates see you</div><div class="pf-pc" id="pf-prev">${prevHtml()}</div></div>
<div class="pf-grid">
<fieldset class="panel pf-f"><legend>🙋 About me</legend><label class="pf-l"><span class="pf-lh">Bio <small class="muted num" id="pf-bn">${P.bio.length}/280</small></span><textarea id="pf-bio" data-f="bio" maxlength="280" rows="3" placeholder="Playstyle, what you bring to the squad, anything…">${esc(P.bio)}</textarea></label>
<div class="pf-2"><label class="pf-l">Country<select data-f="country"><option value="">–</option>${COUNTRIES.map(([c, n]) => `<option value="${c}"${P.country === c ? ' selected' : ''}>${flag(c)} ${esc(n)}</option>`).join('')}</select></label><label class="pf-l">Favourite real club<input data-f="club" maxlength="40" value="${esc(P.club)}" placeholder="e.g. Real Madrid"></label></div>${flagOn('fun') ? `<div class="pf-2"><label class="pf-l">🎂 Birthday <span class="muted tiny">month and day, no year</span><input class="nx16" data-f="birthday" inputmode="numeric" maxlength="5" value="${esc(P.birthday)}" placeholder="MM-DD, like 07-14" autocomplete="off" spellcheck="false"><span class="pf-err" data-err="birthday" role="alert"></span></label></div>` : ''}</fieldset>
<fieldset class="panel pf-f"><legend>📍 Positions</legend><p class="tiny muted">Tap in order: 1st, 2nd, 3rd choice. Tap again to drop one.</p><h5>🏆 League</h5>${posPicker('positions', LEAGUE_POS)}<h5>⚡ Rush</h5>${posPicker('rushPositions', RUSH_POS)}</fieldset>
<fieldset class="panel pf-f"><legend>🎮 Platform and IDs</legend><div class="seg pf-seg" role="radiogroup" aria-label="Main platform">${[...PLATFORMS, ['', '–']].map(([v, i]) => `<button type="button" role="radio" aria-checked="${P.platform === v}" class="${P.platform === v ? 'on' : ''}" data-plat="${v}">${v ? `${i} ${v}` : 'None'}</button>`).join('')}</div>
<div class="pf-2">${IDS.map(([k, l, i, ph]) => verified[k]?.name ? `<label class="pf-l">${i} ${l} <span class="pf-ok" title="Verified through Discord">✓ verified</span><input value="${esc(verified[k].name)}" readonly title="Change it in Discord › Settings › Connections, then sign in again"></label>` : `<label class="pf-l">${i} ${l}<input data-id="${k}" maxlength="40" value="${esc(P.ids[k] || '')}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="false"></label>`).join('')}</div></fieldset>
<fieldset class="panel pf-f"><legend>📺 My channels</legend><div class="pf-2"><label class="pf-l"><span><span class="pf-tw">●</span> Twitch</span><input class="nx16" data-f="twitch" maxlength="120" value="${esc(P.twitch)}" placeholder="channel name or twitch.tv link" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="pf-err" data-err="twitch" role="alert"></span></label><label class="pf-l"><span><span class="pf-yt">▶</span> YouTube</span><input class="nx16" data-f="youtube" maxlength="160" value="${esc(P.youtube)}" placeholder="@handle or channel link" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="pf-err" data-err="youtube" role="alert"></span></label>${flagOn('memberLive') ? `<label class="pf-l"><span><span class="pf-ki">■</span> Kick</span><input class="nx16" data-f="kick" maxlength="120" value="${esc(P.kick)}" placeholder="channel name or kick.com link" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="pf-err" data-err="kick" role="alert"></span></label>` : ''}</div><p class="tiny muted">Linked channels show a 🔴 LIVE badge on your card when you stream.${flagOn('memberLive') ? ' We check every few minutes and the club is told when you go live.' : ''}</p></fieldset>
<fieldset class="panel pf-f pf-wide"><legend>🕒 When I usually play</legend><div class="pf-tzr"><label class="pf-l">My time zone<select data-f="tz">${[...new Set([P.tz || myTz, ...allTz])].map((z) => `<option value="${esc(z)}"${z === (P.tz || myTz) ? ' selected' : ''}>${esc(tzLabel(z))}</option>`).join('')}</select></label>
<div class="chips pf-pre"><button type="button" class="chip" data-preset="nights">🌙 Weeknights 19–23</button><button type="button" class="chip" data-preset="weekend">🏟️ Weekend evenings</button><button type="button" class="chip" data-preset="clear">🧹 Clear</button></div></div>
<p class="tiny muted">Tap or drag across the hours you are usually online. Everyone else sees them in their own time.</p><div class="pt-grid" id="pf-grid" aria-label="Play times, Monday to Sunday by hour">${gridHtml()}</div><p class="small" id="pf-sum" aria-live="polite"></p></fieldset>
${flagOn('badges') ? `<fieldset class="panel pf-f pf-wide"><legend>🏷️ My tags <small class="muted">up to 8</small></legend><div id="pf-tagbox">${tagsHtml()}</div></fieldset>` : ''}
</div><div class="pf-bar" id="pf-bar" hidden>${barHtml()}</div>${P0.updated ? `<p class="tiny muted pf-sv">💾 Last saved ${esc(when(P0.updated))}</p>` : ''}`;
  const sumLine = () => { const s = summary(grid), n = hours(grid); $('#pf-sum', meEl).innerHTML = s ? `🕒 <b class="num">${n}</b> h a week · ${esc(s)}` : '<span class="muted">No play times yet. Teammates can’t see when you’re around.</span>'; };
  // after every edit: the preview card, the counter and the unsaved-changes bar
  const touched = () => { const pv = $('#pf-prev', meEl); if (pv) pv.innerHTML = prevHtml(); const bar = $('#pf-bar', meEl), c = changed(); if (!bar) return;
    const was = !bar.hidden; bar.innerHTML = barHtml(); bar.hidden = !c.length; if (c.length && !was) M?.pulse(bar); };
  const paintMe = () => { meEl.innerHTML = meHtml(); sumLine(); touched(); };
  const startMe = (profile) => { P0 = pick(profile); P = pick(profile); verified = profile?.verified || {}; P0.updated = profile?.updated || 0; grid = (P.playTimes || [0, 0, 0, 0, 0, 0, 0]).slice(); put(meEl, meHtml(), () => { sumLine(); touched(); }); };

  // painting the week grid: the first cell decides on/off, then every cell the pointer crosses follows
  let paint = null;
  const setCell = (c) => { const i = +c.dataset.c, r = Math.floor(i / 24), h = i % 24; grid[r] = paint ? grid[r] | (1 << h) : grid[r] & ~(1 << h); c.classList.toggle('on', paint); };
  const gridDone = () => { P.playTimes = grid.some(Boolean) ? grid.slice() : null; if (P.playTimes && !P.tz) P.tz = myTz; sumLine(); touched(); };
  meEl.addEventListener('pointerdown', (e) => { const c = e.target.closest('#pf-grid [data-c]'); if (!c) return; e.preventDefault(); c.parentElement.setPointerCapture?.(e.pointerId); paint = !c.classList.contains('on'); setCell(c); });
  meEl.addEventListener('pointermove', (e) => { if (paint === null) return; const c = d.elementFromPoint(e.clientX, e.clientY)?.closest?.('#pf-grid [data-c]'); if (c && c.classList.contains('on') !== paint) setCell(c); });
  const stop = () => { if (paint !== null) { paint = null; gridDone(); } };
  meEl.addEventListener('pointerup', stop); meEl.addEventListener('pointercancel', stop);

  // channel and birthday fields: the same rules as bot/profiles.js, checked when you leave the field (and live once it shows an error)
  const NB = window.NorexBotUtil, CHK = NB ? { twitch: NB.twitch, youtube: NB.youtube, kick: NB.kick, birthday: NB.birthday } : {};
  const showErr = (k) => { const inp = $(`[data-f="${k}"]`, meEl), out = $(`[data-err="${k}"]`, meEl); if (!inp || !out || !CHK[k]) return ''; const er = CHK[k](P[k]).err || ''; out.textContent = er; inp.setAttribute('aria-invalid', !!er); return er; };
  meEl.addEventListener('focusout', (e) => { const k = e.target.dataset?.f; if (CHK[k]) showErr(k); });
  meEl.addEventListener('input', (e) => { const t = e.target;
    if (t.dataset.f === 'birthday' && e.inputType !== 'deleteContentBackward') t.value = t.value.replace(/^(\d{2})$/, '$1-').replace(/^(\d{2})(\d{1,2})$/, '$1-$2'); // a phone's number pad has no dash
    if (t.dataset.f && t.tagName !== 'SELECT') { P[t.dataset.f] = t.value; if (t.dataset.f === 'bio') $('#pf-bn', meEl).textContent = `${t.value.length}/280`; touched(); if (t.getAttribute('aria-invalid') === 'true') showErr(t.dataset.f); }
    if (t.dataset.id) { P.ids = { ...P.ids, [t.dataset.id]: t.value }; touched(); } });
  meEl.addEventListener('change', (e) => { const t = e.target; if (t.tagName === 'SELECT' && t.dataset.f) { P[t.dataset.f] = t.value; if (t.dataset.f === 'tz') $('#pf-grid', meEl).innerHTML = gridHtml(); touched(); } });
  meEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'pf-tt') { e.preventDefault(); $('[data-tagadd]', meEl)?.click(); } });
  meEl.addEventListener('click', async (e) => { const t = e.target;
    const pos = t.closest('[data-pos]');
    if (pos) { const box = pos.parentElement, k = box.dataset.pk, l = P[k], v = pos.dataset.pos, i = l.indexOf(v);
      if (i > -1) l.splice(i, 1); else if (l.length >= 3) { M?.toast('Three picks max. Tap one to drop it first', { icon: '📍' }); M?.pulse(box); return; } else l.push(v);
      box.outerHTML = posPicker(k, k === 'positions' ? LEAGUE_POS : RUSH_POS); if (i < 0) M?.pulse($(`[data-pk="${k}"] [data-pos="${v}"]`, meEl)); touched(); return; }
    const pl = t.closest('[data-plat]');
    if (pl) { P.platform = pl.dataset.plat; $$('[data-plat]', meEl).forEach((b) => { b.classList.toggle('on', b === pl); b.setAttribute('aria-checked', b === pl); }); touched(); return; }
    const pr = t.closest('[data-preset]');
    if (pr) { for (let r = 0; r < 7; r++) { if (pr.dataset.preset === 'clear') grid[r] = 0; if (pr.dataset.preset === 'nights' && r < 5) grid[r] |= 0b1111 << 19; if (pr.dataset.preset === 'weekend' && r >= 4) grid[r] |= 0b11111 << 18; }
      $('#pf-grid', meEl).innerHTML = gridHtml(); gridDone(); return; }
    const tc = t.closest('[data-tc]');
    if (tc) { $$('[data-tc]', meEl).forEach((b) => { b.classList.toggle('on', b === tc); b.setAttribute('aria-checked', b === tc); }); return; }
    const tx = t.closest('[data-tagx]');
    if (tx) { P.tags.splice(+tx.dataset.tagx, 1); $('#pf-tagbox', meEl).innerHTML = tagsHtml(); touched(); return; }
    if (t.closest('[data-tagadd]')) { const te = $('#pf-te', meEl), tt = $('#pf-tt', meEl), text = tt.value.trim().replace(/\s+/g, ' '), emo = te.value.trim();
      if (!text) { tt.focus(); M?.toast('Type the tag text first', { icon: '🏷️' }); return; }
      if (P.tags.some((x) => x.t.toLowerCase() === text.toLowerCase())) { M?.toast('You already have that tag', { icon: '🏷️' }); return; }
      if (emo && (!/\p{Extended_Pictographic}/u.test(emo) || /[A-Za-z0-9]/.test(emo))) { te.focus(); M?.toast('Pick one emoji, or leave it empty', { kind: 'err' }); return; }
      P.tags.push({ t: text, e: emo, c: $('[data-tc].on', meEl)?.dataset.tc || 'grey' }); $('#pf-tagbox', meEl).innerHTML = tagsHtml(); M?.pulse($('.pf-tag:last-of-type', meEl)); $('#pf-tt', meEl)?.focus(); touched(); return; }
    if (t.closest('[data-pfundo]')) { P = pick(P0); grid = (P.playTimes || [0, 0, 0, 0, 0, 0, 0]).slice(); paintMe(); M?.toast('Back to your saved profile', { icon: '↺' }); return; }
    const sv = t.closest('[data-pfsave]');
    if (sv) { const keys = changed(); if (!keys.length) return;
      const bad = keys.filter((k) => CHK[k] && showErr(k)); if (bad.length) { const inp = $(`[data-f="${bad[0]}"]`, meEl); inp?.scrollIntoView({ block: 'center', behavior: 'smooth' }); inp?.focus({ preventScroll: true }); M?.toast($(`[data-err="${bad[0]}"]`, meEl).textContent, { kind: 'err' }); return; }
      // only what changed is sent; play times always travel with their time zone
      const body = Object.fromEntries(keys.map((k) => [k, norm(k, P[k])])); if ('playTimes' in body && body.playTimes) body.tz = P.tz || myTz;
      for (const k of Object.keys(CHK)) if (k in body) body[k] = CHK[k](body[k]).v; // the cleaned value (07-14, @handle) is what gets saved
      try { const r = await (M ? M.submit(sv, () => post('/api/profile', body)) : post('/api/profile', body));
        startMe({ ...r.profile, verified });
        M?.toast(`Profile saved · ${keys.map((k) => LABEL[k]).join(', ')}`, { kind: 'ok', icon: '💾' }); achP = null; loadMedals(); }
      catch (er) { oops(er); } }
  });
  addEventListener('beforeunload', (e) => { if (P0 && changed().length) { e.preventDefault(); e.returnValue = ''; } });

  // ================= 📊 MY STATS =================
  const full = N.full || [];
  const mine = (claim) => claim && full.find((p) => p.k === claim || p.id === claim);
  const pool = full.filter((p) => p.gp >= 8);
  const TILES = [['👟', 'Apps', (p) => p.gp, 0], ['⚽', 'Goals', (p) => p.goals, 0], ['🅰️', 'Assists', (p) => p.assists, 0], ['⭐', 'Avg rating', (p) => p.rating, 1], ['🏅', 'MOTM', (p) => p.mom, 0], ['📈', 'Win rate', (p) => p.win, 0, '%'], ['🎯', 'Pass accuracy', (p) => p.pass, 0, '%'], ['🛡️', 'Tackle success', (p) => p.tackleRate, 0, '%']];
  const DEF = [['🧤', 'Clean sheets', (p) => p.cs, 0]], GK = [['🧱', 'Saves', (p) => p.saves, 0]];
  const PER = [['⚽', 'Goals a game', (p) => p.goals / Math.max(1, p.gp)], ['🅰️', 'Assists a game', (p) => p.assists / Math.max(1, p.gp)], ['🔥', 'Goal involvements a game', (p) => (p.goals + p.assists) / Math.max(1, p.gp)], ['🏅', 'MOTM rate', (p) => 100 * p.mom / Math.max(1, p.gp), '%']];
  const rankOf = (f, me) => { const v = f(me) || 0; return { r: 1 + pool.filter((p) => p.k !== me.k && (f(p) || 0) > v).length, of: pool.length + (pool.some((p) => p.k === me.k) ? 0 : 1), best: Math.max(1e-9, v, ...pool.map((p) => f(p) || 0)) }; };
  const tile = ([i, l, f, dec, suf = ''], me, cls = '') => { const v = +(f(me) || 0), { r, of, best } = rankOf(f, me), ranked = me.gp >= 8;
    return `<div class="ms-t${ranked && r === 1 ? ' top' : ''}${cls}"><span class="ms-i" aria-hidden="true">${i}</span><b class="num" data-count="${v.toFixed(dec)}"${suf ? ` data-suffix="${suf}"` : ''}>${v.toFixed(dec)}${suf}</b><small>${l}</small>${ranked ? `<em class="ms-r">${r === 1 ? '👑 best' : `#${r}`} of ${of}</em>` : ''}<i class="ms-bar" style="--w:${Math.max(0.04, Math.min(1, v / best)).toFixed(3)}" aria-hidden="true"></i></div>`; };
  // rank tier from stats (same standard as the player page): rating 40 · goals+assists a game 25 · win rate 15 · passing 10 · tackling 10; needs 10 games
  const sc = (v, lo, hi) => Math.max(0, Math.min(1, ((+v || 0) - lo) / (hi - lo)));
  const tierFor = (p) => { if (!p || (p.gp ?? 0) < 10) return null; const gp = Math.max(1, p.gp), gk = p.line === 'GK';
    const sco = Math.round(40 * sc(p.rating, 6, 8.5) + (gk ? 25 * sc(p.win, .4, .9) : 25 * sc(((p.goals || 0) + (p.assists || 0)) / gp, 0, 1.2)) + 15 * sc(p.win, .4, .9) + 10 * sc(p.pass, 60, 90) + 10 * sc(p.tackleRate, 40, 80));
    return { sco, n: sco >= 80 ? ['Elite', '💎'] : sco >= 60 ? ['Gold', '🥇'] : sco >= 40 ? ['Silver', '🥈'] : ['Bronze', '🥉'] }; };
  const heroHtml = (me) => { const t = tierFor(me), card = window.NorexCards ? NorexCards.cardHTML(me, { s: .72, link: false }) : '';
    const big = [['⚽', me.goals, 'Goals'], ['🅰️', me.assists, 'Assists'], ['⭐', me.rating ? (+me.rating).toFixed(1) : '–', 'Rating'], ['🎮', me.gp, 'Games']];
    return `<div class="ms-hero"><div class="ms-hc">${card}</div><div class="ms-hr"><div class="ms-tier ${t ? t.n[0].toLowerCase() : 'none'}"><span>${t ? t.n[1] : '🔒'}</span><div><b>${t ? t.n[0] + ' tier' : 'Unranked'}</b><small>${t ? t.sco + '/100 from your stats' : 'Play 10 League games to earn a tier'}</small></div></div>${t ? `<div class="ms-bar"><i style="width:${t.sco}%"></i></div>` : ''}<div class="ms-big">${big.map(([i, v, l]) => `<div><span>${i}</span><b class="num">${v}</b><small>${l}</small></div>`).join('')}</div></div></div>`; };
  const fold = (root) => { [...root.querySelectorAll('.ms-2 > .panel')].forEach((p, i) => { const eb = p.querySelector(':scope > .eyebrow'); if (!eb || p.matches('details')) return; const d = document.createElement('details'); d.className = 'panel ms-fold'; if (i < 2) d.open = true; const sm = document.createElement('summary'); sm.className = 'eyebrow'; sm.innerHTML = eb.innerHTML; eb.remove(); d.append(sm, ...p.childNodes); p.replaceWith(d); }); };
  const statsHtml = (me, x, a) => { const extra = me.line === 'GK' ? [...DEF, ...GK] : me.line === 'DEF' ? DEF : [];
    const tops = me.gp >= 8 ? [...TILES, ...extra].filter(([, , f]) => rankOf(f, me).r === 1).map(([, l]) => l.toLowerCase()) : [];
    const f = a?.facts || {}, st = x?.stars, s = x?.starting, b = x?.builds;
    const streaks = [['🔥', 'Wins in a row', f.winsNow, f.winStreak], ['🧱', 'Unbeaten', f.unbeatenNow, f.unbeaten], ['⚽', 'Scoring run', f.scoringNow, f.scoring], ['🗓️', 'Weeks saying “I’m in”', f.weekNow, f.weekStreak]].filter(([, , now, best]) => now != null || best != null);
    return `${s ? `<p class="sq-tonight">📋 You start at <b>${esc(s.pos)}</b> in ${esc(s.title || s.type || 'the next match')} · ${esc(when(s.start))}${s.formation ? ` · ${esc(s.formation)}` : ''} <a href="hub-matchnight.html">Match Night ›</a></p>` : ''}
${heroHtml(me)}<div class="ms-h"><div><div class="eyebrow">🏆 League season</div><h3>${esc(me.n)} <small class="muted">${esc(me.line || '')}${me.arch ? ` · ${esc(me.arch)}` : ''}${me.ovr ? ` · overall <b class="num">${me.ovr}</b>` : ''}</small></h3></div>${tops.length ? `<p class="ms-crown">👑 Best in the squad for ${esc(tops.slice(0, 3).join(', '))}</p>` : me.gp < 8 ? `<p class="muted small">Ranks start after 8 games (${me.gp} so far).</p>` : ''}</div>
<div class="ms-g">${[...TILES, ...extra].map((t) => tile(t, me)).join('')}</div>
<div class="grid g2 ms-2"><div class="panel"><div class="eyebrow">⏱️ Per game</div><ul class="ms-per">${PER.map(([i, l, fn, suf = '']) => { const v = fn(me), { r } = rankOf(fn, me); return `<li><span aria-hidden="true">${i}</span><span>${l}</span><b class="num">${suf ? Math.round(v) + suf : v.toFixed(2)}</b>${me.gp >= 8 ? `<small class="muted">#${r}</small>` : ''}</li>`; }).join('')}</ul></div>
<div class="panel"><div class="eyebrow">🏛️ All-time at NOREX</div><div class="ms-at">${[['Apps', me.cgp], ['Goals', me.cgoals], ['Assists', me.cassists], ['MOTM', me.cmom], ['Rating', me.crating, 1]].map(([l, v, dec]) => `<div><b class="num" data-count="${(+v || 0).toFixed(dec || 0)}">${(+v || 0).toFixed(dec || 0)}</b><small>${l}</small></div>`).join('')}</div><p class="tiny muted">EA’s career numbers for you at the club, every season.</p></div>
${a && f.rushApps ? `<div class="panel"><div class="eyebrow">⚡ Rush</div><div class="ms-at">${[['Games', f.rushApps], ['Goals', f.rushGoals], ['MOTM', f.rushMotm], ['Best game', f.rushBestGoals, ' g']].map(([l, v, s2]) => `<div><b class="num">${+v || 0}${s2 || ''}</b><small>${l}</small></div>`).join('')}</div><p class="tiny muted">Confirmed Rush results only. Log yours in Match Night.</p></div>` : a ? '<div class="panel"><div class="eyebrow">⚡ Rush</div><p class="muted small" style="margin-top:8px">No confirmed Rush games yet. Log a result in Match Night and a manager confirms it.</p><a class="btn ghost" href="hub-matchnight.html" style="margin-top:10px">⚡ Log a Rush result</a></div>' : ''}
${streaks.length ? `<div class="panel"><div class="eyebrow">🔥 Streaks</div><ul class="ms-per">${streaks.map(([i, l, now, best]) => `<li><span aria-hidden="true">${i}</span><span>${l}</span><b class="num">${now ?? 0}</b><small class="muted">best ${best ?? 0}</small></li>`).join('')}</ul></div>` : ''}
${st && (st.rolling != null || st.allTime != null) ? `<div class="panel"><div class="eyebrow">⭐ Teammates rate you</div><p class="ms-star"><b class="num">${(+(st.rolling ?? st.allTime)).toFixed(1)}</b><span>/ 5</span><span class="ms-stars" style="--v:${((st.rolling ?? st.allTime) / 5).toFixed(3)}" aria-hidden="true">★★★★★</span></p><p class="tiny muted">${st.rolling != null ? `Last few weeks from ${st.raters} teammate${st.raters === 1 ? '' : 's'}` : 'All-time'}${st.allTime != null && st.rolling != null ? ` · all-time ${(+st.allTime).toFixed(1)}` : ''} · ${st.ratings} ratings</p></div>` : ''}
${b && (b.league || b.rush) ? `<div class="panel"><div class="eyebrow">🧬 My builds</div><ul class="ms-per">${[['league', '🏟️', 'League'], ['rush', '⚡', 'Rush']].map(([k, i, l]) => `<li><span aria-hidden="true">${i}</span><span>${l}</span>${b[k] ? `<b>${esc(b[k].title || b[k].arch || 'Build')}</b><small class="muted">${b[k].level ? 'L' + esc(b[k].level) : ''}${b[k].position ? ' · ' + esc(b[k].position) : ''}</small>` : '<small class="muted">not picked</small>'}</li>`).join('')}</ul></div>` : ''}
</div><div class="sq-acts"><a class="btn ghost" href="player-${encodeURIComponent(me.k)}.html">Public profile page ›</a><a class="btn ghost" href="leaders.html">🏆 Leaders</a></div>`; };
  const loadStats = (claim) => { M?.skeleton(stEl, 5); const me = mine(claim);
    if (!me) { put(stEl, `<div class="panel sq-empty"><span>🪪</span><div><b>${claim ? 'No League games on record yet' : 'Link your player to see your stats'}</b><p class="muted small">${claim ? 'Your numbers appear after your first League game for the club.' : 'Your Discord is not linked to a club player yet. Link it in the live Hub, then your season, ranks and streaks open here.'}</p>${claim ? '' : '<a class="btn ghost" href="../members.html">Open the live Hub</a>'}</div></div>`); return; }
    Promise.all([flagOn('profiles') ? A.call('/api/member').catch(() => null) : null, ach().catch(() => null)]).then(([x, a]) => { put(stEl, statsHtml(me, x, a)); fold(stEl); window.NorexMotion?.tilt?.(); window.NorexArt?.apply?.(stEl); });
  };

  // ================= 🏅 BADGES + ACHIEVEMENTS =================
  const TIER = { common: ['Common', '🥉'], rare: ['Rare', '🥈'], epic: ['Epic', '🥇'], legendary: ['Legendary', '💎'] };
  const AF = [['all', '🏅', 'All'], ['done', '✅', 'Unlocked'], ['close', '🎯', 'Close'], ['locked', '🔒', 'Locked']];
  let AC = null, BG = null, af = 'all';
  const close = (x) => !x.done && x.v / x.goal >= 0.5;
  const achCard = (x) => `<li class="ac-c t-${esc(x.tier)}${x.done ? ' done' : ''}${x.fresh ? ' fresh' : ''}"><span class="ac-i" aria-hidden="true">${esc(x.icon)}</span><div class="ac-t"><b>${esc(x.name)}</b>${x.fresh ? '<span class="ac-new">NEW</span>' : ''}<small class="muted">${esc(x.desc)}</small>
${x.done ? `<small class="ac-d">✅ ${x.at ? esc(dayOf(x.at)) : 'Unlocked'} · +${x.pts} pts</small>` : `<div class="ac-p" role="progressbar" aria-valuemin="0" aria-valuemax="${x.goal}" aria-valuenow="${x.v}" aria-label="${esc(x.name)} progress"><i style="--w:${(x.v / x.goal).toFixed(3)}"></i></div><small class="muted num">${x.v} / ${x.goal} · ${x.pts} pts</small>`}</div><span class="ac-tier" title="${TIER[x.tier]?.[0] || ''}">${TIER[x.tier]?.[1] || ''}</span></li>`;
  const medalsHtml = () => { const list = AC ? AC.list.filter((x) => af === 'all' || (af === 'done' ? x.done : af === 'close' ? close(x) : !x.done)).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || (b.done - a.done) || (b.done ? (b.at || 0) - (a.at || 0) : b.v / b.goal - a.v / a.goal)) : [];
    const cnt = (k) => !AC ? 0 : k === 'all' ? AC.list.length : k === 'done' ? AC.count : k === 'close' ? AC.list.filter(close).length : AC.list.length - AC.count;
    return `${AC ? `<div class="ac-head panel"><div class="ac-pts"><b class="num" data-count="${AC.pts}">${AC.pts}</b><small>points</small></div><div class="ac-sum"><span><b class="num">${AC.count}</b> of ${AC.total} unlocked</span><div class="ac-p big"><i style="--w:${(AC.count / Math.max(1, AC.total)).toFixed(3)}"></i></div><div class="ac-tiers">${Object.entries(TIER).map(([k, [l, i]]) => `<span class="t-${k}">${i} ${l} <b class="num">${AC.tiers?.[k] || 0}</b></span>`).join('')}</div></div></div>
<div class="sq-bar"><div class="chips" role="tablist" aria-label="Show">${AF.map(([k, i, l]) => `<button type="button" role="tab" class="chip${k === af ? ' on' : ''}" aria-selected="${k === af}" data-acf="${k}">${i} ${l} <small class="muted">${cnt(k)}</small></button>`).join('')}</div><a class="btn ghost" href="../members.html#achievements" target="_blank" rel="noopener">🏆 Points table ›</a></div>
${list.length ? `<ul class="ac-g">${list.map(achCard).join('')}</ul>` : `<div class="panel sq-empty"><span>${af === 'done' ? '🌱' : '🎉'}</span><div><b>${af === 'done' ? 'Nothing unlocked yet' : af === 'close' ? 'Nothing halfway there yet' : 'You have unlocked them all'}</b><p class="muted small">Play, vote and RSVP and they start to fall.</p></div></div>`}` : ''}
<h4 class="al-day bd-h">🎁 Badges from teammates</h4>${BG?.badges?.length ? `<ul class="bd-g">${BG.badges.map((b, i) => `<li class="bd-c"><span class="bd-i" aria-hidden="true">${esc(b.icon)}</span><div class="bd-t"><b>${esc(b.name)}</b><small class="muted">from ${esc(b.givers.slice(0, 3).map((g) => g.n).join(', '))}${b.givers.length > 3 ? ` +${b.givers.length - 3}` : ''}</small></div><b class="bd-n num" title="${b.n} teammate${b.n === 1 ? '' : 's'}">×${b.n}</b><div class="bd-av">${b.givers.slice(0, 5).map((g) => g.a ? `<img src="${esc(g.a)}" alt="${esc(g.n)}" title="${esc(g.n)}" loading="lazy">` : `<span title="${esc(g.n)}">${esc((g.n || '?')[0])}</span>`).join('')}</div>
${BG.canRemove && b.givers.some((g) => g.rid) ? `<details class="bd-x"><summary>Manage</summary><ul>${b.givers.filter((g) => g.rid).map((g) => `<li><span>${esc(g.n)}</span><button type="button" class="al-mk" data-bdx="${g.rid}">Take off</button></li>`).join('')}</ul></details>` : ''}</li>`).join('')}</ul>` : `<div class="panel sq-empty"><span>🎁</span><div><b>No badges yet</b><p class="muted small">Teammates give badges like 🧱 The Wall or 🧠 Maestro from your profile. Give some to them and they tend to come back.</p></div></div>`}`; };
  const loadMedals = () => { if (!flagOn('badges')) { put(mdEl, '<div class="panel sq-empty"><span>🏅</span><div><b>Badges are not switched on for you yet</b><p class="muted small">They open here as soon as the club turns them on.</p></div></div>'); return; }
    M?.skeleton(mdEl, 6);
    Promise.all([ach(), A.call('/api/badges')]).then(([a, b]) => { AC = a; BG = b; put(mdEl, medalsHtml(), () => {
      const fresh = (AC?.list || []).filter((x) => x.fresh);
      if (fresh.length) { window.NorexHubX?.celebrate(fresh); M?.toast(fresh.length === 1 ? `New achievement: ${fresh[0].name}` : `${fresh.length} new achievements unlocked`, { kind: 'ok', icon: fresh[0].icon }); setTimeout(() => post('/api/achievements/seen', {}).catch(() => {}), 1500); }
    }); }).catch((e) => fail(mdEl, 'your medals', e));
  };
  mdEl.addEventListener('click', async (e) => {
    const fb = e.target.closest('[data-acf]'); if (fb) { if (fb.dataset.acf !== af) { af = fb.dataset.acf; mdEl.innerHTML = medalsHtml(); M?.pulse($('.ac-g', mdEl)); } return; }
    const bx = e.target.closest('[data-bdx]');
    if (bx) { if (bx.dataset.sure !== '1') { bx.dataset.sure = '1'; bx.textContent = 'Sure? Tap again'; setTimeout(() => { if (bx.isConnected) { bx.dataset.sure = ''; bx.textContent = 'Take off'; } }, 3500); return; }
      try { const r = await post('/api/badges/remove', { id: +bx.dataset.bdx }); BG = { ...BG, ...r }; mdEl.innerHTML = medalsHtml(); M?.toast('Badge taken off your profile', { kind: 'ok', icon: '🎁' }); } catch (er) { oops(er); } }
  });

  // ---------- go ----------
  const load = () => { M?.skeleton(meEl, 5); M?.skeleton(stEl, 5); M?.skeleton(mdEl, 6);
    A.call('/api/me').then((m) => { const claim = m.claim?.status === 'approved' ? m.claim.player : null; if (m.user?.features) A.features = m.user.features;
      startMe(m.profile); loadStats(claim); loadMedals(); })
      .catch((e) => { [meEl, stEl, mdEl].forEach((el) => fail(el, el === meEl ? 'your profile' : el === stEl ? 'your stats' : 'your medals', e)); });
  };
  d.addEventListener('click', (e) => { if (e.target.closest('[data-lmretry]')) { achP = null; load(); } });
  (A.ready || Promise.resolve()).then(load);
})();
