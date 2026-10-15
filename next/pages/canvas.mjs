// Canvas + card background proposals: the same real content rendered on four dark canvases so they can be compared fairly.
import { players, clubStats as C, recent, fmtDate } from '../lib/data.mjs';
import { card, esc } from '../lib/ui.mjs';
const top = players.filter((p) => p.ovr).sort((a, b) => b.ovr - a.ovr);
const star = top[0], rows = top.slice(0, 4);
const cup = '<svg viewBox="0 0 100 120" class="cup"><defs><linearGradient id="cgX" x1="0" x2="1"><stop offset="0" stop-color="#a77a22"/><stop offset=".45" stop-color="#fff1c2"/><stop offset="1" stop-color="#c9993a"/></linearGradient></defs><path d="M25 18H10c0 18 8 28 18 30M75 18h15c0 18-8 28-18 30" fill="none" stroke="url(#cgX)" stroke-width="5" stroke-linecap="round"/><g fill="url(#cgX)"><path d="M25 10h50v30c0 20-12 32-25 34-13-2-25-14-25-34z"/><rect x="45" y="74" width="10" height="18"/><rect x="30" y="92" width="40" height="10" rx="3"/><rect x="24" y="102" width="52" height="12" rx="3"/></g></svg>';
const pitch = '<svg viewBox="0 0 105 68" class="pit"><g fill="none" stroke="#ffffffcc" stroke-width=".5"><rect x="1" y="1" width="103" height="66"/><line x1="52.5" y1="1" x2="52.5" y2="67"/><circle cx="52.5" cy="34" r="9"/><rect x="1" y="14" width="16" height="40"/><rect x="88" y="14" width="16" height="40"/></g><g fill="#efcf7a"><circle cx="8" cy="34" r="2"/><circle cx="26" cy="18" r="2"/><circle cx="26" cy="34" r="2"/><circle cx="26" cy="50" r="2"/><circle cx="48" cy="12" r="2"/><circle cx="44" cy="28" r="2"/><circle cx="44" cy="40" r="2"/><circle cx="48" cy="56" r="2"/><circle cx="58" cy="34" r="2"/><circle cx="76" cy="26" r="2"/><circle cx="76" cy="42" r="2"/></g></svg>';
const V = [
  ['a', 'A · Midnight Pitch', 'Deep blue-black canvas with a faint floodlit pitch outline and soft red and gold light pools. Graphite glass cards with a bright top edge.', true],
  ['b', 'B · Carbon & Crimson', 'True near-black with a carbon-fibre weave and a red glow at the base. Smoked-glass cards with a crimson hairline.', false],
  ['c', 'C · Floodlight', 'Black stadium night with light beams falling from above and haze. Glossy black cards with a white rim light.', false],
  ['d', 'D · Velvet Red Night', 'Oxblood-black canvas with gold dust. Red lacquer cards with a gold hairline. Most dramatic, least neutral.', false],
];
const scene = (id) => `<div class="scene" data-cv="${id}"><div class="sbar"><img src="crest.png" alt=""><b>NOREX UNITED</b><span class="np">Squad</span><span class="np on">Stats</span><span class="np">Tactics</span><span class="key">🔑</span></div>
<div class="shero"><div><em>DIVISION ${C.div || 1} · SKILL RATING ${C.sr}</em><h4>Club stats</h4></div>${cup}</div>
<div class="sgrid"><div class="cd tile"><u>Played</u><b>${C.gp}</b></div><div class="cd tile"><u>Goals</u><b>${C.gf}</b></div><div class="cd tile gold"><u>Win streak</u><b>${C.streak}</b></div>
<div class="cd list">${rows.map((p, i) => `<div class="r"><i>${i + 1}</i><span>${esc(p.n)}</span><b>${p.goals}</b></div>`).join('')}</div>
<div class="cd pl">${card(star, { s: .62, link: false })}</div>
<div class="cd pt">${pitch}<u>League · 3-5-2</u></div></div></div>`;
export default function (P) {
  P('canvas.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Canvas and cards · NOREX UNITED</title><link rel="icon" href="crest.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="canvas.css"></head><body class="cvbody">
<main class="cwrap"><span class="eyebrow">Canvas and card backgrounds</span><h1>What I would choose</h1>
<p class="lead">Same real content on four darker canvases. Everything else (gloss, patterns, gold only for achievements) stays as you picked. <b>My pick is A.</b></p>
<div class="why"><div><b>Why A</b><span>Your hardest-working surfaces are tables, pitches and player cards. A cool blue-black canvas keeps the gold cards and green pitch clean and lets red and gold read as light, not paint.</span></div><div><b>The rules</b><span>Canvas stays dark and calm. Cards are glossy graphite with a bright top edge. Red lacquer is for the one hero card on a page. Gold is reserved for achievements and the Hub key.</span></div></div>
<div class="cmp">${V.map(([id, t, d, pick]) => `<section class="opt2${pick ? ' pick' : ''}"><header><h2>${t}</h2>${pick ? '<span class="rec">My pick</span>' : ''}</header><p>${d}</p>${scene(id)}</section>`).join('')}</div>
<div class="why" style="margin-top:34px"><div><b>Formations</b><span>All 29 FC27 shapes stay in the database. The club's main shapes are the quick picks; the full set lives in the Tactics table (formation wall), the Studio and the Dugout lineup builder.</span></div><div><b>Tell me</b><span>Reply with the letter you want (A, B, C or D), or "A but with …". I will lock it in and build the full site on it.</span></div></div></main></body></html>`);
}
