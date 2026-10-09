// Builder sandbox maths (roadmap PB.2). Pure functions, no DOM: used by builder.js in the browser and by
// tests/builder.test.mjs in Node. Everything reads the game-rules dataset (NXGame.load(), PB.1). Numbers EA has
// not published and managers have not entered yet fall back to PREVIEW values – the page says so clearly.
(() => {
  // Placeholder rules until the in-game values are entered (portal → Game rules → changed values).
  const PREVIEW = {
    apPerLevel: [20, 3], // index 0 = AP you start with at level 1, then AP gained per level (last value repeats)
    apCosts: [{ upTo: 70, cost: 1 }, { upTo: 80, cost: 2 }, { upTo: 90, cost: 3 }, { upTo: 99, cost: 4 }],
    slots: { playstyles: 3, plus: 1, facilities: 3 },
    body: { height: { min: 160, max: 200, def: 180 }, weight: { min: 55, max: 105, def: 75 } },
    positions: { GK: ['GK'], DEF: ['CB', 'LB', 'RB'], MID: ['CDM', 'CM', 'CAM'], FWD: ['ST', 'LW', 'RW'] },
    base: { GK: { goalkeeping: 62, other: 40 }, DEF: { defending: 58, physical: 58, other: 50 }, MID: { passing: 58, dribbling: 56, other: 50 }, FWD: { shooting: 58, pace: 58, other: 50 }, outfieldGk: 12 },
  };

  const attrsOf = (g) => (g.attributeGroups || []).flatMap((grp) => grp.attributes.map((name) => ({ name, group: grp.id })));
  const archOf = (g, id) => (g.archetypes || []).find((a) => a.id === id) || (g.archetypes || [])[0];

  // What's real and what's a placeholder, per dataset.
  function status(g, arch) {
    return {
      ap: !!g.apPerLevel?.length,
      costs: !!(g.apCosts?.length || (g.costTiers && Object.keys(g.costTiers).length)),
      base: !!(arch && Object.keys(arch.base || {}).length),
      get preview() { return !(this.ap && this.costs && this.base); },
    };
  }

  // arch.base[attr] is either a plain number (legacy/manual entry) or { base, max } (community/real data,
  // where the archetype's own ceiling for that attribute can sit below the global scale).
  function baseOf(g, arch) {
    const real = arch?.base || {};
    const grp = arch?.group || 'MID';
    const p = PREVIEW.base[grp] || PREVIEW.base.MID;
    const out = {};
    for (const a of attrsOf(g)) {
      const r = real[a.name];
      if (r != null) out[a.name] = +(typeof r === 'object' ? r.base : r);
      else if (a.group === 'goalkeeping' && grp !== 'GK') out[a.name] = PREVIEW.base.outfieldGk;
      else out[a.name] = p[a.group] ?? p.other;
    }
    return out;
  }

  const capOf = (g) => Math.max(1, +g.levelCap?.value || 1);
  const maxAttr = (g) => { const c = g.apCosts?.length ? g.apCosts : PREVIEW.apCosts; return c[c.length - 1].upTo; };
  // Per-archetype, per-attribute ceiling if the dataset has one (real data), else the global scale top.
  const attrTop = (g, arch, name) => { const r = arch?.base?.[name]; return r && typeof r === 'object' && r.max != null ? +r.max : maxAttr(g); };

  // Total AP available at a level: start value + one entry per level gained.
  function apAt(g, level) {
    const t = g.apPerLevel?.length ? g.apPerLevel : PREVIEW.apPerLevel;
    let sum = 0;
    for (let i = 0; i < level; i++) sum += +(t[Math.min(i, t.length - 1)] || 0);
    return sum;
  }

  // AP cost to raise an attribute from value v to v + 1, against the single global curve (tiers get dearer
  // near the top). Kept as the simple global-curve utility; evaluate()/canAdd()/fit() use stepCostFor below,
  // which picks the attribute's own tier when the dataset has per-attribute cost tiers (real data).
  function stepCost(g, v) {
    const tiers = g.apCosts?.length ? g.apCosts : PREVIEW.apCosts;
    const t = tiers.find((x) => v + 1 <= x.upTo);
    return t ? +t.cost : Infinity;
  }
  function costOf(g, from, added) {
    let c = 0;
    for (let i = 0; i < added; i++) c += stepCost(g, from + i);
    return c;
  }

  // Real data (costTiers + attributeCosts, roadmap PB.1 community import): each attribute is assigned a named
  // tier (range bands, e.g. { from, to, cost }) per archetype. Falls back to the global apCosts/PREVIEW curve
  // (stepCost) when the dataset has no per-attribute tier for this archetype/attribute.
  function stepCostFor(g, arch, name, v) {
    const tierKey = g.attributeCosts?.[arch?.id]?.[name];
    const bands = tierKey && g.costTiers?.[tierKey];
    if (!bands?.length) return stepCost(g, v);
    const b = bands.find((x) => v < x.to);
    return b ? +b.cost : Infinity;
  }
  function costOfFor(g, arch, name, from, added) {
    let c = 0;
    for (let i = 0; i < added; i++) c += stepCostFor(g, arch, name, from + i);
    return c;
  }

  // Free boosts from Masteries unlocked at this archetype level (EA notes, e.g. Finisher L10 +1 FIN/+1 COM).
  function masteryBonus(g, archId, level) {
    const out = {};
    for (const m of g.masteries || []) if (m.archetype === archId && level >= m.level) for (const [k, v] of Object.entries(m.bonus || {})) out[k] = (out[k] || 0) + v;
    return out;
  }

  // Dataset shapes (all optional, entered by managers in Game rules → changed values, or from a community
  // import per roadmap PB.1):
  //   playstyles      [{ id, name, icon?, desc?, plus?: true if it can be PlayStyle+ }]
  //   specializations manual shape: [{ id, name, desc?, archetypes?: [ids] (empty = all), bonus: { attr: n } }]
  //                   real-data shape: [{ id, name, archetype, thresholds: { attr: n }, grantsPlaystyle?, perk?, desc? }]
  //                   (both read by specsFor(); desc is shown as-is, so a real-data entry should pre-render its
  //                   own human-readable text - e.g. "Needs Jumping 90 … → grants X + perk: Y")
  //   facilities      [{ id, name, desc?, bonus: { attr: n } }]
  //   slots           { playstyles, plus, facilities }
  //   body            { height: {min,max,def}, weight: {min,max,def}, heightMods: [{ from, to, mods }], weightMods: [...] }
  //   archetypes[].positions ['ST', 'LW'] (else a default per group)
  //   archetypes[].base[attr] either a plain number, or { base, max } when the archetype has its own ceiling
  //   costTiers       { tierName: [{ from, to, cost }] } - per-attribute range-cost bands (real data)
  //   attributeCosts  { archetypeId: { attr: tierName } } - which tier each attribute uses, per archetype
  const slotsOf = (g) => ({ ...PREVIEW.slots, ...(g.slots || {}) });
  const rangeOf = (g, k) => ({ ...PREVIEW.body[k], ...(g.body?.[k] || {}) });
  // Real data (roadmap PB.1 community import) ties a spec to one archetype via s.archetype; older/manual
  // entries may still use the s.archetypes list shape (empty = all archetypes) - both are supported.
  const specsFor = (g, archId) => (g.specializations || []).filter((s) => (s.archetype ? s.archetype === archId : (!s.archetypes?.length || s.archetypes.includes(archId))));
  const bandMods = (list, v) => (list || []).find((r) => v >= r.from && v <= r.to)?.mods || {};

  // Clean a build's choices against the data (unknown ids dropped, slot limits kept, body clamped).
  function choices(g, b) {
    const sl = slotsOf(g);
    const ids = new Set((g.playstyles || []).map((p) => p.id));
    const canPlus = new Set((g.playstyles || []).filter((p) => p.plus !== false).map((p) => p.id));
    const plus = [...new Set((b.plus || []).filter((id) => canPlus.has(id)))].slice(0, sl.plus);
    const ps = [...new Set((b.ps || []).filter((id) => ids.has(id) && !plus.includes(id)))].slice(0, sl.playstyles);
    const sp = specsFor(g, b.arch).some((s) => s.id === b.sp) ? b.sp : null;
    const fids = new Set((g.facilities || []).map((f) => f.id));
    const fa = [...new Set((b.fa || []).filter((id) => fids.has(id)))].slice(0, sl.facilities);
    const H = rangeOf(g, 'height'), Wt = rangeOf(g, 'weight');
    const clamp = (v, r) => Math.min(r.max, Math.max(r.min, Math.round(+v || r.def)));
    return { ps, plus, sp, fa, h: clamp(b.h, H), w: clamp(b.w, Wt) };
  }

  // Attribute changes from specialization, facilities, height and weight – each listed by source for badges.
  function modsOf(g, b) {
    const c = choices(g, b);
    const out = {};
    const add = (src, mods) => { for (const [k, v] of Object.entries(mods || {})) if (+v) (out[k] ||= []).push([src, +v]); };
    const sp = (g.specializations || []).find((s) => s.id === c.sp);
    if (sp) add(sp.name, sp.bonus);
    for (const id of c.fa) { const f = (g.facilities || []).find((x) => x.id === id); if (f) add(f.name, f.bonus); }
    add('Height', bandMods(g.body?.heightMods, c.h));
    add('Weight', bandMods(g.body?.weightMods, c.w));
    return out;
  }

  // Full evaluation of a build: { arch, level, spent: {attr: points} } → values, AP used/left, face stats, OVR.
  function evaluate(g, b) {
    const arch = archOf(g, b.arch);
    const level = Math.min(capOf(g), Math.max(1, b.level | 0));
    const base = baseOf(g, arch);
    const bonus = masteryBonus(g, arch?.id, level);
    const mods = modsOf(g, { ...b, arch: arch?.id });
    const top = maxAttr(g); // global scale (bar width etc.) - per-attribute ceiling is row.top below
    const rows = attrsOf(g).map((a) => {
      const add = Math.max(0, b.spent?.[a.name] | 0);
      const bon = bonus[a.name] || 0;
      const mod = (mods[a.name] || []).reduce((s, [, v]) => s + v, 0);
      const rowTop = attrTop(g, arch, a.name);
      return { ...a, base: base[a.name], add, bonus: bon, mod, modFrom: mods[a.name] || [], top: rowTop, value: Math.max(1, Math.min(rowTop, base[a.name] + add + bon + mod)), cost: costOfFor(g, arch, a.name, base[a.name], add), sig: (arch?.signature || []).includes(a.name) };
    });
    const total = apAt(g, level);
    const used = rows.reduce((s, r) => s + r.cost, 0);
    const byGroup = {};
    for (const r of rows) (byGroup[r.group] ||= []).push(r.value);
    const avg = (k) => (byGroup[k]?.length ? Math.round(byGroup[k].reduce((s, v) => s + v, 0) / byGroup[k].length) : 0);
    const val = (n) => rows.find((r) => r.name === n)?.value ?? 0;
    const face = arch?.group === 'GK'
      ? [['DIV', val('GK Diving')], ['HAN', val('GK Handling')], ['KIC', val('GK Kicking')], ['REF', val('GK Reflexes')], ['SPD', avg('pace')], ['POS', val('GK Positioning')]]
      : [['PAC', avg('pace')], ['SHO', avg('shooting')], ['PAS', avg('passing')], ['DRI', avg('dribbling')], ['DEF', avg('defending')], ['PHY', avg('physical')]];
    const W = { GK: { goalkeeping: 0.9, physical: 0.1 }, DEF: { defending: 0.45, physical: 0.2, pace: 0.15, passing: 0.2 }, MID: { passing: 0.35, dribbling: 0.3, shooting: 0.15, defending: 0.1, physical: 0.1 }, FWD: { shooting: 0.45, dribbling: 0.25, pace: 0.2, physical: 0.1 } }[arch?.group || 'MID'];
    const ovr = Math.round(Object.entries(W).reduce((s, [k, w]) => s + avg(k) * w, 0));
    // Position fit: how well the attribute mix suits each position the archetype plays (estimate, 0–99).
    const PW = { GK: { goalkeeping: 1 }, CB: { defending: 0.5, physical: 0.3, pace: 0.2 }, LB: { pace: 0.35, defending: 0.35, passing: 0.3 }, RB: { pace: 0.35, defending: 0.35, passing: 0.3 },
      CDM: { defending: 0.45, passing: 0.35, physical: 0.2 }, CM: { passing: 0.45, dribbling: 0.3, defending: 0.25 }, CAM: { passing: 0.4, dribbling: 0.35, shooting: 0.25 },
      LM: { pace: 0.35, dribbling: 0.35, passing: 0.3 }, RM: { pace: 0.35, dribbling: 0.35, passing: 0.3 },
      ST: { shooting: 0.5, pace: 0.25, physical: 0.25 }, CF: { shooting: 0.4, dribbling: 0.35, passing: 0.25 }, LW: { pace: 0.35, dribbling: 0.4, shooting: 0.25 }, RW: { pace: 0.35, dribbling: 0.4, shooting: 0.25 } };
    const posFit = (arch?.positions?.length ? arch.positions : PREVIEW.positions[arch?.group || 'MID'])
      .map((pos) => [pos, Math.round(Object.entries(PW[pos] || W).reduce((s, [k, w]) => s + avg(k) * w, 0))])
      .sort((x, y) => y[1] - x[1]);
    return { arch, level, cap: capOf(g), rows, total, used, left: total - used, face, ovr, fit: posFit, top, choices: choices(g, { ...b, arch: arch?.id }), slots: slotsOf(g), status: status(g, arch) };
  }

  // Can one more point go into this attribute? Returns the AP cost or null (at max / not enough AP).
  function canAdd(g, ev, name) {
    const r = ev.rows.find((x) => x.name === name);
    if (!r || r.value >= r.top) return null;
    const c = stepCostFor(g, ev.arch, name, r.base + r.add);
    return c <= ev.left ? c : null;
  }

  // Lowering the level can leave the build over budget: take points back from the dearest end until it fits.
  function fit(g, b) {
    const spent = { ...b.spent };
    let ev = evaluate(g, { ...b, spent });
    while (ev.left < 0) {
      const r = ev.rows.filter((x) => x.add > 0).sort((x, y) => stepCostFor(g, ev.arch, y.name, y.base + y.add - 1) - stepCostFor(g, ev.arch, x.name, x.base + x.add - 1))[0];
      if (!r) break;
      spent[r.name] = r.add - 1;
      if (!spent[r.name]) delete spent[r.name];
      ev = evaluate(g, { ...b, spent });
    }
    return { ...b, spent };
  }

  // Share links: #a=<archetype>&l=<level>&p=<attrIndex>x<points>.…&v=<dataset version>
  function encode(g, b) {
    const list = attrsOf(g);
    const p = list.map((a, i) => (b.spent?.[a.name] ? `${i.toString(36)}x${b.spent[a.name]}` : '')).filter(Boolean).join('.');
    const q = new URLSearchParams({ a: b.arch, l: String(b.level) });
    if (p) q.set('p', p);
    const c = choices(g, b);
    const idx = (list, ids) => ids.map((id) => list.findIndex((x) => x.id === id)).filter((i) => i >= 0).map((i) => i.toString(36)).join('.');
    if (c.ps.length) q.set('ps', idx(g.playstyles, c.ps));
    if (c.plus.length) q.set('pp', idx(g.playstyles, c.plus));
    if (c.sp) q.set('sp', c.sp);
    if (c.fa.length) q.set('fa', idx(g.facilities, c.fa));
    if (b.h) q.set('h', String(c.h));
    if (b.w) q.set('w', String(c.w));
    q.set('v', g.version || '');
    return q.toString();
  }
  function decode(g, str) {
    const q = new URLSearchParams(String(str || '').replace(/^#/, ''));
    const arch = archOf(g, q.get('a'));
    if (!arch || !q.get('a')) return null;
    const list = attrsOf(g);
    const spent = {};
    for (const part of (q.get('p') || '').split('.')) {
      const m = part.match(/^([0-9a-z]+)x(\d{1,3})$/);
      const a = m && list[parseInt(m[1], 36)];
      if (a) spent[a.name] = +m[2];
    }
    const level = Math.min(capOf(g), Math.max(1, parseInt(q.get('l'), 10) || capOf(g)));
    const ids = (list, str) => (str || '').split('.').map((x) => (list || [])[parseInt(x, 36)]?.id).filter(Boolean);
    const extra = { ps: ids(g.playstyles, q.get('ps')), plus: ids(g.playstyles, q.get('pp')), sp: q.get('sp') || null, fa: ids(g.facilities, q.get('fa')), h: +q.get('h') || null, w: +q.get('w') || null };
    const c = choices(g, { arch: arch.id, ...extra });
    return { ...fit(g, { arch: arch.id, level, spent, ...c, h: extra.h && c.h, w: extra.w && c.w }), version: q.get('v') || null };
  }

  const api = { PREVIEW, slotsOf, rangeOf, specsFor, choices, modsOf, attrsOf, archOf, status, baseOf, capOf, attrTop, apAt, stepCost, costOf, stepCostFor, costOfFor, masteryBonus, evaluate, canAdd, fit, encode, decode };
  globalThis.NXBuildMath = api;
})();
