// member.html?u=<discord id>: a squad member's profile (GET /api/member, members only on the Worker – guests are asked to sign in).
// Discord /profile embeds and the Hub's hover cards link here.
(() => {
  const d = document, host = d.querySelector('[data-member-page]'); if (!host) return;
  const API = window.NOREX_API, A = window.NorexAuth;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const put = (h) => { host.innerHTML = h; };
  const empty = (icon, title, text, action = '') => put(`<div class="panel sq-empty"><span>${icon}</span><div><b>${title}</b><p class="muted small">${text}</p></div>${action}</div>`);
  const id = new URLSearchParams(location.search).get('u') || A?.session?.u || '';
  if (!API) return empty('🚧', 'Not available in the design build', 'Profiles load from the club server, which this copy is not connected to.');
  if (!A?.token) return empty('🔒', 'Members only', 'Sign in with Discord to see squad profiles.', `<a class="btn gold" href="${esc(A?.loginUrl?.() || '#')}">🎮 Sign in with Discord</a>`);
  if (!id) return empty('🕵️', 'Member not found', 'This link has no member in it.', '<a class="btn ghost" href="hub.html">Back to the Hub</a>');
  const ROLE = { owner: ['Owner', '👑', 'gold'], manager: ['Manager', '🛡️', 'red'], claimed: ['Verified player', '✅', 'win'], member: ['Member', '', ''] };
  const cc = (c) => (/^[A-Za-z]{2}$/.test(c || '') ? String.fromCodePoint(...[...c.toUpperCase()].map((x) => 127397 + x.charCodeAt(0))) : '');
  const ids = [['psn', 'PSN ID', '🎮'], ['xbox', 'Xbox gamertag', '🟩'], ['ea', 'EA ID', '⚽'], ['steam', 'Steam name', '💨']];
  const pos = (a) => (a && a.length ? a.map((x) => `<span class="chip gold">${esc(x)}</span>`).join('') : '<span class="muted small">None picked yet</span>');
  const sec = (t, b) => `<section class="panel reveal in"><h3>${t}</h3>${b}</section>`;
  const link = (u, base) => (/^https?:\/\//.test(u) ? u : base + encodeURIComponent(u));
  A.call(`/api/member?u=${encodeURIComponent(id)}`).then((r) => {
    const m = r.member, p = r.profile || {}, c = r.claim, role = ROLE[m.role] || ROLE.member, have = ids.filter(([k]) => p.ids?.[k]);
    d.title = `${m.n} · NOREX UNITED`;
    put(`<div class="panel reveal in" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
<img src="${esc(m.a || 'crest-sm.png')}" alt="" width="104" height="104" style="border-radius:50%;object-fit:cover;border:2px solid var(--line)">
<div style="flex:1;min-width:220px"><h2 style="font-size:clamp(30px,6vw,44px);margin:0">${esc(m.n)} ${cc(p.country)}</h2>
<div class="chips" style="margin-top:8px"><span class="pill ${role[2]}">${role[1]} ${role[0]}</span>${m.tag ? `<span class="muted small">@${esc(m.tag)}</span>` : ''}${p.club ? `<span class="chip">❤️ ${esc(p.club)}</span>` : ''}</div>
${p.bio ? `<p class="muted" style="margin:12px 0 0">${esc(p.bio)}</p>` : ''}
<div class="chips" style="margin-top:14px">${m.me ? '<a class="btn" href="hub.html">✏️ Edit my profile</a>' : `<a class="btn" href="https://discord.com/users/${encodeURIComponent(m.id)}" target="_blank" rel="noopener">💬 Open chat in Discord</a>`}${c ? `<a class="btn ghost" href="player-${encodeURIComponent(c.player)}.html">🪪 ${esc(c.playerName)}</a>` : ''}</div></div></div>
<div class="grid g2" style="margin-top:18px">${sec('📍 Positions', `<p class="muted small" style="margin:0 0 6px">🏆 League</p><div class="chips">${pos(p.positions)}</div><p class="muted small" style="margin:14px 0 6px">⚡ Rush</p><div class="chips">${pos(p.rushPositions)}</div>`)}
${sec('🎮 Platform &amp; IDs', p.platform || have.length ? `<ul style="list-style:none;margin:0;padding:0;display:grid;gap:8px">${p.platform ? `<li><span class="muted">🎮 Platform</span> <b>${esc(p.platform)}</b></li>` : ''}${have.map(([k, l, e]) => `<li><span class="muted">${e} ${l}</span> <b>${esc(p.ids[k])}</b></li>`).join('')}</ul>` : '<p class="muted">No IDs added yet.</p>')}</div>
${p.twitch || p.youtube ? `<div style="margin-top:18px">${sec('📺 Channels', `<div class="chips">${p.twitch ? `<a class="btn ghost" href="${esc(link(p.twitch, 'https://twitch.tv/'))}" target="_blank" rel="noopener nofollow">Twitch · ${esc(p.twitch)}</a>` : ''}${p.youtube ? `<a class="btn ghost" href="${esc(link(p.youtube, 'https://youtube.com/@'))}" target="_blank" rel="noopener nofollow">YouTube · ${esc(p.youtube)}</a>` : ''}</div>`)}</div>` : ''}`);
  }).catch((e) => (/not found/i.test(e?.message || '') ? empty('🕵️', 'Member not found', 'This member has not signed in to the site yet.', '<a class="btn ghost" href="hub.html">Back to the Hub</a>') : empty('⚠️', 'Could not load the profile', esc(e?.message || 'Try again in a moment.'), '<button type="button" class="btn ghost" onclick="location.reload()">Try again</button>')));
})();
