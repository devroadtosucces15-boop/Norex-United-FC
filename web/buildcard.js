// Mini build cards + auto labels (roadmap PB.3 / PB.4), shared by the Pro Builds board, member profiles,
// hover cards and public player pages. A build is { code, title, level, version, position, mode, tags? } – the code
// is the builder's share-link string, decoded with the same maths as the sandbox (build-math.js + NXGame.load()).
//   NXBuildCard.ready()            → Promise<game data> (loads game.js + build-math.js on first use)
//   NXBuildCard.info(g, x)         → { ev, arch, max, current, ps } or null when the code can't be read
//   NXBuildCard.labels(g, x, opt)  → pill HTML: archetype, level/MAX, patch ✓/⚠, position, mode, body, PlayStyles, #tags
//   NXBuildCard.mini(g, x, opt)    → compact card (profile, player page, portal)
//   NXBuildCard.archName(id, g?)   → "Shot Stopper" (works without game data)
(() => {
  if (window.NXBuildCard) return;
  const BASE = document.body.dataset.base || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!document.querySelector('link[href$="probuilds.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/probuilds.css` }));
  const ICON = { GK: '🧤', DEF: '🛡️', MID: '🎯', FWD: '⚡' };
  const MODE = { league: ['🏟️', 'League'], rush: ['⚡', 'Rush'] };
  const script = (src) => new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/${src}`, onload: ok, onerror: no })));
  let game;
  const ready = () => (game ??= (async () => {
    if (!window.NXGame) await script('game.js');
    if (!window.NXBuildMath) await script('build-math.js');
    return NXGame.load().catch(() => fetch(`${BASE}api/game.json`).then((r) => r.json()));
  })().catch((e) => { game = null; throw e; }));

  const archName = (id, g) => g?.archetypes?.find((a) => a.id === id)?.name ?? String(id || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const cache = new Map();
  function info(g, x) {
    const key = `${g.version}|${x.code}`;
    if (cache.has(key)) return cache.get(key);
    const M = window.NXBuildMath;
    const d = M && M.decode(g, x.code);
    const ev = d && M.evaluate(g, d);
    const out = ev && {
      ev, arch: ev.arch, cap: ev.cap, max: (x.level ?? ev.level) >= ev.cap, current: !x.version || x.version === g.version,
      ps: [...ev.choices.plus.map((id) => `${g.playstyles?.find((p) => p.id === id)?.name ?? id}+`), ...ev.choices.ps.map((id) => g.playstyles?.find((p) => p.id === id)?.name ?? id)],
      body: d.h || d.w ? `${ev.choices.h} cm · ${ev.choices.w} kg` : '',
    };
    cache.set(key, out);
    return out;
  }
  const pill = (label, emoji, tone, tip) => `<span class="nx-pill${tone ? ` t-${tone}` : ''}"${tip ? ` data-tip="${esc(tip)}"` : ''}>${emoji ? `<i aria-hidden="true">${emoji}</i>` : ''}${esc(label)}</span>`;
  function labels(g, x, { tags = true, ps = 3 } = {}) {
    const i = info(g, x);
    const out = [];
    if (i) out.push(pill(i.arch.name, ICON[i.arch.group] || '🧬', 'red'));
    out.push(i?.max ? pill('MAX', '🔝', 'gold', `Level ${x.level} – today’s max`) : pill(`L${x.level}`, '📈', '', i ? `Level ${x.level} of ${i.cap}` : ''));
    out.push(i && !i.current ? pill('Older patch', '⚠️', 'loss', `Made on ${x.version} – now ${g.version}`) : pill('Current patch', '✓', 'win', `Game rules ${g.version}`));
    if (x.position) out.push(pill(x.position, '📍'));
    if (MODE[x.mode]) out.push(pill(MODE[x.mode][1], MODE[x.mode][0], x.mode === 'rush' ? 'draw' : ''));
    if (i?.body) out.push(pill(i.body, '📏'));
    if (i && ps) out.push(...i.ps.slice(0, ps).map((n) => pill(n, '💫')));
    if (tags) out.push(...(x.tags || []).map((t) => `<span class="pb-tag">#${esc(t)}</span>`));
    return out.join('');
  }
  const face = (ev) => `<span class="pb-face">${ev.face.map(([k, v]) => `<span><small>${k}</small><b class="${v >= 80 ? 'hi' : v >= 65 ? 'mid' : ''}">${v}</b></span>`).join('')}</span>`;
  // opt: { href, head (small line above the title), foot (html) }
  function mini(g, x, { href, head, foot = '' } = {}) {
    const i = info(g, x);
    const tag = href ? 'a' : 'div';
    if (!i) return `<${tag} class="pb-mini bad"${href ? ` href="${esc(href)}"` : ''}><span class="pb-ovr">?</span><div><small>${esc(head || '')}</small><b>${esc(x.title)}</b><span class="muted small">Can’t read this build with the current game data.</span></div></${tag}>`;
    return `<${tag} class="pb-mini${i.max ? ' max' : ''}"${href ? ` href="${esc(href)}"` : ''}>
<span class="pb-ovr" title="Estimated overall"><b>${i.ev.ovr}</b><small>OVR*</small></span>
<div class="pb-mini-main"><small>${esc(head || `${ICON[i.arch.group] || ''} ${i.arch.name}`)}</small><b>${esc(x.title)}</b>
<span class="pb-mini-sub">${ICON[i.arch.group] || ''} ${esc(i.arch.name)} · ${i.max ? '<em class="pb-max">MAX</em>' : `L${esc(x.level)}`}${x.position ? ` · ${esc(x.position)}` : ''}${i.current ? '' : ' · <em class="pb-old" title="Made on an older patch">⚠</em>'}</span>
${face(i.ev)}${foot}</div></${tag}>`;
  }
  const builderUrl = (x) => `${BASE}builder.html#${x.code}`;
  window.NXBuildCard = { ready, info, labels, mini, face, archName, builderUrl, MODE, ICON };
})();
