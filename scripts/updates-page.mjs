// FC updates page + game data JSON (roadmap P1.7 / PB.1). Called from build.mjs with its page helpers.
//   site/updates.html     every EA FC 27 update / Pitch Notes, split by section, filterable (Clubs, Rush, level cap…)
//   site/api/updates.json the same data for the Worker (pending level-cap changes) and the bot
//   site/api/game.json    newest data/game/*.json – the seed the Worker serves until a manager publishes a version
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';

const CAT = { clubs: ['⚽', 'Clubs'], gameplay: ['🎮', 'Gameplay'], fut: ['🃏', 'Ultimate Team'], career: ['📋', 'Career'], general: ['📰', 'General'] };
const FILTERS = [['all', '📚 All'], ['clubs', '⚽ Clubs'], ['rush', '⚡ Rush'], ['levelCap', '🔝 Level cap'], ['gameplay', '🎮 Gameplay'], ['fut', '🃏 FUT'], ['career', '📋 Career']];
const KIND_ICON = { levelCap: '🔝', level: '📈', axp: '✨', skillPoints: '🎯', archetype: '🧬', playstyle: '💫', amps: '⚡', mastery: '🏅', rush: '🏃' };

export function loadUpdates() {
  const dir = path.join(DATA, 'updates');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json') : [];
  const entries = files.map((f) => readJson(path.join(dir, f))).filter((e) => e?.slug).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  return { checked: readJson(path.join(dir, 'index.json'), {})?.checked ?? null, entries };
}

export function loadGame() {
  const dir = path.join(DATA, 'game');
  const all = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => /^fc\d+-.+\.json$/.test(f)).map((f) => readJson(path.join(dir, f))).filter(Boolean);
  return all.sort((a, b) => String(b.published).localeCompare(String(a.published)))[0] ?? null;
}

const niceDay = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const tagsOf = (e) => new Set([...e.sections.map((s) => s.cat), ...e.hits.map((h) => h.kind), ...(e.sections.some((s) => s.keys.includes('rush')) ? ['rush'] : [])]);

export function buildUpdates({ write, page, pageHead, section, esc, emptyState, config }) {
  const { checked, entries } = loadUpdates();
  const game = loadGame();
  write('api/updates.json', JSON.stringify({ checked, entries }));
  if (game) write('api/game.json', JSON.stringify(game));

  const cap = game?.levelCap ?? {};
  const capCard = `<div class="gr-strip card reveal" data-game>
<div class="gr-cap"><small>🔝 Max level</small><b data-game-cap>${esc(cap.value ?? '–')}</b><span class="tag${cap.verified ? ' home' : ''}" data-game-verified>${cap.verified ? '✓ Official' : 'Unverified'}</span></div>
<div class="gr-meta"><span>Game data <code data-game-version>${esc(game?.version ?? '–')}</code></span><span class="muted small" data-game-note>${esc(cap.verified ? 'Confirmed by EA' : cap.note ?? '')}</span>
${checked ? `<span class="muted small">Checked EA's news <time class="ago" datetime="${esc(checked)}">${esc(checked.slice(0, 10))}</time> · every 6 h</span>` : ''}</div></div>`;
  const rules = game?.rules?.length ? section('🧬 Build rules we know', `<ul class="gr-rules">${game.rules.map((r) => `<li><span>${esc(r.text)}</span>${r.source === 'ea-notes' ? '<span class="tag home">EA notes</span>' : '<span class="tag">unverified</span>'}</li>`).join('')}</ul>`, { sub: 'from the official Pitch Notes' }) : '';

  const entryHtml = (e) => {
    const tags = tagsOf(e);
    const build = [...new Map(e.hits.filter((h) => h.kind !== 'rush').map((h) => [h.kind, h])).values()];
    const text = [e.title, e.summary, ...e.sections.flatMap((s) => [s.title, s.summary, ...s.subs])].join(' ').toLowerCase();
    return `<article class="upd card" id="${esc(e.slug)}" data-tags="${esc([...tags].join(' '))}" data-text="${esc(text)}">
<header class="upd-head"><time datetime="${esc(e.published)}">${esc(niceDay(e.published))}</time><div class="upd-badges">${e.clubs ? '<span class="tag home">⚽ Clubs impact</span>' : ''}${tags.has('levelCap') ? '<span class="tag gold">🔝 Level cap</span>' : ''}${tags.has('rush') ? '<span class="tag">⚡ Rush</span>' : ''}</div></header>
<h3><a href="#${esc(e.slug)}">${esc(e.title)}</a></h3>
${e.summary ? `<p class="upd-sum">${esc(e.summary)}</p>` : ''}
${build.length ? `<div class="upd-build"><b>🛠 What changed for builds</b><ul>${build.map((h) => `<li><span class="kic" aria-hidden="true">${KIND_ICON[h.kind] ?? '•'}</span><div><b>${esc(h.label)}</b>${h.value ? ` <span class="tag gold">${esc(h.value)}</span>` : ''} <small class="muted">· ${esc(h.section)}</small><q>${esc(h.quote)}</q></div></li>`).join('')}</ul></div>` : ''}
<details class="upd-secs"><summary>📑 ${e.sections.length} section${e.sections.length === 1 ? '' : 's'}</summary><ol>${e.sections.map((s) => `<li class="cat-${esc(s.cat)}"><span class="upd-cat">${CAT[s.cat]?.[0] ?? '📰'} ${esc(CAT[s.cat]?.[1] ?? s.cat)}</span><b>${esc(s.title)}</b>${s.summary ? `<p>${esc(s.summary)}</p>` : ''}${s.subs.length ? `<small class="muted">${s.subs.map(esc).join(' · ')}</small>` : ''}</li>`).join('')}</ol></details>
<a class="btn ghost sm" href="${esc(e.url)}" target="_blank" rel="noopener">Read the full notes on EA.com ↗</a>
</article>`;
  };

  const list = entries.length
    ? `<div class="upd-bar reveal"><input class="filter" type="search" placeholder="Search updates… (e.g. Amps, AXP, corners)" data-upd-search aria-label="Search updates">
<div class="chipset" data-upd-filter>${FILTERS.map(([k, l], i) => `<button class="chip${i ? '' : ' on'}" type="button" data-f="${k}">${l}</button>`).join('')}</div></div>
<div class="upd-list">${entries.map((e, i) => entryHtml(e).replace('<article class="upd card"', `<article class="upd card" style="--i:${Math.min(i, 8)}"`)).join('')}</div><div data-upd-none hidden>${emptyState('🔎', 'No update matches', 'Try another filter or search word.')}</div>`
    : emptyState('📢', 'No updates logged yet', 'EA’s news is checked every 6 hours – new Pitch Notes appear here automatically.');

  write('updates.html', page({
    title: `FC 27 Updates – ${config.siteTitle}`, base: '', active: 'updates',
    description: 'Every EA SPORTS FC 27 update and Pitch Notes, split by section – with what changed for Clubs and Pro builds.',
    body: `${pageHead('📢 FC 27 Updates', 'Every EA SPORTS FC 27 update & Pitch Notes – and what it means for Clubs and your Pro build.', '')}
${capCard}
${section('🗞️ Patch notes log', list, { sub: `${entries.length} update${entries.length === 1 ? '' : 's'}` })}
${rules}
<p class="muted small">Short summaries and quotes from EA's official Pitch Notes – the full notes are on ea.com. Not affiliated with EA.</p>
<link rel="stylesheet" href="assets/game.css"><script src="assets/game.js" defer></script>`,
  }));
  return { entries: entries.length, game: game?.version };
}
