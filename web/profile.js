// Member profiles on the client (roadmap P2.2 Profile 2.0, P2.1 hover cards + member profile pages).
// Loaded on first use by app.js, which passes ctx: { call, toast, me: {u, n, a}, role, players: () => Promise<players[]> }.
//   NXProfile.editor(el, ctx, profile)  – the "My profile" editor in the Squad Hub
//   NXProfile.card(id, ctx)             – rich hover card html (UI.hoverCard provider)
//   NXProfile.page(el, ctx)             – member.html?u=<discord id>
// Play times are stored per member in their own time zone and always shown converted to the viewer's.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = UI.esc;
  const BASE = document.body.dataset.base || '';
  if (!$('link[href$="profile.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/profile.css` }));

  const LEAGUE_POS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
  const RUSH_POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const MEDAL = ['🥇', '🥈', '🥉'];
  const IDS = [['psn', 'PSN ID', '🎮', 'e.g. Norex_Striker'], ['xbox', 'Xbox gamertag', '🟩', 'e.g. Norex Striker'], ['ea', 'EA ID', '⚽', 'Your EA account name'], ['steam', 'Steam name', '💨', 'PC players']];
  const ROLE = { owner: ['Owner', '👑', 'gold'], manager: ['Manager', '🛡️', 'red'], claimed: ['Verified player', '✅', 'win'], member: ['Member', '', ''] };
  const rolePill = (r) => { const [l, e, t] = ROLE[r] || ROLE.member; return UI.pill(l, { emoji: e, tone: t }); };
  // ISO 3166 alpha-2 codes; names come from the browser (Intl.DisplayNames).
  const CC = 'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FO FR GA GB GD GE GH GI GL GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PR PS PT PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS SV SY SZ TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VC VE VN XK YE ZA ZM ZW'.split(' ');
  const regionName = (() => { try { const d = new Intl.DisplayNames(['en'], { type: 'region' }); return (c) => d.of(c) || c; } catch { return (c) => c; } })();
  const flag = (c) => (/^[A-Z]{2}$/.test(c || '') ? String.fromCodePoint(...[...c].map((x) => 0x1f1a5 + x.charCodeAt(0))) : '');
  const COUNTRIES = CC.map((c) => [c, regionName(c)]).sort((a, b) => a[1].localeCompare(b[1]));

  // ---------- time zones ----------
  const myTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
  const allTz = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return [myTz, 'UTC']; } })();
  // Minutes the zone is ahead of UTC right now.
  function tzOff(tz) {
    try {
      const d = new Date();
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(d).map((x) => [x.type, x.value]));
      return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, p.hour % 24, +p.minute) - Math.floor(d / 60000) * 60000) / 60000);
    } catch { return 0; }
  }
  const tzLabel = (tz) => { const o = tzOff(tz); const s = o < 0 ? '−' : '+'; const a = Math.abs(o); return `${tz.replace(/_/g, ' ')} (UTC${s}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, '0')}` : ''})`; };
  // Grid (7 bitmasks, Mon..Sun, bit h = hour h) from one zone into another (rounded to whole hours).
  function convert(grid, from, to) {
    if (!grid) return null;
    const shift = Math.round((tzOff(to) - tzOff(from)) / 60);
    const out = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 168; i++) if (grid[Math.floor(i / 24)] & (1 << (i % 24))) { const j = (((i + shift) % 168) + 168) % 168; out[Math.floor(j / 24)] |= 1 << (j % 24); }
    return out;
  }
  const hh = (h) => String(h % 24).padStart(2, '0');
  // "Fri 21–00 · Sat 20–00" (ranges end on the hour after the last one ticked)
  function summary(grid) {
    if (!grid) return '';
    const parts = [];
    grid.forEach((m, d) => {
      const r = [];
      for (let h = 0; h < 24; h++) if (m & (1 << h)) { if (r.length && r[r.length - 1][1] === h) r[r.length - 1][1] = h + 1; else r.push([h, h + 1]); }
      if (r.length) parts.push(`${DAYS[d]} ${r.map(([a, b]) => (a === 0 && b === 24 ? 'all day' : `${hh(a)}–${hh(b)}`)).join(', ')}`);
    });
    return parts.join(' · ');
  }
  const nowSlot = () => { const d = new Date(); return [(d.getDay() + 6) % 7, d.getHours()]; };
  const onNow = (viewerGrid) => { if (!viewerGrid) return false; const [d, h] = nowSlot(); return !!(viewerGrid[d] & (1 << h)); };
  // Read-only week grid (already converted to the viewer's zone).
  const weekGrid = (grid, { mini = false } = {}) => {
    const [nd, nh] = nowSlot();
    return `<div class="pt-grid${mini ? ' mini' : ''}" aria-hidden="${mini}">${mini ? '' : `<span></span>${Array.from({ length: 24 }, (_, h) => `<i class="pt-h">${h % 3 ? '' : hh(h)}</i>`).join('')}`}${DAYS.map((day, d) => `<b>${mini ? day[0] : day}</b>${Array.from({ length: 24 }, (_, h) => `<span class="pt-c${grid?.[d] & (1 << h) ? ' on' : ''}${d === nd && h === nh ? ' now' : ''}"></span>`).join('')}`).join('')}</div>`;
  };

  // ---------- links ----------
  const twitchUrl = (x) => `https://www.twitch.tv/${encodeURIComponent(x)}`;
  const ytUrl = (x) => `https://www.youtube.com/${x.split('/').map(encodeURIComponent).join('/')}`;
  const profileUrl = (id) => `${BASE}member.html?u=${encodeURIComponent(id)}`;
  const playerUrl = (k) => `${BASE}players/${encodeURIComponent(k)}.html`;
  const posLine = (list) => (list?.length ? list.map((p, i) => `<span class="pf-pos p${i}" data-tip="${['1st', '2nd', '3rd'][i]} choice">${esc(p)}</span>`).join('') : '<span class="muted">–</span>');

  // ---------- PB.4: my League / Rush build ----------
  const loadCard = () => (window.NXBuildCard ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/buildcard.js`, onload: ok, onerror: no }))));
  const BMODES = [['league', '🏟️', 'League'], ['rush', '⚡', 'Rush']];
  const prettyArch = (id) => String(id || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const hcBuilds = (bl) => (bl && (bl.league || bl.rush) ? `<div class="pf-hc-row pf-hc-builds"><small>🧬 Builds</small><span>${BMODES.filter(([k]) => bl[k]).map(([k, ic]) => `<span title="${esc(bl[k].title)}">${ic} ${esc(prettyArch(bl[k].arch))} L${esc(bl[k].level)}${bl[k].position ? ` · ${esc(bl[k].position)}` : ''}</span>`).join('<br>')}</span></div>` : '');
  async function paintBuilds(el, bl, mine) {
    try {
      await loadCard();
      const g = await NXBuildCard.ready();
      const try_ = window.NXViewer?.flagOn('builder');
      el.innerHTML = BMODES.map(([k, ic, l]) => (bl[k] ? NXBuildCard.mini(g, bl[k], { href: try_ ? NXBuildCard.builderUrl(bl[k]) : undefined, head: `${ic} ${l} build${bl[k].position ? ` · ${bl[k].position}` : ''}` })
        : `<div class="pb-mini bad"><span class="pb-ovr">–</span><div class="pb-mini-main"><small>${ic} ${l} build</small><b>Not picked yet</b>${mine ? `<span class="pb-mini-sub">Open a build in the ${try_ ? `<a href="${BASE}builder.html">Pro Builder</a>` : 'Pro Builder'} or on <a href="${BASE}probuilds.html">Pro Builds</a> → ⭐ Use as my build</span>` : ''}</div></div>`)).join('');
    } catch { el.innerHTML = '<p class="muted">Couldn’t load the game data for the builds.</p>'; }
  }

  // ---------- data ----------
  const cards = new Map();
  const getCard = (id, ctx) => { if (!cards.has(id)) cards.set(id, ctx.call(`/api/member?u=${encodeURIComponent(id)}`).catch((e) => { cards.delete(id); throw e; })); return cards.get(id); };
  const findPlayer = async (ctx, k) => (k ? (await ctx.players().catch(() => [])).find((p) => p.k === k) : null);

  // ================= P2.1 hover card =================
  async function card(id, ctx) {
    const d = await getCard(id, ctx);
    const { member: m, claim, profile: p } = d;
    const pl = await findPlayer(ctx, claim?.player);
    const grid = p?.playTimes && convert(p.playTimes, p.tz, myTz);
    const ids = IDS.filter(([k]) => p?.ids?.[k]);
    return `<div class="nx-hc-top">${UI.avatar(m.a, m.n, 56)}<div><b>${esc(m.n)} ${flag(p?.country)}</b><small>${m.tag ? `@${esc(m.tag)} · ` : ''}${rolePill(m.role)}</small></div></div>
${claim ? `<a class="pf-hc-player" href="${playerUrl(claim.player)}">🪪 <b>${esc(claim.playerName)}</b>${pl?.ovr ? ` <span class="pf-ovr">${pl.ovr}</span>` : ''}${pl?.pos ? ` <small>${esc(pl.pos)}</small>` : ''}</a>` : ''}
${p?.positions?.length || p?.rushPositions?.length ? `<div class="pf-hc-row"><small>League</small><span>${posLine(p.positions)}</span></div><div class="pf-hc-row"><small>⚡ Rush</small><span>${posLine(p.rushPositions)}</span></div>` : ''}
${p?.platform || ids.length ? `<div class="pf-hc-ids">${p.platform ? UI.pill(p.platform, { emoji: '🎮' }) : ''}${ids.map(([k, l, e]) => `<span data-tip="${esc(l)}">${e} ${esc(p.ids[k])}</span>`).join('')}</div>` : ''}
${hcBuilds(d.builds)}
${grid ? `<div class="pf-hc-time">${onNow(grid) ? '<span class="pf-live">🟢 Usually on now</span>' : ''}${weekGrid(grid, { mini: true })}<small>🕒 ${esc(summary(grid))} <i>(your time)</i></small></div>` : ''}
<div class="row"><a class="btn sm" href="${profileUrl(m.id)}">👤 View profile</a>${claim ? `<a class="btn sm ghost" href="${playerUrl(claim.player)}">🪪 Player page</a>` : ''}</div>`;
  }

  // ================= P2.2 editor =================
  let draft = null; // survives hub redraws until saved
  function editor(el, ctx, profile) {
    const p = draft ?? { bio: '', positions: [], rushPositions: [], platform: '', tz: '', playTimes: null, ids: {}, twitch: '', youtube: '', country: '', club: '', ...(profile || {}) };
    draft = p;
    const grid = (p.playTimes ?? [0, 0, 0, 0, 0, 0, 0]).slice();
    const tz = p.tz || myTz;
    const rankSel = (key, list, i) => `<select data-rank="${key}" data-i="${i}" aria-label="${key === 'positions' ? 'League' : 'Rush'} ${['1st', '2nd', '3rd'][i]} position"><option value="">${i ? '–' : 'Pick…'}</option>${list.map((x) => `<option${p[key][i] === x ? ' selected' : ''}>${x}</option>`).join('')}</select>`;
    el.innerHTML = `<div class="pf-edit">
<div class="pf-edit-head"><h3>✏️ My profile</h3><a class="btn sm ghost" href="${profileUrl(ctx.me.u)}">👁 View my profile</a></div>
<fieldset><legend>🙋 About me</legend>
<label class="fld">Bio <textarea id="pf-bio" maxlength="280" rows="3" placeholder="Playstyle, what you bring to the squad, anything…">${esc(p.bio)}</textarea></label>
<div class="pf-2"><label class="fld">Country <select id="pf-country"><option value="">–</option>${COUNTRIES.map(([c, n]) => `<option value="${c}"${p.country === c ? ' selected' : ''}>${flag(c)} ${esc(n)}</option>`).join('')}</select></label>
<label class="fld">Favourite real club <input id="pf-club" maxlength="40" value="${esc(p.club)}" placeholder="e.g. Real Madrid"></label></div></fieldset>
<fieldset><legend>📍 Positions <small>1st · 2nd · 3rd choice</small></legend>
<div class="pf-ranks"><span>🏆 League</span>${[0, 1, 2].map((i) => rankSel('positions', LEAGUE_POS, i)).join('')}</div>
<div class="pf-ranks"><span>⚡ Rush</span>${[0, 1, 2].map((i) => rankSel('rushPositions', RUSH_POS, i)).join('')}</div></fieldset>
<fieldset><legend>🎮 Platform &amp; IDs <small>self-reported</small></legend>
<label class="fld">Main platform <select id="pf-plat"><option value="">–</option>${['PS5', 'Xbox', 'PC'].map((x) => `<option${p.platform === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
<div class="pf-2">${IDS.map(([k, l, e, ph]) => `<label class="fld">${e} ${l} <input data-id="${k}" maxlength="40" value="${esc(p.ids?.[k] || '')}" placeholder="${esc(ph)}"></label>`).join('')}</div></fieldset>
<fieldset><legend>📺 My channels</legend><div class="pf-2">
<label class="fld"><span class="pf-tw">Twitch</span> <input id="pf-twitch" maxlength="120" value="${esc(p.twitch)}" placeholder="channel name or twitch.tv link"></label>
<label class="fld"><span class="pf-yt">YouTube</span> <input id="pf-yt" maxlength="160" value="${esc(p.youtube)}" placeholder="@handle or channel link"></label></div></fieldset>
<fieldset><legend>🕒 When I usually play</legend>
<label class="fld">My time zone <select id="pf-tz">${[...new Set([tz, ...allTz])].map((z) => `<option value="${esc(z)}"${z === tz ? ' selected' : ''}>${esc(tzLabel(z))}</option>`).join('')}</select></label>
<p class="small muted">Tap or drag across the hours you're usually online. Everyone else sees them in their own time.</p>
<div class="chipset pf-presets"><button type="button" class="chip" data-preset="nights">🌙 Weeknights 19–23</button><button type="button" class="chip" data-preset="weekend">🏟️ Weekend evenings</button><button type="button" class="chip" data-preset="clear">🧹 Clear</button></div>
<div class="pt-edit" id="pf-grid"></div><small class="muted" id="pf-sum"></small></fieldset>
<div class="pf-save"><button class="btn" type="button" id="pf-save">💾 Save profile</button>${profile?.updated ? `<small class="muted">Saved ${UI.time(profile.updated)}</small>` : ''}</div></div>`;

    const gEl = $('#pf-grid', el), sum = $('#pf-sum', el);
    const drawGrid = () => {
      gEl.innerHTML = weekGrid(grid).replace(/<span class="pt-c([^"]*)"><\/span>/g, (() => { let i = 0; return (_, c) => `<span class="pt-c${c}" data-c="${i++}"></span>`; })());
      const s = summary(grid);
      sum.textContent = s ? `🕒 ${s}` : 'No play times yet.';
      p.playTimes = grid.some(Boolean) ? grid.slice() : null;
    };
    drawGrid();
    // paint: the first cell decides on/off, then every cell the pointer crosses follows
    let paint = null;
    const setCell = (c) => {
      const i = +c.dataset.c, d = Math.floor(i / 24), h = i % 24;
      grid[d] = paint ? grid[d] | (1 << h) : grid[d] & ~(1 << h);
      c.classList.toggle('on', paint);
    };
    gEl.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('[data-c]');
      if (!c) return;
      e.preventDefault();
      gEl.setPointerCapture(e.pointerId);
      paint = !c.classList.contains('on');
      setCell(c);
    });
    gEl.addEventListener('pointermove', (e) => {
      if (paint === null) return;
      const c = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-c]');
      if (c && gEl.contains(c) && c.classList.contains('on') !== paint) setCell(c);
    });
    const stop = () => { if (paint !== null) { paint = null; drawGrid(); } };
    gEl.addEventListener('pointerup', stop);
    gEl.addEventListener('pointercancel', stop);

    el.onchange = (e) => {
      const t = e.target;
      if (t.dataset.rank) {
        const list = [0, 1, 2].map((i) => $(`[data-rank="${t.dataset.rank}"][data-i="${i}"]`, el).value);
        if (t.value && list.filter((x) => x === t.value).length > 1) { ctx.toast(`${t.value} is already picked`, true); t.value = ''; }
      }
      readForm();
    };
    el.oninput = () => readForm();
    function readForm() {
      p.bio = $('#pf-bio', el).value; p.country = $('#pf-country', el).value; p.club = $('#pf-club', el).value;
      p.platform = $('#pf-plat', el).value; p.twitch = $('#pf-twitch', el).value; p.youtube = $('#pf-yt', el).value; p.tz = $('#pf-tz', el).value;
      for (const k of ['positions', 'rushPositions']) p[k] = [0, 1, 2].map((i) => $(`[data-rank="${k}"][data-i="${i}"]`, el).value).filter(Boolean);
      p.ids = Object.fromEntries($$('[data-id]', el).map((i) => [i.dataset.id, i.value.trim()]).filter(([, v]) => v));
    }
    el.onclick = async (e) => {
      const pr = e.target.closest('[data-preset]')?.dataset.preset;
      if (pr) {
        for (let d = 0; d < 7; d++) {
          if (pr === 'clear') grid[d] = 0;
          if (pr === 'nights' && d < 5) grid[d] |= 0b1111 << 19;
          if (pr === 'weekend' && d >= 4) grid[d] |= 0b11111 << 18;
        }
        drawGrid();
      }
      if (e.target.closest('#pf-save')) {
        readForm();
        const btn = $('#pf-save', el);
        btn.disabled = true;
        try {
          const saved = (await ctx.call('/api/profile', { ...p, updated: undefined })).profile;
          draft = null;
          cards.delete(ctx.me.u); UI.hoverCard.forget(ctx.me.u); sessionStorage.removeItem('norex_public');
          ctx.onSaved?.(saved);
          ctx.toast('Profile saved');
          editor(el, ctx, saved);
        } catch (er) { ctx.toast(er.message, true); btn.disabled = false; }
      }
    };
  }

  // ================= P2.1 member profile page =================
  const ACT = { login: '🔑', claim: '🪪', 'claim-approved': '✅', profile: '✏️', availability: '📅', vote: '⭐', 'rush-submit': '⚡', 'rush-logged': '⚡', scout: '🔭' };
  async function page(el, ctx) {
    const id = new URLSearchParams(location.search).get('u') || ctx.me.u;
    el.innerHTML = UI.skeleton('profile');
    let d;
    try { d = await getCard(id, ctx); } catch (e) {
      el.innerHTML = UI.empty({ icon: '🕵️', title: 'Member not found', text: e.message === 'Member not found' ? 'This member has not logged in to the site yet.' : e.message, action: `<a class="btn sm" href="${BASE}members.html">Back to the Squad Hub</a>` });
      return;
    }
    const { member: m, claim, profile: p = {}, activity, builds } = d;
    const pf = p || {};
    const pl = await findPlayer(ctx, claim?.player);
    const grid = pf.playTimes && convert(pf.playTimes, pf.tz, myTz);
    const ids = IDS.filter(([k]) => pf.ids?.[k]);
    document.title = `${m.n} – ${document.title.split(' – ').pop()}`;
    const sec = (title, body) => `<section class="card pf-sec"><h3>${title}</h3>${body}</section>`;
    el.innerHTML = `<section class="pf-hero card reveal in">
<div class="pf-av">${UI.avatar(m.a, m.n, 112)}${pf.country ? `<span class="pf-flag" data-tip="${esc(regionName(pf.country))}">${flag(pf.country)}</span>` : ''}</div>
<div class="pf-id"><h1>${esc(m.n)}</h1><div class="pf-meta">${rolePill(m.role)}${m.tag ? `<span class="pf-tag">@${esc(m.tag)}</span>` : ''}${pf.club ? UI.pill(pf.club, { emoji: '❤️' }) : ''}${onNow(grid) ? '<span class="pf-live">🟢 Usually on now</span>' : ''}</div>
${pf.bio ? `<p class="pf-bio">${esc(pf.bio)}</p>` : ''}<small class="muted">Member since ${new Date(m.first).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} · last seen ${UI.time(m.last)}</small>
<div class="pf-actions">${m.me ? `<a class="btn" href="${BASE}members.html#me">✏️ Edit my profile</a>` : `<a class="btn discord" href="https://discord.com/users/${encodeURIComponent(m.id)}" target="_blank" rel="noopener">💬 Open chat in Discord</a>`}
${claim ? `<a class="btn ghost" href="${playerUrl(claim.player)}">🪪 View player page</a>` : ''}${activity ? '<a class="btn ghost" href="#pf-activity">📜 Activity log</a>' : ''}</div></div>
${claim ? `<a class="pf-card" href="${playerUrl(claim.player)}"><small>Plays as</small><b>${esc(claim.playerName)}</b>${pl?.ovr ? `<span class="pf-ovr big">${pl.ovr}</span>` : ''}<small>${esc(pl?.pos || '')}${pl?.s ? ` · ${pl.s.gp} GP · ${pl.s.g}G ${pl.s.a}A · ${Number(pl.s.r).toFixed(1)}` : ''}</small></a>` : ''}</section>
<div class="pf-grid2">
${sec('📍 Positions', `<div class="pf-modes"><div><small>🏆 League</small><div>${posLine(pf.positions)}</div></div><div><small>⚡ Rush</small><div>${posLine(pf.rushPositions)}</div></div></div>`)}
${sec('🎮 Platform &amp; IDs', pf.platform || ids.length ? `<ul class="pf-ids">${pf.platform ? `<li><span>🎮 Platform</span><b>${esc(pf.platform)}</b></li>` : ''}${ids.map(([k, l, e]) => `<li><span>${e} ${l}</span><b>${esc(pf.ids[k])}</b><button type="button" class="pf-copy" data-copy="${esc(pf.ids[k])}" aria-label="Copy ${l}">📋</button></li>`).join('')}</ul><small class="muted">Self-reported – not verified yet.</small>` : '<p class="muted">No platform IDs added yet.</p>')}
</div>
${builds ? sec('🧬 Builds <small class="muted">League &amp; Rush</small>', `<div class="pb-minis" data-pf-builds>${UI.skeleton('rows', 2)}</div>`) : ''}
${sec('🕒 When they play', grid ? `<p class="small muted">Shown in <b>your</b> time – ${esc(tzLabel(myTz))}.${pf.tz && pf.tz !== myTz ? ` ${esc(m.n)}'s time zone: ${esc(tzLabel(pf.tz))}.` : ''}</p>${weekGrid(grid)}<p class="small">${esc(summary(grid))}</p>` : '<p class="muted">No play times added yet.</p>')}
${pf.twitch || pf.youtube ? sec('📺 Channels', `<div class="row">${pf.twitch ? `<a class="btn pf-twitch" href="${twitchUrl(pf.twitch)}" target="_blank" rel="noopener nofollow">Twitch · ${esc(pf.twitch)}</a>` : ''}${pf.youtube ? `<a class="btn pf-youtube" href="${ytUrl(pf.youtube)}" target="_blank" rel="noopener nofollow">YouTube · ${esc(pf.youtube)}</a>` : ''}</div>`) : ''}
${activity ? `<section class="card pf-sec" id="pf-activity"><h3>📜 Activity log <small class="muted">managers only</small></h3>${activity.length ? `<ul class="feed">${activity.map((a) => `<li><span class="ic">${ACT[a.type] || '•'}</span><div>${esc(a.type.replace(/-/g, ' '))}${a.detail ? ` <span class="muted">${esc(a.detail)}</span>` : ''}</div><small class="muted">${UI.time(a.at)}</small></li>`).join('')}</ul>` : UI.empty({ icon: '📜', title: 'No activity yet' })}</section>` : ''}`;
    if (builds) paintBuilds($('[data-pf-builds]', el), builds, m.me);
    el.onclick = async (e) => {
      const b = e.target.closest('[data-copy]');
      if (!b) return;
      try { await navigator.clipboard.writeText(b.dataset.copy); ctx.toast('Copied'); } catch { ctx.toast('Could not copy', true); }
    };
  }

  window.NXProfile = { editor, card, page, flag, profileUrl };
})();
